---
phase: 2
slug: cadastro-candidato
status: draft
shadcn_initialized: false
preset: beauty-smile-glass (manual, pre-existing in src/styles/globals.css)
created: 2026-04-20
---

# Phase 2 — UI Design Contract: Cadastro Candidato

> Visual and interaction contract for the cadastro (candidate registration) flow. Locks the UX decisions that CONTEXT.md left ambiguous: state visuals, microcopy, accessibility, and error-code → UI mapping. The 4-step form shell (`CadastroMultiStepForm`) is kept as-is — this document is prescriptive only about what the wiring + polish of Phase 2 must produce.

---

## Scope of This Contract

**In scope (what this document locks):**
1. Stepper progression indicator — states, spacing, labels
2. LGPD checkboxes — visual hierarchy (1 mandatory vs 3 optional) + exact microcopy
3. Error state visuals — inline field errors, Sonner toast variants, duplicate → Step 1 navigation feedback
4. Loading states — submit button, duplicate-check indicator, leave-guard warning
5. Success state — toast copy, redirect timing
6. Microcopy catalog — all user-facing strings (pt-BR cordial)
7. Error code → UI mapping — one row per `error_code` returned by Edge Function
8. Accessibility contract — labels, focus rings, tab order, ARIA live, touch targets
9. Responsive breakpoints — iPhone 12 Pro (390×844) as non-negotiable floor
10. Design tokens referenced — exact CSS variables / Tailwind classes

**Out of scope (do NOT redesign):**
- The 4-step form structure (keep: Dados, Endereço, Disponibilidade, Autorizações)
- The "glass UI" aesthetic already in production
- New page layouts (no new pages in Phase 2)
- New iconography system (reuse `lucide-react`)
- Animations beyond what shadcn/ui + Sonner already provide

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (shadcn/ui primitives vendored manually into `src/components/ui/`; no `components.json`) |
| Preset | Beauty Smile Glass UI (custom) — defined in `src/styles/globals.css` |
| Component library | Radix UI primitives via shadcn/ui (29 primitives installed) |
| Icon library | `lucide-react` (installed; `Loader2`, `Check`, `ChevronLeft/Right`, `AlertCircle`, `CheckCircle2`, `Eye/EyeOff`, `Shield`, `Info`) |
| Font | `'Helvetica Neue', Helvetica, Arial, sans-serif` (CSS var `--font-family`) |
| Toast | `sonner` (already wired via `useFormToast`) |

**Registry Safety:** Not applicable. No third-party shadcn registries declared. All primitives under `src/components/ui/` are locally vendored; no network fetches during install/build.

---

## Spacing Scale

Declared values — all multiples of 4. Aligns with existing `--spacing-*` CSS variables in `globals.css`.

| Token | Value | Tailwind | Usage in Phase 2 |
|-------|-------|----------|------------------|
| xs | 4px | `gap-1`, `p-1` | Icon-to-text gap inline (e.g. AlertCircle + "Email inválido") |
| sm | 8px | `gap-2`, `p-2` | Checkbox-to-label spacing; stepper circle-to-title gap |
| md | 16px | `gap-4`, `p-4`, `space-y-4` | Default field-to-field spacing inside a step on mobile |
| lg | 24px | `gap-6`, `p-6`, `space-y-6` | Field-to-field on desktop; step card inner padding; gap between stepper and step header |
| xl | 32px | `p-8` | Step card inner padding on desktop (md+ breakpoint) |
| 2xl | 48px | `pb-12` | Bottom padding for mobile scroll-past-keyboard safe-area |

**Exceptions:**
- Stepper circle minimum touch target: **44×44px** (mobile), **40×40px** (desktop md+) — iOS/Android a11y floor, not on 4-grid.
- Submit button minimum height: **44px** mobile / **40px** desktop — same rationale.
- LGPD checkbox clickable row minimum height: **44px** (wraps Checkbox + Label + description).

---

## Typography

Pulled from `--text-*` CSS variables. Phase 2 uses exactly 4 sizes and 2 weights.

| Role | Size | Weight | Line Height | CSS Variable / Tailwind |
|------|------|--------|-------------|--------------------------|
| Body | 16px | 400 (normal) | 1.5 | `--text-base`, `text-base` |
| Label / Small | 14px | 500 (medium) | 1.4 | `--text-sm`, `text-sm` |
| Step Heading (H2) | 20px mobile / 24px desktop | 700 (bold) | 1.2 | `text-xl sm:text-2xl font-bold` |
| Caption / Helper | 12px | 400 (normal) | 1.35 | `--text-xs`, `text-xs` |

