# Phase 49: Consertos da Jornada — Bloco 2 - Context

**Gathered:** 2026-09-22
**Status:** Ready for planning. Pesquisa feita (`49-RESEARCH.md`); portão fechado pelo operador em
2026-09-22, decisões D-59..D-68 (§«Decisões do portão»).
**Mode:** discuss-phase interativo, **precedido de medição**. Cinco agentes só leitura (código +
`node p46apply.cjs sql "set transaction read only; …"` em PROD), um por grupo de defeitos. O
orquestrador conferiu pessoalmente as afirmações que sustentam cada correção. As decisões abaixo
foram tomadas pelo operador **sobre os fatos medidos**, não sobre a fila como estava escrita.

<domain>
## Phase Boundary

O RH decide sobre o que é verdade:
- a IA que ranqueia é a configurada e, quando não for, a troca aparece;
- a nota que a lista mostra é a que existe;
- a rubrica que o RH lê é a que a IA avaliou;
- quem já saiu do funil não é oferecido para avançar;
- a trilha da candidatura (justificativa, análise vigente, histórico da decisão) registra o que
  aconteceu.

Nesta fase o objetivo também cobre o que o sistema promete ao titular sobre os próprios dados
(recibo de exclusão, cópia do Art. 18). Isso entrou pelos achados da varredura, por decisão do
operador.

**Entra na fase: 17 itens.** O número de cada ID segue a convenção do Bloco 1 (= número do defeito).
Os itens 32–40 são **achados novos** desta varredura. Continuam a numeração da tabela «Defeitos —
acumulado» da `JORNADA-GUIADA.md`, que ainda **não** os tem (ver §Deferred, «Escrituração»).

| ID | O quê | Origem |
|---|---|---|
| JORN-28 | Troca silenciosa de modelo; «não coube» × «demorou» × «fora do schema» indistinguíveis | fila, Bloco 2 |
| JORN-13 | Card da lista do RH mostra 0 (e cor de nota) onde não há nota | fila, Bloco 2 |
| JORN-07 | Rubrica fantasma na redação cultural | fila, Bloco 2 |
| JORN-25 | Comparativo ranqueia e oferece «Avançar» para encerradas; o banco aceita avançar um knockout e dispara e-mail | fila, Bloco 2 |
| JORN-12 | Análise de entrevista sem vigente, sem fonte, sem entrevista, sem autor | fila, Bloco 2 |
| JORN-17 | `etapa_justificativa` gruda e desarma o portão de regressão | fila, Bloco 2 |
| JORN-3b | Ler a explicação (ou qualquer UPDATE sem mudança) versiona a decisão | fila, Bloco 2 |
| JORN-32 | IDOR na EF `comparativo-candidatos`: a vaga das análises não é comparada à vaga cuja posse foi checada | varredura do 25 |
| JORN-33 | Kanban ignora `status='finalizado'` no selo de encerrada e deixa arrastar para frente | varredura do 25 |
| JORN-34 | `UpdateStatusModal` permite `rejeitado → em_analise` só de status, sem histórico nem justificativa | varredura do 25 |
| JORN-35 | SJT (`work_sample_sjt`) não recebe a rubrica da pergunta; pesos por dimensão viram uniformes em silêncio | varredura do 7 |
| JORN-36 | Recibo de exclusão diz que transcrições/textos «foram apagados»; o motor não apaga | varredura do 12 |
| JORN-37 | BD-9: a justificativa da decisão final, excluída de propósito da cópia do titular, chega a ele pela trilha | varredura do 17 |
| JORN-38 | Lista do RH (`listAllCandidaturas`) puxa `candidatos(*)`, CPF inclusive, para o navegador | varredura do 13 |
| JORN-39 | Auditoria de IA perdida em silêncio: linhas `provider='none'` (teto de custo, injeção de prompt) falham no enum e o erro é engolido | varredura do 28 |
| JORN-40 | Hub mostra ao RH o percentil cru do Raven, contra a UX-07 (só faixas) | varredura do 13 |

**O 14 fica fora do código.** D8 (operador): avançar **não** exige evidência. Está listado só para o
registro do bloco ficar completo. Consequência aceita: o histórico continua podendo afirmar uma etapa
que não aconteceu. **Nada desta fase pode introduzir portão de evidência no avanço.** A trava do
JORN-25 recusa mover candidatura **encerrada**, o que não é exigir evidência da etapa.

**NÃO entra:**
- Blocos 3 e 4 da fila (`JORNADA-GUIADA.md` §«FILA DE CONSERTOS»).
- A escolha de modelo das funções de IA. A pendência **P1** segue aberta: o 28 torna o fallback
  visível, não escolhe modelo.
- O Defeito 15b (coletar justificativa em cada avanço humano), que não está em bloco nenhum da fila.

**Estado de PROD na abertura** (medido em 2026-09-22):

| O quê | Medida |
|---|---|
| candidatos / candidaturas | 44 / 38 |
| `tsc --noEmit` | **90** erros (teto 90, medido no kickoff como o ROADMAP pedia) |
| Varredura de portões do `CLAUDE.md` | **282** linhas (o `CLAUDE.md` ainda diz 244; a JORNADA dizia 246 em 20/09) |
| `git log origin/main..HEAD` | vazio |

</domain>

<decisions>
## Decisões

### Herdadas do operador — NÃO reabrir

- **JORNADA D1–D8** (`JORNADA-GUIADA.md` §«DECISÕES TOMADAS»). As que incidem aqui:
  - **D4**: append por etapa; a tela mostra a mais recente, com as anteriores acessíveis;
    sobrescrever é o modo de falha. O alcance foi esclarecido neste kickoff, em D-37.
  - **D8**: avançar não exige evidência.
- **Phase 48 D-01..D-23** (`48-CONTEXT.md`). As que incidem aqui:
  - **D-01 [informational]:** a reabertura `rejeitado → decisao_final` é transição **sancionada**. A trava do
    JORN-25 tem de deixá-la passar.
  - **D-02 [informational]:** o padrão «marcar, não apagar».
  - **D-07 [informational]:** nenhum texto novo introduz ocorrência literal do endereço do canal de privacidade.
  - **D-14 [informational]:** decisão do operador inexequível como escrita → o executor para e reporta.
  - **D-15 [informational]:** D-15..D-19 — ambiente; repetidas abaixo como restrições.
  - **D-21 [informational]:** predicado canônico `candidatura_encerrada`, para reusar e não recriar.
- **Exceção de linguagem já decidida** (`CLAUDE.md`, operador 2026-09-22): o disclaimer negado da
  devolutiva («… não é teste psicológico») fica.

### Decisões de produto e LGPD do operador (kickoff 2026-09-22)

> Seção separada de propósito. São escolhas do operador sobre **o que** o produto faz. Nenhum plano
> as reinterpreta. A numeração continua a da Phase 48 (D-24 em diante) para não colidir com
> D-01..D-23 nem com D1–D8.

**Rubrica da redação (JORN-07)**

- **D-24:** A rubrica canônica da redação cultural é a **BARS do PRD v1.1**:
  - D1 Especificidade da situação
  - D2 Ação demonstrada
  - D3 Aprendizado/Reflexão
  - D4 Alinhamento com os valores Beauty Smile (os 4 valores moram **dentro** da D4)

  Fontes: `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md` (binding) e
  `docs/conhecimento/fit-cultural/bars-redacao-4-dimensoes.md` v1.1. **Não** são os 4 valores
  como D1–D4: esse mapeamento nasceu na Phase 13 contra o PRD, e o conserto como estava escrito na
  fila o cravaria por teste.
  - O cap `D1 ≤ 2 → no máximo 50, 'situacao_generica_ou_inventada'` segue válido. É o significado
    que ele sempre teve.
  - O comentário falso de `_shared/essay-schemas.ts:19-20` sai.
  - **Reversibility:** costly. A rubrica define o que a nota consolidada significa. Voltar atrás
    exige nova versão de prompt e reavaliação.
