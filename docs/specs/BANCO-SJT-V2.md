# Banco SJT v2 — pré-vendas e versão nova de marketing

> **Status: aguardando aprovação do operador — portão de texto do 52-17.** Nada deste arquivo
> está no ar. Depois de aprovado, o SQL é gerado por `scripts/geradores/gen-sjt-v2.py` a partir
> DESTE arquivo (gerado, não transcrito) e aplicado pelo `p46apply.cjs`, numa migration só.

Fase 52, bloco C (JORN-52 · D-28, D-29, D-34, D-35, D-37). Este é o texto **único** dos dois bancos
que vão ao mesmo portão: o banco novo do cargo de pré-vendas (`sdr-social-seller`) e a versão nova
dos 3 cargos de marketing (`social-media`, `videomaker-storymaker`, `editor-video`).

## Como ler este arquivo

- **Formato** — o do rascunho de 30/09: `## Cargo` por cargo, `### MCn` por item de múltipla
  escolha, `### Caso aberto` por caso. Na tabela de cada item, a coluna `#` é só a **ordem de
  autoria**: a `ordem` gravada no banco vem de uma permutação determinística feita pelo gerador
  (D-37), porque no banco antigo a ordem 1 era sempre a alternativa certa.
- **Texto puro** — cenário e alternativas aparecem na tela do candidato como texto puro. Negrito
  e itálico deste arquivo são tirados pelo gerador; marcação que sobrar faz o gerador recusar.
- **Pesos por etiqueta** — `fortemente_pontua` 4 · `pontua` 2 · `neutro` 1 · `atencao` 0. Nenhum
  item tem `knockout`, e o score do SJT nunca rejeita sozinho (RNF-07a).
- **Caso aberto que fica** — um caso com a linha `*(mantido do banco no ar — content_hash …)*`
  logo abaixo do título é o caso que **já está no ar**, copiado byte a byte. O gerador confere que o
  texto reproduz aquele hash (senão recusa), não emite INSERT para ele, e a migration exige o mesmo
  item vivo antes e depois.

## Regra de comprimento (D-34) e critério proposto

Em cada item `mc`, as 4 alternativas têm comprimento parecido: a `fortemente_pontua` não pode ser
visivelmente a mais longa. A tela já embaralha a ordem; o comprimento é a pista que sobra.

A regra é conferível, não só afirmada:
`python3 -I scripts/geradores/tabela-comprimento-sjt.py docs/specs/BANCO-SJT-V2.md` imprime, por
item, as 4 contagens de caracteres (pontos de código, iguais ao `char_length` do banco), a razão
`fortemente_pontua ÷ média das outras três`, a amplitude e o **posto** da `fortemente_pontua`
(1 = nenhuma alternativa é mais longa que ela); por cargo, em quantos itens ela é a mais longa.

**Critério proposto, para o operador decidir no portão** (o operador não fixou o número; razão
sozinha não basta — com razão 1,05 em todos os itens a certa ainda pode ser a mais longa em 6 de 6):

- por item: `0,90 ≤ razão ≤ 1,10` **e** amplitude (máx − mín) ≤ 25% do mín;
- por cargo: a `fortemente_pontua` é a mais longa em **no máximo 2 de 6** itens.

Todo o texto abaixo já cumpre a proposta (`--criterio proposto` sai 0).

---

## Cargo `sdr-social-seller`

**Razão do tamanho (D-28).** A vaga **ativa** Consultor(a) de Relacionamento e Pré-vendas
(`fdbe1a4a`) aponta `work_sample_sjt` para este cargo, obrigatório, com **peso 15** — e o banco
tinha **1 item**: uma única escolha mudava a faixa do candidato. Passa a ter **6 mc + 1 caso
aberto**, o tamanho do banco de marketing: com 6 itens o placar mc vai a 24, e uma escolha isolada
pesa um sexto. O item antigo sai de sorteio (retirado, não apagado) no mesmo apply.

**Eixo.** «Meta de agendamento × qualificação honesta», do banco de conhecimento
(`docs/conhecimento/sjt/banco-sjt-sdr-social-seller.md`): os itens 1, 2 e 3 são os três de lá,
revistos; os itens 4, 5 e 6 são novos, tirados do conteúdo publicado da vaga (pedido de preço
antes da conversa, comparecimento e confirmação, volume de leads novos). O caso aberto é o
work-sample de WhatsApp do mesmo banco.

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

