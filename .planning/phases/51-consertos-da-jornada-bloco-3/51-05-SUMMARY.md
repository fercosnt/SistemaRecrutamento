---
phase: 51-consertos-da-jornada-bloco-3
plan: 05
subsystem: compliance
tags: [lgpd, recibo-exclusao, pii-inventory, export-allowlist, edge-functions, vitest]

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-04 publicado (serializa o push desta onda)"
  - phase: 45-motor-de-exclus-o-anonimiza-o
    provides: "motor anonimizar_candidato que preserva estado (item 5) e materializa a faixa etaria (ERASE-01)"
provides:
  - "recibo de exclusao: linha «sai» dados_de_cadastro com a lista do que o motor apaga (sem «endereço» generico, sem candidatos.estado nas origens)"
  - "recibo de exclusao: linha «mantém» estado_e_faixa_etaria, base_legal «LGPD, Art. 16, IV»"
  - "pii-inventory.yaml igual ao motor: candidatos.estado e candidatos.faixa_etaria_materializada como preservar_com_ressalva"
  - "EFs executar-direito-titular (v13) e exportar-meus-dados (v7) publicadas a partir do sha fixado da815714"
affects: [51-15, 51-17, motor-de-exclusao, recibo-exclusao, export-allowlist]

actuals:
  tokens: 14835        # chars/4 sobre o diff realizado 5e74aa60..da815714 (59341 octetos; so codigo, sem .planning: 26223 → 6556)
  tasks: 3
  commits: 2           # MEDIDO: git rev-list --count 5e74aa60..HEAD no momento da escrita
plan_head_before: 5e74aa60d3de92b8825b24d7c3d2346287752425
plan_head_after: da8157149989b968fee7428fb92665b112c685c6

tech-stack:
  added: []
  patterns:
    - "RED contra a base: com a implementacao no tracer antes dos testes (ordem do plano), os casos novos sao provados contra os artefatos da refs/gsd/51-05/base trocados no disco e restaurados por git checkout --"
    - "Sonda de cobertura do motor derivada do proprio artefato: as colunas candidatos.* de colunas_origem da linha «sai» viram, uma a uma, regex de atribuicao no corpo vivo sem comentarios"

key-files:
  created:
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-05/task2.json
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-05/task2-junit.xml
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-05/prova-banco.txt
  modified:
    - docs/compliance/pii-inventory.yaml
    - docs/compliance/sql/gen-recibo-exclusao.cjs
    - docs/compliance/recibo-exclusao.json
    - supabase/functions/_shared/reciboExclusao.ts
    - src/features/privacidade/constants/reciboExclusao.generated.ts
    - docs/compliance/pii-inventory.md
    - docs/compliance/export-allowlist.json
    - supabase/functions/_shared/exportAllowlist.ts
    - docs/compliance/__tests__/genReciboExclusao.test.ts
    - src/features/privacidade/components/__tests__/ReciboExclusao.test.tsx

key-decisions:
  - "Export allowlist: so a proveniencia de candidatos.estado muda (inventario:anonimizar → inventario:preservar_com_ressalva); o CONJUNTO exportado e o mesmo (395 colunas, 32 tabelas) — sem bump de versao (regra do cabecalho de export-scope-rules.yaml); faixa_etaria_materializada segue com proveniencia decisoes_por_coluna"
  - "VALUES dos dois arquivos de drift inalterados: os tres blocos (526 linhas) iguais a saida do gerador; nenhum dos dois arquivos foi tocado, e por isso a mutacao do portao (Passo 2) nao se aplicava"
  - "exportar-meus-dados redeployada porque _shared/exportAllowlist.ts mudou (proveniencia + gerado_em), mesmo com o conjunto igual — a regra do plano e por arquivo mudado"
  - "Achado fora do D-23 (disponibilidade) registrado como WINDOWS 89 e nao consertado: o conserto e motor (D-23 proibe nesta fase e e escrita em purga viva) ou reclassificacao com base legal (redacao do operador, precedente C-10)"

