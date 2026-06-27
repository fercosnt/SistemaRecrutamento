---
created: 2026-06-27T01:44:50.225Z
title: Citacoes da analise de transcricao renderizam JSON cru (ENTREV-CITACOES-01)
area: entrevista
files:
  - src/features/entrevista/components/TranscricaoReviewPanel.tsx
---

## Problem

[bug-visual / media] Pego no UAT-14 live 2026-06-26. Na aba "Analise da transcricao"
(`/rh/candidato/:id/entrevista`), a secao CITACOES exibe o objeto JSON literal
`{"competency":"...","cited_evidence":[{"text":"...","location":"..."}]}` em vez de
texto formatado legivel.

Reproduzir: candidatura `a1dd4c42` (ja tem analise de transcricao com 4 competencias)
→ aba "Analise da transcricao" → rolar ate CITACOES.

## Solution

TBD — por competencia, listar cada evidencia como citacao legivel
(ex: «trecho citado» — localizacao), sem expor chaves/colchetes JSON.
