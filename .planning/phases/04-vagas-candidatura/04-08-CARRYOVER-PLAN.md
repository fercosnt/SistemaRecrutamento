---
phase: 04
plan: 08-carryover
type: execute
wave: 4-carryover
depends_on: ["04-07", "04-08"]
files_modified:
  - src/components/pages/FormularioCandidaturaPage.tsx
autonomous: true
requirements: [VAGA-03, CAND-01, CAND-02, CAND-03]
tags: [phase-04, css-fix, tailwind, hotfix, uat-carryover, plan-04-07-cleanup]

must_haves:
  truths:
    - "Botão 'Enviar candidatura' renderiza visível (background-color resolvido) com contraste adequado em fundo branco"
    - "Loading state do botão (spinner durante upload/submit) também renderiza visível"
    - "Inputs <input> e <textarea> mostram focus border visível (não branco em branco) ao receber foco"
    - "Badge de tipo de contratação (CLT/PJ/etc.) renderiza com fundo colorido visível"
    - "Ícone de CV (FileText) renderiza com cor sólida (não invisível)"
    - "Ícone de Loader2 (loading state da página) renderiza com cor sólida"
    - "Zero ocorrências de classes Tailwind da escala numérica primary-N00 em src/components/pages/FormularioCandidaturaPage.tsx (grep retorna 0 matches)"
    - "Vitest full suite ainda passa (337 PASS / 1 pre-existing FAIL — sem regressão)"
    - "tsc --noEmit não introduz novos erros (baseline ≤ 320)"
    - "npm run build exit 0"
  artifacts:
    - path: src/components/pages/FormularioCandidaturaPage.tsx
      provides: form de candidatura com classes Tailwind válidas
      contains: "bg-primary"
  key_links:
    - from: src/components/pages/FormularioCandidaturaPage.tsx
      to: tailwind.config.* + src/styles/globals.css
      via: "classes Tailwind devem corresponder a tokens definidos no theme (primary.DEFAULT, sem escala numérica)"
      pattern: "bg-primary(?!-)"
---

<objective>
Hotfix do bug F-04-08-A capturado em UAT-J01 (Plan 04-08). O Plan 04-07 escreveu `FormularioCandidaturaPage.tsx` usando classes da escala numérica do Tailwind (`primary-100`, `primary-700`, `primary-800`) que não existem no `tailwind.config` deste projeto. Resultado: botão de submit invisível, inputs sem focus border, badge sem fundo, ícones sem cor — candidato literalmente não consegue submeter candidatura.

Substituir todas as 10 ocorrências de classes inválidas por equivalentes válidos usando o token `primary` (DEFAULT) + opacity modifier. Re-executar UAT-J01..J06 após o fix.
</objective>

<threat_model>
- Risco: ao trocar `bg-primary-700` → `bg-primary`, o tom visual muda (escala 700 era mais escura que DEFAULT). Mitigação aceita: o brand-primary do Beauty Smile é definido em `globals.css` via `--primary: var(--brand-primary)`. O DEFAULT já é a cor canônica. Tom 700 nunca foi acordado no design system.
- Risco: `bg-primary-100` (badge fundo claro) → `bg-primary/10` muda de cor sólida saturada para versão translúcida. Aceitável: ambos são "fundo claro com tom primary"; opacity modifier é o padrão Tailwind para tints/shades sem escala numérica explícita.
- Risco: `hover:bg-primary-800` (hover mais escuro) → `hover:bg-primary/90` muda hover de "tom mais escuro" para "tom 90% opaco". Aceitável: efeito visual de hover preservado, padrão Tailwind canônico.
- Não-risco: este é um hotfix puramente CSS. Zero mudança de comportamento JS, zero mudança de schema, zero mudança de API. RHF + Zod + cvUploadService + candidaturasService permanecem intactos.
</threat_model>

<task id="1" type="fix" depends_on="">
<title>Substituir classes Tailwind inválidas em FormularioCandidaturaPage.tsx</title>

<context>
Bug F-04-08-A documentado em `.planning/phases/04-vagas-candidatura/04-08-UAT.md` (seção "Findings desta sessão").

10 ocorrências em `src/components/pages/FormularioCandidaturaPage.tsx`:

