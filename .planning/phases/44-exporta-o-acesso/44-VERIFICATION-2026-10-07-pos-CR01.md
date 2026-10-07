---
phase: 44-exporta-o-acesso
verified: 2026-10-07T01:45:00Z
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
  - ".planning/phases/44-exporta-o-acesso/44-14-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-14-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-15-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-15-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-16-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-16-SUMMARY.md"
  - "docs/compliance/__tests__/exportAllowlist.test.ts"
  - "docs/compliance/__tests__/genExportAllowlist.test.ts"
  - "docs/compliance/catalogo-vivo-44.json"
  - "docs/compliance/export-allowlist.json"
  - "docs/compliance/export-scope-rules.yaml"
  - "docs/compliance/sql/05-export-allowlist-drift.sql"
  - "docs/compliance/sql/gen-export-allowlist.cjs"
  - "p46apply.cjs"
  - "src/features/cadastro/components/steps/AutorizacoesStep.tsx"
  - "src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx"
  - "src/features/pedidos-dados/services/pedidosDadosService.ts"
  - "src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts"
  - "src/features/privacidade/constants/canalPrivacidade.ts"
  - "src/features/privacidade/services/__tests__/exportacaoService.test.ts"
  - "src/features/privacidade/services/exportacaoService.ts"
  - "supabase/functions/_shared/exportAllowlist.ts"
  - "supabase/functions/exportar-meus-dados/index.ts"
  - "supabase/migrations/20260804000001_p44_config_sla_dados.sql"
  - "supabase/migrations/20260804000002_p44_solicitacoes_dados.sql"
  - "supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql"
  - "supabase/tests/p44_export_drift_smoke.sql"
covered_digest: "v2:sha256:92e748eb1851f742edf38c7936cd5710850d16a93a3dc66265ee539b4a75b318"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "O portão do SC#3 que vê o banco (drift do export: universo de tabelas e colunas = catálogo vivo de public) roda de forma recorrente/automática"
    reason: "O operador escolheu cadência MANUAL (BD-14, 2026-10-06). Aceitável porque o universo é o banco medido na execução e o smoke p44_export_drift_smoke.sql falha alto (visto morder em três direções contra PROD na rodada pós-G5; o `p46apply.cjs migrate` imprime o lembrete). Obrigação de execução: rodar o smoke depois de todo apply que crie, renomeie ou remova tabela/coluna em public e antes de toda regeração da allowlist."
    accepted_by: "operador (Fernando) — AskUserQuestion do orquestrador em 2026-10-06, opção «Universo do banco + smoke»; registro em 44-CONTEXT.md §BD-14 e 44-10-SUMMARY.md"
    accepted_at: "2026-10-06"
re_verification:
  previous_status: gaps_found
  previous_score: "6/7 (CR-01 aberto)"
  previous_report: ".planning/phases/44-exporta-o-acesso/44-VERIFICATION-2026-10-06-pos-G5.md"
  gaps_closed:
    - "CR-01 original — a frase da fronteira afirmava que só ficava de fora telemetria e que o retido «descreve o sistema, não você». Essa frase saiu: 0 ocorrências nos 47 JS publicados (index-DTxaEkc3.js + 46 chunks lazy). A frase nova nomeia as categorias reais (equipe, anotações de conservação, ficha do motor, justificativa da decisão final) e o canal"
    - "Canal de privacidade: rh@beautysmile.com.br no sistema inteiro; lgpd@beautysmile ausente de todos os 47 JS publicados"
    - "WR-01/02/03/07 da re-revisão G5 (portões de drift endurecidos): confirmados na revisão pós-CR-01; Vitest dos arquivos tocados 148/148 nesta rodada (exportacaoService, docs/compliance, constants)"
  gaps_remaining:
    - "CR-01-bis (NOVO, achado da revisão pós-publicação, confirmado aqui de forma independente): a frase nova afirma que a «configuração do próprio sistema» retida «é o mesmo para todos os candidatos», mas a categoria contém `entrevista_guias`, que é por candidatura"
  regressions: []
