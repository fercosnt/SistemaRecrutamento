---
phase: 13
slug: reda-o-cultural-revis-o-humana
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-06-23
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 13-RESEARCH.md §Validation Architecture. Wave-0 RED scaffolds +
> the two GREEN load-bearing contracts (EssayScoringV1 schema + computeScoreAndCors)
> + this SQL-smoke runbook landed in Plan **13-01** (smoke-runtime gate).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (frontend/services) + `deno test` (Edge Functions, mocked SDK) + SQL smokes (tables/RLS/trigger/CHECK/seed via MCP) |
| **Config file** | vite.config.ts (`test:` block) ; deno test per-function |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run` + `deno test --allow-read --allow-env --allow-net supabase/functions/_shared/ supabase/functions/avaliar-redacao-cultural/` + SQL smokes via MCP |
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

> Filled from 13-RESEARCH.md §Validation Architecture (AVAL-05/06/07). Wave 0
> (Plan 13-01) lands the RED battery + the 2 GREEN contracts; Waves 1-5 flip the
> RED scaffolds GREEN as Plans 02/03/05 implement; Plan 04 is the [BLOCKING] PROD
> apply wave that runs the SQL smokes live.

| Wave | Plan | Requirement | Threat Ref | Secure Behavior | Test Type | Command / Smoke | Status |
|------|------|-------------|------------|-----------------|-----------|-----------------|--------|
| 0 | 13-01 | AVAL-06 | T-13-01-01 | EssayScoringV1 parses valid / rejects ≠4 dims / requires red_flag_etico / D1-D4 enum / literal(true) — PRD §8.4 verbatim on zod/v4 | deno (GREEN) | `deno test supabase/functions/_shared/__tests__/essay-schemas.test.ts` | ✅ green |
| 0 | 13-01 | AVAL-06 | T-13-01-02 | computeScoreAndCors deterministic: equal-weights ×20, 3 caps, 3-color, tempo flag, dedup — PRD §8.3 verbatim | deno (GREEN) | `deno test supabase/functions/avaliar-redacao-cultural/_local/compute-score.test.ts` | ✅ green |
| 0 | 13-01 | AVAL-05 | — | RedacaoCounter 3-band gating (`<200` muted+disabled / `200-500` #35BFAD+enabled / `>500` amber+disabled) | unit (RED) | `npm run test:run RedacaoCounter` | ❌ red (W0) |
| 0 | 13-01 | AVAL-06 | T-13-01-03 | redacaoService candidate read uses explicit allowlist, NEVER `select('*')`, EXCLUDES verdict columns | unit (RED) | `npm run test:run redacaoService` | ❌ red (W0) |
| 0 | 13-01 | AVAL-06 | (Pitfall 5) | client submit body `{candidatura_id, pergunta_id, texto}` parses against the EF body Zod; `.strict` rejects an injected score | contract (RED probe + GREEN replica) | `npm run test:run redacao-contract` | ❌ red probe (W0) |
| 0 | 13-01 | AVAL-07 | — | RedacaoOverrideForm 4 BARS sliders recompute composite/color; notas<50 → Salvar disabled; decisão radio aprovado/reprovado/duvida | unit (RED) | `npm run test:run RedacaoOverrideForm` | ❌ red (W0) |
| 0 | 13-01 | AVAL-07 | — | RedacaoSidebar severity sort vermelho→amarelo→verde + default filter vermelho+amarelo | unit (RED) | `npm run test:run RedacaoSidebar` | ❌ red (W0) |
| 1 | 13-04 | AVAL-05/06/07 | T-13-* | migrations applied PROD via MCP + culture_fit_essay is_active=true + EF deployed + types regen + smokes live | sql-smoke | SMOKE A-F + em_progresso live | ✅ PASS 2026-06-24 |

> **13-04 LIVE APPLY (2026-06-24) — PASS.** All 4 migrations applied to PROD via MCP apply_migration (index names redacao-prefixed to avoid a Phase-11 SJT collision); `perguntas_redacao` seed = 11 rows / 1 is_padrao; 3 tables + review trigger + `salvar_revisao_redacao` RPC live. `culture_fit_essay` prompt hydrated from 06-culture-fit-essay.md (sys_len 2257) + is_active=true (single active row; content_hash left as seed sentinel — immutability trigger locked it after deployed_at, runtime-irrelevant, canonical-sync reconcile deferred). `avaliar-redacao-cultural` EF deployed JWT-on (anon→401); `submit-bigfive-final` redeployed with the ownership fix (anon→401). `database.types.ts` regenerated at ROOT (redacoes_candidato + perguntas_redacao + em_progresso + salvar_revisao_redacao present); lint 291 flat. **SQL smokes PASS live (disposable fixture candidatura 4dc31256, ROLLBACK-free cleanup):** SMOKE-A redacoes_candidato client INSERT denied (RLS WITH CHECK false, role authenticated → 42501); SMOKE-B salvar_revisao_redacao as candidato → insufficient_privilege; SMOKE-C notas<50 → check_violation; SMOKE-D RH-owner happy → status_analise=concluida + **candidaturas UNCHANGED (RNF-07a holds)**; SMOKE-E review-fields trigger blocks RH UPDATE of texto; SMOKE-F word_count CHECK (200-500); em_progresso candidate-write ownership idiom validated (auth.uid() resolves, ownership=true). **Deferred to human UAT:** full live AI essay scoring (real candidate + Anthropic call) + the em_progresso positive end-to-end + RH review UI round-trip.
| 2 | 13-02 | AVAL-06 | (Pitfall 1/2/4) | new EF: static npm imports + zod/v4 schema + authenticate-THEN-authorize (non-owner → 403) + computeScoreAndCors + ALWAYS pendente_humano + NEVER writes candidaturas | deno | `deno test avaliar-redacao-cultural` (flips GREEN) + SMOKE-5 | ⬜ pending |
| 3 | 13-03 | AVAL-05/06 | T-13-01-03 | candidate essay editor + counter + autosave (reuse hook) + allowlist read (no verdict) | unit | `npm run test:run RedacaoCounter redacaoService redacao-contract` (flips GREEN) | ⬜ pending |
| 5 | 13-05 | AVAL-07 | — | RH review panel + sidebar + override form + salvar_revisao_redacao RPC | unit | `npm run test:run RedacaoOverrideForm RedacaoSidebar` (flips GREEN) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## SQL-Smoke Runbook

> Executed against a disposable fixture (a seeded `candidatos` + `candidaturas` row
> at `etapa_atual='avaliacao_assincrona'` + a seeded `perguntas_redacao` row + a
> `redacoes_candidato` row written via service_role). Authz smokes simulate roles via
> `SELECT set_config('request.jwt.claims', '{"sub":"<user_uuid>","role":"authenticated"}', true);`
> (Phase-8/11 precedent). `auth.uid()` reads the `sub` GUC and survives SECURITY
> DEFINER (Phase-6 proof). RH-role smokes set `app_metadata.role` in the claims to
> `'rh'`/`'administrador'`. Cleanup is ROLLBACK-free per Phase-8.
> **Owned by Plan 13-04** (the [BLOCKING] PROD apply wave); calibrated against
> Wave-1/2/3/5 code. Source schema: PRD §8.1 (tables) + §8.2 (RLS + trigger).

### SMOKE-1 — `redacoes_candidato_em_progresso` autosave RLS: candidate R/W own only, RH read (AVAL-05, Plan 13-03 table)
- **Setup:** fixture candidatura `F` owned by `U` at `etapa_atual='avaliacao_assincrona'`.
- **Candidate role `U`** (`set_config request.jwt.claims sub=U`): `INSERT`/`UPDATE` into `redacoes_candidato_em_progresso (candidatura_id, pergunta_id, texto_parcial)` SUCCEEDS (own-row WITH CHECK passes); a DIFFERENT user `V` reading/writing `F`'s row → 0 rows / denied.
- **RH role** (`app_metadata.role='rh'`): SELECT `F`'s em_progresso row SUCCEEDS (read-only).
- **Expect:** candidate writes own row only; non-owner denied; RH reads.

### SMOKE-2 — em_progresso etapa-gated back-lock: autosave DENIED after advance (AVAL-05, Pitfall 3, Plan 13-03)
- **Setup:** fixture `F` owned by `U` at `avaliacao_assincrona`; candidate `U` writes the em_progresso row.
- **After advance:** advance `F.etapa_atual` past `avaliacao_assincrona` (service_role), then re-attempt the UPDATE as `U`.
- **Expect:** the post-advance UPDATE is DENIED (0 rows / RLS rejects — the back-lock); the row is now read-only for the candidate.

### SMOKE-3 — `redacoes_candidato` RLS: candidate own-row SELECT-deny on scoring, client INSERT denied (AVAL-06, Pitfall 3, Plan 13-02/03)
- **Setup:** a `redacoes_candidato` row for `F` written by the service_role EF (`status_analise='pendente_humano'`, `classificacao_cor` set).
- **Candidate role `U` (the owner):** `SELECT ... FROM redacoes_candidato WHERE candidatura_id='<F>'` → returns ZERO rows (no candidate SELECT policy on the scoring table → denied entirely; RLS is row-level only — the candidate NEVER reads verdicts).
- **Candidate INSERT:** `INSERT INTO redacoes_candidato (...)` as `U` → DENIED (`WITH CHECK (false)`); only the service_role EF + the review RPC write.
- **RH role:** the `rh_le_redacoes` allowlist policy returns the row (RH reads only the allowlisted columns — no `select('*')` leak).
- **Expect:** candidate read = 0 rows; candidate INSERT denied; RH reads the row.

### SMOKE-4 — `notas_revisor ≥ 50` CHECK / RPC guard + `decisao_revisor` enum CHECK (AVAL-07, Plan 13-05 RPC)
- **Setup:** a `redacoes_candidato` row for `F` at `status_analise='pendente_humano'`.
- **RH role** owning the vaga. Call `salvar_revisao_redacao('<redacao_id>', '{...}'::jsonb)`:
  - notas_revisor of 49 chars → raises (RPC guard / CHECK); notas ≥50 → SUCCEEDS.
  - `decisao_revisor='maybe'` (not in {aprovado,reprovado,duvida}) → raises (enum/CHECK); a valid enum value SUCCEEDS.
- **Expect:** notes <50 and out-of-enum decisão both rejected before any write; valid decision persists.

### SMOKE-5 — never-auto-reject: after scoring, `candidaturas` UNCHANGED + no new `historico_candidatura` (RNF-07a, Pitfall 4, Plan 13-02 EF)
- **Setup:** fixture `F` at `avaliacao_assincrona`; capture `etapa_atual` + `historico_candidatura` count before. Score a deliberately vermelho essay (`bloqueio_avanco=true`, `status_analise='pendente_humano'`).
- **Expect:** `candidaturas.etapa_atual` STILL `avaliacao_assincrona` (no auto-advance, no auto-reject); `historico_candidatura` count for `F` UNCHANGED. The EF writes `redacoes_candidato` ONLY — NEVER `candidaturas`. `bloqueio_avanco` only HOLDS the automatic advance; the human always decides.

### SMOKE-6 — BEFORE UPDATE review-fields-only trigger: RH UPDATE of texto/hash/IA fields → RAISE (AVAL-07, Pitfall 6 trigger, Plan 13-05)
- **Setup:** a `redacoes_candidato` row for `F`. RH role owning the vaga.
- **RH UPDATE review fields** (`notas_revisor`, `decisao_revisor`, `scores_humanos`, `revisado_por`, `revisado_em`) → SUCCEEDS.
- **RH UPDATE a protected field** (`texto`, `texto_hash`, `analise_ia`, `scores_dimensao`, `classificacao_cor`, `red_flag_etico`) → the `trg_redacao_rh_only_review_fields` BEFORE UPDATE trigger RAISES (rejects the non-review-field change).
- **Expect:** review-field UPDATE persists; any change to texto/hash/IA fields by RH is rejected at the DB.

### SMOKE-7 — seed `perguntas_redacao` count assertion + candidate reads active prompts (AVAL-05, Plan 13-03 seed)
- **Setup:** the seeded prompt bank from `fit-cultural-banco-itens-v1.md`.
- **Expect:** `SELECT count(*) FROM perguntas_redacao` ≥ the seeded row count (PADRAO_BS + 12 customizable templates per the PRD); `count(*) FILTER (WHERE is_padrao)` ≥ 1. Candidate role reads `status='active'` prompts via the `cand_le_perguntas_redacao` SELECT policy (the prompt text is candidate-visible — NOT an answer key).

### SMOKE-8 — `salvar_revisao_redacao` authz: non-RH / non-owning-RH raises `42501` (AVAL-07 authz, Plan 13-05 RPC)
- **Setup:** a `redacoes_candidato` row for `F` under vaga owned by RH `RA`.
- **Candidate role `U`:** call the RPC → raises `SQLSTATE 42501` (role guard: not rh/administrador).
- **RH role `RB`** who does NOT own the vaga (and is not administrador): call the RPC → raises `42501` (own-vaga guard). `RA` (owner) or an administrador → SUCCEEDS.
- **Expect:** the role + own-vaga guard fires BEFORE any write; no `redacoes_candidato` row mutated on the denied calls.

---

## Wave 0 Requirements

- [x] EssayScoringV1 Zod schema contract test (4 dims D1-D4 + red_flag_etico + .length(4) + caps shape) — GREEN deno — `3af37d8`
- [x] computeScoreAndCors determinism test (PRD §8.3 reference cases: equal-weights ×20 + 3 caps + 3-color + tempo flag + dedup) — GREEN table-driven deno — `3897513`
- [x] RedacaoCounter 3-band gating RED scaffold (AVAL-05) — module-not-found
- [x] redacaoService allowlist projection RED scaffold (AVAL-06, no `select('*')`, excludes verdict columns)
- [x] redacao-contract client↔EF body RED scaffold (Pitfall 5, source-probe RED + replica GREEN)
- [x] RedacaoOverrideForm + RedacaoSidebar RED scaffolds (AVAL-07)
- [x] SQL-smoke runbook (SMOKE-1..8: em_progresso RLS + back-lock + redacoes RLS/client-INSERT-deny + notas≥50/decisão CHECK + never-auto-reject + review-fields trigger + seed count + RPC authz)
- Existing infra reused unchanged: `useAutosaveAvaliacao` (30s + 42501 back-lock), `callAi`/`loadPrompt`/`audit-logger` (Phase 9, green), `SugestaoIABadge`, `RoleGuard`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live AI essay scoring end-to-end (real Anthropic call) | AVAL-06 | Needs real candidate essay + live EF + API key | Human UAT: submit a real essay, confirm EssayScoringV1 persisted + 3-color + `status_analise='pendente_humano'` + `bloqueio_avanco` correct |
| RH reviewer override + escalation flow | AVAL-07 | Needs RH session + queued essay | Human UAT: override sliders (composite/color recompute), write ≥50-char note, exercise aprovado/reprovado/duvida→gestor |
| Autosave 30s + back-lock end-to-end | AVAL-05 | Real session + tab close + etapa advance | Human UAT: write, wait 30s (autosave affordance), advance etapa, confirm neutral back-lock |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (schema + compute-score GREEN; 5 RED scaffolds; 8 SQL smokes)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter (flips after the UI-wave + EF + SQL smokes are GREEN/live)

**Approval:** pending (Wave 0 landed; flips after Plans 02-05 + the [BLOCKING] 13-04 PROD apply)
