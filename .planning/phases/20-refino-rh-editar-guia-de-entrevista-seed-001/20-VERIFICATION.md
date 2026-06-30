---
phase: 20-refino-rh-editar-guia-de-entrevista-seed-001
verified: 2026-06-30T12:00:00Z
status: passed
score: 8/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "RH edita o texto e a dimensão de uma pergunta existente no guia de entrevista em PROD, salva, e confirma que a edição persiste na mesma sessão e após recarregar"
    expected: "O guia exibe a pergunta editada com badge Manual ou IA correto; nenhuma outra pergunta desaparece; a chamada à save_entrevista_guia_edits retorna ok:true"
    why_human: "Requer conta RH real, candidatura com guia gerado, navegação no navegador e confirmação visual — não verificável por grep/vitest"
  - test: "RH adiciona uma pergunta manual, remove uma existente, reordena via setas e salva; a regeneração do guia via IA não descarta a pergunta manual"
    expected: "Após regen: pergunta manual ainda aparece (com badge Manual); perguntas de IA trazem badge IA; o guia tem exatamente 1 row em entrevista_guias (sem duplicata)"
    why_human: "Requer round-trip live PROD: RH edita → salva → clica Gerar guia → verifica resultado — loop completo não simulável por testes unitários"
---

# Phase 20: Refino RH — Editar Guia de Entrevista (SEED-001) Verification Report

**Phase Goal:** O RH consegue editar, adicionar, remover e reordenar perguntas no guia de entrevista, com as edições persistidas por um write-path seguro authenticate-THEN-authorize, marcação de origem por pergunta para auditoria, e sem que a regeneração por IA descarte edições manuais silenciosamente.
**Verified:** 2026-06-30T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | save_entrevista_guia_edits RPC exists in PROD with SECURITY DEFINER, role derived from public.usuarios_rh (NOT JWT claim), own-vaga guard, admin bypass, REVOKE PUBLIC + GRANT authenticated, never writes candidaturas (ENTREV-08) | VERIFIED | Migration `20260629190949_entrevista_guia_edits.sql` contains `FROM public.usuarios_rh`, `ON CONFLICT (candidatura_id, tipo)`, `REVOKE ALL ON FUNCTION public.save_entrevista_guia_edits … FROM PUBLIC`, `GRANT EXECUTE … TO authenticated`, no `BEGIN;` wrapper, no candidaturas writes; 6/6 SQL smokes PASS in PROD (incl. claim-liar case) per 20-02-SUMMARY |
| 2 | gerar-guia-entrevista EF preserves origen:'manual' questions on regen; failed regen (guide=null) does NOT clobber them; fresh questions stamped origem:'ia' (ENTREV-08 anti-silent-discard) | VERIFIED | `index.ts` contains `onConflict: "candidatura_id,tipo"`, `manualQs`, `freshIaQs`, merge BEFORE `guide ?? {incompleto}` fallback; Deno test 3/3 GREEN (was RED-by-design until 20-04); EF redeployed v3 to PROD per 20-04-SUMMARY addendum |
| 3 | saveGuiaEdits service function calls supabase.rpc('save_entrevista_guia_edits') with { p_candidatura_id, p_tipo, p_guia: { perguntas } }, maps 42501→FORBIDDEN via mapRpcError, never writes candidaturas (ENTREV-08) | VERIFIED | `entrevistaService.ts:537` grep: `supabase.rpc('save_entrevista_guia_edits'`; 20-03 vitest 63/63 green including anti-tamper and 42501→FORBIDDEN contract tests |
| 4 | normalizeGuia carries origem through; legacy/missing defaults to 'ia'; explicit 'manual' preserved (ENTREV-08 audit read layer) | VERIFIED | `entrevistaService.ts:334`: `origem: q.origem === 'manual' ? 'manual' : 'ia'`; guia-normalize tests cover legacy→'ia', preserve 'manual', garbled→'ia' |
| 5 | ENTREVISTA_GUIA_ALLOWLIST includes updated_at; no select('*') added to guide reads (security — reference_select_star_leaks_pii) | VERIFIED | `entrevistaService.ts:65`: `'id, candidatura_id, tipo, guia, prompt_version, created_at, updated_at'`; no `select('*')` found in service or EF guide reads |
| 6 | useGuiaEntrevista.saveEdits mutation invalidates entrevistaKeys.guia(candidaturaId) on success — same key as read+gerar (ENTREV-06/07 batch-save plumbing) | VERIFIED | `useEntrevistaScorecard.ts:98-106`: `saveEdits = useMutation({ … onSuccess: () => queryClient.invalidateQueries({ queryKey: entrevistaKeys.guia(…) }) })`; hook test asserts this |
| 7 | GuiaEntrevistaPanel exposes edit mode ('Editar guia'), EditablePerguntaRow (inline pergunta/dimensão, up/down reorder, delete-confirm), add-manual (origen:'manual'), IA/Manual origem badges, 'Salvar edições' calling onSaveEdits, static PT-BR error copy keyed by errorCode (ENTREV-06/07/08 UI) | VERIFIED | `GuiaEntrevistaPanel.tsx` 606 lines; grep confirms: `'Editar guia'`, `EditablePerguntaRow`, `OrigemBadge`, `onSaveEdits`, `FORBIDDEN` → permission copy; RTL test 13/13 green covering all behaviors |
| 8 | EntrevistaWorkspace wires saveEdits/saving/saveError/saveErrorCode from useGuiaEntrevista into GuiaEntrevistaPanel; fires success toast (ENTREV-06/07) | VERIFIED | `EntrevistaWorkspace.tsx:75`: `saveEdits` destructured; lines 171-175 pass all four props; line 97 fires `toast.success('Edições do guia salvas.')` on `saveEdits.isSuccess` |
| 9 | Live RH round-trip in PROD: RH edits/adds/removes/reorders a real guide, saves, and regen preserves manual edits (ENTREV-06/07/08 observable end-to-end) | UNCERTAIN (human needed) | Not verifiable programmatically — requires real RH account + candidatura + browser; explicitly deferred to Phase 21 per deferred-items.md and VALIDATION.md |

