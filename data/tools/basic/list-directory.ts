import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const tool = {
  name: 'list_directory',
  description: 'Lists directories and basic metadata in a filesystem-safe way.',
  inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  execute: async (input: Record<string, unknown> = {}) => {
    const target = typeof input.path === 'string' ? input.path : process.cwd();
    const resolved = path.resolve(target);

    if (!existsSync(resolved)) {
      throw new Error(`Directory not found: ${resolved}`);
    }

    const stats = statSync(resolved);
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${resolved}`);
    }

    const entries = readdirSync(resolved, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
    }));

    return {
      ok: true,
      name: 'list_directory',
      path: resolved,
      entries,
    };
  },
};
