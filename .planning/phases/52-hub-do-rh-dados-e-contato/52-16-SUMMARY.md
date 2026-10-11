---
phase: 52-hub-do-rh-dados-e-contato
plan: 16
subsystem: database
tags: [sjt, banco-de-itens, gerador, python, postgres, ensaio, lgpd-04]
status: complete

requires:
  - phase: 52-01
    provides: "scripts/p52_ensaio.cjs (ensaio que aborta, par smoke52b, versão 20261011000003 em MIGS)"
provides:
  - "scripts/geradores/sjt_texto.py — parser compartilhado (limpa, parse, content_hash, ordem_permutada, tabela_md5)"
  - "scripts/geradores/tabela-comprimento-sjt.py — tabela de caracteres da D-34 (--criterio proposto, --md5, --auto-teste)"
  - "scripts/geradores/gen-sjt-v2.py — gerador da migration 20261011000003 (PRE, INSERTs, retirada, POS)"
  - "docs/specs/BANCO-SJT-V2.md — texto v2: pré-vendas 6+1 e versão nova dos 3 cargos de marketing, para o portão de texto do 52-17"
  - "supabase/tests/p52_banco_sjt_smoke.sql — smoke52b (a)–(i)"
affects: [52-17, 52-18, 52-19, 52-20]

actuals:
  tokens: 23600
  tasks: 2
  commits: 5
plan_head_before: dd32d74b83d701cceebad4b2311fa5987037a575
plan_head_after: 97d663435726b235ad9ada0dc70fd437d82b139f

tech-stack:
  added: []
  patterns:
    - "Texto → gerador → SQL: um parser só para a tabela do portão e para a migration (a tabela não pode medir um texto diferente do que vai a PROD)"
    - "Escopo do smoke lido das GUCs LOCAIS que o PRE da migration grava na mesma transação — nenhuma lista literal de cargos"
    - "Intenção «fica como está no ar» conferida por máquina: linha com o content_hash medido, recusa no gerador, id amarrado no PRE/POS/smoke"

key-files:
  created:
    - scripts/geradores/sjt_texto.py
    - scripts/geradores/tabela-comprimento-sjt.py
    - scripts/geradores/gen-sjt-v2.py
    - scripts/geradores/test_gen_sjt_v2.py
    - docs/specs/BANCO-SJT-V2.md
    - supabase/tests/p52_banco_sjt_smoke.sql
  modified: []

key-decisions:
  - "«A certa é a mais longa» é ESTRITO: empate no topo não denuncia a alternativa certa pelo tamanho e não conta para o limite de 2 de 6"
  - "Casos abertos de marketing FICAM (proposta da D-35 para o portão): byte a byte iguais a PROD, conferidos pelo hash; a regra de comprimento é dos itens mc"
  - "Retirada por status = 'retired' (não há CHECK de status em perguntas; get_opcoes_sjt, pontuar_sjt e a RLS do candidato comparam com 'active')"
  - "PRE com recusas a mais que o plano: testes_aplicaveis fora da forma de lista, item ativo sem content_hash, hash do texto já ocupado por outro cargo ou status, e itens_ids que apontem item de cargo do texto mesmo sem `cargo` no elemento"

patterns-established:
  - "Gerador de banco SJT: cabeçalho «GERADO, NÃO TRANSCRITO» com md5 do texto; saída em arquivo temporário até o portão de texto"
  - "md5 canônico da tabela de caracteres: <cargo>|<hash>|<fp>,<p>,<n>,<a>, ordem de bytes (COLLATE \"C\" no SQL = sorted() no Python)"

requirements-completed: [JORN-52]

