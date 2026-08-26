export interface LlmDiscoveryEntry {
  name: string;
  provider: string;
  description: string;
  source: 'default' | 'registry' | 'remote';
}

export class AgentLlmDiscovery {
  private readonly repositories: string[];

  constructor(repositories: string[] = []) {
    this.repositories = repositories;
  }

  async discover(query = ''): Promise<LlmDiscoveryEntry[]> {
    const search = query.trim().toLowerCase();
    const local: LlmDiscoveryEntry[] = [
      { name: 'ollama', provider: 'ollama', description: 'LLM local via Ollama', source: 'default' },
      { name: 'openrouter', provider: 'openrouter', description: 'OpenRouter gateway', source: 'default' },
      { name: 'openai', provider: 'openai', description: 'OpenAI native integration', source: 'default' },
    ];

    const remote = this.repositories.map((repository, index) => ({
      name: `remote-llm-${index}`,
      provider: 'remote',
      description: `Remote provider catalog entry: ${repository}`,
      source: 'remote' as const,
    }));

    const all = [...local, ...remote];
    if (!search) {
      return all;
    }

    return all.filter((entry) => `${entry.name} ${entry.description}`.toLowerCase().includes(search));
  }

  describe() {
    return {
      repositories: this.repositories,
      supported: ['ollama', 'openrouter', 'openai', 'anthropic', 'custom'],
    };
  }
}

export function createAgentLlmDiscovery(repositories: string[] = []): AgentLlmDiscovery {
  return new AgentLlmDiscovery(repositories);
}
