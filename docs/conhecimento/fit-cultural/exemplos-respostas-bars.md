# Exemplos de Respostas BARS — Calibração Few-Shot

**Uso:** **embutidos inline no system prompt** da Edge Function `avaliar-redacao` (marcados com `cache_control: ephemeral` — parte estável do contexto). Também servem como **gold standard** para treinamento de revisores humanos.
**Versão:** 1.1 — 2026-05-12 (substitui v0.0 scaffold).

> **Mudança v0.0 → v1.1**: arquivo deixa de ser "TBD scaffold" e passa a conter **3 redações completas calibradas** (Nível 1 / 3 / 5) com personas diversas (junior recepção / médio ASB / sênior coord), scoring detalhado por dimensão com citações âncora, e recomendação BARS. Todos os 3 são sintéticos calibrados em sessão Onda 4 (2026-05-12) e **aprovados pelo Fernando** para uso V1. Após piloto V2, substituir por exemplos reais anonimizados.

---

## Como interpretar estes exemplos

Cada exemplo segue formato espelho do output esperado da IA:

1. **Persona** (cargo da vaga + contexto)
2. **Pergunta** (sempre a Q1 padrão Beauty Smile)
3. **Redação** (texto integral, na faixa 200-500 palavras)
4. **Scoring por dimensão** com citação âncora + nível + justificativa
5. **Score geral** com caps aplicados
6. **Recomendação** + flags
7. **Por que este exemplo é Nível X** (lição pra IA / revisor)

---

## Pergunta padrão usada em todos os 3 exemplos

```
Descreva uma situação real em que você precisou cuidar de uma pessoa
(cliente, paciente, colega ou liderado) em momento de fragilidade,
dúvida ou insatisfação.

Conte:
- O contexto
- O que VOCÊ decidiu fazer (e por quê)
- O que aprendeu com a experiência
```

---

## EXEMPLO NÍVEL 1 — "Camila" (candidata vaga Recepcionista; primeiro emprego formal)

### Redação (218 palavras)

```
Eu acredito que cuidar das pessoas é uma das coisas mais importantes que
existem. No meu trabalho, sempre tive o costume de atender bem todo mundo,
porque o cliente é a peça mais importante de qualquer negócio.

Quando a pessoa chega insatisfeita, é importante manter a calma e ouvir com
atenção. Eu sempre procuro tratar todos com empatia e respeito, porque cada
um tem sua história e seus problemas. Não dá pra julgar ninguém antes de
entender o que está passando.

O cliente difícil muitas vezes só está precisando ser ouvido. Quando a
gente realmente escuta, a maioria dos problemas se resolve naturalmente.
Por isso eu sempre dou prioridade ao bom atendimento e à comunicação clara.

Acho que a vida é feita de aprendizados e cada situação é uma
oportunidade de evolução. Cuidar das pessoas é cuidar de si mesmo, porque
a gente colhe o que planta. No fim, o que importa mesmo é fazer o bem e
tratar todo mundo do jeito que a gente gostaria de ser tratado.

Eu acredito que a Beauty Smile é uma empresa que valoriza essas
qualidades e por isso quero fazer parte da equipe.
```

### Scoring

