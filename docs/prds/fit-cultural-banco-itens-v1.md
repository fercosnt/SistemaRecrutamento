# Banco de Itens — Teste de Fit Cultural Beauty Smile v1.0

> **Status:** v1.0 — primeira versão do banco operacional (25 itens), gerada a partir de `CULTURA-BEAUTY-SMILE-INPUT.md` e do mini-PRD `fit-cultural-prd.md`.
> **Data:** abril/2026.
> **Owners:** RH Beauty Smile (validação de conteúdo) + Tech (implementação + anti-viés).
> **Referência cruzada:** PRD-MASTER §10.4 (eliminatório com revisão humana); `fit-cultural-prd.md` §5-§7 (formato híbrido + cálculo de score).
> **Escopo:** avaliação **comportamental** (nunca "teste psicológico" — RNF-12a do PRD-MASTER). Instrumento próprio, não-SATEPSI, não exige CFP.

---

## 1. Sumário e Princípio Ético Fundante

### 1.1 Os 4 valores oficiais Beauty Smile

1. **Experiência UAU** — "Cada interação é memorável ou não conta."
2. **Inovação** — "Inconformados com o 'sempre foi assim'."
3. **Atitude de Dono** — "Vê o problema, resolve o problema."
4. **Sede de Crescimento** — "Hoje melhor que ontem, sempre."

### 1.2 Ética como princípio inegociável **acima** dos 4 valores

Conforme Manual de Cultura BS: *"valores acima de qualquer pessoa — inclusive dos fundadores"*. Nenhum dos 4 valores justifica violação ética. Uma única violação ética gera desligamento imediato. No teste, itens marcados como **red flag eliminatório** sinalizam badge vermelho no kanban RH com **justificativa textual obrigatória antes de rejeição** (RNF-07a + Art. 20 LGPD — revisão humana sempre obrigatória).

**Red flags cobertos neste banco:**
- Mentir para paciente (diagnóstico, resultado, prognóstico)
- Recomendar procedimento desnecessário por meta/comissão
- Esconder erro técnico próprio ou de colega
- Tirar vantagem de vulnerabilidade emocional
- Quebrar confidencialidade (prontuário, foto em rede social)
- Desqualificar publicamente a missão da empresa

### 1.3 Distribuição dos 25 itens

| Dimensão | Qtd | IDs |
|---|---|---|
| Experiência UAU | 6 | FC-V1-001 a FC-V1-006 |
| Atitude de Dono | 5 | FC-V1-007 a FC-V1-011 |
| Inovação | 4 | FC-V1-012 a FC-V1-015 |
| Sede de Crescimento | 4 | FC-V1-016 a FC-V1-019 |
| Dilemas Éticos | 4 | FC-V1-020 a FC-V1-023 |
| Red Flag puro (detecção eliminatória) | 2 | FC-V1-024 a FC-V1-025 |
| **Total** | **25** |  |

**Formato híbrido (distribuição por tipo):**

| Tipo | Qtd | IDs |
|---|---|---|
| SJT (Situational Judgment Test) | 12 | 001, 003, 005, 007, 009, 011, 012, 014, 016, 020, 022, 024 |
| Likert 1-5 | 10 | 002, 004, 006, 008, 010, 013, 015, 017, 019, 025 |
| Ranking | 3 | 018, 021, 023 |

### 1.4 Chave de interpretação da "chave de pontuação"

- **SJT:** cada alternativa mapeia para uma dimensão (ou para "desalinhada" / "ética"). Candidato marca "mais alinhado" (+2 pts na dimensão) e "menos alinhado" (-1 pt na dimensão). Alternativas com peso **negativo na dimensão Ética** (ex: desumanização, mentira, omissão de erro) são **red flag se escolhidas como "mais alinhado"**.
- **Likert:** afirmação + escala 1 (discordo totalmente) a 5 (concordo totalmente). `reverso=true` indica item de controle — score invertido na soma (detecta straightlining).
- **Ranking:** candidato ordena 4 afirmações por identificação pessoal. 1º lugar = 3 pts; 2º = 2 pts; 3º = 1 pt; 4º = 0 pts, somados à dimensão correspondente.

---

## 2. Banco de Itens

---

### FC-V1-001 — Paciente atrasado 25 minutos

- **Dimensão primária:** Experiência UAU
- **Dimensão secundária:** Atitude de Dono
- **Formato:** SJT
- **Cenário:**

> Um paciente chega para uma limpeza a laser **25 minutos atrasado**. Se você atendê-lo agora, todo o resto da agenda do dia atrasa. Ele explica que pegou um trânsito absurdo na Marginal e pede desculpas várias vezes. Qual das ações abaixo **mais se parece** com o que você faria, e qual **menos se parece**?

- **Alternativas:**
  - (a) Acolho com empatia, explico a situação da agenda, verifico se dá para encaixar ao final do dia ou no próximo horário livre e combino com ele sem humilhá-lo.
  - (b) Comunico de forma direta que o horário é sagrado e reagendo para manter a pontualidade com os próximos pacientes. Se ele reclamar, mostro a política.
  - (c) Atendo rapidinho mesmo, cortando alguns passos da limpeza, porque o paciente veio até aqui e ficar sem atender é constrangedor.
  - (d) Digo a ele que "da próxima vez precisa chegar no horário" e sigo com a agenda; o atraso foi culpa dele.

- **Chave de pontuação:**
  - (a) +2 UAU, +1 Atitude de Dono — acolhe + resolve + mantém padrão com quem está chegando pontual.
  - (b) 0 UAU — cumpre regra mas sem calor humano; aceitável como "menos alinhado" de quem tem perfil UAU alto.
  - (c) -2 UAU, -1 Ética leve — comprometer padrão técnico para agradar é desalinhado; pode violar qualidade do procedimento.
  - (d) -2 UAU — humilha paciente; anti-exemplo explícito da cultura ("da próxima vez chegue no horário" citado no documento-fonte como violação).

- **Flag eliminatório:** não (nenhuma alternativa é red flag puro, mas (d) sinaliza **alerta de UAU crítico** para cargos com contato direto — recepcionista/dentista/auxiliar).
- **Rationale:** mede a tensão real entre UAU (acolher o atrasado) e respeito ao próximo paciente pontual. Distingue o candidato que trata o paciente como problema do que trata a situação como problema a resolver junto.

---

