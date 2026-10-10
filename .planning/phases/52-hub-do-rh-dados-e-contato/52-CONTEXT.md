# Phase 52: Hub do RH — Dados, Contato e Avaliações do Candidato - Context

**Gathered:** 2026-10-10
**Status:** Ready for planning

<domain>
## Phase Boundary

No hub do RH (`/rh/candidatos/:id`, `HubCandidatoRH.tsx`), quem decide vê **tudo o que o candidato
preencheu e respondeu** — cadastro completo, respostas da inscrição (portfólio inclusive), resultado
do Big Five com a devolutiva, pergunta/alternativas/escolha no SJT de múltipla escolha, texto do caso
aberto legível — e **contata o candidato com um clique** (e-mail e WhatsApp). Junto, deixam de existir
os defeitos e as pendências que o UAT da Phase 51 adiou e os achados do aceite 51-17.

Origem: decisão do operador **G-51-OP1** (2026-10-10), verbatim:
«Eu quero o resultado do Big Five e quero ver todos os dados preenchidos no cadastro e inscrição da
vaga. Preciso também ter o e-mail e telefone para entrar em contato fácil, com um botão de enviar
e-mail e, no telefone, um botão do lado de chamar no WhatsApp.»

Escopo fixo (ROADMAP, Phase 52):
- **Hub:** contato; cadastro completo; respostas da inscrição; Big Five com resultado e devolutiva;
  SJT MC com pergunta e escolha; caso aberto mais legível.
- **Defeitos do UAT da 51:** (a) painel do candidato desatualizado depois de concluir tudo;
  (b) «Gerado pelo modelo modelo não registrado»; (c) «N avaliações respondidas» duplicado.
- **Pendências adiadas:** saída durante as provas (inclusive Raven); «Tempo sugerido»; devolutiva sem
  caminho para reabrir; Raven fora do shell da marca e sem instruções; sliders BARS pré-marcados;
  jargão «BARS sliders 1–5 — notas_humanas»; menu lateral com «Dashboard» ativo dentro da entrevista.
- **Achados do 51-17:** `LoginCandidatoPage` ignora sessão aberta; sem volta ao dashboard na área do
  candidato; cor do «Agradecemos seu interesse»; `SelectItem` branco sobre branco; nomes RH2/RH3
  trocados no cadastro; motivo/justificativa no diálogo de revisão humana (`humana_triagem`).

Requirements: **JORN-52** (recorte mínimo — D-28) e os que o planejador criar para o resto do escopo.
JORN-50 está Complete (nota de escrituração abaixo); JORN-51 já era Complete.

</domain>

<decisions>
## Implementation Decisions

### Revogações e o que continua (operador, 2026-10-10)
- **D-01:** A **D-32 da 51** (no hub, Big Five só «Concluído/Não fez») está **revogada**. A **D-31 da 49**
  fica revogada **só para o hub**: o card da **lista** do RH continua «Concluído / Não fez» (ver D-05).
  Os testes que travam o «sem resultado no hub» mudam junto.
- **D-02:** **RNF-07a continua**: nada rejeita, ordena ou filtra por Big Five. A revogação é sobre o RH
  **ver** o resultado. **UX-07 continua**: nenhuma tela do RH mostra percentil numérico.
- **D-03:** Alertas apresentados ao operador e por ele considerados antes da decisão (Big Five não
  avaliativo; idade × Lei 9.029/95) — **decisão mantida: todos os dados preenchidos**. Não reabrir.

### Big Five no hub
- **D-04:** Resultado por dimensão = **as 5 faixas neutras** que o candidato viu na devolutiva
  («Muito baixo» … «Muito alto»), **sem percentil** e sem barra proporcional — o mesmo desenho de
  `DevolutivaBigFiveView.tsx` (UX-07).
- **D-05:** Só o **hub** mostra o resultado; a lista do RH (D-31/49) segue «Concluído / Não fez» —
  faixas de 5 dimensões no card da lista viram comparação entre candidatos.
- **D-06:** O **texto integral da devolutiva** que o candidato viu entra **recolhível** («Ver
  devolutiva»), no padrão do «Ver respostas» da 51.
