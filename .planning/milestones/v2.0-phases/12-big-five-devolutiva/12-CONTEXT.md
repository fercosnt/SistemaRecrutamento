# Phase 12: Big Five + Devolutiva - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Mode:** Autonomous decisions (user delegated all decisions while away). Grounded in PRD-bigfive-revisado.md + docs/conhecimento/big-five/ + Phase 11 infra.

<domain>
## Phase Boundary

Entrega o **Big Five contextual (AVAL-04)** + a **Devolutiva D-lite (AVAL-08)**, dentro da Etapa 3 (avaliação assíncrona) já construída na Phase 11. O candidato responde o IPIP-NEO-120 (120 itens Likert) com scoring server-side anti-tamper; recebe uma devolutiva respeitosa LGPD-compliant. O Big Five é **contextual — NUNCA rejeita ninguém** (RNF-07a; degradado a contextual no redesign M2). Cobre AVAL-04, AVAL-08 (RF-15, RF-19a/b).

**Fora do escopo:** SJT (Phase 11, feito), Redação cultural (Phase 13), Entrevistas (Phase 14). A devolutiva é SÓ do Big Five — NUNCA para SJT/Redação (RF-19b).

</domain>

<decisions>
## Implementation Decisions (autonomous)

### Scoring server-side anti-tamper (AVAL-04 / RF-15)
- **EF `submit-bigfive-final`** faz o scoring TS-port do IPIP-NEO-120 server-side: 5 dimensões OCEAN + 30 facetas; itens reverse-keyed tratados server-side (a chave de pontuação/reverse NUNCA vai ao cliente — answer-key protection, como o SJT). norm_group → percentis. Persiste `scores_candidato` tipo='big_five' (reusa a tabela genérica da Phase 11; tipo já forward-declarado) com metadata jsonb (5 dims + 30 facetas + percentis + norm_group). **NUNCA escreve candidaturas / nunca rejeita** (RNF-07a — Big Five é contextual). Autoriza: candidate-invoked (JWT), valida auth.uid() dono da candidatura + etapa='avaliacao_assincrona' antes de pontuar ([[reference_ef_authenticate_vs_authorize]]). Cliente envia só respostas Likert (1-5), NUNCA score (.strict()).
- **Item bank seed-direct V1:** os 120 itens IPIP-NEO-120 PT-BR (domínio público, CC0 — de `docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md`) seedados num migration numa tabela dedicada `bigfive_itens` (item_id, texto, dimensao OCEAN, faceta, reverse_keyed bool, ordem). reverse_keyed/dimensao/faceta = chave de scoring → NÃO exposta ao candidato (candidato lê só item_id + texto via projeção segura, como get_opcoes_sjt). Markdown como fonte; CI sync diferido p/ V2 (precedente Phase 11 SJT bank).

### Devolutiva D-lite (AVAL-08 / RF-19a/b)
- **EF `gerar-devolutiva-bigfive`** — híbrido: 25 templates oficiais de banda (5 dims × 5 bandas) + IA para polir o texto (~150-200 palavras/dim). Reusa a infra Phase 9 (ai-client, loadPrompt, audit-logger). Novo prompt `bigfive_devolutiva` adicionado à library (git→DB, is_active flip no apply wave). Output: 5 dims + percentil + banda (5 faixas) + texto/dim + disclaimers LGPD. **Sem nominalização CRP** ("avaliação comportamental", nunca "teste psicológico"/"diagnóstico" — LGPD-04). Persiste nova tabela `devolutivas_candidato`. In-app (candidato vê) + email via n8n (fire-and-forget, não-bloqueante). **NUNCA gera devolutiva para SJT/Redação** (RF-19b — guard explícito).
- Authz: a devolutiva é do próprio candidato → candidato lê A SUA devolutiva (RLS own-row); RH/admin leem também (allowlist). A geração é gated a `scores_candidato` big_five existir.

