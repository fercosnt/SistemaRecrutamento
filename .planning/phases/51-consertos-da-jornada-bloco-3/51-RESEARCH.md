# Phase 51: Consertos da Jornada — Bloco 3 — Research

**Pesquisado em:** 2026-10-08 (tudo em PROD foi lido com `node p46apply.cjs run` precedido de `set transaction read only;`. Nenhuma escrita, nenhum apply, nenhuma migration)
**Domínio:** direito de revisão (Art. 20) em três origens de rejeição, dois instrumentos cognitivos com nomes iguais, navegação do candidato, hub do RH, notas de entrevista, recibo de exclusão
**Confiança:** ALTA no que foi medido no banco e no código. MÉDIA na recomendação de mecanismo do JORN-42, que é julgamento sobre custos medidos

---

<user_constraints>
## Restrições do usuário (de 51-CONTEXT.md, copiadas literalmente)

### Decisões travadas

#### Herdadas — NÃO reabrir [informational]

- **Restrições de execução da Phase 49 continuam valendo integralmente** (`49-CONTEXT.md`
  §«Restrições de execução»): D-49 (a pesquisa remede o que é load-bearing e devolve correções de
  fato ao operador antes do plano), D-50 (varrer pela forma, artefato com padrão + classificação +
  cobertura de `src/`, `supabase/functions/` e definições VIVAS), D-51 (aceite de comportamento =
  consulta no banco), D-52 (via `p46apply.cjs` / `efdeploy.cjs`; `git log origin/main..HEAD` vazio
  depois de apply visível; marcador no chunk certo), D-53 (`tsc` ≤ 90), D-54 (portão de escrita em
  PROD: aditivo sem pausa; UPDATE retroativo com checkpoint e contagem antes/depois; apagar linha
  só com decisão explícita), D-55 (sequência migration → EF → cliente tem dono), D-56 (portões são
  código: varrer antes de mudar o que um smoke assere, provar que ainda morde), D-57 (coluna nova
  em tabela inventariada = checklist LGPD completo de 10 passos), D-58 (linguagem de produto;
  `forbidden-strings.grep.test.ts`; nenhuma ocorrência literal nova do canal de privacidade).
- **Phase 48:** D-01 (reabertura `rejeitado → decisao_final` é transição sancionada); D-02
  («marcar, não apagar»); D-21 (predicado canônico `candidatura_encerrada`); regra de
  retroatividade (nenhum e-mail retroativo a candidato real; UPDATE retroativo → checkpoint com
  contagem medida).
- **Phase 50:** D-02 (helper vivo `public.is_active_rh_user()` em todo ramo de RH); D-07 (dados de
  teste visíveis ao RH); D-12 (mudança de controle de acesso = review bloqueante antes do apply +
  prova de que nada abriu para `anon`/candidato, views incluídas).
- **Phase 49 D-31:** Big Five aparece ao RH como «concluído» / «não fez», sem número e sem cor.
- **REVISAO-05:** quem decidiu não responde à revisão da própria decisão.
- **⚠ Revogada por decisão do operador (29/09, JORN-42):** a D-20 da 48 («rejeição humana na
  triagem: explicação + canal, sem pedido de revisão»). O comentário de
  `explicacaoService.ts` (interface `ExplicacaoCandidato.origem`) que justifica a ausência do CTA
  fora de `'humana'` descreve a regra antiga e tem de ser reescrito junto com o código.

#### Revisão sempre disponível (JORN-42)

- **D-01:** O pedido de revisão fica disponível para **toda** rejeição — decisão final
  (`'humana'`), rejeição humana na triagem (`'humana_triagem'`, `rejeitar_candidatura`) **e
  knockout automático** (`'automatica'`). Os textos de explicação continuam distintos por origem
  («nenhuma pessoa avaliou» × «uma pessoa da equipe») — trocar um pelo outro seria mentir sobre
  quem decidiu. — **Reversibility:** one-way — `solicitar_revisao_decisao` hoje exige linha em
  `decisao_final`; aceitar as outras origens exige migration (gravar a rejeição em `decisao_final`
  ou um registro próprio do pedido), e desfazer depois retira um direito já exercido.
- **D-02:** Revisão **procedente** de rejeição na triagem ou de knockout **reabre a candidatura na
  etapa em que ela foi rejeitada**, status ativo, e ela segue o funil dali. A procedente de decisão
  final continua reabrindo em `decisao_final` (D-01 da 48), sem mudança.
- **D-03:** Knockout revertido **não é reaplicado** a essa candidatura — a mesma resposta que
  disparou o knockout não pode re-eliminar quem a revisão reabriu.
- **D-04:** Procedente com a vaga **inativa ou arquivada reabre mesmo assim**. O direito não
  depende do estado da vaga; vale o mesmo `prazo_nova_decisao_em` da reversão de hoje.
- **D-05:** **Sem prazo para pedir**, como hoje: o pedido existe enquanto a candidatura existir
  (retenção e purga encerram o direito naturalmente).
- **D-06:** **Um pedido por rejeição.** Improcedente encerra; uma nova rejeição depois de
  reabertura gera um direito novo.
- **D-07:** Só `status = 'rejeitado'` entra. Retirada pelo candidato e «finalizado» seguem as
  regras atuais.
- **D-08:** Rejeições **anteriores ao conserto** (incluindo as 2 candidaturas medidas com
  justificativa e `decisao_final` NULL) **ganham o botão**, **sem e-mail retroativo**. Se isso
  exigir UPDATE/INSERT retroativo sobre linha de candidato real → `checkpoint:decision` com a
  contagem medida antes/depois (D-54 da 49). — **Reversibility:** costly — backfill sobre
  candidaturas reais; desfazer exige identificar e reverter linha a linha.
- **D-09:** O **e-mail de rejeição** (rejeições novas) passa a mencionar o direito de pedir revisão,
  com link para a página de explicação. Vale para as três origens.
- **D-10:** As novas origens entram na **mesma fila de revisões** (`listar_revisoes_decisao` /
  `contar_revisoes_pendentes`, recrutador ativo + admin, Phase 50) com a mesma regra: REVISAO-05
  para rejeição humana (quem rejeitou não responde); no knockout não há decisor, qualquer RH ativo
  responde.
- **D-11:** Ao responder a revisão de um **knockout**, o RH vê a **pergunta eliminatória, a resposta
  do candidato e a opção que eliminou**. Não é dado novo para o RH.
- **D-12:** Mesmo SLA interno (`revisao_art20`, nunca exibido ao candidato) e **selo de origem** em
  cada linha da fila: decisão final / triagem / knockout.

#### Os dois instrumentos cognitivos (JORN-43, JORN-48)

- **D-13:** A avaliação de raciocínio (Raven) ganha **card no painel do candidato**
  (`/candidato/dashboard`), visível **só enquanto liberada e não respondida** (some quando
  concluída ou revogada — `cognitivo_liberacao.revogado_em`). **Não** entra no `AvaliacaoContainer`:
  aquela lista é por etapa, e o Raven não pertence a etapa nenhuma (comentário do
  `HubCandidatoRH.tsx` sobre o `LiberacaoCognitivoBlock`).
- **D-14:** **Sem aviso** (e-mail) ao liberar. A aplicação é presencial a poucos finalistas (decisão
  de 2026-08-26, cabeçalho de `ravenService.ts`); o card basta.
- **D-15:** Nomes: o instrumento textual liberado pela vaga (`aplica_cognitivo`,
  `ProvaCognitivaScreen`, `cognitivo_itens`) passa a **«Prova cognitiva»**; o Raven
  (`AvaliacaoRavenScreen`, `questoes_raven`) passa a **«Raciocínio lógico (Matrizes)»**. Nenhum dos
  dois continua sendo só «Avaliação cognitiva». Vale para RH **e** candidato, em toda superfície
  (hub, container, telas, toasts, rótulos de exportação). Respeita D-58 da 49 («avaliação
  cognitiva», nunca «teste psicológico»).
- **D-16:** No hub do RH, a seção de um instrumento que a vaga **não aplica** diz **«Não se aplica a
  esta vaga»** em vez de «Sem dados nesta etapa» («sem dados» sugere falta; «não se aplica» diz que
  foi desenho).

#### Caminho do hub do RH (JORN-45)

- **D-17:** A linha da seção «Avaliação Assíncrona» (`HubCandidatoRH.tsx` ~389-399) ganha um botão
  que **expande o detalhe ali mesmo**, reusando `ScorecardAvaliacao` — vale em qualquer etapa, sem
  depender de entrevista existir.
- **D-18:** O texto deixa de prometer uma ação que não existe: sai «disponíveis para revisão»;
  entra algo como «N avaliações respondidas» + botão «Ver respostas» (redação final é do planner).
- **D-19:** No detalhe expandido, Big Five = «Concluído» / «Não fez», sem número (D-31 da 49).
- **D-20 (folded todo, Parte A parcial):** O **texto integral do caso prático** (`respostas_avaliacao`,
  `teste = 'sjt_caso_aberto'`) aparece **ao lado das citações** que a IA recortou, em **todo lugar**
  que o `CasoAbertoBreakdown` renderiza (hub, entrevista, decisão, redação) — nenhuma tela mostra o
  recorte sem o original. Portfólio fica **fora**.
- **D-21:** Se o RH não tiver leitura hoje sobre `respostas_avaliacao`, a leitura nova é **restrita a
  `teste = 'sjt_caso_aberto'`**, pelo helper vivo `is_active_rh_user()`, com **review bloqueante
  antes do apply** e prova de que nada abriu para `anon` nem para candidato de outra candidatura
  (D-12 da 50). A pesquisa mede o acesso atual antes. — **Reversibility:** one-way — abrir leitura
  de produção do titular ao RH é mudança de controle de acesso aplicada por migration em PROD.

#### Notas de entrevista e recibo (JORN-47, JORN-49)

- **D-22:** Notas do gestor **obrigatórias nos dois lados**, com o mínimo **igual ao servidor (não
  vazio após trim)** — o cliente espelha `salvar_avaliacao_entrevista` (`notas_humanas
  obrigatorias`, `check_violation`): o campo deixa de se chamar «optional», o Salvar fica bloqueado
  e há mensagem na tela. **Sem migration.** O comentário de cabeçalho de
  `EntrevistaScorecardInline.tsx` («optional gestor notes») é corrigido junto.
- **D-23:** O recibo **diz o que sai e o que fica**: «endereço» é substituído pelo que o motor apaga
  de fato, e a parte do que permanece ganha a linha «estado e faixa etária, sem vínculo com o seu
  nome, para relatório agregado» (`estado`, `faixa_etaria_materializada`). Só texto — o motor não
  muda. Regenerar por `gen-recibo-exclusao.cjs` (recibo + espelhos TS), nunca editar
  `reciboExclusao.generated.ts` à mão. Recibos **já emitidos ficam como foram** (registro do que foi
  dito naquele momento).

#### Navegação do candidato (JORN-44, JORN-46)

- **D-24 (fato a remedir — D-49 da 49):** `RedacaoEditorScreen.tsx:189` **já** navega para
  `/candidato/avaliacao/:id` (a lista), inalterado desde `1c4e2c56` (Phase 13) — o mesmo vale para
  SJT, caso prático, Big Five e devolutiva. O JORN-46 relata destino = painel. A pesquisa
  **reproduz** o caminho real (ex.: redirecionamento do container depois do envio / mudança de
  etapa → `WrongEtapaState` → dashboard) e registra em «Correções de fato» se o defeito é de
  destino, de rótulo, ou dos dois.
- **D-25:** Convenção de rótulos: dentro de uma prova, o botão diz **«Voltar às avaliações»** e vai
  à lista; **«Painel»** passa a significar só `/candidato/dashboard` («Ir ao painel»). Vale em
  redação, SJT, caso prático, Big Five e devolutiva.
