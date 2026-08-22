---
phase: 46
plan: 01
tipo: medicoes
script: supabase/tests/p46_medicoes_pre_fixture.sql
executor_do_script: orquestrador (MCP execute_sql — subagentes GSD nao recebem os tools MCP do Supabase, bug upstream anthropics/claude-code#13898)
criado: 2026-08-22
estado: aguardando execucao do script (Task 3, passo 1)
---

# Phase 46 / plano 46-01 — Medicoes pre-fixture

Sete medicoes que a fixture de conjunto elegivel **nao pode presumir**. Uma unica chamada MCP
`execute_sql` com o conteudo de `supabase/tests/p46_medicoes_pre_fixture.sql` devolve as sete de
uma vez, como um objeto `jsonb`; cada secao abaixo recebe a chave correspondente daquele objeto.

## ⚠ Como ler este artefato — a distincao que ele existe para nao borrar

Cada secao tem **duas linhas de natureza diferente**, e confundi-las e o defeito que este arquivo
foi feito para impedir:

- **`Valor medido:`** — lido por EXECUCAO contra o catalogo/banco vivo. Enquanto estiver
  `⟨NAO MEDIDO⟩`, **nao existe valor**: nada abaixo dele pode ser citado como evidencia, e nenhuma
  decisao da Phase 46 pode se apoiar nele.
- **`Expectativa estrutural:`** — o que os arquivos DESTE repositorio dizem, com `arquivo:linha`.
  Nao e medicao e nao substitui nenhuma. Serve para uma coisa so: quando a medicao chegar, uma
  divergencia entre as duas linhas fica **visivel e escrita**, em vez de passar despercebida.

A razao dura de nao preencher `Valor medido` com a expectativa: `20260805000006:1814` registra,
dentro de uma migration aplicada em PROD, que o arquivo de baseline
`docs/sql/sql/02-tabela-candidatos.sql` **diverge do catalogo vivo** em pelo menos `cpf`. Ler o
repositorio e chamar aquilo de medicao ja produziu erro neste projeto (Pitfall 9 da 46-RESEARCH).

**Data da medicao:** `⟨NAO MEDIDO⟩` · **`now()` do servidor:** `⟨NAO MEDIDO⟩`

---

## M1 — Gatilhos das tabelas que a fixture toca

> Chaves: `M1a_gatilhos_das_tabelas_da_fixture` · `M1b_gatilho_updated_at_em_candidaturas` ·
> `M1c_segredos_de_vault_presentes`

**⚠⚠ Esta e a medicao que decide se a fixture rende alguma coisa ou ZERO.**

`candidaturas.updated_at` e o degrau (3) do `COALESCE` da data-ancora
(`supabase/migrations/20260801000004_p43_previa_retencao.sql:192-200`) e nasce `now()`. Se houver
gatilho `BEFORE UPDATE` que carimbe `updated_at`, todo retrodate feito por `UPDATE` e sobrescrito,
a soma nunca fica menor que `now()`, o predicado devolve zero e a fixture **se autoderrota sem
erro nenhum** (D-46-21).

**trigger de updated_at:** `⟨NAO MEDIDO⟩` — preencher com **`presente`** (e o `tgname` de cada um)
ou **`ausente`**.

**Valor medido (M1a — todos os gatilhos, com `dispara_http` e `menciona_updated_at`):**
`⟨NAO MEDIDO⟩`

**Valor medido (M1b — os gatilhos de UPDATE que mencionam `updated_at`):** `⟨NAO MEDIDO⟩`

**Valor medido (M1c — presenca dos segredos de Vault, apenas booleanos):** `⟨NAO MEDIDO⟩`

**Expectativa estrutural (repositorio, nao catalogo):**

| Gatilho | Tabela | Quando | O que faz | Fonte |
|---|---|---|---|---|
| `update_candidaturas_updated_at` | `candidaturas` | BEFORE UPDATE FOR EACH ROW | `NEW.updated_at = NOW()` | `docs/sql/sql/13-tabela-candidaturas.sql:145-148` + `docs/sql/sql/01-setup-inicial.sql:24-33` |
| `update_candidatos_updated_at` | `candidatos` | BEFORE UPDATE FOR EACH ROW | `NEW.updated_at = NOW()` | `docs/sql/sql/02-tabela-candidatos.sql:129-132` |
| `trg_candidaturas_analise` | `candidaturas` | AFTER INSERT | `net.http_post` -> EF `analise-candidato-individual` | `supabase/migrations/20260610000002_analise_trigger.sql:51-70` |
| `trg_n8n_nova_candidatura` | `candidaturas` | AFTER INSERT | `net.http_post` -> n8n `/nova-candidatura` | `supabase/migrations/20260706110005_sec03_n8n_serverside.sql:68-93` |
| `trg_n8n_status_candidatura` | `candidaturas` | AFTER UPDATE OF `status` | `net.http_post` -> n8n `/status-candidatura` | `20260706110005:126-149` |
| `trg_candidaturas_guard_rejeicao` | `candidaturas` | BEFORE UPDATE OF `status` | recusa rejeicao sem trilha | `20260709000010:86-91` |
| `candidaturas_avancar_etapa_trg` | `candidaturas` | BEFORE UPDATE OF `etapa_atual` | audita transicao | `20260624000004:103` |
| `trg_n8n_revisao_decisao` | `decisao_final` | AFTER UPDATE OF `revisao_solicitada_em` | `net.http_post` -> n8n `/revisao-decisao` | `20260706110005:203-207` |
| `trg_decisao_final_snapshot` | `decisao_final` | AFTER UPDATE | grava em `decisao_final_historico` | `20260709000011:113-117` |
| `vagas_status_soft_delete_sync_trg` | `vagas` | BEFORE INSERT OR UPDATE | coage `status` quando `deleted_at` nao e nulo | `20260606000001:84-88` |

**Consequencia ja embutida na fixture, qualquer que seja a medicao:** os dois gatilhos de AFTER
INSERT em `candidaturas` disparam para fora. Nove linhas sinteticas produziriam nove analises de IA
reais — custo, escrita nas tabelas de IA e contaminacao do snapshot de vies (ameacas T-46-01-02 e
T-46-01-03 do registro STRIDE deste plano). `p46_fixture_elegivel.sql` desliga **por medicao do
catalogo** (`dispara_http`) exatamente os gatilhos que fazem `net.http_post`, religa todos ao fim,
e **ABORTA se nao conseguir desliga-los** — falha fechada, nunca despacho silencioso.

---

## M2 — O que o INSERT da fixture e obrigado a preencher

> Chaves: `M2a_notnull_sem_default` · `M2b_checks_e_uniques` · `M2c_fks_de_decisao_final`

**Valor medido (M2a — NOT NULL sem default em `auth.users` e nas 5 tabelas de dominio):**
`⟨NAO MEDIDO⟩`

**Valor medido (M2b — CHECKs e UNIQUEs):** `⟨NAO MEDIDO⟩`

**Valor medido (M2c — FKs de `decisao_final`, para saber o que `por_usuario` exige):**
`⟨NAO MEDIDO⟩`

**Expectativa estrutural (repositorio, e sabidamente DIVERGENTE do vivo em pelo menos `cpf`):**

| Tabela | NOT NULL sem default (baseline) | CHECKs de formato (baseline) |
|---|---|---|
| `candidatos` | `user_id`, `nome_completo`, `email`, `celular`, `data_nascimento`, `cidade`, `estado` | `candidatos_email_check`, `candidatos_cpf_check` (`^\d{3}\.\d{3}\.\d{3}-\d{2}$`), `candidatos_celular_check` (`^\(\d{2}\) \d{5}-\d{4}$`), `candidatos_estado_check` (UF), `candidatos_data_nascimento_check` |
| `candidaturas` | `candidato_id`, `vaga_id` | `unique_candidato_vaga UNIQUE (candidato_id, vaga_id)`, `score_range_check` |
| `vagas` | `slug`, `titulo` | `slug_format_check` (`^[a-z0-9-]+$`), `estado_brasil_check`, `salario_exibicao_check`, `datas_vaga_check` |
| `decisao_final` | `candidatura_id`, `decisao`, `justificativa`, `por_usuario` | UNIQUE em `candidatura_id` |
| `historico_candidatura` | `candidatura_id`, `etapa_para` | — |

⚠ `candidatos.cpf` foi tornado NULAVEL por `20260608000001:75`, e `20260805000006:1253` assere que
`cpf` **vai a NULL** na anonimizacao. Por isso a fixture preenche `cpf` com valor valido em vez de
deixa-lo nulo: uma fixture que ja nasce com `cpf IS NULL` faria a prova de anonimizacao de
`modo='live'` passar **por vacuidade** — exatamente o defeito que esta fase inteira existe para nao
repetir.

`decisao_final.por_usuario` e resolvido **em tempo de execucao** pela fixture, a partir de M2c: se
houver FK para `public.usuarios_rh`, ela usa uma linha viva de `usuarios_rh`; se nao houver, usa o
proprio `auth.users.id` sintetico. Nenhum dos dois e adivinhado.

---

## M3 — Identidade do papel corrente, sem claims

> Chave: `M3_identidade_da_sessao`

**Valor medido:** `⟨NAO MEDIDO⟩`

| Expressao | Valor medido |
|---|---|
| `auth.uid()` | `⟨NAO MEDIDO⟩` |
| `auth.jwt() #>> '{app_metadata,role}'` | `⟨NAO MEDIDO⟩` |
| `current_setting('request.jwt.claims', true)` | `⟨NAO MEDIDO⟩` |
| `current_user` | `⟨NAO MEDIDO⟩` |
| `session_user` | `⟨NAO MEDIDO⟩` |

Re-afere por execucao o `[ASSUMED A3]` da 46-RESEARCH, que fundamenta a **Saida B** de D-46-18: um
cron nao tem sessao, nao tem papel e nao tem intencao, e por isso as tres metades do guard de
`public.anonimizar_candidato` (`20260805000006:340-449`) recusam com `42501`.

**Se qualquer um dos tres primeiros vier NAO-NULO, D-46-18 muda de fundamento** e o plano 46-04
precisa ser relido antes de escrever o quarto ramo. Registrar aqui, nao em prosa de commit.

---

## M4 — Catalogo das funcoes que a Phase 46 consome (A6)

> Chave: `M4_catalogo_das_funcoes`

**Valor medido:** `⟨NAO MEDIDO⟩` — uma linha por funcao, com `prosecdef`, `provolatile`,
`proconfig` e `proacl`.

| Funcao | `prosecdef` | `proconfig` | `proacl` |
|---|---|---|---|
| `plano_exclusao_titular` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `anonimizar_candidato` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `candidaturas_alem_da_janela` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `previa_retencao` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `previa_retencao_total` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `listar_matriz_retencao` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |

**Nenhuma das seis e invocada** pelo script — ele apenas le `pg_proc`. Duas sao caminhos do motor
destrutivo; a sexta recusaria a sessao inteira (ver M5).

⚠ Pitfall 10 da 46-RESEARCH: o catalogo grava `proconfig` como `search_path=""`, nao
`search_path=`. Qualquer asserção de smoke desta fase compara contra a forma **medida** aqui.

---

## M5 — A matriz de retencao, linha a linha (D-46-22)

> Chaves: `M5a_matriz_de_retencao` · `M5b_linhas_em_seed` · `M5c_ja_tem_coluna_elegivel_purga`

**Valor medido (M5a — as 8 etapas):** `⟨NAO MEDIDO⟩`

| Etapa | `janela_meses` | `origem` | `alterado_por` |
|---|---|---|---|
| `aprovado` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `avaliacao_assincrona` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `decisao_final` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `entrevista_online` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `entrevista_presencial` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `inscricao` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `rejeitado` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |
| `triagem` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |

**Quantas linhas ainda estao em `seed` (M5b):** `⟨NAO MEDIDO⟩`

**A coluna `elegivel_purga` ja existe (M5c):** `⟨NAO MEDIDO⟩` — ela nasce no plano 46-02; `false`
aqui e o estado esperado antes dele.

**Por que esta medicao e pre-condicao de flip, e nao curiosidade:** o `COMMENT` de
`config_retencao_etapa.janela_meses` (`20260801000002:174-177`) declara **dentro do banco** que a
Phase 46 nao pode ligar a purga enquanto houver linha em `origem='seed'` sem confirmacao por
estado. D-46-22 transforma isso em condicao do flip `dry_run -> live`, somada as de D-46-14: as
**3 linhas da allowlist** (`aprovado`, `rejeitado`, `decisao_final`) precisam sair de `seed`.

⚠ **Divergencia deliberada em relacao ao plano 46-01**, registrada aqui porque a alternativa era
silencio: o plano pedia `SELECT * FROM public.listar_matriz_retencao()`. Aquela RPC tem guard de
papel NULL-safe (`20260801000002:288-291`) e **recusa com `42501`** todo chamador cujo
`auth.jwt() #>> '{app_metadata,role}'` nao seja `'administrador'` — que e exatamente o chamador
desta medicao, como M3 registra por execucao. Chama-la abortaria **as sete medicoes de uma vez**.
M5 le a tabela-base; M4 registra o catalogo da RPC recusante. Nenhuma informacao se perdeu: o unico
campo que a RPC acrescenta e o NOME do alterador, que e admin-only por SEG-02 e nao pertence a um
artefato de planning versionado.

---

## M6 — O instantaneo de `cron.job` (D-46-23)

> Chaves: `M6a_total_de_jobs` · `M6b_jobs`

**Valor medido (M6a — total):** `⟨NAO MEDIDO⟩`

**Valor medido (M6b — os jobs):** `⟨NAO MEDIDO⟩`

| `jobname` | `schedule` | `active` |
|---|---|---|
| `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` | `⟨NAO MEDIDO⟩` |

A asserção (a) de `supabase/tests/p42_invent05_cron_smoke.sql:98` fixa esta contagem **em 3 hoje**,
e a mensagem de falha dela acusa *"Um a mais = guard de remocao condicional falhou e o alvo ficou
duplicado"*. No dia em que `purga-retencao-sweep` nascer, esse portao verde reprovaria trabalho
correto **com diagnostico falso**. D-46-23 manda emendar aquele smoke no MESMO commit que cria o 4º
job; este e o valor de base que a emenda transforma em invariante.

---

## M7 — A linha de base de zero que a fixture tem de mover

> Chave: `M7_linha_de_base`

**Valor medido:** `⟨NAO MEDIDO⟩`

| Medicao | Valor |
|---|---|
| `now()` do servidor | `⟨NAO MEDIDO⟩` |
| `statement_timeout` | `⟨NAO MEDIDO⟩` |
| `current_user` | `⟨NAO MEDIDO⟩` |
| `count(*)` de `candidaturas` vivas (`deleted_at IS NULL`) | `⟨NAO MEDIDO⟩` |
| `min(data_candidatura)` das vivas | `⟨NAO MEDIDO⟩` |
| **`count(*) FROM public.candidaturas_alem_da_janela()`** | `⟨NAO MEDIDO⟩` |
| `count(*)` de `auth.users` | `⟨NAO MEDIDO⟩` |
| `count(*)` de `notificacoes_enviadas` | `⟨NAO MEDIDO⟩` |
| `count(*)` de `auth.users` no namespace da fixture | `⟨NAO MEDIDO⟩` |
| `public.retencao_hold` ja existe | `⟨NAO MEDIDO⟩` |

⊖ **Nao-vacuidade.** `alem_da_janela` e o numero contra o qual a Task 3 prova que a fixture
funcionou. Medido em 2026-08-22 ele era **0** — nao por defeito, por **aritmetica**: a candidatura
mais antiga tem ~9,5 meses e a matriz esta em 24. O criterio de aceite da Task 3 e `>= 3`, nunca
`>= 0`.

`candidaturas_vivas` e o valor que a Task 3 compara com `+ 9` para provar que **zero linha de
pessoa real foi alterada** (T-46-01-01).

`ja_existe_fixture` protege contra aplicar a fixture duas vezes: se vier diferente de `0`, rodar
`supabase/tests/p46_teardown_fixture.sql` **antes** de qualquer outra coisa.
