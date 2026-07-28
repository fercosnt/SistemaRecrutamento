# Phase 13: Redação Cultural + Revisão Humana - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 grey areas resolved, all accepted as recommended

<domain>
## Phase Boundary

O candidato escreve UMA redação fit-cultural aberta (200-500 palavras, hard min/max) avaliada
por IA em **4 dimensões BARS** (os 4 valores oficiais Beauty Smile, pesos iguais V1) + **3 caps
determinísticos** + **sistema de 3 cores** (Zod `EssayScoringV1`), e **toda** redação passa por
**revisão humana obrigatória** (status `pendente_humano`) antes de qualquer avanço — a IA jamais
decide sozinha (RNF-07a). Persiste `redacoes_candidato`; marca `bloqueio_avanco` quando vermelho.

Cobre AVAL-05 (form + seed `perguntas_redacao`), AVAL-06 (EF de avaliação + scoring), AVAL-07
(UI de revisão humana). Etapa 3 do funil (avaliação assíncrona), camada redação — segue a infra
de Phase 11 (avaliacao feature, respostas_avaliacao, autosave/back-lock) e Phase 9 (AI prompt
library, ai-client, audit-logger, prompt_versions).

**Fora de escopo:** entrevistas (Phase 14), decisão final (Phase 15), a11y hardening (Phase 16).
</domain>

<decisions>
## Implementation Decisions

### Spec source (binding)
- **Phase 13 é vinculada ao PRD `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md` v1.1** como spec autoritativa. `docs/prds/fit-cultural-prd.md` está DEPRECATED (modelo SJT/Likert antigo) — NÃO usar.
- O planner/researcher DEVE ler o PRD v1.1 por inteiro e implementar verbatim: rubric BARS 4D, os 3 caps especiais, os thresholds das 3 cores, os prompts de redação (banco de itens / seed `perguntas_redacao` 13 rows), e a política de revisão humana. Ver também `CULTURA-BEAUTY-SMILE-INPUT.md` (detalhamento dos 4 valores) e `fit-cultural-banco-itens-v1.md`.
- As 4 dimensões BARS = os **4 valores oficiais Beauty Smile** (Experiência UAU, Inovação, Atitude de Dono, Sede de Crescimento), com **Ética como princípio fundante acima dos 4** (red flags éticos → cap/vermelho + revisão humana obrigatória mesmo com afinidade alta).
- Apenas gaps genuínos do PRD são levantados ao usuário durante o planning; o resto é implementação direta do PRD.

### EF architecture
- **EF NOVA dedicada** para a redação fit-cultural (ex.: `avaliar-redacao-cultural` / nome a definir no planning) que retorna `EssayScoringV1` e persiste `redacoes_candidato`. Separação de responsabilidade limpa.
- O EF `avaliar-redacao` EXISTENTE permanece intocado servindo o SJT open-case (`tipo='sjt', subtipo='caso_aberto'`) da Phase 11 — NÃO sobrecarregar/branch-ar essa função; nenhum risco ao path SJT live (deployed v5).
- A nova EF reusa a infra de IA Phase 9: `_shared/ai-client.ts` (callAi), prompt-loader (call_type `culture_fit_essay` — já existe no enum `llm_call_type`, prompt-row `culture_fit_essay` já em `prompt_versions` is_active=false → ativar), audit-logger, pii-masker. **Aplicar a cadeia [[reference_ef_npm_join_import_bug]]:** imports `npm:` ESTÁTICOS, helpers `zodOutputFormat`/`zodResponseFormat` injetados, schema em `npm:zod@3.25.76/v4`, JWT-on, authorize-then-act (role+posse após getUser).

### Red classification → progressão
- Vermelho (e os 3 caps) → **`bloqueio_avanco = true`**: o candidato NÃO progride além desta etapa até um revisor humano decidir. **Nunca auto-rejeita** (RNF-07a) — o humano sempre decide; bloqueio_avanco apenas segura o avanço automático.
- Toda redação avaliada entra em `pendente_humano` independentemente da cor (revisão humana SEMPRE obrigatória, não só no vermelho).

