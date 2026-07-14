# Phase 29 — UI Review

**Audited:** 2026-07-13
**Baseline:** `29-UI-SPEC.md` (approved design contract)
**Screenshots:** not captured — dev server on port 3003 (project default) not running; this is a code-only audit (Tailwind class audit + WCAG contrast math + state/interaction trace). Live axe-core run still recommended for the two contrast pairs and the in-menu tooltip below.
**Verdict:** ADVISORY / non-blocking. Ship-quality overall; three targeted polish items open, none breaks task completion.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Design-system fidelity | 3/4 | Live Helvetica stack + 4px grid + 400/600 ladder all clean; the reserved turquoise accent is never applied to the CTA. |
| 2. Layout / hierarchy | 3/4 | Single RHLayout owner + exact column set; but the focal CTA is deep-blue-on-deep-blue, so the intended accent anchor doesn't read. |
| 3. States | 4/4 | AsyncState 5-state + per-button verb-in-progress pending + refetch-on-success (server-truth for anti-lockout). Cleanest pillar. |
| 4. Accessibility (AA gate) | 2/4 | `text-white/50` on rendered text ("(você)" ~4:1 @12px) + input placeholders fail AA 4.5:1 → axe Tier-A gate at risk. |
| 5. Copy honesty | 3/4 | Fully honest — no phantom channel; but three toasts drift from the *verbatim* contract (drop the `{email}` the spec promised). |
| 6. Interaction correctness | 3/4 | Confirms + anti-lockout correct; row-path `error_code→UX` map is incomplete (FORBIDDEN / NOT_FOUND fall to the generic bucket). |

**Overall: 18/24**

---

## Top 3 Priority Fixes

1. **Primary CTA "Novo usuário" has no boundary against the field** — `GestaoUsuariosPage.tsx:51` renders `<Button>` default variant (`bg-primary` = `#00109E`, no border) directly over the `RHLayout` `darkBlue` field, whose base layer is a solid `bg-[#00109E]` (`BackgroundImage.tsx:77`). Fill-vs-field non-text contrast ≈ **1:1** (WCAG 1.4.11 needs 3:1), so the single most important action reads as flat blue-on-blue and the "single turquoise accent CTA" focal intent (UI-SPEC §Color reserved-list item 1) is never realized — accent `#35BFAD` appears only on the avatar gradient and the Administrador badge. **Fix:** give the CTA the reserved turquoise (e.g. `className="min-h-[44px] bg-[#35BFAD] text-[#00109E] hover:bg-[#2DA89A]"`) or at minimum a `border border-white/30` so it detaches from the field. This is the one place the spec's 10% accent is supposed to land.

2. **`text-white/50` rendered-text pairs fail the AA gate** — two live pairs sit below 4.5:1 on the dark-blue field: the **"(você)" self-marker** `text-xs text-white/50` (`UsuariosRhTable.tsx:161`, ≈4.0:1 @12px) and the three **input placeholders** `placeholder:text-white/50` (`NovoUsuarioDialog.tsx:150,174,199`). The spec's own §Layout line prescribed `/50` for "(você)", but §Accessibility makes "axe-core Tier-A must stay green" binding — the two conflict and AA wins. **Fix:** bump "(você)" to `text-white/70` (same idiom just applied to the Inativo badge in IN-03) and placeholders to `placeholder:text-white/60` (the email cell already proves `/60` clears ~5.3:1). Confirm on the live axe run.

3. **Row-action `error_code→UX` map is incomplete + success toasts drop `{email}`** — `useUsuariosRh.ts:toastRowError` (L49-64) maps only `LAST_ADMIN`/`UNAUTHORIZED`/`EMAIL_SEND_FAILED`; `FORBIDDEN` and `NOT_FOUND` fall to the generic "Não foi possível concluir a ação." instead of the contracted "Você não tem permissão para esta ação." / "Usuário não encontrado." (§Copywriting). Separately, create-success (`useUsuariosRh.ts:93`) and reset-success (`:140`) omit the `{email}` the contract names ("...para **ele** definir a senha." vs spec "...para **{email}** definir a senha."). **Fix:** add the two branches to `toastRowError`; interpolate the target email into both success toasts (the reset hook has `targetId` only — pass the row email through, or accept the generic wording as a spec amendment). Honesty is intact throughout; this is contract-fidelity, not a lie.

---

## Detailed Findings

