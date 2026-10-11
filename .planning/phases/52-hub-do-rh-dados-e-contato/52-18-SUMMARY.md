---
phase: 52-hub-do-rh-dados-e-contato
plan: 18
status: in-progress
---

# Phase 52 Plan 18: bloco C (banco SJT v2) — registro parcial antes do apply

> Arquivo PARCIAL, escrito antes do pin da Task 3 para cumprir a `<precondition>` da Task 3 («o token `;remap=…` que o
> operador viu registrado no SUMMARY»). A versão final substitui este arquivo depois do apply e do push.

## Task 1 (tracer) — evidência literal (executada em 83dbe5d0)

Ledger antes: `20261011000001`, `20261011000002`; SEM `20261011000003` (relido só leitura em 2026-10-11T18:58Z, igual).

```
ENSAIO VERDE: supabase/tests/p52_banco_sjt_smoke.sql · prefixadas=[20261011000003] · aplicadas=[20261011000001,20261011000002] · ausentes=[20261011000004] · smokes=[52b=14/14] · evidencia=pontuar_sjt=66fe507fbf5bf6a98bd7e5eecd84f310 banco:sdr-social-seller=6+1,social-media=6+1,videomaker-storymaker=6+1,editor-video=6+1;retirados=19;tabela_md5=1d441390e9951839d2249966947addc2;mantidos=3;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083 52b.retirados=19 52b.refs=14,em_retirados=9 52b.mantidos=3 52b.remap=32 52b.refs_remap=3 52b.scores_sjt=8 52b.mapa=32 52b.pontuar=bateria:3,valido=igual,22023=velho+forjado,velho_silencioso=2/3 · 2505 ms
MUTACOES: 14/14 mordem; controle verde; nada persistiu
```

## Task 2 — review e decisão do operador (verbatim)

- Review: `52-REVIEW-BANCO-1.md` (fc22cb98), `critical: 0`, 5 warning, 6 info; `reviewed_head` 83dbe5d0.
- Portão: `PORTAO OK: revisao=…52-REVIEW-BANCO-1.md reviewed_head=83dbe5d00c264687b6b4eab96d3bac2c1e103dd3 pin=- modo=revisao`.
- Decisão (2026-10-11, `52-18-DECISAO-OPERADOR.md`, a9964d5e):
  - Bloco C: **«aplicar»**
  - Janela única: **«Confirmo»**
  - `3a9254c3-8086-42df-8d81-42889c3a1f8d`: **«É conta de teste minha»** (+claude6)

**Token aprovado pelo operador (a Passo 0b o compara byte a byte, por máquina):**

```
;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083
```
