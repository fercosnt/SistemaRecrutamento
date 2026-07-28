---
id: comparative_ranking
call_type: comparative_ranking
semver: "1.0.0"
content_hash: tbd  # CI sync-prompts.ts calcula SHA-256 no merge
schema_version_required: "1.0.0"  # ComparativeRankingSchema em 00-shared-zod-schemas.ts
model_id: claude-sonnet-4-6  # síntese qualitativa de múltiplas análises
fallback_model_id: gpt-4o-mini  # ativado quando circuit breaker Anthropic abrir
temperature: 0
max_tokens: 3000
change_summary: "Versão inicial — ranking de N candidatos com double-evaluation pattern"
changed_by: tech-lead@beauty-smile.com.br
created_at: 2026-04-27
estimated_cost_per_call_usd: 0.0165  # Sonnet 4.6, custo varia com N candidatos
---

# Template 3 — Comparativo de N Candidatos (Ranking)

## Quando usar
Após Match CV×Vaga (Template 2) ter rodado para N candidatos. Input: 3-10 análises individuais + vaga. Output: ranking com justificativa relativa.

## Modelo recomendado
**Claude Sonnet 4.6** — síntese qualitativa de múltiplas análises requer raciocínio profundo.

## CRÍTICO — Position Bias Mitigation
LLMs têm **position bias sistemático** (Zheng et al. 2023). Para mitigar:
1. **Double evaluation**: rodar prompt duas vezes com ordem dos candidatos invertida.
2. **Score final = média das duas execuções**.
3. Se rankings divergem em >2 posições para um candidato, flag para revisão humana.

---

## SYSTEM PROMPT

```
Você é um avaliador senior de RH responsável por ranquear candidatos finalistas para uma vaga.

## SUA TAREFA
Receber N análises individuais (já produzidas pelo Template 2) + descrição da vaga, e produzir um ranking COMPARATIVO com justificativa de cada posição.

## REGRAS OBRIGATÓRIAS

### CoT obrigatório
Comece pelo campo `reasoning`. Estrutura:
1. Mapeamento dos pontos fortes/gaps de cada candidato
2. Critérios de desempate (priorizar requisitos críticos da vaga)
3. Hipótese de ranking
4. Verificação por evidência

### Anti-bias
- Candidatos vêm identificados APENAS por IDs (C1, C2, ..., CN). Sem nomes, sem demografia.
- O ranking deve depender APENAS dos atributos profissionais (skills, experiência, gaps).
- Se você perceber que está favorecendo um ID por motivo não-objetivo, recalibre.

### Justificativa relativa (NÃO absoluta)
- Cada candidato deve ter `relative_strengths` (vs OUTROS candidatos do pool, não em geral) e `relative_weaknesses`.
- Ex: NÃO escreva "tem boa experiência em Python" (absoluto). ESCREVA: "tem mais experiência prática em Python que C2 e C5, equivalente a C1".

### Pointwise + Pairwise (híbrido)
- Use scores composite individuais como base.
- Pairwise APENAS para desempate quando scores compostos divergem em <5 pontos.

### Empates
- Se 2+ candidatos têm scores em delta <3 pontos, marque como `ties_or_concerns`.
- NÃO force ordenação artificial — mantenha empate explícito.

### Output format
Responda APENAS com JSON válido conforme schema. Sem markdown.
```

---

## USER MESSAGE TEMPLATE

```
## VAGA

{{JOB_DESCRIPTION}}

### Critérios críticos de desempate:
{{TIE_BREAKING_CRITERIA}}

## CANDIDATOS A RANQUEAR

{{CANDIDATES_ANALYSES}}

### Estrutura por candidato:
- ID: C1
  - match_score: 78
  - strengths: [...]
  - gaps: [...]
  - competency_scores: [...]
- ID: C2
  - ... etc

## INSTRUÇÃO

Produza o ranking conforme schema. Use português brasileiro. Aplique CoT no campo `reasoning` antes de qualquer ordenação.
```

---

## DOUBLE EVALUATION PATTERN (TypeScript)

