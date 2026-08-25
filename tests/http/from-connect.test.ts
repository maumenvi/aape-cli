import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fromConnect, App, type HttpState } from '../../src/index.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';

type ConnectMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => void;

async function request(app: App, path: string): Promise<Response> {
  const server = await app.listen(0);
  const port = (server.address() as any).port;
  const res = await fetch(`http://localhost:${port}${path}`);
  await app.close();
  return res;
}

describe('fromConnect', () => {
  it('returns a PipelineNode (function)', () => {
    const node = fromConnect((_req, _res, next) => next());
    assert.equal(typeof node, 'function');
  });

  it('executes the middleware and continues the pipeline', async () => {
    const called: string[] = [];

    const mw: ConnectMiddleware = (_req, _res, next) => {
      called.push('mw');
      next();
    };

    const app = new App();
    app.get('/test',
      fromConnect(mw),
      ({ res }: HttpState) => { called.push('handler'); res.json({ called }); },
    );

    const res = await request(app, '/test');
    const body = await res.json() as any;
    assert.deepEqual(body.called, ['mw', 'handler']);
  });

  it('allows middleware to set response headers', async () => {
    const mw: ConnectMiddleware = (_req, res, next) => {
      res.setHeader('X-Custom-Header', 'aape');
      next();
    };

    const app = new App();
    app.get('/headers', fromConnect(mw), ({ res }: HttpState) => res.send('ok'));

    const res = await request(app, '/headers');
    assert.equal(res.headers.get('x-custom-header'), 'aape');
  });

  it('propagates middleware errors to onError', async () => {
    const mw: ConnectMiddleware = (_req, _res, next) => {
      next(new Error('mw error'));
    };

    const app = new App();
    app.get('/boom', fromConnect(mw), ({ res }: HttpState) => res.send('ok'));
    app.onError((_err, _req, res, _next) => {
      res.status(500).json({ caught: true });
    });

    const res = await request(app, '/boom');
    assert.equal(res.status, 500);
    const body = await res.json() as any;
    assert.equal(body.caught, true);
  });

  it('middleware can short-circuit by writing the response directly', async () => {
    const mw: ConnectMiddleware = (_req, res, _next) => {
      // deliberately does NOT call next() — responds directly
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
    };

    const executed: string[] = [];
    const app = new App();
    app.get('/guard',
      fromConnect(mw),
      () => { executed.push('handler'); }, // should NOT run
    );

    const res = await request(app, '/guard');
    assert.equal(res.status, 403);
    // handler should not have run because res.writableEnded was true
    assert.deepEqual(executed, []);
  });
});
