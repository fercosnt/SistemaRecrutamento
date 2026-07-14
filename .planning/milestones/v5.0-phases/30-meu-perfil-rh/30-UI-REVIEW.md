# Phase 30 — UI Review (Meu Perfil RH)

**Audited:** 2026-07-14
**Baseline:** `30-UI-SPEC.md` (approved design contract)
**Screenshots:** not captured (dev server on port 3003 down; port 3000 = unrelated service returning 307) — code-only audit
**Stance:** advisory / non-blocking. Code-review already resolved WR-01/02/03 + IN-03; those are NOT re-reported.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | GoTrue-honest password copy; two tiny gaps — read-only note omits e-mail; CTA "Salvar" vs "Salvar perfil" |
| 2. Visuals | 3/4 | Clean h1→h2→field hierarchy; turquoise appears on 3 surfaces in one section, diluting the single-accent focal intent |
| 3. Color | 3/4 | AA-safe detached turquoise CTA + no `text-white/50`; focus ring is blue (`--ring`), not the turquoise the SPEC reserves |
| 4. Typography | 4/4 | Weights constrained to 400/600 as declared; sizes map to the ladder (one decorative `text-2xl` avatar glyph) |
| 5. Spacing | 4/4 | Entirely on the 4px scale; only brackets are intentional `min-h-[44px]` touch targets + avatar `h-20 w-20` |
| 6. Experience Design | 4/4 | **SEG-03 verified** (no role/cargo/email affordance); AsyncState + per-CTA pending + full error mapping |

**Overall: 21/24**

---

## Top 3 Priority Fixes (all WARNING / non-blocking)

1. **Turquoise accent on 3 surfaces in the Perfil section** — the avatar fallback disc (`bg-[#35BFAD]` full-strength, `AvatarUpload.tsx:89`), the Papel badge (`bg-[#35BFAD]/20`, `PerfilSection.tsx:134`), and the Salvar CTA (`bg-[#35BFAD]`, `PerfilSection.tsx:145`) all use the accent. The SPEC checker map says "single accent per section." *Impact:* the primary CTA no longer visually dominates. *Fix:* soften the avatar fallback disc to a neutral glass tint (e.g. `bg-white/15`) so the turquoise CTA is the sole full-strength accent.
2. **Focus ring diverges from the color contract** — UI-SPEC §Color reserves turquoise for "primary submit CTAs, **focus ring**," but the shared `Input`/`Button` primitives ring on `--ring` = `#00109E` (deep blue), and no perfil field overrides it (`input.tsx:14`, no `ring` class anywhere in `src/features/perfil-rh`). *Impact:* minor contract drift (blue ring is still AA-visible). *Fix:* either add `focus-visible:ring-[#35BFAD]/50` to the perfil inputs/CTAs, or amend the SPEC to accept the blue app-wide ring.
3. **Copy: read-only note omits e-mail** — `PerfilSection.tsx:137-139` reads "Papel e cargo são geridos por um administrador." but e-mail is *also* shown read-only (`:124-126`) with no explanation. *Impact:* a user may wonder how to change their e-mail. *Fix:* "E-mail, papel e cargo são geridos por um administrador." Optionally relabel the CTA `PerfilSection.tsx:153` "Salvar" → "Salvar perfil" for scan-ability (the SPEC's own §Section-1 header literally calls it "Salvar", so this is discretionary polish, not a violation).

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)
- **Password copy is GoTrue-accurate (exceeds contract).** Success = `toast.success('Senha alterada com sucesso.')` (`usePerfilRh.ts:125`) + `reset()` fields, session stays valid — no invented "logout" or "email de confirmação" (`SenhaSection.tsx:58-59`, `perfilRhService.ts:214` rotates on the live session, no `signOut`). Matches SPEC §Copy honesty exactly.
- **Avatar helper is honest** — "PNG, JPG ou WebP, até 2 MB." (`AvatarUpload.tsx:136`) is exactly what `validateAvatar` + the bucket enforce (`perfilRhService.ts:76-108`).
- **Error copy is truthful about transients** — a 429/network/≥500 re-auth failure maps to NETWORK_ERROR, NOT a false "Senha atual incorreta." (`perfilRhService.ts:198-211`). Genuinely careful.
- Minor gap A: read-only note omits e-mail (see Top Fix 3). Minor gap B: CTA "Salvar" is generic vs the scannable "Salvar perfil" (`PerfilSection.tsx:153`).

### Pillar 2: Visuals (3/4)
- Clear focal hierarchy: h1 `text-3xl md:text-4xl` → h2 `text-xl` section headings → `text-sm` fields (`MeuPerfilPage.tsx:30`, `PerfilSection.tsx:90`, `SenhaSection.tsx:82`).
- Avatar trigger pairs the Camera icon WITH text "Alterar foto" (`AvatarUpload.tsx:116-119`) — no icon-only ambiguity; all decorative icons are `aria-hidden`.
- Deduction: three turquoise surfaces in the Perfil section dilute the single-accent intent (see Top Fix 1). The full-strength avatar disc competes with the primary CTA.

### Pillar 3: Color (3/4)
- 60/30/10 respected: deep-blue background (RHLayout `BackgroundImage="darkBlue"`), glass-white surfaces (`GlassCard variant="white"`), turquoise accent.
- **AA-safe values throughout — `text-white/50` count in the feature + chrome + host = 0** (grep clean); this clears the axe Tier-A gate concern. Muted text `text-white/70`, labels/helpers/placeholders `text-white/60` (`PerfilSection.tsx:91,124,129,137`, `SenhaSection.tsx:83`) — matches SPEC §AA-safe.
- CTA uses the detached turquoise `bg-[#35BFAD] text-[#04121F] hover:bg-[#2ba99a]` (`PerfilSection.tsx:145`, `SenhaSection.tsx:167`) — Phase-29 AA-correct, never blue-on-blue.
- Papel badge `bg-[#35BFAD]/20 text-white` non-interactive (`PerfilSection.tsx:134`) — the SPEC-blessed Phase-29 value.
- All hardcoded hex (`#35BFAD`, `#04121F`, `#2ba99a`) are intentional brand-accent values matching Phase-29, not arbitrary drift.
- Deductions: focus ring is blue not turquoise (Top Fix 2); accent-per-section overuse (Top Fix 1).

