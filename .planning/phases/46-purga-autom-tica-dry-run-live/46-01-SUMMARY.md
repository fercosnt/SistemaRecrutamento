---
phase: 46-purga-autom-tica-dry-run-live
plan: 01
subsystem: database
tags: [postgres, plpgsql, fixture, lgpd, retencao, purga, supabase, prod-write]
status: complete

requires:
  - phase: 43-previa-retencao
    provides: "public.candidaturas_alem_da_janela() — a UNICA definicao do predicado, e a matriz public.config_retencao_etapa"
  - phase: 45-motor-exclusao
    provides: "o envelope de subtransacao revertida por RAISE e a disciplina de proveniencia de md5, exercitados em PROD"
provides:
  - "Conjunto elegivel NAO-VAZIO vivo em PROD: candidaturas_alem_da_janela() saiu de 0 para 7"
  - "8 titulares sinteticos / 9 candidaturas / 3 vagas sob o namespace fixture-p46+%@invalido.local"
  - "Teardown commitado ANTES da fixture (D-46-21), com verificacao de residuo em nove tabelas"
  - "46-01-MEDICOES.md com as sete medicoes lidas por execucao contra PROD"
  - "Primeira prova por execucao de que a excecao do Art. 20 do predicado da Phase 43 morde"
affects: [46-02, 46-03, 46-04, 46-05, 46-06, 46-07]

actuals:
  tokens: 41000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Fixture duravel como um unico DO block: ou existe inteira, ou nao existe"
    - "Selecao de gatilhos a desligar POR CRITERIO MEDIDO DO CATALOGO, nunca por lista fixa de nomes"
    - "Lista de colunas de auth.users intersectada com o catalogo vivo, com aborto se sobrar NOT NULL sem default"
    - "Fixture discriminante: a variante positiva so e elegivel SE o degrau que ela testa funcionar"
    - "Nao-vacuidade como condicao de COMMIT, nao como observacao no fim do log"

key-files:
  created:
    - supabase/tests/p46_medicoes_pre_fixture.sql
    - supabase/tests/p46_teardown_fixture.sql
    - supabase/tests/p46_fixture_elegivel.sql
    - .planning/phases/46-purga-autom-tica-dry-run-live/46-01-MEDICOES.md
  modified: []

key-decisions:
  - "M5 le config_retencao_etapa direto: listar_matriz_retencao() recusa com 42501 quem nao tem claim de administrador, e M3 mediu jwt role = null — a chamada teria abortado as sete medicoes"
  - "A fixture desliga os gatilhos de net.http_post por criterio medido do catalogo e ABORTA se nao conseguir; a lista estatica do repositorio estava DESATUALIZADA e teria deixado trg_notif_confirmacao ativo"
  - "updated_at retrodatado no proprio INSERT alem do UPDATE explicito — M1b confirmou que o gatilho de carimbo existe e a armadilha de D-46-21 estava armada"
  - "pos1 e pos2 com updated_at a -1 mes, para que so sejam elegiveis se o degrau da data-ancora que testam funcionar"
  - "A fixture se recusa a persistir se render menos de 3 elegiveis"
  - "9 candidaturas para 8 titulares: a nona, dentro da janela, e o unico caso em que o agrupamento por titular de D-46-11 morde"
  - "por_usuario da decisao do Art. 20 resolvido em runtime pelo catalogo: a FK aponta para auth.users, entao o titular sintetico assinou e nenhum recrutador real foi usado"

patterns-established:
  - "Criterio dinamico > lista de nomes: a lista envelhece em silencio, o criterio nao"
  - "Teardown antes da criacao, com verificacao de residuo e ERRCODE proprio (P46B0)"
  - "Separar 'Valor medido' de 'Expectativa estrutural' no artefato de medicoes, para que a divergencia fique escrita"

requirements-completed: []  # ver §Requirements — PURGA-03 e PURGA-07 NAO fecham neste plano

metrics:
  duration: ~75min
  completed: 2026-08-22
---

# Phase 46 Plan 01: Fixture do conjunto elegivel — Summary

