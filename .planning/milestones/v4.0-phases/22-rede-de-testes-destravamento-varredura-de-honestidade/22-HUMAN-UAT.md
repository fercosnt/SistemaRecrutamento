---
phase: 22
slug: rede-de-testes-destravamento-varredura-de-honestidade
status: deferred
created: 2026-07-05
kind: human-verification
---

# Phase 22 — Human Verification (deferred live checks)

Verifier status: **human_needed** — 12/12 requirements verified in the codebase and all 5 success criteria confirmed TRUE by independently re-running the actual commands (`deno test` 148/0, `npm run lint` 133 / TS2307 0, `npm run test:run` 727, `npm run build` green, ci.yml gate `-gt 133` + blocking deno-test job, honesty greps, no hardcoded creds). The two items below need **live infrastructure** not reachable inside this session.

## Deferred items

| # | Item | Requirement | Why deferred | How to verify |
|---|------|-------------|--------------|---------------|
| 1 | **Live GitHub Actions run** proves the new blocking `deno-test` job and the tsc gate pinned at 133 actually pass on real CI infra | CI-01, CI-04 | The local branch is ~153 commits ahead of `origin/backup/local-state-2026-04` and unpushed — the ci.yml changes have never executed on Actions. Local command reproduction ≠ a live run. | Push the branch (or open a PR) and confirm the `deno-test` job is green and the `Type-check (frozen tsc baseline 133)` step passes; a deliberately-introduced type error should make CI red. Consistent with the project pattern of pushing at milestone boundaries. |
| 2 | **WR-01 cadastro→apply-to-vaga resume live smoke** | UX-05 (+ code-review WR-01) | The producer→bounce→consumer path (`/cadastro?vagaId=` → failed auto-login → manual login → `/candidato/candidatura/instrucoes`) is only reachable via external links today; the fix (read-then-clear at consumption, skip eager clear on the `?email` bounce) is unit-tested but not click-through verified in a real browser. | In PROD/preview: open a vaga apply link while logged out, let auto-login fail, log in manually, confirm you land on the correct vaga's instrucoes (vaga context survived); then confirm a plain login with no pending candidatura still clears `candidatura_vaga_id`. |

## Non-blocking notes (info)
- E2E specs still contain vestigial `.blur()` calls with a now-stale comment claiming they're required. Harmless (the `!isValid` gate is gone + unit-tested), but the E2E suite itself doesn't regression-test the fix. Clean up opportunistically when `E2E_REAL_LOGIN` is next exercised.
- WR-02 (`psicólogo(a)` fragment-join guard-evasion in `gerar-devolutiva-bigfive`) — byte-identical runtime string, no new violation; proper RNF-12a language treatment of the devolutiva EF belongs to Phase 23/24. Tracked.
