# Phase 31: Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo (funil-02) — Research

**Researched:** 2026-07-14
**Domain:** Postgres SECURITY DEFINER RPC authoring + Supabase migration apply + React/TanStack service-hook-dialog wiring (RH funnel operation)
**Confidence:** HIGH — every recommended pattern is verified in-codebase against a live analog (registrar_decisao, reprocessar_analise, the avancar_etapa trigger, the sec02/funil12 smokes). Zero new npm packages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Enforcement da rejeição + motivo estruturado (OPER-02/04)**
- **Mecanismo:** nova RPC `rejeitar_candidatura` `SECURITY DEFINER` que faz `RAISE` em justificativa curta e executa o `UPDATE candidaturas.etapa_atual='rejeitado'` (+ `status='rejeitado'`, satisfazendo `guard_rejeicao_auditada()`). **NÃO edita o trigger `avancar_etapa()`** — o trigger permite terminal `rejeitado` de qualquer etapa sem exigir justificativa, então a exigência ≥50 + motivo estruturado vive na camada RPC.
- **Motivo estruturado:** novo tipo enum Postgres `motivo_rejeicao_rh` usado como **parâmetro** da RPC (validação no boundary do Postgres — valor inválido → erro); o valor é gravado como `::text` na coluna `candidaturas.motivo_rejeicao` (hoje `text`, já contém `'knockout_automatico'`). **Sem** ALTER de tipo da coluna.
- **Opções do enum (pt-BR):** `perfil_desalinhado`, `reprovado_avaliacao`, `reprovado_entrevista`, `nao_compareceu`, `desistencia`, `outro`.
- **Regra do ≥50:** `btrim()` na justificativa e exigir `char_length >= 50` com `RAISE` de mensagem pt-BR (server-authoritative, não só validação de form — OPER-02). `outro` também exige a justificativa ≥50.

**Avançar & retroceder (OPER-01/03)**
- **Avançar:** reusar o `UPDATE candidaturas.etapa_atual` existente (`triagemService.updateCandidaturaEtapa` / `useUpdateCandidaturaEtapa`), estendido para funcionar a partir de qualquer uma das 6 etapas. O trigger escreve a trilha de auditoria.
- **Retroceder:** reusar o mesmo `UPDATE etapa_atual` — o trigger `avancar_etapa()` **já** faz `RAISE 'Regressão de etapa exige justificativa preenchida'` quando `etapa_justificativa` é vazia. O form torna a justificativa obrigatória; nenhuma RPC nova para regressão.
- **Alvo do retrocesso:** dropdown de qualquer etapa anterior não-terminal (por ordinal do enum).
- **Piso da justificativa de retrocesso:** não-vazia (padrão do trigger). O piso ≥50 é reservado à rejeição.

**Superfícies de UI + limpeza de legado (OPER-01/04)**
- **Superfícies das ações:** menu do card no `KanbanBoard.tsx` + tela de perfil do candidato (`PerfilCandidatoRHPage`) + `ComparativoScreen.tsx` — as três compartilham um único diálogo de rejeição.
- **Componente compartilhado:** um `RejeitarCandidaturaDialog` (`<select>` do enum de motivo + `<textarea>` + contador de caracteres ao vivo com o piso 50) reusado nas 3 superfícies. Segue o padrão de erro `TriagemServiceError`/`DecisaoServiceError` + mutation TanStack com invalidação por `candidaturasKeys`/`vagasKeys`/`triagemKeys`.
- **Dropar RPCs legadas mortas:** na mesma migração da fase, `DROP FUNCTION` dos overloads M1-era `avancar_etapa(uuid,uuid)` e `rejeitar_candidato(uuid,text,uuid)` — ambos têm **zero callers** no código, resolvendo o drift dos types.
- **Reject do comparativo (OPER-04):** rotear `ComparativoScreen.onRejeitar` → `ComparativoCandidatosPage` pela nova RPC `rejeitar_candidatura` com justificativa+motivo, substituindo o `updateCandidaturaEtapa(id, 'rejeitado')` sem justificativa de hoje. (O caso "no-op" real é o embed read-only em `DecisaoFinalPage.tsx:194` — deixar como está.)

### Claude's Discretion
- Assinatura exata da RPC (`p_candidatura_id`, `p_motivo motivo_rejeicao_rh`, `p_justificativa text`), naming do service method e labels pt-BR do enum na UI ficam a critério na fase de plano, seguindo os padrões `registrar_decisao`/`registrarDecisao`.
- Migração PROD via Supabase MCP `apply_migration` (bypassa 42601 em corpos `$$`, grava version row) — precedente das Phases 6–15/24/27.

### Deferred Ideas (OUT OF SCOPE)
- **Ações em lote** (avançar/rejeitar vários candidatos de uma vez) — OPER-v2-01, risco de integridade de auditoria; v1 é individual.
- **Flag "manter no banco de talentos"** no reject — TALENT é M7+.
- **Notificação ao candidato** da rejeição/transição por qualquer canal além do painel in-app — COMM é M7+.
- **Remoção do `RelatoriosRHPage`** legado — cleanup opcional, tratado no dashboard de KPIs (Phase 34).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPER-01 | RH avança um candidato para a próxima etapa em qualquer das 6 etapas, com a transição registrada em `historico_candidatura` pelo write-path existente (trigger único). | Extend `updateCandidaturaEtapa(candidaturaId, novaEtapa)` — the bare `UPDATE candidaturas.etapa_atual` already fires `avancar_etapa()` which writes ONE audit row. Surfaces: Kanban card menu + `HubCandidatoRH` + `ComparativoScreen` (already present). See §Architecture Pattern 3, §Pitfall 3. |
| OPER-02 | RH rejeita em qualquer etapa com motivo estruturado (enum) **e** justificativa ≥50 chars exigida no servidor (RAISE), sem rejeitar por score (RNF-07a). | NEW RPC `rejeitar_candidatura(p_candidatura_id, p_motivo motivo_rejeicao_rh, p_justificativa)` — btrim + `char_length >= 50` RAISE, writes `etapa_atual='rejeitado'` + `status='rejeitado'` + `motivo_rejeicao=p_motivo::text` + `etapa_justificativa` in ONE UPDATE. See §Architecture Pattern 1 + Code Examples. |
| OPER-03 | RH regride para etapa anterior com justificativa obrigatória, respeitando o guard de regressão do trigger. | Reuse the SAME `UPDATE etapa_atual` path, extended to carry `etapa_justificativa`. The trigger's `RAISE 'Regressão de etapa exige justificativa preenchida'` is the authority. See §Pitfall 3 (stale-justificativa hazard). |
| OPER-04 | RH rejeita a partir da tela de comparativo, exigindo justificativa, pelo mesmo write-path auditável (fecha funil-02). | Rewire `ComparativoScreen.onRejeitar` (via `ComparativoCandidatosPage:125`) from `updateCandidaturaEtapa(id,'rejeitado')` → new `rejeitarCandidatura` RPC. The `RejeitarCandidaturaDialog` is the shared surface. See §Architecture Pattern 4. |
</phase_requirements>

