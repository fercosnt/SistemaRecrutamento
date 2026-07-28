---
phase: 38
slug: ef-notificar-candidato-comm
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-23
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `38-RESEARCH.md` → `## Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `deno test` (Supabase Edge Functions run on Deno, not the Vitest/src harness) |
| **Config file** | `supabase/functions/deno.json` |
| **Quick run command** | `deno test supabase/functions/_shared/__tests__/email-templates.test.ts supabase/functions/_shared/__tests__/ics.test.ts --allow-env --allow-read` |
| **Full suite command** | `deno test supabase/functions/ --allow-env --allow-read` |
| **Estimated runtime** | ~5–15 seconds (no `--allow-net`; fetch is mocked) |

> Note: `npm run lint` (tsc) covers `src/**` only; Deno EF code is type-checked by `deno test`. The pre-existing 97-error `src/**` baseline is unrelated to this phase — keep it at 97 (documented husky infra-debt).

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}`
- **After every plan wave:** Run `{full suite command}`
- **Before `/gsd:verify-work`:** Full Deno suite green + grep-guard green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

> Draft — exact task IDs are populated by the planner (step 8). Rows below map each COMM requirement to its proof type from the Validation Architecture; the planner attaches `<automated>` commands per task.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | ics port | 1 | COMM-04 | — | `.ics` PUBLISH, TZ America/Sao_Paulo, base64 round-trips | unit | `deno test .../ics.test.ts --allow-env --allow-read` | ❌ W0 | ⬜ pending |
| TBD | templates | 1 | COMM-06 | — | rejection HTML has NO scoring tokens (grep-guard); no react-email import | unit + source | `deno test .../email-templates.test.ts --allow-env --allow-read` | ❌ W0 | ⬜ pending |
| TBD | templates | 1 | COMM-02/03/05 | — | confirmação/avanço/decisão render correct subject + body | unit | `deno test .../email-templates.test.ts --allow-env --allow-read` | ❌ W0 | ⬜ pending |
| TBD | EF | 2 | COMM-01 | T-38 self-auth | Bearer≠service_role ⇒ 401; no `select('*')`; ledger 2-phase write; returns 200 on send-fail | unit + source | `deno test .../notificar-candidato.test.ts --allow-env --allow-read` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/functions/_shared/__tests__/ics.test.ts` — `.ics` parity vs M6 fixture + base64 round-trip (COMM-04)
- [ ] `supabase/functions/_shared/__tests__/email-templates.test.ts` — render each of 4 templates + rejection grep-guard (COMM-02/03/05/06)
- [ ] `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` — mocked-fetch request-shape + self-auth + allowlist source assertions (COMM-01)
- [ ] Mocked `fetch` indirection so the EF's Resend request is asserted without `--allow-net`

*Existing `deno test` infrastructure (`supabase/functions/_shared/__tests__/`) covers the harness; only the new test files above are needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end live send | COMM-01 (criterion 4) | Requires dormant EF **deploy** (`--no-verify-jwt`), a live Vault `RESEND_API_KEY`, and Supabase MCP — GSD executor subagents lack MCP tools (upstream bug). Orchestrator checkpoint. | After deploy, `net.http_post` to the EF with a Vault Bearer + real test candidatura id + `evento` (mode teste). Assert: (a) email lands at `delivered+<evento>@resend.dev`; (b) `notificacoes_enviadas` row exists with `status='enviado'` + non-null `provider_message_id`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (no `deno test --watch`)
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
