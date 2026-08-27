import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';

describe('AgentCatalogStore', () => {
  it('creates sources and source.lock from dependencies', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-catalog-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('skill', 'repo_overview', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
        allowedLlms: ['model-x'],
      });
      store.addDependency('tool', 'read_file', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
      });
      store.addDependency('mcp', 'github', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
        vscode: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: {
            GITHUB_TOKEN: '${env:GITHUB_TOKEN}',
          },
        },
      });

      const lock = store.buildLock();
      assert.equal(lock.lockfileVersion, 1);
      assert.ok(lock.packages['skill:repo_overview']);
      assert.ok(lock.packages['tool:read_file']);
      assert.ok(lock.packages['mcp:github']);
      assert.deepEqual(lock.packages['skill:repo_overview'].allowedLlms, ['model-x']);
      assert.deepEqual(store.verifyLock(lock), { ok: true });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('builds dev and llm context files and syncs vscode mcp config', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-context-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('mcp', 'filesystem', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
        vscode: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem'],
          env: {},
        },
      });
      store.buildLock();
      store.buildContexts();

      const paths = store.getPaths();
      assert.ok(existsSync(paths.contextDev));
      assert.ok(existsSync(paths.contextLlm));

      const syncResult = store.syncVsCodeMcp();
      assert.ok(existsSync(syncResult.file));
      const content = JSON.parse(readFileSync(syncResult.file, 'utf8')) as {
        servers: Record<string, Record<string, unknown>>;
      };
      assert.ok(content.servers.filesystem);
      assert.equal(content.servers.filesystem.command, 'npx');
      assert.deepEqual(content.servers.filesystem.args, ['-y', '@modelcontextprotocol/server-filesystem']);
      assert.equal(Object.prototype.hasOwnProperty.call(content.servers.filesystem, 'transport'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(content.servers.filesystem, 'package'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(content.servers.filesystem, 'npxArgs'), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('applies deny-by-default policy for resources without allowedLlms', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-access-default-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.setLlmAccessDefault('deny');
      store.addDependency('tool', 'read_file', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
      });

      const lock = store.buildLock();
      assert.equal(store.getLlmAccessDefault(), 'deny');
      assert.deepEqual(lock.packages['tool:read_file'].allowedLlms, []);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
