# AGENT.md

## Visão geral

Este repositório contém o framework Aape, uma biblioteca HTTP em Node.js + TypeScript nativa, sem dependências externas, com um motor de pipeline inspirado em LangGraph.

Objetivo principal:
- servir requisições HTTP com roteamento e middleware
- oferecer um pipeline de execução baseado em grafos de nós
- manter a base simples, performática e zero-dependency
- facilitar extensões futuras como checkpointing, plugins, streaming e nós paralelos

## Stack e runtime

- Node.js >= 26
- TypeScript nativo (`.ts` executado diretamente em runtime experimental)
- ESM (`"type": "module"`)
- Sem bibliotecas externas

## Comandos principais

```bash
# rodar a aplicação principal (se houver ponto de entrada direto)
node src/index.ts

# executar o exemplo de demonstração
node examples/basic.ts
```

Se for necessário rodar scripts mais específicos, preferir chamadas diretas com `node` e `--experimental-strip-types` quando o ambiente exigir.

## Estrutura do projeto

```text
src/
  core/
    types.ts
  http/
    app.ts
    from-connect.ts
    context/
    router/
      index.ts
      route-matcher.ts
      route-dispatch.ts
      trie.types.ts
      types.ts
    types/
  pipeline/
    pipeline.ts
    index.ts
  index.ts
examples/
  basic.ts
package.json
tsconfig.json
```

## Arquitetura

### HTTP
- `src/http/app.ts`: criação do servidor HTTP principal
- `src/http/router/index.ts`: API pública do roteador
- `src/http/router/route-matcher.ts`: implementação da trie e matching de caminhos
- `src/http/router/route-dispatch.ts`: execução do pipeline para a rota encontrada
- `src/http/router/trie.types.ts`: tipos internos da trie
- `src/http/router/types.ts`: tipos públicos do pipeline/rota
- `src/http/context/`: envoltório do request/response e parsing de body
- `src/http/types/`: tipos de request, response, handlers e estado

### Pipeline
- `src/pipeline/pipeline.ts`: motor de execução em grafo
- `src/pipeline/index.ts`: exports públicos
- Suporte a:
  - nós (`addNode`)
  - arestas fixas (`addEdge`)
  - arestas condicionais (`addConditionalEdge`)
  - hooks lifecycle (`withHooks`)
  - estado compartilhado entre nós

## Convenções de desenvolvimento

### 1. Manter zero dependências
Antes de adicionar qualquer pacote, confirmar se a funcionalidade pode ser implementada nativamente com Node.js/TypeScript.

### 2. Preferir tipos explícitos
O projeto usa interfaces e tipos bem definidos. Evitar `any` quando existir alternativa.

### 3. Mantenha o estilo minimalista
- código simples e legível
- sem overengineering
- sem abstrações desnecessárias
- priorizar clareza sobre framework excessivo

### 4. Preserve a API pública
As exportações em `src/index.ts` devem continuar estáveis e compatíveis com o uso do framework.

### 5. Validação antes de concluir
Sempre testar o comportamento relevante com execução direta via Node.

## Regras para o agente

- Nunca adicionar dependências sem necessidade explícita.
- Não reescrever a arquitetura para frameworks externos.
- Não remover ou quebrar a compatibilidade dos tipos públicos.
- Quando modificar o pipeline, manter compatibilidade com o modelo atual de execução por grafos.
- Quando adicionar novos recursos, seguir a lógica já existente e documentar no código ou no README se relevante.
- Priorizar correções pequenas e focadas.

## Evolução planejada

A base já está funcional para os primeiros objetivos. Próximas etapas esperadas:
1. checkpointing do pipeline
2. plugin system
3. streaming support
4. parallel nodes (fan-out/fan-in)

Essas etapas devem ser implementadas sem comprometer a simplicidade do núcleo.

## Observações finais

Este projeto funciona como um framework leve, educacional e extensível. O objetivo é manter uma base enxuta, com arquitetura clara e comportamento previsível.

Ao colaborar neste repositório, priorize:
- correção
- clareza
- compatibilidade
- simplicidade
- manutenção de zero dependências
- clean coude
- arquivos pequenos e com escopo definido
- pasta com escopo bem definido e pequenas, evitar poluição
