/** Runtime tool implementation exposed to agents. */
export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  allowedLlms?: string[];

  /** Executes the tool with validated or raw input. */
  execute(input: unknown): Promise<unknown>;
}
