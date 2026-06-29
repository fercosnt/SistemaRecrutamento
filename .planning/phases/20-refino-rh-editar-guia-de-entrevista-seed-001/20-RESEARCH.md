# Phase 20: Refino RH — Editar Guia de Entrevista (SEED-001) - Research

**Researched:** 2026-06-29
**Domain:** Supabase Postgres (jsonb dedup + UNIQUE + SECURITY DEFINER upsert RPC) · Deno Edge Function merge-preserve · React/TS edit-mode UI
**Confidence:** HIGH (every claim verified against the live codebase; the design is fully decided — this nails SQL/RPC/merge mechanics)

## Summary

Phase 20 turns the read-only interview guide into an editable one without opening a broad
RH UPDATE policy on `entrevista_guias`. The whole phase is **mechanics on an already-decided
architecture** (CONTEXT.md Áreas 1/2/3 are binding): one new migration (dedup → `UNIQUE` →
`updated_at` → `save_entrevista_guia_edits` RPC), one EF change (`gerar-guia-entrevista`
INSERT → upsert + merge-preserve manual questions), and one front-end edit mode
(EditablePerguntaRow + origem badges + up/down + batch "Salvar edições").

The single highest-risk surface is **the role-derivation source in the RPC**. Every shipped
RPC/RLS policy in this repo reads role from the JWT claim (`auth.jwt() #>> '{app_metadata,role}'`).
But CONTEXT Área 1 **and ENTREV-08 verbatim** require deriving role from `public.usuarios_rh`
inside the SECURITY DEFINER — matching the EF posture (gerar-guia/index.ts:153-168), NOT the
RPC posture (salvar_avaliacao_entrevista:67). This is a deliberate departure with a real
production rationale (the auth-hook can silently degrade RH→candidato in the JWT —
`reference_auth_hook_rls_gap`); the `usuarios_rh` lookup is the authoritative source. The RPC
is the canonical `salvar_avaliacao_entrevista` skeleton with **one block swapped**: replace the
`v_role := auth.jwt()...` line with a `SELECT role FROM public.usuarios_rh WHERE user_id =
auth.uid() AND ativo AND deleted_at IS NULL` lookup + the recrutador→rh map.

The second-highest risk is the **merge-preserve invariant**: a `origem:'manual'` question must
NEVER be silently dropped by a regen. The EF must read the current row, split questions by
`origem`, keep all manual ones, replace IA ones with the fresh generation, then upsert the
merged set — exactly the `.upsert(row, { onConflict })` idiom already used by four shipped EFs.

**Primary recommendation:** Clone `salvar_avaliacao_entrevista` (migration 20260624000002) for
the RPC, swap the role source to `usuarios_rh`, target the new `UNIQUE(candidatura_id, tipo)`
for the upsert; dedup BEFORE adding the constraint via `DELETE ... USING DISTINCT ON`; stamp
`origem:'ia'` in the EF write + `origem:'manual'` in the RPC payload + treat legacy
origem-less questions as `'ia'` in the service normalization. Apply the migration via Supabase
MCP `apply_migration` (human-gated), redeploy the EF via `supabase functions deploy` (human-gated).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Área 1 — Write-path & data model (ENTREV-08)**
- Write mechanism: **RPC SECURITY DEFINER `save_entrevista_guia_edits`** (no Anthropic call → RPC simpler than EF; mirrors `salvar_avaliacao_entrevista`).
- Authorization: role derived from **`usuarios_rh`** (SELECT inside the SECURITY DEFINER, per ENTREV-08 text) + ownership via `candidatura → vaga.created_by` + `administrador` bypass. RH-without-ownership and candidato → denial (`insufficient_privilege`). **NO broad RH UPDATE policy** on entrevista_guias — the RPC is the only write-path. `auth.uid()` is GUC-based (survives SECURITY DEFINER — D-09).
- `origem`: per-question field `origem: 'ia' | 'manual'` INSIDE the guia jsonb (on each question object) + explicit order persisted by array position.
- Upsert key: migration **deduplicates to the most recent row per (candidatura_id, tipo)** + adds `UNIQUE(candidatura_id, tipo)` + `updated_at` column; the RPC does `ON CONFLICT (candidatura_id, tipo)` upsert.

**Área 2 — AI-regen vs manual edits (anti-silent-discard, ENTREV-08)**
- Regen behavior: **merge-preserve** — regen keeps `origem:'manual'` questions and regenerates only the `origem:'ia'` ones; new guide = manual questions + fresh IA questions (manual edits survive; nothing silently discarded).
- `gerar-guia-entrevista` EF changes to **upsert on (candidatura_id, tipo) + preserve manual questions** (EF redeploy — human-gated, PROD precedent). Generated questions marked `origem:'ia'`.
- Save trigger: explicit **"Salvar edições"** button + edit-mode toggle (batch-save the whole edited guide via RPC).

**Área 3 — Edit UI (ENTREV-06/07)**
- Reorder: **up/down buttons** (simpler, keyboard-accessible, no DnD edge cases on a short list).
- Edit scope: inline-edit of `pergunta` (text) + `dimensão`; add manual question (text + dimensão, marked `origem:'manual'`); remove; reorder. IA-only fields (bars_anchors/probes/flags) stay display read-only.
- Auditability: small **`IA` / `Manual`** badge per question (origem visible to RH).

### Claude's Discretion
- Exact form of the dedup migration (CTE keep-latest vs DISTINCT ON) and whether `updated_at` gets a trigger or is set in the RPC.
- How the EF identifies/preserves manual questions in the merge (by origem + text/order match) as long as it NEVER discards a `origem:'manual'`.
- Form of the edit component (EditablePerguntaRow inline vs modal) and where the "Editar"/"Salvar" button lives.
- Whether the RPC validates/normalizes the jsonb (schema guard) before upsert.

