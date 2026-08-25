import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Pipeline } from '../../src/pipeline/pipeline.ts';
import { LlmManager } from '../../src/agent/llm/manager.ts';
import { SkillRegistry } from '../../src/agent/skills/manager.ts';
import { McpManager } from '../../src/agent/mcp/manager/index.ts';
import { ToolContext } from '../../src/agent/tools/context.ts';
import type { LlmConfig } from '../../src/agent/llm/provider.ts';

interface IntegrationState {
  input?: string;
  output?: string;
  messages?: string[];
  processed?: boolean;
  llm_ok?: boolean;
  llm_exists?: boolean;
  tools_exist?: boolean;
}

describe('AI Runtime Integration', () => {
  let pipeline: Pipeline<IntegrationState>;
  let llmManager: LlmManager;
  let skillRegistry: SkillRegistry;
  let mcpManager: McpManager;

  beforeEach(() => {
    pipeline = new Pipeline<IntegrationState>();
    llmManager = new LlmManager();
    skillRegistry = new SkillRegistry();
    mcpManager = new McpManager();
  });

  describe('pipeline with LLM capabilities', () => {
    it('creates pipeline with LLM manager', () => {
      const config: LlmConfig = {
        id: 'gpt-4',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test',
      };

      llmManager.add(config);
      llmManager.setDefault('gpt-4');

      const providers = llmManager.list();
      assert.equal(providers.length, 1);
      assert.equal(llmManager.getDefault(), 'gpt-4');
    });

    it('creates node that can access LLM context', async () => {
      const config: LlmConfig = {
        id: 'gpt-4',
        provider: 'openai',
        model: 'gpt-4',
      };

      llmManager.add(config);

      pipeline.addNode('analyze', (state, ctx) => {
        // Node has access to LLM manager via context
        assert.ok(ctx);
        if (ctx.llm) {
          const providers = ctx.llm.list();
          assert.ok(Array.isArray(providers));
        }
        return state;
      });

      pipeline.addEdge('START', 'analyze').addEdge('analyze', 'END');

      const result = await pipeline.run(
        { input: 'test' },
        {
          llm: llmManager,
          tools: new ToolContext({
            state: { input: 'test' },
            metadata: {},
          } as any),
        }
      );

      assert.equal(result.input, 'test');
    });
  });

  describe('pipeline with tools', () => {
    it('creates pipeline with tool context', () => {
      const toolCtx = new ToolContext({
        state: { input: 'test' },
        metadata: {},
      } as any);

      const description = toolCtx.describe();
      assert.ok(description);
      assert.ok(Array.isArray(description.tools));
      assert.ok(Array.isArray(description.skills));
      assert.ok(Array.isArray(description.metaTools));
    });

    it('node can call tools via context', async () => {
      const toolCtx = new ToolContext({
        state: { input: 'test' },
        metadata: {},
      } as any);

      pipeline.addNode('process', (state, ctx) => {
        if (ctx.tools) {
          const tools = ctx.tools.describe();
          assert.ok(tools);
        }
        return { ...state, output: 'processed' };
      });

      pipeline.addEdge('START', 'process').addEdge('process', 'END');

      const result = await pipeline.run(
        { input: 'test' },
        {
          tools: toolCtx,
        }
      );

      assert.equal(result.output, 'processed');
    });
  });

  describe('complete AI agent flow', () => {
    it('orchestrates LLM + tools + skills', async () => {
      // Setup LLM
      llmManager.add({
        id: 'default-llm',
        provider: 'openai',
        model: 'gpt-4',
      });
      llmManager.setDefault('default-llm');

      // Setup tools context
      const toolCtx = new ToolContext({
        state: { input: 'analyze this text' },
        metadata: {},
      } as any);

      // Create agent node
      pipeline.addNode('agent', (state, ctx) => {
        assert.ok(ctx.llm);
        assert.ok(ctx.tools);

        // Agent can describe available tools
        const toolsInfo = ctx.tools!.describe();
        assert.ok(toolsInfo);

        // Agent can list LLM providers
        const llms = ctx.llm!.list();
        assert.ok(Array.isArray(llms));

        return {
          ...state,
          output: 'Agent processed input',
        };
      });

      pipeline
        .addEdge('START', 'agent')
        .addEdge('agent', 'END');

      const result = await pipeline.run(
        { input: 'test query' },
        {
          llm: llmManager,
          tools: toolCtx,
        }
      );

      assert.equal(result.input, 'test query');
      assert.equal(result.output, 'Agent processed input');
    });

    it('supports multi-turn agent interactions', async () => {
      llmManager.add({
        id: 'default-llm',
        provider: 'openai',
        model: 'gpt-4',
      });

      const toolCtx = new ToolContext({
        state: { messages: [] },
        metadata: {},
      } as any);

      let turnCount = 0;

      pipeline.addNode('agent-loop', (state: any, ctx) => {
        turnCount++;

        // Each turn can access fresh LLM and tools
        assert.ok(ctx.llm);
        assert.ok(ctx.tools);

        const tools = ctx.tools!.describe();
        const llms = ctx.llm!.list();

        assert.ok(Array.isArray(tools.tools));
        assert.ok(Array.isArray(llms));

        return {
          ...state,
          messages: [...(state.messages || []), `Turn ${turnCount}`],
        };
      });

      pipeline
        .addEdge('START', 'agent-loop')
        .addEdge('agent-loop', 'END');

      const result = await pipeline.run(
        { messages: [] },
        {
          llm: llmManager,
          tools: toolCtx,
        }
      );

      assert.ok(result.messages);
      assert.equal(result.messages[0], 'Turn 1');
    });
  });

  describe('repository configuration', () => {
    it('supports multiple MCP repositories', () => {
      // Verify manager structure
      assert.ok(mcpManager.list instanceof Function);
      assert.ok(mcpManager.discover instanceof Function);
    });

    it('supports multiple skill repositories', async () => {
      // Verify registry structure
      const skills = skillRegistry.list();
      assert.ok(Array.isArray(skills));
    });

    it('LLM can discover tools from repositories', async () => {
      // Create tool context that exposes repository access
      const toolCtx = new ToolContext({
        state: {},
        metadata: {},
      } as any);

      const description = toolCtx.describe();

      // Verify meta-tools are present for discovery
      const discoverTool = description.metaTools.find(
        (t) => t.function.name === 'discover_tools'
      );
      assert.ok(discoverTool);
    });

    it('LLM can install skills at runtime', async () => {
      const toolCtx = new ToolContext({
        state: {},
        metadata: {},
      } as any);

      const description = toolCtx.describe();

      const installSkill = description.metaTools.find(
        (t) => t.function.name === 'install_skill'
      );
      assert.ok(installSkill);
    });
  });

  describe('backward compatibility', () => {
    it('pipeline works without LLM context', async () => {
      pipeline.addNode('simple', (state) => ({
        ...state,
        processed: true,
      }));

      pipeline.addEdge('START', 'simple').addEdge('simple', 'END');

      // Run without llm and tools - should work fine
      const result = await pipeline.run({ input: 'test' });
      assert.equal(result.processed, true);
    });

    it('pipeline works without tools context', async () => {
      llmManager.add({
        id: 'llm-1',
        provider: 'openai',
        model: 'gpt-4',
      });

      pipeline.addNode('llm-node', (state, ctx) => {
        // Can access LLM without tools
        assert.ok(ctx.llm);
        return { ...state, llm_ok: true };
      });

      pipeline.addEdge('START', 'llm-node').addEdge('llm-node', 'END');

      const result = await pipeline.run(
        { input: 'test' },
        { llm: llmManager }
      );

      assert.equal(result.llm_ok, true);
    });

    it('context fields are optional', async () => {
      pipeline.addNode('check-context', (state, ctx) => {
        // Both fields can be undefined
        const llmExists = ctx.llm !== undefined;
        const toolsExist = ctx.tools !== undefined;

        return {
          ...state,
          llm_exists: llmExists,
          tools_exist: toolsExist,
        };
      });

      pipeline
        .addEdge('START', 'check-context')
        .addEdge('check-context', 'END');

      const result = await pipeline.run({ input: 'test' });
      assert.equal(result.llm_exists, false);
      assert.equal(result.tools_exist, false);
    });
  });
});
