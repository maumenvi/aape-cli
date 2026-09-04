import type { CommandHandler } from '../../contracts/command-handler.ts';
import { configureAgents } from '../agent/configure-agents.ts';
import { resolveTargets } from '../agent/resolve-targets.ts';
import { ensureInitialized } from './ensure-initialized.ts';
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
    console.log('Initialized maia manifest, lockfile, and agent guidance files');
    restoreConfiguredAgents(store);
    return;
  }

  const targets = resolveTargets(agentIds);
  const uniqueTargets = [...new Map(targets.map((target) => [target.id, target])).values()];
  const selectedIds = uniqueTargets.map((target) => target.id);
  store.saveSelectedAgents(selectedIds);

  console.log('Initialized maia manifest, lockfile, and agent guidance files');
  configureAgents(store, selectedIds);
};