| Linha | Classe inválida | Substituir por |
|-------|----------------|----------------|
| 405 | `text-primary-700` | `text-primary` |
| 418 | `bg-primary-700` + `hover:bg-primary-800` | `bg-primary` + `hover:bg-primary/90` |
| 462 | `bg-primary-100` + `text-primary-800` | `bg-primary/10` + `text-primary` |
| 490 | `text-primary-700` | `text-primary` |
| 536 | `bg-primary-700` + `hover:bg-primary-800` | `bg-primary` + `hover:bg-primary/90` |
| 601 | `focus:border-primary-700` | `focus:border-primary` |
| 616 | `focus:border-primary-700` | `focus:border-primary` |
| 632 | `focus:border-primary-700` | `focus:border-primary` |
| 664 | `focus:border-primary-700` | `focus:border-primary` |
| 699 | `focus:border-primary-700` | `focus:border-primary` |
</context>

<acceptance_criteria>
1. `grep -E "primary-(100|700|800)" src/components/pages/FormularioCandidaturaPage.tsx` retorna 0 linhas.
2. Botão submit (linha ~536) usa `bg-primary` e `hover:bg-primary/90`.
3. Loading button (linha ~418) usa `bg-primary` e `hover:bg-primary/90`.
4. Badge de contratação (linha ~462) usa `bg-primary/10` e `text-primary`.
5. Os 5 inputs (601, 616, 632, 664, 699) usam `focus:border-primary`.
6. Ícone Loader2 da página (linha ~405) e ícone FileText do CV preview (linha ~490) usam `text-primary`.
7. Build verde: `npm run build` exit 0.
8. Type-check sem novos erros: `npm run lint` (que é `tsc --noEmit`) ≤ baseline 320.
9. Vitest full suite ainda passa: `npm run test:run` retorna 337/338 (apenas 1 FAIL pre-existing LoadingProgress carryover Phase 2).
</acceptance_criteria>

<execution_strategy>
Edição mecânica via `Edit` tool com `replace_all: true` para classes que aparecem múltiplas vezes (`focus:border-primary-700` aparece 5x; `bg-primary-700` 2x; `hover:bg-primary-800` 2x; `text-primary-700` 2x).

**Sequência sugerida:**
1. `replace_all` `focus:border-primary-700` → `focus:border-primary` (5 inputs em uma operação).
2. `replace_all` `bg-primary-700` → `bg-primary` (botões submit + loading).
3. `replace_all` `hover:bg-primary-800` → `hover:bg-primary/90`.
4. `replace_all` `text-primary-700` → `text-primary` (Loader2 + FileText).
5. Edit pontual para badge: `bg-primary-100 text-primary-800` → `bg-primary/10 text-primary` (string única, replace_all OK).
6. Verificar com `grep -E "primary-(100|700|800)" src/components/pages/FormularioCandidaturaPage.tsx` → deve retornar zero.
7. Rodar `npm run build` para confirmar build verde.
8. Rodar `npm run test:run` para confirmar 337/338 PASS.
9. Commit: `fix(04-08-carryover): replace undefined Tailwind primary-NNN scale with primary DEFAULT in FormularioCandidaturaPage`

**Não tocar:** `tailwind.config.*` ou `globals.css`. A correção é exclusivamente no consumidor (a page). Adicionar uma escala primary-50..950 ao theme é uma decisão de design system maior (Phase 5+) e fora de escopo deste hotfix.
</execution_strategy>

<verification_steps>
1. Rodar `npm run build` → exit 0.
2. Rodar `grep -cE "primary-(100|700|800)" src/components/pages/FormularioCandidaturaPage.tsx` → output `0`.
3. Rodar `npm run test:run` → 337/338 PASS (carryover LoadingProgress não bloqueia).
4. **Re-executar UAT-J01..J06 manualmente** após o fix mergear (executor humano, mesmo runbook `04-08-UAT.md`). Atualizar checkboxes para PASS conforme cada cenário valida.
5. Após UAT 6/6 PASS, commit final: `docs(04-08-uat): UAT 6/6 PASS — Phase 4 manual validation complete (post-carryover-A)`.
</verification_steps>

<rollback>
Se o fix introduzir regressão visual inesperada (improvável dado o escopo cosmético + token `primary` já em uso pelo resto do app), revert do commit único basta: `git revert <sha>`. Sem schema migration, sem feature flag, sem backwards-compat shim.
</rollback>

<followups>
- F-04-08-B (vaga soft-deleted com status='ativa'): adicionar à backlog Phase 5 ou criar 999.x backlog item via `/gsd-add-backlog`.
- F-04-08-C (constraint `bloco_valido_check` não capturado em migrations): mesma rota.
- Continuar bug-hunt de design system Phase 4 — se algum outro Plan 04-07 styling falhou (ex.: dark/light mode, glass UI tokens BS), capturar em outro carryover ou Phase 5 a11y/visual review.
</followups>
