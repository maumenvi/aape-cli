import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AgentMcpEntry, AgentMcpServerConfig, AgentTarget } from './types.ts';

export type AgentConfigFormat =
  | 'mcp-servers'      // { mcpServers: { key: config } }  — Claude Desktop, Continue
  | 'servers'          // { servers: { key: config } }      — VS Code Copilot, Cursor, Cline
  | 'zed-settings';    // Zed settings.json merges under "context_servers"

/** Detect which JSON schema the config file uses (or should use). */
function detectFormat(agentId: string): AgentConfigFormat {
  if (agentId === 'zed') return 'zed-settings';
  if (agentId === 'claude' || agentId === 'continue') return 'mcp-servers';
  return 'servers';
}

function readJson(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    throw new Error(`Could not parse existing config at ${filePath}`);
  }
}

function writeJson(filePath: string, data: Record<string, unknown>): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function injectMcpServers(
  data: Record<string, unknown>,
  key: string,
  serverConfig: AgentMcpServerConfig,
  topKey: string,
): Record<string, unknown> {
  const existing = (data[topKey] ?? {}) as Record<string, unknown>;
  return {
    ...data,
    [topKey]: {
      ...existing,
      [key]: serverConfig,
    },
  };
}

function injectZedSettings(
  data: Record<string, unknown>,
  key: string,
  serverConfig: AgentMcpServerConfig,
): Record<string, unknown> {
  const existing = (data['context_servers'] ?? {}) as Record<string, unknown>;
  const entry = {
    command: { path: serverConfig.command, args: serverConfig.args },
  };
  return {
    ...data,
    context_servers: {
      ...existing,
      [key]: entry,
    },
  };
}

export interface InjectResult {
  configPath: string;
  created: boolean;
  updated: boolean;
}

export function injectAgentConfig(
  target: AgentTarget,
  cwd: string,
  configPath: string,
): InjectResult {
  const entry: AgentMcpEntry = target.buildEntry(cwd);
  const format = detectFormat(target.id);
  const existed = existsSync(configPath);
  const data = readJson(configPath);

  let updated: Record<string, unknown>;
  if (format === 'zed-settings') {
    updated = injectZedSettings(data, entry.key, entry.config);
  } else {
    const topKey = format === 'mcp-servers' ? 'mcpServers' : 'servers';
    updated = injectMcpServers(data, entry.key, entry.config, topKey);
  }

  writeJson(configPath, updated);
  return { configPath, created: !existed, updated: existed };
}

/** Return the first existing candidate path, or the first candidate if none exist. */
export function resolveConfigPath(target: AgentTarget, cwd: string): string {
  const candidates = target.configPaths(cwd);
  return candidates.find(existsSync) ?? candidates[0];
}
