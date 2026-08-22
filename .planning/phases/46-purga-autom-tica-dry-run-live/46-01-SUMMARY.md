---
phase: 46-purga-autom-tica-dry-run-live
plan: 01
subsystem: database
tags: [postgres, plpgsql, fixture, lgpd, retencao, purga, supabase, prod-write]

# ⚠ NAO E `complete`. O plano esta PAUSADO no checkpoint da Task 3.
# As Tasks 1 e 2 estao entregues e commitadas; a Task 3 e um apply em PROD que
# so o ORQUESTRADOR pode fazer (subagentes GSD nao recebem os tools MCP do
# Supabase — bug upstream anthropics/claude-code#13898).
status: checkpoint

requires:
  - phase: 43-previa-retencao
    provides: "public.candidaturas_alem_da_janela() — a UNICA definicao do predicado, e a matriz public.config_retencao_etapa"
  - phase: 45-motor-exclusao
    provides: "o envelope de subtransacao revertida por RAISE e a disciplina de proveniencia de md5, exercitados em PROD"
provides:
  - "Script de medicoes read-only (7 blocos M1..M7) executavel numa unica chamada MCP"
  - "Teardown da fixture, escrito e commitado ANTES da fixture (D-46-21)"
  - "Fixture de 8 titulares sinteticos / 9 candidaturas que torna o conjunto elegivel NAO-VAZIO"
  - "Artefato 46-01-MEDICOES.md com as sete medicoes estruturadas, aguardando os valores medidos"
affects: [46-02, 46-03, 46-04, 46-05, 46-06, 46-07]

actuals:
  tokens: 31000
  tasks: 2   # de 3 — a Task 3 e o checkpoint de apply, pendente do orquestrador
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Fixture durante como um unico DO block: ou existe inteira, ou nao existe"
    - "Selecao de gatilhos a desligar POR MEDICAO DO CATALOGO (`pg_get_functiondef LIKE '%net.http_post%'`), nunca por lista fixa de nomes"
    - "Lista de colunas de auth.users INTERSECTADA com o catalogo vivo, com aborto se sobrar NOT NULL sem default"
    - "Fixture discriminante: a variante positiva so e elegivel SE o degrau que ela testa funcionar"

key-files:
  created:
    - supabase/tests/p46_medicoes_pre_fixture.sql
    - supabase/tests/p46_teardown_fixture.sql
    - supabase/tests/p46_fixture_elegivel.sql
    - .planning/phases/46-purga-autom-tica-dry-run-live/46-01-MEDICOES.md
  modified: []

key-decisions:
  - "M5 le public.config_retencao_etapa direto em vez de chamar listar_matriz_retencao(), que recusa com 42501 quem nao tem claim de administrador e abortaria as sete medicoes de uma vez"
  - "M1 e M2 foram ESTENDIDOS alem do que o plano pediu: M1 enumera tambem os gatilhos AFTER INSERT que fazem net.http_post, e M2 cobre as 5 tabelas de dominio com CHECKs e FKs"
  - "A fixture desliga os gatilhos de despacho por criterio medido do catalogo e ABORTA se nao conseguir — falha fechada, porque um net.http_post que ja saiu nao volta com ROLLBACK"
  - "updated_at e retrodatado DUAS vezes: no proprio INSERT (defesa que independe do gatilho) e por UPDATE explicito com o gatilho desligado"
  - "pos1 e pos2 tem updated_at a -1 mes DE PROPOSITO, para que sejam elegiveis apenas se o degrau da data-ancora que elas testam funcionar"
  - "A fixture se recusa a existir (RAISE, transacao revertida) se render menos de 3 candidaturas elegiveis"
  - "9 candidaturas para 8 titulares: a nona, dentro da janela, e o unico caso em que o agrupamento por titular de D-46-11 morde"

patterns-established:
  - "Nao-vacuidade como condicao de COMMIT: a fixture assere o proprio efeito antes de persistir"
  - "Teardown antes da criacao, com verificacao de residuo em nove tabelas e ERRCODE proprio (P46B0)"

