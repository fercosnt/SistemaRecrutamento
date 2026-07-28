---
audit: M4 pre-milestone full-system
method: 7 finders Fable x 3 lentes adversariais (sobrevive >=2/3 CONFIRMED)
date: 2026-07-05
status: FINAL — 194/194 agentes, 0 erros; todas as 7 dimensoes verificadas + sintese
raw_findings: 62
confirmed: 56
refuted: 6
by_severity: {critical: 2, high: 20, medium: 25, low: 9}
agents: 194 (7 finders + ~186 verificadores + 1 sintese), 17.8M tokens Fable
---

# BACKLOG M4 — Auditoria Full-System do ATS Beauty Smile

> Fonte: auditoria adversarial (3 lentes). Todos os itens abaixo são achados **confirmados** (≥2 de 3 lentes) e prontos para virar requisitos M4. Cada item é um candidato a requirement — refine `must_haves`/`truths` no REQUIREMENTS.md formal.

---

## Resumo executivo

| Severidade | Qtd | Subsistemas dominantes |
|---|---|---|
| 🔴 Critical | 2 | data-model (answer-key), tests (CI) |
| 🟠 High | 20 | ai-ef-resilience (4), funil-integration (4), frontend (3), data-model (4), security-rls-pii (2), tests (2), deps-config (1) |
| 🟡 Medium | 25 | data-model (5), tests (4), deps-config (6), ai-ef-resilience (3), funil-integration (2), frontend (3), security-rls-pii (2) |
| ⚪ Low | 9 | deps-config (3), frontend (2), ai/funil/data/tests (1 cada) |
| **Total** | **56** | |

**Notas de deduplicação:** 3 pares de achados descrevem a mesma raiz e devem virar 1 requirement cada: (a) `gerar-devolutiva-bigfive` sem auth — H5 + M-AI (medium); (b) testes Deno das EFs sem CI — C2 + M-INFRA; (c) credenciais e2e hardcoded — M-TEST + M-INFRA. Contadas nas 56 por fidelidade ao levantamento, mas planejar como 53 requirements efetivos.

### 3 temas transversais mais importantes

1. **Stack de confiabilidade/versionamento de IA silenciosamente inerte.** A prompt library engenheirada (rubrics BARS, guardas de viés, linguagem LGPD, tuning) está **morta para 5 dos 7 call_types** (roda stub de 1 linha); o circuit breaker IA-04 é código morto; o retry de timeout do RESIL-01 nunca dispara; os guardrails de custo são detect-only com 25h de atraso. Resultado: candidatos são avaliados por prompts genéricos/modelos fracos e a auditoria IA-02 registra versão `0.0.0` — sem nenhum sinal. Corrigir o roteamento de prompt e a resiliência é o maior ganho de qualidade/compliance do M4.

2. **RLS row-level tratado como segredo de coluna.** O padrão `[[reference_select_star_leaks_pii]]` recorre em ≥5 tabelas: gabarito cognitivo (`gabarito_idx`), veredito de redação (`red_flag_etico`/`notas_revisor`), rubric SJT, e scoping horizontal WR-03/WR-04 esquecido em `analise_candidato_vaga`/`redacoes_candidato`/`candidaturas`. A "allowlist" de coluna vive no service TS do frontend e **não vincula o PostgREST** — qualquer JWT com `?select=coluna_secreta` lê o dado. Precisa de RPCs SECURITY DEFINER / column-level REVOKE, não allowlist client-side.

3. **Rede de testes/CI ausente exatamente na camada mais frágil.** O corpus Deno das EFs (~126–136 testes, incluindo as regressões dos 3 defeitos de PROD do P21) não roda em CI algum; a lógica DB (RLS/RPCs/RNF-07a) não tem pgTAP; contract tests mockam os dois lados do boundary; o e2e do funil RH é casca mocked; o baseline tsc está 33 erros frouxo. A camada que originou TODOS os defeitos live pode regredir com CI 100% verde. Some-se o **drift M1→M2** (enums legados, colunas inexistentes, mocks, migrations que não reconstroem o banco) que chega a PROD sem nada vermelho.

---

## 🔴 CRITICAL

### C1 — Proteger o answer-key do teste cognitivo (`gabarito_idx`) contra leitura direta via PostgREST
- **Subsistema:** data-model
- **Arquivo:** `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql:161-166`
- **Impacto:** policy `auth_le_cognitivo_itens USING (auth.role()='authenticated')` dá SELECT de linha inteira; candidato faz `GET /rest/v1/cognitivo_itens?select=id,gabarito_idx`, lê o gabarito e submete 100% de acerto → banda 'bem_acima' exibida ao RH.
- **Fix:** `DROP POLICY` + RPC SECURITY DEFINER `get_cognitivo_itens()` projetando só `id/secao/enunciado/alternativas/ordem` (padrão já usado em `perguntas_opcao_sjt`/`bigfive_itens`); no mínimo `REVOKE SELECT (gabarito_idx) ... FROM authenticated, anon`.
- **Esforço:** S
- **Nota:** tabela vazia hoje (seed CC0 deferido) → vazamento latente até popular o banco. Corrigir antes de habilitar a prova.

### C2 — Rodar o corpus de testes Deno das Edge Functions em CI
- **Subsistema:** tests
- **Arquivo:** `.github/workflows/ci.yml:57` (só `npm run test:run` + Playwright; `vite.config.ts:19-43` exclui todos os testes Deno)
- **Impacto:** ~126–136 testes Deno das EFs (ai-client, circuit-breaker, injection-detector, avaliar-redacao, gerar-devolutiva-bigfive…) não rodam em nenhum runner; incluindo as regressões dos 3 bugs de PROD do P21 (`ai-client.test.ts:239` timeoutMs; `gerar-devolutiva-bigfive/__tests__/index.test.ts:197-205` bug 23503). Remover `timeoutMs` deixa Vitest 692/692 verde e o `gerar-guia` volta a 500ar em PROD.
- **Fix:** job `deno-test` no ci.yml (`denoland/setup-deno@v2` + `deno test --allow-read --allow-env supabase/functions/ scripts/`); recommitar `deno.lock`. **Bloqueado por H19** (suíte já não roda no modo default) — corrigir os 2 bloqueadores antes de wirar.
- **Esforço:** S (após H19)
- **Dedup:** mesmo achado que M-INFRA "Testes Deno nunca rodam no CI".

---

## 🟠 HIGH

### H1 — Restaurar o roteamento da prompt library para os 5 call_types órfãos
- **Subsistema:** ai-ef-resilience
- **Arquivo:** `supabase/functions/_shared/prompt-loader.ts:33-42, 125-130`
- **Impacto:** `SCHEMA_VERSIONS` não conhece `work_sample_sjt`/`culture_fit_essay`/`transcript_analysis`/`interview_guide`/`bigfive_devolutiva` → `assertSchemaVersionCompat` sempre lança → catch cai em stub de 1 linha; 5/7 EFs de IA avaliam candidatos sem rubric/guarda de viés, logando `prompt_version '0.0.0'` (auditoria IA-02 quebrada).
- **Fix:** adicionar as 5 chaves (`'1.0.0'`) ao mapa, remover órfãs (`sjt_evaluation`/`interview_questions`), restringir o catch a `PromptNotConfiguredError` (mismatch deve falhar 500, não degradar), teste que varre call_types×mapa, redeployar TODAS as EFs de IA.
- **Esforço:** S

### H2 — Tornar o circuit breaker (IA-04) um singleton por-isolate funcional
- **Subsistema:** ai-ef-resilience
- **Arquivo:** `supabase/functions/_shared/ai-client.ts:300`
- **Impacto:** `deps.breaker ?? new CircuitBreaker()` cria instância por chamada e `THRESHOLD=5 > MAX_ATTEMPTS=3` → nunca abre; em outage Anthropic cada request paga a escada completa (~81–186s) antes do fallback; `gerar-guia` (60s×3) estoura o teto do Edge Runtime → 500.
- **Fix:** `const sharedBreaker = new CircuitBreaker()` module-level como default; teste de 5 falhas consecutivas → `canRequest()===false`.
- **Esforço:** S

### H3 — Fazer `isRetryable` reconhecer o timeout do SDK ("Request timed out.")
- **Subsistema:** ai-ef-resilience
- **Arquivo:** `supabase/functions/_shared/ai-client.ts:234-239`
- **Impacto:** regex `/timeout/i` não casa "timed out" e `APIConnectionTimeoutError` não tem `status` → todo timeout é fatal na 1ª tentativa → fallback silencioso p/ gpt-4o-mini avaliando candidatos, com `error_code` enganoso `anthropic_retries_exhausted`.
- **Fix:** adicionar `timed\s*out` à regex OU checar `err.name === 'APIConnectionTimeoutError'`; limitar retries de timeout a 1 quando `timeoutMs > 25s` para não estourar o teto do EF.
- **Esforço:** S

### H4 — Aplicar override `timeoutMs: 60s` em `avaliar-transcricao-entrevista`
- **Subsistema:** ai-ef-resilience
- **Arquivo:** `supabase/functions/avaliar-transcricao-entrevista/index.ts:208-227`
- **Impacto:** mesmo perfil (Sonnet, 4000 tokens, input longo) que fez `gerar-guia` 500ar em TODA geração pré-P21, mas herda os 25s globais → transcrições longas cortam em 25s → fallback também corta → 500 ao RH e tokens pagos 2×.
- **Fix:** `timeoutMs: 60_000` no callAi (revisar `avaliar-redacao-cultural`/`avaliar-redacao` via `ai_call_logs.latency_ms`); considerar teto derivado de `max_tokens` do prompt resolvido.
- **Esforço:** S

### H5 — Adicionar guard de caller server-to-server em `gerar-devolutiva-bigfive`
- **Subsistema:** security-rls-pii (+ ai-ef-resilience)
- **Arquivo:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:526-660`
- **Impacto:** handler não valida caller (sem Bearer/role/ownership) e roda via service_role; deployado JWT-ON → qualquer candidato autenticado POSTa `score_id` alheio → recebe as `paginas` completas (perfil comportamental de terceiro — IDOR/PII), queima 5 chamadas Sonnet e sobrescreve a devolutiva do outro.
- **Fix:** guard espelhando `cost-alerter` — comparar Bearer com `SUPABASE_SERVICE_ROLE_KEY`/secret dedicado (constant-time), 401 caso contrário; registrar `triggered_by`. Não confiar no gateway para autorização.
- **Esforço:** S
- **Dedup:** unifica com o achado medium "Deno.serve sem validação de caller".

### H6 — Escopar por vaga as policies RH de `analise_candidato_vaga` e `comparativo_solicitado`
- **Subsistema:** security-rls-pii
- **Arquivo:** `supabase/migrations/20260610000001_analise_tables.sql:77-88`
- **Impacto:** `rh_le_analise`/`rh_le_comparativo` são role-only; recrutador não-dono lê score_match/gaps/flags/resumo_cv de candidatos de vagas de pares — o mesmo RH bloqueado de ler scores/decisão via WR-04. Latente até existir conta `role='rh'` (hoje só admins).
- **Fix:** reemitir com predicado WR-04: `administrador OR (rh AND candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id=c.vaga_id WHERE v.created_by=auth.uid()))`. Revisar `devolutivas_candidato`/`historico_candidatura` na mesma migration.
- **Esforço:** M

### H7 — Alinhar os teste-ids dos `cargoTemplates` ao contrato do `AvaliacaoContainer`
- **Subsistema:** funil-integration
- **Arquivo:** `src/features/config-vaga/templates/cargoTemplates.ts:57-72`
- **Impacto:** templates gravam `{triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}` mas o container ramifica por `{sjt_mc, sjt_caso_aberto, redacao, big_five}` → candidato vê cards espúrios ('Triagem','Entrevista') clicáveis que caem na tela de SJT MC; 'redacao_cultural'≠'redacao' → redação abre MC; `SjtCasoAbertoScreen` INALCANÇÁVEL → score composto SJT eterno incompleto. Bônus: `pontuar_sjt` busca threshold por `tipo='sjt'` que templates nunca escrevem → `mc_min_pct` morto.
- **Fix:** enum canônico compartilhado de teste-id; filtrar em `deriveCards` só candidate-facing; mapear `work_sample_sjt→mc+caso`, `redacao_cultural→/candidato/redacao`, `cognitivo→/candidato/prova-cognitiva`; teste de contrato template↔container.
- **Esforço:** M

### H8 / H11 — Remover o fluxo legado M1 do Kanban / UpdateStatusModal (enum de etapas inexistente)
- **Subsistema:** funil-integration + frontend *(H8 e H11 são a mesma raiz — unificar)*
- **Arquivo:** `src/features/vagas/services/candidaturasService.ts:861-902`; `src/components/KanbanBoard.tsx:44-57,284-305`
- **Impacto:** `getProximaEtapa`/`ETAPAS_SEQUENCIA` (M1) grava `etapa_atual='bigfive'` → **22P02** em toda aprovação; candidatos M2 (`avaliacao_assincrona` etc.) caem na coluna 'Triagem' (visão errada do pipeline); pior: `getProximaEtapa('aprovado')='rejeitado'` — ambos válidos no enum → UPDATE passa e **candidato aprovado vira Rejeitado** no dashboard dele.
- **Fix:** apontar `UpdateStatusModal`/`KanbanBoard` para o fluxo M2 (`updateCandidaturaEtapa` + trigger `avancar_etapa`); deletar `EtapaProcesso`/`ETAPAS_SEQUENCIA`/`getProximaEtapa`/`ETAPA_TO_KANBAN`; tipar `etapa_atual` com `Enums['etapa_processo']`.
- **Esforço:** M

### H9 — Filtrar o banco SJT por cargo/bateria da vaga (client + server)
- **Subsistema:** funil-integration
- **Arquivo:** `src/features/avaliacao/services/avaliacaoService.ts:134-140`
- **Impacto:** `getAvaliacaoContext` carrega perguntas só com `.eq('status','active')` — sem `cargo`/`itens_ids`; candidato a Recepcionista recebe as ≥10 situações de 8 cargos + o caso aberto de Dentista; RH compara scores computados sobre baterias distintas. `pontuar_sjt` não valida pertencimento → bypassável.
- **Fix:** client filtra por `itens_ids`/`cargo` do elemento `work_sample_sjt`; `pontuar_sjt` valida server-side que todo `pergunta_id` pertence à bateria da vaga (42501/400 senão).
- **Esforço:** M

### H10 — Tornar a prova cognitiva alcançável pela navegação (rota↔gate coerentes)
- **Subsistema:** funil-integration
- **Arquivo:** `src/lib/navegacao/funilNavMap.ts:60-64`
- **Impacto:** funilNavMap alega fan-out que `AvaliacaoContainer` não implementa (sem branch cognitivo) e dá `rotaCandidato null` para `entrevista_*`, enquanto `pontuar_cognitivo` exige exatamente essas etapas → nenhuma etapa tem simultaneamente link+RPC aceitando o submit; se aberta por URL em `avaliacao_assincrona`, submit devolve 42501 e respostas são descartadas com toast 'etapa avançou' (mentiroso). ENTREV-05 morto ponta-a-ponta.
- **Fix:** decidir etapa canônica: card cognitivo no container + relaxar gate do RPC p/ `avaliacao_assincrona`, OU dar `rotaCandidato` de prova às etapas `entrevista_*`. Teste de contrato rota↔gate.
- **Esforço:** M

### H12 — Corrigir hidratação e persistência de "Editar Vaga" (8 colunas inexistentes)
- **Subsistema:** frontend
- **Arquivo:** `src/components/pages/CriarEditarVagaPage.tsx:158-168, 302-317`
- **Impacto:** hidrata `faixa_salarial`/`requisito_*`/`descricao_completa` (colunas que não existem — reais são `faixa_salarial_min/max`/`requisitos_*`) → form abre VAZIO; e não há caminho de persistência para conteúdo (`handleSalvarRascunho` só grava `testes_aplicaveis`+`pesos`) → RH reescreve, vê toast de sucesso, nada salvo. Erros TS2551/TS2339 escondidos no baseline.
- **Fix:** mapear hidratação p/ colunas reais + adicionar UPDATE real de `vagas` no submit; ou tornar campos de conteúdo read-only com aviso explícito até o CRUD existir.
- **Esforço:** M

### H13 — Ligar (ou ocultar) a gestão de usuários RH em `/rh/configuracoes`
- **Subsistema:** frontend
- **Arquivo:** `src/components/pages/ConfiguracoesPage.tsx:169-207, 490-494`
- **Impacto:** UI admin-only 100% mock (`useState` com 4 usuários fictícios); 'desativar usuário' e 'redefinir senha' são `console.log` — ex-funcionário desligado mantém acesso a PII de candidatos (risco LGPD de offboarding), reset de senha nunca envia email.
- **Fix mínimo (segurança barata):** ocultar a aba com empty-state 'gestão de usuários indisponível'. **Completo:** SELECT `usuarios_rh` + Edge Function service_role para criar/desativar/reset.
- **Esforço:** L

### H14 — Impedir que o candidato leia o veredito da IA da própria redação e `referencia_match` de terceiros
- **Subsistema:** data-model
- **Arquivo:** `supabase/migrations/20260623100003_redacoes_candidato.sql:107-115`
- **Impacto:** `redacao_candidato_select` dá linha inteira: `analise_ia`, `score_ponderado_0_100`, `red_flag_etico`, `notas_revisor`, `decisao_revisor`, `referencia_match` (uuid[] de candidaturas de terceiros com hash de plágio) — candidato lê deliberação interna (risco trabalhista/LGPD) via `?select=...`.
- **Fix:** RPC SECURITY DEFINER retornando só status neutro, OU `REVOKE SELECT (analise_ia, scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico, flags, referencia_match, scores_humanos, notas_revisor, decisao_revisor) FROM authenticated`.
- **Esforço:** M

### H15 — Blindar `pontuar_sjt` contra manipulação (dedup, denominador, pertencimento, re-submit)
- **Subsistema:** data-model
- **Arquivo:** `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql:84-110`
- **Impacto:** RPC (GRANT authenticated) aceita `p_respostas` arbitrário: sem dedup (numerador soma peso N× → score >100%), denominador só sobre respondidas (responder 1 de 10 = 100%), sem validar cargo/vaga, `ON CONFLICT DO UPDATE` ilimitado → RH vê work-sample perfeito baseado em fração da prova.
- **Fix:** deduplicar por `pergunta_id`, denominador sobre TODAS as perguntas ativas do cargo, validar pergunta∈bateria, gravar esperadas×respondidas em metadata, opcional travar re-submit.
- **Esforço:** M

### H16 — Bloquear rejeição de candidato via UPDATE direto de `candidaturas.status` (sem auditoria)
- **Subsistema:** data-model
- **Arquivo:** `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:54-58`
- **Impacto:** `rh_avanca_etapa` não restringe colunas e o trigger de auditoria é `BEFORE UPDATE OF etapa_atual`; um `PATCH {status:'rejeitado'}` rejeita o candidato sem gravar `historico_candidatura` nem passar pelo guardrail `decisao_final` (justificativa≥50 + por_usuario) → auditoria LGPD-02 passa vacuamente. O próprio `UpdateStatusModal` já faz isso hoje.
- **Fix:** trigger `BEFORE UPDATE` (sem `OF`) bloqueando mudança de status para terminal fora de `registrar_decisao`/`submit_candidatura_atomic` (via GUC flag dos DEFINER RPCs); e/ou `WITH CHECK` congelando `status`/`candidato_id`/`vaga_id`/`curriculo_*`.
- **Esforço:** M

### H17 — Reconstruir baseline real e reconciliar o ledger de migrations
- **Subsistema:** data-model
- **Arquivo:** `supabase/migrations/20260419000000_baseline.sql:1` (0 bytes)
- **Impacto:** as 49 migrations não criam as tabelas core nem ~25 legadas M1 → `supabase db reset`/branch/CI falha na 1ª referência a `public.candidatos`; a policy `auth_admin_le_usuarios_rh` (fix do hook de auth) existe SÓ em PROD via execute_sql → rebuild degrada TODO login RH para 'candidato'; version-rows do MCP divergem dos filenames → `db push` falha.
- **Fix:** `supabase db dump --linked` (schema-only c/ policies+grants) como baseline; commitar `auth_admin_le_usuarios_rh` como migration; `supabase migration repair` até `db push` responder 'up to date'.
- **Esforço:** L

### H18 — Cobrir `submit-candidatura` (EF + RPC de knockout) com testes automatizados
- **Subsistema:** tests
- **Arquivo:** `supabase/functions/submit-candidatura/index.ts:238`
- **Impacto:** o único auto-reject sancionado (fronteira RNF-07a) não tem `index.test.ts`; o sweep texto-join `@> to_jsonb(opcao_texto)` só foi verificado por SQL smokes manuais descartados; e2e triple-gated nunca roda em CI; `cadastrar-candidato`/`cost-alerter` idem. Uma mudança no texto-join para o knockout de disparar sem nada vermelho.
- **Fix:** clonar o harness deps-injection de `avaliar-redacao/__tests__` para `submit-candidatura`+`cadastrar-candidato`; commitar os SQL smokes da Phase 8 como pgTAP/script Deno (match→rejeitado, no-match→inscrito, never-auto-reject-por-score).
- **Esforço:** L

### H19 — Sanear a suíte Deno para rodar no modo default (`deno test`)
- **Subsistema:** tests
- **Arquivo:** `supabase/functions/_shared/__tests__/ai-client.test.ts:242`
- **Impacto:** `deno test` (com type-check) falha TS2353 (cast de `loadClient()` sem `timeoutMs` vs teste P21) → 9 testes não executam; `strict-schema.test.ts` (teste Vitest no diretório Deno) explode a corrida (`32 passed | 10 failed`); env-read top-level exige `--allow-env` não documentado. Dev segue o cabeçalho, vê vermelho em código verde, abandona a suíte. **Bloqueia C2.**
- **Fix:** corrigir o cast de `loadClient()` (`timeoutMs?`); mover `strict-schema.test.ts` p/ fora de `_shared/__tests__`; criar `deno.json` com task `test` fixando `--allow-read --allow-env` + glob correto.
- **Esforço:** M

### H20 — Mover os webhooks n8n para server-side com secret (remover URLs hardcoded do bundle)
- **Subsistema:** deps-config
- **Arquivo:** `src/features/vagas/services/candidaturasService.ts:69-83` (+ `explicacaoService.ts:129-131`)
- **Impacto:** fallbacks `https://fernandocosta.app.n8n.cloud/webhook/{nova-candidatura,status-candidatura,revisao-decisao}` no código e confirmados no bundle de PROD; POST sem header de auth → qualquer visitante extrai a URL e forja eventos (notificações falsas a candidatos, flood/DoS da cota n8n). Infra pessoal no caminho de produção.
- **Fix:** disparar via Edge Function/trigger pg_net com shared secret validado no n8n (padrão do `submit-candidatura` EF); remover fallbacks — se env ausente, fail-silent, nunca expor URL.
- **Esforço:** M