### Deferred Ideas (OUT OF SCOPE)
- Editing bars_anchors/probes/flags (AI fields) — out of scope; stay read-only.
- Versioning/history of guide edits (audit trail per edit) — future; this phase marks origem per question but does not store a per-edit diff.
- Live UAT round-trip (RH edits real guide in PROD, regen preserves) → Phase 21.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENTREV-06 | RH edits the text and dimensão of existing questions in the interview guide (online/presencial). | Edit UI §Architecture Patterns Pattern 3 (EditablePerguntaRow inline `Input`+`Select`); RPC upsert persists the whole edited jsonb; service `saveGuiaEdits` §Code Examples. |
| ENTREV-07 | RH adds manual questions (text + dimensão), removes and reorders questions in the guide. | Edit UI add/delete/up-down (UI-SPEC §Interaction Contract); new questions stamped `origem:'manual'` in client edit state; order = array position; RPC stores client-sent array verbatim. |
| ENTREV-08 | Guide edits persist via a secure write-path (RPC authenticate-THEN-authorize: RH role from `usuarios_rh` + ownership via `candidatura → vaga.created_by`, `administrador` bypass; NO broad RH UPDATE policy on `entrevista_guias`); each question marked `origem:'ia'\|'manual'` for audit; AI regen does NOT silently discard manual edits; RNF-07a preserved (guide never writes `candidaturas`). | §Architecture Pattern 1 (RPC role-from-usuarios_rh skeleton) + Pattern 2 (merge-preserve) + §Common Pitfalls 1/2/3 + §Validation Architecture (DENY smoke + merge-preserve Deno test). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persist edited guide (text/dim/add/remove/reorder) | Database (SECURITY DEFINER RPC) | — | ENTREV-08 forbids a broad RH UPDATE policy; the write must be a guarded server-authoritative path. No AI call → RPC, not EF (CONTEXT Área 1). |
| Authorize the edit (role + ownership) | Database (RPC body) | — | RLS is row-level only; the authoritative role check lives in the RPC body (SECURITY DEFINER bypasses RLS, so the guard IS the control). |
| Dedup + UNIQUE + updated_at | Database (migration DDL) | — | Schema change; must precede the RPC's `ON CONFLICT` arbiter (a UNIQUE constraint is required before ON CONFLICT can infer it). |
| Merge-preserve manual questions on regen | API / Edge Function | Database (upsert) | The EF owns generation; it must read-merge-write so a regen never drops manual questions. The DB enforces single-row-per-(candidatura,tipo). |
| Stamp `origem:'ia'` on generated questions | API / Edge Function | — | Provenance of an AI-authored question is known only at generation time. |
| Stamp `origem:'manual'` on added questions | Browser (edit state) → Database (RPC) | — | Human authorship is known client-side; the RPC stores the client-sent array verbatim (defensive: may re-stamp). |
| Edit-mode UI (inline edit, badges, up/down, batch save) | Browser / Client | Frontend (React) | Pure interaction; no server logic. |
| origem normalization (legacy rows → 'ia'; EN→pt-BR) | Frontend Server (service read layer) | — | Same place `normalizeGuia` already bridges questions[]→perguntas[]; carry origem through, default missing→'ia'. |

## Standard Stack

No new packages. This phase is entirely within the existing stack.

### Core (already installed — verified in package.json / migrations / EFs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.x (`https://esm.sh/@supabase/supabase-js@2` in EF; `@/lib/supabase/client` in app) | RPC invoke (`supabase.rpc`), EF invoke, reads | Established project client [VERIFIED: codebase] |
| `@tanstack/react-query` | v5 | `saveEdits` mutation + guide query invalidation | Established server-state layer (`useGuiaEntrevista`) [VERIFIED: codebase] |
| `react-hook-form` + `zod` | installed | Add-question inline form validation (optional) | CLAUDE.md forms convention [VERIFIED: CLAUDE.md] |
| `npm:zod@3.25.76/v4` | 3.25.76 (`/v4` entry) | EF output schema (`InterviewGuideSchema`) — only if a per-question origem is added to the schema | Load-bearing `/v4` pin for the Anthropic/OpenAI structured-output helpers (Pitfall 3, interview-output-schemas.ts:31) [VERIFIED: codebase] |
| PostgreSQL | 15/16 (Supabase) | dedup DDL + UNIQUE + SECURITY DEFINER RPC | Project DB [VERIFIED: codebase] |
| Deno std assert | `https://deno.land/std@0.224.0/assert/mod.ts` | EF merge-preserve unit test | Established Deno test idiom (comparativo test) [VERIFIED: codebase] |

### Supporting (UI primitives — all vendored in `src/components/ui/`, per UI-SPEC)
`Glass`/`GlassButton`, `AsyncState`, `Badge`, `Input`, `Label`, `Select`, `AlertDialog`,
`Skeleton`, `lucide-react` icons. **No new install.** [VERIFIED: 20-UI-SPEC.md §Registry Safety]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RPC for the write | Edge Function | CONTEXT Área 1 LOCKED RPC — no AI call, so an EF adds deploy/cold-start cost for nothing. Do NOT propose an EF. |
| up/down reorder | react-dnd (exists in repo for KanbanBoard) | CONTEXT Área 3 LOCKED up/down — DnD adds edge cases on a 5-7 item list. Do NOT propose DnD. |
| role from `usuarios_rh` | role from JWT claim (RPC precedent) | ENTREV-08 + Área 1 LOCKED `usuarios_rh`. The JWT path is the existing RPC habit but is NOT what this phase requires — see Pitfall 1. |

**Installation:** None. (`npm run db:types` to regenerate `database.types.ts` AFTER the migration applies — see Pitfall 6.)

## Package Legitimacy Audit

> Not applicable — this phase installs **zero** external packages. All libraries are
> already present and pinned in the repo (verified in package.json, EF imports, and
> shipped migrations). No registry resolution, no slopcheck surface.

## Architecture Patterns

### System Architecture Diagram

