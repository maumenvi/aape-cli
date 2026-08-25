import type { RouteStep } from './types.ts';

export interface Route {
  method: string;
  path: string;
  query: Record<string, string>;
  steps: RouteStep[];
}

export interface TrieRouteMatch {
  route: Route;
  params: Record<string, string>;
}

export interface TrieNode {
  staticChildren: Map<string, TrieNode>;
  paramChild?: TrieNode;
  paramName?: string;
  routesByMethod: Map<string, Route[]>;
}