---

## 🟡 MEDIUM

### M1 — Não replayar falhas cacheadas em `tryIdempotencyReplay`
- **Subsistema:** ai-ef-resilience · **Arquivo:** `supabase/functions/_shared/ai-client.ts:252-279`
- **Impacto:** lookup por `idempotency_key` sem `success=true` → uma falha transiente (fallback com parse null) vira estado terminal; RH re-clica 'Gerar novamente' e replaya o resultado vazio para sempre (keys estáveis por candidatura). *(1 lente refutou apontando drift de schema em `ai_call_logs` — investigar ambos.)*
- **Fix:** filtrar `.eq('success', true)` no replay OU só gravar `idempotency_key` em rows `success=true`. Verificar drift de colunas de `ai_call_logs` na mesma passada.
- **Esforço:** S

### M2 — Tornar os guardrails de custo (IA-04/RNF-10) efetivos em runtime
- **Subsistema:** ai-ef-resilience · **Arquivo:** `supabase/migrations/20260609000002_prompt_library_rpcs.sql:263-303`
- **Impacto:** 4 furos: `ai_cost_daily` só agrega o dia anterior (~25h de atraso); trigger compara `>200` numa fatia diária (spec é R$200/**mês**/vaga → nunca cruza); `candidate_cost_over_1` é código morto; Vault secrets ausentes → skip mudo; `callAi` sem teto pré-chamada.
- **Fix:** janela 30-dias por vaga; emitir `candidate_cost_over_1` por candidato; `RAISE WARNING` quando secrets ausentes; kill-switch barato em `callAi` (SELECT gasto do dia vs teto hard configurável).
- **Esforço:** M

### M3 — Sanitizar `MAX_ATTEMPTS`/`AI_CALL_TIMEOUT_MS` (guarda de NaN) *(reclassificar: era low)*
> **Nota:** listado como Low pelo levantamento (L1). Ver seção Low.

### M4 — Capturar a policy `auth_admin_le_usuarios_rh` do hook de auth como migration
- **Subsistema:** security-rls-pii · **Arquivo:** `supabase/migrations/20260420000002_unified_auth_role.sql:100-102`
- **Impacto:** hook é SECURITY INVOKER e só há GRANT de tabela (RLS sobrepõe); a policy que faz o login RH funcionar existe só em PROD → rebuild de staging/DR/CI degrada TODO login RH para 'candidato'. (Sobrepõe-se a H17.)
- **Fix:** migration idempotente criando a policy SELECT p/ `supabase_auth_admin` + revisar `candidatos`.
- **Esforço:** S

### M5 — Escopar por vaga as policies base de `candidaturas` (SELECT + UPDATE)
- **Subsistema:** security-rls-pii · **Arquivo:** `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:45-58`
- **Impacto:** `rh_le_candidaturas`/`rh_avanca_etapa` role-only → recrutador não-dono lê toda candidatura + PII do candidato (cpf/email) e pode UPDATE/avançar/rejeitar qualquer uma, contornando os checks das EFs. Mina o scoping das tabelas filhas.
- **Fix:** escopar ambas as policies a `vaga_id IN (SELECT id FROM vagas WHERE created_by=auth.uid())` (admin bypassa), padrão WR-03/04.
- **Esforço:** M

### M6 — Remover a coluna `rubric` da projeção candidate-facing de perguntas SJT
- **Subsistema:** funil-integration · **Arquivo:** `src/features/avaliacao/services/avaliacaoService.ts:136`
- **Impacto:** projeta `rubric` (pesos BARS 25/20/25/15/15 + bandas de corte) para o candidato; RLS row-level não esconde coluna → candidato lê o gabarito parcial no DevTools e otimiza a redação. UI não usa rubric; EF a lê server-side.
- **Fix:** remover `rubric` (e `cargo` se inútil) da projeção; correção completa exige tirar `rubric` do alcance do SELECT do candidato (RPC/coluna privilegiada), pois `?select=rubric` ainda funciona.
- **Esforço:** S

### M7 — Derivar o status dos cards de avaliação das rows do candidato + travar re-submit
- **Subsistema:** funil-integration · **Arquivo:** `src/features/avaliacao/components/AvaliacaoContainer.tsx:255-269`
- **Impacto:** `deriveCards` lê `t.status` de um campo que não existe no jsonb da vaga → card eterno 'Pendente'; combinado com `pontuar_sjt` `ON CONFLICT DO UPDATE`, candidato reabre e ressubmete ilimitadamente em `avaliacao_assincrona`, sobrescrevendo score já visto pelo RH sem trilha.
- **Fix:** status do card a partir de `respostas_avaliacao`/`scores_candidato` (RPC neutra); travar/versionar re-submit no `pontuar_sjt`.
- **Esforço:** M

### M8 — Implementar (ou desabilitar) os handlers de `MeuPerfilPage` (RH)
- **Subsistema:** frontend · **Arquivo:** `src/components/pages/MeuPerfilPage.tsx:38-53`
- **Impacto:** `handleAlterarSenha`/`handleSalvarDados`/`handleAlterarFoto` são `console.log` que simulam sucesso; RH troca senha suspeita de comprometimento, campos limpam, senha antiga continua válida. Dados exibidos hardcoded ('João Silva').
- **Fix:** `supabase.auth.updateUser({ password })` com toasts sonner, ou desabilitar com aviso; remover console.log; ler usuário real.
- **Esforço:** S

### M9 — Resolver os 65 TS2307 de imports versionados (destrava o type-check de `ui/`)
- **Subsistema:** frontend · **Arquivo:** `tsconfig.json` (paths vs `vite.config.ts:69`)
- **Impacto:** aliases versionados (`lucide-react@0.487.0`…) só no Vite, não no tsconfig → 65 TS2307 + ~43 TS7006 desligam o type-check de ~30 arquivos `ui/` e consumidores; é o ruído que deixou os bugs H12/H8 passarem como "baseline aceitável".
- **Fix:** codemod removendo sufixos `@version` dos imports + apagar aliases do Vite (ou espelhar paths no tsconfig); ratchet do baseline após.
- **Esforço:** S

### M10 — Deduplicar `extractEfErrorCode` (assinatura invertida em `entrevistaService`)
- **Subsistema:** frontend · **Arquivo:** `src/features/entrevista/services/entrevistaService.ts:662-676`
- **Impacto:** cópia local com args `(error, data)` invertidos vs o canônico `@/lib/efErrors` `(data, error)` e prioridade pré-WR-03. Landmine: dedup 'óbvio' sem inverter args na linha 637 → sempre `undefined` → branch VALIDATION morre. *(1 lente refutou por não haver bug em runtime hoje — é dívida planejada M4.)*
- **Fix:** deletar a local, importar de `@/lib/efErrors`, ajustar linha 637 p/ `(data, error)`, teste de contrato FunctionsHttpError→VALIDATION.
- **Esforço:** S

### M11 — Preservar histórico de emendas em `registrar_decisao` (UPSERT destrutivo)
- **Subsistema:** data-model · **Arquivo:** `supabase/migrations/20260625100001_decisao_final_phase15.sql:122-143`
- **Impacto:** emenda que não muda etapa (`rejeitado→rejeitado`, `em_espera`) sobrescreve `por_usuario`/`justificativa` anteriores sem trilha; e quando muda etapa, `criterio_texto` grava justificativa STALE. Indefensável em revisão LGPD Art. 20 (a UI até promete falsamente append-only).
- **Fix:** tabela `decisao_final_historico` append-only (ou trigger AFTER UPDATE copiando OLD.*); setar `etapa_justificativa = p_justificativa` antes do UPDATE.
- **Esforço:** M

### M12 — Dropar o índice unique legado sem filtro `deleted_at` em `candidaturas`
- **Subsistema:** data-model · **Arquivo:** `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql:9-11`
- **Impacto:** PROD tem 2º índice unique `(candidato_id, vaga_id)` SEM filtro → reinscrição após soft-delete estoura 23505 mapeado para `DUPLICATE_CANDIDATURA`; candidato bloqueado sem hard-delete manual. Contradiz o contrato da migration.
- **Fix:** migration `DROP INDEX unique_candidato_vaga` mantendo só o parcial; smoke insert→soft-delete→re-insert.
- **Esforço:** S

### M13 — Corrigir a semântica de `historico_candidatura.auto_rejeitado`
- **Subsistema:** data-model · **Arquivo:** `supabase/migrations/20260624000004_avancar_etapa_flag_guard.sql:87-88`
- **Impacto:** `auto_rejeitado = (v_ator IS NULL)` = "escrita do sistema", não "auto-rejeição"; todo sobrevivente do knockout ganha row com `auto_rejeitado=true` → `SELECT count(*) WHERE auto_rejeitado=true` (a query que RF-04/auditoria ANPD prescreve) mistura aprovados com rejeições reais.
- **Fix:** renomear p/ `escrita_sistema` (ou nova coluna) e derivar auto-rejeição real como predicado honesto (`etapa_de=etapa_para='inscricao' AND ator IS NULL AND motivo='knockout_automatico'`); backfill; gravar `true` só no branch de knockout.
- **Esforço:** M

### M14 — Adicionar guard de status da vaga em `upsert_pergunta_opcoes_metadata`
- **Subsistema:** data-model · **Arquivo:** `supabase/migrations/20260607010003_upsert_pergunta_opcoes_metadata_rpc.sql:57`
- **Impacto:** RPC (GRANT authenticated) faz DELETE+re-INSERT sem checar status/ownership → editar opções de vaga ATIVA orfana `opcao_knockout_id` (FK lógica), deixa `qualificacao_etapa1` stale e desalinha o sweep texto-join (knockout para de disparar silenciosamente). *(1 lente marcou UNCERTAIN: a tela que dispara isso ainda não está montada → gap latente.)*
- **Fix:** `RAISE` se vaga `status <> 'rascunho'` (espelhar `publish_vaga`); UPDATE preservando `opcao_id`; FK real `opcao_knockout_id → pergunta_opcao_metadata ON DELETE SET NULL` + texto denormalizado.
- **Esforço:** M

### M15 — Estender scoping horizontal WR-03/WR-04 a `analise_candidato_vaga`, `redacoes_candidato` (+ update)
- **Subsistema:** data-model · **Arquivo:** `supabase/migrations/20260610000001_analise_tables.sql:78-83`
- **Impacto:** duas tabelas de PII ficaram role-only; recrutador não-dono lê análises de CV + redações completas (e `redacao_rh_update` permite editar notas de revisão) de vagas alheias — o vazamento que WR-03/04 declararam fechado. (Sobrepõe-se a H6.)
- **Fix:** migration espelhando WR-04 nas duas policies + `redacao_rh_update`.
- **Esforço:** S

### M16 — Exercitar o body real do client contra o schema nos contract tests
- **Subsistema:** tests · **Arquivo:** `src/features/avaliacao/__tests__/bigfive-contract.test.ts:52`
- **Impacto:** os 4 contract tests replicam schema Node-local **e** constroem o body à mão (`buildClientBody()`) em vez de importar o builder real → os dois lados do boundary mockados de novo (mesma classe do `[[feedback_integration_contract_gap]]` que quebrou o SJT em PROD).
- **Fix:** nos service tests que já mockam `functions.invoke`, capturar o body real passado e assertar `SchemaReplica.safeParse(capturedBody).success` (réplica exportada de módulo compartilhado).
- **Esforço:** M

### M17 — Adicionar testes SQL de invariantes DB-side (RLS/RPCs/RNF-07a) em CI
- **Subsistema:** tests · **Arquivo:** `supabase/migrations/20260608000001_inscricao_knockout.sql:18` (sem `supabase/tests/`)
- **Impacto:** zero pgTAP/teste SQL commitado; garantias mais sensíveis (`pontuar_sjt` nunca escreve `candidaturas`, sweep knockout, `get_opcoes_sjt` answer-key, malha RLS) só verificadas por smokes manuais descartados. Migration M4 pode reabrir SELECT de gabarito ou quebrar RNF-07a com CI verde.
- **Fix:** job CI com `supabase start` + migrations + testes SQL de invariantes (pgTAP ou Deno com `set_config request.jwt.claims`): candidato-DENY nas tabelas de gabarito, `pontuar_sjt` não toca `candidaturas`, knockout só via tag, RPCs 42501 non-owner.
- **Esforço:** L

### M18 — Adicionar smoke e2e determinístico das 4 telas do funil RH (Tier-1 mocked)
- **Subsistema:** tests · **Arquivo:** `.github/workflows/ci.yml:76`
- **Impacto:** ci.yml fixa `E2E_AUTH_TEST_USERS: ''` + URL placeholder → todo e2e do funil RH (triagem→avaliação→entrevista→decisão) é `describe.skip`/gated; o que roda é a11y com sessão mockada + validação de form. Os 3 defeitos P21 e o bug `'active'` vs `'ativo'` estavam todos em fluxos sem e2e.
- **Fix:** estender `mockSession`/`page.route` (padrão de `perfil.spec.ts`/`a11y-session.ts`) p/ smoke das 4 telas RH com respostas rest/v1 mockadas; agendar Tier-2 (auth real) como job noturno.
- **Esforço:** L

### M19 / M20 — Remover credenciais fallback hardcoded dos specs e2e
- **Subsistema:** tests + deps-config *(M-TEST e M-INFRA são o mesmo achado — unificar)*
- **Arquivo:** `e2e/vagas-browse.spec.ts:15-16` (+ 8 arquivos, `.env.test.example:6-7`)
- **Impacto:** `process.env.TEST_USER_PASSWORD || 'teste123'` com email `fernando@beautysmile.com.br` (conta VIVA e ativa em PROD, verificada) em repo público `fercosnt/SistemaRecrutamento` → par credencial↔ambiente commitado. *(1 lente refutou o cenário de contaminação por causa dos gates, mas a credencial exposta se confirma.)*
- **Fix:** remover fallbacks (`test.skip(!process.env.TEST_USER_EMAIL)` já existe); placeholder no `.env.test.example`; **rotacionar/verificar a senha de `fernando@beautysmile.com.br` em PROD** e deletar `e2e.admin` (pendência já anotada).
- **Esforço:** S

### M21 — Trocar as 8 (9) dependências wildcard `"*"` por ranges caret
- **Subsistema:** deps-config · **Arquivo:** `package.json:37-40,42,51,55-56,63`
- **Impacto:** `@tiptap/*`, `clsx`, `motion`, `react-dnd*`, `tailwind-merge` como `"*"` → `npm update`/lock regenerado resolve para latest absoluto (major breaking ou release comprometida injetada no bundle do candidato).
- **Fix:** substituir cada `"*"` pelo caret da versão do lockfile (`^3.10.1`, `^2.1.1`…). Manifest-only.
- **Esforço:** S

### M22 — Wirar o gate de bundle PERF-03 (`assert-chunks.mjs`) em build/CI
- **Subsistema:** deps-config · **Arquivo:** `scripts/assert-chunks.mjs` (não invocado em `ci.yml:69-70`)
- **Impacto:** o gate dos −68% do P19 só roda manualmente; um `import jsPDF` estático numa página eager reverte o bundle a ~2.7MB com build+CI verde (Lighthouse é warn-only p/ performance).
- **Fix:** `"build": "vite build && node scripts/assert-chunks.mjs"` ou step no ci.yml.
- **Esforço:** S

