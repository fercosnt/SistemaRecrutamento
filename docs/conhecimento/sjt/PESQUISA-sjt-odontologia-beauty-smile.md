# PESQUISA — SJT / Work Sample para ATS Odontológico Beauty Smile

> Compilado em **2026-04-27** | Modo: **Deep Research** | Domínio: I-O Psychology + Healthcare Hiring + BR
> 5 subagentes paralelos | ~85 fontes consultadas | 15 SJTs prontos + in-basket completo
> **Documento irmão (estratégia geral):** [PESQUISA-sistema-avaliacao-candidatos-recrutamento.md](./PESQUISA-sistema-avaliacao-candidatos-recrutamento.md) — este aqui é o **deep dive operacional** do design de SJT/Work Sample por cargo.

---

## ÍNDICE

1. [Resumo Executivo — 12 verdades operacionais](#1-resumo-executivo)
2. [Mapa de Fontes (Tier 1/2/3)](#2-mapa-fontes)
3. [Boas Práticas de Design (8 decisões com evidência)](#3-design)
4. [Dimensões BARS — Catálogo de 10 dimensões](#4-bars-dimensoes)
5. [BARS Templates por Dimensão](#5-bars-templates)
6. [SJTs Prontos por Cargo (15 itens + in-basket)](#6-sjt-prontos)
   - 6.1 Dentista (4 SJTs + 1 case clínico aberto)
   - 6.2 Higienista / TSB / ASB (3 SJTs)
   - 6.3 Recepção (3 SJTs)
   - 6.4 Coordenador (3 SJTs + 1 mini-case)
   - 6.5 Admin (2 SJTs + In-Basket de 14 itens)
7. [Hosting do Item Bank — Recomendação Técnica](#7-hosting)
8. [Roadmap de Implementação (90 dias)](#8-roadmap)
9. [Gaps e Limitações da Pesquisa](#9-gaps)
10. [Fontes Tieradas](#10-fontes)

---

<a id="1-resumo-executivo"></a>
## 1. RESUMO EXECUTIVO — 12 verdades operacionais

### Sobre o estado da arte (validade científica)

1. **Webster et al. (2020) é o benchmark atual de SJT em healthcare: r pooled = 0,32** (efeito moderado). É o número que sustenta seleção em saúde — comparável a entrevista estruturada e superior a anos de experiência. [PubMed 32353895](https://pubmed.ncbi.nlm.nih.gov/32353895/)

2. **Fahim, Khan & Sethi (2023) é o ÚNICO estudo recente de SJT validado em odontologia** (n=150, formandos paquistaneses, α=0,738). Domínio "ética profissional" foi o mais discriminativo (média 56%) — exatamente onde Beauty Smile precisa filtrar. [Wiley](https://onlinelibrary.wiley.com/doi/10.1002/jdd.13113)

3. **Parry et al. (2022, Indonésia, n=954) é o melhor proxy de adverse impact para Brasil**: SJT de 112 itens não mostrou diferenças por etnia ou nível socioeconômico (eta²<0,03). Mulheres superaram homens (d≈0,46) — esperado e gerenciável via composição da bateria. [BMC Med Education](https://link.springer.com/article/10.1186/s12909-022-03247-4)

4. **Brasil é deserto: zero SJT cadastrado no SATEPSI/CFP, zero teses validadas em saúde** (USP, UNIFESP, UNICAMP, UFRGS). O único artigo PT-BR é Ambiel et al. (2015, PePSIC) — revisão teórica sem instrumento. **Gap = oportunidade competitiva**: quem validar primeiro um SJT dental BR detém o ativo. [PePSIC](https://pepsic.bvsalud.org/scielo.php?script=sci_arttext&pid=S1984-66572015000300007)

### Sobre design (decisões prescritivas)

5. **Use 4 alternativas, formato rating 4 pontos OU "Most Likely / Least Likely"** (Arthur et al. 2014). Rating é o estado da arte (AAMC PREview); ML/LL é mais prático para volume alto. **Evite ranking completo de 5+** — fadiga acima de 20 cenários derruba qualidade.

6. **"Should do" (60%) + "Would do" (40%)** mistura validade preditiva clínica com captura de tendências comportamentais. "Should do" é, contraintuitivamente, **menos fakeable** que "would do" porque o candidato não precisa afirmar — só identificar o correto. [Lievens & Sackett 2009](https://pubmed.ncbi.nlm.nih.gov/19594248/)

7. **Tempo: ~2-2,5 min/cenário em texto + rating** (benchmark AAMC PREview). Para Beauty Smile triagem: **20 cenários, 40-50 min**. Para fase final: 30 cenários, 60-75 min. UCAT (~23s/item) é tempo-pressão extremo, não replicar.

8. **Texto rico + 1 imagem estática é o sweet spot custo/benefício** para volume alto. Animação 3D (não vídeo com atores) reduz adverse impact para d=0,09 (Lievens 2019) com ~20% do custo de vídeo — **fase 2 do roadmap**, não MVP.

### Sobre o conteúdo (Brasil-específico)

9. **O Art. 11 do Código de Ética Odontológica (CFO Resolução 118/2012) é gold mine**: cada inciso (I a XII) é uma âncora comportamental negativa pronta para virar SJT. Combinado com Art. 5 e 9 (positivos), entrega 8+ dimensões BARS sem inventar nada. [CFO PDF](https://website.cfo.org.br/wp-content/uploads/2018/03/codigo_etica.pdf)

10. **DCN Odontologia 2021 (Resolução CNE/CES 3/2021) lista as 6 competências oficiais do egresso** + 7 atributos do perfil. É o documento legal que define "o que é um bom dentista no Brasil" — base inquestionável para qualquer auditoria/recurso trabalhista. [MEC](https://portal.mec.gov.br/docman/junho-2021-pdf/191741-rces003-21/file)

11. **ENADE Odontologia (2013, 2016) + apostila UFU 2023 entregam 60+ questões situacionais reais com gabarito oficial** — toda questão tem 1 resposta defensável publicamente. **Banco zero-cost de matéria-prima validada em provas nacionais.** [ENADE 2013](https://download.inep.gov.br/educacao_superior/enade/provas/2013/11_ODONTOLOGIA.pdf)

### Sobre commercial landscape

12. **Pearson VUE NHS Public Health SJT (PDF público) é o melhor template de cenário**: 6 cenários completos com gabarito + rationale. Um deles (#5, violação de confidencialidade de dados de paciente) replica em PT-BR com ajuste de contexto LGPD em <30 min. **Use como modelo pedagógico, não copie cenário.** [Pearson VUE PDF](https://pearsonvue.com/content/dam/VUE/vue/en/documents/clients/phnro/Example-Questions-Public-Health-SJT-2022.pdf)

---

<a id="2-mapa-fontes"></a>
## 2. MAPA DE FONTES — visão tierada

### Tier 1 — Essencial (todo decisor lê)

| # | Fonte | Tipo | Por que importa |
|---|-------|------|-----------------|
| 1 | **Webster et al. (2020)** — Meta-análise SJT em seleção médica | Paper | r pooled = 0,32 é o benchmark atual |
| 2 | **Kepes, Lievens, McDaniel (2025)** — Revisão integrativa | Paper | Estado da arte global, 524 docs analisados |
| 3 | **Fahim, Khan & Sethi (2023)** — SJT em odontologia | Paper | ÚNICO estudo recente em dental |
| 4 | **CFO Res. 118/2012** — Código de Ética Odontológica | Legal | Base regulatória dos cenários BR |
| 5 | **DCN Odontologia 2021** (CNE/CES 3/2021) | Legal | 6 competências oficiais do egresso |
| 6 | **Pearson VUE NHS Public Health SJT** | Template | 6 cenários públicos com gabarito |
| 7 | **Christian, Edwards & Bradley (2010)** — Meta-análise constructos | Paper | Base teórica clássica |
| 8 | **Patterson et al. AMEE Guide No. 100 (2015)** | Guia | Referência definitiva SJT em saúde |

### Tier 2 — Complementar (forte material para construção)

| # | Fonte | Tipo | Uso |
|---|-------|------|-----|
| 9 | **Apostila UFU 2023** (60+ questões ENADE + concursos) | Banco | Matéria-prima de cenários PT-BR |
| 10 | **Parry et al. (2022, Indonésia)** | Paper | Adverse impact em contexto multiétnico |
| 11 | **Adeyemo et al. (2024, Nigéria)** | Paper | Modelo de validação 10 competências replicável |
| 12 | **Arthur et al. (2014)** — Comparativo formatos | Paper | Decisão rating vs ranking vs ML/LL |
| 13 | **Lievens & Sackett (2006)** — Vídeo vs texto | Paper | Decisão de mídia |
| 14 | **Whetzel, Sullivan & McCloy (2020)** — Practices | Paper | Práticas de desenvolvimento |
| 15 | **Lievens et al. (2019)** — Constructed response | Paper | Reduz d=0,92→0,09 em audiovisual |
| 16 | **ABENO Consenso Estágios 2022** | Diretriz | Competências interprofissionais |
| 17 | **ENADE Odontologia 2013/2016** — Provas oficiais | Banco | Cenários gabaritados pelo INEP |
| 18 | **Testlify Medical Receptionist Test** | Comercial | Único SJT comercial pronto-para-recepção |
| 19 | **AssessFirst SJT Healthcare blog** | Exemplo | Cenário ranking 5 opções com rationale |

### Tier 3 — Referência (consultar quando aprofundar)

20-85: Demais fontes (incluem Lammers 2022, Schaftenaar 2022, Harenbrock 2023, Brouwers 2021, ENADE 2007/2004, Residências UFRJ/ESP-PB, casos da TDA Perks, Today's RDH, Colgate Professional, Allstar Dental Academy, Clinicorp, ClinicaIdeal, e templates de Vervoe, HireVue, Harver, Mindsight, Gupy, Solides). **Lista completa na §10.**

---

<a id="3-design"></a>
## 3. BOAS PRÁTICAS DE DESIGN — 8 decisões prescritivas com evidência

### 3.1 Quantas alternativas por cenário?

**→ 4 alternativas é o padrão.** Permite discriminação psicométrica (acaso=25%) sem explosão de custo de calibração SME. AAMC PREview usa blocos de 4-8 com rating; Patterson et al. usam 4. Whetzel et al. (2020): "a typical SJT item provides 4-6 response options." Acima de 5, cada alternativa adicional exige nova calibração com SMEs — custo cresce linearmente, ganho de validade não.

**Exceção:** se for rating independente de cada alternativa (não best-answer), pode usar 5-6 sem prejuízo.

### 3.2 Formato de resposta: Rating > ML/LL > Best Answer único > Ranking completo

**→ Rating 4 pontos ("Muito Inadequado / Inadequado / Adequado / Muito Adequado") é o estado da arte para alta aposta** (AAMC PREview). Permite scoring por consenso de SMEs com pontuação parcial. **Para volume alto, ML/LL ("escolha a melhor E a pior") é o melhor trade-off.**

Arthur et al. (2014, JAP) compararam diretamente:
- **Rating** = correlações mais fortes com personalidade hipotetizada, mais fracas com cognitive ability (reduz adverse impact)
- **Ranking completo** = similar a rating, mas alta carga cognitiva (não usar acima de 20 itens)
- **ML/LL** = forced choice moderadamente resistente a faking; melhor quando você tem opções equiparadas em desejabilidade

**Evite "best answer único" puro** — perde informação sobre o que o candidato considera pior, e tem maior carga cognitiva.

### 3.3 Knowledge ("should do") vs Behavioral ("would do")

**→ Mix 60/40 (should/would).**

- **"Should do"** = maximiza validade preditiva para desempenho clínico (correlação ρ=.33-.46 com cognitive ability). Contraintuitivamente, **mais resistente a faking** porque o candidato não precisa afirmar que faria — só reconhecer o correto.
- **"Would do"** = correlaciona com Conscienciosidade (ρ=.31) e Afabilidade (ρ=.27). Reduz diferenças raciais. Captura tendências comportamentais (integridade ecológica).

Christian et al. (2010) e Lievens & Sackett (2009) estabeleceram isso. **Para dilemas éticos puros**, prefira "would do" (captura integridade); **para dilemas técnico-clínicos**, prefira "should do" (captura raciocínio).

### 3.4 Tempo por item e tamanho da bateria

**→ Triagem inicial: 20 cenários, 35-50 min (~2-2,5 min/cenário).**
**→ Fase final: 30 cenários, 60-75 min.**

Benchmark AAMC PREview: 30 cenários, 75 min, 186 respostas (rating múltiplo). Casper: ~12 cenários vídeo + resposta aberta, 65-85 min. UCAT é outlier (66-69 itens em 26 min) — não replicar para Beauty Smile.

**Acima de 45 min sem pausa, qualidade dos últimos 30% dos itens cai** — divida em blocos com instrução intermediária.

### 3.5 Anti-faking — 5 camadas

1. **Forced choice ML/LL com opções equiparadas em desejabilidade social** (mais robusto)
2. **Within-person z-standardization no scoring** — elimina viés de leniência/aquiescência. Reduz d racial de 0.66 para 0.48.
3. **20% de itens "sneaky"** — opção que "soa correta" mas é clinicamente errada. Captura quem responde por desejabilidade vs conhecimento real.
4. **Mistura "should/would"** — instrução comportamental reduz inflação de scores (~0.15 d).
5. **Scoring SME-anchored com squared distance** — alpha sobe de 0,39 para 0,85 (Patterson 2018), aumenta erro padrão.

### 3.6 Healthcare-specific — composição de cenários

**→ Distribuição recomendada para ATS odontológico:**

| Categoria | % | Exemplo |
|-----------|---|---------|
| **Multi-stakeholder** (paciente + família + colega + gestor) | 25% | Familiar pede info de paciente adulto |
| **Ética clínica** | 25% | Procedimento estético sem indicação |
| **Segurança do paciente (procedural)** | 25% | Detectou contaminação; o que fazer? |
| **Trabalho em equipe / colega** | 15% | Colega pratica conduta questionável |
| **Gestão / operacional** | 10% | Prazo crítico vs qualidade |

Brouwers et al. (2021, PMC) validaram SJT de safety com α=0,57 em 7 domínios — referência para segurança do paciente.

### 3.7 Adverse impact — minimizar com 3 alavancas

| Alavanca | Efeito |
|----------|--------|
| **Texto → resposta construída escrita** | d racial: 0.92 → 0.28 |
| **Texto → resposta construída audiovisual** | d racial: 0.92 → 0.09 |
| **Instruções "would do"** | d racial cai vs "should do" |
| **Within-person z-standardization** | d racial cai 25-30% |

Whetzel, McDaniel & Nguyen (2008): SJT já tem **d = 0.38 (incumbentes) / 0.66 (candidatos)** para Branco vs Negro — bem abaixo de teste cognitivo (~1.0). Mulheres tendem a ter d=-0.11 (vantagem) em SJT, esperado.

### 3.8 Stimulus — texto rico é o MVP correto

**→ MVP: texto rico + 1 imagem ilustrativa por cenário (foto neutra ou ilustração).**
**→ Fase 2: animação 3D (não vídeo com atores).**

Vídeo com atores humanos introduz **viés racial/gênero do ator apresentado** — bem documentado. Animação 3D mitiga isso com personagens neutros, custa ~20% do vídeo, e mantém ~80% dos benefícios em validade e percepção do candidato (Barg-Walkow 2021).

---

<a id="4-bars-dimensoes"></a>
## 4. DIMENSÕES BARS — Catálogo de 10 dimensões validadas em fontes oficiais BR

Cada dimensão tem **âncora oficial brasileira** (CFO ou DCN) — defensável em audiência trabalhista ou auditoria do CRO. Cobertura cruzada com literatura internacional (Patterson, Christian, Webster).

| # | Dimensão | Âncora primária BR | Cargos onde é crítica |
|---|----------|-------------------|----------------------|
| 1 | **Ética e Integridade Profissional** | CFO Art. 9 (deveres) + Art. 11 (vedações) | Todos |
| 2 | **Comunicação com o Paciente** | CFO Art. 11-IV/XII; DCN 2021 Cat. III | Dentista, Higienista, Recepção |
| 3 | **Consentimento Informado** | CFO Art. 11-X | Dentista, Higienista |
| 4 | **Resposta a Urgências/Emergências** | CFO Art. 11-VII | Dentista, Recepção |
| 5 | **Trabalho em Equipe Interprofissional** | CFO Art. 12; ABENO 2022 | Todos |
| 6 | **Humanização e Dignidade do Paciente** | CFO Art. 9-VII e 11-VIII; DCN 2021 perfil | Todos |
| 7 | **Sigilo e Privacidade (LGPD)** | CFO Art. 5-II / 9-VIII / 9-XV | Todos, especialmente Recepção e Admin |
| 8 | **Proteção de Vulneráveis (ECA/Idoso)** | ECA + ENADE 2013/2016; CFO orientação Lei Maria da Penha | Dentista, Higienista, TSB |
| 9 | **Reconhecimento de Limites e Educação Permanente** | CFO Art. 9-VI; DCN 2021 Cat. VI | Todos |
| 10 | **Tomada de Decisão Baseada em Evidências** | DCN 2021 Cat. II | Dentista, Coordenador |

**Dimensões adicionais com suporte moderado** (úteis por cargo):
- Liderança e Mediação (Coordenador) — DCN 2021 Cat. IV
- Gestão de Crise / Reputação (Coordenador) — não-regulatória
- Priorização e Gestão do Tempo (Admin) — não-regulatória, in-basket
- Conformidade Trabalhista (Admin) — CLT
- Conformidade Sanitária (Admin) — ANVISA

---

<a id="5-bars-templates"></a>
## 5. BARS TEMPLATES POR DIMENSÃO

Escala única **1-5** com âncoras comportamentais explícitas (não escala numérica vazia). Padrão Google "1-4 sem meio-termo" é alternativa para reduzir tendência central — Beauty Smile decide.

### Template — Dimensão 1: Ética e Integridade Profissional

| Score | Âncora comportamental |
|-------|----------------------|
| **5 — Modelar** | Em dilema multi-stakeholder, identifica conflito de interesse de forma proativa, comunica abertamente ao paciente, registra decisão por escrito e busca segunda opinião quando apropriado. Cita CFO Art. X corretamente quando questionado. |
| **4 — Sólido** | Reconhece o dilema ético, age conforme CEO mesmo quando há pressão financeira/produtiva contrária. Documenta decisão. |
| **3 — Aceitável** | Age corretamente em situações claras; em zonas cinzentas, hesita ou consulta colega antes de decidir. |
| **2 — Abaixo** | Em dilemas, prioriza conveniência operacional ou pressão da liderança sobre o interesse do paciente. Não documenta justificativa. |
| **1 — Inaceitável** | Pratica ou tolera condutas vedadas pelo CEO Art. 11: indicar procedimento desnecessário, omitir riscos, abandonar paciente sem comunicação prévia, conivência com erro de colega. |

### Template — Dimensão 2: Comunicação com o Paciente

| Score | Âncora |
|-------|--------|
| **5** | Adapta linguagem ao nível do paciente; verifica compreensão com perguntas abertas; usa silêncio como ferramenta; reconhece sinais não verbais de confusão/medo. |
| **4** | Explica procedimentos com clareza, incluindo riscos e alternativas; permite perguntas. |
| **3** | Comunica o essencial; pode ter dificuldade quando paciente é resistente ou ansioso. |
| **2** | Usa jargão técnico sem checar compreensão; ignora sinais de ansiedade do paciente. |
| **1** | Não obtém consentimento informado adequado; omite riscos relevantes; trata o paciente com tom infantilizado ou desrespeitoso. |

### Template — Dimensão 3: Consentimento Informado

| Score | Âncora |
|-------|--------|
| **5** | Antes de qualquer procedimento (exceto urgência genuína), apresenta plano + alternativas + riscos + custos por escrito; obtém TCLE assinado; documenta capacidade de decisão de paciente vulnerável (idoso, menor). |
| **4** | Obtém consentimento verbal e/ou escrito antes de procedimentos relevantes; verifica responsável legal quando aplicável. |
| **3** | Obtém consentimento em procedimentos óbvios (cirúrgicos), mas pode pular em "rotineiros". |
| **2** | Trata consentimento como burocracia; faz paciente assinar sem explicar. |
| **1** | Inicia procedimento sem TCLE em situação não-emergencial; não respeita recusa do paciente; força tratamento em incapaz sem responsável. |

### Template — Dimensão 4: Resposta a Urgências/Emergências

| Score | Âncora |
|-------|--------|
| **5** | Identifica corretamente caracterização de urgência; aciona protocolo institucional; comunica equipe; documenta com timestamp; mesmo fora de horário ou agenda lotada, garante atendimento conforme CFO Art. 11-VII. |
| **4** | Atende urgência de forma adequada; comunica equipe. |
| **3** | Atende urgência clara, mas tem dificuldade em distinguir de "demanda espontânea". |
| **2** | Recusa atendimento em situação ambígua sem consultar colega; prioriza agenda sobre dor severa. |
| **1** | Recusa atendimento em urgência genuína (infração CFO Art. 11-VII); ou atende sem condições técnicas e não encaminha. |

### Template — Dimensão 5: Trabalho em Equipe Interprofissional

| Score | Âncora |
|-------|--------|
| **5** | Solicita e oferece input ativamente entre dentista/TSB/recepção; reconhece limites de seu papel; integra observações de colegas no plano clínico; constrói pontes em vez de muros entre setores. |
| **4** | Comunica-se com colegas de forma clara e respeitosa; aceita feedback. |
| **3** | Faz sua parte sem fricção, mas evita interação além do necessário. |
| **2** | Compete em vez de colaborar; faz fofoca; minimiza contribuição de profissionais auxiliares. |
| **1** | Trata colegas com desrespeito ostensivo; é conivente com erro técnico/ético (vedado pelo CEO Art. 13-IV); rompe sigilo profissional internamente. |

### Template — Dimensão 6: Humanização e Dignidade do Paciente

| Score | Âncora |
|-------|--------|
| **5** | Trata o paciente como pessoa única, não como "caso 14h"; respeita modéstia, dor, medo, limitações financeiras; adapta abordagem para idosos, crianças, pacientes neurodivergentes. |
| **4** | Mantém empatia consistente; chama paciente pelo nome; respeita ritmo e dor. |
| **3** | Empático com pacientes "fáceis"; tem dificuldade com pacientes resistentes ou ansiosos. |
| **2** | Trata paciente com pressa visível; usa tom impessoal; não responde a sinais de medo. |
| **1** | Discrimina (CEO Art. 11-I); humilha; usa gatilhos para forçar venda; expõe paciente em frente a outros (privacidade). |

### Template — Dimensão 7: Sigilo e Privacidade (LGPD)

| Score | Âncora |
|-------|--------|
| **5** | Recusa fornecer info a terceiros sem autorização documentada do titular, mesmo sob pressão de familiar/cônjuge; aplica princípio LGPD de minimização (só compartilha o necessário); registra acessos. |
| **4** | Cumpre sigilo em situações claras; sabe que LGPD se aplica. |
| **3** | Cumpre sigilo formal mas pode ser flexibilizar com familiares "preocupados". |
| **2** | Confirma dados a familiares sem checar autorização; conversa sobre paciente em corredor; deixa prontuário aberto. |
| **1** | Compartilha dados de paciente com terceiros sem autorização; usa info para fins próprios; vaza informação para concorrente. |

### Template — Dimensão 8: Proteção de Vulneráveis

| Score | Âncora |
|-------|--------|
| **5** | Reconhece sinais de violência (Lei Maria da Penha, ECA, Estatuto do Idoso); aborda paciente em segurança; aciona Conselho Tutelar / SINAN no prazo (24h); documenta sem expor vítima a risco; coordena com assistente social. |
| **4** | Reconhece sinais óbvios; sabe que tem dever de notificar. |
| **3** | Reconhece sinais óbvios mas não age sem instrução; tem dúvidas sobre fluxo. |
| **2** | Ignora sinais para "não se envolver"; conversa o tema só com colega. |
| **1** | Realiza tratamento sem investigar achados suspeitos (fere ECA/Lei Maria da Penha); ou expõe vítima a maior risco com abordagem inadequada. |

### Template — Dimensão 9: Reconhecimento de Limites e Educação Permanente

| Score | Âncora |
|-------|--------|
| **5** | Sabe pedir ajuda; encaminha quando fora de competência; busca atualização técnica ativamente; aceita feedback de erro como aprendizado; ensina colegas mais novos. |
| **4** | Reconhece limites em situações claras; participa de capacitações. |
| **3** | Faz o básico de educação continuada; tem dificuldade em admitir não saber. |
| **2** | Realiza procedimentos para os quais não está plenamente capacitado (CEO Art. 11-V); não busca atualização. |
| **1** | Insiste em procedimento além de sua competência mesmo após erro; rejeita feedback; ridiculariza quem aponta limitação técnica. |

### Template — Dimensão 10: Tomada de Decisão Baseada em Evidências

| Score | Âncora |
|-------|--------|
| **5** | Cita literatura recente; integra evidência + experiência clínica + preferência do paciente (modelo EBM); reconhece quando evidência é fraca e comunica incerteza. |
| **4** | Pratica conforme protocolos atualizados; consulta diretrizes CFO/SBC. |
| **3** | Pratica conforme aprendido na graduação; resistente a novos protocolos. |
| **2** | Decisões baseadas em "sempre fiz assim"; ignora protocolo da clínica. |
| **1** | Decisões contra evidência consolidada (ex: amalgama em criança como rotina, sem indicação); resiste a auditoria clínica. |

---

<a id="6-sjt-prontos"></a>
## 6. SJTs PRONTOS POR CARGO — 15 itens + In-Basket

**Notação:**
- `[ADAPTADO]` = cenário modificado a partir de fonte pública (CFO, ENADE, Pearson VUE, etc.)
- `[ÂNCORA: X]` = dimensão BARS primária avaliada
- `[FONTE: ...]` = referência verificável
- Todas as opções são plausíveis (sem "distractor óbvio") e calibradas para Brasil

### Formato padrão por SJT

```
ID | Cenário | 4 alternativas | Resposta-âncora + rationale | Dimensão | Tempo estimado
```

### Configuração da bateria por cargo

| Cargo | Itens SJT | Case aberto | Tempo total | Total de SJTs neste documento |
|-------|-----------|-------------|-------------|------------------------------|
| Dentista | 4 SJTs (sugerido: 8-10 itens) | 1 case clínico | ~25-35 min | 4 prontos |
| Higienista | 3 SJTs (sugerido: 8) | — | ~15-20 min | 3 prontos |
| Recepção | 3 SJTs (sugerido: 10-12) | — | ~20-25 min | 3 prontos |
| Coordenador | 3 SJTs (sugerido: 8) | 1 mini-case | ~25-30 min | 3 prontos + 1 mini-case |
| Admin | 2 SJTs (sugerido: 6-8) | In-basket de 14 itens | ~30-40 min | 2 prontos + in-basket |

---

<a id="6-1-dentista"></a>
### 6.1 DENTISTA — 4 SJTs prontos + 1 case clínico aberto

#### SJT-D1 — Odontofobia durante procedimento

**Cenário (~120 palavras):** Você está realizando uma extração de terceiro molar inferior em uma paciente de 28 anos quando, após a anestesia surtir efeito e você iniciar a luxação com alavanca, ela começa a chorar, agarra seu antebraço com força e diz, em pânico, que não consegue continuar. O alvéolo está parcialmente luxado mas o dente ainda não saiu. Interromper agora deixa o dente em condição instável (risco de fratura, dor, possível necessidade de cirurgia mais complexa). Continuar sem o consentimento ativo dela viola sua autonomia. A auxiliar olha para você esperando uma decisão. **O que você faz?**

**Alternativas:**
- (A) Continua o procedimento rapidamente, dizendo "calma, já está quase acabando" para minimizar o trauma de ter que interromper.
- (B) **Interrompe imediatamente, sutura/protege o alvéolo provisoriamente, explica calmamente o que aconteceu, oferece pausa para respirar e avalia se ela quer (1) tentar novamente em 10 min com técnica de redução de ansiedade ou (2) reagendar com sedação consciente. Documenta tudo.** ✓
- (C) Para o procedimento e pede para a paciente sair do consultório, registrando a recusa.
- (D) Solicita à auxiliar que segure as mãos da paciente enquanto você termina rapidamente para "resolver".

**Resposta-âncora: B.**
**Rationale:** A é violação clara do CFO Art. 11-X (continuar sem consentimento ativo) e Art. 11-VIII (desrespeitar). C é abandono terapêutico (CFO Art. 11-VI) sem proteção do alvéolo, criando risco clínico. D é coerção física, vedação ética grave + responsabilização legal. B preserva autonomia, segurança clínica e relação terapêutica.

**[ÂNCORA: D6 Humanização + D3 Consentimento + D9 Reconhecimento de Limites]**
**[FONTE: BlackStone Tutors dental scenarios + CFO Art. 11; ADAPTADO contexto BR]**
**Tempo estimado:** 2 min

---

#### SJT-D2 — Pedido estético sem indicação clínica

**Cenário:** Uma paciente de 25 anos, primeira consulta, chega para "consulta de avaliação". Diz que quer extrair um pré-molar superior saudável "para afinar o rosto", influenciada por vídeos no Instagram. Você examina: dente íntegro, sem indicação ortodôntica, sem comprometimento periodontal. Ela diz: "Outras clínicas disseram que fazem. Meu dinheiro, meu corpo, minha decisão. Você só precisa executar." **Como você responde?**

**Alternativas:**
- (A) Realiza a extração, respeitando a autonomia da paciente adulta plenamente capaz.
- (B) **Recusa o procedimento explicando os riscos funcionais (oclusão, ATM) e estéticos de longo prazo, oferece alternativas baseadas em evidência (ortodontia para alinhamento, bichectomia se objetivo é "afinar"), entrega plano por escrito e oferece encaminhamento a especialista — documentando tudo no prontuário.** ✓
- (C) Encaminha para outro dentista da clínica sem dar parecer.
- (D) Aceita realizar mediante TCLE robusto e pagamento à vista.

**Resposta-âncora: B.**
**Rationale:** A e D ferem CFO Art. 11-V (executar tratamento desnecessário) e Art. 11-IV (deixar de esclarecer alternativas). C é evasão de responsabilidade — paciente vai a outro colega despreparado. B é "should do" clinicamente: respeita autonomia mas não terceiriza juízo profissional. **Princípio: autonomia ≠ obrigação do profissional executar tudo que paciente pede.**

**[ÂNCORA: D1 Ética + D2 Comunicação + D10 EBM]**
**[FONTE: ACD Ethical Dilemmas + BlackStone + CFO Art. 11; ADAPTADO]**
**Tempo:** 2 min

---

#### SJT-D3 — Erro de colega descoberto em radiografia (disclosure)

**Cenário:** Paciente de 47 anos chega encaminhada por outra clínica, queixando-se de "dor que não passa" no dente 36, há 8 meses, mesmo após "endodontia bem feita" pelo colega anterior. Ao tirar a radiografia periapical, você vê com nitidez: **lima endodôntica fraturada no terço apical do canal mesial, com lesão periapical de ~4mm**. O paciente nunca foi informado disso pelo dentista anterior. **O que você faz?**

**Alternativas:**
- (A) Trata o dente sem mencionar o achado para não criar conflito interprofissional; comunica ao colega depois.
- (B) Liga imediatamente para o dentista anterior antes de falar com a paciente, para "alinhar narrativa".
- (C) Apenas encaminha para endodontista sem explicar à paciente o que viu.
- (D) **Mostra a radiografia à paciente, explica clinicamente o que vê (sem julgar o colega), as implicações (lesão periapical), as opções de retratamento (endo retratamento, apicectomia, extração+implante), responde dúvidas, registra tudo no prontuário e sugere que ela converse diretamente com o dentista anterior — entregando cópia do exame.** ✓

**Resposta-âncora: D.**
**Rationale:** A e C ferem CFO Art. 11-IV (deixar de esclarecer) e Art. 11-XII (opor-se a fornecer relatórios sobre diagnóstico). B é conivência com omissão (CFO Art. 13-IV vedado). D respeita transparência ética + autonomia da paciente, sem fazer julgamento moral do colega (juízo é do CRO, não seu). **Caso TDA Perks (real): ambos dentistas processados — quem omite assume corresponsabilidade.**

**[ÂNCORA: D1 Ética + D2 Comunicação + D5 Trabalho em equipe interprofissional]**
**[FONTE: TDA Perks caso real + CFO Art. 11/13]**
**Tempo:** 3 min

---

#### SJT-D4 — Pressão da rede para vender clareamento

**Cenário:** Sexta-feira, 17h. O coordenador da unidade chama você na sala dele e diz: "Sua taxa de conversão de orçamentos de clareamento está em 18%, contra 35% da média da rede. A partir da próxima segunda, todo paciente em consulta de avaliação ou rotina sai com orçamento de clareamento na mão, indicação clínica ou não. É política da diretoria. Se não bater meta em 60 dias, conversamos sobre o seu vínculo." **O que você faz?**

**Alternativas:**
- (A) Aceita a instrução para preservar o vínculo profissional; "clareamento é seguro mesmo".
- (B) Começa a oferecer apenas para pacientes que "talvez precisem" como meio-termo.
- (C) **Explica formalmente (por e-mail registrado) que indicar procedimento sem necessidade configura infração ao Código de Ética (CFO Art. 11-V e Art. 11-III), expõe a clínica a denúncia no CRO e a você a sanção pessoal; propõe alternativas para meta (ex: melhor comunicação de indicações reais, follow-up de pacientes elegíveis) e solicita reunião com a coordenação clínica (não só comercial) para revisar a política.** ✓
- (D) Pede transferência para outra unidade da rede.

**Resposta-âncora: C.**
**Rationale:** A é cumplicidade em infração ética — responsabilidade pessoal do CD continua mesmo sob ordem da clínica (CFO Art. 9-XIV). B é meio-termo sem proteção. D evita o conflito mas não resolve o problema sistêmico. C é assertividade ética com proposta construtiva — registra por escrito (proteção legal), aponta riscos da clínica (não só seus), oferece alternativa. **Princípio: assédio moral por meta ilegal não é defensável; CD responde pessoalmente.**

**[ÂNCORA: D1 Ética + D5 Trabalho em equipe + D9 Limites]**
**[FONTE: SciELO problemas éticos vivenciados + CFO; ADAPTADO]**
**Tempo:** 3 min

---

#### Case Clínico Aberto — DENTISTA (resposta livre, scoring por rubric)

**Tempo: 15-20 min. Resposta em texto livre, máx 400 palavras.**

> **Caso:** João, 52 anos, paciente novo na unidade Beauty Smile, chega com queixa de "dor forte no maxilar direito há 3 dias". Ao exame: extensa lesão cariosa no dente 16 com mobilidade grau II, tecido mole inflamado com saída de pus à digitopressão, halitose intensa. Glicemia capilar do dia (paciente trouxe da farmácia): 312 mg/dL. Pressão arterial aferida: 165/100 mmHg. Paciente diz não tomar nenhum medicamento, "não acredita em médico" há 5 anos, fuma 20 cig/dia, etilista social. Paciente solicita que você "tire a dor de qualquer jeito hoje, doutor, eu trabalho como pedreiro, não posso ficar parado". Está sozinho, sem acompanhante.
>
> **Descreva detalhadamente:**
> 1. Sua avaliação diagnóstica e de risco (clínico + sistêmico)
> 2. Conduta imediata na consulta de hoje
> 3. Plano de tratamento odontológico de curto/médio prazo
> 4. Encaminhamentos e orientações além da odontologia
> 5. Como você comunica isso ao paciente, considerando as resistências dele

**Rubric de avaliação (0-5 por dimensão, score total = soma ponderada):**

| Dimensão | Peso | O que procurar | Red flag |
|----------|------|----------------|----------|
| **Raciocínio clínico (D10)** | 25% | Identifica abscesso periapical/periodontal + diabetes descompensada + HAS estágio 2 não controlada + tabagismo + risco cardiovascular agudo | Não menciona glicemia; trata só o dente |
| **Tomada de decisão (D10)** | 20% | Reconhece que extração ou intervenção em paciente com glicemia >300 + HAS 165/100 é alto risco; opta por drenagem + antibioticoterapia + analgesia + encaminhamento URGENTE para PSF/UPA antes de procedimento eletivo; documenta TCLE | Realiza extração na hora; ignora condições sistêmicas |
| **Comunicação (D2/D6)** | 25% | Linguagem acessível para pedreiro com baixa escolaridade implicada; reconhece e responde à pressão financeira/laboral; não infantiliza; constrói aliança terapêutica para encaminhamento médico | Usa jargão; ignora resistência; impõe encaminhamento sem explicar o porquê |
| **Ética/Limites (D1/D9)** | 15% | Reconhece limite da odontologia frente a quadro sistêmico; não realiza procedimento eletivo; documenta orientações e recusa do paciente se houver | Realiza procedimento "porque o paciente pediu" |
| **Continuidade do cuidado (D5)** | 15% | Plano claro de retorno; tenta articular com PSF (se SUS) ou rede privada; oferece atestado para procurar serviço; registro de tudo | Apenas encaminha verbalmente; sem follow-up |

**Total: 0-25 pts. ≥18 = aprovado; 13-17 = entrevista; <13 = reprovado.**

**[FONTE: ENADE Odontologia 2013/2016 + Caso Today's RDH paciente comprometida sistemicamente; CRIADO para Beauty Smile]**

---

<a id="6-2-higienista"></a>
### 6.2 HIGIENISTA / TSB / ASB — 3 SJTs prontos

#### SJT-H1 — Lesão suspeita durante limpeza

**Cenário:** Durante uma profilaxia de rotina em paciente do sexo masculino, 54 anos, fumante de longa data, você (TSB) observa, ao iluminar o terço posterior da boca, uma **mancha branca endurecida com ~8 mm na borda lateral direita da língua**, com aparência fixa e bordas mal definidas. A paciente diz "já tinha visto isso, não dói, não importa." A dentista responsável está atendendo outro paciente em sala adjacente. **O que você faz?**

**Alternativas:**
- (A) Termina a profilaxia em silêncio para não alarmar o paciente; deixa anotação para a dentista ver depois.
- (B) Diz ao paciente: "Isso aqui pode ser câncer, você precisa ir ao hospital amanhã."
- (C) Registra no prontuário e encerra; "não é minha função diagnosticar lesão".
- (D) **Pausa o procedimento educadamente, sem alarmar, finaliza um momento adequado da raspagem, solicita à recepção que avise a dentista que precisa de uma avaliação de "achado oral" antes de você liberar o paciente, documenta tamanho/localização/aspecto/duração relatada da lesão, e segue o fluxo da clínica para encaminhamento se a dentista confirmar suspeita.** ✓

**Resposta-âncora: D.**
**Rationale:** A é negligência clínica e omissão (atraso de meses pode ser fatal em câncer oral). B é diagnóstico fora de competência + alarme indevido (TSB pode IDENTIFICAR sinais, não diagnosticar — Lei 11.889/2008). C é fuga de responsabilidade — registrar sem comunicar a dentista é omissão. D respeita o escopo (TSB identifica + comunica + documenta) e ativa a cadeia de cuidado.

**[ÂNCORA: D9 Limites + D5 Trabalho em equipe + D1 Ética]**
**[FONTE: Dimensions of Dental Hygiene + Lei 11.889/2008 + ABENO; ADAPTADO]**
**Tempo:** 2 min

---

#### SJT-H2 — Paciente fumante resistente à cessação

**Cenário:** Você (higienista/TSB) está encerrando a raspagem supragengival de um paciente de 38 anos com gengivite moderada generalizada e bolsas de 4mm em molares. Ele fuma 15 cigarros/dia há 18 anos. Quando você comenta sobre o tabaco, ele te interrompe: "Olha, eu já sei que é ruim. Todo mundo fica enchendo o saco. Não vou parar agora, não tente. Termina logo aí." **Como você responde?**

**Alternativas:**
- (A) Insiste educadamente em listar os malefícios do cigarro para a saúde bucal e geral, citando estudos.
- (B) Não toca mais no assunto para preservar o vínculo terapêutico.
- (C) Anota no prontuário "paciente não-aderente; recusa orientação" e encerra.
- (D) **Reconhece a autonomia dele explicitamente ("entendo, é sua decisão"), pergunta se ele autoriza você a explicar em 1 minuto como o tabaco está afetando especificamente o que vocês acabaram de tratar (gengivite + bolsas), entrega informação curta e objetiva sem repetir, oferece um folheto com canais de apoio (CHE, SUS) caso mude de ideia no futuro, e documenta a conversa de forma neutra.** ✓

**Resposta-âncora: D.**
**Rationale:** A é "lecturing" — pacientes resistentes endurecem com pressão (entrevista motivacional 101). B é abandono educacional (CFO Art. 9 e DCN 2021 — "promoção de saúde" é dever). C é punitivo e estigmatizante — anotação registra paciente "ruim" em vez de comportamento. D segue princípios de **entrevista motivacional baseada em evidência** (PMC NIH 2019): respeita autonomia + entrega informação adaptada + abre porta sem fechar relação.

**[ÂNCORA: D2 Comunicação + D6 Humanização + D9 Educação Permanente]**
**[FONTE: PMC Motivational Interviewing for Hygienists 2019; ADAPTADO BR]**
**Tempo:** 2 min

---

#### SJT-H3 — Suspeita de negligência infantil

**Cenário:** Uma criança de 6 anos chega para profilaxia acompanhada da avó. Você nota: 8 cáries cavitadas (várias com comprometimento pulpar visível), gengivite generalizada, halitose marcante, roupas sujas e desproporcionais ao tamanho. A avó diz: "Criança é assim mesmo, não gosta de escovar. Os pais trabalham muito, eu fico com ela quando posso." A criança está apática, não interage. Você é técnica em saúde bucal (TSB). **O que você faz?**

**Alternativas:**
- (A) Realiza a profilaxia normalmente; orienta a avó sobre escovação ao final; encaminha para o dentista para avaliação das cáries.
- (B) Pergunta diretamente para a avó: "A criança está sendo bem cuidada em casa?"
- (C) **Realiza o atendimento com gentileza, registra detalhadamente todos os achados (lesões dentárias, condição geral, relato textual da responsável, comportamento da criança), comunica imediatamente à dentista responsável antes de liberar a paciente, e — conforme o protocolo da clínica e a Lei 8.069/90 ECA Art. 13 — aciona o fluxo de notificação ao Conselho Tutelar (ficha SINAN) se houver concordância clínica de suspeita de negligência.** ✓
- (D) Faz um relatório separado sobre a criança e entrega à coordenação no fim do dia.

**Resposta-âncora: C.**
**Rationale:** A é omissão grave: ECA Art. 13 + Art. 245 (notificação compulsória de suspeita); SINAN Saúde Bucal obriga notificação em 24h. CD/TSB são profissionais notificantes pela Lei Maria da Penha (orientação CFO 2024) e ECA. B é abordagem inadequada que pode colocar a criança em risco se houver violência (avó pode reagir, levar a criança e nunca mais voltar). D atrasa demais. C segue protocolo, documenta, comunica ao dentista (não decide sozinha — trabalho em equipe), e respeita escopo de TSB.

**[ÂNCORA: D8 Proteção de Vulneráveis + D1 Ética + D5 Equipe]**
**[FONTE: RDH Magazine + Colgate Oral Health Network + ECA + ENADE 2013 Q.46; ADAPTADO BR]**
**Tempo:** 3 min

---

<a id="6-3-recepcao"></a>
### 6.3 RECEPÇÃO — 3 SJTs prontos

#### SJT-R1 — Paciente com dor sem horário e sem dinheiro

**Cenário:** Segunda-feira, 11h. Agenda 100% lotada até 18h. Uma mulher de 32 anos entra na recepção segurando o lado direito do rosto, visivelmente inchado, lacrimejando. Diz: "Estou com dor há 3 dias, não consigo dormir, não tenho convênio, não tenho dinheiro hoje, mas posso pagar amanhã. Por favor, me atendam." Outros 4 pacientes estão na sala de espera observando. **O que você faz?**

**Alternativas:**
- (A) Diz que a agenda está lotada e sugere que ela ligue às 8h da manhã seguinte para tentar encaixe.
- (B) Aceita o encaixe imediatamente sem avisar a equipe clínica, registra como "urgência" e a coloca na fila.
- (C) **Conduz a paciente discretamente a um espaço reservado ou a uma cadeira menos visível, comunica imediatamente ao(à) dentista clínico responsável que há suspeita de urgência odontológica, registra os dados básicos da paciente, e executa o protocolo da clínica para situação de urgência sem pagamento imediato (avaliação clínica primeiro; se confirmar urgência, opções de pagamento posterior, encaixe ou encaminhamento ao serviço público mais próximo). Tudo conforme orientação do dentista.** ✓
- (D) Pede que ela espere sentada sem dar previsão e sem comunicar a equipe.

**Resposta-âncora: C.**
**Rationale:** A é violação CFO Art. 11-VII (deixar de atender em urgência quando único disponível) — recepção decidir agenda lotada antes da avaliação clínica é assumir um juízo que não é dela. B descumpre fluxo, sobrecarrega o dentista sem aviso e quebra agenda dos outros pacientes sem critério. D é omissão. C respeita ambas as obrigações: dever ético/legal de avaliar urgência + estrutura operacional da clínica. **Recepção tria, dentista decide.**

**[ÂNCORA: D4 Urgências + D6 Humanização + D5 Equipe]**
**[FONTE: VLV Advogados + MGE Management + CFO Art. 11-VII; ADAPTADO BR]**
**Tempo:** 2 min

---

#### SJT-R2 — Familiar pedindo informações do paciente (LGPD)

**Cenário:** Você atende o telefone. Voz masculina diz: "Bom dia, sou o Sr. Carlos, pai da Marina, ela tem 22 anos, atende aí. Estou muito preocupado com ela, faz dias que não fala comigo. Pode me confirmar se ela tem consulta marcada hoje? E o que está sendo tratado? Sou eu que pago tudo dela." **Como você responde?**

**Alternativas:**
- (A) Confirma o horário da consulta (afinal, "não revela diagnóstico") mas não fala do tratamento.
- (B) Pede o CPF dele e verifica no sistema se ele consta como responsável; se sim, libera as informações.
- (C) **Informa educadamente: "Sr. Carlos, entendo sua preocupação, mas por força da LGPD e do sigilo profissional, não posso confirmar nem agenda nem dados clínicos de pacientes maiores de 18 anos para terceiros, mesmo familiares próximos, sem autorização expressa e documentada da própria paciente. Sugiro entrar em contato direto com a Marina. Caso seja uma situação de emergência, ligue para o SAMU (192)."** ✓
- (D) Diz que vai "verificar com a paciente e retornar"; em seguida, liga para a Marina perguntando se pode passar informações ao pai.

**Resposta-âncora: C.**
**Rationale:** A já é violação LGPD (Art. 7 — base legal exige consentimento ou hipótese legal específica; "preocupação familiar" não está). B confunde responsabilidade financeira com autorização de acesso a dados de saúde — paciente é ADULTA, dados de saúde são dela. D parece bem-intencionado mas (1) coloca a Marina em situação coercitiva ("seu pai ligou, autoriza?"); (2) viola LGPD no momento mesmo da ligação para a Marina (já confirma ao pai indiretamente que ela é paciente). C é correto: regra clara + alternativa segura (canal direto + emergência via 192). **CFO Art. 9-VIII e LGPD Art. 7 + 11.**

**[ÂNCORA: D7 Sigilo/LGPD + D1 Ética + D2 Comunicação]**
**[FONTE: BlackStone Tutors Cenário 5 + LGPD + CFO Art. 9; ADAPTADO BR]**
**Tempo:** 2 min

---

#### SJT-R3 — Reclamação verbal agressiva sobre cobrança

**Cenário:** Paciente do sexo masculino, ~55 anos, entra na recepção alterado às 14h30, na frente de outros 6 pacientes na sala de espera. Diz, em voz alta: "Vocês me cobraram R$ 480 que o convênio Odontoprev DEVERIA ter coberto! Isso é roubo! Vou no Procon, vou postar no Reclame Aqui, vou processar essa porcaria!" Ele agita o boleto. Você sabe que provavelmente houve uma glosa do convênio que o financeiro ainda não comunicou ao paciente. **O que você faz?**

**Alternativas:**
- (A) Pede que ele "fale mais baixo, por favor, há outros pacientes" para conter a situação.
- (B) Diz que recepção não trata de financeiro e fornece o telefone do SAC da Odontoprev.
- (C) **Mantém tom calmo e baixo, diz ao senhor: "Sr. [nome], entendo a frustração, vou olhar isso com o senhor agora mesmo, vamos para uma sala onde podemos conversar com tranquilidade, ok?" Conduz a uma sala reservada, ouve sem interromper, verifica no sistema o histórico da autorização e da glosa, explica de forma objetiva o que ocorreu, escala para o financeiro/coordenação se não conseguir resolver, e oferece compromisso claro de retorno em prazo definido.** ✓
- (D) Oferece desconto imediato de 50% para "acalmá-lo" sem consultar a coordenação.

**Resposta-âncora: C.**
**Rationale:** A pode escalar (paciente sente-se silenciado em frente a testemunhas). B é evasão e empurra problema para fora — viola humanização (CFO Art. 9-VII estendido por equipe). D resolve curto prazo mas (1) cria precedente para futuros pacientes barulhentos; (2) recepção não tem autoridade orçamentária; (3) não resolve a causa-raiz da glosa. C é o protocolo correto: privacidade primeiro, escuta ativa, dados objetivos, escalação adequada, compromisso de prazo.

**[ÂNCORA: D2 Comunicação + D6 Humanização + D5 Equipe]**
**[FONTE: Prontuário Verde glosas + Zigpoll conflict resolution + Allstar Dental Academy; ADAPTADO BR]**
**Tempo:** 3 min

---

<a id="6-4-coordenador"></a>
### 6.4 COORDENADOR — 3 SJTs + 1 mini-case de gestão

#### SJT-C1 — Performance caindo + reclamações

**Cenário:** Você é coordenador da unidade Beauty Smile-Lapa há 8 meses. A Dra. Cláudia, 42 anos, dentista mais antiga da unidade (4 anos de casa) e tecnicamente a mais reconhecida pela rede, recebeu nos últimos 30 dias **4 reclamações escritas** de pacientes diferentes mencionando: "frieza", "pressa", "sensação de descaso". Sua produção caiu 27% no mesmo período. Ela sempre foi confiável. Ainda não houve conversa formal sobre isso. **Qual sua primeira ação?**

**Alternativas:**
- (A) Emite advertência formal por escrito para registrar os fatos antes que escalem mais.
- (B) Redistribui parte dos pacientes dela para outros dentistas da unidade sem conversar com ela ainda.
- (C) **Agenda conversa reservada e acolhedora com a Dra. Cláudia (não na clínica, se possível), apresenta os dados de forma objetiva mas não-punitiva ("notei alguns sinais que quero entender com você"), pergunta sobre carga de trabalho, situação pessoal, mudanças recentes, motivação; constrói junto um plano de acompanhamento por 60 dias com check-ins semanais; só formaliza PIP se não houver retomada.** ✓
- (D) Aguarda mais 30 dias para ter "mais dados" antes de agir.

**Resposta-âncora: C.**
**Rationale:** A pula a etapa diagnóstica — sinais (queda de produção + reclamações novas em profissional sólida) sugerem causa pessoal/burnout/conflito não resolvido, não desempenho técnico inadequado. PIP/advertência sem investigação é gestão punitiva e cara (perde profissional valiosa, sinaliza cultura medieval). B é gestão por trás (cria desconfiança e percepção de injustiça quando a Dra. descobrir). D é negligência: 4 reclamações + 27% queda já é dado robusto. C segue gestão humanizada baseada em evidência (HR for Health PIP guide; Spear Education): conversa exploratória → plano construído junto → escalação só se necessário.

**[ÂNCORA: D5 Liderança + D6 Humanização + D2 Comunicação]**
**[FONTE: WealthFD PIP guide + Colgate Professional + Clinicorp burnout; ADAPTADO BR]**
**Tempo:** 3 min

---

#### SJT-C2 — Conflito entre dois dentistas

**Cenário:** Os Drs. André (45a, 6 anos de casa, foco em prótese/implante) e Bruno (32a, 1 ano de casa, foco em clínica geral/convênios) compartilham agenda de terças/quintas. André reclama que Bruno "pega os melhores casos" (implantes, próteses) e ele fica com convênios de baixa rentabilidade. Bruno reclama que André "trata mal os pacientes mais simples". Na quinta passada, os dois discutiram **na frente de 2 auxiliares e 1 paciente na sala**. As auxiliares vieram falar com você. **Qual sua sequência de ações?**

**Alternativas:**
- (A) Reúne os dois imediatamente em sua sala e exige que se acertem ali na sua frente.
- (B) Decide quem está certo (com base em dados de produção e satisfação) e comunica sua decisão a ambos.
- (C) Separa as agendas completamente: André só atende terças, Bruno só atende quintas. Resolvido.
- (D) **Conversa com cada um separadamente nas próximas 48h para ouvir cada perspectiva sem julgamento; identifica fatos vs interpretações; coleta dados objetivos de distribuição de casos (quantos implantes/próteses cada um pegou nos últimos 90 dias, e por qual critério); reúne os dois com mediação clara propondo regras transparentes de distribuição (ex: rotação programada, especialidade declarada); formaliza a regra; estabelece norma explícita: "qualquer discussão profissional é em sala reservada, nunca diante de paciente ou equipe — próxima ocorrência é advertência".** ✓

**Resposta-âncora: D.**
**Rationale:** A escala antes de diagnosticar — reunião conjunta sem preparação é arena, não mediação. B é unilateral: sem dados objetivos, é palpite; perde a ambos. C parece resolver mas (1) reduz capacidade da unidade; (2) não resolve a causa-raiz (critério opaco); (3) deixa ressentimento. D segue **modelo clássico de mediação** (Spear Education + Colgate Professional Conflict Resolution Part 1): escuta separada → fatos → mediação com proposta → regra formalizada → norma explícita sobre comportamento em público (CFO Art. 12 — respeito interprofissional).

**[ÂNCORA: D5 Liderança + D1 Ética + D2 Comunicação]**
**[FONTE: Colgate Conflict Resolution Part 1 + Spear Education + DentistryIQ; ADAPTADO BR]**
**Tempo:** 4 min

---

#### SJT-C3 — Review negativo viral

**Cenário:** Quinta-feira, 14h. Um review de 1 estrela no Google aparece na unidade Beauty Smile-Lapa. Título: "**NEGLIGÊNCIA QUASE ME MATOU NESSA CLÍNICA**". Texto: descreve reação alérgica após extração no último sábado, "ninguém soube tratar", foi para PS sozinho. Em 6 horas: **47 curtidas, 12 compartilhamentos, 3 comentários replicando "também tive problema lá"**. Você é o coordenador. Você ainda não tem todos os fatos: Dr. Bruno atendeu, mas o prontuário desse dia ainda não foi fechado pelo dentista. **Sua próxima ação nas próximas 2 horas:**

**Alternativas:**
- (A) Apaga ou esconde a resposta da clínica que estava agendada (se houver) e aguarda o caso "esfriar" — review sumirá em algumas semanas.
- (B) Responde publicamente de forma defensiva: explica que o paciente está exagerando e pede que entre em contato.
- (C) Aciona o jurídico antes de qualquer resposta pública e permanece em silêncio por 48h até parecer formal.
- (D) **Em <30 min: contata o Dr. Bruno por telefone para entender o que ocorreu sábado, recupera o prontuário e qualquer registro relacionado; em <60 min: publica resposta pública breve, profissional, sem admitir nem negar fatos não verificados, reconhecendo que a clínica leva qualquer relato a sério, está investigando internamente, e oferece canal direto privado (e-mail/WhatsApp da coordenação) para o paciente. Em paralelo, inicia investigação interna (revisão do prontuário, conversa com a equipe presente, verifica protocolo de emergência).** ✓

**Resposta-âncora: D.**
**Rationale:** A é negação — review fica indexado, gera prints viralizáveis, comunica para outros pacientes que clínica não responde. B é arriscado: sem fatos verificados, defensividade pública pode comprovar a queixa em audiência se houver processo, e amplifica o conflito. C ignora janela de virais (Google reviews mais visíveis nas primeiras 24h); silêncio é interpretado como confirmação. D segue modelo de gestão de crise digital (ClinicaIdeal + DNA360): rapidez + tom regulado + canal privado + ação interna em paralelo. **Princípio: público recebe acolhimento + profissionalismo; investigação acontece off-stage.**

**[ÂNCORA: D2 Comunicação + D6 Humanização + D5 Equipe]**
**[FONTE: ClinicaIdeal gestão de reputação online + DNA360; ADAPTADO BR]**
**Tempo:** 4 min

---

#### Mini-Case de Gestão — COORDENADOR (resposta livre, ~10 min)

> **Cenário:** Você assumiu há 3 meses a coordenação da unidade Beauty Smile-Tatuapé, que era a unidade de PIOR performance da rede. Diagnóstico que você fez na chegada:
>
> - **Faturamento**: 30% abaixo da média das unidades da rede
> - **Rotatividade de auxiliares**: 6 saídas em 12 meses
> - **NPS de pacientes**: 42 (média da rede: 71)
> - **Equipe**: 4 dentistas (1 sócio veterano, 3 contratados), 3 auxiliares, 2 recepcionistas, 1 ASB
> - **Estrutura física**: 4 cadeiras, sala de raio-X compartilhada
> - **Convênios**: 60% do faturamento (Odontoprev, Bradesco, SulAmérica)
>
> Você tem 90 dias para apresentar à diretoria um plano de virada. Recursos: você pode pedir até R$ 50 mil em investimento + tem autonomia para reestruturar equipe (até 1 desligamento sem aprovação).
>
> **Em até 400 palavras, descreva:**
> 1. Suas 3 hipóteses prioritárias sobre as causas-raiz dos problemas (não trate como "todos os 4 problemas têm a mesma causa")
> 2. Como você vai testar cada hipótese nos primeiros 30 dias (ações concretas, KPIs, dados a coletar)
> 3. Sua decisão de reestruturação de equipe (se houver) e o critério
> 4. Onde investe os R$ 50k e por quê
> 5. KPI principal que você vai apresentar à diretoria no dia 90 e a meta

**Rubric de avaliação (1-5 cada):**

| Dimensão | O que procurar | Red flag |
|----------|----------------|----------|
| **Pensamento sistêmico** | Conecta rotatividade a NPS a faturamento; vê causas-raiz, não sintomas | Trata cada métrica como problema isolado |
| **Diagnóstico antes de ação** | Hipóteses claras + plano de teste; coleta dados antes de decidir | Sai listando ações sem evidência |
| **Decisão sobre pessoas** | Critério explícito (performance + valores + cabe na cultura?); humano + firme | Demite sem critério OU evita decisão |
| **Alocação de capital** | Justifica ROI; investe em alavanca primária (não em tudo) | Distribui 50k em 5 itens sem priorização |
| **Comunicação executiva** | KPI claro, mensurável, com baseline e meta | "Melhorar tudo" sem número |

---

<a id="6-5-admin"></a>
### 6.5 ADMIN — 2 SJTs + In-Basket de 14 itens

#### SJT-A1 — Conformidade Trabalhista + Ética

**Cenário:** Você é admin/RH da unidade. A auxiliar Joana, 28a, está há 1a8m na clínica. Vem trabalhando com olheiras profundas há 3 semanas, pediu adiantamento de R$ 800 ontem mencionando "emergência familiar", e hoje chegou 40 min atrasada. O coordenador diz: "Joana está dando trabalho, vamos demitir e contratar outra. Resolve isso esta semana." Você não tem certeza se a "queda" da Joana tem causa pessoal/saúde. **O que você faz?**

**Alternativas:**
- (A) Inicia o processo de desligamento como o coordenador pediu — autoridade dele, sua função é executar.
- (B) Demite a Joana com justa causa por atraso e baixa performance.
- (C) **Solicita ao coordenador uma reunião para alinhamento, expõe que decisão de desligamento sem documentação prévia (advertências escritas, registros de baixa performance, conversa com a colaboradora) gera risco trabalhista alto (CLT Art. 482 exige base sólida para justa causa); propõe alternativa: conversa privada com a Joana primeiro para entender o quadro (saúde, família, aprovação para apoio social/RH se houver), advertência verbal documentada se for o caso, e PIP de 30 dias se não houver causa de saúde — só depois desligamento sem justa causa se a coordenação mantiver decisão.** ✓
- (D) Conversa com a Joana primeiro por iniciativa própria, sem alinhar com o coordenador.

**Resposta-âncora: C.**
**Rationale:** A é cumplicidade em decisão potencialmente arbitrária — admin/RH tem dever de fiduciary à clínica, incluindo proteger contra processos. B é pior: justa causa sem documentação é reclamatória trabalhista certa. D é insubordinação organizacional — pula a hierarquia. C é assertivo, baseado em CLT, oferece alternativa concreta, protege a clínica E a colaboradora. **Princípio: admin tem voz técnica; "executar ordem" não cobre risco legal mal calculado.**

**[ÂNCORA: D1 Ética + D5 Equipe + D9 Limites + Conformidade Trabalhista]**
**[FONTE: HR for Health + CLT Art. 482; ADAPTADO BR]**
**Tempo:** 3 min

---

#### SJT-A2 — Priorização sob pressão

**Cenário:** São 9h45 de uma segunda-feira. Você (admin da unidade) ainda não terminou de organizar os 14 itens do in-basket da manhã (ver §In-Basket abaixo). Recebe simultaneamente: (a) o coordenador entra em reunião com a diretoria daqui 15 min e quer "um resumo rápido" do status financeiro da unidade; (b) uma paciente reclamando no balcão sobre cobrança; (c) WhatsApp da rede pedindo posição sobre auditoria do CRO. **Sua próxima ação:**

**Alternativas:**
- (A) Atende a paciente primeiro (cliente sempre primeiro).
- (B) Para tudo e produz o resumo financeiro para o coordenador (chefia pediu).
- (C) Responde primeiro à rede sobre o CRO (autoridade externa).
- (D) **Pede 60 segundos ao coordenador para preparar uma síntese pré-pronta de 2 linhas (caixa atual + faturamento mês até a data) suficiente para os 15 min de reunião dele; aciona a recepção para acolher a paciente em sala reservada com previsão de retorno em 15 min; responde ao WhatsApp da rede com "Recebido, retorno até 11h com posição" para gerenciar expectativa; só então retoma o in-basket.** ✓

**Resposta-âncora: D.**
**Rationale:** A, B e C escolhem 1 stakeholder e ignoram os outros 2 — todos vão escalar, criando crise maior. D aplica matriz Eisenhower com **batch processing** + delegação tática (recepção acolhe paciente) + gerenciamento de expectativa (rede recebe ETA, não silêncio) + atendimento da urgência real do coordenador (resumo de 2 linhas em 60s). **Princípio: admin produtivo não escolhe — sequencia.**

**[ÂNCORA: Priorização + D5 Equipe + D2 Comunicação]**
**[FONTE: GraduatesFirst in-tray + HiPeople methodology; ADAPTADO BR]**
**Tempo:** 3 min

---

#### IN-BASKET EXERCISE — ADMIN (~30-40 min, resposta estruturada)

**Cenário de contextualização:**
> Você é administrativo(a) da clínica Beauty Smile, unidade Lapa, São Paulo. São **8h20 de segunda-feira**. A coordenadora está em reunião com a diretoria até **10h** e não pode ser interrompida (ordem expressa dela). Você tem até **11h** para organizar e iniciar a resolução dos itens abaixo. A clínica abre às 8h e o primeiro paciente chega às 9h. Há 3 dentistas, 2 auxiliares, 1 TSB, 2 recepcionistas no expediente.
>
> Os **14 itens** chegaram entre 7h45 e 8h20. Você tem **100 minutos** e precisa: (1) classificar urgência/importância de cada item; (2) decidir o que faz pessoalmente, o que delega, o que adia; (3) executar pelo menos os itens críticos antes das 11h; (4) deixar lista pronta para a coordenadora.

**Os 14 itens:**

| # | Tipo | Conteúdo |
|---|------|----------|
| 1 | WhatsApp paciente | "Me cobraram R$ 320 de copagamento ontem, o convênio Odontoprev DEVERIA ter coberto. Se não resolverem hoje, deixo review negativo no Google e Procon" |
| 2 | E-mail fornecedor | Boleto de R$ 4.200 (materiais clínicos) vence HOJE 18h. Sem pagamento, suspende entrega de amanhã (anestésico + luvas) |
| 3 | E-mail RH (Joana) | "Preciso de adiantamento de R$ 800, situação familiar de emergência, urgente" |
| 4 | Nota colega | "CRO ligou sexta, vai pedir hoje 5 prontuários de 2024 (auditoria de rotina) — entrega até amanhã 9h" |
| 5 | E-mail candidato | "Fui aprovado no processo? Tenho outra proposta, preciso responder até hoje 11h" |
| 6 | Sistema | 3 NFs de procedimentos de sexta ainda não emitidas — Bradesco Dental bloqueia repasse se não receberem hoje |
| 7 | E-mail Odontoprev | "Procedimento código 87000147 do paciente João Silva GLOSADO por ausência de autorização prévia. Prazo de recurso: 5 dias úteis" |
| 8 | Calendário | Reunião de equipe semanal marcada para 9h — coordenadora ausente, você não sabe se cancela, adia ou conduz |
| 9 | E-mail ANVISA | "Alerta de RECALL: Autoclave modelo SterilMax V2 — lote 2024-7B com falha no sensor de temperatura. Verificar nº de série imediatamente" |
| 10 | E-mail RH (Carlos) | "Apresentei atestado médico 3 dias mas não entreguei físico — pode ser foto no WhatsApp?" |
| 11 | Ligações perdidas | 3 chamadas do laboratório de prótese parceiro — sem mensagem |
| 12 | E-mail rede | "Diretoria solicita relatório de produção de março até quarta-feira" |
| 13 | Nota sistema | Dr. Fábio anotou: "Paciente VIP — ligar para confirmar consulta das 14h" — ninguém ligou ainda |
| 14 | Post-it | "Caixa de EPI (luvas, máscaras) está acabando — pedir fornecedor secundário" |

**Critérios de avaliação (rubric):**

| Dimensão | O que procurar | Score |
|----------|----------------|-------|
| **Priorização (Eisenhower)** | Item 9 (recall ANVISA, segurança do paciente) é #1; itens 2, 4, 6 são alta urgência+importância; item 12 (relatório quarta) pode esperar | 0-5 |
| **Reconhecimento de risco crítico** | Identifica que **autoclave com sensor falho = risco sanitário grave** (esterilização inadequada → infecção cruzada). Para o equipamento ANTES de qualquer paciente ser atendido | 0-5 |
| **Delegação** | Item 13 (ligação VIP) → recepção; item 14 (EPI) → auxiliar de compras; item 8 (reunião) → adiar, não cancelar; item 11 → recepção | 0-5 |
| **Comunicação proativa** | Item 1 → resposta empática até 9h; item 5 → resposta clara mesmo que provisória ("retorno até 11h"); itens à coordenadora → lista pronta para 10h | 0-5 |
| **Conformidade** | Item 4 (CRO) e item 7 (recurso glosa) têm prazo legal; item 10 (atestado por foto) — verifica norma da CLT/regulamento interno; item 9 (ANVISA) → fluxo formal | 0-5 |

**Resposta exemplo (gabarito breve):**

> **8h20-8h35 (15 min crítico):**
> 1. **Item 9 ANVISA**: verificar nº de série da autoclave. Se for o lote 2024-7B → **isolar imediatamente** + comunicar ao Dr. coordenador clínico via WhatsApp + acionar fornecedor SterilMax para troca + redirecionar esterilização para a unidade Vila Mariana até resolução. **Antes de qualquer paciente entrar.**
> 2. **Item 2 boleto fornecedor**: pagar via internet banking se houver caixa; senão, ligar negociar prorrogação 24h.
>
> **8h35-9h00 (urgentes financeiros):**
> 3. Item 6 (NFs Bradesco): emitir as 3 antes de 10h.
> 4. Item 7 (recurso Odontoprev glosa): preparar email de recurso (tem 5 dias, mas resolver hoje protege fluxo).
>
> **9h00-9h30 (comunicação):**
> 5. Item 1 (paciente WhatsApp): resposta empática + confirma que vai checar com o convênio. Atendimento humano evita escalada para Procon.
> 6. Item 5 (candidato): "Recebemos sua mensagem. Estamos finalizando a posição da coordenadora; retorno até 11h com confirmação ou reagendamento de prazo."
> 7. Item 8 (reunião 9h): WhatsApp para o grupo da equipe: "Reunião adiada para terça 8h por reunião de diretoria da coordenadora."
>
> **9h30-10h00 (conformidade + delegação):**
> 8. Item 4 (CRO): começar a localizar 5 prontuários representativos.
> 9. Item 13 (paciente VIP): delegar à recepção (Dna. Maria, recepcionista sênior).
> 10. Item 11 (laboratório): ligar para descobrir do que se trata.
> 11. Item 14 (EPI): delegar ao auxiliar de compras.
>
> **10h00-11h00 (com coordenadora de volta):**
> 12. Item 3 (Joana adiantamento): trazer à coordenadora para decisão.
> 13. Item 10 (Carlos atestado): trazer dúvida; provavelmente pede entrega física até o dia seguinte.
> 14. Item 12 (relatório quarta): planejar para terça/quarta cedo.

**[FONTE: HiPeople in-basket methodology + Prontuário Verde + ANVISA + DentalOffice; CRIADO para Beauty Smile]**

---

<a id="7-hosting"></a>
## 7. HOSTING DO ITEM BANK — Recomendação técnica

### Recomendação: **Markdown estruturado com YAML frontmatter, versionado em Git, indexado por SQLite leve**

**Por quê:**

1. **Auditável** — cada item tem histórico de versão (git blame), diff visual, autor, data. Defensável em audiência trabalhista ou auditoria do CRO.
2. **LLM-friendly** — Claude/GPT lê markdown nativamente para scoring assistido sem parsing extra.
3. **Não vendor-locked** — você não fica preso a Vervoe/TestGorilla. Migra fácil.
4. **Conversível** — script Python de 30 linhas converte para CSV/JSON/SQL quando necessário.
5. **Diff de calibração** — quando recalibrar respostas após dados de hires reais, diff mostra exatamente o que mudou.
6. **Pode ser servido via API simples** (FastAPI + SQLite ou Supabase) sem reescrever schema.

### Estrutura sugerida

```
sjt-item-bank/
├── README.md                                # Métricas globais, versão, changelog
├── dimensions/
│   ├── 01-etica-integridade.md             # BARS template + literatura
│   ├── 02-comunicacao-paciente.md
│   └── ...
├── items/
│   ├── dentista/
│   │   ├── D001-odontofobia-procedimento.md
│   │   ├── D002-pedido-estetico-sem-indicacao.md
│   │   └── ...
│   ├── higienista/
│   ├── recepcao/
│   ├── coordenador/
│   └── admin/
├── batteries/
│   ├── dentista-triagem-v1.yaml            # Composição de bateria por cargo
│   ├── dentista-final-v1.yaml
│   └── ...
├── rubrics/
│   ├── case-clinico-aberto-dentista.md
│   ├── in-basket-admin-v1.md
│   └── mini-case-coordenador.md
├── scripts/
│   ├── md_to_json.py                       # Para servir via API
│   ├── md_to_csv.py                        # Export para LMS terceiros
│   └── score_calibration.py                # Análise pós-hire de cada item
└── data/
    ├── responses/                           # Respostas de candidatos (anonimizadas)
    └── calibration/                         # Métricas de cada item (alpha, RIT, dificuldade)
```

### Schema YAML por item

```yaml
---
id: D001
role: dentista
version: 1.2
status: active                # active | piloting | retired
title: Odontofobia durante procedimento
dimensions_primary:
  - D6_humanizacao
  - D3_consentimento
dimensions_secondary:
  - D9_limites
format: rating_4              # rating_4 | ML_LL | best_answer
time_estimate_min: 2
created_at: 2026-04-27
created_by: F.Costa
sources:
  - https://www.blackstonetutors.com/dental-school-interviews-ethical-questions-model-answers/
  - CFO Resolucao 118/2012 Art. 11-X e 11-VIII
language: pt-BR
adapted_for: Beauty Smile
psychometric:
  pilot_n: null
  difficulty: null            # preencher após piloto
  rit: null                   # item-total correlation
  alpha_with_battery: null
calibration_notes: null
---

## Cenário
[texto do cenário]

## Alternativas
- A) [...]
- B) [...] (anchor)
- C) [...]
- D) [...]

## Resposta-âncora
B

## Rationale
[justificativa baseada em CFO + literatura]

## Pontuação
- A: 0
- B: 4 (resposta-âncora)
- C: 1
- D: 0
```

### Stack técnica recomendada (MVP barato)

| Componente | Ferramenta | Por quê |
|------------|------------|---------|
| **Repositório** | GitHub privado | Histórico, blame, branches por bateria |
| **Storage de respostas** | Supabase (PostgreSQL) | LGPD-compliant, BR-hosted available, integra com Next.js |
| **API de itens** | FastAPI ou Next.js API route | Lê markdown, serve JSON |
| **Scoring assistido** | Claude Sonnet 4.6 + rubric | LLM-as-judge para case aberto + in-basket |
| **Frontend candidato** | Next.js + Tailwind | Mesma stack do ATS |
| **Calibração** | Python + statsmodels | Análise IRT após n≥100 respostas |

### Anti-pattern a evitar

❌ **Item bank em Excel/Sheets** — sem versão, sem histórico, sem audit trail; insustentável >50 itens.

❌ **Comprar TestGorilla/Mettl como repositório** — você fica refém da plataforma, não pode customizar contexto BR sem comprar enterprise.

❌ **Banco direto no PostgreSQL sem markdown** — perde legibilidade; difícil para psicólogos/dentistas SMEs revisarem itens; difícil diff de calibração.

---

<a id="8-roadmap"></a>
## 8. ROADMAP DE IMPLEMENTAÇÃO — 90 dias

### Fase 0 (semana 1) — Setup
- [ ] Criar repositório `sjt-item-bank` com estrutura acima
- [ ] Importar os **15 SJTs deste documento** como `D001-D004`, `H001-H003`, `R001-R003`, `C001-C003`, `A001-A002` + In-Basket
- [ ] Criar templates BARS para 10 dimensões (§5)
- [ ] Recrutar 3-5 SMEs por cargo (1 dentista clínico, 1 coordenador atual, 1 dentista da rede com 5+ anos)

### Fase 1 (semanas 2-4) — Calibração de SMEs
- [ ] Cada SME responde os 15 SJTs como "candidato ideal" + dá rationale
- [ ] Calcular consenso de SMEs por item (concordância ≥80% por âncora = item validado; 60-80% = revisão; <60% = reescrever)
- [ ] Para cenários com baixo consenso: workshop de 2h com SMEs para discutir
- [ ] Criar 10 itens adicionais por cargo a partir de:
  - ENADE Odontologia (apostila UFU 2023) — 60+ questões disponíveis
  - Pearson VUE NHS Public Health SJT (6 cenários adaptáveis)
  - CFO Art. 11 (12 vedações como gerador de cenários)

### Fase 2 (semanas 5-8) — Piloto
- [ ] Primeira bateria (Dentista, n=20-30 candidatos reais ou colaboradores atuais voluntários)
- [ ] Análise psicométrica básica:
  - Alpha de Cronbach (alvo: >0.65 — SJT é heterogêneo, não esperar >0.85)
  - Item-total correlation (RIT) por item (alvo: >0.20; abaixo de 0.10 = item retirado)
  - Dificuldade por item (% acertando: alvo entre 0.30 e 0.80)
- [ ] Coletar feedback qualitativo dos candidatos (face validity)

### Fase 3 (semanas 9-12) — Validação preditiva inicial
- [ ] Comparar scores SJT com avaliação de desempenho dos colaboradores atuais (correlation; mesmo que pequeno N, sinaliza direção)
- [ ] Ajustar respostas-âncora se desconectadas de desempenho real
- [ ] Documentar V1.0 do banco; iniciar produção

### Posterior (mês 4+)
- [ ] Adicionar formato vídeo/animação para 30% dos itens (reduz adverse impact)
- [ ] Acompanhar adverse impact por gênero/raça/origem (target: d<0.4)
- [ ] Recalibrar a cada 100-200 hires
- [ ] Possibilidade: publicar artigo acadêmico sobre o instrumento (parceria com USP/UNIFESP) — gera ativo de PR + science-backed

---

<a id="9-gaps"></a>
## 9. GAPS E LIMITAÇÕES DA PESQUISA

### O que NÃO foi encontrado

1. **Banco público de SJT odontológico em PT-BR**: zero. Único artigo brasileiro sobre TJS é Ambiel et al. (2015), revisão teórica.
2. **SATEPSI** (CFP — Sistema de Avaliação de Testes Psicológicos): zero SJT cadastrado para qualquer profissão de saúde.
3. **Adverse impact em SJT por raça no Brasil**: nenhum estudo. Os melhores proxies são Indonésia (Parry 2022) e estudos americanos.
4. **Casos de julgamento ético do CFO publicados com decisão**: estão atrás de login no sistema do CRO (acesso restrito). Trabalhar com adaptações do CEO.
5. **Constructed-response SJTs em saúde com meta-análise**: protocolo Morales-Almeida (PLOS ONE 2023) ainda não publicou resultados finais.
6. **In-basket exercise odontológico BR pronto e validado**: não existe. O in-basket nesta pesquisa é original, baseado em metodologia (HiPeople) + contexto BR.

### O que pode estar desatualizado

- Plataformas comerciais mudam catálogo trimestralmente. Pesquisa de 2026-04-27 pode ter blind spots de produtos lançados na próxima 4-8 semanas.
- LGPD: sub-regulamentações específicas para healthcare ainda em desenvolvimento (ANS + ANPD).

### Riscos da implementação

1. **Cenários muito alinhados a uma corrente clínica** podem ser questionáveis por SMEs de outra escola. Mitigação: workshop multi-escola na fase 1.
2. **Adverse impact por gênero pode aparecer alto** (mulheres tendem a pontuar acima em SJT). Não é problema legal por si só, mas precisa documentação se houver auditoria.
3. **"Vazamento" de itens** — candidatos compartilham. Solução: pool de itens >> bateria; rotação semanal; penalização explícita por compartilhamento (TCLE).
4. **Faking residual**: nenhuma técnica zera. Combinar com entrevista estruturada + work sample (conforme pesquisa irmã).

---

<a id="10-fontes"></a>
## 10. FONTES TIERADAS

### Tier 1 — Essencial

1. Webster, Coletti, Cleland (2020). *Situational judgement test validity for selection: A systematic review and meta-analysis.* Medical Education. https://pubmed.ncbi.nlm.nih.gov/32353895/ | https://asmepublications.onlinelibrary.wiley.com/doi/full/10.1111/medu.14201
2. Kepes, Keener, Lievens, McDaniel (2025). *An Integrative, Systematic Review of the Situational Judgment Test Literature.* Journal of Management. https://journals.sagepub.com/doi/10.1177/01492063241288545
3. Fahim, Khan & Sethi (2023). *Use of SJT for assessing non-cognitive attributes of final year dental students.* Journal of Dental Education. https://onlinelibrary.wiley.com/doi/10.1002/jdd.13113
4. CFO Resolução 118/2012 — Código de Ética Odontológica. https://website.cfo.org.br/wp-content/uploads/2018/03/codigo_etica.pdf
5. Resolução CNE/CES 3/2021 — DCN Odontologia. https://portal.mec.gov.br/docman/junho-2021-pdf/191741-rces003-21/file
6. Pearson VUE / Work Psychology Group (2022). *Public Health SJT Example Questions.* https://pearsonvue.com/content/dam/VUE/vue/en/documents/clients/phnro/Example-Questions-Public-Health-SJT-2022.pdf
7. Christian, Edwards & Bradley (2010). *Situational Judgment Tests: Constructs Assessed and a Meta-Analysis of their Criterion-Related Validities.* Personnel Psychology, 63. https://mikechristian.web.unc.edu/wp-content/uploads/sites/13307/2016/11/Christian-et-al-2010-PPsych-SJT.pdf
8. Patterson, Zibarras et al. (2015). *SJTs in medical education: AMEE Guide No. 100.* Medical Teacher. https://pubmed.ncbi.nlm.nih.gov/26313700/

### Tier 2 — Complementar

9. UFU/FOOD (2023). *Apostila Concursos Públicos Cirurgião-Dentista.* https://fo.ufu.br/system/files/conteudo/anexos_cocod_apostila_concursos_publicos_2023.pdf
10. Parry, Soemantri et al. (2022). *Evaluation of SJTs in student selection in Indonesia and impact on diversity.* BMC Medical Education. https://link.springer.com/article/10.1186/s12909-022-03247-4
11. Adeyemo et al. (2024). *Development and validation of SJT for behavioural competencies in medical practice — Nigeria.* BMC Medical Education. https://link.springer.com/article/10.1186/s12909-024-06298-x
12. Arthur, Glaze, Jarrett, White, Schurig & Taylor (2014). *Comparative evaluation of three SJT response formats.* Journal of Applied Psychology. https://pubmed.ncbi.nlm.nih.gov/24490965/
13. Lievens & Sackett (2006). *Video-based versus written SJTs: predictive validity.* https://pubmed.ncbi.nlm.nih.gov/16953779/
14. Whetzel, Sullivan & McCloy (2020). *Situational Judgment Tests: An Overview of Development Practices.* Personnel Assessment and Decisions, 6(1). https://scholarworks.bgsu.edu/pad/vol6/iss1/1/
15. Lievens, Sackett, Dahlke, Oostrom & De Soete (2019). *Constructed response formats and minority-majority differences.* https://pubmed.ncbi.nlm.nih.gov/30431296/
16. Resolução CNE/CES 3/2002 — DCN Odontologia anterior. https://portal.mec.gov.br/cne/arquivos/pdf/CES032002.pdf
17. ABENO (2022). *Consenso Estágios Curriculares.* https://abeno.org.br/wp-content/uploads/2022/12/consenso_abeno_estagios_final.pdf
18. ENADE Odontologia 2013 (INEP). https://download.inep.gov.br/educacao_superior/enade/provas/2013/11_ODONTOLOGIA.pdf
19. Testlify Medical Receptionist Test. https://testlify.com/test-library/medical-receptionist/
20. AssessFirst SJT Healthcare blog. https://assessfirst.com/en/blog/situational-judgement-test-healthcare
21. Lievens & Sackett (2009). *Effects of response instructions on SJT performance and validity.* https://pubmed.ncbi.nlm.nih.gov/19594248/
22. Whetzel, McDaniel & Nguyen (2008). *Subgroup Differences in SJT: A Meta-Analysis.* Human Performance, 21(3). https://www.tandfonline.com/doi/abs/10.1080/08959280802137820
23. CFO. *Lei Maria da Penha: papel do cirurgião-dentista.* https://website.cfo.org.br/lei-maria-da-penha-o-papel-do-cirurgiao-dentista-na-identificacao-notificacao-e-atendimento-as-vitimas-de-violencia-domestica/

### Tier 3 — Referência

24. Harenbrock, Forthmann & Holling (2023). *Retest Reliability of SJTs: Meta-Analysis.* https://econtent.hogrefe.com/doi/10.1027/1866-5888/a000323
25. Morales-Almeida et al. (2023). *Constructed-response SJTs in health professions: protocol.* PLOS ONE. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0280493
26. Schaftenaar et al. (2022). *Construct-driven SJT for medical admission.* https://link.springer.com/article/10.1186/s12909-022-03305-x
27. Lammers et al. (2024). *SJT for professionalism in mental health clinicians.* https://pmc.ncbi.nlm.nih.gov/articles/PMC10753968/
28. Brouwers et al. (2021). *SJT for safety performance.* https://pmc.ncbi.nlm.nih.gov/articles/PMC8685870/
29. Bardach, Rushby, Kim & Klassen (2020). *Video- and text-based SJTs for teacher selection.* https://www.tandfonline.com/doi/full/10.1080/1359432X.2020.1736619
30. Barg-Walkow et al. (2021). *Animated videos in assessment.* https://www.tandfonline.com/doi/full/10.1080/15305058.2021.1916505
31. Patterson et al. (2018). *Integrity SJT: judging what to do vs what not to do.* https://pmc.ncbi.nlm.nih.gov/articles/PMC5901405/
32. Lievens et al. (2017). *Scoring method of SJT: adverse impact.* https://link.springer.com/article/10.1007/s10459-016-9720-7
33. Ambiel, Campos et al. (2015). *TJS no contexto da Psicologia Organizacional.* PePSIC. https://pepsic.bvsalud.org/scielo.php?script=sci_arttext&pid=S1984-66572015000300007
34. Gerritse et al. (2020). *Sweet Little Lies: faking SJT vs personality.* https://econtent.hogrefe.com/doi/10.1027/1015-5759/a000479
35. AAMC PREview Exam. https://www.aamc.org/services/aamc-preview-professional-readiness-exam-admissions-officers/learn-more
36. Casper / Acuity Insights. https://acuityinsights.app/casper/
37. UCAT SJT Guide. https://bluepeanut.com/ucat-blog/ucat-situational-judgement-getting-started-with-sjt-what-it-tests-scoring-amp-ethics
38. Conflicts and Challenges of Truth-Telling in Dentistry. https://pmc.ncbi.nlm.nih.gov/articles/PMC9294717/
39. American College of Dentists. *Ethical Dilemmas in Dentistry.* https://www.dentalethics.org/course/ethical-dilemmas-in-dentistry-second-series/
40. BlackStone Tutors. *Dental School Interview Ethical Scenarios.* https://www.blackstonetutors.com/dental-school-interviews-ethical-questions-model-answers/
41. SciELO. *Problemas éticos vivenciados por dentistas.* https://www.scielo.br/j/csc/a/B5DDsyrJfJPrQRccm7KZWXz/
42. TDA Perks. *Dentist Does Not Disclose Error Case.* https://tdaperks.com/dentist-does-not-disclose-error-committed-by-previously-treating-dentist-both-are-sued-for-malpractice/
43. PMC. *Just Say "No": Can Dentists Refuse Care Due to Finances?* https://pmc.ncbi.nlm.nih.gov/articles/PMC7603726/
44. Today's RDH. *Dental Hygiene Student Bases Patient Education on Medical History.* https://www.todaysrdh.com/case-study-dental-hygiene-student-bases-patient-education-on-medical-history/
45. DentalCare. *Case Scenario 4: Periodontal Disease.* https://www.dentalcare.com/en-us/ce-courses/ce542/case-scenario-4-periodontal-disease
46. RDH Magazine. *Recognizing and Responding to Child Abuse and Neglect.* https://www.rdhmag.com/patient-care/article/14167560/recognizing-and-responding-to-child-abuse-and-neglect-a-guide-for-dental-professionals
47. Colgate Oral Health Network. *Identifying and Reporting Suspected Child Abuse.* https://www.colgateoralhealthnetwork.com/article/dental-professionals-identifying-and-reporting-suspected-child-abuse/
48. Dimensions of Dental Hygiene. *Oral Cancer Detection.* https://dimensionsofdentalhygiene.com/article/oral-cancer-detection/
49. PMC. *Motivational Interviewing for Dental Hygienists.* https://pmc.ncbi.nlm.nih.gov/articles/PMC6631588/
50. BVS APS. *Técnicas de condicionamento odontopediátrico.* https://aps-repo.bvs.br/aps/quais-sao-as-tecnicas-de-condicionamento-no-atendimento-a-pacientes-odontopediatricos/
51. Allstar Dental Academy. *Dental Receptionist Training: Trial by Fire.* https://allstardentalacademy.com/dental-training/dental-receptionist-training-trial-by-fire/
52. MGE Management Experts. *Building the Perfect Dental Office Receptionist.* https://www.mgeonline.com/2023/building-the-perfect-dental-office-receptionist/
53. OAB Campinas. *LGPD aplicada a clínicas médicas.* https://oabcampinas.org.br/lei-geral-de-protecao-de-dados-aplicada-as-clinicas-medicas/
54. Prontuário Verde. *Glosas de convênio na clínica odontológica.* https://blog.prontuarioverde.com.br/odontologia/como-controlar-as-glosas-de-convenio-na-sua-clinica-odontologica/
55. VLV Advogados. *Recusa de atendimento médico.* https://vlvadvogados.com/a-recusa-de-atendimento-medico/
56. DentalIntel. *Dental Office Receptionist Scripts Best Practices.* https://www.dentalintel.com/blog-posts/dental-office-receptionist-scripts-best-practices-to-help-your-staff-engage-patients
57. Zigpoll. *Conflict Resolution Training in Dental Clinics.* https://www.zigpoll.com/content/how-can-conflict-resolution-training-improve-communication-and-teamwork-among-dental-clinic-staff-to-enhance-patient-care
58. Colgate Professional. *Conflict Resolution Strategies Part 1.* https://www.colgateprofessional.com/dentist-resources/practice-management/conflict-resolution-strategies-employee-vs-employee
59. Colgate Professional. *Conflict Resolution Strategies Part 2.* https://www.colgateprofessional.com/dentist-resources/practice-management/conflict-resolution-strategies-employee-vs-patient
60. DentistryIQ. *Managing Conflicts in the Dental Office.* https://www.dentistryiq.com/practice-management/article/16363556/managing-conflicts-in-the-dental-office
61. WealthFD. *Performance Improvement Plan in Dental Practice.* https://wealthfd.com/blogs/news/how-to-establish-a-performance-improvement-plan-in-your-dental-practice-1
62. Clinicorp. *Burnout na Odontologia.* https://www.clinicorp.com/post/burnout-odontologia
63. ClinicaIdeal. *Gestão de Reputação Online para Clínicas Odontológicas.* https://clinicaideal.com/blog/gestao-de-reputacao-online-para-clinicas-odontologicas-construa-uma-imagem-forte/
64. Spear Education. *Conflict Management for Dental Practice Team.* https://www.speareducation.com/resources/spear-digest/conflict-management-for-dental-practice-team-members/
65. HiPeople. *In-Basket Technique.* https://www.hipeople.io/glossary/in-basket-technique
66. PeopleHum. *In-Basket Technique.* https://www.peoplehum.com/glossary/in-basket-technique
67. GraduatesFirst. *In-Tray Exercise Guide.* https://www.graduatesfirst.com/assessment-day-2/in-tray-exercises
68. DentalOffice. *Gestão Financeira para Dentistas.* https://www.dentaloffice.com.br/gestao-financeira-para-dentistas/
69. HRforHealth. *How to Document an Underperforming Employee.* https://hrforhealth.com/blog/how-to-document-an-underperforming-employee
70. Mindsight. *Suporte: Situacional Social.* https://suporte.mindsight.com.br/situacional-social
71. Tec Concursos. *Resolução CFO 118/2012 — Código de Ética.* https://www.tecconcursos.com.br/materias/legislacao-e-etica-profissional/resolucao-cfo-n-1182012-codigo-de-etica-odontologica
72. Residência Multiprofissional UFRJ 2017 — Odontologia. https://www.residenciamultiprofissional.ufrj.br/images/PROVAS/2016-2017/ODONTOLOGIA__2016-2017.pdf
73. ESP-PB 2024. *Residência Clínica Integrada Odontologia.* https://esp.pb.gov.br/editais-em-andamento/Cadernodeprova_ClnicaIntegradaemOdontologia.pdf
74. PePSIC. *Análise comparativa DCN 2002 vs 2021.* https://pepsic.bvsalud.org/pdf/rbcdh/v34n1/pt_0104-1282-rbcdh-34-1-0043.pdf
75. ABENO. *Novas DCN homologadas.* https://abeno.org.br/destaques/novas-dcn-odontologia-homologadas/

---

## Histórico de versões deste documento

| Data | Mudança |
|------|---------|
| **2026-04-27** | v1.0 — Compilação inicial: 5 subagentes, 15 SJTs, 10 BARS, in-basket, hosting, roadmap. |

---

> **Próxima ação sugerida:** importar os 15 SJTs deste documento como `D001-A002` no repositório git inicial e agendar workshop de calibração com 3 SMEs por cargo na semana 1. **Tempo estimado para v0.1 do banco em produção: 4-6 semanas.**
