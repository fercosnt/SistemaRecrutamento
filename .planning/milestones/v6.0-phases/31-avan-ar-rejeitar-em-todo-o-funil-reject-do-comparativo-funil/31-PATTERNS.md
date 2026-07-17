# Phase 31: Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo (funil-02) - Pattern Map

**Mapped:** 2026-07-14
**Files analyzed:** 11 (4 NEW · 6 MODIFIED · 1 REGEN)
**Analogs found:** 11 / 11 (every file has an in-repo live analog — zero no-analog files)

> This is a REUSE-and-extend phase. Every pattern below has a verified LIVE analog in this
> codebase. The planner should copy the analog's shape verbatim and change only the domain
> nouns. No new npm packages, no new tables, and the live `avancar_etapa()` trigger is NOT edited.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/<ts>_rejeitar_candidatura_rpc.sql` | migration (enum + DEFINER RPC + 2 DROP) | CRUD (authorize-then-write) | `supabase/migrations/20260625100001_decisao_final_phase15.sql` (`registrar_decisao`) | exact |
| `supabase/tests/oper31_rejeitar_candidatura_smokes.sql` | test (SQL behavioral smoke) | request-response (JWT-impersonated) | `supabase/tests/funil12_status_rpc_smoke.sql` + `supabase/tests/sec02_smokes.sql` | exact |
| `src/features/triagem/services/triagemService.ts` (`rejeitarCandidatura`) | service | request-response (RPC call) | `src/features/decisao/services/decisaoService.ts` (`registrarDecisao` :137-164) | exact |
| `src/features/triagem/services/triagemService.ts` (`updateCandidaturaEtapa` extend) | service | CRUD (bare UPDATE) | same file, `updateCandidaturaEtapa` :350-378 (self-extend) | exact |
| `src/features/triagem/hooks/useRejeitarCandidatura.ts` | hook | request-response (TanStack mutation) | `src/features/decisao/hooks/useRegistrarDecisao.ts` | exact |
| `src/features/triagem/components/RejeitarCandidaturaDialog.tsx` | component | event-driven (form → mutation) | `src/features/decisao/components/RegistrarDecisaoForm.tsx` | role-match (radio→Select) |
| `src/features/triagem/components/RetrocederCandidaturaDialog.tsx` | component | event-driven (form → mutation) | `RegistrarDecisaoForm.tsx` (Textarea gate) + `ComparativoScreen` AlertDialog | role-match |
| `src/features/vagas/hooks/useCandidaturas.ts` (`useUpdateCandidaturaEtapa` extend) | hook | request-response | same file :414-450 (self-extend) | exact |
| `src/components/KanbanBoard.tsx` | component | event-driven (card menu) | self (card block :140-277) + `dropdown-menu` primitive | role-match |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx` | component | event-driven (action row) | self ("Próximo passo" block :169-186) | exact |
| `src/features/triagem/components/ComparativoScreen.tsx` + `src/components/pages/ComparativoCandidatosPage.tsx` | component + page | event-driven (rewire reject) | self (`ComparativoScreen` :344-373 / `ComparativoCandidatosPage` :113-131) | exact |
| `database.types.ts` (ROOT) | config (generated) | n/a | Supabase CLI `npm run db:types` | regen |

**Surface resolution (RESEARCH Open Q3 — RESOLVED):** `src/components/pages/PerfilCandidatoRHPage.tsx`
is a 5-line thin wrapper that renders `<HubCandidatoRH />`. The "perfil" reject surface named in
CONTEXT is therefore **`HubCandidatoRH.tsx`** — mount the action row in its "Próximo passo" block
(lines 169-186). Do NOT edit `PerfilCandidatoRHPage.tsx`.

---

## Pattern Assignments

### `supabase/migrations/<ts>_rejeitar_candidatura_rpc.sql` (migration, authorize-then-write)

