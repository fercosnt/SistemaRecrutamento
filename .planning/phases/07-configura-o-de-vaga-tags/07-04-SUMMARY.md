---
phase: 07
plan: 04
subsystem: config-vaga (RH/Admin)
tags: [m2, ui, vagacfg, sliders, tags, publish-gate, glass]
requires:
  - 07-02 (enum_tag_opcao + pergunta_opcao_metadata + vagas jsonb cols + sync/publish RPCs + RLS)
  - 07-03 (config-vaga schemas/templates/types/service/hooks/publishGate)
provides:
  - TemplateVagaSelector (8 cargo cards, deep-copy-on-select, Trocar template AlertDialog)
  - PesosSliders (4 free sliders + live Soma X% indicator, no silent rebalance)
  - PerguntaWithTagsForm (choice-only tag rows + empty state)
  - BulkMarkDialog (Marcar tudo como informativa → neutro/0/null)
  - CriarEditarVagaPage real persistence wiring + non-rascunho publish guard
affects:
  - F8 knockouts / F10 score_match / F11 testes (consume the persisted config)
tech-stack:
  added: []
  patterns:
    - "Vendored shadcn primitives (versioned @radix-ui imports) need explicit callback param type annotations under TS strict"
    - "AlertDialog/Dialog title vs action vs description copy must be lexically distinct under getByText regex"
    - "status_vaga 4 live values — read authoritative dbStatus separately, gate Publicar CTA on rascunho (Pitfall 5)"
key-files:
  created:
    - src/features/config-vaga/components/TemplateVagaSelector.tsx
    - src/features/config-vaga/components/PesosSliders.tsx
    - src/features/config-vaga/components/PerguntaWithTagsForm.tsx
    - src/features/config-vaga/components/BulkMarkDialog.tsx
    - src/features/config-vaga/components/index.ts
  modified:
    - src/components/pages/CriarEditarVagaPage.tsx
    - .planning/phases/07-configura-o-de-vaga-tags/07-VALIDATION.md
decisions:
  - "Explicit callback param annotations on vendored-primitive event handlers (TS7006 fix; baseline stays 301)"
  - "Distinct title/action/description copy so Wave-0 getByText resolves a single node"
  - "dbStatus read separately from the legacy 3-value form union; Publicar gated on dbStatus === 'rascunho'"
metrics:
  duration: ~28min
  completed: 2026-06-07
  commits: 2 (+ metadata)
  tasks: 2
  files: 6
---

# Phase 7 Plan 4: Config Vaga UI Blocks + Persistence Wiring Summary

The three M2 RH-config blocks (TemplateVagaSelector, PesosSliders, the Tag Wizard =
PerguntaWithTagsForm + BulkMarkDialog) built inside the reused legacy Glass+Tabs shell, with the
stub `console.log` save replaced by real persistence (updateVagaConfig + client publishGate → the
`publish_vaga` RPC) and the Publicar CTA gated to `rascunho`-only vagas.

## What Was Built

**Task 1 — TemplateVagaSelector + PesosSliders (commit `ed4c2e5`)**
- `TemplateVagaSelector`: renders the 8 `cargoTemplates` as selectable Glass cards; on select,
  deep-copies the template's `pesos_avaliacao` + `testes_aplicaveis` into the parent form via
  `onSelect` (using `getCargoTemplateDefaults`, so mutating the payload never touches the source —
  D-04). Re-selecting a different template opens the "Trocar template?" AlertDialog (overwrite
  confirm; tags kept, pesos+testes overwritten). Toasts "Template {cargo} aplicado".
- `PesosSliders`: exactly 4 integer sliders (`triagem`, `work_sample_sjt`, `redacao_cultural`,
  `entrevista`) with a live "Soma: X%" indicator computed via `somaPesos` — accent `#35BFAD` +
  "pesos prontos para publicar" at 100, `#EF4444` + "Soma: X% (faltam Y%)" otherwise. No silent
  rebalance (D-08): dragging one slider only changes that key. Optional "Normalizar para 100%"
  button only touches values on explicit click. `big_five`/`cognitivo` render as muted read-only
  "contexto, não pontua" chips (D-07).
- `components/index.ts` barrel exports all four components.

**Task 2 — Tag Wizard + persistence wiring + publish guard (commit `ffb735b`)**
- `PerguntaWithTagsForm`: renders per-option tag rows (5-tag `Select` badge-colored per the
  UI-SPEC taxonomy + `peso` numeric -999..100 + nullable `nota_ia`) ONLY for
  `single_choice`/`multiple_choice` perguntas; non-choice perguntas show the empty-state copy
  "Nenhuma pergunta de escolha nesta vaga" (D-11). Unmarked option defaults to neutro/0/null.
