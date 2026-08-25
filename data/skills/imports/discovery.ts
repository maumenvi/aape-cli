import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const skill = {
  name: 'discovery',
  description: 'Discovers tools, skills and MCP entries from local registry and remote repositories.',
  usesTools: ['read_file', 'search_web'],
  source: 'local',
  installedAt: '2026-08-24T10:04:30.341Z',
  execute: async (input: Record<string, unknown> = {}) => {
    const registryPath = typeof input.path === 'string' ? input.path : path.resolve('data');
    const resolved = path.resolve(registryPath);
    const indexFiles = [
      path.join(resolved, 'skills', 'registry.json'),
      path.join(resolved, 'tools', 'registry.json'),
      path.join(resolved, 'mcp', 'registry.json'),
    ];

    const discovered = indexFiles.filter((file) => existsSync(file)).map((file) => ({
      file,
      payload: JSON.parse(readFileSync(file, 'utf8')),
    }));

    return {
      ok: true,
      name: 'discovery',
      discovered: discovered.map((item) => ({
        file: item.file,
        items: Array.isArray(item.payload.items) ? item.payload.items.length : 0,
      })),
    };
  },
};
