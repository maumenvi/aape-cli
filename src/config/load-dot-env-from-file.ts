import { existsSync, readFileSync } from 'node:fs';

/**
 * Loads simple `KEY=VALUE` pairs from a dotenv-style file into `process.env`.
 *
 * Existing environment variables are never overwritten, blank lines and `#`
 * comments are ignored, and surrounding single or double quotes are stripped
 * from values. Missing files are treated as a no-op.
 *
 * @param filePath - Absolute path to the dotenv file to load.
 */
export function loadDotEnvFromFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }
    const unquoted = value.replace(/^['"]|['"]$/g, '');
    process.env[key] = unquoted;
  }
}
