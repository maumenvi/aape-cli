export type Issue = {
  path: string;
  message: string;
};

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

export class ValidationError extends Error {
  readonly issues: Issue[];

  constructor(issues: Issue[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export class ValidationInputError extends Error {
  readonly issues: Issue[];

  constructor(issues: Issue[]) {
    super(issues[0]?.message ?? 'Validation failed');
    this.name = 'ValidationInputError';
    this.issues = issues;
  }
}