```json
{
  "preprocessing_check": {
    "word_count": 218,
    "detected_writing_style": "formal",
    "style_neutralized_in_scoring": true
  },
  "dimension_scores": [
    {
      "dimension": "D1",
      "dimension_name": "especificidade",
      "cited_evidence": [
        {"text": "No meu trabalho, sempre tive o costume de atender bem todo mundo", "location": "Parágrafo 1"},
        {"text": "Quando a pessoa chega insatisfeita, é importante manter a calma", "location": "Parágrafo 2"}
      ],
      "reasoning": "Nenhuma situação concreta narrada. As frases descrevem TIPO de situação ('quando a pessoa chega', 'sempre tive o costume'), não UMA situação específica. Abstrato/teórico em toda extensão. Sem ancoragem temporal, local, ou de pessoas.",
      "score": 1,
      "level": "inadequate"
    },
    {
      "dimension": "D2",
      "dimension_name": "acao",
      "cited_evidence": [
        {"text": "eu sempre procuro tratar todos com empatia e respeito", "location": "Parágrafo 2"},
        {"text": "eu sempre dou prioridade ao bom atendimento e à comunicação clara", "location": "Parágrafo 3"}
      ],
      "reasoning": "Nenhuma ação concreta. Verbos no presente habitual ('sempre procuro', 'sempre dou prioridade') indicam atitude geral, não ação narrada. Sem decisão individual, sem trade-off, sem consequência.",
      "score": 1,
      "level": "inadequate"
    },
    {
      "dimension": "D3",
      "dimension_name": "aprendizado",
      "cited_evidence": [
        {"text": "a vida é feita de aprendizados e cada situação é uma oportunidade de evolução", "location": "Parágrafo 4"},
        {"text": "cuidar das pessoas é cuidar de si mesmo, porque a gente colhe o que planta", "location": "Parágrafo 4"}
      ],
      "reasoning": "Platitudes clássicas (frases de para-choque) sem conexão com história — porque não há história. Sem insight específico, sem mudança comportamental demonstrada.",
      "score": 2,
      "level": "basic"
    },
    {
      "dimension": "D4",
      "dimension_name": "alinhamento_valores",
      "cited_evidence": [
        {"text": "Beauty Smile é uma empresa que valoriza essas qualidades e por isso quero fazer parte", "location": "Parágrafo 5"}
      ],
      "reasoning": "Performático/ambíguo. Compatível em superfície com UAU mas sem demonstração concreta. Último parágrafo é encerramento de carta de motivação, não evidência de alinhamento vivido.",
      "score": 2,
      "level": "basic"
    }
  ],
  "overall_score": 30,
  "qualitative_summary": "Redação inteiramente abstrata sem nenhuma situação concreta narrada. Pode ser candidato com pouca habilidade de escrita narrativa ou candidato sem experiência real para reportar. Estilo formal mas estilo NÃO afetou score — o que afetou foi ausência total de evidência situacional. Cap D1≤2 aplicado (já estava em 30).",
  "recommendation": "weak_fit",
  "red_flag_etico": false,
  "bias_audit": {
    "formality_did_not_affect_score": true,
    "regional_markers_treated_as_neutral": true,
    "grammar_errors_did_not_affect_content_score": true
  }
}
```

**Cálculo:** `(1+1+2+2)/4 × 20 = 30`. Cap D1≤2 já em 30. **Cor: 🔴 vermelho** (score ≤ 40 + D1 ≤ 2).

**Flag:** `situacao_generica_ou_inventada`, `insufficient_evidence_situacional`

**Recomendação RH**: revisão humana **antes** de rejeição (LGPD Art. 20 + RNF-07a). Possibilidade de candidato com experiência real mas baixa habilidade de escrita narrativa. Considerar entrevista para confirmar.

### Por que este exemplo é Nível 1

- **Anti-pattern clássico de candidato "carta de motivação"**: respondem o que acham que a empresa quer ouvir, sem situação concreta.
- Calibra a IA pra **NÃO dar score alto a redação genérica** (failure mode comum em LLM scoring que premia "tom positivo").
- Estilo formal NÃO é o problema — é a ausência total de situação real.

---

## EXEMPLO NÍVEL 3 — "Rodrigo" (candidato vaga Auxiliar Saúde Bucal; 5 anos experiência)

### Redação (248 palavras)

```
No meu trabalho anterior, em uma clínica de pequeno porte aqui em São
Paulo, tive uma situação que ficou marcada. Um paciente meio de idade
chegou para uma extração e estava muito tenso, porque tinha tido uma má
experiência com outro dentista anos atrás. Ele falou que ficava com
medo só de sentir o cheiro de consultório.

Eu percebi que ele estava nervoso assim que entrou na sala. A dentista
ainda estava finalizando outro atendimento, então decidi conversar com
ele enquanto isso. Perguntei sobre o trabalho dele, sobre a família, e
tentei deixar o ambiente mais leve. Aos poucos ele foi relaxando e
contando sobre a experiência ruim que tinha tido.

Quando a dentista chegou, eu expliquei rapidamente a situação para ela
e ela conseguiu fazer o procedimento de forma mais tranquila. No fim,
o paciente saiu agradecendo e disse que tinha sido muito diferente do
que ele esperava.

Aprendi com isso a importância de prestar atenção nos sinais que o
paciente dá, mesmo antes dele falar. Muitas vezes o medo está ali, e
cabe a gente acolher antes de qualquer procedimento. Hoje eu sempre
busco fazer essa conexão inicial com o paciente, porque sei que faz
diferença no resultado final.

Cuidar bem das pessoas é o que mais me motiva nessa profissão e é o
que pretendo continuar fazendo na Beauty Smile.
```

### Scoring

