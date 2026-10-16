# Banco SJT v2 — dentista (`dentista`)

> **Status: aguardando aprovação do operador.** Nada deste arquivo está no ar. O SQL é gerado por
> `scripts/geradores/gen-sjt-sdr-v3.py --cargo dentista` a partir DESTE arquivo (gerado, não
> transcrito).

Revisão do cargo `dentista`, feita em 2026-10-15 ao montar a vaga `dentista-clinica-geral-laser`.
Mesma gramática (`scripts/geradores/sjt_texto.py`), mesmos pesos por etiqueta (`fortemente_pontua`
4 · `pontua` 2 · `neutro` 1 · `atencao` 0) e a mesma regra de comprimento (D-34).

**Papel que o banco mede.** O dentista desta vaga EXECUTA as sessões do plano; a avaliação, o plano e
o orçamento são do Dr. Fernando. Depois de três rodadas com cenários clínicos, o operador pediu
(2026-10-16) que o banco fosse no sentido do formulário antigo de dentista da clínica: **postura e
comportamento** — feedback, comunicação com o paciente, relação com o Dr. Fernando, responsabilidade,
atitude de dono e equipe. Os seis itens foram escolhidos por ele numa lista de onze. A conduta
certa segue a cultura da clínica (`docs/conhecimento/fit-cultural/Cultura-Beauty-Smile-Para-
Recrutamento.md`: «"não é minha função" é o anti-exemplo literal», linguagem de culpa proibida,
experiência UAU) e a regra de comunicação da marca («explicamos primeiro o benefício, depois a
tecnologia»; «não prometemos o impossível»).

**O que muda em relação ao banco no ar:**

- **Os 3 mc e o caso aberto de junho saem**, todos: itens clínicos genéricos com a certa bem mais
  longa que as outras (D-34), um com duas `atencao` e nenhuma `neutro`, 30 min por item; e um caso
  de avaliação diagnóstica de lentes — trabalho de quem avalia, e tratamento que a clínica não faz.
- **Entram 6 mc de postura** e um caso aberto sobre **a primeira sessão de um paciente novo**.
- **Regra de desenho, pedida pelo operador:** nenhum cenário sugere erro no planejamento do Dr.
  Fernando nem protocolo que «não funcionou». O banco mede como a pessoa trabalha, não o resultado
  do tratamento.

Os itens que saem são **retirados, não apagados**: as respostas já gravadas continuam resolvendo
para eles.

---

## Cargo `dentista`

### MC1 · O retorno da coordenação
*(dimensão: Abertura a feedback + Atitude de Dono · 4 min)*

**Cenário.** Na revisão do mês, a coordenação mostra que os seus pacientes elogiam muito o
atendimento, mas que as suas sessões atrasam, em média, 15 minutos e desorganizam a agenda da
clínica.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Pergunta os detalhes, propõe um ajuste concreto nas sessões e combina como acompanhar. |
| 2 | pontua | 2 | Agradece o retorno, diz que vai prestar mais atenção ao horário e segue a rotina como estava. |
| 3 | neutro | 1 | Explica que atrasa porque dá atenção aos pacientes, e que prefere manter o cuidado ao horário. |
| 4 | atencao | 0 | Explica que o atraso vem da recepção e da auxiliar, que não deixam a sala pronta no horário. |

### MC2 · "Por que laser, e não a limpeza de sempre?"
*(dimensão: Comunicação com o paciente · 4 min)*

**Cenário.** Na primeira sessão da limpeza a laser, a paciente pergunta por que o Dr. Fernando
indicou o laser, se ela sempre fez a limpeza comum e achava suficiente.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Explica primeiro o que muda para ela, ligado ao caso dela, e depois como o laser age, sem prometer. |
| 2 | pontua | 2 | Explica com cuidado como o laser funciona, mas em termos técnicos que ela tem dificuldade de seguir. |
| 3 | neutro | 1 | Diz que a indicação foi do Dr. Fernando e que é melhor ela perguntar a ele na próxima consulta. |
| 4 | atencao | 0 | Diz que a limpeza comum desgasta os dentes e que, com o laser, ela nunca mais vai ter tártaro. |

