# Phase 9: AI Prompt Library & Cost Infra - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Estabelecer a **infraestrutura de IA compartilhada** do M2 — consumida por toda Edge Function de IA do funil (Phases 10-15), mas **sem nenhum consumidor real ainda nesta fase**. Entrega:

1. **DB schema** — tabelas `prompt_versions`, `ai_call_logs`, `candidate_ai_decisions`, `ai_cost_daily` (+ `data_deletion_log`), enums `llm_call_type`/`llm_provider`/`candidate_status`, conforme AUDITORIA-LGPD §2.
2. **Versionamento híbrido git→DB** — 7 templates Markdown em `docs/conhecimento/prompts/templates/` (já existem) são fonte autoritativa; `scripts/sync-prompts.ts` (Deno) + GitHub Action `prompts-sync.yml` hidratam `prompt_versions` (SemVer + content_hash SHA-256, `is_active=false` por default). Runtime lê **só o DB**.
3. **`_shared` EF helpers** — `ai-client.ts` (Anthropic SDK + Zod structured output + cache ephemeral + circuit breaker 5/60s + retry 3x + cost calc + idempotency + ai_call_logs INSERT + OpenAI GPT-4o-mini fallback), `prompt-loader.ts`, `audit-logger.ts`, `pii-masker.ts` (regex PT-BR), `circuit-breaker.ts`.
4. **`cost-alerter` EF** — pg_cron horário + Postgres NOTIFY canal `cost_anomaly` (trigger pós-INSERT em `ai_cost_daily`) → email DPO/RH lead + linha em `recruiter_alerts`.
5. **Admin UI** (read-only, role `administrador`) — `/admin/ai-logs`, `/admin/prompt-versions` (diff + promote canary + rollback via RPC SECURITY DEFINER), `/admin/ai-costs` (Recharts).
6. **CI guard LGPD-04** — falha o build se string proibida ("teste psicológico" etc.) aparecer no source.

**Fora desta fase:** wiring de qualquer EF consumidora real (Phase 10+), pgmq async queues (Phase 11), tooling de gold-standard validation com dados reais (Phase 10+).

**Spec congelada:** `docs/prds/m2-funil-rh/PRD-ai-prompt-library-m2.md` (10 decisões lockadas) + `docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md` (schema completo) + `08-edge-function-reference.ts` (reference impl 17KB com circuit breaker/retry/idempotency/logging).

</domain>

<decisions>
## Implementation Decisions

### Area 1 — v1 Scope Boundary
- **Admin UI:** Construir as **3 páginas read-only** nesta fase (`/admin/ai-logs`, `/admin/prompt-versions`, `/admin/ai-costs`) — PRD lista como v1 LGPD-minimum. Páginas funcionam sobre o schema mesmo sem dados ainda (consumidores reais chegam na Phase 10+).
- **pgmq async queues** (`ai_evaluation_queue` + retry): **DIFERIDO para Phase 11** — não há producer/consumer nesta fase. Phase 9 entrega só os **pg_cron jobs** (agregação `ai_cost_daily` + retention purge) de que o `cost-alerter` depende.
- **GPT-4o-mini circuit-breaker fallback:** **Implementar completo agora** — breaker (5 falhas/60s) + fallback OpenAI é core de `ai-client.ts` (reference 08 já tem). OpenAI SDK 4.104+ wired.
- **Gold-standard tooling** (`scripts/calculate-pearson.ts` + notebook): **DIFERIDO para Phase 10+** quando houver log data real. Phase 9 entrega só os SQL query templates no RUNBOOK (já existe).

### Area 2 — Verification (sem consumidor real)
- **Prova de que `ai-client` funciona end-to-end:** Deno **unit tests com Anthropic SDK mockado** + **um live manual smoke** via invocação temporária. Wiring de consumidor real fica na Phase 10 (NÃO antecipar `cv_summary` consumer).
- **Cost-alerter thresholds:** usar guardrails do PRD verbatim — custo/candidato p95 ≤ R$ 1,00 (3× baseline R$ 0,38); error rate por call_type 24h: >5% warn / >10% rollback. Custo médio alvo ≤ R$ 0,50/candidato (RNF-10).
- **Ativação de prompt:** sync script grava os 7 como `is_active=false` + `is_canary=false`; primeira ativação por call_type via **SQL one-time manual** (canary path do PRD), não auto-activate.

### Area 3 — forbidden-string CI lint (LGPD-04)
- **Mecanismo:** **Vitest grep test** reusando o precedente `pitfall7.grep.test.ts` — roda no CI existente, falha o build. (Não shell grep separado.)
- **Termos proibidos:** "teste psicológico", "teste psicotécnico", "psicotécnico", "laudo psicológico", "psicólogo" (em product copy) — RNF-12. Claude finaliza a lista exata a partir do PRD/CLAUDE.md.
- **Escopo do scan:** `src/` + `supabase/functions/` (código product-facing + EF). Excluir `docs/` e `.planning/` (conteúdo interno/PRD pode citar os termos legitimamente).

