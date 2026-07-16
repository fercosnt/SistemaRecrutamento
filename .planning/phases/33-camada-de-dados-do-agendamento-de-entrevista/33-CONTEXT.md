# Phase 33: Camada de Dados do Agendamento de Entrevista - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas, all accepted as recommended

<domain>
## Phase Boundary

Entrega a **camada de dados** do agendamento de entrevista — a tabela nova
`public.agendamentos_entrevista` com RLS **bidirecional** provada por smoke
comportamental (JWT impersonado), **antes** de qualquer UI (form RH na Phase 34,
card do candidato na Phase 35).

**In scope (AGEND-01 + SEG-03):**
- `CREATE TABLE public.agendamentos_entrevista` (schema autoritativo reconciliando
  ARCHITECTURE.md + FEATURES.md — REQUIREMENTS.md linha 57).
- RLS RH **vaga-scoped** (WR-04) para SELECT + INSERT + UPDATE + DELETE.
- Leitura do candidato via **RPC SECURITY DEFINER** com allowlist explícita que
  **exclui `observacoes_rh`** — candidato **sem** policy SELECT direta na tabela
  (isolamento de coluna por construção).
- Smokes SEG-03: cross-recrutador + cross-candidato + exclusão de `observacoes_rh`
  da projeção do candidato — todos JWT-impersonado, gate acima de `pg_policies`.
- Apply em PROD via Supabase MCP `apply_migration`; regen `database.types.ts` (raiz);
  reconciliar `supabase_migrations.schema_migrations`.

**Out of scope (fases seguintes / milestones futuros):**
- Qualquer componente React / superfície (form de agendar/reagendar/cancelar → P34;
  card do candidato + `.ics` + badge ≤24h → P35).
- `funil_kpis` já existe (P32) — KPI-04 no-show apenas *consumirá* `compareceu` na P34.
- Notificação por e-mail / convite `.ics`-por-e-mail (COMM → M7+).
- Confirmação/recusa do candidato (candidato é read-only nesta camada).

</domain>

<decisions>
## Implementation Decisions

### Area 1 — Schema Shape & Enums (accepted as recommended)
- **Reutilizar os enums já existentes** no DB (pré-declarados, sem uso): `status_entrevista`
  (`agendada, em_andamento, concluida, cancelada, reagendada, nao_compareceu`) e
  `tipo_entrevista_avaliacao` (`online, presencial`). NÃO criar enums novos.
- **Column set autoritativo** (união reconciliada ARCHITECTURE + FEATURES):
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `candidatura_id uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE`
  - `vaga_id uuid NOT NULL REFERENCES public.vagas(id)` — denormalizado (imutável, setado
    do candidatura no insert) p/ simplificar a RLS WR-04 e habilitar KPI no-show por vaga;
    WITH CHECK garante posse. *(O planner pode optar pelo join-through-candidaturas
    idêntico ao `rh_le_historico` se preferir evitar denormalização — ambos seguros.)*
  - `tipo tipo_entrevista_avaliacao NOT NULL`
  - `data_hora timestamptz NOT NULL`
  - `local_ou_link text` — **coluna única**; semântica inferida por `tipo` (link se online,
    endereço se presencial)
  - `status status_entrevista NOT NULL DEFAULT 'agendada'`
  - `observacoes_rh text` — **RH-internal**, NUNCA na projeção do candidato (SEG-03)
  - `entrevistador text`
  - `compareceu boolean` — **nullable** (null = pendente); campo distinto do `status`
    (feeds KPI-04 no-show na P34/AGEND-03)
  - `agendado_por uuid` (autor — AGEND-01)
  - `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()`,
    `updated_by uuid`, `deleted_at timestamptz`
  - índice `idx_agendamentos_candidatura (candidatura_id)` + `idx_agendamentos_vaga (vaga_id)`
- **Comparecimento**: `compareceu boolean` como campo próprio (não derivado de `status`).
- **Local/link**: coluna única `local_ou_link text` (não duas colunas).

