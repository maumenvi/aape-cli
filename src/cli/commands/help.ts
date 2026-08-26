import type { CommandHandler } from '../types.ts';

export const helpCommand: CommandHandler = async () => {
  const lines = [
    'aape init',
    'aape i',
    'aape i|install <skill|mcp|tool> <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]',
    'aape rm|remove <skill|mcp|tool> <name>',
    'aape ls [skill|mcp|tool]',
    'aape lock',
    'aape ci',
    'aape verify',
    'aape source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]',
    'aape source ls',
    'aape skills find <query>',
    'aape skills add <skill-name|owner/repo@skill>',
    'aape context build',
    'aape context show --for dev|llm',
    'aape mcp find <query>',
    'aape mcp add <name>',
    'aape mcp sync',
    'aape version',
  ];
  console.log(lines.join('\n'));
};
