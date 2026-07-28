---
phase: 04
plan: 08-carryover-b
type: execute
wave: 4-carryover
depends_on: ["04-08", "04-08-carryover"]
files_modified:
  - src/components/pages/FormularioCandidaturaPage.tsx
autonomous: true
requirements: [VAGA-03, CAND-01, CAND-02, CAND-03]
tags: [phase-04, css-fix, ui-shell, candidato-design-system, hotfix, uat-carryover, plan-04-07-cleanup, design-system-debt]

must_haves:
  truths:
    # VISUAL — design system candidato (F-04-08-E)
    - "Página renderiza com BackgroundImage gradient/foto Beauty Smile (não bg branco/azul-claro plano)"
    - "Header sticky no topo com BeautySmileLogo (symbol size sm variant white) + Avatar do candidato + nome + botão de logout via GlassButton"
    - "Conteúdo principal envolvido em <GlassCard> (vidro fosco + border white/10) NO LUGAR de <div bg-white>"
    - "Tipografia branca/translúcida sobre o background (não preto sobre branco)"
    - "Padding/spacing consistente com MeuPerfilCandidatoPage (py-20 + container mx-auto px-4 sm:px-6 + max-w-3xl)"

    # FUNCIONAL — bg-primary token broken (F-04-08-D)
    - "Botão 'Enviar candidatura' usa bg-[#00109E] hover:bg-[#00109E]/90 text-white (precedente Phase 2/3 LoginCandidatoPage:393)"
    - "Loading state do botão usa mesmas classes hex"
    - "Inputs <input> e <textarea> usam focus:border-[#00109E] focus:outline-none"
    - "Badge tipo_contrato usa bg-[#00109E]/10 text-[#00109E]"
    - "Ícones Loader2 + FileText usam text-[#00109E] (ou text-white se contrastar melhor sobre o BackgroundImage — decisão do executor)"

    # COMPORTAMENTO — preservado (NÃO regredir)
    - "RHF + Zod dinâmico (buildCandidaturaSchema) intactos"
    - "cvUploadService chamadas intactas (uploadCV, getSignedUrl, removeCV)"
    - "candidaturasService.submitCandidaturaWithRespostas intacto"
    - "Detecção de duplicate via useHasApplied intacta"
    - "Fluxo de redirect pós-submit para /candidato/perfil intacto"

    # GATES
    - "Vitest full suite mantém 337/338 PASS (sem regressão)"
    - "tsc --noEmit ≤ 320 (baseline)"
    - "npm run build exit 0"

  artifacts:
    - path: src/components/pages/FormularioCandidaturaPage.tsx
      provides: form de candidatura com shell de candidato + cores funcionais
      contains: "BackgroundImage"
    - path: src/components/pages/FormularioCandidaturaPage.tsx
      provides: precedente Phase 2/3 hex literal
      contains: "bg-[#00109E]"

  key_links:
    - from: src/components/pages/FormularioCandidaturaPage.tsx
      to: src/components/pages/MeuPerfilCandidatoPage.tsx
      via: "shared candidato shell — BackgroundImage gradient + Glass navbar + BeautySmileLogo + GlassCard wrappers"
      pattern: "<BackgroundImage background=\"gradient\""
    - from: src/components/pages/FormularioCandidaturaPage.tsx
      to: src/components/pages/LoginCandidatoPage.tsx
      via: "shared brand color hex literal #00109E (Phase 2/3 precedent)"
      pattern: "bg-\\[#00109E\\]"
    - from: src/components/pages/FormularioCandidaturaPage.tsx
      to: src/components/BackgroundImage + src/components/BeautySmileLogo + src/components/ui/glass
      via: "import dos primitives canônicos do candidato"
      pattern: "from '\\.\\./BackgroundImage'"
---

<objective>
Carryover-A (commit ee0147f) trocou classes inválidas `primary-NNN` por `bg-primary` — sintaticamente válidas no Tailwind mas SEMANTICAMENTE QUEBRADAS neste projeto (token `--primary` definido em HEX, mas Tailwind espera HSL components → `hsl(#00109E)` é CSS inválido). UAT-J01 re-executado mostrou botão ainda invisível.

