export type LlmProvider = 'openai' | 'anthropic' | 'ollama' | 'openrouter' | 'custom';

export interface LlmMessage {
  role: string;
  content: string;
}

export interface LlmTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LlmCallOptions {
  messages: LlmMessage[];
  model?: string;
  tools?: LlmTool[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface LlmAccessPolicy {
  tools?: string[];
  skills?: string[];
  mcps?: string[];
}

export interface LlmResponse {
  content: string;
  toolCalls?: Array<{ name: string; arguments: unknown }>;
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface LlmConfig {
  id?: string;
  provider?: LlmProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  endpoint?: string;
  customParams?: Record<string, unknown>;
  access?: LlmAccessPolicy;
  [key: string]: unknown;
}

export interface LlmAdapter {
  call(options: LlmCallOptions): Promise<LlmResponse>;
  describe(): { id: string; provider: LlmProvider; model: string };
}
