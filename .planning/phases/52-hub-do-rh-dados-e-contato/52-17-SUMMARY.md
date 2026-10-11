---
phase: 52-hub-do-rh-dados-e-contato
plan: 17
subsystem: database
tags: [sjt, banco-de-itens, migration-gerada, portao-de-texto, mutacoes, postgres, plpgsql]

requires:
  - phase: 52-15
    provides: "bloco B no ar (pin refs/gsd/52-15/sha) — estado vivo sobre o qual o ensaio roda"
  - phase: 52-16
    provides: "gen-sjt-v2.py, tabela-comprimento-sjt.py, p52_ensaio.cjs com o par smoke52b, p52_banco_sjt_smoke.sql; recusa 22023 do pontuar_sjt e mapa velho->novo (rodada WR-01/WR-02)"
provides:
  - "52-17-TEXTO-APROVADO.md — OK do operador ao texto (md5 03b2a0d5…), tabela (1d441390…), critério proposto e destinos (b)–(f), verbatim"
  - "supabase/migrations/20261011000003_p52_banco_sjt_v2.sql — GERADA do texto aprovado (md5 18141c60…), NÃO aplicada"
  - "scripts/p52_mutacoes.cjs — smoke52b no SMOKES; B1–B6 mordem, ao lado das L1–L8"
  - "supabase/tests/p52_banco_sjt_smoke.sql:743 — rótulo do (n) com tipo text, para que a falha saia como P52B FAIL (n) e não como 22P02"
affects: [52-18, UAT da Phase 52, bloco D]

actuals:
  tokens: 28300
  tasks: 3
  commits: 8

tech-stack:
  added: []
  patterns:
    - "Portão de texto por md5: o gerador só roda se md5(texto) = texto_md5_aprovado; o SQL commitado tem de ser idêntico (cmp) a uma geração nova"
    - "Mutação cuja mordida é a recusa do PRE (B4): contrato de RECUSA no runner, com alvo lido do próprio texto da migration"

key-files:
  created:
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-17-PEDIDO-MUDANCA-1.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-17-TEXTO-APROVADO.md
    - supabase/migrations/20261011000003_p52_banco_sjt_v2.sql
  modified:
    - docs/specs/BANCO-SJT-V2.md
    - scripts/p52_mutacoes.cjs
    - supabase/tests/p52_banco_sjt_smoke.sql

key-decisions:
  - "Operador, rodada 1 (2026-10-11): «mudar» — 4 itens de texto; (b) critério proposto, (c) casos abertos ficam, (d) retirar por status, (e) ordem C → UAT → D, (f) «Eu descarto depois»"
  - "Operador, rodada 2 (2026-10-11): «aprovar + polir» — md5 aprovado é o pós-polimento 03b2a0d5d96774bbb73b06b7c693bbe5"
  - "Orquestrador (2026-10-11, checkpoint B5): opção 1 — cast ::text na linha 743 do smoke e nada mais; o smoke já estava vermelho com B5, o conserto só dá rótulo à falha"

patterns-established:
  - "Anexo a text[] em PL/pgSQL sempre com expressão tipada (::text ou parênteses com expressão text); literal sem tipo vira literal de array e quebra com 22P02"

requirements-completed: [JORN-52]

coverage:
  - id: D1
    description: "Texto dos bancos SJT v2 aprovado pelo operador, por md5, com tabela de caracteres e critério proposto"
    requirement: JORN-52
    verification:
      - kind: other
        ref: "Task 2 <verify> (node -e … 'texto aprovado: 03b2a0d5d96774bbb73b06b7c693bbe5')"
        status: pass
    human_judgment: true
    rationale: "A aprovação do texto é ato do operador; a máquina só confere que o md5 atual é o aprovado"
  - id: D2
    description: "Migration 20261011000003 gerada do texto aprovado, idêntica a uma geração nova, ensaiada no arquivo exato sobre o estado vivo de PROD (aborta)"
    requirement: JORN-52
    verification:
      - kind: integration
        ref: "Task 3 <verify> 1: node scripts/p52_ensaio.cjs --migracoes=supabase/migrations/20261011000003_p52_banco_sjt_v2.sql supabase/tests/p52_banco_sjt_smoke.sql → ENSAIO VERDE smokes=[52b=14/14] mantidos=3"
        status: pass
    human_judgment: false
  - id: D3
    description: "Suíte Vitest inteira com a migration commitada: nenhum vermelho novo contra refs/gsd/52/base"
    requirement: JORN-52
    verification:
      - kind: unit
        ref: "Task 3 <verify> 2: node scripts/p52_vitest_delta.cjs → alteradas=0 · novas=0 · mordida=ok"
        status: pass
    human_judgment: false
  - id: D4
    description: "Mutações do banco (B1–B6) e do bloco B (L1–L8) mordem; controles verdes; nada persistiu"
    requirement: JORN-52
    verification:
      - kind: integration
        ref: "Task 3 <verify> 3: node scripts/p52_mutacoes.cjs → MUTACOES: 14/14 mordem; controle verde; nada persistiu"
        status: pass
    human_judgment: false