O conjunto elegivel da Phase 46 deixou de ser vazio **por construcao deliberada**:
`public.candidaturas_alem_da_janela()` saiu de **0 para 7** em PROD, o caminho de remocao existia
desde antes, e o numero esta escrito com a hora do servidor. A partir daqui, nenhuma asserção desta
fase pode passar por vacuidade.

## Accomplishments

- **`p46_medicoes_pre_fixture.sql`** — um unico `SELECT` estritamente read-only (zero verbo de
  escrita fora de comentario, verificado por grep) que devolveu sete blocos `M1`..`M7` como um
  `jsonb` numa unica chamada MCP. Sete premissas fechadas por execucao.
- **`p46_teardown_fixture.sql`** — commitado em `a9c946d`, **antes** de `4ba340b`. Ponto de entrada
  unico (o namespace do e-mail), todo `DELETE` correlacionado por `EXISTS`, guardas `NOT EXISTS`
  fail-closed em `vagas` e `auth.users`, verificacao final de residuo em nove tabelas com `P46B0`.
- **`p46_fixture_elegivel.sql`** — aplicada em PROD em `2026-08-22T19:01:09-03:00`. 8 titulares
  sinteticos, 9 candidaturas, 3 vagas, num unico `DO` block.
- **`46-01-MEDICOES.md`** — sete secoes com os valores medidos mais `## Pós-fixture` com o
  resultado do apply e as cinco asserções de contaminacao.

## Task Commits

| Task | Nome | Commit |
|------|------|--------|
| 1 | Medicoes read-only (M1–M7) | `7152c55` |
| 2a | Teardown — escrito **primeiro** (D-46-21) | `a9c946d` |
| 2b | Fixture das 8 variantes | `4ba340b` |
| — | SUMMARY + STATE + ROADMAP (checkpoint) | `8d1083f` |
| 3 | Escrituracao dos valores medidos + correcao do comentario desmentido | `<este commit>` |

## Task 3 — o que o apply provou

| Medicao | Antes | Depois | Delta |
|---|---|---|---|
| **`candidaturas_alem_da_janela()`** | **0** | **7** | criterio era `>= 3` |
| `auth.users` | 29 | 37 | +8 titulares sinteticos |
| `candidaturas` vivas | 11 | 20 | +9 candidaturas |
| vagas da fixture | 0 | 3 | +3 |

| `slug#sufixo` | Elegivel | O que prova |
|---|---|---|
| `pos1#01` | ✓ | degrau **(1)** da data-ancora funciona (`updated_at` dela esta a -1 mes) |
| `pos2#02` | ✓ | degrau **(2)** funciona |
| `pos3#03` | ✓ | degrau **(3)** funciona **e o retrodate sobreviveu ao gatilho de carimbo** |
| `cap2#04` | ✓ | ha 2+ elegiveis: a prova do cap (D-46-08) pode ser feita reduzindo o cap por RPC |
| `neg-hold#05` | ✓ | correto AGORA, **errado depois do 46-03** |
| `neg-vaga#06` | ✓ | correto AGORA, **errado depois do 46-03** |
| `neg-etapa#08` | ✓ | correto AGORA, **errado depois do 46-02** |
| **`neg-art20#07`** | **✗** | **a excecao do Art. 20 funciona** |
| **`neg-etapa#09`** | **✗** | dentro da janela: o caso de D-46-11 |

### O achado do plano

**`neg-art20#07` ser falso e a primeira prova por execucao de que a excecao de revisao do Art. 20
morde.** Ela foi escrita na Phase 43 e nunca havia sido exercitada — ate hoje ela era codigo rodando
sobre um conjunto vazio, que e a mesma classe do P39/CR-02, uma guarda que era dead code.

### O contrato de nao-vacuidade dos proximos dois planos

| Momento | esperado | quem sai |
|---|---|---|
| **agora** | **7** | — |
| apos 46-02 (`elegivel_purga` / allowlist D-46-19) | **6** | `neg-etapa#08` |
| apos 46-03 (`retencao_hold` + vaga aberta) | **4** | `neg-hold#05`, `neg-vaga#06` |

⚠ **Um numero que nao cair e a excecao daquele plano falhando em silencio.** Cada plano tem de
derrubar exatamente as linhas nomeadas e provar a queda com a mesma consulta.

