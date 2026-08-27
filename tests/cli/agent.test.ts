import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { agentRegistry } from '../../src/agent/agents/registry.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { agentCommand } from '../../src/cli/commands/agent.ts';
import { installCommand } from '../../src/cli/commands/install.ts';
import { initCommand, parseAgentSelection } from '../../src/cli/commands/init.ts';

describe('CLI agent/init', () => {
  it('parses multi-agent selections from interactive input', () => {
    assert.deepEqual(parseAgentSelection('1, 4, vscode'), ['claude', 'zed', 'copilot']);
  });

  it('keeps every supported agent on local project paths', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-local-agent-'));

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
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-add-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-home-'));
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
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-init-agent-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'maia-init-home-'));
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

  it('persists selected agents to the project manifest when -save is used', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-save-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);

      await initCommand(['codex', '-save'], { store });
      await agentCommand(['claude', '-save'], { store });

      const manifest = JSON.parse(readFileSync(store.getPaths().manifest, 'utf8'));
      assert.ok(manifest.agents.codex);
      assert.equal(manifest.agents.codex.name, 'OpenAI Codex');
      assert.ok(manifest.agents.claude);
      assert.equal(manifest.agents.claude.name, 'Claude Desktop');
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('re-applies saved agents when install runs without arguments', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-install-saved-agent-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);

      await initCommand(['codex', '-save'], { store });
      const codexConfig = path.resolve(tempDir, '.codex', 'config.toml');
      rmSync(codexConfig, { force: true });
      rmSync(path.dirname(codexConfig), { recursive: true, force: true });

      await installCommand([], { store });

      assert.ok(existsSync(codexConfig));
      const contents = readFileSync(codexConfig, 'utf8');
      assert.match(contents, /\[mcp_servers\]/);
      assert.match(contents, /maia\s*=\s*\{/);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('re-applies saved agents during CI verification', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-saved-agent-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      await initCommand(['copilot', '-save'], { store });
      const config = path.resolve(tempDir, '.vscode', 'mcp.json');
      rmSync(config, { force: true });
      rmSync(path.dirname(config), { recursive: true, force: true });

      const ci = await import('../../src/cli/commands/ci.ts').then((m) => m.ciCommand);
      await ci([], { store });

      assert.ok(existsSync(config));
      const contents = readFileSync(config, 'utf8');
      assert.match(contents, /"maia"/);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates Codex config on init when Codex is selected', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-init-'));
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
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-agent-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-home-'));
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
      assert.doesNotMatch(contents, /maia\s*=\s*\{/);
    } finally {
      process.chdir(originalCwd);
      process.env.HOME = originalHome;
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('keeps Codex config idempotent across repeated init runs', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-idempotent-'));
    const originalCwd = process.cwd();

    try {
      process.chdir(tempDir);

      await initCommand(['codex'], { store: new AgentCatalogStore({ cwd: tempDir }) });
      await initCommand(['codex'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      const contents = readFileSync(path.resolve(tempDir, '.codex', 'config.toml'), 'utf8');
      assert.equal((contents.match(/maia\s*=\s*\{/g) ?? []).length, 1);
      assert.doesNotMatch(contents, /maia\s*=\s*\{\s*maia\s*=\s*\{/);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
