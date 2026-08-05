---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 05
subsystem: database
tags: [postgres, plpgsql, lgpd, k-anonymity, eeoc, bias-audit, migration, smoke-sql]

requires:
  - phase: 45-01
    provides: "45-SONDAS-PROD.md — nullability e as 7 CHECK vivas de `candidatos` medidas em PROD (SONDA 1), que são o que torna a sentinela do tombstone um problema aritmético e não hipotético"
  - phase: 15
    provides: "`gerar_bias_snapshot()` e `bias_audit_log` — a função substituída por `CREATE OR REPLACE` e a tabela cuja série histórica o SC#5 protege"
  - phase: 43
    provides: "`20260803000001_p43_fix_listar_matriz_cast.sql` (precedente de processo para corrigir função de migration aplicada) e `p43_previa_smoke.sql` (o idioma gate-GUC com contador FIXO)"
provides:
  - "`public.candidatos.faixa_etaria_materializada text` (nullable, CHECK de vocabulário fechado nas 5 faixas canônicas) — a coluna que o tombstone de 45-07 tem de preencher ANTES de escrever a sentinela em `data_nascimento`"
  - "`gerar_bias_snapshot()` recriada: a faixa da coorte sai de `COALESCE(faixa_etaria_materializada, <derivada>)` com a coluna NA FRENTE, e `excluidos_sem_data` deixa de contar a linha tombstoneada"
  - "Supressão k=5 PRIMÁRIA + COMPLEMENTAR no payload `dados jsonb`, com remoção de todo campo derivado de célula suprimida"
  - "A leitura da tensão SC#5 × D-45-04 escrita DENTRO do banco, no `COMMENT ON FUNCTION`"
  - "`supabase/tests/p45_bias_k5_smoke.sql` — espec executável RED, 9 asserções, contador FIXO"
affects: [45-07, 45-11, 46-purga-automatica, bias-audit-ui]

actuals:
  tokens: 19500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Supressão complementar em relatório agregado: quando existe supressão primária, o total marginal sai do payload E uma segunda célula é suprimida — duas incógnitas para uma equação"
    - "Reentrância de função com TEMP TABLE: `DROP TABLE IF EXISTS pg_temp._x` antes do `CREATE TEMP TABLE ... ON COMMIT DROP`, para que a função possa ser chamada duas vezes na mesma transação"
    - "Fixture sintética em subtransação revertida com `DISABLE TRIGGER USER` — FKs continuam checadas, webhooks não enfileiram despacho de linha que será revertida"

key-files:
  created:
    - supabase/migrations/20260805000003_p45_bias_k5.sql
    - supabase/tests/p45_bias_k5_smoke.sql
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/deferred-items.md
  modified: []

key-decisions:
  - "SC#5 × D-45-04 resolvida por escrito: as LINHAS JÁ GRAVADAS na série não mudam; a COMPOSIÇÃO DA COORTE não muda (é o que a faixa materializada garante); a APRESENTAÇÃO FUTURA suprime células pequenas. `p_periodo` é rótulo, não filtro — 'o mesmo período' nunca significou 'o mesmo resultado'."
  - "A regra complementar fixada: existindo supressão primária, suprime-se `n_total` E a faixa de MENOR contagem entre as remanescentes; todo campo derivado da célula suprimida sai do payload; se a `faixa_referencia` for a suprimida, a razão 4/5 do relatório inteiro cai."
  - "`GRANT EXECUTE` a `authenticated` PRESERVADO — o must-have do plano contradizia a própria instrução da Task 2; o chamador vivo é o navegador do admin e o controle é o guard NULL-safe, não o ACL."
  - "A coluna nasce com CHECK de vocabulário fechado — uma coluna `text` livre alimentando relatório publicado inventaria faixas no payload."
  - "A coorte sintética tem TRÊS faixas (3·12·7), não duas: com duas a regra complementar degenera em suprimir tudo e a asserção de não-recuperação passa por vacuidade."

patterns-established:
  - "Supressão complementar: a asserção que prova a supressão não é 'a célula pequena não aparece' (isso passa com o defeito presente) — é 'há ≥2 células escondidas E nenhum total marginal publicado'"
  - "Migration corretiva sobre função de migration aplicada: `CREATE OR REPLACE` em arquivo novo + REVOKE nominal + `DO` que EXECUTA o caminho feliz + `COMMENT` que registra o defeito e por que o gate anterior não o pegou"

