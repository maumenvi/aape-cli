import { fingerprintArtifactContent } from './fingerprint-artifact-content.ts';

/**
 * Verifies that artifact content matches an expected lockfile hash before it is
 * written to disk, throwing when the integrity check fails.
 *
 * This enforces that `maia ci` validates integrity *before* materializing, so a
 * tampered source can never overwrite an on-disk file.
 *
 * @param id - Human-readable identifier used in the error message.
 * @param content - The candidate artifact content.
 * @param expectedHash - The `sha256:` hash recorded in the lockfile, if any.
 */
export function assertArtifactContentMatches(
  id: string,
  content: string | Buffer,
  expectedHash: string | undefined,
): void {
  if (!expectedHash) {
    return;
  }
  const actual = fingerprintArtifactContent(content);
  if (actual !== expectedHash) {
    throw new Error(`Artifact hash mismatch for ${id}`);
  }
}
