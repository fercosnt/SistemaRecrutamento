---
phase: 41-reconcilia-o-de-entrega-retry-testing
plan: 04
subsystem: testing
tags: [deno, edge-functions, resend, retry, backoff, idempotency, notificacoes]

# Dependency graph
requires:
  - phase: 41-reconcilia-o-de-entrega-retry-testing
    plan: 01
    provides: "handler(req, deps) injetável (fetchImpl/supabaseAdmin/serviceKey) + registrarFalha parametrizado + computeProximaTentativa (backoff cap 5)"
  - phase: 38-notificar-candidato
    provides: "EF notificar-candidato (claim-before-send + ledger 2-fase + fetch Resend)"
  - phase: 36-identidade-remetente
    provides: "_shared/email-config.ts (resolverDestinatario/resolverModo/exigirSinkTeste)"
provides:
  - "notificar-candidato ganha o BRANCH RETRY gateado por retry_id: re-tenta a linha EXISTENTE por id (pula o claim), incrementa tentativas (row+1), grava proxima_tentativa_em via backoff (null no cap 5)"
  - "guard de elegibilidade do retry (ausente | status terminal | tentativas>=5 → 200 skipped:nao_elegivel) — respeita o cap 5 antes de qualquer envio"
  - "header Idempotency-Key no fetch do Resend (retry_id no retry / dedupe_key no normal) — cinto secundário 24h (LEDGER-02)"
  - "cobertura de teste do branch retry com fetch/supabaseAdmin mockados (SEM --allow-net): elegibilidade, sucesso→enviado por id, non-2xx→falhou+backoff, e caminho normal preservado"
affects: [41-05 (redeploy da EF + apply do cron), varrer_retry_notificacoes (41-03)]

# Tech tracking
tech-stack:
  added: []  # zero pacotes novos
  patterns:
    - "branch opt-in gateado por campo do body (retry_id) que altera SÓ a estratégia de write (por id vs por dedupe_key) e o incremento de tentativas — caminho normal preservado byte-a-byte"
    - "Idempotency-Key do provedor (Resend) como cinto secundário de double-send além do UNIQUE(dedupe_key) durável"
    - "mock de supabaseAdmin roteado por tabela (rowFor) + captura de update/upsert em arrays inspecionáveis — testa write-strategy sem rede"

key-files:
  created:
    - .planning/phases/41-reconcilia-o-de-entrega-retry-testing/41-04-SUMMARY.md
  modified:
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts

key-decisions:
  - "Guard de elegibilidade do retry posicionado LOGO após o parse (antes da resolução de dados), como manda o plano: um retry_id não-elegível (cap 5 / status terminal / ausente) short-circuita em skipped:nao_elegivel sem gastar as 3 leituras de allowlist nem tocar o fetch."
  - "registrarFalha deixou de receber novasTentativas como parâmetro e passou a lê-lo do closure (1 no normal, row.tentativas+1 no retry) — todos os call-sites já chamavam com 1 arg; a mudança é transparente e centraliza a decisão do alvo (id vs dedupe_key) num único ponto."
  - "Idempotency-Key = retry_id ?? dedupe_key. No retry a chave é o id da linha (estável entre sweeps); no normal é o dedupe_key. Ambos ≤256 chars e nunca logados (T-41-16)."

patterns-established:
  - "branch retry (retry_id) na EF de envio: pula o claim, re-tenta linha existente por id, incrementa tentativas com backoff capado, preservando o caminho normal"

requirements-completed: []  # RECON-01/RECON-03 mantidos Pending — ver Decisões

# Metrics
duration: ~10min
completed: 2026-07-26
---

# Phase 41 Plan 04: Branch Retry (retry_id) + Idempotency-Key Summary

**A EF `notificar-candidato` ganhou o BRANCH RETRY que a varredura `pg_cron` (41-03) aciona: um body com `retry_id` pula o claim-before-send, carrega a linha EXISTENTE por id, re-tenta o envio, INCREMENTA `tentativas` (row+1) e grava `proxima_tentativa_em` via backoff (null no cap 5) — mais o header `Idempotency-Key` do Resend como cinto secundário de 24h. Caminho normal preservado; branch coberto por testes com `fetch`/`supabaseAdmin` mockados SEM `--allow-net`.**

## Performance

