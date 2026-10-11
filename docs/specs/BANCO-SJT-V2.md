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

---

## Cargo `social-media`

**Versão nova (D-35).** Mesmos cenários e dimensões do rascunho de 30/09 (`docs/specs/DRAFT-banco-sjt-marketing.md`, árvore de trabalho); as alternativas foram reescritas até o critério proposto passar — inclusive o posto por cargo. O caso aberto **fica** como está no ar: a linha «mantido» abaixo do título traz o `content_hash` medido em PROD, e o gerador recusa o texto se ele não reproduzir esse hash.

### MC1 · O dado contradiz o quadro preferido do chefe
*(dimensão: Leitura de dados + Atitude de Dono · 4 min)*

**Cenário.** O quadro "Estudo do dia" é o preferido do Dr. e o que ele mais cobra. Depois de 8
semanas, é o de menor retenção do perfil (média de 18%) e quase não recebe salvamento — enquanto
os bastidores de consultório, que ele acha "bobos", retêm 46%. Na sexta você apresenta o
relatório de quadros.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Propõe testar o Estudo do dia em formato novo por 3 semanas e subir os bastidores, com corte combinado antes. |
| 2 | pontua | 2 | Apresenta os números e recomenda cortar o Estudo do dia agora, porque oito semanas de dado já bastam. |
| 3 | neutro | 1 | Apresenta os números sem recomendação e deixa a decisão com o Dr., que conhece melhor o próprio público. |
| 4 | atencao | 0 | Mantém o Estudo do dia como está: é o quadro que o Dr. quer, e insistir nisso só desgasta a relação. |

### MC2 · "Está bom, mas não é assim que eu falo"
*(dimensão: Escrita na voz do outro + Receptividade a feedback · 4 min)*

**Cenário.** Na leitura semanal em voz alta, o Dr. trava em três dos cinco roteiros e diz "está
bom, mas não é assim que eu falo". Ele não sabe explicar o que mudaria. A gravação é depois de
amanhã.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Pede que ele conte a ideia do jeito dele, grava o áudio e reescreve com as palavras que ele usou. |
| 2 | pontua | 2 | Reescreve os três roteiros mais curtos e mais coloquiais, e leva de volta para ele antes de gravar. |
| 3 | neutro | 1 | Mantém os dois que funcionaram, descarta os outros três e escreve roteiros novos do zero até amanhã. |
| 4 | atencao | 0 | Grava assim mesmo: no teleprompter ele adapta na hora, e o calendário da semana não pode parar. |

### MC3 · Imagem de paciente, pedida por quem manda
*(dimensão: Ética + Discrição · 4 min)*

**Cenário.** O Dr. manda no grupo um vídeo gravado no consultório mostrando o resultado de uma
paciente, e escreve "posta hoje, ficou incrível". Você não encontra o termo de autorização dela
no arquivo.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Segura a publicação, avisa o Dr. de que falta o termo e pede à recepção que colha a assinatura antes. |
| 2 | pontua | 2 | Segura a publicação e propõe ao Dr. outro conteúdo para hoje, sem resolver a falta do termo da paciente. |
| 3 | neutro | 1 | Segura a publicação sem explicar o motivo ao Dr. e espera que ele pergunte para só então falar do termo. |
| 4 | atencao | 0 | Publica: foi o próprio Dr. quem mandou, e a autorização da paciente é responsabilidade da clínica. |

### MC4 · O estudo que sustenta o "Estudo do dia"
*(dimensão: Checagem de fonte + Comunicação com o líder · 4 min)*

**Cenário.** Para o "Estudo do dia" de amanhã, o Dr. te manda o print de um post de outro dentista
afirmando que "laser reduz em 80% a recidiva de cárie". Não há referência. Você procura e acha um
estudo parecido — com 34 participantes e sem grupo controle.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Mostra ao Dr. que o estudo é frágil e propõe trocar por um que dê para citar com referência. |
| 2 | pontua | 2 | Publica sem o número, falando só do mecanismo, e não comenta a fragilidade do estudo com o Dr. |
| 3 | neutro | 1 | Tira o tema da pauta de amanhã e escolhe outro assunto, para não publicar nada que seja frágil. |
| 4 | atencao | 0 | Usa o número citando "estudos mostram": o Dr. mandou, e é ele quem entende do assunto clínico. |

