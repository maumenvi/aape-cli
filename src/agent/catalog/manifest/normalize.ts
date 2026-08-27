import type { SourcesManifest } from '../types/index.ts';
import { createDefaultManifest } from './defaults.ts';

type LegacySourcesManifest = Partial<SourcesManifest> & {
  aapeVersion?: string;
};

export const normalizeManifest = (parsed: LegacySourcesManifest): SourcesManifest => ({
  ...createDefaultManifest(),
  ...parsed,
  ...(parsed.aapeVersion && !parsed.maiaVersion ? { maiaVersion: parsed.aapeVersion } : {}),
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
