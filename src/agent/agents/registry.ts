import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentMcpEntry, AgentTarget } from './types.ts';

function mcpEntry(cwd: string): AgentMcpEntry {
  return {
    key: 'aape',
    config: { command: 'aape', args: ['mcp-server'], cwd },
  };
}

function orderByPlatform(paths: { linux?: string; darwin?: string; win32?: string }): string[] {
  const preferred = paths[process.platform as keyof typeof paths];
  const all = [preferred, paths.linux, paths.darwin, paths.win32].filter((value): value is string => Boolean(value));
  return [...new Set(all)];
}

// ---------------------------------------------------------------------------
// Claude Desktop
// ---------------------------------------------------------------------------
const claude: AgentTarget = {
  id: 'claude',
  name: 'Claude Desktop',
  configPaths() {
    const home = homedir();
    return orderByPlatform({
      darwin: join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      linux: join(home, '.config', 'claude', 'claude_desktop_config.json'),
      win32: join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
    });
  },
  buildEntry: mcpEntry,
};

// ---------------------------------------------------------------------------
// VS Code Copilot
// The global MCP config lives at $USERPROFILE/.config/Code/User/mcp.json (Linux/Win)
// and ~/Library/Application Support/Code/User/mcp.json (macOS).
// Prefer the editor's own user config instead of generating project-local .vscode files.
// ---------------------------------------------------------------------------
const copilot: AgentTarget = {
  id: 'copilot',
  aliases: ['vscode', 'code'],
  name: 'VS Code Copilot',
  configPaths() {
    const home = homedir();
    return [
      // global Linux
      join(home, '.config', 'Code', 'User', 'mcp.json'),
      // global macOS
      join(home, 'Library', 'Application Support', 'Code', 'User', 'mcp.json'),
      // global Windows
      join(home, 'AppData', 'Roaming', 'Code', 'User', 'mcp.json'),
    ];
  },
  buildEntry: mcpEntry,
};

// ---------------------------------------------------------------------------
// Cursor
// ---------------------------------------------------------------------------
const cursor: AgentTarget = {
  id: 'cursor',
  aliases: ['cursor-ide'],
  name: 'Cursor',
  configPaths(cwd) {
    const home = homedir();
    return [
      // per-project
      join(cwd, '.cursor', 'mcp.json'),
      // global Linux
      join(home, '.config', 'Cursor', 'User', 'mcp.json'),
      // global macOS
      join(home, 'Library', 'Application Support', 'Cursor', 'User', 'mcp.json'),
      // global Windows
      join(home, 'AppData', 'Roaming', 'Cursor', 'User', 'mcp.json'),
    ];
  },
  buildEntry: mcpEntry,
};

// ---------------------------------------------------------------------------
// Zed
// Zed stores MCP servers inside settings.json under "context_servers" key.
// ---------------------------------------------------------------------------
const zed: AgentTarget = {
  id: 'zed',
  name: 'Zed',
  configPaths() {
    const home = homedir();
    return [
      join(home, '.config', 'zed', 'settings.json'),
      // macOS
      join(home, 'Library', 'Application Support', 'Zed', 'settings.json'),
    ];
  },
  buildEntry: mcpEntry,
};

// ---------------------------------------------------------------------------
// Cline (VS Code extension)
// Cline uses a standalone JSON config file.
// ---------------------------------------------------------------------------
const cline: AgentTarget = {
  id: 'cline',
  name: 'Cline',
  configPaths(cwd) {
    const home = homedir();
    return [
      // per-project
      join(cwd, '.cline', 'mcp.json'),
      // global Linux
      join(home, '.config', 'cline', 'mcp.json'),
      // global macOS
      join(home, 'Library', 'Application Support', 'cline', 'mcp.json'),
    ];
  },
  buildEntry: mcpEntry,
};

// ---------------------------------------------------------------------------
// Continue (VS Code / JetBrains extension)
// Continue reads ~/.continue/config.json for MCP servers under "mcpServers".
// ---------------------------------------------------------------------------
const continueAgent: AgentTarget = {
  id: 'continue',
  aliases: ['continue-dev'],
  name: 'Continue',
  configPaths(cwd) {
    const home = homedir();
    return [
      join(home, '.continue', 'config.json'),
      // per-project
      join(cwd, '.continue', 'config.json'),
    ];
  },
  buildEntry: mcpEntry,
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const agentRegistry: AgentTarget[] = [claude, copilot, cursor, zed, cline, continueAgent];

export function findAgent(id: string): AgentTarget | undefined {
  const normalized = id.toLowerCase();
  return agentRegistry.find((agent) => agent.id === normalized || agent.aliases?.includes(normalized));
}

export function listAgentIds(): string[] {
  return agentRegistry.map((a) => a.id);
}
