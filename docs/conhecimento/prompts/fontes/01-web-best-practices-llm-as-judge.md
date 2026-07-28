# Subagente 1 — Best Practices 2025-2026: Prompt Engineering para Avaliação Humana / Scoring com LLM

> Coletado em 2026-04-27 via deep-research subagente (Sonnet) | 15+ fontes verificadas

---

## Top 10 Fontes Autoritativas

### 1. Zheng et al. — "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" (NeurIPS 2023)
**URL:** https://huggingface.co/papers/2306.05685
**Autoridade:** Paper seminal, 3000+ citações
- GPT-4 como juiz alcança 80% concordância com humanos (= inter-human agreement)
- **Position bias é sistemático**: win-rate do Vicuna muda de 2.5% para 82.5% apenas invertendo ordem
- ChatGPT prefere segunda posição; GPT-4 prefere primeira
- **Recomendação:** double evaluation com posições invertidas + média

### 2. HuggingFace Cookbook — "Using LLM-as-a-Judge for Automated Evaluation" (2024)
**URL:** https://huggingface.co/learn/cookbook/en/llm_judge
- Prompt básico: Pearson r=0.567 vs humanos
- Prompt melhorado: r=0.843 (melhora de 30%)
- **Escala 1-4 inteira com descrição por nível supera escala float 0-10 em 30%**
- Campo "Evaluation:" (rationale ANTES do score) melhora consistência (CoT implícito)
- Escala aditiva ("Award 1 point if X, 1 additional if Y...") é superior para critérios decomponíveis
- Calibrar com 30 exemplos humanos onde raters concordam = baseline mínimo

### 3. Liu et al. — "G-Eval: NLG Evaluation using GPT-4" (EMNLP 2023)
**URL:** https://arxiv.org/pdf/2303.16634
- G-Eval = CoT automático + form-filling + log-probability weighting
- CoT melhora Spearman de **0.51 → 0.66** em sumarização
- Pipeline: (1) LLM gera steps de avaliação, (2) executa, (3) score ponderado por log-probs
- Log-prob weighting permite distinguir "3.2" de "3.8" sem pedir scores floats

### 4. Kim et al. — "Prometheus 2: Open Source LLM Specialized in Evaluating" (ACL 2024)
**URL:** https://arxiv.org/html/2405.01535v2
- Treinado com 1000 critérios customizados, rubrica 1-5 com âncoras descritivas BARS-like
- **Pearson r=0.898 no FeedbackBench**
- **Rubrica 1-5 com descrição por nível é o formato padrão da literatura**
- Reference answers no prompt melhoram correlação substancialmente
- Merging de modelos direct assessment + pairwise supera treinamento conjunto

### 5. Survey — "A Survey on LLM-as-a-Judge" (arXiv 2411.15594v6, 2025)
**URL:** https://arxiv.org/html/2411.15594v6
- Mapeamento de 200+ papers
- **Pairwise supera pointwise em alinhamento com humanos** (geral)
- Position bias é sistemático por modelo — mitigar com swap + average
- Few-shot examples recomendados
- Self-enhancement bias: LLMs favorecem outputs do mesmo modelo

### 6. Pairwise or Pointwise? (arXiv 2504.14716, abril 2025)
**URL:** https://arxiv.org/abs/2504.14716
- **Resultado contraintuitivo:** Pairwise é MAIS vulnerável a "distractor features" que pointwise
- Pairwise: 35% de flip com features distrativas (verbosidade, autoridade)
- Pointwise: apenas 9% de flip
- **Recomendação para ATS:** onde candidatos podem "jogar" o sistema, **pointwise com rubrica descritiva é mais seguro**

### 7. EvalPlanner — "Learning to Plan & Reason for Evaluation" (arXiv 2501.18099, 2025)
**URL:** https://arxiv.org/html/2501.18099
- Separa geração de plano de avaliação da execução
- 93.9% no RewardBench com 22K exemplos (SOTA)
- 13% de melhora sobre SOTA em constraint-following
- Bidirectional evaluation (A-B + B-A com agregação) é prática recomendada

