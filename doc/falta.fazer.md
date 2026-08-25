- Usar MCPs e tools
- Usar skills

## Melhorias futuras (pós-release)

### Telemetria não-blocking
Atualmente, `emitEvent()` é awaited no caminho crítico. Se o `onEvent` customizado for lento (disk I/O, HTTP, etc), bloqueia o pipeline inteiro. Solução: implementar modo non-blocking com `Promise.resolve().then()` ou worker thread, com política configurável (`'block' | 'fire-and-forget' | 'worker'`). Deve ser backward-compatible e opcionalmente permitir acesso a erros via callback separado.

Meu parecer: o núcleo do Aape está amadurecendo muito bem e já possui identidade própria. A arquitetura de eventos e o DevTools são a direção certa, mas o DevTools ainda está em estágio inicial e precisa dos ajustes acima antes de ser publicado como pacote confiável. Ajustes #1, #2 e #3 já foram implementados.