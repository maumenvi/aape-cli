import type { PipelineHooks, NodeName, NodeFn, RouterFn } from '../types.ts';

export type Edge<S extends object> =
  | { kind: 'fixed'; to: NodeName }
  | { kind: 'conditional'; router: RouterFn<S> };

export interface PipelineDefinition<S extends object> {
  nodes: Map<NodeName, NodeFn<S>>;
  edges: Map<NodeName, Edge<S>>;
  entryPoint: NodeName;
  hooks: PipelineHooks<S>;
}
