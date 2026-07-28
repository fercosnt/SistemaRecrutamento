# Phase 23: Ressurreição da Stack de IA - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas, all recommended answers accepted

<domain>
## Phase Boundary

A stack de IA silenciosamente morta volta a rodar os prompts reais nos 7 call_types, com circuit breaker vivo, retry de timeout que casa e guardrails de custo que alarmam de verdade — e as telas param de expor percentil bruto. **IA continua recomendação, nunca decisão (RNF-07a).**

Entrega (9 requirements): AI-01 (prompt library viva nos 7 call_types + alarme 0.0.0 + catch restrito), AI-02 (circuit breaker instância compartilhada + THRESHOLD ≤ MAX_ATTEMPTS), AI-03 (isRetryable casa timeout do SDK), AI-04 (timeout override do avaliar-transcricao), AI-05 (replay de idempotência regenerável após falha), AI-06 (guardrails de custo com escopo/janela/canal corretos), AI-07 (guarda de NaN no env), UX-07 (percentil→descritor qualitativo), UX-09 (peso de triagem fora da consolidação + ≥2 etapas).

**Fora do escopo:** blindagem de autorização/PII das EFs (Phase 24 aperta a autz DEPOIS que as EFs estão vivas), correção do funil (P25/26). Este phase ressuscita e endurece a stack de IA — não expande features de IA nem semeia banco de itens (CC0 fica em M5).

</domain>

<decisions>
## Implementation Decisions

### Prompt library revival + circuit breaker (AI-01/02)
- **AI-01 — reconciliar SCHEMA_VERSIONS:** substituir as chaves órfãs de Phase-9 (`sjt_evaluation`, `cv_summary`, `reference_check`, `final_recommendation`, etc.) pelos **call_types REAIS** que as 7 EFs passam a `loadPrompt(...)` — fonte de verdade = as rows de `prompt_versions` seedadas + os call sites das EFs (o researcher enumera os 7 exatos). Dropar os placeholders mortos. (Sintoma: `assertSchemaVersionCompat` lança `SchemaVersionMismatchError` quando `SCHEMA_VERSIONS[call_type]` é undefined → a EF engole no catch → stub de 1 linha logando prompt_version 0.0.0.)
- **AI-01 — catch + alarme:** estreitar o catch nas EFs para NÃO degradar `SchemaVersionMismatchError`/`PromptNotConfiguredError` num stub silencioso (deixar propagar como erro estruturado); emitir um **alarme no ai-logs** (row/flag) quando um call_type resolver para `prompt_version` 0.0.0 (a assinatura do stub) — para nunca mais rodar morto silenciosamente.
- **AI-02 — breaker compartilhado:** transformar em **singleton module-level** exportado de `circuit-breaker.ts` (ex.: `export const sharedBreaker = new CircuitBreaker()`), injetado por TODA EF em `callAi` via `deps.breaker`. Hoje `callAi` faz `deps.breaker ?? new CircuitBreaker()` → se a EF não injeta, cria um breaker NOVO por chamada → falhas resetam toda chamada → THRESHOLD nunca alcança. Estado in-memory por-isolate (limitação documentada, aceita).
- **AI-02 — THRESHOLD:** tornar env-configurável mantendo a invariante **THRESHOLD ≤ MAX_ATTEMPTS** (default 3, casando com MAX_ATTEMPTS default 3). Hoje THRESHOLD=5 fixo > MAX_ATTEMPTS=3 → inalcançável mesmo com instância compartilhada dentro de uma única chamada.

### Retry / timeout / idempotência (AI-03/04/05/07)
- **AI-03 — casar timeout:** `isRetryable` deve casar o timeout do SDK por **tipo do erro** (`APIConnectionTimeoutError` — checar `err.name`/`constructor.name`) **E** por regex ampliada `/tim(e|ed)\s*out/i` (a regex atual `/timeout/i` NÃO casa "Request timed out." — "timed out" tem espaço). O comentário no código (linha ~382) afirma que casa; está errado — corrigir junto.
- **AI-04 — timeout do avaliar-transcricao-entrevista:** passar `timeoutMs` override dimensionado p/ o perfil Sonnet/4000-tokens (**60s**, precedente do `gerar-guia-entrevista` fixado no P21), env-overridable. `callAi` já suporta `timeoutMs` (CallAiArgs) — a EF só não o passa hoje → usa o default 25s → timeout.
- **AI-05 — replay regenerável:** `tryIdempotencyReplay` deve fazer replay **APENAS de linhas de SUCESSO**. Uma falha cacheada (`success=false`) deve cair para uma **chamada nova** (não devolver a falha para sempre), permitindo o RH reprocessar. Hoje o replay devolve o resultado anterior mesmo com `success=false` (`flagged_for_human_review`).
- **AI-07 — guarda de NaN:** helper `parseIntEnv(name, default)` (ou equivalente) aplicado a `MAX_ATTEMPTS` e `AI_CALL_TIMEOUT_MS`: se `Number(env)` for NaN ou ≤0, cair no default (3 / 25000). Hoje um env malformado (`"abc"`) → NaN → `while (attempt < NaN)` nunca roda → nenhuma chamada de API acontece.

