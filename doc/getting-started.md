# Guia de uso

Este guia descreve como começar a usar o Aape em um projeto simples.

## 1. Criando um app

```ts
import { App, type HttpState } from '../src/index.ts';

const app = new App();

app.get('/', ({ res }: HttpState) => {
  res.json({ ok: true, app: 'aape' });
});

await app.listen(3000);
```

## 2. Definindo rotas

```ts
import { App } from '../src/index.ts';

const app = new App();

app.get('/hello', ({ res }) => {
  res.json({ message: 'hello world' });
});

app.post('/users', ({ req, res }) => {
  const body = req.body;
  res.status(201).json({ received: body });
});
```

## 3. Rotas com parâmetros

```ts
import { App, type HttpState } from '../src/index.ts';

const app = new App();

app.get('/users/:id', ({ req, res }: HttpState) => {
  const id = req.params.id;
  res.json({ id, ok: true });
});
```

## 4. Sub-routers

```ts
import { App, Router } from '../src/index.ts';

const userRouter = new Router();
userRouter.get('/profile', ({ res }) => {
  res.json({ name: 'aape user' });
});

const app = new App();
app.use('/api', userRouter);
await app.listen(3000);
```

## 5. Pipeline e composition

```ts
import { App, type HttpState, type PipelineNode } from '../src/index.ts';

interface AppState extends HttpState {
  user?: { id: number };
}

const authGuard: PipelineNode<AppState> = (state) => {
  if (!state.req.headers.authorization) {
    state.res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  return { user: { id: 1 } };
};

const app = new App();

app.get('/me', authGuard, ({ res, user }: AppState) => {
  res.json({ user });
});
```

## 6. Tratamento de erro

```ts
import { App } from '../src/index.ts';

const app = new App();

app.onError((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

## 7. Body e query

O `App` faz parsing automático do body quando `parseBody` estiver habilitado e coleta query string em `req.query`.

```ts
const app = new App({ parseBody: true });

app.post('/login', ({ req, res }) => {
  const email = req.body?.email;
  const password = req.body?.password;
  const withRedirect = req.query.redirect;

  res.json({ email, password, withRedirect });
});
```

## 8. Boas práticas

- mantenha handlers pequenos
- use `HttpState` para compartilhar dados entre nós
- separe autenticação, métricas e auditoria em etapas distintas
- prefira sub-routers para organizar módulos grandes
