import type { LlmAdapter, LlmCallOptions, LlmConfig, LlmResponse } from '../provider.ts';

export class OllamaAdapter {
  private readonly config: LlmConfig & { id: string; provider: 'ollama' };

  constructor(config: LlmConfig) {
    this.config = {
      ...config,
      id: config.id ?? `ollama-${config.model}`,
      provider: (config.provider ?? 'ollama') as 'ollama',
    };
  }

  async call(options: LlmCallOptions): Promise<LlmResponse> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: options.messages,
        stream: false,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      content: data.message?.content || '',
      finishReason: 'stop',
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

export function createOllamaAdapter(config: LlmConfig): LlmAdapter {
  return new OllamaAdapter(config);
}