gaps:
  - truth: "Objetivo da fase («cópia HONESTA dos próprios dados») e must-have do 44-06 («o que fica de fora aparece na tela E no arquivo com razão nomeada») — o que a cópia diz que NÃO contém é verdade"
    status: failed
    reason: >
      A frase publicada (exportacaoService.ts:555, renderizada no .html em :481 e embutida no .json em :730; no ar em index-DTxaEkc3.js, 1 ocorrência)
      diz que não entram «a configuração do próprio sistema, como o texto das vagas e das perguntas, que é o mesmo para todos os candidatos».
      A família `configuracao_do_produto` que essa cláusula cobre (CLAUSULA_POR_FAMILIA, exportacaoService.test.ts:744) tem 23 tabelas no artefato 1.4.0,
      e UMA delas é por pessoa: `entrevista_guias` (export-scope-rules.yaml:372; export-allowlist.json:19).
      Confirmado por mim, no disco e em PROD, sem herdar do revisor nem do orquestrador:
      (1) DDL (migration 20260624000001:61-67): `candidatura_id uuid NOT NULL REFERENCES candidaturas(id)`, `guia jsonb NOT NULL`; UNIQUE (candidatura_id, tipo) (migration 20260629190949:73).
      (2) A EF que gera o guia (gerar-guia-entrevista/index.ts:270-298) o monta de `scores_candidato` da candidatura (dimensões fracas, score<3 online / <4 presencial) + perfil da vaga;
      o pii-inventory.yaml:559-606 registra «o guia é DERIVADO do currículo». Nuance sobre a premissa do orquestrador: no código lido, a derivação direta é do scorecard da
      candidatura, não do texto do CV; o inventário diz currículo. As duas leituras dão a mesma conclusão: o conteúdo é função da pessoa, logo NÃO é «o mesmo para todos».
      (3) PROD (SET TRANSACTION READ ONLY, só contagens): 6 guias, 4 candidaturas distintas, 4 titulares distintos, todas de candidatura viva; 2 guias com updated_at > created_at
      (editados pelo RH — texto escrito por pessoa da equipe sobre a candidatura).
      (4) O portão (cr1) não vê isto por construção: casa por FAMÍLIA de razão, e `configuracao_do_produto` tem cláusula; o rótulo da família (YAML:347, «conteúdo do produto, não do candidato»)
      é falso para esta tabela e nenhuma asserção cruza «tabela em família genérica» com «tabela com vínculo ao titular».
      Pesagem (pedida): este É o mesmo defeito do CR-01 original em escala menor — uma afirmação POSITIVA e falsa ao titular sobre dado retido que diz respeito a ele — e o próprio projeto
      tratou essa classe como lacuna contra o objetivo (docblock de `oQueEsta`: «uma promessa errada»). Contra-argumentos pesados e não suficientes: (a) a oração relativa pode, em gramática estrita,
      qualificar só «o texto das vagas e das perguntas» — mas a frase delimita a CATEGORIA «configuração do próprio sistema», e o leitor leigo lê o exemplo como a categoria inteira; (b) o conteúdo
      do guia deriva de notas que JÁ estão na cópia («as notas que o sistema calculou sobre ela») — o que reduz o dano, não a falsidade; (c) a tabela é candidate-DENY na RLS, então o titular não a lê
      por outro caminho — o que piora, não melhora, a necessidade de dizê-la. Atenuante MEDIDO: 0 pedidos `acesso` desde 2026-10-06T21:13Z (último 2026-09-20), então nenhum titular recebeu
      esta frase nem a anterior sob a 1.4.0; corrigir agora não exige retratação a ninguém. Custo de corrigir: só front (a EF/allowlist 1.4.0 não mudam).
    artifacts:
      - path: "src/features/privacidade/services/exportacaoService.ts"
        issue: "COPY_PEDIR_COPIA.oQueNaoEsta (l.555) — «que é o mesmo para todos os candidatos» aplicado à categoria que inclui entrevista_guias; consumida em :481 (.html) e :730 (.json `o_que_nao_esta_nesta_copia`); publicada em index-DTxaEkc3.js"
      - path: ".planning/phases/44-exporta-o-acesso/44-UI-SPEC.md"
        issue: "§Copywriting l.467 (e a seção de fronteira) fixam a mesma frase como contrato; a correção passa pela UI-SPEC (o docblock do código proíbe editar a frase direto no .ts)"
      - path: "docs/compliance/export-scope-rules.yaml"
        issue: "l.347 define `configuracao_do_produto` como «conteúdo do produto, não do candidato» e l.372 põe nela uma tabela com candidatura_id; sem razão por tabela"
      - path: "src/features/privacidade/services/__tests__/exportacaoService.test.ts"
        issue: "(cr1) casa por família (l.740-750, 775-818); não enxerga tabela por-titular escondida em família «genérica»"
    missing:
      - "Corrigir a frase pela 44-UI-SPEC e depois por `oQueNaoEsta`: no mínimo tirar «que é o mesmo para todos os candidatos» (ou restringi-lo a «o texto das vagas e das perguntas» com pontuação inequívoca) e NOMEAR o roteiro de entrevista da candidatura dela como categoria retida (ex.: «o roteiro que a equipe monta para conduzir a sua entrevista»). Fechar por nomear é suficiente, como foi com BD-16/`plano`; não exige entregar a tabela"
      - "Portão que prenda a CLASSE, não o caso: toda tabela excluída em família `configuracao_do_produto` ou `vocabulario_do_sistema` com coluna de vínculo ao titular (`candidatura_id`/`candidato_id`) no catálogo vivo falha o (cr1) a menos que tenha veredito explícito por tabela. Hoje o conjunto é exatamente {entrevista_guias}; a varredura que fiz nas 43 excluídas não achou outra afirmação positiva falsa (ver advisory sobre historico_acoes/logs_auditoria/comparativo_solicitado)"
      - "Publicar SÓ o front, conferir o marcador novo no chunk certo (a rota de privacidade do titular é lazy? conferir com `grep -rl` em build/assets e no site publicado) e a ausência do trecho antigo; `git log origin/main..HEAD` (hoje 3 commits, só `.planning/`) vazio"
    operator_decision: "Necessária só para APROVAR o texto novo (o operador aprovou a anterior com «publicar» — 44-16-SUMMARY). Entregar ou não `entrevista_guias` ao titular (Art. 18, II cobre dado derivado) é decisão de política que PODE seguir aberta, desde que a frase diga que a categoria existe — mesma lógica de BD-16"
