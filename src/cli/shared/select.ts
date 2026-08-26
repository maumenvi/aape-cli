import { createInterface } from 'node:readline/promises';
import type { CatalogSearchResult } from '../../agent/catalog/providers/index.ts';

function formatInstalls(value?: number): string {
  return value ? ` · ${value.toLocaleString('en-US')} installs` : '';
}

const ENV_PLACEHOLDER = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;
const CREDENTIAL_NAME = /(token|key|secret|password|auth|bearer)/i;

function extractEnvNames(value: string): string[] {
  const names = new Set<string>();
  for (const match of value.matchAll(ENV_PLACEHOLDER)) {
    const name = match[1]?.trim();
    if (name) {
      names.add(name);
    }
  }
  return Array.from(names);
}

function collectCredentialNames(
  map: Record<string, string> | undefined,
  includeMapKeys: boolean,
): string[] {
  if (!map) {
    return [];
  }

  const names = new Set<string>();
  for (const [key, value] of Object.entries(map)) {
    if (includeMapKeys && CREDENTIAL_NAME.test(key)) {
      names.add(key);
    }
    for (const envName of extractEnvNames(value)) {
      if (CREDENTIAL_NAME.test(envName)) {
        names.add(envName);
      }
    }
  }
  return Array.from(names);
}

export function extractCredentialEnvHints(result: CatalogSearchResult): string[] {
  const fromRegistry = (result.credentials ?? []).map((credential) => credential.envName ?? credential.name);
  if (result.kind !== 'mcp' || result.install.type !== 'mcp') {
    return Array.from(new Set(fromRegistry)).sort();
  }

  const fromEnv = 'env' in result.install.vscode ? collectCredentialNames(result.install.vscode.env, true) : [];
  const fromHeaders = 'headers' in result.install.vscode ? collectCredentialNames(result.install.vscode.headers, false) : [];
  return Array.from(new Set([...fromRegistry, ...fromEnv, ...fromHeaders])).sort();
}

function formatCredentialSources(result: CatalogSearchResult): string[] {
  const credentialSources = (result.credentials ?? [])
    .map((credential) => {
      const details = [credential.description, credential.sourceUrl].filter(Boolean).join(' · ');
      const label = credential.envName ?? credential.name;
      return details ? `${label}: ${details}` : label;
    });
  return Array.from(new Set(credentialSources));
}

export async function selectCatalogResult(results: CatalogSearchResult[]): Promise<CatalogSearchResult | null> {
  if (results.length === 0) {
    return null;
  }

  console.log('Resultados disponíveis:\n');
  results.forEach((result, index) => {
    console.log(`${index + 1}) ${result.displayName} (${result.source})${formatInstalls(result.installs)}`);
    if (result.description) {
      console.log(`   ${result.description}`);
    }
    const credentials = extractCredentialEnvHints(result);
    if (credentials.length > 0) {
      console.log(`   Requer chave/token: ${credentials.join(', ')}`);
      const sources = formatCredentialSources(result);
      if (sources.length > 0) {
        console.log(`   Onde obter: ${sources.join(' | ')}`);
      }
    }
  });

  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const answer = await input.question(`\nEscolha uma opção (1-${results.length}, 0 para cancelar): `);
      const choice = Number(answer.trim());
      if (choice === 0) {
        return null;
      }
      if (Number.isInteger(choice) && choice >= 1 && choice <= results.length) {
        return results[choice - 1];
      }
      console.log(`Opção inválida. Digite um número entre 1 e ${results.length}.`);
    }
  } finally {
    input.close();
  }
}