requirements-completed: []  # PURGA-03 e PURGA-07 so fecham depois do apply da Task 3

metrics:
  duration: ~50min
  completed: 2026-08-22
---

# Phase 46 Plan 01: Fixture do conjunto elegivel — Summary

> ## ⚠ PLANO PAUSADO NO CHECKPOINT DA TASK 3
> As Tasks 1 e 2 estao entregues, verificadas e commitadas. **Nada foi escrito em PROD.**
> A Task 3 e um apply em producao (inclusive em `auth.users`) que **so o orquestrador pode
> executar**. O que falta esta escrito na integra em §"O que o orquestrador tem de rodar".
> Este arquivo NAO deve ser lido como conclusao do plano.

Tres scripts SQL versionados — medicoes read-only, teardown e fixture de 8 variantes sinteticas —
que preparam o conjunto elegivel nao-vazio sobre o qual toda a Phase 46 sera medida, com o caminho
de remocao escrito e commitado antes da criacao.

## Accomplishments

- **`p46_medicoes_pre_fixture.sql`** — um unico `SELECT` estritamente read-only (zero verbo de
  escrita fora de comentario, verificado por grep) que devolve sete blocos `M1`..`M7` como um
  `jsonb` numa unica chamada MCP. E um `SELECT` so porque com varios statements o transporte
  devolveria apenas o ultimo e seis medicoes sumiriam em silencio.
- **`p46_teardown_fixture.sql`** — commitado em `a9c946d`, **antes** de `4ba340b` que traz a
  fixture. Ponto de entrada unico (o namespace do e-mail), todo `DELETE` correlacionado por
  `EXISTS`, ordem inversa a de criacao, guardas `NOT EXISTS` fail-closed em `vagas` e `auth.users`,
  e verificacao final de residuo em nove tabelas com `ERRCODE` proprio.
- **`p46_fixture_elegivel.sql`** — 8 titulares sinteticos, 9 candidaturas, 3 vagas, num unico `DO`
  block. Termina se recusando a persistir se `candidaturas_alem_da_janela()` devolver menos de 3.
- **`46-01-MEDICOES.md`** — sete secoes estruturadas, cada uma separando `Valor medido` (ainda
  `⟨NAO MEDIDO⟩`) de `Expectativa estrutural` (o que o repositorio diz, com `arquivo:linha`).

## Task Commits

| Task | Nome | Commit | Arquivos |
|------|------|--------|----------|
| 1 | Medicoes read-only | `7152c55` | `p46_medicoes_pre_fixture.sql`, `46-01-MEDICOES.md` |
| 2a | Teardown (escrito primeiro) | `a9c946d` | `p46_teardown_fixture.sql` |
| 2b | Fixture das 8 variantes | `4ba340b` | `p46_fixture_elegivel.sql` |
| 3 | **[CHECKPOINT]** apply em PROD | — | pendente do orquestrador |

## O que o orquestrador tem de rodar (Task 3)

Sequencia exata, por MCP `execute_sql`, uma chamada por passo:

1. **Medir.** Conteudo integral de `supabase/tests/p46_medicoes_pre_fixture.sql`. Transcrever os
   sete valores para `46-01-MEDICOES.md`, trocando cada `⟨NAO MEDIDO⟩`.
   ⚠ Se `M7.ja_existe_fixture` vier diferente de `0`, rodar o teardown antes de qualquer coisa.
2. **Aplicar a fixture.** Conteudo integral de `supabase/tests/p46_fixture_elegivel.sql`.
   ⚠ **ISTO ESCREVE EM PROD, INCLUSIVE EM `auth.users`.** Aditivo e sintetico.
3. **Provar a nao-vacuidade.** `SELECT count(*) FROM public.candidaturas_alem_da_janela();` —
   tem de ser `>= 3`. A propria fixture ja aborta abaixo disso, entao um numero menor aqui so
   aparece se algo mudou entre o passo 2 e o passo 3.
