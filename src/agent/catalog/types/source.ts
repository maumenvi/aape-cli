interface CatalogSourceBase {
  url: string;
  ref?: string;
  trusted?: boolean;
}

export interface GitCatalogSource extends CatalogSourceBase {
  type: 'git';
}

export interface RegistryCatalogSource extends CatalogSourceBase {
  type: 'registry';
}

export interface WellKnownCatalogSource extends CatalogSourceBase {
  type: 'well-known';
}

export type CatalogSource = GitCatalogSource | RegistryCatalogSource | WellKnownCatalogSource;
