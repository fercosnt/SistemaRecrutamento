---
phase: 13-reda-o-cultural-revis-o-humana
plan: 02
subsystem: [database, api, edge-function]
tags: [supabase, rls, plpgsql, security-definer, edge-function, deno, anthropic, openai, zod-v4, essay-scoring, rnf-07a, two-client, idor]

# Dependency graph
requires:
  - phase: 13 (Plan 13-01)
    provides: EssayScoringV1Schema (zod/v4) + computeScoreAndCors/normalizeForHash (PRD §8.3/§8.4 verbatim, GREEN deno contracts)
  - phase: 09 (ai-prompt-library-cost-infra)
    provides: callAi / loadPrompt / resolvedPromptFromLoaded pipeline (injection/maskPII/retry/fallback/cost/audit-log)
  - phase: 11 (avaliacao-assincrona-infra)
    provides: avaliar-redacao (SJT) two-client auth-then-authorize skeleton; scores_candidato sink + status_score enum
  - phase: 10 (triagem-rh-com-ia)
    provides: analise-candidato-individual static-import + injected zodOutputFormat/zodResponseFormat deps-wiring (PROD-green clone target)
provides:
  - perguntas_redacao table + 11-row seed + SELECT-all/admin-write RLS (PRD §8.1/§8.2 verbatim)
  - redacoes_candidato_em_progresso autosave table + candidate-own-while-avaliacao_assincrona RLS + RH-read
  - redacoes_candidato final sink + candidate-own SELECT + client-INSERT-deny + RH SELECT/UPDATE + BEFORE UPDATE review-fields-only trigger
  - salvar_revisao_redacao SECURITY DEFINER review-write RPC (role+own-vaga guard, notas≥50, decisao enum, duvida-does-not-finalize)
  - avaliar-redacao-cultural Edge Function (static npm imports, two-client, callAi, computeScoreAndCors, status always pendente_humano, bloqueio only on vermelho, never writes candidaturas)
  - _shared/redacao-schemas.ts AvaliarRedacaoCulturalBodySchema (.strict, no score field — flips redacao-contract GREEN)
affects: [13-03 candidate essay UI, 13-04 PROD apply + EF deploy + prompt activation, 13-05 RH review queue]

# Tech tracking
tech-stack:
  added: []  # zero net-new packages — @anthropic-ai/sdk@0.102.0 / openai@6.42.0 / zod@3.25.76 already PROD-green in 3 EFs
  patterns:
    - "Static-import + injected-helper EF chain cloned from analise-candidato-individual (NOT the .join('npm:') dynamic import still in the SJT avaliar-redacao)"
    - "Two-client authenticate-THEN-authorize with ownership resolved via candidatos.user_id=auth.uid() (the correct IDOR check; candidato_id is candidatos.id, NOT the auth uid)"
    - "Body schema in a token-free _shared file (no 'score'/'pontuacao' substrings) so the client↔EF source-probe contract passes while EssayScoringV1 keeps its *_score fields elsewhere"

key-files:
  created:
    - supabase/migrations/20260623100001_perguntas_redacao.sql
    - supabase/migrations/20260623100002_redacoes_candidato_em_progresso.sql
    - supabase/migrations/20260623100003_redacoes_candidato.sql
    - supabase/migrations/20260623100004_salvar_revisao_redacao_rpc.sql
    - supabase/functions/avaliar-redacao-cultural/index.ts
    - supabase/functions/avaliar-redacao-cultural/index.test.ts
    - supabase/functions/_shared/redacao-schemas.ts
    - .planning/phases/13-reda-o-cultural-revis-o-humana/deferred-items.md
  modified: []

key-decisions:
  - "Seed exactly 11 perguntas_redacao rows (PADRAO_BS + D1/D2/D3 + R1/R2/R3 + C1/C2/C3 + F1) per pergunta-padrao-redacao.md v1.1; the PRD prose's '13' overcounted freela (F1 only). Inline reconciliation comment recorded in the migration."
  - "Role value reconciled PRD 'admin' → live 'administrador' (custom_access_token_hook output) across all RLS + the review trigger + the RPC, with the live `#>>` projection idiom — a mismatch silently denies every RH read."
  - "Auth-link reconciled PRD candidatos.auth_user_id → live candidatos.user_id across both candidate RLS policies + the EF ownership resolution (the PRD column does not exist; the live pontuar_sjt uses user_id)."
  - "Collapsed the PRD's separate submit-redacao EF into the single scoring EF (Open Question 2): word_count 200-500 revalidation + sha256(normalize) texto_hash computed server-side in-handler; client INSERT stays denied by RLS WITH CHECK false."
  - "EF resolves candidate ownership via candidatos.user_id (the correct IDOR check), NOT the latent candidato_id===user.id pattern present in the SJT avaliar-redacao / submit-bigfive-final EFs."

