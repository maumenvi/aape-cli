import type { Schema, Infer } from '../core/schema.ts';
import { createSchema, fail, isPlainObject, ok } from '../core/schema.ts';
import { appendPath } from '../utils/path.ts';

export function object<T extends Record<string, Schema<any>>>(
  shape: T,
): Schema<{ [K in keyof T]: Infer<T[K]> }> {
  type Output = { [K in keyof T]: Infer<T[K]> };
  const schema = createSchema<Output>((value, path) => {
    if (!isPlainObject(value)) {
      return fail([{ path, message: 'Expected object' }]);
    }

    const data: Partial<Output> = {};
    const issues = [];

    for (const key of Object.keys(shape) as Array<keyof T>) {
      const result = shape[key].safeParse(value[key as string]);
      if (result.success) {
        data[key] = result.data;
        continue;
      }

      issues.push({
        path: appendPath(path, String(key)),
        message: result.error.issues[0]?.message ?? 'Validation failed',
      });
    }

    if (issues.length) {
      return fail(issues);
    }

    return ok(data as Output);
  }, () => ({} as Output));
  return schema as Schema<Output>;
}
