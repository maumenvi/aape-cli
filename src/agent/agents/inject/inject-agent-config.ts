import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AgentMcpEntry, AgentMcpServerConfig, AgentTarget } from '../types.ts';
import type { AgentConfigFormat } from './agent-config-format.ts';
import type { InjectResult } from './inject-result.ts';

/** Detects which config schema the target agent expects. */
function detectFormat(agentId: string): AgentConfigFormat {
  if (agentId === 'zed') return 'zed-settings';
  if (agentId === 'codex') return 'toml-mcp-servers';
  if (agentId === 'claude' || agentId === 'continue') return 'mcp-servers';
  return 'servers';
}

/** Reads a JSON config file, returning an empty object when missing. */
function readJson(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    throw new Error(`Could not parse existing config at ${filePath}`);
  }
}

/** Writes a JSON config file with stable indentation. */
function writeJson(filePath: string, data: Record<string, unknown>): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}
`, 'utf8');
}

/** Adds or replaces an MCP server entry under the requested top-level key. */
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

/** Adds or replaces a Zed context server entry. */
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

/** Escapes a string for TOML using JSON-compatible quoting. */
function escapeTomlString(value: string): string {
  return JSON.stringify(value);
}

/** Adds or replaces a Codex MCP server entry in a TOML config file. */
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
    writeFileSync(filePath, `${section}
${entry.join('
')}
`, 'utf8');
    return;
  }

  const lines = existing.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => line.trim() === section);
  if (sectionIndex === -1) {
    writeFileSync(filePath, `${existing.trimEnd()}

${section}
${entry.join('
')}
`, 'utf8');
    return;
  }

  const nextHeaderIndex = lines.findIndex((line, index) => index > sectionIndex && line.trim().startsWith('[') && line.trim().endsWith(']'));
  const sectionBody = nextHeaderIndex === -1
    ? lines.slice(sectionIndex + 1)
    : lines.slice(sectionIndex + 1, nextHeaderIndex);
  const trailing = nextHeaderIndex === -1 ? [] : lines.slice(nextHeaderIndex);

  const kept: string[] = [];
  let skipEntry = false;
  for (const line of sectionBody) {
    if (skipEntry) {
      if (line.trim() === '}') {
        skipEntry = false;
      }
      continue;
    }

    if (new RegExp(`^\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*=`).test(line)) {
      skipEntry = line.includes('{');
      continue;
    }

    if (line.trim()) {
      kept.push(line);
    }
  }

  const nextBody = [...kept, ...entry];
  const nextFile = [
    ...lines.slice(0, sectionIndex + 1),
    ...nextBody,
    ...(trailing.length > 0 ? ['', ...trailing] : []),
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();

  writeFileSync(filePath, `${nextFile}
`, 'utf8');
}

/** Injects the Maia MCP server entry into the selected agent config file. */
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
