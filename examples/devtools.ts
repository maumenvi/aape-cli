import { App, START, END, createPipeline, type HttpState } from '../src/index.ts';
import { createAapeDevtools } from '../packages/aape-devtools/src/index.ts';

interface DemoState {
  count: number;
  history?: number[];
}

const devtools = createAapeDevtools<DemoState>({
  enabled: true,
  maxEvents: 5_000,
});

const app = new App();

app.get('/', ({ res }: HttpState) => {
  res.json({
    name: '@maumenvi/aape-devtools demo',
    routes: [
      'GET /run?count=1',
      'GET /devtools (visual dashboard)',
      'GET /devtools/timeline',
      'GET /devtools/events (SSE)',
      'POST /devtools/enabled?value=true|false',
      'POST /devtools/clear',
    ],
  });
});

app.get('/run', async ({ req, res }: HttpState) => {
  const initialCount = Number(req.query.count ?? '0');
  const safeCount = Number.isFinite(initialCount) ? initialCount : 0;

  const pipeline = createPipeline<DemoState>()
    .addNode('inc', (state) => ({ count: state.count + 1 }))
    .addNode('double', (state) => ({ count: state.count * 2 }))
    .addNode('history', (state) => ({ history: [...(state.history ?? []), state.count] }))
    .addEdge(START, 'inc')
    .addEdge('inc', 'double')
    .addEdge('double', 'history')
    .addEdge('history', END);

  const result = await pipeline.run(
    { count: safeCount, history: [] },
    devtools.toRunOptions({ metadata: { source: '/run' } }),
  );

  res.json({
    ok: true,
    result,
    timelineSize: devtools.getTimeline().length,
    devtoolsEnabled: devtools.isEnabled(),
  });
});

app.get('/devtools', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.get('/devtools/', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.get('/devtools/events', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.get('/devtools/timeline', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.get('/devtools/modules/main.tsx', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.get('/devtools/modules/app.tsx', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.get('/devtools/modules/panels.tsx', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.get('/devtools/modules/models.ts', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.get('/devtools/modules/types.ts', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.get('/devtools/styles.css', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.post('/devtools/enabled', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.post('/devtools/clear', ({ req, res }: HttpState) => {
  devtools.dashboardHandler(req, res);
});

app.onError((err, _req, res, _next) => {
  console.error('[devtools-example:error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

await app.listen(3001);
console.log('[devtools-example] listening at http://localhost:3001');
