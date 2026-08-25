import {
  canAttemptCircuit,
  computeBackoffMs,
  createClosedCircuit,
  delay,
  markCircuitFailure,
  markCircuitHalfOpen,
  markCircuitSuccess,
  type CircuitState,
  type McpOperationOptions,
  type McpReliabilityConfig,
} from '../reliability/index.ts';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class McpResilienceController {
  private readonly circuits = new Map<string, CircuitState>();
  private readonly reliability: McpReliabilityConfig;

  constructor(reliability: McpReliabilityConfig) {
    this.reliability = reliability;
  }

  describeCircuits(): Array<{ serverName: string } & CircuitState> {
    return [...this.circuits.entries()].map(([serverName, circuit]) => ({ serverName, ...circuit }));
  }

  recordSuccess(serverName: string): void {
    const state = this.getCircuitState(serverName);
    this.circuits.set(serverName, markCircuitSuccess(state));
  }

  recordFailure(serverName: string, errorMessage: string): void {
    const state = this.getCircuitState(serverName);
    const nextState = markCircuitFailure(state, errorMessage, Date.now(), this.reliability);
    this.circuits.set(serverName, nextState);
  }

  async executeWithResilience<T>(
    serverName: string,
    options: McpOperationOptions,
    operation: () => Promise<T>,
    onFailure: (error: unknown) => Promise<void>,
  ): Promise<T> {
    const retries = Math.max(0, options.retries ?? this.reliability.maxRetries);
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= retries) {
      this.assertCircuitAllowsAttempt(serverName);
      try {
        const result = await operation();
        this.recordSuccess(serverName);
        return result;
      } catch (error) {
        lastError = error;
        const message = getErrorMessage(error);
        this.recordFailure(serverName, message);
        await onFailure(error);

        if (!this.shouldRetry(error, attempt, retries)) {
          throw error;
        }

        const backoffMs = computeBackoffMs(attempt, this.reliability);
        attempt += 1;
        await delay(backoffMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private shouldRetry(error: unknown, attempt: number, retries: number): boolean {
    if (attempt >= retries) return false;
    const message = getErrorMessage(error).toLowerCase();
    if (message.includes('circuit is open')) return false;
    if (message.includes('not installed') || message.includes('has no vs code command')) return false;
    if (message.includes('has no mcp config')) return false;
    if (message.includes('requires a "vscode.')) return false;
    if (message.includes('requires "vscode.')) return false;
    if (message.includes('requires "package"')) return false;
    return true;
  }

  private assertCircuitAllowsAttempt(serverName: string): void {
    const state = this.getCircuitState(serverName);
    const now = Date.now();
    const check = canAttemptCircuit(state, now);
    if (!check.allowed) {
      throw new Error(`MCP circuit is open for "${serverName}": ${check.reason ?? 'retry later'}`);
    }
    if (state.state === 'open') {
      this.circuits.set(serverName, markCircuitHalfOpen(state));
    }
  }

  private getCircuitState(serverName: string): CircuitState {
    const state = this.circuits.get(serverName);
    if (state) return state;
    const created = createClosedCircuit();
    this.circuits.set(serverName, created);
    return created;
  }
}

export function toErrorMessage(error: unknown): string {
  return getErrorMessage(error);
}