4. **Contaminacao.** As quatro consultas de §Contaminacao abaixo.
5. **Registrar** os numeros dos passos 3 e 4 em `46-01-MEDICOES.md` §Pos-fixture, com o `now()`
   do servidor.

Saida de emergencia em qualquer passo: `supabase/tests/p46_teardown_fixture.sql`.

## Expectativa aritmetica do passo 3 — e por que ela MUDA nos proximos planos

Com o predicado como esta vivo HOJE (sem as excecoes de 46-03 e sem `elegivel_purga` de 46-02):

| Variante | etapa | ancora | elegivel HOJE | vira NAO-elegivel em |
|---|---|---|---|---|
| `pos1` | `aprovado` | historico -30m | **sim** | — |
| `pos2` | `decisao_final` | `data_decisao_final` -30m | **sim** | — |
| `pos3` | `rejeitado` | `updated_at` -30m | **sim** | — |
| `cap2` | `aprovado` | historico -30m | **sim** | — |
| `neg-hold` | `aprovado` | historico -30m | sim | 46-03 (`retencao_hold`) |
| `neg-vaga` | `aprovado` | historico -30m | sim | 46-03 (vaga `ativa`) |
| `neg-art20` | `aprovado` | historico -30m | **nao** (excecao ja viva) | — |
| `neg-etapa` | `entrevista_online` | historico -30m | sim | 46-02 (`elegivel_purga`) |
| 9a candidatura | `triagem` | -1 mes | nao | — |

**Esperado no passo 3: 7.** Cada plano seguinte derruba esse numero de forma previsivel — e a
queda e a PROVA de que a excecao daquele plano morde. Depois de 46-02 e 46-03 o numero cai para
**4** (`pos1`, `pos2`, `pos3`, `cap2`). Um numero que NAO caia e a asserção falhando em silencio.

## Contaminacao — as quatro consultas, com a correcao de uma que reprovaria trabalho correto

⚠ **Uma delas nao pode ser rodada como o plano a escreveu.** `v_triagem_panel` e
`security_invoker = true` (`20260805000008`): rodada como `postgres`, ela projeta TODAS as
candidaturas, entao `count(*) ... WHERE candidato_id IN (<ids da fixture>)` devolveria 9 e mandaria
destruir uma fixture correta. A pergunta certa nao e "a linha existe na view", e sim **"um humano
do RH a enxerga"** — que e o que a RLS responde. Medir sob o papel, nao sob `postgres`:

1. **Fila do RH / painel de triagem.** `rh_le_candidaturas` (`20260706110004:63-69`) escopa o papel
   `rh` a `vagas.created_by = auth.uid()`. As tres vagas da fixture nascem com `created_by` **nulo**,
   logo nenhum recrutador as alcanca. Conferir estruturalmente:
   `SELECT count(*) FROM public.vagas WHERE titulo LIKE 'fixture-p46%' AND created_by IS NOT NULL;`
   → **tem de ser 0**. Para conferir por RLS de verdade, `SET LOCAL ROLE authenticated` com
   `request.jwt.claims` de um usuario `rh` e repetir a contagem sobre `v_triagem_panel`.
   ⚠ Sob `administrador` a fixture E visivel — por desenho, nao por defeito: administrador ve tudo.
   A defesa ali e o `nome_completo` comecar com `FIXTURE P46` e o e-mail estar no namespace.
2. **Snapshot de vies k=5.** Rodar a geracao em modo de leitura e conferir que nenhuma celula mudou
   de tamanho. As 9 candidaturas estao em `status = 'finalizado'` e em vagas sem dono; se ainda
   assim uma celula mudar, e contaminacao real ⇒ teardown.
