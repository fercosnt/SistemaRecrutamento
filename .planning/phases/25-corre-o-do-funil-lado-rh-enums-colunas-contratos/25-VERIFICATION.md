---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
verified: 2026-07-12T03:58:36Z
status: gaps_found
score: 8/9 must-haves verified (1 partial)
overrides_applied: 0
gaps:
  - truth: "As affordances mortas (menus, badges 12/5, botões no-op, tiles '-', DecisaoFinalPage no-ops, telas mock A14/A37) ficam ligadas ou ocultas (UX-06 / Roadmap SC #5)"
    status: partial
    reason: "5 of 7 documented dead-affordance items were swept (badges, RHTopBar search, Usar-da-Biblioteca buttons, DecisaoFinalPage no-op avançar/rejeitar, A14/A37 mock screens). Two items named explicitly in UX-06's own requirement text and in 25-UI-SPEC.md §4 were never touched by any of the 8 plans: (1) the dead 'menus' — CandidatosRHPage dropdown items 'Enviar Email' / 'Enviar WhatsApp' / 'Exportar PDF' still render with zero onClick handler in both card and table views; (2) the '-'/fake per-vaga tiles — VagasRHPage 'Em análise'/'Aprovados' tiles always show 0 for RH sessions because enriquecerVaga's real-count query only executes when a candidatoId is present (an RH session has authStore.candidato===null), so the RH-facing counts are structurally dead, not just visually. 25-06-SUMMARY.md self-admits the tiles item was left out of scope ('out of this plan's files_modified/<tasks> scope ... left for the phase's remaining scope'); no other plan in the phase picked it up."
    artifacts:
      - path: "src/components/pages/CandidatosRHPage.tsx"
        issue: "DropdownMenuItem 'Enviar Email' (L444-447, L802-805), 'Enviar WhatsApp' (L448-451, L806-809), 'Exportar PDF' (L453-456, L811-814) have no onClick — dead menu items, not addressed by any Phase-25 plan (file not in 25-06's files_modified)"
      - path: "src/components/pages/VagasRHPage.tsx"
        issue: "vaga.candidatos.total/emAnalise/aprovados (L188-198) read vagaDB.totalCandidatos/candidatosEmAnalise/candidatosAprovados, which are only populated by enriquecerVaga when candidatoId is truthy"
      - path: "src/features/vagas/services/vagasService.ts"
        issue: "enriquecerVaga() (L65-132) early-returns at L87-89 without running the real count query when candidatoId is falsy; useVagas() (useVagas.ts:92-104) sources candidatoId from authStore.candidato, which is always null for role=rh/administrador sessions — so the RH per-vaga tiles never receive real counts"
    missing:
      - "Wire or remove the 3 no-op dropdown items in CandidatosRHPage.tsx (card + table views)"
      - "Give the RH VagasRHPage per-vaga tiles a real count path (a role-aware branch in enriquecerVaga, or a dedicated RH count query) instead of the candidatoId-gated candidate-only path, or remove the tiles per the UI-SPEC fallback rule"
---

# Phase 25: Correção do Funil (lado RH — enums, colunas & contratos) Verification Report

**Phase Goal:** O RH opera o funil sobre enums e colunas que existem — Kanban, UpdateStatus, Editar Vaga e decisão funcionam sem tocar em artefatos M1 mortos — e ninguém rejeita candidato sem trilha de auditoria/justificativa (RNF-07a). No mesmo file-touch, o hub RH e as affordances mortas são corrigidos/ocultados.

**Verified:** 2026-07-12T03:58:36Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Method

Read all 8 PLAN/SUMMARY pairs, ROADMAP.md Phase 25 entry (5 success criteria), REQUIREMENTS.md (FUNIL-02/03/04/05/06/09/11, UX-03/06), then independently re-derived every truth against the actual repository: read the touched source files and the 5 new migrations verbatim, grepped for dead-code residue (M1 enum literals, phantom `vagas` columns, no-op handlers), and re-ran the gates myself rather than trusting the SUMMARYs' reported numbers:

