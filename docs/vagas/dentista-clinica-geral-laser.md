# Vaga — Cirurgião(ã)-Dentista, Clínica Geral

> **Aprovado pelo operador em 16/10/2026 e aplicado**: a vaga e a redação `DENT_UAU` em `20261015000101` (a vaga nasce `rascunho`), o banco em `20261015000102`. Publicar é ato separado.
> Versão 1 · 2026-10-15 · autor da vaga: Fernando Costa Neto
> Fontes: o texto de uma vaga antiga de dentista, colado pelo operador em 15/10 · as decisões dele
> na rodada de perguntas · os materiais de tratamento da clínica (`consultor-pre-vendas/Conhecimento`)
> · o banco de conhecimento `docs/conhecimento/sjt/banco-sjt-dentista.md`.

> ⚠ **As seções marcadas «gerado» saem por script** do payload
> (`docs/vagas/proveniencia/dentista-clinica-geral-laser.payload.json`), do texto do banco
> (`docs/specs/BANCO-SJT-DENTISTA-V2.md`) e do catálogo `supabase/functions/_shared/sjt-rubrica.ts`.
> Não edite à mão: mude a fonte e regere.

## Decisões

| # | Assunto | Situação |
|---|---|---|
| D1 | Papel do dentista | ✅ **Resolvida (15/10)** — executa as sessões; a avaliação, o plano e o orçamento são do Dr. Fernando |
| D2 | Experiência mínima | ✅ **Resolvida (15/10)** — sem tempo mínimo de clínica; CRO-SP obrigatório |
| D3 | Contrato | ✅ **Resolvida (15/10)** — PJ, fixo mensal, sem valores no anúncio |
| D4 | Perguntas da Etapa 1 | ✅ **Revistas (15/10)** — a partir do formulário antigo do operador (§2). A pergunta de protocolos ficou; se sair depois, a tela da vaga basta |
| D5 | Redação | ✅ **Resolvida (16/10)** — redação nova `DENT_UAU`, com o texto do formulário antigo do operador: a situação em que a pessoa superou as expectativas de um paciente (§4) |
| D6 | Rubrica da IA (§6) | ✅ **Aprovada (16/10)** |
| D7 | Knockouts (§2) | ✅ **Aprovados (16/10)** — encerram a candidatura: no CRO, «de outro estado e não pretendo me inscrever no CRO-SP» e «ainda não tenho registro ativo»; e «não, eu procurava uma vaga com harmonização orofacial ou estética facial». Quem tem CRO de outro estado e vai pedir o CRO-SP **passa** |
| D8 | Disponibilidade parcial (§2, §6) | ✅ **Aprovada (16/10)** — «apenas alguns dias ou turnos» NÃO elimina na inscrição, mas vira lacuna crítica na triagem, como no SDR |
| D9 | Banco do teste situacional (§3) | ✅ **Aprovado (16/10)** — os 6 itens e o caso foram escolhidos pelo operador (16/10), no sentido do formulário antigo: postura e comportamento; a conduta marcada como certa precisa ser conferida por um dentista |
| D10 | Critérios do caso escrito (§15) | ✅ **Aprovados (16/10)** — ⚠ só valem depois do deploy da EF `avaliar-redacao` |

## O fluxo, de ponta a ponta

**1 · Inscrição** — pública. Dados, currículo em PDF e as **10 perguntas da Etapa 1** (§2), uma
delas aberta e opcional (experiência com laser). **Três opções eliminam** (D7): duas na pergunta do
CRO e uma na de harmonização orofacial. É a única rejeição automática do funil.

**2 · Triagem** — a IA lê o currículo, as respostas da Etapa 1 e a rubrica (§6), e nada mais. **O
sistema nunca rejeita sozinho.** Não há avanço automático: o RH aprova pessoa a pessoa.

**3 · Avaliação assíncrona** — liberada a quem o RH aprovou:

| | o que é | tempo | pesa? |
|---|---|---|---|
| Teste situacional, múltipla escolha (§3) | 6 situações de postura no dia a dia, 4 alternativas embaralhadas | ~24 min | sim |
| Caso escrito (§3, §15) | passo a passo, a primeira sessão de um paciente novo: antes de ele chegar, recepção, condução, encerramento e o dia seguinte — 200 a 500 palavras | ~20 min | sim |
| Redação `DENT_UAU` (§4) | uma situação real em que superou as expectativas de um paciente — 200 a 500 palavras | ~25 min | sim |
| Big Five | 116 itens | ~15 min | **não** — contexto, com devolutiva ao candidato |

**4 · Entrevista** — o roteiro sai do perfil ideal (§11).

**5 · Decisão final** — humana.

**Total pedido ao candidato antes de falar com alguém: ~1h25.**

