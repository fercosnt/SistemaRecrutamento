# Phase 7: Configuração de Vaga & Tags - Context

**Gathered:** 2026-06-07
**Status:** Ready for planning

<domain>
## Phase Boundary

A tela RH onde se **configura uma vaga por cargo real**: escolher um template de cargo
(que pré-preenche `testes_aplicaveis` + `pesos_avaliacao` default, com override permitido),
ajustar os pesos por sliders com validação soma=100%, e marcar tags nas opções de pergunta
(knockout/atencao/neutro/pontua/fortemente_pontua + peso + nota_ia) com bulk-mark "tudo
informativa" e validação progressiva só no clique "Publicar vaga". É a config que alimenta
knockouts (Phase 8 / Etapa 1), `score_match` (Phase 10 / Etapa 2) e testes aplicáveis
(Phase 11 / Etapa 3).

**Requirements:** VAGACFG-01, VAGACFG-02, VAGACFG-03 (RF-33, RF-34, RF-35, RF-36).

**Não é desta fase:**
- O **banco de perguntas SJT** por cargo (conteúdo das perguntas + opções) — é consumido
  na Phase 11; vai com o pipeline híbrido git→DB (`sync-sjt.ts`, §8.7) **lá**, não aqui.
- Os **knockouts padrão** (presencial-SP, harmonização orofacial) + a **auto-rejeição** —
  Phase 8 (RF-02/RF-03). Phase 7 entrega o *mecanismo* de marcar tags + o schema
  `pergunta_opcao_metadata`; a F8 usa pra configurar os knockouts.
- O bloco de **qualificação por cargo** (`vaga.qualificacao_etapa1`) — Phase 8 (RF-01a).
- A **consolidação que aplica os pesos** (`consolidar-decisao-final`) — Phase 15.
- Reescrita das abas legadas Básicas/Landing/Perguntas/IA — fora de escopo (candidato a F16).

</domain>

<decisions>
## Implementation Decisions

### A. Página: nova feature vs legado
- **D-01:** **Híbrido — nova feature `src/features/config-vaga/`** (components/hooks/services/schemas
  por convenção M1) **reusando a casca visual Glass/Tabs** da `CriarEditarVagaPage` legada.
  Razão: o CLAUDE.md manda usar `features/`; e o save da página legada é **stub**
  (`console.log('Salvar rascunho')` em `CriarEditarVagaPage.tsx:257`) — em termos de
  *persistência* o terreno é greenfield, então não se perde nada funcional, só se herda o visual.
- **D-02:** **Escopo = só os 3 blocos M2 novos** (TemplateSelector + PesosSliders + TagWizard).
  As abas legadas Básicas/Landing/Perguntas/IA ficam visualmente como estão. **Ressalva:** como
  o save legado é stub, a persistência *dos campos novos* (`testes_aplicaveis`, `pesos_avaliacao`,
  metadata de tags) tem que ser ligada de verdade — mas sem reescrever os campos legados.
- **D-03:** **"Publicar vaga" reusa a transição `status_vaga` rascunho→ativa** já existente,
  agora gateada pelas validações M2 (ver D-12). Sem estado de publicação novo. Casa com RF-36
  ("validação progressiva só no Publicar"). Enum `status_vaga` = `ativa | inativa | rascunho`
  (já existe; RadioGroup já na UI legada em `CriarEditarVagaPage.tsx:532`).

### B. Fonte dos 8 templates + banco SJT
- **D-04:** **Templates de cargo = TS config module em git** (`features/config-vaga/templates/
  cargoTemplates.ts` — naming a confirmar no plan). Os 8 cargos (`dentista`, `recepcionista`,
  `consultor_vendas_premium`, `sdr_social_seller`, `assistente_financeiro`, `asb`, `tsb`,
  `vaga_generica`) são poucos, estáveis, e no V1 o RH **não edita templates** — escolhe um e
  faz override *na vaga*. Source of truth em git; ao selecionar template a UI **copia** os
  defaults para `vaga.testes_aplicaveis` + `vaga.pesos_avaliacao` jsonb (a vaga é dona da cópia
  → override natural). **Sem tabela `vaga_templates` e sem sync pipeline pra isso no V1.**
