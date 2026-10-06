---
phase: 44-exporta-o-acesso
verified: 2026-10-06T21:33:00Z
status: gaps_found
score: 6/7 must-haves verified
covered_files:
  - ".planning/phases/44-exporta-o-acesso/44-01-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-01-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-02-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-02-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-03-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-03-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-04-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-04-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-05-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-05-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-06-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-06-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-07-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-07-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-08-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-08-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-09-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-09-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-10-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-10-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-11-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-11-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-12-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-12-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-13-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-13-SUMMARY.md"
  - "docs/compliance/__tests__/exportAllowlist.test.ts"
  - "docs/compliance/__tests__/genExportAllowlist.test.ts"
  - "docs/compliance/catalogo-vivo-44.json"
  - "docs/compliance/export-allowlist.json"
  - "docs/compliance/export-scope-rules.yaml"
  - "docs/compliance/sql/05-export-allowlist-drift.sql"
  - "docs/compliance/sql/gen-export-allowlist.cjs"
  - "p46apply.cjs"
  - "src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx"
  - "src/features/pedidos-dados/services/pedidosDadosService.ts"
  - "src/features/privacidade/services/__tests__/exportacaoService.test.ts"
  - "src/features/privacidade/services/exportacaoService.ts"
  - "supabase/functions/_shared/exportAllowlist.ts"
  - "supabase/functions/exportar-meus-dados/__tests__/index.test.ts"
  - "supabase/functions/exportar-meus-dados/index.ts"
  - "supabase/migrations/20260804000001_p44_config_sla_dados.sql"
  - "supabase/migrations/20260804000002_p44_solicitacoes_dados.sql"
  - "supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql"
  - "supabase/tests/p44_export_drift_smoke.sql"
covered_digest: "v2:sha256:788e15f29b77ac4ea850b6113caf24b5f95cf5b5a86102a1c36170e134f0a459"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "O portão do SC#3 que vê o banco (drift do export: universo de tabelas e colunas = catálogo vivo de public) roda de forma recorrente/automática"
    reason: "O operador escolheu cadência MANUAL (BD-14, 2026-10-06). O que a torna aceitável e foi REMEDIDO por este verificador: o universo é o banco medido na execução; o smoke supabase/tests/p44_export_drift_smoke.sql FALHA ALTO e foi visto morder aqui em três direções contra PROD (ver §Spot-checks); o `p46apply.cjs migrate` imprime o lembrete quando o corpo da migration mexe em tabela. Obrigação de execução: rodar o smoke depois de todo apply que crie, renomeie ou remova tabela/coluna em public e antes de toda regeração da allowlist."
    accepted_by: "operador (Fernando) — AskUserQuestion do orquestrador em 2026-10-06, opção «Universo do banco + smoke»; registro em 44-CONTEXT.md §BD-14 e 44-10-SUMMARY.md (a pergunta em si não é reproduzível por este verificador; vale o registro)"
    accepted_at: "2026-10-06"
re_verification:
  previous_status: gaps_found
  previous_score: "5/6 (G5 aberto)"
  previous_report: ".planning/phases/44-exporta-o-acesso/44-VERIFICATION-2026-10-06-pre-G5.md"
  gaps_closed:
    - "G5 — drift do export vivo: 9 colunas sem veredito + 6 tabelas fora do inventário. Remedido hoje em PROD por consulta própria (pg_class/pg_attribute, VALUES derivados do JSON): 75 tabelas vivas = 75 com disposição, 451 pares vivos = 451 com veredito, zero em qualquer das quatro direções"
    - "SC#5 do ROADMAP desatualizado — reescrito em 2026-10-06 (ROADMAP.md Phase 44, SC#5); o override de SC#5 da rodada anterior não é mais necessário e foi aposentado"
    - "Portão do SC#3 que só existia manual e cego ao banco — agora o universo é o banco vivo e o smoke falha alto"
  gaps_remaining:
    - "CR-01 (NOVO nesta rodada, achado da re-revisão e confirmado aqui): a frase «O que não está na cópia», entregue nos DOIS arquivos, é falsa sob a allowlist 1.4.0 — ver gaps"
  regressions: []