```json
{
  "preprocessing_check": {
    "word_count": 248,
    "detected_writing_style": "mixed",
    "style_neutralized_in_scoring": true
  },
  "dimension_scores": [
    {
      "dimension": "D1",
      "dimension_name": "especificidade",
      "cited_evidence": [
        {"text": "em uma clínica de pequeno porte aqui em São Paulo", "location": "Parágrafo 1"},
        {"text": "Um paciente meio de idade chegou para uma extração e estava muito tenso", "location": "Parágrafo 1"}
      ],
      "reasoning": "Situação plausível ancorada em 1 dimensão (lugar: 'clínica de pequeno porte em São Paulo'). Sem timing específico ('ficou marcada' mas sem quando — 'há um ano? há cinco?'). 'Um paciente meio de idade' é genérico, sem marcador específico que valide ser história real. Sequência narrativa existe mas é fina.",
      "score": 3,
      "level": "developing"
    },
    {
      "dimension": "D2",
      "dimension_name": "acao",
      "cited_evidence": [
        {"text": "decidi conversar com ele enquanto isso", "location": "Parágrafo 2"},
        {"text": "perguntei sobre o trabalho dele, sobre a família, e tentei deixar o ambiente mais leve", "location": "Parágrafo 2"}
      ],
      "reasoning": "Ownership presente ('decidi conversar'). Ações descritas mas verbos genéricos ('conversei', 'tentei deixar mais leve', 'expliquei'). Sem trade-offs explícitos (poderia ter ido fazer outra coisa enquanto esperava). Consequência narrada brevemente ('saiu agradecendo').",
      "score": 3,
      "level": "developing"
    },
    {
      "dimension": "D3",
      "dimension_name": "aprendizado",
      "cited_evidence": [
        {"text": "aprendi a importância de prestar atenção nos sinais que o paciente dá, mesmo antes dele falar", "location": "Parágrafo 4"},
        {"text": "hoje eu sempre busco fazer essa conexão inicial com o paciente", "location": "Parágrafo 4"}
      ],
      "reasoning": "Plausível mas genérico ('importância de'). Mudança comportamental mencionada mas vaga ('sempre busco') — sem ritual específico ou pergunta concreta que faz hoje. Conexão com história existe mas tênue.",
      "score": 3,
      "level": "developing"
    },
    {
      "dimension": "D4",
      "dimension_name": "alinhamento_valores",
      "cited_evidence": [
        {"text": "decidi conversar com ele enquanto isso", "location": "Parágrafo 2"},
        {"text": "antes de qualquer procedimento", "location": "Parágrafo 4"}
      ],
      "reasoning": "Compatível com UAU (escutou paciente; foi proativo) sem demonstrá-lo na ambição. Encerramento performático ('é o que pretendo continuar fazendo na Beauty Smile') puxa pra baixo, mas core do comportamento narrado é coerente. Sem demonstração de Atitude de Dono (não foi muito além do esperado) ou Sede de Crescimento.",
      "score": 3,
      "level": "developing"
    }
  ],
  "overall_score": 60,
  "qualitative_summary": "Redação típica de candidato com experiência real mas habilidade narrativa intermediária. Situação plausível mas ancorada fracamente. UAU está implícito mas não demonstrado em profundidade. Encerramento de carta de motivação puxa qualidade pra baixo. Avançar para Etapa 4 (entrevista online) e explorar UAU com follow-up: 'me conta mais sobre essa conversa — o que perguntou exatamente, o que ele respondeu?'.",
  "recommendation": "neutral",
  "red_flag_etico": false,
  "bias_audit": {
    "formality_did_not_affect_score": true,
    "regional_markers_treated_as_neutral": true,
    "grammar_errors_did_not_affect_content_score": true
  }
}
```

**Cálculo:** `(3+3+3+3)/4 × 20 = 60`. Nenhum cap aplicado. **Cor: 🟡 amarelo** (41-64).

**Flag:** nenhuma.

**Recomendação RH**: avança pra Etapa 4 com nota — explorar UAU mais a fundo no follow-up. Confirmar profundidade da história narrada.

### Por que este exemplo é Nível 3

- Representa **fronteira good_fit/neutral** — o caso mais comum em volume real.
- Calibra IA pra dar **score médio quando há experiência real mas narrativa fina**, sem inflar nem deflacionar.
- Mostra que **encerramento performático** ("quero fazer parte da equipe") puxa D4 pra baixo mesmo quando o core do comportamento é coerente.

---

## EXEMPLO NÍVEL 5 — "Mariana" (candidata vaga Coordenadora de Clínica; 8 anos experiência)

### Redação (356 palavras)

