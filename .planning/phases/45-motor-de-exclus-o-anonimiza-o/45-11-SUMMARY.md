---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 11
subsystem: database
tags: [supabase, prod-apply, portao-destrutivo, code-review, smoke, edge-function, storage, auth-admin, lgpd]

requires:
  - phase: 45-13
    provides: "os 6 blockers do `45-REVIEW.md` fechados no disco"
  - phase: 45-14
    provides: "os 3 blockers do `45-REVIEW-2.md` fechados"
  - phase: 45-15
    provides: "NW-01/NW-02 fechados e a tabela de `md5(prosrc)` que o apply conferiu"
  - phase: 45-16
    provides: "WR-A e WR-E fechados, as duas condições da execução real"
provides:
  - "O portão destrutivo do M8 fechado 5/5 para a Phase 45"
  - "As 7 migrations `20260805000003`…`000009` aplicadas em PROD, ledger `000001`–`000009` sem buracos, md5 conferido vivo × arquivo"
  - "O smoke `p45_motor_exclusao_smoke.sql` verde 24/24 em PROD, com zero resíduo nas 13 tabelas"
  - "O motor EXECUTADO ponta a ponta pela EF com o JWT do titular, numa conta descartável: Storage → Postgres → Auth"
affects: [46-purga, 47-consolidacao]

actuals:
  tasks: 3

key-files:
  created:
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-REVIEW-2.md
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-REVIEW-3.md
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-REVIEW-4.md
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-11-EVIDENCIA-PORTAO.md
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-VERIFICATION.md
  modified:
    - supabase/tests/p45_motor_exclusao_smoke.sql

key-decisions:
  - "CR-01 (opção B, operador, 2026-08-11): guard de intenção E caminho destrutivo só para `administrador`/titular"
  - "DI-45-12-01: o `EXECUTE` de `gerar_bias_snapshot` para `authenticated` é DELIBERADO (tela de auditoria de viés); mudou a premissa da asserção C1, não o ACL"
  - "O `(B3/email)` manteve o predicado `count(*) = 1`; mudou só o PONTO DE MEDIÇÃO, para dentro da subtransação"
  - "Os pins de `md5(prosrc)` do `(C3/i)` foram fixados por conferência CRUZADA vivo × arquivo, nunca copiando o valor vivo"
  - "A execução real rodou só depois de o agente parar e o operador autorizar explicitamente na sessão — sobre conta descartável"

requirements-completed: [ERASE-01, ERASE-02, ERASE-03, ERASE-04, ERASE-05, ERASE-06, ERASE-07, ERASE-08, ERASE-09, ERASE-10]
---

# 45-11 — Portão destrutivo: review, apply, smoke e execução real

> **SUMMARY de escrituração, escrito em 2026-10-07.** O plano foi executado entre 2026-08-11 e
> 2026-08-22, mas o par canônico `PLAN`/`SUMMARY` nunca foi fechado. O veredito da fase está em
> `45-VERIFICATION.md` (`passed`, 5/5) e a medição em `45-11-EVIDENCIA-PORTAO.md`. Este documento
> **não acrescenta medição nenhuma**: se divergir de uma das fontes, vale a fonte.

## As três tasks

| Task | Quando | Evidência | Resultado |
|---|---|---|---|
| 1 — code review bloqueante + dry-run pela mesma query | 2026-08-11 → 08-13 | `45-REVIEW-2/3/4.md` · `76976bb2` · `057471cd` · `6aa249a2` | ✅ 4 rodadas de review, 9 blockers de motor, **nenhum chegou a PROD**; `REVIEW-4` limpo no motor, 2 blockers de **verificação** fechados em `76976bb2`; `(C3)` é o dry-run pela mesma query |
| 2 — apply na ordem obrigatória + deploy + smoke | 2026-08-12 / 08-13 | `STATE.md` § «Apply da Phase 45 — CONCLUÍDO em 2026-08-12» · `bcf6d85e` | ✅ 7/7 migrations, `000009` por último; `notificar-rh` v2 antes do trigger da `000007`; `executar-direito-titular` v2 com `verify_jwt: true`; `candidatos_user_id_fkey` `CASCADE` → `SET NULL`; smoke **24/24**, contagens 22/9/5/1 idênticas ao antes, 0 tombstones |
| 3 — execução real, vigiada | 2026-08-22T05:14:47Z | `45-11-EVIDENCIA-PORTAO.md` · `.planning/RUNBOOK-45-06-T2-E-45-11-T3.md` (FASE 2) · `7888da71` | ✅ `200` em 5.473 ms, `arquivos_apagados: 3` |

## O que a execução real mediu

| Sistema | Antes | Depois |
|---|---|---|
| Storage sob o prefixo | 3 (2 com ponteiro + 1 órfão de propósito) | **0** |
| Postgres | candidato vivo | tombstone, `user_id` NULL, `faixa_etaria_materializada = '35-44'` gravada **antes** |
| Auth | usuário existe · 30 | **não existe** · 29 (−1 exato) |
| `historico` / `decisao_final` | 7 / 2 | **7 / 2** |

Sete negativas verdes (com a ressalva 2 abaixo), CR-04 verde, re-identificação = 0 linhas,
`excluidos_sem_data: 0`. O recibo foi conferido na caixa do operador: tempo passado, sem
identificador proibido, e a linha obrigatória do WR-A aparece. As três EFs foram redeployadas
no mesmo dia (`6387e04d`, `executar-direito-titular` v3) para o conserto do WR-A, a logo e os
links ao RH entrarem em vigor.

## ⚠ Ressalvas registradas, não silenciadas

1. **Idempotência por re-invocação não é testável pela EF.** Depois do `deleteUser`, o JWT do
   titular é recusado (`401 Sessão inválida.`). O estado foi re-medido após a tentativa e não
   mudou, mas «re-invocar e nada muda» não foi exercitado por esse caminho.
2. **`decisao_final_historico` foi de 1 → 2.** É divergência de letra, não de intenção:
   `trg_decisao_final_snapshot` é `AFTER UPDATE` sem `WHEN` (obrigação M1 do `45-04`); o scrub foi
   o último statement e as duas linhas estão desidentificadas. Ainda está aberto se a asserção
   deve ser reescrita.
3. **320px** não foi testado (ver `45-06-SUMMARY.md`).
