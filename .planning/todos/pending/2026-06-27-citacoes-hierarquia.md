---
created: 2026-06-27
title: Hierarquia visual das citacoes da transcricao (ENTREV-CITACOES-02 — follow-up do 01)
area: entrevista
severity: media
files:
  - src/features/entrevista/components/TranscricaoReviewPanel.tsx
---

## Problem

[ux-visual / media] Follow-up do ENTREV-CITACOES-01 (PARCIAL no re-teste 2026-06-27).
As citacoes ja aparecem legiveis (`«texto» — Transcricao - Pergunta N`), mas a
hierarquia visual e fraca:

1. **"Citacoes" deve ser TITULO de secao proeminente.** Hoje e um rotulo apagado
   (`text-xs uppercase text-white/50`) — nao marca a dobra nem separa do bloco de
   scores (DimensaoRow) acima. Promover a um heading claro (ex.: `text-xl`/secao com
   respiro), como "Analise da transcricao".
2. **Por citacao, destacar a TAG (qual pergunta/competencia) + a AREA/localizacao**,
   bem visiveis e agrupadas. Hoje a competencia e um `text-sm` discreto e a localizacao
   um `text-white/50` inline; queremos um chip/badge da competencia/pergunta + a
   localizacao destacada, agrupando as evidencias daquela competencia.

Reproduzir: `/rh/candidato/a1dd4c42-…/entrevista` → aba "Analise da transcricao" →
secao Citacoes.

## Solution

TBD — so apresentacao (a `normalizeCitacao`/`CitacaoItem` ja entregam os dados certos):
- "Citacoes" como heading de secao (mesmo peso de "Analise da transcricao") + divisor.
- `CitacaoItem`: competencia como chip/badge no topo do grupo; cada evidencia com a
  localizacao em destaque (ex.: badge "Pergunta 1") em vez de texto apagado inline.
Alinhar ao design system Beauty Smile (glass) e ao idioma de badges ja usado nos scores.