**Score:** 8/9 truths verified (truth 9 deferred to Phase 21 human UAT)

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Live RH round-trip in PROD (real RH edits a real guide, regen preserves manual questions) | Phase 21 | REQUIREMENTS.md Phase 21 = PROD-01 UATs; VALIDATION.md §Manual-Only: "Phase 21 live UAT"; deferred-items.md documents this explicitly |
| 2 | Top-level guide fields (introduction/closing/scoring_instructions) not preserved across a manual save | Phase 21 or M4 | deferred-items.md §Top-level guide fields — documented as accepted design tradeoff (anti-tamper); fix is RPC-level merge of perguntas into existing guide jsonb |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260629190949_entrevista_guia_edits.sql` | dedup → updated_at → UNIQUE(candidatura_id,tipo) → save_entrevista_guia_edits RPC | VERIFIED | File exists; all key patterns confirmed by grep |
| `supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts` | Deno merge-preserve invariant test | VERIFIED | 256 lines; passes 3/3 after 20-04 EF change |
| `.planning/phases/20-refino-rh-editar-guia-de-entrevista-seed-001/_smoke/save_entrevista_guia_edits.smoke.sql` | SQL smoke script | VERIFIED | Exists per 20-01-SUMMARY; 6/6 cases run against PROD in 20-02 |
| `database.types.ts` (repo root) | regenerated with save_entrevista_guia_edits + entrevista_guias.updated_at | VERIFIED | Line 4554: `save_entrevista_guia_edits` present |
| `src/features/entrevista/services/entrevistaService.ts` | saveGuiaEdits write + origem-aware normalizeGuia + updated_at allowlist + GuiaPergunta.origem | VERIFIED | 753 lines; all patterns confirmed |
| `src/features/entrevista/hooks/useEntrevistaScorecard.ts` | useGuiaEntrevista.saveEdits mutation invalidating guide key | VERIFIED | saveEdits at L98-106 with correct invalidation |
| `src/features/entrevista/components/GuiaEntrevistaPanel.tsx` | edit-mode toggle + EditablePerguntaRow + badges + batch save + AsyncState | VERIFIED | 606 lines (≥120); all must-have patterns confirmed |
| `src/features/entrevista/components/EntrevistaWorkspace.tsx` | wires saveEdits/saving/saveError from hook into panel | VERIFIED | saveEdits destructured at L75; all four props wired at L171-175 |
| `src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx` | RTL test suite | VERIFIED | 208 lines; 13/13 green |
| `supabase/functions/gerar-guia-entrevista/index.ts` | read-merge-upsert preserving manual questions + onConflict | VERIFIED | `onConflict: "candidatura_id,tipo"` present; `manualQs`/`freshIaQs`/`origem` present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `migration/20260629190949_entrevista_guia_edits.sql` | `public.usuarios_rh` | `SELECT role FROM public.usuarios_rh` inside SECURITY DEFINER | WIRED | `FROM public.usuarios_rh` at line 105 |
| `migration/20260629190949_entrevista_guia_edits.sql` | `ON CONFLICT (candidatura_id, tipo)` | UNIQUE constraint pre-created in same migration | WIRED | Pattern confirmed by grep |
| `entrevistaService.ts` | `save_entrevista_guia_edits` RPC | `supabase.rpc('save_entrevista_guia_edits', …)` | WIRED | Line 537 confirmed |
| `useEntrevistaScorecard.ts` | `entrevistaKeys.guia(candidaturaId)` | `invalidateQueries` onSuccess | WIRED | Lines 89 and 102 confirmed |
| `GuiaEntrevistaPanel.tsx` | `useGuiaEntrevista.saveEdits` (via EntrevistaWorkspace props) | `onSaveEdits` callback on 'Salvar edições' | WIRED | `onSaveEdits?.({ tipo, perguntas: draft })` at line 475 |
| `EntrevistaWorkspace.tsx` | `GuiaEntrevistaPanel` | `saveEdits`/`saving`/`saveError`/`saveErrorCode` props | WIRED | Lines 171-175 confirmed |
| `gerar-guia-entrevista/index.ts` | `entrevista_guias` UNIQUE(candidatura_id,tipo) | `.upsert(…, { onConflict: "candidatura_id,tipo" })` | WIRED | Confirmed by grep; EF redeployed v3 to PROD |
| `gerar-guia-entrevista/index.ts` | current guia questions | `filter((q) => q.origem === "manual")` preserved | WIRED | Lines 338-343 confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `GuiaEntrevistaPanel.tsx` | `draft[]` (working perguntas) | Initialized from `perguntasOf(guia)` → `normalizeGuia` → `getGuia` → `supabase.from('entrevista_guias').select(ALLOWLIST)` → PROD DB | Yes — normalizeGuia reads from live DB via allowlist; saveGuiaEdits writes via PROD RPC | FLOWING |
| `gerar-guia-entrevista/index.ts` | `manualQs` | `currentGuia` read from `entrevista_guias.guia` via `select("guia")` allowlist before merge | Yes — reads live PROD row, filters by `origem === "manual"` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| migration contains role-from-usuarios_rh | `grep "FROM public.usuarios_rh" migration` | FOUND at line 105 | PASS |
| migration has no JWT claim role source | `grep -i "auth.jwt.*app_metadata,role" migration` | NOT FOUND | PASS |
| migration has no BEGIN; wrapper | `grep "^BEGIN;" migration` | NOT FOUND | PASS |
| EF has upsert onConflict | `grep "onConflict" gerar-guia-entrevista/index.ts` | FOUND — `onConflict: "candidatura_id,tipo"` | PASS |
| EF has no blind insert | `grep "\.insert(" gerar-guia-entrevista/index.ts` | NOT FOUND for entrevista_guias insert | PASS |
| database.types.ts contains new RPC | `grep "save_entrevista_guia_edits" database.types.ts` | FOUND at line 4554 | PASS |
| entrevista vitest suite | `npm run test:run -- src/features/entrevista` | 63/63 green | PASS |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` files declared or found for this phase. SQL smokes were run live in PROD during 20-02 execution (6/6 PASS including claim-liar case); results recorded in 20-02-SUMMARY.md. These are human-executed PROD probes, not re-runnable by the verifier without PROD credentials.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|----------|
| ENTREV-06 | 20-03, 20-05 | RH edita o texto e a dimensão de perguntas existentes no guia | SATISFIED | `EditablePerguntaRow` with `Input` (pergunta) + `Select` (dimensão); `saveGuiaEdits` → RPC → PROD; RTL test covers inline-edit→save payload |
| ENTREV-07 | 20-03, 20-05 | RH adiciona perguntas manuais, remove e reordena | SATISFIED | `AddPerguntaForm` stamps `origem:'manual'`; delete via `AlertDialog` staged in draft; up/down with boundary `disabled`; all wired to `saveEdits` mutation |
| ENTREV-08 | 20-01, 20-02, 20-03, 20-04, 20-05 | Write-path seguro authenticate-THEN-authorize; origem por pergunta; regen não descarta manual silenciosamente; RNF-07a | SATISFIED | RPC SECURITY DEFINER role-from-usuarios_rh + own-vaga + admin bypass live in PROD (6/6 smokes); `OrigemBadge` IA/Manual per question; EF merge-preserve (Deno 3/3 green) redeployed v3 to PROD; RNF-07a: no candidaturas writes anywhere in the write-path |

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `supabase/functions/gerar-guia-entrevista/index.ts` | No `select('*')` on current-guide read | N/A | Correct — uses `select("guia")` allowlist only |
| `src/features/entrevista/services/entrevistaService.ts` | No `select('*')` in getGuia | N/A | Correct — uses `ENTREVISTA_GUIA_ALLOWLIST` explicit projection |
| (none found) | No TBD/FIXME/XXX/PLACEHOLDER/stub returns in phase files | — | Clean |