patterns-established:
  - "Mutacao da regressao exata como caso de gate: (16) devolve estado ao «sai» e exige DIREÇÃO ERRADA nomeando candidatos.estado"

requirements-completed: [JORN-49]

coverage:
  - id: D1
    description: "O recibo gerado: dados_de_cadastro sem «endereço» generico e com a lista do motor, sem candidatos.estado; linha «mantém» estado_e_faixa_etaria com base legal LGPD, Art. 16, IV; inventario e artefatos em sincronia"
    requirement: JORN-49
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genReciboExclusao.test.ts#(14) (15) (16)"
        status: pass
      - kind: other
        ref: "npm run -s check:recibo-exclusao && check:pii-inventory-md && check:export-allowlist && check:matriz-retencao"
        status: pass
    human_judgment: false
  - id: D2
    description: "A tela do recibo mostra «Estado e faixa etária» com a base legal na coluna «mantém» (dois tempos, todos os recortes) e a lista do motor na linha dados_de_cadastro"
    requirement: JORN-49
    verification:
      - kind: unit
        ref: "src/features/privacidade/components/__tests__/ReciboExclusao.test.tsx#(r10) (r11) (r12)"
        status: pass
    human_judgment: false
  - id: D3
    description: "O texto novo bate com o motor vivo (D-51): materializa a faixa, anula CEP e genero, nao atribui estado; nos 2 titulares anonimizados UF de 2 letras, faixa nao nula, endereco nulo"
    requirement: JORN-49
    verification:
      - kind: other
        ref: "node p46apply.cjs sql (Q1/Q2 em .red-51-05/prova-banco.txt)"
        status: pass
    human_judgment: true
    rationale: "As consultas do plano passam, mas a sonda extra achou que a promessa de apagar a disponibilidade (pre-existente, mantida pela redacao do planejador) nao tem executor no motor — WINDOWS 89. O EDGE-PROBE do plano («todo campo que o recibo lista como apagado é apagado pelo motor») nao vale para disponibilidade; decisao do operador"
  - id: D4
    description: "EFs executar-direito-titular e exportar-meus-dados publicadas a partir do sha fixado; drift do export aprovado ao vivo"
    verification:
      - kind: other
        ref: "efdeploy: OK · version=13 · status=ACTIVE (executar-direito-titular); version=7 · status=ACTIVE (exportar-meus-dados); p44_export_drift_smoke pass=true n_drift=0"
        status: pass
    human_judgment: false
  - id: D5
    description: "Cliente publicado: marcador estado_e_faixa_etaria servido por https://rh.beautysmile.com.br no chunk eager index-ChXz-NQd.js"
    verification:
      - kind: other
        ref: "crawler do <verify> da Task 3: PRESENTE em PROD [/assets/index-ChXz-NQd.js]"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-10-09
status: complete
---

# Phase 51 Plan 05: O recibo de exclusão diz o que sai e o que fica — Summary

**O recibo troca «endereço» pela lista do que o motor apaga e ganha a linha «Estado e faixa etária», que fica sem vínculo com o nome, para relatório agregado, sob a LGPD, Art. 16, IV. O inventário passa a dizer o mesmo que o motor (`estado` e `faixa_etaria_materializada` como `preservar_com_ressalva`), as duas EFs foram redeployadas do sha fixado e o texto já está no ar. Ficou um achado anterior a este plano: o recibo promete apagar a disponibilidade, e o motor não apaga (WINDOWS 89).**

## Performance

- **Duration:** 10 min
- **Started:** 2026-10-09T03:52:28Z
- **Completed:** 2026-10-09T04:02:43Z
- **Tasks:** 3 (2 commits de código; a Task 3 não tem arquivo de repositório)
- **Files modified:** 10 de código (todos editados ou regenerados) + 3 de evidência em `.red-51-05/`
- **tsc (D-53):** 89 nos dois commits (teto 90)

## Accomplishments