### M23 — Reapertar o baseline do gate tsc no CI (290 → 257)
- **Subsistema:** deps-config · **Arquivo:** `.github/workflows/ci.yml:49-57`
- **Impacto:** gate falha só se `>290`, mas o real é 257 → folga para 33 novos type errors entrarem com CI verde (ex.: coluna renomeada em `database.types.ts`).
- **Fix:** baixar baseline p/ 257 (if + mensagens) e reapertar a cada fase que reduzir o count.
- **Esforço:** S

### M24 — Patchear vulns do dev-tooling (vitest UI RCE, happy-dom, vite pinado)
- **Subsistema:** deps-config · **Arquivo:** `package.json:83,86,94-95`
- **Impacto:** vitest/@vitest/ui CRITICAL (arbitrary file read+exec via UI server), happy-dom HIGH, vite `6.3.5` pinado exato com 7 advisories (arbitrary file read via WebSocket do dev server). `npm run dev`/`test:ui` na máquina que guarda `.env.local` com SERVICE_ROLE_KEY de PROD.
- **Fix:** `npm audit fix` para vitest/@vitest/ui/happy-dom; trocar `"vite": "6.3.5"` por `"^6.3.5"` e atualizar.
- **Esforço:** S

### M25 — Declarar `verify_jwt` por EF em `supabase/config.toml` + commitar `deno.lock`
> **Nota:** listado como Low pelo levantamento (ver L8). Mantido em Low.

---

## ⚪ LOW

### L1 — Guardar `Number(env)` contra NaN em `MAX_ATTEMPTS`/`AI_CALL_TIMEOUT_MS`
- **Subsistema:** ai-ef-resilience · **Arquivo:** `supabase/functions/_shared/ai-client.ts:70,78`
- **Impacto:** env malformado (`'60s'`, `'3 tentativas'`) → NaN → loop Anthropic roda 0×, toda avaliação silenciosamente via gpt-4o-mini; timeout NaN ao SDK. Falha global e sem warn no próximo redeploy.
- **Fix:** `const n = Number(env); const X = Number.isFinite(n) && n >= 1 ? n : default;` + `console.warn` ao descartar.
- **Esforço:** S

### L2 — Adicionar caminho de recuperação para a devolutiva Big Five
- **Subsistema:** funil-integration · **Arquivo:** `supabase/functions/submit-bigfive-final/index.ts:227-247`
- **Impacto:** fan-out best-effort abandona após 10s confiando num "retry pelo n8n" **que não existe no repo** (nem workflow, nem cron, nem botão); se a EF filha falhar de verdade (overload Anthropic), a devolutiva fica vazia para sempre (compromisso LGPD/RF-19a).
- **Fix:** botão RH 'Regerar devolutiva' (EF é idempotente) ou pg_cron re-invocando scores sem row após N min; corrigir os comentários que citam n8n inexistente.
- **Esforço:** M

### L3 — Rotear sessão RH expirada para o login RH preservando `?redirect`
- **Subsistema:** frontend · **Arquivo:** `src/components/RoleGuard.tsx:129-131`
- **Impacto:** rota `/rh/*` sem sessão cai no login de CANDIDATO; `LoginRHPage:132` descarta o `?redirect` e navega fixo p/ dashboard → deep link RH perdido ('o link do sistema não funciona').
- **Fix:** escolher login por prefixo (`pathname.startsWith('/rh')`) e consumir `searchParams.get('redirect')` no `LoginRHPage` com o `resolveRedirect` anti-open-redirect já existente.
- **Esforço:** S

### L4 — Remover `console.log` operacional das páginas RH de produção
- **Subsistema:** frontend · **Arquivo:** `src/components/KanbanBoard.tsx:334-357`
- **Impacto:** loga movimentação de candidato (id/etapas/status), auto-avanço (`candidaturasService.ts:874`) e email do reset (`ConfiguracoesPage.tsx:491`) no console de PROD; viola Pitfall 7; risco de screen-share e precedente de logar PII.
- **Fix:** remover/trocar por logger no-op gateado por `import.meta.env.DEV`; adicionar `no-console` ao lint quando houver ESLint.
- **Esforço:** S

### L5 — Expurgar o backup PII permanente `backup_m2.candidaturas_pre_funil`
- **Subsistema:** data-model · **Arquivo:** `supabase/migrations/20260607000002_etapa_processo_v2_cutover.sql:48-50`
- **Impacto:** cópia integral de `candidaturas` (curriculo_url, feedback, análises IA) nunca limpa; erasure LGPD em `public` não alcança a cópia → eliminação estruturalmente incompleta; `data_deletion_log` não contempla o schema.
- **Fix:** `DROP TABLE backup_m2.candidaturas_pre_funil; DROP SCHEMA backup_m2;` (janela de rollback expirada), ou documentar retenção + incluir no fluxo de erasure.
- **Esforço:** S

### L6 — Rodar `sync-prompts.test.ts` no workflow que executa o pipeline
- **Subsistema:** tests · **Arquivo:** `vite.config.ts:21` (+ `prompts-sync.yml` só `deno run`)
- **Impacto:** o único teste do pipeline que escreve em `prompt_versions` de PROD com service_role (frontmatter RF-PL-01, colisão semver↔hash RF-PL-11) não roda em runner algum; hoje já falha type-check por bit-rot.
- **Fix:** step `deno test --no-check --allow-read scripts/` no `prompts-sync.yml` antes do `deno run` (ou incluir no job C2).
- **Esforço:** S

### L7 — Desinstalar deps de produção nunca importadas (`motion`, `@supabase/auth-helpers-react`)
- **Subsistema:** deps-config · **Arquivo:** `package.json:34,51`
- **Impacto:** zero imports em `src/`; `auth-helpers-react` deprecated pela Supabase; `motion` ainda com `"*"` → superfície supply-chain/audit gratuita.
- **Fix:** `npm uninstall motion @supabase/auth-helpers-react`; conferir devDeps `openai`/`@anthropic-ai/sdk`.
- **Esforço:** S

### L8 — Declarar `verify_jwt` por EF em `supabase/config.toml` + commitar `deno.lock`
- **Subsistema:** deps-config · **Arquivo:** `supabase/` (sem `config.toml`; `.gitignore:91` ignora `deno.lock`)
- **Impacto:** a divisão de deploy das 12 EFs (`--no-verify-jwt` + Bearer vs JWT-ON) vive só em flags de CLI/memória → redeploy com flag errado abre EF sem detecção no review (drift já ocorreu — Phase 1 UAT, `cadastrar-candidato`); agrava H5.
- **Fix:** `supabase/config.toml` com `[functions.<nome>] verify_jwt` explícito p/ as 12 EFs; remover `deno.lock` do `.gitignore` e commitá-lo.
- **Esforço:** S

### L9 — Type-checkar `e2e/`, `scripts/` e `playwright.config.ts`
- **Subsistema:** deps-config · **Arquivo:** `tsconfig.json:29` (`"include": ["src"]`)
- **Impacto:** specs Playwright, scripts e config nunca passam por tsc (Playwright transpila com esbuild sem checagem) → erro de tipo só aparece como falha de runtime ou falso verde. *(1 lente refutou o cenário específico — hoje e2e não importa `database.types.ts`; é hardening preventivo.)*
- **Fix:** `tsconfig.e2e.json` (extends raiz, include `e2e/`) encadeado no lint; `scripts/` (Deno) precisa de `deno check` separado.
- **Esforço:** S

---

## Quick wins (esforço S, impacto alto)

| # | Requirement | Subsistema | Sev | Por que agora |
|---|---|---|---|---|
| C1 | Proteger `gabarito_idx` cognitivo | data-model | 🔴 | 1 policy/RPC; fecha vazamento crítico de answer-key |
| H1 | Restaurar prompt library (5 call_types) | ai-ef | 🟠 | Fix de 1 mapa + 5 redeploys; devolve rubrics/guardas de viés/auditoria a 5/7 EFs |
| H2 | Circuit breaker singleton | ai-ef | 🟠 | 1 linha; reativa o fast-fail IA-04 |
| H3 | `isRetryable` reconhece timeout | ai-ef | 🟠 | 1 regex; para de rebaixar avaliações p/ gpt-4o-mini |
| H4 | `timeoutMs` em avaliar-transcricao | ai-ef | 🟠 | 1 linha; evita 500 recorrente idêntico ao bug P21 |
| H5 | Guard de caller em gerar-devolutiva | sec | 🟠 | ~10 linhas; fecha IDOR/PII cross-candidato |
| M6 | Remover `rubric` da projeção candidato | funil | 🟡 | 1 select; fecha gabarito BARS no DevTools |
| M9 | Codemod TS2307 imports versionados | fe | 🟡 | Reativa type-check de `ui/` — destrava detecção dos bugs H8/H12 |
| M12 | Drop índice unique legado | data | 🟡 | 1 migration; desbloqueia reinscrição |
| M21 | Wildcards `"*"` → caret | infra | 🟡 | Manifest-only; fecha supply-chain sem tocar node_modules |
| M23 | Reapertar baseline tsc 290→257 | infra | 🟡 | 2 edits; fecha a folga de 33 erros |
| M24 | `npm audit fix` dev-tooling | infra | 🟡 | Fecha RCE do vitest UI na máquina com SERVICE_ROLE_KEY |
| L1 | Guarda de NaN em env | ai-ef | ⚪ | 2 linhas; evita rebaixamento global silencioso de modelo |
| L4 | Remover `console.log` PROD | fe | ⚪ | Higiene + LGPD; barato |

---

## Dívida conhecida carregada do v3.0 (backlog não-formal)

Estes 3 itens já eram tech-debt reconhecido no ship do v3.0 (`[[project_m3_autonomous_progress]]`) e devem ser **formalizados como requirements M4** — vários achados desta auditoria os agravam ou dependem deles:

1. **FOUND-08 — tail do baseline tsc.** Agora quantificado: baseline real de 257 erros, dos quais ~65 TS2307 (M9) são puro ruído de aliases versionados que mascarou os bugs H8/H12. Fechar M9 + M23 converte esta dívida em gate funcional.
2. **CC0-01 — seed cognitivo.** Bloqueia C1 na prática (tabela `cognitivo_itens` vazia hoje → vazamento de `gabarito_idx` latente) e H10 (prova inalcançável). Ao popular o seed, **C1 precisa já estar corrigido** senão o answer-key vaza no primeiro item.
3. **Dedup `extractEfErrorCode` → `@/lib/efErrors`.** É exatamente M10; a auditoria confirma que a duplicata em `entrevistaService` tem assinatura invertida + prioridade pré-WR-03 → o dedup "óbvio" é uma landmine se feito sem inverter os args. Fazer com o teste de contrato junto.

---

# Apêndice A — Evidência detalhada dos 56 achados confirmados

> Cada achado sobreviveu a ≥2 de 3 lentes adversariais Fable. `votos`: C=confirmado · R=refutado · U=incerto (ordem: reprodutibilidade · evidência · impacto).


## 🔴 CRITICAL

### A1. Answer key do teste cognitivo (gabarito_idx) legível por qualquer usuário autenticado via PostgREST

`Modelo de dados` · esforço **S** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql:161-166`

**Defeito:** A policy `auth_le_cognitivo_itens FOR SELECT USING (auth.role()='authenticated')` dá SELECT de LINHA INTEIRA em cognitivo_itens a todo autenticado — incluindo a coluna gabarito_idx. O comentário do próprio arquivo (linhas 100-116) diz que a proteção é 'READ-layer column-omission (allowlist do service 14-06)', mas allowlist no service só controla o que o APP pede; o PostgREST aceita `?select=id,gabarito_idx` direto do client com o JWT do candidato. Não existe REVOKE de coluna nem RPC intermediária (verificado por grep em todas as 49 migrations). Isso contradiz o padrão correto já estabelecido no MESMO repo: perguntas_opcao_sjt (20260611000002) e bigfive_itens (20260612000001) negam SELECT ao candidato e expõem via SECURITY DEFINER RPC que projeta só colunas seguras. A regra aprendida do projeto ([[reference_select_star_leaks_pii]]: 'RLS é row-level only, NÃO esconde colunas') foi aplicada em 5 tabelas e esquecida exatamente nesta.

**Cenário de falha:** Candidato em etapa entrevista_online abre o DevTools, chama `GET /rest/v1/cognitivo_itens?select=id,gabarito_idx` com seu próprio access token → recebe o gabarito completo da prova de raciocínio → submete pontuar_cognitivo com 100% de acerto → banda 'bem_acima' registrada em scores_candidato e exibida ao RH como sinal contextual de contratação.

**Fix proposto:** Replicar o padrão SJT: DROP POLICY auth_le_cognitivo_itens; criar RPC SECURITY DEFINER get_cognitivo_itens() que projeta apenas id/secao/enunciado/alternativas/ordem (nunca gabarito_idx); ou, no mínimo, `REVOKE SELECT (gabarito_idx) ON public.cognitivo_itens FROM authenticated, anon` (column-level privilege, que o PostgREST respeita).

### A2. Corpus inteiro de testes Deno das EFs (~126 testes) não roda em nenhum CI — inclusive as regressões dos 3 bugs de PROD do P21

`Testes` · esforço **S** · confiança high · votos `CCC`  
**Local:** `.github/workflows/ci.yml:57`

**Defeito:** O ci.yml roda apenas `npm run test:run` (Vitest) + Playwright chromium. O vite.config.ts (linhas 19-43) exclui explicitamente TODOS os testes Deno das Edge Functions ('rodam sob deno test, não Vitest'), mas não existe nenhum step `deno test` em ci.yml nem em prompts-sync.yml (verificado por grep — o único uso de deno é `deno run sync-prompts.ts`). Contei ~126 testes Deno executáveis (32 em _shared/__tests__, 61 em consolidar-decisao-final/avaliar-redacao/gerar-devolutiva/submit-bigfive-final/avaliar-redacao-cultural/bigfive-scoring, 12 em analise+comparativo, 12 em _local, 9 em ai-client). Entre eles estão exatamente as regressões dos defeitos reais de PROD: gerar-devolutiva-bigfive/__tests__/index.test.ts:197-205 pina o bug 23503 do candidato_id/auth-uid, e ai-client.test.ts:239 pina o override timeoutMs do P21 (o 500 do gerar-guia). Essa camada de EF foi a origem de TODOS os defeitos encontrados nos UATs live — e é a única sem gate automatizado.

**Cenário de falha:** Alguém refatora _shared/ai-client.ts e remove/renomeia o parâmetro timeoutMs (ou reintroduz a escrita de candidatos.id na devolutiva). `npm run test:run` fica 692/692 verde, o CI passa, a EF é redeployada — e o gerar-guia volta a 500ar em toda geração em PROD, sem nenhum teste vermelho em lugar algum.

**Fix proposto:** Adicionar um job `deno-test` no ci.yml (denoland/setup-deno@v2 já é usado em prompts-sync.yml) rodando `deno test --allow-read --allow-env` sobre supabase/functions/, após corrigir os dois bloqueadores do achado #2. Alternativa mínima: um script npm `test:ef` documentado + step no CI.


## 🟠 HIGH

### A3. SCHEMA_VERSIONS órfão: 5 dos 7 call_types de IA rodam em PROD com prompt stub de 1 linha (prompt library silenciosamente morta)

`EFs de IA` · esforço **S** · confiança high · votos `CCC`  
**Local:** `supabase/functions/_shared/prompt-loader.ts:33-42, 125-130`

**Defeito:** SCHEMA_VERSIONS só conhece 8 chaves antigas (cv_summary, cv_job_match, comparative_ranking, sjt_evaluation, interview_questions, interview_summary, reference_check, final_recommendation). Mas os EFs chamam loadPrompt com: work_sample_sjt (avaliar-redacao/index.ts:236), culture_fit_essay (avaliar-redacao-cultural:228), transcript_analysis (avaliar-transcricao-entrevista:194), interview_guide (gerar-guia-entrevista:229) e bigfive_devolutiva (gerar-devolutiva-bigfive:565). Para essas 5 chaves, assertSchemaVersionCompat compara known=undefined !== '1.0.0' (os templates em docs/conhecimento/prompts/templates/04-08 declaram schema_version_required: "1.0.0") e SEMPRE lança SchemaVersionMismatchError. Cada EF captura no catch e cai num ResolvedPrompt stub com system_template de uma linha (ex.: 'Analise a transcrição de entrevista (transcript_analysis).', prompt_version '0.0.0'). Resultado: os prompts engenheirados do DB (rubrics BARS, guardas de viés, linguagem LGPD, temperature/max_tokens/model tunados), o versionamento IA-01 e o roteamento canary estão mortos para 5/7 call_types — e o ai_call_logs registra prompt_version '0.0.0' e prompt_hash '' (integridade de auditoria IA-02 quebrada). A memória do projeto já anotava a chave órfã ('call_type é work_sample_sjt NÃO sjt_evaluation') sem corrigir o mapa.

**Cenário de falha:** RH clica 'analisar transcrição' → loadPrompt('transcript_analysis') encontra a row ativa no DB, mas assertSchemaVersionCompat lança (known=undefined) → catch → Sonnet avalia o candidato com o system prompt genérico de 12 palavras, sem rubric, sem guarda de viés, sem formato BARS → competências/citações de qualidade degradada persistidas em entrevista_analises como se fossem a avaliação oficial; ai_call_logs marca prompt_version 0.0.0, tornando a auditoria LGPD irrastreável à versão real do prompt.

**Fix proposto:** Adicionar as 5 chaves ausentes a SCHEMA_VERSIONS (work_sample_sjt, culture_fit_essay, transcript_analysis, interview_guide, bigfive_devolutiva → '1.0.0'), remover/renomear as órfãs (sjt_evaluation, interview_questions), e nos EFs restringir o catch a PromptNotConfiguredError — um SchemaVersionMismatchError deve falhar alto (500), não degradar silenciosamente para stub. Adicionar teste que varre os call_types usados nos EFs contra o mapa. Redeployar TODAS as EFs de IA (bundle freeze de _shared).

### A4. Circuit breaker (IA-04) é código morto: instância nova por chamada e THRESHOLD=5 > MAX_ATTEMPTS=3 — nunca abre

`EFs de IA` · esforço **S** · confiança high · votos `CCC`  
**Local:** `supabase/functions/_shared/ai-client.ts:300`

**Defeito:** callAi usa `deps.breaker ?? new CircuitBreaker()` e NENHUM consumidor passa `breaker` (grep em supabase/functions/*/index.ts: zero ocorrências). Cada invocação de callAi cria um disjuntor zerado; dentro de uma única chamada, recordFailure roda no máximo MAX_ATTEMPTS=3 vezes (ai-client.ts:70), abaixo do THRESHOLD=5 (circuit-breaker.ts:27). Logo openedAt nunca é setado, canRequest() nunca retorna false e o caminho OPEN→fallback OpenAI rápido (ai-client.ts:353-359) é inalcançável. O breaker deveria ser por-isolate (comentário do próprio módulo circuit-breaker.ts:6-10), mas o wiring o tornou por-request.

**Cenário de falha:** Anthropic entra em outage total (500s não-retryable ou 529s). Cada request de triagem/avaliação continua pagando a escada completa: até 3 tentativas × 25s de timeout + backoff (~81s) antes de cair no fallback — para TODOS os candidatos, durante toda a duração do outage. O fast-fail que justificou o IA-04 nunca engaja; EFs com 2 passadas (gerar-guia com reprompt a 60s) chegam perto do teto de request do Edge Runtime e devolvem 500 ao RH.

**Fix proposto:** Criar um singleton module-level em ai-client.ts (`const sharedBreaker = new CircuitBreaker()`) usado como default em vez de `new CircuitBreaker()` por chamada — assim o estado sobrevive entre requests do mesmo isolate sem mudar nenhum consumidor. Alternativamente exportar e injetar explicitamente nos EFs. Adicionar teste que simula 5 falhas em callAi consecutivos e verifica canRequest()===false.

### A5. isRetryable nunca casa o erro de timeout do SDK ('Request timed out.') — retry em timeout documentado no RESIL-01 não existe

`EFs de IA` · esforço **S** · confiança high · votos `CCC`  
**Local:** `supabase/functions/_shared/ai-client.ts:234-239`

**Defeito:** O comentário em ai-client.ts:378-382 afirma: 'O timeout lanca APIConnectionTimeoutError cuja mensagem casa /timeout/i em isRetryable'. Falso: verificado no cache Deno local (~/Library/Caches/deno/npm/.../@anthropic-ai/sdk/0.102.0/core/error.mjs:81), a mensagem é 'Request timed out.' — a regex /529|overloaded|timeout|503|429/i NÃO casa 'timed out' (com espaço), e APIConnectionTimeoutError não tem `status`. Resultado: qualquer timeout de 25s/60s é tratado como fatal na primeira tentativa (break no loop, ai-client.ts:427-431) e o fluxo pula direto para o fallback gpt-4o-mini — um modelo muito mais fraco avaliando candidatos — sem nenhuma segunda tentativa no primário.

**Cenário de falha:** Anthropic responde lenta (transiente de 30s, como os hangs de 38-102s já observados live). callAi corta em 25s, isRetryable('Request timed out.')=false, zero retry → avaliar-redacao-cultural pontua a redação do candidato com gpt-4o-mini em vez de Sonnet, com error_code anthropic_retries_exhausted enganoso ('exhausted' após 1 tentativa). Em escala, todo pico de latência do provedor troca silenciosamente o modelo avaliador do funil.

**Fix proposto:** Adicionar `timed\s*out` à regex OU checar `err instanceof APIConnectionTimeoutError` / `err.name === 'APIConnectionTimeoutError'` (cobre também o SDK OpenAI, mesma mensagem). Atenção ao orçamento: com retry de timeout ativo, gerar-guia (60s × 3 + reprompt) estoura o teto do EF — limitar retries de timeout a 1 ou reduzir MAX_ATTEMPTS quando timeoutMs > 25s.

### A6. avaliar-transcricao-entrevista sem override timeoutMs: mesmo perfil (Sonnet, 4000 tokens, input longo) que fez gerar-guia 500ar em TODA geração antes do fix P21

`EFs de IA` · esforço **S** · confiança high · votos `CCC`  
**Local:** `supabase/functions/avaliar-transcricao-entrevista/index.ts:208-227`

**Defeito:** O fix P21 (RESIL-01) subiu o teto de gerar-guia-entrevista para 60s (gerar-guia-entrevista/index.ts:274) porque 'a geração structured-output ~4000 tokens excede legitimamente o teto global de 25s e estava estourando timeout → 500 em TODA geração em PROD'. avaliar-transcricao-entrevista tem perfil de latência IGUAL ou pior — template transcript_analysis com max_tokens: 4000 (docs/.../05-transcript-analysis.md:10) e input = transcrição COMPLETA da entrevista — mas chama callAi sem timeoutMs, herdando os 25s globais. avaliar-redacao-cultural (max_tokens 2500-3000) tem o mesmo risco em menor grau. Combinado com o achado da regex ('timed out' não-retryable), o caminho real é: 25s timeout → fallback gpt-4o-mini também com 25s gerando 4000 tokens → provável segundo timeout → exceção → parsed null → row pendente_humano.

**Cenário de falha:** RH cola a transcrição de uma entrevista de 45 min e clica analisar → chamada Anthropic corta em 25s → fallback OpenAI corta em 25s → throw '[fallback] anthropic... || openai...' → 500 ao RH em toda tentativa, com custo de tokens de input pago 2× por clique e nenhuma análise persistida — exatamente o sintoma do bug de gerar-guia que o P21 corrigiu, agora na EF vizinha.

**Fix proposto:** Passar timeoutMs: 60_000 no callAi de avaliar-transcricao-entrevista (e avaliar em avaliar-redacao-cultural/avaliar-redacao com medições reais de PROD via ai_call_logs.latency_ms). Considerar tornar o teto função do max_tokens do prompt resolvido em vez de constantes por call-site.

### A7. Candidato lê o veredito da IA da própria redação (score, cor, red_flag ético, notas do revisor) e candidatura_ids de terceiros via referencia_match

`Modelo de dados` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260623100003_redacoes_candidato.sql:107-115`

