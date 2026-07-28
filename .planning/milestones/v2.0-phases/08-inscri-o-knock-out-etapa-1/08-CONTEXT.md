# Phase 8: Inscrição & Knock-out (Etapa 1) - Context

**Gathered:** 2026-06-07
**Status:** Ready for planning

<domain>
## Phase Boundary

O candidato se inscreve numa vaga através de um **form LGPD-clean** (sem CPF/foto/estado
civil/saúde), responde a um **bloco de qualificação por cargo** (templated, ≤10 perguntas,
≤1 aberta) e, ao marcar uma opção `tag='knockout'`, a candidatura é **auto-rejeitada na
hora** (`status='rejeitado'`, `etapa='inscricao'`, `motivo='knockout_automatico'` +
`opcao_knockout_id`), com mensagem ao candidato e linha de auditoria em
`historico_candidatura` (`auto_rejeitado=true`) — **sem que nenhum trait/score participe
da decisão**. Os knockouts padrão (presencial-SP em todos os cargos; harmonização orofacial
só dentista) funcionam de fábrica.

**Requirements:** INSCR-01, INSCR-02, INSCR-03, INSCR-04, LGPD-01.

**Não é desta fase:**
- O **mecanismo de tags** em opções (`pergunta_opcao_metadata`, enum `enum_tag_opcao`,
  wizard) — já entregue na Phase 7. Esta fase **usa** o mecanismo para configurar/avaliar
  knockouts, não o reconstrói.
- A **triagem com IA** (`score_match`, EF `analise-candidato-individual`, painel RH) —
  Phase 10 (TRIAGEM-01..04). Esta fase só **alimenta** o consumidor: grava as respostas de
  qualificação que a F10 vai pontuar; o trigger de IA dispara para sobreviventes do knockout.
- **Big Five / testes assíncronos** (`testes_aplicaveis` já existe em `vagas`) — Phase 11+.
- O **direito à explicação detalhada** (LGPD Art. 20, motivo + "revisão por pessoa natural")
  — Phase 15 (DECISAO-04). Aqui a mensagem ao candidato é **neutra** (ver D-15).
- **Snapshot mensal de bias / selection rate** (`bias_audit_log` já existe, Phase 6) —
  Phase 15 (LGPD-03). Aqui só garantimos que idade/data-nasc **nunca** entra em decisão.

</domain>

<decisions>
## Implementation Decisions

> **Convenção de status das decisões:** decisões marcadas **[LOCKED]** foram escolhidas
> explicitamente pelo Fernando na discussão. Decisões marcadas **[REC]** são direções
> recomendadas que o Fernando delegou ("você decide") — o researcher deve **confirmar**
> contra o PRD/código vivo antes do planner travar; são o default se a pesquisa não
> contradizer.

### A. Form de inscrição LGPD-clean (INSCR-01, LGPD-01)
- **D-01 [REC]:** **Camada M2 limpa sobre o M1, sem rewrite de escopo** (mesmo fio
  condutor da Phase 7). Os campos PII pessoais (nome, email, telefone, CEP, data
  nascimento, LinkedIn) vivem no perfil `candidatos` (/cadastro, M1 Phase 2); os campos
  **contextuais da vaga** (pretensão, disponibilidade início, inglês, "como conheceu",
  Instagram por-cargo) entram no fluxo da candidatura/Etapa-1. Researcher deve confirmar
  o mapeamento exato campo→tabela contra o schema vivo de `candidatos` e decidir se o
  rework do `/cadastro` (tornar LGPD-clean) cabe nesta fase ou se a inscrição é uma feature
  nova por-vaga. **Restrição dura:** o conjunto final coletado = exatamente os campos do
  INSCR-01, nada além.
