import { MarkerType } from 'reactflow';
import type { BudgetSnapshotView, BudgetStatusView, GraphModel, Summary, TimelineEventEntry, TraceSummary } from './types.ts';

export function buildGraph(events: TimelineEventEntry[], cursor: number): GraphModel {
  const visible = events.slice(0, cursor + 1);
  const nodeSet = new Set<string>();
  const edgeSet = new Set<string>();
  let activeNode: string | null = null;

  for (const entry of visible) {
    const event = entry.event;
    if (event.type === 'run_started' && event.entryPoint) nodeSet.add(event.entryPoint);
    if (
      (event.type === 'node_started' || event.type === 'node_completed' || event.type === 'node_error') &&
      event.node
    ) {
      nodeSet.add(event.node);
      activeNode = event.node;
    }
    if (event.type === 'edge_selected' && event.from && event.to) {
      nodeSet.add(event.from);
      nodeSet.add(event.to);
      edgeSet.add(`${event.from}->${event.to}|${event.edgeKind ?? 'edge'}`);
    }
  }

  const orderedNodes = Array.from(nodeSet);
  const nodes = orderedNodes.map((name, index) => ({
    id: name,
    position: { x: index * 220, y: 100 + ((index % 2) * 40) },
    data: { label: name },
    style: {
      borderRadius: 10,
      border: `1px solid ${name === activeNode ? '#1b7f4a' : '#2c406f'}`,
      color: '#e7ebff',
      background: name === activeNode ? '#123922' : '#142041',
      width: 150,
      textAlign: 'center' as const,
      fontWeight: 600,
    },
  }));

  const edges = Array.from(edgeSet).map((raw, index) => {
    const [path, kind] = raw.split('|');
    const [source, target] = path.split('->');
    return {
      id: `e-${index}`,
      source,
      target,
      type: 'smoothstep',
      label: kind,
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
      style: { stroke: '#6f8fcb', strokeWidth: 1.8 },
      labelStyle: { fill: '#aab6de', fontSize: 11 },
    };
  });

  return { nodes, edges };
}

export function buildSummary(events: TimelineEventEntry[]): Summary {
  const nodeSet = new Set<string>();
  const edgeSet = new Set<string>();
  let runStarted = 0;
  let runCompleted = 0;
  let runFailed = 0;
  let runStopped = 0;

  for (const entry of events) {
    const event = entry.event;
    if (event.type === 'run_started') {
      runStarted++;
      if (event.entryPoint) nodeSet.add(event.entryPoint);
    }
    if (event.type === 'run_completed') runCompleted++;
    if (event.type === 'run_failed') runFailed++;
    if (event.type === 'run_stopped') runStopped++;
    if ((event.type === 'node_error' || event.type === 'node_started' || event.type === 'node_completed') && event.node) {
      nodeSet.add(event.node);
    }
    if (event.type === 'edge_selected' && event.from && event.to) {
      nodeSet.add(event.from);
      nodeSet.add(event.to);
      edgeSet.add(`${event.from}->${event.to}`);
    }
  }

  return {
    runStarted,
    runCompleted,
    runFailed,
    runStopped,
    nodes: nodeSet.size,
    edges: edgeSet.size,
    lastEventAt: events.length > 0 ? events[events.length - 1].at : null,
  };
}

export function buildTraceSummary(events: TimelineEventEntry[], cursor: number): TraceSummary {
  const visible = events.slice(0, cursor + 1);
  const nodes: string[] = [];
  const edges: string[] = [];

  for (const entry of visible) {
    const event = entry.event;
    if (event.type === 'node_started' && event.node) nodes.push(event.node);
    if (event.type === 'edge_selected' && event.from && event.to) edges.push(`${event.from} -> ${event.to}`);
  }

  return { nodes: nodes.slice(-12), edges: edges.slice(-12) };
}

export function buildBudgetStatus(events: TimelineEventEntry[], cursor: number): BudgetStatusView | null {
  const visible = events.slice(0, cursor + 1).reverse();
  const snapshot = visible.find((entry) => entry.event.budgetSnapshot)?.event.budgetSnapshot;
  if (!snapshot) return null;

  const used = {
    tokens: snapshot.used?.tokens ?? 0,
    tools: snapshot.used?.tools ?? 0,
    timeMs: snapshot.used?.timeMs ?? 0,
    costUsd: snapshot.used?.costUsd ?? 0,
  };
  const limits = {
    tokens: toFinite(snapshot.limits?.tokens),
    tools: toFinite(snapshot.limits?.tools),
    timeMs: toFinite(snapshot.limits?.timeMs),
    costUsd: toFinite(snapshot.limits?.costUsd),
  };
  const remaining = {
    tokens: snapshot.remaining?.tokens ?? Math.max(0, limits.tokens - used.tokens),
    tools: snapshot.remaining?.tools ?? Math.max(0, limits.tools - used.tools),
    timeMs: snapshot.remaining?.timeMs ?? Math.max(0, limits.timeMs - used.timeMs),
    costUsd: snapshot.remaining?.costUsd ?? Math.max(0, limits.costUsd - used.costUsd),
  };
  const maxRatio = Math.max(
    ratio(used.tokens, limits.tokens),
    ratio(used.tools, limits.tools),
    ratio(used.timeMs, limits.timeMs),
    ratio(used.costUsd, limits.costUsd),
  );
  const risk = maxRatio >= 0.9 ? 'critical' : maxRatio >= 0.7 ? 'warning' : 'ok';

  return {
    used,
    limits,
    remaining,
    exceeded: snapshot.exceeded ?? [],
    risk,
  };
}

function toFinite(value: number | undefined): number {
  return typeof value === 'number' ? value : Number.POSITIVE_INFINITY;
}

function ratio(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return used / limit;
}
