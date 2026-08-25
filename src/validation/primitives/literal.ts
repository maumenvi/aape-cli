import type { Schema } from '../core/schema.ts';
import { createSchema, fail, ok } from '../core/schema.ts';

export function literal<const T extends string | number | boolean | null>(
  expected: T,
): Schema<T> {
  return createSchema(
    (value) =>
      Object.is(value, expected)
        ? ok(expected)
        : fail([{ path: '', message: `Expected literal ${String(expected)}` }]),
    () => expected,
  );
}
