# Plan 26-07 SUMMARY — [BLOCKING·PROD] Apply migrations + FUNIL-10 drop + live smokes

**Plan:** 26-07 (Wave 4, autonomous:false)
**Status:** COMPLETE — all Phase-26 DB surfaces LIVE on PROD (project `isljnozzlvckrgjjbjwp`) and behaviorally proven.
**Executed by:** orchestrator (Supabase MCP `apply_migration` / `execute_sql`) under explicit user PROD-write authorization.

---

## Task 1 — 4 migrations applied to PROD via MCP `apply_migration`

Applied in dependency order (each returned `{success:true}`; `apply_migration` writes the version row itself and bypasses 42601 — **no `db push`**, no BEGIN/COMMIT wrapper):

| Version | Object | Requirement |
|---------|--------|-------------|
| `20260712100001_funil01_pontuar_sjt_v2` | `pontuar_sjt(uuid,jsonb)` rewrite | FUNIL-01 + FUNIL-07 server teeth |
| `20260712100002_funil08_pontuar_cognitivo_gate` | `pontuar_cognitivo(uuid,jsonb,text,int,jsonb)` etapa-gate | FUNIL-08 |
| `20260712100003_funil12_get_avaliacao_status` | `get_avaliacao_status(uuid)` neutral RPC | FUNIL-12 |
| `20260712100004_n8n_novo_candidato` | `trg_n8n_novo_candidato()` + AFTER INSERT trigger on `candidatos` | n8n 2nd-leak |

**Live object verification (`to_regprocedure` / `pg_get_functiondef` / `pg_trigger`):**
- `pontuar_sjt(uuid,jsonb)` ✓ · `pontuar_cognitivo(uuid,jsonb,text,int,jsonb)` ✓ · `get_avaliacao_status(uuid)` ✓ · trigger `trg_n8n_novo_candidato` on `public.candidatos` ✓
- `pontuar_cognitivo` etapa gate **includes `avaliacao_assincrona`** (async added) **AND keeps `entrevista_online`** (interview stages preserved — no regression) ✓

Version-row/ledger: `apply_migration` recorded all four; filename-vs-version drift is the known cosmetic gap consistent with 24-08/25-07 → full reconstruction is Phase 27 (DBMIG-01). `database.types.ts` regen deferred to Phase 27 (client uses a confined cast in 26-05).

---

## Task 2 — FUNIL-10: discover + drop the legacy unfiltered unique index

**Discovery (read-only `pg_index`/`pg_constraint`) — the audit's A27 confirmed exactly:**
- **OFFENDER (dropped):** `unique_candidato_vaga` — a UNIQUE **constraint** `UNIQUE (candidato_id, vaga_id)` with **no** `deleted_at` filter (legacy M1, un-versioned; not in any migration file).
- **KEEPER (retained):** `candidaturas_candidato_vaga_unique_idx` — `CREATE UNIQUE INDEX ... (candidato_id, vaga_id) WHERE (deleted_at IS NULL)` (from `20260425000004`).

**Action:** `ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS unique_candidato_vaga;` (execution-time PROD reconciliation via MCP `execute_sql`). Post-drop verification: **exactly ONE** unique index on `(candidato_id, vaga_id)` remains and it carries `WHERE (deleted_at IS NULL)`. FUNIL-10 was a **real fix** (not a no-op).

**Artifact authored:** `supabase/tests/funil10_reinscricao_smoke.sql` — insert→soft-delete→re-insert asserts no 23505 + only the partial keeper remains. **Ran live on PROD → PASS.**

---

## Task 3 — behavioral acceptance gate (impersonated candidate JWT) — ALL PASS on PROD

The load-bearing gate (structural greps are insufficient — Phase 24/25 lesson). Run over a disposable fixture built around a real `candidato.user_id`, impersonated via `set_config('request.jwt.claims',…)`; `auth.uid()` reads the GUC under SECURITY DEFINER. ROLLBACK-free, **zero residue** confirmed post-run.

| # | Assertion | Result |
|---|-----------|--------|
| 1 | FUNIL-01 duplicate `{pergunta}` → `22023 resposta duplicada` | PASS |
| 2 | FUNIL-07 foreign (out-of-battery) pergunta → `42501 pergunta fora da bateria` (server teeth) | PASS |
| 3 | FUNIL-01 subset submit → `22023 bateria incompleta` | PASS |
| 4 | FUNIL-01 complete submit accepted; `score_max = 8 = Σ MAX(peso)` over the **full** battery (denominator fix) | PASS |
| 5 | FUNIL-01 re-submit lock → `42501 avaliacao ja registrada`; **exactly 1** MC row (no A41 overwrite) | PASS |
| 6 | FUNIL-01 empty/unconfigured battery → `22023 bateria SJT nao configurada` (Open Q2) | PASS |
| 7 | RNF-07a — `candidaturas.status`/`etapa_atual` byte-identical after scoring | PASS |
| 8 | FUNIL-08 cognitivo gate **accepts** `avaliacao_assincrona` (not 42501) | PASS |
| 8b | FUNIL-08 cognitivo gate still **rejects** a non-eligible etapa (`triagem`) → 42501 | PASS |
| 9 | FUNIL-12 `get_avaliacao_status` returns presence booleans; **no `score`/`status`/`score_max`** key leaks (RNF-07a) | PASS |
| 10 | FUNIL-12 IDOR — foreign caller → `42501` | PASS |
| 11 | FUNIL-10 insert→soft-delete→re-insert same (candidato,vaga) → **no 23505** | PASS |

**n8n (server-side dispatch):** trigger `trg_n8n_novo_candidato` is live; Vault secret `n8n_webhook_base` is **NULL** → the trigger graceful-skips (`RETURN NEW`) on candidato INSERT — the expected/deferred behavior (secret creation is Fernando's human-action). Body carries `candidato_id` only (no PII); RNF-07a preserved (never writes candidatos).

**Residue check:** `smoke_vaga_residue=0`, `smoke_pergunta_residue=0`, `smoke_cand_residue=0`. Clean.

---

## Requirements now LIVE + proven

FUNIL-01, FUNIL-07, FUNIL-08, FUNIL-10, FUNIL-12 → **Done** (behaviorally proven on PROD). UX-01 shipped in 26-04. n8n 2nd-leak → server-side dispatch live (dormant until the Vault secret is set).

## Deferred / human-action
- **Vault secret `n8n_webhook_base`** — Fernando's human-action; n8n dispatch stays dormant (graceful-skip) until set.
- **`database.types.ts` regen + ledger/baseline reconstruction (DBMIG-01)** — Phase 27.

## Self-Check: PASSED
