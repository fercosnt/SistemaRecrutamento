# Subagente 3 — Open-Source Repos com Prompts Production-Grade para ATS / Scoring

> Coletado em 2026-04-27 via deep-research subagente (Sonnet) | 15 repos rankeados

---

## TIER 1 — Alta Relevância

### 1. `interviewstreet/hiring-agent` ⭐ 141
**URL:** https://github.com/interviewstreet/hiring-agent
- HackerRank production-grade, templates Jinja2 separados por seção, Pydantic schemas, Ollama + Gemini
- **Único repo com rubric REAL e completo de scoring de candidatos em produção**

**PROMPT REAL — `resume_evaluation_criteria.jinja`:**
```
Four mandatory scoring categories:
1. Open Source (0–35 pts): Contributions to external projects, GSoC. Personal repos alone don't count; cap at 10 if only self-projects.
2. Self Projects (0–30 pts): Tutorial projects (todo lists, calculators) score 1–9; complex full-stack 20–30.
3. Production (0–25 pts): Work experience, internships, founder roles.
4. Technical Skills (0–10 pts): Programming languages, breadth, problem-solving.

Fairness: NEVER score based on name, gender, demographics, institution, GPA, location.

Bonus: max 20 pts (GSoC +5, Girl Script +3, startup founder +3–5)
Deductions: missing project links (−3 to −5 each), tutorial-only projects.
Overall ceiling: 120 points.

Response must be valid JSON only — no summaries:
{
  "scores": {"open_source": int, "self_projects": int, "production": int, "technical_skills": int},
  "bonus_points": int, "deductions": int,
  "key_strengths": [max 5 items],
  "areas_for_improvement": [max 3 items]
}
```

**System message bias-free:**
```
You are an objective, bias-free technical recruiter. Evaluate resumes based exclusively on technical merit. Prioritize transparency, verifiability, and demonstrated impact over credentials or demographics.
```

### 2. `prometheus-eval/prometheus-eval` ⭐ 1.1k
**URL:** https://github.com/prometheus-eval/prometheus-eval
- Framework LLM-as-judge production com rubric 1–5
- ICLR 2024, fine-tuned 7B/8x7B evaluator models
- **Padrão da academia para LLM-as-judge**

**PROMPT ABSOLUTE_PROMPT (real):**
```
###Task Description:
An instruction (might include an Input inside it), a response to evaluate,
a reference answer that gets a score of 5, and a score rubric representing
an evaluation criteria are given.

1. Write a detailed feedback that assesses the quality of the response strictly
   based on the given score rubric, not evaluating in general.
2. After writing a feedback, write a score that is an integer between 1 and 5.
3. Output: "Feedback: (write feedback) [RESULT] (an integer 1-5)"

###The instruction to evaluate: {instruction}
###Response to evaluate: {response}
###Reference Answer (Score 5): {reference_answer}
###Score Rubrics: {rubric}
###Feedback:
```

**System:** `"You are a fair judge assistant tasked with providing clear, objective feedback based on specific criteria, ensuring each assessment reflects the absolute standards set for performance."`

### 3. `promptfoo/promptfoo` ⭐ 20.6k
**URL:** https://github.com/promptfoo/promptfoo
- Framework completo de eval/red-teaming
- llm-rubric assertion com output JSON estruturado
- Usado por OpenAI e Anthropic internamente
- **Padrão de facto para LLM-as-judge em TypeScript**

**Output JSON do grader:**
```json
{
  "reason": "<Analysis of rubric and output>",
  "score": 0.5,
  "pass": true
}
```

### 4. `confident-ai/deepeval` ⭐ 15k
**URL:** https://github.com/confident-ai/deepeval
- Framework de eval LLM estilo Pytest
- GEval (custom criteria com LLM-as-judge), métricas RAG, custom metrics

**Pattern GEval:**
```python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

candidate_fit_metric = GEval(
    name="CandidateFit",
    criteria="Determine if candidate matches job requirements. Consider: technical skills alignment, years of experience, communication clarity, culture fit indicators.",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.7
)
```

