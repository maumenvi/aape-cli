import type { McpReliabilityConfig } from './types.ts';

export function computeBackoffMs(attempt: number, config: McpReliabilityConfig): number {
  const raw = config.initialBackoffMs * Math.pow(config.backoffMultiplier, Math.max(0, attempt));
  return Math.min(config.maxBackoffMs, Math.floor(raw));
}

export function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