### MC2 · O lead empolgado que talvez não tenha indicação
*(dimensão: Ética + Atitude de Dono · 4 min)*

**Cenário.** Chega um lead empolgado com lentes de contato dental. Pelas respostas, você percebe
que o caso provavelmente não é para esse tratamento, ou que o orçamento dele está muito abaixo.
Cada agendamento conta para a sua meta.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Faz as perguntas que faltam, diz com franqueza o que o caso parece pedir e só agenda se fizer sentido. |
| 2 | pontua | 2 | Agenda a avaliação mesmo assim, mas registra a ressalva no CRM para o Dr. já chegar sabendo do caso. |
| 3 | neutro | 1 | Agenda sem comentar nada, porque quem decide se o caso tem indicação é o dentista, na avaliação. |
| 4 | atencao | 0 | Agenda e reforça o resultado que ele espera, para garantir que ele venha e o horário conte na meta. |

### MC3 · Reclamação pública num post da clínica
*(dimensão: Experiência UAU + Comunicação · 4 min)*

**Cenário.** Num post da clínica, um seguidor comenta: "Fui aí e me trataram mal, não recomendo."
Outras pessoas começam a curtir o comentário. As DMs e os comentários do perfil passam por você.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Responde no post com acolhimento curto, sem discutir o caso, chama no privado e leva a queixa à gestão. |
| 2 | pontua | 2 | Chama a pessoa no privado e resolve por lá, deixando o comentário público sem resposta visível no post. |
| 3 | neutro | 1 | Responde no post "sentimos muito, entre em contato" e segue o dia, sem chamar no privado nem apurar. |
| 4 | atencao | 0 | Oculta o comentário para não contaminar o post e depois chama a pessoa no privado para entender o caso. |

### MC4 · Pediu o preço antes de qualquer conversa
*(dimensão: Qualificação consultiva + Comunicação de valor · 4 min)*

**Cenário.** Pelo WhatsApp, um lead manda: "Quanto custa a lente? Só quero o valor." É a terceira
mensagem dele, e ele já contou que está pesquisando em outras clínicas.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Explica que o valor depende do caso, dá a faixa autorizada e pergunta o que ele quer resolver no sorriso. |
| 2 | pontua | 2 | Passa a faixa de valor que a clínica autoriza e convida para a avaliação, sem perguntar nada sobre o caso. |
| 3 | neutro | 1 | Diz que não passa valor pelo WhatsApp e oferece um horário de avaliação para ele saber o preço na clínica. |
| 4 | atencao | 0 | Passa o menor valor da tabela para não perder o lead para a concorrência e deixa o detalhe para a clínica. |

### MC5 · A confirmação que não volta
*(dimensão: Comparecimento + Organização · 4 min)*

**Cenário.** Amanhã às 9h há uma avaliação marcada. Você mandou a confirmação ontem e hoje de manhã;
as duas mensagens foram entregues e não lidas. São 17h, e a agenda de amanhã tem lista de espera.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Liga ainda hoje; se ele não atender, deixa recado, avisa quem está na lista de espera e anota no CRM. |
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

### Caso aberto · Responda este lead no WhatsApp
*(12 min)*

**Cenário.** Chega esta mensagem no WhatsApp da Beauty Smile, vinda de um anúncio: "Oi, vi o vídeo
de vocês sobre o laser. Tenho um dente da frente meio escuro que me incomoda há anos e tenho
vergonha de sorrir. Vocês fazem? Quanto custa?"

**Escreva:** (a) a resposta que você mandaria a esse lead, do jeito que mandaria de verdade (pode
quebrar em várias mensagens); (b) o que faria se ele não respondesse em 24 horas.

**Rubric** — `score_max` 25 · `entrevista` 13 · `avanca` 18

| dimensão | peso |
|---|---|
| acolhimento | 25 |
| descoberta_e_qualificacao | 25 |
| comunicacao_de_valor | 15 |
| conducao_e_follow_up | 25 |
| tom_clareza_e_lgpd | 10 |
