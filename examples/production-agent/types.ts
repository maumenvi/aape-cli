import type { HttpState, PipelineEvent } from '../../src/index.ts';

export type AgentRouteKind = 'task' | 'search';

export interface AgentRequestBody {
  userPrompt: string;
  systemPrompt?: string;
}

export interface GuardResult {
  blocked: boolean;
  reason: string;
  confidence?: number;
}

export interface IntentResult {
  intent: string;
  confidence?: number;
  rationale?: string;
}

export interface AgentResponsePayload {
  requestId: string;
  route: AgentRouteKind;
  intent: IntentResult;
  output: string;
  blocked: boolean;
  blockReason?: string;
}

export interface AgentGraphState extends HttpState {
  requestId: string;
  route: AgentRouteKind;
  systemPrompt: string;
  userPrompt: string;
  intent?: IntentResult;
  inputGuard?: GuardResult;
  outputGuard?: GuardResult;
  llmResponse?: string;
  sanitizedOutput?: string;
  response?: AgentResponsePayload;
}

export interface DebugTrace {
  requestId: string;
  route: AgentRouteKind;
  startedAt: number;
  finishedAt?: number;
  events: PipelineEvent<AgentGraphState>[];
  summary?: AgentResponsePayload;
}
