import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { ciCommand } from '../../src/cli/commands/ci.ts';
import { installCommand } from '../../src/cli/commands/install.ts';

describe('CLI ci', () => {
  it('reinstalls skills and syncs MCP config from source.lock', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-ci-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await installCommand(['skill', 'repo_overview'], { store });
      await installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const skillPath = path.resolve(tempDir, lock?.packages['skill:repo_overview'].path ?? '');
      const vscodeMcpPath = path.resolve(tempDir, '.vscode', 'mcp.json');

      rmSync(skillPath, { force: true });
      rmSync(vscodeMcpPath, { force: true });

      await ciCommand([], { store });

      assert.ok(existsSync(skillPath));
      assert.ok(readFileSync(skillPath, 'utf8').includes('export const skill'));
      assert.ok(existsSync(vscodeMcpPath));
      assert.ok(readFileSync(vscodeMcpPath, 'utf8').includes('"github"'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
