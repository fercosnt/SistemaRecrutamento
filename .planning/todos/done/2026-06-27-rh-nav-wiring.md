---
created: 2026-06-27
title: Cabear os workspaces RH reais na navegacao + aposentar o perfil mock (RH-NAV-WIRING-01)
area: rh-navegacao
severity: media
files:
  - src/components/pages/PerfilCandidatoRHPage.tsx
  - src/components/pages/CandidatosRHPage.tsx
  - src/components/pages/DashboardRHPage.tsx
  - src/components/pages/VagaCandidatosRHPage.tsx
  - src/features/triagem/components/TriagemTable.tsx
  - src/router/routes.tsx
---

## Problem

[arquitetura/ux / media] Descoberto na investigacao ENTREV-PERFIL-DUP-01 (2026-06-27).
Existem DUAS camadas de RH paralelas e o funil real nao esta cabeado na navegacao:

- **Legado mock CABEADO:** `PerfilCandidatoRHPage` (`/rh/candidatos/:id`) — 1864 linhas,
  100% hardcoded, sem backend, abas proprias (formulario/bigfive/disc/raven/manifesto/
  entrevista-online/entrevista-presencial) baseadas numa concepcao ANTIGA do funil. E a
  tela que o RH alcanca via TopBar/Dashboard/CandidatosRHPage.
- **Funil real ORFAO:** `EntrevistaWorkspace` (`/rh/candidato/:id/entrevista`),
  `RedacaoReviewPanel` (`/redacao`), `DecisaoFinalPage` (`/decisao`) — Phases 13/14/15,
  EF-backed, dados reais — so alcancaveis por URL DIRETA. Nenhum navigate/Link aponta p/
  eles. Unica ponte real: `VagaCandidatosRHPage` → `TriagemTable` real → so comparativo.

Impacto: o RH de verdade nao consegue chegar nas telas de entrevista/redacao/decisao
clicando; e ve dados falsos no perfil mock. (Funcionou no UAT via URL direta.)

## Solution

TBD — decisao de produto + provavelmente um /gsd-discuss ou mini-fase. Direcao:
1. **Cabear** os workspaces reais: da `TriagemTable` (linha do candidato) e/ou de um
   perfil real, navegar p/ `/rh/candidato/:id/{entrevista,redacao,decisao}` conforme a
   etapa. Decidir o ponto de entrada (linha da tabela? botao por etapa? um perfil-hub?).
2. **Aposentar/!substituir o perfil mock** `PerfilCandidatoRHPage`: ou deletar e
   redirecionar `/rh/candidatos/:id` p/ um perfil real (resumo + links p/ os workspaces),
   ou reescrever as abas p/ lerem dados reais (reusando os services de features/*). NAO
   manter as abas DISC/Raven/manifesto que nem existem no funil M2.
3. Conferir tambem as outras abas mock (bigfive/disc/raven/formulario) — mesma duplicacao
   vs as telas reais de avaliacao.
Escopo grande / decisao de UX — nao e quick fix. Candidato a fazer parte do proximo
milestone (ou um /gsd-discuss dedicado de navegacao RH). Ver [[2026-06-27-perfil-entrevista-duplicacao]].

## Resolucao (2026-06-28 — CLOSED, absorvido pela Phase 17)

**Este todo foi RESOLVIDO pela Phase 17 (Navegacao & Arquitetura de Informacao),
shipada 2026-06-28 — um dia apos a captura.** A Phase 17 declarou explicitamente
"Absorve os todos RH-NAV-WIRING-01" no ROADMAP. O todo so ficou parado em `pending/`
por nao ter sido movido. Verificado contra o codigo live (read-only):

1. **Mock aposentado.** `PerfilCandidatoRHPage.tsx` caiu de 1864 linhas p/ 20 — agora
   e um thin wrapper que renderiza `HubCandidatoRH` (`src/features/hub-candidato/`).
   Abas M1 DISC/Raven/manifesto DROPADAS.
2. **Hub real, etapa-guiado, service-backed.** `HubCandidatoRH` le hooks reais
   `features/*` keyed por candidaturaId (sem dados inventados), com timeline de 8 etapas
   M2 + CTA dominante por `etapa_atual`.
3. **Workspaces cabeados.** `funilNavMap` mapeia cada etapa → `/rh/candidato/:id/{entrevista,
   redacao,decisao}`; o hub navega via CTA dominante + botoes "Revisar" (etapas passadas)
   + botao sempre-visivel de redacao.
4. **Entry points corrigidos.** TriagemTable (`:329`), DashboardRHPage (`:340/:367`) e
   CandidatosRHPage (`:253`) agora navegam p/ `/rh/candidatos/:id` → o hub real (nao mais
   o mock). Cadeia completa: TopBar/Dashboard/Candidatos/Triagem → hub → entrevista/redacao/decisao.
5. **UAT live.** Phase 17 rodou 4 UATs ao vivo (4/4 PASS) cobrindo a navegacao do hub RH.

Decisao do usuario 2026-06-28 (`/gsd-discuss-phase RH-NAV-WIRING-01`): confirmado done,
sem trabalho residual material — fechar o todo. Nenhuma mudanca de codigo nesta sessao.
