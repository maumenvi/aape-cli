/** Configuration for a catalog registry provider. */
export interface CatalogRegistryConfig {
  provider: 'skills.sh' | 'github-skills' | 'mcp';
  url: string;
}
