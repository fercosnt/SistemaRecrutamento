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

## Resolution (2026-06-27 — RESOLVED)

Frontend-only (`TranscricaoReviewPanel.tsx`):
1. **"Citações" virou TITULO de secao** — `<h3 text-xl font-semibold text-white>` (igual
   "Analise da transcricao"), com subtitulo ("Trechos da transcricao que embasam cada
   competencia avaliada") e **divisor** (`border-t border-white/15 pt-6`) separando do
   bloco de scores acima. Antes era um `<p text-xs uppercase text-white/50>` apagado.
2. **Hierarquia por citacao:** `CitacaoItem` virou um card (`border + bg-white/[0.03]`)
   com a **competencia como chip/Badge** prominente no topo + cada evidencia como quote
   legivel (`«texto»`, text-base) e a **localizacao como Badge proprio** ("Transcrição -
   Pergunta N") abaixo — antes a localizacao sumia inline (`text-white/50 — local`).
   Evidencias agrupadas sob a competencia.

Coberto por `citacoes-render.test.tsx` (5/5, +2: "Citações" como heading via
getByRole + competencia/localizacao agrupadas e visiveis). entrevista 31/31, tsc 290
baseline. Re-teste visual do Fernando recomendado.
