import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTimelineStore } from '../src/runtime/timeline-store.ts';
import type { PipelineEvent } from '../../../src/pipeline/events.ts';

interface S {
  count: number;
}

function completedEvent(step: number): PipelineEvent<S> {
  return {
    type: 'run_completed',
    runId: 'r1',
    step,
    timestamp: Date.now(),
    totalSteps: step,
    stateSnapshot: { count: step },
  };
}

describe('createTimelineStore', () => {
  it('stores timeline entries and emits to subscribers', () => {
    const store = createTimelineStore<S>(10);
    const seen: number[] = [];
    const unsubscribe = store.subscribe((entry) => {
      seen.push(entry.index);
    });

    store.push(completedEvent(1));
    store.push(completedEvent(2));
    unsubscribe();
    store.push(completedEvent(3));

    assert.deepEqual(seen, [0, 1]);
    assert.equal(store.getTimeline().length, 3);
  });

  it('trims old entries and reindexes', () => {
    const store = createTimelineStore<S>(2);
    store.push(completedEvent(1));
    store.push(completedEvent(2));
    store.push(completedEvent(3));

    const timeline = store.getTimeline();
    assert.equal(timeline.length, 2);
    assert.equal(timeline[0].index, 0);
    assert.equal(timeline[1].index, 1);
    assert.equal((timeline[0].event as any).totalSteps, 2);
    assert.equal((timeline[1].event as any).totalSteps, 3);
  });
});