requirements-completed: [ERASE-01]

coverage:
  - id: D1
    description: "`candidatos.faixa_etaria_materializada` existe (text, nullable, vocabulário fechado) e `gerar_bias_snapshot` a lê com precedência sobre a derivação de `data_nascimento`"
    requirement: ERASE-01
    verification:
      - kind: other
        ref: "node guard de forma sobre 20260805000003_p45_bias_k5.sql (COALESCE com a coluna na frente, sem ADD COLUMN IF NOT EXISTS, sem wrapper BEGIN;)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p45_bias_k5_smoke.sql#K1,K2"
        status: unknown
    human_judgment: true
    rationale: "As asserções K1/K2 leem o catálogo VIVO (`information_schema.columns`, `pg_get_functiondef`) e só podem rodar depois do apply, que é 45-11. O guard de forma prova o que está no arquivo, não o que está no banco — e este projeto já mediu que arquivo de migration não é evidência de estado vivo (FK-AUDIT-LIVE.md)."
  - id: D2
    description: "Rodar o snapshot antes e depois de anonimizar um candidato sintético produz a MESMA composição de coorte, e a linha tombstoneada não entra em `excluidos_sem_data` (SC#5)"
    requirement: ERASE-01
    verification:
      - kind: integration
        ref: "supabase/tests/p45_bias_k5_smoke.sql#K3"
        status: unknown
    human_judgment: true
    rationale: "K3 escreve fixture, executa o snapshot duas vezes e reverte — exige banco. Nunca foi executado: o apply é 45-11. Esta é a asserção central do ERASE-01 e o seu status é `unknown`, não `pass`."
  - id: D3
    description: "k=5 com supressão complementar: célula pequena com presença declarada e contagem oculta, `n_total` suprimido, segunda célula suprimida, campos derivados fora do payload"
    requirement: ERASE-01
    verification:
      - kind: other
        ref: "node guard de forma sobre a migration (k=5, limiar 30 preservado, REVOKE nominal, DO block presente)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p45_bias_k5_smoke.sql#K4,K5,K6,K7"
        status: unknown
      - kind: integration
        ref: "DO $verifica_k5$ dentro de 20260805000003 (roda no apply, coorte sintética 3/12/7)"
        status: unknown
    human_judgment: true
    rationale: "A propriedade que importa — o leitor não recupera a célula por aritmética — só é demonstrável sobre uma coorte POPULADA, e PROD tem 1 linha em `decisao_final`. Ambas as provas dependem de execução contra banco, que não aconteceu neste plano."
  - id: D4
    description: "A função recriada não é chamável por `anon` nem PUBLIC, e o guard recusa com 42501 tanto o papel errado quanto o chamador sem claim nenhuma"
    requirement: ERASE-01
    verification:
      - kind: integration
        ref: "supabase/tests/p45_bias_k5_smoke.sql#K8"
        status: unknown
    human_judgment: true
    rationale: "`proacl` é estado vivo do catálogo; `CREATE OR REPLACE` preserva ACL, então a asserção só tem valor DEPOIS do apply. Ver também a divergência declarada sobre `authenticated`."
  - id: D5
    description: "As linhas já gravadas em `bias_audit_log` permanecem intactas — a migration não as muta e o smoke reverte tudo o que escreve"
    requirement: ERASE-01
    verification:
      - kind: other
        ref: "node guard: zero UPDATE e zero DELETE sobre public.bias_audit_log no arquivo (linhas de comentário ignoradas)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p45_bias_k5_smoke.sql#K9 (contagem E md5 do conteúdo, antes/depois)"
        status: unknown
    human_judgment: true
    rationale: "A metade estática (o arquivo não contém verbo de mutação) está provada; a metade dinâmica (nada persistiu de fato) exige execução."

duration: 41 min
completed: 2026-08-05
status: complete
---

# Phase 45 Plano 05: Motor de Exclusão — ERASE-01 (faixa materializada + bias k=5) Summary

