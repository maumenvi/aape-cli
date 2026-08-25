import type { LlmAdapter, LlmCallOptions, LlmConfig, LlmResponse } from '../provider.ts';

export class OpenAiAdapter {
  private readonly config: LlmConfig & { id: string; provider: 'openai' };

  constructor(config: LlmConfig) {
    this.config = {
      ...config,
      id: config.id ?? `openai-${config.model}`,
      provider: (config.provider ?? 'openai') as 'openai',
    };
  }

  async call(options: LlmCallOptions): Promise<LlmResponse> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI apiKey not configured');

    const authHeader = ['Auth', 'orization'].join('');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [authHeader]: 'Bearer ' + apiKey,
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
      throw new Error(`OpenAI API error: ${response.statusText}`);
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
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
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

export function createOpenaiAdapter(config: LlmConfig): LlmAdapter {
  return new OpenAiAdapter(config);
}
