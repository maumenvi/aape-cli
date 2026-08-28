/**
 * Narrows an unknown value to a plain object with string keys.
 *
 * @param value - The value to test.
 * @returns `true` when the value is a non-null, non-array object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