gaps:
  - truth: "Objetivo da fase («cópia HONESTA dos próprios dados») e must-have do 44-06 («o que fica de fora aparece na tela E no arquivo com razão nomeada») — o que a cópia diz que NÃO contém é verdade"
    status: failed
    reason: >
      A única fronteira dita ao titular (exportacaoService.ts:530-531, renderizada no .html em :481 e embutida no .json em :706 como
      `o_que_nao_esta_nesta_copia`) afirma que só ficam de fora «registros internos de funcionamento do sistema — por exemplo, o tempo e o custo
      de processamento das nossas ferramentas de tecnologia. Eles descrevem o sistema, não você.» O artefato 1.4.0 retém, com decisão registrada,
      coisas que NÃO descrevem o sistema: `retencao_hold.detalhe` (texto livre do RH sobre guardar os dados DESTA pessoa além do prazo — medido
      hoje em PROD: a única linha de retencao_hold tem detalhe preenchido, e é de candidatura de candidato vivo), `solicitacoes_dados.plano`
      (a ficha do motor de exclusão sobre o pedido DELA; 2 de 8 linhas preenchidas), os ids da equipe em 4 colunas novas
      (`criado_por`, `liberado_por`, `revogado_por`), e — já desde a 1.0.0 — `decisao_final(.historico).justificativa` (texto do RH sobre a
      decisão, BD-9 antigo, ainda «EM ABERTO» no próprio artefato). O texto da cópia não nomeia nenhuma dessas categorias, e `abertura` diz que
      a cópia é «dos dados que a Beauty Smile guarda sobre você». Ninguém na rodada G5 (44-10..44-13) tocou esse texto; o caso (p5) prende só rótulos.
      Pesagem (pedida pelo orquestrador): isto É lacuna contra o objetivo, não nota de qualidade de código. A retenção em si é decisão do operador
      e não é o defeito; o defeito é a promessa errada sobre ela — e o próprio projeto já tratou o espelho dessa classe como defeito («uma cópia
      mais generosa que a promessa ainda é uma promessa errada», docblock de `oQueEsta`). Menos generosa que a promessa, e dizendo isso falsamente,
      é pior. Atenuante MEDIDO: 0 pedidos `acesso` depois do front de 21:13Z (último pedido em 2026-09-20, sob versões anteriores), então nenhum
      titular recebeu ainda a frase sob a 1.4.0 — corrigir agora custa só um push de front, sem retratação a ninguém. Fato que reforça (WR-05/WR-06
      medidos aqui): o titular já consegue ler `cognitivo_liberacao.liberado_por` (e `solicitacoes_dados.plano`) pela própria RLS, então a retenção
      da cópia não é proteção — é só uma cópia que se diz mais completa do que é.
    artifacts:
      - path: "src/features/privacidade/services/exportacaoService.ts"
        issue: "COPY_PEDIR_COPIA.oQueNaoEsta (l.530-531) descreve só telemetria; consumida em :481 (.html) e :706 (.json `o_que_nao_esta_nesta_copia`). Publicada no chunk index-BgK7K5Is.js (medido no site em produção hoje)"
      - path: ".planning/phases/44-exporta-o-acesso/44-UI-SPEC.md"
        issue: "§Copywriting (l.467) e a seção de fronteira (l.528) fixam a mesma frase como contrato de copy; a correção passa pela UI-SPEC"
    missing:
      - "Reescrever `oQueNaoEsta` com as categorias reais retidas (identificação de quem da equipe agiu; anotações internas da equipe sobre conservação além do prazo — o motivo e as datas entram; a ficha técnica do motor de exclusão; o texto da justificativa da decisão final enquanto o BD-9 antigo estiver aberto; telemetria técnica das ferramentas), com canal de contato; a redação sugerida está em 44-REVIEW.md §CR-01"
      - "Teste que prenda a frase ao artefato: toda família de razão em `colunas_excluidas`/`excluidas` (pii_de_terceiro, decisoes_por_coluna, telemetria_interna, etc.) tem de mapear para uma cláusula de `oQueNaoEsta`, para que o próximo veto não suba sem atualizar a frase"
      - "Publicar SÓ o front (a EF não participa: a frase nasce em `exportacaoService`), conferir o marcador novo no chunk publicado e `git log origin/main..HEAD` vazio"
