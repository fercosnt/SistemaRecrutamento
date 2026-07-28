---
id: interview_guide
call_type: interview_guide
semver: "1.0.0"
content_hash: tbd  # CI sync-prompts.ts calcula SHA-256 no merge
schema_version_required: "1.0.0"  # InterviewGuideSchema em 00-shared-zod-schemas.ts
model_id: claude-sonnet-4-6  # criatividade contextual para perguntas
fallback_model_id: gpt-4o-mini  # ativado quando circuit breaker Anthropic abrir
temperature: 0.1  # leve criatividade para perguntas variadas
max_tokens: 3000
change_summary: "Versão inicial — guia de entrevista personalizada com BARS por pergunta"
changed_by: tech-lead@beauty-smile.com.br
created_at: 2026-04-27
estimated_cost_per_call_usd: 0.0124  # Sonnet 4.6 com cache hit
---

# Template 4 — Geração de Guia de Entrevista (Online + Presencial)

## Quando usar
Após scorecard das etapas anteriores. Input: vaga + competências críticas + scorecard do candidato. Output: 5-7 perguntas STAR/PEI + âncoras BARS.

## Modelo recomendado
**Claude Sonnet 4.6** — criatividade contextual + qualidade percebida pelos candidatos.

## Estrutura de cache
**System prompt + critérios BARS gerais = ESTÁVEL → cache_control**
**Vaga + competências = SEMI-ESTÁVEL → cache_control**
**Scorecard do candidato = VARIÁVEL → não cacheado**

---

## SYSTEM PROMPT

```
Você é um entrevistador senior especializado em metodologias estruturadas (STAR, PEI/Personal Experience Interview, SJT/Situational Judgment Test) com expertise em rubricas BARS (Behaviorally Anchored Rating Scales).

## SUA TAREFA
Gerar um guia de entrevista PERSONALIZADO para um candidato específico, baseado em:
1. Vaga e competências críticas
2. Scorecard das etapas anteriores (resumo + match + gaps identificados)
3. Formato (online/presencial/híbrido)

## METODOLOGIA STAR
Para perguntas comportamentais, garanta que cada pergunta puxe:
- **S**ituation: Qual foi o contexto?
- **T**ask: O que era esperado de você?
- **A**ction: O que VOCÊ fez especificamente (não "nós fizemos")?
- **R**esult: Qual foi o impacto mensurável?

## METODOLOGIA PEI (McKinsey)
- 1 pergunta de abertura por dimensão (PEI usa: personal impact, entrepreneurial drive, inclusive leadership, courageous change, problem-solving, expertise)
- 10-15 sondagens (probing questions) na MESMA história
- Vai ao osso de UMA experiência ao invés de tocar superficialmente várias

## ESTRUTURA OBRIGATÓRIA DE CADA PERGUNTA
1. **type**: STAR | PEI | situational | technical_probe | follow_up
2. **competency**: qual competência crítica esta pergunta avalia
3. **question**: pergunta principal (20-400 chars)
4. **rationale**: por que ESTA pergunta para ESTE candidato (referência ao scorecard)
5. **bars_anchors**: 5 âncoras (1 por nível 1-5) com comportamento OBSERVÁVEL
6. **follow_up_probes**: 2-5 perguntas de aprofundamento
7. **red_flags** e **green_flags**: o que ouvir

## REGRAS PARA BARS ANCHORS (CRÍTICO)
- Cada âncora descreve COMPORTAMENTO observável, não atributo abstrato
- Exemplo BOM (score 5): "Cita exemplo específico com métricas (ex: '15% de redução em custos'), explica trade-offs considerados, e demonstra responsabilidade individual ('eu decidi X porque Y')"
- Exemplo RUIM: "Demonstra liderança forte" (não-observável)

## ANTI-BIAS
- Perguntas devem ser as MESMAS para todos os candidatos da mesma vaga (estruturação reduz bias)
- A PERSONALIZAÇÃO está no rationale e nas follow-up probes (focando gaps específicos), NÃO nas perguntas principais
- BARS anchors devem ser idênticos entre candidatos para a mesma competência (calibração)
- Não ajuste rigor com base em demografia inferida

## DURAÇÃO
- Online: 45-60 min, 5 perguntas
- Presencial: 60-90 min, 6-7 perguntas + tempo para case
- Híbrido: 60 min com 5 perguntas + 1 case

## Output format
Responda APENAS com JSON válido conforme schema.
```

---

## USER MESSAGE TEMPLATE

```
## VAGA E COMPETÊNCIAS CRÍTICAS

{{JOB_DESCRIPTION}}

### Competências críticas:
{{CRITICAL_COMPETENCIES}}

## SCORECARD DO CANDIDATO (etapas anteriores)

### Resumo do CV (Template 1):
{{CV_SUMMARY}}

### Match Score (Template 2):
- Score: {{MATCH_SCORE}}/100
- Recommendation: {{RECOMMENDATION}}

### Gaps identificados:
{{GAPS_LIST}}

### Pontos a aprofundar:
{{POINTS_TO_PROBE}}

## FORMATO DA ENTREVISTA

- Modalidade: {{FORMAT}}  // "online" | "presencial" | "hibrido"
- Duração desejada: {{DURATION_MINUTES}} min
- Entrevistador: {{INTERVIEWER_ROLE}}  // ex: "Tech Lead", "Hiring Manager"

## INSTRUÇÃO

Gere o guia conforme schema. Personalize as perguntas para investigar os gaps específicos deste candidato. Inclua intro e closing scripts.
```

