export interface McpReliabilityConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  circuitFailureThreshold: number;
  circuitOpenMs: number;
  healthcheckIntervalMs: number;
}

export interface McpOperationOptions {
  timeoutMs?: number;
  retries?: number;
  llmId?: string;
}

export type CircuitStateKind = 'closed' | 'open' | 'half-open';

export interface CircuitState {
  state: CircuitStateKind;
  consecutiveFailures: number;
  openedAt?: number;
  nextAttemptAt?: number;
  lastError?: string;
}

export interface McpHealthcheckResult {
  serverName: string;
  ok: boolean;
  checkedAt: number;
  status: 'running' | 'failed';
  error?: string;
}