- **D-25:** A tela de revisão da redação mostra **rótulos fixos vindos de uma única constante**,
  a mesma que alimenta a rubrica enviada ao modelo. Nunca por posição com um mapa próprio da tela.
  Mostra também o **raciocínio e as citações** que a IA já grava. Hoje a tela lê
  `analise_ia.reasoning`/`citacoes`, que não existem, e mostra só 4 números.
- **D-26:** As 2 redações já avaliadas com a rubrica fantasma (ambas de conta de teste) **ficam como
  estão**. A rubrica nova entra com **versão própria gravada na linha**, e a tela distingue as
  antigas pela versão. Nenhuma escrita retroativa.

**Modelo e fallback (JORN-28, liga à P1)**

- **D-27:** **O fallback continua, visível.** Quando o Sonnet falha (não coube, demorou, saiu do
  schema), o resultado ainda pode sair do `gpt-4o-mini`, mas:
  - (a) **o resultado carrega o modelo real** (D-28);
  - (b) **a tela do resultado mostra a troca**: comparativo, análise, guia, análise de entrevista
    e redação, **inclusive o PDF exportado do comparativo**;
  - (c) **o log de IA do admin** deixa de mostrar «Sucesso» verde para fallback. A linha ganha
    estado próprio e a **causa separada**: não coube / demorou / fora do schema.

  Sem aviso ativo ao admin (opção oferecida e não escolhida). A escolha do modelo (P1) fica fora.
- **D-28:** **Proveniência por coluna em cada tabela de resultado.** Provedor e modelo **reais** em:
  - `analise_candidato_vaga`
  - `comparativo_solicitado`
  - `entrevista_guias`
  - `entrevista_analises`
  - `redacoes_candidato`, que hoje grava o modelo **configurado**, e isso passa a ser defeito

  Sobrevive à purga de 180 dias do `ai_call_logs`. Coluna nova passa pelo checklist LGPD
  (§Restrições, D-49).
- **D-29:** **O comparativo baixa o teto de candidatos** em vez de encurtar a saída ou esticar o
  tempo. **O número é medido pela pesquisa e volta ao operador antes do plano.** Critério: o maior
  teto cuja saída cabe em 110 s com folga, no throughput medido do Sonnet (45–59 tok/s em PROD).
  O `max_tokens` é dimensionado junto.
- **D-30:** Os resultados já gerados por fallback (comparativos de 06/09 e 20/09, 1 guia presencial;
  todos de teste) **ficam como estão**, com proveniência «desconhecida» na coluna nova. Nenhuma
  escrita retroativa.

**Card da lista do RH (JORN-13, JORN-40)**

- **D-31:** Célula **Big Five = «concluído» / «não fez»**, sem número e sem cor de nota. Respeita
  UX-07/RNF-07a: Big Five é não avaliativo. As faixas seguem no hub.
- **D-32:** Célula **Cultura = só a nota revisada por humano**: `scores_candidato` com
  `tipo='redacao'`, gravada por `sincronizar_score_redacao` depois da revisão.
  - Antes da revisão: «aguardando revisão».
  - Sem redação: «não fez».
  - Nunca a sugestão da IA de `redacoes_candidato`.
- **D-33:** **DISC sai do card** (não existe no produto). **Inteligência = faixa do Raven, sem
  percentil**, ou «não fez». A mesma regra vale para o hub (JORN-40): o `LiberacaoCognitivoBlock`
  deixa de mostrar o percentil cru.
- **Invariante do 13:** ausência nunca vira `0`. Zero é a pior nota, não «sem dado».

**Comparativo (JORN-25)**

- **D-34:** Na seleção do comparativo da vaga, **candidatura encerrada aparece com selo e não é
  selecionável**. A **Edge Function também recusa** encerrada (defesa no servidor), com mensagem
  **verdadeira**. Hoje um knockout sem análise faz a EF dizer «pertencem a vagas diferentes».
  - «Encerrada» é o predicado canônico `candidatura_encerrada` da Phase 48, sem critério novo.
  - Retirada a pedido **não** é encerrada por esse predicado, por desenho, e segue selecionável.
- **D-35:** **Trava no banco e no e-mail.**
  - O trigger `avancar_etapa` recusa mover uma candidatura **encerrada**, exceto a reabertura
    sancionada do D-01 e as transições terminais que o próprio sistema grava (decisão,
    rejeição, knockout).
  - O `notificar-candidato` recusa o evento `avanco` para candidatura encerrada. Hoje a guarda de
    knockout só cobre `confirmacao`.
  - Motivo: só isso fecha o caso medido. Knockout (`inscricao`/`rejeitado`) → «Avançar» →
    `avaliacao_assincrona` é avanço **aceito**, grava histórico e dispara e-mail de avanço.
  - Não é portão de evidência: D8 intacto.
  - **Reversibility:** costly. Trigger central do funil, e toda escrita de etapa passa por ele.
- **D-36:** O «Avançar» do comparativo leva à **próxima etapa real** de cada candidato, pelo mesmo
  caminho do hub. Hoje grava sempre `avaliacao_assincrona`.
- **D-36b:** O comparativo da tela de decisão final passa a comparar quem está em
  **`etapa_atual='decisao_final'` e não encerrada**. Hoje compara quem tem linha em `decisao_final`,
  quase todos já encerrados. O texto «em decisão final» da tela passa a ser verdade.

**Transcrição e análises de entrevista (JORN-12)**

- **D-37:** Alcance da D4 nesta fase: **só a análise da entrevista** (`entrevista_analises`). A
  análise da triagem (`analise_candidato_vaga`, sobrescrita ao reprocessar) fica registrada para
  depois (§Deferred).
- **D-38 (LGPD):** **Hash + vínculo com o log.** A análise guarda o **hash** do texto analisado e o
  **id da linha** do `ai_call_logs` que o contém. **Nenhuma coluna de conteúdo nova.**
  - O texto mascarado segue onde já está (`ai_call_logs.user_prompt_template`, só admin, 180 dias).
  - Fato que pesou: esse texto **já existe** no banco, com nomes e fala literais, e sem vínculo.
  - Consequência aceita: depois de 180 dias o vínculo aponta para o vazio, e o RH não lê o texto.
  - **Reversibility:** reversible. Guardar o texto depois é aditivo; o hash não impede.
- **D-39:** **Vigente = a mais recente bem-sucedida, dentro da mesma entrevista (tipo).**
  - Análise que falhou (competências nulas, injeção) **nunca** é vigente.
  - As anteriores ficam **marcadas como superadas**, não apagadas, e acessíveis (D4).
  - O **portão de avanço** (`avancar_etapa`, bandeira de linguagem) e a **revisão humana**
    (`salvar_avaliacao_entrevista`, `confirmar_revisao_entrevista`) olham **só a vigente**.
  - Hoje eles discordam: o portão olha **todas**, e uma bandeira antiga escondida bloqueia o avanço.
- **D-40:** **Reanalisar o mesmo texto (cache) não cria linha.** Devolve a existente; só texto
  diferente gera análise nova.
- **D-41:** **O RH escolhe o tipo (online/presencial)** na aba da transcrição, com a etapa atual
  como padrão. É o mesmo seletor da aba do guia. É isso que liga a análise à entrevista.
- **D-42:** **Análise nova depois de revisão humana volta a aguardar revisão** antes de pesar
  (RNF-07a). A revisão anterior continua **visível** na análise superada, com quem revisou e quando.
  Hoje ela some: o upsert zera o score e descarta `scores_humanos`.
- **D-43:** As **6 análises existentes** (3 candidaturas, todas de teste) são **marcadas**
  retroativamente: vigente/superada. É escrita aditiva só de marcação, com contagem antes/depois.
  Hash e vínculo ficam nulos onde não der para reconstruir.