plan_head_before: d73338f88c0740c55cebff8f93c5b0719d671ad2
plan_head_after: 5f06e10007e418a744e4a1254077a96606c7b00f
duration: 47min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 17: Portão de texto do bloco C e banco SJT v2 gerado — Summary

**O operador aprovou o texto dos bancos SJT v2 em duas rodadas («mudar», depois «aprovar + polir»). O md5 aprovado é `03b2a0d5…`, com critério de comprimento proposto e os casos abertos de marketing mantidos. A migration `20261011000003` (md5 `18141c60…`) foi gerada desse texto e ensaiada no arquivo exato sobre o estado vivo de PROD: `52b=14/14`, quatro cargos `6+1`, `mantidos=3`. As 14 mutações mordem, inclusive a B5, depois de um conserto de uma linha no rótulo do smoke. Nada foi aplicado em PROD: o apply é do 52-18.**

## Performance

- **Duration:** ~47 min (17:39Z, commit-base `d73338f8`, até 18:26Z; as duas esperas pelo operador estão incluídas)
- **Started:** 2026-10-11T17:39:40Z
- **Completed:** 2026-10-11T18:27:00Z
- **Tasks:** 3/3 (Task 1 tracer, Task 2 portão do operador, Task 3 migration + mutações)
- **Files modified:** 6

## Accomplishments

- O texto de `docs/specs/BANCO-SJT-V2.md` foi aprovado pelo operador, e o registro amarra o md5 dele ao SQL.
- A migration `20261011000003_p52_banco_sjt_v2.sql` foi gerada do texto aprovado, nunca editada à mão, e é byte a byte igual a uma geração nova.
- O ensaio do arquivo exato sai verde sobre o estado vivo de PROD, com `mantidos=3`, porque o operador escolheu `caso_aberto_marketing: ficam`.
- A suíte Vitest inteira passa contra a base: `alteradas=0 · novas=0 · mordida=ok`.
- As mutações B1–B6 e L1–L8 mordem. O smoke (n) agora falha com rótulo, e não mais com `22P02`.

## Pacote do portão (Task 1) e as duas rodadas

### md5 finais

| Artefato | md5 |
|---|---|
| Texto aprovado, `docs/specs/BANCO-SJT-V2.md` (pós-polimento, commit `c66c6222`) | `03b2a0d5d96774bbb73b06b7c693bbe5` |
| Tabela de caracteres (`tabela-comprimento-sjt.py --md5`) = o `tabela_md5` que o POS mede por `char_length` | `1d441390e9951839d2249966947addc2` |
| SQL gerado `20261011000003_p52_banco_sjt_v2.sql` (99499 octetos) | `18141c60e27c7d6c8bea2ebc1267dc57` |
| Rascunho local do operador `docs/specs/DRAFT-banco-sjt-marketing.md` (cópia de trabalho, só leitura, intocado) | `5816ac72d78542f470fcf7c39dea954f` |
| `supabase/tests/p52_banco_sjt_smoke.sql` depois do conserto `5f06e100` | `364973e319aeb8090f896d8c52a78e16` |

Textos mostrados ao operador antes do aprovado: rodada 1 `5870e7bf5cd5c5423fb38eb1b94f8858` (tabela `d3d955d5…`). Rodada 2
`539bc858464ff0b768b12e96ea7492ef` (commit `4b84b815`, tabela `bc32d398…`, SQL `158bcb49…`). O operador viu a redação exata
dos dois polimentos junto com o `539bc858…`. O md5 aprovado é o de depois do polimento. O porquê está em
`52-17-TEXTO-APROVADO.md`, seção «O md5 aprovado é o do texto DEPOIS do polimento».

### Rodada 1 (2026-10-11): «mudar» — verbatim de `52-17-PEDIDO-MUDANCA-1.md`

