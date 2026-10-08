---
phase: 50-acesso-do-recrutador
verified: 2026-10-07T22:00:00Z
status: passed
score: 8/8 must-haves verified
covered_files:
  - ".planning/phases/50-acesso-do-recrutador/50-01-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-01-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-02-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-02-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-03-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-03-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-04-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-04-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-05-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-05-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-06-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-06-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-07-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-07-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-08-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-08-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-09-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-09-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-10-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-10-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-11-PLAN.md"
  - ".planning/phases/50-acesso-do-recrutador/50-11-SUMMARY.md"
  - ".planning/phases/50-acesso-do-recrutador/50-REVIEW-DELTA-797c6110.md"
  - "scripts/p50_desfazer.cjs"
  - "scripts/p50_ensaio.cjs"
  - "scripts/p50_enumera.cjs"
  - "scripts/p50_mutacoes.cjs"
  - "scripts/p50_sessao_real.cjs"
  - "scripts/p50_varredura.cjs"
  - "scripts/p50_vitest_delta.cjs"
  - "src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts"
  - "src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts"
  - "src/features/triagem/services/triagemService.ts"
  - "src/features/vagas/services/cvUploadService.ts"
  - "src/features/vagas/services/vagasService.ts"
  - "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts"
  - "supabase/functions/avaliar-transcricao-entrevista/index.ts"
  - "supabase/functions/comparativo-candidatos/__tests__/index.test.ts"
  - "supabase/functions/comparativo-candidatos/index.ts"
  - "supabase/functions/consolidar-decisao-final/__tests__/index.test.ts"
  - "supabase/functions/consolidar-decisao-final/index.ts"
  - "supabase/functions/gerar-guia-entrevista/__tests__/index.test.ts"
  - "supabase/functions/gerar-guia-entrevista/index.ts"
  - "supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts"
  - "supabase/functions/gerenciar-usuario-rh/index.ts"
  - "supabase/functions/get-curriculo-url/index.test.ts"
  - "supabase/functions/get-curriculo-url/index.ts"
  - "supabase/migrations/20261005000001_p50_helper_candidaturas.sql"
  - "supabase/migrations/20261005000002_p50_policies_rh_ativo.sql"
  - "supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql"
  - "supabase/migrations/20261005000004_p50_rpcs_escrita.sql"
  - "supabase/tests/funil34_kpis_smokes.sql"
  - "supabase/tests/oper31_rejeitar_candidatura_smokes.sql"
  - "supabase/tests/p37_fidelidade_schema_smoke.sql"
  - "supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql"
  - "supabase/tests/p44_pedidos_dados_smoke.sql"
  - "supabase/tests/p46_fixture_elegivel.sql"
  - "supabase/tests/p47_historico_smoke.sql"
  - "supabase/tests/p49_44_resposta_caso_aberto_smoke.sql"
  - "supabase/tests/p50_acesso_recrutador_smoke.sql"
  - "supabase/tests/p50_desfazer_expansao.sql"
  - "supabase/tests/p50_desfazer_tracer.sql"
  - "supabase/tests/p50_vistas_externas.sql"
  - "supabase/tests/sec05_08_smokes.sql"
  - "supabase/tests/seg32_smokes.sql"
  - "supabase/tests/seg33_agendamento_smokes.sql"
covered_digest: "v3:sha256:988169ec3ef631a979bfcda0c29c6c6bb8d2ec054d0ae38e91278ab398b3f4c9"
behavior_unverified: 0
overrides_applied: 0
requirements_checked: [EXPORT-05]
export_05_decision: "G4-b (metade «visível ao RH») FECHADO pela Phase 50; EXPORT-05 está marcado completo no escopo desta fase (REQUIREMENTS.md já escriturado: linha 96 e rastreabilidade linha 379 «Phase 44 + Phase 50»). Não fecha as demais pendências da Phase 44."
re_verification:
  previous_status: passed
  previous_score: 8/8
  reason: "relatório anterior (2026-10-06T13:10Z) ficou stale: (1) o commit 797c6110 mexeu em 2 arquivos cobertos depois do fecho verificado 70614565; (2) o digest do gsd-tools mudou de v2 para v3."
  gaps_closed: []
  gaps_remaining: []
  regressions: []
