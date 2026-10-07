---
phase: 44-exporta-o-acesso
verified: 2026-10-07T21:45:00Z
status: passed
score: 7/7 must-haves verified
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
  - ".planning/phases/44-exporta-o-acesso/44-17-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-17-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-18-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-18-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-19-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-19-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-20-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-20-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-21-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-21-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-22-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-22-SUMMARY.md"
  - "docs/compliance/__tests__/exportAllowlist.test.ts"
  - "docs/compliance/catalogo-vivo-44.json"
  - "docs/compliance/export-allowlist.json"
  - "docs/compliance/export-scope-rules.yaml"
  - "docs/compliance/sql/05-export-allowlist-drift.sql"
  - "docs/compliance/sql/gen-export-allowlist.cjs"
  - "src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts"
  - "src/features/privacidade/constants/canalPrivacidade.ts"
  - "src/features/privacidade/services/__tests__/exportacaoService.test.ts"
  - "src/features/privacidade/services/exportacaoService.ts"
  - "supabase/functions/_shared/exportAllowlist.ts"
  - "supabase/functions/exportar-meus-dados/index.ts"
  - "supabase/tests/p44_export_drift_smoke.sql"
covered_digest: "v2:sha256:7d1046af95e3341eee62b16065cf321348c0825c80faafe3991c6b080692a83b"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "O portão do SC#3 que vê o banco (drift do export: universo de tabelas e colunas = catálogo vivo de public) roda de forma recorrente/automática"
    reason: "O operador escolheu cadência MANUAL (BD-14, 2026-10-06). Aceitável porque o universo é o banco medido na execução e o smoke p44_export_drift_smoke.sql falha alto (visto morder em três direções contra PROD na rodada pós-G5; o `p46apply.cjs migrate` imprime o lembrete). Obrigação de execução: rodar o smoke depois de todo apply que crie, renomeie ou remova tabela/coluna em public e antes de toda regeração da allowlist."
    accepted_by: "operador (Fernando) — AskUserQuestion do orquestrador em 2026-10-06, opção «Universo do banco + smoke»; registro em 44-CONTEXT.md §BD-14 e 44-10-SUMMARY.md"
    accepted_at: "2026-10-06"
re_verification:
  previous_status: gaps_found
  previous_score: "6/7 (CR-01-bis aberto)"
  previous_report: ".planning/phases/44-exporta-o-acesso/44-VERIFICATION-2026-10-07-pos-CR01.md"
  gaps_closed:
    - "CR-01-bis — a frase «que é o mesmo para todos os candidatos» saiu do código e do site publicado, e o roteiro de entrevista da candidatura (`entrevista_guias`) passou a ser NOMEADO como categoria retida («o roteiro que a equipe monta para conduzir a sua entrevista»). Medido hoje: 0 ocorrências da oração antiga em index-7NrDustL.js e nos 46 chunks referenciados; a frase nova está em index-7NrDustL.js; o `.json` e o `.html` de um pedido real posterior ao push (U1, gerado_em 21:17:52Z > T0 20:51:34Z) trazem a frase de HEAD por igualdade exata, versão 1.4.0"
    - "Portão por CLASSE que o verificador anterior pediu: o (cr5) deriva do artefato e do catálogo toda tabela excluída em família genérica com coluna de vínculo ao titular e a prende a um veredito por tabela. Reexecutado por mim com script próprio: o conjunto é exatamente {entrevista_guias}; nenhuma tabela genérica ficou sem coluna medida"
    - "WR-01 do pós-CR-01 («ou pedir algum deles» convidava a pedir o que o controlador retém): o segundo ramo do convite saiu — 0 ocorrências nos 47 JS; o convite que resta é «Se quiser saber mais sobre algum desses itens, escreva para…», que não promete entrega"
    - "WR-03 do pós-CR-01 (janela EF × bundle): `fronteiraDaCopia` faz os dois arquivos falharem FECHADOS quando a versão da resposta diverge da do bundle; (cr6) cobre igual/diferente/vazio/ausente. Limite honesto registrado em WR-01 desta rodada (a comparação é por string de versão)"
  gaps_remaining: []
  regressions: []