**Trilha da decisão (JORN-17, JORN-3b, JORN-37)**

- **D-44:** **Snapshot = qualquer mudança real, menos leitura e telemetria.**
  - `trg_decisao_final_snapshot` arquiva quando muda qualquer coluna, **exceto**
    `explicacao_solicitada_em` (carimbo de leitura) e `alerta_prazo_enviado_em` (telemetria).
  - **UPDATE que não muda nada nunca arquiva.**
  - Continuam arquivando: decisão, ciclo de revisão, reabertura e o tombstone do motor de
    exclusão. Os testes da Phase 48 e a ordem snapshot→scrub do `anonimizar_candidato` dependem
    disso.
  - **Reversibility:** reversible.
- **D-45:** Os **5 snapshots sem mudança** que já existem (todos de teste) **ficam**. O arquivo só
  aceita acréscimo (ERASE-08) e vai na cópia do titular.
- **D-46:** As **9 candidaturas com `etapa_justificativa` grudada** (8 de teste, 1 real com 5
  caracteres) são **limpas**.
  - É UPDATE retroativo com **checkpoint** e contagem antes/depois.
  - As 9 batem md5 com o `criterio_texto` mais recente do histórico, então nada se perde.
  - A cópia do titular passa a mostrar a coluna vazia; o texto segue no histórico.
  - **Reversibility:** reversible. O valor está no histórico, byte a byte.
- **D-47 (LGPD, JORN-37):** **BD-9 mantido: a trilha deixa de copiar a justificativa da decisão
  final.**
  - `registrar_decisao` para de escrever o texto da decisão em `etapa_justificativa` (e, por
    consequência, em `historico_candidatura.criterio_texto`).
  - O histórico registra que houve a decisão, não o texto.
  - **As 4 cópias que já estão no histórico** (3 de teste, 1 de conta real, candidatura
    `d31c78bb`) **são limpas**, com checkpoint, contagem e aprovação do operador no momento.
  - O texto continua em `decisao_final.justificativa`, que é a fonte.
  - **Reversibility:** costly. Edita a trilha de auditoria; o texto é recuperável da fonte.

**Recibo × motor de exclusão (JORN-36)**

- **D-48:** **O motor passa a apagar o que o recibo promete.** O recibo, item
  `respostas_e_producoes` de `docs/compliance/sql/gen-recibo-exclusao.cjs`, diz no passado que
  transcrições, textos e respostas «foram apagados».
  - `anonimizar_candidato` hoje **não toca** em `redacoes_candidato.texto`,
    `entrevista_analises.citacoes`, `respostas_*`, `scores_candidato.citacoes`,
    `devolutivas_candidato.conteudo_jsonb` **nem** em `ai_call_logs.user_prompt_template`.
  - O motor ganha o passo que falta, e o recibo fica verdadeiro.
  - Medido: a única exclusão concluída (22/08) era de titular **sem** esses dados. O recibo ainda
    não mentiu para ninguém, mas mentiria.
  - **Mecanismo destrutivo:** apply com portão, prova em conta de teste e o
    `p45_motor_exclusao_smoke.sql` ampliado para cada coluna nova do passo.
  - **Reversibility:** one-way. Cada exclusão executada pelo passo novo é irreversível por
    desenho, e o recibo afirma isso ao titular.

**Achados da mesma classe que entram (decisão do operador: todos)**

JORN-32, 33, 34, 35, 38, 39 entram com o conserto óbvio de cada um. A forma exata fica em Claude's
Discretion, com as restrições abaixo.

### Decisões do portão (operador, 2026-09-22, sobre o `49-RESEARCH.md`)

> Tomadas depois da pesquisa, sobre os fatos que ela mediu (§«Correções de fato» e §«Portão antes do
> plano» do RESEARCH). Mesma autoridade das D-24..D-48: nenhum plano as reinterpreta.

- **D-59 (D-29 fechado):** teto do comparativo = **4 candidatos**, `max_tokens = 3600` no
  `prompt_versions` de `comparative_ranking` (UPDATE na própria linha, com guarda de valor esperado;
  sem versão nova de prompt).
  - Conta: pior throughput medido 45 tok/s × 80 s = 3600 tok; saída conservadora de 4 candidatos
    ≈ 3140 tok (87 %).
  - Uma constante única (`COMPARATIVO_MAX_CANDIDATOS`) alimenta a EF, o schema de saída e o front.
  - **Prova:** um comparativo real de 4 candidatos de teste depois do deploy. Se passar de 3140 tok
    de saída, o teto volta ao operador antes de fechar a fase.
  - **Reversibility:** reversible.
- **D-60 (Portão item 3):** `decisao_final.revisao_resultado` e a cópia em `decisao_final_historico`
  **entram no D-48**. Recebem sentinela nos mesmos dois UPDATEs do passo `tombstone_decisao_final`,
  na ordem snapshot → raspagem. O recibo passa a tratá-lo como trata a justificativa, e o
  `plano_exclusao_titular` passa a contá-lo.
- **D-61 (Portão item 4):** `ai_call_logs.user_prompt_template` é reclassificado de «preservar» para
  **«apagar» (regra R5)** no `pii-inventory.yaml`, com a nota medida do RESEARCH. No recibo, a coluna
  sai de `conteudo_do_produto` e vira origem de `dados_enviados_a_analise_automatica`, que é o que esse
  item já promete. A nota de `raw_response` é corrigida: ela guarda a **saída** do modelo, não o input.
- **D-62 (decisão nova A):** o passo novo do motor **apaga as linhas** do titular excluído em
  `respostas_raven`, `respostas_bigfive`, `respostas_disc` e `respostas_formulario`. Os valores
  inteiros e de enum não aceitam sentinela.
  - É a **exceção explícita** do operador à regra «nenhuma escrita desta fase apaga linha» (D-54). Vale
    **só** para este passo do motor e só para essas quatro tabelas.
  - Os scores já calculados (`scores_raven`, `scores_candidato`) ficam.
  - Colunas `text`/`jsonb` (`redacoes_candidato.texto`, `respostas_cultura.resposta_texto`,
    `respostas_avaliacao.respostas`, `cognitivo_respostas.*` etc.) recebem sentinela e continuam
    sem apagar linha.
  - **Reversibility:** one-way a cada execução. A primeira execução real continua sendo checkpoint (D-54).
- **D-63 (decisão nova B):** nas linhas `call_type='comparative_ranking'` do `ai_call_logs` que citam
  uma candidatura do titular excluído, o passo novo põe sentinela no `user_prompt_template` e no
  `raw_response` **inteiros**. Isso perde a telemetria dos outros titulares daquela chamada; o
  resultado continua em `comparativo_solicitado`. O corte só do bloco do titular foi rejeitado por
  depender do formato do texto.
- **Consequência direta do D-48, não é escolha nova:** os trechos literais em
  `redacoes_candidato.analise_ia.dimension_scores[].cited_evidence` e em
  `scores_candidato.metadata.dimension_scores[].cited_evidence` (SJT) entram no passo novo. O D-48
  manda o motor apagar o que o recibo promete, e o recibo promete que os textos do titular foram apagados.
- **D-64 (D-33/JORN-40):** a faixa cognitiva nas telas do RH (card da lista **e** hub) é o
  vocabulário `cognitivoBanda`, o mesmo que o ScoreCard já usa. O «Acertos X de 60» do
  `LiberacaoCognitivoBlock` **sai junto** com o percentil.
- **D-65:** a nota de entrevista em `scores_candidato` continua **uma linha só** para online e
  presencial. Isso é coerente com o D-42: a análise nova volta a aguardar revisão, e a revisão anterior
  fica visível na análise superada. Uma linha por tipo vai para §Deferred.
