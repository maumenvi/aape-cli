import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Tool } from './types.ts';

function resolveTargetPath(input: unknown): string {
  const filePath = typeof input === 'string'
    ? input
    : input && typeof input === 'object'
      ? Reflect.get(input, 'path')
      : undefined;

  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('read_file expects a non-empty "path" field');
  }

  const workspaceRoot = realpathSync(process.cwd());
  const targetPath = path.resolve(workspaceRoot, filePath);
  if (!existsSync(targetPath)) {
    throw new Error(`File not found: ${targetPath}`);
  }

  const workspaceRealPath = realpathSync(workspaceRoot);
  const targetRealPath = realpathSync(targetPath);
  const relative = path.relative(workspaceRealPath, targetRealPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`read_file can only access files inside the workspace: ${filePath}`);
  }

  return targetRealPath;
}

function resolveTargetPathFromInput(input: unknown): string {
  if (typeof input === 'string') {
    return resolveTargetPath(input);
  }
  return resolveTargetPath(input);
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
    const targetPath = resolveTargetPathFromInput(input);
    if (!statSync(targetPath).isFile()) {
      throw new Error(`File not found: ${targetPath}`);
    }
    return {
      path: targetPath,
      content: readFileSync(targetPath, 'utf8'),
    };
  },
};
