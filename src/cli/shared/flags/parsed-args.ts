/** Represents positional arguments and long flags parsed from CLI input. */
export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string>;
}
