import type { CliContext } from './cli-context.ts';

/** Handles a CLI command with parsed arguments and shared context. */
export type CommandHandler = (args: string[], context: CliContext) => Promise<void>;
