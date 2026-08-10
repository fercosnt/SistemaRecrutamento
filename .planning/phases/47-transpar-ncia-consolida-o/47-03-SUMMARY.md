---
phase: 47-transpar-ncia-consolida-o
plan: 03
subsystem: database
tags: [compliance, lgpd, consol-03, consent-05, migrations, auditoria, prompt-library, aditivo]

requires:
  - phase: 09-prompt-library
    provides: "public.data_deletion_log + public.rollback_to_version — o objeto adotado e o seu escritor vivo desde 2026-06-09"
  - phase: 43-consentimentos-honestos-pol-tica-de-reten-o
    provides: "o idioma `PERFORM public.log_auditoria(...)` no MESMO corpo (salvar_janela_retencao), e o COMMENT vivo de autorizacao_analise_video que deferiu a decisão a esta fase"
  - phase: 45-motor-de-exclusao
    provides: "public.anonimizar_candidato — o motor REAL de exclusão de titular, que o COMMENT corrigido passa a nomear"
  - phase: 47-transpar-ncia-consolida-o
    provides: "47-01 — check:pii-inventory-md cabeado no CI: editar o YAML sem regerar o .md passou a reprovar o build"
provides:
  - "supabase/migrations/20260809000002_p47_adotar_data_deletion_log.sql — a adoção: COMMENT corrigido + rollback_to_version auditando nos dois destinos (ESCRITA, não aplicada)"
  - "supabase/migrations/20260809000003_p47_consent05_analise_video.sql — CONSENT-05: DEFAULT e obrigatoriedade removidos da coluna de análise de vídeo (ESCRITA, não aplicada)"
  - "supabase/tests/p47_consol03_consent05_smoke.sql — 7 asserções (a)–(g) cobrindo as duas migrations, gate por contador de sessão = 7"
  - "as fontes de compliance descrevendo a tabela pelo estado ATUAL, com o artefato derivado regerado sob portão"
affects: [47-09-consol-04, 46-purga-automatica]

actuals:
  tokens: 17280
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Adoção em vez de remoção quando o custo do DROP é medido em consumidores derivados: o critério de sucesso aceitava as duas saídas e a reversibilidade decidiu"
    - "Auditoria em DOIS destinos no mesmo corpo: a tabela adotada sustenta 'escritas reais', o sink canônico torna a trilha consultável — uma trilha que ninguém lê não é trilha"
    - "Correção de promessa órfã SEM reintroduzir a string corrigida em oração de contraste — o fato histórico vive no comentário de arquivo, nunca no texto que o portão varre"
    - "Remoção de DEFAULT + obrigatoriedade como correção não-destrutiva de consentimento fabricado: muda o que o banco escreve no futuro, jamais o que ele já escreveu"

key-files:
  created:
    - supabase/migrations/20260809000002_p47_adotar_data_deletion_log.sql
    - supabase/migrations/20260809000003_p47_consent05_analise_video.sql
    - supabase/tests/p47_consol03_consent05_smoke.sql
  modified:
    - docs/compliance/pii-inventory.yaml
    - docs/compliance/pii-inventory.md
    - docs/compliance/export-scope-rules.yaml
    - src/features/admin/prompt-versions/components/PromptVersionsPage.tsx

key-decisions:
  - "ADOTAR `data_deletion_log`, nunca dropar — decisão do operador em 2026-08-09, sobre custo MEDIDO de 11 consumidores derivados"
  - "O `INSERT` na tabela adotada PERMANECE e um `PERFORM log_auditoria` é ACRESCENTADO: dois destinos, não substituição"
  - "O nome da função prometida não aparece no `COMMENT` novo, nem para negá-la — a oração de contraste faria o portão casar com a própria explicação do conserto"
  - "CONSENT-05 resolvido removendo `DEFAULT` + obrigatoriedade; zero back-fill dos 14 `false` históricos"
  - "`p_dados_antes` do log de rollback fica nulo por honestidade: o corpo vivo não captura a versão anterior, e capturá-la mudaria o corpo preservado além da adição de auditoria"
  - "O achado A-06 do inventário foi marcado como RESOLVIDO junto com a prosa de natureza — o fato de schema permanece, o veredito de zumbi não"