## Summary

This is a **REUSE-and-extend** phase — one new Postgres object (`rejeitar_candidatura` DEFINER RPC + `motivo_rejeicao_rh` enum), one new shared React dialog (`RejeitarCandidaturaDialog`), and a small extension to the existing `updateCandidaturaEtapa` service. **No new npm packages, no new tables, and — critically — the live `avancar_etapa()` trigger is NOT edited.** Every pattern needed already ships in this codebase with a verified live analog: `registrar_decisao` (the vaga-scope authorize-then-write DEFINER RPC), `reprocessar_analise` (the same vaga-owner guard), the `avancar_etapa()` trigger (the single audit writer), `RegistrarDecisaoForm` (the ≥50 counter + AlertDialog gate), and `sec02_smokes.sql` / `funil12_status_rpc_smoke.sql` (the JWT-impersonated behavioral smoke idiom).

The single most important correctness fact: the enforcement of "≥50 chars + structured motivo" lives entirely in the **RPC layer**, because the trigger deliberately allows a terminal `rejeitado` from any stage without justificativa. The RPC does one `UPDATE candidaturas` that sets `etapa_atual='rejeitado'` **and** `status='rejeitado'` in the same statement — this satisfies `guard_rejeicao_auditada()` (which blocks status-only rejects with no trail) via its etapa-transition branch, and fires `avancar_etapa()` which writes exactly one `historico_candidatura` row. The RPC must **never** manually `INSERT` into `historico_candidatura` (the Phase-8 survivor double-write lesson).

The second most important fact is a landmine in the legacy cleanup: `public.avancar_etapa` is **overloaded** — the zero-arg `avancar_etapa()` is the LIVE trigger function; the two-arg `avancar_etapa(uuid,uuid)` is the dead M1 RPC. The `DROP FUNCTION` must specify the exact two-arg signature and **never** be run zero-arg or with `CASCADE`, or it will drop the live trigger function (a near-miss class identical to the P27 ENTREV-03 guard incident).

**Primary recommendation:** Author one migration (`CREATE TYPE motivo_rejeicao_rh` + `CREATE OR REPLACE FUNCTION rejeitar_candidatura` + two exact-signature `DROP FUNCTION`s), apply via Supabase MCP `apply_migration`, regenerate `database.types.ts`, then build the shared `RejeitarCandidaturaDialog` + `rejeitarCandidatura` service + `useRejeitarCandidatura` hook copying the `registrar_decisao` / `registrarDecisao` / `useRegistrarDecisao` triad verbatim, and extend `updateCandidaturaEtapa` to carry an optional `justificativa` for regression. Prove it with a JWT-impersonated SQL smoke.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Reject enforcement (≥50 + structured motivo) | Database (SECURITY DEFINER RPC) | — | Trigger allows terminal without justificativa; the ≥50/motivo authority MUST be server-side (OPER-02 "não só validação de form"). Client counter is UX mirror only. |
| Vaga-scope authorization of reject | Database (RPC in-function guard) | — | RLS on `candidaturas` is row-level; a DEFINER RPC bypasses RLS, so it must re-authorize (role + vaga owner) internally — the WR-04 predicate. Client cannot be trusted. |
| Audit trail write (one row / transition) | Database (`avancar_etapa()` trigger) | — | Single auditable write-path invariant (RNF); no code tier ever `INSERT`s `historico_candidatura` directly. |
| Advance / regress transition | Database (bare `UPDATE etapa_atual` → trigger) | Browser (form gates justificativa) | Trigger validates ordinal + regression-justificativa; the form supplies the required text. |
| Reject/advance/regress affordances | Browser (React dialogs + TanStack mutations) | — | Trigger buttons + confirm dialogs on 3 RH surfaces; server is authority, client mirrors the gate. |
| Structured-motivo option list | Database (enum type) | Browser (pt-BR label map) | Enum param validates at the Postgres boundary (invalid → 22P02); UI maps enum→pt-BR label. |
| Legacy dead-RPC cleanup | Database (migration `DROP FUNCTION`) | — | Removes the type-drift; must target exact overload signatures. |

## Project Constraints (from CLAUDE.md)

Treat these with the same authority as locked decisions:

1. **Migration apply — 42601 workaround (§Commands):** PL/pgSQL `$$` bodies + adjacent `COMMENT`/`REVOKE`/`GRANT` fail via `supabase db push --linked` (SQLSTATE 42601, prepared-statement multi-command). **This project uses Supabase MCP `apply_migration`** (MEMORY: bypasses 42601, writes the version row itself). Author the file with **NO outer `BEGIN; … COMMIT;` wrapper** (D-22 — the CLI wraps each migration in its own txn; the outer wrapper is the trigger).
2. **Security Rules:** NEVER `supabaseAdmin`/service_role client-side. Privileged operations go to Edge Functions or **SECURITY DEFINER RPCs** (this phase). RLS on 100% of user-data tables. Privileged DEFINER RPC must include an internal ownership check (not rely on RLS).
3. **Language of product:** "avaliação comportamental/cognitiva", never "teste psicológico". No score/número in reject copy.
4. **RNF-07a:** the system NEVER auto-rejects by score — every reject is a human-actor write with justificativa (`ator=auth.uid()` → `auto_rejeitado=false`).
5. **Types:** `database.types.ts` (at repo ROOT, NOT `src/types/`) is Supabase-CLI-generated — NEVER edit manually; regenerate after the migration.
6. **Conventions:** components `PascalCase.tsx` named export (never default); hooks `useCamelCase.ts`; services `camelCaseService.ts` with custom error classes; RPC params `p_`-prefixed; hierarchical query keys; DB enums snake_case pt-BR.

## Standard Stack