> «1. social-media MC3: pontua e neutro não podem publicar a imagem da paciente sem o termo (dado sensível, LGPD;
> autorização exigida pelo CFO). Reescrever as duas como erros de julgamento que NÃO violam a regra (ex.: segura a
> publicação mas não avisa o Dr. do motivo; segura e propõe outro conteúdo sem resolver o termo). Mesma revisão no
> videomaker-storymaker MC3: gravar o áudio do paciente sem ele saber não pode valer 2.2. social-media MC6, atencao:
> «Corrige você mesma» → «Corrige por conta própria» (sem gênero).3. sdr-social-seller MC4: a regra da clínica sobre
> preço no WhatsApp é: <a Beauty Smile PASSA faixa de preço / NÃO passa valor por WhatsApp>. Ajustar o gabarito a
> ela.4. sdr-social-seller MC5, fortemente_pontua: «avisa quem está na lista de espera» → «deixa a lista de espera de
> sobreaviso».Toda reescrita passa de novo pela tabela de comprimento com o critério proposto.»

Esclarecimento do item 3: **«Passa faixa, não valor»**.

> «(b) critério proposto, (c) casos abertos ficam, (d) retirar por status, (e) ordem C → UAT → D»

(f), sobre o rascunho local (md5 `5816ac72d78542f470fcf7c39dea954f`): **«Eu descarto depois»**.

### Rodada 2 (2026-10-11): «aprovar + polir» — verbatim

> **«aprovar + polir»**

Polimentos aplicados palavra por palavra em `c66c6222`:
- `sdr-social-seller` MC5 `fortemente_pontua`: «deixa recado, …» → «manda recado, deixa a lista de espera de sobreaviso»;
- `videomaker-storymaker` MC5 `neutro`: «começa a sessão atrasado» → «começa a sessão com atraso».

Depois veio a rodada automática: tabela `--criterio proposto` exit 0, LGPD-04 limpo, gerador determinístico, `test_gen_sjt_v2.py`
28/28 e ensaio `52b=14/14`. Tudo saiu verde, então nada voltou ao operador.

### Chaves registradas (`52-17-TEXTO-APROVADO.md`)

`decisao: aprovar` · `criterio: proposto` · `caso_aberto_marketing: ficam` · `retirada: status_retired` ·
`ordem_c_d: c_antes_da_uat` · `rascunho: descartado_pelo_operador` · `aprovado_em: 2026-10-11 15:13 -0300`.

### Tabela de caracteres do texto aprovado (`--criterio proposto`, exit 0)

| cargo | item | fortemente_pontua | pontua | neutro | atencao | razão | amplitude | posto | critério |
|---|---|---|---|---|---|---|---|---|---|
| sdr-social-seller | MC1 | 105 | 106 | 101 | 104 | 1.01 | 5% | 2 | ok |
| sdr-social-seller | MC2 | 102 | 100 | 96 | 99 | 1.04 | 6% | 1 | ok |
| sdr-social-seller | MC3 | 103 | 103 | 100 | 103 | 1.01 | 3% | 1 | ok |
| sdr-social-seller | MC4 | 103 | 106 | 105 | 106 | 0.97 | 3% | 4 | ok |
| sdr-social-seller | MC5 | 104 | 99 | 103 | 102 | 1.03 | 5% | 1 | ok |
| sdr-social-seller | MC6 | 101 | 100 | 104 | 96 | 1.01 | 8% | 2 | ok |
| social-media | MC1 | 109 | 101 | 104 | 100 | 1.07 | 9% | 1 | ok |
| social-media | MC2 | 97 | 99 | 100 | 95 | 0.99 | 5% | 3 | ok |
| social-media | MC3 | 101 | 104 | 104 | 98 | 0.99 | 6% | 3 | ok |
| social-media | MC4 | 92 | 94 | 95 | 94 | 0.98 | 3% | 4 | ok |
| social-media | MC5 | 101 | 99 | 94 | 102 | 1.03 | 9% | 2 | ok |
| social-media | MC6 | 91 | 98 | 96 | 103 | 0.92 | 13% | 4 | ok |
| videomaker-storymaker | MC1 | 107 | 108 | 106 | 106 | 1.00 | 2% | 2 | ok |
| videomaker-storymaker | MC2 | 97 | 98 | 93 | 96 | 1.01 | 5% | 2 | ok |
| videomaker-storymaker | MC3 | 98 | 100 | 94 | 101 | 1.00 | 7% | 3 | ok |
| videomaker-storymaker | MC4 | 95 | 96 | 94 | 96 | 1.00 | 2% | 3 | ok |
| videomaker-storymaker | MC5 | 101 | 97 | 104 | 97 | 1.02 | 7% | 2 | ok |
| videomaker-storymaker | MC6 | 96 | 97 | 100 | 92 | 1.00 | 9% | 3 | ok |
| editor-video | MC1 | 91 | 94 | 91 | 96 | 0.97 | 5% | 3 | ok |
| editor-video | MC2 | 91 | 102 | 95 | 96 | 0.93 | 12% | 4 | ok |
| editor-video | MC3 | 94 | 95 | 91 | 90 | 1.02 | 6% | 2 | ok |
| editor-video | MC4 | 90 | 92 | 90 | 87 | 1.00 | 6% | 2 | ok |
| editor-video | MC5 | 90 | 94 | 90 | 90 | 0.99 | 4% | 2 | ok |
| editor-video | MC6 | 96 | 97 | 90 | 93 | 1.03 | 8% | 2 | ok |

