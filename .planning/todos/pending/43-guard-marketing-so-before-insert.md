---
id: 43-guard-marketing-so-before-insert
created: 2026-08-02
source: Phase 43 code review (WR-04), confirmado por leitura do trigger vivo
priority: medium
resolves_phase: 46
tags: [lgpd, marketing, guard, trigger, consent-04, cron, m8-consent]
---

# O guard de marketing e `BEFORE INSERT`, e a migration afirma mais do que ele cobre

**Achado:** code review da Phase 43, finding WR-04.

## A afirmacao e o que ela cobre

`20260801000003_p43_guard_marketing.sql` argumenta — corretamente — que um trigger
no ledger e melhor que um `if` na Edge Function, porque *"o ledger e o PONTO DE
ESTRANGULAMENTO (…) um controle no ledger alcanca todo caminho presente e futuro"*.

O trigger vivo e:

```sql
CREATE TRIGGER trg_guard_marketing_consentimento
  BEFORE INSERT ON public.notificacoes_enviadas
  FOR EACH ROW EXECUTE FUNCTION public.guard_marketing_consentimento();
```

**`BEFORE INSERT`. So.** Um `UPDATE` que trocasse `evento` numa linha ja existente
com `status='pendente'` NAO passa pelo guard — e `varrer_retry_notificacoes` (cron,
a cada 15 min) despacharia essa linha para a Edge Function.

O CHECK de `evento` continuaria valendo (o vocabulario e fechado), entao o valor
teria de ser `divulgacao_vagas`, que e justamente a classe marketing. O guard nao
opinaria.

## Por que NAO e incidente hoje

Nenhum caminho de codigo faz esse `UPDATE`. `grep -rn "from('notificacoes_enviadas')"`
mostra o claim (INSERT) e as transicoes de `status`, nunca de `evento`. A superficie
existe para `service_role` e para quem tiver privilegio direto no banco.

E a exposicao real e estreita: nao existe caminho de envio de marketing neste sistema
(`notificacoes_enviadas.candidatura_id` e NOT NULL, entao a infraestrutura e
candidatura-escopada por construcao). Um aviso de vaga nova nao tem candidatura.

## O que fazer

Estender o trigger, o que e ADITIVO e reversivel:

```sql
DROP TRIGGER IF EXISTS trg_guard_marketing_consentimento ON public.notificacoes_enviadas;
CREATE TRIGGER trg_guard_marketing_consentimento
  BEFORE INSERT OR UPDATE OF evento, candidato_id ON public.notificacoes_enviadas
  FOR EACH ROW EXECUTE FUNCTION public.guard_marketing_consentimento();
```

`candidato_id` entra na lista pela mesma razao que `evento`: reapontar a linha para
outro titular contornaria a checagem de consentimento tao bem quanto trocar o evento.

⚠ **Medir o custo antes.** `notificacoes_enviadas` recebe `UPDATE` de `status` em
todo ciclo de retry e em todo webhook do Resend. Restringir por `UPDATE OF evento,
candidato_id` mantem o trigger fora do caminho quente — mas isso precisa ser
CONFIRMADO por medicao, nao presumido, porque `UPDATE OF` dispara quando a coluna
aparece no `SET` ainda que o valor nao mude.

**A Phase 46 e o lugar natural** — ela ja vai mexer no cron e ja tem portao de fase
destrutiva.

## Tambem: corrigir a copy da migration

A frase *"alcanca todo caminho presente e futuro"* deve ser estreitada para o que o
trigger de fato faz, no mesmo commit que o estender. Uma migration que afirma mais
do que executa e o defeito que este milestone inteiro existe para eliminar — uma
promessa sem codigo que a cumpra, so que dentro do banco.