- **Inventário igual ao motor (D-34/C-10):** `candidatos.estado` passou de `anonimizar` para `preservar_com_ressalva`, com nota que cita a preservação pelo motor (P45, item 5) e a base legal. `candidatos.faixa_etaria_materializada` entrou no inventário como `preservar_com_ressalva`, tipo `text`. O tipo foi medido em PROD com `information_schema.columns` (`text`, nulável).
- **Recibo (D-23):**
  - A linha «sai» `dados_de_cadastro` diz: «Nome, e-mail, telefone, CPF, data de nascimento, gênero, CEP, rua, número, complemento, bairro, cidade, redes sociais e disponibilidade vão ser apagados do seu cadastro.» O passado é equivalente. `estado` saiu das origens.
  - A linha nova de «mantém», `estado_e_faixa_etaria` («Estado e faixa etária»), diz: «Ficam guardados o seu estado (UF) e a sua faixa etária, sem vínculo com o seu nome, para relatório agregado.» Tem `aplicavel_quando: 'sempre'`, `base_legal: 'LGPD, Art. 16, IV'` e origens `candidatos.estado` e `candidatos.faixa_etaria_materializada`.
- **Tudo regenerado pelos geradores, nada editado à mão:**
  - `recibo-exclusao.json` e os dois espelhos TS: 12 linhas «sai», 10 «mantém», 236 de 236 colunas com veredito.
  - `pii-inventory.md`: 22 anonimizar, 51 preservar c/ ressalva, total explícito 250.
  - `export-allowlist.json` e `_shared/exportAllowlist.ts`.
- **Testes:** 3 casos novos no gerador e 3 na tela. Com os novos, as 14 suítes do `<verify>` passam inteiras: 246/246.
- **Publicação:** `executar-direito-titular` v13 e `exportar-meus-dados` v7 estão ACTIVE. O drift do export foi aprovado ao vivo. O push foi por sha, com enumeração. O marcador é servido em PROD pelo chunk eager `index-ChXz-NQd.js`.

## Os quatro `check:`, antes e depois

| check | baseline (5e74aa60, antes de mexer) | depois (cd9d5a3b e da815714) |
|---|---|---|
| `check:export-allowlist` | `OK: … export-allowlist.json e … exportAllowlist.ts estão em sincronia com as três fontes.` | `OK` (mesma linha). Antes da regeneração deu `DIVERGENTE`, esperado: a proveniência de `estado` mudou |
| `check:recibo-exclusao` | `OK: … recibo-exclusao.json, … reciboExclusao.ts e … reciboExclusao.generated.ts estão em sincronia com … pii-inventory.yaml.` | `OK` |
| `check:matriz-retencao` | `OK: … matriz-retencao.json e … matrizRetencao.generated.ts estão em sincronia …` | `OK` |
| `check:pii-inventory-md` | `OK: pii-inventory.md está em sincronia com o YAML.` | `OK` |

O verify do JSON da Task 1 (`RECIBO DIVERGE …`) imprimiu: `recibo: sai sem endereco generico; mantem com estado e faixa (Art. 16, IV)`.

## Export allowlist, bump e VALUES

- **A allowlist mudou?** Sim, mas só na proveniência. Em `candidatos`, `"estado": "inventario:anonimizar"` virou `"inventario:preservar_com_ressalva"`, e o `gerado_em` mudou. `faixa_etaria_materializada` continua `decisoes_por_coluna`: a decisão explícita do `export-scope-rules.yaml` vence.
- **Bump?** Não. O conjunto exportado é o mesmo (32 tabelas, 395 colunas). Pela regra do cabeçalho de `export-scope-rules.yaml`, a versão só sobe quando o conjunto muda, e segue `1.4.0`.
- **VALUES mudaram?** Não. Comparei `--sql-values`, `--sql-values-excluidas` e `--sql-values-tabelas` com os blocos de `docs/compliance/sql/05-export-allowlist-drift.sql` e de `supabase/tests/p44_export_drift_smoke.sql`. Nos dois arquivos, as 526 linhas são iguais à saída do gerador, na mesma ordem. Nenhum dos dois foi tocado.

## Task Commits