coverage:
  - id: D1
    description: "Parser, tabela de caracteres e gerador do banco SJT v2, com as recusas do contrato (contagem, alternativas, etiqueta, marcação, caso mantido divergente) e SQL determinístico"
    requirement: "JORN-52"
    verification:
      - kind: unit
        ref: "scripts/geradores/test_gen_sjt_v2.py (14 testes, python3 -I … -v)"
        status: pass
      - kind: other
        ref: "python3 -I scripts/geradores/tabela-comprimento-sjt.py --auto-teste"
        status: pass
    human_judgment: false
  - id: D2
    description: "Migration gerada ensaiada em PROD (aborta): quatro cargos 6+1, retirados=19 = baseline, mantidos=3, tabela_md5 do SQL = do script; smoke52b 9/9"
    requirement: "JORN-52"
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs --migracoes=$TMPDIR/20261011000003_p52_banco_sjt_v2.sql supabase/tests/p52_banco_sjt_smoke.sql"
        status: pass
      - kind: other
        ref: "mutações temporárias: retirada neutralizada → POS (contagem); ordem em escada sem POS → smoke (g); hash mantido ausente → PRE"
        status: pass
    human_judgment: false
  - id: D3
    description: "Texto do banco de pré-vendas (6 mc + 1 caso aberto) e versão nova dos 6 mc de cada cargo de marketing, prontos para o portão de texto"
    requirement: "JORN-52"
    verification:
      - kind: other
        ref: "tabela-comprimento-sjt.py --criterio proposto docs/specs/BANCO-SJT-V2.md (exit 0) + varredura LGPD-04 com o FORBIDDEN do guarda (limpo)"
        status: pass
    human_judgment: true
    rationale: "O texto dos itens e o critério numérico de comprimento são aprovados pelo operador no portão de texto do 52-17 (D-34, D-35) — a máquina prova a regra, não a qualidade do item"

duration: 15min
completed: 2026-10-11
---

# Phase 52 Plan 16: Banco SJT v2 em texto (pré-vendas + marketing) Summary

**Texto v2 dos quatro cargos (pré-vendas novo 6+1, marketing com os 18 mc reescritos e os 3 casos abertos mantidos) com a regra de comprimento da D-34 conferível por tabela, e um gerador Python que vira migration com `ordem` embaralhada, retirada dos itens antigos no mesmo arquivo e PRE/POS — ensaiado verde em PROD sem escrever nada.**

## Performance

- **Duration:** ~15 min (relógio do executor)
- **Started:** 2026-10-11T04:52:46Z
- **Completed:** 2026-10-11T05:08Z
- **Tasks:** 2 de 2 (Task 1 tracer, TDD)
- **Files:** 6 criados, 0 modificados

## Accomplishments

- **Ferramentas (Task 1):** `sjt_texto.py` é o único parser — a tabela do portão e o gerador leem o texto pela mesma `limpa()` e a mesma gramática. A `limpa()` agora **recusa** marcação que sobra, em vez de emiti-la. O `content_hash` segue a fórmula do gerador antigo: os três casos abertos de marketing reproduzem o hash de PROD.
- **Gerador:** a migration `20261011000003` é gerada em `$TMPDIR` (nunca em `supabase/migrations/` antes do 52-17). Ela tem cabeçalho, `SET LOCAL`, `DO $pre$`, os INSERTs `WHERE NOT EXISTS` com `ordem` permutada, `DO $retira$` (`status = 'retired'`, `GET DIAGNOSTICS`) e `DO $pos$`. Duas execuções dão SQL byte a byte igual (md5 `ed10ec2c01f89e49efebb08753b6740e` no texto final).
- **Texto:** `docs/specs/BANCO-SJT-V2.md` tem as quatro seções de cargo. Todo item `mc` cumpre o critério proposto. A certa é estritamente a mais longa em **2 de 24** itens; no ar, isso acontece em 17 de 19.
- **Ensaio em PROD (aborta), quatro cargos:** `smokes=[52b=9/9]`, evidência `banco:sdr-social-seller=6+1,social-media=6+1,videomaker-storymaker=6+1,editor-video=6+1;retirados=19;tabela_md5=d3d955d58c4808d2822aabaa290aa830;mantidos=3 52b.retirados=19 52b.refs=14,em_retirados=9 52b.mantidos=3`. O `tabela_md5` medido por `char_length` no banco é **igual** ao do script.
- **Mordida provada (mutações em arquivos temporários, apagadas):**
  - Retirada neutralizada → `P52B POS-PORTAO (contagem): … 7 mc + 1 caso_aberto ativos, 1 fora do texto`.
  - Ordem em escada sem o POS → `P52B FAIL (g): … sdr-social-seller:ordem1x6`.
  - Hash de caso mantido ausente do ar → `P52B PRE-PORTAO: caso mantido ausente do ar — cargo editor-video …`.

