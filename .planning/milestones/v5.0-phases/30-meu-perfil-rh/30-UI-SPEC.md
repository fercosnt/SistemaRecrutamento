---
phase: 30
slug: meu-perfil-rh
status: approved
reviewed_at: 2026-07-13
---

# Phase 30 — UI-SPEC: Meu Perfil RH (A37 self-service)

**Design contract** for `/rh/perfil` — the RH user's OWN profile (edit name, change password, upload photo). Replaces the "Edição de perfil em breve" stub. Authored inline by the orchestrator (spawned UI-researcher stalled on transient API instability); matches the **shipped Phase-29 console visual language** + its UI-REVIEW AA corrections. Scope = the user's own profile ONLY; third-party management is A14/Phase 29.

> **SEG-03 UX truth (load-bearing):** `role`, `cargo`, and `email` are shown **read-only** as context — the page has **NO affordance** (no input, no select, no button) to change one's own role. Only `nome_completo` + avatar + password are editable.

## Design tokens (real, from globals.css — VERIFIED)
- **Font:** the live Helvetica Neue stack (`--font-family`). Do NOT reference Montserrat/Inter (unloaded).
- **Type ladder:** `text-3xl md:text-4xl` (h1, 28→36) · `text-xl` (section headings, 20) · `text-sm` (body/labels, 14) · `text-xs` (helper, 12). Weights 400 + 600 (500 only in vendored primitives).
- **Color 60/30/10:** deep-blue `#00109E` dominant glass field · glass-white `bg-white/10–15` surface · turquoise `#35BFAD` accent — reserved for: primary submit CTAs, focus ring. **Accent is DETACHED from the field** (Phase-29 fix: CTA = `bg-[#35BFAD] text-[#04121F] hover:bg-[#2ba99a]`, never `bg-primary` blue-on-blue). Red `#EF4444` destructive/error.
- **AA-safe muted values (Phase-29 UI-REVIEW):** muted text `text-white/70`, placeholders `text-white/60`. **NEVER `text-white/50`** (fails AA 4.5:1). Read-only context labels (email/cargo/role) `text-white/70` value on `text-white/60` label.

## Layout
- **Single RHLayout owner:** `MeuPerfilPage` keeps the RH shell + page header; the body composes the sections. No nested RHLayout. Route `/rh/perfil` + `RoleGuard` (rh/administrador) UNCHANGED.
- **Header:** `<h1 class="text-3xl md:text-4xl font-semibold text-white">Meu Perfil</h1>` + a one-line `text-sm text-white/80` subtitle ("Atualize seus dados, senha e foto.").
- **Body:** `space-y-6`, `max-w-3xl` (desktop-first, single column — a profile is not a table). Two glass `GlassCard` sections stacked:
  1. **Perfil** (name + avatar + read-only context)
  2. **Senha** (change password)
- Own-profile record loads via own-row `.select(allowlist).eq('user_id', uid)` → gate the whole body with **`<AsyncState>`** (loading skeleton / error+retry / success). Never blank.

## Section 1 — Perfil
- **Avatar block:** circular preview (signed-URL render; fallback = initials disc, reuse the Phase-29 avatar-initial idiom). "Alterar foto" button (turquoise-outline or ghost) opens a file picker (`accept="image/png,image/jpeg,image/webp"`). Uploading → spinner + disabled, "Enviando…". ≤2MB. Honest helper: "PNG, JPG ou WebP, até 2 MB." Keyboard-operable (the button is a real `<button>`; the `<input type=file>` is visually-hidden but focusable/labeled). `alt` = "Foto de perfil de {nome}".
- **Nome de exibição:** RHF+Zod text input (label "Nome de exibição", min 3). `border-white/30 bg-white/20 text-white placeholder:text-white/60`. Inline `role="alert"` error.
- **Read-only context (SEG-03):** Email, Cargo, Papel rendered as **labelled read-only rows** (label `text-xs text-white/60`, value `text-sm text-white/70`) — visually a definition list, NOT inputs. A small note: "Papel e cargo são geridos por um administrador." (honest — reflects A14). Papel shown via the same Badge as Phase 29 (white on `#35BFAD/20` for administrador) but non-interactive.
- **Salvar (single CTA):** turquoise `bg-[#35BFAD] text-[#04121F]`, `min-h-[44px]`, disabled + `Loader2` "Salvando…" while pending. Calls the profile RPC with `{ nome, avatar_path }`. Success → `toast.success('Perfil atualizado.')` + refetch own row. Only shows when the form is dirty (or always-enabled; discretion).

