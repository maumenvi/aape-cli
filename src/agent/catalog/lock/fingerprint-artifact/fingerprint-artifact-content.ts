import { createHash } from 'node:crypto';

/**
 * Computes the canonical `sha256:<hex>` fingerprint used by the lockfile for a
 * materialized artifact's raw bytes.
 *
 * @param content - The artifact content, as a string or buffer.
 * @returns The prefixed SHA-256 digest, matching lockfile artifact hashes.
 */
export function fingerprintArtifactContent(content: string | Buffer): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}
