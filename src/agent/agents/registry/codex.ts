import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent-target.ts';
import { mcpEntry } from './mcp-entry.ts';

/** Defines the codex value. */
export const codex: AgentTarget = {
  id: 'codex',
  aliases: ['openai-codex', 'gpt-codex'],
  name: 'OpenAI Codex',
  configPaths(cwd) {
    return [join(cwd, '.codex', 'config.toml')];
  },
  buildEntry: mcpEntry,
};
