import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HttpState } from './types/http.state.ts';
import type { PipelineNode } from './router/index.ts';

/**
 * A connect/express-style middleware signature:
 * (req, res, next) — where next(err) signals an error.
 */
export type ConnectMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => void;

/**
 * Adapts any connect/express-style middleware into an Aape PipelineNode.
 *
 * Works with: helmet, cors, morgan, compression, express-rate-limit, and any
 * lib that follows the (req, res, next) convention.
 *
 * If the middleware calls next(err), the error is thrown so Aape's
 * onError handler picks it up.
 *
 * @example
 * import helmet from 'helmet';
 * import cors from 'cors';
 * import { fromConnect } from '@maumenvi/aape';
 *
 * app.use(fromConnect(helmet()));
 * app.use(fromConnect(cors({ origin: '*' })));
 */
export function fromConnect(middleware: ConnectMiddleware): PipelineNode {
  return ({ req, res }: HttpState) =>
    new Promise<void>((resolve, reject) => {
      // Resolve automatically if the middleware ends the response without calling next()
      const onFinish = () => resolve();
      res.once('finish', onFinish);

      middleware(req, res, (err) => {
        res.removeListener('finish', onFinish);
        err ? reject(err) : resolve();
      });
    });
}
