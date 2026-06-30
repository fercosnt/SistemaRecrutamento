---
phase: 20-refino-rh-editar-guia-de-entrevista-seed-001
reviewed: 2026-06-30T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - supabase/migrations/20260629190949_entrevista_guia_edits.sql
  - supabase/functions/gerar-guia-entrevista/index.ts
  - src/features/entrevista/services/entrevistaService.ts
  - src/features/entrevista/hooks/useEntrevistaScorecard.ts
  - src/features/entrevista/components/GuiaEntrevistaPanel.tsx
  - src/features/entrevista/components/EntrevistaWorkspace.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-06-30
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the Phase 20 write-path (RH edits the interview guide): the `save_entrevista_guia_edits` migration/RPC, the `gerar-guia-entrevista` EF merge, the service layer, the hook, and the two panels.

**The security/authz invariants hold and are well-built.** The RPC derives role from `public.usuarios_rh` (not the JWT claim), filters `ativo AND deleted_at IS NULL` with `recrutador→rh`, gates own-vaga via `candidaturas→vagas.created_by`, admin-bypasses, raises `42501` for RH-without-posse / candidato, `REVOKE PUBLIC` + `GRANT authenticated`, `SECURITY DEFINER` + `search_path=''`, and never touches `candidaturas` (RNF-07a). The EF mirrors the same authenticate-THEN-authorize posture with an explicit candidatura↔vaga cross-check. The service maps `42501→FORBIDDEN` with user-safe copy and never echoes the raw RPC error; reads use column allowlists; npm imports are static. The anti-silent-discard ordering (merge BEFORE the `guide ?? {incompleto}` fallback, split by `origem` not text) is correct, and the EF's `currentGuia?.questions ?? currentGuia?.perguntas` read does find the RPC-persisted pt-BR shape, so a manual question is not dropped on regen.

**However, there is one BLOCKER: a cross-layer key-shape collision corrupts the text of preserved manual questions on EF regen** (the manual rows survive as objects but render with an empty `pergunta`). Plus four warnings around the merge/round-trip and a missed-discard window, and three info items.

## Critical Issues

### CR-01: EF merge writes manual (pt-BR) and IA (English) questions under one `questions` key → manual question text is blanked on read-back after a regen

**File:** `supabase/functions/gerar-guia-entrevista/index.ts:328-356`, with the read collision at `src/features/entrevista/services/entrevistaService.ts:286-301`

**Issue:** The two writers disagree on the per-question key shape, and the EF merge mixes both shapes into one array under the English `questions` key:

- The RPC save (`saveGuiaEdits`) persists manual questions in **pt-BR** shape: `entrevistaService.ts:508` writes `p_guia: { perguntas }`, where each row is `{ pergunta, dimensao, origem:'manual' }` (built in `GuiaEntrevistaPanel.addManual`, line 464-470, and `changePergunta`/`changeDimensao`, lines 438-444).
- The EF persists IA questions in **English** shape: `{ question, competency, ..., origem:'ia' }` (`InterviewGuideSchema`).
- On regen, the EF preserves manual rows verbatim (`manualQs`, line 338) and concatenates them with fresh IA rows: `mergedQuestions = [...manualQs, ...freshIaQs]` (line 343), then writes `guia: { ...guide, questions: mergedQuestions }` (line 350) — i.e. the **whole** merged array (including the pt-BR manual rows) lands under the English `questions` key.

When the service reads this back, `normalizeGuia` (lines 290-300) maps every element of `questions` through `pergunta: typeof q.question === 'string' ? q.question : ''`. A preserved manual row has **no** `question` field (its text is under `pergunta`), so it normalizes to `pergunta: ''`. The manual row is technically "preserved" (it survives as an object and keeps `origem:'manual'`), but **its question text is wiped to an empty string** in the rendered panel. To the RH this is indistinguishable from data loss — the manual question they added shows up blank after any subsequent IA regen. This defeats the spirit of the ENTREV-08 anti-silent-discard guarantee (the row is not dropped, but its content is destroyed).

Note the inverse round-trip is also fragile: when the RPC stores `{ perguntas: [...] }` and the EF's *next* regen merges, `freshIaQs` keeps English keys while `manualQs` keeps pt-BR keys, and the array is heterogeneous from then on.

**Fix:** Normalize both sides to ONE shape at the merge boundary. Stamp manual rows into the same English-key shape the EF emits before concatenating (or, conversely, persist a single canonical shape end-to-end). Minimal fix in the EF:

