---
status: complete
phase: 42-invent-rio-gates-fila-art-20
source: [42-VERIFICATION.md, 42-PENDENCIAS-2026-10-03.md]
started: 2026-10-03T21:15:00Z
updated: 2026-10-04T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Decisão sobre o PITR (metade de decisão do INVENT-02)
expected: O operador lê `docs/compliance/backup-posture.md` (seção «Medido em 2026-10-03»: `pitr_enabled=false`, 8 backups diários, sem janela PITR, Storage sem backup) e responde por escrito: **ligar o PITR** (decisão de gasto, no painel do Supabase → Database → Backups) **ou aceitar** a perda de até ~24 h na metade Postgres. Qualquer das duas respostas é `pass`; o que reprova é ficar sem decisão.
result: pass
reported: "sim para backup" — decisão: LIGAR o PITR. ⚠ Execução pendente com o operador (Supabase → Database → Backups, add-on pago); até lá `pitr_enabled=false`, medido em 2026-10-03.

### 2. Quem é o recrutador real (resíduo do roster)
expected: Hoje há 3 RH ativos, todos administradores, e nenhum `recrutador`. O operador responde: (a) cadastra o recrutador real com e-mail entregável em `/rh/configuracoes`, e o próximo pedido de revisão gera uma linha `entregue` para ele; ou (b) aceita que a fila de revisão é de administradores, e o todo `42-recrutador-email-indeliveravel` fecha como «aceito». Qualquer das duas é `pass`.
result: pass
reported: "Eu que cadastro cada um" — opção (a): o operador cadastra cada recrutador real; até o primeiro cadastro, a fila é de administradores.

### 3. Purga: esperar 2027-03-04 ou autorizar prova com ROLLBACK
expected: O cron rodou 63/63 sem falha, mas nunca teve linha elegível (o primeiro vencimento em `ai_call_logs` é 2027-03-04). O operador escolhe: (a) aceitar a prova formal + execução sem erro e conferir o primeiro `DELETE n>0` depois de 2027-03-04; ou (b) autorizar uma transação de prova em PROD (INSERT de log vencido → comando do cron → `ROLLBACK`) que mostre `DELETE 1` sem deixar resíduo. Qualquer das duas é `pass`.
result: pass
reported: "Pode sim" — opção (b) executada em 2026-10-04: DO-block em PROD inseriu cópia de log com retain_until vencido, rodou o `command` real do jobid 4 lido de `cron.job` (md5 b64ca58d089f3ed580205e95a40c4e5f) e abortou por RAISE: `vencidos_antes=0 delete_rowcount=1 sintetica_restante=0`. Após o abort: 69 linhas, 0 vencidas — sem resíduo.

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
