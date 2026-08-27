import path from 'node:path';

export function resolveContextPaths(manifestPath: string) {
  const contextDir = path.resolve(path.dirname(manifestPath), '.maia');
  return {
    contextDir,
    contextDev: path.resolve(contextDir, 'context.dev.json'),
    contextLlm: path.resolve(contextDir, 'context.llm.json'),
    vscodeMcp: path.resolve(path.dirname(manifestPath), '.vscode', 'mcp.json'),
  };
}
