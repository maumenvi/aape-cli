import { App, Router, type HttpState, type PipelineNode } from '../src/index.ts';

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

const db: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', password: 'secret', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', password: 'secret', role: 'user' },
];

let nextId = 3;

interface AppState extends HttpState {
  authUser?: Omit<User, 'password'>;
}

const authGuard: PipelineNode<AppState> = (state) => {
  const token = state.req.headers['authorization'] ?? '';
  const credentials = token.replace('Bearer ', '');
  const [email, password] = credentials.split(':');
  const found = db.find((u) => u.email === email && u.password === password);

  if (!found) {
    state.res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { password: _pw, ...safeUser } = found;
  return { authUser: safeUser };
};

const actionsLog: PipelineNode<AppState> = (state) => {
  const method = state.req.method;
  const url = state.req.url;
  const user = state.authUser?.email ?? 'anonymous';
  console.log(`[action-log] ${method} ${url} user=${user}`);
};

const metrics: { requests: number } = { requests: 0 };
const metricsNode: PipelineNode = () => {
  metrics.requests++;
  console.log(`[metrics] total_requests=${metrics.requests}`);
};

const auditNode: PipelineNode<AppState> = (state) => {
  const entry = {
    ts: new Date().toISOString(),
    method: state.req.method,
    url: state.req.url,
    user: state.authUser?.email ?? 'anonymous',
  };
  console.log('[audit]', JSON.stringify(entry));
};

const authRouter = new Router();

authRouter.post(
  '/login',
  actionsLog,
  metricsNode,
  (state: AppState) => {
    const body = state.req.body as { email?: string; password?: string } | undefined;
    const user = db.find((u) => u.email === body?.email && u.password === body?.password);

    if (!user) {
      state.res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = `Bearer ${user.email}:${user.password}`;
    state.res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  },
  // fire-and-forget now belongs inside the node if needed
  auditNode,
);

const userRouter = new Router();

userRouter.get(
  '/users',
  authGuard,
  actionsLog,
  metricsNode,
  (state: AppState) => {
    const safe = db.map(({ password: _pw, ...u }) => u);
    state.res.json(safe);
  },
  auditNode,
);

userRouter.get(
  '/users/:id',
  authGuard,
  actionsLog,
  metricsNode,
  (state: AppState) => {
    const id = Number(state.req.params.id);
    const user = db.find((u) => u.id === id);

    if (!user) {
      state.res.status(404).json({ error: 'User not found' });
      return;
    }

    const { password: _pw, ...safe } = user;
    state.res.json(safe);
  },
  auditNode,
);

userRouter.post(
  '/users',
  authGuard,
  actionsLog,
  metricsNode,
  (state: AppState) => {
    const body = state.req.body as Partial<User> | undefined;

    if (!body?.name || !body?.email || !body?.password) {
      state.res.status(400).json({ error: 'name, email and password are required' });
      return;
    }

    const newUser: User = {
      id: nextId++,
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role ?? 'user',
    };

    db.push(newUser);
    const { password: _pw, ...safe } = newUser;
    state.res.status(201).json(safe);
  },
  auditNode,
);

userRouter.put(
  '/users/:id',
  authGuard,
  actionsLog,
  metricsNode,
  (state: AppState) => {
    const id = Number(state.req.params.id);
    const idx = db.findIndex((u) => u.id === id);

    if (idx === -1) {
      state.res.status(404).json({ error: 'User not found' });
      return;
    }

    const body = state.req.body as Partial<User> | undefined;
    db[idx] = { ...db[idx], ...body, id };
    const { password: _pw, ...safe } = db[idx];
    state.res.json(safe);
  },
  auditNode,
);

userRouter.delete(
  '/users/:id',
  authGuard,
  actionsLog,
  metricsNode,
  (state: AppState) => {
    const id = Number(state.req.params.id);
    const idx = db.findIndex((u) => u.id === id);

    if (idx === -1) {
      state.res.status(404).json({ error: 'User not found' });
      return;
    }

    db.splice(idx, 1);
    state.res.status(204).send('');
  },
  auditNode,
);

const app = new App();

app.get('/', ({ res }: HttpState) => {
  res.json({ name: 'aape', version: '0.1.0' });
});

app.use('/auth', authRouter);
app.use('/api', userRouter);

app.onError((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

await app.listen(3000);
