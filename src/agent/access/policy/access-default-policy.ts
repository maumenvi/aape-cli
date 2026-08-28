import { ACCESS_DEFAULT_ALLOW, ACCESS_DEFAULT_DENY } from './constants.ts';

/** Default access behavior when no explicit allow-list is present. */
export type AccessDefaultPolicy = typeof ACCESS_DEFAULT_ALLOW | typeof ACCESS_DEFAULT_DENY;
