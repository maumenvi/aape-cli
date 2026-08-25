import type { HttpState } from '../types/http.state.ts';
import type { Pipeline } from '../../pipeline/pipeline.ts';

export type PipelineNode<S extends HttpState = HttpState> = (
  state: S,
) => Partial<S> | void | Promise<Partial<S> | void>;

export type RouteStep<S extends HttpState = HttpState> = PipelineNode<S> | Pipeline<S>;
