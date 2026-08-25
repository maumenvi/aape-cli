import type { AapeRequest } from '../types/request.ts';
import type { AapeResponse } from '../types/response.ts';
import type { HttpState } from '../types/http.state.ts';
import { Pipeline } from '../../pipeline/pipeline.ts';
import { START, END } from '../../pipeline/constants.ts';
import type { PipelineNode, RouteStep } from './types.ts';
import type { TrieRouteMatch } from './trie.types.ts';

function isPipeline(step: RouteStep): step is Pipeline<any> {
  return step instanceof Pipeline;
}

export async function dispatchRoute(
  req: AapeRequest,
  res: AapeResponse,
  matched: TrieRouteMatch | null,
  globalSteps: RouteStep[],
  onNotFound: PipelineNode,
  onError: (err: unknown, req: AapeRequest, res: AapeResponse) => Promise<void>,
): Promise<void> {
  if (!matched) {
    await onNotFound({ req, res });
    return;
  }

  req.params = matched.params;
  const stopWhen = (state: Readonly<HttpState>) => state.res.writableEnded;

  const allSteps = [...globalSteps, ...matched.route.steps];
  const pipeline = new Pipeline<HttpState>();

  allSteps.forEach((step, i) => {
    const name = `step_${i}`;
    const node = isPipeline(step)
      ? async (state: HttpState) => {
          if (state.res.writableEnded) return;
          return await step.run(state, { stopWhen }) as Partial<HttpState>;
        }
      : async (state: HttpState) => {
          if (state.res.writableEnded) return;
          return await (step as PipelineNode)(state) ?? undefined;
        };

    pipeline.addNode(name, node);
    pipeline.addEdge(i === 0 ? START : `step_${i - 1}`, name);
  });

  if (allSteps.length > 0) {
    pipeline.addEdge(`step_${allSteps.length - 1}`, END);
  } else {
    pipeline.addEdge(START, END);
  }

  try {
    await pipeline.run({ req, res }, { stopWhen });
  } catch (err) {
    await onError(err, req, res);
  }
}
