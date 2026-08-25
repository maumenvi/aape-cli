import type { Schema } from '../core/schema.ts';
import { createSchema, fail, ok } from '../core/schema.ts';

export function boolean(): Schema<boolean> {
  return createSchema(
    (value) =>
      typeof value === 'boolean'
        ? ok(value)
        : fail([{ path: '', message: 'Expected a boolean' }]),
    () => false,
    'boolean',
  );
}
