import { isRecord } from './is-record.ts';

/**
 * Validates the structured `error` member of a JSON-RPC failure response.
 *
 * @param value - The candidate error object.
 * @returns `true` when it carries a numeric `code` and a string `message`.
 */
export function isJsonRpcErrorObject(
  value: unknown,
): value is { code: number; message: string; data?: unknown } {
  return (
    isRecord(value) &&
    typeof value.code === 'number' &&
    typeof value.message === 'string'
  );
}
