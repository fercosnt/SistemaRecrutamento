---
phase: 11
slug: avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-06-09
---

# Phase 11 — Validation Strategy

> Detailed Validation Architecture in `11-RESEARCH.md` (## Validation Architecture).
> Wave-0 RED scaffolds + this SQL-smoke runbook landed in Plan **11-01** (smoke-runtime gate).

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | vitest 4.x (frontend) + `deno test` (avaliar-redacao EF, mocked SDK) + SQL smokes (tables/RLS/etapa-gate/pontuar_sjt RPC) |
| Quick run | `npm run test:run` |
| Full suite | `npm run test:run && npm run lint && npm run build` |
| Deno EF test | `deno test --allow-read --allow-env supabase/functions/avaliar-redacao/` |
| SQL smokes | run via Supabase MCP `execute_sql` against a disposable fixture (set_config jwt.claims), ROLLBACK-free cleanup (Phase-8 precedent) |
| Estimated runtime | ~60-90s vitest |

## Sampling Rate
- After every task commit: `npm run test:run` (scoped) + relevant `deno test`
- After every wave: full suite + SQL smokes
- Max feedback latency: 90s

## Per-Task Verification Map

| Wave | Plan | Requirement | Secure Behavior | Test Type | Command / Smoke |
|------|------|-------------|-----------------|-----------|-----------------|
| 0 | 11-01 | AVAL-01..09 | RED stubs calibrated to fail pre-impl (module-not-found) | unit/deno | `npm run test:run` / `deno test avaliar-redacao` |
| 0 | 11-01 | LGPD-04 | grep guard extended to `supabase/migrations` (SJT seed scan) | unit | `npm run test:run -- forbidden-strings` |
| 1 | 11-02 | AVAL-01/09 | scores_candidato + perguntas + respostas_avaliacao + RLS (candidato own-row + etapa gate back-lock; RH allowlist read, candidato NO score read) | sql-smoke | SMOKE-6, SMOKE-7 |
| 1 | 11-02 | AVAL-02 | pontuar_sjt SECURITY DEFINER: Σ peso server-side, <mc_min_pct OR ≥1 atencao → pendente_humano, NEVER etapa change | sql-smoke | SMOKE-1, SMOKE-2, SMOKE-3, SMOKE-4, SMOKE-5, SMOKE-8 |
| 2 | 11-03 | AVAL-03 | avaliar-redacao EF: authorize (auth.uid() owns candidatura + etapa gate — C1) before scoring; work_sample_sjt prompt; 1-5→weighted 0-25; <13/25 OR red_flag → pendente_humano; candidato/non-owner → 403 | deno | `deno test avaliar-redacao` (flips GREEN) |
| 2 | 11-03 | AVAL-01 | testesAplicaveis SJT-key extension (tipo/cargo/itens_ids/bateria_size/threshold.mc_min_pct=60) | unit | `npm run test:run -- testesAplicaveisSchema` (flips GREEN) |
| 3 | 11-04 | (BLOCKING) | migrations applied PROD + work_sample_sjt is_active=true + EF deployed + types regen + ALL smokes pass live | sql-smoke | MCP apply + SMOKE-1..8 live |
| 4 | 11-05 | AVAL-01/02/09 | container + SJT MC/open-case screens + autosave 30s + back-lock + testesAplicaveis ext | unit | `npm run test:run -- AvaliacaoContainer useAutosaveAvaliacao` (flips GREEN) |
| 5 | 11-06 | AVAL-02/03 | RH scorecard read (allowlist role-gated, no select('*')) | unit | `npm run test:run` |

## SQL-Smoke Runbook

> Executed against a disposable fixture (a seeded `candidatos` + `candidaturas` row at
> `etapa_atual='avaliacao_assincrona'` + 3 seeded `perguntas` with `pergunta_opcao_metadata`
> weights). Authz smokes simulate roles via
> `SELECT set_config('request.jwt.claims', '{"sub":"<user_uuid>","role":"authenticated"}', true);`
> (Phase-8 precedent — `20260608000001_inscricao_knockout.sql` smoke fixtures). `auth.uid()` reads
> the `sub` GUC and survives SECURITY DEFINER (Phase-6 proof). Cleanup is ROLLBACK-free per Phase-8.
> Owned by Plan **11-04** (the [BLOCKING] PROD apply wave); calibrated against Wave-1/2 code.

### SMOKE-1 — `pontuar_sjt` Σ-peso correctness (AVAL-02, Plan 11-02)
- **Setup:** fixture candidatura `F` (owner `U`, etapa `avaliacao_assincrona`) + 3 seeded perguntas, each with `pergunta_opcao_metadata` weights (`fortemente_pontua=4`, `pontua=2`, `neutro=1`, `atencao=0`). Mark known options summing to a known `v_score`; `v_max = Σ MAX(peso) per pergunta`.
- **Role:** owner `U` via `set_config('request.jwt.claims', '{"sub":"<U>","role":"authenticated"}', true)`.
- **Call:** `SELECT public.pontuar_sjt('<F>', '[{"pergunta_id":...,"opcao_id":...}, x3]'::jsonb);`
- **Expect:** `scores_candidato` row tipo='sjt' subtipo='mc' with `score = expected v_score` and `score_max = expected v_max`; the breakdown in `metadata->'respostas'` carries 3 items with the correct tag/peso per opcao.

### SMOKE-2 — threshold `<mc_min_pct` OR ≥1 `atencao` → `status='pendente_humano'` (AVAL-02, Plan 11-02)
- **Setup:** two fixture candidaturas: (a) marked options scoring below `mc_min_pct` of `v_max` (default 60%); (b) marked options including ≥1 `atencao`-tagged opcao.
- **Role:** owner of each.
- **Expect:** both `scores_candidato` rows carry `status='pendente_humano'`. A high-scoring, atencao-free control row carries `status='sucesso'`. (The `mc_min_pct` used is the per-vaga `testes_aplicaveis.threshold.mc_min_pct`, default 60.)

### SMOKE-3 — `pontuar_sjt` raises `42501` for a NON-OWNER (AVAL-02 authz / C1, Plan 11-02)
- **Setup:** fixture candidatura `F` owned by `U`.
- **Role:** a DIFFERENT user `V` via `set_config('request.jwt.claims', '{"sub":"<V>","role":"authenticated"}', true)`.
- **Call:** `SELECT public.pontuar_sjt('<F>', '[...]'::jsonb);`
- **Expect:** raises `SQLSTATE 42501` ('forbidden') — the ownership guard fires BEFORE any `scores_candidato` write; assert no row was inserted.

### SMOKE-4 — `pontuar_sjt` raises `42501` for the OWNER at the WRONG etapa (AVAL-02 back-lock, Plan 11-02)
- **Setup:** fixture candidatura `F` owned by `U` but `etapa_atual='triagem'` (NOT `avaliacao_assincrona`).
- **Role:** owner `U` via `set_config('request.jwt.claims', '{"sub":"<U>","role":"authenticated"}', true)`.
- **Call:** `SELECT public.pontuar_sjt('<F>', '[...]'::jsonb);`
- **Expect:** raises `SQLSTATE 42501` — the etapa predicate in the ownership guard denies; no `scores_candidato` write.

### SMOKE-5 — never-auto-reject: after scoring, `candidaturas` UNCHANGED + no new `historico_candidatura` (RNF-07a, Pitfall 4, Plan 11-02)
- **Setup:** fixture candidatura `F` at `avaliacao_assincrona`; capture `etapa_atual` + `historico_candidatura` row count before.
- **Role:** owner `U`. Run a DELIBERATELY low-scoring `pontuar_sjt` (`status='pendente_humano'`).
- **Expect:** `candidaturas.etapa_atual` is STILL `avaliacao_assincrona` (no auto-advance, no auto-reject); `historico_candidatura` count for `F` is UNCHANGED. Scoring writes `scores_candidato` ONLY.

### SMOKE-6 — etapa-gate RLS on `respostas_avaliacao`: candidato autosave SUCCEEDS in-etapa, DENIED after advance (AVAL-09 back-lock, Pitfall 3, Plan 11-02)
- **Setup:** fixture candidatura `F` owned by `U` at `avaliacao_assincrona`.
- **Role:** owner `U` via `set_config('request.jwt.claims', '{"sub":"<U>","role":"authenticated"}', true)` — NOT service_role (RLS must apply).
- **In-etapa:** `INSERT`/`UPDATE` into `respostas_avaliacao (candidatura_id, teste, respostas)` SUCCEEDS (WITH CHECK passes).
- **After advance:** advance `F.etapa_atual` past `avaliacao_assincrona` (via service_role/avancar_etapa), then re-attempt the UPDATE as `U` → DENIED (0 rows affected / RLS rejects — the back-lock). Assert the row is now read-only.

### SMOKE-7 — `scores_candidato` candidato-DENY, RH allowlist read (LGPD/PII, Plan 11-02)
- **Setup:** a `scores_candidato` row for `F`.
- **Candidato role:** `U` (the owner) `SELECT ... FROM scores_candidato WHERE candidatura_id='<F>'` → returns ZERO rows (no candidato SELECT policy → denied). The candidate NEVER reads scores.
- **RH role:** `set_config('request.jwt.claims', '{"sub":"<RH>","role":"authenticated"}', true)` with the RH app_metadata role → the `rh_le_scores` allowlist policy returns the row. Confirm RH reads only the allowlisted columns (no `select('*')` leak — `reference_select_star_leaks_pii`).

### SMOKE-8 — `pontuar_sjt` idempotent UPSERT: re-run UPDATES the single MC row, no duplicate (Pitfall 7, Plan 11-02)
- **Setup:** fixture candidatura `F`; run `pontuar_sjt` once (1 `scores_candidato` mc row).
- **Role:** owner `U`. Re-run `pontuar_sjt('<F>', '[...changed answers...]'::jsonb)`.
- **Expect:** still exactly ONE `scores_candidato` row for `(candidatura_id, tipo='sjt', subtipo='mc')` (ON CONFLICT DO UPDATE), with the score/metadata reflecting the second run and `updated_at` advanced — NOT a second inserted row. (Verify the UNIQUE/NULLS-NOT-DISTINCT key tolerates the NULL `pergunta_id` on the aggregate MC row.)

## Wave 0 Requirements
- [x] deno RED stub for avaliar-redacao (module-not-found + authz 401/403 cases) — `f2d677d`
- [x] vitest RED stubs (container, autosave hook) — `f2d677d`
- [x] vitest RED case (testesAplicaveis SJT keys) — `fce49d2`
- [x] SQL smoke runbook (SMOKE-1..8: pontuar_sjt scoring/threshold/authz + etapa-gate RLS + scores DENY + never-auto-reject + idempotent)
- [x] LGPD-04 grep guard extended to `supabase/migrations` + green — `fce49d2`

## Manual-Only Verifications
| Behavior | Req | Why Manual |
|----------|-----|-----------|
| Full candidate assessment flow live | AVAL-01/02/09 | Real candidatura at etapa=avaliacao_assincrona + AI calls |
| SJT open-case AI scoring quality | AVAL-03 | Real AI call + rubric judgment |
| Autosave 30s + back-lock end-to-end | AVAL-09 | Real session + tab close + etapa advance |
| RH scorecard visual | AVAL-02/03 | Live data + visual |

## Validation Sign-Off
- [ ] nyquist_compliant: true set in frontmatter (flips after the UI-wave tests are GREEN)
**Approval:** pending
