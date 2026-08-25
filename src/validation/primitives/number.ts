import type { Schema } from '../core/schema.ts';
import { createSchema, fail, ok } from '../core/schema.ts';

export function number(): Schema<number> {
  return createSchema(
    (value) =>
      typeof value === 'number' && Number.isFinite(value)
        ? ok(value)
        : fail([{ path: '', message: 'Expected number' }]),
    () => 0,
    'Expected number',
  );
}
