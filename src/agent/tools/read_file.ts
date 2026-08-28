import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

import type { Tool } from './contracts/tool.ts';

/** Reads UTF-8 files after resolving and validating their real workspace path. */
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
  /** Validates the input path and returns the requested workspace-local file. */
  async execute(input: unknown) {
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
    const targetRealPath = realpathSync(targetPath);
    const relative = path.relative(workspaceRoot, targetRealPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`read_file can only access files inside the workspace: ${filePath}`);
    }
    if (!statSync(targetRealPath).isFile()) {
      throw new Error(`File not found: ${targetRealPath}`);
    }
    return {
      path: targetRealPath,
      content: readFileSync(targetRealPath, 'utf8'),
    };
  },
};
