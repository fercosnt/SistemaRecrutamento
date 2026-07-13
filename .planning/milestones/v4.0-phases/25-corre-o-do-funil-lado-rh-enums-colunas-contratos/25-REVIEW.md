---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
reviewed: 2026-07-12T00:00:00Z
depth: deep
reviewer: gsd-code-reviewer
diff_base: bd2eb8be288af09dd10f36932f5143fc5cb846ac
files_reviewed: 22
files_reviewed_list:
  - src/components/KanbanBoard.tsx
  - src/components/modals/UpdateStatusModal.tsx
  - src/components/pages/CandidatosRHPage.tsx
  - src/components/pages/CriarEditarVagaPage.tsx
  - src/components/pages/ConfiguracoesPage.tsx
  - src/components/pages/MeuPerfilPage.tsx
  - src/components/pages/ComparativoCandidatosPage.tsx
  - src/components/RHSidebar.tsx
  - src/components/RHTopBar.tsx
  - src/features/vagas/hooks/useCandidaturas.ts
  - src/features/vagas/hooks/useVagas.ts
  - src/features/vagas/services/vagasService.ts
  - src/features/vagas/services/candidaturasService.ts
  - src/features/vagas/types/vagasTypes.ts
  - src/features/triagem/services/triagemService.ts
  - src/features/triagem/components/ComparativoScreen.tsx
  - src/features/decisao/components/DecisaoFinalPage.tsx
  - src/features/decisao/hooks/useRegistrarDecisao.ts
  - src/features/config-vaga/services/configVagaService.ts
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/lib/testes/testeContract.ts
  - supabase/migrations/20260709000010_guard_rejeicao_auditada.sql
  - supabase/migrations/20260709000011_decisao_final_historico.sql
  - supabase/migrations/20260709000012_registrar_decisao_amend.sql
  - supabase/migrations/20260709000013_upsert_opcoes_status_guard.sql
  - supabase/migrations/20260709000014_submit_candidatura_flag.sql
findings:
  critical: 0
  high: 0
  medium: 3
  low: 2
  total: 5
status: findings
fix_run:
  applied_at: 2026-07-12T00:00:00Z
  applied_by: gsd-code-reviewer --fix
  fixed:
    - MED-01  # funil "Por Vaga" derivado do enum M2 (fonte única)
    - MED-02  # useRegistrarDecisao invalida candidaturas/vagas cache
    - LOW-01  # cards Kanban terminais não-arrastáveis (canDrag:false)
  deferred:
    - MED-03  # reconsider-out-of-rejeitado: precisa decisão de produto → .planning/todos/pending/25-review-deferred.md
    - LOW-02  # select('*') PII pré-existente (não regressão P25) → security-hardening/M5
  gates:
    tsc: 107  # baseline FOUND-08, não aumentou
    vitest: 784 passed
    build: green
---

# Phase 25: Code Review Report

**Reviewed:** 2026-07-12
**Depth:** deep (cross-file: enum cutover, reject/audit write-path, RLS/guard trigger chain)
**Files Reviewed:** 22 source files + 5 LIVE migrations
**Status:** issues_found

## Summary

Phase 25 rewires the RH funnel onto the real 6-stage M2 enum, closes the "reject
without audit trail" hole (A9) with a hybrid DB guard, adds an append-only decision
history, and threads real per-vaga counts to authenticated sessions. The core write-path
and the SQL are **sound**:

- **RNF-07a / audit trail (guard trigger).** `guard_rejeicao_auditada` cannot be
  bypassed by a raw client — the sanction flag is a txn-local GUC set only inside two
  SECURITY DEFINER RPCs, and PostgREST wraps each request in its own transaction, so a
  client can neither set the flag nor smuggle a `set_config` before an UPDATE. Every
  path into `status='rejeitado'` now carries either the flag or an audited
  `etapa_atual` transition. No auto-reject-by-score was introduced.
- **WR-10 anon leak — CLOSED.** `includeCounts = !!user`; an anonymous visitor has no
  `user` and no `candidatoId`, so `enriquecerVaga` early-returns before the count read.
  Anon gets zero per-vaga count round-trips. No leak.