Por cargo, a certa é estritamente a mais longa em: `sdr-social-seller` 2 de 6, no limite de 2 (razão máx 1.04).
`social-media` 1 de 6 (1.07). `videomaker-storymaker` 0 de 6 (1.02). `editor-video` 0 de 6 (1.03).

**Comparação com o banco no ar** (números do ar: `52-16-SUMMARY`, medidos por `char_length` em PROD):

| | certa estritamente mais longa | razão (mín–máx) | amplitude máx |
|---|---|---|---|
| No ar — marketing (18 mc) | 16 de 18 | 0,96–2,85 | 262% |
| Rascunho 30/09 — marketing (18 mc) | 14 de 18 | 0,96–1,25 | 73% |
| **Texto aprovado — marketing (18 mc)** | **1 de 18** | **0,92–1,07** | **13%** |
| **Texto aprovado — `sdr-social-seller` (6 mc)** | **2 de 6** | **0,97–1,04** | **8%** |

## Task 3 — evidência (re-execução depois do conserto, HEAD `5f06e100`)

**Precondição:** o `<verify>` da Task 2 está verde (`52-17-TEXTO-APROVADO.md` commitado, `decisao: aprovar`,
`texto_md5_aprovado` = md5 atual `03b2a0d5…`).

**Verify 1: arquivo exato.** O md5 do texto é o aprovado. A geração nova é igual, por `cmp`, ao arquivo commitado.
O ensaio que aborta roda sobre o estado vivo de PROD. Exit 0. Linha literal:

```
gerado: …/p52_17_regerado.sql (99499 octetos, md5 18141c60e27c7d6c8bea2ebc1267dc57)
ENSAIO VERDE: supabase/tests/p52_banco_sjt_smoke.sql · prefixadas=[20261011000003] · aplicadas=[20261011000001,20261011000002] · ausentes=[20261011000004] · smokes=[52b=14/14] · evidencia=pontuar_sjt=66fe507fbf5bf6a98bd7e5eecd84f310 banco:sdr-social-seller=6+1,social-media=6+1,videomaker-storymaker=6+1,editor-video=6+1;retirados=19;tabela_md5=1d441390e9951839d2249966947addc2;mantidos=3;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083 52b.retirados=19 52b.refs=14,em_retirados=9 52b.mantidos=3 52b.remap=32 52b.refs_remap=3 52b.scores_sjt=8 52b.mapa=32 52b.pontuar=bateria:3,valido=igual,22023=velho+forjado,velho_silencioso=2/3 · 2347 ms
```

**Verify 2: delta da suíte Vitest inteira.** A migration está commitada e `supabase/` está limpo. Exit 0. Literal:

```
vitest base 0d70ac7: status 1 · 14158 ms
vitest head 5f06e10: status 1 · 20368 ms
pre-existentes (falham na base e em HEAD) (2):
  - src/__tests__/promessasComExecutor.test.ts > Deferimento com prazo: a fase dona é conferida contra o roadmap, nos dois sentidos fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos
  - src/__tests__/promessasComExecutor.test.ts > Metade 1 — o registro curado: toda promessa nomeada tem executor provado no disco deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…
corrigidas (falham na base, passam em HEAD) (0):
ALTERADAS (falham nos dois, por motivo diferente) (0):
NOVAS (falham em HEAD, passavam na base) (0):
mordida: src/__tests__/p52-mordida-delta.test.ts > p52 mordida do delta reprova por construcao (se o delta nao a acusar como nova, a comparacao e vazia) → acusada como nova
vitest delta: base=0d70ac7 2725/2 · head=5f06e10 3094/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok
```

