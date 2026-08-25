import type { SourceLock } from '../types/index.ts';
import { computeLockIntegrity } from './integrity.ts';

export function verifySourceLock(lock: SourceLock): { ok: true } {
  for (const [id, pkg] of Object.entries(lock.packages)) {
    const expected = computeLockIntegrity(pkg);
    if (pkg.integrity !== expected) {
      throw new Error(`Integrity mismatch for ${id}`);
    }
  }
  return { ok: true };
}
