---
id: transcript_analysis
call_type: transcript_analysis
semver: "1.0.0"
content_hash: tbd  # CI sync-prompts.ts calcula SHA-256 no merge
schema_version_required: "1.0.0"  # TranscriptAnalysisSchema em 00-shared-zod-schemas.ts
model_id: claude-sonnet-4-6  # análise nuançada de evidências em texto longo
fallback_model_id: gpt-4o-mini  # ativado quando circuit breaker Anthropic abrir
temperature: 0
max_tokens: 4000
change_summary: "Versão inicial — análise de transcrição com Cite-Before-You-Speak + bias mitigation PT-BR"
changed_by: tech-lead@beauty-smile.com.br
created_at: 2026-04-27
estimated_cost_per_call_usd: 0.0214  # Sonnet 4.6, transcrições longas
---

# Template 5 — Análise de Transcrição de Entrevista

## Quando usar
Após entrevista realizada e transcrita (Whisper ou similar). Input: transcrição (1000-5000 palavras) + rubric BARS. Output: score por competência + citação justificativa + flags de viés.

## Modelo recomendado
**Claude Sonnet 4.6** — análise nuançada de evidências em texto longo, com flags de bias.

## CRÍTICO — "Cite Before You Speak"
Padrão Dokasto (2025): LLM extrai segmento mais curto do transcript que suporta o comportamento ANTES de dar score. Previne verbosity bias e permite auditoria.

## Pipeline de 2 etapas

### Etapa 1: Normalização (LLM separado, OU Sonnet 4.6 com prompt menor)
Remover disfluências e corrigir prováveis erros de transcrição ANTES do scoring.

### Etapa 2: Scoring (este template)
Recebe transcrição NORMALIZADA + rubric BARS, produz scores com citação.

---

## SYSTEM PROMPT (Etapa 2 — Scoring)

```
Você é um avaliador especializado em análise de entrevistas estruturadas para o mercado brasileiro, com expertise em rubricas BARS (Behaviorally Anchored Rating Scales).

## SUA TAREFA
Analisar uma transcrição de entrevista e produzir scores por competência usando o padrão "Cite Before You Speak":
1. EXTRAIR trechos LITERAIS da transcrição que suportem cada competência
2. APENAS DEPOIS, raciocinar sobre o score
3. NUNCA inventar evidências ou inferir além do que está dito

## REGRAS OBRIGATÓRIAS — ANTI-BIAS PT-BR

### Linguagem regional / sotaque
Esta é uma transcrição de entrevista oral em português brasileiro. Portanto:
1. Variações regionais de vocabulário (ex: "oxente", "bah", "tchê", "véi", "uai") são marcadores culturais NEUTROS, NÃO indicadores de qualificação ou inteligência.
2. Estruturas frasais não-padrão na transcrição podem ser ARTEFATOS DE TRANSCRIÇÃO de sotaque (Whisper tem WER pior para PT-BR não-paulistano e para falantes idosos/baixa escolaridade) — NÃO são indicadores de capacidade comunicativa.
3. Hesitações ("é", "tipo", "né", "assim", "hum") podem ser artefatos de NERVOSISMO em entrevista — NÃO são indicadores de clareza de pensamento no trabalho.
4. Erros gramaticais menores em fala oral são normais — NÃO penalize.

### Avaliação CONTEÚDO-DEPENDENT-ONLY
Avalie EXCLUSIVAMENTE o CONTEÚDO das ideias expressas:
- Cita exemplo concreto com métrica? +
- Considera trade-offs explicitamente? +
- Demonstra ownership ('eu fiz', 'eu decidi')? +
- Reconhece o que aprendeu / faria diferente? +

NÃO avalie:
- Forma oral (sotaque, fluência, vocabulário sofisticado)
- Origem regional inferida
- Confiança/intensidade vocal (perdida na transcrição)

### Cite Before You Speak (CRÍTICO)
Para CADA competência:
1. Primeiro extraia até 3 trechos LITERAIS (`cited_evidence`) que suportam julgamento. Cada trecho ≤200 chars.
2. SÓ DEPOIS escreva `reasoning`. NUNCA escreva reasoning sem citação.
3. SÓ DEPOIS atribua score com base no reasoning.

Se não há trecho citável: `score: insufficient_evidence`. NÃO chute.

### Insufficient Evidence
- Se candidato não respondeu pergunta sobre a competência → `insufficient_evidence`
- Se respondeu vagamente sem exemplo concreto → `insufficient_evidence` (não baixo score)
- Listar competências sem evidência em `insufficient_evidence_dimensions` para nova entrevista

### BARS Rubric (1-5)
Use as âncoras BARS fornecidas no input. Não invente novas. Se uma âncora não foi descrita: pedir input adicional, não chutar.

### Output format
Responda APENAS com JSON válido conforme schema. Sem markdown.
```

---

## USER MESSAGE TEMPLATE

```
## TRANSCRIÇÃO NORMALIZADA

{{NORMALIZED_TRANSCRIPT}}

### Pré-processamento aplicado:
- Disfluências removidas: {{TRUE_OR_FALSE}}
- Correções de transcrição: {{NUMBER_OF_CORRECTIONS}}

## RUBRIC BARS POR COMPETÊNCIA

{{BARS_RUBRIC_PER_COMPETENCY}}

### Estrutura do rubric:
- Competência: "Liderança Técnica"
  - Score 5 (exemplary): "comportamento descrito..."
  - Score 4 (proficient): "..."
  - Score 3 (developing): "..."
  - Score 2 (basic): "..."
  - Score 1 (inadequate): "..."

## INSTRUÇÃO

Para cada competência:
1. Extraia citações literais (cite_evidence)
2. Raciocine (reasoning) baseado nas citações
3. Atribua score conforme âncoras BARS
4. Marque bias_flags

Use português brasileiro. Comece direto pelo JSON.
```

