import type { BudgetLimits } from './budget-limits.ts';
import type { BudgetThresholdHook } from './budget-threshold-hook.ts';

export interface BudgetOptions {
  limits: BudgetLimits;
  onExceeded?: 'abort' | 'continue';
  logSummary?: boolean;
  hooks?: BudgetThresholdHook[];
}
