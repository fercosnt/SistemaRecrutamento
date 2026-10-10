---
phase: 51-consertos-da-jornada-bloco-3
verified: 2026-10-10T04:10:00Z
status: gaps_found
score: 7/9 must-haves verified
covered_files: [".planning/phases/51-consertos-da-jornada-bloco-3/51-01-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-01-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-02-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-02-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-03-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-03-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-04-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-04-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-05-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-05-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-06-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-06-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-07-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-07-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-08-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-08-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-09-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-09-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-10-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-10-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-11-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-11-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-12-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-12-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-13-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-13-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-14-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-14-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-15-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-15-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-16-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-16-SUMMARY.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-17-PLAN.md", ".planning/phases/51-consertos-da-jornada-bloco-3/51-17-SUMMARY.md", "docs/compliance/recibo-exclusao.json", "docs/compliance/sql/gen-recibo-exclusao.cjs", "scripts/p51_aceite.cjs", "src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx", "src/features/avaliacao-cognitiva/components/RavenCandidatoCard.tsx", "src/features/avaliacao/components/AvaliacaoContainer.tsx", "src/features/entrevista/components/EntrevistaScorecardInline.tsx", "src/features/explicacao/services/explicacaoService.ts", "src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx", "src/features/hub-candidato/lib/instrumentosDaVaga.ts", "src/features/revisao/services/revisaoService.ts", "supabase/functions/_shared/reciboExclusao.ts", "supabase/functions/notificar-candidato/index.ts", "supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql", "supabase/migrations/20261008000002_p51_revisao_rejeicao.sql", "supabase/migrations/20261008000003_p51_fila_tres_origens.sql", "supabase/migrations/20261008000004_p51_motor_revisao_rejeicao.sql", "supabase/migrations/20261008000005_p51_d23_decisor_revertido.sql"]
covered_digest: "v3:sha256:d7ff5435a461d9bf513b3e0d45179ed1c0167d2a8ddb91e17d6c8a5af6bc6bf6"
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "O recibo de exclusão diz o que sai e o que fica — inventário = motor (ROADMAP SC6, JORN-49)"
    status: partial
    reason: "O recibo vivo em PROD (EFs `exportar-meus-dados` v8 / `executar-direito-titular` v14, e o `recibo-exclusao.json`) ainda promete duas coisas que nenhum objeto vivo faz. (1) A linha `dados_de_cadastro` diz que a disponibilidade «vai ser apagada»; o corpo vivo de `anonimizar_candidato` não cita a tabela `disponibilidade` e nenhuma função de `public` a apaga ou a zera (WINDOWS 89, medido no 51-05 e re-medido nesta verificação). (2) A linha `estado_e_faixa_etaria` diz que o estado (UF) fica «para relatório agregado»; o corpo vivo de `gerar_bias_snapshot` lê `faixa_etaria_materializada` mas NÃO lê `estado` (re-medido nesta verificação; é o WR-02 do code review). O que o JORN-49 pedia literalmente — não prometer apagar «endereço» inteiro e dizer que estado e faixa ficam — foi entregue; o que o critério de sucesso 6 chama de «inventário = motor» não vale para estas duas linhas."
    artifacts:
      - path: "docs/compliance/recibo-exclusao.json"
        issue: "item `dados_de_cadastro` lista `disponibilidade.*` como apagada; item `estado_e_faixa_etaria` atribui a `estado` uma finalidade sem consumidor"
      - path: "docs/compliance/sql/gen-recibo-exclusao.cjs"
        issue: "gerador da linha 575 em diante emite as duas frases; o inventário (`pii-inventory.yaml`) classifica `disponibilidade` como `apagar`"
      - path: "supabase/functions/_shared/reciboExclusao.ts"
        issue: "cópia embarcada nas EFs já deployadas, com as mesmas duas frases"
    missing:
      - "Decisão do operador sobre a disponibilidade: (a) o motor passa a apagar `disponibilidade` (migration própria, escrita em purga viva, portão de fase destrutiva) ou (b) reclassificar para «mantém» com base legal redigida por ele"
      - "Decisão do operador sobre a UF: separar as duas razões no texto («faixa etária: relatório agregado»; «UF: o cadastro exige uma UF válida e não há como apagá-la sem alterar a estrutura») ou fazer `gerar_bias_snapshot` usar `estado` com supressão k=5 (mudança de produto)"
      - "Regerar o recibo (`gen-recibo-exclusao.cjs`), o `reciboExclusao.ts`, o `.generated.ts` do cliente, `pii-inventory.yaml/.md` e o teste do gerador; redeploy das duas EFs pelo `efdeploy.cjs`"
  - truth: "Depois de concluir uma prova, «Voltar às avaliações» abre uma lista que já reflete a prova feita (derivada de JORN-46/D-37; mesma classe de defeito que o 51-07 consertou para o Raven)"
    status: failed
    reason: "`ProvaCognitivaScreen.handleSubmit` faz `setDone(true)` sem `setQueryData` nem `invalidateQueries` em `['avaliacao','status',id]` (grep confirma: nenhuma ocorrência no arquivo). O 51-01 trocou o destino de «Prova registrada» do painel para a lista, e o `staleTime` global é de 5 min (`src/App.tsx:40`); a lista abre do cache com o card cognitivo ainda em «Começar avaliação». Refazer a prova é possível, e `pontuar_cognitivo` faz upsert sem bloquear reenvio (medido pelo review em PROD). A banda que o RH vê passa a ser a da 2ª tentativa. O mesmo vale, sem efeito no score, para o caso aberto do SJT, o Big Five (devolutiva) e a Redação. O SJT múltipla escolha já invalida (`SjtMultiplaEscolhaScreen.tsx:168`) e o Raven também (`AvaliacaoRavenScreen.tsx:143-146`). Severidade: WARNING (não impede o critério 4 como escrito, que trata de rótulo e destino, mas é um defeito que o próprio JORN-46 expôs)."
    artifacts:
      - path: "src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx"
        issue: "sucesso do envio não atualiza nem invalida o cache de status (linhas ~176-183)"
      - path: "src/features/avaliacao/components/SjtCasoAbertoScreen.tsx"
        issue: "mesmo padrão, sem invalidação do status"
    missing:
      - "No sucesso de `submitProva`, antes de `setDone(true)`: `setQueryData` marcando `cognitivo.registrado = true` e `invalidateQueries` em `avaliacaoStatusKey(id)` (molde do Raven); o mesmo no caso aberto, no envio final do Big Five e no último envio da Redação"
      - "Opcional, com review próprio: `pontuar_cognitivo` recusar reenvio quando já existe a linha `cognitivo/raciocinio_logico`"
