---
description: Quebra o plano em tarefas pequenas, ordenadas e testaveis.
argument-hint: <numero ou caminho da feature>
---

Gere tasks.md da feature indicada (numero ou caminho):

$ARGUMENTS

- Leia spec.md e plan.md da feature.
- Produza uma lista numerada de tarefas, cada uma:
  - pequena o suficiente para um unico commit;
  - com criterio claro de pronto (ex: "teste X passa");
  - declarando dependencias, quando houver;
  - comecando com "- [ ]" para marcarmos o progresso.
- Ordene por dependencia. Não implemente nada.