### Guardrails de custo + honestidade psicométrica (AI-06, UX-07/09)
- **AI-06 — guardrails de custo:** corrigir o alarme p/ escopo/janela/canal reais (rolling diário, per-vaga + global) e um canal que **alarma de verdade** — não detect-only com 1 dia de atraso. Alinhar ao cost-alerter EF existente (`ai-cost.ts` + a EF de alerta; o researcher detalha o gap exato de escopo/janela/canal).
- **UX-07 — percentil→descritor:** remover o percentil numérico bruto da **devolutiva** e das **telas RH**, substituindo por **bandas qualitativas** ("abaixo do esperado / dentro do esperado / acima do esperado" — bandas finais definidas no plano, alinhadas ao enquadramento psicométrico já usado). Nenhum número cru de percentil exposto ao candidato/RH. (Honestidade psicométrica — a norma Johnson do Big Five já está wired, mas o número percentil ainda engana; ver [[project_m4_audit_scope]].)
- **UX-09 — triagem fora da consolidação:** **REMOVER** o peso de `triagem` das chaves ponderadas da consolidação da decisão final (triagem é pré-triagem de CV, não etapa de avaliação) **E** exigir ≥2 etapas concluídas antes de exibir um número consolidado.
- **Escopo/redeploy:** este phase toca as 7 EFs de IA + `supabase/functions/_shared/*` + telas frontend (devolutiva + RH). Cada EF tocada é **REDEPLOYADA** (bundle-freeze — editar `_shared` só vale p/ a EF redeployada; ver [[reference_ef_shared_bundle_freeze]]); imports `npm:` ESTÁTICOS preservados ([[reference_ef_npm_join_import_bug]]).

### Claude's Discretion
- Os call_types exatos dos 7 (o researcher enumera via grep dos EF index.ts + rows `prompt_versions`).
- O shape exato do alarme 0.0.0 (nova coluna/flag em ai_call_logs vs row de alerta dedicada).
- As bandas qualitativas exatas do UX-07 (nº de bandas + labels pt-BR) dentro da restrição "sem número cru".
- Detalhe interno do cost-guardrail (escopo/janela) conforme o researcher mapear `ai-cost.ts` + cost-alerter.
- Assinatura exata de `parseIntEnv`.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (já lidos nesta sessão)
- `supabase/functions/_shared/prompt-loader.ts` — `SCHEMA_VERSIONS` (chaves órfãs), `loadPrompt`, `assertSchemaVersionCompat` (o throw), `SchemaVersionMismatchError`/`PromptNotConfiguredError`.
- `supabase/functions/_shared/circuit-breaker.ts` — `CircuitBreaker` class (THRESHOLD=5, RESET_MS=60000). É PURO, sem estado compartilhado.
- `supabase/functions/_shared/ai-client.ts` — `callAi` (o coração): `MAX_ATTEMPTS`/`AI_CALL_TIMEOUT_MS` via `Number(env)` (:70/:78), `isRetryable` (:234, regex `/timeout/i`), `const breaker = deps.breaker ?? new CircuitBreaker()` (:300), `tryIdempotencyReplay` (:252, replay de falhas), `CallAiArgs.timeoutMs` (:192 — já existe, subusado).
- `supabase/functions/_shared/ai-cost.ts` — cálculo de custo (AI-06; ler no research).
- `supabase/functions/_shared/audit-logger.ts` — `logAiCall` (onde o alarme 0.0.0 pode aterrissar).
- As 7 EFs de IA em `supabase/functions/*/index.ts` (os call sites de `callAi`/`loadPrompt` — o research enumera).

### Established Patterns
- EFs privilegiadas = two-client (service_role p/ prompt_versions bypassa RLS); autz apertada só na Phase 24.
- Imports `npm:` ESTÁTICOS (nunca `await import([...].join(""))`) — [[reference_ef_npm_join_import_bug]].
- `_shared` bundle-freeze: redeploy cada EF tocada — [[reference_ef_shared_bundle_freeze]].
- Deno test corpus agora RODA em CI (Phase 22) — cada mudança em `_shared`/EF é regress-guarded pelos ~148 testes Deno + o job bloqueante.
- Commits via `git -c core.hooksPath=/dev/null` (husky tsc gate, baseline pinado 133).

### Integration Points
- `callAi` (deps.breaker) ← todas as 7 EFs injetam o `sharedBreaker`.
- `SCHEMA_VERSIONS` ↔ `prompt_versions` rows (call_type) ↔ EF call sites — o trio que precisa alinhar.
- `ai_call_logs` — onde o alarme 0.0.0 e os guardrails de custo observam.
- Frontend devolutiva (gerar-devolutiva-bigfive output + tela) + telas RH de score — UX-07.
- Consolidação da decisão final (pesos) — UX-09.

</code_context>

<specifics>
## Specific Ideas

- O bug do timeout (AI-03) é literal: `/timeout/i.test("Request timed out.")` === false (espaço em "timed out"). Casar por tipo `APIConnectionTimeoutError` é o mais robusto.
- O breaker (AI-02) é o caso clássico "singleton por isolate": exportar uma instância module-level de `circuit-breaker.ts` e injetá-la; NÃO criar por chamada.
- AI-05: o replay hoje devolve `success=false` rows com `flagged_for_human_review` — trocar p/ "só replay de sucesso" é a mudança mínima que destrava reprocessamento.
- Norma Johnson do Big Five já está wired (bigfive-scoring.ts) mas pode estar NÃO commitada (ver [[project_m4_audit_scope]]) — verificar antes de tocar a devolutiva no UX-07.

</specifics>

<deferred>
## Deferred Ideas

- Autorização/PII das EFs de IA (autenticar-E-autorizar, IDOR) → Phase 24.
- Seed real do banco de itens cognitivo (CC0-01) → M5/PSICO (aqui não).
- Calibração real do SJT / LLM-as-judge / norma local do cognitivo → M5.
- WR-02 do Phase 22 (tratamento RNF-12a do literal `psicólogo(a)` no gerar-devolutiva-bigfive) — pode ser resolvido de verdade aqui se a devolutiva for tocada no UX-07; senão segue p/ Phase 24.