```
Em outubro de 2024, na clínica onde eu coordenava, recebemos uma
paciente de 67 anos para o primeiro retorno após cirurgia de implante.
Era uma quinta-feira de manhã e a auxiliar veio me chamar na recepção
dizendo que a dona Suely estava chorando na cadeira sem parar — não
pela dor, mas porque o filho dela tinha sido internado de madrugada e
ela estava sozinha em São Paulo (a família é de Sorocaba).

A dentista ia atendê-la em 10 minutos e a agenda do dia já estava
apertada. Eu poderia ter pedido pra remarcar — seria o mais
"operacional". Mas decidi entrar lá, sentar na cadeira do auxiliar, e
simplesmente perguntar se ela queria conversar antes ou se preferia
que eu ligasse pra alguém. Ela pediu pra ligar pro genro. Liguei do
meu celular pessoal porque o telefone da clínica não fazia interurbano
— e fiquei com ela enquanto esperava ele chegar (40 minutos).
Comuniquei a dentista que iria atrasar a agenda em 30 min, conversei
com os outros 2 pacientes que aceitaram esperar (ofereci café e
expliquei que era uma situação urgente, sem dar detalhes da Suely por
confidencialidade).

A dona Suely fez o retorno depois que o genro chegou. No mês seguinte
ela trouxe a irmã, a nora e duas amigas como pacientes — falou que
"não conhecia clínica que atrasasse pra uma paciente sozinha".

O que aprendi foi mais sutil do que parece à primeira vista. Eu sempre
pensei que coordenação era proteger a agenda. Aquele dia me ensinou
que coordenação de verdade é decidir, no momento, o que esta clínica
quer ser para esta pessoa — e bancar a decisão com os outros pacientes
na sala de espera de forma transparente. Hoje, sempre que tenho um
conflito assim, eu pergunto: "qual escolha eu queria que fosse contada
na reunião de quinta?". Mudou completamente como conduzo a equipe —
aliás, foi assim que comecei a fazer reunião semanal de casos, pra
time inteiro entender os trade-offs juntos.
```

### Scoring

```json
{
  "preprocessing_check": {
    "word_count": 356,
    "detected_writing_style": "mixed",
    "style_neutralized_in_scoring": true
  },
  "dimension_scores": [
    {
      "dimension": "D1",
      "dimension_name": "especificidade",
      "cited_evidence": [
        {"text": "Em outubro de 2024, na clínica onde eu coordenava, recebemos uma paciente de 67 anos para o primeiro retorno após cirurgia de implante", "location": "Parágrafo 1"},
        {"text": "Liguei do meu celular pessoal porque o telefone da clínica não fazia interurbano", "location": "Parágrafo 2"}
      ],
      "reasoning": "5+ dimensões de ancoragem: quando (outubro 2024, quinta-feira de manhã, 10 minutos antes do atendimento, 40 minutos de espera), onde (clínica que coordenava), quem (dona Suely 67 anos, filho internado, família de Sorocaba, genro), gatilho (filho internado de madrugada), sequência narrativa coerente até desfecho de 1 mês depois. Detalhes que só quem viveu inventaria (telefone da clínica não faz interurbano; 4 pacientes referidos no mês seguinte).",
      "score": 5,
      "level": "exemplary"
    },
    {
      "dimension": "D2",
      "dimension_name": "acao",
      "cited_evidence": [
        {"text": "Eu poderia ter pedido pra remarcar — seria o mais 'operacional'. Mas decidi entrar lá, sentar na cadeira do auxiliar", "location": "Parágrafo 2"},
        {"text": "conversei com os outros 2 pacientes que aceitaram esperar (ofereci café e expliquei que era uma situação urgente, sem dar detalhes da Suely por confidencialidade)", "location": "Parágrafo 2"}
      ],
      "reasoning": "Decisão individual EXPLÍCITA ('decidi entrar lá') + trade-off articulado ('poderia ter pedido pra remarcar... mas decidi'). Cadeia de ações concretas (entrou, sentou, perguntou, ligou, comunicou, ofereceu café). Consequência imediata (Suely fez o retorno) E diferida (mês seguinte trouxe 4 pacientes). Ownership pleno pelo resultado.",
      "score": 5,
      "level": "exemplary"
    },
    {
      "dimension": "D3",
      "dimension_name": "aprendizado",
      "cited_evidence": [
        {"text": "coordenação de verdade é decidir, no momento, o que esta clínica quer ser para esta pessoa — e bancar a decisão com os outros pacientes na sala de espera de forma transparente", "location": "Parágrafo 4"},
        {"text": "Hoje, sempre que tenho um conflito assim, eu pergunto: 'qual escolha eu queria que fosse contada na reunião de quinta?'. Mudou completamente como conduzo a equipe — aliás, foi assim que comecei a fazer reunião semanal de casos", "location": "Parágrafo 4"}
      ],
      "reasoning": "Insight específico, conectado DIRETAMENTE à ação ('eu sempre pensei que coordenação era proteger a agenda. Aquele dia me ensinou...'). Auto-crítica sutil sem flagelação. Mudança comportamental posterior demonstrável e MENSURÁVEL (instituiu ritual operacional novo: reunião semanal de casos como consequência direta).",
      "score": 5,
      "level": "exemplary"
    },
    {
      "dimension": "D4",
      "dimension_name": "alinhamento_valores",
      "cited_evidence": [
        {"text": "Liguei do meu celular pessoal", "location": "Parágrafo 2"},
        {"text": "decidi entrar lá... bancar a decisão com os outros pacientes", "location": "Parágrafo 2"},
        {"text": "sem dar detalhes da Suely por confidencialidade", "location": "Parágrafo 2"}
      ],
      "reasoning": "3 valores BS demonstrados explicitamente: UAU profundo (40 min com paciente, antecipou necessidade, ligação do próprio celular); Atitude de Dono (assumiu decisão sem escalar pra dentista, comunicou com sala de espera); Sede de Crescimento (insight + ritual operacional novo como consequência). Ética preservada sob pressão (confidencialidade explícita ao explicar pros outros pacientes).",
      "score": 5,
      "level": "exemplary"
    }
  ],
  "overall_score": 100,
  "qualitative_summary": "Redação exemplary em todas as 4 dimensões. Situação ancorada com detalhes que só quem viveu inventaria; ação concreta com trade-off articulado; insight conectado à ação com mudança operacional mensurável posterior; 3 valores BS demonstrados explicitamente sob pressão. Ética preservada com clareza. Aprovado com confiança alta. Entrevista online para calibrar profundidade técnica/operacional, não fit cultural.",
  "recommendation": "strong_fit",
  "red_flag_etico": false,
  "bias_audit": {
    "formality_did_not_affect_score": true,
    "regional_markers_treated_as_neutral": true,
    "grammar_errors_did_not_affect_content_score": true
  }
}
```

