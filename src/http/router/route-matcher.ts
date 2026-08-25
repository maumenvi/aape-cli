import type { RouteStep } from './types.ts';
import type { Route, TrieRouteMatch, TrieNode } from './trie.types.ts';

function getQueryParams(rawQuery?: string): Record<string, string> {
  const query: Record<string, string> = {};
  if (!rawQuery) return query;

  for (const [key, value] of new URLSearchParams(rawQuery)) {
    query[key] = value;
  }

  return query;
}

function resolveRouteNode(node: TrieNode, segment: string): TrieNode {
  if (segment.startsWith(':')) {
    if (!node.paramChild) {
      node.paramChild = createNode();
      node.paramName = segment.slice(1);
    }
    return node.paramChild;
  }

  let next = node.staticChildren.get(segment);
  if (!next) {
    next = createNode();
    node.staticChildren.set(segment, next);
  }

  return next;
}

export function createNode(): TrieNode {
  return {
    staticChildren: new Map(),
    routesByMethod: new Map(),
  };
}

export function normalizePath(path: string): string[] {
  const clean = path.split('?')[0];
  if (clean === '/' || clean === '') return [];
  return clean.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

export function joinPaths(prefix: string, path: string): string {
  if (!prefix) return path || '/';
  if (!path) return prefix || '/';
  return `${prefix.replace(/\/+$/g, '')}/${path.replace(/^\/+/, '')}`;
}

export class RouteMatcher {
  private root = createNode();
  private prefix: string;

  constructor(prefix = '') {
    this.prefix = prefix;
  }

  get rootNode(): TrieNode {
    return this.root;
  }

  add(method: string, path: string, ...steps: RouteStep[]): this {
    const [rawPath, rawQuery] = path.split('?');
    const fullPath = joinPaths(this.prefix, rawPath);
    const query = getQueryParams(rawQuery);
    const segments = normalizePath(fullPath);

    let node = this.root;
    for (const segment of segments) {
      node = resolveRouteNode(node, segment);
    }

    const route: Route = { method: method.toUpperCase(), path: fullPath, query, steps };
    const list = node.routesByMethod.get(route.method) ?? [];
    list.push(route);
    node.routesByMethod.set(route.method, list);
    return this;
  }

  match(method: string, url: string): TrieRouteMatch | null {
    const segments = normalizePath(url);
    const normalizedMethod = method.toUpperCase();

    const walk = (
      node: TrieNode,
      index: number,
      params: Record<string, string>,
    ): TrieRouteMatch | null => {
      if (index === segments.length) {
        const routes = node.routesByMethod.get(normalizedMethod);
        if (!routes?.length) return null;
        return { route: routes[0], params };
      }

      const segment = segments[index];
      const staticChild = node.staticChildren.get(segment);
      if (staticChild) {
        const staticMatch = walk(staticChild, index + 1, params);
        if (staticMatch) return staticMatch;
      }

      if (node.paramChild && node.paramName) {
        const paramMatch = walk(node.paramChild, index + 1, {
          ...params,
          [node.paramName]: segment,
        });
        if (paramMatch) return paramMatch;
      }

      return null;
    };

    return walk(this.root, 0, {});
  }

  use(prefix: string, child: RouteMatcher): void {
    const walk = (node: TrieNode, path: string[]) => {
      for (const [segment, next] of node.staticChildren) {
        walk(next, [...path, segment]);
      }

      if (node.paramChild && node.paramName) {
        walk(node.paramChild, [...path, `:${node.paramName}`]);
      }

      for (const routes of node.routesByMethod.values()) {
        for (const route of routes) {
          this.add(route.method, joinPaths(prefix, `/${path.join('/')}`), ...route.steps);
        }
      }
    };

    walk(child.rootNode, []);
  }
}

export default RouteMatcher;