patterns-established:
  - "Pattern 1: clone the PROD-green static-import + injected zodOutputFormat/zodResponseFormat chain for every new AI EF — never the .join('npm:') dynamic import (the 4× recurrence bug)."
  - "Pattern 2: always pendente_humano + bloqueio-only-on-vermelho + never-writes-candidaturas as the redação RNF-07a invariant (test-asserted on the persisted UPSERT payload)."

requirements-completed: [AVAL-05, AVAL-06, AVAL-07]

# Metrics
duration: 18min
completed: 2026-06-24
---

# Phase 13 Plan 02: Redação Cultural Migrations + EF Summary

**4 authored migrations (3 tables + 11-row essay seed + review-fields trigger + salvar_revisao_redacao SECURITY DEFINER RPC) plus the new avaliar-redacao-cultural Edge Function cloning the PROD-green static-import/two-client/callAi chain — status always pendente_humano, bloqueio only on vermelho, never auto-rejects (RNF-07a).**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-24T14:15:52Z
- **Completed:** 2026-06-24
- **Tasks:** 3 (Task 3 was TDD — RED + GREEN)
- **Files modified:** 8 (7 created + 1 deferred-items log)

## Accomplishments
- 4 migrations authored VERBATIM from the binding PRD v1.1 §8.1 (schema) + §8.2 (RLS + the BEFORE UPDATE review-fields-only trigger), with three load-bearing live-codebase reconciliations applied (role `admin`→`administrador`, auth-link `auth_user_id`→`user_id`, and the 11-vs-13 seed count). All no-BEGIN/COMMIT-wrapper (D-22); none applied (apply is the [BLOCKING] Plan 13-04).
- `salvar_revisao_redacao` SECURITY DEFINER RPC: role IN ('rh','administrador') + role='rh' must own the vaga, notas≥50 + decisao enum validation, `aprovado`/`reprovado`→`concluida`, `duvida`→stays `pendente_humano` (escalated to gestor, not finalized), REVOKE PUBLIC + GRANT authenticated, never writes candidaturas.
- New `avaliar-redacao-cultural` EF cloning the PROD-green skeleton: STATIC `npm:@anthropic-ai/sdk@0.102.0` + `helpers/zod`, `openai@6.42.0` + `helpers/zod` (no `.join("npm:")`), `zodOutputFormat`/`zodResponseFormat` injected into callAi deps; two-client authenticate-THEN-authorize (ownership via `candidatos.user_id=auth.uid()` — the correct IDOR check); server-side word_count 200-500 + sha256 hash; consumes the Wave-0 EssayScoringV1Schema + computeScoreAndCors; `status_analise='pendente_humano'` ALWAYS + `bloqueio_avanco` only when vermelho + NEVER touches candidaturas; neutral `{ ok:true }` payload.
- `_shared/redacao-schemas.ts` `AvaliarRedacaoCulturalBodySchema` (.strict, identifiers + texto only, no score token) — flips the Wave-0 `redacao-contract` Vitest test GREEN (5/5).
- 8/8 deno tests GREEN for the EF (deps injected, no network): 401 no-session, 403 IDOR, 403 wrong-etapa, 400 missing-texto, happy-verde (pendente_humano + bloqueio=false), vermelho (bloqueio=true + pendente_humano), RNF-07a never-writes-candidaturas, neutral payload. Wave-0 essay-schemas + compute-score contracts still 16/16 GREEN. tsc baseline flat at 291.

## Task Commits

Each task committed atomically (hook-bypass `git -c core.hooksPath=/dev/null` per project convention):