## Para o portão de texto (52-17)

### Tabela completa — `python3 -I scripts/geradores/tabela-comprimento-sjt.py docs/specs/BANCO-SJT-V2.md`

| cargo | item | fortemente_pontua | pontua | neutro | atencao | razão | amplitude | posto | critério |
|---|---|---|---|---|---|---|---|---|---|
| sdr-social-seller | MC1 | 105 | 106 | 101 | 104 | 1.01 | 5% | 2 | ok |
| sdr-social-seller | MC2 | 102 | 100 | 96 | 99 | 1.04 | 6% | 1 | ok |
| sdr-social-seller | MC3 | 103 | 103 | 100 | 103 | 1.01 | 3% | 1 | ok |
| sdr-social-seller | MC4 | 105 | 106 | 106 | 106 | 0.99 | 1% | 4 | ok |
| sdr-social-seller | MC5 | 101 | 99 | 103 | 102 | 1.00 | 4% | 3 | ok |
| sdr-social-seller | MC6 | 101 | 100 | 104 | 96 | 1.01 | 8% | 2 | ok |
| social-media | MC1 | 109 | 101 | 104 | 100 | 1.07 | 9% | 1 | ok |
| social-media | MC2 | 97 | 99 | 100 | 95 | 0.99 | 5% | 3 | ok |
| social-media | MC3 | 101 | 97 | 103 | 98 | 1.02 | 6% | 2 | ok |
| social-media | MC4 | 92 | 94 | 95 | 94 | 0.98 | 3% | 4 | ok |
| social-media | MC5 | 101 | 99 | 94 | 102 | 1.03 | 9% | 2 | ok |
| social-media | MC6 | 91 | 98 | 96 | 96 | 0.94 | 8% | 4 | ok |
| videomaker-storymaker | MC1 | 107 | 108 | 106 | 106 | 1.00 | 2% | 2 | ok |
| videomaker-storymaker | MC2 | 97 | 98 | 93 | 96 | 1.01 | 5% | 2 | ok |
| videomaker-storymaker | MC3 | 98 | 99 | 94 | 101 | 1.00 | 7% | 3 | ok |
| videomaker-storymaker | MC4 | 95 | 96 | 94 | 96 | 1.00 | 2% | 3 | ok |
| videomaker-storymaker | MC5 | 101 | 97 | 102 | 97 | 1.02 | 5% | 2 | ok |
| videomaker-storymaker | MC6 | 96 | 97 | 100 | 92 | 1.00 | 9% | 3 | ok |
| editor-video | MC1 | 91 | 94 | 91 | 96 | 0.97 | 5% | 3 | ok |
| editor-video | MC2 | 91 | 102 | 95 | 96 | 0.93 | 12% | 4 | ok |
| editor-video | MC3 | 94 | 95 | 91 | 90 | 1.02 | 6% | 2 | ok |
| editor-video | MC4 | 90 | 92 | 90 | 87 | 1.00 | 6% | 2 | ok |
| editor-video | MC5 | 90 | 94 | 90 | 90 | 0.99 | 4% | 2 | ok |
| editor-video | MC6 | 96 | 97 | 90 | 93 | 1.03 | 8% | 2 | ok |