requirements-completed: [CONSOL-03, CONSENT-05]

coverage:
  - id: D1
    description: "A tabela adotada continua inteira (relação + índice + policy) e o comentário de catálogo deixa de prometer a função ausente, nomeando o motor real de exclusão"
    requirement: CONSOL-03
    verification:
      - kind: other
        ref: "20260809000002 §(5) DO block, asserções (a) e (b) — reprovam o apply nomeando o medido"
        status: pending_apply
      - kind: other
        ref: "p47_consol03_consent05_smoke.sql (a) e (b) — inclui a exigência de que a função prometida continue AUSENTE de pg_proc"
        status: pending_apply
    human_judgment: false
  - id: D2
    description: "O escritor vivo audita nos DOIS destinos, na mesma transação, e a escrita na tabela adotada permanece"
    requirement: CONSOL-03
    verification:
      - kind: other
        ref: "20260809000002 §(5) DO block, asserções (c) e (d) — lidas de pg_get_functiondef, não do arquivo"
        status: pending_apply
      - kind: other
        ref: "p47_consol03_consent05_smoke.sql (c) — rollback REAL em subtransação revertida exigindo +1 linha em cada destino"
        status: pending_apply
    human_judgment: false
  - id: D3
    description: "A coluna do CONSENT-05 existe, perdeu o DEFAULT, aceita nulo e continua comentada — e uma inserção que omite a chave grava NULO"
    requirement: CONSENT-05
    verification:
      - kind: other
        ref: "20260809000003 §(6) DO block, asserções (a)–(d)"
        status: pending_apply
      - kind: other
        ref: "p47_consol03_consent05_smoke.sql (e) e (f) — a (f) prova por INSERÇÃO, não por leitura de pg_attrdef"
        status: pending_apply
    human_judgment: false
  - id: D4
    description: "Nada foi destruído: zero DROP/DELETE nas duas migrations, zero back-fill, e as negativas provam por dado"
    requirement: CONSOL-03
    verification:
      - kind: other
        ref: "guards automáticos das Tasks 1 e 2 (node) — exit 0 nas duas"
        status: pass
      - kind: other
        ref: "p47_consol03_consent05_smoke.sql (d) e (g) — contagem de prompt_versions idêntica; não-nulos de autorizacao_analise_video não caem abaixo do medido"
        status: pending_apply
    human_judgment: false
  - id: D5
    description: "As fontes de compliance descrevem o estado atual, o artefato derivado foi regerado no mesmo commit e os quatro portões saem 0"
    requirement: CONSOL-03
    verification:
      - kind: other
        ref: "npm run -s check:pii-inventory-md && check:recibo-exclusao && check:export-allowlist && check:matriz-retencao → todos exit 0"
        status: pass
      - kind: unit
        ref: "npm run test:run → 1781/1781 (179 arquivos), incluindo portoesInvocados.test.ts"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-09
status: complete
---

# Phase 47 Plan 03: A adoção do `data_deletion_log` e o fim da afirmação fabricada

**O zumbi de compliance deste repositório para de mentir sem que nada seja destruído: o `COMMENT` que prometia uma função de exclusão de titular ausente de `pg_proc` desde 2026-06-09 foi corrigido, o escritor vivo passou a auditar também no sink canônico na mesma transação, e a coluna de autorização de análise de vídeo perdeu o `DEFAULT` que fazia o banco responder no lugar de um código que deliberadamente se absteve.**

## A decisão que define este plano, e por que ela não é um recuo

O SC#3 do ROADMAP aceita **duas** saídas — "removido **ou** adotado com escritas reais". A pesquisa
mediu o custo das duas e o operador escolheu **adotar** em 2026-08-09. Os quatro fatos que decidiram:

1. **O critério já estava satisfeito pela metade.** A tabela **já recebe** escrita real: a RPC de
   rollback da biblioteca de prompts grava nela desde 2026-06-09. O que a tornava um zumbi não era
   existir — era o comentário de catálogo prometer uma `delete_candidate_data` que a Phase 15 nunca
   criou. Promessa se corrige.
