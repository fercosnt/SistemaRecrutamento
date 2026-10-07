---
phase: 44-exporta-o-acesso
plan: 19
subsystem: privacidade (portões de teste LGPD — smoke de drift e canal de privacidade)
tags: [lgpd, export, vitest, portao-de-portao, smoke-drift, wr-04, wr-05, wr-06, in-02, fail-closed]
status: complete

requires:
  - phase: 44-exporta-o-acesso (44-15)
    provides: "semComentarioSql, colapsar, corpoDaCte, problemasDaEstrutura, problemasDoPredicado e a (k4) M1–M18"
  - phase: 44-exporta-o-acesso (44-18)
    provides: "árvore estável (BD-21: série) — o (cr5)/(cr5b) da suíte de privacidade verde"
provides:
  - "saidasDoGerador() + problemasDosValues(nome, sql): corpo de cada CTE de VALUES preso à saída REAL do gerador, no relatório 05 e no smoke"
  - "BLOCO_GATE_CANONICO (712 caracteres) comparado em problemasDaEstrutura"
  - "(k4) M19–M24 e META contíguo 1..MUTACOES.length"
  - "cp3 com alcance src + supabase/functions + index.html + public; cp4 por fronteira; cp5 controle da fronteira"
  - "docblock de canalPrivacidade.ts sem a forma do endereço morto (IN-02)"
affects: [44-20, 44-21, 44-22]

actuals:
  tokens: 5208        # chars/4 sobre as linhas +/- do diff ca1fea47..64139d5c (20833 octetos)
  tasks: 3
  commits: 3          # git rev-list --count plan_head_before..HEAD, medido antes do commit de metadados
plan_head_before: ca1fea4777f86d2eea6e9cd3b5b8d846016ff750
plan_head_after: 64139d5c03f39a7078d6cd824a629a32f84335e3

tech-stack:
  added: []
  patterns:
    - "Pino do TODO em vez de mais uma forma: corpo da CTE = saída do gerador executado; bloco = texto canônico"
    - "Saída do gerador obtida por execFileSync (cache de módulo), nunca reimplementada no teste"
    - "Na prova de mordida, o problema do pino de cobertura não conta para alvos de checagem nomeada — cada checagem nomeada continua tendo de morder sozinha"
    - "Casamento de e-mail por fronteira: (^|[^a-z0-9._%+-]) + endereço escapado, flags im"

key-files:
  created:
    - .planning/phases/44-exporta-o-acesso/44-19-SUMMARY.md
  modified:
    - docs/compliance/__tests__/exportAllowlist.test.ts
    - src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts
    - src/features/privacidade/constants/canalPrivacidade.ts

key-decisions:
  - "O corpo de cada CTE de VALUES é comparado com `colapsar('VALUES ' + saída)` do gerador EXECUTADO; a extração canônica e a contagem permissiva ficam (diagnósticos diferentes)"
  - "BLOCO_GATE_CANONICO é escopo deliberado (o bloco tem propósito fixo); só os textos de mensagem são normalizados, e o prefixo de cada RAISE segue preso pelas checagens nomeadas"
  - "Na (k4), para alvos de checagem nomeada (M4–M18) o problema do pino do bloco é filtrado: o trecho citado em M5 contém «EXCEPTION WHEN» e cobriria a remoção da checagem nomeada"
  - "cp4 lê src/ com as quatro extensões (ts|tsx|json|html), sem testes — produção do front, não só ts/tsx"

patterns-established:
  - "META da (k4) confere 1..MUTACOES.length, não uma constante — rota nova não exige editar o META"

requirements-completed: [EXPORT-01, EXPORT-04]

