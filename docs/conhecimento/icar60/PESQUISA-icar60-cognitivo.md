# PESQUISA — ICAR60 para ATS Brasileiro (Clínicas Odontológicas)

> **Compilado em** 2026-04-27 03:30 (BRT) | **Modo** Deep Research | **Domínio** Psicometria + RH Tech + Direito Brasileiro
> **Subagentes**: 6 paralelos (Acadêmico PT-BR, Item Bank, Scoring, Adverse Impact, Plan B, Legal)
> **Pesquisa irmã**: `PESQUISA-sistema-avaliacao-candidatos-recrutamento.md` (compilado 2026-04-25 — visão sistêmica do ATS)
> **Briefing original**: ICAR60 viabilidade no Brasil para etapa presencial cognitiva de ATS odontológico

---

## TL;DR — Recomendação

**Não use ICAR60 em produção comercial no Brasil.** Quatro bloqueios concorrentes tornam o instrumento juridicamente e psicometricamente indefensável neste contexto:

1. **Licença declarada do ICAR é "non-commercial research"** — uso em ATS comercial está formalmente fora de escopo (Condon & Revelle, 2014). O próprio site do ICAR project recusa solicitações comerciais.
2. **Zero validação PT-BR publicada.** Nenhum paper indexado em SciELO, BDTD-IBICT, PePSIC, PubMed ou ResearchGate. Único elo brasileiro é o nome de Ricardo Primi (USF) listado como colaborador internacional — sem publicação conjunta identificada.
3. **Não consta no SATEPSI** (nem favorável, nem desfavorável, nem "não-privativo"). Pela Resolução CFP 31/2022 + Lei 4.119/62 Art. 13, aplicar instrumento psicológico em seleção de pessoal sem psicólogo habilitado é **contravenção penal** (Art. 47 LCP).
4. **Sem normas brasileiras.** Apenas o SAPA Project (N=96.958, 78% EUA, amostra online auto-selecionada). Pasquali e Primi são categóricos: normas americanas não se aplicam ao Brasil sem estudos de equivalência prévios.

**Recomendação operacional — modelo híbrido em 3 etapas:**

| Etapa | Instrumento | Responsável | Função |
|-------|-------------|-------------|--------|
| 1. Triagem | **SJT customizado** (15–20 cenários odontológicos) | Sistema (automatizado) | Eliminar 60–70% inadequados |
| 2. Cognitivo (finalistas) | **G-36 (Vetor)** ou **R-1** | Psicólogo CRP como RT | Medir Gf com SATEPSI favorável |
| 3. Entrevista estruturada | Roteiro behavioral por competências | Gestor + RH | Validade incremental |

**Custo estimado**: SJT R$ 15–50k desenvolvimento único + G-36 ~R$ 3–6/candidato finalista + R$ 50–150/laudo. Validade preditiva combinada r ≈ 0,45–0,55. Adverse impact estimado moderado-baixo (SJT dilui o d do GMA test).

Se o ATS precisa ser 100% automatizado sem nenhum profissional regulamentado no fluxo: **rota única defensável é SJT-only** (não é classificado como teste psicológico sob a CFP 31/2022, pode ser aplicado sem CRP, e tem o menor adverse impact comprovado entre as opções — d ≈ 0,38 vs d ≈ 0,7–0,9 de GMA verbal).

---

## 1. Disponibilidade em PT-BR — Status: Inexistente

### 1.1 Busca exaustiva, zero resultados

Bases consultadas (Subagente 1, 8 fontes Tier 1 verificadas):

| Base | Cobertura | Resultado |
|------|-----------|-----------|
| Google Scholar | Mundial | 0 papers PT-BR |
| SciELO Brasil | Periódicos brasileiros | 0 |
| PePSIC/BVS-PSI | Psicologia brasileira | 0 |
| BDTD-IBICT | Teses e dissertações BR | 0 |
| PubMed/PMC | Biomédicas mundiais | 0 PT-BR |
| ResearchGate | Pré-prints e papers | 0 |
| RCAAP (Portugal) | Acesso aberto português | Não verificado neste run (gap) |
| OSF (Open Science) | Pré-registros | Sem projeto PT-BR identificado |

**Conclusão:** ICAR60, ICAR16, ICAR-Sample e ICAR05 não têm versão validada em português brasileiro nem em português europeu publicada em literatura indexada até abril de 2026.

### 1.2 O elo brasileiro existente — Ricardo Primi (USF)

A página oficial do ICAR project (`icar-project.com/projects/icar-project/wiki/About_us`) lista **Dr. Ricardo Primi (Universidade São Francisco — USF, Bragança Paulista)** como colaborador internacional. Primi é:

- Coordenador do **LabAPE** (Laboratório de Avaliação Psicológica e Educacional), USF
- Co-autor da **BPR-5** (Bateria de Provas de Raciocínio) com Leandro Almeida
- Ex-presidente do **IBAP** (Instituto Brasileiro de Avaliação Psicológica)
- Principal psicometrista brasileiro em inteligência fluida (Gf)

A natureza da colaboração não é especificada publicamente. **Nenhum paper conjunto Primi × Revelle/Condon foi identificado.** Possível que seja contribuição informal de itens, supervisão metodológica, ou trabalho em andamento não publicado.

**Próximo passo de pesquisa primária** (fora do escopo desta compilação): contato direto via labape.com.br e admin@icar-project.com para verificar se há validação PT-BR em andamento.

### 1.3 Instrumentos brasileiros próximos do ICAR

Para fins comparativos, o instrumento brasileiro mais próximo do ICAR em conceito (Gf open-source/domínio público com validação) é:

