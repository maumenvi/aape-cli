# Aape CLI

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D26.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

> ⚠️ **Aviso:** esta documentação é focada apenas no CLI.

O Aape CLI gerencia catálogos locais de tools, skills e servidores MCP para uso com agentes.

Ele serve para:

- inicializar o catálogo do projeto
- instalar e remover recursos
- listar o que está disponível
- gerar/validar lock e contexto
- sincronizar MCPs locais

## O que o CLI faz

O comando `aape` trabalha sobre estes tipos de recurso:

- `tool`
- `skill`
- `mcp`

O fluxo comum é:

1. inicializar o projeto
2. adicionar sources
3. instalar recursos
4. gerar lock/contexto
5. validar e sincronizar

## Requisitos

- Node.js >= 26

O CLI não possui dependências de runtime. Rede, arquivos, hashing e processos usam apenas APIs nativas do Node.js.

## Catálogos externos

A busca não depende de uma base local:

- skills são pesquisadas no [skills.sh](https://skills.sh/) e resolvidas para um commit exato do GitHub ou um endpoint `well-known`
- servidores MCP são pesquisados no [MCP Registry oficial](https://registry.modelcontextprotocol.io/)
- `sources` registra os provedores e as dependências desejadas
- `source.lock` fixa commit, versão, pacote, transporte e integridade para reinstalações reproduzíveis

Os endpoints podem ser trocados no arquivo `sources` ou pelas variáveis `SKILLS_REGISTRY_URL` e `MCP_REGISTRY_URL`. `GITHUB_TOKEN` é opcional e aumenta o limite de consultas ao resolver skills do GitHub.

```json
{
  "registries": {
    "skills": { "provider": "skills.sh", "url": "https://skills.sh" },
    "mcp": { "provider": "mcp", "url": "https://registry.modelcontextprotocol.io" }
  }
}
```

## Instalação

```bash
npm install @maumenvi/aape
```

## Uso rápido

```bash
aape init
aape skills find react
aape skills add vercel-labs/agent-skills@vercel-react-best-practices
aape mcp find filesystem
aape mcp add filesystem
aape source add my-registry https://github.com/acme/aape-registry --ref main --trusted true
aape source ls
aape i skill repo_overview --version ^1.0.0 --source my-registry
aape lock
aape verify
aape ci # reinstala do source.lock e sincroniza o VS Code
```

## Catálogo de MCP/Skills/Tools

O CLI combina descoberta externa com estado local transparente:

- `sources`: manifesto editável com registries, sources e dependências
- `source.lock`: resolução fixa e verificável
- `.aape/context.dev.json`: contexto completo para desenvolvimento
- `.aape/context.llm.json`: contexto enxuto para LLM
- `.vscode/mcp.json`: sincronizado a partir do lock para MCP no formato nativo do VS Code (`servers`)

Ao instalar uma skill, o CLI também materializa `skills/<nome>/SKILL.md` no workspace.
Ao instalar um MCP, o CLI sincroniza automaticamente o `.vscode/mcp.json`.

### Instalação de recursos

```bash
aape skills find react
aape skills add vercel-labs/agent-skills@vercel-react-best-practices
aape mcp find filesystem
aape mcp add filesystem
aape i mcp filesystem # também pesquisa no registry quando não há flags manuais
aape i skill repo_overview
aape i skill repo_overview --llms "model-x,model-y"
aape i skill repo_overview --all-llms
aape i mcp github --command npx --args '["-y","@modelcontextprotocol/server-github"]'
aape i mcp github --llms "model-x"
aape i mcp github-npx --transport npx --package "@modelcontextprotocol/server-github"
aape i mcp remote-api --transport http --url "https://mcp.example.com"
aape i mcp remote-sse --transport sse --url "https://mcp.example.com/sse"
aape i mcp remote-ws --transport ws --url "wss://mcp.example.com/ws"
aape i tool read_file
aape i tool read_file --llms "model-x"
```

### Controle de acesso por LLM

- `--llms "id1,id2"` restringe o recurso para LLMs específicas
- `--all-llms` libera para todas as LLMs (`*`)
- no `LlmManager`, você pode configurar allowlist por categoria (`tools`, `skills`, `mcps`)
- no `sources`, use `config.llmAccessDefault` com `allow` (padrão) ou `deny` (deny-by-default global)

```ts
llm.add({
  id: 'model-x',
  provider: 'openai',
  model: 'gpt-4o-mini',
  access: {
    tools: ['*'],
    skills: ['repo_overview'],
    mcps: ['github'],
  },
});
```

Exemplo de política global no `sources`:

```json
{
  "config": {
    "registryStrategy": "hybrid",
    "strictVerify": true,
    "llmAccessDefault": "deny"
  }
}
```

## Comandos

### Bootstrap e catálogo

```bash
aape init
aape source add my-registry https://github.com/acme/aape-registry --ref main --trusted true
aape source ls
```

### Instalação estilo npm

```bash
aape i skill repo_overview --version ^1.0.0 --source my-registry
aape i tool read_file --llms "openrouter-main"
aape i mcp github --transport npx --package "@modelcontextprotocol/server-github" --all-llms
```

### Transportes MCP

```bash
aape i mcp local-fs --command npx --args '["-y","@modelcontextprotocol/server-filesystem"]'
aape i mcp remote-http --transport http --url "https://mcp.example.com"
aape i mcp remote-sse --transport sse --url "https://mcp.example.com/sse"
aape i mcp remote-ws --transport ws --url "wss://mcp.example.com/ws"
```

### Ciclo de lock/contexto/verificação

```bash
aape lock
aape verify
aape ci
aape context build
aape context show --for dev
aape context show --for llm
aape mcp sync
aape ls
aape ls mcp
```

### Remoção

```bash
aape rm skill repo_overview
aape rm tool read_file
aape rm mcp github
```

## Desenvolvimento

```bash
npm test
npm run typecheck
```

## Observações

O CLI é pensado para manter o catálogo consistente entre `sources`, `source.lock` e os arquivos de contexto gerados.

## Licença

Este projeto está licenciado sob a MIT License.
