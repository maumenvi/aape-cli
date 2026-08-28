import path from 'node:path';
import type { SourcesManifest } from '../types/index.ts';

export const createDefaultManifest = (): SourcesManifest => ({
  name: path.basename(process.cwd()),
  version: '0.1.0',
  maiaVersion: '^1.0.0',
  config: {
    registryStrategy: 'hybrid',
    strictVerify: true,
    llmAccessDefault: 'allow',
  },
  registries: {
    skills: {
      provider: 'skills.sh',
      url: 'https://skills.sh',
    },
    mcp: {
      provider: 'mcp',
      url: 'https://registry.modelcontextprotocol.io',
    },
  },
  sources: {
    local: {
      type: 'git',
      url: 'https://github.com/maumenvi/maia-cli.git',
      ref: 'ead0c40d67627cf9210619270d43b50c7c7a0c1d',
      trusted: true,
    },
  },
  skills: {},
  mcps: {},
  tools: {},
  agents: {},
});
