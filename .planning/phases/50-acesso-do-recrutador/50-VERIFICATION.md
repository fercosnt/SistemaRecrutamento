---
phase: 50-acesso-do-recrutador
verified: 2026-10-06T13:10:00Z
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
covered_digest: "v2:sha256:54406a088bcb6b4c3bdf5f0e134036b13c6883da10ec111afcc595976afcdb05"
behavior_unverified: 0
overrides_applied: 0
requirements_checked: [EXPORT-05]
export_05_decision: "G4-b (metade «visível ao RH») FECHADO pela Phase 50; EXPORT-05 pode ser marcado completo no escopo desta fase — ver §Requirements Coverage. Não fecha as demais pendências da Phase 44."
advisory:
  - finding: "7 funções SECURITY DEFINER de RH conferem só o papel do JWT, sem is_active_rh_user() (anonimizar_candidato, atualizar_meu_perfil_rh, plano_exclusao_titular, publish_vaga, responder_revisao_decisao, salvar_janela_retencao, trg_redacao_rh_only_review_fields)"
    category: security
    reason: "Pré-existente e NÃO alargado pela fase (nenhuma lia vagas.created_by). Um recrutador desativado, com JWT ainda válido (até 1 h), passa nelas. A mais próxima do domínio da fase é responder_revisao_decisao. Fora do SC2 como escrito («não vê»), mas é a mesma janela que o D-02 fechou nas funções alargadas."
    evidence_status: "medido em PROD por catálogo (pg_proc), sem execução do caminho"
  - finding: "50-REVIEW.md WR-01: o teste da senha temporária da gerenciar-usuario-rh assere só a composição; as mutações M-a (sem getRandomValues) e M-b (senha na resposta/log) sobrevivem"
    category: other
    reason: "O código está correto (revisado); o teste não morde. Defeito de portão, não de entrega da fase. Fix já descrito no review."
    evidence_status: "mutação reproduzida pelo revisor"
---

# Phase 50: Acesso do Recrutador — Verification Report

**Phase Goal:** O recrutador que o operador cadastra trabalha de verdade: vê **todas** as vagas (ativas, inativas e arquivadas), as candidaturas delas e as filas que dependem disso (pedidos de revisão, pedidos de dados), em vez da tela vazia que o predicado `vagas.created_by = auth.uid()` produz.
**Verified:** 2026-10-06T13:10:00Z
**Status:** passed
**Re-verification:** No — initial verification

