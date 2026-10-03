---
status: testing
phase: 43-consentimentos-honestos-pol-tica-de-reten-o
source: [43-VERIFICATION.md, 43-PENDENCIAS-2026-10-03.md]
started: 2026-10-03T21:30:00Z
updated: 2026-10-03T21:30:00Z
---

## Current Test

number: 1
name: Bloco de guarda do currículo — ramo AUTORIZADO
expected: |
  Logado como candidato numa conta com a autorização de guarda do currículo MARCADA e com currículo enviado
  (há 5 contas suas fer…@gmail.com nessa condição em PROD; a mais recente é de 22/09), abrir
  https://rh.beautysmile.com.br/candidato/privacidade com Ctrl+Shift+R. A seção da guarda do currículo mostra
  o título do ramo autorizado e a linha «Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}.»,
  com data e prazo preenchidos. Não há botão nem controle dentro do bloco.
awaiting: user response

## Tests

### 1. Bloco de guarda do currículo — ramo AUTORIZADO
expected: Em /candidato/privacidade (Ctrl+Shift+R), numa conta com autorização de guarda marcada e currículo enviado, aparece «Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}.» com os dois valores preenchidos, e o bloco é só leitura. O teste de componente (5/5), o fluxo de dados, a população em PROD (7 contas) e a copy no bundle servido já foram provados sem você: falta só o olho na tela.
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
