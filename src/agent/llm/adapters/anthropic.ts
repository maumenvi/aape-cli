import type { LlmAdapter, LlmCallOptions, LlmConfig, LlmMessage, LlmResponse, LlmTool } from '../provider.ts';

export class AnthropicAdapter {
  private readonly config: LlmConfig & { id: string; provider: 'anthropic' };

  constructor(config: LlmConfig) {
    this.config = {
      ...config,
      id: config.id ?? `anthropic-${config.model}`,
      provider: (config.provider ?? 'anthropic') as 'anthropic',
    };
  }

  async call(options: LlmCallOptions): Promise<LlmResponse> {
    const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Anthropic apiKey not configured');

    const systemMessage = options.messages.find((m: LlmMessage) => m.role === 'system')?.content;
    const messages = options.messages.filter((m: LlmMessage) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: options.maxTokens ?? 1024,
        system: systemMessage,
        messages,
        tools: options.tools?.map((t: LlmTool) => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json() as any;

    let content = '';
    let toolCalls: Array<{ name: string; arguments: unknown }> | undefined;

    for (const block of data.content) {
      if (block.type === 'text') {
        content = block.text;
      } else if (block.type === 'tool_use') {
        if (!toolCalls) toolCalls = [];
        toolCalls.push({
          name: block.name,
          arguments: block.input,
        });
      }
    }

    return {
      content,
      toolCalls,
      finishReason: toolCalls ? 'tool_calls' : 'stop',
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
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

export function createAnthropicAdapter(config: LlmConfig): LlmAdapter {
  return new AnthropicAdapter(config);
}