- **D-07:** Uma **linha fixa de aviso** junto do resultado, no sentido de «Perfil de personalidade:
  descreve, não classifica. Não é critério de aprovação.» (texto final a critério da fase de UI,
  sem «teste psicológico» — regra de linguagem do CLAUDE.md).

### Dados pessoais e acesso
- **D-08:** **Tudo visível direto** — nome, e-mail, CPF, celular, nascimento, gênero, endereço
  completo (CEP, logradouro, número, complemento, bairro, cidade, UF), LinkedIn, Instagram, como
  conheceu (+ detalhes). Sem «Mostrar dados pessoais».
- **D-09:** Nascimento = **data + idade** («12/03/1994 (32 anos)»).
- **D-10:** Quem vê: **recrutador ativo e admin** — o mesmo recorte da Phase 50
  (`is_active_rh_user()`); recrutador inativo, candidato e `anon` não veem nada.
  — **Reversibility:** costly — alarga leitura de dado pessoal; desfazer exige nova policy/RPC e
  reescrita dos smokes de acesso.
- **D-11:** Registro de acesso = **linha de log, como no currículo** (o `get-curriculo-url` hoje faz
  só `console.log` com o id — não há tabela de auditoria). **Não** é tabela de auditoria.
  ⚠ **Consequência obrigatória para o planejador:** uma leitura direta do cliente liberada por RLS
  **não gera log nenhum**. Para a linha existir, os dados pessoais têm de vir por um **caminho de
  servidor que a escreva** (EF ou RPC). O log carrega só ids e papel — **nunca** o valor de CPF,
  endereço etc. (mesma regra do Pitfall 7 do currículo).

### Contato
- **D-12:** **Cabeçalho do hub, fora das abas**, ao lado do nome: e-mail com «Enviar e-mail» e
  celular com «Chamar no WhatsApp».
- **D-13:** WhatsApp: `https://wa.me/55<dígitos>` com o número normalizado (só dígitos, DDI 55);
  botão **escondido se o número for inválido**. Abre com **mensagem pronta e editável**, no sentido de
  «Olá, {primeiro nome}! Aqui é da Beauty Smile, sobre a sua candidatura para {vaga}.»
- **D-14:** E-mail: `mailto:` com **assunto pronto** «Beauty Smile — sua candidatura para {vaga}»,
  corpo em branco.
- **D-15:** O clique **não é registrado** (o contato acontece fora do sistema; o clique não prova
  contato).
- **D-16:** Os botões aparecem **sempre que houver o dado**, em qualquer etapa (inclusive rejeitado);
  candidato anonimizado não tem dado, então não tem botão.

### Organização do hub
- **D-17:** O hub passa a ter **abas**: **Resumo** (abre primeiro) · **Cadastro e inscrição** ·
  **Avaliações** · **Histórico**. O **Resumo** é o que o hub mostra hoje no topo (etapa, análise da IA,
  ações de decisão, currículo) — as ações de avançar/rejeitar ficam onde estão.
- **D-18:** Dentro das abas, **tudo aberto** (sem recolher seções), exceto a devolutiva (D-06).
- **D-19:** Respostas da inscrição na **ordem do formulário**; a pergunta eliminatória ganha **selo
  «Eliminatória»** e a resposta aparece como as outras — **sem** «passou/não passou» e sem distância
  do corte.
- **D-20:** Portfólio, outros links da inscrição, LinkedIn e Instagram: **link clicável em aba nova**
  só para `http`/`https`; o resto aparece como texto (sem prévia).

### SJT múltipla escolha e caso aberto
- **D-21:** SJT MC: pergunta, **todas as alternativas** e a **escolhida destacada**, com a etiqueta/peso
  que já aparece hoje **só na escolhida**. **Não** expor a etiqueta das outras alternativas (seria o
  gabarito na tela).
- **D-22:** Caso aberto: **texto corrido, parágrafos preservados**, fundo neutro (sai a caixa amarela);
  as citações da IA **marcadas dentro do texto** onde forem encontradas literalmente — onde não forem,
  ficam ao lado, como hoje.

