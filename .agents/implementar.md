---
description: Implementa as tarefas pendentes de tasks.md uma a uma, com testes.
argument-hint: <numero ou caminho da feature>
---

Implemente as tarefas de tasks.md da feature indicada:

$ARGUMENTS

Uma tarefa por vez:

1. Escolha a proxima "- [ ]" cujas dependencias ja estao prontas.
2. Implemente seguindo plan.md, o CLAUDE.md e a specs/constituion.md.
3. Escreva/atualize testes e rode `npm run test` e `npm run typecheck`.
4. So marque "- [x]" quando estiver verde.
5. Pare ao concluir uma fatia coesa e peca revisão.

Nunca desative testes/tipos para "passar". Se a spec estiver errada, pare e avise.
