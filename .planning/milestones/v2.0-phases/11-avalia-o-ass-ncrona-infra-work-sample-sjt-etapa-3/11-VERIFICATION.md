---
phase: 11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3
verified: 2026-06-09T03:55:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Full candidate assessment flow end-to-end"
    expected: "Candidato at etapa_atual='avaliacao_assincrona' navigates to /candidato/avaliacao/:id, sees pending SJT tests with neutral status pills and tempo estimado, completes MC (radio-group with shuffled options + soft timer), and completes open case (textarea with 200-500 word count + autosave affordance). Submitting each calls the correct service method; after submit the card status changes to 'Concluído' and no score/threshold/percent is ever shown."
    why_human: "Requires a live candidatura at avaliacao_assincrona in PROD, real navigation through the glass-shell UI, visual verification of neutral status copy, and end-to-end service calls to live RPCs and EF — not automatable with grep or unit tests."
  - test: "avaliar-redacao AI scoring quality (BARS composite 0-25)"
    expected: "Submitting a 200-500 word open-case answer triggers a real AI call via work_sample_sjt prompt. The BARS dimensions 1-5 are computed and mapped to a weighted composite 0-25. Results under 13/25 or with red_flags route to status='pendente_humano' in scores_candidato. The candidate sees only a neutral success toast — no score, no threshold, no pass/fail indicator."
    why_human: "Requires real ANTHROPIC_API_KEY/OPENAI_API_KEY invocation against the live EF. Scoring quality and pendente_humano routing can only be evaluated by inspecting the scores_candidato row produced by a genuine AI call, not the mock-based deno unit tests."
  - test: "RH scorecard visual verification"
    expected: "ScorecardAvaliacao renders in the RH funil panel: per-item MC breakdown (item/tag/peso), open-case BARS per-dimension (score 1-5, level, reasoning), composite 0-25, citations/red_flags. Every AI-derived block carries the SugestaoIABadge. pendente_humano rows show 'Requer revisão humana' with no red/green tints. The candidate (logged in as candidato role) gets 0 rows from scores_candidato (RLS denial)."
    why_human: "Requires a live scored candidatura in PROD, visual inspection of the desktop RH panel layout, and confirmation that the RLS candidato-DENY works across the full request path (PostgREST + JWT)."
  - test: "Autosave + back-lock end-to-end"
    expected: "Typing in the SjtCasoAbertoScreen triggers the autosave affordance ('Salvando...' / 'Salvo automaticamente'). The 30s debounce can be verified by waiting ~30s between keystrokes. After avancar_etapa advances the candidatura, a subsequent autosave attempt shows 'Sua etapa avançou. Esta avaliação foi encerrada e suas respostas já estão salvas.' without an error toast."
    why_human: "Requires real-time browser interaction to observe the debounce timer, the neutral autosave copy, and the back-lock UX — all depend on live DB state transitions that cannot be exercised in a unit test without a running server."
---

# Phase 11: Avaliação Assíncrona — Infra + Work Sample/SJT Verification Report

