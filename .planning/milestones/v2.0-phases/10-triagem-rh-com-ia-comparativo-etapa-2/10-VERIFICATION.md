---
phase: 10-triagem-rh-com-ia-comparativo-etapa-2
verified: 2026-06-09T00:40:00Z
status: human_needed
score: 4/4 must-haves verified (gap below fixed post-verification)
overrides_applied: 0
gaps:
  - truth: "Selecting candidatos from different vagas surfaces the EF 400 as the specific pt-BR copy 'Os candidatos selecionados pertencem a vagas diferentes...'"
    status: fixed
    resolution: "FIXED 2026-06-09 (commit fc922cd) — comparativo EF now emits error_code='MIXED_VAGA' (added to ErrorCode union) for the mixed-vaga 400 branch, aligning with triagemService.invokeComparativo; EF redeployed; deno test asserts MIXED_VAGA (5/5 green). Code-review C1 (separate IDOR/PII critical on the same EF — authenticated-but-not-authorized) also fixed (commit ef5f66a) + redeployed; W1-W4 fixed."
    reason: "EF returned error_code='VALIDATION' on mixed-vaga 400, but triagemService.invokeComparativo only checked for error_code==='MIXED_VAGA'. The unit test passed because it mocked error_code:'MIXED_VAGA', shielding the mismatch."
    artifacts:
      - path: "supabase/functions/comparativo-candidatos/index.ts"
        issue: "ErrorCode type is 'UNAUTHORIZED' | 'VALIDATION' | 'SERVER_ERROR' — no 'MIXED_VAGA'. Line 154: returns errorResponse('VALIDATION', 'Os candidatos pertencem a vagas diferentes...')"
      - path: "src/features/triagem/services/triagemService.ts"
        issue: "Line 228: checks data?.error_code === 'MIXED_VAGA' which never matches the EF's actual 'VALIDATION' code; falls through to generic error message"
    missing:
      - "Either: add error_code:'MIXED_VAGA' to EF ErrorCode type and return it instead of 'VALIDATION' for the mixed-vaga branch (preferred — matches the test contract), OR change triagemService to check error_code==='VALIDATION' and message.includes('vagas diferentes')"
human_verification:
  - test: "Submit a real survivor candidatura (status != 'rejeitado', opcao_knockout_id IS NULL) via the candidate flow for an active vaga"
    expected: "Within 30 seconds, an analise_candidato_vaga row appears in PROD with status='sucesso', score_match 0-100, pontos_fortes, gaps, resumo_cv (populated from PDF text or fallback 'cv_nao_extraido' flag). Query: SELECT status, score_match, pontos_fortes, flags FROM analise_candidato_vaga WHERE candidatura_id = '<new_id>';"
    why_human: "SMOKE-1 live dispatch deferred by 10-04 executor — the pg_net trigger fires only from real PROD insertions and the Vault secrets (project_url/edge_invoke_key) are only readable inside the SECURITY DEFINER function context, not via MCP query role."
  - test: "Open /rh/vagas/:id/candidatos in the browser as an RH user after submitting the above candidatura"
    expected: "The candidate appears in the ranked table with a score band chip (verde/amarelo/vermelho based on 70/40 thresholds), top fortes and gaps visible, pagination 20/page working, default sort is score DESC (lowest-score or pending rows at the bottom)."
    why_human: "Visual inspection of the table layout, score band rendering, and ranking order requires a live browser session with real data."
  - test: "Select 2-10 candidates from the panel and click 'Comparar (N)'"
    expected: "The comparativo screen opens, loads within P95 ≤5s, shows candidates as columns with ranking medals 1-N, Score IA band, Pontos fortes, Gaps, Justificativa IA, and the SugestaoIABadge ('Sugestão da IA — decisão é sempre humana') prominently at the top. First attribute column is sticky-left on horizontal scroll."
    why_human: "Real-time EF latency (P95 ≤5s), visual sticky-column behavior on horizontal scroll, and the EF call to Anthropic Claude require a live session with real data and AI keys."
  - test: "Click 'Exportar PDF' on the comparativo screen"
    expected: "A landscape PDF file downloads named 'comparativo-candidatos.pdf' containing a structured table with attribute rows (Ranking IA, Score IA, Pontos fortes, Gaps, Justificativa IA) and candidate columns. Text is selectable (not a screenshot/raster)."
    why_human: "PDF visual render quality and text selectability require human inspection of the downloaded file."
  - test: "Verify the CV PDF text extraction path in the analise EF"
    expected: "For a candidatura with a real CV PDF in the 'curriculos' bucket: resumo_cv contains meaningful extracted text (not a fallback note). For a corrupted or image-only PDF: flags includes 'cv_nao_extraido' and the row still shows status='sucesso' with respostas-only analysis."
    why_human: "Depends on a real PDF in the private storage bucket, Vault secrets readable in SECURITY DEFINER context, and Anthropic API call — cannot be verified without live AI execution."
