import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';
import { ciCommand } from '../../src/cli/commands/ci.ts';
import { installCommand } from '../../src/cli/commands/install/install-command.ts';

const SKILL_MARKDOWN = `---
name: find-skills
description: Finds external skills.
---

# Find Skills
`;
const COMMIT = '0123456789abcdef0123456789abcdef01234567';

describe('CLI ci', () => {
  it('reinstalls skills and syncs MCP config from maia.lock.json', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-'));
    const originalFetch = globalThis.fetch;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.saveSelectedAgents(['copilot']);
      store.addSource('skillsHub', {
        type: 'git',
        url: 'https://github.com/vercel-labs/skills',
        ref: 'main',
        trusted: true,
      });

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        if (url === 'https://raw.githubusercontent.com/vercel-labs/skills/main/skills/find-skills/SKILL.md') {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        if (/^https:\/\/raw\.githubusercontent\.com\/vercel-labs\/skills\/[0-9a-f]{40}\/skills\/find-skills\/SKILL\.md$/i.test(url)) {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      await installCommand(['skill', 'find-skills', '--source', 'skillsHub'], { store });
      await installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const skillPackage = lock?.packages['skill:find-skills'];
      assert.ok(skillPackage);
      const skillPath = path.resolve(tempDir, '.maia', skillPackage?.path ?? '');
      const vscodeMcpPath = path.resolve(tempDir, '.vscode', 'mcp.json');
      const profilePath = path.resolve(tempDir, '.maia', 'agents', 'copilot', 'capabilities.json');

      rmSync(skillPath, { force: true });
      rmSync(vscodeMcpPath, { force: true });
      rmSync(profilePath, { force: true });

      await ciCommand([], { store });

      assert.ok(existsSync(skillPath));
      assert.ok(readFileSync(skillPath, 'utf8').includes('# Find Skills'));
      assert.ok(existsSync(vscodeMcpPath));
      assert.match(readFileSync(vscodeMcpPath, 'utf8'), /--agent/);
      assert.match(readFileSync(profilePath, 'utf8'), /"github"/);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rebuilds .maia/mcp.env from MCP placeholders during ci', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-env-'));
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

      const envFile = path.resolve(tempDir, '.maia', 'mcp.env');
      writeFileSync(envFile, 'SKILLS_REGISTRY_URL=https://skills.sh\nNODE_ENV=development\n', 'utf8');

      await ciCommand([], { store });

      const content = readFileSync(envFile, 'utf8');
      assert.match(content, /^RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION=""/m);
      assert.doesNotMatch(content, /^SKILLS_REGISTRY_URL=https:\/\/skills\.sh$/m);
      assert.doesNotMatch(content, /^NODE_ENV=development$/m);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('validates lock integrity before overwriting a materialized file', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-integrity-order-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const pkg = lock.packages['tool:read_file'];
      assert.ok(pkg);
      pkg.path = 'tools/sentinel.ts';
      store.saveLock(lock);

      const sentinelPath = path.resolve(tempDir, '.maia', 'tools', 'sentinel.ts');
      writeFileSync(sentinelPath, 'do not overwrite\n', 'utf8');

      await assert.rejects(() => ciCommand([], { store }), /Integrity mismatch for tool:read_file/);
      assert.equal(readFileSync(sentinelPath, 'utf8'), 'do not overwrite\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects a changed artifact before reinstalling over it', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-artifact-order-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const pkg = lock.packages['tool:read_file'];
      assert.ok(pkg?.artifactHash);
      const toolPath = path.resolve(tempDir, '.maia', pkg.path);
      writeFileSync(toolPath, 'tampered artifact\n', 'utf8');

      await assert.rejects(() => ciCommand([], { store }), /Artifact hash mismatch for tool:read_file/);
      assert.equal(readFileSync(toolPath, 'utf8'), 'tampered artifact\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('validates locked source metadata before materialization', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-source-order-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      lock.sources.local.url = 'https://example.invalid/tampered.git';
      store.saveLock(lock);

      const toolPath = path.resolve(tempDir, '.maia', lock.packages['tool:read_file'].path);
      writeFileSync(toolPath, 'do not overwrite\n', 'utf8');

      await assert.rejects(() => ciCommand([], { store }), /Source metadata mismatch for tool:read_file/);
      assert.equal(readFileSync(toolPath, 'utf8'), 'do not overwrite\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