gaps: []
deferred: []
advisory:
  - finding: "WR-01 (pós-CR-01bis) — `fronteiraDaCopia` falha fechada por STRING de versão, não por conteúdo; o histórico do artefato mostra 1.1.0 com 4 conteúdos e 1.2.0 com 2, e nenhum portão obriga a subir `meta.versao` quando `tabelas`/`excluidas` mudam"
    category: other
    reason: >
      NÃO é gap, e o motivo é medível: (a) hoje há UM conteúdo sob 1.4.0, e EF (`index.ts:342` devolve `EXPORT_ALLOWLIST.meta.versao`), espelho `_shared/exportAllowlist.ts`, artefato e bundle publicado coincidem —
      `check:export-allowlist` OK e, mais forte, o U1 observou o arquivo de um pedido real com a frase de HEAD e SEM a neutra (EF e site na mesma versão); (b) a frase publicada é verdadeira sob o artefato 1.4.0
      (conferido por mim, ver Verdade 2), então não há afirmação falsa ao titular HOJE; (c) o mecanismo de falha-fechada funciona exatamente para o que declara (versão diferente, vazia, ausente: 265/265 na feature; (cr6) mordeu na sonda do 44-21).
      O risco é FUTURO e de processo: uma regeneração do artefato sem subir a versão, com a EF publicada antes do front (canais independentes), emitiria uma cópia com o carimbo novo e a fronteira velha. Isso reprovaria o objetivo se acontecesse — por isso fica como advisory com fix barato e recomendado,
      não como gap: ledger `versão → sha256(tabelas+excluidas)` testado em `exportAllowlist.test.ts`, só front. Recomendo antes da PRÓXIMA mudança de allowlist, e não bloqueia o fechamento da fase.
    evidence_status: "medido: exportacaoService.ts:761-765; EF index.ts:342; check:export-allowlist OK; histórico git do artefato na revisão 44-21 (não reexecutado por mim); U1 em 44-22-SUMMARY"
  - finding: "WR-06 (pós-CR-01bis) — o 44-20-SUMMARY afirma na manchete que os arquivos «deixam de carregar a fronteira de uma versão com o carimbo de outra», sem a ressalva de que vale para STRING de versão"
    category: other
    reason: >
      Defeito de escrituração, não de produto: o código faz o que a linha de coverage D1 do mesmo SUMMARY diz com precisão («só quando a versão da lista da EF é igual à do bundle»); só a manchete é mais larga que o código. O operador respondeu «publicar» com a revisão na mão. O que importa é que o leitor futuro
      não tome a manchete por garantia de conteúdo: a revisão 44-21 e este relatório carregam a ressalva. Recomendo uma nota de uma linha no 44-20-SUMMARY (ou fechar junto com o WR-01), sem rodada própria.
    evidence_status: "lido: 44-20-SUMMARY.md manchete e coverage D1; exportacaoService.ts:761"
  - finding: "WR-02 (pós-CR-01bis) — com `versao_allowlist` ausente/vazia o rodapé do `.html` imprime `undefined`/`null`/vazio e o `.json` perde a chave"
    category: other
    reason: "Ramo inalcançável com a EF de hoje (`index.ts:342` sempre devolve a versão) e a cópia não afirma fronteira errada nele (sai a neutra). Viola a E4 da UI-SPEC, por isso warning. Fix de uma linha em `invocarExportMeusDados` (recusar resposta sem versão). Open"
    evidence_status: "lido: exportacaoService.ts:199-200, :732-747; revisão 44-21 reproduziu por execução"
  - finding: "WR-03/WR-04/WR-05 (pós-CR-01bis) — três furos de portão provados por execução na revisão 44-21: segundo `set_config` calando o smoke de drift; (cr4) prende «as datas do pedido» a um subconjunto escolhido à mão; (cr5) define vínculo ao titular só por nome de coluna"
    category: other
    reason: "Nenhum faz um must-have falhar hoje: a copy é verdadeira sob 1.4.0 (conferido), a classe do (cr5) está medida vazia exceto entrevista_guias (reexecutado por mim), o smoke vivo foi visto morder em PROD na rodada pós-G5 e nada mudou no banco nem no smoke desde `dedca1fb` (diff vazio). São fraquezas de vigilância sobre mudanças FUTURAS. Open por padrão do operador; entram juntas, com WR-01, numa rodada `--gaps` quando a allowlist for mexer"
    evidence_status: "reproduzido pelo revisor (44-21) com mutação e md5 restaurado; eu reexecutei só a classe do (cr5) e o diff de supabase/ e docs/compliance/sql/"
  - finding: "IN-01..IN-04 (pós-CR-01bis): `vitest -t` sem casamento sai 0; (cp3) não lê migrations; catálogo com duas verdades de coluna para ai_call_logs/vagas; «a equipe monta» é aproximação aprovada pelo operador (BD-18)"
    category: other
    reason: "Informativos, todos `open` em 44-REVIEW-DISPOSITION-pos-CR01bis.md"
    evidence_status: "lido: 44-REVIEW-pos-CR01bis.md; disposição conferida"
  - finding: "Falhas pré-existentes e alheias à Phase 44: 2 testes de src/__tests__/promessasComExecutor.test.ts (deferimento do comentário de catálogo do ledger de notificações aponta para fase já concluída; roadmap sintético)"
    category: other
    reason: "Reproduzidas por mim (2459/2461). Não tocam arquivo da Phase 44; reproduzem idênticas em dedca1fb segundo o orquestrador. Pertencem à escrituração da Phase 46 [x]"
    evidence_status: "vitest run completo reexecutado nesta verificação"
  - finding: "WR-05/WR-06 do G5 (herdados): `cognitivo_liberacao.liberado_por` e `solicitacoes_dados.plano` legíveis pelo titular via RLS; T2 (herdado): src/store/authStore.ts usa `.select('*')` — fora de EXPORT-02"
    category: security
    reason: "Pré-existentes e fora da Phase 44; não reverificados nesta rodada. A frase publicada nomeia o `plano` (BD-16)"
    evidence_status: "carregado de 44-VERIFICATION-2026-10-06-pos-G5.md e 44-VERIFICATION-2026-10-07-pos-CR01.md"