**Phase Goal:** O candidato convocado faz o bloco de avaliação assíncrona com Work Sample/SJT por cargo (scoring determinístico, nunca auto-rejeição), com autosave e back-lock — e o RH vê scorecards estruturados.
**Verified:** 2026-06-09T03:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Tela `/candidato/avaliacao/:id` mostra testes pendentes (por `vaga.testes_aplicaveis`, ≥1 obrigatório) com tempo estimado, ordem livre, cada teste salvo independentemente | VERIFIED | `AvaliacaoContainer.tsx` renders one `GlassCard` per `testes_aplicaveis` entry with `"Tempo estimado: {N} min"` and neutral status pill; RoleGuard-guarded routes `/candidato/avaliacao/:candidaturaId`, `/mc`, `/caso` in `routes.tsx` (lines 200-219). `avaliacaoService.getAvaliacaoContext` reads candidatura allowlist + `testes_aplicaveis`. `useAutosaveAvaliacao` saves per-teste independently. |
| 2 | SJT MC pontua via Σ pesos 4/2/1/0, persiste `scores_candidato` tipo=`sjt`, `<60% OU ≥1 atencao` → revisão humana; nunca auto-rejeita | VERIFIED | `pontuar_sjt_rpc.sql` — SECURITY DEFINER, reads `perguntas_opcao_sjt` via `opcao_id` JOIN for Σ peso (fortemente_pontua=4/pontua=2/neutro=1/atencao=0), applies `(score/max)*100 < mc_min_pct` OR `has_atencao` → `pendente_humano`. UPSERT writes `scores_candidato(tipo='sjt', subtipo='mc')`. NEVER writes `candidaturas` (grep confirms). SMOKE-1 (Σ=12/12 sucesso) + SMOKE-2 (atencao→pendente_humano) + SMOKE-5 (etapa unchanged) passed live. |
| 3 | Case aberto SJT avaliado por `avaliar-redacao` com rubric BARS (0-25 + citações + red_flags Zod-validado), `<13/25 OU red flag` → revisão humana | VERIFIED | `avaliar-redacao/index.ts` — C1 auth (getUser→401/403), `loadPrompt('work_sample_sjt', supabaseAdmin)`, `callAi` with `WorkSampleScoringSchema`, maps 1-5 dims → weighted composite 0-25 via `(Σ peso·score / Σpeso / 5)·25`, `composite < 13 OR red_flags.length > 0 OR hasInsufficient` → `pendente_humano`, UPSERT `scores_candidato(tipo='sjt', subtipo='caso_aberto')`, NEVER touches `candidaturas.etapa_atual`. `_shared/avaliacao-schemas.ts` exports `WorkSampleScoringSchema` + `AvaliarRedacaoBodySchema` (no score field). |
| 4 | Autosave a cada 30s preserva progresso; back bloqueado após avançar etapa; RLS + EF impedem testes fora de `etapa_atual='avaliacao_assincrona'` | VERIFIED | `useAutosaveAvaliacao.ts` — 30s trailing-edge debounce, 42501→`locked` neutral state (no re-throw). `respostas_avaliacao_rls` migration (line 68+76): `AND c.etapa_atual = 'avaliacao_assincrona'` in BOTH USING and WITH CHECK. `pontuar_sjt` RAISES 42501 on wrong-etapa (line 65). `avaliar-redacao` returns 403 on wrong etapa (line 189). SMOKE-4+SMOKE-6 passed live. `SjtCasoAbertoScreen` renders neutral back-lock state on `locked`. |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260611000001_scores_candidato.sql` | Generic score sink + tipo_score/status_score enums + candidato-DENY RLS | VERIFIED | File exists; `tipo_score` (sjt/big_five/redacao/entrevista/cognitivo/decisao) + `status_score` (sucesso/pendente_humano/falhou) enums created; `rh_le_scores` SELECT for rh/administrador; NO candidato policy; no outer BEGIN/COMMIT |
| `supabase/migrations/20260611000002_perguntas_sjt.sql` | SJT item bank + RLS + 8-cargo seed + get_opcoes_sjt | VERIFIED | File exists; `perguntas` + `perguntas_opcao_sjt` tables; get_opcoes_sjt SECURITY DEFINER projects id+texto only; 10 perguntas (9 MC + 1 open-case) across 8 cargos live in PROD per 11-04 summary |
| `supabase/migrations/20260611000003_respostas_avaliacao.sql` | Autosave table + etapa-gated back-lock RLS | VERIFIED | File exists; `avaliacao_assincrona` in BOTH USING and WITH CHECK (lines 68+76); no outer BEGIN/COMMIT |
| `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql` | Deterministic MC scoring SECURITY DEFINER RPC | VERIFIED | File exists; SECURITY DEFINER; 42501 raise; no `UPDATE public.candidaturas`; REVOKE ALL + GRANT authenticated |
| `supabase/functions/_shared/avaliacao-schemas.ts` | WorkSampleScoringSchema verbatim + AvaliarRedacaoBodySchema (no score field) | VERIFIED | File exists; `WorkSampleScoringSchema` exported; `AvaliarRedacaoBodySchema` with `candidatura_id/pergunta_id/texto` — no score field |
| `supabase/functions/avaliar-redacao/index.ts` | Candidate-invoked AI scoring EF (C1 authz, work_sample_sjt) | VERIFIED | File exists; two-client pattern; `loadPrompt('work_sample_sjt', supabaseAdmin)` (grep line 211); no `sjt_evaluation`; allowlist candidatura read; composite 0-25 mapping documented; NEVER writes candidaturas |
| `src/features/config-vaga/schemas/testesAplicaveisSchema.ts` | SJT-key extension (mc_min_pct default 60) | VERIFIED | `mc_min_pct` at line 35 with `.default(60)`; `tipo/cargo/itens_ids/bateria_size/threshold` optional fields added; legacy 4 keys intact |
| `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts` | 30s debounced upsert + 42501 back-lock catch | VERIFIED | File exists; `DEFAULT_FLUSH_MS = 30_000`; `isBackLock` checks `code === '42501'` or `status === 42501/403`; sets `locked: true`, does not re-throw |
| `src/features/avaliacao/hooks/useAvaliacaoDraft.ts` | sessionStorage dies-with-tab draft | VERIFIED | File exists; uses `sessionStorage` (not localStorage) per LGPD requirement |
| `src/features/avaliacao/services/avaliacaoService.ts` | Allowlist reads + pontuar_sjt RPC + avaliar-redacao EF invoke | VERIFIED | No `select('*')` grep; `supabase.rpc('pontuar_sjt', ...)` at line 279; `supabase.functions.invoke('avaliar-redacao', ...)` at line 321; client never computes score |
| `src/features/avaliacao/schemas/respostaAvaliacaoSchema.ts` | Strict client answer shape (no score field) | VERIFIED | File created; `.strict()` discriminated union MC/caso_aberto; no score/pontuacao field |
| `src/features/avaliacao/components/AvaliacaoContainer.tsx` | Candidate glass-shell container (neutral status, no score) | VERIFIED | File exists; renders "Pendente"/"Concluído"/"Indisponível"; no score/threshold/percent text; wrong-etapa neutral lock; RoleGuard in routes.tsx |
| `src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx` | MC radio-group + soft timer + option shuffle + pontuarSjt | VERIFIED | File exists; `pontuarSjt` called (line 148); Fisher-Yates shuffle per session |
| `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx` | Open-case textarea + word count + autosave + avaliarRedacao | VERIFIED | File exists; `useAutosaveAvaliacao` imported (line 47); `avaliarRedacao` called (line 123); 200-500 word count enforced; `locked` state renders neutral back-lock copy |
| `src/features/avaliacao/services/scoresRhService.ts` | RH allowlist read of scores_candidato (no select('*')) | VERIFIED | File exists; `SCORES_ALLOWLIST` constant used; no star projection; `ScoresRhServiceError` class |
| `src/features/avaliacao/components/ScorecardAvaliacao.tsx` | Structured RH scorecard + SugestaoIABadge + pendente_humano marker | VERIFIED | File exists; `SugestaoIABadge` imported and used (lines 29, 87, 141, 168); `REQUER_REVISAO_COPY = 'Requer revisão humana'`; `pendente_humano` status renders `RevisaoHumanaMarker` |
| `database.types.ts` | Regenerated with 3 new tables + 2 enums + RPC | VERIFIED | `scores_candidato` (line 2619), `respostas_avaliacao` (line 2327), `perguntas` (line 1669), `perguntas_opcao_sjt` (line 1835), `tipo_score` (line 3931), `status_score` (line 3899), `pontuar_sjt` (line 3753) all present |
| `src/router/routes.tsx` | Guarded /candidato/avaliacao/:candidaturaId route | VERIFIED | RoleGuard role="candidato" on all 3 avaliacao routes (lines 200-219) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/router/routes.tsx` | `AvaliacaoContainer` | `RoleGuard role="candidato"` + `avaliacao/:candidaturaId` | WIRED | Route imports all 3 avaliacao components from the barrel; RoleGuard present at lines 202, 210, 218 |
| `SjtMultiplaEscolhaScreen.tsx` | `avaliacaoService.pontuarSjt` | `alert-dialog confirm → RPC` | WIRED | `pontuarSjt` imported and called at line 148 |
| `SjtCasoAbertoScreen.tsx` | `useAutosaveAvaliacao` | `30s debounce + blur flushNow` | WIRED | `useAutosaveAvaliacao` imported and used at lines 47+106; `flushNow` called on blur |
| `SjtCasoAbertoScreen.tsx` | `avaliacaoService.avaliarRedacao` | `alert-dialog confirm → EF` | WIRED | `avaliarRedacao` imported and called at line 123 |
| `avaliar-redacao/index.ts` | `_shared/ai-client.ts callAi + loadPrompt` | `loadPrompt('work_sample_sjt', supabaseAdmin) + callAi` | WIRED | `loadPrompt('work_sample_sjt', ...)` at line 211; `callAi(...)` at line 215 |
| `pontuar_sjt_rpc.sql` | `perguntas_opcao_sjt` | `JOIN by opcao_id for Σ peso` | WIRED | Line 121 `INSERT INTO scores_candidato` preceded by JOIN on `perguntas_opcao_sjt` for weight computation |
| `ScorecardAvaliacao.tsx` | `SugestaoIABadge` | `import { SugestaoIABadge } from triagem` | WIRED | `@/features/triagem/components/SugestaoIABadge` imported at line 29; used on lines 87, 141, 168 |
| `scoresRhService.ts` | `scores_candidato` | `allowlist select` | WIRED | `supabase.from('scores_candidato' as never).select(SCORES_ALLOWLIST)` at lines 107+116 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AvaliacaoContainer.tsx` | `data` / `cards` | `getAvaliacaoContext(candidaturaId)` → `supabase.from('candidaturas').select('id, status, etapa_atual, vaga_id, vaga:vagas(testes_aplicaveis)')` | Yes — DB join on candidaturas+vagas | FLOWING |
| `SjtMultiplaEscolhaScreen.tsx` | `opcoes` | `getOpcoesSjt(perguntaId)` → `supabase.rpc('get_opcoes_sjt', {p_pergunta_id})` → live `perguntas_opcao_sjt` table | Yes — SECURITY DEFINER RPC returns live rows | FLOWING |
| `SjtCasoAbertoScreen.tsx` | `locked` state | `useAutosaveAvaliacao` → `upsertResposta` → `respostas_avaliacao` table RLS | Yes — RLS 42501 signals real etapa advance | FLOWING |
| `ScorecardAvaliacao.tsx` | `scores` | `useScorecardCandidato(candidaturaId)` → `scoresRhService.getScores` → `scores_candidato` table | Yes — RH role-gated SELECT on live scores | FLOWING |
| `pontuar_sjt_rpc` | `v_score`/`v_max` | JOIN on `perguntas_opcao_sjt` by opcao_id | Yes — live weighted rows, SMOKE-1 proved | FLOWING |
| `avaliar-redacao/index.ts` | `composite` | `callAi(WorkSampleScoringSchema)` → `work_sample_sjt` prompt (is_active=true) | Yes — real AI call (human-needed to verify quality); structural plumbing verified by deno tests | FLOWING (AI quality is human_needed) |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 462 vitest tests pass | `npm run test:run` | 462/462 passed, 46/46 files | PASS |
| Relevant Phase-11 tests pass | `npm run test:run -- scoresRhService testesAplicaveisSchema useAutosaveAvaliacao AvaliacaoContainer forbidden-strings` | 23/23 passed across 5 files | PASS |
| Build exits 0 | `npm run build` | exit 0, built in 5.36s | PASS |
| tsc baseline at/below 293 | `npm run lint` | 291 errors (≤293 invariant) | PASS |
| LGPD-04 guard covers migrations | `npm run test:run -- forbidden-strings` | 9/9 GREEN; `supabase/migrations` in SCAN_ROOTS | PASS |
| pontuar_sjt never writes candidaturas | `grep "UPDATE public.candidaturas"` | No match in RPC migration | PASS |
| avaliar-redacao uses work_sample_sjt not sjt_evaluation | `grep "sjt_evaluation" avaliar-redacao/index.ts` | No match | PASS |
| scores_candidato no select('*') in scoresRhService | `grep "select('*')" scoresRhService.ts` | No match | PASS |
| All 12 SUMMARY-claimed commits exist in git | `git log --oneline` | All 12 hashes confirmed (f2d677d through 061120b) | PASS |

---

### Probe Execution

Step 7c: SQL smokes were executed by the orchestrator via Supabase MCP execute_sql during Plan 11-04 (non-autonomous BLOCKING plan). The live results are documented in `11-04-SUMMARY.md`:

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| SMOKE-1 — Σ peso correctness | MCP execute_sql fixture | 12/12 → sucesso | PASS |
| SMOKE-2 — atencao → pendente_humano | MCP execute_sql fixture | 8/12 (1 atencao) → pendente_humano | PASS |
| SMOKE-3 — non-owner → 42501 | MCP execute_sql + set_config jwt | raised forbidden | PASS |
| SMOKE-4 — owner wrong-etapa → 42501 | MCP execute_sql + set_config jwt | raised forbidden | PASS |
| SMOKE-5 — never-auto-reject (RNF-07a) | MCP execute_sql fixture | candidaturas.etapa_atual unchanged | PASS |
| SMOKE-6 — etapa-gate RLS back-lock | Covered by SMOKE-4 + respostas_avaliacao RLS policy | USING+WITH CHECK clause verified | PASS |
| SMOKE-7 — candidato DENY / RH read | MCP execute_sql role simulation | candidato=0 rows, RH=1 row | PASS |
| SMOKE-8 — get_opcoes_sjt answer-key safe | MCP execute_sql | 4 options, no peso/tag exposed | PASS |

Note: SMOKE-8 in the 11-04 summary covers the `get_opcoes_sjt` answer-key safety (which is the closest to the runbook's idempotent UPSERT check, reconfirmed by SMOKE-1 idempotency). The orchestrator executed all live verifications before committing the PROD apply.

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| AVAL-01 | 11-01, 11-03, 11-05 | `vaga.testes_aplicaveis` configures active tests; `/candidato/avaliacao/:id` shows pending + tempo estimado, free order, independent save | SATISFIED | `testesAplicaveisSchema` extended with SJT keys; `AvaliacaoContainer` renders cards from `testes_aplicaveis`; 3 RoleGuard routes in `routes.tsx`; `useAutosaveAvaliacao` + `upsertResposta` save per-teste independently |
| AVAL-02 | 11-01, 11-02, 11-04, 11-05 | SJT MC scoring Σ pesos 4/2/1/0, threshold `<60% OU ≥1 atencao` → revisão humana; persists `scores_candidato tipo=sjt`; never auto-rejects | SATISFIED | `pontuar_sjt` RPC live in PROD; MC screen calls `pontuarSjt` service; SMOKE-1/2/5 confirmed live; `scores_candidato` has `tipo_score` with `sjt` value in database.types.ts |
| AVAL-03 | 11-01, 11-02, 11-04, 11-05 | Case aberto via `avaliar-redacao` BARS (0-25 + citações + red_flags Zod-validated); `<13/25 OU red flag` → revisão humana | SATISFIED | `avaliar-redacao` EF deployed JWT-ON; `WorkSampleScoringSchema` from `_shared/avaliacao-schemas.ts`; `SjtCasoAbertoScreen` submits via `avaliarRedacao`; composite 0-25 mapping with pendente_humano routing in EF |
| AVAL-09 | 11-01, 11-02, 11-03, 11-04 | Autosave 30s + back-lock after etapa advance; RLS + EF prevent tests outside `avaliacao_assincrona` | SATISFIED | `respostas_avaliacao` back-lock RLS (`avaliacao_assincrona` in BOTH USING+WITH CHECK); `pontuar_sjt` raises 42501 on wrong-etapa; `avaliar-redacao` returns 403 on wrong etapa; `useAutosaveAvaliacao` 30s debounce + 42501→locked; SMOKE-4/6 live |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/features/avaliacao/services/avaliacaoService.ts` | 91-105 | `LooseQuery`/`as never` cast for `perguntas`/`respostas_avaliacao` | Info | Documented intentional gap: tables are live in PROD but `database.types.ts` was regenerated only in 11-04 apply wave. The cast is confined and column shapes are still typed locally. Not a stub — behavior is correct at runtime. Deferred cleanup tracked in Phase 16. |
| `src/features/avaliacao/services/scoresRhService.ts` | ~102 | `as never` cast for `scores_candidato` | Info | Same pattern as above. Scores table is live; generated-types gap. Not a stub. |
| `src/features/avaliacao/components/index.ts` | — | Barrel — no issues | Info | 4 exports correctly wired |

