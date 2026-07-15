---
phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil
verified: 2026-07-15T03:13:31Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Kanban card ⋯ menu: Avançar/Retroceder/Rejeitar on a real logged-in RH session"
    expected: "Menu opens on every non-terminal card (aria-label 'Ações do candidato'); Avançar moves 1-click to next stage; Retroceder opens the destino+justificativa dialog and, on confirm, moves the card backward; Rejeitar opens the shared dialog (motivo Select + justificativa counter) and, on confirm, moves the card to the terminal 'Rejeitado' pill. No menu renders on terminal (aprovado/rejeitado) cards."
    why_human: "Requires a live RH JWT session + browser interaction (drag-drop vs. menu, dialog portal/backdrop rendering, DropdownMenu-stays-open-behind-modal side effect documented in 31-04-SUMMARY) — not verifiable by static code reading."
  - test: "HubCandidatoRH 'Próximo passo' action row on a real candidate profile"
    expected: "Avançar/Retroceder/Rejeitar render beside the dominant 'Abrir {etapa}' CTA without displacing it; after any of the three actions the Hub's own etapa chip/timeline refreshes (WR-01 fix — entrevistaKeys invalidation) instead of staying stale and re-offering an already-terminal action."
    why_human: "WR-01 was a real regression the phase introduced and fixed with a query-key invalidation; confirming the Hub visually refreshes post-action (not just that the invalidateQueries call fires in a unit test) needs a live click-through."
  - test: "ComparativoScreen Rejeitar from the standalone /rh/.../comparativo route (ComparativoCandidatosPage) and from the read-only DecisaoFinalPage embed"
    expected: "On the standalone route, Rejeitar opens the shared RejeitarCandidaturaDialog (motivo + ≥50 justificativa) and writes through the RPC; on the DecisaoFinalPage 'Comparativo' tab (finalists view), NO Ação row / Rejeitar button appears at all (read-only embed)."
    why_human: "Confirms the showActions gate and the dialog behavior render correctly across the two live mount points; component tests mock the hook and never render inside the real router/RHLayout chrome."
  - test: "Post-reject audit trail visibility: after a real reject (any surface), the candidate's historico/trilha shows the motivo + justificativa text with the correct human author"
    expected: "The historico_candidatura row written by the avancar_etapa trigger for this reject shows the RH user as ator and the free-text justificativa in criterio_texto, matching what the ROADMAP goal calls 'fica registrada na trilha de auditoria' — the SQL smokes prove this server-side, but no UI currently displayed to a human was exercised end-to-end."
    why_human: "The SQL behavioral smokes (31-06) prove the DB-level invariant against a disposable fixture; this item confirms the same holds when triggered by a real click through one of the 3 UI surfaces, per the phase's own 31-VALIDATION.md §Manual-Only Verifications (still unresolved — no 31-HUMAN-UAT.md exists)."
---

# Phase 31: Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo — Verification Report

