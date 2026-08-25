import { createServer, type Server } from 'node:http';
import { Router, type RouteStep } from './router/index.ts';
import { defaultLogger, type Logger } from '../core/logger.ts';
import type { ErrorHandler } from './types/error.handler.ts';
import type { AapeRequest } from './types/request.ts';
import type { AapeResponse } from './types/response.ts';
import type { HttpState } from './types/http.state.ts';
import { wrapRequest } from './context/wrap.request.ts';
import { wrapResponse } from './context/wrap.response.ts';
import { parseQuery } from './context/parse.query.ts';
import { readBody } from './context/read.body.ts';
import { defineSchema, object, boolean, number, pass } from '../validation/index.ts';

const appOptions = defineSchema(object({
  logger:       pass<Logger>().default(defaultLogger).describe('Logger'),
  parseBody:    boolean().default(true).describe('parseBody must be a boolean'),
  bodyLimit:    number().default(1_048_576).describe('Max body size in bytes (default 1MB)'),
}));

type AppOptions = typeof appOptions.type;

export class App {
  readonly router: Router;
  private globalSteps: RouteStep[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private logger: Logger;
  private options: AppOptions;
  private server?: Server;

  constructor(options: Partial<AppOptions> = {}) {
    this.options = appOptions.schema.parse(options);
    this.logger = this.options.logger;
    this.router = new Router();
  }

  use(...args: [string, Router] | [RouteStep]): this {
    if (typeof args[0] === 'string' && args[1] instanceof Router) {
      this.router.use(args[0], args[1]);
    } else {
      this.globalSteps.push(args[0] as RouteStep);
    }
    return this;
  }

  onError(handler: ErrorHandler): this {
    this.errorHandlers.push(handler);
    return this;
  }

  get(path: string, ...steps: RouteStep[]): this {
    this.router.get(path, ...steps);
    return this;
  }

  post(path: string, ...steps: RouteStep[]): this {
    this.router.post(path, ...steps);
    return this;
  }

  put(path: string, ...steps: RouteStep[]): this {
    this.router.put(path, ...steps);
    return this;
  }

  patch(path: string, ...steps: RouteStep[]): this {
    this.router.patch(path, ...steps);
    return this;
  }

  delete(path: string, ...steps: RouteStep[]): this {
    this.router.delete(path, ...steps);
    return this;
  }

  private async handleError(
    err: unknown,
    req: AapeRequest,
    res: AapeResponse,
  ): Promise<void> {
    for (const handler of this.errorHandlers) {
      let resolved = false;
      await handler(err, req, res, () => { resolved = true; });
      if (!resolved) return;
    }

    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  }

  private notFound = ({ res }: HttpState) => {
    res.status(404).json({ error: 'Not Found' });
  };

  listen(port: number, hostname = '0.0.0.0'): Promise<Server> {
    this.server = createServer(async (rawReq, rawRes) => {
      const req = wrapRequest(rawReq);
      const res = wrapResponse(rawRes);

      const url = new URL(req.url ?? '/', `http://localhost`);
      req.query = parseQuery(url.search);

      if (this.options.parseBody) {
        const bodyResult = await readBody(rawReq, this.options.bodyLimit);
        if (!bodyResult.ok) {
          res.status(bodyResult.status).json({ error: bodyResult.error });
          return;
        }
        const raw = bodyResult.data;
        if (raw) {
          const contentType = rawReq.headers['content-type'] ?? '';
          if (contentType.includes('application/json')) {
            try { req.body = JSON.parse(raw); }
            catch { res.status(400).json({ error: 'Invalid JSON body' }); return; }
          } else {
            req.body = raw;
          }
        }
      }

      await this.router.dispatch(
        req,
        res,
        this.globalSteps,
        this.notFound,
        (err, req, res) => this.handleError(err, req, res),
      );
    });

    return new Promise((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(port, hostname, () => {
        this.server!.removeListener('error', reject);
        this.logger.info(`listening on http://${hostname}:${port}`);
        resolve(this.server!);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