### Area 2 — RLS & SEG-03 Column Boundary (accepted as recommended)
- **RH access**: predicado **vaga-scoped WR-04** em SELECT + INSERT + UPDATE + DELETE.
  Role lido do claim JWT `(select auth.jwt() #>> '{app_metadata,role}')` ∈ (`rh`,`administrador`),
  **não** de `usuarios_rh`. Admin bypass OR `rh AND` posse da vaga. Predicado copiado
  verbatim de `rh_le_historico` / `redacao_rh_select` (`(select auth.uid())` idiom preservado).
  WITH CHECK espelha o USING nos writes.
- **Candidate read**: **RPC SECURITY DEFINER** `get_meu_agendamento` (clonar o esqueleto de
  `get_minha_redacao`, migration `20260706110003`) projetando allowlist SOMENTE
  (`id, candidatura_id, tipo, data_hora, local_ou_link, status, compareceu` — **sem**
  `observacoes_rh`, `entrevistador`, `agendado_por`, `updated_by`), com posse enforçada
  INTERNAMENTE via join `→ candidaturas → candidatos WHERE ca.user_id = (select auth.uid())`.
  `search_path=''`, `REVOKE ALL … FROM PUBLIC`, `GRANT EXECUTE … TO authenticated`.
  Candidato **NÃO tem policy SELECT direta** na tabela → `observacoes_rh` inalcançável por
  construção (não é segredo-de-coluna por RLS, que é row-level).
- **RH write path**: writes **diretos gated-por-RLS** (`.insert/.update/.delete` com USING +
  WITH CHECK vaga-scoped) — sem RPC (não há server-min tipo justificativa≥50 da P31).
- **Candidate writes**: **nenhum** — sem policy INSERT/UPDATE/DELETE p/ candidato.

### Area 3 — Lifecycle Semantics & Apply/Smoke (accepted as recommended)
- **Reagendar**: **update na mesma linha** (novo `data_hora`, `status='reagendada'`); auditoria
  via `updated_at`/`updated_by`. Linha única evoluindo (sem tabela de histórico).
- **Cancelar**: **`status='cancelada'`** (soft; linha mantida p/ KPI + visibilidade do candidato).
  NÃO hard-delete.
- **Uniqueness**: **sem constraint unique hard na v1** — a P34 lê o agendamento ativo mais
  recente por candidatura; reagendar faz update in-place (YAGNI). *(Planner pode adicionar
  partial unique `(candidatura_id) WHERE status <> 'cancelada' AND deleted_at IS NULL` se
  quiser garantir 1-ativo; não-bloqueante.)*
- **Apply + smoke gate**: autorar migration (1 arquivo, sem BEGIN/COMMIT — D-22) → **aplicar em
  PROD via Supabase MCP `apply_migration`** → regen `database.types.ts` (raiz) → reconciliar
  `supabase_migrations.schema_migrations` → rodar smokes JWT-impersonado (cross-recrutador +
  cross-candidato + exclusão `observacoes_rh`) via `execute_sql` como **gate SEG-03**.
  Autorização de PROD-apply autônomo é standing (M4/M5/P31/P32 landed live via MCP).

### Claude's Discretion
- Forma exata do predicado WR-04 (denormalized `vaga_id IN (…)` vs join-through-candidaturas)
  — ambos seguros; escolher o mais consistente com o restante da migration.
- Nomes finais de policies/índices/RPC; se adicionar o partial-unique de 1-ativo.
- Estrutura do fixture de smoke (recrutadores sintéticos — `vagas.created_by` sem FK — +
  candidato real FK-bound, precedente P32).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Enums já no DB** (pré-declarados, 0 uso): `status_entrevista`, `tipo_entrevista_avaliacao` —
  reusar direto (confirmado via `pg_enum` live).
- **WR-04 predicate verbatim**: `supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql:137-147`
  (`rh_le_historico`) e `20260706110004_sec05_08_vaga_scope.sql:94-104` (`redacao_rh_select`);
  forma direta-vaga_id em `20260706110004:85-86`.