### Core (all already in the repo — no install)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | (installed) | `supabase.rpc('rejeitar_candidatura', {...})` typed call | Sole DB client (anon key only); RPC path is the project idiom for privileged writes |
| `@tanstack/react-query` | v5 (installed) | `useRejeitarCandidatura` mutation + invalidation | Server-state layer; key factories `candidaturasKeys`/`vagasKeys`/`triagemKeys` |
| `react-hook-form` + `zod` | (installed) | Dialog form + client mirror of the ≥50 gate | Project form standard; `JUSTIFICATIVA_MIN = 50` already exported |
| shadcn/ui (Radix, vendored) | `src/components/ui/` | `alert-dialog`, `select`, `textarea`, `label`, `dropdown-menu`, `badge` | All primitives already vendored (per 31-UI-SPEC); no `npx shadcn add` |
| `lucide-react` | (installed) | `X`/`ArrowRight`/`ArrowLeft`/`Undo2`/`MoreVertical`/`Loader2` icons | Project icon lib |
| `sonner` | (installed) | `toast.success`/`toast.error` | Project toast lib (see `useRegistrarDecisao`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.9 | Unit/component tests (`vite.config.ts`, happy-dom) | Dialog gate + service + hook tests |
| Supabase MCP `apply_migration` / `execute_sql` | MCP | PROD migration apply + smoke execution | The [BLOCKING] apply wave + post-apply behavioral smoke |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New DEFINER RPC for reject | Extend `avancar_etapa()` trigger's terminal branch to enforce ≥50 | REJECTED by CONTEXT + REQUIREMENTS "Out of Scope: Editar o trigger" — high risk (P27 near-miss dropped ENTREV-03). Trigger stays verbatim. |
| `motivo_rejeicao` stays `text` (enum as param only) | `ALTER COLUMN motivo_rejeicao TYPE motivo_rejeicao_rh` | REJECTED — column already holds `'knockout_automatico'` (not in the enum); ALTER would fail/lose data. Enum validates at the param boundary; value stored `::text`. |
| Reuse `updateCandidaturaEtapa(id,'rejeitado')` for reject | — | REJECTED for reject (no justificativa/motivo) but KEPT for advance/regress. The comparativo reject is being migrated OFF this path (OPER-04). |

**Installation:** None. `npm install` adds nothing this phase.

## Package Legitimacy Audit

**No external packages are installed in this phase.** Every dependency (`@supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form`, `zod`, vendored shadcn primitives, `lucide-react`, `sonner`, `vitest`) is already present in `package.json` and in production use. The Package Legitimacy Gate is **not applicable** — no registry fetch, no `npx shadcn add`, no new dependency. slopcheck: N/A (zero new packages).

## Architecture Patterns

### System Architecture Diagram

```
RH user (authenticated, JWT app_metadata.role ∈ {rh, administrador})
        │
        ├─ REJECT ────────────────────────────────────────────────────────┐
        │   Kanban card menu / HubCandidatoRH / ComparativoScreen          │
        │        │  opens RejeitarCandidaturaDialog (motivo Select +       │
        │        │  Textarea + live counter; confirm gated motivo!=null    │
        │        │  && btrim(len)>=50 — UX MIRROR ONLY)                     │
        │        ▼                                                          │
        │   useRejeitarCandidatura (TanStack mutation)                      │
        │        ▼                                                          │
        │   rejeitarCandidatura(service) → supabase.rpc('rejeitar_candidatura',
        │        {p_candidatura_id, p_motivo, p_justificativa})             │
        │        ▼                                                          │
        │   ┌─────────────────────────────────────────────────────────┐    │
        │   │ RPC rejeitar_candidatura  SECURITY DEFINER, search_path=''│    │
        │   │  (0) btrim + char_length(p_justificativa) >= 50 → RAISE   │    │
        │   │  (1) resolve candidatura → vaga.created_by (NOT FOUND→404)│    │
        │   │  (2) role ∈ {rh,administrador}; rh must own vaga → RAISE  │    │
        │   │  (3) UPDATE candidaturas SET etapa_atual='rejeitado',     │    │
        │   │        status='rejeitado', motivo_rejeicao=p_motivo::text,│    │
        │   │        etapa_justificativa=<btrim'd justificativa>        │    │
        │   └─────────────────────────────────────────────────────────┘    │
        │        │ (single UPDATE — fires BEFORE-UPDATE triggers)           │
        │        ▼                                                          │
        │   candidaturas_avancar_etapa_trg (c) fires FIRST (alphabetical)  │
        │     → avancar_etapa(): terminal allowed; writes ONE               │
        │       historico_candidatura row (ator=auth.uid(),                 │
        │       criterio_texto=etapa_justificativa, auto_rejeitado=FALSE)   │
        │        ▼                                                          │
        │   trg_candidaturas_guard_rejeicao (t) fires SECOND                │
        │     → guard_rejeicao_auditada(): status→rejeitado + etapa moved   │
        │       ⇒ ALLOWED (etapa-transition branch)                         │
        │                                                                   │
        ├─ ADVANCE ─────────────────────────────────────────────────────── │
        │   confirm AlertDialog (no free-text) → useUpdateCandidaturaEtapa  │
        │     → updateCandidaturaEtapa(id, nextEtapa)                       │
        │     → UPDATE candidaturas SET etapa_atual=next (+ NULL justif.)   │
        │     → avancar_etapa(): forward free; ONE audit row                │
        │                                                                   │
        └─ REGRESS ─────────────────────────────────────────────────────── ┘
            RetrocederCandidaturaDialog (destino Select prior-ordinal +
            required non-empty Textarea) → useUpdateCandidaturaEtapa
              → updateCandidaturaEtapa(id, destino, justificativa)  ← EXTENDED
              → UPDATE candidaturas SET etapa_atual=destino,
                 etapa_justificativa=<required text>
              → avancar_etapa(): NEW<OLD ⇒ RAISE if justificativa empty; else ONE audit row
```

### Component Responsibilities
| File | Responsibility | New/Change |
|------|---------------|------------|
| `supabase/migrations/<ts>_rejeitar_candidatura_rpc.sql` | enum + RPC + 2 DROP FUNCTIONs | NEW migration |
| `src/features/triagem/services/triagemService.ts` | `rejeitarCandidatura()` + extend `updateCandidaturaEtapa()` with optional `justificativa` | CHANGE |
| `src/features/triagem/hooks/` (e.g. `useRejeitarCandidatura.ts`) | TanStack mutation + toast + invalidation | NEW |
| `src/features/triagem/components/RejeitarCandidaturaDialog.tsx` | shared reject dialog (motivo Select + Textarea + counter) | NEW |
| `RetrocederCandidaturaDialog.tsx` | regress dialog (destino Select + required Textarea) | NEW |
| `src/components/KanbanBoard.tsx` | card `DropdownMenu` (Avançar/Retroceder/Rejeitar) | CHANGE |
| `PerfilCandidatoRHPage` / `HubCandidatoRH.tsx` | action row beside "Abrir {etapa}" CTA | CHANGE |
| `ComparativoScreen.tsx` + `ComparativoCandidatosPage.tsx` | rewire `onRejeitar` → `RejeitarCandidaturaDialog` → new RPC | CHANGE |
| `database.types.ts` (ROOT) | regenerate after apply (adds RPC+enum, removes 2 dead overloads) | REGEN |

### Pattern 1: Vaga-scope authorize-then-write DEFINER RPC (THE core control)

**What:** A `SECURITY DEFINER` RPC bypasses RLS, so it must re-authorize internally: (a) resolve candidatura → its vaga owner via join, (b) 404 if not found, (c) require role ∈ {rh, administrador}, (d) an `rh` must own the vaga (`vagas.created_by = auth.uid()`), administrador bypasses. This is the WR-04 predicate. `auth.uid()` and `auth.jwt()` read the request JWT GUC and **survive** SECURITY DEFINER (Phase-6 proof; used live in `registrar_decisao` and `reprocessar_analise`).

**When to use:** Every privileged RPC that mutates a candidatura the caller might not own.

**Example (verbatim idiom from `registrar_decisao` :95-117 and `reprocessar_analise` :39-59):**
```sql
-- Source: supabase/migrations/20260625100001_decisao_final_phase15.sql:95-117
-- (1) Resolve candidatura → vaga owner.
SELECT v.created_by INTO v_vaga_owner
  FROM public.candidaturas c
  JOIN public.vagas v ON v.id = c.vaga_id
 WHERE c.id = p_candidatura_id;
IF NOT FOUND THEN
  RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
    USING ERRCODE = 'no_data_found';
END IF;
-- (2) Role + own-vaga guard.
v_role := (select auth.jwt() #>> '{app_metadata,role}');
IF v_role NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
```

### Pattern 2: Migration authoring (enum + DEFINER RPC + legacy DROP), applied via MCP

**What:** One migration file, NO `BEGIN/COMMIT` wrapper (D-22), harden with `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE … TO authenticated`. Applied via Supabase MCP `apply_migration` (writes the version row; bypasses 42601). Regenerate types after.

**Enum creation** — codebase precedent is bare `CREATE TYPE public.X AS ENUM (…)` (e.g. `decisao_final.sql:35`, `scores_candidato.sql:35`). Because `apply_migration` may be retried, wrap in a `duplicate_object` guard for idempotency-on-replay:
```sql
DO $$ BEGIN
  CREATE TYPE public.motivo_rejeicao_rh AS ENUM (
    'perfil_desalinhado', 'reprovado_avaliacao', 'reprovado_entrevista',
    'nao_compareceu', 'desistencia', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### Pattern 3: The single auditable write-path (trigger owns the audit row)

**What:** No code tier ever `INSERT`s into `historico_candidatura`. Every transition is a single `UPDATE candidaturas.etapa_atual` (+ optional `etapa_justificativa`); the `avancar_etapa()` BEFORE-UPDATE trigger writes exactly ONE audit row per transition, capturing `ator=auth.uid()`, `criterio_texto=NEW.etapa_justificativa`, and (DBMIG-02) `auto_rejeitado = (ator IS NULL AND app.rejeicao_sancionada='on' AND NEW.etapa_atual='rejeitado')` — i.e. FALSE for any human-actor reject (RNF-07a). The RPC must NOT add a manual INSERT (Phase-8 survivor double-write lesson).

### Pattern 4: service → hook → dialog triad (copy the decisao triad verbatim)

**What:** `rejeitarCandidatura` service (custom error class, `p_`-prefixed params) → `useRejeitarCandidatura` mutation (toast + invalidate `candidaturasKeys.all` + `vagasKeys.all` + `triagemKeys.all`) → dialog with counter + AlertDialog gate. Direct analogs: `decisaoService.registrarDecisao` (:137), `useRegistrarDecisao` (:32), `RegistrarDecisaoForm` (:73). The comparativo rewire replaces `ComparativoCandidatosPage:125` `updateCandidaturaEtapa(candidaturaId, 'rejeitado')` with the new mutation.

### Anti-Patterns to Avoid
- **Editing `avancar_etapa()`:** forbidden (REQUIREMENTS Out of Scope; P27 near-miss). The RPC enforces ≥50; the trigger is verbatim.
- **`DROP FUNCTION public.avancar_etapa()` (zero-arg) or `… CASCADE`:** drops the LIVE trigger function. Use the exact two-arg signature only (see Pitfall 1).
- **Manual `INSERT INTO historico_candidatura` in the RPC:** double-write; the trigger is the sole writer.
- **Status-only reject (`UPDATE status='rejeitado'` without etapa move):** blocked by `guard_rejeicao_auditada()` (SQLSTATE from its RAISE). The RPC moves `etapa_atual='rejeitado'` too.
- **Trusting the client ≥50 gate:** the counter is UX; the server RAISE is the authority (OPER-02).
- **Forgetting to write `etapa_justificativa` on regression** → the trigger reads the STALE stored value (Pitfall 3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reject audit trail | Manual `INSERT historico_candidatura` in RPC | The `avancar_etapa()` trigger (single UPDATE fires it) | Guarantees ONE row/transition, correct `ator`/`auto_rejeitado`; double-write is the Phase-8 bug |
| Motivo option validation | Client-only enum check / free-string column check | Postgres enum param `motivo_rejeicao_rh` | Invalid value → 22P02 at the DB boundary; no bespoke validation |
| Reject authorization | RLS-only, or a client role check | In-RPC vaga-owner guard (Pattern 1) | DEFINER bypasses RLS; client cannot be trusted; copy `registrar_decisao` |
| ≥50 justificativa gate | Zod-only (form) | Server `btrim + char_length >= 50` RAISE **plus** client mirror | OPER-02 demands server authority; form is affordance |
| Reject/advance/regress dialog | Three forked copies of the dialog | ONE shared `RejeitarCandidaturaDialog` across 3 surfaces | 31-UI-SPEC: single source of truth for copy + gate |
| Reject status→rejeitado audit gate | Bespoke "did it write a trail" check | Existing `guard_rejeicao_auditada()` (already live) | It already blocks trail-less rejects; the RPC just moves etapa to satisfy it |

**Key insight:** In this repo the funnel transition is a solved problem — the trigger + guard already enforce every audit invariant. Phase 31 adds a thin authorize-and-validate RPC on top and reuses the existing UPDATE path for advance/regress. Any "custom" audit or validation logic is a regression risk, not a feature.

## Common Pitfalls

### Pitfall 1: `avancar_etapa` is OVERLOADED — the DROP can kill the live trigger [HIGH SEVERITY]
**What goes wrong:** `public.avancar_etapa` has two signatures: `avancar_etapa()` (zero-arg, `RETURNS trigger`, LIVE, bound to `candidaturas_avancar_etapa_trg`) and `avancar_etapa(uuid, uuid)` (dead M1 RPC). A `DROP FUNCTION public.avancar_etapa()` or `DROP FUNCTION public.avancar_etapa CASCADE` drops the **trigger function** — silently breaking all funnel auditing.
**Why it happens:** name collision; the planner sees "drop avancar_etapa legacy" and omits the arg types.
**How to avoid:** Verified via `database.types.ts:4359-4362` the dead overload's args are `{ candidatura_uuid, usuario_rh_uuid }` (both uuid). Use the **exact two-arg signature**, never CASCADE:
```sql
DROP FUNCTION IF EXISTS public.avancar_etapa(uuid, uuid);        -- dead M1 RPC ONLY
DROP FUNCTION IF EXISTS public.rejeitar_candidato(uuid, text, uuid);  -- args verified types.ts:4620-4627
-- NEVER: DROP FUNCTION public.avancar_etapa();  ← that is the LIVE TRIGGER function
```
**Warning signs:** a plan or diff mentioning `DROP FUNCTION avancar_etapa` without `(uuid, uuid)`; any `CASCADE`.

### Pitfall 2: Reject that sets only `status` (or only `etapa`) trips a guard or skips the trail
**What goes wrong:** Setting `status='rejeitado'` WITHOUT moving `etapa_atual` → `guard_rejeicao_auditada()` RAISEs "Rejeição sem trilha de auditoria não é permitida". Setting `etapa_atual='rejeitado'` WITHOUT `status='rejeitado'` → the panel badge/filter/dashboard won't show "Rejeitado" (status drives the UI badge).
**Why it happens:** partial UPDATE.
**How to avoid:** the RPC does BOTH in one UPDATE (`etapa_atual='rejeitado'`, `status='rejeitado'`). This is `guard_rejeicao_auditada` path #2 ("comparativo": status→rejeitado + etapa→rejeitado ⇒ etapa branch allowed; trigger writes the trail). Confirmed at `20260709000010:24-26`.
**Warning signs:** smoke shows a RAISE from `guard_rejeicao_auditada`, or the badge doesn't flip.

### Pitfall 3: Regression through the extended `updateCandidaturaEtapa` reads a STALE `etapa_justificativa`
**What goes wrong:** In a BEFORE-UPDATE trigger, `NEW.etapa_justificativa` equals the value written by the UPDATE **only if** the column is in the SET list; otherwise `NEW.etapa_justificativa = OLD` (the previously stored value). If regression sets `etapa_atual` but NOT `etapa_justificativa`, the trigger's regression guard reads the OLD stored justificativa (possibly non-empty from an earlier transition) → the guard passes with a **stale** text and the audit row's `criterio_texto` records the wrong justificativa. Conversely a forward advance that doesn't clear it inherits the last regression's text into `criterio_texto`.
**Why it happens:** the current `updateCandidaturaEtapa` only sets `etapa_atual` (+ status for reject) — it never touches `etapa_justificativa`.
**How to avoid:** Extend the signature to `updateCandidaturaEtapa(candidaturaId, novaEtapa, justificativa?)` and **always include `etapa_justificativa` in the UPDATE object** (`justificativa ?? null`) so: regression writes the required text (guard sees the fresh value), forward advance writes `NULL` (clean audit row), and reject writes the ≥50 text. This also fixes a latent staleness in the existing forward-advance path.
**Warning signs:** a regression audit row whose `criterio_texto` doesn't match what the RH typed; a forward-advance row carrying an old justificativa.

### Pitfall 4: Where does the ≥50 free-text justificativa land?
**What goes wrong:** The motivo enum has an obvious home (`motivo_rejeicao::text`), but the free-text justificativa could go to `etapa_justificativa`, `feedback_rejeicao`, or nowhere.
**Why it happens:** three candidate columns exist (`etapa_justificativa`, `feedback_rejeicao`, `motivo_rejeicao` — all on `candidaturas`).
**How to avoid:** Recommend writing the justificativa to **`etapa_justificativa`** — because the trigger copies `NEW.etapa_justificativa` into `historico_candidatura.criterio_texto`, this is what makes the copy's promise ("fica registrada na trilha de auditoria") literally true, and it's the audit-trail home. Do NOT use `feedback_rejeicao` (that reads as candidate-facing feedback → COMM/M7+, out of scope). Store `motivo_rejeicao = p_motivo::text`. [ASSUMED — column choice is Claude's-discretion; flag A2.]
**Warning signs:** the activity feed / audit trail shows a rejection with no justificativa text.

### Pitfall 5: `auth.uid()` inside a DEFINER RPC that fires a DEFINER trigger
**What goes wrong:** One might fear the nested SECURITY DEFINER contexts null out the actor.
**Why it happens:** intuition about DEFINER swapping the effective role.
**How to avoid:** `auth.uid()` is GUC-based (reads `request.jwt.claims`), not role-based — it survives both DEFINER hops. The RPC is called by the authenticated RH user, so the trigger captures `ator = <RH user id>` → `auto_rejeitado=FALSE` (human write, RNF-07a). Verified live in `registrar_decisao` (which does exactly this: DEFINER RPC → `UPDATE candidaturas` → `avancar_etapa()` writes the row). No special handling needed.
**Warning signs:** smoke shows a reject audit row with `ator IS NULL` or `auto_rejeitado=true`.

### Pitfall 6: Re-rejecting an already-rejected candidatura is a silent no-op
**What goes wrong:** If `etapa_atual` is already `'rejeitado'`, the trigger's `IF NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN RETURN NEW` short-circuits → NO new audit row, and `guard_rejeicao_auditada` doesn't fire (OLD.status already 'rejeitado'). The UPDATE succeeds but records nothing.
**Why it happens:** idempotent terminal state.
**How to avoid:** Optionally RAISE early in the RPC if the candidatura is already terminal (`etapa_atual IN ('aprovado','rejeitado')`) with a clean pt-BR message, OR accept the no-op. [ASSUMED — behavior is Claude's-discretion; flag A3.] The UI already hides reject actions on terminal etapas (31-UI-SPEC: "Hidden for terminal etapas").

## Code Examples

### The new RPC (compose from the two verified analogs)
```sql
-- Source idiom: registrar_decisao (20260625100001:73-149) + reprocessar_analise (20260610000003:26-84)
CREATE OR REPLACE FUNCTION public.rejeitar_candidatura(
  p_candidatura_id uuid,
  p_motivo         public.motivo_rejeicao_rh,
  p_justificativa  text
)
RETURNS void            -- or RETURNS public.candidaturas for readback (discretion)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_just       text := btrim(coalesce(p_justificativa, ''));
BEGIN
  -- (0) Server-authoritative ≥50 (OPER-02) — btrim'd length, pt-BR message.
  IF char_length(v_just) < 50 THEN
    RAISE EXCEPTION 'A justificativa da rejeição precisa de pelo menos 50 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (1) Resolve candidatura → vaga owner (Pattern 1).
  SELECT v.created_by INTO v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) Role + own-vaga guard (WR-04). candidato/anon → forbidden; rh must own; admin bypass.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (3) ONE UPDATE — fires avancar_etapa() (writes the trail) AND satisfies
  --     guard_rejeicao_auditada() (status→rejeitado WITH an etapa move). NEVER a manual
  --     historico_candidatura INSERT (Phase-8 double-write). justificativa → etapa_justificativa
  --     so the trigger copies it into historico_candidatura.criterio_texto (Pitfall 4).
  UPDATE public.candidaturas
     SET etapa_atual         = 'rejeitado',
         status              = 'rejeitado',
         motivo_rejeicao     = p_motivo::text,
         etapa_justificativa = v_just
   WHERE id = p_candidatura_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) TO authenticated;
