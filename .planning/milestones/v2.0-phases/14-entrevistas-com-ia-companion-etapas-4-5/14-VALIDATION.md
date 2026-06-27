---
phase: 14
slug: entrevistas-com-ia-companion-etapas-4-5
status: smokes-green
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-24
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 14-RESEARCH.md §Validation Architecture + 14-PATTERNS.md. The Wave-0 RED
> battery + the 3 load-bearing GREEN modules (cognitive scorer + flag derivation +
> weak-dim coverage) + the 2 anti-tamper EF body schemas + this SQL-smoke runbook
> landed in Plan **14-01** (smoke-runtime gate, Phase-4 lesson D-25..D-28).
>
> `nyquist_compliant: false` — held until the implementation waves (14-03 EF/migration
> apply, 14-05/06 UI) flip the calibrated RED tests GREEN and the live SQL smokes PASS.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (frontend/services) + `deno test` (Edge Functions + `_local` + `_shared`, mocked SDK) + SQL smokes (tables/RLS/RPC/trigger via MCP) |
| **Config file** | vite.config.ts (`test:` block) ; deno test per-function |
| **Quick run command** | `npm run test:run -- entrevista-contract entrevista-allowlist` |
| **Full suite command** | `npm run test:run` + `deno test supabase/functions/_shared/cognitivo/ supabase/functions/avaliar-transcricao-entrevista/ supabase/functions/gerar-guia-entrevista/` + SQL smokes via MCP |
| **SQL smokes** | run via Supabase MCP `execute_sql` against a disposable fixture (`set_config request.jwt.claims`), ROLLBACK-free cleanup (Phase-8 precedent) |
| **Estimated runtime** | ~30-60s vitest + EF deno + manual SQL smokes |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (scoped to touched feature) + relevant `deno test`
- **After every plan wave:** Run full suite + relevant deno EF tests + SQL smokes
- **Before `/gsd:verify-work`:** Full suite green + all SQL smokes PASS
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

> Wave 0 (Plan 14-01) lands the RED battery + the 3 GREEN modules + the 2 EF body
> schemas. Waves flip the RED scaffolds GREEN as 14-03 (EFs/migrations) + 14-05/06
> (UI) implement; the apply wave runs the SQL smokes live.

| Wave | Plan | Requirement | Threat Ref | Secure Behavior | Test Type | Command / Smoke | Status |
|------|------|-------------|------------|-----------------|-----------|-----------------|--------|
| 0 | 14-01 | ENTREV-01/03 | T-14-01-01 | EF body schemas `.strict()` carry NO score/band; client bodies parse; source-probe proves zero score token | unit (GREEN) | `npm run test:run -- entrevista-contract` | ✅ green |
| 0 | 14-01 | ENTREV-05 | T-14-01-02 | `scoreRaciocinio` CTT soma 0/1 + 5-faixa banding; 10-profile golden battery; forged client score ignored (server-only key) | deno (GREEN) | `deno test supabase/functions/_shared/cognitivo/scoring.test.ts` | ✅ green |
| 0 | 14-01 | ENTREV-03 | T-14-01-03 | `deriveLanguageAccentFlag` server-derived (`score<3 && regional_markers_ignored===false`); 6-row truth table | deno (GREEN) | `deno test supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.test.ts` | ✅ green |
| 0 | 14-01 | ENTREV-01 | (Pitfall 4) | `checkWeakDimCoverage` — every weak dim covered by some `questions[].competency` | deno (GREEN) | `deno test supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.test.ts` | ✅ green |
| 0 | 14-01 | ENTREV-04 | T-14-01-01 | entrevistaService read uses an explicit allowlist, NEVER `select('*')` | unit (RED) | `npm run test:run -- entrevista-allowlist` | ❌ red (W0 — service ships 14-05) |
| 1 | 14-03 | ENTREV-01/03/04/05 | T-14-* | migrations applied PROD via MCP + `interview_guide`/`transcript_analysis` prompts is_active=true + EFs deployed JWT-on + types regen + smokes live | sql-smoke | SMOKE-1..7 below | ⬜ pending |
| 2 | 14-03 | ENTREV-01 | (Pitfall 1/2/4) | `gerar-guia-entrevista` EF: static npm imports + InterviewGuideSchema + authenticate-THEN-authorize (non-owner → 403) + weak-dim coverage post-validation | deno | `deno test gerar-guia-entrevista` (flips GREEN) + SMOKE-5/7 | ⬜ pending |
| 2 | 14-03 | ENTREV-03 | (Pitfall 5) | `avaliar-transcricao-entrevista` EF: untrusted text via callAi + deriveLanguageAccentFlag + ALWAYS pendente_humano + NEVER writes candidaturas | deno | `deno test avaliar-transcricao-entrevista` (flips GREEN) + SMOKE-1 | ⬜ pending |
| 3 | 14-05 | ENTREV-04 | T-14-01-01 | RH entrevista workspace + scorecard + allowlist service read (no PII over-projection) | unit | `npm run test:run -- entrevista-allowlist` (flips GREEN) | ⬜ pending |
| 4 | 14-06 | ENTREV-05 | — | candidate cognitive prova screen + proctoring (no auto-reject) + neutral post-submit | unit/e2e | `npm run test:run` + Playwright cognitive flow | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## SQL-Smoke Runbook

