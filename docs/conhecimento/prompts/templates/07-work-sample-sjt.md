---
id: work_sample_sjt
call_type: work_sample_sjt
semver: "1.0.0"
content_hash: tbd  # CI sync-prompts.ts calcula SHA-256 no merge
schema_version_required: "1.0.0"  # WorkSampleScoringSchema em 00-shared-zod-schemas.ts
model_id: claude-sonnet-4-6  # Sonnet 4 mais forte em 4/7 dim de SJT (arXiv 2507.13881)
fallback_model_id: gpt-4o-mini  # ativado quando circuit breaker Anthropic abrir
temperature: 0
max_tokens: 3000
change_summary: "Versão inicial — scoring de Work Sample/SJT com inclusion/exclusion criteria por nível"
changed_by: tech-lead@beauty-smile.com.br
created_at: 2026-04-27
estimated_cost_per_call_usd: 0.0129  # Sonnet 4.6 com cache hit
---

# Template 7 — Scoring de Work Sample / SJT (Open Response)

## Quando usar
Resposta aberta a cenário (mini-case clínico, mini-case gestão, problem solving). Input: resposta + cenário + rubric BARS por dimensão. Output: score por dimensão + citação + recomendação.

## Modelo recomendado
**Claude Sonnet 4.6** — Sonnet 4 é o LLM mais forte em 4/7 dimensões de SJT scoring (arXiv 2507.13881, 2025).

## CRÍTICO — Inclusion/Exclusion Criteria
Paper SJT 2025 (arXiv 2507.13881): adicionar **critérios de inclusão e exclusão por nível** ao prompt melhora kappa em **0.08-0.21** vs descrição BARS simples.

**Pattern:**
- Score 5 inclusion: "candidato menciona X, Y, Z"
- Score 5 exclusion: "candidato NÃO violou A, B, C"

## Estrutura de cache
**System prompt + cenário + rubric com inclusion/exclusion = ESTÁVEL → cache_control**
**Resposta do candidato = VARIÁVEL → não cacheado**

---

## SYSTEM PROMPT

```
Você é um avaliador especializado em Work Samples e Situational Judgment Tests (SJT) abertos para o mercado brasileiro, com expertise em rubricas BARS com critérios de inclusão e exclusão por nível.

## SUA TAREFA
Avaliar a resposta de um candidato a um cenário aberto (case clínico, mini-case de gestão, problem solving), produzindo:
1. Score 1-5 por dimensão BARS específica do cenário
2. Citação literal da resposta como evidência
3. Verificação de critérios de INCLUSÃO e EXCLUSÃO atendidos
4. Recomendação + red flags

## METODOLOGIA — INCLUSION/EXCLUSION CRITERIA (CRÍTICO)

Cada nível BARS é definido por DOIS conjuntos:
1. **Inclusion criteria**: comportamentos/elementos que DEVEM estar presentes para o nível
2. **Exclusion criteria**: comportamentos/elementos que DEVEM ESTAR AUSENTES (violações = downgrade)

### Exemplo (Diagnóstico Clínico, score 5):
**Inclusion (TODOS devem estar presentes):**
- Cita 2+ hipóteses diagnósticas com diferencial
- Solicita exames complementares com critério clínico
- Considera urgência/gravidade explicitamente

**Exclusion (NENHUM pode estar presente):**
- Diagnóstico único sem diferencial
- Solicita exames sem justificar
- Ignora red flags clínicos

### Aplicação no scoring:
- Score 5 = TODOS inclusion atendidos + NENHUM exclusion violado
- Score 4 = Maioria inclusion (3/4) + nenhum exclusion crítico
- Score 3 = ~Metade inclusion + 1 exclusion menor
- Score 2 = Poucos inclusion + 2+ exclusions
- Score 1 = Inclusion ausente OU 1+ exclusion crítico

## REGRAS OBRIGATÓRIAS

### Cite Before You Speak
1. Para cada dimensão, extrair até 3 trechos literais da resposta
2. Verificar cada inclusion criterion contra os trechos (campo `inclusion_criteria_met`)
3. Verificar cada exclusion criterion (campo `exclusion_criteria_violated`)
4. Raciocinar APENAS com base no que foi citado/verificado
5. Atribuir score conforme regra acima

### Anti-bias
- Avalie EXCLUSIVAMENTE: precisão técnica, raciocínio clínico/gestão, segurança, conformidade ética/legal.
- IGNORE: estilo de escrita, vocabulário regional, formalidade, sofisticação lexical.
- Erros de português leves NÃO afetam score se conteúdo técnico é correto.

### Red Flags
- Se a resposta viola critério ÉTICO, LEGAL ou de SEGURANÇA crítico (ex: prescrição perigosa em case clínico, decisão discriminatória em case de gestão), marque como `red_flag` independentemente do score técnico.
- Red flags forçam `recommendation: reject` mesmo se outros scores são altos.

### Insufficient Evidence
Se a resposta não aborda uma dimensão (ex: pergunta era sobre diagnóstico mas candidato só falou de tratamento): `score: insufficient_evidence`. Não chutar baixo.

### Output format
Responda APENAS com JSON válido conforme schema. Sem markdown.
```

---

## USER MESSAGE TEMPLATE

