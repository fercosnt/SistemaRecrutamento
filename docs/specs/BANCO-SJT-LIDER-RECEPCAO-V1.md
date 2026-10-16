# Banco SJT v1 — líder de recepção (`lider-recepcao`)

> **Status: aguardando aprovação do operador.** Nada deste arquivo está no ar. O SQL é gerado por
> `scripts/geradores/gen-sjt-sdr-v3.py --cargo lider-recepcao --cargo-novo` a partir DESTE arquivo
> (gerado, não transcrito).

Banco novo, criado em 2026-10-16 ao montar a vaga `lider-recepcao`. Mesma gramática
(`scripts/geradores/sjt_texto.py`), mesmos pesos por etiqueta (`fortemente_pontua` 4 · `pontua` 2 ·
`neutro` 1 · `atencao` 0) e a mesma regra de comprimento (D-34).

**Por que um cargo novo, e não o `recepcionista`.** O banco `recepcionista` tem 1 item, de
atendimento, e nenhuma vaga aponta para ele. A líder de recepção é outra medida: ela começa sozinha
na recepção e vai montar a equipe, é dona do processo (agenda, confirmação, padrão de atendimento) e
cuida da fidelização **sem vender** — orçamento e valores ficam com o Dr. Fernando e o pré-vendas.
Um cargo próprio deixa o `recepcionista` intacto para uma vaga de recepcionista no futuro.

**Os seis itens foram escolhidos pelo operador** (2026-10-16) numa lista de doze, no sentido que ele
aprovou para o dentista: postura e comportamento no dia a dia, sem incidente clínico, sem erro de
planejamento do Dr. Fernando e sem tratamento que «não funcionou». A conduta certa segue a cultura
da clínica (`docs/conhecimento/fit-cultural/Cultura-Beauty-Smile-Para-Recrutamento.md`: atitude de
dono, «"não é minha função" é o anti-exemplo literal», linguagem de culpa proibida, experiência UAU).

---

## Cargo `lider-recepcao`

### MC1 · As faltas do mês
*(dimensão: Dono do processo · 4 min)*

**Cenário.** No fechamento do mês, você vê que as faltas na agenda subiram: um em cada cinco
pacientes marcados não veio, quase todos de primeira consulta.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Vê quem faltou e como foi confirmado, testa uma mudança na confirmação e mede no mês seguinte. |
| 2 | pontua | 2 | Passa a ligar na véspera para todos os pacientes, além da mensagem, e mantém o resto como está. |
| 3 | neutro | 1 | Leva o número à coordenação na reunião do mês e pergunta o que ela quer que a recepção faça. |
| 4 | atencao | 0 | Explica que falta em primeira consulta é comum e depende do paciente, não da recepção. |

### MC2 · O erro que foi seu
*(dimensão: Responsabilidade · 4 min)*

**Cenário.** Dois pacientes chegam para o mesmo horário com o mesmo dentista. Ao conferir, você vê
que foi você quem marcou o segundo, por engano.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Assume o erro com os dois, dá a cada um uma saída boa e revê como confere a agenda ao marcar. |
| 2 | pontua | 2 | Pede desculpas, encaixa um dos dois e segue o dia sem mudar nada na forma de marcar. |
| 3 | neutro | 1 | Pede ao dentista que decida qual dos dois atende primeiro e que explique a espera ao outro. |
| 4 | atencao | 0 | Diz aos pacientes que o sistema às vezes duplica horários e que isso foge do controle da recepção. |

### MC3 · O checklist que ninguém segue
*(dimensão: Dono do processo + Equipe · 4 min)*

**Cenário.** A recepção tem um checklist de abertura e de fechamento. Quando as auxiliares cobrem o
seu almoço ou a sua folga, ele fica sem preencher, e sempre se perde alguma coisa.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Pergunta a elas o que atrapalha, simplifica o checklist com essa ajuda e confere junto no começo. |
| 2 | pontua | 2 | Explica de novo a importância do checklist e pede que elas preencham sempre que cobrirem você. |
| 3 | neutro | 1 | Deixa de contar com o checklist e, quando volta, confere e corrige tudo por conta própria. |
| 4 | atencao | 0 | Avisa a coordenação que as auxiliares não seguem o processo e pede que alguém cobre delas. |