Investigação durante UAT levantou um achado MAIOR: Plan 04-07 também pulou a integração com o **design system de candidato** (`F-04-08-E`). A página renderiza como uma ilha desconectada — sem `<BackgroundImage>`, sem `<BeautySmileLogo>`, sem `<GlassCard>`, sem header com avatar/logout. Compare com `MeuPerfilCandidatoPage.tsx`: shell completo. FormularioCandidaturaPage: `<div className="bg-gradient-to-br from-blue-50">` plano.

Este Carryover-B faz **dois fixes em uma operação atômica** (mesmo arquivo, mesmo PR conceitual):

1. **F-04-08-D fix:** substituir `bg-primary` / `text-primary` / `focus:border-primary` por `bg-[#00109E]` (precedente Phase 2/3 — `LoginCandidatoPage:393`).
2. **F-04-08-E fix:** envolver a página com `<BackgroundImage>` + adicionar header sticky com `<BeautySmileLogo>` + Avatar + logout + envolver content sections em `<GlassCard>`.

**Fix do design system token (definir `--primary` em HSL components separadamente)** continua sendo dívida técnica — Phase 5 hardening.

**Comportamento (RHF + Zod + cvUpload + candidaturasService) preservado integralmente.**
</objective>

<threat_model>
- Risco: re-skin pode quebrar layout responsivo (mobile-first é constraint do candidato). Mitigação: copiar padrões de spacing/breakpoint de MeuPerfilCandidatoPage (já validado em Phase 3 03-07 UAT mobile).
- Risco: trocar `<div className="bg-white">` por `<GlassCard>` pode mudar contraste de inputs (texto preto sobre vidro escuro = ilegível). Mitigação: usar `<GlassCard variant="white">` (vidro claro) + manter `border-gray-300` nos inputs OU switch para `text-white` + `bg-white/10` em todos os campos. Decisão do executor — testar visualmente antes de commit.
- Risco: importar BackgroundImage/BeautySmileLogo/Glass pode introduzir cycle dependency. Mitigação: MeuPerfilCandidatoPage já usa exatamente esses imports sem cycle — pattern validado.
- Risco: hex literal `#00109E` hardcoded em vez de token semântico → futura troca de brand exige sweep manual. Mitigação aceita: este é o precedente Phase 2/3 estabelecido. Token-fix é F-04-08-D Phase 5 follow-up.
- Risco: hover state `hover:bg-[#00109E]/90` pode não funcionar com Tailwind se opacity modifier exigir HSL. Mitigação: confirmar visualmente — Phase 2/3 LoginCandidato usa exatamente esse pattern e funciona.
- Não-risco: zero mudança de schema, API, RHF wiring, validação Zod, lógica de upload, error handling. Apenas substituição de classes + wrapping em primitives.
</threat_model>

<task id="1" type="fix" depends_on="">
<title>Substituir bg-primary tokens por hex literal #00109E (precedente Phase 2/3)</title>

<context>
F-04-08-D: 10 ocorrências em `src/components/pages/FormularioCandidaturaPage.tsx`:

| Linha | Atual (carryover-A) | Substituir por |
|-------|--------------------|----------------|
| 405 | `text-primary` (Loader2 da página) | `text-[#00109E]` |
| 418 | `bg-primary ... hover:bg-primary/90` (loading button) | `bg-[#00109E] ... hover:bg-[#00109E]/90` |
| 462 | `bg-primary/10 text-primary` (badge) | `bg-[#00109E]/10 text-[#00109E]` |
| 490 | `text-primary` (FileText icon) | `text-[#00109E]` |
| 536 | `bg-primary ... hover:bg-primary/90` (submit button) | `bg-[#00109E] ... hover:bg-[#00109E]/90` |
| 601 | `focus:border-primary` (input) | `focus:border-[#00109E]` |
| 616 | `focus:border-primary` (input) | `focus:border-[#00109E]` |
| 632 | `focus:border-primary` (input) | `focus:border-[#00109E]` |
| 664 | `focus:border-primary` (input) | `focus:border-[#00109E]` |
| 699 | `focus:border-primary` (input) | `focus:border-[#00109E]` |

> **NOTA do executor:** se durante a Task 2 (re-skin) os ícones / badges ficarem com baixo contraste sobre o BackgroundImage gradient escuro, considerar trocar `text-[#00109E]` por `text-white` para Loader2 + FileText. Decisão visual no momento da execução.
</context>

