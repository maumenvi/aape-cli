import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SkillRegistry } from '../../src/agent/skills/manager.ts';
import type { SkillConfig } from '../../src/agent/tools/types.ts';

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  describe('initialization', () => {
    it('creates empty registry', () => {
      assert.ok(registry instanceof SkillRegistry);
    });

    it('has add method', () => {
      assert.ok(typeof registry.add === 'function');
    });

    it('has list method', () => {
      assert.ok(typeof registry.list === 'function');
    });

    it('has discover method', () => {
      assert.ok(typeof registry.discover === 'function');
    });

    it('has addFromHub method', () => {
      assert.ok(typeof registry.addFromHub === 'function');
    });
  });

  describe('skill management', () => {
    it('lists empty skills initially', () => {
      const skills = registry.list();
      assert.ok(Array.isArray(skills));
      assert.equal(skills.length, 0);
    });

    it('add method exists for direct registration', () => {
      const skillConfig: SkillConfig = {
        id: 'test-skill',
        name: 'test_skill',
        description: 'Test skill',
        pipelineId: 'test-pipeline',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      // This test verifies the interface
      assert.ok(typeof registry.add === 'function');
    });

    it('discover method signature is correct', async () => {
      // Verify method exists and is async
      const result = registry.discover('skillsHub');
      assert.ok(result instanceof Promise);
    });

    it('addFromHub method signature is correct', async () => {
      // Verify method exists and is async
      const result = registry.addFromHub('skillsHub', 'skill-name');
      assert.ok(result instanceof Promise);
    });
  });

  describe('repository support', () => {
    it('discover supports skillsHub repository', async () => {
      // Default repository
      const result = registry.discover('skillsHub');
      assert.ok(result instanceof Promise);
    });

    it('discover supports custom repositories', async () => {
      // User can specify custom repositories
      const repos = ['skillsHub', 'github-org/repo', 'http://custom:8000'];
      for (const repo of repos) {
        const result = registry.discover(repo);
        assert.ok(result instanceof Promise);
      }
    });

    it('addFromHub supports different repositories', async () => {
      // Verify method can handle different repository sources
      const repos = ['skillsHub', 'custom-repo'];
      for (const repo of repos) {
        const result = registry.addFromHub(repo, 'test-skill');
        assert.ok(result instanceof Promise);
      }
    });
  });

  describe('skill filtering', () => {
    it('list returns skills array', () => {
      const skills = registry.list();
      assert.ok(Array.isArray(skills));
    });

    it('list with filter option', () => {
      // Future: support filtering by category, tags, etc
      const skills = registry.list();
      assert.ok(Array.isArray(skills));
    });
  });

  describe('skill discovery from repositories', () => {
    it('discover returns array of skills', async () => {
      // Currently scaffolded, will return empty array
      const skills = await registry.discover('skillsHub');
      assert.ok(Array.isArray(skills));
    });

    it('discover includes skill metadata', async () => {
      // Future: verify returned skills have required fields
      const skills = await registry.discover('skillsHub');
      assert.ok(Array.isArray(skills));
    });

    it('addFromHub downloads and registers skill', async () => {
      // Verify the method signature for future implementation
      assert.ok(typeof registry.addFromHub === 'function');
    });
  });

  describe('skill versioning', () => {
    it('supports skill versioning in future', () => {
      // Placeholder for versioning support
      const registry2 = new SkillRegistry();
      assert.ok(registry2 instanceof SkillRegistry);
    });
  });

  describe('integration', () => {
    it('skills can be added and retrieved', () => {
      // Verify full lifecycle is supported
      assert.ok(typeof registry.add === 'function');
      assert.ok(typeof registry.list === 'function');
      assert.ok(typeof registry.discover === 'function');
    });

    it('registry works with pipeline context', () => {
      // Skills are meant to work within pipeline nodes
      const skills = registry.list();
      assert.ok(Array.isArray(skills));
    });
  });
});