deferred: []
advisory:
  - finding: "WR-01 (revisão pós-CR-01) — «ou pedir algum deles» convida o titular a pedir itens que o controlador já decidiu não entregar (BD-10: `detalhe` — «não ao raciocínio interno de quem retém»; pii_de_terceiro; segredo; justificativa da decisão final com BD-9 antigo aberto)"
    category: other
    reason: >
      Pesado e NÃO classificado como gap: o convite é a um canal de requerimento ao controlador (Art. 18 §3), e o controlador pode responder recusando com motivo; a frase não PROMETE entrega,
      então não é afirmação falsa. Mas há tensão real com BD-10 e nenhum procedimento documentado de como `rh@` responde (grep em DECISAO-ENCARREGADO.md e UI-SPEC: nada). O operador aprovou a redação
      explicitamente, mas o checkpoint não mostrou o conflito. Como o texto vai ser reaberto para o CR-01-bis, é o momento barato de decidir: manter o convite e registrar o procedimento de resposta
      (recusa fundamentada), ou estreitar para «Se quiser saber mais sobre algum desses itens, escreva para…». Decisão do operador (UNCERTAIN, não bloqueia por si)
    evidence_status: "lido: exportacaoService.ts:555; 44-CONTEXT.md BD-10 l.316-325; 44-16-SUMMARY l.113/314"
  - finding: "Mesma lente do CR-01-bis em outras excluídas, NÃO classificadas como falsas: `historico_acoes` (telemetria_interna; 8/8 linhas com candidatura_id; colunas `descricao`, `metadata`, `usuario_id`) é log de ação da EQUIPE sobre a candidatura — a frase a cobre como «registros técnicos de funcionamento», o que é discutível; `logs_auditoria` (dados_antes/dados_depois = snapshots de linhas do titular); `comparativo_solicitado` (pii_de_terceiro; `candidatura_ids` inclui a própria candidatura dela — a cláusula «dados que identificam outras pessoas» descreve metade)"
    category: other
    reason: "Nenhuma delas recebe uma afirmação POSITIVA e falsa (a frase só diz que são técnicas/identificam terceiros, e nomeia a categoria); são lacunas de precisão que a revisão do CR-01-bis pode querer fechar junto. Rebaixar para gap exigiria decisão do operador sobre se log de ação da equipe é «técnico»"
    evidence_status: "catálogo vivo + YAML lidos; historico_acoes contado em PROD (read-only)"
  - finding: "WR-02 (positivas «o motivo e as datas entram», etc. sem portão), WR-03 (versão da allowlist do bundle vs da EF: janela de deploy torna a frase falsa de novo), WR-04/WR-05 (smoke: linhas não-literal e fluxo de controle dentro do DO $gate$ calam o guarda — reprodução do revisor, não reexecutada aqui), WR-06 (cp3/cp4 só varrem src/**/*.ts(x); cp4 por substring), IN-01, IN-02"
    category: other
    reason: "Todas `open` em 44-REVIEW-DISPOSITION.md; nenhuma faz um must-have falhar HOJE (o portão vivo foi remedido e morde; a EF não mudou desde o G5; a versão da EF e a do bundle coincidem em 1.4.0). WR-03 é o único com superfície de usuário (descompasso futuro EF/front) e merece entrar no plano de fechamento do CR-01-bis por tocar a mesma frase. Recomenda-se uma rodada única: CR-01-bis + WR-01 (decisão) + WR-02 + WR-03"
    evidence_status: "leitura de 44-REVIEW.md; nada reexecutado"
  - finding: "WR-05/WR-06 do G5 (herdados): `cognitivo_liberacao.liberado_por` e `solicitacoes_dados.plano` legíveis pelo titular via RLS (medido na rodada pós-G5); a retenção na cópia não é proteção. WR-06 está decidido por BD-16 (plano fica fora, a frase nomeia — e a frase publicada nomeia)"
    category: security
    reason: "Pré-existente e fora da Phase 44 (GRANT SELECT por coluna é fase própria); não reverificado nesta rodada"
    evidence_status: "carregado de 44-VERIFICATION-2026-10-06-pos-G5.md"
  - finding: "T2 (herdado): src/store/authStore.ts usa .select('*') — fora de EXPORT-02 (o JSON do export só nasce na EF e no exportacaoService). U1 (herdado): nenhum titular real pediu cópia sob 1.3.0 nem 1.4.0 (acessos pós-1.4.0 = 0, medido hoje). Depois de fechar o CR-01-bis, UM pedido real da conta de teste para ver as seções novas e a frase no .html e no .json"
    category: other
    reason: "Não bloqueiam; U1 é o que transforma «a frase está no bundle» em «a frase foi lida por quem recebe»"
    evidence_status: "acessos pós-1.4.0 medidos hoje por consulta READ ONLY; T2 não alterado (nenhum commit toca authStore)"
