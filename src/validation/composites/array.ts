import type { Schema } from '../core/schema.ts';
import { createSchema, fail, ok } from '../core/schema.ts';
import { appendIndexPath } from '../utils/path.ts';

export function array<T>(item: Schema<T>): Schema<T[]> {
  return createSchema((value, path) => {
    if (!Array.isArray(value)) {
      return fail([{ path, message: 'Expected array' }]);
    }

    const data: T[] = [];
    const issues: Array<{ path: string; message: string }> = [];

    value.forEach((entry, index) => {
      const result = item.safeParse(entry);
      if (result.success) {
        data.push(result.data);
        return;
      }

      issues.push(
        ...result.error.issues.map((issue) => ({
          path: issue.path ? `${appendIndexPath(path, index)}.${issue.path}` : appendIndexPath(path, index),
          message: issue.message,
        })),
      );
    });

    return issues.length ? fail(issues) : ok(data);
  }, () => [] as T[]);
}
