---
phase: 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
plan: 03
wave: 1
status: complete
autonomous: true
completed: 2026-07-26
files_modified:
  - supabase/tests/p39_rewire_triggers_smoke.sql
requirements: [DISPATCH-01, DISPATCH-02, DISPATCH-03, DISPATCH-04]
prod_touched: false
---

# 39-03 — Wave-0 smoke do rewire de triggers

## O que foi feito

Escrito `supabase/tests/p39_rewire_triggers_smoke.sql` (351 linhas), **FILE-ONLY** — a EXECUÇÃO é o
gate do orquestrador no 39-04 (RED até a migration aplicar). Mirror de `p37_lacunas_rls_idempotencia_smokes.sql`
(GUC `smoke39.pass` auto-exigido) + `n8n_novo_candidato_smoke.sql` (fixture descartável RLS-bypass +
secret-precondition SKIP).

**Metade ESTRUTURAL + CATÁLOGO (a–f) — 6 asserções, SEM INSERT, seguras em PROD vivo:**
- (a) DISPATCH-01: `trg_notif_transicao` ramifica `avaliacao_assincrona` (avanço) + `aprovado`/`rejeitado`
  com `auto_rejeitado = false` (decisão só-humana).
- (b) DISPATCH-02: `trg_notif_confirmacao` tem o survivor-guard (`opcao_knockout_id IS NOT NULL`).
- (c) D-04: `trg_notif_convite` carrega `agendamento_id` no body.
- (d) DISPATCH-04: os 3 corpos são ids-only (0 substring PII — nome/email/cpf/telefone).
- (e) hardening: os 3 são `SECURITY DEFINER` + `search_path` vazio + `Bearer' || v_invoke_key` + `EXCEPTION WHEN OTHERS`.
- (f) DISPATCH-03: catálogo — 0 `trg_n8n_*` (trigger+função) e exatamente 3 `trg_notif_*`.

**Metade COMPORTAMENTAL (g,h,i) — fixture descartável (namespace `39010039-*`), secret-precondition SKIP:**
- (g) graceful-skip/fail-open: candidatura survivor INSERT commita com o Vault ausente.
- (h) survivor-guard: candidatura knockout (`status=rejeitado`) INSERT commita.
- (i) historico (avaliacao_assincrona) + agendamento INSERT commitam.
- CLEANUP ROLLBACK-free (só o namespace descartável).

## Decisão de design importante — contagem adaptativa ao ambiente

Em **PROD** o Vault está SETADO (project_url + edge_invoke_key), então a metade comportamental faz
**SKIP-com-NOTICE** para NÃO disparar e-mail real por fixture. O GUC `smoke39.behavioral` registra o
caminho e o **RESUMO (z)** espera `6 + (behavioral='y' ? 3 : 0)`: em PROD = 6 estruturais; num Postgres
descartável (Vault ausente) = 9. Gate honesto nos dois ambientes.

## Correção aplicada durante a escrita

`pg_get_functiondef` renderiza `SET search_path = ''` como **`SET search_path TO ''`** (confirmado ao
vivo em PG17 contra `trg_candidatura_analise`). A asserção (e) foi corrigida para aceitar ambas as formas
via `chr(39)` (evita bug de escape de aspas). Validado ao vivo: as expressões `strpos` de (e)
(search_path/Bearer/SECURITY DEFINER) casam contra o esqueleto compartilhado.

## Verificação (grep — a execução é 39-04)

- T1 OK: `smoke39.pass`, `pg_get_functiondef`, `trg_notif_transicao`, `trg_n8n_%`, `auto_rejeitado = false`,
  `opcao_knockout_id IS NOT NULL`, `agendamento_id` presentes.
- T2 OK: namespace `39010039-*`, `graceful`, `RESET ROLE`, `vault.decrypted_secrets`, knockout, cleanup.
- 0 INSERT na metade estrutural (segura em PROD); 11 blocos `DO $$`/`END $$;` balanceados; 351 linhas.

## Delegado ao 39-04 Task 3 (exige EF viva + secret)

A prova ponta-a-ponta do dispatch REAL por evento em `net._http_response` e a decisão-só-humana via
impersonação de RH. Aqui a decisão-só-humana é coberta estruturalmente por (a).
