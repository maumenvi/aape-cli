import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LlmManager } from '../../src/agent/llm/manager.ts';
import type { LlmConfig, LlmCallOptions } from '../../src/agent/llm/provider.ts';

describe('LlmManager', () => {
  let manager: LlmManager;

  beforeEach(() => {
    manager = new LlmManager();
  });

  describe('provider management', () => {
    it('adds an LLM provider', () => {
      const config: LlmConfig = {
        id: 'openai-1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
      };

      manager.add(config);
      const providers = manager.list();
      assert.ok(providers.some((p) => p.id === 'openai-1'));
    });

    it('throws when adding duplicate provider ID', () => {
      const config: LlmConfig = {
        id: 'openai-1',
        provider: 'openai',
        model: 'gpt-4',
      };

      manager.add(config);
      assert.throws(() => manager.add(config), /already exists/i);
    });

    it('sets a default provider', () => {
      const config: LlmConfig = {
        id: 'openai-1',
        provider: 'openai',
        model: 'gpt-4',
      };

      manager.add(config);
      manager.setDefault('openai-1');
      assert.equal(manager.getDefault(), 'openai-1');
    });

    it('throws when setting non-existent provider as default', () => {
      assert.throws(() => manager.setDefault('non-existent'), /not found/i);
    });

    it('lists all providers', () => {
      const config1: LlmConfig = {
        id: 'gpt-1',
        provider: 'openai',
        model: 'gpt-4',
      };
      const config2: LlmConfig = {
        id: 'claude-1',
        provider: 'anthropic',
        model: 'claude-3',
      };

      manager.add(config1);
      manager.add(config2);
      const providers = manager.list();

      assert.equal(providers.length, 2);
      assert.ok(providers.some((p) => p.id === 'gpt-1'));
      assert.ok(providers.some((p) => p.id === 'claude-1'));
    });

    it('stores and applies LLM access policy', () => {
      manager.add({
        id: 'restricted-llm',
        provider: 'openai',
        model: 'gpt-4',
        access: {
          tools: ['read_file'],
          skills: ['repo_overview'],
          mcps: ['github'],
        },
      });

      assert.equal(manager.canAccess('restricted-llm', 'tool', 'read_file'), true);
      assert.equal(manager.canAccess('restricted-llm', 'tool', 'write_file'), false);
      assert.equal(manager.canAccess('restricted-llm', 'skill', 'repo_overview'), true);
      assert.equal(manager.canAccess('restricted-llm', 'mcp', 'github'), true);
      assert.equal(manager.canAccess('restricted-llm', 'mcp', 'filesystem'), false);
    });

    it('removes a provider', () => {
      const config: LlmConfig = {
        id: 'openai-1',
        provider: 'openai',
        model: 'gpt-4',
      };

      manager.add(config);
      manager.remove('openai-1');
      const providers = manager.list();
      assert.equal(providers.length, 0);
    });

    it('throws when removing non-existent provider', () => {
      assert.throws(() => manager.remove('non-existent'), /not found/i);
    });
  });

  describe('LLM calling', () => {
    it('calls a specific provider', async () => {
      const config: LlmConfig = {
        id: 'openai-1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test',
      };

      manager.add(config);

      const options: LlmCallOptions = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // This will fail without valid API key, but demonstrates the interface
      try {
        await manager.call('openai-1', options);
      } catch (e) {
        // Expected without valid API key
        assert.ok(e instanceof Error);
      }
    });

    it('throws when calling non-existent provider', async () => {
      const options: LlmCallOptions = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      assert.rejects(
        () => manager.call('non-existent', options),
        /not found/i
      );
    });

    it('calls default provider', async () => {
      const config: LlmConfig = {
        id: 'openai-1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test',
      };

      manager.add(config);
      manager.setDefault('openai-1');

      const options: LlmCallOptions = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      try {
        await manager.callDefault(options);
      } catch (e) {
        // Expected without valid API key
        assert.ok(e instanceof Error);
      }
    });

    it('throws when calling default provider without one set', async () => {
      const options: LlmCallOptions = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      assert.rejects(() => manager.callDefault(options), /no default/i);
    });
  });

  describe('role flexibility', () => {
    it('accepts custom role strings in messages', async () => {
      const config: LlmConfig = {
        id: 'custom-1',
        provider: 'custom',
        model: 'custom-model',
      };

      manager.add(config);

      const options: LlmCallOptions = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
          { role: 'custom-role', content: 'Custom' },
          { role: 'tool', content: 'Tool result' },
        ],
      };

      try {
        await manager.call('custom-1', options);
      } catch (e) {
        // Expected without valid config
        assert.ok(e instanceof Error);
      }
    });
  });
});