```
## CENÁRIO

{{SCENARIO_TEXT}}

### ID do cenário: {{SCENARIO_ID}}

## DIMENSÕES BARS COM INCLUSION/EXCLUSION CRITERIA

{{BARS_RUBRIC_WITH_CRITERIA}}

### Estrutura por dimensão:
- Dimensão: "Raciocínio Clínico"
  - Score 5:
    - Inclusion: ["Cita 2+ hipóteses diagnósticas", "Solicita exames com critério", "Considera urgência"]
    - Exclusion: ["Diagnóstico único sem diferencial", "Exames sem justificar", "Ignora red flags"]
  - Score 4: { inclusion: [...], exclusion: [...] }
  - Score 3: ...
  - Score 2: ...
  - Score 1: ...

## RESPOSTA DO CANDIDATO

<RESPOSTA>
{{CANDIDATE_RESPONSE_ANONYMIZED}}
</RESPOSTA>

## INSTRUÇÃO

Para cada dimensão:
1. Verifique inclusion_criteria_met (lista os atendidos)
2. Verifique exclusion_criteria_violated (lista os violados)
3. Extraia citações literais
4. Raciocine baseado nas verificações + citações
5. Atribua score conforme regra (5 = todos inclusion + nenhum exclusion)
6. Marque red_flags se houver violação ética/legal/segurança

Use português brasileiro.
```

---

## EDGE CASES

| Cenário | Handling |
|---------|----------|
| Resposta muito curta (<100 chars) | Flag como `insufficient_evidence`; nota |
| Resposta sem aderência ao cenário | Score 1 em todas as dimensões |
| Red flag ético/legal | Force `recommendation: reject` mesmo se score técnico alto |
| Resposta em formato não-textual (lista, código) | Aceitar; avaliar conteúdo |
| Candidato pede esclarecimento sobre cenário | Flag — pode indicar cenário ambíguo (revisar) |
| Cenário SEM inclusion/exclusion criteria | Pedir input; não rodar |

---

## EXEMPLO DE OUTPUT (Case Clínico Odontologia)

```json
{
  "scenario_understanding": {
    "candidate_understood_scenario": true,
    "scenario_id": "ODONTO_PERIO_001",
    "notes": null
  },
  "dimension_scores": [
    {
      "dimension": "Raciocínio Diagnóstico",
      "inclusion_criteria_met": [
        "Cita 2+ hipóteses diagnósticas (gengivite vs periodontite vs erupção dentária)",
        "Solicita radiografia panorâmica e periapical com critério (avaliar perda óssea)",
        "Considera urgência (descarta abscesso primeiro)"
      ],
      "exclusion_criteria_violated": [],
      "cited_evidence": [
        {
          "text": "as principais hipóteses são gengivite localizada, periodontite crônica em estágio inicial ou inflamação por erupção",
          "location": "Parágrafo 1"
        },
        {
          "text": "solicito radiografia periapical pra avaliar perda óssea, e antes de qualquer coisa, descarto abscesso pela palpação",
          "location": "Parágrafo 2"
        }
      ],
      "reasoning": "Antes do score: 3 inclusion atendidos (3 hipóteses + radio justificada + urgência considerada). 0 exclusion violados (sem diagnóstico único, sem exames sem critério). Score 5 conforme regra.",
      "score": 5,
      "level": "exemplary"
    },
    {
      "dimension": "Plano de Tratamento",
      "inclusion_criteria_met": [
        "Define etapa imediata (raspagem + orientação higiene)",
        "Define follow-up (reavaliação 30 dias)"
      ],
      "exclusion_criteria_violated": [
        "Não menciona considerações sistêmicas (paciente é diabético no cenário)"
      ],
      "cited_evidence": [
        {
          "text": "raspagem supra e subgengival e orientação de higiene oral, com retorno em 30 dias",
          "location": "Parágrafo 3"
        }
      ],
      "reasoning": "Antes do score: 2 inclusion atendidos (etapa imediata + follow-up). 1 exclusion violado (ignorou diabetes — fator crítico em periodontia). Score downgrade de 5 para 3.",
      "score": 3,
      "level": "developing"
    },
    {
      "dimension": "Comunicação com Paciente",
      "inclusion_criteria_met": [],
      "exclusion_criteria_violated": [],
      "cited_evidence": [],
      "reasoning": "A resposta foca apenas em diagnóstico e tratamento técnico. Não aborda comunicação com paciente (pergunta do cenário pedia incluir orientação ao paciente). Sem evidência.",
      "score": "insufficient_evidence",
      "level": "insufficient_evidence"
    }
  ],
  "overall_score": 64,
  "recommendation": "advance",
  "confidence": "medium",
  "red_flags": [
    "Não considerou diabetes do paciente no plano — em case real seria erro clínico relevante mas não fatal"
  ],
  "bias_audit": {
    "used_inclusion_exclusion_criteria": true,
    "no_demographic_proxies_used": true
  }
}
```

---

## CHECKLIST DE QA

- [ ] `inclusion_criteria_met` listado por dimensão (não apenas score)
- [ ] `exclusion_criteria_violated` listado (mesmo que vazio)
- [ ] Cada dimensão tem `cited_evidence` ou `score: insufficient_evidence`
- [ ] Score consistente com regra: 5 = todos inclusion + 0 exclusion; 3 = ~metade + 1 exclusion menor
- [ ] `red_flags` força `recommendation: reject` se ético/legal/segurança violado
- [ ] `bias_audit.used_inclusion_exclusion_criteria = true`
