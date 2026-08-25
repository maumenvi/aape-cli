import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { App, Router, type HttpState } from '../../src/index.ts';
import { defaultLogger } from '../../src/core/logger.ts';

describe('App', () => {
  describe('constructor & options', () => {
    it('creates an instance with no options', () => {
      assert(new App() instanceof App);
    });

    it('creates an instance with empty options', () => {
      assert(new App({}) instanceof App);
    });

    it('creates an instance with explicit options', () => {
      assert(new App({ logger: defaultLogger, parseBody: true }) instanceof App);
    });

    it('throws when parseBody is not a boolean', () => {
      assert.throws(
        () => new App({ parseBody: 'yes' as any }),
        /Expected a boolean/,
      );
    });

    it('accepts a custom bodyLimit', () => {
      assert(new App({ bodyLimit: 512 }) instanceof App);
    });
  });

  describe('route registration', () => {
    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;

    for (const method of methods) {
      it(`registers ${method.toUpperCase()} route`, () => {
        const app = new App();
        app[method]('/test', ({ res }: HttpState) => res.send('ok'));
        const m = app.router.match(method.toUpperCase(), '/test');
        assert(m);
        assert.equal(m.route.method, method.toUpperCase());
      });
    }

    it('registers a route with path param', () => {
      const app = new App();
      app.get('/users/:id', ({ res }: HttpState) => res.send('ok'));
      const m = app.router.match('GET', '/users/7');
      assert(m);
      assert.equal(m.params.id, '7');
    });

    it('backtracks from static branch to param branch when needed', () => {
      const app = new App();
      app.get('/users/new/edit', ({ res }: HttpState) => res.send('edit'));
      app.get('/users/:id', ({ res }: HttpState) => res.send('user'));

      const m = app.router.match('GET', '/users/new');
      assert(m);
      assert.equal(m.route.path, '/users/:id');
      assert.equal(m.params.id, 'new');
    });

    it('registers a route with query metadata', () => {
      const app = new App();
      app.get('/search?q=test', ({ res }: HttpState) => res.send('ok'));
      const m = app.router.match('GET', '/search');
      assert(m);
      assert.deepEqual(m.route.query, { q: 'test' });
    });
  });

  describe('use()', () => {
    it('mounts a sub-router under a prefix', () => {
      const child = new Router();
      child.get('/list', ({ res }: HttpState) => res.send('ok'));

      const app = new App();
      app.use('/items', child);

      assert(app.router.match('GET', '/items/list'));
    });

    it('adds a global pipeline node', () => {
      const app = new App();
      const node = (_s: HttpState) => {};
      app.use(node);
      assert.equal((app as any)['globalSteps'].length, 1);
    });

    it('allows multiple global nodes', () => {
      const app = new App();
      app.use((_s: HttpState) => {});
      app.use((_s: HttpState) => {});
      assert.equal((app as any)['globalSteps'].length, 2);
    });
  });

  describe('listen & close', () => {
    it('starts listening and returns a Server', async () => {
      const app = new App();
      const server = await app.listen(0);
      assert(server);
      await app.close();
    });

    it('responds to requests after listen', async () => {
      const app = new App();
      app.get('/ping', ({ res }: HttpState) => res.send('pong'));

      const server = await app.listen(0);
      const port = (server.address() as any).port;
      const res = await fetch(`http://localhost:${port}/ping`);
      assert.equal(await res.text(), 'pong');
      await app.close();
    });

    it('close() resolves even if never started', async () => {
      const app = new App();
      await assert.doesNotReject(() => app.close());
    });
  });
});
