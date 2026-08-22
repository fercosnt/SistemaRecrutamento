---
phase: 46
plan: 01
tipo: medicoes
script: supabase/tests/p46_medicoes_pre_fixture.sql
executor_do_script: orquestrador (MCP execute_sql — subagentes GSD nao recebem os tools MCP do Supabase, bug upstream anthropics/claude-code#13898)
criado: 2026-08-22
estado: medido (2026-08-22) — sete secoes preenchidas por execucao; M2b ficou por medir e esta nomeada como lacuna
---

# Phase 46 / plano 46-01 — Medicoes pre-fixture

Sete medicoes que a fixture de conjunto elegivel **nao podia presumir**. Uma unica chamada MCP
`execute_sql` com o conteudo de `supabase/tests/p46_medicoes_pre_fixture.sql` devolveu as sete de
uma vez, como um objeto `jsonb`; cada secao abaixo carrega a chave correspondente daquele objeto.

## ⚠ Como ler este artefato — a distincao que ele existe para nao borrar

Cada secao tem **duas linhas de natureza diferente**, e confundi-las e o defeito que este arquivo
foi feito para impedir:

- **`Valor medido:`** — lido por EXECUCAO contra o catalogo/banco vivo.
- **`Expectativa estrutural:`** — o que os arquivos DESTE repositorio dizem, com `arquivo:linha`.
  Nao e medicao e nao substitui nenhuma. Serve para uma coisa so: quando a medicao chega, uma
  divergencia entre as duas linhas fica **visivel e escrita**, em vez de passar despercebida.
  **M1 produziu exatamente essa divergencia** — ver §M1.

A razao dura de nunca preencher `Valor medido` com a expectativa: `20260805000006:1814` registra,
dentro de uma migration aplicada em PROD, que o arquivo de baseline
`docs/sql/sql/02-tabela-candidatos.sql` **diverge do catalogo vivo** em pelo menos `cpf`. Ler o
repositorio e chamar aquilo de medicao ja produziu erro neste projeto (Pitfall 9 da 46-RESEARCH).

**Data da medicao:** 2026-08-22
**`now()` do servidor (pre-fixture):** `2026-08-22T18:45:33.184073-03:00`
**`now()` do servidor (pos-fixture):** `2026-08-22T19:01:09.64826-03:00`

---

## M1 — Gatilhos das tabelas que a fixture toca

> Chaves: `M1a_gatilhos_das_tabelas_da_fixture` · `M1b_gatilho_updated_at_em_candidaturas` ·
> `M1c_segredos_de_vault_presentes`

**trigger de updated_at: PRESENTE.**

```json
[{"tgname":"update_candidaturas_updated_at","proname":"update_updated_at_column","tgenabled":"O"}]
```

**⚠ A armadilha de D-46-21 estava ARMADA.** O degrau (3) do `COALESCE` da data-ancora
(`20260801000004:192-200`) le `candidaturas.updated_at`, e este gatilho `BEFORE UPDATE` carimba
`NEW.updated_at = NOW()` incondicionalmente. Um retrodate feito **so** por `UPDATE` — que e o que o
plano 46-01 prescrevia — teria sido sobrescrito, a soma nunca ficaria menor que `now()`, o
predicado devolveria ZERO e a fixture teria se autoderrotado **sem erro nenhum**. A defesa de
retrodatar `updated_at` no proprio `INSERT` (o gatilho e `BEFORE UPDATE` e nao dispara em `INSERT`)
nao era zelo: era necessaria.

**Valor medido (M1a — gatilhos de `public.candidaturas`, 6, todos `tgenabled='O'`):**

| `tgname` | `proname` | `dispara_http` |
|---|---|---|
| `candidaturas_avancar_etapa_trg` | `avancar_etapa` | false |
| `trg_candidatura_encerrada_a_pedido` | `trg_notif_candidatura_encerrada` | **true** |
| `trg_candidaturas_analise` | `trg_candidatura_analise` | **true** |
| `trg_candidaturas_guard_rejeicao` | `guard_rejeicao_auditada` | false |
| `trg_notif_confirmacao` | `trg_notif_confirmacao` | **true** |
| `update_candidaturas_updated_at` | `update_updated_at_column` | false |

**⚠⚠ DIVERGENCIA MEDIDA — a expectativa estrutural estava ERRADA, e por isso ela existe.**

O cabecalho de `p46_fixture_elegivel.sql` nomeava **dois** gatilhos de `net.http_post`
(`trg_candidaturas_analise` e `trg_n8n_nova_candidatura`, lidos de
`20260706110005_sec03_n8n_serverside.sql:90-93`). O catalogo vivo tem **TRES**, e
`trg_n8n_nova_candidatura` **nao esta entre eles** — ele nao existe mais no objeto vivo. Os tres
reais sao `trg_candidaturas_analise`, `trg_notif_confirmacao` e
`trg_candidatura_encerrada_a_pedido`.

**O que isso significa na pratica:** uma lista fixa de nomes, copiada do repositorio, teria deixado
`trg_notif_confirmacao` **ATIVO** durante os nove `INSERT`s. Com `NOTIFICACOES_MODO=producao`, isso
teria escrito nove linhas em `public.notificacoes_enviadas` e disparado o envio — precisamente a
ameaca T-46-01-03, que o plano marcou como `mitigate` e cuja unica defesa prevista era o dominio
`@invalido.local` nao ser roteavel. O criterio DINAMICO da secao 3 da fixture
(`pg_get_functiondef(p.oid) LIKE '%net.http_post%'`) pegou os tres. Foi essa escolha — criterio em
vez de lista — que impediu o efeito colateral, e o comentario do arquivo foi corrigido para nomear
os tres medidos.

**Valor medido (M1c — presenca dos segredos de Vault, apenas booleanos):**

| Segredo | Presente |
|---|---|
| `project_url` | **true** |
| `edge_invoke_key` | **true** |
| `n8n_webhook_base` | **AUSENTE** (a chave nao foi retornada) |

`n8n_webhook_base` ausente e consistente com `trg_n8n_nova_candidatura` nao existir mais: o caminho
n8n foi desmontado dos dois lados. Os outros dois presentes confirmam que
`trg_candidaturas_analise` **teria despachado de verdade** se ficasse ativo — o graceful-skip por
segredo nulo nao teria salvado ninguem.

---

## M2 — O que o INSERT da fixture e obrigado a preencher

> Chaves: `M2a_notnull_sem_default` · `M2b_checks_e_uniques` · `M2c_fks_de_decisao_final`

**Valor medido (M2a — NOT NULL sem default):**

| Tabela | Colunas |
|---|---|
| `auth.users` | `id` (uuid) |
| `public.candidatos` | `nome_completo`, `email`, `celular`, `cidade` (varchar), `data_nascimento` (date), `estado` (character) |
| `public.candidaturas` | `candidato_id`, `vaga_id` (uuid) |
| `public.decisao_final` | `candidatura_id` (uuid), `decisao` (USER-DEFINED), `justificativa` (text), `por_usuario` (uuid) |
| `public.historico_candidatura` | `candidatura_id` (uuid), `etapa_para` (USER-DEFINED) |
| `public.vagas` | `slug`, `titulo` (text) |

⚠ `auth.users` exige **apenas `id`**: todo o resto tem default ou e nulavel. A lista larga de
colunas que a fixture monta e intersectada com o catalogo e portanto continua correta, mas a
verificacao de "coluna NOT NULL sem default nao preenchida" nunca teve como disparar aqui. Isso e
bom saber: a protecao existe para um upgrade futuro de GoTrue, nao para o estado atual.

**Valor medido (M2b — CHECKs e UNIQUEs): `⟨NAO MEDIDO⟩`**

⚠ **Lacuna nomeada.** Esta consulta nao foi executada como leitura separada. A fixture aplicou sem
violar nenhum `CHECK` nem `UNIQUE` — o que e **evidencia fraca e nao substitui a medicao**: prova
apenas que os oito valores que ela gerou passaram, nao qual e o conjunto de restricoes vivo. Em
particular, continua **por medir** se `check_cpf_format` ainda existe e em que forma
(`20260608000001:81` deixa a remocao dela como opcao comentada). Se um plano futuro precisar gerar
CPF ou celular sintetico com outro formato, medir antes.

**Valor medido (M2c — FKs de `decisao_final`):**

| Constraint | Referencia |
|---|---|
| `decisao_final_candidatura_id_fkey` | `public.candidaturas(id)` |
| `decisao_final_por_usuario_fkey` | **`auth.users(id)`** |
| `decisao_final_revisao_por_usuario_fkey` | `auth.users(id) ON DELETE SET NULL` |

**⚠ Consequencia direta, e ela e boa:** `por_usuario` referencia `auth.users`, nao
`public.usuarios_rh`. O ramo `LIKE '%users%'` da secao 2 da fixture disparou, e a decisao sintetica
do Art. 20 foi assinada pelo **proprio titular sintetico** (`4601a000-0000-4000-8000-000000000007`).
**Nenhum ID de recrutador real foi usado.** A ressalva registrada no SUMMARY — de que uma linha de
`usuarios_rh` poderia acabar atribuida a uma decisao falsa — **nao se concretizou**, e a resolucao
em tempo de execucao pelo catalogo foi o que evitou.

---

## M3 — Identidade do papel corrente, sem claims

> Chave: `M3_identidade_da_sessao`

| Expressao | Valor medido |
|---|---|
| `auth.uid()` | **null** |
| `auth.jwt() #>> '{app_metadata,role}'` | **null** |
| `current_setting('request.jwt.claims', true)` | **null** |
| `current_user` | `postgres` |
| `session_user` | `postgres` |

**`[ASSUMED A3]` FECHADO POR EXECUCAO.** As tres metades do guard de
`public.anonimizar_candidato` (`20260805000006:340-449`) recusam um chamador sem sessao, sem papel e
sem intencao — e um cron nao tem nenhuma das tres. **D-46-18 (Saida B — o quarto ramo autorizado)
segue de pe sobre medicao, nao sobre suposicao.** O plano 46-04 pode escrever o ramo novo sem
reabrir esta pergunta.

---

## M4 — Catalogo das funcoes que a Phase 46 consome (A6)

> Chave: `M4_catalogo_das_funcoes`

**Valor medido:** as **seis** funcoes sao `prosecdef = true` e
`proconfig = ["search_path=\"\""]`.

| Funcao | Assinatura | `prosecdef` | `provolatile` |
|---|---|---|---|
| `anonimizar_candidato` | `(p_candidato_id uuid, p_dry_run boolean)` | true | **`v`** |
| `plano_exclusao_titular` | `(p_candidato_id uuid)` | true | `s` |
| `candidaturas_alem_da_janela` | `()` | true | `s` |
| `previa_retencao` | `()` | true | `s` |
| `previa_retencao_total` | `()` | true | `s` |
| `listar_matriz_retencao` | `()` | true | `s` |

⚠ **Pitfall 10 CONFIRMADO:** o catalogo grava `search_path=""` **com as aspas**, e nao
`search_path=`. Toda asserção de smoke desta fase compara contra esta forma medida.

**M4b — pins de `md5(prosrc)` medidos no objeto VIVO:**

| Funcao | `md5(prosrc)` vivo | Pin no smoke | Bate? |
|---|---|---|---|
| `anonimizar_candidato` | `8c86e0f040219e7eade47eb587dbf5de` | `p45_motor_exclusao_smoke.sql:1591` | **sim** |
| `candidaturas_alem_da_janela` | `ddfa6542921d241323c0124fc1bd1f99` | `p43_previa_smoke.sql` (e) | **sim** |

**Os dois pins estao validos HOJE — e esta fase invalida os dois.** O plano 46-03 edita
`candidaturas_alem_da_janela` (tres excecoes novas + allowlist) e o 46-04 edita
`anonimizar_candidato` (o quarto ramo do guard). Os re-pins de D-46-18 obrigacao 4 sao **obrigacao
real, com data marcada**, e cada um tem de ser feito com conferencia CRUZADA (objeto vivo × corpo
extraido do arquivo commitado), na disciplina de `p45_motor_exclusao_smoke.sql:217-265`.
⚠ Um re-pin **nunca** afrouxa a asserção (Pitfall 2). Estes dois valores sao o lado "antes" do
registro.

---

## M5 — A matriz de retencao, linha a linha (D-46-22)

> Chaves: `M5a_matriz_de_retencao` · `M5b_linhas_em_seed` · `M5c_ja_tem_coluna_elegivel_purga`

| Etapa | `janela_meses` | `origem` | `alterado_por` |
|---|---|---|---|
| `aprovado` | 24 | `seed` | — |
| `avaliacao_assincrona` | 24 | `seed` | — |
| `decisao_final` | 24 | `seed` | — |
| `entrevista_online` | 24 | `seed` | — |
| `entrevista_presencial` | 24 | `seed` | — |
| `inscricao` | 24 | `seed` | — |
| `rejeitado` | **18** | **`admin`** | preenchido |
| `triagem` | 24 | `seed` | — |

**Quantas linhas ainda estao em `seed` (M5b): 7 de 8.**
**A coluna `elegivel_purga` ja existe (M5c): false** — ela nasce no plano 46-02, como previsto.

**Pre-condicao do flip, medida (D-46-22):** o `COMMENT` de
`config_retencao_etapa.janela_meses` (`20260801000002:174-177`) declara **dentro do banco** que a
Phase 46 nao pode ligar a purga enquanto houver linha em `origem='seed'` sem confirmacao por
estado. Das tres linhas da allowlist de D-46-19, **duas seguem em `seed`** (`aprovado` e
`decisao_final`); so `rejeitado` foi escolhida por um humano. **Confirmar essas duas e pre-condicao
do flip `dry_run -> live`**, somada as de D-46-14. O plano 46-07 herda esta linha como item de
checkpoint, nao como detalhe.

⚠ **Divergencia deliberada em relacao ao plano 46-01**, registrada porque a alternativa era
silencio: o plano pedia `SELECT * FROM public.listar_matriz_retencao()`. Aquela RPC tem guard de
papel NULL-safe (`20260801000002:288-291`) e **recusa com `42501`** todo chamador cujo
`auth.jwt() #>> '{app_metadata,role}'` nao seja `'administrador'` — que e exatamente o chamador
desta medicao, como M3 acabou de registrar por execucao (`jwt_app_metadata_role: null`). Chama-la
teria abortado **as sete medicoes de uma vez**. M5 leu a tabela-base; M4 registrou o catalogo da
RPC recusante. O unico campo que a RPC acrescenta e o NOME do alterador, que e admin-only por
SEG-02 e nao pertence a um artefato de planning versionado.

---

## M6 — O instantaneo de `cron.job` (D-46-23)

> Chaves: `M6a_total_de_jobs` · `M6b_jobs`

**Valor medido (M6a — total): 3.**

| `jobname` | `schedule` | `active` |
|---|---|---|
| `ai-cost-aggregation` | `30 1 * * *` | true |
| `ai-logs-retention-cleanup` | `0 2 * * *` | true |
| `notif-retry-sweep` | `*/15 * * * *` | true |

A asserção (a) de `supabase/tests/p42_invent05_cron_smoke.sql:98` fixa esta contagem **em 3**, e a
mensagem de falha dela acusa *"Um a mais = guard de remocao condicional falhou e o alvo ficou
duplicado"*. No dia em que `purga-retencao-sweep` (`0 3 * * *`, D-46-10) nascer, esse portao verde
reprovaria trabalho correto **com diagnostico falso**. D-46-23 manda emendar aquele smoke **no
mesmo commit** que cria o 4º job; este e o valor de base que a emenda transforma em invariante.

⚠ Note que `0 3 * * *` nao colide com nenhum dos tres horarios vivos (`30 1`, `0 2`, `*/15`).

---

## M7 — A linha de base de zero que a fixture tem de mover

> Chave: `M7_linha_de_base`

| Medicao | Valor |
|---|---|
| `now()` do servidor | `2026-08-22T18:45:33.184073-03:00` |
| `statement_timeout` | **2min** |
| `current_user` | `postgres` |
| `count(*)` de `candidaturas` vivas (`deleted_at IS NULL`) | **11** |
| `min(data_candidatura)` das vivas | `⟨NAO MEDIDO⟩` |
| **`count(*) FROM public.candidaturas_alem_da_janela()`** | **0** |
| `count(*)` de `auth.users` | **29** |
| `count(*)` de `notificacoes_enviadas` | **11** |
| `count(*)` de `auth.users` no namespace da fixture | **0** |
| `public.retencao_hold` ja existe | **false** |

⊖ **Nao-vacuidade.** `alem_da_janela = 0` confirma por execucao, no instante do apply, o que a
46-VALIDATION media em 2026-08-22: o conjunto elegivel era vazio — nao por defeito, por
**aritmetica**. Este e o numero contra o qual §Pos-fixture prova que a fixture funcionou.

`statement_timeout = 2min` e folgado para tudo desta fase, mas e o valor que o Pitfall 8 manda ter
escrito: quando o sweep do 46-06 for cortado, a mensagem tem de acusar o lugar certo.

---

## Pós-fixture

**`now()` do servidor:** `2026-08-22T19:01:09.64826-03:00` · **Aplicado em:** 2026-08-22

### O que a Task 3 provou

| Medicao | Antes | Depois | Delta |
|---|---|---|---|
| **`count(*) FROM candidaturas_alem_da_janela()`** | **0** | **7** | **+7** (criterio era `>= 3`) |
| `count(*)` de `auth.users` | 29 | 37 | +8 (os 8 titulares sinteticos) |
| `count(*)` de `candidaturas` vivas | 11 | 20 | +9 (as 9 candidaturas da fixture) |
| vagas da fixture (`titulo LIKE 'fixture-p46%'`) | 0 | 3 | +3 |
| candidatos da fixture | 0 | 8 | +8 |

### Por candidatura — e o achado do plano

| `slug#sufixo` | Elegivel | O que isso prova |
|---|---|---|
| `pos1#01` | ✓ | o degrau **(1)** da data-ancora funciona — `updated_at` dela esta a -1 mes, entao so o `historico_candidatura` podia te-la tornado elegivel |
| `pos2#02` | ✓ | o degrau **(2)** funciona — mesma logica, via `data_decisao_final` |
| `pos3#03` | ✓ | o degrau **(3)** funciona **e o retrodate de `updated_at` sobreviveu ao gatilho de M1b** |
| `cap2#04` | ✓ | ha 2+ elegiveis, entao a prova do cap (D-46-08) pode ser feita reduzindo o cap por RPC |
| `neg-hold#05` | ✓ | correto AGORA, **errado depois do 46-03** |
| `neg-vaga#06` | ✓ | correto AGORA, **errado depois do 46-03** |
| `neg-etapa#08` | ✓ | correto AGORA, **errado depois do 46-02** |
| **`neg-art20#07`** | **✗** | **a excecao de revisao do Art. 20 — escrita na Phase 43 e NUNCA ANTES EXERCITADA — funciona** |
| **`neg-etapa#09`** | **✗** | esta dentro da janela: o caso de D-46-11 em que o agrupamento por titular MORDE |

**O achado:** `neg-art20#07` ser **falso** e a primeira prova por execucao de que a excecao do
Art. 20 do predicado da Phase 43 morde. Ate agora ela era codigo nao-exercitado sobre um conjunto
vazio — a mesma classe do P39/CR-02, uma guarda que era dead code.

### O numero esperado por plano — e o que significa se ele nao cair

| Momento | `candidaturas_alem_da_janela()` | Quem sai |
|---|---|---|
| **agora** (46-01 aplicado) | **7** | — |
| apos 46-02 (`elegivel_purga`, allowlist de D-46-19) | **6** | `neg-etapa#08` |
| apos 46-03 (`retencao_hold` + vaga aberta) | **4** | `neg-hold#05`, `neg-vaga#06` |

⚠ **Um numero que nao cair e a excecao daquele plano falhando em silencio.** Esta tabela e o
contrato de nao-vacuidade dos proximos dois planos: cada um tem de derrubar exatamente as linhas
nomeadas, e provar a queda com a mesma consulta.
⚠ `neg-hold#05` so vira `✗` se o **46-03 inserir a linha de hold** para a candidatura
`4601c000-0000-4000-8000-000000000005` — a tabela nao existia no apply da fixture e o bloco guardado
por `to_regclass` emitiu `RAISE NOTICE` em vez de inserir. Sem essa linha, a asserção (j.1) do
smoke passaria por vacuidade.

### Contaminacao — as quatro negativas, medidas

| # | Asserção | Medido | Veredito |
|---|---|---|---|
| C1 | gatilhos deixados desligados nas 5 tabelas | **0** — todos religados | ✅ |
| C2 | `public.notificacoes_enviadas` | **11 → 11**, nao subiu | ✅ |
| C2b | respostas em `net._http_response` desde `18:45:33` | **0** | ✅ |
| C3 | as 3 vagas da fixture com `created_by IS NULL` | **true** | ✅ |
| C5 | candidaturas de pessoas reais · `auth.users` reais | **11 → 11** · **29 → 29** | ✅ |

**C2b e a asserção mais forte das cinco**: zero resposta HTTP desde o instante da medicao pre-fixture
significa que **nenhuma analise de IA, nenhuma notificacao e nenhum webhook saiu** durante os nove
`INSERT`s. E a prova de que o desligamento dinamico dos tres gatilhos de `net.http_post` funcionou —
inclusive do `trg_notif_confirmacao` que a lista estatica teria deixado passar (§M1).

**C5 fecha T-46-01-01:** zero linha de pessoa real foi alterada. As 11 candidaturas e os 29 usuarios
que existiam antes continuam exatamente 11 e 29; tudo o que cresceu foi o namespace sintetico.

### ⚠ Lacuna nomeada — a asserção C4 nao foi feita diretamente

A consulta `C4` prevista no plano apontava para `public.analises_candidato`, que **nao existe**. A
tabela real e **`public.analise_candidato_vaga`**. A forma correta, para quem repetir esta medicao:

```sql
SELECT count(*)
  FROM public.analise_candidato_vaga a
 WHERE EXISTS (
         SELECT 1
           FROM public.candidaturas c
           JOIN public.candidatos  ca ON ca.id = c.candidato_id
           JOIN auth.users         u  ON u.id  = ca.user_id
          WHERE c.id = a.candidatura_id
            AND u.email LIKE 'fixture-p46+%@invalido.local'
       );
-- esperado: 0
```

A asserção sobre as tabelas de IA ficou coberta **indiretamente** por C2b (zero HTTP ⇒ nenhuma
analise foi disparada ⇒ nenhuma linha de analise pode ter nascido), e nao diretamente. Isso e uma
**lacuna a nomear, nao a esconder**: a inferencia e solida mas e uma inferencia, e um smoke desta
fase que quiser assertir sobre contaminacao de IA precisa da consulta acima, com o nome de tabela
corrigido.
