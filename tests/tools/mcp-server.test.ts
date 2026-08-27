import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { McpStdioServer } from '../../src/agent/mcp/server/index.ts';
import type { JsonRpcRequest, JsonRpcResponse } from '../../src/agent/mcp/runtime/protocol/json-rpc.ts';

async function invoke(server: McpStdioServer, request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const handle = Reflect.get(server as object, 'handle') as (req: JsonRpcRequest) => Promise<JsonRpcResponse | null>;
  return handle.call(server, request);
}

describe('McpStdioServer', () => {
  it('initializes, lists proxied MCP tools, and calls them', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-server-'));
    const fixturePath = fileURLToPath(new URL('../fixtures/mcp/mock-stdio-server.mjs', import.meta.url));

    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('mcp', 'mock', {
        version: '*',
        source: 'local',
        enabled: true,
        capabilities: [],
        constraints: [],
        allowedLlms: ['*'],
        vscode: {
          command: 'node',
          args: [fixturePath],
          env: {},
        },
      });
      store.buildLock();

      const server = new McpStdioServer(store, { dynamicDiscovery: true, version: '1.5.2-test' });

      const initialize = await invoke(server, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
      assert.ok(initialize && 'result' in initialize);
      if (!initialize || !('result' in initialize)) {
        throw new Error('Expected initialize result');
      }
      assert.equal((initialize.result as { protocolVersion?: string }).protocolVersion, '2025-06-18');

      const legacyInitialize = await invoke(server, {
        jsonrpc: '2.0',
        id: 2,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05' },
      });
      assert.ok(legacyInitialize && 'result' in legacyInitialize);
      if (!legacyInitialize || !('result' in legacyInitialize)) {
        throw new Error('Expected initialize result for legacy negotiation');
      }
      assert.equal((legacyInitialize.result as { protocolVersion?: string }).protocolVersion, '2024-11-05');

      const toolsList = await invoke(server, { jsonrpc: '2.0', id: 3, method: 'tools/list' });
      assert.ok(toolsList && 'result' in toolsList);
      if (!toolsList || !('result' in toolsList)) {
        throw new Error('Expected tools/list result');
      }
      assert.equal(Array.isArray((toolsList.result as { tools: unknown[] }).tools), true);
      assert.equal((toolsList.result as { tools: Array<{ name: string }> }).tools[0]?.name, 'mock__echo');

      const toolCall = await invoke(server, {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'mock__echo', arguments: { text: 'hello' } },
      });
      assert.ok(toolCall && 'result' in toolCall);
      if (!toolCall || !('result' in toolCall)) {
        throw new Error('Expected tools/call result');
      }
      assert.equal((toolCall.result as { content?: Array<{ text?: string }> }).content?.[0]?.text, 'hello');

      const unknown = await invoke(server, { jsonrpc: '2.0', id: 5, method: 'unknown' });
      assert.ok(unknown && 'error' in unknown);
      if (!unknown || !('error' in unknown)) {
        throw new Error('Expected error for unknown method');
      }
      assert.equal(unknown.error.code, -32601);

      await invoke(server, { jsonrpc: '2.0', id: 6, method: 'shutdown' });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
