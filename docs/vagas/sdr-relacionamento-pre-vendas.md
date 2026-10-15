# Vaga — Consultor(a) de Relacionamento e Pré-vendas (SDR) · rodada de outubro/2026

> **Aplicado em 15/10/2026**: a vaga em `20261014000101` (nasce `rascunho`) e o banco em `20261014000102`. Publicar é ato separado.
> Versão 1 · 2026-10-14 · autor da vaga: Fernando Costa Neto
> Fontes: `Descritivo_Cargo_SDR_Beauty_Smile_v3_brand.pdf` · `Onboarding_SDR_Beauty_Smile.pdf` ·
> a vaga anterior `consultor-relacionamento-pre-vendas` (lida do banco em 14/10) · metodologia
> Full Sales (`consultor-pre-vendas/Conhecimento/metodologia/full-sales-system`) · o anúncio da
> Beauty Smile na Catho (formato de referência).

> ⚠ **As seções marcadas «gerado» saem por script** do payload
> (`docs/vagas/proveniencia/sdr-relacionamento-pre-vendas.payload.json`) e do catálogo
> `supabase/functions/_shared/sjt-rubrica.ts`. Não edite à mão: mude a fonte e regere. Anotações
> ficam FORA delas.

## Decisões

| # | Assunto | Situação |
|---|---|---|
| D1 | Vaga nova ou reabrir a antiga | ✅ **Resolvida (14/10)** — vaga nova, slug `sdr-relacionamento-pre-vendas`. A antiga fica intacta com as 10 candidaturas da rodada anterior |
| D2 | Ampliar ou repor | ✅ **Resolvida (14/10)** — reposição. O anúncio fala da função, sem citar o time atual |
| D3 | Onboarding e valores no anúncio | ✅ **Resolvida (14/10)** — sem seção de onboarding e sem valores em reais. O modelo de remuneração fica; os números vão para a entrevista |
| D4 | Redação e pesos | ✅ **Resolvida (14/10)** — a redação sai; o que ela tentava medir entra no caso aberto. Pesos 25/40/0/35 (ver «Onde o peso cai») |
| D5 | Rubrica da IA (§6) | ✅ **Aprovada (15/10)** — a mesma da rodada anterior, sem mudança de texto |
| D6 | Knockout em «apenas remoto» (§2) | ✅ **Aprovado (14/10)** |
| D7 | Banco do teste situacional revisado (§3) | ✅ **Aprovado (15/10)**, aplicado em `20261014000102` — saem o item de indicação de tratamento e o de reclamação pública; entram a objeção «preciso ver com meu marido» e a reativação de orçamento parado; «lente» vira «clareamento»; o caso aberto ganha (b) follow-up de 7 dias e (c) objeção de preço |
| D8 | Critérios do caso aberto (§15) | ✅ **Aprovados (15/10)** — ⚠ só valem depois do deploy da EF `avaliar-redacao` |

### ⚠ Uma tensão que vale vocês saberem: preço

A Full Sales manda **não** passar valor no primeiro contato («varia por caso, o especialista
detalha») e só abrir o preço para quem parece fora do perfil. O teste aprovado da Beauty Smile
(MC4, §3) **premia o contrário**: dar a faixa de preço, dizer que o valor exato sai na avaliação e
perguntar o que a pessoa quer mudar. Os critérios do caso aberto (§15) seguem o teste aprovado,
porque um catálogo que contradiz o próprio teste cobra duas coisas opostas do mesmo candidato.
Se a política da clínica passou a ser a da Full Sales, mudam **os dois juntos**: o MC4 e o
critério `comunicacao_de_valor`.

## O fluxo, de ponta a ponta

**1 · Inscrição** — pública. Dados, currículo em PDF e as **5 perguntas da Etapa 1** (§2), todas
de escolha, nenhuma aberta. **Uma opção elimina:** quem marcar «apenas para trabalho remoto»
tem a candidatura encerrada aqui. É a única rejeição automática do funil (D6).

**2 · Triagem** — a IA lê o currículo, as respostas da Etapa 1 e a rubrica (§6), e nada mais.
Devolve score, pontos fortes e lacunas com trecho citado. **O sistema nunca rejeita sozinho.**
Não há avanço automático: o RH aprova pessoa a pessoa.

**3 · Avaliação assíncrona** — liberada a quem o RH aprovou:

| | o que é | tempo | pesa? |
|---|---|---|---|
| Teste situacional, múltipla escolha (§3) | 6 situações do pré-vendas, 4 alternativas embaralhadas | ~24 min | sim |
| Caso aberto (§3, §15) | (a) responder por escrito a um lead real de WhatsApp; (b) planejar o follow-up de 7 dias de quem não respondeu; (c) contornar a objeção «achei caro» — 200 a 500 palavras no total | ~20 min | sim |
| Big Five | 116 itens | ~15 min | **não** — contexto, com devolutiva ao candidato |

Aqui a IA **vê a peça inteira** do caso aberto: a entrega é o próprio texto, não um link.

**4 · Entrevista** — o roteiro é gerado a partir do perfil ideal (§11). Ele pede role-play de
WhatsApp, e é a etapa que mais pesa junto com o teste situacional.

**5 · Decisão final** — humana, com o painel de tudo, inclusive o texto do caso aberto.

**Total pedido ao candidato antes de falar com alguém: ~1h.**

### Onde o peso cai
<!-- gerado: payload.pesos_avaliacao — nao editar a mao -->

| Etapa | Rodada anterior | Esta vaga |
|---|---|---|
| `triagem` | 25 | **25** |
| `work_sample_sjt` | 15 | **40** |
| `redacao_cultural` | 25 | **0** |
| `entrevista` | 35 | **35** |
| soma | 100 | **100** |

Big Five e cognitivo não têm peso.

