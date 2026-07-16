---
phase: 34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis
reviewed: 2026-07-16T18:30:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - src/components/pages/CandidatosRHPage.tsx
  - src/components/pages/RelatoriosRHPage.tsx
  - src/components/pages/__tests__/RelatoriosRHPage.test.tsx
  - src/features/agendamento/components/AgendamentoBlock.tsx
  - src/features/agendamento/components/__tests__/AgendamentoBlock.test.tsx
  - src/features/agendamento/hooks/useAgendamento.ts
  - src/features/agendamento/schemas/agendamentoSchema.ts
  - src/features/agendamento/services/__tests__/agendamentoService.test.ts
  - src/features/agendamento/services/agendamentoService.ts
  - src/features/funil/components/FilaTrabalhoTab.tsx
  - src/features/funil/components/SlaBadge.tsx
  - src/features/funil/components/__tests__/FilaTrabalhoTab.test.tsx
  - src/features/funil/constants/__tests__/slaThresholds.test.ts
  - src/features/funil/constants/slaThresholds.ts
  - src/features/funil/hooks/useFilaTrabalho.ts
  - src/features/funil/hooks/useFunilKpis.ts
  - src/features/funil/services/__tests__/funilKpisService.test.ts
  - src/features/funil/services/filaTrabalhoService.ts
  - src/features/funil/services/funilKpisService.ts
  - src/features/hub-candidato/components/AnaliseIABlock.tsx
  - src/features/hub-candidato/components/CvButton.tsx
  - src/features/hub-candidato/components/HistoricoBlock.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx
  - src/features/hub-candidato/components/__tests__/CvButton.test.tsx
  - src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx
  - src/features/hub-candidato/hooks/useAnaliseCandidato.ts
  - src/features/hub-candidato/hooks/useHistoricoCandidatura.ts
  - src/features/hub-candidato/services/__tests__/analiseCandidatoService.test.ts
  - src/features/hub-candidato/services/__tests__/historicoCandidaturaService.test.ts
  - src/features/hub-candidato/services/analiseCandidatoService.ts
  - src/features/hub-candidato/services/historicoCandidaturaService.ts
findings:
  critical: 1
  warning: 2
  info: 4
  total: 7
status: resolved
resolution:
  fixed: [CR-01, WR-01, WR-02, IN-02]
  fix_commits: [1b462b3, 2c0df39, 0dd31f8]
  remaining_info: [IN-01, IN-03, IN-04]
  note: >-
    Critical + Warning findings fixed and committed during autonomous code-review-fix chain.
    IN-02 (noopener tabnabbing) folded into the CR-01 rewrite via win.opener=null (noopener
    feature-string was intentionally NOT used because it forces window.open to return null,
    breaking the placeholder-then-navigate activation pattern). 3 advisory INFO items remain.
    Post-fix: build green, 83/83 affected tests green, tsc 97 (0 new errors in touched files).
---

# Phase 34: Code Review Report

**Reviewed:** 2026-07-16T18:30:00Z
**Depth:** standard
**Files Reviewed:** 32
**Status:** resolved (CR-01/WR-01/WR-02 + IN-02 fixed — commits 1b462b3, 2c0df39, 0dd31f8)

## Summary

Phase 34 wires four RH surfaces (CV, IA analysis, agendamento, fila/KPIs) onto the candidate hub. The **security posture is strong and holds up under adversarial reading**: every candidate-data read uses an explicit column allowlist (never `select('*')`) — verified in `analiseCandidatoService`, `historicoCandidaturaService`, `filaTrabalhoService`, and `agendamentoService`; the four trigger-stamped scope/audit columns are correctly omitted from every agendamento write body; the CV signed URL is fetched imperatively and never cached in state or a query cache; the KPI dashboard sources everything from the `funil_kpis` DEFINER RPC with zero client-side aggregation; and the charts use the `@/components/ui/chart` wrappers with `--chart-N` tokens (no raw recharts colors). The documented `as never` insert cast in `agendamentoService` is the accepted deviation and is NOT flagged.