deferred: []
advisory:
  - finding: "WR-01 (re-revisão) REPRODUZIDO: a asserção (k) extrai tuplas do VALUES por regex rígida (^ {4}('x','y'),?$); numa cópia de scratch do smoke injetei duas tuplas — uma no formato canônico (+1 na extração rígida) e uma com espaço depois da vírgula (invisível: rígida 396, permissiva 397). Linhas fora do formato executam no SQL e a (k) não as conta"
    category: other
    reason: "Exige edição manual de um arquivo que o gerador escreve; não derruba nenhum must-have. A correção sugerida (contar tuplas com regex permissiva e exigir igualdade) é pequena. Não bloqueia; o portão vivo (smoke) morde, e é ele o guardião do SC#3"
    evidence_status: "reproduzido por python sobre cópia em scratchpad; o repositório não foi alterado"
  - finding: "WR-03 (re-revisão) CONFIRMADO POR LEITURA: o DO $gate$ do smoke faz `IF (r->>'k')::int = 0 OR … ` e `IF (r->>'n_drift')::int > 0`; chave renomeada → NULL → ramo pulado → 'pass', true. Hoje as chaves batem (smoke aprova e morde)"
    category: other
    reason: "Fail-open latente; só se manifesta se alguém renomear uma chave do json_build_object sem tocar o DO. WR-02 (nada prende a estrutura do smoke) é o que permitiria isso passar calado. Fecham juntos: coalesce/IS DISTINCT FROM 0 + asserção estrutural sobre o smoke"
    evidence_status: "lido (p44_export_drift_smoke.sql l.688-711)"
  - finding: "WR-05 (re-revisão) CONFIRMADO EM PROD com JWT personificado de candidato: como `authenticated` com `sub` de um titular, `SELECT … FROM cognitivo_liberacao` devolve 2 linhas próprias e as 2 trazem `liberado_por` não nulo (has_column_privilege('authenticated', …, 'liberado_por','SELECT') = true; policy «Candidato ve a propria liberacao»). `anon` não tem privilégio de tabela (42501)"
    category: security
    reason: "Exposição de ids de equipe ao titular que o BD-9 trata como PII de terceiro e que o export retém — pré-existente (migration 20260826000007), fora do que a Phase 44 entrega; vale um `GRANT SELECT (colunas)` estreito em fase própria. Não é o SC#1, mas torna a retenção da cópia inócua e reforça o CR-01"
    evidence_status: "medido (consultas SET TRANSACTION READ ONLY + SET LOCAL ROLE; só contagens, nenhum valor lido)"
  - finding: "WR-06 (re-revisão): `solicitacoes_dados.plano` está fora da cópia por veredito do ORQUESTRADOR (BD-13 ii), que o operador nunca respondeu; medido que o titular tem SELECT na coluna (privilégio + policy `solicitacoes_dados_candidato_own_read`), logo a retenção não protege nada e a categoria precisa entrar na frase do CR-01"
    category: other
    reason: "Decisão de política pendente do operador, não defeito de código; registrada no CONTEXT com autoria correta"
    evidence_status: "has_column_privilege('authenticated','public.solicitacoes_dados','plano','SELECT') = true; policy lida"
  - finding: "WR-07 (re-revisão) CONFIRMADO em dados reais: a ordem que o gerador emite em `--sql-values-tabelas` é igual ao sort da linha crua com vírgula final removida, mas diferente do sort depois do `.replace(/[(),']/g,'|')` que a (i2) usa; passa hoje só porque a fixture não tem nomes com prefixo comum (a real tem decisao_final / decisao_final_historico)"
    category: other
    reason: "Bomba-relógio de falso vermelho (primeiro modo de falha da tabela de portões do CLAUDE.md); não afeta o score"
    evidence_status: "executado: gerador real vs mapeamento do teste"
  - finding: "WR-02/WR-04, IN-01..IN-06 da re-revisão NÃO foram remedidos por este verificador (aceitos como leitura do revisor, todos `open` em 44-REVIEW-DISPOSITION.md). IN-07 (premissa do BD-11) FOI remedida: 230 itens em purga_execucao_itens, todos de execuções em modo dry_run; 0 itens de execução não-ensaio com titular vivo — a premissa vale hoje, e nenhum portão a vigia"
    category: other
    reason: "Dívida de endurecimento de portões, sem must-have falho; recomenda-se uma rodada de fechamento junto com o CR-01"
    evidence_status: "IN-07: consulta read-only; demais: leitura de 44-REVIEW.md"
  - finding: "O front público (index-BgK7K5Is.js, medido no site) embute o artefato inteiro, incluindo o texto das razões — com frases como «a única linha de retencao_hold tem detalhe PREENCHIDO» e «pode conter estratégia de litígio». Padrão desde a 1.0.0 (o front importa o espelho .ts), mas a 1.4.0 passou a levar uma afirmação sobre o estado de PROD para o bundle de qualquer visitante"
    category: security
    reason: "Informativo: vazamento de metadados de decisão, não de dado. Se o CR-01 for corrigido por um `oQueNaoEsta` derivado do artefato, convém separar `razao` (interna) do que o front precisa"
    evidence_status: "grep no JS publicado em rh.beautysmile.com.br"
  - finding: "T2 (herdado): src/store/authStore.ts usa .select('*') — fora do SC#1/EXPORT-02 (JSON do export só nasce na EF e no exportacaoService; nenhum importa authStore). Não reverificado nesta rodada"
    category: security
    reason: "Escopo próprio (classe C do 44-PENDENCIAS); não bloqueia a Phase 44"
    evidence_status: "carregado do relatório de 2026-10-06 (não alterado: nenhum commit toca authStore desde então — `git diff 797c6110..HEAD` não lista o arquivo)"
  - finding: "U1 (herdado): nenhum titular pediu cópia sob 1.3.0 nem 1.4.0 (0 pedidos depois de 2026-09-20). O aceite do operador («não vou testar») cobria a 1.3.0; agora vale também para uma 1.4.0 que renderiza duas seções novas nunca vistas por um titular"
    category: other
    reason: "Depois de corrigir o CR-01, é o momento de UM pedido real da conta de teste para ver as seções «Conservação dos seus dados além do prazo» e «Liberação da avaliação cognitiva» e a frase nova no .html e no .json"
    evidence_status: "medido: acesso_depois_1_4_0 = 0; ultimo = 2026-09-20T20:30-03"
