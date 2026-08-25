import type { RunOptions } from './types.ts';

export function normalizeRunOptions<S extends object>(
  optionsOrMetadata: RunOptions<S> | Record<string, unknown>,
): RunOptions<S> {
  const isRunOptions = (value: object): value is RunOptions<S> =>
    'maxSteps' in value
    || 'timeoutMs' in value
    || 'signal' in value
    || 'metadata' in value
    || 'llm' in value
    || 'tools' in value
    || 'stopWhen' in value
    || 'devtools' in value
    || 'budget' in value
    || 'checkpoint' in value;

  return isRunOptions(optionsOrMetadata)
    ? optionsOrMetadata
    : { metadata: optionsOrMetadata as Record<string, unknown> };
}
