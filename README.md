# Aape

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D26.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

> ⚠️ **Aviso:** o Aape ainda está em construção. A API pode evoluir e quebrar compatibilidade entre versões enquanto o framework amadurece.

Aape é um framework HTTP leve em TypeScript para Node.js, com foco em simplicidade e extensibilidade. Ele combina:

- roteamento por caminho e parâmetros
- pipeline de execução por grafo de nós
- handlers HTTP em estilo stateful pipeline
- validação leve integrada
- suporte a sub-routers e middlewares/pipes em formato de pipeline

O objetivo principal é manter uma base enxuta, previsível e fácil de estender para cenários de APIs e fluxos de autenticação/autorização.

## O que é

O Aape permite criar APIs HTTP com uma API similar a um framework web moderno, mas com uma arquitetura mais próxima de um motor de execução em pipeline:

- `App`: servidor HTTP principal
- `Router`: registro de rotas e sub-routers
- `Pipeline`: execução em grafo de passos
- `HttpState`: estado compartilhado entre os nós

Um handler pode retornar um pedaço do estado, e o pipeline combina esse estado ao longo da execução. Isso permite compor fluxos como autenticação, coleta de métricas, auditoria, validação e resposta final.

## Requisitos

- Node.js >= 26
- TypeScript nativo
- ESM

## Instalação

```bash
npm install @maumenvi/aape
```

## Catálogo de MCP/Skills/Tools (sources + source.lock)

O Aape usa um catálogo local transparente para dependências de agente:

- `sources`: manifesto editável do projeto
- `source.lock`: resolução fixa e verificável
- `.aape/context.dev.json`: contexto completo para desenvolvedor
- `.aape/context.llm.json`: contexto enxuto para LLM
- `.vscode/mcp.json`: sincronizado a partir do lock para MCP no formato nativo do VS Code

CLI estilo npm:

```bash
aape init
aape i skill repo_overview
aape i skill repo_overview --llms "model-x,model-y"
aape i skill repo_overview --all-llms
aape i mcp github --command npx --args '["-y","@modelcontextprotocol/server-github"]'
aape i mcp github --llms "model-x"
aape i mcp github-npx --transport npx --package "@modelcontextprotocol/server-github"
aape i mcp remote-api --transport http --url "https://mcp.example.com"
aape i mcp remote-sse --transport sse --url "https://mcp.example.com/sse"
aape i mcp remote-ws --transport ws --url "wss://mcp.example.com/ws"
aape i tool read_file
aape i tool read_file --llms "model-x"
aape lock
aape ci
aape verify
aape context build
aape mcp sync
```

Controle de acesso por LLM:

- `--llms "id1,id2"` restringe o recurso para LLMs específicas
- `--all-llms` libera para todas as LLMs (`*`)
- no `LlmManager`, você pode configurar allowlist por categoria (`tools`, `skills`, `mcps`)
- no `sources`, use `config.llmAccessDefault` com `allow` (padrão) ou `deny` (deny-by-default global)

```ts
llm.add({
  id: 'model-x',
  provider: 'openai',
  model: 'gpt-4o-mini',
  access: {
    tools: ['*'],
    skills: ['repo_overview'],
    mcps: ['github'],
  },
});
```

Exemplo de política global no `sources`:

```json
{
  "config": {
    "registryStrategy": "hybrid",
    "strictVerify": true,
    "llmAccessDefault": "deny"
  }
}
```

### MCP transports: futuras implementações (opcional/enterprise)

- Unix Domain Socket / Named Pipe (ambiente local/infra específica)
- stdio remoto via SSH/Docker exec (wrapper/orquestração, não protocolo novo)
- Streamable HTTP completo (sessão/eventos contínuos) para alinhamento estrito ao modo MCP HTTP mais novo

### Devtools (opcional)

```bash
npm install @maumenvi/aape-devtools
```

```ts
import { createPipeline, START, END } from '@maumenvi/aape';
import { createAapeDevtools } from '@maumenvi/aape-devtools';

const devtools = createAapeDevtools({ enabled: true });

const pipeline = createPipeline<{ count: number }>()
  .addNode('inc', (state) => ({ count: state.count + 1 }))
  .addEdge(START, 'inc')
  .addEdge('inc', END);

await pipeline.run({ count: 0 }, devtools.toRunOptions());
```

Abra `http://localhost:3001/devtools` para ver o dashboard visual com grafo, timeline e stream em tempo real (SSE).

### Budget visível (tokens/tools/time/cost)

Você pode definir limites de orçamento no `run`, com eventos no devtools e resumo em log ao final:

```ts
await pipeline.run(initialState, {
  budget: {
    limits: { tokens: 50_000, tools: 100, timeMs: 120_000, costUsd: 2.5 },
    hooks: [
      {
        metric: 'tokens',
        percent: 80,
        action: 'abort',
        onTrigger: (event) => {
          console.warn('Budget threshold reached:', event.metric, event.percent);
        },
      },
    ],
  },
});
```

### Checkpoint e retomada

Você pode persistir progresso por nó e retomar uma execução interrompida:

```ts
const store = {
  load: async (id) => db.get(id) ?? null,
  save: async (snapshot) => db.set(snapshot.checkpointId, snapshot),
  clear: async (id) => db.delete(id),
};

await pipeline.run(initialState, {
  checkpoint: {
    id: 'checkout-flow-user-42',
    store,
    resume: true, // ou 'required'
    clearOnComplete: true,
  },
});
```

## Exemplo completo HTTP + Grafos + Guardrails

Exemplo orientado a produção em [examples/production-agent/](/home/marco/Documentos/projetos/aape/examples/production-agent):

