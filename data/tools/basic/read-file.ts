import { existsSync, readFileSync } from 'node:fs';

export const tool = {
  name: 'read_file',
  description: 'Reads the content of a file on disk.',
  inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  execute: async (input: Record<string, unknown> = {}) => {
    const filePath = typeof input.path === 'string' ? input.path : typeof input === 'string' ? input : '';
    if (!filePath) {
      throw new Error('A file path is required.');
    }

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf8');
    return {
      ok: true,
      name: 'read_file',
      path: filePath,
      content,
    };
  },
};
