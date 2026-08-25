import { createServer } from 'node:http';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDashboardHandler } from '../src/dashboard/handler.ts';

type HttpHandler = (req: IncomingMessage, res: ServerResponse) => void;

function start(handler: HttpHandler) {
  const server = createServer(handler);
  return new Promise<{ server: ReturnType<typeof createServer>; baseUrl: string }>((resolve) => {
    server.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('createDashboardHandler', () => {
  it('serves html for /devtools', async () => {
    const handler = createDashboardHandler({
      sseHandler: (_req, res) => { res.end('sse'); },
      getSnapshot: () => ({ enabled: true, events: [] }),
      setEnabled: () => {},
      clear: () => {},
    });

    const { server, baseUrl } = await start((req: IncomingMessage, res: ServerResponse) => handler(req, res));
    const res = await fetch(`${baseUrl}/devtools`);
    const text = await res.text();
    server.close();

    assert.equal(res.status, 200);
    assert.match(text, /aape-devtools/i);
  });

  it('serves transpiled tsx modules', async () => {
    const handler = createDashboardHandler({
      sseHandler: (_req, res) => { res.end('sse'); },
      getSnapshot: () => ({ enabled: true, events: [] }),
      setEnabled: () => {},
      clear: () => {},
    });

    const { server, baseUrl } = await start((req: IncomingMessage, res: ServerResponse) => handler(req, res));
    const res = await fetch(`${baseUrl}/devtools/modules/main.tsx`);
    const text = await res.text();
    server.close();

    assert.equal(res.status, 200);
    assert.match(text, /createRoot/);
  });

  it('handles timeline, enabled and clear endpoints', async () => {
    let enabled = true;
    let cleared = false;
    const handler = createDashboardHandler({
      sseHandler: (_req, res) => { res.end('sse'); },
      getSnapshot: () => ({ enabled, events: [] }),
      setEnabled: (value) => { enabled = value; },
      clear: () => { cleared = true; },
    });

    const { server, baseUrl } = await start((req: IncomingMessage, res: ServerResponse) => handler(req, res));

    const timelineRes = await fetch(`${baseUrl}/devtools/timeline`);
    assert.equal(timelineRes.status, 200);
    assert.deepEqual(await timelineRes.json(), { enabled: true, events: [] });

    const enabledRes = await fetch(`${baseUrl}/devtools/enabled?value=false`, { method: 'POST' });
    assert.equal(enabledRes.status, 200);
    assert.deepEqual(await enabledRes.json(), { enabled: false });

    const clearRes = await fetch(`${baseUrl}/devtools/clear`, { method: 'POST' });
    assert.equal(clearRes.status, 204);
    assert.equal(cleared, true);

    server.close();
  });
});