3. **Notificacoes.**
   `SELECT count(*) FROM public.notificacoes_enviadas n WHERE EXISTS (SELECT 1 FROM public.candidaturas c JOIN public.candidatos ca ON ca.id = c.candidato_id JOIN auth.users u ON u.id = ca.user_id WHERE c.id = n.candidatura_id AND u.email LIKE 'fixture-p46+%@invalido.local');`
   → **tem de ser 0**. O teardown ja assere isso tambem.
4. **Zero linha de pessoa real alterada.**
   `SELECT count(*) FROM public.candidaturas WHERE deleted_at IS NULL;` → tem de bater
   `M7.candidaturas_vivas + 9`. ⚠ **9, nao 8**: o plano 46-01 diz "8 variantes" numa secao e
   "as 9 candidaturas" noutra. A contagem correta e **9** — 8 titulares com uma candidatura cada,
   mais a nona candidatura do titular `neg-etapa` (D-46-11).

## Deviations from Plan

### [Rule 1 - Bug] M5 chamaria uma RPC que recusa a propria sessao de medicao

- **Encontrado em:** Task 1
- **Problema:** o plano pedia `SELECT * FROM public.listar_matriz_retencao()`. Aquela funcao tem
  guard de papel NULL-safe (`20260801000002:288-291`) e levanta `42501` para todo chamador cujo
  `auth.jwt() #>> '{app_metadata,role}'` nao seja `'administrador'` — exatamente o chamador desta
  medicao, como o proprio M3 registra. Como as sete medicoes sao um unico `SELECT`, a recusa
  abortaria **todas**.
- **Correcao:** M5 le `public.config_retencao_etapa` diretamente; M4 registra o catalogo da RPC
  recusante. Nada se perdeu: o unico campo a mais da RPC e o NOME do administrador, que e
  admin-only por SEG-02 e nao pertence a um artefato de planning versionado.
- **Commit:** `7152c55`

### [Rule 2 - Funcionalidade critica ausente] A fixture dispararia analise de IA real e webhooks

- **Encontrado em:** Task 1 (leitura), aplicado na Task 2
- **Problema:** `public.candidaturas` tem dois gatilhos AFTER INSERT que fazem `net.http_post` para
  fora — `trg_candidaturas_analise` (`20260610000002:68-70`) e `trg_n8n_nova_candidatura`
  (`20260706110005:90-93`). Nove `INSERT`s produziriam nove analises de IA reais: custo, escrita
  nas tabelas de IA, `score_geral` carimbado de volta e contaminacao do snapshot de vies. O plano
  so previa a defesa contra `notificacoes_enviadas`. Sao as ameacas T-46-01-02 e T-46-01-03 do
  proprio registro STRIDE do plano, com disposicao `mitigate` e sem mitigacao escrita.
- **Correcao:** a fixture desliga, **por criterio medido do catalogo** (`pg_get_functiondef LIKE
  '%net.http_post%'`) e nunca por lista fixa de nomes, os gatilhos de despacho das cinco tabelas;
  religa todos na mesma transacao; e **ABORTA** se sobrar algum ativo. Falha fechada, porque um
  `net.http_post` que ja saiu nao volta com `ROLLBACK`. M1 ganhou a coluna `dispara_http` e M1c
  ganhou a presenca (booleana) dos segredos de Vault que decidem se o despacho chega a sair.
- **Commits:** `7152c55`, `4ba340b`

### [Rule 2 - Funcionalidade critica ausente] M2 media apenas `auth.users`

- **Problema:** a fixture escreve em cinco tabelas de dominio cujo mapa de nullability e de CHECKs
  **nao pode ser lido do repositorio**: `20260805000006:1814` registra, dentro de uma migration
  aplicada em PROD, que `docs/sql/sql/02-tabela-candidatos.sql` diverge do catalogo vivo em pelo
  menos `cpf`. Sem medir, a fixture falharia no apply — ou, pior, escreveria uma cadeia quebrada.