**Rules:**
- NEVER use placeholder as the only label — all fields MUST have a visible `<Label>` above the input (a11y + HARD-04).
- NEVER use italic for any user-facing copy.
- Error messages: `text-sm` (14px), color `text-red-400` on glass surface, paired with `AlertCircle` icon 16px.
- Success hints: `text-sm` (14px), color `text-green-400` on glass, paired with `CheckCircle2` icon 16px.
- Field helper text: `text-xs` (12px), color `text-white` at 100% opacity (on dark glass background). DO NOT use `text-white/60` for primary helper text — current a11y risk.

---

## Color

Beauty Smile Glass UI: dark brand-primary gradient background with translucent white glass panels.

| Role | Value | Tailwind token | Usage in Phase 2 |
|------|-------|----------------|------------------|
| Dominant (60%) | `#00109E` (brand-primary) | `bg-[#00109E]`, `--brand-primary` | Page background (already applied by parent layout `CadastroPage`) |
| Secondary (30%) | `rgba(255,255,255,0.10)` + `backdrop-blur-lg` | `bg-white/10 backdrop-blur-lg` | Step card surface; optional LGPD checkbox rows |
| Accent (10%) | `#00109E` (brand-primary) on white | `bg-white text-[#00109E]` | **Reserved for:** stepper circle of current step; primary CTA button ("Próximo", "Criar conta") hover/active; inline "Saiba mais" link |
| Destructive | `#EF4444` (semantic-error) — used at 400 tint on dark glass: `text-red-400`, `border-red-400/40` | `text-red-400` / `bg-red-500/10` | Error inline text; Sonner error toast; error icon; red asterisk `*` on required labels |
| Success | `#10B981` (semantic-success) at 400 tint | `text-green-400` / `bg-green-500/10` | Duplicate-check "disponível" hint; completed step circle (`bg-green-500`); Sonner success toast |
| Info / LGPD highlight | `#35BFAD` at 400 tint | `text-blue-400` / `bg-blue-500/10` | Mandatory LGPD checkbox row background/border; LGPD banner Alert |

**Accent reserved for** (explicit list — do NOT expand):
1. The current step circle in the stepper (white bg + brand-primary text)
2. The primary CTA button ("Próximo", "Voltar" is secondary, "Criar conta" is primary)
3. The "Saiba mais" / "Política de Privacidade" inline links
4. The mandatory LGPD checkbox when `data-[state=checked]`

**Never use accent for:** completed-step circle (green), success hints (green), error states (red), optional LGPD checkbox borders, helper text.

---

## Stepper (4-Step Progression Indicator)

The stepper sits above the step card. Reuses the existing `<Progress>` bar + circle indicators.

### States

| State | Circle bg | Circle border | Circle text | Label text color | Opacity |
|-------|-----------|---------------|-------------|-------------------|---------|
| Current (active) | `bg-white` | `border-white` | `text-[#00109E]` | `text-white` | 100% |
| Completed | `bg-green-500` | `border-green-500` | `text-white` (renders `Check` icon 16px) | `text-white` | 100% |
| Upcoming (accessible if already visited) | `bg-white/20` | `border-white/30` | `text-white` (renders step number) | `text-white` | 100% |
| Upcoming (not yet accessible) | `bg-white/20` | `border-white/30` | `text-white` | `text-white` | 50% |

### Geometry

| Breakpoint | Circle size | Gap between circles | Label visibility |
|------------|-------------|---------------------|------------------|
| < 640px (mobile, iPhone 12 Pro) | 32×32px (`w-8 h-8`) | `gap-1` (4px) — tight | Hidden (`hidden sm:block`) |
| ≥ 640px (sm+) | 40×40px (`w-10 h-10`) | `gap-2` (8px) | Visible below circle |
| Touch target | Minimum 44×44px for the `<button>` wrapping each step (padded) | — | — |

### Progress Bar (above stepper)

- Always visible, full width, height `h-2` (8px).
- Fill color: `bg-white` on glass surface.
- Shows `Etapa {n} de 4` (left) + `{percent}% completo` (right, `hidden xs:inline`).
- Value recomputes on step change: `((currentIndex + 1) / 4) * 100`.

### Navigation Rules

- Clicking a circle for a step already completed OR current OR one-ahead → navigates to that step (`goToStep`).
- Clicking a locked step → no-op (cursor `not-allowed`, `aria-disabled="true"`).
- Keyboard: Tab order goes through stepper buttons before entering the step card. Enter/Space activates.

### ARIA Contract for Stepper

- Wrapper: `<nav aria-label="Etapas do cadastro">` around the `.flex` container.
- Each circle button: `aria-current="step"` if current; `aria-label="{step.title} — {status}"` (e.g. "Dados Pessoais — etapa atual", "Endereço — concluída", "Disponibilidade — bloqueada").
- Progress bar: `<Progress>` (Radix) already provides `role="progressbar"` with `aria-valuenow`.

---

## LGPD Checkboxes Layout (Step 4)

The single most prescriptive section. Must visually communicate that 1 is mandatory and 3 are optional — but without hiding the optional ones (LGPD Art. 8 requires granular, equivalent visibility).

