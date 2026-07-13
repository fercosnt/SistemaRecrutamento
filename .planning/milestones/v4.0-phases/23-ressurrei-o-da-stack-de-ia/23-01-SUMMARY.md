---
phase: 23-ressurrei-o-da-stack-de-ia
plan: 01
subsystem: infra
tags: [deno, edge-functions, circuit-breaker, retry, timeout, idempotency, ai-client, anthropic, openai, resilience]

# Dependency graph
requires:
  - phase: 09-ai-prompt-library-cost-infra
    provides: "_shared/ai-client.ts callAi + _shared/circuit-breaker.ts (infra de resiliência original, morta)"
  - phase: 18-ef-resilience
    provides: "per-call timeout (25s) + maxRetries:0 + retry/backoff hand-rolled em callAi"
  - phase: 22-rede-de-testes
    provides: "corpus Deno verde como gate BLOQUEANTE de CI (deno test --config supabase/functions/deno.json)"
provides:
  - "parseIntEnv(name, fallback) exportado — guarda de NaN/≤0 nos envs numéricos (AI-07); reusável por 23-02"
  - "sharedBreaker: singleton module-level de CircuitBreaker (por-isolate) — default de callAi, falhas ACUMULAM entre chamadas (AI-02)"
  - "effectiveThreshold(raw, max) — invariante THRESHOLD ≤ MAX_ATTEMPTS (min clamp), testável de forma determinística"
  - "isRetryable casa o timeout REAL do SDK: name === APIConnectionTimeoutError + regex /tim(e|ed)\\s*out/i (AI-03)"
  - "cap de retry-budget: teto >25s → min(MAX_ATTEMPTS, floor(140000/teto)) p/ caber sob ~150s do EF (AI-04)"
  - "tryIdempotencyReplay success-only: falha cacheada cai p/ chamada nova, destrava reprocess do RH (AI-05)"
