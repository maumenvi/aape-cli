import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { END, START } from '../../src/pipeline/constants.ts';
import type { PipelineEvent } from '../../src/pipeline/events.ts';
import type { CheckpointSnapshot } from '../../src/pipeline/types.ts';
import { Pipeline, createPipeline } from '../../src/pipeline/pipeline.ts';

interface S {
  count: number;
  label?: string;
  done?: boolean;
}

describe('Pipeline', () => {
  describe('builder methods', () => {
    it('throws when adding reserved START name', () => {
      const pipeline = new Pipeline<S>();
      assert.throws(() => pipeline.addNode(START, () => {}), /reserved/i);
    });

    it('throws when adding reserved END name', () => {
      const pipeline = new Pipeline<S>();
      assert.throws(() => pipeline.addNode(END, () => {}), /reserved/i);
    });

    it('createPipeline returns a Pipeline instance', () => {
      const pipeline = createPipeline<S>();
      assert.ok(pipeline instanceof Pipeline);
    });
  });

  describe('basic execution', () => {
    it('runs a single node', async () => {
      const pipeline = createPipeline<S>()
        .addNode('inc', (state) => ({ count: state.count + 1 }))
        .addEdge(START, 'inc')
        .addEdge('inc', END);

      const result = await pipeline.run({ count: 0 });
      assert.equal(result.count, 1);
    });

    it('runs multiple nodes sequentially', async () => {
      const pipeline = createPipeline<S>()
        .addNode('a', (state) => ({ count: state.count + 1 }))
        .addNode('b', (state) => ({ count: state.count * 2 }))
        .addEdge(START, 'a')
        .addEdge('a', 'b')
        .addEdge('b', END);

      const result = await pipeline.run({ count: 3 });
      assert.equal(result.count, 8);
    });

    it('does not mutate original state', async () => {
      const initial: S = { count: 5 };
      const pipeline = createPipeline<S>()
        .addNode('n', (state) => ({ count: state.count + 1 }))
        .addEdge(START, 'n')
        .addEdge('n', END);

      await pipeline.run(initial);
      assert.equal(initial.count, 5);
    });

    it('node returning void does not change state', async () => {
      const pipeline = createPipeline<S>()
        .addNode('noop', () => {})
        .addEdge(START, 'noop')
        .addEdge('noop', END);

      const result = await pipeline.run({ count: 7 });
      assert.equal(result.count, 7);
    });

    it('resolves start from the first registered node when no START edge exists', async () => {
      const pipeline = createPipeline<S>()
        .addNode('first', (state) => ({ count: state.count + 5 }))
        .addEdge('first', END);

      const result = await pipeline.run({ count: 1 });
      assert.equal(result.count, 6);
    });

    it('respects custom entry point set by setEntryPoint', async () => {
      const executed: string[] = [];
      const pipeline = createPipeline<S>()
        .addNode('a', () => { executed.push('a'); })
        .addNode('b', (state) => {
          executed.push('b');
          return { count: state.count + 1 };
        })
        .addEdge('a', END)
        .addEdge('b', END)
        .setEntryPoint('b');

      const result = await pipeline.run({ count: 0 });
      assert.equal(result.count, 1);
      assert.deepEqual(executed, ['b']);
    });
  });

  describe('conditional edges', () => {
    it('routes to the correct branch', async () => {
      const pipeline = createPipeline<S>()
        .addNode('check', (state) => ({ label: state.count > 0 ? 'pos' : 'neg' }))
        .addNode('pos', () => ({ label: 'positive' }))
        .addNode('neg', () => ({ label: 'negative' }))
        .addEdge(START, 'check')
        .addConditionalEdge('check', (state) => state.label === 'pos' ? 'pos' : 'neg')
        .addEdge('pos', END)
        .addEdge('neg', END);

      const positive = await pipeline.run({ count: 1 });
      const negative = await pipeline.run({ count: -1 });
      assert.equal(positive.label, 'positive');
      assert.equal(negative.label, 'negative');
    });
  });

  describe('hooks', () => {
    it('calls onNodeStart and onNodeEnd', async () => {
      const started: string[] = [];
      const ended: string[] = [];

      const pipeline = createPipeline<S>()
        .addNode('a', (state) => ({ count: state.count + 1 }))
        .addEdge(START, 'a')
        .addEdge('a', END)
        .withHooks({
          onNodeStart: (name) => { started.push(name); },
          onNodeEnd: (name) => { ended.push(name); },
        });

      await pipeline.run({ count: 0 });
      assert.deepEqual(started, ['a']);
      assert.deepEqual(ended, ['a']);
    });

    it('calls onComplete with final state', async () => {
      let finalState: S | undefined;

      const pipeline = createPipeline<S>()
        .addNode('n', (state) => ({ count: state.count + 10 }))
        .addEdge(START, 'n')
        .addEdge('n', END)
        .withHooks({ onComplete: (state) => { finalState = state as S; } });

      await pipeline.run({ count: 0 });
      assert.equal(finalState?.count, 10);
    });

    it('calls onNodeError on throw and rethrows', async () => {
      let nodeErrorName = '';
      let nodeError: unknown;

      const pipeline = createPipeline<S>()
        .addNode('boom', () => {
          throw new Error('kaboom');
        })
        .addEdge(START, 'boom')
        .addEdge('boom', END)
        .withHooks({
          onNodeError: (name, err) => {
            nodeErrorName = name;
            nodeError = err;
          },
        });

      await assert.rejects(() => pipeline.run({ count: 0 }), /kaboom/);
      assert.equal(nodeErrorName, 'boom');
      assert.ok(nodeError instanceof Error);
    });
  });

  describe('errors', () => {
    it('throws when node is missing', async () => {
      const pipeline = createPipeline<S>().addEdge(START, 'missing');
      await assert.rejects(() => pipeline.run({ count: 0 }), /not found/i);
    });

    it('throws when maxSteps is exceeded', async () => {
      const pipeline = createPipeline<S>()
        .addNode('loop', (state) => ({ count: state.count + 1 }))
        .addEdge(START, 'loop')
        .addEdge('loop', 'loop');

      await assert.rejects(
        () => pipeline.run({ count: 0 }, { maxSteps: 5 }),
        /maxsteps/i,
      );
    });

    it('throws when edge source node does not exist', async () => {
      const pipeline = createPipeline<S>()
        .addNode('ok', (state) => state)
        .addEdge(START, 'ok')
        .addEdge('ghost', END);

      await assert.rejects(() => pipeline.run({ count: 0 }), /edge source.*ghost.*not found/i);
    });

    it('throws when edge target node does not exist', async () => {
      const pipeline = createPipeline<S>()
        .addNode('a', (state) => state)
        .addEdge(START, 'a')
        .addEdge('a', 'ghost');

      await assert.rejects(() => pipeline.run({ count: 0 }), /edge target.*ghost.*not found/i);
    });

    it('throws when custom entry point does not exist', async () => {
      const pipeline = createPipeline<S>()
        .addNode('a', (state) => state)
        .setEntryPoint('ghost');

      await assert.rejects(() => pipeline.run({ count: 0 }), /entry point.*ghost.*not found/i);
    });

    it('throws when START is configured with conditional edge', async () => {
      const pipeline = createPipeline<S>()
        .addNode('a', (state) => state)
        .addConditionalEdge(START, () => 'a');

      await assert.rejects(() => pipeline.run({ count: 0 }), /start supports only fixed edges/i);
    });
  });

  describe('interrupting execution', () => {
    it('stops executing later nodes when a node throws', async () => {
      const executed: string[] = [];

      const pipeline = createPipeline<S>()
        .addNode('auth', () => {
          executed.push('auth');
          throw new Error('401 Unauthorized');
        })
        .addNode('loadUser', () => {
          executed.push('loadUser');
          return { count: 1 };
        })
        .addNode('respond', () => {
          executed.push('respond');
          return { count: 2 };
        })
        .addEdge(START, 'auth')
        .addEdge('auth', 'loadUser')
        .addEdge('loadUser', 'respond')
        .addEdge('respond', END);

      await assert.rejects(() => pipeline.run({ count: 0 }), /401 Unauthorized/);
      assert.deepEqual(executed, ['auth']);
    });

    it('does not run downstream nodes after an auth rejection hook', async () => {
      const executed: string[] = [];

      const pipeline = createPipeline<S>()
        .addNode('auth', () => {
          executed.push('auth');
          throw new Error('401 Unauthorized');
        })
        .addNode('metrics', () => {
          executed.push('metrics');
          return { count: 99 };
        })
        .addNode('final', () => {
          executed.push('final');
          return { count: 100 };
        })
        .addEdge(START, 'auth')
        .addEdge('auth', 'metrics')
        .addEdge('metrics', 'final')
        .addEdge('final', END)
        .withHooks({
          onNodeError: (name, err) => {
            executed.push(`error:${name}:${(err as Error).message}`);
          },
        });

      await assert.rejects(() => pipeline.run({ count: 0 }), /401 Unauthorized/);
      assert.deepEqual(executed, ['auth', 'error:auth:401 Unauthorized']);
    });
  });

  describe('run options', () => {
    it('throws when timeoutMs is exceeded', async () => {
      const pipeline = createPipeline<S>()
        .addNode('slow', () => new Promise<void>((resolve) => setTimeout(resolve, 200)))
        .addEdge(START, 'slow')
        .addEdge('slow', END);

      await assert.rejects(
        () => pipeline.run({ count: 0 }, { timeoutMs: 50 }),
        /timed out/i,
      );
    });

    it('aborts when external AbortSignal is triggered', async () => {
      const controller = new AbortController();

      const pipeline = createPipeline<S>()
        .addNode('slow', () => new Promise<void>((resolve) => setTimeout(resolve, 200)))
        .addEdge(START, 'slow')
        .addEdge('slow', END);

      setTimeout(() => controller.abort(new Error('cancelled')), 30);

      await assert.rejects(
        () => pipeline.run({ count: 0 }, { signal: controller.signal }),
        /cancelled/i,
      );
    });

    it('exposes signal in RunContext', async () => {
      let receivedSignal: AbortSignal | undefined;

      const pipeline = createPipeline<S>()
        .addNode('capture', (_state, ctx) => { receivedSignal = ctx.signal; })
        .addEdge(START, 'capture')
        .addEdge('capture', END);

      await pipeline.run({ count: 0 });
      assert.ok(receivedSignal instanceof AbortSignal);
    });

    it('uses metadata in RunContext', async () => {
      let traceId = '';
      const pipeline = createPipeline<S>()
        .addNode('capture', (_state, ctx) => {
          traceId = String(ctx.metadata.traceId);
        })
        .addEdge(START, 'capture')
        .addEdge('capture', END);

      await pipeline.run({ count: 0 }, { metadata: { traceId: 'abc-123' } });
      assert.equal(traceId, 'abc-123');
    });

    it('stops when stopWhen returns true', async () => {
      const executed: string[] = [];

      const pipeline = createPipeline<S>()
        .addNode('a', () => {
          executed.push('a');
          return { done: true };
        })
        .addNode('b', () => {
          executed.push('b');
          return { count: 999 };
        })
        .addEdge(START, 'a')
        .addEdge('a', 'b')
        .addEdge('b', END);

      const result = await pipeline.run(
        { count: 0 },
        { stopWhen: (state) => state.done === true },
      );

      assert.equal(result.done, true);
      assert.deepEqual(executed, ['a']);
    });

    it('enforces timeout during onComplete hook', async () => {
      const pipeline = createPipeline<S>()
        .addNode('fast', (state) => ({ count: state.count + 1 }))
        .addEdge(START, 'fast')
        .addEdge('fast', END)
        .withHooks({
          onComplete: async () => {
            await new Promise((resolve) => setTimeout(resolve, 80));
          },
        });

      await assert.rejects(
        () => pipeline.run({ count: 0 }, { timeoutMs: 10 }),
        /timed out/i,
      );
    });

    it('enforces timeout during onNodeError hook', async () => {
      const pipeline = createPipeline<S>()
        .addNode('boom', () => {
          throw new Error('kaboom');
        })
        .addEdge(START, 'boom')
        .addEdge('boom', END)
        .withHooks({
          onNodeError: async () => {
            await new Promise((resolve) => setTimeout(resolve, 80));
          },
        });

      await assert.rejects(
        () => pipeline.run({ count: 0 }, { timeoutMs: 10 }),
        /timed out/i,
      );
    });

    it('emits devtools events when enabled', async () => {
      const events: PipelineEvent<S>[] = [];
      const pipeline = createPipeline<S>()
        .addNode('a', (state) => ({ count: state.count + 1 }))
        .addEdge(START, 'a')
        .addEdge('a', END);

      await pipeline.run({
        count: 0,
      }, {
        devtools: {
          enabled: true,
          onEvent: (event) => { events.push(event); },
        },
      });

      assert.equal(events[0]?.type, 'run_started');
      assert.ok(events.some((event) => event.type === 'node_started'));
      assert.ok(events.some((event) => event.type === 'node_completed'));
      assert.ok(events.some((event) => event.type === 'run_completed'));
    });

    it('does not emit devtools events when disabled', async () => {
      const events: PipelineEvent<S>[] = [];
      const pipeline = createPipeline<S>()
        .addNode('a', (state) => ({ count: state.count + 1 }))
        .addEdge(START, 'a')
        .addEdge('a', END);

      await pipeline.run({
        count: 0,
      }, {
        devtools: {
          enabled: false,
          onEvent: (event) => { events.push(event); },
        },
      });

      assert.equal(events.length, 0);
    });

    it('emits budget snapshots and budget_updated events', async () => {
      const events: PipelineEvent<S>[] = [];
      const pipeline = createPipeline<S>()
        .addNode('a', (_state, ctx) => {
          ctx.budget?.consume({ tokens: 120, costUsd: 0.01 });
          return { count: 1 };
        })
        .addEdge(START, 'a')
        .addEdge('a', END);

      await pipeline.run({ count: 0 }, {
        budget: {
          limits: { tokens: 1000, costUsd: 1, tools: 10, timeMs: 10_000 },
          onExceeded: 'continue',
          logSummary: false,
        },
        devtools: {
          enabled: true,
          onEvent: (event) => { events.push(event); },
        },
      });

      assert.ok(events.some((event) => event.type === 'budget_updated'));
      const completed = events.find((event) => event.type === 'run_completed');
      assert.ok(completed?.budgetSnapshot);
      assert.equal(completed?.budgetSnapshot?.used.tokens, 120);
    });

    it('executes budget threshold hook action', async () => {
      const triggered: string[] = [];
      const pipeline = createPipeline<S>()
        .addNode('a', (_state, ctx) => {
          ctx.budget?.consume({ tokens: 80 });
          return { count: 1 };
        })
        .addEdge(START, 'a')
        .addEdge('a', END);

      await assert.rejects(
        () => pipeline.run({ count: 0 }, {
          budget: {
            limits: { tokens: 100 },
            logSummary: false,
            hooks: [{
              metric: 'tokens',
              percent: 70,
              action: 'abort',
              onTrigger: (event) => {
                triggered.push(`${event.metric}:${event.percent}`);
              },
            }],
          },
        }),
        /threshold hook aborted/i,
      );

      assert.deepEqual(triggered, ['tokens:70']);
    });

    it('saves checkpoint and resumes from saved node', async () => {
      const snapshots: Record<string, unknown> = {};
      const checkpointStore = {
        load: async (checkpointId: string) =>
          (snapshots[checkpointId] ?? null) as CheckpointSnapshot<S> | null,
        save: async (snapshot: CheckpointSnapshot<S>) => {
          snapshots[snapshot.checkpointId] = snapshot;
        },
      };

      const pipeline = createPipeline<S>()
        .addNode('a', (state) => ({ count: state.count + 1 }))
        .addNode('b', (state, ctx) => {
          if (ctx.metadata.failAtB === true) {
            throw new Error('fail-b');
          }
          return { count: state.count + 1 };
        })
        .addNode('c', (state) => ({ count: state.count + 1 }))
        .addEdge(START, 'a')
        .addEdge('a', 'b')
        .addEdge('b', 'c')
        .addEdge('c', END);

      await assert.rejects(
        () => pipeline.run({ count: 0 }, {
          metadata: { failAtB: true },
          checkpoint: {
            id: 'run-1',
            store: checkpointStore,
          },
        }),
        /fail-b/i,
      );

      const failed = snapshots['run-1'] as CheckpointSnapshot<S>;
      assert.equal(failed.status, 'failed');
      assert.equal(failed.nextNode, 'b');
      assert.equal(failed.stateSnapshot.count, 1);

      const resumed = await pipeline.run({ count: 999 }, {
        metadata: { failAtB: false },
        checkpoint: {
          id: 'run-1',
          store: checkpointStore,
          resume: true,
        },
      });

      assert.equal(resumed.count, 3);
      const completed = snapshots['run-1'] as CheckpointSnapshot<S>;
      assert.equal(completed.status, 'completed');
      assert.equal(completed.nextNode, END);
    });

    it('fails when checkpoint resume is required and missing', async () => {
      const checkpointStore = {
        load: async () => null,
        save: async () => {},
      };
      const pipeline = createPipeline<S>()
        .addNode('a', (state) => ({ count: state.count + 1 }))
        .addEdge(START, 'a')
        .addEdge('a', END);

      await assert.rejects(
        () => pipeline.run({ count: 0 }, {
          checkpoint: {
            id: 'missing-run',
            store: checkpointStore,
            resume: 'required',
          },
        }),
        /not found for resume/i,
      );
    });
  });
});