### Claude's Discretion
- Lista exata final de termos proibidos (a partir de RNF-12 + PRD).
- Tuning fino de implementação dentro das 10 decisões lockadas do PRD.
- Layout/composição das 3 páginas admin (read-only) seguindo design system Beauty Smile + glass UI.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Templates já em disco:** `docs/conhecimento/prompts/templates/` tem os 7 (`01-cv-summary.md` … `07-work-sample-sjt.md`) + `00-shared-zod-schemas.ts` + `08-edge-function-reference.ts` (reference impl). Apenas refinar frontmatter (SemVer + content_hash + schema_version_required), **sem renomear** (filename = "current").
- **Docs de suporte já existem:** `CHANGELOG.md`, `USAGE.md`, `RUNBOOK.md`, `README.md`, `AUDITORIA-LGPD-LOGGING-VERSIONING.md` (schema completo), `PESQUISA-prompt-library-ats.md`.
- **EF `_shared`:** `supabase/functions/_shared/` tem `constants.ts`, `schemas.ts`, `__tests__/strict-schema.test.ts`. Novos helpers (`ai-client.ts` etc.) entram aqui.
- **Two-client EF pattern (D-23):** estabelecido na Phase 4 — `supabaseUser` (anon + Authorization, p/ auth.getUser()) + `supabaseAdmin` (service_role, p/ SECURITY DEFINER + privileged reads). NUNCA service_role para auth.getUser().
- **`pitfall7.grep.test.ts`:** precedente de grep test path-scoped que falha o build — base para o LGPD-04 guard.
- **RPC SECURITY DEFINER:** padrão estabelecido (Phase 6/7/8: `publish_vaga`, `upsert_pergunta_opcoes_metadata`) — base para promote-canary/rollback RPCs.
- **Admin role:** RLS usa `'administrador'` (não `'admin'`) — confirmado na Phase 7/8.

### Established Patterns
- **Migration apply em PROD:** via **Supabase MCP** (`apply_migration`/`execute_sql`) bypassa o SQLSTATE 42601 do transaction pooler em PL/pgSQL; reconciliar gravando version rows em `supabase_migrations` + `db push --linked` "up to date". Alternativamente, authoring sem wrapper `BEGIN/COMMIT` deixou `db push --linked` passar limpo na Phase 8. **O trigger pós-INSERT em `ai_cost_daily` (canal `cost_anomaly`) é PL/pgSQL pesado — aplicar este workaround.**
- **`database.types.ts` na RAIZ** do projeto (não `src/types/`) — regenerar após migrations.
- **Commits:** `git -c core.hooksPath=/dev/null` (allowlistado) para bypassar pre-commit tsc contra baseline legado (~293 erros).
- **Edge Functions:** Deno; deploy via `supabase functions deploy <name>`; `--no-verify-jwt` quando aplicável (cost-alerter é server-internal/cron, não user-facing).

### Integration Points
- **Rotas admin:** `src/router/routes.tsx` — adicionar `/admin/ai-logs`, `/admin/prompt-versions`, `/admin/ai-costs` gateadas por role `administrador`.
- **`recruiter_alerts`:** tabela alvo do cost-alerter (verificar se existe na Phase 6/7 schema ou criar).
- **Secrets:** `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` em Supabase Edge Function secrets.
- **CI:** `.github/workflows/` — adicionar `prompts-sync.yml` (path-filtered) + integrar o Vitest LGPD-04 guard no job existente.

</code_context>

<specifics>
## Specific Ideas

- **API keys NÃO configuradas** em Supabase secrets (resposta do usuário). Consequência: o **live manual smoke** de `ai-client` vira **human-gated checkpoint** — os unit tests mockados rodam autonomamente e os PLANs devem marcar o smoke live como `[BLOCKING] non-autonomous` (Fernando adiciona `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` + roda a invocação). Toda verificação autônoma fica em cima de mocks; nenhuma chamada real à Anthropic/OpenAI nesta fase sem o checkpoint.
- Reproducibility Rate alvo ≥99%, Cache hit rate ≥30%, custo médio ≤ R$ 0,50/candidato (RNF-10) — métricas do PRD §2 a honrar no design (não medíveis nesta fase sem dados; o schema/logging precisa só **permitir** medi-las retroativamente via SQL).
- Frontmatter padronizado dos templates: `call_type`, `version` (SemVer), `content_hash`, `schema_version_required`, `model_id`, `max_tokens`, `temperature` (ver PRD §6.1 RF-PL-04).

</specifics>

<deferred>
## Deferred Ideas

- **pgmq async eval queues** (`ai_evaluation_queue` + `ai_evaluation_retry`) → Phase 11 (Avaliação Assíncrona, primeiro producer/consumer).
- **Gold-standard validation tooling** (`scripts/calculate-pearson.ts` + notebook de rating cego) → Phase 10+ (precisa de log data real).
- **Wiring de EF consumidora real** (`cv_summary`/`cv_job_match` na inscrição/triagem) → Phase 10.
- **v2/v3 do PRD:** pgvector FAQ, Anthropic 1h cache, multi-provider routing declarativo, A/B testing real, auto-rollback por métrica, fine-tuning, LLM-based PII detection — todos fora do M2 v1.

</deferred>