1. **Task 1 (tracer):** `cd9d5a3b` feat(51-05): tracer — recibo diz o que sai e o que fica (estado e faixa etaria, Art. 16 IV) e inventario igual ao motor
   - Gate do tracer: modo interativo, `end-of-phase`, `<verify>` só automatizado. Depois do commit o verify rodou de novo: quatro checks verdes e o JSON conferido. Só então a execução seguiu.
2. **Task 2:** `da815714` test(51-05): recibo — sai sem endereco generico, mantem com estado e faixa (Art. 16, IV)
3. **Task 3:** sem commit. Tudo saiu por deploy de EF e push, e os logs estão no scratchpad e em `$TMPDIR`.

**Plan metadata:** commit `docs(51-05)` deste SUMMARY. O STATE e o ROADMAP vão num commit separado, no molde do 51-04.

## Task 2: testes, RED e prova no banco

### Casos novos

- `genReciboExclusao.test.ts`:
  - **(14)** `dados_de_cadastro` não casa `/endere[cç]o/` nos dois tempos e contém «gênero, CEP, rua, número, complemento, bairro, cidade». As origens não têm `candidatos.estado` e têm as 7 colunas do motor. Nenhuma linha «sai» reivindica `estado` ou a faixa.
  - **(15)** A linha «mantém» `estado_e_faixa_etaria` existe, com `base_legal` = «LGPD, Art. 16, IV», rótulo, `sempre`, as duas origens e «sem vínculo com o seu nome» / «relatório agregado» nos dois tempos.
  - **(16)** Mordida da regressão exata. A mutação devolve `'estado'` ao «sai» e o tira do «mantém». A geração sai 1 com `DIREÇÃO ERRADA` nomeando `candidatos.estado`.
- `ReciboExclusao.test.tsx`:
  - **(r10)** A linha «Estado e faixa etária» aparece com «LGPD, Art. 16, IV» no mesmo nó da coluna «mantém», nos dois tempos, e nunca na coluna «sai».
  - **(r11)** `dados_de_cadastro` aparece na tela com a lista do motor e sem «endereço».
  - **(r12)** A linha aparece nos 4 recortes.
- A expressão travada «sem ligação com você» continua exigida no (4). Nenhum caso existente foi removido.

### TDD: evidência RED

O plano põe a implementação no tracer (Task 1) antes dos testes (Task 2). Por isso o RED foi provado **contra a base**:

- `pii-inventory.yaml`, `gen-recibo-exclusao.cjs`, `recibo-exclusao.json` e `reciboExclusao.generated.ts` foram trocados no disco pela versão de `refs/gsd/51-05/base` (`5e74aa60`).
- Rodei os dois testes com `--reporter=junit` e restaurei os quatro arquivos com `git checkout -- <arquivo>`. `git status` ficou vazio para eles.
- **Resultado:** `RED_EVIDENCE_OK` (`target_test_failed`) no alvo **(14)**. Exit 1, com 28 testes: 22 passaram e 6 falharam. **Os 6 que falharam são exatamente os 6 casos novos.** Registro em `.red-51-05/task2.json` e relatório em `.red-51-05/task2-junit.xml`.
- **Avaliação semântica:**
  - (14), (15), (r10), (r11) e (r12) falham na asserção planejada, pelo comportamento que falta na base: «promete apagar o endereço inteiro», «linha … ausente», «expected … to contain 'gênero, CEP, …'».
  - O (16) falha na base pela âncora da mutação («casa 0 vez»). É esperado: a mutação descreve a regressão sobre o gerador novo. A mordida dele é a própria asserção `status=1` + `DIREÇÃO ERRADA`, verde em HEAD.
- **Em HEAD:** 28/28. Na suíte do `<verify>` inteira, 246/246.
- **TDD Gate Compliance:** a Task 2 é `tdd="true"` e tem um commit `test(51-05)`. O commit `feat(51-05)` a precede, porque o plano manda o tracer primeiro. A disciplina RED está coberta pela prova contra a base, e não pela ordem dos commits.

### Prova no banco (D-51, só leitura)

As consultas literais e as saídas estão em `.red-51-05/prova-banco.txt`, medidas às 03:57:02Z.