### MC5 · Um tema bom que é chato de explicar
*(dimensão: Roteiro para vídeo curto — competência central · 4 min)*

**Cenário.** Você precisa escrever um Reel sobre tratamento de ronco e apneia com laser. O tema é
forte, mas o mecanismo exige uns 40 segundos de contexto antes de qualquer coisa fazer sentido.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Abre pelo efeito na vida da pessoa, põe o mecanismo depois numa frase e escreve 4 hooks desse efeito. |
| 2 | pontua | 2 | Abre com uma pergunta provocativa sobre ronco e mantém a explicação inteira, cortando todo o resto. |
| 3 | neutro | 1 | Divide o tema em dois Reels, um de contexto e outro de mecanismo, publicados em dias seguidos. |
| 4 | atencao | 0 | Mantém a ordem natural do assunto, contexto primeiro, porque sem ele ninguém entende o resto do vídeo. |

### MC6 · O mesmo ajuste pedido pela terceira vez
*(dimensão: Colaboração + Devolutiva técnica · 4 min)*

**Cenário.** O editor entrega o terceiro vídeo da semana com o mesmo problema dos dois anteriores:
a legenda entra meio segundo atrasada e o corte do hook está frouxo. Você já pediu ajuste duas
vezes, por escrito.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Chama para uma conversa curta, mostra os três casos na tela e combina o padrão por escrito. |
| 2 | pontua | 2 | Devolve de novo por escrito, agora com a marcação de tempo exata de cada ponto a ajustar no vídeo. |
| 3 | neutro | 1 | Escala para a Coordenação cobrar o padrão: você já pediu duas vezes e não é sua função insistir. |
| 4 | atencao | 0 | Corrige por conta própria o que dá e entrega no prazo, para não travar o calendário de posts da semana. |

### Caso aberto · O «Professor Sarcástico» encosta no limite
*(mantido do banco no ar — content_hash 31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79)*
*(18 min)*

**Cenário.** O Dr. te manda um áudio empolgado: quer gravar um Reel no tom do "Professor
Sarcástico" ironizando clínicas que "vendem lente de contato dental para todo mundo". No áudio,
ele cita um concorrente pelo nome. É o quadro que mais engaja no perfil.

**Escreva:** (a) como você levaria isso ao ar mantendo o tom e o engajamento; (b) o que mudaria e
por quê; (c) o que diria ao Dr.; (d) qual é o limite que você não cruzaria.

**Rubric** — `score_max` 25 · `entrevista` 13 · `avanca` 18

| dimensão | peso |
|---|---|
| raciocinio_editorial | 25 |
| conformidade_publicidade | 25 |
| preservacao_do_tom | 20 |
| comunicacao_com_o_lider | 20 |
| limite_explicito | 10 |

---

## Cargo `videomaker-storymaker`

**Versão nova (D-35).** Mesmos cenários e dimensões do rascunho de 30/09 (`docs/specs/DRAFT-banco-sjt-marketing.md`, árvore de trabalho); as alternativas foram reescritas até o critério proposto passar — inclusive o posto por cargo. O caso aberto **fica** como está no ar: a linha «mantido» abaixo do título traz o `content_hash` medido em PROD, e o gerador recusa o texto se ele não reproduzir esse hash.

### MC1 · O dia não rendeu material
*(dimensão: Narrativa em stories + Iniciativa · 4 min)*

**Cenário.** Quarta fraca: dois pacientes desmarcaram, o Dr. passou a manhã em reunião fechada e
a tarde tem só um atendimento longo. São 11h e você tem 4 stories publicados. A meta do dia é 20.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Usa o tempo morto nos quadros que não dependem de paciente e combina um quadro do banco com a social media. |
| 2 | pontua | 2 | Aproveita o atendimento longo da tarde e faz dele uma sequência completa de stories, com começo, meio e fim. |
| 3 | neutro | 1 | Publica menos hoje e compensa amanhã, avisando a Coordenação logo cedo de que o dia rendeu pouco material. |
| 4 | atencao | 0 | Republica cortes de stories antigos que foram bem, para não quebrar a constância do perfil no dia de hoje. |