human_verification:
  - test: "JORN-44 — abrir `/candidato/avaliacao/<id>` de uma candidatura em avaliação assíncrona"
    expected: "«Ir ao painel» no cabeçalho ao lado de «Sair»; no estado «você concluiu todas as avaliações», o botão «Ir ao painel» abaixo da frase; os dois levam ao painel"
    why_human: "Aparência e fluxo de tela; os testes de comportamento (`navegacao-provas`, `AvaliacaoContainer.test`) passam e o marcador está servido, mas ninguém abriu a tela em PROD"
  - test: "JORN-46 — dentro da redação, da SJT, do caso prático, do Big Five e da devolutiva"
    expected: "O botão diz «Voltar às avaliações» e leva à lista; com a etapa já avançada, «Ir ao painel» leva direto ao painel"
    why_human: "Fluxo de tela em PROD, nunca percorrido pelo operador"
  - test: "JORN-45 — hub do RH de uma candidatura com avaliações respondidas"
    expected: "«N avaliações respondidas» + «Ver respostas» abre o detalhe no lugar; Big Five diz «Concluído» ou «Não fez», sem número; no caso prático, o texto do candidato ao lado das citações"
    why_human: "Layout e legibilidade do detalhe expandido; `hub-ver-respostas` está no chunk `PerfilCandidatoRHPage-CRZgAq_a.js` servido, mas a tela não foi aberta"
  - test: "JORN-48 — hub, container do candidato e tela do Raven"
    expected: "No hub, «Prova cognitiva» (ou «Não se aplica a esta vaga») logo acima do bloco «Raciocínio lógico (Matrizes)»; no container, o card «Prova cognitiva»; na tela do Raven, o título «Raciocínio lógico (Matrizes)». Atenção: as 15 vagas têm `aplica_cognitivo=false` (51-03), então «Prova cognitiva» mostrará «Não se aplica» para todas sem faixa"
    why_human: "Distinção percebida pelo leitor; o guarda por forma passa, mas o julgamento é de quem lê"
  - test: "JORN-47 — workspace de entrevista com as notas vazias"
    expected: "«Salvar avaliação» desabilitado e a mensagem «Escreva as notas do gestor para salvar a avaliação.» na tela"
    why_human: "Estado visual do botão e da mensagem no navegador; o servidor já recusa nota vazia (verificado em PROD nas duas assinaturas)"
  - test: "JORN-49 — recibo de exclusão em `/candidato/privacidade`"
    expected: "O recibo não lista «endereço» inteiro como apagado e diz que estado e faixa etária ficam. Depende da decisão do gap acima: o texto atual ainda promete apagar a disponibilidade"
    why_human: "Texto jurídico dirigido ao titular; a redação final é decisão do operador"
