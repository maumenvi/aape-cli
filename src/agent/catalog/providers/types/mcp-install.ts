import type { MCPConfig } from '../../../tools/types.ts';

/** Describes an MCP server installation payload. */
export interface McpInstall {
  type: 'mcp';
  vscode: MCPConfig;
}
