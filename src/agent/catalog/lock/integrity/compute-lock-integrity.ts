import { stableHash } from '../../shared/index.ts';
import type { LockPackage } from '../../types/index.ts';
import { createLockIntegrityPayload } from './create-lock-integrity-payload.ts';

/** Computes the stable integrity hash for a locked package. */
export function computeLockIntegrity(pkg: LockPackage): string {
  return stableHash(createLockIntegrityPayload(pkg));
}
