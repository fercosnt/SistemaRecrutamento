---
schema_version: 1
open_count: 6
waived_count: 0
fixed_count: 0
total_count: 6
last_updated: 2026-08-05T04:13:18.664Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 42 | stub | supabase/functions/notificar-rh/helpers.ts |  | Link do e-mail ao RH aponta para /rh/revisoes, rota que so existe a partir do plano 42-09 (pagina) / 42-10 (sidebar) — se o trigger for aplicado antes, um pedido de revisao real produz e-mail com link 404 | open |  | 2026-07-30T05:14:14.765Z |  |
| 2 | 42 | unrun-verify | supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql |  | 42-07: apply da migration, deploy da EF notificar-rh, diff de pg_get_functiondef contra a transcricao, smoke do round-trip e assercao negativa da varredura — nenhum executado (MCP Supabase indisponivel ao subagente); checkpoint do orquestrador | open |  | 2026-07-30T05:14:14.820Z |  |
| 3 | 43 | unrun-verify | supabase/tests/p43_matriz_retencao_smoke.sql |  | smoke de 10 asserções da matriz de retenção escrito mas NÃO executado — sem MCP Supabase no executor; apply + run são o checkpoint 43-07 | open |  | 2026-08-01T22:23:04.988Z |  |
| 4 | 43 | unrun-verify | supabase/tests/p43_previa_smoke.sql |  | Smoke da previa de retencao NAO executado — deliberadamente RED contra o banco atual; vai verde no checkpoint 43-07 com 9/9 PASS | open |  | 2026-08-02T16:54:32.146Z |  |
| 5 | 45 | deviation | docs/compliance/sql/gen-recibo-exclusao.cjs |  | 45-02: o <verify> do plano varria o JSON inteiro procurando 'tombstone', string que o proprio <action> manda existir em PASSOS_MOTOR; varredura de banidos escopada ao texto de titular (meta.campos_de_texto_de_titular) | open |  | 2026-08-05T04:13:18.606Z |  |
| 6 | 45 | deviation | .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-02-SUMMARY.md |  | 45-02: 6 das 9 bases legais do recibo foram escritas pela engenharia, nao ditadas pela UI-SPEC — revisao pelo Encarregado de Dados pendente antes do e-mail de recibo sair em PROD | open |  | 2026-08-05T04:13:18.664Z |  |

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
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "43",
    "file": "supabase/tests/p43_matriz_retencao_smoke.sql",
    "line": null,
    "description": "smoke de 10 asserções da matriz de retenção escrito mas NÃO executado — sem MCP Supabase no executor; apply + run são o checkpoint 43-07",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-01T22:23:04.988Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "43",
    "file": "supabase/tests/p43_previa_smoke.sql",
    "line": null,
    "description": "Smoke da previa de retencao NAO executado — deliberadamente RED contra o banco atual; vai verde no checkpoint 43-07 com 9/9 PASS",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-02T16:54:32.146Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "deviation",
    "phase": "45",
    "file": "docs/compliance/sql/gen-recibo-exclusao.cjs",
    "line": null,
    "description": "45-02: o <verify> do plano varria o JSON inteiro procurando 'tombstone', string que o proprio <action> manda existir em PASSOS_MOTOR; varredura de banidos escopada ao texto de titular (meta.campos_de_texto_de_titular)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T04:13:18.606Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "45",
    "file": ".planning/phases/45-motor-de-exclus-o-anonimiza-o/45-02-SUMMARY.md",
    "line": null,
    "description": "45-02: 6 das 9 bases legais do recibo foram escritas pela engenharia, nao ditadas pela UI-SPEC — revisao pelo Encarregado de Dados pendente antes do e-mail de recibo sair em PROD",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T04:13:18.664Z",
    "resolved_at": null
  }
]
````
