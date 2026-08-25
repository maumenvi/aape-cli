import type { AapeRequest } from '../types/request.ts';
import type { AapeResponse } from '../types/response.ts';
import { RouteMatcher } from './route-matcher.ts';
import type { PipelineNode, RouteStep } from './types.ts';
import type { TrieRouteMatch } from './trie.types.ts';
import { dispatchRoute } from './route-dispatch.ts';

export type { PipelineNode, RouteStep } from './types.ts';
export type { TrieRouteMatch } from './trie.types.ts';

export class Router {
  protected readonly trie: RouteMatcher;

  constructor(prefix = '') {
    this.trie = new RouteMatcher(prefix);
  }

  private add(method: string, path: string, ...steps: RouteStep[]): this {
    this.trie.add(method, path, ...steps);
    return this;
  }

  get(path: string, ...steps: RouteStep[]): this {
    return this.add('GET', path, ...steps);
  }

  post(path: string, ...steps: RouteStep[]): this {
    return this.add('POST', path, ...steps);
  }

  put(path: string, ...steps: RouteStep[]): this {
    return this.add('PUT', path, ...steps);
  }

  patch(path: string, ...steps: RouteStep[]): this {
    return this.add('PATCH', path, ...steps);
  }

  delete(path: string, ...steps: RouteStep[]): this {
    return this.add('DELETE', path, ...steps);
  }

  match(method: string, url: string): TrieRouteMatch | null {
    return this.trie.match(method, url);
  }

  use(prefix: string, child: Router): void {
    this.trie.use(prefix, child.trie);
  }

  async dispatch(
    req: AapeRequest,
    res: AapeResponse,
    globalSteps: RouteStep[],
    onNotFound: PipelineNode,
    onError: (err: unknown, req: AapeRequest, res: AapeResponse) => Promise<void>,
  ): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const matched = this.match(req.method ?? 'GET', url.pathname);
    await dispatchRoute(req, res, matched, globalSteps, onNotFound, onError);
  }
}