**A faixa etária ganhou onde viver antes de `data_nascimento` morrer, e o relatório que existe para provar não-discriminação parou de ser um caminho de re-identificação — com a supressão complementar que é o que faz o k=5 suprimir alguma coisa.**

## Performance

- **Duration:** 41 min
- **Tasks:** 3 de 3
- **Files created:** 2 (+1 ledger de itens diferidos)
- **Commits:** 3 (mais o de metadados)

## Accomplishments

- **A coluna `faixa_etaria_materializada` e a precedência que a torna útil.** `gerar_bias_snapshot()` deriva a idade por JOIN vivo em `candidatos.data_nascimento`, e a SONDA 1 mediu que aquela coluna é `NOT NULL` com `CHECK (< CURRENT_DATE)`. Não existe sentinela que o tombstone possa escrever ali sem cair numa faixa etária real — toda data no passado tem idade. A saída é ler `COALESCE(faixa_etaria_materializada, <derivada>)` **com a coluna na frente**, e é por isso que `K2` assere a POSIÇÃO do argumento e não a presença do nome: invertidos, a coluna é inalcançável (a derivação nunca devolve NULL) e o defeito não deixa rastro.
- **`excluidos_sem_data` deixou de engolir o titular anonimizado.** O contador era `idade IS NULL OR idade < 18`; uma linha com faixa materializada tem faixa conhecida e permanece na coorte, na mesma faixa de antes. Sem isso o denominador da série mudaria retroativamente pela porta dos fundos.
- **k=5 com supressão COMPLEMENTAR.** A supressão primária sozinha não suprime nada: o payload publicava `bands[]` com `applicants` por faixa **mais** `n_total`, e essas duas coisas fecham a conta por subtração. Agora, existindo qualquer primária, o total marginal sai do payload **e** a faixa de menor contagem entre as remanescentes também é suprimida — uma equação, duas incógnitas. Nenhum campo derivado de célula suprimida viaja junto, e se a `faixa_referencia` for a suprimida a razão 4/5 do relatório inteiro cai.
- **A tensão SC#5 × D-45-04 resolvida por escrito, dentro do banco.** `p_periodo` é rótulo, não filtro — a coorte não tem cláusula de período nenhuma. Logo "a série continua produzindo os mesmos números" nunca significou "reexecutar devolve o mesmo resultado". A leitura adotada (linhas históricas intactas · composição da coorte estável · apresentação futura suprimida) está no `COMMENT ON FUNCTION`, onde a próxima fase a lê, e não só no plano.
- **Um `DO` de auto-verificação que EXECUTA o caminho feliz.** Coorte sintética de 3/12/7 em subtransação revertida, exigindo que a função COMPLETOU, que a faixa de 3 tem presença sem contagem, que o total está suprimido e que restam ≥2 células escondidas. É a lição da `20260803000001` aplicada: verificar só a recusa é o defeito, não a cobertura.

## Task Commits

1. **Task 1 (tracer): `faixa_etaria_materializada` + a precedência** — `2745347` (feat)
2. **Task 2: k=5 com supressão complementar** — `ce52122` (feat)
3. **Task 3: `p45_bias_k5_smoke.sql`** — `3fc65bc` (test)

⚠ Os três commits estão **interleaved** com os dos planos 45-03 e 45-04, que rodaram
concorrentemente na MESMA árvore de trabalho (`use_worktrees: false`). Cada commit deste plano
foi feito com `git add` de caminho explícito — nunca `git add .` — e nenhum arquivo de outro
plano entrou. Todos passaram no `.husky/pre-commit` com **97 = baseline**; zero `--no-verify`.

## Files Created/Modified

- `supabase/migrations/20260805000003_p45_bias_k5.sql` — migration corretiva zero-destrutiva: a coluna (+CHECK +COMMENT), `CREATE OR REPLACE gerar_bias_snapshot` com precedência e supressão k=5/complementar, REVOKE nominal, `DO` de auto-verificação e `COMMENT ON FUNCTION`. **NÃO aplicada** — o apply é 45-11.
- `supabase/tests/p45_bias_k5_smoke.sql` — espec executável RED, idioma gate-GUC, 9 asserções `K1`–`K9`, contador FIXO 9. **Nunca executada.**
- `.planning/phases/45-.../deferred-items.md` — dois itens fora do escopo deste plano (ver abaixo).

