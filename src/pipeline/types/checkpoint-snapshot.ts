import type { BudgetSnapshot } from './budget-snapshot.ts';
import type { CheckpointStatus } from './checkpoint-status.ts';
import type { NodeName } from './node-name.ts';

export interface CheckpointSnapshot<S extends object = Record<string, unknown>> {
  checkpointId: string;
  runId: string;
  step: number;
  nextNode: NodeName;
  status: CheckpointStatus;
  stateSnapshot: Readonly<S>;
  metadata: Record<string, unknown>;
  budgetSnapshot?: BudgetSnapshot;
  updatedAt: number;
}
