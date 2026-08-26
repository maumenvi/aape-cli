import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AgentMcpEntry, AgentMcpServerConfig, AgentTarget } from './types.ts';

export type AgentConfigFormat =
  | 'mcp-servers'      // { mcpServers: { key: config } }  — Claude Desktop, Continue
  | 'servers'          // { servers: { key: config } }      — VS Code Copilot, Cursor, Cline
  | 'zed-settings'     // Zed settings.json merges under "context_servers"
  | 'toml-mcp-servers'; // [mcp_servers] key = { command = ..., args = [...] }

/** Detect which config schema the target agent expects. */
function detectFormat(agentId: string): AgentConfigFormat {
  if (agentId === 'zed') return 'zed-settings';
  if (agentId === 'codex') return 'toml-mcp-servers';
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

function escapeTomlString(value: string): string {
  return JSON.stringify(value);
}

function injectTomlMcpServers(filePath: string, key: string, serverConfig: AgentMcpServerConfig): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const entry = [
    `${key} = {`,
    `  command = ${escapeTomlString(serverConfig.command)},`,
    `  args = ${JSON.stringify(serverConfig.args)},`,
  ];

  if (serverConfig.cwd) {
    entry.push(`  cwd = ${escapeTomlString(serverConfig.cwd)},`);
  }
  entry.push('}');

  const section = '[mcp_servers]';
  if (!existing.trim()) {
    writeFileSync(filePath, `${section}\n${entry.join('\n')}\n`, 'utf8');
    return;
  }

  const sectionPattern = /^\[mcp_servers\]\s*\n/mi;
  if (sectionPattern.test(existing)) {
    const bodyMatch = existing.match(/^\[mcp_servers\]\s*\n([\s\S]*?)(?=^\[|\s*$)/m);
    const body = bodyMatch ? bodyMatch[1] : '';
    const keyPattern = new RegExp(`^${key}\s*=.*$`, 'm');
    let nextBody = body;
    if (keyPattern.test(body)) {
      nextBody = body.replace(keyPattern, entry.join('\n'));
    } else {
      nextBody = `${body.trimEnd()}\n${entry.join('\n')}\n`; 
    }
    const replaced = existing.replace(/^\[mcp_servers\]\s*\n[\s\S]*?(?=^\[|\s*$)/m, `${section}\n${nextBody}`);
    writeFileSync(filePath, replaced, 'utf8');
    return;
  }

  writeFileSync(filePath, `${existing.trimEnd()}\n\n${section}\n${entry.join('\n')}\n`, 'utf8');
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

  if (format === 'zed-settings') {
    const data = readJson(configPath);
    const updated = injectZedSettings(data, entry.key, entry.config);
    writeJson(configPath, updated);
    return { configPath, created: !existed, updated: existed };
  }

  if (format === 'toml-mcp-servers') {
    injectTomlMcpServers(configPath, entry.key, entry.config);
    return { configPath, created: !existed, updated: existed };
  }

  const data = readJson(configPath);
  const topKey = format === 'mcp-servers' ? 'mcpServers' : 'servers';
  const updated = injectMcpServers(data, entry.key, entry.config, topKey);
  writeJson(configPath, updated);
  return { configPath, created: !existed, updated: existed };
}

/** Return the first existing candidate path, or the first candidate if none exist. */
export function resolveConfigPath(target: AgentTarget, cwd: string): string {
  const candidates = target.configPaths(cwd);
  return candidates.find(existsSync) ?? candidates[0];
}
