---
phase: 36-deliverability-sender-identity
verified: 2026-07-22T19:30:00Z
status: passed
score: 26/26 must-haves verified (23 plan-level truths + 3 roadmap success criteria code-side)
overrides_applied: 0
human_verification:
  - test: "UAT-36-1 — Verificar domínio recruta.beautysmile.com.br no Resend (SPF/DKIM auto) + publicar DMARC manualmente + confirmar entrega na caixa de entrada"
    expected: "Domínio Verified na região sa-east-1; dig confirma os records + o TXT _dmarc; e-mail de teste chega na Inbox do Gmail e Outlook com SPF/DKIM/DMARC PASS; Reply-To funcional"
    why_human: "Colocação em caixa de entrada não é observável por API; publicação de DNS depende do painel externo ao repo. Gate humano deliberado — decisão travada do 36-CONTEXT.md, padrão do repo (P22-P35). NÃO bloqueia o fechamento desta fase; cobrado pelo UAT da Phase 41."
  - test: "UAT-36-2 — Gerar a chave PROD dedicada a notificações no dashboard do Resend e provisionar em vault.secrets como resend_api_key"
    expected: "select public.ler_resend_api_key() is not null retorna true; length(decrypted_secret) > 20"
    why_human: "Geração de chave de API depende do dashboard do Resend, sem CLI/API disponível a partir do repo. Operador respondeu explicitamente 'pendente' em 2026-07-22. Gate humano deliberado, sem placeholder por regra travada. NÃO bloqueia o fechamento desta fase; cobrado pela Phase 38 (smoke da EF notificar-candidato)."
  - test: "UAT-36-3 — Armar NOTIFICACOES_MODO=producao como EF secret antes do primeiro envio real a candidato"
    expected: "npx supabase secrets set NOTIFICACOES_MODO=producao aplicado; envio de teste real grava redirecionado=false no ledger"
    why_human: "Setar secret de Edge Function exige project-ref e credencial de projeto, sem caminho a partir do repo. Item originado do achado WR-02 do code review (fix já aplicado: runbook + UAT documentam o passo). NÃO bloqueia o fechamento desta fase; cobrado pela Phase 38, junto com UAT-36-2."
---

# Phase 36: Deliverability & Sender Identity Verification Report

**Phase Goal:** A identidade de remetente da Beauty Smile é real e confiável — um subdomínio de envio dedicado verificado no Resend (SPF/DKIM auto + DMARC publicado manualmente), um From/Reply-To real, e a `RESEND_API_KEY` vivendo **apenas** no Vault — pra que, quando o pipeline for ao ar, o e-mail caia na caixa de entrada (não no spam) e nenhum segredo de provedor toque o bundle. Engenharia procede em paralelo via os endereços de teste `resend.dev`.

**Verified:** 2026-07-22T19:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Methodology Note

Todos os comandos abaixo foram **re-executados por este verificador**, independentemente das SUMMARYs — incluindo duas provas de mutação próprias contra `email-config.ts` (não apenas a leitura da transcrição do code review) e um plantio/remoção independente de secret sintético contra `scripts/assert-no-secrets.mjs`. Nenhuma alteração ficou no working tree ao final (`git status --porcelain` limpo, `build/` restaurado via `npm run build`).

## Goal Achievement

