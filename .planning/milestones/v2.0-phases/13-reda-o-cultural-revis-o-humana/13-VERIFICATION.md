---
phase: 13-reda-o-cultural-revis-o-humana
verified: 2026-06-24T17:35:00Z
status: human_needed
score: 3/3 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Full live AI essay scoring end-to-end — a real candidate at etapa_atual='avaliacao_assincrona' writes a 200-500 word essay and submits; the avaliar-redacao-cultural EF runs the real culture_fit_essay prompt (Sonnet 4.6) via callAi and persists one redacoes_candidato row with status_analise='pendente_humano'."
    expected: "EF returns { ok:true } (neutral — candidate never sees score/color). One redacoes_candidato row exists with analise_ia + scores_dimensao + score_ponderado_0_100 + classificacao_cor populated; status_analise='pendente_humano' (always); bloqueio_avanco=true only if classificacao_cor='vermelho'; the candidaturas row is UNCHANGED (RNF-07a). content_hash sentinel does not affect loadPrompt (selects by is_active)."
    why_human: "Requires a live Anthropic API call against the activated prompt + a candidate fixture at the avaliação stage; cannot be exercised by grep/unit tests (the deno tests mock the SDK)."
  - test: "RH human-review UI round-trip — log in as an RH user owning the vaga, open /rh/candidato/:id/redacao, select an essay from the severity-sorted sidebar, adjust the 4 BARS sliders (watch the composite/color live-recompute), write ≥50-char notes, choose a decisão (aprovado/reprovado/duvida) and Salvar."
    expected: "salvar_revisao_redacao RPC records scores_humanos + notas_revisor + decisao_revisor + revisada_*; aprovado/reprovado → status_analise='concluida'; duvida → stays pendente_humano and appears in the 'Dúvidas (gestor)' tab; candidaturas is never written. A candidato/non-owning-RH cannot reach or write this surface."
    why_human: "End-to-end UI + RLS/role behavior with a live RH session and a scored redação row; the live SQL smokes proved the DB layer (SMOKE A-F PASS), but the React panel round-trip + the 1-at-a-time/slider/escalation UX needs a human session."
  - test: "em_progresso positive autosave write end-to-end — a candidate typing in the editor triggers the 30s-local + 30s-DB autosave into redacoes_candidato_em_progresso, and the etapa-gated back-lock denies writes once the candidatura advances past avaliacao_assincrona (neutral 'Sua etapa avançou' state, never an error)."
    expected: "Draft rows appear in redacoes_candidato_em_progresso for the own candidatura during avaliacao_assincrona; after advance, a write is denied (42501) and surfaces as the hook's neutral locked state."
    why_human: "The live smoke validated the ownership idiom (auth.uid() resolves, ownership=true) but not a positive write + the timed autosave + the mid-session back-lock transition, which needs a live candidate session."
---

# Phase 13: Redação Cultural + Revisão Humana — Verification Report

**Phase Goal:** O candidato escreve a redação fit-cultural avaliada por IA em 4 dimensões BARS com sistema de 3 cores, e toda redação passa por revisão humana obrigatória antes de qualquer avanço — a IA jamais decide sozinha (RNF-07a).
**Verified:** 2026-06-24T17:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