**Phase Goal:** O RH move cada candidatura por qualquer uma das 6 etapas do funil — avançar, rejeitar (motivo estruturado por enum + justificativa livre ≥50 exigida no servidor) e retroceder (justificativa obrigatória) — e rejeita direto da tela de comparativo, tudo pelo MESMO write-path auditável único (UPDATE candidaturas.etapa_atual → trigger avancar_etapa()), sem nunca auto-rejeitar por score.
**Verified:** 2026-07-15T03:13:31Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OPER-01: RH advances a candidate from ANY of the 6 working stages (not just Kanban drag-drop) via an explicit affordance | ✓ VERIFIED | `src/components/KanbanBoard.tsx:298-354` — card `DropdownMenu` "Avançar" item calls `onAvancar`→`moveEtapa`/`useUpdateCandidaturaEtapa`; `src/features/hub-candidato/components/HubCandidatoRH.tsx:197-207` — 1-click Avançar button in "Próximo passo" block. Both reuse the same `useUpdateCandidaturaEtapa` write-path as drag-drop. |
| 2 | OPER-01: the transition is written exclusively by the trigger — no direct `INSERT INTO historico_candidatura` anywhere in client or new RPC code | ✓ VERIFIED | `grep -rn "INSERT INTO.*historico_candidatura" src/ supabase/migrations/` returns matches ONLY inside pre-existing trigger-definition migrations (`avancar_etapa` bodies), never in `src/` or the new `20260714100001_rejeitar_candidatura_rpc.sql` (which does exactly ONE `UPDATE public.candidaturas`, confirmed by direct read, lines 146-151). |
| 3 | OPER-02: RH rejects with a structured motivo (enum) + free-text justificativa; server RAISEs (not just form validation) when justificativa < 50 chars | ✓ VERIFIED | `supabase/migrations/20260714100001_rejeitar_candidatura_rpc.sql:104-109` — `IF char_length(v_just) < 50 THEN RAISE EXCEPTION ... USING ERRCODE = 'check_violation'`. `RejeitarCandidaturaDialog.tsx` mirrors with a `.trim().length` counter (UX only) — comment explicitly states "the server RPC RAISE remains the authority." Smoke assert (a) proves this live (per 31-06-SUMMARY.md + REVIEW.md resolution; DB evidence corroborated below). |
| 4 | OPER-02: no reject is ever score-driven (RNF-07a) — every audit row is a human write | ✓ VERIFIED | RPC has no score reference anywhere; `ator=auth.uid()` (GUC-based, survives DEFINER) — the trigger's existing `auto_rejeitado` predicate is GUC-gated (Phase 27/DBMIG-02), so a human RPC call always yields `auto_rejeitado=false`. Smoke assert (b) proves this live. |
| 5 | OPER-02: cross-recruiter (non-owner) reject is denied | ✓ VERIFIED | `20260714100001_rejeitar_candidatura_rpc.sql:99-102,127-129` — role-membership guard FIRST (WR-02 fix, closes an existence-oracle), then `v_role='rh' AND v_vaga_owner IS DISTINCT FROM auth.uid()` → `insufficient_privilege`. Smoke assert (e) + new assert (f) prove this live. |
| 6 | OPER-03: RH regresses to an earlier stage with mandatory justificativa, respecting the trigger's regression guard, and the trail is recorded | ✓ VERIFIED | `RetrocederCandidaturaDialog.tsx:99-115` — `justificativa.trim().length > 0` required (not the ≥50 floor); destino restricted to strictly-earlier non-terminal stages (`FUNNEL_ORDER.slice(0, currentIndex)`); wired to the extended `useUpdateCandidaturaEtapa`, which now ALWAYS sets `etapa_justificativa` (`triagemService.ts:391-398`) — closing the stale-OLD hazard. Smoke assert (c) proves the trigger's bare-UPDATE RAISE live via the reused `avancar_etapa()` trigger. |
| 7 | OPER-04: RH rejects from the comparativo screen with justificativa, through the SAME write-path — closing the funil-02 no-op debt | ✓ VERIFIED | `ComparativoScreen.tsx:357-370` mounts the shared `RejeitarCandidaturaDialog` (motivo + ≥50) in place of the old no-justificativa inline `AlertDialog`; `ComparativoCandidatosPage.tsx:113-135` — `handleAvancar` unchanged, `handleRejeitar` no longer calls `updateCandidaturaEtapa(id,'rejeitado')` (confirmed absent via grep across `src/`). Both `onAvancar`/`onRejeitar` are passed on the live standalone route (`ComparativoCandidatosPage.tsx:165-166`), making `showActions=true` there. |
| 8 | Read-only embed contract preserved: `DecisaoFinalPage`'s `<ComparativoScreen>` (finalists view) never shows a reject affordance | ✓ VERIFIED | `DecisaoFinalPage.tsx:194-205` passes neither `onAvancar` nor `onRejeitar` → `showActions=Boolean(onAvancar && onRejeitar)` is `false` → the whole Ação `<tr>` (including the dialog mount) never renders (`ComparativoScreen.tsx:314-375`, gated by `{showActions && (...)}`). |
| 9 | The trigger `avancar_etapa()` was reused verbatim — never edited by this phase | ✓ VERIFIED | `git log --oneline -- supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql` since 2026-07-14 returns 0 phase-31 commits touching that file. Only one new migration file was added by this phase (`20260714100001_rejeitar_candidatura_rpc.sql`) plus its post-review `CREATE OR REPLACE` amendment (WR-02, same file). |
| 10 | The two dead M1 overloads (`avancar_etapa(uuid,uuid)`, `rejeitar_candidato(...)`) are dropped by exact signature; the live zero-arg trigger fn survives | ✓ VERIFIED | Migration `DROP FUNCTION IF EXISTS public.avancar_etapa(uuid, uuid)` / `... public.rejeitar_candidato(uuid, uuid, text)` — no zero-arg, no `CASCADE`. `database.types.ts` (regenerated, confirmed below) contains no `avancar_etapa(uuid,uuid)` / `rejeitar_candidato` entries, and does still expose the trigger's dependents unaffected. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260714100001_rejeitar_candidatura_rpc.sql` | enum + DEFINER RPC + 2 exact-signature DROPs | ✓ VERIFIED | Read in full; matches must_haves exactly, including the post-review WR-02 guard-order amendment (role check hoisted above the candidatura lookup). |
| `supabase/tests/oper31_rejeitar_candidatura_smokes.sql` | 6 JWT-impersonated assertions (a,e,f,c,b/d) | ✓ VERIFIED | Read in full; all 6 branches present, disposable fixture + ROLLBACK-free cleanup, `set_config('request.jwt.claims'...)` impersonation idiom used correctly. |
| `src/features/triagem/services/triagemService.ts` | `rejeitarCandidatura` + `MotivoRejeicaoRh` + extended `updateCandidaturaEtapa` | ✓ VERIFIED | `rejeitarCandidatura` calls `supabase.rpc('rejeitar_candidatura', {p_candidatura_id,p_motivo,p_justificativa})` (no `as never` — cast dropped post-regen, confirmed at `:439`); `updateCandidaturaEtapa` always sets `etapa_justificativa` and throws `INVALID_INPUT` on `novaEtapa==='rejeitado'` (WR-05 fix, closes the dead bypass). |
| `src/features/triagem/hooks/useRejeitarCandidatura.ts` | mutation → toast + invalidation | ✓ VERIFIED | Invalidates `candidaturasKeys.all`, `vagasKeys.all`, `triagemKeys.all`, AND `entrevistaKeys.all` (WR-01 fix, added post-review). |
| `src/features/triagem/components/RejeitarCandidaturaDialog.tsx` | shared reject dialog | ✓ VERIFIED | Motivo Select + Textarea + trimmed-length counter/gate; destructive confirm; wired to `useRejeitarCandidatura`. 6/6 component-test behaviors pass. |
| `src/features/triagem/components/RetrocederCandidaturaDialog.tsx` | shared regress dialog | ✓ VERIFIED | Earlier-non-terminal-only destino Select + required non-empty justificativa; neutral styling; wired to extended `useUpdateCandidaturaEtapa`. |
| `src/components/KanbanBoard.tsx` | card DropdownMenu (Avançar/Retroceder/Rejeitar) | ✓ VERIFIED | `aria-label="Ações do candidato"`, hidden on terminal cards; mounts both shared dialogs via `trigger` prop; drag-drop path untouched. |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx` | "Próximo passo" action row | ✓ VERIFIED | Action row beside (not displacing) the dominant CTA; `PerfilCandidatoRHPage.tsx` wrapper confirmed untouched. |
| `src/features/triagem/components/ComparativoScreen.tsx` + `ComparativoCandidatosPage.tsx` | reject rewired to shared dialog/RPC | ✓ VERIFIED | See truths 7-8 above. |
| `database.types.ts` (ROOT) | regenerated with new RPC/enum, dead overloads gone | ✓ VERIFIED (independently re-checked) | `grep -n "rejeitar_candidatura\|motivo_rejeicao_rh" database.types.ts` → present at lines 4616-4620, 4778, 5060; `grep "avancar_etapa: {"` / `"rejeitar_candidato:"` → zero matches. This is strong corroborating evidence the migration is genuinely live in PROD (types are generated by introspecting the live linked schema via `supabase gen types --linked`). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `rejeitarCandidatura` service | `rejeitar_candidatura` RPC | `supabase.rpc('rejeitar_candidatura', {p_...})` | ✓ WIRED | Confirmed at `triagemService.ts:439-443`, fully typed (no `as never`). |
| `RejeitarCandidaturaDialog` | `useRejeitarCandidatura` | mutate on confirm | ✓ WIRED | `RejeitarCandidaturaDialog.tsx:88,98-109`. |
| `RetrocederCandidaturaDialog` | `useUpdateCandidaturaEtapa` | mutate with justificativa on confirm | ✓ WIRED | `RetrocederCandidaturaDialog.tsx:90,104-115`. |
| KanbanBoard card menu | `RejeitarCandidaturaDialog` / `RetrocederCandidaturaDialog` | mounted via `trigger` prop inside `DropdownMenuItem` | ✓ WIRED | `KanbanBoard.tsx:324-352`. |
| HubCandidatoRH action row | shared dialogs + `useUpdateCandidaturaEtapa` | mounted beside CTA | ✓ WIRED | `HubCandidatoRH.tsx:197-238`. |
| `ComparativoCandidatosPage` | `ComparativoScreen` | `onAvancar`/`onRejeitar` both passed | ✓ WIRED | `ComparativoCandidatosPage.tsx:165-166` → `showActions=true` on the live route. |
| `ComparativoScreen` (DecisaoFinalPage embed) | — | handlers omitted | ✓ WIRED (correctly NOT mounted) | `DecisaoFinalPage.tsx:194-205` — no handlers → `showActions=false`. |
| `avancar_etapa()` trigger | `historico_candidatura` | sole audit writer, single UPDATE fires it | ✓ WIRED | No direct INSERT anywhere in phase-31 code; trigger file untouched (git log). |

### Data-Flow Trace (Level 4)

Not applicable in the classic "dashboard renders API data" sense — this phase is a write-path (mutation), not a read-surface. The equivalent trace (client mutation → RPC → single UPDATE → trigger → audit row) is covered under Key Link Verification above and by the DB-level smoke assertions (server authority proven independently of the client).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full relevant test suites green | `npx vitest run src/features/triagem src/features/hub-candidato src/features/vagas/hooks src/components/__tests__/KanbanBoard.test.tsx` | 13 files / 72 tests passed | ✓ PASS |
| Full repo test suite green (no regression) | `npx vitest run` | 113 files / 897 tests passed | ✓ PASS (matches 31-06-SUMMARY's claimed 897/897) |
| tsc baseline held | `npm run lint` | 104 errors (identical count to claimed baseline; none touch phase-31 files — the 4 `TS2554` hits are pre-existing in `useCandidaturas.ts` mutation-options spread pattern, unrelated to this phase's changes) | ✓ PASS |
| Production build succeeds | `npm run build` | 0 errors; PERF-03 chunk assertions PASSED; `RejeitarCandidaturaDialog`/`RetrocederCandidaturaDialog` emitted as separate lazy chunks | ✓ PASS |
| No bare `updateCandidaturaEtapa(id,'rejeitado')` remains anywhere in `src/` | `grep -rn "updateCandidaturaEtapa(.*'rejeitado'" src/` | 0 matches (WR-05 branch now throws `INVALID_INPUT` instead) | ✓ PASS |
| No direct `INSERT INTO historico_candidatura` outside trigger-definition migrations | `grep -rn "INSERT INTO.*historico_candidatura" src/ supabase/migrations/` | matches only inside pre-existing trigger migrations | ✓ PASS |
| `database.types.ts` reflects the live schema (RPC/enum in, dead overloads out) | `grep` (see Artifacts table) | present/absent as expected | ✓ PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention; its behavioral proof mechanism is the SQL smoke file (`supabase/tests/oper31_rejeitar_candidatura_smokes.sql`), executed via Supabase MCP `execute_sql` against PROD in plan 31-06 (outside this verifier's tool access, per the phase's explicit verification_notes). The verifier corroborated the live-apply claim independently via the regenerated `database.types.ts` (see Artifacts table) rather than re-running the smoke.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| OPER-01 | 31-01, 31-02, 31-04, 31-05, 31-06 | Advance at any of 6 stages, single trigger write-path | ✓ SATISFIED | Truths 1-2, 9-10 |
| OPER-02 | 31-01, 31-02, 31-03, 31-04, 31-06 | Reject: motivo enum + ≥50 justificativa server-RAISE, never score-driven | ✓ SATISFIED | Truths 3-5 |
| OPER-03 | 31-01, 31-02, 31-03, 31-04, 31-06 | Regress with mandatory justificativa, trigger regression guard | ✓ SATISFIED | Truth 6 |
| OPER-04 | 31-01, 31-05, 31-06 | Reject from comparativo, same write-path, funil-02 debt closed | ✓ SATISFIED | Truths 7-8 |

All 4 requirement IDs declared across the phase's plans (`OPER-01..04`) match exactly the 4 IDs mapped to Phase 31 in `.planning/REQUIREMENTS.md` (lines 21-24, 99-102). No orphaned requirements — REQUIREMENTS.md's traceability table already marks all 4 as `Phase 31 | Complete`, consistent with this verification.

### Anti-Patterns Found

None. Scanned all 10 phase-touched files (services, hooks, dialogs, 3 RH surfaces, migration) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` — zero matches. No stub returns, no hardcoded-empty props feeding these components, no console.log-only handlers.