human_verification: []
---

# Phase 44: Exportação & Acesso — Relatório de Verificação (re-verificação após a rodada G5, 44-10..44-13)

**Objetivo da fase:** O candidato recebe uma cópia **honesta** dos próprios dados — e o sistema ganha, **exercitado em produção**, o inventário de PII que a fase irreversível vai consumir como plano de exclusão em vez de um palpite novo.
**Verificado em:** 2026-10-06T21:33Z
**Status:** gaps_found (6/7)
**Re-verificação:** Sim — baseline `44-VERIFICATION-2026-10-06-pre-G5.md` (gaps_found 5/6, G5 aberto).

> Postura: o G5 está FECHADO de verdade e a fase continua REPROVADA por um defeito que a rodada de fechamento não viu e que atinge a palavra «honesta» do objetivo. Nada abaixo foi aceito porque um SUMMARY disse. Toda leitura de PROD foi `SET TRANSACTION READ ONLY` via `p46apply.cjs run` ou `GET` na Management API; as mordidas do portão foram feitas em cópias de scratch dentro de transação somente-leitura (nada persiste, nenhum arquivo do repositório foi alterado). Nenhum commit, deploy ou escrita foi feito por este verificador.

## O que foi remedido hoje (não herdado)

| Verificação | Resultado |
|---|---|
| `npm run check:export-allowlist` | OK, artefato e espelho `.ts` em sincronia com as três fontes |
| Vitest: `exportAllowlist`, `genExportAllowlist`, `src/features/pedidos-dados`, `src/features/privacidade` | 18 arquivos, **244/244** |
| `deno test --allow-all supabase/functions/exportar-meus-dados/` | **21 passed, 0 failed** (inclui (19) do G5) |
| EF em PROD (`GET /functions/exportar-meus-dados`) | **v6, ACTIVE, verify_jwt=true**, atualizada 2026-10-06T21:15:23Z; corpo publicado: `1.4.0` ×1, `1.3.0` ×0, `retencao_hold` ×4, `cognitivo_liberacao` ×2, `select("*")` ×0; **todas as 1325 linhas de `_shared/exportAllowlist.ts` aparecem no corpo publicado** (as 36 linhas de `index.ts` ausentes são só reformatação do bundler: `index.ts` não mudou na rodada G5) |
| Front em produção (rh.beautysmile.com.br) | `assets/index-BgK7K5Is.js` contém «Conservação dos seus dados além do prazo», `retencao_hold` e o `cognitivo_liberacao` com colunas 1.4.0; 4aa9f2ca é ancestral de `origin/main` |
| Smoke `p44_export_drift_smoke.sql` contra PROD, em transação READ ONLY | `pass: true`, 75/75 tabelas, 451/451 pares, `n_drift` 0 — prova adicional de que o arquivo não escreve |
| Relatório `05-export-allowlist-drift.sql` contra PROD (READ ONLY) | `[]` |
| **Consulta INDEPENDENTE** (pg_class/pg_attribute — não `information_schema` —, VALUES montados por mim a partir do JSON) | 75 vivas = 75 conhecidas; 451 pares vivos em escopo = 451 com veredito; `viva_sem_disposicao`, `conhecida_sem_viva`, `viva_sem_veredito`, `veredito_sem_viva` todos `[]`. Isto fecha o ponto cego IN-05 da re-revisão para o estado de hoje |
| **O portão MORDE** (3 cópias de scratch, cada uma sem UMA linha do VALUES, READ ONLY) | `retencao_hold.detalhe` removida → `P44-DRIFT FAIL … n_pares_com_veredito=450 … COLUNA NOVA NO BANCO`; `purga_execucao_itens` removida → `… n_tabelas_com_disposicao=74 … TABELA NOVA NO BANCO`; `candidaturas.encerrada_a_pedido_em` removida → `… COLUNA NOVA NO BANCO`. Em todas, `diff` = 1 linha contra o arquivo versionado |
| `(e)` do teste de allowlist | agora testa a NEGAÇÃO (linha 688: «meta declara que a Phase 45 NÃO consome…»); passa |
| Importadores de `EXPORT_ALLOWLIST` fora de testes | exatamente 2: `exportacaoService.ts:61` e `exportar-meus-dados/index.ts:58` — EXPORT-06 vale |
| `.select('*')` em privacidade / pedidos-dados / EF | só em comentários que o proíbem |
| `TBD`/`FIXME`/`XXX` nos 13 arquivos de código tocados desde `797c6110` | nenhum |
| `promessasComExecutor.test.ts` | as mesmas 2 falhas citadas pelo orquestrador, reproduzidas isoladamente; `faseDona('Phase 46')` espera `open` e o ROADMAP tem a Phase 46 `[x]` desde 2026-10-05; `git diff 797c6110..HEAD -- ROADMAP.md` não toca a linha da 46. Não é da Phase 44 |

