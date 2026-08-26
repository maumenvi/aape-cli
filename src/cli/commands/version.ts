import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CommandHandler } from '../types.ts';

function resolvePackageJsonPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../../../package.json'),
    path.resolve(here, '../../../../package.json'),
  ];

  const packageJsonPath = candidates.find((candidate) => existsSync(candidate));
  if (!packageJsonPath) {
    throw new Error('package.json not found');
  }

  return packageJsonPath;
}

export const versionCommand: CommandHandler = async () => {
  const packageJsonPath = resolvePackageJsonPath();
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
  if (!packageJson.version) {
    throw new Error('package version not found');
  }
  console.log(packageJson.version);
};