1. **Task 1: 3 migrations (tables + 11-row seed + RLS + review-fields trigger)** — `e594900` (feat)
2. **Task 2: salvar_revisao_redacao SECURITY DEFINER RPC** — `8fff43a` (feat)
3. **Task 3 (TDD RED): deno test for the EF** — `0837e13` (test)
4. **Task 3 (TDD GREEN): avaliar-redacao-cultural EF + body schema** — `d0ff3bb` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified
- `supabase/migrations/20260623100001_perguntas_redacao.sql` — prompt bank + 11-row seed + SELECT-all/admin-write RLS
- `supabase/migrations/20260623100002_redacoes_candidato_em_progresso.sql` — autosave + candidate-own-while-avaliacao_assincrona RLS + RH-read
- `supabase/migrations/20260623100003_redacoes_candidato.sql` — final sink + candidate-own SELECT + client-INSERT-deny + RH SELECT/UPDATE + review-fields trigger
- `supabase/migrations/20260623100004_salvar_revisao_redacao_rpc.sql` — SECURITY DEFINER review-write RPC
- `supabase/functions/avaliar-redacao-cultural/index.ts` — new essay-scoring EF (static imports, two-client, callAi, always pendente_humano)
- `supabase/functions/avaliar-redacao-cultural/index.test.ts` — 8-behavior deno test (deps injected)
- `supabase/functions/_shared/redacao-schemas.ts` — AvaliarRedacaoCulturalBodySchema (.strict, no score token)
- `.planning/phases/13-reda-o-cultural-revis-o-humana/deferred-items.md` — DI-13-01 (pre-existing strict-schema.test.ts type error, out of scope)

## Decisions Made
- **11-row seed, not 13** — the authoritative `pergunta-padrao-redacao.md` v1.1 defines exactly 11 codes; the PRD prose's "13" overcounted the freela template (F1 only, default OFF). The seed file wins (the PRD §8.1 references it, ships no INSERT itself). Inline reconciliation comment recorded.
- **Role `admin`→`administrador`** — the live M2 policies + the custom_access_token_hook emit `administrador`; transcribing the PRD's `admin` verbatim would silently deny every RH read/write. Applied across all 3 RLS-bearing migrations + the review trigger + the RPC, with the live `#>>` projection.
- **Auth-link `auth_user_id`→`user_id`** — the live `candidatos` table has no `auth_user_id` column; the link is `user_id` (confirmed against database.types.ts; live pontuar_sjt uses it). Applied to both candidate RLS policies + the EF ownership resolution.
- **One EF, not two (collapsed submit-redacao)** — per RESEARCH Open Question 2: the scoring EF computes word_count + texto_hash server-side, so a separate submit EF is unnecessary; the client INSERT stays denied by RLS `WITH CHECK false`.
- **Correct IDOR resolution** — the EF resolves the candidate via `candidatos.user_id=auth.uid()` then compares the resolved `id` to `candidatura.candidato_id`. The SJT `avaliar-redacao` and `submit-bigfive-final` compare `candidato_id===user.id` directly, which is a latent bug (candidato_id is `candidatos.id`, not the auth uid). The new EF does it right; the latent bug is noted below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Auth-link column reconciliation (PRD `candidatos.auth_user_id` → live `candidatos.user_id`)**
- **Found during:** Task 1 (RLS authoring) + Task 3 (EF ownership resolution)
- **Issue:** The PRD §8.2 RLS USING clauses reference `candidatos.auth_user_id`, which does not exist on the live table (the auth-link column is `user_id`). Transcribed verbatim, every candidate RLS subquery would match no row → silently deny all candidate reads/writes.
- **Fix:** Used the live column `user_id` in both candidate RLS policies (em_progresso + redacoes_candidato) and in the EF's ownership resolution. Verified against database.types.ts (candidatos.Row has `user_id: string`, no `auth_user_id`) and the live `pontuar_sjt` RPC idiom.
- **Files modified:** migrations 02 + 03, EF index.ts
- **Verification:** EF deno test C1(b) IDOR (403 non-owner) passes via the user_id→candidato_id resolution.
- **Committed in:** `e594900` + `d0ff3bb`

**2. [Rule 1 - Bug] Role-value reconciliation (PRD `admin` → live `administrador`)**
- **Found during:** Task 1 (RLS authoring), Task 2 (RPC guard)
- **Issue:** The PRD writes the role guard as `role = 'admin'` / `IN ('rh','admin')`. The live M2 policies (scores_candidato, bigfive_itens) and the custom_access_token_hook emit `administrador`. A mismatched role string silently denies every RH read/write ([[reference_auth_hook_rls_gap]]).
- **Fix:** Used `administrador` + the live `(select auth.jwt() #>> '{app_metadata,role}')` projection across all RLS policies, the review trigger, and the RPC guard.
- **Files modified:** migrations 01, 02, 03, 04
- **Verification:** matches the live scores_candidato.sql / bigfive_itens.sql idiom verbatim.
- **Committed in:** `e594900` + `8fff43a`

