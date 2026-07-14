---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Operação do Funil RH
status: planning
last_updated: "2026-07-14T22:40:00.000Z"
last_activity: 2026-07-14
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-14 — M6/v6.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 31 — Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo (funil-02)

## Current Position

Phase: Not started (roadmap criado)
Plan: —
Status: Roadmap M6 criado; aguardando `/gsd-plan-phase 31`
Last activity: 2026-07-14 — Roadmap v6.0 criado (5 fases 31–35, 19/19 requirements mapeados)

## Roadmap (M6 — Phases 31–35)

Ordem de execução: 31 → 32 → 33 → 34 → 35.

| Phase | Goal | Requirements |
|-------|------|--------------|
| 31 — Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo (funil-02) | RH move cada candidatura por qualquer das 6 etapas (avançar/rejeitar/retroceder) + rejeita do comparativo, tudo pelo write-path auditável único (trigger `avancar_etapa()`); justificativa ≥50 server-enforced; RNF-07a. Puro reuso — trigger NÃO editado, nenhum INSERT direto em `historico_candidatura` | OPER-01, OPER-02, OPER-03, OPER-04 |
| 32 — Fechar os Dois Vazamentos Vivos (BLOCKING, server-only) | EF `get-curriculo-url` authenticate-THEN-authorize (policy role-only do bucket `curriculos` removida) + RPC `funil_kpis` DEFINER vaga-scoped + `rh_le_historico` endurecido WR-04; provado por smoke comportamental (JWT impersonado). Zero UI — gatilho da Phase 34 | SEG-01, SEG-02 |
| 33 — Camada de Dados do Agendamento de Entrevista | Tabela nova `agendamentos_entrevista` + RLS bidirecional (RH vaga-scoped WR-04 via join `candidaturas→vagas`, candidato own-row allowlist SEM `observacoes_rh`); smokes cross-recrutador/cross-candidato antes de qualquer UI | AGEND-01, SEG-03 |
| 34 — Superfícies do RH — CV/IA, Agendamento, Fila + KPIs | Telas do RH contra primitivos já seguros: CV via EF + análise IA completa + feed de histórico read-only; form de agendar/reagendar/cancelar + `compareceu`; fila de trabalho cross-vaga + badge SLA + dashboard de KPIs (recharts) substituindo a agregação M1 morta | VISRH-01, VISRH-02, VISRH-03, KPI-01, KPI-02, KPI-03, KPI-04, AGEND-02, AGEND-03 |
| 35 — Painel do Candidato — Leitura do Agendamento | Card do agendamento own-row (`America/Sao_Paulo`) na superfície "Próximo passo" (com `rotaCandidato` para etapas `entrevista_*` no `funilNavMap`) + download `.ics` client-side + badge de lembrete ≤24h; painel é o canal único (sem e-mail) | AGEND-04, AGEND-05 |

Coverage: 19/19 requirements mapeados ✓ · 0 unmapped. **Phase 32 é BLOCKING** — fecha os 2 leaks horizontais vivos (CV role-only + `rh_le_historico` role-only) antes de a Phase 34 renderizar qualquer UI que os leia. Fases candidatas a `/gsd-secure-phase`: **32** (núcleo dos read-primitives seguros) e **33** (RLS bidirecional do agendamento). UI hint: Phases 31, 34, 35.

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / ~40 plans — shipped 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — shipped 2026-06-26. · Phase 17 standalone: 5 plans — shipped 2026-06-28. · M3 (v3.0): 4 fases / 16 plans — shipped 2026-06-30. · M4 (v4.0): 6 fases / 43 plans — shipped 2026-07-13. · M5 (v5.0): 3 fases / 19 plans — shipped 2026-07-14.
- Ledger detalhado por plano arquivado em `milestones/v*.0-*` e nos SUMMARY de cada fase.

**By Phase (M6):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 31 | TBD | - | - |
| 32 | TBD | - | - |
| 33 | TBD | - | - |
| 34 | TBD | - | - |
| 35 | TBD | - | - |

*Updated after each plan completion.*

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. As que ancoram o M6 (reuse-and-tighten, security-first):

