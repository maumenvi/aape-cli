/** Per-LLM allow-list for tools, skills, and MCP servers. */
export interface LlmAccessPolicy {
  tools?: string[];
  skills?: string[];
  mcps?: string[];
}
