import type { MaybePromise } from '../../core/maybePromise.ts';
import type { BudgetLimits } from './budget-limits.ts';
import type { BudgetThresholdEvent } from './budget-threshold-event.ts';
import type { RunContext } from './run-context.ts';

export interface BudgetThresholdHook {
  metric: keyof BudgetLimits;
  percent: number;
  action?: 'continue' | 'abort';
  once?: boolean;
  onTrigger?: (event: BudgetThresholdEvent, ctx: RunContext) => MaybePromise<'continue' | 'abort' | void>;
}