---

# Phase 10: Triagem RH com IA + Comparativo (Etapa 2) — Verification Report

**Phase Goal:** O RH abre uma vaga e vê candidatos pré-ranqueados por `score_match` gerado na inscrição, e compara até 10 lado-a-lado com ranking IA justificado + export PDF — triando 30 candidatos em minutos, com a IA sempre como recomendação.
**Verified:** 2026-06-09T00:40:00Z
**Status:** human_needed (1 behavioral gap in mixed-vaga error path + 5 live-only items)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Em ≤30s após INSERT de candidatura que passou knock-out, existe um row Zod-validado em `analise_candidato_vaga` com resumo_cv, pontos_fortes, gaps, `score_match` (0-100) e flags | ? HUMAN NEEDED | Trigger + EF fully authored (migration 000002 + analise-candidato-individual/index.ts). SMOKE-1 live dispatch deferred — Vault secrets only readable inside SECURITY DEFINER context. All other infrastructure verified: trigger survivor guard, UPSERT ON CONFLICT, never-absent falhou row, cv_nao_extraido flag path, English→pt-BR mapping. |
| 2 | O painel `/rh/vagas/:id/candidatos` lista candidaturas com score_match, top fortes/gaps, data e etapa, paginação 20/pág, ordenação default score DESC e filtros por etapa+status | ✓ VERIFIED | triagemService.ts allowlist select + analise join (line 118-122), score_match DESC nulls-last order (line 143-147), .range() 20/page (line 151-153). VagaCandidatosRHPage uses useTriagemPanel + TriagemTable. Tests pass (20/20 in triagemService + TriagemTable suites). |
| 3 | RH seleciona 2-10 candidatos e o comparativo retorna ranking + justificativa relativa em P95 ≤5s, persistindo `comparativo_solicitado`; selecionar candidatos de vagas diferentes retorna erro 400 | ✗ PARTIAL | EF 2-10 validation (lines 127-130) and same-vaga guard (lines 151-157) are in place. comparativo_solicitado INSERT with latencia_ms verified (SMOKE-5 PASS in 10-04). **GAP:** EF returns error_code='VALIDATION' for mixed-vaga, but triagemService checks for 'MIXED_VAGA' — the specific pt-BR error copy is never surfaced in production. P95 ≤5s requires live UAT. |
| 4 | A tela de comparativo mostra até 10 colunas (score estável, ranking 1-N, fortes, gaps, justificativa_ia, ação avançar/rejeitar) e permite export PDF | ✓ VERIFIED | ComparativoScreen.tsx (327 lines): candidates-as-columns table, sticky-left labels, SugestaoIABadge (full), Avançar/Rejeitar with alert-dialog confirms, Exportar PDF with jspdf-autotable. Route /rh/vagas/:id/comparativo with role=['rh','administrador'] guard. ComparativoScreen tests 6/6 pass. Build exit 0. |

