import { END, START } from '../constants.ts';
import type { NodeFn, NodeName, PipelineHooks, RouterFn, RunOptions } from '../types.ts';
import { executePipeline } from './execute.ts';
import { normalizeNodeName } from './graph.ts';
import type { Edge } from './types.ts';

export class Pipeline<S extends object> {
  private nodes = new Map<NodeName, NodeFn<S>>();
  private edges = new Map<NodeName, Edge<S>>();
  private entryPoint: NodeName = START;
  private hooks: PipelineHooks<S> = {};

  addNode(name: NodeName, fn: NodeFn<S>): this {
    const normalized = normalizeNodeName(name);
    if (normalized === START || normalized === END) {
      throw new Error(`Node name "${name}" is reserved.`);
    }
    this.nodes.set(normalized, fn);
    return this;
  }

  addEdge(from: NodeName, to: NodeName): this {
    const normalizedFrom = normalizeNodeName(from);
    const normalizedTo = normalizeNodeName(to);
    this.edges.set(normalizedFrom, { kind: 'fixed', to: normalizedTo });
    return this;
  }

  addConditionalEdge(from: NodeName, router: RouterFn<S>): this {
    const normalizedFrom = normalizeNodeName(from);
    this.edges.set(normalizedFrom, { kind: 'conditional', router });
    return this;
  }

  setEntryPoint(name: NodeName): this {
    this.entryPoint = normalizeNodeName(name);
    return this;
  }

  withHooks(hooks: PipelineHooks<S>): this {
    this.hooks = { ...this.hooks, ...hooks };
    return this;
  }

  async run(initial: S, optionsOrMetadata: RunOptions<S> | Record<string, unknown> = {}): Promise<S> {
    return executePipeline<S>(
      {
        nodes: this.nodes,
        edges: this.edges,
        entryPoint: this.entryPoint,
        hooks: this.hooks,
      },
      initial,
      optionsOrMetadata,
    );
  }
}

export function createPipeline<S extends object>(): Pipeline<S> {
  return new Pipeline<S>();
}
