import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { installCommand } from '../../src/cli/commands/install.ts';
import { discoverMcpsFromStore } from '../../src/cli/commands/mcp.ts';
import { installCatalogResult } from '../../src/cli/install/external.ts';

function registryResponse(): Response {
  return Response.json({
    servers: [{
      server: {
        name: 'io.github.example/filesystem',
        title: 'Filesystem',
        description: 'Secure filesystem operations.',
        version: '1.2.3',
        repository: { url: 'https://github.com/example/filesystem' },
        packages: [{
          registryType: 'npm',
          identifier: '@example/mcp-filesystem',
          version: '1.2.3',
          transport: { type: 'stdio' },
          runtimeArguments: [{ type: 'positional', value: '-y' }],
          environmentVariables: [
            { name: 'WORKSPACE_ROOT', isRequired: true },
            { name: 'API_KEY', description: 'API key from Example dashboard', isRequired: true, isSecret: true },
          ],
        }],
      },
    }],
  });
}

describe('MCP Registry provider', () => {
  it('normalizes and installs an npm MCP into the VS Code configuration', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-mcp-registry-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          'https://registry.modelcontextprotocol.io/v0.1/servers?search=filesystem&version=latest&limit=20',
        );
        return registryResponse();
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      const results = await discoverMcpsFromStore(store, 'filesystem');
      assert.equal(results.length, 1);
      assert.equal(results[0]?.version, '1.2.3');
      assert.deepEqual(results[0]?.credentials, [{
        name: 'API_KEY',
        envName: 'API_KEY',
        description: 'API key from Example dashboard',
        sourceUrl: 'https://github.com/example/filesystem',
      }]);

      await installCatalogResult(store, results[0]);

      const lock = store.loadLock();
      const installed = lock?.packages['mcp:io.github.example/filesystem'];
      assert.equal(installed?.source, 'mcp');
      assert.equal(installed?.vscode?.transport, 'npx');
      assert.equal(lock?.sources.mcp?.type, 'registry');

      const vscodeFile = path.resolve(tempDir, '.vscode', 'mcp.json');
      assert.ok(existsSync(vscodeFile));
      const envFile = path.resolve(tempDir, '.env');
      assert.ok(existsSync(envFile));
      assert.match(readFileSync(envFile, 'utf8'), /API_KEY=""/);
      const vscode = JSON.parse(readFileSync(vscodeFile, 'utf8')) as {
        servers: Record<string, { args: string[]; env: Record<string, string> }>;
      };
      assert.deepEqual(vscode.servers['io.github.example/filesystem']?.args, [
        '-y',
        '@example/mcp-filesystem@1.2.3',
      ]);
      assert.equal(
        vscode.servers['io.github.example/filesystem']?.env.WORKSPACE_ROOT,
        '${env:WORKSPACE_ROOT}',
      );
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('uses external discovery from the npm-style install command', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-mcp-install-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          'https://registry.modelcontextprotocol.io/v0.1/servers?search=filesystem&version=latest&limit=10',
        );
        return registryResponse();
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      await installCommand(['mcp', 'filesystem'], { store });

      assert.ok(store.loadLock()?.packages['mcp:io.github.example/filesystem']);
      assert.ok(existsSync(path.resolve(tempDir, '.vscode', 'mcp.json')));
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
