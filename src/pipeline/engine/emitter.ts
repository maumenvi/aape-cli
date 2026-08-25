import type { PipelineEvent } from '../events.ts';
import { raceSignal } from '../signal.ts';
import type { RunOptions } from '../types.ts';

export function createEventEmitter<S extends object>(options: RunOptions<S>, signal: AbortSignal) {
  const devtoolsEnabled = options.devtools?.enabled !== false && options.devtools?.onEvent !== undefined;
  const devtoolsPolicy = options.devtools?.eventErrorPolicy ?? 'ignore';

  return async (build: () => PipelineEvent<S>): Promise<void> => {
    if (!devtoolsEnabled) return;
    try {
      await raceSignal(options.devtools!.onEvent(build()), signal);
    } catch (err) {
      if (devtoolsPolicy === 'fail') throw err;
    }
  };
}