**Verify 3: mutações.** Exit 0. Saída inteira (as linhas L2 e L3 vão cortadas em 400 colunas):

```
modo: padrao prefixadas=[20261011000003]
baseline: ledger=["20261011000001","20261011000002"] funcoes=5 mutacoes_p52=0 fixtures_p52={"users":0,"candidatos":0}
CONTROLE verde (supabase/tests/p52_leituras_rh_smoke.sql): par 52l=20/20 (2166 ms)
L1 morde: guarda sem helper: ler_devolutiva_bigfive_rh perde o is_active_rh_user do ramo rh -> P52L FAIL (c) [rec_inativo] (2053 ms)
L2 morde: devolutiva projeta 'percentil' no jsonb_build_object de cada dimensao -> P52L FAIL (g) [dev1_percentil,…]
L3 morde: SJT projeta 'tag', o.tag dentro de cada alternativa -> P52L FAIL (n) [sjt1_item1_alternativa_com_chave_a_mais,…]
L4 morde: SJT ordena as alternativas por ordem (o gabarito) em vez do md5 neutro -> P52L FAIL (o) [item1_fortemente_pontua_pos=1(esperado 3),item2_fortemente_pontua_pos=1(esperado 2),item3_fortemente_pontua_pos=1(esperado 3),item4_fortemente_pontua_pos=1(esperado 4)] (2214 ms)
L5 morde: triagem aceita pedido de origem automatica -> P52L FAIL (q) [automatica:ok:situacao=disponivel] (1969 ms)
L6 morde: GRANT EXECUTE de ler_devolutiva_bigfive_rh a anon depois da migration -> P52L FAIL (f) [anon_privilegio,anon_chamada:err:42501:forbidden] (2189 ms)
L7 morde: guarda sem helper: ler_contexto_rejeicao_triagem_revisao perde o is_active_rh_user -> P52L FAIL (r) [rec_inativo_triagem:ok:situacao=disponivel,rec_inativo_automatica:err:P0002:pedido de revisao de rejeicao pela triagem inexistente,rec_inativo_inexistente:err:P0002:pedido de revisao de rejeicao pela triagem inexistente] (1945 ms)
L8 morde: SJT sem o filtro de candidatura viva (deleted_at/is_rascunho) -> P52L FAIL (t) [sjt_rascunho:ok:situacao=disponivel,itens=3] (2028 ms)
CONTROLE verde (supabase/tests/p52_banco_sjt_smoke.sql): par 52b=14/14 (3129 ms)
B1 morde: depois da migration, um item da baseline da retirada volta a active -> P52B FAIL (a) [social-media=7+1] (2020 ms)
B2 morde: ordem das alternativas reescrita em escada pela etiqueta no primeiro cargo do texto -> P52B FAIL (g) (1907 ms)
B3 morde: pesos de pontua e neutro trocados entre si num mc ativo do texto -> P52B FAIL (f) (1779 ms)
B4 morde: hash do primeiro caso mantido trocado, no v_mant_hash do $pre$, por um sha256 que nao e de item nenhum -> P52B PRE-PORTAO: caso mantido ausente do ar — cargo editor-video, content_hash e4e89b6b7edef4b8c623b9b65d804f389f5f6ebf7b7b4ec3882959ae3df3168c: 0 item(ns) ativo(s) com esse hash (esperado 1) (766 ms)
B5 morde: pontuar_sjt recriado com o corpo velho (scripts/geradores/pontuar_sjt_vivo.plpgsql) depois da migration -> P52B FAIL (n) [o pontuar_sjt no ar nao e o corpo novo; id velho:ACEITO (nota parcial em silencio); id forjado:ACEITO (nota parcial em silencio)] (2751 ms)
B6 morde: uma linha do mapa supabase_migrations.p52_remap_opcao_sjt apagada depois da migration -> P52B FAIL (m) [conteudo: linhas=31 (PRE=32),id novo vigente=31,novo v4 e diferente do velho=31,versoes=1,ids iguais=f,velhos iguais=f] (2445 ms)
leitura so-leitura igual a baseline: ledger=["20261011000001","20261011000002"] funcoes=5 mutacoes_p52=0 fixtures_p52={"users":0,"candidatos":0}
MUTACOES: 14/14 mordem; controle verde; nada persistiu
```

