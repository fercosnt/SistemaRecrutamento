# Vaga — Líder de Recepção

> **Aprovado pelo operador em 16/10/2026 («aprovado pode publicar») e aplicado**: o banco
> `lider-recepcao` em `20261016000101`, a vaga em `20261016000102` (nasce `rascunho`); EF
> `avaliar-redacao` publicada com os critérios do caso no mesmo dia. **Publicar** exige o JWT de um
> usuário RH — `publish_vaga` recusa a via de apply —, então é o botão da tela `/rh/vagas`, logado.
> Versão 1 · 2026-10-16 · autor da vaga: Fernando Costa Neto
> Fontes: o descritivo antigo de Recepcionista e o formulário antigo, colados pelo operador em 16/10 ·
> as decisões dele na rodada de perguntas · `docs/conhecimento/fit-cultural/Cultura-Beauty-Smile-Para-Recrutamento.md`.

> ⚠ **As seções marcadas «gerado» saem por script** do payload
> (`docs/vagas/proveniencia/lider-recepcao.payload.json`), do texto do banco
> (`docs/specs/BANCO-SJT-LIDER-RECEPCAO-V1.md`) e do catálogo `supabase/functions/_shared/sjt-rubrica.ts`.
> Não edite à mão: mude a fonte e regere.

## Decisões

| # | Assunto | Situação |
|---|---|---|
| D1 | Liderança | ✅ **Resolvida (16/10)** — começa sozinha na recepção e monta a equipe. O banco mede responsabilidade pelo processo e o começo da liderança (dar feedback, treinar) |
| D2 | Papel comercial | ✅ **Resolvida (16/10)** — fidelização sem vender: retorno, indicação, satisfação. Orçamento e valores ficam com o Dr. Fernando e o pré-vendas |
| D3 | Experiência eliminatória | ✅ **Resolvida (16/10)** — 2 anos ou mais em recepção ou atendimento. Liderança formal conta ponto, não elimina |
| D4 | Redação | ✅ **Resolvida (16/10)** — só `C1` (melhoria de processo), ~25 min |
| D5 | Banco do teste situacional (§3) | ✅ **Aprovado (16/10)** — 6 de uma lista de 12, e o caso, escolhidos pelo operador; o texto das alternativas aprovado junto |
| D6 | Horário | ✅ **Aprovado (16/10)** como proposto — o descritivo dizia «horário comercial»; ficou o do SDR: segunda a sexta, 9h às 19h, 1h12 de intervalo, 44h com compensação do sábado. Se for outro, muda `sobre_cargo`, `jornada_trabalho`, a pergunta 1 e os textos de divulgação |
| D7 | Salário no anúncio | ✅ **Aprovado (16/10)** — como no SDR, o anúncio diz «valores apresentados na entrevista». A faixa R$ 3.000–4.000 fica gravada no banco, que não a exibe a ninguém |
| D8 | Benefícios | ✅ **Aprovado (16/10)** como proposto — a lista do SDR (vale-transporte, plano de saúde, Wellhub, tratamentos e desconto para familiares, cursos; após 3 meses), **sem vale-refeição**. Se o VR entrar depois, muda `beneficios` e os textos de divulgação |
| D9 | Knockout (§2) | ✅ **Aprovado (16/10)** — «Tenho disponibilidade apenas para trabalho remoto» encerra a candidatura na inscrição, como no SDR. Disponibilidade parcial NÃO elimina na inscrição: vira lacuna crítica na triagem |
| D10 | Perguntas da Etapa 1 (§2) | ✅ **Aprovadas (16/10)** — 9 perguntas, 1 aberta e opcional, a partir do formulário antigo |
| D11 | Rubrica da IA (§6) | ✅ **Aprovada (16/10)** |
| D12 | Critérios do caso escrito (§15) | ✅ **Aprovados (16/10)** — EF `avaliar-redacao` publicada no mesmo dia; o bundle baixado de volta é idêntico ao disco |

## O fluxo, de ponta a ponta

**1 · Inscrição** — pública. Dados, currículo em PDF e as **9 perguntas da Etapa 1** (§2), uma delas
aberta e opcional. **Uma opção elimina** (D9): só trabalho remoto. É a única rejeição automática do
funil.

**2 · Triagem** — a IA lê o currículo, as respostas da Etapa 1 e a rubrica (§6), e nada mais. **O
sistema nunca rejeita sozinho.** Não há avanço automático: o RH aprova pessoa a pessoa.

**3 · Avaliação assíncrona** — liberada a quem o RH aprovou:

| | o que é | tempo | pesa? |
|---|---|---|---|
| Teste situacional, múltipla escolha (§3) | 6 situações do dia a dia da recepção, 4 alternativas embaralhadas | ~24 min | sim |
| Caso escrito (§3, §15) | passo a passo, a jornada de uma paciente nova com medo de dentista, da marcação ao dia seguinte — 200 a 500 palavras | ~20 min | sim |
| Redação `C1` (§4) | uma melhoria de processo que a pessoa propôs e implementou — 200 a 500 palavras | ~25 min | sim |
| Big Five | 116 itens | ~15 min | **não** — contexto, com devolutiva ao candidato |

**4 · Entrevista** — o roteiro sai do perfil ideal (§11).

**5 · Decisão final** — humana.