---

# Fase 51: Consertos da Jornada — Bloco 3 — Relatório de Verificação

**Objetivo da fase:** os oito defeitos da UAT de 27–29/09 deixam de existir (JORN-42..49): revisão (Art. 20) de toda rejeição, com reabertura na etapa certa; porta de entrada do Raven no painel; navegação com rótulos que dizem o destino; hub do RH que abre as respostas; notas de entrevista obrigatórias nos dois lados; nomes distintos para os dois instrumentos cognitivos; recibo de exclusão que diz o que sai e o que fica.
**Verificado em:** 2026-10-10
**Status:** gaps_found
**Re-verificação:** Não — verificação inicial

## Resumo

A parte pesada da fase (JORN-42, o direito de revisão de toda rejeição) está de fato no ar e funciona: reli o banco de PROD (só leitura) e a candidatura `8e4bb7a0` mostra os dois pedidos, a reabertura em `triagem`, o knockout que não voltou, o revisor diferente do decisor e nenhuma linha de histórico depois da reversão. O JORN-43, 44, 45, 46, 47 e 48 também estão no código, no ar e cobertos por teste. O que falta é do JORN-49: o recibo de exclusão, tal como está deployado, ainda diz ao titular duas coisas que o motor não faz. Isso é texto jurídico, a decisão é do operador, e o critério de sucesso 6 ficou só em parte cumprido. Há ainda um defeito de cache (WR-01 do review) que o próprio JORN-46 expôs.

