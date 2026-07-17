---
phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil
reviewed: 2026-07-15T02:58:14Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/components/KanbanBoard.tsx
  - src/components/pages/ComparativoCandidatosPage.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/triagem/components/ComparativoScreen.tsx
  - src/features/triagem/components/RejeitarCandidaturaDialog.tsx
  - src/features/triagem/components/RetrocederCandidaturaDialog.tsx
  - src/features/triagem/hooks/useRejeitarCandidatura.ts
  - src/features/triagem/services/triagemService.ts
  - src/features/vagas/hooks/useCandidaturas.ts
  - supabase/migrations/20260714100001_rejeitar_candidatura_rpc.sql
  - supabase/tests/oper31_rejeitar_candidatura_smokes.sql
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: resolved
resolved: 2026-07-15
resolution: "WR-01/WR-02/WR-05 fixed; WR-03/WR-04/INFO-1/2/3 deferred (documented below)"
---

# Phase 31: Code Review Report

## Resolution (autonomous code_review_gate, 2026-07-15)

**Fixed:**
- **WR-01 (Hub staleness)** — `useRejeitarCandidatura` + `useUpdateCandidaturaEtapa` now also invalidate `entrevistaKeys.all` (`['entrevista']`), so an action taken from `HubCandidatoRH` (which derives its etapa UI from `useEntrevistaContexto`) refreshes instead of re-offering a now-terminal action.
- **WR-02 (guard-order existence oracle)** — the `rejeitar_candidatura` RPC now runs the role-membership check (`role IN (rh,administrador)`) **before** the candidatura lookup, so candidato/anon always get `insufficient_privilege` (never `no_data_found`). Applied live via `CREATE OR REPLACE` in PROD + migration file updated; a new smoke assertion **(f)** proves the oracle is closed (candidato + non-existent id → `insufficient_privilege`). All 6 smokes GREEN.
- **WR-05 (dead bare-reject bypass)** — `updateCandidaturaEtapa(id,'rejeitado')` now throws `INVALID_INPUT` (pointing to the audited `rejeitarCandidatura` RPC) instead of performing an ungated status write; the cementing test was rewritten to assert the throw + no payload sent.

**Deferred (documented, non-blocking):**
- **WR-03** (Kanban `canDrop` accepts always-failing backward drops) — minor UX affordance; the drop fails safely (trigger RAISE). Backlog UX polish.
- **WR-04** (Comparativo positional `C{n}`→`selection[n-1]` identity mapping) — **pre-existing** pattern, not introduced by this phase; a broader fix (stable candidate keys) belongs in a dedicated change. Reject is still owner-authorized + audited server-side.
- **INFO-1/2/3** (hardcoded comparativo advance target, Retroceder dead-end on `inscricao` cards, a grouping comment) — cosmetic; backlog.

# Phase 31: Code Review Report

**Reviewed:** 2026-07-15T02:58:14Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 31 wires RH funnel actions (advance / regress / reject across the 6 M2 stages, plus reject-from-comparativo) through a single audited write-path. The core invariants hold well and I could not disprove them:

- The reject RPC `rejeitar_candidatura` IS `SECURITY DEFINER` / `search_path=''`, enforces `char_length(btrim(justificativa)) >= 50` server-side (RAISE `check_violation`), and carries a WR-04 vaga-owner guard; the client counter is correctly UX-only.
- `updateCandidaturaEtapa` always puts `etapa_justificativa` in the SET list (stale-OLD regression hazard closed), and no UI surface INSERTs directly into `historico_candidatura` — the `avancar_etapa` trigger stays the sole audit writer.
- The DROP signatures correctly target the two dead 2-arg M1 overloads and never the zero-arg live trigger function; the enum + RPC are replay-idempotent.
- The shared `RejeitarCandidaturaDialog` is MOUNTED (not forked) by Kanban, Hub, and Comparativo; the old raw-status reject in `ComparativoCandidatosPage` is gone; RNF-07a (no score-driven auto-reject) is respected throughout.

No blocker-tier defect was proven. The findings below are five WARNINGs (a Hub stale-UI regression the phase itself introduced, an RPC guard-ordering / existence-oracle weakness, a guaranteed-fail Kanban backward-drag affordance, a positional AI↔identity mapping hazard now attached to a destructive action, and a latent unaudited reject branch left in the service) plus three INFO items.

## Warnings

### WR-01: Hub does not refresh its own etapa after advance / regress / reject (stale UI, self-inflicted by Phase 31)

