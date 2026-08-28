import { isRecord } from './is-record.ts';

/**
 * Validates that a value is a well-formed JSON-RPC 2.0 envelope.
 *
 * This is the first defensive gate applied to any decoded message before it is
 * interpreted as a request, notification or response.
 *
 * @param value - The decoded value to test.
 * @returns `true` when the value is an object whose `jsonrpc` field equals `"2.0"`.
 */
export function isJsonRpcMessage(
  value: unknown,
): value is Record<string, unknown> & { jsonrpc: '2.0' } {
  return isRecord(value) && value.jsonrpc === '2.0';
}