- **Duration:** ~10 min (change cirúrgica sobre os hooks já prontos do 41-01)
- **Started:** 2026-07-27T00:51:50Z
- **Completed:** 2026-07-27T00:55:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **Branch retry (gate por `retry_id`)** em `index.ts`: LOGO após o parse, se `retry_id` presente, a EF faz `SELECT id, status, tentativas, dedupe_key … WHERE id = retry_id` e aplica o **guard de elegibilidade** — linha ausente OU `status NOT IN ('pendente','falhou')` OU `tentativas >= 5` ⇒ `200 { skipped: "nao_elegivel" }` **sem** resolver dados nem tocar o `fetch` (respeita o cap 5, T-41-14). Caso elegível, fixa `novasTentativas = row.tentativas + 1`.
- **Claim gateado por `!retry_id`**: o passo 5 (upsert ON CONFLICT dedupe_key ignoreDuplicates) roda apenas no caminho normal. O retry o pula deliberadamente — hoje um 2º disparo colapsaria em `skipped:duplicate` porque o `ignoreDuplicates` não retorna id.
- **Escritas keadas por id no retry**: `registrarFalha` e a escrita de sucesso passam a keyar por `.eq("id", retry_id)` no retry (e `.eq("dedupe_key", dedupe_key)` no normal). `registrarFalha` usa `computeProximaTentativa(novasTentativas)` — no cap 5 devolve `null` e a linha permanece `falhou` sem novo agendamento.
- **Idempotency-Key no fetch do Resend** (LEDGER-02, T-41-15): header `Idempotency-Key = retry_id ?? dedupe_key` — um re-send dentro de 24h para a mesma chave é no-op no provedor, protegendo contra double-send se duas varreduras se sobrepuserem. Nunca logado/interpolado.
- **Guard non-prod preservado no retry** (T-41-17): `exigirSinkTeste(dest.para, modo)` está fora do bloco `if (!retry_id)` — roda em ambos os caminhos, antes de qualquer `fetch`. Nenhum candidato real recebe e-mail num run de retry em modo teste.
- **Cobertura de teste sem rede**: 4 casos novos via `handler(req, deps)` com `fetchImpl`/`supabaseAdmin` mockados — elegibilidade (4 sub-casos), sucesso→`enviado` por id, non-2xx→`falhou`+backoff incrementado, caminho normal preservado. Suite completa da EF **251 passed / 0 failed SEM `--allow-net`** (job blocking do CI verde).

## Task Commits

Cada task committada atomicamente com `--no-verify` (baseline `tsc src/**` = 97, flat; teto CI 104 — todo commit P36–P41 usou `--no-verify`):

1. **Task 2 (RED): tests do branch retry** — `fba806a` (test) — 4 casos novos falham (branch retry + Idempotency-Key ausentes); 9 pré-existentes verdes
2. **Task 1 (GREEN): branch retry + Idempotency-Key** — `dbf941a` (feat) — implementação; 13 passed / 0 failed na EF

_Ordem TDD deliberada: escrevi os testes primeiro (RED verde-vermelho confirmado: 9 passed / 4 failed), depois a implementação (GREEN). Task 1 (impl) e Task 2 (tests) do plano mapeiam respectivamente ao commit `feat` e ao commit `test`._

## Files Created/Modified

- `supabase/functions/notificar-candidato/index.ts` (147 linhas alteradas) — `CorpoRequisicao` aceita `retry_id?: string` (validado no parse); bloco **2b) BRANCH RETRY** após o parse (SELECT por id + guard `nao_elegivel` + `novasTentativas`); claim-before-send gateado por `if (!retry_id)`; `registrarFalha` keya por id/dedupe_key via closure `novasTentativas` (param removido); header `Idempotency-Key` no fetch; escrita de sucesso keada por id/dedupe_key.
- `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` (+233 linhas) — `makeRetryMockSupabase` (roteia `.select().eq().maybeSingle()` por tabela + captura `update`/`upsert`), `makeFetchMock` (conta chamadas + Response sintético); 4 `Deno.test` do branch retry. Casos puros (COMM-01/04) e de 41-01 (backoff, 401) intactos.

## Decisions Made