A suíte completa (2417/2419) e o `tsc` não foram reexecutados aqui; valem os números do orquestrador, que nada contradisse nos recortes que rodei.

### População medida antes de qualquer booleano (2026-10-06 ~21:30Z)

| O quê | Valor | Por que importa |
|---|---|---|
| `solicitacoes_dados` total / `acesso` / `acesso`+`atendido`+causa NULL / `acesso`+`pendente` | 8 / 3 / 3 / **0** | a faixa de prazo âmbar/vermelha segue sem linha pendente real (U2) |
| `acesso` com `solicitado_em` ≥ 2026-10-06T21:13Z (front 1.4.0 no ar) | **0** (último: 2026-09-20) | nenhum titular recebeu ainda a frase do CR-01; correção é grátis agora |
| `retencao_hold` total / com `detalhe` preenchido / de candidatura de candidato vivo | 1 / **1** / 1 | o veto de `detalhe` protege dado que existe — e o titular dele não é avisado |
| `cognitivo_liberacao` total / com `liberado_por`/`revogado_por` | 4 / 4 | idem para ids de equipe |
| `purga_execucao_itens` total / de execuções fora do modo dry_run com titular vivo | 230 / **0** | premissa do BD-11 vale hoje (IN-07) |
| `usuarios_rh` ativos | administrador 3, recrutador 1 | o ramo `rh` da fila não é vazio |
| `pg_policies` que citam `created_by` | **0** | G4-b segue fechado |

