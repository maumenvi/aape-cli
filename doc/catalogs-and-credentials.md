# Catalogos e Credenciais (CLI)

## Skills

O CLI pode buscar skills via:

- `provider: "skills.sh"` (`https://skills.sh`)
- `provider: "github-skills"` (`https://api.github.com`)

Comportamento de resiliencia:

- usa identificador canonico para instalar skill;
- se uma entrada estiver stale/indisponivel, tenta a proxima automaticamente em `aape skills add <query>`;
- em `aape skills find`, permite selecionar outra opcao quando a escolhida falha na origem.

## MCP

MCP e buscado no registry configurado (`provider: "mcp"`), por padrao:

- `https://registry.modelcontextprotocol.io`

## Credenciais MCP

No `aape mcp find`:

- mostra `Requer chave/token: ...`
- mostra `Onde obter: ...` quando o metadata do registry traz descricao/URL

No `aape mcp add` (ou instalacao via selecao no find):

- detecta variaveis necessarias;
- pede os valores em terminal interativo;
- cria/atualiza `.env` no diretorio do projeto.