**Analog:** `supabase/migrations/20260625100001_decisao_final_phase15.sql` (`registrar_decisao`, the copy
template) + `supabase/migrations/20260610000003_reprocessar_rpc.sql` (`reprocessar_analise`, identical guard).

**Enum creation** — codebase precedent is bare `CREATE TYPE`. Because MCP `apply_migration` may be
retried, wrap in a `duplicate_object` guard for replay-idempotency (RESEARCH Pattern 2). Enum literals
for `etapa_processo` VERIFIED verbatim at `database.types.ts:5036-5045`:
`inscricao / triagem / avaliacao_assincrona / entrevista_online / entrevista_presencial / decisao_final / aprovado / rejeitado`.

```sql
DO $$ BEGIN
  CREATE TYPE public.motivo_rejeicao_rh AS ENUM (
    'perfil_desalinhado', 'reprovado_avaliacao', 'reprovado_entrevista',
    'nao_compareceu', 'desistencia', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

**Header comment + no BEGIN/COMMIT wrapper (D-22)** — copy the header idiom from `registrar_decisao`
(`20260625100001` lines 55-63): note "No explicit BEGIN; ... COMMIT; wrapper (D-22 — CLAUDE.md §Commands)"
and "AUTHORED-NOT-APPLIED ... applied LIVE via Supabase MCP apply_migration in the [BLOCKING] wave".

**The authorize-then-write guard (THE core control)** — copy verbatim from `registrar_decisao`
(`20260625100001_decisao_final_phase15.sql:95-117`), identical to `reprocessar_analise` (`20260610000003_reprocessar_rpc.sql:39-59`):

```sql
-- (1) Resolve the candidatura → its vaga owner. A missing candidatura → not found.
SELECT v.created_by
  INTO v_vaga_owner
  FROM public.candidaturas c
  JOIN public.vagas v ON v.id = c.vaga_id
 WHERE c.id = p_candidatura_id;

IF NOT FOUND THEN
  RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
    USING ERRCODE = 'no_data_found';
END IF;

