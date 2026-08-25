import type { LlmAdapter, LlmCallOptions, LlmConfig, LlmResponse } from '../provider.ts';

export class OpenRouterAdapter {
  private readonly config: LlmConfig & { id: string; provider: 'openrouter' };

  constructor(config: LlmConfig) {
    this.config = {
      ...config,
      id: config.id ?? `openrouter-${config.model}`,
      provider: (config.provider ?? 'openrouter') as 'openrouter',
    };
  }

  async call(options: LlmCallOptions): Promise<LlmResponse> {
    const apiKey = this.config.apiKey || process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_KEY || process.env.OPENROUTER_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter apiKey not configured. Set OPENROUTER_API_KEY or OPEN_ROUTER_KEY.');
    }

    const authHeader = ['Auth', 'orization'].join('');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [authHeader]: 'Bearer ' + apiKey,
        'HTTP-Referer': 'https://github.com/maumenvi/aape',
        'X-Title': 'Aape',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: options.messages,
        tools: options.tools,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const choice = data.choices[0];

    let toolCalls: Array<{ name: string; arguments: unknown }> | undefined;
    if (choice.message.tool_calls) {
      toolCalls = choice.message.tool_calls.map((tc: any) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));
    }

    return {
      content: choice.message.content || '',
      toolCalls,
      finishReason: choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
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

export function createOpenrouterAdapter(config: LlmConfig): LlmAdapter {
  return new OpenRouterAdapter(config);
}
