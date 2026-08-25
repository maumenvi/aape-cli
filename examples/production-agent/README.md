# Production Agent Example

This example exposes two HTTP routes that each trigger a graph pipeline:

- `POST /agent/task`
- `POST /agent/search`

Pipeline stages:

1. identify intent (LLM via OpenRouter)
2. guard prompt injection (LLM guard)
3. execute task/search (LLM)
4. guard sensitive output leakage (LLM guard)
5. sanitize output (non-LLM)
6. build final response

Debug endpoints:

- `GET /agent/debug`
- `GET /agent/debug/:requestId`

## Run

```bash
export OPENROUTER_API_KEY=...
node --experimental-strip-types examples/production-agent/index.ts
```

## Request examples

```bash
curl -X POST http://localhost:3100/agent/task \
  -H "content-type: application/json" \
  -d '{"userPrompt":"Crie um plano de rollout para feature flags"}'
```

```bash
curl -X POST http://localhost:3100/agent/search \
  -H "content-type: application/json" \
  -d '{"userPrompt":"Pesquise práticas de rollback em deploy contínuo"}'
```
