/** Common manifest fields for a catalog dependency. */
export interface CatalogDependencyBase {
  version: string;
  source: string;
  path?: string;
  enabled?: boolean;
  capabilities?: string[];
  constraints?: string[];
  allowedLlms?: string[];
}
