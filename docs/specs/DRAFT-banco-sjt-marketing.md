# DRAFT — Banco SJT do squad de Marketing (3 cargos)

## ⚠ ERRATA da migration `20260929000001` — leia antes do cabeçalho dela

O cabeçalho da migration gerada a partir deste arquivo tem **dois erros de fato**, achados em
2026-09-29 por conferência independente. Eles **não podem ser corrigidos no arquivo**: o
`md5(statements[1])` registrado no ledger de PROD cobre o cabeçalho, e editá-lo faria o md5
divergir e quebraria a própria prova de que o que rodou é o que está no repositório.

É o mesmo caso das migrations `20260823000001`..`4`, descrito no `CLAUDE.md`: **a correção vive
fora do arquivo**. Isto é padrão estabelecido neste projeto, não improviso.

| Linha | O que diz | O que é |
|---|---|---|
| 11 | «dentro de um peso de 30%» | **35%.** `pesos_avaliacao` da vaga viva: `{"triagem":25,"entrevista":25,"work_sample_sjt":35,"redacao_cultural":15}`. O SJT é o componente **mais pesado** da avaliação, acima de entrevista e triagem. O 30 é o valor *proposto* para as vagas novas e vazou para a justificativa de um defeito que é sobre a vaga antiga — a migration subdimensiona o problema que ela mesma resolve. |
| 37 | «Gerador: `scratchpad/gen-sjt.py`» | **`scripts/geradores/gen-sjt-marketing.py`.** Caminho morto: `scratchpad/` não existe no repositório. Quem fizer checkout e seguir o ponteiro não acha o gerador — com os três arquivos da cadeia ali do lado. |

Esta errata está no topo deste arquivo **de propósito**, e é inócua por construção: o parser do
gerador faz `re.split(r'^## Cargo ', src, flags=re.M)[1:]`, e o `[1:]` descarta tudo o que vem
antes do primeiro `## Cargo`. Nada aqui pode alterar o SQL emitido — conferido por execução
depois de escrever isto.

Ver também `JORN-51` no `REQUIREMENTS.md`.


> **Não aplicado.** Conteúdo para aprovação antes de virar migration.
> Tamanho decidido em 2026-09-29: 6 múltipla escolha + 1 caso aberto por cargo. O `dentista`
> tem 3+1 — tamanho herdado que ninguém validou; com 3 MC, uma escolha isolada move o candidato
> de faixa (placar máx. 12, threshold 60% = 7,2).
> Fonte dos cenários: tabelas «Alçada e limites de decisão» dos 3 descritivos v1 + Mapa Cultural.

Cargos novos: `social-media` · `videomaker-storymaker` · `editor-video`
Total: **21 itens** (18 MC + 3 caso aberto), 72 opções. Placar MC por cargo: 24 pontos.
Tempo estimado por candidato: 6 × 4 min + 18 min = **42 min**.
Tags e pesos seguem o gabarito: fortemente_pontua 4 · pontua 2 · neutro 1 · atencao 0.

---

## Cargo `social-media`

### MC1 · O dado contradiz o quadro preferido do chefe
*(dimensão: Leitura de dados + Atitude de Dono · 4 min)*

**Cenário.** O quadro "Estudo do dia" é o preferido do Dr. e o que ele mais cobra. Depois de 8
semanas, é o de menor retenção do perfil (média de 18%) e quase não recebe salvamento — enquanto
os bastidores de consultório, que ele acha "bobos", retêm 46%. Na sexta você apresenta o
relatório de quadros.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Leva os dois números lado a lado e propõe um teste: manter o Estudo do dia com formato novo (hook diferente, mais curto) por 3 semanas e aumentar a frequência dos bastidores — com o critério de corte combinado antes de começar. |
| 2 | pontua | 2 | Apresenta os números e recomenda cortar o Estudo do dia, porque o dado é claro. |
| 3 | neutro | 1 | Apresenta os números sem recomendação e deixa a decisão com o Dr. |
| 4 | atencao | 0 | Mantém o Estudo do dia como está — é o quadro que o Dr. quer, e insistir só desgasta a relação. |