- [M2/Phase 6]: `historico_candidatura` + o trigger `avancar_etapa()` BEFORE-UPDATE são o backbone do funil; o trigger é o **único escritor** da trilha (`ator=auth.uid()`, GUC-gated `auto_rejeitado`) — base direta de OPER-01/02/03/04. **NÃO editar o trigger** (near-miss P27 quase dropou o guard ENTREV-03; diff `pg_get_functiondef` antes de qualquer `CREATE OR REPLACE`).
- [M2/Phase 8]: bug histórico do double-write (`INSERT historico_candidatura` explícito + trigger → 2 rows, corrompe KPIs). Invariante M6: **nenhum código faz INSERT direto** em `historico_candidatura`; toda transição é `UPDATE candidaturas.etapa_atual` (+ `etapa_justificativa`).
- [M4/Phase 24 · WR-04]: predicado RLS vaga-scoped (admin bypass OR `vaga_id IN (SELECT id FROM vagas WHERE created_by=auth.uid())`; join via `candidaturas` quando não há `vaga_id` direto) — base de SEG-02 (`rh_le_historico`) e da RLS bidirecional do `agendamentos_entrevista` (SEG-03). A P24 **deferiu** o re-scope de `rh_le_historico` (nunca varrido) → o leak que a Phase 32 fecha.
- [M4/Phase 24 · smokes comportamentais]: JWT impersonado (`set_config` + `SET ROLE authenticated`) como gate de verificação, acima de `pg_policies`/greps estruturais — os smokes pegaram REVOKE no-op + policy OR-defeat que checagens estruturais passaram. Gate obrigatório de SEG-01/02/03.
- [M2/Phase 10]: EFs privilegiadas = two-client + **autorizar DEPOIS de autenticar** (`getUser()` → checar papel em `usuarios_rh` + posse da vaga) — base direta da EF `get-curriculo-url` (SEG-01/VISRH-01). Ver [[reference_ef_authenticate_vs_authorize]].
- [M2/Phases 8/11 · M4/Phase 24]: RLS é row-level, **não** column-level; `select('*')` vaza — leituras candidato-facing por allowlist explícita. Base de SEG-03 (candidato nunca lê `observacoes_rh`) e VISRH-03. Ver [[reference_select_star_leaks_pii]].
- [M2/Phases 6–15 · M4]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row sozinho; no-BEGIN/COMMIT-wrapper) — caminho para as migrations da Phase 32/33.
- [Projeto/invariante]: service_role NUNCA no client — a EF `get-curriculo-url` é o único caminho privilegiado ao CV (guard de bundle grep). Bucket `curriculos` = leak role-only vivo a fechar (a policy role-only é **removida**, não só complementada).
- [Stack/M6]: **zero dependências npm novas** — recharts (via `@/components/ui/chart`), date-fns + `Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo'})` (idioma já em `EntrevistaDashboard.tsx`), shadcn Calendar + `<input type="time">`, `cvUploadService.getSignedUrl` — tudo já instalado/usado.

### Pending Todos

Herdados/deferidos, fora do escopo do M6 (rastreados p/ M7/backlog):

- **Carregados do M5:** live HUMAN-UATs P28/29/30 (SMTP/senha/avatar/concorrência/AA), 2 cosméticos UI aceitos (turquoise dilution, focus-ring), IN-01 avatar extension-orphan, secure-phase retroativo opcional (P28/29/30).
- **Carregados do M4:** DBMIG-01 baseline+rebuild (environment-gated — Docker/CLI-auth), SEC-03 Vault secret `n8n_webhook_base` (human-action), CC0-01 seed cognitivo, confirmatory HUMAN-UATs P22/23/24. Ver `.planning/todos/`.
- **Deferidos deste ciclo (M6 v1.x / M7+):** retrocesso auditado adicional, `.ics`/lembrete-24h já em v1 (P35), COMM (notificação por e-mail), TALENT (banco de talentos), LGPD-OPS (retenção/Art. 20 queue), PSICO, relatórios completos + export CSV/PDF, source-of-hire por-vaga.

### Blockers/Concerns

- None. Roadmap M6 criado; aguardando `/gsd-plan-phase 31`.
- **Security-first é a ordem** — a Phase 32 (BLOCKING) fecha os 2 leaks horizontais vivos (CV role-only no bucket + `rh_le_historico` role-only diferido na P24) **antes** de a Phase 34 renderizar qualquer UI que os leia; senão o milestone embarca um IDOR/PII no dia 1.
- **Não editar o trigger `avancar_etapa()`** — carrega o guard ENTREV-03 + o predicado GUC `auto_rejeitado`; a Phase 31 enforce justificativa na camada RPC/serviço, não no trigger (near-miss P27).
- **Contas de teste PROD:** `e2e.admin@beautysmile.com.br` (administrador) + a 1ª conta `recrutador` criada no M5 (exercita o caminho vaga-scoped cross-recrutador dos smokes SEG-01/02/03).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature (M6 v1.x) | Retrocesso auditado extra · flag "manter no banco" na rejeição | Deferred → M6-v1.x/backlog | M6 kickoff |
| Feature | COMM (notificação e-mail) · TALENT (banco de talentos) · LGPD-OPS (retenção/Art. 20) · PSICO · relatórios completos + export | Deferred → M7+ | M6 kickoff |
| Tech-debt | DBMIG-01 baseline+rebuild (environment-gated) · SEC-03 Vault secret · CC0-01 seed cognitivo | Deferred → M7/backlog | M4/M5 close |
| Tech-debt | live HUMAN-UATs P28/29/30 · IN-01 avatar orphan · UI cosmetics · secure-phase retroativo P28/29/30 | Deferred → backlog | M5 close |

## Session Continuity

Last session: 2026-07-14T22:40:00.000Z
Stopped at: roadmap M6 criado (5 fases 31–35, 19/19 mapeados)
Resume file: None

## Operator Next Steps

- Roadmap M6 criado e aprovado. Próximo: `/gsd-plan-phase 31` (Avançar/Rejeitar em Todo o Funil — puro reuso do trigger, HIGH confidence, skip research-phase).
- Ordem de execução: 31 → 32 → 33 → 34 → 35. **Phase 32 é BLOCKING** para a Phase 34.
- Research flags (pesquisa mais profunda no planejamento): **Phase 33** (agendamento — divergência no-email sem precedente de mercado; reschedule/cancel semantics; schema `agendamentos_entrevista`) e **Phase 34** (work-queue UX + 1ª RPC DEFINER com window-functions `LEAD`/`LAG` neste codebase; decisão de coorte K4). Phases 31/32/35 são HIGH confidence (precedente aplicado — skip research-phase).