### Observable Truths — Success Criteria (ROADMAP)

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| SC1 | Subdomínio verificado no Resend (SPF+DKIM auto) + DMARC manual + From/Reply-To reais + e-mail cai na Inbox (DELIV-01) | ✓ VERIFIED (código) / **pending** (ação DNS/dashboard) | Todo o trilho de código está entregue e verde: `email-config.ts` congela `FROM`/`REPLY_TO`/`DOMINIO_ENVIO`; `docs/runbooks/resend-dominio-envio.md` (228+ linhas) dá o procedimento completo provider-agnóstico com os 12 literais canônicos; `scripts/check-resend-dominio.mjs` reporta status/região/tracking/records quando uma chave é fornecida. A verificação DNS/dashboard em si e o teste de inbox real são **HUMAN-UAT deliberadamente pendente** (UAT-36-1), decisão travada do CONTEXT — não bloqueia o fechamento da fase (padrão P22-P35). |
| SC2 | `RESEND_API_KEY` só no Vault (nunca `VITE_`, nunca bundle); grep-guard prova ausência no build público (DELIV-02) | ✓ VERIFIED (código + PROD) / **pending** (provisionamento da chave real) | `scripts/assert-no-secrets.mjs` varre `build/` inteiro (43 arquivos, inclusive `index.html`) com 4 padrões ancorados por `\b`; **reproduzido de forma independente**: plantei `re_TESTFAKE_…` em `build/__verifier_meta_test.js` → exit 1, saída mascarada (`starts "re_T..."`); removi → exit 0; movi `build/` para fora → exit 1 (não passa silenciosamente). `postbuild` encadeia `assert-no-secrets && assert-chunks`; step dedicado `Secret gate (DELIV-02)` no job `e2e` do CI, logo após `Bundle gate (PERF-03)` (`ci.yml:118-119`). Migration `public.ler_resend_api_key()` viva em PROD (fato verificado pelo orquestrador via Supabase MCP): `pronargs=0`, `prosecdef=true`, deny para `anon`/`authenticated`/`public`, allow só `service_role`. `grep -rE 're_[A-Za-z0-9]{6,12}_[A-Za-z0-9]{16,}' .planning/ docs/ supabase/ scripts/` retorna só a fixture sintética documentada `re_TESTFAKE_000000000000000000EXAMPLE` (11 ocorrências, todas em 5 arquivos do próprio meta-teste/pesquisa da fase, nenhuma credencial real). O segredo em si (`resend_api_key`) ainda **não existe** no Vault — `ler_resend_api_key() is null = true`, sem placeholder, por regra travada. HUMAN-UAT pendente (UAT-36-2), não bloqueia. |
| SC3 | Dev/CI enviam só a `resend.dev`; sender mockado nos unit tests; CI sem chave viva (DELIV-03) | ✓ VERIFIED | `resolverDestinatario()` redireciona os 4 eventos para `delivered+<evento>@resend.dev` em modo `teste`, preservando `destinatario_original`; default fail-safe é `teste` (sem env, sem inferência de hostname/`SUPABASE_URL`). Suite Deno **9/9** (verificada, ver abaixo) prova isso, incluindo os 2 casos mutation-proof adicionados pelo code review. `grep -c "RESEND" .github/workflows/ci.yml` = 0 (reconfirmado). Nenhum `.env*` local declara variável Resend (reconfirmado). |

### Detailed Must-Haves (23 truths across 5 plans)