coverage:
  - id: D1
    description: "WR-04: linha do VALUES fora da saída do gerador (cast na tupla, UNION ALL SELECT) reprova a (k) nos dois arquivos"
    requirement: EXPORT-04
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k) os três `VALUES` do relatório E do smoke de drift estão em sincronia com o artefato"
        status: pass
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k4) M19 · tupla com cast `::text` dentro do VALUES da allowlist (WR-04)"
        status: pass
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k4) M20 · `UNION ALL SELECT` dentro da CTE `allowlist` (WR-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "WR-05: fluxo de controle editado dentro do DO $gate$ (RETURN, IF false, reatribuição de r, termo de população a menos) reprova a (k3)"
    requirement: EXPORT-04
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k3) o smoke falha alto, falha FECHADO e roda o MESMO predicado do relatório"
        status: pass
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k4) M21–M24"
        status: pass
    human_judgment: false
  - id: D3
    description: "WR-06 + IN-02: endereço morto vigiado em src, supabase/functions (inclusive o .json importado pelo bundle), index.html e public; canal único por fronteira; docblock sem a forma do endereço morto"
    requirement: EXPORT-01
    verification:
      - kind: unit
        ref: "src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts#(cp3) (cp4) (cp5)"
        status: pass
      - kind: other
        ref: "npm run -s lint (89 error TS, rc 2 — baseline)"
        status: pass
    human_judgment: false
  - id: D4
    description: "templates_email (copy de e-mail mantida no banco) sem o endereço morto, medido só leitura em PROD"
    requirement: EXPORT-01
    verification:
      - kind: manual_procedural
        ref: "node p46apply.cjs run <scratch> (SET TRANSACTION READ ONLY; só contagens) — 0 de 3"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-10-07
---

# Phase 44 Plan 19: Portões do smoke e do canal Summary

**O smoke de drift deixou de poder ser calado por uma linha de `VALUES` fora do formato ou por fluxo de controle no `DO $gate$`: o corpo de cada CTE de `VALUES` é preso à saída real do gerador e o bloco a um texto canônico de 712 caracteres. M19–M24 foram vistas verdes contra os checadores de HEAD e mordem depois. O canal de privacidade passou a ser vigiado em `src/`, `supabase/functions/`, `index.html` e `public/`, e o cp4 casa por fronteira.**

## Performance

- **Duração:** ~10 min
- **Início:** 2026-10-07T12:23:15Z
- **Fim:** 2026-10-07T12:33Z
- **Tasks:** 3 (Task 1 TRACER)
- **Arquivos modificados:** 3 (+ este SUMMARY, STATE.md e ROADMAP.md na escrituração)

## Accomplishments

- **WR-04:** `saidasDoGerador()` executa `gen-export-allowlist.cjs` com as três flags `--sql-values*` (`execFileSync`, cache de módulo, ~0,04 s por flag). `problemasDosValues(nome, sql)` compara cada corpo de CTE com `colapsar('VALUES ' + saída)`. A (k) passa a aplicar isso ao relatório `05` e ao smoke. A extração canônica e a contagem permissiva ficaram intactas.
- **WR-05:** `BLOCO_GATE_CANONICO` foi derivado do smoke de HEAD: 712 caracteres, começo e fim iguais aos medidos pelo planejador. `problemasDaEstrutura` o compara com o bloco normalizado e, quando diverge, aponta o primeiro índice divergente. Nenhuma checagem nomeada do 44-15 saiu.
- **(k4):** entraram M19–M24, e o META agora confere 1..`MUTACOES.length`. M4–M18 continuam mordendo pelas próprias checagens nomeadas (veja a Deviation 1).
- **WR-06:** o cp3 tem alcance ampliado e prova de alcance, e uma mordida em memória. O cp4 casa por fronteira, com mensagem que não afirma causa única. O cp5 testa a fronteira nos dois sentidos.
- **IN-02:** o docblock de `canalPrivacidade.ts` aponta `.planning/DECISAO-ENCARREGADO.md` em vez de descrever a parte local e o domínio. O valor exportado não mudou.
- **`templates_email`:** medido só leitura em PROD. Nenhuma das 3 linhas contém o endereço morto, e nenhuma contém `@`.

## Furos reproduzidos (checadores de HEAD) e mordida depois

### WR-04: M19/M20 com a (k) e a (k3) de HEAD (Task 1, passo 1, antes de `problemasDosValues` existir)

O caso temporário rodou a (k) canônica, a (k) permissiva e a (k3) sobre o texto mutado e exigia que alguma delas reprovasse. As duas saíram **VERMELHAS**, ou seja, os checadores de HEAD não viram nada:

```
AssertionError: M19 · tupla com cast `::text` dentro do VALUES da allowlist (WR-04): com os checadores de HEAD — (k) canônica reprova=false, (k) permissiva reprova=false (permissiva {"allowlist":395,"excluidas":56,"tabelas":75} vs canônica 395/56/75), (k3) devolveu []
AssertionError: M20 · `UNION ALL SELECT` dentro da CTE `allowlist` (WR-04): com os checadores de HEAD — (k) canônica reprova=false, (k) permissiva reprova=false (permissiva {"allowlist":395,"excluidas":56,"tabelas":75} vs canônica 395/56/75), (k3) devolveu []
Tests  3 failed | 33 passed (36)      ← M19, M20 e o META antigo (length 18)
```