## 1 · O anúncio, como o candidato lê
<!-- gerado: payload.vaga — nao editar a mao -->

Os blocos em cerca são o markdown exato que vai ao banco; a página o renderiza.

### Título (texto puro)

> Consultor(a) de Relacionamento e Pré-vendas

### Subtítulo (texto puro)

> Também divulgada como "Analista de Relacionamento Comercial" · função interna: SDR / Pré-vendas · Trilha para Coordenação ou Closer

### Resumo (texto puro)

> A porta de entrada comercial da clínica: responder rápido, entender o que a pessoa procura, construir confiança e levá-la até a avaliação — com ela comparecendo.

### Sobre o cargo

````markdown
Na Beauty Smile, o tratamento entrega. O que estamos construindo agora é a experiência que antecede ele. Todos os dias, pessoas chegam até a clínica querendo resolver algo que carregam há anos — dor, medo, um sorriso que incomoda. Esta vaga existe para cuidar exatamente desse momento: o primeiro contato.

O foco não é "vendedor": é relacionamento. Além dos leads novos, esta pessoa também reativa a base parada e trabalha a segunda venda de quem já é paciente. Você vai trabalhar ao lado de profissionais formados nos principais centros de excelência do mundo, em uma operação enxuta onde cada melhoria aparece no resultado do mês seguinte — com autonomia para construir scripts, cadências e processo, contato direto com a gestão e com o Dr. Fernando Costa Jr., e trilha de carreira definida antes da contratação.

Objetivo do cargo: garantir que nenhum lead se perca entre o primeiro contato e a avaliação — respondendo com velocidade, qualificando com escuta e sustentando o follow-up até uma resposta clara. O sucesso é medido por agenda cheia de gente qualificada e paciente presente. A prioridade número um são os leads novos; a base entra de forma faseada. Você agenda para o closer — hoje o Dr. Fernando Costa Jr. — conduzir o fechamento; fechar diretamente acontece apenas em exceção.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h, com 1h12 de intervalo — 44h semanais, em regime CLT, com compensação do sábado por acordo escrito.

### Quem se dá bem nesta vaga

Alguém que enxerga o primeiro contato como cuidado, e não como abordagem. Que se organiza por processo, sustenta follow-up sem constrangimento e sabe conversar sobre estética, saúde e dinheiro com naturalidade.

### Como o desempenho é medido

As metas abaixo foram calibradas com os dados reais da operação e servem de alvo e de base da premiação. Elas são combinadas antes de você começar, não descobertas depois.

- **Tempo médio de 1ª resposta** — até 5 minutos.
- **Leads contatados no mesmo dia** — 100%.
- **Taxa de agendamento**, agendamentos sobre leads trabalhados — 15%.
- **Taxa de comparecimento** — acima de 70%, com no-show abaixo de 30%.
- **Registro no CRM**, com etapa e próximo passo — 100%.
- **Reativações e indicações geradas na base** — meta mensal.

### Como é o processo seletivo

Inscrição com cinco perguntas objetivas e análise do currículo. Quem avança recebe uma avaliação online, para fazer no seu tempo: seis situações do dia a dia do pré-vendas e um caso prático — responder por escrito a uma mensagem real de WhatsApp, planejar o follow-up de quem não respondeu e contornar uma objeção de preço. Por fim, entrevista.

O caso prático e a entrevista são as etapas que mais pesam. Esta função vende por escrito, e escrever para alguém inseguro, que pergunta o preço antes de qualquer coisa, é a competência central do cargo.
````

### Responsabilidades

````markdown
**Captação e primeiro contato.** Receber e responder leads de WhatsApp, Instagram (DMs, comentários e Stories), campanhas, telefone e indicações — sempre com prioridade máxima para o primeiro contato, seguindo roteiro de atendimento para uma experiência personalizada e consultiva.

**Qualificação consultiva.** Entender queixa, desejo estético, urgência e contexto de decisão; identificar perfil aderente aos tratamentos (ticket alto) e alinhar expectativas antes de ocupar a agenda clínica.

**Nutrição e follow-up.** Aquecer quem ainda não decidiu, sustentar cadências de follow-up até uma resposta clara (agenda, adia com data ou descarta) e contornar objeções iniciais de forma consultiva.

**Agendamento e comparecimento.** Agendar avaliações; confirmar, lembrar e reduzir ativamente o no-show; registrar 100% das interações no CRM em tempo real; enviar o relatório diário.

**Base (faseado).** Desde o início, de forma leve: reativar clientes e leads sem contato há 6+ meses, orçamentos em aberto e pedir indicações — clientes ativos e recentes seguem com a equipe da clínica. As campanhas estruturadas de reativação e upsell entram na etapa 3 da carreira.

**No dia a dia, além do funil.** Trabalhar junto ao marketing para alinhar campanhas, manter-se atualizado sobre os tratamentos da clínica e identificar oportunidades de fidelização e de tratamentos complementares.

### A rotina do dia a dia

A rotina roda em blocos, garantindo que o que gera resultado aconteça todo dia — não só quando sobra tempo.

- **Abertura** — revisão da agenda do dia, leads pendentes e prioridades.
- **Confirmações** — confirmar avaliações do dia e do dia seguinte; recontatar quem faltou.
- **Leads novos** — atendimento imediato de tudo que entrou; resposta rápida é o principal fator de conversão.
- **Follow-up quente** — contato com quem demonstrou interesse claro e ainda não agendou.
- **Follow-up frio / base** — reaquecer quem parou de responder, orçamentos em aberto e reativação de inativos.
- **Fechamento** — atualizar CRM, agendar lembretes e enviar o relatório do dia.

Rituais fixos: relatório diário, revisão semanal de pipeline com a gestão e análise mensal de indicadores.
````

### Formação

````markdown
Ensino médio completo. Superior cursando ou completo conta pontos.
````

