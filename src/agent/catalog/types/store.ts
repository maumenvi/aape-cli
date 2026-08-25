export interface CatalogStoreOptions {
  cwd?: string;
  manifestFile?: string;
  lockFile?: string;
}

export interface CatalogStorePaths {
  manifest: string;
  lock: string;
  contextDir: string;
  contextDev: string;
  contextLlm: string;
  vscodeMcp: string;
}