2. **A remoção custa onze consumidores derivados**, medidos: dois YAML-fonte, o catálogo vivo do M4,
   o gerador do recibo, cinco artefatos gerados, o `database.types.ts` e uma string visível ao
   administrador. Dropar deixaria onze descrições de um objeto inexistente, duas delas em artefatos
   que se declaram autoridade de compliance.
3. **A remoção não reduz risco.** Quatro colunas, nenhuma FK, nenhum `candidato_id` — o próprio
   inventário classifica a tabela como sem vínculo com titular.
4. **A adoção é reversível; a remoção não é.**

**Consequência estrutural, registrada:** esta fase deixou de ter portão destrutivo. Ambas as
migrations são inteiramente aditivas — zero `DROP`, zero `DELETE`, zero `UPDATE` retroativo — e o
ROADMAP já havia sido atualizado para riscar a Phase 47 da lista de portões.

## Performance

- **Duração:** ~12 min
- **Iniciado:** 2026-08-09T22:39Z
- **Concluído:** 2026-08-09T22:51Z
- **Tarefas:** 3
- **Arquivos criados/modificados:** 7

## Accomplishments

- **A promessa órfã canônica do repositório fechou.** O `COMMENT ON TABLE` novo diz o que a tabela
  **é** (trilha append-only de reversão de prompt, sem vínculo com titular), o que ela **não é**, e
  **nomeia o motor real** de exclusão de titular deste projeto — `public.anonimizar_candidato`
  (Phase 45). É a entrada nº 1 do registro de promessas do CONSOL-04 (47-09), e ela fecha aqui.
- **A adoção deixou de ser nominal.** `rollback_to_version` foi recriada com o corpo preservado por
  inteiro — guard NULL-safe, validação do alvo, os dois `UPDATE` na ordem exigida pela constraint
  `EXCLUDE`, e o `INSERT` na tabela adotada — mais um `PERFORM public.log_auditoria(...)` no **mesmo
  corpo**, logo na **mesma transação**. Os dois destinos existem por razões diferentes e ambas
  necessárias: a tabela é o que faz "adotado com escritas reais" ser verdade, e o sink canônico é o
  que torna a trilha **consultável** — nenhuma tela lê a tabela adotada (varredura repo-wide: zero
  `SELECT`), e uma trilha que ninguém consegue ler não é trilha.
- **A copy do diálogo de rollback virou verdade em dois lugares.** A frase "Esta ação é registrada na
  trilha de auditoria" existia desde a Phase 9 apontando para uma tabela que nenhuma tela lê. Agora
  ela é verdadeira no sink que o resto do projeto consulta — e o parêntese que entregava o nome do
  objeto de banco na copy de produto saiu.
- **CONSENT-05 fechou pela simetria não-destrutiva.** `DEFAULT` e obrigatoriedade removidos, coluna e
  valores históricos intactos. A partir do apply, **nulo significa que a pergunta não foi feita** — e
  isso passa a ser distinguível de "respondeu não", que é literalmente o discriminador que o
  requirement existe para criar (distribuição medida em 2026-08-02: **zero** nulos em 17 linhas).
- **As fontes de compliance pararam de afirmar o que era falso**, e o artefato derivado foi regerado
  no mesmo commit, sob o portão que 47-01 acabou de cabear no CI.

## Task Commits

Cada tarefa foi commitada atomicamente, com o hook de pre-commit rodando — **zero `--no-verify`**.

1. **Task 1 (tracer): a adoção** — `b44113c`
   `supabase/migrations/20260809000002_p47_adotar_data_deletion_log.sql`
2. **Task 2: CONSENT-05 + o smoke das duas migrations** — `7569641`
   `supabase/migrations/20260809000003_p47_consent05_analise_video.sql`,
   `supabase/tests/p47_consol03_consent05_smoke.sql`
3. **Task 3: as fontes de compliance** — `102df07`
   `pii-inventory.yaml` + `.md` regerado, `export-scope-rules.yaml`, `PromptVersionsPage.tsx`