<acceptance_criteria>
1. `grep -cE "(bg|text|focus:border)-primary(?![-/])" src/components/pages/FormularioCandidaturaPage.tsx` → 0.
2. `grep -cE "bg-\[#00109E\]" src/components/pages/FormularioCandidaturaPage.tsx` ≥ 3 (loading + submit + badge).
3. `grep -cE "focus:border-\[#00109E\]" src/components/pages/FormularioCandidaturaPage.tsx` = 5 (5 inputs).
</acceptance_criteria>
</task>

<task id="2" type="implement" depends_on="1">
<title>Integrar candidato design system shell (BackgroundImage + Logo + GlassCard)</title>

<context>
F-04-08-E: a página atual em `src/components/pages/FormularioCandidaturaPage.tsx` começa com:

```tsx
return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
    <div className="max-w-3xl mx-auto">
      <button type="button" onClick={() => navigate(...)} ...> Voltar para a vaga </button>
      ...content cards...
    </div>
  </div>
)
```

Pattern canônico de `src/components/pages/MeuPerfilCandidatoPage.tsx:337-757`:

```tsx
import { BackgroundImage } from '../BackgroundImage'
import { BeautySmileLogo } from '../BeautySmileLogo'
import { Glass, GlassButton, GlassCard } from '../ui/glass'

return (
  <BackgroundImage background="gradient" className="min-h-screen py-20" overlayColor="bg-black" overlayOpacity={15}>
    {/* Sticky navbar */}
    <div className="w-full sticky top-0 z-50 mb-8">
      <Glass variant="white" blur="xl" className="border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Logo + Avatar + Name */}
            <div className="flex items-center gap-4">
              <BeautySmileLogo type="symbol" size="sm" variant="white" />
              <div className="hidden sm:block h-8 w-px bg-white/20" />
              {/* Avatar + nome do candidato */}
            </div>
            {/* Right: Logout button */}
            <GlassButton onClick={handleLogout}>...</GlassButton>
          </div>
        </div>
      </Glass>
    </div>

    {/* Content */}
    <div className="container mx-auto px-4 max-w-3xl space-y-8">
      {/* Voltar para vaga link */}
      <button type="button" onClick={...} className="inline-flex items-center text-white/80 hover:text-white">
        <ArrowLeft /> Voltar para a vaga
      </button>

      {/* Each section in a GlassCard */}
      <GlassCard variant="white">
        ...vaga summary...
      </GlassCard>

      <GlassCard variant="white">
        ...CV upload...
      </GlassCard>

      <GlassCard variant="white">
        ...perguntas grouped by bloco...
      </GlassCard>

      {/* Submit button — full width inside last GlassCard or standalone */}
    </div>
  </BackgroundImage>
)
```
</context>

<acceptance_criteria>
1. `grep -cE "from '\\.\\./BackgroundImage'" src/components/pages/FormularioCandidaturaPage.tsx` = 1.
2. `grep -cE "from '\\.\\./BeautySmileLogo'" src/components/pages/FormularioCandidaturaPage.tsx` = 1.
3. `grep -cE "from '\\.\\./ui/glass'" src/components/pages/FormularioCandidaturaPage.tsx` = 1.
4. `grep -cE "<BackgroundImage" src/components/pages/FormularioCandidaturaPage.tsx` = 1 (single wrapper).
5. `grep -cE "<BeautySmileLogo" src/components/pages/FormularioCandidaturaPage.tsx` ≥ 1.
6. `grep -cE "<GlassCard" src/components/pages/FormularioCandidaturaPage.tsx` ≥ 2 (vaga summary + CV upload no mínimo; perguntas section opcional como GlassCard ou inline).
7. Botão "Voltar para vaga" aparece no topo do conteúdo, classes `text-white/80 hover:text-white` (sobre o BackgroundImage).
8. Botão de logout no header (canto direito da navbar) usa `GlassButton` ou `<button>` styled equivalente — chama `useAuthStore.getState().signOut()` ou método similar (replicar pattern de MeuPerfilCandidatoPage:376-385).
9. Avatar do candidato (`<Avatar>` de `../ui/avatar`) com fallback nas iniciais do nome (replicar lógica MeuPerfilCandidatoPage:353-362).

