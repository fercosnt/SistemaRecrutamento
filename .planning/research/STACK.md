# Stack Research

**Domain:** ATS funnel-operation features (KPI dashboard, in-app interview scheduling, RH CV/AI visibility, per-stage advance/reject) on a mature React 18 + Vite + Supabase codebase
**Milestone:** v6.0 M6 — Operação do Funil RH
**Researched:** 2026-07-14
**Confidence:** HIGH (grounded against installed `package.json` + actual in-repo usage; upstream versions verified via web)

---

## Headline

**Net-new dependencies required for M6: ZERO.**

Every capability the M6 OPER features need is already covered by a library that is *installed and in active use* in this codebase. This is integration work on a proven stack, not a stack expansion. Charting (recharts + shadcn wrapper), date/time + Brazil timezone (date-fns + native `Intl`), the interview-scheduling display idiom (already written), the date-picker primitive (react-day-picker/shadcn Calendar), and private-bucket CV viewing (signed-URL service) all exist today. The recommendation is **reuse, do not add**.

---

## Per-Feature Findings (grounded against the repo)

### 1. KPI dashboard charting — REUSE `recharts` (already installed + wrapped)

- **Installed:** `recharts@^2.15.2` (dependency). Confirmed grep-verified usage in **3 files**:
  - `src/components/ui/chart.tsx` — the canonical **shadcn/ui chart wrapper** (`ChartContainer`, `ChartConfig`, `ChartTooltip`) built on recharts. This is exactly the shadcn+Tailwind integration the question asks to "prefer if it exists" — it exists.
  - `src/components/pages/RelatoriosRHPage.tsx` — an existing RH reporting page already rendering `AreaChart`, `BarChart`, `PieChart`, `LineChart`, `ResponsiveContainer` with a Beauty Smile color palette (`CHART_COLORS.primary = '#35BFAD'`).
  - `src/features/admin/ai-costs/components/AiCostsPage.tsx` — cost charts.
