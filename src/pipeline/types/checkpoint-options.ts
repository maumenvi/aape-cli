import type { CheckpointStore } from './checkpoint-store.ts';

export interface CheckpointOptions<S extends object = Record<string, unknown>> {
  id: string;
  store: CheckpointStore<S>;
  resume?: boolean | 'required';
  clearOnComplete?: boolean;
}