### 8. Anthropic — "Demystifying Evals for AI Agents" (2025)
**URL:** https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Claude Opus 4.1 como juiz: Spearman r=0.86 vs humanos
- **"Grade individual dimensions separately rather than holistically"**
- "Give the LLM a way out" — incluir opção "Unknown"/"Insufficient evidence" previne alucinação
- Avoid shared state entre trials (importante para ATS — candidatos não devem contaminar uns aos outros)

### 9. Sharma — "Designing Skill-Aware Interview Scoring System" (Medium 2025)
**URL:** https://medium.com/@raghavsharma6002/designing-an-automated-skill-aware-interview-scoring-system-using-llms-7f7fa2ed4d66
- **Temperature=0** para reproducibilidade em scoring de candidatos
- Few-shot ensemble: múltiplas rodadas + averaging
- Sumarizar JD antes de aplicar reduz distância semântica
- Rubrica explicitamente descritiva por nível (BARS-style)

### 10. Dokasto — "We Are Letting LLMs Decide Who Gets Hired and Doing It Wrong" (2025)
**URL:** https://dokasto.com/blog/we-are-letting-llms-decide/
- **Framework "Cite Before You Speak":** LLM extrai segmento mais curto do transcript que suporta o comportamento ANTES de dar score
- **Claim Grounding Rate (CGR):** fração de claims suportados por evidência
- BSS (Behavioral Summary Scales) — versão simplificada de BARS com 3-4 descrições curtas — mais consistente entre avaliadores
- Scoring compensatório com floor: ≥50% comportamentos "poor" → área inteira "poor"

### Bonus: SJT Open-Response LLM Scoring (arXiv 2507.13881, julho 2025)
**URL:** https://arxiv.org/html/2507.13881
- **Claude Sonnet 4 é o modelo mais forte em 4 de 7 dimensões de avaliação SJT**
- Critérios de inclusão/exclusão por nível melhoram kappa em **0.08-0.21** vs descrição simples
- Ensemble de modelos diferentes por dimensão > modelo único universal

---

## Síntese Consolidada

O estado da arte 2025-2026 em prompt engineering para scoring humano converge em **quatro princípios**:

1. **Rubrica descritiva BARS-like é não-negociável** — escala inteira estreita (1-5) com comportamento concreto descrito em cada nível supera escalas numéricas absolutas em 30%+ de correlação com humanos. A diferença é estrutural, não fine-tuning.

2. **CoT separado do score é indispensável** — pedir rationale antes do número (G-Eval, EvalPlanner) melhora consistência em 10-15%, mas a ordem importa: "análise primeiro, score depois", nunca o contrário.

3. **Pairwise vs Pointwise tem resposta contextual** — pairwise é melhor para ranking relativo de N candidatos; pointwise com rubrica robusta é mais resistente a manipulação. **Padrão para ATS: pointwise por escala + pairwise APENAS na etapa de ranking final**.

4. **Temperature=0 com ensemble é o padrão de produção** — determinismo e auditabilidade são requisitos legais em HR. Variâncias controladas via múltiplas passagens + agregação, não temperatura alta.

**Vetores de bias a endereçar no design de cada prompt:**
- Position bias (swap + average)
- Verbosity bias (extrair trecho mínimo antes de julgar)
- Self-enhancement bias (não usar mesmo modelo que gerou output como juiz)

---

## Prioridade por Tier

### Tier 1 — Implementar Imediatamente