### Onde o peso cai
<!-- gerado: payload.pesos_avaliacao — nao editar a mao -->

| Etapa | Peso |
|---|---|
| `triagem` | 20 |
| `work_sample_sjt` | 35 |
| `redacao_cultural` | 15 |
| `entrevista` | 30 |
| soma | 100 |

Pesos do template `dentista`. ⚠ O score final **não pondera a triagem** — ela aparece como contexto (`consolidar-decisao-final`, UX-09). O composto usa teste situacional, redação e entrevista, renormalizados: ~44% · ~19% · ~37%.

## 1 · O anúncio, como o candidato lê
<!-- gerado: payload.vaga — nao editar a mao -->

Os blocos em cerca são o markdown exato que vai ao banco; a página o renderiza.

### Título (texto puro)

> Cirurgião(ã)-Dentista — Clínica Geral

### Subtítulo (texto puro)

> Clínica geral de adultos com o laser Fotona LightWalker · PJ presencial · unidade Paraíso

### Resumo (texto puro)

> Atendimento clínico geral de adultos com o laser Fotona LightWalker, seguindo o protocolo da clínica e com treinamento no Centro de Excelência Beauty Smile. PJ, presencial no Paraíso, em São Paulo.

### Sobre o cargo

````markdown
Na Beauty Smile, o tratamento é feito 100% com o laser Fotona LightWalker — uma odontologia sem dor, sem trauma e minimamente invasiva. Estamos buscando um(a) cirurgião(ã)-dentista para a clínica geral de adultos: quem executa os tratamentos e os protocolos de laser da clínica, com rigor técnico e cuidado com o paciente.

**O seu papel.** A avaliação do paciente e a apresentação do plano de tratamento ficam com o Dr. Fernando. Você executa o plano: conduz as sessões, acompanha a evolução e orienta o paciente. Dúvidas sobre o plano ou sobre valores, você leva ao Dr. Fernando e à equipe.

**Laser sem experiência prévia.** Não exigimos experiência com laser. Você aprende os protocolos no Centro de Excelência Beauty Smile, com a equipe clínica, antes de aplicá-los.

**O que a clínica não faz.** Não fazemos harmonização orofacial nem estética facial.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h.

### Como é o processo seletivo

Inscrição com perguntas objetivas e análise do currículo. Quem avança recebe uma avaliação online, para fazer no seu tempo: seis situações do dia a dia de atendimento, um caso escrito e uma redação curta. Depois, entrevista com a equipe clínica.
````

### Responsabilidades

````markdown
- **Atendimento clínico.** Realizar consultas e tratamentos odontológicos preventivos e corretivos em adultos, seguindo o protocolo padrão da clínica.
- **Protocolos de laser.** Aplicar os protocolos com o laser Fotona nas diversas especialidades, depois do treinamento no Centro de Excelência Beauty Smile.
- **Execução do plano.** Conduzir as sessões do plano definido na avaliação e acompanhar a evolução do paciente de sessão em sessão.
- **Orientação ao paciente.** Explicar o que vai ser feito em cada sessão, orientar cuidados preventivos e de higiene, e encaminhar as dúvidas comerciais à equipe.
- **Qualidade e segurança.** Seguir as normas de biossegurança, manter o prontuário completo e o ambiente organizado.
- **Equipe.** Trabalhar de forma integrada com a equipe multidisciplinar e contribuir para a melhoria contínua dos protocolos da clínica.
````

### Formação

````markdown
Graduação em Odontologia e **inscrição ativa no CRO-SP**. Especialização em qualquer área da odontologia conta pontos.
````

### Experiência

````markdown
Experiência em clínica geral com pacientes adultos. Não exigimos tempo mínimo.

**Contam pontos:** atendimento em clínicas multidisciplinares de alto padrão; experiência com pacientes ansiosos ou com medo de dentista.
````

### Conhecimentos técnicos

````markdown
Procedimentos de clínica geral em adultos; biossegurança; prontuário completo.

**Contam pontos:** laser odontológico; escaneamento intraoral e radiologia digital; cursos de laser, odontologia digital ou minimamente invasiva. Experiência com laser não é exigida — a clínica treina.
````

### Habilidades

````markdown
- **Rigor com protocolo** — segue o fluxo clínico definido e propõe melhorias pelo caminho certo.
- **Comunicação com o paciente** — explica sem jargão e lida com perfis diferentes, inclusive quem tem medo.
- **Trabalho em equipe** — atua junto com auxiliares, especialistas e a coordenação clínica.
- **Atualização contínua** — busca formação por conta própria.
- **Ética profissional** — recusa o que não tem indicação, mesmo quando o paciente insiste.
````

### Diferenciais

