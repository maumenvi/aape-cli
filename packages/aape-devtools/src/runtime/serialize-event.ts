import type { PipelineEvent } from '@maumenvi/aape';

export interface SerializationOptions {
  maxDepth?: number;
  maxItems?: number;
  redactedKeys?: ReadonlySet<string> | readonly string[];
  selectState?: (state: unknown) => unknown;
}

const DEFAULT_REDACTED_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'apiKey',
  'apikey',
  'accessKey',
  'privateKey',
]);

function shouldRedactKey(key: string, redactedKeys: ReadonlySet<string> | readonly string[]): boolean {
  const normalized = key.toLowerCase();
  const set = new Set(redactedKeys);
  return set.has(normalized) || set.has(key);
}

function serializeValue(
  value: unknown,
  options: Required<Pick<SerializationOptions, 'maxDepth' | 'maxItems'>> & SerializationOptions,
  seen: WeakSet<object>,
  depth = 0,
): unknown {
  if (typeof value === 'bigint') return `${value.toString()}n`;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value === null || typeof value === 'undefined') return value;
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return '[Function]';

  if (typeof value === 'object') {
    if (depth >= options.maxDepth) return '[MaxDepthReached]';
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
    if (value instanceof Date) return value.toISOString();
    if (value instanceof RegExp) return value.toString();
    if (typeof (value as { pipe?: unknown }).pipe === 'function') return '[Stream]';
    if (value instanceof Map) {
      const entries: Array<[unknown, unknown]> = [];
      for (const [key, entryValue] of value.entries()) {
        entries.push([serializeValue(key, options, seen, depth + 1), serializeValue(entryValue, options, seen, depth + 1)]);
        if (entries.length >= options.maxItems) break;
      }
      return { __type: 'Map', entries };
    }
    if (value instanceof Set) {
      const values: unknown[] = [];
      for (const entryValue of value.values()) {
        values.push(serializeValue(entryValue, options, seen, depth + 1));
        if (values.length >= options.maxItems) break;
      }
      return { __type: 'Set', values };
    }
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) {
      const result: unknown[] = [];
      for (const entry of value) {
        result.push(serializeValue(entry, options, seen, depth + 1));
        if (result.length >= options.maxItems) {
          result.push('[Truncated]');
          break;
        }
      }
      return result;
    }

    const entries = Object.entries(value as Record<string, unknown>);
    const output: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      if (shouldRedactKey(key, options.redactedKeys ?? [])) {
        output[key] = '[REDACTED]';
        continue;
      }
      output[key] = serializeValue(entryValue, options, seen, depth + 1);
      if (Object.keys(output).length >= options.maxItems) {
        output.__truncated = true;
        break;
      }
    }
    return output;
  }

  return `[Unsupported:${typeof value}]`;
}

export function toSerializableEvent<S extends object>(
  event: PipelineEvent<S>,
  options: SerializationOptions = {},
): PipelineEvent<S> {
  const hasCustomSerialization =
    typeof options.maxDepth !== 'undefined'
    || typeof options.maxItems !== 'undefined'
    || typeof options.redactedKeys !== 'undefined'
    || typeof options.selectState !== 'undefined';
  if (!hasCustomSerialization && event.type !== 'node_error' && event.type !== 'run_failed') {
    return event;
  }

  const redactedKeys = new Set(options.redactedKeys ?? []);
  for (const key of DEFAULT_REDACTED_KEYS) redactedKeys.add(key);

  const effectiveOptions: Required<Pick<SerializationOptions, 'maxDepth' | 'maxItems' | 'redactedKeys' | 'selectState'>> = {
    maxDepth: options.maxDepth ?? 6,
    maxItems: options.maxItems ?? 200,
    redactedKeys,
    selectState: options.selectState ?? ((state: unknown) => state),
  };

  const withSelectedState = (value: unknown): unknown => {
    const selected = effectiveOptions.selectState(value);
    return serializeValue(selected, effectiveOptions, new WeakSet<object>());
  };

  const sanitized = serializeValue(event, effectiveOptions, new WeakSet<object>());
  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    const record = sanitized as Record<string, unknown>;
    const eventRecord = event as unknown as Record<string, unknown>;

    if (typeof record.stateSnapshot !== 'undefined') {
      record.stateSnapshot = withSelectedState(eventRecord.stateSnapshot);
    }
    if (typeof record.patch !== 'undefined') {
      record.patch = withSelectedState(eventRecord.patch);
    }
    if (typeof record.metadata !== 'undefined') {
      record.metadata = withSelectedState(eventRecord.metadata);
    }
    if (typeof record.error !== 'undefined' && !(record.error instanceof Error)) {
      record.error = serializeValue(eventRecord.error, effectiveOptions, new WeakSet<object>());
    }
    return record as unknown as PipelineEvent<S>;
  }

  return event;
}
