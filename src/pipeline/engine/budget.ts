import type { ToolContext } from '../../agent/tools/context.ts';
import type {
  BudgetController,
  BudgetDelta,
  BudgetLimits,
  BudgetOptions,
  BudgetSnapshot,
  BudgetThresholdEvent,
  BudgetValues,
  RunContext,
} from '../types.ts';

const EMPTY_VALUES: BudgetValues = {
  tokens: 0,
  tools: 0,
  timeMs: 0,
  costUsd: 0,
};

export interface BudgetRuntimeState {
  controller: BudgetController;
  options: BudgetOptions;
  startTime: number;
  firedThresholds: Set<string>;
}

export function createBudgetRuntime(options: BudgetOptions | undefined, startTime: number): BudgetRuntimeState | undefined {
  if (!options) return undefined;

  const used: BudgetValues = { ...EMPTY_VALUES };
  const limits: BudgetLimits = { ...options.limits };
  let elapsedMsBase = 0;

  const snapshot = (): BudgetSnapshot => {
    const now = Date.now();
    const withTime: BudgetValues = {
      ...used,
      timeMs: elapsedMsBase + (now - startTime),
    };
    return {
      used: withTime,
      limits,
      remaining: {
        tokens: limits.tokens === undefined ? undefined : Math.max(0, limits.tokens - withTime.tokens),
        tools: limits.tools === undefined ? undefined : Math.max(0, limits.tools - withTime.tools),
        timeMs: limits.timeMs === undefined ? undefined : Math.max(0, limits.timeMs - withTime.timeMs),
        costUsd: limits.costUsd === undefined ? undefined : Math.max(0, limits.costUsd - withTime.costUsd),
      },
      exceeded: collectExceeded(withTime, limits),
      updatedAt: now,
    };
  };

  const controller: BudgetController = {
    consume(delta: BudgetDelta): BudgetSnapshot {
      used.tokens += Math.max(0, delta.tokens ?? 0);
      used.tools += Math.max(0, delta.tools ?? 0);
      used.costUsd += Math.max(0, delta.costUsd ?? 0);
      return snapshot();
    },
    snapshot,
    restore(previous) {
      used.tokens = Math.max(0, previous.used.tokens ?? 0);
      used.tools = Math.max(0, previous.used.tools ?? 0);
      used.costUsd = Math.max(0, previous.used.costUsd ?? 0);
      elapsedMsBase = Math.max(0, previous.used.timeMs ?? 0);
      return snapshot();
    },
  };

  return {
    controller,
    options,
    startTime,
    firedThresholds: new Set(),
  };
}

export function assertBudgetWithinLimits(state: BudgetRuntimeState | undefined): void {
  if (!state) return;
  if ((state.options.onExceeded ?? 'abort') !== 'abort') return;
  const current = state.controller.snapshot();
  if (current.exceeded.length === 0) return;
  throw new Error(`Budget exceeded for: ${current.exceeded.join(', ')}`);
}

export function wrapToolContextWithBudget(
  tools: ToolContext | undefined,
  budget: BudgetRuntimeState | undefined,
  onToolUsage?: () => Promise<void>,
): ToolContext | undefined {
  if (!tools || !budget) return tools;
  const wrapper = Object.create(tools) as ToolContext;
  const originalCall = tools.call.bind(tools);
  const originalCallSkill = tools.callSkill.bind(tools);
  wrapper.call = async (name: string, input: unknown): Promise<unknown> => {
    budget.controller.consume({ tools: 1 });
    if (onToolUsage) await onToolUsage();
    return originalCall(name, input);
  };
  wrapper.callSkill = async (name: string, state: unknown): Promise<unknown> => {
    budget.controller.consume({ tools: 1 });
    if (onToolUsage) await onToolUsage();
    return originalCallSkill(name, state);
  };
  return wrapper;
}

export async function runBudgetThresholdHooks(
  budget: BudgetRuntimeState | undefined,
  ctx: RunContext,
): Promise<void> {
  if (!budget?.options.hooks?.length) return;
  const snapshot = budget.controller.snapshot();
  for (const hook of budget.options.hooks) {
    const limit = snapshot.limits[hook.metric];
    if (typeof limit !== 'number' || limit <= 0) continue;
    const used = snapshot.used[hook.metric];
    const ratio = used / limit;
    const threshold = Math.max(0, hook.percent) / 100;
    if (ratio < threshold) continue;

    const key = `${hook.metric}:${hook.percent}`;
    const once = hook.once ?? true;
    if (once && budget.firedThresholds.has(key)) continue;
    if (once) budget.firedThresholds.add(key);

    const event: BudgetThresholdEvent = {
      metric: hook.metric,
      percent: hook.percent,
      used,
      limit,
      ratio,
      snapshot,
    };

    const actionFromHook = await hook.onTrigger?.(event, ctx);
    const action = actionFromHook ?? hook.action ?? 'continue';
    if (action === 'abort') {
      throw new Error(
        `Budget threshold hook aborted execution at ${hook.percent}% for ${hook.metric} (used ${used}, limit ${limit}).`,
      );
    }
  }
}

function collectExceeded(used: BudgetValues, limits: BudgetLimits): Array<keyof BudgetLimits> {
  const exceeded: Array<keyof BudgetLimits> = [];
  if (limits.tokens !== undefined && used.tokens > limits.tokens) exceeded.push('tokens');
  if (limits.tools !== undefined && used.tools > limits.tools) exceeded.push('tools');
  if (limits.timeMs !== undefined && used.timeMs > limits.timeMs) exceeded.push('timeMs');
  if (limits.costUsd !== undefined && used.costUsd > limits.costUsd) exceeded.push('costUsd');
  return exceeded;
}