```
npx tsc --noEmit | grep -c "error TS"   → 107  (SUMMARY claimed 107 — match)
npm run test:run                        → 96 files / 781 tests passed (SUMMARY claimed 781/781 — match)
npm run build                           → green, pre-existing chunk-size advisories only (match)
```

PROD-apply claims (25-07) could not be independently re-queried (no live Supabase MCP/DB access in this verification session); corroborating evidence used instead: `database.types.ts` (git-tracked, regenerated 2026-07-12 per `git log`) now contains the `decisao_final_historico` table shape, which can only come from introspecting the *actual* live schema — this is strong circumstantial confirmation the 5 migrations really landed on PROD, not just on disk.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria, verbatim)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | O RH Kanban e o UpdateStatusModal operam sobre o enum de etapas que existe no DB, e 'Aprovado para Próxima Etapa' não grava mais uma etapa M1 inexistente (FUNIL-03, FUNIL-06) | ✓ VERIFIED | `KanbanBoard.tsx` derives 6 real working columns from `WORKING_STAGES`/`triagemService.ETAPA_M2_LABELS`; drag routes through `useUpdateCandidaturaEtapa`→`updateCandidaturaEtapa`→`avancar_etapa` trigger. `vagasTypes.ts` re-aliases `EtapaProcesso` to `Database['public']['Enums']['etapa_processo']`; `ETAPA_PROCESSO_LABELS`/`ETAPAS_SEQUENCIA`/`ETAPA_PROGRESS`/`ETAPA_TO_KANBAN`/`getProximaEtapa` all confirmed deleted (grep: 0 matches anywhere in `src/`). `candidaturasService.ts:436-448` confirms `updateCandidaturaStatus` no longer infers a next etapa — `novaEtapa = etapa_atual \|\| etapaAtualAnterior` (keeps etapa unchanged unless the caller passes one explicitly), so selecting 'Aprovado para Próxima Etapa' (`aprovado_proxima`, a real `status_candidatura` enum value) never writes a dead M1 `etapa_atual` value. |
| 2 | Editar uma vaga e recarregar mantém pesos/testes + persiste config, hidratando só colunas existentes; ids de teste do cargoTemplate casam com o runtime do container (FUNIL-04, FUNIL-05) | ✓ VERIFIED | `CriarEditarVagaPage.tsx` hydration (L167-184) reads only real `VagaRow` columns (cross-checked against `database.types.ts` vagas Row — no `carga_horaria`/`descricao_completa`/`requisito_diferencial` phantom names remain). `configVagaService.ts` `updateVagaBase` writes the same 14 real columns + status; wired to a "Salvar alterações" CTA. `testeContract.ts` + `AvaliacaoContainer.tsx`'s exported `CONTAINER_RECOGNIZED` + the contract test (`testeContract.test.ts`, 10/10) assert every `cargoTemplates` teste id maps into a container-recognized card id — no more verbatim-copy default-'mc' misroute. |
| 3 | Um recrutador não consegue rejeitar via UPDATE direto de `candidaturas.status` sem justificativa/auditoria; `registrar_decisao` preserva a decisão anterior no histórico (FUNIL-02, FUNIL-09) | ✓ VERIFIED | DB: `guard_rejeicao_auditada()` + `trg_candidaturas_guard_rejeicao` (migration `20260709000010`) RAISEs `check_violation` on any bare `status→rejeitado` UPDATE that is neither flag-sanctioned nor accompanied by an etapa transition — read + confirmed verbatim. `registrar_decisao` (migration `20260709000012`) sets the sanctioned flag + folds status/etapa/justificativa into one UPDATE. `decisao_final_historico` (migration `20260709000011`) + `snapshot_decisao_final` AFTER UPDATE trigger archives `OLD.*` (incl. `por_usuario`) before every UPSERT overwrite. UI: `UpdateStatusModal.tsx` routes any `novoStatus==='rejeitado'` through `useRegistrarDecisao` (never `useUpdateCandidaturaStatus`) gated on a ≥50-char justificativa — confirmed both by reading the component and by the dedicated regression test (`UpdateStatusModal.test.tsx`, 3/3, asserts `mutateStatus` is NOT called on reject). 25-07-SUMMARY records live PROD behavioral smokes A/B/D (8/8 total) exercising exactly this guard + history table; `database.types.ts` regen (containing `decisao_final_historico`) corroborates the live apply. **Residual (accepted, documented, not a gap):** the `ComparativoCandidatosPage.handleRejeitar` inline reject path (`updateCandidaturaEtapa(id,'rejeitado')`) is audited (fires `avancar_etapa`, passes the guard's etapa-transition branch) but does not require a justificativa — this was explicitly surfaced and accepted-as-residual by Fernando during Phase 25 planning (`.planning/todos/pending/funil-02-comparativo-reject-justificativa.md`, dated 2026-07-09, reason: "M4 é hardening, não expansão"). Does not weaken RNF-07a (no auto-reject by score is possible via this path; a human still clicks reject and the action is audited). |
| 4 | Editar opções de uma vaga ATIVA é bloqueado/controlado por guard de status (FUNIL-11) | ✓ VERIFIED | `upsert_pergunta_opcoes_metadata` (migration `20260709000013`) now resolves the pergunta's vaga status+owner BEFORE the DELETE/regenerate, hard-blocks with `P0001` when `v_status <> 'rascunho'`, and enforces `rh` ownership (`created_by = auth.uid()`, administrador bypass) — read verbatim, matches the FUNIL-11 (A29) requirement. 25-07-SUMMARY records live smokes E1 (active vaga → P0001, blocked), E2 (non-owner rh → 42501, blocked), E3 (owner/administrador on rascunho → ok) — all PASS. |
| 5 | Navegação do hub RH usa `candidatura.id` (com 404 no hub) e as affordances mortas — menus, badges 12/5, botões no-op, tiles "-", os no-op de avançar/rejeitar da DecisaoFinalPage e as telas mock A14/A37 — ficam ligadas ou ocultas (UX-03, UX-06) | ⚠️ PARTIAL | **Hub nav + 404 (UX-03): VERIFIED.** `KanbanBoard.onViewPerfil(candidatura.id)`, `CandidatosRHPage.handleVerPerfil` (both card + table dropdown call sites pass `candidatura.id`, zero `candidato?.id` remaining), `HubCandidatoRH.tsx` renders an in-shell "Candidatura não encontrada" GlassCard gated on the settled query (`!loadingContexto && (errorContexto \|\| !contexto)`) — all read and confirmed; regression tests present (`hubNotFound.test.tsx` 6/6, `KanbanBoard.test.tsx` 6/6). **Dead-affordance sweep (UX-06): PARTIAL.** Confirmed removed: `RHSidebar` hardcoded `badge:12`/`badge:5` (grep: 0 `badge:` assignments remain), `RHTopBar` no-op global search (`handleSearch`/`Buscar candidatos` — 0 matches), `CriarEditarVagaPage` "Usar da Biblioteca" buttons (removed in 25-03), `DecisaoFinalPage`'s no-op `onAvancar={()=>{}}`/`onRejeitar={()=>{}}` passthrough (0 matches; `ComparativoScreen.onAvancar`/`onRejeitar` made optional + `showActions` gate), and the two mock screens A14 (`ConfiguracoesPage.tsx`, 51 lines, empty-state "Gestão de usuários ainda não disponível", `RoleGuard(administrador)` intact in routes.tsx) / A37 (`MeuPerfilPage.tsx`, 46 lines, "Edição de perfil em breve", `RoleGuard(rh,administrador)` intact). **NOT addressed** (see Gaps): the dead "menus" (CandidatosRHPage's 'Enviar Email'/'Enviar WhatsApp'/'Exportar PDF' dropdown items — no onClick, both card + table views) and the "-"/fake per-vaga tiles (VagasRHPage 'Em análise'/'Aprovados' always render 0 for RH sessions — a structural, not cosmetic, defect in `enriquecerVaga`'s candidatoId gate). Both are named explicitly in UX-06's own requirement text and in `25-UI-SPEC.md` §4's dead-affordance table; neither is in any of the 8 plans' `files_modified`. 25-06-SUMMARY.md self-discloses the tiles gap as left out of scope. |

**Score:** 8/9 truths fully verified, 1 truth (#5) partially verified — the UX-03 half is solid; the UX-06 half closed 5 of 7 documented items and left 2 open.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/KanbanBoard.tsx` | 6 real stages, M2 write-path drag, terminal pills, candidatura.id nav | ✓ VERIFIED | Read in full; matches exactly |
| `src/features/vagas/types/vagasTypes.ts` | EtapaProcesso aliased to DB enum; dead M1 maps deleted | ✓ VERIFIED | Alias confirmed; grep for all named dead maps = 0 matches repo-wide |
| `src/components/modals/UpdateStatusModal.tsx` | Reject routes through registrar_decisao, ≥50-char gate | ✓ VERIFIED | Read in full; test suite pins the contract (3/3) |
| `src/lib/testes/testeContract.ts` | Canonical template↔container test-id contract | ✓ VERIFIED | Read in full; exported + consumed by `AvaliacaoContainer.deriveCards`; contract test 10/10 |
| `src/components/pages/CriarEditarVagaPage.tsx` | Real-column hydration + updateVagaBase | ✓ VERIFIED | Hydration reads only real columns cross-checked against `database.types.ts`; "Salvar alterações" CTA wired |
| `supabase/migrations/20260709000010..000014` (5 files) | Guard trigger, history table, registrar_decisao amend, upsert guard, submit flag | ✓ VERIFIED | All 5 read verbatim; well-formed PL/pgSQL, SECURITY DEFINER + search_path='' + REVOKE-then-GRANT pattern consistent with repo conventions |
| `database.types.ts` | Regenerated post-apply, contains decisao_final_historico | ✓ VERIFIED | `decisao_final_historico` present at L1274; git-tracked commit `b769f44` dated 2026-07-12 |
| `.github/workflows/ci.yml` | tsc baseline re-pinned to measured 107 | ✓ VERIFIED | Independently re-measured `npx tsc --noEmit` = 107, matches the pin |
| `src/components/pages/CandidatosRHPage.tsx` (dropdown menus) | Dead 'Enviar Email/WhatsApp/Exportar PDF' wired or removed | ✗ NOT ADDRESSED | Still present, zero onClick, both card (L444-456) and table (L802-814) views |
| `src/components/pages/VagasRHPage.tsx` (per-vaga tiles) | Real or removed 'Em análise'/'Aprovados' counts | ✗ NOT ADDRESSED | Structurally always 0 for RH sessions (see gap) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `KanbanBoard` drag/drop | `avancar_etapa` trigger | `useUpdateCandidaturaEtapa` → `triagemService.updateCandidaturaEtapa` | ✓ WIRED | Read call chain end-to-end |
| `UpdateStatusModal` reject | `registrar_decisao` RPC | `useRegistrarDecisao` | ✓ WIRED | Read + test-pinned |
| `registrar_decisao` reject branch | `guard_rejeicao_auditada` trigger | `set_config('app.rejeicao_sancionada','on',true)` (txn-local GUC) | ✓ WIRED | Read verbatim in both migration files; flag write precedes the sanctioned UPDATE |
| `submit_candidatura_atomic` knockout | `guard_rejeicao_auditada` trigger | same GUC flag | ✓ WIRED | Read verbatim — flag set immediately before the knockout UPDATE |
| `deriveCards` (AvaliacaoContainer) | `testeContract.templateTesteToContainerCards` | direct import + call | ✓ WIRED | Read + contract test asserts against the container's own exported `CONTAINER_RECOGNIZED` (not a replica) |
| `CandidatosRHPage`/`KanbanBoard` "Ver Perfil" | `/rh/candidatos/:id` hub route | `candidatura.id` | ✓ WIRED | All call sites confirmed forwarding `candidatura.id` |
| `VagasRHPage` per-vaga tiles | real candidate counts | `useVagas` → `listVagas` → `enriquecerVaga` | ✗ NOT WIRED (for RH) | `enriquecerVaga` only computes real counts when `candidatoId` is truthy; RH sessions have `authStore.candidato === null`, so the counts are perpetually 0 for the RH-facing page |

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| FUNIL-02 | ✓ SATISFIED | Guard trigger + registrar_decisao amend + UpdateStatusModal reroute; live smokes A/B (25-07) |
| FUNIL-03 | ✓ SATISFIED | KanbanBoard 6 real stages + M2 write-path |
| FUNIL-04 | ✓ SATISFIED | Real-column hydration + updateVagaBase; tsc −9 confirms phantom reads gone |
| FUNIL-05 | ✓ SATISFIED | testeContract.ts + contract test (10/10) |
| FUNIL-06 | ✓ SATISFIED | Dead M1 maps deleted; updateCandidaturaStatus no longer auto-advances |
| FUNIL-09 | ✓ SATISFIED | decisao_final_historico + snapshot trigger; live smoke D (25-07) |
| FUNIL-11 | ✓ SATISFIED | upsert_pergunta_opcoes_metadata status+ownership guard; live smokes E1-E3 (25-07) |
| UX-03 | ✓ SATISFIED | candidatura.id at every nav call site + in-shell 404 |
| UX-06 | ⚠️ PARTIAL | 5/7 documented dead-affordance items closed; dead dropdown menus + fake per-vaga tiles remain (see Gaps) |

**Note on REQUIREMENTS.md bookkeeping (process finding, not a code gap):** `.planning/REQUIREMENTS.md` still shows FUNIL-02, FUNIL-03, FUNIL-06, FUNIL-09, and FUNIL-11 as unchecked `[ ]` / "Pending" in the phase-25 coverage table, even though the code-level verification above confirms all five are actually delivered and (for -02/-09/-11) live-smoked on PROD. Only the 25-03/25-04/25-05 docs commits touched `REQUIREMENTS.md`; the 25-01, 25-02, 25-06, 25-07, and 25-08 "docs complete" commits did not update the requirements checkboxes/coverage table for the requirements they closed. This is a documentation-hygiene gap, not a functional one — recommend a follow-up commit syncing REQUIREMENTS.md before milestone audit, since a milestone-level auditor reading only REQUIREMENTS.md would currently (incorrectly) conclude 5 of 9 Phase-25 requirements are still open.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/pages/CandidatosRHPage.tsx` | 444-456, 802-814 | No-op DropdownMenuItem (no onClick) | ⚠️ Warning | Dead affordance — recruiter clicks "Enviar Email"/"Enviar WhatsApp"/"Exportar PDF" and nothing happens; capability-lying UI the phase's own UX-06 intent was to eliminate |
| `src/features/vagas/services/vagasService.ts` | 87-89 | Silent early-return producing stale/zero derived data for a caller class (RH) the function wasn't designed for | ⚠️ Warning | VagasRHPage per-vaga tiles always show 0 regardless of real data — same substance as the audited "'-' literal" finding, just a different placeholder value |
| `.planning/REQUIREMENTS.md` | 47,48,51,54,56 | Checkbox/coverage-table not updated for delivered+live-smoked requirements | ℹ️ Info | Documentation drift only; does not affect runtime behavior |

No debt markers (`TBD`/`FIXME`/`XXX`) found in any Phase-25-touched file. No score-based auto-reject logic found anywhere in the 5 new migrations or the touched TS files — RNF-07a invariant preserved.

### Human Verification Required

The following were flagged by the plans themselves as deferred to end-of-phase HUMAN-UAT (browser-only, cannot be grep-verified) and remain open:

1. **Kanban drag visual round-trip**
   **Test:** Drag a candidatura card between two of the 6 working columns in a real browser session; confirm the card moves, the etapa updates, and a page reload preserves the new column.
   **Expected:** Card lands in the target column; no console error; `etapa_atual` persists across reload.
   **Why human:** Requires a real pointer/DnD backend (react-dnd's HTML5Backend) and visual confirmation of drop-target rendering — RTL/jsdom cannot exercise native drag events end-to-end.

2. **Editar Vaga round-trip fidelity (edit → reload)**
   **Test:** Edit base fields (salário min/max, jornada, responsabilidades, perfil_ideal/"pessoa certa", diferenciais) + config (pesos/testes) on an existing vaga, save, then reload the page.
   **Expected:** All edited values reappear pre-filled after reload — no field reverts to blank/default.
   **Why human:** 25-03-SUMMARY explicitly defers this ("Round-trip fidelity is the deferred HUMAN-UAT"); the unit test only proves the writer sends the right payload, not that the browser round-trips it.

3. **RH hub 404 + reflowed sidebar/topbar/empty-states (visual)**
   **Test:** Navigate to `/rh/candidatos/<invalid-id>`; visit `/rh/configuracoes` and `/rh/perfil`; check the RHSidebar/RHTopBar after the badge/search removal.
   **Expected:** "Candidatura não encontrada" renders cleanly (no layout break); the two empty-state screens render centered with no dangling containers; sidebar/topbar reflow with no visual gap where the badges/search used to be.
   **Why human:** Visual layout/reflow quality cannot be assessed from source code alone.

4. **DecisaoFinalPage embedded comparativo (no dangling action row)**
   **Test:** Open a candidatura's Decisão Final page and confirm the embedded comparison table renders with no "Ação" column/row at all (not a disabled one).
   **Expected:** Clean table, no empty gutter where Avançar/Rejeitar buttons used to be.
   **Why human:** Visual confirmation of the conditional row removal.

### Gaps Summary

Phase 25 delivered the hard, security-relevant part of its goal solidly: the reject-without-audit-trail hole (FUNIL-02) is closed both in the DB (a new hybrid guard trigger, live-smoked on PROD) and in the UI (UpdateStatusModal reroute, unit-tested); decision amendments are now archived (FUNIL-09); option-edit guarding on active/non-owned vagas is enforced (FUNIL-11); the Kanban/enum/Editar-Vaga/test-id-contract drift (FUNIL-03/04/05/06) is verifiably gone from the touched files, independently re-confirmed by re-running tsc (107, matches), the full test suite (781/781, matches), and the build (green). RNF-07a (no auto-reject by score) is preserved everywhere touched.

The one real gap is the second half of the phase's own stated goal — "o hub RH e as affordances mortas são corrigidos/ocultados" — where 2 of the 7 items the phase's own UI-SPEC/RESEARCH/REQUIREMENTS text named under UX-06 were not touched by any of the 8 plans: the no-op "Enviar Email/WhatsApp/Exportar PDF" dropdown menu on the Candidatos list, and the RH-facing per-vaga candidate-count tiles on VagasRHPage (which are not merely unwired but structurally gated to zero for every RH session by a candidate-only code path in `enriquecerVaga`). The 25-06 plan's own SUMMARY discloses the tiles item as an explicit scope exclusion; the dropdown-menu item was not mentioned as excluded anywhere and appears to have simply been missed (CandidatosRHPage.tsx was never in any plan's `files_modified`).

Separately (not scored as a gap, but worth surfacing): REQUIREMENTS.md's checkbox/coverage table was not kept in sync — 5 of the 9 delivered requirements still show as unchecked/"Pending" there. A milestone-level audit reading only that file would misjudge Phase 25 as incomplete on requirements that are, per this code-level verification, actually done.

**This UX-06 shortfall looks like an incomplete sweep, not an intentional deviation** (unlike the separately-documented and Fernando-accepted `funil-02-comparativo-reject-justificativa` residual, which already has a tracked todo + explicit sign-off). No override is suggested for the dropdown-menu/tiles gap because there is no evidence anyone made a deliberate call to leave it — it was simply out of file-scope for the plans that ran. If the developer wants to accept it as a residual anyway (e.g., "menus/tiles are lower priority than the security fixes, tracked for a follow-up"), the appropriate action is either (a) a quick closure plan (2 small, low-risk fixes — remove/wire 3 dropdown items; give VagasRHPage tiles a role-aware count path or drop them) or (b) an explicit override added to this VERIFICATION.md's frontmatter with a reason + acceptor + date, mirroring the pattern already used for the comparativo-justificativa residual.

---

*Verified: 2026-07-12T03:58:36Z*
*Verifier: Claude (gsd-verifier)*