- **D-26:** No `AvaliacaoContainer`, «Ir ao painel» **sempre no cabeçalho** (ao lado de «Sair») e
  **em destaque no estado «você concluiu todas as avaliações»** (a frase «Acompanhe o andamento
  pelo seu painel» ganha botão).

#### Ordem de entrega e prova

- **D-27:** **Telas e textos primeiro** (JORN-43..49 — cliente, texto, gerador do recibo; cada um com
  seu push conferido), **JORN-42 depois** (migration → EF/e-mail → cliente, D-55 da 49). A leitura
  nova do caso prático (D-21) vai com o grupo de banco, sob review bloqueante.
- **D-28:** Aceite: **todo critério de comportamento é consulta no banco** (D-51 da 49), mais
  **sessão real para o JORN-42**: um candidato de teste rejeitado na triagem pede revisão, o RH2
  (recrutador, Phase 50 D-10) responde procedente, a candidatura reabre na etapa. Telas (43–48)
  conferidas no navegador, marcador no chunk certo.
- **D-29:** O **knockout revertido** é provado com **inscrição real de teste em PROD** (conta de
  teste marcada): cai no knockout → pede revisão → revertida → **não** cai de novo (D-03). Dados de
  teste ficam visíveis ao RH (D-07 da 50).

### Claude's Discretion

- **Mecanismo do JORN-42:** gravar toda rejeição em `decisao_final` (unificando o caminho que o
  CTA, a fila e a reabertura já usam) **ou** permitir o pedido sem linha em `decisao_final`
  (registro próprio). A pesquisa mede as duas contra os smokes que asserem o comportamento de hoje
  (`oper31_rejeitar_candidatura_smokes.sql`, `p48_reabertura_smoke.sql`, `p48_rejeicao_triagem_smoke.sql`
  e afins — D-56 da 49) e o planner escolhe. Qualquer escolha respeita D-01..D-12.
- Onde guardar a «etapa da rejeição» para a reabertura do D-02 (se já não estiver no histórico).
- Redação final dos rótulos e dos textos (D-15, D-18, D-23, D-09), dentro das decisões acima.
- Divisão em planos e ondas, dentro da ordem do D-27.

### Ideias adiadas (FORA DE ESCOPO)

- Portfólio visível ao RH (Parte A, face do portfólio — depende de `SPEC-VISRH-04`, D1/D2 em aberto).
- Parte B do todo (nota do RH + entregável externo — tabela nova, §4 de LGPD).
- Aviso por e-mail quando o Raven é liberado — só faria sentido se a aplicação deixasse de ser presencial.
- Prazo para pedir revisão / revisão para «finalizado sem contratação» — discutidos e recusados nesta fase.
- JORN-50..52 (banco SJT).
</user_constraints>

<phase_requirements>
## Requisitos da fase

| ID | Descrição (REQUIREMENTS.md:300-307) | Onde a pesquisa sustenta |
|----|-------------|------------------|
| JORN-42 | O direito de revisão (Art. 20) não depende de QUAL caminho registrou a decisão | §JORN-42: comparação dos mecanismos, smokes que cada um quebra; §Correções C-1, C-2, C-3, C-9 |
| JORN-43 | A prova cognitiva (Raven) tem porta de entrada | §D-13; Correções C-4 e C-5 (o candidato não lê `scores_raven`; já existe e-mail de liberação) |
| JORN-44 | A página de avaliações oferece volta ao painel | §D-24..D-26 (`AvaliacaoShell` só tem «Sair») |
| JORN-45 | O hub do RH oferece caminho para os registros que anuncia | §D-17..D-21; Correções C-6, C-7, C-8 |
| JORN-46 | «Voltar ao painel» da redação — destino ou rótulo | §D-24 (reproduzido: o defeito é de rótulo, com um salto extra) |
| JORN-47 | Notas de entrevista com a mesma obrigatoriedade no cliente e no servidor | §D-22 |
| JORN-48 | Os dois instrumentos cognitivos são distinguíveis pelo nome | §Inventário D-15 (a colisão é maior do que o CONTEXT descreve) |
| JORN-49 | O recibo de exclusão não promete mais do que faz | §D-23; Correção C-10 (não é só texto) |
</phase_requirements>

---

## ⚠ Correções de fato (D-49 da 49) — devolver ao operador ANTES do plano

Cada item contradiz ou estende o 51-CONTEXT.md. Todos foram medidos nesta sessão.

| # | O CONTEXT diz | O que foi medido | Efeito no plano |
|---|---|---|---|
| **C-1** | D-02: reabrir «na etapa em que ela foi rejeitada» vale para o knockout | O knockout **não sai de `inscricao`**: `submit_candidatura_atomic` grava `status='rejeitado'` e `etapa_atual='inscricao'`, e o histórico registra `inscricao → inscricao` [VERIFIED: PROD `pg_get_functiondef(submit_candidatura_atomic)`, md5 `7fddda4c9d4f7dbf8b692ee330facd92`]. Reabrir **em `inscricao`** muda só `status`. O trigger `candidaturas_avancar_etapa_trg` é `BEFORE UPDATE OF etapa_atual`, então **não roda**: nenhuma linha em `historico_candidatura`, nenhuma trilha da reabertura. E `inscricao` não é etapa de trabalho: quem passa no knockout vai direto para `triagem` no mesmo statement | **Pergunta ao operador:** a reabertura do knockout vai para `triagem`, a etapa a que o candidato aprovado chegaria? A recomendação é sim. A alternativa seria ficar em `inscricao` e gravar o histórico à mão |
| **C-2** | D-08: «as 2 candidaturas medidas com justificativa e `decisao_final` NULL» são rejeições «na triagem» | As duas (`af39f1ea`, `dae837f4`) foram rejeitadas por `rejeitar_candidatura` **na etapa `decisao_final`**. Histórico: `decisao_final → rejeitado`, motivo `reprovado_avaliacao` / `perfil_desalinhado`. A origem `'humana_triagem'` quer dizer «rejeitada sem linha em `decisao_final`» e cobre **qualquer etapa**. `dae837f4` é de titular **anonimizado** (`user_id` NULL, conta `+claude7` consumida pelo motor do 49-19): ninguém consegue entrar para pedir | O selo de origem (D-12) «triagem» é impreciso para essas duas. Sugestão: «rejeição pelo RH (fora da decisão final)». Pelo D-02, as duas reabrem em `decisao_final` |
| **C-3** | D-08: backfill retroativo pode ser necessário | **População medida: 9 candidaturas `status='rejeitado'`, as 9 de contas de teste** (`+claude2..5`, mais 1 anonimizada). São 4 `automatica`, 4 `humana_triagem` e 1 `humana` (esta já com revisão respondida `mantida`). **Zero candidato real.** Com o mecanismo recomendado (b), o direito é calculado na hora a partir do estado vivo, e **nenhuma escrita retroativa é necessária** | No (b) o checkpoint do D-08 não dispara. No (a), seriam 8 INSERTs retroativos, todos em contas de teste, e o checkpoint continua obrigatório pela regra |
| **C-4** | D-13: o card «some quando concluída» | **O candidato não consegue ler o próprio `scores_raven` nem o próprio `respostas_raven`.** As duas policies de SELECT comparam `c.candidato_id = auth.uid()`, mas `candidatos.id ≠ user_id` em **37 de 37** linhas com user. Medido com `SET LOCAL ROLE authenticated` e o JWT do titular de `d31c78bb`, que TEM linha em `scores_raven`: `own_scores_raven = 0`, `own_resp_raven = 0`, `own_lib = 2` [VERIFIED: PROD, sonda de role]. Consequências: `ravenService.consultarLiberacao().ja_respondeu` é **sempre false** para o candidato, e quem já concluiu pode reabrir a prova e só falhar no INSERT das 60 respostas (PK `(candidatura_id, questao_id)`) | **JORN-43 não é só cliente.** Para o card sumir quando a prova termina, é preciso uma fonte de «concluída» legível pelo candidato. Recomendado: acrescentar uma chave booleana `raven` a `get_avaliacao_status`, que já é DEFINER com guarda de titular e só devolve booleanos. Isso vira migration e entra no grupo de banco do D-27. Corrigir a RLS daria ao navegador do candidato `percentil` e `classificacao` (RNF-07a) e exigiria review D-12 da 50 |
| **C-5** | D-14: «Sem aviso (e-mail) ao liberar» | **O e-mail já existe e já saiu 3 vezes.** O trigger `trg_notif_cognitivo_liberado` em `cognitivo_liberacao` (AFTER INSERT OR UPDATE OF `liberado_em`, `revogado_em`) chama `notificar-candidato` com o evento `cognitivo_liberado`. O ledger tem 3 envios `entregue`, `modo='producao'`, para `2ce20fbf`, `f59e7281` e `dae837f4`. É a **D-22 da 48**, decisão travada do operador: «Liberar a avaliação cognitiva passa a avisar o candidato (JORN-15)». O corpo manda «Acesse o seu painel para ver as instruções», e hoje o painel não tem entrada nenhuma (JORN-43) | **Pergunta ao operador:** o D-14 revoga a D-22 da 48 (desligar o e-mail existente) ou só quer dizer «nenhum aviso NOVO»? O assunto e o corpo também dizem «avaliação cognitiva», nome que o D-15 aposenta para o Raven, e o comentário do template diz «NÃO nomeia o instrumento». É um conflito com «toda superfície» do D-15 |
| **C-6** | D-20/D-21: o RH não tem leitor do texto do caso prático; a migration de leitura talvez seja necessária | **A leitura já existe e está em PROD:** RPC `ler_resposta_caso_aberto_sjt(uuid)`, SECURITY DEFINER, guarda de papel + `is_active_rh_user()`, ACL `{postgres, authenticated, service_role}` (sem `anon`), entregue no 49-44 (`20261003000001`) e expandida no P50. Ela devolve `{situacao, texto}` só depois do envio (`scores_candidato` sjt/caso_aberto), e `removida` quando o motor raspou a linha. O cliente já tem `getRespostaCasoAbertoSjt` (`scoresRhService.ts`), usado por `RespostaCasoAbertoSjt` em `ConsolidacaoDashboard` (Decisão Final). Medição direta: o RH ativo lê **0** linhas de `respostas_avaliacao` (nenhuma policy de RH, nenhuma view depende da tabela), `anon` não executa a RPC, e o RH executa e recebe `indisponivel` | **O D-21 não dispara: nenhuma migration de acesso.** O D-20 vira trabalho só de cliente, reusando `getRespostaCasoAbertoSjt`. Sem review D-12 |
| **C-7** | D-20: «todo lugar que o `CasoAbertoBreakdown` renderiza (hub, entrevista, decisão, redação)» | **`ScorecardAvaliacao` e `CasoAbertoBreakdown` não estão montados em lugar nenhum.** O cabeçalho do arquivo diz «⚠ NÃO MONTADO (49-REVIEW-GAPS-3 CR-02, 2026-09-30): … nenhuma rota nem tela o renderiza, e o build o descarta por tree-shaking» [VERIFIED: `ScorecardAvaliacao.tsx:14-19`]. As citações da IA do caso prático (`scores_candidato.citacoes`) **não aparecem em tela nenhuma hoje**. Na Decisão Final o texto já aparece, sem as citações | Depois do D-17, o hub vira a **primeira e única** montagem do `CasoAbertoBreakdown`. O D-20 se resume a: no hub, citações e texto lado a lado. O planner decide se a Decisão Final também ganha as citações ao lado do texto que já mostra |
| **C-8** | D-17: «reusando `ScorecardAvaliacao`»; D-18: «N avaliações» | (i) `getScores` lê **todos** os tipos de `scores_candidato` (`.eq('candidatura_id', …)`, sem filtro de tipo) [VERIFIED: `scoresRhService.ts:148-151`]. Em PROD existem `sjt/mc`, `sjt/caso_aberto`, `big_five`, `redacao` e `entrevista`. O `ScorecardAvaliacao` manda tudo que não é `big_five` nem `mc` para `CasoAbertoBreakdown`, então uma linha de **entrevista** ou de **redação** viraria um card de «caso aberto». (ii) Pelo mesmo motivo, a contagem «N registro(s)» do hub (`triagemQuery.data?.length`) **já inclui entrevista e redação**. (iii) O `BigFiveBreakdown` mostra **faixas** e o resumo da IA, e `ScorecardAvaliacao.test.tsx:62-66` fixa as faixas («Muito alto» / «Muito baixo») | Filtrar `tipo IN ('sjt','big_five')` antes de renderizar e de contar. O Big Five precisa de variante «Concluído/Não fez». ⚠ A **D-31 da 49 diz «As faixas seguem no hub»** (49-CONTEXT:152-153), e a D-19 desta fase a cita para dizer o contrário. **Pergunta ao operador:** no detalhe expandido do hub, o Big Five mostra faixas (49 D-31) ou só «Concluído/Não fez» (51 D-19)? |
| **C-9** | D-01: «gravar a rejeição em `decisao_final`» é uma opção viável | `decisao_final.por_usuario` é **NOT NULL + FK `auth.users`**, e `decisao_final_historico.por_usuario` também é NOT NULL. `justificativa` tem CHECK `length >= 50`. `responder_revisao_decisao` recusa explicitamente `por_usuario IS NULL` («decisor indeterminado») [VERIFIED: PROD, colunas e constraints de `decisao_final`; corpo de `responder_revisao_decisao`, md5 `d4b47f5b25c60aa07d8fd5272f546b15`]. **O knockout não tem autor**, então gravá-lo em `decisao_final` exige afrouxar dois NOT NULL e desligar a guarda de integridade que separa «knockout» de «linha corrompida» | Pesa contra a opção (a). Ver §JORN-42 |
| **C-10** | D-23: «Só texto — o motor não muda» | O motor de fato não muda, mas **o recibo não é só texto.** O gerador lê `pii-inventory.yaml`, e lá `candidatos.estado` está classificada `anonimizar` («NOT NULL. Granularidade UF é útil ao bias snapshot»). A regra DIREÇÃO do gerador **reprova** coluna `anonimizar` sem linha «sai». Além disso, `faixa_etaria_materializada` **não é coluna explícita do inventário**, e o gerador reprova origem que não esteja lá. Mover `estado` para «mantém» e citar a faixa exige: reclassificar `estado` para `preservar_com_ressalva`, acrescentar `faixa_etaria_materializada` ao YAML, regenerar `pii-inventory.md` (`check:pii-inventory-md`), dar ao item «mantém» uma **`base_legal` não vazia** (o gerador exige) e **redeployar `executar-direito-titular`**, que embute `_shared/reciboExclusao.ts`. O motor preserva `estado` desde a P45 («`estado` NÃO aparece aqui: é preservada por decisão registrada em (5)»), e `p45_motor_exclusao_smoke.sql:2086` fixa isso. **Hoje o inventário contradiz o motor** | Plano de inventário + gerador + 3 saídas + deploy de EF. A redação da `base_legal` nova é do operador (precedente: «as 6 bases legais que a engenharia escreveu», STATE.md) |
| **C-11** | D-24: o JORN-46 relata destino = painel | Reproduzido pelo código: o botão da redação diz «Voltar ao painel» e **vai para a lista** (`/candidato/avaliacao/:id`). **O defeito é de RÓTULO.** O «painel» só aparece quando a etapa já mudou: a lista mostra `WrongEtapaState` («Esta avaliação não está disponível»), cujo botão, também «Voltar ao painel», leva a `/candidato/dashboard`. São **dois cliques com uma tela de bloqueio no meio**. Ver §D-24 | O D-25 resolve o rótulo. O salto pelo `WrongEtapaState` continua quando a etapa mudou. A recomendação é que o estado «Sua etapa avançou» das provas vá direto ao painel |
| **C-12** | (implícito) a fila tem uma linha por candidatura | `FilaRevisaoRow` não tem id próprio, e a fila se identifica por `candidatura_id` (`FILA_REVISAO_COLUNAS`). O smoke `p50_acesso_recrutador_smoke.sql:1853-1857` compara `md5(jsonb_agg(… ORDER BY t.candidatura_id))` entre admin e RH ativo. Com o JORN-42, uma candidatura pode ter **duas** linhas na fila com `p_incluir_respondidos=true` (revisão de triagem respondida e, depois, revisão de decisão final). O ORDER BY fica com empate e o md5 deixa de ser determinístico | A RPC de fila precisa de um id de pedido. O `ORDER BY` do (k) do p50 precisa de desempate. Isso é edição de portão (D-56) |