**Q1 — corpo vivo de `anonimizar_candidato(uuid,boolean)`, sem comentários.** É a única assinatura viva:

| md5_prosrc | materializa_faixa | anula_cep | anula_genero | nao_atribui_estado |
|---|---|---|---|---|
| `4624854408950110cbfebc971481145a` | true | true | true | true |

O md5 não é o `ecfec02c…` que o RESEARCH mediu: o motor mudou desde aquela medição. Quem decide são as flags, e as quatro dão `true`.

**Q2 — titulares anonimizados**, pelo discriminador do que o motor grava: `user_id` e `cpf` nulos e data fixa. A sentinela textual do nome não foi usada.

| uf_ok | faixa_ok | endereco_nulo | anonimizados |
|---|---|---|---|
| 2 | 2 | 2 | 2 |

As quatro contagens são iguais e ≥ 1, e batem com as 2 anonimizações reais que o RESEARCH mediu.

**Sonda extra (EDGE-PROBE, além do que o plano pede):**

- **Q3:** cada coluna `candidatos.*` das origens de `dados_de_cadastro`, num total de 20, é atribuída no corpo sem comentários (`[^_a-z]col\s*=`). As 20 deram `true`.
- **Q4/Q5:** nos 2 anonimizados, CEP, logradouro, número, complemento, bairro e gênero estão nulos (2/2). Instagram, LinkedIn, as duas URLs, `como_conheceu_detalhes` e `avatar_url` também estão nulos (2/2). O `celular` não é nulo: o motor grava um valor fixo de formato, e o número real não fica. «Telefone apagado» vale.
- **Q8:** `candidaturas.curriculo_nome_original` está nulo nas 3 candidaturas desses titulares.
- **Q3/Q6/Q7 — a disponibilidade diverge.** O corpo vivo muta 26 tabelas, e `disponibilidade` não é uma delas. Nenhuma função de `public` faz `DELETE`/`UPDATE` nela. A FK `disponibilidade_candidato_id_fkey` é `ON DELETE CASCADE`, mas o motor faz UPDATE no `candidatos`, não DELETE. Nos 2 titulares anonimizados, a linha de `disponibilidade` continua lá e com valor (2/2). Ver «Issues Encountered».

## Task 3: publicação

| Passo | Resultado |
|---|---|
| Pin | `refs/gsd/51-05/sha` = `da8157149989b968fee7428fb92665b112c685c6` (= HEAD; árvore limpa em `supabase src scripts docs/compliance p46apply.cjs efdeploy.cjs database.types.ts`, no mesmo comando) |
| `executar-direito-titular` (03:59:18Z) | `--dry-run` com 5 arquivos, `_shared/reciboExclusao.ts` com 32152 octetos. Depois `efdeploy: OK · version=13 · status=ACTIVE · verify_jwt=true` |
| `exportar-meus-dados` (03:59:25Z) | `_shared/exportAllowlist.ts` mudou na Task 1, então foi redeployada: `efdeploy: OK · version=7 · status=ACTIVE · verify_jwt=true` |
| Drift do export ao vivo | `p44_export_drift_smoke` deu `pass: true`, com 75/75 tabelas vivas com disposição, 32 em escopo, 451/451 pares com veredito e `n_drift: 0`. O comando do `<verify>` imprimiu `drift do export aprovado ao vivo` |
| Mordida do portão de drift | Não se aplicava: o plano a pede só se os VALUES mudassem, e eles não mudaram. A igualdade VALUES = gerador é presa por construção pela `(k)`/`(k4)` de `exportAllowlist.test.ts`, que rodou verde no `<verify>` da Task 2. Os snapshots `(a)`/`(b)` não mudam porque o conjunto é o mesmo |
| Build | `npm run build` passou (`assert-chunks PASSED`). `grep -rl estado_e_faixa_etaria build/assets/` achou `build/assets/index-ChXz-NQd.js`, o chunk eager |
| Push | Por sha, com HEAD = pin no código fora de `.planning` (`git diff --quiet pin HEAD -- . ':!.planning'`), no mesmo comando da enumeração |
| Publicação conferida | `origin/main` = HEAD = `da815714` e `origin/main..HEAD` vazio. O crawler deu `AUSENTE` na 1ª tentativa (Vercel ainda publicando) e `PRESENTE em PROD: estado_e_faixa_etaria ["/assets/index-ChXz-NQd.js"]` na 2ª, às 04:02:24Z |