## Section 2 — Senha
- Three fields (RHF+Zod): **Senha atual** · **Nova senha** · **Confirmar nova senha** — all `type="password"`, AA input styling. Zod: nova ≥8, confirmar===nova, nova≠atual — pt-BR messages, inline `role="alert"`.
- **Alterar senha CTA** (turquoise, `min-h-[44px]`, pending→disabled+Loader2 "Alterando…"). Flow: re-auth (`signInWithPassword(email, atual)`) → `updateUser({password: nova})`.
- **Wrong current password** → field error on "Senha atual" ("Senha atual incorreta."), form stays open, other fields preserved.
- **Success** → `toast.success('Senha alterada com sucesso.')`, clear the fields, **session stays valid (no logout)**. Honest copy — no "você será desconectado" (GoTrue keeps the session).
- **Pitfall-7:** never render/log the password values anywhere.

## States
- **Loading:** AsyncState skeleton (name field + avatar placeholder + section frames) — no spinner-only blank.
- **Error (own-row load fails):** AsyncState error card + "Tentar novamente" → refetch.
- **Mutation pending:** per-CTA disabled + Loader2 (Salvar / Alterar senha / Enviando foto) — no double-submit.
- **Empty:** N/A (the user always has their own row; if somehow absent, AsyncState error, never blank).

## Accessibility (WCAG-AA gate)
- Every field: `<label htmlFor>` + `aria-invalid`/`aria-describedby`, inline `role="alert"` errors.
- Avatar: the trigger is a real focusable `<button>`; hidden file input labeled; preview `<img alt>`; upload status announced (aria-live polite on "Enviando…"/success).
- Contrast: reuse Phase-29 AA-safe values (`/70` muted, `/60` placeholders, white-on-`#35BFAD/20` badges, turquoise CTA text `#04121F`). **No `text-white/50`.**
- Dialog-free (inline sections) → focus stays linear; the destructive-confirm pattern isn't needed (no destructive self-action).
- Read-only context rows are not focus targets (plain text), so no confusing tab stops.

## Copy honesty
- Password: reflects exactly what GoTrue does (re-auth + rotate) — no invented "email de confirmação" or "logout".
- Avatar: promises only "PNG, JPG ou WebP, até 2 MB" — what the bucket enforces.
- Read-only note tells the truth about who manages role/cargo (an administrador, A14).
- All pt-BR; RNF-12a irrelevant here (no assessment language on this page).

## Interaction correctness
- Two independent forms (Perfil, Senha) — separate submits, separate pending. Avatar upload is its own async action feeding the Perfil save (or auto-saves the path on successful upload; discretion — if auto-save, still show a confirming toast).
- No affordance touches role/cargo/email (SEG-03) — verified by the absence of any such control + the read-only rendering.
- Errors mapped: password wrong-current → field; generic failures → honest `toast.error`; upload FILE_TOO_LARGE/INVALID_MIME → inline field/toast (reuse cvUploadService error codes).

## Checker sign-off map
| Dimension | Where satisfied |
|-----------|-----------------|
| Design-system fidelity | live tokens; Phase-29 values; no unloaded font |
| Layout/hierarchy | single RHLayout owner; h1 anchor; 2 stacked GlassCards; single accent per section |
| States | AsyncState 5-state + per-CTA pending |
| Accessibility | labels/aria/role=alert; keyboard avatar; AA values; no text-white/50 |
| Copy honesty | GoTrue-accurate password copy; honest avatar limits; read-only role note |
| Interaction correctness | SEG-03 no role affordance; re-auth password; error mapping |
