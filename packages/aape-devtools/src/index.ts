import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PipelineEvent, RunOptions } from '@maumenvi/aape';
import { createDashboardHandler } from './dashboard/handler.ts';
import { createSseHandler } from './transport/sse-handler.ts';
import { createTimelineStore } from './runtime/timeline-store.ts';
import type {
  AapeDevtools,
  AapeDevtoolsOptions,
  DevtoolsDashboardOptions,
  TimelineSubscriber,
} from './types.ts';

export type {
  AapeDevtools,
  AapeDevtoolsOptions,
  DevtoolsDashboardOptions,
  TimelineEntry,
} from './types.ts';

export function createAapeDevtools<S extends object>(options: AapeDevtoolsOptions = {}): AapeDevtools<S> {
  let enabled = options.enabled ?? true;
  const store = createTimelineStore<S>(options.maxEvents ?? 10_000, {
    maxDepth: options.maxDepth ?? 6,
    maxItems: options.maxItems ?? 200,
    redactedKeys: options.redactedKeys ?? [],
    selectState: options.selectState,
  });
  const sseHandler = createSseHandler<S>({
    getTimeline: store.getTimeline,
    subscribe: store.subscribe,
  });
  const dashboardHandler = createDashboardHandler({
    sseHandler,
    getSnapshot: () => store.getSnapshot(enabled),
    setEnabled: (value) => {
      enabled = value;
    },
    clear: store.clear,
  });

  const pushEvent = (event: PipelineEvent<S>): void => {
    if (!enabled) return;
    store.push(event);
  };

  return {
    setEnabled(next: boolean): void {
      enabled = next;
    },
    isEnabled(): boolean {
      return enabled;
    },
    clear(): void {
      store.clear();
    },
    getTimeline() {
      return store.getTimeline();
    },
    getSnapshot() {
      return store.getSnapshot(enabled);
    },
    subscribe(listener: TimelineSubscriber<S>): () => void {
      return store.subscribe(listener);
    },
    sseHandler(req: IncomingMessage, res: ServerResponse): void {
      sseHandler(req, res);
    },
    dashboardHandler(
      req: IncomingMessage,
      res: ServerResponse,
      options?: DevtoolsDashboardOptions,
    ): void {
      dashboardHandler(req, res, options);
    },
    toRunOptions(runOptions: RunOptions<S> = {}): RunOptions<S> {
      return {
        ...runOptions,
        devtools: {
          ...runOptions.devtools,
          enabled,
          onEvent: runOptions.devtools?.onEvent ?? pushEvent,
          eventErrorPolicy: runOptions.devtools?.eventErrorPolicy ?? 'ignore',
        },
      };
    },
  };
}
