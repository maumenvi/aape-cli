import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import { installCommand } from '../../src/cli/commands/install.ts';
import { materializeToolFromLock } from '../../src/cli/shared/workspace.ts';
import {
  assertArtifactContentMatches,
  fingerprintArtifactContent,
} from '../../src/agent/catalog/lock/fingerprint-artifact.ts';

describe('artifact fingerprinting', () => {
  it('computes a stable sha256 fingerprint', () => {
    const hash = fingerprintArtifactContent('hello');
    assert.match(hash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(fingerprintArtifactContent('hello'), hash);
    assert.notEqual(fingerprintArtifactContent('world'), hash);
  });

  it('asserts matching content and rejects mismatches', () => {
    const hash = fingerprintArtifactContent('content');
    assert.doesNotThrow(() => assertArtifactContentMatches('demo', 'content', hash));
    assert.doesNotThrow(() => assertArtifactContentMatches('demo', 'anything', undefined));
    assert.throws(() => assertArtifactContentMatches('demo', 'tampered', hash), /Artifact hash mismatch for demo/);
  });
});

describe('materialization integrity', () => {
  it('refuses to write when the locked artifact hash does not match', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-materialize-integrity-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const pkg = lock.packages['tool:read_file'];
      assert.ok(pkg);

      const toolPath = path.resolve(tempDir, pkg.path);
      writeFileSync(toolPath, 'do not overwrite\n', 'utf8');

      assert.throws(
        () => materializeToolFromLock(store, { ...pkg, artifactHash: 'sha256:deadbeef' }),
        /Artifact hash mismatch for tool:read_file/,
      );
      assert.equal(readFileSync(toolPath, 'utf8'), 'do not overwrite\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
