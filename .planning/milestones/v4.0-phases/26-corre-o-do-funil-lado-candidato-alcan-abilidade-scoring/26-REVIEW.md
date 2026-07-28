---
phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
reviewed: 2026-07-12T14:21:48Z
fix_run: "WR-01 (pontuar_sjt v_max=0 gabarito-less guard) FIXED — repo + PROD (execute_sql CREATE OR REPLACE) + verified live (gabarito-less battery → 22023). WR-02 (n8n dispatch exception-wrap, fail-open) FIXED — repo + PROD. Info items I-01/02/03 accepted (no action). 0 Critical."
depth: standard
files_reviewed: 22
files_reviewed_list:
  - supabase/migrations/20260712100001_funil01_pontuar_sjt_v2.sql
  - supabase/migrations/20260712100002_funil08_pontuar_cognitivo_gate.sql
  - supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql
  - supabase/migrations/20260712100004_n8n_novo_candidato.sql
  - supabase/tests/funil01_pontuar_sjt_smokes.sql
  - supabase/tests/funil08_pontuar_cognitivo_smokes.sql
  - supabase/tests/funil10_reinscricao_smoke.sql
  - supabase/tests/funil12_status_rpc_smoke.sql
  - supabase/tests/n8n_novo_candidato_smoke.sql
  - src/features/avaliacao/services/avaliacaoService.ts
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
  - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
  - src/features/avaliacao/components/RedacaoEditorScreen.tsx
  - src/components/pages/SuporteRHPage.tsx
  - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
  - src/features/cadastro/services/index.ts
  - src/__tests__/guards/n8n-bundle.grep.test.ts
  - src/__tests__/guards/wait-state-copy.grep.test.ts
  - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
  - src/features/avaliacao/__tests__/cognitivo-contract.test.ts
  - src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-07-12T14:21:48Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 26 hardens six candidate-side funnel defects (FUNIL-01/07/08/10/12 + UX-01) plus the routed-in n8n PII leak. The center of gravity — three `SECURITY DEFINER` PL/pgSQL functions (`pontuar_sjt` v2 rewrite, `pontuar_cognitivo` gate relax, new `get_avaliacao_status`), one PROD-only index drop, one `AFTER INSERT` trigger — is well-executed and adversarial-grade. I verified the load-bearing invariants directly rather than trusting the passing smokes:

- **No score-manipulation-up path** in `pontuar_sjt` v2. Dedup, full-battery denominator, battery-membership, completeness, empty-battery, and the hard re-submit lock are all server-authoritative; every guard is ordered correctly (empty-battery RAISE at :130 precedes membership :141 and completeness :152). No opcao cross-pergunta trick survives the `pos.pergunta_id = m.pergunta_id AND pos.opcao_id = m.opcao_id` join.
- **RNF-07a preserved** across all three RPCs + the trigger — none writes `candidaturas`; the SJT smoke (6) proves `status`/`etapa_atual` byte-identical after scoring.
- **No verdict/PII leak.** `get_avaliacao_status` returns presence-booleans only (the smoke walks every leaf); `avaliacaoService` uses explicit allowlists everywhere (zero `select('*')`); the digit-free error mapping in `pontuarSjt` never surfaces the server's `bateria incompleta (% de %)` counts.
- **`pontuar_cognitivo` drift-free** — a byte-diff against `20260625000001` confirms the ONLY functional change is `+'avaliacao_assincrona'` in the etapa `IN`; CR-01 (empty-bank guard) and CR-02 (`cognitivo_respostas` persistence) are intact, interview stages preserved.
- **FUNIL-12 card mapping fully consistent** with the actual write-paths: `sjt_caso_aberto.registrado` keys on `scores_candidato(tipo='sjt',subtipo='caso_aberto')` — verified that `avaliar-redacao/index.ts:280-281,296-297,321-322` writes exactly that; every `iniciado` boolean matches the real autosave `teste` keys (`redacao`, `sjt_caso_aberto`, `big_five`; SJT MC / cognitivo correctly have no `iniciado`).
- **n8n subtree cleanly removed** — `n8nService.ts` + its test are deleted, the barrel re-export dropped, and a repo grep finds zero dangling callers or `hstgr`/`notifyCandidatoCriado`/`N8N_WORKFLOWS` references.
- **Gates green:** tsc `--noEmit` = 104 errors (baseline 107 — no regression; the `SuporteRHPage` tsc errors are pre-existing and unrelated to the copy edit); the 5 phase-26 Vitest files pass 32/32; both grep guards keep their no-false-positive sub-tests.

No BLOCKER-class defects found. Two WARNING-class robustness/scoring-integrity edges and three low-severity Info items follow. None blocks ship, but WR-01 and WR-02 are worth a fix or an explicit accept.

## Warnings

### WR-01: `pontuar_sjt` scores a mis-configured battery (options-less MC items) as 0/0 → `sucesso` instead of failing loudly

