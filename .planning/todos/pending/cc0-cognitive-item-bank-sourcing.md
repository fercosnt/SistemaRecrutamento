---
id: cc0-cognitive-item-bank-sourcing
created: 2026-06-24
source: Phase 14 / Plan 14-02 (checkpoint:human-verify deferred by user decision)
priority: medium
resolves_phase: null
tags: [entrev-05, cognitivo, cc0, license, item-bank, deferred]
---

# Source the CC0 cognitive-reasoning item bank (ENTREV-05 live items)

**Deferred** during Phase 14 autonomous execution (2026-06-24) — user chose
"Defer ENTREV-05 cognitive prova" at the 14-02 `checkpoint:human-verify` gate.

## What shipped without it
- `supabase/functions/_shared/cognitivo/item-bank.ts` — the typed `ItemRaciocinio`
  contract `{ id, secao, enunciado, alternativas[], gabarito_idx }` (committed `880ff86`),
  with `SEED_ITENS_RACIOCINIO: ItemRaciocinio[] = []` (empty `[PENDING]` seed).
- `docs/conhecimento/cognitivo/README.md` — CC0-only sourcing convention.
- The cognitive scorer (`scoreRaciocinio`, 14-01), the `pontuar_cognitivo` RPC + tables
  (14-03), and the candidate prova UI (14-06) all ship and run against the empty seed.
  The prova is opt-in via `vaga.aplica_cognitivo` (default **OFF**), so no candidate
  reaches it until items are seeded.

## What's left (this todo)
1. Source ≥20 CC0 ICAR items (matriz + letra-número) from Harvard Dataverse
   `doi:10.7910/DVN/TZJGAT` (confirmed **CC0 1.0** via the Dataverse API) — pair
   `superKey.tab` (the gabarito) with the published ICAR Matrix Reasoning +
   Letter-Number Series item stems. NOT the non-commercial `icar-project.com` bank;
   NOT the legacy Raven `.webp` blobs.
2. Commit `docs/conhecimento/cognitivo/itens-raciocinio-cc0.json` (`ItemRaciocinio[]`,
   ≥20 items spanning both `secao` values) + `docs/conhecimento/cognitivo/LICENSE-CC0.md`
   (CC0 deed + attribution: Condon & Revelle, SAPA Project).
3. Wire `SEED_ITENS_RACIOCINIO` in `item-bank.ts` to import/embed the JSON
   (replace the `[PENDING]` placeholder).
4. Re-run the cognitive seed migration + `pontuar_cognitivo` live smokes (14-VALIDATION
   SMOKE-2/3/4) against the real items.

## Validity note
ENTREV-05 is CONTEXTUAL + opt-in + never auto-rejects (RNF-07a) — deferring the live
items does not affect the core M2 interview flow (guide EF + transcript BARS EF + RH
workspace), which ship fully in Phase 14.