The defects found are on the **correctness / completeness axis**, not the security axis:

- **1 BLOCKER:** the CV-open button (`CvButton`, VISRH-01 — the flagship feature of this phase) calls `window.open` *after* an `await`, which loses transient user activation. On Safari (always) and Chrome (frequently) the popup is blocked; the blocked call returns `null`, is not caught, and no error state is shown → the primary CV feature silently does nothing.
- **2 WARNINGs:** an `entrevistador` field is threaded through the agendamento schema/form-defaults/service/summary but has **no input control**, so it can never be set on a new agendamento (dead/incomplete field); and the cross-vaga `listFila` read is **unbounded**, contradicting the project's own "no unbounded queries (WR-05 precedent)" convention that its sibling `historicoCandidaturaService` explicitly follows.
- **4 INFO:** a dead ternary, a `window.open` hardening gap, a pre-existing no-op sort option, and an unguarded `NaN` day-count.

## Critical Issues

### CR-01: CvButton opens the signed URL after `await` → popup blocked, silent failure of VISRH-01

**File:** `src/features/hub-candidato/components/CvButton.tsx:31-44`
**Issue:** `handleOpen` awaits `getSignedUrl(candidaturaId)` (a network round-trip to the `get-curriculo-url` Edge Function) and only *then* calls `window.open(url, '_blank')`. Browsers require `window.open` to run synchronously inside the user-gesture handler to retain "transient activation." After an `await`, that activation is gone — WebKit/Safari blocks the popup unconditionally, and Chrome blocks it whenever the EF call is not near-instant. When the popup is blocked, `window.open` returns `null` **without throwing**, so the `catch`/`setError(false→true)` branch never runs: the user clicks "Abrir currículo", the spinner flashes, and nothing opens with no error feedback. This breaks the core feature this phase ships (VISRH-01) for a large fraction of real users, silently.
**Fix:** Open the tab synchronously (while activation is live), then point it at the resolved URL — and detect a blocked open:
```tsx
async function handleOpen() {
  if (loading) return
  setLoading(true)
  setError(false)
  // Open the tab NOW, inside the gesture, to keep user activation.
  const win = window.open('', '_blank', 'noopener,noreferrer')
  try {
    const url = await getSignedUrl(candidaturaId)
    if (win) {
      win.location.href = url // never stored/logged (Pitfall 7 preserved)
    } else {
      setError(true) // popup was blocked → surface the inline error
    }
  } catch {
    if (win) win.close()
    setError(true)
  } finally {
    setLoading(false)
  }
}
```
Note: opening a blank placeholder synchronously still never persists/logs the signed URL, so the Pitfall-7 invariant (and the `CvButton.test.tsx` no-`console.*` assertion) is preserved. If you keep `window.open(url, ...)` post-await, at minimum check its `null` return and call `setError(true)` so the failure is not silent.

## Warnings

### WR-01: `entrevistador` is a dead/unreachable field on the agendamento create form

**File:** `src/features/agendamento/components/AgendamentoBlock.tsx:219-235` (form defaults + submit) and `443-450` (form render); summary at `504-509`
**Issue:** `entrevistador` is carried end-to-end — it is in `agendamentoSchema`, in `AgendarInput`/`ReagendarInput`/`AgendamentoRow`, set as a `defaultValues` entry (`entrevistador: initial?.entrevistador ?? ''`), mapped on submit (`entrevistador: values.entrevistador?.trim() ? ... : null`), written by the service, and conditionally rendered on the summary card ("Entrevistador"). But the `AgendamentoForm` JSX renders **no input** for it (only data_hora, tipo, local_ou_link, observacoes_rh). Consequences: for every agendamento created through the UI, `entrevistador` is always `null`, so the "Entrevistador" summary row is unreachable via the app; and the field silently rides along in the payload with no way for RH to set it. This is an incomplete feature / dead code path that will read as a bug ("where do I enter the interviewer?").
**Fix:** Either (a) add the missing input (an `<Input {...register('entrevistador')} />` block mirroring the local/link field), or (b) if entrevistador is intentionally deferred, remove it from `defaultValues`, the submit mapper, and the summary render so the code stops implying a capability that does not exist. Prefer (a) since the summary card already displays it.

