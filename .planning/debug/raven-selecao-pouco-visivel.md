---
status: diagnosed
trigger: "G-52-2 (Phase 52, UAT test 2): o estado SELECIONADO da alternativa é pouco visível — só um contorno turquesa fino sobre o fundo turquesa (print). Como a prova não deixa voltar a um item respondido, o candidato precisa enxergar com certeza o que marcou antes de avançar. Pedido: contorno grosso e de alto contraste (ex.: ring-4 branco ou escuro) + ícone de check no ladrilho escolhido; conferir o mesmo estado no celular."
goal: find_root_cause_only
symptoms_prefilled: true
created: 2026-10-12T04:10:51Z
updated: 2026-10-12T04:20:00Z
---

## Current Focus

bug_class: Bohrbug (deterministic — pure function of the static className and the static backdrop; every render, every device)
hypothesis: CONFIRMED — the selected-tile signal is a 2px accent-turquoise edge plus a 40%-alpha turquoise halo, with no fill and no shape cue. 52-03 moved the screen onto the turquoise `gradient` shell, which is the same hue as the signal. The halo vanishes and the border blends into the backdrop.
test: done — source read, 52-03 diff, UI-SPEC mandate, composited-contrast measurement over the real gradient image, differential against the two selected states that passed UAT
expecting: n/a
next_action: return ROOT CAUSE FOUND to the orchestrator (diagnose-only; no source edits)

reasoning_checkpoint:
  hypothesis: "The selected Raven tile is barely distinguishable because its only selected-state signal (AvaliacaoRavenScreen.tsx:310 `border-[#35BFAD] ring-2 ring-[#35BFAD]/40`) is an accent-colored 2px edge and a 40% halo. Since 52-03 it sits on a turquoise backdrop: `BackgroundImage gradient` + black overlay 15% + `Glass variant=white` (bg-white/15). The halo measures 1.08–1.84:1 against that backdrop. The border measures 2.28:1 against its own white tile and 1.23:1 against the backdrop where the grid falls on the turquoise band. There is no fill change (52-03 removed `bg-[#35BFAD]/10`) and no icon/text cue."
  confirming_evidence:
    - "Source: AvaliacaoRavenScreen.tsx:308-312. Selected = `border-[#35BFAD] ring-2 ring-[#35BFAD]/40` over `bg-white`. Unselected = `border-white/30` over `bg-white`, which renders as a plain white edge. The only visual delta is a 2px edge going white → turquoise."
    - "Measured: the gradient image (src/assets/72212e27…jpeg) was sampled 6x6 and composited with black 15% and white 15%. #35BFAD vs backdrop: min 1.23 / avg 2.85. Ring at 40% vs backdrop: min 1.08 / max 1.84. #35BFAD vs white tile: 2.28:1. All are below the WCAG 1.4.11 non-text minimum of 3:1."
    - "Differential: the two selected states that passed UAT (test 13 notas 1–5 `border-white/40 bg-white/25`; SJT MC `RadioGroupItem` dot) carry selection by a full-surface fill change or a glyph, never by an accent edge alone."
    - "History: the ring treatment was born in e2549a34 (2026-08-26) for a LIGHT page. Pre-52-03 there was no BackgroundImage, and the screen used slate text and a `bg-slate-200` trail. 52-03 (plan line 112 + UI-SPEC §Color accent item 6, 'existentes') kept it unchanged onto the turquoise gradient and dropped the 10% tint."
  falsification_test: "If the operator's screenshot showed a tile with a fill/tint or icon, or if the grid area of the backdrop were dark navy (where #35BFAD reaches ~4.6:1), the hypothesis would be weakened. The operator explicitly reports 'contorno turquesa fino sobre o fundo turquesa', which matches the turquoise-band case exactly."
  fix_rationale: "(diagnose-only) The fix must change the signal itself. It needs a high-contrast edge that does not depend on the backdrop hue (two-tone: dark inner border on the white tile + white outer ring on the glass) plus a shape cue (check badge). The backdrop is a deliberate brand decision that passed UAT test 2 and should not be changed."
  blind_spots: "(1) The exact pixel region behind the grid depends on viewport size, because the background is `cover` + `fixed`. The 6x6 sample bounds the range (1.23–4.61) but is not the operator's exact pixel. (2) backdrop-blur was not modeled; it averages the hue and does not change the conclusion. (3) The operator's screenshot was not available to this agent."
  candidate_causes:
    - "code: selected-state className = accent edge only (border-2 + ring-2 at 40%), no fill/shape cue; 52-03 removed the bg tint"
    - "spec/config: 52-UI-SPEC §Color accent item 6 + 52-03-PLAN line 112 mandated keeping the 'existing' treatment without re-checking it against the new backdrop"
    - "environment: backdrop changed from light page to turquoise `gradient` image (+ black 15% + glass white/15) in 52-03"
    - "stale build / cache (ELIMINATED — see Eliminated)"
  and_gate: "YES. The failure needs both (a) a selection signal that is only a thin edge in accent turquoise and (b) a backdrop in the same turquoise hue. On the pre-52-03 light page, (a) alone was legible: turquoise on white plus the 10% tint. (b) alone is harmless if the signal does not use the backdrop hue. The root cause is the conjunction. The fix belongs to (a), because (b) is a deliberate, UAT-approved brand decision."

