import type { JsonRpcSuccess } from '../json-rpc/json-rpc-success.ts';
import { isJsonRpcId } from './is-json-rpc-id.ts';
import { isJsonRpcMessage } from './is-json-rpc-message.ts';

/**
 * Validates that a decoded message is a well-formed JSON-RPC success response.
 *
 * @param value - The decoded value to test.
 * @returns `true` when it has a valid id, a `result` member and no `error`.
 */
export function isJsonRpcSuccess(value: unknown): value is JsonRpcSuccess {
  return (
    isJsonRpcMessage(value) &&
    isJsonRpcId(value.id) &&
    'result' in value &&
    !('error' in value)
  );
}