### Defeitos e pendências do UAT da 51
- **D-23:** «Modelo não registrado»: **só consertar a frase**, ex.: «Modelo não registrado (análise
  anterior a 22/09)». **Não** preencher as análises antigas. Medido em PROD (2026-10-10, só leitura):
  22 análises `sucesso` com `modelo_ia` NULL, todas de 2026-06-22 a 2026-09-22; as 4 de 2026-09-27 a
  2026-10-09 têm modelo — **não há regressão**, é dado anterior à Phase 49 (a D-30 da 49 manda dizer
  «não registrado»; o defeito é só o modelo de frase «Gerado pelo modelo {modelo}» recebendo o texto).
- **D-24:** «Voltar às avaliações» **durante** a prova em todas as telas de prova. Nas que já têm
  rascunho automático (redação, caso aberto, Big Five, prova cognitiva) o botão sai direto. No **SJT MC
  e no Raven** (respostas só na memória da tela), o botão abre **confirmação de perda** — «Se sair
  agora, as respostas desta prova não serão salvas», com **Sair** e **Continuar**. Não se cria
  rascunho para esses dois nesta fase.
  - **Emenda (operador, 2026-10-10, aceita da UI-SPEC D-52-U14) — substitui a D-24 neste ponto:** no
    **Raven** o botão diz **«Ir ao painel»** (destino `/candidato/dashboard`), não «Voltar às
    avaliações» — o caminho de volta do Raven é o painel, e o guard `rotulos-navegacao-candidato`
    exige que o rótulo nomeie o destino. A confirmação de perda (Sair/Continuar) continua igual. Nas
    demais telas de prova, a D-24 vale como escrita.
- **D-25:** Sliders BARS da entrevista começam **vazios e obrigatórios**: «Salvar avaliação» só libera
  com todas as dimensões escolhidas (mesma lógica do JORN-47 para as notas escritas). Some também o
  subtítulo com jargão («BARS sliders 1–5 — notas_humanas…»).
  - **Emenda (operador, 2026-10-10, aceita da UI-SPEC D-52-U12) — substitui a D-25 neste ponto:** o
    controle deixa de ser **slider** e vira uma **fileira de 5 botões (1–5)** por competência
    (`role="radiogroup"`), **começando sem nenhum marcado** — o Slider do Radix não tem estado vazio.
    O resto da D-25 vale como escrito: obrigatórios, «Salvar avaliação» só libera com todas as
    competências notadas, nenhum valor inicial vindo da IA, e some o subtítulo com jargão.
- **D-26:** SJT MC: «Tempo sugerido: mm:ss» vira **«Tempo decorrido: mm:ss»** (sem limite rígido).
- **D-27:** Painel do candidato com todas as avaliações concluídas: **«Avaliações concluídas —
  aguardando a equipe»**, sem botão de continuar. **Não muda status no banco** — só o que a tela lê.

### Acréscimos do operador (2026-10-10, depois da discussão) — a 52 é a última fase antes de abrir para candidatos reais
- **D-28 (JORN-52, recorte mínimo):** a 52 inclui escrever o **banco SJT do cargo de pré-vendas**
  (`sdr-social-seller`), no padrão dos 3 cargos de marketing da `20260929000001` (6 itens `mc` + 1
  `caso_aberto`, com a razão do tamanho escrita no cabeçalho). Motivo medido em PROD (2026-10-10, só
  leitura): a vaga **ATIVA** Consultor(a) de Relacionamento e Pré-vendas (`fdbe1a4a`,
  `consultor-relacionamento-pre-vendas`) aponta `work_sample_sjt` para `sdr-social-seller` com **1 item**,
  `obrigatorio: true`, **peso 15** — uma escolha muda a faixa. Os **5 cargos latentes** de 1 item
  (`asb-tsb`, `assistente-financeiro`, `consultor-vendas`, `recepcionista`, `vaga-generica`; zero vagas
  em qualquer status) **ficam fora**. — **Reversibility:** costly — itens de banco entram por
  migration (ledger + md5) e passam a ser respondidos por candidato; trocar depois exige versão nova
  do banco, não edição.
