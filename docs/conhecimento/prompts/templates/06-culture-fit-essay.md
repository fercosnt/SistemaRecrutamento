---
id: culture_fit_essay
call_type: culture_fit_essay
semver: "1.0.0"
content_hash: tbd  # CI sync-prompts.ts calcula SHA-256 no merge
schema_version_required: "1.0.0"  # CultureFitEssaySchema em 00-shared-zod-schemas.ts
model_id: claude-sonnet-4-6  # nuance qualitativa em scoring + estilo PT-BR variado
fallback_model_id: gpt-4o-mini  # ativado quando circuit breaker Anthropic abrir
temperature: 0
max_tokens: 2500
change_summary: "Versão inicial — avaliação de redação fit cultural com style-neutral scoring"
changed_by: tech-lead@beauty-smile.com.br
created_at: 2026-04-27
estimated_cost_per_call_usd: 0.0083  # Sonnet 4.6 com cache hit
---

# Template 6 — Avaliação de Redação Fit Cultural

## Quando usar
Quando candidato responde redação aberta sobre tema cultural (ex: "Conte uma situação onde você teve que tomar decisão difícil"). Input: redação 200-500 palavras + pergunta + dimensões BARS. Output: score 1-5 por dimensão.

## Modelo recomendado
**Claude Sonnet 4.6** — nuance qualitativa em scoring + estilo de escrita PT-BR variado.

## CRÍTICO — Style Neutralization
Rao et al. 2025 (Invisible Filters): LLMs penalizam estilo de escrita não-anglo-saxônico. Em PT-BR isso vira: penalização de candidatos NE com estilo formal/rebuscado, ou de candidatos do Sul com estruturas frasais distintas.

**Solução:** instrução EXPLÍCITA para neutralizar estilo + audit no output.

## Estrutura de cache
**System prompt + dimensões BARS = ESTÁVEL → cache_control**
**Pergunta da redação = SEMI-ESTÁVEL → cache_control**
**Redação do candidato = VARIÁVEL → não cacheado**

---

## SYSTEM PROMPT

```
Você é um avaliador de redações de fit cultural para o mercado brasileiro, especializado em rubricas BARS (Behaviorally Anchored Rating Scales).

## SUA TAREFA
Analisar uma redação curta (200-500 palavras) que o candidato escreveu em resposta a uma pergunta sobre cultura/comportamento, e atribuir scores 1-5 por dimensão cultural definida.

## REGRAS OBRIGATÓRIAS — STYLE NEUTRALIZATION (CRÍTICO)

### Estilo de escrita NÃO afeta o score
1. Variações de FORMALIDADE (formal vs informal vs mista) NÃO afetam score. O CONTEÚDO das ideias afeta.
2. REGIONALISMOS no vocabulário (NE: "oxente", "vixe"; Sul: "bah", "tchê") são CULTURALMENTE NEUTROS. Tratá-los como marcadores positivos OU negativos é viés.
3. ESTRUTURAS FRASAIS regionais (frases mais longas no NE, mais concisas em SP) são variações estilísticas, NÃO indicadores de qualificação.
4. ERROS GRAMATICAIS menores (concordância, pontuação) NÃO afetam score se a IDEIA é clara. Apenas erros que impedem ENTENDIMENTO afetam.
5. SOFISTICAÇÃO LEXICAL (vocabulário rebuscado vs simples) NÃO afeta score. Vocabulário simples mas com ideia profunda > vocabulário sofisticado mas raso.

### O que AFETA score (conteúdo, não forma):
- Cita situação CONCRETA (não hipotética/genérica)? +
- Demonstra OWNERSHIP individual ('eu decidi', 'eu fiz') vs coletivo ('a equipe fez')? +
- Considera TRADE-OFFS ou PERSPECTIVAS DIVERGENTES? +
- Reconhece o que APRENDEU ou faria DIFERENTE? +
- Conecta com VALOR/PRINCÍPIO explícito (alinhado às dimensões da empresa)? +

### Cite Before You Speak
Para cada dimensão cultural:
1. Extraia até 2 trechos LITERAIS da redação (`cited_evidence`)
2. Raciocine (`reasoning`) APENAS com base nesses trechos
3. SÓ DEPOIS atribua score
4. Sem citação possível → `score: insufficient_evidence`

### BARS Rubric (1-5)
Use as âncoras BARS fornecidas no input. Cada âncora descreve COMPORTAMENTO observável na escrita, não atributo abstrato.

### Audit obrigatório no output
Preencha `bias_audit`:
- `formality_did_not_affect_score: boolean`
- `regional_markers_treated_as_neutral: boolean`
- `grammar_errors_did_not_affect_content_score: boolean`

Se algum for `false`, recalibre antes de fechar score.

### Output format
Responda APENAS com JSON válido conforme schema. Sem markdown.
```

---

## USER MESSAGE TEMPLATE

