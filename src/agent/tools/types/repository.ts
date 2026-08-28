/** Repository source configuration for catalog content. */
export interface Repository {
  type: 'git' | 'custom';
  name?: string;
  url?: string;
  baseUrl?: string;
  ref?: string;
  trusted?: boolean;
  org?: string;
  repo?: string;
  default?: boolean;
}