advisory:
  - finding: "7 funções SECURITY DEFINER de RH conferem só o papel do JWT, sem is_active_rh_user() (anonimizar_candidato, atualizar_meu_perfil_rh, plano_exclusao_titular, publish_vaga, responder_revisao_decisao, salvar_janela_retencao, trg_redacao_rh_only_review_fields)"
    category: security
    reason: "Pré-existente e NÃO alargado pela fase (nenhuma lia vagas.created_by). Um recrutador desativado, com JWT ainda válido (até 1 h), passa nelas. A mais próxima do domínio da fase é responder_revisao_decisao. Fora do SC2 como escrito («não vê»), mas é a mesma janela que o D-02 fechou nas funções alargadas."
    evidence_status: "medido em PROD por catálogo (pg_proc), sem execução do caminho"
  - finding: "50-REVIEW-DELTA-797c6110 WR-01/WR-02: o teste de vazamento da senha temporária (gerenciar-usuario-rh) só cobre o caminho feliz do `criar` e a captura de console perde debug/trace/dir e objetos Error; mutações Mg, Mh, Mi, Mj, Ml sobrevivem (11/11 verde)"
    category: other
    reason: "Lacuna de portão, não de entrega: gerarSenhaTemporaria() está correta e as 5 mutações do WR-01 original (Ma, Mb, Mc, Md, Mk) agora reprovam. Fix descrito no review do delta (parametrizar por cenário; Deno.inspect em todos os métodos)."
    evidence_status: "mutações reproduzidas pelo revisor; Ma reproduzida também por este verificador (FAILED, 5 distinct chars)"
  - finding: "50-REVIEW-DELTA-797c6110 IN-01/IN-02/IN-03: asserção de símbolo é /[^A-Za-z0-9]/ (aceita conjunto fora do GoTrue); Math.random no lugar do CSPRNG não é detectado; IN-01 do 50-REVIEW só foi fechado pela metade (sem código TEMP_PASSWORD_POLICY para weak_password)"
    category: other
    reason: "Residuais de baixa severidade, nenhum afeta o goal da fase. A disposição do commit 797c6110 e do deploy v7 fica escriturada nesta verificação (seção Re-verificação 2026-10-07)."
    evidence_status: "lidos no review do delta; código conferido por este verificador"
---

# Phase 50: Acesso do Recrutador — Verification Report

**Phase Goal:** O recrutador que o operador cadastra trabalha de verdade: vê **todas** as vagas (ativas, inativas e arquivadas), as candidaturas delas e as filas que dependem disso (pedidos de revisão, pedidos de dados), em vez da tela vazia que o predicado `vagas.created_by = auth.uid()` produz.
**Verified:** 2026-10-07T22:00:00Z (re-verificação; verificação inicial em 2026-10-06T13:10:00Z)
**Status:** passed
**Re-verification:** Sim — após o delta `797c6110` e a troca de versão do digest (v2 → v3). Nenhum gap anterior (não havia) e nenhuma regressão.

