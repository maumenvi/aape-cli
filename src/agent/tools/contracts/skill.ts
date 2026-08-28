
/** Describes the skill contract. */
export interface Skill {
  name: string;
  description: string;
  usesTools: string[];
  allowedLlms?: string[];
  /** Performs the execute operation. */
  execute(state: unknown, context: unknown): Promise<unknown>;
}