### WR-05: M21–M24 com o `problemasDaEstrutura` de HEAD (Task 2, passo 1)

```
M21 · RETURN; antes da guarda de drift ……………… problemasDaEstrutura devolveu []   problemasDoPredicado = []
M22 · IF false THEN … END IF; em volta da guarda … problemasDaEstrutura devolveu []   problemasDoPredicado = []
M23 · r := r || '{"n_drift":0}'::jsonb; ………………… problemasDaEstrutura devolveu []   problemasDoPredicado = []
M24 · termo n_colunas_vivas_em_escopo retirado …… problemasDaEstrutura devolveu []   problemasDoPredicado = []
Tests  4 failed | 36 passed (40)
```

### Depois do conserto

`npx vitest run docs/compliance/__tests__`: **5 arquivos, 97 testes, todos verdes**. A (k) e a (k3) estão verdes sobre os arquivos reais e M1–M24 mordem.

### Mapa rota → mutação → problema nomeado (M19–M24)

Problemas lidos por uma cópia descartável com alvo inválido, para que a mensagem de falha imprimisse a lista inteira. A cópia foi apagada em seguida.

| Rota (revisor/planejador) | Mutação | Checador | Problema nomeado (a lista inteira) |
|---|---|---|---|
| cast dentro da tupla (WR-04) | M19 | `values` | `allowlist: o corpo da CTE em smoke (mutado em memória) diverge da saída do gerador (--sql-values) a partir do caractere 9 — arquivo «VALUES ('candidatos'::text,'coluna_nova_vazando'), …» vs gerador «VALUES ('agendamentos_entrevista','candidatura_id'), …» (WR-04)` |
| `UNION ALL SELECT` na CTE (WR-04) | M20 | `values` | `allowlist: … diverge da saída do gerador (--sql-values) a partir do caractere 15156 — arquivo «…acoes_dados','tipo') UNION ALL SELECT 'candidatos','coluna_nova_vazando'» vs gerador «…acoes_dados','tipo')» (WR-04)` |
| saída antecipada (WR-05) | M21 | `estrutura` | `DO $gate$: o corpo do bloco difere do canônico (WR-05) — primeira divergência no caractere 446: bloco «…END IF; RETURN; IF (r->>'n_drift')…»` |
| guarda inalcançável (WR-05) | M22 | `estrutura` | `DO $gate$: o corpo do bloco difere do canônico (WR-05) — … caractere 449: bloco «…END IF; IF false THEN IF (r->>'n_drift')…»` |
| `r` reatribuído (WR-05) | M23 | `estrutura` | `DO $gate$: o corpo do bloco difere do canônico (WR-05) — … caractere 446: bloco «…END IF; r := r || '{"n_drift":0}'::jsonb; …»` |
| termo de população a menos (WR-05) | M24 | `estrutura` | `DO $gate$: o corpo do bloco difere do canônico (WR-05) — … caractere 189: bloco «…OR coalesce((r->>'n_pares_com_veredito')…»` |

Em cada uma, o problema citado é o único da lista.

**M4–M18 continuam com o alvo de antes.** A mesma sonda mostrou que cada uma ainda traz o problema da própria checagem nomeada:

- M4: `DO $gate$: 0 ocorrência(s)`
- M5: `EXCEPTION WHEN presente`
- M6: `chave n_drift: comparação nua`
- M7: `chave n_drift: lida por ->> mas não construída`
- M13 e M14: `guarda de drift: … não contém, contíguo …`
- M15: `guarda de população: o THEN do 1º IF não é seguido de …`
- M16 e M17: `agregador da chave n_drift (guarda de drift)`
- M18: `agregador da chave n_tabelas_vivas`

Quando a mutação toca o bloco, o pino aparece **além** desse problema, nunca no lugar dele.

## `BLOCO_GATE_CANONICO`

