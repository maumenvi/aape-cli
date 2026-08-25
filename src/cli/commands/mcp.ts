import type { CommandHandler } from '../types.ts';

export const mcpCommand: CommandHandler = async (args, { store }) => {
  const action = args[0];
  if (action !== 'sync') {
    throw new Error('Usage: aape mcp sync');
  }
  const result = store.syncVsCodeMcp();
  console.log(`Synced ${Object.keys(result.servers).length} MCP server(s) to ${result.file}`);
};
