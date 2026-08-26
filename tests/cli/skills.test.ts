import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { discoverSkillsFromStore, runSkillsCli } from '../../src/cli/commands/skills.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const SKILL_MARKDOWN = `---
name: find-skills
description: Finds external skills.
---

# Find Skills
`;

function skillsSearchResponse(): Response {
  return Response.json({
    skills: [{
      id: 'vercel-labs/skills/find-skills',
      name: 'find-skills',
      installs: 1200,
      source: 'vercel-labs/skills',
    }],
  });
}

describe('CLI skills', () => {
  it('discovers skills through the external skills.sh provider', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-skills-discover-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        assert.equal(String(input), 'https://skills.sh/api/search?q=find&limit=20');
        return skillsSearchResponse();
      };

      const results = await discoverSkillsFromStore(new AgentCatalogStore({ cwd: tempDir }), 'find');
      assert.deepEqual(results.map((result) => result.name), ['find-skills']);
      assert.equal(results[0]?.source, 'vercel-labs/skills');
      assert.equal(results[0]?.installs, 1200);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves the GitHub commit and installs without calling npx', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-skills-install-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/search?')) return skillsSearchResponse();
        if (url === 'https://api.github.com/repos/vercel-labs/skills') {
          return Response.json({ default_branch: 'main' });
        }
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        if (url === `https://raw.githubusercontent.com/vercel-labs/skills/${COMMIT}/skills/find-skills/SKILL.md`) {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      const spawnFn = () => {
        throw new Error('npx should not be used in aape skills');
      };
      const code = await runSkillsCli(['add', 'find-skills'], spawnFn, false, { store });

      assert.equal(code, 0);
      assert.ok(existsSync(path.resolve(tempDir, 'skills', 'find-skills', 'SKILL.md')));
      const lock = store.loadLock();
      assert.equal(lock?.sources['github:vercel-labs/skills']?.commit, COMMIT);
      assert.equal(lock?.sources['github:vercel-labs/skills']?.commitResolved, true);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