**Cálculo:** `(5+5+5+5)/4 × 20 = 100`. Nenhum cap aplicado. **Cor: 🟢 verde** (≥65).

**Flag:** nenhuma.

**Recomendação RH**: avança Etapa 4 com confiança alta. Entrevista online para calibrar profundidade técnica/operacional, não fit cultural.

### Por que este exemplo é Nível 5

- Calibra **teto máximo realista** — score 100 é raro (~5% do top).
- Demonstra que **trade-off articulado explícito** ("poderia X mas decidi Y") é o marcador de D2=5.
- Mostra que **mudança operacional mensurável posterior** (instituir reunião semanal de casos) é o marcador de D3=5.
- Mostra que **3 valores BS aparecendo organicamente** + ética preservada sob pressão é o marcador de D4=5.

---

## Notas para piloto V2

### Próximos exemplos a adicionar (V2)

- **Nível 2**: redação com situação real mas ação genérica E platitude no aprendizado (calibra fronteira 2-3)
- **Nível 4**: redação muito boa em 3 dims mas com 1 dim em 3-4 (calibra fronteira 4-5)
- **Red flag ético**: candidato narra mentir/manipular como decisão "esperta" (calibra trigger `red_flag_etico=true`)
- **Plágio detectado**: redação idêntica a outra candidata da mesma vaga (calibra flag intercandidato)

### Diversidade demográfica V2

V1 tem 3 perfis homogêneos (todos brancos sudeste, ensino médio+, contextos urbanos). V2 deve incluir:
- Candidato negro de Salvador escrevendo em PT-BR coloquial regional
- Candidata indígena/oriental do interior do Pará escrevendo em registro misto
- Candidato deficiente cognitivo (TEA leve) com narrativa estruturada
- Candidato 50+ anos com formação técnica diferente

Objetivo: confirmar que IA não correlaciona perfil demográfico com score, validando o `bias_audit`.

---

**Atualizado em:** 2026-05-12
**Próxima revisão:** pós-piloto interno (50 redações) — adicionar exemplos de nível 2 e 4 se κ < 0,60 em alguma dimensão.