| Prática | Aplica a | Mecanismo |
|---|---|---|
| Rubrica BARS 1-5 com descrição por nível | Todos os 7 usos | Trocar scales numéricas abstratas por descrições comportamentais |
| CoT obrigatório: "Evaluation:" antes de "Score:" | Usos 2, 5, 6, 7 | Campo de rationale antes do número no structured output |
| Temperature=0 + fixed model version | Todos os 7 usos | Reproducibilidade e auditabilidade |
| **"Cite Before You Speak"** | Uso 5 (entrevista) | LLM extrai trecho ANTES de julgar — previne verbosity bias |
| Critérios inclusão/exclusão por nível | Uso 7 (SJT/Work Sample) | +0.08-0.21 kappa vs descrição simples |
| Separação de dimensões: 1 prompt/competência | Usos 2, 5, 6 | Não misturar critérios |

### Tier 2 — Ciclo Seguinte

| Prática | Aplica a | Mecanismo |
|---|---|---|
| Double evaluation com swap | Uso 3 (ranking) | A-B e B-A, fazer média — neutraliza position bias |
| Calibração com 30+ exemplos humanos | Todos | Pearson/Spearman antes de produção |
| Log-probability weighting (G-Eval) | Usos 2, 5, 6, 7 | Granularidade sub-inteira |
| Few-shot ensemble + averaging | Uso 7 (SJT) | 3-5 exemplos calibrados + 3 rodadas + média |
| Opção "Insufficient Evidence" no schema | Uso 5 | Previne alucinação |

### Tier 3 — Pesquisa/Validação

| Prática | Status |
|---|---|
| EvalPlanner (Planning + Execution separados) | SOTA 2025, requer fine-tuning |
| Especialização de modelos por dimensão | Evidência SJT, overhead operacional |
| Prometheus 2 como juiz open-source | Alternativa auditável, requer infra própria |
| ICC(2,1) como métrica psicométrica | Sem ferramenta pronta |

---

## Gaps Identificados

1. **Benchmarks HR específicos não existem em forma pública** — você precisará criar ground truth com raters treinados.
2. **ICC e Kappa para LLM judges em seleção** — literatura usa Pearson/Spearman, não o ICC(2,1) padrão psicometria.
3. **Regulamentação e disparate impact** — nenhuma fonte aborda EEOC/GDPR de LLM judges em ATS tecnicamente.
4. **Geração de perguntas STAR via LLM** — literatura I-O Psychology escassa.
5. **Redação fit cultural scoring** — gap mais crítico; SJT paper é o mais próximo mas específico.

---

## Fontes Completas

- [Zheng et al. — MT-Bench](https://huggingface.co/papers/2306.05685)
- [HuggingFace Cookbook LLM Judge](https://huggingface.co/learn/cookbook/en/llm_judge)
- [G-Eval](https://arxiv.org/pdf/2303.16634)
- [G-Eval Definitive Guide](https://www.confident-ai.com/blog/g-eval-the-definitive-guide)
- [Prometheus 2](https://arxiv.org/html/2405.01535v2)
- [Survey on LLM-as-a-Judge](https://arxiv.org/html/2411.15594v6)
- [Pairwise or Pointwise?](https://arxiv.org/abs/2504.14716)
- [EvalPlanner](https://arxiv.org/html/2501.18099)
- [Anthropic Demystifying Evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [Sharma — Skill-Aware Interview Scoring](https://medium.com/@raghavsharma6002/designing-an-automated-skill-aware-interview-scoring-system-using-llms-7f7fa2ed4d66)
- [Dokasto — Cite Before You Speak](https://dokasto.com/blog/we-are-letting-llms-decide/)
- [SJT Open-Response Scoring](https://arxiv.org/html/2507.13881)
- [Cameron Wolfe LLM-as-Judge](https://cameronrwolfe.substack.com/p/llm-as-a-judge)
- [EvidentlyAI Complete Guide](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
- [OpenAI Evaluation Best Practices](https://platform.openai.com/docs/guides/evaluation-best-practices)
- [Position Bias Systematic Study](https://aclanthology.org/2025.ijcnlp-long.18.pdf)