- **Correcao:** M2 passou a cobrir `candidatos`, `candidaturas`, `vagas`, `decisao_final` e
  `historico_candidatura`, com `M2b` (CHECKs e UNIQUEs) e `M2c` (as FKs de `decisao_final`, que
  decidem o que `por_usuario` aceita). A propria fixture repete a pergunta ao catalogo em tempo de
  execucao, para nao depender de a medicao ter sido transcrita corretamente.
- **Commits:** `7152c55`, `4ba340b`

### [Rule 1 - Bug] O retrodate por `UPDATE`, sozinho, se autoderrota

- **Problema:** o plano manda retrodatar `updated_at` "por `UPDATE` explicito **depois** do
  `INSERT`". `docs/sql/sql/13-tabela-candidaturas.sql:145` declara
  `update_candidaturas_updated_at BEFORE UPDATE ... NEW.updated_at = NOW()`. Se esse gatilho
  estiver vivo — M1b mede —, o `UPDATE` e sobrescrito, o degrau (3) resolve para `now()` e a
  fixture rende ZERO. E literalmente o modo de falha que D-46-21 nomeia.
- **Correcao:** duas defesas. `updated_at` ja vai retrodatado **no proprio `INSERT`** (o gatilho e
  `BEFORE UPDATE` e nao dispara em `INSERT`), e o `UPDATE` explicito exigido pelo criterio de
  aceite roda com o gatilho desligado e religado na mesma transacao. A primeira defesa vale mesmo
  se a segunda for impossivel.
- **Commit:** `4ba340b`

### [Rule 1 - Bug] Um criterio de aceite tornaria as positivas verdes pelo motivo errado

