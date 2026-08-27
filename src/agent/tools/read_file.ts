import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Tool } from './types.ts';

function resolveTargetPath(input: unknown): string {
  if (typeof input === 'string') {
    return path.resolve(process.cwd(), input);
  }

  if (!input || typeof input !== 'object') {
    throw new Error('read_file expects a "path" field');
  }

  const filePath = Reflect.get(input, 'path');
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('read_file expects a non-empty "path" field');
  }

  return path.resolve(process.cwd(), filePath);
}

export const tool: Tool = {
  name: 'read_file',
  description: 'Read a UTF-8 text file from the current workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
    },
    required: ['path'],
    additionalProperties: false,
  },
  async execute(input: unknown) {
    const targetPath = resolveTargetPath(input);
    if (!existsSync(targetPath) || !statSync(targetPath).isFile()) {
      throw new Error(`File not found: ${targetPath}`);
    }
    return {
      path: targetPath,
      content: readFileSync(targetPath, 'utf8'),
    };
  },
};