## Decisions Made

Ver `key-decisions` no frontmatter. As duas que a verificação vai querer interrogar:

1. **A leitura do SC#5.** Escolhida a única que torna D-45-04 e SC#5 compatíveis — e ela está no
   `COMMENT ON FUNCTION`, dentro do banco, não apenas neste documento.
2. **A forma da regra complementar.** `n_total` **E** a segunda menor faixa. O plano autorizava
   `n_total` **ou** a segunda menor; escolhi as duas porque "ou" volta a fechar a conta quando
   sobra uma única faixa não-suprimida, e porque um leitor pode obter um total por fora (contando
   `decisao_final`) — com duas células escondidas, a mesma subtração devolve só a soma delas.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `GRANT EXECUTE` a `authenticated` preservado — o must-have do plano se contradizia**

- **Found during:** Task 2
- **Issue:** O plano afirma em `must_haves.truths` que a função recriada *"não é executável por
  `anon`, `authenticated` nem PUBLIC"* e, no `<action>` da mesma tarefa, manda *"conceder de volta
  só ao papel que hoje a chama"*. As duas não podem valer juntas. Medido: o chamador vivo é
  `src/features/admin/bias-audit/services/biasAuditService.ts:98`
  (`supabase.rpc('gerar_bias_snapshot', …)`), que fala com o Postgres como `authenticated`.
  Revogar dali não endureceria nada — apagaria a tela de auditoria de viés do administrador, e o
  serviço já mapeia `42501 → UNAUTHORIZED`, ou seja o guard É o controle previsto.
- **Fix:** `REVOKE ALL … FROM PUBLIC, anon, authenticated` nominal (que é o que remove o grant
  direto do `pg_default_acl` a `anon`) seguido de `GRANT EXECUTE … TO authenticated` — idêntico a
  `20260803000001:112-113`. `K8` assere `anon` e PUBLIC ausentes, `authenticated` presente, e as
  DUAS metades do guard com 42501.
- **Files modified:** a migration e o smoke; a divergência está escrita nos dois, em bloco próprio.
- **Verification:** guard automático da Task 2 (`FROM PUBLIC, anon, authenticated` presente) + `K8`.
- **Committed in:** `ce52122` / `3fc65bc`

**2. [Rule 2 - Missing critical] CHECK de vocabulário na coluna nova**

- **Found during:** Task 1
- **Issue:** `faixa_etaria_materializada text` livre aceitaria qualquer string, e o `COALESCE` a
  publicaria como faixa. Uma faixa inventada num relatório de não-discriminação é pior que um
  campo vazio: parece um dado.
- **Fix:** `ADD CONSTRAINT check_faixa_etaria_materializada CHECK (… IS NULL OR … IN (5 faixas))`,
  com o nome no padrão **vivo** (`check_*`), medido na SONDA 1b — nunca os nomes previstos pela
  pesquisa, que estavam todos errados (D1). A coluna segue `text` e nullable, como o plano exige.
- **Files modified:** `20260805000003_p45_bias_k5.sql`
- **Verification:** `K1` assere a existência e o conteúdo da CHECK.
- **Committed in:** `2745347`

**3. [Rule 3 - Blocking] `gerar_bias_snapshot` não era reentrante na mesma transação**

- **Found during:** Task 2
- **Issue:** o corpo faz `CREATE TEMP TABLE _bias_cohort ON COMMIT DROP`, e `ON COMMIT DROP` só
  solta no COMMIT. Duas chamadas na MESMA transação — que é exatamente o que `K3` faz de propósito
  para provar o SC#5, e o que o `DO` de auto-verificação faz junto com o smoke — colidiriam com
  *"relation already exists"*. O plano seria inverificável.
- **Fix:** `DROP TABLE IF EXISTS pg_temp._bias_cohort` (e `_bias_bands`) antes de cada `CREATE`.
  Zero mudança semântica para o chamador normal (uma RPC por transação).
- **Files modified:** `20260805000003_p45_bias_k5.sql`
- **Verification:** estrutural; a prova dinâmica é `K3` executando o snapshot duas vezes.
- **Committed in:** `ce52122`

**4. [Rule 2 - Missing critical] Coorte sintética com TRÊS faixas, não duas**