### FC-V1-002 — Afirmação sobre antecipação de necessidades

- **Dimensão primária:** Experiência UAU
- **Formato:** Likert 1-5
- **Afirmação:**

> "Prefiro perceber que a paciente está tensa e oferecer água ou ajustar a música antes que ela peça, do que esperar ela sinalizar para agir."

- **Chave de pontuação:**
  - 5 → +2 UAU
  - 4 → +1 UAU
  - 3 → 0
  - 2 → -1 UAU
  - 1 → -2 UAU
- **Reverso:** não
- **Flag eliminatório:** não
- **Rationale:** mede o comportamento de antecipação (nuclear no valor UAU — "experiência só termina quando o paciente sai sentindo que foi genuinamente cuidado") vs. reatividade a pedido.

---

### FC-V1-003 — Paciente chora na cadeira antes do procedimento

- **Dimensão primária:** Experiência UAU
- **Dimensão secundária:** Ética (cuidado com vulnerabilidade)
- **Formato:** SJT
- **Cenário:**

> Uma paciente senta na cadeira para uma avaliação e, antes do dentista encostar, **começa a chorar** relatando trauma com dentista na infância. O próximo paciente chega em 20 minutos. O que você faz?

- **Alternativas:**
  - (a) Paro tudo, sento ao lado, escuto o tempo que for necessário, valido o medo dela e remarco se precisar — mesmo que atrase o próximo paciente.
  - (b) Falo "vai passar, é rapidinho, nem dói" e sigo com a avaliação para manter a agenda.
  - (c) Chamo o dentista imediatamente para ele decidir, enquanto pego um copo d'água e aguardo em silêncio ao lado dela.
  - (d) Explico de forma técnica cada passo do que vai acontecer para ela se tranquilizar com a informação, e sigo com a avaliação se ela concordar.

- **Chave de pontuação:**
  - (a) +2 UAU — comportamento exemplar documentado (parar e escutar).
  - (b) -2 UAU, **alerta Ética** — "vai passar, é rapidinho" é anti-exemplo literal do documento-fonte; desconsidera vulnerabilidade emocional.
  - (c) +1 UAU, +1 Atitude de Dono — acolhe e escala adequadamente; aceitável.
  - (d) 0 UAU — tecnicamente correto mas frio; desalinhado com "dentista de gente, não de dente".

