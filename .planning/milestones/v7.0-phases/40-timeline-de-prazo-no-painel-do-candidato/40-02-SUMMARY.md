---
phase: 40-timeline-de-prazo-no-painel-do-candidato
plan: 02
subsystem: frontend
tags: [react, component, dashboard, timeline, no-countdown, vitest, rtl]

# Dependency graph
requires:
  - phase: 40-01
    provides: "useSlaEtapas() + rotuloDeEspera() — lookup e filtro de estado de espera"
provides:
  - "src/features/timeline/components/PrazoEstimadoLinha.tsx — componente puro: rotulo|null → linha Clock+texto+chip Estimativa, ou null"
  - "DashboardCandidatoPage integrado: useSlaEtapas() 1x + PrazoEstimadoLinha por card, abaixo do label da etapa"
  - "vite.config.ts: exclusão dos 3 Deno tests da P38 do Vitest (corrige gap da P38 — CI test:run estava vermelho)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Componente de estimativa PURO (props in → render/null) — testável sem QueryClientProvider; a página faz o fetch e passa o rotulo resolvido"
    - "Enhancement silencioso: lookup vazio (loading/erro) ⇒ rotuloDeEspera null ⇒ componente null ⇒ card intacto"
    - "RNF anti-countdown por construção: zero Date/temporizador no componente (grep-guard na acceptance + teste de texto verbatim)"

key-files:
  created:
    - src/features/timeline/components/PrazoEstimadoLinha.tsx
    - src/features/timeline/components/index.ts
    - src/features/timeline/components/__tests__/PrazoEstimadoLinha.test.tsx
  modified:
    - src/components/pages/DashboardCandidatoPage.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
    - vite.config.ts

key-decisions:
  - "PrazoEstimadoLinha é puro (recebe rotulo:string|null) — a página resolve rotuloDeEspera(lookup.get(etapa)) e passa; testável sem provider e reutilizável"
  - "O funnel test ganhou vi.mock('@/features/timeline/hooks') (lookup vazio) — o painel agora usa useQuery via useSlaEtapas, que exigiria QueryClientProvider; o mock espelha o padrão do teste (mock de hooks, não provider)"
  - "CORREÇÃO DE GAP DA P38: os 3 Deno tests da P38 (ics/email-templates/notificar-candidato) não estavam no exclude do Vitest → npm run test:run (gate de CI) reprovava com Deno.* undefined. Adicionados por caminho literal (nunca glob de _shared/__tests__, por causa do strict-schema.test.ts Vitest-only). Descoberto pela verificação da P40"
  - "Comentário do componente reescrito para não conter 'setInterval'/'Date' literais (falso positivo do grep de acceptance anti-countdown)"

# Verification
verification:
  automated: "npx vitest run src/features/timeline/ → 7 passed; npm run test:run → 1025 passed / 128 files (0 fail); deno test (P38) → 17/17; npm run build verde (assert-chunks PASSED)"
  lint: "tsc src/** 97→97 (sem erro novo)"
---

# 40-02 — Timeline no painel do candidato (TIMELINE-02)

Criei `PrazoEstimadoLinha` (componente **puro**: recebe `rotulo: string | null`, renderiza uma linha discreta com ícone `Clock` (aria-hidden) + o texto verbatim do config + um chip "Estimativa"; devolve `null` quando `rotulo` é null). Integrei no `DashboardCandidatoPage`: `useSlaEtapas()` chamado 1x, e por card (abaixo do label da etapa) `<PrazoEstimadoLinha rotulo={rotuloDeEspera(slaLookup.get(etapa_atual))} />`. Etapas terminais/stale/loading/erro caem em null naturalmente — a estimativa é enhancement, nunca quebra o card. **Zero countdown** por construção (nenhum Date/temporizador), provado por grep-guard + teste de texto verbatim.

3 testes RTL do componente + o funnel test do painel (com mock do hook de timeline) verdes; suíte completa `npm run test:run` **1025/1025** e build verde.

**Deviations:** (1) o funnel test precisou de um `vi.mock('@/features/timeline/hooks')` porque o painel passou a usar `useQuery`. (2) **Corrigi um gap da P38**: os 3 Deno tests da P38 não estavam excluídos do Vitest — `npm run test:run` (gate de CI) estava vermelho com `Deno.* undefined`; adicionei-os ao exclude do `vite.config.ts` por caminho literal. Descoberto pela verificação da P40. **Next:** TIMELINE-02 completo; a P40 fecha a fase.