## Verdades Observáveis

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | SC1 — knockout e rejeição pelo RH são revistos a pedido do candidato; o RH2 responde procedente na fila, com selo de origem; a candidatura reabre na etapa certa (knockout em `triagem`) com trilha, `em_analise` e prazo; o knockout não volta; a análise de IA é despachada; quem rejeitou não responde | ✓ VERIFIED | Re-consulta em PROD, só leitura, da `8e4bb7a0`: pedido 1 `automatica`, `etapa_rejeitada=inscricao`, `etapa_reabertura=triagem`, sem decisor, `revertida`, `reaberta_em` e prazo preenchidos; pedido 2 `humana_triagem`, `revertida`, `respondida_por <> rejeitado_por`; candidatura em `triagem`/`em_analise`; 0 linhas de histórico depois da resposta. Código de `responder_revisao_rejeicao` (0002:~510-640): REVISAO-05 com 42501, reabertura sob `app.transicao_sancionada`, `feedback_rejeicao=NULL`, despacho de IA só em `origem='automatica'`, o knockout nunca é regravado. `solicitar_revisao_rejeicao` aceita rejeição humana em qualquer etapa (`etapa_reabertura = v_de`). Sessão real em `51-17-SESSAO-REAL.md`: seis fases N/N. Limite: a rejeição humana só foi exercida em PROD na `triagem`; as demais etapas estão cobertas pelo ensaio (`51b=18/18`), não por sessão real |
| 2 | SC2 — o ciclo da decisão final continua byte-idêntico (smokes p42/p48/p49 verdes) e nada abriu para `anon` nem para candidato de outra candidatura | ✓ VERIFIED | Ledger de PROD tem `20261008000001..5` e o `md5(statements[1])` de cada um é igual ao `md5` do arquivo. `revisao_rejeicao`: RLS ligada, 0 policy, `anon` e `authenticated` sem `SELECT`. Nenhuma view depende da tabela. Nenhuma função que cita `revisao_rejeicao` tem `EXECUTE` para `anon` (consulta em `pg_proc`). ACL das RPCs novas: só `postgres`, `authenticated`, `service_role`. O ensaio do 51-16 registra os smokes legados p42/p45/p46/p48/p49 verdes. Não os re-executei: o ensaio escreve em PROD (com rollback) e a regra aqui é nunca escrever. `solicitar_revisao_decisao` mantém `EXECUTE` para `anon` (IN-16, anterior à fase, não toca a tabela nova) |
| 3 | SC3 — o candidato com o Raven liberado vê o card «Raciocínio lógico (Matrizes)» no painel enquanto não concluiu, e só então; o servidor devolve só booleanos (RNF-07a) | ✓ VERIFIED | `RavenCandidatoCard` retorna `null` quando encerrada, carregando, erro, não liberado ou `registrado`; montado em `DashboardCandidatoPage.tsx:496`. Migration 0001 acrescenta a chave `raven` com só `liberado` e `registrado`; `get_avaliacao_status` sem `EXECUTE` para `anon`. `getAvaliacaoStatus` só aceita `=== true`. Testes do card e do serviço passam (rodada desta verificação). Sessão real: card visível com «Fazer a avaliação», e-mail de liberação nomeando o instrumento; fase `raven` 4/4. O operador não fez a prova (opcional), então o sumiço do card depois de concluir está coberto por teste, não por sessão real |
| 4 | SC4 — dentro de uma prova, «Voltar às avaliações» leva à lista e «Ir ao painel» ao painel; a lista tem «Ir ao painel» no cabeçalho e no tudo-concluído | ✓ VERIFIED | `AvaliacaoContainer` injeta `onBackToPanel={() => navigate('/candidato/dashboard')}` (linha 578) e o shell renderiza o botão no cabeçalho (228-232) e no estado concluído (276-281). Telas de prova: `backToList` → `/candidato/avaliacao/:id`, `goToPanel` → `/candidato/dashboard`. Guardas por forma `rotulos-navegacao-candidato` e `nomes-instrumentos` passam. Marcadores servidos em `index-BnGosyaL.js`. Ver o gap 2 sobre a lista que abre do cache |
| 5 | SC5 — no hub do RH, «Ver respostas» abre o detalhe (SJT; Big Five «Concluído/Não fez»; texto integral do caso prático ao lado das citações) e o instrumento que a vaga não aplica diz «Não se aplica a esta vaga»; nenhuma superfície confunde os dois instrumentos cognitivos | ✓ VERIFIED | `AvaliacoesRespondidasBloco` (botão `hub-ver-respostas`, `aria-expanded`, detalhe montado só ao clique) usado em `HubCandidatoRH`. `ScorecardAvaliacao`: linhas «Big Five — Concluído/Não fez», citações + texto integral lado a lado (D-20). `instrumentosDaVaga` nunca afirma «não se aplica» por ausência (três valores, `desconhecido` por padrão). Grep em `src/` e nas EFs: «Avaliação Cognitiva» / «Avaliação de Raciocínio» não restam em texto de interface; export e e-mail dizem «Raciocínio lógico (Matrizes)». Os marcadores `hub-ver-respostas`, «Não se aplica a esta vaga» e «Big Five — Concluído» estão no chunk `PerfilCandidatoRHPage-CRZgAq_a.js`, servido. Tela não aberta por humano: ver Verificação Humana |
| 6 | SC6a — salvar a avaliação de entrevista sem notas fica bloqueado com mensagem na tela | ✓ VERIFIED | `EntrevistaScorecardInline`: `semNotas = notas.trim().length === 0` desabilita o botão e mostra `entrevista-notas-obrigatorias`; `handleSalvar` também guarda. Servidor em PROD: as duas assinaturas de `salvar_avaliacao_entrevista` existem sem `EXECUTE` para `anon`; a de 4 argumentos exige e apara as notas, e a de 3 argumentos delega a ela. Marcador «Escreva as notas do gestor» está em `EntrevistaWorkspace-E1FwAr8S.js`, servido |
| 7 | SC6b — o recibo de exclusão não promete apagar «endereço» inteiro, diz que estado e faixa ficam para relatório agregado, e o inventário é igual ao motor | ✗ FAILED (parcial) | O que o JORN-49 pedia literalmente está feito: o recibo lista o que o tombstone apaga (cidade com sentinela, gênero e endereço nulos) e a linha `estado_e_faixa_etaria` existe no JSON e no bundle. Mas o inventário não é igual ao motor: (i) o recibo diz que a disponibilidade «vai ser apagada» e `anonimizar_candidato` vivo não cita `disponibilidade` (consulta `pg_get_functiondef`, `cita=false`; os `DELETE` do corpo só tocam `respostas_raven/bigfive/disc/formulario`); (ii) o recibo atribui à UF a finalidade «relatório agregado» e `gerar_bias_snapshot` vivo não lê `estado` (`le_estado=false`, `le_faixa=true`). Ver gap 1 |
| 8 | SC7 — todo apply e deploy pela via do projeto, JORN-42 só depois de review bloqueante e decisão escrita, `origin/main..HEAD` vazio, marcadores servidos no chunk certo | ✓ VERIFIED | Ledger = arquivos pelo md5. Três reviews de portão (`-1`, `-2`, `-3`, 0 crítico) e a decisão do operador verbatim em `51-16-DECISAO-PENDENTE.md`. Marcadores conferidos por mim nos chunks servidos: `raven-candidato-card` (índice), `fila-origem-badge` (`RevisoesRHPage-8PfiAeM0.js`), `hub-ver-respostas` (`PerfilCandidatoRHPage`), notas obrigatórias (`EntrevistaWorkspace`). `git log origin/main..HEAD` tem 3 commits, todos só de `.planning/` (ROADMAP, STATE, SESSAO-REAL, REVIEW, DISPOSITION); nenhum arquivo de código está sem push. Versões das EFs (v19/v8/v14) vêm do orquestrador e do 51-16-SUMMARY; não as re-medi |
| 9 | Derivada — depois de concluir uma prova, a lista de avaliações reflete a prova feita | ✗ FAILED (WARNING) | Ver gap 2. `ProvaCognitivaScreen` não invalida o cache de status; o 51-07 fez isso só para o Raven |

