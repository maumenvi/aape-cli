import path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

export function ensureProjectDotEnv(filePath: string): void {
  if (existsSync(filePath)) {
    return;
  }
  writeFileSync(filePath, '\n', 'utf8');
}

export function loadDotEnvFromFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
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
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }
    const unquoted = value.replace(/^['"]|['"]$/g, '');
    process.env[key] = unquoted;
  }
}

export function loadDotEnvFromCurrentProject(): void {
  const projectDotEnv = path.resolve(process.cwd(), '.env');
  const projectDotMaiaEnv = path.resolve(process.cwd(), '.env.maia');

  if (existsSync(projectDotEnv)) {
    loadDotEnvFromFile(projectDotEnv);
  }

  ensureProjectDotEnv(projectDotMaiaEnv);
  loadDotEnvFromFile(projectDotMaiaEnv);
}

const getEnv = (key: string, fallback = ''): string => {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : fallback;
};

export interface AppConfig {
  catalog: {
    skillsRegistryUrl: string;
    mcpRegistryUrl: string;
  };
  paths: {
    rootDir: string;
    skillsRoot: string;
    toolsRoot: string;
    mcpRoot: string;
  };
}

export const config: AppConfig = {
  catalog: {
    skillsRegistryUrl: 'https://skills.sh',
    mcpRegistryUrl: 'https://registry.modelcontextprotocol.io'
  },
  paths: {
    rootDir,
    skillsRoot: path.resolve(rootDir, 'data', 'skills'),
    toolsRoot: path.resolve(rootDir, 'data', 'tools'),
    mcpRoot: path.resolve(rootDir, 'data', 'mcp'),
  },
};