## Symptoms

expected: (UAT test 2) A Prova cognitiva abre sobre o fundo gradiente da marca com vidro (glass) e véu escuro leve; matrizes em ladrilhos brancos legíveis; opções em grade de 8 no desktop e de 4 no celular; botão principal turquesa. Truth: a alternativa escolhida no item atual é inequivocamente visível antes de avançar — a prova não deixa voltar a item respondido.
actual: (verbatim) "o estado SELECIONADO da alternativa é pouco visível — só um contorno turquesa fino sobre o fundo turquesa (print). Como a prova não deixa voltar a um item respondido, o candidato precisa enxergar com certeza o que marcou antes de avançar. Pedido: contorno grosso e de alto contraste (ex.: ring-4 branco ou escuro) + ícone de check no ladrilho escolhido; conferir o mesmo estado no celular."
errors: None reported
reproduction: UAT test 2 in .planning/phases/52-hub-do-rh-dados-e-contato/52-UAT.md (candidatura 8e4bb7a0, conta +claude7, vaga Consultor, PROD). Abrir a prova Raven, escolher uma alternativa no item atual, observar o ladrilho escolhido (desktop e 360px).
started: Discovered during UAT of Phase 52 on 2026-10-12. Raven shell restyled in plan 52-03.

## Eliminated

- hypothesis: The operator saw a stale/cached build (render em cache), and the live code has a stronger selected state.
  evidence: The reported look ("contorno turquesa fino") matches the CURRENT source exactly (AvaliacaoRavenScreen.tsx:310). The pre-52-03 version would have shown a turquoise tint (`bg-[#35BFAD]/10`) on a light page, not a thin ring on turquoise. The 52-UAT header confirms the last code commit 5f091c8d is on origin/main. No version of the file has had a stronger selected state.
  timestamp: 2026-10-12T04:18:00Z

- hypothesis: Mobile uses different tile classes, so the defect might be desktop-only (or mobile-only).
  evidence: The tile className has no responsive variant. Only the grid container changes (`grid-cols-4 sm:grid-cols-8` / `grid-cols-3 sm:grid-cols-6`, line 238). Mobile renders the identical 2px signal on smaller tiles (~65px at 360px with 8 options, ~91px with 6, vs ~94/129px on desktop), so the defect is identical or proportionally worse on mobile.
  timestamp: 2026-10-12T04:18:00Z

## Evidence

- timestamp: 2026-10-12T04:10:51Z
  checked: .planning/debug/ (knowledge base, Phase 0)
  found: .planning/debug/ did not exist; no knowledge-base.md; MemPalace not consulted (not available in this agent)
  implication: no known-pattern candidate; open investigation

