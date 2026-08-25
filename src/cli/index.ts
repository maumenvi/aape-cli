#!/usr/bin/env node
import { AgentCatalogStore } from '../agent/catalog/store.ts';
import { commandHandlers } from './commands/index.ts';
import { helpCommand } from './commands/help.ts';
import type { CliContext } from './types.ts';

const command = process.argv[2] ?? 'help';
const args = process.argv.slice(3);

const context: CliContext = {
  store: new AgentCatalogStore({ cwd: process.cwd() }),
};

const handler = commandHandlers[command] ?? helpCommand;

handler(args, context).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`aape: ${message}`);
  process.exitCode = 1;
});
