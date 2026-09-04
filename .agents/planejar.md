---
description: Gera o plano tecnico (COMO) a partir de uma spec existente.
argument-hint: <numero ou caminho da spec>
---

Gere o PLANO TECNICO da feature indicada (numero ou caminho da spec):

$ARGUMENTS

- Leia a spec.md da feature e a specs/constituion.md.
- Crie plan.md na mesma pasta da spec, contendo:
  1. Arquitetura - camadas/arquivos criados ou alterados (http/cli -> service -> database).
  2. Modelo de dados - tipos e schemas zod.
  3. Contratos - rotas HTTP e/ou comandos de CLI, com entrada e saida.
  4. Decisoes e trade-offs.
  5. Estrategia de testes (node:test).
- Não implemente nada ainda. Aponte riscos e pontos que precisam de decisão humana.
