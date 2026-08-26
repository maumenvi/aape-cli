import { createMcpStdioServer } from '../../agent/mcp/server/index.ts';
import { parseFlags } from '../shared/flags.ts';
import type { CommandHandler } from '../types.ts';

export const mcpServerCommand: CommandHandler = async (args, { store }) => {
  const { flags } = parseFlags(args);
  const dynamic = flags.dynamic === 'true' || flags.dynamic === '1';

  const server = createMcpStdioServer(store, {
    name: flags.name ?? 'aape-mcp-server',
    version: flags.version ?? '1.0.0',
    dynamicDiscovery: dynamic,
  });

  await server.start();
};