### 5. `sliday/resume-job-matcher` ⭐ 266
**URL:** https://github.com/sliday/resume-job-matcher
- Sistema completo matching resume-job
- 7 dimensões com pesos configuráveis, red flags automáticos

**Scoring Architecture:**
```
Dimensões com pesos default:
- Technical Skills: 50
- Years of Experience: 20
- Education Level: 10
- Soft Skills: 9–20
- Language Proficiency: 5
- Certifications: 5
- Location: 50 (negative selection)

Final = Σ(score_i × weight_i) / Σ(weight_i)
AI Match: 75% weight | Resume Quality: 25% weight
```

**Criterion-Level Scoring:**
```
Evaluate the candidate's resume based on the criterion: {name}.
Factors to consider: {factors}.
Job Requirements: {json_requirements}.
Provide evaluation as integer score 0-100.
Only return the integer score, nothing else.
```

---

## TIER 2 — Bons Padrões, Menos Completos

### 6. `srbhr/Resume-Matcher` ⭐ 26.8k (maior repo ATS OSS)
- Multi-provider (Claude Haiku 4.5, GPT-5 Nano, Gemini, DeepSeek via LiteLLM)
- ATS scoring + keyword highlighting; FastAPI + Next.js
- **Gap:** Prompts internos não expostos no público

### 7. `Hungreeee/Resume-Screening-RAG-Pipeline` ⭐ 178
- Pipeline RAG para screening com adaptive retrieval
- LLM faz cross-comparisons multi-candidato

### 8. `openai/evals` ⭐ 18.3k
- Model-graded evals via YAML

**battle.yaml real:**
```yaml
battle:
  prompt: |-
    You are comparing two responses to the following two instructions.
    [Instruction 1] {input1}
    [Response 1] {completion1}
    [Instruction 2] {input2}
    [Response 2] {completion2}
    Is the first response better than the second?
  choice_strings: ["Yes", "No"]
  choice_scores: {"Yes": 1.0, "No": 0.0}
```

### 9. `langchain-ai/openevals` ⭐ 1k
- `create_llm_as_judge()` factory function
- Continuous scoring (0–1) e categorical
- Outputs tipados automaticamente

### 10. `dzhng/zod-gpt` ⭐ 628
- Structured JSON outputs via Zod para OpenAI e Anthropic
- Self-reflection automático, retries, validação

### 11. `jxnl/instructor` ⭐ 12.8k
- Structured outputs para LLMs com Pydantic
- 15+ providers, retries, validação
- **Padrão de facto para Python**

**Schema CandidateProfile (Pydantic):**
```python
class ContactInfo(BaseModel):
    location: str
    phone_number: str
    email_address: str
    personal_urls: List[str]

class WorkExperience(BaseModel):
    company_name: str
    job_title: str
    start_date: str
    end_date: str
    description: str

class CandidateProfile(BaseModel):
    candidate_name: str
    job_title: str
    bio: str
    contact_info: ContactInfo
    work_output: List[WorkExperience]
    skills: List[str]
    education: List[Education]
    professional_development: List[str]
```

### 12. `llmkit-ai/llmkit` ⭐ 119
- Toolkit de prompt management com versionamento
- Test sets com scoring por versão
- Performance dashboards, execution traces

**Pattern de versionamento:**
```
Template syntax (Jinja-style/Tera):
  Variable: {{ assistant_name }}
  Conditional: {% if formal_tone %}...{% endif %}
  Loop: {% for topic in topics %} - {{ topic }} {% endfor %}

Prompt Types:
  1. Static System Prompts (fixed)
  2. Dynamic System Prompts (variable substitution)
  3. Dynamic System & User Prompts (both templates)

Features: change tracking, eval test sets per version, dashboards, traces.
```

### 13. `profilecity/vidur` ⭐ 428
- ATS OSS moderno: PostgreSQL + Drizzle + Docker, plugin architecture
- **Sem AI nativo** — apenas workflow/tracking

