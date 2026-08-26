import { ciCommand } from './ci.ts';
import { contextCommand } from './context.ts';
import { helpCommand } from './help.ts';
import { initCommand } from './init.ts';
import { installCommand } from './install.ts';
import { listCommand } from './list.ts';
import { lockCommand } from './lock.ts';
import { mcpCommand } from './mcp.ts';
import { removeCommand } from './remove.ts';
import { sourceCommand } from './source.ts';
import { skillsCommand } from './skills.ts';
import { versionCommand } from './version.ts';
import { verifyCommand } from './verify.ts';
import type { CommandHandler } from '../types.ts';

export const commandHandlers: Record<string, CommandHandler> = {
  init: initCommand,
  i: installCommand,
  install: installCommand,
  rm: removeCommand,
  remove: removeCommand,
  ls: listCommand,
  lock: lockCommand,
  up: lockCommand,
  ci: ciCommand,
  verify: verifyCommand,
  context: contextCommand,
  mcp: mcpCommand,
  source: sourceCommand,
  skills: skillsCommand,
  version: versionCommand,
  '--version': versionCommand,
  '-v': versionCommand,
  help: helpCommand,
};