### MC2 · A sessão de gravação atrasou
*(dimensão: Planejamento + Comunicação · 4 min)*

**Cenário.** A sessão semanal estava marcada para as 14h; são 15h40 e o Dr. segue em atendimento.
Há 6 roteiros na pauta, e o editor precisa do material amanhã cedo.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Deixa o set pronto, avisa a Coordenação do risco de prazo e decide com ela quais roteiros gravar. |
| 2 | pontua | 2 | Espera e grava tudo no que sobrar do dia, mesmo com a luz e o áudio piores que o padrão do perfil. |
| 3 | neutro | 1 | Remarca a sessão inteira para a semana seguinte, quando houver tempo para fazer tudo direito. |
| 4 | atencao | 0 | Grava os roteiros com outra pessoa da equipe no lugar do Dr., para não perder o prazo do editor. |

### MC3 · O melhor material do mês, sem autorização
*(dimensão: Discrição + Leitura de ambiente · 4 min)*

**Cenário.** Um paciente emocionado agradece o Dr. no corredor, chorando, dizendo que voltou a
sorrir depois de 10 anos. É o melhor material que você viu no mês. Ele não sabe que você está
por perto, e não há câmera à vista.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Não grava. Depois, com calma, pergunta se ele toparia contar de novo em vídeo, com termo assinado. |
| 2 | pontua | 2 | Aborda o paciente ali mesmo no corredor, ainda emocionado, e já o convida para gravar um depoimento. |
| 3 | neutro | 1 | Deixa o momento passar sem gravar e não comenta com ninguém, nem volta a falar com ele depois. |
| 4 | atencao | 0 | Grava e publica em stories: é um depoimento espontâneo e verdadeiro, e ele ficaria feliz de aparecer. |

### MC4 · O momento que não se repete
*(dimensão: Captação em tempo real — competência central · 4 min)*

**Cenário.** O Dr. está no meio de um procedimento com uma paciente que **está na lista de termos
assinados do dia**, e acontece algo que renderia um story ótimo: ele explica a ela, ali, por que
não vai extrair o dente que outra clínica tinha condenado. Você está com o celular na mão, a luz
está ruim e há barulho de sugador.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Grava assim mesmo, priorizando o áudio, e publica com legenda: a fala é o conteúdo e não volta. |
| 2 | pontua | 2 | Grava em silêncio e publica só a imagem, com um texto na tela resumindo o que aconteceu na sala. |
| 3 | neutro | 1 | Não grava e pede ao Dr. que reconte a história depois, num set preparado com luz e áudio bons. |
| 4 | atencao | 0 | Ajusta a luz e posiciona o lapela antes de começar a gravar, para não publicar um material ruim. |

### MC5 · O equipamento falha 20 minutos antes
*(dimensão: Set de gravação + Contingência · 4 min)*

**Cenário.** A sessão semanal começa em 20 minutos. Montando o set, você descobre que o microfone
de lapela não está carregando e o teleprompter do tablet trava ao rolar o texto. O Dr. tem uma
janela de 40 minutos e não haverá outra nesta semana.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Resolve com o que tem: microfone do celular por perto e o roteiro impresso em cartões fora do quadro. |
| 2 | pontua | 2 | Grava com o áudio do celular e o Dr. lendo o roteiro do próprio celular na mão, sem teleprompter. |
| 3 | neutro | 1 | Usa os 20 minutos tentando consertar o lapela e começa a sessão com atraso, com menos tempo de gravação. |
| 4 | atencao | 0 | Remarca a sessão e comunica que, sem o equipamento funcionando, não dá para garantir a qualidade. |

### MC6 · Três dias de material e o editor começa segunda às 8h
*(dimensão: Organização de arquivo · 4 min)*

