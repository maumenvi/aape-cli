/** Describes a skill installed from a well-known catalog endpoint. */
export interface WellKnownSkillInstall {
  type: 'well-known';
  baseUrl: string;
  skill: string;
}