- `sdr-social-seller`: a certa é estritamente a mais longa em 1 de 6 itens; razão máxima 1,04.
- `social-media`: 1 de 6; razão máxima 1,07.
- `videomaker-storymaker`: 0 de 6; razão máxima 1,02.
- `editor-video`: 0 de 6; razão máxima 1,03.
- `tabela_md5=d3d955d58c4808d2822aabaa290aa830`. O POS da migration devolveu esse mesmo valor, medido em PROD dentro do ensaio.

Posição da `fortemente_pontua` depois da permutação (D-37), item 1..6. O máximo é 3 na mesma posição, por cargo:
- `sdr-social-seller` [1,2,3,2,3,3]
- `social-media` [1,4,2,3,4,4]
- `videomaker-storymaker` [4,4,4,3,1,1]
- `editor-video` [2,3,3,3,2,4]

No ar, a certa está na `ordem 1` em **19 de 19** itens `mc` dos quatro cargos.

### Comparação: banco no ar × rascunho de 30/09 × texto v2

Critério de «mais longa»: estrita, nos três casos. O rascunho foi medido pela mesma ferramenta. O banco no ar foi medido por `char_length` em PROD, só leitura.

| | a certa é estritamente a mais longa | razão (mín–máx) | amplitude máx. | certa na `ordem 1` |
|---|---|---|---|---|
| **No ar** — marketing (18 mc) | **16 de 18** (6 + 5 + 5) | 0,96–**2,85** | 262% | 18 de 18 |
| **No ar** — `sdr-social-seller` (1 mc) | 1 de 1 | 3,40 | 310% | 1 de 1 |
| **Rascunho 30/09** — marketing (18 mc) | **14 de 18** (4 + 5 + 5) | 0,96–1,25 | 73% | (o gerador antigo grava em escada) |
| **Texto v2** — marketing (18 mc) | **1 de 18** | 0,93–1,07 | 12% | permutada, máx. 3 por posição |
| **Texto v2** — `sdr-social-seller` (6 mc) | **1 de 6** | 0,99–1,04 | 8% | permutada, máx. 3 por posição |

Pelo critério proposto, o rascunho reprova em 15 de 18 itens e nos 3 cargos.

### Proposta sobre os casos abertos de marketing (D-35: «o planejador decide e mostra»)

**Os casos abertos ficam.** O texto dos três é o do rascunho, que é idêntico ao de PROD. Cada um leva a linha `*(mantido do banco no ar — content_hash …)*`, com o hash medido em PROD (só leitura, 2026-10-11):
- `social-media`: `31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79`
- `videomaker-storymaker`: `98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa`
- `editor-video`: `c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c`

O gerador reproduziu os três hashes. Não há INSERT para eles. O PRE amarrou os ids vivos, e o POS e a cláusula (i) do smoke exigiram os mesmos ids ainda ativos (`mantidos=3`).

Motivo: a regra da D-34 é sobre alternativas, e caso aberto não tem alternativa. Trocar o texto criaria um item novo sem ganho de medida, e a resposta da +claude6 apontaria para um item retirado.

O caso de `sdr-social-seller` é **novo**: é o work-sample de WhatsApp do banco de conhecimento, com rubrica de 5 dimensões que somam 100 e tempo de 12 min.

### Qual versão do DRAFT foi usada

A **árvore de trabalho**, só lida. O md5 do arquivo é o mesmo antes e depois da escrita, e `git status` continua ` M`. Ele não foi adicionado, editado, guardado em stash nem descartado.

A diferença entre a árvore de trabalho e o HEAD são as **90 linhas de opção** (45 − / 45 +), e mais nada:
- Cenários, dimensões, títulos e os três casos abertos são **idênticos** nas duas versões.
- O plano depende disso: os casos byte a byte iguais a PROD e os mesmos cenários e dimensões. A conclusão não muda com a versão.
- As alternativas foram reescritas a partir das da árvore de trabalho, que é o rascunho de 30/09.

## Task Commits

