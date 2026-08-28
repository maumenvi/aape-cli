/**
 * Static application configuration describing catalog endpoints and the
 * on-disk locations used to resolve bundled skills, tools and MCP metadata.
 */
export interface AppConfig {
  catalog: {
    skillsRegistryUrl: string;
    mcpRegistryUrl: string;
  };
  paths: {
    rootDir: string;
    skillsRoot: string;
    toolsRoot: string;
    mcpRoot: string;
  };
}