**Total pedido ao candidato antes de falar com alguém: ~1h25.**

### Onde o peso cai
<!-- gerado: payload.pesos_avaliacao — nao editar a mao -->

| Etapa | Peso |
|---|---|
| `triagem` | 25 |
| `work_sample_sjt` | 30 |
| `redacao_cultural` | 20 |
| `entrevista` | 25 |
| soma | 100 |

Pesos do template `recepcionista`. ⚠ O score final **não pondera a triagem** — ela aparece como contexto (`consolidar-decisao-final`, UX-09). O composto usa teste situacional, redação e entrevista, renormalizados: 40% · ~27% · ~33%.

## 1 · O anúncio, como o candidato lê
<!-- gerado: payload.vaga — nao editar a mao -->

Os blocos em cerca são o markdown exato que vai ao banco; a página o renderiza.

### Título (texto puro)

> Líder de Recepção

### Subtítulo (texto puro)

> Recepção, agenda e experiência do paciente · CLT presencial · unidade Paraíso

### Resumo (texto puro)

> Para quem já é referência em recepção: cuidar da primeira e da última impressão do paciente, responder pela agenda e pelo padrão de atendimento e formar a equipe que vem. CLT, presencial no Paraíso, em São Paulo.

### Sobre o cargo

````markdown
Na Beauty Smile, o tratamento é feito 100% com o laser Fotona LightWalker — uma odontologia sem dor, sem trauma e minimamente invasiva. Muitos dos nossos pacientes chegam com medo de dentista, e a primeira e a última impressão da clínica acontecem na recepção.

Buscamos alguém que já seja referência em recepção para **responder pela recepção**: cuidar de cada paciente da chegada à saída, organizar a agenda e o padrão de atendimento, e formar a equipe que vem.

**A equipe.** Você começa como a pessoa da recepção. Conforme a clínica cresce, é você quem treina e lidera as próximas recepcionistas.

**O que esta vaga não é.** Não é vaga de vendas. Você cuida do relacionamento e do retorno dos pacientes; orçamento e valores ficam com o Dr. Fernando e a equipe de pré-vendas.

### O que acompanhamos com você

- Confirmação das consultas e faltas na agenda.
- Tempo de resposta no WhatsApp da clínica.
- Satisfação dos pacientes e reclamações resolvidas.
- Retorno e manutenção dos pacientes em tratamento.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h, com 1h12 de intervalo — 44h semanais, em regime CLT, com compensação do sábado por acordo escrito.

### Como é o processo seletivo

Inscrição com perguntas objetivas e análise do currículo. Quem avança recebe uma avaliação online, para fazer no seu tempo: seis situações do dia a dia da recepção, um caso escrito e uma redação curta. Depois, entrevista.
````

### Responsabilidades

````markdown
- **Atendimento.** Receber os pacientes pelo nome, com calma e cuidado — inclusive quem chega com medo — e atender telefone, WhatsApp e e-mail com agilidade.
- **Agenda.** Marcar, confirmar e encaixar consultas, trabalhar para reduzir faltas e avisar o paciente com antecedência quando houver atraso.
- **Documentos e LGPD.** Cuidar do cadastro, dos termos e dos exames dos pacientes, com o arquivamento correto e a proteção de dados que a LGPD exige.
- **Administrativo.** Receber pagamentos, fechar o caixa do dia, controlar o estoque de materiais da recepção e apoiar a equipe em demandas administrativas.
- **Relacionamento.** Acompanhar o retorno dos pacientes em tratamento, coletar a opinião deles, resolver reclamações até o fim e promover o programa de indicação. Interesse em novo procedimento vai para a avaliação, nunca para uma conversa de preço na recepção.
- **Processo e equipe.** Manter os checklists e o padrão de atendimento da recepção, propor melhorias e treinar quem chegar para trabalhar com você.
````

### Formação

````markdown
Ensino médio completo.
````

### Experiência

````markdown
**Pelo menos 2 anos em recepção ou atendimento ao cliente.**

**Contam pontos:** recepção de clínica odontológica ou da área da saúde; ter treinado colegas, montado escala ou respondido pela recepção na ausência da liderança.
````

### Conhecimentos técnicos

````markdown
Sistema de agendamento (qualquer um); WhatsApp Business; planilhas, como Excel ou Google Planilhas; cuidado com dados de pacientes (LGPD).

**Contam pontos:** Clinicorp; recebimento de pagamentos e fechamento de caixa; controle de estoque. Se você nunca usou o Clinicorp, a clínica treina.
````

### Habilidades

````markdown
- **Responsável pelo processo** — segue o que está combinado e, quando algo não funciona, propõe a mudança e testa.
- **Comunicação** — escreve e fala com clareza, com o paciente e com a equipe.
- **Calma sob pressão** — agenda cheia, paciente irritado e telefone tocando ao mesmo tempo.
- **Organização** — prioriza o que importa e não deixa nada se perder entre um turno e outro.
- **Discrição** — trata os dados e a história de cada paciente com sigilo.
````

### Diferenciais

````markdown
- Experiência em recepção de clínica odontológica ou da área da saúde.
- Experiência com o Clinicorp ou outro sistema de agenda de clínica.
- Experiência com gestão de documentos e LGPD.
- Experiência treinando colegas ou organizando a rotina de uma equipe de atendimento.
````