-- (2) Role + own-vaga guard. candidato/anon → forbidden. rh → must own the vaga. administrador → bypass.
v_role := (select auth.jwt() #>> '{app_metadata,role}');

IF v_role NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;

IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
```

**The ≥50 server-authoritative gate** — copy the shape from `registrar_decisao:88-93`, but use `btrim`
(CONTEXT locks `btrim` + `char_length >= 50`, pt-BR message):

```sql
v_just text := btrim(coalesce(p_justificativa, ''));
...
IF char_length(v_just) < 50 THEN
  RAISE EXCEPTION 'A justificativa da rejeição precisa de pelo menos 50 caracteres'
    USING ERRCODE = 'check_violation';
END IF;
```

**The single UPDATE (fires the trigger, satisfies the guard, NEVER a manual INSERT)** — mirror
`registrar_decisao:139-143` but in ONE statement set both `etapa_atual` AND `status` (Pitfall 2), and
land the justificativa in `etapa_justificativa` so the trigger copies it to `historico_candidatura.criterio_texto`
(Pitfall 4 / A2):

```sql
UPDATE public.candidaturas
   SET etapa_atual         = 'rejeitado',
       status              = 'rejeitado',
       motivo_rejeicao     = p_motivo::text,   -- column stays text; enum validates at the param boundary
       etapa_justificativa = v_just
 WHERE id = p_candidatura_id;
-- NEVER a manual INSERT INTO historico_candidatura (Phase-8 survivor double-write lesson).
```

**Function signature + hardening** — copy `registrar_decisao`'s `LANGUAGE plpgsql / SECURITY DEFINER /
SET search_path = ''` (`:79-82`) and its REVOKE/GRANT/COMMENT trailer (`:151-165`):

```sql
CREATE OR REPLACE FUNCTION public.rejeitar_candidatura(
  p_candidatura_id uuid,
  p_motivo         public.motivo_rejeicao_rh,
  p_justificativa  text
)
RETURNS void            -- A1: void is sufficient (hook invalidates+refetches). registrar_decisao returns a row.
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ ... $$;

REVOKE ALL ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) TO authenticated;
COMMENT ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) IS 'Phase 31 / OPER-02/04: ...';
```

**The two legacy DROPs (Pitfall 1 — HIGH SEVERITY landmine)** — signatures VERIFIED at
`database.types.ts:4359-4362` (`avancar_etapa` args `{candidatura_uuid, usuario_rh_uuid}`, both uuid)
and `:4620-4627` (`rejeitar_candidato` args `{candidatura_uuid, motivo, usuario_rh_uuid}` = uuid,text,uuid).
Use EXACT two/three-arg signatures, NEVER zero-arg, NEVER CASCADE:

```sql
DROP FUNCTION IF EXISTS public.avancar_etapa(uuid, uuid);            -- dead M1 RPC ONLY
DROP FUNCTION IF EXISTS public.rejeitar_candidato(uuid, text, uuid); -- dead M1 RPC ONLY
-- ⚠ NEVER: DROP FUNCTION public.avancar_etapa();  ← that is the LIVE TRIGGER function
--   (bound to candidaturas_avancar_etapa_trg — dropping it silently breaks ALL funnel auditing).
```

**Read-only reference (DO NOT EDIT):** `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql`
is the LIVE `avancar_etapa()` trigger body. Confirmed behaviors the RPC relies on:
regression RAISE at `:81-83`; terminal-from-any-stage allowed at `:76-78`; one-audit-row INSERT at
`:110-117` with `auto_rejeitado` FALSE for a human write (`v_ator = auth.uid()`, GUC-based, survives DEFINER).

---

### `supabase/tests/oper31_rejeitar_candidatura_smokes.sql` (test, JWT-impersonated)

**Analog:** `supabase/tests/funil12_status_rpc_smoke.sql` (disposable-fixture + impersonation) +
`supabase/tests/sec02_smokes.sql` (role-switch + RAISE-on-insecure-outcome).

**Disposable-fixture + fixed-UUID idiom** (from `funil12` :41-88) — privileged `RESET ROLE` setup that
DISCOVERS a real rh user + builds a disposable vaga (`created_by = v_owner`) + candidatura in `'triagem'`,
with `smoke.ready='y'` gate so assertions SKIP (never false-fail) if the fixture can't build. ROLLBACK-free
cleanup deletes the disposable rows at the end. Copy this scaffolding verbatim.

**Impersonation idiom** (from `funil12` :103-105 and `sec02` :26-31) — `SET ROLE authenticated` +
`set_config('request.jwt.claims', jsonb_build_object('sub', <uid>, 'role','authenticated', 'app_metadata', jsonb_build_object('role','rh'))::text, false)`:

```sql
PERFORM set_config('request.jwt.claims', jsonb_build_object(
  'sub', v_owner, 'role','authenticated',
  'app_metadata', jsonb_build_object('role','rh'))::text, false);