**Defeito:** A policy `redacao_candidato_select` dá ao candidato SELECT da LINHA INTEIRA da própria redação. A linha carrega analise_ia, scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico, flags, scores_humanos, notas_revisor, decisao_revisor E referencia_match (uuid[] de candidaturas de OUTROS candidatos com hash de plágio coincidente). O header do arquivo admite que 'RLS is row-level only; column secrecy is the allowlist's job' — mas a allowlist vive no service TS do frontend e não vincula o PostgREST. Nota: mesmo padrão furado em menor grau em perguntas (20260611000002:69-73), onde `cand_le_perguntas_ativas` expõe a coluna rubric jsonb com os pesos por dimensão do caso aberto SJT.

**Cenário de falha:** Candidato chama `GET /rest/v1/redacoes_candidato?select=score_ponderado_0_100,classificacao_cor,red_flag_etico,notas_revisor,decisao_revisor,referencia_match` com seu token → vê que foi marcado 'vermelho' com red_flag ético e a nota interna do revisor (vazamento de deliberação interna, risco trabalhista/LGPD), além de UUIDs de candidaturas alheias suspeitas de plágio (dado pessoal de terceiro).

**Fix proposto:** Trocar a policy own-row por uma RPC SECURITY DEFINER que retorne só o status neutro (submetida_em, status básico), ou aplicar REVOKE por coluna (`REVOKE SELECT (analise_ia, scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico, flags, referencia_match, scores_humanos, notas_revisor, decisao_revisor) ON redacoes_candidato FROM authenticated`) mantendo a policy para as colunas restantes.

### A8. pontuar_sjt é manipulável: sem deduplicação de respostas, denominador só sobre perguntas respondidas e re-submit ilimitado

`Modelo de dados` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql:84-110`

**Defeito:** O RPC (GRANT authenticated, chamável direto pelo candidato) aceita p_respostas arbitrário: (1) o CTE `marked` não deduplica — o mesmo {pergunta_id, opcao_id} enviado N vezes soma o peso N vezes no numerador, enquanto `maxes` agrupa por pergunta (conta 1x no denominador) → score > 100% é possível; (2) `maxes` só inclui perguntas presentes em `marked` → responder um subconjunto (ou 1 única pergunta) encolhe o denominador e o percentual sai inflado sem responder a bateria toda; (3) não valida que as perguntas pertencem ao cargo/vaga da candidatura — o candidato pode responder itens de outra bateria; (4) o ON CONFLICT DO UPDATE permite re-submeter ilimitadamente enquanto estiver na etapa. O claim 'server-authoritative' vale para os pesos, mas não para a completude/integridade da submissão.

**Cenário de falha:** Candidato chama supabase.rpc('pontuar_sjt', {p_candidatura_id, p_respostas: [{q1,optA},{q1,optA},{q1,optA}]}) — ou só as 2 perguntas em que se sente seguro das 10 da bateria — → scores_candidato registra ex.: 12/4 (300%) ou 8/8 (100%) com status 'sucesso', e o RH vê um score de work-sample perfeito baseado em fração da prova.

**Fix proposto:** No RPC: deduplicar por pergunta_id (rejeitar duplicatas com RAISE), computar o denominador sobre TODAS as perguntas ativas do cargo da vaga (não só as respondidas), validar pergunta∈bateria da vaga, e gravar em metadata o nº de perguntas esperadas vs respondidas; opcionalmente travar re-submit quando já existe row com status != 'falhou'.

### A9. RH pode rejeitar candidato via UPDATE direto de candidaturas.status sem auditoria, justificativa ou decisao_final

`Modelo de dados` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:54-58`

**Defeito:** A policy `rh_avanca_etapa FOR UPDATE` não restringe colunas (RLS não pode) e o trigger de auditoria dispara apenas `BEFORE UPDATE OF etapa_atual` (20260607000005:96-99 / 20260624000004:104). Um UPDATE que altere apenas `status='rejeitado'` (ou feedback_rejeicao, motivo_rejeicao, curriculo_url, candidato_id, vaga_id...) passa pela policy, NÃO dispara o trigger, NÃO grava historico_candidatura e NÃO passa pelo guardrail decisao_final (justificativa >=50 chars + por_usuario NOT NULL, 20260607000003). O dashboard do candidato deriva o badge/estado de status_candidatura (CR-01 Phase 8), então o candidato vê 'Rejeitado' sem que exista qualquer registro auditável de quem decidiu ou por quê — corrói exatamente a garantia LGPD-02/RNF-07a que o schema promete tornar 'estruturalmente inrepresentável'.

**Cenário de falha:** Um usuário rh (ou sessão RH comprometida) executa `PATCH /rest/v1/candidaturas?id=eq.X {"status":"rejeitado","feedback_rejeicao":"..."}` → candidato rejeitado de fato na UI, zero linhas em historico_candidatura e decisao_final; auditoria LGPD-02 (`count(*) WHERE por_usuario IS NULL = 0`) continua passando porque a rejeição nem entrou na tabela auditada.

**Fix proposto:** Adicionar um BEFORE UPDATE trigger (sem cláusula OF, ou OF status) em candidaturas que bloqueie mudança de status para 'rejeitado'/'aprovado' fora dos caminhos sancionados (registrar_decisao / submit_candidatura_atomic — detectável por flag GUC setada pelos DEFINER RPCs) e/ou estreitar a policy rh_avanca_etapa com WITH CHECK que congele colunas sensíveis (status, candidato_id, vaga_id, curriculo_*) comparando com a linha antiga via trigger.

### A10. Baseline vazio + objetos só-em-PROD: as 49 migrations não reconstroem o banco e o ledger de versões está divergente