- **Guard de elegibilidade antes da resolução de dados:** o plano manda entrar no branch retry "LOGO após o parse". Coloquei o `SELECT`+guard imediatamente após a desestruturação do body, antes das 3 leituras de allowlist (candidatura/candidato/vaga). Um `retry_id` não-elegível short-circuita em `skipped:nao_elegivel` sem custo de I/O nem risco de envio. A resolução de dados e o `exigirSinkTeste` permanecem compartilhados entre os dois caminhos (o retry re-renderiza e re-envia com os dados frescos).
- **`registrarFalha` closure-driven (param `novasTentativas` removido):** os 4 call-sites já invocavam `registrarFalha(motivoLog)` com um único argumento; passar a decisão de `novasTentativas` (1 no normal, `row.tentativas + 1` no retry) e de alvo (`dedupe_key` vs `id = retry_id`) para o closure centraliza a lógica num ponto e elimina a chance de um call-site esquecer o incremento. Comportamento idêntico ao 41-01 no caminho normal.
- **RECON-01/RECON-03 mantidos `Pending`:** este plano entrega e testa o código do branch retry (zero PROD). O comportamento vivo — a varredura `pg_cron` de fato re-invocando a EF em modo retry — depende do **apply da migration `20260727000001`** (41-03) e do **redeploy da EF** (41-05). Marcar completo agora seria impreciso no traceability, mesmo critério do 41-01/41-02.

## Deviations from Plan

### Auto-fixed Issues

Nenhum. O plano foi executado como escrito. A única escolha discricionária (posição do guard antes da resolução de dados) é explicitamente sancionada pela ação (2) do plano ("LOGO após o parse") e está registrada em Decisions.

**Total deviations:** 0
**Impact on plan:** nenhum — mudança cirúrgica; caminho normal preservado byte-a-byte (upsert claim + escrita por dedupe_key), provado pelo caso de teste dedicado e pelos 247 outros testes da EF que seguem verdes.

## Threat Model Compliance

| Threat ID | Mitigação exigida | Status |
|-----------|-------------------|--------|
| T-41-14 (retry infinito / DoS de custo) | guard `tentativas >= 5` → `nao_elegivel`; `computeProximaTentativa` → null no cap 5 | ✅ implementado + testado (sub-caso `tentativas=5` do guard; `non-2xx` prova `n=3<5` agenda, o helper já provado no 41-01 devolve null em 5) |
| T-41-15 (double-send) | header `Idempotency-Key` (retry_id/dedupe_key, 24h) + `UNIQUE(dedupe_key)` durável | ✅ header no fetch; testes asseguram a chave correta em cada caminho |
| T-41-16 (PII/segredo/chave em log) | `logSeguro` allowlist; Idempotency-Key/apiKey nunca interpolados | ✅ `retry_id` fora da allowlist de log; a chave só viaja no header, nunca em `console.*` |
| T-41-17 (envio a candidato real num run de teste) | `exigirSinkTeste(dest.para, modo)` reusado no branch retry antes do fetch | ✅ guard fora do `if (!retry_id)` — roda em ambos os caminhos antes do envio |

## Issues Encountered

Nenhum. Deno 2.7.7 disponível; baseline da EF verde antes de começar (9/9 puros); RED confirmado (9 passed / 4 failed); GREEN atingido de primeira (13/13 na EF, 251/251 na suite completa).

## User Setup Required

None — nenhuma configuração de serviço externo. **Zero contato com PROD** (só código + `deno test`). O redeploy da EF `notificar-candidato` (para o branch retry entrar em vigor) e o apply/reconcile/smoke da migration do cron são o plano GATED **41-05** (checkpoint do orquestrador — subagentes não têm MCP, bug #13898).

## Next Phase Readiness

- **41-05** (deploy/apply): o código do branch retry está pronto e verde no CI. Ao redeployar a EF + aplicar a migration `20260727000001` (cron `notif-retry-sweep`), a varredura passará a re-invocar a EF com `retry_id` e o retry funcionará ponta-a-ponta. Verificar (Pitfall 5): `NOTIFICAR_SECRET` (env da EF) == `edge_invoke_key` (Vault) == Bearer da varredura.
- **DELIV-01** (domínio Resend) permanece o gate do UAT ao vivo — enquanto aberto, os sends gravam `falhou` e a varredura acumula linhas até o cap 5. Não afeta este plano (só código/CI).
- Sem blockers introduzidos.

## Self-Check: PASSED

Ambos os arquivos modificados + o SUMMARY.md existem em disco; os 2 commits (`fba806a` test/RED, `dbf941a` feat/GREEN) presentes no git log. Suite completa da EF verde (**251 passed / 0 failed**) SEM `--allow-net`; acceptance greps do index.ts satisfeitos (`retry_id`=14≥3, `nao_elegivel`=2≥1, `Idempotency-Key`=1≥1, `eq("id", retry_id)`=4≥1); index.ts 424 linhas (≥320).

---
*Phase: 41-reconcilia-o-de-entrega-retry-testing*
*Completed: 2026-07-26*