- **D-29:** A lista de vagas atingidas pelo JORN-52 é **`status`-agnóstica**. Medido (2026-10-10):
  `sdr-social-seller` tem duas vagas — a ativa `fdbe1a4a` (peso 15) e a **mina inerte** `629a5f31`
  (`teste-e2e-social-media-junior-1-…`, `inativa`, peso **35**, ponteiro errado *e* banco raso). O
  destino da mina inerte vai ao **portão do bloco D** (D-32) — não pode ficar como está se a vaga
  puder ser republicada.
- **D-30 (limpeza dos dados de teste das vagas ativas, antes de abrir para candidatos reais):** hoje
  não há candidatura real nos últimos 30 dias (a última real é de 26/04, segundo o operador). Entram:
  contas **+claude1..+claude7** e a conta **+cand1** (as duas candidaturas dela — ver achado 1). O **método** (exclusão
  Art. 18 pelo próprio motor, ou teardown) é **decisão do planejamento**, **sempre com portão
  destrutivo** (dry-run pela mesma query, população medida e aprovada, review bloqueante, prova pós).
  — **Reversibility:** one-way — apagar dado em PROD; PITR desligado e Storage sem backup.
  Medido em PROD (2026-10-10, só leitura), por vaga ativa:
  | Vaga ativa | +claudeN | cand1 | outras |
  |---|---|---|---|
  | `fdbe1a4a` Consultor | 7 | 0 | 3 fictícios `c0000001..3` |
  | `e897f709` Social Media | 7 | 1 | 3 fictícios `c0000004..6` + 1 já anonimizada (`dae837f4`, rejeitada) |
  ⚠ **Achados da medição que o planejador tem de resolver:**
  1. ~~«Teste Vaga Nova» não existe em PROD~~ — **RESOLVIDO pelo operador (2026-10-10):** não é vaga;
     é o `nome_completo` do candidato da conta **+cand1** (leitura errada do print do hub). A população
     é a **conta +cand1**, com **duas** candidaturas: `f59e7281` na Social Media ativa (`e897f709`,
     `aguardando_resposta`) e `d31c78bb` na vaga inativa `629a5f31` (`em_analise`) — conferido em PROD
     (só leitura). A tabela acima conta só vagas ativas, por isso mostra 1 para cand1.
  2. Os **6 fictícios** (`candidatos f0000001..6`, `candidaturas c0000001..6`, e-mail `@invalido.local`)
     vêm das migrations `20260830000005_fakes_teste_comparacao_consultor.sql` e
     `20260905000002_fakes_teste_comparacao_social_media.sql`, cujo cabeçalho diz «devem ser removidos
     antes da divulgação das vagas — o operador aprovou a criação e a remoção em 2026-08-30». Não
     estavam na lista da D-30, mas estão nas vagas ativas e já têm remoção aprovada — **incluir** na
     população medida e mostrar ao operador no portão.
  3. `dae837f4` é **resto de anonimização** (o motor troca o e-mail por `anonimizado+<id>@invalido.local`
     e guarda a trilha da decisão — BD-9). Não é dado pessoal; o planejador decide se ele conta como
     «dado de teste» (a trilha é guardada por desenho) e mostra a decisão no portão.
  4. **Ordem:** o UAT da própria 52 precisa de contas de teste. A limpeza vem **depois** do UAT da 52
     (ou o UAT usa contas novas que entram na mesma limpeza) — não antes.
  5. Relacionado, **fora** da D-30: as 8 fixtures da purga (`fixture-p46-*`, vagas arquivadas) têm
     teardown próprio no checklist de fecho do M8 (`STATE.md`, `p46_teardown_fixture.sql`).
- **Nota de escrituração (feita junto deste acréscimo, não é decisão de implementação):** **JORN-50 Complete** no `REQUIREMENTS.md` — a
  `20260929000002_jorn50_reaponta_sjt_social_media` está no ledger de PROD e a `e897f709` aponta
  `work_sample_sjt` para `social-media` (medido 2026-10-10). **JORN-52 → Phase 52** na rastreabilidade.

