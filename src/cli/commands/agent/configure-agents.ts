import { injectAgentConfig } from '../../../agent/agents/inject/inject-agent-config.ts';
import { resolveConfigPath } from '../../../agent/agents/inject/resolve-config-path.ts';
import { writeAgentCapabilityProfile } from '../../../agent/agents/profiles/write-agent-capability-profile.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent-catalog-store.ts';
import { isProjectLocalConfig } from './is-project-local-config.ts';
import { resolveTargets } from './resolve-targets.ts';

/** Performs the configure agents operation. */
export function configureAgents(store: AgentCatalogStore, agentIds: string[]): void {
  const targets = resolveTargets(agentIds);
  const cwd = store.getPaths().projectRoot;

  let applied = false;
  for (const target of targets) {
    const profileFile = writeAgentCapabilityProfile(store, target);
    const configPath = resolveConfigPath(target, cwd);
    if (!isProjectLocalConfig(configPath, cwd)) {
      console.log(`Skipping ${target.name} config injection: this project is local-only and does not modify global agent configs.`);
      continue;
    }

    const { created, updated, configPath: finalPath } = injectAgentConfig(target, cwd, configPath);
    const action = created ? 'Created' : updated ? 'Updated' : 'No change in';
    console.log(`${action} ${target.name} config: ${finalPath}`);
    console.log(`maia mcp-server registered as "maia" in ${target.name}.`);
    console.log(`Authorized capabilities saved for ${target.name}: ${profileFile}`);
    if (target.id !== 'copilot') {
      console.log('Restart the agent/app to pick up the new MCP server.');
    }
    applied = true;
  }

  if (!applied) {
    console.log('No global agent config was modified. Maia is configured for local project management only.');
  }
}
