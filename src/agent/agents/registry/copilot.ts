import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent-target.ts';
import { mcpEntry } from './mcp-entry.ts';

/** Defines the copilot value. */
export const copilot: AgentTarget = {
  id: 'copilot',
  aliases: ['vscode', 'code'],
  name: 'VS Code Copilot',
  configPaths(cwd) {
    return [join(cwd, '.vscode', 'mcp.json')];
  },
  buildEntry: mcpEntry,
};