- **D-32 (operador, 2026-10-10):** o portão do **bloco D** decide também a **própria vaga `629a5f31`**
  («[TESTE E2E] Social Media junior 1…», `inativa`, `sdr-social-seller`, peso 35 — a mina inerte do
  JORN-52). Arquivá-la ou removê-la elimina o risco de republicação. **O planejamento propõe o método;
  o operador decide no portão.** Ela já carrega a candidatura `d31c78bb` da +cand1 (D-30), então a
  ordem entre limpar a candidatura e tratar a vaga entra na proposta.
- **D-33 (operador, 2026-10-10):** **aceita a divisão** — uma fase só, quatro blocos (A telas sem banco,
  B hub do RH, C banco SJT de pré-vendas, D limpeza), cada um com portão próprio.
- **D-34 (operador, 2026-10-10) — regra de redação do banco SJT de pré-vendas (bloco C):** em cada item
  `mc`, as **4 alternativas têm comprimento parecido** — a `fortemente_pontua` **não pode ser
  visivelmente a mais longa**. A tela do candidato já embaralha a ordem (`SjtMultiplaEscolhaScreen.tsx:51-84`),
  então o comprimento é a pista que sobra: a alternativa certa denunciada pelo tamanho vira gabarito e
  achata a faixa. O operador **aprova o texto no portão do bloco C já com esta regra aplicada**. Para o
  portão, o texto vai acompanhado da **contagem de caracteres de cada alternativa por item**, com a razão
  `fortemente_pontua` ÷ média das outras três. Isso deixa a regra conferível, não só afirmada. O
  critério numérico de "parecido" não foi fixado pelo operador: o planejador propõe, e o operador decide no
  portão.
  - **O vício que a regra evita, medido no banco de marketing no ar** (`20260929000001`, 2026-10-10, leitura do
    arquivo da migration): em **16 dos 18** itens `mc` a `fortemente_pontua` é a alternativa mais
    longa. A razão sobre a média das outras vai de 0,96× a **2,85×** (situação 1 da Social Media: 227
    caracteres contra 79/65/95). O conserto daquele banco **entrou na 52 pela D-35**, como extensão do bloco C.
- **D-35 (operador, 2026-10-10): decisão da pendência
  `52-banco-sjt-marketing-comprimento-das-alternativas`, que sai de §Deferred e entra no escopo.**
  1. **Quando:** o banco de marketing é corrigido **antes de abrir para candidatos reais**.
  2. **Como:** com uma **versão nova do banco por migration** (D-28: ledger + md5, `p46apply.cjs`). Nenhum
     item é editado no lugar. Pelo próprio cabeçalho da `20260929000001`, «um item cujo texto mudar entra
     como item novo, de propósito».
  3. **Texto:** o rascunho de 30/09 (`docs/specs/DRAFT-banco-sjt-marketing.md`) entra **revisto**. Ele passa
     pela mesma tabela de caracteres da D-34 (contagem por alternativa e razão `fortemente_pontua` ÷ média
     das outras), e o **operador aprova o texto no portão**.
  - **Escopo:** é uma **extensão do bloco C**, com o banco de pré-vendas e a versão nova dos **3 cargos de
    marketing** no **mesmo portão de texto**. A regra de comprimento vale para os itens `mc`. Se os itens
    `caso_aberto` de marketing também ganham versão nova, o planejador decide e mostra no portão.
  - **Para o planejador propor:**
    (a) A **ordem** entre a versão nova e a limpeza do bloco D, porque as respostas de teste apontam
    para os itens antigos.
    (b) O que acontece com os **itens antigos**. Item antigo e item novo do mesmo cargo **não podem ficar
    ativos juntos**: a vaga sorteia do cargo, e o banco ficaria com o dobro de itens.
    (c) O que fazer com o rascunho local depois que o texto revisto for aprovado. Até lá, ele **não é commitado nem
    descartado**.
  - **Conferência da medição do operador** (PROD, 2026-10-10, só leitura, pelo `pergunta_id` das respostas):
    as 8 linhas `scores_candidato` `tipo='sjt'` (5 `e897f709` · 1 `fdbe1a4a` · 2 `a32fe930`) **batem**.
    São **6 de múltipla escolha + 2 de caso aberto**, e só **uma** candidatura respondeu itens do banco de
    marketing: **`8101c56f` (+claude6, `e897f709`)**, 6 respostas `mc` de `social-media` mais o caso aberto
    dela. Essa candidatura está na população da D-30. As outras:
    - `0b1c887b` (+claude1), `f59e7281` (+cand1) e `bf26ee3c` (+claude4) apontam para o item **antigo de
      `sdr-social-seller`**, o banco raso de pré-vendas do bloco C, e estão na D-30.
    - `dae837f4` é resto de anonimização, sem `respostas` (D-30, achado 3).
    - As **2 da `a32fe930`** (`a1dd4c42`, `teste-dentista-funil-e2e`, vaga **arquivada**, itens do banco
      **`dentista`**) **não tocam o banco de marketing**. ⚠ Elas também **não estão na população da D-30
      como escrita** (vagas ativas + cand1, e a conta não casa com +claudeN/+cand1/`@invalido.local`).
      «Saem na limpeza do bloco D» só vale para elas se o operador as incluir no portão do bloco D.
      Isso não afeta a D-35, porque elas não apontam para marketing.

