import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toSerializableEvent } from '../src/runtime/serialize-event.ts';
import type { PipelineEvent } from '../../../src/pipeline/events.ts';

interface S {
  count: number;
}

describe('toSerializableEvent', () => {
  it('keeps non-error events unchanged', () => {
    const event: PipelineEvent<S> = {
      type: 'run_started',
      runId: 'r1',
      step: 0,
      timestamp: Date.now(),
      entryPoint: 'inc',
      metadata: {},
      stateSnapshot: { count: 0 },
    };

    const result = toSerializableEvent(event);
    assert.strictEqual(result, event);
  });

  it('serializes Error objects in node_error events', () => {
    const event: PipelineEvent<S> = {
      type: 'node_error',
      runId: 'r1',
      step: 1,
      timestamp: Date.now(),
      node: 'inc',
      error: new Error('boom'),
    };

    const result = toSerializableEvent(event);
    assert.notStrictEqual(result, event);
    assert.equal((result as any).error.message, 'boom');
    assert.equal((result as any).error.name, 'Error');
  });

  it('handles circular state and redacts secrets', () => {
    const state: { count: number; password: string; nested: Record<string, unknown> } = {
      count: 2,
      password: 'super-secret',
      nested: {},
    };
    state.nested.self = state;

    const event: PipelineEvent<{ count: number; password: string; nested: Record<string, unknown> }> = {
      type: 'run_completed',
      runId: 'r1',
      step: 2,
      timestamp: Date.now(),
      totalSteps: 2,
      stateSnapshot: state,
    };

    const result = toSerializableEvent(event, {
      redactedKeys: ['password'],
      maxDepth: 4,
    });

    assert.ok(result);
    assert.equal((result as any).stateSnapshot.password, '[REDACTED]');
    assert.equal((result as any).stateSnapshot.nested.self, '[Circular]');
  });
});
