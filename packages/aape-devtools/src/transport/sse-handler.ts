import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TimelineEntry } from '../types.ts';

interface SseSource<S extends object> {
  getTimeline: () => TimelineEntry<S>[];
  subscribe: (listener: (entry: TimelineEntry<S>) => void) => () => void;
}

export function createSseHandler<S extends object>(source: SseSource<S>) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write('\n');

    const rawLastEventId = req.headers['last-event-id'];
    const lastEventId = typeof rawLastEventId === 'string'
      ? Number.parseInt(rawLastEventId, 10)
      : Array.isArray(rawLastEventId)
        ? Number.parseInt(rawLastEventId[0] ?? '', 10)
        : Number.NaN;

    if (Number.isFinite(lastEventId)) {
      const startAt = lastEventId + 1;
      for (const entry of source.getTimeline()) {
        if (entry.index < startAt) continue;
        res.write('event: pipeline\n');
        res.write(`data: ${JSON.stringify(entry)}\n\n`);
      }
    }

    const unsubscribe = source.subscribe((entry) => {
      res.write('event: pipeline\n');
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  };
}