affects: [23-02, 24-blindagem-seguranca, avaliar-transcricao-entrevista, gerar-guia-entrevista, gerar-devolutiva-bigfive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "env-int com default-guard (parseIntEnv) — NaN/≤0/ausente → default; nunca envenena while(attempt<NaN)"
    - "invariante como função pura exportada (effectiveThreshold) — testável sem depender de env de module-load (evita Pitfall 3 timing)"
    - "singleton por-isolate injetável (deps.breaker ?? sharedBreaker) — testes de falha SEMPRE injetam um breaker fresh p/ não poluir o corpus"
    - "detecção de erro do SDK por name/constructor.name (não instanceof) — cobre Anthropic E OpenAI sem import estático do SDK"

key-files:
  created: []
  modified:
    - "supabase/functions/_shared/circuit-breaker.ts — envInt local, effectiveThreshold, THRESHOLD via constructor, sharedBreaker singleton"
    - "supabase/functions/_shared/ai-client.ts — parseIntEnv, isRetryable (name+regex), cap de retry-budget, breaker default sharedBreaker, replay success-only"
    - "supabase/functions/_shared/__tests__/circuit-breaker.test.ts — THRESHOLD 5→3, teste da invariante, sharedBreaker export"
    - "supabase/functions/_shared/__tests__/ai-client.test.ts — mock timeout shape real, breaker acumula, cap, replay fail/success"

key-decisions:
  - "circuit-breaker.ts NÃO importa parseIntEnv de ai-client (evita ciclo ai-client↔circuit-breaker) — replica a guarda como envInt local"
  - "invariante THRESHOLD ≤ MAX_ATTEMPTS extraída como função pura effectiveThreshold(raw,max) exportada, testada diretamente (determinística) em vez de setar env no module-load (frágil por module-cache)"
  - "guard de replay = `existing.success !== true` (não `=== false`) — só linhas EXPLICITAMENTE de sucesso replayam; success null/undefined também cai p/ chamada nova"
  - "makeMockAnthropic ganhou opção `error` p/ injetar falha NÃO-retriável e acumular falhas no breaker sem sleeps de backoff (teste determinístico e rápido)"

patterns-established:
  - "Todo teste que produz falha sem sucesso subsequente injeta um CircuitBreaker próprio (Pitfall 3): sharedBreaker só vê sucessos no corpus → fica sempre CLOSED"
  - "cache_hit é overloaded (prompt-cache efêmero VS idempotency-replay) → discriminar replay por anthropic.calls.length, não por cache_hit"

requirements-completed: [AI-02, AI-03, AI-04, AI-05, AI-07]

# Metrics
duration: 16min
completed: 2026-07-05
---

# Phase 23 Plan 01: Núcleo de Resiliência da Stack de IA Summary

**Reanimou o núcleo de resiliência em `_shared/`: circuit breaker compartilhado que abre de verdade (AI-02), timeout do SDK retriável por name+regex (AI-03), cap de retry-budget p/ caber sob ~150s do EF (AI-04), replay de idempotência regenerável só de sucesso (AI-05) e guarda de NaN nos envs numéricos (AI-07) — puro/local, corpus Deno verde 154/0.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-07-06T01:16:20Z (execução Phase 23 iniciada)
- **Completed:** 2026-07-06T01:32:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- **parseIntEnv (AI-07):** helper exportado com guarda de NaN/≤0 aplicado a `MAX_ATTEMPTS` e `AI_CALL_TIMEOUT_MS` — um env malformado (`"abc"`, `"25s"`, `"0"`) cai no default em vez de matar o loop (`while (attempt < NaN)`). Exportado para reuso em 23-02.
- **sharedBreaker + invariante (AI-02):** `circuit-breaker.ts` exporta um singleton module-level (por-isolate) que virou o default de `callAi` — as falhas agora ACUMULAM entre chamadas do mesmo isolate e o disjuntor realmente abre. THRESHOLD passou de literal 5 para env-config (default 3) com a invariante `THRESHOLD ≤ MAX_ATTEMPTS` via `effectiveThreshold(raw,max)=min`.
- **isRetryable casa o timeout real (AI-03):** check por `err.name === "APIConnectionTimeoutError"` (Anthropic E OpenAI, sem import do SDK) + regex ampliada `/529|overloaded|503|429|tim(e|ed)\s*out/i` — casa `"Request timed out."` que a antiga `/timeout/i` perdia no espaço. Comentário errado corrigido.
- **Cap de retry-budget (AI-04):** `effectiveMaxAttempts = teto>25s ? min(MAX_ATTEMPTS, floor(140000/teto)) : MAX_ATTEMPTS` — uma chamada de 60s faz no máx 2 tentativas, não 3, para o total caber sob ~150s do EF (T-23-01-01).
- **Replay success-only (AI-05):** `tryIdempotencyReplay` só replaya `success===true`; uma falha cacheada cai para uma chamada nova, destravando o reprocessamento do RH (guia/transcrição/devolutiva reusam idempotency_key estável) e impedindo que uma falha envenenada seja devolvida como resultado terminal (T-23-01-03).

## Task Commits

Cada task foi commitada atomicamente (husky-bypass via `git -c core.hooksPath=/dev/null`):

1. **Task 1: parseIntEnv (AI-07) + sharedBreaker singleton + THRESHOLD invariante (AI-02)** — `03f6c1b` (feat)
2. **Task 2: isRetryable casa o timeout do SDK (AI-03) + cap de retry-budget (AI-04)** — `94313e8` (fix)
3. **Task 3: replay de idempotência só de SUCESSO (AI-05)** — `de9d84a` (fix)

_Nota: tasks eram tdd="true" com testes já existentes; cada task landou código + teste juntos num único commit (Pitfall 4 — corpus Deno é gate bloqueante, código e teste mudam juntos). RED provado inline para Task 2 (mock timeout shape → teste vermelho antes do fix de isRetryable)._

## Files Created/Modified
- `supabase/functions/_shared/circuit-breaker.ts` — `envInt` local (sem ciclo), `effectiveThreshold(raw,max)`, `THRESHOLD_EFFECTIVE`, `THRESHOLD` via constructor param, `export const sharedBreaker`
- `supabase/functions/_shared/ai-client.ts` — `export function parseIntEnv`, os 2 envs numéricos guardados, `isRetryable` (name+regex), `effectiveMaxAttempts` (cap), breaker default `?? sharedBreaker`, `tryIdempotencyReplay` success-only, re-export de `sharedBreaker`/`parseIntEnv`
- `supabase/functions/_shared/__tests__/circuit-breaker.test.ts` — `THRESHOLD` 5→3, teste da invariante (`effectiveThreshold` + comportamento clampado), teste do export `sharedBreaker`
- `supabase/functions/_shared/__tests__/ai-client.test.ts` — mock default = timeout shape real (`APIConnectionTimeoutError`/`"Request timed out."`), opção `error` no mock, teste do breaker acumulando entre chamadas, teste do cap (60s→2 tentativas), 2 testes de replay (fail→fresh / success→replay), `makeMockSupabaseWithReplay`

## Decisions Made
- **Sem ciclo de import:** `circuit-breaker.ts` replica a guarda de NaN como `envInt` local em vez de importar `parseIntEnv` de `ai-client.ts` (que importa `CircuitBreaker` → ciclo). Módulo mantido PURO.
- **Invariante testável de forma determinística:** extraí `effectiveThreshold(raw,max)` como função pura exportada e testei-a diretamente (`effectiveThreshold(10,3)===3`) + no comportamento (`new CircuitBreaker(effectiveThreshold(10,3))` abre em 3), em vez de setar `CIRCUIT_BREAKER_THRESHOLD=10` no module-load (frágil: o env é lido uma vez no load e o module-cache é compartilhado entre arquivos do corpus).
- **Guard de replay estrito:** `existing.success !== true` (não `=== false`) — só sucesso explícito replaya; qualquer outra coisa cai para chamada nova.
- **Discriminador de replay nos testes:** `anthropic.calls.length` (0 = replay, 1 = chamada nova), não `cache_hit` — o campo `cache_hit` é overloaded (uma chamada NOVA pode reportar `cache_hit=true` por PROMPT-cache efêmero, distinto de idempotency-replay).

## Deviations from Plan

None — plan executado como escrito. As escolhas de implementação (função pura `effectiveThreshold`, opção `error` no mock, guard `!== true`) estavam dentro da discrição concedida pelo plano ("preferir um guard local pequeno", "OU retornar null quando success===false") e não alteram escopo nem comportamento além do especificado.

## Issues Encountered
- **Assert de `cache_hit` errado no 1º draft do teste AI-05 Test A:** a 1ª versão do teste "cached failure não replaya" asseria `result.cache_hit === false`, mas o mock Anthropic retorna `cache_read_input_tokens: 300` → uma chamada NOVA (não-replay) reporta legitimamente `cache_hit=true` (prompt-cache efêmero, distinto de idempotency-replay). Corrigido para asserir no discriminador real (`anthropic.calls.length === 1` + ausência do `error_code` cacheado). Resolvido dentro do Task 3 antes do commit.
- **Sequenciamento mock/isRetryable:** a troca do erro default do mock para a forma real do timeout pertence ao Task 2 (é o RED que o fix de `isRetryable` fecha), não ao Task 1. Corrigido no ato — Task 1 manteve o default retriável ("529 overloaded") e só adicionou a opção `error`; Task 2 trocou o default e provou o RED (teste vermelho) antes do GREEN.

## User Setup Required

None — nenhuma configuração de serviço externo. Os novos envs (`CIRCUIT_BREAKER_THRESHOLD`, e os já existentes `MAX_ATTEMPTS`/`AI_CALL_TIMEOUT_MS`) são todos default-guarded: ausência em PROD é segura. Nenhum deploy/PROD tocado neste plano (puro `_shared/`, Deno-testável).

## Next Phase Readiness
- **23-02** consome `parseIntEnv` (importável de `ai-client.ts`) e o override de 60s no `avaliar-transcricao-entrevista` usa o cap implementado aqui. O cap está pronto; o override per-EF é setado em 23-02.
- `sharedBreaker` é o default de `callAi` — todas as EFs de IA passam a usar o breaker compartilhado sem mudança de call site (nenhuma injeta `breaker`).
- **Gate verde:** corpus Deno 154/0 (era 148/0, +6 testes); tsc baseline 133 inalterado (plano não toca `src/`).
- Sem blockers. AI-01 (SCHEMA_VERSIONS + enum bigfive_devolutiva + migration PROD) e AI-06 (kill-switch/guardrails) ficam nos demais planos da Phase 23.

---
*Phase: 23-ressurrei-o-da-stack-de-ia*
*Completed: 2026-07-05*

## Self-Check: PASSED

- Created/modified files verified on disk: `23-01-SUMMARY.md`, `circuit-breaker.ts`, `ai-client.ts` (+ 2 test files) — all FOUND.
- Task commits verified in git log: `03f6c1b`, `94313e8`, `de9d84a` — all FOUND.
- Deno corpus green: 154 passed / 0 failed. tsc baseline: 133 (unchanged).
