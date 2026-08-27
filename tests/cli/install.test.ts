import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { installCommand } from '../../src/cli/commands/install.ts';
import { removeCommand } from '../../src/cli/commands/remove.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const cliEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/cli/index.ts');
const SKILL_MARKDOWN = `---
name: find-skills
description: Finds external skills.
---

# Find Skills
`;

describe('CLI install/remove', () => {
  it('bootstraps source.lock when called without a dependency type', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-bootstrap-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await installCommand([], { store });

      assert.ok(existsSync(path.resolve(tempDir, 'source.lock')));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates source.lock and bootstraps the workspace on a fresh install', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-fresh-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      await installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store });

      assert.ok(existsSync(path.resolve(tempDir, 'sources')));
      assert.ok(existsSync(path.resolve(tempDir, 'source.lock')));
      assert.ok(!existsSync(path.resolve(tempDir, 'skills')));
      assert.ok(!existsSync(path.resolve(tempDir, 'mcps')));
      assert.ok(!existsSync(path.resolve(tempDir, 'tools')));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('materializes remote skills deterministically and syncs MCPs into .vscode/mcp.json', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-cli-'));
    const originalFetch = globalThis.fetch;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addSource('skillsHub', {
        type: 'git',
        url: 'https://github.com/vercel-labs/skills',
        ref: 'main',
        trusted: true,
      });

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === 'https://raw.githubusercontent.com/vercel-labs/skills/main/skills/find-skills/SKILL.md') {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      await installCommand(['skill', 'find-skills', '--source', 'skillsHub'], { store });
      await installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store });

      const lock = store.loadLock();
      assert.ok(lock);

      const skillPackage = lock?.packages['skill:find-skills'];
      assert.ok(skillPackage);
      assert.equal(skillPackage?.path, 'skills/find-skills/SKILL.md');
      assert.ok(existsSync(path.resolve(tempDir, skillPackage?.path ?? '')));
      assert.ok(readFileSync(path.resolve(tempDir, skillPackage?.path ?? ''), 'utf8').includes('# Find Skills'));

      const vscodeMcpFile = path.resolve(tempDir, '.vscode', 'mcp.json');
      assert.ok(existsSync(vscodeMcpFile));
      assert.ok(readFileSync(vscodeMcpFile, 'utf8').includes('"github"'));

      await removeCommand(['skill', 'find-skills'], { store });
      assert.ok(!existsSync(path.resolve(tempDir, skillPackage?.path ?? '')));
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('supports the i alias with the same .env.maia rebuild behavior', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-install-alias-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      await installCommand([
        'mcp',
        'context7fork',
        '--transport',
        'http',
        '--url',
        'https://server.smithery.ai/@renCosta2025/context7fork/mcp',
        '--headers',
        JSON.stringify({
          Authorization: '${env:RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION}',
        }),
      ], { store });

      const envFile = path.resolve(tempDir, '.env.maia');
      writeFileSync(envFile, 'SKILLS_REGISTRY_URL=https://skills.sh\nNODE_ENV=development\n', 'utf8');

      const result = spawnSync(process.execPath, [cliEntry, 'i'], {
        cwd: tempDir,
        encoding: 'utf8',
        env: process.env,
      });

      assert.equal(result.status, 0, result.stderr);

      const content = readFileSync(envFile, 'utf8');
      assert.match(content, /^RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION=""/m);
      assert.doesNotMatch(content, /^SKILLS_REGISTRY_URL=https:\/\/skills\.sh$/m);
      assert.doesNotMatch(content, /^NODE_ENV=development$/m);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('refuses tool installs that have no local registry entry', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-tool-install-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });

      await assert.rejects(
        () => installCommand(['tool', 'demo'], { store }),
        /Tool "demo" is not available in the local registry/,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('installs and executes the built-in read_file tool', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-tool-read-file-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      const targetFile = path.resolve(tempDir, 'sample.txt');
      writeFileSync(targetFile, 'hello tool\n', 'utf8');

      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock?.packages['tool:read_file']);

      const runtime = await store.loadRuntimeModule('tool', 'read_file');
      assert.ok(runtime && typeof runtime === 'object' && 'tool' in runtime);
      const tool = (runtime as { tool: { execute(input: unknown): Promise<unknown> } }).tool;
      const result = await tool.execute({ path: targetFile });
      assert.equal((result as { content?: string }).content, 'hello tool\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