### Contrato e benefícios

````markdown
Contrato CLT, com salário fixo. Os valores são apresentados na entrevista.

- Vale-transporte e plano de saúde.
- Wellhub.
- Tratamentos Beauty Smile e desconto em procedimentos para familiares, conforme política interna.
- Cursos e treinamentos internos.

*Benefícios válidos após o período de experiência (3 meses).*
````

### Sobre a empresa

````markdown
A Beauty Smile nasceu da união de três trajetórias de inovação: Fernando Costa Jr., pioneiro em implantes no Brasil e fundador das primeiras clínicas dedicadas exclusivamente à especialidade; Fernando Costa Neto, que enxergou o potencial revolucionário do laser na odontologia; e Ricardo Blaustein, que trouxe a tecnologia Fotona ao país. Somos a única clínica do Brasil a trabalhar exclusivamente com o laser Fotona LightWalker, o sistema mais avançado do mundo — para oferecer uma odontologia sem dor, sem trauma e com uma experiência humanizada.

Além da excelência clínica, mantemos um compromisso social real: projetos em parceria com o Instituto Alok e na comunidade do Salgueiro levam odontologia de ponta a quem mais precisa. Aqui, não tratamos apenas sorrisos — transformamos vidas.
````

### Seção extra — Conheça a Beauty Smile

````markdown
- Perfil do Dr. Fernando Costa Jr., onde o trabalho acontece: @fernandocostalaser
- Instagram da clínica: @beautysmilefotona
- YouTube: @beautysmilefotona
- Facebook: BeautySmileFotona
- Site: beautysmile.com.br
````


## 2 · As perguntas da Etapa 1
<!-- gerado: payload.perguntas — nao editar a mao -->

9 perguntas, 1 aberta e opcional.

**1 · `jornada` · single_choice · obrigatória** — Qual é a sua disponibilidade para esta vaga, que é presencial na clínica, no Paraíso, em São Paulo, de segunda a sexta, das 9h às 19h?

- Tenho disponibilidade integral e presencial, de segunda a sexta, no horário da clínica
- Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída
- Tenho disponibilidade apenas parcial, em alguns dias da semana
- ⛔ **Tenho disponibilidade apenas para trabalho remoto** — **KNOCKOUT: encerra a candidatura na inscrição** (D9)

**2 · `curriculo` · single_choice · obrigatória** — Há quanto tempo, somando todos os empregos, você trabalha com recepção ou atendimento ao cliente?

- Menos de 1 ano em recepção ou atendimento ao cliente
- Entre 1 e 2 anos em recepção ou atendimento ao cliente
- Entre 2 e 5 anos em recepção ou atendimento ao cliente
- Mais de 5 anos em recepção ou atendimento ao cliente

**3 · `curriculo` · single_choice · obrigatória** — Onde foi a sua experiência mais longa em recepção?

- Recepção em clínica odontológica
- Recepção em outra clínica ou serviço de saúde (médica, estética, laboratório, hospital)
- Recepção em hotelaria, eventos ou outro serviço de alto padrão
- Recepção ou atendimento em varejo, call center ou outro tipo de empresa
- Ainda não trabalhei em recepção

**4 · `curriculo` · multiple_choice · obrigatória** — Além da sua própria função, que responsabilidade você já teve na recepção ou no atendimento?

- Liderei formalmente uma equipe de recepção ou de atendimento
- Sem ter o cargo, treinei colegas novos, montei escala ou respondi pela recepção na ausência da liderança
- Criei ou mudei processos, checklists ou controles da recepção
- Ainda não tive responsabilidade além da minha própria função

**5 · `curriculo` · multiple_choice · obrigatória** — Quais destas atividades já são rotina do seu trabalho, e não algo que você fez uma vez?

- Recepção presencial de pacientes ou clientes
- Atendimento por WhatsApp e telefone
- Confirmação de consultas e trabalho ativo para reduzir faltas
- Recebimento de pagamentos e fechamento de caixa
- Controle de documentos, termos ou exames de pacientes, com cuidado de LGPD
- Controle de estoque de materiais da recepção
- Atendimento de reclamações até a resolução
- Retorno, recall ou pesquisa de satisfação de pacientes
- Acompanhamento de indicadores, como faltas, tempo de resposta ou satisfação
- Nenhuma destas ainda é rotina do meu trabalho

**6 · `tecnologia` · multiple_choice · obrigatória** — Com quais sistemas de agendamento você já trabalhou?

- Clinicorp
- Doctoralia
- Feegow
- iClinic
- Clínica nas Nuvens
- Outro sistema de agenda de clínica, hospital ou laboratório (Tasy, MV, sistema próprio)
- Só agenda em planilha, Google Agenda ou papel
- Nunca trabalhei com agendamento

**7 · `tecnologia` · multiple_choice · obrigatória** — Quais destas ferramentas você usa no trabalho com segurança?

- Planilhas (Excel ou Google Planilhas), com filtros e fórmulas simples
- WhatsApp Business, com etiquetas e respostas rápidas
- E-mail corporativo
- ChatGPT ou outra IA, para escrever ou organizar o trabalho
- Ferramentas de tarefas, como Trello, Notion ou ClickUp
- Nenhuma destas ferramentas

**8 · `valores` · single_choice · obrigatória** — Em relação aos processos e checklists da recepção, qual frase mais se parece com você?

