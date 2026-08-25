import type { McpDependency } from '../../agent/catalog/store.ts';
import { parseFlags } from '../shared/flags.ts';
import { normalizeKind } from '../shared/kind.ts';
import type { CommandHandler } from '../types.ts';

const toStringMap = (input: unknown): Record<string, string> => {
  if (!input || typeof input !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
};

export const installCommand: CommandHandler = async (args, { store }) => {
  const { positional, flags } = parseFlags(args);
  const kind = normalizeKind(positional[0] ?? '');
  const name = positional[1];
  if (!name) {
    throw new Error(`Usage: aape i ${kind} <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]`);
  }

  const version = flags.version ?? '*';
  const source = flags.source ?? 'local';
  const parsedAllowedLlms = typeof flags.llms === 'string'
    ? flags.llms.split(',').map((item) => item.trim()).filter((item) => item.length > 0)
    : [];
  const allowedLlms = flags.allLlms === 'true' || flags['all-llms'] === 'true'
    ? ['*']
    : parsedAllowedLlms.length > 0
      ? parsedAllowedLlms
      : ['*'];

  if (kind === 'mcp') {
    const parsedArgs = flags.args ? JSON.parse(flags.args) : [];
    const parsedEnv = flags.env ? JSON.parse(flags.env) : {};
    const parsedHeaders = flags.headers ? JSON.parse(flags.headers) : {};
    const parsedNpxArgs = flags.npxArgs ? JSON.parse(flags.npxArgs) : ['-y'];
    const transport = String(flags.transport ?? 'stdio');
    const vscode = transport === 'http'
      ? {
          transport: 'http' as const,
          url: String(flags.url ?? ''),
          headers: toStringMap(parsedHeaders),
        }
      : transport === 'ws'
        ? {
            transport: 'ws' as const,
            url: String(flags.url ?? ''),
            headers: toStringMap(parsedHeaders),
          }
      : transport === 'sse'
        ? {
            transport: 'sse' as const,
            url: String(flags.url ?? ''),
            headers: toStringMap(parsedHeaders),
          }
      : transport === 'npx'
        ? {
            transport: 'npx' as const,
            package: String(flags.package ?? `@modelcontextprotocol/server-${name}`),
            args: Array.isArray(parsedArgs) ? parsedArgs.map((value) => String(value)) : [],
            env: toStringMap(parsedEnv),
            npxArgs: Array.isArray(parsedNpxArgs) ? parsedNpxArgs.map((value) => String(value)) : ['-y'],
          }
      : {
          transport: 'stdio' as const,
          command: flags.command ?? 'npx',
          args: Array.isArray(parsedArgs) ? parsedArgs.map((value) => String(value)) : [],
          env: toStringMap(parsedEnv),
        };
    if (vscode.transport === 'http' && !vscode.url) {
      throw new Error('Usage for HTTP MCP: aape i mcp <name> --transport http --url <endpoint> [--headers \'{...}\']');
    }
    if (vscode.transport === 'ws' && !vscode.url) {
      throw new Error('Usage for WebSocket MCP: aape i mcp <name> --transport ws --url <endpoint> [--headers \'{...}\']');
    }
    if (vscode.transport === 'sse' && !vscode.url) {
      throw new Error('Usage for SSE MCP: aape i mcp <name> --transport sse --url <endpoint> [--headers \'{...}\']');
    }
    if (vscode.transport === 'npx' && !vscode.package) {
      throw new Error('Usage for NPX MCP: aape i mcp <name> --transport npx [--package <npm-package>] [--args \'[...]\']');
    }
    const dependency: McpDependency = {
      version,
      source,
      enabled: true,
      capabilities: [],
      constraints: [],
      allowedLlms,
      vscode,
    };
    store.addDependency(kind, name, dependency);
  } else {
    store.addDependency(kind, name, {
      version,
      source,
      enabled: true,
      capabilities: [],
      constraints: [],
      allowedLlms,
    });
  }

  store.buildLock();
  console.log(`Installed ${kind}:${name}`);
};
