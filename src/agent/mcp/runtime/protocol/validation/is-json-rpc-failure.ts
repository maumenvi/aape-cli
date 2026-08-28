import type { JsonRpcFailure } from '../json-rpc/json-rpc-failure.ts';
import { isJsonRpcErrorObject } from './is-json-rpc-error-object.ts';
import { isJsonRpcId } from './is-json-rpc-id.ts';
import { isJsonRpcMessage } from './is-json-rpc-message.ts';

/**
 * Validates that a decoded message is a well-formed JSON-RPC failure response.
 *
 * @param value - The decoded value to test.
 * @returns `true` when it has a valid id and a structured `error` object.
 */
export function isJsonRpcFailure(value: unknown): value is JsonRpcFailure {
  return (
    isJsonRpcMessage(value) &&
    isJsonRpcId(value.id) &&
    isJsonRpcErrorObject((value as { error?: unknown }).error)
  );
}