> Postura: o SUMMARY não foi aceito como evidência. Cada verdade abaixo foi remedida em PROD agora (somente leitura / ensaio que aborta) e no repositório. Nenhum apply, deploy, escrita em PROD ou commit foi feito por este verificador. Os únicos comandos que executam SQL com escrita foram `scripts/p50_ensaio.cjs`, que roda numa transação que termina em `RAISE EXCEPTION` e confere, antes e depois, que nada persistiu.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence (medido por este verificador) |
|---|-------|--------|----------------------------------------|
| SC1 | Um recrutador **ativo** que não criou vaga vê as candidaturas de uma vaga ativa, uma inativa e uma arquivada — com **sessão real** | ✓ VERIFIED | PROD hoje: `usuarios_rh` tem o RH2 (`sub af4ebf97…`) com `role=recrutador, ativo=true, vagas_proprias=0`. As três vagas do script existem e têm exatamente as contagens que ele relatou: ativa `e897f709…` = **11**, inativa `629a5f31…` = **1**, arquivada `4601d000…` = **7** (candidaturas vivas, não-rascunho). `auth.audit_log_entries` confirma a sessão real do RH2: `user_recovery_requested` 09:21, `login` 09:22, `user_updated_password`, e 2º `login` 09:24 (-03) — compatível com a execução do script. `auth.sessions`: 2 linhas. Policy viva `rh_le_candidaturas`: ramo `rh` = `deleted_at IS NULL AND is_rascunho = false AND is_active_rh_user()`, **sem** `created_by`. `vagas` tem a policy «RH vê todas vagas» (usuario RH ativo, sem filtro de dono). O 14/14 da sessão real está em `50-11-SUMMARY.md` (saída literal do operador); a parte que dá para reconferir do lado do banco bate. |
| SC2 | Recrutador **inativo** e candidato continuam sem ver nada; administrador não perde nada | ✓ VERIFIED | Ensaio vivo (`p50_ensaio.cjs`, 13/13): `velho` (recrutador desativado com token válido) → `contar_*` = 0, `listar_*` = 0 linhas; `candidato` → 42501 nas 4 filas e nas 18 RPCs (`i_cand`); `funil_kpis` do candidato = vazio; `i_ativo` mostra as 18 RPCs funcionando para o ativo. Cobertura de policies `183/183`. Ramo `administrador` presente e intacto no texto vivo de `rh_le_candidaturas`/`rh_avanca_etapa`. Anon medido por `SET LOCAL ROLE anon` em PROD: `candidaturas`, `decisao_final`, `historico_candidatura`, `notificacoes_enviadas`, `v_analises_presas` → **permission denied**; as demais 9 tabelas → **0 linhas**. Nenhuma das 14 policies com o helper tem papel `anon`/`public`. Prova real de desativação (D-11) foi **pulada pelo operador** — o plano e o CONTEXT D-11 autorizam impersonação. |
| SC3 | Varredura por forma não acha mais `created_by = auth.uid()` em policy/função de RH; o portão morde | ✓ VERIFIED | Varredura viva agora: `pg_policies` (schemas `public` e `storage`) com `created_by` → **0**. Funções `public` que citam `created_by` → **4**, todas autoria e não autorização: `anonimizar_candidato` e `plano_exclusao_titular` (D-08, intocadas — não estão em nenhuma das 4 migrations), `criar_preferencias_padrao` (INSERT de `created_by`), `criar_usuario_rh_com_audit` (INSERT de `created_by`). Views com `created_by`: só `v_usuarios_rh_ativos` e `v_candidatos_ativos` (colunas de outras tabelas). Triggers e `cron.job`: 0. EFs: `grep created_by` em `supabase/functions` (fora de testes) → só `reciboExclusao.ts`/`exportAllowlist.ts` (listas de PII). Mordida: o smoke vivo reporta `formas=pol_rh:14,fn_rh:18`, `antiga=155/183 mordida=real`, `mordida_pg_temp=exata`; guarda Vitest `ef-sem-posse-de-vaga.grep.test.ts` 5/5. O runner de 23 mutações (`p50_mutacoes.cjs`) **não foi reexecutado** aqui; a mordida do portão foi conferida pelo que o próprio smoke vivo prova (ver Gaps Summary, nota 4). |
| SC4 | As filas de pedidos de revisão e de pedidos de dados mostram ao recrutador os mesmos itens do administrador | ✓ VERIFIED | Corpos vivos: `listar_pedidos_dados`, `contar_revisoes_pendentes` (e, pelo ensaio, `contar_pedidos_dados_pendentes`/`listar_revisoes_decisao`) usam `v_role='administrador' OR (v_role='rh' AND is_active_rh_user())` — a mesma cláusula, sem filtro próprio do ramo rh. Ensaio vivo, impressões digitais por conteúdo: `admin.listar_pedidos_dados>n:5:10e13e072ecc` = `ativo.listar_pedidos_dados>n:5:10e13e072ecc`; `listar_revisoes_decisao` (false/true) idem (2:`2cd47009c1ce`, 3:`b8603d134007`); contadores 2 = 2; população semeada com 1 órfão. Sessão real do RH2: `pedidos_dados_todos` 3 = 3 e `revisoes_todas` 3 = 3, `revisoes_pendentes` 2 = 2. O único empate vácuo é `pedidos_dados_pendentes` 0 = 0 na sessão real (sem pedido pendente naquele minuto), e a igualdade não se apoia nele. |
| SC5 | Gates de dono por regra de negócio continuam (REVISAO-05, D-23) | ✓ VERIFIED | `responder_revisao_decisao` está **fora** das 4 migrations; o corpo vivo mantém `v_uid = v_row.por_usuario → 42501` e o guard de «decisor indeterminado». Ensaio vivo, cláusula (l): `sc5=decisor>e:42501,outro>ok` e `d23=comportamental>e:42501,outro>ok,literal=true`. `anonimizar_candidato`/`plano_exclusao_titular` não foram tocadas. |
| T6 | As 5 EFs não usam posse de vaga, mas mantêm integridade (D-09) e exigem linha ativa em `usuarios_rh` | ✓ VERIFIED | Deploy vivo (Management API, GET): `comparativo-candidatos` v33, `gerar-guia-entrevista` v25, `avaliar-transcricao-entrevista` v22, `consolidar-decisao-final` v11, `get-curriculo-url` v6, todas ACTIVE `verify_jwt=true`, `updated_at` 2026-10-06T04:17–04:18Z, **depois** do último commit de EF da fase (`7812eda4`, 00:13 -03). Código: `usuarios_rh … ativo=true … deleted_at IS NULL` → 403; `get-curriculo-url` filtra `deleted_at IS NULL` e `is_rascunho=false` (WR-03/WR-06); `consolidar-decisao-final` confere `candidatura.vaga_id === body.vaga_id` (fecha o item do `deferred-items.md`). Deno: 39+31+30+32+14+10 passed, 0 failed. |
| T7 | Inclusões do operador: D-04 (guards fail-closed + anon revogado), D-05 (`v_analises_presas` invoker), D-06 | ✓ VERIFIED | As 18 funções reescritas + helper: `anon=false`, `PUBLIC=false`, `authenticated=true`, todas `SECURITY DEFINER`, todas usam `is_active_rh_user`, nenhuma cita `created_by`. `reprocessar_analise`/`salvar_revisao_redacao`: 42501 para candidato no ensaio. `v_analises_presas`: `reloptions={security_invoker=true}`; anon → permission denied. `upsert_pergunta_opcoes_metadata` alargada (e:23514 para ativo = passou do guard). |
| T8 | Repositório = PROD (ledger, md5, push) | ✓ VERIFIED | Ledger `20261005000001..4` presente; `md5(statements[1])` de cada versão **igual** ao `md5` do arquivo em disco (e7383d5d…, 503f1203…, 7372ac4e…, 114ea102…). Nenhuma outra migration depois de `81bfab81`. `git log origin/main..HEAD` = só `50433eee docs(50): add code review report` (`.planning/`, sem efeito em PROD). O front mudou só em comentários (5 arquivos em `src/`, +222/−12 dos quais 207 são o teste-guarda novo). |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

