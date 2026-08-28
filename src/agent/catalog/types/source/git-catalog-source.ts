/** Git-backed catalog source configuration. */
export interface GitCatalogSource {
  type: 'git';
  url: string;
  ref?: string;
  trusted?: boolean;
}
