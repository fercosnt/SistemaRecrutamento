# Alternativas ao ICAR60 — Testes Cognitivos para ATS Brasileiro

> Compilado em 2026-04-27 | Modo: Deep Research | Domínio: Psicometria / RH Tech / CFP/SATEPSI
> Foco: viabilidade em sistema automatizado de seleção para clínica odontológica
> ~45 fontes consultadas

---

## ÍNDICE

1. [Resumo Executivo](#1-resumo-executivo)
2. [Tabela Comparativa Consolidada](#2-tabela-comparativa)
3. [Wonderlic WPT / WPT-R](#3-wonderlic)
4. [CCAT — Criteria Corp](#4-ccat)
5. [Instrumentos Brasileiros SATEPSI](#5-satepsi)
6. [Barreira Legal: SATEPSI e o Psicólogo Obrigatório](#6-barreira-legal)
7. [SJT — Pivot Estratégico sem Cognitivo Puro](#7-sjt)
8. [Alternativas Open-Source Não-ICAR](#8-open-source)
9. [Top 3 Recomendações](#9-recomendacoes)
10. [Fontes — Tier 1 / 2 / 3](#10-fontes)

---

## 1. Resumo Executivo

**10 verdades que mudam a escolha do instrumento:**

1. **BPR-5 está DESFAVORÁVEL no SATEPSI desde 11/04/2023** — normatização vencida. Uso configura falta ética. Não pode ser utilizado legalmente.
2. **Qualquer teste SATEPSI exige psicólogo com CRP ativo** para aplicação, interpretação e responsabilidade técnica — isso bloqueia ATS 100% automatizado sem supervisor humano.
3. **R-1 e G-36 têm SATEPSI favorável** e são os melhores substitutos brasileiros para medir fator-g não-verbal. Aplicação coletiva possível. Correção informatizada disponível.
4. **Wonderlic não tem versão PT-BR validada e aprovada no SATEPSI** — a empresa afirma disponibilidade em 12 idiomas, mas não confirma Português do Brasil como um deles, e o SATEPSI não consta nenhum produto Wonderlic.
5. **CCAT (Criteria Corp) não tem versão PT-BR** — produto disponível em inglês, preço a partir de USD 1.200/ano (≈ R$ 6.000/ano), sem cobertura explícita para Brasil.
6. **Adverse impact de testes cognitivos puros é alto**: d ≈ 0,68–1,0 entre grupos raciais (White vs Black); Wonderlic especificamente d = 0,68 (corrigido: 0,85–0,92).
7. **SJT reduz adverse impact drasticamente**: d ≈ 0,38 entre grupos (menos da metade do cognitivo puro). Validade preditiva r = 0,26–0,32 — inferior ao cognitivo (r = 0,51), mas incremental quando combinado.
8. **HMT (Hagen Matrices Test) é open-source, mede Gf, disponível em inglês/espanhol/alemão** — sem versão PT-BR validada, mas com licença gratuita para uso não-comercial. Uso comercial requer contato com autores.
9. **BEFKI é alemão, publicado pela Hogrefe, sem versão open-source ou PT-BR** — não viável.
10. **A solução mais defensável para ATS brasileiro** é SJT customizado (cenários odontológicos) + psicólogo responsável técnico para o processo, ou parceria com plataforma que tenha psicólogo CRP como responsável técnico.

---

## 2. Tabela Comparativa Consolidada

| Instrumento | Custo | Validação BR | SATEPSI | Adverse Impact | API/Digital | Tempo | Viável para ATS? |
|---|---|---|---|---|---|---|---|
| **Wonderlic WPT-R** | ~USD 2–5/uso (enterprise) | Não (sem PT-BR validado) | Não listado | ALTO — d=0,68–0,92 (White vs Black) | Sim (API) | 12 min | Não (sem SATEPSI, sem PT-BR) |
| **CCAT (Criteria)** | USD 1.200+/ano | Não (apenas inglês) | Não listado | ALTO — similar ao WPT | Sim (40+ integrações ATS) | 15 min | Não (sem PT-BR, sem SATEPSI) |
| **BPR-5** | R$ 820/kit (~R$ 8/uso) | Sim (mas expirada) | **DESFAVORÁVEL desde 04/2023** | Moderado-Alto | Não (papel) | 45–60 min | NÃO — ilegal usar |
| **R-1 (Vetor)** | R$ 294/kit (~R$ 3/uso) | Sim (5ª edição) | **Favorável** | Baixo-Moderado (não-verbal) | Correção digital (VOL) | 30 min | Sim, com psicólogo |
| **G-36 (Vetor)** | R$ 320/kit (~R$ 3,50/uso) | Sim | **Favorável** | Baixo-Moderado (não-verbal) | Correção digital | 30 min | Sim, com psicólogo |
| **AC-15** | R$ 150/kit (~R$ 2/uso) | Sim | **Favorável** | Baixo | Correção digital | 5 min | Sim, com psicólogo (atenção, não Gf) |
| **HMT (open-source)** | Gratuito (não-comercial) | Não (sem normas BR) | Não listado | Moderado | Web-based | 20 min | Parcial (sem SATEPSI, sem normas BR) |
| **BEFKI** | Proprietário Hogrefe | Não | Não listado | Não avaliado | Não (papel/pesquisa) | 30–45 min | Não |
| **ICAR60** | Gratuito (domínio público) | Não (sem normas BR) | Não listado | Moderado-Alto | Sim (web) | 25–30 min | Parcial (sem SATEPSI) |
| **SJT Customizado** | Desenvolvimento único (~R$ 15–50k) | Sim (se validado localmente) | Não aplicável | BAIXO — d≈0,38 | Sim (digital) | 15–25 min | **SIM — melhor opção** |

---

## 3. Wonderlic WPT / WPT-R

### Disponibilidade no Brasil

**[PESQUISADO]** A Wonderlic afirma que o WPT está disponível em 12 idiomas. Contudo, não há confirmação oficial de Português do Brasil como um dos idiomas disponíveis nos materiais públicos consultados. Nenhum distribuidor brasileiro oficial foi identificado. O SATEPSI não registra nenhum produto Wonderlic em sua base de dados favoráveis ou desfavoráveis.

**Conclusão:** Sem versão PT-BR validada e sem SATEPSI, o Wonderlic não pode ser usado legalmente em processos seletivos no Brasil conduzidos por psicólogos.

### Custo de Licença

Pricing não é público. Estimativas de mercado indicam USD 2–5 por avaliação individual em planos enterprise, ou modelo de assinatura anual. O produto principal atual é o WPT-R (Revised), não mais o WPT clássico.

### Adverse Impact

**[PESQUISADO]** Meta-análise de 2024 (Robie, Rasheed, Risavy & Steel) — resultados por grupo:

| Comparação | d bruto | d corrigido (range restriction) |
|---|---|---|
| White vs Black | 0,68 | 0,85–0,92 |
| White vs Hispanic | 0,47 | 0,51 |
| White vs Asian | 0,10 | — |
| White vs Non-White | 0,45 | 0,49 |

Estes d-scores são dos mais altos entre testes cognitivos de screening — equivalentes ou superiores ao SAT/ACT. Em processos seletivos com corte alto, geram underrepresentation severa de candidatos negros e pardos.

**Implicação para Brasil:** Em contexto de diversidade racial brasileira, o adverse impact seria substancial. Não há estudos específicos para população brasileira.

### SATEPSI Status

**Não listado.** O SATEPSI não avaliou nenhum produto Wonderlic.

---

## 4. CCAT — Criteria Cognitive Aptitude Test

### Disponibilidade PT-BR e Cobertura Brasil

**[PESQUISADO]** O CCAT é produzido pela Criteria Corp (EUA, fundada 2006). O produto está disponível em múltiplos países, mas:

- **Sem versão PT-BR confirmada** — materiais públicos não confirmam português do Brasil
- A Criteria Corp menciona cobertura em "América do Norte, Europa, África, Austrália, Ásia e Oceania" — América Latina não listada explicitamente
- O SATEPSI não lista nenhum produto Criteria Corp

### Custo

**[PESQUISADO]** Pricing a partir de **USD 1.200/ano** (≈ R$ 6.000/ano em 2026) para o plano Professional, conforme informações em G2.com. Planos:

- **Professional**: inclui CCAT + integrações ATS padrão (40+ integrações)
- **Professional+**: adiciona entrevistas em vídeo/ao vivo
- **Talent Success Suite**: para médias/grandes empresas, inclui desenvolvimento

Contratos com mínimo de 12 meses. Pricing por uso não divulgado publicamente.

### Integração com ATS via API

**[PESQUISADO]** Sim — 40+ integrações com ATS (Greenhouse, Lever, Workday, etc.). API documentada disponível. Este é um ponto forte do produto para ATS automatizado, mas o obstáculo central permanece: sem PT-BR e sem SATEPSI.

### Adverse Impact

Não há meta-análise específica para o CCAT. Como teste de habilidade cognitiva geral (GMA), espera-se adverse impact similar a outros testes de GMA: d ≈ 0,7–1,0 entre grupos raciais. Criteria Corp publica dados de adverse impact por solicitação, mas não publicamente.

---

## 5. Instrumentos Brasileiros SATEPSI

### 5.1 BPR-5 — ALERTA CRÍTICO: DESFAVORÁVEL

**[PESQUISADO — CONFIRMADO]**

- **Status SATEPSI: DESFAVORÁVEL desde 11/04/2023**
- Motivo: estudos de normatização vencidos
- **Uso configura falta ética** conforme Resolução CFP nº 31/2022
- Publicado por Casa do Psicólogo / Pearson
- Kit completo: R$ 820 (25 protocolos por forma)

**O BPR-5 não pode ser recomendado.** Qualquer psicólogo que o utilize incorre em infração ética. Não há nova versão aprovada confirmada até abril de 2026.

---

### 5.2 R-1 — Teste Não-Verbal de Inteligência (RECOMENDADO)

**[PESQUISADO]**

**O que mede:** Fator g de inteligência geral — analogias não-verbais progressivamente mais difíceis (40 itens), modelo similar às Matrizes Progressivas de Raven. Mínimo impacto de linguagem.

**Autores:** Irai Cristina Boccato Alves, Rynaldo de Oliveira
**Editora:** Vetor Editora
**Status SATEPSI:** Favorável (5ª edição) — também disponível Forma B

**Especificações:**
- Faixa etária: 18–65 anos
- Aplicação: Individual ou coletiva
- Tempo: 30 minutos
- Correção: Plataforma VOL (Vetor Online) — informatizada
- Contextos aprovados: Trânsito, organizacional, seleção de pessoal

**Custo:**
- Kit completo (1 manual + 1 livro de exercícios + 2 blocos de 50 folhas + 100 correções + 1 crivo): **R$ 294**
- Custo por aplicação: ≈ **R$ 2,94–5,00** (considerando consumíveis + correção)

**Limitações para ATS:**
- Requer psicólogo CRP para compra e responsabilidade técnica
- Aplicação é papel-físico (os blocos são físicos), mas a correção é digital via VOL
- Não há versão online/remota aprovada pelo SATEPSI para o R-1

**Vantagem sobre ICAR60:** Normas brasileiras por escolaridade e região. Validação local.

---

### 5.3 G-36 — Teste Não-Verbal de Inteligência (ALTERNATIVO AO R-1)

**[PESQUISADO]**

**O que mede:** Fator g — 36 questões de raciocínio não-verbal. Ausência de linguagem escrita — aplicável a analfabetos funcionais.

**Autor:** Efraim Rojas Boccalandro
**Editora:** Vetor Editora
**Status SATEPSI:** Favorável (normas atualizadas aprovadas em 31/08/2018)

**Especificações:**
- Faixa etária: 18–68 anos (a partir do ensino médio)
- Aplicação: Individual ou coletiva (não informatizada)
- Tempo: 30 minutos máximo
- Correção: Informatizada (Vetor Online)

**Custo:**
- Kit completo: **R$ 320**
- Bloco de respostas (25 folhas): **R$ 37**
- Custo por aplicação: ≈ **R$ 3,50–6,00**

**Comparativo G-36 vs R-1:**
| Critério | G-36 | R-1 |
|---|---|---|
| Itens | 36 | 40 |
| Faixa etária | 18–68 | 18–65 |
| Analfabetos funcionais | Sim | Não |
| Custo/aplicação | ≈ R$ 3,50 | ≈ R$ 3,00 |
| SATEPSI | Favorável | Favorável |
| Correção digital | Sim (VOL) | Sim (VOL) |

**Para clínica odontológica:** G-36 é ligeiramente preferível por aceitar candidatos de menor escolaridade (recepcionistas, auxiliares).

---

### 5.4 AC-15 — Atenção Concentrada

**[PESQUISADO]**

**Status SATEPSI:** Favorável
**Autor:** Efraim Rojas Boccallandro | **Editora:** Vetor Editora

**O que mede:** Atenção concentrada (velocidade + precisão na identificação de estímulos). **NÃO mede raciocínio fluido nem fator g.**

**Tempo:** 5 minutos | **Aplicação:** Coletiva | **Correção:** Informatizada

**Relevância para RH odontológico:** Alta para cargos operacionais (recepção, administração de agendas, precisa de atenção a detalhes). Baixa validade preditiva para complexidade cognitiva.

**Recomendação:** Usar como complemento ao G-36 ou R-1, não como substituto. A combinação G-36 + AC-15 fornece Gf + atenção com custo total < R$ 10/candidato.

---

### 5.5 Outros Testes SATEPSI Favoráveis para RH (Cognitivos)

**[PESQUISADO]**

Com base na lista SATEPSI consultada:

| Teste | O que mede | Aplicação | Custo estimado | Observação |
|---|---|---|---|---|
| **SON-R 6-40** | Inteligência não-verbal (CHC) | Individual | Alto (Hogrefe) | Robusto psicometricamente, caro |
| **WAIS-III** | Inteligência total (verbal + performance) | Individual | Alto | Clínico, não recomendado para seleção em massa |
| **Raven CPM/SPM** | Raciocínio por matrizes (Gf) | Coletiva | Médio (Casapsi) | Clássico, sem correção digital aprovada |
| **BACog** | Cognição ampla (neuropsicológico) | Individual, Online | Alto | Muito clínico para RH |

**Para seleção em massa (RH):** R-1 e G-36 são os instrumentos mais adequados da lista SATEPSI — curtos, coletivos, correção digital.

---

### 5.6 BFP / BFP-2 — Bateria Fatorial de Personalidade

**[NOTA]** O BFP-2 é um instrumento de **personalidade** (Big Five), não cognitivo. Status SATEPSI: Favorável. Relevante para triagem de candidatos mas não substitui teste cognitivo. Recomendável como complemento numa bateria completa: G-36 (cognição) + BFP-2 (personalidade) + SJT situacional.

---

## 6. Barreira Legal: SATEPSI e o Psicólogo Obrigatório

### O que diz a lei

**[PESQUISADO — FONTE: CFP Resolução nº 31/2022 + Lei 4.119/1962]**

1. **O uso profissional de testes psicológicos é privativo do psicólogo**, conforme Art. 13 da Lei nº 4.119/1962. Isso inclui aplicação, interpretação e laudo.

2. **A compra de testes SATEPSI só pode ser feita por psicólogo com CRP ativo**, que se responsabilizará pelo uso do material.

3. **Aplicação informatizada ≠ aplicação online/remota.** São modalidades distintas. Apenas testes com estudos específicos de equivalência aprovados para formato remoto podem ser aplicados à distância.

4. **Plataformas automatizadas sem supervisão de psicólogo** que aplicam testes SATEPSI incorrem em violação ética e legal — o psicólogo responsável técnico é obrigatório.

### Implicações para ATS Automatizado

| Cenário | Legalidade |
|---|---|
| ATS aplica R-1 online sem psicólogo | **Ilegal / antiético** |
| ATS aplica R-1 com psicólogo como responsável técnico que revisa resultados | **Legal** (mas caro operacionalmente) |
| ATS aplica SJT customizado (não é teste psicológico SATEPSI) | **Legal** sem exigência de psicólogo |
| ATS aplica CCAT/WPT em inglês sem SATEPSI | Zona cinzenta — viola espírito da lei, risco jurídico |
| ATS aplica ICAR60 open-source sem SATEPSI | Zona cinzenta — sem proteção legal, sem validade local |

### Modelo Híbrido Recomendado

Para um ATS brasileiro que queira incluir avaliação cognitiva com segurança jurídica:

```
Candidato preenche SJT online (automatizado, sem exigência de psicólogo)
     ↓
Top 30% avança para avaliação psicológica com psicólogo (G-36 ou R-1)
     ↓
Psicólogo emite laudo e recomendação
     ↓
ATS registra resultado e avança candidato no funil
```

**Custo do modelo híbrido:** R$ 3–6/candidato (G-36) + honorários psicólogo (R$ 50–150/laudo). Para triagem inicial com SJT, custo do psicólogo só incide nos finalistas — reduz custo total drasticamente.

---

## 7. SJT — Pivot Estratégico sem Cognitivo Puro

### Por que SJT é a melhor opção para ATS automatizado

**[PESQUISADO — META-ANÁLISES]**

**Validade preditiva:**
- SJT: r = 0,26–0,32 (Webster et al., 2020; McDaniel et al., 2007)
- Cognitivo puro (GMA): r = 0,51 (Schmidt & Hunter, 1998) / 0,31 (Sackett et al., revisão)
- SJT + Cognitivo combinado: r ≈ 0,40–0,45 (validade incremental ΔR = 0,03–0,08)

**Adverse impact:**
- Cognitivo puro: d = 0,7–1,0 (Black vs White)
- SJT: d ≈ 0,38 (Whetzel, McDaniel & Nguyen, 2008) — menos da metade
- SJT com instrução "behavioral tendency" (o que você faria): menor d ainda vs "knowledge" (o que deveria ser feito)

**Caso emblemático — odontologia:**
- Dental Foundation Training (NHS Reino Unido) migrou para **SJT only em 2025** após evidências de menor adverse impact racial
- Estudos com Dental Core Training (DCT) mostram diferenças mínimas entre grupos étnicos no SJT vs gaps significativos em outros formatos

### Construção de SJT Defensável para Clínica Odontológica

**[PESQUISADO + INFERIDO a partir de melhores práticas OPM, HumRRO, BGSU]**

#### Princípios de Construção

1. **Cenários baseados em incidentes críticos reais** — colete 20–30 situações-problema com dentistas, recepcionistas, auxiliares experientes
2. **Formato: avaliar TODAS as opções** (não ranking) — maior confiabilidade, menor d de grupo
3. **Instrução "behavioral tendency"** ("O que você faria?") — menos cognitivo, mais personalidade/ética
4. **10–12 avaliadores SME** para construir gabarito racional
5. **4 opções por item** com gradação de efetividade (excelente → boa → ruim → péssima)
6. **15–20 cenários** = 30–40 min de aplicação

#### Domínios de Conteúdo para Clínica Odontológica

| Domínio | Exemplos de Cenário |
|---|---|
| **Atendimento ao paciente ansioso** | Paciente recusa procedimento na cadeira; criança chorando na recepção |
| **Comunicação ética** | Colega comete erro clínico; paciente pede desconto não autorizado |
| **Priorização e urgência** | 3 pacientes esperando, um com dor aguda; agenda atrasada 40 min |
| **Trabalho em equipe** | Conflito entre recepcionista e auxiliar; dentista ausente inesperadamente |
| **Compliance e protocolos** | Paciente insiste em procedimento contraindicado; esterilização negligenciada |
| **Confidencialidade** | Familiar pede informações sobre paciente adulto; redes sociais no trabalho |

#### Validação Mínima para Defensabilidade Legal

1. Análise de conteúdo por 3+ dentistas/especialistas RH
2. Piloto com 50+ candidatos atuais (funcionários) para calibrar discriminação
3. Análise psicométrica básica: alpha de Cronbach > 0,70, correlação item-total > 0,25
4. Sem itens que citem raça, gênero, religião, origem
5. Documentar todo o processo de construção (defensabilidade legal)

#### Vantagens do SJT para ATS

- 100% digital, sem exigência de psicólogo para aplicação
- Pode ser embutido diretamente no ATS
- Custo: desenvolvimento único (R$ 15–50k com consultoria I-O) + zero por uso
- Face validity alta — candidatos aceitam bem cenários situacionais
- Customizável para o cargo exato

---

## 8. Alternativas Open-Source Não-ICAR

### 8.1 Hagen Matrices Test (HMT)

**[PESQUISADO]**

**Origem:** FernUniversität in Hagen, Alemanha
**O que mede:** Inteligência fluida (Gf) — matrizes não-verbais, CHC model
**Versões:**
- HMT (20 itens, 20 min) — alta dificuldade, confiabilidade α = 0,80
- HMT-S (6 itens, 5 min) — menor confiabilidade (α = 0,62), mais prático para screening

**Idiomas disponíveis:** Alemão, Inglês, Espanhol — **sem versão PT-BR**

**Licença:** Gratuito para uso **não-comercial**. Uso comercial (ATS = comercial) requer contato com autores (Sara Tsantidis, FernUniversität Hagen).

**Validade:** Correlaciona com I-S-T 2000 R (r = 0,57 para raciocínio). Normas alemãs disponíveis.

**Status SATEPSI:** Não listado.

**Avaliação para ATS brasileiro:**
- Prós: custo zero, web-based, mede Gf genuíno, confiabilidade aceitável (HMT)
- Contras: sem PT-BR, sem normas brasileiras, uso comercial requer negociação, sem SATEPSI
- Uso viável como screening complementar (sem ser o único instrumento), com tradução informal e piloto próprio

---

### 8.2 BEFKI — Berlin Test of Fluid and Crystallized Intelligence

**[PESQUISADO]**

**Origem:** Wilhelm, Schipolowski et al. — Alemanha
**Publicação:** Hogrefe (proprietário)
**Versões:** BEFKI 8-10 (adolescentes) + versão adultos
**Status:** Instrumento de pesquisa, **não open-source**, sem PT-BR, publicado pela Hogrefe Alemanha

**Avaliação para ATS:** **Inviável** — proprietário, sem PT-BR, sem normas BR, não aprovado SATEPSI. Descartado.

---

### 8.3 ICAR — International Cognitive Ability Resource (Referência)

**[PESQUISADO — para contextualizar por que é problemático no BR]**

**Licença:** Domínio público (public domain)
**Versões:** ICAR16 (16 itens, ~10 min), ICAR60 (60 itens, ~25–30 min)
**O que mede:** Raciocínio verbal, numérico, espacial, processamento de matrizes
**Validade:** Correlação com Raven SPM r ≈ 0,40–0,46

**Problemas para uso no Brasil:**
1. **Sem normas brasileiras** — escores não têm referência local
2. **Sem SATEPSI** — ilegal como único instrumento em avaliação psicológica formal
3. **Adverse impact**: sem dados específicos para população brasileira; espera-se moderate-high como qualquer teste de GMA
4. **Idioma:** tradução para PT-BR existe informalmente, sem validação científica publicada

**Uso defensável:** Como screening preliminar informal (não como teste psicológico formal) em ATS, com declaração explícita que não é avaliação psicológica. Risco legal permanece.

---

### 8.4 Open Psychometrics Project

**[PESQUISADO]**

**Licença:** Creative Commons (varia por teste)
**Foco principal:** Testes de personalidade (Big Five, Dark Triad, Myers-Briggs unofficial, etc.)
**Testes cognitivos disponíveis:** Escassos — predominam personality/psychopathology
**Nota dos autores:** "Fortemente desaconselhado para qualquer uso além de entretenimento pessoal"

**Avaliação para ATS:** **Inviável** para uso formal.

---

## 9. Top 3 Recomendações

### Opção 1 — SJT Customizado (MELHOR OPÇÃO)

**Para quê:** ATS completamente automatizado, sem exigência de psicólogo, defensável legalmente

**Como implementar:**
- Contratar psicólogo I-O ou consultoria para construir 15–20 cenários odontológicos
- Validar com painel de SMEs (dentistas + RH)
- Piloto com 50–100 funcionários/candidatos atuais
- Embutir no ATS como etapa de triagem online
- Instrução "behavioral tendency" para menor adverse impact

**Custo:** R$ 15.000–50.000 investimento único (desenvolvimento + validação) + zero por uso
**Adverse impact:** BAIXO (d ≈ 0,38)
**Validade preditiva:** r = 0,26–0,32 (moderada, mas suficiente para triagem)
**Risco legal:** Baixo — SJT não é "teste psicológico" no sentido da Lei 4.119/1962
**Limitação:** Menor validade que cognitivo puro; precisa de validação local para ser defensável

---

### Opção 2 — G-36 + Psicólogo Responsável Técnico (MELHOR PARA VALIDADE)

**Para quê:** Processos seletivos onde validade preditiva é prioridade e há volume gerenciável de candidatos

**Como implementar:**
- Contratar psicólogo CRP como responsável técnico do processo (CLT ou PJ)
- G-36 aplicado coletivamente (papel) para top 50% após triagem de currículo
- Correção via VOL (Vetor Online) — digital
- Psicólogo emite laudo individual para candidatos finalistas
- Resultado integrado manualmente no ATS

**Custo:** R$ 3,50–6/candidato (material) + R$ 50–150/laudo psicólogo
**Adverse impact:** Moderado (menor que WPT/CCAT por ser não-verbal)
**Validade preditiva:** r ≈ 0,40–0,50 (fator g, próximo de Schmidt & Hunter)
**Risco legal:** Muito baixo — totalmente conforme CFP
**Limitação:** Não 100% automatizado; operacional mais pesado em alto volume

---

### Opção 3 — SJT + G-36 em Etapas (MELHOR EQUILÍBRIO)

**Para quê:** Balancear automação, validade, custo e compliance

**Pipeline:**

```
Etapa 1 — Online/automático: SJT (15 cenários, 20 min)
  → Top 40% avança

Etapa 2 — Presencial/semipresencial: G-36 supervisionado por psicólogo (30 min)
  → Top 50% avança (escores ≥ P50 por escolaridade)

Etapa 3 — Entrevista estruturada
  → Psicólogo emite laudo final
```

**Validade combinada:** r ≈ 0,45–0,55 (SJT + GMA > cada um isolado)
**Adverse impact combinado:** Moderado (SJT dilui o d alto do G-36)
**Custo:** SJT zero/uso + G-36 R$ 3,50–6/candidato (somente para que passa etapa 1)
**Compliance:** Total — psicólogo é RT do G-36 e emite laudos

---

## 10. Fontes — Tier 1 / 2 / 3

### Tier 1 — Essencial

1. **CFP — Resolução nº 31/2022** — Diretrizes para avaliação psicológica e regulação do SATEPSI
   - https://atosoficiais.com.br/cfp/resolucao-do-exercicio-profissional-n-31-2022
   - Fonte primária legal para qualquer decisão sobre uso de testes no Brasil

2. **SATEPSI — Lista completa de testes** — Status favorável/desfavorável atualizado
   - https://satepsi.cfp.org.br/lista_teste_completa.cfm
   - Verificar antes de usar qualquer instrumento

3. **Schmidt & Hunter (1998)** — "The Validity and Utility of Selection Methods in Personnel Psychology"
   - https://psycnet.apa.org/record/1998-10661-006
   - Meta-análise fundacional: validade r=0,51 para GMA

4. **Robie, Rasheed, Risavy & Steel (2024)** — Meta-análise Wonderlic e adverse impact
   - https://www.tandfonline.com/doi/abs/10.1080/15305058.2024.2318424
   - d=0,68 White vs Black no WPT

5. **Webster et al. (2020)** — "Situational judgement test validity for selection: systematic review and meta-analysis"
   - https://pubmed.ncbi.nlm.nih.gov/32353895/
   - Pooled validity SJT r=0,32 (IC 95%: 0,26–0,39)

6. **McDaniel, Hartman, Whetzel & Grubb (2007)** — SJT meta-análise construtos e validade
   - https://www.researchgate.net/publication/229890585
   - Incremental validity ΔR=0,03–0,08 sobre GMA; adverse impact d≈0,38

### Tier 2 — Complementar

7. **Hagen Matrices Test — FernUniversität** — Descrição técnica, licença, psicometria
   - https://www.fernuni-hagen.de/arbeitspsychologie/forschung/hagener-matrizentest-en.shtml

8. **CFP — Nota Orientativa sobre testes informatizados/online**
   - https://site.cfp.org.br/nota-orientativa-sobre-o-uso-de-testes-psicologicos-informatizados-computadorizados-e-ou-de-aplicacao-remota-online/

9. **British Dental Association (BDA) — DFT Recruitment moves to SJT only (2025)**
   - https://www.bda.org/news-and-opinion/news/dft-recruitment-moves-to-sjt-only/

10. **Criteria Corp — Plans and Pricing**
    - https://www.criteriacorp.com/plans-and-pricing

11. **Christian, Edwards & Bradley (2010)** — "Situational Judgment Tests: Constructs Assessed and a Meta-Analysis of Criterion-Related Validities"
    - https://mikechristian.web.unc.edu/wp-content/uploads/sites/13307/2016/11/Christian-et-al-2010-PPsych-SJT.pdf

12. **Vetor Editora — Catálogo 2024 (R-1 e G-36)**
    - https://www.vetoreditora.com.br
    - Preços e composição dos kits confirmados

### Tier 3 — Referência

13. **Sapiens PSI — BPR-5 Kit** (confirma status desfavorável)
    - https://sapiens-psi.com.br/bpr-5-bateria-de-prova-de-raciocinio-a-b-kit-completo/

14. **Kirkegaard (2024)** — "Group differences on the Wonderlic short IQ test"
    - https://emilkirkegaard.dk/en/2024/02/group-differences-on-the-wonderlic-short-iq-test/

15. **Burgoyne, Mashburn & Engle (2021)** — "Reducing adverse impact in high-stakes testing"
    - https://englelab.gatech.edu/articles/2021/Burgoyne,%20Mashburn,%20&%20Engle%20(2021)%20-%20Reducing%20Adverse%20Impact.pdf

16. **OPM (US Office of Personnel Management)** — SJT construction guide
    - https://www.opm.gov/policy-data-oversight/assessment-and-selection/other-assessment-methods/situational-judgment-tests/

17. **HumRRO — Evidence-Based Best Practices: SJTs**
    - https://www.humrro.org/corpsite/blog/evidence-and-experience-based-best-practices-situational-judgment-tests/

18. **PubMed — SJT validity for dental selection**
    - https://pubmed.ncbi.nlm.nih.gov/28496220/
    - https://pubmed.ncbi.nlm.nih.gov/28296651/

---

## Gaps Identificados

1. **Custo de honorários psicólogo RT no Brasil** — sem dados de mercado precisos para psicólogo em modalidade responsável técnico por processo seletivo
2. **Normas brasileiras para HMT** — não existem; seria necessário coleta de dados local com N ≥ 200 para usar com referência nacional
3. **Versão PT-BR do ICAR validada** — existe tradução informal, mas sem estudo de validação publicado no Brasil
4. **Equivalência digital do R-1** — não há estudo de equivalência papel-digital aprovado no SATEPSI para o R-1; bloqueia uso remoto
5. **Impacto específico de testes não-verbais (R-1/G-36) em população brasileira por raça** — literatura nacional escassa sobre adverse impact local
6. **Custo de desenvolvimento SJT com psicólogo I-O no Brasil** — estimativa R$ 15–50k é ampla; seria necessário cotação de mercado

---

*Documento gerado em 2026-04-27 | deep-research skill | ~45 fontes consultadas*