```
EDIT FLOW (ENTREV-06/07/08)
  RH (browser, edit mode)
    │  edits text/dim, adds origem:'manual' Q, deletes, reorders (local edit state)
    │  click "Salvar edições"  (batch — whole edited guide)
    ▼
  entrevistaService.saveGuiaEdits(candidaturaId, tipo, perguntas[])
    │  supabase.rpc('save_entrevista_guia_edits', { p_candidatura_id, p_tipo, p_guia })
    ▼
  RPC save_entrevista_guia_edits  (SECURITY DEFINER, search_path='')
    ├─ (a) SELECT role FROM public.usuarios_rh WHERE user_id=auth.uid() AND ativo AND deleted_at IS NULL
    │       recrutador→rh ; administrador→administrador ; else→DENY 42501
    ├─ (b) own-vaga: entrevista_guias→candidaturas→vagas.created_by = auth.uid()  (admin bypass) else DENY 42501
    ├─ (c) (optional) jsonb shape guard
    └─ INSERT ... ON CONFLICT (candidatura_id, tipo) DO UPDATE SET guia=EXCLUDED.guia, updated_at=now()
    ▼
  entrevista_guias  (ONE row per candidatura_id,tipo  — UNIQUE)
    │  RNF-07a: NEVER writes candidaturas
    ▼
  getGuia() read-back (allowlist) → normalizeGuia (EN→pt-BR + origem default 'ia') → panel re-renders

REGEN FLOW (merge-preserve, ENTREV-08 hard invariant)
  RH click "Gerar guia (online|presencial)"
    ▼
  gerar-guia-entrevista EF  (two-client, role from usuarios_rh — unchanged auth)
    ├─ read CURRENT entrevista_guias row for (candidatura_id, tipo)
    ├─ split current.questions by origem → manualQs[] (origem:'manual') + iaQs[] (rest)
    ├─ generate fresh IA questions → stamp origem:'ia'
    ├─ merged = manualQs[] ++ freshIaQs[]      ← NO manual question ever dropped
    └─ UPSERT entrevista_guias ON CONFLICT (candidatura_id, tipo)   (was: INSERT)
```

### Recommended Project Structure (touch points — all existing dirs)
```
supabase/migrations/
  20260629xxxxxx_entrevista_guia_edits.sql   # dedup + UNIQUE + updated_at + RPC (NEW)
supabase/functions/gerar-guia-entrevista/
  index.ts                                    # INSERT→upsert + merge-preserve (EDIT ~L318 + read-current)
supabase/functions/_shared/
  interview-output-schemas.ts                 # (optional) add per-question origem to InterviewQuestionSchema
src/features/entrevista/
  services/entrevistaService.ts               # +saveGuiaEdits ; getGuia carries origem (default 'ia')
  hooks/useEntrevistaScorecard.ts             # useGuiaEntrevista +saveEdits mutation
  components/GuiaEntrevistaPanel.tsx          # +edit mode, EditablePerguntaRow, badges, up/down
```

### Pattern 1: SECURITY DEFINER RPC with role-from-`usuarios_rh` (ENTREV-08)

**What:** The `save_entrevista_guia_edits` RPC. Clone of `salvar_avaliacao_entrevista`
(migration 20260624000002) with the role source swapped from JWT to `usuarios_rh`.

**When to use:** This is the ONLY write-path to `entrevista_guias` from a user (no INSERT/UPDATE
RLS policy exists; SECURITY DEFINER bypasses RLS, so the in-body guard IS the control).

**Verified facts that make this safe:**
- A SECURITY DEFINER function with `SET search_path = ''` **can SELECT public tables** —
  shipped precedent: `salvar_avaliacao_entrevista` and `reprocessar_analise` both
  `SELECT ... FROM public.candidaturas JOIN public.vagas` inside `search_path=''` DEFINER
  bodies. The function owner (postgres) has SELECT on `public.usuarios_rh`. [VERIFIED: codebase migrations 20260624000002, 20260610000003]
- `auth.uid()` and `auth.jwt()` read the `request.jwt.claims` GUC and survive SECURITY DEFINER
  (D-09, "Phase-6 proof", repeated in pontuar_sjt/salvar_avaliacao headers). [VERIFIED: codebase]
- The auth-hook (`custom_access_token_hook`, migration 20260420000002) already maps
  `usuarios_rh.role` (recrutador→rh, administrador→administrador, ativo + deleted_at IS NULL)
  into the JWT — so the `usuarios_rh` lookup here uses the **identical** filter the hook uses,
  guaranteeing role parity even if the JWT claim ever drifts. [VERIFIED: codebase]

```sql
-- Source: clone of supabase/migrations/20260624000002_salvar_avaliacao_entrevista_rpc.sql
-- with the role block swapped to usuarios_rh (CONTEXT Área 1 / ENTREV-08). [CITED: codebase]
CREATE OR REPLACE FUNCTION public.save_entrevista_guia_edits(
  p_candidatura_id uuid,
  p_tipo           text,
  p_guia           jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_owner uuid;
  v_role_db    text;
  v_role       text;
BEGIN
  -- (0) tipo guard (mirror the table CHECK)
  IF p_tipo NOT IN ('online', 'presencial') THEN
    RAISE EXCEPTION 'tipo invalido' USING ERRCODE = 'check_violation';
  END IF;

  -- (1) Role from usuarios_rh (NOT the JWT claim) — ENTREV-08 / EF posture.
  --     Same filter as custom_access_token_hook: ativo + deleted_at IS NULL.
  SELECT role INTO v_role_db
    FROM public.usuarios_rh
   WHERE user_id = (select auth.uid())
     AND ativo = true
     AND deleted_at IS NULL
   LIMIT 1;
  v_role := CASE
    WHEN v_role_db = 'recrutador'    THEN 'rh'
    WHEN v_role_db = 'administrador' THEN 'administrador'
    ELSE v_role_db
  END;
  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';  -- 42501
  END IF;

  -- (2) Ownership: the candidatura's vaga must be owned by the rh; admin bypasses.
  SELECT v.created_by INTO v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id
   LIMIT 1;
  IF v_vaga_owner IS NULL THEN
    RAISE EXCEPTION 'candidatura % nao encontrada' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';  -- 42501
  END IF;

  -- (3) (optional, Claude's discretion) shape guard: p_guia must carry a questions/perguntas array.
  IF p_guia IS NULL OR jsonb_typeof(p_guia) <> 'object' THEN
    RAISE EXCEPTION 'guia invalida' USING ERRCODE = 'check_violation';
  END IF;

  -- (4) Upsert — the single write-path. updated_at set here (no trigger needed).
  --     RNF-07a: NEVER touches candidaturas.
  INSERT INTO public.entrevista_guias (candidatura_id, tipo, guia, updated_at)
       VALUES (p_candidatura_id, p_tipo, p_guia, now())
  ON CONFLICT (candidatura_id, tipo)
  DO UPDATE SET guia = EXCLUDED.guia, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'candidatura_id', p_candidatura_id, 'tipo', p_tipo);
END;
$$;

REVOKE ALL ON FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb) TO authenticated;
```