- `BulkMarkDialog`: lightweight Dialog (not AlertDialog — reversible) whose "Marcar tudo como
  informativa" action resets every option to neutro/0/null (D-11).
- `CriarEditarVagaPage`: added a new ⚙️ Avaliação tab mounting the 3 blocks in the existing
  Glass+Tabs shell (D-01/D-02; legacy Básicas/Landing/Perguntas/IA fields untouched). The stub
  `handleSalvarRascunho`/`handlePublicar` console.log handlers are replaced: Salvar rascunho →
  `updateVagaConfig` (no validation); Publicar → client `publishGate` (D-12 errors fire ONLY on
  click, exact UI-SPEC copy) → on pass `publish_vaga` RPC (rascunho→ativa). The page reads the
  authoritative `dbStatus` and renders the Publicar CTA ONLY when `dbStatus === 'rascunho'`;
  ativa/inativa/arquivada show an informational state instead — no silent no-op publish (Pitfall 5).

## Verification

- All 4 Wave-0 component tests GREEN: TemplateVagaSelector (3), PesosSliders (3),
  PerguntaWithTagsForm (4), BulkMarkDialog (1) = 11 RTL assertions.
- Full Vitest: **395/395** passing across 36 files (the pre-existing LoadingProgress carryover is
  also GREEN now — no red).
- `npm run build` exit 0 (~4.6s).
- tsc baseline **301 = 301** (zero growth): the 4 net-new TS7006 implicit-any errors in
  vendored-primitive callbacks were fixed with explicit param annotations.
- `nyquist_compliant: true` flipped in 07-VALIDATION.md (every Phase-7 module now has a green
  automated verify).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Explicit callback param annotations on vendored-primitive handlers**
- **Found during:** Task 1 + Task 2 (tsc gate)
- **Issue:** The vendored shadcn primitives import Radix via versioned specifiers
  (`@radix-ui/react-slider@1.2.3`, etc.); under TS strict the `onValueChange`/`onOpenChange`
  callback params resolve to implicit `any` (TS7006), adding 4 net-new baseline errors (301→305).
- **Fix:** Annotated each handler param explicitly — `Slider onValueChange:(vals: number[])`,
  `AlertDialog/Dialog onOpenChange:(open: boolean)`, `Select onValueChange:(v: string)`.
- **Files modified:** PesosSliders.tsx, TemplateVagaSelector.tsx, BulkMarkDialog.tsx,
  PerguntaWithTagsForm.tsx
- **Commits:** ed4c2e5, ffb735b

**2. [Rule 1 - Bug] getByText ambiguity in Wave-0 dialog assertions**
- **Found during:** Task 1 (TemplateVagaSelector T3) + Task 2 (BulkMarkDialog)
- **Issue:** The AlertDialog title, action button, and description all carried the literal "Trocar
  template", so the test's `getByText(/Trocar template/i)` matched multiple nodes and threw.
  BulkMarkDialog had the same collision between its title and its trigger button.
- **Fix:** Made the copy lexically distinct — title "Trocar template?" / action "Sim,
  sobrescrever" / description "Trocar o template..." (non-contiguous, does not match the regex);
  BulkMarkDialog title set to "Resetar tags da pergunta" so only the button matches "Marcar tudo
  como informativa". All UI-SPEC load-bearing copy (live-sum, error toasts, empty state, template
  confirm body) preserved verbatim.
- **Files modified:** TemplateVagaSelector.tsx, BulkMarkDialog.tsx
- **Commits:** ed4c2e5, ffb735b

## Known Stubs

- **Tag Wizard empty-state in CriarEditarVagaPage** — the page mounts the Tag Wizard block as its
  empty-state ("Nenhuma pergunta de escolha nesta vaga") rather than wiring live per-pergunta tag
  rows. This is INTENTIONAL and plan-sanctioned (D-05): the SJT/choice question bank + the
  sync pipeline that feeds `PerguntaWithTagsForm` is deferred to **Phase 11**. The
  `PerguntaWithTagsForm` + `BulkMarkDialog` components themselves are fully built and Wave-0 tested
  for that phase; only the page-level data source is deferred. The `publishGate` knockout
  condition (condition 3) is therefore passed an empty `perguntas: []` and no-ops by design until
  Phase 11 supplies the question bank.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary surface introduced. All privileged
writes route through the existing role-checked DEFINER RPCs from Plan 02 (configVagaService → anon
client → RPC); the client publishGate is UX-only and the server `publish_vaga` RPC remains the
authoritative D-12 control.
