# Phase 11: Avaliação Assíncrona — Infra + Work Sample/SJT (Etapa 3) - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 grey areas, all accepted ("aceitar tudo"; SJT bank = seed-direct V1)

<domain>
## Phase Boundary

Entrega a **infraestrutura da Etapa 3 (Avaliação Assíncrona)** + o **Work Sample/SJT** por cargo. O candidato convocado (`etapa_atual='avaliacao_assincrona'`) acessa `/candidato/avaliacao/:candidatura_id`, faz os testes SJT (múltipla escolha com scoring determinístico + caso aberto avaliado por IA com rubric BARS), com autosave 30s e back-lock; o RH vê scorecards estruturados. Scoring **nunca auto-rejeita** (RNF-07a). Cobre AVAL-01, AVAL-02, AVAL-03, AVAL-09 (RF-11/12/13/14/18/19).

**Fora do escopo desta fase:** Big Five (AVAL-04 → Phase 12), Redação cultural + revisão humana (AVAL-05/06/07 → Phase 13), Devolutiva (AVAL-08 → Phase 12). A EF `avaliar-redacao` é criada aqui mas usada para o **SJT caso aberto** (prompt `sjt_evaluation`/template 07); a redação cultural (template diferente) é Phase 13.

</domain>

<decisions>
## Implementation Decisions

### Container de Avaliação & navegação (AVAL-01 / RF-11/12)
- **Layout:** lista de cards (1 por teste pendente) no shell candidato glass (copy `DashboardCandidatoPage` — BackgroundImage gradient + GlassCard, mobile-first), cada card mostra tempo estimado + status; ordem livre.
- **testes_aplicaveis:** estende o schema Phase-7 (`src/features/config-vaga/schemas/testesAplicaveisSchema.ts`) com chaves SJT (`cargo`, `itens_ids[]`, `bateria_size`, `threshold`); default por template de cargo; ≥1 obrigatório validado no publish.
- **Gating:** rota `/candidato/avaliacao/:candidatura_id` guarded + RLS keyed a `candidaturas.etapa_atual='avaliacao_assincrona'`; etapa errada → bloqueado/redirect (mensagem neutra).
- **Independência:** cada teste é salvo independentemente; o container mostra feito/pendente por teste; conclusão parcial permitida.

### SJT múltipla escolha — scoring determinístico (AVAL-02 / RF-13)
- **Fórmula:** `Score_sjt = Σ peso(opcao_marcada)` **determinístico, server-side** (RPC/EF SECURITY DEFINER, NUNCA client). Escala via `enum_tag_opcao`/`pergunta_opcao_metadata` (Phase 7): `fortemente_pontua=4`, `pontua=2`, `neutro=1`, `atencao=0`+flag.
- **Threshold:** `<60% do máximo OU ≥1 atencao` → `status='pendente_humano'`, **NUNCA auto-reject** (RNF-07a — nenhuma mudança de etapa por score). Persiste `scores_candidato` tipo='sjt' + metadata jsonb (breakdown por item).
- **Banco de questões (decisão-chave):** **seed-direct V1** — 1-2 itens SJT por cargo seedados diretamente num migration; markdown em `docs/conhecimento/sjt/banco-sjt-<cargo>.md` como fonte/documentação. O CI `scripts/sync-sjt.ts` (hybrid git→DB completo, PRD §8.1) fica **diferido para V2** quando o banco crescer (o pattern já está provado pela prompt library Phase 9 — [[feedback_versioning_pattern]]).
- **Anti-cheat:** randomiza ordem das opções por sessão + soft timer (não-hard) no V1; pool>bateria com draw diferido enquanto o banco for pequeno; cláusula TCLE.