- **Problema:** o plano exige `data_candidatura` **E** `updated_at` retrodatados 30 meses em todas
  as variantes. Com tudo a -30 meses, `pos1` e `pos2` seriam elegiveis **mesmo que os degraus (1) e
  (2) da data-ancora estivessem quebrados** — a data as protegeria, e a asserção sobre
  `ancora_origem` passaria por vacuidade. E a mesma classe de defeito que o proprio plano proibe
  para as variantes negativas ("se a fixture negativa estiver dentro da janela, a asserção passa
  porque a data protegeu").
- **Correcao:** `pos1` e `pos2` ficam com `updated_at` a **-1 mes**, de modo que so sao elegiveis se
  o degrau que testam funcionar. Todas as demais (positiva `pos3`, `cap2` e as quatro negativas)
  ficam a -30 meses, robustamente fora, pela razao simetrica. `data_candidatura` continua a -30
  meses em todas as oito.
- **Commit:** `4ba340b`

### [Rule 2] A nona candidatura, e a contradicao 8-vs-9 do plano

- **Problema:** o plano descreve 8 variantes mas a Task 3 aritmetiza "as 9 candidaturas". Alem
  disso, D-46-11 ("o alvo e o TITULAR, quando TODAS as suas candidaturas estao alem da janela")
  nao tinha nenhum caso de fixture em que o agrupamento por titular MORDESSE.
- **Correcao:** uma nona candidatura, dentro da janela, presa ao titular `neg-etapa` — escolhido
  justamente por ja ser nao-elegivel por outro motivo, de modo que nenhuma variante positiva e
  perturbada. Reconcilia a aritmetica do plano e da a 46-02 um caso negativo real para
  `titulares_alem_da_janela()`. Uma terceira vaga arquivada existe so para satisfazer
  `unique_candidato_vaga` sem por a nona candidatura numa vaga ativa.
- **Commit:** `4ba340b`

### [Rule 3] `jsonb ? text` trocado pela forma funcional

- **Problema:** o operador `?` e correto em SQL, mas e o marcador de placeholder de varios drivers,
  e estes arquivos atravessam um transporte MCP antes de chegar ao servidor.
- **Correcao:** `jsonb_exists(a, b)` nos dois pontos. Nenhum `?` fora de comentario na fixture.
- **Commit:** `4ba340b`

## Known Stubs

| Stub | Arquivo | Razao | Resolvido por |
|---|---|---|---|
| Bloco de `retencao_hold` inerte | `p46_fixture_elegivel.sql` §5f | `public.retencao_hold` so nasce no plano 46-03; o bloco fica guardado por `to_regclass` e emite `RAISE NOTICE` nomeando o que falta | **46-03**, que TEM de inserir a linha de hold para a candidatura `4601c000-...-05`. Enquanto faltar, `neg-hold` e apenas mais uma elegivel e a asserção (j.1) do smoke passaria por vacuidade |
| `46-01-MEDICOES.md` com sete `⟨NAO MEDIDO⟩` | `46-01-MEDICOES.md` | O executor GSD nao tem os tools MCP do Supabase; inventar valores seria o unico modo de falha inaceitavel deste plano | **Task 3, passo 1**, pelo orquestrador |
| `## Pos-fixture` ausente | `46-01-MEDICOES.md` | Depende dos passos 3 e 4 da Task 3 | **Task 3, passo 5** |

## Threat Flags

Nenhuma superfície nova alem das ja registradas no `<threat_model>` do plano. As mitigacoes de
T-46-01-02 e T-46-01-03 foram **fortalecidas** (desligamento medido dos gatilhos de despacho,
`created_by` nulo nas vagas, `ativo = false` nos titulares, `status = 'finalizado'` nas nove
candidaturas) e a de T-46-01-05 esta implementada (sem senha utilizavel, `email_confirmed_at`
nulo).

## Verification

| Criterio | Estado |
|---|---|
| `p46_medicoes_pre_fixture.sql` existe, sete blocos `M1`..`M7` | ✅ |
| Zero verbo de escrita fora de comentario no script de medicoes | ✅ (grep = 0) |
| Zero `BEGIN;` no script de medicoes | ✅ (grep = 0) |
| `46-01-MEDICOES.md` com sete secoes `## M1`..`## M7` | ✅ (grep = 7) |
| Nenhuma secao diz "presumido" / "provavelmente" / "igual a Phase 45" | ✅ (grep = 0) |
| Teardown num commit ANTERIOR ao da fixture | ✅ (`a9c946d` < `4ba340b`) |
| Sem sorteio na fixture | ✅ (`random()` = 0 fora de comentario) |
| Sem negacao por conjunto de valores no teardown | ✅ (`NOT IN` = 0 fora de comentario) |
| As 8 variantes greppaveis pelo namespace | ✅ (grep = 8) |
| `updated_at` retrodatado, com `UPDATE` derivado de intervalo em meses | ✅ (grep = 23; `make_interval(months` presente no `UPDATE`) |
| Zero escrita em `notificacoes_enviadas` | ✅ (grep = 0 fora de comentario) |
| `neg-hold` guardado por `to_regclass('public.retencao_hold')` | ✅ |
| Teardown termina contando residuo e levantando excecao | ✅ (nove tabelas, `P46B0`) |
| `npm run lint` | ✅ (tsc: 96 erros, baseline congelado inalterado) |
| `npm run test:run` | ✅ (188 arquivos, 1895 testes) |
| ⊖ `candidaturas_alem_da_janela() >= 3` | ⏳ **pendente da Task 3** |
| As 4 consultas de contaminacao | ⏳ **pendente da Task 3** |

## Self-Check: PASSED

Arquivos criados conferidos em disco:

- `supabase/tests/p46_medicoes_pre_fixture.sql` — FOUND
- `supabase/tests/p46_teardown_fixture.sql` — FOUND
- `supabase/tests/p46_fixture_elegivel.sql` — FOUND
- `.planning/phases/46-purga-autom-tica-dry-run-live/46-01-MEDICOES.md` — FOUND

Commits conferidos em `git log`: `7152c55`, `a9c946d`, `4ba340b` — todos FOUND.
Zero `--no-verify`; o hook de pre-commit rodou nos tres e reportou o baseline de tsc inalterado.