## ⚠ O QUE O ORQUESTRADOR HERDA — obrigações de apply, na ordem

**Nada foi aplicado. Nada foi deployado. Nenhum MCP foi chamado por este executor.**
Os arquivos existem no repositório e o banco continua exatamente como estava.

### Ordem obrigatória

1. **`apply_migration` de `20260809000002_p47_adotar_data_deletion_log.sql`** (via MCP, pelo
   orquestrador — `supabase db push` é proibido neste projeto por SQLSTATE 42601).
   O `DO` block interno reprova o próprio apply se qualquer uma das cinco asserções for falsa.
2. **Reconciliar o ledger:** `supabase migration repair --status applied 20260809000002`
   (ou o `UPDATE` direto registrado no cabeçalho do arquivo). `apply_migration` carimba a **própria**
   `version` — sem o reparo o CLI lê o arquivo como não aplicado.
3. **Conferir a fidelidade:** `SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
   WHERE version = '20260809000002';`
4. **`apply_migration` de `20260809000003_p47_consent05_analise_video.sql`**, e repetir os passos 2 e
   3 com a `version` `20260809000003`.
5. **Rodar `supabase/tests/p47_consol03_consent05_smoke.sql` via `execute_sql`, numa ÚNICA chamada.**
   A chamada única é obrigatória por motivo mecânico: `set_config(..., false)` é escopado à sessão, e
   statements espalhados zerariam o contador `smoke47.pass`, fazendo o RESUMO (z) reprovar um run que
   passou.
   **Antes de rodar:** transcrever em `smoke47.esperado_nao_nulos` (linha 96 do smoke) o total de
   linhas de `autorizacoes` com `autorizacao_analise_video` **não-nulo**, medido **antes** do apply
   de `20260809000003`. O valor pré-preenchido é a medição de 2026-08-02 (17). Se a base cresceu, o
   número real é maior — a asserção usa `>=`, então um valor desatualizado enfraquece o gate sem
   quebrá-lo.
   **Verde = `smoke47.pass` bater exatamente 7.**
6. **Fixture da asserção (f):** ela exige um candidato **sem** linha em `autorizacoes`. Se todos
   tiverem, a asserção reprova alto com a instrução de criar um candidato de teste — não reaproveitar
   uma linha viva.

### Dívida de ambiente, registrada e NÃO contornada

**`database.types.ts` não foi regenerado.** Depois do apply de `20260809000003`, o tipo de
`autorizacoes.autorizacao_analise_video` passa de `boolean` para `boolean | null`
(`database.types.ts:370`, `:388`, `:406`). A regeneração está bloqueada neste ambiente (sem
`SUPABASE_ACCESS_TOKEN`, sem Supabase CLI no PATH) e **editar o arquivo à mão é proibido** pela
CLAUDE.md. Quando o CLI estiver disponível: `npm run db:types`.

**A auditoria de impacto foi feita aqui, no plano, e não deixada para o `tsc` de alguém depois.**

## Varredura de consumidores de `autorizacao_analise_video`

Varredura repo-wide em `src/` e `supabase/functions/`. **Zero consumidores leem o VALOR da coluna** —
nenhum desreferencia o booleano, então tornar a coluna nullable não quebra nenhum caminho de código.

| Arquivo | Linha | Natureza | Impacto do nulo |
|---|---|---|---|
| `src/features/privacidade/constants/reciboExclusao.generated.ts` | 112 | string `"autorizacoes.autorizacao_analise_video"` em lista gerada | nenhum |
| `supabase/functions/_shared/reciboExclusao.ts` | 112 | idem (artefato gerado, EF) | nenhum |
| `supabase/functions/_shared/exportAllowlist.ts` | 175, 196 | nome da coluna na allowlist gerada | export emite `null` em vez de `false` — mais honesto |
| `supabase/functions/_shared/autorizacoes-registro.ts` | 34 | docblock: a chave **nunca** é emitida | nenhum — é o módulo que esta migration termina de honrar |
| `supabase/functions/_shared/schemas.ts` | 103, 124 | docblock do contrato `.strict()` (a chave dá 400) | nenhum |
| `src/features/cadastro/constants.ts` · `types/formTypes.ts` · `schemas/candidatoSchema.ts` · `services/cadastroService.ts` | 43 · 191 · 370 · 369 | comentários registrando a saída do campo na Phase 43 | nenhum |
| `src/features/cadastro/__tests__/consentTextFonteUnica.test.ts` | 97 | string numa lista de asserção | nenhum |
| `supabase/functions/_shared/__tests__/consent-hash.test.ts` | 193 | asserção de ausência no corpus v2 | nenhum |
| `supabase/functions/_shared/__tests__/autorizacoes-registro.test.ts` | 107–138 | provas de que a chave é rejeitada e nunca emitida | nenhum |

