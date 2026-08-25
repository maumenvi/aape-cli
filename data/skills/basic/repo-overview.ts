import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const skill = {
  name: 'repo_overview',
  description: 'Summarizes the repository structure, key files, and project readme for quick onboarding.',
  usesTools: ['read_file', 'list_directory'],
  execute: async (input: Record<string, unknown> = {}) => {
    const target = typeof input.path === 'string' ? input.path : process.cwd();
    const resolved = path.resolve(target);

    if (!existsSync(resolved)) {
      throw new Error(`Path not found: ${resolved}`);
    }

    const entries = readdirSync(resolved, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
    }));

    const readme = ['README.md', 'readme.md', 'README.MD'].find((fileName) => existsSync(path.join(resolved, fileName)));
    const readmeContent = readme ? readFileSync(path.join(resolved, readme), 'utf8').slice(0, 2000) : null;

    return {
      ok: true,
      name: 'repo_overview',
      path: resolved,
      entries,
      readme,
      readmeContent,
    };
  },
};
