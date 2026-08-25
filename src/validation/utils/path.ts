export function appendPath(base: string, key: string): string {
  return base ? `${base}.${key}` : key;
}

export function appendIndexPath(base: string, index: number): string {
  return base ? `${base}[${index}]` : `[${index}]`;
}
