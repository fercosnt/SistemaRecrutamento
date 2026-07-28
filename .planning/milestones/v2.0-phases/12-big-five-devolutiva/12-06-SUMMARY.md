# Plan 12-06 SUMMARY — [BLOCKING] PROD apply

**Plan:** 12-06 · checkpoint:human-action (autonomous:false) · executed by orchestrator via MCP/CLI under standing user delegation.
**Status:** complete (core), 1 deferred sub-item (devolutiva prompt-row sync → UAT).

## Applied to live PROD (project isljnozzlvckrgjjbjwp)
- **2 migrations via MCP apply_migration** (no 42601):
  - `20260612000001_bigfive_itens` — IPIP-NEO-120 bank (120 items, **55 reverse_keyed** verified) + answer-key-protected `get_bigfive_itens()` SECURITY DEFINER reader (item_id+texto+ordem only) + RLS (no candidato SELECT — dimensao/faceta/reverse are the scoring key).
  - `20260612000002_devolutivas_candidato` — devolutiva sink + RLS (candidato own-row read, RH allowlist, service_role-only write).
- **2 EFs deployed JWT-ON:** `submit-bigfive-final` (server-side TS-port scoring, C1 authz, status='sucesso' always, never writes candidaturas) + `gerar-devolutiva-bigfive` (hybrid template+IA, RF-19b guard).
- **`database.types.ts` regenerated** (bigfive_itens + devolutivas_candidato present). Committed.
- **enum fix:** added `'bigfive_devolutiva'` to the `llm_call_type` enum (Phase-9 forward-declared only the original 7 — the planner missed the ALTER TYPE for the new prompt). `ALTER TYPE ... ADD VALUE IF NOT EXISTS` applied live.

## Live verification
| Check | Result |
|-------|--------|
| bigfive_itens rows / reverse_keyed | ✅ 120 / 55 |
| devolutivas_candidato + bigfive_itens tables | ✅ 2 |
| get_bigfive_itens reader | ✅ present (id+texto+ordem only) |
| both EFs deployed JWT-ON | ✅ |
| types regenerated | ✅ |

## DEFERRED to UAT (not blocking the core scoring path)
- **`bigfive_devolutiva` prompt-row sync:** the prompt template (`08-bigfive-devolutiva.md`) is authored in git but NOT yet a `prompt_versions` row (it's a new prompt; the seed only covered Phase-9's 7). `loadPrompt('bigfive_devolutiva')` will throw until synced. The enum value is now added so it CAN be registered. **To activate:** run `scripts/sync-prompts.ts` (needs SUPABASE_URL + SERVICE_ROLE_KEY env) OR insert the row manually, then `UPDATE prompt_versions SET is_active=true WHERE call_type='bigfive_devolutiva'`. Impact: the devolutiva (fire-and-forget, invoked best-effort by submit-bigfive-final) won't generate until then — **Big Five scoring (the core) is fully live**; the candidate's devolutiva view shows empty/pending until the prompt is registered.

## Orchestrator gates PENDING (context-limited — resume in fresh window)
Phase 12 plan execution is **6/6 + PROD-applied**, but the orchestrator-owned **verify / code-review / UI-review** gates have NOT yet run for Phase 12. Resume with `/gsd-autonomous --from 12` (it will skip the completed plans and run the gates) or `/gsd-verify-work 12`.

## Deviation
- MCP apply_migration (db push has version-row drift from prior MCP applies — Phase 11 note). Live schema authoritative.
- The bigfive_devolutiva enum value + prompt-row were a planning miss (no ALTER TYPE / sync task in 12-06) — enum fixed live; prompt-row deferred to UAT.
