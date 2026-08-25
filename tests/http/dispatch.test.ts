import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { App, Pipeline, createPipeline, START, END, type HttpState, type PipelineNode } from '../../src/index.ts';

async function request(app: App, method: string, path: string, body?: unknown): Promise<Response> {
  const server = await app.listen(0);
  const port = (server.address() as any).port;
  const opts: RequestInit = { method };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
    opts.headers = { 'content-type': 'application/json' };
  }
  const res = await fetch(`http://localhost:${port}${path}`, opts);
  await app.close();
  return res;
}

describe('dispatch', () => {
  describe('basic routing', () => {
    it('dispatches to the matched route', async () => {
      const app = new App();
      app.get('/hello', ({ res }: HttpState) => res.send('world'));

      const res = await request(app, 'GET', '/hello');
      assert.equal(await res.text(), 'world');
    });

    it('returns 404 for unknown route', async () => {
      const app = new App();
      const res = await request(app, 'GET', '/nope');
      assert.equal(res.status, 404);
    });

    it('passes route params to req.params', async () => {
      const app = new App();
      app.get('/users/:id', ({ req, res }: HttpState) => res.json({ id: req.params.id }));

      const res = await request(app, 'GET', '/users/42');
      const body = await res.json() as any;
      assert.equal(body.id, '42');
    });
  });

  describe('pipeline steps', () => {
    it('runs all steps in order', async () => {
      const order: number[] = [];
      const app = new App();

      const step1: PipelineNode = () => { order.push(1); };
      const step2: PipelineNode = () => { order.push(2); };
      const step3: PipelineNode = ({ res }: HttpState) => { order.push(3); res.json({ order }); };

      app.get('/order', step1, step2, step3);

      const res = await request(app, 'GET', '/order');
      const body = await res.json() as any;
      assert.deepEqual(body.order, [1, 2, 3]);
    });

    it('passes enriched state between steps', async () => {
      interface S extends HttpState { user?: string }

      const app = new App();
      const enrich: PipelineNode<S> = () => ({ user: 'alice' });
      const handler: PipelineNode<S> = ({ user, res }: S) => res.json({ user });

      app.get('/me', enrich, handler);

      const res = await request(app, 'GET', '/me');
      const body = await res.json() as any;
      assert.equal(body.user, 'alice');
    });

    it('accepts a Pipeline object as a step', async () => {
      const app = new App();

      const sub = createPipeline<HttpState>()
        .addNode('greet', ({ res }: HttpState) => { res.json({ msg: 'from pipeline' }); })
        .addEdge(START, 'greet')
        .addEdge('greet', END);

      app.get('/pipeline', sub);

      const res = await request(app, 'GET', '/pipeline');
      const body = await res.json() as any;
      assert.equal(body.msg, 'from pipeline');
    });
  });

  describe('globalSteps', () => {
    it('runs globalSteps before route steps', async () => {
      const order: string[] = [];
      const app = new App();

      app.use((_s: HttpState) => { order.push('global'); });
      app.get('/test', ({ res }: HttpState) => { order.push('route'); res.json({ order }); });

      const res = await request(app, 'GET', '/test');
      const body = await res.json() as any;
      assert.deepEqual(body.order, ['global', 'route']);
    });
  });

  describe('error handling', () => {
    it('calls onError when a step throws', async () => {
      const app = new App();
      app.get('/boom', () => { throw new Error('kaboom'); });
      app.onError((_err, _req, res, _next) => {
        res.status(500).json({ caught: true });
      });

      const res = await request(app, 'GET', '/boom');
      assert.equal(res.status, 500);
      const body = await res.json() as any;
      assert.equal(body.caught, true);
    });
  });

  describe('body parsing', () => {
    it('parses JSON body', async () => {
      const app = new App({ parseBody: true });
      app.post('/echo', ({ req, res }: HttpState) => res.json(req.body));

      const res = await request(app, 'POST', '/echo', { name: 'aape' });
      const body = await res.json() as any;
      assert.equal(body.name, 'aape');
    });

    it('returns 413 when body exceeds bodyLimit', async () => {
      const app = new App({ bodyLimit: 10 }); // 10 bytes
      app.post('/echo', ({ req, res }: HttpState) => res.json(req.body));

      const res = await request(app, 'POST', '/echo', { data: 'this is definitely more than 10 bytes' });
      assert.equal(res.status, 413);
      const body = await res.json() as any;
      assert.ok(body.error);
    });

    it('returns 400 for invalid JSON', async () => {
      const app = new App();
      app.post('/echo', ({ req, res }: HttpState) => res.json(req.body));

      const server = await app.listen(0);
      const port = (server.address() as any).port;
      const res = await fetch(`http://localhost:${port}/echo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-valid-json{{{',
      });
      await app.close();
      assert.equal(res.status, 400);
    });

    it('respects custom bodyLimit from App options', async () => {
      const app = new App({ bodyLimit: 1024 * 1024 * 5 }); // 5MB
      app.post('/echo', ({ req, res }: HttpState) => res.json({ ok: true }));

      const res = await request(app, 'POST', '/echo', { data: 'small' });
      assert.equal(res.status, 200);
    });
  });

  describe('pipeline halt on writableEnded', () => {
    it('stops executing steps after a step sends a response', async () => {
      const executed: string[] = [];
      const app = new App();

      const guard: PipelineNode = ({ res }: HttpState) => {
        executed.push('guard');
        res.status(401).json({ error: 'Unauthorized' });
      };
      const handler: PipelineNode = () => {
        executed.push('handler'); // must NOT run
      };

      app.get('/protected', guard, handler);

      const res = await request(app, 'GET', '/protected');
      assert.equal(res.status, 401);
      assert.deepEqual(executed, ['guard']);
    });

    it('stops outer dispatch after a nested pipeline sends a response', async () => {
      const executed: string[] = [];
      const app = new App();

      const sub = createPipeline<HttpState>()
        .addNode('respond', ({ res }: HttpState) => {
          executed.push('respond');
          res.status(401).json({ error: 'Unauthorized' });
        })
        .addNode('after', () => {
          executed.push('after');
        })
        .addEdge(START, 'respond')
        .addEdge('respond', 'after')
        .addEdge('after', END);

      const outer: PipelineNode = () => {
        executed.push('outer');
      };

      app.get('/nested-protected', sub, outer);

      const res = await request(app, 'GET', '/nested-protected');
      assert.equal(res.status, 401);
      assert.deepEqual(executed, ['respond']);
    });
  });
});
