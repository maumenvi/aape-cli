import type { IncomingMessage } from 'node:http';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export interface AapeRequest extends IncomingMessage {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  json<T = unknown>(): Promise<T>;
  // populated after parseBody()
}