**Pontuação:** 7/9 verdades verificadas (0 presentes com comportamento não exercido).

## Itens Diferidos

Nenhum. Não há fase posterior no ROADMAP que cubra estes gaps (o M8 fecha com a Phase 51 e o fecho do milestone; não há M9).

## Artefatos Obrigatórios

| Artefato | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| `supabase/migrations/20261008000001..5` | Raven, tabela de pedidos, fila com três origens, motor/LGPD, D-23 | ✓ VERIFIED | No ledger de PROD com md5 igual ao arquivo |
| `public.revisao_rejeicao` | Tabela sem policy e sem privilégio | ✓ VERIFIED | RLS ligada, 0 policy, sem `SELECT` para `anon` e `authenticated`; 4 linhas, 3 automáticas |
| `RavenCandidatoCard.tsx` + `useStatusRavenCandidato.ts` | Porta de entrada do Raven | ✓ VERIFIED | Montado no painel; só booleanos |
| `AvaliacoesRespondidasBloco.tsx`, `instrumentosDaVaga.ts` | «Ver respostas» e «Não se aplica» | ✓ VERIFIED | Montados em `HubCandidatoRH`; servidos |
| `EntrevistaScorecardInline.tsx` | Notas obrigatórias | ✓ VERIFIED | Cliente e servidor |
| `explicacaoService.ts`, `revisaoService.ts`, `FilaRevisoesTable`, `ResponderRevisaoDialog` | Pedido e resposta para as três origens | ✓ VERIFIED | Roteiam por origem do servidor; sessão real passou |
| `docs/compliance/recibo-exclusao.json` + `gen-recibo-exclusao.cjs` + `reciboExclusao.ts` | Recibo exato | ⚠️ PARCIAL | Existe, está ligado e no ar, mas duas linhas dizem mais do que o motor faz |
| `scripts/p51_aceite.cjs` | Sonda de aceite só leitura | ✓ VERIFIED | Rodada em PROD 6 fases N/N; auto-teste de 203 afirmações |
| `ProvaCognitivaScreen.tsx` | Fim da prova coerente com a lista | ⚠️ PARCIAL | Rótulo e destino certos; sem invalidação do cache |

