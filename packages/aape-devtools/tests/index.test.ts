import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAapeDevtools } from '../src/index.ts';
import type { PipelineEvent } from '../../../src/pipeline/events.ts';

interface S {
  count: number;
}

function runStartedEvent(): PipelineEvent<S> {
  return {
    type: 'run_started',
    runId: 'r1',
    step: 0,
    timestamp: Date.now(),
    entryPoint: 'inc',
    metadata: {},
    stateSnapshot: { count: 0 },
  };
}

describe('createAapeDevtools', () => {
  it('is opt-in and can be disabled', () => {
    const devtools = createAapeDevtools<S>({ enabled: false });
    const options = devtools.toRunOptions();
    options.devtools?.onEvent(runStartedEvent());
    assert.equal(devtools.getTimeline().length, 0);
  });

  it('records events when enabled', () => {
    const devtools = createAapeDevtools<S>({ enabled: true });
    const options = devtools.toRunOptions();
    options.devtools?.onEvent(runStartedEvent());
    assert.equal(devtools.getTimeline().length, 1);
  });

  it('can fail fast on devtools telemetry errors', () => {
    let threw = false;
    const devtools = createAapeDevtools<S>({ enabled: true });
    const options = devtools.toRunOptions({
      devtools: {
        enabled: true,
        onEvent: () => {
          throw new Error('telemetry exploded');
        },
        eventErrorPolicy: 'fail',
      },
    });

    try {
      options.devtools?.onEvent(runStartedEvent());
    } catch {
      threw = true;
    }

    assert.equal(threw, true);
  });
});
