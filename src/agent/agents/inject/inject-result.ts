/** Outcome of injecting Maia MCP config into an agent config file. */
export interface InjectResult {
  configPath: string;
  created: boolean;
  updated: boolean;
}
