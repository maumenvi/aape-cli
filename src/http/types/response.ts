import type { IncomingMessage, ServerResponse } from 'node:http';

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export interface AapeResponse extends ServerResponse {
  status(code: number): AapeResponse;
  json(data: unknown): void;
  send(data: string, contentType?: string): void;
}
