---
phase: 39
slug: rewire-dos-triggers-aposentadoria-do-n8n-sec-03
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-26
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `39-RESEARCH.md` § Validation Architecture. This phase's core behavior is DB-trigger
> dispatch (not app code) — proven by SQL smoke against a disposable Postgres (mirror of P37's
> `p37_fidelidade_schema_smoke.sql`), plus an execute-time PROD checkpoint (human/orchestrator, not
> subagent-automatable).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | SQL smoke (`supabase/tests/*.sql`, asserções via `RAISE`/GUC) · `deno test` p/ EFs · Vitest/Playwright (N/A esta fase) |
| **Config file** | none — smokes `.sql` rodados via `psql`/SQL Editor contra Postgres descartável |
| **Quick run command** | `psql <disposable> -f supabase/tests/p39_rewire_triggers_smoke.sql` (Wave 0 — criar) |
| **Full suite command** | `npm run test:run` (Vitest — não cobre triggers) + os `.sql` smokes manuais |
| **Estimated runtime** | ~30s (smoke SQL num DB descartável) |

---

## Sampling Rate

- **After every task commit:** `psql -f supabase/tests/p39_rewire_triggers_smoke.sql` (< 30s)
- **After every plan wave:** smoke completo + `npm run test:run` (não-regressão)
- **Before execute/PROD apply:** smoke verde num Postgres descartável (o apply é GATED — checkpoint do orquestrador, pós-P38-smoke)
- **Max feedback latency:** ~30s (smoke) · execute-time PROD checkpoint é UAT humano

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| DISPATCH-01 | CASE dispara `avanco` SÓ em `etapa_para='avaliacao_assincrona'`; `decisao` SÓ em `aprovado`/`rejeitado` AND `auto_rejeitado=false`; else skip | smoke (SQL) | asserção contra `net._http_response` após INSERT em `historico_candidatura` | ❌ W0 | ⬜ pending |
| DISPATCH-02 | Confirmação suprimida p/ knockout (`status='rejeitado'`/`opcao_knockout_id`); enviada p/ survivor; convite carrega `agendamento_id` | smoke (SQL) | INSERT candidaturas (knockout vs survivor) + INSERT agendamento; checar body/skip | ❌ W0 | ⬜ pending |
| DISPATCH-03 | 0 triggers `trg_n8n_*` + 0 funções `trg_n8n_*` no catálogo; bloco n8n ausente do `submit-candidatura` | catalog + grep | `SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_n8n_%'`=0; `pg_proc`=0; `grep -c n8n submit-candidatura/index.ts`=0 | ❌ W0 | ⬜ pending |
| DISPATCH-04 | Body do `net.http_post` = só ids; header Bearer presente; nenhum nome/email/cpf/telefone | grep migration + smoke | asserção sobre o `jsonb_build_object` do body; inspeção `net._http_response` request | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/p39_rewire_triggers_smoke.sql` — cobre DISPATCH-01..04 (predicados, survivor-guard, graceful-skip/fail-open, PII-free, catálogo pós-DROP) contra Postgres descartável; mirror de `p37_fidelidade_schema_smoke.sql`.
- [ ] Fixtures: candidatura knockout (`status='rejeitado'` + `opcao_knockout_id`) vs survivor; linha de histórico p/ cada `etapa_para`; agendamento. Impersonação de RH real (GUC `request.jwt.claims`) p/ provar `auto_rejeitado=false` (decisão só humana).

*As 7 invariantes a provar (RESEARCH § "O que provar"): (1) exatamente 1 e-mail/evento sem duplicata; (2) zero superfície de double-send remanescente; (3) funil avança com EF/secret indisponível (graceful-skip + fail-open); (4) zero PII no payload; (5) survivor-guard do knockout; (6) mapeamento evento→fonte correto; (7) decisão só humana (`auto_rejeitado=false`).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Apply da migration em PROD + reconcile do ledger | DISPATCH-01..04 | Subagentes não têm Supabase MCP; apply toca PROD | Checkpoint do orquestrador: `apply_migration` → reconcile → inspeção `pg_trigger`/`pg_proc` |
| 1 ciclo end-to-end (trigger→EF→Resend) via `*@resend.dev` | DISPATCH-01/04 | Requer EF viva (P38) + secret (UAT-36-2); modo teste | Após P38 smoke: disparar cada evento real, checar `notificacoes_enviadas` + `net._http_response` |
| Cleanup do n8n cloud (desabilitar workflows / deletar `n8n_webhook_base`) | DISPATCH-03 | Ação humana no painel n8n externo | HUMAN checkpoint pós-apply (não bloqueia o rewire; encerra a superfície externa) |

---

## Validation Sign-Off

- [ ] All tasks have automated smoke verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`p39_rewire_triggers_smoke.sql`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (smoke)
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 smoke authored)

**Approval:** pending