---

## Resumo

A fase junta oito consertos de natureza bem diferente. Seis são de cliente e texto (JORN-44..49) e saem com push e conferência de bundle. Dois exigem banco: o JORN-42 e, ao contrário do que diz o CONTEXT, o **JORN-43** (C-4). O D-21 não exige nada: a leitura do caso prático pelo RH já existe (C-6).

No **JORN-42**, a medição desfavorece gravar toda rejeição em `decisao_final`. O knockout não tem autor (C-9). A tabela carrega a semântica «decisão final» em pelo menos 30 smokes, no motor de exclusão, no export («Decisão final de cada candidatura») e na regra D-23 de `registrar_decisao`. E os hot paths `rejeitar_candidatura` / `submit_candidatura_atomic` teriam de mudar, quebrando `oper31` (o cleanup apaga a candidatura sem apagar a `decisao_final`, e a FK recusa) e as asserções (c)/(e) de `p48_rejeicao_triagem_smoke`. **Recomendação: (b), um registro próprio do pedido** (tabela nova, só via RPC). O caminho `decisao_final` fica byte-idêntico, e com ele os smokes p42/p48/p49 de revisão. O preço é real e está listado: checklist D-57 completo para a tabela nova, um passo a mais no motor de exclusão (o texto da resposta do revisor é dado do titular, e a resposta em `decisao_final` é raspada desde o 49-14/D-60), trigger de notificação e uma leitura na EF `notificar-candidato`.

O **D-03** já vale pela estrutura: o knockout só é avaliado num lugar, o `INSERT` de `submit_candidatura_atomic`, e nada o reaplica. A prova (D-29) tem de mostrar isso numa candidatura real, e uma asserção por forma tem de vigiar que nenhuma outra função passe a gravar `motivo_rejeicao='knockout_automatico'`.

**Recomendação principal:** devolver ao operador as correções C-1, C-5, C-8 (Big Five) e C-10 (base legal) antes de planejar. Depois, planejar em dois grupos, conforme o D-27: Onda A de cliente e texto (JORN-44, 45, 46, 47, 48, 49, com a parte de cliente do 43) e Onda B de banco (chave `raven` em `get_avaliacao_status`, e JORN-42 na ordem migration → motor/LGPD → EF → cliente).

---

## Mapa de responsabilidade arquitetural

| Capacidade | Camada principal | Camada secundária | Por quê |
|---|---|---|---|
| Elegibilidade ao pedido de revisão (três origens, D-06, D-07) | Banco (RPC SECURITY DEFINER) | — | O direito é decidido pelo estado vivo da candidatura. O cliente só espelha |
| Reabertura na etapa (D-02) e não reaplicar o knockout (D-03) | Banco (RPC + GUC `app.transicao_sancionada='reabertura'`) | — | `avancar_etapa` e `guard_rejeicao_auditada` só aceitam sair de candidatura encerrada pela GUC |
| Fila de revisões com selo de origem (D-10, D-12) | Banco (`listar_revisoes_decisao` / `contar_revisoes_pendentes`) | Navegador (`FilaRevisoesTable`) | A fila é só-RPC por invariante (`revisaoService.ts`: «A INVARIANTE DE LEITURA DA FILA») |
| Contexto do knockout para o RH (D-11) | Banco (RLS existente) ou RPC de detalhe | Navegador (`ResponderRevisaoDialog`) | O RH já lê `respostas_formulario`, `perguntas_formulario` e `pergunta_opcao_metadata` por RLS de RH ativo (medido) |
| E-mail de rejeição com direito de revisão (D-09) | Edge Function (`notificar-candidato` + `_shared/email-templates.ts`) | — | O mesmo evento `decisao` serve as três origens (ver §D-09) |
| Card do Raven no painel (D-13) | Navegador (`DashboardCandidatoPage`) | Banco (estado «concluída», C-4) | Hoje o candidato não lê a conclusão |
| Renomear os instrumentos (D-15) | Navegador + EF (e-mail) | Export (rótulos em `exportacaoService`) | Só strings. As chaves técnicas (`cognitivo_*`, eventos) não mudam |
| Detalhe da avaliação no hub e texto do caso (D-17..D-20) | Navegador | Banco (RPC existente `ler_resposta_caso_aberto_sjt`) | Nenhum acesso novo (C-6) |
| Notas obrigatórias (D-22) | Navegador (espelho) | Banco (já autoritativo) | Sem migration |
| Recibo de exclusão (D-23) | Gerador (`gen-recibo-exclusao.cjs`) + inventário | EF `executar-direito-titular` (redeploy) | Artefato gerado com fechamento (C-10) |

---

## JORN-42 — o mecanismo (a área deixada à discrição)

### O que o banco faz hoje (corpos VIVOS, lidos em 2026-10-08)

md5 de `pg_get_functiondef`, para o bloco PRE-PORTAO de cada RPC reescrita (precedente P49-10):

| Função | md5 vivo | Fato load-bearing (citação literal) |
|---|---|---|
| `solicitar_revisao_decisao(uuid)` | `13957aa63a5e6e0b439d54d373361d94` | `IF NOT EXISTS (SELECT 1 FROM public.decisao_final WHERE candidatura_id = p_candidatura_id AND decisao = 'rejeitado') THEN RAISE EXCEPTION 'revisao indisponivel: nao ha decisao rejeitada para esta candidatura' USING ERRCODE = 'no_data_found'`. **Não confere `candidaturas.status`** |
| `responder_revisao_decisao(uuid,text,text)` | `d4b47f5b25c60aa07d8fd5272f546b15` | `IF v_row.por_usuario IS NULL THEN RAISE EXCEPTION 'decisao sem autoria registrada — revisao nao pode ser respondida (decisor indeterminado)'`. No `revertida`: `IF v_etapa IS DISTINCT FROM 'rejeitado' OR v_status IS DISTINCT FROM 'rejeitado' THEN RAISE … 'nada a reabrir…'`; reabre com `SET etapa_atual = 'decisao_final', status = 'em_analise', … data_decisao_final = NULL` sob `set_config('app.transicao_sancionada', 'reabertura', true)`. Prazo: `(now() AT TIME ZONE 'America/Sao_Paulo')::date + 10`, que vence às 00:00 SP do 11º dia |
| `rejeitar_candidatura(uuid,motivo_rejeicao_rh,text)` | `c4301082d1371d57ec8425b961471027` | Um UPDATE: `etapa_atual='rejeitado', status='rejeitado', motivo_rejeicao=p_motivo::text, etapa_justificativa=v_just, feedback_rejeicao='Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.'`. **Não grava `decisao_final`.** Pode ser chamada em qualquer etapa não encerrada |
| `registrar_decisao(uuid,decisao_final_resultado,text)` | `f7c64906604948c8030526dbd4806256` | UPSERT em `decisao_final` com `por_usuario = auth.uid()` sempre. Na nova decisão de linha reaberta, zera o ciclo de revisão. D-23: `quem teve a decisao revertida nao registra a nova decisao deste caso` |
| `explicacao_rejeicao_origem(uuid)` | `29f63b16b1d448b22ff9b411ad2ae4bf` | `'automatica'` se `status='rejeitado' AND motivo_rejeicao='knockout_automatico' AND opcao_knockout_id IS NOT NULL`; `'humana_triagem'` se rejeitado, não knockout e `NOT EXISTS decisao_final`; senão NULL. Escopo titular (`ca.user_id = auth.uid()`) |
| `listar_revisoes_decisao(boolean)` | `a3889a20dbb0941226db36db881357c7` | `RETURNS TABLE(candidatura_id uuid, candidato_nome text, vaga_titulo text, decisao text, decidido_por_nome text, revisao_solicitada_em timestamptz, revisao_respondida_em timestamptz, revisao_veredito text, revisao_resultado text, respondida_por_nome text, pode_responder boolean)`, `FROM public.decisao_final d … WHERE d.revisao_solicitada_em IS NOT NULL`, `pode_responder = (d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid)`, `LIMIT 200` |
| `contar_revisoes_pendentes()` | `1c5f3ccbaf1475e6b1c4ba4cebbd616e` | `count(*) FROM decisao_final d … WHERE revisao_solicitada_em IS NOT NULL AND revisao_respondida_em IS NULL` |
| `submit_candidatura_atomic(...)` | `7fddda4c9d4f7dbf8b692ee330facd92` | **O único** lugar que aplica knockout (passo 2.5 «KNOCKOUT SWEEP», `m.tag = 'knockout'`) |
| `avancar_etapa()` (trigger) | `b104f7683c289ffc6c6490f789040bf4` | Trava de candidatura encerrada, exceto GUC `'reabertura'`/`'decisao'`; regressão exige `etapa_justificativa`; grava UMA linha de `historico_candidatura`; zera `etapa_justificativa` |
| `guard_rejeicao_auditada()` (trigger) | `89d85b8be1ad034e5461224307c690cd` | Sair de encerrada mexendo só no status, com JWT, sem GUC `'reabertura'` → `check_violation` |

