import type { JsonRpcResponse } from '../json-rpc/json-rpc-response.ts';
import { isJsonRpcFailure } from './is-json-rpc-failure.ts';
import { isJsonRpcSuccess } from './is-json-rpc-success.ts';

/**
 * Validates that a decoded message is a well-formed JSON-RPC response,
 * i.e. either a success (with `result`) or a failure (with structured `error`).
 *
 * @param value - The decoded value to test.
 * @returns `true` when the value is a valid success or failure response.
 */
export function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  return isJsonRpcSuccess(value) || isJsonRpcFailure(value);
}