`Modelo de dados` · esforço **L** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260419000000_baseline.sql:1`

**Defeito:** O baseline tem 0 bytes. Nenhuma migration cria as tabelas core (candidatos, candidaturas, vagas, perguntas_formulario, respostas_formulario, usuarios_rh) nem ~25 tabelas legadas M1 que o database.types.ts prova existirem em PROD (autorizacoes, avaliacoes_rh, scores_raven, respostas_bigfive, sessoes_ativas, logs_acesso, templates_email, webhooks_config...). Além disso há drift confirmado e não-reconciliado: (a) a policy `auth_admin_le_usuarios_rh` + fix do hook de auth existem SÓ em PROD (aplicadas via execute_sql, sem arquivo — apenas os GRANTs de 20260420000002:101-102 estão no repo); (b) migrations das Phases 10-15 aplicadas via MCP apply_migration gravaram version-rows por timestamp que não batem com os filenames → `supabase db push` falha com 'migration versions not found' (reconcile foi diferido para a 'Phase 16' e nunca executado); (c) o RLS-state das tabelas core/legadas é inauditável a partir do repo.

**Cenário de falha:** Qualquer tentativa de criar staging/branch/local (`supabase db reset`, `supabase branches`, CI com Postgres efêmero) produz um banco sem as tabelas core → todas as 48 migrations seguintes falham na primeira referência a public.candidatos; mesmo que se recupere um dump, o login RH quebra silenciosamente (role vira 'candidato' no JWT) porque a policy do hook não está em nenhuma migration — o incidente já documentado em reference_auth_hook_rls_gap se repete por construção.

**Fix proposto:** Gerar o baseline real com `supabase db dump --linked -f supabase/migrations/20260419000000_baseline.sql` (schema-only, incluindo policies e grants de PROD), commitar a policy auth_admin_le_usuarios_rh como migration, e rodar `supabase migration repair` para alinhar os version-rows do MCP com os filenames até `db push` responder 'up to date'.

### A11. URLs de webhook n8n sem autenticação hardcoded no código e expostas no bundle público

`Deps/config` · esforço **M** · confiança high · votos `CCC`  
**Local:** `src/features/vagas/services/candidaturasService.ts:69-83 (também src/features/explicacao/services/explicacaoService.ts:129-131)`

**Defeito:** Fallbacks hardcoded `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura`, `/status-candidatura` e `/revisao-decisao` estão no código-fonte e confirmados dentro do bundle de produção (build/assets/index-BMDL8vSK.js contém as URLs de status-candidatura e revisao-decisao). O POST não envia nenhum header de autenticação (explicacaoService.ts:303-309: só Content-Type + body JSON com candidatura_id). Além do risco, é infra pessoal (`fernandocosta.app.n8n.cloud`) no caminho de produção do produto.

**Cenário de falha:** Qualquer visitante abre o DevTools/bundle, copia a URL do webhook e faz `curl -X POST .../webhook/status-candidatura` com payload forjado (ex.: evento de mudança de status com candidatura_id chutado/enumerado) → o workflow n8n downstream dispara e-mails/atualizações falsas para candidatos reais, ou é usado para flood (n8n cloud tem cota; DoS do fluxo de notificação legítimo).

**Fix proposto:** Mover o disparo desses webhooks para Edge Functions/trigger pg_net server-side (padrão já existente no submit-candidatura EF) com secret compartilhado no header validado no n8n; remover os fallbacks hardcoded do client — se a env var não estiver setada, não disparar (fail-silent) em vez de expor a URL.

### A12. RH Kanban e UpdateStatusModal operam sobre enum de etapas M1 que não existe mais no DB — avanço de etapa quebra e pode gravar 'rejeitado' em candidato aprovado

`Frontend` · esforço **M** · confiança high · votos `CCC`  
**Local:** `src/components/KanbanBoard.tsx:44-57, 284-305, 340-360`

**Defeito:** A página LIVE /rh/candidatos (linkada no RHSidebar e no DashboardRHPage:309) usa o enum legado EtapaProcesso ('triagem','bigfive','disc','raven','cultura','avaliacao_final'... — vagasTypes.ts:200-210), enquanto o enum real do DB etapa_processo é ('inscricao','triagem','avaliacao_assincrona','entrevista_online','entrevista_presencial','decisao_final','aprovado','rejeitado') — database.types.ts:4934-4943. Consequências: (a) KANBAN_COLUMNS tem 4 colunas fantasma (bigfive/disc/raven/cultura) e NENHUMA coluna para inscricao/avaliacao_assincrona/decisao_final — todo candidato nessas etapas M2 cai no fallback e é exibido na coluna 'Triagem' (KanbanBoard.tsx:297-305), dando ao RH uma visão errada do pipeline; (b) arrastar um card para as colunas fantasma faz updateCandidaturaStatus gravar etapa_atual='bigfive' etc. → Postgres 22P02 invalid enum → toast 'Erro ao atualizar status'; (c) o auto-avanço em candidaturasService.ts:867 usa getProximaEtapa sobre a escada legada ETAPAS_SEQUENCIA (vagasTypes.ts:670-680), cujo penúltimo item é 'aprovado' e o último é 'rejeitado' — getProximaEtapa('aprovado') retorna 'rejeitado', e AMBOS são valores válidos do enum do DB, então o UPDATE passa na validação de tipo. O próprio triagemService.ts:299-301 documenta esse schema-drift como conhecido, mas a página legada continua roteada e linkada. O caminho correto M2 (updateCandidaturaEtapa via trigger avancar_etapa) existe em paralelo em triagemService.ts:352.

**Cenário de falha:** RH abre /rh/candidatos, vê candidato em 'avaliacao_assincrona' listado na coluna 'Triagem'; via UpdateStatusModal escolhe 'Aprovado - Próxima Etapa' num candidato em etapa 'triagem' → getProximaEtapa devolve 'bigfive' → UPDATE falha com 22P02 e o RH não consegue avançar ninguém por essa tela. Pior: num candidato cuja etapa_atual='aprovado', a mesma ação calcula próxima etapa 'rejeitado' e envia UPDATE etapa_atual='rejeitado' + status='aguardando_resposta' — se o trigger avancar_etapa não bloquear a transição terminal, o candidato aprovado passa a aparecer como Rejeitado no dashboard dele.

**Fix proposto:** Curto prazo: remover/redirecionar a view Kanban e o UpdateStatusModal de CandidatosRHPage para o fluxo M2 (hub /rh/candidatos/:id + updateCandidaturaEtapa/ETAPA_M2_LABELS de triagemService). Médio: deletar EtapaProcesso legado, ETAPAS_SEQUENCIA, getProximaEtapa e ETAPA_TO_KANBAN de vagasTypes.ts e tipar candidaturas.etapa_atual com Database['public']['Enums']['etapa_processo'].

### A13. Editar Vaga hidrata o formulário de 8 colunas inexistentes e NUNCA persiste os campos de conteúdo — edição silenciosamente descartada

`Frontend` · esforço **M** · confiança high · votos `CCC`  
**Local:** `src/components/pages/CriarEditarVagaPage.tsx:158-168, 302-317`

**Defeito:** No modo edição (/rh/vagas/editar, roteado em routes.tsx:371/379), a hidratação lê data.faixa_salarial, data.carga_horaria, data.descricao_completa, data.requisito_formacao, data.requisito_experiencia, data.requisito_tecnico, data.requisito_comportamental e data.requisito_diferencial — nenhuma dessas colunas existe na row de vagas (as reais são faixa_salarial_min/max, requisitos_formacao, requisitos_experiencia, requisitos_tecnicos, etc.). O tsc reporta exatamente isso (TS2551/TS2339 nas linhas 158-168), mas está enterrado no baseline de 257 erros. Em runtime todos avaliam undefined → o formulário abre com salário, jornada, responsabilidades e todos os requisitos VAZIOS mesmo quando a vaga tem dados. Além disso, não existe nenhum caminho de persistência para esses campos: o único save é handleSalvarRascunho (linha 302), que grava apenas testes_aplicaveis + pesos_avaliacao via useUpdateVagaConfig e mostra toast 'Rascunho salvo.' — o texto digitado pelo RH em qualquer campo de conteúdo é descartado.

**Cenário de falha:** RH abre uma vaga publicada para corrigir a descrição → todos os campos de requisitos/salário aparecem em branco (parece perda de dados); reescreve os textos, clica 'Salvar rascunho', recebe toast de sucesso → nada foi salvo além dos pesos; ao reabrir, tudo em branco de novo. Confiança na ferramenta e horas de digitação perdidas; risco de RH 'republicar' achando que atualizou o anúncio.

**Fix proposto:** Mapear a hidratação para as colunas reais (faixa_salarial_min/max, requisitos_*, descricao_completa se existir ou equivalente) e adicionar um update real de vagas no submit (ou esconder/read-only os campos de conteúdo até o CRUD ser implementado, com aviso explícito de que só a configuração M2 é salva).

### A14. Gestão de usuários RH em /rh/configuracoes é 100% mock hardcoded — desativar usuário/resetar senha não faz nada no backend

`Frontend` · esforço **L** · confiança high · votos `CCC`  
**Local:** `src/components/pages/ConfiguracoesPage.tsx:169-207, 490-494`

**Defeito:** A página admin-only /rh/configuracoes (routes.tsx:408-412, RoleGuard 'administrador') renderiza uma UI completa de gestão de usuários (criar, permissões, vincular vagas, redefinir senha, excluir/desativar) alimentada por useState com 4 usuários fictícios hardcoded ('João Silva', 'Maria Santos'...). Nenhuma operação toca supabase/usuarios_rh: handleRedefinirSenha (linha 490) apenas faz console.log('Enviando email de redefinição para:', email) e fecha o modal; criar/excluir só mutam o array local, que reseta no refresh. Não há banner de 'em construção' — a UI aparenta ser funcional.

**Cenário de falha:** Um recrutador é desligado da empresa; o administrador entra em /rh/configuracoes, 'desativa' o usuário e vê a lista atualizar → a conta real em usuarios_rh/auth continua ativa e o ex-funcionário mantém acesso a PII de candidatos (risco LGPD real de offboarding). Igualmente, 'Redefinir senha' nunca envia email — o admin acredita que enviou.

**Fix proposto:** Ou (a) ligar a aba de usuários a dados reais (SELECT usuarios_rh + Edge Function service_role para criar/desativar/reset — nunca client-side), ou (b) remover/ocultar a aba mock imediatamente com um empty-state 'gestão de usuários ainda não disponível', mantendo apenas as seções funcionais. A opção (b) é o fix de segurança mínimo e barato.

### A15. Contrato quebrado: ids de teste dos cargoTemplates ('work_sample_sjt','redacao_cultural','cognitivo','triagem','entrevista') não batem com os ids que o AvaliacaoContainer espera ('sjt_mc','sjt_caso_aberto','redacao','big_five')

`Funil` · esforço **M** · confiança high · votos `CCC`  
**Local:** `src/features/config-vaga/templates/cargoTemplates.ts:57-72`

**Defeito:** vagas.testes_aplicaveis é persistido verbatim a partir de baseTestes() (TemplateVagaSelector deep-copy → CriarEditarVagaPage.tsx:309/365 → configVagaService.ts:66) com teste ∈ {triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}. Mas AvaliacaoContainer.deriveCards renderiza UM card por entry sem filtrar (AvaliacaoContainer.tsx:255-269) e testeLabel/handleOpenTeste ramificam por 'sjt_mc'/'sjt_caso_aberto'/'redacao'/'big_five' (linhas 56-72 e 308-322). Resultado: o candidato vê cards espúrios 'Triagem', 'Entrevista', 'Cognitivo', 'Work Sample Sjt' com botão 'Começar avaliação'; 'redacao_cultural' ≠ 'redacao' → o card de redação navega para /candidato/avaliacao/:id/mc (a tela de SJT MC) em vez de /candidato/redacao/:id; e como nenhum entry tem formato='caso_aberto' nem teste='sjt_caso_aberto', a tela SjtCasoAbertoScreen (e portanto a EF avaliar-redacao) é INALCANÇÁVEL pelo hub. Bônus: pontuar_sjt busca o threshold per-vaga por elem->>'tipo'='sjt' (migration 20260611000004:76), campo que os templates nunca escrevem → mc_min_pct configurado na vaga é morto, sempre default 60.

**Cenário de falha:** Vaga criada a partir de qualquer template de cargo; candidato avança para avaliacao_assincrona e abre /candidato/avaliacao/:id. Vê 6 cards incluindo 'Triagem' e 'Entrevista' clicáveis que caem na tela de SJT MC; clica em 'Redação Cultural' e cai na tela de múltipla escolha do SJT; nunca consegue abrir o caso prático — o score composto SJT (mc+caso_aberto) do consolidar-decisao-final fica incompleto para sempre.

**Fix proposto:** Definir UM enum canônico de teste id compartilhado (lib), filtrar em deriveCards apenas os testes candidate-facing, e mapear 'work_sample_sjt'→telas mc+caso, 'redacao_cultural'→/candidato/redacao, 'cognitivo'→/candidato/prova-cognitiva. Adicionar teste de contrato template↔container (parse dos templates pelo branch map do container).

### A16. Ação legada 'Aprovado para Próxima Etapa' (CandidatosRHPage/Kanban) grava etapa M1 inexistente ('bigfive') → 22P02 em toda candidatura M2

`Funil` · esforço **S** · confiança high · votos `CCC`  
**Local:** `src/features/vagas/services/candidaturasService.ts:861-902`

**Defeito:** updateCandidaturaStatus auto-avança usando getProximaEtapa/ETAPAS_SEQUENCIA legadas do M1 (vagasTypes.ts:652-668: triagem→bigfive→disc→entrevista_online→raven→...), valores que NÃO existem no enum M2 etapa_processo do DB (database.types.ts:4661-4669). O caminho está vivo: UpdateStatusModal (transição em_analise→aprovado_proxima, UpdateStatusModal.tsx:55-56) e KanbanBoard são montados em CandidatosRHPage (rota ativa, routes.tsx:303). É exatamente o drift 22P02 que o comentário do triagemService.ts:316-323 documenta para o FILTRO, mas que continua vivo no caminho de ESCRITA.

**Cenário de falha:** RH abre /rh/candidatos, seleciona um candidato em etapa 'triagem' e marca 'Aprovado para Próxima Etapa'. getProximaEtapa('triagem') retorna 'bigfive'; o UPDATE candidaturas SET etapa_atual='bigfive' falha com Postgres 22P02 (invalid input value for enum etapa_processo) e a atualização de status inteira quebra com erro genérico. Em etapa 'avaliacao_assincrona' (indexOf -1) o status muda mas a etapa silenciosamente não avança.

**Fix proposto:** Remover o auto-avanço legado de updateCandidaturaStatus (ou trocá-lo pelo mapa M2 de EtapaFunilM2), e apontar UpdateStatusModal/KanbanBoard para o fluxo M2 (updateCandidaturaEtapa + trigger avancar_etapa). Deletar ETAPAS_SEQUENCIA/getProximaEtapa do vagasTypes.

### A17. Banco SJT não é filtrado por cargo nem por itens_ids da vaga — candidato responde perguntas de todos os cargos e o score usa a bateria errada

`Funil` · esforço **M** · confiança high · votos `CCC`  
**Local:** `src/features/avaliacao/services/avaliacaoService.ts:134-140`

**Defeito:** getAvaliacaoContext carrega perguntas apenas com .eq('status','active') — sem .eq('cargo', ...) e sem interseção com testes_aplicaveis.itens_ids/cargo (os campos existem no schema testesAplicaveisSchema.ts:50-51 justamente para isso: 'cargo whose SJT bank to draw from'). As telas filtram só por formato (SjtMultiplaEscolhaScreen.tsx:124-125; SjtCasoAbertoScreen.tsx:107 pega o PRIMEIRO caso_aberto de qualquer cargo). O seed tem ≥10 perguntas de 8 cargos, todas active (migration 20260611000002). Server-side, pontuar_sjt pontua qualquer conjunto {pergunta_id,opcao_id} submetido sem validar que as perguntas pertencem à bateria/cargo da vaga (migration 20260611000004:84-110) — o denominador score_max é derivado das perguntas respondidas, seja qual for.

**Cenário de falha:** Candidato a Recepcionista abre a avaliação e recebe as situações de Dentista, ASB, SDR etc. misturadas (≥10 itens em vez de 1-2 do cargo); o caso aberto exibido é o de Dentista ('sorriso da Mariana'). O RH recebe um score SJT computado sobre a bateria errada e compara candidatos de cargos diferentes em bases distintas — a triagem da Etapa 3 perde validade.

**Fix proposto:** No client, filtrar por itens_ids (ou cargo) do elemento work_sample_sjt de testes_aplicaveis; no pontuar_sjt, validar server-side que todos os pergunta_id pertencem à bateria da vaga (42501/400 caso contrário) — o client é bypassável.

### A18. Prova cognitiva inalcançável pela navegação: funilNavMap afirma fan-out que o AvaliacaoContainer não implementa, e o gate de etapa do RPC contradiz a etapa candidate-facing

`Funil` · esforço **M** · confiança high · votos `CCC`  
**Local:** `src/lib/navegacao/funilNavMap.ts:60-64`

**Defeito:** O comentário-contrato do funilNavMap diz que /candidato/prova-cognitiva/:id é 'SUB-SCREEN' do container de avaliação ('it fans out internally — A2'), mas o AvaliacaoContainer não tem nenhum branch para cognitivo (handleOpenTeste só trata redacao/big_five/caso/mc, AvaliacaoContainer.tsx:308-322) e nenhum outro componente navega para a rota (grep: só routes.tsx:269 declara a rota). Além disso funilNavMap dá rotaCandidato null para entrevista_online/presencial (linhas 95,102) enquanto pontuar_cognitivo exige exatamente essas etapas (migration 20260624000003:69) e o container de avaliação bloqueia tudo que não for avaliacao_assincrona (AvaliacaoContainer.tsx:373). Ou seja: em nenhuma etapa existe simultaneamente (a) um link para a prova e (b) um RPC que aceite o submit.

**Cenário de falha:** RH publica vaga com aplica_cognitivo=true. O candidato jamais vê link/CTA para a prova em etapa alguma; se receber a URL por fora e abrir durante avaliacao_assincrona, a prova monta (o gate do screen é só aplica_cognitivo) mas o submit devolve 42501 → toast 'Sua etapa avançou' com respostas descartadas. ENTREV-05 é feature morta ponta-a-ponta.

**Fix proposto:** Decidir a etapa canônica da prova: ou renderizar um card cognitivo no AvaliacaoContainer (quando aplica_cognitivo) E relaxar o gate do pontuar_cognitivo para avaliacao_assincrona, ou dar rotaCandidato de prova-cognitiva às etapas entrevista_* no funilNavMap. Adicionar teste de contrato rota↔gate.

### A19. gerar-devolutiva-bigfive Edge Function performs NO authentication or authorization — IDOR read of any candidate's behavioral devolutiva

`Segurança RLS/PII` · esforço **S** · confiança medium · votos `CCC`  
**Local:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:526-660`

**Defeito:** The Deno.serve handler reads `score_id` from the request body, builds a service_role client (bypassing RLS), generates the Big Five devolutiva, and returns the full `paginas` content in the HTTP response. Unlike every other candidate-facing EF (avaliar-redacao, avaliar-redacao-cultural, submit-bigfive-final all call `auth.getUser()` + resolve `candidatos.user_id=auth.uid()` and compare against `candRow.candidato_id`) and unlike the other internally-invoked EFs (analise-candidato-individual and cost-alerter both self-authenticate a Vault Bearer), this function does NEITHER a getUser ownership check NOR a Bearer self-auth. There is no supabase/config.toml, so it deploys with the default verify_jwt=true, meaning any authenticated user's JWT (not just the service_role used by the internal `supabaseAdmin.functions.invoke` in submit-bigfive-final) is accepted by the gateway and then hits a handler with zero authz. It also re-runs 5 paid AI calls and upserts devolutivas_candidato on every call.

**Cenário de falha:** An authenticated candidato (or, if the function was deployed --no-verify-jwt, an anonymous caller) POSTs `{score_id: <another candidate's big_five score_id>}` directly to the function URL. The handler resolves the owner via service_role, generates, and returns that other candidate's full behavioral profile pages (`paginas`) in the response body — a cross-candidate PII leak — while also burning AI spend and overwriting that candidate's persisted devolutiva.

**Fix proposto:** Add a self-auth guard at the top of the handler mirroring cost-alerter/analise-candidato-individual: require `Authorization: Bearer <edge_invoke_key>` validated against the shared Vault secret (constant-time compare) and reject 401 otherwise, since the only legitimate caller is the internal service_role invoke. Do not rely on the platform gateway for authorization.

### A20. analise_candidato_vaga / comparativo_solicitado RH SELECT policies are role-only, not vaga-scoped — non-owner recruiter reads any candidate's IA triage PII

`Segurança RLS/PII` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260610000001_analise_tables.sql:77-88`

**Defeito:** The `rh_le_analise` and `rh_le_comparativo` policies grant SELECT to any JWT whose app_metadata.role is in ('rh','administrador') with no scoping to the recruiter's own vagas. These rows carry sensitive derived PII (score_match, pontos_fortes, gaps, flags, resumo_cv, ranking). The team explicitly closed this exact horizontal-access gap on sibling tables later — scores_candidato (20260625000001 lines 314-330), decisao_final (20260625100002 lines 53-66), entrevista_guias/entrevista_analises (20260625000001) were all re-scoped so `rh` only reads candidaturas of vagas where `vagas.created_by = auth.uid()` (administrador bypasses) — but analise_candidato_vaga, comparativo_solicitado, devolutivas_candidato and historico_candidatura were never re-scoped and remain role-only. The scoping effort is therefore incomplete and inconsistent: the same recruiter blocked from reading a peer's scores/decisao can still read the peer's triage analysis and gaps.

**Cenário de falha:** Two recruiters (role='rh') own different vagas. Recruiter B runs `supabase.from('analise_candidato_vaga').select(...)` (or the triagem panel view) and receives the full IA analysis — score_match, gaps, flags, CV summary — for candidates on Recruiter A's vagas, which they must not see. The moment any role='rh' (recrutador) account exists alongside the current admin-only set, this leaks across the recruiting team.

**Fix proposto:** Re-issue `rh_le_analise` and `rh_le_comparativo` (and review devolutivas_candidato / historico_candidatura) with the same vaga-ownership predicate used in the WR-03/WR-04 hardening: administrador OR (rh AND candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id=c.vaga_id WHERE v.created_by = auth.uid())). Ship it as a migration so the boundary is uniform across all child tables.

### A21. A suíte Deno já está apodrecendo: `deno test` padrão falha em código verde (cast stale + arquivo Vitest colocado no diretório Deno)

`Testes` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/functions/_shared/__tests__/ai-client.test.ts:242`

**Defeito:** Consequência direta de não haver runner: (1) `deno test` com type-check (o default) falha com TS2353 — o cast local de loadClient() (linhas 106-124) tipa callAi SEM timeoutMs/schema/idempotency_key, mas o teste da linha 242 passa `timeoutMs: 60_000`; o arquivo inteiro (9 testes, incluindo os RESIL-01/P21) não executa sem `--no-check`. A produção (_shared/ai-client.ts:176-192) TEM timeoutMs — o teste do P21 foi commitado sem nunca ter passado no modo default. (2) `deno test supabase/functions/_shared/__tests__/` aborta com uncaught error porque strict-schema.test.ts é um teste VITEST (importa 'vitest') colocado no mesmo diretório — o runner Deno o coleta e explode em tinyrainbow, derrubando a corrida inteira (reproduzi: 'FAILED | 32 passed | 10 failed'). (3) merge-preserve.test.ts requer --allow-env (ai-client.ts:70 lê MAX_ATTEMPTS no top-level) — flag não documentada no cabeçalho 'Run:'. Não existe deno.json com task `test` que canonize flags e exclusões.

**Cenário de falha:** Dev segue a instrução do próprio cabeçalho dos testes (`deno test --allow-read supabase/functions/_shared/...`) → corrida vermelha em código correto → conclui que a suíte é quebrada e para de rodá-la; regressões reais passam a ser indistinguíveis do ruído.

**Fix proposto:** (a) Corrigir o cast de loadClient() para incluir timeoutMs?; (b) mover strict-schema.test.ts para fora de _shared/__tests__ (ex.: src/__tests__/guards/) ou adicioná-lo a um exclude do deno; (c) criar deno.json com task `test` fixando `--allow-read --allow-env` e o glob correto — a mesma task que o CI do achado #1 invoca.

### A22. submit-candidatura (EF + RPC de knockout — o único auto-reject sancionado do sistema) tem ZERO testes automatizados em qualquer camada

`Testes` · esforço **L** · confiança high · votos `CCC`  
**Local:** `supabase/functions/submit-candidatura/index.ts:238`

**Defeito:** A EF submit-candidatura (341 linhas: auth, dedupe, chamada ao RPC submit_candidatura_atomic, shaping da resposta neutra de knockout D-15) não tem nenhum index.test.ts — ao contrário de avaliar-redacao, submit-bigfive-final etc. O sweep de knockout server-side (migrations/20260608000001_inscricao_knockout.sql — auto-rejeição síncrona, fronteira direta do RNF-07a) só foi verificado por SQL smokes manuais one-shot em PROD que pegaram 2 bugs reais na Phase 8 (survivor double-write + enum 22P02) e não foram commitados como testes repetíveis. O e2e inscricao-knockout.spec.ts é triple-gated (linhas 74-76: E2E_REAL_LOGIN + E2E_ALLOW_DB_WRITE + KNOCKOUT_VAGA_SLUG) → nunca roda em CI. Mesmo padrão: cadastrar-candidato (a EF que JÁ quebrou em PROD por drift de schema — 400 VALIDATION/Required) e cost-alerter também têm zero testes.

**Cenário de falha:** Uma mudança no texto-join do sweep (`@> to_jsonb(opcao_texto)`) ou no shaping da resposta faz o knockout parar de disparar (candidatos desqualificados avançam) ou — pior — rejeitar por match errado de texto (violação material do espírito do RNF-07a). Nenhum teste fica vermelho; o defeito só aparece em produção com candidatos reais.

**Fix proposto:** Clonar o harness de deps-injection de avaliar-redacao/__tests__/index.test.ts para submit-candidatura (auth/dedupe/response-shaping) e cadastrar-candidato; e commitar os SQL smokes da Phase 8 como testes repetíveis (pgTAP ou script Deno contra `supabase start` local) cobrindo knockout-match→rejeitado, no-match→inscrito e never-auto-reject-por-score.


## 🟡 MEDIUM

### A23. Replay de idempotência devolve falhas cacheadas para sempre — RH nunca consegue regenerar guia/análise após uma falha transiente

`EFs de IA` · esforço **S** · confiança high · votos `CCR`  
**Local:** `supabase/functions/_shared/ai-client.ts:252-279`

**Defeito:** tryIdempotencyReplay busca a row por idempotency_key SEM filtrar success=true: qualquer row anterior — inclusive success=false com output null gravada pelo caminho de fallback (runOpenAIFallback loga com a key mesmo quando parsed===null, ai-client.ts:503-525) ou pelo curto-circuito de injeção (ai-client.ts:315-336) — é replayada com parsed=null/flag para sempre, a custo zero mas também a RESULTADO zero. Como ai_call_logs.idempotency_key é UNIQUE (migration 20260609000001:193) e as keys dos EFs são estáveis e sem componente de conteúdo — gerar-guia usa `${candidatura_id}:${tipo}` (index.ts:272) e avaliar-transcricao usa `${candidatura_id}:transcript` (index.ts:217) — uma única falha transiente vira estado terminal: todo re-clique do RH replaya a falha.