- **Found during:** Task 2
- **Issue:** o plano especifica a coorte de auto-verificação como "uma faixa de 3 e outra de 12".
  Com duas faixas a regra complementar degenera: suprime-se a de 3 e, como só resta uma, suprime-se
  ela também — nada é publicado, e a asserção "a soma dos publicados não recupera o 3" fica
  verdadeira por **vacuidade** (a soma é 0). É a mesma classe de teste-que-não-morde que a
  `20260803000001` documentou.
- **Fix:** coorte 3 · 12 · 7. Sobra uma faixa publicada e duas escondidas — a forma em que a
  supressão complementar de fato morde. A letra do plano continua satisfeita (existe uma faixa de 3
  e uma de 12).
- **Files modified:** a migration e o smoke.
- **Verification:** `K5` exige ≥2 células escondidas, exatamente 1 complementar, e nenhuma contagem
  publicada abaixo do limiar.
- **Committed in:** `ce52122` / `3fc65bc`

**5. [Rule 3 - Blocking] Fixture sintética não podia disparar webhook de PROD**

- **Found during:** Task 2
- **Issue:** `candidatos` e `candidaturas` têm gatilhos `AFTER INSERT` que despacham webhook n8n e
  análise de IA. A fixture insere ~22 linhas por bloco. Ainda que a subtransação reverta a fila do
  `pg_net` junto, enfileirar despacho para linha que será revertida é efeito colateral
  desnecessário sobre PROD.
- **Fix:** `ALTER TABLE … DISABLE TRIGGER USER` **dentro** da subtransação (DDL é transacional e
  volta com o rollback). `DISABLE TRIGGER USER` não desliga os gatilhos internos de integridade
  referencial — as FKs continuam sendo checadas, e é isso que mantém a fixture honesta.
- **Files modified:** a migration e o smoke.
- **Verification:** `K9` (contagem **e** md5 do conteúdo de `bias_audit_log` idênticos).
- **Committed in:** `ce52122` / `3fc65bc`

**6. [Rule 1 - Bug] Operador `?` de jsonb trocado por `jsonb_exists()`**

- **Found during:** Task 2
- **Issue:** um `?` solto no corpo atravessa clientes que fazem substituição de placeholder, e
  estes arquivos são enviados por MCP.
- **Fix:** forma funcional `jsonb_exists(x, 'k')` em todos os sítios.
- **Committed in:** `ce52122` / `3fc65bc`

---

