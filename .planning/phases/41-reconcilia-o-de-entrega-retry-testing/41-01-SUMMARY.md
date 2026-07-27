---
phase: 41-reconcilia-o-de-entrega-retry-testing
plan: 01
subsystem: testing
tags: [deno, edge-functions, resend, dependency-injection, backoff, retry, notificacoes]

# Dependency graph
requires:
  - phase: 38-notificar-candidato
    provides: EF notificar-candidato (claim-before-send + ledger 2-fase + fetch Resend)
  - phase: 36-identidade-remetente
    provides: _shared/email-config.ts (contrato de modo/destinatário, ZERO IMPORTS)
  - phase: 10-triagem-rh-com-ia
    provides: molde import.meta.main + handler(req, deps) de analise-candidato-individual
provides:
  - "notificar-candidato expõe handler(req, deps) com fetch/supabaseAdmin/serviceKey injetáveis (mockável SEM --allow-net)"
  - "computeProximaTentativa(novasTentativas): backoff exponencial 15m/1h/6h/24h capado em 5 (helper puro)"
  - "exigirSinkTeste(paraEfetivo, modo): guard non-prod hard-fail (DELIV-03), fiado no handler antes do fetch"
  - "registrarFalha parametrizado (novasTentativas default 1) — hook pronto p/ o retry do 41-04"
affects: [41-04 (branch retry retry_id), 41-02 (esqueleto EF webhook), 41-05 (redeploy), CI mock]

# Tech tracking
tech-stack:
  added: []  # nenhum pacote novo; npm:svix entra no 41-02
  patterns:
    - "import.meta.main + handler(req, deps) para notificar-candidato (deps injetáveis; Deno.serve só como entrypoint)"
    - "guard puro non-prod (exigirSinkTeste) no molde de exigirChaveApi, ZERO IMPORTS"
    - "backoff exponencial capado como função pura testável (computeProximaTentativa)"

key-files:
  created:
    - .planning/phases/41-reconcilia-o-de-entrega-retry-testing/41-01-SUMMARY.md
  modified:
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/notificar-candidato/helpers.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
    - supabase/functions/_shared/email-config.ts
    - supabase/functions/_shared/__tests__/email-config.test.ts

key-decisions:
  - "exigirSinkTeste fiado APÓS o claim (não antes) — registrarFalha grava por dedupe_key, que só existe após o claim; antes do claim o update seria no-op e perderia o registro de falha. Invariante de segurança preservada: o guard roda antes de QUALQUER fetch."
  - "RECON-03 permanece Pending — este plano entrega só a peça de backoff (computeProximaTentativa); a varredura pg_cron (o deliverable real de RECON-03) é 41-03/41-05."
  - "Refatoração structural-only: caminho normal preservado byte-a-byte; os 5 casos puros COMM-01/04 pré-existentes passam sem edição de asserção."

patterns-established:
  - "handler(req, deps) injetável para notificar-candidato — fetch do Resend + createClient viram deps mockáveis, testes rodam sem --allow-net"
  - "exigirSinkTeste — guard de destinatário non-prod (hard-fail em modo=teste fora de *@resend.dev)"

requirements-completed: []  # RECON-03 parcial (só o backoff); não marcado complete — ver Decisões

# Metrics
duration: 20min
completed: 2026-07-26
---

# Phase 41 Plan 01: Wave-0 Testabilidade (deps injetáveis + backoff + guard non-prod) Summary

**`notificar-candidato` refatorada para `handler(req, deps)` com `fetch`/`supabaseAdmin`/`serviceKey` injetáveis (mockável sem `--allow-net`), mais `computeProximaTentativa` (backoff exponencial capado em 5) e `exigirSinkTeste` (guard non-prod DELIV-03) como funções puras testadas e fiadas no handler.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-26T20:47:00-03:00 (aprox.)
- **Completed:** 2026-07-26T21:06:00-03:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- EF `notificar-candidato` agora expõe `export async function handler(req, deps)` com `NotificarDeps { supabaseAdmin, fetchImpl, serviceKey }`; `Deno.serve` só roda sob `import.meta.main`. O `fetch` do Resend e o `createClient` deixaram de ser construídos inline — chegam por deps, então o teste mocka o envio **sem `--allow-net`** (pré-requisito do retry 41-04 e do mock de CI).
- `computeProximaTentativa(novasTentativas)` puro: backoff exponencial `15m → 1h → 6h → 24h` indexado pela nova contagem, com **cap 5 ⇒ `null`** (linha fica `falhou`, sem retry infinito — T-41-02).
- `exigirSinkTeste(paraEfetivo, modo)` puro: hard-fail em `modo=teste` quando o destinatário efetivo não termina em `@resend.dev` (T-41-01/DELIV-03), fiado no handler antes de qualquer envio; mensagem sem PII; `email-config.ts` mantém ZERO IMPORTS.
- `registrarFalha` unificado com o backoff helper e parametrizado (`novasTentativas` default 1) — deixa o hook pronto para o branch de retry do 41-04; `RETRY_INTERVALO_MS` hardcoded removido.
- Caminho normal preservado byte-a-byte: os 5 casos puros COMM-01/04 pré-existentes passam sem alteração de asserção; suite Deno completa da EF **240 passed / 0 failed sem `--allow-net`**.

## Task Commits

Each task was committed atomically (todos `--no-verify`; baseline tsc `src/**` = 97, flat):