COMMENT ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) IS
  'Phase 31 / OPER-02/04: rejeicao auditada pelo RH. ...';
```
> ⚠ Enum values (`inscricao`/`triagem`/…/`rejeitado`) — verify the exact literal spelling of `etapa_processo` in `Constants.public.Enums.etapa_processo` (`database.types.ts`) at authoring time; MEMORY logs a live `'texto'`→`texto_curto` 22P02 class where an assumed enum literal was wrong (Phase 8 publish_vaga bug).

### Service method (mirror `registrarDecisao`, `triagemService.ts`)
```typescript
// src/features/triagem/services/triagemService.ts — add alongside updateCandidaturaEtapa
export type MotivoRejeicaoRh =
  | 'perfil_desalinhado' | 'reprovado_avaliacao' | 'reprovado_entrevista'
  | 'nao_compareceu' | 'desistencia' | 'outro'

export async function rejeitarCandidatura(
  candidaturaId: string, motivo: MotivoRejeicaoRh, justificativa: string,
): Promise<void> {
  if (!candidaturaId) throw new TriagemServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  const { error } = await supabase.rpc('rejeitar_candidatura', {
    p_candidatura_id: candidaturaId, p_motivo: motivo, p_justificativa: justificativa,
  })
  if (error) throw new TriagemServiceError(
    `Não foi possível rejeitar o candidato: ${error.message}`, 'DATABASE_ERROR', error)
}

