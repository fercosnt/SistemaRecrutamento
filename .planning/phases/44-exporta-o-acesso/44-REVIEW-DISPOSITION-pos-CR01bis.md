---
phase: 44-exporta-o-acesso
review: 44-REVIEW-pos-CR01bis.md
reviewed: 2026-10-07T12:53:34Z
diff: dedca1fb..09168e228ac413087f185e93dcd0911a4a21cba0
counts: {critical: 0, warning: 6, info: 4}
---

# Disposição dos achados — revisão independente pós-CR-01-bis (44-21)

Revisão adversarial independente do 44-21 (`44-REVIEW-pos-CR01bis.md`, 2026-10-07T12:53:34Z) sobre o diff `dedca1fb..09168e228ac413087f185e93dcd0911a4a21cba0` (44-17..44-20, fora de `.planning/`). A disposição de cada achado vem da resposta do operador ao checkpoint:decision do 44-22 (Task 2), registrada verbatim no `44-22-SUMMARY.md`: «publicar», sem disposição para nenhum achado. Por isso todos ficam com o padrão do plano, `open`. Nenhum foi consertado nesta rodada (o 44-22 não conserta achado da revisão; o conserto seria nova rodada `--gaps`, revisada de novo).

A disposição da revisão anterior (pós-CR-01) continua em `44-REVIEW-DISPOSITION.md`.

Uma linha por cabeçalho `### (CR|WR|IN)-NN:` do `44-REVIEW-pos-CR01bis.md`, na ordem do arquivo; a coluna «Achado» é o texto do cabeçalho, com `|` trocado por `/` (só no WR-04: «entra/entram»).

| ID | Severidade | Achado | Disposição |
|---|---|---|---|
| WR-01 | warning | `fronteiraDaCopia` falha fechada por STRING de versão, mas a versão não identifica o conteúdo da lista — a 1.1.0 teve 4 conteúdos e a 1.2.0 teve 2 | open |
| WR-02 | warning | no ramo «versão ausente/vazia» que o (cr6) desenhou, o rodapé do `.html` imprime `undefined`/`null`/vazio cru, o `.json` perde a chave, e a neutra afirma uma causa que nesse ramo não é medida (classifica o item do 44-20 em `deferred-items.md`) | open |
| WR-03 | warning | o smoke de drift ainda se cala por um segundo `set_config` que forja `smoke44.r` entre o cálculo e o `DO $gate$` — `exportAllowlist.test.ts` inteiro segue 40/40 verde (provado) | open |
| WR-04 | warning | o (cr4) prende «as datas» a um subconjunto de colunas escolhido à mão, e só deriva parênteses da forma «(… entra/entram)» | open |
| WR-05 | warning | o (cr5) reconhece vínculo ao titular só por NOME de coluna igual a um `chave_titular` — tabela por titular ligada por outra chave (ex.: `agendamento_id`, `analise_id`) fica fora da classe | open |
| WR-06 | warning | o 44-20-SUMMARY afirma que «o `.html` e o `.json` deixam de carregar a fronteira de uma versão com o carimbo de outra», mas a revisão mostra uma rota em que carregam (mesma string de versão, conteúdo diferente) | open |
| IN-01 | info | `vitest run … -t "<padrão>"` que não casa nenhum teste sai 0 («N skipped»), e `-t "(cr4)"` é regex que casa também «(cr4b)» | open |
| IN-02 | info | o (cp3) diz «não está em arquivo nenhum de onde ele pode chegar ao titular», mas não lê `supabase/migrations/*.sql` (nem `.js`/`.md`/`.svg`) | open |
| IN-03 | info | o bloco `colunas_fora_do_escopo` (2026-10-07) mostra colunas em PROD que o `colunas` versionado não tem para as mesmas tabelas | open |
| IN-04 | info | «o roteiro que a equipe monta» — o roteiro é gerado pela EF `gerar-guia-entrevista` a pedido do RH e editável pelo RH; «monta» é aproximação aprovada pelo operador (BD-18) | open |