## Verificação de Ligações

| De | Para | Via | Status | Detalhes |
|----|------|-----|--------|----------|
| `DashboardCandidatoPage` | `RavenCandidatoCard` | render dentro do `map` de candidaturas | WIRED | linha 496, fora do ramo `ehEntrevista` |
| `RavenCandidatoCard` | `/candidato/avaliacao-raciocinio/:id` | `navigate` | WIRED | rota existe em `routes.tsx:327` |
| `RavenCandidatoCard` | `get_avaliacao_status.raven` | `useStatusRavenCandidato` → `getAvaliacaoStatus` | WIRED | mesma chave de cache do container |
| `ExplicacaoCandidatoPage` | `solicitar_revisao_rejeicao` / `solicitar_revisao_decisao` | `solicitarRevisao(candidaturaId, origem)` | WIRED | origem lida de `estado_revisao_rejeicao` |
| `RevisoesRHPage` | `responder_revisao_rejeicao` / `responder_revisao_decisao` | `revisaoService` por `origem` | WIRED | `pedido_id` na fila |
| `rejeitar_candidatura` / `registrar_decisao` | trava D-23 | migration 0005 | WIRED | recusa do decisor revertido provada em sessão real (mensagem própria no cliente) |
| `AvaliacaoContainer` | `/candidato/dashboard` | `onBackToPanel` | WIRED | |
| `ProvaCognitivaScreen` (envio) | cache `['avaliacao','status',id]` | `invalidateQueries` | NOT_WIRED | gap 2 |
| `anonimizar_candidato` (motor) | `disponibilidade` | `UPDATE`/`DELETE` | NOT_WIRED | gap 1 |
| `gerar_bias_snapshot` | `candidatos.estado` | leitura | NOT_WIRED | gap 1 |

## Rastreio de Fluxo de Dados (Nível 4)

| Artefato | Variável | Fonte | Dados reais | Status |
|----------|----------|-------|-------------|--------|
| `RavenCandidatoCard` | `raven.{liberado,registrado}` | `get_avaliacao_status` (EXISTS em `cognitivo_liberacao` e `scores_raven`) | Sim | ✓ FLOWING |
| `AvaliacoesRespondidasBloco` | `n` de avaliações | `useScorecardCandidato` → `linhasDeAvaliacao` (mesma fonte do detalhe) | Sim | ✓ FLOWING |
| Fila do RH | `origem`, `pedido_id` | `listar_revisoes_decisao` (3 origens) | Sim (sessão real) | ✓ FLOWING |
| Recibo de exclusão | texto das linhas «sai/mantém» | `recibo-exclusao.json` gerado do inventário | Texto estático gerado, 2 linhas sem lastro no motor | ⚠️ parcial |

## Verificações Pontuais de Comportamento

| Comportamento | Comando | Resultado | Status |
|---------------|---------|-----------|--------|
| Testes das áreas da fase (guardas, avaliacao-cognitiva, hub-candidato, entrevista, revisao, explicacao, privacidade) | `npx vitest run …` | 833 passam, 2 reprovam (ver abaixo) | ✓ PASS para a fase |
| Estado da `8e4bb7a0` em PROD | `p46apply.cjs sql "set transaction read only; …"` | pedidos, vereditos, reabertura e 0 histórico depois da resposta, como na sessão | ✓ PASS |
| `anonimizar_candidato` apaga `disponibilidade`? | `pg_get_functiondef … ~* 'disponibilidade'` | `false` | ✗ FAIL (gap 1) |
| `gerar_bias_snapshot` lê `estado`? | idem | `false` | ✗ FAIL (gap 1) |

## Execução de Sondas