**Cenário.** Sexta, 19h. Você tem material de três dias no celular e na câmera: 2 sessões de
gravação, fotos de dois photodumps e bastidores da obra. O editor abre a fila segunda às 8h, e
você vai emendar o fim de semana.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Sobe tudo nomeado no padrão, separado por dia, com um recado ao editor sobre o que é prioridade. |
| 2 | pontua | 2 | Sobe tudo numa pasta única "semana 39" e manda uma mensagem ao editor dizendo o que é cada coisa. |
| 3 | neutro | 1 | Sobe as sessões de gravação, que são prioridade, e deixa as fotos e os bastidores para segunda cedo. |
| 4 | atencao | 0 | Deixa tudo nos dispositivos e sobe na segunda antes das 8h, ainda a tempo da fila do editor. |

### Caso aberto · Um dia inteiro de cobertura
*(mantido do banco no ar — content_hash 98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa)*
*(18 min)*

**Cenário.** É seu primeiro dia sozinho. A agenda tem: 3 atendimentos com laser, uma reunião do
Dr. com um fornecedor, o almoço da equipe e uma obra em andamento no segundo andar. A meta é de
20 a 30 stories publicados no dia, com começo, meio e fim.

**Escreva:** (a) a sequência que publicaria ao longo do dia, e qual é o arco dela; (b) quais três
momentos você transformaria depois em conteúdo de feed, e por quê; (c) o que NÃO filmaria e por
quê; (d) o que faria se o dia rendesse pouco material.

**Rubric** — `score_max` 25 · `entrevista` 13 · `avanca` 18

| dimensão | peso |
|---|---|
| narrativa_do_dia | 30 |
| olho_editorial_e_reaproveitamento | 25 |
| conformidade_e_autorizacao | 20 |
| planejamento_e_contingencia | 15 |
| leitura_de_ambiente | 10 |

---

## Cargo `editor-video`

**Versão nova (D-35).** Mesmos cenários e dimensões do rascunho de 30/09 (`docs/specs/DRAFT-banco-sjt-marketing.md`, árvore de trabalho); as alternativas foram reescritas até o critério proposto passar — inclusive o posto por cargo. O caso aberto **fica** como está no ar: a linha «mantido» abaixo do título traz o `content_hash` medido em PROD, e o gerador recusa o texto se ele não reproduzir esse hash.

### MC1 · O corte que retém contra o corte que pediram
*(dimensão: Ritmo para retenção + Colaboração · 4 min)*

**Cenário.** O Dr. gravou uma explicação de 90 segundos e pediu que saísse "inteira, porque cada
parte importa". Você sabe que os primeiros 25 segundos são preâmbulo, e a retenção do perfil cai
forte antes dos 15s.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Monta duas versões, a inteira e uma de 45s, e leva à social media com o número de retenção. |
| 2 | pontua | 2 | Entrega a versão curta, explicando na entrega por que cortou os 25 segundos iniciais do vídeo. |
| 3 | neutro | 1 | Entrega a versão inteira, como pedido, registrando na entrega a preocupação com a retenção. |
| 4 | atencao | 0 | Entrega inteira e não comenta nada: o pedido veio de quem aparece no vídeo e conhece o conteúdo. |

### MC2 · O hook mais forte da semana promete resultado
*(dimensão: Conformidade + Alçada · 4 min)*

**Cenário.** A social media te manda um roteiro cujo hook é "Seu dentista nunca te contou isso:
dá pra tratar canal sem dor nenhuma". O vídeo já foi gravado com esse texto no teleprompter, e é
o hook mais forte da semana.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Edita e entrega avisando que "sem dor nenhuma" é promessa, e propõe duas variações sem ela. |
| 2 | pontua | 2 | Edita como está e registra a dúvida sobre a frase na entrega, para a social media decidir o que fazer. |
| 3 | neutro | 1 | Edita como está e não comenta: o texto é da social media, que responde pela mensagem publicada. |
| 4 | atencao | 0 | Reescreve o hook por conta própria e entrega o vídeo já alterado, sem avisar ninguém da mudança. |

> As opções 3 e 4 são as duas falhas opostas de alçada: a 3 abdica de uma responsabilidade que o
> descritivo põe na edição; a 4 invade «Não decide: mudança de roteiro ou de mensagem».

### MC3 · Material quebrado com prazo em cima
*(dimensão: Cumprimento de prazo + Comunicação · 4 min)*

