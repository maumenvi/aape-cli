import { join } from 'node:path';
import type { AgentMcpEntry, AgentTarget } from '../types.ts';

/** Builds the Maia MCP server entry for a project directory. */
function mcpEntry(cwd: string): AgentMcpEntry {
  return {
    key: 'maia',
    config: { command: 'maia', args: ['mcp-server'], cwd },
  };
}

/** Orders OS-specific config paths with the current platform first. */
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
  /** Resolves Claude Desktop MCP config paths. */
  configPaths(cwd) {
    return [join(cwd, '.claude', 'claude_desktop_config.json')];
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
  /** Resolves VS Code Copilot MCP config paths. */
  configPaths(cwd) {
    return [join(cwd, '.vscode', 'mcp.json')];
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
  /** Resolves Cursor MCP config paths. */
  configPaths(cwd) {
    return [join(cwd, '.cursor', 'mcp.json')];
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
  /** Resolves Zed settings config paths. */
  configPaths(cwd) {
    return [join(cwd, '.zed', 'settings.json')];
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
  /** Resolves Cline MCP config paths. */
  configPaths(cwd) {
    return [join(cwd, '.cline', 'mcp.json')];
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
  /** Resolves Continue MCP config paths. */
  configPaths(cwd) {
    return [join(cwd, '.continue', 'config.json')];
  },
  buildEntry: mcpEntry,
};

// ---------------------------------------------------------------------------
// Codex (OpenAI CLI)
// Codex stores MCP servers in ~/.codex/config.toml under [mcp_servers].
// ---------------------------------------------------------------------------
const codex: AgentTarget = {
  id: 'codex',
  aliases: ['openai-codex', 'gpt-codex'],
  name: 'OpenAI Codex',
  /** Resolves Codex MCP config paths. */
  configPaths(cwd) {
    return [join(cwd, '.codex', 'config.toml')];
  },
  buildEntry: mcpEntry,
};

/** Supported agent targets in display order. */
export const agentRegistry: AgentTarget[] = [claude, copilot, cursor, zed, cline, continueAgent, codex];

void orderByPlatform;
