import type { ServerResponse } from 'node:http';
import type { AapeResponse } from '../types/response.ts';

// ──────────────────────────────────────────────
// Augment ServerResponse → AapeResponse
// ──────────────────────────────────────────────

export function wrapResponse(res: ServerResponse): AapeResponse {
  const r = res as AapeResponse;

  r.status = function (code: number) {
    this.statusCode = code;
    return this;
  };

  r.json = function (data: unknown) {
    const body = JSON.stringify(data);
    if (!this.headersSent) {
      this.setHeader('Content-Type', 'application/json');
    }
    this.end(body);
  };

  r.send = function (data: string, contentType = 'text/plain') {
    if (!this.headersSent) {
      this.setHeader('Content-Type', contentType);
    }
    this.end(data);
  };

  return r;
}