- **RLS on the new history table is correct** — client INSERT blocked
  (`WITH CHECK(false)`), RH SELECT scoped by vaga ownership, no candidate policy;
  `por_usuario` NOT NULL preserved (LGPD-02).
- **ComparativoScreen optional-handler change is safe** — `DecisaoFinalPage` omits
  `onAvancar`/`onRejeitar` → `showActions=false` → read-only embed renders correctly;
  `ComparativoCandidatosPage` still passes both handlers.
- **testeContract ↔ AvaliacaoContainer** cutover is well-built (single source of the
  id map; no drift; unknown ids dropped, not mis-routed).

The findings below are correctness/consistency defects — **no BLOCKER and no security
regression**. The two most material: an **incomplete enum cutover** left the "Por Vaga"
funnel keyed on dead M1 stage names (MED-01), and the **rewired reject path lost its
cache invalidation** so the RH list stays stale after a reject (MED-02). A related
state-consistency gap (MED-03) makes the "reconsider a rejected candidate" action a
visual no-op.

The accepted residual `funil-02-comparativo-reject-justificativa` was NOT flagged, per
scope.

## Medium

### MED-01: "Por Vaga" funnel still keyed on dead M1 enum stages (incomplete FUNIL-06 cutover)

**File:** `src/components/pages/CandidatosRHPage.tsx:230-238` (map) and `:858-865` (render)
**Issue:** Phase 25's stated goal (FUNIL-06 — "nenhum map M1 de valores mortos
sobrevive") was achieved in `vagasTypes.ts` and the Kanban, but this file was only
partially cut over (nav + dropdown sweep). The `funilEtapas` bucket map still hardcodes
M1 stage keys `bigfive`, `disc`, `raven`, `cultura` — none of which exist in the live
`etapa_processo` enum (`inscricao, triagem, avaliacao_assincrona, entrevista_online,
entrevista_presencial, decisao_final, aprovado, rejeitado`). Because the loop guards with
`etapas.hasOwnProperty(c.etapa_atual)`, these four buckets are **structurally always 0**,
while candidates whose real `etapa_atual` is `inscricao`, `avaliacao_assincrona`,
`decisao_final`, `aprovado`, or `rejeitado` are **never counted** — they silently vanish
from the funnel and from `Total: {vagaCandidaturas.length}` reconciliation. The RH "Por
Vaga" funnel therefore shows a misleading, mostly-empty distribution. (No 22P02 crash
here — these are object-key lookups, not an `eq()` filter — so it degrades silently.)
**Fix:** Derive the funnel buckets from the single source of truth instead of a hand map:
```tsx
import { ETAPA_M2_OPTIONS, ETAPA_M2_LABELS, type EtapaFunilM2 } from '@/features/triagem/services/triagemService'

const funilEtapas = useMemo(() => {
  const etapas = Object.fromEntries(
    ETAPA_M2_OPTIONS.map((o) => [o.value, 0]),
  ) as Record<EtapaFunilM2, number>
  vagaCandidaturas.forEach((c) => {
    const e = c.etapa_atual as EtapaFunilM2 | undefined
    if (e && e in etapas) etapas[e]++
  })
  return etapas
}, [vagaCandidaturas])
```
and render the tiles by mapping `ETAPA_M2_OPTIONS` (label from `ETAPA_M2_LABELS`) so the
funnel and the Kanban share one stage vocabulary.

### MED-02: Reject via UpdateStatusModal never invalidates the candidaturas/vagas cache — RH list stays stale