> Postura: o SUMMARY não foi aceito como evidência. Cada verdade abaixo foi remedida em PROD agora (somente leitura / ensaio que aborta) e no repositório. Nenhum apply, deploy, escrita em PROD ou push foi feito por este verificador. Os únicos comandos que executam SQL com escrita foram `scripts/p50_ensaio.cjs`, que roda numa transação que termina em `RAISE EXCEPTION` e confere, antes e depois, que nada persistiu. (Tabela de verdades da verificação de 2026-10-06 preservada; a seção «Re-verificação 2026-10-07» no fim acrescenta o delta e a evidência desta rodada.)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence (medido por este verificador) |
|---|-------|--------|----------------------------------------|
| SC1 | Um recrutador **ativo** que não criou vaga vê as candidaturas de uma vaga ativa, uma inativa e uma arquivada — com **sessão real** | ✓ VERIFIED | PROD (2026-10-06): `usuarios_rh` tem o RH2 (`sub af4ebf97…`) com `role=recrutador, ativo=true, vagas_proprias=0`. As três vagas do script existem e têm exatamente as contagens que ele relatou: ativa `e897f709…` = **11**, inativa `629a5f31…` = **1**, arquivada `4601d000…` = **7** (candidaturas vivas, não-rascunho). `auth.audit_log_entries` confirma a sessão real do RH2: `user_recovery_requested` 09:21, `login` 09:22, `user_updated_password`, e 2º `login` 09:24 (-03) — compatível com a execução do script. `auth.sessions`: 2 linhas. Policy viva `rh_le_candidaturas`: ramo `rh` = `deleted_at IS NULL AND is_rascunho = false AND is_active_rh_user()`, **sem** `created_by`. `vagas` tem a policy «RH vê todas vagas» (usuario RH ativo, sem filtro de dono). O 14/14 da sessão real está em `50-11-SUMMARY.md` (saída literal do operador); a parte que dá para reconferir do lado do banco bate. **2026-10-07 (regressão):** policy `rh_le_candidaturas` ainda cita `is_active_rh_user`; `pg_policies` com `created_by` = 0; 1 recrutador ativo; helper presente. |
| SC2 | Recrutador **inativo** e candidato continuam sem ver nada; administrador não perde nada | ✓ VERIFIED | Ensaio vivo (`p50_ensaio.cjs`, 13/13, 2026-10-06): `velho` (recrutador desativado com token válido) → `contar_*` = 0, `listar_*` = 0 linhas; `candidato` → 42501 nas 4 filas e nas 18 RPCs (`i_cand`); `funil_kpis` do candidato = vazio; `i_ativo` mostra as 18 RPCs funcionando para o ativo. Cobertura de policies `183/183`. Ramo `administrador` presente e intacto no texto vivo de `rh_le_candidaturas`/`rh_avanca_etapa`. Anon medido por `SET LOCAL ROLE anon` em PROD: `candidaturas`, `decisao_final`, `historico_candidatura`, `notificacoes_enviadas`, `v_analises_presas` → **permission denied**; as demais 9 tabelas → **0 linhas**. Nenhuma das 14 policies com o helper tem papel `anon`/`public`. Prova real de desativação (D-11) foi **pulada pelo operador** — o plano e o CONTEXT D-11 autorizam impersonação. |
| SC3 | Varredura por forma não acha mais `created_by = auth.uid()` em policy/função de RH; o portão morde | ✓ VERIFIED | Varredura viva (2026-10-06): `pg_policies` (schemas `public` e `storage`) com `created_by` → **0** (reconfirmado 2026-10-07: **0**). Funções `public` que citam `created_by` → **4**, todas autoria e não autorização: `anonimizar_candidato` e `plano_exclusao_titular` (D-08, intocadas — não estão em nenhuma das 4 migrations), `criar_preferencias_padrao` (INSERT de `created_by`), `criar_usuario_rh_com_audit` (INSERT de `created_by`). Views com `created_by`: só `v_usuarios_rh_ativos` e `v_candidatos_ativos` (colunas de outras tabelas). Triggers e `cron.job`: 0. EFs: `grep created_by` em `supabase/functions` (fora de testes) → só `reciboExclusao.ts`/`exportAllowlist.ts` (listas de PII). Mordida: o smoke vivo reporta `formas=pol_rh:14,fn_rh:18`, `antiga=155/183 mordida=real`, `mordida_pg_temp=exata`; guarda Vitest `ef-sem-posse-de-vaga.grep.test.ts` 5/5 (reexecutado 2026-10-07: 5/5). O runner de 23 mutações (`p50_mutacoes.cjs`) **não foi reexecutado** aqui; a mordida do portão foi conferida pelo que o próprio smoke vivo prova (ver Gaps Summary, nota 4). |
| SC4 | As filas de pedidos de revisão e de pedidos de dados mostram ao recrutador os mesmos itens do administrador | ✓ VERIFIED | Corpos vivos: `listar_pedidos_dados`, `contar_revisoes_pendentes` (e, pelo ensaio, `contar_pedidos_dados_pendentes`/`listar_revisoes_decisao`) usam `v_role='administrador' OR (v_role='rh' AND is_active_rh_user())` — a mesma cláusula, sem filtro próprio do ramo rh. Ensaio vivo, impressões digitais por conteúdo: `admin.listar_pedidos_dados>n:5:10e13e072ecc` = `ativo.listar_pedidos_dados>n:5:10e13e072ecc`; `listar_revisoes_decisao` (false/true) idem (2:`2cd47009c1ce`, 3:`b8603d134007`); contadores 2 = 2; população semeada com 1 órfão. Sessão real do RH2: `pedidos_dados_todos` 3 = 3 e `revisoes_todas` 3 = 3, `revisoes_pendentes` 2 = 2. O único empate vácuo é `pedidos_dados_pendentes` 0 = 0 na sessão real (sem pedido pendente naquele minuto), e a igualdade não se apoia nele. |
| SC5 | Gates de dono por regra de negócio continuam (REVISAO-05, D-23) | ✓ VERIFIED | `responder_revisao_decisao` está **fora** das 4 migrations; o corpo vivo mantém `v_uid = v_row.por_usuario → 42501` e o guard de «decisor indeterminado». Ensaio vivo, cláusula (l): `sc5=decisor>e:42501,outro>ok` e `d23=comportamental>e:42501,outro>ok,literal=true`. `anonimizar_candidato`/`plano_exclusao_titular` não foram tocadas. |
| T6 | As 5 EFs não usam posse de vaga, mas mantêm integridade (D-09) e exigem linha ativa em `usuarios_rh` | ✓ VERIFIED | Deploy vivo (Management API, GET): `comparativo-candidatos` v33, `gerar-guia-entrevista` v25, `avaliar-transcricao-entrevista` v22, `consolidar-decisao-final` v11, `get-curriculo-url` v6, todas ACTIVE `verify_jwt=true`, `updated_at` 2026-10-06T04:17–04:18Z, **depois** do último commit de EF da fase (`7812eda4`, 00:13 -03). Código: `usuarios_rh … ativo=true … deleted_at IS NULL` → 403; `get-curriculo-url` filtra `deleted_at IS NULL` e `is_rascunho=false` (WR-03/WR-06); `consolidar-decisao-final` confere `candidatura.vaga_id === body.vaga_id` (fecha o item do `deferred-items.md`). Deno: 39+31+30+32+14+10 passed, 0 failed. **`gerenciar-usuario-rh`: v6 em 2026-10-06; hoje v7** (ver Re-verificação 2026-10-07). |
| T7 | Inclusões do operador: D-04 (guards fail-closed + anon revogado), D-05 (`v_analises_presas` invoker), D-06 | ✓ VERIFIED | As 18 funções reescritas + helper: `anon=false`, `PUBLIC=false`, `authenticated=true`, todas `SECURITY DEFINER`, todas usam `is_active_rh_user`, nenhuma cita `created_by`. `reprocessar_analise`/`salvar_revisao_redacao`: 42501 para candidato no ensaio. `v_analises_presas`: `reloptions={security_invoker=true}`; anon → permission denied. `upsert_pergunta_opcoes_metadata` alargada (e:23514 para ativo = passou do guard). |
| T8 | Repositório = PROD (ledger, md5, push) | ✓ VERIFIED | Ledger `20261005000001..4` presente; `md5(statements[1])` de cada versão **igual** ao `md5` do arquivo em disco (e7383d5d…, 503f1203…, 7372ac4e…, 114ea102…) — **reconferido em 2026-10-07**: os 4 md5 do ledger = os 4 md5 dos arquivos. Nenhuma migration nova de `p50_*` desde então (`git diff 70614565 HEAD` não toca `supabase/migrations/`). O front mudou só em comentários na fase (5 arquivos em `src/`). Push: `797c6110` é ancestral de `origin/main`; `origin/main..HEAD` hoje = 3 commits só de `.planning/` (`8c753f32`, `d7e3368f`, `9a801eb0`), sem efeito em PROD. |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

