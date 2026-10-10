# Phase 52: Hub do RH — Dados, Contato e Avaliações do Candidato - Research

**Researched:** 2026-10-10
**Domain:** SPA React 18 + Supabase (RLS, RPC SECURITY DEFINER, Edge Function com log), conteúdo de banco SJT por migration, limpeza destrutiva de dados de teste em PROD
**Confidence:** HIGH no que foi medido (código lido nesta sessão + catálogo/dados de PROD por leitura `SET TRANSACTION READ ONLY`); MEDIUM nas recomendações de forma; LOW só onde marcado `[ASSUMED]`

<user_constraints>
## User Constraints (from CONTEXT.md)

> Copiado **byte a byte** de `52-CONTEXT.md` (seções `<decisions>` e `<deferred>`). Nada abaixo
> deste bloco reabre decisão travada; as **correções de fato** que a pesquisa encontrou e que tocam
> uma decisão estão em §«Achados que mudam o plano» e em §«Open Questions», para o operador decidir.

### Locked Decisions, Claude's Discretion e Folded Todos (52-CONTEXT.md `<decisions>`, verbatim)

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
  - **Emenda (operador, 2026-10-10, antes do plan): a população passa a ser POR CONTA, não por status de
    vaga. Substitui o recorte «vagas ativas» do título e da tabela acima.** A limpeza cobre **todos os
    dados de contas de teste em vagas de qualquer status** (ativa, inativa, arquivada). Inclui as **2
    respostas SJT da `teste-dentista-funil-e2e`** (`a32fe930`, arquivada, candidatura `a1dd4c42`) e a
    **conta dona delas**, o candidato `896c6a43`. Essa conta (medida em 2026-10-10, só leitura) tem e-mail
    `@teste.com` **sem «+»**, por isso **não casa** com nenhum padrão listado acima (+claudeN, +cand1,
    `@invalido.local`). Ela tem **2 candidaturas**, as duas em vagas arquivadas: `a32fe930`
    (teste-dentista-funil-e2e) e `53f75c81` (teste-asb-shopping-riomar). A tabela acima e a conta da
    `a32fe930` são **fotografia**. O **escopo** é «todo dado de conta de teste».
    - **Como o planejador monta a lista:** por **varredura status-agnóstica**, seguindo a regra «fotografia ×
      escopo» do `CLAUDE.md`. A lista de padrões de e-mail também é fotografia: a `896c6a43` mostrou que
      ela envelhece. A varredura cruza **duas entradas**: (i) contas que casam com os padrões de teste
      medidos, em qualquer vaga; (ii) **toda** candidatura em vaga de teste (`[TESTE]` no título ou
      `teste-*` no slug), em qualquer status, **seja qual for a conta**. O que aparece numa entrada e não na
      outra é mostrado à parte, porque é ali que mora a conta que nenhum padrão previu.
    - **O que vai ao portão do bloco D:** **as contas, as candidaturas e as vagas de teste**
      (`[TESTE]`/`teste-*`), com a **proposta de arquivar ou remover cada vaga**. A D-32 (`629a5f31`) entra
      nessa mesma lista. **Nada é removido sem a lista no portão.** O portão destrutivo do M8 continua
      valendo inteiro: dry-run pela mesma query, população aprovada e re-medida no mesmo comando, review
      bloqueante, prova pós.
    - **Fronteira a mostrar, não a decidir aqui:** a varredura vai encontrar as 8 fixtures `fixture-p46-*`
      (item 5, vagas arquivadas, teardown próprio no fecho do M8). O planejador mostra no portão se elas saem
      pelo teardown delas ou pela limpeza do bloco D, para nenhuma ficar sem dono e nenhuma ser apagada
      duas vezes.
  - **Trava (operador, 2026-10-10, antes do plan): a população é só de CANDIDATOS.** Entram linhas de
    `candidatos`/`candidaturas` com papel candidato. **Nenhuma conta de RH ou admin (`usuarios_rh`)
    entra**, mesmo que o e-mail case com um padrão de teste (ex.: `recrutador.rh@teste.com`, `+rh2`,
    `+rh6`). A varredura **exclui explicitamente todo `user_id` presente em `usuarios_rh`**, e a exclusão
    **vale sobre as duas entradas da varredura**, inclusive a entrada «candidatura em vaga de teste». O portão
    mostra a **contagem dos excluídos por esse motivo**. Contas de teste do RH, se for o caso, são
    **decisão separada, fora do bloco D**.
    - **Medido (PROD, 2026-10-10, só leitura; é fotografia, o planejador re-mede):** `usuarios_rh` tem 9
      linhas, nenhuma com `user_id` nulo. **1** linha de `candidatos` tem `user_id` de RH: `d8ef9db1`,
      papel **`administrador` ativo**, domínio `beautysmile.com.br`, com **3 candidaturas**, todas em vagas
      **arquivadas**: `387e91c0` em `9f6ccf1a` (`dev-backend`), `0f09fed1` em `53f75c81`
      (`teste-asb-shopping-riomar`) e `04864650` em `53b73af6` (`teste-coordenador-rh-sede`). Pela trava,
      essas 3 **ficam fora** da limpeza. Nenhum candidato tem e-mail de RH com `user_id` diferente. 8 linhas de
      `candidatos` têm `user_id` nulo (os fictícios e restos de anonimização). A exclusão por `user_id` não
      as alcança, e elas seguem as regras acima.
    - **Para o planejador:** a exclusão se escreve como **anti-join (`NOT EXISTS`)**, não `NOT IN`. Hoje não há
      `user_id` nulo em `usuarios_rh`, mas basta um nulo para `NOT IN` devolver vazio e o portão ver
      «0 candidatos», o mesmo vício da população vazia que mente.
    - ⚠ **Colisão a mostrar no portão, sem decidir aqui:** as vagas `53f75c81` e `53b73af6` são de teste e
      vão aparecer na lista com proposta de arquivar ou remover, **mas carregam candidaturas da conta excluída**.
      **Remover** uma vaga dessas apaga ou bloqueia (por FK/cascata) dado que a trava deixou fora. Para cada
      vaga de teste com candidatura de conta excluída, o planejador mostra a colisão no portão e **não
      propõe remoção que atravesse a trava**. O operador decide, junto com a decisão separada das contas
      de RH.
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
      **`dentista`**) **não tocam o banco de marketing**. Elas estavam fora da D-30 como escrita, mas
      **entraram pela emenda da D-30** (população por conta, operador, 2026-10-10), com a conta dona `896c6a43`.

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
- **D — Limpeza** (destrutiva, a última): depois do UAT da 52. A população é **por conta, em vagas de
  qualquer status** (emenda da D-30), montada por varredura status-agnóstica e mostrada no portão (contas,
  candidaturas, vagas de teste, com a proposta de arquivar ou remover cada vaga). É medida, aprovada e
  re-medida no mesmo comando, no portão destrutivo do M8.

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

### Deferred Ideas (OUT OF SCOPE) (52-CONTEXT.md `<deferred>`, verbatim)

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
</user_constraints>

<phase_requirements>
## Phase Requirements

JORN-52 é o único ID existente. O CONTEXT manda o planejador criar os demais. **Proposta** de IDs (o maior
JORN em `REQUIREMENTS.md` hoje é o 52 `[VERIFIED: grep -oE "JORN-[0-9]+" .planning/REQUIREMENTS.md]`); o
planejador pode renumerar, mas cada linha da tabela tem de cair em algum requirement:

| ID | Description | Research Support |
|----|-------------|------------------|
| **JORN-52** | Banco SJT de pré-vendas (`sdr-social-seller`, 6 `mc` + 1 `caso_aberto`) **e** versão nova dos 3 cargos de marketing (D-28, D-34, D-35); itens antigos retirados no mesmo apply; lista de vagas status-agnóstica (D-29) | §Bloco C; Achados F2, F7, F8; Pitfalls 6–8 |
| JORN-53 *(proposto)* | Contato no cabeçalho do hub: «Enviar e-mail» (`mailto:`) e «Chamar no WhatsApp» (`wa.me`), escondido quando inválido; sem contato para anonimizado/fictício (D-12..D-16) | §Bloco B (EF); Achado F6; Code Examples 3 |
| JORN-54 *(proposto)* | Cadastro completo + Disponibilidade no hub, lidos por caminho de servidor que registra a linha de log (D-08..D-11, D-52-U18) | §Bloco B (EF `ler-cadastro-candidato-rh`); Achados F4, F6, F12 |
| JORN-55 *(proposto)* | Respostas da inscrição na ordem do formulário, selo «Eliminatória», links só `http(s)` (D-19, D-20) | §Bloco B; Code Examples 4 |
| JORN-56 *(proposto)* | Big Five no hub: 5 faixas da devolutiva, aviso fixo, devolutiva recolhível, nunca percentil (D-01..D-07) | §Bloco B (RPC `ler_devolutiva_bigfive_rh`); Achado F15 |
| JORN-57 *(proposto)* | SJT MC com cenário, todas as alternativas em ordem neutra e a escolhida com etiqueta; caso aberto legível com citações marcadas (D-21, D-22) | §Bloco B (RPC `ler_sjt_mc_rh`); Achado F2 |
| JORN-58 *(proposto)* | Hub em 4 abas (`?aba=`), contagem única (defeito c), frase de proveniência sem «modelo modelo» (defeito b, D-23) | §Bloco A/B; Achado F14 |
| JORN-59 *(proposto)* | Painel do candidato «Avaliações concluídas — aguardando a equipe» (defeito a, D-27) + «Ver devolutiva» reabrível | §Bloco A; Achado F7 |
| JORN-60 *(proposto)* | Saída durante as provas com confirmação de perda onde não há rascunho; «Tempo decorrido»; Raven na shell da marca com instruções (D-24, D-26, D-52-U14) | §Bloco A; **Achado F1** |
| JORN-61 *(proposto)* | Entrevista: notas 1–5 em botões começando vazias e obrigatórias, sem jargão, menu «Candidatos» aceso (D-25, D-52-U12) | §Bloco A; Achado F13, F17 |
| JORN-62 *(proposto)* | Achados do 51-17: login com sessão aberta, «Meu painel», «Agradecemos», `SelectItem`, nomes RH2/RH3, motivo/justificativa na revisão `humana_triagem` | §Bloco A; **Achado F3** |
| JORN-63 *(proposto)* | Limpeza dos dados de teste por conta, status-agnóstica, com trava de RH e portão destrutivo; destino da vaga `629a5f31` (D-30, D-32) | §Bloco D; Achados F9, F10, F11, F18 |
</phase_requirements>

## Summary

A fase tem quatro naturezas (D-33) e a pesquisa confirmou que a divisão em blocos A/B/C/D é a certa, mas
**três itens estão no bloco errado ou com premissa errada**, e é isso que o planejador mais precisa saber:

1. **A prova cognitiva NÃO tem rascunho automático** (`ProvaCognitivaScreen.tsx:75-79,150`: «FX-13: the
   prova has NO autosave»). A D-24 lista-a entre as telas «que já têm rascunho» e manda o botão sair direto
   — isso perderia as respostas em silêncio. Só **três** telas usam `useAutosaveAvaliacao` (Big Five,
   Redação, Caso aberto). A regra da D-24 («rascunho → sai direto; memória → confirmação») continua
   valendo; o que estava errado é a lista (Achado F1).
2. **O motivo/justificativa do diálogo `humana_triagem` exige migration** — não é «tela sem banco».
   `revisao_rejeicao` tem RLS ligada, **0 policies** e nenhum SELECT para `authenticated`; e
   `candidaturas.etapa_justificativa` fica `NULL` depois da reversão, enquanto o texto sobrevive em
   `historico_candidatura.criterio_texto` (medido: 60 caracteres no único pedido `humana_triagem`). O
   próprio `51-17-SUMMARY.md:265` já dizia «Mostrar exigiria uma RPC de leitura própria». Vai para a
   migration do bloco B (Achado F3).
