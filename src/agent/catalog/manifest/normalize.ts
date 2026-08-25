import type { SourcesManifest } from '../types/index.ts';
import { createDefaultManifest } from './defaults.ts';

export const normalizeManifest = (parsed: Partial<SourcesManifest>): SourcesManifest => ({
  ...createDefaultManifest(),
  ...parsed,
  config: {
    ...createDefaultManifest().config,
    ...(parsed.config ?? {}),
  },
  sources: { ...(parsed.sources ?? {}) },
  skills: { ...(parsed.skills ?? {}) },
  mcps: { ...(parsed.mcps ?? {}) },
  tools: { ...(parsed.tools ?? {}) },
});
