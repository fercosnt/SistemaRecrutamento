---
created: 2026-06-27T01:44:50.225Z
title: Refinar UX do questionario Big Five (instrucao, afirmacao, Likert) (UX-BIGFIVE-01)
area: avaliacao
files:
  - src/features/avaliacao/components
---

## Problem

[ux / media] Pego no UAT-11 live 2026-06-26. O questionario Big Five (120 itens,
`/candidato/avaliacao/:id/bigfive`) tem 3 problemas de UX (feedback do Fernando):

1. **Tela de instrucao** ("Avaliacao comportamental") nao escaneavel — titulo +
   paragrafo denso + disclaimer no mesmo peso visual; o usuario nao le e pula direto.
2. **A afirmacao** (ex: "Me preocupo com as coisas.") tem pouco destaque; ~3 itens
   empilhados por tela → fadiga em 120 itens.
3. **Escala Likert** em grid 4+1 (4 opcoes numa linha + "Muito adequado" orfa
   full-width embaixo) quebra a percepcao de escala linear; labels longos
   ("Nem adequado, nem inadequado") forcam wrap e desalinham.

## Solution

TBD (so visual — o scoring server-side / re-pontuacao deterministica NAO muda):
1. Instrucao: linha de destaque "120 afirmacoes · ~15 min · sem certo/errado" +
   bullets escaneaveis + disclaimer LGPD em tom sutil (rodape/acordeao).
2. Afirmacao como estrela: fonte maior/mais peso + respiro + numeracao "12 / 120".
3. Likert horizontal de 5 pontos iguais; SO os extremos rotulados; gradiente de
   polaridade negativo→positivo; botoes mais compactos. Mobile empilha vertical;
   desktop horizontal (padrao IPIP/Big Five).
A11y: manter roving focus / aria-valuetext (ja era item Tier-B do UAT-16 C5).
Alinhar ao design system Beauty Smile (glass).

## Resolution (2026-06-27 — RESOLVED)

`BigFiveQuestionnaireScreen.tsx` redesenhado (frontend-only, scoring server-side
intacto): (1) **Intro** scaneavel — linha de destaque "120 afirmações · ~15 min · sem
resposta certa ou errada" + bullets com check + disclaimer LGPD num `<details>` sutil
(antes era paragrafo denso). (2) **Afirmacao como estrela** — numeracao "{n} / 120" +
fonte `text-lg`/`sm:text-xl` semibold + mais respiro (`space-y-6`/`pb-7`). (3) **Likert
horizontal de 5 pontos iguais** (`flex flex-1`, fim do grid 4+1 orfa) — celulas numeradas
1..5, SO os dois extremos rotulados embaixo (fim do wrap dos rotulos longos). A11y
preservada: cada ponto mantem o rotulo pt-BR COMPLETO em `aria-label` + `RadioGroup`
`aria-labelledby` na afirmacao (roving focus do Radix intacto). Mantido tint-free
(selecionado=glass-white, sem gradiente vermelho/verde) p/ nao implicar certo/errado
(RNF-07a) — desvio consciente do "gradiente de polaridade" sugerido. Coberto por
`BigFiveLikert.test.tsx` (4/4 — guarda o invariante a11y dos 5 nomes acessiveis).
