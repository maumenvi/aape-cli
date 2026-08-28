import { createInterface } from 'node:readline/promises';

import { agentRegistry } from '../../../agent/agents/registry/agent-registry.ts';
import { parseAgentSelection } from './parse-agent-selection.ts';

/** Performs the prompt for agent ids operation. */
export async function promptForAgentIds(): Promise<string[]> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return [];
  }

  console.log('Select one or more agents to configure:');
  agentRegistry.forEach((agent, index) => {
    const aliases = agent.aliases?.length ? ` (aliases: ${agent.aliases.join(', ')})` : '';
    console.log(`  ${index + 1}. ${agent.id}${aliases}`);
  });

  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await input.question('\nEnter numbers/names separated by commas (e.g. 1,3 or claude,copilot), or press Enter to skip: ')).trim();
    if (!answer) {
      return [];
    }
    return parseAgentSelection(answer);
  } finally {
    input.close();
  }
}
