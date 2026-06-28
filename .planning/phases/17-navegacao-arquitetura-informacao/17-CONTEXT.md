# Phase 17: Navegação & Arquitetura de Informação - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning
**Type:** Mini-fase standalone (fora de milestone — pós v2.0 arquivado)

<domain>
## Phase Boundary

Cabear na **navegação real de produção** o funil que o M2 construiu — hoje a maior
parte (avaliação do candidato + workspaces RH de entrevista/redação/decisão + telas
admin) só é alcançável por URL direta ou pelo `DevNavigationMenu` (DEV-only), então o
usuário real não chega nelas clicando. Esta fase: (1) cabea o funil RH e o do candidato,
guiado por etapa; (2) reescreve o perfil mock do RH como hub de candidato real; (3)
consolida Dashboard × Perfil do candidato; (4) dá entrada às telas admin; (5) adiciona
404; (6) remove legado/morto comprovado; (7) protege tudo com teste E2E de jornada.

**Não é** novo recurso de produto — é wiring de navegação + arquitetura de informação +
limpeza de legado sobre o que o M2 já entregou. **Não** adiciona capacidades novas fora
do que a auditoria mapeou.

</domain>

<decisions>
## Implementation Decisions

### Escopo & Definition of Done
- **D-01:** Mini-fase **standalone** (fora de milestone) cobrindo as **7 recomendações**
  do nav-audit. Registrada como Phase 17 no ROADMAP.md fora dos milestones v1.0/v2.0.
- **D-02:** `DevNavigationMenu` **mantido como rede de segurança DEV-only** (`App.tsx:222`,
  gated por `import.meta.env.DEV`). NÃO remover até a navegação de produção cobrir 100%.
- **D-03:** **DoD = wiring + teste(s) E2E de jornada navegável.** O E2E é o gate que
  prova navegabilidade clicando (não por URL). Implementa a lição do §8 do audit
  ("gate de jornada navegável").

### Funil RH — entrada + hub de candidato
- **D-04:** Modelo de entrada = **Hub de candidato (opção A)**. Fluxo
  `TriagemTable → hub do candidato → workspace`. O link `nome → /rh/candidatos/:id` já
  existe na TriagemTable (linha 325) — muda-se o conteúdo de destino, não o link.
- **D-05:** `PerfilCandidatoRHPage` (mock de 1864 linhas, dados hardcoded) **reescrito
  como hub real** reusando os services de `features/*`. **Dropar** as abas DISC / Raven /
  manifesto (conceitos do funil antigo, não existem no M2). Resolve `ENTREV-PERFIL-DUP-01`.
- **D-06:** Hub **guiado por `etapa_atual`**: CTA "próximo passo" em destaque para o
  workspace da etapa corrente + acesso às etapas já percorridas; etapas futuras aparecem
  como empty state (não somem).
- **D-07:** Hub **"bem completo"** — reflete o **pipeline inteiro** do candidato
  (ver `<code_context>` para as seções). **Nunca inventar dados** (era o pecado do mock):
  cada seção lê de service real ou mostra empty state.
- **D-08:** **Padronizar a inconsistência de rotas** `/rh/candidatos/:id` (plural, perfil)
  vs `/rh/candidato/:id/*` (singular, workspaces) → um padrão único + **redirects** das
  rotas antigas para não quebrar links existentes.

### Funil candidato — Dashboard / Perfil / LGPD
- **D-09:** **Dashboard = hub do funil do candidato** — minhas candidaturas + **CTA
  guiado por etapa** que roteia para a etapa pendente (`/candidato/avaliacao/:id` e órfãs
  redação/cognitiva). Espelha o modelo guiado-por-etapa do RH.
- **D-10:** **Perfil = dados pessoais + edição** (papel distinto do Dashboard). Resolve a
  sobreposição funcional `CAND-DASH-DUP-01` (hoje ambos listam candidaturas+status).
- **D-11:** **Explicação LGPD** (`/candidato/explicacao/:id`) alcançável via **card in-app
  no Dashboard** quando há decisão final. É o único caminho que existe hoje (sem infra de
  notificação/e-mail).

### Limpeza de legado / Admin / 404
- **D-12:** **Remoção conservadora.** Deletar AGORA só o **comprovadamente morto**
  (`VagaLPPage` — 1213 linhas, zero-imports já confirmado). Os "prováveis legado"
  (`/testes/*`, `QuestionarioPage`/`QuestionarioCulturaPage`, `InscricaoPage`,
  `MeuPerfilPage`, `GlassShowcase`) → **verificação caso-a-caso** (confirmar zero-uso real)
  antes de deletar; **deferir** o que não for confirmado morto. Hard-delete (arquivo + rota)
  só sobre o que passar na verificação.
