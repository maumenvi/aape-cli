import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const artifactPaths = [
  'sources',
  'source.lock',
  '.env',
  'skills',
  'mcps',
  'tools',
  '.vscode/mcp.json',
];

const existedBefore = new Set(
  artifactPaths.filter((relativePath) => existsSync(path.resolve(rootDir, relativePath))),
);

function removeIfCreatedByTests(relativePath) {
  if (existedBefore.has(relativePath)) return;
  const absolutePath = path.resolve(rootDir, relativePath);
  if (!existsSync(absolutePath)) return;
  rmSync(absolutePath, { recursive: true, force: true });
}

function removeEmptyDirectory(relativePath) {
  const absolutePath = path.resolve(rootDir, relativePath);
  if (!existsSync(absolutePath)) return;
  if (readdirSync(absolutePath).length > 0) return;
  rmSync(absolutePath, { recursive: true, force: true });
}

let exitCode = 0;

try {
  const testArguments = process.argv.includes('--coverage')
    ? [
        '--test',
        '--experimental-test-coverage',
        '--test-coverage-lines=80',
        '--test-coverage-branches=70',
        '--test-coverage-functions=80',
      ]
    : ['--test'];
  const result = spawnSync(process.execPath, testArguments, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  exitCode = result.status ?? 1;
} finally {
  for (const relativePath of artifactPaths) {
    removeIfCreatedByTests(relativePath);
  }

  if (!existedBefore.has('.vscode/mcp.json')) {
    removeEmptyDirectory('.vscode');
  }
}

process.exit(exitCode);
