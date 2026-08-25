import type { MCPConfig } from '../../../tools/types.ts';
import type { McpTransport } from '../contracts/types.ts';
import { McpHttpTransport } from './http.ts';
import { McpNpxTransport } from './npx.ts';
import { McpSseTransport } from './sse.ts';
import { McpStdioTransport } from './stdio.ts';
import { McpWebSocketTransport } from './ws.ts';

export function createMcpTransport(config: MCPConfig, defaultTimeoutMs = 15_000): McpTransport {
  if (config.transport === 'http') {
    return new McpHttpTransport(config, defaultTimeoutMs);
  }
  if (config.transport === 'sse') {
    return new McpSseTransport(config, defaultTimeoutMs);
  }
  if (config.transport === 'npx') {
    return new McpNpxTransport(config, defaultTimeoutMs);
  }
  if (config.transport === 'ws') {
    return new McpWebSocketTransport(config, defaultTimeoutMs);
  }
  return new McpStdioTransport(config, defaultTimeoutMs);
}