### Experiência

````markdown
Mínimo de 1 ano em atendimento, vendas, recepção ou relacionamento. Contam pontos: experiência em clínica odontológica, estética ou saúde; venda de ticket médio/alto; experiência como SDR, pré-vendas, social seller ou inside sales.
````

### Conhecimentos técnicos

````markdown
Atendimento e venda consultiva por WhatsApp (boa escrita, tom profissional); comunicação telefônica com naturalidade; organização de agenda, confirmações e follow-up; uso de CRM; Pacote Office e Pacote Google (Drive, Docs, Sheets, Gmail); leitura básica de indicadores (volume, conversão, comparecimento).

**Ferramentas do dia a dia:** GoHighLevel (CRM), Clinicorp, WhatsApp Business, Instagram e Facebook, Zoom/videoconferência e planilhas de controle.

**Contam pontos:** GoHighLevel, Clinicorp ou CRMs similares; Instagram como canal de relacionamento; noções de funil e marketing digital.
````

### Habilidades

````markdown
Excelente comunicação escrita; facilidade com tecnologia; disponibilidade integral e presencial (segunda a sexta); rotina organizada e histórico de cumprir prazos.

**Comportamentais:**

- **Comunicação** — fala e escreve bem sobre estética, saúde e dinheiro.
- **Organização** — opera com processo, não com memória.
- **Proatividade.**
- **Empatia** — entende a insegurança por trás de um orçamento.
- **Resiliência** — lida com "não" e com silêncio.
- **Foco em meta** e ambição saudável.
````

### Diferenciais e carreira

````markdown
Contato direto com a gestão e com o Dr. Fernando Costa Jr., autonomia para construir scripts, cadências e processo, e trilha de carreira definida **antes** da contratação.

### Plano de evolução da carreira

1. **SDR / Relacionamento** *(foco atual)* — captação, 1º contato, qualificação, nutrição, follow-up e agendamento com alto comparecimento. Abre a próxima etapa com metas de agendamento e comparecimento atingidas por 2 meses seguidos e CRM confiável.
2. **Jornada do paciente** — acompanhamento antes e durante a consulta, apoio ao processo comercial e transição gradual do fechamento (hoje conduzido pelo Dr. Fernando Costa Jr.), incluindo pós-venda.
3. **Expansão comercial** — campanhas de reativação da base, upsell e cross-sell, recuperação de oportunidades e programa de indicações; receita ativa a partir da base.
4. **Coordenação Comercial OU Closer** — dois caminhos: liderar o comercial (metas, políticas, formação de time) ou seguir como Closer (condução e fechamento das vendas). A escolha depende do perfil demonstrado.
````

### Remuneração e benefícios

````markdown
### Remuneração

Modelo CLT com prêmio por metas — valor fixo por evento, **sem percentual sobre vendas**.

- **Salário fixo** em regime CLT, pago na folha normal.
- **Prêmio por resultado:** valor fixo por comparecimento qualificado e por venda originada por você — lead novo, reativação ou 2ª venda da base. **Sem teto.**
- **Ramp semestral:** fixo e prêmios evoluem a cada 6 meses conforme metas atingidas.
- **Apuração:** o prêmio por resultado é apurado no 5º dia útil e pago no 10º dia útil do mês seguinte. O salário fixo segue a folha normal.

Os valores, uma simulação de ganhos e as regras completas estão na Política de Remuneração — SDR/Relacionamento, apresentada na entrevista.

### Benefícios

- Vale transporte e plano de saúde.
- Acesso ao Gympass.
- Tratamentos Beauty Smile e desconto em procedimentos para familiares, conforme política interna.
- Formação e acompanhamento em vendas (SDR, Farmer e CS) com **uma das principais consultorias comerciais do país**, incluindo aula semanal ao vivo, além de cursos e treinamentos internos.

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

As mesmas 5 da rodada anterior, extraídas do banco. Nenhuma aberta.

**1 · `jornada` · single_choice · obrigatória** — Qual é a sua disponibilidade para esta vaga, que é presencial na clínica, de segunda a sexta, das 9h às 19h?

- Tenho disponibilidade integral e presencial, de segunda a sexta, no horário comercial
- Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída
- Tenho disponibilidade apenas parcial, em alguns dias da semana
- ⛔ **Tenho disponibilidade apenas para trabalho remoto** — **KNOCKOUT: encerra a candidatura na inscrição** (D6)

**2 · `curriculo` · single_choice · obrigatória** — Há quanto tempo você trabalha com atendimento, vendas, recepção ou relacionamento com cliente?

- Menos de 1 ano em atendimento, vendas, recepção ou relacionamento com cliente
- Entre 1 e 2 anos em atendimento, vendas, recepção ou relacionamento com cliente
- Entre 2 e 5 anos em atendimento, vendas, recepção ou relacionamento com cliente
- Mais de 5 anos em atendimento, vendas, recepção ou relacionamento com cliente

**3 · `tecnologia` · multiple_choice · obrigatória** — Quais destas atividades já são rotina do seu trabalho, e não algo que você fez uma vez?

- Atendimento e venda por WhatsApp, escrevendo eu mesmo as mensagens
- Prospecção ativa e follow-up de quem não respondeu, seguindo uma cadência definida
- Registro de todo contato em CRM (GoHighLevel, RD Station, HubSpot, Pipedrive, Clinicorp ou similar)
- Agendamento, confirmação e trabalho ativo para reduzir falta na agenda
- Atendimento por Direct do Instagram ou por comentários, como canal de vendas
- Acompanhamento de indicadores de conversão e de comparecimento
- Nenhuma destas ainda é rotina do meu trabalho

**4 · `curriculo` · single_choice · obrigatória** — Você já atendeu ou vendeu em um contexto em que a pessoa decide sobre um valor alto e sente insegurança?