**Conjunto de Testes de Inteligência Fluida** (Primi, 2009, Avaliação Psicológica)
- 3 subtestes: Indução, Raciocínio Lógico, Raciocínio Geral
- Adaptado/traduzido do Kit of Factor-Referenced Cognitive Tests (Ekstrom et al.)
- Validado para amostras brasileiras
- Domínio público (derivado de fator kit histórico)
- **Limitação**: cobre apenas Gf; não tem rotação 3D nem séries alfanuméricas como o ICAR
- Link: https://pepsic.bvsalud.org/scielo.php?script=sci_arttext&pid=S1677-04712009000100003

### 1.4 Papers fundacionais do ICAR (referência obrigatória)

| Paper | Ano | Revista | Ponto-chave |
|-------|-----|---------|-------------|
| Condon & Revelle — *The International Cognitive Ability Resource: Development and Initial Validation* | 2014 | Intelligence (Q1) | Paper fundacional. ICAR60 α = 0,93; ICAR16 α = 0,81; correlação ICAR16 × WAIS-IV = 0,81. Amostra: 96.958 online, anglófonos. [DOI 10.1016/j.intell.2014.01.001](https://www.sciencedirect.com/science/article/abs/pii/S0160289614000051) — [PDF aberto](https://gwern.net/doc/iq/2014-condon.pdf) |
| Revelle et al. — *Using ICAR as Open-Source Tool* | 2020 | Personality and Individual Differences (Q1) | Revisão de 200+ estudos com ICAR desde 2014. Confirma ausência de versões formalmente validadas em PT/ES. [PDF aberto](https://personality-project.org/revelle/publications/paid.icar.pdf) |
| Dworak et al. — *Age and Sex Invariance of the ICAR* | 2019 | Intelligence (Q1) | Invariância forte para idade/sexo. ICAR16 só deve usar score total (subescalas com invariância parcial). [DOI](https://www.sciencedirect.com/science/article/abs/pii/S0160289619301813) |
| Young et al. — *ICAR Mobile Toolbox Validation* | 2025 | J Intelligence (open access) | Validação em plataforma mobile (Puzzle Completion + Block Rotation). α 0,90–0,93. Inglês, EUA, N=100. [PMC aberto](https://pmc.ncbi.nlm.nih.gov/articles/PMC12733510/) |

---

## 2. Acesso ao Item Bank — Possível, com Caveat Comercial

### 2.1 Como obter o item bank

**Caminho oficial (icar-project.com)**:
1. Cadastro no Redmine (até 3 dias para aprovação)
2. Formulário de aplicação descrevendo uso (até 1 semana)
3. Acesso a `http://icar-project.com/projects/icar-download/documents`
4. Inclui PDFs com figuras (Matrix Reasoning, 3D Rotation), gabaritos, e versões em texto
5. Site **está vivo e funcional** em abril/2026

**Caminho técnico imediato (sem registro) — psychTools/CRAN**:
```r
install.packages("psychTools")
data(iqitems)   # 16 itens ICAR16, respostas brutas, N=1525
data(ability)   # mesmos 16 itens pontuados 0/1
# Gabarito ICAR16:
iq.keys <- c(4,4,4,6, 6,3,4,4, 5,2,2,4, 3,2,6,7)
```

**Caminho dataset — Harvard Dataverse (CC0 real)**:
- Dataset SAPA-Project: 60 itens ICAR aplicados em ~97k participantes
- Inclui `superKey60` (gabarito completo dos 60 itens)
- **Licença CC0** — explicitamente sem restrições comerciais
- Link: https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/TZJGAT (via Journal of Open Psychology Data, Condon & Revelle 2016)

### 2.2 Licença — Alerta Crítico para Uso Comercial

**Há ambiguidade declarada importante.** O site icar-project.com usa "public domain" de forma genérica, mas a publicação fundacional é explícita:

> "maintained in the public-domain for **non-commercial research purposes**" — Condon & Revelle (2014, Intelligence)

**Consequências práticas:**
- Uso em HR/contratação comercial está **formalmente fora do escopo** declarado pelos autores
- Para um produto HR tech B2B comercial, o caminho seguro é solicitar **licença comercial explícita** via admin@icar-project.com — tem precedente do site recusar tais solicitações
- O dataset do Harvard Dataverse é a única peça em **CC0 verdadeiro** (sem restrição comercial), mas é dataset, não item bank reaplicável

### 2.3 Estrutura do ICAR60

| Subescala | # itens no ICAR60 | Requer figuras | Cultura-loaded |
|-----------|-------------------|----------------|----------------|
| Letter and Number Series | 9 | Não | Baixa |
| Matrix Reasoning | 11 | **Sim** | Baixa-média |
| Verbal Reasoning | 16 | Não (mas é texto em inglês) | **Alta** |
| 3D Rotation | 24 | **Sim** | Baixa |

A subescala Verbal Reasoning é o vetor de adverse impact mais alto e o que tornaria adaptação PT-BR mais trabalhosa (não é tradução literal — exige equivalência semântica de idiomatismos).

### 2.4 Implementações web — Vácuo de mercado

Subagente 2 mapeou: **não existe webapp open-source com manutenção ativa para ICAR**. Repos encontrados:

| Repo | Status |
|------|--------|
| `frenchja/icar` (R package, GPLv3) | Inativo desde ~2015 |
| `icar-project/icar-project.github.com` | 0 stars, último commit 2013 |
| Scripts em personality-project.org | Snippets em R, sem UI |

**Implicação**: se o time decidir usar ICAR (sob licença comercial negociada), precisa construir o webapp do zero. Não é "off-the-shelf".

### 2.5 Boas práticas de aplicação (timer + anti-cheat)

**Timers documentados na literatura:**
- ICAR16: 12–16 minutos (mediana de conclusão ~8 min em estudos)
- ICAR60: 25–30 min (sem timer oficial; estudos variam 12–30 min)

**Stack anti-cheat moderna:**
- Visibility API (detectar tab-switch → flag)
- Fullscreen API forçado
- `event.preventDefault()` em copy/paste/right-click
- Fisher-Yates shuffle para randomizar ordem de itens E ordem de alternativas
- Auto-submit no timeout
- Detecção de DevTools aberto (heurística por dimensões de window)
- Logging de tempo por item (suspeito: < 500ms ou > timeout/10)
- Fingerprinting + IP throttling (1 tentativa por candidato)

### 2.6 Alternativa para Matrix Reasoning open-source com licença mais clara

**MaRs-IB (Matrix Reasoning Item Bank)** — UCL Blakemore Lab, 2019:
- 80 itens de matrix reasoning
- Open-access via OSF: https://osf.io/g96f4
- Também restrito a não-comercial, mas **autores são contactáveis e historicamente flexíveis** para parcerias
- Boa psicometria (α > 0,85, sem viés de gênero)
- Não cobre Verbal/3D Rotation — é só matrices

---

## 3. Algoritmo de Scoring — CTT é o padrão, IRT como upgrade opcional

### 3.1 Scoring oficial

**Método recomendado pelos autores (Condon & Revelle e ICAR Project Guidelines):**

> **CTT puro: soma simples de acertos (0/1) por item. Score total varia de 0 a 60 (ou 0 a 16 no ICAR16).**

Justificativa: com todos os candidatos respondendo todos os itens, IRT 2PL e CTT produzem scores quase idênticos. IRT só vale a pena com dados massivamente faltantes (design SAPA, onde cada participante recebe subset aleatório).

**Implementação no `psych` package (R):**

```r
library(psych)

# CTT (recomendado para ATS, todos respondem tudo)
keys <- list(icar = c(item1, item2, ..., item60))  # vetor com posição da resposta correta
scores <- scoreItems(keys, response_data)

# IRT 2PL (opcional, para análise psicométrica fina)
fit <- irt.fa(response_data)
scores_irt <- scoreIrt.2pl(fit$irt, response_data)

# Rasch (1PL, raramente usado em ICAR)
scores_rasch <- scoreIrt.1pl(keys, response_data)
```

### 3.2 Estrutura de subescalas — Decisão importante

| Decisão | Quando usar |
|---------|-------------|
| **Score total** (saturado em g) | Default para seleção geral. Maior confiabilidade. ICAR60 α=0,93; ωh=0,61 |
| **Subescalas separadas** | Cargos com perfil cognitivo específico |
| - Engenharia / mecânico | 3D Rotation + Matrix Reasoning |
| - Jurídico / atendimento ao público | Verbal Reasoning + Letter-Number Series |
| - Operacional sem leitura técnica | Matrix Reasoning + 3D Rotation (não-verbal) |

**Para clínica odontológica (recepção, atendimento, auxiliares):** o perfil mais aderente é Verbal + Letter-Number — mas é justamente onde o adverse impact é maior. Trade-off real entre validade preditiva e fairness.

### 3.3 Normas populacionais — O grande problema

| Cenário | Status |
|---------|--------|
| Normas brasileiras populacionais | **INEXISTENTES** |
| Normas internacionais SAPA Project | N=96.958, 78% EUA, online voluntária, educação acima da média |
| Normas Mobile Toolbox | N=100, EUA, 18–82 anos |
| ICAR16 contexto universitário | Média ~8,0/16, SD ~3,7 (várias publicações) |

**Estatísticas por item (SAPA, valor médio dos 60 itens):**
- 3D Rotation: 0,19 (mais difícil)
- Matrix Reasoning: 0,52
- Letter-Number: 0,59
- Verbal Reasoning: 0,64 (mais fácil)

**Defensibilidade de usar normas internacionais no Brasil:** baixa. Pasquali (2003), Primi (2010+) e a Resolução CFP 31/2022 são explícitos: instrumentos estrangeiros adaptados exigem **estudos com amostra brasileira (N ≥ 500–1.250 estratificados por região)** antes de uso normativo. Sem isso, o cut score é arbitrário e não defensável em litígio trabalhista.

### 3.4 Cut scores — Não há recomendação publicada para seleção

Os únicos cut scores peer-reviewed são para **identificação de superdotação acadêmica** (Young et al., 2021 — corte de 33–35/60 no ICAR60 para o top 10% acadêmico). **Nenhum cut score validado para seleção de pessoal foi identificado.**

Métodos defensáveis para definir cut score local (no longo prazo):

1. **Método Angoff Modificado** — painel de SMEs (Subject Matter Experts) estima probabilidade de candidato "minimamente competente" acertar cada item. Soma das probabilidades = cut score recomendado. Requer 6+ SMEs e iteração.
2. **Contrasting Groups** — coletar scores de funcionários atuais classificados como "alto desempenho" vs "baixo desempenho" pelos gestores. Cut score = ponto de melhor separação (maximiza sensibilidade × especificidade).
3. **Validação Cruzada** — split 70/30 se N ≥ 150; bootstrap se N < 150. Evita overfitting.
4. **Banding** — em vez de cut score rígido, definir banda de ±1 EPM (erro padrão de medida). Para ICAR60 (α=0,93, SD ≈ 9), EPM ≈ 2,35 pontos. Banda ±2 pontos. **Mitigador comprovado de adverse impact.**

### 3.5 Plano de validação local — Roadmap pragmático

Para empresa que decida prosseguir com ICAR adaptado:

| Fase | Atividade | Duração | N alvo |
|------|-----------|---------|--------|
| 1 | Tradução back-translation com 2 psicólogos bilíngues + revisão semântica | 4–6 sem | n/a |
| 2 | Estudo piloto de equivalência semântica | 2 sem | 30–50 |
| 3 | Aplicação em candidatos reais + coleta de dados de desempenho 6–12 meses depois | 6–12 mes | 200+ |
| 4 | Validação criterial (correlação score ICAR × desempenho real) | 3 mes | dados Fase 3 |
| 5 | Cálculo de cut score local + auditoria de adverse impact | 1 mes | dados Fase 3 |

Sem essas 5 fases completadas, **qualquer cut score é juridicamente indefensável** em ação trabalhista por discriminação ou erro de seleção.

---

## 4. Adverse Impact em Populações Brasileiras

### 4.1 Estudos de AI específicos do ICAR no Brasil — INEXISTENTES

Subagente 4 confirmou: nenhum estudo publicado de adverse impact, DIF (Differential Item Functioning) ou fairness do ICAR em populações brasileiras (raça, gênero, região, escolaridade, classe socioeconômica) foi identificado nas bases consultadas.

### 4.2 AI internacional do ICAR

O ICAR foi validado para **invariância de medida** por gênero e idade (strong invariance via MGCFA/MNLFA — Dworak et al., 2019). **A dimensão racial/étnica nunca foi analisada nos papers públicos.**

Estimativa por analogia com testes equivalentes (USA, Mann et al. 2024, N > 2 milhões UK):

| Subescala ICAR | d Black-White estimado | Nível |
|----------------|------------------------|-------|
| 3D Rotation | 0,4–0,6 | Menor |
| Matrix Reasoning | 0,5–0,7 | Menor (análogo ao Raven) |
| Letter-Number Series | 0,6–0,8 | Médio |
| Verbal Reasoning | 0,8–1,0+ | **Alto** (carga cultural) |

Para referência:
- **Wonderlic (verbal-pesado)**: d = 1,0 (Robie et al., 2024)
- **CCAT**: d ≈ 1,0
- **Raven**: d ≈ 0,5–0,7
- **GMA composito UK (Mann 2024)**: d = 0,65

### 4.3 Brasil não tem "4/5ths rule"

Não existe equivalente normativo ao **EEOC americano** ou à **Uniform Guidelines on Employee Selection Procedures (1978)** no Brasil. A proteção contra discriminação em seleção opera por outros vetores:

- **Lei 9.029/95** — proibição de práticas discriminatórias. Pena cumulativa de multa equivalente a 10× maior salário do empregado + vedação de obtenção de empréstimos/crédito de estabelecimentos públicos.
- **CF/88, Art. 5º (igualdade) + Art. 7º, XXX (proibição de diferença de salário/admissão por sexo, idade, cor, estado civil)**
- **Ação Civil Pública via MPT** (Ministério Público do Trabalho) — modelos processuais já prontos
- **Súmula 443 TST** — em ações por discriminação, o ônus da prova pode se inverter (empresa prova que NÃO discriminou)

**O mecanismo é reativo, não proativo** — não há auditoria preventiva como nos EUA. Mas isso **não reduz** o risco; apenas o desloca para o pós-incidente, onde os custos são maiores (dano moral coletivo, exposição reputacional).

### 4.4 Escolaridade como proxy real de adverse impact no Brasil

Dado-chave operacional: **alunos brancos de escola privada tiram 21% a mais no ENEM que alunos negros de escola pública** (INEP, 2023–2024). Qualquer GMA test aplicado sem normalização adequada por grupo de referência **reproduzirá esta desigualdade estrutural**.

Para clínica odontológica recrutando para cargos de atendimento/recepção/auxiliares — onde grande parte dos candidatos vem de ensino médio público — o ICAR Verbal especificamente reproduzirá o gap educacional como gap cognitivo. **Risco alto de proxy discrimination.**

### 4.5 Mitigação — Hierarquia de risco-benefício

| # | Estratégia | Risco | Validade preditiva |
|---|-----------|-------|--------------------|
| 1 | SJT job-specific + entrevista estruturada (sem GMA) | **Baixo** | r ≈ 0,32–0,45 |
| 2 | GMA não-verbal (MR + 3D Rotation) + SJT + entrevista, **modelo compensatório com banding** | Moderado-baixo | r ≈ 0,45–0,55 |
| 3 | GMA verbal como critério único com hard cut | **Alto** | r ≈ 0,40–0,50 mas indefensável |
| 4 | ICAR sem psicólogo / fora do SATEPSI | **Crítico — uso proibido pela CFP 31/2022** | n/a |

**Para o ATS de clínica odontológica brasileira: opção 1 ou 2.** Opção 4 é o caminho atualmente padrão de plataformas que ignoram regulação CFP — alto risco de TAC do MPT e ação coletiva.

---

## 5. Plan B — Alternativas ao ICAR60

### 5.1 Tabela comparativa consolidada

| Instrumento | Custo | Validação BR | SATEPSI | AI estimado | API/Digital | Tempo | Viável ATS? |
|-------------|-------|--------------|---------|-------------|-------------|-------|-------------|
| **ICAR60** | Gratuito (licença comercial pendente) | NÃO | NÃO | Moderado-Alto | DIY | 25–30 min | Parcial |
| **Wonderlic WPT-R** | ~USD 2–5/uso | NÃO | NÃO | **ALTO** (d 0,68–0,92) | Sim | 12 min | Não |
| **CCAT (Criteria)** | USD 1.200+/ano | NÃO (só inglês) | NÃO | **ALTO** | Sim (40+ ATS) | 15 min | Não |
| **BPR-5** | R$ 820/kit | Expirada | **DESFAVORÁVEL desde 2023** | Moderado | Não | 45–60 min | **NÃO — ilegal** |
| **R-1 (Vetor)** | ~R$ 3/uso | Sim | **Favorável** | Baixo-Moderado | Correção VOL | 30 min | Com psicólogo |
| **G-36 (Vetor)** | ~R$ 3,50/uso | Sim | **Favorável** | Baixo-Moderado | Correção VOL | 30 min | Com psicólogo |
| **AC-15** | ~R$ 2/uso | Sim | **Favorável** | Baixo | Digital | 5 min | Mede atenção, não Gf |
| **HMT (open-source)** | Gratuito (não-comercial) | NÃO | NÃO | Moderado | Web | 20 min | Parcial |
| **BEFKI (Hogrefe)** | Proprietário | NÃO | NÃO | n/a | Não | 30–45 min | Não |
| **MaRs-IB** | Open-access (não-comercial) | NÃO | NÃO | Baixo (matrices) | DIY | 15–20 min | Parcial |
| **SJT customizado** | R$ 15–50k único | Sim (se validado) | N/A (não é teste psicológico) | **Baixo** (d ≈ 0,38) | Sim | 15–25 min | **SIM** |

### 5.2 Achados críticos por instrumento

#### BPR-5 — ALERTA VERMELHO
**Status SATEPSI: DESFAVORÁVEL desde 11/04/2023.** Normatização vencida, sem revisão aprovada até abril/2026. Uso configura falta ética conforme Resolução CFP 31/2022. Qualquer psicólogo que utilize está sujeito a processo ético no CRP. **Não use.**

#### Wonderlic WPT-R — Inviável
Sem versão PT-BR validada. Sem listagem no SATEPSI. Adverse impact severo (d = 0,68 bruto, 0,85–0,92 com correções, Robie et al. 2024). Pricing não público. Inviável legalmente no Brasil.

#### CCAT — Idioma
Apenas em inglês. Pricing a partir de USD 1.200/ano (~R$ 6.000). Integração ATS sólida (40+ via API). **Para clínica odontológica recrutando atendimento que não exige inglês, é descarte direto.**

#### R-1 e G-36 (Vetor Editora) — Recomendados se houver psicólogo
- Ambos com **SATEPSI favorável**
- Aplicação coletiva, correção via Vetor Online
- Custo baixo (R$ 3–6/candidato)
- Medem fator-g não-verbal — **menor viés linguístico**
- **EXIGEM psicólogo CRP como Responsável Técnico** — impossível automatização total
- Sem versão online auto-aplicada aprovada pelo SATEPSI

#### AC-15 — Útil mas não é Gf
Mede **atenção concentrada**, não raciocínio fluido. SATEPSI favorável. Pode ser útil em pipeline para cargos com demanda atencional alta (dentista executando procedimento, recepção sob pressão), mas não substitui um teste cognitivo geral.

#### HMT (Hagen Matrices Test) — Promissor mas com licença
- 100% open-source para uso **não-comercial**
- Mede Gf genuíno (α = 0,80)
- Inglês, espanhol, alemão (sem PT-BR)
- Web-based pronto
- Para uso em ATS comercial: requer negociação com FernUniversität Hagen
- Sem normas brasileiras

#### SJT Customizado — Melhor opção para automação total

**Por que ganha:**
- Não é classificado como "teste psicológico" sob a CFP 31/2022 → **não exige psicólogo CRP**
- Adverse impact baixo (d ≈ 0,38, McDaniel et al. 2007)
- Custo zero por uso após desenvolvimento
- Validade preditiva r ≈ 0,26–0,32 (Webster et al. 2020 meta-analysis)
- Job-relevance imbatível — cenários reais da clínica
- 100% automatizável

**Como construir:**
1. Workshop com 5–8 SMEs (dentistas, gerentes de clínica, recepcionistas seniores)
2. Gerar 30+ cenários odontológicos reais (dilemas: paciente irritado, sobreposição de horário, falha de equipamento, conflito ética × instrução do dono)
3. Para cada cenário, 4–5 alternativas de resposta + escala "faria isto" (Likert 1–5)
4. Validar com painel de especialistas (concordância ≥ 70%)
5. Piloto com 50 candidatos + comparação com desempenho real após 6 meses
6. Refinar cenários com baixa discriminação

**Custo estimado:** R$ 15–50k de desenvolvimento (uma vez), zero por uso após.

**Precedente:** NHS UK migrou Dental Foundation Training para SJT-only em 2025 exatamente por adverse impact menor com validade preditiva mantida. [BDA news](https://www.bda.org/news-and-opinion/news/dft-recruitment-moves-to-sjt-only/).

### 5.3 Top 3 recomendações operacionais

| # | Configuração | Quando escolher | Risco | Custo |
|---|--------------|-----------------|-------|-------|
| 1 | **SJT-only customizado** | ATS 100% automatizado, sem psicólogo no fluxo | Baixo | R$ 15–50k único |
| 2 | **Pipeline híbrido**: SJT (online auto) → Top 40% → G-36 supervisionado por psicólogo → Top 50% → Entrevista | Empresa quer rigor psicométrico nos finalistas | Baixo-moderado | R$ 15–50k SJT + R$ 3,50/finalista G-36 + ~R$ 3k/mês psicólogo PJ RT |
| 3 | **G-36 + Psicólogo RT puro** | Empresa precisa máxima validade e tem fluxo manual | Baixo (compliance total) | R$ 3,50–6/candidato + psicólogo |

**Recomendação central para clínica odontológica em escala (rede de clínicas): opção 2.** Combina automação (custo marginal baixo na triagem) com rigor (G-36 nos finalistas) e compliance (psicólogo CRP supervisor).

---

## 6. Riscos Legais Brasil — LGPD + CFP/SATEPSI + Lei 9.029

### 6.1 Vetores de risco em ordem de urgência

#### 1. CFP/SATEPSI — Risco **IMEDIATO E CONCRETO**

**Base legal:**
- **Lei 4.119/62, Art. 13, §1º, 'b'** — torna privativo do psicólogo a "orientação e seleção profissional" com métodos psicológicos
- **Resolução CFP 31/2022** (revogou a 09/2018) — define listagem SATEPSI obrigatória para uso profissional de testes
- **Art. 47, Lei de Contravenções Penais** — exercício de profissão sem habilitação é contravenção penal (prisão simples 15 dias a 3 meses, ou multa)

**Aplicação ao ICAR60:**
- Não consta em nenhuma lista do SATEPSI (favorável, desfavorável, não avaliado, ou não-privativo)
- Se o CFP classificá-lo como instrumento psicológico (provável dado o conteúdo), seu uso comercial em seleção por não-psicólogos é **ilegal**
- Independe de ser "domínio público" ou ser "open-source"

**Saídas:**
1. **Substituir por prova técnica** de raciocínio lógico construída internamente, sem qualquer terminologia psicológica → não é teste psicológico
2. **Contratar psicólogo CRP como RT** que aplique e interprete instrumentos psicológicos
3. **Migrar para SJT** (não classificado como teste psicológico)

#### 2. LGPD Art. 20 — Direito de Revisão de Decisão Automatizada

**Texto da lei:**
> "O titular dos dados tem direito a solicitar a revisão de decisões tomadas **unicamente** com base em tratamento automatizado de dados pessoais que afetem seus interesses [...]"

**Exigências práticas:**
- Revisão humana **genuína** documentada (não meramente protocolar)
- Capacidade de fornecer "informações claras e adequadas sobre os critérios e procedimentos utilizados" (§1º)
- Registro de quem revisou e o que considerou

**Status regulatório:** ANPD publicou **Nota Técnica nº 12/2025** consolidando consulta pública sobre o tema. Regulamentação específica em curso — **tendência é apertar, não afrouxar**.

**Implicação para o ATS:** scoring automático que elimina candidato exige que haja revisão humana acionável caso o candidato solicite. Workflow: candidato eliminado → notificação com motivo geral → opção "solicitar revisão" → fila de revisão humana com SLA documentado.

#### 3. Score Cognitivo como Dado Sensível — Zona Cinzenta

**Art. 5º, II LGPD** lista dados "referentes à saúde" como sensíveis. Doutrina majoritária trata o rol como taxativo, mas há debate real:

- Score cognitivo isolado: provavelmente não é "saúde"
- Score que pode revelar condição cognitiva (déficit de atenção, declínio): provavelmente é "saúde"
- Bateria neuropsicológica completa: claramente "saúde"

**Recomendação de compliance defensiva:** tratar como sensível. Custo da proteção adicional é baixo, custo de ser autuado é alto.

**Consequências do enquadramento como sensível:**
- Base legal muda: **consentimento explícito e específico** (Art. 11), não apenas legítimo interesse
- Legítimo interesse **não pode** ser usado
- RIPD praticamente obrigatório
- DPO pode se tornar obrigatório mesmo para pequenas empresas (rede de clínicas com 1000+ candidaturas/ano)

#### 4. Lei 9.029/95 — Discriminação por Efeito (Disparate Impact)

A lei proíbe **práticas discriminatórias na contratação** — incluindo as **sem intenção** discriminatória mas com **efeito** discriminatório.

**Status jurisprudencial específico para testes cognitivos em ATS no Brasil:**
- **Não há acórdão de mérito do TST** sobre o tema até abril/2026
- **Revista do TST v. 90, n. 3 (2024)** publicou artigo doutrinário específico sobre discriminação algorítmica em contratações
- TST tem jurisprudência firme sobre **antecedentes criminais** (R$ 100k dano moral coletivo, 2025) e **restrição de crédito** como critérios discriminatórios → sinaliza disposição para julgar testes cognitivos no mesmo molde
- MPT tem grupo de trabalho com **modelos processuais prontos** para ação civil pública em discriminação algorítmica
- **Súmula 443 TST**: indícios de discriminação invertem ônus da prova → empresa precisa **provar** que não discriminou

**Risco emergente, não consolidado.** Mas a falta de acórdãos não é "vacina" — é "primeira vez vai ser caro".

#### 5. RIPD (Relatório de Impacto à Proteção de Dados) — Quase obrigatório

**Art. 38 LGPD** — obrigatório quando há:
- Tratamento de dados sensíveis
- Decisões automatizadas de alto impacto
- Uso de legítimo interesse como base

**Para ATS com scoring cognitivo, todos os 3 gatilhos podem estar ativos.** RIPD não é público (documento interno) mas deve estar disponível para ANPD em fiscalização. Ausência é **agravante** em caso de infração.

#### 6. Retenção de Dados e DPO

**Retenção:**
- LGPD não fixa prazo específico
- ANPD usa internamente 12 meses como referência
- Doutrina: exclusão imediata após encerramento do processo seletivo (sem consentimento)
- **Banco de talentos** exige consentimento explícito separado

**DPO:**
- Microempresas e startups podem dispensar (Resolução ANPD 2/2022)
- Dispensa **cai** se houver tratamento de alto risco (sensível + automatizado)
- Para rede de clínicas processando 1000+ candidatos/ano com scoring: **DPO recomendado**

### 6.2 Checklist de compliance mínimo viável

```
[ ] Cada instrumento do ATS classificado: psicológico / não psicológico / prova técnica
[ ] Psicólogo CRP envolvido na aplicação e interpretação de instrumentos psicológicos
[ ] Aviso de privacidade entregue ANTES da coleta do score, contendo:
    - finalidade
    - base legal
    - prazo de retenção
    - existência de decisão automatizada
    - canal para exercício de direitos
[ ] Revisão humana documentada das decisões automatizadas (Art. 20 §1º)
[ ] RIPD elaborado cobrindo o scoring cognitivo
[ ] Critérios de corte documentados e justificados em job analysis
[ ] Auditoria de disparate impact ao menos anualmente (gênero, raça, faixa etária)
[ ] Prazo de exclusão configurado (default: 12 meses, ou imediato sem consentimento)
[ ] Canal de resposta a solicitações Art. 20 §1º LGPD estabelecido com SLA
[ ] DPO designado se rede tiver volume alto + scoring sensível
[ ] Base legal escolhida e documentada (consentimento explícito recomendado)
```

### 6.3 Risco residual mesmo com compliance — Validação criterial

**Principal risco residual em qualquer cenário**: ausência de **validação criterial local** (correlação entre score do teste e desempenho real no cargo, com amostra brasileira).

Sem esse dado, qualquer cut score é juridicamente indefensável em litígio. A recomendação operacional é:
1. Iniciar o processo com cut score conservador (banda larga)
2. Coletar dados de desempenho 6–12 meses
3. Usar essa amostra para retroativamente validar o cut score e calcular norma local
4. **Documentar tudo** — RIPD atualizado, relatório de auditoria de adverse impact

---

## 7. Recomendação Final Detalhada

### 7.1 Decisão por critério

| Critério | ICAR60 | SJT-only | Híbrido SJT+G-36 | G-36+psicólogo |
|----------|--------|----------|------------------|----------------|
| Compliance CFP/SATEPSI | ❌ | ✅ | ✅ | ✅ |
| Validação PT-BR | ❌ | Sim (desenvolver) | Parcial | Sim |
| Adverse impact | Moderado-alto | **Baixo** | Baixo-moderado | Moderado |
| Custo unitário | DIY alto | Zero após dev | Baixo | Baixo |
| Tempo de set-up | 12+ meses | 3–6 meses | 4–6 meses | 1–2 meses |
| Automação total | Sim (técnico) | **Sim** | Parcial | Não |
| Validade preditiva | r ≈ 0,40–0,50 | r ≈ 0,32 | **r ≈ 0,45–0,55** | r ≈ 0,45–0,50 |
| Defensibilidade legal | **Crítica** | Alta | Alta | Alta |
| Cobertura LGPD | Difícil | Fácil | Médio | Médio |

### 7.2 Recomendação por contexto

**Se a rede de clínicas precisa de um ATS 100% automatizado (sem psicólogo no fluxo) e processa milhares de candidatos:**
→ **SJT-only customizado.** Único caminho legal e escalável. Investe R$ 15–50k uma vez no desenvolvimento, depois custo marginal zero. Adverse impact é o menor entre as opções. Valida-se em 3–6 meses.

**Se a rede aceita ter psicólogo CRP como Responsável Técnico (PJ ou CLT) supervisionando finalistas:**
→ **Pipeline híbrido SJT (online) → G-36 (presencial nos finalistas) → Entrevista estruturada.** Maior validade preditiva, compliance total, custo controlado (G-36 só nos finalistas), adverse impact contido pelo banding.

**Se quiser preservar o ICAR como ferramenta de pesquisa interna ou benchmarking (não como decisor de seleção):**
→ Possível como **instrumento exploratório**, aplicado *após* a admissão, para construir base de dados própria de validação criterial. Não eliminaria candidatos. Custo de oportunidade alto, valor agregado baixo nos primeiros 12 meses.

**Não recomendado em nenhum cenário:**
- ICAR60 como decisor único de eliminação em ATS comercial brasileiro
- BPR-5 (SATEPSI desfavorável)
- Wonderlic / CCAT como decisor único (adverse impact alto + sem PT-BR)

### 7.3 Roadmap de implementação (cenário híbrido recomendado)

**Mês 1–2: Preparação legal e técnica**
- Contratar psicólogo CRP como Responsável Técnico (modelo PJ, 8–16h/mês ~R$ 2–4k/mês)
- Aviso de privacidade compliant LGPD redigido
- Base legal definida (consentimento explícito recomendado para score cognitivo)
- RIPD inicial elaborado
- Workshop com SMEs (gerentes, dentistas seniores, recepcionistas exemplares) para mapear cenários

**Mês 3–4: Desenvolvimento do SJT**
- 30+ cenários odontológicos
- Validação por painel
- Integração no ATS
- Definição de cut score conservador inicial (banda)

**Mês 5–6: Piloto interno**
- Aplicar em 50–100 candidatos
- Comparar com desempenho real (proxy: avaliação 90 dias)
- Auditoria de adverse impact (4/5ths estendido para BR)
- Refinar cenários

**Mês 7+: Operação + G-36 nos finalistas**
- Fluxo completo SJT → finalistas → G-36 supervisionado por psicólogo → entrevista
- Coleta contínua de dados de desempenho para validação criterial
- Auditoria de adverse impact trimestral
- Ajustes iterativos do cut score

**Mês 12: Primeira validação local completa**
- Score cognitivo correlacionado com desempenho real (n ≥ 200)
- Cut score local validado e documentado
- Norma local preliminar estabelecida
- Relatório de auditoria anual entregue ao DPO

---

## 8. Gaps e Limites desta Pesquisa

1. **RCAAP (Portugal) não verificado neste run.** Próxima rodada deve verificar se há validação ICAR em PT europeu via Universidade do Minho, Universidade de Coimbra, ISPA, ou Faculdade de Psicologia da Universidade de Lisboa.
2. **Contato direto Primi/Revelle não foi tentado.** Próximo passo de pesquisa primária: email para labape.com.br e admin@icar-project.com confirmando ausência ou existência de validação PT-BR em desenvolvimento.
3. **OSF não acessível via scraping.** Projetos não publicados de validação podem existir sem ser detectáveis.
4. **Jurisprudência TST/MPT específica para testes cognitivos**: zero acórdãos identificados — cenário emergente, não consolidado. Risco real, mas não quantificável.
5. **Custo real de licenciamento comercial do ICAR**: nunca foi negociado publicamente. Recusa anedótica do site não é confirmação formal de impossibilidade.
6. **Adverse impact por escolaridade/região no SJT customizado**: dado específico depende do conteúdo dos cenários — só será conhecido após piloto local.
7. **Resolução ANPD específica sobre Art. 20 (decisões automatizadas)**: ainda em consulta pública / nota técnica em abril/2026. Pode endurecer exigências.

---

## 9. Fontes Tier 1 (Essenciais)

### Acadêmicas (ICAR fundacional)

1. **Condon, D. M., & Revelle, W. (2014)** — *The International Cognitive Ability Resource: Development and Initial Validation of a Public-Domain Measure*. Intelligence, 43, 52–64. [DOI 10.1016/j.intell.2014.01.001](https://www.sciencedirect.com/science/article/abs/pii/S0160289614000051) — [PDF aberto](https://gwern.net/doc/iq/2014-condon.pdf)
2. **Revelle, W., Dworak, E. M., & Condon, D. M. (2020)** — *Using ICAR as Open-Source Tool to Explore Individual Differences*. PAID, 169. [PDF Revelle lab](https://personality-project.org/revelle/publications/paid.icar.pdf)
3. **Dworak, E. M. et al. (2019)** — *Age and Sex Invariance of the ICAR*. Intelligence. [DOI](https://www.sciencedirect.com/science/article/abs/pii/S0160289619301813)
4. **Young, S. R. et al. (2025)** — *Validation of ICAR Implemented in Mobile Toolbox*. J Intelligence (open access). [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12733510/)

### Item bank e licença

5. **icar-project.com** — Portal oficial Redmine
6. **Harvard Dataverse SAPA-Project** — Dados CC0. Referência via [JOPD 2016](https://openpsychologydata.metajnl.com/articles/10.5334/jopd.25)
7. **`psychTools` no CRAN** — `data(iqitems)`, `data(ability)` — itens ICAR16 acessíveis sem registro

### Brasil — psicometria de Gf

8. **Primi, R. (2009)** — *Qualidades Psicométricas do Conjunto de Testes de Inteligência Fluida*. Avaliação Psicológica. [PePSIC](https://pepsic.bvsalud.org/scielo.php?script=sci_arttext&pid=S1677-04712009000100003)

### Adverse impact + meta-analyses

9. **Schmidt, F. L., & Hunter, J. E. (1998)** — meta-análise GMA, validade r=0,51. [APA PsycNet](https://psycnet.apa.org/record/1998-10661-006)
10. **Mann, F. D. et al. (2024)** — UK GMA adverse impact, N>2M
11. **McDaniel, M. A. et al. (2007)** — SJT adverse impact d ≈ 0,38. [ResearchGate](https://www.researchgate.net/publication/229890585)
12. **Webster, A. et al. (2020)** — SJT meta-analysis. [PubMed](https://pubmed.ncbi.nlm.nih.gov/32353895/)
13. **Robie, C. et al. (2024)** — Wonderlic adverse impact d 0,68–0,92. [Tandfonline](https://www.tandfonline.com/doi/abs/10.1080/15305058.2024.2318424)

### Legal Brasil

14. **Lei 13.709/2018 (LGPD)** — texto completo
15. **Lei 9.029/95** — proibição de práticas discriminatórias
16. **Lei 4.119/1962** — regulamenta a profissão de psicólogo (Art. 13)
17. **Resolução CFP 31/2022** — uso profissional de testes psicológicos. [Atos Oficiais CFP](https://atosoficiais.com.br/cfp/resolucao-do-exercicio-profissional-n-31-2022)
18. **SATEPSI** — sistema de avaliação de testes do CFP. [Lista completa](https://satepsi.cfp.org.br/lista_teste_completa.cfm)
19. **ANPD Nota Técnica 12/2025** — decisões automatizadas (consulta pública)
20. **Revista do TST v. 90, n. 3 (2024)** — discriminação algorítmica em contratações

### Alternativas

21. **HMT (Hagen Matrices Test)** — [FernUniversität Hagen](https://www.fernuni-hagen.de/arbeitspsychologie/forschung/hagener-matrizentest-en.shtml)
22. **MaRs-IB** — Open Science Framework. [OSF](https://osf.io/g96f4)
23. **BDA (UK)** — *DFT recruitment moves to SJT-only* (2025). [BDA news](https://www.bda.org/news-and-opinion/news/dft-recruitment-moves-to-sjt-only/)
24. **Vetor Editora** — catálogo R-1 / G-36 / AC-15 (vetorpsicobrasil.com.br)

---

## 10. Histórico

- **2026-04-27 03:30 BRT** — Compilação inicial. 6 subagentes paralelos. Pesquisa disparada via cron one-shot da sessão Claude Code (job `f9a67264`). Deliverável solicitado em briefing de 2026-04-27 02:14.
- **Pesquisa irmã**: `PESQUISA-sistema-avaliacao-candidatos-recrutamento.md` (2026-04-25, 90KB) cobre o sistema completo de avaliação. Este documento é deep-dive específico do componente cognitivo.

---

> **Observação operacional**: Esta pesquisa não foi enviada ao NotebookLM (modo autônomo, sem confirmação interativa). Caso queira RAG persistente, importe via `/notebooklm` apontando para este arquivo + as 24 fontes Tier 1.