- **Candidate allowlist DEFINER RPC template**: `get_minha_redacao` em
  `20260706110003_sec02_redacao_verdict.sql:52-88` (drop candidate SELECT policy + DEFINER RPC
  allowlist + ownership join `→candidaturas→candidatos WHERE user_id=auth.uid()` +
  REVOKE PUBLIC/GRANT authenticated).
- **Candidate own-row SELECT policy idiom** (p/ referência do ownership join):
  `candidato_le_propria_candidatura` / `candidato_le_proprio_historico` em
  `20260607000006_rls_policies_m2_backbone.sql:38-70`.
- **CREATE TABLE + RLS template completo**: `20260624000001_entrevista_cognitivo_tables.sql`
  (uuid PK, FK ON DELETE CASCADE, índices, `ENABLE ROW LEVEL SECURITY`, `DROP POLICY IF EXISTS`
  antes de cada CREATE, `COMMENT ON TABLE`, tabelas write-por-DEFINER sem policy INSERT/UPDATE).

### Established Patterns
- Migrations PROD via Supabase MCP `apply_migration` (bypassa 42601; grava version-row por
  timestamp; **sem** BEGIN/COMMIT wrapper — D-22).
- RLS role sempre do claim `(select auth.jwt() #>> '{app_metadata,role}')`; `(select auth.uid())`
  subquery-wrapped (idiom de planner-cache, preservar verbatim).
- `REVOKE ALL ON FUNCTION … FROM PUBLIC; GRANT EXECUTE … TO authenticated;` p/ toda RPC.
- RLS é row-level, NÃO column-level ("cannot hide columns" — `20260624000001:33-34`); coluna
  privilegiada candidato-facing → deny base-table + DEFINER RPC allowlist (não `select('*')`).
- Smokes comportamentais (P24 precedent): `set_config('request.jwt.claims', …)` + `SET ROLE
  authenticated`; assert direto em row-count, acima de `pg_policies`.

### Integration Points
- `candidaturas.vaga_id` (NOT NULL FK → `vagas.id`) e `candidaturas.candidato_id` (FK →
  `candidatos.id`); `candidatos.user_id` → `auth.users`; `vagas.created_by` = auth uid do
  recrutador (base de todo WR-04).
- `etapa_processo` enum inclui `entrevista_online` + `entrevista_presencial` — as etapas onde
  o agendamento é relevante (P34/P35 podem gatear a UI por essas etapas via `funilNavMap`).
- `database.types.ts` na **raiz** do repo (não em `src/`) — regen após a migration.
- Existe `vagas.entrevista_agendada_em` (datetime manual por-vaga, `20260624000001`) — legado
  per-vaga, NÃO conflita com a nova tabela per-candidatura; ignorar.

</code_context>

<specifics>
## Specific Ideas

- REQUIREMENTS.md linha 57 é a decisão âncora do schema: reconciliar `observacoes_rh`/`status`/
  `agendado_por` (ARCHITECTURE) + `entrevistador`/`compareceu` (FEATURES) numa definição única
  autoritativa. Todas as 5 colunas entram (ver Area 1).
- SEG-03 exige que o smoke prove **explicitamente** a exclusão de `observacoes_rh` da projeção
  do candidato — a asserção load-bearing da fase.
- Precedente de fixture de smoke (P32): recrutadores **sintéticos** (`vagas.created_by` não tem
  FK → inserção livre) + candidato **real** FK-bound, p/ asserções vaga-scope determinísticas.

</specifics>

<deferred>
## Deferred Ideas

- Partial-unique "1 agendamento ativo por candidatura" — opcional na v1, planner decide (não-bloqueante).
- Confirmação/recusa do candidato ao agendamento — read-only nesta camada; futuro (COMM/M7+).
- Tabela de histórico de reagendamentos — v1 evolui a linha in-place; histórico completo diferido.
- Convite/`.ics` por e-mail + lembrete por e-mail — COMM (M7+); a P35 faz `.ics` download
  client-side + badge ≤24h no painel (sem e-mail).

</deferred>