- **Flag eliminatório:** **sim, se (b) escolhida como "mais alinhado"** — desumaniza paciente em situação de vulnerabilidade (conecta com red flag #4 do doc-fonte). Gera badge vermelho + revisão humana obrigatória.
- **Rationale:** cenário real extraído do documento-fonte ("paciente começa a chorar na cadeira"). Testa a tensão entre agenda e escuta — pilar do modelo Beauty Smile (caso Dona Luzia, 40 minutos de escuta).

---

### FC-V1-004 — Afirmação sobre script vs. personalização

- **Dimensão primária:** Experiência UAU
- **Formato:** Likert 1-5
- **Afirmação:**

> "Quando o paciente já demonstrou uma preocupação específica, prefiro adaptar minha conversa com ele mesmo que isso me faça sair do roteiro de atendimento."

- **Chave de pontuação:** 5 → +2 UAU; 4 → +1; 3 → 0; 2 → -1; 1 → -2 UAU
- **Reverso:** não
- **Flag eliminatório:** não
- **Rationale:** contrasta script decorado (anti-exemplo explícito) com escuta ativa e personalização. Afirmação sensível a candidato que "segue processo" rigidamente sem calibrar ao humano à frente.

---

### FC-V1-005 — Paciente liga sábado à noite em pânico

- **Dimensão primária:** Experiência UAU
- **Dimensão secundária:** Atitude de Dono
- **Formato:** SJT
- **Cenário:**

> É **sábado à noite**, você está em casa descansando, e um paciente da clínica te liga (seu contato ficou com ele por conta de um procedimento recente). Ele está em pânico porque o curativo saiu e teme complicação. O que você faz?

- **Alternativas:**
  - (a) Atendo na hora, tranquilizo, oriento passo a passo o que fazer até segunda, combino um contato no domingo de manhã e aviso o dentista responsável por WhatsApp.
  - (b) Respondo que o horário comercial é segunda pela manhã, oriento ele a procurar um pronto-socorro se piorar e desligo.
  - (c) Não atendo — é fim de semana, tenho direito ao descanso. Retorno na segunda.
  - (d) Atendo, escuto, mas digo que não sei orientar por telefone e peço para ele esperar a segunda ou ir a um PA particular.

- **Chave de pontuação:**
  - (a) +2 UAU, +2 Atitude de Dono — comportamento exemplar literal do documento-fonte.
  - (b) -1 UAU — anti-exemplo direto do doc ("ligue na segunda no horário comercial").
  - (c) -2 UAU, -2 Atitude de Dono — violação explícita da cultura.
  - (d) -1 UAU — atende fisicamente mas abandona operacionalmente.

- **Flag eliminatório:** não (mas (c) como "mais alinhado" indica **gap crítico UAU + Dono** para qualquer cargo com contato com paciente).
- **Rationale:** caso crítico do documento-fonte. Mede compromisso genuíno com a missão ("cruzado", não "funcionário") vs. mentalidade de horário comercial.

---

### FC-V1-006 — Afirmação sobre protagonismo na experiência do paciente

- **Dimensão primária:** Experiência UAU
- **Formato:** Likert 1-5
- **Afirmação:**

> "O paciente lembrar do meu nome depois do atendimento é um indicador importante para mim de que fiz um bom trabalho."

- **Chave de pontuação:** 5 → +2 UAU; 4 → +1; 3 → 0; 2 → -1; 1 → -2 UAU
- **Reverso:** não
- **Flag eliminatório:** não
- **Rationale:** mede conexão pessoal com o paciente — o documento-fonte destaca "reviews nominais" e "paciente lembra do profissional por nome" como indicador cultural forte. Candidato com score baixo aqui tende ao modelo transacional.

---

### FC-V1-007 — Material acabou no meio do expediente

- **Dimensão primária:** Atitude de Dono
- **Formato:** SJT
- **Cenário:**

> No meio do expediente, você percebe que **acabou a ponta descartável do laser** que seria usada na próxima cirurgia, daqui a 40 minutos. Não é sua função repor estoque. O que você faz?

- **Alternativas:**
  - (a) Ligo imediatamente para outra unidade ou para o fornecedor para ver se consigo solução em 40 minutos; paralelamente aviso a coordenação. Se não rolar, ajudo a reagendar com transparência com o paciente.
  - (b) Aviso a coordenação por escrito e espero eles resolverem — já é função deles.
  - (c) Deixo na gaveta com um post-it "acabou" e vou almoçar; quem reabastece que veja depois.
  - (d) Peço ao paciente para remarcar e justifico "problema técnico" sem explicar a causa — assim evito desgaste.

- **Chave de pontuação:**
  - (a) +2 Atitude de Dono, +1 UAU — resolve + comunica com transparência.
  - (b) -1 Atitude de Dono — delega sem agir; viola "vê o problema, resolve o problema".
  - (c) -2 Atitude de Dono — anti-exemplo direto do documento.
  - (d) -1 Atitude de Dono, -1 UAU, **alerta Ética leve** — mentir sobre causa ("problema técnico") contorna a situação; baixo alinhamento.

- **Flag eliminatório:** **sim, se (d) escolhida como "mais alinhado"** em cargos com contato direto — roça o red flag #1 (mentir ao paciente). Badge vermelho, revisão humana.
- **Rationale:** cenário explícito do documento-fonte. Mede se candidato age como dono ("corre atrás") ou como executor de escopo.

---

### FC-V1-008 — Afirmação sobre "não é minha função"

- **Dimensão primária:** Atitude de Dono
- **Formato:** Likert 1-5 **(reverso)**
- **Afirmação:**

> "Se algo que preciso ser resolvido na clínica não está na minha descrição de cargo, eu não devo me envolver — isso evita confusão de responsabilidades."

- **Chave de pontuação (REVERSO):**
  - 1 → +2 Atitude de Dono
  - 2 → +1
  - 3 → 0
  - 4 → -1
  - 5 → -2 Atitude de Dono
- **Reverso:** sim (discordar é o alinhado)
- **Flag eliminatório:** não
- **Rationale:** captura direto a expressão anti-cultura "não é minha função" (citada literalmente no documento). Item reverso também serve como detector de straightlining (candidato que marca 5 em tudo).

---

### FC-V1-009 — Review negativo online

- **Dimensão primária:** Atitude de Dono
- **Dimensão secundária:** Sede de Crescimento
- **Formato:** SJT
- **Cenário:**

> Em uma segunda de manhã, você vê um **review negativo online** de uma paciente que atendeu semana passada. Ela reclama do tempo de espera e da sensação de ter sido "mais um número". Você é auxiliar / recepcionista / dentista do caso. O que faz?

- **Alternativas:**
  - (a) Levo para a reunião semanal de cultura com análise da causa-raiz (por que ela se sentiu "um número"?) e uma proposta concreta para evitar recorrência.
  - (b) Respondo o review com pedido de desculpas padrão, entro em contato individual com a paciente e ofereço retorno.
  - (c) Não faço nada — review é problema do marketing / comunicação, não meu.
  - (d) Comento no grupo da equipe que a paciente "é daquelas difíceis mesmo" e sigo o dia normal.

- **Chave de pontuação:**
  - (a) +2 Atitude de Dono, +1 Sede de Crescimento — comportamento exemplar literal.
  - (b) +1 UAU — resolve o caso individual mas não a causa.
  - (c) -2 Atitude de Dono — anti-exemplo ("problema do marketing").
  - (d) -2 Atitude de Dono, -1 UAU, **alerta Ética leve** — culpa o paciente em vez de investigar.

- **Flag eliminatório:** não (mas (d) sinaliza **desumanização + defensividade**, gap UAU+Dono+Crescimento).
- **Rationale:** documento-fonte cita "review negativo como termômetro pessoal" do valor Atitude de Dono. Mede se candidato se apropria do feedback ou terceiriza.

---

### FC-V1-010 — Afirmação sobre responsabilidade coletiva

- **Dimensão primária:** Atitude de Dono
- **Formato:** Likert 1-5
- **Afirmação:**

> "Na reunião de equipe, prefiro conversar sobre 'como a gente resolve isso' do que identificar quem errou."

- **Chave de pontuação:** 5 → +2 Atitude de Dono; 4 → +1; 3 → 0; 2 → -1; 1 → -2
- **Reverso:** não
- **Flag eliminatório:** não
- **Rationale:** extraído dos anti-exemplos do doc-fonte (linguagem de culpa vs. linguagem de solução). Mede mentalidade de time vs. CYA ("cover your ass").

---

### FC-V1-011 — Colega sobrecarregado em outra área

- **Dimensão primária:** Atitude de Dono
- **Dimensão secundária:** Experiência UAU
- **Formato:** SJT
- **Cenário:**

> Você é **recepcionista** e sua fila está curta no momento. Você percebe que a colega do financeiro está sozinha e acumulando ligações de pacientes irritados com cobrança. O clima na sala de espera começa a ficar tenso. Ajudar significa sair da sua função. O que faz?

- **Alternativas:**
  - (a) Avalio o que consigo ajudar agora (por ex., triar ligações, acalmar pacientes presencialmente) sem atrapalhar o financeiro, comunico brevemente à coordenação e retomo minha função quando a onda passar.
  - (b) Aviso a coordenação que o financeiro está afogado e aguardo instrução.
  - (c) Foco no que é meu — o problema dela é com a gestão. Se eu entrar e errar, piora.
  - (d) Comento com outro colega "a Fulana não dá conta mesmo" e continuo na tela do Instagram da clínica.

- **Chave de pontuação:**
  - (a) +2 Atitude de Dono, +1 UAU — exatamente o comportamento do Dilema 3 do documento-fonte.
  - (b) 0 — cumpre o protocolo mas sem iniciativa.
  - (c) -1 Atitude de Dono — defensivo; "não é minha função" com racionalização.
  - (d) -2 Atitude de Dono, -1 Ética leve — anti-exemplo direto.

- **Flag eliminatório:** não.
- **Rationale:** testa o Dilema 3 do documento-fonte diretamente. Distingue perfil que opera "em silo" do perfil "dono da clínica".

---

### FC-V1-012 — Dentista novo propõe ajuste de protocolo

- **Dimensão primária:** Inovação
- **Dimensão secundária:** Sede de Crescimento
- **Formato:** SJT
- **Cenário:**

> Um dentista **recém-contratado** propõe um ajuste no protocolo de anestesia que ele aprendeu em um congresso internacional recente. O protocolo atual foi validado pelo Dr. Fernando Neto há 2 anos. Você é colega dele (outro dentista, coordenador ou auxiliar). O que você faz?

- **Alternativas:**
  - (a) Escuto a proposta, peço as referências do congresso e um caso de uso claro, e sugiro testar em escala pequena antes de mudar protocolo — levo à coordenação com dados.
  - (b) Respondo "quem é você pra mudar o que o Fernando Neto validou" e descarto sem avaliar.
  - (c) Encaminho direto ao Fernando Neto sem comentar, para ele decidir; não me posiciono.
  - (d) Concordo imediatamente e começo a usar o novo protocolo a partir de hoje no meu paciente.

- **Chave de pontuação:**
  - (a) +2 Inovação, +1 Sede de Crescimento — comportamento exemplar direto.
  - (b) -2 Inovação — anti-exemplo literal do documento-fonte.
  - (c) -1 Inovação — evita conflito, delega sem avaliar.
  - (d) -1 Inovação — adoção sem critério; rompe disciplina de teste que a cultura preza ("inovação com dado").

- **Flag eliminatório:** não (mas (b) indica resistência cultural estrutural a mudança).
- **Rationale:** cenário literal do documento-fonte. Mede abertura a inovação vs. defesa de hierarquia. Distingue também de adoção desgovernada (alternativa d).

---

### FC-V1-013 — Afirmação sobre "sempre foi assim"

- **Dimensão primária:** Inovação
- **Formato:** Likert 1-5 **(reverso)**
- **Afirmação:**

> "Quando um processo vem sendo feito da mesma forma há anos e funciona, o mais prudente é não mexer."

- **Chave de pontuação (REVERSO):**
  - 1 → +2 Inovação
  - 2 → +1
  - 3 → 0
  - 4 → -1
  - 5 → -2 Inovação
- **Reverso:** sim
- **Flag eliminatório:** não
- **Rationale:** captura direto a postura "sempre fizemos assim" listada como anti-exemplo. Reverso também atua como controle de qualidade de resposta.

---

### FC-V1-014 — Paciente questiona "por que pagar caro pelo laser"

- **Dimensão primária:** Inovação
- **Dimensão secundária:** Experiência UAU
- **Formato:** SJT
- **Cenário:**

> Durante a consulta, a paciente questiona: *"Por que eu preciso pagar mais caro por endodontia a laser se meu dentista antigo fazia a endodontia convencional e funcionava?"* Você é o profissional do atendimento. O que responde?

- **Alternativas:**
  - (a) Explico com domínio científico as diferenças concretas (eliminação bacteriana, redução de recidiva, recuperação mais rápida) e mostro que ela tem liberdade para escolher — inclusive fora da clínica.
  - (b) Respondo que "é a tecnologia mais moderna, é melhor" sem detalhar o porquê.
  - (c) Digo a ela que "quem já usou nunca mais quer o tradicional" e mostro depoimentos.
  - (d) Falo que "o Dr. Fernando Neto desenvolveu o protocolo, então é o que a gente indica aqui".

- **Chave de pontuação:**
  - (a) +2 Inovação, +2 UAU, +1 Ética — domínio técnico + liberdade de escolha.
  - (b) -2 Inovação — anti-exemplo literal ("tecnologia mais moderna sem substância").
  - (c) 0 Inovação, -1 Ética leve — argumento de autoridade sem base técnica.
  - (d) -1 Inovação — delega à figura do fundador em vez de dominar o tema.

- **Flag eliminatório:** não.
- **Rationale:** cenário literal do doc-fonte. Inovação na BS é "mentalidade, não equipamento" — mede se o profissional sabe explicar, não só operar o botão.

---

### FC-V1-015 — Afirmação sobre estudo por conta própria

- **Dimensão primária:** Inovação
- **Dimensão secundária:** Sede de Crescimento
- **Formato:** Likert 1-5
- **Afirmação:**

> "Nos últimos 12 meses, eu assisti pelo menos um congresso, webinar ou curso na minha área por iniciativa própria (não pago/exigido pela empresa)."

- **Chave de pontuação:**
  - 5 → +2 Inovação, +1 Sede de Crescimento
  - 4 → +1 Inovação
  - 3 → 0
  - 2 → -1 Sede de Crescimento
  - 1 → -2 Sede de Crescimento
- **Reverso:** não
- **Flag eliminatório:** não (mas score 1 é sinal amarelo forte em cargos de dentista/coordenador/gestor).
- **Rationale:** comportamento observável direto — não é preferência, é fato declarado. Mais resistente a social desirability porque exige um evento concreto.

---

### FC-V1-016 — Feedback 30 dias abaixo do esperado

- **Dimensão primária:** Sede de Crescimento
- **Formato:** SJT
- **Cenário:**

> No check-in dos 30 dias, seu gestor te dá um **feedback crítico**: sua avaliação de atendimento ao paciente está abaixo do esperado — especificamente, em três casos você foi percebida como "técnica demais, pouco acolhedora". O que faz?

- **Alternativas:**
  - (a) Peço detalhes dos três casos, marco acompanhamento com mentor, testo ajustes concretos nos próximos 15 dias e peço para validar na próxima 1:1.
  - (b) Escuto, reflito sozinha em casa e tento "melhorar" sem plano estruturado — daqui a 30 dias na próxima avaliação a gente vê.
  - (c) Argumento que esses três casos foram contexto específico (pacientes difíceis, agenda corrida) e que a avaliação não captura bem minha performance global.
  - (d) Aceito sem questionar, não peço detalhes e penso em me candidatar para outra vaga interna onde talvez o perfil se ajuste melhor.

- **Chave de pontuação:**
  - (a) +2 Sede de Crescimento, +1 Atitude de Dono — comportamento exemplar literal.
  - (b) 0 — aceita mas sem disciplina de acompanhamento.
  - (c) -2 Sede de Crescimento — defensividade a feedback (anti-exemplo literal).
  - (d) -1 Sede de Crescimento — evita o crescimento trocando de contexto.

- **Flag eliminatório:** não (mas (c) indica **perfil defensivo** incompatível com cultura BS).
- **Rationale:** cenário literal do documento-fonte. Mede reação a feedback — o pilar operacional de "Sede de Crescimento".

---

### FC-V1-017 — Afirmação sobre pedir feedback proativamente

- **Dimensão primária:** Sede de Crescimento
- **Formato:** Likert 1-5
- **Afirmação:**

> "Eu costumo pedir feedback ao meu gestor com perguntas específicas antes de ele me procurar, em vez de esperar a próxima avaliação formal."

- **Chave de pontuação:** 5 → +2 Sede de Crescimento; 4 → +1; 3 → 0; 2 → -1; 1 → -2
- **Reverso:** não
- **Flag eliminatório:** não
- **Rationale:** comportamento exemplar direto do documento-fonte — "pedir feedback proativo". Distingue sede genuína de "aceitar avaliação".

---

### FC-V1-018 — Ranking: o que mais te motiva no trabalho

- **Dimensão primária:** Sede de Crescimento
- **Dimensões secundárias:** UAU, Inovação, Atitude de Dono
- **Formato:** Ranking
- **Instrução:**

> Ordene de **1 (mais se parece com você)** a **4 (menos se parece com você)** as afirmações abaixo sobre o que te motiva no trabalho:

- **Alternativas:**
  - (α) *"Ver o paciente sair da clínica transformado — contando para amiga, voltando com família."* (UAU)
  - (β) *"Ter domínio técnico crescente, estar sempre um pouco à frente de onde eu estava 6 meses atrás."* (Sede de Crescimento)
  - (γ) *"Resolver problemas que aparecem no dia a dia antes que virem dor — ser a pessoa que faz acontecer."* (Atitude de Dono)
  - (δ) *"Experimentar formas novas de fazer as coisas, testar melhorias e propor mudanças."* (Inovação)

- **Chave de pontuação:**
  - 1º lugar → +3 na dimensão
  - 2º lugar → +2
  - 3º lugar → +1
  - 4º lugar → 0
- **Flag eliminatório:** não (todas são legítimas; mede hierarquia pessoal, não certo/errado).
- **Rationale:** ranking força trade-off entre os 4 valores. Útil para o `faixa_ideal_json` por cargo — ex: dentista deve ter (β) e (α) no topo; coordenador deve ter (γ) no topo; auxiliar/recepcionista deve ter (α) no topo.

---

### FC-V1-019 — Afirmação sobre compartilhar conhecimento

- **Dimensão primária:** Sede de Crescimento
- **Dimensão secundária:** Atitude de Dono
- **Formato:** Likert 1-5
- **Afirmação:**

> "Quando eu descubro uma técnica ou truque que funciona melhor, prefiro compartilhar com o time mesmo que isso faça colegas se igualarem a mim."

- **Chave de pontuação:** 5 → +2 Sede de Crescimento, +1 Atitude de Dono; 4 → +1; 3 → 0; 2 → -1; 1 → -2
- **Reverso:** não
- **Flag eliminatório:** não (mas score 1-2 é sinal de mentalidade de "guardar vantagem", anti-exemplo do doc).
- **Rationale:** captura o anti-exemplo "esconde técnica ou truque próprio dos colegas para manter vantagem interna". Mede mentalidade de crescimento coletivo.

---

### FC-V1-020 — Dilema ético: pressão de meta vs. paciente

- **Dimensão primária:** Ética
- **Dimensões secundárias:** UAU, Atitude de Dono
- **Formato:** SJT
- **Cenário (Dilema 1 do documento-fonte):**

> Você está no **penúltimo dia do mês**, dois tratamentos abaixo da meta (e sua comissão depende disso). Uma paciente chega querendo fazer clareamento a laser. Durante a avaliação você percebe: o dente dela está saudável e na tonalidade que ela mesma descreve como satisfatória. O "problema" é autopercepção estética depois de ver uma foto editada. Ela topa o tratamento. O que faz?

- **Alternativas:**
  - (a) Digo claramente: "do ponto de vista clínico, você não precisa; se quiser por questão estética, posso te mostrar o resultado esperado e o custo com honestidade — sem pressão."
  - (b) Vendo o clareamento — ela pediu, topou e vai pagar. É escolha dela.
  - (c) Não vendo agora, marco um retorno para semana que vem e espero o início do novo mês — aí a meta é zero de novo e posso oferecer com menos conflito de interesse.
  - (d) Ofereço um "tratamento mais leve" que também não é necessário, mas tem ticket menor — assim ajudo a meta sem "vender demais".

- **Chave de pontuação:**
  - (a) +2 Ética, +1 UAU — comportamento alinhado literal do doc-fonte.
  - (b) -2 Ética, **RED FLAG se escolhida como "mais alinhado"** — violação direta do red flag #2 (procedimento desnecessário por meta) + #4 (vulnerabilidade emocional — autopercepção).
  - (c) +1 Ética — contorna o conflito mas ainda planeja vender depois (meio-termo cinzento).
  - (d) -2 Ética, **RED FLAG se escolhida como "mais alinhado"** — variação mais sofisticada do red flag #2.

- **Flag eliminatório:** **sim** — (b) ou (d) como "mais alinhado" dispara badge vermelho + revisão humana obrigatória.
- **Rationale:** Dilema 1 literal do documento-fonte. Testa a hierarquia "Ética > Meta" em situação realista onde a tentação é alta. Item central do filtro eliminatório.

---

### FC-V1-021 — Ranking: prioridades em conflito

- **Dimensão primária:** Ética (hierarquia de valores)
- **Formato:** Ranking
- **Instrução:**

> Em um momento de pressão na clínica, você precisa **priorizar**. Ordene de **1 (prioridade mais alta)** a **4 (prioridade mais baixa)**:

- **Alternativas:**
  - (α) *"Cumprir a meta financeira do mês."*
  - (β) *"Garantir que o paciente receba exatamente o que ele precisa clinicamente — nem mais, nem menos."*
  - (γ) *"Evitar conflito com colegas seniores."*
  - (δ) *"Manter a agenda no horário estabelecido."*

- **Chave de pontuação:**
  - Ordem esperada culturalmente: β > δ > α > γ (paciente > pontualidade/compromisso > meta > paz hierárquica).
  - **β em 1º:** +3 Ética (+1 UAU)
  - **α em 1º:** -2 Ética, **alerta red flag** (meta acima do paciente — mesmo padrão conceitual do red flag #2).
  - **γ em 1º:** -2 Ética, **alerta red flag** (evitar conflito acima do paciente — mesmo padrão do Dilema 2: esconder erro de sênior).
- **Flag eliminatório:** **sim**, se α ou γ em 1º lugar → badge vermelho + revisão humana.
- **Rationale:** ranking força explicitação da hierarquia de valores. Candidato que põe paciente no topo está alinhado; candidato que põe meta ou paz hierárquica no topo expõe desalinhamento estrutural com o princípio ético da BS.

---

### FC-V1-022 — Dilema ético: erro do dentista sênior

- **Dimensão primária:** Ética
- **Dimensão secundária:** Atitude de Dono
- **Formato:** SJT
- **Cenário (Dilema 2 do documento-fonte):**

> Você é **auxiliar** e, durante uma cirurgia em andamento, percebe que o dentista sênior (respeitado, com quem você trabalha há 3 meses) está prestes a usar uma ponta de laser que você acredita **não ter passado pelo ciclo completo de esterilização** do dia — pode ter pegado a errada da bandeja. A cirurgia está acontecendo. O que faz?

- **Alternativas:**
  - (a) Interrompo imediata e educadamente: "Desculpa, doutor, acho que essa ponta não é a do ciclo de hoje, posso conferir antes?"
  - (b) Fico quieta — ele é muito mais experiente do que eu, deve ter visto e decidido que estava ok.
  - (c) Faço sinal sutil para outro auxiliar no canto da sala para ele notar e falar, já que é homem e mais antigo de casa.
  - (d) Anoto mentalmente e, no fim do procedimento, comento com ele em particular que "achei estranho, mas deve ter sido impressão minha".

- **Chave de pontuação:**
  - (a) +2 Ética, +2 Atitude de Dono — comportamento alinhado literal do doc ("interromper educada e imediatamente").
  - (b) -2 Ética, **RED FLAG se escolhida como "mais alinhado"** — omissão diante de risco ao paciente (red flag #9 — negligência). Autorizado pela hierarquia ("valores acima dos fundadores") a agir.
  - (c) -1 Ética — delega a coragem de falar a outro, o risco ao paciente continua.
  - (d) -2 Ética, **RED FLAG se "mais alinhado"** — relativiza em vez de prevenir; o erro pode já ter acontecido.

- **Flag eliminatório:** **sim** — (b) ou (d) como "mais alinhado" → badge vermelho + revisão humana. Especialmente crítico para cargos clínicos.
- **Rationale:** Dilema 2 literal do documento-fonte. Testa a tensão "hierarquia vs. paciente" e valida que o candidato entendeu que "valores acima de qualquer pessoa — inclusive dos fundadores".

---

### FC-V1-023 — Ranking: valores declarados

- **Dimensão primária:** Ética (triangulação com os 4 valores)
- **Formato:** Ranking
- **Instrução:**

> Entre as frases abaixo, **ordene de 1 (mais se parece com você) a 4 (menos se parece com você)**:

- **Alternativas:**
  - (α) *"Prefiro dizer a verdade desconfortável ao paciente do que uma resposta fácil que ele queira ouvir."* (Ética + UAU)
  - (β) *"Sinto responsabilidade real pela reputação da clínica, como se o nome estivesse na minha carteira."* (Atitude de Dono)
  - (γ) *"Estou inconformado com processos que 'sempre foram assim' mesmo quando funcionam razoavelmente."* (Inovação)
  - (δ) *"Uma empresa boa precisa ser eficiente — metas e resultados acima de tudo."* (Desalinhado — meta acima de paciente)

- **Chave de pontuação:**
  - (α) ou (β) em 1º → +3 na dimensão correspondente
  - (γ) em 1º ou 2º → +2 ou +3 Inovação
  - (δ) em 1º → -2 Ética, **alerta red flag** (padrão conceitual do red flag #2 — meta acima de tudo).
  - (δ) em 4º → +1 Ética (saudável).
- **Flag eliminatório:** **sim**, se (δ) em 1º lugar → badge vermelho + revisão humana.
- **Rationale:** ranking com um "distrator desalinhado" (δ) que parece razoável em discurso corporativo genérico mas viola o princípio BS. Separa candidato autêntico de quem responde "o que parece bonito".

---

### FC-V1-024 — Red flag puro: fotos de paciente em rede social

- **Dimensão primária:** Red Flag (confidencialidade)
- **Formato:** SJT
- **Cenário:**

> Uma paciente fez um tratamento com resultado **espetacular** — antes/depois impressionante. Ela está radiante. Você tira uma foto do sorriso dela (com o celular, no momento do atendimento). O que faz com a foto?

- **Alternativas:**
  - (a) Pergunto formalmente por escrito (ou via termo) se ela autoriza uso na comunicação da clínica; se sim, encaminho à equipe de marketing com a autorização. Sem autorização, **não uso em lugar nenhum** — nem no meu perfil pessoal.
  - (b) Publico no meu Instagram pessoal "orgulho do meu trabalho" sem citar o nome dela — afinal, é meu portfólio profissional.
  - (c) Envio no grupo de WhatsApp da equipe "olha que lindo o caso!" — é um grupo interno, não vaza.
  - (d) Subo no stories da clínica mesmo sem autorização formal — foi ela que abriu o sorriso, implicitamente autorizou.

- **Chave de pontuação:**
  - (a) +2 Ética — comportamento correto + dentro da LGPD + Código de Ética Odontológica.
  - (b) **RED FLAG EXPLÍCITO** — violação direta do red flag #5 (quebrar confidencialidade, foto em rede social sem autorização).
  - (c) -2 Ética, **alerta red flag** — grupo de equipe ainda é vazamento de dado clínico sem autorização; zona cinzenta perigosa.
  - (d) **RED FLAG EXPLÍCITO** — violação direta do red flag #5 + presunção de consentimento.

- **Flag eliminatório:** **sim** — (b) ou (d) como "mais alinhado" → badge vermelho + revisão humana. Candidato que vê (c) como OK também recebe alerta (interpretação elástica de confidencialidade).
- **Rationale:** red flag puro e objetivo — testa diretamente a compreensão de que confidencialidade e imagem de paciente não são negociáveis, independente de "não ter má intenção".

---

### FC-V1-025 — Afirmação sobre mentir para fechar venda

- **Dimensão primária:** Red Flag (honestidade com paciente)
- **Formato:** Likert 1-5 **(reverso)**
- **Afirmação:**

> "Em algumas situações de fechamento, omitir um detalhe menos positivo do tratamento é aceitável para não assustar o paciente e perder a venda."

- **Chave de pontuação (REVERSO):**
  - 1 → +2 Ética — discordar totalmente é o alinhado.
  - 2 → +1
  - 3 → -1 Ética, **alerta** — ambiguidade ética é sinal de risco.
  - 4 → -2 Ética, **RED FLAG** — concorda com omissão estratégica.
  - 5 → **RED FLAG EXPLÍCITO** — concorda totalmente com mentir/omitir para vender (red flag #1 + #4).

- **Reverso:** sim
- **Flag eliminatório:** **sim**, se resposta 4 ou 5 → badge vermelho + revisão humana obrigatória.
- **Rationale:** red flag puro em formato Likert. É o item mais "frontal" do banco e captura candidato que, pressionado, relativiza honestidade com paciente — violação direta do red flag #1 ("mentir para o paciente sobre diagnóstico, resultado esperado, tempo de recuperação, custo final ou urgência"). Item curto, difícil de "responder certo" por acidente.

---

## 3. Calibração por cargo — `faixa_ideal_json`

Abaixo, os vetores-alvo (score por dimensão, 0-100 após normalização) para cada cargo, derivados da tabela de pesos do documento-fonte. Esses valores servem de `vetor_ideal` no campo `vaga_testes_aplicaveis.faixa_ideal_json` (estrutura definida em `fit-cultural-prd.md` §7.2).

### 3.1 Tabela-base (pesos do documento-fonte × 10 = score alvo 0-100)

| Cargo | UAU | Inovação | Atitude de Dono | Sede de Crescimento |
|---|---|---|---|---|
| Dentista | 100 | 100 | 90 | 100 |
| Auxiliar de saúde bucal | 100 | 70 | 100 | 90 |
| Recepcionista | 100 | 60 | 100 | 90 |
| Coordenador de clínica | 90 | 90 | 100 | 100 |
| Gestor regional | 80 | 100 | 100 | 100 |

> **Nota sobre escala:** os pesos 1-10 do documento-fonte descrevem o "peso relativo do valor para o cargo", não o score mínimo aceitável. Na prática, adotamos `vetor_ideal = peso × 10` como alvo; a faixa aceitável `[min, max]` é calibrada em ±15 pontos em torno desse alvo (com `max = 100` quando aplicável). A calibração final depende do piloto interno (§4.2).

### 3.2 JSON por cargo

#### 3.2.1 Dentista

```json
{
  "cargo": "dentista",
  "versao_modelo": "cultura-bs-v1.0",
  "dimensoes": {
    "uau":        { "min": 85, "max": 100, "peso": 1.2, "alvo": 100 },
    "inovacao":   { "min": 85, "max": 100, "peso": 1.2, "alvo": 100 },
    "dono":       { "min": 75, "max": 100, "peso": 1.0, "alvo": 90  },
    "crescimento":{ "min": 85, "max": 100, "peso": 1.2, "alvo": 100 }
  },
  "vetor_ideal": [100, 100, 90, 100],
  "threshold_eliminatorio": 65,
  "red_flag_etica": "sempre_eliminatorio_com_revisao_humana"
}
```

#### 3.2.2 Auxiliar de saúde bucal

```json
{
  "cargo": "auxiliar_saude_bucal",
  "versao_modelo": "cultura-bs-v1.0",
  "dimensoes": {
    "uau":        { "min": 85, "max": 100, "peso": 1.2, "alvo": 100 },
    "inovacao":   { "min": 55, "max": 85,  "peso": 0.7, "alvo": 70  },
    "dono":       { "min": 85, "max": 100, "peso": 1.3, "alvo": 100 },
    "crescimento":{ "min": 75, "max": 100, "peso": 1.0, "alvo": 90  }
  },
  "vetor_ideal": [100, 70, 100, 90],
  "threshold_eliminatorio": 65,
  "red_flag_etica": "sempre_eliminatorio_com_revisao_humana"
}
```

#### 3.2.3 Recepcionista

```json
{
  "cargo": "recepcionista",
  "versao_modelo": "cultura-bs-v1.0",
  "dimensoes": {
    "uau":        { "min": 85, "max": 100, "peso": 1.3, "alvo": 100 },
    "inovacao":   { "min": 45, "max": 75,  "peso": 0.6, "alvo": 60  },
    "dono":       { "min": 85, "max": 100, "peso": 1.3, "alvo": 100 },
    "crescimento":{ "min": 75, "max": 100, "peso": 1.0, "alvo": 90  }
  },
  "vetor_ideal": [100, 60, 100, 90],
  "threshold_eliminatorio": 65,
  "red_flag_etica": "sempre_eliminatorio_com_revisao_humana"
}
```

#### 3.2.4 Coordenador de clínica

```json
{
  "cargo": "coordenador_clinica",
  "versao_modelo": "cultura-bs-v1.0",
  "dimensoes": {
    "uau":        { "min": 75, "max": 100, "peso": 1.0, "alvo": 90  },
    "inovacao":   { "min": 75, "max": 100, "peso": 1.0, "alvo": 90  },
    "dono":       { "min": 85, "max": 100, "peso": 1.3, "alvo": 100 },
    "crescimento":{ "min": 85, "max": 100, "peso": 1.2, "alvo": 100 }
  },
  "vetor_ideal": [90, 90, 100, 100],
  "threshold_eliminatorio": 70,
  "red_flag_etica": "sempre_eliminatorio_com_revisao_humana"
}
```

#### 3.2.5 Gestor regional

```json
{
  "cargo": "gestor_regional",
  "versao_modelo": "cultura-bs-v1.0",
  "dimensoes": {
    "uau":        { "min": 65, "max": 95,  "peso": 0.9, "alvo": 80  },
    "inovacao":   { "min": 85, "max": 100, "peso": 1.3, "alvo": 100 },
    "dono":       { "min": 85, "max": 100, "peso": 1.3, "alvo": 100 },
    "crescimento":{ "min": 85, "max": 100, "peso": 1.3, "alvo": 100 }
  },
  "vetor_ideal": [80, 100, 100, 100],
  "threshold_eliminatorio": 70,
  "red_flag_etica": "sempre_eliminatorio_com_revisao_humana"
}
```

### 3.3 Regra do red flag ético

Independente do `threshold_eliminatorio` numérico, **qualquer item com flag eliminatório disparado** (conforme coluna "Flag eliminatório" na seção 2) gera:

1. Badge vermelho no kanban RH (`scores_candidato.alerta_eliminatorio = true`).
2. Campo `score_json.red_flags_detectados` com lista de itens e justificativas.
3. **Bloqueio de avanço automático** — só recrutador humano pode mover o candidato adiante, e precisa registrar `motivo_textual` em `historico_candidatura` (Art. 20 LGPD + RNF-07a).

---

## 4. Matriz de cobertura e calibração

### 4.1 Cobertura mínima por dimensão (confiabilidade)

Alvo de cobertura para Cronbach-α > 0.70 por dimensão (a validar no piloto):

| Dimensão | Itens SJT | Itens Likert | Itens Ranking | Total |
|---|---|---|---|---|
| Experiência UAU | 3 (001, 003, 005) | 3 (002, 004, 006) | 0 (toca em 018) | **6+1** |
| Atitude de Dono | 3 (007, 009, 011) | 2 (008, 010) | 0 (toca em 018) | **5+1** |
| Inovação | 2 (012, 014) | 2 (013, 015) | 0 (toca em 018, 023) | **4+2** |
| Sede de Crescimento | 1 (016) | 2 (017, 019) | 1 (018) | **4** |
| Ética / Red Flag | 4 (020, 022, 024; parte em 003, 007) | 1 (025) | 2 (021, 023) | **7+** |

**Nota:** dimensões têm **≥ 4 itens dedicados** conforme requisito do mini-PRD (§5.3). Dimensão UAU e Atitude de Dono recebem cobertura adicional via cenários secundários em itens de outras dimensões (cross-loading explícito na chave de pontuação).

### 4.2 Validação piloto recomendada (antes de release produção)

Conforme `fit-cultural-prd.md` §13 revisado:

1. **20-30 colaboradores atuais BS** respondem ao banco sem consequência (amostra normativa interna).
2. **Análise psicométrica:**
   - α de Cronbach por dimensão (alvo > 0.70)
   - Correlação inter-item dentro da dimensão (alvo > 0.30)
   - Análise fatorial confirmatória (4 dimensões + ética emergem?)
3. **Validação de conteúdo:**
   - Fundadores + RH revisam cada item para garantir alinhamento com cultura real.
   - Teste cego: 5 colaboradores leem o banco e identificam os 4 valores sem o gabarito.
4. **Refinar itens com:**
   - α baixo → reescrever ou remover
   - Taxa de resposta "extrema" (>90% em uma alternativa) → item não discriminativo, reescrever
   - Tempo de resposta < 3s em SJT → revisar enunciado (pode estar óbvio)

---

## 5. Notas de implementação

### 5.1 Seed SQL (resumo)

Todos os 25 itens devem ser seedados em `itens_cultura_bank` com:
- `versao = 'cultura-v1.0'`
- `codigo = 'FC-V1-XXX'` (001 a 025)
- `tipo ∈ {'sjt','likert','ranking'}`
- `enunciado` = cenário/afirmação em pt-BR
- `alternativas_json` conforme estruturas §8.2 do mini-PRD
- `mapeamento_dimensoes_json` conforme chave de pontuação de cada item
- `ativo = true`

### 5.2 Ordem de apresentação ao candidato

Conforme `fit-cultural-prd.md` §5.4:

1. **Randomização determinística por candidatura_id** (seed reprodutível).
2. **Likert intercalado com SJT** para reduzir fadiga.
3. **Ranking (018, 021, 023) deslocado para o final** — quando candidato já está "aquecido".
4. **Red flags puros (024, 025) intercalados no meio do teste** — não concentrar no final, para evitar fadiga influenciar resposta ética.

### 5.3 Anti-gaming

- **Tempo mínimo por SJT:** 5 segundos (< 5s = flag para revisão, não eliminatório).
- **Itens reversos (008, 013, 025):** detectar straightlining.
- **Consistência cruzada:** item 004 (Likert) e item 003 (SJT) medem UAU com cenários diferentes — discrepância > 40 pts é flag de atenção.

### 5.4 Linguagem e anti-viés (§11 do mini-PRD)

Todos os 25 itens foram redigidos com atenção a:
- **pt-BR informal mas profissional** (sem jargão corporativo americano)
- **Cenários de clínica odontológica** (não escritório)
- **Neutralidade de gênero** quando o contexto não exige (alternando usos)
- **Sem pressuposto de classe social, região ou escolaridade acima de ensino médio**
- **Sem "resposta obviamente certa"** — cada alternativa é plausível para um candidato não-Beauty-Smile

---

## 6. Itens SJT mais discriminativos (recomendação para piloto)

Para análise psicométrica prioritária no piloto, esses 3 SJTs são os que **melhor separam candidatos alinhados de desalinhados**, considerando a literatura de SJTs e o contexto BS:

1. **FC-V1-003 (Paciente chora na cadeira)** — alta carga emocional + opção (b) é red flag sutil que "parece prática" mas desumaniza. Separa candidato com UAU genuíno de quem repete script.
2. **FC-V1-020 (Dilema 1 — pressão de meta)** — tensão explícita entre Ética e meta; alternativas (b) e (d) são red flags com faces diferentes (venda direta e venda sofisticada). Separa candidato com princípio ético estável de quem relativiza sob pressão.
3. **FC-V1-022 (Dilema 2 — erro do sênior)** — testa "valores acima dos fundadores" no cenário mais difícil (auxiliar júnior vs. sênior). Separa quem internalizou o princípio cultural de quem opera por hierarquia.

Esses três itens devem ter análise pós-piloto de:
- Distribuição de respostas (se >80% escolhem (a), item não discrimina)
- Correlação com outcome (retenção aos 6 meses + avaliação de gestor)
- Falsos positivos/negativos em revisão humana

---

## 7. Changelog

| Versão | Data | Autor | Mudanças |
|---|---|---|---|
| 1.0 | 2026-04-19 | Claude Agent + Fernando | Geração inicial dos 25 itens a partir de CULTURA-BEAUTY-SMILE-INPUT.md e fit-cultural-prd.md; 4 valores oficiais consolidados; 6 red flags mapeados; `faixa_ideal_json` definido para 5 cargos. |

---

**Fim do banco de itens v1.0.** Próximos passos: (1) piloto interno com 20-30 colaboradores BS, (2) análise psicométrica, (3) refinamento antes de release produção.