- Sim, atendi cliente decidindo valor alto em clínica odontológica, estética ou de saúde
- Sim, atendi cliente decidindo valor alto em outro setor (imóveis, veículos, educação, serviços financeiros)
- Atendi cliente final, mas em produto ou serviço de ticket baixo
- Ainda não atendi cliente final nesse tipo de decisão

**5 · `valores` · single_choice · obrigatória** — O que mais te atrai nesta vaga?

- Ser o primeiro contato de quem chega buscando resolver algo que carrega há anos
- A trilha de carreira definida, que pode levar a Coordenação Comercial ou a Closer
- Construir os scripts, as cadências e o processo comercial com autonomia
- O prêmio por resultado sem teto, atrelado a comparecimento e a venda


## 3 · O teste situacional (SJT)
<!-- gerado: docs/specs/BANCO-SJT-V3-SDR.md — nao editar a mao -->

Banco `sdr-social-seller` **revisado nesta vaga** (D7): MC1, MC5 e MC6 ficam como estão no ar; MC2 e MC3 são novos; o MC4 troca «lente» por «clareamento»; o caso aberto é novo. O que muda e por quê está em `docs/specs/BANCO-SJT-V3-SDR.md`. A ordem da coluna `#` é só a de autoria: na tela as alternativas aparecem embaralhadas.

### Cargo `sdr-social-seller`

#### MC1 · O lead que visualizou e sumiu
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

#### MC2 · "Preciso ver com meu marido"
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

#### MC3 · O orçamento aprovado que nunca virou consulta
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

#### MC4 · Pediu o preço antes de qualquer conversa
*(dimensão: Qualificação consultiva + Comunicação de valor · 4 min)*

**Cenário.** Pelo WhatsApp, um lead manda: "Quanto custa o clareamento? Só quero o valor." É a terceira
mensagem dele, e ele já contou que está pesquisando em outras clínicas.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Dá a faixa de preço, diz que o valor exato sai na avaliação e pergunta o que ele quer mudar no sorriso. |
| 2 | pontua | 2 | Passa a faixa de preço e já convida para a avaliação, sem perguntar nada sobre o caso nem o que ele busca. |
| 3 | neutro | 1 | Passa a faixa de preço e encerra dizendo que, quando ele quiser agendar a avaliação, é só chamar de novo. |
| 4 | atencao | 0 | Passa o menor valor da tabela para não perder o lead para a concorrência e deixa o detalhe para a clínica. |

#### MC5 · A confirmação que não volta
*(dimensão: Comparecimento + Organização · 4 min)*

**Cenário.** Amanhã às 9h há uma avaliação marcada. Você mandou a confirmação ontem e hoje de manhã;
as duas mensagens foram entregues e não lidas. São 17h, e a agenda de amanhã tem lista de espera.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Liga ainda hoje; se ele não atender, manda recado, deixa a lista de espera de sobreaviso e anota no CRM. |
| 2 | pontua | 2 | Manda mais uma mensagem agora e, se não houver resposta até amanhã cedo, oferece o horário à lista. |
| 3 | neutro | 1 | Mantém o horário como está e confia na confirmação de ontem, que foi entregue, mesmo sem ter sido lida. |
| 4 | atencao | 0 | Libera o horário para a lista de espera agora, porque mensagem sem leitura costuma virar falta amanhã. |

#### MC6 · Vinte leads novos de uma vez
*(dimensão: Velocidade de resposta + Processo · 4 min)*

**Cenário.** Uma campanha nova entrou no ar às 10h. Ao meio-dia há 20 leads sem resposta no WhatsApp
e no Instagram, e você está no meio dos follow-ups quentes do dia.

| # | tag | peso | Opção |
|---|---|---|---|
| 1 | fortemente_pontua | 4 | Pausa os follow-ups, manda a cada lead novo uma primeira mensagem curta e pessoal e depois os retoma. |
| 2 | pontua | 2 | Termina os follow-ups quentes, que estão perto de agendar, e só depois responde os novos, um por um. |
| 3 | neutro | 1 | Pede à recepção que responda os novos com a mensagem padrão enquanto você termina os follow-ups quentes. |
| 4 | atencao | 0 | Manda a mesma resposta automática a todos os novos e volta a eles no fim do dia, com mais calma. |

#### Caso aberto · Responda, retome e contorne
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

## 4 · Redação cultural — não entra

A rodada anterior usava a `PADRAO_BS` («cuidar de alguém em momento de fragilidade»), com peso 25.
Ela não media o cargo: é uma redação genérica sobre cuidado, e não há redação de pré-vendas no
banco. O que ela tentava captar — escrever para alguém inseguro — o caso aberto mede de forma
direta, na própria mensagem ao lead. Por isso a redação sai de `testes_aplicaveis` e o peso dela
vai para o teste situacional (decisão do operador, 14/10).

## 5 · Quais avaliações entram

| Instrumento | Obrigatório | Peso |
|---|---|---|
| Triagem | sim | 25 |
| Teste situacional (`sdr-social-seller`: 6 mc + 1 caso aberto em três partes) | sim | 40 |
| Redação | **não entra** (§4) | 0 |
| Big Five | não | — |
| Cognitivo | não, e `aplica_cognitivo = false` (a prova textual tem banco vazio) | — |
| Entrevista | sim | 35 |

## 6 · A rubrica da IA, por extenso
<!-- gerado: payload.rubrica_ia — nao editar a mao -->

Extraída byte a byte da vaga anterior, onde foi aprovada e calibrada com candidatos reais. Ela já contém os eliminatórios (§7), o que é proibido pesar (§8) e as instruções de calibragem (§9) — por isso essas três seções não se repetem aqui.

✅ Conferido por script: idêntica à rubrica da vaga anterior.