// EXTEND updateCandidaturaEtapa: add optional justificativa (Pitfall 3)
export async function updateCandidaturaEtapa(
  candidaturaId: string, novaEtapa: EtapaFunilM2, justificativa?: string,
): Promise<void> {
  if (!candidaturaId) throw new TriagemServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  const update: { etapa_atual: EtapaFunilM2; status?: StatusCandidatura; etapa_justificativa: string | null } = {
    etapa_atual: novaEtapa,
    etapa_justificativa: justificativa ?? null,  // ALWAYS in the SET list — avoids stale NEW value
  }
  if (novaEtapa === 'rejeitado') update.status = 'rejeitado'
  const { error } = await supabase.from('candidaturas').update(update as never).eq('id', candidaturaId)
  if (error) throw new TriagemServiceError(`Não foi possível atualizar a candidatura: ${error.message}`, 'DATABASE_ERROR', error)
}
```
> Note the `as never` cast is the existing local workaround until `database.types.ts` regenerates; keep parity with the current file (line 368). After regen, the `rejeitar_candidatura` RPC call is fully typed (no cast) — like `registrar_decisao`.

### Hook (mirror `useRegistrarDecisao`)
```typescript
// src/features/triagem/hooks/useRejeitarCandidatura.ts
export function useRejeitarCandidatura() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { candidaturaId: string; motivo: MotivoRejeicaoRh; justificativa: string }>({
    mutationFn: ({ candidaturaId, motivo, justificativa }) => rejeitarCandidatura(candidaturaId, motivo, justificativa),
    onSuccess: () => {
      toast.success('Candidato movido para "Rejeitado".')
      queryClient.invalidateQueries({ queryKey: candidaturasKeys.all })
      queryClient.invalidateQueries({ queryKey: vagasKeys.all })
      queryClient.invalidateQueries({ queryKey: triagemKeys.all })
    },
    onError: () => toast.error('Não foi possível rejeitar o candidato. Tente novamente.'),
  })
}
```

### Behavioral SQL smoke skeleton (JWT-impersonated — copy sec02 + funil12 idiom)
```sql
-- supabase/tests/oper31_rejeitar_candidatura_smokes.sql
-- Run via Supabase MCP execute_sql AFTER the migration applies. NOTICE 'PASS' = ok; EXCEPTION = FAIL.
-- Disposable fixture pattern (funil12) so no PROD candidatura is mutated; ROLLBACK-free cleanup.
RESET ROLE;
DO $$
DECLARE v_cand uuid; v_owner uuid; v_other uuid; v_before int; v_after int;
        v_auto boolean; v_status text;