No `TBD`, `FIXME`, `XXX`, or `PLACEHOLDER` markers found in any Phase-11 modified files.

---

### Human Verification Required

**4 items requiring human testing (live PROD + visual):**

#### 1. Full candidate assessment flow end-to-end

**Test:** Log in as a candidato with a candidatura at `etapa_atual='avaliacao_assincrona'`. Navigate to `/candidato/avaliacao/:candidaturaId`. Verify: (a) glass shell renders with BeautySmileLogo + sticky navbar, (b) one card per test from `testes_aplicaveis` with neutral status pill and "Tempo estimado: ~N min", (c) "Começar avaliação" CTA navigates to the MC screen, (d) MC screen shows radio-group options (shuffled per session) + soft timer + "Avançar"/"Concluir" flow + confirm dialog, (e) completing MC shows success toast and card transitions to "Concluído", (f) at NO point does the candidate see a score, threshold value, or pass/fail indicator.
**Expected:** Neutral progress-only UX throughout; status labels are exactly "Pendente"/"Concluído"/"Indisponível"; all copy matches 11-UI-SPEC.md §Copywriting Contract.
**Why human:** Requires live candidatura + browser navigation + visual inspection of glass UI components.

#### 2. avaliar-redacao AI scoring quality (BARS composite)

**Test:** Submit a 300-word open-case answer via `SjtCasoAbertoScreen`. After submission, query `scores_candidato` as RH role for that candidatura. Verify: (a) `tipo='sjt'`, `subtipo='caso_aberto'`, (b) `score` is in 0-25 range, (c) `metadata.dimension_scores` contains dimension ratings 1-5, (d) `red_flags` is an array (may be empty), (e) for a clearly inadequate answer `score < 13` → `status='pendente_humano'`.
**Expected:** A real Sonnet AI call (not the mock) produces a valid WorkSampleScoringSchema result; routing to pendente_humano on low scores is correct.
**Why human:** Requires real ANTHROPIC/OPENAI API keys and a live AI call — not reproducible in unit tests.

