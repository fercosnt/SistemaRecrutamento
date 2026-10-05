---
status: complete
phase: 43-consentimentos-honestos-pol-tica-de-reten-o
source: [43-VERIFICATION.md, 43-PENDENCIAS-2026-10-03.md]
started: 2026-10-03T21:30:00Z
updated: 2026-10-04T13:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Bloco de guarda do currículo — ramo AUTORIZADO
expected: Em /candidato/privacidade (Ctrl+Shift+R), numa conta com autorização de guarda marcada e currículo enviado, aparece «Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}.» com os dois valores preenchidos, e o bloco é só leitura. O teste de componente (5/5), o fluxo de dados, a população em PROD (7 contas) e a copy no bundle servido já foram provados sem você: falta só o olho na tela.
result: pass
reported: "Currículo guardado. / Você autorizou a Beauty Smile a guardar seu currículo e os dados da sua candidatura por até 2 anos. / Base da guarda: sua autorização de 22/09/2026. Prazo previsto: até 22/09/2028." — texto colado pelo operador em 2026-10-04, conta +claude6, seção «O que guardamos e por quê»; bloco só leitura.

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
