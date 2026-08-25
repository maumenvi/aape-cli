# API e tipos

Este documento lista os principais tipos e APIs públicas do Aape.

## App

```ts
new App(options?)
```

### Métodos

- `use(path, router)`
- `use(step)`
- `onError(handler)`
- `get(path, ...steps)`
- `post(path, ...steps)`
- `put(path, ...steps)`
- `patch(path, ...steps)`
- `delete(path, ...steps)`
- `listen(port, hostname?)`
- `close()`

### Opções

```ts
interface AppOptions {
  logger?: Logger;
  parseBody?: boolean;
  bodyLimit?: number;
}
```

## Router

```ts
const router = new Router();
router.get('/users', handler);
router.post('/users', authGuard, createUser);
```

### Métodos

- `get(path, ...steps)`
- `post(path, ...steps)`
- `put(path, ...steps)`
- `patch(path, ...steps)`
- `delete(path, ...steps)`
- `use(prefix, childRouter)`
- `match(method, url)`
- `dispatch(req, res, globalSteps, onNotFound, onError)`

## Pipeline

```ts
const pipeline = createPipeline<State>();
pipeline.addNode('auth', fn);
pipeline.addEdge(START, 'auth');
pipeline.addEdge('auth', END);
await pipeline.run(initialState);
```

### Principais tipos

```ts
export type NodeFn<S extends object> = (
  state: Readonly<S>,
  ctx: RunContext,
) => MaybePromise<Partial<S> | void>;

export type RouterFn<S extends object> = (
  state: Readonly<S>,
  ctx: RunContext,
) => MaybePromise<NodeName>;
```

### Hooks

```ts
interface PipelineHooks<S extends object> {
  onNodeStart?: (name, state, ctx) => MaybePromise<void>;
  onNodeEnd?: (name, state, ctx) => MaybePromise<void>;
  onNodeError?: (name, err, ctx) => MaybePromise<void>;
  onComplete?: (state, ctx) => MaybePromise<void>;
}
```

## HttpState

```ts
export interface HttpState {
  req: AapeRequest;
  res: AapeResponse;
}
```

## RouteStep

```ts
export type RouteStep<S extends HttpState = HttpState> =
  PipelineNode<S> | Pipeline<S>;
```

## PipelineNode

```ts
export type PipelineNode<S extends HttpState = HttpState> = (
  state: S,
) => Partial<S> | void | Promise<Partial<S> | void>;
```

## AapeRequest

O request do Aape encapsula a request nativa com propriedades extras:

- `method`
- `url`
- `headers`
- `query`
- `body`
- `params`

## AapeResponse

O response do Aape encapsula o response nativa e expõe helpers como:

- `status(code)`
- `json(payload)`
- `send(body)`
- `text(body)`

## Validation

O framework também expõe helpers para validação:

```ts
import { object, string, number, pass } from '../src/index.ts';
```

Exemplo:

```ts
const UserSchema = object({
  id: number(),
  name: string(),
  active: pass<boolean>().default(true),
});
```

## Observações

Esses tipos compõem o contrato central do framework. A API pública é pensada para ser pequena, previsível e facilmente extensível.
