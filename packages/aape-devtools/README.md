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

## Executando os testes

```bash
npm test
```

## Verificando tipagem

```bash
npx tsc --noEmit
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
