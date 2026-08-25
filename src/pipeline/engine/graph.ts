import { END, END_ALIASES, START, START_ALIASES } from '../constants.ts';
import type { NodeName, NodeFn } from '../types.ts';
import type { Edge } from './types.ts';

export function normalizeNodeName(name: NodeName): NodeName {
  if (START_ALIASES.has(name)) return START;
  if (END_ALIASES.has(name)) return END;
  return name;
}

export function resolveStart<S extends object>(
  nodes: Map<NodeName, NodeFn<S>>,
  edges: Map<NodeName, Edge<S>>,
): NodeName {
  const startEdge = edges.get(START);
  if (startEdge && startEdge.kind === 'fixed') return startEdge.to;

  const first = nodes.keys().next().value;
  if (!first) throw new Error('Pipeline has no nodes.');
  return first;
}

export function validateGraph<S extends object>(
  nodes: Map<NodeName, NodeFn<S>>,
  edges: Map<NodeName, Edge<S>>,
  entryPoint: NodeName,
): void {
  for (const [from, edge] of edges) {
    if (from === END) {
      throw new Error('END cannot have outgoing edges.');
    }

    if (from !== START && !nodes.has(from)) {
      throw new Error(`Edge source "${from}" not found in pipeline.`);
    }

    if (from === START && edge.kind === 'conditional') {
      throw new Error('START supports only fixed edges.');
    }

    if (edge.kind === 'fixed') {
      if (edge.to === START) {
        throw new Error('START cannot be used as edge target.');
      }
      if (edge.to !== END && !nodes.has(edge.to)) {
        throw new Error(`Edge target "${edge.to}" not found in pipeline.`);
      }
    }
  }

  if (nodes.size === 0) {
    throw new Error('Pipeline has no nodes.');
  }

  if (entryPoint !== END && !nodes.has(entryPoint)) {
    throw new Error(`Entry point "${entryPoint}" not found in pipeline.`);
  }
}