As entradas são B1–B6, não B1–B4. B5 (`pontuar_sjt` com o corpo velho → (n)) e B6 (linha do mapa apagada → (m)) vigiam a
recusa `22023` e o mapa velho→novo que a rodada WR-01/WR-02 do 52-16 colocou na 0003. Sem elas, essas duas peças ficariam
sem mutação. B4 entra porque `caso_aberto_marketing: ficam`: há caso mantido, logo há alvo.

`test_gen_sjt_v2.py` depois do conserto: `Ran 28 tests … OK`.

## O checkpoint B5 e a resolução

**O que se mediu (primeira execução da Task 3, commit `f98e9c3b`):** L1–L8, B1–B4 e B6 mordiam. **B5 NÃO mordia.** O
smoke (n) quebrava com `22P02` em vez de `P52B FAIL (n)`. A causa está em `supabase/tests/p52_banco_sjt_smoke.sql:743`:
`v_rot := v_rot || 'o pontuar_sjt no ar nao e o corpo novo';` anexa um literal SEM TIPO a `v_rot text[]`. O Postgres
resolve `text[] || unknown` como concatenação de arrays e tenta ler o literal como array: `22P02`. Todos os outros anexos
do arquivo usam uma expressão `text` entre parênteses, ou `format(...)`. A regra do operador («um portão não se afrouxa
sozinho») mandava parar. O executor parou e devolveu o checkpoint sem editar o smoke.

**Quem decidiu:** o orquestrador, em 2026-10-11, depois de verificar a linha de forma independente. **Raciocínio dele:**
com B5 o smoke já estava VERMELHO, só que sem rótulo. O conserto não torna verde nenhuma verificação que falhava: ele faz
a falha carregar o próprio rótulo. **Autorizado: opção 1.** Cast `::text` nessa linha e nada mais no arquivo.

**O que foi feito:** `5f06e100 fix(52-17): smoke do banco — rotulo do (n) como text (22P02 escondia o P52B FAIL)`. Um
octeto de diff semântico (`'…'` → `'…'::text`) e nenhuma outra linha.

**Conferências pedidas:**
- O gerador, os testes do gerador e o runner de mutações não fixam conteúdo nem hash do smoke. `test_gen_sjt_v2.py:184,218,247`
  lê o smoke só para `assertIn` das expressões `FP_RESPOSTAS`/`FP_SCORES`/`FP_ESCOPO`/`RE_V4` e para listar os blocos
  `DO $<letra>$`. Os dois continuam válidos (28/28). `gen-sjt-v2.py:39` só cita o smoke num comentário. `p52_mutacoes.cjs:77,171`
  usa o caminho, não o conteúdo. O smoke não faz parte do SQL gerado: o md5 da migration segue `18141c60…`.
- O `52-18-PLAN.md` NÃO fixa o md5 do smoke. As 16 menções a `md5` são da migration, do `prosrc` do `pontuar_sjt`, da tabela
  e do ledger. O smoke aparece por caminho (`:20,92,106,146,221`) e, no `:146`, como leitura inteira para o revisor (IN-09).

## Para o 52-18: decidido, não decidido, registrado

### Destrutivo, decidido no 52-18 (checkpoint do operador da Task 2 do 52-18; nada disso foi decidido aqui)

O 52-17 só aprovou o TEXTO, que é a parte aditiva: pré-vendas 6+1 e os 18 `mc` novos de marketing, mais a retirada por
`status`. A mesma transação da 0003 também é DESTRUTIVA e substitui objeto vivo em quatro pontos. Os quatro são decisão
do operador no 52-18, com os números da Passo 0b:
1. **Remapeamento:** reescreve `opcao_id` de 32 alternativas em 8 itens SJT ativos de 6 cargos FORA do texto aprovado
   (asb-tsb, assistente-financeiro, consultor-vendas, dentista, recepcionista, vaga-generica). Números de hoje:
   `remap=32/8`.
2. **Respostas gravadas:** reescreve 3 respostas de candidato em 1 linha de `scores_candidato`
   (`metadata.respostas[].opcao_id`; `refs=3,linhas=1`). `em_curso=1` (`f73682b6…`, vaga «[TESTE] Dentista — Funil E2E»).
3. **`pontuar_sjt`:** SUBSTITUI a função viva. O corpo novo é o vivo mais a recusa `22023 'opcao fora da pergunta'`, e o md5
   do `prosrc` vai a `66fe507fbf5bf6a98bd7e5eecd84f310`. A ACL fica como está no ar, inclusive o EXECUTE de anon herdado,
   que a função recusa com `42501`.
4. **Mapa:** CRIA `supabase_migrations.p52_remap_opcao_sjt`, com 32 linhas (`mapa=32`).