SET ROLE authenticated;
```

**RAISE-on-insecure-outcome + PASS-NOTICE idiom** (from `sec02` :33-44, `funil12` :143-148) — the
BEGIN/EXCEPTION-catches-the-expected-SQLSTATE structure. Assertions to cover (RESEARCH Wave-0 gaps):
(a) `<50` justificativa → `check_violation`; (b) human reject → `auto_rejeitado=false`; (c) regression
empty justificativa via the bare UPDATE path → trigger RAISE; (d) exactly ONE new `historico_candidatura`
row; (e) cross-recruiter (v_other owns no vaga) → `insufficient_privilege` (42501). Full skeleton is in
`31-RESEARCH.md` Code Examples.

---

### `src/features/triagem/services/triagemService.ts` — `rejeitarCandidatura` (service, request-response)

**Analog:** `src/features/decisao/services/decisaoService.ts` `registrarDecisao` (`:137-164`).

Copy the RPC-call shape verbatim, swapping the error class to the existing `TriagemServiceError`
(defined in this same file `:28-43`) and `p_`-prefixed params:

```typescript
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
```

The `MotivoRejeicaoRh` union type mirrors the enum (RESEARCH Code Examples). After `database.types.ts`
regen the `.rpc('rejeitar_candidatura', …)` call is fully typed (no cast) — same as `registrar_decisao`.

---

### `src/features/triagem/services/triagemService.ts` — extend `updateCandidaturaEtapa` (service, CRUD)

**Analog:** self, `updateCandidaturaEtapa` (`:350-378`).

Current body sets only `etapa_atual` (+ status for reject) and NEVER touches `etapa_justificativa`
(Pitfall 3 — a regression through this path reads a STALE stored justificativa in the trigger). Extend
the signature with optional `justificativa` and ALWAYS include `etapa_justificativa` in the SET object:

```typescript
export async function updateCandidaturaEtapa(
  candidaturaId: string, novaEtapa: EtapaFunilM2, justificativa?: string,
): Promise<void> {
  if (!candidaturaId) throw new TriagemServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  const update: { etapa_atual: EtapaFunilM2; status?: StatusCandidatura; etapa_justificativa: string | null } = {
    etapa_atual: novaEtapa,
    etapa_justificativa: justificativa ?? null,  // ALWAYS in the SET list — avoids the stale NEW value
  }
  if (novaEtapa === 'rejeitado') update.status = 'rejeitado'
  const { error } = await supabase.from('candidaturas').update(update as never).eq('id', candidaturaId)
  if (error) throw new TriagemServiceError(`Não foi possível atualizar a candidatura: ${error.message}`, 'DATABASE_ERROR', error)
}
```

> Keep the existing `.update(update as never)` cast (current file `:368`) — the local workaround until
> `database.types.ts` regenerates; drop it after regen only if types resolve cleanly.

---

### `src/features/triagem/hooks/useRejeitarCandidatura.ts` (hook, TanStack mutation)

**Analog:** `src/features/decisao/hooks/useRegistrarDecisao.ts` (whole file, 52 lines).

Copy the `useMutation` + toast + invalidation shape verbatim. Invalidate the THREE key trees named in
CONTEXT (confirmed exports): `candidaturasKeys.all` (`src/features/vagas/hooks/useCandidaturas.ts:55`),
`vagasKeys.all` (`src/features/vagas/hooks/useVagas.ts:38`), `triagemKeys.all`
(`src/features/triagem/hooks/useTriagemPanel.ts:24`). Note `useRegistrarDecisao` already invalidates
`candidaturasKeys.all` + `vagasKeys.all` (`:45-46`) for exactly the reason this hook needs — the RH list
(staleTime, no refetchOnWindowFocus) shows the old status after a reject unless invalidated (its MED-02 note).

```typescript
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

---

### `src/features/triagem/components/RejeitarCandidaturaDialog.tsx` (component, event-driven — NEW shared)

**Analog:** `src/features/decisao/components/RegistrarDecisaoForm.tsx` (the ≥50 counter + AlertDialog gate).

**Reuse from the analog:**
- **AlertDialog container + imports** (`RegistrarDecisaoForm.tsx:24-34`): `AlertDialog`, `AlertDialogAction`,
  `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`,
  `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` from `@/components/ui/alert-dialog`.
- **The ≥50 counter + gate** (`:81-88`, `:133-162`): `const tooShort = justificativa.length < MIN`,
  `const canSubmit = motivo !== null && !tooShort && !submitting`, the `{len} / {MIN} mín.` counter span,
  and the too-short helper `<p>`. UI-SPEC §Interaction locks the whitespace rule: **count `btrim()`-trimmed
  length** (mirror the server's `btrim`) — so use `justificativa.trim().length`, NOT raw `.length` (this is
  the ONE deviation from the analog, which counts raw length).
- **The submitting spinner** (`:173-179`): `<Loader2 className="animate-spin" /> Rejeitando…`.
- **Confirm-via-AlertDialogAction onClick** (`:195-197`).

