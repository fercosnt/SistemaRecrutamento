# Banco SJT v3 — pré-vendas (`sdr-social-seller`)

> **Status: aguardando aprovação do operador.** Nada deste arquivo está no ar. O SQL é gerado por
> `scripts/geradores/gen-sjt-sdr-v3.py` a partir DESTE arquivo (gerado, não transcrito).

Revisão do cargo `sdr-social-seller` do v2 (`docs/specs/BANCO-SJT-V2.md`), pedida pelo operador em
2026-10-14 ao montar a vaga `sdr-relacionamento-pre-vendas`. Mesmo formato, mesma gramática
(`scripts/geradores/sjt_texto.py`), mesmos pesos por etiqueta (`fortemente_pontua` 4 · `pontua` 2 ·
`neutro` 1 · `atencao` 0) e a mesma regra de comprimento (D-34).

**O que muda, e por quê:**

- **MC1, MC5 e MC6 ficam** — texto idêntico ao v2, extraído por script. Mesmo `content_hash`: o
  gerador não os reinsere, e eles seguem com o mesmo id e as respostas já gravadas.
- **MC2 sai** («O lead empolgado que talvez não tenha indicação»). O SDR não julga indicação de
  tratamento — isso é do dentista. Entra **contorno de objeção**: «preciso ver com meu marido».
- **MC3 sai** («Reclamação pública num post»). Entra **reativação da base**: o orçamento aprovado
  que nunca virou consulta — a primeira camada da base que a função trabalha.
- **MC4 muda uma palavra** no cenário: «lente» vira «clareamento». As alternativas não mudam, mas
  o hash muda, então o item é retirado e reinserido.
- **O caso aberto cresce para três partes**: (a) a resposta ao lead; (b) um follow-up de 7 dias,
  com dia, canal e mensagem; (c) o contorno da objeção de preço. As dimensões passam a cobrir as
  três partes; os critérios estão em `supabase/functions/_shared/sjt-rubrica.ts`.

Os itens que saem são **retirados, não apagados**: as respostas da rodada anterior continuam
resolvendo para eles.

---

## Cargo `sdr-social-seller`

### MC1 · O lead que visualizou e sumiu
*(dimensão: Atitude de Dono + Comunicação · 4 min)*

**Cenário.** Um lead pediu informação pelo Instagram há dois dias. Você respondeu na hora, com um
áudio explicando o tratamento, e ele visualizou e não respondeu mais. A meta de agendamentos do mês
está apertada.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Manda um conteúdo ligado à dúvida dele com uma pergunta aberta, espaça os próximos toques e anota no CRM. |
| 2 | pontua | 2 | Manda todo dia um "oi, ainda tem interesse?" até ele responder, porque lead que some precisa ser lembrado. |
| 3 | neutro | 1 | Espera ele voltar sozinho: quem tem interesse de verdade responde quando estiver pronto para decidir. |
| 4 | atencao | 0 | Oferece um desconto na avaliação que você não pode autorizar, para destravar a resposta dele ainda hoje. |

### MC2 · "Preciso ver com meu marido"
*(dimensão: Contorno de objeção + Condução · 4 min)*

**Cenário.** Pelo WhatsApp, uma lead conversou com você sobre clareamento e gostou do que ouviu.
Quando você ofereceu dois horários para a avaliação, ela respondeu: "Preciso ver com meu marido
antes de marcar."

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Diz que faz sentido, pergunta o que ele vai querer saber e propõe a avaliação para os dois juntos. |
| 2 | pontua | 2 | Manda um resumo do tratamento para ela mostrar ao marido e combina de chamá-la de novo em dois dias. |
| 3 | neutro | 1 | Diz que entende e que fica à disposição, para ela voltar a chamar quando os dois tiverem decidido. |
| 4 | atencao | 0 | Avisa que aqueles são os últimos horários do mês, para ela decidir hoje e falar com o marido depois. |

### MC3 · O orçamento aprovado que nunca virou consulta
*(dimensão: Base + Atitude de Dono · 4 min)*