> **DICA do executor:** mantenha as 3 sections logicamente intactas (summary / upload / perguntas) — apenas envolva cada uma em `<GlassCard variant="white">`. Não reorganize ordem nem hierarquia.
</acceptance_criteria>
</task>

<task id="3" type="verify" depends_on="2">
<title>Gates de verificação + UAT prep</title>

<acceptance_criteria>
1. `npm run build` → exit 0.
2. `npm run lint` (tsc --noEmit) ≤ 320 erros (baseline).
3. `npm run test:run` → 337 PASS / 1 FAIL pre-existing LoadingProgress (sem regressão).
4. `grep -cE "(bg|text|focus:border)-primary(?![-/])" src/components/pages/FormularioCandidaturaPage.tsx` → 0.
5. Commit: `fix(04-08-carryover-b): integrate candidato design shell + replace broken bg-primary token (F-04-08-D + F-04-08-E)`
6. Mensagem de commit explica os DOIS findings (D + E) e referencia o carryover plan.
</acceptance_criteria>
</task>

<execution_strategy>
Por causa do tamanho da Task 2 (re-skin), executar via Edit tool com strings grandes pode ser frágil. Considerar:

**Opção A (recomendada):** Read da página inteira (713 linhas) → planejar substituições mentalmente → Edit com strings de contexto suficientes para serem únicas → executar uma Task por vez (Task 1 primeiro, depois Task 2). Após Task 2, rodar build pra confirmar nada quebrou estruturalmente.

**Opção B:** Task 1 via replace_all em strings curtas (rápido). Task 2 via Read full + Write substituição completa do JSX retornado pelo componente (linhas 436-553 aproximadamente). Mais arriscado mas mais limpo.

**Critério de decisão:** se o agente conseguir distinguir context strings únicos para cada section JSX, Opção A. Se não, Opção B com Write completo após backup mental do código atual.

Qualquer que seja, **executar Task 1 antes de Task 2**: começar pela substituição de strings de cor (mecânica) reduz superfície de bug visual durante a re-skin.
</execution_strategy>

<verification_steps>
1. Build verde + tests verdes (gates Task 3).
2. Iniciar dev server (`npm run dev`).
3. Login como candidato em browser, navegar para `/vagas/teste-asb-shopping-riomar` → "Candidatar-se" → conferir visualmente:
   - Background gradient/foto Beauty Smile aparece
   - Header sticky com logo + avatar + logout
   - Botão "Enviar candidatura" visível em azul `#00109E`
   - Inputs com border azul ao focar
   - GlassCards envolvem o conteúdo
4. Re-executar UAT-J01..J06 (`.planning/phases/04-vagas-candidatura/04-08-UAT.md`). Esperado: 6/6 PASS.
5. Após UAT 6/6 PASS, commit final: `docs(04-08-uat): UAT 6/6 PASS — Phase 4 manual validation complete (post-carryover-B)`.
</verification_steps>

<rollback>
`git revert <sha>` reverte o commit do carryover-B. Estado restaurado ao Carryover-A (botão `bg-primary` quebrado mas grep clean). Reverter só faz sentido se a re-skin introduzir regressão funcional grave (ex: handler de submit perdido, RHF wire-up quebrado). Improvável dado que Task 2 é apenas wrapping JSX em primitives.
</rollback>

<followups>
- **F-04-08-D Phase 5 follow-up:** consertar o token `--primary` no design system. 3 opções no UAT-md. Recomendada: definir `--primary` em HSL components separadamente do `--brand-primary` HEX. Após o fix, sweep convertendo `bg-[#00109E]` literais de volta para `bg-primary` semântico em todas as páginas (LoginCandidato, LoginRH, EsqueciSenha, RedefinirSenha, CadastroMultiStepForm, FormularioCandidatura).
- **Plan 04-07 retroactive code review:** o Plan checker deveria ter pego F-04-08-E (página sem shell candidato). Revisar checklist de Plan checker para incluir "página integra primitives canônicos do design system de persona?" antes de marcar complete.
- **UI-SPEC ausente:** se Phase 4 não teve `04-UI-SPEC.md` (ou teve mas não cobriu page shells), criar UI-SPEC retroativo em Phase 5 para evitar reincidência.
- Capturar follow-ups via `/gsd-add-backlog` ou inserir explicitamente em Phase 5.
</followups>
