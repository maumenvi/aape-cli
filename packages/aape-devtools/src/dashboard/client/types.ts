import type { Edge, Node } from 'reactflow';

export interface TimelineEventEntry {
  index: number;
  at: number;
  event: {
    type: string;
    step?: number;
    node?: string;
    from?: string;
    to?: string;
    edgeKind?: string;
    entryPoint?: string;
    budgetSnapshot?: BudgetSnapshotView;
  };
}

export interface BudgetSnapshotView {
  used?: {
    tokens?: number;
    tools?: number;
    timeMs?: number;
    costUsd?: number;
  };
  limits?: {
    tokens?: number;
    tools?: number;
    timeMs?: number;
    costUsd?: number;
  };
  remaining?: {
    tokens?: number;
    tools?: number;
    timeMs?: number;
    costUsd?: number;
  };
  exceeded?: string[];
  updatedAt?: number;
}

export interface Summary {
  runStarted: number;
  runCompleted: number;
  runFailed: number;
  runStopped: number;
  nodes: number;
  edges: number;
  lastEventAt: number | null;
}

export interface TraceSummary {
  nodes: string[];
  edges: string[];
}

export interface GraphModel {
  nodes: Node[];
  edges: Edge[];
}

export interface DevtoolsEndpoints {
  run: string;
  events: string;
  timeline: string;
  clear: string;
}

export interface BudgetStatusView {
  used: Required<NonNullable<BudgetSnapshotView['used']>>;
  limits: Required<NonNullable<BudgetSnapshotView['limits']>>;
  remaining: Required<NonNullable<BudgetSnapshotView['remaining']>>;
  exceeded: string[];
  risk: 'ok' | 'warning' | 'critical';
}