⚠ **O sistema nunca rejeita por score.** Eliminatório ausente vira lacuna `critical` e segura o score abaixo de 40 — sinal para o RH, não decisão da máquina.

````markdown
⚠ `gaps` LISTA SÓ O QUE FALTA. Requisito atendido não entra, em severidade
nenhuma. Se a nota diria "atende ao requisito", o item não é gap: vira `strengths`
ou não aparece.

## Requisitos eliminatórios
Se algum estiver AUSENTE, registre gap `critical` e mantenha o score abaixo de 40,
por melhor que seja o resto do perfil. Se estiver atendido, não registre nada.
- Ensino médio completo.
- Pelo menos 1 ano de experiência em atendimento, vendas, recepção ou relacionamento.
  A Etapa 1 coleta isso em faixas nomeadas ("Menos de 1 ano em atendimento, vendas,
  recepção ou relacionamento com cliente", "Entre 1 e 2 anos…").
  ⚠ DIVERGÊNCIA entre a faixa declarada e as datas do currículo: fique com a MAIOR
  das duas e comente em `reasoning` — nunca em `gaps`. Gap de experiência só quando
  AMBAS ficam abaixo de 1 ano. Resumo do candidato ("atuo há 2 anos") conflitando
  com as datas que ele mesmo lista é imprecisão de redação, não falta de experiência.
- Disponibilidade integral e presencial, de segunda a sexta.
  ⚠ ISTO NÃO SE JULGA PELO CURRÍCULO, e desde 2026-08-27 não precisa: a Etapa 1 tem
  pergunta obrigatória sobre disponibilidade, e a resposta chega em texto que se explica
  sozinho.
  · "…integral e presencial, de segunda a sexta, no horário comercial" → atendido.
  · "…integral e presencial, mas precisaria ajustar o horário de entrada ou de saída"
    → atendido, com observação sobre o ajuste. Querer negociar horário não é
    indisponibilidade, e tratar como se fosse cortaria gente por um pedido legítimo.
  · "…apenas parcial, em alguns dias da semana" → gap `critical`.
  · nenhuma frase sobre disponibilidade nas respostas → `insufficient_evidence`, nunca
    ausência: seria descontar do candidato uma falha do sistema.
  O silêncio do CURRÍCULO sobre disponibilidade continua não sendo evidência de nada.

⚠ COMO LER AS RESPOSTAS DA ETAPA 1: cada item chega como «Pergunta: …» seguido de
«Resposta: …», na ordem do formulário. Julgue cada resposta À LUZ DA PERGUNTA que a
gerou, e trate-a como evidência de MESMO PESO que o currículo — uma disponibilidade
declarada na Etapa 1 conta tanto quanto se estivesse no CV. Se algum item vier sem a
linha «Pergunta:», identifique-o pelo próprio conteúdo.

⚠ `critical` é SÓ para os três eliminatórios. Gap de competência é no máximo
`important`: `critical` segura o score abaixo de 40, e usá-lo numa competência impõe
uma penalidade que ninguém decidiu para aquele caso.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Comunicação escrita profissional
   Peso ALTO. A função é atender e vender por escrito.
   5 = atendimento ou venda por escrito como atividade central, com volume.
   3 = escreveu no trabalho, mas de forma acessória.
   1 = nenhuma evidência de escrita profissional.
   Considere também a clareza e a ortografia do próprio currículo como evidência.

2. Venda consultiva e follow-up
   Peso ALTO.
   5 = responsável por prospecção, cadência e retomada de contato, com meta (SDR,
       pré-vendas, inside sales, social seller).
   3 = vendeu de forma reativa, balcão ou atendimento passivo.
   1 = nenhuma experiência comercial.

3. Disciplina de processo e CRM
   Peso MÉDIO.
   5 = operou CRM diariamente (GoHighLevel, Clinicorp, RD, HubSpot, Pipedrive ou similar).
   3 = organizou agenda ou follow-up por planilha ou sistema próprio.
   1 = nenhuma evidência de registro ou processo.
   A Etapa 1 pergunta isto de frente: marcar "Registro de todo contato em CRM (…)" na
   lista de rotina é evidência forte. Não ter marcado, tendo marcado OUTRAS opções da
   mesma lista, é evidência de ausência — a pessoa teve onde dizer e não disse. Mas
   marcar apenas "Nenhuma destas ainda é rotina do meu trabalho" não anula o que o
   currículo comprovar: some as duas fontes, não substitua uma pela outra.

4. Contexto de decisão que envolve dinheiro e insegurança
   Peso MÉDIO. Conta ponto, não elimina.
   5 = saúde, odontologia ou estética, OU venda de ticket médio/alto com negociação
       de orçamento.
   3 = varejo ou serviço de ticket baixo.
   1 = nenhum contato com cliente final.
   A Etapa 1 coleta isto diretamente, e as respostas mapeiam na régua acima:
   "…em clínica odontológica, estética ou de saúde" e "…em outro setor (imóveis,
   veículos, educação, serviços financeiros)" → faixa 5; "…mas em produto ou serviço de
   ticket baixo" → faixa 3; "Ainda não atendi cliente final nesse tipo de decisão" →
   faixa 1. Isto é ponto, não corte: a faixa 1 aqui NUNCA vira gap `critical`.

5. Consistência
   Peso BAIXO.
   Avalie permanência e histórico de cumprir meta ou prazo, quando houver evidência.
   NÃO penalize número de empregos, troca de área ou intervalo entre empregos —
   isso não é evidência de desempenho.

## O que NÃO pode pesar em nenhuma hipótese
- Nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro ou regionalismo.
- Ter ou não ter curso superior além do ensino médio exigido; prestígio da instituição.
- Tempo em desemprego.
- "Perfil jovem", "boa energia", "boa aparência", "proatividade" sem evidência citável.
- Os adjetivos do anúncio da vaga — "operação enxuta", "ambição saudável", "trilha de
  carreira". Descrevem a EMPRESA e não são critério sobre o candidato.

