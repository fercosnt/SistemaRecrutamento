# Phase 10: Triagem RH com IA + Comparativo (Etapa 2) - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 grey areas, all recommendations accepted ("aceitar tudo")

<domain>
## Phase Boundary

Entrega o **lado RH da Etapa 2 (Triagem)**: análise individual automática por candidatura via IA (`score_match` 0-100 + resumo CV + fortes/gaps/flags), o painel `/rh/vagas/:id/candidatos` pré-ranqueado, e o comparativo on-demand de 2-10 candidatos lado-a-lado com ranking IA justificado + export PDF. A IA é **sempre recomendação, nunca decisão automática** (RNF-07a). Cobre TRIAGEM-01..04 (RF-05..RF-10).

**Fora do escopo desta fase:** scoring de testes assíncronos (Etapa 3, Phase 11+), decisão final consolidada (Etapa 6, Phase 15), agendamento de entrevista. Não re-pontua nem aplica pesos finais — o `score_match` aqui é só o sinal de triagem inicial sobre CV + respostas da Etapa 1.

</domain>

<decisions>
## Implementation Decisions

### Análise Individual por IA (TRIAGEM-01)
- **Disparo:** trigger DB pós-knockout no INSERT de candidatura → `pg_net` chama a Edge Function `analise-candidato-individual` de forma assíncrona (≤30s, fora da transação do `submit_candidatura_atomic`). Reusa o padrão pg_net estabelecido na Phase 9 (cost-anomaly).
- **Falha:** persiste row com `status='falhou'` + `erro`; o painel mostra "análise pendente/falhou — reprocessar" com botão de reprocessamento manual. Não deixa row ausente.
- **Fonte do `score_match` 0-100:** a EF usa o prompt `cv_job_match` (Sonnet, Phase 9 prompt library) sobre CV + respostas da Etapa 1, num único call que retorna score + resumo_cv + resumo_respostas + pontos_fortes + gaps + flags. Pesos da vaga (`pesos_avaliacao`) **não** entram aqui — isso é da Decisão Final.
- **Idempotência:** 1 row por candidatura (upsert em `candidatura_id`), mantém a última análise; histórico auditável fica em `ai_call_logs` (Phase 9).

### Painel de Candidatos (TRIAGEM-02)
- **Layout:** tabela densa (shadcn `table.tsx`) dentro do shell glass RH, com coluna `score_match` escaneável para 30+ candidatos (substitui os cards glass atuais de `VagaCandidatosRHPage`, mantendo o RHLayout/glass shell).
- **Seleção p/ comparativo:** checkbox por linha + barra de ação sticky mostrando a contagem; botão "Comparar" habilita só com 2-10 selecionados (tooltip explica o limite).
- **Paginação:** numerada server-side, 20/pág (prev/next + número de página), reusando os `PaginationParams` já suportados no hook `useCandidaturas`.
- **Ordenação/filtros:** default `score_match` DESC; filtros por etapa + status; busca por nome mantida; candidaturas sem análise (pendente/falhou) vão pro fim da ordenação.

### Comparativo & Export PDF (TRIAGEM-03/04)
- **Orientação da tabela:** candidatos como **colunas** (até 10), atributos como linhas (score estável, ranking 1-N, pontos_fortes, gaps, justificativa_ia, ação avançar/rejeitar); scroll horizontal no overflow.
- **PDF:** client-side com `jspdf` + `jspdf-autotable` (texto selecionável, tabela estruturada, bundle leve) — preferido sobre snapshot raster (html2canvas) ou geração server-side.
- **Persistência:** grava cada solicitação em `comparativo_solicitado` (candidatura_ids + ranking JSON + latência_ms; trilha de auditoria RF-09); a tela sempre roda fresh, sem reuso de cache no V1.
- **Ações:** avançar/rejeitar inline com dialog de confirmação chamando os RPCs de etapa existentes (`avancar_etapa`); a IA é sugestão, nunca auto-ação. Rejeição aqui **não** exige justificativa longa (obrigatória só na Decisão Final / Etapa 6).

### Apresentação da IA & Guardrails (RNF-07a)
- **Enquadramento:** todo score/ranking carrega selo visível "Sugestão da IA — decisão é sempre humana".
- **Exibição do score:** número 0-100 + banda de cor qualitativa (verde/amarelo/vermelho), sem nenhuma auto-ação atrelada.
- **Modelo por chamada:** análise individual = prompt `cv_job_match` (Sonnet); comparativo = Sonnet — segue a prompt library da Phase 9, mantendo o teto de custo ≤ R$0,50/candidato no funil.
- **Flags:** strings curtas livres do modelo (Zod `string[]`), exibidas como badges puramente informativos, sem comportamento de gating (não bloqueiam avanço).

### Comparativo on-demand (TRIAGEM-03 — contrato da EF)
- Edge Function `comparativo-candidatos` recebe `{ vaga_id, candidatura_ids[] }`; valida 2-10 ids e que **todos pertencem à mesma vaga** (erro 400 caso contrário); retorna ranking + justificativa relativa Zod-validada em P95 ≤5s; usa a infra de IA da Phase 9 (two-client D-23, ai-client, audit-logger).

