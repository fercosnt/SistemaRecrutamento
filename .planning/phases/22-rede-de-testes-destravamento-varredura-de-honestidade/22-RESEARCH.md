# Phase 22: Rede de Testes, Destravamento & Varredura de Honestidade — Research

**Researched:** 2026-07-05
**Domain:** CI/test-net hardening (Deno-in-Actions, tsc baseline tightening, supply-chain hygiene) + candidate-facing honesty (copy/login/redirect)
**Confidence:** HIGH (nearly every claim verified against the live repo, `deno test`, `npm audit`, `npm view`, and a validated scratch-tsconfig experiment)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Rede de Testes Deno + Gate tsc (CI-01/02/04/05/14)**
- **Corpus Deno no CI:** novo job `deno-test` dentro do `.github/workflows/ci.yml` existente (pipeline única, `deno test` sobre `supabase/functions`). Não criar workflow separado.
- **Deno é gate bloqueante** desde já — a suíte para de apodrecer (não allow-fail).
- **CI-02:** corrigir casts stale + asserts para o corpus (20 arquivos de teste, ~126 testes) passar verde.
- **Baseline tsc (CI-04) = measure-first:** após resolver os 65 TS2307 (CI-05) e expandir a cobertura para `e2e/`, `scripts/`, `playwright.config` (CI-14), rodar `npm run lint` e **cravar o gate no valor verde medido** (alvo ≤257; hoje `npm run lint` já reporta 257 sobre `src/`). Gate fica **vermelho acima** do baseline medido. Substitui o gate frouxo atual de 290 no `ci.yml`.
- **TS2307 (CI-05):** resolver via `paths` no `tsconfig` mapeando os specifiers versionados (`lucide-react@0.487.0` → `lucide-react`, etc.) — não-invasivo, preserva o `resolve.dedupe` do Vite. Não reescrever os imports no código-fonte.

**Supply-chain & Dependências (CI-09/11/12)**
- **Vulns dev-tooling (CI-11):** subir vitest / @vitest/ui (RCE) e happy-dom (code-exec) para a **versão corrigida mais próxima** (major mínimo se necessário) e **rodar a suíte inteira** para confirmar verde após o bump.
- **Wildcards `"*"` (CI-09):** pinar as 8 deps na **versão já resolvida no lockfile** (teto de versão, zero mudança de comportamento) — não subir para latest.
- **Deps mortas (CI-12):** remover `motion` e `@supabase/auth-helpers-react` (verificadas como nunca-importadas).
- **Sem gate `npm audit` permanente** neste phase — corrigir os criticals/highs atuais; não adicionar gate de advisory externo.

**Honestidade candidate-facing (UX-02/04/05 + CI-08)**
- **Botões de login (UX-04):** remover `!isValid` do `disabled` (candidato, RH, esqueci, redefinir) — habilitar por padrão e validar no submit. Elimina o hack `blur()` dos E2E.
- **Credenciais de teste (CI-08):** mover emails/senhas reais para env vars (`.env.test` / secrets CI); specs fazem skip-if-unset, sem fallback hardcoded. Commitar `.env.test.example` documentando as chaves.
- **Landing (UX-02):** remover linguagem "testes psicométricos"/"análise de perfil" → "avaliação comportamental/cognitiva" (RNF-12a); adicionar CTA "Já sou candidato" apontando para `/login` (login do candidato). Guard `forbidden-strings.grep.test.ts` já existe — estender se preciso.
- **`?redirect` (UX-05):** propagar o param `?redirect` por login→cadastro→pós-login; limpar chaves stale de `localStorage` (auth/draft órfãos) no login bem-sucedido.

### Claude's Discretion
- Deno version no job de CI, estrutura exata do job, e ordem dos steps.
- Quais chaves específicas de `localStorage` são "órfãs" — determinar pela leitura do código de auth/cadastro.
- Versões-alvo exatas dos bumps de vitest/happy-dom (menor bump que zere o advisory).
- Wording exato da copy da landing dentro da restrição RNF-12a.

### Deferred Ideas (OUT OF SCOPE)
- Gate `npm audit --audit-level=high` permanente — rejeitado neste phase.
- pgTAP / e2e real completos (A45/A46) — backlog stretch, não M4.
- CI-15 (teste de `sync-prompts`), CI-13 (`verify_jwt` em config.toml), CI-10 (`assert-chunks.mjs` wired) → Phase 27.
- Qualquer mudança de comportamento de produto além de copy/login/redirect; correção de funil/IA/segurança (Phases 23–27).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CI-01 | Corpus Deno (~126 testes) roda em job de CI | §Deno-in-CI: 20 files / 138 `Deno.test`; `deno test supabase/functions` runs green after 2 fixes; `denoland/setup-deno@v2` |
| CI-02 | `deno test` padrão passa verde — cast stale + asserts | §Deno-in-CI: exactly 2 typecheck errors (`ai-client.test.ts:242`, `strict-schema.test.ts:88`) + 1 runtime collision — root-caused with fixes |
| CI-04 | Gate tsc apertado ao real (257 não 290) | §tsc Baseline: measured-first, real post-fix count ≈ **133**, ci.yml gate lines 48–54 |
| CI-05 | Imports versionados resolvidos via `paths` — 65 TS2307 → 0 | §Versioned Imports: validated scratch tsconfig — 65→0, cascades 257→133, zero new error codes |
| CI-08 | Credenciais de teste fora do repo, skip-if-unset | §Test Credentials: enumerated all hardcoded `fernando@…`/`teste123` sites + skip pattern already established |
| CI-09 | 8 wildcard `"*"` deps pinadas ao lockfile | §Supply-chain: 9 wildcards − `motion`(removed) = 8; resolved versions listed |
| CI-11 | Vulns críticas/altas dev-tooling resolvidas | §Supply-chain: vitest/@vitest/ui CRITICAL→4.1.9, happy-dom HIGH→20.10.6 (minor bumps, non-major) |
| CI-12 | Deps mortas removidas (`motion`, `@supabase/auth-helpers-react`) | §Supply-chain: zero import sites confirmed by grep |
| CI-14 | `npm run lint` cobre `e2e/`, `scripts/`, `playwright.config` | §tsc Coverage: measured delta — landmine: `scripts/sync-prompts.ts` is a **Deno** file, must be excluded |
| UX-02 | Landing sem "psicométricos"/"análise de perfil" + CTA | §Landing Copy: exact strings `LandingPage.tsx:65,90`; guard must be **extended** (2 terms not covered) |
| UX-04 | Botões de login sem `!isValid` | §Login Buttons: only `LoginCandidatoPage:399` + `LoginRHPage:401` have it; esqueci/redefinir already clean |
| UX-05 | `?redirect` propagado + localStorage órfão limpo | §Redirect Flow: `resolveRedirect` guard already exists; gaps = login→cadastro link + orphan `candidatura_vaga_id` |
</phase_requirements>