Truths comportamentais (SC2, SC5, parte do SC3): têm teste que exercita a transição/invariante e que **passou ao vivo na verificação de 2026-10-06** (ensaio 13/13 + 10 smokes legados reescritos, todos `ENSAIO VERDE`, `nada persistiu`). Nenhuma foi aceita por presença de símbolo. Em 2026-10-07 nenhum arquivo SQL, de migration ou de teste SQL coberto mudou (interseção do `git diff 70614565 HEAD` com `covered_files` = só os 2 arquivos de `gerenciar-usuario-rh`), então o ensaio vivo não foi repetido — o que mudou foi medido diretamente (seção abaixo).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20261005000001..4_p50_*.sql` | helper + 14 policies + 18 RPCs, no ledger | ✓ VERIFIED | md5 do ledger = md5 do arquivo (2026-10-06 e 2026-10-07); objetos vivos conferidos |
| `public.is_active_rh_user()` | helper vivo, sem `PUBLIC`/anon | ✓ VERIFIED | `SECURITY DEFINER`, `search_path=''`, checa `ativo` e `deleted_at` em tempo real; ACL `{postgres, authenticated, service_role}`; presente em 2026-10-07 |
| `supabase/tests/p50_acesso_recrutador_smoke.sql` | portão SC1–SC5 por forma | ✓ VERIFIED | 13/13 contra PROD vivo, com população impressa e mordida |
| Smokes legados reescritos (10 arquivos) | pares positivo/negativo | ✓ VERIFIED | Os 10 + o p50 rodaram juntos no ensaio: `ENSAIO VERDE`, `smoke50=13/13` |
| 5 EFs + `gerenciar-usuario-rh` | sem posse; integridade mantida | ✓ VERIFIED | versões vivas e testes Deno acima; `gerenciar-usuario-rh` v7 com o conserto do `797c6110` |
| `scripts/p50_sessao_real.cjs` | prova de sessão real | ✓ VERIFIED | revisado em `50-REVIEW.md` (0 crítico); saída 14/14 de um login real |
| `scripts/p50_ensaio.cjs`, `p50_vitest_delta.cjs` | ensaio que aborta; delta de suíte | ✓ VERIFIED | executados na verificação de 2026-10-06 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| 14 policies de RH | `is_active_rh_user()` | `( SELECT is_active_rh_user() )` | WIRED | 14 policies em `public`/`storage` o citam; nenhuma para `anon`/`public` |
| 18 RPCs | helper | `public.is_active_rh_user()` no corpo | WIRED | `usa_helper = true` nas 18 |
| Fila `/rh/pedidos-dados` (front) | `listar_pedidos_dados` / `contar_pedidos_dados_pendentes` | `pedidosDadosService` → RPC | WIRED | sem filtro de cliente por dono; o front não ganhou código (só comentários) |
| EFs | `usuarios_rh` ativo | `.eq("ativo", true).is("deleted_at", null)` | WIRED | 403 quando não há linha |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Fila de pedidos de dados (RH2) | linhas de `listar_pedidos_dados` | `solicitacoes_dados` LEFT JOIN `candidatos` | Sim: 3 linhas reais na sessão real; 5 (c/ semente) no ensaio | ✓ FLOWING |
| Candidaturas por vaga (RH2) | contagens PostgREST | `candidaturas` sob RLS | Sim: 11/1/7 = contagem viva do banco | ✓ FLOWING |
| Currículo (RH2) | `signedUrl` | `get-curriculo-url` → `storage.createSignedUrl` | Sim: objeto `application/pdf`, 6.515 bytes, existe em `storage.objects` | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Portão SC1–SC5 contra PROD vivo (2026-10-06) | `node scripts/p50_ensaio.cjs --sem-migracoes supabase/tests/p50_acesso_recrutador_smoke.sql` | `ENSAIO VERDE … smoke50=13/13` | ✓ PASS |
| 10 smokes legados + p50, juntos (2026-10-06) | mesmo comando com 11 arquivos | `ENSAIO VERDE`, 13/13 | ✓ PASS |
| Guarda de forma das EFs | `npx vitest run src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts` | 5/5 (2026-10-07) | ✓ PASS |
| Deno, `gerenciar-usuario-rh` em HEAD | `deno test --allow-all supabase/functions/gerenciar-usuario-rh/` | `ok \| 11 passed \| 0 failed` (2026-10-07) | ✓ PASS |
| Mordida do teste da senha (mutação Ma, cópia em scratchpad) | `crypto.getRandomValues(new Uint8Array(32))` → `new Uint8Array(32)` e `deno test` | `FAILED \| 10 passed \| 1 failed — temp password is not varied enough: 5 distinct chars` | ✓ PASS (teste morde) |
| Suíte Vitest completa em HEAD `d7e3368f` (rodada do orquestrador) | `npx vitest run` | 2461 testes, 2 falhas, ambas as pré-existentes de `promessasComExecutor.test.ts` (as mesmas da base e do 44-22) | ✓ PASS (delta de novas = 0) |
| Tipos (2026-10-06) | `npx tsc --noEmit \| grep -c "error TS"` | **89** (= baseline 89, delta 0) | ✓ PASS |

### Probe Execution

A fase não declara `probe-*.sh`; os equivalentes são os smokes do ensaio acima (Step 7c satisfeito por eles). `MISSING_PROBE`: nenhum.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EXPORT-05 | 50-01 … 50-11 (todos os 11 planos o declaram em `requirements:`) | Metade «visível ao RH» (gap G4-b da `44-VERIFICATION.md`) | ✓ SATISFIED (escopo da Phase 50) | SC1 + SC4 acima |

**Cada ID dos PLANs está contabilizado:** o único ID declarado nos 11 PLANs é `EXPORT-05`; está em `.planning/REQUIREMENTS.md` (linha 96 `[x]`, rastreabilidade linha 379 «Phase 44 + Phase 50 — Complete — G4-b fechado pela Phase 50 em 2026-10-06»). **Órfãos:** nenhum — o `REQUIREMENTS.md` não mapeia nenhum outro ID à Phase 50. (O verificador não editou o `REQUIREMENTS.md`; a escrituração já foi feita pelo orquestrador depois da verificação de 2026-10-06 e confere com a recomendação abaixo.)

#### Decisão sobre EXPORT-05

**Pode ser marcado completo, no escopo que a Phase 50 recebeu — e está.** Razões, em ordem de peso:

1. **A causa medida do rebaixamento deixou de existir.** A `44-VERIFICATION.md` (linhas 168, 181, 235) rebaixou o requisito porque o ramo `rh` de `vagas.created_by = auth.uid()` não devolvia linha a nenhum recrutador real e a igualdade fila ≡ contador era vácua. Hoje: o predicado saiu das 14 policies e das 18 RPCs (varredura viva = 0, reconfirmada em 2026-10-07), as quatro filas dão ao `rh` ativo a **mesma** impressão digital de conteúdo que dão ao administrador (órfãos incluídos), e um recrutador real que nunca criou vaga leu 3 = 3 pedidos e 3 = 3 / 2 = 2 revisões em PROD.
2. **A metade que o rebaixamento não contestou segue de pé:** a própria 44-VERIFICATION diz que o mecanismo de visibilidade (badge de Situação, classificador de faixa do Art. 19, II) é «real e testado».
3. **O que isto NÃO faz:** não fecha as demais pendências da Phase 44 (o exercício ponta a ponta de EXPORT-01/02/03 por um titular real, os residuais de allowlist, o `[ ]` do plano 44-09). Marcar EXPORT-05 aqui é fechar o **G4-b**, não aprovar a Phase 44.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (43 arquivos tocados pela fase + delta `797c6110`) | — | `TBD`/`FIXME`/`XXX`/`TODO` sem `#issue`/`DEF-*` | — | **Nenhum** (varredura de arquivo inteiro e de linhas adicionadas; o delta `797c6110` também: 0 ocorrências) |
| `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts` | 250-262 (antes) → 247-294 (hoje) | WR-01 do `50-REVIEW.md` (teste da senha só assere composição) | ✅ Fechado | `797c6110`: 20 senhas distintas, ≥16 caracteres distintos, símbolo, e a senha não chega ao corpo nem ao console. Ma/Mb/Mc/Md/Mk reprovam (review do delta; Ma reproduzida aqui) |
| `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts` | 274-294 | teste de vazamento só roda o caminho feliz; captura de console perde `debug`/`trace`/`dir` e `Error` (WR-01/WR-02 do review do delta) | ⚠️ Warning (advisory) | Lacuna de portão; código correto; fix descrito. Não afeta o goal da fase |
| `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts` | 266 | asserção de símbolo `/[^A-Za-z0-9]/` ampla (IN-01 do delta) | ℹ️ Info | O código de hoje usa só símbolos do conjunto do GoTrue |
| `scripts/p50_sessao_real.cjs` | 272, 303-306 | env herdado pelo filho; `Number(null)=0` (IN-02, IN-04) | ℹ️ Info | Sem vazamento hoje; só importa se o script for reutilizado |
| `.planning/phases/50-…/deferred-items.md` | — | item `consolidar-decisao-final` | ℹ️ Info | Já consta `status: closed` (`7812eda4`, v11): o registro foi atualizado depois da verificação anterior |

