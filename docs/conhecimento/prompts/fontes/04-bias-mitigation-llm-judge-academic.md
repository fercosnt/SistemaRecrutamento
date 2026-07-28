# Subagente 4 — Bias em LLM-as-Judge Aplicado a Recrutamento — Literatura 2024-2026 + Técnicas de Mitigação

> Coletado em 2026-04-27 via deep-research subagente (Sonnet) | 12 papers + 28 fontes

---

## PARTE 1 — TOP 12 PAPERS E REPORTS (2024-2026)

### 1. Wilson & Caliskan — "Gender, Race, and Intersectional Bias in Resume Screening via LLM Retrieval" (UW + Brookings, AAAI/ACM AIES 2024)
**URL:** https://arxiv.org/abs/2407.20371
- 554 CVs reais + 571 vagas em 9 ocupações; 80 nomes variando raça (Black/White) e gênero
- **Nomes white-associated favorecidos em 85.1% dos casos**
- Nomes female-associated favorecidos em apenas 11.1%
- **Homens negros: 0% favorecimento vs homens brancos** — discriminação máxima em todos os testes
- Bias emerge dos **embeddings**, não do LLM gerador — modelo nunca "vê" o nome explicitamente, mas representação vetorial já carrega sinal
- **Implicação PT-BR:** Nomes afro-brasileiros, indígenas ou nordestinos podem ter representações vetoriais sub-ótimas

### 2. An, Huang, Lin & Tai — "Measuring Gender and Racial Biases in LLMs: Intersectional Evidence" (PNAS Nexus, mar 2025)
**URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC11937954/
- ~361.000 CVs fictícios; LLMs: GPT-3.5, GPT-4o, Gemini 1.5 Flash, Claude 3.5 Sonnet, Llama 3-70b
- **Mulheres negras: +0.379 pts** (favorecidas vs homens brancos) — efeito provavelmente artefato do RLHF
- **Mulheres brancas: +0.223 pts**
- **Homens negros: -0.303 pts** (penalizados em 4 de 5 modelos)
- Debiasing simplista é **insuficiente** contra bias interseccional
- **Todos os LLMs comerciais discriminam homens negros**

### 3. Rao, Venkatesan et al. — "Invisible Filters: Cultural Bias in Hiring Evaluations" (AAAI/ACM AIES 2025)
**URL:** https://arxiv.org/html/2508.16673v1
- Transcrições de candidatos **indianos** recebem scores menores que britânicos em todas as métricas (contratabilidade, auto-promoção, impressão positiva)
- **Bias não é ativado por nome — é ativado por características linguísticas:** diversity lexical, complexidade sintática, readability
- LLMs penalizam sentenças longas e vocabulário não-anglo-saxônico
- **Implicação PT-BR:** Candidatos do NE com escrita mais formal/rebuscada, ou do Sul com estruturas frasais distintas, podem ser penalizados por **diferença de estilo, não de competência**

### 4. Anzenberg et al. — "Evaluating the Promise and Pitfalls of LLMs in Hiring" (Eightfold.ai, jul 2025)
**URL:** https://arxiv.org/html/2507.02087v1
- ~10.000 pares candidato-vaga reais
- GPT-4o e Gemini 2.5 Flash: **Impact Ratio 0.774 e 0.773** (abaixo limiar EEOC 0.80 — tecnicamente discriminatório)
- Grupos interseccionais: IR chegando a **0.620**
- Match Score (ML treinado para fairness): **0.957**
- **Justiça e acurácia não são contraditórias**
- Exemplo de instrução anti-bias: `"DO NOT JUDGE A CANDIDATE BASED ON PROTECTED ATTRIBUTES"`

### 5. Wilson, Sim et al. — "No Thoughts Just AI: Biased LLM Recommendations Limit Human Agency" (UW, set 2024)
**URL:** https://arxiv.org/html/2509.04404v1
- 528 participantes, 1.526 cenários
- IA biasada → humanos seguem em **até 90% das vezes**
- Mesmo participantes que julgavam recomendação como "pobre" ainda eram influenciados
- IAT prévio aumentou resistência em ~13%
- **Risco não é só score do LLM — humano no HITL segue cego, AMPLIFICANDO o bias**

