---
status: diagnosed
trigger: "Phase 52 UAT gaps G-52-4 (prazo contradiz «Próximo passo» concluído), G-52-4b (caixa do «Próximo passo» parece botão), G-52-6 (card rejeitado ilegível no painel) — /candidato/dashboard"
created: 2026-10-12T05:00:00Z
updated: 2026-10-12T05:40:00Z
goal: find_root_cause_only
symptoms_prefilled: true
---

## Current Focus

hypothesis: three independent root causes, all confirmed (see Resolution)
test: done — G-52-4 reproduced at runtime (scratchpad Vitest, RED on desired assertion); G-52-4b by class diff + git history; G-52-6 by numeric WCAG over the composited layer stack + scope trail in 51/52 docs
expecting: n/a
next_action: return ROOT CAUSE FOUND x3 to the orchestrator (diagnose-only; no source edits)
bug_class: Bohrbug (all three deterministic, render-time, no timing dependence)

rca_branching:
  G-52-4:
    candidate_causes:
      - "code: prazo line (DashboardCandidatoPage.tsx:425-444) derives only from etapa_atual + slaLookup; never reads `concluidas` (CONFIRMED)"
      - "config/data: config_sla_etapa row avaliacao_assincrona carries candidate-side copy «conclua em até 7 dias» (20260721000002:102) — correct for the pending state, not a defect"
      - "environment: stale bundle/cache in PROD — ELIMINATED (no src diff origin/main..HEAD; repro in jsdom on current source)"
    and_gate: "yes, two conditions: (1) D-27 deliberately keeps etapa_atual='avaliacao_assincrona' after completion (no DB change), and (2) the prazo line keys only on etapa_atual. (1) is a decision, not a defect; the fix belongs to (2)."
  G-52-4b:
    candidate_causes:
      - "code: neutral span (:508) keeps the chrome of the old dead button (666be509, 2026-08-26) — near-identical to the Retirar button (7d405022/45-09) (CONFIRMED)"
      - "spec: 52-UI-SPEC :315-319 and :572 prescribe reusing that span UNEDITED (typography gate would flag its font-medium) — why 52-04 could not change it"
    and_gate: "yes: span chrome + Retirar chrome + identical border-t dividers in adjacent rows. 52-04 raised exposure by routing a long sentence into the span directly above the Retirar button."
  G-52-6:
    candidate_causes:
      - "code: rejected box text-sm text-white/60 on bg-white/5 inside GlassCard(white/15, hover /25) inside GlassPanel(white/15) — three white veils over a mid-tone gradient (CONFIRMED numerically)"
      - "code: local getStatusInfo map (:133-134) red-300 on red-500/20 (CONFIRMED numerically)"
      - "process/scope: 52-RESEARCH:618 ruled the dashboard occurrence «já é text-white/60 — não mexer», on the unmeasured 51-UI-REVIEW premise that the glass card is dark; 52-06 files_modified excludes the dashboard (CONFIRMED)"
      - "environment: background-attachment: fixed — contrast varies with scroll; worst over the turquoise lobe (measured across the whole image)"
    and_gate: "yes for the 'why not fixed': the low-contrast stack AND the research exclusion based on an unmeasured premise."

## Symptoms

expected: |
  G-52-4: with all assessments concluded, no prazo line contradicts «Avaliações concluídas — aguardando a equipe».
  G-52-4b: the informational «Próximo passo» text does not look like a button (no border equal to «Retirar minha candidatura»).
  G-52-6: rejected candidacy card on the dashboard is legible — «Agradecemos seu interesse na Beauty Smile.» and «Rejeitado» badge with adequate contrast.
actual: |
  G-52-4: «Avaliação liberada — conclua em até 7 dias corridos. (Estimativa)» still shown with all assessments concluded (+claude6, 3a9254c3, Consultor fdbe1a4a).
  G-52-4b: «Próximo passo» text sits in a box with the same border as the «Retirar minha candidatura» button.
  G-52-6: «Agradecemos seu interesse na Beauty Smile.» small and light-grey on light background (DashboardCandidatoPage.tsx:429 per operator — that line number is from the 51-17 era; today it is :456-458); «Rejeitado» badge low contrast (+claude8, Social Media e897f709, knockout).
errors: none
reproduction: UAT 52 tests 4 and 6 (PROD front from origin/main)
started: discovered 2026-10-12 UAT

## Eliminated

- hypothesis: "PROD runs a stale bundle / the source differs from what was UAT-tested"
  evidence: "git diff origin/main HEAD -- src/ is empty; c5ab73b2 (52-04 feat) is an ancestor of origin/main; the defect reproduces in jsdom on the current source"
  timestamp: 2026-10-12T05:15:00Z