Truths comportamentais (SC2, SC5, parte do SC3): têm teste que exercita a transição/invariante e que **passou ao vivo nesta verificação** (ensaio 13/13 + 10 smokes legados reescritos, todos `ENSAIO VERDE`, `nada persistiu`). Nenhuma foi aceita por presença de símbolo.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20261005000001..4_p50_*.sql` | helper + 14 policies + 18 RPCs, no ledger | ✓ VERIFIED | md5 do ledger = md5 do arquivo; objetos vivos conferidos |
| `public.is_active_rh_user()` | helper vivo, sem `PUBLIC`/anon | ✓ VERIFIED | `SECURITY DEFINER`, `search_path=''`, checa `ativo` e `deleted_at` em tempo real; ACL `{postgres, authenticated, service_role}` |
| `supabase/tests/p50_acesso_recrutador_smoke.sql` | portão SC1–SC5 por forma | ✓ VERIFIED | 13/13 contra PROD vivo, com população impressa e mordida |
| Smokes legados reescritos (10 arquivos) | pares positivo/negativo | ✓ VERIFIED | Os 10 + o p50 rodaram juntos no ensaio: `ENSAIO VERDE`, `smoke50=13/13` |
| 5 EFs + `gerenciar-usuario-rh` v6 | sem posse; integridade mantida | ✓ VERIFIED | versões vivas e testes Deno acima |
| `scripts/p50_sessao_real.cjs` | prova de sessão real | ✓ VERIFIED | revisado em `50-REVIEW.md` (0 crítico); saída 14/14 de um login real |
| `scripts/p50_ensaio.cjs`, `p50_vitest_delta.cjs` | ensaio que aborta; delta de suíte | ✓ VERIFIED | executados aqui |

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
| Portão SC1–SC5 contra PROD vivo | `node scripts/p50_ensaio.cjs --sem-migracoes supabase/tests/p50_acesso_recrutador_smoke.sql` | `ENSAIO VERDE … smoke50=13/13` | ✓ PASS |
| 10 smokes legados + p50, juntos | mesmo comando com 11 arquivos | `ENSAIO VERDE`, 13/13 | ✓ PASS |
| Guarda de forma das EFs | `npx vitest run src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts` | 5/5 | ✓ PASS |
| Deno, 6 EFs | `deno test --allow-all supabase/functions/<ef>/` | 156 passed, 0 failed | ✓ PASS |
| Suíte Vitest por delta contra a base da fase | `node scripts/p50_vitest_delta.cjs` | `base 2410/2 · head 2415/2 · pre-existentes=2 · corrigidas=0 · novas=0 · mordida=ok` | ✓ PASS |
| Tipos | `npx tsc --noEmit \| grep -c "error TS"` | **89** (= baseline 89, delta 0) | ✓ PASS |

### Probe Execution

A fase não declara `probe-*.sh`; os equivalentes são os smokes do ensaio acima (Step 7c satisfeito por eles). `MISSING_PROBE`: nenhum.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EXPORT-05 | 50-01 … 50-11 (todos os 11 planos o declaram em `requirements:`) | Metade «visível ao RH» (gap G4-b da `44-VERIFICATION.md`) | ✓ SATISFIED (escopo da Phase 50) | SC1 + SC4 acima |

**Cada ID dos PLANs está contabilizado:** o único ID declarado nos 11 PLANs é `EXPORT-05`; está em `.planning/REQUIREMENTS.md` (linha 96; rastreabilidade linha 372). **Órfãos:** nenhum — o `REQUIREMENTS.md` não mapeia nenhum outro ID à Phase 50. (O `REQUIREMENTS.md` não foi editado pela fase, como a proibição dos planos 50-10/50-11 exige.)

#### Decisão sobre EXPORT-05

**Pode ser marcado completo, no escopo que a Phase 50 recebeu.** Razões, em ordem de peso:

1. **A causa medida do rebaixamento deixou de existir.** A `44-VERIFICATION.md` (linhas 168, 181, 235) rebaixou o requisito porque o ramo `rh` de `vagas.created_by = auth.uid()` não devolvia linha a nenhum recrutador real e a igualdade fila ≡ contador era vácua. Hoje: o predicado saiu das 14 policies e das 18 RPCs (varredura viva = 0), as quatro filas dão ao `rh` ativo a **mesma** impressão digital de conteúdo que dão ao administrador (órfãos incluídos), e um recrutador real que nunca criou vaga leu 3 = 3 pedidos e 3 = 3 / 2 = 2 revisões em PROD.
2. **A metade que o rebaixamento não contestou segue de pé:** a própria 44-VERIFICATION diz que o mecanismo de visibilidade (badge de Situação, classificador de faixa do Art. 19, II) é «real e testado».
3. **O que isto NÃO faz:** não fecha as demais pendências da Phase 44 (o exercício ponta a ponta de EXPORT-01/02/03 por um titular real, os residuais de allowlist 1.1.0 → 1.3.0, o `[ ]` do plano 44-09). A Phase 44 continua «In Progress». Marcar EXPORT-05 aqui é fechar o **G4-b**, não aprovar a Phase 44.

**Texto sugerido ao orquestrador** (o verificador não edita `REQUIREMENTS.md`): manter `[x]` em EXPORT-05, trocar «rebaixada a parcial… não vale para recrutador nenhum» por «G4-b fechado pela Phase 50 em 2026-10-06 (verificação `50-VERIFICATION.md`)», e na tabela de rastreabilidade mudar `Phase 44` para `Phase 44 + Phase 50`. Marcar o ROADMAP da Phase 50 como concluída (`[x]`, 11/11, data 2026-10-06).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (43 arquivos tocados pela fase) | — | `TBD`/`FIXME`/`XXX` sem `#issue`/`DEF-*` | — | **Nenhum** (varredura de arquivo inteiro e de linhas adicionadas) |
| `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts` | 250-262 | teste de senha só assere composição (WR-01 do `50-REVIEW.md`) | ⚠️ Warning | Mutações M-a/M-b sobrevivem; código correto. Não afeta o goal da fase |
| `scripts/p50_sessao_real.cjs` | 272, 303-306 | env herdado pelo filho; `Number(null)=0` (IN-02, IN-04) | ℹ️ Info | Sem vazamento hoje; só importa se o script for reutilizado |
| `.planning/phases/50-…/deferred-items.md` | — | item `consolidar-decisao-final` ainda «status: open» | ℹ️ Info | Obsoleto: fechado por `7812eda4` (WR-07, autorizado pelo «1» do operador depois do ACESSO-1) e deployado (v11). Atualizar o registro |

