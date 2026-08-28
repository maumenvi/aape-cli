/** Registry-backed catalog source configuration. */
export interface RegistryCatalogSource {
  type: 'registry';
  url: string;
  ref?: string;
  trusted?: boolean;
}
