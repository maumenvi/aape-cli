import type { MCPConfig } from '../../tools/types.ts';
import type { CatalogProvider, CatalogSearchResult, ResolvedCatalogEntry } from './types.ts';

type FetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface RegistryInput {
  name?: string;
  value?: string;
  default?: string;
  description?: string;
  isRequired?: boolean;
  isSecret?: boolean;
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

function toEnvVariableName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  if (!normalized) {
    return 'VALUE';
  }
  return /^[A-Z_]/.test(normalized) ? normalized : `MCP_${normalized}`;
}

function credentialEnvPrefix(serverName: string): string {
  const tail = serverName.split('/').filter(Boolean).pop() ?? serverName;
  return toEnvVariableName(tail || 'MCP');
}

function credentialEnvName(serverName: string, inputName?: string): string {
  return toEnvVariableName(`${credentialEnvPrefix(serverName)}_${inputName ?? 'VALUE'}`);
}

function normalizePlaceholderValue(value: string, serverName: string, inputName?: string): string {
  if (!value) {
    return value;
  }

  const directPattern = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;
  if (directPattern.test(value)) {
    return value;
  }

  const barePattern = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  const credentialEnv = inputName && isCredentialInput({ name: inputName } as RegistryInput)
    ? credentialEnvName(serverName, inputName)
    : undefined;
  const defaultEnvName = credentialEnv ?? toEnvVariableName(inputName ?? 'VALUE');

  return value.replace(barePattern, (_, placeholder: string) => {
    const name = credentialEnv ?? credentialEnvName(serverName, placeholder);
    return '${env:' + (name || defaultEnvName) + '}';
  });
}

function inputValue(serverName: string, input: RegistryInput): string {
  const rawValue = input.value ?? input.default ?? '';
  if (rawValue) {
    return normalizePlaceholderValue(rawValue, serverName, input.name);
  }
  const envName = isCredentialInput(input)
    ? credentialEnvName(serverName, input.name)
    : toEnvVariableName(input.name ?? 'VALUE');
  return '${env:' + envName + '}';
}

function inputMap(serverName: string, inputs: RegistryInput[] = []): Record<string, string> {
  return Object.fromEntries(
    inputs
      .filter((input): input is RegistryInput & { name: string } => Boolean(input.name))
      .map((input) => [input.name, inputValue(serverName, input)]),
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

function isCredentialInput(input: RegistryInput): boolean {
  const normalizedName = (input.name ?? '').toLowerCase();
  const normalizedDescription = (input.description ?? '').toLowerCase();
  return Boolean(
    input.isSecret
    || /token|key|secret|password|auth|bearer/.test(normalizedName)
    || /token|key|secret|password|auth|bearer|api/.test(normalizedDescription),
  );
}

function collectCredentialHints(
  inputs: RegistryInput[] = [],
  serverName = 'MCP',
  sourceUrl?: string,
): Array<{ name: string; envName: string; description?: string; sourceUrl?: string }> {
  return inputs
    .filter((input) => Boolean(input.name) && isCredentialInput(input))
    .map((input) => ({
      name: input.name as string,
      envName: credentialEnvName(serverName, input.name as string),
      description: input.description,
      sourceUrl,
    }));
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
      env: inputMap(server.name ?? server.title ?? 'MCP', npmPackage.environmentVariables),
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
    ? { transport: 'sse', url: remote.url, headers: inputMap(server.name ?? server.title ?? 'MCP', remote.headers) }
    : { transport: 'http', url: remote.url, headers: inputMap(server.name ?? server.title ?? 'MCP', remote.headers) };
}

function unwrapServer(entry: { server?: RegistryServer } | RegistryServer): RegistryServer {
  if (Object.prototype.hasOwnProperty.call(entry, 'server')) {
    return (entry as { server?: RegistryServer }).server ?? {};
  }
  return entry as RegistryServer;
}

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchWithTimeout(fetchFn: FetchFn, input: string | URL, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
    const response = await fetchWithTimeout(this.fetchFn, `${this.baseUrl}/v0.1/servers?${params.toString()}`);
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
      const npmCredentials = server.packages?.flatMap((item) => collectCredentialHints(item.environmentVariables, server.name, server.repository?.url)) ?? [];
      const remoteCredentials = server.remotes?.flatMap((item) => collectCredentialHints(item.headers, server.name, server.repository?.url || item.url)) ?? [];
      const credentials = [...npmCredentials, ...remoteCredentials].filter((value, index, values) =>
        values.findIndex((candidate) => candidate.name === value.name && candidate.sourceUrl === value.sourceUrl) === index,
      );
      return [{
        id: server.name,
        kind: 'mcp' as const,
        name: server.name,
        displayName: server.title || server.name,
        description: server.description,
        provider: this.id,
        source: server.repository?.url || this.baseUrl,
        version: server.version,
        ...(credentials.length > 0 ? { credentials } : {}),
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