- **D-66:** a classificação «sem PII do titular» de `analise_candidato_vaga` e `entrevista_guias` no
  recibo é **corrigida** no checklist D-57 desta fase. Medido: 13/24 análises e 2/5 guias contêm o
  nome do titular. Desidentificar `resumo_cv`/guia no motor vai para §Deferred.
- **D-67 (JORN-34):** a transição `aprovado_proxima → finalizado` do `UpdateStatusModal`, que encerra
  por status sem histórico, entra no conserto do JORN-34, pela mesma `VALID_TRANSITIONS`.
- **D-68:** a SJT (`scores_candidato tipo='sjt'`, EF `avaliar-redacao`) ganha proveniência (provedor e
  modelo reais) **na `metadata`**, sem coluna nova e sem checklist D-57.
- **Não entra:** baixar o `max_tokens` do `interview_guide` (a única chamada Sonnet desde 06/09 usou
  98,4 s dos 110 s). É P1. O JORN-28 já torna a falha visível como timeout, e o risco fica registrado
  no artefato D-50 e em §Deferred.

### Restrições de execução — NÃO negociáveis (operador, kickoff)

- **D-49: Espere a pesquisa desmentir a fila, e desmentir este CONTEXT.** No Bloco 1 a pesquisa
  corrigiu 4 premissas por medição em PROD; neste kickoff a medição já corrigiu mais de 30 (§Correções).
  A pesquisa **mede de novo** o que for load-bearing para o plano, em vez de copiar daqui. Toda
  correção nova vai para uma seção **«Correções de fato»** do `49-RESEARCH.md` e **volta ao operador
  antes do plano** (§Portão antes do plano).
- **D-50: Varra pela forma antes de consertar cada defeito** (`CLAUDE.md` §«Portões»). Cada item tem
  uma classe (tabela §Integração), e a varredura dela sai como **artefato** com:
  - o padrão de busca, para poder ser re-rodado;
  - cada ocorrência classificada como *defeito* ou *escopo deliberado*;
  - a cobertura de `src/`, `supabase/functions/` **e das definições VIVAS** do banco
    (`pg_get_functiondef` / migration mais recente do objeto).

  As varreduras do kickoff (§Correções) são o ponto de partida, não a varredura final.
- **D-51: Confira no banco, nunca só na tela.** Todo critério de aceite de comportamento em PROD é
  uma consulta com resultado esperado.
- **D-52: Via do projeto.**
  - Migrations por `node p46apply.cjs migrate`: SQL lido do arquivo, ledger na mesma requisição, md5
    conferido.
  - Edge Functions por `node efdeploy.cjs <slug>`: conferir o fechamento de imports com
    `--dry-run`, porque o cabeçalho do script afirma uma checagem que não existe
    (deferred-items da 48).
  - **Depois de todo apply com efeito visível: `git log --oneline origin/main..HEAD` sai vazio.** A
    Vercel publica do `main`.
  - Para conferir marcador no ar, procurar no **chunk certo**: `/rh/*` e `/admin/*` são lazy.
  - Nunca SQL Editor nem `apply_migration` do MCP.
- **D-53: `tsc` não sobe acima de 90.** Todo plano que toca TS roda `npm run lint` e reprova acima de
  90.
- **D-54: Portão de escrita em PROD** (divisão do operador, memória «aditivo autônomo, destrutivo
  com portão»).
  - **Sem pausa**, reportando cada apply: aditivo e corretivo. Isso cobre CREATE, ADD COLUMN,
    CREATE OR REPLACE, deploy de EF e smoke.
  - **Checkpoint com contagem antes/depois:** UPDATE/DELETE retroativo sobre linha existente.
    Nesta fase: D-43 (marcar 6), D-46 (limpar 9) e D-47 (limpar 4 do histórico).
  - **Checkpoint:** a primeira execução real do passo novo do motor (D-48), e qualquer e-mail a
    candidato real fora do fluxo normal.
  - **Apagar linha exige decisão explícita do operador.** Nenhuma escrita desta fase apaga linha.
- **D-55: Sequência obrigatória tem dono.** Antes de todo deploy com sequência
  `migration → EF → cliente`, o passo seguinte pertence a um plano desta fase. Colunas novas de
  resultado (D-28) e de análise (D-38/D-39/D-41) quebram o cliente e as EFs se chegarem fora de
  ordem.
- **D-56: Portões são código** (D-17 da 48; `CLAUDE.md`). Antes de acrescentar objeto que um smoke
  vigia, e **antes de mudar comportamento que um smoke assere**, faça as duas coisas:
  - rode a varredura (282 linhas hoje) e classifique cada achado tocado;
  - depois do conserto, **prove que o portão ainda morde**.

  Já identificados:
  - `p48_rejeicao_triagem_smoke.sql:239,245` (o 245 reprova com D-46/17; o 239 vira vazio);
  - `p48_reabertura_smoke.sql` (a)(g)(h) e `p48_prova_prod.sql:89-96,201-209` (dependem de
    snapshot no ciclo — D-44 tem de preservá-los);
  - `oper31_rejeitar_candidatura_smokes.sql:162-183` (a regra de regressão; D-35 mexe no mesmo
    trigger);
  - `ai-client.test.ts:289-298,306-338,437-453,460-479,646` (asserem o fallback e o `error_code`
    de hoje);
  - `RedacaoOverrideForm.test.tsx:35-38` (trava os rótulos errados);
  - `ScoreCard.test.tsx`, `ComparativoScreen.test.tsx:121`, `TriagemTable.test.tsx:~188` (a
    invariante da Phase 45: retirada segue visível);
  - `comparativo-candidatos/__tests__/index.test.ts:191-259`.
- **D-57: Coluna nova = checklist LGPD completo** (precedente 48-17). Vale para toda coluna nova em
  tabela inventariada: proveniência (D-28), hash/vínculo/vigente/tipo/autor (D-38..D-41) e
  qualquer marca.
  1. `p46apply`.
  2. `db:types` com `< /dev/null` (memória: sem isso pendura e trunca).
  3. `meta.acrescimos` em `catalogo-vivo-44.json`.
  4. Veredito em `export-scope-rules.yaml`.
  5. Classificação em `pii-inventory.yaml` e regeneração do `.md`.
  6. Linha ou razão em `gen-recibo-exclusao.cjs`, e regeneração do recibo e dos dois espelhos TS.
  7. Regeneração de `export-allowlist.json` e `_shared/exportAllowlist.ts`, com bump da versão
     (hoje 1.2.0).
  8. Os dois blocos VALUES do `05-export-allowlist-drift.sql` e os snapshots inline de
     `exportAllowlist.test.ts`.
  9. Os quatro `check:`.
  10. Redeploy de `exportar-meus-dados` e `executar-direito-titular`.

  UUID de funcionário segue o precedente `revisada_por`: fora do export, «dado_de_funcionario» no
  recibo.
- **D-58: Linguagem de produto.**
  - «avaliação comportamental/cognitiva», nunca «teste psicológico» (exceção D já decidida acima).
  - O sistema nunca rejeita por score (RNF-07a).
  - Todo texto novo passa pelo guard `forbidden-strings.grep.test.ts`.
  - Nenhuma ocorrência literal nova do canal de privacidade (D-07).

### Claude's Discretion

**JORN-07**
- Onde a rubrica mora. Pode ser um bloco injetado pela EF a partir de uma constante versionada no
  repo; o prompt já diz «use as âncoras BARS fornecidas no input», e é o padrão de
  `avaliar-transcricao-entrevista/_local/bars-rubric.ts`. Pode ser também uma versão nova de
  prompt, ou os dois.
  - Se houver versão nova: `prompt_versions` é **imutável por trigger** (texto novo = linha nova
    via migration + promote).
  - `unique_active_per_type` **não** é índice único, e `loadPrompt` usa `maybeSingle`: duas ativas
    quebram o carregamento.
  - `SCHEMA_VERSIONS`/`schema_version_required` andam juntos se o schema mudar.
