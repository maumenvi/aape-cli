import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRunOptions } from '../../src/pipeline/options.ts';
import type { RunOptions } from '../../src/pipeline/types.ts';

interface S {
  ok: boolean;
}

describe('normalizeRunOptions', () => {
  it('returns the same object when input is RunOptions (maxSteps)', () => {
    const options: RunOptions<S> = { maxSteps: 7 };
    const result = normalizeRunOptions<S>(options);

    assert.strictEqual(result, options);
    assert.equal(result.maxSteps, 7);
  });

  it('returns the same object when input is RunOptions (stopWhen)', () => {
    const stopWhen: RunOptions<S>['stopWhen'] = (state) => state.ok;
    const options: RunOptions<S> = { stopWhen };

    const result = normalizeRunOptions<S>(options);

    assert.strictEqual(result, options);
    assert.strictEqual(result.stopWhen, stopWhen);
  });

  it('returns the same object when signal key exists (even undefined)', () => {
    const options = { signal: undefined } as RunOptions<S>;
    const result = normalizeRunOptions<S>(options);

    assert.strictEqual(result, options);
    assert.equal('signal' in result, true);
  });

  it('returns the same object when devtools key exists', () => {
    const options: RunOptions<S> = {
      devtools: {
        enabled: true,
        onEvent: () => {},
      },
    };
    const result = normalizeRunOptions<S>(options);

    assert.strictEqual(result, options);
    assert.equal(result.devtools?.enabled, true);
  });

  it('returns the same object when budget key exists', () => {
    const options: RunOptions<S> = {
      budget: {
        limits: { tokens: 1000 },
      },
    };
    const result = normalizeRunOptions<S>(options);
    assert.strictEqual(result, options);
    assert.equal(result.budget?.limits.tokens, 1000);
  });

  it('returns the same object when checkpoint key exists', () => {
    const options: RunOptions<S> = {
      checkpoint: {
        id: 'cp-1',
        store: {
          load: async () => null,
          save: async () => {},
        },
      },
    };
    const result = normalizeRunOptions<S>(options);
    assert.strictEqual(result, options);
    assert.equal(result.checkpoint?.id, 'cp-1');
  });

  it('wraps plain metadata object into { metadata }', () => {
    const metadata = { traceId: 'abc', tenant: 'aape' };
    const result = normalizeRunOptions<S>(metadata);

    assert.notStrictEqual(result, metadata);
    assert.deepEqual(result, { metadata });
  });

  it('treats empty object as metadata', () => {
    const result = normalizeRunOptions<S>({});
    assert.deepEqual(result, { metadata: {} });
  });

  it('keeps explicit metadata run option as-is', () => {
    const options: RunOptions<S> = { metadata: { traceId: 'xyz' } };
    const result = normalizeRunOptions<S>(options);

    assert.strictEqual(result, options);
    assert.deepEqual(result.metadata, { traceId: 'xyz' });
  });
});