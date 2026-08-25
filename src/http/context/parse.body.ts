import type { AapeRequest } from '../types/request.ts';
import { readBody } from './read.body.ts';

export async function parseBody(req: AapeRequest): Promise<void> {
  const result = await readBody(req);
  if (!result.ok || !result.data) return;

  const contentType = req.headers['content-type'] ?? '';
  if (contentType.includes('application/json')) {
    try { req.body = JSON.parse(result.data); } catch { req.body = result.data; }
  } else {
    req.body = result.data;
  }
}