- Sigo os processos à risca e, quando algo não funciona, proponho a mudança e testo
- Sigo os processos à risca, sem exceções
- Adapto conforme o dia, sem registrar o que mudei
- Prefiro resolver na hora, pela minha experiência, a seguir checklist

**9 · `valores` · texto_curto · opcional** — O que você fez nos últimos seis meses para trabalhar melhor — um curso, uma leitura, uma mudança na sua rotina? Conte em poucas linhas.



## 3 · O teste situacional (SJT)
<!-- gerado: docs/specs/BANCO-SJT-LIDER-RECEPCAO-V1.md — nao editar a mao -->

Banco NOVO `lider-recepcao`, criado para esta vaga (D5). Por que um cargo novo, e não o `recepcionista`, está no cabeçalho de `docs/specs/BANCO-SJT-LIDER-RECEPCAO-V1.md`. A ordem da coluna `#` é só a de autoria: na tela as alternativas aparecem embaralhadas.

### Cargo `lider-recepcao`

#### MC1 · As faltas do mês
*(dimensão: Dono do processo · 4 min)*

**Cenário.** No fechamento do mês, você vê que as faltas na agenda subiram: um em cada cinco
pacientes marcados não veio, quase todos de primeira consulta.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Vê quem faltou e como foi confirmado, testa uma mudança na confirmação e mede no mês seguinte. |
| 2 | pontua | 2 | Passa a ligar na véspera para todos os pacientes, além da mensagem, e mantém o resto como está. |
| 3 | neutro | 1 | Leva o número à coordenação na reunião do mês e pergunta o que ela quer que a recepção faça. |
| 4 | atencao | 0 | Explica que falta em primeira consulta é comum e depende do paciente, não da recepção. |

#### MC2 · O erro que foi seu
*(dimensão: Responsabilidade · 4 min)*

**Cenário.** Dois pacientes chegam para o mesmo horário com o mesmo dentista. Ao conferir, você vê
que foi você quem marcou o segundo, por engano.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Assume o erro com os dois, dá a cada um uma saída boa e revê como confere a agenda ao marcar. |
| 2 | pontua | 2 | Pede desculpas, encaixa um dos dois e segue o dia sem mudar nada na forma de marcar. |
| 3 | neutro | 1 | Pede ao dentista que decida qual dos dois atende primeiro e que explique a espera ao outro. |
| 4 | atencao | 0 | Diz aos pacientes que o sistema às vezes duplica horários e que isso foge do controle da recepção. |

#### MC3 · O checklist que ninguém segue
*(dimensão: Dono do processo + Equipe · 4 min)*

**Cenário.** A recepção tem um checklist de abertura e de fechamento. Quando as auxiliares cobrem o
seu almoço ou a sua folga, ele fica sem preencher, e sempre se perde alguma coisa.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Pergunta a elas o que atrapalha, simplifica o checklist com essa ajuda e confere junto no começo. |
| 2 | pontua | 2 | Explica de novo a importância do checklist e pede que elas preencham sempre que cobrirem você. |
| 3 | neutro | 1 | Deixa de contar com o checklist e, quando volta, confere e corrige tudo por conta própria. |
| 4 | atencao | 0 | Avisa a coordenação que as auxiliares não seguem o processo e pede que alguém cobre delas. |

#### MC4 · A reclamação em voz alta
*(dimensão: Experiência do paciente + Conflito · 4 min)*

**Cenário.** Um paciente chega irritado com uma cobrança que considera errada e reclama em voz alta,
na sala de espera, na frente de outros pacientes.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Leva-o a um lugar reservado, ouve sem interromper, confere a cobrança e diz quando dá o retorno. |
| 2 | pontua | 2 | Ouve ali mesmo, com calma, pede desculpas e promete que o financeiro vai ligar para ele. |
| 3 | neutro | 1 | Pede com educação que ele fale mais baixo, por causa dos outros pacientes, e então escuta a queixa. |
| 4 | atencao | 0 | Explica na hora que a cobrança está certa, para os outros pacientes não ficarem com dúvida. |

#### MC5 · "E o clareamento, funciona para mim?"
*(dimensão: Fidelização + Limite da função · 4 min)*

**Cenário.** Na saída da consulta, um paciente em tratamento pergunta a você se o clareamento a laser
funcionaria para ele e quanto custa.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Acolhe o interesse, explica que a indicação sai da avaliação, registra o pedido e já combina a data. |
| 2 | pontua | 2 | Diz que vai perguntar ao dentista e dá retorno depois, sem registrar o pedido nem o próximo passo. |
| 3 | neutro | 1 | Entrega o material da clínica sobre clareamento e diz que ele pode marcar uma avaliação quando quiser. |
| 4 | atencao | 0 | Diz que funciona muito bem e passa o valor da tabela, para ele já sair com a decisão encaminhada. |

#### MC6 · O feedback que você dá
*(dimensão: Liderança + Experiência do paciente · 4 min)*