**Cenário de falha:** Primeira geração de guia coincide com overload da Anthropic; o fallback OpenAI responde mas o parse estruturado vem null → row success=false gravada com key `${candidatura_id}:online`. O RH clica 'Gerar novamente' → tryIdempotencyReplay devolve parsed=null → guia persiste como {incompleto:true} de novo — infinitamente, até alguém deletar a row de ai_call_logs na mão. O retry best-effort do n8n para a devolutiva Big Five sofre o mesmo destino (key estável por candidato/dim/banda).

**Fix proposto:** No lookup do replay, filtrar `.eq('success', true)` (ou retornar null quando existing.success===false e o chamador pediu retry), preservando o replay de sucesso e o replay intencional de injection-detected (esse pode manter, pois o mesmo input re-detectaria). Alternativa: só gravar idempotency_key em rows success=true.

### A24. Guardrails de custo são detect-only, com 1 dia de atraso, escopo errado e canais silenciosamente desligáveis — nada corta gasto em runtime

`EFs de IA` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260609000002_prompt_library_rpcs.sql:263-303`

**Defeito:** A cadeia de controle de custo tem 4 furos verificáveis: (1) ai_cost_daily só é populada pelo pg_cron 'ai-cost-aggregation' às 01:30 agregando O DIA ANTERIOR (20260609000003:36-43) — o alerta mais rápido possível chega ~25h depois do gasto; (2) o trigger notify_cost_anomaly compara NEW.total_cost_usd > 200 numa row granulada por (date, vaga_id, call_type, provider) — o PRD fala 'R$200/mês por vaga', mas gasto mensal espalhado por dias/call_types nunca cruza US$200 numa fatia diária; o comentário 'the cost-alerter EF refines against the 30-day window' é falso — cost-alerter/index.ts só dedupa e insere, sem refinamento; (3) o branch 'candidate_cost_over_1' do cost-alerter (index.ts:93) é código morto: o trigger só emite vaga_cost_over_200 e error_rate — o teto de US$1/candidato não é monitorado por nada; (4) se os Vault secrets project_url/edge_invoke_key não existirem, o dispatch é pulado silenciosamente (RETURN NEW, linhas 299-303) — e a memória do projeto registra que esses secrets nunca foram confirmados visíveis em PROD. Além disso callAi não tem NENHUM teto de orçamento pré-chamada: custo é apenas contabilizado a posteriori.

**Cenário de falha:** Um loop de retry do n8n (ou o bug de replay acima corrigido sem cuidado) re-invoca analise-candidato-individual continuamente num sábado: gasto de US$180/dia na vaga X espalhado entre cv_job_match e comparative_ranking. Nenhuma fatia diária cruza US$200 → nenhum alerta, nunca. Mesmo que cruzasse, sem os Vault secrets o http_post nem sai — e o RH só descobre na fatura da Anthropic.

**Fix proposto:** (a) Confirmar/criar os Vault secrets e logar (RAISE WARNING) quando ausentes em vez de skip mudo; (b) avaliar janela 30 dias por vaga no trigger ou no cost-alerter (como o comentário promete); (c) emitir candidate_cost_over_1 agregando por candidato_id; (d) adicionar um kill-switch barato em callAi: SELECT do gasto do dia (ai_call_logs sum ou contador) e recusar novas chamadas acima de um teto hard configurável.

### A25. gerar-devolutiva-bigfive: Deno.serve sem validação de caller (nem Bearer interno, nem role, nem ownership) — qualquer JWT dispara 5 chamadas de IA

`EFs de IA` · esforço **S** · confiança medium · votos `CUC`  
**Local:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:526-660`

**Defeito:** A EF é 'invocada INTERNAMENTE por submit-bigfive-final' via service_role (submit-bigfive-final/index.ts:232-239), mas o handler HTTP não valida NADA do caller: sem checagem de Bearer contra secret (padrão que cost-alerter implementa em index.ts:125-137), sem checagem de role, e o handler aceita score_id arbitrário sem verificar posse (index.ts:334-363 só valida tipo='big_five'). Se deployada JWT-ON, qualquer usuário autenticado (qualquer candidato) que descubra/adivinhe um score_id dispara o fan-out de 5 chamadas Sonnet + upsert em devolutivas_candidato de OUTRO candidato; se deployada --no-verify-jwt (como outras EFs internas do projeto), o endpoint fica aberto para qualquer um com a anon key. É a recorrência exata do padrão 'EF: autenticar ≠ autorizar' já pego no code-review C1 da Phase 10.

**Cenário de falha:** Candidato malicioso captura seu próprio score_id do tráfego de rede e nota o padrão; com um JWT válido de candidato, faz POST direto em /functions/v1/gerar-devolutiva-bigfive com score_ids alvo (ou re-invoca o próprio repetidamente com bandas variando após re-testes) → gasto de IA não-autorizado e regeneração/sobrescrita de devolutivas de terceiros (upsert onConflict candidatura_id), sem nenhuma linha de auditoria de quem invocou.

**Fix proposto:** Adicionar o mesmo guard do cost-alerter: comparar o Bearer com SUPABASE_SERVICE_ROLE_KEY (ou um secret dedicado DEVOLUTIVA_INVOKE_SECRET) e retornar 401 caso contrário — a EF é exclusivamente servidor-para-servidor (submit-bigfive-final + retry n8n usam service_role). Registrar triggered_by no log.

### A26. registrar_decisao (UPSERT) destrói a decisão anterior: por_usuario/justificativa sobrescritos sem histórico quando a emenda não muda etapa

`Modelo de dados` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260625100001_decisao_final_phase15.sql:122-143`

**Defeito:** O comentário afirma que 'amendment history lives in historico_candidatura via avancar_etapa', mas isso só é verdade quando etapa_atual MUDA. Casos sem trilha: (1) emenda que mantém a decisão ('rejeitado'→'rejeitado' com nova justificativa) — o UPDATE de candidaturas nem acontece ou não muda etapa → trigger no-op → a justificativa e o por_usuario ANTERIORES são sobrescritos e perdidos para sempre; (2) decisao='em_espera' — nunca toca etapa → zero linhas de histórico em qualquer emenda; (3) mesmo quando a etapa muda (aprovado→rejeitado), o trigger grava criterio_texto = NEW.etapa_justificativa, que o RPC NÃO seta — a linha de auditoria carrega a justificativa STALE de uma transição antiga, não a da decisão. Para uma tabela cuja razão de existir é auditabilidade LGPD Art. 20 (o candidato pode pedir revisão da decisão), perder quem decidiu e com qual fundamento na versão anterior é um defeito de modelo.

**Cenário de falha:** RH A rejeita com justificativa X; RH B (ou admin) chama registrar_decisao de novo com justificativa Y → decisao_final agora diz que B decidiu por Y; candidato pede revisão (solicitar_revisao_decisao) e a empresa não tem mais registro de que A decidiu por X — indefensável numa disputa trabalhista/ANPD.

**Fix proposto:** Criar tabela append-only decisao_final_historico (ou trigger AFTER UPDATE em decisao_final que copie OLD.* para uma tabela de log), e no RPC setar candidaturas.etapa_justificativa = p_justificativa antes do UPDATE de etapa para que criterio_texto do histórico seja honesto.

### A27. Reinscrição após soft-delete não funciona: índice unique sem filtro deleted_at em PROD contradiz o contrato da migration

`Modelo de dados` · esforço **S** · confiança medium · votos `CCC`  
**Local:** `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql:9-11`

**Defeito:** A migration cria o índice parcial `candidaturas_candidato_vaga_unique_idx ... WHERE deleted_at IS NULL` e documenta explicitamente que 'Partial index allows re-application after soft-delete'. Porém PROD carrega um SEGUNDO índice unique em (candidato_id, vaga_id) SEM o filtro (herdado do schema M1 não-versionado — confirmado operacionalmente no reset de dados de UAT, reference_candidatura_test_data_reset: 'um SEM filtro deleted_at → soft-delete NÃO libera; hard-delete necessário'). O comportamento de produto prometido pelo modelo (candidato pode se recandidatar após a candidatura anterior ser soft-deletada) está quebrado, e o erro emerge como 23505 mapeado para DUPLICATE_CANDIDATURA — mensagem errada para o usuário.

**Cenário de falha:** RH soft-deleta a candidatura antiga de um candidato (deleted_at=now()) para permitir nova inscrição na mesma vaga; o candidato re-submete → submit_candidatura_atomic estoura 23505 no índice não-filtrado → EF devolve 'DUPLICATE_CANDIDATURA' e o candidato fica permanentemente bloqueado naquela vaga sem hard-delete manual em 3 tabelas.

**Fix proposto:** Nova migration: `DROP INDEX/CONSTRAINT` do unique não-filtrado legado (identificar via pg_indexes em PROD), mantendo apenas o índice parcial; adicionar smoke SQL que insere→soft-deleta→re-insere para validar.

### A28. historico_candidatura.auto_rejeitado significa 'escrita do sistema', não 'auto-rejeição' — o ledger de auditoria de viés registra falsos positivos

`Modelo de dados` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260624000004_avancar_etapa_flag_guard.sql:87-88`

**Defeito:** O trigger grava `auto_rejeitado = (v_ator IS NULL)` — verdadeiro para QUALQUER escrita via service_role/EF, inclusive avanços positivos. Concretamente: todo sobrevivente do knockout ganha uma linha inscricao→triagem com auto_rejeitado=true (documentado em 20260608000001:208-227 como AR-08-01 'aceito'), e o template de orphan-audit (20260607000002:117-121) também grava colapsos de enum como auto_rejeitado=true. Numa tabela cujo propósito declarado é auditoria FUNIL-03/LGPD, a coluna com o nome mais sensível do sistema (a que um auditor externo consultaria para verificar RNF-07a) responde errado: SELECT count(*) WHERE auto_rejeitado=true retorna sobreviventes avançando de etapa misturados com rejeições reais do knockout.

**Cenário de falha:** Auditoria interna/ANPD roda `SELECT * FROM historico_candidatura WHERE auto_rejeitado = true` para quantificar rejeições automáticas → obtém N linhas onde a maioria são avanços inscricao→triagem de candidatos APROVADOS no knockout; o relatório de compliance superestima (ou, se o auditor filtra por etapa_para='inscricao', o analista interno subestima) as auto-rejeições, e a empresa não consegue demonstrar com precisão o volume real de decisões automatizadas.

**Fix proposto:** Migration: renomear para escrita_sistema (ou adicionar coluna nova) e derivar auto-rejeição real como predicado honesto (etapa_de=etapa_para='inscricao' AND ator IS NULL AND candidatura.motivo_rejeicao='knockout_automatico'); backfill das linhas existentes; atualizar o trigger para gravar auto_rejeitado=true apenas no branch de knockout (o submit RPC pode sinalizar via GUC ou coluna).

### A29. upsert_pergunta_opcoes_metadata não tem guard de status da vaga: editar opções de vaga ATIVA regenera opcao_ids, orfana opcao_knockout_id e desalinha o snapshot qualificacao_etapa1

`Modelo de dados` · esforço **M** · confiança high · votos `CCU`  
**Local:** `supabase/migrations/20260607010003_upsert_pergunta_opcoes_metadata_rpc.sql:57`

**Defeito:** O RPC checa apenas role IN ('rh','administrador') e então faz DELETE total + re-INSERT das pergunta_opcao_metadata da pergunta — sem verificar se a vaga está em rascunho, sem ownership da vaga. Consequências no modelo: (1) candidaturas.opcao_knockout_id é 'logical FK' sem constraint (20260608000001:44) → após o DELETE, o ponteiro de auditoria de TODA rejeição knockout passada aponta para uuid inexistente; (2) vagas.qualificacao_etapa1 (snapshot escrito só por publish_vaga no rascunho→ativa) fica permanentemente stale — não há re-snapshot; (3) o sweep de knockout casa por TEXTO (`@> to_jsonb(opcao_texto)`) — editar o texto de uma opção knockout de vaga ativa faz o critério eliminatório parar de disparar silenciosamente para todas as candidaturas seguintes (ou disparar com critério diferente do publicado), sem qualquer registro.

**Cenário de falha:** RH corrige um typo na opção knockout 'Não tenho disponibilidade presencial' de uma vaga ativa via tela de edição → DELETE+re-INSERT muda opcao_texto → formulários já renderizados no browser de candidatos submetem o texto antigo → `resposta_opcoes @> to_jsonb(opcao_texto)` nunca casa → candidatos que deveriam ser eliminados avançam para triagem; simultaneamente, as rejeições antigas ficam com opcao_knockout_id órfão e a auditoria não consegue mais reconstituir qual critério eliminou quem.

**Fix proposto:** No RPC: RAISE se a vaga da pergunta estiver com status <> 'rascunho' (espelhando o gate de publish_vaga), ou re-derivar qualificacao_etapa1 + preservar opcao_ids existentes (UPDATE em vez de DELETE+INSERT quando opcao_id vem preenchido); adicionar FK real de candidaturas.opcao_knockout_id → pergunta_opcao_metadata(opcao_id... ) com ON DELETE SET NULL + coluna de texto denormalizada para a trilha.

### A30. Scoping horizontal por vaga (WR-03/WR-04) não foi aplicado a analise_candidato_vaga nem redacoes_candidato — qualquer RH lê análises e redações de vagas alheias

`Modelo de dados` · esforço **S** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260610000001_analise_tables.sql:78-83`

**Defeito:** As Phases 14/15 fecharam o gap de acesso horizontal em entrevista_analises, entrevista_guias, scores_candidato (20260625000001:272-327) e decisao_final (20260625100002) — role='rh' só lê candidaturas de vagas próprias (vagas.created_by). Mas duas tabelas com o mesmo perfil de PII ficaram role-only: analise_candidato_vaga (`rh_le_analise`: score_match, gaps, flags, resumo_cv — o próprio COMMENT da tabela chama de 'V8 PII') e redacoes_candidato (`redacao_rh_select`, 20260623100003:124-127: texto integral da redação + veredito IA + notas de revisor). O modelo de autorização do sistema ficou inconsistente: o mesmo recrutador que NÃO pode ler o score de entrevista de uma candidatura alheia pode ler a análise de CV e a redação completa dela.

**Cenário de falha:** Recrutador 'rh' sem nenhuma vaga própria chama `GET /rest/v1/analise_candidato_vaga?select=*` e `GET /rest/v1/redacoes_candidato?select=texto,analise_ia,notas_revisor` → enumera análises de CV, gaps, flags e redações pessoais de todos os candidatos de todas as vagas da empresa — exatamente o vazamento que WR-03/WR-04 declararam fechado.

**Fix proposto:** Migration espelhando o precedente WR-04: DROP das duas policies role-only e CREATE com o padrão administrador-bypass OR (rh AND candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id=c.vaga_id WHERE v.created_by=auth.uid())); estender também à policy redacao_rh_update.

### A31. Credenciais de conta de teste commitadas como fallback nos specs E2E

`Deps/config` · esforço **S** · confiança high · votos `CCC`  
**Local:** `e2e/vagas-browse.spec.ts:15-16 (idem auth-hydration.spec.ts:23-24, candidatura-submit.spec.ts:23-24, .env.test.example:6-7)`

**Defeito:** Os specs E2E trackeados no git usam fallback hardcoded `process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br'` / `process.env.TEST_USER_PASSWORD || 'teste123'`, e .env.test.example documenta o mesmo par como exemplo real. O repo está em github.com/fercosnt/SistemaRecrutamento e o histórico do projeto confirma que contas de teste E2E existem VIVAS em PROD (e2e.admin@beautysmile.com.br, candidato.funil@teste.com). Se `fernando@beautysmile.com.br` existir em auth.users de PROD com essa senha, é credencial válida commitada.

**Cenário de falha:** Qualquer pessoa com acesso ao repositório (colaborador, vazamento, ou repo tornado público) tenta login em PROD com fernando@beautysmile.com.br/teste123 → acesso autenticado como candidato real (PII própria + superfície RLS autenticada), sem nunca ter tocado em .env.

**Fix proposto:** Remover os fallbacks hardcoded (usar `test.skip(!process.env.TEST_USER_EMAIL)` que já existe nos mesmos arquivos como único gate); trocar o exemplo em .env.test.example por placeholder `test-user@example.com`; verificar em PROD se a conta fernando@beautysmile.com.br existe e rotacionar/deletar.

### A32. 8 dependências de produção com versão wildcard "*" (supply-chain sem teto de versão)

`Deps/config` · esforço **S** · confiança high · votos `CCC`  
**Local:** `package.json:37-40, 42, 51, 55-56, 63`

**Defeito:** @tiptap/core, @tiptap/extension-text-style, @tiptap/react, @tiptap/starter-kit, clsx, motion, react-dnd, react-dnd-html5-backend e tailwind-merge estão declarados como "*". O lockfile pina hoje (tiptap 3.10.1, clsx 2.1.1, tailwind-merge 3.3.1...), mas "*" aceita QUALQUER versão futura: um `npm update`, um `npm install` após conflito de lock, ou Dependabot resolvem para o latest absoluto — incluindo majors com breaking changes ou uma release comprometida (padrão de ataque real em 2024-25: publicar major malicioso de pacote popular).