### Pillar 4: Typography (4/4)
- Weights constrained to `font-semibold` (600) + inherited normal (400) — exactly SPEC §Type ladder "Weights 400 + 600."
- Font inherits `--font-family` (Helvetica Neue stack, `globals.css:75`) via `body` — no Montserrat/Inter reference anywhere. Correct.
- Sizes map to the declared ladder (4xl/3xl h1, xl headings, sm body, xs helper). One off-ladder value: `text-2xl` on the avatar initial glyph (`AvatarUpload.tsx:97`) — a single decorative fallback char, negligible.

### Pillar 5: Spacing (4/4)
- All spacing on the 4px scale: `space-y-6/3/2/1/0.5`, `gap-4/3/2`, `p-4`, `px-4`, `py-3`, `max-w-3xl`. No off-scale drift.
- The only arbitrary brackets are `min-h-[44px]` (deliberate WCAG touch-target token on every CTA + the avatar button — `PerfilSection.tsx:145`, `SenhaSection.tsx:167`, `AvatarUpload.tsx:108`) and the avatar `h-20 w-20` disc. Both intentional, not drift.

### Pillar 6: Experience Design (4/4)
- **SEG-03 (CRITICAL) — PASS.** `PerfilSection.tsx:122-140` renders E-mail/Cargo/Papel inside a `<dl>` of plain `<dt>/<dd>` text; Papel is a non-interactive `<span>` Badge (`:134`); the ONLY editable identity control is `nome_completo` (`:102-108`). There is **no input, select, or button** touching role/cargo/email. The read-only context rows are not focus targets (no tab-trap). The load-bearing UX truth holds by construction.
- **States** — the whole body is gated by `<AsyncState>` (loading skeleton / error+retry / success, `MeuPerfilPage.tsx:34-53`); own row loads via `.single()` so a missing row → error state, never blank. Per-CTA pending everywhere: Salvar → `Loader2 "Salvando…"`, Alterar senha → `"Alterando…"`, avatar → `"Enviando…"`, all `disabled` while pending (no double-submit).
- **Interaction correctness** — two independent forms with separate submits/pending; avatar auto-save always carries a schema-valid nome (`PerfilSection.tsx:72-78`, defends WR-03/WARNING-#3); re-auth-before-rotate password flow (`perfilRhService.ts:186-215`); error mapping WRONG_CURRENT→field / WEAK→field / generic→field (`SenhaSection.tsx:60-75`).
- Negligible notes (not scored down): avatar *success* is announced only via the global sonner toast, not an in-component `aria-live` line (the "Enviando…" polite status IS present, `AvatarUpload.tsx:138-142`); the avatar inline error is `role="alert"` but not `aria-describedby`-linked to the sr-only input (announced anyway).

---

## Accessibility (WCAG-AA) — summary
- Every field: `<Label htmlFor>` + `aria-invalid` + `aria-describedby` + inline `role="alert"` error (name field + all 3 password fields). Verified.
- Avatar: real focusable `<button>`; hidden input `tabIndex={-1}` + `aria-label` (IN-03, already fixed); `<img alt="Foto de perfil de {nome}">`; upload `role="status" aria-live="polite"`.
- Contrast: turquoise CTA `#04121F` on `#35BFAD` (very high); no `text-white/50`; error text `text-red-400` on dark glass (lighter = higher contrast on dark, AA-safe).
- Read-only context rows are plain text → no confusing tab stops.

## Minor recommendations (beyond Top 3)
- AsyncState loading state is a single generic `h-24` skeleton bar (`AsyncState.tsx:164`), not the SPEC §Loading "name field + avatar placeholder + section frames" shape. It IS a skeleton (not spinner-only), so the intent is met; a form-shaped skeleton would improve parity.
- Add an in-component avatar success `aria-live` line for exact parity with SPEC §A11y ("'Enviando…'/success").
- Dead class: `placeholder:text-white/60` sits on inputs that render no placeholder text — harmless but inert.

## Registry Safety
Not applicable — `30-UI-SPEC.md` lists no third-party registries; all primitives (`Input`/`Button`/`Badge`/`Label`) are shadcn-official with pinned Radix versions. No registry audit performed.

## Files Audited
- `.planning/phases/30-meu-perfil-rh/30-UI-SPEC.md` (contract)
- `src/components/pages/MeuPerfilPage.tsx` (host — single RHLayout owner)
- `src/features/perfil-rh/components/PerfilSection.tsx`
- `src/features/perfil-rh/components/SenhaSection.tsx`
- `src/features/perfil-rh/components/AvatarUpload.tsx`
- `src/features/perfil-rh/hooks/usePerfilRh.ts`
- `src/features/perfil-rh/services/perfilRhService.ts`
- `src/features/perfil-rh/schemas/perfilRhSchemas.ts`
- `src/components/RHTopBar.tsx`, `src/components/RHSidebar.tsx`, `src/components/RHLayout.tsx` (chrome / name+avatar propagation)
- `src/components/ui/AsyncState.tsx`, `input.tsx`, `button.tsx`, `badge.tsx`, `label.tsx`
- `tailwind.config.js`, `src/styles/globals.css` (real tokens)
