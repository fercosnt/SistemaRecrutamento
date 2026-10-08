# Phase 51: Consertos da Jornada — Bloco 3 - Context

**Gathered:** 2026-10-07 (`/gsd-discuss-phase 51`, operador)
**Status:** Ready for planning

<domain>
## Phase Boundary

Os 8 defeitos que a UAT de 27–29/09 encontrou na jornada real e que o operador roteou ao Bloco 3
(JORN-42..49; `REQUIREMENTS.md` e `49-18-SUMMARY.md` §Defeitos):

| JORN | Defeito | Quem fere |
|---|---|---|
| 42 | O direito de revisão (Art. 20) depende do caminho que registrou a rejeição | candidato (direito) |
| 43 | A avaliação de raciocínio (Raven) não tem porta de entrada | candidato |
| 44 | A lista de avaliações não oferece volta ao painel | candidato |
| 45 | O hub do RH anuncia registros de avaliação e não leva até eles | RH |
| 46 | «Voltar ao painel» da redação — destino/rótulo (ver D-24: fato a remedir) | candidato |
| 47 | Notas de entrevista: obrigatórias no servidor, opcionais no cliente (400 mudo) | RH |
| 48 | Os dois instrumentos cognitivos são indistinguíveis pelo nome | RH e candidato |
| 49 | O recibo de exclusão promete apagar «endereço» inteiro | titular |

**Fora:** JORN-50..52 (banco SJT — seguem sem fase); o Bloco 4 da fila; o portfólio e a Parte B
do todo `49-producoes-do-candidato-sem-leitor-de-rh` (ver D-17 e Deferred).

</domain>

<decisions>
## Implementation Decisions

> Numeração própria desta fase (D-01..). Decisões herdadas são citadas com a fase de origem
> («D-54 da 49») e não ganham número novo.

### Herdadas — NÃO reabrir [informational]

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

### Revisão sempre disponível (JORN-42)

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

### Os dois instrumentos cognitivos (JORN-43, JORN-48)

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

### Caminho do hub do RH (JORN-45)

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

### Notas de entrevista e recibo (JORN-47, JORN-49)

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

### Navegação do candidato (JORN-44, JORN-46)

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

### Ordem de entrega e prova

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

### Folded Todos

- **`49-producoes-do-candidato-sem-leitor-de-rh`** — só a **face do caso prático da Parte A**
  (texto integral ao lado das citações da IA; o todo chama de «buraco de auditabilidade»). Encosta
  no JORN-45 (mesma família: anunciar sem dar caminho). Vira D-20/D-21. Portfólio e Parte B ficam
  no todo.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Origem dos defeitos
- `.planning/REQUIREMENTS.md` — linhas JORN-42..49 (a descrição medida de cada defeito) e a tabela de rastreabilidade (hoje diz «Bloco 3 (fase a criar)» — atualizar para Phase 51)
- `.planning/phases/49-consertos-da-jornada-bloco-2/49-18-SUMMARY.md` §Defeitos — a UAT de 27–29/09 que achou os 8
- `.planning/ROADMAP.md` §«Phase 51» — goal ainda «[A definir no kickoff]»; preencher a partir deste CONTEXT

### Decisões herdadas
- `.planning/phases/49-consertos-da-jornada-bloco-2/49-CONTEXT.md` §«Restrições de execução» (D-49..D-58) e D-31
- `.planning/phases/48-consertos-da-jornada-bloco-1/48-CONTEXT.md` — D-01, D-02, D-20 (revogada pelo JORN-42), D-21, regra de retroatividade (§linha ~170)
- `.planning/phases/50-acesso-do-recrutador/50-CONTEXT.md` — D-02 (helper vivo), D-07, D-10 (RH2), D-12 (review de acesso)
- `CLAUDE.md` — via de apply (`p46apply.cjs`), push depois de apply visível, chunk certo, varredura por forma