- timestamp: 2026-10-12T04:12:00Z
  checked: src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx:296-323 (answer grid)
  found: |
    Each option is a native <button type="button" aria-pressed={ativa} aria-label={`Alternativa ${numero}`}>.
    className = `rounded-lg border-2 bg-white p-2 transition-all ${ativa ? 'border-[#35BFAD] ring-2 ring-[#35BFAD]/40' : 'border-white/30 hover:border-white/70'}`.
    Content = <img className="h-full w-full object-contain"> (or a slate-900 number fallback). No icon, no text, no fill change on selection.
  implication: the ONLY selected-state visual delta is the 2px border colour (white → #35BFAD) plus a 2px box-shadow ring of #35BFAD at 40% alpha. bg-white extends under the border (background-clip border-box), so `border-white/30` and `hover:border-white/70` both render as white. Hover is invisible too.

- timestamp: 2026-10-12T04:13:00Z
  checked: backdrop chain — RavenShell (lines 62-75), src/components/BackgroundImage.tsx, src/assets/images/backgrounds.ts, src/components/ui/glass.tsx:43
  found: The grid sits inside `Glass variant="white"` (`bg-white/15 border-white/25` + backdrop-blur-lg). Behind it is a black overlay at 15%, then the `gradient` image, documented as "gradiente turquesa/azul (#35BFAD)". The base layer is #00109E.
  implication: The tile's surroundings are partly the SAME hue as the selection signal. A turquoise edge next to a turquoise backdrop reads as background, not as a mark.

- timestamp: 2026-10-12T04:16:00Z
  checked: WCAG contrast, measured. The gradient JPEG (7545x4500) was downscaled to 6x6 with `sips`. Each sample was composited with black@15% and then white@15% (scratchpad/contraste.cjs).
  found: |
    #35BFAD vs composited backdrop: min 1.23 / avg 2.85 / max 4.61 (min on the turquoise band, samples #3eb4ac/#41b4ac → backdrop #53a8a2/#55a8a2)
    ring #35BFAD@40% vs backdrop: min 1.08 / avg 1.49 / max 1.84 — never visible
    #35BFAD vs the white tile interior: 2.28:1
    white vs backdrop: min 2.80 / avg 6.50 / max 10.50
    #00109E vs white tile: 13.39:1 · slate-900 vs white tile: 17.85:1
  implication: |
    Every selected-state signal fails the WCAG 1.4.11 non-text minimum of 3:1 against its adjacent colours, wherever the grid falls on the turquoise band. The halo fails everywhere.
    A dark inner border (#00109E or slate-900) against the white tile clears it by 4–6x. A white outer ring against the backdrop clears it on average (avg 6.5) but not at the lightest warm corner (2.80), so a two-tone (dark + white) treatment is needed to be backdrop-independent.

- timestamp: 2026-10-12T04:17:00Z
  checked: git show c4e89b3e (52-03 Task 2 GREEN), the pre-52-03 file at 0b9e4202, and `git log -S"ring-2 ring-[#35BFAD]/40"`
  found: |
    Pre-52-03 selected = `border-[#35BFAD] bg-[#35BFAD]/10 ring-2 ring-[#35BFAD]/40`; unselected `border-slate-200 hover:border-slate-400`. There was no BackgroundImage: the screen rendered on the light page, with `text-slate-500` eyebrow and `bg-slate-200` progress trail.
    52-03 changed it to selected `border-[#35BFAD] ring-2 ring-[#35BFAD]/40` (tint REMOVED; key-decision "Alternativa marcada perde o bg-[#35BFAD]/10 … a marcação é a borda e o anel accent, que o plano manda manter") and wrapped the screen in RavenShell (turquoise gradient).
    The ring classes were born in e2549a34 (2026-08-26) for the light page.
  implication: The selected treatment was designed for a light backdrop. 52-03 changed the backdrop to the signal's own hue and removed the only fill cue, without re-evaluating the signal.

- timestamp: 2026-10-12T04:17:30Z
  checked: .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md:342 and 52-03-PLAN.md:112
  found: |
    UI-SPEC §Color, accent list item 6: "Alternativa marcada no Raven (`border-[#35BFAD] ring-2 ring-[#35BFAD]/40`) e barra de progresso — existentes."
    The plan says "alternativa marcada mantém `border-[#35BFAD] ring-2 ring-[#35BFAD]/40`".
    The same UI-SPEC (line 350-353) lists "os botões de nota da entrevista (selecionado = branco)" and "alternativa escolhida no SJT MC" as explicitly NOT accent.
  implication: The defect was specified, not improvised. The spec carried the treatment over as "existing", and the executor followed it. 52-03 coverage D5 (visual look) was `human_judgment: true`, rationale "sem conferência visual … o front não foi publicado". No gate before UAT looked at it.

- timestamp: 2026-10-12T04:18:30Z
  checked: differential — selected states that PASSED UAT
  found: |
    UAT test 13 (notas 1–5, EntrevistaScorecardInline.tsx:246-251): selected `border-white/40 bg-white/25 text-white` vs free `border-white/20 bg-white/5`. Selection is a FULL-SURFACE fill change, in white, plus role="radio" aria-checked.
    SJT MC candidate (SjtMultiplaEscolhaScreen.tsx:103-114): RadioGroupItem dot, a GLYPH cue.
    Hub SjtMcDetalhe.tsx:13,133: chosen alternative = border + lucide `Check` + the word «Escolhida», "NUNCA o accent".
  implication: Every passing case conveys selection by fill or by shape, in white or neutral. Raven is the only one that conveys it by a thin accent-hue edge alone. A fill change is not available for Raven, because the tile must stay solid white for the black-on-white drawing. So the signal must be a thick high-contrast edge plus a shape cue. The Check-icon precedent already exists in this phase.

- timestamp: 2026-10-12T04:19:00Z
  checked: non-visual state, and the tests that touch the tile (grep over src/**/*.test.ts(x)); ran AvaliacaoRavenScreen.shell + .conclusao
  found: |
    Non-visual: aria-pressed={ativa} on a native <button> named "Alternativa N", announced as toggle pressed/not pressed. The semantics are a toggle button, not radio/aria-checked like the notas precedent. No focus-visible style on the tile; keyboard focus relies on the UA outline.
    Tests: NO test asserts the border/ring classes, so nothing pins the low-contrast look. The tile contract IS pinned by:
      AvaliacaoRavenScreen.shell.test.tsx:107 (findByRole button name 'Alternativa 1'), :136 and :149 (aria-pressed 'true'), :169 (aria-pressed 'false'), :200 (click by role button)
      AvaliacaoRavenScreen.conclusao.test.tsx:88 (click by role button name 'Alternativa 1')
      AvaliacaoRavenScreen.shell.test.tsx:225-230 reads the SOURCE (grid classes must be literal; no `sm:${`)
    Baseline run: 2 files / 15 tests green.
  implication: |
    The defect passed every automated gate because the tests assert only the ARIA state, never visual distinctness.
    A fix that keeps <button aria-pressed> + aria-label touches no existing assertion. A fix that switches to role="radio"/aria-checked must update the 6 role queries above.
    The fix should ADD a test pinning the new selected classes (literal in the source, same JIT trap as the grid) and the presence of the check badge.

## Resolution

root_cause: "The Raven selected tile's only visual cue is `border-[#35BFAD] ring-2 ring-[#35BFAD]/40` (AvaliacaoRavenScreen.tsx:310). This is a 2px accent-turquoise edge plus a 2px 40%-alpha turquoise halo, with no fill change and no icon or text. 52-03 (per 52-UI-SPEC §Color accent item 6, 'existentes', and 52-03-PLAN:112 'mantém') kept this light-page treatment from e2549a34 and dropped the `bg-[#35BFAD]/10` tint. It also moved the screen onto the turquoise `gradient` shell (+ black 15% + Glass white/15). Measured: the halo is 1.08–1.84:1 against the backdrop; the border is 1.23:1 against the backdrop on the turquoise band and 2.28:1 against its own white tile, all below the 3:1 non-text minimum (WCAG 1.4.11). AND-gate: accent-only thin edge ∧ same-hue backdrop; neither alone produced the symptom. Mobile uses the identical tile classes (only the grid columns are responsive), so the defect is the same at 360px, on smaller tiles."
fix: (not applied — goal find_root_cause_only)
verification: (not applied)
files_changed: []