### MC2 · "Está bom, mas não é assim que eu falo"
*(dimensão: Escrita na voz do outro + Receptividade a feedback · 4 min)*

**Cenário.** Na leitura semanal em voz alta, o Dr. trava em três dos cinco roteiros e diz "está
bom, mas não é assim que eu falo". Ele não sabe explicar o que mudaria. A gravação é depois de
amanhã.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Pede que ele conte a mesma ideia do jeito dele, grava o áudio ali, e reescreve a partir das palavras que ele usou — alimentando o banco de frases com o que saiu. |
| 2 | pontua | 2 | Reescreve os três mais curtos e mais coloquiais, e leva de volta para ele. |
| 3 | neutro | 1 | Mantém os dois que funcionaram, descarta os três e escreve outros do zero. |
| 4 | atencao | 0 | Grava assim mesmo — no teleprompter ele adapta na hora, e o calendário não pode parar. |

### MC3 · Imagem de paciente, pedida por quem manda
*(dimensão: Ética + Discrição · 4 min)*

**Cenário.** O Dr. manda no grupo um vídeo gravado no consultório mostrando o resultado de uma
paciente, e escreve "posta hoje, ficou incrível". Você não encontra o termo de autorização dela
no arquivo.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Segura a publicação, avisa o Dr. e a Coordenação de que falta o termo, e pede à recepção que confirme ou colha antes. |
| 2 | pontua | 2 | Publica cortando o rosto e mostrando só a boca, e providencia o termo depois. |
| 3 | neutro | 1 | Publica em stories, por ser temporário, e não no feed. |
| 4 | atencao | 0 | Publica — foi o próprio Dr. quem mandou, e a autorização é responsabilidade da clínica. |

### MC4 · O estudo que sustenta o "Estudo do dia"
*(dimensão: Checagem de fonte + Comunicação com o líder · 4 min)*

**Cenário.** Para o "Estudo do dia" de amanhã, o Dr. te manda o print de um post de outro dentista
afirmando que "laser reduz em 80% a recidiva de cárie". Não há referência. Você procura e acha um
estudo parecido — com 34 participantes e sem grupo controle.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Leva ao Dr. o que encontrou — o estudo existe, mas é frágil — e propõe trocar por um achado que dê para referenciar, ou manter o tema falando de mecanismo em vez de número. |
| 2 | pontua | 2 | Publica sem o número, falando só do mecanismo, e não comenta a fragilidade com o Dr. |
| 3 | neutro | 1 | Tira o tema da pauta e escolhe outro assunto para o dia. |
| 4 | atencao | 0 | Usa o número citando "estudos mostram" — o Dr. mandou, e é ele quem entende do assunto. |

### MC5 · Um tema bom que é chato de explicar
*(dimensão: Roteiro para vídeo curto — competência central · 4 min)*

**Cenário.** Você precisa escrever um Reel sobre tratamento de ronco e apneia com laser. O tema é
forte, mas o mecanismo exige uns 40 segundos de contexto antes de qualquer coisa fazer sentido.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Abre pelo efeito na vida da pessoa (dormir a noite inteira, o cônjuge voltar para o quarto) e entrega o mecanismo depois, em uma frase — e escreve 4 hooks testando ângulos diferentes do mesmo efeito. |
| 2 | pontua | 2 | Abre com uma pergunta provocativa sobre ronco e mantém a explicação inteira, cortando o resto. |
| 3 | neutro | 1 | Divide em dois Reels: um de contexto e um de mecanismo. |
| 4 | atencao | 0 | Mantém a ordem natural do assunto — contexto primeiro, porque sem ele ninguém entende o resto. |

### MC6 · O mesmo ajuste pedido pela terceira vez
*(dimensão: Colaboração + Devolutiva técnica · 4 min)*