human_verification: []
---

# Phase 44: Exportação & Acesso — Relatório de Verificação (re-verificação após a rodada CR-01, 44-14..44-16)

**Objetivo da fase:** O candidato recebe uma cópia **honesta** dos próprios dados — e o inventário de PII que a fase irreversível vai consumir nasce **exercitado em produção**.
**Verificado em:** 2026-10-07T01:45Z
**Status:** gaps_found (6/7)
**Re-verificação:** Sim — baseline `44-VERIFICATION-2026-10-06-pos-G5.md` (gaps_found, CR-01 aberto).

> Postura: assumi que a rodada 44-14..44-16 NÃO fechou o objetivo e tentei derrubar o SUMMARY. A parte do CR-01 que ela se propôs a fechar (a frase só falava de telemetria) FECHOU de verdade e no ar. O que o SUMMARY não viu, e a revisão pós-publicação achou, também é real: a frase nova trocou uma omissão por uma afirmação falsa pontual. Nenhum commit, deploy ou escrita foi feito por este verificador; toda leitura de PROD foi `SET TRANSACTION READ ONLY` com contagens apenas.

## Veredito sobre o ponto de decisão do orquestrador

**A verdade «cópia honesta» NÃO se sustenta na frase hoje publicada.** Verifiquei a premissa do CR-01-bis de forma independente (não herdei do revisor nem do orquestrador): `entrevista_guias` tem `candidatura_id NOT NULL` (FK), `guia` jsonb gerado por candidatura, UNIQUE por (candidatura, tipo); em PROD há 6 guias de 4 titulares distintos, 2 deles editados pelo RH. Está classificada `configuracao_do_produto` (YAML:372), a família que a cláusula publicada descreve como «o mesmo para todos os candidatos». O que corrijo no enquadramento do orquestrador: a derivação direta no código lido é do scorecard da candidatura (+ perfil da vaga), e o inventário diz «currículo»; a conclusão é a mesma. O defeito é pequeno em escala (1 tabela de 43; só front para corrigir; 0 titulares afetados) e GRANDE em classe: é a mesma de CR-01 original (afirmação positiva e falsa ao titular sobre dado retido sobre ele), e o projeto já decidiu que essa classe reprova o objetivo.