## Summary

Phase 22 is a **regression-net foundation** phase: it wires the already-existing (but never-CI-run) Deno EF test corpus into the pipeline, resolves the 65 phantom `TS2307` errors that were masking real type drift, tightens the tsc gate from a loose `290` to the real green value, patches dev-tooling RCE/code-exec CVEs, pins supply-chain, and makes the candidate landing/login honest. **Every change is mechanical and non-behavioral** — the risk profile is low, but there are four sharp landmines that a naive plan will hit.

The single most important finding: **resolving the 65 `TS2307` via `tsconfig` `paths` does not just remove 65 errors — it cascades the total from 257 down to ~133** (verified via scratch tsconfig). Unresolved imports were silently typing whole components as `any`, which suppressed *and* generated cascading errors (`TS7006` implicit-any went 43→1). This means the CONTEXT target "≤257" is wildly conservative; the true measured baseline after CI-05+CI-14 will be ~133. **Measure-first is essential — do not guess the number.**

The Deno corpus is *almost* green already: a raw `deno test --allow-all --no-check` yields **148 passed / 1 failed**, and `deno test --no-run` (type-check) surfaces **exactly 2 type errors**. All three failures are precisely root-caused below and fixable test-side with zero product change.

**Primary recommendation:** Land the changes in this order — (1) add `paths` to `tsconfig.json` (CI-05), (2) expand tsconfig `include` + exclude the Deno files in `scripts/` (CI-14), (3) remove `!isValid` + its dangling destructure (UX-04), (4) fix the 2 Deno type errors + exclude the `strict-schema` Vitest-probe from the Deno run (CI-02), (5) bump/pin/remove deps (CI-09/11/12), (6) fix landing copy + extend the forbidden-strings guard (UX-02), (7) propagate `?redirect` + clear the `candidatura_vaga_id` orphan (UX-05), (8) de-hardcode test creds + commit `.env.test.example` (CI-08) — **then** run `npm run lint`, read the count, and pin that exact number into `ci.yml` (CI-04). Add the `deno-test` blocking job (CI-01).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deno EF test execution (CI-01/02) | CI runner (GitHub Actions) | Deno runtime | Tests run under `deno test`, not Node/Vitest; a dedicated Actions job owns it |
| Type-check gate (CI-04/05/14) | Build tooling (`tsc`/tsconfig) | CI runner | tsconfig `paths`/`include` is the resolution surface; ci.yml enforces the count |
| Dependency hygiene (CI-09/11/12) | Package manifest (`package.json`/lockfile) | — | Pure manifest edits; no runtime tier involved |
| Test credential handling (CI-08) | CI secrets + `.env.test` | E2E specs | Secrets are runtime config, specs are consumers with skip-if-unset |
| Login button enablement (UX-04) | Browser / Client (RHF form state) | — | Pure client-side form UX; `handleSubmit` already validates server-agnostic |
| `?redirect` propagation (UX-05) | Browser / Client (router + localStorage) | — | Client-side navigation state; anti-open-redirect guard already client-side |
| Landing copy (UX-02) | Browser / Client (static JSX) | CI guard (Vitest grep) | Static strings; the grep guard is the enforcement tier |

## Standard Stack

### Core (tooling already present — verify, do not re-introduce)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Deno | `2.7.7` (local) / `v2.x` (CI) | Runs the EF test corpus | Already installed locally; the EFs are Deno-native [VERIFIED: `deno --version`] |
| `denoland/setup-deno` | `@v2` (latest v2.0.3) | Installs Deno in the Actions job | Official Deno action; v2 is current [VERIFIED: web search + github.com/denoland/setup-deno] |
| `actions/checkout` / `actions/setup-node` | `@v4` | Already used by ci.yml `unit`/`e2e`/`lighthouse` jobs | Match existing job idioms [VERIFIED: ci.yml:42-46] |
| TypeScript | `^5.3.3` (installed 5.x) | tsc gate | strict + `noUnusedLocals`/`noUnusedParameters` [VERIFIED: package.json:92, tsconfig] |

