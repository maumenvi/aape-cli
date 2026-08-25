import type { DevtoolsDashboardOptions } from '../types.ts';

export interface DashboardPaths {
  basePath: string;
  appPath: string;
  stylesPath: string;
  modulesPath: string;
  runPath: string;
  eventsPath: string;
  timelinePath: string;
  enabledPath: string;
  clearPath: string;
}

function normalizeBasePath(value: string | undefined): string {
  const trimmed = (value ?? '/devtools').trim();
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
}

export function resolveDashboardPaths(options: DevtoolsDashboardOptions = {}): DashboardPaths {
  const basePath = normalizeBasePath(options.basePath);
  return {
    basePath,
    appPath: `${basePath}/modules/main.tsx`,
    stylesPath: `${basePath}/styles.css`,
    modulesPath: `${basePath}/modules/`,
    runPath: options.runPath ?? '/run',
    eventsPath: `${basePath}/events`,
    timelinePath: `${basePath}/timeline`,
    enabledPath: `${basePath}/enabled`,
    clearPath: `${basePath}/clear`,
  };
}
