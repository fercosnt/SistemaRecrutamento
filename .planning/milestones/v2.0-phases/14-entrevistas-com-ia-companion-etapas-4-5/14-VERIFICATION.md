---
phase: 14-entrevistas-com-ia-companion-etapas-4-5
verified: 2026-06-25T01:15:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
deferred:
  - truth: "CC0 cognitive item bank content is seeded in cognitivo_itens"
    addressed_in: "tracked in .planning/todos/pending/cc0-cognitive-item-bank-sourcing.md"
    evidence: "Intentional deferral at 14-02 checkpoint:human-verify gate by user decision; pontuar_cognitivo now RAISES no_data_found when v_n_total=0 (CR-01 guard) instead of silently persisting misleading na_media; the code path is complete"
human_verification:
  - test: "Live interview guide generation — RH navigates to /rh/candidato/:id/entrevista, clicks 'Gerar guia (entrevista online)', sees 5-7 STAR/PEI questions with BARS 1-5 anchors"
    expected: "Guide renders in the Guia de entrevista tab with SugestaoIABadge on the header; each question shows its dimensão; weak-dim hint 'Cobre {dimensão} (score atual {n} < 3)' appears for at least one question when the prior SJT/Etapa-3 scorecards have a dim below 3"
    why_human: "Requires a live candidatura with prior Etapa-3 scores, real prompt_versions.is_active=true, deployed EF — can't verify round-trip with grep"
  - test: "Live transcript analysis — RH pastes a ≥200-char transcript, clicks 'Analisar transcrição', observes BARS competency scores"
    expected: "TranscricaoReviewPanel renders each competency with score/5 + SugestaoIABadge variant=compact; if any competency fires the language/accent flag (score<3, regional_markers_ignored=false), the 'Avançar etapa' CTA is disabled and 'Confirmar revisão humana' is the only enabled path"
    why_human: "End-to-end requires the EF, the derive-flags server derivation, and the UI flag-block all working together live; grep confirms the individual pieces but not the round-trip"
  - test: "Confirmar revisão humana unblocks avancar_etapa — after RH clicks 'Confirmar revisão humana', the 'Avançar etapa' CTA becomes enabled and the server avancar_etapa() guard releases"
    expected: "confirmar_revisao_entrevista RPC sets revisao_confirmada_em; the entrevista_analises row reflects it; avancar_etapa advances past entrevista_online without raising check_violation"
    why_human: "Server-state unblock through the DEFINER RPC then trigger; the smoke test proved it but with a fixture, not the live UI flow"
  - test: "Cognitive band card display — when vaga.aplica_cognitivo=true and a candidate completes the prova, RH sees CognitivoBandCard with the CONTEXTUAL badge (no red/green)"
    expected: "Banda descriptive label shown (e.g. 'Banda 3 de 5 — na média'); tooltip says 'Contextual — nunca elimina sozinho. Decisão sempre humana.'; no red/green tint; the 'Registrar no log de auditoria' button requires expanded justification before writing bias_audit_log"
    why_human: "Requires a live candidatura with aplica_cognitivo=true AND a seeded item bank (currently empty — CC0 deferral). Can only be fully tested once items are sourced"
---

# Phase 14: Entrevistas com IA Companion — Verification Report