BEGIN
  -- SETUP: discover/create a disposable vaga (created_by = a real rh user v_owner) + candidatura in 'triagem'.
  -- ... (build fixture with fixed UUIDs; seed candidaturas.etapa_atual='triagem', status='aguardando_resposta')

  -- (a) ≥50 RAISE — impersonate the OWNER rh; justificativa < 50 → check_violation.
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_owner, 'role','authenticated',
    'app_metadata', jsonb_build_object('role','rh'))::text, false);
  SET ROLE authenticated;
  BEGIN
    PERFORM public.rejeitar_candidatura(v_cand, 'perfil_desalinhado', 'curto');
    RAISE EXCEPTION 'FAIL (a): reject with <50 justificativa was accepted';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS (a): <50 justificativa RAISEd'; END;

  -- (e) cross-recruiter — impersonate a DIFFERENT rh (v_other, owns no vaga) → insufficient_privilege.
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_other, 'role','authenticated',
    'app_metadata', jsonb_build_object('role','rh'))::text, false);
  SET ROLE authenticated;
  BEGIN
    PERFORM public.rejeitar_candidatura(v_cand, 'outro', repeat('x',60));
    RAISE EXCEPTION 'FAIL (e): recruiter B rejected candidatura of vaga owned by A';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS (e): cross-recruiter reject denied (42501)'; END;

  -- (b/d) valid reject by OWNER → exactly ONE new historico row, auto_rejeitado=false, status=rejeitado.
  RESET ROLE;
  SELECT count(*) INTO v_before FROM public.historico_candidatura WHERE candidatura_id = v_cand;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_owner, 'role','authenticated',
    'app_metadata', jsonb_build_object('role','rh'))::text, false);
  SET ROLE authenticated;
  PERFORM public.rejeitar_candidatura(v_cand, 'reprovado_avaliacao', repeat('x',60));
  RESET ROLE;
  SELECT count(*) INTO v_after FROM public.historico_candidatura WHERE candidatura_id = v_cand;
  IF v_after - v_before <> 1 THEN RAISE EXCEPTION 'FAIL (d): expected exactly 1 new historico row, got %', v_after - v_before; END IF;
  SELECT auto_rejeitado INTO v_auto FROM public.historico_candidatura
    WHERE candidatura_id = v_cand ORDER BY criado_em DESC LIMIT 1;
  IF v_auto IS NOT FALSE THEN RAISE EXCEPTION 'FAIL (b): human reject wrote auto_rejeitado=% (RNF-07a)', v_auto; END IF;
  RAISE NOTICE 'PASS (b/d): ONE audit row, auto_rejeitado=false';

  -- (c) regression justificativa — bare UPDATE to an earlier etapa with EMPTY etapa_justificativa → RAISE.
  --     (proves the trigger, not the RPC, guards regression — reuse the existing UPDATE path.)
  --     ... UPDATE candidaturas SET etapa_atual='inscricao', etapa_justificativa='' WHERE id=v_cand;
  --     expect: RAISE 'Regressão de etapa exige justificativa preenchida'.

  -- CLEANUP (ROLLBACK-free): reset claims + role, delete the disposable fixture.
