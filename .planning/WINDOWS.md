---
schema_version: 1
open_count: 16
waived_count: 0
fixed_count: 0
total_count: 16
last_updated: 2026-08-05T23:44:28.940Z
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
| 7 | 45 | unrun-verify | supabase/tests/p45_bias_k5_smoke.sql |  | p45_bias_k5_smoke.sql e o DO de auto-verificacao da 20260805000003 nunca foram executados contra banco nenhum — o apply e 45-11 | open |  | 2026-08-05T07:10:20.368Z |  |
| 8 | 45 | deviation | src/features/admin/bias-audit/biasMath.ts |  | A tela de auditoria de vies ainda le o payload v1; o snapshot passa a emitir celulas suprimidas sem applicants/selected e sem n_total | open |  | 2026-08-05T07:10:20.426Z |  |
| 9 | 45 | unrun-verify | supabase/tests/p45_motor_exclusao_smoke.sql |  | Smoke do motor de exclusao NAO executado — deliberadamente RED (as 5 funcoes nascem em 45-03/45-05/45-07); os pins md5(prosrc) seguem com marcador PENDENTE-45-07 e C3 reprova enquanto assim for. Fecha no 45-11 com 21/21 PASS | open |  | 2026-08-05T07:14:13.436Z |  |
| 10 | 45 | deviation | supabase/migrations/20260805000006_p45_anonimizar_candidato.sql |  | Obrigacoes que o smoke 45-04 impoe ao 45-07: (M1) trg_decisao_final_snapshot e AFTER UPDATE sem WHEN e reinsere OLD.justificativa — o scrub de decisao_final_historico tem de ser o ULTIMO statement do par; (M2) candidate_ai_decisions.candidato_id E vaga_id sao NOT NULL com ON DELETE SET NULL (clausulas inexequiveis) — decidir entre afrouxar as duas colunas e desidentificar o conteudo | open |  | 2026-08-05T07:14:13.496Z |  |
| 11 | 45 | unrun-verify | supabase/migrations/20260805000001_p45_pedido_exclusao.sql |  | As duas migrations do 45-03 foram escritas mas NAO aplicadas — o DO block de auto-verificacao so executa no apply (45-06) | open |  | 2026-08-05T07:23:32.301Z |  |
| 12 | 45 | stub | src/features/privacidade/components/ExcluirDadosBloco.tsx |  | Estado B sem botao Cancelar a exclusao — por desenho, entra no 45-08 | open |  | 2026-08-05T07:23:32.364Z |  |
| 13 | 45 | deviation | src/__tests__/copyPortoesLgpd.test.ts |  | O portao do CONSOL-04 ficou VERDE por falso positivo: a sonda casa substring em comentario. Promessa continua orfa; exige decisao do operador | open |  | 2026-08-05T07:23:32.425Z |  |
| 14 | 45 | deviation | supabase/functions/executar-direito-titular/index.ts | 377 | DI-45-07-01: a EF chama as RPCs com service_role sem repassar o Authorization do titular; auth.uid() e NULL e o guard das RPCs ja aplicadas em PROD recusa com 42501 — nenhum pedido de exclusao seria registrado. Fecha no 45-10. | open |  | 2026-08-05T23:11:21.892Z |  |
| 15 | 45 | unrun-verify | supabase/migrations/20260805000006_p45_anonimizar_candidato.sql |  | Os DO blocks de auto-verificacao das 3 migrations do 45-07 so EXECUTAM no apply, que e do 45-11 atras do portao destrutivo. Ate la a verificacao e estatica (forma), nao por execucao. | open |  | 2026-08-05T23:11:21.947Z |  |
| 16 | 45 | deviation | src/features/privacidade/components/ConfirmarExclusaoDialog.tsx |  | 45-08: portao RED do TDD verificado por execucao, nao por commit isolado — o gate tsc (baseline 97) reprova um teste que importa modulo ainda inexistente, e --no-verify e proibido | open |  | 2026-08-05T23:44:28.940Z |  |

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
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/tests/p45_bias_k5_smoke.sql",
    "line": null,
    "description": "p45_bias_k5_smoke.sql e o DO de auto-verificacao da 20260805000003 nunca foram executados contra banco nenhum — o apply e 45-11",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:10:20.368Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "deviation",
    "phase": "45",
    "file": "src/features/admin/bias-audit/biasMath.ts",
    "line": null,
    "description": "A tela de auditoria de vies ainda le o payload v1; o snapshot passa a emitir celulas suprimidas sem applicants/selected e sem n_total",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:10:20.426Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/tests/p45_motor_exclusao_smoke.sql",
    "line": null,
    "description": "Smoke do motor de exclusao NAO executado — deliberadamente RED (as 5 funcoes nascem em 45-03/45-05/45-07); os pins md5(prosrc) seguem com marcador PENDENTE-45-07 e C3 reprova enquanto assim for. Fecha no 45-11 com 21/21 PASS",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:14:13.436Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql",
    "line": null,
    "description": "Obrigacoes que o smoke 45-04 impoe ao 45-07: (M1) trg_decisao_final_snapshot e AFTER UPDATE sem WHEN e reinsere OLD.justificativa — o scrub de decisao_final_historico tem de ser o ULTIMO statement do par; (M2) candidate_ai_decisions.candidato_id E vaga_id sao NOT NULL com ON DELETE SET NULL (clausulas inexequiveis) — decidir entre afrouxar as duas colunas e desidentificar o conteudo",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:14:13.496Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/migrations/20260805000001_p45_pedido_exclusao.sql",
    "line": null,
    "description": "As duas migrations do 45-03 foram escritas mas NAO aplicadas — o DO block de auto-verificacao so executa no apply (45-06)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:23:32.301Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "stub",
    "phase": "45",
    "file": "src/features/privacidade/components/ExcluirDadosBloco.tsx",
    "line": null,
    "description": "Estado B sem botao Cancelar a exclusao — por desenho, entra no 45-08",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:23:32.364Z",
    "resolved_at": null
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "45",
    "file": "src/__tests__/copyPortoesLgpd.test.ts",
    "line": null,
    "description": "O portao do CONSOL-04 ficou VERDE por falso positivo: a sonda casa substring em comentario. Promessa continua orfa; exige decisao do operador",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:23:32.425Z",
    "resolved_at": null
  },
  {
    "id": 14,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/functions/executar-direito-titular/index.ts",
    "line": 377,
    "description": "DI-45-07-01: a EF chama as RPCs com service_role sem repassar o Authorization do titular; auth.uid() e NULL e o guard das RPCs ja aplicadas em PROD recusa com 42501 — nenhum pedido de exclusao seria registrado. Fecha no 45-10.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T23:11:21.892Z",
    "resolved_at": null
  },
  {
    "id": 15,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql",
    "line": null,
    "description": "Os DO blocks de auto-verificacao das 3 migrations do 45-07 so EXECUTAM no apply, que e do 45-11 atras do portao destrutivo. Ate la a verificacao e estatica (forma), nao por execucao.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T23:11:21.947Z",
    "resolved_at": null
  },
  {
    "id": 16,
    "kind": "deviation",
    "phase": "45",
    "file": "src/features/privacidade/components/ConfirmarExclusaoDialog.tsx",
    "line": null,
    "description": "45-08: portao RED do TDD verificado por execucao, nao por commit isolado — o gate tsc (baseline 97) reprova um teste que importa modulo ainda inexistente, e --no-verify e proibido",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T23:44:28.940Z",
    "resolved_at": null
  }
]
````
