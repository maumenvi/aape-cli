import type { Repository, Skill, SkillConfig } from '../tools/types.ts';
import { AgentCatalogStore } from '../catalog/store.ts';

export class AgentSkillManager {
  private readonly skills = new Map<string, Skill>();
  private readonly repositories: Repository[] = [];
  private readonly catalog = new AgentCatalogStore();

  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  async getOrLoadSkill(name: string): Promise<Skill | undefined> {
    const existing = this.getSkill(name);
    if (existing) {
      return existing;
    }

    const runtime = await this.catalog.loadRuntimeModule('skill', name);
    if (!runtime || typeof runtime !== 'object' || !('skill' in runtime)) {
      throw new Error(`Skill module "${name}" does not export a "skill" object`);
    }

    const loadedSkill = (runtime as { skill: Skill }).skill;
    this.addSkill(loadedSkill);
    return loadedSkill;
  }

  addRepository(repo: Repository): AgentSkillManager {
    this.repositories.push(repo);
    return this;
  }

  addSkill(skill: Skill | SkillConfig): AgentSkillManager {
    const resolvedSkill: Skill = 'execute' in skill
      ? skill
      : {
          name: skill.name ?? skill.id ?? `skill-${this.skills.size}`,
          description: skill.description ?? 'Registered skill',
          usesTools: skill.uses ?? [],
          allowedLlms: skill.allowedLlms,
          async execute() {
            return { ok: true, name: skill.name ?? skill.id ?? 'skill' };
          },
        };

    this.skills.set(resolvedSkill.name, resolvedSkill);
    return this;
  }

  add(skill: Skill | SkillConfig): AgentSkillManager {
    return this.addSkill(skill);
  }

  async install(identifier: string, skill?: Skill | SkillConfig): Promise<AgentSkillManager> {
    if (skill) {
      return this.addSkill(skill);
    }

    this.catalog.addDependency('skill', identifier, {
      version: '*',
      source: 'local',
      enabled: true,
      capabilities: [],
      constraints: [],
      allowedLlms: ['*'],
    });
    this.catalog.buildLock();
    const discovered = this.catalog.discover('skill', identifier, 1);
    if (discovered[0]?.name === identifier) {
      await this.getOrLoadSkill(identifier);
    } else {
      this.skills.set(identifier, {
        name: identifier,
        description: `Catalog-managed skill: ${identifier}`,
        usesTools: [],
        allowedLlms: ['*'],
        async execute() {
          return { ok: true, installed: identifier };
        },
      });
    }
    return this;
  }

  async addFromHub(repository: string | Repository, name?: string): Promise<AgentSkillManager> {
    const resolvedRepository: Repository = typeof repository === 'string'
      ? { type: 'git', name: repository, url: repository }
      : repository;
    const targetName = name ?? resolvedRepository.name ?? 'skill';
    this.addRepository(resolvedRepository);
    if (resolvedRepository.url) {
      this.catalog.addSource(resolvedRepository.name ?? targetName, {
        type: 'git',
        url: resolvedRepository.url,
        ref: resolvedRepository.ref ?? 'main',
        trusted: resolvedRepository.trusted ?? false,
      });
    }
    await this.install(targetName);
    return this;
  }

  async discover(query = '', limit = 10) {
    const search = query.trim().toLowerCase();
    const localEntries = [...this.skills.values()].map((skill) => ({
      name: skill.name,
      description: skill.description,
      usesTools: skill.usesTools,
      allowedLlms: skill.allowedLlms,
    }));

    const remoteEntries = this.catalog.discover('skill', search || '', 200);
    const merged = [...localEntries, ...remoteEntries.map((entry) => ({
      name: entry.name,
      description: entry.description,
      usesTools: [],
      allowedLlms: entry.allowedLlms,
    }))];

    const filtered = !search ? merged : merged.filter((entry) => `${entry.name} ${entry.description}`.toLowerCase().includes(search));
    return filtered.slice(0, limit);
  }

  list(): Array<{ name: string; description: string; usesTools: string[]; allowedLlms?: string[] }> {
    return [...this.skills.values()].map((skill) => ({
      name: skill.name,
      description: skill.description,
      usesTools: skill.usesTools,
      allowedLlms: skill.allowedLlms,
    }));
  }

  describe() {
    const registered = this.list();
    return {
      config: { skills: registered },
      registered,
      repositories: this.repositories,
      installed: this.catalog.getInstalledPackages('skill'),
    };
  }
}

export class SkillRegistry extends AgentSkillManager {}

export function createAgentSkillManager(): AgentSkillManager {
  return new AgentSkillManager();
}

export function createSkillRegistry(): SkillRegistry {
  return new SkillRegistry();
}