- **D-05:** **Banco SJT (perguntas+opções por cargo) defere pra Phase 11.** O híbrido git→DB
  completo (`sync-sjt.ts`, §8.7) é sobre o *conteúdo* das perguntas SJT, consumido na Avaliação
  Assíncrona. Phase 7 só precisa que o template referencie *quais* testes aplicam, não popular
  as perguntas. Trazer o pipeline agora seria construir infra antes do consumidor existir.
- **D-06:** **Colunas novas na tabela `vagas` nesta fase: só `testes_aplicaveis jsonb` +
  `pesos_avaliacao jsonb`.** `qualificacao_etapa1 jsonb` é Phase 8. Shape de `testes_aplicaveis`
  segue RF-11: lista de `{teste, obrigatorio, customizado, perguntas?}` com default por template.

### C. Dimensões + UX dos sliders de peso
- **D-07:** **Chaves que somam 100% = as 4 etapas pontuadas e decisão-relevantes:** `triagem`
  (score_match Etapa 2), `work_sample_sjt` (Etapa 3), `redacao_cultural` (Etapa 3), `entrevista`
  (Etapas 4+5). **Fora da soma, como contexto:** `big_five` e `cognitivo` — não recebem peso
  porque não pontuam a decisão (consistente com §8.7 "Big Five contexto não-eliminatório" + o
  cognitivo marcado CONTEXTUAL). Conjunto fixo renderizado pela UI a partir do TS config;
  `pesos_avaliacao` é jsonb pra poder evoluir, mas o V1 mostra essas 4 chaves.
- **D-08:** **UX do slider = sliders livres + erro inline (sem auto-rebalance).** RF-34 pede
  literalmente "erro inline se soma ≠ 100%". Indicador ao vivo "Soma: X% (faltam Y%)" + bloqueia
  Publicar se ≠100. Botão opcional "normalizar p/ 100" é permitido como ajuda, mas **nunca**
  rebalance silencioso ao mexer num slider.
- **D-09:** **Pesos default por template = starter defaults razoáveis, calibrados em UAT.** Os
  números exatos são a Pergunta Aberta #8 do PRD ("quem valida que faz sentido na prática?
  Sara+Fernando, em UAT Phase 1"). Phase 7 entrega defaults sensatos por cargo (planner/Fernando
  escolhe os números) e os marca pra calibração em UAT — não trava a fase.

### D. Modelo de tags + validação no Publicar
- **D-10:** **Path 1 — tabela relacional `pergunta_opcao_metadata` + `opcao_id` estável (uuid).**
  Hoje as opções vivem como JSONB (`perguntas_formulario.opcoes_resposta: Json`, **sem ID por
  opção**). Decisão: cada opção ganha um `id` (uuid gerado) dentro do `opcoes_resposta`, e a
  tabela `pergunta_opcao_metadata` referencia `(pergunta_id, opcao_id)`. Razão: dá SQL/RLS/índice
  limpos pros consumidores downstream (F8 auto-rejeição por knockout escreve `opcao_knockout_id`;
  F10 lê tags pro score; F15 audita), sobrevive a reordenar/editar texto, e é o que o PRD §8.2
  desenhou. Custo aceito: manter jsonb↔tabela em sync na escrita. **Path 2 (tags embutidas no
  jsonp) foi rejeitado** — empurra jsonb-querying pros EFs e é menos "auditável por SQL".
- **D-11:** **Taxonomia + default (alinhado ao PRD §8.2):** 5 tags
  `knockout/atencao/neutro/pontua/fortemente_pontua` (enum `enum_tag_opcao`) + `peso int`
  (range **-999..100**, default **0**) + `nota_ia text nullable`. Opção não-marcada =
  **`neutro` + peso 0 + nota_ia null** (= "informativa"). Bulk-mark "tudo informativa" aplica
  isso a todas as opções da pergunta em um clique (BulkMarkDialog). **Tag wizard só renderiza
  pra perguntas de escolha** (`single_choice`/`multiple_choice`); texto/numérico não têm opção.