**Cenário.** O editor entrega o terceiro vídeo da semana com o mesmo problema dos dois anteriores:
a legenda entra meio segundo atrasada e o corte do hook está frouxo. Você já pediu ajuste duas
vezes, por escrito.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Chama para uma conversa curta, mostra os três casos lado a lado na tela, combina o padrão explicitamente e registra onde ele fica para consulta. |
| 2 | pontua | 2 | Devolve de novo por escrito, agora com marcação de tempo exata em cada ponto. |
| 3 | neutro | 1 | Corrige você mesma o que dá e entrega no prazo, para não travar o calendário. |
| 4 | atencao | 0 | Escala para a Coordenação cobrar o padrão — você já pediu duas vezes e não é sua função insistir. |

### Caso aberto · O «Professor Sarcástico» encosta no limite
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

### MC1 · O dia não rendeu material
*(dimensão: Narrativa em stories + Iniciativa · 4 min)*

**Cenário.** Quarta fraca: dois pacientes desmarcaram, o Dr. passou a manhã em reunião fechada e
a tarde tem só um atendimento longo. São 11h e você tem 4 stories publicados. A meta do dia é 20.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Usa o tempo morto nos quadros que não dependem de paciente (estudo, academia, obra, equipamento) e combina com a social media puxar um quadro do banco para o dia. |
| 2 | pontua | 2 | Aproveita o atendimento longo da tarde e faz dele uma sequência completa, com começo, meio e fim. |
| 3 | neutro | 1 | Publica menos hoje e compensa amanhã, avisando a Coordenação. |
| 4 | atencao | 0 | Republica cortes de stories antigos que foram bem, para não quebrar a constância. |

### MC2 · A sessão de gravação atrasou
*(dimensão: Planejamento + Comunicação · 4 min)*

**Cenário.** A sessão semanal estava marcada para as 14h; são 15h40 e o Dr. segue em atendimento.
Há 6 roteiros na pauta, e o editor precisa do material amanhã cedo.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Deixa o set pronto para começar em minutos, avisa a social media e a Coordenação do risco de prazo, e prioriza com elas quais roteiros gravar no tempo que restar. |
| 2 | pontua | 2 | Espera e grava tudo no que sobrar do dia, mesmo com luz e áudio piores. |
| 3 | neutro | 1 | Remarca a sessão inteira para a semana seguinte. |
| 4 | atencao | 0 | Grava os roteiros com outra pessoa da equipe no lugar do Dr., para não perder o prazo. |

### MC3 · O melhor material do mês, sem autorização
*(dimensão: Discrição + Leitura de ambiente · 4 min)*

**Cenário.** Um paciente emocionado agradece o Dr. no corredor, chorando, dizendo que voltou a
sorrir depois de 10 anos. É o melhor material que você viu no mês. Ele não sabe que você está
por perto, e não há câmera à vista.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Não grava. Depois, com calma, pergunta se ele toparia contar de novo em vídeo, com termo assinado. |
| 2 | pontua | 2 | Grava só o áudio e pede autorização depois, porque o momento não se repete. |
| 3 | neutro | 1 | Grava, guarda sem publicar, e decide depois com a Coordenação. |
| 4 | atencao | 0 | Grava e publica em stories — é depoimento espontâneo e verdadeiro, e ele ficaria feliz de aparecer. |

### MC4 · O momento que não se repete
*(dimensão: Captação em tempo real — competência central · 4 min)*

**Cenário.** O Dr. está no meio de um procedimento com uma paciente que **está na lista de termos
assinados do dia**, e acontece algo que renderia um story ótimo: ele explica a ela, ali, por que
não vai extrair o dente que outra clínica tinha condenado. Você está com o celular na mão, a luz
está ruim e há barulho de sugador.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Grava assim mesmo priorizando o áudio (aproxima o celular, encosta o microfone) e publica com legenda — a fala é o conteúdo, e ela não volta. |
| 2 | pontua | 2 | Grava em silêncio e publica só a imagem, com texto na tela resumindo o que aconteceu. |
| 3 | neutro | 1 | Não grava e pede ao Dr. que reconte depois, num set preparado. |
| 4 | atencao | 0 | Ajusta a luz e posiciona o lapela antes de começar a gravar, para não publicar material ruim. |

