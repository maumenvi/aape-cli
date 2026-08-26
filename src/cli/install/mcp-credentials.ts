import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import type { CatalogSearchResult } from '../../agent/catalog/providers/index.ts';
import type { AgentCatalogStore } from '../../agent/catalog/store.ts';

const CREDENTIAL_NAME = /(token|key|secret|password|auth|bearer)/i;
const ENV_PLACEHOLDER = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;

interface CredentialRequirement {
  envName: string;
  name: string;
  description?: string;
  sourceUrl?: string;
}

function mergeUnique(requirements: CredentialRequirement[]): CredentialRequirement[] {
  return requirements.filter((item, index, array) =>
    array.findIndex((candidate) => candidate.envName === item.envName) === index,
  );
}

function parseEnvNames(value: string): string[] {
  const names = new Set<string>();
  for (const match of value.matchAll(ENV_PLACEHOLDER)) {
    const envName = match[1]?.trim();
    if (envName) {
      names.add(envName);
    }
  }
  return Array.from(names);
}

function extractCredentialRequirements(result: CatalogSearchResult): CredentialRequirement[] {
  if (result.kind !== 'mcp' || result.install.type !== 'mcp') {
    return [];
  }

  const fromRegistry = (result.credentials ?? []).map((credential) => ({
    envName: credential.envName ?? credential.name,
    name: credential.name,
    description: credential.description,
    sourceUrl: credential.sourceUrl,
  }));

  const inferred = new Set<string>();
  const envMap = 'env' in result.install.vscode ? result.install.vscode.env : undefined;
  if (envMap) {
    for (const value of Object.values(envMap)) {
      for (const envName of parseEnvNames(value)) {
        if (CREDENTIAL_NAME.test(envName)) {
          inferred.add(envName);
        }
      }
    }
  }

  const headerMap = 'headers' in result.install.vscode ? result.install.vscode.headers : undefined;
  if (headerMap) {
    for (const value of Object.values(headerMap)) {
      for (const envName of parseEnvNames(value)) {
        if (CREDENTIAL_NAME.test(envName)) {
          inferred.add(envName);
        }
      }
    }
  }

  const inferredRequirements = Array.from(inferred).map((name) => ({ envName: name, name }));
  return mergeUnique([...fromRegistry, ...inferredRequirements]);
}

function parseEnvFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    map.set(key, value);
  }
  return map;
}

function formatEnvValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function upsertEnvFile(filePath: string, values: Record<string, string>): void {
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const lines = existing ? existing.split(/\r?\n/) : [];
  const indexes = new Map<string, number>();

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match?.[1]) {
      indexes.set(match[1], index);
    }
  });

  for (const [key, value] of Object.entries(values)) {
    const rendered = `${key}=${formatEnvValue(value)}`;
    const existingIndex = indexes.get(key);
    if (typeof existingIndex === 'number') {
      lines[existingIndex] = rendered;
    } else {
      lines.push(rendered);
    }
  }

  const normalized = lines.join('\n').replace(/\n*$/, '\n');
  writeFileSync(filePath, normalized, 'utf8');
}

export async function configureMcpCredentialsFromResult(
  store: AgentCatalogStore,
  result: CatalogSearchResult,
): Promise<void> {
  const requirements = extractCredentialRequirements(result);
  if (requirements.length === 0) {
    return;
  }

  const rootDir = path.dirname(store.getPaths().manifest);
  const envFile = path.resolve(rootDir, '.env');
  const existing = existsSync(envFile) ? parseEnvFile(readFileSync(envFile, 'utf8')) : new Map<string, string>();
  const toPersist: Record<string, string> = {};

  console.log(`MCP "${result.name}" may require specific credentials. We will configure them in .env: ${envFile}`);
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const input = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

  try {
    for (const requirement of requirements) {
      const hasProcessValue = Boolean(process.env[requirement.envName]);
      const hasEnvFileValue = Boolean(existing.get(requirement.envName));
      if (hasProcessValue || hasEnvFileValue) {
        continue;
      }

      if (requirement.description) {
        console.log(`- ${requirement.envName}: ${requirement.description}`);
      } else {
        console.log(`- ${requirement.envName}`);
      }
      if (requirement.sourceUrl) {
        console.log(`  URL: ${requirement.sourceUrl}`);
      }

      if (!input) {
        console.log(`  Set ${requirement.envName} manually in .env to enable this MCP.`);
        toPersist[requirement.envName] = '';
        continue;
      }

      const value = (await input.question(`  Paste the value for ${requirement.envName} (Enter to skip): `)).trim();
      toPersist[requirement.envName] = value;
    }
  } finally {
    input?.close();
  }

  if (Object.keys(toPersist).length > 0) {
    upsertEnvFile(envFile, toPersist);
    console.log(`Credentials file updated at ${envFile}`);
  }
}