coincidental_reliance_items:
  - truth: "A fronteira escrita nos arquivos (.html/.json) falha fechada: nunca carrega a fronteira de uma versão com o carimbo de outra"
    reason: undeclared-precondition
    harden: "Declarar e testar a precondição «conteúdo da allowlist muda ⇒ meta.versao sobe» (ledger versão → sha256 do conteúdo em exportAllowlist.test.ts). Hoje ela é só convenção, que o histórico do artefato já quebrou (1.1.0: 4 conteúdos)"
human_verification: []
---

# Phase 44: Exportação & Acesso — Relatório de Verificação (re-verificação após a rodada do CR-01-bis, 44-17..44-22)

**Objetivo da fase:** O candidato recebe uma cópia **honesta** dos próprios dados — e o inventário de PII que a fase irreversível vai consumir nasce **exercitado em produção**.
**Verificado em:** 2026-10-07T21:45Z
**Status:** passed (7/7)
**Re-verificação:** Sim — baseline `44-VERIFICATION-2026-10-07-pos-CR01.md` (gaps_found 6/7, CR-01-bis aberto; cópia fiel do relatório anterior, guardada para o histórico ficar legível).

> Postura: assumi que a rodada 44-17..44-22 NÃO fechou o objetivo e tentei derrubá-la por quatro lados: (1) reconferir a frase publicada, afirmação por afirmação, contra o artefato 1.4.0; (2) buscar tabela por titular escondida em família genérica por script próprio; (3) baixar eu mesmo o site publicado e seus chunks; (4) pesar os achados da revisão independente do 44-21 contra o objetivo. O gap anterior fechou. Os seis warnings da revisão são fraquezas de vigilância sobre mudanças futuras; nenhum faz hoje uma verdade falhar. Nenhuma escrita, commit ou deploy foi feito por este verificador; PROD não foi tocado (a evidência de PROD vem do U1 e da contagem READ ONLY do 44-22, que li e não repeti).

## Estado publicado e dos canais (medido hoje, não herdado)