**Cenário.** A recepcionista que você ajudou a treinar é rápida e organizada, mas você percebe que
ela atende os pacientes de forma fria: não olha nos olhos e não os chama pelo nome.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Conversa com ela em particular, com exemplos do que viu, combina o que mudar e acompanha. |
| 2 | pontua | 2 | Dá um toque rápido entre um atendimento e outro, com gentileza, e confia que ela vai ajustar. |
| 3 | neutro | 1 | Prefere não falar nada por enquanto, porque ela é eficiente e a agenda está sempre em dia. |
| 4 | atencao | 0 | Comenta com a coordenação que a colega é fria com os pacientes, para que a coordenação resolva. |

#### Caso aberto · A jornada da paciente nova
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

#### Notas de desenho

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

## 4 · Redação cultural
<!-- gerado: payload.testes_aplicaveis + redacao-C1.txt (lido de PROD) — nao editar a mao -->

Código `C1`, do banco de coordenação (`coord_admin_padrao`; valor primário `inovacao`, secundário `atitude_de_dono`) — já existe e está ativo; a vaga só o declara. Mede o que separa a líder de recepção de uma recepcionista: uma melhoria de processo que a pessoa PROPÔS E IMPLEMENTOU, com resultado medido. Complementa o caso escrito: o caso pergunta como a pessoa FARIA; a redação pede algo que ela JÁ FEZ. 200 a 500 palavras. `C2` (feedback duro) e `C3` (decisão sob pressão) ficaram de fora (D4): cada código é mais uma redação de ~25 min.

> Descreva uma melhoria de processo (operacional, de equipe, de comunicação ou de cliente) que você PROPÔS E IMPLEMENTOU no último ano. Como identificou o problema, o que tentou, como mediu o resultado e o que faria diferente?

## 5 · Quais avaliações entram

| Instrumento | Obrigatório | Peso |
|---|---|---|
| Triagem | sim | 25 (contexto — não entra no score final) |
| Teste situacional (`lider-recepcao`: 6 mc + 1 caso escrito) | sim | 30 |
| Redação `C1` | sim | 20 |
| Big Five | não | — |
| Cognitivo | não, e `aplica_cognitivo = false` | — |
| Entrevista | sim | 25 |

## 6 · A rubrica da IA, por extenso
<!-- gerado: payload.rubrica_ia — nao editar a mao -->

Contém os eliminatórios (§7), o que é proibido pesar (§8) e as instruções de calibragem (§9) — por isso essas três seções não se repetem aqui.

⚠ **O sistema nunca rejeita por score.** Eliminatório ausente vira lacuna `critical` e segura o score abaixo de 40 — sinal para o RH, não decisão da máquina.

````markdown
⚠ `gaps` LISTA SÓ O QUE FALTA. Requisito atendido não entra, em severidade
nenhuma. Se a nota diria "atende ao requisito", o item não é gap: vira `strengths`
ou não aparece.

## Requisitos eliminatórios
Se algum estiver AUSENTE, registre gap `critical` e mantenha o score abaixo de 40,
por melhor que seja o resto do perfil. Se estiver atendido, não registre nada.
- Ensino médio completo. Currículo que não menciona escolaridade →
  `insufficient_evidence`, não ausência.
- Pelo menos 2 anos, somados, em recepção ou atendimento ao cliente. Some o
  currículo e a Etapa 1, que pergunta a faixa de tempo:
  · "Entre 2 e 5 anos…" ou "Mais de 5 anos…" → atendido.
  · "Menos de 1 ano…" ou "Entre 1 e 2 anos…" → gap `critical`, A MENOS que o
    currículo mostre 2 anos ou mais; nesse caso, atendido, com observação em
    `reasoning`.
  · sem resposta e currículo sem datas → `insufficient_evidence`.
- Disponibilidade presencial, de segunda a sexta. A Etapa 1 pergunta:
  · "…integral e presencial…" → atendido; "…mas precisaria ajustar o horário…" →
    atendido, com observação. Querer negociar horário não é indisponibilidade.
  · "…apenas parcial, em alguns dias da semana" → gap `critical`.
  · nenhuma resposta sobre disponibilidade → `insufficient_evidence`.

⚠ LIDERANÇA FORMAL NÃO É ELIMINATÓRIA (decisão do operador): a vaga começa com uma
pessoa só na recepção e forma a equipe depois. Nunca ter tido o cargo de líder não é
gap; ter treinado colegas, montado escala ou respondido pela recepção conta ponto na
competência 3.

⚠ COMO LER AS RESPOSTAS DA ETAPA 1: cada item chega como «Pergunta: …» seguido de
«Resposta: …», na ordem do formulário. Julgue cada resposta À LUZ DA PERGUNTA que a
gerou, e trate-a como evidência de MESMO PESO que o currículo. Se algum item vier
sem a linha «Pergunta:», identifique-o pelo próprio conteúdo. A única pergunta
aberta (o que a pessoa fez nos últimos seis meses para trabalhar melhor) é opcional:
use como evidência quando existir; em branco não é gap.

⚠ `critical` é SÓ para os três eliminatórios. Gap de competência é no máximo
`important`.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Recepção e atendimento ao paciente, como rotina
   Peso ALTO.
   5 = recepção como função principal, presencial e por telefone ou WhatsApp, em
       clínica, consultório, hospital, laboratório ou serviço de alto padrão
       (hotelaria, por exemplo), com volume diário de pessoas.
   3 = atendimento ao cliente em outro contexto (varejo, call center, balcão) ou
       recepção como parte secundária de outra função.
   1 = nenhuma evidência de atendimento a pessoas.
   A Etapa 1 traz onde foi a experiência de recepção mais longa: clínica ou área da
   saúde posiciona no topo; os outros contextos são legítimos e ficam no meio — nunca
   gap por não ter vindo de clínica.

