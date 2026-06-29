# Phase 17: Navegação & Arquitetura de Informação - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 17-navegacao-arquitetura-informacao
**Areas discussed:** Setup (sem milestone/fase ativa), Escopo da mini-fase, Wiring funil RH + perfil mock, Funil candidato + Dashboard×Perfil, Limpeza legado + admin + 404, + 4 zonas extras delegadas

---

## Setup — sem fase/milestone ativo

`/gsd-discuss-phase` foi invocado sem número de fase. v1.0 e v2.0 ambos shipped + arquivados;
`.planning/phases/` vazio; `gsd-sdk init phase-op` exige fase. Decidido com o user:

| Pergunta | Escolha |
|----------|---------|
| Tópico | Mini-fase "Navegação & Arquitetura de Informação (candidato + RH)", usando `.planning/ui-reviews/nav-audit-2026-06-28.md` como contexto |
| Framing | **Standalone mini-phase** (não novo milestone) → Phase 17 |

---

## Escopo da mini-fase

| Pergunta | Opções | Escolha |
|----------|--------|---------|
| Amplitude | Todas as 7 / Só ALTA / ALTA+MÉDIA | **Todas as 7 recomendações** |
| DevNavigationMenu | Manter rede de segurança / Remover / Ferramenta permanente | **Manter como rede de segurança DEV-only** |
| Definition of Done | Wiring + E2E de jornada / Wiring + UAT manual / Só wiring | **Wiring + teste E2E de jornada** |

---

## Wiring funil RH + perfil mock

| Pergunta | Escolha |
|----------|---------|
| Entrada RH (1ª rodada — user pediu p/ entender melhor) | "tenho dúvidas sobre, queria entender melhor" → explicado em texto |
| Destino do mock PerfilCandidatoRHPage | **Reescrever como hub real** |
| Links por etapa_atual | **Sim — guiado por etapa_atual** |
| Entrada RH (2ª rodada, pós-explicação) | **A) Hub de candidato** — "vamos no A, mas quero algo que seja bem completo" |
| Normalizar rotas plural/singular | **Sim — padronizar nesta fase** |

**Notas:** A explicação aterrou no código: a TriagemTable já linka `nome → /rh/candidatos/:id`
(que renderiza o mock); reescrever o mock como hub reaproveita o link existente. Inconsistência
de rota plural (`/rh/candidatos/:id`) vs singular (`/rh/candidato/:id/*`) capturada para normalização.

---

## Funil candidato + Dashboard×Perfil

| Pergunta | Escolha |
|----------|---------|
| Entrada do candidato à avaliação pendente | **CTA no Dashboard guiado por etapa** |
| Sobreposição Dashboard × Perfil | **Dashboard = funil / Perfil = dados pessoais + edição** |
| Entrada da explicação LGPD | **Card in-app no Dashboard** (quando há decisão) |

---

## Limpeza legado + admin + 404

| Pergunta | Escolha |
|----------|---------|
| Política de remoção do legado | **Só o comprovadamente morto** (resto = verificação caso-a-caso) |
| Entrada admin | **Item "Admin" no sidebar role-gated** |
| Página 404 / catch-all | **404 estilizada Beauty Smile** |

---

## Claude's Discretion

User respondeu "voce decide o melhor" para as 4 zonas extras. Decisões tomadas (ver D-15..D-17 + D-07 no CONTEXT.md):

- **A) Migração features/ vs pages/** → Híbrida: hub novo em `features/`, edições ficam em `components/pages/`, shared em `lib/`. Sem migração em massa.
- **B) Seções do hub "completo"** → pipeline inteiro reusando services de `features/*`, empty states p/ etapas não alcançadas, nunca inventar dados. (Capturado como D-07.)
- **C) Escopo do teste E2E** → smoke de navegabilidade (Playwright), 4 jornadas quebradas, asserta rota/heading não fluxo de dados.
- **D) Mapa etapa_atual→tela** → fonte única `src/lib/navegacao/funilNavMap.ts` reusando `EtapaFunilM2`/`ETAPA_M2_LABELS` de `triagemService.ts`, consumido por Dashboard (candidato) e hub (RH).

## Deferred Ideas

- Sistema de notificação / e-mail (sem infra hoje) — futuro.
- Atalhos diretos por etapa na linha da TriagemTable (o "C") — refinamento futuro.
- Migração em massa pages → features — fora de escopo.
- Reescrever abas do mock (bigfive/disc/raven) como telas — NÃO, já cobertas pelos workspaces.
- **ENTREV-GUIA-EDIT-01** — deferido (depende desta fase entregar acesso ao workspace de entrevista).