### 14. `joshuamschultz/prompt-manager` ⭐ 0 (mas padrão exemplar)
- Prompt versioning com semver explícito + changelog
- YAML schema + Handlebars templating

**SemVer pattern real:**
```python
prompt = Prompt(id="candidate_scorer", version="1.0.0", ...)
await manager.create_prompt(prompt, changelog="Initial candidate scoring rubric")

prompt.template.content = "Updated scoring criteria with BARS rubric"
await manager.update_prompt(
    prompt,
    bump_version=True,
    changelog="Added behavioral anchors to technical skills dimension",
)

history = await manager.get_history("candidate_scorer")
```

**YAML Schema:**
```yaml
version: "1.2.0"
prompts:
  - id: candidate_scorer
    version: "1.2.0"
    format: text
    status: active
    template:
      content: "You are evaluating candidate {{candidate_name}}..."
      variables: [candidate_name, job_title, resume_text, job_description]
```

### 15. `supabase/supabase` (docs/examples)
**Edge Function + OpenAI pattern oficial:**
```typescript
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

Deno.serve(async (req) => {
  const { query } = await req.json()
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  const openai = new OpenAI({ apiKey })

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: query }],
    model: 'gpt-4o',
    stream: false,
  })

  return new Response(chatCompletion.choices[0].message.content)
})
```

---

## SCHEMAS ZOD/PYDANTIC EXEMPLARES

### Schema 1: CandidateScore (Zod, baseado em zod-gpt + Anthropic)
```typescript
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"

const DimensionScore = z.object({
  score: z.number().min(0).max(100).describe("Score 0-100"),
  rationale: z.string().describe("Evidence-based justification"),
  highlights: z.array(z.string()).describe("Key evidence points"),
})

const CandidateScoreSchema = z.object({
  candidate_name: z.string(),
  job_title: z.string(),
  overall_score: z.number().min(0).max(100),
  dimensions: z.object({
    technical_skills: DimensionScore,
    experience: DimensionScore,
    open_source: DimensionScore,
    projects: DimensionScore,
  }),
  key_strengths: z.array(z.string()).max(5),
  areas_for_improvement: z.array(z.string()).max(3),
  recommendation: z.enum(["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"]),
  bias_check_passed: z.boolean(),
})

const response = await client.messages.parse({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  output_config: { format: zodOutputFormat(CandidateScoreSchema) },
  system: "You are a fair technical recruiter. Score only on merit.",
  messages: [{ role: "user", content: `Evaluate: ${resumeText}` }]
})
```

### Schema 2: ResumeParser (Pydantic + instructor)
```python
class SkillSet(BaseModel):
    category: str
    level: Optional[str]  # junior/mid/senior/expert
    keywords: List[str]

class ResumeStructured(BaseModel):
    candidate_name: str
    email: str
    years_of_experience: int
    skills: List[SkillSet]
    education_level: str  # high_school/bachelor/master/phd
    has_open_source: bool
    github_url: Optional[str]

class CandidateEval(BaseModel):
    profile: ResumeStructured
    match_percentage: int = Field(ge=0, le=100)
    missing_keywords: List[str]
    recommendation: str
    fit_summary: str
```

---

## 5 PROMPTS REAIS COMPLETOS EXTRAÍDOS

### Prompt 1 — ATS Scoring (Gemini Pro)
```
Hey Act Like a skilled or very experienced ATS with deep understanding of tech field.
Your task is to evaluate the resume based on the given job description.

resume:{text}
description:{jd}

Response structure:
{"JD Match": "%", "MissingKeywords": [], "Profile Summary": ""}
```

### Prompt 2 — LLM-as-Judge Absoluto (Prometheus, production)
[Já listado na Tier 1 acima]

