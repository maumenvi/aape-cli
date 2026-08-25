import type { NextFn } from './next.fn.ts';
import type { AapeRequest } from './request.ts';
import type { AapeResponse } from './response.ts';

export type ErrorHandler = (
  err: unknown,
  req: AapeRequest,
  res: AapeResponse,
  next: NextFn,
) => void | Promise<void>;
