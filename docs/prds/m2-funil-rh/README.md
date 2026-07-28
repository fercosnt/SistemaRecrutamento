# M2 — Funil RH + Avaliação por IA

Pasta dedicada aos PRDs do **Milestone 2** (Funil RH), sucessor do M1 — MVP Candidato.

## Documentos

### PRD Master
- **[`PRD-MASTER-funil-rh-m2.md`](./PRD-MASTER-funil-rh-m2.md)** — visão arquitetural completa do M2 (16 seções, comprehensive). Pipeline 6 etapas, 10 integrações IA + 1 cost-alerter, schema completo (incl. `agendamentos_entrevista` + `devolutivas_candidato` + `bigfive_respostas_em_progresso` + `prompt_versions` + `ai_call_logs` + `candidate_ai_decisions` + `ai_cost_daily`), RLS, Edge Functions, LGPD, RAG knowledge base, custos, riscos. **Status: ✅ v1.0 CONSOLIDADO (2026-06-06) — 5/5 mini-PRDs derivados done (Big Five · Redação fit-cultural · AI Prompt Library · Cognitivo-raciocínio · SJT/Work Sample) e absorvidos no Master. Versão final congelada, pronta para abrir o M2.**

### Prompts pra sessões dedicadas
- **[`PROMPTS-mini-prds.md`](./PROMPTS-mini-prds.md)** — 5 prompts auto-contidos (1 por mini-PRD) prontos pra copiar quando abrir nova janela. Cada prompt aciona skill `skill-prd`, define knowledge base a carregar, lista decisões locked, refinements esperados, entregáveis (mini-PRD + Master update + README update + memory update).

### Mini-PRDs derivados — Decisão: criar em sessões separadas (não nesta janela)

Cada mini-PRD será trabalhado em sessão dedicada (uma janela por mini-PRD) pra:
- Evitar context overflow numa única conversa
- Permitir foco profundo em cada instrumento/feature
- Reusar o knowledge base já depositado em `docs/conhecimento/`

| Arquivo | Status | Origem | Knowledge Base |
|---------|--------|--------|----------------|
| **[`PRD-cognitivo-raciocinio.md`](./PRD-cognitivo-raciocinio.md)** | ✅ **Done 2026-06-05** (pivot do ICAR60) | Aposenta `../raven-onboarding-prd.md` + `../cognitivo-icar-prd.md` | `docs/conhecimento/icar60/` |
| **[`PRD-bigfive-revisado.md`](./PRD-bigfive-revisado.md)** | ✅ **Done 2026-04-28** | Substitui `../bigfive-prd.md` (DEPRECATED) | `docs/conhecimento/big-five/` (PESQUISA + 5 Word docs + report BFAS + curso NotebookLM + **`templates-devolutiva.md` 25 templates oficiais**) |
| **[`PRD-sjt-work-sample-odontologia.md`](./PRD-sjt-work-sample-odontologia.md)** | ✅ **Done 2026-06-05** | NOVO — 7 bancos por cargo real (taxonomia dos formulários) + BARS + escala 4/2/1/0 + Híbrido git→DB | `docs/conhecimento/sjt/` (PESQUISA + `perguntas-vagas.md` + 7 `banco-sjt-*.md` + `bars-rubrics-por-dimensao.md`) |
| **[`PRD-redacao-fit-cultural.md`](./PRD-redacao-fit-cultural.md)** | ✅ **Done v1.1 — 2026-05-12** (revisa v1.0 de 2026-05-10) | Substitui `../fit-cultural-prd.md` (DEPRECATED) | `docs/conhecimento/fit-cultural/` (4 arquivos completos v1.1: `valores-beauty-smile-resumo.md` · `pergunta-padrao-redacao.md` · `bars-redacao-4-dimensoes.md` · `exemplos-respostas-bars.md` com 3 exemplos calibrados Camila/Rodrigo/Mariana) + `Cultura-Beauty-Smile-Para-Recrutamento.md` |
| **[`PRD-ai-prompt-library-m2.md`](./PRD-ai-prompt-library-m2.md)** | ✅ **Done 2026-05-10** | NOVO — Híbrido git→DB versioning + 7 templates frontmatter padronizado + admin UI 3 páginas + cost-alerter EF + gold standard procedure | `docs/conhecimento/prompts/` (templates + USAGE.md + RUNBOOK.md + CHANGELOG.md + AUDITORIA + 5 fontes) |

## Pesquisas alimentando este M2

Todas concluídas em 2026-04-27 e depositadas em `docs/conhecimento/` (ver §8.8 do Master pra arquitetura RAG):
- ✅ **Deep Research #1** — ICAR60 PT-BR → `docs/conhecimento/icar60/PESQUISA-icar60-cognitivo.md`
- ✅ **Deep Research #2** — Big Five IPIP-NEO PT-BR → `docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md` + item bank JSON + 6 PDFs acadêmicos
- ✅ **Deep Research #3** — Banco SJT/Work Sample odontologia → `docs/conhecimento/sjt/PESQUISA-sjt-odontologia-beauty-smile.md` + exemplos plataformas
- ✅ **Deep Research #5** — Prompt Engineering Library → `docs/conhecimento/prompts/` (8 templates + Zod schemas + LGPD audit + 5 fontes)

**Bonus:** materiais Fernando depositados em `docs/conhecimento/big-five/`:
- 5 Word docs interpretativos (1 por dimensão OCEAN)
- Teste validado BFAS (perguntas) + report BFAS validado do próprio Fernando (modelo de devolutiva)
- Link curso NotebookLM Big Five

## Workflow atual

```
✅ 1. Deep researches voltam (4/4 done 2026-04-27)
✅ 2. Master PRD v0.1 → v0.2 (pós-pesquisa, 3 lockings adicionais)
✅ 3a. PRD-bigfive-revisado.md (done 2026-04-28) → Master v0.2 → v0.3
✅ 3b. PRD-redacao-fit-cultural.md (done v1.0 2026-05-10 → revisado v1.1 2026-05-12) → Master v0.3 → v0.4 → v0.6
✅ 3c. PRD-ai-prompt-library-m2.md (done 2026-05-10) → Master v0.4 → v0.5
✅ 3d. PRD-cognitivo-raciocinio.md (done 2026-06-05, pivot ICAR60) → Master v0.6 → v0.7
✅ 3e. PRD-sjt-work-sample-odontologia.md (done 2026-06-05) → Master v0.7 → v0.8
✅ 4. Master PRD v0.8 → v1.0 (consolidação final — todos os 5 mini-PRDs done) — 2026-06-06
   5. M1 fecha (Phase 5 + confirmar Phase 3)
   6. /gsd-complete-milestone (M1) → /gsd-new-milestone (M2)
   7. /gsd-discuss-phase consumindo Master + mini-PRDs como input
   8. Phases do M2 começam
```

## Documentos correlatos (fora desta pasta)

- `../PRD-MASTER-sistema-recrutamento.md` — PRD-Master geral do sistema (referência de cima)
- `../CULTURA-BEAUTY-SMILE-INPUT.md` — input cultural usado na redação fit cultural
- `../fit-cultural-banco-itens-v1.md` — banco de itens existente
- `../prd-db-*.md` — PRDs de modelagem DB (legados, podem ser revisados)
- `../0018-prd-pipeline-recrutamento.md` — PRD legado do pipeline (será **deprecado** por este M2)