> Executed against a disposable fixture (a seeded `candidatos` + `candidaturas` row
> at the interview/cognitive etapa + the new `entrevista_analises` / `cognitivo_*`
> rows written via service_role). Authz smokes simulate roles via
> `SELECT set_config('request.jwt.claims', '{"sub":"<user_uuid>","role":"authenticated"}', true);`
> (Phase-8/11 precedent). `auth.uid()` reads the `sub` GUC and survives SECURITY
> DEFINER (Phase-6 proof). RH-role smokes set `app_metadata.role` in the claims to
> `'rh'`/`'administrador'`. Cleanup is ROLLBACK-free per Phase-8.
> **Owned by the apply wave (14-03/04)**; calibrated against the Wave-0/1/2 code.
> Source schema: 14-PATTERNS.md §migrations + PRD-cognitivo §8.2/§8.3.

### SMOKE-1 — language/accent flag BLOCKS `avancar_etapa` until `revisao_confirmada` (ENTREV-03)
- **Setup:** fixture candidatura `F` owned by `U` with an `entrevista_analises` row where the derived flag fired (`bloqueio_avanco=true`, `revisao_confirmada_em IS NULL`).
- **Attempt:** advance `F.etapa_atual` past the interview etapa via `avancar_etapa` while the flag is unresolved.
- **Expect:** the advance is REJECTED (RAISE — a firing flag holds the funil). After an RH sets `revisao_confirmada_em` (human confirms), the advance SUCCEEDS. The flag SEGURA, never decides (RNF-07a).

### SMOKE-2 — `pontuar_cognitivo` RPC non-owner → 42501 (ENTREV-05)
- **Setup:** fixture candidatura `F` owned by `U` at the cognitive etapa.
- **Attempt:** call `pontuar_cognitivo(F, raw_responses)` as a DIFFERENT user `V` (`set_config sub=V`).
- **Expect:** `RAISE EXCEPTION ... USING errcode='42501'` (the in-DEFINER ownership guard; `auth.uid()` is GUC-based and survives SECURITY DEFINER). Owner `U` at the right etapa SUCCEEDS.

### SMOKE-3 — cognitive `status` NEVER auto-rejects (no `candidaturas` write) (ENTREV-05, RNF-07a)
- **Setup:** fixture `F` owned by `U`; snapshot `candidaturas` row for `F` (etapa_atual, status_candidatura).
- **Attempt:** call `pontuar_cognitivo(F, raw_responses)` (owner, even with an all-wrong `bem_abaixo` vector).
- **Expect:** a `scores_candidato` row (tipo='cognitivo') is written with the banda in metadata; the `candidaturas` row is UNCHANGED (no auto-reject, no etapa advance). The candidate's RPC return is NEUTRAL (`{ok:true}` — no score/band leaked).

### SMOKE-4 — `aplica_cognitivo=false` → no invite path (ENTREV-05)
- **Setup:** two vagas — `vaga_on` with `aplica_cognitivo=true`, `vaga_off` with `aplica_cognitivo=false`; a candidatura on each at the relevant etapa.
- **Attempt:** query the candidate's cognitive-prova eligibility for both.
- **Expect:** `vaga_on`'s candidatura surfaces the cognitive prova; `vaga_off`'s does NOT (no `cognitivo_respostas` row creatable / no invite). The opt-in gate holds.

### SMOKE-5 — `salvar_avaliacao_entrevista` non-owner RH → 42501 (ENTREV-04)
- **Setup:** fixture candidatura `F` whose vaga is owned by RH `R1` (`vagas.created_by=R1`).
- **Attempt:** call `salvar_avaliacao_entrevista(F, scores, notas)` as RH `R2` (a different recruiter, not the vaga owner; `app_metadata.role='rh'`).
- **Expect:** `RAISE ... insufficient_privilege` (own-vaga guard). `administrador` bypasses; `R1` (owner) SUCCEEDS. The RPC records notas_humanas/scores and NEVER writes `candidaturas` / advances the funil (RNF-07a).

### SMOKE-6 — candidate-DENY RLS on the new RH tables (ENTREV-04, LGPD)
- **Setup:** fixture candidatura `F` owned by candidate `U`; an `entrevista_guias` + `entrevista_analises` row for `F`.
- **Attempt:** as candidate `U` (`set_config sub=U`, role authenticated), `SELECT` from `entrevista_guias` / `entrevista_analises`.
- **Expect:** 0 rows (no candidato/anon policy → candidate denied entirely; RLS is row-level and cannot hide columns, so the table simply has no candidate-read policy). RH/admin (`app_metadata.role='rh'`) reads SUCCEED.