## Verdades observáveis

| # | Verdade | Status | Evidência |
|---|---|---|---|
| 1 | SC1 (mecanismo) — o candidato pede a cópia pelo painel e recebe JSON montado por allowlist explícita, nunca `select('*')` | ✓ VERIFICADO | EF v6 ativa; `index.ts` inalterado desde o v5 provado; 21/21 Deno; 0 `select("*")` no corpo publicado; 3 pedidos reais atendidos (último 2026-09-20). Ressalva herdada: titular = conta de teste do operador, e a 1.4.0 nunca passou por um titular (U1) |
| 2 | **Objetivo / 44-06 — a cópia é HONESTA sobre o que deixa de fora** | **✗ FAILED** | Ver §Gaps. Frase falsa nos dois arquivos, publicada no front |
| 3 | SC2 — currículo por signed URL de TTL curto, nunca inline/base64 | ✓ VERIFICADO | `TTL_CURRICULO_SEGUNDOS = 60` (`exportacaoService.ts:914`), `createSignedUrl` no cliente (:1046), sem `service_role`; testes de `privacidade` verdes; evidência de B14/B15 e 18/18 prefixo=owner herdadas do relatório anterior (não regrediram: nenhum commit toca o caminho do CV nesta rodada além de rótulos) |
| 4 | SC3 — coluna nova quebra o snapshot; nenhuma entra por acidente, nenhuma sai em silêncio | ✓ VERIFICADO (override na cadência) | Lado «entra por acidente»: allowlist explícita + 3 snapshots + `--check` verdes. Lado «sai em silêncio»: o portão que vê o banco existe, tem universo = banco vivo, aprova hoje com consulta independente concordando e MORDE em três direções. Cadência manual = override BD-14 (frontmatter). As fraquezas do guarda do guarda (WR-01/02/03/04) estão em `advisory`, não anulam o portão vivo |
| 5 | SC4 — prazo do Art. 19, II medido do registro e visível ao RH, pedido perto do prazo distinguível | ✓ VERIFICADO | 244/244 incluem a feature; rota `/rh/pedidos-dados` (`routes.tsx:513`); catálogo vivo: `listar_pedidos_dados`/`contar_pedidos_dados_pendentes` sem `created_by`, com `is_active_rh_user`, `anon` sem EXECUTE; recrutador ativo = 1. **Fecha o 44-09:** a causa do `[ ]` (ramo `rh` vazio) não existe mais; Phase 50 está `[x]` no ROADMAP e `pg_policies`/funções confirmam. Vácuo declarado: 0 pendentes reais |
| 6 | SC5 (redação NOVA do ROADMAP, 2026-10-06) — inventário nomeado e versionado, projeção do Art. 18, II, consumido só por `exportar-meus-dados` e `exportacaoService`; o plano de exclusão vem do `pii-inventory.yaml` | ✓ VERIFICADO | `export-allowlist.json` v1.4.0 gerado por `gen-export-allowlist.cjs`; `meta.consumidores` diz «Phase 45 — NÃO consome…»; os dois únicos importadores confirmados. O override de SC#5 da rodada anterior fica aposentado: o ROADMAP agora diz o que o requisito diz |
| 7 | EX06 (EXPORT-06 reescrito em 2026-10-04) | ✓ VERIFICADO | idem; `(e)` testa a negação |