Tabelas [VERIFIED: PROD `information_schema` + `pg_constraint`]:
- `decisao_final`: `por_usuario uuid NOT NULL` (FK `auth.users`), `justificativa text NOT NULL` + `CHECK (length(justificativa) >= 50)`, `UNIQUE (candidatura_id)`, `decisao_final_reabertura_prazo_coerente_check: CHECK (((reaberta_em IS NULL) = (prazo_nova_decisao_em IS NULL)))`.
- `decisao_final_historico.por_usuario uuid NOT NULL`.
- Triggers em `decisao_final`: `trg_decisao_final_snapshot` (AFTER UPDATE), `trg_notif_revisao_solicitada` (AFTER UPDATE OF `revisao_solicitada_em`, que chama `notificar-rh`), `trg_notif_revisao_respondida` (AFTER UPDATE OF `revisao_respondida_em`, que chama `notificar-candidato` com `ciclo = epoch(revisao_solicitada_em)`).
- Enums: `etapa_processo` = `inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado`; `status_candidatura` = `aguardando_resposta, em_analise, aprovado_proxima, rejeitado, finalizado`; `motivo_rejeicao_rh` = `perfil_desalinhado, reprovado_avaliacao, reprovado_entrevista, nao_compareceu, desistencia, outro`; `decisao_final_resultado` = `aprovado, rejeitado, em_espera` [VERIFIED: PROD `pg_enum`].
- Cron: `prazo-reabertura-sweep` `0 11 * * *` → `varrer_prazos_reabertura()`, que lê `decisao_final.prazo_nova_decisao_em`.

### Onde mora a «etapa da rejeição» (D-02)

Ela **já está no histórico** e não precisa de coluna nova em `candidaturas`:
- `rejeitar_candidatura` → `avancar_etapa` grava `historico_candidatura (etapa_de = <etapa>, etapa_para = 'rejeitado', ator = auth.uid(), auto_rejeitado = false, criterio_texto = justificativa)`. Medido nas 4 `humana_triagem`: duas `triagem → rejeitado` e duas `decisao_final → rejeitado`, todas com ator.
- knockout → `historico_candidatura (etapa_de='inscricao', etapa_para='inscricao', ator NULL, auto_rejeitado=true, criterio_texto='knockout automático (Etapa 1)')`. Medido nas 4 `automatica`.

**Recomendação:** no momento do pedido, o registro do pedido guarda uma **cópia** de `etapa_rejeitada` e do `historico_candidatura.id` da linha de rejeição. Esse id é a chave única de «um pedido por rejeição» (D-06): uma nova rejeição depois da reabertura gera outra linha de histórico, e com ela um direito novo. Para o knockout, ver C-1: o destino recomendado é `triagem`.

### As duas opções medidas contra os portões

**(a) Toda rejeição vira linha em `decisao_final`**, gravada na rejeição ou só no pedido («a-lazy»).

**(b) Registro próprio do pedido**: tabela nova para a revisão de rejeições fora da decisão final, acessada só por RPC. O caminho `decisao_final` não muda.

| Superfície / portão | (a) gravar em `decisao_final` | (b) registro próprio |
|---|---|---|
| Knockout sem autor | **Bloqueio de esquema:** `por_usuario NOT NULL` + FK em `decisao_final` e `decisao_final_historico`; `responder` recusa `por_usuario IS NULL`. Exige `DROP NOT NULL` nas duas tabelas e desligar a guarda «decisor indeterminado» | O registro tem `rejeitado_por uuid NULL` (do `historico.ator`). REVISAO-05 = `rejeitado_por IS DISTINCT FROM auth.uid()`, e NULL deixa qualquer RH ativo responder (D-10) por construção |
| `justificativa ≥ 50` | Knockout precisa de constante sintética. Triagem copia `criterio_texto` (≥ 50 garantido por `rejeitar_candidatura`) | Não se aplica |
| Origem / selo (D-01, D-12) | Hoje a origem é **derivada da ausência** de `decisao_final`. Com (a), `explicacao_rejeicao_origem` passa a devolver NULL e o candidato cai no texto `REASON_BY_DECISAO.rejeitado` («Avaliamos seu processo de forma global, considerando o conjunto das etapas…»), **mentindo sobre quem decidiu**. Exige coluna `origem` (D-57 completo em `decisao_final` **e** `decisao_final_historico`, que o snapshot copia) | Coluna `origem` no registro novo, dentro do D-57 da tabela nova |
| `oper31_rejeitar_candidatura_smokes.sql` | **Quebra** se `rejeitar_candidatura` gravar `decisao_final`: o CLEANUP faz `DELETE FROM public.candidaturas WHERE id = '31010031-…d1'` sem apagar `decisao_final`, e `decisao_final_candidatura_id_fkey` (sem cascade) recusa. Não quebra na «a-lazy» | Intocado |
| `p48_rejeicao_triagem_smoke.sql` | **Quebra** (c) `c_titular IS DISTINCT FROM 'humana_triagem'`, que esperava a origem por ausência de linha, e a varredura real (e) `rejeicao humana sem decisao_final -> humana_triagem`. Na «a-lazy», o (e) quebra para toda candidatura que pediu revisão | Intocado (`explicacao_rejeicao_origem` não muda) |
| `p48_reabertura_smoke.sql` (13 asserções) | (c) assere `revertida` sobre `rejeitado` com a candidatura **fora** de `rejeitado/rejeitado` ⇒ 22023. O knockout está exatamente nesse caso (`inscricao/rejeitado`), então a guarda precisa ramificar e (c) precisa de nova especificação. (a) assere reabertura sempre em `decisao_final`, o que exige ramificar por origem | Intocado: o corpo de `responder_revisao_decisao` não muda |
| `p42_revisao_art20_smoke.sql` (10) | (d) assere que `RETURNS TABLE` de `listar_revisoes_decisao` **não** contém `justificativa`. Mudar `RETURNS TABLE` exige `DROP FUNCTION` + `CREATE` + re-GRANT, e (c)/(d) do catálogo reconferem ACL | A **mesma** troca de assinatura, se o selo `origem` entrar na fila. Isso é inevitável nas duas opções |
| `p50_acesso_recrutador_smoke.sql` (k) | md5 da fila admin × RH ativo ordenado por `candidatura_id` (C-12) | Igual (C-12) |
| `p50_desfazer_expansao.sql` | **Fica obsoleto** para `rejeitar_candidatura`, `registrar_decisao`, `listar_revisoes_decisao` e `contar_revisoes_pendentes`: o arquivo restaura os corpos pré-P50 e, aplicado depois da 51, **apagaria o JORN-42** | Obsoleto só para `listar` e `contar`. Registrar no cabeçalho ou regenerar |
| `submit_candidatura_atomic_smokes.sql` | Quebra a contagem de resíduos se a inscrição gravar `decisao_final` (a eager) | Intocado |
| Motor de exclusão / purga | **Já cobre** `decisao_final` (`tombstone_decisao_final` raspa `justificativa` e `revisao_resultado`) | **Precisa de passo novo** em `anonimizar_candidato` (md5 vivo `ecfec02cb92411a1ead2f3c66d6e5207`, 1 315 linhas) para raspar a resposta do revisor no registro novo, mais a asserção em `p45_motor_exclusao_smoke` e a linha no recibo |
| LGPD (D-57) | Coluna `origem` em 2 tabelas inventariadas | Tabela nova: catálogo, export-scope, pii-inventory, recibo, allowlist (bump 1.4.0 → 1.5.0), drift VALUES, 4 `check:`, redeploy de `exportar-meus-dados` e `executar-direito-titular`, `rotuloTabela` em `exportacaoService` |
| Semântica dos leitores de `decisao_final` | Poluída: o export rotula a tabela como «Decisão final de cada candidatura»; `registrar_decisao` D-23 trava o RH que rejeitou na triagem de registrar a decisão final depois de uma revertida; `hasDecisaoFinal`/aplicabilidade `tem_decisao_registrada` do recibo passam a valer para quem só foi rejeitado na triagem | Intocada |
| E-mails do ciclo | Funcionam como estão (os triggers estão em `decisao_final`) | Triggers novos no registro com o **mesmo corpo** `{evento, candidatura_id, ciclo}`. `notificar-rh` não lê `decisao_final` e serve sem mudança. **`notificar-candidato` lê `decisao_final.revisao_veredito`/`prazo_nova_decisao_em`** no evento `revisao_respondida` e precisa ler do registro novo (senão: frase neutra, ou pior, o veredito de um ciclo antigo da `decisao_final`) |
| Prazo da reabertura (D-04) | `varrer_prazos_reabertura` cobre a linha | Estender `varrer_prazos_reabertura` ao registro novo, ou decidir que o alerta só vale na decisão final |
| D-08 retroativo | «a» eager: 8 INSERTs (checkpoint). «a-lazy»: nenhum | **Nenhum** |

**Recomendação: (b).** O argumento decisivo é que (a) não aceita o knockout sem relaxar duas restrições NOT NULL e a guarda de integridade de `responder_revisao_decisao`. Isso é afrouxar invariantes LGPD-02 numa tabela que sustenta 30 smokes. Já (b) é aditivo (CREATE TABLE, RPCs novas, CREATE OR REPLACE das duas RPCs de leitura) e deixa todo o ciclo `decisao_final` byte-idêntico. O custo de (b) é o motor e o D-57, nos padrões que o projeto já executou no 49-20/49-21 e no 48-17. [Recomendação baseada em fatos medidos; a escolha é do planner]