### Supporting (version bumps — CI-11)
| Package | Current | Target (nearest patched) | Breaking? |
|---------|---------|--------------------------|-----------|
| `vitest` | `^4.0.7` (4.0.7 installed) | `^4.1.9` (fix lands at 4.1.0) | **No** — 4.0→4.1 is a minor bump [VERIFIED: npm view vitest] |
| `@vitest/ui` | `^4.0.7` | `^4.1.9` (keep lockstep with vitest) | No — same minor [VERIFIED: npm view @vitest/ui] |
| `happy-dom` | `^20.0.10` | `^20.10.6` (fix lands at 20.9.0) | No — patch/minor within major 20 [VERIFIED: npm view happy-dom + npm audit] |

> Bump `vitest` and `@vitest/ui` **together** to the same version — they share the vulnerable code path and must stay lockstep. `vitest@4.1.x` peer-depends on `vite ^6 || ^7`; the repo pins `vite 6.3.5`, so no vite change is forced.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsconfig `paths` (CI-05) | Rewrite `lucide-react@0.487.0` → `lucide-react` in 40 UI files | Invasive, large diff, touches product source — CONTEXT explicitly rejects this |
| `deno test` type-check ON | `deno test --no-check` (runtime only) | Faster CI but stops catching stale casts — defeats "para de apodrecer"; keep type-check ON |
| Exact version pins (CI-09) | `^`-ranges | `^` is not a ceiling; CONTEXT says "teto de versão" → use exact pins |

**Installation / changes:**
```bash
# CI-11 bumps (dev deps)
npm install -D vitest@^4.1.9 @vitest/ui@^4.1.9 happy-dom@^20.10.6
# CI-12 removals
npm uninstall motion @supabase/auth-helpers-react
# CI-09 pins are manual package.json edits to exact lockfile versions (see table), then `npm install` to sync lockfile
```

**Version verification (run at execute time — training data may be stale):**
```bash
npm view vitest version && npm view @vitest/ui version && npm view happy-dom version
npm audit --json | node -e "..."   # confirm the CRITICAL/HIGH clear post-bump
```

## Package Legitimacy Audit

> **This phase installs ZERO net-new packages.** It bumps 3 already-present, battle-tested dev deps, pins 8 already-installed wildcards to their lockfile versions, and *removes* 2 unused deps. No new attack surface is introduced — slopcheck is not applicable to a phase that adds no new package names. Every package below already exists in `package-lock.json`.

| Package | Registry | Age / Trust | Action | Disposition |
|---------|----------|-------------|--------|-------------|
| `vitest` | npm | ~5M+ downloads/wk, official | bump 4.0.7→4.1.9 | Approved [VERIFIED: npm registry] |
| `@vitest/ui` | npm | official vitest org | bump 4.0.7→4.1.9 | Approved [VERIFIED: npm registry] |
| `happy-dom` | npm | widely used, active | bump 20.0.10→20.10.6 | Approved [VERIFIED: npm registry] |
| `@tiptap/*` (×4), `clsx`, `react-dnd`, `react-dnd-html5-backend`, `tailwind-merge` | npm | already installed | pin `"*"`→exact | Approved (ceiling pin, zero behavior change) |
| `motion` | npm | installed, **0 import sites** | REMOVE | Removed (dead dep, CI-12) |
| `@supabase/auth-helpers-react` | npm | installed, **0 import sites** | REMOVE | Removed (dead dep, CI-12) |

**Packages removed:** `motion`, `@supabase/auth-helpers-react` (both grep-confirmed zero imports across `src/`, `supabase/`, `e2e/`, `scripts/`).
**slopcheck [SLOP] verdicts:** none (no net-new packages).

## Architecture Patterns

### System Architecture Diagram — the Phase-22 CI pipeline after changes