### Decisões resolvidas pós-research (2026-06-08 — emergiram da inspeção do código live)
- **Fonte da análise (`resumo_cv`/`score_match`):** a EF `analise-candidato-individual` **extrai o texto do PDF do CV** (parser Deno-compatível, ex: `unpdf`) além das respostas da Etapa 1 — `resumo_cv` é um resumo fiel do CV de verdade, não só das respostas. Decisão do usuário (sobre a recomendação respostas-only). Implica: download do PDF do bucket privado `curriculos` dentro da EF (service_role) + extração de texto + truncamento de token-budget antes do prompt `cv_job_match`. Falha de extração (PDF corrompido/imagem) → análise segue só com respostas + flag "cv_nao_extraido", nunca quebra a row.
- **Comparativo single-eval (≤5s):** uma passada única no prompt `comparative_ranking` p/ cumprir o P95 ≤5s; mitiga viés de posição **ancorando no `score_match` estável** + **ordenando os candidatos por score antes** de montar o prompt. A dupla-avaliação (swap+média) prescrita no prompt fica como V2 — o plano deve documentar essa simplificação explicitamente.
- **Backfill = só botão reprocessar:** o trigger cobre toda candidatura NOVA; candidaturas antigas (dados de teste no M2 recém-aberto) aparecem como "análise pendente/falhou" com botão **Reprocessar análise**. Sem loop de migração histórica one-time.
- **Gaps de contrato a fechar (Wave-0, achados no research):** (a) `prompt-loader.ts` `SCHEMA_VERSIONS` não contém `comparative_ranking` → adicionar; (b) prompts seedados estão `is_active=false` → flipar `is_active=true` em PROD (apply BLOCKING); (c) `CvJobMatchSchema` usa chaves em inglês (`match_score`/`strengths`/`gaps`) → a EF mapeia p/ as colunas pt-BR de `analise_candidato_vaga`. `pontos_fortes`/`gaps` (objetos Zod) achatados p/ `text[]` curtos; estrutura completa preservada em `resumo_respostas`/raw (discrição de Claude).
- **PDF stack:** `jspdf@4.2.x` + `jspdf-autotable@5.0.x` (confirmar via `npm view` no install; pedigree sólido).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Rota já existe:** `/rh/vagas/:id/candidatos` em `src/router/routes.tsx` (guard `role={['rh','administrador']}`).
- **Página alvo:** `src/components/pages/VagaCandidatosRHPage.tsx` — hoje lista candidaturas por vaga em cards glass com search + status filter, ações Ver Perfil/Aprovar/Rejeitar; precisa ganhar coluna score, multi-select, paginação, botão Comparar.
- **Hook/serviço:** `src/features/vagas/hooks/useCandidaturas.ts` (`candidaturasKeys.listByVaga(vagaId, filters?, orderBy?, pagination?)` já aceita `PaginationParams`); `candidaturasService.ts`.
- **Shell RH:** `src/components/RHLayout.tsx` (BackgroundImage darkBlue + RHSidebar + RHTopBar); canonical a copiar = `VagaCandidatosRHPage`.
- **UI primitives:** `src/components/ui/{table,badge,button,glass}.tsx` (table.tsx existe mas não usado em RH ainda).
- **AI infra Phase 9 (`supabase/functions/_shared/`):** `ai-client.ts` (resolvedPromptFromLoaded, calculateCost, detectPromptInjection, CircuitBreaker), `prompt-loader.ts` (`loadPrompt(call_type, supabaseAdmin)`), `audit-logger.ts` (`logAiCall`, computeInputHash, computeRetainUntil), `pii-masker.ts`, `injection-detector.ts`, `circuit-breaker.ts`. Prompt `cv_job_match` registrado na library (`prompt_versions`).
- **Padrão EF:** two-client D-23 (supabaseUser anon p/ auth.getUser; supabaseAdmin service_role p/ writes); shape canônico em `supabase/functions/submit-candidatura/index.ts`.

### Established Patterns
- TanStack Query v5 (staleTime 5min, retry 2), query keys hierárquicas.
- `database.types.ts` na **RAIZ** do repo (gerado, nunca editar à mão).
- Migrations PL/pgSQL aplicadas em PROD via **Supabase MCP `execute_sql`** (bypassa 42601) + reconcilia version rows; OU `db push --linked` com authoring sem wrapper BEGIN/COMMIT (D-22). Phase 8 fez `db push` limpo.
- Commits via `git -c core.hooksPath=/dev/null` (tsc pre-commit hook vs baseline legado).
- Pitfall 7 redaction (logs sem PII) + LGPD-04 grep guard (sem "teste psicológico").

### Integration Points
- Tabelas novas a criar: `analise_candidato_vaga` e `comparativo_solicitado` (RLS obrigatório: admin full, RH own vagas, candidato sem acesso a score/flags — ver [[reference_select_star_leaks_pii]]).
- `candidaturas` já tem `score_geral` (null) / `etapa_atual` / `status`.
- pg_net + trigger no INSERT de candidaturas (padrão cost-anomaly Phase 9).
- **Nova dependência:** `jspdf` + `jspdf-autotable` (nenhuma lib PDF no `package.json` hoje).

</code_context>

<specifics>
## Specific Ideas

- Reusar o selo/disclaimer "Sugestão da IA — decisão é sempre humana" como componente compartilhado (vai reaparecer nas Phases 11-15).
- A leitura RH do painel deve ser allowlist explícita de colunas (NÃO `select('*')`) para não vazar PII/critério ao candidato em rotas adjacentes — lição da Phase 8 ([[reference_select_star_leaks_pii]]).
- Tabela comparativa com candidatos-em-colunas será reusada na Decisão Final (DECISAO-02 "reusa o Comparativo da Etapa 2").

</specifics>

<deferred>
## Deferred Ideas

- Comparativo lado-a-lado de **redações** (RF-17a → V2, fora do M2).
- LLM-as-judge com calibração contínua (Vervoe-style) — Future.
- Cache/reabertura de comparativos anteriores sem re-rodar — V2 (V1 sempre roda fresh).
- Filtro por faixa de score no painel — não pedido; default etapa+status atende.

</deferred>