| Sonda | Comando | Resultado | Status |
|-------|---------|-----------|--------|
| `scripts/p51_aceite.cjs` | seis fases em PROD (sessão do operador) | 13/13, 20/20, 21/21, 23/23, 23/23, 4/4 | PASS (registrado em `51-17-SESSAO-REAL.md`; não re-executei, pois o estado temporal das fases `reaberta-10min` não se repete) |

## Cobertura de Requisitos

| Requisito | Planos | Descrição | Status | Evidência |
|-----------|--------|-----------|--------|-----------|
| JORN-42 | 51-08..51-17 | Direito de revisão independe do caminho da rejeição | ✓ SATISFEITO | Verdade 1 e 2; D-23 provado em sessão real |
| JORN-43 | 51-06, 51-07, 51-17 | Raven tem porta de entrada no painel | ✓ SATISFEITO | Verdade 3 |
| JORN-44 | 51-01, 51-17 | Lista de avaliações oferece volta ao painel | ✓ SATISFEITO (tela pendente de conferência humana) | Verdade 4 |
| JORN-45 | 51-02, 51-17 | Hub do RH abre os registros que anuncia | ✓ SATISFEITO (tela pendente de conferência humana) | Verdade 5 |
| JORN-46 | 51-01, 51-17 | «Voltar» da redação leva à lista, com rótulo que diz o destino | ✓ SATISFEITO, com a ressalva do gap 2 | Verdade 4 e 9 |
| JORN-47 | 51-04, 51-17 | Notas de entrevista com a mesma obrigatoriedade nos dois lados | ✓ SATISFEITO | Verdade 6 |
| JORN-48 | 51-03, 51-04, 51-07, 51-17 | Os dois instrumentos cognitivos são distinguíveis | ✓ SATISFEITO (tela pendente de conferência humana) | Verdade 5 |
| JORN-49 | 51-05, 51-17 | O recibo não promete mais do que faz | ✗ PARCIAL | Verdade 7: o endereço saiu da promessa, mas a disponibilidade e a finalidade da UF seguem sem lastro |

Os oito IDs aparecem em pelo menos um PLAN e estão mapeados à Phase 51 no `REQUIREMENTS.md` (8 linhas de rastreabilidade). Não há requisito órfão: nenhuma outra linha do `REQUIREMENTS.md` aponta para a Phase 51.

Sugestão para o `REQUIREMENTS.md` (decisão do orquestrador): marcar JORN-42, 43, 44, 45, 46, 47 e 48 como concluídos; manter JORN-49 em `[ ]` até a decisão do gap 1. JORN-44, 45, 46 e 48 têm a conferência de tela pendente (abaixo); se o orquestrador preferir só marcar depois dela, a UAT cobre.

## Anti-Padrões Encontrados

| Arquivo | Linha | Padrão | Severidade | Impacto |
|---------|-------|--------|------------|---------|
| `ProvaCognitivaScreen.tsx` | ~176-183 | envio sem invalidar o cache de status | ⚠️ Warning | Gap 2 (WR-01 do review) |
| `gen-recibo-exclusao.cjs` / `recibo-exclusao.json` | 575-591 | texto ao titular com finalidade sem consumidor e promessa de apagar sem executor | 🛑 Blocker para o JORN-49 | Gap 1 (WR-02 do review + WINDOWS 89) |
| `src/__tests__/promessasComExecutor.test.ts` | 586, 676 | 2 casos vermelhos | ⚠️ Warning (fora da fase) | Ver abaixo |
| `explicacaoService.ts` (391, 681), `revisaoService.ts` (360, 416) | — | 4 casts `supabase.rpc as unknown as` | ℹ️ Info | Dívida nomeada no 51-17; `database.types.ts` já conhece as RPCs |
| `DevolutivaBigFiveView.tsx:174`, `RedacaoEditorScreen.tsx:320` | — | cópia «acompanhe pelo painel» acima de botão que leva à lista | ℹ️ Info | IN-04 do review |
| `ScorecardAvaliacao.tsx:366` | — | «Não fez» por ausência de linha, para Big Five em andamento | ℹ️ Info | IN-03 do review |

