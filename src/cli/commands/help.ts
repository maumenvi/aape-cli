import type { CommandHandler } from '../types.ts';

export const helpCommand: CommandHandler = async () => {
  const lines = [
    'aape init',
    'aape i|install <skill|mcp|tool> <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]',
    'aape rm|remove <skill|mcp|tool> <name>',
    'aape ls [skill|mcp|tool]',
    'aape lock',
    'aape ci',
    'aape verify',
    'aape source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]',
    'aape source ls',
    'aape context build',
    'aape context show --for dev|llm',
    'aape mcp sync',
  ];
  console.log(lines.join('\n'));
};