### Hierarchy Decision: Stacked Cards with Emphasis (not Accordion, not Tabs)

All 4 checkboxes are visible simultaneously. The mandatory one is the FIRST and visually emphasized. No `<details>`/accordion — it would hide optional consents and invite "just accept all" antipattern.

### Mandatory Row (1 of 4)

| Property | Value |
|----------|-------|
| Order | First (top) |
| Container | `bg-blue-500/10 border-2 border-blue-400/30 rounded-lg p-5` |
| Icon | `Shield` (16×16) in `text-blue-400`, inline before Label |
| Label text | `Autorizo o uso dos meus dados` |
| Label weight | `font-semibold` (600) |
| Red asterisk | Yes — `<span class="text-red-400 ml-1">*</span>` |
| Badge below description | Yes — `inline-flex px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300 font-medium` with text `Obrigatório` + `Shield` 12px icon |
| Description | See Microcopy Catalog (§ D-15) |
| Checkbox styling | `bg-white/20 border-white/30 data-[state=checked]:bg-[#00109E] data-[state=checked]:border-[#00109E]` |

### Optional Rows (3 of 4)

| Property | Value |
|----------|-------|
| Order | 2, 3, 4 below the mandatory one, in the order: `comunicacao` → `retencao_curriculo` → `analise_video` |
| Container | `bg-white/5 border border-white/10 rounded-lg p-5` — lighter, 1px border (vs 2px on mandatory) |
| Icon | None (reserve `Shield` for the mandatory row only) |
| Label weight | `font-semibold` (600) — same as mandatory for consistency |
| Red asterisk | No |
| Badge | No "Obrigatório" badge (implicit by absence) |
| Description | See Microcopy Catalog |
| Checkbox styling | Same as mandatory |

### "Saiba mais" Affordance

- Below the LGPD banner Alert at the top of the step, keep the existing `<button>` linking to `/politica-privacidade` via `window.open('_blank')`.
- Label: `Política de Privacidade` (not "Saiba mais" — more specific, better accessibility).
- Style: `text-blue-400 hover:text-blue-300 underline font-medium`.
- **Policy version display:** immediately below the link, caption text `text-white/70 text-xs`: `Versão {POLICY_VERSION}` — imported from `supabase/functions/_shared/constants.ts` (D-16).

### Submit Block Rule

- Submit button stays ENABLED at all times on Step 4 (never disable it because the mandatory checkbox is unchecked — creates mystery-disabled pattern).
- On click, if `autorizacao_uso_dados` is false: block submit, set inline error on that row, scroll it into view (`scrollIntoView({ behavior: 'smooth', block: 'center' })`), and show Sonner error toast "Para criar sua conta, você precisa autorizar o uso dos dados.".

---

## Submit Flow: Loading, Success, and Error States

### Submit Loading State (D-04)