Enumeração do push (`scripts/p50_enumera.cjs`, `4676feb6..da815714`):

```
317471c4 planning docs(51-04): complete notas obrigatorias e guarda dos nomes dos instrumentos plan — …
5e74aa60 planning docs(51-04): STATE/ROADMAP — 51-04 concluido, 4/17 (…)
cd9d5a3b codigo   feat(51-05): tracer — recibo diz o que sai e o que fica (estado e faixa etaria, Art. 16 IV) e inventario igual ao motor
da815714 codigo   test(51-05): recibo — sai sem endereco generico, mantem com estado e faixa (Art. 16, IV)
enumeracao ok: 4 commit(s) em 4676feb6..da815714
   4676feb6..da815714  da8157149989b968fee7428fb92665b112c685c6 -> main
```

## Escritas em PROD

Todas são aditivas ou corretivas e reversíveis, por redeploy da versão anterior:

1. **EF `executar-direito-titular` → v13 ACTIVE.** Os recibos futuros saem com o texto novo.
2. **EF `exportar-meus-dados` → v7 ACTIVE.** Só a proveniência de `estado` mudou no espelho da allowlist, e o conjunto exportado é o mesmo.
3. **Front:** push de `da815714` para `main`, publicado pela Vercel.

Nenhuma escrita de dado. O motor não mudou (D-23). Nada foi escrito em `solicitacoes_dados` nem em e-mail já enviado, e os recibos já emitidos ficam como foram. Todas as consultas ao banco abriram com `set transaction read only`, e o smoke de drift é read-only. Nenhuma migration, então nada novo no ledger de migrations.

## Files Created/Modified

- `docs/compliance/pii-inventory.yaml`: `estado` reclassificado e `faixa_etaria_materializada` inventariada.
- `docs/compliance/sql/gen-recibo-exclusao.cjs`: texto de `dados_de_cadastro` e origens; item novo `estado_e_faixa_etaria` em `ITENS_MANTEM`.
- Regenerados: `docs/compliance/recibo-exclusao.json`, `supabase/functions/_shared/reciboExclusao.ts`, `src/features/privacidade/constants/reciboExclusao.generated.ts`, `docs/compliance/pii-inventory.md`, `docs/compliance/export-allowlist.json` e `supabase/functions/_shared/exportAllowlist.ts`.
- `docs/compliance/__tests__/genReciboExclusao.test.ts`: (14), (15) e (16).
- `src/features/privacidade/components/__tests__/ReciboExclusao.test.tsx`: (r10), (r11) e (r12).
- `.planning/phases/51-consertos-da-jornada-bloco-3/.red-51-05/`: `task2.json`, `task2-junit.xml` e `prova-banco.txt`.
- `.planning/WINDOWS.md`: entrada 89 (`unmet-truth`).

## Decisions Made

- **Sem bump da allowlist.** A reclassificação muda a proveniência e não o conjunto, como a regra do cabeçalho de `export-scope-rules.yaml` determina.
- **`exportar-meus-dados` redeployada.** O plano condiciona o redeploy ao arquivo `_shared/exportAllowlist.ts` ter mudado, e ele mudou.
- **O achado da disponibilidade foi registrado, não consertado.** Ver «Issues Encountered».

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Comentário no gerador quebraria o `grep -c … = 1` da aceitação**
- **Found during:** Task 1
- **Issue:** o comentário que explica a saída de `estado` citava o id `estado_e_faixa_etaria`, e a aceitação exige exatamente 1 ocorrência no gerador.
- **Fix:** o comentário passou a citar o rótulo («Estado e faixa etária»), e não o id.
- **Files modified:** `docs/compliance/sql/gen-recibo-exclusao.cjs`
- **Verification:** `grep -c estado_e_faixa_etaria` dá 1.
- **Committed in:** `cd9d5a3b`