**Non-blocking findings from 31-REVIEW.md (documented, explicitly deferred by the team, not re-litigated here):**
- WR-03 (INFO-level UX): Kanban `canDrop` accepts backward drag-drops that always fail server-side (trigger RAISE, safe failure) — cosmetic affordance bug, not a truth violation.
- WR-04 (pre-existing, elevated stakes): Comparativo's positional `C{n}`→`selection[n-1]` identity mapping (Phase-10 debt) now has a destructive reject attached to it — flagged by the reviewer as a latent data-integrity risk if the assumption is ever violated, but out of this phase's stated scope and not proven broken.
- IN-02: Retroceder menu item shown on `inscricao` Kanban cards opens a dialog with an empty destino Select (dead-end, no crash).
- IN-01, IN-03: cosmetic/comment-accuracy only.

### Human Verification Required

See frontmatter `human_verification` — 4 items. Summary: this phase's own `31-VALIDATION.md` explicitly lists "End-to-end reject/advance/regress against live PROD with a real RH JWT" as a **Manual-Only Verification**, deferred per prior-phase precedent (Phases 8, 10, 11, 17, 21 all closed an equivalent live UAT in a follow-up session via a `NN-HUMAN-UAT.md`). No such file exists yet for Phase 31, and the two newly-introduced UI surfaces (Kanban dropdown menu, Hub action row) plus the rewired Comparativo reject have never been exercised through a live browser session with a real RH login. The server-authoritative invariants (the actual security/audit contract) are independently proven by the SQL smokes and are NOT what's being asked of the human — the human check is scoped to visual/interaction correctness (menu rendering, dialog portals, post-action UI refresh) which cannot be verified by reading code.

### Gaps Summary

No FAILED must-haves. All 4 roadmap Success Criteria and all 4 requirement IDs (OPER-01..04) are supported by direct code evidence, a green 897/897 test suite, a clean build, and a regenerated `database.types.ts` that corroborates the PROD migration apply claimed in 31-06-SUMMARY.md (which this verifier could not re-execute directly, per its tool access). The code-review cycle (31-REVIEW.md) already closed the 3 blocking-adjacent warnings (WR-01 Hub staleness, WR-02 RPC guard-order oracle, WR-05 dead reject bypass) with a follow-up commit (`e851014`) that is reflected in the current code. The remaining 2 warnings + 3 info items are explicitly accepted backlog, not phase-goal blockers.

The phase is functionally complete; the only outstanding item is the confirmatory live-session UAT that the phase's own validation plan called for but never executed, routing this verification to `human_needed` rather than `passed`.

---

*Verified: 2026-07-15T03:13:31Z*
*Verifier: Claude (gsd-verifier)*
