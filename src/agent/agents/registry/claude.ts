import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent-target.ts';
import { mcpEntry } from './mcp-entry.ts';

/** Defines the claude value. */
export const claude: AgentTarget = {
  id: 'claude',
  name: 'Claude Desktop',
  configPaths(cwd) {
    return [join(cwd, '.claude', 'claude_desktop_config.json')];
  },
  buildEntry: mcpEntry,
};