- Se entram as redações-exemplo (few-shot) de `exemplos-respostas-bars.md`. Custa tokens.
- Onde a verificação de `dimension_name` mora: literal por chave no schema (bump), checagem depois
  do parse, ou ambos.
  - **Obrigatório:** um teste que reprova se a rubrica enviada e os rótulos da tela divergirem, e
    um que reprova se o nome devolvido não bater com a chave.
  - Qualquer schema novo segue compatível com os dois SDKs (`structured-output-compat.test.ts`).
- Registrar a versão da rubrica na linha do resultado. **Obrigatório por D-26**: é como a tela
  distingue as antigas.
- A colisão de códigos: `perguntas_redacao` usa D1/D2/D3 como código de pergunta dentro do mesmo
  bloco injetado.

**JORN-28**
- A taxonomia exata do `error_code` (no mínimo: truncamento / timeout / schema / 5xx-overload /
  circuito aberto) e como detectar truncamento.
  - `stop_reason === 'max_tokens'` via `messages.create`, ou reconhecimento da mensagem do parser.
  - O `parse()` do SDK lança antes de devolver `stop_reason`/`usage`.
- O significado de `success` numa linha de fallback. Ele afeta o `error_count` do
  `ai_cost_daily`, o teto de custo AI-06 (que soma só `success=true`) e a elegibilidade do replay.
- Gravar a tentativa Anthropic truncada, que foi cobrada (≈ US$ 0,058) e hoje não aparece em
  lugar nenhum.
- Se falha de tamanho de saída conta para o circuit breaker.
- **Obrigatório:**
  - O replay de idempotência **não pode esconder** que o resultado veio de fallback (ele replaya
    linhas `success=true` de fallback hoje).
  - O fallback **respeita** `max_tokens`/`temperature` configurados (hoje ignora, `ai-client.ts:742-749`).
- **Varredura D-50 obrigatória:** `max_tokens` × saída real de **todos** os `call_type`. A classe
  «não coube» já tinha sido achada em 05–06/09 e a varredura parou antes de `comparative_ranking`
  (3000), `work_sample_sjt` (3000) e `culture_fit_essay` (2500).

**JORN-13**
- A consulta da lista. Um embed de `scores_candidato` filtrado por `tipo` basta, sem N+1; existe
  `idx_scores_candidatura`.
  - A aba «Por Vaga» (`candidaturasService.ts:676-706`) hoje nem busca notas e passa a ler a mesma
    fonte.
  - Tirar os embeds mortos (`scores_bigfive`, `scores_disc`) e o `analise_ia_cultura`.
  - A cor verde/vermelha não se aplica a Big Five.

**JORN-25**
- O desenho exato da exceção da trava (D-35) para as transições sancionadas: reabertura D-01,
  `registrar_decisao`, `rejeitar_candidatura`, knockout. Ler cada uma no vivo.
- **Obrigatório, achado na varredura (mesma classe do 7, «rotular por posição»):**
  - Hoje a tela resolve `C{n}` → nome pela **posição** na lista selecionada.
  - A EF ordena por `score_match` e o painel ordena sem desempate (`triagemService.ts:211`). A
    tela da decisão nem resolve nomes (`DecisaoFinalPage.tsx:67-78`).
  - A EF passa a devolver o `candidatura_id` de cada posição, e a tela rotula por ele.
  - Com empate de `score_match`, o ranking pode hoje mostrar o nome errado.

**JORN-12**
- Como o hash é calculado: sobre o texto mascarado ou o original, e com qual normalização. Um hash
  sobre o texto mascarado muda se o código da máscara mudar.
- Como o vínculo com o log é gravado.
- **Obrigatório:**
  - Os INSERTs da EF de transcrição passam a checar erro. Hoje uma escrita falha devolve `{ok:true}`.
  - A linha de falha (competências nulas) nunca desloca a vigente.

**JORN-3b**
- O mecanismo de D-44: cláusula `WHEN` comparando OLD/NEW sem as colunas excluídas, guarda dentro
  da função, ou os dois. Também tornar o carimbo idempotente
  (`WHERE explicacao_solicitada_em IS NULL`).
- **Obrigatório:** a cópia usa lista explícita de colunas, e coluna nova em `decisao_final` some
  do arquivo **sem erro**. Um teste reprova quando `decisao_final` e `decisao_final_historico`
  divergirem de colunas.

**JORN-17**
- Onde limpar: `NEW.etapa_justificativa := NULL` depois do INSERT no histórico, na mesma função
  BEFORE (`avancar_etapa`, última definição `20260712110001`).
  - Medido: o portão (L17-20) e a cópia (L40-47) estão na mesma função, e nenhum trigger posterior
    lê a coluna.
  - Conferir que nenhuma transição sancionada depende de o valor sobreviver ao UPDATE.

**JORN-32..35, 38, 39**
- A forma de cada um:
  - 32: comparar a vaga das análises com `body.vaga_id`;
  - 33: o selo usa o predicado canônico;
  - 34: status de encerrada só pelo caminho auditado, ou recusado;
  - 35: injetar `perguntas.rubric` e aplicar pesos pela chave, não pelo nome devolvido;
  - 38: allowlist de colunas no select;
  - 39: um valor válido no enum, ou `provider` nulo com `error_code`, e o erro deixa de ser
    engolido pelo `audit-logger.ts:179-185`.

**Geral**
- Granularidade dos planos, waves e ordem, respeitando §Integração e D-55.

</decisions>

<gate_before_plan>
## Portão antes do plano

> **Fechado em 2026-09-22.** Os quatro itens foram levados ao operador junto com as decisões novas que
> a pesquisa criou. Resultado: D-59..D-68 (§«Decisões do portão»). As 35 correções de fato estão no
> `49-RESEARCH.md` §«Correções de fato».

O fluxo é: pesquisa → **operador** → plano. O `/gsd-plan-phase 49` **não** segue direto da pesquisa
para o planejamento enquanto houver item aberto abaixo.

1. **Correções de fato da pesquisa** (D-49): tudo que a pesquisa medir em contradição com este
   CONTEXT ou com a fila.
2. **O teto de candidatos do comparativo** (D-29): o número proposto, com a medição que o sustenta.
3. **`revisao_resultado` no motor de exclusão.** Item aberto em `48/deferred-items.md`:
   `anonimizar_candidato` não desidentifica `decisao_final.revisao_resultado` nem a cópia em
   `decisao_final_historico`. O D-48 mexe no **mesmo** motor. Decidir se entra junto; o operador
   não foi perguntado.
4. **Janela de exposição do `ai_call_logs.user_prompt_template`.** Com D-38, esse log vira a fonte
   da análise por 180 dias. O inventário o classifica «preservar», numa classificação de
   2026-07-29 feita quando a tabela tinha 0 linhas. O D-48 passa a apagá-lo na exclusão. Confirmar
   com o operador a reclassificação no inventário.

</gate_before_plan>

<corrections>
## Correções de fato medidas no kickoff (2026-09-22, só leitura)

Registradas porque a fila e a seção da Phase 49 no ROADMAP afirmavam o contrário. Todas saíram
de consultas `set transaction read only` em PROD e da leitura das definições vivas. A pesquisa
refaz as que forem load-bearing para o plano (D-49), em vez de copiar daqui.