2. Agenda e controle de faltas
   Peso ALTO.
   5 = gerenciou a agenda de profissionais em sistema, com confirmação ativa,
       encaixes e trabalho para reduzir faltas; ou acompanhou o número de faltas.
   3 = agendou em sistema, planilha ou papel, sem evidência de confirmação ativa
       nem de cuidado com faltas.
   1 = nenhuma evidência de gestão de agenda.
   A Etapa 1 lista os sistemas de agenda que a pessoa já usou e as atividades que
   são rotina dela. Clinicorp conta ponto, mas a AUSÊNCIA dele não é gap: a clínica
   treina. Agenda só em planilha ou papel posiciona no máximo em 3.

3. Responsabilidade pelo processo, e o começo da liderança
   Peso MÉDIO.
   5 = criou ou mudou um processo, checklist, padrão de atendimento ou controle na
       recepção, e acompanhou se funcionou; OU treinou colegas, montou escala ou
       respondeu pela recepção na ausência da liderança.
   3 = seguia os processos com cuidado e era referência informal, sem evidência de
       ter mudado ou ensinado algo.
   1 = nenhuma evidência de responsabilidade além da própria tarefa.
   A Etapa 1 pergunta sobre responsabilidade além da própria função e sobre a
   relação com processos. "Prefiro resolver na hora, pela minha experiência" e
   "Adapto conforme o dia, sem registrar" limitam esta competência a no máximo 3 e
   devem ser comentadas em `reasoning` como tema de entrevista. Liderança formal
   conta ponto, nunca é corte.

4. Administrativo, financeiro básico e LGPD
   Peso MÉDIO.
   5 = recebimento de pagamentos e fechamento de caixa, controle de documentos,
       termos ou exames, e trato de dados sensíveis de pacientes ou clientes.
   3 = uma dessas frentes, ou apoio administrativo genérico.
   1 = nenhuma evidência.
   A Etapa 1 lista essas atividades entre as rotinas e pergunta as ferramentas que
   a pessoa usa (planilhas, WhatsApp Business): use como evidência declarada.

5. Relacionamento e fidelização, sem venda
   Peso BAIXO. Conta ponto, não elimina.
   5 = acompanhou retorno ou recall de pacientes, pesquisa de satisfação, programa
       de indicação, ou levou reclamações até a resolução.
   3 = tratou reclamações ou deu retorno a clientes de forma pontual.
   1 = nenhuma evidência.
   ⚠ A função NÃO vende: orçamento e valores ficam com o Dr. Fernando e o
   pré-vendas. Experiência com meta de venda, comissão ou fechamento não conta ponto
   aqui e não desconta — é outro trabalho.

## O que NÃO pode pesar em nenhuma hipótese
- Nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro ou regionalismo.
- Aparência, "boa apresentação", altura, voz, sotaque ou estilo pessoal — inferidos
  do currículo ou da foto.
- Tempo em desemprego, número de empregos, troca de área ou intervalo entre empregos.
- Curso superior ou técnico — o requisito é ensino médio; formação além disso não
  conta ponto nem desconta.
- Inglês ou outro idioma — não é requisito da função.
- Ter vindo ou não de clínica odontológica — posiciona na competência 1, nunca é corte.
- Ter ou não usado Clinicorp especificamente.
- Experiência ou meta de vendas, como ponto a favor ou contra.
- "Apaixonada por atendimento", "sorriso genuíno", "proativa", "perfil de líder" sem
  evidência citável, e os adjetivos do anúncio sobre a clínica, o laser ou o Dr. Fernando.

Todo ponto forte e todo gap deve citar trecho literal do currículo ou da resposta. Se
não há trecho que permita julgar uma competência, use `insufficient_evidence` — é
melhor que chutar.
````

## 11 · Perfil ideal — campo interno que alimenta o guia de entrevista
<!-- gerado: payload.vaga.perfil_ideal — nao editar a mao -->

O candidato não vê. A EF `gerar-guia-entrevista` o injeta no prompt, cortado em 800 caracteres — este tem 744.

````markdown
Profissional de recepção experiente que já responde pelo processo e começa a liderar: cuida do paciente da confirmação à saída, chama pelo nome, avisa atraso antes de o paciente perguntar e trata o paciente com medo sem pressa. Mantém agenda, confirmação e checklist funcionando e muda o que não funciona. Não vende: leva interesse em procedimento para a avaliação. Na entrevista, sondar: uma melhoria que a pessoa fez na recepção e como mediu; um erro de agenda que foi dela e o que mudou depois; como trataria uma colega que atende com frieza; como lidou com um paciente irritado na frente de outros. Riscos: quem culpa o sistema ou o paciente, quem passa preço na recepção e quem leva problema de colega à coordenação sem falar com a colega.
````

## 12 · Textos de divulgação

### 12.1 · Catho

*Texto puro. Título de busca: «Recepcionista Líder» ou «Líder de Recepção». Campo de salário: «A
combinar» — sem valores.*

````
Líder de Recepção (CLT, presencial)

