# 52-19 — Decisão do operador sobre o escopo da limpeza (bloco D)

Checkpoint `checkpoint:decision gate="blocking-human"` da Task 2 do `52-19-PLAN.md`, respondido pelo
operador (Fernando) em 2026-10-13, sobre a população medida em `52-19-POPULACAO.json`
(`medido_em` 2026-10-13T07:29:16.953Z, commit `b9644545`). Nada é apagado neste plano: o escopo
abaixo é a entrada do 52-20 (migration exata) e do 52-27 (export prévio); os NÚMEROS são aprovados
de novo no 52-21, com a medição de minutos antes do apply.

Formato: uma chave por linha, lida por máquina — pelo `<verify>` da Task 2, por
`scripts/p52_limpeza_portao.cjs medir … --decisao` (linhas `apagar_categorias:`, `manter_ids:`,
`possivel_real_<id8>:`), pelo 52-20, pelo 52-27 (`p52_export_limpeza.cjs --decisao-escopo`: destinos
`vaga_<id8>:`) e pelo 52-21 (`storage_via:`). Linhas de comentário nunca começam por uma chave.

## Escopo decidido

metodo: teardown_do_unico
ficticios: incluir
tombstones: remover
contas_sem_candidatura: remover
auth_orfaos: manter
padroes: PADROES_D30 + SEMENTE_P47 exportados por scripts/p52_limpeza_portao.cjs (blob 5c062270, commit 46ebc0a7) — 4 + 9 entradas, padroes_md5=fa46cb9ec5db7e7e5dbbb39df2af25e6 (o mesmo do 52-19-POPULACAO.json); nenhum padrão novo medido na UAT da 52 (a conta da UAT casa o +claudeN da D-30); a fonte única da lista é o script, não esta linha
apagar_categorias: ficticios, tombstones, contas_teste_com_candidatura, contas_sem_candidatura

Leitura das categorias (tradução das respostas (2)–(5) em categorias MEDIDAS do `52-19-POPULACAO.json`):
`ficticios` (6) ← item (2); `tombstones` (2: `317ff71a`, `37614985`) ← item (3);
`contas_teste_com_candidatura` (14, inclui `eb718a32` e a conta `5a2e3f17` da obrigatória `3a9254c3`)
← itens (5) e entrada (i)/(ii); `contas_sem_candidatura` (16, inclui `fa181f41`) ← itens (4) e (5).
FORA de `apagar_categorias`, por desenho ou por decisão: `trava_rh_excluidos` (nunca apagável — a
conta `d8ef9db1` e suas 3 candidaturas ficam intactas), `fixtures_p46` (item 7), `fora_da_populacao`
(nunca apagável; medida 0), `auth_orfaos_sem_padrao` (item 4: manter os 3) e `auth_orfaos_padrao_teste`
(medida 0; nada a apagar).

Possível dado real — uma decisão por item (o recorte `manter` só RETIRA de `apagaveis`, nunca acrescenta):

possivel_real_4dc31256: apagar
possivel_real_eb718a32: apagar
possivel_real_d5491f18: apagar
possivel_real_f8318f39: apagar
possivel_real_fa181f41: apagar
possivel_real_2a71d384: manter
possivel_real_95d4b83c: manter
possivel_real_e41b0bd5: manter

Os três `manter` são os `auth.users` órfãos sem padrão de teste; a categoria deles
(`auth_orfaos_sem_padrao`) já está fora de `apagar_categorias`, então o recorte não muda nada em
`apagaveis` — fica escrito para que nenhuma releitura os puxe. Não é preciso `manter_ids:`: nenhuma
entrada das quatro categorias apagadas é mantida.

Vagas de teste — um destino por vaga medida (9). Nenhuma vaga é `remover`:

vaga_53b73af6: deleted_at
vaga_53f75c81: deleted_at
vaga_629a5f31: deleted_at
vaga_a32fe930: deleted_at
vaga_bc370a8b: deleted_at
vaga_e36e9929: deleted_at
vaga_f7655d91: deleted_at
vaga_fb362e28: deleted_at
vaga_cb413d5d: manter

Nota sobre `cb413d5d`: já tem `deleted_at` (2025-11-23) e nenhuma candidatura; «manter» = nada muda
nela. As duas colisões (`53b73af6`, `53f75c81`) recebem só `deleted_at`: as candidaturas da conta da
trava `d8ef9db1` nelas ficam intactas, e nenhuma vaga é removida (remoção atravessaria a trava por
CASCADE). A `629a5f31` recebe `deleted_at` depois de limpar a candidatura da população (`d31c78bb`).

fixtures_p46: teardown_proprio
storage_via: script_local
decidido_em: 2026-10-13

## Extras (não lidos pelo `<verify>`; lidos pelo 52-20/52-21)

vagas_ativas_fdbe1a4a_e897f709: manter_vagas_limpar_candidaturas
vaga_9f6ccf1a: fora_do_bloco_d
backlog_fecho_m8: auth.users orfaos 2a71d384, 95d4b83c, e41b0bd5 (manter agora; decidir no fecho do M8) · deleted_at na vaga 9f6ccf1a (segue arquivada) · teardown proprio das fixtures fixture-p46-*

- `fdbe1a4a` (Consultor) e `e897f709` (Social Media): o operador mantém as duas vagas (reaproveitar) e
  limpa só as candidaturas da população nelas (10 e 13 candidaturas medidas, todas na população). Se
  elas não forem abrir, o operador pausa pela interface depois do 52-21 — nada disso entra na migration.
- `9f6ccf1a` (arquivada, fora do padrão de teste): não entra no bloco D.

## Resposta do operador

Verbatim (Fernando, 2026-10-13):

```
(1) método: teardown_do_unico — aprovo.
(2) fictícios (6): incluir.
(3) tombstones: remover os dois. 37614985 é a conta descartável +claude7 do 49-19 (49-18-SUMMARY.md:331; 49-PROVA-PROD.md:772), candidatura dae837f4 rejeitada na e897f709 — teste.
(4) contas sem candidatura: remover as 16; os 3 auth.users órfãos (2a71d384, 95d4b83c, e41b0bd5): manter (backlog do fecho do M8).
(5) possível dado real: eb718a32 + 4dc31256: apagar (conta interna paulista@ usada em teste, única candidatura em vaga [TESTE]); d5491f18, f8318f39: apagar (sementes @teste.com uids cccccccc/dddddddd); fa181f41: apagar (uat-form-001); 2a71d384, 95d4b83c, e41b0bd5: manter.
(6) vagas de teste: conforme a proposta da tabela — deleted_at nas 8 sem deleted_at, inclusive as colisões 53f75c81 e 53b73af6 (as candidaturas da conta da trava d8ef9db1 ficam intactas; nenhuma vaga removida); cb413d5d já tem.
(7) fixtures fixture-p46-*: teardown próprio no fecho do M8.
(8) Storage: script_local.
Extras: fdbe1a4a e e897f709 —er as vagas, limpar só as candidaturas; se não forem abrir, o operador pausa pela interface depois do 52-21). 9f6ccf1a — não entra no bloco D (segue arquivada; backlog: deleted_at no fecho do M8).
```

nota_orquestrador: na linha «Extras», a palavra truncada «—er as vagas» foi lida pelo orquestrador como «manter as vagas» (reaproveitar), coerente com «limpar só as candidaturas» e com «o operador pausa pela interface depois do 52-21». É a interpretação do orquestrador, não texto do operador; o bloco verbatim acima não foi alterado.

Fontes citadas pelo operador para o tombstone `37614985`: `49-18-SUMMARY.md:331` e `49-PROVA-PROD.md:772`.