### Human Verification Required

Nenhum item bloqueante. Dois itens que o operador decidiu ou deixou sem observação direta, registrados por transparência:

- **Abertura do PDF do currículo no navegador** — não confirmada visualmente pelo operador. Fica fora dos 5 critérios do ROADMAP (SC1 fala de candidaturas). Mitigado por evidência objetiva: a EF devolveu 200 + `signedUrl` para uma candidatura de vaga que o RH2 não criou, e o objeto existe em `storage.objects` (`application/pdf`, 6.515 bytes). Não é causa de `human_needed`.
- **Desativação real do RH2 (D-11)** — «pular» pelo operador, permitido pelo CONTEXT D-11 e pelo plano; SC2 está provado por impersonação no smoke vivo.

### Gaps Summary

**Nenhum gap.** Os cinco critérios do ROADMAP e as três verdades de plano resolveram para VERIFIED contra PROD vivo, não contra o SUMMARY.

Notas de rigor que não mudam o veredito:

1. **Quem prova o quê no SC1.** O 14/14 é saída colada pelo operador; o verificador não pôde refazer o login do RH2 (não tem credencial, e não deve). Reconferiu tudo que o banco permite: papel/atividade/0 vagas próprias do RH2, as contagens 11/1/7, as 2 sessões e os eventos de login em `auth`, a policy viva e o objeto de CV. Tudo bate com o relato.
2. **SC4 na sessão real tem uma contagem vácua** (`pedidos_dados_pendentes` 0 = 0). A prova da igualdade está nas listas (3 = 3 real; 5 = 5 por impressão digital no ensaio) e no ensaio com órfão semeado.
3. **Advisory (não é gap):** as 7 funções de RH que conferem só o papel do JWT (frontmatter). A janela de até 1 h de um recrutador desativado continua aberta nelas, e a fase não as alargou nem as piorou. Se o operador quiser a mesma garantia do D-02 em todas, é fase/tarefa própria.
4. **O runner de 23 mutações (`p50_mutacoes.cjs`) não foi reexecutado** por este verificador; confiou-se na evidência de mordida que o próprio smoke vivo emite (`mordida=real`, `mordida_pg_temp=exata`) mais as duas últimas revisões adversariais (ACESSO-2: 0 crítico; fechamento: 0 crítico).
5. **Linha de base mantida:** `tsc` 89 erros e 2 falhas Vitest em `promessasComExecutor.test.ts` já existem em `81bfab81`; delta de novas = 0.

