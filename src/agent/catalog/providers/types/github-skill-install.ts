/** Describes a skill installed from a GitHub repository. */
export interface GitHubSkillInstall {
  type: 'github';
  repository: string;
  skill: string;
}
