import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { ciCommand } from '../../src/cli/commands/ci.ts';
import { installCommand } from '../../src/cli/commands/install.ts';

const SKILL_MARKDOWN = `---
name: find-skills
description: Finds external skills.
---

# Find Skills
`;

describe('CLI ci', () => {
  it('reinstalls skills and syncs MCP config from source.lock', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-ci-'));
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
        throw new Error(`Unexpected request: ${url}`);
      };

      await installCommand(['skill', 'find-skills', '--source', 'skillsHub'], { store });
      await installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const skillPackage = lock?.packages['skill:find-skills'];
      assert.ok(skillPackage);
      const skillPath = path.resolve(tempDir, skillPackage?.path ?? '');
      const vscodeMcpPath = path.resolve(tempDir, '.vscode', 'mcp.json');

      rmSync(skillPath, { force: true });
      rmSync(vscodeMcpPath, { force: true });

      await ciCommand([], { store });

      assert.ok(existsSync(skillPath));
      assert.ok(readFileSync(skillPath, 'utf8').includes('# Find Skills'));
      assert.ok(existsSync(vscodeMcpPath));
      assert.ok(readFileSync(vscodeMcpPath, 'utf8').includes('"github"'));
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
