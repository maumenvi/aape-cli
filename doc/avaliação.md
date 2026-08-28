# Avaliação técnica atualizada

## Situação geral

As recomendações da avaliação anterior foram incorporadas:

- `maia ci` valida metadados e hashes dos artefatos existentes antes da materialização, aceita arquivos ainda ausentes nessa etapa e executa verificação estrita depois da restauração;
- conexões MCP não criam `.maia/mcp.env`; a escrita ocorre apenas em fluxos explícitos de `init`, instalação ou restauração;
- mensagens JSON-RPC recebidas são validadas estruturalmente, incluindo versão, identificador, método, parâmetros e envelopes de resposta;
- cobertura passou a fazer parte dos scripts do projeto e do CI;
- a política de confiança para fontes remotas e pacotes executáveis está documentada em `SECURITY.md`;
- o código de produção segue a regra de um símbolo por arquivo, com pastas de escopo e JSDoc verificados automaticamente.

## Controles automatizados

```bash
npm run typecheck
npm run check:architecture
npm test
npm run test:coverage
npm audit --omit=dev
npm pack --dry-run
```

## Risco residual

O campo `trusted` expressa uma decisão de procedência, não uma garantia de segurança. MCPs stdio/NPX continuam executando com as permissões do usuário atual; por isso, revisão de código, versões fixadas, credenciais mínimas e isolamento do runner permanecem obrigatórios para ambientes sensíveis.
