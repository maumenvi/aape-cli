


/** Performs the canonicalize operation. */
export const canonicalize = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }

  const objectValue = value as Record<string, unknown>;
  const sortedKeys = Object.keys(objectValue).sort((a, b) => a.localeCompare(b));
  const normalized: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    normalized[key] = canonicalize(objectValue[key]);
  }
  return normalized;
};
