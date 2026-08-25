import type { BudgetDelta } from './budget-delta.ts';
import type { BudgetSnapshot } from './budget-snapshot.ts';

export interface BudgetController {
  consume(delta: BudgetDelta): BudgetSnapshot;
  snapshot(): BudgetSnapshot;
  restore(previous: BudgetSnapshot): BudgetSnapshot;
}
