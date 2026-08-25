import type { RunOptions } from './types.ts';

interface RunSignal {
  signal: AbortSignal;
  clear: () => void;
}

function combineSignalsToAbort(signals: AbortSignal[]): AbortSignal {
  if (signals.length === 0) return new AbortController().signal;
  if (signals.length === 1) return signals[0];
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);

  const combined = new AbortController();
  const stop = () => {
    for (const signal of signals) {
      signal.removeEventListener('abort', onAbort);
    }
  };

  const onAbort = () => {
    stop();
    const reason = signals.find((signal) => signal.aborted)?.reason ?? new Error('Pipeline aborted');
    combined.abort(reason);
  };

  for (const signal of signals) {
    if (signal.aborted) {
      stop();
      combined.abort(signal.reason ?? new Error('Pipeline aborted'));
      return combined.signal;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }

  return combined.signal;
}

export function createRunSignal<S extends object>(options: RunOptions<S>): RunSignal {
  const signals: AbortSignal[] = [];
  if (options.signal) signals.push(options.signal);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (options.timeoutMs !== undefined) {
    const timeoutController = new AbortController();
    signals.push(timeoutController.signal);
    timeoutId = setTimeout(
      () => timeoutController.abort(new Error(`Pipeline timed out after ${options.timeoutMs}ms`)),
      options.timeoutMs,
    );
  }

  return {
    signal: combineSignalsToAbort(signals),
    clear: () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    },
  };
}

export function raceSignal<T>(promise: Promise<T> | T | void, signal: AbortSignal): Promise<T | void> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error('Pipeline aborted'));

  return new Promise<T | void>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new Error('Pipeline aborted'));
    signal.addEventListener('abort', onAbort, { once: true });

    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
}
