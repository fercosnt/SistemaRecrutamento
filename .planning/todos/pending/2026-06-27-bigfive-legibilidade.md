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
