import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { installCommand } from '../../src/cli/commands/install.ts';
import { discoverMcpsFromStore } from '../../src/cli/commands/mcp.ts';
import { installCatalogResult } from '../../src/cli/install/external.ts';
import { ensureProjectDotEnv, loadDotEnvFromCurrentProject } from '../../src/config/index.ts';

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
        remotes: [{
          type: 'sse',
          url: 'https://example.com/mcp',
          headers: [
            { name: 'AUTHORIZATION', description: 'Bearer token for Example', isRequired: true, isSecret: true },
          ],
        }],
      },
    }],
  });
}

describe('MCP Registry provider', () => {
  it('normalizes and installs an npm MCP into the VS Code configuration', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-registry-'));
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
        envName: 'FILESYSTEM_API_KEY',
        description: 'API key from Example dashboard',
        sourceUrl: 'https://github.com/example/filesystem',
      }, {
        name: 'AUTHORIZATION',
        envName: 'FILESYSTEM_AUTHORIZATION',
        description: 'Bearer token for Example',
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
      const envFile = path.resolve(tempDir, '.env.maia');
      assert.ok(existsSync(envFile));
      const envContent = readFileSync(envFile, 'utf8');
      assert.match(envContent, /FILESYSTEM_API_KEY=""/);
      assert.match(envContent, /FILESYSTEM_AUTHORIZATION=""/);
      assert.doesNotMatch(envContent, /^AUTHORIZATION=""/m);
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

  it('does not create .env.maia while loading project env (e.g. MCP connect)', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-dotenv-bootstrap-'));
    const originalCwd = process.cwd();

    try {
      process.chdir(tempDir);
      const envFile = path.resolve(tempDir, '.env.maia');
      assert.ok(!existsSync(envFile));
      assert.ok(!existsSync(path.resolve(tempDir, '.env')));

      loadDotEnvFromCurrentProject();

      assert.ok(!existsSync(envFile), '.env.maia must not be auto-created on load');
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates a blank .env.maia template only via ensureProjectDotEnv', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-dotenv-ensure-'));

    try {
      const envFile = path.resolve(tempDir, '.env.maia');
      assert.ok(!existsSync(envFile));

      ensureProjectDotEnv(envFile);

      assert.ok(existsSync(envFile));
      assert.equal(readFileSync(envFile, 'utf8'), '\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps custom entries and removes legacy autogenerated defaults', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-dotenv-merge-'));
    const envFile = path.resolve(tempDir, '.env.maia');
    writeFileSync(
      envFile,
      [
        'SKILLS_REGISTRY_URL=https://skills.sh',
        'NODE_ENV=development',
        'CUSTOM_VALUE=ok',
        'RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION="secret"',
      ].join('\n'),
      'utf8',
    );

    ensureProjectDotEnv(envFile);
    const { ensureLockMcpEnvFileEntries } = await import('../../src/cli/install/mcp-credentials.ts');
    const store = new AgentCatalogStore({ cwd: tempDir });
    ensureLockMcpEnvFileEntries(store, {
      name: 'fixture',
      lockfileVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: {},
      packages: {},
    });

    const content = readFileSync(envFile, 'utf8');
    assert.doesNotMatch(content, /^SKILLS_REGISTRY_URL=https:\/\/skills\.sh$/m);
    assert.doesNotMatch(content, /^NODE_ENV=development$/m);
    assert.match(content, /^CUSTOM_VALUE=ok$/m);
    assert.match(content, /^RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION="secret"$/m);
  });

  it('persists referenced env placeholders from any installed MCP config', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-env-bootstrap-'));
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      const config = {
        transport: 'http' as const,
        url: 'https://server.smithery.ai/@renCosta2025/context7fork/mcp',
        headers: {
          Authorization: '${env:RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION}',
          'X-Project': '${env:PROJECT_NAME}',
        },
      };

      const envFile = path.resolve(tempDir, '.env.maia');
      assert.ok(!existsSync(envFile));
      assert.ok(!existsSync(path.resolve(tempDir, '.env')));

      store.addSource('mcp', {
        type: 'registry',
        url: 'https://registry.modelcontextprotocol.io',
        ref: 'v0.1',
        trusted: true,
      });
      const { installMcp } = await import('../../src/cli/install/mcp.ts');
      installMcp(store, 'context7fork', 'mcp', '1.0.0', ['*'], config);

      assert.ok(existsSync(envFile));
      const content = readFileSync(envFile, 'utf8');
      assert.match(content, /^RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION=""/m);
      assert.match(content, /^PROJECT_NAME=""/m);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('uses external discovery from the npm-style install command', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-install-'));
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

  it('normalizes Smithery-style bare placeholders in remote headers', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-bare-placeholder-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => Response.json({
        servers: [{
          server: {
            name: 'ai.smithery/renCosta2025-context7fork',
            title: 'Context7',
            description: 'Context7 remote MCP',
            version: '1.0.0',
            repository: { url: 'https://example.com/context7' },
            remotes: [{
              type: 'streamable-http',
              url: 'https://server.smithery.ai/@renCosta2025/context7fork/mcp',
              headers: [{
                name: 'Authorization',
                value: 'Bearer {smithery_api_key}',
                description: 'Smithery API key',
                isRequired: true,
                isSecret: true,
              }],
            }],
          },
        }],
      });

      const store = new AgentCatalogStore({ cwd: tempDir });
      const results = await discoverMcpsFromStore(store, 'context7');
      assert.equal(results.length, 1);
      assert.deepEqual(results[0]?.credentials, [{
        name: 'Authorization',
        envName: 'RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION',
        description: 'Smithery API key',
        sourceUrl: 'https://example.com/context7',
      }]);
      const install = results[0]?.install as { type: 'mcp'; vscode: { transport: string; headers?: Record<string, string> } };
      assert.equal(install.vscode.transport, 'http');
      assert.equal(install.vscode.headers?.Authorization, 'Bearer ${env:RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION}');
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
