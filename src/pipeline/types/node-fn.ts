import type { MaybePromise } from '../../core/maybePromise.ts';
import type { RunContext } from './run-context.ts';

export type NodeFn<S extends object> = (
  state: Readonly<S>,
  ctx: RunContext,
) => MaybePromise<Partial<S> | void>;
