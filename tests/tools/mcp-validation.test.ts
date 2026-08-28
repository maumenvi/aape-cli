import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertJsonRpcResponse,
  isJsonRpcFailure,
  isJsonRpcId,
  isJsonRpcMessage,
  isJsonRpcResponse,
  isJsonRpcSuccess,
  isRecord,
  parseJsonRpcResponse,
} from '../../src/agent/mcp/runtime/protocol/validation/index.ts';
import { McpMessageDecoder } from '../../src/agent/mcp/runtime/protocol/framing.ts';

describe('JSON-RPC structural validation', () => {
  it('recognizes plain records only', () => {
    assert.equal(isRecord({}), true);
    assert.equal(isRecord([]), false);
    assert.equal(isRecord(null), false);
    assert.equal(isRecord('x'), false);
  });

  it('validates the JSON-RPC 2.0 envelope', () => {
    assert.equal(isJsonRpcMessage({ jsonrpc: '2.0' }), true);
    assert.equal(isJsonRpcMessage({ jsonrpc: '1.0' }), false);
    assert.equal(isJsonRpcMessage({}), false);
    assert.equal(isJsonRpcMessage(42), false);
  });

  it('validates JSON-RPC ids', () => {
    assert.equal(isJsonRpcId(1), true);
    assert.equal(isJsonRpcId('abc'), true);
    assert.equal(isJsonRpcId(null), false);
    assert.equal(isJsonRpcId(Number.NaN), false);
  });

  it('narrows success and failure responses', () => {
    const success = { jsonrpc: '2.0', id: 1, result: { ok: true } };
    const failure = { jsonrpc: '2.0', id: 2, error: { code: -32000, message: 'boom' } };
    assert.equal(isJsonRpcSuccess(success), true);
    assert.equal(isJsonRpcFailure(success), false);
    assert.equal(isJsonRpcFailure(failure), true);
    assert.equal(isJsonRpcSuccess(failure), false);
    assert.equal(isJsonRpcResponse(success), true);
    assert.equal(isJsonRpcResponse(failure), true);
  });

  it('rejects malformed responses missing structured fields', () => {
    assert.equal(isJsonRpcResponse({ jsonrpc: '2.0', id: 1 }), false);
    assert.equal(isJsonRpcResponse({ jsonrpc: '2.0', result: {} }), false);
    assert.equal(isJsonRpcFailure({ jsonrpc: '2.0', id: 1, error: { message: 'no code' } }), false);
    assert.equal(isJsonRpcFailure({ jsonrpc: '2.0', id: 1, error: 'oops' }), false);
  });

  it('asserts a valid response or throws with context', () => {
    const value = assertJsonRpcResponse({ jsonrpc: '2.0', id: 1, result: 7 }, 'HTTP');
    assert.deepEqual(value, { jsonrpc: '2.0', id: 1, result: 7 });
    assert.throws(() => assertJsonRpcResponse({ jsonrpc: '2.0', id: 1 }, 'HTTP'), /Malformed JSON-RPC response received from HTTP/);
  });

  it('parses text into a validated response and reports invalid JSON', () => {
    const parsed = parseJsonRpcResponse('{"jsonrpc":"2.0","id":9,"result":true}', 'SSE');
    assert.deepEqual(parsed, { jsonrpc: '2.0', id: 9, result: true });
    assert.throws(() => parseJsonRpcResponse('not json', 'SSE'), /Invalid JSON in SSE response/);
    assert.throws(() => parseJsonRpcResponse('{"jsonrpc":"2.0"}', 'SSE'), /Malformed JSON-RPC response received from SSE/);
  });
});

describe('McpMessageDecoder defensive framing', () => {
  it('decodes valid JSON-RPC lines and drops malformed ones', () => {
    const decoder = new McpMessageDecoder();
    const input = [
      '{"jsonrpc":"2.0","id":1,"result":{}}',
      'not-json',
      '{"foo":"bar"}',
      '{"jsonrpc":"2.0","id":2,"error":{"code":-1,"message":"x"}}',
      '',
    ].join('\n') + '\n';

    const messages = decoder.push(Buffer.from(input, 'utf8'));
    assert.equal(messages.length, 2);
    assert.deepEqual(messages[0], { jsonrpc: '2.0', id: 1, result: {} });
    assert.deepEqual(messages[1], { jsonrpc: '2.0', id: 2, error: { code: -1, message: 'x' } });
  });

  it('buffers partial lines across chunks', () => {
    const decoder = new McpMessageDecoder();
    assert.deepEqual(decoder.push(Buffer.from('{"jsonrpc":"2.0",', 'utf8')), []);
    const messages = decoder.push(Buffer.from('"id":5,"result":1}\n', 'utf8'));
    assert.deepEqual(messages, [{ jsonrpc: '2.0', id: 5, result: 1 }]);
  });
});