**File:** `src/features/hub-candidato/components/HubCandidatoRH.tsx:91-126` (with `src/features/triagem/hooks/useRejeitarCandidatura.ts:49-51` and `src/features/vagas/hooks/useCandidaturas.ts:430-436`)
**Issue:** The Hub derives `etapaAtual` — and therefore the header chip, the "Próximo passo" action row visibility, the funnel timeline current/passed states, and every `estadoDaSecao(...)` — *solely* from `useEntrevistaContexto(candidaturaId)`, whose query key is `entrevistaKeys.contexto = ['entrevista','contexto',id]`. Phase 31 mounts the action row here, consuming `useRejeitarCandidatura` (invalidates `candidaturasKeys.all` `['candidaturas']`, `vagasKeys.all` `['vagas']`, `triagemKeys.all` `['triagem']`) and `useUpdateCandidaturaEtapa` (invalidates `['candidaturas']` + `['vagas']`). **None of them invalidates `['entrevista']`.** So after rejecting / retroceding / advancing *from the Hub*, the Hub keeps rendering the OLD etapa and keeps offering Avançar/Retroceder/Rejeitar. A second Rejeitar click then hits the RPC's terminal guard (step 3) and surfaces an error toast — a confusing dead-end for what looked like a valid action. (Kanban and Comparativo are unaffected: their lists read from `candidaturasKeys` / `triagemKeys`, which ARE invalidated.)
**Fix:** Invalidate the contexto key on success from the Hub. Either pass callbacks into the two dialogs and the advance button:
```tsx
const queryClient = useQueryClient()
const invalidateHub = () =>
  queryClient.invalidateQueries({ queryKey: entrevistaKeys.contexto(candidaturaId) })

// Avançar:
onClick={() => avancarEtapa({ candidaturaId, novaEtapa: proximaEtapa },
  { onSuccess: invalidateHub })}

// <RetrocederCandidaturaDialog ... onDone={invalidateHub} />
// <RejeitarCandidaturaDialog ...  onRejected={invalidateHub} />
```
or, more robustly, add `queryClient.invalidateQueries({ queryKey: entrevistaKeys.all })` to `useRejeitarCandidatura` and `useUpdateCandidaturaEtapa` so every surface that reads candidatura context reflects a stage move.

### WR-02: `rejeitar_candidatura` authorizes AFTER the ≥50 gate and the candidatura lookup — existence oracle for any authenticated user

**File:** `supabase/migrations/20260714100001_rejeitar_candidatura_rpc.sql:94-123`
**Issue:** The RPC runs, in order: (0) `char_length(v_just) < 50` RAISE, (1) `SELECT ... FROM candidaturas JOIN vagas ... WHERE c.id = p_candidatura_id` + `NOT FOUND` RAISE (`no_data_found`), then (2) the role / owner guard. Because the SELECT runs with DEFINER privileges (RLS bypassed) and `GRANT EXECUTE ... TO authenticated` includes every candidato, an *unauthorized* authenticated caller who supplies any ≥50 justificativa can distinguish an existing candidatura (`insufficient_privilege`, 42501) from a non-existent one (`no_data_found`) — an existence oracle over `candidaturas`, which RLS otherwise prevents candidatos from probing. It also reveals the ≥50 rule to callers who are never allowed to reject. WR-04's intent is auth-first; here the identity/ownership gate is the last thing checked. Exploitability is low (candidatura ids are UUIDs), so this is a WARNING, but the phase context explicitly asked to scrutinize the guard order.
**Fix:** Hoist the role gate above the data lookup, and treat "not authorized" identically whether or not the row exists:
```sql
-- role gate FIRST
v_role := (select auth.jwt() #>> '{app_metadata,role}');
IF v_role NOT IN ('rh','administrador') THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;

-- then resolve + owner-check; for an rh, a missing row and a non-owned row
-- should both raise insufficient_privilege (not no_data_found) to avoid the oracle.
```

### WR-03: Kanban offers a "Solte aqui" affordance for backward drops that can never succeed

**File:** `src/components/KanbanBoard.tsx:391-393` and `:490-494`
**Issue:** `KanbanColumn`'s `canDrop: (item) => item.currentEtapa !== etapa` accepts a drop onto ANY column other than the current one — including earlier stages. `handleDrop` then calls `moveEtapa({ candidaturaId, novaEtapa })` with **no `justificativa`**, so a backward move triggers the `avancar_etapa` trigger's `RAISE 'Regressão de etapa exige justificativa preenchida'` → guaranteed `onError` toast ("Erro ao mover candidato"). The board renders the green "Solte aqui" drop indicator for those backward columns even though the drop is structurally impossible; the intended regression path is the Retroceder dialog. The `LOW-01` comment (`:182-185`) shows the team already knows this failure mode — but only patched it for terminal cards (`canDrag:false`), not for backward drags of non-terminal cards.
**Fix:** Restrict `canDrop` to forward-only so the affordance is never shown for a move the server will reject:
```tsx
canDrop: (item) =>
  WORKING_STAGES.indexOf(etapa) > WORKING_STAGES.indexOf(item.currentEtapa),
```
Regression stays the Retroceder dialog's job (which passes the required justificativa).

### WR-04: Comparativo resolves candidates by positional index — an AI-analysis↔identity misalignment can drive a wrong human reject/advance

