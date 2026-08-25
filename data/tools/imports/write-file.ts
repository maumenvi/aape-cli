import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const tool = {
  name: 'write_file',
  description: 'Writes content to a target file.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['path', 'content'],
  },
  source: 'basic',
  installedAt: '2026-08-24T10:04:30.341Z',
  execute: async (input: Record<string, unknown> = {}) => {
    const filePath = typeof input.path === 'string' ? input.path : '';
    const content = typeof input.content === 'string' ? input.content : '';
    if (!filePath || !content) {
      throw new Error('A file path and content are required.');
    }
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf8');
    return {
      ok: true,
      name: 'write_file',
      path: filePath,
      bytesWritten: Buffer.byteLength(content, 'utf8'),
    };
  },
};
