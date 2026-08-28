/** Well-known endpoint catalog source configuration. */
export interface WellKnownCatalogSource {
  type: 'well-known';
  url: string;
  ref?: string;
  trusted?: boolean;
}