**Score:** 2/4 truths fully verified + 1 partial (behavioral gap) + 1 human-needed

### Deferred Items

None — all 4 success criteria are expected to be met by Phase 10.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260610000001_analise_tables.sql` | analise_candidato_vaga + comparativo_solicitado + RLS + UNIQUE | ✓ VERIFIED | Both tables, UNIQUE(candidatura_id), RLS candidato DENY + RH/admin SELECT, service_role bypass, no BEGIN/COMMIT wrapper |
| `supabase/migrations/20260610000002_analise_trigger.sql` | trg_candidatura_analise AFTER INSERT, survivor-only, pg_net dispatch | ✓ VERIFIED | SECURITY DEFINER, survivor guard (status='rejeitado' OR opcao_knockout_id IS NOT NULL), net.http_post to analise-candidato-individual via Vault Bearer |
| `supabase/migrations/20260610000003_reprocessar_rpc.sql` | reprocessar_analise SECURITY DEFINER RPC, own-vaga guarded | ✓ VERIFIED | SECURITY DEFINER, app_metadata.role guard, RH own-vaga check, net.http_post re-fire, GRANT EXECUTE to authenticated only, prosecdef=true confirmed in PROD |
| `supabase/functions/_shared/analise-schemas.ts` | CvJobMatch + ComparativeRanking schemas in EF import scope | ✓ VERIFIED | 178 lines, imports from _shared not from docs/ |
| `supabase/functions/analise-candidato-individual/index.ts` | trigger-sink EF (--no-verify-jwt, Vault Bearer, never-absent upsert) | ✓ VERIFIED | 372 lines, ON CONFLICT (candidatura_id), falhou row on ANY catch, cv_nao_extraido flag, English→pt-BR mapping (score_match=match_score, pontos_fortes=strengths, gaps=gaps) |
| `supabase/functions/comparativo-candidatos/index.ts` | RH-invoked EF (JWT-ON, two-client, 2-10 same-vaga, audit) | ✓ VERIFIED | 275 lines, auth.getUser() two-client, 2-10 validation, same-vaga guard, comparativo_solicitado INSERT with latencia_ms |
| `database.types.ts` | regenerated at repo ROOT, exposes new tables | ✓ VERIFIED | 4051 lines, grep -c analise_candidato_vaga returns 2, comparativo_solicitado present |
| `src/features/triagem/services/triagemService.ts` | allowlist paginated read + reprocess | ✓ VERIFIED | 302 lines, no select('*'), no cpf/data_nascimento/email/celular, analise:analise_candidato_vaga join, score_match DESC nulls-last, .range() 20/page, reprocessarAnalise via supabase.rpc |
| `src/features/triagem/hooks/useTriagemPanel.ts` | TanStack Query hook, triagemKeys | ✓ VERIFIED | 56 lines, useQuery with staleTime 5min, retry 2 |
| `src/features/triagem/components/SugestaoIABadge.tsx` | shared RNF-07a guardrail badge | ✓ VERIFIED | 42 lines, exact copy 'Sugestão da IA — decisão é sempre humana', compact + full variants |
| `src/features/triagem/components/TriagemTable.tsx` | dense panel table with bands + compare gating | ✓ VERIFIED | 401 lines, 70/40 thresholds, 2-10 gating with tooltips, Reprocessar análise visible label, SugestaoIABadge rendered |
| `src/components/pages/VagaCandidatosRHPage.tsx` | reworked to use useTriagemPanel + TriagemTable | ✓ VERIFIED | imports useTriagemPanel (line 43), TriagemTable used, onCompare navigates to /rh/vagas/:id/comparativo |
| `src/features/triagem/hooks/useComparativo.ts` | useMutation invoke hook | ✓ VERIFIED | 44 lines, useMutation wrapping invokeComparativo, toast.error on failure |
| `src/features/triagem/pdf/exportComparativo.ts` | jspdf-autotable export | ✓ VERIFIED | 85 lines, imports jspdf + jspdf-autotable, landscape doc, attributes-as-rows/candidates-as-columns, doc.save('comparativo-candidatos.pdf') |
| `src/features/triagem/components/ComparativoScreen.tsx` | candidates-as-columns comparativo + inline actions + export | ✓ VERIFIED | 327 lines, sticky-left first column, SugestaoIABadge, alert-dialog confirms for Avançar/Rejeitar, Exportar PDF with toasts |
| `src/components/pages/ComparativoCandidatosPage.tsx` | RHLayout wrapper + useComparativo + route | ✓ VERIFIED | 169 lines, RHLayout shell, reads ids from router state, displays error?.message |
| `src/router/routes.tsx` | /rh/vagas/:id/comparativo RH-guarded route | ✓ VERIFIED | line 311: path='/rh/vagas/:id/comparativo', RoleGuard role=['rh','administrador'], ComparativoCandidatosPage imported line 54 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `trg_candidatura_analise()` | `analise-candidato-individual` EF | Vault Bearer edge_invoke_key + pg_net | ✓ WIRED | Migration 000002 net.http_post, Vault secrets reused from Phase 9, PROD trigger confirmed installed |
| `analise-candidato-individual/index.ts` | `analise_candidato_vaga` | supabaseAdmin upsert ON CONFLICT (candidatura_id) | ✓ WIRED | Line 242 ON CONFLICT reference in doc-comment; SMOKE-4 upsert idempotency PASS in PROD |
| `comparativo-candidatos/index.ts` | `comparativo_solicitado` | supabaseAdmin insert | ✓ WIRED | Line 217 INSERT confirmed; SMOKE-5 audit row PASS in PROD |
| `triagemService.ts` | `analise_candidato_vaga` | allowlist select join | ✓ WIRED | Line 121: `analise:analise_candidato_vaga (score_match, pontos_fortes, gaps, flags, status)` |
| `VagaCandidatosRHPage.tsx` | `useTriagemPanel` | hook swap (cards removed) | ✓ WIRED | Line 43 import + line 91 usage |
| `useComparativo.ts` | `comparativo-candidatos` EF | supabase.functions.invoke | ✓ WIRED | triagemService.invokeComparativo calls functions.invoke('comparativo-candidatos') |
| `src/router/routes.tsx` | `ComparativoCandidatosPage` | RH-guarded route | ✓ WIRED | Line 311-313, RoleGuard confirmed |
| EF mixed-vaga 400 | pt-BR copy in UI | error_code mapping in triagemService | ✗ BROKEN | EF returns error_code='VALIDATION'; service checks for 'MIXED_VAGA' — mismatch; pt-BR copy never surfaced |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `TriagemTable.tsx` | `candidates` prop | useTriagemPanel → triagemService.listTriagemPanel → Supabase query with analise join | Yes — live DB query with allowlist projection | ✓ FLOWING |
| `analise-candidato-individual/index.ts` | `parsed` (CvJobMatch) | loadPrompt('cv_job_match') → callAi → Anthropic Claude | Yes — live AI inference (HUMAN UAT for SMOKE-1) | ? HUMAN (live AI call) |
| `ComparativoScreen.tsx` | `ranking` | useComparativo → invokeComparativo → comparativo-candidatos EF → loadPrompt('comparative_ranking') → callAi | Yes — live AI inference (P95 ≤5s human UAT) | ? HUMAN (live AI call) |
| `exportComparativo.ts` | `ranking` data passed as prop | ComparativoCandidatosPage → useComparativo result | Yes — flows from EF result | ✓ FLOWING (data path verified; PDF render human-only) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full vitest suite | `npm run test:run` | 42 files / 448 tests PASS | ✓ PASS |
| triagemService, TriagemTable, ComparativoScreen tests | `npm run test:run -- triagemService ComparativoScreen TriagemTable` | 3 files / 20 tests PASS | ✓ PASS |
| LGPD-04 forbidden-strings grep | `npm run test:run -- forbidden-strings` | 1 file / 9 tests PASS | ✓ PASS |
| Build | `npm run build` | exit 0 | ✓ PASS |
| tsc baseline | `npm run lint` | 292 errors (≤293 invariant held) | ✓ PASS |
| analise EF imports from _shared not docs/ | `grep -n "docs/conhecimento" .../analise.../index.ts` | no output | ✓ PASS |
| No PII columns in triagemService select | `grep -E "select\('\*'\)|cpf|data_nascimento" triagemService.ts` | no output | ✓ PASS |
| Migration no BEGIN/COMMIT wrappers | `grep -n "^\s*BEGIN;\|^\s*COMMIT;" ...migrations...` | no matches | ✓ PASS |
| jspdf + jspdf-autotable in package.json | `grep jspdf package.json` | `"jspdf": "^4.2.1"`, `"jspdf-autotable": "^5.0.8"` | ✓ PASS |
| comparative_ranking in prompt-loader SCHEMA_VERSIONS | `grep -c comparative_ranking prompt-loader.ts` | 1 | ✓ PASS |
| /rh/vagas/:id/comparativo route with RH guard | `grep ComparativoCandidatosPage routes.tsx` | line 54 import + line 311 route | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` files exist for this phase. Live PROD smoke-1 dispatch was deferred by the 10-04 executor to human UAT (documented in 10-04-SUMMARY.md). SMOKE-2..5 all PASS per 10-04 SUMMARY live verification.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TRIAGEM-01 | 10-02, 10-03, 10-04 | Trigger pós-knockout chama EF analise-candidato-individual, gera analise_candidato_vaga (score_match, resumo_cv, pontos_fortes, gaps, flags) em ≤30s, Zod-validado | ? HUMAN NEEDED | All infrastructure verified. Live ≤30s SLA requires UAT (SMOKE-1 deferred). |
| TRIAGEM-02 | 10-05 | Painel RH /rh/vagas/:id/candidatos lista candidaturas (score_match, top fortes/gaps, data, etapa), paginação 20/pág, ordenação default score DESC, filtros por etapa+status | ✓ SATISFIED | triagemService allowlist + panel table + page + hook all verified. Tests GREEN. |
| TRIAGEM-03 | 10-03, 10-04, 10-06 | Comparativo on-demand 2-10 candidatos, EF retorna ranking + justificativa relativa (P95 ≤5s), persiste comparativo_solicitado, erro 400 se vagas diferentes | ✗ PARTIAL | EF validation present; SMOKE-5 audit PASS. Mixed-vaga 400 error_code mismatch (VALIDATION vs MIXED_VAGA) means pt-BR copy never surfaces. P95 ≤5s human UAT required. |
| TRIAGEM-04 | 10-06 | Tela comparativo até 10 colunas (score estável, ranking 1-N, fortes, gaps, justificativa_ia, ação avançar/rejeitar) + export PDF | ✓ SATISFIED | ComparativoScreen.tsx, exportComparativo.ts, route all verified. Component tests GREEN. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/comparativo-candidatos/index.ts` | 55 | `ErrorCode` type lacks 'MIXED_VAGA'; returns 'VALIDATION' for mixed-vaga | ⚠️ WARNING | The triagemService mixed-vaga error copy ('Os candidatos selecionados pertencem a vagas diferentes...') is never surfaced in production. Degraded UX — users see generic error. Not a security issue. |
| `src/features/triagem/services/triagemService.ts` | 228 | `data?.error_code === 'MIXED_VAGA'` never matches live EF response | ⚠️ WARNING | Same root cause as above — the specific pt-BR copy path is dead code relative to the real EF contract. |

No TBD/FIXME/XXX debt markers found in phase-10 files. No empty return stubs. No select('*') or PII column leaks.

### Human Verification Required

#### 1. SMOKE-1: Live trigger dispatch ≤30s (TRIAGEM-01 SLA)

**Test:** Submit a real survivor candidatura via the candidate application form for an active published vaga (status != 'rejeitado', opcao_knockout_id IS NULL).
**Expected:** Within 30 seconds, `SELECT status, score_match, pontos_fortes, flags, resumo_cv FROM analise_candidato_vaga WHERE candidatura_id = '<new_id>'` returns one row with status='sucesso', score_match integer 0-100, non-empty pontos_fortes/gaps arrays, and resumo_cv populated (either from PDF text or with flag 'cv_nao_extraido').
**Why human:** The pg_net trigger fires only from real PROD insertions; Vault secrets (project_url/edge_invoke_key) are only readable inside the SECURITY DEFINER function context, not from MCP query role. Actual Anthropic Claude API call required.

#### 2. Panel visual inspection (TRIAGEM-02 score bands + ranking)

**Test:** Open `/rh/vagas/:id/candidatos` in the browser as an RH user after the above candidatura has an analysis.
**Expected:** The candidate appears with a score band chip (verde ≥70 / amarelo 40-69 / vermelho <40), top 2 fortes/gaps visible, default sort is score DESC (pending/failed rows at bottom), pagination 20/page works, etapa and status filters function.
**Why human:** Visual layout, band color rendering, and sort order across real data require a browser session.

#### 3. Comparativo live call P95 ≤5s (TRIAGEM-03)

**Test:** Select 2-10 candidates from the panel and click 'Comparar (N)'.
**Expected:** Comparativo screen loads within P95 ≤5s. Candidates appear as columns with ranking medals 1-N, Score IA band chip, Pontos fortes, Gaps, Justificativa IA, Flags (neutral badges). SugestaoIABadge ('Sugestão da IA — decisão é sempre humana') visible at top. First attribute column sticky-left on horizontal scroll. Avançar and Rejeitar each open alert-dialog confirmation before taking action.
**Why human:** Real-time EF latency and visual sticky-column behavior require a live session with real AI call.

#### 4. PDF export selectable-text quality (TRIAGEM-04)

**Test:** Click 'Exportar PDF' on the comparativo screen.
**Expected:** `comparativo-candidatos.pdf` downloads; landscape orientation; attributes-as-rows/candidates-as-columns table structure; text in the PDF is selectable (not a raster/screenshot image); success toast 'PDF exportado.' appears.
**Why human:** PDF visual quality and text selectability require opening the downloaded file.

#### 5. CV text extraction in analise EF

**Test:** Verify a candidatura with a real CV PDF in the 'curriculos' storage bucket.
**Expected:** `resumo_cv` contains meaningful extracted text from the PDF (not a fallback note). For an image-only PDF, `flags` includes 'cv_nao_extraido' and row still shows status='sucesso' with respostas-only analysis.
**Why human:** Depends on real PDF in private storage bucket and live AI execution.

### Gaps Summary

**One behavioral gap found:** The EF `comparativo-candidatos` returns `error_code: 'VALIDATION'` for the mixed-vaga 400 error, but `triagemService.invokeComparativo` checks for `error_code === 'MIXED_VAGA'` to surface the specific pt-BR user copy. The codes never match, so the production path always falls through to the generic error message. The unit test masks this because it mocks the idealized `error_code: 'MIXED_VAGA'` response.

**Fix is minimal:** change the EF ErrorCode type to add `'MIXED_VAGA'` and return it for the mixed-vaga branch, OR change the service to match on `'VALIDATION'` with message content. The EF change is preferred as it aligns with the test contract. This is a degraded UX issue (wrong error message), not a security or data issue.

**All 5 live/AI behaviors** (trigger dispatch ≤30s, real PDF extraction, live AI score generation, comparativo P95 ≤5s, PDF visual render) are treated as human_needed per the phase instructions — they require real PROD AI calls and visual inspection.

---

_Verified: 2026-06-09T00:40:00Z_
_Verifier: Claude (gsd-verifier)_