- **D-02 [REC]:** **CPF legado → coluna `candidatos.cpf` vira nullable + remover da
  coleta/UI/exibição** (reversível, menor blast-radius sobre dado histórico em prod).
  **Não** dropar a coluna no V1; política de purga/anonimização decidida depois (mesmo
  espírito do backup_m2 da Phase 6). Researcher deve confirmar que nenhum consumidor
  crítico lê `cpf` antes de remover da coleta. Mesma regra para `genero` se ele não for
  necessário (estado civil/saúde/foto já não existem ou são proibidos).
- **D-03 [LOCKED]:** **Dedup/identidade do candidato passa a ser por EMAIL** (já
  normalizado lowercase no schema M1). O duplicate-check RPC (SECURITY DEFINER, padrão
  CLAUDE.md) deve usar email como chave de unicidade — **não mais CPF**. Researcher
  confirma como o duplicate-check funciona hoje e onde ele é chamado.
- **D-04 [REC]:** **Enforcement de "campos proibidos" = defesa em profundidade:** schema
  Zod **`.strict()` no server** (EF/RPC) que rejeita qualquer chave desconhecida
  (cpf/foto/estado_civil/saude → 400 fail-closed) + allowlist explícita dos campos
  permitidos + validação client espelhada (RHF+Zod por step, padrão M1). Casa com o
  success criterion #1 ("schema Zod rejeita campos proibidos, client + server"). O lint/grep
  de strings proibidas no CI é primariamente do LGPD-04 (Phase 9) mas pode começar aqui se
  barato.
- **D-05 [REC]:** **Data de nascimento coletada conscientemente (LGPD-01/RNF-07b), mas
  idade NUNCA participa de decisão.** O dado existe em `candidatos`; a garantia desta fase
  é estrutural: nenhuma lógica de knockout/qualificação/score pode usar idade. O snapshot
  de viés etário em si é Phase 15 (LGPD-03) — aqui só não-poluímos a decisão.

### B. Qualificação por cargo vs `perguntas_formulario` (INSCR-02, INSCR-03)
- **D-06 [LOCKED]:** **Knockout = uma OPÇÃO marcada `tag='knockout'` dentro de uma
  pergunta de qualificação; a tag na opção decide o efeito.** Um bloco/contêiner só — não
  há um "bloco de knockout" visualmente separado das perguntas de qualificação. Ex.:
  "Aceita trabalhar presencialmente em SP?" → opção "Não" com `tag='knockout'`. Isso casa
  diretamente com o mecanismo da Phase 7 (`pergunta_opcao_metadata` keyed por `opcao_id`).
- **D-07 [REC]:** **Um contêiner relacional + jsonb derivado.** As perguntas da Etapa 1
  (qualificação + as que carregam opção knockout) vivem em **`perguntas_formulario`**
  (marcadas como Etapa-1 — via `bloco` ou coluna de etapa, planner decide), com tags via
  Phase 7. **`vaga.qualificacao_etapa1 jsonb` (coluna NOVA desta fase) = snapshot DERIVADO
  escrito no "Publicar vaga"** (quais perguntas compõem a qualificação + config de scoring),
  para leitura rápida do `score_match` (F10) e dos filtros do painel RH — **sem** o consumidor
  ter que re-derivar via joins a cada query. **Source of truth = `perguntas_formulario` +
  `pergunta_opcao_metadata`; o jsonb é cache/projeção.** Razão: D-06 (knockout é opção numa
  pergunta) só faz sentido se as perguntas vivem onde as tags vivem (Phase 7). Researcher
  **deve confirmar** contra PRD §8.2/§8.5 que isso bate com o desenho previsto e resolver
  o shape exato do jsonb; se o PRD desenhou o jsonb como source-of-truth self-contained
  (Modelo "dois contêineres"), reabrir com o Fernando antes de travar.
- **D-08 [REC]:** **Respostas da qualificação gravadas em `respostas_formulario`** (reusa
  a tabela já escrita pelo `submit_candidatura_atomic` na Phase 4: uma linha por pergunta,
  keyed `pergunta_id` + `resposta_opcoes`/`resposta_texto`/`resposta_numerica`). O
  `score_match` (F10) lê dali via join com `pergunta_opcao_metadata`. Coerente com D-07.
