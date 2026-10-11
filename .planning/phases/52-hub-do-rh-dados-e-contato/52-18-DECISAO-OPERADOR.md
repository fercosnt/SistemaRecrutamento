# 52-18 — decisão do operador no portão do bloco C (Task 2)

Data: 2026-10-11. Revisão: `52-REVIEW-BANCO-1.md` (commit fc22cb98, reviewed_head 83dbe5d0) — 0 critical, 5 warning,
6 info. Portão conferido pelo orquestrador: `PORTAO OK: revisao=…52-REVIEW-BANCO-1.md
reviewed_head=83dbe5d00c264687b6b4eab96d3bac2c1e103dd3 pin=- modo=revisao` (rc=0).
Medido pelo orquestrador (só leitura, sem dado pessoal): candidatura `3a9254c3-8086-42df-8d81-42889c3a1f8d`, criada
2026-10-09, etapa `avaliacao_assincrona`, vaga «Consultor(a) de Relacionamento e Pré-vendas» (ativa), 0 scores.

## Respostas (verbatim)

- Quem é a 3a9254c3: **«É conta de teste minha»**
- Bloco C: **«aplicar»** — com o token da Passo 0b
  `;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083` (o apply PARA se
  mudar), comparação por máquina, e a checagem de forma do WR-01 (só leitura) depois do apply, registrada no SUMMARY.
- Janela única: **«Confirmo»** — nenhuma outra janela publica até o fim do 52-18.
- WR-04 / WR-05:

«Backlog, com uma condição: o WR-04 é explorável. A checagem de duplicata compara pergunta_id como TEXTO, então um
payload montado à mão com 5 ids + 1 repetido em maiúsculas soma 6 distintos, passa no «v_answered = v_expected» e conta
a pergunta repetida duas vezes no lugar da omitida. Registrar como «consertar ANTES de abrir para candidatos reais»,
numa migration própria depois do bloco C (comparar como uuid: count(DISTINCT (r->>'pergunta_id')::uuid)), sem mexer no
0003. WR-05 vai para o backlog comum.Sobre a WR-03: a 3a9254c3 é da conta +claude6 (teste, aceite do 51-17). O review
não a reconheceu como teste, então os padrões que ele usou não incluem +claudeN. A varredura do 52-19 tem que usar a
lista da D-30 (+claudeN, +cand1, @teste.com, @invalido.local) MAIS a entrada por vaga de teste, e a 3a9254c3 tem que
aparecer na população. Registre isso como verificação do 52-19.»

## Itens que esta decisão cria

1. **WR-04 — BLOQUEIA a abertura para candidatos reais.** Migration própria, DEPOIS do bloco C, sem tocar a 0003:
   `pontuar_sjt` compara `pergunta_id` como uuid (`count(DISTINCT (r->>'pergunta_id')::uuid)`), recusando o payload com
   pergunta repetida em caixa diferente. Dono: a definir pelo orquestrador/planejador antes do fecho da Phase 52.
2. **WR-05 — backlog comum:** `supabase/tests/p49_12_pos_estado.sql:126,135` (`text[] || 'literal'` → 22P02).
3. **Verificação do 52-19:** a varredura da população de teste usa a lista da D-30 (`+claudeN`, `+cand1`, `@teste.com`,
   `@invalido.local`) MAIS a entrada por vaga de teste; a candidatura `3a9254c3` (conta +claude6, aceite do 51-17) TEM
   que aparecer na população medida.