### 6. Ye et al. — "Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge" (out 2024)
**URL:** https://arxiv.org/html/2410.02736v1
- Framework CALM com **12 tipos de bias**:
  1. Position | 2. Verbosity | 3. Compassion-Fade | 4. Bandwagon | 5. Distraction
  6. Fallacy-Oversight | 7. Authority | 8. Sentiment | 9. Diversity
  10. Chain-of-Thought | 11. Self-Enhancement | 12. Refinement-Aware
- **CRÍTICO: Chain-of-Thought gera consistentemente MAIS bias que Direct Answer**
- GPT-4-Turbo e Claude 3.5 não são necessariamente melhores em resistir

### 7. Beatty et al. — "Revealing Hidden Bias in AI" (out 2024)
**URL:** https://arxiv.org/html/2410.16927v1
- 1.100 CVs em 6 setores; Claude 3.5, GPT-4o, Gemini 1.5, Llama 3.1
- **Anonimização reduziu viés de gênero em 56% para Claude Sonnet**
- Efetividade variou por modelo e tipo de viés
- **Temperatura 0.25 + Top-p 0.5 + JSON estruturado = maior consistência**

### 8. Schroeder & Wood-Doughty — "Can You Trust LLM Judgments?" (Northwestern, dez 2024)
**URL:** https://arxiv.org/abs/2412.12509
- Temperatura 0 mascara variabilidade real
- McDonald's Omega variou de **0.167 a 1.0** entre 100 rodadas com 3 seeds
- **Single-shot é inadequado para alto risco**
- Com critérios claros: Omega ≥ 0.98 é alcançável

### 9. Leal et al. — "MuPe Life Stories Dataset: Spontaneous Speech in Brazilian Portuguese" (COLING 2025)
**URL:** https://aclanthology.org/2025.coling-main.407/
- 289 entrevistas (365h), português brasileiro espontâneo
- **ASR para PT-BR apresenta bias documentado por escolaridade e faixa etária**
- Whisper terá WER significativamente pior para candidatos idosos e com menor escolaridade em PT-BR
- **Erro sistemático na transcrição ANTES do LLM julgar**

### 10. Ko et al. — "From Weak Cues to Real Identities: De-Anonymization in LLM Agents" (mar 2026)
**URL:** https://arxiv.org/abs/2603.18382
- LLM agents reconstruíram **79.2% das identidades** em dataset Netflix anonimizado (baseline: 56%)
- Re-identificação como subproduto de análise cross-source
- **Anonimizar nome+email+endereço NÃO BASTA** — LLM reconstrói a partir de empregadores+cursos+localização

### 11. Panda, Patel et al. — "DAIQ: Auditing Demographic Attribute Inference" (ago 2025)
**URL:** https://arxiv.org/html/2508.15830v1
- 212 perguntas neutras, 6 LLMs
- **GPT-4.1 infere gênero/raça em 100% dos casos** sem pista demográfica
- Claude e Cohere mostram maior contenção
- Atribuições padrão: "Male" e "White" como defaults
- Guardrails via prompt reduzem inferências

### 12. Wilson & Caliskan (Brookings nov 2025) — "AI's Threat to Individual Autonomy in Hiring"
**URL:** https://www.brookings.edu/articles/ais-threat-to-individual-autonomy-in-hiring-decisions/
- 500+ participantes, 16 ocupações
- IA recomenda brancos → humanos escolhem brancos **90.4%**
- IA recomenda não-brancos → humanos escolhem não-brancos **90.7%**
- **Baseline sem IA: 49.3% vs 50.7% — quase igual**
- Humanos são **incapazes de identificar e resistir** ao bias de IA

---

## PARTE 2 — 8 TÉCNICAS CONCRETAS DE PROMPT ANTI-BIAS

### Técnica 1: Blind Scoring + Instrução Explícita