**New (per 31-UI-SPEC):**
- A **motivo `<Select>`** (`@/components/ui/select`, Radix) with the 6 enum options → pt-BR labels
  (31-UI-SPEC §Motivo table). Placeholder "Selecione o motivo". Gate also requires `motivo != null`.
- **Light-modal styling** (31-UI-SPEC §Design System): the dialog body renders on `AlertDialogContent`
  (`bg-background` light surface) → use `text-foreground` / `text-muted-foreground` / `text-destructive`
  tokens, NOT the analog's dark-glass `text-white/80` white-alpha (the analog renders on a dark glass page).
- **Destructive confirm** `bg-destructive text-destructive-foreground hover:bg-destructive/90` (not the
  analog's `GlassButton variant="white"`).
- Exact copy strings from 31-UI-SPEC §Copywriting Contract (title "Rejeitar {nome}?", counter "{N} / 50 mín.", etc.).

**Wired via** `useRejeitarCandidatura` (above); this dialog is the single source of truth across all 3
surfaces (Kanban · Hub · Comparativo) — do NOT fork three copies.

---

### `src/features/triagem/components/RetrocederCandidaturaDialog.tsx` (component, event-driven — NEW small)

**Analog:** `RegistrarDecisaoForm.tsx` (Textarea + AlertDialog gate) — but **non-empty**, NOT ≥50.

- Destino `<Select>` lists ONLY stages with a LOWER enum ordinal than `etapa_atual` and non-terminal
  (never `aprovado`/`rejeitado`, never a forward stage) — derive from `ETAPA_M2_OPTIONS`
  (`triagemService.ts:337-348`) filtered by index in the funnel order. Labels via `ETAPA_M2_LABELS`.
- Justificativa `<Textarea>` required non-empty (`justificativa.trim().length > 0`), counter-free helper.
- The trigger's `RAISE 'Regressão de etapa exige justificativa preenchida'`
  (`20260712110001_avancar_etapa_auto_rejeitado_fix.sql:82`) is the server authority; the form mirrors it.
- Neutral styling (31-UI-SPEC §Color: regression is a lateral move, NOT destructive — `border-white/20
  bg-white/5 text-white/80` on dark trigger).
- Wired via the **extended** `useUpdateCandidaturaEtapa` (passing `justificativa`).

---

### `src/features/vagas/hooks/useCandidaturas.ts` — extend `useUpdateCandidaturaEtapa` (hook)

**Analog:** self (`:414-450`).

`UpdateCandidaturaEtapaVars` (`:397-400`) currently has `{ candidaturaId, novaEtapa }`; the mutationFn
(`:420-421`) calls `updateCandidaturaEtapa(candidaturaId, novaEtapa)`. Add optional `justificativa?: string`
to the vars and forward it to the extended service (`updateCandidaturaEtapa(candidaturaId, novaEtapa, justificativa)`)
so the Retroceder dialog can pass the required text. The onSuccess invalidation block (`:422-434` —
`candidaturasKeys.all` invalidate+refetch + `vagasKeys.all`) is already correct; leave it.

---

### `src/components/KanbanBoard.tsx` (component, event-driven — card menu)

**Analog:** self — the card block `CandidatoKanbanCard` (`:140-277`), specifically the "Ver Perfil"
`GlassButton` (`:262-272`, `min-h-[32px]`) that the new `⋯` menu button sits beside.

**Add** a `DropdownMenu` (`@/components/ui/dropdown-menu`, already vendored) with a `MoreVertical`
(`lucide-react`) trigger `<button aria-label="Ações do candidato">` and items Avançar · Retroceder ·
Rejeitar (31-UI-SPEC §Component Inventory row "Card action menu"). Drag-drop advance stays (`useDrag`
:167-177 unchanged); the menu is the keyboard/explicit path + the ONLY reject/regress affordance on the
card. Reject opens the shared `RejeitarCandidaturaDialog`; Retroceder opens `RetrocederCandidaturaDialog`;
Avançar reuses the existing `moveEtapa`/`useUpdateCandidaturaEtapa` (`:374`, `:403-407`) behind a
lightweight confirm. Hide reject/regress items when `getTerminalBadge(candidatura)` is non-null (terminal
cards, `:89-108`).

---

### `src/features/hub-candidato/components/HubCandidatoRH.tsx` (component, event-driven — action row)

**Analog:** self — the "Próximo passo" block (`:169-186`).

Add Avançar / Retroceder / Rejeitar affordances BESIDE the existing dominant "Abrir {etapa}" CTA
(`:177-183`), inside the same `flex flex-wrap items-center justify-between gap-4` row (`:173`). Do NOT
displace the CTA. Hide the whole action group for terminal etapas (`etapaAtual` ∈ `aprovado`/`rejeitado`).
The candidaturaId is already in scope (`candidaturaId`, `:80`), as is `etapaAtual` (`:87`). Reject → shared
`RejeitarCandidaturaDialog` (`useRejeitarCandidatura`); Avançar/Retroceder → `useUpdateCandidaturaEtapa`.
Use the neutral dark-glass trigger styling for Retroceder and the `border-red-500/40 bg-red-500/10
text-red-300` destructive trigger for Rejeitar (31-UI-SPEC §Color).

---

### `src/features/triagem/components/ComparativoScreen.tsx` + `ComparativoCandidatosPage.tsx` (rewire — OPER-04)

**Analog:** self.

- **`ComparativoScreen.tsx`** — the current Rejeitar inline confirm `AlertDialog` (`:344-373`, no
  justificativa/motivo) is REPLACED by the shared `RejeitarCandidaturaDialog`. The Avançar block
  (`:314-341`) stays verbatim. The `showActions = Boolean(onAvancar && onRejeitar)` gate (`:121`) and the
  read-only embed contract (`onAvancar?`/`onRejeitar?` optional — the DecisaoFinalPage no-op embed at
  `DecisaoFinalPage.tsx:194` omits them ON PURPOSE) MUST be preserved. Change `onRejeitar`'s signature to
  carry `{motivo, justificativa}` (was bare `candidaturaId`).
- **`ComparativoCandidatosPage.tsx`** — `handleRejeitar` (`:123-131`) currently calls
  `updateCandidaturaEtapa(candidaturaId, 'rejeitado')` (no justificativa). REWIRE it to the new
  `useRejeitarCandidatura` mutation. `handleAvancar` (`:113-121`) stays on `updateCandidaturaEtapa`. Keep
  `invalidatePanel()` (`:109-111`, `triagemKeys.all`) — the new hook also invalidates `triagemKeys.all`.

---

### `database.types.ts` (ROOT, REGEN)

Run `npm run db:types` AFTER the migration applies (CLAUDE.md §Commands; NEVER hand-edit). Regen ADDS
`rejeitar_candidatura` + the `motivo_rejeicao_rh` enum and REMOVES the two dead overloads
(`avancar_etapa(uuid,uuid)` :4359-4362, `rejeitar_candidato(uuid,text,uuid)` :4620-4627), resolving the
type drift. MEMORY baseline: tsc ~104 after M5 — must not regress.

---

## Shared Patterns

### Vaga-scope authorize-then-write (privileged DEFINER RPC)
**Source:** `supabase/migrations/20260625100001_decisao_final_phase15.sql:95-117` (`registrar_decisao`),
duplicated at `supabase/migrations/20260610000003_reprocessar_rpc.sql:39-59` (`reprocessar_analise`).
**Apply to:** the `rejeitar_candidatura` RPC.
A `SECURITY DEFINER` RPC bypasses RLS, so it re-authorizes internally: (1) resolve candidatura → vaga owner
via join (404 if not found), (2) role ∈ {rh, administrador} else `insufficient_privilege`, (3) `rh` must own
`vagas.created_by = auth.uid()`, administrador bypasses. `auth.uid()`/`auth.jwt()` are GUC-based and survive
the DEFINER hop (Phase-6 proof). Excerpt in the migration section above.

### Single auditable write-path (trigger owns the audit row)
**Source:** `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql:110-117` (LIVE trigger).
**Apply to:** the RPC + BOTH `updateCandidaturaEtapa` callers.
No code tier ever `INSERT`s into `historico_candidatura`. Every transition is a single `UPDATE
candidaturas.etapa_atual` (+ `etapa_justificativa`); the `avancar_etapa()` BEFORE-UPDATE trigger writes
exactly ONE audit row (`ator=auth.uid()`, `criterio_texto=NEW.etapa_justificativa`, `auto_rejeitado=false`
for a human write). A manual INSERT is the Phase-8 double-write bug.

### Reject must move BOTH `etapa_atual` AND `status` (Pitfall 2)
**Source:** `supabase/migrations/20260709000010_guard_rejeicao_auditada.sql:60-70` (LIVE guard `path #2`).
**Apply to:** the RPC's single UPDATE.
`guard_rejeicao_auditada()` RAISEs `check_violation` on a status→rejeitado with NO etapa move. The RPC sets
`etapa_atual='rejeitado'` (fires the trigger → writes the trail = the "comparativo" allowed branch) AND
`status='rejeitado'` (drives the panel badge/filter). Setting only one trips the guard or fails the UI badge.

### Service error class + `p_`-prefixed RPC params
**Source:** `src/features/decisao/services/decisaoService.ts:40-54` (`DecisaoServiceError`) mirrored by
`src/features/triagem/services/triagemService.ts:28-43` (`TriagemServiceError` — the one to REUSE this phase).
**Apply to:** `rejeitarCandidatura`, extended `updateCandidaturaEtapa`.

### TanStack mutation → toast → 3-tree invalidation
**Source:** `src/features/decisao/hooks/useRegistrarDecisao.ts:32-52`.
**Apply to:** `useRejeitarCandidatura`. Invalidate `candidaturasKeys.all` + `vagasKeys.all` + `triagemKeys.all`.

### ≥50 counter + AlertDialog confirm gate (client mirror only)
**Source:** `src/features/decisao/components/RegistrarDecisaoForm.tsx:81-88` (gate) + `:133-162` (counter).
**Apply to:** `RejeitarCandidaturaDialog`. The server RAISE is the authority; the counter is UX. Count
`.trim().length` (mirror the server `btrim`) — the ONE change from the analog's raw `.length`.

### JWT-impersonated disposable-fixture SQL smoke
**Source:** `supabase/tests/funil12_status_rpc_smoke.sql:41-149` (fixture + impersonation + IDOR) +
`supabase/tests/sec02_smokes.sql:26-88` (role-switch + RAISE-on-insecure-outcome).
**Apply to:** `oper31_rejeitar_candidatura_smokes.sql`. Run via MCP `execute_sql` after apply; ROLLBACK-free.

---

## No Analog Found

None. Every file this phase creates or modifies has a verified in-repo live analog (this is a
REUSE-and-extend phase). The planner should copy the analogs above rather than reach for `RESEARCH.md`
generic patterns.

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `supabase/tests/`, `src/features/{triagem,decisao,vagas,hub-candidato}/`,
`src/components/{,pages}/`, `database.types.ts` (ROOT).
**Files scanned:** 15 (4 migrations, 2 smoke tests, 6 service/hook/component analogs, 3 surfaces).
**Verified facts (against live source):** dead-overload signatures (`database.types.ts:4359-4362`, `:4620-4627`);
`etapa_processo` enum literals (`:5036-5045`); `PerfilCandidatoRHPage` → `HubCandidatoRH` wrapper (Open Q3);
key-factory exports (`candidaturasKeys` `useCandidaturas.ts:55`, `vagasKeys` `useVagas.ts:38`, `triagemKeys`
`useTriagemPanel.ts:24`).
**Pattern extraction date:** 2026-07-14
