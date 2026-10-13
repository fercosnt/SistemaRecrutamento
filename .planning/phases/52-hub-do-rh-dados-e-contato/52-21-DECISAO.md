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
storage_n_aprovado: 24
storage_md5_aprovado: d6d79e3e7d985c226511a7c8232b90fe
export_dir: /Users/fernando/p52-export-limpeza/20261013T121303Z
export_md5_aprovado: 0ea5ffb9dae8af4d0a82550dcf9e66fc
export_em_aprovado: 2026-10-13T12:13:05.149Z
export_escopo: aceito
comando_md5_aprovado: 605e80b8df248f6b6b1d19d6cec83c3d
janela_unica: confirmada
aprovado_em: 2026-10-13 09:50 -03
review: 52-REVIEW-LIMPEZA-1.md (bb6b1671, changes_required) → conserto 115f5c27..4e0f5acd → 52-REVIEW-LIMPEZA-2.md (cae17d6c, approved, reviewed_head 4e0f5acd)
historico_acoes_f8318f39: aprovado (8 linhas, trigger desligado/religado na transacao; no export)
wr05_wr07: pendencias nomeadas no 52-22
export_retencao: apagado pelo operador apos a prova pos-limpeza do 52-22
janela_apply: 2026-10-14 ~03:28-12:00 BRT, apos o backup diario posterior ao export
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
