import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canLlmAccessResource, normalizeLlmAccessPolicy, resolveAllowedLlms } from '../../src/agent/access/policy.ts';

describe('access policy', () => {
  it('preserves explicit empty allow-lists as deny-all', () => {
    assert.deepEqual(resolveAllowedLlms([], 'deny'), []);
    assert.deepEqual(normalizeLlmAccessPolicy({ tools: [], skills: [], mcps: [] }), {
      tools: [],
      skills: [],
      mcps: [],
    });
    assert.equal(canLlmAccessResource(undefined, 'mcp', 'server-a', undefined, [], 'deny'), false);
    assert.equal(canLlmAccessResource('model-x', 'mcp', 'server-a', { mcps: [] }, [], 'deny'), false);
  });
});