### Contaminacao — as cinco asserções negativas

| # | Asserção | Medido | |
|---|---|---|---|
| C1 | gatilhos deixados desligados | **0** — todos religados | ✅ |
| C2 | `notificacoes_enviadas` | **11 → 11** | ✅ |
| C2b | `net._http_response` desde `18:45:33` | **0** | ✅ |
| C3 | as 3 vagas com `created_by IS NULL` | **true** | ✅ |
| C5 | candidaturas reais · `auth.users` reais | **11 → 11** · **29 → 29** | ✅ |

**C5 fecha T-46-01-01:** zero linha de pessoa real foi alterada.
**C2b e a asserção mais forte:** zero resposta HTTP significa que nenhuma analise de IA, nenhuma
notificacao e nenhum webhook saiu durante os nove `INSERT`s.

## A medicao que desmentiu o repositorio — e por que isso importa mais que o resto

O cabecalho da fixture nomeava **dois** gatilhos de `net.http_post` em `candidaturas`, lidos dos
arquivos de migration. **M1a mediu TRES**, e um dos dois que o repositorio anunciava
(`trg_n8n_nova_candidatura`) **nao existe mais** — coerentemente com `n8n_webhook_base` estar
ausente do Vault (M1c). Os tres reais sao `trg_candidaturas_analise`, `trg_notif_confirmacao` e
`trg_candidatura_encerrada_a_pedido`.

**Uma lista fixa de nomes teria deixado `trg_notif_confirmacao` ATIVO durante os nove `INSERT`s.**
Com `NOTIFICACOES_MODO=producao`, isso teria escrito nove linhas em `public.notificacoes_enviadas` e
disparado o envio — exatamente a ameaca T-46-01-03, cuja unica defesa prevista pelo plano era o
dominio `@invalido.local` nao ser roteavel. O criterio dinamico
(`pg_get_functiondef(p.oid) LIKE '%net.http_post%'`) pegou os tres, e C2/C2b provam que nada saiu.
O comentario do arquivo foi corrigido para nomear os tres medidos e para registrar a licao.

## Deviations from Plan

Sete desvios. Os seis primeiros foram aplicados nas Tasks 1–2 e ja estavam registrados; o setimo
veio da propria medicao.

### [Rule 1 - Bug] M5 chamaria uma RPC que recusa a propria sessao de medicao — **confirmado por M3**

O plano pedia `SELECT * FROM public.listar_matriz_retencao()`. Aquela funcao levanta `42501` para
todo chamador cujo `auth.jwt() #>> '{app_metadata,role}'` nao seja `'administrador'`, e **M3 mediu
`jwt_app_metadata_role: null`**. Como as sete medicoes sao um unico `SELECT`, a recusa teria
abortado **todas**. M5 leu a tabela-base; M4 registrou o catalogo da RPC recusante. Commit `7152c55`.

### [Rule 2 - Funcionalidade critica ausente] A fixture dispararia despacho real — **e a lista do plano estava errada**

Detalhado em §"A medicao que desmentiu o repositorio". Commits `7152c55`, `4ba340b`, mais a correcao
do comentario neste commit.

### [Rule 2] M2 media apenas `auth.users`

Estendida para as cinco tabelas de dominio, com `M2b` (CHECKs/UNIQUEs) e `M2c` (FKs de
`decisao_final`). **M2c pagou sozinha o custo da extensao:** a FK de `por_usuario` aponta para
`auth.users`, nao para `usuarios_rh`, entao a decisao sintetica do Art. 20 foi assinada pelo proprio
titular sintetico e **nenhum ID de recrutador real foi usado** — a ressalva registrada no checkpoint
nao se concretizou. Commits `7152c55`, `4ba340b`.

### [Rule 1 - Bug] O retrodate por `UPDATE`, sozinho, se autoderrota — **M1b confirmou a armadilha armada**

`update_candidaturas_updated_at` / `update_updated_at_column` esta **vivo e `tgenabled='O'`**. Um
retrodate feito so por `UPDATE`, como o plano prescrevia, teria sido sobrescrito e a fixture teria
rendido ZERO sem erro nenhum. A defesa de retrodatar no proprio `INSERT` era necessaria, e
`pos3#03` ser elegivel e a prova de que ela funcionou. Commit `4ba340b`.

