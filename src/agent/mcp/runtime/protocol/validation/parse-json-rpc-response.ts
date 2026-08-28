import type { JsonRpcResponse } from '../json-rpc/json-rpc-response.ts';
import { assertJsonRpcResponse } from './assert-json-rpc-response.ts';

/**
 * Parses raw text into a validated JSON-RPC response, throwing a descriptive
 * error for both malformed JSON and structurally invalid envelopes.
 *
 * @param text - The raw response body text.
 * @param context - Short label describing the transport for error messages.
 * @returns The parsed value, narrowed to {@link JsonRpcResponse}.
 */
export function parseJsonRpcResponse(text: string, context = 'MCP'): JsonRpcResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${context} response: ${message}`);
  }
  return assertJsonRpcResponse(parsed, context);
}