**Forma recomendada de (b), para o planner ajustar:**
- Tabela `revisao_rejeicao` (nome a decidir) com: `id`, `candidatura_id` (FK), `historico_rejeicao_id` (FK `historico_candidatura`, **UNIQUE**: D-06), `origem` (`'humana_triagem'|'automatica'`), `etapa_rejeitada etapa_processo`, `rejeitado_por uuid NULL`, `opcao_knockout_id uuid NULL` (cópia, D-11), `solicitada_em`, `veredito` (CHECK `mantida|revertida`), `resultado text` (CHECK ≥ 50 quando há veredito), `revisao_por_usuario`, `respondida_em`, `reaberta_em`, `prazo_nova_decisao_em` (CHECK de coerência igual ao de `decisao_final`). RLS habilitada **sem policy**: acesso só por RPC DEFINER, o que mantém o D-12 da 50 simples.
- RPCs **novas** para pedir e responder (`solicitar_revisao_rejeicao`, `responder_revisao_rejeicao`), em vez de reescrever as de `decisao_final`. Isso mantém `p42`/`p48_reabertura`/`p48_dedupe`/`p49_snapshot`/`p49_trilha`/`p45`/`p46` imunes. Uma RPC de leitura do titular (`estado_revisao_rejeicao(uuid)`, guarda de titular, devolve jsonb só com os campos que o candidato pode ver). `listar_revisoes_decisao`/`contar_revisoes_pendentes` passam a fazer `UNION ALL` das duas fontes, com `origem` e um id de pedido.
- Elegibilidade no pedido: `status='rejeitado'` (D-07), titular, origem pela mesma regra de `explicacao_rejeicao_origem`, ainda sem registro para aquele `historico_rejeicao_id` (D-06). Sem prazo (D-05). Vaga em qualquer estado (D-04).
- Reabertura procedente: sob `set_config('app.transicao_sancionada','reabertura',true)`, `UPDATE candidaturas SET etapa_atual = <etapa_rejeitada, ou 'triagem' para knockout (C-1)>, status = 'em_analise', etapa_justificativa = <texto próprio>, feedback_rejeicao = NULL, data_decisao_final = NULL`, mais `GET DIAGNOSTICS` (idioma do `responder`). `feedback_rejeicao` residual faz `hasDecisaoFinal` (`DashboardCandidatoPage`) mostrar «Entenda a decisão» numa candidatura reaberta em `decisao_final`.

### D-03 — onde o knockout é avaliado e se pode reaparecer

- Só `submit_candidatura_atomic` aplica knockout, no INSERT da candidatura. Medido por forma: das 12 funções que mencionam `knockout`, só ela combina `tag = 'knockout'` com `UPDATE public.candidaturas` [VERIFIED: PROD `prosrc`]. `publish_vaga` varre metadata mas não toca `candidaturas`.
- O candidato não reedita respostas depois do envio: a policy de UPDATE em `respostas_formulario` exige `c.is_rascunho = true`. Também não há segunda candidatura na mesma vaga (`UNIQUE (candidato_id, vaga_id)`, citado em `p48_rejeicao_triagem_smoke.sql:90`).
- **Efeitos colaterais de reabrir um knockout que o plano precisa decidir:**
  1. A análise de IA nunca rodou. `analise-candidato-individual` pula `status='rejeitado' AND opcao_knockout_id != null` e o trigger é AFTER INSERT. Depois de reabrir, o RH pode usar `reprocessar_analise(uuid)` (qualquer candidatura, RH ativo), ou a RPC de reabertura despacha o mesmo `net.http_post`.
  2. `funil_kpis.knockout_rate` conta `motivo_rejeicao = 'knockout_automatico'` **sem olhar status**, então um knockout revertido continua contando como knockout. Decisão: zerar `motivo_rejeicao` na reabertura (perde o sinal no KPI e na `explicacao_*`) ou aceitar.
  3. Manter `opcao_knockout_id`, que é auditoria, é seguro: todos os leitores exigem `status='rejeitado'` junto.

### D-08 — contagem viva

| Origem | Candidaturas `status='rejeitado'` | Contas | Etapa de rejeição |
|---|---|---|---|
| `automatica` | 4 | todas `+claude2/3/4` | `inscricao` |
| `humana_triagem` | 4 | `+claude4`, `+claude5` ×2, 1 anonimizada (`+claude7`) | 2× `triagem`, 2× `decisao_final` (C-2) |
| `humana` (com `decisao_final`) | 1 | `+claude3` | revisão já respondida `mantida` (D-06: sem novo pedido) |

Fora do escopo do D-07, mas registrado: há 3 linhas de `decisao_final.decisao='rejeitado'` cuja candidatura **não** está rejeitada (`4601c000` fixture `+neg-art20`, `finalizado/aprovado`; `a1dd4c42` `candidato@teste.com`, `em_analise/decisao_final`; `c912aa17` anonimizada, `aguardando_resposta/triagem`). As duas primeiras estão **pendentes na fila** hoje. `solicitar_revisao_decisao` não confere `candidaturas.status`. Isso não muda neste conserto se (b) for o escolhido.

### D-09 — o e-mail de rejeição nas três origens

As três origens chegam ao **mesmo** e-mail [VERIFIED: PROD `trg_notif_transicao`, md5 `59aa4021b86be8eed83efb4566fe9f0d`]:
- `historico_candidatura` AFTER INSERT → `trg_notif_transicao`: `NEW.etapa_para IN ('aprovado','rejeitado') AND NEW.auto_rejeitado = false` → `'decisao'`, e `NEW.auto_rejeitado` → `'decisao'` («hoje, só o knockout da inscrição»).
  - decisão final (`registrar_decisao`): linha `decisao_final → rejeitado`.
  - `rejeitar_candidatura`: linha `X → rejeitado`, ator RH.
  - knockout: linha `inscricao → inscricao`, `auto_rejeitado = true`. **O knockout manda e-mail**, desde 2026-09-06.
- EF `notificar-candidato` → `renderarEmail('decisao_final', { desfecho })` → `corpoDecisao`, que usa `COPY_REJEICAO` (congelada).

Conserto: um parágrafo novo (constante própria, **sem editar `COPY_REJEICAO`**, porque `email-templates.test.ts:85,111,117` assere `html.includes(COPY_REJEICAO)`) mais um link `montarUrlLogin(appBaseUrl, '/candidato/explicacao/' + candidatura_id)`. `montarUrlLogin(base, redirect)` já aceita `redirect` com as guardas de open-redirect. Só no `desfecho = 'rejeitado'`. O grep-guard `/score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i` roda sobre o HTML da decisão, então o texto novo não pode conter «motivo», «nota» nem «critério». Deploy: `notificar-candidato`. `notificar-rh/helpers.ts` também importa `email-templates.ts`; o redeploy dele só é necessário se usar algo alterado.
⚠ «Sem e-mail retroativo»: `notif-retry-sweep` (`*/15`) reenvia notificações `falhou`. Um reenvio depois do deploy renderiza o template **novo** para uma rejeição antiga. Medir `status='falhou' AND evento='decisao'` antes do deploy.

### D-10..D-12 — fila

Hoje a fila não tem origem nem id de pedido (ver as colunas acima). Precisa de: `origem` (selo), id do pedido (C-12) e, para o knockout, `decidido_por_nome` nulo apresentado como «Automático (knockout)» em vez de «Não identificado». D-11: os dados existem e o RH já os lê por RLS de RH ativo. Medido: as 4 candidaturas knockout resolvem `opcao_knockout_id → pergunta_opcao_metadata.opcao_id` (único) `→ pergunta_id → perguntas_formulario.texto_pergunta` e `respostas_formulario.resposta_opcoes` (4/4 `opcao_ok` e `resp_ok`). `opcao_knockout_id` **não tem FK**. Recomendação: uma RPC de detalhe chamada ao abrir o diálogo, para não engordar o `RETURNS TABLE` da fila (p42 (d)). ⚠ Para titular anonimizado esse dado não existe, porque o motor faz `DELETE FROM public.respostas_formulario`; a tela precisa de um estado para isso.

---

## D-13..D-19 — instrumentos, painel e hub

### Inventário de nomes (D-15)

A colisão é maior do que o CONTEXT descreve: **o instrumento textual já se chama «raciocínio lógico»** em duas superfícies.

| Arquivo:linha | Hoje | Instrumento | Alvo do D-15 |
|---|---|---|---|
| `AvaliacaoContainer.tsx:95` (`CONTAINER_TESTE_CONFIG.cognitivo.label`) | `'Avaliação cognitiva'` | textual | «Prova cognitiva». Teste: `AvaliacaoContainer.test.tsx:102` `COGNITIVO_LABEL` |
| `ProvaCognitivaScreen.tsx:67,72` | `heading: 'Prova de raciocínio lógico'`, `intro: 'Esta etapa avalia raciocínio lógico. …'` | **textual** | «Prova cognitiva». E2E `e2e/prova-cognitiva.spec.ts:62,74` fixa o heading |
| `CognitivoBandCard.tsx:106,124` (+ diálogo 153-173) | `Raciocínio lógico`, `Sinaliza raciocínio lógico — …` | **textual** (banda `tipo='cognitivo'`) | «Prova cognitiva». Senão colide com o nome novo do Raven |
| `entrevistaService.ts:1026` | `'… ao rejeitar com base no raciocínio lógico.'` | textual | «prova cognitiva» |
| `HubCandidatoRH.tsx:403,409` | `titulo="Avaliação Cognitiva"`, `Banda cognitiva contextual registrada — disponível no workspace de entrevista.` | textual | «Prova cognitiva», mais D-16 |
| `ConsolidacaoDashboard.tsx:69` | `cognitivo: 'Cognitivo'` | textual | «Prova cognitiva» |
| `PesosSliders.tsx:42` | `CONTEXT_CHIPS = ['Big Five', 'Cognitivo']` | textual (config da vaga) | avaliar |
| `AvaliacaoRavenScreen.tsx:36` | `titulo: 'Avaliação de raciocínio'` | Raven | «Raciocínio lógico (Matrizes)» |
| `LiberacaoCognitivoBlock.tsx:72` | `Avaliação de raciocínio` | Raven | idem |
| `useLiberacaoCognitivo.ts:88` | `'Avaliação de raciocínio liberada para este candidato.'` | Raven | idem |
| `email-templates.ts:331,355,405` | «liberou uma avaliação cognitiva», «Uma avaliação cognitiva foi liberada para você», «… está disponível no seu painel.» | **Raven** (evento `cognitivo_liberado`) | depende da C-5 |
| `exportacaoService.ts:212` | `cognitivo_liberacao: 'Liberação da avaliação cognitiva'` | **Raven** (a tabela é a liberação do Raven) | «Liberação do Raciocínio lógico (Matrizes)» |
| `exportacaoService.ts:213` | `cognitivo_respostas: 'Suas respostas na avaliação cognitiva'` | textual | «… na prova cognitiva» |
| `exportacaoService.ts:230,235` | `'… avaliação de raciocínio'` (respostas/scores_raven) | Raven | «Raciocínio lógico (Matrizes)» |

As chaves técnicas (`cognitivo_*`, `avaliacao_cognitiva_liberada`, `tipo='cognitivo'`) **não** mudam: elas são vocabulário de evento e de dedupe. `forbidden-strings.grep.test.ts` (`FORBIDDEN = /teste\s+psicol…|psic[oó]logo|…|an[aá]lise\s+de\s+perfil/i`) não casa com nenhum dos nomes novos.

### D-13 — card do Raven no painel

- O candidato **lê** `cognitivo_liberacao` (policy «Candidato ve a propria liberacao», `cd.user_id = auth.uid()`; medido `own_lib = 2`).
- O candidato **não lê** a conclusão (C-4). Recomendação: a migration acrescenta `'raven', jsonb_build_object('liberado', <linha sem revogado_em>, 'registrado', EXISTS scores_raven)` a `get_avaliacao_status`, que é DEFINER com guarda `ca.user_id = auth.uid()` e devolve só booleanos (idioma FUNIL-12). O mesmo dado conserta o `ja_respondeu` da tela do Raven, mas isso fica à escolha do planner, porque é um defeito fora do texto do JORN-43.
- Ponto de inserção: dentro do `GlassCard` de cada candidatura em `DashboardCandidatoPage.tsx` (o `map` em ~347-541), perto do bloco «Próximo passo», com `stopPropagation` como os vizinhos. Esconder quando `candidaturaEncerrada(...)`, porque `liberar_cognitivo` recusa `status IN ('rejeitado','finalizado')`. Medido: 4 liberações, nenhuma revogada. 2 concluídas. `2ce20fbf` está liberada, não concluída e com a candidatura **`finalizado/aprovado`**: o card não pode aparecer ali.

