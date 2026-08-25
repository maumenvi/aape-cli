export const safeParseJson = <T>(raw: string, filePath: string): T => {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON file "${filePath}": ${message}`);
  }
};