**Anti-pattern:** Do NOT copy `salvar_avaliacao_entrevista`'s `v_role := auth.jwt() #>>
'{app_metadata,role}'` line. That is the exact thing ENTREV-08 deviates from. The role MUST
come from `usuarios_rh`.

### Pattern 2: Dedup-THEN-UNIQUE migration (order is load-bearing)

**What:** Collapse the existing multiple `entrevista_guias` rows to the latest per
`(candidatura_id, tipo)`, THEN add the constraint the RPC's `ON CONFLICT` needs.

**When to use:** Once, in the migration, BEFORE the RPC `CREATE`. `ON CONFLICT (candidatura_id,
tipo)` requires a unique index/constraint to already exist as an arbiter
[CITED: postgresql.org/docs/16/sql-insert.html]; and `ADD CONSTRAINT ... UNIQUE` will FAIL with
duplicate-key (23505) if duplicates remain. So the order is strictly: **dedup → UNIQUE →
updated_at → RPC.**

```sql
-- Source: PostgreSQL DISTINCT ON keep-latest dedup. [CITED: postgresql.org/docs/16/queries-select.html]
-- (1) dedup: keep the most recent row per (candidatura_id, tipo); delete the rest.
DELETE FROM public.entrevista_guias g
 WHERE g.id NOT IN (
   SELECT DISTINCT ON (candidatura_id, tipo) id
     FROM public.entrevista_guias
    ORDER BY candidatura_id, tipo, created_at DESC, id DESC   -- id DESC = deterministic tie-break
 );

-- (2) updated_at column (NULLs backfilled from created_at so reads never see a null).
ALTER TABLE public.entrevista_guias
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.entrevista_guias SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.entrevista_guias
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- (3) the arbiter the RPC + EF upsert need.
ALTER TABLE public.entrevista_guias
  ADD CONSTRAINT entrevista_guias_candidatura_tipo_key UNIQUE (candidatura_id, tipo);
```

**Discretion notes (CONTEXT):** `DISTINCT ON` is preferred over a window-function CTE for
brevity and the deterministic `(candidatura_id, tipo, created_at DESC, id DESC)` ordering. Set
`updated_at` in the RPC/EF (`now()`) rather than a trigger — both writers already set it
explicitly, so a trigger is redundant surface.

### Pattern 3: EF merge-preserve (INSERT → upsert)

**What:** Change `gerar-guia-entrevista/index.ts` from a blind `.insert()` (L318) to a
read-merge-upsert that NEVER drops a `origem:'manual'` question.

**When to use:** Every regen. The hard invariant (CONTEXT Área 2 / §specifics): "nenhuma
pergunta `origem:'manual'` some após um regen."

```typescript
// Source: clones the .upsert(row,{onConflict}) idiom shipped in
// gerar-devolutiva-bigfive/index.ts:460 + analise-candidato-individual/index.ts:316. [CITED: codebase]

// (a) read the CURRENT guide for (candidatura_id, tipo) — allowlist, not select('*').
const { data: currentRow } = await supabaseAdmin
  .from("entrevista_guias")
  .select("guia")
  .eq("candidatura_id", body.candidatura_id)
  .eq("tipo", body.tipo)
  .maybeSingle();

// (b) split current questions by origem. Legacy/origem-less → treat as 'ia' (replaceable).
const currentQs = (currentRow?.guia?.questions ?? currentRow?.guia?.perguntas ?? []) as Array<Record<string, unknown>>;
const manualQs = currentQs.filter((q) => q.origem === "manual");   // PRESERVE — never dropped

// (c) freshly-generated IA questions get stamped origem:'ia'.
const freshIaQs = (guide?.questions ?? []).map((q) => ({ ...q, origem: "ia" as const }));

// (d) merged set: manual first (stable), then fresh IA. Order is the new array order.
const mergedQuestions = [...manualQs, ...freshIaQs];

// (e) UPSERT (was .insert) — the UNIQUE(candidatura_id,tipo) arbiter collapses to one row.
await supabaseAdmin.from("entrevista_guias").upsert(
  {
    candidatura_id: body.candidatura_id,
    tipo: body.tipo,
    guia: guide ? { ...guide, questions: mergedQuestions } : { incompleto: true, flags: persistFlags },
    prompt_version: resolved.prompt_version,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "candidatura_id,tipo" },
);
```

**Discretion notes (CONTEXT):** identify manual questions by `origem === 'manual'` (NOT by
text/order match — the field is authoritative and survives reorder/edit). If a generation
FAILS (`guide == null`), do NOT wipe manual questions — either preserve the existing row
untouched (skip the upsert) or upsert `{ ...existing, flags }` so manual questions survive a
failed regen too.

### Pattern 4: Service `saveGuiaEdits` + origem-aware `normalizeGuia`

**What:** A new service write (mirrors `salvarAvaliacao`) + carry `origem` through the read
normalization, defaulting missing→'ia'.

```typescript
// Source: mirrors salvarAvaliacao (entrevistaService.ts:446) + normalizeGuia (L274). [CITED: codebase]
export async function saveGuiaEdits(
  candidaturaId: string, tipo: TipoEntrevista, perguntas: GuiaPergunta[],
): Promise<EntrevistaGuiaRow | null> {
  if (!candidaturaId) throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  // The RPC stores the array verbatim; the client stamps origem:'manual' on added rows.
  const { error } = await supabase.rpc('save_entrevista_guia_edits', {
    p_candidatura_id: candidaturaId,
    p_tipo: tipo,
    p_guia: { perguntas },          // pt-BR shape; the RPC stores opaque jsonb
  })
  if (error) throw mapRpcError(error, 'Não foi possível salvar as edições do guia. Tente novamente.')
  return getGuia(candidaturaId)     // read-back via allowlist (origem default 'ia')
}

