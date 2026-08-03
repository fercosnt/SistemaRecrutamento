---
id: 43-smokes-com-baseline-congelada-viram-red
created: 2026-08-02
source: Phase 43 code review (WR-02), confirmado pelo smoke do caminho feliz no 43-07
priority: medium
resolves_phase: 44
tags: [testes, smoke, gate, falso-positivo, m8-consent]
---

# Os smokes da Phase 43 viram RED no PRIMEIRO cadastro real — e acusam a coisa errada

**Achado:** code review da Phase 43, finding WR-02. **Confirmado ao vivo** no
checkpoint 43-07: o smoke do caminho feliz criou um candidato real e, enquanto a
fixture existia, as assercoes (b) e (f) de `p43_consent_prova_smoke.sql` estavam
reprovando. Elas so voltaram ao verde porque a fixture foi removida.

## O defeito

`supabase/tests/p43_consent_prova_smoke.sql` congela o estado do banco em duas
assercoes:

- **(b)** exige **ZERO** linhas com `consent_text_version`/`consent_text_hash`/
  `consent_registrado_em` nao-nulos;
- **(f)** exige **exatamente 17** linhas em `public.autorizacoes`
  (via `smoke43c.esperado_linhas`).

As duas eram corretas no instante do apply. **O primeiro cadastro real de producao
inverte as duas** — porque a EF v16 agora grava a prova, que e precisamente o que a
fase entregou.

E a mensagem de erro acusa o oposto do que aconteceu:

> `P43C FAIL (b): (…) o apply BACK-FILLOU prova de consentimento`

Um back-fill nao ocorreu. Ocorreu um cadastro. O gate reprova o comportamento
CORRETO e nomeia como culpado um defeito que nao existe.

## Por que isso importa mais do que parece

E exatamente a armadilha que a propria Phase 43 catalogou **duas vezes** e evitou
nos dois casos:

1. o `grep` de `if not exists` que reprovaria a documentacao que ele existe para
   preservar (cabecalho da `20260801000001`);
2. a assercao (g) do 43-06, que lida ao pe da letra reprovaria `updated_at` e
   `deleted_at` — corrigida para fronteira de palavra.

A licao esta escrita nos dois lugares: *"um teste que reprova o comportamento
correto e pior que teste nenhum: ele treina quem executa a desliga-lo."* Estes dois
smokes sao a terceira instancia, e a unica que ficou de pe.

## O que fazer

O eixo honesto nao e "quantas linhas existem" — e **"quantas linhas PRE-ENFORCEMENT
mudaram"**. Reescrever as duas assercoes em torno de um marco temporal:

- **(b)** deve exigir zero linhas com prova **entre as criadas ANTES do apply**
  (`created_at < '2026-08-02T14:00:19Z'`, o carimbo do apply de `20260801000001`,
  registrado no `43-07-SUMMARY.md`). Linha nova COM prova e o sucesso da fase, nao
  a falha dela.
- **(f)** deve exigir que a contagem de linhas pre-apply seja **>= 17** e que
  nenhuma delas tenha sumido, em vez de fixar o total em 17. Aditivo passa;
  desaparecimento reprova.

A propriedade que se quer preservar e **"nada historico foi tocado"**, e ela e
expressavel sem congelar o presente.

⚠ **Nao relaxar para "sempre passa".** A tentacao obvia — trocar `<> 0` por um
aviso — devolveria um gate decorativo, que e pior do que o falso positivo.

## Escopo

Vale tambem para `p43_matriz_retencao_smoke.sql` assercao (c), que exige `origem =
'seed'` em 8/8 — ela reprova de proposito assim que um administrador editar uma
janela pela tela, e o cabecalho ja diz isso em voz alta. Aquela e uma escolha
DELIBERADA e documentada; estas duas nao sao.