## Decisions Made

- **Dois destinos, não substituição.** Trocar o `INSERT` por um `PERFORM` teria sido dropar a tabela
  por outro caminho — com a desvantagem de deixar o objeto no banco descrito por onze consumidores.
- **O nome da função prometida não entra no `COMMENT` novo, nem para negá-la.** Uma oração de
  contraste ("não é mais a X") reintroduziria a string no catálogo e faria o portão automático casar
  com a própria explicação do conserto. O fato histórico vive no comentário de **arquivo**, que é
  onde ele pertence, e o `DO` block procura a string ali onde ela é o objeto da busca, nunca o texto.
- **O guard vivo de `rollback_to_version` foi preservado verbatim.** Ele já é NULL-safe (testa
  `v_role IS NULL` **antes** da pertinência à lista). Migrá-lo para o idioma `IS DISTINCT FROM` seria
  mexer no único controle de acesso da função sem requirement que peça.
- **`p_dados_antes` fica nulo.** O corpo vivo não captura qual versão estava ativa antes; capturá-la
  mudaria o corpo preservado além da adição de auditoria. A descrição e o `p_dados_depois` carregam
  tipo de chamada e versão, e `p_recurso_id` aponta para a versão reativada.
- **`('configuracao', 'aviso')`** — medidos contra os enums vivos, precedente direto da Phase 43.
  Zero `ALTER TYPE` na fase.
- **Zero back-fill dos 14 `false` históricos.** Converter para nulo apagaria a prova de que a
  pergunta um dia foi feita. A Phase 43 inteira se apoia no princípio inverso.
- **O mapeamento de `export-scope-rules.yaml` NÃO mudou, só o comentário.** A adoção corrigiu o
  catálogo e ampliou a auditoria, não o vínculo com titular. Trocar a classificação junto com a
  prosa moveria a tabela de escopo sem nenhum fato novo que justificasse.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] O achado A-06 do inventário continuaria afirmando o veredito revogado**

- **Encontrado durante:** Task 3
- **Problema:** o plano manda reescrever a **prosa de natureza** do bloco da tabela, mas o mesmo
  `pii-inventory.yaml` carrega o achado `A-06` — *"data_deletion_log é zumbi confirmado no catálogo
  vivo"* — que é **renderizado no `.md`** por `gen-pii-md.cjs`. Corrigir a prosa e deixar o achado
  produziria um artefato de compliance que se contradiz em duas seções, e o critério de sucesso desta
  fase diz "as fontes de compliance param de afirmar…", no plural.
- **Correção:** `A-06` marcado como **RESOLVIDO por adoção**, preservando o fato de schema (4 colunas,
  sem FK, sem vínculo com titular) que continua sendo o que mantém a tabela fora do escopo do
  titular. A severidade e o `id` não mudaram — o achado não foi apagado, foi fechado com razão
  escrita.
- **Verificação:** `check:pii-inventory-md`, `check:recibo-exclusao` e `check:export-allowlist` saem
  0 (os dois últimos leem `tabelas` e `decisoes_por_coluna`, nunca `achados` — a asserção prova isso
  em vez de assumir).
- **Commit:** `102df07`

### Desvios de forma (documentados, não auto-fixes)

