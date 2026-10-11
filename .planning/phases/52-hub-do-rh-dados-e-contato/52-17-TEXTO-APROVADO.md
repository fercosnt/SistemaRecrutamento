decisao: aprovar
texto_md5_aprovado: 03b2a0d5d96774bbb73b06b7c693bbe5
tabela_md5_aprovado: 1d441390e9951839d2249966947addc2
criterio: proposto
caso_aberto_marketing: ficam
retirada: status_retired
ordem_c_d: c_antes_da_uat
rascunho: descartado_pelo_operador
rascunho_md5: 5816ac72d78542f470fcf7c39dea954f
aprovado_em: 2026-10-11 15:13 -0300
registrado_em: 2026-10-11 15:15 -0300
nota_hora: o canal não registrou a hora da resposta do operador; `aprovado_em` é a hora do commit `4f0ac16b`, em que o orquestrador gravou a resposta verbatim da rodada 2. `registrado_em` é a hora em que este arquivo foi escrito
canal: /gsd-execute-phase 52, checkpoint da Task 2 do 52-17 (checkpoint:decision, gate blocking-human), duas rodadas
opcao: aprovar + polir (rodada 2), depois de «mudar» (rodada 1)
texto_md5_mostrado_ao_operador: 539bc858464ff0b768b12e96ea7492ef
texto_commit_aprovado: c66c6222
sql_md5_gerado: 18141c60e27c7d6c8bea2ebc1267dc57

# 52-17 — texto do banco SJT v2 (bloco C) aprovado pelo operador

Este arquivo não é relatório. É a entrada que o gerador lê por máquina: a Task 3 do 52-17 e o 52-18 conferem
`md5(docs/specs/BANCO-SJT-V2.md)` contra `texto_md5_aprovado`, e o 52-18 confere a tabela de caracteres lida de PROD
contra `tabela_md5_aprovado`. As chaves acima são uma por linha, sem quebra dentro do valor.

## O md5 aprovado é o do texto DEPOIS do polimento

O operador viu o texto `539bc858464ff0b768b12e96ea7492ef` (commit `4b84b815`; tabela `bc32d39834a3a5fbf55bf48b3c24cc4d`,
SQL `158bcb4911a540343854620c0e2dcf9f`, ensaio `52b=14/14`) e, junto com ele, a redação exata dos dois polimentos. Ele
escolheu «aprovar + polir». Os dois polimentos foram aplicados palavra por palavra no commit `c66c6222`, e nada mais
mudou no texto:

- `sdr-social-seller` MC5, `fortemente_pontua`: «deixa recado, deixa a lista de espera de sobreaviso» →
  «manda recado, deixa a lista de espera de sobreaviso»;
- `videomaker-storymaker` MC5, `neutro`: «começa a sessão atrasado» → «começa a sessão com atraso».

Por isso `texto_md5_aprovado` é `03b2a0d5d96774bbb73b06b7c693bbe5`, o md5 depois do polimento, e não o `539bc858…`
que o operador viu. A aprovação foi condicionada a uma rodada automática que só voltaria ao operador se uma
verificação falhasse. Nenhuma falhou (abaixo).

## Rodada automática depois do polimento (2026-10-11, HEAD `c66c6222`)

| Verificação | Resultado |
|---|---|
| `tabela-comprimento-sjt.py --criterio proposto` | exit 0, `CRITERIO PROPOSTO: ok — todos os itens e cargos cumprem` |
| Por cargo, a certa é estritamente a mais longa | `sdr-social-seller` 2 de 6 (MC2, MC5; no limite de 2) · `social-media` 1 de 6 · `videomaker-storymaker` 0 de 6 · `editor-video` 0 de 6 |
| Razão máxima por cargo | 1.04 · 1.07 · 1.02 · 1.03 |
| `tabela_md5` | `1d441390e9951839d2249966947addc2` (script) = o `tabela_md5` que o POS mediu por `char_length` em PROD no ensaio |
| `--auto-teste` | `AUTO-TESTE OK` |
| LGPD-04 (regex `FORBIDDEN` lido do próprio guarda) | `LGPD-04 limpo: 2 arquivo(s), 7 termos do guarda` (texto e SQL) |
| Gerador determinístico | duas gerações byte a byte iguais, md5 `18141c60e27c7d6c8bea2ebc1267dc57` (99499 octetos) |
| `test_gen_sjt_v2.py` | `Ran 28 tests … OK` |
| Ensaio que aborta, sobre o estado vivo de PROD | `ENSAIO VERDE … smokes=[52b=14/14]`, quatro cargos `=6+1`, `retirados=19`, `mantidos=3`, `remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32`, `pontuar_sjt=66fe507fbf5bf6a98bd7e5eecd84f310` |

