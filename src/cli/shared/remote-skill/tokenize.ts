/** Normalizes a catalog or directory name into comparable tokens. */
export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

