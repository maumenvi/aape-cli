import type { Schema } from '../core/schema.ts';
import { createSchema, ok } from '../core/schema.ts';

export function unknown(): Schema<unknown> {
  return createSchema((value) => ok(value), () => undefined);
}
