import { App, createPipeline, START, END, createLlmManager, createMcpManager, createSkillRegistry, createToolContext } from '../src/index.ts';
import type { HttpState } from '../src/index.ts';

interface AgentState extends HttpState {
  query: string;
  result?: string;
}

const app = new App();

// Setup LLM Manager with multiple providers
const llmManager = createLlmManager()
  .add({
    id: 'gpt4',
    provider: 'openai',
    model: 'gpt-4-turbo',
    apiKey: process.env.OPENAI_API_KEY,
  })
  .add({
    id: 'claude',
    provider: 'anthropic',
    model: 'claude-3-opus',
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
  .add({
    id: 'local',
    provider: 'ollama',
    model: 'llama2',
    baseUrl: 'http://localhost:11434',
  })
  .setDefault('gpt4');

// Setup MCP Manager for tool integration
const mcpManager = createMcpManager()
  .addRepository({
    type: 'git',
    url: 'https://mcp-hub.ai',
    default: true,
  });

// Setup Skill Registry
const skillRegistry = createSkillRegistry()
  .addRepository({
    type: 'git',
    url: 'https://www.skills.sh',
    default: true,
  });

// Create an AI agent pipeline
const agentPipeline = createPipeline<AgentState>()
  .addNode('process_query', async (state, ctx) => {
    console.log('Processing query:', state.query);
    return { result: `Processing: ${state.query}` };
  })
  .addNode('llm_think', async (state, ctx) => {
    if (!ctx.llm) throw new Error('LLM not configured');

    // Get available tools and skills
    const toolCtx = ctx.tools;
    if (!toolCtx) throw new Error('Tools not configured');

    const { tools, skills } = await toolCtx.describe();

    // Call LLM with tools
    const response = await ctx.llm.callDefault({
      messages: [
        {
          role: 'user',
          content: state.query,
        },
      ],
      tools,
    });

    // Handle tool calls from LLM
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const call of response.toolCalls) {
        try {
          const toolResult = await toolCtx.call(call.name, call.arguments);
          console.log(`Tool ${call.name} result:`, toolResult);
        } catch (err) {
          console.error(`Tool ${call.name} failed:`, err);
        }
      }
    }

    return { result: response.content };
  })
  .addEdge(START, 'process_query')
  .addEdge('process_query', 'llm_think')
  .addEdge('llm_think', END);

// HTTP endpoint for AI agent
app.post('/agent', async ({ req, res }: HttpState) => {
  try {
    const body = await req.json() as { query: string };

    const result = await agentPipeline.run(
      {
        req,
        res,
        query: body.query,
      },
      {
        llm: llmManager,
        tools: createToolContext(mcpManager, skillRegistry, undefined),
      } as any,
    );

    res.json({
      ok: true,
      result: result.result,
    });
  } catch (err) {
    res.statusCode = 500;
    res.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// List available LLMs
app.get('/llms', ({ res }: HttpState) => {
  res.json({
    available: llmManager.list(),
    default: 'gpt4',
  });
});

// List available tools
app.get('/tools', async ({ res }: HttpState) => {
  const tools = await mcpManager.describe() as any;
  res.json(tools.config ?? { tools: tools.tools ?? [] });
});

// List available skills
app.get('/skills', async ({ res }: HttpState) => {
  const skills = await skillRegistry.describe() as any;
  res.json(skills.config ?? { skills: skills.registered ?? [] });
});

await app.listen(3000);
console.log('AI Agent server running on http://localhost:3000');
