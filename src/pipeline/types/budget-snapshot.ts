import type { BudgetLimits } from './budget-limits.ts';
import type { BudgetValues } from './budget-values.ts';

export interface BudgetSnapshot {
  used: BudgetValues;
  limits: BudgetLimits;
  remaining: BudgetLimits;
  exceeded: Array<keyof BudgetLimits>;
  updatedAt: number;
}