**WR-01 («ou pedir algum deles») não é gap.** Não é afirmação falsa nem promessa de entrega; é um convite a um canal de requerimento ao controlador. Mas há tensão com BD-10 e nenhum procedimento de resposta registrado — decisão do operador, mais barata de tomar agora, enquanto o texto é reaberto.

## O que foi remedido hoje (não herdado)

| Verificação | Resultado |
|---|---|
| Site publicado `https://rh.beautysmile.com.br/` (fetch com query aleatória, sem cache) | `index.html` referencia `assets/index-DTxaEkc3.js` (hash confere com o do 44-16) |
| Crawl: `index-DTxaEkc3.js` + os 46 chunks lazy referenciados por ele (todos baixados) | frase nova: **1** ocorrência (só no index); `mesmo para todos os candidatos`: **1**, só no index; `descrevem o sistema`: **0**; `lgpd@beautysmile`: **0** nos 47; `rh@beautysmile.com.br` presente; `ou pedir algum deles`: 1 |
| Texto no JS publicado | idêntico ao de `exportacaoService.ts:555` e ao da 44-UI-SPEC l.467 (com `${ga}` = o canal) |
| Premissa do CR-01-bis | Confirmada (ver gap): DDL, EF geradora, YAML l.347/372, allowlist l.19 e contagem em PROD |
| Varredura das 43 tabelas excluídas por colunas de vínculo ao titular | `entrevista_guias` é a ÚNICA em família genérica (`configuracao_do_produto`/`vocabulario_do_sistema`) com `candidatura_id`/`candidato_id`; as demais com vínculo estão em telemetria/terceiros (ver advisory) |
| Vitest: `exportacaoService.test.ts`, `docs/compliance/__tests__`, `src/features/privacidade/constants` | 7 arquivos, **148/148** (o (cr1) passa — e é por isso que o defeito é invisível a ele) |
| EF `exportar-meus-dados` | `git diff 797c6110..HEAD -- supabase/functions` só toca `_shared/exportAllowlist.ts` e o teste da EF (rodada G5); nada na rodada 44-14..16 (a própria 44-14 declara «nenhuma escrita em PROD nem redeploy de EF»); v6/1.4.0 medida na rodada anterior |
| `31d24652` ancestral de `origin/main` | sim; `git log origin/main..HEAD` = 3 commits, todos `docs(44)` em `.planning/` (nenhum código) |
| Debt markers `TBD/FIXME/XXX` nos 6 arquivos de código/teste da rodada | nenhum |
| Suíte completa | 2449 testes / 2 falhas pré-existentes em `promessasComExecutor.test.ts` — número do orquestrador, NÃO reexecutado aqui (reproduzi a causa dessas duas na rodada anterior: ROADMAP da Phase 46 `[x]`) |

### População medida antes de qualquer booleano (2026-10-07 ~01:40Z)

| O quê | Valor | Por que importa |
|---|---|---|
| `entrevista_guias` total / candidaturas distintas / titulares distintos / de candidatura viva / editados depois de criados | 6 / 4 / 4 / 6 / 2 | a falsidade da frase recai sobre dado que existe, de pessoas reais, com texto de autoria da equipe em 2 linhas |
| `solicitacoes_dados` tipo `acesso` com `solicitado_em` ≥ 2026-10-06T21:13Z | **0** | nenhum titular recebeu ainda esta frase; corrigir não exige retratação |
| `historico_acoes` total / com `candidatura_id` | 8 / 8 | o advisory sobre «técnico» recai sobre linhas reais por candidatura |

## Verdades observáveis