### Não decidido: duas perguntas para o 52-18 (nem o operador nem o plano as decidiram)

1. **`LOCK TABLE` no apply.** O `52-18-PLAN.md:26` aceita um resíduo de concorrência. Um `pontuar_sjt` que LEU as alternativas
   antes do commit do apply grava a nota certa com ids que deixam de existir. A prova pós-apply «zero resposta no id velho
   (pelo mapa)» acusa esse caso, mas só depois. Fica aberto se a 0003 (ou o apply) deve trancar a tabela, por exemplo com
   `LOCK TABLE public.perguntas_opcao_sjt` / `scores_candidato` num modo que serialize com `pontuar_sjt`, para fechar a
   janela em vez de detectá-la. Isso mudaria o SQL gerado, portanto o gerador, e passaria por novo ensaio, mutação e review.
2. **O cliente depois do `22023`.** O `52-18-PLAN.md:26` e o `T-52-54` registram o comportamento: depois do remapeamento, um
   envio com id velho recebe `22023`, e o cliente mostra «Não foi possível enviar agora. Tente novamente.». Mas
   `SjtMultiplaEscolhaScreen.tsx` guarda as alternativas com `staleTime: Infinity`, então a nova tentativa reenvia o id
   velho, e só recarregar a página resolve. Hoje isso é «item de UAT, não conserto desta fase». Fica aberto se o cliente
   deve invalidar a consulta das alternativas ao receber `22023`, ou se a escolha fica registrada como aceita.

### Registrado

- **IN-08 (dono 52-16).** Os números do `52-16-SUMMARY.md` estão velhos: «14 testes» (`:61,199,217,224,296`), «52b 9/9»
  (`:68,109,226,295`) e os md5 da rodada dele. Os números atuais são `test_gen_sjt_v2.py` 28/28, `smokes=[52b=14/14]` e as
  md5 da tabela acima. O 52-18 cita aquele SUMMARY e precisa lê-lo com estes números. Nada foi editado.
- **Aberto para o orquestrador, fora deste plano: o mesmo defeito em `supabase/tests/p49_12_pos_estado.sql:126,135`.**
  `v_falhas := v_falhas || '…';` anexa literal sem tipo a `v_falhas text[]` (declarado em `:67`). Quando uma dessas
  falhas acontecer, o smoke quebra com `22P02` em vez de reportar o texto. A falha continua visível, mas sem rótulo. Não
  foi tocado, por instrução do despacho. Um conserto seria `'…'::text` nas duas linhas, como aqui. Vale também uma
  varredura pela FORMA (CLAUDE.md) em `supabase/tests/*.sql`, procurando `|| '` sobre variáveis `text[]`.

## Task Commits

| Commit | Autor | O quê |
|---|---|---|
| `ff008f81` | orquestrador | `docs(52-17): operador pede mudancas no texto do bloco C (rodada 1), verbatim` |
| `4b84b815` | executor | `docs(52-17): texto do bloco C — mudancas do operador, rodada 1` |
| `4f0ac16b` | orquestrador | `docs(52-17): operador aprova o texto do bloco C com dois polimentos (rodada 2), verbatim` |
| `c66c6222` | executor | `docs(52-17): texto do bloco C — polimentos aprovados pelo operador (rodada 2)` |
| `1016784d` | executor | `docs(52-17): texto do bloco C aprovado pelo operador — md5 03b2a0d5 (pos-polimento), tabela 1d441390, criterio proposto` |
| `86457fbc` | executor | `feat(52-17): banco SJT v2 gerado do texto aprovado (20261011000003)` |
| `f98e9c3b` | executor | `test(52-17): mutacoes do banco SJT v2` |
| `5f06e100` | executor | `fix(52-17): smoke do banco — rotulo do (n) como text (22P02 escondia o P52B FAIL)` |

`commits: 8`, medido com `git rev-list --count d73338f8..5f06e100`. O commit deste SUMMARY e o do tracking vêm depois.
Nada foi enviado ao remoto: `origin/main..HEAD` = 13 commits, que sobem no push do 52-18.

## Files Created/Modified

- `.planning/phases/52-hub-do-rh-dados-e-contato/52-17-PEDIDO-MUDANCA-1.md`: as duas respostas do operador, verbatim.
- `.planning/phases/52-hub-do-rh-dados-e-contato/52-17-TEXTO-APROVADO.md`: as chaves lidas por máquina (md5 do texto e da
  tabela, critério, destinos) e a resposta verbatim.