### Pillar 1: Design-system fidelity (3/4)
- **Font — PASS.** No unloaded face introduced. `--font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif` is applied on `body` (`globals.css:75,164`); every Phase-29 file relies on the inherited stack. The `beauty-smile-design-system` skill's Montserrat/Inter are correctly NOT referenced.
- **Spacing — PASS.** 4px grid throughout: `space-y-6/4/2/1`, `gap-4/3/2/1`, `p-6`/`py-12`/`p-12` (AsyncState), `h-10 w-10` avatar, `px-2 py-0.5` badge default. Only arbitrary values are `min-h-[44px]`/`min-w-[44px]` (44 = 4×11, on-grid) and color hexes. No off-grid px.
- **Typography — PASS.** Sizes reduce to the 4 declared roles: H1 `text-3xl md:text-4xl` (`GestaoUsuariosPage.tsx:44`), dialog title `text-xl` (`:130`,`EditarPapelDialog:149`), body/cell/label `text-sm`, micro `text-xs`. Weights: only `font-semibold` (600) is authored; body defaults to 400. The vendored `Button` primitive contributes 500 (`button.tsx:8 font-medium`) — a third weight, but scoped to buttons and sanctioned by §Typography ("matching the vendored primitives"). No 700/800. Clean two-load-bearing discipline.
- **Glass admin theme — PASS with nit.** Dialogs/menus/alerts use `bg-[#00109E]/95 backdrop-blur-xl border-white/25` glass surfaces (raw hex, not the `bg-primary` token). Per `[[reference_bg_primary_token_fixed]]` the token is no longer broken, so this is a token-discipline nit only — but it matches the established repo glass idiom (TriagemTable/dropdown), so acceptable.
- **Deduction:** the reserved turquoise accent (§Color item 1) never reaches the CTA — see Top Fix #1. Accent presence on the whole screen is the avatar gradient + one badge tint, under the intended 10%.