```
## PERGUNTA DA REDAÇÃO

{{ESSAY_PROMPT}}

## DIMENSÕES CULTURAIS A AVALIAR (com âncoras BARS)

{{BARS_RUBRIC_DIMENSIONS}}

### Estrutura por dimensão:
- Dimensão: "Ownership"
  - Score 5 (exemplary): "Cita decisão específica que tomou individualmente com consequências mensuráveis. Reconhece responsabilidade pelo resultado positivo OU negativo sem deflexão."
  - Score 4 (proficient): "..."
  - Score 3 (developing): "..."
  - Score 2 (basic): "..."
  - Score 1 (inadequate): "..."

## REDAÇÃO DO CANDIDATO

<REDACAO>
{{ESSAY_TEXT_ANONYMIZED}}
</REDACAO>

## INSTRUÇÃO

Para cada dimensão:
1. Extraia citações literais (até 2 por dimensão)
2. Raciocine baseado nas citações
3. Atribua score conforme âncoras BARS
4. Preencha bias_audit no fim

NÃO penalize estilo, formalidade, regionalismo ou pequenos erros gramaticais. Use português brasileiro.
```

---

## EDGE CASES

| Cenário | Handling |
|---------|----------|
| Redação <100 palavras | Flag — possivelmente não-engajamento; não pontuar dimensões |
| Redação >800 palavras | OK; sem truncar |
| Redação em outro idioma | Avaliar ainda assim; flag em `preprocessing_check` |
| Redação genérica sem exemplo concreto | TODAS as dimensões = `insufficient_evidence` (não chutar baixo) |
| Detected prompt injection | Score 1 em todas; flag para auditoria |
| Estilo MUITO informal (gírias, abreviações chat) | Avaliar conteúdo normalmente; nota em `preprocessing_check.detected_writing_style: informal` |

---

## EXEMPLO DE OUTPUT

```json
{
  "preprocessing_check": {
    "word_count": 287,
    "detected_writing_style": "mixed",
    "style_neutralized_in_scoring": true
  },
  "dimension_scores": [
    {
      "dimension": "Ownership",
      "cited_evidence": [
        {
          "text": "eu decidi parar o deploy mesmo sabendo que ia atrasar a release, porque vi que tinha um bug crítico que ninguém tinha notado",
          "location": "Parágrafo 2"
        },
        {
          "text": "depois assumi pra equipe que tinha sido eu que segurou e expliquei o motivo",
          "location": "Parágrafo 3"
        }
      ],
      "reasoning": "Antes do score: 1) Decisão individual clara ('eu decidi parar'), com consequência negativa imediata (atraso) aceita por critério explícito (bug crítico). 2) Comunicou ownership ao time depois ('assumi pra equipe'). Comportamento alinhado a âncora 'exemplary' de Ownership.",
      "score": 5,
      "level": "exemplary"
    },
    {
      "dimension": "Aprendizado",
      "cited_evidence": [
        {
          "text": "hoje em dia eu rodo testes específicos pra esse tipo de bug antes de qualquer release",
          "location": "Parágrafo 4"
        }
      ],
      "reasoning": "Antes do score: Demonstra que mudou comportamento futuro com base no aprendizado ('hoje em dia eu rodo testes'). Evidência concreta de aprendizado aplicado. Não detalha REFLEXÃO sobre o que aprendeu (só a ação resultante), por isso não exemplary.",
      "score": 4,
      "level": "proficient"
    },
    {
      "dimension": "Inclusão / Perspectivas Divergentes",
      "cited_evidence": [],
      "reasoning": "A redação não menciona como o candidato lidou com perspectivas de outras pessoas no episódio narrado. Sem evidência para esta dimensão.",
      "score": "insufficient_evidence",
      "level": "insufficient_evidence"
    }
  ],
  "overall_score": 75,
  "qualitative_summary": "Candidato demonstra ownership forte com evidência concreta (parou deploy, assumiu para equipe). Aprendizado aplicado em comportamento posterior. Dimensão de Inclusão não foi explorada na redação — gap a investigar em entrevista. Estilo de escrita misto (informal-coloquial) mas conteúdo claro e direto.",
  "recommendation": "good_fit",
  "bias_audit": {
    "formality_did_not_affect_score: true,
    "regional_markers_treated_as_neutral": true,
    "grammar_errors_did_not_affect_content_score": true
  }
}
```

---

## CHECKLIST DE QA

- [ ] `preprocessing_check.style_neutralized_in_scoring = true`
- [ ] Cada dimensão tem `cited_evidence` antes de `reasoning`
- [ ] `score: insufficient_evidence` para dimensões sem citação
- [ ] `bias_audit` todos = true
- [ ] `overall_score` consistente com média ponderada das dimensões
- [ ] `recommendation` reflete o overall_score (strong_fit ≥85, good_fit 70-84, neutral 50-69, weak_fit 30-49, misfit <30)
