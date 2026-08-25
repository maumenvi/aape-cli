import type { PipelineEvent } from '@maumenvi/aape';
import { toSerializableEvent } from './serialize-event.ts';
import type { TimelineEntry, TimelineSubscriber } from '../types.ts';
import type { SerializationOptions } from './serialize-event.ts';

export function createTimelineStore<S extends object>(maxEvents: number, serializerOptions: SerializationOptions = {}) {
  const timeline: TimelineEntry<S>[] = [];
  const subscribers = new Set<TimelineSubscriber<S>>();

  const notify = (entry: TimelineEntry<S>): void => {
    for (const subscriber of subscribers) subscriber(entry);
  };

  return {
    push(event: PipelineEvent<S>): void {
      const entry: TimelineEntry<S> = {
        index: timeline.length,
        at: Date.now(),
        event: toSerializableEvent(event, serializerOptions),
      };
      timeline.push(entry);
      if (timeline.length > maxEvents) {
        timeline.shift();
        for (let i = 0; i < timeline.length; i++) timeline[i].index = i;
      }
      notify(entry);
    },
    clear(): void {
      timeline.length = 0;
    },
    getTimeline(): TimelineEntry<S>[] {
      return timeline.slice();
    },
    getSnapshot(enabled: boolean): { enabled: boolean; events: TimelineEntry<S>[] } {
      return {
        enabled,
        events: timeline.slice(),
      };
    },
    subscribe(listener: TimelineSubscriber<S>): () => void {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };
}