This phase is verified goal-backward against the live codebase AND the live PROD database (`isljnozzlvckrgjjbjwp`). SUMMARY claims were treated as unproven; the apply-wave deliverables (3 tables, RPC, seed, prompt activation, EF deployment, regenerated types) were each independently confirmed against PROD via the REST API + the deployed EF endpoint. All three ROADMAP Success Criteria are met at the code level with corroborating live-PROD evidence; the remaining open items are genuine end-to-end UAT (live Anthropic scoring + RH UI round-trip), which set the status to `human_needed`.

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|-----------------------------------|--------|----------|
| 1 | Candidate answers 1 standard BS prompt + 1-2 customizable, hard 200-500 word min/max, autosave 30s local + 30s DB, seed `perguntas_redacao` exists | ✓ VERIFIED | `RedacaoCounter.tsx` MIN/MAX 200/500 drives submit-disabled; `RedacaoEditorScreen.tsx` reuses `useAutosaveAvaliacao({teste:'redacao'})` (30s local+DB+42501 back-lock), multi-question UI; migration 1 seeds 11 rows. **LIVE PROD: `perguntas_redacao` = 11 rows, 1 is_padrao, codes PADRAO_BS,D1,D2,D3,R1,R2,R3,C1,C2,C3,F1** (REST query). |
| 2 | `avaliar-redacao-cultural` (new EF) returns 4 BARS + 3 deterministic caps + 3-color (Zod `EssayScoringV1`), persists `redacoes_candidato`, marks `bloqueio_avanco` if vermelho | ✓ VERIFIED | `essay-schemas.ts` EssayScoringV1Schema (D1-D4 enum, `.length(4)`, red_flag_etico, `npm:zod@3.25.76/v4`); `compute-score.ts` computeScoreAndCors (×20, 3 caps, 3-color) verbatim §8.3; EF `index.ts` always `pendente_humano` + `bloqueio_avanco = cor==='vermelho'`, never writes candidaturas, static npm imports, CR-01 idempotency fix (input_hash in key). **LIVE PROD: EF deployed JWT-on (no-auth/anon→401); `redacoes_candidato` table exists; `culture_fit_essay` prompt is_active=true, system_template 2257 chars (not placeholder), model claude-sonnet-4-6, deployed_at today.** deno 29/29 GREEN. |
| 3 | Every essay → `pendente_humano`; RH UI 1-at-a-time + color sidebar + slider override + notas≥50 + decisao (aprovado/reprovado/duvida) + duvida→gestor; never auto-rejects | ✓ VERIFIED | `RedacaoReviewPanel.tsx` 1-at-a-time 35/65 + SugestaoIABadge on every AI block; `RedacaoSidebar.tsx` severity sort + default filter vermelho+amarelo; `RedacaoOverrideForm.tsx` 4 BARS sliders live-recompute + notas≥50 gate + decisao radio + A/R confirm + duvida-escalates; `revisaoRedacaoService.ts` writes ONLY via `salvar_revisao_redacao` RPC (never direct UPDATE). migration 4 RPC: role+own-vaga guard, notas≥50, duvida stays pendente_humano, never writes candidaturas. **LIVE PROD: RPC exists (P0002 not-found raise, not 404); SMOKE A-F PASS (client INSERT→42501, candidato RPC→insufficient_privilege, notas<50→check_violation, RH happy→concluida + candidaturas UNCHANGED, trigger blocks texto edit, word_count CHECK).** vitest 19/19 GREEN. |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/_shared/essay-schemas.ts` | EssayScoringV1Schema (PRD §8.4 verbatim, /v4) | ✓ VERIFIED | D1-D4 enum, `.length(4)`, red_flag_etico boolean, `import {z} from "npm:zod@3.25.76/v4"` |
| `supabase/functions/avaliar-redacao-cultural/_local/compute-score.ts` | computeScoreAndCors + normalizeForHash | ✓ VERIFIED | ×20 equal weights, red-flag→30, D1≤2→50, tempo<90 flag, 3-color threshold; both exports present |
| `supabase/functions/avaliar-redacao-cultural/index.ts` | new EF (static imports, two-client, always pendente_humano) | ✓ VERIFIED (deployed) | authenticate-then-authorize (IDOR), always pendente_humano, bloqueio only vermelho, never candidaturas, static npm imports, CR-01 fix. JWT-on live (401). |
| `supabase/migrations/...100001_perguntas_redacao.sql` | table + 11-row seed + RLS | ✓ VERIFIED (live) | SELECT-all + admin write (role reconciled to 'administrador'); seed 11 / 1 padrao confirmed in PROD |
| `supabase/migrations/...100002_..._em_progresso.sql` | autosave table + etapa-gated RLS | ✓ VERIFIED (live) | etapa-gated USING (back-lock) + ownership WITH CHECK + RH read; table exists in PROD |
| `supabase/migrations/...100003_redacoes_candidato.sql` | final table + RLS + review trigger | ✓ VERIFIED (live) | candidate own SELECT, client INSERT denied (WITH CHECK false), RH SELECT/UPDATE, `trg_redacao_rh_only_review_fields`, notas≥50 + decisao + word_count CHECKs; table+trigger live |
| `supabase/migrations/...100004_salvar_revisao_redacao_rpc.sql` | SECURITY DEFINER review-write RPC | ✓ VERIFIED (live) | role+own-vaga guard, notas≥50, duvida→pendente_humano, never candidaturas; RPC exists+executes in PROD |
| `src/features/avaliacao/services/redacaoService.ts` | allowlist reads + EF invoke neutral ack | ✓ VERIFIED | REDACAO_CANDIDATO_ALLOWLIST excludes every verdict column; invokes `avaliar-redacao-cultural`; neutral ack |
| `src/features/avaliacao/components/RedacaoEditorScreen.tsx` | candidate essay screen (≥120 lines) | ✓ VERIFIED | 410 lines; counter, cronometro, autosave reuse, neutral post-submit, back-lock state |
| `src/features/avaliacao/components/RedacaoCounter.tsx` | 3-band word counter | ✓ VERIFIED | muted/accent/amber bands, 200ms debounce, drives submit-disabled |
| `src/features/triagem/services/revisaoRedacaoService.ts` | allowlist read + RPC write | ✓ VERIFIED | REDACAO_ALLOWLIST (no `*`), severity sort, gestor duvida queue, write via RPC only |
| `src/features/triagem/components/RedacaoReviewPanel.tsx` | 1-at-a-time 35/65 panel (≥120 lines) | ✓ VERIFIED | 320 lines; sidebar+AnaliseIA+override form, gestor tab, SugestaoIABadge on every AI block |
| `src/features/triagem/components/RedacaoOverrideForm.tsx` | BARS sliders + notas≥50 + decisao (≥100 lines) | ✓ VERIFIED | 354 lines; live recompute mirroring computeScoreAndCors, A/R confirm, J/K/A/R/D shortcuts |
| `database.types.ts` | regenerated with new tables + RPC | ✓ VERIFIED | redacoes_candidato + perguntas_redacao + em_progresso + salvar_revisao_redacao all present; culture_fit_essay in call_type enum |

### Key Link Verification

The SDK `verify.key-links` reported 4 of 9 links unverified; all 4 were manual-checked and are **false negatives** (SDK regex-escaping bug + a DB-side prompt link with no source file). Corrected status below.

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `essay-schemas.ts` | `npm:zod@3.25.76/v4` | static import | ✓ WIRED | Line 35 `import {z} from "npm:zod@3.25.76/v4"` (SDK regex false-negative) |
| `avaliar-redacao-cultural/index.ts` | `essay-schemas.ts` | import EssayScoringV1Schema | ✓ WIRED | Line 51 import + used as callAi `schema` arg |
| `avaliar-redacao-cultural/index.ts` | `npm:@anthropic-ai/sdk@0.102.0` | static npm import | ✓ WIRED | Lines 57-58 static (NOT `.join` — the 4×-recurring bug avoided) |
| `RedacaoEditorScreen.tsx` | `useAutosaveAvaliacao.ts` | teste='redacao' | ✓ WIRED | Line 149 `useAutosaveAvaliacao({teste:'redacao'})` |
| `redacaoService.ts` | `avaliar-redacao-cultural` | functions.invoke | ✓ WIRED | Line 264 `supabase.functions.invoke('avaliar-redacao-cultural', {body})` (SDK regex false-negative) |
| `AvaliacaoContainer.tsx` | `/candidato/redacao/:candidaturaId` | redacao branch navigate | ✓ WIRED | Line 311-312 redacao branch |
| `revisaoRedacaoService.ts` | `salvar_revisao_redacao` | supabase.rpc | ✓ WIRED | Line 248 `supabase.rpc('salvar_revisao_redacao', ...)` (SDK regex false-negative) |
| `RedacaoReviewPanel.tsx` | `SugestaoIABadge.tsx` | every AI block | ✓ WIRED | SugestaoIABadge on Análise heading, each dimension, raciocínio + override form |
| `routes.tsx` | `/rh/candidato/:id/redacao` | RoleGuard ['rh','administrador'] | ✓ WIRED | Line 350-353 role-gated to RH/admin |
| `prompt_versions.culture_fit_essay` | is_active=true | MCP execute_sql | ✓ WIRED (live) | LIVE PROD: is_active=true, system_template 2257 chars (SDK "source file not found" false-negative — it is a DB row, not a file) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| RedacaoReviewPanel | `queue` (review rows) | `listRedacoesRevisao` → `redacoes_candidato` allowlist read joined to candidaturas/candidatos | DB query found (real read; populated by the EF on candidate submit) | ✓ FLOWING (rows depend on a scored submission — exercised live in human UAT #1) |
| RedacaoEditorScreen | `perguntas` | `getRedacaoContext` → `perguntas_redacao` allowlist read | DB query; LIVE PROD seed = 11 rows | ✓ FLOWING |
| RedacaoReviewPanel | `iaScores` (slider defaults) | `selected.scores_dimensao` from the review row | Populated by EF computeScoreAndCors; empty until a real AI scoring runs | ⚠️ verdict columns populate only after the live Anthropic call (human UAT #1) — wiring is correct; data presence is the UAT |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Production build | `npm run build` | built in 5.58s, exit 0 | ✓ PASS |
| Type-check (lint) | `npm run lint` | 291 errors (documented baseline, flat; zero in Phase-13 files) | ✓ PASS (no regression) |
| Phase 13 EF/schema tests | `deno test avaliar-redacao-cultural/ essay-schemas.test.ts` | 29 passed, 0 failed | ✓ PASS |
| Phase 13 React tests | `vitest run` (redacaoService, redacao-contract, RedacaoCounter, RedacaoSidebar, RedacaoOverrideForm) | 19 passed, 0 failed | ✓ PASS |
| EF deployed + JWT-on | `curl -X POST .../avaliar-redacao-cultural` (no-auth + anon-only) | HTTP 401 both | ✓ PASS |
| Live tables exist | REST `redacoes_candidato`, `_em_progresso`, `perguntas_redacao` | HTTP 200 + content-range | ✓ PASS |
| Live RPC exists | REST `rpc/salvar_revisao_redacao` with dummy uuid | P0002 not-found raise (not 404) | ✓ PASS |
| Live seed | REST `perguntas_redacao` | 11 rows, 1 padrao, exact codes | ✓ PASS |
| Live prompt active | REST `prompt_versions?call_type=culture_fit_essay` | is_active=true, sys_len 2257 (not placeholder) | ✓ PASS |

### Probe Execution

No phase-declared `scripts/*/tests/probe-*.sh` probes. The phase's probe equivalent is the 13-VALIDATION.md SQL-smoke runbook (SMOKE A-F + em_progresso ownership), executed live in the 13-04 BLOCKING apply wave and corroborated above by direct REST/EF queries. Not applicable as a separate probe step.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AVAL-05 | 13-01/02/03/04 | Redação v1.1: 1 padrão BS + 1-2 customizáveis, 200-500 hard, autosave 30s local+DB, seed | ✓ SATISFIED | Truth 1 + live seed 11 rows |
| AVAL-06 | 13-01/02/03/04 | avaliar-redacao 4 BARS + 3 caps + 3-color, Zod EssayScoringV1, persists redacoes_candidato + bloqueio if vermelho | ✓ SATISFIED | Truth 2 + EF live + prompt active |
| AVAL-07 | 13-01/02/04/05 | Revisão humana sempre obrigatória (pendente_humano), UI 1-por-vez, sidebar cor, sliders, notas≥50, decisao, duvida→gestor | ✓ SATISFIED | Truth 3 + RPC live + SMOKE A-F |

No orphaned requirements: REQUIREMENTS.md maps exactly AVAL-05/06/07 to Phase 13, all claimed by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | TBD/FIXME/XXX/HACK/PLACEHOLDER scan across all 20 Phase-13 source files | — | Clean — zero debt markers |

The 5 grep hits for `select('*')` in the Phase-13 services are all in COMMENTS asserting "NEVER select('*')" — there are zero actual star projections (verdict-leak invariant holds, [[reference_select_star_leaks_pii]]).

### Human Verification Required

3 items require human end-to-end testing (see frontmatter for full detail):

1. **Live AI essay scoring end-to-end** — real candidate at avaliação stage + real Anthropic call against the activated `culture_fit_essay` prompt; confirm one `redacoes_candidato` row, status always `pendente_humano`, `bloqueio_avanco` only when vermelho, `candidaturas` unchanged.
2. **RH human-review UI round-trip** — RH session opens the review panel, sliders live-recompute, notas≥50 + decisão saved via the RPC, duvida escalates to the gestor tab; candidato/non-owning-RH cannot reach or write.
3. **em_progresso positive autosave + mid-session back-lock** — timed 30s autosave writes drafts; advancing the etapa flips to the neutral locked state.

### Deferred (non-blocking — recorded honestly, NOT resolved)

These are documented deviations that do not block the phase goal at the code level:

- **WR-01 — RH SELECT on `redacoes_candidato` is role-only, not vaga-scoped.** Consistent with the M2 norm (analise_candidato_vaga / devolutivas_candidato / scores_candidato are all role-only). Vaga-scoping RH reads is a milestone-wide LGPD decision deferred to Phase 15/16. Migration + PROD intentionally unchanged.
- **WR-04 — `bloqueio_avanco` is not in the review-fields trigger's forbidden set (RH-mutable in principle).** A product judgment deferred per the executor's note. The only authorized write path (`salvar_revisao_redacao` RPC) never touches `bloqueio_avanco`, so there is no live exposure through the application; this is a defense-in-depth gap, not an active vulnerability.
- **content_hash reconcile** — the live `culture_fit_essay` row's `content_hash` is the seed sentinel (the immutability trigger locked template/hash after `deployed_at`). Runtime-irrelevant: `loadPrompt` selects by `is_active`, not hash. The canonical-sync reconcile is deferred (Phase-11 db-push drift precedent).
- **Migration version-row drift** — MCP `apply_migration` records timestamp-version rows (visible as 4 remote-only rows on 2026-06-24) instead of the filename versions (visible as 4 local-only `20260623100001-100004`); `db push --linked` will show drift. Cosmetic, documented; the tables/trigger/RPC/seed are confirmed live regardless.

### Gaps Summary

No gaps. All three ROADMAP Success Criteria are met at the code level, every required artifact exists and is substantive + wired + (for the apply wave) live in PROD, every key link is wired (the SDK's 4 "unverified" links were false negatives, manually confirmed), and all behavioral spot-checks pass (build green, lint 291 flat, deno 29/29, vitest 19/19, EF JWT-on 401, live tables/RPC/seed/prompt confirmed). The CR-01 critical from 13-REVIEW (stale-verdict idempotency) is FIXED in the live EF (`input_hash` in the idempotency key) and the EF is redeployed; WR-02/03/05/06 fixes are present in the code. Status is `human_needed` solely because the live AI scoring and the RH UI round-trip are genuine end-to-end UAT items that grep/unit tests cannot exercise — the DB and wiring layers underneath them are already proven by the live SQL smokes and the direct PROD queries above.

---

_Verified: 2026-06-24T17:35:00Z_
_Verifier: Claude (gsd-verifier)_
