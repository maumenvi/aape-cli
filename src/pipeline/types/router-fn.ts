import type { MaybePromise } from '../../core/maybePromise.ts';
import type { NodeName } from './node-name.ts';
import type { RunContext } from './run-context.ts';

export type RouterFn<S extends object> = (
  state: Readonly<S>,
  ctx: RunContext,
) => MaybePromise<NodeName>;
