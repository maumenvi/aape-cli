import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { listSkillsCommand } from '../../src/cli/commands/list-skills.ts';

describe('CLI list-skills', () => {
  it('prints installed and discoverable skills clearly', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-skills-'));
    const output: string[] = [];
    const originalLog = console.log;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('skill', 'find-skills', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
      });
      store.buildLock();

      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await listSkillsCommand(['find'], { store });
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }

    const rendered = output.join('\n');
    assert.match(rendered, /Maia skill discovery/);
    assert.match(rendered, /Installed skills/);
    assert.match(rendered, /skill:find-skills@1\.0\.0 source=local/);
    assert.match(rendered, /maia list-skills <query>/);
  });

  it('does not create source.lock when only reading skill discovery data', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-skills-readonly-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await listSkillsCommand([], { store });

      assert.equal(existsSync(path.resolve(tempDir, 'source.lock')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.env.maia')), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
