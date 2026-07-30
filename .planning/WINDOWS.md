---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-07-30T05:14:14.820Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 42 | stub | supabase/functions/notificar-rh/helpers.ts |  | Link do e-mail ao RH aponta para /rh/revisoes, rota que so existe a partir do plano 42-09 (pagina) / 42-10 (sidebar) — se o trigger for aplicado antes, um pedido de revisao real produz e-mail com link 404 | open |  | 2026-07-30T05:14:14.765Z |  |
| 2 | 42 | unrun-verify | supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql |  | 42-07: apply da migration, deploy da EF notificar-rh, diff de pg_get_functiondef contra a transcricao, smoke do round-trip e assercao negativa da varredura — nenhum executado (MCP Supabase indisponivel ao subagente); checkpoint do orquestrador | open |  | 2026-07-30T05:14:14.820Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "42",
    "file": "supabase/functions/notificar-rh/helpers.ts",
    "line": null,
    "description": "Link do e-mail ao RH aponta para /rh/revisoes, rota que so existe a partir do plano 42-09 (pagina) / 42-10 (sidebar) — se o trigger for aplicado antes, um pedido de revisao real produz e-mail com link 404",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-30T05:14:14.765Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "42",
    "file": "supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql",
    "line": null,
    "description": "42-07: apply da migration, deploy da EF notificar-rh, diff de pg_get_functiondef contra a transcricao, smoke do round-trip e assercao negativa da varredura — nenhum executado (MCP Supabase indisponivel ao subagente); checkpoint do orquestrador",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-30T05:14:14.820Z",
    "resolved_at": null
  }
]
````