### Todo incorporado
- `.planning/todos/pending/49-producoes-do-candidato-sem-leitor-de-rh.md` — Parte A (só caso prático)
- `docs/specs/SPEC-VISRH-04-portfolio-visivel-rh.md` — contexto do portfólio (FORA desta fase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/explicacao/services/explicacaoService.ts` — discriminador `origem` (`'humana' | 'automatica' | 'humana_triagem'`) e `getExplicacaoSemDecisaoFinal` via RPC `explicacao_rejeicao_origem`; hoje zera todo o ciclo de revisão fora de `'humana'`
- `src/features/explicacao/components/SolicitarRevisaoCTA.tsx` — o CTA que passa a valer para as três origens
- `src/features/revisao/` — fila (`FilaRevisoesTable`, `RevisaoSlaBadge`, `slaRevisao.ts`, chave `revisao_art20`), `ResponderRevisaoDialog`
- `supabase/migrations/20260921000011_p48_reabertura_colunas_e_resposta.sql` — reabertura (`reaberta_em`, `prazo_nova_decisao_em`) que o D-02/D-04 estendem
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx` (+ `CasoAbertoBreakdown`, lê `row.citacoes` pela allowlist de `scoresRhService.ts`) — já usado em hub, entrevista, decisão e redação
- `src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts` — leitura de `cognitivo_liberacao` (`liberado_em`, `revogado_em`) para o card do D-13
- `docs/compliance/sql/gen-recibo-exclusao.cjs` → `src/features/privacidade/constants/reciboExclusao.generated.ts` (+ espelho) — texto do D-23

### Established Patterns
- Rotas `/rh/*` e `/admin/*` são chunks lazy; conferência de marcador no chunk certo
- Toda RPC reescrita de corpo vivo leva bloco PRE-PORTAO com md5 do corpo medido (precedente P49-10)
- Raven e prova cognitiva são deliberadamente separados (`ravenService.ts` cabeçalho; `routes.tsx:322`) — gates diferentes, tabelas diferentes

### Integration Points
- `src/features/hub-candidato/components/HubCandidatoRH.tsx` ~389-411 (seções «Avaliação Assíncrona» e «Avaliação Cognitiva», `LiberacaoCognitivoBlock`)
- `src/features/avaliacao/components/AvaliacaoContainer.tsx` (cabeçalho ~180-203, estado concluído ~229, `CONTAINER_TESTE_CONFIG` ~70-100, `WrongEtapaState` ~508)
- `src/features/avaliacao/components/{Redacao,SjtCasoAberto,SjtMultiplaEscolha,BigFiveQuestionnaire}Screen.tsx`, `DevolutivaBigFiveView.tsx` — `backToPanel`
- `src/features/entrevista/components/EntrevistaScorecardInline.tsx` + `entrevistaService.ts:735-760` — notas (D-22)
- RPCs `rejeitar_candidatura`, `registrar_decisao`, `solicitar_revisao_decisao`, `explicacao_rejeicao_origem`, `listar_revisoes_decisao`, `contar_revisoes_pendentes`; o knockout da inscrição; o e-mail de rejeição (EF)

</code_context>

<specifics>
## Specific Ideas

- Nomes exatos escolhidos pelo operador: **«Prova cognitiva»** e **«Raciocínio lógico (Matrizes)»**; **«Voltar às avaliações»** e **«Ir ao painel»**; **«Não se aplica a esta vaga»**.
- O recibo deve dizer o que fica: «estado e faixa etária, sem vínculo com o seu nome, para relatório agregado».
- Prova do knockout com inscrição real de teste: cai → pede → revertida → não cai de novo.

</specifics>

<deferred>
## Deferred Ideas

- Portfólio visível ao RH (Parte A, face do portfólio — depende de `SPEC-VISRH-04`, D1/D2 em aberto).
- Parte B do todo (nota do RH + entregável externo — tabela nova, §4 de LGPD).
- Aviso por e-mail quando o Raven é liberado — só faria sentido se a aplicação deixasse de ser presencial.
- Prazo para pedir revisão / revisão para «finalizado sem contratação» — discutidos e recusados nesta fase.
- JORN-50..52 (banco SJT).

### Reviewed Todos (not folded)
- O casamento automático de todos (`todo.match-phase`) devolveu apenas coincidências de palavra («phase», «sem», «run»): `25-review-deferred`, `42-pitr-nao-verificado-bloqueia-p45`, `43-smokes-com-baseline-congelada-viram-red`, `49-banco-sjt-aplicado-e-nao-conectado` (é JORN-50, fora), `49-portao-que-casa-pela-superficie-sem-ler-o-sentido`, `admin-retencao-services-e-hooks-sem-teste` — nenhum é escopo desta fase.

</deferred>

---

*Phase: 51-consertos-da-jornada-bloco-3*
*Context gathered: 2026-10-07*
