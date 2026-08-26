import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

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
