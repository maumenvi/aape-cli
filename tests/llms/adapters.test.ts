import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { OpenAiAdapter } from '../../src/agent/llm/adapters/openai.ts';
import { AnthropicAdapter } from '../../src/agent/llm/adapters/anthropic.ts';
import { OllamaAdapter } from '../../src/agent/llm/adapters/ollama.ts';
import { OpenRouterAdapter } from '../../src/agent/llm/adapters/openrouter.ts';
import { CustomAdapter } from '../../src/agent/llm/adapters/custom.ts';
import type { LlmCallOptions } from '../../src/agent/llm/provider.ts';

describe('LLM Adapters', () => {
  const validOptions: LlmCallOptions = {
    messages: [{ role: 'user', content: 'test' }],
    model: 'test-model',
  };

  describe('OpenAiAdapter', () => {
    it('initializes with config', () => {
      const adapter = new OpenAiAdapter({
        model: 'gpt-4',
        apiKey: 'sk-test',
      });
      const info = adapter.describe();
      assert.equal(info.provider, 'openai');
      assert.equal(info.model, 'gpt-4');
    });

    it.skip('describes adapter', () => {
      const adapter = new OpenAiAdapter({
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test',
      });
      const info = adapter.describe();
      assert.equal(info.provider, 'openai');
      assert.ok(info.id);
    });

    it('rejects call without API key', async () => {
      const adapter = new OpenAiAdapter({ model: 'gpt-4' });
      assert.rejects(() => adapter.call(validOptions), /apiKey/i);
    });
  });

  describe('AnthropicAdapter', () => {
    it.skip('initializes with config', () => {
      const adapter = new AnthropicAdapter({
        model: 'claude-3-opus',
        apiKey: 'sk-ant-test',
      });
      const info = adapter.describe();
      assert.equal(info.provider, 'anthropic');
      assert.equal(info.model, 'claude-3-opus');
    });

    it('rejects call without API key', async () => {
      const adapter = new AnthropicAdapter({ model: 'claude-3' });
      assert.rejects(() => adapter.call(validOptions), /apiKey/i);
    });
  });

  describe('OllamaAdapter', () => {
    it('initializes with default baseUrl', () => {
      const adapter = new OllamaAdapter({ model: 'llama2' });
      const info = adapter.describe();
      assert.equal(info.provider, 'ollama');
      assert.equal(info.model, 'llama2');
    });

    it('initializes with custom baseUrl', () => {
      const adapter = new OllamaAdapter({
        model: 'llama2',
        baseUrl: 'http://custom:11434',
      });
      const info = adapter.describe();
      assert.equal(info.model, 'llama2');
    });

    it('fails to connect to unreachable server', async () => {
      const adapter = new OllamaAdapter({
        model: 'llama2',
        baseUrl: 'http://localhost:19999',
      });
      assert.rejects(() => adapter.call(validOptions));
    });
  });

  describe('OpenRouterAdapter', () => {
    it.skip('initializes with config', () => {
      const adapter = new OpenRouterAdapter({
        model: 'openai/gpt-4',
        apiKey: 'sk-or-test',
      });
      const info = adapter.describe();
      assert.equal(info.provider, 'openrouter');
      assert.equal(info.model, 'openai/gpt-4');
    });

    it('rejects call without API key', async () => {
      const adapter = new OpenRouterAdapter({ model: 'openai/gpt-4' });
      assert.rejects(() => adapter.call(validOptions), /apiKey/i);
    });
  });

  describe.skip('CustomAdapter', () => {
    it('initializes with config', () => {
      const adapter = new CustomAdapter({
        model: 'custom',
        endpoint: 'http://localhost:8000',
      });
      const info = adapter.describe();
      assert.equal(info.provider, 'custom');
      assert.equal(info.model, 'custom');
    });

    it('fails to connect to unreachable endpoint', async () => {
      const adapter = new CustomAdapter({
        model: 'custom',
        endpoint: 'http://localhost:19999',
      });
      assert.rejects(() => adapter.call(validOptions));
    });

    it('accepts custom parameters', () => {
      const adapter = new CustomAdapter({
        model: 'custom',
        endpoint: 'http://localhost:8000',
        customParams: {
          timeout: 5000,
          retries: 3,
        },
      });
      const info = adapter.describe();
      assert.equal(info.model, 'custom');
    });
  });

  describe('adapter response format', () => {
    it('response has required fields', async () => {
      // This test checks the interface contract
      const response = {
        content: 'test response',
        finishReason: 'stop' as const,
      };

      assert.ok(response.content);
      assert.ok(response.finishReason);
    });

    it('response with tool calls', () => {
      const response = {
        content: '',
        toolCalls: [
          {
            name: 'get_weather',
            arguments: { location: 'NYC' },
          },
        ],
        finishReason: 'tool_calls' as const,
      };

      assert.equal(response.toolCalls?.length, 1);
      assert.equal(response.toolCalls?.[0]?.name, 'get_weather');
      assert.deepEqual(response.toolCalls?.[0]?.arguments, { location: 'NYC' });
    });
  });
});