````markdown
- Especialização em áreas da odontologia.
- Experiência em clínicas multidisciplinares de alto padrão.
- Experiência ou interesse comprovado em tecnologias odontológicas de ponta: laser, escaneamento 3D, radiologia digital.
- Cursos complementares em laser odontológico ou novas tecnologias.
- Visão voltada para a odontologia digital e minimamente invasiva.
````

### Contrato e benefícios

````markdown
Contrato de prestação de serviços (PJ), contra nota fiscal. É necessário ter CNPJ ativo.

- **Valor fixo mensal.** Os valores são combinados na entrevista.
- **Capacitação** nos protocolos de laser no Centro de Excelência Beauty Smile.

Benefícios: plano de saúde · Wellhub · tratamentos Beauty Smile e desconto para familiares · cursos e treinamentos internos.

**O que este contrato não inclui:** vale-refeição e vale-transporte. Eles valem para o quadro CLT, e esta vaga é PJ.
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

10 perguntas, nenhuma aberta.

**1 · `curriculo` · single_choice · obrigatória** — Qual é a sua situação no Conselho Regional de Odontologia?

- Tenho inscrição ativa no CRO-SP
- Tenho CRO ativo de outro estado e vou pedir a inscrição no CRO-SP antes de começar
- ⛔ **Tenho CRO ativo de outro estado e não pretendo me inscrever no CRO-SP** — **KNOCKOUT: encerra a candidatura na inscrição** (D7)
- ⛔ **Ainda não tenho registro ativo no CRO** — **KNOCKOUT: encerra a candidatura na inscrição** (D7)

**2 · `valores` · single_choice · obrigatória** — Você está ciente de que a Beauty Smile não realiza harmonização orofacial nem estética facial?

- Sim, estou ciente de que a clínica não realiza harmonização orofacial nem estética facial
- ⛔ **Não, eu procurava uma vaga que incluísse harmonização orofacial ou estética facial** — **KNOCKOUT: encerra a candidatura na inscrição** (D7)

**3 · `jornada` · single_choice · obrigatória** — Qual é a sua disponibilidade para esta vaga, que é presencial na unidade Paraíso, em São Paulo, de segunda a sexta, das 9h às 19h?

- Tenho disponibilidade integral e presencial, de segunda a sexta, no horário da clínica
- Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída
- Tenho disponibilidade apenas em alguns dias ou turnos, porque atendo em outro lugar

**4 · `curriculo` · single_choice · obrigatória** — Qual é o seu tempo total de experiência clínica?

- Menos de 2 anos de experiência clínica
- Entre 2 e 5 anos de experiência clínica
- Entre 5 e 10 anos de experiência clínica
- Mais de 10 anos de experiência clínica

**5 · `curriculo` · multiple_choice · obrigatória** — Em quais áreas você tem especialização concluída ou em andamento?

- Especialização em Dentística
- Especialização em Endodontia
- Especialização em Implantodontia
- Especialização em Ortodontia
- Especialização em Periodontia
- Especialização em Prótese
- Especialização em Radiologia
- Especialização em Odontopediatria
- Especialização em Harmonização orofacial
- Não tenho especialização concluída nem em andamento

**6 · `curriculo` · multiple_choice · obrigatória** — Em quais procedimentos você tem mais experiência? Selecione até 3.

- Tratamentos restauradores e estéticos
- Endodontia
- Periodontia
- Cirurgias orais menores
- Implantodontia
- Próteses
- Ortodontia
- Odontopediatria
- Outros procedimentos

**7 · `tecnologia` · multiple_choice · obrigatória** — Com quais destas tecnologias odontológicas você tem experiência?

- Scanner intraoral
- Radiografia digital
- Microscópio operatório
- CAD/CAM
- Laser odontológico
- Fotografia odontológica
- Impressão 3D
- Planejamento digital
- Nenhuma destas tecnologias

**8 · `tecnologia` · texto_curto** — Você já usou laser na odontologia? Se sim, conte para qual tratamento e com qual equipamento.


**9 · `valores` · single_choice · obrigatória** — Em relação a protocolos clínicos estabelecidos, qual frase mais se parece com você?

- Sigo os protocolos à risca, sem exceções
- Adapto os protocolos conforme a necessidade do caso, mas mantenho a essência deles
- Prefiro desenvolver meus próprios protocolos, baseados em evidências científicas
- Sigo os protocolos quando é conveniente, mas priorizo a minha experiência clínica

**10 · `valores` · multiple_choice · obrigatória** — Quais destas ações você costuma incorporar na sua rotina de atendimento?

- Entro em contato com o paciente no dia seguinte a procedimentos mais invasivos
- Personalizo o ambiente conforme as preferências do paciente
- Ofereço opções adicionais de conforto durante o tratamento
- Reservo tempo extra para responder a todas as dúvidas do paciente
- Preparo materiais educativos personalizados para o paciente
- Guardo detalhes pessoais do paciente para retomar na próxima consulta
- Comemoro marcos e resultados do tratamento com o paciente
- Antecipo necessidades do paciente antes que ele peça


