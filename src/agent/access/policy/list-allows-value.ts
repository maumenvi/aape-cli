import { ACCESS_ALL } from './constants.ts';

/** Returns whether an allow-list permits a concrete value or wildcard. */
export function listAllowsValue(list: string[], value: string): boolean {
  return list.includes(ACCESS_ALL) || list.includes(value);
}
