import { AgentToolManager } from './manager.ts';
import { AgentToolDiscovery } from './discovery.ts';
import type { RunContext } from '../../pipeline/types.ts';
import { createMcpManager } from '../mcp/manager/index.ts';
import { createSkillRegistry } from '../skills/manager.ts';
import { AgentCatalogStore } from '../catalog/store.ts';
import { canLlmAccessResource } from '../access/policy.ts';
import type { LlmManager } from '../llm/manager.ts';

export class ToolContext {
  public readonly manager: AgentToolManager;
  public readonly discovery: AgentToolDiscovery;
  public readonly runContext?: RunContext;
  private readonly catalog = new AgentCatalogStore();

  private readonly mcpManager: ReturnType<typeof createMcpManager>;
  private readonly skillRegistry: ReturnType<typeof createSkillRegistry>;
  private activeLlmId?: string;

  constructor(runContextOrMcpManager?: RunContext | ReturnType<typeof createMcpManager>, skillRegistry?: ReturnType<typeof createSkillRegistry>, pipelineContext?: unknown) {
    this.manager = new AgentToolManager();
    this.discovery = new AgentToolDiscovery();
    this.runContext = (runContextOrMcpManager && 'state' in runContextOrMcpManager && 'metadata' in runContextOrMcpManager)
      ? runContextOrMcpManager as RunContext
      : undefined;

    this.mcpManager = (runContextOrMcpManager && !this.runContext)
      ? runContextOrMcpManager as ReturnType<typeof createMcpManager>
      : createMcpManager();
    this.skillRegistry = skillRegistry ?? createSkillRegistry();
    this.runContext ??= pipelineContext as RunContext | undefined;
    this.activeLlmId = this.resolveLlmIdFromContext();
  }

  private buildToolSchema(name: string, description: string) {
    return {
      type: 'function' as const,
      function: {
        name,
        description,
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: true,
        },
      },
    };
  }

  private buildMetaTools() {
    const metaTools = [
      this.buildToolSchema('discover_tools', 'discover tools from the sources/source.lock catalog.'),
      this.buildToolSchema('install_tool', 'Install a tool dependency into sources and source.lock.'),
      this.buildToolSchema('discover_skills', 'discover skills from the sources/source.lock catalog.'),
      this.buildToolSchema('install_skill', 'Install a skill dependency into sources and source.lock.'),
      this.buildToolSchema('sync_mcp_vscode', 'Sync MCP entries from source.lock into .vscode/mcp.json.'),
      this.buildToolSchema('build_context', 'Generate .aape/context.dev.json and .aape/context.llm.json from source.lock.'),
    ];
    return metaTools.filter((entry) => this.canAccess('tool', entry.function.name, ['*']));
  }

  private resolveLlmIdFromContext(): string | undefined {
    const metadataLlm = this.runContext?.metadata?.llmId;
    return typeof metadataLlm === 'string' && metadataLlm.length > 0 ? metadataLlm : undefined;
  }

  private resolveLlmManagerFromContext(): LlmManager | undefined {
    return this.runContext?.llm;
  }

  private canAccess(kind: 'tool' | 'skill' | 'mcp', resourceName: string, resourceAllowedLlms?: string[]): boolean {
    const llmId = this.activeLlmId ?? this.resolveLlmIdFromContext();
    if (!llmId) return true;
    const llmPolicy = this.resolveLlmManagerFromContext()?.getAccessPolicy(llmId);
    return canLlmAccessResource(
      llmId,
      kind,
      resourceName,
      llmPolicy,
      resourceAllowedLlms,
      this.catalog.getLlmAccessDefault(),
    );
  }

  private assertAccess(kind: 'tool' | 'skill' | 'mcp', resourceName: string, resourceAllowedLlms?: string[]): void {
    if (!this.canAccess(kind, resourceName, resourceAllowedLlms)) {
      throw new Error(`${kind} "${resourceName}" not found`);
    }
  }

  setActiveLlm(llmId?: string): ToolContext {
    this.activeLlmId = llmId;
    return this;
  }

  async call(name: string, arguments_: unknown): Promise<unknown> {
    const input = (arguments_ && typeof arguments_ === 'object')
      ? arguments_ as Record<string, unknown>
      : {};

    if (name === 'discover_tools') {
      this.assertAccess('tool', 'discover_tools', ['*']);
      const query = typeof input.query === 'string' ? input.query : '';
      const discovered = await this.discovery.discover(query);
      return discovered.filter((entry) => this.canAccess('tool', entry.name, entry.allowedLlms));
    }
    if (name === 'install_tool') {
      this.assertAccess('tool', 'install_tool', ['*']);
      const target = typeof input.name === 'string' ? input.name : '';
      if (!target) throw new Error('install_tool requires "name"');
      await this.manager.install(target);
      return { ok: true, installed: `tool:${target}` };
    }
    if (name === 'discover_skills') {
      this.assertAccess('tool', 'discover_skills', ['*']);
      const query = typeof input.query === 'string' ? input.query : '';
      const discovered = await this.skillRegistry.discover(query);
      return discovered.filter((entry) => this.canAccess('skill', entry.name, entry.allowedLlms));
    }
    if (name === 'install_skill') {
      this.assertAccess('tool', 'install_skill', ['*']);
      const target = typeof input.name === 'string' ? input.name : '';
      if (!target) throw new Error('install_skill requires "name"');
      await this.skillRegistry.install(target);
      return { ok: true, installed: `skill:${target}` };
    }
    if (name === 'sync_mcp_vscode') {
      this.assertAccess('tool', 'sync_mcp_vscode', ['*']);
      return this.mcpManager.syncVsCodeConfig();
    }
    if (name === 'build_context') {
      this.assertAccess('tool', 'build_context', ['*']);
      return this.catalog.buildContexts();
    }

    const matchingTool = await this.manager.getOrLoadTool(name);
    if (!matchingTool) {
      throw new Error(`Tool "${name}" not found`);
    }
    this.assertAccess('tool', matchingTool.name, matchingTool.allowedLlms);

    return matchingTool.execute(arguments_ ?? {});
  }

  async callSkill(name: string, state: unknown): Promise<unknown> {
    const matchingSkill = await this.skillRegistry.getOrLoadSkill(name);
    if (!matchingSkill) {
      throw new Error(`Skill "${name}" not found`);
    }
    this.assertAccess('skill', matchingSkill.name, matchingSkill.allowedLlms);

    return matchingSkill.execute(state, this.runContext ?? {});
  }

  describe() {
    const listedTools = this.manager.list().filter((tool) => this.canAccess('tool', tool.name, tool.allowedLlms));
    const listedSkills = this.skillRegistry.list().filter((skill) => this.canAccess('skill', skill.name, skill.allowedLlms));
    const tools = listedTools.map((tool) => this.buildToolSchema(tool.name, tool.description));
    const skills = listedSkills.map((skill) => this.buildToolSchema(skill.name, skill.description));
    const paths = this.catalog.getPaths();

    return {
      config: {
        tools: listedTools,
        skills: listedSkills,
        llmAccessDefault: this.catalog.getLlmAccessDefault(),
        manifest: paths.manifest,
        lock: paths.lock,
      },
      tools,
      skills,
      metaTools: this.buildMetaTools(),
    };
  }
}

export function createToolContext(runContextOrMcpManager?: RunContext | ReturnType<typeof createMcpManager>, skillRegistry?: ReturnType<typeof createSkillRegistry>, pipelineContext?: unknown): ToolContext {
  return new ToolContext(runContextOrMcpManager, skillRegistry, pipelineContext);
}
