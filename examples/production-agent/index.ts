import { randomUUID } from 'node:crypto';
import { App, createLlmManager, type HttpState } from '../../src/index.ts';
import { createAgentRoutePipeline, runAgentRoutePipeline } from './pipeline.ts';
import { resolveSystemPrompt } from './prompts.ts';
import type { AgentGraphState, AgentRequestBody, AgentRouteKind, DebugTrace } from './types.ts';

const PORT = Number(process.env.PORT ?? 3100);
const HOST = process.env.HOST ?? '0.0.0.0';
const MAIN_MODEL = process.env.OPENROUTER_MAIN_MODEL ?? 'openai/gpt-4o-mini';
const GUARD_MODEL = process.env.OPENROUTER_GUARD_MODEL ?? 'openai/gpt-4o-mini';

const llm = createLlmManager()
  .add({
    id: 'openrouter-main',
    provider: 'openrouter',
    model: MAIN_MODEL,
    apiKey: process.env.OPENROUTER_API_KEY,
  })
  .add({
    id: 'openrouter-guard',
    provider: 'openrouter',
    model: GUARD_MODEL,
    apiKey: process.env.OPENROUTER_API_KEY,
  });

const taskPipeline = createAgentRoutePipeline();
const searchPipeline = createAgentRoutePipeline();
const debugTraces = new Map<string, DebugTrace>();
const MAX_DEBUG_TRACES = 100;

function trimDebugStore(): void {
  if (debugTraces.size <= MAX_DEBUG_TRACES) return;
  const keys = [...debugTraces.keys()];
  const overflow = debugTraces.size - MAX_DEBUG_TRACES;
  for (let index = 0; index < overflow; index += 1) {
    debugTraces.delete(keys[index]);
  }
}

function parseBodyOrThrow(raw: unknown): AgentRequestBody {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }
  const candidate = raw as Partial<AgentRequestBody>;
  if (typeof candidate.userPrompt !== 'string' || candidate.userPrompt.trim().length === 0) {
    throw new Error('"userPrompt" is required and must be a non-empty string.');
  }
  if (typeof candidate.systemPrompt !== 'undefined' && typeof candidate.systemPrompt !== 'string') {
    throw new Error('"systemPrompt" must be a string when provided.');
  }
  return {
    userPrompt: candidate.userPrompt.trim(),
    systemPrompt: candidate.systemPrompt?.trim(),
  };
}

async function runRoute(route: AgentRouteKind, state: HttpState): Promise<void> {
  const body = parseBodyOrThrow(state.req.body);
  const requestId = randomUUID();
  const trace: DebugTrace = {
    requestId,
    route,
    startedAt: Date.now(),
    events: [],
  };
  debugTraces.set(requestId, trace);
  trimDebugStore();

  const graphState: AgentGraphState = {
    ...state,
    requestId,
    route,
    systemPrompt: resolveSystemPrompt(route, body.systemPrompt),
    userPrompt: body.userPrompt,
  };

  const pipeline = route === 'task' ? taskPipeline : searchPipeline;
  const result = await runAgentRoutePipeline(pipeline, graphState, llm, trace);
  trace.finishedAt = Date.now();
  trace.summary = result.response;

  const response = result.response;
  if (!response) {
    throw new Error('Pipeline did not produce a response payload.');
  }

  if (response.blocked) {
    state.res.status(422).json({
      ok: false,
      requestId,
      route,
      error: response.blockReason ?? 'security-blocked',
    });
    return;
  }

  state.res.json({
    ok: true,
    ...response,
  });
}

const app = new App();

app.get('/', ({ res }: HttpState) => {
  res.json({
    name: 'aape-production-agent-example',
    routes: [
      'POST /agent/task',
      'POST /agent/search',
      'GET /agent/debug',
      'GET /agent/debug/:requestId',
    ],
  });
});

app.post('/agent/task', async (state: HttpState) => {
  await runRoute('task', state);
});

app.post('/agent/search', async (state: HttpState) => {
  await runRoute('search', state);
});

app.get('/agent/debug', ({ res }: HttpState) => {
  const traces = [...debugTraces.values()].map((trace) => ({
    requestId: trace.requestId,
    route: trace.route,
    startedAt: trace.startedAt,
    finishedAt: trace.finishedAt,
    eventCount: trace.events.length,
    summary: trace.summary,
  }));
  res.json({ ok: true, traces });
});

app.get('/agent/debug/:requestId', ({ req, res }: HttpState) => {
  const trace = debugTraces.get(req.params.requestId);
  if (!trace) {
    res.status(404).json({ ok: false, error: 'Trace not found' });
    return;
  }
  res.json({ ok: true, trace });
});

app.onError((err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error('[production-agent-example:error]', message);
  if (!res.headersSent) {
    res.status(500).json({ ok: false, error: message });
  }
});

await app.listen(PORT, HOST);
console.log(`[production-agent-example] listening at http://${HOST}:${PORT}`);
