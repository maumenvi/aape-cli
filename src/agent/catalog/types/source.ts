export interface CatalogSource {
  type: 'git';
  url: string;
  ref?: string;
  trusted?: boolean;
}