- **Tamanho:** 712 caracteres, igual ao medido pelo planejador. Conferido por `node` sobre a constante do arquivo de teste.
- **Derivação:** smoke de HEAD → `semComentarioSql` → `colapsar` → recorte entre `DO $gate$` e `$gate$;` → `trim` → cada `'P44-DRIFT FAIL[^']*'` trocado por `'P44-DRIFT FAIL…'`.
- **Começo:** `DECLARE r jsonb := current_setting('smoke44.r')::jsonb; BEGIN IF coalesce((r->>'n_tabelas_vivas')::int, 0) = 0 OR` (igual ao medido).
- **Fim:** `r->>'n_pares_com_veredito', r->>'linhas'; END IF; END` (igual ao medido).
- **Prova cruzada:** a (k3) fica verde sobre o smoke real com a constante. O smoke não foi editado: `git diff --quiet dedca1fb -- supabase` sai 0.

## WR-06: furo reproduzido e mordida (cp3/cp4)

Num caso cp3 descartável, o endereço morto foi trocado por uma string que só existe num arquivo real. O resultado foi este:

| Sonda (string que só existe em…) | cp3 de HEAD (`src/**.ts(x)`) | cp3 novo |
|---|---|---|
| `supabase/functions/_shared/consent-text.json` (`FONTE ÚNICA do texto de consentimento que o candidato lê`) | **verde** (o furo) | reprova: `["supabase/functions/_shared/consent-text.json"]` |
| `index.html` (`Beauty Smile — Carreiras</title>`) | **verde** (o furo) | reprova: `["index.html"]` |

No cp4 de HEAD, `includes` casava `novo.rh@beautysmile.com.br` (`true`). No cp5 novo, `novo.`/`vagas.` não casam, e o endereço entre aspas, depois de `: `, em `mailto:` e no começo de linha casa.

## `templates_email`: medição só leitura em PROD

O scratch ficou fora do repositório (`scratchpad/templates_email_medicao.sql`) e rodou com `node p46apply.cjs run <scratch>`, **sem registro no ledger**. A primeira linha é `SET TRANSACTION READ ONLY;`. O endereço morto foi montado na consulta como `'lgpd' || '@' || 'beautysmile.com.br'`. A consulta devolveu só contagens:

| medido_em | total_linhas | linhas_com_endereco_morto |
|---|---|---|
| 2026-10-07 09:30:21-03 | **3** | **0** |

Um controle de população veio em seguida, também só leitura e só contagens, seguindo a memória «população vazia mente nas duas direções»:

- `linhas_com_texto` (mais de 100 caracteres) = 3, e `menor_texto` = 780;
- `linhas_com_arroba` = **0**: a copy no banco não contém endereço de e-mail nenhum;
- `linhas_com_canal_vivo` = 0;
- `controle_detector_positivo` = **3/3**: o mesmo `strpos` acha o endereço quando ele está no texto.

O zero é verdadeiro e não vem de um detector cego. Como a contagem é 0, não houve parada.

## Task Commits

1. **Task 1 (TRACER): WR-04, pino dos corpos de VALUES + M19/M20 + META contíguo** — `085e3b44` (test)
2. **Task 2: WR-05, BLOCO_GATE_CANONICO + M21–M24** — `2bfdeb0c` (test)
3. **Task 3: WR-06 + IN-02, cp3/cp4/cp5 + docblock; `templates_email` medido** — `64139d5c` (test)

**Metadados do plano:** o commit `docs(44-19)` com este SUMMARY, STATE.md e ROADMAP.md.

**Gate do tracer (Task 1):** o modo é interativo, `end-of-phase`, e o `<verify>` só tem `<automated>`. O verify foi re-rodado de ponta a ponta antes de expandir e passou (93 testes; `VERIFY_T1_OK`).

## Files Created/Modified

- `docs/compliance/__tests__/exportAllowlist.test.ts` — `GERADOR`, `FLAG_DO_VALUES`, `saidasDoGerador`, `problemasDosValues`; pino na (k); `BLOCO_GATE_CANONICO` e `normalizarBlocoGate` em `problemasDaEstrutura`; (k4) com checador `values`, M19–M24, filtro do pino para alvos nomeados e META contíguo.
- `src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts` — `arquivosDe(alvo, extensoes)` com `PULAR`; `quemContem` por detector; `CANAL_EM_FRONTEIRA`; cp3 ampliado com prova de alcance e mordida em memória; cp4 por fronteira; cp5.
- `src/features/privacidade/constants/canalPrivacidade.ts` — só o docblock (IN-02). `git diff dedca1fb` só toca linhas ` * `.

## Decisions Made