No blocker anti-patterns detected. The known `TODO` in `20-VALIDATION.md` (`nyquist_compliant: false`, validation sign-off `pending`) is a planning artifact, not in production code.

### Human Verification Required

#### 1. Live PROD Edit Round-Trip (ENTREV-06/07)

**Test:** Log in as an RH recrutador or administrador. Open a candidatura that has a generated interview guide. Click "Editar guia". Edit the text of an existing question. Add a new manual question (any text + dimensão). Delete one question via the trash icon → confirm. Reorder via the up/down arrows. Click "Salvar edições". Verify: the panel exits edit mode; the edited and new questions appear in view mode with correct IA/Manual badges; no other questions disappeared.

**Expected:** The guide shows all changes correctly. The badge is "Manual" for the newly added question. The deleted question is gone. Reload the page — changes persist.

**Why human:** Requires a real RH account, a candidatura with a live guide in PROD, and browser-based visual verification of the edit UI interaction and persistence.

#### 2. Live PROD Regen Preserves Manual Questions (ENTREV-08)

**Test:** After saving at least one manual question (from test 1), click "Gerar guia" to regenerate the guide via IA. Wait for the generation to complete.

**Expected:** The manual question is still present in the regenerated guide with the "Manual" badge. AI-generated questions may change, but the manually added one remains. There is exactly 1 row in `entrevista_guias` for that candidatura+tipo (no duplicates).

**Why human:** Requires the full live regen loop (EF call to Anthropic → merge-preserve → upsert) in PROD with a real guide — the Deno test proves the invariant deterministically but the live round-trip confirms the deployed EF bundle is the correct version.

---

### Gaps Summary

No blockers found. All code-level must-haves are verified:
- The PROD migration is live (6/6 SQL smokes pass including the JWT-claim-liar case).
- The EF was redeployed (v3, merge-preserve live).
- The service/hook/UI layer is fully wired and tested (63/63 vitest green).
- The deferred top-level-fields limitation is documented in `deferred-items.md` and is an accepted design tradeoff, not a gap.

The only pending item is the live PROD human UAT (edit/regen round-trip), explicitly planned for Phase 21 per `VALIDATION.md §Manual-Only` and `deferred-items.md`.

---

_Verified: 2026-06-30T12:00:00Z_
_Verifier: Claude (gsd-verifier)_


## Phase 21 closure (2026-06-30)
The human_verification items were the deferred live UATs; Phase 21 executed/closed them in PROD (see `.planning/phases/21-production-readiness-uats-live/21-HUMAN-UAT.md`). Status flipped human_needed → passed.