### Acréscimos dentro do escopo

- **Sonda extra no banco (Q3–Q8).** O plano pede duas consultas. As outras seis são só leitura e servem para medir o EDGE-PROBE do plano («todo campo que o recibo lista como apagado é apagado pelo motor») na linha que este plano reescreveu. Foi delas que saiu o achado da disponibilidade.
- **Caso de mordida (16) no teste do gerador.** Não está no `<behavior>`. Prova que o gerador reprova a regressão exata deste plano.

**Total deviations:** 1 auto-fixed (Rule 3) e 2 acréscimos de verificação. **Impact:** nenhum no escopo nem no texto. Os acréscimos só medem.

## Issues Encountered

### O recibo promete apagar a disponibilidade, e o motor não apaga (WINDOWS 89, `unmet-truth`)

- **O que foi medido:**
  - O corpo vivo de `anonimizar_candidato` (md5 `46248544…`) não cita a tabela `disponibilidade`, nem mesmo sem comentários.
  - Nenhuma função de `public` escreve nela.
  - A FK é `ON DELETE CASCADE`, mas o motor não apaga a linha de `candidatos`.
  - Em PROD, os 2 titulares anonimizados ainda têm a linha de `disponibilidade` com valor.
- **Onde está a promessa:** na linha «sai» `dados_de_cadastro` («… redes sociais e disponibilidade vão ser apagados»), com `passo_motor: tombstone_candidato` e as 4 colunas de `disponibilidade` nas origens. O inventário as classifica como `apagar`, e é por isso que o gerador aceita.
- **Não é regressão deste plano:**
  - O texto anterior já prometia isso.
  - A redação do planejador mantém «disponibilidade».
  - As consultas que o plano manda rodar (Q1/Q2), com o critério de PARADA delas, passam inteiras.
  - O texto novo é estritamente mais verdadeiro que o anterior. Por isso a publicação seguiu.
- **Por que não foi consertado aqui:** as duas saídas pedem decisão do operador.
  - (a) O motor passa a apagar `disponibilidade`. Isso muda o motor, o que o D-23 proíbe nesta fase, e é escrita em purga viva, que tem portão.
  - (b) As 4 colunas saem de `apagar` e a linha vai para «mantém» com uma `base_legal`. A redação da base legal é do operador (precedente C-10).
- **Consequência para a verificação:** o EDGE-PROBE do JORN-49 vale para endereço, `estado` e faixa, e **não** vale para disponibilidade. O JORN-49 continua `[ ]` no REQUIREMENTS pelo gate de ID compartilhado, porque o 51-17 também o declara (`ready-ids` 0/1).

## User Setup Required

None. Nenhuma configuração externa.

## Next Phase Readiness

- A Onda A termina com este plano (D-27). O 51-15 (Onda B) mexe de novo no gerador e no inventário (tabela nova do JORN-42) e parte de `da815714`.
- Pendente para o operador: WINDOWS 89 (disponibilidade), escolher (a) ou (b).
- Os commits `docs(51-05)` deste SUMMARY e do STATE/ROADMAP ficam locais. Sobem no próximo push enumerado, como os do 51-04 subiram neste, classificados como `planning`.

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-09*

## Self-Check: PASSED

- Arquivos: os 10 de código e os 3 de evidência existem (`[ -f ]`).
- Commits: `cd9d5a3b` e `da815714` são ancestrais de HEAD. `check evaluation-scope --plan 51-05 --commits-only` dá `resolved`, com os 2 commits.
- Os quatro `check:` dão OK de novo. A suíte do `<verify>` da Task 2 dá 246/246, com tsc 89. O drift ao vivo deu `pass: true`, e o marcador está PRESENTE em PROD.
- Não cumprido: o EDGE-PROBE para disponibilidade (WINDOWS 89). Está registrado acima e não é falha de autoverificação.