- hypothesis: "G-52-4 comes from the config text being wrong for the concluded state (data defect)"
  evidence: "config_sla_etapa avaliacao_assincrona text (20260721000002:102, no later UPDATE in any migration) is correct for the PENDING state; the problem is that the dashboard keeps showing it after 52-04 derives `concluidas`. Changing the config would break the pending case."
  timestamp: 2026-10-12T05:15:00Z

- hypothesis: "G-52-6 badge colors come from a shared status-badge map, so fixing it ripples elsewhere"
  evidence: "the «Rejeitado» badge uses the LOCAL getStatusInfo (DashboardCandidatoPage.tsx:125-140). The red-500/20 + red-300 IDIOM recurs (TriagemTable.tsx:106, AgendamentoBlock.tsx:79-80, AgendamentoCandidatoCard.tsx:62, SlaBadge.tsx:31, AnaliseIABlock.tsx:55, ComparativoScreen.tsx:155) but none import the dashboard map; most sit on RH dark-blue panels."
  timestamp: 2026-10-12T05:30:00Z

## Evidence

- timestamp: 2026-10-12T05:00:00Z
  checked: .planning/debug/knowledge-base.md
  found: file does not exist
  implication: no known-pattern candidate (Phase 0 empty)

- timestamp: 2026-10-12T05:05:00Z
  checked: src/components/pages/DashboardCandidatoPage.tsx (592 lines, read in full)
  found: |
    :363 `const concluidas = idsAvaliacoesConcluidas.has(candidatura.id)` — in scope for the whole card.
    :364 statusInfo and :367 stepCTA consume `concluidas`.
    :425-444 the prazo line: rotuloReabertura(...) ? ... : <PrazoEstimadoLinha rotulo={candidaturaEncerrada(etapa,status) ? null : rotuloDeEspera(slaLookup.get(etapa_atual))}/> — `concluidas` is NOT consulted.
  implication: G-52-4 mechanism — 52-04 wired its predicate into 2 of the 3 per-card derived lines; the third (prazo) still reads only etapa_atual.

- timestamp: 2026-10-12T05:06:00Z
  checked: supabase/migrations/20260721000002_config_sla_etapa.sql:102; src/features/timeline/hooks/useSlaEtapas.ts:24-29; src/features/timeline/components/PrazoEstimadoLinha.tsx
  found: "('avaliacao_assincrona', 7, 'dias_corridos', 'Avaliação liberada — conclua em até 7 dias corridos.')"; rotuloDeEspera returns rotulo_candidato when prazo_valor != null; PrazoEstimadoLinha renders Clock + text + chip «Estimativa» (text-xs).
  implication: the exact UAT string; etapa_atual stays avaliacao_assincrona after completion by D-27 ("não muda status no banco").

- timestamp: 2026-10-12T05:08:00Z
  checked: 52-04-PLAN.md:119, 52-UI-SPEC.md:572 (D-27 row), 52-CONTEXT.md:142 (D-27)
  found: plan and spec scope D-27 to «Próximo passo» (stepCTA) + selo (statusInfo) only; neither mentions the prazo/estimativa line.
  implication: scope omission, not an implementation slip — the spec never said what the prazo line does in the concluded state.

- timestamp: 2026-10-12T05:10:00Z
  checked: src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx:98-101
  found: vi.mock('@/features/timeline/hooks') → `rotuloDeEspera: () => null`, lookup empty. The only test of the concluded state switches the prazo line OFF.
  implication: why not caught — the test population could not contain the contradiction (population-vazia pattern).

