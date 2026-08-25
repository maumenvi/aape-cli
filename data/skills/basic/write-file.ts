import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const skill = {
  name: 'write_file',
  description: 'Writes or updates local files and folders when explicit content is given.',
  usesTools: ['write_file'],
  execute: async (input: Record<string, unknown> = {}) => {
    const filePath = typeof input.path === 'string' ? input.path : '';
    const content = typeof input.content === 'string' ? input.content : '';

    if (!filePath || !content) {
      throw new Error('A file path and content are required.');
    }

    const directory = path.dirname(filePath);
    mkdirSync(directory, { recursive: true });
    writeFileSync(filePath, content, 'utf8');

    return {
      ok: true,
      name: 'write_file',
      path: filePath,
      bytesWritten: Buffer.byteLength(content, 'utf8'),
    };
  },
};
