import { randomUUID } from 'node:crypto';
import { END, START } from '../constants.ts';
import { normalizeRunOptions } from '../options.ts';
import { createRunSignal, raceSignal } from '../signal.ts';
import type { CheckpointSnapshot, CheckpointStatus, NodeName, RunContext, RunOptions } from '../types.ts';
import { createEventEmitter } from './emitter.ts';
import {
  assertBudgetWithinLimits,
  createBudgetRuntime,
  runBudgetThresholdHooks,
  wrapToolContextWithBudget,
} from './budget.ts';
import { resolveStart, validateGraph } from './graph.ts';
import type { PipelineDefinition } from './types.ts';

export async function executePipeline<S extends object>(
  definition: PipelineDefinition<S>,
  initial: S,
  optionsOrMetadata: RunOptions<S> | Record<string, unknown> = {},
): Promise<S> {
  const options = normalizeRunOptions(optionsOrMetadata);
  const maxSteps = options.maxSteps ?? 25;
  let metadata = options.metadata ?? {};

  const { signal, clear } = createRunSignal(options);
  let runId: string = randomUUID();
  const emitEvent = createEventEmitter<S>(options, signal);
  const budgetRuntime = createBudgetRuntime(options.budget, Date.now());
  let runStatus: 'completed' | 'failed' | 'stopped' = 'completed';
  const snapshotState = (state: S): Readonly<S> => ({ ...state });

  let state = { ...initial } as S;
  let step = 0;
  let current = definition.entryPoint === START
    ? resolveStart(definition.nodes, definition.edges)
    : definition.entryPoint;

  if (options.checkpoint?.resume) {
    const restored = await raceSignal(
      Promise.resolve(options.checkpoint.store.load(options.checkpoint.id)),
      signal,
    );
    if (restored) {
      runId = restored.runId;
      state = { ...(restored.stateSnapshot as S) };
      metadata = { ...restored.metadata, ...metadata };
      step = restored.step;
      current = restored.nextNode;
      if (budgetRuntime && restored.budgetSnapshot) {
        budgetRuntime.controller.restore(restored.budgetSnapshot);
      }
    } else if (options.checkpoint.resume === 'required') {
      throw new Error(`Checkpoint "${options.checkpoint.id}" not found for resume.`);
    }
  }

  const ctx: RunContext = {
    runId,
    step,
    state: state as Record<string, unknown>,
    metadata,
    signal,
    llm: options.llm,
    tools: options.tools,
    budget: budgetRuntime?.controller,
  };
  const persistCheckpoint = async (status: CheckpointStatus, nextNode: NodeName): Promise<void> => {
    if (!options.checkpoint) return;
    const snapshot: CheckpointSnapshot<S> = {
      checkpointId: options.checkpoint.id,
      runId,
      step: ctx.step,
      nextNode,
      status,
      stateSnapshot: snapshotState(state),
      metadata: { ...ctx.metadata },
      budgetSnapshot: budgetRuntime?.controller.snapshot(),
      updatedAt: Date.now(),
    };
    await raceSignal(Promise.resolve(options.checkpoint.store.save(snapshot)), signal);
  };
  const emit = async (build: () => Record<string, unknown>): Promise<void> => {
    await emitEvent(() => {
      const base = build();
      if (!budgetRuntime) return base as never;
      return {
        ...base,
        budgetSnapshot: budgetRuntime.controller.snapshot(),
      } as never;
    });
  };
  const emitBudgetUpdated = async (
    reason: 'run_started' | 'node_started' | 'node_completed' | 'tool_call' | 'run_completed' | 'run_failed' | 'run_stopped',
  ): Promise<void> => {
    if (!budgetRuntime) return;
    await emitEvent(() => ({
      type: 'budget_updated',
      runId,
      step: ctx.step,
      timestamp: Date.now(),
      reason,
      budgetSnapshot: budgetRuntime.controller.snapshot(),
    }));
    await runBudgetThresholdHooks(budgetRuntime, ctx);
    assertBudgetWithinLimits(budgetRuntime);
  };
  if (ctx.tools && budgetRuntime) {
    ctx.tools = wrapToolContextWithBudget(options.tools, budgetRuntime, async () => {
      await emitBudgetUpdated('tool_call');
    });
  }
  if (ctx.llm && budgetRuntime) {
    ctx.llm.setOnUsageCallback((delta) => {
      budgetRuntime.controller.consume({ tokens: delta.tokens, costUsd: delta.costUsd });
    });
  }
  validateGraph(definition.nodes, definition.edges, current);
  let stoppedByPredicate = false;

  try {
    await emit(() => ({
      type: 'run_started',
      runId,
      step: ctx.step,
      timestamp: Date.now(),
      entryPoint: current,
      metadata,
      stateSnapshot: snapshotState(state),
    }));
    await emitBudgetUpdated('run_started');
    await persistCheckpoint('running', current);

    while (current !== END) {
      await emitBudgetUpdated('node_started');
      if (options.stopWhen?.(state, ctx)) {
        stoppedByPredicate = true;
        break;
      }
      if (signal.aborted) throw signal.reason ?? new Error('Pipeline aborted');
      if (ctx.step >= maxSteps) {
        throw new Error(`Pipeline exceeded maxSteps (${maxSteps}). Possible infinite loop.`);
      }

      const node = definition.nodes.get(current);
      if (!node) throw new Error(`Node "${current}" not found in pipeline.`);

      await emit(() => ({
        type: 'node_started',
        runId,
        step: ctx.step,
        timestamp: Date.now(),
        node: current,
        stateSnapshot: snapshotState(state),
      }));
      await raceSignal(definition.hooks.onNodeStart?.(current, state, ctx), signal);

      let patch: Partial<S> | void;
      try {
        patch = await raceSignal(node(state, ctx), signal);
      } catch (err) {
        await emit(() => ({
          type: 'node_error',
          runId,
          step: ctx.step,
          timestamp: Date.now(),
          node: current,
          error: err,
        }));
        await raceSignal(definition.hooks.onNodeError?.(current, err, ctx), signal);
        throw err;
      }

      if (patch) {
        state = { ...state, ...patch };
      }
      ctx.state = state as Record<string, unknown>;
      await emit(() => ({
        type: 'node_completed',
        runId,
        step: ctx.step,
        timestamp: Date.now(),
        node: current,
        patch,
        stateSnapshot: snapshotState(state),
      }));
      await emitBudgetUpdated('node_completed');

      await raceSignal(definition.hooks.onNodeEnd?.(current, state, ctx), signal);
      ctx.step++;

      if (options.stopWhen?.(state, ctx)) {
        stoppedByPredicate = true;
        break;
      }

      const edge = definition.edges.get(current);
      if (!edge) break;

      const from = current;
      current = edge.kind === 'fixed'
        ? edge.to
        : await raceSignal(edge.router(state, ctx), signal) as NodeName;
      await emit(() => ({
        type: 'edge_selected',
        runId,
        step: ctx.step,
        timestamp: Date.now(),
        from,
        to: current,
        edgeKind: edge.kind,
      }));
      await persistCheckpoint('running', current);
    }

    if (stoppedByPredicate) {
      runStatus = 'stopped';
      await emit(() => ({
        type: 'run_stopped',
        runId,
        step: ctx.step,
        timestamp: Date.now(),
        reason: 'stopWhen',
        stateSnapshot: snapshotState(state),
      }));
      await emitBudgetUpdated('run_stopped');
      await persistCheckpoint('stopped', current);
      return state;
    }

    await raceSignal(definition.hooks.onComplete?.(state, ctx), signal);
    await emit(() => ({
      type: 'run_completed',
      runId,
      step: ctx.step,
      timestamp: Date.now(),
      totalSteps: ctx.step,
      stateSnapshot: snapshotState(state),
    }));
    await emitBudgetUpdated('run_completed');
    await persistCheckpoint('completed', END);
    if (options.checkpoint?.clearOnComplete) {
      await raceSignal(
        Promise.resolve(options.checkpoint.store.clear?.(options.checkpoint.id)),
        signal,
      );
    }
    runStatus = stoppedByPredicate ? 'stopped' : 'completed';
    return state;
  } catch (err) {
    runStatus = 'failed';
    await emit(() => ({
      type: 'run_failed',
      runId,
      step: ctx.step,
      timestamp: Date.now(),
      error: err,
      totalSteps: ctx.step,
      stateSnapshot: snapshotState(state),
    }));
    await emitBudgetUpdated('run_failed');
    await persistCheckpoint('failed', current);
    throw err;
  } finally {
    if (budgetRuntime && options.budget?.logSummary !== false) {
      const budget = budgetRuntime.controller.snapshot();
      const fmt = (value: number | undefined, fractionDigits = 2) =>
        typeof value === 'number' ? value.toFixed(fractionDigits) : '∞';
      console.log(
        `[aape budget] status=${runStatus} tokens ${budget.used.tokens}/${fmt(budget.limits.tokens, 0)} | `
        + `tools ${budget.used.tools}/${fmt(budget.limits.tools, 0)} | `
        + `time ${budget.used.timeMs}/${fmt(budget.limits.timeMs, 0)}ms | `
        + `cost $${budget.used.costUsd.toFixed(4)}/$${fmt(budget.limits.costUsd, 4)}`,
      );
    }
    clear();
  }
}