### Divisão (proposta e aceita pelo operador — D-33)
O escopo tem quatro naturezas com riscos diferentes. Recomendação ao planejador: **uma fase, quatro
blocos em ondas, com portões próprios**, em vez de fases separadas — tudo precisa estar no ar antes de
abrir, e só os blocos C e D tocam o banco de forma sensível:
- **A — Telas sem banco** (sem migration): pendências do candidato (saída das provas, «Tempo decorrido»,
  devolutiva reabrível, Raven no shell, painel «avaliações concluídas»), entrevista (sliders vazios,
  jargão, menu ativo), achados do 51-17 (login, volta ao dashboard, «Agradecemos», `SelectItem`),
  defeitos (b) e (c).
- **B — Hub do RH** (alarga leitura de dado pessoal): leitura de servidor com log (D-11), abas,
  contato, cadastro, inscrição, Big Five, SJT MC, caso aberto. **Review bloqueante antes do apply** e
  prova por papel.
- **C — Banco SJT de pré-vendas + versão nova dos 3 cargos de marketing** (JORN-52, D-35): o texto dos
  itens é **aprovado pelo operador antes** da migration (precedente do `51-19-TEXTO-APROVADO.md`), num **portão
  de texto único** para os dois bancos, **já escrito com a regra de comprimento da D-34** e acompanhado da
  tabela de caracteres por alternativa. Migration pelo `p46apply.cjs`. Ficam para o planejador o destino da
  mina inerte, a retirada dos itens antigos de marketing e a ordem em relação ao bloco D.
- **D — Limpeza** (destrutiva, a última): depois do UAT da 52; população medida, aprovada e
  re-medida no mesmo comando; portão destrutivo do M8.

### Claude's Discretion
- Texto final do aviso do Big Five (D-07), respeitando o sentido e a regra de linguagem.
- Forma do caminho de servidor que escreve o log (D-11): EF ou RPC, desde que a linha exista e não
  carregue valor de dado pessoal.
- Como reabrir a devolutiva do lado do candidato (pendência (f)) — o requisito é existir caminho na
  interface a partir do card concluído.
- Correções do Raven (shell da marca, instruções do `subtitulo`), `SelectItem`, cor do
  «Agradecemos», `LoginCandidatoPage`, volta ao dashboard, menu ativo, duplicação de (c) e o motivo no
  diálogo de revisão humana — sem decisão de produto aberta; seguir o padrão das telas vizinhas.
- Nomes RH2/RH3: o que corrigir é **dado** (cadastro), não código — o planejador decide se é passo
  manual do operador ou escrita controlada.

### Folded Todos
- **`49-producoes-do-candidato-sem-leitor-de-rh`** (`.planning/todos/pending/`) — **Parte A**: o
  portfólio mora em `respostas_formulario` e entra pelo item «respostas da inscrição» (D-19/D-20); o
  texto do caso aberto já chegou ao RH na 51 e é melhorado aqui (D-22). A **Parte B** (nota do RH,
  entregável externo — tabela nova e §4 do M8) **não** entra.
