# Phase 15: Decisão Final Auditável & LGPD Art. 20 - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 grey areas, all recommended answers accepted

<domain>
## Phase Boundary

O RH decide com visão consolidada de todos os scorecards (agregação, NUNCA re-pontuação) e
justificativa textual obrigatória, e o candidato rejeitado pode exercer seu direito LGPD
Art. 20 (explicação + revisão por pessoa natural) — com bias audit como trilha de defesa.

Cobre: DECISAO-01 (EF `consolidar-decisao-final`), DECISAO-02 (UI consolidada + Comparativo
reuse), DECISAO-03 (decisão justificada ≥50 chars + guardrail), DECISAO-04 (explicação
candidato LGPD Art. 20), LGPD-02 (zero auto-rejeição — guardrail estrutural já existe),
LGPD-03 (bias audit — AGE-based V1).

FORA de escopo: WCAG AA cross-screen (Phase 16, LGPD-05); coleta de raça/gênero (não coletados
por design — LGPD-01); carta de devolução por IA (backlog §3.2).
</domain>

<decisions>
## Implementation Decisions

### Área 1 — Dashboard de decisão consolidada (DECISAO-01/02)
- Score consolidado = agregado PONDERADO dos scores por etapa usando `vaga.pesos_avaliacao` (Phase 7). A EF `consolidar-decisao-final` AGREGA, NUNCA re-pontua (lê `scores_candidato` já gravados).
- Etapas faltantes (ex.: cognitivo não aplicado / não respondido): mostrar breakdown parcial, ponderar só as etapas concluídas, marcar faltantes como N/A — NUNCA bloquear a decisão.
- Recomendação textual = DETERMINÍSTICA/templated a partir do breakdown (sem nova chamada LLM); é advisory — o RH decide (RNF-07a).
- Comparação lado-a-lado = REUSAR o Comparativo da Etapa 2 (`src/features/triagem` — ComparativoScreen/useComparativo/comparativo-candidatos EF), escopado aos finalistas em `decisao_final`.

### Área 2 — Captura da decisão final (DECISAO-03 / LGPD-02)
- enum `decisao`: `aprovado` / `rejeitado` / `em_espera` (confirmar nome do enum type live; já criado na Phase 6 com o guardrail).
- Justificativa obrigatória ≥50 caracteres — validada no client E via DB CHECK constraint.
- Decidir FECHA o funil: grava `decisao_final` E dispara a transição terminal via `avancar_etapa` (com justificativa; `por_usuario NOT NULL` já é guardrail estrutural — LGPD-02).
- Uma decisão por candidatura; emenda = nova linha auditável (trilha append-only), NUNCA edição silenciosa.

### Área 3 — Explicação ao candidato LGPD Art. 20 (DECISAO-04)
- O candidato rejeitado vê uma explicação RESPEITOSA e não-clínica (motivo derivado da justificativa) + resultado de alto nível — NUNCA scores/banda brutos (RNF-07a/LGPD-04).
- "Solicitar revisão por pessoa natural" → seta `decisao_final.revisao_solicitada_em` (COLUNA JÁ EXISTENTE — NÃO criar tabela nova) + notifica o RH responsável (`vaga.created_by`) via webhook N8N existente. `explicacao_solicitada_em` marca quando o candidato acessou a explicação. `revisao_resultado` (text) registra o desfecho da revisão humana.
- Acesso a `/candidato/explicacao/:id`: `RoleGuard role="candidato"` + RLS own-candidatura; só após existir uma `decisao_final` com `decisao='rejeitado'`.
- Detalhe de score exposto: MÍNIMO (resultado + motivo textual); sem gabarito/psicometria.

### Área 4 — Bias audit (LGPD-03)
- V1 = selection-rate por FAIXA ETÁRIA com a regra 4/5 EEOC (adverse-impact ratio vs a faixa de maior taxa). Idade derivada de `data_nascimento` (único atributo demográfico coletado).
- Raça/gênero: DEFERIDOS / fora de escopo V1 — NÃO são coletados (LGPD-01 minimização). Documentar explicitamente a limitação no artefato + no dashboard de auditoria.
- Snapshot = RPC/EF disparada manualmente (admin) gravando uma linha em `bias_audit_log` (`periodo` + `dados` jsonb) + export CSV admin-only. Cron agendado DEFERIDO.
- Cálculo 4/5: razão de selection-rate por faixa etária contra a faixa de maior taxa (flag quando < 0.8).

