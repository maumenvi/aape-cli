import type { Schema } from '../core/schema.ts';
import { createSchema } from '../core/schema.ts';

export function pass<T>(): Schema<T> {
  return createSchema(
    (value) => ({ success: true, data: value as unknown as T }),
    () => undefined as unknown as T,
  );
}
