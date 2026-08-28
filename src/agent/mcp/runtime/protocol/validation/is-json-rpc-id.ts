/**
 * Validates that a value is a valid JSON-RPC identifier (`string` or `number`).
 *
 * Per the JSON-RPC 2.0 spec responses always echo the request id; a `null` id
 * only appears on protocol-level errors, which this transport layer does not
 * correlate to pending requests.
 *
 * @param value - The value to test.
 * @returns `true` when the value is a string or a finite number.
 */
export function isJsonRpcId(value: unknown): value is string | number {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}
