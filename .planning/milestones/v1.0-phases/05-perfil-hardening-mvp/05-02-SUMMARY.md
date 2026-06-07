---
phase: 05-perfil-hardening-mvp
plan: 02
subsystem: ui
tags: [tailwind, design-system, hsl-tokens, shadcn, radix-select, glass-ui, beauty-smile]

requires:
  - phase: 05-01
    provides: smoke-runtime gate + CI/LHCI/a11y scaffolds that measure the fixed UI
provides:
  - globals.css semantic token block repaired to HSL channel triplets (hsl(var(--x)) now resolves)
  - Input/Select primitives render dark-readable on glass without per-page hex patches
  - GlassButton inline-flex centering + BeautySmileLogo reconciled type union
  - candidate-facing hex-literal workarounds swept to semantic tokens
  - cadastro dark-glass Select placeholders harmonized to data-[placeholder]:text-white/50 (gate-discovered)
  - CadastroPage Cancelar wired to /auth/login (gate-discovered)
affects: [05-03, 05-04, accessibility, lighthouse, perfil]

tech-stack:
  added: []
  patterns:
    - "Semantic tokens stored as HSL channel triplets, wrapped by hsl(var(--x)) in tailwind.config.js (D-25/D-26)"
    - "Radix Select placeholder color is set via data-[placeholder]:, NOT the native-input-only placeholder: CSS variant"

key-files:
  created: []
  modified:
    - src/styles/globals.css
    - src/components/ui/select.tsx
    - src/components/ui/glass.tsx
    - src/components/BeautySmileLogo.tsx
    - src/components/pages/MeuPerfilCandidatoPage.tsx
    - src/features/cadastro/components/steps/DadosPessoaisStep.tsx
    - src/features/cadastro/components/steps/DadosProfissionaisStep.tsx
    - src/features/cadastro/components/steps/EnderecoStep.tsx
    - src/components/pages/CadastroPage.tsx

key-decisions:
  - "Repair the token break at its source (globals.css channel triplets) rather than per-page hex patches — one file restores every semantic Tailwind token at once"
  - "lighthouserc deviation (.js→.cjs) was 05-01's; here the parallel root-cause discovery is that Radix Select needs data-[placeholder]: not placeholder:"
  - "Fixed the 5 dark-glass cadastro Select placeholders per-instance (data-[placeholder]:text-white/50) — NOT in the primitive, since muted-foreground is correct for light-background admin selects"
  - "MeuPerfil candidate hex was bg-[#35BFAD] (the accent teal = --accent), not bg-[#00109E] as the plan example suggested — swept to bg-accent/bg-accent/80"

patterns-established:
  - "Smoke-runtime gate as a real defect-catcher: it surfaced two dark-on-glass + nav defects that all automated gates (build/lint/token-grep) passed clean (the F-04-08-D class)"

requirements-completed: [HARD-04, PERF-02]

duration: ~55min
completed: 2026-06-06
---

# Phase 05 Plan 02: Design-System Root-Cause Batch Summary

**Repaired the entire semantic token system at its source (invalid `hsl(#hex)` → HSL channel triplets) so every Tailwind token resolves, fixed the shared Input/Select/GlassButton/Logo primitives once, and collapsed the dark-on-glass placeholder + Cancelar-nav defects the smoke-runtime gate exposed.**

## Performance

- **Duration:** ~55 min (incl. smoke-runtime gate + one carry-fix re-verification cycle)
- **Tasks:** 4 (3 implementation + 1 blocking smoke-runtime gate)
- **Files modified:** 9 (6 declared + 3 gate-discovered)

## Accomplishments
- **D-07/D-26 root-cause fix:** all 25 semantic + chart tokens in `globals.css` converted to pure HSL channel triplets; `--primary: 234 100% 31%` → `bg-primary` resolves to rgb(0,16,158) instead of transparent. `tailwind.config.js` hsl() wrapper preserved (D-25).
- **D-02:** Input + Select primitives render dark-readable on glass without per-consumer patches; the F-04.1-A resting-text dropdown defect is gone.
- **D-14:** GlassButton `inline-flex items-center justify-center` (icon+text centered); BeautySmileLogo type union reconciled (removes the TS2322 at MeuPerfil:350 — net lint 296→295).
- **Hex sweep:** MeuPerfilCandidatoPage `bg-[#35BFAD]` → `bg-accent` (2→0 hex literals).
- **Gate-discovered carry-fixes (user-approved on re-verification):** 5 dark-glass cadastro Select placeholders harmonized to `data-[placeholder]:text-white/50`; CadastroPage `onCancel` wired to `/auth/login`.

## Task Commits

1. **Task 1: token triplets + Select primitive (D-07/D-26/D-02)** - `d7aed92` (fix)
2. **Task 2: GlassButton inline-flex + BeautySmileLogo type (D-14)** - `2537edb` (fix)
3. **Task 3: MeuPerfil hex sweep → semantic tokens** - `d743639` (fix)
4. **Task 4 (gate): cadastro Select placeholders + Cancelar nav** - `fc6db6c` (fix)

## Deviations
- **Gate-discovered scope extension (3 files outside declared `files_modified`):** `DadosPessoaisStep.tsx`, `DadosProfissionaisStep.tsx`, `EnderecoStep.tsx`, `CadastroPage.tsx`. The plan assumed primitive+token fixes would collapse all dark-on-glass defects, but these cadastro Selects carried instance-level `placeholder:` overrides (a no-op on Radix's `<button>` trigger) and `CadastroPage` never passed `onCancel`. Both fixed per-instance; documented and user-approved.

## Self-Check: PASSED
- build exits 0; lint baseline held (296→295, net improvement)
- all semantic tokens channel-triplet form (0 hex in token values)
- smoke-runtime gate APPROVED by user after one carry-fix cycle (login button solid blue, inputs/selects readable, logo + centered logout, Cancelar→login, no new transparency)

## Notes for Next Plans
- **05-03** (perfil polish, CandidatoNavbar extract, logout root-fix) now builds on correct contrast.
- **05-04** (a11y/LHCI) will measure the FIXED UI — placeholder contrast on the cadastro flow is now consistent, which helps WCAG color-contrast checks.
