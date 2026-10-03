---
status: complete
phase: 49-consertos-da-jornada-bloco-2
source: [49-VERIFICATION.md]
started: 2026-10-03T04:01:14Z
updated: 2026-10-03T21:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Fluxo do sinal ponta a ponta em PROD, com candidatura de teste
expected: (1) flag — análise gravada normalmente, nota inalterada, linha `prompt_injection_flagged` em `ai_call_logs`, rótulo pt-BR na tela. (2) block — sem chamada ao provedor, linha `prompt_injection_detected`, análise sem nota.
result: pass

### 2. Conferência visual das telas que mostram o sinal
expected: Rótulo pt-BR em âmbar (nunca destrutivo), sem quebrar layout, no hub do candidato, tabela da triagem, revisão da redação, card da SJT, painel da transcrição (sem travar o Avançar), comparativo (tela e PDF) e Decisão Final (aviso na etapa SJT); estado «Sinal» no log de IA do admin, com o filtro de Status concordando com a célula. Recarregar com Ctrl+Shift+R antes. **WR-07 (49-44/45, no ar em 2026-10-03):** dentro do aviso âmbar da etapa SJT na Decisão Final, «Ler a resposta do caso aberto» mostra o texto gravado com as quebras de linha, «Ocultar a resposta» o esconde, nada aparece desabilitado; um RH de outra vaga vê o erro com «Tentar de novo». Precisa de candidatura com o sinal (hoje 0 em PROD) — junta-se ao item 1.
result: pass

### 3. Decisão sobre o custo residual do bloqueio (WR-03)
expected: O operador aceita por escrito que frases honestas que NOMEIAM prompt/IA/«instruções anteriores» seguem bloqueadas («você é um bot?» citado, «Jamais ignore as instruções anteriores do dentista», «desconsidere as instruções anteriores do e-mail», «ignore o prompt de pagamento») — análise recusada com auditoria, sem rejeitar candidato — ou pede estreitar a família.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
