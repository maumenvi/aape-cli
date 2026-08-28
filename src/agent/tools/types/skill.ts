/** Runtime skill implementation exposed to agents. */
export interface Skill {
  name: string;
  description: string;
  usesTools: string[];
  allowedLlms?: string[];

  /** Runs the skill with the current state and execution context. */
  execute(state: unknown, context: unknown): Promise<unknown>;
}