## 3 · O teste situacional (SJT)
<!-- gerado: docs/specs/BANCO-SJT-DENTISTA-V2.md — nao editar a mao -->

Banco `dentista` revisto nesta vaga (D9). O que muda e por quê está no cabeçalho de `docs/specs/BANCO-SJT-DENTISTA-V2.md`. A ordem da coluna `#` é só a de autoria: na tela as alternativas aparecem embaralhadas.

### Cargo `dentista`

#### MC1 · O retorno da coordenação
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

#### MC2 · "Por que laser, e não a limpeza de sempre?"
*(dimensão: Comunicação com o paciente · 4 min)*

**Cenário.** Na primeira sessão da limpeza a laser, a paciente pergunta por que o Dr. Fernando
indicou o laser, se ela sempre fez a limpeza comum e achava suficiente.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Explica primeiro o que muda para ela, ligado ao caso dela, e depois como o laser age, sem prometer. |
| 2 | pontua | 2 | Explica com cuidado como o laser funciona, mas em termos técnicos que ela tem dificuldade de seguir. |
| 3 | neutro | 1 | Diz que a indicação foi do Dr. Fernando e que é melhor ela perguntar a ele na próxima consulta. |
| 4 | atencao | 0 | Diz que a limpeza comum desgasta os dentes e que, com o laser, ela nunca mais vai ter tártaro. |

#### MC3 · O paciente que quer falar com o Dr. Fernando
*(dimensão: Segurança + Relação com o paciente · 4 min)*

**Cenário.** Um paciente executivo questiona cada etapa da sessão e, sobre um detalhe que você mesmo
poderia responder, pede para falar direto com o Dr. Fernando.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Responde o que é seu com segurança e, se ele ainda preferir, combina a conversa com o Dr. Fernando. |
| 2 | pontua | 2 | Chama o Dr. Fernando na mesma hora, interrompendo a agenda dele, para evitar qualquer atrito. |
| 3 | neutro | 1 | Responde a dúvida e segue a sessão, sem acolher o pedido dele de falar com o Dr. Fernando. |
| 4 | atencao | 0 | Diz que ele não precisa incomodar o Dr. Fernando com isso, porque a sessão é responsabilidade sua. |

#### MC4 · O cuidado que você esqueceu de passar
*(dimensão: Responsabilidade + Experiência do paciente · 4 min)*

**Cenário.** No fim do dia, você percebe que não orientou um paciente sobre um cuidado importante
depois da sessão. Ele já foi embora.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Liga ou manda mensagem pessoalmente, assume o esquecimento e registra a orientação dada. |
| 2 | pontua | 2 | Pede à recepção que mande ao paciente a orientação padrão, sem explicar a ele o que aconteceu. |
| 3 | neutro | 1 | Deixa para orientar na próxima sessão, já que o paciente volta à clínica daqui a alguns dias. |
| 4 | atencao | 0 | Não fala nada a ninguém, para não parecer que errou, e confia que o paciente vai se cuidar. |

#### MC5 · "Não é minha função"
*(dimensão: Atitude de Dono + Equipe · 4 min)*

**Cenário.** Outro dentista da clínica está com a agenda atrasada. A recepção pergunta se você, que
está com 30 minutos livres, pode atender um paciente dele.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Atende o paciente, alinhando antes com o colega o que precisa ser feito naquela sessão. |
| 2 | pontua | 2 | Atende o paciente seguindo o prontuário, sem falar com o colega sobre o que foi feito nele. |
| 3 | neutro | 1 | Diz que atende, mas só se o colega pedir pessoalmente, porque o paciente é dele, não seu. |
| 4 | atencao | 0 | Diz que o paciente não é seu e usa o horário livre para organizar as suas coisas. |

#### MC6 · A reclamação sobre a recepção
*(dimensão: Equipe + Experiência do paciente · 4 min)*

**Cenário.** Na cadeira, a paciente reclama que foi mal atendida pela recepção quando tentou remarcar
a sessão.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Acolhe a queixa sem culpar a colega, pede desculpas e leva o retorno à coordenação. |
| 2 | pontua | 2 | Pede desculpas em nome da clínica e segue a sessão, sem levar a queixa a ninguém da equipe. |
| 3 | neutro | 1 | Muda de assunto com gentileza, para não criar clima ruim, e começa logo o procedimento. |
| 4 | atencao | 0 | Concorda que a recepção às vezes deixa a desejar e diz que vai falar com eles sobre isso. |

#### Caso aberto · A primeira sessão com você
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