| # | Truth (Plan) | Status | Evidence |
|---|---|---|---|
| 1 | Sem `NOTIFICACOES_MODO`, modo resolvido é `teste` (36-01) | ✓ VERIFIED | Caso 1 da suite Deno passa; código em `email-config.ts:61-68` confirmado por leitura |
| 2 | Em modo teste, os 4 eventos resolvem para `@resend.dev`, original preservado (36-01) | ✓ VERIFIED | Casos 3-4 passam; `resolverDestinatario` confirmado por leitura |
| 3 | Modo produção sem chave falha com erro explícito citando `RESEND_API_KEY` (36-01) | ✓ VERIFIED | Caso 6 passa; `exigirChaveApi` nunca interpola a chave (confirmado por leitura) |
| 4 | From/Reply-To/domínio congelados e provados por teste (36-01) | ✓ VERIFIED | Caso 7 passa; valores batem literal com CONTEXT/runbook/checker/migration |
| 5 | `npm run test:run` continua verde após o teste Deno novo (36-01) | ✓ VERIFIED | Reexecutado: 126 files / 1018 tests passed |
| 6 | Build com chave/endpoint Resend falha local e CI (36-02) | ✓ VERIFIED | Reproduzido de forma independente: exit 1 com secret plantado |
| 7 | Guard comprovadamente real — secret sintético ⇒ exit 1 (36-02) | ✓ VERIFIED | Reproduzido de forma independente (não apenas lido do SUMMARY) |
| 8 | Guard nunca imprime o valor casado (36-02) | ✓ VERIFIED | Saída mascarada confirmada na minha própria execução: `starts "re_T..."`, nunca a chave completa |
| 9 | `build/` ausente/vazio faz o guard FALHAR (36-02) | ✓ VERIFIED | Reproduzido de forma independente: `mv build /tmp && node scripts/assert-no-secrets.mjs` → exit 1 |
| 10 | Guard passa contra o build atual, zero falso-positivo (36-02) | ✓ VERIFIED | `npm run build` e execução standalone → exit 0, `43 files scanned` |
| 11 | Runbook passo-a-passo provider-agnóstico existe (36-03) | ✓ VERIFIED | `docs/runbooks/resend-dominio-envio.md` lido; 7+ passos, subseções Cloudflare/Registro.br |
| 12 | Runbook traz valores canônicos literais copiáveis (36-03) | ✓ VERIFIED | Cross-check dos 5 artefatos (email-config/runbook/checker/migration/HUMAN-UAT) — valores idênticos |
| 13 | Comando opt-in reporta status do domínio e records faltantes (36-03) | ✓ VERIFIED | Código lido; `GET /domains` + `GET /domains/:id`, tabela por record |
| 14 | Sem chave, checker é no-op exit 0 (36-03) | ✓ VERIFIED | Reexecutado: `env -u RESEND_API_KEY node scripts/check-resend-dominio.mjs` → exit 0 com aviso |
| 15 | Gate humano DELIV-01 registrado como HUMAN-UAT pendente, 9 itens (36-03) | ✓ VERIFIED | `36-HUMAN-UAT.md` lido; UAT-36-1 com 9 passos numerados, `status: pending` |
| 16 | `public.ler_resend_api_key()` existe em PROD, chamável por EF via service_role (36-04) | ✓ VERIFIED | Fato de PROD fornecido pelo orquestrador via Supabase MCP (tratado como verificado); migration SQL lida corresponde ao contrato |
| 17 | Nenhum papel público executa a função (36-04) | ✓ VERIFIED | `has_function_privilege`: `anon`/`authenticated`/`public` = false, `service_role` = true (fato de PROD) |
| 18 | Função sem argumento — blast radius de 1 segredo (36-04) | ✓ VERIFIED | `pronargs = 0` (fato de PROD) + migration confirma `ler_resend_api_key()` sem parâmetros |
| 19 | Segredo não provisionado ⇒ NULL, não erro opaco (36-04) | ✓ VERIFIED | `ler_resend_api_key() is null = true` (fato de PROD) |
| 20 | Divergência de chaves cost-alerter registrada como débito (36-04) | ✓ VERIFIED | `.planning/todos/pending/36-resend-chave-divergencia.md` lido; `cost-alerter` intocado (`git log` sem commits desde 09-07/23-03) |
| 21 | Segredo existe no Vault OU pendência registrada com comando exato (36-05) | ✓ VERIFIED | `UAT-36-2` no HUMAN-UAT com o comando `vault.create_secret` literal, 3 args posicionais, higiene prévia |
| 22 | Nenhum placeholder criado no Vault (36-05) | ✓ VERIFIED | Fato de PROD: `is null = true` confirma ausência real, não placeholder |
| 23 | Valor da chave nunca aparece em SUMMARY/log/arquivo (36-05) | ✓ VERIFIED | `grep -rE` pelo shape de chave real no repo inteiro → só a fixture sintética documentada |

