import type { IncomingMessage, ServerResponse } from 'node:http';
import { renderDashboardHtml } from './html.ts';
import { resolveDashboardPaths } from './paths.ts';
import { renderDashboardCss } from './style.ts';
import { transpileDashboardModule } from './transpile.ts';
import type { DevtoolsDashboardOptions } from '../types.ts';

interface DashboardDependencies {
  sseHandler: (req: IncomingMessage, res: ServerResponse) => void;
  getSnapshot: () => { enabled: boolean; events: unknown[] };
  setEnabled: (value: boolean) => void;
  clear: () => void;
}

export function createDashboardHandler(deps: DashboardDependencies) {
  return (
    req: IncomingMessage,
    res: ServerResponse,
    options: DevtoolsDashboardOptions = {},
  ): void => {
    const paths = resolveDashboardPaths(options);
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname;

    if (pathname === paths.basePath || pathname === `${paths.basePath}/`) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderDashboardHtml(options));
      return;
    }

    if (pathname === paths.stylesPath) {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      res.end(renderDashboardCss());
      return;
    }

    if (pathname.startsWith(paths.modulesPath)) {
      const modulePath = pathname.slice(paths.modulesPath.length);
      const code = transpileDashboardModule(modulePath);
      if (code == null) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(code);
      return;
    }

    if (pathname === paths.eventsPath) {
      deps.sseHandler(req, res);
      return;
    }

    if (pathname === paths.timelinePath) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(deps.getSnapshot()));
      return;
    }

    if (pathname === paths.enabledPath && req.method === 'POST') {
      const value = (url.searchParams.get('value') ?? '').toLowerCase();
      deps.setEnabled(value === 'true');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ enabled: deps.getSnapshot().enabled }));
      return;
    }

    if (pathname === paths.clearPath && req.method === 'POST') {
      deps.clear();
      res.statusCode = 204;
      res.end();
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  };
}