## 4 · Redação cultural
<!-- gerado: payload.redacoes_novas — nao editar a mao -->

Código `DENT_UAU` — redação NOVA, criada pela migration da vaga com o texto exato do formulário antigo do operador. Mede a «experiência UAU» da cultura da clínica (valor primário `uau`, secundário `atitude_de_dono`) por um caso real com resultado, não por adjetivo. Complementa o caso escrito: o caso pergunta como a pessoa FARIA a primeira sessão; a redação pede algo que ela JÁ FEZ. 200 a 500 palavras. O código evita «D4», que já é o nome de uma dimensão da nota da redação.

> Descreva uma situação específica em que você superou as expectativas de um paciente, proporcionando uma experiência memorável que foi além do tratamento odontológico convencional. O que você fez de diferente e qual foi o resultado?

## 5 · Quais avaliações entram

| Instrumento | Obrigatório | Peso |
|---|---|---|
| Triagem | sim | 20 (contexto — não entra no score final) |
| Teste situacional (`dentista`: 6 mc + 1 caso escrito) | sim | 35 |
| Redação `DENT_UAU` | sim | 15 |
| Big Five | não | — |
| Cognitivo | não, e `aplica_cognitivo = false` | — |
| Entrevista | sim | 30 |

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
- Graduação em Odontologia.
- Inscrição ativa no CRO-SP. A Etapa 1 pergunta isto de frente:
  · "Tenho inscrição ativa no CRO-SP" → atendido.
  · "Tenho CRO ativo de outro estado e vou pedir a inscrição no CRO-SP antes de
    começar" → atendido, com observação em `reasoning` — nunca em `gaps`.
  · sem resposta e sem número de CRO no currículo → `insufficient_evidence`.
- Disponibilidade presencial, de segunda a sexta. A Etapa 1 também pergunta:
  · "…integral e presencial…" → atendido; "…mas precisaria ajustar o horário…" →
    atendido, com observação. Querer negociar horário não é indisponibilidade.
  · "…apenas em alguns dias ou turnos…" → gap `critical`.
  · nenhuma resposta sobre disponibilidade → `insufficient_evidence`.

⚠ TEMPO DE EXPERIÊNCIA NÃO É ELIMINATÓRIO (decisão do operador): não há mínimo de
anos de clínica. Recém-formado com CRO-SP não recebe gap por pouco tempo de
formado; a experiência pesa só na competência 1.

⚠ COMO LER AS RESPOSTAS DA ETAPA 1: cada item chega como «Pergunta: …» seguido de
«Resposta: …», na ordem do formulário. Julgue cada resposta À LUZ DA PERGUNTA que a
gerou, e trate-a como evidência de MESMO PESO que o currículo. Se algum item vier
sem a linha «Pergunta:», identifique-o pelo próprio conteúdo.

⚠ `critical` é SÓ para os três eliminatórios. Gap de competência é no máximo
`important`.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Clínica geral em adultos, como rotina
   Peso ALTO.
   5 = atendimento clínico geral de adultos como atividade principal, com
       procedimentos variados (restauração, periodontia básica, urgência), em
       clínica ou consultório.
   3 = clínica geral em contexto limitado: estágio, clínica-escola, residência,
       plantão ou atendimento esporádico.
   1 = nenhuma evidência de atendimento clínico de adultos.
   A Etapa 1 traz a faixa de experiência clínica e os procedimentos de maior experiência
   (até 3): some as duas fontes ao currículo, não substitua uma pela outra. "Menos de 2
   anos de experiência clínica" não é gap — não há mínimo; só posiciona a faixa.

2. Trabalho dentro de protocolo e biossegurança
   Peso MÉDIO.
   5 = atuou em clínica com protocolos clínicos definidos (rede, clínica
       multidisciplinar, hospital), com prontuário e fluxo padronizados; ou teve
       responsabilidade formal por biossegurança.
   3 = consultório ou clínica pequena, sem evidência de protocolo padronizado.
   1 = nenhuma evidência.
   A Etapa 1 pergunta como a pessoa lida com protocolos. "Sigo os protocolos à risca" e
   "Adapto… mas mantenho a essência deles" são compatíveis com a função. "Prefiro
   desenvolver meus próprios protocolos" e "Sigo os protocolos quando é conveniente…"
   limitam esta competência a no máximo 3 e devem ser comentadas em `reasoning` como
   tema de entrevista.

3. Atualização técnica por iniciativa própria
   Peso MÉDIO. Conta ponto, não elimina.
   5 = especialização, cursos ou formação nos últimos 3 anos em laser, odontologia
       digital, periodontia ou odontologia minimamente invasiva.
   3 = formação complementar antiga ou em área sem relação com a rotina da clínica.
   1 = nenhuma formação além da graduação.
   A Etapa 1 lista as especializações concluídas ou em andamento. Especialização em
   harmonização orofacial não conta nem desconta: a clínica não faz esse procedimento.