| # | Verdade | Status | Evidência |
|---|---|---|---|
| 1 | SC1 (mecanismo) — pedido pelo painel, JSON por allowlist explícita, nunca `select('*')` | ✓ VERIFICADO | EF v6/1.4.0 inalterada pela rodada; 0 `select("*")` nos caminhos do export; 3 pedidos reais atendidos (último 2026-09-20). Ressalva herdada: titular = conta de teste do operador; 1.4.0 nunca passou por um titular (U1) |
| 2 | **Objetivo / 44-06 — a cópia é HONESTA sobre o que deixa de fora** | **✗ FALHOU** | Frase publicada afirma que a configuração retida é «o mesmo para todos os candidatos»; inclui `entrevista_guias` (por candidatura; 6 linhas/4 titulares em PROD). Ver §Gaps. O CR-01 original FECHOU; este é o resíduo novo |
| 3 | SC2 — currículo por signed URL de TTL curto | ✓ VERIFICADO | `TTL_CURRICULO_SEGUNDOS = 60`, `createSignedUrl` no cliente; sem `service_role`; nada nesta rodada toca o caminho do CV (os arquivos tocados são frase, canal e portões) |
| 4 | SC3 — coluna nova quebra o snapshot; nada entra por acidente nem sai em silêncio | ✓ VERIFICADO (override na cadência) | Allowlist explícita + snapshots + `--check` + smoke vivo (a rodada endureceu WR-01/02/03/07; revisão pós-CR-01 confirma). Cadência manual = override BD-14. Os furos de WR-04/05 (revisor reproduziu) estão em `advisory`: o portão vivo no banco continua morrendo na mordida remedida na rodada anterior, e nada mudou no banco |
| 5 | SC4 — prazo do Art. 19, II medido do registro e visível ao RH | ✓ VERIFICADO | Sem mudança desde a verificação pós-G5 (rota `/rh/pedidos-dados`, RPCs sem `created_by`, Phase 50 `[x]`); vácuo declarado: 0 pendentes reais |
| 6 | SC5 (redação nova) — inventário nomeado e versionado, consumido só por `exportar-meus-dados` e `exportacaoService` | ✓ VERIFICADO | `export-allowlist.json` 1.4.0 + espelho `.ts`; `meta.consumidores` nega a Phase 45; consumidores inalterados |
| 7 | EXPORT-06 (reescrito em 2026-10-04) | ✓ VERIFICADO | idem |

**Score:** 6/7. 0 verdades presentes-mas-comportamento-não-exercitado.

## Gaps

### CR-01-bis — a frase publicada diz «o mesmo para todos os candidatos» sobre uma categoria que contém dado por candidatura (BLOCKER contra o objetivo)

Resumo (detalhe e evidência no frontmatter `gaps[0]`):

1. **O que a frase diz:** a configuração do próprio sistema que fica de fora «é o mesmo para todos os candidatos».
2. **O que a categoria retém:** 23 tabelas `configuracao_do_produto`; 22 são genuinamente genéricas (vagas, perguntas, templates, prompts, SLAs); `entrevista_guias` não: roteiro por candidatura, gerado a partir das notas dela, editável (e editado) pelo RH.
3. **Por que o portão não viu:** (cr1) prende a frase ao artefato por FAMÍLIA de razão. A rodada 44-14/15 fez exatamente o que prometeu (famílias derivadas do artefato, igualdade de conjuntos nos dois sentidos) — mas o erro mora UM NÍVEL ABAIXO: o rótulo da família, que o YAML define como «conteúdo do produto, não do candidato» sem razão por tabela. É a classe que o CLAUDE.md nomeia: um portão que varre pelo sintoma (família) e não pela forma (tabela com vínculo ao titular).
4. **Não é a retenção que reprova, é a promessa.** Reter o roteiro é decisão legítima e pode seguir assim. O defeito é dizer ao titular que ele é genérico.
5. **Fechar custa pouco e só no front:** reescrever a cláusula (tirar a oração relativa ou restringi-la; nomear o roteiro da entrevista dela), mais o portão por classe, mais publicar. Não exige mudar a allowlist 1.4.0, nem a EF, nem o banco.

**Precisa do operador?** Só para aprovar o texto novo (o operador aprova a copy dirigida ao titular; a anterior foi aprovada com «publicar»). Decisão de entregar `entrevista_guias` ao titular é política e pode continuar em aberto, desde que a frase a nomeie.

### O que NÃO é gap (pesado e descartado)

- **WR-01** — convite a um canal de requerimento; não afirma entrega. Decisão do operador recomendada no mesmo ciclo (ver advisory).
- **WR-02..WR-06, IN-01, IN-02 da revisão pós-CR-01** — endurecimento de portões e de cobertura; nenhuma faz um must-have falhar hoje; todas `open`.
- **`historico_acoes`, `logs_auditoria`, `comparativo_solicitado`** — a frase não afirma nada falso sobre elas; só são descritas de forma discutível (advisory).
- **Cadência manual do portão de drift** — override BD-14.

