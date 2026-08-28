import { existsSync, writeFileSync } from 'node:fs';

/**
 * Ensures a blank project `.env.maia` template exists at the given path.
 *
 * This performs an explicit, opt-in side effect and must only be called from
 * user-initiated flows (for example `maia init`), never implicitly during an
 * MCP connection.
 *
 * @param filePath - Absolute path to the `.env.maia` file to create.
 */
export function ensureProjectDotEnv(filePath: string): void {
  if (existsSync(filePath)) {
    return;
  }
  writeFileSync(filePath, '\n', 'utf8');
}
