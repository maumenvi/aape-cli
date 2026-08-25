import { canLlmAccessResource, normalizeLlmAccessPolicy, type AccessResourceKind } from '../access/policy.ts';
import type { LlmAccessPolicy, LlmAdapter, LlmCallOptions, LlmConfig, LlmResponse } from './provider.ts';
import { createOpenaiAdapter } from './adapters/openai.ts';
import { createAnthropicAdapter } from './adapters/anthropic.ts';
import { createOllamaAdapter } from './adapters/ollama.ts';
import { createOpenrouterAdapter } from './adapters/openrouter.ts';
import { createCustomAdapter } from './adapters/custom.ts';
import { resolveDefaultLlmProvider } from '../../config/index.ts';

function createAdapter(config: LlmConfig): LlmAdapter {
  switch (config.provider ?? 'ollama') {
    case 'openai':
      return createOpenaiAdapter(config);
    case 'anthropic':
      return createAnthropicAdapter(config);
    case 'ollama':
      return createOllamaAdapter(config);
    case 'openrouter':
      return createOpenrouterAdapter(config);
    case 'custom':
      return createCustomAdapter(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider ?? 'ollama'}`);
  }
}

export class LlmManager {
  private adapters = new Map<string, LlmAdapter>();
  private accessPolicies = new Map<string, Required<LlmAccessPolicy>>();
  private defaultId: string | null = null;
  private onUsageCallback?: (delta: { tokens: number; costUsd: number }) => void;

  add(config: LlmConfig): LlmManager {
    const resolvedId = config.id ?? `${config.provider ?? 'ollama'}-${config.model}`;
    const normalizedConfig: LlmConfig = {
      ...config,
      id: resolvedId,
      provider: config.provider ?? 'ollama',
    };

    if (this.adapters.has(resolvedId)) {
      throw new Error(`LLM provider "${resolvedId}" already exists`);
    }

    const adapter = createAdapter(normalizedConfig);
    this.adapters.set(resolvedId, adapter);
    this.accessPolicies.set(resolvedId, normalizeLlmAccessPolicy(config.access));
    if (!this.defaultId) this.defaultId = resolvedId;
    return this;
  }

  remove(id: string): LlmManager {
    if (!this.adapters.has(id)) {
      throw new Error(`LLM provider "${id}" not found`);
    }

    this.adapters.delete(id);
    this.accessPolicies.delete(id);
    if (this.defaultId === id) {
      this.defaultId = this.adapters.keys().next().value ?? null;
    }
    return this;
  }

  setDefault(id: string): LlmManager {
    if (!this.adapters.has(id)) {
      throw new Error(`LLM provider "${id}" not found`);
    }
    this.defaultId = id;
    return this;
  }

  getDefault(): string | null {
    return this.defaultId;
  }

  async call(id: string, options: LlmCallOptions): Promise<LlmResponse> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(`LLM provider "${id}" not found`);
    }
    const response = await adapter.call(options);
    
    if (this.onUsageCallback && response.usage) {
      this.onUsageCallback({
        tokens: response.usage.totalTokens,
        costUsd: this.estimateCost(id, response.usage),
      });
    }
    
    return response;
  }

  async callDefault(options: LlmCallOptions): Promise<LlmResponse> {
    if (!this.defaultId) {
      throw new Error('No default LLM provider configured');
    }
    return this.call(this.defaultId, options);
  }

  list(): Array<{ id: string; provider: string; model: string }> {
    return Array.from(this.adapters.values()).map((a) => {
      const desc = a.describe();
      return {
        id: desc.id,
        provider: desc.provider,
        model: desc.model,
      };
    });
  }

  describe() {
    return {
      default: this.getDefault(),
      providers: this.list(),
    };
  }

  getAccessPolicy(id: string): Required<LlmAccessPolicy> {
    if (!this.adapters.has(id)) {
      throw new Error(`LLM provider "${id}" not found`);
    }
    return this.accessPolicies.get(id) ?? normalizeLlmAccessPolicy();
  }

  canAccess(id: string, kind: AccessResourceKind, resourceName: string, resourceAllowedLlms?: string[]): boolean {
    return canLlmAccessResource(id, kind, resourceName, this.getAccessPolicy(id), resourceAllowedLlms);
  }

  setOnUsageCallback(callback?: (delta: { tokens: number; costUsd: number }) => void): LlmManager {
    this.onUsageCallback = callback;
    return this;
  }

  private estimateCost(
    providerId: string,
    usage: { inputTokens: number; outputTokens: number; totalTokens: number },
  ): number {
    const adapter = this.adapters.get(providerId);
    if (!adapter) return 0;

    const desc = adapter.describe();
    const rates = this.getTokenRates(desc.provider, desc.model);
    return (usage.inputTokens * rates.input + usage.outputTokens * rates.output) / 1000000;
  }

  private getTokenRates(provider: string, model: string): { input: number; output: number } {
    const ratesMap: Record<string, Record<string, { input: number; output: number }>> = {
      openai: {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      },
      anthropic: {
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      },
      ollama: {
        llama2: { input: 0, output: 0 },
      },
    };
    return ratesMap[provider]?.[model] ?? { input: 0, output: 0 };
  }
}

export class AgentLlmManager extends LlmManager {
  constructor(defaultConfig: Partial<LlmConfig> = {}) {
    super();

    const configuredProvider = defaultConfig.provider ?? resolveDefaultLlmProvider();
    const model = defaultConfig.model ?? 'llama3.1';
    const apiKey = defaultConfig.apiKey;

    if (configuredProvider === 'openrouter' && !apiKey) {
      this.add({
        provider: 'openrouter',
        model,
        apiKey: process.env.OPENROUTER_API_KEY ?? process.env.OPEN_ROUTER_KEY ?? process.env.OPENROUTER_KEY,
      });
      return;
    }

    if (configuredProvider === 'ollama') {
      this.add({ provider: 'ollama', model, baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434' });
      return;
    }

    this.add({ provider: configuredProvider ?? 'ollama', model, apiKey });
  }
}

export function createLlmManager(): LlmManager {
  return new LlmManager();
}

export function createAgentLlmManager(defaultConfig: Partial<LlmConfig> = {}): AgentLlmManager {
  return new AgentLlmManager(defaultConfig);
}
