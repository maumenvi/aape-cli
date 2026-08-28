import type { GitHubSkillInstall } from './github-skill-install.ts';
import type { McpInstall } from './mcp-install.ts';
import type { WellKnownSkillInstall } from './well-known-skill-install.ts';

/** Installation metadata for any supported catalog result. */
export type CatalogInstall = GitHubSkillInstall | WellKnownSkillInstall | McpInstall;