- **O pino é sobre o corpo inteiro**, contra a saída do gerador **executado**. Isso segue o conserto que o revisor sugeriu e que o plano prescreve. A canônica e a permissiva ficaram, porque cada uma reprova com o seu diagnóstico.
- **Só os textos de mensagem são normalizados no canônico.** Reescrever a frase de diagnóstico de um `RAISE` não muda o portão, e os prefixos continuam presos pelas checagens nomeadas.
- **O cp4 lê `src/` com `ts|tsx|json|html`.** O comportamento do plano diz «produção do front (`src/`, não teste)», e o revisor pede as quatro extensões na varredura. Hoje isso não muda o resultado (medido: o único arquivo é o módulo).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2: correção de portão] O pino do bloco podia mascarar a remoção de uma checagem nomeada na (k4)**
- **Encontrado durante:** Task 2, depois de M21–M24 ficarem verdes.
- **Problema:** a (k4) casa alvos `estrutura` por `includes`, e o novo problema `DO $gate$: o corpo do bloco difere do canônico` cita um trecho do bloco mutado. Em M5 esse trecho contém `EXCEPTION WHEN OTHERS`. Se alguém apagasse a checagem nomeada de `EXCEPTION WHEN`, M5 continuaria verde, coberto pelo pino. Isso contraria o «M4–M7 e M13–M18 continuam reprovando NOMEANDO os mesmos alvos» do plano.
- **Conserto:** na (k4), quando o alvo não é o próprio pino, problemas que começam por `DO $gate$: o corpo do bloco difere do canônico` não contam.
- **Verificação:** numa cópia descartável com a checagem `EXCEPTION WHEN` desligada (`if (false)`), M5 reprova (`deveria reprovar NOMEANDO «EXCEPTION WHEN»; devolveu ["DO $gate$: o corpo do bloco difere…`). A cópia foi apagada e a suíte real ficou com 97/97 verdes.
- **Arquivo:** `docs/compliance/__tests__/exportAllowlist.test.ts`
- **Commit:** `2bfdeb0c`

**2. [Rule 1: erro de tipo] `relative` ficou sem uso depois de reescrever `arquivosDe`**
- **Encontrado durante:** Task 3, no verify do `tsc`.
- **Problema:** `TS6133: 'relative' is declared but its value is never read` subiu o `tsc` de 89 para 90. Esse verify existe exatamente para pegar isso.
- **Conserto:** o import foi removido, e o `tsc` voltou a 89 com rc 2 antes do commit.
- **Arquivo:** `src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts`
- **Commit:** `64139d5c`

---

**Total de desvios:** 2 corrigidos automaticamente (1 Rule 2, 1 Rule 1).
**Impacto:** os dois mantêm o plano dentro do que ele promete, sem aumentar o escopo. Smoke, relatório `05`, gerador, allowlist, YAML, catálogo e `supabase/` estão byte a byte iguais desde `dedca1fb`.

## Issues Encountered

- **Exclusão aceita na conferência do STATE.md por commit** (orientação do orquestrador). O commit `dee65a6c`, de início de fase do orquestrador, é o `state.begin-phase` do gsd-tools: ele reescreveu `Status:`/`Last activity:` no bloco da Phase 44. Ficou excluído do laço `for B in …` e não foi revertido. Todos os outros commits da rodada que tocam `.planning/STATE.md` foram conferidos, inclusive o de metadados deste plano.
- A medição em PROD exigiu dois scratches: a contagem pedida e um controle de população. Os dois são só leitura e devolvem só contagens.

## User Setup Required

None. Nenhuma configuração externa.

## Next Phase Readiness

- O 44-20 (WR-02/WR-03 da frase) roda sobre uma árvore estável: `docs/compliance/__tests__` com 97 testes verdes, `src/features/privacidade`, `cadastro` e `explicacao` com 465 verdes, e `tsc` em 89.
- Nada foi publicado: `origin/main..HEAD` cresce até o 44-22.

## Self-Check: PASSED

- FOUND: `docs/compliance/__tests__/exportAllowlist.test.ts`, `src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts`, `src/features/privacidade/constants/canalPrivacidade.ts`
- FOUND: `085e3b44`, `2bfdeb0c`, `64139d5c`
- `git diff --quiet dedca1fb -- supabase docs/compliance/sql docs/compliance/export-allowlist.json` → 0. `REQUIREMENTS.md` não mudou. ROADMAP: só as caixas desta rodada. Corpo do STATE.md preservado na árvore.

---
*Phase: 44-exporta-o-acesso*
*Completed: 2026-10-07*
