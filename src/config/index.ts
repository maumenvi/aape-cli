import path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const REQUIRED_ENV_TEMPLATE = [
  'SKILLS_REGISTRY_URL=https://skills.sh',
  'MCP_REGISTRY_URL=https://registry.modelcontextprotocol.io',
  'GITHUB_TOKEN=',
  'NODE_ENV=development',
  'LLM_MODEL=llama3.1',
  'OLLAMA_BASE_URL=http://localhost:11434',
  'OPENROUTER_API_KEY=',
  'OPEN_ROUTER_KEY=',
  'OPENROUTER_KEY=',
  'OPENAI_API_KEY=',
  'ANTHROPIC_API_KEY=',
];

export function ensureProjectDotEnv(filePath: string): void {
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const lines = existing ? existing.split(/\r?\n/) : [];
  const known = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    if (key) {
      known.add(key);
    }
  }

  const missing = REQUIRED_ENV_TEMPLATE.filter((entry) => {
    const separator = entry.indexOf('=');
    const key = separator > 0 ? entry.slice(0, separator).trim() : '';
    return Boolean(key) && !known.has(key);
  });

  if (missing.length === 0 && existsSync(filePath)) {
    return;
  }

  const template = [...lines, ...missing];
  writeFileSync(filePath, `${template.join('\n')}\n`, 'utf8');
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
  const projectDotAapeEnv = path.resolve(process.cwd(), '.env.aape');

  if (existsSync(projectDotEnv)) {
    loadDotEnvFromFile(projectDotEnv);
  }

  ensureProjectDotEnv(projectDotAapeEnv);
  loadDotEnvFromFile(projectDotAapeEnv);
}

const workspaceDotEnv = path.resolve(process.cwd(), '.env.aape');
ensureProjectDotEnv(workspaceDotEnv);
loadDotEnvFromCurrentProject();

const getEnv = (key: string, fallback = ''): string => {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : fallback;
};

const openRouterKey = getEnv('OPENROUTER_API_KEY', getEnv('OPEN_ROUTER_KEY', getEnv('OPENROUTER_KEY', '')));
const openAiKey = getEnv('OPENAI_API_KEY', '');
const anthropicKey = getEnv('ANTHROPIC_API_KEY', '');
const defaultProvider = openRouterKey ? 'openrouter' : 'ollama';

export interface AppConfig {
  env: string;
  llm: {
    defaultProvider: 'openrouter' | 'ollama' | 'openai' | 'anthropic' | 'custom';
    model: string;
    ollamaBaseUrl: string;
    openrouterApiKey: string;
    openaiApiKey: string;
    anthropicApiKey: string;
    providerOrder: Array<'openrouter' | 'ollama' | 'openai' | 'anthropic' | 'custom'>;
  };
  catalog: {
    skillsRegistryUrl: string;
    mcpRegistryUrl: string;
  };
  paths: {
    rootDir: string;
    skillsRoot: string;
    toolsRoot: string;
    mcpRoot: string;
    sourcesFile: string;
    sourceLockFile: string;
    contextDir: string;
  };
}

export const config: AppConfig = {
  env: getEnv('NODE_ENV', 'development'),
  llm: {
    defaultProvider,
    model: getEnv('LLM_MODEL', 'llama3.1'),
    ollamaBaseUrl: getEnv('OLLAMA_BASE_URL', 'http://localhost:11434'),
    openrouterApiKey: openRouterKey,
    openaiApiKey: openAiKey,
    anthropicApiKey: anthropicKey,
    providerOrder: ['openrouter', 'ollama', 'openai', 'anthropic', 'custom'],
  },
  catalog: {
    skillsRegistryUrl: getEnv('SKILLS_REGISTRY_URL', 'https://skills.sh'),
    mcpRegistryUrl: getEnv('MCP_REGISTRY_URL', 'https://registry.modelcontextprotocol.io'),
  },
  paths: {
    rootDir,
    skillsRoot: path.resolve(rootDir, 'data', 'skills'),
    toolsRoot: path.resolve(rootDir, 'data', 'tools'),
    mcpRoot: path.resolve(rootDir, 'data', 'mcp'),
    sourcesFile: path.resolve(rootDir, 'sources'),
    sourceLockFile: path.resolve(rootDir, 'source.lock'),
    contextDir: path.resolve(rootDir, '.aape'),
  },
};

export function getConfig(): AppConfig {
  return config;
}

export function resolveDefaultLlmProvider(): AppConfig['llm']['defaultProvider'] {
  return config.llm.defaultProvider;
}

export function getRequiredEnv(name: string): string {
  const value = getEnv(name, '');
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
