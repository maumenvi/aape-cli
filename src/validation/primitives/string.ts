import type { Schema } from '../core/schema.ts';
import { createSchema, fail, ok } from '../core/schema.ts';

export function string(): Schema<string> {
  return createSchema(
    (value) =>
      typeof value === 'string'
        ? ok(value)
        : fail([{ path: '', message: 'Expected string' }]),
    () => '',
    'Expected string',
  );
}
