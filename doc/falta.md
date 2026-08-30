# Pendências e itens em aberto

## Concluídos nesta rodada
- `maia ci` valida integridade (metadados e hash de artefato) antes de
  materializar qualquer arquivo.
- Conexão MCP não cria mais `.maia/mcp.env` automaticamente; a criação do template
  é exclusiva do `maia init`.
- Validação estrutural defensiva de mensagens JSON-RPC aplicada ao
  decodificador de framing e a todos os transportes (stdio, http, sse, ws).
- Refatoração para um símbolo por arquivo, agrupado em pastas com escopo
  definido, com comentários JSDoc nas funções, classes e métodos.
- Cobertura e verificação arquitetural integradas aos scripts e ao CI.
- Política explícita de confiança publicada em `SECURITY.md`.

## Registro nativo por agente (follow-ups)
- `maia rm <kind> <name>` e `maia mcp sync` chamam `store.syncVsCodeMcp()`, que reescreve
  `.vscode/mcp.json` apenas com os MCPs do lock e remove a entrada proxy `maia`. Deveriam chamar
  `restoreConfiguredAgents(store)` depois, como fazem `install` e `ci`.
- Confirmar o formato de config MCP real do Cursor e do Cline (`mcpServers` vs `servers`). Hoje
  ambos usam `configFormat: 'servers'`, herdado do comportamento anterior.
- Skills multi-arquivo: a cópia nativa (e a materialização em `.maia`) só copia o `SKILL.md`.

## Segurança e hardening
- Remover ou ocultar a entrada visível de credenciais em fluxos de
  onboarding/instalação de MCPs.

## Ajustes de instalação e uso do CLI
- Validar o comportamento do binário empacotado em outros sistemas operacionais
  e shells, além do smoke test Linux executado pelo CI.

## Observações
- Os itens acima devem ser tratados antes de considerar o projeto pronto para
  distribuição production-grade.
