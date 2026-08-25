import type { Issue, ParseResult } from '../types.ts';
import { ValidationError, ValidationInputError } from '../types.ts';

export type Schema<T> = {
  readonly type: T;
  readonly description?: string;
  parse(value: unknown): T;
  safeParse(value: unknown): ParseResult<T>;
  describe(label: string): Schema<T>;
  optional(): Schema<T | undefined>;
  default(value: T): Schema<T>;
  pass(): Schema<T>;
  as<U>(): Schema<U>;
};

export type Infer<S> = S extends Schema<infer T> ? T : never;

export type DefinedSchema<T, S extends Schema<T>> = { schema: S; type: T };

export type AnySchema<T> = Schema<T> & { readonly type: T };

export function ok<T>(data: T): ParseResult<T> {
  return { success: true, data };
}

export function fail<T>(issues: Issue[]): ParseResult<T> {
  return { success: false, error: new ValidationError(issues) };
}

export function failInput<T>(issues: Issue[]): ParseResult<T> {
  return { success: false, error: new ValidationInputError(issues) };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createSchema<T>(
  validate: (value: unknown, path: string) => ParseResult<T>,
  typeFactory: () => T,
  _description?: string,
): Schema<T> {
  const build = (description?: string): Schema<T> => ({
    type: typeFactory(),
    description,
    parse(value: unknown) {
      const result = validate(value, '');
      if (!result.success) {
        throw new ValidationInputError(result.error.issues);
      }
      return result.data;
    },
    safeParse(value: unknown) {
      return validate(value, '');
    },
    describe(label: string) {
      return build(label);
    },
    optional() {
      return createSchema<T | undefined>(
        (value, path) => (value === undefined ? ok(undefined) : validate(value, path)),
        () => undefined,
      );
    },
    default(value: T) {
      return createSchema(
        (input, path) => {
          if (input === undefined) return ok(value);
          return validate(input, path);
        },
        () => value,
      );
    },
    pass() {
      return build(description);
    },
    as<U>() {
      return createSchema<U>(
        (value, path) => validate(value, path) as unknown as ParseResult<U>,
        () => typeFactory() as unknown as U,
      );
    },
  });

  return build();
}

export function defineSchema<S extends Schema<any>>(schema: S): DefinedSchema<Infer<S>, S> {
  return { schema, type: schema.type as Infer<S> };
}

export function custom<T>(check: (value: unknown) => value is T): Schema<T> {
  return createSchema(
    (value) =>
      check(value)
        ? ok(value)
        : failInput([{ path: '', message: 'Invalid value' }]),
    () => undefined as T,
  );
}