### WR-02: `listFila` issues an unbounded read, contradicting the project's "no unbounded queries" convention

**File:** `src/features/funil/services/filaTrabalhoService.ts:60-73`
**Issue:** The cross-vaga queue read selects `v_fila_trabalho` with an `.order(...)` but **no `.limit(...)`**. The sibling `historicoCandidaturaService.ts:37-38,67` explicitly bounds its read (`const READ_LIMIT = 100 // Defensive bound ... no unbounded queries — WR-05 precedent`). The fila is a cross-vaga aggregate that grows with every waiting candidatura across all owned vagas and renders one full table row each — precisely the shape that convention guards against. This is an inconsistency + robustness gap (not flagged as a perf finding, which is out of v1 scope; flagged as a defensive-bound convention violation).
**Fix:** Add the same defensive bound and (optionally) surface a "showing first N" affordance:
```ts
const FILA_READ_LIMIT = 200
// ...
  .from('v_fila_trabalho')
  .select(FILA_ALLOWLIST)
  .order('entrou_etapa_em', { ascending: true })
  .limit(FILA_READ_LIMIT)
```

## Info

### IN-01: Dead ternary — `submitLabel` returns the same string in both branches

**File:** `src/features/agendamento/components/AgendamentoBlock.tsx:449`
**Issue:** `submitLabel={isReschedule ? 'Salvar agendamento' : 'Salvar agendamento'}` — both arms are identical, so the ternary (and the `isReschedule` distinction it implies) is dead. Almost certainly the reschedule arm was meant to read differently (e.g. `'Salvar reagendamento'`).
**Fix:** Either give the reschedule branch its intended distinct label or drop the ternary: `submitLabel="Salvar agendamento"`.

### IN-02: `window.open` for the CV opens without `noopener`/`noreferrer`

**File:** `src/features/hub-candidato/components/CvButton.tsx:38`
**Issue:** `window.open(url, '_blank')` omits the `'noopener,noreferrer'` feature string, so the opened tab retains a `window.opener` back-reference (reverse-tabnabbing hardening gap). Risk is low here (the target is a Supabase-storage signed PDF, not attacker-controlled), but it is free to close. This is folded into the CR-01 fix snippet.
**Fix:** Pass `'noopener,noreferrer'` as the third `window.open` argument (see CR-01).

### IN-03: "Maior Score" sort option is a no-op (pre-existing)

**File:** `src/components/pages/CandidatosRHPage.tsx:226-228`
**Issue:** The `sortBy === 'score'` branch is an empty case with a `// TODO: Quando tiver scores calculados, ordenar por eles`. The "Maior Score" option is offered in the UI (`SelectItem value="score"`) but selecting it does nothing — a dead user-facing affordance. Pre-existing (outside the phase-34 change, which only adds the Fila tab), noted for completeness.
**Fix:** Implement the score sort, or hide the "Maior Score" option until it is backed, so the control does not silently no-op.

### IN-04: `diasNaEtapa` does not guard `NaN` from an invalid timestamp

**File:** `src/features/funil/constants/slaThresholds.ts:58-61`
**Issue:** For a malformed `entrouEtapaEm`, `new Date(entrouEtapaEm)` is `Invalid Date`, `differenceInCalendarDays` returns `NaN`, and the `dias < 0 ? 0 : dias` clamp lets `NaN` through (`NaN < 0` is `false`). The Fila cell would then render `NaN dias` and `classifySla(etapa, NaN)` falls through to `within`. Low likelihood given `entrou_etapa_em` is a typed non-null ISO from the view, but the JSDoc claims totality ("never throws / clamps"), so the guard should cover `NaN` too.
**Fix:** `const dias = differenceInCalendarDays(now, new Date(entrouEtapaEm)); return Number.isFinite(dias) && dias > 0 ? dias : 0`.

---

_Reviewed: 2026-07-16T18:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