**Phase Goal:** O gestor entra na entrevista preparado — com dashboard do candidato 24h antes e guia STAR/PEI gerado por IA priorizando dimensões fracas — e a transcrição é analisada contra rubric BARS, com raciocínio lógico opt-in marcado como contextual.
**Verified:** 2026-06-25T01:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification
**Plans verified:** 14-01 through 14-07 (including gap-closure plan 14-07)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | RH gestor workspace at /rh/candidato/:id/entrevista exists (Painel do candidato default + 4 tabs) | VERIFIED | `routes.tsx:382` mounts `EntrevistaWorkspace` in `RoleGuard role=['rh','administrador']`; `EntrevistaWorkspace.tsx:65` `useState<TabValue>('painel')` — default tab is Painel |
| 2 | 24h antes dashboard marker computes client-side (amber <24h / neutral >=24h, America/Sao_Paulo pinned) | VERIFIED | `EntrevistaDashboard.tsx` exports `compute24hMarker` with explicit `timeZone:'America/Sao_Paulo'` via `Intl.DateTimeFormat`; amber logic at line 105 |
| 3 | STAR/PEI guide EF (gerar-guia-entrevista) is deployed JWT-on; body schema .strict() rejects injected score fields; weak-dim coverage post-validated | VERIFIED | EF `index.ts` uses STATIC `npm:@anthropic-ai/sdk@0.102.0` import (no .join bug); `entrevista-schemas.ts` has 5 `.strict()` calls, zero score/band tokens in live code; `checkWeakDimCoverage` called at `gerar-guia/index.ts:290,301`; VALIDATION.md smoke 7 confirms anon→401 JWT-on |
| 4 | Language/accent flag block is server-authoritative inside avancar_etapa(); server smoke PASS; client CTA disabled | VERIFIED | `migration 20260624000004` RAISES `check_violation` when `bloqueio_avanco=true AND revisao_confirmada_em IS NULL` past entrevista_online; `TranscricaoReviewPanel.tsx:107-108` disables CTA on `flagFired`; VALIDATION.md smoke 1 PASS |
| 5 | "Confirmar revisão humana" routes through confirmar_revisao_entrevista SECURITY DEFINER RPC (CR-03); readback assertion; gap-closure migration APPLIED to PROD | VERIFIED | `entrevistaService.ts:565` calls `supabase.rpc('confirmar_revisao_entrevista', {p_analise_id})` with readback assertion at line 576-583; migration `20260625000001` defines the RPC as SECURITY DEFINER with role+ownership guard; `database.types.ts:4325` has `confirmar_revisao_entrevista` (proves PROD apply) |
| 6 | Transcript competencies reach the RH UI — CR-04 key normalization (competency → competencia) in the service read layer | VERIFIED | `entrevistaService.ts:285-295` `normalizeCompetencia` function maps `c.competencia ?? c.competency`; `EntrevistaScorecardInline` and `TranscricaoReviewPanel` read `competencia`; 20/20 entrevista tests pass |
| 7 | Cognitive prova opt-in (vaga.aplica_cognitivo, default false); candidate posts raw picks only to pontuar_cognitivo SECURITY DEFINER; neutral acknowledgment; proctoring light (no webcam); empty-bank guard RAISES instead of silent na_media | VERIFIED | `ProvaCognitivaScreen.tsx:112` gates on `ctx?.aplica_cognitivo === true`; `cognitivoService.ts` COGNITIVO_ALLOWLIST excludes gabarito; route at `routes.tsx:271` in `RoleGuard role="candidato"`; migration `20260625000001:132-133` RAISES `no_data_found` when `v_n_total=0`; 12/12 prova-cognitiva tests pass; `useProctoring.ts` has no getUserMedia/getDisplayMedia |

**Score:** 7/7 truths verified

### Deferred Items