- [index.ts](/home/marco/Documentos/projetos/aape/examples/production-agent/index.ts): servidor HTTP com rotas:
  - `POST /agent/task`
  - `POST /agent/search`
  - `GET /agent/debug`
  - `GET /agent/debug/:requestId`
- [pipeline.ts](/home/marco/Documentos/projetos/aape/examples/production-agent/pipeline.ts): grafo com:
  - identificação de intenção (OpenRouter)
  - guard de prompt injection
  - execução da tarefa
  - guard de vazamento sensível
  - sanitização não-IA
  - resposta final
- [prompts.ts](/home/marco/Documentos/projetos/aape/examples/production-agent/prompts.ts): prompts versionados por rota
- [llm-json.ts](/home/marco/Documentos/projetos/aape/examples/production-agent/llm-json.ts): helper para respostas JSON estruturadas de guardrails
- [README.md](/home/marco/Documentos/projetos/aape/examples/production-agent/README.md): execução e payloads de teste

Executar:

```bash
export OPENROUTER_API_KEY=...
node --experimental-strip-types examples/production-agent/index.ts
```

Payload de exemplo:

```bash
curl -X POST http://localhost:3100/agent/task \
  -H "content-type: application/json" \
  -d '{"userPrompt":"Crie um plano de rollout para feature flags"}'
```

## CLI — exemplos por feature

Bootstrap e catálogo:

```bash
aape init
aape source add my-registry https://github.com/acme/aape-registry --ref main --trusted true
aape source ls
```

Instalação estilo npm:

```bash
aape i skill repo_overview --version ^1.0.0 --source my-registry
aape i tool read_file --llms "openrouter-main"
aape i mcp github --transport npx --package "@modelcontextprotocol/server-github" --all-llms
```

Transportes MCP:

```bash
aape i mcp local-fs --command npx --args '["-y","@modelcontextprotocol/server-filesystem"]'
aape i mcp remote-http --transport http --url "https://mcp.example.com"
aape i mcp remote-sse --transport sse --url "https://mcp.example.com/sse"
aape i mcp remote-ws --transport ws --url "wss://mcp.example.com/ws"
```

Ciclo de lock/contexto/verificação:

```bash
aape lock
aape verify
aape ci
aape context build
aape context show --for dev
aape context show --for llm
aape mcp sync
aape ls
aape ls mcp
```

Remoção:

```bash
aape rm skill repo_overview
aape rm tool read_file
aape rm mcp github
```

## Desenvolvimento

```bash
npx tsc --noEmit
npm test
```

## Uso básico

```ts
import { App, type HttpState } from '@maumenvi/aape';

const app = new App();

app.get('/', ({ res }: HttpState) => {
  res.json({ ok: true, name: 'aape' });
});

await app.listen(3000);
```

## Rotas e parâmetros

```ts
import { App, type HttpState } from '@maumenvi/aape';

const app = new App();

app.get('/users/:id', ({ req, res }: HttpState) => {
  const id = req.params.id;
  res.json({ id, ok: true });
});
```

## Pipeline de execução

```ts
import { createPipeline, START, END, type HttpState } from '@maumenvi/aape';

const pipeline = createPipeline<HttpState>()
  .addNode('auth', (state) => {
    state.res.status(401).json({ error: 'Unauthorized' });
    return {};
  })
  .addNode('final', (state) => {
    state.res.json({ ok: true });
    return {};
  })
  .addEdge(START, 'auth')
  .addEdge('auth', 'final')
  .addEdge('final', END);

await pipeline.run({ req, res }, {
  stopWhen: (state) => state.res.writableEnded,
});
```

O pipeline também suporta hooks de lifecycle:

```ts
const pipeline = createPipeline<HttpState>()
  .addNode('stepA', () => ({ ok: true }))
  .addNode('stepB', () => ({ ok: false }))
  .addEdge(START, 'stepA')
  .addEdge('stepA', 'stepB')
  .addEdge('stepB', END)
  .withHooks({
    onNodeStart: (name) => console.log('start', name),
    onNodeEnd: (name) => console.log('end', name),
    onNodeError: (name, err) => console.error(name, err),
    onComplete: (state) => console.log('done', state),
  });
```

## Autenticação e proteção de rotas

```ts
import { App, Router, type HttpState, type PipelineNode } from '@maumenvi/aape';

interface AppState extends HttpState {
  user?: { id: number; email: string };
}

const authGuard: PipelineNode<AppState> = (state) => {
  const auth = state.req.headers.authorization;
  if (!auth) {
    state.res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  return { user: { id: 1, email: 'user@example.com' } };
};

const router = new Router();
router.get('/profile', authGuard, ({ res, user }: AppState) => {
  res.json({ user });
});

const app = new App();
app.use('/api', router);
await app.listen(3000);
```

## Sub-router

```ts
import { App, Router } from '@maumenvi/aape';

const api = new Router();
api.get('/health', ({ res }) => res.json({ status: 'ok' }));

const app = new App();
app.use('/api', api);
await app.listen(3000);
```

## Tratamento de erro

```ts
import { App } from '@maumenvi/aape';

const app = new App();

app.onError((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

## Estrutura do projeto

```text
src/
  core/
  http/
    app.ts
    context/
    router/
    types/
  pipeline/
  validation/
  index.ts
examples/
  basic.ts
tests/
  pipeline.test.ts
```

## Observações

Aape ainda é uma base enxuta e extensível. Ele oferece os blocos fundamentais para HTTP e execução de fluxos em grafo, sem adicionar dependências externas. O projeto foi pensado para evoluir com:

- checkpointing de execução
- plugins e integrações
- suporte a streaming
- nós paralelos e fan-out/fan-in

## Licença

Este projeto está licenciado sob a MIT License.