Todo ponto forte e todo gap deve citar trecho literal do currículo. Se o currículo não
permite julgar uma competência, use `insufficient_evidence` — é melhor que chutar.
````

## 11 · Perfil ideal — campo interno que alimenta o guia de entrevista
<!-- gerado: payload.vaga.perfil_ideal — nao editar a mao -->

O candidato não vê. A EF `gerar-guia-entrevista` o injeta no prompt, cortado em 800 caracteres — este tem 762. Na rodada anterior o campo guardava os indicadores de desempenho, que não ajudam o entrevistador; foi reescrito para ele.

````markdown
Já atendeu ou vendeu por escrito como atividade central, com volume, e sustenta follow-up sem constrangimento e sem pressão. Opera com processo e CRM, não com memória. Vende a avaliação, não o tratamento: qualifica antes de agendar, mesmo com a meta apertada. Na entrevista, fazer role-play de WhatsApp — «quanto custa?» logo na primeira mensagem, «vou falar com meu marido» e o lead que sumiu depois de receber horários — e observar se pergunta antes de responder, se propõe horários concretos e se respeita o paciente. Sondar: o que faz com lead fora do perfil no fim do mês, abaixo da meta; como organiza 20 leads novos de uma vez; como já reduziu falta na agenda. Riscos: quem só atendeu de forma passiva, quem agenda sem qualificar e quem promete resultado.
````

## 12 · Textos de divulgação

### 12.1 · Catho

*Texto puro, no formato do anúncio da Beauty Smile já publicado na Catho. Título de busca:
«Analista de Relacionamento Comercial», que é como o descritivo diz que a vaga também é
divulgada. Campo de salário: «A combinar» — sem valores (D3).*

````
Analista de Relacionamento Comercial (SDR / Pré-vendas)

A função é a porta de entrada comercial da Beauty Smile, clínica de odontologia estética 100%
laser no Paraíso, em São Paulo: responder rápido quem chega pelo WhatsApp, Instagram, campanhas,
telefone e indicação, entender o que a pessoa procura, construir confiança e levá-la até a
avaliação — com ela comparecendo. O foco não é vender: é relacionamento. Quem conduz o
fechamento é o dentista.

Captação e primeiro contato:
Responder todos os leads novos com prioridade máxima, seguindo roteiro de atendimento consultivo

Qualificação consultiva:
Entender queixa, desejo estético, urgência e contexto de decisão antes de ocupar a agenda clínica

Nutrição e follow-up:
Sustentar cadências de follow-up até uma resposta clara — agenda, adia com data ou descarta

Agendamento e comparecimento:
Agendar avaliações, confirmar, lembrar e reduzir ativamente o no-show
Registrar 100% das interações no CRM (GoHighLevel) em tempo real e enviar o relatório diário

Base:
Reativar contatos parados e orçamentos em aberto, e pedir indicações

Metas:
Primeira resposta em até 5 minutos, 100% dos leads contatados no mesmo dia, taxa de agendamento
de 15% e comparecimento acima de 70%

Remuneração:
Salário fixo (CLT) + prêmio por comparecimento qualificado e por venda originada, sem teto e sem
percentual sobre vendas

Benefícios:
Vale-transporte
Plano de saúde
Gympass
Tratamentos Beauty Smile e desconto em procedimentos para familiares, conforme política interna
Formação em vendas com uma das principais consultorias comerciais do país, com aula semanal ao vivo
Benefícios válidos após o período de experiência (3 meses)

Obrigatórios:
Ensino médio completo
Mínimo de 1 ano em atendimento, vendas, recepção ou relacionamento com cliente
Excelente comunicação escrita — a função vende por WhatsApp
Facilidade com tecnologia e uso de CRM
Disponibilidade integral e presencial, de segunda a sexta
Rotina organizada e histórico de cumprir prazos

Desejáveis (contam pontos na avaliação):
Experiência em clínica odontológica, estética ou saúde
Venda de ticket médio ou alto
GoHighLevel, Clinicorp ou CRMs similares
Experiência como SDR, pré-vendas, social seller ou inside sales
Instagram como canal de relacionamento
Superior cursando ou completo

Carreira:
Trilha definida antes da contratação: SDR → Jornada do paciente → Expansão comercial →
Coordenação Comercial ou Closer

Processo seletivo:
Perguntas objetivas na inscrição, avaliação online com situações do dia a dia e um caso prático
de atendimento por WhatsApp, e entrevista.

Candidatura: rh.beautysmile.com.br/vagas/sdr-relacionamento-pre-vendas
````

Tipo de contrato: CLT (Efetivo) · Horário: segunda a sexta, das 9h às 19h, com 1h12 de intervalo
(44h semanais), com compensação do sábado · Local: Rua Desembargador Eliseu Guilherme, 53 — Paraíso.

### 12.2 · LinkedIn

*Gancho nas duas primeiras linhas, antes do «ver mais». Sem negrito.*

````
A pessoa que manda "quanto custa?" no WhatsApp carrega aquele incômodo há anos.

Ela não quer uma tabela. Quer ser respondida rápido, por alguém que entenda o que está por trás
da pergunta — e que a ajude a dar o próximo passo sem pressão.

A Beauty Smile é a única clínica do Brasil que trabalha exclusivamente com laser Fotona
LightWalker. Estamos contratando a pessoa que cuida desse primeiro contato.

A vaga:
— Consultor(a) de Relacionamento e Pré-vendas (SDR), presencial no Paraíso, São Paulo
— CLT, fixo + prêmio por comparecimento e venda originada, sem teto
— Leads de WhatsApp, Instagram, campanhas e indicação, com GoHighLevel e Clinicorp
— Você agenda; o fechamento é do dentista