```
Você é um avaliador especializado em seleção de talentos. Sua única função é avaliar a adequação técnica e comportamental do candidato.

REGRAS OBRIGATÓRIAS:
1. Avalie EXCLUSIVAMENTE com base em: experiência relevante, competências demonstradas, fit cultural descrito nos critérios.
2. IGNORE COMPLETAMENTE qualquer informação que possa inferir: nome, gênero, raça, idade, religião, origem regional, estado civil, deficiência ou outra característica protegida.
3. Se você perceber que está considerando estilo de escrita como proxy (formalidade regional, marcadores de sotaque na transcrição), pare e avalie apenas o CONTEÚDO.
4. Sua avaliação deve ser idêntica se o mesmo conteúdo fosse apresentado por candidatos de qualquer grupo demográfico.
```

### Técnica 2: Rubric Decomposição (Analítico > Holístico)

```
Avalie o candidato nos seguintes critérios INDEPENDENTES. Pontue cada um de 1 a 5 com justificativa de máximo 2 frases baseada apenas em evidências do documento:

1. EXPERIÊNCIA RELEVANTE (1-5)
2. COMPETÊNCIAS TÉCNICAS (1-5)
3. ENTREGAS COMPROVADAS (1-5)
4. APRENDIZADO CONTÍNUO (1-5)
5. FIT CULTURAL (1-5): Baseado APENAS nos critérios de cultura abaixo. NÃO use estilo de escrita, vocabulário ou formalidade como proxy.

Formato: JSON com cada critério, score, e justificativa de 1-2 frases com evidência textual.
NÃO forneça score total ou recomendação geral.
```

**Por que funciona:** Holistic concentra mais bias que analytic (Kucia et al. 2026).

### Técnica 3: Counterfactual Check Automatizado

```
TAREFA DE AUDITORIA DE CONSISTÊNCIA:
Você avaliou o documento A e B independentemente. Documentos idênticos exceto pelo nome.

Document A score: [SCORE_A]
Document B score: [SCORE_B]

Se diferença > 0.5 ponto em qualquer critério:
1. Identifique qual informação (além do nome) poderia ter influenciado.
2. Reavalie usando APENAS competência e experiência.
3. Forneça score corrigido com justificativa.
```

**Pares de nomes para teste PT-BR:**
- Par 1: "João Carlos Silva" vs "Murilo Nascimento" (ambos brancos)
- Par 2: "João Carlos Silva" vs "Caio Kauê dos Santos" (sinal afro-brasileiro)
- Par 3: "Ana Beatriz Ferreira" vs "Iracema Tupã Costa" (nome indígena)
- Par 4: "Pedro Henrique Souza" vs "Raimundo Ferreira da Silva" (sotaque NE)

### Técnica 4: Self-Critique / Bias Reflection Loop

```
Você acabou de avaliar o candidato. Antes de finalizar, execute esta auditoria:

PASSO 1 — VERIFICAÇÃO DE PROXY:
Liste qualquer característica que possa ser proxy demográfico que influenciou:
- Estilo de escrita ou vocabulário (formalidade, regionalismos)?
- Nome de instituições com conotação regional/social?
- Lacunas no histórico que correlacionam com gênero/raça?
- Marcadores de sotaque na transcrição ("né", "tipo", hesitações)?

PASSO 2 — RECALIBRAÇÃO:
Para qualquer proxy identificado, reavalie usando apenas evidências de competência. Documente mudança de score.

PASSO 3 — SCORE FINAL:
Forneça o score recalibrado.
```

### Técnica 5: Multi-Judge Ensemble com Perspectivas Diferentes

Rodar mesmo documento por 2-3 LLMs (Claude + GPT-4o + Gemini), calcular score como mediana. Divergências >1 ponto → revisão humana.

```
Você recebeu três avaliações independentes do mesmo candidato:
- Avaliador A: [SCORE + JUSTIFICATIVAS]
- Avaliador B: [SCORE + JUSTIFICATIVAS]
- Avaliador C: [SCORE + JUSTIFICATIVAS]

TAREFA:
1. Identifique critérios onde divergem em >1 ponto.
2. Para cada divergência, analise se diferença pode ser explicada por:
   a) Interpretação diferente do critério (aceitável)
   b) Ponderação diferente de proxy demográfico (PROBLEMA)
3. Forneça score de consenso fundamentado APENAS em evidências compartilhadas.
```