3. **A ordem das alternativas no banco SJT é o gabarito.** Em 100% dos itens `mc` de PROD a alternativa
   `ordem = 1` é `fortemente_pontua` (e `ordem 2` = `pontua`…). A UI-SPEC manda mostrar «Alternativas na
   ordem do banco» — isso põe a certa sempre em primeiro lugar, o que a D-21 proíbe em espírito. A leitura
   do RH tem de ordenar por chave neutra (Achado F2). A UI-SPEC também cita a tabela errada
   (`pergunta_opcao_metadata`, que é da inscrição); as alternativas do SJT moram em `perguntas_opcao_sjt`.

Para o bloco B, o caminho recomendado é **uma Edge Function** para os dados pessoais (cadastro, contato,
disponibilidade, inscrição), clonada de `get-curriculo-url` (mesma autorização por linha viva de
`usuarios_rh`, mesma linha de log só com ids e papel), mais **três RPCs SECURITY DEFINER** numa migration
(`ler_devolutiva_bigfive_rh`, `ler_sjt_mc_rh`, `ler_contexto_rejeicao_triagem_revisao`) com o guard
fail-closed + `is_active_rh_user()` copiado de `ler_resposta_caso_aberto_sjt`. Medido: o RH **já lê**
`candidatos`, `respostas_formulario`, `disponibilidade` e `perguntas_formulario` por RLS, e
`CandidatosRHPage`/`KanbanBoard` já mostram e-mail e celular — então a linha de log registra o acesso
**pelo hub**, não todo acesso possível (Achado F4; residual a declarar, não a consertar).

Para o bloco D, a população real é maior que a fotografia do CONTEXT (Achado F9), existe um teardown
pronto e **nunca executado** (`supabase/tests/p47_teardown_dados_de_teste.sql`) que serve de molde mas está
envelhecido (falta a FK `revisao_rejeicao`, criada na 51; inclui o `candidatos` do admin que a trava agora
exclui; contagens fixas 41/33), o Storage só sai pela Storage API (trigger `protect_objects_delete` em
`storage.objects`), e «arquivar» a `629a5f31` por `status` **não** elimina a mina: o menu da
`VagasRHPage` mostra «Ativar» para toda vaga não-ativa e grava `status='ativa'` direto, sem passar por
`publish_vaga` (Achado F18).

**Primary recommendation:** planejar em ondas A → B → C → UAT → D; mover «motivo/justificativa
`humana_triagem`» e «nomes RH2/RH3» para planos com artefato de banco; corrigir a lista da D-24 (prova
cognitiva com confirmação) e a ordem das alternativas do SJT no RH **como decisões levadas ao operador**
no primeiro checkpoint, antes de escrever código que as consuma.

## Achados que mudam o plano (medidos nesta sessão)

> Cada achado diz o que foi medido, onde, e o que muda. Os que contradizem uma decisão travada vão
> como **pergunta ao operador** (§Open Questions), não como mudança silenciosa.