---

## Re-verificação 2026-10-07 (pós-`797c6110`)

**Motivo.** O relatório de 2026-10-06 ficou stale por dois motivos: (1) o commit `797c6110` (`fix(gerenciar-usuario-rh): teste da senha temporaria morde; senha ganha simbolo`, WR-01/IN-01 do `50-REVIEW.md`) alterou dois arquivos cobertos depois do fecho verificado (`70614565`); (2) o digest do `gsd-tools` passou de `v2` para `v3`, de modo que o `covered_digest` antigo nunca mais bateria.

**O que mudou, medido (não herdado do orquestrador):**

| Verificação | Resultado |
|-------------|-----------|
| Interseção `git diff 70614565 HEAD --name-only` × `covered_files` anteriores | **exatamente 2 arquivos**: `supabase/functions/gerenciar-usuario-rh/index.ts` e `…/__tests__/index.test.ts`. Os demais commits desde então (Phases 44/45: allowlist, export, ERASE, ROADMAP/REQUIREMENTS/STATE) não tocam arquivos cobertos |
| `797c6110` no remoto | é ancestral de `origin/main` |
| Diff de código | `gerarSenhaTemporaria()` ganhou `pick("!@#$%^&*-_")` na cauda (símbolo do conjunto do GoTrue). Fora isso, nada em `handler`/`criar`: o caminho de autorização, de rollback e de resposta não mudou |
| `deno test supabase/functions/gerenciar-usuario-rh/` em HEAD | `ok \| 11 passed \| 0 failed` |
| Mutação Ma (sem `getRandomValues`) numa cópia `git archive` em scratchpad | `FAILED \| 10 passed \| 1 failed — temp password is not varied enough: 5 distinct chars`. O teste novo morde (o review do delta registra também Mb, Mc, Md e Mk reprovando) |
| EF `gerenciar-usuario-rh` em PROD (Management API, GET) | **v7**, `ACTIVE`, `verify_jwt=true`, `updated_at` 2026-10-06T12:53:17Z; o bundle publicado (eszip) contém `gerarSenhaTemporaria` com `pick("!@#$%^&*-_")` — o conserto do `797c6110` está no ar |
| Migrations `20261005000001..4` | md5 do ledger = md5 do arquivo, nos 4 (leitura) |
| `pg_policies` (public + storage) com `created_by` | **0** |
| `rh_le_candidaturas` cita `is_active_rh_user` / helper presente / recrutadores ativos | 1 / 1 / 1 |
| Guarda `ef-sem-posse-de-vaga.grep.test.ts` | 5/5 |
| Suíte Vitest completa (rodada do orquestrador em HEAD `d7e3368f`) | 2461 testes, 2 falhas, ambas as pré-existentes e conhecidas de `promessasComExecutor.test.ts`. Não foi rerodada aqui (regra: no máximo uma execução completa por verificação) |
| `REQUIREMENTS.md` | EXPORT-05 `[x]`, rastreabilidade «Phase 44 + Phase 50 — Complete», já escriturado |