### Human Verification Required

Nenhum item bloqueante. Dois itens que o operador decidiu ou deixou sem observação direta, registrados por transparência:

- **Abertura do PDF do currículo no navegador** — não confirmada visualmente pelo operador. Fica fora dos 5 critérios do ROADMAP (SC1 fala de candidaturas). Mitigado por evidência objetiva: a EF devolveu 200 + `signedUrl` para uma candidatura de vaga que o RH2 não criou, e o objeto existe em `storage.objects` (`application/pdf`, 6.515 bytes). Não é causa de `human_needed`.
- **Desativação real do RH2 (D-11)** — «pular» pelo operador, permitido pelo CONTEXT D-11 e pelo plano; SC2 está provado por impersonação no smoke vivo.

### Gaps Summary

**Nenhum gap.** Os cinco critérios do ROADMAP e as três verdades de plano resolveram para VERIFIED contra PROD vivo, não contra o SUMMARY.

Notas de rigor que não mudam o veredito:

1. **Quem prova o quê no SC1.** O 14/14 é saída colada pelo operador; eu não pude refazer o login do RH2 (não tenho credencial, e não devo). Reconferi tudo que o banco permite: papel/atividade/0 vagas próprias do RH2, as contagens 11/1/7, as 2 sessões e os eventos de login em `auth`, a policy viva e o objeto de CV. Tudo bate com o relato.
2. **SC4 na sessão real tem uma contagem vácua** (`pedidos_dados_pendentes` 0 = 0). A prova da igualdade está nas listas (3 = 3 real; 5 = 5 por impressão digital no ensaio) e no ensaio com órfão semeado.
3. **Advisory (não é gap):** as 7 funções de RH que conferem só o papel do JWT (frontmatter). A janela de até 1 h de um recrutador desativado continua aberta nelas, e a fase não as alargou nem as piorou. Se o operador quiser a mesma garantia do D-02 em todas, é fase/tarefa própria.
4. **O runner de 23 mutações (`p50_mutacoes.cjs`) não foi reexecutado** por este verificador; confiei na evidência de mordida que o próprio smoke vivo emite (`mordida=real`, `mordida_pg_temp=exata`) mais as duas últimas revisões adversariais (ACESSO-2: 0 crítico; fechamento: 0 crítico).
5. **Linha de base mantida:** `tsc` 89 erros e 2 falhas Vitest em `promessasComExecutor.test.ts` já existem em `81bfab81`; delta de novas = 0.

---

_Verified: 2026-10-06T13:10:00Z_
_Verifier: Claude (gsd-verifier)_