### MC5 · O equipamento falha 20 minutos antes
*(dimensão: Set de gravação + Contingência · 4 min)*

**Cenário.** A sessão semanal começa em 20 minutos. Montando o set, você descobre que o microfone
de lapela não está carregando e o teleprompter do tablet trava ao rolar o texto. O Dr. tem uma
janela de 40 minutos e não haverá outra nesta semana.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Resolve com o que tem — microfone direcional do celular a curta distância e o roteiro impresso em cartões grandes fora do quadro — e avisa a Coordenação da reposição necessária. |
| 2 | pontua | 2 | Grava com o áudio do celular e o Dr. lendo do próprio celular na mão. |
| 3 | neutro | 1 | Usa os 20 minutos tentando consertar o lapela e começa a sessão atrasado. |
| 4 | atencao | 0 | Remarca a sessão e comunica que, sem equipamento, não dá para garantir qualidade. |

### MC6 · Três dias de material e o editor começa segunda às 8h
*(dimensão: Organização de arquivo · 4 min)*

**Cenário.** Sexta, 19h. Você tem material de três dias no celular e na câmera: 2 sessões de
gravação, fotos de dois photodumps e bastidores da obra. O editor abre a fila segunda às 8h, e
você vai emendar o fim de semana.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Sobe tudo na pasta compartilhada, nomeado no padrão e separado por dia e por pauta, com um recado curto ao editor sobre o contexto de cada captação e o que é prioridade. |
| 2 | pontua | 2 | Sobe tudo numa pasta única "semana 39" e manda mensagem ao editor dizendo o que é o quê. |
| 3 | neutro | 1 | Sobe as sessões de gravação, que são prioridade, e deixa fotos e bastidores para segunda cedo. |
| 4 | atencao | 0 | Deixa tudo nos dispositivos e sobe na segunda antes das 8h. |

### Caso aberto · Um dia inteiro de cobertura
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

### MC1 · O corte que retém contra o corte que pediram
*(dimensão: Ritmo para retenção + Colaboração · 4 min)*

**Cenário.** O Dr. gravou uma explicação de 90 segundos e pediu que saísse "inteira, porque cada
parte importa". Você sabe que os primeiros 25 segundos são preâmbulo, e a retenção do perfil cai
forte antes dos 15s.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Monta as duas versões — a inteira e uma de 45s começando pelo ponto mais forte — e leva ambas à social media com o número de retenção, para decidirem com ele. |
| 2 | pontua | 2 | Entrega a versão curta, explicando na entrega por que cortou. |
| 3 | neutro | 1 | Entrega inteira como pedido, registrando a preocupação com a retenção. |
| 4 | atencao | 0 | Entrega inteira e não comenta — o pedido veio de quem aparece no vídeo. |

### MC2 · O hook mais forte da semana promete resultado
*(dimensão: Conformidade + Alçada · 4 min)*

**Cenário.** A social media te manda um roteiro cujo hook é "Seu dentista nunca te contou isso:
dá pra tratar canal sem dor nenhuma". O vídeo já foi gravado com esse texto no teleprompter, e é
o hook mais forte da semana.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Edita e entrega, sinalizando à social media que "sem dor nenhuma" é promessa de resultado, e propõe duas variações de hook sem a promessa para teste. |
| 2 | pontua | 2 | Edita como está e registra a dúvida na entrega. |
| 3 | neutro | 1 | Edita como está — o texto é da social media, que responde pela mensagem. |
| 4 | atencao | 0 | Reescreve o hook por conta própria e entrega já alterado, sem avisar. |

> As opções 3 e 4 são as duas falhas opostas de alçada: a 3 abdica de uma responsabilidade que o
> descritivo põe na edição; a 4 invade «Não decide: mudança de roteiro ou de mensagem».

### MC3 · Material quebrado com prazo em cima
*(dimensão: Cumprimento de prazo + Comunicação · 4 min)*

