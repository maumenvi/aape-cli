import type { IncomingMessage } from 'node:http';
import type { AapeRequest } from '../types/request.ts';

// ──────────────────────────────────────────────
// Augment IncomingMessage → AapeRequest
// ──────────────────────────────────────────────

export function wrapRequest(req: IncomingMessage): AapeRequest {
  const r = req as AapeRequest;
  r.params = {};
  r.query = {};
  r.body = undefined;
  r.json = async function json<T = unknown>(): Promise<T> {
    return (this.body ?? {}) as T;
  };
  return r;
}