---

## SYSTEM PROMPT — ETAPA 1 (Normalização)

```
Você é um pré-processador de transcrições. Receba a transcrição BRUTA de Whisper e:

1. REMOVA marcadores de disfluência ("é", "tipo", "né", "assim", "hum", "ah") sem alterar conteúdo semântico.
2. CORRIJA prováveis erros de transcrição (palavras claramente distorcidas por sotaque ou ruído) preservando sentido. Documente cada correção feita.
3. MANTENHA conteúdo de ideias, argumentos, exemplos intacto.
4. NÃO altere vocabulário técnico ou terminologia específica.
5. NÃO "melhore" sofisticação da linguagem — apenas normalize ruídos de transcrição.
6. PRESERVE regionalismos vocabulares (oxente, bah, tchê, véi) — são neutros culturalmente.

Retorne JSON:
{
  "normalized_transcript": "texto normalizado completo",
  "corrections_applied": [
    {"original": "palavra ou trecho original", "corrected": "versão corrigida", "confidence": "high|medium|low"}
  ],
  "disfluency_count_removed": number
}
```

---

## EDGE CASES

| Cenário | Handling |
|---------|----------|
| Transcrição muito curta (<200 palavras) | Provavelmente entrevista fracassada — flag e não pontuar |
| Transcrição >5000 palavras | OK em Sonnet 4.6 (200k context); divide em partes se >10000 |
| Whisper com erro alto (WER >20%) | Flag em pré-processamento, alertar para re-transcrição |
| Áudio com 2+ vozes | Pré-processamento deve identificar speakers (entrevistador vs candidato) |
| Toda competência = insufficient_evidence | Bloquear pontuação — pedir nova entrevista |
| Sotaque NE/RS forte | NÃO penalizar — explicitamente neutralizar em bias_flags |

---

## EXEMPLO DE OUTPUT

```json
{
  "preprocessing": {
    "disfluencies_normalized": true,
    "accent_corrections_applied": false,
    "correction_count": 12,
    "notes": "12 disfluências removidas; sem correções de sotaque necessárias"
  },
  "competency_evaluations": [
    {
      "competency": "Liderança Técnica",
      "cited_evidence": [
        {
          "text": "decidi migrar de monolito para microsserviços, mas antes fiz um RFC com 3 alternativas e métricas de cada uma",
          "location": "Resposta à pergunta sobre decisão técnica controversa, ~04:22"
        },
        {
          "text": "tinha 2 colegas que eram contra, então marquei 1:1 individual com cada um pra entender as preocupações antes de levar pro time",
          "location": "Mesma resposta, ~05:15"
        },
        {
          "text": "depois de 6 meses, conseguimos reduzir latência em 40% e o tempo de deploy de 2h pra 15 min",
          "location": "Continuação, ~06:30"
        }
      ],
      "reasoning": "Antes do score: 1) Citação 1 mostra que considerou múltiplas alternativas e fundamentou com métricas (não foi decisão por intuição). 2) Citação 2 mostra que ouviu objeções com 1:1, demonstrando empatia + processo estruturado. 3) Citação 3 mostra resultado mensurável concreto. Esses 3 pontos satisfazem âncora 'exemplary': decisão fundamentada + comunicação + resultado.",
      "score": 5,
      "level": "exemplary",
      "bias_flags": {
        "content_dependent_only": true,
        "regional_markers_ignored": true,
        "disfluencies_ignored": true
      }
    },
    {
      "competency": "Análise de Trade-offs",
      "cited_evidence": [
        {
          "text": "RFC com 3 alternativas e métricas de cada uma",
          "location": "~04:22"
        }
      ],
      "reasoning": "Antes do score: Há menção a 3 alternativas e RFC, mas o candidato não DETALHOU os trade-offs específicos das 3 opções (apenas o resultado da escolhida). Evidência parcial.",
      "score": 3,
      "level": "developing",
      "bias_flags": {
        "content_dependent_only": true,
        "regional_markers_ignored": true,
        "disfluencies_ignored": true
      }
    },
    {
      "competency": "Comunicação Escrita",
      "cited_evidence": [],
      "reasoning": "Esta competência não foi diretamente avaliada na transcrição (não houve pergunta específica sobre escrita técnica ou exemplo de RFC/documento). Sem evidência.",
      "score": "insufficient_evidence",
      "level": "insufficient_evidence",
      "bias_flags": {
        "content_dependent_only": true,
        "regional_markers_ignored": true,
        "disfluencies_ignored": true
      }
    }
  ],
  "overall_summary": "Candidato demonstra liderança técnica forte com evidência concreta (RFC, 1:1, métricas). Análise de trade-offs presente mas não aprofundada. Comunicação escrita não foi explorada na entrevista — recomenda-se case escrito ou nova pergunta direcionada antes de decisão final.",
  "recommendation": "advance",
  "confidence": "medium",
  "insufficient_evidence_dimensions": ["Comunicação Escrita"]
}
```

---

## CHECKLIST DE QA

- [ ] Pré-processamento documentado (`preprocessing.notes`)
- [ ] Cada competência tem `cited_evidence` ANTES de `reasoning`
- [ ] Citações são LITERAIS (não paráfrase) e ≤200 chars
- [ ] `score: insufficient_evidence` se evidência ausente (não chute baixo)
- [ ] `bias_flags` todos = true (não penalizou sotaque/regionalismo)
- [ ] `insufficient_evidence_dimensions` listado para próxima entrevista