O que os polimentos mudaram na tabela (medido sobre o texto de `4b84b815`, md5 `539bc858…`, e sobre o de `c66c6222`):
- `sdr-social-seller` MC5: nada. «deixa» e «manda» têm o mesmo número de caracteres; a linha segue
  `104 | 99 | 103 | 102`, razão 1.03, posto 1.
- `videomaker-storymaker` MC5: o neutro passou de 102 para 104 caracteres; razão 1.02 (igual), amplitude 5% → 7%,
  posto 2 (igual).
- Os dois itens seguem `ok`, e o resumo por cargo é o mesmo de antes. Só o `tabela_md5` muda:
  `bc32d398…` → `1d441390…`.

## Resposta do operador

Verbatim, copiada de `52-17-PEDIDO-MUDANCA-1.md` (commits `ff008f81` e `4f0ac16b`).

### Rodada 1 (2026-10-11): «mudar»

Texto apresentado: `5870e7bf5cd5c5423fb38eb1b94f8858`, tabela `d3d955d58c4808d2822aabaa290aa830`, ensaio `52b=14/14`.

Resposta ao texto:

> «1. social-media MC3: pontua e neutro não podem publicar a imagem da paciente sem o termo (dado sensível, LGPD;
> autorização exigida pelo CFO). Reescrever as duas como erros de julgamento que NÃO violam a regra (ex.: segura a
> publicação mas não avisa o Dr. do motivo; segura e propõe outro conteúdo sem resolver o termo). Mesma revisão no
> videomaker-storymaker MC3: gravar o áudio do paciente sem ele saber não pode valer 2.2. social-media MC6, atencao:
> «Corrige você mesma» → «Corrige por conta própria» (sem gênero).3. sdr-social-seller MC4: a regra da clínica sobre
> preço no WhatsApp é: <a Beauty Smile PASSA faixa de preço / NÃO passa valor por WhatsApp>. Ajustar o gabarito a
> ela.4. sdr-social-seller MC5, fortemente_pontua: «avisa quem está na lista de espera» → «deixa a lista de espera de
> sobreaviso».Toda reescrita passa de novo pela tabela de comprimento com o critério proposto.»

Esclarecimento do item 3 (pergunta do orquestrador): **«Passa faixa, não valor»**.

Escolhas (b)–(e):

> «(b) critério proposto, (c) casos abertos ficam, (d) retirar por status, (e) ordem C → UAT → D»

Escolha (f), sobre o rascunho local `docs/specs/DRAFT-banco-sjt-marketing.md` (md5 `5816ac72d78542f470fcf7c39dea954f`):

> **«Eu descarto depois»**

### Rodada 2 (2026-10-11): «aprovar + polir»

Texto apresentado: `539bc858464ff0b768b12e96ea7492ef` (commit `4b84b815`), tabela `bc32d39834a3a5fbf55bf48b3c24cc4d`,
SQL `158bcb4911a540343854620c0e2dcf9f`, ensaio `52b=14/14`. Incluía as escolhas do executor 1–4 (videomaker MC3 neutro
reescrito; sdr MC4 neutro reescrito; «mudar no sorriso»; sdr MC5 com o texto do operador verbatim).

> **«aprovar + polir»**

Significado da opção, como apresentada ao operador: aprova o texto como mostrado (inclusive as escolhas 1–4), com os
dois polimentos acima aplicados antes de registrar; depois, uma rodada automática de tabela (`--criterio proposto`),
LGPD-04 e ensaio, que só volta ao operador se uma verificação falhar. (b)–(f) seguem como respondidos na rodada 1.

## Como cada chave sai da resposta

| Chave | Valor | De onde vem |
|---|---|---|
| `decisao` | `aprovar` | rodada 2, «aprovar + polir», com a rodada automática verde |
| `criterio` | `proposto` | (b) «critério proposto»: por item, razão `fortemente_pontua` ÷ média das outras entre 0,90 e 1,10 e amplitude ≤ 25% do menor; por cargo, a certa é estritamente a mais longa em no máximo 2 de 6 |
| `caso_aberto_marketing` | `ficam` | (c) «casos abertos ficam»: os 3 casos de marketing seguem byte a byte os do ar, amarrados pelo hash (`mantidos=3`) |
| `retirada` | `status_retired` | (d) «retirar por status»: os itens antigos recebem `status = 'retired'` no mesmo apply; ficam legíveis pelo RH e nunca são apagados |
| `ordem_c_d` | `c_antes_da_uat` | (e) «ordem C → UAT → D»: o bloco C vai ao ar antes da UAT; as respostas de teste que apontam para itens antigos são limpas no bloco D |
| `rascunho` | `descartado_pelo_operador` | (f) «Eu descarto depois». O executor não o tocou: no momento deste registro ele segue ` M` na árvore de trabalho, com md5 `5816ac72d78542f470fcf7c39dea954f` |