4. Tecnologia clínica
   Peso BAIXO. Conta ponto, não elimina.
   5 = usou laser odontológico na rotina; ou escâner intraoral e radiologia digital.
   3 = contato com uma dessas tecnologias em curso ou de forma ocasional.
   1 = nenhuma evidência.
   A Etapa 1 traz a lista de tecnologias e, opcionalmente, um relato livre sobre laser
   (tratamento e equipamento) — use o relato como evidência quando existir. A AUSÊNCIA
   de experiência com laser, ou o relato em branco, NÃO é gap: a clínica treina no
   Centro de Excelência Beauty Smile.

5. Experiência do paciente e trabalho em equipe
   Peso MÉDIO.
   5 = evidência de cuidado além do procedimento — acompanhamento depois da sessão,
       manejo de paciente com medo, orientação personalizada — em clínica
       multidisciplinar, integrado com auxiliares e outros especialistas.
   3 = atendimento ao paciente sem evidência de cuidado além do procedimento ou de
       trabalho em equipe.
   1 = nenhuma evidência.
   A Etapa 1 lista as ações que a pessoa diz incorporar na rotina de atendimento. Ações
   concretas marcadas (contato no dia seguinte, tempo extra para dúvidas, antecipar
   necessidades) são evidência declarada, com peso menor que um exemplo citável.

## O que NÃO pode pesar em nenhuma hipótese
- Nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro ou regionalismo.
- Universidade de formação, prestígio da instituição ou ano de formatura.
- Tempo de formado além do que a competência 1 já mede.
- Ter ou não especialização — conta na competência 3, nunca é corte.
- Experiência ou especialização em harmonização orofacial ou estética facial: a clínica
  não faz esses procedimentos; não conta ponto nem desconta.
- Atender em mais de uma clínica ao mesmo tempo, número de empregos ou tempo em
  desemprego — é comum na profissão e não diz nada sobre desempenho.
- Número de seguidores ou presença em redes sociais.
- "Perfil simpático", "inovador", "mentalidade de crescimento" sem evidência citável, e
  os adjetivos do anúncio sobre a clínica, o laser ou o Dr. Fernando.

Todo ponto forte e todo gap deve citar trecho literal do currículo ou da resposta. Se
não há trecho que permita julgar uma competência, use `insufficient_evidence` — é
melhor que chutar.
````

## 11 · Perfil ideal — campo interno que alimenta o guia de entrevista
<!-- gerado: payload.vaga.perfil_ideal — nao editar a mao -->

O candidato não vê. A EF `gerar-guia-entrevista` o injeta no prompt, cortado em 800 caracteres — este tem 750.

````markdown
Dentista de clínica geral de adultos que executa bem um plano feito pelo Dr. Fernando e cuida da experiência do paciente em cada sessão: explica o que vai fazer, acolhe quem tem medo, combina cuidados em casa e acompanha a evolução. Segue protocolo e biossegurança sob pressão de agenda e não fala de preço com o paciente. Na entrevista, sondar: um paciente com medo que ele conduziu; algo que fez por um paciente sem ele pedir; como organiza a primeira sessão de um paciente novo; quando discordou de um protocolo e como encaminhou. Como não há tempo mínimo de clínica, investigar a prática real por trás do currículo. Riscos: quem promete resultado, quem trata o paciente como dente e não como gente, e quem prefere seguir só a própria experiência.
````

## 12 · Textos de divulgação

### 12.1 · Catho

*Texto puro. Título de busca: «Cirurgião-Dentista Clínico Geral». Campo de salário: «A combinar» —
sem valores.*

````
Cirurgião(ã)-Dentista — Clínica Geral (PJ, presencial)

A Beauty Smile é a única clínica do Brasil que trabalha exclusivamente com o laser Fotona
LightWalker: odontologia sem dor, sem trauma e minimamente invasiva, no Paraíso, em São Paulo.
Buscamos um(a) cirurgião(ã)-dentista para a clínica geral de adultos.

O papel:
Executar os tratamentos e os protocolos de laser da clínica. A avaliação do paciente e a
apresentação do plano ficam com o Dr. Fernando; você conduz as sessões, acompanha a evolução e
orienta o paciente.

Atividades:
Consultas e tratamentos preventivos e corretivos em adultos, seguindo o protocolo da clínica
Protocolos com laser Fotona, após treinamento no Centro de Excelência Beauty Smile
Acompanhamento da evolução dos tratamentos, com qualidade e segurança
Orientação ao paciente sobre cuidados preventivos e higiene
Biossegurança e prontuário completo
Trabalho integrado com a equipe multidisciplinar

