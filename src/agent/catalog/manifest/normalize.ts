import type { SourcesManifest } from '../types/index.ts';
import { createDefaultManifest } from './defaults.ts';

export const normalizeManifest = (parsed: Partial<SourcesManifest>): SourcesManifest => ({
  ...createDefaultManifest(),
  ...parsed,
  config: {
    ...createDefaultManifest().config,
    ...(parsed.config ?? {}),
  },
  registries: {
    ...createDefaultManifest().registries,
    ...(parsed.registries ?? {}),
  },
  sources: { ...(parsed.sources ?? {}) },
  skills: { ...(parsed.skills ?? {}) },
  mcps: { ...(parsed.mcps ?? {}) },
  tools: { ...(parsed.tools ?? {}) },
  agents: { ...(parsed.agents ?? {}) },
});
