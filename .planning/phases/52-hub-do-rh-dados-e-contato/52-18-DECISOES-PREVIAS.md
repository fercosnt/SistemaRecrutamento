# 52-18 — decisões prévias do operador (antes do tracer e do review do bloco C)

Data: 2026-10-11. As duas perguntas deixadas em aberto pelo 52-16 (rodada de carry-forward) e pelo 52-17-SUMMARY.

1. LOCK TABLE `public.perguntas_opcao_sjt` IN ACCESS EXCLUSIVE MODE no topo da 0003, para fechar o resíduo de
   concorrência (um `pontuar_sjt` que leu as alternativas antes do commit grava ids que deixaram de existir)?
   **Resposta (verbatim): «Não — detectar (Recommended)»** — sem LOCK; a prova pós-apply «zero resposta SJT gravada
   no id velho (pelo mapa)» acusa o resíduo. Sem mudança no gerador.

2. Cliente depois de um `22023`: as alternativas ficam em cache (`staleTime: Infinity` em
   `SjtMultiplaEscolhaScreen.tsx`) e «Tente novamente» reenvia o id velho até recarregar a página.
   **Resposta (verbatim): «Item de UAT (Recommended)»** — fica como item de UAT/backlog; sem conserto nesta fase.

Nenhuma das duas substitui a decisão da Task 2 do 52-18 (aplicar/vetar a parte destrutiva, janela única), que o
operador dá depois do review do bloco C, com os números do ensaio.