### MC3 · O paciente que quer falar com o Dr. Fernando
*(dimensão: Segurança + Relação com o paciente · 4 min)*

**Cenário.** Um paciente executivo questiona cada etapa da sessão e, sobre um detalhe que você mesmo
poderia responder, pede para falar direto com o Dr. Fernando.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Responde o que é seu com segurança e, se ele ainda preferir, combina a conversa com o Dr. Fernando. |
| 2 | pontua | 2 | Chama o Dr. Fernando na mesma hora, interrompendo a agenda dele, para evitar qualquer atrito. |
| 3 | neutro | 1 | Responde a dúvida e segue a sessão, sem acolher o pedido dele de falar com o Dr. Fernando. |
| 4 | atencao | 0 | Diz que ele não precisa incomodar o Dr. Fernando com isso, porque a sessão é responsabilidade sua. |

### MC4 · O cuidado que você esqueceu de passar
*(dimensão: Responsabilidade + Experiência do paciente · 4 min)*

**Cenário.** No fim do dia, você percebe que não orientou um paciente sobre um cuidado importante
depois da sessão. Ele já foi embora.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Liga ou manda mensagem pessoalmente, assume o esquecimento e registra a orientação dada. |
| 2 | pontua | 2 | Pede à recepção que mande ao paciente a orientação padrão, sem explicar a ele o que aconteceu. |
| 3 | neutro | 1 | Deixa para orientar na próxima sessão, já que o paciente volta à clínica daqui a alguns dias. |
| 4 | atencao | 0 | Não fala nada a ninguém, para não parecer que errou, e confia que o paciente vai se cuidar. |

### MC5 · "Não é minha função"
*(dimensão: Atitude de Dono + Equipe · 4 min)*

**Cenário.** Outro dentista da clínica está com a agenda atrasada. A recepção pergunta se você, que
está com 30 minutos livres, pode atender um paciente dele.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Atende o paciente, alinhando antes com o colega o que precisa ser feito naquela sessão. |
| 2 | pontua | 2 | Atende o paciente seguindo o prontuário, sem falar com o colega sobre o que foi feito nele. |
| 3 | neutro | 1 | Diz que atende, mas só se o colega pedir pessoalmente, porque o paciente é dele, não seu. |
| 4 | atencao | 0 | Diz que o paciente não é seu e usa o horário livre para organizar as suas coisas. |

### MC6 · A reclamação sobre a recepção
*(dimensão: Equipe + Experiência do paciente · 4 min)*

**Cenário.** Na cadeira, a paciente reclama que foi mal atendida pela recepção quando tentou remarcar
a sessão.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Acolhe a queixa sem culpar a colega, pede desculpas e leva o retorno à coordenação. |
| 2 | pontua | 2 | Pede desculpas em nome da clínica e segue a sessão, sem levar a queixa a ninguém da equipe. |
| 3 | neutro | 1 | Muda de assunto com gentileza, para não criar clima ruim, e começa logo o procedimento. |
| 4 | atencao | 0 | Concorda que a recepção às vezes deixa a desejar e diz que vai falar com eles sobre isso. |

### Caso aberto · A primeira sessão com você
*(20 min)*

**Cenário.** Um paciente novo começa amanhã com você a limpeza a laser que o Dr. Fernando planejou na
avaliação. É a primeira sessão dele na Beauty Smile.

**Escreva:** passo a passo, como seria essa primeira sessão com você: o que faz antes de ele chegar,
como o recebe, como conduz a sessão, como encerra e o que faz até o dia seguinte.

**Rubric** — `score_max` 25 · `entrevista` 13 · `avanca` 18

| dimensão | peso |
|---|---|
| preparacao_e_acolhimento | 15 |
| escuta_e_personalizacao | 20 |
| conducao_sem_surpresas | 25 |
| orientacao_de_saida | 20 |
| cuidado_depois_da_sessao | 20 |