Marcadores de dívida (`TBD`, `FIXME`, `XXX`) nos arquivos da fase: nenhum. As duas ocorrências de «TODO» no diff são a palavra comum em português, dentro de comentário.

### Portão de regressão: 2 testes vermelhos fora da fase

`src/__tests__/promessasComExecutor.test.ts` tem 2 casos vermelhos (re-executei: 2 de 13, a suíte completa do orquestrador deu 2698/2700). Os dois leem o ROADMAP e conferem o adiamento do executor de purga de `notificacoes_enviadas` contra a fase dona, a Phase 46. A 46 foi marcada concluída em 2026-10-05 (commit `ceab3336`), e o portão ficou vermelho de propósito. Não é regressão da Phase 51 (os mesmos 2 falham em `refs/gsd/51-12/base`, antes de qualquer commit do 51-12, como registra `deferred-items.md`). É, porém, **pendência aberta para o fecho do M8**: ou o executor de purga de `notificacoes_enviadas` é entregue, ou o adiamento ganha nova fase dona.

`npm run lint`: 89 erros de `tsc`, base congelada, sem alteração (informado pelo orquestrador e pelo 51-17; não re-executei).

## Verificação Humana Necessária

Os seis itens de tela do `<human-check>` do 51-17 não foram feitos pelo operador (o plano os entrega à UAT do fim da fase). Não consegui estabelecê-los de outra forma: os marcadores estão servidos nos chunks certos e os testes de comportamento passam, mas ninguém abriu as telas em PROD. Estão listados no frontmatter (`human_verification`):

1. **JORN-44** — «Ir ao painel» na lista de avaliações (cabeçalho e tudo-concluído).
2. **JORN-46** — «Voltar às avaliações» / «Ir ao painel» dentro de redação, SJT, caso prático, Big Five e devolutiva.
3. **JORN-45** — «Ver respostas» no hub: detalhe no lugar, Big Five «Concluído/Não fez», texto integral ao lado das citações.
4. **JORN-48** — «Prova cognitiva» × «Raciocínio lógico (Matrizes)» no hub, no container e na tela do Raven.
5. **JORN-47** — Salvar desabilitado e mensagem com as notas vazias.
6. **JORN-49** — leitura do recibo (depende da decisão do gap 1).

## Resumo dos Gaps

**Gap 1 — JORN-49, recibo ainda promete o que o motor não faz (decisão do operador).** O texto que o 51-05 reescreveu resolveu o «endereço», mas deixou passar duas linhas que o critério «inventário = motor» pega: a disponibilidade (anunciada como apagada, nunca apagada; WINDOWS 89, aberto desde o 51-05 e sem resposta no 51-16) e a finalidade da UF (o WR-02 do review, disposição `open`). As duas estão no ar nas EFs. O conserto é de texto (ou de motor, no caso da disponibilidade) e exige a decisão do operador sobre a redação e a base legal. Ele já disse que a redação com base legal é dele (precedente C-10).

**Gap 2 — cache da lista de avaliações depois de uma prova (WARNING).** Pequeno e mecânico: o mesmo `setQueryData` + `invalidateQueries` que o Raven já faz, aplicado à prova cognitiva, ao caso aberto, ao Big Five e à Redação. É um conserto de poucas linhas com teste; a defesa no servidor (recusar reenvio em `pontuar_cognitivo`) pede review próprio.

Os dois gaps podem ir num único plano de fechamento (`/gsd-plan-phase 51 --gaps`). O conjunto de itens `open` do `51-REVIEW-DISPOSITION.md` (IN-01..IN-06) são informativos e não bloqueiam.

Fora do escopo desta verificação, mas já registrados e sem conserto, por decisão do operador: o PATCH direto em `candidaturas` que contorna o D-23 (WR-01 do portão 3; anterior à P51 e igual para o D-23 da P48), o diálogo «Responder revisão» sem motivo/justificativa no pedido humano (backlog), e as ocorrências de UI/UX da sessão real (link de e-mail sem checar sessão, falta de botão para voltar ao dashboard na área board, texto «Agradecemos seu interesse» a deixar em branco, `SelectItem` com texto branco sobre fundo branco).

---

_Verificado: 2026-10-10_
_Verificador: Claude (gsd-verifier)_