**Quando usar ensemble:**
- Single-shot (T=0): triagem inicial alto volume com critérios objetivos muito claros
- Ensemble 2-3: **OBRIGATÓRIO para decisões finais (entrevistas, offers), candidatos borderline, auditoria periódica**

### Técnica 6: Normalização de Transcrição ANTES do LLM Julgador

**Pipeline:**
1. Whisper transcreve áudio
2. **LLM normaliza ANTES de julgar:**

```
TAREFA DE PRÉ-PROCESSAMENTO:
Você recebeu transcrição bruta de entrevista. Antes de qualquer avaliação:

1. REMOVER marcadores de disfluência ("é", "tipo", "né", "assim", "hum") sem alterar conteúdo.
2. CORRIGIR prováveis erros de transcrição (palavras distorcidas por sotaque/ruído) preservando sentido. Documente correções.
3. MANTER conteúdo de ideias, argumentos, exemplos intacto.
4. NÃO alterar vocabulário técnico.
5. NÃO "melhorar" sofisticação da linguagem — apenas normalizar ruídos.

Forneça: (a) texto normalizado, (b) lista de correções aplicadas.
```

3. Avaliação apenas do texto normalizado, sem menção a sotaque ou fluência verbal

### Técnica 7: Ancoragem com Exemplos Calibrados (BARS)

```
CALIBRAÇÃO DE ESCALA:
Para o critério "Liderança Demonstrada", use esta escala:

Score 5 — EXEMPLAR: "Liderou equipe de 8 pessoas em projeto de transformação digital, entregando em 3 meses com 15% abaixo do orçamento. Apresentou resultados ao conselho."
Score 3 — ADEQUADO: "Coordenou projeto com 3 colegas por 6 meses. Atingiu metas estabelecidas."
Score 1 — INSUFICIENTE: "Participou de projetos em equipe sem responsabilidade de coordenação."

IMPORTANTE: A escala é baseada em FATOS DEMONSTRÁVEIS. O estilo de comunicação, vocabulário formal/informal, ou nome da instituição NÃO modifica o score — apenas as entregas e responsabilidades descritas.
```

### Técnica 8: Tratamento Explícito de Marcadores de Sotaque

```
NOTA SOBRE A FONTE DO DOCUMENTO:
Este texto é uma transcrição automática de entrevista oral. Portanto:

1. Variações regionais de vocabulário (ex: "oxente", "bah", "tchê", "véi") são marcadores culturais NEUTROS, não indicadores de qualificação.
2. Estruturas frasais não-padrão na transcrição podem ser artefatos de transcrição de sotaque — NÃO indicadores de capacidade intelectual ou comunicativa.
3. Hesitações e repetições podem ser artefatos de nervosismo em entrevista — NÃO indicadores de clareza de pensamento no trabalho.
4. Avalie o CONTEÚDO das ideias, não a forma oral.
```

---

## PARTE 3 — PRÉ-PROCESSAMENTO: FERRAMENTAS E RISCOS

### Microsoft Presidio (open-source)
- Detecta: nome, email, telefone, CPF, endereço, data nascimento, empresa
- **Suporte PT-BR limitado** — requer customização de recognizers para padrões brasileiros (CPF, RG, CEP)
- Integra com LiteLLM proxy para mascarar antes de enviar ao LLM

### Campos a remover/mascarar no ATS (mínimo LGPD-compatível)
- Nome completo → `candidato_[ID]`
- Email, telefone
- Endereço (incluindo CEP que pode inferir região)
- Foto
- Data de nascimento (apenas "anos de experiência" devem constar)
- Estado civil, filhos
- Nome de cônjuge ou parentes em referências

### Risco de Over-Anonymization (Ko et al. 2026)
LLMs re-identificam candidatos a partir de **combinações de empregadores + cursos + localização + período**:
- Anonimizar nome não basta se histórico mantido intacto
- Risco maior para mercados menores (profissional de empresa específica em cidade pequena NE)
- Solução parcial: generalizar anos ("2018-2022" → "4 anos"), cidades ("Recife" → "Nordeste"), segmentos de indústria — **mas reduz qualidade de avaliação**

