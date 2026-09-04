import path from 'node:path';

import type { CommandHandler } from '../../contracts/command-handler.ts';
import { configureAgents } from '../agent/configure-agents.ts';
import { resolveTargets } from '../agent/resolve-targets.ts';
import { ensureInitialized } from './ensure-initialized.ts';
import { ensureAgentGuidanceFile } from './ensure-agent-guidance-file.ts';
import { normalizeAgentIds } from './normalize-agent-ids.ts';
import { promptForAgentIds } from './prompt-for-agent-ids.ts';
import { restoreConfiguredAgents } from './restore-configured-agents.ts';

/** Performs the init command operation. */
export const initCommand: CommandHandler = async (args, { store }) => {
  ensureInitialized(store);

  const explicitAgentIds = normalizeAgentIds(args);
  const agentIds = explicitAgentIds.length > 0 ? explicitAgentIds : await promptForAgentIds();

  if (agentIds.length === 0) {
    store.saveSelectedAgents([]);
    const paths = store.getPaths();
    if (Object.keys(store.loadManifest().agents).length === 0) {
      ensureAgentGuidanceFile(path.resolve(paths.stateDir, 'AGENT.md'));
      ensureAgentGuidanceFile(path.resolve(paths.stateDir, 'AGENTS.md'));
    }
    console.log('Initialized maia manifest, lockfile, and fallback capability folders');
    restoreConfiguredAgents(store);
    return;
  }

  const targets = resolveTargets(agentIds);
  const uniqueTargets = [...new Map(targets.map((target) => [target.id, target])).values()];
  const selectedIds = uniqueTargets.map((target) => target.id);
  store.saveSelectedAgents(selectedIds);

  console.log('Initialized maia manifest, lockfile, and agent configuration');
  configureAgents(store, selectedIds);
};