**Cenário.** No CRM há uma paciente que aprovou um orçamento de clareamento há oito meses e nunca
marcou o início. O último registro diz só "vai ver a melhor data". Você vai fazer o primeiro
contato de reativação.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Chama pelo nome, lembra o que ela queria resolver, pergunta por que adiou e oferece dois horários. |
| 2 | pontua | 2 | Manda a mensagem padrão de reativação da clínica e espera ela responder antes de oferecer um horário. |
| 3 | neutro | 1 | Liga uma vez e, se ela não atender, marca o contato como frio no CRM e passa ao próximo da lista. |
| 4 | atencao | 0 | Avisa que o orçamento venceu e que, se ela não marcar nesta semana, o valor do tratamento vai subir. |

### MC4 · Pediu o preço antes de qualquer conversa
*(dimensão: Qualificação consultiva + Comunicação de valor · 4 min)*

**Cenário.** Pelo WhatsApp, um lead manda: "Quanto custa o clareamento? Só quero o valor." É a terceira
mensagem dele, e ele já contou que está pesquisando em outras clínicas.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Dá a faixa de preço, diz que o valor exato sai na avaliação e pergunta o que ele quer mudar no sorriso. |
| 2 | pontua | 2 | Passa a faixa de preço e já convida para a avaliação, sem perguntar nada sobre o caso nem o que ele busca. |
| 3 | neutro | 1 | Passa a faixa de preço e encerra dizendo que, quando ele quiser agendar a avaliação, é só chamar de novo. |
| 4 | atencao | 0 | Passa o menor valor da tabela para não perder o lead para a concorrência e deixa o detalhe para a clínica. |

### MC5 · A confirmação que não volta
*(dimensão: Comparecimento + Organização · 4 min)*

**Cenário.** Amanhã às 9h há uma avaliação marcada. Você mandou a confirmação ontem e hoje de manhã;
as duas mensagens foram entregues e não lidas. São 17h, e a agenda de amanhã tem lista de espera.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Liga ainda hoje; se ele não atender, manda recado, deixa a lista de espera de sobreaviso e anota no CRM. |
| 2 | pontua | 2 | Manda mais uma mensagem agora e, se não houver resposta até amanhã cedo, oferece o horário à lista. |
| 3 | neutro | 1 | Mantém o horário como está e confia na confirmação de ontem, que foi entregue, mesmo sem ter sido lida. |
| 4 | atencao | 0 | Libera o horário para a lista de espera agora, porque mensagem sem leitura costuma virar falta amanhã. |

### MC6 · Vinte leads novos de uma vez
*(dimensão: Velocidade de resposta + Processo · 4 min)*

**Cenário.** Uma campanha nova entrou no ar às 10h. Ao meio-dia há 20 leads sem resposta no WhatsApp
e no Instagram, e você está no meio dos follow-ups quentes do dia.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Pausa os follow-ups, manda a cada lead novo uma primeira mensagem curta e pessoal e depois os retoma. |
| 2 | pontua | 2 | Termina os follow-ups quentes, que estão perto de agendar, e só depois responde os novos, um por um. |
| 3 | neutro | 1 | Pede à recepção que responda os novos com a mensagem padrão enquanto você termina os follow-ups quentes. |
| 4 | atencao | 0 | Manda a mesma resposta automática a todos os novos e volta a eles no fim do dia, com mais calma. |

### Caso aberto · Responda, retome e contorne
*(20 min)*

**Cenário.** Chega esta mensagem no WhatsApp da Beauty Smile, vinda de um anúncio: "Oi, vi o vídeo
de vocês sobre o laser. Tenho um dente da frente meio escuro que me incomoda há anos e tenho
vergonha de sorrir. Vocês fazem? Quanto custa?"

**Escreva:** (a) a resposta que você mandaria a esse lead, do jeito que mandaria de verdade (pode
quebrar em várias mensagens). (b) Ele leu e não respondeu. Monte o seu follow-up para os próximos
7 dias: em que dia, por qual canal (mensagem, áudio, ligação, Instagram) e o que você diria em cada
contato para chamar a atenção dele e conseguir uma resposta. (c) Dias depois, ele responde: "Achei
caro. Vi uma clínica que faz clareamento por menos da metade." Escreva a sua resposta.

**Rubric** — `score_max` 25 · `entrevista` 13 · `avanca` 18

| dimensão | peso |
|---|---|
| acolhimento | 15 |
| descoberta_e_qualificacao | 20 |
| conducao_ao_agendamento | 15 |
| cadencia_de_follow_up | 25 |
| contorno_de_objecao | 25 |
