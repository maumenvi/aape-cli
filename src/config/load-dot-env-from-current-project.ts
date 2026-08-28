import path from 'node:path';
import { loadDotEnvFromFile } from './load-dot-env-from-file.ts';

/**
 * Loads `.env` and `.env.maia` from the current working directory into
 * `process.env`, when those files exist.
 *
 * This is intentionally side-effect free with respect to the filesystem: it
 * never creates a `.env.maia` template. Creating that file is an explicit
 * responsibility of `maia init` via {@link ensureProjectDotEnv}, so connecting
 * to an MCP server does not silently scaffold project files.
 */
export function loadDotEnvFromCurrentProject(): void {
  const projectDotEnv = path.resolve(process.cwd(), '.env');
  const projectDotMaiaEnv = path.resolve(process.cwd(), '.env.maia');

  loadDotEnvFromFile(projectDotEnv);
  loadDotEnvFromFile(projectDotMaiaEnv);
}
