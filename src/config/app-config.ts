import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppConfig } from './types/app-config.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

/**
 * Resolved application configuration shared across the CLI and agent runtime.
 */
export const config: AppConfig = {
  catalog: {
    skillsRegistryUrl: 'https://skills.sh',
    mcpRegistryUrl: 'https://registry.modelcontextprotocol.io',
  },
  paths: {
    rootDir,
    skillsRoot: path.resolve(rootDir, 'data', 'skills'),
    toolsRoot: path.resolve(rootDir, 'data', 'tools'),
    mcpRoot: path.resolve(rootDir, 'data', 'mcp'),
  },
};