**Cenário.** São 4 vídeos para hoje. No terceiro, você descobre que o material bruto do quarto
chegou sem áudio aproveitável. Faltam 2 horas para a entrega.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Avisa a Coordenação e a social media na hora e propõe entregar 3 hoje e o quarto amanhã, com regravação do áudio. |
| 2 | pontua | 2 | Entrega os 3 e deixa o quarto para amanhã, avisando no fim do dia. |
| 3 | neutro | 1 | Entrega os 4, salvando o quarto com legenda e trilha por cima do áudio ruim. |
| 4 | atencao | 0 | Entrega os 4 no prazo e não menciona o problema de áudio. |

### MC4 · Quatro variações que precisam ser diferentes
*(dimensão: Variação de hook · 4 min)*

**Cenário.** O tráfego pediu 4 variações de hook para o Reel que melhor performou no orgânico. O
vídeo fala sobre clareamento sem sensibilidade.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Faz quatro aberturas testando ângulos distintos — dor evitada, prova visual, quebra de crença, pergunta direta — mantendo o corpo igual, e nomeia os arquivos de modo que dê para comparar resultado. |
| 2 | pontua | 2 | Faz quatro aberturas com o mesmo argumento, variando a frase e o ritmo do corte. |
| 3 | neutro | 1 | Entrega duas variações fortes e explica que as outras duas seriam repetição. |
| 4 | atencao | 0 | Troca a primeira frase do texto na tela nas quatro versões, mantendo a imagem idêntica. |

### MC5 · O que aparece no fundo do quadro
*(dimensão: Atenção a detalhe + Conformidade · 4 min)*

**Cenário.** Você finaliza o último vídeo do dia, com entrega marcada para as 18h. No segundo 14,
ao fundo, a tela do computador da recepção aparece desfocada — mas dá para ler o nome de um
paciente na agenda.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Cobre ou corta o trecho e entrega, sinalizando à social media o ajuste que fez. |
| 2 | pontua | 2 | Entrega no prazo sinalizando que há uma tela legível ao fundo, para a social media decidir antes de publicar. |
| 3 | neutro | 1 | Aumenta o desfoque até não se ler mais, e entrega sem comentar. |
| 4 | atencao | 0 | Entrega como está — está desfocado, e ninguém vai pausar o vídeo para ler. |

### MC6 · Material fora do padrão, e é o único que há
*(dimensão: Padrão visual + Prioridade · 4 min)*

**Cenário.** Chega material gravado por outra pessoa, enquanto o videomaker estava de folga:
enquadramento diferente, temperatura de cor mais fria, áudio com outro timbre. É o único material
do quadro desta semana.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Aproxima cor e áudio do padrão até onde dá, entrega sinalizando o que não foi possível igualar, e propõe um mínimo de captação para quem substituir o videomaker. |
| 2 | pontua | 2 | Ajusta só a cor, que é o que mais salta, e comenta na entrega. |
| 3 | neutro | 1 | Entrega como veio, sinalizando que o material fugiu do padrão. |
| 4 | atencao | 0 | Refaz o grading até bater exatamente com o padrão, mesmo atrasando as outras entregas do dia. |

### Caso aberto · Seis minutos densos viram 60 segundos
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

---

## Notas de desenho

1. **Nenhum item tem opção `knockout`.** Nenhum cenário aqui justifica rejeitar na hora, e marcar
   knockout por iniciativa própria é proibido pela skill — proposta, se você quiser algum, precisa
   de aprovação explícita sua.
2. **A opção errada é sempre plausível.** Em todos os nove MC, a `atencao` é a resposta que uma
   pessoa competente e bem-intencionada daria sob pressão — é isso que faz o item discriminar.
   Opção errada óbvia não mede nada.
3. **Cada MC cruza duas dimensões**, uma técnica e uma de valor, para não virar teste de decoreba
   de regra.
4. **O score nunca rejeita sozinho** (RNF-07a). `threshold` só marca `pendente_humano`.
