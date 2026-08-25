import type { MaybePromise } from '../core/maybePromise.ts';
import type { BudgetSnapshot, NodeName } from './types.ts';

export type PipelineEventType =
  | 'run_started'
  | 'node_started'
  | 'node_completed'
  | 'edge_selected'
  | 'node_error'
  | 'run_stopped'
  | 'run_completed'
  | 'run_failed'
  | 'budget_updated';

interface PipelineEventBase {
  type: PipelineEventType;
  runId: string;
  step: number;
  timestamp: number;
  budgetSnapshot?: BudgetSnapshot;
}

export type PipelineEvent<S extends object> =
  | (PipelineEventBase & {
      type: 'run_started';
      entryPoint: NodeName;
      metadata: Record<string, unknown>;
      stateSnapshot: Readonly<S>;
    })
  | (PipelineEventBase & {
      type: 'node_started';
      node: NodeName;
      stateSnapshot: Readonly<S>;
    })
  | (PipelineEventBase & {
      type: 'node_completed';
      node: NodeName;
      patch: Partial<S> | void;
      stateSnapshot: Readonly<S>;
    })
  | (PipelineEventBase & {
      type: 'edge_selected';
      from: NodeName;
      to: NodeName;
      edgeKind: 'fixed' | 'conditional';
    })
  | (PipelineEventBase & {
      type: 'node_error';
      node: NodeName;
      error: unknown;
    })
  | (PipelineEventBase & {
      type: 'run_stopped';
      reason: 'stopWhen';
      stateSnapshot: Readonly<S>;
    })
  | (PipelineEventBase & {
      type: 'run_completed';
      totalSteps: number;
      stateSnapshot: Readonly<S>;
    })
  | (PipelineEventBase & {
      type: 'run_failed';
      error: unknown;
      totalSteps: number;
      stateSnapshot: Readonly<S>;
    })
  | (PipelineEventBase & {
      type: 'budget_updated';
      reason: 'run_started' | 'node_started' | 'node_completed' | 'tool_call' | 'run_completed' | 'run_failed' | 'run_stopped';
    });

export type PipelineEventHandler<S extends object> = (event: PipelineEvent<S>) => MaybePromise<void>;
