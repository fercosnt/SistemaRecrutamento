# 52-21 — Decisão do operador (Task 2: porta de mão única da limpeza)

Uma chave por linha. Valores lidos dos artefatos commitados (`52-21-POPULACAO.json`, `52-21-STORAGE.json`,
`52-21-EXPORT.md`) e do `md5 -q` de `52-21-COMANDO-APPLY.sh` no momento do registro. Só ids por contagem e md5 —
nenhum e-mail, nome, CPF ou nome de arquivo de currículo.

decisao: apagar
populacao_md5_aprovado: 1b4b21a93ff00a9d01f7d10926dd1f54
aprovado_ficticios: 6
aprovado_tombstones: 2
aprovado_contas_teste_com_candidatura: 14
aprovado_contas_sem_candidatura: 16
storage_n_aprovado: 27
storage_md5_aprovado: d80d26f2089d7b21c82f14c04f9e3982
export_dir: /Users/fernando/p52-export-limpeza/20261015T005904Z
export_md5_aprovado: 63b60ef789fea8a632a86402b4e96b1b
export_em_aprovado: 2026-10-15T00:59:04.871Z
export_escopo: aceito
comando_md5_aprovado: 605e80b8df248f6b6b1d19d6cec83c3d
janela_unica: confirmada
aprovado_em: 2026-10-15 09:37 -03
review: 52-REVIEW-LIMPEZA-1.md (bb6b1671, changes_required) → conserto 115f5c27..4e0f5acd → 52-REVIEW-LIMPEZA-2.md (cae17d6c, approved, reviewed_head 4e0f5acd)
historico_acoes_f8318f39: aprovado (8 linhas, trigger desligado/religado na transacao; no export)
wr05_wr07: pendencias nomeadas no 52-22
export_retencao: apagado pelo operador apos a prova pos-limpeza do 52-22
janela_apply: 2026-10-15 ate 12:00 BRT, apos o backup diario 2026-10-15T06:26:10Z posterior ao export novo
reaprovacao: 2026-10-15 09:37 -03 — storage 27/d80d26f2, export 63b60ef7 de 2026-10-15T00:59:04.871Z (o export de 13/10, 0ea5ffb9, foi recusado por --conferir --vivo e superado); populacao_md5, as quatro contagens e comando_md5_aprovado inalterados
nota_orquestrador: a resposta foi dada as 12:50Z (09:50 -03) de 2026-10-13, no checkpoint da Task 2, ANTES do conserto 115f5c27..4e0f5acd; registrada agora, depois do 52-REVIEW-LIMPEZA-2 verde (cae17d6c, critical 0, approved), conforme a instrucao (2) do proprio operador

Conferências feitas no registro: `comando_md5_aprovado` = `md5 -q` do arquivo em disco = `git show 4e0f5acd:<comando> | md5 -q`
(o `reviewed_head` do 52-REVIEW-LIMPEZA-2 — WR-04); as quatro chaves `aprovado_<k>` = as chaves de `apagaveis` e as
contagens = o comprimento de cada lista.

## Resposta do operador

Operador (Fernando), 2026-10-13 ~12:50Z (09:50 -03), no checkpoint da Task 2, antes do conserto, com a instrução explícita
de registrar só depois do 52-REVIEW-LIMPEZA-2 verde. Verbatim:

```
(1) Escopo do conserto: WR-01 + WR-02 + WR-04 + WR-06 + WR-03 mínimo (a migration recusa, antes de qualquer DELETE, se o md5 canônico do alvo que ela calcula ≠ populacao_md5 aprovado 1b4b21a9…). Depois o 52-REVIEW-LIMPEZA-2 e só então o pin.
(2) Task 2: apagar — autorizo já; gravar no 52-21-DECISAO.md só depois do LIMPEZA-2 verde, como o portão exige.
(3) export_escopo: aceito (sem sessões/refresh/MFA/one-time tokens; colunas token em branco; encrypted_password guardado). O export em ~/p52-export-limpeza/ é apagado pelo operador depois da prova pós-limpeza do 52-22.
(4) Aprovo a perda das 8 linhas de historico_acoes da candidatura f8318f39 (no export), com o trigger desligado/religado só dentro da transação.
(5) WR-05 e WR-07: pendências nomeadas no 52-22.
Calendário: Task 3 amanhã, 2026-10-14, na janela após o backup diário. Vagas reais podem ser criadas e ATIVADAS hoje (não casam padrão de teste nem são vagas_teste); o operador não faz login nem abre o hub de nenhuma das 30 contas da população até o apply.
```

## Re-aprovação do operador (2026-10-15)

Depois da re-medição da noite de 2026-10-14 (a conta `+cand1`, já na população, criou 3 candidaturas com 3
currículos; o primeiro candidato real, `920ac182`/`3590d2a5`, caiu em `fora_da_populacao`), do export novo
(`63b60ef7…`, `20261015T005904Z`) e das conferências do disparo das 04:07 BRT (backup 2026-10-15T06:26:10Z,
`EXPORT CONFERIDO vivo=igual`, `POPULACAO DE AGORA = APROVADA`, Storage dry-run 27/d80d26f2, árvore limpa) e da
segunda opinião da verificadora (04:23 BRT, verde). Verbatim do operador (Fernando), 2026-10-15 09:37 -03 — as linhas
estão recuadas só para que nenhuma seja lida como chave deste arquivo:

```
    pode aplicar.
    Re-aprovo no 52-21-DECISAO.md:
    storage_n_aprovado: 27
    storage_md5_aprovado: d80d26f2089d7b21c82f14c04f9e3982
    export_dir: /Users/fernando/p52-export-limpeza/20261015T005904Z
    export_md5_aprovado: 63b60ef789fea8a632a86402b4e96b1b
    export_em_aprovado: 2026-10-15T00:59:04.871Z
    aprovado_em: 2026-10-15 09:37 -03
    janela_apply: 2026-10-15 até 12:00 BRT
    populacao_md5_aprovado, as quatro contagens e comando_md5_aprovado (605e80b8) inalterados.
    Segunda opinião da verificadora (04:23 BRT): VERDE, idêntica às conferências deste checkpoint. Commits da janela de vagas AUTORIZADOS no push do 52-22 (não são alheios): 8a7a5dba, b97fb917, 9b76244b, 1581cf9a, a28a2522. A EF avaliar-redacao v25 (publicada pela verificadora em 14/10 21:37 a partir de b97fb917) está defasada do catálogo SDR (9b76244b): republicar a partir do git depois do push, com marcador conferido. A janela de vagas está parada até o fim do 52-22.
```