- **D-13:** **Entrada admin** = item **"Admin" no sidebar RH**, role-gated
  (`administrador`), abrindo sub-navegação para `/admin/*` (`ai-logs`, `prompt-versions`,
  `ai-costs`, `bias-audit`). Reusa o sidebar existente.
- **D-14:** **404 estilizada Beauty Smile** com catch-all `path: '*'` + link de volta
  (home ou dashboard conforme role). O router hoje não tem catch-all nem NotFound.

### Claude's Discretion
*(4 zonas que o user delegou — "você decide o melhor")*
- **D-15 (Arquitetura de pastas):** **Migração híbrida.** Telas novas substanciais (o hub
  reescrito) nascem em `src/features/` seguindo a convenção do CLAUDE.md; **edições** em
  telas existentes (DashboardCandidatoPage, MeuPerfilCandidatoPage) **ficam em
  `src/components/pages/`** para minimizar churn/risco numa fase de navegação. Lógica
  compartilhada de navegação → `src/lib/`. **Sem migração em massa** de pages→features.
- **D-16 (Escopo do teste E2E):** **Smoke de navegabilidade** (Playwright, precedente
  `cadastro-flow.spec.ts`). Cobre as 4 jornadas que a auditoria marcou ❌ QUEBRA:
  (1) candidato pós-candidatura → avaliação pelo Dashboard; (2) RH TriagemTable → hub →
  cada um dos 3 workspaces; (3) admin → sidebar → `/admin/*`; (4) URL inválida → 404.
  Asserta que links/CTAs **resolvem para a tela certa** (rota/heading), **não** o fluxo de
  dados ponta-a-ponta (já UAT'd no M2).
- **D-17 (Mapa etapa→tela):** **Fonte única.** Módulo nav-map em
  `src/lib/navegacao/funilNavMap.ts` reusando `EtapaFunilM2` + `ETAPA_M2_LABELS` de
  `src/features/triagem/services/triagemService.ts`, mapeando
  `etapa_atual → { rota candidato, rota workspace RH, label, CTA }`. Consumido tanto pelo
  CTA do Dashboard (candidato) quanto pelo hub (RH) → zero lógica de etapa duplicada, à
  prova de drift quando o enum mudar.

### Folded Todos
- **RH-NAV-WIRING-01** (`.planning/todos/pending/2026-06-27-rh-nav-wiring.md`) — expandido
  e **absorvido** por esta mini-fase (o audit §8 já o trata como sub-item). Cobre D-04/05/06/08.
- **CAND-DASH-DUP-01** (sobreposição Dashboard × Perfil do candidato) — resolvido por D-09/D-10.
- **ENTREV-PERFIL-DUP-01** (origem da auditoria; perfil mock vs funil real órfão) — resolvido
  por D-04/D-05.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auditoria-fonte (LER PRIMEIRO)
- `.planning/ui-reviews/nav-audit-2026-06-28.md` — auditoria read-only completa das ~40
  rotas e 2 personas. Contém: TL;DR/veredito, achado-raiz (DevNav DEV-only), o que É
  alcançável em prod (§2), **ÓRFÃOS** (§3 — funil candidato + workspaces RH + admin),
  **mock/legado/duplicatas** (§4), jornadas E2E que quebram (§5), **recomendações
  priorizadas** (§6), cobertura (§7), encaixe no GSD (§8). Esta fase implementa o §6.

### Todos relacionados
- `.planning/todos/pending/2026-06-27-rh-nav-wiring.md` — RH-NAV-WIRING-01 (folded; files + direção).
- `.planning/todos/pending/2026-06-27-guia-editar-perguntas.md` — ENTREV-GUIA-EDIT-01 (deferido).

### Convenções do projeto
- `CLAUDE.md` — File Structure (`features/<dominio>/`, migrar de `components/pages/`),
  Key Conventions (PascalCase, export nomeado, query keys hierárquicas), Security Rules
  (RoleGuard, RLS, DevNav gated por `import.meta.env.DEV`), enums DB snake_case pt-BR.
- Design system: skill `beauty-smile-design-system` (glass UI, paleta, 404 estilizada).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/features/triagem/services/triagemService.ts`** — `EtapaFunilM2` (linha 293) +
  `ETAPA_M2_LABELS` (linha 316): a fonte do enum de etapas para o nav-map (D-17). NÃO criar enum paralelo.
- **`src/features/triagem/components/TriagemTable.tsx`** — já linka `nome → /rh/candidatos/:id`
  (linha 325). É o ponto de entrada existente para o hub (D-04).
- **Os 3 workspaces RH a cabear** (hoje órfãos): `src/features/entrevista/components/EntrevistaWorkspace.tsx`
  (`/rh/candidato/:id/entrevista`), `src/features/decisao/components/DecisaoFinalPage.tsx`
  (`/rh/candidato/:id/decisao`), `src/features/triagem/components/RedacaoReviewPanel.tsx`
  (`/rh/candidato/:id/redacao`). Todos `RoleGuard role={['rh','administrador']}`.
- **Features existentes a reusar p/ o hub** (D-07): `features/triagem` (score IA),
  `features/avaliacao` (Work-Sample/SJT, Big Five), `features/avaliacao-cognitiva`,
  `features/entrevista`, `features/decisao`, `features/explicacao` (LGPD), `features/admin`
  (telas /admin/*).
- **Telas candidato a refatorar** (D-09/D-10, ficam em pages): `src/components/pages/DashboardCandidatoPage.tsx`,
  `src/components/pages/MeuPerfilCandidatoPage.tsx`.
- **Mock a reescrever** (D-05): `src/components/pages/PerfilCandidatoRHPage.tsx` (1864 linhas).
- **`src/App.tsx:222`** — `{import.meta.env.DEV && <DevNavigationMenu />}` — manter (D-02).
- **`src/router/routes.tsx`** — todas as rotas; adicionar catch-all 404 (D-14), redirects de
  padronização (D-08), e o item admin é navegação (sidebar), não rota nova.
- **Precedente E2E:** `cadastro-flow.spec.ts` (Playwright; `npm run test:e2e`).

### Established Patterns
- `RoleGuard role={['rh','administrador']}` / `role="candidato"` envolvendo elementos de rota.
- Sidebar RH existente (itens `/rh/dashboard|candidatos|vagas|relatorios|suporte|configuracoes`)
  — onde entra o item "Admin" role-gated (D-13).
- `features/<dominio>/{components,hooks,services,schemas,types}` — onde nasce o hub (D-15).
- Glass UI Beauty Smile (404, hub, cards).

### Integration Points
- **nav-map** (`src/lib/navegacao/funilNavMap.ts`) ← consumido por: CTA do Dashboard
  (candidato, D-09) **e** hub RH (D-06). Fonte única de `etapa_atual → tela`.
- **Hub RH** ← lê services de `features/*` (D-07); substitui o conteúdo de `/rh/candidatos/:id`.
- **Sidebar RH** ← novo item "Admin" role-gated (D-13).
- **`routes.tsx`** ← catch-all `path:'*'` (404) + redirects de normalização de rota (D-08).

</code_context>

<specifics>
## Specific Ideas

- **"Hub bem completo"** (palavras do user) — o hub do candidato deve ser rico, refletindo
  o pipeline inteiro, não um perfil minimalista. Ver D-07 + seções em `<code_context>`.
- **Modelo guiado-por-etapa espelhado** entre RH (hub) e candidato (Dashboard) — ambos
  consomem o **mesmo** `funilNavMap`, então a experiência "próximo passo" é consistente
  nas duas personas.
- O link tabela→perfil **já existe**; a maior parte do wiring RH é *trocar o destino* e
  cabear o hub→workspaces, não inventar navegação do zero.

</specifics>

<deferred>
## Deferred Ideas

- **Sistema de notificação / e-mail** — entrada "ideal" para LGPD e para o funil; sem
  infra hoje. Futuro. (Por isso D-11 usa card in-app como caminho que existe.)
- **Atalhos diretos por etapa na linha da TriagemTable** (o "tempero" da opção C) —
  refinamento futuro se o RH reclamar de cliques no fluxo tabela→hub→workspace.
- **Migração em massa `components/pages/` → `features/`** — fora de escopo; só o hub novo
  migra (D-15). O resto fica até uma fase de tech-debt dedicada.
- **Reescrever as abas do mock como telas separadas** (bigfive/disc/raven/formulario) —
  NÃO; essas avaliações já têm telas reais (workspaces/features). Não duplicar.

### Reviewed Todos (not folded)
- **ENTREV-GUIA-EDIT-01** (`.planning/todos/pending/2026-06-27-guia-editar-perguntas.md`) —
  RH editar/adicionar perguntas no guia de entrevista. Considerado e **deferido**: depende
  do workspace de entrevista estar **acessível** (que ESTA fase entrega). É feature +
  contrato de escrita (`entrevista_guias`), maior que navegação. Follow-up depois do P17.

</deferred>

---

*Phase: 17-navegacao-arquitetura-informacao*
*Context gathered: 2026-06-28*
