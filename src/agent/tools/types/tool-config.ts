/** Describes a tool loaded from configuration. */
export interface ToolConfig {
  id?: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  allowedLlms?: string[];
}
