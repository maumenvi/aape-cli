import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { MCPConfig } from '../../tools/types.ts';
import type { CatalogStorePaths, SourceLock } from '../types/index.ts';

export function syncVsCodeMcpConfig(paths: CatalogStorePaths, lock: SourceLock): { file: string; servers: Record<string, MCPConfig> } {
  const servers = Object.values(lock.packages)
    .filter((pkg) => pkg.type === 'mcp' && pkg.enabled)
    .reduce<Record<string, MCPConfig>>((acc, pkg) => {
      if (!pkg.vscode) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP config in lock`);
      }
      if (pkg.vscode.transport === 'http' && !pkg.vscode.url) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP URL for HTTP transport`);
      }
      if (pkg.vscode.transport === 'sse' && !pkg.vscode.url) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP URL for SSE transport`);
      }
      if (pkg.vscode.transport === 'ws' && !pkg.vscode.url) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP URL for WebSocket transport`);
      }
      if (pkg.vscode.transport === 'npx' && !pkg.vscode.package) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP package for npx transport`);
      }
      if ((pkg.vscode.transport === 'stdio' || typeof pkg.vscode.transport === 'undefined') && !pkg.vscode.command) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP command for stdio transport`);
      }
      acc[pkg.name] = pkg.vscode;
      return acc;
    }, {});

  mkdirSync(path.dirname(paths.vscodeMcp), { recursive: true });
  writeFileSync(paths.vscodeMcp, `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`, 'utf8');
  return { file: paths.vscodeMcp, servers };
}
