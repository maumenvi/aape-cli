import { AgentCatalogStore } from '../../catalog/store.ts';
import type { MCPConfig } from '../../tools/types.ts';
import type { McpReliabilityConfig } from '../reliability/index.ts';
import { createMcpTransport, JsonRpcMcpClient } from '../runtime/index.ts';
import type { McpSession } from '../runtime/index.ts';
import { toErrorMessage } from './resilience.ts';

export function getInstalledMcpConfig(catalog: AgentCatalogStore, serverName: string): MCPConfig {
  const installed = catalog.getInstalledPackages('mcp');
  const selected = installed.find((pkg) => pkg.name === serverName);
  if (!selected?.vscode) {
    throw new Error(`MCP server "${serverName}" is not installed or has no MCP config.`);
  }
  const config = selected.vscode;
  if (config.transport === 'http' && !config.url) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.url" for HTTP transport.`);
  }
  if (config.transport === 'sse' && !config.url) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.url" for SSE transport.`);
  }
  if (config.transport === 'ws' && !config.url) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.url" for WebSocket transport.`);
  }
  if (config.transport === 'npx' && !config.package) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.package" for npx transport.`);
  }
  if ((config.transport === 'stdio' || typeof config.transport === 'undefined') && !config.command) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.command" for stdio transport.`);
  }
  return config;
}

export async function getOrStartSession(
  catalog: AgentCatalogStore,
  sessions: Map<string, McpSession>,
  serverName: string,
  timeoutMs?: number,
): Promise<McpSession> {
  const existing = sessions.get(serverName);
  if (existing?.status === 'running' && existing.transport.isOpen()) {
    return existing;
  }

  if (existing) {
    await invalidateSession(sessions, serverName);
  }

  const config = getInstalledMcpConfig(catalog, serverName);
  const transport = createMcpTransport(config, timeoutMs ?? 15_000);
  const client = new JsonRpcMcpClient(transport);
  const session: McpSession = {
    serverName,
    config,
    status: 'starting',
    startedAt: Date.now(),
    client,
    transport,
  };
  sessions.set(serverName, session);

  try {
    await client.initialize({ timeoutMs });
    session.status = 'running';
    session.lastHealthcheckAt = Date.now();
    return session;
  } catch (error) {
    session.status = 'failed';
    session.lastError = toErrorMessage(error);
    await transport.close();
    sessions.delete(serverName);
    throw error;
  }
}

export async function ensureHealthySession(
  session: McpSession,
  reliability: McpReliabilityConfig,
  timeoutMs?: number,
): Promise<void> {
  if (
    typeof session.lastHealthcheckAt === 'number'
    && Date.now() - session.lastHealthcheckAt < reliability.healthcheckIntervalMs
  ) {
    return;
  }
  await session.client.listTools({ timeoutMs });
  session.lastHealthcheckAt = Date.now();
}

export async function stopSession(
  sessions: Map<string, McpSession>,
  serverName: string,
  timeoutMs?: number,
): Promise<void> {
  const session = sessions.get(serverName);
  if (!session) return;
  try {
    await session.client.shutdown({ timeoutMs });
  } finally {
    await session.transport.close();
    session.status = 'stopped';
    sessions.delete(serverName);
  }
}

export async function invalidateSession(
  sessions: Map<string, McpSession>,
  serverName: string,
): Promise<void> {
  const session = sessions.get(serverName);
  if (!session) return;
  sessions.delete(serverName);
  session.status = 'failed';
  await session.transport.close();
}
