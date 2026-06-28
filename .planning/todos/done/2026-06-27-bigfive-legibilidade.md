---
created: 2026-06-27
title: Legibilidade do questionario Big Five (UX-BIGFIVE-02 — follow-up do 01)
area: avaliacao
severity: alta
files:
  - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
---

## Problem

[ux / alta] Follow-up do UX-BIGFIVE-01 (PARCIAL no re-teste visual 2026-06-27). A
escala virou horizontal de 5 pontos e a afirmacao ganhou destaque (bom), mas a
legibilidade ainda esta ruim. Confirmado por print:

1. **CONTRASTE (WCAG AA):** textos em turquesa claro (`text-[#35BFAD]`) sobre o glass
   claro tem contraste ruim — a linha-ancora de destaque ("120 afirmacoes · ~15 min · …"),
   os rotulos da escala e os numeros 1–5 (`text-white/60..70`). Escurecer o glass e/ou
   aumentar o contraste do texto ate passar WCAG AA (≥4.5:1 texto normal, ≥3:1 grande).
2. **INSTRUCAO escondida:** o disclaimer foi para um acordeao colapsado ("Sobre os
   resultados", `<details>`). Nao faz sentido esconder — deixar VISIVEL (sem dropdown).
3. **INSTRUCAO rasa:** os 3 bullets sao curtos demais. Detalhar mais o teste e,
   principalmente, **a ESCALA** — o que cada um dos 5 niveis significa.
4. **ESCALA so com extremos rotulados:** so "Muito inadequado" / "Muito adequado" tem
   rotulo; os pontos 2/3/4 so tem numero. Adicionar um rotulo curto em CADA ponto OU
   explicar os 5 niveis (nas instrucoes / no topo de cada pagina). O grid 4+1 ja foi
   corrigido (agora 5 horizontais) — NAO reverter isso.

Reproduzir: `/candidato/avaliacao/:id/bigfive` (intro + qualquer pagina de itens).

## Solution

TBD — direcao:
- Trocar o turquesa por branco/alto-contraste OU escurecer o painel glass nesta tela
  (validar com axe/contrast checker, mirar AA). Reaproveitar tokens do design system.
- Disclaimer + explicacao da escala VISIVEIS (sem `<details>`), provavelmente um bloco
  fixo na intro + uma legenda compacta dos 5 niveis no topo de cada pagina de itens.
- Decidir: rotulo curto por ponto (1 Muito inadequado · 2 Inadequado · 3 Neutro ·
  4 Adequado · 5 Muito adequado) vs legenda unica no topo. Manter aria-label completo
  (a11y ja garantida pelo 01) e os 5 pontos horizontais.
NAO mexer no scoring server-side (so apresentacao). Manter [[feedback_*]] de a11y.

## Resolution (2026-06-27 — RESOLVED)

Frontend-only (scoring server-side intacto):
1. **CONTRASTE:** painel da tela (intro + paginas de itens) escurecido para glass
   azul-marca `bg-[#00109E]/85` (`PANEL_DARK`, overrida o `bg-white/15` via twMerge) —
   superficie consistentemente escura. Texto branco/turquesa agora passam WCAG AA
   independente do gradiente. Verificado por calculo de razao (pior caso = painel sobre
   o ponto mais claro do gradiente): turquesa #35BFAD **4.97:1**, brancos 6.2–10.3:1,
   afirmacao 11.3:1, legenda 10–11:1 — todos ≥ AA. Alphas baixos subidos
   (white/50→/70, /60→/80, numero /70→/90).
2. **DISCLAIMER visivel:** removido o `<details>` colapsado — agora um bloco fixo,
   sempre visivel, legivel (white/85).
3. **INSTRUCOES + ESCALA:** intro reescrita (`BigFiveIntro`) com 3 bullets mais
   detalhados + `EscalaLegenda` explicando os 5 niveis (1..5 → rotulo pt-BR canonico),
   VISIVEL na intro (full) e repetida compacta no topo de cada pagina de itens.
4. **5 niveis:** o grid 4+1 ja tinha virado 5 horizontais no 01; agora cada nivel tem
   significado explicito via `EscalaLegenda` (intro + topo de pagina). Pontos 2/3/4 nao
   ficam mais so com numero. Rotulo por celula NAO foi usado (rotulos longos quebravam —
   o problema original); a legenda resolve o significado sem wrap.

A11y preservada (aria-label completo por ponto + aria-labelledby — guarda do
`BigFiveLikert.test.tsx` segue verde). Novos testes: `BigFiveIntro.test.tsx` (4/4 —
disclaimer sem `<details>`, EscalaLegenda com os 5 niveis, CTA). avaliacao 57/57,
tsc 290 baseline. Componentes `BigFiveIntro`/`EscalaLegenda` exportados p/ teste.

## Refinamento visual (2026-06-27, feedback do Fernando)

A 1ª tentativa de contraste (`bg-[#00109E]/85`, quase opaco + azul saturado) leu bem
mas ficou com cara de "sistema antigo" — painel chapado, perdeu o glassmorphism.
Ajustado p/ GLASS de verdade mantendo a leitura: `PANEL_DARK = bg-black/45` — tint
PRETO translucido (menos transparente + mais escuro que o white/15 original, mas ainda
glass: mantem o blur e deixa o gradiente vibrante aparecer borrado por tras); backdrop
vibrante INALTERADO (overlay 15). Pior caso (card sobre o ponto mais claro do gradiente)
ainda passa WCAG AA: branco 100% 8.1:1 · brancos 70–95% 4.9–7.5:1 — todos ≥ 4.5. O
acento turquesa trocado de `#35BFAD` (falhava como texto, 3.5:1) p/ `#6EE6D6` (mais
claro, 5.4:1) nos 3 usos (linha de destaque, icones, "Salvo automaticamente"). Visual
moderno restaurado + leitura mantida. **Re-teste visual do Fernando recomendado.**