| # | Achado | Evidência | O que muda |
|---|---|---|---|
| **F1** | Prova cognitiva **sem** rascunho; só Big Five, Redação e Caso aberto usam `useAutosaveAvaliacao` | `ProvaCognitivaScreen.tsx:75-79` («the prova has NO autosave (picks live in local state and are posted only at submit»), `:150` (`useState<Record<string, number>>({})`); `grep -rn "useAutosaveAvaliacao(" src` → só `BigFiveQuestionnaireScreen.tsx:351`, `RedacaoEditorScreen.tsx:171`, `SjtCasoAbertoScreen.tsx:138` `[VERIFIED: código]` | D-24: a prova cognitiva entra no grupo da **confirmação de perda** (com SJT MC e Raven). Levar ao operador (O1). Não observável em PROD hoje (15 vagas com `aplica_cognitivo=false`, 51-UAT teste 4), mas é código no ar |
| **F2** | Em todo item `mc` de PROD, `ordem` segue a escada da etiqueta: `ordem 1 = fortemente_pontua` (21 de 21 itens), `ordem 2 = pontua` | `select cargo, ordem, tag, count(*) … perguntas_opcao_sjt` (PROD, 2026-10-10) `[VERIFIED: PROD]`; o gerador emite nessa ordem (`gen-sjt-marketing.py`: «4 opções por mc na ordem fortemente_pontua/pontua/neutro/atencao», cabeçalho da `20260929000001:38-39`) | A leitura do RH ordena por chave neutra estável (ex.: `md5(pergunta_id::text \|\| opcao_id::text)`), e a legenda da UI-SPEC («Alternativas na ordem do banco…») muda (O2). O gerador v2 deve também embaralhar `ordem` deterministicamente (defesa em profundidade). A tabela certa é `perguntas_opcao_sjt`, não `pergunta_opcao_metadata` |
| **F3** | Motivo/justificativa da revisão `humana_triagem` exigem RPC | `revisao_rejeicao`: `relrowsecurity=true`, 0 policies, `has_table_privilege('authenticated',…,'SELECT')=false` `[VERIFIED: PROD]`; no único pedido `humana_triagem` (`revertida`): `historico.criterio_texto` com 60 caracteres, `candidaturas.etapa_justificativa` NULL `[VERIFIED: PROD, só booleanos/comprimentos]`; `51-17-SUMMARY.md:265` | Sai do bloco A, entra na migration do bloco B como `ler_contexto_rejeicao_triagem_revisao(p_pedido_id)` (molde: `ler_contexto_knockout_revisao`). Fonte da justificativa: `historico_candidatura.criterio_texto` via `revisao_rejeicao.historico_rejeicao_id` |
| **F4** | O RH já lê dado pessoal por RLS, e duas telas já mostram contato | policies `candidatos."RH pode ler todos os candidatos"`, `respostas_formulario."RH vê respostas"`, `disponibilidade."RH pode ler todas as disponibilidades"`, `perguntas_formulario."RH vê todas perguntas"` (todas com `usuarios_rh … ativo … deleted_at IS NULL`) `[VERIFIED: PROD pg_policies]`; `CandidatosRHPage.tsx:398-407` e `KanbanBoard.tsx:302-311` renderizam `candidato.email`/`celular`; `candidaturasService.ts:54` `CANDIDATO_ALLOWLIST = 'id, nome_completo, email, celular'` `[VERIFIED: código]` | A frase do CONTEXT «Nenhuma tela do RH lê hoje `candidatos.email`/`celular`» não procede. A linha de log (D-11) registra o acesso **pelo hub**; leitura direta por REST continua possível sem log. Declarar como residual no SECURITY/SUMMARY; **não** fechar policies nesta fase (raio de impacto nas listas) |
| **F5** | Três policies que o hub tocaria são só de JWT, sem o helper vivo | `devolutivas_candidato.rh_le_devolutivas`, `pergunta_opcao_metadata.rh_gerencia_opcao_metadata`, `perguntas_opcao_sjt.rh_gerencia_opcoes_sjt`: `auth.jwt() #>> '{app_metadata,role}' = ANY (ARRAY['rh','administrador'])` `[VERIFIED: PROD pg_policies]` | O recorte da D-10 (recrutador **ativo**) tem de morar **dentro** das RPCs novas (`is_active_rh_user()`), não ser herdado dessas policies. `respostas_avaliacao` não tem policy de RH (só `cand_le_respostas_aval`) |
| **F6** | O tombstone de anonimização tem valores-sentinela que o cadastro renderizaria | 2 contas `anonimizado+%`: `data_nascimento=1900-01-01`, `celular='(00) 00000-0000'`, `nome_completo` começa com `[titular rem`, `cidade='[removido]'`, `user_id` nulo, e-mail canônico `'anonimizado+'\|\|id\|\|'@invalido.local'` `[VERIFIED: PROD agregado]` | Sem tratamento, a aba Cadastro mostraria «01/01/1900 (126 anos)» — dado falso **e** pista de exclusão (Invariante 9 da 45). A EF detecta o tombstone pelo predicado do motor (`51-23-COMANDO-APPLY.sh:34`) e devolve `cadastro: null`, `contato: null` |
| **F7** | A vaga Consultor (`fdbe1a4a`) nunca chega a «Tudo concluído» hoje | `testeContract.ts:76` `work_sample_sjt: ['sjt_mc', 'sjt_caso_aberto']`; `sdr-social-seller` tem 0 item `caso_aberto` ativo `[VERIFIED: PROD]`; `SjtCasoAbertoScreen.tsx:123,218` sem item → «Nenhuma avaliação pendente», sem envio → o card fica `pendente` | O bloco C (caso aberto de pré-vendas) conserta isso de carona. A D-27 (painel «concluídas») **não é observável** numa candidatura da Consultor antes do apply do C — ordenar o UAT por isso |
| **F8** | O rascunho de 30/09 ainda não cumpre a D-34 | Tabela por script (working tree): 18 itens, `fortemente_pontua` **mais longa em 14**, razão 0,96–1,25 (contra 16 de 18 e 0,96–2,85 no aprovado/no ar) `[VERIFIED: script de scratch sobre o arquivo]`; PROD: marketing 6+5+5 = 16 de 18, máx. 2,85; `sdr-social-seller` atual 3,40 `[VERIFIED: PROD char_length]` | A compressão foi feita, a pista não sumiu: ser a mais longa em 14 de 18 ainda é preditivo. O critério numérico (que o planejador propõe, D-34) precisa ser sobre **posto**, não só razão — ver §Bloco C |
| **F9** | População de teste maior que a fotografia do CONTEXT | 46 `candidatos`, 43 `candidaturas`; além do listado: **4** contas `@teste.com` (5 candidaturas, 2 delas na `dev-backend` `9f6ccf1a`, que **não** tem slug `teste-*`), **14** `test+*@beautysmile.com.br` + 1 `uat-form-*` + 1 `fotona.com.br` com **0** candidaturas, 1 conta `beautysmile.com.br` fora de padrão-com-«+» com a candidatura `4dc31256` (criada 2026-04-26) na vaga de teste `53f75c81`; 3 vagas de teste inativas sem candidatura (`f7655d91`, `e36e9929`, `fb362e28`) e 1 de teste já com `deleted_at` (`cb413d5d`); 3 `auth.users` sem `candidatos` nem `usuarios_rh` `[VERIFIED: PROD agregado, sem e-mail]` | A varredura de duas entradas da emenda da D-30 é obrigatória; a lista de padrões do `p47_teardown` (abaixo) cobre **todas** as contas não-fixture hoje. Contas sem candidatura e `auth.users` órfãos vão ao portão como categoria própria |
| **F10** | Há teardown escrito e **não executado**, envelhecido | `p47_teardown_dados_de_teste.sql` (commit `79039720` «escrito, medido, NAO executado»): ordem `retencao_hold → decisao_final → decisao_final_historico → historico_candidatura → solicitacoes_dados → candidaturas → candidatos → auth.users` (`:43-45`), trava por contagem 41/33 (`:101-102`), padrão `'fernando@beautysmile.com.br'` (`:93`) `[VERIFIED: Read]`; FK `fk_revisao_rejeicao_candidatura` (NO ACTION) existe hoje e **não** está na ordem `[VERIFIED: PROD pg_constraint]` | Reusar a **estrutura** (DO único, resíduo = 0 ou exceção, fixtures intactas), não o arquivo. Medir o grafo de FK na execução; a trava da D-30 exclui o `candidatos` do admin que o p47 apagava |
| **F11** | Storage não sai por SQL | `storage.objects` tem `protect_objects_delete BEFORE DELETE … EXECUTE FUNCTION storage.protect_delete()` `[VERIFIED: PROD pg_trigger]`; 27 objetos em `curriculos` (17 por `user_id` de candidato, 6 por `candidatos.id` dos fictícios, 4 do RH excluído pela trava) `[VERIFIED: PROD]` | Passo de Storage separado, pela Storage API, com a lista de caminhos capturada **antes** do DELETE (o `curriculo_url` mora em `candidaturas`) |
| **F12** | `disponibilidade` não tem os nomes nem os valores que a UI-SPEC supõe | colunas `periodo_disponivel`, `regime_trabalho`, `disponibilidade_imediata`, `data_disponibilidade`; valores vivos `integral`/`Integral`, `presencial`/`Presencial`/`remoto` (caixa mista) `[VERIFIED: PROD]` | Mapas da UI-SPEC («Turno preferido», «Modelo de trabalho») aplicados sobre `lower(valor)`; valor desconhecido continua «o próprio valor» |
| **F13** | «Todas as competências notadas» é regra só do cliente | `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` só recusa quando **nenhuma** nota está entre 1 e 5 (`'scores_humanos sem notas numericas entre 1 e 5'`) `[VERIFIED: PROD prosrc]` | Bloco A é «sem banco» (D-33): a trava fica no cliente; declarar o residual. Fortalecer o servidor seria migration fora do bloco |
| **F14** | `textoProveniencia` não recebe data | `ProvenienciaIABadge.tsx:109-126` (assinatura `{ provedorIa, modeloIa, fallbackCause?, comCausa? }`) `[VERIFIED: Read]`; 7 consumidores (AnaliseIABlock, AiLogsPage, exportComparativo, RedacaoReviewPanel, ComparativoScreen, GuiaEntrevistaPanel, TranscricaoReviewPanel) | D-52-U17 (parêntese de data só com data ≤ 22/09/2026) pede parâmetro opcional `geradoEm`; quem não passa data recebe só «Modelo não registrado». Muda tela **e** PDF |
| **F15** | O percentil do Big Five já trafega para o navegador do RH | `scoresRhService.ts:133-134` projeta `metadata` inteiro; linha `big_five` tem `metadata.dimensoes[].percentil` (`BigFiveDimensao`, `:77-82`) `[VERIFIED: código]` | A Invariante 1 da UI-SPEC vale no **tipo** do componente; o payload de rede de `getScores` já carrega o dígito. Endurecimento opcional (O5), não bloqueante (UX-07 é sobre tela) |
| **F16** | O rascunho de 30/09 é a modificação **não commitada** do `DRAFT` | `git diff --stat docs/specs/DRAFT-banco-sjt-marketing.md` → 45+/45−; o gerador lê esse caminho fixo (`gen-sjt-marketing.py`) e afirma `len(itens)==21` | D-35(c): «não é commitado nem descartado». Nenhum executor pode rodar `git add -A`, `git commit -a`, `git stash`, `git checkout -- .` nesta fase. O texto revisto nasce em **arquivo novo** |
| **F17** | `getActivePageFromPath` é closure dentro do componente | `RHSidebar.tsx:106-127` | Extrair para função exportada pura para o teste da UI-SPEC (E2 backstop). Nota: `startsWith('/rh/candidatos')` não casa `/rh/candidato/…` (singular) — por isso cai no fallback `'dashboard-rh'` |
| **F18** | «Arquivar» por `status` não tira a vaga do alcance do botão «Ativar» | `VagasRHPage.tsx:72-73` `novoStatus = statusAtual === 'ativa' ? 'inativa' : 'ativa'` e `:496-507` mostra «Ativar» para todo status ≠ `ativa`; `publish_vaga` só aceita `rascunho` (`'Apenas vagas em rascunho podem ser publicadas'`) mas o toggle não passa por ela; o «Arquivar» da tela grava `deleted_at` (`:145`), e a lista filtra `deleted_at IS NULL` (`vagasService.ts:168`) `[VERIFIED: código + PROD prosrc]` | D-32: para a `629a5f31` sair do risco de republicação, a proposta tem de ser **soft-delete (`deleted_at`)**, remoção, ou reapontar o cargo — não `status='arquivada'` sozinho. As vagas `arquivada` com `deleted_at` nulo (ex.: `53f75c81`, `53b73af6`) também estão a um clique de `ativa` |

## Project Constraints (from CLAUDE.md)

- Stack fixa: React 18 + Vite + TS strict + Supabase; `@/` → `src/`; componentes PascalCase com **export nomeado**; hooks `useX.ts`; services `xService.ts` com classe de erro; features em `src/features/<dominio>/`.
- `database.types.ts` **nunca** editado à mão. Regenerar com `SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w) npx supabase gen types typescript --project-id isljnozzlvckrgjjbjwp < /dev/null > database.types.ts` (o `< /dev/null` é obrigatório; falha deixa o arquivo com zero octeto — `git checkout -- database.types.ts` recupera). Alternativa vigente: cast estreito de RPC confinado (precedente `scoresRhService.ts:206-212`).
- **Nunca** `service_role` no cliente; operação privilegiada → Edge Function. RLS em 100% das tabelas com dado de usuário. Linguagem: «avaliação comportamental/cognitiva», nunca o termo clínico (exceção: rodapé negado `_NEG` da devolutiva, renderizado **como veio**). RNF-07a: nada rejeita, ordena ou filtra por score.
- Apply de migration: `node p46apply.cjs migrate <arquivo>` (SQL lido do disco, migration + ledger na mesma transação; md5 conferido). Sem `BEGIN/COMMIT` no arquivo (42601). Smokes: `node p46apply.cjs run` dentro de ensaio que aborta. EF: `node efdeploy.cjs <slug>` — slug novo tem de entrar na tabela `VERIFY_JWT` (`efdeploy.cjs:44-68`) ou receber `--verify-jwt`.
- Depois de todo apply com efeito visível: `git log --oneline origin/main..HEAD` **vazio** (o front sai pela Vercel a partir do push no `main`); marcador conferido **no chunk certo** (`grep -rl "<marcador>" build/assets/` — `/rh/*` é chunk lazy).
- Portões: varrer pela **forma** (`grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql`), comparar com baseline capturada na execução, e **provar por mutação que o portão morde**.
- Memória do operador aplicável: escrita aditiva/corretiva em PROD roda sem pausa (reportando), destrutiva para em checkpoint; perguntar se o **passo seguinte** de uma sequência obrigatória pertence a algum plano; artefato commitado (version + md5 + antes/depois) em todo apply; exposição a `anon` medida por execução (`SET LOCAL ROLE anon`), views incluídas; população vazia mente nas duas direções; executor que acha a pré-condição falsa **devolve checkpoint com evidência**, não segue pela própria leitura; `gsd-tools` (`update-plan-progress`/`phase.complete`) reescreve blocos históricos do `STATE.md` — conferir o diff.
- `npm run lint` = `tsc --noEmit`; baseline **89** erros (medido nesta sessão), teto 90 (D-53 da 49).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Autorizar leitura de dado pessoal pelo RH (D-10) | API / Backend (EF + RPC DEFINER) | Database (helper `is_active_rh_user()`) | A RLS já abre as tabelas ao RH; o **recorte vivo** e o **log** só existem num caminho de servidor (D-11) |
| Linha de log de acesso (D-11) | API / Backend (EF, `console.log`) | — | Precedente literal `get-curriculo-url:205`; o Postgres não devolve LOG/NOTICE pela Management API, então a linha de RPC não é testável |
| Detectar tombstone/fictício (sem contato, sem cadastro) | API / Backend (EF) | Browser (Invariante 4 como segunda trava) | O marcador nunca deve chegar ao navegador (Invariante 9 da 45) |
| Faixas do Big Five sem percentil | Database (RPC projeta só `dim`/`banda`/texto) | Browser (tipo sem `percentil`) | Invariante 1 + 2 da UI-SPEC; projeção é a trava principal |
| SJT MC sem gabarito | Database (RPC: etiqueta só da escolhida, ordem neutra) | Browser | D-21; Achado F2 |
| Normalizar celular/montar `wa.me`/`mailto:` | Browser (helpers puros) | — | Sem rede; regra num lugar só, testável |
| Abas com `?aba=` | Browser (React Router `setSearchParams(…, { replace: true })`) | — | Estado de navegação |
| Painel «avaliações concluídas» (D-27) | Browser (deriva de RPC existente) | — | D-27: **não muda status no banco** |
| Banco SJT v2 e retirada dos itens antigos | Database (migration de dados) | Script gerador local | Ledger + md5 (D-28) |
| Limpeza de teste | Database (DO único, gated) | Storage (Storage API) + Auth | Destrutivo, one-way |

## Standard Stack

### Core (tudo já instalado — **zero dependência nova**, UI-SPEC §Registry Safety)
| Library | Version (medida em `node_modules`) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 18.3.1 | UI | stack do projeto |
| react-router-dom | 6.30.1 | `useSearchParams` para `?aba=` | `SetURLSearchParams = (nextInit?, navigateOpts?: NavigateOptions) => void` `[VERIFIED: node_modules/react-router-dom/dist/index.d.ts:232]` |
| @radix-ui/react-tabs | 1.1.13 | 4 abas do hub | conteúdo inativo é **desmontado** por padrão (`forceMount` opcional) `[CITED: radix-ui.com/primitives/docs/components/tabs, release 0.1.1 «Unmount content within Tabs.Content when tab is inactive»]` — leitura de cada aba só dispara quando ela abre |
| @tanstack/react-query | 5.90.10 | leituras com staleTime 5 min, retry 2 | convenção do projeto |
| @supabase/supabase-js | 2.104.0 (front) · `esm.sh/@supabase/supabase-js@2` (EF) | RPC/EF | precedente `get-curriculo-url:54` |
| lucide-react | 0.487.0 | `Mail`, `Phone`, `MessageCircle`, `ExternalLink`, `ArrowLeft`, `LayoutDashboard`, `Check` | UI-SPEC |
| vitest | 4.1.9 | unidade/componente/guardas | `vite.config.ts` `test.include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']` |
| deno | 2.9.4 | `deno test` da EF nova | precedente `get-curriculo-url/index.test.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EF para cadastro/contato/inscrição | RPC SECURITY DEFINER com `RAISE LOG` | RPC é mais simples de provar por smoke SQL, mas (a) a D-11 diz «como no currículo», que é EF; (b) `RAISE LOG` vai para o log do servidor e **não** volta pela Management API (o projeto já registra que ela não devolve NOTICE — `20261005000001:79-81`), então «a linha existe e não carrega CPF» não seria testável; (c) a captura de nível LOG pelo Logs Explorer do Supabase é `[ASSUMED]`. Recomendo EF |
| Uma EF que também devolve devolutiva e SJT | EF só para dado pessoal + RPCs para avaliações | Separar mantém os três erros independentes da UI-SPEC («Recarregar contato/devolutiva/situações») e deixa o percentil/gabarito presos por projeção SQL testável em smoke |
| Fechar policies de RH sobre `candidatos` para o log ser a única porta | Manter policies, declarar residual | Fechar mudaria `CandidatosRHPage`, `KanbanBoard`, `useCandidaturas` — fora do escopo e da reversibilidade da fase |

**Installation:** nenhuma.

## Package Legitimacy Audit

Nenhum pacote externo é instalado nesta fase (UI-SPEC §Registry Safety: «Zero dependência npm nova»;
recusados explicitamente: máscara, highlight, linkify, ícones de marca). Gate não aplicável.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | nenhum pacote novo |

**Packages removed due to [SLOP] verdict:** none · **Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                         ┌───────────────────────── Navegador do RH (/rh/candidatos/:id?aba=…) ─────────────────────────┐
 clique no hub ────────► │ HubCandidatoRH                                                                              │
                         │  ├─ cabeçalho (fora das abas) ── useCadastroCandidatoRh(id) ──┐                              │
                         │  │     contato → helpers puros (wa.me / mailto)                │ mesma query key (1 chamada)  │
                         │  └─ Tabs (Radix, monta só a aba ativa)                          │                              │
                         │       ├─ Resumo ── hooks existentes (contexto, análise IA, CV, agendamento, decisão)          │
                         │       ├─ Cadastro e inscrição ── reusa useCadastroCandidatoRh ─┘                              │
                         │       ├─ Avaliações ── useScorecardCandidato (existente) + useSjtMcRh + useDevolutivaRh       │
                         │       └─ Histórico ── listar_historico_candidatura (existente)                                │
                         └───────────────┬──────────────────────────────┬───────────────────────────────┬──────────────┘
                                         │ functions.invoke (JWT)        │ rpc (JWT)                      │ rpc (JWT)
                                         ▼                               ▼                                ▼
                 ┌──────────────── EF ler-cadastro-candidato-rh ┐  ┌─ ler_sjt_mc_rh ───────────┐  ┌─ ler_devolutiva_bigfive_rh ─┐
                 │ 1 getUser (401)                              │  │ guard papel fail-closed   │  │ guard igual                 │
                 │ 2 usuarios_rh viva → rh/admin (403)          │  │ rh ⇒ is_active_rh_user()  │  │ projeta dim/banda/texto,    │
                 │ 3 uuid (400) · candidatura viva (404)         │  │ etiqueta só da escolhida  │  │ NUNCA percentil             │
                 │ 4 tombstone/@invalido.local → sem contato     │  │ ordem neutra (md5)        │  └─────────────────────────────┘
                 │ 5 leituras com projeção explícita             │  └───────────────────────────┘
                 │ 6 console.log({candidatura_id, rh_user_id,   │        ▲ lê scores_candidato.metadata.respostas
                 │               role}) — nunca valor            │        ▲ perguntas + perguntas_opcao_sjt (qualquer status)
                 └──────────────────────────────────────────────┘
                         ▼ service_role (só dentro da EF)
       candidatos · disponibilidade · respostas_formulario × perguntas_formulario × pergunta_opcao_metadata(tag='knockout') · vagas.titulo

 Fila de revisões (RH) ── ResponderRevisaoDialog (origem='humana_triagem') ── rpc ler_contexto_rejeicao_triagem_revisao(pedido)
                                                     └─ revisao_rejeicao.historico_rejeicao_id → historico_candidatura.criterio_texto
```

### Recommended Project Structure
```
src/features/hub-candidato/
├── components/   ContatoCandidatoHeader, DadosCadastroBloco, RespostasInscricaoBloco (novos); HubCandidatoRH (abas)
├── hooks/        useCadastroCandidatoRh.ts (invoke da EF; chave ['hub-candidato','cadastro', id])
├── services/     cadastroCandidatoRhService.ts (classe de erro própria; valida contrato; nunca ecoa valor)
└── lib/          contato.ts (normalizarCelularWhatsApp, montarLinkWhatsApp, montarMailto), formatos.ts (cpf, cep, celular, idadeEm), linkify.ts
src/features/avaliacao/
├── components/   BigFiveResultadoHub, SjtMcDetalhe, TextoComCitacoes, SairDaProvaButton (novos)
├── lib/          bigFiveRotulos.ts (DIM_LABEL/DIM_ORDER/BANDA_LABEL/BANDA_ORDER/BandaSegments/analogia extraídos da devolutiva)
└── services/     avaliacoesRhService.ts (RPCs ler_sjt_mc_rh, ler_devolutiva_bigfive_rh)
supabase/functions/ler-cadastro-candidato-rh/  index.ts + index.test.ts (clone de get-curriculo-url)
supabase/migrations/2026101?00000N_p52_*.sql   (B: leituras RH; C: banco SJT v2; D: limpeza; nomes RH2/RH3)
supabase/tests/p52_*.sql                        (smokes de acesso, banco, população)
scripts/p52_ensaio.cjs, scripts/geradores/gen-sjt-v2.py, scripts/geradores/tabela-comprimento-sjt.py
```

### Pattern 1: Guard fail-closed + helper vivo (RPC de leitura do RH)
**What:** papel resolvido com `coalesce`, `sub` obrigatório, `rh` exige `is_active_rh_user()` **antes** de qualquer busca.
**When to use:** as três RPCs novas do bloco B.
**Source (verbatim):** `supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql:624-640` `[VERIFIED: Read]`
```sql
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  v_uid  := (select auth.uid());
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.id = p_candidatura_id) THEN
    RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id USING ERRCODE = 'no_data_found';
  END IF;
```
Contrato de catálogo que os portões da 51 já cobram (`20261008000003:668-680`): `prosecdef`, `provolatile='s'`,
`proconfig = ARRAY['search_path=""']`, comentário presente, `anon` e `PUBLIC` sem EXECUTE, `authenticated` com
(REVOKE de `anon` **nominal** — o `pg_default_acl` concede EXECUTE a `anon` como grant direto). Recomendo
acrescentar, para o ramo `rh`, o filtro de candidatura viva (`deleted_at IS NULL AND is_rascunho = false`),
espelhando `rh_le_scores` e `get-curriculo-url` WR-06 — o `ler_resposta_caso_aberto_sjt` **não** filtra; decidir e
escrever a razão.

### Pattern 2: EF de leitura privilegiada com log redigido
**What:** clone de `get-curriculo-url`: autentica (`supabaseUser.auth.getUser()`, 401) → autoriza pela linha viva de
`usuarios_rh` (403) → valida `candidatura_id` uuid (400) → candidatura viva (404) → leituras com projeção explícita →
`console.log` só com ids e papel.
**Source (verbatim):** `supabase/functions/get-curriculo-url/index.ts:119-138` `[VERIFIED: Read]`
```ts
  const { data: rhRow, error: rhErr } = await supabaseAdmin
    .from("usuarios_rh")
    .select("role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (rhErr) {
    return errorResponse("SERVER_ERROR", "Falha ao verificar permissão.", 500);
  }
  const dbRole = (rhRow?.role as string | undefined) ?? null;
  const role = dbRole === "recrutador"
    ? "rh"
    : dbRole === "administrador"
      ? "administrador"
      : dbRole;
  if (role !== "rh" && role !== "administrador") {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
```
O log do precedente é `console.log("[get-curriculo-url] ok", { candidatura_id: candidaturaId, role })` (`:205`). Para um
**registro de acesso**, recomendo acrescentar o id do usuário RH (`rh_user_id: user.id`) — continua «só ids e papel»
(D-11) e passa a dizer **quem** abriu. Decisão do planejador (A3).

### Pattern 3: Retirada de itens antigos do banco SJT no mesmo apply
**What:** a bateria é «todo item `active` + `formato='mc'` do cargo» (`pontuar_sjt`: `WHERE p.status='active' AND
p.formato='mc' AND … p.cargo = v_cargo`) e o caso aberto é «o primeiro `caso_aberto` ativo do cargo»
(`SjtCasoAbertoScreen.tsx:123` `.find((p) => p.formato === 'caso_aberto')`). Item novo e antigo ativos juntos =
bateria dobrada **e** caso aberto ambíguo. Retirar = `status` ≠ `'active'` (não há CHECK; único valor vivo hoje é
`'active'` `[VERIFIED: PROD]`; o nome do novo valor — ex. `'retired'` — é `[ASSUMED]`, escolha do planejador).
**Pré-portão:** as vagas atingidas apontam por `cargo`, sem `itens_ids` (medido: `e897f709` → `social-media`,
`fdbe1a4a` e `629a5f31` → `sdr-social-seller`, `n_itens_ids = 0`) `[VERIFIED: PROD]`. Se alguma passar a usar
`itens_ids`, a retirada por cargo não a alcança — o pré-portão tem de recusar.

### Anti-Patterns to Avoid
- **`NOT IN` na exclusão por `usuarios_rh`:** um `user_id` nulo esvazia o resultado; usar `NOT EXISTS` (CONTEXT, trava da D-30).
- **Ler devolutiva ou SJT direto do cliente porque «a RLS deixa»:** as policies são de JWT (F5) e entregariam percentil/gabarito.
- **Ordenar alternativas por `ordem` na tela do RH** (F2).
- **`dangerouslySetInnerHTML`/markdown em runtime** para citações e links (Invariante 5).
- **Reaproveitar o `p47_teardown` sem re-medir** (F10): contagens 41/33 e o grafo de FK são fotografia de 2026-09-07.
- **`status='arquivada'` como «tirar do ar»** (F18).

## Bloco A — onde mora cada item (arquivo:linha medido nesta sessão)

| Item | Onde | Situação hoje | Nota para o plano |
|---|---|---|---|
| (a) Painel desatualizado | `DashboardCandidatoPage.tsx:102-103` (`'aguardando_resposta'` → «Aguardando Resposta»), `:154-155` («Continuar para {label}»), `:470-479` (CTA/`span` neutro) | Deriva só de `etapa_atual`/`status` | Reusar **as mesmas** chaves de query do container (`['avaliacao','context',id]`, `['avaliacao','status',id]` — `AvaliacaoContainer.tsx:474-486`) para herdar as invalidações de `marcarInstrumentoRegistrado`; exportar `deriveCards` (`:410`) e uma função pura `avaliacoesConcluidas(cards)` (a regra `allDone` de `:199-200`). Só para `etapa_atual='avaliacao_assincrona'` e não encerrada. Na Consultor só observável após o bloco C (F7) |
| (b) «modelo modelo» | `ProvenienciaIABadge.tsx:60-66,109-126` | `primario: 'Gerado pelo modelo {modelo}'` + `modeloDesconhecido: 'modelo não registrado'` | Ramo próprio para `modeloIa == null` (frase inteira), parâmetro opcional de data (F14); o ban «Gerado pelo modelo modelo» varre `src/` inteiro |
| (c) contagem duplicada | `HubCandidatoRH.tsx:442-444` + `AvaliacoesRespondidasBloco.tsx:58-60` | duas frases | `AvaliacoesRespondidasBloco` sai do hub (D-52-U03); seu único consumidor de `ScorecardAvaliacao` some — `hubVerRespostas.test.tsx` é **substituído** |
| (d) saída durante a prova | SJT MC (`SjtMultiplaEscolhaScreen.tsx:143`), Raven (`AvaliacaoRavenScreen.tsx:88`), Prova cognitiva (`ProvaCognitivaScreen.tsx:150`) em memória; Big Five/Redação/Caso com autosave | sem botão no fluxo | Um `SairDaProvaButton` (UI-SPEC). Telas com autosave: `await flushNow()` antes de navegar (o debounce é 30 s e o flush de unmount é `void flush()`, fogo-e-esquece — `useAutosaveAvaliacao.ts:123-140`). Prova cognitiva: **confirmação** (F1, O1) |
| (e) «Tempo sugerido» | `SjtMultiplaEscolhaScreen.tsx:225` e docblock `:9` | `Tempo sugerido: {mmss(seconds)} (sem limite rígido)` | Vira «Tempo decorrido: {mm:ss} (sem limite de tempo)» (D-26 + D-52-U20); o ban varre `src/features/avaliacao/` — o docblock `:9` também diz «Tempo sugerido» (comentário; decidir se a varredura ignora comentários, como a guarda de rótulos faz) |
| (f) devolutiva reabrível | `BigFiveQuestionnaireScreen.tsx:394` (só no redirect); rota `routes.tsx:289` `/candidato/avaliacao/:candidaturaId/bigfive/devolutiva`; cards `AvaliacaoContainer.tsx:318-329` | sem caminho | Botão no card `big_five` concluído e no «Tudo concluído» (`:269-288`) |
| Raven fora da shell | `AvaliacaoRavenScreen.tsx:207` (`div` solto), `:41-43` (`subtitulo`, `semVolta`), `:170,186,216` (`font-bold`), `:246-248` (classe de grade montada por template — o JIT não a gera) | — | `COPY.voltar: 'Ir ao painel'` já existe (`:51`); a confirmação de perda usa `Object.keys(respostas).length > 0 || escolha !== null` (decidir) |
| BARS pré-marcados + jargão | `EntrevistaScorecardInline.tsx:110-112` (`clampScore(c.ia)` inicial), `:136` («BARS sliders 1–5 — notas_humanas. A decisão é sempre humana.»), `:195-204` (`Slider`), `:236` (`disabled={saving \|\| semAnalise \|\| semNotas}`) | — | Estado inicial `{}`; `semNotaFaltante = competencias.some(c => scores[c.key] == null)` entra no `disabled`; nenhum valor de `competenciasIA[].score` vira estado (F13 residual) |
| Menu ativo | `RHSidebar.tsx:106-127` | `/rh/candidato/:id/*` cai em `'dashboard-rh'` | `pathname.startsWith('/rh/candidato/')` → `'candidatos-rh'`; extrair a função (F17) |
| `LoginCandidatoPage` | `LoginCandidatoPage.tsx:126-130` (já consome `resolveRedirect`); `authStore.ts:75-83` (`isLoading`, `isAuthenticated`, `role`) | mostra o formulário a quem está logado | Reusar `resolveRedirect` (`features/auth/utils/resolveRedirect.ts:35-60`, guarda anti-open-redirect), não um `startsWith` novo |
| «Meu painel» | `src/components/layouts/CandidatoNavbar.tsx` (131 linhas) | sem volta | Fora das raízes da guarda de rótulos (`SCAN_ROOTS = ['src/features/avaliacao', 'src/features/avaliacao-cognitiva']`, `rotulos-navegacao-candidato.grep.test.ts:38`) |
| «Agradecemos» | `FormularioCandidaturaPage.tsx:537-546` (`text-gray-900/700/500`) | ilegível no vidro | `DashboardCandidatoPage.tsx:428-430` já é `text-white/60` — não mexer |
| `SelectItem` | `src/components/ui/select.tsx:130-136` | força `text-white` em hover/foco | UI-SPEC D-52-U21; provar nos dois fundos |
| RH2/RH3 | `usuarios_rh`: linha `88b16cda` (user `66412f96`, `administrador`) = «RH2»; `6e859f63` (user `af4ebf97`, `recrutador`) = «RH3» `[VERIFIED: PROD]` | — | **Dado**, sem tela de edição de nome (`gerenciar-usuario-rh` só tem `criar`, `resetar_senha`, `desativar`, `mudar_papel`). Recomendo **migration minúscula** com pré-portão nos valores atuais (artefato no ledger), não UPDATE avulso. A direção da troca é `[ASSUMED]` (O6) |
| Motivo/justificativa `humana_triagem` | `ResponderRevisaoDialog.tsx:321-348` (bloco de contexto), `:350` (`ContextoKnockoutRevisao` só no knockout) | — | **Bloco B** (F3). Motivo: `candidaturas.motivo_rejeicao` (pode ser reescrito numa re-rejeição posterior — A5); rótulo por `MOTIVO_OPTIONS` (`RejeitarCandidaturaDialog.tsx:56-63`) exportado |

## Bloco B — fontes de cada dado e o caminho de leitura

### Fontes (colunas medidas em `information_schema`, PROD, 2026-10-10)

| Dado | Tabela.colunas | RLS para RH hoje | Caminho recomendado |
|---|---|---|---|
| Cadastro | `candidatos`: `nome_completo`, `email`, `cpf`, `celular`, `data_nascimento`, `genero`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `linkedin_url`, `linkedin`, `instagram_url`, `instagram`, `como_conheceu`, `como_conheceu_detalhes` (+ `user_id`, `id` para tombstone) | sim, `"RH pode ler todos os candidatos"` (helper equivalente inline) | EF |
| Disponibilidade | `disponibilidade`: `periodo_disponivel`, `regime_trabalho`, `disponibilidade_imediata`, `data_disponibilidade` (por `candidato_id`) | sim | EF |
| Inscrição | `perguntas_formulario` (`id`, `bloco`, `ordem`, `texto_pergunta`, `tipo_resposta`, `deleted_at`, `vaga_id`) × `respostas_formulario` (`pergunta_id`, `resposta_texto`, `resposta_opcoes` **array de textos**, `resposta_numerica`) × `pergunta_opcao_metadata` (`pergunta_id`, `tag`) | sim (as duas primeiras); a terceira por JWT | EF — `eliminatoria = EXISTS (… tag = 'knockout')`, **nunca** a opção |
| Vaga (para as frases de contato) | `vagas.titulo` | sim | EF |
| Big Five | `devolutivas_candidato.conteudo_jsonb` (1 por candidatura, `UNIQUE (candidatura_id)`): chaves `cabecalho.dashboard[] {dim, banda, percentil}`, `paginas[] {dim, banda, palavras, percentil, texto_interpretativo}`, `disclaimer_emocional`, `disclaimer_lgpd_crp` | por JWT (F5) | RPC `ler_devolutiva_bigfive_rh` |
| SJT MC | `scores_candidato` (`tipo='sjt'`, `subtipo='mc'`).`metadata.respostas[] {pergunta_id, opcao_id, tag, peso}` × `perguntas.cenario` × `perguntas_opcao_sjt (opcao_id, opcao_texto)` | `rh_le_scores` (helper vivo) + bank por JWT | RPC `ler_sjt_mc_rh` |
| Caso aberto | `ler_resposta_caso_aberto_sjt` (existente) + `scores_candidato.citacoes`/`metadata.dimension_scores` | existente | sem mudança de leitura; só apresentação (D-22) |

Valores medidos que entram em mapas/códigos: `tipo_resposta_pergunta` = `texto_curto,texto_longo,single_choice,multiple_choice,numerico`;
`enum_tag_opcao` = `knockout,atencao,neutro,pontua,fortemente_pontua`; `status_score` = `sucesso,pendente_humano,falhou`
`[VERIFIED: PROD pg_enum]`. `bloco` vivos: `curriculo`, `jornada`, `tecnologia`, `valores`; `ROTULO_BLOCO` =
`{ curriculo: 'Sobre sua experiência', jornada: 'Disponibilidade', tecnologia: 'Ferramentas e rotina', valores: 'Motivação' }`
(`FormularioCandidaturaPage.tsx:82-87`) `[VERIFIED: Read]`; `groupByBloco` preserva a ordem de inserção a partir de
`ORDER BY ordem ASC` (`:99-114`) — a EF tem de devolver as perguntas **já** em `ordem ASC`. Preenchimento (46 candidatos):
`cpf` 27, `genero` 17, `linkedin_url` 0, `linkedin` 1, `instagram_url` 0, `instagram` 2, `como_conheceu` 26 — «Não informado»
em massa é verdade, não defeito (UI-SPEC E3). Rótulos do Big Five a extrair: `DevolutivaBigFiveView.tsx:38-64` (`DIM_LABEL`
`O: 'Abertura à Experiência' … N: 'Sensibilidade Emocional'`; `BANDA_LABEL` `muito_baixo: 'Muito baixo'`, `mod_baixo:
'Moderadamente baixo'`, `medio: 'Médio'`, `mod_alto: 'Moderadamente alto'`, `muito_alto: 'Muito alto'`) `[VERIFIED: Read]`.

### Contrato de resposta sugerido (o planejador fixa)
- **EF** → `{ ok: true, vaga_titulo: string|null, contato: { email: string|null, celular: string|null } | null, cadastro: {…19 campos…} | null, disponibilidade: {…4 campos…} | null, inscricao: Array<{ pergunta_id, bloco, ordem, texto_pergunta, tipo_resposta, eliminatoria: boolean, removida: boolean, resposta: { texto?: string, opcoes?: string[], numero?: number } | null }> }`. `contato`/`cadastro` nulos para tombstone; `email` nulo para `@invalido.local`. Sem `user_id`, `id` do candidato, `deleted_at`, nem a opção eliminatória.
- **`ler_devolutiva_bigfive_rh`** → `{ situacao: 'disponivel'|'sem_big_five'|'sem_devolutiva', dimensoes: [{ dim, banda, texto_interpretativo }], disclaimer_emocional, disclaimer_lgpd_crp }` — construído por `jsonb_build_object` explícito (allowlist), nunca `conteudo_jsonb - 'percentil'`.
- **`ler_sjt_mc_rh`** → `{ itens: [{ pergunta_id, cenario, alternativas: [{ opcao_id, texto, escolhida: boolean }], escolhida_tag, escolhida_peso, escolhida_no_banco: boolean }] }` — `tag`/`peso` só da escolhida; alternativas por `md5(pergunta_id::text || opcao_id::text)`; perguntas **sem** filtro de `status` (as respostas de teste apontam para itens que o bloco C retira).
- **`ler_contexto_rejeicao_triagem_revisao(p_pedido_id)`** → `{ situacao, motivo, justificativa }`, recusa `origem` ≠ `'humana_triagem'` com `no_data_found`, helper do `rh` antes da busca (portão da 51: «oráculo de existência»).

### Sequência de deploy (memória «deploy cuja próxima etapa não tem plano»)
`migration (RPCs) → EF → front`. As duas primeiras são aditivas e ninguém as chama até o front sair; o front só é
empurrado depois das duas no ar, e o plano que empurra tem de **existir** nesta fase. `database.types.ts` regenerado (ou
cast confinado) no mesmo plano que consome as RPCs.

## Bloco C — banco SJT v2 (pré-vendas + marketing)

- **Padrão a seguir:** `20260929000001_banco_sjt_marketing.sql` — gerado, não transcrito; `perguntas (tipo, cargo,
  dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)` + `perguntas_opcao_sjt (pergunta_id,
  opcao_id, opcao_texto, tag, peso, ordem)`; idempotente por `content_hash` = sha256(cenário + textos das opções);
  `rubric` do caso aberto com `banda {avanca:18, entrevista:13, score_max:25}` e dimensões somando 100; texto **sem
  markdown** (o gerador limpa `**`/`*`/`` ` ``). Pesos por etiqueta 4/2/1/0.
- **Fonte do conteúdo de pré-vendas:** `docs/conhecimento/sjt/banco-sjt-sdr-social-seller.md` (v1.0, «3 múltipla escolha
  + 1 work-sample de WhatsApp», eixo «meta de agendamento × qualificação honesta») — só 1 dos 3 MC foi carregado em PROD;
  e o conteúdo publicado da vaga `fdbe1a4a` (`sobre_cargo`, `responsabilidades`, `perfil_ideal` existem e têm texto). O
  banco tem de chegar a 6 MC + 1 caso (D-28). `[VERIFIED: arquivo + PROD comprimentos]`
- **Peso real:** `fdbe1a4a` `work_sample_sjt = 15`, `e897f709` = 35, `629a5f31` = 35 `[VERIFIED: PROD pesos_avaliacao]`.
- **Gerador v2:** parametrizar caminho e contagem esperada por cargo (o atual tem `assert len(itens)==21` e caminho fixo do
  `DRAFT`). O texto aprovado nasce em **arquivo novo** (F16). Recomendo o gerador v2 atribuir `ordem` por permutação
  determinística (semente = `content_hash`) para quebrar a escada da F2 nos itens novos.
- **Tabela de caracteres (D-34) reproduzível:** script `scripts/geradores/tabela-comprimento-sjt.py <arquivo.md>` que
  **reusa o parser do gerador** (mesma `limpa()`, mesmo split por `## Cargo`/`### `), conta `len(str)` em Python (pontos de
  código = `char_length` do Postgres; **não** `length` em bytes — memória «length conta caracteres, Buffer conta octetos»),
  e imprime por item: as 4 contagens, a razão `fortemente_pontua ÷ média(outras 3)`, o **posto** da `fortemente_pontua`
  (1 = mais longa), e por cargo a fração de itens em que ela é a mais longa. Prova cruzada: depois do apply, a mesma tabela
  por SQL (`char_length(o.opcao_texto)`) tem de bater item a item. Auto-teste do script: um item fabricado com a certa
  2× maior tem de sair marcado (o portão morde).
- **Critério numérico a propor ao operador (D-34 deixou aberto):** por item, `0,90 ≤ razão ≤ 1,10` **e** amplitude
  (máx − mín) ≤ 25% do mín; por cargo, a `fortemente_pontua` é a mais longa em **no máximo 2 de 6** itens (≈ acaso, 1/4).
  Medido: o rascunho de 30/09 passa na razão em 5 de 18 itens e falha o posto (14 de 18) — F8. `[ASSUMED: limiares]`
- **Retirada (D-35 b):** no mesmo arquivo, depois dos INSERTs: `UPDATE public.perguntas SET status = '<retirado>' WHERE
  tipo = 'sjt' AND cargo IN (<cargos v2>) AND status = 'active' AND content_hash <> ALL (ARRAY[<hashes v2>])`. Hoje todo
  item tem `content_hash` (medido), então `<> ALL` não cai em NULL — **mas** o pós-portão tem de provar por contagem por
  cargo: exatamente 6 `mc` + 1 `caso_aberto` ativos, e os retirados = o conjunto medido no pré-portão (baseline capturada
  na execução, não constante). Itens retirados continuam lidos pelo RH (`ler_sjt_mc_rh` sem filtro de status) e pelo
  `avaliar-redacao` (lê `perguntas` por `id`, sem status — `avaliar-redacao/index.ts:327-336`).
- **Efeito colateral a ensaiar:** candidato com prova aberta no momento do apply recebe erro em `get_opcoes_sjt`
  (`'pergunta inexistente ou inativa'`, `42704`) e `pontuar_sjt` recusa (`'pergunta fora da bateria'`). Sem candidato
  real hoje; aplicar fora de sessão de UAT em curso.
- **Ordem C × D (D-35 a):** C antes do UAT; o UAT usa contas de teste que respondem o banco novo; D por último limpa tudo
  (inclusive as respostas de UAT). As respostas antigas (8 linhas `sjt`) apontam para itens retirados — continuam legíveis
  até D.
- **Caso aberto de marketing:** se o texto não mudar, o gerador re-emite o mesmo `content_hash`, o `WHERE NOT EXISTS` pula,
  e a retirada (que exclui os hashes v2) não o toca. Decisão do planejador mostrada no portão (D-35).

## Bloco D — população, grafo e portão

### Varredura status-agnóstica (duas entradas + trava), só leitura
```sql
-- esqueleto; padrões = lista do p47 (p47_teardown_dados_de_teste.sql:87-98) como SEMENTE, mostrada no portão
with rh as (select u.user_id from public.usuarios_rh u),
cand_i as (            -- entrada (i): conta casa padrão de teste
  select c.id from public.candidatos c
   where c.email like any (array[ /* padrões do p47, menos o do admin, que a trava já cobre */ ])
     and not exists (select 1 from rh where rh.user_id = c.user_id)),
vaga_teste as (
  select v.id from public.vagas v where v.titulo ilike '%[TESTE%' or v.slug ilike 'teste-%'),
cand_ii as (           -- entrada (ii): toda candidatura em vaga de teste, qualquer conta
  select k.candidato_id as id from public.candidaturas k join vaga_teste t on t.id = k.vaga_id
   where not exists (select 1 from public.candidatos c join rh on rh.user_id = c.user_id where c.id = k.candidato_id)),
excluidos as (         -- contagem da trava (vale sobre as duas entradas)
  select c.id from public.candidatos c where exists (select 1 from rh where rh.user_id = c.user_id))
select …  -- (i)∩(ii), (i)−(ii), (ii)−(i), |excluidos|, candidaturas, vagas de teste com colisão, objetos de Storage
```
Medido hoje (fotografia, re-medir): com a semente do p47, **(ii) − (i) = ∅** e **(i) − (ii)** = as contas sem candidatura
em vaga de teste (inclusive as das vagas ativas e as 16 sem candidatura); a trava exclui **1** conta (`d8ef9db1`, 3
candidaturas); as 8 fixtures `fixture-p46+%` **não** casam nenhum padrão do p47 (desenho dele) e as 3 vagas
`fixture-p46-*` não casam `teste-%` — a fronteira com o teardown próprio delas (`p46_teardown_fixture.sql`) é mostrada,
não decidida. `[VERIFIED: PROD]`

### Grafo de FK (medido em `pg_constraint`, PROD) — o que bloqueia
- `candidaturas ←` **NO ACTION**: `historico_candidatura`, `decisao_final`, `decisao_final_historico`, `retencao_hold`,
  **`revisao_rejeicao`** (nova, ausente do p47). Todo o resto (≈ 25 tabelas: scores, respostas, devolutivas, agendamentos,
  entrevistas, cognitivo, notificações…) é CASCADE.
- `candidatos ←` NO ACTION: `solicitacoes_dados`; CASCADE: `candidaturas`, `disponibilidade`, `autorizacoes`,
  `notificacoes_enviadas`; SET NULL: `ai_call_logs`, `candidate_ai_decisions`, `recruiter_alerts`.
- `vagas ←` NO ACTION: `agendamentos_entrevista`; **CASCADE: `candidaturas`** — remover uma vaga de teste apaga as
  candidaturas da conta excluída pela trava (`53f75c81`, `53b73af6`): é a colisão da D-30, por FK, não só por intenção.
- `auth.users ←` CASCADE: `devolutivas_candidato` (o `candidato_id` dela é o **auth uid**), `usuarios_rh`, sessões;
  NO ACTION: `historico_candidatura.ator`, `decisao_final.por_usuario`, `created_by`/`updated_by` de várias tabelas.
- Não há trigger de DELETE nas tabelas do caminho (só UPDATE) `[VERIFIED: information_schema.triggers]`.

### Método recomendado: teardown (não o motor Art. 18)
O motor (`executar-direito-titular`) **anonimiza** e guarda trilha (BD-9): deixa tombstones e as candidaturas
continuam nas vagas ativas, visíveis ao RH (como `dae837f4` hoje). Para «limpar antes de abrir», o teardown em um
`DO` único (molde p47: resíduo ≠ 0 ⇒ exceção; fixtures/RH intactos ⇒ exceção se tocados) é o que cumpre o objetivo.
Tombstones existentes (`dae837f4`, `a111296a`, `c912aa17`) entram na lista do portão com proposta explícita (achado 3 da
D-30).

### Storage
Capturar a lista de caminhos no artefato aprovado **antes** do DELETE; remover **depois** que o DELETE confirmar (a
transação de banco é a parte atômica e gated; a remoção de objeto é idempotente e repetível). Remoção só pela Storage API
com `service_role` — EF admin de uso único, ou script local que obtém a chave pela Management API sem imprimi-la (O4).
`[ASSUMED: endpoint/forma]`

### Portão (molde 51-23)
`DECISAO.md` (com `população_md5_aprovado`) + `POPULACAO.json` (ids/categorias, **sem** e-mail/nome) + `COMANDO-APPLY.sh`
encadeado por `&&`: (0) artefatos commitados e no pin → (i) medição só-leitura pela **mesma** query da varredura → (ii)
comparação com o aprovado (md5 e contagens; recusa «POPULAÇÃO DIFERE DA APROVADA») → (iii) portão de review → (iv)
`p46apply.cjs migrate`. Prova pós: resíduo 0 por entrada; trava intacta (3 candidaturas de `d8ef9db1`); fixtures 8;
contagem de `curriculos` = antes − aprovados. PITR **desligado** (`pitr_enabled:false`, backups diários `walg`, último
2026-10-10T06:29Z) e Storage fora do backup `[VERIFIED: Management API /database/backups]`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Autorização RH viva na EF | papel lido de `getUser().app_metadata` | linha de `usuarios_rh` (`get-curriculo-url:119-138`) | o claim `role` só existe no JWT assinado; `raw_app_meta_data` é nulo |
| Guard de RPC | `NOT IN` sobre papel nulo | `coalesce(v_role,'') NOT IN (…)` + `is_active_rh_user()` antes da busca | `NOT IN` falha **aberto** com claim nula (42-06) |
| Anti-open-redirect no login | `startsWith('/candidato/')` | `resolveRedirect` | já cobre `//`, `/\`, controle, espaço, origem |
| Marcação de citação / links | regex + `innerHTML`, lib de highlight/linkify | segmentos `string`/`<mark>`/`<a>` (UI-SPEC Invariante 5/6) | XSS; UI-SPEC proíbe dependência nova |
| Apply de migration | colar no SQL Editor / MCP `apply_migration` | `p46apply.cjs migrate` | md5 do ledger; comentários preservados |
| Deploy de EF | MCP `deploy_edge_function` | `efdeploy.cjs` | arquivos lidos do disco |
| Ensaio em PROD | transação manual | cópia de `scripts/p51_ensaio.cjs` → `p52_ensaio.cjs` | sentinela que aborta + guarda de transação + `capturar()` antes/depois |
| Tabela de caracteres | contagem manual / planilha | script que reusa o parser do gerador | mesma limpeza de markdown que vira texto no banco |
| Remoção de CV | `DELETE FROM storage.objects` | Storage API | trigger `protect_objects_delete`; blob órfão |

**Key insight:** quase tudo que esta fase precisa já tem molde vivo no repositório (EF do currículo, RPC do caso aberto,
contexto do knockout, ensaio da 51, teardown da 47, portão destrutivo da 51-23). O risco não é falta de padrão — é
copiar uma **fotografia** junto com o padrão (contagens fixas, lista de FK, lista de telas com rascunho, ordem do banco).

## Runtime State Inventory

> Aplica-se aos blocos C (dados de configuração) e D (dados de usuário). Bloco B cria funções (sem estado); bloco A é código.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Bloco C: 21 itens de marketing + 1 de `sdr-social-seller` ativos; 8 linhas `scores_candidato tipo='sjt'` apontando para itens que serão retirados. Bloco D: 46 `candidatos`, 43 `candidaturas` (populações por categoria em F9), devolutivas por `auth uid`, `historico_candidatura`/`decisao_final*`/`revisao_rejeicao`/`retencao_hold` (NO ACTION) | C: retirada por `status` no mesmo apply (dados, não código); D: DELETE em ordem de FK, re-medido |
| Live service config | Vagas `ativa`/`inativa`/`arquivada` editáveis pela `VagasRHPage` («Ativar» direto, F18); `testes_aplicaveis` por `cargo` sem `itens_ids` | D-32: `deleted_at`/remoção/reaponte para `629a5f31`; pré-portão do C recusa vaga atingida com `itens_ids` |
| OS-registered state | Nenhum — verificado: o projeto não usa cron local; os jobs vivos são `pg_cron` no banco (purga), que não leem banco SJT nem as contas de teste por padrão de e-mail | nenhum |
| Secrets/env vars | Nenhum nome muda. A remoção de Storage precisa de `service_role` **em tempo de execução** (O4) | decidir a via; nunca gravar a chave em arquivo |
| Build artifacts | `database.types.ts` não conhece as RPCs novas até regenerar; bundle da Vercel só muda com push | regenerar com `< /dev/null`; conferir marcador no chunk lazy de `/rh/*` |

## Common Pitfalls

### Pitfall 1: confiar na lista de telas «com rascunho» da D-24
**What goes wrong:** botão «Voltar às avaliações» na prova cognitiva sai direto e apaga as respostas em memória.
**Why:** a lista foi escrita de memória; o código diz o contrário (F1).
**How to avoid:** derivar do código (`grep -rn "useAutosaveAvaliacao(" src`) e testar: com ≥1 resposta, as três telas sem rascunho abrem o diálogo.

### Pitfall 2: gabarito pela ordem
**What goes wrong:** a alternativa certa sempre em primeiro no hub (F2).
**How to avoid:** ordenação neutra no servidor; teste com fixture onde a certa é `ordem 1` prova que ela não fica sistematicamente em primeiro (ex.: em 4 itens fabricados, a posição da `fortemente_pontua` varia).

### Pitfall 3: o percentil entra pelo tipo ou pela rede
**How to avoid:** tipo do `BigFiveResultadoHub` sem `percentil`; RPC com `jsonb_build_object` explícito; teste que monta com `percentil: 87` e não acha `87`; varredura do ban sobre os componentes do Big Five do hub. Rede de `getScores` = O5.

### Pitfall 4: tombstone renderizado como cadastro
**What goes wrong:** «01/01/1900 (126 anos)», «[removido]», WhatsApp «fora do formato» (F6).
**How to avoid:** predicado do motor na EF; teste de EF com a linha tombstone devolvendo `cadastro: null` e `contato: null`.

### Pitfall 5: população vazia nas provas de acesso
**What goes wrong:** «rh_inativo vê 0» passa porque a candidatura escolhida não tem devolutiva/SJT.
**How to avoid:** os atores e as candidaturas do smoke são escolhidos **na execução** com população > 0 (molde `p50_acesso_recrutador_smoke.sql`), e cada cláusula publica a contagem como `postgres`. Hoje: 3 devolutivas, 8 linhas `sjt` em PROD.

### Pitfall 6: retirada que não retira (ou retira demais)
**How to avoid:** pós-portão por cargo (6 `mc` + 1 `caso_aberto` ativos) e conjunto retirado = baseline do pré-portão; mutação que deixa um antigo ativo tem de reprovar.

### Pitfall 7: o draft não commitado some num `git add -A`/`stash`
**How to avoid:** regra escrita no despacho de todo executor: só `git add <arquivos enumerados>`; o texto v2 em arquivo novo (F16). A working tree também tem `AGENTS.md`, `docs/vagas/` e `.planning/ui-reviews/.gitignore` alheios à fase.

### Pitfall 8: critério de comprimento só por razão
**What goes wrong:** razão 1,05 em todos os itens, mas a certa é a mais longa em 6 de 6 — o candidato ainda acerta pelo tamanho.
**How to avoid:** critério com **posto** por cargo (§Bloco C).

### Pitfall 9: teardown por fotografia
**What goes wrong:** p47 aborta (41 ≠ 46) — bom — ou alguém «ajusta as constantes», e a ordem sem `revisao_rejeicao` quebra com 23503 numa candidatura revisada.
**How to avoid:** grafo de FK lido na execução; md5 da população aprovada (não contagem fixa); resíduo 0 ou exceção.

### Pitfall 10: «arquivar» que não arquiva
**What goes wrong:** `status='arquivada'` e um clique em «Ativar» republica a mina (F18).
**How to avoid:** propor `deleted_at` ou remoção (após limpar `d31c78bb`) ou reapontar o cargo; mostrar no portão.

### Pitfall 11: log que vira vazamento
**What goes wrong:** `console.log` com o objeto de resposta ou a mensagem de erro do PostgREST contendo valor.
**How to avoid:** teste Deno com espião de `console.log`/`console.error` asserindo as **chaves** exatas (`candidatura_id`, `rh_user_id`, `role`) e que nenhum valor de fixture (CPF, CEP, e-mail) aparece em nenhuma chamada.

### Pitfall 12: «Tempo sugerido» sobrevive em comentário
**How to avoid:** decidir se o ban ignora comentários (como `rotulos-navegacao-candidato`) e atualizar o docblock `SjtMultiplaEscolhaScreen.tsx:9` de qualquer forma.

## Code Examples

### 1. Detecção de tombstone na EF (predicado do motor, verbatim de `51-23-COMANDO-APPLY.sh:34`)
```ts
// SQL de referência (verbatim): c.email = 'anonimizado+' || c.id::text || '@invalido.local'
//                                and c.user_id is null and c.data_nascimento = date '1900-01-01'
function ehTombstone(c: { id: string; email: string; user_id: string | null; data_nascimento: string | null }) {
  return c.user_id === null && c.email === `anonimizado+${c.id}@invalido.local` && c.data_nascimento === '1900-01-01'
}
const semContato = (email: string) => email.toLowerCase().endsWith('@invalido.local') // Invariante 4
```

### 2. Log redigido (forma do precedente `get-curriculo-url:205`, com o id do RH)
```ts
console.log('[ler-cadastro-candidato-rh] ok', { candidatura_id: candidaturaId, rh_user_id: user.id, role })
```

### 3. WhatsApp e `mailto:` (regra da UI-SPEC §Cabeçalho de contato)
```ts
export function normalizarCelularWhatsApp(celular: string | null | undefined): string | null {
  const d = (celular ?? '').replace(/\D/g, '')
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  if ((d.length === 10 || d.length === 11) && d[0] !== '0') return `55${d}`
  return null // inválido → sem botão, com a frase da Invariante 7
}
export const montarLinkWhatsApp = (numero: string, msg: string) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
// mailto: validar o endereço antes (um '?' ou '&' no valor gravado injetaria cabeçalho: &bcc=…)
export const montarMailto = (email: string, assunto: string) =>
  /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)
    ? `mailto:${email}?subject=${encodeURIComponent(assunto)}` : null
```
Observação: o tombstone tem `celular='(00) 00000-0000'` → `'00000000000'` → 11 dígitos começando com `0` → `null`. Mas o
caminho certo é a EF já devolver `contato: null` para ele (Pitfall 4).

### 4. Links por segmento (Invariante 6)
```tsx
const URL_RE = /https?:\/\/[^\s<>"']+/g
function segmentos(texto: string): Array<string | { href: string }> {
  const out: Array<string | { href: string }> = []; let i = 0
  for (const m of texto.matchAll(URL_RE)) {
    let url = m[0]; const ini = m.index!
    while (/[.,;:)]$/.test(url)) url = url.slice(0, -1)   // pontuação final fica fora
    out.push(texto.slice(i, ini), { href: url }); i = ini + url.length
  }
  out.push(texto.slice(i)); return out.filter((s) => s !== '')
}
// render: typeof s === 'string' ? s : <a href={s.href} target="_blank" rel="noopener noreferrer">…</a>
// `javascript:`/`data:` nunca casam URL_RE → ficam texto.
```

### 5. Alternativas em ordem neutra (RPC `ler_sjt_mc_rh`, trecho)
```sql
SELECT jsonb_agg(jsonb_build_object('opcao_id', o.opcao_id, 'texto', o.opcao_texto,
                                    'escolhida', o.opcao_id = v_escolhida)
                 ORDER BY md5(o.pergunta_id::text || o.opcao_id::text))
  FROM public.perguntas_opcao_sjt o
 WHERE o.pergunta_id = v_pergunta;      -- sem tag, sem peso: o gabarito não sai
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Big Five no hub só «Concluído/Não fez» (D-32/51, D-31/49) | faixas da devolutiva + texto recolhível, sem percentil (D-01, D-04) | 2026-10-10 | testes que travavam «sem resultado» são **substituídos** (`ScorecardAvaliacao.test.tsx`, `hubVerRespostas.test.tsx`, `estadosAvaliacao.test.ts` segue — é a lista) |
| SJT MC «Item N · tag · peso» | cenário + alternativas + escolhida | 2026-10-10 | etiqueta crua sai da tela |
| Apply por SQL Editor/MCP | `p46apply.cjs` + ensaio que aborta | Phase 46 | — |
| Teardown com contagem fixa (p47) | md5 da população aprovada + comando encadeado (51-23) | Phase 51 | usar o 51-23 como portão, o p47 como corpo |

**Deprecated/outdated:** o `UPDATE … SET version` dos cabeçalhos antigos (CLAUDE.md); a afirmação do CONTEXT sobre e-mail/celular nunca lidos pelo RH (F4).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O valor de `status` para item retirado (`'retired'`) | Bloco C | Baixo — qualquer ≠ `'active'` funciona; só vocabulário |
| A2 | Limiares do critério de comprimento (0,90–1,10; posto ≤ 2 de 6; amplitude ≤ 25%) | Bloco C | Médio — operador decide no portão (D-34) |
| A3 | Incluir `rh_user_id` na linha de log | Pattern 2 | Baixo — ainda «só ids e papel»; se recusado, volta ao formato do currículo |
| A4 | Captura de `RAISE LOG` pelo Logs Explorer do Supabase | Alternatives | Só importa se o planejador escolher RPC para o log |
| A5 | `candidaturas.motivo_rejeicao` como fonte do motivo no diálogo `humana_triagem` | Bloco A/B | Médio — pode ter sido reescrito por re-rejeição posterior; no pedido pendente é o certo |
| A6 | Direção da troca RH2/RH3 (recrutador `af4ebf97` → «RH2», admin `66412f96` → «RH3») | Bloco A | Baixo — confirmar com o operador antes do apply |
| A7 | Via de `service_role` para a remoção de Storage (EF de uso único vs. chave obtida pela Management API em memória) | Bloco D | Médio — segurança operacional |
| A8 | Retenção dos logs de EF (dias, não auditoria) | Security | Baixo — D-11 já aceitou «linha de log», não trilha |

## Open Questions

1. **O1 — Prova cognitiva entra na confirmação de perda?** O que sabemos: não tem rascunho (F1). Recomendação: sim, mesmo `AlertDialog` do SJT MC, rótulo «Voltar às avaliações». Levar ao operador como correção da lista da D-24.
2. **O2 — Legenda e ordem das alternativas do SJT MC no hub.** A UI-SPEC diz «na ordem do banco»; essa ordem é o gabarito (F2). Recomendação: ordem neutra + legenda «Alternativas em ordem neutra — o candidato as viu embaralhadas.» Emenda de copy à UI-SPEC aprovada.
3. **O3 — Motivo/justificativa `humana_triagem` com migration.** Recomendação: sim, na migration do bloco B, com review bloqueante; a decisão anterior do operador (51-17: «NÃO consertar agora… fica no backlog») foi substituída pela G-51-OP1/escopo da 52 — confirmar.
4. **O4 — Via da remoção de Storage.** Recomendação: script local que lê a chave pela Management API só em memória e chama a Storage API com a lista aprovada; alternativa: EF admin de uso único. Exige OK explícito.
5. **O5 — Tirar `metadata.dimensoes[].percentil` do payload de `getScores`?** Não exigido por UX-07 (tela). Recomendação: deixar para depois, declarar no SECURITY.
6. **O6 — Direção da troca RH2/RH3** (A6).
7. **O7 — Destino das vagas de teste:** para cada uma, `deleted_at` / remoção / manter; colisões `53f75c81` e `53b73af6` (candidaturas da conta excluída — remover a vaga **apaga por CASCADE**); `629a5f31` depois de limpar `d31c78bb` (F18). E as 16 contas sem candidatura e os 3 `auth.users` órfãos: entram?

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, vitest, p46apply/efdeploy | ✓ | v24.18.0 | — |
| Deno | `deno test` da EF nova | ✓ | 2.9.4 | — |
| Python 3 | gerador SJT + tabela de caracteres | ✓ | 3.12.13 | — |
| Token da Management API (Keychain «Supabase CLI»/«supabase») | p46apply, efdeploy, leituras de PROD | ✓ (usado nesta sessão) | — | env `SUPABASE_ACCESS_TOKEN` |
| Supabase CLI | `db:types` | ✗ no PATH (`npx --no-install supabase` ausente) | — | `npx supabase gen types … < /dev/null` (baixa sob demanda) ou cast confinado |
| `timeout` (coreutils) | — | ✗ (zsh/macOS) | — | não usar em comandos de plano |
| PITR | rede de segurança do bloco D | ✗ `pitr_enabled:false` | backups diários `walg` | Storage sem backup — a limpeza é one-way |

**Missing dependencies with no fallback:** nenhuma que bloqueie. **With fallback:** Supabase CLI (via `npx`), `timeout`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (unidade/componente/guardas) · `deno test` (EF) · smokes SQL dentro de ensaio que aborta (`scripts/p52_ensaio.cjs`, cópia do p51) · auto-testes node (tabela de caracteres, comparação de população) |
| Config file | `vite.config.ts` (`test.include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`; EFs fora) |
| Quick run command | `npx vitest run <arquivos tocados> && npm run lint` (lint ≤ 90; hoje 89) |
| Full suite command | `npm run test:run && npm run lint && deno test --allow-all supabase/functions/ler-cadastro-candidato-rh/` + `node scripts/p52_ensaio.cjs --vistas supabase/tests/p52_*.sql` + `node scripts/p52_mutacoes.cjs` |

Medido nesta sessão: `npx vitest run src/features/hub-candidato src/__tests__/guards` → 22 arquivos, 245 testes, 1,41 s (o
ruído de `AsyncTaskManager.abortAll` do happy-dom no teardown é pré-existente e não reprova).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JORN-52 | 6 `mc` + 1 `caso_aberto` ativos por cargo; antigos retirados; vagas sem `itens_ids` | smoke SQL (ensaio) + catálogo | `node scripts/p52_ensaio.cjs --migracoes=<banco_v2> supabase/tests/p52_banco_sjt_smoke.sql` | ❌ Wave 0 |
| JORN-52 | Tabela de caracteres reproduzível e critério aplicado | auto-teste python + cruzamento SQL | `python3 -I scripts/geradores/tabela-comprimento-sjt.py --auto-teste && python3 -I scripts/geradores/tabela-comprimento-sjt.py <texto-v2.md>` | ❌ Wave 0 |
| JORN-53 | WhatsApp/`mailto:`; inválido e `@invalido.local` sem link | unit + componente | `npx vitest run src/features/hub-candidato/lib src/features/hub-candidato/components/__tests__/contato*` | ❌ Wave 0 |
| JORN-54 | EF: 401/403(rh inativo, candidato)/400/404/200; tombstone → `null`; log só com chaves permitidas | deno unit (deps injetadas) | `deno test --allow-all supabase/functions/ler-cadastro-candidato-rh/` | ❌ Wave 0 |
| JORN-55 | Ordem do formulário, selo, sem opção eliminatória no DOM, `javascript:` vira texto | componente | `npx vitest run src/features/hub-candidato/components/__tests__/respostasInscricao*` | ❌ Wave 0 |
| JORN-56 | Faixas sim, percentil não (DOM e tipo); sem devolutiva → frase sem faixa | componente + smoke da RPC | `npx vitest run src/features/avaliacao/components/__tests__/BigFiveResultadoHub*` + `p52_ensaio.cjs … p52_leituras_rh_smoke.sql` | ❌ Wave 0 |
| JORN-56/57 | RPCs: admin/rh ativo leem; rh inativo, candidato, sem claims, `anon` recusados; `anon` sem EXECUTE; vistas inalteradas | smoke SQL por papel + sonda de vistas | `node scripts/p52_ensaio.cjs --vistas --migracoes=<leituras_rh> supabase/tests/p52_leituras_rh_smoke.sql` | ❌ Wave 0 |
| JORN-57 | Exatamente uma etiqueta (a da escolhida); ordem não denuncia a certa; `<mark>` sem `dangerouslySetInnerHTML` | componente + smoke | `npx vitest run src/features/avaliacao/components/__tests__/SjtMcDetalhe* TextoComCitacoes*` | ❌ Wave 0 |
| JORN-58 | `?aba=` com `replace`; contagem 1×; proveniência sem «modelo modelo» (tela e PDF) | componente + guarda | `npx vitest run src/features/hub-candidato src/features/triagem/components/__tests__/ProvenienciaIABadge.test.tsx src/features/triagem/pdf` | ✅ parcial (substituir `hubVerRespostas.test.tsx`) |
| JORN-59 | Todas concluídas → frase sem `<button>`; uma pendente → CTA; nenhuma escrita em `candidaturas` | componente | `npx vitest run src/components/pages/__tests__/DashboardCandidato*` | ❌ Wave 0 |
| JORN-60 | Diálogo com ≥1 resposta (SJT MC, Raven, **cognitiva**); direto nas 3 com rascunho após `flushNow`; guarda de rótulos morde | componente + guarda + mutação | `npx vitest run src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts` | ✅ parcial |
| JORN-61 | Nada marcado ao abrir (mesmo com `score: 4` da IA); 3 de 4 → desabilitado; `getActivePageFromPath` | componente + unit | `npx vitest run src/features/entrevista src/components/__tests__/RHSidebar*` | ❌ Wave 0 (sidebar) |
| JORN-62 | `resolveRedirect` com sessão; `SelectItem` nos dois fundos; `humana_triagem` mostra motivo/justificativa (RPC + componente) | componente + smoke | `npx vitest run src/components/pages/__tests__/LoginCandidato* src/features/revisao` + smoke da RPC | ✅ parcial |
| JORN-63 | População: duas entradas, trava (NOT EXISTS), colisões, fixtures, Storage; comando recusa população divergente; resíduo 0 | auto-teste node + ensaio + prova pós | `node scripts/p52_limpeza_portao.cjs --auto-teste` + `p52_ensaio.cjs supabase/tests/p52_populacao_limpeza.sql` | ❌ Wave 0 |

Manual-only (justificado): a sessão real do operador no hub com conta de recrutador ativo (D-10 por sessão, molde
50-11/51-17) — o JWT real e o `console.log` publicado não são reproduzíveis no ensaio; conferência do log no painel de EF.

### Sampling Rate
- **Per task commit:** `npx vitest run <arquivos tocados> && npm run lint` (≤ 90)
- **Per wave merge:** suíte Vitest completa; smokes da onda pelo ensaio que aborta; `npm run build` + marcador no chunk certo
- **Phase gate:** tudo verde; `git log --oneline origin/main..HEAD` vazio; prova pós da limpeza; antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `scripts/p52_ensaio.cjs` — cópia adaptada de `p51_ensaio.cjs` (lista de migrations `_p52_`, marca `p52.tx`)
- [ ] `supabase/tests/p52_leituras_rh_smoke.sql` — atores lidos na execução (molde `p50_acesso_recrutador_smoke.sql`), população > 0 publicada
- [ ] `supabase/tests/p52_banco_sjt_smoke.sql`, `supabase/tests/p52_populacao_limpeza.sql` (só leitura)
- [ ] `scripts/p52_mutacoes.cjs` — mutações: guard sem helper, RPC que projeta `percentil`/`tag` das outras, item antigo ativo, `NOT IN` no lugar de `NOT EXISTS`
- [ ] `supabase/functions/ler-cadastro-candidato-rh/index.test.ts`
- [ ] `scripts/geradores/tabela-comprimento-sjt.py` (+ `--auto-teste`) e `scripts/geradores/gen-sjt-v2.py`
- [ ] Testes que travavam D-32 **substituídos** (não apagados): `ScorecardAvaliacao.test.tsx`, `hubVerRespostas.test.tsx`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | sim (EF) | `supabaseUser.auth.getUser()`; `verify_jwt=true` no deploy |
| V3 Session Management | sim (login com sessão) | `authStore` hidratado; `resolveRedirect` |
| V4 Access Control | **sim — núcleo da fase** | linha viva de `usuarios_rh` (EF); guard fail-closed + `is_active_rh_user()` (RPC); REVOKE de `anon`/`PUBLIC` nominal; prova por papel e sonda de vistas |
| V5 Input Validation | sim | `candidatura_id`/`pedido_id` uuid (400); esquemas de URL (`http`/`https` só); e-mail antes de `mailto:` |
| V6 Cryptography | não | — |
| V7 Error Handling & Logging | sim | log só com ids e papel; mensagens de erro do serviço nunca ecoam retorno (precedente `scoresRhService.ts:224-232`) |
| V8 Data Protection | sim | projeção explícita (nunca `*`); percentil e gabarito fora do payload novo; tombstone/`@invalido.local` sem contato |

### Known Threat Patterns for {React + Supabase + EF}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR (RH inativo/candidato lendo cadastro alheio) | Info Disclosure | autorização antes de toda leitura privilegiada; teste por papel |
| Token velho de recrutador desativado (JWT até 1 h) | Elevation | helper vivo / linha viva, nunca só claim |
| Oráculo de existência (inexistente ≠ alheia) | Info Disclosure | helper antes da busca; mesmo código para ausente/morta/rascunho |
| XSS por resposta livre/citação | Tampering | nó de texto React; segmentos; sem `innerHTML` |
| `javascript:`/`data:` em link de portfólio | Tampering | lista de esquemas; resto vira texto |
| Tabnabbing | Spoofing | `rel="noopener noreferrer"` |
| Injeção de cabeçalho em `mailto:` | Tampering | validar endereço; `encodeURIComponent` no assunto |
| Open redirect no login | Spoofing | `resolveRedirect` |
| PII em log | Info Disclosure | chaves fixas, teste com espião |
| Inferência de exercício de direito (tombstone) | Info Disclosure | sem contato/cadastro, sem causa (Invariante 9 da 45) |
| Exposição por view sem `security_invoker` | Info Disclosure | medido: todas as views de `public` têm `security_invoker=true` hoje; a fase não cria view — sonda `--vistas` prova que nada mudou |

Residuais a declarar no `52-SECURITY.md`: F4 (RLS já abre `candidatos` ao RH, log só no hub), F13 (todas as notas só no
cliente), F15 (percentil na rede de `getScores`), F18 (toggle «Ativar» sem `publish_vaga` — fora do escopo, mas o motivo da
proposta de `deleted_at` para a `629a5f31`).

## Sources

### Primary (HIGH confidence)
- Código lido nesta sessão: `HubCandidatoRH.tsx`, `AvaliacoesRespondidasBloco.tsx`, `ScorecardAvaliacao.tsx`, `scoresRhService.ts`, `useScorecardCandidato.ts`, `ProvenienciaIABadge.tsx:55-126`, `SjtMultiplaEscolhaScreen.tsx`, `AvaliacaoRavenScreen.tsx:30-260`, `ProvaCognitivaScreen.tsx:70-160`, `AvaliacaoContainer.tsx`, `DashboardCandidatoPage.tsx`, `EntrevistaScorecardInline.tsx`, `RHSidebar.tsx:106-150`, `select.tsx:125-140`, `FormularioCandidaturaPage.tsx:80-119,530-552`, `RejeitarCandidaturaDialog.tsx:54-64`, `ResponderRevisaoDialog.tsx`, `DevolutivaBigFiveView.tsx:36-67`, `LoginCandidatoPage.tsx`, `resolveRedirect.ts`, `authStore.ts`, `VagasRHPage.tsx`, `candidaturasService.ts:30-90`, `avaliacaoService.ts:105-353`, `useAutosaveAvaliacao.ts`, `testeContract.ts`, `get-curriculo-url/index.ts`, `avaliar-redacao/index.ts:300-345`, `efdeploy.cjs`, `p46apply.cjs`, `scripts/p51_ensaio.cjs`, `rotulos-navegacao-candidato.grep.test.ts`, migrations `20261005000001`, `20261005000003:600-700`, `20261008000003:640-700`, `20260929000001`, `supabase/tests/p47_teardown_dados_de_teste.sql`, `p50_acesso_recrutador_smoke.sql`, `p50_vistas_externas.sql`, `51-23-COMANDO-APPLY.sh`, `51-17-SUMMARY.md:255-275`, `scripts/geradores/gen-sjt-marketing.py`, `docs/conhecimento/sjt/banco-sjt-sdr-social-seller.md`
- PROD (Management API, toda consulta com `SET TRANSACTION READ ONLY`, só agregados/prefixos de id, nenhum e-mail/nome de candidato): `pg_policies`, `has_table_privilege`, `information_schema.columns`, `pg_constraint` (FK), `pg_trigger`, `information_schema.triggers`, `pg_enum`, `pg_proc.prosrc` (`pontuar_sjt`, `get_opcoes_sjt`, `salvar_avaliacao_entrevista`, `ler_contexto_knockout_revisao`, `publish_vaga`, trigger de soft-delete), contagens de banco SJT, pesos, população por categoria, `storage.objects`, `/database/backups`
- Context7 `/websites/radix-ui_primitives` (Tabs: `forceMount`, desmontagem do inativo); `node_modules/react-router-dom/dist/index.d.ts:232`

### Secondary (MEDIUM confidence)
- Context7 `/remix-run/react-router` (`useSearchParams`)

### Tertiary (LOW confidence)
- Itens `[ASSUMED]` do Assumptions Log

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nada novo; versões lidas de `node_modules`
- Architecture (bloco B): HIGH nas fontes/RLS (medidas); MEDIUM na escolha EF+RPC (recomendação)
- Bloco C: HIGH no padrão e nas medições; MEDIUM no critério numérico (proposta)
- Bloco D: HIGH na população/grafo (fotografia de 2026-10-10 — **re-medir na execução**); MEDIUM na via do Storage
- Pitfalls: HIGH — todos derivados de medição desta sessão

**Research date:** 2026-10-10
**Valid until:** as medições de PROD envelhecem a cada UAT (contas de teste novas entram na população); o código, 30 dias