### Prompt 3 — Rubric Customizado (promptfoo style)
```yaml
rubricPrompt: |
  [
    {"role": "system", "content": "You are evaluating whether a candidate response demonstrates the required technical competency. Be objective and evidence-based."},
    {"role": "user", "content": "Candidate response: {{output}}\n\nEvaluation criteria: {{rubric}}\n\nReturn JSON: {\"reason\": \"string\", \"score\": 0.0-1.0, \"pass\": boolean}"}
  ]
```

### Prompt 4 — Criterion-Level (sliday)
[Já listado acima]

### Prompt 5 — Bias-Free System Message (interviewstreet)
[Já listado acima]

---

## PADRÕES COMUNS OBSERVADOS

1. **Output sempre JSON estrito** — `"Return ONLY valid JSON. No explanatory text, no markdown."`
2. **Critérios granulares com pesos** — 4–8 dimensões com pesos explícitos (não score único geral)
3. **Anti-bias como requirement explícito** — instrução proibindo scoring por nome/gênero/instituição/GPA/localização
4. **Jinja2 / Handlebars para templating** — separar lógica de prompt do conteúdo avaliativo
5. **Rubric 1–5 com âncoras textuais** — Prometheus pattern, behavioral anchors
6. **Separação sistema/usuário** — System = persona + regras; User = dados variáveis
7. **Zod para TypeScript, Pydantic para Python** — sem exceção em Tier 1
8. **Scores 0–100 ou 0–1** — 0–100 candidatos; 0–1 LLM-as-judge; 1–5 Prometheus

---

## GAPS — O QUE NÃO EXISTE PUBLICAMENTE

1. **Edge Function Supabase + Claude com structured output para ATS** — você precisará construir do zero
2. **TypeScript com Zod + scoring multi-dimensão de candidatos** — ecossistema TypeScript não existe em qualidade
3. **BARS explícito** — nenhum repo usa o termo formalmente
4. **Prompt versioning com semver em produção** — `llmkit` (119 stars) e `prompt-manager` (0 stars) têm os melhores padrões mas baixa adoção. LangSmith Hub usa hash de commit
5. **Interview scoring durante entrevista** (não screening) — repos focam em resume screening
6. **ATS OSS sério com >1k stars E AI nativo de qualidade** — Resume-Matcher (26.8k) tem AI mas não expõe prompts; vidur (428) é ATS sem AI

---

## RECOMENDAÇÕES DIRETAS PARA STACK ATS

| Componente | Solução |
|---|---|
| Parsing de resume | `instructor` (Python) ou `zodOutputFormat` (TypeScript/Claude) |
| Schema de candidato | Pydantic `CandidateProfile` ou Zod `CandidateScoreSchema` |
| Rubric de scoring | Adaptar `interviewstreet/hiring-agent` (4 categorias + bias-free) |
| LLM-as-judge | `prometheus-eval` rubric 1–5 ou `promptfoo` llm-rubric |
| Edge Function | Supabase oficial + `zodOutputFormat` Anthropic |
| Prompt versioning | `llmkit` (119 stars) ou padrão LangSmith commit-hash |
| Framework de eval | `deepeval` GEval para métricas customizadas |

---

## Fontes

- [interviewstreet/hiring-agent](https://github.com/interviewstreet/hiring-agent)
- [prometheus-eval/prometheus-eval](https://github.com/prometheus-eval/prometheus-eval)
- [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo)
- [confident-ai/deepeval](https://github.com/confident-ai/deepeval)
- [sliday/resume-job-matcher](https://github.com/sliday/resume-job-matcher)
- [srbhr/Resume-Matcher](https://github.com/srbhr/Resume-Matcher)
- [openai/evals](https://github.com/openai/evals)
- [langchain-ai/openevals](https://github.com/langchain-ai/openevals)
- [dzhng/zod-gpt](https://github.com/dzhng/zod-gpt)
- [jxnl/instructor](https://github.com/jxnl/instructor)
- [llmkit-ai/llmkit](https://github.com/llmkit-ai/llmkit)
- [profilecity/vidur](https://github.com/profilecity/vidur)
- [joshuamschultz/prompt-manager](https://github.com/joshuamschultz/prompt-manager)
