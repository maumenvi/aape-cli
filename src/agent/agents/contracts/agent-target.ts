import type { AgentMcpEntry } from './agent-mcp-entry.ts';

/** Describes the agent target contract. */
export interface AgentTarget {
  /** Short id used in CLI: "claude", "copilot", etc. */
  id: string;
  /** Additional accepted names in CLI, e.g. "vscode" -> "copilot". */
  aliases?: string[];
  /** Human-readable display name */
  name: string;
  /**
   * Resolve the absolute path(s) where this agent's MCP config lives.
   * Returns multiple candidates; the first existing one is used,
   * or the first candidate is created when none exist.
   */
  configPaths(cwd: string): string[];
  /**
   * Build the MCP entry that should be injected for this agent.
   * `cwd` is the project directory where `maia mcp-server` will run.
   */
  buildEntry(cwd: string, agentId: string): AgentMcpEntry;
}