- **`52-banco-sjt-marketing-comprimento-das-alternativas`** (`.planning/todos/pending/`): **inteira**,
  pela D-35. É uma versão nova dos 3 cargos de marketing, com o texto do rascunho de 30/09 revisto pela
  regra da D-34, no portão de texto do bloco C.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Decisão e escopo
- `.planning/DECISAO-2026-10-10-hub-rh-dados-e-contato.md` — decisão verbatim, alertas considerados,
  **fonte de cada dado** (tabelas/colunas), pontos de desenho, defeitos a–f com linha de código.
- `.planning/phases/51-consertos-da-jornada-bloco-3/51-UAT.md` — G-51-OP1 (§Gaps) e «Deferred
  Follow-Ups» dos testes 2, 4 e 5, com a evidência do operador.
- `.planning/phases/51-consertos-da-jornada-bloco-3/51-17-SUMMARY.md` — achados do aceite 51-17.
- `.planning/phases/51-consertos-da-jornada-bloco-3/51-UI-REVIEW.md` — Raven fora do shell (linha 72),
  instruções nunca renderizadas (linha 62), `SelectItem` (R1, linha 44).
- `.planning/ROADMAP.md` §Phase 52 — escopo e guardrails.
- `.planning/REQUIREMENTS.md` — JORN-52 (texto integral, inclusive a «MINA INERTE») e JORN-50.
- `supabase/migrations/20260929000001_banco_sjt_marketing.sql` — o padrão do banco SJT (D-28).
- `supabase/migrations/20260830000005_fakes_teste_comparacao_consultor.sql` e
  `supabase/migrations/20260905000002_fakes_teste_comparacao_social_media.sql` — fictícios a remover (D-30).
- `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-PLAN.md` e `51-23-COMANDO-APPLY.sh` — o
  portão destrutivo mais recente (população medida, comando encadeado, prova pós).
- `.planning/todos/pending/49-producoes-do-candidato-sem-leitor-de-rh.md` — Parte A folded.

### Decisões anteriores que esta fase toca
- `.planning/phases/49-consertos-da-jornada-bloco-2/49-CONTEXT.md` — D-31 (revogada só no hub), D-30
  («modelo não registrado»).
- `.planning/phases/51-consertos-da-jornada-bloco-3/51-CONTEXT.md` — D-32 (revogada), D-15/D-19 (nomes
  e navegação do candidato).
- `.planning/phases/50-acesso-do-recrutador/` (`50-CONTEXT.md`) — recorte «recrutador ativo» (`is_active_rh_user()`) e a
  prova de que nada abriu para `anon` (views incluídas).
- `.planning/milestones/v4.0-REQUIREMENTS.md` — UX-07 (sem percentil numérico nas telas do RH).
- `CLAUDE.md` — Security Rules (RNF-07a; linguagem «avaliação comportamental»; service_role nunca no
  cliente) e a via de apply (`p46apply.cjs`, `efdeploy.cjs`, push com `origin/main..HEAD` vazio,
  marcador no chunk certo).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/hub-candidato/components/HubCandidatoRH.tsx` (562 linhas) — a tela que ganha as abas.
- `src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx` — o «Ver respostas» da 51:
  padrão de detalhe no lugar; onde moram SJT, Big Five e caso aberto hoje (e a duplicação (c)).
- `src/features/avaliacao/components/DevolutivaBigFiveView.tsx` — as 5 faixas e seus rótulos (D-04):
  reaproveitar o desenho, não recalcular faixa.
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx` (`CasoAbertoBreakdown`, ~linha 128) e
  `src/features/avaliacao/services/scoresRhService.ts` — o leitor vivo de score/citações do caso aberto (D-22).
- `src/features/hub-candidato/components/CvButton.tsx` + `supabase/functions/get-curriculo-url/` — o
  padrão de «registro como no currículo» (D-11): autentica, autoriza, `console.log` só com id/papel.