### Human-review UX & policy
- Fila RH **1-redação-por-vez** com **sidebar por cor**, ordenada por **severidade (vermelho → amarelo → verde)**.
- Override via **sliders** por dimensão BARS (recalcula composto/cor ao ajustar).
- `notas_revisor` **≥50 chars obrigatório em TODA decisão** (não só override/reprovado) + `decisao_revisor` ∈ {aprovado, reprovado, duvida}.
- `decisao_revisor = 'duvida'` **escala ao gestor** (não finaliza).

### Claude's Discretion
- Nome exato da nova EF, layout dos componentes, nomes de colunas/índices, estrutura do autosave (reusar padrão Phase 11 `useAutosaveAvaliacao` 30s local + 30s DB), e detalhes de RLS — tudo à discrição do planner desde que honre o PRD v1.1 + as decisões acima.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Feature `src/features/avaliacao/`** (Phase 11/12): `AvaliacaoContainer` (glass shell, cards por teste, neutro RNF-07a), autosave (`useAutosaveAvaliacao` 30s local + 30s DB + back-lock), `respostaAvaliacaoSchema`, `avaliacaoService` (allowlist reads, no `select('*')`), `scoresRhService`. A redação é mais um "teste" no container.
- **AI infra Phase 9** (`supabase/functions/_shared/`): `ai-client.ts` (callAi, Anthropic-first + OpenAI fallback + circuit breaker + cost log), `prompt-loader.ts` (DB-only active+canary), `audit-logger.ts` (mask-then-INSERT, LGPD-02), `pii-masker.ts`, `injection-detector.ts`. `prompt_versions` tem `culture_fit_essay` v1.0.0 (is_active=**false** — ativar para Phase 13).
- **Padrão EF correto** (PROD-green ref): `analise-candidato-individual` / `comparativo-candidatos` (static `npm:` imports + helpers + zod/v4). A NOVA EF deve copiar esse padrão, NÃO o `.join`.
- **Scorecard RH** (`ScorecardAvaliacao`, Phase 11): per-dimensão + 'Requer revisão humana' em `pendente_humano` — a redação adiciona um painel/aba.

### Established Patterns
- Migrations PL/pgSQL aplicadas em PROD via **Supabase MCP `apply_migration`** (grava version row, contorna 42601) ou `supabase db push --linked` (no-BEGIN/COMMIT-wrapper). EFs deploy via **CLI `supabase functions deploy`** (auto-bundla `_shared`).
- RLS: answer-key/gabarito protegido (sem candidato SELECT); leituras own-row via allowlist explícita; EF privilegiada = two-client (anon getUser + service_role).
- Wave-0 RED tests (smoke-runtime gate) antes da implementação; commits via `git -c core.hooksPath=/dev/null`.

### Integration Points
- Nova tabela `perguntas_redacao` (seed 13 rows, do PRD/banco-itens) + `redacoes_candidato` (essay + EssayScoringV1 jsonb + status pendente_humano + bloqueio_avanco + campos de revisão).
- Rota candidato: tela de redação dentro do bloco de avaliação assíncrona (Phase 11 `AvaliacaoContainer`).
- Rota RH: fila de revisão humana (RH-guarded), liga ao kanban/triagem.
- `vagas.testes_aplicaveis` (Phase 7) decide se a vaga aplica redação.
</code_context>

<specifics>
## Specific Ideas

- PRD v1.1 `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md` é a fonte da verdade (64KB) — BARS 4D pesos iguais V1, 3 caps especiais, sistema 3 cores, few-shot inline, revisão humana sempre obrigatória.
- Ética como princípio fundante acima dos 4 valores: red flags éticos têm prioridade sobre afinidade (cap → vermelho → revisão humana obrigatória).
- Banco de itens / prompts de redação: `fit-cultural-banco-itens-v1.md` + cultura em `CULTURA-BEAUTY-SMILE-INPUT.md`.
</specifics>

<deferred>
## Deferred Ideas

- Email da devolutiva de redação / notificações n8n além do in-app — fora do escopo (foco é avaliação + revisão).
- A11y/WCAG hardening da UI de redação → Phase 16.
- Reconciliação do naming `avaliar-redacao` (que serve SJT) vs a nova EF de essay — apenas documentar; não renomear a EF SJT live nesta phase.
</deferred>