### MC4 · A reclamação em voz alta
*(dimensão: Experiência do paciente + Conflito · 4 min)*

**Cenário.** Um paciente chega irritado com uma cobrança que considera errada e reclama em voz alta,
na sala de espera, na frente de outros pacientes.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Leva-o a um lugar reservado, ouve sem interromper, confere a cobrança e diz quando dá o retorno. |
| 2 | pontua | 2 | Ouve ali mesmo, com calma, pede desculpas e promete que o financeiro vai ligar para ele. |
| 3 | neutro | 1 | Pede com educação que ele fale mais baixo, por causa dos outros pacientes, e então escuta a queixa. |
| 4 | atencao | 0 | Explica na hora que a cobrança está certa, para os outros pacientes não ficarem com dúvida. |

### MC5 · "E o clareamento, funciona para mim?"
*(dimensão: Fidelização + Limite da função · 4 min)*

**Cenário.** Na saída da consulta, um paciente em tratamento pergunta a você se o clareamento a laser
funcionaria para ele e quanto custa.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Acolhe o interesse, explica que a indicação sai da avaliação, registra o pedido e já combina a data. |
| 2 | pontua | 2 | Diz que vai perguntar ao dentista e dá retorno depois, sem registrar o pedido nem o próximo passo. |
| 3 | neutro | 1 | Entrega o material da clínica sobre clareamento e diz que ele pode marcar uma avaliação quando quiser. |
| 4 | atencao | 0 | Diz que funciona muito bem e passa o valor da tabela, para ele já sair com a decisão encaminhada. |

### MC6 · O feedback que você dá
*(dimensão: Liderança + Experiência do paciente · 4 min)*

**Cenário.** A recepcionista que você ajudou a treinar é rápida e organizada, mas você percebe que
ela atende os pacientes de forma fria: não olha nos olhos e não os chama pelo nome.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Conversa com ela em particular, com exemplos do que viu, combina o que mudar e acompanha. |
| 2 | pontua | 2 | Dá um toque rápido entre um atendimento e outro, com gentileza, e confia que ela vai ajustar. |
| 3 | neutro | 1 | Prefere não falar nada por enquanto, porque ela é eficiente e a agenda está sempre em dia. |
| 4 | atencao | 0 | Comenta com a coordenação que a colega é fria com os pacientes, para que a coordenação resolva. |

### Caso aberto · A jornada da paciente nova
*(20 min)*

**Cenário.** Uma paciente nova marcou pelo WhatsApp a primeira avaliação com o Dr. Fernando, para a
semana que vem. Na conversa, ela contou que tem muito medo de dentista e que não vai a um há anos.

**Escreva:** passo a passo, o que você faz desde a marcação até o dia seguinte à avaliação: a
confirmação, a chegada, a espera, a saída e o contato depois.

**Rubric** — `score_max` 25 · `entrevista` 13 · `avanca` 18

| dimensão | peso |
|---|---|
| confirmacao_e_preparo | 15 |
| acolhimento_na_chegada | 25 |
| espera_sem_surpresas | 20 |
| saida_e_proximo_passo | 20 |
| contato_depois | 20 |

## Notas de desenho

- **MC5 mede o limite da função.** A líder de recepção cuida da fidelização, mas não vende: a
  indicação sai da avaliação, e valores ficam com o Dr. Fernando e o pré-vendas. Passar o preço da
  tabela é a `atencao` mesmo sendo gentil — é a resposta mais comum de quem veio do varejo.
- **MC6 mede o lado «monta equipe».** A líder começa sozinha; a colega do cenário é a primeira que
  ela vai treinar. Levar à coordenação sem falar com a pessoa é a `atencao`: é a linguagem de culpa
  que a cultura proíbe.
- **O caso não pede preço.** A saída da avaliação passa pelo orçamento do Dr. Fernando; o critério
  `saida_e_proximo_passo` marca como crítico negociar valor ou prometer resultado.
- **O banco não se contradiz:** MC3 premia ouvir a equipe antes de cobrar, e MC6 premia conversar
  direto com a colega — as duas condutas certas dizem o mesmo (falar com a pessoa, em particular, e
  acompanhar), e as duas `atencao` dizem o mesmo (terceirizar a cobrança à coordenação).
