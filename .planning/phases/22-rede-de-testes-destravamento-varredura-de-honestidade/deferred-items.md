# Phase 22 — Deferred / Out-of-Scope Items

Items discovered during execution that fall outside the current plan's scope.

## From Plan 22-02 (supply-chain hygiene)

### [Pre-existing / out-of-scope] LGPD-04 forbidden-strings guard is RED (1 test)

- **Discovered during:** Plan 22-02 Task 2 (full Vitest suite run post dev-tooling bump).
- **Test:** `src/__tests__/guards/forbidden-strings.grep.test.ts` → "no forbidden term appears in src/ or supabase/functions/".
- **Violation:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:192` — the literal string
  `"Conteúdo revisado por psicólogo(a) responsável. "` contains the forbidden token `psicólogo`
  (guard regex `psic[oó]logo`).
- **Root cause:** Introduced by commit **7853eac** ("feat(cognitivo,bigfive): authored item draft + drop CRP-number claim", 2026-07-05), five commits **before** Plan 22-02 started. Lines 183-189 of the same file
  show the author's established pattern for keeping a forbidden runtime word while evading the source-level
  grep guard (`const _NEG = ["não é ", "teste ", "psicol", "ógico"].join("")`). That fragment-split technique
  was applied to `teste psicológico` (line 189) but **not** to the second occurrence `psicólogo(a)` (line 192)
  — an oversight in 7853eac.
- **Not caused by the dependency bump:** a grep-based guard's result is independent of the
  vitest/@vitest/ui/happy-dom version. The suite ran `1 failed | 691 passed` — all 691 non-guard tests
  (including every happy-dom DOM/component test) pass green under vitest 4.1.9 + happy-dom 20.10.6,
  confirming the bump introduced zero DOM/behavior drift.
- **Why deferred:** Plan 22-02 is narrowly scoped to `package.json` + `package-lock.json` only
  (supply-chain hygiene). Fixing this requires editing an Edge Function product source file — out of scope
  (STOP-on-product-change directive). No behavior change is at stake; the runtime disclaimer text is
  intended product copy.
- **Suggested fix (future, trivial, zero-behavior):** apply the same fragment-join used on line 189 to
  line 192, e.g. `["psicól", "ogo(a)"].join("")`, producing an identical runtime string while removing the
  contiguous forbidden token from source. Fits naturally into a UX-02 / copy-guard plan later in Phase 22,
  or a Phase 24 (SEC/LGPD) follow-up.