- timestamp: 2026-10-12T05:20:00Z
  checked: runtime repro (scratchpad only — copy of concluidas.test with rotuloDeEspera returning the PROD string; scratch vitest config extending vite.config.ts; repo untouched)
  found: |
    (a) assertion "concluded → prazo line present": PASS (bug reproduced); original 4 tests of 52-04 still PASS with the line on — none asserts its absence.
    (b) assertion "concluded → prazo line absent" (the gap's truth): FAIL with «Avaliação liberada — conclua em até 7 dias corridos.» in the DOM.
    (c) control "one pending → prazo line present": PASS.
  implication: G-52-4 CONFIRMED at runtime; the falsification test bites.

- timestamp: 2026-10-12T05:22:00Z
  checked: DashboardCandidatoPage.tsx:508 vs RetirarCandidaturaAcao.tsx:163
  found: |
    span (informational): `inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80`
    Retirar (real button): `inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-normal rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 ...`
    Same radius, same border-white/20, same padding, same size and color; the informational span is even MORE filled (bg-white/10 vs /5). Both rows open with `border-t border-white/10` (:482 pt-4, Retirar :148 pt-3).
  implication: the non-actionable pill reads as a sibling of the actionable button.

- timestamp: 2026-10-12T05:24:00Z
  checked: git log -S on the span class; git show 666be509 (2026-08-26) and 7d405022 (45-09, 2026-08-06)
  found: 666be509 turned the dead "Acompanhar candidatura" <button> into a <span> but kept the button's neutral-variant chrome (`bg-white/10 ... border border-white/20`, px-4 py-2 rounded-lg). The Retirar button (45-09) predates it with the same chrome.
  implication: the "looks like a button" is residue of the old button styling, kept when the element stopped being a button.

- timestamp: 2026-10-12T05:25:00Z
  checked: funilNavMap.ts rotaCandidato per etapa; getStepCTA (:166-181)
  found: span (destino null) renders for inscricao, triagem, entrevista_* (but those branch to AgendamentoCandidatoCard), decisao_final, aprovado, unknown etapa («Acompanhar candidatura») and the 52-04 concluded state. The only action state is the turquoise <button> (:496-506), a different element.
  implication: the box is shared ONLY by no-action states — removing its chrome is safe for every consumer.

- timestamp: 2026-10-12T05:26:00Z
  checked: 52-UI-SPEC.md:313-319, :572; 52-PATTERNS.md:690; scripts/p52_tipografia.cjs
  found: UI-SPEC requires the span be reused "sem editar" because any rewritten line carrying `font-medium` fails the p52 typography sweep (bans font-medium/font-bold, text-xs/lg/xl/3xl.., md:text-2xl on ADDED lines). It quotes the span classes `border-white/20 bg-white/10 text-white/80` as the prescribed look.
  implication: the box was locked by spec; a fix must amend the spec and write the new span line without font-medium (text-sm or text-base, weight 400/600).

- timestamp: 2026-10-12T05:28:00Z
  checked: DashboardCandidatoPage.tsx:450-468 (rejected box + badge); ui/glass.tsx variantStyles; BackgroundImage.tsx; gradient asset 72212e27...jpeg
  found: |
    Stack: image → bg-black 15% overlay → GlassPanel bg-white/15 → GlassCard bg-white/15 (`hover` → bg-white/25) → box bg-white/5 border-white/10 → «Agradecemos» text-sm text-white/60 (14px); feedback text-base text-white/80.
    Badge: `bg-red-500/20 border border-white/20` + icon/label `text-red-300`, label `font-medium` (:463-467), from local getStatusInfo (:133-134).
    Background is a mid-tone turquoise/violet gradient, background-attachment: fixed (contrast changes with scroll).
  implication: the "fundo claro" is real — two white veils + optional hover veil over a mid-tone image.

- timestamp: 2026-10-12T05:32:00Z
  checked: numeric WCAG (scratchpad script, every pixel of the downscaled background; models with/without backdrop-saturate-150 and with/without card hover; Tailwind 3.4 palette)
  found: |
    «Agradecemos» white/60 on box: darkest 3.37 · median 2.23 · turquoise 1.62 (hover 2.80/1.98/1.52) — FAIL 4.5 everywhere.
    feedback white/80 on box: 4.66 · 2.79 · 1.88.
    «Rejeitado» red-300 on red-500/20: 3.55 · 2.10 · 1.45 (hover 2.82/1.80/1.32) — FAIL 4.5 everywhere.
    Same-pixel comparison with the 52-06 form card (one GlassCard, text-base white/70): 6.03 · 3.37 · 2.02 — the dashboard is ~1.5-1.8x worse on the same pixel (extra veils + 14px + /60).
    Even PURE WHITE on the dashboard box: 6.23 · 3.43 · 2.17 → text-class-only fixes (the 52-06 recipe) cannot reach 4.5 over the mid/turquoise region.
    Dark local surface bg-[#00109E]/xx inside the card, worst case over ALL pixels × hover × saturate: /40 white/80 3.14; /50 white/80 3.83, white 5.02; /60 white/80 4.69, white/90 5.48; /70 white/80 5.73.
    Sibling badges in the same map (median/turquoise): blue 2.09/1.39, yellow 2.52/1.72, green 2.48/1.63, gray 2.66/1.77.
    G-52-4b non-text: span border-white/20 vs card 1.11-1.61 (it is not a meaningful UI boundary either; removing it loses nothing).
  implication: G-52-6 CONFIRMED numerically; a fix needs a darker local surface (≥ #00109E/60 for white/80, or an opaque badge), not only lighter text.

- timestamp: 2026-10-12T05:34:00Z
  checked: 51-UI-REVIEW.md:46, 51-17-SUMMARY.md:257, 51-17-SESSAO-REAL.md:28, 52-RESEARCH.md:618, 52-CONTEXT.md:482, 52-06-PLAN.md files_modified/Task 2, 52-UI-SPEC.md:311,575
  found: |
    51-17 pointed at both occurrences (Formulario:547 and Dashboard:429).
    51-UI-REVIEW R2 reasoned "GlassCard white is bg-white/15 over the gradient with black overlay, so the card is DARK" and noted the dashboard line "usa text-sm text-white/60, outro tratamento" without measuring it.
    52-RESEARCH:618: «DashboardCandidatoPage.tsx:428-430 já é text-white/60 — não mexer».
    52-CONTEXT:482 and 52-06-PLAN files_modified/Task 2 list only FormularioCandidaturaPage.tsx; UI-SPEC rows :311/:575 only the form card.
  implication: the dashboard occurrence was EXCLUDED on purpose, on an unmeasured premise (white-family text = legible on "dark" glass). The defect was framed as "wrong colour family" (gray-900 on glass) instead of "insufficient contrast", so already-white text was assumed compliant.

- timestamp: 2026-10-12T05:36:00Z
  checked: tests/guards pinning current behavior
  found: |
    G-52-4: concluidas.test.tsx:98-101 mock (rotuloDeEspera → null) hides the line; encerrada.test.tsx:49-50 and reaberta.test.tsx:51-52 mock specific rotulos (unaffected unless the predicate changes); PrazoEstimadoLinha.test.tsx pins the component (unaffected if the fix is in the page). funnel/navbar/encerrada/reaberta mock useIdsAvaliacoesConcluidas → empty Set (unaffected).
    G-52-4b: concluidas.test.tsx:203-217 (no button in painel-proximo-passo; span not truncate/whitespace-nowrap); funnel.test.tsx:134-151 (text «Acompanhar candidatura» present). No test pins the span's border/bg classes.
    G-52-6: no test pins the rejected box classes or «Rejeitado» colors (encerrada.test:102-111 and funnel.test:200-230 assert text only). concluidas.test.tsx:210-211 PINS the neutral «Aguardando a equipe» selo `text-gray-300` / parent `bg-gray-500/20` — must change if the badge fix covers the whole map/selo.
    Gates: scripts/p52_tipografia.cjs (added lines: no font-medium/font-bold/text-xs/text-lg/text-xl/...); wait-state-copy.grep.test.ts does NOT scan DashboardCandidatoPage (only relevant if new copy promises e-mail).
  implication: listed per gap in Resolution.

## Resolution

root_cause: |
  G-52-4: The prazo line (DashboardCandidatoPage.tsx:425-444) derives its text only from etapa_atual via config_sla_etapa («Avaliação liberada — conclua em até 7 dias corridos.», 20260721000002:102). 52-04 (D-27) deliberately leaves etapa_atual='avaliacao_assincrona' after completion and computes `concluidas` (:363), but wires it only into statusInfo (:364) and stepCTA (:367) — the prazo line never reads it. Scope gap in D-27/52-04-PLAN/52-UI-SPEC:572 (prazo line not mentioned), hidden by concluidas.test mocking rotuloDeEspera → null.
  G-52-4b: The no-action «Próximo passo» span (:508) keeps the chrome of the button it replaced in 666be509 (rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/80) — effectively identical to the real «Retirar minha candidatura» button (RetirarCandidaturaAcao.tsx:163, 45-09). 52-UI-SPEC:315-319/:572 then locked that span "sem editar" (typography gate) and 52-04 routed the long concluded sentence into it, right above the Retirar button.
  G-52-6: The rejected box (:452-458) puts 14px text-white/60 on bg-white/5 inside GlassCard white/15 (hover /25) inside GlassPanel white/15 over a mid-tone fixed gradient → 1.5-3.4:1; the «Rejeitado» badge (local getStatusInfo :133-134, rendered :463-467) is red-300 on red-500/20 → 1.3-3.6:1. 52-06 did not cover it because 52-RESEARCH:618 explicitly excluded it («já é text-white/60 — não mexer»), inheriting the unmeasured 51-UI-REVIEW premise that the glass card is dark; 52-06 files_modified lists only FormularioCandidaturaPage.tsx.
fix: (not applied — find_root_cause_only)
verification: (n/a — diagnose-only; G-52-4 repro RED/GREEN-control evidence above)
files_changed: []