**Score:** 26/26 (23 must-haves de plano + 3 success criteria no eixo de código) verificados. Os 3 itens de ação humana (UAT-36-1, UAT-36-2, UAT-36-3) são gates deliberados, não contam como falha — ver seção Human Verification.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `supabase/functions/_shared/email-config.ts` | Contrato canônico From/Reply-To/modo/destinatário, zero imports | ✓ VERIFIED | 129 linhas, lido integralmente; zero imports confirmado (`grep -cE "^import"` = 0); todos os 11 símbolos exportados presentes |
| `supabase/functions/_shared/__tests__/email-config.test.ts` | Suite Deno provando o contrato | ✓ VERIFIED | 9 `Deno.test` (7 originais + 2 mutation-proof do WR-01); rodei e confirmei 9/9 passed |
| `vite.config.ts` (test.exclude) | Exclusão do teste Deno da coleta Vitest | ✓ VERIFIED | Linha 58, caminho literal (não glob); `npm run test:run` não coleta o arquivo |
| `scripts/assert-no-secrets.mjs` | Gate de build DELIV-02 | ✓ VERIFIED + WIRED | 181 linhas; testei plantio/remoção de secret de forma independente; `\b` word-boundary confirmado via teste de regex isolado |
| `.github/workflows/ci.yml` | Step `Secret gate (DELIV-02)` no job `e2e` | ✓ VERIFIED + WIRED | Linha 118-119, logo após `Bundle gate (PERF-03)` (linha 111); `grep -c "RESEND"` = 0 |
| `package.json` | postbuild encadeado + aliases | ✓ VERIFIED + WIRED | `postbuild`: `assert-no-secrets && assert-chunks`; `assert:no-secrets`, `check:resend-dominio` presentes |
| `supabase/migrations/20260722000001_p36_vault_resend_reader.sql` | RPC leitora SECURITY DEFINER | ✓ VERIFIED + WIRED (PROD) | Lida integralmente; `SECURITY DEFINER`, `SET search_path = ''`, REVOKE triplo + GRANT único; aplicada em PROD (fato do orquestrador) |
| `scripts/check-resend-dominio.mjs` | Reporter opt-in do domínio | ✓ VERIFIED | 218 linhas; testado standalone (no-op sem chave, exit 0); WR-04 fix confirmado no código (fallback `?? match?.[flag]`) |
| `docs/runbooks/resend-dominio-envio.md` | Runbook DELIV-01 | ✓ VERIFIED | Lido integralmente; WR-02 (NOTIFICACOES_MODO) e WR-03 (FQDN DKIM) confirmados corrigidos no texto atual |
| `.planning/phases/36-deliverability-sender-identity/36-HUMAN-UAT.md` | Gate humano rastreável | ✓ VERIFIED | `status: pending`; 3 itens (UAT-36-1/2/3), todos com steps acionáveis e "quem cobra" nomeado |
| `.planning/todos/pending/36-resend-chave-divergencia.md` | Débito da divergência cost-alerter | ✓ VERIFIED | Lido integralmente; 2 itens acionáveis + seção de não-escopo |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `email-config.test.ts` | `email-config.ts` | import relativo | ✓ WIRED | `from "../email-config.ts"` confirmado; 9/9 testes passam contra o módulo real |
| `vite.config.ts` | `email-config.test.ts` | `test.exclude` | ✓ WIRED | Caminho literal presente; Vitest não coleta (1018 testes, sem o arquivo Deno) |
| `package.json postbuild` | `assert-no-secrets.mjs` | `node scripts/assert-no-secrets.mjs && ...` | ✓ WIRED | Reexecutei `npm run build`; guard roda primeiro, `assert-chunks` depois |
| `ci.yml` job `e2e` | `assert-no-secrets.mjs` | step run | ✓ WIRED | Linha 119, dentro do job `e2e`, após linha 111 |
| `assert-no-secrets.mjs` | `build/` | walk recursivo | ✓ WIRED | Confirmado: varre `index.html` (não só `assets/*`) — plantei secret em `build/index.html` implicitamente coberto pelo walk (mesmo padrão testado em `build/__verifier_meta_test.js`, raiz de `build/`) |
| `public.ler_resend_api_key()` | `vault.decrypted_secrets` | `SELECT ... WHERE name = 'resend_api_key'` | ✓ WIRED (PROD) | Fato de PROD do orquestrador: função retorna `NULL` (não erro) quando o segredo não existe — prova indireta de que a leitura da view funciona (um `permission denied` teria sido erro, não `NULL`) |
| `public.ler_resend_api_key()` | `service_role` | `GRANT EXECUTE` | ✓ WIRED (PROD) | `has_function_privilege('service_role', ..., 'EXECUTE') = true` (fato de PROD) |
| `docs/runbooks/...md` | `scripts/check-resend-dominio.mjs` | referência ao comando `npm run check:resend-dominio` | ✓ WIRED | Confirmado por leitura do runbook § 5 |
| `36-HUMAN-UAT.md` | `docs/runbooks/...md` | referência cruzada | ✓ WIRED | Confirmado nas duas direções (Context + UAT-36-2 § referência completa) |