**File:** `src/components/pages/ComparativoCandidatosPage.tsx:66-80` (consumed by the destructive actions in `src/features/triagem/components/ComparativoScreen.tsx:319-370`)
**Issue:** `resolveCandidates` maps the EF's anonymized `candidate_id` `"C{n}"` to `selection[n-1]` purely by array position, assuming the EF anonymizes in exactly the score-DESC order the panel used to build `selection`, computed on the same score basis. If those orderings ever diverge (score ties, `composite_score` vs the panel's `score_match`, or the panel passing ids in a different order), each column shows one person's NAME (`sel.nome`) next to another person's AI **strengths/gaps/rationale/score** (`...r`). The displayed name and the acted-upon `candidaturaId` stay internally consistent (both from `sel`), so the reject/advance hits the named person — but the RH decides based on AI analysis that may belong to someone else. Phase 31 attaches a *destructive, audited reject* to this row, raising the stakes of the pre-existing Phase-10 positional inference. If the EF-order assumption is ever violated this becomes a data-integrity BLOCKER (wrong-reasons rejection).
**Fix:** Have `comparativo-candidatos` return the real `candidatura_id` (or an explicit `candidate_id → candidatura_id` map) in each `ranked_candidate`, and resolve by that key instead of parsing digits out of `"C{n}"`. At minimum, assert `ranked_candidates.length === selection.length` and fail loudly if the invoke result cannot be aligned, rather than silently falling back to `r.candidate_id`.

### WR-05: Dead `'rejeitado'` branch in `updateCandidaturaEtapa` is a second, unaudited reject write-path

**File:** `src/features/triagem/services/triagemService.ts:386-389`
**Issue:** After Phase 31, every UI reject routes through the audited RPC `rejeitar_candidatura` (≥50 gate + WR-04 owner guard). The legacy `if (novaEtapa === 'rejeitado') { update.status = 'rejeitado' }` branch in `updateCandidaturaEtapa` is no longer reached by any surface (verified: all callers pass working stages or `PROXIMA_ETAPA_APOS_TRIAGEM`), yet it remains — and it writes `etapa_atual='rejeitado' + status='rejeitado'` with **no justificativa and no ownership check beyond RLS**. It is still exercised by `triagemService.test.ts:166-172`, which cements it as "supported." Leaving a second reject path that bypasses the ≥50 authority is a latent hazard: a future caller passing `'rejeitado'` (e.g. a copy-paste of the advance handler) silently sidesteps OPER-02/04.
**Fix:** Remove the `'rejeitado'` branch (and its test), or make the service refuse a terminal-reject and redirect callers:
```ts
if (novaEtapa === 'rejeitado') {
  throw new TriagemServiceError(
    'Use rejeitarCandidatura (RPC auditada) para rejeitar — updateCandidaturaEtapa não rejeita.',
    'INVALID_INPUT',
  )
}
```

## Info

### IN-01: Comparativo "Avançar" hardcodes the destination to `avaliacao_assincrona`

**File:** `src/components/pages/ComparativoCandidatosPage.tsx:118-126`
**Issue:** `handleAvancar` always calls `updateCandidaturaEtapa(candidaturaId, PROXIMA_ETAPA_APOS_TRIAGEM)` (= `'avaliacao_assincrona'`) regardless of the candidate's real `etapa_atual`. It is correct while the comparativo is used strictly as a triagem-stage tool (all compared candidates at `'triagem'`), but if a candidate already past `avaliacao_assincrona` is ever compared, this becomes a regression with no justificativa → trigger RAISE → error toast. It couples the comparativo to a stage assumption that nothing enforces.
**Fix:** Derive the next stage from each candidate's actual `etapa_atual` (the same `WORKING_STAGES.indexOf(...) + 1` logic used in the Kanban / Hub), or scope the comparativo Avançar to candidates confirmed at `'triagem'`.

### IN-02: Kanban shows "Retroceder" on `inscricao` cards, opening a dialog with an empty destination Select

**File:** `src/components/KanbanBoard.tsx:324-337` (with `src/features/triagem/components/RetrocederCandidaturaDialog.tsx:95-100`)
**Issue:** The Kanban card menu renders Retroceder for every non-terminal card, including `inscricao`. For `inscricao`, `RetrocederCandidaturaDialog` computes `destinos = FUNNEL_ORDER.slice(0, 0) = []`, so the dialog opens with an empty destination `<Select>` and a permanently disabled confirm — a small UI dead-end. (The Hub already avoids this because its action block does not render for `inscricao`, whose `rotaWorkspaceRH` is `null`.)
**Fix:** Hide the Retroceder menu item when the card is at the first working stage, e.g. gate the `<RetrocederCandidaturaDialog>` on `WORKING_STAGES.indexOf(currentEtapa) > 0`.

### IN-03: `groupedCandidaturas` comment says "8 etapas" but only 6 working buckets ever receive cards

**File:** `src/components/KanbanBoard.tsx:463-487`
**Issue:** The `Record<EtapaFunilM2, ...>` seed has 8 keys, but `columnForEtapa` folds `aprovado`/`rejeitado` into `decisao_final`, so `grouped.aprovado` / `grouped.rejeitado` are always empty and never rendered. The "8 etapas reais" comment is mildly misleading versus the "6 working columns + terminal pill" design. Cosmetic only.
**Fix:** Reword the comment (or drop the two unused terminal keys from the accumulator) to match the anchoring behavior.

---

_Reviewed: 2026-07-15T02:58:14Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