### Pillar 2: Layout / hierarchy (3/4)
- **Single shell owner — PASS.** `ConfiguracoesPage.tsx` mounts `<RHLayout>` once and delegates the body to `GestaoUsuariosPage` (which mounts NO layout). No double-nest; legacy `p-8` dropped; page frame is `space-y-6` (`GestaoUsuariosPage.tsx:41`) as contracted.
- **Header — PASS.** `flex flex-wrap items-center justify-between gap-4` with h1 + subtitle left, CTA right (`:42-55`). Matches §Layout item 1 verbatim including subtitle copy.
- **Columns — PASS.** Usuário / Cargo / Papel / Status / Último acesso / Ações, Ações right-aligned (`UsuariosRhTable.tsx:379-384`) — exact match to the §Layout table. Two-line Usuário cell (avatar disc + name over email) as specced.
- **Deduction:** focal weakness — the H1 (large white) is the only strong anchor; the CTA that was meant to be the turquoise accent reads flat (Top Fix #1), so the eye has no secondary accent target. Structure is right; emphasis is muted.

### Pillar 3: States (4/4)
- **5-state coverage — PASS.** `AsyncState` gates the roster (`GestaoUsuariosPage.tsx:57-75`): `isLoading`→skeleton, `isError`→AlertTriangle + "Tentar novamente"→`refetch`, `isEmpty`→defensive centered block, success→`<UsuariosRhTable>`. Priority order enforced by the component. Error/empty copy overridden to the exact spec strings.
- **Per-button pending — PASS.** Create "Criando…" (`NovoUsuarioDialog:268`), mudar_papel "Salvando…" (`EditarPapelDialog:132`), desativar "Desativando…" (`UsuariosRhTable:299`), resetar "Enviando…" (`:334`) — each with `Loader2` spinner + `disabled` (no double-submit). Ativar disables during pending (`:259`, IN-04) as a direct action; no label change needed since the menu closes on click.
- **Refetch not optimistic — PASS.** Every mutation `invalidateQueries(usuariosRhKeys.list)` (`useUsuariosRh.ts:95,108,122,141`); no optimistic write, so the anti-lockout `activeAdminCount` always reflects server truth (§States requirement).
- Minor: success renders `Glass(p-6)` (AsyncState `glass=true`) around the table's own `rounded-xl border` shell — a mild double-card, visually fine and within the spec's "GlassCard wrapping the Table."

### Pillar 4: Accessibility — WCAG-AA gate (2/4)
- **OPEN — contrast:** `text-white/50` on rendered text fails AA 4.5:1 for <18px text. "(você)" `text-xs text-white/50` (`UsuariosRhTable.tsx:161`) computes ≈4.0:1 over the `#00109E` field; the three `placeholder:text-white/50` inputs (`NovoUsuarioDialog.tsx:150,174,199`) are the same pair and axe-core evaluates placeholder text. This is the item the UI-checker flagged for the live run — see Top Fix #2. (Note: the "último-acesso" the task mentioned is actually `text-white/70` at `:198` and passes ~6.5:1 — already fine.)
- **CONFIRMED FIXED (not re-reported):** Inativo badge is `text-white/70` (`:184`, IN-03) ✓; UNAUTHORIZED toast present in both dialog and hook (IN-01) ✓; Ativar pending-disable (IN-04) ✓.
- **Anti-lockout tooltip keyboard reachability — CONFIRM + verify live.** The `EditarPapelDialog` demote case (`:200-207`) is correct: the `<span tabIndex={0} aria-disabled title>` sits in a `DialogFooter` inside a focus-trapped dialog, so Tab reaches it and `TooltipTrigger` fires on focus — solid. The `UsuariosRhTable` Desativar case (`:235-248`) is the residual risk: the same wrapper sits **inside a Radix `DropdownMenuContent`**, where keyboard nav is roving-tabindex + arrow keys over *menuitems*; a non-menuitem `tabIndex={0}` span may not receive arrow-key focus, so the tooltip (and its reason) can be unreachable via the menu's own keyboard model even though `title` still shows on hover. **Verify on the live keyboard/axe pass**; if it doesn't focus, move the reason into an always-present `aria-label`/visually-hidden note on the disabled item rather than relying on the wrapper.
- **PASS:** `aria-label="Ações"` on the icon-only trigger with `min-h/min-w-[44px]` (`:207-208`); inline field errors carry `role="alert"` + `aria-describedby` wiring (`NovoUsuarioDialog:152-161` etc.); Radix Dialog/AlertDialog give focus-trap + Esc + `DialogDescription`/`AlertDialogDescription`; every status/role is labeled text, never a bare dot; 44px targets on all interactive controls.
- **Minor:** global `--ring` is `brand-primary` `#00109E` (`globals.css:72`), so keyboard focus rings are blue-on-blue over the darkBlue field (low visibility) rather than the turquoise §Accessibility item 4 assumes. Pre-existing global-token issue, not Phase-29-authored, but it degrades focus-visible on this screen.

### Pillar 5: Copy honesty (3/4)
- **Honesty — PASS (the load-bearing part).** No over-promised channel: create helper "O usuário receberá um e-mail para definir a própria senha…" (`NovoUsuarioDialog:254-256`) matches the EF `resetPasswordForEmail`; reset confirm states "A senha atual continua válida até o usuário definir uma nova." (`UsuariosRhTable:322-325`) — no false "account locked" claim; deactivate confirm promises reactivation ("Você pode reativar depois.", `:288-289`). EMAIL_SEND_FAILED surfaces as `toast.warning`, honestly downgrading a partial failure (`useUsuariosRh.ts:58-60,89-91`).
- **OPEN — verbatim contract drift (not dishonest):** create-success drops `{email}` ("…para **ele** definir a senha.", `:93` vs contract "…para **{email}** definir a senha."); reset-success is generic ("E-mail de redefinição de senha enviado.", `:140` vs "…enviado para **{email}**."); create EMAIL_SEND_FAILED is reworded (`:89-90`). §Copywriting is a *verbatim* contract, so these count as drift — see Top Fix #3. Naming the recipient email was a deliberate spec choice (confirmation the mail went to the right address), so restoring `{email}` has real UX value.

### Pillar 6: Interaction correctness (3/4)
- **Destructive confirms — PASS.** Desativar and Resetar are behind `AlertDialog` with the exact titles/bodies (`UsuariosRhTable:278-345`); Ativar is a direct dropdown action, no confirm (`:257-264`), per §Row-Actions.
- **Anti-lockout — PASS.** `activeAdminCount` derived from loaded rows; the single active admin's row disables Desativar (`:228-252`) and the demote path is blocked in `EditarPapelDialog` via `wouldDemoteLastAdmin` (`:111-115,125`). Server `LAST_ADMIN` remains authoritative and maps to the exact toast on a race (`useUsuariosRh.ts:51-52`). Client hint is correctly UX-only.
- **OPEN — incomplete row-path error map.** `toastRowError` omits `FORBIDDEN` and `NOT_FOUND` (they hit the generic bucket) though §Copywriting contracts specific strings and the create dialog maps them (`NovoUsuarioDialog:105-108`). Low real-world reach (RoleGuard + EF authz), but the "full error_code→UX map" requirement isn't met on the mudar_papel/ativar/reset paths — see Top Fix #3.
- **Minor:** on a reset EMAIL_SEND_FAILED the confirm AlertDialog stays open (`handleResetar` `.catch` keeps `confirm`) while the warning toast fires — acceptable (enables retry) but the open confirm + warning combo is slightly ambiguous.

---

## Files Audited
- `.planning/phases/29-console-de-gest-o-de-usu-rios-rh/29-UI-SPEC.md` (baseline contract)
- `src/features/admin/components/GestaoUsuariosPage.tsx`
- `src/features/admin/components/UsuariosRhTable.tsx`
- `src/features/admin/components/NovoUsuarioDialog.tsx`
- `src/features/admin/components/EditarPapelDialog.tsx`
- `src/features/admin/hooks/useUsuariosRh.ts`
- `src/features/admin/schemas/usuarioRhSchemas.ts`
- `src/components/pages/ConfiguracoesPage.tsx`
- `src/components/ui/AsyncState.tsx`
- `src/components/ui/button.tsx`
- `src/components/BackgroundImage.tsx` + `src/components/RHLayout.tsx` (field/shell context)
- `tailwind.config.js` + `src/styles/globals.css` (token source of truth)

_Registry audit: not run — UI-SPEC §Registry Safety declares zero third-party registries (all primitives vendored under `src/components/ui/`); gate n/a._
