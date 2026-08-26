import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { listSkillsCommand } from '../../src/cli/commands/list-skills.ts';

describe('CLI list-skills', () => {
  it('prints installed and discoverable skills clearly', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-list-skills-'));
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

      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await listSkillsCommand(['find'], { store });
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }

    const rendered = output.join('\n');
    assert.match(rendered, /Aape skill discovery/);
    assert.match(rendered, /Installed skills/);
    assert.match(rendered, /skill:find-skills@1\.0\.0 source=local/);
    assert.match(rendered, /aape list-skills <query>/);
  });
});
