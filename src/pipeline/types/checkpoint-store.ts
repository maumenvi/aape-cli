import type { MaybePromise } from '../../core/maybePromise.ts';
import type { CheckpointSnapshot } from './checkpoint-snapshot.ts';

export interface CheckpointStore<S extends object = Record<string, unknown>> {
  load(checkpointId: string): MaybePromise<CheckpointSnapshot<S> | null>;
  save(snapshot: CheckpointSnapshot<S>): MaybePromise<void>;
  clear?(checkpointId: string): MaybePromise<void>;
}