---

## PARTE 4 — VALIDAÇÃO CRUZADA E CONSISTENCY CHECKS

### Protocolo de Auditoria Interna

**1. Variância entre rodadas (mesmo LLM):**
- Temperature=0 NÃO garante determinismo real
- Para alto risco: rodar 3-5 vezes com seeds diferentes
- McDonald's Omega ≥ 0.80 = limiar de confiabilidade aceitável
- Omega < 0.80 → critério mal definido, refinar rubric

**2. Inter-judge (2 LLMs):**
- Krippendorff's Alpha (mais robusto que Cohen's Kappa)
- Limiar: alpha ≥ 0.67 (concordância aceitável)
- Alpha < 0.40: discordância sistemática → investigar

**3. Disparate Impact Testing (Regra 4/5 EEOC):**
```
IR = (Taxa aprovação grupo protegido) / (Taxa aprovação grupo majoritário)
Limiar: IR < 0.80 indica disparate impact → auditoria obrigatória
```

### Ferramentas

| Ferramenta | Aplicação | Limitação para LLM |
|---|---|---|
| **AIF360 (IBM)** | Métricas fairness ML clássico | Funciona melhor com modelos tradicionais |
| **Fairlearn (Microsoft)** | Acessível, bem documentado | Projetado para modelos estruturados |
| **LangFair (CVS Health)** | Específico para LLMs, BYOP | **Mais adequado** para o caso |
| **HuggingFace Evaluate** | Regard, HONEST, Toxicity | Outputs textuais, não scoring |
| **Promptfoo** | CI/CD de prompts | Ótimo para regression testing |

**Recomendação:** LangFair + Disparate Impact manual sobre scores gerados.

---

## PARTE 5 — BIAS EM TRANSCRIÇÃO PT-BR (DADOS ESPECÍFICOS)

### Whisper e sotaques
- Whisper superior em American English > British > Australian > não-nativos (Jasa Express Letters 2024)
- WER muito superior para sotaques não-nativos — **sem número específico para PT-BR brasileiro vs europeu**
- npj Digital Medicine 2026: WhisperX-GPT-4o chain reduziu erros para sotaques não-nativos
- Leal et al. COLING 2025: ASR PT-BR tem bias documentado por **escolaridade e idade**

### Meta-análise sobre accent bias em entrevistas (Maindidze et al. 2025)
- Sotaque não-padrão prejudica candidatos mesmo com avaliadores humanos
- **Bias mais forte para mulheres** que para homens
- Fortemente moderado pelo gênero do avaliador

### Implicação para pipeline PT-BR
Sotaque NE vs SP vs RS tem diferenças de WER **não documentadas para Whisper** — gap de pesquisa. Validação interna recomendada: gravar amostras de candidatos de diferentes regiões e medir WER antes de deploy.

---

## PARTE 6 — O QUE FUNCIONA vs O QUE É TEATRO

### O que funciona (evidência empírica)

| Técnica | Evidência | Redução de Bias |
|---|---|---|
| Remoção de nome + dados demográficos | Beatty et al. 2024 | -56% viés gênero (Claude) |
| Rubric analítico decomposto | Kucia et al. 2026 | Melhora consistência + reduz viés |
| Instrução explícita exclusão demográfica | Anzenberg et al. 2025 | IR de 0.77 → ainda <0.80 |
| Ensemble multi-model | Survey LLM-as-Judge 2024 | Reduz self-preference, melhora concordância |
| Normalização transcrição | Rao et al. 2025; npj 2026 | Reduz penalização por sotaque |
| Counterfactual testing | LLMCert-B 2024 | Detecta bias (não elimina) |
| Temperature baixa + JSON | Beatty et al. 2024 | Aumenta consistência |

### O que é teatro

