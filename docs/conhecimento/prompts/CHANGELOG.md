# Prompt Library — CHANGELOG

Versionamento global cronológico dos templates de prompt do M2 Funil RH.

**Convenção SemVer** (X.Y.Z) por `call_type`:
- **MAJOR** (X.0.0): mudança de critério avaliativo OU de schema Zod (incompatível). Exige nova rodada de gold standard validation (n=30, RH lead + segundo rater, blind, Pearson ≥ 0.70).
- **MINOR** (x.X.0): novos exemplos few-shot OU expansão de contexto. Scores comparáveis mas distribuição pode mudar.
- **PATCH** (x.x.X): typo, reformulação sem mudança semântica. Scores devem ser idênticos.

**Imutabilidade**: uma vez `prompt_versions.deployed_at IS NOT NULL` no Postgres, conteúdo é imutável (trigger `prevent_published_prompt_edit`). Mudanças exigem nova versão com novo SemVer + content_hash.

**Schema Zod versionado independentemente** — bump de `*_SCHEMA_VERSION` em `templates/00-shared-zod-schemas.ts` é sempre MAJOR do prompt que o referencia (compat matrix via `schema_version_required` no frontmatter).

---

## [unreleased]

(Mudanças em PR aberto, ainda não mergeadas para `main`.)

---

## 2026-04-27 — v1.0.0 (initial release de TODOS os 7 templates)

Versão inicial dos 7 templates depositados pela Deep Research #5 (Prompt Engineering Library) em `docs/conhecimento/prompts/templates/`. Patterns embutidos:

- **Anti-bias** (LGPD + Lei 9.029/95): system prompts instruem a ignorar nome, gênero, idade, raça, estado civil, religião, endereço; scoring baseado apenas em mérito (skills, experiência, citações textuais)
- **"Cite Before You Speak"** (Dokasto 2025): templates 02, 05, 06, 07 obrigam o LLM extrair citação literal do input ANTES de dar score
- **Insufficient Evidence** (Anthropic 2025): scores podem ser `"insufficient_evidence"` quando dado é inconclusivo (vs forçar palpite)
- **BARS por dimensão**: 5 níveis ancorados (exemplary 5, proficient 4, developing 3, basic 2, inadequate 1)
- **Bias flags**: schema `BiasFlags` em todos os outputs (`has_demographic_proxy`, `has_regional_marker`, `has_disfluency_only`)
- **Style neutralization** (Rao et al. 2025): template 06 explicitamente neutraliza estilo de escrita PT-BR variado
- **Position bias mitigation** (Zheng et al. 2023): template 03 (ranking) usa double-evaluation pattern + ID anonimizado

| Template | call_type | semver | model_id | schema_version_required | change_summary |
|----------|-----------|--------|----------|--------------------------|------------------|
| `01-cv-summary.md` | cv_summary | 1.0.0 | claude-haiku-4-5 | 1.0.0 | Resumo de CV em 4 parágrafos estruturados + extração de dados |
| `02-cv-job-match.md` | cv_job_match | 1.0.0 | claude-sonnet-4-6 | 1.0.0 | Match CV × vaga com BARS por competência crítica |
| `03-comparative-ranking.md` | comparative_ranking | 1.0.0 | claude-sonnet-4-6 | 1.0.0 | Ranking de N candidatos com double-evaluation pattern |
| `04-interview-guide.md` | interview_guide | 1.0.0 | claude-sonnet-4-6 | 1.0.0 | Guia de entrevista personalizada com BARS por pergunta |
| `05-transcript-analysis.md` | transcript_analysis | 1.0.0 | claude-sonnet-4-6 | 1.0.0 | Análise de transcrição com Cite-Before-You-Speak + bias mitigation PT-BR |
| `06-culture-fit-essay.md` | culture_fit_essay | 1.0.0 | claude-sonnet-4-6 | 1.0.0 | Avaliação de redação fit cultural com style-neutral scoring |
| `07-work-sample-sjt.md` | work_sample_sjt | 1.0.0 | claude-sonnet-4-6 | 1.0.0 | Scoring de Work Sample/SJT com inclusion/exclusion criteria por nível |

**Modelo padrão**: Sonnet 4.6 para 6 templates (julgamento avaliativo); Haiku 4.5 para `cv_summary` (extração estruturada simples). Fallback universal: `gpt-4o-mini` (ativado apenas quando circuit breaker Anthropic abrir — 5 falhas em 60s).

**Cache strategy**: system + (vaga + competências críticas + bars_rubric) marcados `cache_control: ephemeral` (TTL 5min Anthropic). CV/transcript/redação/resposta-aberta NÃO cacheados (input dinâmico).

**Status no DB**: aguardando merge inicial do PR de `scripts/sync-prompts.ts` (Phase 0 do M2). Após merge, todas 7 rows aparecem em `prompt_versions` com `is_active=false, is_canary=false`. Promoção para `is_active=true` exige gold standard validation (n=30 candidatos reais, 2 raters blind, Pearson r ≥ 0.70 + Disparate Impact ≥ 0.80).

---

## 2026-05-10 — Refinamento estrutural (sem bump de SemVer)

PRD `PRD-ai-prompt-library-m2.md` v0.1 finalizado. Refinamentos de **frontmatter** padronizados nos 7 templates (não muda content do prompt, portanto não bumpa SemVer):

- Adicionado `schema_version_required` (compat matrix com Zod)
- Renomeado `deployed_at` → `created_at` (deployed_at é estado runtime no DB, não metadata do arquivo)
- Renomeado `estimated_cost_per_call` → `estimated_cost_per_call_usd` (explícito sobre moeda)
- Padronizado `fallback_model_id: gpt-4o-mini` em todos (era `gpt-4o` em 02-07; agora alinhado com decisão do PRD §8.4)
- Padronizado `changed_by: tech-lead@beauty-smile.com.br`

`00-shared-zod-schemas.ts` ganhou exports `*_SCHEMA_VERSION` por uso + const `SCHEMA_VERSIONS`.

NOTA: como nenhum desses templates ainda foi `deployed_at` no DB Postgres (Phase 0 não iniciada), refinamentos de frontmatter NÃO são bloqueados pelo trigger de imutabilidade. Após primeiro deploy real, qualquer refinamento de frontmatter exige bump de PATCH no SemVer.

---

## Procedimento para registrar nova entrada neste CHANGELOG

Ao mergear PR que altera template:

1. Bumpar `semver` no frontmatter conforme regra MAJOR/MINOR/PATCH
2. Atualizar `change_summary` (1-line, imperativo, em pt-BR)
3. Atualizar `changed_by` (email do autor)
4. Deixar `content_hash: tbd` — CI calcula via SHA-256
5. Adicionar entrada neste CHANGELOG.md:
   ```markdown
   ## YYYY-MM-DD — vX.Y.Z (call_type)

   **Trigger**: [MAJOR/MINOR/PATCH bump justification]
   **Author**: tech-lead@beauty-smile.com.br | Approved by: [DPO se MAJOR]
   **Diff summary**: [bullet points do que mudou]
   **Migration impact**:
   - Schema Zod afetado? [yes/no — se yes, listar campo + bump *_SCHEMA_VERSION]
   - Edge Function consumer precisa atualizar? [yes/no — se yes, qual EF]
   - Gold standard validation necessária? [yes para MAJOR, no para MINOR/PATCH]
   ```
6. Commit + PR + review + merge → CI sync popula `prompt_versions` com `is_active=false`
7. Ver `RUNBOOK.md` para promoção a canary → active