Obrigatórios:
Graduação em Odontologia
Inscrição ativa no CRO-SP
Experiência em clínica geral com adultos (sem tempo mínimo)
Disponibilidade presencial, de segunda a sexta
Experiência com laser NÃO é exigida: a clínica treina

Desejáveis (contam pontos):
Especialização em odontologia
Clínicas multidisciplinares de alto padrão
Laser, escaneamento 3D ou radiologia digital
Cursos em laser, odontologia digital ou minimamente invasiva

Contrato e benefícios:
PJ, com valor fixo mensal e CNPJ ativo
Capacitação nos protocolos de laser no Centro de Excelência Beauty Smile
Plano de saúde, Wellhub, tratamentos Beauty Smile e desconto para familiares, cursos internos

A clínica não faz harmonização orofacial nem estética facial.

Processo seletivo: perguntas objetivas na inscrição, avaliação online com situações clínicas e
um caso clínico escrito, redação e entrevista.

Candidatura: rh.beautysmile.com.br/vagas/dentista-clinica-geral-laser
````

Tipo de contrato: PJ · Horário: segunda a sexta, das 9h às 19h · Local: Rua Desembargador Eliseu
Guilherme, 53 — Paraíso.

### 12.2 · LinkedIn

*Gancho nas duas primeiras linhas, antes do «ver mais». Sem negrito.*

````
Você já atendeu um paciente que dormiu na cadeira durante o tratamento periodontal?

Aqui isso é rotina. A Beauty Smile é a única clínica do Brasil que trabalha exclusivamente com o
laser Fotona LightWalker — e estamos procurando um(a) dentista para a clínica geral de adultos.

A vaga:
— Cirurgião(ã)-Dentista, clínica geral, presencial no Paraíso, São Paulo
— PJ, com valor fixo mensal
— Você executa os planos e os protocolos de laser; a avaliação é do Dr. Fernando
— Não precisa saber laser: você aprende no nosso Centro de Excelência

Procuro quem segue protocolo com rigor, explica ao paciente sem prometer o que não pode garantir,
e cuida da pessoa — não só do dente — em cada sessão.

CRO-SP ativo é obrigatório. Tempo de formado, não.

Se for você, ou se conhece alguém: rh.beautysmile.com.br/vagas/dentista-clinica-geral-laser

#odontologia #dentista #cirurgiaodentista #laser #vagasp
````

### 12.3 · Grupos de WhatsApp

*Sintaxe nativa do WhatsApp: asterisco simples é negrito, underscore é itálico, link como URL crua.*

````
*VAGA — Cirurgião(ã)-Dentista, Clínica Geral (PJ, presencial SP)*

Clínica de odontologia 100% laser no Paraíso procura dentista para clínica geral de adultos.

*O trabalho*
- Executar os tratamentos e protocolos de laser da clínica
- Avaliação e plano ficam com o Dr. Fernando
- Treinamento em laser no Centro de Excelência Beauty Smile

*Precisa ter*
- CRO-SP ativo
- Experiência em clínica geral com adultos (sem tempo mínimo)
- Disponibilidade presencial, seg a sex, 9h às 19h

*Oferecemos*
- PJ com valor fixo mensal
- Plano de saúde, Wellhub, tratamentos com desconto

_Não fazemos harmonização orofacial nem estética facial._

Candidatura: https://rh.beautysmile.com.br/vagas/dentista-clinica-geral-laser
````

> ⚠ O link só funciona depois que a vaga for **publicada**. Não divulgue antes.

## 13 · Checklist de cadastro no sistema
<!-- gerado: payload — nao editar a mao -->

| Campo | Valor |
|---|---|
| `slug` | `dentista-clinica-geral-laser` |
| `titulo` · `subtitulo` · `descricao_curta` | §1 |
| `sobre_cargo` · `responsabilidades` · `requisitos_*` · `diferenciais` · `beneficios` · `sobre_empresa` | §1 |
| `secoes_extras` | «Conheça a Beauty Smile» |
| `perfil_ideal` | §11 |
| `departamento` · `tipo_contrato` · `modelo_trabalho` | Clínico · PJ · Presencial |
| `cidade` · `estado` · `endereco_completo` | São Paulo · SP · Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP |
| `jornada_trabalho` | Segunda a sexta, das 9h às 19h, presencial — **não renderiza**; por isso o horário está em `sobre_cargo` |
| `faixa_salarial_min` / `max` | vazios — o valor é combinado na entrevista |
| `total_vagas` | 1 |
| `data_abertura` | a data do apply |
| `status` | **`rascunho`** — publicar é ato humano separado |
| `created_by` | Fernando Costa Neto (resolvido por e-mail; a migration aborta se não achar) |
| `rubrica_ia` | §6 |
| `pesos_avaliacao` | triagem 20 · work_sample_sjt 35 · redacao_cultural 15 · entrevista 30 |
| `testes_aplicaveis` | triagem (obrig.) · work_sample_sjt (obrig., cargo `dentista`) · redacao_cultural (obrig., código DENT_UAU) · big_five (não obrig.) · cognitivo (não obrig.) · entrevista (obrig.) |
| `aplica_cognitivo` | `false` |
| `qualificacao_etapa1` | **não tocar** — snapshot do `publish_vaga` |
| `perguntas_formulario` | §2 — 10 perguntas, 0 abertas; a pergunta 1 leva as opções knockout e é obrigatória |