**2. O comando de verificação `npx vitest run src/features/admin/prompt-versions` da Task 3 não é
executável como escrito.** Não existe nenhum arquivo de teste sob `src/features/admin/prompt-versions/`
— o Vitest sai **1** com "No test files found", o que reprovaria a cadeia `&&` do `<automated>` por
ausência de alvo, não por regressão. O `<behavior>` pede "nenhum teste existente do painel de versões
de prompt quebra", e a leitura honesta disso com zero testes existentes é a **suíte inteira**:
`npm run test:run` → **1781/1781 em 179 arquivos**. O restante do guard node da Task 3 foi executado
verbatim e saiu 0.

**3. O portão do tracer foi satisfeito por execução, não por checkpoint interativo.** O plano declara
`autonomous: true` no frontmatter e o `<verify>` da Task 1 é integralmente automatizável (um script
node sobre o arquivo). Ele foi executado ponta a ponta e saiu `OK` **antes** de qualquer tarefa de
expansão começar — que é a propriedade que o portão existe para garantir. Nenhuma tarefa de expansão
rodou sobre um tracer não verificado.

---

**Total de desvios:** 1 auto-fix (funcionalidade crítica ausente) + 2 desvios de forma documentados.
**Impacto no plano:** nenhum scope creep. O auto-fix fecha um achado no mesmo arquivo que o plano já
mandava editar; os dois desvios de forma existem para não reprovar um gate por ausência de alvo nem
para fabricar um checkpoint que a autonomia declarada do plano dispensa.

## Issues Encountered

- **Nenhuma migration foi aplicada, nenhum smoke foi executado, nada foi deployado.** O plano é
  write-only por desenho, e este executor não recebe os tools MCP do Supabase (bug upstream
  anthropics/claude-code#13898).
- A `<precondition>` da Task 1 — a assinatura de `public.log_auditoria(...)` aceitar a chamada
  nomeada com os onze parâmetros — foi verificada **por leitura de fonte versionada**
  (`docs/sql/sql/25-functions-configuracoes.sql:63-77`, treze parâmetros com `DEFAULT`, os onze
  usados são um subconjunto contíguo por nome) e pelo call-site vivo idêntico da Phase 43
  (`20260801000002:424-435`). **Não foi lida em `pg_proc` nesta sessão** — como o plano previu. Se o
  apply falhar com função não encontrada, a falha é BARULHENTA e a correção é ajustar a lista de
  parâmetros ao que o catálogo mostrar, **nunca remover o `PERFORM`**.

## Verificação final

| Gate | Resultado |
|---|---|
| Guard automático da Task 1 (node) | **OK** — sem `DROP`, sem `DELETE`, sem `ALTER TYPE`, sem wrapper de transação, reconcile presente |
| Guard automático da Task 2 (node) | **OK** — sem `DROP COLUMN`, sem `UPDATE` retroativo, as 7 asserções presentes no smoke |
| Guard de conteúdo da Task 3 (node) | **OK** — inventário sem a afirmação antiga, bloco `colunas` preservado, copy sem o nome do objeto de banco |
| `npm run -s check:pii-inventory-md` | exit 0 |
| `npm run -s check:recibo-exclusao` | exit 0 |
| `npm run -s check:export-allowlist` | exit 0 |
| `npm run -s check:matriz-retencao` | exit 0 |
| `npm run test:run` | **1781 passed / 179 files** (baseline 1781 — sem regressão) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada 97 — sem regressão) |
| `--no-verify` | **0 usos** — o hook rodou e passou nos 3 commits |
| Migrations aplicadas | **0** |

## Known Stubs

Nenhum stub de código. Duas pendências **declaradas**, ambas de apply e nenhuma de implementação:

1. **As duas migrations e o smoke aguardam o checkpoint de apply do orquestrador** (seção
   "O QUE O ORQUESTRADOR HERDA"). Toda asserção de comportamento deste plano está marcada
   `pending_apply` na `coverage` — não `pass` — porque afirmá-las verdes sem o apply seria fabricar
   evidência.
2. **`database.types.ts` desatualizado após o apply de `20260809000003`**, por bloqueio de ambiente
   registrado. Não foi editado à mão.

## Threat Flags

