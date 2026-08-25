import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const skill = {
  name: 'file_navigation',
  description: 'Lists and reads local files and directories safely.',
  usesTools: ['read_file'],
  execute: async (input: Record<string, unknown> = {}) => {
    const target = typeof input.path === 'string' ? input.path : process.cwd();
    const resolved = path.resolve(target);

    if (!existsSync(resolved)) {
      throw new Error(`Path not found: ${resolved}`);
    }

    const stats = statSync(resolved);
    if (stats.isDirectory()) {
      const entries = readdirSync(resolved, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
      }));

      return {
        ok: true,
        name: 'file_navigation',
        path: resolved,
        type: 'directory',
        entries,
      };
    }

    const content = readFileSync(resolved, 'utf8');
    return {
      ok: true,
      name: 'file_navigation',
      path: resolved,
      type: 'file',
      size: content.length,
      content: content.slice(0, 2000),
    };
  },
};