**Cenário.** São 4 vídeos para hoje. No terceiro, você descobre que o material bruto do quarto
chegou sem áudio aproveitável. Faltam 2 horas para a entrega.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Avisa a Coordenação na hora e propõe entregar 3 hoje e o quarto amanhã, com o áudio regravado. |
| 2 | pontua | 2 | Entrega os 3 vídeos prontos e deixa o quarto para amanhã, avisando a Coordenação no fim do dia. |
| 3 | neutro | 1 | Entrega os 4 no prazo, salvando o quarto vídeo com legenda e trilha por cima do áudio ruim. |
| 4 | atencao | 0 | Entrega os 4 vídeos no prazo combinado e não menciona o problema de áudio do quarto vídeo. |

### MC4 · Quatro variações que precisam ser diferentes
*(dimensão: Variação de hook · 4 min)*

**Cenário.** O tráfego pediu 4 variações de hook para o Reel que melhor performou no orgânico. O
vídeo fala sobre clareamento sem sensibilidade.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Faz quatro aberturas com ângulos distintos e nomeia os arquivos para comparar o resultado. |
| 2 | pontua | 2 | Faz quatro aberturas com o mesmo argumento, variando a frase e o ritmo do corte em cada uma. |
| 3 | neutro | 1 | Entrega duas variações fortes e explica ao tráfego que as outras duas seriam só repetição. |
| 4 | atencao | 0 | Troca a primeira frase do texto na tela nas quatro versões, mantendo a imagem idêntica. |

### MC5 · O que aparece no fundo do quadro
*(dimensão: Atenção a detalhe + Conformidade · 4 min)*

**Cenário.** Você finaliza o último vídeo do dia, com entrega marcada para as 18h. No segundo 14,
ao fundo, a tela do computador da recepção aparece desfocada — mas dá para ler o nome de um
paciente na agenda.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Cobre ou corta o trecho com a tela e entrega, sinalizando à social media o ajuste que fez. |
| 2 | pontua | 2 | Entrega no prazo avisando que há uma tela legível ao fundo, para a social media decidir antes. |
| 3 | neutro | 1 | Aumenta o desfoque do fundo até não dar mais para ler o nome, e entrega sem comentar nada. |
| 4 | atencao | 0 | Entrega como está: o fundo está desfocado, e ninguém vai pausar o vídeo para ler a agenda. |

### MC6 · Material fora do padrão, e é o único que há
*(dimensão: Padrão visual + Prioridade · 4 min)*

**Cenário.** Chega material gravado por outra pessoa, enquanto o videomaker estava de folga:
enquadramento diferente, temperatura de cor mais fria, áudio com outro timbre. É o único material
do quadro desta semana.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Aproxima cor e áudio do padrão, avisa o que não deu para igualar e propõe um mínimo de captação. |
| 2 | pontua | 2 | Ajusta só a cor, que é o que mais salta aos olhos no vídeo, e comenta o resto na própria entrega. |
| 3 | neutro | 1 | Entrega como veio, sinalizando na entrega que o material fugiu do padrão visual do perfil. |
| 4 | atencao | 0 | Refaz o grading até bater exatamente com o padrão, mesmo atrasando as outras entregas do dia. |

### Caso aberto · Seis minutos densos viram 60 segundos
*(mantido do banco no ar — content_hash c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c)*
*(18 min)*

**Cenário.** Você recebe um vídeo de 6 minutos: o Dr. explicando, em linguagem técnica, por que a
limpeza a laser mata bactéria que a raspagem não alcança. É denso e é bom. A meta é um Reel de
até 60 segundos, e a social media pediu 3 variações de hook.

**Escreva:** (a) como escolheria os 60 segundos; (b) as 3 variações de hook que proporia e o que
cada uma testa; (c) o que faria com o resto do material; (d) o que checaria antes de entregar.

**Rubric** — `score_max` 25 · `entrevista` 13 · `avanca` 18

| dimensão | peso |
|---|---|
| ritmo_e_retencao | 30 |
| variacao_de_hook | 25 |
| conformidade_na_entrega | 20 |
| reaproveitamento | 15 |
| clareza_de_processo | 10 |