// normalizeGuia: carry q.origem through; legacy/missing → 'ia' (legacy rows are AI-generated).
const perguntas = questions.map((q) => ({
  ...q,
  pergunta: typeof q.question === 'string' ? q.question : '',
  dimensao: typeof q.competency === 'string' ? q.competency : null,
  origem: q.origem === 'manual' ? 'manual' : 'ia',   // ← default 'ia' (UI-SPEC L57)
}))
```

`mapRpcError` already maps `42501 → FORBIDDEN`, `23514 → INVALID_INPUT`,
`no_data_found → NOT_FOUND` (entrevistaService.ts:412) — reuse it verbatim. [VERIFIED: codebase]

### Anti-Patterns to Avoid
- **Broad RH UPDATE policy on entrevista_guias** — explicitly forbidden by ENTREV-08. Keep the
  SELECT-only RLS; the RPC is the only write-path.
- **`select('*')` on entrevista_guias** — RLS is row-level only and does NOT hide columns; the
  guide carries candidate-context PII. Use the existing `ENTREVISTA_GUIA_ALLOWLIST`
  (`reference_select_star_leaks_pii`). [VERIFIED: codebase]
- **Role from JWT claim in the RPC** — see Pattern 1 anti-pattern.
- **`.insert()` left in the EF** — leaving the blind insert orphans the manual edits (the exact
  ENTREV-08 risk). Must become an upsert on the UNIQUE arbiter.
- **Echoing the raw Supabase/RPC error in the UI** — UI-SPEC requires static PT-BR copy keyed by
  code (PII discipline T-18-04). `insufficient_privilege` → "Você não tem permissão para editar
  este guia."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authorize the write | Custom RLS + client checks | The DEFINER RPC role+ownership guard (Pattern 1) | RLS can't express "own-vaga via 2 joins"; the shipped RPC idiom already does it. |
| Single-row-per-(candidatura,tipo) | App-side "delete then insert" | `UNIQUE` + `ON CONFLICT` upsert | Atomic, race-safe (postgres UPSERT guarantee); app-side delete+insert has a window. |
| Dedup existing rows | Hand-written loop | `DELETE ... NOT IN (DISTINCT ON ...)` | One statement, deterministic, no app round-trips. |
| Error→message mapping | New mapper | Existing `mapRpcError` (entrevistaService.ts:412) | Already handles 42501/23514/no_data_found. |
| EN→pt-BR + origem bridge | New normalizer | Extend existing `normalizeGuia` | One place already bridges questions[]→perguntas[]. |
| Reorder | react-dnd | up/down buttons (LOCKED) + array swap | CONTEXT Área 3; DnD is over-engineering for 5-7 items. |
| Delete confirmation | Custom modal | Existing `AlertDialog` idiom (UI-SPEC) | Established (RedacaoOverrideForm, RegistrarDecisaoForm). |

**Key insight:** Almost everything here is a clone-with-one-swap of a shipped Phase-14 artifact.
The only genuinely new reasoning is the merge-preserve split and the role-source swap.

## Runtime State Inventory

> Rename/refactor/migration-flavored because of the dedup + schema-add + EF write-path change.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `public.entrevista_guias` has **multiple rows per (candidatura_id, tipo)** today (the EF INSERTs per regen; getGuia reads latest by created_at DESC). Existing rows have **no `origem` field** and **no `updated_at`**. | **Data migration:** dedup to latest (Pattern 2) — the older orphan rows are deleted; their content was already not surfaced (getGuia only ever returned the latest). Backfill `updated_at` from `created_at`. Legacy questions get NO `origem` stamp at rest → the **read layer** defaults them to `'ia'` (no data backfill needed; safe because legacy guides are wholly AI-generated). |
| Live service config | `gerar-guia-entrevista` EF is deployed in PROD (JWT-ON). Its bundled `_shared/*` is frozen per-EF (`reference_ef_shared_bundle_freeze`). | **Redeploy** the EF after the index.ts change (human-gated, PROD precedent). The merge logic is in index.ts (not _shared) so no cross-EF drift. |
| OS-registered state | None — no OS-level registrations involve this string/table. | None — verified by scope (web app + Supabase only). |
| Secrets/env vars | None new. The EF already reads `SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`/AI keys; the RPC needs none. | None. |
| Build artifacts | `database.types.ts` (repo ROOT, NOT src/types/) is generated and will be **stale** after the migration: it won't know `updated_at`, the new RPC, or the UNIQUE. | **Regenerate** via `npm run db:types` AFTER apply (Pitfall 6). Until then, a `as never`/cast may be needed on the new RPC name + `updated_at` (drop the casts once regenerated — `feedback_integration_contract_gap`). |

**The canonical question — after every file is updated, what runtime systems still have stale state?**
(1) The **deployed EF** keeps the old INSERT until redeployed. (2) `database.types.ts` stays
stale until `npm run db:types`. (3) Any in-PROD duplicate `entrevista_guias` rows persist until
the dedup DELETE runs. All three are addressed above.

## Common Pitfalls

### Pitfall 1: Copying the JWT-claim role check instead of the `usuarios_rh` lookup
**What goes wrong:** The obvious move is to clone `salvar_avaliacao_entrevista` verbatim,
keeping `v_role := auth.jwt() #>> '{app_metadata,role}'`. That violates ENTREV-08 (which
explicitly says "role RH derivado de `usuarios_rh`") and re-introduces the silent-403 landmine
the EF was built to avoid.
**Why it happens:** Every other RPC in the repo uses the JWT claim; it's the path of least
resistance and the copy-source uses it.
**How to avoid:** Swap block (1) to the `usuarios_rh` SELECT with the recrutador→rh map
(Pattern 1). Verify in the smoke that a JWT-claim-says-rh-but-no-usuarios_rh-row user is DENIED
(authoritative source is the table, not the claim).
**Warning signs:** The RPC body contains `auth.jwt()` for role; the smoke passes a JWT claim
but no `usuarios_rh` row and still authorizes.

### Pitfall 2: Adding UNIQUE before deduping (or upserting before UNIQUE exists)
**What goes wrong:** `ADD CONSTRAINT ... UNIQUE` fails with `23505` if duplicates remain; or
the RPC/EF `ON CONFLICT (candidatura_id, tipo)` fails at runtime ("no unique or exclusion
constraint matching") if the constraint isn't there yet.
**Why it happens:** Statement ordering inside the migration is easy to get backwards.
**How to avoid:** Strict order — dedup DELETE → updated_at → `ADD CONSTRAINT UNIQUE` → `CREATE
FUNCTION`. The constraint name must be referenced/inferable by the upsert
[CITED: postgresql.org/docs/16/sql-insert.html].
**Warning signs:** Migration aborts on the ALTER; or the first regen 500s on a conflict-target error.

### Pitfall 3: A failed regen wiping manual questions
**What goes wrong:** If the EF upserts unconditionally and the AI call returns `guide == null`
(parse fail / injection), a naive upsert could overwrite the row with `{ incompleto: true }`,
**dropping the manual questions** — the precise invariant ENTREV-08 forbids.
**Why it happens:** The existing EF persists `guide ?? { incompleto: true, flags }` (L321).
That fallback must NOT clobber manual questions.
**How to avoid:** On `guide == null`, either skip the write entirely (keep the current row) or
merge `manualQs` into the incompleto payload. The merge must run BEFORE the never-absent
fallback. Test it (Validation §EF merge-preserve, failed-regen case).
**Warning signs:** A Deno test where generation fails and `manualQs` disappear from the upserted row.

### Pitfall 4: The 42601 multi-statement migration error (project-known)
**What goes wrong:** A migration with a `CREATE FUNCTION ... $$ ... $$` body adjacent to
`REVOKE`/`GRANT`/`COMMENT` fails via `supabase db push --linked` on the transaction pooler with
`SQLSTATE 42601: cannot insert multiple commands into a prepared statement`.
**Why it happens:** The CLI driver wraps each migration in its own implicit transaction; an
extra `BEGIN;...COMMIT;` or the multi-statement prepared-statement path trips the pooler.
**How to avoid:** Apply via **Supabase MCP `apply_migration`** (the established M2 path —
bypasses 42601, writes the version row itself). Do NOT wrap the file in `BEGIN;...COMMIT;`
(D-22). This is a human-gated [BLOCKING] step. [VERIFIED: CLAUDE.md §Commands + STATE/MEMORY]
**Warning signs:** Planning a `db push --linked` apply for a PL/pgSQL migration. Note: MCP
`apply_migration` writes a timestamp-version row, which can cause `db push` version-drift later
(MEMORY Phase 11) — accept it as cosmetic; stay on the MCP path.

### Pitfall 5: Stale `database.types.ts` blocking the build
**What goes wrong:** The service calls `supabase.rpc('save_entrevista_guia_edits', ...)` and
reads `updated_at`, but `database.types.ts` (repo root) predates the migration → TS errors /
forced `as never` casts.
**Why it happens:** Types are generated; the migration must apply first.
**How to avoid:** Sequence: apply migration (MCP) → `npm run db:types` → drop any temporary
casts (`feedback_integration_contract_gap`). If types can't regenerate before code lands, a
single localized cast on the rpc name is acceptable, removed in the apply wave.
**Warning signs:** `as never` casts left in the service after the apply wave; `tsc` baseline regresses.

### Pitfall 6: Over-projecting the guide read (PII)
**What goes wrong:** Switching `getGuia` to `select('*')` to grab `updated_at` leaks more than
the allowlist.
**How to avoid:** Extend `ENTREVISTA_GUIA_ALLOWLIST` to add `, updated_at` explicitly; never
star (`reference_select_star_leaks_pii`). [VERIFIED: codebase]

## Code Examples

(See Patterns 1-4 above for the load-bearing SQL/TS — all sourced from shipped artifacts.)

### DENY smoke skeleton (SQL — simulate JWT + usuarios_rh; expect 42501)
```sql
-- Source: M2 smoke idiom (set_config request.jwt.claims) + the usuarios_rh authoritative source.
-- Run in a disposable fixture (precedent: Phase 7/8/11 SQL smokes via execute_sql + ROLLBACK).
-- candidato → DENY 42501:
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<candidato_user_id>', 'role', 'authenticated',
    'app_metadata', json_build_object('role','candidato'))::text, true);
-- expect: ERROR insufficient_privilege (no usuarios_rh row → role NULL → DENY)
SELECT public.save_entrevista_guia_edits('<cand_id>'::uuid, 'online', '{"perguntas":[]}'::jsonb);

-- RH-without-ownership → DENY 42501 (has usuarios_rh row, but vaga.created_by != auth.uid()):
SELECT set_config('request.jwt.claims',
  json_build_object('sub','<rh_other_user_id>','role','authenticated',
    'app_metadata', json_build_object('role','rh'))::text, true);
SELECT public.save_entrevista_guia_edits('<cand_id>'::uuid, 'online', '{"perguntas":[]}'::jsonb);

-- RH-with-ownership → OK (usuarios_rh recrutador row + owns the vaga):
SELECT set_config('request.jwt.claims',
  json_build_object('sub','<rh_owner_user_id>','role','authenticated',
    'app_metadata', json_build_object('role','rh'))::text, true);
SELECT public.save_entrevista_guia_edits('<cand_id>'::uuid, 'online',
  '{"perguntas":[{"pergunta":"...","dimensao":"X","origem":"manual"}]}'::jsonb);  -- expect ok=true
```
**Note:** Because the RPC reads role from `usuarios_rh` (not the claim), the smoke must also
seed/clear the `usuarios_rh` row to exercise the authoritative path — set the JWT `sub` to a
user that has (or lacks) an `ativo` recrutador row. The JWT `app_metadata.role` is intentionally
irrelevant to the decision (that's the ENTREV-08 deviation being verified).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| EF `.insert()` per regen (orphan rows; latest-wins read) | upsert on `UNIQUE(candidatura_id, tipo)` + merge-preserve | This phase | One row per (cand,tipo); manual edits survive regen. |
| Guide is read-only (Phase 14) | RH edit mode + DEFINER write RPC | This phase | RH can refine the AI guide; provenance tracked by `origem`. |
| RPC role from JWT claim (all M2 RPCs) | RPC role from `usuarios_rh` (this RPC only) | This phase | Authoritative role source; immune to JWT-claim drift (auth-hook gap). |

**Deprecated/outdated:** none introduced; `salvar_avaliacao_entrevista`'s JWT-claim role check
remains valid for that RPC (not changed here).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The InterviewGuideSchema (EF output) does NOT need a per-question `origem` field added — the EF stamps `origem:'ia'` AFTER the parse (in TS), not via the LLM schema. | Standard Stack / Pattern 3 | LOW. If the planner prefers schema-level origem, add `origem: z.literal('ia').optional()` to `InterviewQuestionSchema` (interview-output-schemas.ts:67). The post-parse stamp is simpler and avoids re-pinning the `/v4` helper surface. Confirm during planning. |
| A2 | Legacy origem-less questions are safe to treat as `'ia'` (replaceable on regen) because every legacy guide is wholly AI-generated (no edit path existed pre-Phase-20). | Runtime State / Pattern 4 | LOW — verified by design: there was no manual-question path before this phase. |
| A3 | Migration timestamp `20260629xxxxxx` (or later) is free; the latest applied migration is `20260624000004`. | Project Structure | LOW — pick the next free timestamp at planning time. |
| A4 | The `usuarios_rh` table has columns `user_id`, `role`, `ativo`, `deleted_at` (used by the auth-hook + EF). | Pattern 1 | NONE — verified in custom_access_token_hook + gerar-guia EF. |

**Note:** Assumptions A1/A3 are planner-resolvable from the codebase; A2/A4 are verified. No
user confirmation required (the architecture is already locked in CONTEXT.md).

## Open Questions

1. **Should `origem` live in the EF output Zod schema, or be stamped post-parse?**
   - What we know: The EF can stamp `origem:'ia'` in TS after `callAi` returns (Pattern 3 (c)),
     which keeps the LLM contract unchanged.
   - What's unclear: Whether the planner wants schema-level enforcement.
   - Recommendation: Stamp post-parse (A1). Add to the schema only if a later phase lets the AI
     itself emit mixed provenance (not this phase).

2. **`updated_at`: RPC/EF-set vs trigger?**
   - What we know: Both writers (RPC + EF upsert) set `now()` explicitly.
   - Recommendation: Explicit set in both (no trigger) — fewer moving parts, no double-write
     ambiguity (CONTEXT discretion).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP `apply_migration` | Applying the dedup+RPC migration to PROD | ✓ | MCP server connected | None needed (established M2 path; bypasses 42601) |
| `supabase` CLI (`functions deploy`, `db:types`) | EF redeploy + types regen | ✓ (project uses it; CLAUDE.md commands) | — | MCP `deploy_edge_function` for the EF; types can be hand-patched short-term |
| Deno | EF merge-preserve unit test | ✓ (existing `*.test.ts` EF suite) | std@0.224.0 | — |
| Vitest | service/hook/UI tests | ✓ (419/419 baseline) | installed | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none material.

## Validation Architecture

> `workflow.nyquist_validation: true` in config.json → this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (front) + Deno std assert (EF) + SQL smokes (RPC/migration, in disposable fixture) |
| Config file | `vitest.config.ts` (front); Deno tests run per-dir; SQL smokes run via Supabase MCP `execute_sql` in a `ROLLBACK`-able fixture |
| Quick run command | `npm run test:run -- src/features/entrevista` |
| Full suite command | `npm run test:run && npm run lint && npm run build` (+ `deno test --allow-read supabase/functions/gerar-guia-entrevista/`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENTREV-08 | RPC DENY: candidato → 42501 | SQL smoke | MCP `execute_sql` (set_config jwt.claims + no usuarios_rh row) | ❌ Wave 0 (smoke script) |
| ENTREV-08 | RPC DENY: RH-without-ownership → 42501 | SQL smoke | MCP `execute_sql` (usuarios_rh row + vaga owned by other) | ❌ Wave 0 |
| ENTREV-08 | RPC OK: RH-with-ownership + admin bypass | SQL smoke | MCP `execute_sql` | ❌ Wave 0 |
| ENTREV-08 | RPC upsert collapses to one row on conflict | SQL smoke | MCP `execute_sql` (two saves → assert 1 row) | ❌ Wave 0 |
| ENTREV-08 | Migration dedup leaves exactly latest per (cand,tipo) | SQL smoke | MCP `execute_sql` (seed 3 rows → run dedup → assert 1) | ❌ Wave 0 |
| ENTREV-08 | Role from usuarios_rh NOT JWT (claim says rh, no row → DENY) | SQL smoke | MCP `execute_sql` | ❌ Wave 0 |
| ENTREV-08 | Merge-preserve: manual question survives a regen | Deno test | `deno test --allow-read supabase/functions/gerar-guia-entrevista/` | ❌ Wave 0 (`_local/merge-preserve.test.ts` or index test) |
| ENTREV-08 | Merge-preserve: failed regen (guide=null) does NOT drop manual | Deno test | same | ❌ Wave 0 |
| ENTREV-08 | EF stamps origem:'ia' on generated questions | Deno test | same | ❌ Wave 0 |
| ENTREV-06/07 | service `saveGuiaEdits` calls the RPC with `{perguntas}` + maps 42501→FORBIDDEN | vitest | `npm run test:run -- entrevistaService` | ⚠️ extend existing |
| ENTREV-06/07 | `normalizeGuia` carries origem; missing→'ia' | vitest | `npm run test:run -- guia-normalize` | ⚠️ extend `guia-normalize.test.ts` |
| ENTREV-06/07 | `useGuiaEntrevista` exposes `saveEdits` + invalidates guide key | vitest | `npm run test:run -- useEntrevistaScorecard` | ⚠️ extend existing |
| ENTREV-06/07 | Edit-mode UI: inline edit / add(origem manual) / delete confirm / up-down / badge / batch save states | vitest (RTL) | `npm run test:run -- GuiaEntrevistaPanel` | ❌ Wave 0 (component test) |
| ENTREV-08 | client→RPC contract: payload carries no score/band (anti-tamper) | vitest | `npm run test:run -- entrevista-contract` | ⚠️ extend `entrevista-contract.test.ts` |

### Sampling Rate
- **Per task commit:** `npm run test:run -- src/features/entrevista` (+ `deno test ...gerar-guia-entrevista/` when the EF is touched).
- **Per wave merge:** `npm run test:run && npm run lint`.
- **Phase gate:** full suite green + `npm run build` 0 errors before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts` (or index test) — covers ENTREV-08 merge invariant (incl. failed-regen + origem stamp). Needs the handler refactored so the merge is unit-testable with an injected `supabaseAdmin` mock capturing `.upsert()` (precedent: comparativo/devolutiva Deno tests).
- [ ] SQL smoke script for the RPC DENY/OK + upsert + dedup + role-from-usuarios_rh (run via MCP `execute_sql` in a disposable fixture — precedent Phase 7/8/11).
- [ ] `src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx` — edit-mode interaction (RTL).
- [ ] Extend `guia-normalize.test.ts` (origem default 'ia'), `entrevista-contract.test.ts` (RPC payload anti-tamper), `entrevistaService` + `useEntrevistaScorecard` tests (saveGuiaEdits/saveEdits).

**Live-only → Phase 21:** the real RH-edits-PROD-guide → regen-preserves round-trip (CONTEXT
defers the UAT). The Deno/SQL/vitest layers above prove the invariant deterministically without
PROD; only the end-to-end live confirmation is deferred.

## Security Domain

> `security_enforcement` absent in config → treated as enabled. This phase adds a new
> user-callable write-path to candidate-context data — the security surface is the RPC guard.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Single secured write-path (DEFINER RPC); no broad RLS UPDATE (ENTREV-08). |
| V4 Access Control | **yes (core)** | RPC role-from-`usuarios_rh` + own-vaga (`vagas.created_by=auth.uid()`) + admin bypass; REVOKE PUBLIC + GRANT authenticated; SELECT-only RLS on the table. |
| V5 Input Validation | yes | `.strict()` EF body (unchanged); RPC `tipo`/jsonb-shape guards; client never posts a score/band (anti-tamper). |
| V7 Error Handling/Logging | yes | UI never echoes raw RPC error (PII); EF logs redacted (ids/counts only — LGPD-02, gerar-guia:325). |
| V8 Data Protection (LGPD) | yes | Guide read stays allowlist-projected (no `select('*')`); guide is RH/admin-only (candidate-DENY RLS unchanged). RNF-07a: write never touches `candidaturas`. |
| V6 Cryptography | no | No crypto introduced. |

### Known Threat Patterns for Supabase RPC + EF
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — RH edits another vaga's guide | Elevation of Privilege | own-vaga guard in the RPC (entrevista_guias→candidaturas→vagas.created_by) |
| Privilege via JWT-claim spoof | Spoofing/EoP | role read from `usuarios_rh` (authoritative), NOT the JWT claim — defeats a forged/stale claim |
| Candidate calls the RPC | EoP | `usuarios_rh` lookup returns no row → role NULL → 42501; GRANT only to authenticated + REVOKE PUBLIC |
| Manual question silently dropped by regen | Tampering/Repudiation | merge-preserve invariant + Deno test; `origem` audit field |
| Anti-tamper: client posts a score/band on the guide | Tampering | RPC stores opaque jsonb (no score semantics); guide never feeds candidaturas (RNF-07a) |
| PII leak via over-projection or raw error | Information Disclosure | allowlist read + static PT-BR error copy (no raw error echo) |

## Sources

### Primary (HIGH confidence)
- Live codebase (read this session): `supabase/migrations/20260624000002_salvar_avaliacao_entrevista_rpc.sql` (RPC skeleton), `20260624000001_entrevista_cognitivo_tables.sql` (entrevista_guias schema + RLS), `20260420000002_unified_auth_role.sql` (usuarios_rh role mapping + filter), `20260610000003_reprocessar_rpc.sql` (DEFINER reads public.vagas), `supabase/functions/gerar-guia-entrevista/index.ts` (INSERT L318 + two-client auth L143-199), `_shared/interview-output-schemas.ts`, `_shared/entrevista-schemas.ts`, `src/features/entrevista/services/entrevistaService.ts`, `hooks/useEntrevistaScorecard.ts`, `components/GuiaEntrevistaPanel.tsx`, gerar-devolutiva-bigfive/analise-candidato-individual EFs (`.upsert(row,{onConflict})` precedent).
- CONTEXT.md + UI-SPEC.md (binding decisions), REQUIREMENTS.md (ENTREV-06/07/08), config.json (nyquist on), CLAUDE.md (42601 workaround, security rules, RNF-07a).
- `docs.postgresql.org/16/sql-insert.html` — `ON CONFLICT (...) DO UPDATE` + `EXCLUDED` + unique-arbiter requirement.
- MEMORY references: `reference_select_star_leaks_pii`, `reference_auth_hook_rls_gap`, `reference_ef_shared_bundle_freeze`, `feedback_integration_contract_gap`, M2 MCP-apply / 42601 precedent.

### Secondary (MEDIUM confidence)
- None required — the design is fully grounded in shipped artifacts.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries verified in-repo.
- Architecture (RPC/dedup/merge): HIGH — direct clones of shipped Phase-14 / Phase-12-13 artifacts; Postgres semantics confirmed against official docs.
- Role-from-usuarios_rh inside DEFINER: HIGH — same filter as the live auth-hook; DEFINER-reads-public-table proven by two shipped RPCs.
- Pitfalls: HIGH — each is a documented project incident (42601, stale types, select-star PII, EF bundle freeze) or a direct consequence of the ordering/invariant.

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (stable — internal codebase patterns; no fast-moving external deps)
