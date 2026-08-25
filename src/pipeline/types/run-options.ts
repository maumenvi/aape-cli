import type { LlmManager } from '../../agent/llm/manager.ts';
import type { ToolContext } from '../../agent/tools/context.ts';
import type { PipelineEventHandler } from '../events.ts';
import type { BudgetOptions } from './budget-options.ts';
import type { CheckpointOptions } from './checkpoint-options.ts';
import type { EventErrorPolicy } from './event-error-policy.ts';
import type { RunContext } from './run-context.ts';

export interface RunOptions<S extends object = Record<string, unknown>> {
  maxSteps?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
  llm?: LlmManager;
  tools?: ToolContext;
  stopWhen?: (state: Readonly<S>, ctx: RunContext) => boolean;
  devtools?: {
    enabled?: boolean;
    onEvent: PipelineEventHandler<S>;
    eventErrorPolicy?: EventErrorPolicy;
  };
  budget?: BudgetOptions;
  checkpoint?: CheckpointOptions<S>;
}
