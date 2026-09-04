---
description: Cria a especificacao (o QUE e por que) de uma feature, sem codigo.
argument-hint: <descricao da feature>
---

Escreva uma ESPECIFICACAO para a feature descrita a seguir:

$ARGUMENTS

Regras:

- Leia specs/constituion.md e respeite todos os principios.
- NÃO escreva codigo nem decisões de implementacao.
- Crie specs/<NNN>-<slug>.spec.md (proximo numero livre) com as secoes numeradas nesta ordem:
  1. Contexto/problema.
  2. User Stories ("Como <papel>, quero <objetivo>, para <beneficio>").
  3. Requisitos funcionais numerados (RF-1, RF-2, ...).
  4. Criterios de aceite em EARS ("quando <evento>, o sistema deve <resposta>").
  5. Fora de escopo.
  6. Questoes em aberto.
- Se algo estiver ambiguo PERGUNTE antes de finalizar.
