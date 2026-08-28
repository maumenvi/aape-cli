import { existsSync } from 'node:fs';
import type { AgentTarget } from '../types.ts';

/** Returns the first existing candidate path, or the first candidate if none exist. */
export function resolveConfigPath(target: AgentTarget, cwd: string): string {
  const candidates = target.configPaths(cwd);
  return candidates.find(existsSync) ?? candidates[0];
}
