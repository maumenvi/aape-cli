import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent-target.ts';
import { mcpEntry } from './mcp-entry.ts';

/** Defines the continue agent value. */
export const continueAgent: AgentTarget = {
  id: 'continue',
  aliases: ['continue-dev'],
  name: 'Continue',
  configPaths(cwd) {
    return [join(cwd, '.continue', 'config.json')];
  },
  buildEntry: mcpEntry,
};