### D-16 — «Não se aplica a esta vaga»

`HubSection` tem só `futuro | sem_dados | com_dados` («Sem dados nesta etapa»). Precisa de um 4º estado. O hub já tem `aplica_cognitivo` via `useEntrevistaContexto` (`entrevistaService.ts:278,325`: embed `vagas ( entrevista_agendada_em, aplica_cognitivo )`). `hubEmptyState.test.tsx:47` proíbe «Concluído» no estado vazio, o que deve ser respeitado.

### D-17..D-19 — detalhe no hub

- Montar o detalhe **fora** da guarda `com_dados` do `HubSection` (que só renderiza filhos com dados), como o botão irmão IN-04 da Redação, para valer «em qualquer etapa».
- Filtrar `tipo IN ('sjt','big_five')` (C-8). Contar «N avaliações respondidas» sobre o mesmo filtro.
- Big Five: aguarda a resposta da C-8.

---

## D-24..D-26 — navegação do candidato

**Caminho reproduzido (C-11):**
1. Redação → «Voltar ao painel» → `navigate('/candidato/avaliacao/' + id)` [VERIFIED: `RedacaoEditorScreen.tsx:189`, `git blame` = `1c4e2c56`, 2026-06-24]. Aparece nos estados `locked`, vazio, todas enviadas e sem pergunta (linhas 250, 287, 307, 320).
2. Na lista: se `etapa_atual = 'avaliacao_assincrona'`, `AvaliacaoShell` (cabeçalho só com «Sair», `AvaliacaoContainer.tsx:195-201`; tudo concluído só com texto, `:224-231`). Se não, `WrongEtapaState` → «Voltar ao painel» → `/candidato/dashboard` (`:508`, `:305-307`).
3. Depois do envio não há redirecionamento automático: o container não navega sozinho.

Conclusão: o botão diz «painel» e leva à **lista**. Quando a etapa já mudou, o «Sua etapa avançou» da redação manda à lista, que manda ao bloqueio, que manda ao painel.

Inventário do D-25 (todos `navigate('/candidato/avaliacao/:id')` com o rótulo «Voltar ao painel»): `SjtMultiplaEscolhaScreen.tsx:141,187`, `SjtCasoAbertoScreen.tsx:132,169,202`, `BigFiveQuestionnaireScreen.tsx:343,415,432`, `DevolutivaBigFiveView.tsx:167-170,275-278`, `RedacaoEditorScreen.tsx` (4 sítios). **Fora da lista do D-25, decidir:** `ProvaCognitivaScreen.tsx:90,107` («Voltar ao painel» → `/candidato/dashboard`; está **no** container, então pela convenção seria «Voltar às avaliações»), `AvaliacaoRavenScreen.tsx:46,59` («Voltar ao painel» → dashboard; fora do container, então «Ir ao painel») e `WrongEtapaState` («Voltar ao painel» → dashboard, então «Ir ao painel»). E2E: `e2e/prova-cognitiva.spec.ts:63` e `e2e/explicacao-flow.spec.ts:69` fixam «Voltar ao painel».

D-26: `AvaliacaoShell` é puro e montado sem router no modo de teste. O docblock promete `onBackToPanel` injetado (`:150-152`), mas a prop não existe. Acrescentá-la. `wait-state-copy.grep.test.ts` exige a frase canônica `'Acompanhe o andamento pelo seu painel'`: manter a frase e pôr o botão ao lado.

---

## D-22 — notas de entrevista

Servidor [VERIFIED: PROD `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)`, md5 `b2d88d5149dae6b47ebb2240052a4ea8`]: `IF p_notas IS NULL OR length(btrim(p_notas)) = 0 THEN RAISE EXCEPTION 'notas_humanas obrigatorias' USING ERRCODE = 'check_violation'`. Atenção: `btrim` sem segundo argumento remove **só espaços**, e `String.prototype.trim()` remove todo espaço em branco. O cliente fica **mais estrito ou igual**: tudo que o servidor recusa, o cliente recusa. Sem divergência perigosa.

Cliente [VERIFIED: `EntrevistaScorecardInline.tsx:4,198-222`]: comentário `+ optional gestor notes`, rótulo `Notas do gestor (opcional)`, placeholder `Observações sobre a entrevista (opcional).`, `disabled={saving || semAnalise}`. Serviço: `p_notas: args.notas ?? ''` (`entrevistaService.ts:~752`); 23514 → `INVALID_INPUT` → toast genérico «Não foi possível salvar a avaliação. Tente novamente.».
Testes que mudam: `EntrevistaScorecardInline.test.tsx:77` espera `onSalvar` chamado com `notas: ''` e Salvar habilitado; o cabeçalho (`:14`) diz «As notas do gestor seguem opcionais aqui». `entrevista-contract.test.ts:269,284` usa notas preenchidas e não muda.

---

## D-23 — recibo de exclusão

O motor [VERIFIED: PROD `anonimizar_candidato`, md5 `ecfec02cb92411a1ead2f3c66d6e5207`] grava `cidade = '[removido]'`; `cep`, `logradouro`, `numero`, `complemento`, `bairro` e `genero` = NULL; `data_nascimento = DATE '1900-01-01'`; materializa `faixa_etaria_materializada` antes; **não toca `estado`**. Conferido em PROD nas 2 anonimizações reais: `cidade='[removido]'`, UF de 2 letras mantida, faixa `35-44` / `25-34`, endereço NULL.

O gerador [VERIFIED: `gen-recibo-exclusao.cjs:259-297`] diz «Nome, e-mail, telefone, CPF, data de nascimento, endereço, redes sociais e disponibilidade vão ser apagados…» e lista `'cidade', 'estado'` em `origens` do item `dados_de_cadastro`.

Passos (C-10):
1. `pii-inventory.yaml`: `candidatos.estado` de `anonimizar` → `preservar_com_ressalva` (nota: preservado pelo motor, P45 (5)); acrescentar `candidatos.faixa_etaria_materializada` (`preservar_com_ressalva`).
2. `gen-recibo-exclusao.cjs`: tirar `'estado'` de `dados_de_cadastro`; trocar «endereço» por «CEP, rua, número, complemento, bairro e cidade» (redação do planner); item novo em `ITENS_MANTEM` com `estado` + `faixa_etaria_materializada`, com o texto do D-23 e uma **`base_legal`** (operador).
3. `node docs/compliance/sql/gen-recibo-exclusao.cjs` (3 saídas: `recibo-exclusao.json`, `_shared/reciboExclusao.ts`, `reciboExclusao.generated.ts`) e `node docs/compliance/sql/gen-pii-md.cjs`; depois `npm run check:recibo-exclusao` e `check:pii-inventory-md`.
4. Redeploy de `executar-direito-titular` (`efdeploy.cjs`, `--dry-run` antes).
5. Testes: `ReciboExclusao.test.tsx:66,120` usa `dados_de_cadastro` por id, e `genReciboExclusao.test.ts:192-218` usa as 3 linhas obrigatórias de «mantém» e a expressão «sem ligação com você». Nada fixa «endereço» literal; as ocorrências em `ExcluirDadosBloco*.tsx` são comentários.
Baseline: `check:recibo-exclusao` hoje imprime `OK: … estão em sincronia com docs/compliance/pii-inventory.yaml.`

---

## Padrão e pilha

**Nenhum pacote novo.** A fase usa o que já existe: React 18 + Vite + TS strict, TanStack Query v5, Supabase (Postgres, pg_net, Vault), Edge Functions Deno, Vitest, `deno test`, Playwright. **A auditoria de legitimidade de pacotes não se aplica: nada é instalado.**

| Ferramenta do projeto | Uso nesta fase |
|---|---|
| `node p46apply.cjs migrate|run|sql` | migrations (SQL lido do arquivo, ledger na mesma requisição) e smokes |
| `node efdeploy.cjs <slug> [--dry-run]` | `notificar-candidato`, `notificar-rh` (se necessário), `executar-direito-titular`, `exportar-meus-dados` (D-57 de (b)) |
| `scripts/p50_ensaio.cjs` | ensaio que aborta para smokes que escrevem (`oper31` roda só por ele) |
| `npm run db:types < /dev/null` | depois de toda migration que mude assinatura (memória «db:types pendura e trunca») |
| Geradores `docs/compliance/sql/gen-*.cjs` + `check:*` | recibo, pii md, export allowlist |

---

## Padrões de arquitetura

### Fluxo do pedido de revisão (opção b)

```
Candidato (/candidato/explicacao/:id)
   │ estado_revisao_rejeicao(id)  ──► registro do pedido (RLS sem policy; só DEFINER)
   │ solicitar_revisao_rejeicao(id)
   ▼
[guarda titular] → [status='rejeitado'?] → [origem: knockout | rejeitar_candidatura]
   → [historico_rejeicao_id já tem pedido? → idempotente/indisponível]
   → INSERT registro (solicitada_em) ──trigger──► net.http_post notificar-rh {revisao_solicitada, ciclo}
                                                           │
RH ativo (/rh/revisoes)                                    ▼
   listar_revisoes_decisao(UNION ALL decisao_final + registro, com origem + id)
   (knockout: RPC de detalhe → pergunta / resposta / opção)
   responder_revisao_rejeicao(id, veredito, justificativa)
   ▼
[REVISAO-05: rejeitado_por ≠ uid; NULL = knockout → qualquer RH ativo]
   ├─ mantida  → UPDATE registro
   └─ revertida → UPDATE registro (reaberta_em, prazo)
                  + GUC 'reabertura' → UPDATE candidaturas (etapa_rejeitada | triagem, em_analise, …)
                       └─ avancar_etapa → historico (ator = revisor) ─ trg_notif_transicao: silencioso
   ──trigger──► net.http_post notificar-candidato {revisao_respondida, ciclo} → EF lê veredito/prazo DO REGISTRO
```

### Estrutura de arquivos (onde mexer)

```
supabase/migrations/2026100X…_p51_*.sql     # registro + RPCs + chave raven em get_avaliacao_status
supabase/tests/p51_*_smoke.sql              # especificação executável (escreve só em subtransação que reverte)
supabase/functions/_shared/email-templates.ts  # D-09 (+ nomes, se C-5 permitir)
supabase/functions/notificar-candidato/     # D-09 link; revisao_respondida lê o registro novo
src/features/explicacao/                    # CTA nas três origens; reescrever o comentário de `origem`
src/features/revisao/                       # selo de origem, id do pedido, contexto do knockout
src/features/hub-candidato/components/      # D-16..D-19 (+ HubSection 4º estado)
src/features/avaliacao/components/          # D-25/D-26; ScorecardAvaliacao filtrada + variante Big Five
src/features/avaliacao-cognitiva/           # nomes; card do Raven (no DashboardCandidatoPage)
src/features/entrevista/components/EntrevistaScorecardInline.tsx  # D-22
docs/compliance/{pii-inventory.yaml, sql/gen-recibo-exclusao.cjs}  # D-23 (+ D-57 de (b))
```

### Padrão: RPC reescrita leva PRE-PORTAO com o md5 vivo

```sql
-- Idioma P49-10: a migration recusa rodar sobre um corpo diferente do medido.
DO $pre$ BEGIN
  IF md5(pg_get_functiondef('public.listar_revisoes_decisao(boolean)'::regprocedure))
       IS DISTINCT FROM 'a3889a20dbb0941226db36db881357c7' THEN
    RAISE EXCEPTION 'PRE-PORTAO: corpo vivo de listar_revisoes_decisao divergiu do medido';
  END IF;
END $pre$;
```
Os md5 da tabela «O que o banco faz hoje» foram medidos em 2026-10-08. Remedir no plano: qualquer apply entre hoje e a execução os invalida.