### [Rule 1 - Bug] Um criterio de aceite tornaria as positivas verdes pelo motivo errado

`pos1` e `pos2` ficaram com `updated_at` a **-1 mes** em vez de -30, para que so fossem elegiveis se
o degrau que testam funcionasse. As duas vieram `✓`, o que agora prova os degraus (1) e (2)
individualmente — com tudo a -30 meses isso teria passado por vacuidade. Commit `4ba340b`.

### [Rule 2] A nona candidatura, e a contradicao 8-vs-9 do plano

Resolvida por construcao: 8 titulares, 9 candidaturas. `neg-etapa#09` veio `✗`, dando a 46-02 um
caso negativo real para `titulares_alem_da_janela()`. Commit `4ba340b`.

### [Rule 3] `jsonb ? text` trocado por `jsonb_exists`

O `?` e marcador de placeholder de varios drivers e estes arquivos atravessam um transporte MCP.
Commit `4ba340b`.

## Known Stubs

| Stub | Arquivo | Razao | Resolvido por |
|---|---|---|---|
| Linha de `retencao_hold` para `neg-hold` nao inserida | `p46_fixture_elegivel.sql` §5f | A tabela nao existia no apply (M7: `ja_existe_retencao_hold = false`); o bloco guardado por `to_regclass` emitiu `RAISE NOTICE` | **46-03**, que TEM de inserir a linha de hold para a candidatura `4601c000-0000-4000-8000-000000000005`. Enquanto faltar, `neg-hold#05` continua elegivel e a asserção (j.1) do smoke passaria por vacuidade |
| `M2b` (CHECKs e UNIQUEs) `⟨NAO MEDIDO⟩` | `46-01-MEDICOES.md` §M2 | A consulta nao foi executada como leitura separada. A fixture ter aplicado sem violar nada e **evidencia fraca**: prova que os oito valores gerados passaram, nao qual e o conjunto de restricoes vivo | Qualquer plano futuro que gere CPF/celular sintetico com outro formato — medir antes |
| `min(data_candidatura)` `⟨NAO MEDIDO⟩` | `46-01-MEDICOES.md` §M7 | Nao constou do retorno transcrito | Nao bloqueia: `alem_da_janela = 0` ja provou a linha de base de vacuidade |
| Asserção de contaminacao de IA feita **indiretamente** | `46-01-MEDICOES.md` §Pós-fixture | A consulta `C4` do plano apontava para `public.analises_candidato`, que **nao existe**; a tabela real e `public.analise_candidato_vaga`. A cobertura veio por C2b (zero HTTP ⇒ nenhuma analise disparada), que e inferencia solida mas e inferencia | O smoke `p46_purga_smoke.sql` (Wave 0), com a consulta corrigida ja escrita em §Pós-fixture |

## Requirements

**`requirements-completed` fica VAZIO de proposito.** O plano declara `[PURGA-03, PURGA-07]` no
frontmatter, mas nenhum dos dois fecha aqui, e marca-los agora seria a promessa-sem-codigo que o
CONSOL-04 deste projeto audita:

- **PURGA-03** ("primeira ativacao em dry-run por periodo documentado") exige os 14 dias corridos
  com ledger nao-vazio — fecha no **46-07**. Este plano entregou a pre-condicao sem a qual aqueles
  14 dias provariam zero.