- `docs/specs/BANCO-SJT-V2.md`: rodada 1 (4 mudanças) e rodada 2 (2 polimentos).
- `supabase/migrations/20261011000003_p52_banco_sjt_v2.sql`: gerada, 1125 linhas, NÃO aplicada.
- `scripts/p52_mutacoes.cjs`: smoke52b no `SMOKES`; B1–B6; contrato de RECUSA para o B4.
- `supabase/tests/p52_banco_sjt_smoke.sql`: `:743` com `::text`.

## Decisions Made

- O operador aprovou o texto em duas rodadas, e o md5 aprovado é o de depois do polimento. Ver as seções acima e `52-17-TEXTO-APROVADO.md`.
- O orquestrador autorizou o cast `::text` na `:743` do smoke (checkpoint B5, opção 1), com o raciocínio registrado acima.

## Deviations from Plan

### Auto-fixed Issues

Nenhuma correção automática. O único defeito, o rótulo do smoke, voltou como checkpoint e só foi consertado com a
decisão do orquestrador.

### Adjustments

**1. [Escopo] Mutações B5 e B6 além das B1–B4 do plano**
- **Found during:** Task 3
- **Issue:** o plano lista B1–B4. A rodada WR-01/WR-02 do 52-16 (`29469c08`) pôs na 0003 a recusa `22023` e o mapa velho→novo,
  e o smoke52b ganhou (m) e (n) para vigiá-los. Sem mutação, essas duas cláusulas seriam portões não provados.
- **Fix:** B5 (corpo velho do `pontuar_sjt` → (n)) e B6 (linha do mapa apagada → (m)).
- **Committed in:** `f98e9c3b`

**2. [Checkpoint resolvido pelo orquestrador] `:743` do smoke com `::text`**
- **Found during:** Task 3, verify 3 (B5 não mordia: `22P02`)
- **Issue / Fix / Quem decidiu:** ver «O checkpoint B5 e a resolução».
- **Files modified:** `supabase/tests/p52_banco_sjt_smoke.sql` (1 linha)
- **Verification:** B5 → `P52B FAIL (n)`; controle `52b=14/14`; `MUTACOES: 14/14`; ensaio exato verde; delta Vitest `novas=0`; gerador 28/28.
- **Committed in:** `5f06e100`

---

**Total deviations:** 0 auto-fixed, 2 adjustments (1 de escopo, 1 checkpoint decidido pelo orquestrador).
**Impact on plan:** as duas mutações a mais estendem a vigilância às peças da 0003 que o plano não previa. O conserto do
smoke não afrouxa nada, só dá rótulo a uma falha que já existia.

## Issues Encountered

- O defeito `22P02` da `:743` (resolvido, ver acima) e o mesmo defeito em `p49_12_pos_estado.sql:126,135` (aberto,
  fora do plano).
- O teste do gerador (`python3 -I -m unittest`) deixou `scripts/geradores/__pycache__/`, que não é ignorado. Foi removido
  porque era artefato desta execução, e nada foi commitado.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>`. A 0003 não foi aplicada, e o ensaio aborta.

## User Setup Required

Nenhum.

## Next Phase Readiness

- **52-18 pronto para começar:** a migration exata está ensaiada e verde, as mutações mordem, o texto está aprovado e
  o ledger não tem `20261011000003`.
- Antes do apply, o 52-18 tem de levar ao operador as duas perguntas não decididas (`LOCK TABLE`; cliente depois do
  `22023`) e as quatro destrutivas, com os números da Passo 0b. O review do bloco C lê `scripts/geradores/` e o smoke
  INTEIROS (IN-09).
- O rascunho local `docs/specs/DRAFT-banco-sjt-marketing.md` segue ` M`, intocado (md5 `5816ac72…`). O operador disse
  que o descarta.

## Self-Check: PASSED

- FOUND: `52-17-TEXTO-APROVADO.md`, `52-17-PEDIDO-MUDANCA-1.md`, `supabase/migrations/20261011000003_p52_banco_sjt_v2.sql`,
  `scripts/p52_mutacoes.cjs`, `supabase/tests/p52_banco_sjt_smoke.sql`, `docs/specs/BANCO-SJT-V2.md`.
- FOUND (ancestrais de HEAD): `ff008f81` `4b84b815` `4f0ac16b` `c66c6222` `1016784d` `86457fbc` `f98e9c3b` `5f06e100`.
- Os três `<verify>` da Task 3 foram re-executados em `5f06e100`, com exit 0 cada um.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*