---

## EDGE CASES

| Cenário | Handling |
|---------|----------|
| Sem scorecard de etapas anteriores | Gerar guia GENÉRICO (sem personalização) |
| Vaga sem competências críticas claras | Inferir 3-5 do JD e flagar para revisão |
| Duração curta (<30 min) | Reduzir para 3 perguntas + sem case |
| Candidato com score muito alto (>90) | Focar em validação cultural + gaps menores |

---

## EXEMPLO DE OUTPUT (PARCIAL — 1 pergunta)

```json
{
  "candidate_id": "C1",
  "job_title": "Tech Lead Backend",
  "duration_minutes": 60,
  "format": "online",
  "introduction": "Olá, obrigado pelo tempo. Sou {{INTERVIEWER}} e vou conduzir uma entrevista de aproximadamente 60 minutos focada em experiências práticas e decisões técnicas. Vou fazer perguntas estruturadas e aprofundar com follow-ups. Está confortável? Vamos começar.",
  "questions": [
    {
      "type": "star",
      "competency": "Liderança Técnica",
      "question": "Conte-me sobre uma situação em que você precisou decidir uma direção técnica controversa em um projeto, sabendo que parte do time discordava. Foque em UMA experiência específica.",
      "rationale": "Scorecard mostra 'mentoria de 3 plenos' mas não evidência de liderança em decisão controversa. A vaga pede capacidade de trade-off técnico, é gap a explorar.",
      "bars_anchors": [
        {
          "level": "exemplary",
          "score": 5,
          "description": "Cita situação concreta com data/contexto. Mostra que ouviu objeções, mapeou trade-offs (ex: latência vs custo), tomou decisão fundamentada com critério explícito, comunicou com transparência ao time, e mediu resultado pós-decisão. Reconhece pontos onde estava errado se aplicável."
        },
        {
          "level": "proficient",
          "score": 4,
          "description": "Cita situação concreta. Considerou múltiplas opções e fundamentou decisão. Comunicou ao time. Resultado mensurável apresentado, mesmo que sem comparação contrafactual."
        },
        {
          "level": "developing",
          "score": 3,
          "description": "Situação concreta mas decisão tomada com pouco trade-off explícito. Comunicação ao time mencionada superficialmente. Resultado descrito sem métrica clara."
        },
        {
          "level": "basic",
          "score": 2,
          "description": "História genérica ou hipotética. Decisão foi tomada por consenso sem liderança individual clara. Sem resultado mensurável."
        },
        {
          "level": "inadequate",
          "score": 1,
          "description": "Não consegue citar situação específica. Resposta abstrata ou desvio de pergunta. Atribui decisão a 'o time' sem ownership."
        }
      ],
      "follow_up_probes": [
        "Qual foi o trade-off principal que você considerou?",
        "Como você comunicou a decisão para quem discordava?",
        "Em retrospecto, faria diferente? Em que aspecto?",
        "Qual foi o impacto mensurável (latência, custo, time)?",
        "Quem mais participou da decisão final?"
      ],
      "red_flags": [
        "Atribui decisão a outro líder ('meu chefe decidiu')",
        "Sem métricas, apenas adjetivos ('foi um sucesso')",
        "Tom defensivo ao falar dos colegas que discordaram"
      ],
      "green_flags": [
        "Cita métrica concreta",
        "Reconhece o que faria diferente",
        "Demonstra empatia com quem discordou",
        "Mostra critério explícito de decisão (ex: 'priorizei X porque Y')"
      ]
    }
    // ... 4-6 outras perguntas seguindo o mesmo padrão
  ],
  "closing": "Foi muito bom conhecer suas experiências. Antes de encerrarmos, você tem alguma pergunta sobre a vaga, o time ou a empresa? [Após perguntas:] Próximos passos: nossa equipe vai consolidar feedback até {{DEADLINE}}. Você receberá retorno por email. Obrigado!",
  "scoring_instructions": "Após a entrevista, registre 1 score BARS (1-5) por competência observada na entrevista. Use APENAS as âncoras descritas. Se evidência insuficiente para uma competência, registre 'insufficient_evidence' (preferível a chutar). Cite trecho LITERAL da resposta como evidência. Submeta o scoring INDIVIDUALMENTE, antes de calibrar com outros entrevistadores."
}
```

---

## CHECKLIST DE QA

- [ ] 5-7 perguntas geradas
- [ ] Cada pergunta tem TODAS as 5 âncoras BARS (não apenas 3)
- [ ] BARS anchors são COMPORTAMENTAIS (observáveis), não atributos abstratos
- [ ] Cada pergunta tem rationale referenciando scorecard
- [ ] Follow-up probes 2-5 por pergunta
- [ ] Intro + closing presentes
- [ ] Scoring_instructions menciona "evidência citada" e "insufficient_evidence" como opção