```ts
// Re-key preserved manual rows into the EF OUTPUT shape so normalizeGuia maps them.
const manualQs = currentQs
  .filter((q) => q.origem === "manual")
  .map((q) => ({
    ...q,
    // carry text under BOTH the EF key and the pt-BR key so either reader is non-lossy
    question: typeof q.question === "string" ? q.question : (q.pergunta ?? ""),
    competency: typeof q.competency === "string" ? q.competency : (q.dimensao ?? null),
    origem: "manual" as const,
  }));
```

Alternatively, make `normalizeGuia` fall back to the pt-BR keys when the English ones are absent (`pergunta: q.question ?? q.pergunta ?? ''`), which also fixes the read side without changing the write. Either way, add a round-trip test: RPC-save a manual question → EF regen → `getGuia` → assert the manual row still carries its text.

## Warnings

### WR-01: `normalizeGuia` early-returns when `perguntas` is present, so a guide written by the RPC is never re-bridged — masking and entrenching the CR-01 shape split

**File:** `src/features/entrevista/services/entrevistaService.ts:288-289`

**Issue:** `normalizeGuia` returns the guide untouched the moment it sees an array under `perguntas` (line 289). After an RPC save, the row is `{ perguntas: [...] }`, so `getGuia` returns it verbatim — manual rows render fine in this path. But after an EF regen the row is `{ questions: [...mixed...] }` (no top-level `perguntas`), so the English branch runs and hits CR-01. The two persisted shapes (`perguntas` vs `questions`) are never reconciled, and which one you get depends on whether the last writer was the RPC or the EF. This non-determinism is the root enabler of CR-01 and makes the round-trip behavior depend on write order.

**Fix:** Converge on a single persisted shape (see CR-01). If the read layer must tolerate both, make the pt-BR branch also re-key any English-only rows, instead of early-returning, so the array is homogeneous regardless of writer.

### WR-02: EF regen drops the manual row's `dimensao`/`score_atual` (only `origem` survives the round-trip cleanly), narrowing what "preserve" means

**File:** `supabase/functions/gerar-guia-entrevista/index.ts:338`

**Issue:** `manualQs` is spread verbatim, so for a manual row authored via the panel (`{ pergunta, dimensao, origem }`) the `dimensao` is preserved in the object — but because the merged array is written under `questions` and read via `normalizeGuia`, `dimensao` is RE-DERIVED from `q.competency` (line 295), which a manual row does not have → `dimensao: null`. So after a regen, a manual question loses both its text (CR-01) AND its dimension. This is the same root cause as CR-01 but worth calling out: the preserve guarantee silently degrades manual metadata, not just the question text.

**Fix:** Covered by the CR-01 fix (re-key `dimensao→competency` for manual rows before merge, or fall back in `normalizeGuia`).

### WR-03: `saveGuiaEdits` overwrites the entire guide jsonb, discarding all EF-only fields (BARS anchors, rationale, follow-up probes, introduction, closing, scoring_instructions)

**File:** `src/features/entrevista/services/entrevistaService.ts:494-515` and the RPC body `supabase/migrations/20260629190949_entrevista_guia_edits.sql:143-146`

