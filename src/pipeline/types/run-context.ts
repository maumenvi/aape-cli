import type { LlmManager } from '../../agent/llm/manager.ts';
import type { ToolContext } from '../../agent/tools/context.ts';
import type { BudgetController } from './budget-controller.ts';

export interface RunContext {
  runId: string;
  step: number;
  state?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  signal: AbortSignal;
  llm?: LlmManager;
  tools?: ToolContext;
  budget?: BudgetController;
}