**Score:** 6/7. 0 verdades presentes-mas-comportamento-não-exercitado.

## Gaps

### CR-01 — a fronteira dita ao titular é falsa (BLOCKER contra o objetivo)

Resumo do raciocínio de peso, a pedido do orquestrador:

1. **O que a frase diz** (`exportacaoService.ts:530`): fora ficam só registros internos de funcionamento, «tempo e custo de processamento das nossas ferramentas». **O que o artefato retém** (medido hoje no JSON 1.4.0, não por SUMMARY): 56 colunas excluídas e 43 tabelas excluídas; entre elas, texto do RH sobre a pessoa (`retencao_hold.detalhe`, `decisao_final(.historico).justificativa`), a ficha do motor sobre o pedido dela (`solicitacoes_dados.plano`), ids da equipe em 20+ colunas, e as tabelas `logs_acesso`/`notificacoes_enviadas`.
2. **A frase já era incompleta antes do G5** (justificativa e ids de equipe existem desde a 1.0.0), mas o G5 a tornou falsa de um jeito novo e mensurável: o operador decidiu reter `detalhe` (BD-10) e o próprio artefato registra que há uma linha real com ele preenchido.
3. **Não é a retenção que reprova**, é a promessa. O SC#1 pede «o que o sistema realmente guarda sobre ele»; o objetivo pede «honesta»; o 44-06 pede «o que fica de fora aparece … com razão nomeada» — e a razão nomeada é uma categoria que o conteúdo retido não pertence.
4. **A correção é pequena e só de front.** Atenuante: nenhum titular recebeu ainda a frase sob a 1.4.0 (0 pedidos depois de 21:13Z). Se ninguém corrigir antes do primeiro pedido real, passa a existir um titular com uma cópia que mente sobre si mesma, e o projeto o ensinou duas vezes (memória: «saída válida não é evidência de critério», «ressalva infundada é o espelho da fotografia») que o reparo depois do fato custa mais.

Esta verificação não o classifica como `human_needed`: não há dúvida de fato a decidir por humano; o texto é observavelmente falso. O que exige o operador é só a **política** (WR-06: o titular deve receber `plano`? o BD-9 antigo sobre `justificativa`?) — e isso pode seguir aberto, desde que a frase diga que a categoria existe.

### O que NÃO é gap (pesado e descartado)

- **WR-01..WR-04, WR-07, IN-01..IN-07** — fraquezas do guarda do guarda ou de endurecimento. O portão vivo foi remedido e morde; nenhuma delas faz um must-have falhar hoje. Ficam em `advisory` (reproduzi WR-01, WR-03, WR-07 e IN-07).
- **WR-05** — exposição real, medida em PROD, mas pré-existente e fora do que a Phase 44 entrega; vira fase/plano próprio (`GRANT SELECT (colunas)` estreito).
- **Cadência manual do portão** — override BD-14 do operador.

## Cobertura de requisitos (IDs de todos os 13 PLANs × REQUIREMENTS.md)