Você trabalha ao lado do dentista que conduz o fechamento, com formação comercial semanal ao vivo
e trilha de carreira definida antes da contratação: até Coordenação Comercial ou Closer.

Procuro quem já atendeu ou vendeu por escrito, com volume, e sabe sustentar follow-up sem
constrangimento e sem empurrar ninguém.

Se for você, ou se conhece alguém: rh.beautysmile.com.br/vagas/sdr-relacionamento-pre-vendas

#sdr #prevendas #insidesales #vagasp #relacionamentocomcliente
````

### 12.3 · Grupos de WhatsApp

*Sintaxe nativa do WhatsApp: asterisco simples é negrito, underscore é itálico, link como URL crua.*

````
*VAGA — SDR / Pré-vendas (CLT, presencial SP)*

Clínica de odontologia estética no Paraíso procura quem cuide do primeiro contato com os
pacientes: responder rápido, entender o que a pessoa procura e levá-la até a avaliação.

*O trabalho*
- Atender leads de WhatsApp, Instagram e campanhas
- Qualificar, fazer follow-up e agendar avaliações
- Confirmar e reduzir faltas na agenda
- Registrar tudo no CRM

*Precisa ter*
- 1 ano em atendimento, vendas, recepção ou relacionamento
- Escrita excelente no WhatsApp
- Disponibilidade presencial, seg a sex, 9h às 19h

*Oferecemos*
- CLT: fixo + prêmio por resultado, sem teto
- VT, plano de saúde, Gympass, tratamentos com desconto
- Formação semanal em vendas com consultoria

_Trilha de carreira até Coordenação Comercial ou Closer._

Candidatura: https://rh.beautysmile.com.br/vagas/sdr-relacionamento-pre-vendas
````

> ⚠ O link só funciona depois que a vaga for **publicada**. Não divulgue antes.

## 13 · Checklist de cadastro no sistema
<!-- gerado: payload — nao editar a mao -->

| Campo | Valor |
|---|---|
| `slug` | `sdr-relacionamento-pre-vendas` |
| `titulo` · `subtitulo` · `descricao_curta` | §1 |
| `sobre_cargo` · `responsabilidades` · `requisitos_*` · `diferenciais` · `beneficios` · `sobre_empresa` | §1 |
| `secoes_extras` | «Conheça a Beauty Smile» |
| `perfil_ideal` | §11 |
| `departamento` · `tipo_contrato` · `modelo_trabalho` | Comercial · CLT · Presencial |
| `cidade` · `estado` · `endereco_completo` | São Paulo · SP · Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP |
| `jornada_trabalho` | Presencial, segunda a sexta, das 9h às 19h com 1h12 de intervalo — 44h semanais, CLT, com compensação do sábado por acordo escrito. — **não renderiza**; por isso o horário está escrito em `sobre_cargo` |
| `faixa_salarial_min` / `max` | 3000 / 5200 — internos, `exibir_salario = false` (a remuneração está por extenso em `beneficios`) |
| `total_vagas` | 1 |
| `data_abertura` | a data do apply |
| `data_fechamento` | vazio |
| `status` | **`rascunho`** — publicar é ato humano separado |
| `created_by` | Fernando Costa Neto (resolvido por e-mail; a migration aborta se não achar) |
| `rubrica_ia` | §6 |
| `pesos_avaliacao` | triagem 25 · work_sample_sjt 40 · redacao_cultural 0 · entrevista 35 |
| `testes_aplicaveis` | triagem (obrig.) · work_sample_sjt (obrig., cargo `sdr-social-seller`) · big_five (não obrig.) · cognitivo (não obrig.) · entrevista (obrig.) |
| `aplica_cognitivo` | `false` |
| `qualificacao_etapa1` | **não tocar** — snapshot do `publish_vaga` |
| `perguntas_formulario` | §2 — 5 perguntas, 0 abertas; a pergunta 1 leva a opção knockout e é obrigatória |

## 14 · Teste prático

Não há teste prático separado. O **caso aberto é o próprio work-sample** desta função: a entrega
são as três partes escritas no campo — a mensagem ao lead, o follow-up e a resposta à objeção —, que a IA lê inteira e o RH consegue abrir no
scorecard. Por isso o caso aberto não precisa da ressalva «a IA não abre link» que as vagas de
marketing têm.

## 15 · Critérios das dimensões do caso aberto
<!-- gerado: supabase/functions/_shared/sjt-rubrica.ts — nao editar a mao -->

É a régua que a IA recebe para pontuar o caso aberto. As dimensões e os pesos vêm do texto do banco (§3); os critérios, do catálogo. Até hoje o caso aberto do cargo não tinha critério catalogado, e a IA julgava as dimensões **pelo nome**. A conversão em nota 1-5 é do sistema: 5 = todos os inclusion e nenhum exclusion; 1 = inclusion ausente ou um exclusion crítico. Nota 0-25 · ≥18 avança · 13-17 entrevista · <13 revisão humana.

### `acolhimento` — Acolhimento · peso 15

**Inclusion**

(1) Reconhece o incômodo concreto que o lead contou - o dente escuro, a vergonha de sorrir - e não só um "entendo" genérico.
(2) Responde à pergunta "vocês fazem?" antes de pedir qualquer coisa ao lead.
(3) Pergunta o nome ou trata a pessoa de forma pessoal: o lead não se identificou.
(4) O tom é de conversa entre pessoas, não de comunicado da empresa.
(5) Escreve como no WhatsApp de verdade: mensagens curtas, uma ideia por mensagem, português correto.

**Exclusion**

