import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { agentRegistry } from '../../src/agent/agents/registry.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { agentCommand } from '../../src/cli/commands/agent.ts';
import { initCommand, parseAgentSelection } from '../../src/cli/commands/init.ts';

describe('CLI agent/init', () => {
  it('parses multi-agent selections from interactive input', () => {
    assert.deepEqual(parseAgentSelection('1, 4, vscode'), ['claude', 'zed', 'copilot']);
  });

  it('keeps every supported agent on local project paths', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-local-agent-'));

    try {
      for (const agent of agentRegistry) {
        const [configPath] = agent.configPaths(tempDir);
        assert.ok(configPath.startsWith(tempDir), `${agent.id} should resolve to a project-local path`);
        assert.ok(!configPath.startsWith(path.join(os.homedir(), '.config')));
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('skips global agent config injection in local-only mode', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-agent-add-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'aape-agent-home-'));
    const originalCwd = process.cwd();
    const originalHome = process.env.HOME;

    try {
      process.chdir(tempDir);
      process.env.HOME = tempHome;

      await agentCommand(['claude', 'vscode'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      const claudeConfig = path.resolve(tempHome, '.config', 'claude', 'claude_desktop_config.json');
      const copilotConfig = path.resolve(tempHome, '.config', 'Code', 'User', 'mcp.json');

      assert.ok(!existsSync(claudeConfig));
      assert.ok(!existsSync(copilotConfig));
    } finally {
      process.chdir(originalCwd);
      process.env.HOME = originalHome;
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('initializes workspace folders and keeps agent guidance local', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-init-agent-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'aape-init-home-'));
    const originalCwd = process.cwd();
    const originalHome = process.env.HOME;

    try {
      process.chdir(tempDir);
      process.env.HOME = tempHome;

      await initCommand(['claude,copilot', 'zed'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      assert.ok(existsSync(path.resolve(tempDir, 'source.lock')));
      assert.ok(existsSync(path.resolve(tempDir, 'AGENTS.md')));
      assert.match(readFileSync(path.resolve(tempDir, 'AGENTS.md'), 'utf8'), /list-capabilities --json/);

      const claudeConfig = path.resolve(tempHome, '.config', 'claude', 'claude_desktop_config.json');
      const copilotConfig = path.resolve(tempHome, '.config', 'Code', 'User', 'mcp.json');
      const zedConfig = path.resolve(tempHome, '.config', 'zed', 'settings.json');

      assert.ok(!existsSync(claudeConfig));
      assert.ok(!existsSync(copilotConfig));
      assert.ok(!existsSync(zedConfig));
      assert.ok(existsSync(path.resolve(tempDir, 'AGENTS.md')));
      assert.ok(!existsSync(path.resolve(tempDir, 'skills')));
      assert.ok(!existsSync(path.resolve(tempDir, 'mcps')));
      assert.ok(!existsSync(path.resolve(tempDir, 'tools')));
    } finally {
      process.chdir(originalCwd);
      process.env.HOME = originalHome;
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('creates Codex config on init when Codex is selected', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-codex-init-'));
    const originalCwd = process.cwd();

    try {
      process.chdir(tempDir);

      await initCommand(['codex'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      assert.ok(existsSync(path.resolve(tempDir, '.codex')));
      assert.ok(existsSync(path.resolve(tempDir, '.codex', 'config.toml')));
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not write Codex global TOML in local-only mode', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-codex-agent-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'aape-codex-home-'));
    const originalCwd = process.cwd();
    const originalHome = process.env.HOME;

    try {
      process.chdir(tempDir);
      process.env.HOME = tempHome;

      const existing = path.resolve(tempHome, '.codex', 'config.toml');
      mkdirSync(path.dirname(existing), { recursive: true });
      writeFileSync(existing, '[mcp_servers]\nexisting = { command = "old", args = ["x"] }\n', 'utf8');

      await agentCommand(['codex'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      assert.ok(existsSync(existing));
      const contents = readFileSync(existing, 'utf8');
      assert.match(contents, /existing = \{ command = "old", args = \["x"\] \}/);
      assert.doesNotMatch(contents, /aape\s*=\s*\{/);
    } finally {
      process.chdir(originalCwd);
      process.env.HOME = originalHome;
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });
});
