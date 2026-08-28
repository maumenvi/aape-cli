import type {
  McpCallToolResult,
  McpInitializeResult,
  McpListToolsResult,
  McpProtocolEra,
  McpProtocolVersion,
} from '../protocol/json-rpc.ts';
import type { McpRequestOptions } from './mcp-request-options.ts';

/** Exposes the MCP lifecycle and tool operations used by Maia's manager. */
export interface McpClient {
  initialize(options?: McpRequestOptions): Promise<McpInitializeResult>;
  listTools(options?: McpRequestOptions): Promise<McpListToolsResult>;
  callTool(name: string, args?: Record<string, unknown>, options?: McpRequestOptions): Promise<McpCallToolResult>;
  shutdown(options?: McpRequestOptions): Promise<void>;
  getProtocolEra(): McpProtocolEra | undefined;
  getProtocolVersion(): McpProtocolVersion | undefined;
}