1. **Task 1 (tracer, TDD):** pré-vendas de ponta a ponta.
   - `f619a9c9` test — RED: 14 testes vermelhos.
   - `81aacbbe` feat — parser, tabela e gerador, mais o smoke52b.
   - `ec479fdb` docs — texto de pré-vendas.
2. **Task 2:** versão nova de marketing, tabela completa e ensaio dos quatro cargos.
   - `08b577cd` docs.
3. **Ajuste:** `97d66343` fix — os scripts não deixam `__pycache__` no repositório. O SQL gerado ficou idêntico.

**Tracer feedback gate:** o modo é interativo e `end-of-phase`, e o `<verify>` é só automatizado. Ele foi rodado de novo, ficou verde, e a execução seguiu para a Task 2.

### RED (Task 1)

- **Alvo:** `test_recusa_caso_mantido_divergente` em `scripts/geradores/test_gen_sjt_v2.py`.
- **Formato:** `unittest`, `NO_COLOR=1 python3 -I scripts/geradores/test_gen_sjt_v2.py -v`, exit 1, `FAILED (failures=13, errors=1)`.
- **Resultado:** `gsd-tools check tdd-red-evidence` → **RED_EVIDENCE_OK** (`target_test_failed`).
- **Avaliação semântica:**
  - O alvo rodou e falhou na asserção planejada: o stderr não continha `CASO MANTIDO DIVERGE DO AR: p52-teste`. O motivo é que o gerador ainda não existia (`can't open file`), ou seja, o comportamento estava ausente.
  - Não houve falha de import nem de coleta no alvo.
  - O único `ERROR` é o teste da permutação, que importa `sjt_texto` (ainda inexistente). Ele não era o alvo.
- **GREEN:** `81aacbbe` — os 14 testes passaram.

## Files Created/Modified

- `scripts/geradores/sjt_texto.py`: parser compartilhado, com `limpa`, `parse`, `content_hash`, `ordem_permutada`, `contagens` e `tabela_md5`.
- `scripts/geradores/tabela-comprimento-sjt.py`: a tabela da D-34, com `--criterio proposto`, `--md5` e `--auto-teste` (7 provas, entre elas a certa 2× maior, a amplitude, o posto por cargo, o empate, os pontos de código e o md5).
- `scripts/geradores/gen-sjt-v2.py`: o gerador da migration.
- `scripts/geradores/test_gen_sjt_v2.py`: 14 testes `unittest` do contrato. É um arquivo novo, fora da lista do plano (ver Desvios).
- `docs/specs/BANCO-SJT-V2.md`: o texto v2 dos quatro cargos.
- `supabase/tests/p52_banco_sjt_smoke.sql`: o smoke52b (a)–(i), com esperado 9. O escopo vem das GUCs `p52.banco_*`. Ele não escreve nada.

## Decisions Made

- **«Mais longa» é estrito.** Um empate no topo não aponta a certa pelo tamanho. O critério está escrito assim no cabeçalho do texto e no script. Se o operador quiser contar empates, basta trocar `>` por `>=` em `medir()`. Hoje nenhum cargo passaria de 2 com essa troca: o pior caso seria `sdr-social-seller`, com MC3 empatado, ficando em 2.
- **Valor da retirada: `'retired'`.** `perguntas.status` é `text` sem CHECK, e todo leitor compara com `'active'`.
- **Recusas extras no PRE (Rule 2):** `testes_aplicaveis` fora da forma de lista, item ativo sem hash, hash ocupado por outro cargo ou status, e `itens_ids` apontando para um item dos cargos do texto mesmo sem `cargo` no elemento. Sem elas, uma vaga que listasse itens antigos por id escaparia da D-29. Hoje todas passam: nenhuma vaga de nenhum status tem `itens_ids` nos quatro cargos (medido; a única com `itens_ids` é a `a32fe930`, do cargo `dentista`).
- **A retirada é feita com o UPDATE do plano, sem mudança.** O caso de hash nulo, em que `<> ALL` daria NULL, é recusado no PRE em vez de ser contornado no UPDATE.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - TDD] Arquivo de teste fora da lista `files_modified`**
- **Found during:** Task 1, que tem `tdd="true"` e exige teste vermelho antes da implementação.
- **Issue:** o plano não listava arquivo de teste. O `--auto-teste` da tabela não cobre as recusas do gerador nem o «mantido».
- **Fix:** criei `scripts/geradores/test_gen_sjt_v2.py`, com `unittest` da biblioteca padrão e nenhuma instalação. Ele cobre os quatro itens do `<behavior>` do plano.
- **Committed in:** `f619a9c9` (RED) e `81aacbbe`.

