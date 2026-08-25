import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const clientRoot = path.resolve(fileURLToPath(new URL('./client', import.meta.url)));

function isSafeModulePath(value: string): boolean {
  return /^[a-zA-Z0-9/_-]+\.(ts|tsx)$/.test(value);
}

export function transpileDashboardModule(modulePath: string): string | null {
  if (!isSafeModulePath(modulePath)) return null;

  const fullPath = path.resolve(clientRoot, modulePath);
  if (!fullPath.startsWith(clientRoot)) return null;

  if (!existsSync(fullPath)) return null;

  const source = readFileSync(fullPath, 'utf8');
  const result = transformSync(source, {
    sourcefile: fullPath,
    loader: fullPath.endsWith('.tsx') ? 'tsx' : 'ts',
    format: 'esm',
    target: 'es2022',
    jsx: 'automatic',
  });

  return result.code;
}