- **D-12:** **Gate de publicação (rascunho→ativa) valida:** (1) `pesos_avaliacao` soma = 100%;
  (2) ≥1 teste em `testes_aplicaveis` com `obrigatorio=true` (RF-11); (3) toda pergunta com
  alguma opção `tag=knockout` deve estar `obrigatoria=true` (RF-02). **Rascunho não valida nada**
  — validação progressiva só dispara no clique "Publicar vaga".

### Claude's Discretion
- Naming exato: do TS config module (`cargoTemplates.ts`), das colunas jsonb, do enum
  `enum_tag_opcao`, e da tabela `pergunta_opcao_metadata` (planner segue convenção pt-BR
  snake_case do projeto).
- Shape interno exato dos jsonb `testes_aplicaveis` e `pesos_avaliacao` (planner define
  seguindo RF-11 + D-07).
- Números concretos dos pesos default por cargo (D-09 — starter, calibrado em UAT).
- Mecânica fina do sync jsonb↔`pergunta_opcao_metadata` na escrita (planner/researcher resolve;
  candidato a RPC SECURITY DEFINER ou EF se a atomicidade exigir).
- Índices em `pergunta_opcao_metadata` (provável `pergunta_id` + parcial `WHERE tag='knockout'`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design congelado (fonte de verdade — PRD-MASTER M2)
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §6 RF-33/34/35/36 (linhas 479-482) —
  templates por cargo real, pesos sliders soma=100%, wizard de tags + bulk-mark, validação
  progressiva no Publicar.
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.2 — schema `pergunta_opcao_metadata`
  (tag/peso/nota_ia/ordem) e `analise_candidato_vaga` (consumidor de score_match em F10).
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.5 — árvore de componentes prevista
  (`config-vaga/`: TemplateVagaSelector, PesosSliders, PerguntaWithTagsForm, BulkMarkDialog).
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.7 — decisões técnicas: storage híbrido
  git→DB (contexto pro banco SJT em F11), score estável.
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §10 Pergunta Aberta #8 — pesos default por
  cargo validados em UAT (não travar a fase nos números exatos).
- `docs/prds/m2-funil-rh/PRD-sjt-work-sample-odontologia.md` — taxonomia dos 8 cargos reais
  (RF-33) + escala de pontuação 4/2/1/0 (contexto pro banco SJT de F11).
- `docs/conhecimento/perguntas-vagas.md` — formulários reais Beauty Smile (origem da taxonomia
  de cargos + perguntas de qualificação/knockout).

### Requirements + roadmap
- `.planning/REQUIREMENTS.md` — VAGACFG-01/02/03 (linhas 65-67) com tags RF entre colchetes.
- `.planning/ROADMAP.md` Phase 7 (linhas 75-88) — Goal + 3 Success Criteria (alvos de verificação).

### Fundação Phase 6 (schema M2 já no banco)
- `.planning/phases/06-pipeline-backbone-schema/06-CONTEXT.md` — D-01 (tabelas de feature
  nascem na fase da feature → `testes_aplicaveis`/`pesos_avaliacao`/`pergunta_opcao_metadata`
  são desta fase), padrão de migration M1, RLS lendo `auth.jwt()->'app_metadata'->>'role'`,
  role values reais `'rh'`/`'administrador'`/`'candidato'` (⚠ NÃO `'admin'`).

### Convenção do projeto
- `CLAUDE.md` §Architecture + §Key Conventions — features/<dominio>/, enums snake_case pt-BR,
  `database.types.ts` gerado (nunca editar à mão), RHF+Zod por step, shadcn/ui + Glass.
- `CLAUDE.md` §Commands — **workaround obrigatório SQLSTATE 42601** para migrations PL/pgSQL
  (recorre se a tabela `pergunta_opcao_metadata` precisar de trigger/RPC).
- `CLAUDE.md` §Security Rules — RLS em 100% das tabelas; nunca `service_role` no client;
  config de vaga é operação RH/admin (RLS por role).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/components/pages/CriarEditarVagaPage.tsx`** (945 linhas) — casca visual Glass + Tabs
  (Básicas/Landing/Perguntas/IA), RadioGroup de `status_vaga`, Select/RichTextEditor. **Save é
  stub** (`console.log` L257) → reusar o visual, não a persistência.
- **`src/features/vagas/`** — feature já existente (services/hooks/store/schemas, foco candidato
  Phase 4). `useVagaPerguntas` (TanStack Query sobre `perguntas_formulario`), `vagasKeys`
  (query keys hierárquicas), padrão de service com classes de erro. Modelo a espelhar em
  `features/config-vaga/`.
- **shadcn/ui primitives** — Slider (pros PesosSliders), Dialog (BulkMarkDialog), Select, Tabs
  já no projeto.

### Established Patterns
- **Opções de pergunta = JSONB** (`perguntas_formulario.opcoes_resposta: Json | null`) — **sem
  ID estável por opção** hoje. D-10 introduz `opcao_id` uuid dentro do jsonb + tabela relacional.
- **Tabela real é `perguntas_formulario`** (não `perguntas` genérica do PRD §8.2). Colunas:
  `id, vaga_id, bloco, tipo_resposta (enum tipo_resposta_pergunta), obrigatoria, opcoes_resposta
  (jsonb), ordem, permite_outros, limite_caracteres, valor_min/max, texto_*`. A FK de
  `pergunta_opcao_metadata` aponta pra `perguntas_formulario(id)`.
- **RLS por role do JWT** (M1): `(auth.jwt()->'app_metadata'->>'role')` ∈ `'rh'`/`'administrador'`
  pra escrita de config. Padrão estabelecido na Phase 6.
- **Commits bloqueados pelo hook tsc** (FOUND-08, baseline ~292-296 erros): convenção =
  `git -c core.hooksPath=/dev/null`. Fernando commita no terminal dele.

### Integration Points
- `vagas` (colunas novas `testes_aplicaveis` + `pesos_avaliacao`) — alvo de escrita da config.
- `perguntas_formulario` + nova `pergunta_opcao_metadata` — alvo do tag wizard.
- `status_vaga` (rascunho→ativa) — gate de publicação (D-03/D-12).
- `database.types.ts` é **gerado** (`npm run db:types`) — regenerar após as migrations.
- Consumidores downstream do que esta fase grava: F8 (knockout lê `tag`/`opcao_id`), F10
  (`score_match` usa pesos/tags), F11 (`testes_aplicaveis`), F15 (consolida pesos).

</code_context>

<specifics>
## Specific Ideas

- O fio condutor de Fernando nas 4 áreas: **camada M2 limpa e nova, montada sobre o que já
  existe, sem rewrite de escopo.** Feature nova, mas só os 3 blocos M2; reusa visual + enum de
  status legados; schema relacional auditável (Path 1) sobre o jsonb existente.
- A distinção que o PRD §8.5 já antecipa nos nomes dos componentes (`TemplateVagaSelector`,
  `PesosSliders`, `PerguntaWithTagsForm`, `BulkMarkDialog`) — usar como guia de decomposição da UI.

</specifics>

<deferred>
## Deferred Ideas

- **Banco de perguntas SJT por cargo** (conteúdo + pipeline `sync-sjt.ts` git→DB, §8.7) —
  Phase 11 (Avaliação Assíncrona), onde é consumido (D-05).
- **Knockouts padrão** (presencial-SP todos cargos; harmonização orofacial dentista) +
  auto-rejeição auditável — Phase 8 (RF-02/RF-03). Phase 7 só entrega o mecanismo de tags.
- **`vaga.qualificacao_etapa1`** (bloco de qualificação por cargo) — Phase 8 (RF-01a).
- **Tabela `vaga_templates` editável pelo RH + UI de edição de template** — não no V1; templates
  são TS config (D-04). Revisitar se RH pedir edição de template sem deploy.
- **Calibração dos pesos default por cargo** — UAT Phase 1 (Sara + Fernando), PRD §10 Q8.
- **Reescrita completa da tela de config** (Básicas/Landing/Perguntas/IA como feature coesa) —
  candidato a Phase 16 (tech-debt/hardening), não nesta fase.

None blocking — discussion stayed within phase scope.

</deferred>

---

*Phase: 7-configura-o-de-vaga-tags*
*Context gathered: 2026-06-07*
