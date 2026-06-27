---
phase: 13-reda-o-cultural-revis-o-humana
plan: 04
wave: 3
status: complete
completed: 2026-06-24
autonomous: false
requirements: [AVAL-05, AVAL-06, AVAL-07]
key_files:
  created: []
  modified:
    - database.types.ts
    - supabase/migrations/20260623100001_perguntas_redacao.sql
    - .planning/phases/13-reda-o-cultural-revis-o-humana/13-VALIDATION.md
---

# Plan 13-04 SUMMARY — [BLOCKING] PROD apply wave

**Orchestrator-run, operator-authorized (AskUserQuestion checkpoint).** Every step touched live PROD Supabase infra.

## What was applied to live PROD

1. **4 migrations via Supabase MCP `apply_migration`** (D-22 path — no 42601):
   - `perguntas_redacao` + 11-row seed (1 is_padrao) + RLS. **Index-name collision fix:** the authored `idx_perguntas_cargo` / `idx_perguntas_padrao_unica` collided with the Phase-11 SJT `perguntas` table (index names are schema-unique) → renamed to `idx_perguntas_redacao_cargo` / `idx_perguntas_redacao_padrao_unica` in PROD + the migration file reconciled to match.
   - `redacoes_candidato_em_progresso` (autosave) + RLS (candidato own R/W gated on etapa=avaliacao_assincrona; RH read).
   - `redacoes_candidato` (final auditable record) + RLS (candidate own SELECT, client INSERT denied, RH SELECT + review-only UPDATE) + `trg_redacao_rh_only_review_fields` BEFORE UPDATE trigger.
   - `salvar_revisao_redacao(uuid,text,text,jsonb)` SECURITY DEFINER RH-only review-write RPC (never writes candidaturas — RNF-07a).
   - Verified live: 3 tables + trigger + RPC exist; seed = 11 / 1 padrao.

2. **`culture_fit_essay` prompt hydrated + activated.** The live row was a `[SEED PLACEHOLDER]` (sys_len 129). Hydrated from `docs/conhecimento/prompts/templates/06-culture-fit-essay.md` (SYSTEM + USER fenced blocks → sys_len 2257 / usr_len 848, Sonnet 4.6, max_tokens 2500) + `is_active=true` (single active row). content_hash left as the seed sentinel — the immutability trigger locked template/hash after `deployed_at` was set; runtime-irrelevant (loadPrompt selects by active state, not hash). Canonical-sync content_hash reconcile deferred (Phase-11 db-push drift precedent).

3. **EFs deployed JWT-on** (CLI, auto-bundles _shared): `avaliar-redacao-cultural` (new) + `submit-bigfive-final` (redeployed with the always-403 ownership fix). Both anon curl → 401.

4. **`database.types.ts` regenerated at repo ROOT** — includes redacoes_candidato / perguntas_redacao / redacoes_candidato_em_progresso / salvar_revisao_redacao. Lint baseline 291 flat.

## SQL smokes — PASS live (disposable fixture, ROLLBACK-free cleanup)

- SMOKE-A: redacoes_candidato client INSERT (role authenticated, candidato claims) → 42501 (WITH CHECK false). PASS.
- SMOKE-B: `salvar_revisao_redacao` as candidato → insufficient_privilege. PASS.
- SMOKE-C: notas<50 chars → check_violation. PASS.
- SMOKE-D: RH-owner happy path → `status_analise='concluida'`; **candidaturas row UNCHANGED (RNF-07a holds)**. PASS.
- SMOKE-E: review-fields trigger blocks RH UPDATE of `texto`. PASS.
- SMOKE-F: `word_count` 600 → check_violation (200-500). PASS.
- em_progresso candidate-write RLS ownership idiom validated (auth.uid() resolves, ownership=true).

## Deferred to human UAT
- Full live AI essay scoring (real candidate at avaliação stage + Anthropic call).
- em_progresso positive write end-to-end + RH review UI round-trip (Plan 13-05 surface).

## Notes
- MCP `apply_migration` records its own timestamp version row (not the filename version) → `supabase db push --linked` will show a version-row drift; cosmetic reconcile deferred (Phase-11 precedent).
- Bundled correction (operator-authorized): `submit-bigfive-final` (Phase 12) ownership fix redeployed. `avaliar-redacao` (SJT, Phase 11) deferred to backlog (needs the full .join/zod chain too).