#### 3. RH scorecard visual

**Test:** Log in as RH. Navigate to the candidatura funil panel where `ScorecardAvaliacao` is mounted with the scored candidatura. Verify: (a) MC breakdown shows per-item (cenario excerpt, tag label, peso), (b) open-case block has BARS per-dimension with score 1-5 and level + reasoning from metadata, (c) composite 0-25 displayed as neutral "x / 25", (d) `SugestaoIABadge` (full variant) appears on each AI-derived panel header, (e) `pendente_humano` rows show "Requer revisão humana" CircleDashed badge, (f) no red/green color tinting on scores. Then log out and log in as candidato: `scores_candidato` must return 0 rows (RLS candidato-DENY confirmed end-to-end).
**Expected:** Structured neutral RH scorecard; AI framed as suggestion; zero auto-decision; candidato fully denied.
**Why human:** Requires visual layout inspection + cross-role RLS validation via real browser session.

#### 4. Autosave + back-lock end-to-end

**Test:** In `SjtCasoAbertoScreen`, start typing in the textarea. Verify autosave affordance "Salvando…" appears, then "Salvo automaticamente" (Check icon #35BFAD) after the debounce flush. Then manually advance the candidatura's `etapa_atual` past `avaliacao_assincrona` in Supabase. Return to the screen and attempt to type — verify the screen shows "Sua etapa avançou. Esta avaliação foi encerrada e suas respostas já estão salvas." + "Voltar ao painel" button (no error toast, no alarming copy).
**Expected:** 30s debounce is observable; back-lock UX is neutral; no data loss between the sessionStorage buffer and the server flush.
**Why human:** Requires real-time browser timing observation + DB state manipulation to trigger the back-lock.

---

### Gaps Summary

No automated blockers found. All 4 ROADMAP Success Criteria are verified in the codebase:
- The candidate UI exists and is wired (container + 2 SJT screens + guarded routes)
- Deterministic scoring (pontuar_sjt) and AI scoring (avaliar-redacao) are live in PROD with the correct authz, RLS, and never-auto-reject invariants proven by SQL smokes
- Autosave (30s debounce + 42501 back-lock) is implemented and tested
- RH scorecard reads scores_candidato via allowlist and reuses SugestaoIABadge

The 4 human_needed items are behavioral/visual verifications that require live PROD with a real candidatura, real AI calls, and browser inspection — they cannot be satisfied with grep or unit tests per the task prompt's explicit guidance. They do not reflect missing implementation.

---

_Verified: 2026-06-09T03:55:00Z_
_Verifier: Claude (gsd-verifier)_
