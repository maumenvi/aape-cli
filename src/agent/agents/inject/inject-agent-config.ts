import { existsSync } from 'node:fs';

import type { AgentMcpEntry } from '../contracts/agent-mcp-entry.ts';
import type { AgentTarget } from '../contracts/agent-target.ts';
import { detectFormat } from './detect-format.ts';
import { injectMcpServers } from './inject-mcp-servers.ts';
import type { InjectResult } from './inject-result.ts';
import { injectTomlMcpServers } from './inject-toml-mcp-servers.ts';
import { injectZedSettings } from './inject-zed-settings.ts';
import { readJson } from './read-json.ts';
import { writeJson } from './write-json.ts';

/** Performs the inject agent config operation. */
export function injectAgentConfig(
  target: AgentTarget,
  cwd: string,
  configPath: string,
): InjectResult {
  const entry: AgentMcpEntry = target.buildEntry(cwd, target.id);
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
