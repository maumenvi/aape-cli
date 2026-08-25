import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PipelineEvent, RunOptions } from '@maumenvi/aape';

export interface AapeDevtoolsOptions {
  enabled?: boolean;
  maxEvents?: number;
  maxDepth?: number;
  maxItems?: number;
  redactedKeys?: readonly string[];
  selectState?: (state: unknown) => unknown;
}

export interface TimelineEntry<S extends object> {
  index: number;
  at: number;
  event: PipelineEvent<S>;
}

export type TimelineSubscriber<S extends object> = (entry: TimelineEntry<S>) => void;

export interface DevtoolsDashboardOptions {
  basePath?: string;
  runPath?: string;
}

export interface AapeDevtools<S extends object> {
  setEnabled(next: boolean): void;
  isEnabled(): boolean;
  clear(): void;
  getTimeline(): TimelineEntry<S>[];
  getSnapshot(): { enabled: boolean; events: TimelineEntry<S>[] };
  subscribe(listener: TimelineSubscriber<S>): () => void;
  sseHandler(req: IncomingMessage, res: ServerResponse): void;
  dashboardHandler(req: IncomingMessage, res: ServerResponse, dashboardOptions?: DevtoolsDashboardOptions): void;
  toRunOptions(runOptions?: RunOptions<S>): RunOptions<S>;
}