- **No competing lib present:** grep for `victory`, `nivo`, `d3`, `chart.js`, `apexcharts`, `visx` → **zero hits**. There is nothing to consolidate; recharts is the single, established choice.
- **Integration guidance for M6:** build the time-in-stage / conversion / volume charts by importing from `@/components/ui/chart` (the shadcn wrapper) rather than raw recharts, so charts inherit the design-system tooltip/legend/theming and stay consistent with `RelatoriosRHPage`. `ResponsiveContainer` + `BarChart`/`LineChart` cover all three M6 KPI shapes (volume-per-stage = bar, conversion funnel = bar, time-in-stage = bar/line).
- **Upstream note (not a blocker):** recharts 2.x is now deprecated upstream — current is **3.9.2** and all `<3.0.0` emit an install-time deprecation warning ([recharts npm](https://www.npmjs.com/package/recharts), [issue #7361](https://github.com/recharts/recharts/issues/7361)). **Do NOT upgrade to v3 for M6.** v3 is a breaking migration (state-management rewrite, removed `recharts-scale`/`react-smooth`) and the vendored shadcn `chart.tsx` targets the v2 API. There is no M6 feature benefit; upgrading is churn with regression risk. Log it as optional post-M6 tech-debt, not milestone scope.

### 2. Interview scheduling date/time — REUSE `date-fns` + native `Intl` (timezone already solved)

- **Installed:** `date-fns@^2.30.0` (6 import sites, all `format` + `date-fns/locale` `ptBR`); `react-day-picker@^8.10.1` (wired into the shadcn **`src/components/ui/calendar.tsx`** primitive, alongside `src/components/ui/popover.tsx`).
- **Timezone is already handled — and correctly.** grep found the *exact pattern this milestone needs* already written in `src/features/entrevista/components/EntrevistaDashboard.tsx`:
  - `const DISPLAY_TIME_ZONE = 'America/Sao_Paulo'` (requirement tag **IN-04**).
  - `formatDataHora(iso)` → `dd/mm/aaaa às hh:mm`, and `compute24hMarker(...)` (amber "menos de 24h" vs neutral pill), both built on native `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })` reading a `timestamptz`. It even normalizes the `hour12:false` midnight `'24'`→`'00'` engine quirk.
  - A `timestamptz` scheduling column (`entrevista_agendada_em`) and dedicated `entrevistas_online` / `entrevistas_presenciais` tables already exist in `database.types.ts` (exact schema delta = architecture research, not stack).
- **Why native `Intl` over `date-fns-tz`:** for a single-tenant Brazil (America/Sao_Paulo) app, pinning display to one fixed IANA zone via `Intl.DateTimeFormat` is dependency-free, already proven in the codebase, and the correct call. Storing `timestamptz` (UTC) + formatting to `America/Sao_Paulo` on read is the right model; DST for São Paulo was abolished in 2019, so the fixed-offset risk is minimal even so.
- **Integration guidance for M6 (the RH input side):** the *display* side is done; M6 adds the *entry* side. Compose the already-present shadcn **Calendar** (`react-day-picker` v8) inside a **Popover** for the date, and a **native `<input type="time">`** for the time — zero new deps. Reuse the exported `formatDataHora` helper from `EntrevistaDashboard` for the candidate-facing echo. The candidate sees the scheduled datetime + link on their in-app dashboard (no email — COMM is out of scope).
- **Do NOT upgrade date-fns.** Current upstream is v4.x; installed v2.30.0 supplies `format` + `ptBR` which is all that is used. Upgrading is unrelated churn. `react-day-picker` is v8 here (upstream is v9); the shadcn Calendar primitive is wired to v8 — leave it.

### 3. RH CV viewing — REUSE signed-URL + open-in-new-tab (already built; NO PDF viewer)

- **Already implemented:** `src/features/vagas/services/cvUploadService.ts` → `getSignedUrl(path)` calls `supabase.storage.from('curriculos').createSignedUrl(path, 3600)` on the **private** `curriculos` bucket. Its docstring literally states *"Used by RH (Phase 6) to view/download CVs"* and prescribes TanStack Query caching at `staleTime: 55 * 60 * 1000` (refresh before the 1h expiry). Pitfall-7 redaction guard already forbids logging the signed URL. (`perfilRhService.ts` uses the identical `createSignedUrl` idiom for avatars.)
- **CVs are PDFs; browsers render PDF natively.** For "make the CV visible to RH," the correct pattern is: call `getSignedUrl` → open the URL in a new tab (`<a target="_blank" rel="noopener noreferrer">` or `window.open`). No viewer library needed.
- **No PDF-viewer lib present or needed:** grep for `react-pdf`, `pdfjs`, `@react-pdf/renderer` → **zero hits**. The PDF libs that *are* installed serve unrelated roles: `jspdf@^4.2.1` + `jspdf-autotable@^5.0.8` are **export-only** (comparativo PDF generation in `src/features/triagem/pdf/exportComparativo.ts`, dynamically imported for code-splitting), and `unpdf@0.11.0` is **Edge-Function-side** text extraction for AI CV analysis (`supabase/functions/analise-candidato-individual/index.ts`). None of these is for viewing, and none needs a new sibling.
- **Integration guidance for M6:** the missing piece is purely UI wiring — surface a "Ver currículo" affordance in the RH candidate/hub view that resolves the stored path via `getSignedUrl` (wrapped in a `useQuery` at 55-min staleTime) and opens it. The AI analysis (`score_match`, comparativo) is already in `scores_candidato`/analysis tables; expose it via existing TanStack Query hooks + RLS (vaga-scoped). No stack change.

### 4. Per-stage advance/reject + reject-from-comparativo justification — REUSE existing form/data stack

- No new library. `react-hook-form@^7.55.0` + `zod@^3.22.4` + `@hookform/resolvers` (all installed, pervasively used) cover the justification-required reject form (funil-02). Writes go through the established **Edge Function authenticate-THEN-authorize** pattern + `historico_candidatura` audit trail already used by the M4/P25 Kanban. `sonner@^2.0.3` (installed) handles toasts. `zustand@^4.5.2` + `@tanstack/react-query@^5.90.10` cover state.

### 5. KPI aggregation data path — REUSE Supabase RPC/view + TanStack Query (no client-side heavy compute)

- Not a library decision, but a stack-integration one worth stating: compute time-in-stage / conversion / volume **server-side** as a Postgres `SECURITY DEFINER`, vaga-scoped RPC or view over `historico_candidatura`, and feed the result to recharts via a TanStack Query hook. This mirrors the existing `RelatoriosRHPage`/`useQuery(supabase...)` idiom and keeps aggregation off the client. Migrations land via Supabase MCP `apply_migration` (the codebase's proven 42601-bypass path).

---

## Recommended Stack (all already installed)

### Core / reused for M6

| Technology | Installed Version | Purpose in M6 | Why reuse (not replace) |
|------------|-------------------|---------------|-------------------------|
| recharts | ^2.15.2 | KPI dashboard charts (time-in-stage, conversion, volume) | Only chart lib present; has a vendored shadcn `chart.tsx` wrapper + live use in `RelatoriosRHPage` |
| shadcn `ui/chart.tsx` | vendored (recharts 2.15.2) | Themed chart container/tooltip/legend | Design-system-consistent charts; import from `@/components/ui/chart` |
| date-fns | ^2.30.0 | `format` + `ptBR` labels for scheduling copy | Already the date lib; supplies everything used |
| Native `Intl.DateTimeFormat` | platform | Render scheduled datetime pinned to `America/Sao_Paulo` | Zero-dep tz solution already proven in `EntrevistaDashboard` (IN-04) |
| react-day-picker | ^8.10.1 (via `ui/calendar.tsx`) | RH date entry for interview scheduling | shadcn Calendar primitive already wired |
| `ui/popover.tsx` + native `<input type="time">` | vendored / platform | Date-in-popover + time entry | No time-picker lib needed |
| cvUploadService `getSignedUrl` | existing service | RH view/download CV from private `curriculos` bucket | Already built for exactly this ("Used by RH to view/download CVs") |
| @tanstack/react-query | ^5.90.10 | KPI/CV/analysis data fetching + 55-min signed-URL cache | Server-state standard already in use |
| react-hook-form + zod + @hookform/resolvers | ^7.55.0 / ^3.22.4 / ^5.2.2 | Justification-required reject form (funil-02) | Established form stack |
| sonner | ^2.0.3 | Action feedback toasts | Established toast singleton |
| Supabase Edge Functions + RPC | existing | Privileged writes (advance/reject, schedule) + KPI aggregation | authenticate-THEN-authorize + vaga-scoped RLS pattern from M4/P25 |

### Development tools (no change)

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest ^4.1.9 + Testing Library | Unit/component tests | Existing gate (881/881 at M5 close) |
| Playwright ^1.56.1 + axe-core | E2E + a11y (WCAG AA) | Existing CI gate |
| `tsc --noEmit` | Type gate | Pinned baseline (104 at M5 close) |

---

## Installation

```bash
# Nothing to install. All M6 stack needs are already in package.json.
# Net-new dependencies for this milestone: 0.
```

---

## Alternatives Considered

| Recommended | Alternative | When the alternative would win (it doesn't here) |
|-------------|-------------|--------------------------------------------------|
| recharts 2.15.2 (reuse) | recharts 3.x upgrade | Only if starting greenfield or already doing a charting overhaul; v3 is a breaking migration and the shadcn wrapper targets v2 — no M6 benefit |
| recharts | nivo / visx / Chart.js / Tremor | Only if recharts were absent; it isn't. Adding a 2nd chart lib is pure bloat + inconsistency |
| Native `Intl` + date-fns v2 | date-fns-tz | Only for multi-timezone tenants; this is single-tenant fixed America/Sao_Paulo — `Intl` already solves it |
| Native `Intl` + date-fns v2 | dayjs / luxon / moment | Only on a codebase without a date lib; date-fns is already standard here. `moment` is legacy/deprecated |
| Signed-URL + new tab | react-pdf / pdfjs-dist / @react-pdf/renderer | Only if you need in-app annotation/thumbnails/page-scrubbing; RH just needs to read a PDF — the browser does that natively |
| shadcn Calendar + native `<input type="time">` | Dedicated time-picker component lib | Only for complex recurring-schedule UX; a single date+time entry needs no library |

---

## What NOT to Use (explicit anti-scope for M6)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| A second charting library (nivo, victory, Chart.js, Tremor, visx, d3) | recharts + shadcn wrapper already installed and in use; a 2nd lib = bundle bloat + visual inconsistency | `recharts@2.15.2` via `@/components/ui/chart` |
| External calendar/scheduling SDKs (FullCalendar, react-big-calendar, Cal.com, Calendly, MS Bookings) | In-app scheduling = a `timestamptz` + link field + display helper that already exist; an external SDK adds an integration surface, cost, and out-of-scope complexity | shadcn Calendar + `<input type="time">` + existing `formatDataHora`/`Intl` idiom |
| Any email/notification infra (Resend, Nodemailer, SMTP, SendGrid) | COMM (email pipeline) is **explicitly out of scope** — candidate is notified ONLY via in-app dashboard | Persist schedule/status to DB; candidate reads it on their dashboard (existing TanStack Query surfaces) |
| Timezone libs (date-fns-tz, dayjs-tz, luxon, moment-timezone) | Single-tenant fixed `America/Sao_Paulo`; native `Intl.DateTimeFormat` already handles it (IN-04, proven in `EntrevistaDashboard`) | Native `Intl.DateTimeFormat` + reuse the existing helper |
| PDF viewer libs (react-pdf, pdfjs-dist, @react-pdf/renderer) | CV is a PDF in a private bucket; browsers render PDFs natively via a signed URL | `cvUploadService.getSignedUrl(path)` + open in new tab (`rel="noopener"`) |
| A dedicated time-picker component library | Over-engineering for a single date+time entry | Native `<input type="time">` |
| Upgrading recharts/date-fns/react-day-picker mid-milestone | Breaking migrations with regression risk and zero M6 feature value; M6 is feature-work, not hardening | Pin to installed versions; log upgrades as optional post-M6 tech-debt |

---

## Version Compatibility / Repo Quirks

| Item | Note |
|------|------|
| Version-suffixed import specifiers | shadcn/Figma-Make-vendored `ui/*` files import pinned specifiers (`recharts@2.15.2`, `react-day-picker@8.10.1`) resolved by Vite. **New M6 code should import from the `@/components/ui/*` wrappers** (`chart`, `calendar`, `popover`), not raw pinned specifiers — mirrors the M1 Sonner `resolve.dedupe` decision that avoids duplicate pre-bundles / broken module-level singletons. |
| recharts 2.15.2 | Works with React 18.3.1; deprecated upstream (v3.9.2 current) but stable and wrapped. Keep for M6. |
| date-fns 2.30.0 | Works with React 18; only `format` + `ptBR` locale are consumed. No tz submodule needed. |
| react-day-picker 8.10.1 | Wired to `ui/calendar.tsx`; upstream is v9 (breaking). Keep v8. |
| Supabase `curriculos` bucket | Private; signed URLs expire in 3600s → cache at 55-min staleTime (already prescribed in `cvUploadService`). |

---

## Sources

- `package.json` (repo) — authoritative list of installed deps/versions — HIGH
- Grep of `src/` + `supabase/` + `database.types.ts` (repo) — actual usage of recharts (3 files incl. shadcn `chart.tsx`), date-fns (6 sites), `Intl`+`America/Sao_Paulo` in `EntrevistaDashboard`, `jspdf`/`unpdf` roles, `getSignedUrl` on `curriculos` — HIGH
- [recharts — npm](https://www.npmjs.com/package/recharts) — current version 3.9.2, 2.x deprecated — MEDIUM
- [recharts issue #7361 — v2 not receiving updates, upgrade to v3](https://github.com/recharts/recharts/issues/7361) — deprecation confirmation — MEDIUM
- [recharts 3.0 migration guide (wiki)](https://github.com/recharts/recharts/wiki/3.0-migration-guide) — breaking-change scope justifying "don't upgrade for M6" — MEDIUM

---
*Stack research for: M6 — Operação do Funil RH (funnel-operation features on an existing ATS)*
*Researched: 2026-07-14*