- **D-09 [REC]:** **Limite ≤10 perguntas / ≤1 aberta validado no "Publicar vaga"**
  (estende o gate de publicação da Phase 7 D-12: soma pesos=100%, ≥1 teste obrigatório,
  toda pergunta com opção knockout deve ser `obrigatoria=true`). Validação progressiva —
  rascunho não trava. Planner decide se há também um teto no template.

### C. Mecânica da auto-rejeição (INSCR-04)
- **D-10 [REC]:** **Check de knockout roda DENTRO do `submit_candidatura_atomic` RPC**
  (estende o RPC SECURITY DEFINER atômico existente). Após gravar `respostas_formulario`,
  faz join com `pergunta_opcao_metadata WHERE tag='knockout'`; se alguma resposta casar,
  seta o estado de rejeição na **mesma transação**. Síncrono — o candidato vê o resultado
  na hora ("auto-rejeição imediata"). **Só sobreviventes** recebem `etapa='triagem'` (é o
  gatilho que a F10/TRIAGEM-01 espera disparar "pós-knockout"). Researcher confirma o melhor
  ponto de inserção dado o contrato da F10.
- **D-11 [REC]:** **Estado no knockout: `etapa_atual='inscricao'` + `status='rejeitado'`**
  (literal ao success criterion #3 — "rejeitado na etapa de inscrição"). O `status`
  (`status_candidatura`) carrega a rejeição; `etapa_atual` (`etapa_processo`) marca ONDE
  ocorreu. Ambos os valores já existem nos enums (Phase 6). O terminal `etapa='rejeitado'`
  do enum fica para transições posteriores do funil, não para o knockout de Etapa 1.
- **D-12 [REC]:** **Colunas NOVAS em `candidaturas`: `motivo_rejeicao` (enum/text — começa
  com `'knockout_automatico'`) + `opcao_knockout_id` (uuid, FK lógica p/ `opcao_id` de
  `pergunta_opcao_metadata`).** Reusa `feedback_rejeicao` (já existe) para a mensagem ao
  candidato. Literal ao criterion #3 ("a candidatura grava ... motivo + opcao_knockout_id").
  Migration nova (workaround 42601 se vier com função/trigger). Planner confirma tipo de
  `motivo_rejeicao` (enum dedicado vs text).
- **D-13 [REC]:** **A linha de auditoria entra em `historico_candidatura` via INSERT
  explícito DENTRO do RPC, na mesma transação** (`auto_rejeitado=true`, `ator=NULL`,
  `criterio_texto` descrevendo o knockout, `etapa_para` coerente com D-11). Não depender do
  trigger `avancar_etapa()` da Phase 6 (que dispara em UPDATE) porque o knockout acontece no
  INSERT do submit. Consistente com Phase 6 D-09 ("auto-rejeição por knockout → ator NULL +
  auto_rejeitado=true"). Planner verifica se isso exige ajuste no trigger da Phase 6 para
  não duplicar histórico.

### D. Knockouts padrão + mensagem ao candidato (INSCR-03, INSCR-04)
- **D-14 [REC]:** **Knockouts padrão semeados via `cargoTemplates.ts` (estende o TS config
  da Phase 7).** O template de cargo carrega as perguntas de qualificação/knockout default;
  ao selecionar o template no create da vaga, a UI **copia** as perguntas para
  `perguntas_formulario` + as tags para `pergunta_opcao_metadata` (mesmo padrão que a Phase 7
  já usa para `testes_aplicaveis`/`pesos`). Presencial-SP em **todos** os templates;
  harmonização orofacial **só** no template `dentista`. Source of truth em git, vaga é dona
  da cópia (override natural). Researcher resolve a parametrização do "presencial SP" (texto
  fixo da clínica-SP vs derivado da modalidade/localização da vaga) — candidato a Claude's
  Discretion se não houver sinal no PRD.
- **D-15 [LOCKED]:** **Mensagem de rejeição NEUTRA, sem expor o critério que disparou o
  knockout** (ex.: "Após análise dos requisitos da vaga, não seguiremos com sua candidatura
  neste momento."). LGPD-conservadora. O direito à explicação detalhada + "solicitar revisão
  por pessoa natural" é a Phase 15 (DECISAO-04/LGPD), não aqui. Mensagem padrão única.
- **D-16 [REC]:** **Visibilidade da mensagem: inline pós-submit (imediata) + persiste em
  `candidaturas.feedback_rejeicao` exibido no dashboard `/perfil`.** Dupla visibilidade.
  Exige **ligar a exibição de `feedback_rejeicao`** (hoje a coluna existe mas
  `MeuPerfilCandidatoPage`/`DashboardCandidatoPage` só mostram o status, sem o motivo).

### Claude's Discretion
- Onde exatamente o form de inscrição mora (rework do `/cadastro` vs feature nova
  `features/inscricao/`) — D-01, decidido pelo researcher/planner com base no blast-radius.
- Naming das colunas novas: `qualificacao_etapa1` (jsonb em `vagas`), `motivo_rejeicao` +
  `opcao_knockout_id` (em `candidaturas`), e marcador de etapa em `perguntas_formulario`
  (planner segue convenção pt-BR snake_case).
- Tipo de `motivo_rejeicao` (enum dedicado vs text) e shape do jsonb `qualificacao_etapa1`.
- Parametrização do knockout "presencial SP" (texto fixo vs derivado da vaga) — D-14.
- Índices novos (provável `candidaturas(opcao_knockout_id)` parcial, e o que a query do
  score_match/filtros exigir sobre `qualificacao_etapa1`).
- Se `genero` também sai da coleta (junto do CPF) — D-02, depende do que o dado/consumidores
  mostrarem.
- Decisão de manter o duplicate-check existente vs reescrever para email-only — D-03.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design congelado (fonte de verdade — PRD-MASTER M2)
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §6 RF-01/RF-01a/RF-02/RF-03/RF-04 —
  form de inscrição LGPD-clean, bloco de qualificação por cargo, knockout questions
  configuráveis, auto-rejeição imediata + auditoria.
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.2 — schemas `pergunta_opcao_metadata`
  (tags/peso — entregue na Phase 7) + onde `qualificacao_etapa1`/respostas se encaixam;
  **confirmar o desenho do `vaga.qualificacao_etapa1` (jsonb derivado vs source-of-truth)**
  para validar D-07.
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.5 — árvore de componentes prevista
  (form de inscrição + bloco de qualificação) — guia de decomposição da UI.
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.7 — decisões técnicas (storage híbrido
  git→DB, score estável) — contexto pro seed via templates (D-14).
- `docs/conhecimento/perguntas-vagas.md` — formulários reais Beauty Smile (origem das
  perguntas de qualificação/knockout reais e dos 8 cargos).
- `docs/prds/m2-funil-rh/PRD-sjt-work-sample-odontologia.md` — taxonomia dos 8 cargos
  (template dentista carrega o knockout de harmonização orofacial).

### Requirements + roadmap
- `.planning/REQUIREMENTS.md` — INSCR-01..04 + LGPD-01 (linhas 24-27, 78) com tags RF/RNF.
- `.planning/ROADMAP.md` Phase 8 — Goal + 4 Success Criteria (alvos de verificação).

### Fundação Phases 6 + 7 (schema M2 já no banco)
- `.planning/phases/06-pipeline-backbone-schema/06-CONTEXT.md` — D-06/D-08/D-09:
  `avancar_etapa()` trigger em UPDATE, `historico_candidatura` (ator NULL-able +
  `auto_rejeitado`), guardrail zero-auto-reject vive SÓ em `decisao_final.por_usuario`
  (knockout de pipeline é rejeição permitida), enums `etapa_processo` (inclui `inscricao`)
  e `status_candidatura` (inclui `rejeitado`), roles reais `'rh'`/`'administrador'`.
- `.planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md` — D-10/D-13/D-14: tags em
  `pergunta_opcao_metadata` keyed por `opcao_id` estável (uuid), `opcoes_resposta` migrado
  p/ `[{id,texto}]`, `cargoTemplates.ts` (TS config copia defaults pra vaga), gate de
  publicação rascunho→ativa, `vagas.testes_aplicaveis`/`pesos_avaliacao` jsonb já live.

### Convenção do projeto
- `CLAUDE.md` §Architecture + §Key Conventions — `features/<dominio>/`, enums snake_case
  pt-BR, `database.types.ts` gerado (nunca editar à mão), RHF+Zod por step, shadcn/ui + Glass.
- `CLAUDE.md` §Commands — **workaround obrigatório SQLSTATE 42601** para migrations PL/pgSQL
  (recorre se a auto-rejeição vier como função/trigger ou se o RPC precisar ser recriado).
- `CLAUDE.md` §Security Rules — RLS em 100% das tabelas; nunca `service_role` no client;
  duplicate check via RPC SECURITY DEFINER (não anon SELECT); "avaliação comportamental"
  (nunca "teste psicológico"); sistema NUNCA rejeita por score (RNF-07a — knockout é
  critério OBJETIVO, não score/trait).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`supabase/functions/submit-candidatura/index.ts`** + **`submit_candidatura_atomic` RPC**
  (`supabase/migrations/20260425000003_submit_candidatura_rpc.sql`) — EF + RPC SECURITY
  DEFINER atômico que grava `candidaturas` (status `aguardando_resposta`, etapa `triagem`) +
  `respostas_formulario`. **Alvo da extensão do knockout (D-10):** o check entra aqui.
- **`supabase/functions/_shared/schemas.ts`** (`submitCandidaturaSchema`) — schema Zod
  server-side das EFs; modelo para o enforcement `.strict()` (D-04).
- **`src/features/vagas/hooks/useVagaPerguntas.ts`** + **`candidaturaFormSchema.ts`** +
  **`src/lib/opcoes/opcoesNormalize.ts`** (`opcoesToStrings()`) — render dinâmico de
  `perguntas_formulario` + factory Zod que lê `opcoes_resposta` no shape `[{id,texto}]`
  (Phase 7). Reusar para o bloco de qualificação/knockout da Etapa 1.
- **`src/features/config-vaga/templates/cargoTemplates.ts`** (Phase 7 — confirmar path) —
  TS config dos 8 cargos; **alvo da extensão do seed de knockouts padrão (D-14)**.
- **`src/components/pages/MeuPerfilCandidatoPage.tsx`** / `DashboardCandidatoPage.tsx` —
  status do candidato; **precisa ligar a exibição de `feedback_rejeicao`** (D-16).
- **shadcn/ui + Glass + RHF+Zod por step** — primitives do form de inscrição.

### Established Patterns
- **Opções com `opcao_id` estável** (`opcoes_resposta: [{id,texto}]`, Phase 7 D-13) +
  `pergunta_opcao_metadata(pergunta_id, opcao_id, tag, peso, nota_ia, opcao_texto)` —
  o knockout casa resposta→opção por `opcao_id`. `enum_tag_opcao` inclui `knockout`.
- **RPC SECURITY DEFINER atômico** para escrita de candidatura (não INSERT direto do client);
  duplicate-check via RPC SECURITY DEFINER (CLAUDE.md) — D-03 muda a chave pra email.
- **`historico_candidatura`** append-only: ação humana → `ator=auth.uid()`; ação de sistema
  (knockout) → `ator=NULL` + `auto_rejeitado=true` (Phase 6 D-09).
- **RLS por role do JWT** `(auth.jwt()->'app_metadata'->>'role')` ∈ `'rh'`/`'administrador'`
  para config; candidato lê/escreve só o próprio dado.
- **Commits bloqueados pelo hook tsc** (FOUND-08, baseline ~292-301): `git -c
  core.hooksPath=/dev/null`. Fernando commita no terminal dele.
- **Migrations PL/pgSQL via Supabase MCP `execute_sql`** (bypassa 42601) + reconciliar
  version rows — padrão estabelecido nas Phases 6/7.

### Integration Points
- `candidaturas` — colunas novas `motivo_rejeicao` + `opcao_knockout_id` (D-12); reusa
  `feedback_rejeicao`/`etapa_justificativa`; muda o estado inicial no submit (D-10/D-11).
- `vagas` — coluna nova `qualificacao_etapa1 jsonb` (D-07, snapshot derivado no Publicar).
- `candidatos` — `cpf` → nullable + fora da coleta (D-02); dedup por email (D-03).
- `perguntas_formulario` + `pergunta_opcao_metadata` — perguntas de qualificação/knockout
  da Etapa 1 (D-06/D-07); marcador de etapa (`bloco`/coluna nova).
- `respostas_formulario` — store das respostas de qualificação (D-08), consumido pela F10.
- `historico_candidatura` — linha de auditoria do knockout (D-13).
- `database.types.ts` — regenerar (`npm run db:types`) após as migrations.
- **Consumidores downstream:** F10 (score_match lê respostas+tags; trigger de IA dispara só
  p/ sobreviventes em `etapa='triagem'`), F15 (audita motivo de rejeição/explicação).

</code_context>

<specifics>
## Specific Ideas

- Fio condutor (consistente c/ Phases 6/7): **camada M2 limpa montada sobre o M1, sem rewrite
  de escopo.** Reusa o RPC atômico, o render de perguntas, o cargoTemplates e a maquinaria de
  tags da Phase 7; adiciona só o necessário (form LGPD-clean, qualificacao_etapa1, knockout
  no submit, exibição de feedback_rejeicao).
- **Knockout é critério OBJETIVO, não score/trait** — distinção que o Fernando preserva desde
  a Phase 6: rejeição de pipeline por critério objetivo (presencial/especialidade) é
  permitida e auditável; o guardrail zero-auto-reject (LGPD-02) é sobre decisão final por
  trait/score, não sobre knockout objetivo.
- A auto-rejeição deve ser **síncrona e imediata** (no submit), não um job assíncrono — o
  candidato sai do form já sabendo, e a F10 só vê sobreviventes.

</specifics>

<deferred>
## Deferred Ideas

- **Direito à explicação detalhada (LGPD Art. 20)** + "solicitar revisão por pessoa natural"
  + ticket interno — Phase 15 (DECISAO-04). Aqui a mensagem é neutra (D-15).
- **Snapshot mensal de bias / selection rate (regra 4/5 EEOC)** — Phase 15 (LGPD-03); a
  tabela `bias_audit_log` já existe (Phase 6). Aqui só garantimos idade fora da decisão.
- **Lint/grep de strings proibidas ("teste psicológico") no CI** — primariamente LGPD-04
  (Phase 9); pode começar nesta fase se trivial.
- **score_match + painel RH + trigger de IA** — Phase 10 (TRIAGEM); esta fase só alimenta.
- **Política de purga/anonimização do CPF legado** (após nullable) — decidida depois, fora
  do V1 (mesmo espírito da retenção do backup_m2 da Phase 6).
- **Rework completo do `/cadastro` como feature coesa** — se o blast-radius for grande, o
  planner pode limitar ao mínimo LGPD-clean e deixar refactor amplo p/ Phase 16 (hardening).

None blocking — discussion stayed within phase scope.

</deferred>

---

*Phase: 8-inscri-o-knock-out-etapa-1*
*Context gathered: 2026-06-07*
