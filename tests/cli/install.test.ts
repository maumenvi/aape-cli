import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { installCommand } from '../../src/cli/commands/install.ts';
import { removeCommand } from '../../src/cli/commands/remove.ts';

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
      await installCommand(['skill', 'repo_overview'], { store });

      assert.ok(existsSync(path.resolve(tempDir, 'sources')));
      assert.ok(existsSync(path.resolve(tempDir, 'skills')));
      assert.ok(existsSync(path.resolve(tempDir, 'source.lock')));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('materializes skills locally and syncs MCPs into .vscode/mcp.json', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-cli-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await installCommand(['skill', 'repo_overview'], { store });
      await installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store });

      const lock = store.loadLock();
      assert.ok(lock);

      const skillPackage = lock?.packages['skill:repo_overview'];
      assert.ok(skillPackage);
      assert.match(skillPackage?.path ?? '', /^skills\/repo_overview\.(ts|js)$/);
      assert.ok(existsSync(path.resolve(tempDir, skillPackage?.path ?? '')));
      assert.ok(readFileSync(path.resolve(tempDir, skillPackage?.path ?? ''), 'utf8').includes('export const skill'));

      const vscodeMcpFile = path.resolve(tempDir, '.vscode', 'mcp.json');
      assert.ok(existsSync(vscodeMcpFile));
      assert.ok(readFileSync(vscodeMcpFile, 'utf8').includes('"github"'));

      await removeCommand(['skill', 'repo_overview'], { store });
      assert.ok(!existsSync(path.resolve(tempDir, skillPackage?.path ?? '')));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