A Beauty Smile é a única clínica do Brasil que trabalha exclusivamente com o laser Fotona
LightWalker: odontologia sem dor, sem trauma e minimamente invasiva, no Paraíso, em São Paulo.
Buscamos alguém que já seja referência em recepção para responder pela recepção da clínica.

O papel:
Cuidar de cada paciente da chegada à saída, organizar a agenda e o padrão de atendimento, e treinar
e liderar as próximas recepcionistas conforme a clínica cresce. Não é vaga de vendas: orçamento e
valores ficam com o Dr. Fernando e a equipe de pré-vendas.

Atividades:
Recepção de pacientes, telefone, WhatsApp e e-mail
Agenda: marcação, confirmação, encaixes e redução de faltas
Cadastro, termos e exames dos pacientes, com cuidado de LGPD
Recebimento de pagamentos, fechamento de caixa e estoque da recepção
Retorno dos pacientes, satisfação, reclamações e programa de indicação
Checklists e padrão de atendimento da recepção

Obrigatórios:
Ensino médio completo
Pelo menos 2 anos em recepção ou atendimento ao cliente
Disponibilidade presencial, de segunda a sexta

Desejáveis (contam pontos):
Recepção de clínica odontológica ou da área da saúde
Clinicorp ou outro sistema de agenda de clínica
Ter treinado colegas ou organizado a rotina de uma equipe

Contrato e benefícios:
CLT, salário fixo
Vale-transporte, plano de saúde, Wellhub, tratamentos Beauty Smile e desconto para familiares,
cursos internos

Processo seletivo: perguntas objetivas na inscrição, avaliação online com situações do dia a dia,
um caso escrito, redação e entrevista.

Candidatura: rh.beautysmile.com.br/vagas/lider-recepcao
````

Tipo de contrato: CLT · Horário: segunda a sexta, das 9h às 19h · Local: Rua Desembargador Eliseu
Guilherme, 53 — Paraíso.

### 12.2 · LinkedIn

*Gancho nas duas primeiras linhas, antes do «ver mais». Sem negrito.*

````
A primeira e a última impressão de uma clínica acontecem na recepção.

Na Beauty Smile, muitos pacientes chegam com medo de dentista — e quem os recebe faz diferença. Estamos
procurando alguém que já seja referência em recepção para responder pela nossa.

A vaga:
— Líder de Recepção, presencial no Paraíso, São Paulo
— CLT, segunda a sexta
— Você cuida da agenda, do padrão de atendimento e do retorno dos pacientes
— Começa como a pessoa da recepção e treina quem vier depois
— Não é vaga de vendas

Procuro quem avisa o atraso antes de o paciente perguntar, assume o erro quando é seu e muda o
processo que não funciona.

Pelo menos 2 anos em recepção ou atendimento. Clínica conta pontos; cargo de líder, não precisa ter
tido.

Se for você, ou se conhece alguém: rh.beautysmile.com.br/vagas/lider-recepcao

#recepcao #recepcionista #atendimento #clinica #vagasp
````

### 12.3 · Grupos de WhatsApp

*Sintaxe nativa do WhatsApp: asterisco simples é negrito, underscore é itálico, link como URL crua.*

````
*VAGA — Líder de Recepção (CLT, presencial SP)*

Clínica de odontologia 100% laser no Paraíso procura quem já é referência em recepção.

*O trabalho*
- Receber os pacientes, agenda, confirmações e WhatsApp
- Caixa, documentos e estoque da recepção
- Retorno e satisfação dos pacientes (não é vaga de vendas)
- Treinar as próximas recepcionistas

*Precisa ter*
- Ensino médio completo
- 2 anos ou mais em recepção ou atendimento
- Disponibilidade presencial, seg a sex, 9h às 19h

*Oferecemos*
- CLT, salário fixo
- Plano de saúde, VT, Wellhub, tratamentos com desconto

Candidatura: https://rh.beautysmile.com.br/vagas/lider-recepcao
````

> ⚠ O link só funciona depois que a vaga for **publicada**. Não divulgue antes. Se D6 ou D8 mudarem,
> estes três textos mudam junto.

## 13 · Checklist de cadastro no sistema
<!-- gerado: payload — nao editar a mao -->

| Campo | Valor |
|---|---|
| `slug` | `lider-recepcao` |
| `titulo` · `subtitulo` · `descricao_curta` | §1 |
| `sobre_cargo` · `responsabilidades` · `requisitos_*` · `diferenciais` · `beneficios` · `sobre_empresa` | §1 |
| `secoes_extras` | «Conheça a Beauty Smile» |
| `perfil_ideal` | §11 |
| `departamento` · `tipo_contrato` · `modelo_trabalho` | Atendimento · CLT · Presencial |
| `cidade` · `estado` · `endereco_completo` | São Paulo · SP · Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP |
| `jornada_trabalho` | Presencial, segunda a sexta, das 9h às 19h com 1h12 de intervalo — 44h semanais, CLT, com compensação do sábado por acordo escrito. — **não renderiza**; por isso o horário está em `sobre_cargo` |
| `faixa_salarial_min` / `max` | 3000 / 4000, com `exibir_salario = false` — gravada, não exibida (D7) |
| `total_vagas` | 1 |
| `data_abertura` | a data do apply |
| `status` | **`rascunho`** — publicar é ato humano separado |
| `created_by` | Fernando Costa Neto (resolvido por e-mail; a migration aborta se não achar) |
| `rubrica_ia` | §6 |
| `pesos_avaliacao` | triagem 25 · work_sample_sjt 30 · redacao_cultural 20 · entrevista 25 |
| `testes_aplicaveis` | triagem (obrig.) · work_sample_sjt (obrig., cargo `lider-recepcao`) · redacao_cultural (obrig., código C1) · big_five (não obrig.) · cognitivo (não obrig.) · entrevista (obrig.) |
| `aplica_cognitivo` | `false` |
| `qualificacao_etapa1` | **não tocar** — snapshot do `publish_vaga` |
| `perguntas_formulario` | §2 — 9 perguntas, 1 aberta e opcional; a pergunta 1 leva a opção knockout (D9) e é obrigatória |