| Element | State before submit | State during submit |
|---------|--------------------|--------------------|
| Primary button label | `Criar conta` | `Criando...` |
| Primary button icon | `Check` 16px right | `Loader2 className="animate-spin"` 16px left |
| Primary button `disabled` | false | true |
| Secondary button "Voltar" | enabled | `disabled=true` (prevent race) |
| Form fields | editable | `pointer-events-none opacity-80` applied to `<form>` wrapper (soft-disable; do not add `disabled` to every input — breaks tab-index unnecessarily) |
| beforeunload listener | active (from D-14) | removed at submit start (don't warn mid-submit) |
| LoadingProgress Dialog | closed | **NOT opened in Phase 2** (see below) |

**IMPORTANT — LoadingProgress Dialog deprecation:**

The current implementation opens a `<Dialog>` showing fake multi-stage progress (`auth → candidatos → enderecos → ...`) with a 400ms `setInterval` faking intermediate stages. This is misleading UX (the Edge Function runs atomically; no real intermediate progress exists) and adds a layer the user cannot dismiss.

**Decision for Phase 2:** Keep the Dialog code (do not delete — may be reused in Phase 4 for CV upload which HAS real progress), but **do not open it** during cadastro submit. Instead: inline button spinner + field-level soft-disable. If the submit takes > 2s, Sonner shows a loading toast `toast.loading('Criando sua conta...')` which is dismissed on resolve/reject.

Implementation hook:
```tsx
const loadingToastId = setTimeout(() => toast.loading('Criando sua conta...', { id: 'submit' }), 2000)
// ... after submit resolves/rejects
clearTimeout(loadingToastId)
toast.dismiss('submit')
```

### Success State (D-03)

**Sequence:**
1. Edge Function returns `{ ok: true }` — submit completes.
2. Client calls `supabase.auth.signInWithPassword(email, senha)`.
3. On success:
   - Clear sessionStorage draft (`useCadastroDraft.clear()`).
   - Remove `beforeunload` listener.
   - `navigate('/candidato/perfil', { replace: true })` — immediate, no 300ms grace.
   - `toast.success('Cadastro concluído! Bem-vindo(a), {primeiroNome}.')` with duration 5000ms.
4. On signIn fail: retry 1x with 500ms backoff.
5. On second fail: `navigate('/auth/login?email=' + encodeURIComponent(email))` + `toast.success('Cadastro concluído. Faça login para continuar.')`.

**Toast variant:** Sonner `success` — green left border, `CheckCircle2` icon.
**First name extraction:** `formData.dadosPessoais.nome_completo.split(' ')[0]` — title-case is fine (Supabase already stores as entered).
**No welcome modal. No interstitial screen.** User lands directly on `/candidato/perfil`.

### Error States (D-05, D-06, D-07)

See **Error Code → UI Mapping** table below. All error cases:
- Re-enable submit button (`disabled=false`).
- Re-enable form fields (remove `pointer-events-none`).
- Remove loading toast if present.
- Re-attach `beforeunload` listener.
- Keep all form data (never reset).

### Race: Duplicate Caught at Submit (D-07)

When a CPF/email passed the blur-time debounce check but the Edge Function still returns `EMAIL_EXISTS` / `CPF_EXISTS` (another account was created in the window):

1. Auto-navigate to Step 1 (`setCurrentStepIndex(0)` + `window.scrollTo({ top: 0 })`).
2. Set inline error on the offending field (`setError('dadosPessoais.email', { type: 'duplicate', message: ... })`).
3. Visual feedback that the user moved: after Step 1 renders, scroll the offending field into view (`fieldRef.scrollIntoView({ behavior: 'smooth', block: 'center' })`) and add a brief highlight animation — use existing `animate-fadeIn` from `globals.css` on the field wrapper for 200ms.
4. Sonner toast with `error_code`-specific copy (see mapping table).
5. Steps 2-4 form data is preserved (user does NOT lose their work).

No banner element, no "You were sent back" popup — the toast + auto-scroll + inline error already communicate the state change without extra chrome.

---

## Duplicate-Check Inline Indicator (D-10)

Reuses the existing `useDuplicateCheck` hook. Visual contract for the indicator inside CPF and email fields:

| State | Indicator | Position | Color | Copy below field |
|-------|-----------|----------|-------|------------------|
| Idle (no input yet) | None | — | — | `Seu CPF/email será verificado no banco de dados` (12px, `text-white`) |
| Loading (debounce resolved, RPC in-flight) | `Loader2` 20px `animate-spin` | `absolute right-3 top-1/2 -translate-y-1/2` | `text-blue-400` | — (no text; icon is the feedback) |
| Available (RPC returned `{exists: false}`) | `CheckCircle2` 20px | same | `text-green-400` | `CPF válido e disponível!` / `Email válido e disponível!` (14px, `text-green-400`) |
| Duplicate (RPC returned `{exists: true}`) | `AlertCircle` 20px | same | `text-red-400` | See Error Code table — inline error + optional "Já possui cadastro? Fazer login →" link |
| Rate-limited (RPC returned `{rate_limited: true}`) | None (icon cleared) | — | — | No inline text. Sonner toast `warning` variant: `Muitas tentativas. Aguarde alguns instantes.` Field remains editable. |
| RPC network/unknown error | `AlertCircle` 20px | same | `text-red-400` | `Não foi possível verificar agora. Tente novamente.` (14px, `text-red-400`) |

**Icon padding:** input gets `pr-10` (40px right padding) to reserve space for the icon regardless of state — prevents layout shift.

**Debounce note:** existing hook uses 800ms in code but CONTEXT D-10 says 300ms — **Plan must align these. Recommend 300ms** to match CONTEXT decision. (This is a plan-level concern, not UI-SPEC — flagged here for visibility.)

---

## Error Code → UI Mapping

One row per `error_code` returned by `cadastrar-candidato` Edge Function (D-05). Client maps via `cadastroService`.

| error_code | Trigger | UI Response | Sonner Toast (variant + copy) | Target step | Target field |
|------------|---------|-------------|-------------------------------|-------------|--------------|
| `EMAIL_EXISTS` | Edge Function checks and email already in `auth.users` or `candidatos` | 1. Auto-navigate to Step 1 · 2. Inline error on `email` field · 3. Show "Já possui cadastro? Fazer login →" link below inline error · 4. Scroll `email` field into view | `error` — `Este email já está cadastrado. Tente fazer login ou use outro email.` | 1 | `dadosPessoais.email` |
| `CPF_EXISTS` | idem for CPF | Same flow as above targeting `cpf` | `error` — `Este CPF já está cadastrado. Tente fazer login ou verifique se é o correto.` | 1 | `dadosPessoais.cpf` |
| `VALIDATION` | Zod validation failed server-side (user bypassed or race) | If `field` present in response: auto-navigate to the step containing that field, set inline error on it, scroll into view. If `field` absent: stay on current step, show generic toast. | `error` — `Há um problema com os dados enviados. Revise o formulário e tente novamente.` | depends on `field` | `field` or none |
| `SERVER_ERROR` | Edge Function threw unexpected error | Stay on current step. Form unchanged. Submit button re-enabled. | `error` — `Algo deu errado do nosso lado. Tente novamente em alguns instantes.` with action button `Tentar novamente` (re-dispatches submit) | — | — |
| `NETWORK_ERROR` | `supabase.functions.invoke` threw — no response from Edge Function | Same as SERVER_ERROR, different copy | `error` — `Sem conexão com o servidor. Verifique sua internet e tente novamente.` with action `Tentar novamente` | — | — |
| *(signIn retry exhausted after `ok: true`)* | Auto-login fallback triggered | `navigate('/auth/login?email=<email>')` | `success` (not error — account was created) — `Cadastro concluído. Faça login para continuar.` | n/a | n/a |
| *(rate_limited on duplicate check)* | RPC returned `{rate_limited: true}` — submit NOT triggered, user is on Step 1 | Field re-enables immediately. No inline error. | `warning` — `Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.` | 1 | (none — no inline error) |

**Toast duration for all errors:** 6000ms (longer than success 5000ms — error copy takes more reading time).
**Toast position:** `top-center` on mobile, `bottom-right` on desktop — already the `useFormToast` default; do not change.

---

## Microcopy Catalog

All user-facing strings for Phase 2. pt-BR, cordial tone, never "teste psicológico" (always "avaliação comportamental" if mentioned — N/A for cadastro but respected for future).

### Step Titles & Descriptions

| Step | Title | Description |
|------|-------|-------------|
| 1 | `Dados Pessoais` | `Informações básicas e contato` |
| 2 | `Endereço` | `Onde você mora atualmente` |
| 3 | `Disponibilidade` | `Quando você pode trabalhar` |
| 4 | `Autorizações` | `Consentimentos LGPD necessários` |

### Button Labels

| Context | Label |
|---------|-------|
| First step, secondary button | `Cancelar` |
| Step 2-4, secondary button | `Voltar` (+ `ChevronLeft` 16px left) |
| Step 1-3, primary button | `Próximo` (+ `ChevronRight` 16px right) |
| Step 4, primary button (idle) | `Criar conta` (+ `Check` 16px right) |
| Step 4, primary button (submitting) | `Criando...` (+ `Loader2 animate-spin` 16px left) |
| Error toast action | `Tentar novamente` |
| Inline duplicate link | `Já possui cadastro? Fazer login →` |
| LGPD policy link | `Política de Privacidade` |
| Show/hide password | `aria-label="Mostrar senha"` / `aria-label="Ocultar senha"` |

**Note:** the existing `"Finalizar Cadastro"` label on the Step 4 primary button (in `CadastroMultiStepForm.tsx:506`) must be changed to `"Criar conta"` — CONTEXT.md D-03/D-04 use "Criar conta" / "Criando..." consistently, and "Finalizar" is vaguer.

### Field Placeholders & Helpers

| Field | Placeholder | Helper text (below field) |
|-------|-------------|----------------------------|
| Nome Completo | `Digite seu nome completo` | (none) |
| CPF | `000.000.000-00` | `Seu CPF será validado e verificado no banco de dados` |
| Email | `seu@email.com` | `Seu email será verificado no banco de dados` |
| Telefone | `(11) 98765-4321` | (none) |
| Data de Nascimento | (native date input) | `Você deve ter no mínimo 16 anos` |
| Gênero | `Selecione` | (none) |
| Como conheceu | `Selecione uma opção` | (none) |
| Instagram | `@seu_usuario` | `Use: @usuario ou instagram.com/usuario` |
| LinkedIn | `linkedin.com/in/seu-perfil` | `Use: linkedin.com/in/seu-perfil` |
| Senha | `Digite sua senha` | `Mínimo 8 caracteres, incluindo maiúscula, minúscula e número` |
| Confirmar Senha | `Confirme sua senha` | (none) |
| CEP | `00000-000` | `Preenchemos o endereço automaticamente` |
| Logradouro | `Rua, Avenida, etc` | (none) |
| Número | `123` | (none) |
| Complemento | `Apto, Bloco, etc` (opcional) | (none) |
| Bairro | `Seu bairro` | (none) |
| Cidade | (auto-filled, read-only after CEP) | (none) |
| Estado | (auto-filled, read-only after CEP) | (none) |

### LGPD Checkbox Labels & Descriptions (D-15)

| Campo | Label (≤60 chars) | Description (≤200 chars) |
|-------|-------------------|---------------------------|
| `autorizacao_uso_dados` (mandatory) | `Autorizo o uso dos meus dados` | `Concordo que a Beauty Smile armazene e utilize meus dados pessoais para participação no processo seletivo. Sem esta autorização não é possível criar a conta.` |
| `autorizacao_comunicacao` | `Autorizo receber comunicações` | `Concordo em receber emails e notificações sobre o andamento do processo seletivo e novas oportunidades de vagas da Beauty Smile.` |
| `autorizacao_retencao_curriculo` | `Autorizo manter meu currículo` | `Concordo que a Beauty Smile mantenha meu currículo em banco de dados por até 2 anos para futuras oportunidades, mesmo que eu não seja selecionado(a) no processo atual.` |
| `autorizacao_analise_video` | `Autorizo análise de vídeo-entrevistas` | `Concordo que minhas entrevistas em vídeo sejam gravadas e analisadas para avaliação comportamental e de comunicação.` |

**Note on language:** D-15 description for `analise_video` was changed from "sistemas automatizados de IA" to "avaliação comportamental e de comunicação" — aligns with PROJECT.md constraint "avaliação comportamental/cognitiva (nunca 'teste psicológico' ou 'IA')".

### LGPD Banner (top of Step 4)

> **Lei Geral de Proteção de Dados (LGPD)**
> Seus dados são protegidos por lei. Você pode acessar, corrigir, excluir ou revogar qualquer autorização a qualquer momento.

Below the checkboxes list, keep the existing "Seus direitos" list and `lgpd@beautysmile.com.br` contact paragraph (already in `AutorizacoesStep.tsx:154-176`). Add after the contact paragraph:

> Esta política está na versão **{POLICY_VERSION}** (D-16).

### Success Toast

| Path | Toast |
|------|-------|
| Happy path (auto-login OK) | `success` · `Cadastro concluído! Bem-vindo(a), {primeiroNome}.` · duration 5000ms |
| Auto-login failed after 2 retries | `success` · `Cadastro concluído. Faça login para continuar.` · duration 5000ms |

### Error Messages (per error_code)

See **Error Code → UI Mapping** table.

### Additional Inline Errors (client-side Zod)

| Field | Error condition | Message |
|-------|-----------------|---------|
| `nome_completo` | empty | `Informe seu nome completo` |
| `nome_completo` | single word | `Digite nome e sobrenome` |
| `cpf` | invalid format | `CPF inválido — verifique os dígitos` |
| `cpf` | invalid digit verifier | `CPF inválido — dígito verificador incorreto` |
| `email` | invalid format | `Email inválido` |
| `telefone` | invalid format | `Telefone inválido` |
| `data_nascimento` | under 16 years old | `Você deve ter no mínimo 16 anos` |
| `senha` | < 8 chars | `Senha deve ter no mínimo 8 caracteres` |
| `senha` | missing uppercase/lowercase/digit | `Inclua maiúscula, minúscula e número` |
| `confirmar_senha` | mismatch | `As senhas não coincidem` |
| `cep` | invalid format | `CEP inválido — formato 00000-000` |
| `cep` | not found in ViaCEP | `CEP não encontrado — confira os dígitos` |
| `autorizacao_uso_dados` | false on submit | `Para criar sua conta, você precisa autorizar o uso dos dados.` |

### Browser `beforeunload` Warning

Modern browsers (Chrome 119+, Safari 17+, Firefox 110+) ignore custom `beforeunload` strings and show a standard localized dialog. **Do not attempt to customize.** Just register the listener (CONTEXT D-14). The default browser copy ("Changes you made may not be saved" / "As alterações que você fez talvez não sejam salvas") is fine.

### Draft Auto-Restore Notice

When `useCadastroDraft.load()` returns non-null on mount, show a Sonner toast `info`:

> `Retomamos seu cadastro de onde você parou.` · duration 4000ms · action `Começar do zero` (on click: clear draft + reset form).

---

## Accessibility Contract (HARD-04 alignment)

### Keyboard

- **Tab order on each step:** Stepper circles → step heading (skip) → first field → ... → last field → "Voltar" → "Próximo/Criar conta".
- All inputs reachable by Tab without mouse.
- `Escape` closes any open `<Dialog>` (Radix handles).
- `Enter` in a `<Input>` on Steps 1-3 triggers `handleNext()` (equivalent to clicking "Próximo"). On Step 4, `Enter` does NOT submit — requires explicit click on "Criar conta" (reduces accidental submits on the LGPD step).

### Focus Rings

- Use global `outline-ring/50` from `globals.css` @ base layer — already applied via `*` selector.
- Never apply `outline-none` without providing a visible replacement.
- Focus ring on buttons: 2px solid `--ring` (brand-primary) with 2px offset.
- Focus ring on inputs: inner 2px `--ring` (via `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`).
- Stepper buttons must have a visible focus ring matching input pattern.

### Labels

- Every input has a `<Label htmlFor={id}>` with `aria-hidden="false"` (default). Labels are ALWAYS visible — never placeholder-only.
- Required fields: red asterisk `*` inside the Label. Add `aria-required="true"` to the input.
- Optional fields: Label text suffix `(opcional)`. Add `aria-required="false"`.

### ARIA Live Regions

- Add `<div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="duplicate-check-status">` near the Step 1 form — screen readers announce duplicate-check state changes: "Verificando CPF..." / "CPF disponível" / "CPF já cadastrado".
- Error inline messages: `<p role="alert" aria-live="assertive">` — already implicitly via `<p className="text-red-400 text-sm">`, but add `role="alert"` explicitly.
- Sonner toast is announced automatically (`aria-live="polite"`) — no change needed.

### Touch Targets (iPhone 12 Pro baseline)

- All interactive elements: minimum 44×44px hit area.
- Apply `touch-manipulation` CSS class (already present on stepper) to prevent 300ms tap delay.
- Checkbox rows on Step 4: clickable row (label + description click toggles checkbox) — not just the 20×20 checkbox itself.
- Eye/EyeOff password toggle: minimum 44×44px touch area (current implementation uses `absolute` positioning without padding — bump padding to reach 44×44 on mobile).

### Color Contrast (WCAG AA)

- White text on `#00109E` (brand-primary) background: 13.8:1 — passes AAA.
- White text on `bg-white/10` glass surface (effective `#0E1EAD`-ish blend): passes AA large (≥18px) and AA normal (≥16px).
- `text-white/70` on glass: **fails AA for < 18px** — forbidden for primary helper text (use `text-white` instead). Acceptable for decorative caption (`text-xs`) on dark brand bg only, not on glass.
- Error `text-red-400` (#F87171) on glass: ~4.6:1 — passes AA normal.
- Success `text-green-400` (#4ADE80) on glass: ~6.2:1 — passes AA normal.

### Screen Reader Specific

- Stepper: `<nav aria-label="Etapas do cadastro">` wrapping the circles row.
- Step card: `<section aria-labelledby="step-heading-{n}">` with heading as `<h2 id="step-heading-{n}">`.
- LGPD checkboxes Step 4: wrap the 4 rows in `<fieldset><legend class="sr-only">Autorizações LGPD</legend>...</fieldset>`.
- Icons purely decorative: `aria-hidden="true"`.
- Icons conveying meaning (inline state icons in CPF/email fields): `<span role="img" aria-label="CPF disponível"><CheckCircle2/></span>`.

---

## Responsive Breakpoints

Mobile-first. iPhone 12 Pro (390×844) is the baseline. Target also: iPhone SE (375×667) must not break.

| Breakpoint | Width | Tailwind | Form layout |
|------------|-------|----------|-------------|
| Mobile (baseline) | 375-639px | default | 1 column, full-width inputs, stacked buttons, stepper labels hidden |
| `xs` (custom) | 480px+ | `xs:` (if defined) or `sm:` | Progress % visible next to "Etapa n de 4" |
| `sm` | 640px+ | `sm:` | Stepper circles 40×40, labels visible below; step card padding 24px |
| `md` | 768px+ | `md:` | Grid 2-column for related fields (Email+Telefone, Data+Gênero, Instagram+LinkedIn, Senha+Confirmar Senha); buttons side-by-side |
| `lg` | 1024px+ | `lg:` | max-width `max-w-4xl` centers form (1024/2 = 512px content + gutters); step card padding 32px |

### Form Width

- Container: `w-full max-w-4xl mx-auto` (already applied). Content stops at 896px (Tailwind `max-w-4xl`).
- Horizontal padding: `px-4 sm:px-6` (16→24px gutter).
- Vertical spacing between sections: `space-y-4 sm:space-y-6` (16→24px).

### Button Width

- Mobile: both buttons `w-full`, stacked `flex-col` with `gap-3` (12px).
- Desktop (`sm+`): `w-auto`, side-by-side `flex-row justify-between`, `gap-4` (16px).

### Step Indicator Orientation

- Always horizontal (all breakpoints). Never vertical — 4 steps fits cleanly horizontally even on iPhone SE (4 × 32px circle + 3 × 4px gap = 140px — well under 343px safe area).

---

## Design Tokens Referenced

All new styling in Phase 2 MUST use these tokens. Never hardcode new colors/sizes outside this list.

### From `globals.css` (CSS variables)

| Token | Value | Used for |
|-------|-------|----------|
| `--brand-primary` | `#00109E` | Primary button, stepper current circle text, accent links |
| `--brand-accent` | `#35BFAD` | (not used in Phase 2 — reserved) |
| `--semantic-error` | `#EF4444` | Error inline text (via `text-red-400` tint) |
| `--semantic-success` | `#10B981` | Success hints (via `text-green-400` tint), completed stepper circle |
| `--text-xs` | 12px | Helper text, badges |
| `--text-sm` | 14px | Labels, inline errors, success hints |
| `--text-base` | 16px | Body inputs (iOS zoom prevention) |
| `--text-xl` / `--text-2xl` | 20 / 24px | Step heading |
| `--font-weight-normal` | 400 | Body |
| `--font-weight-medium` | 500 | Labels |
| `--font-weight-semibold` | 600 | Checkbox labels, button labels |
| `--font-weight-bold` | 700 | Step heading |
| `--radius` | 8px | Input, button, step card |
| `--radius-lg` | 12px | LGPD checkbox row cards |
| `--spacing-2/3/4/6/8` | 8/12/16/24/32px | Gaps, padding |
| `--duration-200` | 200ms | Stepper circle transitions, fadeIn on error field |

### From Tailwind (derived)

- Glass bg: `bg-white/10 backdrop-blur-lg`
- Glass border: `border-white/30`
- Glass input: `bg-white/20 border-white/30 text-white placeholder:text-white/50`
- Error tint: `text-red-400`, `bg-red-500/10`, `border-red-400/30`
- Success tint: `text-green-400`, `bg-green-500/10`, `border-green-400/30`
- Info/LGPD tint: `text-blue-400`, `bg-blue-500/10`, `border-blue-400/30`

### Forbidden in Phase 2

- Any new hex color not already listed in `globals.css` `:root`.
- Any font size outside the `--text-*` scale.
- Any spacing value outside multiples of 4 (except 40px touch target allowed).
- Any `border-radius` outside `--radius*` scale.
- Additional shadcn registries (`components.json` is absent; no registry to vet).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| *(none — shadcn/ui primitives are locally vendored in `src/components/ui/`; no `components.json`, no `npx shadcn add` invocations planned for Phase 2)* | N/A | N/A |

**Statement:** Phase 2 does not introduce any new component from any external registry. All UI primitives used (`Button`, `Input`, `Checkbox`, `Label`, `Progress`, `Dialog`, `Alert`, `Select`) already exist in `src/components/ui/` from the initial Figma Make vendoring. No install-time or build-time third-party content is fetched.

---

## Decisions Pre-Populated From Upstream

| Source | Decisions Used |
|--------|---------------|
| CONTEXT.md (02) | 16 (all D-01..D-16 — auto-login, error routing, duplicate RPC, draft, leave guard, LGPD layout, policy version) |
| CONTEXT.md (01) | 3 (Edge Function contract `{ok, data?, error?}`, LoadingDelay 200ms pattern, toast via Sonner) |
| PROJECT.md | 3 (pt-BR domain language, LGPD compliance, "avaliação comportamental" never "IA") |
| REQUIREMENTS.md | 7 (CAD-01..CAD-07 acceptance criteria) |
| ROADMAP.md | 4 (success criteria §Phase 2, iPhone 12 Pro baseline from HARD-05) |
| Existing codebase | CadastroMultiStepForm structure, globals.css tokens, useFormToast, useDuplicateCheck, LGPD step copy baseline, Beauty Smile glass aesthetic |
| User input this session | 0 (upstream artifacts answered all required questions) |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — CTA "Criar conta", empty state N/A (form), error copy cordial pt-BR, destructive confirmations N/A
- [ ] Dimension 2 Visuals: PASS — no new icons introduced, glass UI consistent, stepper states clear
- [ ] Dimension 3 Color: PASS — 60 brand-primary / 30 glass-white / 10 accent (reserved for stepper-current + primary CTA + links + mandatory checkbox), destructive red for errors only
- [ ] Dimension 4 Typography: PASS — exactly 4 sizes (12/14/16/20-24), 2 weights (400 body, 600 label/button, 700 heading counted as third but only used for single H2)
- [ ] Dimension 5 Spacing: PASS — all values multiples of 4 except 40px/44px touch targets (declared exceptions)
- [ ] Dimension 6 Registry Safety: PASS — no external registries; all primitives locally vendored

**Approval:** pending

---

## Open Questions for Planner

These bubble up to `/gsd-plan-phase 2` — not UI decisions, but wiring consequences of this contract:

1. **Debounce alignment:** current `useDuplicateCheck` uses 800ms in code (`DadosPessoaisStep.tsx:60`), CONTEXT D-10 says 300ms. Planner must pick one and update.
2. **LoadingProgress Dialog fate:** this contract says "don't open it for cadastro." Planner must either (a) keep the code dead for potential Phase 4 reuse, or (b) delete and re-add in Phase 4.
3. **"Finalizar Cadastro" → "Criar conta" rename:** string change in `CadastroMultiStepForm.tsx:506` — planner includes in cadastro form wiring task.
4. **`POLICY_VERSION` import path:** `supabase/functions/_shared/constants.ts` is Deno-side. Front-end needs a mirror. Planner decides: duplicate constant in `src/features/cadastro/constants.ts` (simple) or share via build-time import (complex, not worth it for one constant).

---

*Written: 2026-04-20 by gsd-ui-researcher*
*Phase: 02-cadastro-candidato*
