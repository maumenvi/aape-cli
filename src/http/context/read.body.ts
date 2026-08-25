import type { IncomingMessage } from 'node:http';

type BodyResult =
  | { ok: true; data: string }
  | { ok: false; status: number; error: string };

export function readBody(req: IncomingMessage, maxBytes = 1_048_576): Promise<BodyResult> {
  return new Promise((resolve) => {
    if (req.destroyed) {
      return resolve({ ok: false, status: 400, error: 'Request aborted' });
    }

    let size = 0;
    const chunks: Buffer[] = [];

    const onData = (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > maxBytes) {
        // Remove listeners to stop processing, drain the stream without storing
        req.removeListener('data', onData);
        req.removeListener('end', onEnd);
        req.removeListener('error', onError);
        req.resume(); // drain remaining data so socket can be reused
        resolve({ ok: false, status: 413, error: 'Payload Too Large' });
      } else {
        chunks.push(chunk);
      }
    };

    const onEnd = () => {
      resolve({ ok: true, data: Buffer.concat(chunks).toString('utf-8') });
    };

    const onError = () => {
      resolve({ ok: false, status: 400, error: 'Error reading request body' });
    };

    req.on('data', onData);
    req.once('end', onEnd);
    req.once('error', onError);
    req.once('aborted', () => resolve({ ok: false, status: 400, error: 'Request aborted' }));
  });
}