## Cobertura de requisitos (IDs dos 16 PLANs × REQUIREMENTS.md)

| Requisito | Planos | REQUIREMENTS.md | Avaliação |
|---|---|---|---|
| EXPORT-01 | 44-02, 44-05, 44-06 | `[x]` | SATISFEITO (titular = conta de teste do operador) |
| EXPORT-02 | 44-01, 44-03, 44-05, 44-11..13 (+14/15 na copy) | `[x]`, «PROD roda 1.4.0 (EF v6)» | SATISFEITO no mecanismo; a honestidade da fronteira é o CR-01-bis, registrado no nível do objetivo |
| EXPORT-03 | 44-07 | `[x]` | SATISFEITO |
| EXPORT-04 | 44-03, 44-10..12, 44-15 | `[x]` | SATISFEITO |
| EXPORT-05 | 44-02, 44-04, 44-08, 44-09 (+ Phase 50) | `[x]` | SATISFEITO |
| EXPORT-06 | 44-01, 44-03, 44-06, 44-10 | `[x]` | SATISFEITO |

**Órfãos:** nenhum — REQUIREMENTS.md mapeia exatamente EXPORT-01..06 à Phase 44 e todos aparecem em PLANs. Nenhum requisito está BLOQUEADO; o defeito é do objetivo/SC («o que o sistema realmente guarda sobre ele» + «honesta»), não de um requisito sem implementação.

## Artefatos e wiring

| Artefato | Status |
|---|---|
| `export-allowlist.json` 1.4.0 ↔ `_shared/exportAllowlist.ts` ↔ EF | VERIFICADO (inalterado desde a rodada anterior) |
| `exportacaoService.ts` `oQueNaoEsta` | EXISTE, SUBSTANTIVO, CONECTADO (3 consumidores: tela, .html, .json; no bundle publicado). **CONTEÚDO com uma afirmação falsa (CR-01-bis)** |
| `canalPrivacidade.ts` + `AutorizacoesStep.tsx` | VERIFICADO: fonte única, `rh@`, 0 `lgpd@` nos 47 JS |
| `export-scope-rules.yaml` / família `configuracao_do_produto` | Rótulo da família falso para `entrevista_guias` |
| `exportacaoService.test.ts` (cr1)–(cr3) | EXISTE e PASSA; cego ao nível por-tabela |

Fluxo de dados (Nível 4): a frase vem de uma constante estática derivada do artefato (verificado por (cr1)); `payload` ← `select(allowlist 1.4.0)` — FLUINDO (verificado na rodada anterior; nada mudou).

## Escrituração para o orquestrador (nada foi editado por este verificador)

- **A caixa `- [ ] **Phase 44` do ROADMAP permanece `[ ]`.** Status não é `passed`.
- **44-REVIEW-DISPOSITION.md:** CR-01 passa a ter linha de gap aqui (CR-01-bis). Sugestão de plano de fechamento (`/gsd-plan-phase 44 --gaps`), um só e curto: (1) frase pela UI-SPEC + `oQueNaoEsta`; (2) portão de classe «tabela por-titular em família genérica»; (3) decisão do operador sobre WR-01 e, se for o caso, WR-03 (versão EF vs bundle) por tocar a mesma frase; (4) publicar só o front e conferir no chunk certo + `git log origin/main..HEAD` vazio; (5) UM pedido real da conta de teste (U1) para ver o `.html` e o `.json` com a frase final.
- **Premissa a registrar corretamente no próximo plano:** o guia é derivado do scorecard (e, segundo o inventário, do currículo); não afirmar «derivado do texto do CV» sem medir.

## Resumo

A rodada 44-14..44-16 fechou o que prometeu: a frase velha (só telemetria, «descrevem o sistema, não você») saiu de todo o site publicado, o canal virou `rh@` em todo lugar e os portões de drift ficaram mais duros. A frase que entrou nomeia quase toda categoria retida com honestidade. Mas ela carrega UMA afirmação falsa pontual — «o mesmo para todos os candidatos» — sobre uma categoria que inclui o roteiro de entrevista de cada candidatura, e o portão que deveria impedir isso só vê famílias. Contra um objetivo cuja primeira palavra é «honesta», isso é lacuna. É a única, é de front, e ainda não feriu ninguém (0 pedidos desde 21:13Z de 06/10).

---

_Verificado: 2026-10-07T01:45:00Z_
_Verificador: Claude (gsd-verifier)_
