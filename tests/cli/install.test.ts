import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { installCommand } from '../../src/cli/commands/install.ts';
import { removeCommand } from '../../src/cli/commands/remove.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const SKILL_MARKDOWN = `---
name: find-skills
description: Finds external skills.
---

# Find Skills
`;

describe('CLI install/remove', () => {
  it('bootstraps source.lock when called without a dependency type', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-bootstrap-'));
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
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-fresh-'));
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
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-cli-'));
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
});
