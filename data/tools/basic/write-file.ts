import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function validatePath(filePath: string): boolean {
  // Default: block all filesystem writes (require explicit LLM policy configuration)
  return false;
}

export const tool = {
  name: 'write_file',
  description: 'Writes content to a target file.',
  inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
  execute: async (input: Record<string, unknown> = {}) => {
    const filePath = typeof input.path === 'string' ? input.path : '';
    const content = typeof input.content === 'string' ? input.content : '';

    if (!filePath || !content) {
      throw new Error('A file path and content are required.');
    }

    if (!validatePath(filePath)) {
      throw new Error(`File write access blocked by default policy. Configure LLM access policy to enable.`);
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
