export interface ToolConfig {
  id?: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  allowedLlms?: string[];
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  allowedLlms?: string[];
  execute(input: unknown): Promise<unknown>;
}

export interface SkillConfig {
  id?: string;
  name?: string;
  description: string;
  uses?: string[];
  handler?: string;
  pipelineId?: string;
  inputSchema?: Record<string, unknown>;
  allowedLlms?: string[];
}

export interface Skill {
  name: string;
  description: string;
  usesTools: string[];
  allowedLlms?: string[];
  execute(state: unknown, context: unknown): Promise<unknown>;
}

export interface ToolDescription {
  config: {
    tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown>; allowedLlms: string[] }>;
    skills: Array<{ name: string; description: string; usesTools: string[]; allowedLlms: string[] }>;
    llmAccessDefault?: 'allow' | 'deny';
  };
  tools: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
  skills: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
  metaTools: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
}

export interface Repository {
  type: 'git' | 'custom';
  name?: string;
  url?: string;
  baseUrl?: string;
  ref?: string;
  trusted?: boolean;
  org?: string;
  repo?: string;
  default?: boolean;
}

export interface MCPStdioConfig {
  transport?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPHttpConfig {
  transport: 'http';
  url: string;
  headers?: Record<string, string>;
}

export interface MCPSseConfig {
  transport: 'sse';
  url: string;
  headers?: Record<string, string>;
}

export interface MCPWebSocketConfig {
  transport: 'ws';
  url: string;
  headers?: Record<string, string>;
}

export interface MCPNpxConfig {
  transport: 'npx';
  package: string;
  args?: string[];
  env?: Record<string, string>;
  npxArgs?: string[];
}

export type MCPConfig = MCPStdioConfig | MCPHttpConfig | MCPSseConfig | MCPWebSocketConfig | MCPNpxConfig;