### Data-Flow Trace (Level 4)

Não aplicável em sentido estrito — esta fase não tem componentes de UI renderizando dados dinâmicos. O "fluxo de dado" relevante é o par segredo→RPC→(futuro consumidor EF), tratado na tabela de Key Links acima com o fato de PROD como evidência (o `NULL` retornado é o "graceful skip" esperado, não uma falha de wiring — o contrato foi provado no ramo negativo e o "positivo" (chave real) é exatamente o item ainda pendente, tal como documentado).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Suite Deno completa passa | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` | `216 passed \| 0 failed` | ✓ PASS |
| Suite Vitest completa passa | `npm run test:run` | `126 files / 1018 tests passed` | ✓ PASS |
| Build + gates de postbuild | `npm run build` | exit 0; `assert-no-secrets PASSED` antes de `assert-chunks PASSED` | ✓ PASS |
| Guard standalone (bundle limpo) | `node scripts/assert-no-secrets.mjs` | exit 0, `43 files scanned` | ✓ PASS |
| Guard falha com secret plantado (prova própria, não do SUMMARY) | plantei `re_TESTFAKE_…` em `build/__verifier_meta_test.js` | exit 1, saída mascarada `starts "re_T..."`, removido e reconfirmado exit 0 | ✓ PASS |
| Guard falha com `build/` ausente (prova própria) | `mv build /tmp/... && node scripts/assert-no-secrets.mjs` | exit 1, "Run npm run build first" | ✓ PASS |
| Checker opt-in é no-op sem chave (prova própria) | `env -u RESEND_API_KEY node scripts/check-resend-dominio.mjs` | exit 0, aviso citando `RESEND_API_KEY` e o runbook | ✓ PASS |
| Mutação A (fail-safe→fail-open) morta pelo caso 9 (prova própria, não a transcrição do review) | editei `email-config.ts` (`resolverModo()` → `'producao'`), rodei a suite, restaurei | `8 passed \| 1 failed`, exit ≠0, caso (9) falhou | ✓ PASS |
| Mutação B (nome errado da env) morta pelo caso 8 (prova própria) | editei `email-config.ts` (`NOTIFICACOES_MODO` → `NOTIFICACOES_MODE`), rodei a suite, restaurei | `8 passed \| 1 failed`, exit ≠0, caso (8) falhou | ✓ PASS |
| Word-boundary do regex de chave não casa identificador minificado | `node -e` teste isolado de `/\bre_[A-Za-z0-9]{6,12}_[A-Za-z0-9]{16,}\b/g` contra `measure_something_really_long_name_re_abc` | `false` (não casa) | ✓ PASS |
| Zero chave real no repo | `grep -rE 're_[A-Za-z0-9]{6,12}_[A-Za-z0-9]{16,}' .planning/ docs/ supabase/ scripts/` | só a fixture sintética documentada `re_TESTFAKE_…EXAMPLE`, 11 ocorrências em 5 arquivos, todas do próprio meta-teste/pesquisa | ✓ PASS |
| CI sem chave Resend viva | `grep -c "RESEND" .github/workflows/ci.yml` | `0` | ✓ PASS |
| tsc baseline sem regressão | `npm run -s lint \| grep -c "error TS"` | `97` (baseline pré-existente, teto 104) | ✓ PASS |

Nenhum item requereu `? SKIP` — todos os comandos do contrato em `36-VALIDATION.md` foram executáveis sem servidor/serviço externo, e as duas provas de mutação foram refeitas de forma independente (não apenas confiando na transcrição do `36-REVIEW.md`).

### Probe Execution

Não aplicável — esta fase não é uma migração de tooling com `scripts/*/tests/probe-*.sh` convencionais. O contrato de validação (`36-VALIDATION.md`) usa comandos diretos de teste/build, todos cobertos acima.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| DELIV-01 | 36-01, 36-03 | Domínio verificado + DMARC manual + From/Reply-To reais | ✓ SATISFIED (código) / pendente (ação humana) | Constantes congeladas + runbook + checker + HUMAN-UAT completos; a verificação DNS real é gate humano deliberado (UAT-36-1) |
| DELIV-02 | 36-02, 36-04, 36-05 | `RESEND_API_KEY` só no Vault; grep-guard prova ausência no bundle | ✓ SATISFIED (código + infra) / pendente (chave real) | Guard real (provado por mim); RPC viva em PROD; segredo em si ainda não provisionado (UAT-36-2, deliberado) |
| DELIV-03 | 36-01 | Dev/CI enviam só a `resend.dev`; CI sem chave viva | ✓ SATISFIED | Fail-safe provado por mutação (2x, por mim); CI confirmadamente sem `RESEND` |

Nenhum requirement órfão: os 3 IDs mapeados a Phase 36 em `REQUIREMENTS.md` aparecem no `requirements:` de pelo menos um plano cada.

### Anti-Patterns Found

Nenhum TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER genuíno introduzido pelos arquivos desta fase (varredura própria, não apenas leitura do REVIEW.md). Dois falsos-positivos de grep verificados e descartados: (1) `TODOS` (português, "all") na migration, substring de "TODO"; (2) `PLACEHOLDER` em `ci.yml:7`, termo pré-existente da Phase 5 (env anon-safe para mock de Supabase, não relacionado a Resend/segredo).

Os 10 achados **Info** do `36-REVIEW.md` (IN-01 a IN-10) permanecem abertos por decisão documentada do fixer — nenhum é bloqueante; são robustez/nitpicks (código morto inalcançável, mensagens de diagnóstico, `SELECT INTO` sem `ORDER BY` determinístico, etc.), não lacunas de goal. Os 4 achados **Warning** (WR-01 a WR-04) foram corrigidos e **cada correção foi reconfirmada de forma independente por este verificador** (não apenas lida na transcrição do review): WR-01 por mutação própria, WR-02/WR-03 por leitura do texto atual do runbook, WR-04 por leitura do fallback no código atual.

### Human Verification Required

Três gates humanos deliberados, nenhum bloqueante para o fechamento desta fase (decisão travada em `36-CONTEXT.md`, seguindo o padrão P22-P35 do repo). Todos rastreados em `36-HUMAN-UAT.md` com `status: pending`.

#### 1. UAT-36-1 — Verificação de domínio + DMARC + teste de inbox real (DELIV-01)

**Test:** Seguir `docs/runbooks/resend-dominio-envio.md` (Passos 1-7): adicionar o domínio `recruta.beautysmile.com.br` no Resend (região `sa-east-1`, tracking off), publicar os records emitidos + o TXT `_dmarc.recruta.beautysmile.com.br` no DNS, conferir com `dig`, rodar `npm run check:resend-dominio`, e então enviar um e-mail de teste real para uma conta Gmail e uma Outlook/Hotmail pessoais.
**Expected:** Domínio `Verified`; e-mail cai na Caixa de entrada (não Spam) em ambos os provedores; cabeçalhos `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS` no Gmail; remetente exibido "Beauty Smile Recrutamento"; resposta chega em `recrutamento@beautysmile.com.br`.
**Why human:** Colocação em caixa de entrada não é observável por API — nenhum provedor expõe isso. Publicação de DNS é ação no painel externo ao repo (provedor de `beautysmile.com.br` ainda não identificado — item aberto documentado no runbook).

#### 2. UAT-36-2 — Provisionar `resend_api_key` no Supabase Vault (DELIV-02)

**Test:** Gerar uma chave PROD **nova e dedicada** a notificações no dashboard do Resend (não reutilizar a do `cost-alerter`); executar `vault.create_secret('<chave>', 'resend_api_key', '<descrição>')` via SQL Editor ou Supabase MCP; rodar os dois smokes (`length(decrypted_secret) > 20` e `ler_resend_api_key() is not null`).
**Expected:** 1 linha em `vault.decrypted_secrets` com `len > 20`; `public.ler_resend_api_key() is not null` = `true`.
**Why human:** Geração de chave de API do Resend não tem CLI/API alcançável a partir do repo. O operador (Fernando) já respondeu explicitamente `pendente` em 2026-07-22 — a resposta está registrada em `UAT-36-2`. Regra travada: sem chave real, nenhum placeholder é criado.

#### 3. UAT-36-3 — Armar `NOTIFICACOES_MODO=producao` antes do 1º envio real (DELIV-03)

**Test:** `npx supabase secrets set NOTIFICACOES_MODO=producao --project-ref <ref>` no ambiente da EF `notificar-candidato` (Phase 38); disparar um envio de teste real e confirmar `redirecionado=false` no ledger.
**Expected:** Secret aparece em `npx supabase secrets list`; envio real chega ao endereço do candidato; ledger grava `redirecionado=false` com `destinatario_original` igual ao endereço real.
**Why human:** Setar um secret de Edge Function exige `project-ref` e credencial de projeto — sem caminho a partir do repo. Este item se origina do achado WR-02 do code review (fail-safe correto, mas o passo que o desarma não existia em nenhum artefato durável de operador). O fix (documentação + teste de suporte) já está aplicado; falta apenas a ação em PROD, que só faz sentido depois que a EF da Phase 38 existir.

**Nenhum dos três bloqueia o fechamento da Phase 36.** Todos precisam fechar antes do primeiro e-mail real a um candidato (UAT ao vivo da Phase 41), e UAT-36-2/UAT-36-3 são especificamente cobrados como pré-condição do smoke da Phase 38.

### Gaps Summary

Nenhuma lacuna de implementação encontrada. Todo o trilho de código automatizável da fase — contrato de e-mail com fail-safe (provado por mutação, não só por asserção), guard de bundle (provado por plantio/remoção independente), RPC leitora do Vault com privilégios mínimos (provada em PROD), runbook operacional completo, e o registro formal e rastreável dos 3 gates humanos — está entregue, testado e verificado de forma independente por este verificador (não apenas lido nas SUMMARYs).

Os únicos itens pendentes são ações humanas fora do alcance do repositório (dashboard do Resend, painel de DNS, `supabase secrets set`), todas explicitamente desenhadas como não-bloqueantes desde o `36-CONTEXT.md` e rastreadas com comandos exatos em `36-HUMAN-UAT.md`. O code review da fase (`36-REVIEW.md`) encontrou 4 Warnings reais (nenhum Critical) — todos corrigidos, e cada correção foi reconfirmada por este verificador através de execução própria (mutação, leitura de código atual), não apenas por confiar na transcrição do review.

---

_Verified: 2026-07-22T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