| Verificação | Resultado |
|---|---|
| `git status -sb` / `git log origin/main..HEAD` | `main...origin/main`, **0** commits à frente. Sujos só os 3 itens alheios já conhecidos (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`, `docs/vagas/`) |
| Site `https://rh.beautysmile.com.br/` (query aleatória, sem cache) | `index.html` referencia `assets/index-7NrDustL.js` (+ `react-vendor`) |
| Download do índice (1,08 MB) e dos 46 chunks referenciados (48 arquivos) | «o roteiro que a equipe monta para conduzir a sua entrevista»: **1** (só no índice). «Esta cópia foi gerada durante uma atualização do sistema» (neutra): **1**. «Se quiser saber mais sobre algum desses itens»: **1**. **0** para: «que é o mesmo para todos os candidatos», «ou pedir algum deles», «descrevem o sistema», `lgpd@beautysmile`. `rh@beautysmile.com.br` presente |
| Texto de `oQueNaoEsta` / `naoEstaVersaoDivergente` no disco | `exportacaoService.ts:587` e `:187`; idênticos ao que o U1 comparou ao arquivo do titular |
| Diff de código de `dedca1fb` a HEAD, fora de `.planning/` | exatamente 7 arquivos: `exportacaoService.ts` (+teste), `canalPrivacidade.ts` (+teste), `export-scope-rules.yaml`, `catalogo-vivo-44.json`, `exportAllowlist.test.ts` |
| `git diff dedca1fb HEAD -- supabase docs/compliance/export-allowlist.json docs/compliance/sql docs/compliance/pii-inventory.yaml` | **vazio** — fronteira «só front» (prohibition de 44-17/18/19/20/22) honrada; EF, espelho, artefato, gerador, relatório 05, smoke e inventário intocados |
| `npm run check:export-allowlist` | OK — artefato e espelho em sincronia com as três fontes |
| Vitest `src/features/privacidade` + `docs/compliance/__tests__` | 16 arquivos, **265/265** |
| Vitest completo | 2459/2461; as 2 falhas são `promessasComExecutor.test.ts` (alheias, ver advisory) |
| `tsc --noEmit` | **89** erros (baseline 89) |
| Debt markers `TBD/FIXME/XXX` nos arquivos de código/teste/YAML da rodada | nenhum |
| `REQUIREMENTS.md` desde `dedca1fb` | sem diff (a prohibition de 44-17 vale) |
| `44-REVIEW-DISPOSITION.md`: CR-01, WR-01..06, IN-01, IN-02 | 9 linhas `fixed`, cada sha citado existe no repositório |
| U1 (44-22-SUMMARY §U1) | Pedido `acesso` real da conta de teste às 21:17:45Z (> T0 20:51:34Z); script literal do plano → `json_frase, json_versao, html_frase, html_rodape, sem_neutra, sem_trecho_antigo, gerado_depois_do_push` todos `true`; versão 1.4.0; contagem PROD READ ONLY 1/1. Li o registro; não repeti (exigiria PROD e os arquivos do titular de teste) |

## Verdades observáveis

| # | Verdade | Status | Evidência |
|---|---|---|---|
| 1 | SC1 — pedido pelo painel, JSON por allowlist explícita, nunca `select('*')` | ✓ VERIFICADO | EF v6/1.4.0 inalterada pela rodada (diff de `supabase/` vazio); allowlist explícita; U1 é um pedido novo atendido sob 1.4.0, o primeiro que passou por 1.4.0 — fecha o «U1 herdado» do relatório anterior. Ressalva herdada: titular = conta de teste do operador |
| 2 | **Objetivo / 44-06 — a cópia é HONESTA sobre o que deixa de fora** | **✓ VERIFICADO** | Ver análise abaixo. Cada afirmação negativa e positiva da frase publicada é verdadeira sob o artefato 1.4.0; o gap CR-01-bis fechou no disco, no ar e no arquivo de quem pede |
| 3 | SC2 — currículo por signed URL de TTL curto | ✓ VERIFICADO | Nada na rodada toca o caminho do CV (7 arquivos de código, nenhum de CV); `TTL_CURRICULO_SEGUNDOS = 60` e B14/B15 observados nas rodadas anteriores |
| 4 | SC3 — coluna nova quebra o snapshot; nada entra por acidente nem sai em silêncio | ✓ VERIFICADO (override na cadência) | Allowlist/snapshot/`--check`/smoke inalterados (diff vazio) e agora mais duros (K/BLOCO canônico). Cadência manual = override BD-14. Os furos WR-03 do pós-CR-01bis (segundo `set_config`) estão em advisory: o smoke não foi tocado e morde em PROD |
| 5 | SC4 — prazo do Art. 19, II medido do registro e visível ao RH | ✓ VERIFICADO | Sem mudança (Phase 50 `[x]`, rota `/rh/pedidos-dados`, RPCs sem `created_by`) |
| 6 | SC5 (redação nova) — inventário nomeado e versionado, consumido só por `exportar-meus-dados` e `exportacaoService` | ✓ VERIFICADO | `export-allowlist.json` 1.4.0 + espelho em sincronia; consumidores inalterados |
| 7 | EXPORT-06 (reescrito em 2026-10-04) | ✓ VERIFICADO (coincidental-reliance, advisory) | idem. A falha-fechada dos arquivos (44-20) vale por string de versão e repousa na convenção «conteúdo muda ⇒ versão sobe» (ver `coincidental_reliance_items` e WR-01 abaixo) — não altera score nem status |

**Score:** 7/7. 0 verdades presentes-mas-comportamento-não-exercitado: o invariante comportamental novo da rodada (falha-fechada por versão) tem teste que passa e que a revisão viu morder (sonda (cr6)).

### Verdade 2 em detalhe — por que agora se sustenta

Reconferi a frase publicada contra `export-allowlist.json` 1.4.0 (32 tabelas exportadas, 43 excluídas):

| Afirmação | Artefato 1.4.0 (lido por mim) | Resultado |
|---|---|---|
| «registros técnicos … tempo e custo de processamento …, registros de acesso e controle de envio de mensagens» | família `telemetria_interna` (13 tabelas: `ai_call_logs`, `ai_cost_daily`, `logs_acesso`, `notificacoes_enviadas`, `sessoes_ativas`, …) + colunas `*_enviado_em` | verdadeira |
| «a configuração do próprio sistema, como o texto das vagas e das perguntas» — **sem** a oração «que é o mesmo para todos» | `configuracao_do_produto` 23 + `vocabulario_do_sistema` 1; a única com vínculo ao titular é `entrevista_guias` (script próprio sobre catálogo ∪ bloco `colunas_fora_do_escopo`: classe = {`entrevista_guias`}; nenhuma tabela genérica sem coluna medida) | verdadeira, e a falsidade antiga saiu |
| «o roteiro que a equipe monta para conduzir a sua entrevista» não entra | `excluidas.entrevista_guias = configuracao_do_produto` | verdadeira; o CR-01-bis é fechado NOMEANDO (mesma lógica de BD-16), sem mudar a retenção — decisão que o verificador anterior declarou legítima |
| «dados que identificam outras pessoas, como quem da equipe agiu no seu processo» | `pii_de_terceiro` (4 tabelas) + colunas `*_por`/`*_id` de funcionário (`criado_por`, `liberado_por`, `por_usuario`, `revisao_por_usuario`) | verdadeira — e cobre também o log de ação da equipe (`historico_acoes`) que o relatório anterior deixara como «descrito de forma discutível» |
| «anotações internas … conservação (o motivo e as datas entram)» | `retencao_hold`: `detalhe` excluída; `motivo`, `criado_em`, `liberado_em` em `colunas` | verdadeira |
| «ficha técnica … pedido de exclusão (o andamento e as datas do pedido entram)» | `solicitacoes_dados`: `plano` excluída; `situacao`, `solicitado_em`, `atendido_em`, `cancelado_em`, `executar_em`, `*_concluido_em` em `colunas`; `*_enviado_em` retidos já nomeados como controle de envio | verdadeira |
| «texto em que a equipe justificou a decisão final (a decisão em si entra)» | `decisao_final(.historico)`: `justificativa` excluída, `decisao` em `colunas` | verdadeira |
| convite «Se quiser saber mais sobre algum desses itens, escreva para …» | não oferece entrega (BD-19) | verdadeira; resolve o WR-01 do pós-CR-01 |

A frase é a mesma na tela, no `.html` e no `.json` quando as versões coincidem (U1 por igualdade exata no arquivo real) e a neutra só aparece quando divergem (U1: `sem_neutra: true`). Todas as 22 verificações de texto da revisão 44-21 (UI-SPEC l.467/548 caractere a caractere, 9 strings banidas) estão no 265/265 que reexecutei.

## Pesagem explícita pedida pelo orquestrador

### pos-CR01bis WR-01 (`fronteiraDaCopia` compara STRING de versão, não conteúdo) — **warning aceitável, não gap**

- **Contra tratar como gap:** o objetivo é uma cópia honesta HOJE, para quem pede HOJE. Medi que hoje a string 1.4.0 identifica um único conteúdo (EF, espelho, artefato e bundle coincidem; `check:export-allowlist` OK) e o U1 observou, num arquivo real, a frase de HEAD sem a neutra. O fail-closed faz o que promete (versão diferente/vazia/ausente → neutra, mordida pela sonda do revisor). O defeito só existe numa sequência futura inteira: conteúdo muda **sem** subir a versão **e** a EF sobe antes do front. Nenhum titular recebeu nem receberá isso com o código de hoje.
- **A favor de levá-lo a sério:** o histórico mostra que a convenção «versão sobe quando muda» já foi quebrada (1.1.0 teve 4 conteúdos), e é exatamente a classe que o CLAUDE.md nomeia («portão que varre o sintoma, não a forma»). Por isso o registro como `coincidental_reliance_items` e a recomendação concreta (ledger versão → sha256, só front).
- **Decisão:** advisory/open com fix recomendado **antes da próxima mudança de allowlist**. Se o operador preferir fechar já, é uma rodada `--gaps` pequena e só de teste; não é pré-condição para fechar a Phase 44.

### pos-CR01bis WR-06 (44-20-SUMMARY superafirma) — **warning aceitável, não gap**

A manchete do SUMMARY é mais larga que o código; o código e a linha D1 do mesmo SUMMARY dizem exatamente o que valem. É um problema de registro (que o CLAUDE.md trata como custo real), não de produto, e não toca o objetivo «cópia honesta». O operador publicou com a revisão na mão. O relatório de revisão (WR-06) e este relatório carregam a ressalva; recomendo uma linha de erratum no 44-20-SUMMARY, junto com o WR-01.

### Os demais (WR-02..WR-05, IN-01..IN-04)

Vigilância e polimento de portão, todos provados pelo revisor com mutação e restauração por md5; nenhum muda o valor de verdade de uma afirmação publicada. WR-02 é o único com superfície de usuário e é inalcançável com a EF atual. Todos `open` por padrão do operador, sem disposição contrária.

## Gaps

Nenhum. O gap `CR-01-bis` do relatório anterior está fechado (ver `re_verification.gaps_closed`).

## Cobertura de requisitos (IDs dos 22 PLANs × REQUIREMENTS.md)

| Requisito | Planos | REQUIREMENTS.md | Avaliação |
|---|---|---|---|
| EXPORT-01 | 44-02, 44-05, 44-06, 44-14, 44-16, 44-17, 44-19..22 | `[x]` | SATISFEITO (titular = conta de teste do operador; U1 desta rodada é mais um pedido real atendido) |
| EXPORT-02 | 44-01, 44-03, 44-05, 44-11..13, 44-14, 44-16..18, 44-20..22 | `[x]`, «PROD roda 1.4.0 (EF v6)» | SATISFEITO — mecanismo por allowlist; a honestidade da fronteira, antes registrada no nível do objetivo, está fechada |
| EXPORT-03 | 44-07 | `[x]` | SATISFEITO |
| EXPORT-04 | 44-03, 44-10..12, 44-15, 44-16, 44-19, 44-21, 44-22 | `[x]` | SATISFEITO |
| EXPORT-05 | 44-02, 44-04, 44-08, 44-09 (+ Phase 50) | `[x]` | SATISFEITO |
| EXPORT-06 | 44-01, 44-03, 44-06, 44-10, 44-18 | `[x]` | SATISFEITO |

**Órfãos:** nenhum — `REQUIREMENTS.md` mapeia exatamente EXPORT-01..06 à Phase 44 e todos aparecem em PLANs. Nenhum BLOQUEADO.

## Artefatos e wiring

| Artefato | Status |
|---|---|
| `export-allowlist.json` 1.4.0 ↔ `_shared/exportAllowlist.ts` ↔ EF | VERIFICADO (`check:export-allowlist` OK; diff vazio desde `dedca1fb`) |
| `exportacaoService.ts` `oQueNaoEsta` / `naoEstaVersaoDivergente` / `fronteiraDaCopia` | EXISTE, SUBSTANTIVO, CONECTADO: 3 consumidores (tela `PedirCopiaBloco`, `.html` l.496, `.json` l.780); no bundle publicado; conteúdo verdadeiro sob 1.4.0 |
| `canalPrivacidade.ts` + (cp3)/(cp4) | VERIFICADO: fonte única, `rh@`, 0 `lgpd@` nos 48 JS publicados |
| `export-scope-rules.yaml` / família `configuracao_do_produto` | razão por tabela para `entrevista_guias` (BD-18), conferida pelo (cr5); YAML igual por `js-yaml` (revisão 44-21) |
| (cr4)–(cr6), `problemasDosValues`, `BLOCO_GATE_CANONICO`, (cp3)/(cp4) | EXISTEM e PASSAM; sete morderam sonda própria do revisor; furos residuais WR-03/04/05 em advisory |

Fluxo de dados (Nível 4): `oQueNaoEsta` é constante derivada do artefato e vigiada por igualdade de conjuntos; o `.json` real do U1 trouxe a frase de HEAD, logo o valor flui até o arquivo do titular; `payload` ← `select(allowlist 1.4.0)` — FLUINDO (U1).

## Escrituração para o orquestrador (nada foi editado por este verificador além deste arquivo e da cópia do relatório anterior)

- **Cópia criada:** `44-VERIFICATION-2026-10-07-pos-CR01.md` (o relatório anterior, byte a byte), no padrão dos `44-VERIFICATION-2026-10-06-*.md`.
- **Caixa `- [ ] **Phase 44` do ROADMAP (linha 28):** o status é `passed`, então a caixa pode virar `[x]` — **à mão, com Edit de escopo mínimo** (nunca `phase.complete`/`roadmap.update-plan-progress`, que corrompem o arquivo), junto com a data. As caixas dos planos 44-05, 44-07 e 44-09 no ROADMAP seguem como o operador deixou (a auditoria de 2026-09-26 disse que virar é ato do operador ou do verificador; a UAT dos três rodou, e o 44-09 reprovou no papel `rh` até a Phase 50 fechar — reavaliar a caixa do 44-09 com o `50-VERIFICATION.md` em mãos).
- **`STATE.md` / `REQUIREMENTS.md`:** REQUIREMENTS já está `[x]` para os seis; STATE à mão.
- **Rodada futura opcional (`--gaps`, só front/teste):** WR-01 (ledger versão ↔ conteúdo) + WR-06 (erratum) + WR-02 (recusar resposta sem versão), e os furos de portão WR-03/04/05, quando a allowlist for mexida de novo. Nada disso é pré-condição para a Phase 45.

## Resumo

A rodada 44-17..44-22 fechou o CR-01-bis nos três lugares que importam: a frase falsa saiu do código e dos 48 JS publicados; o roteiro de entrevista por candidatura passou a ser nomeado como retido, sem mudar allowlist, EF nem banco (diff vazio); e um pedido real da conta de teste, posterior ao push, devolveu `.json` e `.html` com a frase de HEAD, versão 1.4.0, sem a frase neutra. Reconferi cada afirmação da frase contra o artefato 1.4.0 e reexecutei a varredura de classe: a única tabela por titular em família genérica é `entrevista_guias`, e ela está nomeada. Os seis warnings da revisão independente (critical 0) são fraquezas de vigilância sobre mudanças futuras, incluindo a mais séria (WR-01, falha-fechada por string de versão), que registro como advisory com fix barato. A Phase 44 atinge o objetivo «cópia honesta» sem retratação pendente.

---

_Verificado: 2026-10-07T21:45:00Z_
_Verificador: Claude (gsd-verifier)_