| Item | A fila dizia | Medido | Consequência |
|---|---|---|---|
| 28 | `interview_guide` e `cv_job_match` «também já caíram» | Os 16 fallbacks são de 05–06/09, nenhum depois; `cv_job_match` teve 25 sucessos Sonnet desde então | Só o `comparative_ranking` é exposição viva (1, em 20/09) |
| 28 | Subir `max_tokens` 3000 → ~8000 | Sonnet 45–59 tok/s em PROD → 8000 tok = 135–178 s > timeout 110 s. Já aconteceu com o `interview_guide` em 06/09 | D-29 (teto de candidatos) |
| 28 | Dois casos sob `anthropic_retries_exhausted` | **Três:** timeout ×6, truncamento ×4, Zod `too_big` ×5. Parse/schema **não** é retryable (`ai-client.ts:288-302`): não há retry | Taxonomia de `error_code` |
| 28 | — | Nenhuma tabela de resultado guarda o modelo real; `redacoes_candidato.model_version` grava o **configurado** (`avaliar-redacao-cultural/index.ts:304,364`); `devolutivas_candidato.modelo_ia` é literal; replay serve fallback; tentativa truncada cobrada e não logada; fallback ignora `max_tokens`/`temperature`; modelo de fallback hardcoded (`ai-client.ts:61`) | D-27, D-28 |
| 28 | «6 candidatos reais» | 3 fixtures + 3 contas `+claude` | Nenhuma pessoa real ranqueada pelo fallback |
| 13 | Card da Marina | **Os 38 cards** (linhas agora `CandidatosRHPage.tsx:352-355`) | — |
| 13 | Ler a fonte certa | Não existe número de Big Five (`score` NULL; dados em `metadata.dimensoes`); UX-07/RNF-07a proíbe número | D-31 |
| 13 | Cultura em `redacoes_candidato` | A canônica é `scores_candidato tipo='redacao'`, pós-revisão | D-32 |
| 13 | `scores_raven` morta | 1 linha (Raven liberado nominalmente); DISC não existe no produto; aba «Por Vaga» não busca notas | D-33 |
| 7 | Escrever os **4 valores** como D1–D4 e travar por teste | Rubrica canônica = BARS do PRD (D1 Especificidade … D4 Alinhamento); o mapeamento «4 valores» é da Phase 13, contra o PRD; o cap D1≤2 assume o PRD | D-24 |
| 7 | O prompt não define as dimensões | Confirmado, e pior: o prompt manda «usar as âncoras fornecidas no input», o `user_template` com `{{BARS_RUBRIC_DIMENSIONS}}` **nunca é enviado** (`ai-client.ts:137-153`, `:629-637`), a EF só injeta a pergunta; âncoras e few-shot **já existem** | Conserto na EF possível sem nova versão |
| 7 | O RH lê «UAU 5/5» sobre um raciocínio de cuidado | O RH **não vê raciocínio nenhum**: a tela lê chaves inexistentes. Nomes inventados instáveis (2 redações, 2 conjuntos) | D-25 |
| 7 | — | Mesmo defeito no SJT: `perguntas.rubric` nunca enviado; pesos por nome devolvido (`avaliar-redacao/index.ts:131`) viram uniformes | JORN-35 |
| 25 | 2 encerradas | **3** de 6 (1 aprovada/finalizada) | — |
| 25 | Botão «Avançar» enganoso | **Aceito pelo banco no knockout:** `avancar_etapa` não tem guarda de encerrada; `inscricao → avaliacao_assincrona` é avanço; grava histórico; `trg_notif_transicao` dispara `avanco`; a guarda de knockout do `notificar-candidato` só cobre `confirmacao` (`index.ts:289`). Em rejeitado/aprovado a recusa é acidental. 0 casos hoje | D-35 |
| 25 | Filtrar pelo predicado | A varredura da 48 não via: `handleAvancar` não lê estado. Há **dois** comparativos (vaga; decisão final, cuja população «já tem decisão» é quase toda encerrada) | D-34, D-36b |
| 25 | — | IDOR na EF (`comparativo-candidatos/index.ts:180-213`); rotular por posição; mensagem falsa «vagas diferentes» para knockout sem análise | JORN-32, Discretion |
| 12 | Transcrição não existe no banco | **Existe:** mascarada em `ai_call_logs.user_prompt_template` (180 d, só admin); `maskPII` tira identificadores estruturados, nomes e fala ficam literais | D-38 |
| 12 | `entrevistas_online/_presenciais` vazias | 5 linhas de seed de 2025-11, `transcricao` NULL, nenhum código escreve | Tabelas sem uso, não vazias |
| 12 | Cache por `input_hash`; leitura em `entrevistaService.ts:401` | Cache por `idempotency_key {candidatura}:transcript:{fp}` (`ai-client.ts:347-415,523-529`); a leitura é `getAnalise`, `:457-488` | — |
| 12 | «Sem dono» | Quatro lacunas: entrevista (tipo), autor, vigente, fonte. Leitores discordam (tela e revisão pegam a mais nova; o portão de avanço olha todas); falha grava linha que vira «a mais nova»; reanálise após revisão zera a nota consolidada | D-39..D-42 |
| 12 | — | **Recibo de exclusão afirma apagamento que o motor não faz** | JORN-36, D-48 |
| 17 | «O próximo Avançar, em uso normal, herda o texto» | **Refutado para a UI**: `updateCandidaturaEtapa` manda `etapa_justificativa` sempre (`triagemService.ts:446-458`); herda só por SQL ou UPDATE direto via PostgREST (policy `rh_avanca_etapa`). 1 herança em PROD: o reset manual | O portão desarmado vale por esse caminho; conserto segue obrigatório |
| 17 | Cópia em trigger AFTER | Portão e cópia na **mesma** função BEFORE; as linhas citadas na fila são comentários | Conserto trivial |
| 17 | — | `decisao_final.justificativa` fora do export (BD-9), mas copiada para duas colunas exportadas; 4 de 7 decisões chegam ao titular | JORN-37, D-47 |
| 3b | 5 snapshots da Marina | Apagados no reset da Etapa 9. Hoje: 11 snapshots, 3 candidaturas, todas de teste; 5 sem mudança (não de recarga) | D-45 |
| 3b | «O trigger dispara em todo UPDATE» | Confirmado e mais largo: `stamp_explicacao_acessada` faz UPDATE sem filtro `IS NULL`; qualquer UPDATE sem mudança arquiva; lista explícita de colunas descarta coluna nova em silêncio | D-44 |

</corrections>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Origem e decisões
- `.planning/JORNADA-GUIADA.md` — §«FILA DE CONSERTOS» → «BLOCO 2»; §«DECISÕES TOMADAS» (D1–D8); tabela «Defeitos — acumulado» (prova de cada defeito); seções dos Defeitos 7 (~l.635), 12 (~l.1029, 1087), 13 (~l.1095), 14 (~l.1162), 17 (~l.1341, 1488), 3b (~l.1378), 25 (~l.1827), 28 (~l.2028). ⚠ Regra 5 do arquivo: feche-o no editor antes de escrever nele (format-on-save já o corrompeu duas vezes).
- `.planning/phases/48-consertos-da-jornada-bloco-1/48-CONTEXT.md` — D-01..D-23; §Integração.
- `.planning/phases/48-consertos-da-jornada-bloco-1/48-VERIFICATION.md` — o que a 48 entregou; D-23 e a nuance de dono da vaga.
- `.planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md` — `revisao_resultado` fora do motor (Portão item 3); drift de export pré-existente; `efdeploy.cjs` sem a checagem que anuncia.
- `.planning/phases/48-consertos-da-jornada-bloco-1/48-VARREDURA-ETAPA-ATUAL.md` e `48-VARREDURA-PORTOES.md` — formato de artefato de varredura (D-50).
- `CLAUDE.md` — §«Via de apply ATUAL», §«Portões: varra pela FORMA», Security Rules.

