import type { MaybePromise } from '../../core/maybePromise.ts';
import type { NodeName } from './node-name.ts';
import type { RunContext } from './run-context.ts';

export interface PipelineHooks<S extends object> {
  onNodeStart?: (name: NodeName, state: Readonly<S>, ctx: RunContext) => MaybePromise<void>;
  onNodeEnd?: (name: NodeName, state: Readonly<S>, ctx: RunContext) => MaybePromise<void>;
  onNodeError?: (name: NodeName, err: unknown, ctx: RunContext) => MaybePromise<void>;
  onComplete?: (state: Readonly<S>, ctx: RunContext) => MaybePromise<void>;
}
