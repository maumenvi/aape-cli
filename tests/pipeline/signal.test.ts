import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRunSignal, raceSignal } from '../../src/pipeline/signal.ts';

interface S {
  ok: boolean;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('createRunSignal', () => {
  it('creates a non-aborted signal when no options are provided', () => {
    const runSignal = createRunSignal<S>({});
    assert.equal(runSignal.signal.aborted, false);
    runSignal.clear();
  });

  it('reuses external signal when only one signal exists', () => {
    const controller = new AbortController();
    const runSignal = createRunSignal<S>({ signal: controller.signal });

    assert.strictEqual(runSignal.signal, controller.signal);
    runSignal.clear();
  });

  it('aborts on timeout with expected message', async () => {
    const runSignal = createRunSignal<S>({ timeoutMs: 10 });
    await wait(30);

    assert.equal(runSignal.signal.aborted, true);
    assert.ok(runSignal.signal.reason instanceof Error);
    assert.match((runSignal.signal.reason as Error).message, /timed out/i);
    runSignal.clear();
  });

  it('clear cancels timeout abort', async () => {
    const runSignal = createRunSignal<S>({ timeoutMs: 20 });
    runSignal.clear();
    await wait(40);

    assert.equal(runSignal.signal.aborted, false);
  });

  it('combines external signal and timeout, preserving external reason', async () => {
    const controller = new AbortController();
    const runSignal = createRunSignal<S>({ signal: controller.signal, timeoutMs: 100 });
    const reason = new Error('external cancel');

    controller.abort(reason);
    await wait(0);

    assert.equal(runSignal.signal.aborted, true);
    assert.strictEqual(runSignal.signal.reason, reason);
    runSignal.clear();
  });
});

describe('raceSignal', () => {
  it('resolves when promise resolves', async () => {
    const signal = new AbortController().signal;
    const result = await raceSignal(Promise.resolve(42), signal);
    assert.equal(result, 42);
  });

  it('resolves void values', async () => {
    const signal = new AbortController().signal;
    const result = await raceSignal(undefined, signal);
    assert.equal(result, undefined);
  });

  it('rejects when wrapped promise rejects', async () => {
    const signal = new AbortController().signal;
    await assert.rejects(
      () => raceSignal(Promise.reject(new Error('boom')), signal),
      /boom/,
    );
  });

  it('rejects immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('already aborted'));

    await assert.rejects(
      () => raceSignal(Promise.resolve('ok'), controller.signal),
      /already aborted/,
    );
  });

  it('rejects when signal aborts before promise settles', async () => {
    const controller = new AbortController();
    const pending = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 100);
    });

    setTimeout(() => controller.abort(new Error('cancelled')), 10);

    await assert.rejects(
      () => raceSignal(pending, controller.signal),
      /cancelled/,
    );
  });
});