**Issue:** The client sends `p_guia: { perguntas }` — ONLY the edited questions array, with each question carrying just `{ pergunta, dimensao, origem }` (the panel's `changePergunta`/`changeDimensao`/`addManual` never carry `bars_anchors`, `rationale`, `follow_up_probes`, etc.). The RPC does `guia = EXCLUDED.guia` (full replace, line 146). So the first time an RH clicks "Salvar edições", every IA-authored field on every question — the BARS 1-5 anchors the panel header claims to render, the probes, the introduction/closing/scoring_instructions — is permanently destroyed. The panel still prints the static "Âncoras BARS 1–5" label (GuiaEntrevistaPanel.tsx:155-157, 284-286) but the underlying data is gone, so the label becomes a lie after the first save. The panel doc-comment claims "IA-only fields (BARS/probes/flags) stay read-only display in BOTH modes" — but they are not carried through the save, so they do not survive it.

**Fix:** Have the panel carry the full original question object through edit mode (it already starts from `perguntas`, which is spread from the EF row, so `bars_anchors` etc. are present on `p` — but `addManual` creates a bare row and the edit handlers spread `...p`, so existing rows DO keep them). The actual gap is the **English fields**: `perguntasOf` reads the normalized pt-BR `perguntas[]` (which `normalizeGuia` produced by spreading `...q`, so the English `bars_anchors`/`rationale` ARE on the row). Confirm the draft round-trips those via the `...p` spread in `changePergunta`/`changeDimensao` (it does) — but `saveGuiaEdits` only sends `{ perguntas }` at the top level, dropping `guia.introduction`/`closing`/`scoring_instructions` and `foco`. Either send the full merged guide object from the panel, or have the RPC merge `EXCLUDED.guia` into the existing `guia` (jsonb `||`) instead of replacing it.

### WR-04: `gerarGuia` (regen) does not confirm a manual edit was preserved before invalidating, and the EF write is fire-and-forget (no `await` error surfaced)

**File:** `supabase/functions/gerar-guia-entrevista/index.ts:345-356`

**Issue:** The final `await supabaseAdmin.from("entrevista_guias").upsert(...)` does not check the returned `error`. If the upsert fails (constraint, transient), the EF still returns `{ ok: true }` (line 369) and the client's `gerarGuia` treats it as success and reads back the *old* guide. The merge logic is carefully ordered to never drop a manual question, but a silent write failure bypasses all of it — the regen appears to succeed while the new guide was never persisted. Given this is the most security/data-sensitive write-path in the milestone, a swallowed write error is a real anti-silent-discard hole at the persistence layer (distinct from the merge-time hole the code guards against).

**Fix:** Capture and check the upsert error:
```ts
const { error: upsertErr } = await supabaseAdmin.from("entrevista_guias").upsert(..., { onConflict: "candidatura_id,tipo" });
if (upsertErr) return errorResponse("SERVER_ERROR", "Falha ao persistir a guia.", 500);
```

## Info

### IN-01: `useEntrevistaScorecard` `saveEdits.error` cast assumes `EntrevistaServiceError` but `getGuia` (run inside `saveGuiaEdits`) can throw `DATABASE_ERROR` whose `.code` is not a recognized panel code

**File:** `src/features/entrevista/components/EntrevistaWorkspace.tsx:174-176` and `entrevistaService.ts:514`

**Issue:** `saveGuiaEdits` calls `getGuia(candidaturaId)` after the RPC (line 514); if that read-back fails it throws an `EntrevistaServiceError` with code `DATABASE_ERROR`. The panel's `isPermissionError` only matches `FORBIDDEN`/`insufficient_privilege`, so this surfaces as the generic error — acceptable, but the toast in `EntrevistaWorkspace.useEffect` (line 96-98) fires `success` only on `isSuccess`, so a post-RPC read-back failure correctly shows the error region. No action required beyond awareness; the write itself already succeeded server-side while the UI shows a save error, which can confuse the RH into re-saving.

**Fix:** Optionally treat a successful RPC + failed read-back as success (the write landed) — invalidate and toast success, letting the query refetch drive the panel.

### IN-02: `PerguntaRow`/`EditablePerguntaRow` use array index as React key (`key={i}`)

**File:** `src/features/entrevista/components/GuiaEntrevistaPanel.tsx:542, 551`

**Issue:** Edit mode supports reorder (`moveUp`/`moveDown`) and delete, so index keys cause React to reconcile by position rather than identity — when rows are reordered, the inline `Input`/`Select` internal state and focus can attach to the wrong logical row, and a delete can visually "shift" the wrong row's transient state. Not a data-correctness bug (the draft array is the source of truth and is updated correctly), but it can produce confusing focus/caret behavior mid-edit.

**Fix:** Derive a stable key (e.g. a per-row `id` stamped on add, or `origem + pergunta.slice(0,16) + i` as a weak fallback) so reorder/delete preserves row identity.

### IN-03: `weakDimHint` hardcodes "< 3" in copy while the threshold is dynamic (3 online / 4 presencial)

**File:** `src/features/entrevista/components/GuiaEntrevistaPanel.tsx:112-117`

**Issue:** `weakDimHint` returns `Cobre ${dimensao} (score atual ${n} < 3)` unconditionally, but for a presencial guide the weak threshold is 4 (EF line 223, and the panel's own presencial note at line 525 says "< 4"). For a presencial guide a question covering a score-3 dimension would render "(score atual 3 < 3)", which is false. Cosmetic, but contradicts the panel's own presencial banner.

**Fix:** Thread the tipo/threshold into `weakDimHint` (the row already knows `guia.tipo`), or read the threshold from the guide context.

---

_Reviewed: 2026-06-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