### SJT caso aberto — scoring por IA (AVAL-03 / RF-14)
- **EF:** cria `supabase/functions/avaliar-redacao/index.ts` consumindo o prompt `sjt_evaluation` (template `07-work-sample-sjt`, Sonnet, com inclusion/exclusion criteria + "Cite Before You Speak"), reusando a infra Phase 9 (ai-client, loadPrompt, audit-logger, injection/maskPII). **Candidate-invoked (JWT-ON).**
- **Escala BARS:** o prompt retorna 1-5 por dimensão (ou `insufficient_evidence`); a EF **mapeia para um composto 0-25** (documenta o mapeamento no código). Persiste `scores_candidato` tipo='sjt' (caso aberto) + citações + red_flags Zod-validados.
- **Threshold:** `<13/25 OU ≥1 red_flag` → `pendente_humano`, nunca auto-reject.
- **Authz (lição C1 Phase 10 — [[reference_ef_authenticate_vs_authorize]]):** a EF DEVE validar `auth.uid()` é dono da `candidatura_id` **E** `etapa_atual='avaliacao_assincrona'` antes de escrever (autorizar, não só autenticar). RH/admin leem scores via allowlist role-gated; candidato nunca lê scores de outros.

### Autosave & back-lock + scorecards RH (AVAL-09 / RF-18/19)
- **Autosave:** 30s — buffer `sessionStorage` (padrão `useCadastroDraft`) + upsert server debounced 30s numa tabela de progresso.
- **Back-lock:** RLS keyed a `etapa_atual='avaliacao_assincrona'` na tabela de respostas/progresso + guard na EF/RPC de submit; uma vez que `avancar_etapa` move a etapa, o candidato não escreve mais.
- **Tabela de progresso:** nova `respostas_avaliacao` (ou `progresso_avaliacao`) — `candidatura_id`, `teste`, `respostas jsonb`, `updated_at`; RLS own-row do candidato + etapa gate; service_role/EF escreve scores.
- **Scorecards RH:** RH lê `scores_candidato` via allowlist role-gated (reusa o padrão do painel Phase 10 — NÃO `select('*')`), scorecard estruturado por dimensão; candidato denied.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Shell candidato (mobile-first):** `src/components/pages/DashboardCandidatoPage.tsx` (BackgroundImage gradient + GlassCard) — canonical a copiar; `TesteBigFivePage.tsx` é um exemplo de teste-page legado.
- **Autosave/draft:** `src/features/cadastro/hooks/useCadastroDraft.ts` (sessionStorage, dies-with-tab → LGPD).
- **Config vaga Phase 7:** `src/features/config-vaga/schemas/{testesAplicaveisSchema,pesosAvaliacaoSchema,tagOpcaoSchema}.ts`; `pergunta_opcao_metadata` (peso/tag/nota_ia) + `enum_tag_opcao` (5 tags) — dirigem o scoring SJT.
- **AI infra Phase 9 (`supabase/functions/_shared/`):** ai-client, prompt-loader (`SCHEMA_VERSIONS` JÁ tem `sjt_evaluation:1.0.0`), audit-logger, pii-masker, injection-detector. Template `docs/conhecimento/prompts/templates/07-work-sample-sjt.md`.
- **Etapa machine:** `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` (`avancar_etapa()` BEFORE UPDATE, regressão exige `etapa_justificativa`, 1 historico row, SECURITY DEFINER, auth.uid() GUC-based).
- **EF patterns:** two-client D-23 (`submit-candidatura`); the Phase-10 EFs (analise/comparativo) as the freshest analog (incl. the authz fix).

### Established Patterns
- TanStack Query v5; query keys hierárquicas; `database.types.ts` na RAIZ (gerado).
- Migrations PL/pgSQL: no-wrapper authoring (D-22) → apply via Supabase MCP `apply_migration` (records version row, no 42601) OU `db push --linked`. EFs via supabase CLI `functions deploy` (auto-bundles _shared).
- Commits `git -c core.hooksPath=/dev/null`. Smoke-runtime gate (RED tests Wave-0). LGPD-04 grep guard ("avaliação comportamental/cognitiva", nunca "teste psicológico"). Pitfall-7 log redaction.