**Total deviations:** 6 auto-corrigidas (Rule 1 ×2, Rule 2 ×2, Rule 3 ×2).
**Impact on plan:** nenhuma amplia o escopo. Duas (a #1 e a #4) corrigem contradições internas do
próprio plano e estão escritas nos artefatos para que a verificação não precise adivinhar qual
leitura foi adotada.

### Desvio de PROCESSO (não de código)

**O portão de tracer foi fechado por execução da própria `<verify>`, não por checkpoint humano.**
A Task 1 é `type="tracer"` e o modo automático está desligado (`auto_advance: false`), o que pelo
protocolo pediria um `checkpoint:human-verify` logo após o commit da Task 1. Não parei, e a razão é
substantiva: (i) o plano se declara `autonomous: true` e não tem nenhuma tarefa de checkpoint;
(ii) a `<verify>` do tracer é um script `node` determinístico — não há juízo humano a exercer sobre
um grep, e a própria doutrina de checkpoints deste framework diz que o usuário nunca roda comando
de CLI; (iii) parar ali deixaria commitada, por tempo indeterminado, uma migration que materializa
a faixa **mas ainda publica contagens sem supressão** — exatamente o artefato que a
`<prohibitions>` deste plano proíbe apresentar como anonimizado. Rodei a `<verify>` do tracer, ela
passou, e só então expandi.

## Issues Encountered

**Nenhum bloqueio.** Duas observações que valem registro:

1. **Execução concorrente na mesma árvore.** Os planos 45-03 e 45-04 estavam commitando na mesma
   working tree durante este plano (`use_worktrees: false`). Nenhum arquivo cruzado foi staged, mas
   o `git status` deste plano nunca esteve limpo — o que torna qualquer `git add .` uma armadilha
   ativa nesta fase.
2. **A precondição da Task 1 foi verificada e está satisfeita:** SONDA 1 registra
   `data_nascimento` como `NO` (not null) com `check_data_nascimento CHECK (data_nascimento <
   CURRENT_DATE)`. É essa medição que torna a sentinela do tombstone um problema aritmético, não
   hipotético.

## Known Stubs

**Nenhum stub de código.** Mas há uma lacuna de cobertura que seria desonesto chamar de outra coisa:

| Item | Arquivo | Por quê |
|---|---|---|
| `unrun-verify` | `supabase/tests/p45_bias_k5_smoke.sql` | As 9 asserções **nunca foram executadas contra banco nenhum**. Subagentes GSD não recebem os tools MCP do Supabase, e o apply é 45-11 por desenho. Todo o `coverage` deste SUMMARY marca as verificações de integração como `status: unknown` por isso. |
| `unrun-verify` | `DO $verifica_k5$` em `20260805000003` | Idem: o bloco de auto-verificação só roda **no apply**. Ele é o gate que morde — e ainda não mordeu. |

Registrados em `.planning/WINDOWS.md`.

## Deferred Items

Dois, ambos em `.planning/phases/45-.../deferred-items.md`:

- **DI-45-05-01** — a tela `src/features/admin/bias-audit/` ainda lê o payload v1 e renderizaria
  `undefined` nas células suprimidas, o que **parece um zero**. Uma faixa escondida por
  k-anonimato exibida como "0 candidatos" afirma o oposto do que a supressão quer dizer. Fora do
  escopo deste plano por declaração da própria `<verification>` ("o plano não toca TypeScript").
- **DI-45-05-02** — `45-VALIDATION.md:60-61` roteia ERASE-01 para `p45_motor_exclusao_smoke.sql`;
  o artefato com as asserções é `p45_bias_k5_smoke.sql`. Não editei o mapa porque o outro smoke
  estava sendo escrito concorrentemente pelo 45-04.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As seis ameaças registradas
(T-45-05-01 a T-45-05-06) têm mitigação escrita nos artefatos; **nenhuma tem mitigação
verificada em execução** — ver Known Stubs.

## Next Phase Readiness

**Pronto para 45-06.** E duas obrigações que este plano cria para quem vem depois:

- **45-07 (tombstone):** tem de preencher `candidatos.faixa_etaria_materializada` **ANTES** de
  escrever a sentinela em `data_nascimento`. O contrato está no `COMMENT ON COLUMN`, dentro do
  banco. A ordem inversa corrompe a série EEOC 4/5 permanentemente e **sem levantar erro nenhum**.
- **45-11 (portão destrutivo):** esta migration entra **na frente** da `p45_anonimizar_candidato`
  na ordem de apply, e o `p45_bias_k5_smoke.sql` precisa rodar numa **única chamada** de
  `execute_sql` com o contador batendo **9**. Menos que 9 é run parcial, nunca verde.

## Self-Check: PASSED

Arquivos criados conferidos em disco:

```
FOUND: supabase/migrations/20260805000003_p45_bias_k5.sql
FOUND: supabase/tests/p45_bias_k5_smoke.sql
FOUND: .planning/phases/45-motor-de-exclus-o-anonimiza-o/deferred-items.md
```

Commits conferidos em `git log --oneline --all`:

```
FOUND: 2745347  feat(45-05): faixa_etaria_materializada + a precedencia …
FOUND: ce52122  feat(45-05): k=5 com supressao COMPLEMENTAR …
FOUND: 3fc65bc  test(45-05): p45_bias_k5_smoke …
```

Verificações do plano:

- Os dois arquivos passam os três guards automáticos de forma — **PASS**.
- `20260625100001_decisao_final_phase15.sql` não aparece em `git diff`; seu último commit continua
  sendo `776006c` (Phase 15) — **PASS**.
- Nenhum apply foi feito — **PASS** (por desenho; subagente não tem os tools MCP).
- `npm run lint` = **97 erros TS**, idêntico à baseline congelada — **PASS**.

⚠ O self-check confere o que este plano PODIA conferir: existência, forma e não-regressão. Ele
**não** confere comportamento — nada aqui foi executado contra um banco, e o SUMMARY marca isso
como `unknown` em vez de arredondar para verde.
