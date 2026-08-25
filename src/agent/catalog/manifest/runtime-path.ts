import path from 'node:path';
import { config } from '../../../config/index.ts';

export const normalizeRegistryPath = (entryPath: string): string => {
  if (path.isAbsolute(entryPath)) return entryPath;
  return path.resolve(config.paths.rootDir, 'data', entryPath);
};
