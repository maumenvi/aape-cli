import { execSync } from 'node:child_process';

function validateCommand(command: string): boolean {
  // Default: block all commands (require explicit LLM policy configuration)
  return false;
}

export const tool = {
  name: 'execute_command',
  description: 'Runs a shell command in a controlled environment when explicitly requested.',
  inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
  execute: async (input: Record<string, unknown> = {}) => {
    const command = typeof input.command === 'string' ? input.command : '';
    if (!command) {
      throw new Error('A command is required.');
    }

    if (!validateCommand(command)) {
      throw new Error(`Command execution blocked by default policy. Configure LLM access policy to enable.`);
    }

    const output = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 });

    return {
      ok: true,
      name: 'execute_command',
      command,
      output,
    };
  },
};