### Claude's Discretion
- Nome exato do enum `decisao` + estrutura precisa do `dados` jsonb do bias audit + layout do dashboard consolidado — à discrição, guiado pelos padrões existentes (Phase 6 enum, Phase 10 comparativo, Phase 14 scorecard).
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Comparativo Etapa 2** (`src/features/triagem/`): `ComparativoScreen.tsx`, `useComparativo.ts`, `exportComparativo.ts` (PDF), `comparativo-candidatos` EF, `SugestaoIABadge.tsx` — reusar para o side-by-side de finalistas (DECISAO-02).
- **`scores_candidato`** (genérico, `tipo_score` enum forward-declara todos os tipos P11-15): a EF de consolidação lê daqui — NUNCA re-pontua.
- **`vaga.pesos_avaliacao`** (jsonb, Phase 7): pesos por etapa para o agregado ponderado.
- **`avancar_etapa()`** trigger (Phase 6): bloqueio de regressão + audit same-txn; a decisão terminal passa por aqui com justificativa.

### Existing DB schema (LIVE — verified 2026-06-25)
- **`decisao_final`**: `id, candidatura_id, decisao(enum), justificativa(text), por_usuario(uuid NOT NULL guardrail), em(timestamptz), explicacao_solicitada_em(timestamptz), revisao_solicitada_em(timestamptz), revisao_resultado(text)`. The LGPD Art. 20 fields ALREADY EXIST — DECISAO-04 sets `revisao_solicitada_em` / `explicacao_solicitada_em` / `revisao_resultado`, NOT a new table.
- **`bias_audit_log`**: `id, snapshot_em(timestamptz), periodo(text), dados(jsonb), criado_em(timestamptz)` — schema-only since Phase 6; LGPD-03 writes rows here.
- **`revisao_solicitada` table does NOT exist** — confirmed; use `decisao_final.revisao_solicitada_em`.

### Established Patterns
- EF idiom: authenticate (getUser) + authorize (role from `usuarios_rh` + `vaga.created_by` ownership) — authenticate ≠ authorize ([[reference_ef_authenticate_vs_authorize]]); static `npm:` imports (no `.join` bug); `.strict()` Zod bodies.
- Migrations via Supabase MCP `apply_migration` (no BEGIN/COMMIT wrapper; bypasses 42601). Commits via `git -c core.hooksPath=/dev/null`.
- Candidate-facing reads use explicit allowlists, NEVER `select('*')` ([[reference_select_star_leaks_pii]]); RLS row-level only.
- AI/score NEVER auto-rejects (RNF-07a); `por_usuario NOT NULL` is the structural guardrail (LGPD-02).

### Integration Points
- New routes: RH consolidated decision view (under `/rh/...`), candidate `/candidato/explicacao/:id`.
- New EF: `consolidar-decisao-final` (JWT-on, RH-authorize).
- Notification: reuse the existing N8N webhook for the "revisão por pessoa natural" RH notification.
</code_context>

<specifics>
## Specific Ideas

- Reuse the Etapa-2 Comparativo verbatim for finalist side-by-side (DECISAO-02) rather than building a new comparison view.
- The bias audit V1 is AGE-only by necessity (race/gender not collected) — surface this limitation honestly in the UI + artifact, not silently.
- LGPD Art. 20 explanation must be respectful and non-clinical; it is a transparency surface, not a score dump.
</specifics>

<deferred>
## Deferred Ideas

- Race/gender bias dimensions (would require collecting protected attributes — against LGPD-01 minimization; out of scope unless product decides to collect with consent).
- Scheduled (cron) monthly bias snapshot — V1 is admin-triggered manual.
- AI-generated personalized rejection letter (backlog §3.2).
- WCAG AA hardening of these new screens → Phase 16 (LGPD-05).
</deferred>