**Cenário de falha:** Dev roda `npm update` (ou o lock é regenerado num merge conflituoso); @tiptap/* salta para o próximo major com API incompatível → RichTextEditor.tsx quebra em produção silenciosamente (tsc baseline mascara), ou pior: uma versão comprometida de clsx/tailwind-merge (importados em ~todas as páginas) injeta código no bundle do candidato.

**Fix proposto:** Substituir cada "*" pelo range caret da versão do lockfile atual (ex.: "@tiptap/react": "^3.10.1", "clsx": "^2.1.1", "tailwind-merge": "^3.3.1") — mudança só de manifest, zero mudança de node_modules.

### A33. Testes Deno das Edge Functions nunca rodam no CI (zero cobertura automatizada do código de IA)

`Deps/config` · esforço **S** · confiança high · votos `CCC`  
**Local:** `vite.config.ts:19-44 (e .github/workflows/ci.yml — jobs unit/e2e/lighthouse, nenhum step deno)`

**Defeito:** vite.config.ts exclui corretamente ~12 suites de teste de EF do Vitest (elas usam specifiers https://deno.land / npm: e devem rodar sob `deno test`), mas o ci.yml não tem NENHUM step `deno test` — os jobs são só unit (vitest), e2e (playwright) e lighthouse. Resultado: todo o código das EFs de IA (ai-client, circuit-breaker, injection-detector, pii-masker, avaliar-redacao, consolidar-decisao-final, gerar-devolutiva-bigfive...) — exatamente o subsistema que historicamente mais quebrou em PROD (bug do import npm:, timeouts, contract gaps) — só é testado quando alguém lembra de rodar `deno test` localmente.

**Cenário de falha:** PR altera _shared/ai-client.ts ou um schema de EF quebrando o parse do injection-detector; CI fica 100% verde (Vitest exclui os testes que pegariam); a EF é redeployada e toda avaliação de redação passa a 500 em PROD — regressão idêntica às 3 já pegas só em UAT ao vivo (P21).

**Fix proposto:** Adicionar job `deno` no ci.yml: `denoland/setup-deno@v2` + `deno test --allow-read --allow-env supabase/functions/ scripts/`; recommitar deno.lock (hoje gitignorado em .gitignore:91) para pinar transitivas.

### A34. Gate de bundle PERF-03 (assert-chunks.mjs) existe mas não está wired em build nem CI — regressão dos −68% pode voltar silenciosa

`Deps/config` · esforço **S** · confiança high · votos `CCC`  
**Local:** `scripts/assert-chunks.mjs:1-44 (ci.yml step Build linha ~69-70 roda só `npm run build`)`

**Defeito:** O script assert-chunks.mjs (gate da Phase 19: react-vendor chunk existe, index eager < 2.788kB, jsPDF fora do eager, >4 chunks) só roda quando invocado manualmente. `npm run build` é `vite build` puro (package.json:99) e o ci.yml roda `npm run build` sem o assert em nenhum dos 3 jobs. Verifiquei que hoje ele passa (index eager 883kB, 42 chunks), mas nada impede um import estático acidental de jsPDF ou um refactor do manualChunks de reverter o corte de 68% — o próprio comment do vite.config.ts (linha 116-122) avisa que um branch broad de vendor re-quebra a app com blank screen circular-init, e esse cenário também passaria sem gate.

**Cenário de falha:** Dev adiciona `import jsPDF from 'jspdf'` estático numa página eager (em vez do dynamic import); build verde, CI verde; bundle inicial volta a ~2.7MB → LCP do candidato mobile degrada de volta ao pré-P19, sem nenhum sinal até o Lighthouse job (que tem thresholds próprios e roda em máquina de CI, não necessariamente falha).

**Fix proposto:** Mudar o script build para `"build": "vite build && node scripts/assert-chunks.mjs"` (ou adicionar o step logo após Build no ci.yml nos jobs e2e/lighthouse).

### A35. Baseline do gate tsc no CI está 33 erros frouxo (290 vs 257 reais) — novos type errors entram sem quebrar o CI

`Deps/config` · esforço **S** · confiança high · votos `CCC`  
**Local:** `.github/workflows/ci.yml:49-57`

**Defeito:** tsconfig.json tem strict:true de fato, mas o CI só falha se `grep -c "error TS"` > 290 ('frozen baseline'). Rodei `npx tsc --noEmit` no estado atual: 257 erros. O gate zero-growth nunca foi re-apertado após as limpezas das Phases 16-17 (293→258→257), então há folga para 33 NOVOS erros de tipo entrarem em qualquer PR com CI verde — exatamente o tipo de regressão que o gate existe para impedir (o histórico registra o caso VagaConfig da Phase 8 em que +4 erros passaram despercebidos até code review).

**Cenário de falha:** PR introduz 20 erros de tipo novos em código novo (não-legado) — ex.: coluna renomeada no database.types.ts regenerado; COUNT=277 ≤ 290 → CI verde, deploy segue, e o erro só aparece como quebra de runtime em PROD.

**Fix proposto:** Atualizar o baseline no ci.yml de 290 para 257 (dois lugares: o if e as mensagens) e adotar a regra de re-apertar o número a cada fase que reduza o count.

### A36. Vulns críticas/altas no dev-tooling: vitest/@vitest/ui (RCE via UI server), happy-dom (code execution) e vite 6.3.5 pinado exato com 7 advisories

`Deps/config` · esforço **S** · confiança high · votos `CCC`  
**Local:** `package.json:83, 86, 94-95`

**Defeito:** npm audit: vitest 4.0.7 + @vitest/ui CRITICAL ('When Vitest UI server is listening, arbitrary file can be read and executed'), happy-dom 20.0.10 HIGH ('unsanitized export names interpolated as executable code'), e vite pinado EXATO em 6.3.5 (sem caret — não recebe patches) acumulando 7 advisories (arbitrary file read via WebSocket do dev server, fs.deny bypass, path traversal em .map de optimized deps). Tudo dev-only, mas `npm run test:ui` sobe o servidor vulnerável do Vitest e `npm run dev` (porta 3003) roda o Vite vulnerável na máquina que guarda .env.local com a SERVICE_ROLE_KEY de PROD.

**Cenário de falha:** Dev roda `npm run test:ui` ou `npm run dev`; uma página maliciosa aberta no mesmo navegador faz requests cross-origin ao localhost:3003 / porta do Vitest UI e lê arquivos arbitrários da máquina — incluindo `.env.local` com SUPABASE_SERVICE_ROLE_KEY de produção → banco inteiro comprometido.

**Fix proposto:** `npm audit fix` para vitest/@vitest/ui/happy-dom (patches dentro dos ranges); trocar `"vite": "6.3.5"` por `"vite": "^6.3.5"` e atualizar para o último 6.x (ou 7.x se compatível com plugin-react-swc).

### A37. MeuPerfilPage (RH): salvar dados, alterar senha e alterar foto são stubs console.log que simulam sucesso

`Frontend` · esforço **S** · confiança high · votos `CCC`  
**Local:** `src/components/pages/MeuPerfilPage.tsx:38-53`

**Defeito:** Na rota live /rh/perfil (routes.tsx:400-404), handleSalvarDados apenas faz console.log dos dados pessoais; handleAlterarSenha valida a confirmação, faz console.log('Alterando senha...') e LIMPA os campos de senha — comportamento idêntico a um sucesso — sem nunca chamar supabase.auth.updateUser; handleAlterarFoto também é stub. A validação de senha usa alert() nativo (fora do padrão de toast do app e não anunciado consistentemente para leitores de tela).

**Cenário de falha:** Um recrutador que suspeita de senha comprometida usa 'Alterar senha' em /rh/perfil; os campos limpam como se tivesse funcionado; a senha antiga (comprometida) continua válida — falsa sensação de segurança num sistema que processa PII de candidatos.

**Fix proposto:** Implementar handleAlterarSenha via supabase.auth.updateUser({ password }) com toasts de sucesso/erro (padrão sonner do app), ou desabilitar os botões com aviso explícito de indisponível. Remover os console.log.

### A38. 65 erros TS2307 por imports versionados ('lucide-react@0.487.0') sem paths no tsconfig — desliga o type-check de todo src/components/ui e mascara bugs reais

`Frontend` · esforço **S** · confiança high · votos `CCC`  
**Local:** `tsconfig.json:paths (vs vite.config.ts:69)`

**Defeito:** vite.config.ts define aliases para especificadores versionados ('lucide-react@0.487.0' → 'lucide-react', '@radix-ui/react-slot@1.1.2', 'class-variance-authority@0.7.1', etc. — 4 blocos de alias), então o build passa, mas o tsconfig.json só mapeia '@/*'. Resultado: 65 TS2307 (Cannot find module) em ~30 arquivos de src/components/ui/*, que cascateiam em ~43 TS7006 (parâmetros implicitamente any) — ou seja, os primitives shadcn e as props que fluem por eles ficam SEM type-check. Isso representa ~42% do baseline de 257 erros e é exatamente o ruído que permitiu que defeitos reais reportados pelo tsc (achados #1 e #2 acima, TS2551/TS2561 de colunas/enums inexistentes) fossem tratados como 'dívida aceitável'. Baseline atual confirmado: 257 erros (TS2307×65, TS7006×43, TS2322×39, TS6133×36, TS2339×22, TS2551×17...).

**Cenário de falha:** Qualquer regressão de contrato de props num componente ui/ (ex.: Glass, Sidebar, Form) ou novo uso de coluna inexistente passa despercebida: 'npm run lint' já falha com 257 erros, então +1 erro real não bloqueia nada nem chama atenção — foi assim que os bugs de hidratação da vaga e do enum de etapas chegaram a PROD.

**Fix proposto:** Fix S: adicionar em tsconfig.json compilerOptions.paths os mesmos mapeamentos versionados do vite.config.ts (ex.: 'lucide-react@0.487.0': ['./node_modules/lucide-react']), ou rodar um codemod único removendo os sufixos @version dos imports e apagar os aliases do Vite. Depois, ratchet: falhar CI se a contagem de erros subir acima do novo baseline (~150).

### A39. extractEfErrorCode duplicado em entrevistaService com assinatura INVERTIDA e prioridade pré-WR-03 — landmine de dedup

`Frontend` · esforço **S** · confiança high · votos `CCR`  
**Local:** `src/features/entrevista/services/entrevistaService.ts:662-676`

**Defeito:** Existe um extractEfErrorCode local (linha 662, assinatura (error, data), retorna null) duplicando o canônico @/lib/efErrors.ts:38 (assinatura (data, error), retorna undefined) já usado por decisaoService, triagemService, avaliacaoService e bigfiveService. Além da inversão de parâmetros, a cópia local mantém a ordem de prioridade antiga (lê data ANTES de error.context — exatamente o bug que o WR-03 corrigiu no canônico, onde um body { ok:false, error_code } em data mascara o error_code HTTP real do transporte). O call-site único está na linha 637.

**Cenário de falha:** Dedup 'óbvio' futuro: alguém troca a duplicata pelo import de @/lib/efErrors sem inverter os argumentos na linha 637 → extractEfErrorCode(error, data) passa o FunctionsHttpError como 'data' e o body como 'error' → retorna sempre undefined → o branch 'VALIDATION' (linha 638) nunca dispara e toda falha de validação da EF avaliar-transcricao vira 'Não foi possível analisar a transcrição' genérico com retry inútil. Os testes atuais mockam o service, então nada quebra no CI (mesmo padrão do feedback_integration_contract_gap).

**Fix proposto:** Deletar a função local, importar de @/lib/efErrors e ajustar a linha 637 para extractEfErrorCode(data, error) (com checagem `=== 'VALIDATION'` contra undefined). Adicionar 1 teste de contrato que exercita o caminho FunctionsHttpError→VALIDATION no entrevistaService real.

### A40. Serviço candidate-facing seleciona a coluna rubric (critérios de pontuação BARS) das perguntas SJT — gabarito parcial exposto ao candidato

`Funil` · esforço **S** · confiança high · votos `CCC`  
**Local:** `src/features/avaliacao/services/avaliacaoService.ts:136`

**Defeito:** getAvaliacaoContext projeta explicitamente 'id, cargo, cenario, formato, tempo_est_min, rubric, status' de perguntas como CANDIDATO. A policy cand_le_perguntas_ativas (migration 20260611000002:69-70) é row-level e não esconde colunas — a própria migration avisa 'RLS is row-level only' e o design da fase protegeu peso/tag via get_opcoes_sjt, mas a rubric jsonb do caso aberto (pesos por dimensão 25/20/25/15/15 + dimensões avaliadas) sai na resposta de rede para o candidato. É a mesma classe de vazamento do [[reference_select_star_leaks_pii]], aqui vazando o answer-key de avaliação em vez de PII. A UI não usa rubric em nenhuma tela do candidato; a EF avaliar-redacao lê a rubric server-side por conta própria (avaliar-redacao/index.ts:221).

**Cenário de falha:** Candidato abre o DevTools na tela de avaliação, inspeciona a resposta do GET perguntas e lê as dimensões BARS e seus pesos do caso aberto; estrutura a resposta para maximizar cada dimensão de maior peso, inflando o composto BARS que o RH usa na triagem da Etapa 3.

**Fix proposto:** Remover rubric (e cargo, se não usado) da projeção candidate-facing; se necessário, criar policy/coluna-view separada para RH. Adicionar teste de projeção de rede (testar o select, não o JSX).

### A41. Cards da avaliação nunca refletem conclusão (status lido de um campo que não existe no jsonb da vaga) — candidato pode ressubmeter e sobrescrever o score SJT ilimitadamente

`Funil` · esforço **M** · confiança high · votos `CCC`  
**Local:** `src/features/avaliacao/components/AvaliacaoContainer.tsx:255-269`

**Defeito:** deriveCards lê t.status do elemento de vagas.testes_aplicaveis — mas testeAplicavelSchema não tem campo status (config é nível-vaga, não nível-candidatura) e os templates nunca o escrevem, então todo card é eternamente 'Pendente' com CTA 'Começar avaliação'. O estado real de conclusão do candidato (respostas_avaliacao / scores_candidato) nunca é consultado. Como o back-lock RLS é só por etapa, e pontuar_sjt faz ON CONFLICT DO UPDATE (migration 20260611000004:128-131), o candidato pode reabrir e ressubmeter o SJT quantas vezes quiser enquanto estiver em avaliacao_assincrona, sobrescrevendo score/metadata já vistos pelo RH sem trilha.

**Cenário de falha:** Candidato conclui o SJT MC (score gravado, RH pode já ter visto 'pendente_humano'); volta ao hub, o card segue 'Pendente', reabre o teste, troca as respostas marcadas com tag 'atencao' e ressubmete — a row de scores_candidato é sobrescrita (status vira 'sucesso') e o breakdown anterior some, sem qualquer registro da regravação.

**Fix proposto:** Derivar o status do card das rows próprias do candidato (respostas_avaliacao/scores_candidato via RPC neutra 'já registrado'), e/ou bloquear ressubmissão server-side no pontuar_sjt (rejeitar quando já existe row, ou versionar em metadata).

### A42. candidaturas base-table RH policies are role-only — non-owner recruiter reads all candidaturas + candidate PII and can UPDATE/advance/reject any candidatura

`Segurança RLS/PII` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:45-58`

**Defeito:** `rh_le_candidaturas` (SELECT) and `rh_avanca_etapa` (UPDATE) both gate solely on app_metadata.role IN ('rh','administrador') with no vaga-ownership scoping. The candidaturas row itself holds internal/PII columns (observacoes_rh, feedback_rejeicao, motivo_rejeicao, analise_ia_* jsonb), and the RH listing path joins full candidato PII (cpf, data_nascimento, email, celular) — see src/features/vagas/services/candidaturasService.ts:1158-1180 (listCandidaturasByVaga selects `candidaturas.*` + candidato PII). Because the AI EFs enforce `vagas.created_by === user.id` for role='rh' but the base-table RLS does not, a recruiter can bypass those EF checks entirely by hitting the table directly from the authenticated client. The parent table being unscoped undermines the vaga-scoping applied to the child tables (scores/decisao/analise).

**Cenário de falha:** A role='rh' recruiter who does not own vaga X calls `supabase.from('candidaturas').update({status:'rejeitado', etapa_atual:'inscricao'}).eq('id', <candidatura on vaga X>)` — RLS permits it (role-only USING/WITH CHECK), the avancar_etapa trigger runs, and the peer's candidate is altered/rejected. The same recruiter can SELECT every candidatura and its joined candidate PII across all vagas.

**Fix proposto:** Scope both candidaturas policies to vaga ownership for role='rh' (administrador bypasses), matching the WR-03/WR-04 pattern: USING (role='administrador' OR (role='rh' AND vaga_id IN (SELECT id FROM vagas WHERE created_by = auth.uid()))). Apply to both the SELECT and the UPDATE policy.

### A43. custom_access_token_hook depends on an RLS SELECT policy for supabase_auth_admin on usuarios_rh that exists only in PROD (execute_sql), not in any migration — rebuild from migrations silently downgrades every RH login to 'candidato'

`Segurança RLS/PII` · esforço **S** · confiança medium · votos `CCC`  
**Local:** `supabase/migrations/20260420000002_unified_auth_role.sql:100-102`

**Defeito:** The hook is SECURITY INVOKER (plpgsql STABLE, no SECURITY DEFINER) so it runs as supabase_auth_admin during token issuance and SELECTs usuarios_rh/candidatos. The migration only issues `GRANT SELECT ON public.usuarios_rh TO supabase_auth_admin` — a table grant, which RLS overrides. usuarios_rh has RLS enabled in PROD (confirmed by the fact the fix was needed), yet no migration in the repo enables RLS on usuarios_rh nor creates any policy granting supabase_auth_admin a SELECT row (grep for `ON public.usuarios_rh ... POLICY` and `usuarios_rh ENABLE ROW LEVEL SECURITY` returns nothing). The working policy `auth_admin_le_usuarios_rh` was applied live via execute_sql only (per project memory), so the live security-critical state is not reproducible from git — a migrations-based rebuild (new env, CI, DR) produces a DB where the hook reads 0 rows and every RH user gets app_metadata.role='candidato'.

**Cenário de falha:** Provision a fresh Supabase project by running `supabase db push` over the migration set (staging clone, disaster recovery, or a new region). RLS-enabled usuarios_rh has no SELECT policy for supabase_auth_admin, so the hook's `SELECT role FROM usuarios_rh` returns nothing, rh_role_db is NULL, and the JWT gets role='candidato'. Every administrator/recruiter logs in as a candidato, loses RH access, and downstream RH reads (e.g. GET candidatos) 406/deny.

**Fix proposto:** Add a migration that (idempotently) enables RLS on usuarios_rh if required and creates the SELECT policy for supabase_auth_admin (e.g. `CREATE POLICY auth_admin_le_usuarios_rh ON public.usuarios_rh FOR SELECT TO supabase_auth_admin USING (true)`), so the live-patched state is captured in git and reproducible. Do the same review for candidatos.

### A44. Contract tests client↔EF replicam AMBOS os lados dentro do próprio teste — o corpo do client real nunca é exercitado contra o schema

`Testes` · esforço **M** · confiança high · votos `CCC`  
**Local:** `src/features/avaliacao/__tests__/bigfive-contract.test.ts:52`

**Defeito:** Os 4 contract tests (bigfive-contract, redacao-contract, entrevista-contract, consolidacaoContract) usam uma 'réplica Zod Node-local' do schema da EF (justificável — npm: specifier não resolve no Vitest) MAS também constroem o corpo do client à mão (`buildClientBody()`, linha 52, comentado como 'mirrors src/features/avaliacao service layer') em vez de importar/exercitar o builder real (bigfiveService.ts:155-166 monta o body de verdade). Os source-text probes (linhas 85-108) só cobrem o LADO EF (regex por export/.strict()/.min(1)); não há probe nem parse do lado client. Ou seja: réplica-do-schema × réplica-do-body = os dois lados do boundary mockados de novo, a exata classe de falha do [[feedback_integration_contract_gap]] (Phase 11 C1/C2, SJT 100% quebrado com testes verdes; Phase 10 'VALIDATION' vs 'MIXED_VAGA').

**Cenário de falha:** Alguém renomeia `respostas`→`answers` no body montado por bigfiveService.ts (ou muda o shape para array). bigfiveService.test.ts mocka functions.invoke e passa; bigfive-contract.test.ts parseia seu próprio body hand-built e passa; a EF real rejeita 400 todo submit Big Five em PROD.

**Fix proposto:** Nos service tests que já mockam supabase.functions.invoke, capturar o body realmente passado ao invoke e assertar `SchemaReplica.safeParse(capturedBody).success === true` (importando a réplica do contract test correspondente, exportada de um módulo compartilhado). Isso fecha o meio-contrato do lado client sem tocar no problema do npm: specifier.

### A45. Toda a lógica DB-side (RLS, RPCs SECURITY DEFINER, triggers, pontuar_sjt, publish_vaga) não tem nenhum teste repetível commitado — o invariante RNF-07a no banco depende de smokes manuais one-shot em PROD

`Testes` · esforço **L** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260608000001_inscricao_knockout.sql:18`

**Defeito:** Não existe supabase/tests/, nenhum arquivo pgTAP, nenhum teste SQL commitado (verificado por find). As garantias mais sensíveis do produto vivem em PL/pgSQL: pontuar_sjt ('NUNCA escreve candidaturas' — RNF-07a), o sweep de knockout, publish_vaga, trg_candidaturas_analise, avancar_etapa, get_opcoes_sjt (answer-key protection) e ~toda a malha de RLS (incl. a policy auth_admin_le_usuarios_rh cuja ausência já quebrou TODO login RH). Cada uma foi verificada por SQL smokes ad-hoc via MCP/SQL Editor em PROD — que comprovadamente acham bugs (2 na Phase 8, RPC-denial na Phase 10/11) — mas são descartados após o apply. Nenhuma migration futura tem rede de proteção contra regressão dessas policies/funções.

**Cenário de falha:** Uma migration da M4 recria uma policy de candidaturas ou altera pontuar_sjt e, sem querer, permite um UPDATE de etapa_atual disparado por score (quebra do RNF-07a) ou reabre o SELECT do candidato em perguntas_opcao_sjt (vaza gabarito/peso). db push aplica limpo, CI verde, e o vazamento/violação só é detectável por auditoria manual.

**Fix proposto:** Job de CI com `supabase start` (stack local) + migrations + um conjunto pequeno de testes SQL de invariantes (pgTAP ou script Deno com set_config request.jwt.claims, o mesmo idiom já usado nos smokes manuais): candidato-DENY nas tabelas de gabarito, pontuar_sjt nunca toca candidaturas, knockout só via tag, RPCs 42501 para non-owner.

### A46. O e2e do CI é uma casca mocked: todo o funil RH (triagem→avaliação→entrevista→decisão) e todos os fluxos que quebraram em PROD têm zero e2e executável no CI

`Testes` · esforço **L** · confiança high · votos `CCC`  
**Local:** `.github/workflows/ci.yml:76`

**Defeito:** ci.yml fixa E2E_AUTH_TEST_USERS: '' e roda com VITE_SUPABASE_URL placeholder. Resultado (verificado spec a spec): login-flow real-auth → describe.skip (linha 40); navegacao J1-J3 RH/admin → describe.skip + exigem E2E_CANDIDATURA_ID/E2E_VAGA_ID seedados (linhas 151-152); candidatura-submit, prova-cognitiva, inscricao-knockout, explicacao, auth-hydration → gated em E2E_REAL_LOGIN/E2E_ALLOW_DB_WRITE; vagas-browse → skip com 0 cards (placeholder URL). O que sobra rodando de fato: a11y com sessão mockada (fixtures/a11y-session.ts), validações de formulário e o 404. Não existe NENHUM spec e2e para as telas de triagem/avaliação-RH/entrevista/decisão além dos J-journeys gated de navegacao. Os 3 defeitos do P21 e o bug 'active' vs 'ativo' estavam todos em fluxos sem e2e de CI.

**Cenário de falha:** Uma mudança de roteamento ou de query no funil RH (ex.: filtro de status numa tabela de triagem) quebra a tela inteira para o RH. Vitest passa (mocks), CI e2e passa (nada exercita a tela), e o RH descobre no uso — repetindo o padrão do bug do filtro 'ativo' que bloqueou a tela de avaliação em PROD.

**Fix proposto:** Estender o padrão mockSession/page.route (já provado em perfil.spec.ts e a11y-session.ts) para um smoke determinístico das 4 telas do funil RH com respostas rest/v1 mockadas — roda no Tier-1 sem Supabase vivo. Separadamente, agendar o Tier-2 (E2E_AUTH_TEST_USERS=true) como job noturno com os secrets TEST_* já suportados.

### A47. Credenciais fallback hardcoded em 8 arquivos e2e commitados — incluindo e-mails reais e a senha 'teste123' usada em UATs live de PROD

`Testes` · esforço **S** · confiança medium · votos `CCR`  
**Local:** `e2e/vagas-browse.spec.ts:16`

**Defeito:** vagas-browse.spec.ts:16, navegacao.spec.ts:40+47, auth-hydration.spec.ts:24, explicacao-flow.spec.ts:31, perfil.spec.ts:43, login-flow.spec.ts:22 e fixtures/a11y-session.ts:102 usam `process.env.TEST_USER_PASSWORD || 'teste123'` com defaults de e-mail `fernando@beautysmile.com.br` / `admin@beautysmile.com.br`. O histórico do projeto registra contas de teste REAIS criadas em PROD para UATs (e2e.admin@beautysmile.com.br, candidato.funil@teste.com — esta com senha também registrada em docs). Se qualquer conta dessas aceitar 'teste123', o repositório publica um par credencial↔ambiente funcional; e mesmo sem match, rodar a suíte sem .env.test dispara tentativas de login reais contra o Supabase de PROD apontado pelo .env local (contaminação de dados + rate-limit da conta do Fernando).

**Cenário de falha:** Repo é compartilhado/publicado (ou um contractor clona); atacante tenta os pares hardcoded contra o endpoint Supabase que está no bundle público → login como admin de PROD se qualquer senha de conta de teste ficou como 'teste123'. Cenário menor: dev roda `npm run test:e2e` sem env e polui candidaturas de PROD via specs DB-write mal-gated.

**Fix proposto:** Remover os fallbacks: `const password = process.env.TEST_USER_PASSWORD` + `test.skip(!password, ...)`. Rotacionar a senha de qualquer conta PROD que já tenha usado 'teste123' e deletar e2e.admin conforme já anotado como pendência.


## ⚪ LOW

### A48. MAX_ATTEMPTS / AI_CALL_TIMEOUT_MS via Number(env) sem guarda de NaN — um env var malformado desliga silenciosamente o caminho Anthropic

`EFs de IA` · esforço **S** · confiança high · votos `CCC`  
**Local:** `supabase/functions/_shared/ai-client.ts:70, 78`

**Defeito:** `Number(Deno.env.get('MAX_ATTEMPTS') ?? '3')` só protege contra AUSÊNCIA do env, não contra valor inválido. Se um operador setar MAX_ATTEMPTS='3 tentativas' ou AI_CALL_TIMEOUT_MS='25s' no painel do Supabase, Number() vira NaN: `attempt < NaN` é false → o loop Anthropic executa ZERO tentativas e TODA chamada cai direto no fallback gpt-4o-mini com error_code 'anthropic_retries_exhausted' e triggerError null; um timeout NaN passado ao SDK também degrada o comportamento de timeout. Falha silenciosa (nenhum warn) e global a todas as EFs de IA no próximo redeploy.

**Cenário de falha:** Durante um incidente, alguém seta AI_CALL_TIMEOUT_MS='60s' (com sufixo) para 'aumentar o teto'. A partir do próximo cold start, timeout=NaN é passado ao SDK e, no caso do MAX_ATTEMPTS análogo, todas as avaliações de candidatos passam a ser feitas pelo gpt-4o-mini sem nenhum sinal além do provider nos logs — dias de triagem com o modelo errado.

**Fix proposto:** Sanitizar com guarda: `const n = Number(env); const MAX_ATTEMPTS = Number.isFinite(n) && n >= 1 ? n : 3;` (idem para o timeout, exigindo > 0), logando console.warn quando o valor for descartado.

### A49. Backup PII permanente e fora do alcance de RLS/erasure: backup_m2.candidaturas_pre_funil nunca é limpo

`Modelo de dados` · esforço **S** · confiança high · votos `CCC`  
**Local:** `supabase/migrations/20260607000002_etapa_processo_v2_cutover.sql:48-50`

**Defeito:** O cutover copiou candidaturas inteira (curriculo_url, feedback_rejeicao, timestamps — dados pessoais) para backup_m2.candidaturas_pre_funil como rede de segurança da migração de enum de 2026-06-07. Nenhuma migration posterior faz DROP. A tabela não tem RLS (schema fora do exposed do PostgREST, então não é vazamento via API), mas: (1) hard-deletes/erasure LGPD em public.candidaturas não alcançam a cópia — um pedido de eliminação de dados atendido em public deixa o registro vivo no backup; (2) o data_deletion_log (20260609000001) não contempla o schema backup_m2, então o processo de erasure é estruturalmente incompleto enquanto a tabela existir.

**Cenário de falha:** Candidato exerce direito de eliminação (LGPD Art. 18 V); o fluxo apaga candidaturas/respostas/historico em public e registra em data_deletion_log — mas backup_m2.candidaturas_pre_funil mantém a candidatura dele indefinidamente; numa fiscalização ou incidente de acesso ao banco, a empresa não consegue demonstrar eliminação completa.

**Fix proposto:** Migration de expurgo: `DROP TABLE backup_m2.candidaturas_pre_funil; DROP SCHEMA backup_m2;` (a janela de rollback do cutover já passou há semanas e o dump de PROD cobre disaster recovery), ou no mínimo documentar retenção com prazo e incluir o schema no fluxo de erasure.

### A50. Dependências de produção instaladas e nunca importadas: motion e @supabase/auth-helpers-react (deprecated)

`Deps/config` · esforço **S** · confiança high · votos `CCC`  
**Local:** `package.json:34, 51`

**Defeito:** grep em todo src/: zero imports de `motion` (nem 'motion/react', nem framer) e zero imports de `@supabase/auth-helpers-react` (pacote oficialmente deprecated pela Supabase em favor de @supabase/ssr; o projeto usa o client anon direto em src/lib/supabase/client.ts). Ambos ficam no dependency tree de produção (motion 12.23.24 é uma família grande) — superfície de supply-chain e npm audit gratuita, e motion ainda está com versão "*" (agrava o achado dos wildcards).

**Cenário de falha:** Uma release comprometida ou vulnerável de motion/auth-helpers entra via `npm update` (motion é "*"); o time gasta tempo triando um advisory de um pacote que nenhuma linha de código usa — ou pior, um postinstall malicioso roda na máquina com a service_role key.

**Fix proposto:** `npm uninstall motion @supabase/auth-helpers-react`; conferir na mesma passada os devDeps `openai`/`@anthropic-ai/sdk` (não encontrei import em src/scripts/tests — se existem só para type-hints dos arquivos Deno, documentar no package.json com comment ou remover).

### A51. Config verify_jwt por Edge Function não está declarada no repo (sem supabase/config.toml) e deno.lock é gitignorado

`Deps/config` · esforço **S** · confiança medium · votos `CCC`  
**Local:** `supabase/:.gitignore:91 (deno.lock); supabase/ contém apenas functions/, migrations/, seed.sql`

**Defeito:** A divisão de deploy das 12 EFs (analise-candidato-individual e cost-alerter com --no-verify-jwt + Bearer self-auth; as demais JWT-ON) vive apenas em flags de CLI históricos e memória de sessão — não há supabase/config.toml com blocos `[functions.X] verify_jwt = false` versionados. Além disso, deno.lock está no .gitignore (linha 91), então as dependências transitivas dos imports `npm:` das EFs (os pins diretos @0.102.0/6.42.0/3.25.76 são estáticos, ok) não são reproduzíveis entre máquinas/deploys.

**Cenário de falha:** Alguém redeploya uma EF JWT-ON por engano com `--no-verify-jwt` (ou o inverso) num hotfix; sem declaração versionada, ninguém detecta o drift no review — a EF passa a depender só do seu próprio check interno (e cadastrar-candidato/submit-candidatura fazem getUser, mas um futuro EF sem self-auth ficaria aberto). Já aconteceu drift de bundle de _shared exatamente por processo de deploy manual (reference_ef_shared_bundle_freeze).

**Fix proposto:** Criar supabase/config.toml com `[functions.<nome>] verify_jwt = true/false` explícito para as 12 EFs (o CLI ≥1.10 lê isso no deploy, eliminando a flag manual); remover deno.lock do .gitignore e commitá-lo.

### A52. npm run lint (tsc) não cobre e2e/, scripts/ nem playwright.config — TS desses diretórios nunca é type-checkado

`Deps/config` · esforço **S** · confiança medium · votos `CCR`  
**Local:** `tsconfig.json:29 ("include": ["src"])`

**Defeito:** O tsconfig raiz inclui apenas src/ (tsconfig.node.json cobre só vite.config.ts). Os 13 specs Playwright em e2e/*.ts, scripts/ e playwright.config.ts não passam por nenhum type-check em lugar nenhum (CI roda `npm run lint` = tsc raiz + vitest + playwright — o Playwright transpila com esbuild sem checagem de tipos). Erros de tipo nos specs (ex.: seletor tipado errado, fixture com shape desatualizado após regenerar database.types.ts) só aparecem como falha de runtime do teste — ou como falso verde se o erro cair em branch não exercido.

**Cenário de falha:** database.types.ts é regenerado com coluna renomeada; um fixture em e2e/fixtures/a11y-session.ts referencia o campo antigo — tsc não vê (fora do include), Playwright roda com o campo undefined e o spec passa vacuamente (asserção em branch morto) → cobertura E2E fantasma.

**Fix proposto:** Adicionar um tsconfig.e2e.json (extends raiz, include e2e/ + playwright.config.ts, types @playwright/test) e encadear no script lint: `tsc --noEmit && tsc -p tsconfig.e2e.json --noEmit`.

### A53. Sessão RH expirada em rota /rh/* é devolvida ao login de CANDIDATO e o LoginRHPage descarta ?redirect — deep link RH perdido

`Frontend` · esforço **S** · confiança high · votos `CCC`  
**Local:** `src/components/RoleGuard.tsx:129-131`

**Defeito:** RoleGuard redireciona QUALQUER usuário não autenticado para /auth/login?redirect=<destino> — inclusive quando a rota protegida é RH/admin. /auth/login é o LoginCandidatoPage (routes.tsx:147), com branding e copy de candidato. Se o RH perceber e for manualmente a /auth/login-rh, o LoginRHPage ignora o parâmetro redirect e navega fixo para '/rh/dashboard' (LoginRHPage.tsx:132), perdendo o deep link. Se ele logar mesmo no login de candidato, o fluxo até funciona, mas onSubmit chama waitForCandidatoHydrated({timeoutMs:3000}) (LoginCandidatoPage.tsx:124) que nunca resolve para role rh → 3s de espera morta antes do navigate.

**Cenário de falha:** Recrutador recebe link direto /rh/candidatos/abc123 (hub de um candidato) com sessão expirada → cai numa tela 'Login Candidato'; confuso, vai ao login RH → após logar aterrissa em /rh/dashboard e o link para o candidato específico se perdeu; em fluxos de UAT/produção isso vira 'o link do sistema não funciona'.

**Fix proposto:** No RoleGuard, escolher o login pelo prefixo da rota (location.pathname.startsWith('/rh') → /auth/login-rh?redirect=...), e no LoginRHPage consumir searchParams.get('redirect') com o mesmo resolveRedirect anti-open-redirect já exportado por LoginCandidatoPage (fallback /rh/dashboard).

### A54. console.log operacional em páginas RH de PROD expõe movimentação de candidatos e emails no DevTools

`Frontend` · esforço **S** · confiança high · votos `CCC`  
**Local:** `src/components/KanbanBoard.tsx:334-357`

**Defeito:** O caminho de mutação do Kanban loga no console de produção o objeto de movimentação do candidato (id, etapas, status — linhas 334, 351, 354) e candidaturasService.ts:874 loga o auto-avanço; ConfiguracoesPage.tsx:491 loga o email do usuário-alvo do reset. O projeto tem regra explícita de zero console.* em código de produto (Pitfall 7 / T-4.1-04, seguida no authStore.hydrateFromSession), mas as páginas legadas RH violam em ~29 arquivos não-teste. Não é vazamento crítico (o RH já vê esses dados na tela), mas polui o console, dificulta suporte e cria hábito de logar payloads que amanhã podem conter PII sensível.

**Cenário de falha:** Sessão de screen-share/gravação de suporte com DevTools aberto expõe ids de candidatura, transições de etapa e emails; um futuro copy-paste desse padrão num service que manipula CPF/CV repete o vazamento em escala.

**Fix proposto:** Remover os console.log/warn dos caminhos de mutação (ou trocar por um logger no-op em PROD gateado por import.meta.env.DEV) e adicionar a regra no-console ao lint quando o ESLint for introduzido; prioridade nos arquivos RH tocados pelo achado #1.

### A55. Devolutiva Big Five sem caminho de recuperação: fan-out best-effort abandona após 10s e o 'retry pelo n8n' citado nos comentários não existe no repo

`Funil` · esforço **M** · confiança high · votos `CCC`  
**Local:** `supabase/functions/submit-bigfive-final/index.ts:227-247`

**Defeito:** submit-bigfive-final invoca gerar-devolutiva-bigfive num Promise.race com timeout de 10s e devolve devolutiva_id:null no timeout, confiando que 'a devolutiva pode ser (re)gerada pelo pipeline assíncrono/retry do n8n' (comentários linhas 229 e 245). Não há nenhum invocador de gerar-devolutiva-bigfive em src/ (grep vazio), nenhum cron (o único cron é o de prompt-library/custos) e nenhum botão RH de regeneração. Se a EF filha falhar de verdade (overload Anthropic, histórico real do projeto: latências 38-102s e timeouts), a devolutiva do candidato fica vazia para sempre; DevolutivaBigFiveView só faz polling de devolutivas_candidato.

**Cenário de falha:** Candidato submete o Big Five durante um overload transiente da Anthropic; as 5 chamadas degradam/falham e a EF filha retorna 500 sem persistir. O submit responde ok (correto, best-effort), mas nenhum mecanismo re-invoca a geração — o candidato abre a tela de devolutiva indefinidamente vazia e o compromisso LGPD/RF-19a de devolutiva não se cumpre.

**Fix proposto:** Adicionar UMA superfície de retry real: botão RH 'Regerar devolutiva' (EF já é idempotente via upsert + idempotency_key por dim/banda) ou um pg_cron que re-invoca para scores big_five sem row em devolutivas_candidato após N minutos. Corrigir os comentários que citam um pipeline n8n inexistente.

### A56. sync-prompts (pipeline que escreve em PROD com service_role) tem teste que nunca roda: excluído do Vitest e sem step de teste no workflow que o executa

`Testes` · esforço **S** · confiança high · votos `CCC`  
**Local:** `vite.config.ts:21`

**Defeito:** scripts/__tests__/sync-prompts.test.ts é excluído do Vitest pelo glob 'scripts/**' (vite.config.ts:21, é teste Deno) e o prompts-sync.yml — que roda o script real com SUPABASE_SERVICE_ROLE_KEY em merge para main — instala Deno mas só faz `deno run sync-prompts.ts`, nunca `deno test`. O único teste do pipeline de versionamento de prompts (validação de frontmatter RF-PL-01, colisão semver↔hash RF-PL-11, idempotência) não executa em nenhum runner, local ou CI.

**Cenário de falha:** Refactor no parsing de frontmatter do sync-prompts.ts quebra a detecção de colisão RF-PL-11; o teste que a cobriria não roda; no próximo merge tocando templates, uma versão de prompt divergente com mesmo semver entra silenciosamente em prompt_versions de PROD, corrompendo a trilha de auditoria git→DB.

**Fix proposto:** Adicionar `deno test --allow-read scripts/` como step no prompts-sync.yml ANTES do `deno run` (mesmo setup-deno, custo ~segundos), e/ou incluí-lo no job deno-test do achado #1.