### Anti-padrões

- **Derivar a origem no cliente.** A explicação da 48 já registra: rejeição humana e knockout são a mesma linha para o candidato (`explicacaoService.ts:361-365`). A origem vem do servidor.
- **Editar `COPY_REJEICAO`.** Ela é congelada e testada por igualdade de substring.
- **Reabrir só pelo status.** `guard_rejeicao_auditada` recusa com JWT sem GUC. Sem `etapa_atual` no SET não há histórico.
- **Mexer em `p50_desfazer_expansao.sql` à mão.** O arquivo é «GERADO, NÃO EDITAR À MÃO». Registrar a obsolescência ou regenerar por `scripts/p50_desfazer.cjs`.
- **`set_config(..., true)` sem reset depois do UPDATE**: vaza para o resto da transação (Correção 31; idioma do `responder`).

---

## Não construir à mão

| Problema | Não construir | Usar | Por quê |
|---|---|---|---|
| Ler o texto do caso prático no RH | policy ou view nova em `respostas_avaliacao` | `getRespostaCasoAbertoSjt` → `ler_resposta_caso_aberto_sjt` | Já existe, guardada, sem `anon`, com estados `removida`/`sem_resposta_enviada` |
| Link de login com destino | concatenar `?redirect=` | `montarUrlLogin(base, redirect)` | Guardas de open-redirect já testadas |
| Saber se o candidato concluiu | select do candidato em `scores_*` | `get_avaliacao_status` (estendida) | A RLS do Raven está quebrada (C-4) e o score não pode ir ao navegador |
| Despachar e-mail do banco | chamada do cliente | trigger + `net.http_post` + Vault (`project_url`, `edge_invoke_key`) | Idioma dos 6 triggers `trg_notif_*` |
| Dedupe por ciclo | chave nova | `ciclo = extract(epoch from solicitada_em)::bigint::text` | O formato que `notificar-rh`/`notificar-candidato` já aceitam |
| Recibo | editar `reciboExclusao.generated.ts` | gerador + `--check` | Fechamento de cobertura e direção |
| Analisar knockout reaberto | EF nova | `reprocessar_analise(uuid)` / mesmo `net.http_post` | Já existe e não exige análise prévia |

---

## Inventário de estado em tempo de execução (renome de rótulos e mudança de mecanismo)

| Categoria | Achado | Ação |
|---|---|---|
| Dados guardados | `notificacoes_enviadas.template = 'avaliacao_cognitiva_liberada'` (3 linhas) e as chaves de evento | Nenhuma: as chaves técnicas não mudam |
| Dados guardados | Recibos já emitidos (e-mail + `solicitacoes_dados.plano`) com «endereço» | Nenhuma: ficam como foram (D-23) |
| Config de serviço vivo | Cron `prazo-reabertura-sweep` lê só `decisao_final` | Estender ou declarar fora (opção b) |
| Estado registrado no SO | Nenhum. Verificado: não há agendamento local, só `cron.job` (5 jobs listados) | — |
| Segredos / env | Vault `project_url`, `edge_invoke_key` (usados pelos triggers novos) | Nenhuma: os nomes não mudam |
| Artefatos de build | Bundle Vercel (chunks lazy `/rh/*`); bundles das EFs que embutem `_shared/email-templates.ts` e `_shared/reciboExclusao.ts` | Push com `origin/main..HEAD` vazio; redeploy das EFs listadas; marcador no chunk certo |
| Artefato de rollback | `supabase/tests/p50_desfazer_expansao.sql` restauraria corpos pré-P50 de RPCs que a 51 altera | Registrar e regenerar |

---

## Armadilhas comuns

### 1. Reabertura que não deixa trilha
**Erro:** reabrir o knockout em `inscricao` só pelo status. **Causa:** `avancar_etapa` é `BEFORE UPDATE OF etapa_atual`. **Evitar:** levar a `triagem` (C-1) ou gravar o histórico explicitamente. **Sinal:** a contagem de `historico_candidatura` da candidatura não sobe depois da reabertura.

### 2. EF lê o veredito da fonte errada
**Erro:** `revisao_respondida` de um pedido de triagem lê `decisao_final` (`maybeSingle`) e devolve frase neutra ou veredito de outro ciclo. **Evitar:** o corpo leva `origem` ou id do pedido, e a EF lê do registro certo. **Sinal:** e-mail de resposta sem a frase do veredito.

### 3. Página de explicação some depois da reabertura
**Erro:** depois de revertida, `status ≠ 'rejeitado'`, então `explicacao_rejeicao_origem` devolve NULL e a página mostra «não disponível», escondendo a resposta. **Evitar:** a leitura do titular parte do **registro do pedido**, não do status. Mostrar «reaberta» como a 48-14 faz para `humana`.

### 4. `feedback_rejeicao` residual
**Erro:** reaberta em `decisao_final` com `feedback_rejeicao` ainda gravado faz `hasDecisaoFinal` mostrar «Entenda a decisão». **Evitar:** zerar na reabertura.

### 5. Card de «caso aberto» para linha de entrevista
**Erro:** montar `ScorecardAvaliacao` sem filtro (C-8). **Evitar:** filtrar `tipo`.

### 6. Card do Raven que nunca some, ou que aparece em candidatura encerrada
**Erro:** basear «concluída» em select do candidato (sempre vazio, C-4), ou ignorar `2ce20fbf` (`finalizado` com liberação vigente). **Evitar:** booleano do servidor mais `candidaturaEncerrada`.

### 7. Orçamento do `tsc`
**Medido agora:** `npm run lint` → **89** erros (limite D-53: 90). Sobra **1** de folga. Todo plano que toca TS precisa sair com ≤ 89, na prática. O cast estreito de `ler_resposta_caso_aberto_sjt` em `scoresRhService.ts:202-209` («ainda não está em `database.types.ts`») sai no primeiro `db:types`. Conferir que o regen não muda a contagem.

### 8. Commits locais à frente do `origin/main`
Hoje `git log --oneline origin/main..HEAD` = **6** commits (só `.planning`/docs). O primeiro push com efeito visível os leva junto. Não é problema, mas o portão do CLAUDE.md exige saída vazia **depois** de todo apply visível.

### 9. Portão que deixa de morder
Toda asserção nova da fila e da reabertura precisa de mutação provada (D-56). Exemplo: rodar o smoke contra o corpo com REVISAO-05 desligada (`IF false`, idioma M19 do p50) e ver o vermelho.

---

## Exemplos de código (idioma do projeto)

### Reabrir sob a sanção e conferir a linha
```sql
-- Fonte: responder_revisao_decisao vivo (md5 d4b47f5b…) — o idioma a reproduzir
PERFORM set_config('app.transicao_sancionada', 'reabertura', true);
UPDATE public.candidaturas
   SET etapa_atual = v_etapa_destino,           -- etapa_rejeitada, ou 'triagem' no knockout (C-1)
       status = 'em_analise',
       etapa_justificativa = format('Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até %s.',
                                    to_char(v_data_limite, 'DD/MM/YYYY')),
       feedback_rejeicao = NULL,
       data_decisao_final = NULL
 WHERE id = p_candidatura_id;
GET DIAGNOSTICS v_n = ROW_COUNT;               -- ANTES de qualquer PERFORM
PERFORM set_config('app.transicao_sancionada', '', true);
IF v_n <> 1 THEN RAISE EXCEPTION 'reabertura nao moveu a candidatura (% linhas)', v_n; END IF;
```

### Link da explicação no e-mail de rejeição
```ts
// Fonte: supabase/functions/_shared/email-config.ts:76 (montarUrlLogin com redirect)
const urlExplicacao = montarUrlLogin(deps.appBaseUrl, `/candidato/explicacao/${candidatura_id}`)
// corpoDecisao: só quando desfecho !== 'aprovado'; COPY_REJEICAO intacta; parágrafo novo em constante própria
```

### Sonda de acesso (D-12 da 50 / memória «exposição a anon inclui views»)
```sql
set transaction read only;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select count(*) from public.<tabela_nova>;   -- esperado: erro 42501 ou 0
-- repetir com JWT de candidato de OUTRA candidatura e com RH inativo (608d094e…, ativo=false)
```

---

## Estado da arte

| Antes | Agora | Quando | Impacto |
|---|---|---|---|
| D-20 da 48: sem revisão fora da decisão final | Revisão nas três origens | operador 29/09 | Revoga comentários e testes que asserem a ausência do CTA (`ExplicacaoCandidatoPage.test.tsx:400-506`) |
| `ScorecardAvaliacao` «usado em 4 telas» | Não montado desde 2026-09-30 (CR-02) | 49-REVIEW-GAPS-3 | O D-17 é a primeira montagem |
| RH sem leitor do caso prático | `ler_resposta_caso_aberto_sjt` | 49-44 / 2026-10-03 | O D-21 não dispara |

---

## Registro de suposições

| # | Suposição | Seção | Risco se estiver errada |
|---|---|---|---|
| A1 | O operador aceita que a reabertura do knockout vá para `triagem` (C-1) | JORN-42 | Se exigir `inscricao`, o histórico precisa ser gravado à mão e a candidatura fica numa etapa sem tela de RH |
| A2 | A opção (b) é a escolhida; o motor ganha um passo para raspar a resposta do revisor | JORN-42 | Com (a), o mapa de smokes quebrados é o da coluna (a) |
| A3 | O alerta de prazo (`varrer_prazos_reabertura`) deve cobrir as reaberturas de triagem e knockout (D-04, «o mesmo `prazo_nova_decisao_em`») | D-04 | Se não cobrir, a reabertura fica sem cobrança ao RH |
| A4 | Estender `get_avaliacao_status` é aceitável como mudança sem abertura de acesso (só booleanos, mesma guarda) | D-13 / C-4 | Se o operador tratar como mudança de acesso, entra no review D-12 |
| A5 | Nenhuma notificação `decisao` está em `falhou` esperando retry (o deploy do D-09 não reenviaria uma rejeição antiga com o texto novo) | D-09 | Medir antes do deploy; não foi medido nesta sessão |
| A6 | `PesosSliders` (chip «Cognitivo» na configuração da vaga) entra no D-15 | D-15 | Cosmético |

---

## Perguntas em aberto (ao operador, antes do plano)

1. **C-1:** a reabertura do knockout vai para `triagem`? (recomendado)
2. **C-5:** o D-14 desliga o e-mail de liberação do Raven que a D-22 da 48 criou, ou mantém? Se mantiver, o e-mail passa a nomear o instrumento («Raciocínio lógico (Matrizes)»), contra o comentário «NÃO nomeia o instrumento»?
3. **C-8:** no detalhe do hub, o Big Five mostra faixas (49 D-31: «As faixas seguem no hub») ou só «Concluído/Não fez» (51 D-19)?
4. **C-10:** qual `base_legal` vai na linha nova de «mantém» (estado e faixa etária para relatório agregado)?
5. **C-2:** o selo «triagem» para rejeições pelo RH em qualquer etapa. Aceitar o nome ou trocar por «rejeição pelo RH»?
6. **D-03 colateral:** na reabertura do knockout, zerar `motivo_rejeicao` (sai do `knockout_rate`) ou manter? E despachar a análise automaticamente?
7. **D-25 fora da lista:** `ProvaCognitivaScreen` (está no container, logo «Voltar às avaliações»?) e `WrongEtapaState` / Raven («Ir ao painel»).

---

## Disponibilidade do ambiente

