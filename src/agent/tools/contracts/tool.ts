
/** Describes the tool contract. */
export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  allowedLlms?: string[];
  /** Performs the execute operation. */
  execute(input: unknown): Promise<unknown>;
}