1. **Task 1: Refatorar para handler(req, deps) + migrar teste** - `794c1bc` (refactor)
2. **Task 2 (RED): tests de computeProximaTentativa + exigirSinkTeste** - `f1cf99a` (test)
3. **Task 2 (GREEN): computeProximaTentativa + exigirSinkTeste + fiação** - `3cbaf1d` (feat)

_Task 2 tem `tdd="true"` → ciclo RED (test) → GREEN (feat); nenhum refactor adicional necessário._

## Files Created/Modified
- `supabase/functions/notificar-candidato/index.ts` - Extraído `NotificarDeps` + `handler(req, deps)`; `Deno.serve` sob `import.meta.main`; `fetch`→`deps.fetchImpl`; self-auth contra `deps.serviceKey`; `registrarFalha` parametrizado com `computeProximaTentativa`; guard `exigirSinkTeste` antes do envio; `RETRY_INTERVALO_MS` removido.
- `supabase/functions/notificar-candidato/helpers.ts` - `computeProximaTentativa` (backoff exponencial capado) puro.
- `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` - `loadHandler()`/`makeRequest` + 2 casos (Bearer ausente/divergente → 401 via handler injetado) + 2 casos de backoff (1..4; cap 5/6 ⇒ null); 5 casos puros pré-existentes intactos.
- `supabase/functions/_shared/email-config.ts` - `exigirSinkTeste` (guard non-prod hard-fail), molde de `exigirChaveApi`, ZERO IMPORTS mantido.
- `supabase/functions/_shared/__tests__/email-config.test.ts` - 3 casos de `exigirSinkTeste` (throw em teste/non-resend.dev; passa em teste/@resend.dev; não gateia produção).

## Decisions Made
- **Placement do `exigirSinkTeste` após o claim (não antes):** o plano sugeria "após `resolverDestinatario`, antes do claim/fetch", mas `registrarFalha` grava por `dedupe_key`, que só existe depois do claim. Chamar o guard antes do claim tornaria "gravar `falhou` via `registrarFalha`" um no-op (0 linhas), perdendo o registro. Coloquei o guard logo após o claim ter sucesso e antes de render/fetch — a invariante de segurança (nenhum envio em run de teste fora de `@resend.dev`) é totalmente preservada, pois o guard roda antes de qualquer `fetch`. Em `modo=teste` o `resolverDestinatario` já produz um sink `@resend.dev`, então na prática o guard é defesa-em-profundidade e não dispara no fluxo normal.
- **RECON-03 mantido `Pending`:** este plano é Wave-0 e entrega apenas a peça de backoff (`computeProximaTentativa`). O deliverable real de RECON-03 (varredura `pg_cron` `varrer_retry_notificacoes` + `cron.schedule`) é 41-03/41-05. Marcar RECON-03 completo agora seria impreciso no traceability — deixei para o plano que entrega o cron.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Correctness] `exigirSinkTeste` movido para depois do claim + `registrarFalha` hoisted**
- **Found during:** Task 2 (fiação no handler)
- **Issue:** O plano posicionava o guard "antes do claim/fetch" e mandava gravar `falhou` via `registrarFalha` no throw; mas `registrarFalha` faz `.update().eq("dedupe_key", …)`, que exige a linha já reivindicada (claim). Antes do claim, o update afetaria 0 linhas e o registro de falha se perderia silenciosamente.
- **Fix:** Movi a definição de `registrarFalha` para logo após o claim e coloquei o `try/catch` do `exigirSinkTeste` em seguida (antes de render/fetch). A propriedade de segurança (guard antes de qualquer envio) é mantida.
- **Files modified:** supabase/functions/notificar-candidato/index.ts
- **Verification:** deno test da EF verde sem `--allow-net`; grep `exigirSinkTeste` no index.ts = 2 (≥1); caminho normal intacto (240 passed).
- **Committed in:** `3cbaf1d` (parte do commit GREEN da Task 2)

---

**Total deviations:** 1 auto-fixed (1 correctness)
**Impact on plan:** Ajuste necessário para que o registro de falha do guard funcione de verdade; sem scope creep. Comportamento de runtime da EF preservado no caminho normal.

## Issues Encountered
- Acceptance criterion `grep -c "deps.fetchImpl"` exigia a referência literal `deps.fetchImpl`; eu havia desestruturado `fetchImpl` de `deps`. Ajustei o call-site para `deps.fetchImpl(...)` (sem desestruturar) para satisfazer o critério literal e manter a intenção (fetch injetável). Resolvido na Task 1.

## User Setup Required
None - nenhuma configuração de serviço externo. Zero contato com PROD (só código + `deno test`). O redeploy da EF é o plano GATED 41-05.

## Next Phase Readiness
- **41-02** (EF `resend-webhook`): pode reusar o molde `import.meta.main` + handler testável já provado aqui.
- **41-04** (branch retry): o hook está pronto — `handler(req, deps)` com `fetchImpl` mockável + `registrarFalha(motivoLog, novasTentativas)` parametrizado + `computeProximaTentativa` para `row.tentativas + 1`.
- **RECON-03** segue `Pending` até 41-03/41-05 entregarem a varredura `pg_cron`.
- Sem blockers. DELIV-01 (domínio Resend) permanece o gate do UAT ao vivo — não afeta este plano (só código/CI).

## Self-Check: PASSED

All 5 modified files + SUMMARY.md exist on disk; all 3 task commits (`794c1bc`, `f1cf99a`, `3cbaf1d`) present in git log. Suite Deno completa da EF verde (240 passed / 0 failed) SEM `--allow-net`; tsc `src/**` flat em 97 (baseline).

---
*Phase: 41-reconcilia-o-de-entrega-retry-testing*
*Completed: 2026-07-26*
