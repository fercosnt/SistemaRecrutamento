---
status: testing
phase: 47-transpar-ncia-consolida-o
source: [47-VERIFICATION.md, 47-PENDENCIAS-2026-10-03.md]
started: 2026-10-03T21:15:00Z
updated: 2026-10-03T21:15:00Z
---

## Current Test

number: 1
name: Histórico da candidatura no hub do RH, contra PROD
expected: |
  O bloco Histórico renderiza, na linha de metadado de cada transição, um rótulo de texto:
  o nome completo do recrutador nas transições feitas por gente e «Sistema» nas automáticas.
  Nunca um uuid, nunca espaço em branco, nunca erro de banco.
awaiting: user response

## Tests

### 1. Histórico da candidatura no hub do RH, contra PROD
expected: Logado como administrador (ou o recrutador dono da vaga), abrir `/rh/candidatos/af39f1ea-201b-4006-b930-d67d4c35e970` em PROD, depois de recarregar com Ctrl+Shift+R (render em cache não vale). No bloco Histórico, as 5 transições com ator mostram o NOME COMPLETO do recrutador na linha de metadado; transições automáticas mostram «Sistema». Nenhum uuid, nenhum vazio, nenhum erro. (O banco já devolve isso para as 79 linhas, medido em 2026-10-03; falta ver a tela.) Opcional: `/rh/candidatos/a1dd4c42-bc92-4c37-a584-dc19a59a631d` mostra 2 linhas «Sistema».
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

[none yet]
