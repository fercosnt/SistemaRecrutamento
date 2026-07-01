# Phase 20: Refino RH — Editar Guia de Entrevista (SEED-001) - Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 6 source files to create/modify + 5 test surfaces
**Analogs found:** 6 / 6 (every source file has an exact or role-match in-repo analog; this phase is almost entirely clone-with-one-swap)

> **Key insight (RESEARCH L421):** Almost everything here is a clone-with-one-swap of a shipped Phase-14 / Phase-12-13 artifact. The only genuinely new reasoning is (a) the RPC role-source swap (JWT claim → `usuarios_rh`) and (b) the EF merge-preserve split. Both are mapped below with the exact source lines to copy and the single line to change.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20260629xxxxxx_entrevista_guia_edits.sql` (NEW) | migration (DDL + RPC) | CRUD (upsert) | `supabase/migrations/20260624000002_salvar_avaliacao_entrevista_rpc.sql` | exact (clone-with-one-swap) |
| `supabase/functions/gerar-guia-entrevista/index.ts` (MODIFY ~L318) | service (Edge Function) | transform + CRUD (read-merge-upsert) | `supabase/functions/gerar-devolutiva-bigfive/index.ts:458-471` + `analise-candidato-individual/index.ts:316` | exact (idiom) |
| `supabase/functions/_shared/interview-output-schemas.ts` (MODIFY, optional) | schema (Zod) | transform | self (`InterviewQuestionSchema` L67) | self (post-parse stamp preferred — A1) |
| `src/features/entrevista/services/entrevistaService.ts` (MODIFY) | service (data layer) | request-response (RPC + read-back) | `salvarAvaliacao` (L446) + `normalizeGuia` (L274) + `mapRpcError` (L412) | exact (same file, sibling fns) |
| `src/features/entrevista/hooks/useEntrevistaScorecard.ts` (MODIFY) | hook (TanStack Query) | request-response (mutation + invalidate) | `useGuiaEntrevista` gerar mutation (L84-89) | exact (same hook, sibling mutation) |
| `src/features/entrevista/components/GuiaEntrevistaPanel.tsx` (MODIFY + NEW EditablePerguntaRow) | component | event-driven (edit state) | `PerguntaRow` (L49-69, same file) + `RedacaoOverrideForm`/`CognitivoBandCard` AlertDialog + `AsyncState` | role-match (assembled from 3 analogs) |
| TESTS (Deno + SQL smoke + vitest) | test | — | `analise-candidato-individual/__tests__/index.test.ts` (Deno) + `guia-normalize.test.ts` + `useEntrevistaScorecard.test.ts` (vitest) + M2 SQL smoke idiom | exact |

---

## Pattern Assignments

### `supabase/migrations/20260629xxxxxx_entrevista_guia_edits.sql` (migration, DDL + SECURITY DEFINER upsert RPC)

**Analog:** `supabase/migrations/20260624000002_salvar_avaliacao_entrevista_rpc.sql` (the canonical role+own-vaga DEFINER RPC) + `supabase/migrations/20260420000002_unified_auth_role.sql:43-56` (the authoritative `usuarios_rh` lookup to swap IN).

**Statement order is load-bearing (RESEARCH Pattern 2 / Pitfall 2):** dedup DELETE → `updated_at` column → `ADD CONSTRAINT UNIQUE` → `CREATE FUNCTION`. ON CONFLICT needs the arbiter to exist first; ADD UNIQUE fails 23505 if dupes remain.

**RPC skeleton to clone** — `salvar_avaliacao_entrevista` header + REVOKE/GRANT (lines 34-100):
```sql
CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(
  p_candidatura_id uuid, p_scores_humanos jsonb, p_notas text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_vaga_owner uuid; v_role text; v_analise_id uuid;
BEGIN
  -- ... own-vaga via candidaturas JOIN vagas ...
  v_role := (select auth.jwt() #>> '{app_metadata,role}');     -- ← THE LINE TO SWAP
  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- ...
END; $$;
REVOKE ALL ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) TO authenticated;
```

**THE ONE SWAP (RESEARCH Pitfall 1 — the highest-risk surface):** Replace `salvar_avaliacao_entrevista:67`'s `v_role := (select auth.jwt() #>> '{app_metadata,role}')` with the `usuarios_rh` lookup. Copy the EXACT filter from `20260420000002_unified_auth_role.sql:43-56` (the auth-hook — guarantees role parity even if the JWT claim drifts):
```sql
-- Source: supabase/migrations/20260420000002_unified_auth_role.sql:43-56 (identical filter)
SELECT role INTO v_role_db
  FROM public.usuarios_rh
 WHERE user_id = (select auth.uid())     -- GUC-based; survives SECURITY DEFINER (D-09)
   AND ativo = true
   AND deleted_at IS NULL
 LIMIT 1;
v_role := CASE
  WHEN v_role_db = 'recrutador'    THEN 'rh'
  WHEN v_role_db = 'administrador' THEN 'administrador'
  ELSE v_role_db
END;
```
> **Anti-pattern (do NOT copy):** keeping `auth.jwt() #>> '{app_metadata,role}'`. That is the exact thing ENTREV-08 deviates from. DEFINER body CAN read `public.usuarios_rh` (owner=postgres has SELECT) — proven by the two-join own-vaga SELECT the analog already does at lines 51-58.

**Own-vaga guard (clone verbatim, lines 51-75)** — swap the source table `entrevista_analises` → `entrevista_guias` is NOT needed because the RPC resolves ownership from `candidatura_id` directly:
```sql
SELECT v.created_by INTO v_vaga_owner
  FROM public.candidaturas c
  JOIN public.vagas v ON v.id = c.vaga_id
 WHERE c.id = p_candidatura_id
 LIMIT 1;
IF v_vaga_owner IS NULL THEN
  RAISE EXCEPTION 'candidatura % nao encontrada' USING ERRCODE = 'no_data_found';
END IF;
IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
```

**Upsert body (NEW — the write-path)** — see RESEARCH Pattern 1 for the full RPC. Key statements:
```sql
INSERT INTO public.entrevista_guias (candidatura_id, tipo, guia, updated_at)
     VALUES (p_candidatura_id, p_tipo, p_guia, now())
ON CONFLICT (candidatura_id, tipo)
DO UPDATE SET guia = EXCLUDED.guia, updated_at = now();
```

**Dedup-THEN-UNIQUE DDL (NEW, RESEARCH Pattern 2):**
```sql
DELETE FROM public.entrevista_guias g
 WHERE g.id NOT IN (
   SELECT DISTINCT ON (candidatura_id, tipo) id FROM public.entrevista_guias
    ORDER BY candidatura_id, tipo, created_at DESC, id DESC
 );
ALTER TABLE public.entrevista_guias ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.entrevista_guias SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.entrevista_guias
  ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.entrevista_guias
  ADD CONSTRAINT entrevista_guias_candidatura_tipo_key UNIQUE (candidatura_id, tipo);
```

**Apply path (Pitfall 4, CLAUDE.md §Migrations):** Supabase MCP `apply_migration` (bypasses 42601, writes version row) — `db push --linked` will 42601 on the `$$` body + adjacent REVOKE/GRANT. **NO `BEGIN;...COMMIT;` wrapper (D-22).** Latest applied migration is `20260625100002` → pick `20260629xxxxxx` or later (A3). **[BLOCKING] human-gated wave.** Then `npm run db:types` to regenerate `database.types.ts` (repo ROOT).

---

### `supabase/functions/gerar-guia-entrevista/index.ts` (Edge Function, read-merge-upsert)

**Analog (the `.upsert(row,{onConflict})` idiom):** `gerar-devolutiva-bigfive/index.ts:458-471` + `analise-candidato-individual/index.ts:316`.

**Current code (THE LINE TO CHANGE — index.ts:318-323):**
```typescript
await supabaseAdmin.from("entrevista_guias").insert({
  candidatura_id: body.candidatura_id,
  tipo: body.tipo,
  guia: guide ?? { incompleto: true, flags: persistFlags },
  prompt_version: resolved.prompt_version,
});
```

**Upsert idiom to copy** (`gerar-devolutiva-bigfive/index.ts:458-468`):
```typescript
const { data: inserted, error: insErr } = await supabaseAdmin
  .from("devolutivas_candidato")
  .upsert(
    { candidatura_id: scoreRow.candidatura_id, candidato_id: candidatoId, conteudo_jsonb: conteudo, ... },
    { onConflict: "candidatura_id" },   // ← arbiter = the UNIQUE; for guia: "candidatura_id,tipo"
  )
```

**Merge-preserve (NEW logic, RESEARCH Pattern 3 — the hard invariant):** insert BEFORE the existing `guide ?? {incompleto}` fallback (Pitfall 3). Read current row (allowlist `select("guia")`, NEVER `select('*')` — `reference_select_star_leaks_pii`), split by `origem`, keep all `'manual'`, stamp fresh as `'ia'`, merge:
```typescript
const { data: currentRow } = await supabaseAdmin
  .from("entrevista_guias").select("guia")
  .eq("candidatura_id", body.candidatura_id).eq("tipo", body.tipo).maybeSingle();
const currentQs = (currentRow?.guia?.questions ?? currentRow?.guia?.perguntas ?? []) as Array<Record<string, unknown>>;
const manualQs = currentQs.filter((q) => q.origem === "manual");      // PRESERVE — never dropped
const freshIaQs = (guide?.questions ?? []).map((q) => ({ ...q, origem: "ia" as const }));
const mergedQuestions = [...manualQs, ...freshIaQs];
```
> **Failed-regen guard (Pitfall 3):** when `guide == null`, do NOT clobber manual questions with `{ incompleto: true }` — either skip the upsert (keep current row) or merge `manualQs` into the incompleto payload. The merge must run BEFORE the never-absent fallback at L321.

**Auth path is UNCHANGED** — the two-client authenticate-THEN-authorize block (index.ts:143-199, role from `usuarios_rh` via `supabaseAdmin`, own-vaga via `vagas.created_by`) is already correct; the merge is the only change. **RNF-07a preserved:** EF never writes `candidaturas` (unchanged). Redacted log at L325-333 unchanged (LGPD-02).

**Deploy:** `supabase functions deploy gerar-guia-entrevista` — **[BLOCKING] human-gated**, PROD precedent (`reference_ef_shared_bundle_freeze`: merge logic is in index.ts not `_shared`, so no cross-EF drift).

---

### `supabase/functions/_shared/interview-output-schemas.ts` (Zod OUTPUT schema — OPTIONAL, A1)

**Analog:** self (`InterviewQuestionSchema` L67-88). **Recommendation (RESEARCH A1 / Open Q1): stamp `origem:'ia'` post-parse in the EF (Pattern 3 step c), NOT via the LLM schema.** The post-parse stamp keeps the LLM contract unchanged and avoids re-pinning the `/v4` helper surface (header L20-23, load-bearing). Only add `origem: z.literal('ia').optional()` to `InterviewQuestionSchema` (L67) if the planner wants schema-level enforcement — not required this phase.

> **Load-bearing constraint (L30-31):** `import { z } from "npm:zod@3.25.76/v4"` — do NOT change to plain `npm:zod@3.25.76`; the Anthropic `zodOutputFormat` helper reads `.def` (v4 namespace), v3 `._def` throws at the real call (Pitfall 3).

---

### `src/features/entrevista/services/entrevistaService.ts` (data layer — +saveGuiaEdits, origem-aware normalizeGuia)

**Analog:** `salvarAvaliacao` (L446-461) + `normalizeGuia` (L274-286) + `mapRpcError` (L412-432) — all in the SAME file.

**New write — clone `salvarAvaliacao` (L446-461) swapping the RPC name + payload:**
```typescript
// Source: salvarAvaliacao (entrevistaService.ts:446) — clone, swap RPC name + payload
export async function saveGuiaEdits(
  candidaturaId: string, tipo: TipoEntrevista, perguntas: GuiaPergunta[],
): Promise<EntrevistaGuiaRow | null> {
  if (!candidaturaId) throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  const { error } = await supabase.rpc('save_entrevista_guia_edits', {
    p_candidatura_id: candidaturaId,
    p_tipo: tipo,
    p_guia: { perguntas },                 // pt-BR shape; RPC stores opaque jsonb
  })
  if (error) throw mapRpcError(error, 'Não foi possível salvar as edições do guia. Tente novamente.')
  return getGuia(candidaturaId)            // read-back via allowlist (origem default 'ia')
}
```
> `mapRpcError` (L412-432) already maps `42501 → FORBIDDEN`, `23514 → INVALID_INPUT`, `no_data_found → NOT_FOUND` — **reuse verbatim**, do not write a new mapper.

**origem-aware read — extend `normalizeGuia` (L280-284):** carry `q.origem` through, default missing → `'ia'` (legacy rows are wholly AI-generated, A2):
```typescript
const perguntas: GuiaPergunta[] = questions.map((q) => ({
  ...q,
  pergunta: typeof q.question === 'string' ? q.question : '',
  dimensao: typeof q.competency === 'string' ? q.competency : null,
  origem: q.origem === 'manual' ? 'manual' : 'ia',   // ← NEW: default 'ia' (UI-SPEC L56)
}))
```

**Allowlist update (Pitfall 6):** extend `ENTREVISTA_GUIA_ALLOWLIST` (L63-64) to add `, updated_at` explicitly — NEVER switch to `select('*')` (`reference_select_star_leaks_pii`). Add `origem?: 'ia' | 'manual'` to the `GuiaPergunta` interface (L95-102).

**Data shape:** `GuiaPergunta` (L95) gains `origem?: 'ia' | 'manual'`. The client stamps `origem:'manual'` on added rows (UI edit state); the RPC stores the array verbatim.

---

### `src/features/entrevista/hooks/useEntrevistaScorecard.ts` (TanStack Query — +saveEdits mutation)

**Analog:** `useGuiaEntrevista` gerar mutation (L84-89, same hook) + the targeted-invalidation pattern from `useEntrevistaScorecard.salvar` (L175-203, Phase-19 PERF-04).

**Current `gerar` mutation to clone (L84-89):**
```typescript
const gerar = useMutation({
  mutationFn: (tipo: TipoEntrevista) => gerarGuia(candidaturaId!, vagaId!, tipo),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: entrevistaKeys.guia(candidaturaId || '') })
  },
})
return { ...query, gerarGuia: gerar }
```

**New `saveEdits` mutation (add inside `useGuiaEntrevista`):**
```typescript
const saveEdits = useMutation({
  mutationFn: (perguntas: GuiaPergunta[]) => saveGuiaEdits(candidaturaId!, /* tipo */, perguntas),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: entrevistaKeys.guia(candidaturaId || '') })  // same key as gerar
  },
})
return { ...query, gerarGuia: gerar, saveEdits }
```
> `entrevistaKeys.guia(id)` is the SAME key the read query and `gerar` use (L37-43) → the panel re-renders with the saved guide after invalidation. Import `saveGuiaEdits` + `GuiaPergunta` from the service (extend the existing import block L18-33). `tipo` must be threaded through — either as a mutation arg or derived from the loaded guide.

---

### `src/features/entrevista/components/GuiaEntrevistaPanel.tsx` (component — edit mode + NEW EditablePerguntaRow)

**Analogs (assembled from 3):**
1. **Read-only `PerguntaRow` (L49-69, same file)** — the base layout EditablePerguntaRow extends. View-mode rendering, dimensão pill (L57-61), spacing `px-3 py-3 space-y-1` carried verbatim (UI-SPEC §Spacing).
2. **AlertDialog (delete confirm)** — `src/features/triagem/components/RedacaoOverrideForm.tsx:25-34` (import block) + `:319-334` (usage) OR `src/features/entrevista/components/CognitivoBandCard.tsx:36-45` (import block, SAME feature dir — prefer this for proximity).
3. **AsyncState (save in-flight/error)** — `src/components/ui/AsyncState.tsx` — reuse the error contract: static PT-BR copy keyed by code (T-18-04-ID), `insufficient_privilege` → "Você não tem permissão para editar este guia." (UI-SPEC L153). NEVER echo the raw RPC error.

**AlertDialog import block to copy (`CognitivoBandCard.tsx:36-45`):**
```typescript
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
```

**Origem badge (NEW, UI-SPEC L126-128):** clone the dimensão pill at `PerguntaRow:57-61` for the `Manual` neutral badge; the `IA` badge mirrors `SugestaoIABadge` (accent `#35BFAD` + `Sparkles`). Badge base = `@/components/ui/badge`.

**UI primitives (all vendored, no new install — UI-SPEC §Registry Safety):** `Input` (inline pergunta), `Select` (dimensão), `Label`, `GlassButton` (Salvar=accent / Cancelar=neutral), `lucide-react` (`Pencil`/`Plus`/`Trash2`/`ChevronUp`/`ChevronDown`/`Save`/`X`/`Sparkles`).

**Interaction state machine (UI-SPEC §Interaction Contract L174-181):** view → edit (toggle) → dirty → saving → save-error/save-success. Batch save (one RPC commits the whole edited guide). Reorder = up/down buttons + array swap (boundary buttons `disabled`, not hidden). Add-question = inline form appended at list end, new row stamped `origem:'manual'`. IA-only fields (bars_anchors/probes/flags) stay read-only display.

**Host:** `src/features/entrevista/components/EntrevistaWorkspace.tsx` (tab 'guia') — the panel renders inside the existing `<Glass variant="white">` shell, unchanged. New props (`onSaveEdits`, `saving`, `saveError`) wired from `useGuiaEntrevista.saveEdits`.

---

### TESTS

| Surface | Analog | Command |
|---------|--------|---------|
| **Deno EF merge-preserve** (manual survives regen; failed-regen keeps manual; origem:'ia' stamp) | `supabase/functions/analise-candidato-individual/__tests__/index.test.ts:35-75` (deps-injection mocks: `makeMockAnthropic`/`makeMockSupabase` capturing `.upsert(row,{onConflict})`); also `gerar-guia-entrevista/_local/weak-dim-coverage.test.ts` (same EF) | `deno test --allow-read supabase/functions/gerar-guia-entrevista/` |
| **SQL smoke** (RPC DENY candidato/RH-no-own → 42501; OK RH-own + admin bypass; upsert collapses to 1 row; dedup leaves latest; role-from-usuarios_rh NOT JWT) | M2 `set_config('request.jwt.claims', ...)` idiom in a `ROLLBACK`-able fixture (RESEARCH §Code Examples L511-537; precedent Phase 7/8/11) | Supabase MCP `execute_sql` (ROLLBACK) |
| **vitest service** (`saveGuiaEdits` calls RPC with `{perguntas}`, maps 42501→FORBIDDEN) | `salvarAvaliacao` path; extend `entrevista-contract.test.ts` (anti-tamper: payload carries no score/band) | `npm run test:run -- entrevistaService` |
| **vitest normalize** (origem carried; missing→'ia') | `guia-normalize.test.ts` (extend — `efPersistedGuia` fixture, the 6 existing cases) | `npm run test:run -- guia-normalize` |
| **vitest hook** (`saveEdits` invalidates `entrevistaKeys.guia`) | `useEntrevistaScorecard.test.ts:20-70` (vi.hoisted service mocks + `vi.spyOn(queryClient,'invalidateQueries')` + `renderHook`) | `npm run test:run -- useEntrevistaScorecard` |
| **vitest UI (RTL)** (inline edit / add origem:'manual' / delete confirm / up-down / badge / batch-save states) | NEW `components/__tests__/GuiaEntrevistaPanel.test.tsx`; idiom from `src/features/entrevista/__tests__/citacoes-render.test.tsx` | `npm run test:run -- GuiaEntrevistaPanel` |

**Deno mock idiom to clone (`analise-candidato-individual/__tests__/index.test.ts:60-72`):** `makeMockSupabase` records every `from(table).upsert(row)` into a `upserts[]` array so the test asserts the merged set + the never-drop-manual invariant. The handler already accepts injected `deps` (`GerarGuiaDeps`, index.ts:88-100) — the merge must read the CURRENT row via an injectable mock that returns a seeded manual question.

---

## Shared Patterns

### Authorization (role-from-`usuarios_rh` + own-vaga + admin bypass)
**Source:** `gerar-guia-entrevista/index.ts:143-199` (EF posture — the canonical authenticate-THEN-authorize) + `20260420000002_unified_auth_role.sql:43-56` (the exact `usuarios_rh` filter).
**Apply to:** the NEW RPC (Pattern 1 — swap the role source) + the EF (unchanged, already correct).
```typescript
// EF: role from usuarios_rh via service_role, NOT JWT claim (silent-403 landmine)
const { data: rhRow } = await supabaseAdmin.from("usuarios_rh")
  .select("role").eq("user_id", user.id).eq("ativo", true).is("deleted_at", null).maybeSingle();
const role = dbRole === "recrutador" ? "rh" : dbRole === "administrador" ? "administrador" : dbRole;
if (role !== "rh" && role !== "administrador") return errorResponse("FORBIDDEN", "Acesso negado.", 403);
```
The RPC mirrors this with `auth.uid()` (GUC-based; survives SECURITY DEFINER — D-09) instead of `getUser()`.

### Error → message mapping
**Source:** `entrevistaService.ts:412-432` (`mapRpcError`).
**Apply to:** `saveGuiaEdits` (verbatim — handles 42501/23514/no_data_found).

### PII allowlist projection (NEVER `select('*')`)
**Source:** `entrevistaService.ts:63-87` (`ENTREVISTA_*_ALLOWLIST` consts) + `reference_select_star_leaks_pii`.
**Apply to:** the EF read-current (`select("guia")` only), the service `getGuia` (extend allowlist with `, updated_at`). RLS is row-level only and does NOT hide columns.

### RNF-07a (write never touches `candidaturas`)
**Source:** `salvar_avaliacao_entrevista` migration header L15-19 + `gerar-guia-entrevista/index.ts:26-27`.
**Apply to:** the NEW RPC + the EF merge — the guide is a recommendation; it NEVER advances the funil or auto-rejects.

### AI-block badge / provenance (`SugestaoIABadge` + origem)
**Source:** `GuiaEntrevistaPanel.tsx:18,89` (`SugestaoIABadge variant="full"`) + dimensão pill `PerguntaRow:57-61`.
**Apply to:** the panel header (keep) + per-question `IA`/`Manual` badge.

### Static PT-BR error copy (no raw-error echo, T-18-04-ID)
**Source:** `src/components/ui/AsyncState.tsx:13-22` (error state keyed by `errorCode`).
**Apply to:** the save-error state in the panel — `insufficient_privilege` → permission copy (UI-SPEC L153).

---

## No Analog Found

None. Every file has an exact or strong in-repo analog. Two surfaces carry genuinely NEW logic (still anchored to a near-clone):

| File | Role | Data Flow | New reasoning (anchor) |
|------|------|-----------|------------------------|
| RPC role source | migration | CRUD | role-from-`usuarios_rh` swap — anchored to the auth-hook filter (`20260420000002:43-56`), only RPC in repo to do this |
| EF merge-preserve split | service (EF) | transform | split-by-origem + keep-manual — anchored to the `.upsert(row,{onConflict})` idiom; the split itself is new |

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `supabase/functions/` (gerar-guia-entrevista, gerar-devolutiva-bigfive, analise-candidato-individual, _shared), `src/features/entrevista/` (services, hooks, components, __tests__), `src/features/triagem/` + `src/features/decisao/` (AlertDialog), `src/components/ui/` (AsyncState).
**Files scanned:** ~16 (3 migrations, 4 EFs/schemas, 3 entrevista source files, 4 test files, AsyncState + AlertDialog analogs).
**Pattern extraction date:** 2026-06-29