| Requisito | Planos | REQUIREMENTS.md | Avaliação |
|---|---|---|---|
| EXPORT-01 | 44-02, 44-05, 44-06 | `[x]` | SATISFEITO (titular = conta de teste do operador) |
| EXPORT-02 | 44-01, 44-03, 44-05, 44-11, 44-12, 44-13 | `[x]`, «PROD roda 1.4.0 desde 06/10/2026 (EF v6)» | SATISFEITO no mecanismo e a afirmação da linha 93 está CERTA (v6 medida); a honestidade da fronteira é o CR-01, registrado no nível do objetivo |
| EXPORT-03 | 44-07 | `[x]` | SATISFEITO |
| EXPORT-04 | 44-03, 44-10, 44-11, 44-12 | `[x]` | SATISFEITO — o texto «coluna nova não pode vazar» vale, e o lado «não sai em silêncio» do SC#3 está fechado |
| EXPORT-05 | 44-02, 44-04, 44-08, 44-09 (+ Phase 50) | `[x]` | SATISFEITO |
| EXPORT-06 | 44-01, 44-03, 44-06, 44-10 | `[x]` (redação nova) | SATISFEITO |

**Órfãos:** nenhum. REQUIREMENTS.md mapeia exatamente EXPORT-01..06 à Phase 44 e os 6 IDs aparecem em PLANs.

## Artefatos e wiring

| Artefato | Status |
|---|---|
| `export-allowlist.json` 1.4.0 ↔ `_shared/exportAllowlist.ts` ↔ EF publicada | VERIFICADO (`--check` OK; 1325/1325 linhas no corpo publicado) |
| `export-scope-rules.yaml` + `catalogo-vivo-44.json` | VERIFICADO contra o banco vivo (consulta independente) |
| `05-export-allowlist-drift.sql` / `p44_export_drift_smoke.sql` | VERIFICADO, MORDE, MANUAL por override |
| `exportacaoService.ts` | VERIFICADO e CONECTADO — rótulos 1.4.0 no bundle publicado; **`oQueNaoEsta` falso (CR-01)** |
| `p46apply.cjs` lembrete BD-14 | EXISTE (l.122-131); regex estreita demais (IN-04, advisory) |
| `src/features/pedidos-dados/*` + migration 20261005000003 | VERIFICADO e CONECTADO |

Fluxo de dados (Nível 4): `payload[tabela]` ← `supabaseAdmin.from(t).select(allowlist 1.4.0)` — FLUINDO (451 pares existem no banco vivo; 0 inexistentes). Fila RH ← RPCs DEFINER — FLUINDO (sem pendente real).

## Escrituração para o orquestrador (nada foi editado por este verificador)

- **Caixas do ROADMAP 44-05, 44-07, 44-09:** a evidência para virá-las existe e foi remedida aqui — 44-05 (EF v6 ativa, 3 linhas `acesso`/`atendido` no banco), 44-07 (TTL 60 s no código, bucket privado documentado, 18/18 já medido), 44-09 (a causa do defeito, `created_by`, não existe mais: 0 policies, 0 citações nas RPCs, 1 recrutador ativo; Phase 50 `[x]`). Recomendo que o operador as vire; elas independem do CR-01. A caixa da fase 44 (`- [ ] **Phase 44`) deve ficar `[ ]` até o CR-01 fechar.
- **`44-REVIEW-DISPOSITION.md`:** todas as 15 linhas seguem `open`; CR-01 passa a ter linha em `gaps` aqui — dispor em plano de fechamento (`/gsd-plan-phase 44 --gaps`), junto com WR-01/02/03 (pequenos, mesmo arquivo de teste/smoke) e, por decisão do operador, WR-05/06.

## Resumo

A rodada G5 fez o que prometeu e eu o confirmei por medição própria: o universo do drift é o banco (75 = 75, 451 = 451, consulta independente por catálogo de sistema), o smoke aprova em PROD e morde nas três direções, a EF v6 e o front publicado carregam a 1.4.0, o SC#5 do roadmap diz agora o que o requisito diz, e a causa do `[ ]` do 44-09 já não existe. O que a rodada não viu — porque ninguém a incumbiu de olhar — é que a única frase que o titular lê sobre o que ficou de fora virou falsa quando o operador decidiu reter o raciocínio do RH e a ficha do motor. Contra um objetivo cuja primeira palavra é «honesta», isso é lacuna. É a única, é de front, e ainda não feriu ninguém.

---

_Verificado: 2026-10-06T21:33:00Z_
_Verificador: Claude (gsd-verifier)_
