# Documentação do Aape

Esta pasta reúne a documentação detalhada do framework Aape.

## Índice

- [Arquitetura](./architecture.md)
- [Guia de uso](./getting-started.md)
- [API e tipos](./api.md)

## Visão geral

O Aape combina:

- API HTTP minimalista
- roteamento de URLs e parâmetros
- execução em pipeline de nós
- estado compartilhado em `HttpState`
- hooks de ciclo de vida para observabilidade

## Pilares

1. HTTP
   - criação de servidor
   - request/response
   - parsing do body e query string
2. Router
   - definição de rotas
   - suporte a sub-routers
   - matching de parâmetros em caminhos
3. Pipeline
   - nós e arestas
   - execução sequencial ou condicional
   - hooks `onNodeStart`, `onNodeEnd`, `onNodeError`, `onComplete`
4. Validação
   - schemas leves
   - parsing e inferência de tipos

## Como navegar

- Comece pelo guia de uso para criar sua primeira API.
- Consulte a arquitetura para entender o fluxo completo.
- Use a referência de API para ver contratos e tipos públicos.
