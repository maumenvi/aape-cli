import { existsSync, readFileSync } from 'node:fs';

export const tool = {
  name: 'read_file',
  description: 'Reads the content of a file on disk.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
    },
    required: ['path'],
  },
  source: 'basic',
  installedAt: '2026-08-24T10:04:30.341Z',
  execute: async (input: Record<string, unknown> = {}) => {
    const filePath = typeof input.path === 'string' ? input.path : '';
    if (!filePath) {
      throw new Error('A file path is required.');
    }
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return {
      ok: true,
      name: 'read_file',
      path: filePath,
      content: readFileSync(filePath, 'utf8'),
    };
  },
};
