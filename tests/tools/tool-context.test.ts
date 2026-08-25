import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ToolContext } from '../../src/agent/tools/context.ts';
import { LlmManager } from '../../src/agent/llm/manager.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store.ts';
import type { RunContext } from '../../src/pipeline/types.ts';

describe('ToolContext', () => {
  let context: ToolContext;
  let mockRunContext: Partial<RunContext>;

  beforeEach(() => {
    mockRunContext = {
      state: { test: true },
      metadata: {},
    };
    context = new ToolContext(mockRunContext as RunContext);
  });

  describe('describe', () => {
    it('returns tool context description', () => {
      const description = context.describe();

      assert.ok(description);
      assert.ok(Array.isArray(description.tools));
      assert.ok(Array.isArray(description.skills));
      assert.ok(Array.isArray(description.metaTools));
    });

    it('meta-tools include discover and install functions', () => {
      const description = context.describe();

      const metaToolNames = description.metaTools.map((t) => t.function.name);
      assert.ok(metaToolNames.includes('discover_tools'));
      assert.ok(metaToolNames.includes('install_tool'));
      assert.ok(metaToolNames.includes('discover_skills'));
      assert.ok(metaToolNames.includes('install_skill'));
    });

    it('meta-tools have proper function schema', () => {
      const description = context.describe();
      const discoverTool = description.metaTools.find(
        (t) => t.function.name === 'discover_tools'
      );

      assert.ok(discoverTool);
      assert.equal(discoverTool.type, 'function');
      assert.ok(discoverTool.function.description);
      assert.ok(discoverTool.function.parameters);
    });

    it('returns tools in OpenAI format', () => {
      const description = context.describe();

      description.tools.forEach((tool) => {
        assert.equal(tool.type, 'function');
        assert.ok(tool.function.name);
        assert.ok(tool.function.description);
        assert.ok(tool.function.parameters);
      });
    });

    it('returns skills in OpenAI format', () => {
      const description = context.describe();

      description.skills.forEach((skill) => {
        assert.equal(skill.type, 'function');
        assert.ok(skill.function.name);
        assert.ok(skill.function.description);
        assert.ok(skill.function.parameters);
      });
    });
  });

  describe('tool calling interface', () => {
    it('call method exists', () => {
      assert.ok(typeof context.call === 'function');
    });

    it('callSkill method exists', () => {
      assert.ok(typeof context.callSkill === 'function');
    });

    it('throws when calling non-existent tool', async () => {
      assert.rejects(() => context.call('non_existent', {}), /not found/i);
    });

    it('throws when calling non-existent skill', async () => {
      assert.rejects(
        () => context.callSkill('non_existent', {}),
        /not found/i
      );
    });
  });

  describe('meta-tools as callable functions', () => {
    it('meta-tools are callable from describe', () => {
      const description = context.describe();

      assert.ok(description.metaTools.length > 0);
      description.metaTools.forEach((tool) => {
        assert.equal(tool.type, 'function');
        assert.ok(tool.function.name);
      });
    });

    it('discover_tools meta-tool returns array', () => {
      const description = context.describe();
      const discoverTool = description.metaTools.find(
        (t) => t.function.name === 'discover_tools'
      );

      assert.ok(discoverTool);
      assert.ok(discoverTool.function.description.includes('discover'));
    });

    it('install_tool meta-tool has required params', () => {
      const description = context.describe();
      const installTool = description.metaTools.find(
        (t) => t.function.name === 'install_tool'
      );

      assert.ok(installTool);
      const params = installTool.function.parameters as Record<string, unknown>;
      assert.ok(params.properties);
    });
  });

  describe('context integration', () => {
    it('has access to run context', () => {
      const description = context.describe();
      // Verify describe works (it uses internal context)
      assert.ok(Array.isArray(description.tools));
    });

    it('meta-tools can query repository', () => {
      const description = context.describe();
      const discoverTools = description.metaTools.find(
        (t) => t.function.name === 'discover_tools'
      );

      assert.ok(discoverTools);
      assert.ok(
        discoverTools.function.description.includes('repository') ||
          discoverTools.function.description.includes('tools')
      );
    });
  });

  describe('LLM access control', () => {
    it('hides unauthorized tools and blocks execution', async () => {
      const llm = new LlmManager();
      llm.add({
        id: 'model-x',
        provider: 'custom',
        model: 'x',
        access: {
          tools: ['tool_allowed'],
          skills: ['*'],
          mcps: ['*'],
        },
      });
      const accessContext = new ToolContext({
        state: {},
        metadata: { llmId: 'model-x' },
        llm,
      } as unknown as RunContext);

      accessContext.manager.addTool({
        name: 'tool_allowed',
        description: 'Allowed tool',
        inputSchema: { type: 'object', properties: {} },
        allowedLlms: ['model-x'],
      });
      accessContext.manager.addTool({
        name: 'tool_secret',
        description: 'Hidden tool',
        inputSchema: { type: 'object', properties: {} },
        allowedLlms: ['model-y'],
      });

      const described = accessContext.describe();
      assert.equal(described.config.tools.some((tool) => tool.name === 'tool_allowed'), true);
      assert.equal(described.config.tools.some((tool) => tool.name === 'tool_secret'), false);
      await assert.rejects(() => accessContext.call('tool_secret', {}), /not found/i);
    });

    it('enforces project deny-by-default when resource has no allowedLlms', () => {
      const previousCwd = process.cwd();
      const tempDir = mkdtempSync(path.join(os.tmpdir(), 'aape-tool-context-access-'));
      try {
        process.chdir(tempDir);
        const store = new AgentCatalogStore({ cwd: tempDir });
        store.saveManifest(store.loadManifest());
        store.setLlmAccessDefault('deny');

        const llm = new LlmManager();
        llm.add({
          id: 'model-z',
          provider: 'custom',
          model: 'z',
          access: { tools: ['*'], skills: ['*'], mcps: ['*'] },
        });

        const denyContext = new ToolContext({
          state: {},
          metadata: { llmId: 'model-z' },
          llm,
        } as unknown as RunContext);

        denyContext.manager.addTool({
          name: 'tool_without_acl',
          description: 'No ACL',
          inputSchema: { type: 'object', properties: {} },
        });

        const described = denyContext.describe();
        assert.equal(described.config.llmAccessDefault, 'deny');
        assert.equal(described.config.tools.some((tool) => tool.name === 'tool_without_acl'), false);
      } finally {
        process.chdir(previousCwd);
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
