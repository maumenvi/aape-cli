import { searchCatalog } from '../../agent/catalog/providers/index.ts';
import { findRegistryEntry } from '../../agent/catalog/registry/index.ts';
import { bestCatalogMatch, installCatalogResult } from '../install/external.ts';
import { createMcpConfig, installMcp } from '../install/mcp.ts';
import { installSkill } from '../install/skill.ts';
import { parseFlags } from '../shared/flags.ts';
import { normalizeKind } from '../shared/kind.ts';
import { materializeTool, reinstallFromLock } from '../shared/workspace.ts';
import type { CommandHandler } from '../types.ts';
import { ensureInitialized, restoreConfiguredAgents } from './init.ts';
import path from 'node:path';

function resolveAllowedLlms(flags: Record<string, string>): string[] {
  if (flags.allLlms === 'true' || flags['all-llms'] === 'true') {
    return ['*'];
  }
  const configured = flags.llms?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  return configured.length > 0 ? configured : ['*'];
}

function hasManualMcpConfig(flags: Record<string, string>): boolean {
  return ['transport', 'command', 'args', 'env', 'headers', 'npxArgs', 'package', 'url']
    .some((name) => typeof flags[name] !== 'undefined');
}

export const installCommand: CommandHandler = async (args, { store }) => {
  ensureInitialized(store);
  const { positional, flags } = parseFlags(args);

  if (positional.length === 0) {
    const lock = store.buildLock();
    const result = await reinstallFromLock(store, lock);
    restoreConfiguredAgents(store);
    console.log(`Bootstrapped source.lock with ${Object.keys(lock.packages).length} locked entries`);
    console.log(`Installed ${result.skills.length} skills and synced MCP config`);
    return;
  }

  const kind = normalizeKind(positional[0] ?? '');
  const name = positional[1];
  if (!name) {
    throw new Error(`Usage: maia i ${kind} <name> [--version <range>] [--source <alias>]`);
  }

  const version = flags.version ?? '*';
  const allowedLlms = resolveAllowedLlms(flags);
  const explicitSource = flags.source;

  if (kind === 'skill') {
    const isLocal = Boolean(findRegistryEntry('skill', name));
    if (!explicitSource && !isLocal) {
      const results = await searchCatalog(store.loadManifest(), 'skill', name, 10);
      const match = bestCatalogMatch(results, name);
      if (!match) {
        throw new Error(`Skill "${name}" was not found in configured catalogs`);
      }
      await installCatalogResult(store, match, allowedLlms);
    } else {
      await installSkill(store, {
        name,
        source: explicitSource ?? 'local',
        version,
        allowedLlms,
      });
    }
  } else if (kind === 'tool') {
    if (explicitSource && explicitSource !== 'local') {
      throw new Error('Tool installs only support the local registry');
    }
    const registryEntry = findRegistryEntry('tool', name);
    if (!registryEntry) {
      throw new Error(`Tool "${name}" is not available in the local registry`);
    }
    const targetPath = materializeTool(store, name);
    store.addDependency(kind, name, {
      version,
      source: 'local',
      enabled: true,
      capabilities: registryEntry.capabilities ?? [],
      constraints: [],
      allowedLlms,
      path: path.relative(path.dirname(store.getPaths().manifest), targetPath).replaceAll('\\', '/'),
      inputSchema: registryEntry.inputSchema,
    });
    store.buildLock();
  } else if (kind === 'mcp') {
    if (!explicitSource && !hasManualMcpConfig(flags)) {
      const results = await searchCatalog(store.loadManifest(), 'mcp', name, 10);
      const match = bestCatalogMatch(results, name);
      if (!match) {
        throw new Error(`MCP "${name}" was not found in configured catalogs`);
      }
      await installCatalogResult(store, match, allowedLlms);
    } else {
      installMcp(
        store,
        name,
        explicitSource ?? 'local',
        version,
        allowedLlms,
        createMcpConfig(name, flags),
      );
    }
  } else {
    store.addDependency(kind, name, {
      version,
      source: explicitSource ?? 'local',
      enabled: true,
      capabilities: [],
      constraints: [],
      allowedLlms,
    });
    store.buildLock();
  }

  console.log(`Installed ${kind}:${name}`);
};