Nenhuma superfície de segurança nova. A postura de `rollback_to_version` é preservada e **asserida**
(`SECURITY DEFINER` + `search_path` vazio, asserção (e) do `DO` block). A única mudança de superfície
é de **redução**: o nome de um objeto de banco saiu de uma copy de produto visível ao administrador
(T-47-03-08). Zero instalação de dependência.

## User Setup Required

Nenhuma para este plano. Para a dívida de tipos, quando houver ambiente: Supabase CLI no PATH +
`SUPABASE_ACCESS_TOKEN`, depois `npm run db:types`.

## Next Phase Readiness

- **47-09 (CONSOL-04)** herda a promessa órfã **canônica** já fechada: o `COMMENT` de
  `data_deletion_log` era a entrada nº 1 do registro de promessas, e o registro pode nascer com ela
  marcada como resolvida, citando `20260809000002`.
- **Phase 46 (purga automática)** ganha um discriminador que não existia: a partir do apply, nulo em
  `autorizacao_analise_video` significa "a pergunta não foi feita". Nenhuma decisão de purga deve ler
  os `false` históricos como resposta a uma pergunta atual — o `COMMENT` da coluna diz isso.
- **O portão destrutivo do M8 não se aplica a esta fase.** Confirmado por execução dos guards: as
  duas migrations não contêm `DROP TABLE`, `DROP COLUMN`, `DELETE` nem `UPDATE` retroativo.

## Self-Check: PASSED

Os 3 arquivos criados e os 4 modificados existem em disco; os 3 commits existem em `git log`
(`b44113c`, `7569641`, `102df07`). Verificado por execução, não por leitura.

---
*Phase: 47-transpar-ncia-consolida-o*
*Completed: 2026-08-09*

---

## Apply em PROD — executado pelo orquestrador em 2026-08-10

As duas migrations deste plano estão **vivas**, com fidelidade byte-perfeita.

| version | md5 (ledger = arquivo) | auto-verificação |
|---|---|---|
| `20260809000002` adoção do `data_deletion_log` | `dc8c973de30b514894ce2df622d408e8` | 5/5 asserções |
| `20260809000003` CONSENT-05 | `8cfbe479b9e8de96db238cd196323034` | 4/4 asserções |

### ⚠ Um defeito de guard corrigido ANTES do apply (`1fa7dc3`)

A asserção (e) da `20260809000002` exigia `proconfig @> ARRAY['search_path=']` — forma
**estrita**. Medido em PROD antes de aplicar: o catálogo grava `search_path=""`, **com aspas**.
Aplicar como estava **abortaria a migration inteira** sobre uma função correta.

É a mesma armadilha que a `20260809000001` (47-02) já havia medido e desarmado no seu bloco (d),
e que este arquivo não herdou. Corrigido com o mesmo padrão de regex que aceita as duas grafias.
**Um gate que reprova o trabalho certo treina quem executa a desligá-lo** — e aí ele para de pegar
o caso real.

### Estado medido depois do apply

| medida | antes | depois |
|---|---|---|
| `autorizacao_analise_video` nullable | `NO` | **`YES`** |
| `column_default` | `false` | **`null`** |
| `autorizacoes` linhas / não-nulos | 18 / 18 | **18 / 18** — zero back-fill |
| policies de `autorizacoes` | 3 | **3** — a asserção (e) do smoke da P43 segue verde |
| `rollback_to_version` chama `log_auditoria` | não | **sim** |
| COMMENT promete a função ausente | sim | **não** |

### Correção de medição no smoke (`cbd49b2`)

`smoke47.esperado_nao_nulos` estava em **17** (medição de 2026-08-02). A contagem viva medida
imediatamente antes do apply é **18** — a base cresceu uma linha, nascida sob o `DEFAULT false` e
não-nula legitimamente. Era exatamente o caso que o comentário original anteviu. Deixar 17 faria a
asserção (g) passar **por folga em vez de por medição**.

### O que resta deste plano

`supabase/tests/p47_consol03_consent05_smoke.sql` (7 PASS) ainda **não foi executado** — é
checkpoint do orquestrador e roda numa única chamada.