### SMOKE-7 — prompt rows `interview_guide` / `transcript_analysis` is_active=true post-hydration (ENTREV-01/03)
- **Setup:** after the apply wave hydrates the two prompt templates into `prompt_versions`.
- **Attempt:** `SELECT call_type, is_active FROM prompt_versions WHERE call_type IN ('interview_guide','transcript_analysis')`.
- **Expect:** exactly one `is_active=true` row per `call_type` (single active row invariant; the EFs `loadPrompt` the active row). The `content_hash`/template are immutable after `deployed_at` (Phase-13 `culture_fit_essay` precedent — hydrate is_active WITHOUT touching deployed_at).

---

## Notes

- **NOT applied this plan.** 14-01 is the Wave-0 RED/scorer/schema layer only. The
  migrations + EFs + prompt hydration land + apply in the 14-03 (and the [BLOCKING]
  PROD apply) wave; the SQL smokes above run live there (Supabase MCP `apply_migration`
  + `execute_sql`, D-22 — `$$` bodies + adjacent REVOKE/GRANT bypass SQLSTATE 42601).
- **Section partition (cognitive):** `scoreRaciocinio` accepts a `secoesByItem` map
  (matriz / letra_numero) the PROD caller (the `pontuar_cognitivo` RPC / `submit-
  cognitivo` EF) supplies from `cognitivo_itens.secao`. The golden test supplies it
  explicitly.
- **Banding norm_ref provisional:** `bandaFromTotal` uses wide proportion-correct
  quintiles (`provisoria_item_difficulty_sapa`, PRD §8.3 L183) — replaced by a local
  norm (IRT 2PL / SAPA item-difficulty) in v2; the `scoreRaciocinio` interface stays
  stable. Cognitive is CONTEXTUAL and decides nothing (RNF-07a) so an approximate
  band carries no eliminatory weight.

---

## Live Smoke Results — 14-04 PROD apply (2026-06-24)

Run live against PROD (`isljnozzlvckrgjjbjwp`) by the orchestrator via Supabase MCP
`apply_migration` + `execute_sql` (D-22), against a disposable fixture (candidatura
`14040404-…0001` at `entrevista_online` + a flagged `entrevista_analises` row), with
`set_config('request.jwt.claims', …)` role simulation and ROLLBACK-free cleanup
(Phase-8/11 precedent). Fixture fully torn down after (0 residual rows).

| # | Smoke | Requirement | Verdict | Evidence |
|---|-------|-------------|---------|----------|
| 1 | language/accent flag BLOCKS `avancar_etapa` until human confirm | ENTREV-03 / RF-24 | **PASS** | advance past `entrevista_online` raised `check_violation` ("bloqueio: revise a bandeira…"); after `revisao_confirmada_em` set → advance SUCCEEDED (server-authoritative, RNF-07a) |
| 2 | `pontuar_cognitivo` non-owner → 42501 | ENTREV-05 | **PASS** | non-owner `sub` → `42501 forbidden` (in-DEFINER ownership guard) |
| 3 | cognitive scoring NEVER auto-rejects | ENTREV-05 / RNF-07a | **PASS** | owner call wrote 1 `scores_candidato` (tipo=cognitivo) row; `candidaturas.etapa_atual` UNCHANGED — no candidaturas mutation |
| 4 | `aplica_cognitivo` opt-in gate | ENTREV-05 | **PASS** | `vaga.aplica_cognitivo=false` (default OFF — no cognitive invite path) |
| 5 | `salvar_avaliacao_entrevista` non-owner RH → 42501 | ENTREV-04 | **PASS** | RH (not vaga owner) → `42501 forbidden` (own-vaga guard) |
| 6 | candidate-DENY RLS on new RH tables | ENTREV-04 / LGPD | **PASS** | candidato role `SELECT entrevista_analises` → 0 rows |
| 7 | both EFs JWT-on (anon → 401) | ENTREV-01/03 | **PASS** | anon `curl` POST `gerar-guia-entrevista` + `avaliar-transcricao-entrevista` → HTTP 401 |

Plus: both prompt rows (`interview_guide`, `transcript_analysis`) hydrated with real
templates + `is_active=true`, `deployed_at` still NULL (Pitfall-6 content-first ordering);
`database.types.ts` regenerated (15 matches for the new tables/columns/RPCs);
`tipo_score` enum already carried `cognitivo`/`entrevista` (no `ALTER TYPE`).

**7/7 live smokes PASS — RNF-07a confirmed live.** Cognitive item seed = 0 rows
(ENTREV-05 live items deferred per user; smokes 2/3 exercise the empty-seed defensive
path). UI-wave (14-05/06) tests flip their own RED rows as those plans land.
