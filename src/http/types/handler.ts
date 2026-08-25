import type { HttpState } from './http.state.ts';

export type Handler<S extends HttpState = HttpState> = (
  state: S,
) => void | Promise<void>;
