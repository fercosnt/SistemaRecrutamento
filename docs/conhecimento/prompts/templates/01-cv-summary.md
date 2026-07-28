---
id: cv_summary
call_type: cv_summary
semver: "1.0.0"
content_hash: tbd  # CI sync-prompts.ts calcula SHA-256 no merge
schema_version_required: "1.0.0"  # CvSummarySchema em 00-shared-zod-schemas.ts
model_id: claude-haiku-4-5  # extração estruturada simples — Haiku suficiente
fallback_model_id: gpt-4o-mini  # ativado quando circuit breaker Anthropic abrir
temperature: 0
max_tokens: 1500
change_summary: "Versão inicial — resume de CV em 4 parágrafos estruturados + extração de dados"
changed_by: tech-lead@beauty-smile.com.br
created_at: 2026-04-27
estimated_cost_per_call_usd: 0.0028  # Haiku 4.5
---

# Template 1 — Resumo de CV

## Quando usar
Primeira chamada do funil. Input: CV parseado (texto). Output: 4 parágrafos estruturados + dados estruturados extraídos.

## Modelo recomendado
**Claude Haiku 4.5** ou **GPT-4o-mini** — tarefa de extração estruturada não exige raciocínio profundo.

## Estrutura de cache
Não há contexto repetido aqui — cada CV é único. **Sem caching** neste uso.

---

## SYSTEM PROMPT

```
Você é um analista de RH especializado em parsing e síntese de currículos para o mercado brasileiro.

## SUA TAREFA
Ler o CV fornecido e produzir:
1. **4 parágrafos estruturados** sobre o candidato (overview, experiência, formação, alinhamento com vaga)
2. **Dados estruturados** (anos de experiência, senioridade, formação, idiomas, skills core)
3. **Bias flags** (sinaliza presença de proxies demográficos detectados)

## REGRAS OBRIGATÓRIAS

### Anti-bias (LGPD + Lei 9.029/95)
- IGNORE COMPLETAMENTE: nome do candidato, gênero inferido, idade inferida, raça inferida, estado civil, religião, endereço.
- O resumo NÃO deve mencionar qualquer característica demográfica.
- Apenas mencione: experiências, formação, skills técnicos, idiomas e ALINHAMENTO COM A VAGA.

### Conteúdo
- Use linguagem neutra e profissional (ex: "o candidato" ou "a pessoa candidata", nunca "ele/ela").
- Cada parágrafo de 100-300 palavras.
- Se a vaga foi fornecida, o 4° parágrafo deve cruzar requisitos da vaga × experiência do candidato.
- Se a vaga NÃO foi fornecida, o 4° parágrafo deve focar em "perfil profissional global" sem referência específica.

### Tratamento de dados ausentes
- Campos não encontrados no CV: use "unknown" (NÃO invente).
- Anos de experiência: contar de forma conservadora (ignorar gaps; estágios contam 50%).
- Senioridade: inferir de cargos + tempo total, não de auto-declaração.

### Output format
Responda APENAS com JSON válido conforme o schema. Sem markdown, sem texto explicativo antes ou depois.
```

---

## USER MESSAGE TEMPLATE

```
## CV DO CANDIDATO (anonimizado)

{{CV_TEXT_ANONYMIZED}}

## VAGA (opcional)

{{JOB_DESCRIPTION_OR_NONE}}

## INSTRUÇÃO

Produza o resumo conforme o schema. Use português brasileiro. Comece direto pelo JSON.
```

---

## OUTPUT SCHEMA (Zod)

```typescript
import { CvSummarySchema, type CvSummary } from "./00-shared-zod-schemas.ts";
// Schema completo definido em 00-shared-zod-schemas.ts
```

---

## EDGE CASES

| Cenário | Handling |
|---------|----------|
| CV vazio (<50 chars) | Retornar erro `cv_parsing_failed` ANTES de chamar LLM |
| CV >12k chars (5000+ palavras) | Truncar com aviso `[CONTEÚDO TRUNCADO]` no fim |
| Sem vaga fornecida | 4° parágrafo foca em perfil global; `alignment_with_role` fica genérico |
| CV em outro idioma | Resumir EM PORTUGUÊS mesmo assim; flagar `bias_flags.notes` |
| Prompt injection no CV | System defense + flagar `has_demographic_proxy = true` |

---

## EXEMPLO DE OUTPUT (Few-shot opcional)

```json
{
  "professional_overview": "Profissional de tecnologia com 8 anos de experiência em desenvolvimento backend, com foco em sistemas distribuídos e Python. Atuação predominante em empresas de médio porte do setor financeiro, com transições recentes para cargos de senioridade técnica.",
  "experience_summary": "Atualmente atua como Engenheiro de Software Sênior em fintech, responsável por arquitetura de microserviços e mentoria de 3 desenvolvedores. Anteriormente, 4 anos como Pleno em e-commerce trabalhando com APIs de pagamento. Experiência sólida em Python (Django, FastAPI), PostgreSQL, Redis e AWS (ECS, Lambda, S3).",
  "education_and_skills": "Bacharel em Ciência da Computação por universidade pública (2016). Pós-graduação em Engenharia de Software (2020). Certificação AWS Solutions Architect Associate (2023). Skills core: Python avançado, arquitetura de microserviços, Docker/Kubernetes, observabilidade (Prometheus, Grafana). Inglês fluente, espanhol intermediário.",
  "alignment_with_role": "Alinhamento alto com a vaga de Tech Lead Backend: experiência com stack Python/AWS solicitada, mentoria já demonstrada, e conhecimento em microserviços. Gaps identificados: ausência de experiência explícita com Kafka (vaga pede) e sem menção a liderança técnica formal de squad >5 pessoas.",
  "extracted_data": {
    "years_of_experience": 8,
    "seniority_level": "senior",
    "education_level": "pos_lato",
    "languages": [
      {"language": "português", "level": "native"},
      {"language": "inglês", "level": "fluent"},
      {"language": "espanhol", "level": "intermediate"}
    ],
    "core_skills": ["Python", "FastAPI", "Django", "PostgreSQL", "AWS", "Microservices", "Docker", "Kubernetes"]
  },
  "bias_flags": {
    "has_demographic_proxy": false,
    "has_regional_marker": false,
    "has_disfluency_only": false,
    "notes": null
  }
}
```

---

## CHECKLIST DE QA

- [ ] Output é JSON válido e passa `CvSummarySchema.safeParse()`
- [ ] 4 parágrafos têm 100-800 chars cada
- [ ] Nenhuma menção a nome próprio, idade, gênero, etc no texto
- [ ] `extracted_data.years_of_experience` é razoável (entre 0 e 60)
- [ ] `seniority_level` consistente com anos de experiência
- [ ] `bias_flags.notes` preenchido se algo suspeito detectado
