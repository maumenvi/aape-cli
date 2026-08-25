import type { Tool, ToolConfig } from './types.ts';
import { AgentCatalogStore } from '../catalog/store.ts';

export class AgentToolManager {
  private readonly tools = new Map<string, Tool>();
  private readonly catalog = new AgentCatalogStore();

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async getOrLoadTool(name: string): Promise<Tool | undefined> {
    const existing = this.getTool(name);
    if (existing) {
      return existing;
    }

    const runtime = await this.catalog.loadRuntimeModule('tool', name);
    if (!runtime || typeof runtime !== 'object' || !('tool' in runtime)) {
      throw new Error(`Tool module "${name}" does not export a "tool" object`);
    }

    const loadedTool = (runtime as { tool: Tool }).tool;
    this.addTool(loadedTool);
    return loadedTool;
  }

  addTool(tool: Tool | ToolConfig): AgentToolManager {
    const resolvedTool: Tool = 'execute' in tool
      ? tool
      : {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          allowedLlms: tool.allowedLlms,
          async execute() {
            return { ok: true, name: tool.name };
          },
        };

    this.tools.set(resolvedTool.name, resolvedTool);
    return this;
  }

  async install(identifier: string, tool?: Tool | ToolConfig): Promise<AgentToolManager> {
    if (tool) {
      return this.addTool(tool);
    }

    this.catalog.addDependency('tool', identifier, {
      version: '*',
      source: 'local',
      enabled: true,
      allowedLlms: ['*'],
    });
    this.catalog.buildLock();
    const discovered = this.catalog.discover('tool', identifier, 1);
    if (discovered[0]?.name === identifier) {
      await this.getOrLoadTool(identifier);
    } else {
      this.tools.set(identifier, {
        name: identifier,
        description: `Catalog-managed tool: ${identifier}`,
        inputSchema: { type: 'object', properties: {} },
        allowedLlms: ['*'],
        async execute() {
          return { ok: true, installed: identifier };
        },
      });
    }
    return this;
  }

  list(): Array<{ name: string; description: string; allowedLlms?: string[] }> {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      allowedLlms: tool.allowedLlms,
    }));
  }

  describe() {
    const discovered = this.catalog.discover('tool', '', 200);
    return {
      local: this.list(),
      discovered,
      installed: this.catalog.getInstalledPackages('tool'),
    };
  }
}

export function createAgentToolManager(): AgentToolManager {
  return new AgentToolManager();
}

export function createToolManager(): AgentToolManager {
  return new AgentToolManager();
}
