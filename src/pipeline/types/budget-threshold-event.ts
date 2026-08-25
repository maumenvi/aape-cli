import type { BudgetLimits } from './budget-limits.ts';
import type { BudgetSnapshot } from './budget-snapshot.ts';

export interface BudgetThresholdEvent {
  metric: keyof BudgetLimits;
  percent: number;
  used: number;
  limit: number;
  ratio: number;
  snapshot: BudgetSnapshot;
}
