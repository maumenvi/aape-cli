import {
  END,
  START,
  createPipeline,
  type LlmManager,
  type Pipeline,
  type PipelineEvent,
  type RunOptions,
} from '../../src/index.ts';
import { callLlmAsJson } from './llm-json.ts';
import {
  buildExecutionPrompt,
  buildInputGuardPrompt,
  buildIntentPrompt,
  buildOutputGuardPrompt,
} from './prompts.ts';
import type { AgentGraphState, AgentRouteKind, DebugTrace, GuardResult, IntentResult } from './types.ts';

const MAIN_LLM_ID = process.env.AAPE_OPENROUTER_MAIN_ID ?? 'openrouter-main';
const GUARD_LLM_ID = process.env.AAPE_OPENROUTER_GUARD_ID ?? 'openrouter-guard';
const MAX_OUTPUT_LENGTH = 3000;

function normalizeConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeIntent(value: unknown): IntentResult {
  const source = value as Partial<IntentResult>;
  return {
    intent: typeof source.intent === 'string' && source.intent.trim().length > 0 ? source.intent : 'unknown',
    confidence: normalizeConfidence(source.confidence),
    rationale: typeof source.rationale === 'string' ? source.rationale : undefined,
  };
}

function normalizeGuardResult(value: unknown): GuardResult {
  const source = value as Partial<GuardResult>;
  return {
    blocked: source.blocked === true,
    reason: typeof source.reason === 'string' ? source.reason : 'guard-undetermined',
    confidence: normalizeConfidence(source.confidence),
  };
}

function sanitizeOutput(output: string): string {
  const noControlChars = output.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
  const redacted = noControlChars
    .replace(/sk-[a-zA-Z0-9_-]{16,}/g, '[REDACTED_API_KEY]')
    .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/gi, '$1[REDACTED_TOKEN]');
  return redacted.trim().slice(0, MAX_OUTPUT_LENGTH);
}

export function createAgentRoutePipeline(): Pipeline<AgentGraphState> {
  return createPipeline<AgentGraphState>()
    .addNode('identify_intent', async (state, ctx) => {
      if (!ctx.llm) throw new Error('LLM manager is required');
      const payload = await callLlmAsJson<IntentResult>(ctx.llm, MAIN_LLM_ID, [
        { role: 'system', content: 'Return JSON only. Do not add markdown.' },
        { role: 'user', content: buildIntentPrompt(state.route, state.userPrompt) },
      ]);
      return { intent: normalizeIntent(payload) };
    })
    .addNode('guard_input', async (state, ctx) => {
      if (!ctx.llm) throw new Error('LLM manager is required');
      const payload = await callLlmAsJson<GuardResult>(ctx.llm, GUARD_LLM_ID, [
        { role: 'system', content: 'You are a strict security classifier. Return JSON only.' },
        { role: 'user', content: buildInputGuardPrompt(state.route, state.systemPrompt, state.userPrompt) },
      ]);
      return { inputGuard: normalizeGuardResult(payload) };
    })
    .addNode('reject_input', (state) => ({
      response: {
        requestId: state.requestId,
        route: state.route,
        intent: state.intent ?? { intent: 'unknown' },
        output: '',
        blocked: true,
        blockReason: state.inputGuard?.reason ?? 'prompt-injection-detected',
      },
    }))
    .addNode('execute_route_task', async (state, ctx) => {
      if (!ctx.llm) throw new Error('LLM manager is required');
      const response = await ctx.llm.call(MAIN_LLM_ID, {
        messages: [
          { role: 'system', content: state.systemPrompt },
          { role: 'user', content: buildExecutionPrompt(state.route, state.intent?.intent ?? 'unknown', state.userPrompt) },
        ],
      });
      return { llmResponse: response.content };
    })
    .addNode('guard_output', async (state, ctx) => {
      if (!ctx.llm) throw new Error('LLM manager is required');
      const payload = await callLlmAsJson<GuardResult>(ctx.llm, GUARD_LLM_ID, [
        { role: 'system', content: 'You are a strict data-loss prevention classifier. Return JSON only.' },
        { role: 'user', content: buildOutputGuardPrompt(state.route, state.llmResponse ?? '') },
      ]);
      return { outputGuard: normalizeGuardResult(payload) };
    })
    .addNode('reject_output', (state) => ({
      response: {
        requestId: state.requestId,
        route: state.route,
        intent: state.intent ?? { intent: 'unknown' },
        output: '',
        blocked: true,
        blockReason: state.outputGuard?.reason ?? 'sensitive-data-detected',
      },
    }))
    .addNode('sanitize_output', (state) => ({
      sanitizedOutput: sanitizeOutput(state.llmResponse ?? ''),
    }))
    .addNode('build_response', (state) => ({
      response: {
        requestId: state.requestId,
        route: state.route,
        intent: state.intent ?? { intent: 'unknown' },
        output: state.sanitizedOutput ?? '',
        blocked: false,
      },
    }))
    .addEdge(START, 'identify_intent')
    .addEdge('identify_intent', 'guard_input')
    .addConditionalEdge('guard_input', (state) => (state.inputGuard?.blocked ? 'reject_input' : 'execute_route_task'))
    .addEdge('reject_input', END)
    .addEdge('execute_route_task', 'guard_output')
    .addConditionalEdge('guard_output', (state) => (state.outputGuard?.blocked ? 'reject_output' : 'sanitize_output'))
    .addEdge('reject_output', END)
    .addEdge('sanitize_output', 'build_response')
    .addEdge('build_response', END);
}

export async function runAgentRoutePipeline(
  pipeline: Pipeline<AgentGraphState>,
  state: AgentGraphState,
  llm: LlmManager,
  trace: DebugTrace,
): Promise<AgentGraphState> {
  const runOptions: RunOptions<AgentGraphState> = {
    llm,
    metadata: {
      requestId: state.requestId,
      route: state.route as AgentRouteKind,
      llmId: MAIN_LLM_ID,
    },
    devtools: {
      enabled: true,
      onEvent: async (event: PipelineEvent<AgentGraphState>) => {
        trace.events.push(event);
      },
    },
    budget: {
      limits: {
        timeMs: 45_000,
        tools: 25,
      },
      hooks: [
        {
          metric: 'timeMs',
          percent: 90,
          action: 'abort',
          onTrigger: () => {
            console.warn(`[agent:${state.requestId}] budget threshold reached`);
          },
        },
      ],
      logSummary: true,
    },
  };

  return pipeline.run(state, runOptions);
}
