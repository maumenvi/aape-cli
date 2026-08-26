import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { agentCommand } from '../../src/cli/commands/agent.ts';
import { initCommand } from '../../src/cli/commands/init.ts';

describe('CLI agent/init', () => {
  it('configures multiple agents through agent add aliases', async () => {
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

      assert.ok(existsSync(claudeConfig));
      assert.ok(existsSync(copilotConfig));
      assert.equal(JSON.parse(readFileSync(claudeConfig, 'utf8')).mcpServers.aape.command, 'aape');
      assert.equal(JSON.parse(readFileSync(copilotConfig, 'utf8')).servers.aape.args[0], 'mcp-server');
    } finally {
      process.chdir(originalCwd);
      process.env.HOME = originalHome;
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('initializes workspace folders and configures multiple agents', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-init-agent-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'aape-init-home-'));
    const originalCwd = process.cwd();
    const originalHome = process.env.HOME;

    try {
      process.chdir(tempDir);
      process.env.HOME = tempHome;

      await initCommand(['claude,copilot', 'zed'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      assert.ok(existsSync(path.resolve(tempDir, 'skills')));
      assert.ok(existsSync(path.resolve(tempDir, 'mcps')));
      assert.ok(existsSync(path.resolve(tempDir, 'tools')));
      assert.ok(existsSync(path.resolve(tempDir, 'source.lock')));

      const claudeConfig = path.resolve(tempHome, '.config', 'claude', 'claude_desktop_config.json');
      const copilotConfig = path.resolve(tempHome, '.config', 'Code', 'User', 'mcp.json');
      const zedConfig = path.resolve(tempHome, '.config', 'zed', 'settings.json');

      assert.ok(existsSync(claudeConfig));
      assert.ok(existsSync(copilotConfig));
      assert.ok(existsSync(zedConfig));
      assert.equal(JSON.parse(readFileSync(zedConfig, 'utf8')).context_servers.aape.command.path, 'aape');
    } finally {
      process.chdir(originalCwd);
      process.env.HOME = originalHome;
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });
});