**2. [Rule 2 - Missing critical] Recusas extras no PRE**
- Descritas em «Decisions Made». **Committed in:** `81aacbbe`.

**3. [Rule 3 - Blocking/hygiene] `__pycache__` gerado pelo import**
- **Issue:** `python3 -I` com `import sjt_texto` gravava `scripts/geradores/__pycache__/`, e o arquivo aparecia como não rastreado.
- **Fix:** `sys.dont_write_bytecode = True` antes do import. Apaguei o diretório que eu tinha criado. O SQL gerado ficou idêntico (mesmo md5).
- **Committed in:** `97d66343`.

---

**Total deviations:** 3 auto-fixed (1 TDD, 1 missing critical, 1 hygiene).
**Impact on plan:** nenhum muda o escopo. As recusas extras só fecham caminhos de falha e passam no estado atual de PROD.

## Issues Encountered

- **Fora de escopo, só registrado:** o `dq()` do gerador antigo (`gen-sjt-marketing.py:17-19`) faz `.replace('among','')` sobre o texto inteiro. Qualquer «among» dentro de um item sumiria em silêncio. O banco no ar não tem esse trecho, e o gerador v2 não reusa essa função.
- A migration **não foi criada** em `supabase/migrations/`, como o plano proíbe antes do 52-17. O SQL do ensaio fica em `$TMPDIR/20261011000003_p52_banco_sjt_v2.sql` e o 52-17 o gera de novo a partir do texto aprovado.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Não há endpoint, função, policy nem grant novo, e o SQL gerado só escreve em `perguntas` e `perguntas_opcao_sjt`, como o plano prevê. As mitigações T-52-45/46/47/48/74/75 estão implementadas e provadas:
- **Ensaio:** 6+1, retirados = baseline, escada, `tabela_md5`, mantidos e LGPD-04.
- **Mutações:** POS (contagem), smoke (g) e PRE (mantido).

## User Setup Required

Nenhum.

## Next Phase Readiness

- **52-17 (portão de texto):** o operador aprova o texto e o critério numérico com base na tabela e na comparação acima. Depois, o SQL é gerado de novo para `supabase/migrations/20261011000003_p52_banco_sjt_v2.sql` e aplicado pelo `p46apply.cjs migrate`.
- **Aplicar fora de sessão de UAT:** um candidato com prova aberta nos itens retirados recebe `42704` em `get_opcoes_sjt`.
- **D-35(c) segue aberta para o operador:** o que fazer com o rascunho local depois da aprovação. Ele continua não commitado.

## Self-Check: PASSED

- FOUND: os 6 arquivos criados.
- FOUND: os commits `f619a9c9`, `81aacbbe`, `ec479fdb`, `08b577cd` e `97d66343` (ancestrais de HEAD).
- `check evaluation-scope --plan 52-16 --commits-only` → `resolved`, com os 5 commits.
- Nenhum arquivo em `supabase/migrations/` com a versão `20261011000003`.
- `docs/specs/DRAFT-banco-sjt-marketing.md` segue ` M`, com md5 inalterado.
- Verificação do plano, rodada de novo no fim:
  - `--auto-teste` OK.
  - Critério proposto com exit 0.
  - Gerador determinístico.
  - LGPD-04 limpo nos 2 arquivos, com os 7 termos do guarda.
  - Ensaio verde, `52b=9/9`.
  - 14/14 testes.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*