END $$;
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Reject = bare `UPDATE etapa_atual='rejeitado'` (no motivo/justificativa) | Auditable RPC `rejeitar_candidatura` (≥50 + enum motivo, server-enforced) | Phase 31 (this) | Compliance-defensible disposition; closes funil-02 |
| Legacy M1 RPCs `avancar_etapa(uuid,uuid)` / `rejeitar_candidato(uuid,text,uuid)` | Dead (zero callers) → DROP | Phase 31 | Removes `database.types.ts` drift |
| `avancar_etapa()` trigger `auto_rejeitado=(ator IS NULL)` | GUC-gated `auto_rejeitado` predicate | Phase 27 (DBMIG-02) | Human reject correctly reads `false`; trigger is the current live body — do NOT regress |

**Deprecated/outdated:**
- The two-arg `avancar_etapa(uuid,uuid)` and `rejeitar_candidato(uuid,text,uuid)` overloads — remove this phase.
- `updateCandidaturaEtapa(id,'rejeitado')` as the comparativo reject path — replaced by the RPC (OPER-04).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RPC returns `void` (no readback row) is sufficient | Code Examples | Low — `registrar_decisao` returns the row for readback; discretion. If UI needs optimistic confirm, `RETURNS public.candidaturas`. |
| A2 | Free-text justificativa is stored in `etapa_justificativa` (→ audit `criterio_texto`), motivo in `motivo_rejeicao::text` | Pitfall 4 | Medium — if the planner prefers `feedback_rejeicao`, the audit trail would lose the text. `etapa_justificativa` is the recommended, audit-visible home. Confirm in plan. |
| A3 | Re-rejecting an already-terminal candidatura is either RAISEd or accepted as a no-op | Pitfall 6 | Low — UI hides the action on terminals; edge case only. |
| A4 | Enum literal spelling of `etapa_processo` values matches `'rejeitado'`/`'inscricao'`/etc. | Code Examples | Medium — verify against `Constants.public.Enums.etapa_processo` at authoring (Phase-8 22P02 precedent). |
| A5 | The `triagemKeys.all` factory exists and is the right invalidation key for the triagem panel | Hook | Low — used in CONTEXT; confirm export path in plan (mirror `candidaturasKeys`/`vagasKeys`). |

## Open Questions

