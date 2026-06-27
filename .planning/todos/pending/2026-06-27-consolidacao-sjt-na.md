---
created: 2026-06-27T01:44:50.225Z
title: Consolidacao de decisao mostra SJT N/A e triagem-fantasma (DEC-CONSOLIDA-SJT-01)
area: decisao
files:
  - supabase/functions/consolidar-decisao-final/index.ts
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
---

## Problem

[bug-logica / alta] Pego no UAT-15 live 2026-06-26 (= achado F3). O Dashboard de
decisao (`/rh/candidato/:id/decisao`) mostra **Score consolidado 0**, **Work sample
(SJT) = N/A** e **Triagem 0/100**, apesar do candidato ter SJT-MC 10/12 (sucesso) +
caso aberto 7/25 (pendente_humano).

Duas causas:
1. `consolidar-decisao-final` marca a etapa SJT INTEIRA como N/A quando o caso aberto
   esta `pendente_humano` — o MC (sucesso) e ignorado.
2. O trigger Phase-10 `trg_candidaturas_analise` auto-cria uma `analise_candidato_vaga`
   vazia (score_match=0, status sucesso) no INSERT da candidatura → vira a unica etapa
   "present" e arrasta o consolidado para 0.

Impacto: o RH le "aderencia baixa / score 0" para um candidato que foi bem no SJT.
NAO viola RNF-07a (segue advisory, decisao humana) — e precisao do agregado.

Reproduzir: candidatura `a1dd4c42` → `/rh/candidato/a1dd4c42-.../decisao` → aba Dashboard.

## Solution

TBD — decidir as regras de agregacao:
- SJT deve contar quando ao menos o MC esta `sucesso` (caso aberto `pendente_humano`
  NAO zera a etapa)?
- Triagem com analise vazia (sem CV/respostas reais, score 0) deveria ser N/A, nao
  "present 0" — senao puxa o consolidado para baixo indevidamente.
