---
id: 42-flagged-for-review-nao-protegido-da-purga
created: 2026-07-31
source: Phase 42 / code review bloqueante do 42-12 (INVENT-05), achado W1
priority: high
tags: [retencao, purga, lgpd, art20, cron, hitl, m8]
---

# `flagged_for_review` não está protegido da purga de retenção

**Achado no code review bloqueante do checkpoint da 42-12**, que autorizou o apply do
INVENT-05 (`PROCEED`) e separou este item de propósito: é **pré-existente e não foi
introduzido** pela correção — mas é a MESMA classe de defeito, no MESMO predicado,
derrotando a MESMA garantia do Art. 20.

## O fato

O predicado da purga `ai-logs-retention-cleanup` protege da exclusão os logs
referenciados por decisões cujo `status` esteja em:

```sql
status IN ('candidate_review_requested', 'human_reviewing')
```

O enum `candidate_status` (`20260609000001_prompt_library_schema.sql:70-81`) contém
também **`flagged_for_review`** — e a arquitetura de referência
(`docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md:582`) roteia para esse
estado justamente como *aguardando revisão humana*.

**Ele não está na lista de proteção.** Um log referenciado por uma decisão em
`flagged_for_review` é apagado pela purga assim que `retain_until` vence — e é
exatamente a evidência que uma revisão humana precisaria ler.

## Por que ainda não causou dano

Nenhum escritor `.ts` vivo grava `flagged_for_review` hoje, e
`candidate_ai_decisions` está vazia (0 linhas, medido em 2026-07-31 no checkpoint).
O defeito é **latente até o HITL aterrissar** — a mesma forma do INVENT-05, que também
só se armava quando a primeira decisão em revisão fosse gravada.

## Por que não foi corrigido junto

O 42-12 estava sob o portão de fase destrutiva, cujo escopo negativo declarado é "não
altera nada além do corpo do agendamento alvo". Ampliar a lista de estados protegidos
no mesmo apply seria uma mudança de POLÍTICA de retenção embarcada numa correção de
PREDICADO, entrando em produção sob uma mensagem de commit que diz outra coisa. O
review nomeou isso explicitamente: *"não deixe pegar carona no commit de 'predicado
corrigido'"*.

## Resolução

Decidir se `flagged_for_review` (e qualquer outro estado de espera-humana que venha a
existir) entra na lista de proteção, e entregar isso como mudança de política própria,
com o mesmo portão: raio de impacto medido, dry-run pela mesma query, review
bloqueante, asserções negativas.

**Quando:** antes de o HITL começar a gravar esse estado. Depois disso o defeito deixa
de ser latente e passa a apagar evidência de revisão em silêncio.

Relacionado: [[processo-origem-do-drift-desconhecida]] — a mesma fase, a mesma tese de
que promessa sem código que a execute não é garantia.
