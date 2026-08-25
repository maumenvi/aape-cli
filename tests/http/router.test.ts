import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../../src/index.ts';
import type { HttpState } from '../../src/index.ts';

const noop = (_s: HttpState) => {};

describe('Router', () => {
  describe('match — static routes', () => {
    it('matches a simple path', () => {
      const r = new Router();
      r.get('/hello', noop);
      const m = r.match('GET', '/hello');
      assert(m);
      assert.equal(m.route.path, '/hello');
      assert.equal(m.route.method, 'GET');
    });

    it('returns null for unknown path', () => {
      const r = new Router();
      r.get('/hello', noop);
      assert.equal(r.match('GET', '/world'), null);
    });

    it('returns null for wrong method', () => {
      const r = new Router();
      r.get('/hello', noop);
      assert.equal(r.match('POST', '/hello'), null);
    });

    it('matches root path', () => {
      const r = new Router();
      r.get('/', noop);
      assert(r.match('GET', '/'));
    });
  });

  describe('match — HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
    for (const method of methods) {
      it(`registers and matches ${method}`, () => {
        const r = new Router();
        r[method.toLowerCase() as Lowercase<typeof method>]('/test', noop);
        const m = r.match(method, '/test');
        assert(m);
        assert.equal(m.route.method, method);
      });
    }
  });

  describe('match — path params', () => {
    it('captures a single param', () => {
      const r = new Router();
      r.get('/users/:id', noop);
      const m = r.match('GET', '/users/42');
      assert(m);
      assert.equal(m.params.id, '42');
    });

    it('captures multiple params', () => {
      const r = new Router();
      r.get('/orgs/:org/repos/:repo', noop);
      const m = r.match('GET', '/orgs/aape/repos/core');
      assert(m);
      assert.equal(m.params.org, 'aape');
      assert.equal(m.params.repo, 'core');
    });

    it('returns null if param segment is missing', () => {
      const r = new Router();
      r.get('/users/:id', noop);
      assert.equal(r.match('GET', '/users'), null);
    });
  });

  describe('match — query string', () => {
    it('stores query from route registration', () => {
      const r = new Router();
      r.get('/search?q=aape&page=1', noop);
      const m = r.match('GET', '/search');
      assert(m);
      assert.deepEqual(m.route.query, { q: 'aape', page: '1' });
    });

    it('path without query still matches', () => {
      const r = new Router();
      r.get('/search', noop);
      const m = r.match('GET', '/search');
      assert(m);
      assert.deepEqual(m.route.query, {});
    });
  });

  describe('use — sub-router mounting', () => {
    it('mounts sub-router under a prefix', () => {
      const child = new Router();
      child.get('/list', noop);
      child.post('/create', noop);

      const parent = new Router();
      parent.use('/items', child);

      assert(parent.match('GET', '/items/list'));
      assert(parent.match('POST', '/items/create'));
    });

    it('does not expose unprefixed routes', () => {
      const child = new Router();
      child.get('/list', noop);

      const parent = new Router();
      parent.use('/items', child);

      assert.equal(parent.match('GET', '/list'), null);
    });

    it('mounts sub-router with param routes', () => {
      const child = new Router();
      child.get('/:id', noop);

      const parent = new Router();
      parent.use('/users', child);

      const m = parent.match('GET', '/users/99');
      assert(m);
      assert.equal(m.params.id, '99');
    });
  });

  describe('multiple routes on same prefix', () => {
    it('differentiates routes by method on the same path', () => {
      const r = new Router();
      r.get('/resource', noop);
      r.post('/resource', noop);

      assert.equal(r.match('GET', '/resource')?.route.method, 'GET');
      assert.equal(r.match('POST', '/resource')?.route.method, 'POST');
    });
  });
});