### Rubrica (JORN-07, JORN-35)
- `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md` — fonte binding da rubrica e do schema (§8.4).
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` — RF-17.
- `docs/conhecimento/fit-cultural/bars-redacao-4-dimensoes.md` v1.1 — âncoras 1–5, caps, marcadores por valor.
- `docs/conhecimento/fit-cultural/exemplos-respostas-bars.md` — few-shot L1/L3/L5.
- `docs/conhecimento/fit-cultural/valores-beauty-smile-resumo.md` — sinais por valor (sem âncoras 1–5).
- `docs/conhecimento/prompts/templates/06-culture-fit-essay.md` — o prompt ativo (md5 = PROD).
- `docs/prds/m2-funil-rh/PRD-sjt-work-sample-odontologia.md` — rubrica do SJT (JORN-35).

### LGPD (JORN-12, 36, 37, 38 e toda coluna nova)
- `docs/compliance/export-scope-rules.yaml`, `pii-inventory.yaml`/`.md`, `export-allowlist.json`, `catalogo-vivo-44.json`, `matriz-retencao.yaml`, `recibo-exclusao.json`.
- `docs/compliance/sql/gen-recibo-exclusao.cjs` — item `respostas_e_producoes` (JORN-36).
- `docs/compliance/sql/05-export-allowlist-drift.sql`.
- `.planning/phases/48-consertos-da-jornada-bloco-1/48-17-*` — precedente do checklist de coluna nova (D-57).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Predicado canônico** `public.candidatura_encerrada(...)` (`supabase/migrations/20260921000001_p48_candidatura_encerrada.sql`; IMMUTABLE, EXECUTE para `authenticated`/`service_role`) e espelho TS `src/lib/candidatura/candidaturaEncerrada.ts`. Hoje usado em `varrer_prazos_reabertura`, `registrar_pedido_exclusao`, `retirar_candidatura`, `rejeitar_candidatura`, `funil_kpis`, `v_fila_trabalho`, `CandidatosRHPage`, `HubCandidatoRH`, `DashboardCandidatoPage`, `entrevistaService`, `notificar-*`. **Não** em `avancar_etapa`, `registrar_decisao`, `reprocessar_analise`, `ComparativoCandidatosPage`, `KanbanBoard`, `listFinalistas`.
- **Rubrica injetada por EF:** `supabase/functions/avaliar-transcricao-entrevista/_local/bars-rubric.ts` + `bars-rubric.test.ts` (conserto de 09-06, mesmo padrão para D-24).
- **Big Five / bandas:** `src/features/avaliacao/components/ScorecardAvaliacao.tsx:230-275` (rótulos de faixa, regra UX-07); `src/features/avaliacao/services/scoresRhService.ts` (allowlist de colunas, tipo `BigFiveMetadata`).
- **Nota de redação canônica:** `sincronizar_score_redacao` (`20260906000005`) → `scores_candidato tipo='redacao'`; `redacao_score_0_100` prefere `scores_humanos`.
- **Guards de texto:** `src/__tests__/guards/*.grep.test.ts`, `forbidden-strings.grep.test.ts`.

### Established Patterns
- Escrita privilegiada só por RPC `SECURITY DEFINER` ou EF; `decisao_final` não tem policy de UPDATE para clientes.
- `callAi` (`supabase/functions/_shared/ai-client.ts`): modelo/`max_tokens` do `prompt_versions` via `loadPrompt`; timeout por EF (110 s); tentativas = `floor(140000/110000)` = 1; retry só 429/503/529/timeout; todo o resto → `runOpenAIFallback` (`:688-706`), uma linha de log (`:773-795`).
- `trg_decisao_final_snapshot` AFTER UPDATE sem WHEN → `snapshot_decisao_final()` com lista explícita de colunas, guarda OLD.
- `avancar_etapa()` BEFORE UPDATE OF `etapa_atual`: retorna cedo se a etapa não muda (L11-13); portão de regressão (L17-20); guarda de bandeira de entrevista sobre **todas** as análises (L24-37); INSERT no histórico com `NEW.etapa_justificativa` (L40-47).
- EF testadas chamando `handler(req, deps)` direto: **não** exercitam o wiring do `Deno.serve`.
- `database.types.ts` só pelo CLI, com `< /dev/null` (memória).

### Integration Points
- **Card (13):** `src/components/pages/CandidatosRHPage.tsx:352-355` → `src/components/ScoreCard.tsx:90,135`; helpers `src/features/vagas/types/vagasTypes.ts:696,722`; consulta `src/features/vagas/services/candidaturasService.ts:551-580` (e `:676-706` «Por Vaga»). O mesmo select tem o `candidatos(*)` do JORN-38.
- **Redação (7):** `supabase/functions/avaliar-redacao-cultural/index.ts:244-247` (bloco injetado), `_local/compute-score.ts:56-61` (cap), `supabase/functions/_shared/essay-schemas.ts:19-20,43`, `src/features/triagem/components/RedacaoReviewPanel.tsx:47-52,62-63,93,105`, `RedacaoOverrideForm.tsx:45-50`, `RedacaoCorBadge.tsx:70`; `EntrevistaScorecardInline.tsx:29-34` usa os 4 valores como competências **de entrevista** (outro assunto, não mexer por engano).
- **Comparativo (25, 32):** `src/features/triagem/components/TriagemTable.tsx:241-275` (seleção), `src/components/pages/VagaCandidatosRHPage.tsx:121` (router state), `src/components/pages/ComparativoCandidatosPage.tsx:118-120` (`handleAvancar`), `src/features/triagem/components/ComparativoScreen.tsx`, `src/features/decisao/services/decisaoService.ts:215` (`listFinalistas`), `src/features/decisao/components/DecisaoFinalPage.tsx:67-78`, `supabase/functions/comparativo-candidatos/index.ts:169,180-213`.
- **Avanço e e-mail (25/D-35):** `avancar_etapa` (vivo; última migration `20260712110001`), `trg_notif_transicao`, `supabase/functions/notificar-candidato/index.ts:283-298`.
- **Kanban (33):** `src/components/KanbanBoard.tsx:97-116,192`. **UpdateStatusModal (34):** `src/components/modals/UpdateStatusModal.tsx:63,162-165` → `updateCandidaturaStatus` (`candidaturasService.ts:417-470`).
- **Transcrição (12):** `supabase/functions/avaliar-transcricao-entrevista/index.ts:266,299,309-325` (inserts e upsert de `scores_candidato`), schema `.strict {candidatura_id, transcricao}` (`entrevista-schemas.ts:60-65`), `src/features/entrevista/components/EntrevistaWorkspace.tsx:203-212` (aba sem seletor de tipo), `src/features/entrevista/services/entrevistaService.ts:405-410` (`getGuia`), `:457-488` (`getAnalise`); RPCs `salvar_avaliacao_entrevista`, `confirmar_revisao_entrevista`; `supabase/functions/consolidar-decisao-final/index.ts:133-137,400-405`.
- **Trilha (17, 3b, 37):** RPCs `registrar_decisao` (L122/L132 escrevem `etapa_justificativa`), `rejeitar_candidatura` (L60), `responder_revisao_decisao` (L105), `stamp_explicacao_acessada`, `solicitar_revisao_decisao`, `varrer_prazos_reabertura`; `src/features/explicacao/hooks/useExplicacao.ts:57-77` (guarda por `useRef`, reseta a cada recarga); `supabase/functions/_shared/exportAllowlist.ts:415,792`.
- **Motor (36):** `anonimizar_candidato` (vivo; hoje só UPDATEs em `candidatos`, `candidaturas`, `decisao_final`, `decisao_final_historico`, `ai_call_logs` (sem `user_prompt_template`), `candidate_ai_decisions`, `logs_acesso`, `recruiter_alerts`, `autorizacoes`, `historico_candidatura`, `preferencias_notificacoes`, `notificacoes_enviadas`); `supabase/functions/executar-direito-titular/index.ts`; `supabase/tests/p45_motor_exclusao_smoke.sql`.
- **Auditoria IA (39):** `supabase/functions/_shared/ai-client.ts:545,583` (`provider:"none"`), `supabase/functions/_shared/audit-logger.ts:179-185` (engole o erro); enum `llm_provider` = {anthropic, openai, google}.
- **Admin (28c):** `src/features/admin/ai-logs/components/AiLogsPage.tsx:221-241` (já mostra provider/model; badge «Sucesso»). A tela de custos e a navegação do admin são o Defeito 29, **Bloco 3**: fora.

</code_context>

<specifics>
## Specific Ideas

- **Prova em PROD com as contas da jornada** (Marina `+claude4`, `+claude5/6`, T1–T3, RH2/RH3), por consulta, como o `p48_prova_prod.sql`. Um `p49_prova_prod.sql` com uma linha `true/false` por critério é o formato que o operador já conhece.
- **Casos de prova que a medição já desenhou:**
  - 25/D-35: tentar avançar um knockout (conta de teste) → o banco recusa e nenhum `avanco` sai.
  - 3b: recarregar a explicação N vezes → 0 snapshot novo.
  - 12: colar texto A, texto B, texto A de novo → 2 análises, a vigente é a B, e A não cria linha.
  - 28: forçar truncamento (teto artificial em fixture) → `error_code` de truncamento, selo na tela, modelo real gravado.
  - 7: a redação devolve D1..D4 com os nomes da constante.
- **Não rodar** `p47_teardown_dados_de_teste.sql` (a trava de contagem recusa, e isso é o guard funcionando) nem o bloco `salvar_config_purga(... p_confirmo_live := true)` do `46-07-RUNBOOK-FLIP`.
- Os resets de conta de teste são escrita destrutiva em PROD: medir antes e depois, escopar ao `candidatura_id`, confirmar com o operador (regra 4 da JORNADA).

</specifics>

<integration>
## Integração — onde os consertos se tocam, e a classe de cada um (D-50)

| Conserto | Classe a varrer pela forma | Toca | Consequência para o plano |
|---|---|---|---|
| JORN-25 (D-35) trava em `avancar_etapa` | ação de RH oferecida/aceita sobre encerrada | JORN-17 e JORN-12 mexem na **mesma** função | Um plano só reescreve `avancar_etapa`, ou os planos se encadeiam com a definição viva lida no início de cada um. Três mudanças: trava de encerrada, limpeza da justificativa, bandeira só da vigente |
| JORN-25 exceção D-01 | — | reabertura da 48 (`responder_revisao_decisao`) | A regressão `rejeitado → decisao_final` da reabertura continua passando; provar com o `p48_reabertura_smoke` |
| JORN-17 limpar | carimbo herdado | JORN-37 (a trilha deixa de copiar a decisão) | `registrar_decisao` muda nos dois; a limpeza retroativa D-46 (9) e D-47 (4) vão juntas num checkpoint |
| JORN-3b | auditoria que dispara sem mudança | `anonimizar_candidato` (tombstone depende do snapshot), JORN-36 (mexe no motor) | A ordem snapshot→scrub do motor continua valendo; D-44 não pode suprimir o snapshot do tombstone |
| JORN-36 motor | promessa sem código | JORN-12/D-38 (o log vira fonte por 180 d), Portão item 3 (`revisao_resultado`) | O passo novo do motor apaga `user_prompt_template`; o inventário muda de «preservar» |
| JORN-28 colunas de proveniência | resultado sem modelo real | JORN-12 (colunas em `entrevista_analises`), JORN-07 (versão da rubrica em `redacoes_candidato`) | Um checklist D-57 por tabela, não um por coluna; export e recibo regenerados uma vez por onda |
| JORN-28 `error_code` | código genérico escondendo causa | JORN-39 (`audit-logger` engole erro) | Mesmo arquivo `_shared/ai-client.ts`; um deploy de EF por consumidor (`efdeploy.cjs`, 7 EFs) |
| JORN-07 rubrica | prompt que cita definição não enviada; rótulo por posição | JORN-35 (SJT), JORN-25 (C{n} por posição) | Mesma forma de conserto: a rubrica vai no input, o rótulo vem da chave |
| JORN-13 card | fonte morta vira 0 | JORN-38 (mesmo select), JORN-40 (mesma regra UX-07 no hub) | Um plano de front para a lista |
| JORN-25 comparativo | — | JORN-32 (mesma EF), JORN-28 (mesma EF: teto e proveniência) | Uma EF, uma onda de deploy |

</integration>

<deferred>
## Deferred Ideas

- **Do portão (2026-09-22):**
  - `interview_guide` perto do timeout (98,4 s de 110 s; `max_tokens=8000` excede o teto por tempo,
    ~4950): fica com a P1.
  - Nota de entrevista em uma linha por tipo (`subtipo = tipo`) em `scores_candidato`, com o impacto
    no `consolidar-decisao-final` (D-65).
  - O motor desidentificar `analise_candidato_vaga.resumo_cv` e `entrevista_guias.guia`, que contêm
    o nome do titular. A classificação é corrigida nesta fase (D-66); o apagamento é escopo novo.
- **Blocos 3 e 4** da fila, inteiros. Inclui o Defeito 29 (admin sem navegação, custos sem coluna de modelo), que o D-27(c) **não** conserta: o D-27 só muda a linha do log.
- **P1** — escolha do modelo das funções de IA. O modelo de fallback segue hardcoded (`ai-client.ts:61`), `prompt_versions` não tem coluna de fallback, e `COST_PER_TOKEN` custeia modelo desconhecido em 0 sem aviso (`ai-cost.ts`). Trocar de modelo muda o throughput e, com ele, a conta do D-29.
- **D4 para a análise da triagem** (`analise_candidato_vaga`, sobrescrita ao reprocessar) — D-37.
- **Defeito 15b** — justificativa em cada avanço humano; não está em bloco nenhum e esbarra no D8.
- **`getGuia` sem filtro de tipo** (`entrevistaService.ts:405-410`): pega o guia mais recente de qualquer tipo; o online e o presencial podem se misturar. Achado no kickoff, **não perguntado ao operador**.
- **Guia presencial lê as notas da IA, nunca as confirmadas pelo humano** (`weakDims`). Achado no kickoff, não perguntado.
- **Policies de candidato em `scores_raven`/`scores_bigfive`/`scores_disc`** comparam `c.candidato_id = auth.uid()`, o que casa 0 de 44: o candidato nunca lê as próprias linhas. Verificar se alguma tela do candidato precisa; não perguntado.
- **`score_geral`** (0 de 38 preenchidos): coluna morta, mas escondida quando nula. Não é o defeito 13.
- **`entrevistas_online` / `entrevistas_presenciais`**: tabelas sem escritor, com 5 linhas de seed. Candidatas a limpeza de schema.
- **Escrituração:** acrescentar os Defeitos 32–40 à tabela «Defeitos — acumulado» e à fila da `JORNADA-GUIADA.md` (com o arquivo fechado no editor, regra 5); atualizar o número da varredura de portões no `CLAUDE.md` (244 → 282).
- **`CLAUDE.md` §«Portões»**: acrescentar ao padrão as listas literais declaradas (`text[] := ARRAY[`) e as contagens em `<> (CASE …)` (item aberto do 48-06).

### Reviewed Todos (not folded)
Os 16 todos pendentes que o `todo.match-phase 49` devolveu casaram só por palavra genérica («phase», «plano», «checkpoint»), com score 0,4–0,6. Nenhum é do Bloco 2. Não foram incorporados. O mais próximo em espírito, `gsd-execucao-paralela-sem-isolamento.md` (planos paralelos sobre o mesmo índice git), é de processo de execução e vale para o `/gsd-execute-phase`, não para o escopo.

</deferred>

---

*Phase: 49-consertos-da-jornada-bloco-2*
*Context gathered: 2026-09-22*
