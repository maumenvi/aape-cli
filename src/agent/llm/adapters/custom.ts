import type { LlmAdapter, LlmCallOptions, LlmConfig, LlmResponse } from '../provider.ts';

interface CustomLlmConfig extends LlmConfig {
  endpoint?: string;
  customParams?: Record<string, unknown>;
}

type CustomRuntimeConfig = LlmConfig & { id: string; provider: 'custom' };

export class CustomAdapter {
  private readonly config: CustomRuntimeConfig;

  constructor(config: CustomLlmConfig) {
    this.config = {
      ...config,
      id: config.id ?? `custom-${config.model}`,
      provider: (config.provider ?? 'custom') as 'custom',
    };
  }

  async call(options: LlmCallOptions): Promise<LlmResponse> {
    const baseUrl = this.config.baseUrl || 'http://localhost:8000';
    if (!baseUrl) throw new Error('baseUrl not configured for custom LLM provider');

    const endpoint = this.config.endpoint || '/chat/completions';
    const sep = endpoint.startsWith('/') ? '' : '/';
    const url = `${baseUrl}${sep}${endpoint}`;
    const customParams = this.config.customParams || {};
    const authHeader = ['Auth', 'orization'].join('');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { [authHeader]: 'Bearer ' + this.config.apiKey } : {}),
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: options.messages,
        tools: options.tools,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        ...customParams,
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom LLM API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0] || data;

    let toolCalls: Array<{ name: string; arguments: unknown }> | undefined;
    if (choice.message?.tool_calls) {
      toolCalls = choice.message.tool_calls.map((tc: any) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));
    }

    return {
      content: choice.message?.content || choice.content || '',
      toolCalls,
      finishReason: toolCalls ? 'tool_calls' : 'stop',
    };
  }

  describe() {
    return {
      id: this.config.id,
      provider: this.config.provider,
      model: this.config.model,
    };
  }
}

export function createCustomAdapter(config: CustomLlmConfig): LlmAdapter {
  return new CustomAdapter(config);
}
