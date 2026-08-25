import type { CircuitState, McpReliabilityConfig } from './types.ts';

export function createClosedCircuit(): CircuitState {
  return {
    state: 'closed',
    consecutiveFailures: 0,
  };
}

export function canAttemptCircuit(state: CircuitState, now: number): { allowed: boolean; reason?: string } {
  if (state.state !== 'open') {
    return { allowed: true };
  }
  if (typeof state.nextAttemptAt !== 'number') {
    return { allowed: false, reason: 'circuit is open' };
  }
  if (now >= state.nextAttemptAt) {
    return { allowed: true };
  }
  return { allowed: false, reason: `circuit is open until ${new Date(state.nextAttemptAt).toISOString()}` };
}

export function markCircuitSuccess(state: CircuitState): CircuitState {
  return {
    state: 'closed',
    consecutiveFailures: 0,
  };
}

export function markCircuitFailure(
  state: CircuitState,
  errorMessage: string,
  now: number,
  config: McpReliabilityConfig,
): CircuitState {
  const nextFailures = state.consecutiveFailures + 1;
  if (nextFailures >= config.circuitFailureThreshold) {
    return {
      state: 'open',
      consecutiveFailures: nextFailures,
      openedAt: now,
      nextAttemptAt: now + config.circuitOpenMs,
      lastError: errorMessage,
    };
  }
  return {
    state: 'closed',
    consecutiveFailures: nextFailures,
    lastError: errorMessage,
  };
}

export function markCircuitHalfOpen(state: CircuitState): CircuitState {
  if (state.state !== 'open') return state;
  return {
    ...state,
    state: 'half-open',
  };
}
