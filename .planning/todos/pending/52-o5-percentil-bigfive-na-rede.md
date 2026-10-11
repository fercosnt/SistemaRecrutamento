---
id: 52-o5-percentil-bigfive-na-rede
created: 2026-10-11
source: Phase 52 — T-52-33 / F15 / O5 (52-11-SUMMARY; 52-REVIEW-PORTAO-1 IN-04); operador mandou para o backlog em 2026-10-11
priority: medium
tags: [bigfive, rnf-07a, privacidade, backlog]
---

# O5 — `getScores` ainda manda o percentil do Big Five pela rede

`src/features/avaliacao/services/scoresRhService.ts:80,133-134` leva `metadata` inteiro na allowlist, então
`metadata.dimensoes[].percentil` chega ao navegador do RH, embora nenhuma tela o mostre desde o 52-11 (D-01..D-07).
Conserto: projetar `metadata` sem `percentil` (ou ler pela RPC `ler_devolutiva_bigfive_rh`). Registro da decisão:
`.planning/phases/52-hub-do-rh-dados-e-contato/52-DECISAO-2026-10-11-gaps-e-pitr.md`.