## 14 · Teste prático

Não há teste prático separado. O caso escrito é o work-sample: a IA lê o texto inteiro, e o RH abre
a resposta no scorecard. O jeito de receber um paciente e de falar ao telefone não se mede por
escrito — se a clínica quiser avaliá-lo, o lugar é a entrevista presencial (por exemplo, uma
simulação de chegada de paciente ou de ligação).

## 15 · Critérios das dimensões do caso escrito
<!-- gerado: supabase/functions/_shared/sjt-rubrica.ts — nao editar a mao -->

É a régua que a IA recebe para pontuar o caso escrito. As dimensões e os pesos vêm do texto do banco (§3); os critérios, do catálogo. A conversão em nota 1-5 é do sistema: 5 = todos os inclusion e nenhum exclusion; 1 = inclusion ausente ou um exclusion crítico. Nota 0-25 · ≥18 avança · 13-17 entrevista · <13 revisão humana.

### `confirmacao_e_preparo` — Confirmação e preparo · peso 15

**Inclusion**

(1) Confirma a avaliação antes do dia com uma mensagem pessoal, e oferece remarcar se precisar.
(2) Diz à paciente o que ela precisa saber para chegar: endereço, como chegar, quanto tempo leva e o que trazer.
(3) Registra no cadastro que ela tem medo e avisa a equipe e o Dr. Fernando antes do dia.
(4) Já na confirmação, diz que a clínica está acostumada a receber quem tem medo e que ela pode contar o que a deixa desconfortável.

**Exclusion**

- menor: a confirmação é só a mensagem automática, sem nenhum contato pessoal.
- menor: o medo fica só na conversa de WhatsApp, sem registro e sem aviso à equipe.
- menor: não diz como chegar nem o que trazer.

### `acolhimento_na_chegada` — Acolhimento na chegada · peso 25

**Inclusion**

(1) Recebe a paciente pelo nome e se apresenta.
(2) Mostra que lembra do que ela contou, sem expor o medo dela na frente de outras pessoas.
(3) Oferece água ou café e explica o que vai acontecer até ela entrar.
(4) Faz o cadastro e os termos com calma, explicando para que servem, sem deixá-la sozinha com a papelada.

**Exclusion**

- CRÍTICO: trata o medo como bobagem ("não precisa ter medo, é tranquilo") ou fala do medo dela em voz alta na recepção.
- menor: recebe sem chamá-la pelo nome ou sem se apresentar.
- menor: entrega a ficha e manda aguardar, sem explicar nada.

### `espera_sem_surpresas` — Espera sem surpresas · peso 20

**Inclusion**

(1) Diz com honestidade quanto tempo ela deve esperar.
(2) Se houver atraso, avisa antes de ela perguntar e diz o novo horário provável.
(3) Volta a falar com ela durante a espera, sem deixá-la esquecida.
(4) Antes de ela entrar, passa à equipe da sala como ela está.

**Exclusion**

- CRÍTICO: deixa a paciente esperando sem nenhuma informação, ou culpa o dentista ou outro paciente pelo atraso.
- menor: só avisa o atraso quando ela pergunta.
- menor: não volta a falar com ela durante a espera.

### `saida_e_proximo_passo` — Saída e próximo passo · peso 20

**Inclusion**

(1) Pergunta como foi e ouve, antes de falar de agenda.
(2) Confere se ela saiu com as dúvidas respondidas e, se não, leva a dúvida a quem pode responder.
(3) Deixa claro o próximo passo combinado na avaliação e marca a data, ou combina quando marcar, antes de ela ir.
(4) Despede-se de forma pessoal.

**Exclusion**

- CRÍTICO: negocia valor, oferece desconto ou promete resultado do tratamento - isso é do Dr. Fernando e do pré-vendas.
- menor: deixa a paciente ir sem próximo passo ("qualquer coisa, é só chamar").
- menor: fala de agenda e pagamento antes de perguntar como ela está.

### `contato_depois` — Contato depois da avaliação · peso 20

**Inclusion**

(1) Faz um contato pessoal no dia seguinte para saber como ela está.
(2) Registra no sistema o que aconteceu e o que a deixou à vontade, para a próxima visita.
(3) Se ela ainda não decidiu seguir, combina quando retomar, sem pressionar.
(4) Passa à equipe o que vale para a próxima visita.

**Exclusion**

- CRÍTICO: não registra nada do que aconteceu.
- menor: o contato do dia seguinte é uma mensagem automática.
- menor: insiste ou pressiona quem ainda não decidiu.