### Integration Points
- Tabelas novas: `scores_candidato` (tipo enum sjt/big_five/...; metadata jsonb), `perguntas` (tipo='sjt', cargo, dimensao, cenario, formato, content_hash, status), `respostas_avaliacao`/progresso. RLS obrigatório (candidato own-row + etapa gate; RH/admin read scores allowlist).
- Rota nova `/candidato/avaliacao/:candidatura_id` em `src/router/routes.tsx`.
- EF nova `avaliar-redacao` (sjt_evaluation). RPC de submit SJT (scoring determinístico server-side).
- `testes_aplicaveis` estendido (Phase-7 schema) → consumido pelo container.

</code_context>

<specifics>
## Specific Ideas

- O `scores_candidato` deve ser desenhado genérico o suficiente p/ servir Big Five (P12), Redação (P13), Entrevista (P14) e Decisão (P15) — tipo enum + metadata jsonb. Desenhar 1 vez aqui, reusar.
- A EF `avaliar-redacao` será reusada/estendida em Phase 13 (redação cultural, outro template) — desenhar o handler genérico por `call_type`/prompt.
- Aplicar a lição C1 (autenticar≠autorizar) em TODA EF candidate-invoked desta fase desde o início ([[reference_ef_authenticate_vs_authorize]]).
- RH scorecards reusam o padrão de allowlist role-gated do painel Phase 10 ([[reference_select_star_leaks_pii]]).

</specifics>

<post_research>
## Decisões resolvidas pós-research (2026-06-09 — achadas lendo os bancos/templates live)

- **CORREÇÃO de fato:** o prompt da library é `work_sample_sjt` (não `sjt_evaluation`). O DB seed, o enum `llm_call_type`, o frontmatter do template 07 e a Zod `WorkSampleScoringSchema` usam `work_sample_sjt`. `loadPrompt('sjt_evaluation')` lançaria `PromptNotConfiguredError`. A EF `avaliar-redacao` DEVE chamar `loadPrompt('work_sample_sjt')`. (O `sjt_evaluation` em `SCHEMA_VERSIONS` é uma chave órfã.)
- **Composto 0-25 (SJT caso aberto):** **ponderado por rubric** (PRD-fiel) — composto = soma ponderada das dimensões (pesos do rubric da pergunta, ex: dentista 25/20/25/15/15%) × score 1-5, escalado p/ 0-25. Qualquer dimensão `insufficient_evidence` → `pendente_humano` (NÃO fabrica score). Os pesos por dimensão ficam no rubric da `perguntas` (metadata).
- **Threshold MC (SJT múltipla escolha):** **configurável por vaga** — `testes_aplicaveis` ganha `threshold.mc_min_pct` (default **60%** do CONTEXT); cada banco/cargo pode sobrescrever (dentista=83% / `<10/12`). Sempre `<threshold OU ≥1 atencao → pendente_humano`, nunca auto-reject.
- **`work_sample_sjt` é seeded `is_active=false`** → flip `is_active=true` em PROD é um passo [BLOCKING] no wave de apply (como o cv_job_match/comparative_ranking da Phase 10).
- **PG ≥15:** Supabase Pro é PG15+; ok usar `UNIQUE NULLS NOT DISTINCT` se preciso (A2) — mas preferir um idiom portável onde der.

</post_research>

<deferred>
## Deferred Ideas

- CI `sync-sjt.ts` hybrid markdown→DB completo (PRD §8.1) — V2 quando o banco SJT crescer; V1 seeda direto.
- Pool>bateria com draw aleatório — V2 (banco pequeno no V1).
- Banco SJT completo p/ todos os cargos — V1 tem 1-2/cargo (PRD Out of Scope explícito).
- Big Five, Redação cultural, Devolutiva — Phases 12/13.

</deferred>