```typescript
async function rankCandidatesWithBiasCheck(
  candidates: CandidateAnalysis[],
  jobDescription: string
): Promise<RankingResult> {

  // 1ª passada: ordem original
  const ranking1 = await rankCandidates(candidates, jobDescription);

  // 2ª passada: ordem INVERTIDA
  const reversed = [...candidates].reverse();
  const ranking2 = await rankCandidates(reversed, jobDescription);

  // Verificar consistência
  const inconsistencies = ranking1.ranked_candidates.filter(c1 => {
    const c2 = ranking2.ranked_candidates.find(r => r.candidate_id === c1.candidate_id);
    return c2 && Math.abs(c1.rank - c2.rank) > 2;  // >2 posições de diferença = bias
  });

  if (inconsistencies.length > 0) {
    console.warn(`[BiasCheck] ${inconsistencies.length} candidatos com ranking inconsistente — revisar humanamente`);
    return {
      ...ranking1,
      bias_audit: {
        counterfactual_check_run: true,
        score_variance_within_threshold: false,
        notes: `${inconsistencies.length} candidatos com diferença >2 posições entre execuções`
      }
    };
  }

  // Score final = média das duas
  const finalRanking = mergeRankings(ranking1, ranking2);
  return finalRanking;
}
```

---

## EDGE CASES

| Cenário | Handling |
|---------|----------|
| N < 2 | Retornar erro `insufficient_candidates` |
| N > 10 | Truncar para top 10 por match_score; flag |
| Todos os candidatos com `confidence: insufficient_evidence` | Bloquear ranking — pedir mais informação |
| Position bias detected (>2 posições diff) | Flag para revisão humana, não promove ranking |
| Empate em top 3 | NÃO forçar ordem — listar em `ties_or_concerns` |

---

## EXEMPLO DE OUTPUT

```json
{
  "reasoning": "Pool de 5 candidatos para Tech Lead Backend. C1 (score 82) lidera por experiência forte em Python+AWS+microsserviços e mentoria comprovada. C3 (score 79) e C2 (score 78) estão em delta <3 pontos — empate técnico. C3 ganha em experiência com Kafka (gap crítico para C2). C4 (score 65) tem gaps em arquitetura cloud. C5 (score 52) é júnior demais para o nível.",
  "ranked_candidates": [
    {
      "candidate_id": "C1",
      "rank": 1,
      "composite_score": 82,
      "relative_strengths": [
        "Mais anos em produção com Python que outros 4 candidatos",
        "Único com experiência demonstrada em mentoria formal de 3+ pessoas"
      ],
      "relative_weaknesses": [
        "Sem evidência de Kafka — C3 é mais forte aqui"
      ],
      "rationale": "Lidera por combinação de senioridade técnica + soft skills (mentoria) que outros não demonstram com evidência."
    },
    {
      "candidate_id": "C3",
      "rank": 2,
      "composite_score": 79,
      "relative_strengths": [
        "Único com Kafka em produção mencionado explicitamente",
        "Equivalente a C2 em Python, superior em sistemas distribuídos"
      ],
      "relative_weaknesses": [
        "Mentoria não-evidenciada (vs C1)",
        "Menos tempo total (5 anos vs 8 do C1)"
      ],
      "rationale": "Empate técnico com C2 (delta <3pts) mas vence por Kafka — gap crítico de C2."
    },
    {
      "candidate_id": "C2",
      "rank": 3,
      "composite_score": 78,
      "relative_strengths": ["Mesmo nível de Python que C3"],
      "relative_weaknesses": ["Sem Kafka — perdeu para C3 no desempate"],
      "rationale": "Empate com C3 quebrado por requisito crítico Kafka."
    }
  ],
  "recommendation": {
    "top_choice": "C1",
    "backup_choice": "C3",
    "note": "C1 é escolha forte. Se não aceitar oferta, C3 é o mais alinhado por ter Kafka."
  },
  "ties_or_concerns": [
    "C2 e C3 em delta de 1 ponto — empate quase perfeito, desempate por critério único (Kafka)"
  ],
  "bias_audit": {
    "counterfactual_check_run": true,
    "score_variance_within_threshold": true,
    "notes": "Double evaluation rodada — ordem invertida na 2ª passada produziu ranking idêntico"
  }
}
```

---

## CHECKLIST DE QA

- [ ] `reasoning` ANTES de qualquer ranking
- [ ] Cada candidato tem 1-3 `relative_strengths` (comparativos, não absolutos)
- [ ] Empates explícitos em `ties_or_concerns` (não forçados)
- [ ] `bias_audit.counterfactual_check_run = true` (double evaluation rodou)
- [ ] `top_choice` e `backup_choice` com justificativa
