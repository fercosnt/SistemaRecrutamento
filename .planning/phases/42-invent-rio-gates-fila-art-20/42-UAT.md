---
status: testing
phase: 42-invent-rio-gates-fila-art-20
source: [42-VERIFICATION.md, 42-PENDENCIAS-2026-10-03.md]
started: 2026-10-03T21:15:00Z
updated: 2026-10-03T21:15:00Z
---

## Current Test

number: 1
name: Decisão sobre o PITR (metade de decisão do INVENT-02)
expected: |
  O operador lê o fato medido em 2026-10-03 (PITR desligado; backup diário com ~7 dias; Storage sem backup)
  e decide por escrito: ligar o PITR (gasto) ou aceitar a postura atual.
awaiting: user response

## Tests

### 1. Decisão sobre o PITR (metade de decisão do INVENT-02)
expected: O operador lê `docs/compliance/backup-posture.md` (seção «Medido em 2026-10-03»: `pitr_enabled=false`, 8 backups diários, sem janela PITR, Storage sem backup) e responde por escrito: **ligar o PITR** (decisão de gasto, no painel do Supabase → Database → Backups) **ou aceitar** a perda de até ~24 h na metade Postgres. Qualquer das duas respostas é `pass`; o que reprova é ficar sem decisão.
result: [pending]

### 2. Quem é o recrutador real (resíduo do roster)
expected: Hoje há 3 RH ativos, todos administradores, e nenhum `recrutador`. O operador responde: (a) cadastra o recrutador real com e-mail entregável em `/rh/configuracoes`, e o próximo pedido de revisão gera uma linha `entregue` para ele; ou (b) aceita que a fila de revisão é de administradores, e o todo `42-recrutador-email-indeliveravel` fecha como «aceito». Qualquer das duas é `pass`.
result: [pending]

### 3. Purga: esperar 2027-03-04 ou autorizar prova com ROLLBACK
expected: O cron rodou 63/63 sem falha, mas nunca teve linha elegível (o primeiro vencimento em `ai_call_logs` é 2027-03-04). O operador escolhe: (a) aceitar a prova formal + execução sem erro e conferir o primeiro `DELETE n>0` depois de 2027-03-04; ou (b) autorizar uma transação de prova em PROD (INSERT de log vencido → comando do cron → `ROLLBACK`) que mostre `DELETE 1` sem deixar resíduo. Qualquer das duas é `pass`.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

[none yet]