**Disposição do `797c6110` e do deploy v7 (IN-03 do review do delta: nenhum artefato da fase os escriturava).**
- WR-01 do `50-REVIEW.md` (teste da senha não morde): **fechado**, com ressalva de cobertura registrada no advisory (a lacuna é só o alcance do teste de vazamento, WR-01/WR-02 do review do delta).
- IN-01 do `50-REVIEW.md`: **fechado pela metade** — o símbolo entrou; o mapeamento de `weak_password` para um código distinto (`TEMP_PASSWORD_POLICY`) **não** entrou, e nenhum portão amarra o gerador à política viva do GoTrue. Resíduo aceito como advisory; não afeta nenhum dos 5 critérios do ROADMAP.
- Deploy: `gerenciar-usuario-rh` está em **v7** em PROD (era v6 na verificação anterior), byte-compatível no trecho verificado com o commit.
- Revisão do delta (`50-REVIEW-DELTA-797c6110.md`, commit `8c753f32`): 0 crítico, 2 warning, 3 info. Os warnings são lacunas do teste (nenhum é defeito do código entregue) e ficam como advisory — nenhum bloqueia, porque o goal da fase (acesso do recrutador) não depende do teste de vazamento da senha temporária.

**Veredito.** Nenhuma verdade regrediu; o único delta em arquivo coberto é um conserto de portão + endurecimento de senha que não toca a autorização, e está testado, publicado e revisado. Status mantido: **passed, 8/8**.

---

_Verified: 2026-10-07T22:00:00Z (re-verificação; inicial 2026-10-06T13:10:00Z)_
_Verifier: Claude (gsd-verifier)_