- **PURGA-07** ("`COALESCE` explicito + allowlist de terminais") exige a coluna `elegivel_purga` e a
  allowlist, que nascem no **46-02**/**46-03**. Este plano provou o `COALESCE` por execucao (os tres
  degraus, via `pos1`/`pos2`/`pos3`), mas a allowlist ainda nao existe: M5c mediu
  `elegivel_purga = false`.

## Consequencias medidas para os proximos planos

- **46-02 / 46-03 / 46-04:** os pins de `md5(prosrc)` **batem hoje** —
  `anonimizar_candidato = 8c86e0f040219e7eade47eb587dbf5de` e
  `candidaturas_alem_da_janela = ddfa6542921d241323c0124fc1bd1f99` (M4b). Esta fase **invalida os
  dois**. Os re-pins sao obrigacao real, com conferencia CRUZADA vivo × arquivo, e **nunca**
  desculpa para afrouxar a asserção (Pitfall 2).
- **46-03:** tem de inserir a linha de `retencao_hold` da fixture (ver §Known Stubs).
- **46-04:** `[ASSUMED A3]` esta **fechado por execucao** (M3: as tres claims nulas sob `postgres`).
  D-46-18 (Saida B) segue de pe sobre medicao. Pode escrever o quarto ramo sem reabrir a pergunta.
- **46-06:** `cron.job` tem **3** jobs (M6) e a asserção (a) de `p42_invent05_cron_smoke.sql:98` fixa
  exatamente 3 com uma mensagem de falha que daria **diagnostico falso** para o 4º job legitimo.
  D-46-23 — emendar no mesmo commit. O `0 3 * * *` de D-46-10 nao colide com `30 1`, `0 2` nem `*/15`.
- **46-07:** das tres linhas da allowlist, **duas seguem em `seed`** (`aprovado` e `decisao_final`);
  so `rejeitado` foi escolhida por um humano (18 meses, `origem='admin'`). Confirmar as duas e
  pre-condicao do flip (D-46-22), somada as de D-46-14.
- **Toda a fase:** `statement_timeout = 2min` (M7) e `proconfig` gravado como `search_path=""`
  **com aspas** (M4, Pitfall 10 confirmado) — as asserções de smoke comparam contra estas formas.

## Verification

| Criterio | Estado |
|---|---|
| `p46_medicoes_pre_fixture.sql` read-only, sete blocos `M1`..`M7` | ✅ (grep = 0 verbos de escrita; 0 `BEGIN;`) |
| `46-01-MEDICOES.md` com sete secoes `## M1`..`## M7` | ✅ (grep = 7) |
| Nenhuma secao diz "presumido" / "provavelmente" / "igual a Phase 45" | ✅ (grep = 0) |
| M1 declara `presente`/`ausente` para o gatilho de `updated_at` | ✅ (**PRESENTE**, com `tgname`) |
| M5 lista as 8 etapas e nomeia quantas estao em `seed` | ✅ (**7 de 8**) |
| M7 registra a base de `candidaturas_alem_da_janela()` | ✅ (**0**) |
| Teardown num commit ANTERIOR ao da fixture | ✅ (`a9c946d` < `4ba340b`) |
| Sem sorteio na fixture · sem `NOT IN` no teardown | ✅ (grep = 0 / 0) |
| As 8 variantes greppaveis · `neg-hold` guardado por `to_regclass` | ✅ (grep = 8 / 1) |
| Zero escrita em `notificacoes_enviadas` | ✅ (grep = 0 **e** medido `11 → 11`) |
| `46-01-MEDICOES.md` §`## Pós-fixture` | ✅ (grep = 1) |
| ⊖ `candidaturas_alem_da_janela() >= 3` | ✅ **7** |
| ≥ 2 degraus de ancora exercitados | ✅ **3** — `pos1`/`pos2`/`pos3` todos `✓` |
| As consultas de contaminacao devolvem zero | ✅ C1/C2/C2b/C3/C5; ⚠ C4 coberta indiretamente |
| Zero linha de pessoa real alterada | ✅ `11 → 11` e `29 → 29` |
| `npm run lint` | ✅ (tsc: 96 erros, baseline congelado inalterado) |
| `npm run test:run` | ✅ (188 arquivos, 1895 testes) |
| Zero `--no-verify` | ✅ (hook rodou nos 5 commits) |

## Self-Check: PASSED

- `supabase/tests/p46_medicoes_pre_fixture.sql` — FOUND
- `supabase/tests/p46_teardown_fixture.sql` — FOUND
- `supabase/tests/p46_fixture_elegivel.sql` — FOUND
- `.planning/phases/46-purga-autom-tica-dry-run-live/46-01-MEDICOES.md` — FOUND
- `.planning/phases/46-purga-autom-tica-dry-run-live/46-01-SUMMARY.md` — FOUND

Commits `7152c55`, `a9c946d`, `4ba340b`, `8d1083f` — todos FOUND em `git log`.
