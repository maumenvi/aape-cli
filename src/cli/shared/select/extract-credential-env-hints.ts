import type { CatalogSearchResult } from '../../../agent/catalog/providers/index.ts';

const ENV_PLACEHOLDER = /(\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}|\{([A-Za-z_][A-Za-z0-9_]*)\})/g;
const CREDENTIAL_NAME = /(token|key|secret|password|auth|bearer)/i;

/** Extracts environment variable placeholders from a templated value. */
function extractEnvNames(value: string): string[] {
  const names = new Set<string>();
  for (const match of value.matchAll(ENV_PLACEHOLDER)) {
    const name = match[2] ?? match[3];
    if (name) {
      names.add(name.trim());
    }
  }
  return Array.from(names);
}

/** Collects credential-like environment names from a string map. */
function collectCredentialNames(
  map: Record<string, string> | undefined,
): string[] {
  if (!map) {
    return [];
  }

  const names = new Set<string>();
  for (const value of Object.values(map)) {
    for (const envName of extractEnvNames(value)) {
      if (CREDENTIAL_NAME.test(envName)) {
        names.add(envName);
      }
    }
  }
  return Array.from(names);
}

/** Extracts credential environment hints declared or inferred for a catalog result. */
export function extractCredentialEnvHints(result: CatalogSearchResult): string[] {
  const fromRegistry = (result.credentials ?? []).map((credential) => credential.envName ?? credential.name);
  if (result.kind !== 'mcp' || result.install.type !== 'mcp') {
    return Array.from(new Set(fromRegistry)).sort();
  }

  const fromEnv = 'env' in result.install.vscode ? collectCredentialNames(result.install.vscode.env) : [];
  const fromHeaders = 'headers' in result.install.vscode ? collectCredentialNames(result.install.vscode.headers) : [];
  return Array.from(new Set([...fromRegistry, ...fromEnv, ...fromHeaders])).sort();
}
