import type { SourceLock } from '../../types/lock/source-lock.ts';
import { computeLockIntegrity } from '../integrity/compute-lock-integrity.ts';

/** Performs the verify source lock metadata operation. */
export function verifySourceLockMetadata(lock: SourceLock): { ok: true } {
  for (const [id, pkg] of Object.entries(lock.packages)) {
    const expected = computeLockIntegrity(pkg);
    if (pkg.integrity !== expected) {
      throw new Error(`Integrity mismatch for ${id}`);
    }

    const source = lock.sources[pkg.source];
    if (!source) {
      throw new Error(`Missing locked source "${pkg.source}" for ${id}`);
    }
    const sourceRef = source.ref ?? 'main';
    const sourceTrusted = source.trusted ?? false;
    if (
      source.url !== pkg.provenance.repo
      || sourceRef !== pkg.provenance.ref
      || sourceTrusted !== pkg.provenance.trusted
      || (pkg.sourceCommit && source.commit !== pkg.sourceCommit)
    ) {
      throw new Error(`Source metadata mismatch for ${id}`);
    }
  }
  return { ok: true };
}