## 14 · Teste prático

Não há teste prático separado. O caso escrito é o work-sample: a IA lê o texto inteiro, e o
RH abre a resposta no scorecard. Habilidade manual não se mede por escrito — se a clínica quiser
avaliá-la, o lugar é a entrevista presencial (por exemplo, acompanhando uma sessão).

## 15 · Critérios das dimensões do caso escrito
<!-- gerado: supabase/functions/_shared/sjt-rubrica.ts — nao editar a mao -->

É a régua que a IA recebe para pontuar o caso escrito. As dimensões e os pesos vêm do texto do banco (§3); os critérios, do catálogo. A conversão em nota 1-5 é do sistema: 5 = todos os inclusion e nenhum exclusion; 1 = inclusion ausente ou um exclusion crítico. Nota 0-25 · ≥18 avança · 13-17 entrevista · <13 revisão humana.

### `preparacao_e_acolhimento` — Preparação e acolhimento · peso 15

**Inclusion**

(1) Antes de o paciente chegar, lê a avaliação e o prontuário: a queixa, o plano, medos e preferências anotados.
(2) Deixa a sala e o material prontos antes do horário.
(3) Recebe o paciente pelo nome e se apresenta.
(4) Conversa com ele antes de levá-lo à cadeira, sem pressa.

**Exclusion**

- menor: não lê nada sobre o paciente antes de ele chegar.
- menor: recebe sem se apresentar ou sem chamá-lo pelo nome.
- menor: leva direto à cadeira, sem conversa.

### `escuta_e_personalizacao` — Escuta e personalização · peso 20

**Inclusion**

(1) Pergunta como o paciente está e o que espera do tratamento.
(2) Pergunta sobre experiências anteriores com dentista e se algo o deixa desconfortável.
(3) Ajusta a condução ao que ouviu - ritmo, pausas, quanto explicar.
(4) Anota as preferências para as próximas sessões.

**Exclusion**

- CRÍTICO: não pergunta nada ao paciente - conduz a sessão igual para qualquer pessoa.
- menor: pergunta, mas nada do que ouve muda a condução.
- menor: não registra as preferências.

### `conducao_sem_surpresas` — Condução sem surpresas · peso 25

**Inclusion**

(1) Explica cada etapa antes de fazer, em linguagem simples, e mostra o equipamento.
(2) Combina um sinal para o paciente pedir pausa e diz que pode parar quando quiser.
(3) Confere o conforto dele durante a sessão e faz pausas.
(4) Diz com honestidade o que ele pode sentir - por exemplo, um leve aquecimento -, sem garantir que não sentirá nada.

**Exclusion**

- CRÍTICO: descreve a sessão sem nenhuma explicação ao paciente, ou trata o desconforto dele como bobagem ("isso é normal, todo mundo sente").
- menor: garante que "não vai doer nada" como promessa absoluta.
- menor: explica só no começo e não confere durante a sessão.

### `orientacao_de_saida` — Orientação de saída · peso 20

**Inclusion**

(1) Explica pessoalmente, antes de o paciente ir, os cuidados em casa e o que esperar até a próxima sessão.
(2) Pergunta se ele tem dúvidas e confere que entendeu.
(3) Diz quando é a próxima sessão e o que vai acontecer nela.
(4) Encerra de forma pessoal, não com um protocolo de saída.

**Exclusion**

- CRÍTICO: manda embora sem orientação, ou só com o papel ("está tudo no folheto").
- menor: não confere se o paciente entendeu.
- menor: não diz quando é a próxima sessão.

### `cuidado_depois_da_sessao` — Cuidado depois da sessão · peso 20

**Inclusion**

(1) Registra no prontuário o que foi feito e o que deixou o paciente à vontade.
(2) Faz um contato pessoal no dia seguinte para saber como ele está.
(3) Passa à recepção e à auxiliar o que vale para a próxima sessão.
(4) Confere que a próxima sessão está marcada.

**Exclusion**

- CRÍTICO: não registra nada do que aconteceu na sessão.
- menor: o contato do dia seguinte é uma mensagem automática.
- menor: não passa nada à equipe para a próxima vez.

