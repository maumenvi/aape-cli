# Arquitetura

A arquitetura do Aape é dividida em três blocos principais: HTTP, routing e pipeline.

## 1. Camada HTTP

A camada HTTP é responsável por:

- criar o servidor Node
- encapsular `IncomingMessage` e `ServerResponse`
- interpretar query string e body
- orquestrar a execução da rota selecionada

Arquivos relevantes:

- `src/http/app.ts`
- `src/http/context/wrap.request.ts`
- `src/http/context/wrap.response.ts`
- `src/http/context/parse.query.ts`
- `src/http/context/read.body.ts`

### Fluxo de uma requisição

1. o servidor recebe a request bruta
2. `wrapRequest` transforma em um `AapeRequest`
3. `wrapResponse` transforma em um `AapeResponse`
4. query string e body são processados
5. `Router.dispatch()` encontra a rota correta
6. o pipeline correspondente executa os steps
7. erro ou fallback é tratado por `onError` / `notFound`

## 2. Camada de roteamento

O roteador usa uma trie para registrar caminhos e resolver parâmetros dinamicamente.

Componentes:

- `src/http/router/index.ts`: API pública do router
- `src/http/router/route-matcher.ts`: matching e trie
- `src/http/router/route-dispatch.ts`: execução da rota
- `src/http/router/trie.types.ts`: tipos internos do trie
- `src/http/router/types.ts`: tipos de `PipelineNode` e `RouteStep`

### Como funciona

- a rota é convertida em segmentos
- cada segmento é empurrado na trie
- segmentos estáticos e parametrizados são resolvidos em nós diferentes
- no final do caminho, a rota registra os steps associados ao método HTTP

Exemplo:

- `/users/:id` vira `['users', ':id']`
- `:id` entra em um branch parametrizado do nó `users`
- ao bater `GET /users/42`, o matcher resolve `id = '42'`

## 3. Camada de pipeline

O pipeline é o coração da execução de passos. Ele não é um middleware em estilo Express; ele é um grafo de execução.

Arquivos:

- `src/pipeline/pipeline.ts`
- `src/pipeline/index.ts`

### Estrutura

- `addNode(name, fn)`: registra um nó
- `addEdge(from, to)`: aresta fixa
- `addConditionalEdge(from, router)`: decisão de fluxo
- `withHooks(...)`: hooks de observabilidade
- `run(initialState, options)`: executa o grafo

### Estado

Cada node recebe o estado atual e um `RunContext`:

```ts
{
  runId,
  step,
  metadata,
  signal,
}
```

A execução em cada node pode:

- retornar um patch parcial do estado
- retornar `void`
- disparar exceções

Esses patches são mergeados no estado global, permitindo compor regras como autenticação, logging e resposta final em uma mesma transação de execução.

## 4. Modelagem de estado

O tipo base usado no framework é `HttpState`:

```ts
export interface HttpState {
  req: AapeRequest;
  res: AapeResponse;
}
```

Os handlers podem estender esse estado com propriedades adicionais:

```ts
interface AppState extends HttpState {
  user?: { id: number };
}
```

Assim, a etapa de autenticação pode preencher `state.user`, e as etapas seguintes podem consumir esse dado sem depender de closures globais.

## 5. Fluxo de execução de uma rota

1. a request entra no `App`
2. `App.listen()` cria o servidor e chama `router.dispatch()`
3. o router usa a trie para resolver a rota
4. `matched.route.steps` são convertidos em nós do pipeline
5. o pipeline executa os nós em sequência
6. cada nó pode alterar o estado, responder ou lançar erro
7. `onNotFound` e `onError` tratam casos fora do caminho principal

## 6. Vantagens da abordagem

- separação clara entre roteamento e execução
- composição preferencial via estado em vez de side effects globais
- capacidade de adicionar hooks e observabilidade
- menor acoplamento entre rotas e lógica de app
- base simples para evoluir com mais recursos

## 7. Evolução prevista

A arquitetura atual já fornece o básico para HTTP e execução por grafo, e está preparada para evoluir com:

- checkpointing
- plugins
- suporte a streaming
- fan-out/fan-in
- autenticação declarativa mais rica

## 8. Resumo

O Aape é um framework pequeno, orientado a pipeline e roteamento por trie. Em vez de um middleware linear tradicional, ele prioriza um conjunto de nós executados sobre um estado compartilhado. Isso torna a lógica mais explícita, modular e extensível.

## 9. Arquitetura de agente HTTP (produção)

Para fluxos de agente, o padrão recomendado é:

1. rota HTTP recebe prompts
2. pipeline identifica intenção
3. pipeline roda guard de prompt injection
4. pipeline executa tarefa com LLM
5. pipeline roda guard de vazamento sensível
6. validação/sanitização não-IA
7. resposta final

Implementação de referência:

- [examples/production-agent/index.ts](/home/marco/Documentos/projetos/aape/examples/production-agent/index.ts)
- [examples/production-agent/pipeline.ts](/home/marco/Documentos/projetos/aape/examples/production-agent/pipeline.ts)
- [examples/production-agent/prompts.ts](/home/marco/Documentos/projetos/aape/examples/production-agent/prompts.ts)

Esse modelo favorece auditoria porque cada etapa vira evento no timeline (`run_started`, `node_started`, `node_completed`, `run_completed`/`run_failed`), permitindo depuração por `requestId`.

## 10. Políticas de acesso por LLM

O controle de acesso é em duas camadas:

1. política da LLM (allowlist de `tools`, `skills`, `mcps`)
2. política do recurso (`allowedLlms`)

A execução usa interseção dessas camadas. Além disso, o manifesto do catálogo suporta política global:

- `config.llmAccessDefault = "allow"` (padrão)
- `config.llmAccessDefault = "deny"` (deny-by-default)

Com `deny`, qualquer recurso sem `allowedLlms` explícito fica bloqueado para LLMs.