- `src/features/triagem/components/ProvenienciaIABadge.tsx:62` — o modelo de frase do defeito (b).
- `src/features/privacidade/services/exportacaoService.ts` — único leitor atual de
  `respostas_formulario` × `perguntas_formulario`; referência de junção para D-19.
- `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts` — rascunho das 4 telas que já salvam (D-24 só precisa saber quais).

### Established Patterns
- Nenhuma tela do RH lê hoje `candidatos.email`/`celular` — o contato e o cadastro são leitura nova
  de dado pessoal pelo RH: review bloqueante antes do apply, prova por papel (recrutador ativo/inativo,
  candidato de outra candidatura, `anon`), views sem `security_invoker` ignoram RLS.
- Tabelas de devolutiva e de respostas são, provavelmente, de leitura só do titular — o RH precisa de
  leitura própria (RPC SECURITY DEFINER com guarda, como `ler_resposta_caso_aberto_sjt` da 49, hoje em `supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql`), não de
  policy aberta.
- Rótulos e textos do candidato têm guardas por forma (`src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts`);
  mudar texto exige mexer nas guardas e provar que ainda mordem.

### Integration Points
- Telas de prova (`src/features/avaliacao/components/` e `src/features/avaliacao-cognitiva/components/`): `SjtMultiplaEscolhaScreen.tsx` (respostas em `useState`, linha 143; cronômetro
  147-151), `AvaliacaoRavenScreen.tsx` (`useState` linha 88; `subtitulo` linha 41; `div` solto linha
  204), `BigFiveQuestionnaireScreen.tsx` (devolutiva só no redirecionamento, linha 394),
  `RedacaoEditorScreen`, `SjtCasoAbertoScreen`, `ProvaCognitivaScreen`, `AvaliacaoContainer.tsx`.
- Entrevista: `src/features/entrevista/components/EntrevistaScorecardInline.tsx` (sliders BARS, D-25).
- Painel do candidato (defeito a): `src/components/pages/DashboardCandidatoPage.tsx` e a leitura de status das avaliações.
- `src/components/ui/select.tsx:132-136` (`SelectItem`), `src/components/pages/FormularioCandidaturaPage.tsx:547`
  («Agradecemos»), `src/components/pages/LoginCandidatoPage.tsx`.

</code_context>

<specifics>
## Specific Ideas

- WhatsApp com a mensagem do operador já pronta, editável antes de enviar (D-13).
- A tela do RH mostra o Big Five **igual** ao que o candidato viu — mesmas faixas, mesmo texto.
- O hub vira abas, com o contato sempre à mão no cabeçalho.

</specifics>

<deferred>
## Deferred Ideas

- **Rascunho automático no SJT MC e no Raven** — considerado e preterido em favor da confirmação de
  perda (D-24); fica como evolução.
- **Registro do contato (quem chamou, quando)** — o clique não prova contato (D-15); se houver
  necessidade de trilha, é fase própria (registro manual de contato).
- **Tabela de auditoria de acesso a dados pessoais** — preterida em favor da linha de log (D-11).
- **Reanalisar as 22 análises sem modelo** — preterido (D-23): custo de IA e substitui a análise antiga.
- ~~Pendência separada: equalizar o comprimento das alternativas do banco de marketing em PROD~~:
  **decidida pelo operador em 2026-10-10 e movida para o escopo da 52 (D-35, bloco C)**. Ver §Folded Todos.

### Reviewed Todos (not folded)
- `49-banco-sjt-aplicado-e-nao-conectado` — vagas apontando para o banco SJT errado; é configuração de
  vaga/banco, não o hub do RH.
- Os demais casamentos automáticos do `todo.match-phase` (25-review-deferred, 36-resend…, 42-…, 43-…)
  casaram por palavras genéricas («phase», «review») e não tratam do hub.
- `49-producoes-do-candidato-sem-leitor-de-rh` **Parte B** — tabela nova + §4 do M8; fora.

</deferred>

---

*Phase: 52-hub-do-rh-dados-e-contato*
*Context gathered: 2026-10-10*
