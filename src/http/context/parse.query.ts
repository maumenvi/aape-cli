// ──────────────────────────────────────────────
// Parse URL query string
// ──────────────────────────────────────────────

export function parseQuery(search: string): Record<string, string> {
  const result: Record<string, string> = {};
  const params = new URLSearchParams(search);
  params.forEach((value, key) => { result[key] = value; });
  return result;
}
