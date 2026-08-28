import type { MCPConfig } from '../../../agent/tools/types.ts';

/** Converts unknown JSON values into a string-valued map. */
function toStringMap(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
}

/** Creates an MCP configuration object from CLI flags. */
export function createMcpConfig(name: string, flags: Record<string, string>): MCPConfig {
  const parsedArgs = flags.args ? JSON.parse(flags.args) : [];
  const parsedEnv = flags.env ? JSON.parse(flags.env) : {};
  const parsedHeaders = flags.headers ? JSON.parse(flags.headers) : {};
  const parsedNpxArgs = flags.npxArgs ? JSON.parse(flags.npxArgs) : ['-y'];
  const transport = String(flags.transport ?? 'stdio');

  if (transport === 'http' || transport === 'ws' || transport === 'sse') {
    const url = String(flags.url ?? '');
    if (!url) {
      throw new Error(`Usage for ${transport.toUpperCase()} MCP: maia i mcp <name> --transport ${transport} --url <endpoint>`);
    }
    return { transport, url, headers: toStringMap(parsedHeaders) };
  }

  if (transport === 'npx') {
    return {
      transport: 'npx',
      package: String(flags.package ?? `@modelcontextprotocol/server-${name}`),
      args: Array.isArray(parsedArgs) ? parsedArgs.map(String) : [],
      env: toStringMap(parsedEnv),
      npxArgs: Array.isArray(parsedNpxArgs) ? parsedNpxArgs.map(String) : ['-y'],
    };
  }

  return {
    transport: 'stdio',
    command: flags.command ?? 'npx',
    args: Array.isArray(parsedArgs) ? parsedArgs.map(String) : [],
    env: toStringMap(parsedEnv),
  };
}
