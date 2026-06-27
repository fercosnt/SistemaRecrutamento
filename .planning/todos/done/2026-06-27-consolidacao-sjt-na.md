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

## Resolution (2026-06-27 — RESOLVED, cause #1; cause #2 = wontfix por decisao)

Cause #1 (o bug): `consolidar-decisao-final` colapsava as DUAS sub-rows de SJT
(subtipo `mc` + `caso_aberto`) numa so por `tipo` (`scoreByTipo.get('sjt')`,
first-occurrence). Quando o `caso_aberto` `pendente_humano` ganhava, a etapa SJT
INTEIRA virava N/A, descartando o `mc` sucesso 10/12. Fix: `normalizeSjtComposite`
agrega as sub-rows `status='sucesso'` (Σscore/Σscore_max·100), NUNCA pondera um
score de IA nao confirmado (RNF-07a), e um `caso_aberto` pendente_humano NAO zera a
etapa. Coberto por 2 testes Deno novos (9/9). EF redeployada em PROD via
`supabase functions deploy` (v2). Verificado live para a1dd4c42 (replica SQL da
agregacao): SJT 83.33/100, **consolidado 0 → 55.56**, triagem 0/100.

Cause #2 (triagem score 0): DECISAO DO USUARIO 2026-06-27 = manter como `present 0`.
A `analise_candidato_vaga` tem `score_match=0` com `status='sucesso'` E `resumo_cv`
preenchido — a triagem por IA rodou de verdade e pontuou 0 (nao e placeholder vazio).
Tratar 0 como N/A esconderia triagens legitimamente baixas em producao; o CV quase
vazio do seed e um artefato de dado, nao bug de agregacao. Sem mudanca na logica.