- CRÍTICO: abre direto com preço, tabela ou apresentação comercial, sem nenhuma menção ao que o lead contou.
- CRÍTICO: minimiza ou ironiza o incômodo ("isso é bem simples", "nem é tão grave") - invalida a vergonha que ele acabou de admitir.
- menor: acolhimento só de fórmula ("Olá! Tudo bem?") sem referência ao caso.
- menor: um bloco único de texto longo, ou erros de português recorrentes.

### `descoberta_e_qualificacao` — Descoberta e qualificação · peso 20

**Inclusion**

(1) Faz pelo menos uma pergunta sobre o caso antes de falar em tratamento ou valor - desde quando, se é um dente ou mais, se já tratou esse dente, se há dor.
(2) Faz pelo menos uma pergunta sobre o que a pessoa quer ou sobre o momento dela - o resultado que procura, o que a fez procurar agora.
(3) Pergunta pouco de cada vez - no máximo duas ou três perguntas por mensagem -, como conversa e não como formulário.
(4) Diz por que está perguntando: o caminho e o valor dependem do caso.

**Exclusion**

- CRÍTICO: nenhuma pergunta sobre o caso - responde e convida sem saber o que a pessoa tem.
- CRÍTICO: diagnostica pelo chat ("isso é canal", "clareamento resolve") - o diagnóstico é do dentista, na avaliação.
- menor: um questionário longo de uma vez só.

### `conducao_ao_agendamento` — Condução ao agendamento · peso 15

**Inclusion**

(1) Na parte (a), não foge da pergunta do preço: dá uma referência (faixa, "a partir de", o valor da avaliação) ou explica de forma direta por que o valor depende do caso - e diz quando a pessoa vai saber o valor exato. Usar marcador no lugar do número ("[valor]", "a partir de R$ X") é aceitável: o candidato não conhece a tabela.
(2) Liga a avaliação ao que a pessoa quer resolver - o que a avaliação vai responder para ela -, e não a apresenta como formalidade.
(3) A parte (a) termina com um próximo passo concreto: duas ou três opções de dia e horário, ou uma pergunta que pede resposta.

**Exclusion**

- CRÍTICO: promete resultado ("vai ficar branquinho", "resolve em uma sessão") ou fecha o preço do tratamento pelo chat.
- CRÍTICO: a parte (a) termina sem próximo passo ("qualquer dúvida, estou à disposição", "quando quiser, é só chamar").
- menor: texto longo sobre técnica ou diferenciais antes de qualquer pergunta ou proposta de horário.
- menor: pergunta "quando você pode?" em vez de oferecer horários.
- menor: pede CPF, documento ou histórico de saúde pelo chat no primeiro contato.

### `cadencia_de_follow_up` — Cadência de follow-up · peso 25

**Inclusion**

(1) Na parte (b), distribui mais de um contato pelos 7 dias, espaçados - não todos no mesmo dia, nem um só.
(2) Usa pelo menos dois canais diferentes (mensagem, áudio, ligação, Instagram).
(3) Cada contato traz algo novo - retoma o que o lead contou, um conteúdo ou depoimento ligado à queixa dele, uma pergunta fácil de responder - em vez de repetir "ainda tem interesse?".
(4) Pelo menos um contato propõe dia e horário concretos.
(5) A cadência tem fim: uma última mensagem que encerra com respeito e deixa a porta aberta, com o registro no CRM.

**Exclusion**

- CRÍTICO: pressão ou escassez falsa ("só hoje", "últimas vagas", "o preço vai subir").
- CRÍTICO: um único contato, ou desiste depois da primeira tentativa.
- menor: os contatos repetem a mesma mensagem com outras palavras.
- menor: mensagem todo dia, sem nada novo, até virar insistência.
- menor: diz quando vai chamar, mas não o que vai dizer.

### `contorno_de_objecao` — Contorno de objeção · peso 25

**Inclusion**

(1) Na parte (c), acolhe a objeção sem discutir nem se defender: reconhece que o preço pesa na decisão.
(2) Pergunta antes de rebater - o que a outra clínica ofereceu, o que está incluído, o que pesa mais para ele.
(3) Diferencia sem falar mal da outra clínica: diz o que muda no atendimento da Beauty Smile (laser, sem dor, avaliação do caso), ligado ao que ele contou.
(4) Devolve a decisão para a avaliação - o valor certo depende do caso - e termina com um próximo passo concreto.

**Exclusion**

- CRÍTICO: fala mal da outra clínica, ou diz que o tratamento mais barato é perigoso sem saber nada dele.
- CRÍTICO: oferece desconto ou condição comercial que não caberia a ele autorizar, para empatar o preço.
- menor: aceita a objeção e encerra ("entendo, fico à disposição").
- menor: rebate com uma lista de diferenciais sem perguntar nada.


## Diferenças em relação à vaga anterior
<!-- gerado: comparacao por script com o banco — nao editar a mao -->

| Campo | |
|---|---|
| `titulo` | igual |
| `subtitulo` | igual |
| `descricao_curta` | igual |
| `jornada_trabalho` | igual |
| `sobre_cargo` | **mudou** |
| `responsabilidades` | igual |
| `requisitos_formacao` | igual |
| `requisitos_experiencia` | igual |
| `requisitos_tecnicos` | igual |
| `requisitos_habilidades` | igual |
| `diferenciais` | igual |
| `beneficios` | **mudou** |
| `sobre_empresa` | igual |
| `perfil_ideal` | **mudou** |
| `secoes_extras` | **mudou** — antes vazio; agora «Conheça a Beauty Smile» |
| `pesos_avaliacao` | **mudou** (a triagem não pondera no score final; sem redação, o composto fica ~53% teste situacional · ~47% entrevista) — 25/15/25/35 → 25/40/0/35 (triagem/sjt/redação/entrevista) |
| `testes_aplicaveis` | **mudou** |
| `rubrica_ia` | igual |
| perguntas | iguais (extraídas do banco) |