### UI (candidate + RH)
- **Questionário Big Five:** copia o shell candidato glass (TesteBigFivePage/DashboardCandidato), mobile-first, 120 itens Likert paginados (ex: 12 páginas × 10), autosave 30s reusando `useAutosaveAvaliacao` + `respostas_avaliacao` (Phase 11) + back-lock; barra de progresso; submit → submit-bigfive-final. Candidato NÃO vê score durante (RNF-07a).
- **Devolutiva in-app:** view respeitosa (5 dims, bandas, texto, disclaimers) na área do candidato.
- **RH scorecard big_five:** reusa o ScorecardAvaliacao/allowlist da Phase 11 (contextual, role-gated, sem select('*')); marcado CONTEXTUAL (não eliminatório).
- Adiciona o card Big Five ao container `/candidato/avaliacao/:id` (Phase 11).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 11 + legacy)
- `scores_candidato` (Phase 11, tipo='big_five' já no enum) — reusa; `respostas_avaliacao` (autosave) + `useAutosaveAvaliacao`/`useAvaliacaoDraft` hooks; `AvaliacaoContainer` + the SJT screens as analogs.
- `src/components/pages/TesteBigFivePage.tsx` (legacy candidate Big Five page) + `respostas_bigfive` table (legacy — avaliar se reusa ou cria limpo).
- AI infra Phase 9 (`_shared/ai-client.ts`, prompt-loader, audit-logger); EF analogs = `avaliar-redacao`/`comparativo-candidatos` (C1 authz + the integration-contract lesson [[feedback_integration_contract_gap]] — write a shared client↔EF contract test).
- Item bank: `docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md` + per-dimension docs.

### Established Patterns
- Migrations no-wrapper (D-22) → MCP apply_migration (orchestrator applies; db push has version-row drift). EFs via CLI deploy JWT-ON. Commits `git -c core.hooksPath=/dev/null`. Smoke-runtime RED gate. LGPD-04 grep guard. tsc baseline ~291.
- **Integration-contract test ([[feedback_integration_contract_gap]]):** the client body MUST parse in the EF's Zod schema — write a shared contract test (the Phase-11 C1/C2 lesson). Drop `as never` casts once types regen.

### Integration Points
- New: `bigfive_itens` table (+ safe item reader) + `devolutivas_candidato` table + RLS; `submit-bigfive-final` + `gerar-devolutiva-bigfive` EFs; `bigfive_devolutiva` prompt; candidate questionnaire + devolutiva views; RH big_five scorecard. [BLOCKING] PROD apply wave (migrations + prompt is_active + 2 EFs deploy + db:types + smokes).

</code_context>

<specifics>
## Specific Ideas
- Reverse-keyed + dim/facet mapping is the Big Five "answer key" → server-side only (mirror the SJT answer-key protection).
- Devolutiva tone: respeitosa, sem rótulo clínico, sem nominalização CRP; reusar disclaimers LGPD. É contextual, não decide nada.
- scores_candidato big_five metadata: { dimensoes:[{dim, raw, percentil, banda}], facetas:[{faceta, raw}], norm_group }.

</specifics>

<post_research>
## Decisões resolvidas pós-research (2026-06-09, autônomas)
- **Norm table:** a tabela de normas (560 mean/sd) NÃO está no repo (só em `five-factor-e/ipipneo/norm.py`). O plano sequencia transcrevê-la como constante TS PRIMEIRO (gating). Se o executor não obtiver o arquivo, fallback = norma combinada sex='N' adulto; precisão de percentil é refinamento V2/UAT (Big Five é contextual, não decide).
- **norm_group:** sex='N' (combinado — sexo NÃO é coletado no M2 por LGPD-01) + faixa etária derivada da data de nascimento (essa é coletada). 
- **status:** Big Five SEMPRE `status='sucesso'` em scores_candidato — NUNCA `pendente_humano`, NUNCA eliminatório (contextual, RNF-07a).
- **Email devolutiva:** n8n flow não existe → in-app é o canal primário; webhook fire-and-forget opcional/diferido.
- **Nome CRP:** placeholder, preenchido no go-live (não bloqueia build).
- **Fonte dos 120 itens:** `docs/conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json` (NÃO o `Big Five.md`, que é o BFAS de 100 itens). reverse-key set + faceta=((id-1)%30)+1 + cutoffs em PESQUISA-...md §4.4/§5.

</post_research>

<deferred>
## Deferred Ideas
- CI sync do item bank (markdown→DB) — V2 (seed-direct V1).
- Devolutiva para outros testes — fora de escopo (RF-19b: só Big Five).
- n8n email pipeline além do fire-and-forget webhook — periférico.
</deferred>