1. **RPC return type — `void` vs `RETURNS public.candidaturas`.**
   - What we know: `registrar_decisao`/`reprocessar_analise` differ (`registrar_decisao` returns the row; `reprocessar_analise` returns void).
   - What's unclear: whether the dialog needs a readback beyond the mutation's success/toast.
   - Recommendation: `void` is simplest (the hook invalidates + refetches). Use readback only if optimistic UI is desired. [Claude's-discretion per CONTEXT.]

2. **Should `rejeitar_candidatura` early-RAISE on an already-terminal candidatura?**
   - What we know: the trigger no-ops on same-etapa; the UI hides the action on terminals.
   - What's unclear: whether a direct/stale call should error loudly.
   - Recommendation: add an early guard `IF (SELECT etapa_atual FROM candidaturas WHERE id=p_candidatura_id) IN ('aprovado','rejeitado') THEN RAISE …` for a clean message; low-risk either way.

3. **`PerfilCandidatoRHPage` vs `HubCandidatoRH` — which is the "perfil" reject surface?**
   - What we know: CONTEXT names `PerfilCandidatoRHPage`; 31-UI-SPEC names `HubCandidatoRH` "Próximo passo" action row.
   - What's unclear: whether these are the same route or two surfaces.
   - Recommendation: the planner should confirm the exact component that renders the RH candidate profile and place the shared dialog there; both references point at the RH candidate detail surface.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP `apply_migration` | PROD migration apply (enum+RPC+DROPs) | ✓ (MCP) | — | SQL Editor manual + `migration repair` (CLAUDE.md §Commands) |
| Supabase MCP `execute_sql` | Post-apply behavioral smoke | ✓ (MCP) | — | SQL Editor manual paste |
| `supabase` CLI (`npm run db:types`) | Regenerate `database.types.ts` | ✓ (project) | — | none (types regen is required) |
| Node + Vitest 4.1.9 | Unit/component tests | ✓ | 4.1.9 | none |
| Postgres (Supabase PROD) | live `avancar_etapa()` trigger + guards | ✓ | — | none |

**Missing dependencies with no fallback:** none identified.
**Missing dependencies with fallback:** migration apply (MCP `apply_migration` → SQL Editor manual if 42601-class failure).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (happy-dom) + Supabase MCP `execute_sql` for SQL behavioral smokes |
| Config file | `vite.config.ts` (`test:` block, `setupFiles: ['./tests/setup.ts']`) |
| Quick run command | `npx vitest run src/features/triagem` (targeted) |
| Full suite command | `npm run test:run && npm run lint && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPER-02 | reject `<50` justificativa → server RAISE | SQL smoke | `execute_sql < supabase/tests/oper31_rejeitar_candidatura_smokes.sql` (assert a) | ❌ Wave 0 |
| OPER-02 | cross-recruiter reject denied (42501) | SQL smoke | same file (assert e) | ❌ Wave 0 |
| OPER-02 | human reject → `auto_rejeitado=false` (RNF-07a) | SQL smoke | same file (assert b) | ❌ Wave 0 |
| OPER-01/02/04 | exactly ONE `historico_candidatura` row per transition | SQL smoke | same file (assert d) | ❌ Wave 0 |
| OPER-03 | regression with empty justificativa → trigger RAISE | SQL smoke | same file (assert c) | ❌ Wave 0 |
| OPER-02 | dialog confirm disabled until motivo set + btrim≥50 | component | `npx vitest run RejeitarCandidaturaDialog` | ❌ Wave 0 |
| OPER-02 | `rejeitarCandidatura` maps RPC error → `TriagemServiceError` | unit | `npx vitest run triagemService` | ⚠️ extend existing `triagemService.test.ts` |
| OPER-01/03 | `updateCandidaturaEtapa` includes `etapa_justificativa` in UPDATE | unit | `npx vitest run triagemService` | ⚠️ extend (not currently covered) |
| OPER-04 | `ComparativoScreen` reject routes to new RPC (not old path) | component | `npx vitest run ComparativoScreen` | ⚠️ rewire existing `ComparativoScreen.test.tsx` |
| OPER-01/02/03 | `useRejeitarCandidatura` invalidates the 3 key trees | hook | `npx vitest run useRejeitarCandidatura` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched feature dir>` (< 30s).
- **Per wave merge:** `npm run test:run && npm run lint` (full Vitest + tsc baseline — MEMORY baseline ~104 tsc after M5; must not regress).
- **Phase gate:** full suite green + `npm run build` + the SQL behavioral smoke PASS (all 5 assertions) executed via MCP AFTER the [BLOCKING] apply wave, before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/tests/oper31_rejeitar_candidatura_smokes.sql` — JWT-impersonated: (a) <50 RAISE, (b) auto_rejeitado=false, (c) regression empty→RAISE, (d) exactly 1 historico row, (e) cross-recruiter denied. RED until the RPC is live.
- [ ] `src/features/triagem/components/__tests__/RejeitarCandidaturaDialog.test.tsx` — gate + counter + btrim behavior.
- [ ] `src/features/triagem/hooks/__tests__/useRejeitarCandidatura.test.ts` — invalidation keys.
- [ ] Extend `src/features/triagem/services/__tests__/triagemService.test.ts` — `rejeitarCandidatura` + extended `updateCandidaturaEtapa` (currently NOT covered).
- [ ] Rewire `src/features/triagem/components/__tests__/ComparativoScreen.test.tsx` — assert reject uses the new RPC path.
- Framework install: none (Vitest present).

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth JWT; `auth.uid()`/`auth.jwt()` read the request GUC, survive DEFINER |
| V3 Session Management | no | Handled by Supabase Auth; no change this phase |
| V4 Access Control | **yes (core)** | In-RPC vaga-owner guard (WR-04): role ∈ {rh,administrador} + `rh` owns `vagas.created_by=auth.uid()`; `REVOKE FROM PUBLIC` + `GRANT EXECUTE TO authenticated` |
| V5 Input Validation | **yes** | `motivo_rejeicao_rh` enum param (Postgres boundary, invalid→22P02) + server `btrim + char_length>=50` RAISE; `SET search_path=''` |
| V6 Cryptography | no | No crypto in scope |
| V7 Error/Logging | yes | Structured RAISE with SQLSTATE (`insufficient_privilege`, `check_violation`, `no_data_found`); no PII in error text; single audit row via trigger |

### Known Threat Patterns for Supabase DEFINER RPC + funnel mutation
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Recruiter A rejects a candidatura of vaga owned by B (IDOR/horizontal) | Elevation of Privilege | In-RPC `vagas.created_by=auth.uid()` guard; smoke assert (e) |
| Client bypasses the ≥50 gate (calls RPC directly with short text) | Tampering | Server `char_length>=50` RAISE — the client counter is NOT the authority (OPER-02) |
| Status-only reject with no audit trail | Repudiation | `guard_rejeicao_auditada()` blocks it; RPC moves `etapa_atual` so the trigger writes the trail |
| Auto-reject by score | (RNF-07a violation) | No score path in the RPC; human `ator=auth.uid()` → `auto_rejeitado=false`; smoke assert (b) |
| Double-write / phantom audit rows | Integrity | Trigger is the sole writer; RPC never `INSERT`s `historico_candidatura`; smoke assert (d) |
| `DROP FUNCTION` collateral (killing the live trigger fn) | Denial of Service (audit) | Exact two-arg signature; never zero-arg/CASCADE (Pitfall 1) |
| candidato/anon invokes the RPC | Elevation of Privilege | role guard RAISEs `insufficient_privilege`; `GRANT EXECUTE` only to `authenticated`, `REVOKE FROM PUBLIC` |

> This phase is a strong `/gsd:secure-phase` candidate: the auditor should verify the vaga-owner guard, the server-side ≥50, the single-audit-row invariant, and the DROP-signature safety.

## Sources

### Primary (HIGH confidence — in-repo verified)
- `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql` — LIVE trigger body (terminal allowed; regression RAISE; ENTREV-03 guard; DBMIG-02 `auto_rejeitado` predicate). MUST NOT edit.
- `supabase/migrations/20260625100001_decisao_final_phase15.sql:73-165` — `registrar_decisao` vaga-owner authorize-then-write DEFINER RPC (the copy template).
- `supabase/migrations/20260610000003_reprocessar_rpc.sql:26-96` — `reprocessar_analise` identical vaga-owner guard.
- `supabase/migrations/20260709000010_guard_rejeicao_auditada.sql` — status-reject audit guard + firing order (avancar_etapa first, guard second).
- `supabase/migrations/20260607000005_avancar_etapa_trigger.sql:93-99` — trigger binding `candidaturas_avancar_etapa_trg` → `avancar_etapa()` (the zero-arg function that must survive the DROP).
- `database.types.ts:4359-4362` (`avancar_etapa` args `{candidatura_uuid, usuario_rh_uuid}`), `:4620-4627` (`rejeitar_candidato` args `{candidatura_uuid, motivo, usuario_rh_uuid}`), `:845-851` (`candidaturas` columns: `etapa_atual`/`etapa_justificativa`/`feedback_rejeicao`/`motivo_rejeicao`).
- `src/features/triagem/services/triagemService.ts:350-378` — `updateCandidaturaEtapa` (the path to extend).
- `src/features/decisao/services/decisaoService.ts:137-164` + `src/features/decisao/hooks/useRegistrarDecisao.ts` + `src/features/decisao/components/RegistrarDecisaoForm.tsx` — the service/hook/dialog triad + ≥50 counter.
- `src/features/vagas/hooks/useCandidaturas.ts:394-450` — `useUpdateCandidaturaEtapa` mutation + invalidation.
- `src/features/triagem/components/ComparativoScreen.tsx` + `src/components/pages/ComparativoCandidatosPage.tsx:114-134` — the OPER-04 rewire target.
- `supabase/tests/sec02_smokes.sql`, `supabase/tests/funil12_status_rpc_smoke.sql` — JWT-impersonation smoke idiom (set_config request.jwt.claims + SET ROLE authenticated; disposable fixture; ROLLBACK-free cleanup).
- `31-CONTEXT.md`, `31-UI-SPEC.md`, `.planning/REQUIREMENTS.md`, `CLAUDE.md` — locked decisions, UI contract, requirements, project rules.

### Secondary (MEDIUM confidence)
- MEMORY (auto-memory) — Phase 8 survivor double-write lesson; Phase 8 `'texto'`→`texto_curto` 22P02; MCP `apply_migration` bypasses 42601; DBMIG-02 GUC predicate; `select('*')` PII leak reference.

### Tertiary (LOW confidence)
- None — this phase required no external/web research (fully in-codebase).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all libs in production use.
- Architecture (RPC auth, migration, service/hook/dialog): HIGH — every pattern has a live verified analog in-repo.
- Pitfalls: HIGH — the DROP-overload landmine and stale-`etapa_justificativa` hazard are derived directly from the verified trigger body and `database.types.ts` signatures; the double-write and 22P02 lessons are logged in MEMORY.

**Research date:** 2026-07-14
**Valid until:** 2026-08-13 (stable — internal codebase patterns; the only volatility is if `database.types.ts` or the trigger body changes before planning, which this phase controls).
