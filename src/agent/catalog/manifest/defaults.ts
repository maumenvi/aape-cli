import path from 'node:path';
import type { SourcesManifest } from '../types/index.ts';

export const createDefaultManifest = (): SourcesManifest => ({
  name: path.basename(process.cwd()),
  version: '0.1.0',
  aapeVersion: '^1.0.0',
  config: {
    registryStrategy: 'hybrid',
    strictVerify: true,
    llmAccessDefault: 'allow',
  },
  sources: {
    local: {
      type: 'git',
      url: 'https://github.com/maumenvi/aape.git',
      ref: 'master',
      trusted: true,
    },
  },
  skills: {},
  mcps: {},
  tools: {},
});