**3. [Rule 3 - Blocking] Reword the perguntas_redacao LGPD-04 comment (the forbidden-strings guard scans comments)**
- **Found during:** Task 3 (full Vitest suite)
- **Issue:** A SQL comment in 20260623100001 documented the LGPD-04 rule by quoting the banned clinical term verbatim. The `forbidden-strings.grep.test.ts` guard scans the whole file (comments included) → 1 test failed.
- **Fix:** Reworded the comment to reference "the forbidden clinical-evaluation term" + the approved product language, without the literal banned phrase.
- **Files modified:** migration 01
- **Verification:** `npm run test:run -- forbidden-strings` → 16/16 GREEN; grep scan of all new files clean.
- **Committed in:** `d0ff3bb` (folded into the GREEN commit — the migration was committed at HEAD~2, so amending mid-history was avoided; the one-line comment fix rode the Task-3 GREEN commit as a documented deviation).

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All three are correctness reconciliations between the binding PRD's prose and the live schema/guard idioms — required for the RLS/RPC/EF to actually function (mismatched column/role strings deny silently; the LGPD-04 comment broke the guard). No scope creep; the seed count and the EF behavior are exactly per plan.

## Known Stubs
None — all four migrations are complete DDL/RPC; the EF is fully wired through callAi + computeScoreAndCors with no placeholder data paths. (The `tempo_gasto_segundos` is persisted as 0 because the client does not yet send elapsed time in V1 — this is a documented PRD-V1 limitation, not a stub; the `tempo_anormalmente_curto` flag is conservatively suppressed by passing 0, and Plan 13-03 may wire real elapsed time.)

## Threat Flags
None — every surface introduced is already in the plan's `<threat_model>` (T-13-02-01..08 + SC). The EF authenticate-THEN-authorize, the candidate-DENY verdict columns, the never-writes-candidaturas invariant, the static-import chain, and the RH role+own-vaga RPC guard all map to existing register rows.

## Issues Encountered
- The plan's verify grep `! grep -q '\.join('` is too coarse — it flags the legitimate `Array.from(...).join("")` in the EF's `sha256Hex` helper and the two documentation comments that name the anti-pattern. Confirmed via a non-comment-code scan that there is NO dynamic `npm:` import (`import(`, `.join("npm:")`, `["npm:"`) anywhere in code — only static top-level imports. The intent (no `.join("npm:")` import bug) is satisfied.
- zod/v4 exposes the inferred type via `.type` (not `._type`); used the exported `EssayScoringV1` type alias instead. The test's `mod as {...}` cast needed `as unknown as {...}` because the EF's deps type is narrower than `Record<string, unknown>`.

## Latent bug noted (not fixed here — out of scope)
The SJT `avaliar-redacao` and `submit-bigfive-final` EFs compare `candRow.candidato_id !== user.id` directly, but `candidato_id` is `candidatos.id` (a separate PK), not the auth uid — so that ownership check is structurally wrong (it would 403 a legitimate owner / could mis-authorize). The new `avaliar-redacao-cultural` EF resolves ownership correctly via `candidatos.user_id`. The pre-existing EFs are outside this plan's scope; this is logged here for a future correctness pass (their live behavior should be re-verified in their own phase).

## User Setup Required
None in this plan. The new EF deploy + `culture_fit_essay` prompt activation + PROD migration apply are the [BLOCKING] Plan 13-04 wave.

## Next Phase Readiness
- **Plan 13-03 (candidate essay UI):** can read `perguntas_redacao` via RLS (SELECT-all) and invoke `avaliar-redacao-cultural` with `{ candidatura_id, pergunta_id, texto }` (the `.strict` body contract is GREEN). The candidate allowlist (Plan 03) must exclude every verdict column.
- **Plan 13-04 (PROD apply, [BLOCKING]):** apply the 4 migrations via MCP `apply_migration` (the redacoes_candidato + RPC migrations have $$ bodies → 42601-risk; MCP path bypasses it), regenerate database.types.ts, activate `culture_fit_essay`, deploy `avaliar-redacao-cultural` (JWT-ON), run the SMOKE-1..8 runbook.
- **Plan 13-05 (RH review queue):** consumes `salvar_revisao_redacao` (RPC) + the redacoes_candidato review fields + the RH allowlist.
- No blockers. tsc baseline 291 (flat), build exit 0, EF deno 8/8 GREEN, Wave-0 contracts 16/16 GREEN, redacao-contract Vitest 5/5 GREEN, LGPD-04 guard 16/16 GREEN.

## Self-Check: PASSED

All 8 created files verified on disk (4 migrations + EF index.ts + EF index.test.ts + _shared/redacao-schemas.ts + 13-02-SUMMARY.md); all 4 task commits (`e594900`, `8fff43a`, `0837e13`, `d0ff3bb`) found in git log.

---
*Phase: 13-reda-o-cultural-revis-o-humana*
*Completed: 2026-06-24*
