import type { AapeRequest } from './request.ts';
import type { AapeResponse } from './response.ts';

export interface HttpState<T = unknown> {
  req: AapeRequest;
  res: AapeResponse;
  data?: T;
  error?: unknown;
}