Items not yet met but explicitly addressed via a formal deferral tracker.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | CC0 cognitive item bank content seeded in cognitivo_itens (live ENTREV-05 prova with real items) | `.planning/todos/pending/cc0-cognitive-item-bank-sourcing.md` | User decision at Plan 14-02 checkpoint:human-verify gate; item-bank.ts has `SEED_ITENS_RACIOCINIO = []` with `[PENDING CC0 DOWNLOAD]` note; CR-01 guard in gap-closure migration refuses to score when bank is empty |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/_shared/entrevista-schemas.ts` | Anti-tamper .strict() body schemas (no score fields) | VERIFIED | 5 `.strict()` calls; GerarGuiaBodySchema + AvaliarTranscricaoBodySchema export confirmed; zero score/band tokens in live code |
| `supabase/functions/_shared/cognitivo/scoring.ts` | Deterministic CTT-soma scorer + 5-faixa banding, server-only key | VERIFIED | `scoreRaciocinio` exported; 6 deno tests pass (10-profile golden + CTT soma + banda coverage) |
| `supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts` | Server-side language/accent flag derivation (no LLM); WR-06 null-guard | VERIFIED | `deriveLanguageAccentFlag` with `bf = c.bias_flags ?? {}`; 6 deno tests GREEN |
| `supabase/functions/gerar-guia-entrevista/index.ts` | STAR/PEI guide EF — static imports, RH-authorize, weak-dim post-validation | VERIFIED | Static `npm:@anthropic-ai/sdk` import; `usuarios_rh` role lookup at line 154; `checkWeakDimCoverage` called |
| `supabase/functions/avaliar-transcricao-entrevista/index.ts` | Transcript BARS EF — static imports, callAi, derived flag, never-absent persist | VERIFIED | Static imports; `deriveLanguageAccentFlag` imported and called at line 255; `status_analise='pendente_humano'` is the only written status |
| `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql` | entrevista_guias + entrevista_analises + cognitivo_itens + cognitivo_respostas + candidate-DENY RLS | VERIFIED | ENABLE ROW LEVEL SECURITY present; candidate-DENY SELECT on guias/analises |
| `supabase/migrations/20260624000003_pontuar_cognitivo_rpc.sql` | Deterministic cognitive scoring RPC (never auto-reject) | VERIFIED | SECURITY DEFINER; tipo='cognitivo', subtipo='raciocinio_logico'; REVOKE/GRANT present |
| `supabase/migrations/20260624000004_avancar_etapa_flag_guard.sql` | avancar_etapa() flag-block guard | VERIFIED | `bloqueio_avanco=true AND revisao_confirmada_em IS NULL` RAISE at lines 74-79 |
| `supabase/migrations/20260625000001_phase14_gap_closure.sql` | CR-01/02/03 + WR-04 gap closure (empty-bank guard + cognitivo_respostas persist + confirmar RPC + vaga-scoped SELECT RLS) | VERIFIED | File exists; `v_n_total=0` guard at line 132-133; `INSERT INTO public.cognitivo_respostas` at line 156; `confirmar_revisao_entrevista` SECURITY DEFINER at line 208; 3 DROP POLICY IF EXISTS + CREATE POLICY at lines 279-314 |
| `src/features/entrevista/services/entrevistaService.ts` | Allowlist reads + RPC writes + competencia normalization (CR-04) | VERIFIED | `ENTREVISTA_ALLOWLIST` const exported; `normalizeCompetencia` at line 285; `rpc('salvar_avaliacao_entrevista')` at line 410; `rpc('confirmar_revisao_entrevista')` at line 565; zero `select('*')` |
| `src/features/entrevista/components/EntrevistaWorkspace.tsx` | RHLayout tabs host, default tab Painel do candidato | VERIFIED | `useState<TabValue>('painel')` at line 65; RHLayout import; 4 tabs defined |
| `src/features/entrevista/components/TranscricaoReviewPanel.tsx` | Transcript paste → analyze → flag-block on avancar_etapa | VERIFIED | `flagFired` computed from `bloqueio_avanco`; "Confirmar revisão humana" is the only enabled CTA when flag fires; `SugestaoIABadge` on each BARS dimension |
| `src/features/entrevista/components/CognitivoBandCard.tsx` | RH-only CONTEXTUAL cognitive band + bias_audit_log reject gate | VERIFIED | "Contextual · não-eliminatório" badge at line 114; `bias_audit_log` write in reject handler; tooltip at line 118 |
| `src/features/entrevista/components/EntrevistaDashboard.tsx` | 24h marker (amber/neutral) + America/Sao_Paulo timezone pin | VERIFIED | `compute24hMarker` with `Intl.DateTimeFormat` + `timeZone:'America/Sao_Paulo'`; amber at <24h |
| `src/features/avaliacao-cognitiva/services/cognitivoService.ts` | pontuar_cognitivo RPC (raw picks only) + items allowlist (no gabarito) | VERIFIED | `rpc('pontuar_cognitivo')` at line 215; allowlist excludes gabarito column; zero `select('*')` |
| `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` | Opt-in gate (aplica_cognitivo) + neutral acknowledgment + no score shown | VERIFIED | Gates on `ctx?.aplica_cognitivo === true` at line 112; COPY.postSubmit = "Prova registrada. Avisaremos..." — no score/band |
| `src/features/avaliacao-cognitiva/hooks/useProctoring.ts` | blur/visibilitychange listeners + paste-block (no webcam) | VERIFIED | blur + visibilitychange + paste-block events; no getUserMedia/getDisplayMedia reference |
| `database.types.ts` | Regenerated with Phase-14 tables/columns/RPCs | VERIFIED | 10 matches for `entrevista_guias`, `cognitivo_itens`, `aplica_cognitivo`, `pontuar_cognitivo`, `salvar_avaliacao_entrevista`, `confirmar_revisao_entrevista` |
| `src/router/routes.tsx` | /rh/candidato/:id/entrevista (RoleGuard rh/admin) + /candidato/prova-cognitiva/:candidaturaId (RoleGuard candidato) | VERIFIED | Both routes present at lines 271 and 382; correct RoleGuard role on each |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `entrevistaService.ts` | `salvar_avaliacao_entrevista` | `supabase.rpc` | WIRED | Line 410: `rpc('salvar_avaliacao_entrevista', {p_candidatura_id, p_scores_humanos, p_notas})` |
| `entrevistaService.ts` | `confirmar_revisao_entrevista` | `supabase.rpc` | WIRED | Line 565: `rpc('confirmar_revisao_entrevista', {p_analise_id})` with readback assertion |
| `routes.tsx` | `EntrevistaWorkspace` | `RoleGuard role=['rh','administrador']` | WIRED | Line 382-385: path `/rh/candidato/:id/entrevista` → RoleGuard → EntrevistaWorkspace |
| `routes.tsx` | `ProvaCognitivaScreen` | `RoleGuard role="candidato"` | WIRED | Line 271-274: path `/candidato/prova-cognitiva/:candidaturaId` → RoleGuard → ProvaCognitivaScreen |
| `avaliar-transcricao-entrevista/index.ts` | `derive-flags.ts` | `deriveLanguageAccentFlag` | WIRED | Line 53 import; line 255 call; sets `bloqueio_avanco = derived.flag` |
| `migration 20260624000004` | `entrevista_analises.revisao_confirmada_em` | `bloqueio_avanco + revisao_confirmada_em IS NULL` | WIRED | Lines 74-79: guard reads both columns inside avancar_etapa() BEFORE-UPDATE trigger |
| `cognitivoService.ts` | `pontuar_cognitivo` | `supabase.rpc (raw picks only)` | WIRED | Line 215: `rpc('pontuar_cognitivo', {p_candidatura_id, p_respostas, p_shuffle_seed, ...})` |
| `gerar-guia-entrevista/index.ts` | `checkWeakDimCoverage` | `_local/weak-dim-coverage.ts` | WIRED | Import at line 53; called at lines 290, 301 (1st pass + re-prompt) |
| `migration 20260625000001` | `cognitivo_respostas` | `INSERT inside pontuar_cognitivo` | WIRED | Line 156: `INSERT INTO public.cognitivo_respostas` inside the DEFINER RPC body |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `EntrevistaDashboard.tsx` | `contexto.entrevista_agendada_em` | `getEntrevistaContexto → candidaturas JOIN vagas` | Yes — DB query with explicit column projection | FLOWING |
| `TranscricaoReviewPanel.tsx` | `analise.competencias[]` | `getAnalise → entrevista_analises + normalizeCompetencia` | Yes — DB read + CR-04 normalization feeding real EF-written data | FLOWING |
| `GuiaEntrevistaPanel.tsx` | `guia.perguntas[]` | `getGuia → entrevista_guias` | Yes — DB read of EF-persisted guia jsonb | FLOWING |
| `CognitivoBandCard.tsx` | `score.metadata.banda` | `getScores(tipo='cognitivo')` | Yes — DB read of RPC-persisted scores_candidato; empty when item bank empty (no items in PROD) | FLOWING (with noted live item-bank deferral) |
| `ProvaCognitivaScreen.tsx` | `perguntas[]` | `listItens → cognitivo_itens allowlist (no gabarito)` | Zero rows in PROD (CC0 deferral); code path complete, shows "não está disponível" state when empty | STATIC (by design — deferred content) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| entrevista-allowlist tests | `npm run test:run -- entrevista` | 20/20 passed | PASS |
| entrevista-contract tests | included in above | 16/16 passed | PASS |
| prova-cognitiva tests | `npm run test:run -- prova-cognitiva` | 12/12 passed | PASS |
| Cognitive scoring golden battery | `deno test scoring.test.ts` | 6/6 passed (10-profile) | PASS |
| derive-flags truth table | `deno test derive-flags.test.ts` | 6/6 passed | PASS |
| weak-dim-coverage tests | `deno test weak-dim-coverage.test.ts` | 6/6 passed | PASS |
| Production build | `npm run build` | exit 0, no errors | PASS |
| tsc baseline | `npm run lint \| grep "error TS" \| wc -l` | 291 (unchanged pre-existing baseline) | PASS |
| Full vitest suite | `npm run test:run` | 543 passed, 1 suite failed (essay-schemas.test.ts — pre-existing Phase-13 Deno test, not a Phase-14 file) | PASS (pre-existing failure excluded per verification context) |

### Probe Execution

No probe scripts defined for this phase (`scripts/*/tests/probe-*.sh` not found). Live SQL smokes documented in `14-VALIDATION.md`.

| Smoke | Description | Result |
|-------|-------------|--------|
| 1 | Language/accent flag BLOCKS avancar_etapa; released after revisao_confirmada_em set | PASS (live PROD) |
| 2 | pontuar_cognitivo non-owner → 42501 | PASS (live PROD) |
| 3 | Cognitive scoring NEVER auto-rejects (candidaturas unchanged) | PASS (live PROD) |
| 4 | aplica_cognitivo=false opt-in gate (no cognitive invite) | PASS (live PROD) |
| 5 | salvar_avaliacao_entrevista non-owner RH → 42501 | PASS (live PROD) |
| 6 | Candidate-DENY RLS on entrevista_analises (0 rows as candidato) | PASS (live PROD) |
| 7 | Both EFs JWT-on (anon curl → 401) | PASS (live PROD) |

Note: These 7 smokes were run during Plan 14-04. The gap-closure migration (14-07) adds confirmar_revisao_entrevista + vaga-scoped SELECT RLS — the confirmar smoke is covered by the client round-trip human UAT item above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ENTREV-01 | 14-01, 14-03, 14-05 | gerar-guia-entrevista EF (tipo online) returns 5-7 STAR/PEI questions, weak-dim priority | SATISFIED | EF deployed JWT-on; `checkWeakDimCoverage` post-validates coverage; `GuiaEntrevistaPanel` online CTA wired to `gerarGuia` |
| ENTREV-02 | 14-03, 14-05 | RH workspace at /rh/candidato/:id/entrevista — dashboard + guide + inline scorecard; 24h notification (manual V1) | SATISFIED | Route exists with RoleGuard; EntrevistaWorkspace 4-tab shell; EntrevistaDashboard 24h marker; EntrevistaScorecardInline via salvar_avaliacao_entrevista RPC |
| ENTREV-03 | 14-01, 14-03, 14-05, 14-07 | Transcript analysis EF → BARS scores + flags; flag linguagem/sotaque blocks avancar_etapa; human confirm required | SATISFIED | avaliar-transcricao-entrevista deployed; deriveLanguageAccentFlag server-authoritative; migration 04 blocks advance; CR-04 normalization feeds RH UI; confirmar_revisao_entrevista RPC (CR-03) |
| ENTREV-04 | 14-03, 14-05 | gerar-guia-entrevista (tipo presencial) focuses on online gaps (dims <4) | SATISFIED | EF branches on `body.tipo === 'presencial'`; GuiaEntrevistaPanel presencial CTA shows "Foco nos gaps da entrevista online (dimensões com score < 4)" |
| ENTREV-05 | 14-01, 14-02, 14-03, 14-05, 14-06, 14-07 | Cognitive reasoning prova opt-in; 5 qualitative faixas CONTEXTUAL; reject-by-cognitive forces bias_audit_log; never auto-rejects | SATISFIED (live code complete; CC0 content deferred) | ProvaCognitivaScreen opt-in gate; CognitivoBandCard CONTEXTUAL badge; bias_audit_log write; pontuar_cognitivo never writes candidaturas; CR-01 empty-bank guard; CC0 content deferral formally tracked |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/_shared/cognitivo/item-bank.ts` | 106 | `SEED_ITENS_RACIOCINIO = []` with `[PENDING CC0 DOWNLOAD]` | INFO | Intentional and formally deferred (cc0-cognitive-item-bank-sourcing.md); CR-01 empty-bank guard in the RPC prevents misleading scores |
| `src/features/entrevista/services/entrevistaService.ts` | 565 | `as never` cast on `rpc('confirmar_revisao_entrevista', ...)` | INFO | Per project pattern for authored-but-at-types-regen-time-absent RPCs; documented in 14-07 SUMMARY as a drop-on-types-regen item; database.types.ts:4325 now has the type so the cast is stale but harmless |
| Pre-existing: `supabase/functions/_shared/__tests__/essay-schemas.test.ts` | — | Phase-13 Deno test imported by Vitest — fails with `https:` URL scheme error | INFO | Pre-existing (commit 3af37d8, Phase 13); not a Phase-14 file; excluded from this phase's scope per deferred-items.md |

No `TBD`, `FIXME`, or `XXX` debt markers found in Phase-14 files.

### Human Verification Required

#### 1. Live interview guide generation round-trip

**Test:** Sign in as an RH user who owns a vaga with a candidatura that has completed Etapa 3 (SJT/Big Five scores loaded). Navigate to `/rh/candidato/:id/entrevista`. Click "Gerar guia (entrevista online)".
**Expected:** The Guia de entrevista tab renders 5-7 STAR/PEI questions, each with a `dimensão` label and BARS 1-5 anchors. At least one question shows the weak-dim hint "Cobre {dimensão} (score atual {n} < 3)" for a dimension with a prior SJT/Big Five score below 3. The panel header carries SugestaoIABadge "Sugestão da IA — decisão é sempre humana".
**Why human:** Requires a live candidatura with prior Etapa-3 scores, the deployed EF, and `prompt_versions.interview_guide.is_active=true` working end-to-end.

#### 2. Live transcript analysis + flag-block CTA gate

**Test:** In the same workspace, navigate to "Análise da transcrição". Paste a ≥200-character mock transcript. Click "Analisar transcrição".
**Expected:** The panel renders each BARS competency with a score/5 and SugestaoIABadge variant="compact". If the LLM returns a competency with score<3 and `regional_markers_ignored=false`, the "Avançar etapa" CTA is disabled and the destructive-tinted flag block appears. Clicking "Confirmar revisão humana" calls the `confirmar_revisao_entrevista` RPC, sets `revisao_confirmada_em`, and enables the advance.
**Why human:** The flag-block CTA disable depends on the LLM output and the `deriveLanguageAccentFlag` derivation working end-to-end live; grep confirms each piece but not the integrated round-trip.

#### 3. Confirmar revisão humana unblocks server avancar_etapa()

**Test:** After "Confirmar revisão humana" succeeds (previous step), attempt to advance the candidatura's etapa past `entrevista_online`.
**Expected:** The advance succeeds without raising `check_violation`. The server `avancar_etapa()` guard recognizes `revisao_confirmada_em IS NOT NULL` and lifts the block.
**Why human:** The server transition requires a real JWT-authenticated supabase call through the RPC, then a separate candidatura update — can't simulate both in a unit test.

#### 4. Cognitive band card display (requires CC0 item bank content)

**Test:** Once the CC0 item bank is seeded (pending cc0-cognitive-item-bank-sourcing.md), sign in as a candidato with a candidatura where `vaga.aplica_cognitivo=true` and etapa_atual=`entrevista_online`. Complete the cognitive prova. Then as RH, navigate to `/rh/candidato/:id/entrevista` and observe CognitivoBandCard.
**Expected:** The card shows the qualitative banda label (e.g. "Banda 3 de 5 — na média"), tooltip "Contextual — nunca elimina sozinho. Decisão sempre humana.", no red/green tint. Clicking "Registrar no log de auditoria" requires an expanded justification textarea before writing the `bias_audit_log` row.
**Why human:** Requires the CC0 item bank to be seeded (currently deferred) AND a full candidate prova round-trip live.

### Gaps Summary

No gaps blocking goal achievement. All 7 must-have truths are VERIFIED in the codebase. The only open item is the CC0 cognitive item bank content (formally deferred with a tracker). Human verification is required for the 4 live round-trip behaviors above.

---

_Verified: 2026-06-25T01:15:00Z_
_Verifier: Claude (gsd-verifier)_