| Técnica | Por que não basta |
|---|---|
| Só remover nome | Ko et al. 2026: re-identifica por combinação |
| Instrução genérica "seja justo" | DAIQ 2025: GPT-4.1 infere raça em 100% mesmo com instrução |
| **Chain-of-Thought como garantia de fairness** | **Ye et al. 2024: CoT gera MAIS bias que Direct Answer** |
| Temperature=0 como garantia | Schroeder 2024: Omega varia 0.17-1.0 |
| Debiasing simples | An et al. 2025: homens negros ainda penalizados em 4/5 modelos |
| Auditoria única por modelo | Brookings 2025: humanos seguem IA biasada 90% |

---

## PARTE 7 — GAPS DE PESQUISA: PT-BR ESPECIFICAMENTE

**Achado mais crítico:** literatura é quase integralmente baseada em inglês americano.

### Gaps documentados para PT-BR
1. **Nomes afro-brasileiros, indígenas, nordestinos em LLMs** — nenhum paper equivalente ao Wilson & Caliskan UW 2024
2. **WER de Whisper por sotaque regional brasileiro** — sem estudo publicado comparando NE vs SP vs RS
3. **Bias de LLMs por dialeto PT-BR** — GPT-4o, GPT-3.5, Gemini sensíveis a diferenças dialetais (variação em pronomes, concordância). Sabiá-2 não mostra sensibilidade. Mas se isso vira bias de scoring? Não testado.
4. **Inferência de raça por nomes portugueses** — WEAT desenvolvido para nomes americanos; sem dataset equivalente para nomes Sebastião/Clovis/Aparecida vs Henrique/Guilherme/Eduardo
5. **Escolaridade e ASR PT-BR** — Leal et al. documenta bias mas não fornece WER quantitativo por grupo

### Recomendação de validação própria
Antes do deploy: construir dataset interno de 100-200 candidatos reais com anonimização de outcomes, medir Disparate Impact por região de origem (inferida), nível de escolaridade, gênero inferido. Usar Fairlearn ou LangFair para calcular IR por grupo.

---

## REFERÊNCIAS CONSOLIDADAS

- [Wilson & Caliskan 2024](https://arxiv.org/abs/2407.20371)
- [Brookings Intersectional Bias](https://www.brookings.edu/articles/gender-race-and-intersectional-bias-in-ai-resume-screening-via-language-model-retrieval/)
- [PNAS Nexus An et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11937954/)
- [Invisible Filters Rao 2025](https://arxiv.org/html/2508.16673v1)
- [Eightfold Anzenberg 2025](https://arxiv.org/html/2507.02087v1)
- [No Thoughts Just AI Wilson 2024](https://arxiv.org/html/2509.04404v1)
- [Justice or Prejudice Ye 2024](https://arxiv.org/html/2410.02736v1)
- [Revealing Hidden Bias Beatty 2024](https://arxiv.org/html/2410.16927v1)
- [Reliability LLM-as-Judge Schroeder 2024](https://arxiv.org/abs/2412.12509)
- [MuPe ASR PT-BR Leal COLING 2025](https://aclanthology.org/2025.coling-main.407/)
- [De-Anonymization Ko 2026](https://arxiv.org/abs/2603.18382)
- [DAIQ Demographic Inference 2025](https://arxiv.org/html/2508.15830v1)
- [Brookings Threat to Autonomy 2025](https://www.brookings.edu/articles/ais-threat-to-individual-autonomy-in-hiring-decisions/)
- [SALT Framework Arif 2024](https://arxiv.org/html/2410.12499)
- [Holistic vs Analytic Kucia 2026](https://arxiv.org/html/2604.00259)
- [LangFair CVS Health](https://medium.com/cvs-health-tech-blog/how-to-assess-your-llm-use-case-for-bias-and-fairness-with-langfair-7be89c0c4fab)
- [Microsoft Presidio](https://github.com/microsoft/presidio)
- [Bonil et al. 2025 — Racial Biases Portuguese LLMs](https://arxiv.org/html/2509.02834v1)
- [Dialectal Profiling PT-BR LLMs](https://arxiv.org/html/2410.10991)
- [LLMCert-B Counterfactual Bias](https://arxiv.org/abs/2405.18780)
- [EEOC AI Hiring Guidance](https://ogletree.com/insights-resources/blog-posts/eeoc-issues-new-guidance-on-employer-use-of-ai-and-disparate-impact-potential/)
