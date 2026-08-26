import type { MCPConfig } from '../../tools/types.ts';
import type { CatalogProvider, CatalogSearchResult, ResolvedCatalogEntry } from './types.ts';

type FetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface RegistryInput {
  name?: string;
  value?: string;
  default?: string;
}

interface RegistryArgument extends RegistryInput {
  type?: 'named' | 'positional';
  valueHint?: string;
}

interface RegistryTransport {
  type?: 'stdio' | 'streamable-http' | 'sse';
  url?: string;
  headers?: RegistryInput[];
}

interface RegistryPackage {
  registryType?: string;
  identifier?: string;
  version?: string;
  runtimeHint?: string;
  transport?: RegistryTransport;
  runtimeArguments?: RegistryArgument[];
  packageArguments?: RegistryArgument[];
  environmentVariables?: RegistryInput[];
}

interface RegistryServer {
  name?: string;
  title?: string;
  description?: string;
  version?: string;
  repository?: { url?: string };
  packages?: RegistryPackage[];
  remotes?: RegistryTransport[];
}

interface RegistryResponse {
  servers?: Array<{ server?: RegistryServer } | RegistryServer>;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function inputValue(input: RegistryInput): string {
  return input.value ?? input.default ?? `\${env:${input.name ?? 'VALUE'}}`;
}

function inputMap(inputs: RegistryInput[] = []): Record<string, string> {
  return Object.fromEntries(
    inputs
      .filter((input): input is RegistryInput & { name: string } => Boolean(input.name))
      .map((input) => [input.name, inputValue(input)]),
  );
}

function argumentValues(argumentsList: RegistryArgument[] = []): string[] {
  return argumentsList.flatMap((argument) => {
    const value = argument.value ?? argument.default;
    if (!value) {
      return [];
    }
    if (argument.type === 'named' && argument.name) {
      return [argument.name.includes('{value}') ? argument.name.replace('{value}', value) : `${argument.name}=${value}`];
    }
    return [value];
  });
}

function versionedPackage(identifier: string, version?: string): string {
  return version ? `${identifier}@${version}` : identifier;
}

function resolveMcpConfig(server: RegistryServer): MCPConfig | null {
  const npmPackage = server.packages?.find((item) =>
    item.registryType === 'npm'
    && item.identifier
    && (!item.transport?.type || item.transport.type === 'stdio'),
  );
  if (npmPackage?.identifier) {
    const runtimeArguments = argumentValues(npmPackage.runtimeArguments);
    return {
      transport: 'npx',
      package: versionedPackage(npmPackage.identifier, npmPackage.version ?? server.version),
      npxArgs: runtimeArguments.length > 0 ? runtimeArguments : ['-y'],
      args: argumentValues(npmPackage.packageArguments),
      env: inputMap(npmPackage.environmentVariables),
    };
  }

  const remote = server.remotes?.find((item) =>
    Boolean(item.url)
    && !item.url?.includes('{')
    && (item.type === 'streamable-http' || item.type === 'sse'),
  );
  if (!remote?.url) {
    return null;
  }

  return remote.type === 'sse'
    ? { transport: 'sse', url: remote.url, headers: inputMap(remote.headers) }
    : { transport: 'http', url: remote.url, headers: inputMap(remote.headers) };
}

function unwrapServer(entry: { server?: RegistryServer } | RegistryServer): RegistryServer {
  if (Object.prototype.hasOwnProperty.call(entry, 'server')) {
    return (entry as { server?: RegistryServer }).server ?? {};
  }
  return entry as RegistryServer;
}

export class McpRegistryProvider implements CatalogProvider {
  readonly id: string;
  readonly kinds = ['mcp'] as const;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(
    id: string,
    baseUrl: string,
    fetchFn: FetchFn = fetch,
  ) {
    this.id = id;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.fetchFn = fetchFn;
  }

  async search(query: string, limit = 10): Promise<CatalogSearchResult[]> {
    const params = new URLSearchParams({
      search: query.trim(),
      version: 'latest',
      limit: String(limit),
    });
    const response = await this.fetchFn(`${this.baseUrl}/v0.1/servers?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`MCP Registry search failed (${response.status})`);
    }

    const payload = await response.json() as RegistryResponse;
    return (payload.servers ?? []).flatMap((entry) => {
      const server = unwrapServer(entry);
      const vscode = resolveMcpConfig(server);
      if (!server.name || !vscode) {
        return [];
      }
      return [{
        id: server.name,
        kind: 'mcp' as const,
        name: server.name,
        displayName: server.title || server.name,
        description: server.description,
        provider: this.id,
        source: server.repository?.url || this.baseUrl,
        version: server.version,
        install: { type: 'mcp' as const, vscode },
      }];
    });
  }

  async resolve(result: CatalogSearchResult): Promise<ResolvedCatalogEntry> {
    if (result.kind !== 'mcp' || result.install.type !== 'mcp') {
      throw new Error(`Provider "${this.id}" cannot resolve this entry`);
    }
    return {
      result,
      sourceAlias: this.id,
      source: {
        type: 'registry',
        url: this.baseUrl,
        ref: 'v0.1',
        trusted: true,
      },
    };
  }
}