**File:** `supabase/migrations/20260712100001_funil01_pontuar_sjt_v2.sql:200-204` (with :130-132)
**Issue:** The empty-battery guard (C2) only fires when `v_expected = 0` (no MC items resolved). It does NOT cover the case where the battery has MC items (`v_expected ≥ 1`) but those `perguntas` have **no rows in `perguntas_opcao_sjt`** (no gabarito configured). In that path `maxes` is empty → `v_max = 0`, so the status CASE `v_has_atencao OR (v_max > 0 AND …)` short-circuits both branches to `ELSE 'sucesso'`. A crafted submit that supplies garbage `opcao_id`s for every battery `pergunta_id` passes dedup + membership + completeness (the `scored` join simply yields no rows), then records a `score 0 / score_max 0` row with status `sucesso` — the exact "silent 0/0 sucesso" the C2 guard was written to prevent, just one config-state removed. This is inconsistent with the phase's own "fail loudly on an unconfigured battery" philosophy.
**Reachability:** Low in practice — production SJT batteries are always seeded with weighted options, so `v_max > 0`; and the candidate UI can't render options for an option-less question, so exploitation requires a hand-crafted RPC call against a genuinely mis-configured vaga. RNF-07a still holds (no `candidaturas` write) and RH sees the 0/0 row. But it is a real scoring-integrity gap the behavioral smoke does not cover (the fixture always seeds peso-4 options).
**Fix:** Extend the loud-fail to the option-less case — either raise when the denominator is empty, or fold it into the C2 guard:
```sql
-- after the (H) aggregation, before the status CASE:
IF v_max = 0 THEN
  RAISE EXCEPTION 'bateria SJT nao configurada' USING errcode = '22023';
END IF;
```
(and add a smoke: a battery `pergunta` with zero `perguntas_opcao_sjt` rows must RAISE, never score `sucesso`).

### WR-02: n8n `AFTER INSERT ON candidatos` trigger is not failure-isolated — a `net.http_post` raise would abort candidate signup

**File:** `supabase/migrations/20260712100004_n8n_novo_candidato.sql:56-66`
**Issue:** The dispatch fires inside an `AFTER INSERT` trigger with no exception handling around `net.http_post`. If that call ever raises (e.g., `pg_net` unavailable, a malformed `n8n_webhook_base` producing a bad URL), the exception propagates and **aborts the `candidatos` INSERT** — i.e., a webhook hiccup breaks the entire candidate registration. This surface is higher-stakes than the SEC-03 precedent it mirrors (SEC-03 triggers fire on candidatura/status events, not on the signup transaction). It is currently dormant only because the Vault secret is NULL (graceful-skip); the risk activates the moment Fernando sets `n8n_webhook_base`.
**Reachability:** Low — `net.http_post` is non-blocking (queues the request) and rarely raises, and the graceful-skip covers the NULL-secret window. But signup is exactly the transaction that must never be coupled to a best-effort side-channel.
**Fix:** Isolate the dispatch so it can never fail the INSERT:
```sql
IF v_base IS NULL THEN RETURN NEW; END IF;
BEGIN
  PERFORM net.http_post( url := v_base || '/novo-candidato', headers := …, body := … );
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- best-effort notification must never abort the signup transaction
END;
RETURN NEW;
```

## Info

### IN-01: Re-submit lock is defeated under concurrency, but the outcome stays correct

**File:** `supabase/migrations/20260712100001_funil01_pontuar_sjt_v2.sql:99-106, 219-223`
**Issue:** Two simultaneous `pontuar_sjt` calls can both pass the `EXISTS(… status <> 'falhou')` lock (B) before either commits. One INSERTs the MC row; the other conflicts and evaluates `ON CONFLICT DO UPDATE … WHERE scores_candidato.status = 'falhou'`, which is false against the just-committed `sucesso`/`pendente_humano` row → 0 rows affected — yet the function still `RETURN`s `{ok, registrado:true}`. So the second concurrent submit gets a **silent success instead of the 42501** the smoke (5) asserts under serial execution.
**Impact:** Benign — the anti-A41 property (exactly one row, no overwrite of a recorded score) is preserved by the `WHERE status='falhou'` predicate; only the error signal differs, and only under a same-candidate double-submit race. No fix required; documented so a future reviewer doesn't mistake the serial smoke for a concurrency proof.

### IN-02: `pontuarSjt` fallback error path interpolates the raw server message

**File:** `src/features/avaliacao/services/avaliacaoService.ts:403-407`
**Issue:** The 42501 and 22023 branches are correctly digit-free/neutral, but the final fallback throws `` `Não foi possível registrar suas respostas: ${error.message}` `` with the raw message. `pontuar_sjt` v2 only ever raises 42501 or 22023, so today the fallback fires only for infra errors (whose messages carry no score), and no leak occurs.
**Fix (defensive):** If any future `pontuar_sjt` RAISE adopts a different SQLSTATE that embeds counts, this path would surface them. Consider dropping the `${error.message}` interpolation from the candidate-facing fallback and logging the raw message instead.

### IN-03: Battery resolution uses `LIMIT 1` with no ordering when multiple SJT elements exist

**File:** `supabase/migrations/20260712100001_funil01_pontuar_sjt_v2.sql:111-116` (and the mirror at :157-166)
**Issue:** `… WHERE v.id = v_vaga AND elem->>'tipo' = 'sjt' LIMIT 1` picks an arbitrary element if `testes_aplicaveis` ever carries more than one `tipo='sjt'` entry (no `ORDER BY`). A single SJT element per vaga is the current invariant, so this is a latent config-edge only.
**Fix:** None needed now; if multi-SJT batteries become possible, add a deterministic tiebreaker (e.g., `ORDER BY elem->>'cargo'`) or reject a vaga with >1 SJT element at `publish_vaga`.

---

_Reviewed: 2026-07-12T14:21:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