```
   git push / PR
        │
        ▼
┌─────────────────────── .github/workflows/ci.yml ───────────────────────┐
│                                                                          │
│  job: unit                job: deno-test (NEW)      job: e2e             │
│  ┌──────────────┐         ┌──────────────────┐      ┌──────────────┐    │
│  │ npm ci       │         │ setup-deno@v2    │      │ npm ci       │    │
│  │ tsc gate ────┼──┐      │ deno test        │      │ playwright   │    │
│  │  (count vs   │  │      │  supabase/       │      │  (unchanged) │    │
│  │   MEASURED   │  │      │  functions       │      └──────────────┘    │
│  │   baseline)  │  │      │  (type-check ON) │                          │
│  │ vitest run ──┼─ │ ─┐   │  EXCLUDE:        │      job: lighthouse     │
│  │  + forbidden-│  │  │   │  strict-schema   │      (unchanged)         │
│  │  strings grep│  │  │   └────────┬─────────┘                          │
│  └──────────────┘  │  │            │                                    │
│         BLOCKING ◄─┘  │            ▼ BLOCKING (not allow-fail)          │
│                       │     148+ Deno tests green                       │
│         ▼             ▼                                                 │
│   tsc resolves      Vitest runs strict-schema.test.ts (Node __dirname)  │
│   versioned imports  ← the SAME file the Deno job must NOT glob         │
│   via tsconfig paths                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

The load-bearing insight the diagram encodes: **`strict-schema.test.ts` lives under `supabase/functions/**/__tests__/` but is a Vitest-only Node probe.** Vitest (via `vite.config.ts` include) *keeps* it; the new Deno job must *exclude* it — the two runtimes split the same directory tree.

### Pattern 1: tsconfig `paths` to resolve versioned specifiers (CI-05)
**What:** Mirror every versioned alias in `vite.config.ts` (`resolve.alias`) as a tsconfig `paths` entry mapping the versioned specifier to the real package folder. tsc-only; does not touch Vite/runtime, so `resolve.dedupe` is untouched.
**When to use:** For all 37 versioned aliases (the 65 `TS2307` collapse to the ~36 unique specifiers).
**Validated result:** 65 `TS2307` → 0, total 257 → 133, **zero new error codes**.
```jsonc
// tsconfig.json — compilerOptions.paths (baseUrl is already ".")
"paths": {
  "@/*": ["./src/*"],
  "lucide-react@0.487.0":           ["./node_modules/lucide-react"],
  "class-variance-authority@0.7.1": ["./node_modules/class-variance-authority"],
  "@radix-ui/react-dialog@1.1.6":   ["./node_modules/@radix-ui/react-dialog"],
  "recharts@2.15.2":                ["./node_modules/recharts"],
  "react-hook-form@7.55.0":         ["./node_modules/react-hook-form"],
  // ... one entry per versioned alias in vite.config.ts (37 total)
}
```
> **Generation tip:** the paths map is mechanically derivable from `vite.config.ts` aliases — match `/["']([^"']+@[0-9][^"']*)["']\s*:\s*["']([^"']+)["']/` and emit `"<versioned>": ["./node_modules/<bare>"]`, skipping `figma:asset/*`. Keep it in sync with the alias list so future shadcn adds don't reintroduce `TS2307`.

### Pattern 2: Deno test job scoped away from Vitest probes (CI-01/02)
**What:** Run `deno test` over `supabase/functions` with type-check ON, but exclude the one Vitest-context file. Cleanest via a `supabase/functions/deno.json` `exclude`, or an explicit ignore flag.
```jsonc
// supabase/functions/deno.json  (Deno honors "exclude" for `deno test`)
{ "exclude": ["_shared/__tests__/strict-schema.test.ts"] }
```
```yaml
# ci.yml — new blocking job
deno-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: denoland/setup-deno@v2
      with: { deno-version: v2.x }
    - name: Deno EF corpus (blocking, type-check on)
      run: deno test --allow-env --allow-read supabase/functions
```
> `--allow-env` is required (tests call `Deno.env.get`); `--allow-read` is harmless (the one fs-reading test — strict-schema — is excluded). Tests inject mocks, so **no network at runtime** (`--allow-net` not needed for execution; remote *module downloads* are not permission-gated).

### Pattern 3: Extend the existing forbidden-strings grep guard (UX-02)
**What:** The guard at `src/__tests__/guards/forbidden-strings.grep.test.ts` covers 5 *clinical* terms but **NOT** the two marketing terms UX-02 removes. Extend its `FORBIDDEN` regex to add `testes?\s+psicom[eé]tricos?` and `an[aá]lise\s+de\s+perfil`, plus regex-correctness sub-tests.

### Anti-Patterns to Avoid
- **Guessing the tsc baseline.** 257−65≠192. Measure `npm run lint` after all changes; the real number is ~133.
- **Leaving `isValid` destructured after removing it from `disabled`.** `noUnusedLocals` turns it into a fresh `TS6133`, inflating the very baseline you're pinning.
- **Type-checking `scripts/sync-prompts.ts` under Node tsc.** It's a Deno file — 13 `TS2304 'Deno'` + `npm:`/`https://` `TS2307` are unfixable there.
- **Adding a separate CI workflow for Deno.** CONTEXT locks it as a job *inside* `ci.yml`.
- **Bumping to `latest` for the wildcards.** CONTEXT says pin to the *lockfile-resolved* version (ceiling), not upgrade.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Anti-open-redirect for `?redirect` | A new URL-validation function | The existing `resolveRedirect()` in `LoginCandidatoPage.tsx:63` (exported, unit-tested) | Already rejects `//evil`, non-`/` paths; extract to a shared util for cadastro reuse |
| Deno setup in Actions | Manual `curl`+PATH install | `denoland/setup-deno@v2` | Official, caches, handles version ranges |
| Forbidden-copy enforcement | New bespoke scanner | Extend `forbidden-strings.grep.test.ts` | Guard exists, runs in CI via `npm run test:run`, self-excludes its own regex |
| Skip-if-unset for creds | New env-gating scheme | The established `test.skip(!process.env.X, ...)` / `E2E_AUTH_TEST_USERS` pattern | Already used in `vagas-browse.spec.ts:106`, `auth-hydration.spec.ts:51`, `login-flow.spec.ts:39` |

**Key insight:** almost every "new" capability this phase seems to need already exists in the codebase in partial form — the work is *wiring and extending*, not *building*.

## Runtime State Inventory

> This phase is config/hygiene refactoring. Most categories are N/A, but CI secrets and localStorage carry real runtime state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (DB) | None — no schema/data touched this phase | None (verified: no migration in scope; DBMIG is Phase 27) |
| Live service config | **GitHub Actions repo secrets** — CI-08 moves creds to secrets. Currently ci.yml only references `TEST_SUPABASE_URL`/`TEST_SUPABASE_ANON_KEY` (ci.yml:35-36). For the real-auth E2E to run in CI, `TEST_USER_*` / `TEST_ADMIN_*` secrets must be *configured in the repo* — but they stay OFF by default (`E2E_AUTH_TEST_USERS=''`), so absence does not break the pipeline | Config-only: document required secret names in `.env.test.example`; do not hard-require them |
| OS-registered state | None | None |
| Secrets/env vars | `.env.test` (gitignored, holds REAL creds: `candidato.funil@teste.com`/`Candidato@2026`, `e2e.admin@beautysmile.com.br`/`E2eAdmin.Bs2026`, live Supabase URL+anon key, `E2E_CANDIDATURA_ID`, `E2E_VAGA_ID`). `.env.test.example` (committed) is **STALE** — still shows `fernando@…`/`teste123` and omits the admin + gating keys | Update `.env.test.example` to document all 10 keys; keep `.env.test` gitignored (verified: `git check-ignore .env.test` → ignored; `.env.test.example` tracked) |
| Browser localStorage | Keys written by prod code: `auth-storage` (zustand persist, authStore:504), `vagas-storage` (vagasStore:258), **`candidatura_vaga_id`** (CadastroPage:32 — **never removed anywhere**, confirmed by grep = the orphan) | UX-05: clear `candidatura_vaga_id` on successful login |
| Build artifacts | None (no package rename; `npm install` re-syncs lockfile after pins/bumps/removals) | Run `npm install` after package.json edits so lockfile converges |

**The canonical orphan:** `candidatura_vaga_id` is written by `CadastroPage` from `?vagaId` and read by `InstrucoesFormularioPage:15`, but **no code path ever calls `removeItem`** on it. It lingers across sessions. UX-05's "clear orphan localStorage" = clear this key (and optionally stale `sb-*` remember-me keys) on successful login.

## Common Pitfalls

### Pitfall 1: The tsc-baseline cascade (the big one)
**What goes wrong:** Planner assumes resolving 65 `TS2307` removes 65 errors → baseline ≈ 192. Wrong.
**Why it happens:** Unresolved module imports type the imported symbols as `any`. That `any` *suppresses* downstream usage errors AND generates its own cascade. Once `paths` resolves the real types, `TS7006` (implicit-any) drops **43→1**, `TS2339` 22→15, `TS2741` 6→3.
**Measured reality:** 257 → **133** with paths on `src/` only.
**How to avoid:** Measure-first is mandatory (already the locked decision). Run `npm run lint` after *all* Phase-22 edits and pin *that* number.
**Warning signs:** Any plan that hardcodes "192" or "≤257" as the gate value.

### Pitfall 2: `scripts/sync-prompts.ts` is a Deno file inside `scripts/` (CI-14 trap)
**What goes wrong:** Adding `scripts/` to tsconfig `include` pulls in `sync-prompts.ts` + `__tests__/sync-prompts.test.ts`, which use `Deno`, `import.meta.main`, `npm:zod@…`, `https://deno.land/std…` → **18 unfixable Node-tsc errors** (13× `TS2304 'Deno'`, 3× `TS2307`, `TS2339 import.meta.main`, `TS2352`).
**How to avoid:** `exclude` those two Deno files from the main tsconfig (same treatment the EF corpus already gets — it's excluded from tsc and run under `deno test`). After exclusion, `scripts/` contributes **0** errors and `e2e/` contributes exactly **1** (`login-flow.spec.ts:57` unused `expectAuthenticated` — fix it).
**Warning signs:** `error TS2304: Cannot find name 'Deno'` in the tsc output.

### Pitfall 3: The `strict-schema.test.ts` dual-runtime collision (CI-02)
**What goes wrong:** `deno test supabase/functions` globs `strict-schema.test.ts`, which is a **Vitest** Node probe (`import { describe, it, expect } from 'vitest'`, `__dirname`, `node:fs`). It fails at runtime (`ReferenceError: __dirname is not defined`) and at type-check (`TS7053` union-key index at :88).
**Why it happens:** the file lives in `_shared/__tests__/` (Deno territory) but is intentionally a Vitest source-text probe (`vite.config.ts:16-18` keeps it in Vitest).
**How to avoid:** Exclude it from the Deno run (deno.json `exclude`). This kills BOTH its failures. It keeps running under Vitest (Node), where `__dirname` exists.

### Pitfall 4: Removing `!isValid` leaves a dangling destructure (UX-04)
**What goes wrong:** `LoginCandidatoPage:94` and `LoginRHPage:83` destructure `isValid` from `formState`. Removing it only from `disabled={...}` leaves `isValid` unused → new `TS6133` (strict `noUnusedLocals`) that silently raises the measured baseline.
**How to avoid:** Remove `isValid` from the `formState` destructure too. Note esqueci/redefinir already **don't** destructure `isValid` (verified) — do not touch them beyond confirming.
**Behavioral safety:** `handleSubmit(onSubmit)` (RHF) already blocks the callback when invalid AND populates `errors` (rendered as the `role="alert"` blocks). So enabling the button + validate-on-submit is safe; the button now only disables on `isSubmitting || isInCooldown`.

### Pitfall 5: `?redirect` open-redirect + the react-router CVE (UX-05, security)
**What goes wrong:** Naively navigating to `searchParams.get('redirect')` enables open-redirect. Additionally, the installed `react-router@6.30.1` carries a **HIGH open-redirect CVE** (protocol-relative `//` reinterpretation).
**How to avoid:** Reuse `resolveRedirect()` (`LoginCandidatoPage:63`) — it already rejects `//evil` and non-root paths and is unit-tested (`LoginCandidatoPage.test.tsx:47`). When propagating `?redirect` into `/cadastro`, `encodeURIComponent` it (as `FormularioCandidaturaPage:396` already does) and re-guard on consumption. The app-level guard mitigates the router CVE for this param; note the CVE separately (see §Security Domain).

### Pitfall 6: The "8 wildcards" is actually 9 minus `motion` (CI-09/CI-12 interaction)
**What goes wrong:** `package.json` has **9** `"*"` deps, but CONTEXT says 8. The discrepancy is `motion`, which CI-12 *removes*. Pin the other 8; do not pin `motion` (delete it).
**How to avoid:** Sequence CI-12 (remove motion) with CI-09 (pin the remaining 8) — the two requirements share the `motion` line.

### Pitfall 7: happy-dom behavior drift on bump (CI-11)
**What goes wrong:** `happy-dom` 20.0.10→20.10.6 spans several minors; DOM-emulation behavior can shift and break a Vitest test that relies on a quirk.
**How to avoid:** The locked decision already mandates "rodar a suíte inteira" after the bump. Run `npm run test:run` (full Vitest) post-bump and treat any red as a bump-compat fix, not a product change.

## Code Examples

### Removing `!isValid` (UX-04) — both login pages
```tsx
// LoginCandidatoPage.tsx:94  /  LoginRHPage.tsx:83  — drop isValid from the destructure
formState: { errors, isSubmitting },   // was: { errors, isSubmitting, isValid }
// LoginCandidatoPage.tsx:399 / LoginRHPage.tsx:401
disabled={isSubmitting || isInCooldown}   // was: isSubmitting || !isValid || isInCooldown
```

### Landing copy fix + CTA (UX-02) — `LandingPage.tsx`
```tsx
// :65  "Testes psicométricos com design moderno..." → "Avaliação comportamental e cognitiva com design moderno..."
// :90  "Acompanhe seu progresso e análise de perfil"  → "Acompanhe seu progresso e sua avaliação comportamental"
// Add a CTA in the hero button row (near :28-45), alongside "Ver Vagas" / "Área do RH":
<GlassButton variant="white" hover className="px-8 py-4 text-white text-lg"
  onClick={() => navigate('/auth/login')}>   {/* candidate login route (routes.tsx:147) */}
  Já sou candidato
</GlassButton>
```
> Note: the candidate login route is `/auth/login` (routes.tsx:147-148). CONTEXT writes `/login` as shorthand — the real path is `/auth/login`.

### Extend the forbidden-strings guard (UX-02) — `forbidden-strings.grep.test.ts`
```ts
// add to the FORBIDDEN regex (accent-tolerant), and to RNF_12_TERMS for the sub-tests:
//   testes?\s+psicom[eé]tricos?   |   an[aá]lise\s+de\s+perfil
const FORBIDDEN =
  /teste\s+psicol[oó]gico|teste\s+psicot[eé]cnico|psicot[eé]cnico|laudo\s+psicol[oó]gico|psic[oó]logo|testes?\s+psicom[eé]tricos?|an[aá]lise\s+de\s+perfil/i
```

### `?redirect` propagation login→cadastro (UX-05) — `LoginCandidatoPage.tsx:492`
```tsx
// "Criar conta" currently drops the param:
onClick={() => navigate('/cadastro')}
// →
onClick={() => {
  const r = searchParams.get('redirect')
  navigate(r ? `/cadastro?redirect=${encodeURIComponent(r)}` : '/cadastro')
}}
// CadastroPage should read ?redirect and hand it to the post-auto-login navigate
// (CadastroMultiStepForm.tsx:447 navigate('/candidato/dashboard')), guarded via resolveRedirect.
// On successful login, clear the orphan:  localStorage.removeItem('candidatura_vaga_id')
```

### De-hardcode test creds (CI-08) — every affected spec
```ts
// Before (login-flow.spec.ts:21, vagas-browse.spec.ts:15, perfil.spec.ts:42, etc.)
email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
// After — no fallback, skip-if-unset at describe/test level (pattern already used at vagas-browse.spec.ts:106)
email: process.env.TEST_USER_EMAIL!,
// + guard:  test.skip(!process.env.TEST_USER_EMAIL, 'Requires TEST_USER_EMAIL (see .env.test.example)')
```
Affected files (grep-confirmed hardcoded `fernando@beautysmile.com.br` / `teste123`): `login-flow.spec.ts`, `auth-hydration.spec.ts`, `vagas-browse.spec.ts`, `perfil.spec.ts`, `prova-cognitiva.spec.ts`, `navegacao.spec.ts`, `explicacao-flow.spec.ts`, `candidatura-submit.spec.ts`, `password-recovery-flow.spec.ts`, `e2e/fixtures/a11y-session.ts`.

### The 8 wildcards → exact pins (CI-09)
```jsonc
// package.json — replace "*" with the lockfile-resolved exact version (ceiling, zero behavior change)
"@tiptap/core": "3.10.1", "@tiptap/extension-text-style": "3.10.1",
"@tiptap/react": "3.10.1", "@tiptap/starter-kit": "3.10.1",
"clsx": "2.1.1", "react-dnd": "16.0.1",
"react-dnd-html5-backend": "16.0.1", "tailwind-merge": "3.3.1"
// (motion "*" is DELETED by CI-12, not pinned)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No CI (TESTING.md §9 "Inexistente") | `ci.yml` exists (unit/e2e/lighthouse) since Phase 5 | 2026-06 | TESTING.md is **stale**; the pipeline exists — this phase adds `deno-test` |
| tsc gate frozen at 290 | Measured baseline (~133) | This phase (CI-04) | Tighter gate catches real regressions |
| Versioned imports resolved only by Vite alias | Also resolved by tsconfig `paths` | This phase (CI-05) | tsc finally type-checks the shadcn UI layer |
| Deno EF tests never run in CI | Blocking `deno-test` job | This phase (CI-01) | The layer that produced every live defect is now guarded |

**Deprecated/outdated:**
- `.planning/codebase/TESTING.md` (dated 2026-04-19) claims "Sem CI" and describes a stale port mismatch (3000 vs 3003) — the current `playwright.config.ts:56` already uses `3003`. Treat TESTING.md as historical, not current.
- `.env.test.example` is outdated (shows `fernando@…`/`teste123`, omits admin+gating keys) — CI-08 fixes it.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `deno test` type-check ON is the intended CI mode ("deno test padrão") | Deno-in-CI | If they want `--no-check`, the `ai-client.test.ts:242` fix is unnecessary (but harmless) |
| A2 | Final measured baseline ≈133 (src post-paths) + ~0 (scripts, Deno excluded) + ~0-1 (e2e after fixing unused) | tsc Baseline | Real number set by measure-first; ~133 is a strong estimate, not the pinned value |
| A3 | `candidatura_vaga_id` is the primary "orphan" localStorage key | Runtime State | If other stale `sb-*` keys are meant, scope widens slightly — determine at plan time |
| A4 | Exact version pins (no `^`) satisfy "teto de versão" for CI-09 | Supply-chain | If `^` is acceptable, pins are looser but still bounded |
| A5 | `denoland/setup-deno@v2` with `deno-version: v2.x` works in the Actions runner | Deno-in-CI | If a specific Deno version is needed, pin `v2.7.7` to match local |
| A6 | `vitest@4.1.x` is fully compatible with the pinned `vite 6.3.5` + Node 20 CI | Supply-chain | Full-suite run post-bump (locked decision) will catch any incompatibility |

## Open Questions

1. **Deno job: type-check ON vs `--no-check`?**
   - What we know: raw runtime is 148✓/1✗; type-check ON adds exactly 2 fixable errors. CONTEXT says "deno test padrão" (= type-check ON).
   - Recommendation: type-check ON + the 2 fixes + strict-schema exclusion. It's what "para de apodrecer" requires.
2. **Should CI actually *run* the real-auth E2E (needs `TEST_*` secrets), or keep them OFF?**
   - What we know: ci.yml sets `E2E_AUTH_TEST_USERS=''` → they skip today. CI-08 is about *hygiene*, not enabling them.
   - Recommendation: keep OFF; CI-08 = remove hardcoded fallbacks + document keys. Enabling real-auth CI is out of scope.
3. **Extract `resolveRedirect` to a shared util for cadastro reuse, or duplicate?**
   - What we know: it's exported from `LoginCandidatoPage` and unit-tested there.
   - Recommendation: extract to `@/features/auth/utils` (or similar), re-export for the existing test, and consume from cadastro — avoids a second copy of security-sensitive logic (cf. the `extractEfErrorCode` dedup lesson → CI-06).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Deno | CI-01/02 local dev + CI | ✓ | 2.7.7 | — |
| Node.js | tsc/vitest/build | ✓ | v24.10.0 local / 20 in CI | — |
| npm | install/pins/bumps | ✓ | 11.6.0 | — |
| `denoland/setup-deno` | CI Deno job | ✓ (Actions marketplace) | @v2 (v2.0.3) | — |

**Missing dependencies with no fallback:** none.
**Note:** local Node is v24 but CI pins Node 20 (ci.yml:45) — vitest 4.1 + happy-dom 20 both support Node 20, so the bump is CI-safe.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.0.7`→`4.1.9` (Node/happy-dom) + `deno test` (Deno corpus) + Playwright `1.56.1` (E2E) |
| Config files | `vite.config.ts` (Vitest block), `playwright.config.ts`, `tsconfig.json` (tsc gate), new `supabase/functions/deno.json` |
| Quick run (unit) | `npm run test:run` |
| Deno corpus | `deno test --allow-env --allow-read supabase/functions` |
| Type-check gate | `npm run lint` (= `tsc --noEmit`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | Exists? |
|--------|----------|-----------|-------------------|---------|
| CI-01 | Deno corpus runs in CI | ci job | `deno test --allow-env --allow-read supabase/functions` (exit 0) | ✅ (corpus exists; job is Wave 0) |
| CI-02 | Corpus green under type-check | deno | same command with type-check ON → 0 type errors | ✅ after 2 fixes |
| CI-04 | tsc gate at real baseline | tsc | `COUNT=$(npm run -s lint 2>&1 | grep -c "error TS"); [ "$COUNT" -le <MEASURED> ]` | ✅ (measure-first) |
| CI-05 | 65 TS2307 → 0 | tsc | `npm run -s lint 2>&1 | grep -c "error TS2307"` == 0 | ✅ validated (scratch) |
| CI-08 | No hardcoded creds in specs | grep guard | `grep -rE "fernando@beautysmile|teste123" e2e/` → empty | ❌ Wave 0 (add assertion/CI grep) |
| CI-09 | No `"*"` deps remain | grep | `node -e "…wildcards.length===0"` on package.json | ❌ Wave 0 |
| CI-11 | CRITICAL/HIGH dev-tooling cleared | audit | `npm audit --json` → vitest/@vitest/ui/happy-dom clear | ✅ post-bump |
| CI-12 | Dead deps gone | grep | `grep -r "from 'motion'\|auth-helpers-react" src` → empty AND absent from package.json | ✅ |
| CI-14 | tsc covers e2e/scripts/playwright | tsc | tsconfig `include` lists them; `npm run lint` still ≤ baseline | ✅ (Deno files excluded) |
| UX-02 | Forbidden copy absent + guard extended | vitest grep | `npm run test:run` → forbidden-strings.grep passes with new terms | ✅ (extend guard) |
| UX-04 | Login buttons enabled by default | vitest/e2e | unit: button not disabled on mount with empty form; e2e blur-hack removable | ⚠️ add unit assertion |
| UX-05 | `?redirect` propagated + orphan cleared | vitest | unit: resolveRedirect reused; localStorage.removeItem('candidatura_vaga_id') on login | ⚠️ add unit assertion |

### Sampling Rate
- **Per task commit:** `npm run test:run` (Vitest) + `deno test --allow-env --allow-read supabase/functions` (when EF tests touched).
- **Per wave merge:** `npm run lint` (confirm count ≤ pinned baseline) + full `npm run test:run` + `npm audit`.
- **Phase gate:** all four CI jobs green (`unit`, `deno-test`, `e2e`, `lighthouse`) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `.github/workflows/ci.yml` — add `deno-test` blocking job + rewrite the tsc gate step (lines 48-54) to the measured baseline.
- [ ] `supabase/functions/deno.json` — `exclude` the `strict-schema.test.ts` Vitest probe.
- [ ] `tsconfig.json` — add `paths` (37 versioned) + expand `include` (`e2e`, `scripts`, `playwright.config.ts`) + `exclude` the 2 Deno files in `scripts/`.
- [ ] `.env.test.example` — document all 10 keys (candidato + admin + gating + supabase).
- [ ] Optional CI grep guard for CI-08 (no hardcoded creds) — mirror the forbidden-strings pattern.
- [ ] Framework installs: `npm install -D vitest@^4.1.9 @vitest/ui@^4.1.9 happy-dom@^20.10.6` + `npm uninstall motion @supabase/auth-helpers-react`.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Login pages (UX-04) — button change is UX-only; auth logic untouched |
| V3 Session Management | yes | `?redirect` (UX-05) must not enable session-fixation/open-redirect → `resolveRedirect` guard |
| V4 Access Control | no | No authz changes this phase (SEC-* is Phase 24) |
| V5 Input Validation | yes | `?redirect` param validation (open-redirect); Zod login schemas unchanged |
| V6 Cryptography | no | None |
| V14 Config / Dependencies | yes | CI-09/11/12 supply-chain; CI-08 credential hygiene |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via `?redirect` (UX-05) | Tampering / Elevation | `resolveRedirect()` — reject `//` and non-`/` targets; `encodeURIComponent` when propagating |
| react-router `6.30.1` open-redirect CVE (HIGH) | Tampering | App-level `resolveRedirect` mitigates for this param; **note:** router bump to `≥6.30.3` is out of CI-11's named scope (dev-tooling only) — flag for Phase 24/27 |
| vitest/@vitest/ui UI-server RCE (CRITICAL) | Elevation | CI-11 bump to 4.1.9 |
| happy-dom module-compiler code-exec (HIGH) | Elevation | CI-11 bump to 20.10.6 |
| Real credentials committed to repo | Info Disclosure | CI-08: env vars + skip-if-unset; `.env.test` stays gitignored |
| Secret leak via CI logs | Info Disclosure | Keep `TEST_*` as GitHub secrets; never echo; anon key is public-by-design (already in ci.yml) |

> **`npm audit` non-scope note:** the audit surfaces 2 CRITICAL + 16 HIGH total, but many are transitive dev-tooling (`@lhci/cli` → tmp/inquirer, `vite` HIGH → 6.4.3, `react-router` HIGH). CONTEXT scopes CI-11 to **only** vitest/@vitest/ui/happy-dom and explicitly rejects a permanent audit gate. `vite@6.3.5` (HIGH, fix 6.4.3 non-major) and `react-router@6.30.1` (HIGH open-redirect) are **adjacent findings** — document them, do not fix in Phase 22 unless the planner elects to (react-router intersects UX-05).

## Sources

### Primary (HIGH confidence)
- Live repo inspection: `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `package.json`, `package-lock.json`, `src/components/pages/{LoginCandidatoPage,LoginRHPage,EsqueciSenhaPage,RedefinirSenhaPage,LandingPage,CadastroPage}.tsx`, `src/store/authStore.ts`, `src/__tests__/guards/forbidden-strings.grep.test.ts`, `src/router/routes.tsx`, `e2e/*.spec.ts`, `supabase/functions/**`, `.env.test`, `.env.test.example`.
- `deno test --allow-all --no-check supabase/functions` → 148 passed / 1 failed (strict-schema `__dirname`).
- `deno test --no-run supabase/functions` (type-check) → 2 errors (`ai-client.test.ts:242` timeoutMs, `strict-schema.test.ts:88` TS7053).
- Scratch tsconfig experiment (paths + expanded include) → 257→133 (src), +18 scripts (Deno, excludable), +1 e2e; TS2307 65→0, zero new error codes.
- `npm audit --json` → vitest/@vitest/ui CRITICAL, happy-dom HIGH, all `fixAvailable: true`.
- `npm view {vitest,@vitest/ui,happy-dom} version` → 4.1.9 / 4.1.9 / 20.10.6.

### Secondary (MEDIUM confidence)
- [denoland/setup-deno](https://github.com/denoland/setup-deno) — `@v2` current (v2.0.3), `deno-version` accepts ranges/`v2.x` (web search).

### Tertiary (LOW confidence)
- `.planning/codebase/TESTING.md` — historical (2026-04-19), superseded on the "no CI" and port-mismatch claims; used only for E2E structure context.

## Metadata

**Confidence breakdown:**
- Deno-in-CI (CI-01/02): HIGH — ran the corpus, root-caused all 3 failures.
- tsc baseline/paths (CI-04/05/14): HIGH — validated by scratch-tsconfig measurement (not estimation).
- Supply-chain (CI-09/11/12): HIGH — versions from npm registry + lockfile; audit confirmed.
- Login/landing/redirect (UX-02/04/05): HIGH — exact file:line anchors; guards/helpers already exist.
- Test credentials (CI-08): HIGH — grep-enumerated every hardcoded site + existing skip pattern.

**Research date:** 2026-07-05
**Valid until:** 2026-08-04 (30 days — stable tooling; re-verify npm audit fixed-versions at execute time as new advisories can shift the "nearest patched" target).