**File:** `src/features/decisao/hooks/useRegistrarDecisao.ts:36-39`; interacts with
`src/components/pages/CandidatosRHPage.tsx:950-953` and `src/components/modals/UpdateStatusModal.tsx:156-159`
**Issue:** Phase 25 rerouted the modal's reject through `useRegistrarDecisao`, whose
`onSuccess` only invalidates `decisaoKeys.all`. It does **not** invalidate
`candidaturasKeys.all` or `vagasKeys.all`. The non-reject path
(`useUpdateCandidaturaStatus`) explicitly invalidates **and force-refetches**
`candidaturasKeys.all` + `vagasKeys.all`. `CandidatosRHPage` relies entirely on cache
invalidation to refresh (its `onSuccess` comment literally says *"Query will auto-refetch
due to cache invalidation in hook"*) — but that assumption is now false for reject.
`useAllCandidaturas` has `staleTime: 30s` and no `refetchOnWindowFocus`, so after an RH
rejects a candidate the row keeps showing the **old** status (e.g. "Em Análise") until the
30s window elapses and something re-triggers the query. The reject succeeds server-side;
the UI just lies about it. This is a behavioral regression from the pre-Phase-25 reject
(which force-refetched).
**Fix:** Broaden the invalidation in `useRegistrarDecisao` (harmless for `DecisaoFinalPage`,
required for the modal):
```ts
onSuccess: () => {
  toast.success('Decisão registrada e etapa finalizada.')
  queryClient.invalidateQueries({ queryKey: decisaoKeys.all })
  queryClient.invalidateQueries({ queryKey: candidaturasKeys.all }) // NEW
  queryClient.invalidateQueries({ queryKey: vagasKeys.all })        // NEW
},
```
(or invalidate those keys from the modal's reject `onSuccess`).

### MED-03: "Reconsider rejected candidate" leaves etapa_atual stuck at 'rejeitado' — candidate still shows Rejeitado

**File:** `supabase/migrations/20260709000012_registrar_decisao_amend.sql:119-123`;
`src/components/modals/UpdateStatusModal.tsx:62`;
`src/features/vagas/services/candidaturasService.ts:443-448`;
`src/components/KanbanBoard.tsx:100-101`
**Issue:** Phase 25's `registrar_decisao` reject branch now writes **both**
`etapa_atual='rejeitado'` and `status='rejeitado'` (previously reject was status-only, etapa
untouched). The modal still offers the "reconsiderar candidato rejeitado" transition
(`VALID_TRANSITIONS['rejeitado'] = ['em_analise']`). That transition routes through
`updateCandidaturaStatus`, which changes only `status` (`novaEtapa = etapa_atual ||
etapaAtualAnterior` = `'rejeitado'`, unchanged). Result: `status='em_analise'` but
`etapa_atual='rejeitado'` — an inconsistent terminal etapa on an active status. The Kanban
terminal pill is keyed on `etapa === 'rejeitado' || status === 'rejeitado'`, so the
reconsidered candidate **still renders a "Rejeitado" pill** anchored in `decisao_final`
and never returns to a working column. The reconsider action is effectively a visual no-op
and the DB is left in a contradictory state (which also mis-drives `funilNavMap`/hub etapa
reads). This is a regression introduced by moving etapa to terminal on reject.
**Fix:** When reconsidering out of `rejeitado`, also move `etapa_atual` back to a working
stage through the audited path. Simplest: in the modal, when `statusAtual === 'rejeitado'`
and the new status is `em_analise`, call `updateCandidaturaEtapa(candidaturaId, 'triagem')`
(or the appropriate resume stage) so `avancar_etapa` writes an audited transition and the
terminal pill clears — a regression, so it correctly requires an `etapa_justificativa`
(surface a short reason field), or make `updateCandidaturaStatus` reset
`etapa_atual` off the terminal when un-rejecting.

## Low

### LOW-01: Terminal cards remain draggable — misleading "Solte aqui" affordance that always errors + stale audit criterio

**File:** `src/components/KanbanBoard.tsx:116-124, 164-173, 297`; `src/features/triagem/services/triagemService.ts:350-378`
**Issue:** `columnForEtapa` anchors `aprovado`/`rejeitado` cards in the `decisao_final`
column, but `CandidatoKanbanCard` is unconditionally draggable and `KanbanColumn.canDrop`
only rejects the card's own current column. So a terminal card shows the green "Solte aqui"
drop affordance over every working column. Dropping it fires
`updateCandidaturaEtapa(id, workingStage)`, which the `avancar_etapa` trigger blocks as a
regression (terminals are the highest enum ordinals; any move down needs a non-empty
`etapa_justificativa`, which the drag never provides) → the mutation throws and the user
gets an "Erro ao mover candidato" toast. It is server-safe but presents an interactive
affordance that is guaranteed to fail. Separately, a *legitimate* forward drag also omits
`etapa_justificativa`, so `avancar_etapa` records the audit row's `criterio_texto` as the
**stale** value left in the `etapa_justificativa` column by the previous transition —
low-quality audit trail.
**Fix:** Make `CandidatoKanbanCard` non-draggable when `getTerminalBadge(candidatura)` is
non-null (or have `KanbanColumn.canDrop` reject items whose `currentEtapa` is
`aprovado`/`rejeitado`), so terminal cards stop advertising an always-failing drop. Consider
passing a short `etapa_justificativa` on drag moves so audit rows carry an honest reason.

### LOW-02: RH list read uses `select('*')` on joined candidato/vaga — over-fetches PII to the client (pre-existing)

**File:** `src/features/vagas/services/candidaturasService.ts:542-545`
**Issue:** `listAllCandidaturas` selects `*, candidato:candidatos(*), vaga:vagas(*), …`.
Per the standing project rule ([[reference_select_star_leaks_pii]]) RLS is row-level only
and does not hide columns, so this ships every column RLS lets the RH read for each joined
candidate row (potentially CPF and other sensitive fields) into the browser bundle for a
list view that only renders name/email/phone. RH is an authorized role and this select was
**not modified by Phase 25** (the Phase-25 change to this file removed `getProximaEtapa`),
so it is not a new leak — but it is squarely in the "RH read paths / `select('*')` PII"
focus area and violates data-minimization. Flagging for hardening, not as a Phase-25
regression.
**Fix:** Replace the star-joins with an explicit allowlist projection (mirror
`triagemService.listTriagemPanel` / the `v_triagem_panel` view), e.g.
`candidato:candidatos(id, nome_completo, email, celular)` and only the `vagas` columns the
list actually renders.

---

## Cleared during review (adversarial checks that held up)

- **Guard trigger bypass / RNF-07a** — no client-reachable path sets the sanction GUC;
  every reject carries a flag or an audited etapa transition. Sound.
- **WR-10 anon per-vaga count leak** — gated on `!!user`; anon short-circuits. No leak.
- **decisao_final_historico RLS / answer-key / PII** — client writes blocked, RH SELECT
  vaga-scoped, no candidate policy, actor preserved. Correct.
- **upsert_pergunta_opcoes_metadata IDOR (T-25-03)** — in-body role + rascunho status gate
  + `created_by = auth.uid()` ownership check inside the DEFINER body. Correct.
- **submit_candidatura_atomic knockout coexistence (CI-03)** — flag set before the
  etapa-unchanged auto-reject; texto-join sweep reads no trait/score/age. Correct.
- **ComparativoScreen optional handlers** — read-only embed in `DecisaoFinalPage` renders
  fine; `ComparativoCandidatosPage` unaffected.

---

## Fix run (2026-07-12, `--fix`)

- **MED-01 — FIXED.** `CandidatosRHPage` "Por Vaga" funil now derives its buckets +
  tiles from `ETAPA_M2_OPTIONS` / `ETAPA_M2_LABELS` (single source), counting all 8
  real `etapa_processo` stages. No dead M1 literal (`bigfive/disc/raven/cultura`)
  survives in the funnel logic.
- **MED-02 — FIXED.** `useRegistrarDecisao.onSuccess` now also invalidates
  `candidaturasKeys.all` + `vagasKeys.all`, so the RH list refreshes after a modal
  reject (harmless for `DecisaoFinalPage`).
- **LOW-01 — FIXED.** `CandidatoKanbanCard` is now non-draggable when
  `getTerminalBadge(...)` is non-null (`canDrag: () => !terminalBadge`) + honest
  cursor; working-stage cards stay draggable. Regression test added. (The optional
  forward-drag stale-`criterio_texto` sub-point was NOT taken — it needs a signature
  change.)
- **MED-03 — DEFERRED** (product decision required — resume-reason + audited etapa
  reset, or drop the `rejeitado → em_analise` transition). See
  `.planning/todos/pending/25-review-deferred.md`.
- **LOW-02 — DEFERRED** (pre-existing `select('*')` PII, not a Phase-25 regression;
  belongs to a security-hardening / M5 pass). Same backlog file.

Gates after fixes: **tsc 107** (FOUND-08 baseline, not increased), **vitest 784
passed**, **build green**.

---

_Reviewed: 2026-07-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
