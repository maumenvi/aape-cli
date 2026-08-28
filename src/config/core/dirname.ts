import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Defines the dirname value. */
export const __dirname = path.dirname(fileURLToPath(import.meta.url));
