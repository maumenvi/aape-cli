import type { JsonRpcResponse } from '../json-rpc/json-rpc-response.ts';
import { isJsonRpcResponse } from './is-json-rpc-response.ts';

/**
 * Asserts that a decoded value is a well-formed JSON-RPC response, throwing a
 * descriptive error otherwise.
 *
 * Used by request/response transports (HTTP, SSE, WebSocket) to fail loudly on
 * malformed server output instead of dereferencing missing fields.
 *
 * @param value - The decoded value to validate.
 * @param context - Short label describing the transport for the error message.
 * @returns The value, narrowed to {@link JsonRpcResponse}.
 */
export function assertJsonRpcResponse(value: unknown, context = 'MCP'): JsonRpcResponse {
  if (!isJsonRpcResponse(value)) {
    throw new Error(`Malformed JSON-RPC response received from ${context} server.`);
  }
  return value;
}