| Dependência | Usada por | Disponível | Versão | Alternativa |
|---|---|---|---|---|
| Node | scripts, geradores, `p46apply`/`efdeploy` | ✓ | v24.18.0 | — |
| npm | lint/test | ✓ | 11.16.0 | — |
| Supabase CLI | `db:types` | ✓ | 2.116.0 | — |
| Deno | testes de EF (`deno test supabase/functions/...`) | ✓ | 2.9.4 | — |
| Token Management API (Keychain «Supabase CLI») | `p46apply`, `efdeploy` | ✓ (consultas desta sessão funcionaram) | — | `SUPABASE_ACCESS_TOKEN` |
| Contas para a sessão real (D-28/D-29) | RH2 recrutador `af4ebf97…` ativo; admins ativos `4fceff36…`, `023abcd6…`, `66412f96…`; conta de candidato de teste nova para a inscrição com knockout | ✓ (RH) / a criar (candidato) | — | — |

Nada falta.

---

## Arquitetura de validação (Nyquist)

### Framework de teste
| Propriedade | Valor |
|---|---|
| Unidade / componente | Vitest (`vite.config.ts` `test.include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`; EFs excluídas) |
| EF | `deno test supabase/functions/<…>/__tests__/*.test.ts` |
| Banco | smokes SQL por `node p46apply.cjs run supabase/tests/<arquivo>.sql` (escrita só em subtransação que reverte; contador `pass = esperado`); `oper31` só por `node scripts/p50_ensaio.cjs` |
| E2E | Playwright (`e2e/*.spec.ts`), opcional |
| Comando rápido | `npx vitest run <arquivos tocados>` |
| Suíte completa | `npm run test:run && npm run lint` (lint ≤ 89/90) e `deno test supabase/functions` |

### Requisito → prova
| Req | Comportamento | Tipo | Comando / consulta (D-51) | Existe? |
|---|---|---|---|---|
| JORN-42 | Pedido aceito nas 3 origens; um por rejeição; só `status='rejeitado'` | smoke SQL | `p46apply run supabase/tests/p51_revisao_rejeicao_smoke.sql`: fixture sintética `@invalido.local`, atores reais lidos na execução (idioma p48) | ❌ Wave 0 |
| JORN-42 | REVISAO-05 na triagem; qualquer RH ativo no knockout; RH inativo 42501 | smoke | idem, com mutação provada (M-`IF false`) | ❌ |
| JORN-42 | Procedente reabre em `etapa_rejeitada` / `triagem` (knockout) com 1 linha de histórico, `em_analise`, prazo SP+10 | smoke + sessão real | consulta: `select etapa_atual,status from candidaturas where id=…` + `count(historico)` antes/depois | ❌ |
| JORN-42 / D-03 | Knockout revertido não é reaplicado; só `submit_candidatura_atomic` grava `knockout_automatico` | smoke por forma + sessão real D-29 | `select proname from pg_proc where prosrc ~ $$motivo_rejeicao\s*=\s*'knockout_automatico'$$` = {submit_candidatura_atomic}, mais estado da candidatura de teste depois da revertida | ❌ |
| JORN-42 | Fila: origem + id, admin = RH ativo (md5), contar inclui as novas | smoke p50 (k) ajustado + novo | `listar_revisoes_decisao(true)` sob os dois JWTs | parcial (p50) |
| JORN-42 | Nada abriu para `anon` nem para candidato alheio (tabela nova, views) | sonda de role | `SET LOCAL ROLE anon/authenticated` por tabela e RPC | ❌ |
| JORN-42 / D-09 | E-mail de rejeição tem o link `/candidato/explicacao/<id>` só em `rejeitado`; grep-guard verde | deno | `deno test supabase/functions/_shared/__tests__/email-templates.test.ts` | ✅ (acrescentar caso) |
| JORN-42 | Fixtures p42/p48/p49 do ciclo `decisao_final` continuam verdes | smoke | `p42_revisao_art20_smoke`, `p48_reabertura_smoke`, `p48_rejeicao_triagem_smoke`, `p48_dedupe_smoke`, `p49_snapshot_smoke`, `oper31` (via ensaio) | ✅ |
| JORN-42 (b) | Motor raspa a resposta do revisor no registro novo | smoke | `p45_motor_exclusao_smoke.sql` + asserção nova; `p44_export_drift_smoke.sql` (BD-14) | ✅ + acréscimo |
| JORN-43 | Card visível só com liberação vigente, não concluída e candidatura em andamento | unit + navegador + banco | teste do card; `get_avaliacao_status(<id>)->'raven'` sob o JWT do titular | ❌ |
| JORN-44 | «Ir ao painel» no cabeçalho e no tudo-concluído | unit + navegador | `AvaliacaoContainer.test.tsx` | ✅ (acrescentar) |
| JORN-45 | Botão «Ver respostas» expande o detalhe; filtro de tipo; texto ao lado das citações | unit + navegador | `HubCandidatoRH` + `ScorecardAvaliacao.test.tsx` (ajustar faixas conforme C-8) | parcial |
| JORN-46 | Rótulos «Voltar às avaliações» → lista; «Ir ao painel» → dashboard | unit + e2e | grep de rótulo + `e2e/prova-cognitiva.spec.ts` / `explicacao-flow.spec.ts` ajustados | parcial |
| JORN-47 | Salvar bloqueado com notas vazias; mensagem na tela | unit | `EntrevistaScorecardInline.test.tsx` (`:77` muda) | ✅ (ajustar) |
| JORN-48 | Nenhuma superfície diz só «Avaliação cognitiva»; nomes do D-15 | grep test | guarda nova por forma (rótulos) + `forbidden-strings.grep.test.ts` | ❌ |
| JORN-49 | Recibo sem «endereço»; «mantém» com estado e faixa; inventário coerente com o motor | gerador | `npm run check:recibo-exclusao && npm run check:pii-inventory-md`; `genReciboExclusao.test.ts`, `ReciboExclusao.test.tsx` | ✅ |

### Cadência
- **Por commit:** `npx vitest run <arquivos>` + `npm run lint` (≤ 89).
- **Por onda:** suíte Vitest completa; smokes da onda por `p46apply run`; marcador no chunk certo (`grep -rl "<marcador>" build/assets/`).
- **Portão de fase:** tudo verde, sessões D-28/D-29 com consulta de aceite, `git log origin/main..HEAD` vazio.

### Lacunas da Wave 0
- [ ] `supabase/tests/p51_revisao_rejeicao_smoke.sql`: especificação executável escrita ANTES da migration (idioma 42-03, «deliberadamente RED»)
- [ ] `supabase/tests/p51_raven_status_smoke.sql` (ou caso no smoke acima): `get_avaliacao_status` com chave `raven`, guarda de titular
- [ ] Guarda Vitest de rótulos do D-15 / D-25
- [ ] Edição de portões com mordência provada: `p50_acesso_recrutador_smoke` (k) ORDER BY; testes que asserem ausência de CTA (`ExplicacaoCandidatoPage.test.tsx:400-506`, `explicacaoService.test.ts`); `revisaoService` (allowlist `FILA_REVISAO_COLUNAS`); `ScorecardAvaliacao.test.tsx:62-66`; `EntrevistaScorecardInline.test.tsx:77`

---

## Domínio de segurança

`security_enforcement` não está em `.planning/config.json` (ausente = ligado).

### Categorias ASVS aplicáveis
| Categoria | Aplica | Controle |
|---|---|---|
| V2 Autenticação | não (nada muda) | — |
| V3 Sessão | não | — |
| V4 Controle de acesso | **sim** | RPC DEFINER com guarda de papel ANTES de qualquer leitura (sem oráculo de existência, idioma WR-02); `is_active_rh_user()` em todo ramo RH (D-02 da 50); guarda de titular `ca.user_id = auth.uid()` com `IS DISTINCT FROM` (falha fechada); REVISAO-05; RLS sem policy na tabela nova; `REVOKE EXECUTE … FROM PUBLIC, anon` (o `pg_default_acl` de `public` concede EXECUTE a anon, comentário de `retirar_candidatura`) |
| V5 Validação de entrada | sim | veredito em vocabulário fechado (CHECK + RPC); justificativa ≥ 50 no servidor; Zod no cliente (`responderRevisaoSchema`); notas não vazias (D-22) |
| V6 Criptografia | não | — |
| V8 Proteção de dados | sim | Allowlist de colunas para o candidato (nunca `justificativa` interna, nunca `revisao_por_usuario`); `opcao_knockout_id` nunca ao candidato (D-15 da 48); e-mail sem token de avaliação (grep-guard) |

### Ameaças conhecidas
| Padrão | STRIDE | Mitigação |
|---|---|---|
| Candidato pede revisão de candidatura alheia (IDOR) | Elevação | guarda de titular na RPC; sonda com JWT de outro candidato |
| RH que rejeitou responde a própria revisão | Repúdio | REVISAO-05 por `rejeitado_por` (histórico) |
| Token de recrutador desativado (JWT de até 1 h) | Elevação | `is_active_rh_user()` antes da leitura |
| Reabrir sem trilha | Repúdio | GUC sancionada + linha de histórico com ator |
| `anon` alcança tabela ou view nova | Divulgação | sonda `SET LOCAL ROLE anon`, inclusive em views (memória) |
| Open redirect no link do e-mail | Adulteração | `montarUrlLogin` + `resolveRedirect` |

---

## Fontes

### Primárias (ALTA)
- PROD, só leitura, 2026-10-08: `pg_get_functiondef` (md5 na tabela do JORN-42, mais `anonimizar_candidato`, `salvar_avaliacao_entrevista` ×2, `get_avaliacao_status`, `ler_resposta_caso_aberto_sjt`, `liberar/revogar_cognitivo`, `trg_notif_*`, `reprocessar_analise`), `information_schema`, `pg_constraint`, `pg_policies`, `pg_enum`, `cron.job`, `notificacoes_enviadas`, sondas `SET LOCAL ROLE` (anon, RH ativo `af4ebf97`, candidato titular de `d31c78bb`)
- Código lido nesta sessão: `explicacaoService.ts`, `AvaliacaoContainer.tsx`, `RedacaoEditorScreen.tsx`, `HubCandidatoRH.tsx`, `EntrevistaScorecardInline.tsx`, `ScorecardAvaliacao.tsx`, `scoresRhService.ts`, `email-templates.ts`, `gen-recibo-exclusao.cjs`, `ProvaCognitivaScreen.tsx`, `AvaliacaoRavenScreen.tsx`, `LiberacaoCognitivoBlock.tsx`, `CognitivoBandCard.tsx`, `DashboardCandidatoPage.tsx`, `ravenService.ts`, `useLiberacaoCognitivo.ts`, `revisaoService.ts`, smokes `oper31`, `p48_rejeicao_triagem`, `p48_reabertura`, `p42_revisao_art20`, `p50_acesso_recrutador`, `p50_desfazer_expansao`
- `.planning`: 51-CONTEXT, REQUIREMENTS (JORN-42..49), 49-18-SUMMARY §Defeitos, 49-CONTEXT §Restrições + D-31, 48-CONTEXT D-01/D-02/D-20/D-21/D-22 e retroatividade, 50-CONTEXT D-02/D-07/D-10/D-12, todo `49-producoes-do-candidato-sem-leitor-de-rh`

### Secundárias / terciárias
- Nenhuma fonte externa. A fase não usa biblioteca nova e não houve busca na web.

## Metadados

**Confiança por área:**
- Fatos do banco e do código: ALTA (medidos e lidos nesta sessão)
- Recomendação do mecanismo JORN-42: MÉDIA (julgamento sobre custos medidos; o planner escolhe)
- Armadilhas: ALTA para as reproduzidas no código (C-4, C-7, C-8, C-11, C-12); MÉDIA para A5 (retry de notificação, não medido)

**Data da pesquisa:** 2026-10-08
**Válido até:** os md5 valem até o próximo apply em PROD. Remedir no plano (PRE-PORTAO). O resto vale cerca de 14 dias.
