---
phase: 46-purga-autom-tica-dry-run-live
plan: 03
subsystem: database
tags: [postgres, sql, lgpd, retencao, purga, predicado, allowlist, supabase, prod-write-pendente]
status: checkpoint

requires:
  - phase: 43-previa-retencao
    provides: "public.candidaturas_alem_da_janela() — a UNICA definicao do predicado — e a excecao de revisao do Art. 20"
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 01
    provides: "as fixtures negativas neg-hold / neg-vaga / neg-art20 / neg-etapa, TODAS alem da janela, e a obrigacao herdada de inserir a linha de retencao_hold"
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 02
    provides: "o predicado de 6 colunas com a allowlist elegivel_purga, o ledger, e a via de apply pela Management API (a version nasce correta)"
provides:
  - "public.retencao_hold — a tabela-guarda de D-46-04, aditiva, RLS ligada, UMA policy de SELECT admin-only e ZERO de escrita"
  - "A linha de hold da fixture neg-hold (candidatura 4601c000-0000-4000-8000-000000000005) — a obrigacao herdada do 46-01, FECHADA"
  - "public.candidaturas_alem_da_janela() com as QUATRO excecoes de politica completas: soft-delete, allowlist, Art. 20, hold pontual e vaga ainda aberta"
  - "As DUAS decisoes satisfeitas por AUSENCIA (D-46-01 is_rascunho, D-46-02 autorizacao_retencao_curriculo) NOMEADAS dentro do banco"
  - "supabase/tests/p46_purga_smoke.sql — (j.1)(j.2)(j.3)(k)(l), cada (j) com as DUAS metades; RESUMO (z) 6 -> 11"
  - "supabase/tests/p43_previa_smoke.sql (e) — 2o re-pin da fase, lado ARQUIVO medido; rede estrutural de 5 para 7 checagens"
affects: [46-04, 46-05, 46-06, 46-07]

actuals:
  tokens: 61000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Excecao que e NOT EXISTS e ALLOWLIST ao mesmo tempo: o interior da subconsulta e o COMPLEMENTO dos estados fechados, entao um valor de enum NOVO PROTEGE — fail-closed por construcao"
    - "Assercao negativa com DUAS metades: 'nao aparece' mais 'passa a estar' quando a condicao e desfeita — a segunda metade E a nao-vacuidade"
    - "Decisao satisfeita por AUSENCIA escrita no COMMENT: ausencia silenciosa e indistinguivel de esquecimento"
    - "Allowlist aferida por IGUALDADE DE CONJUNTO (array_agg ordenado por TEXTO), nunca por contagem nua — uma contagem de 3 passa com as 3 etapas erradas"
    - "Gatilhos de despacho desligados por CRITERIO MEDIDO DO CATALOGO dentro do envelope, e religados com assercao de residuo zero"

key-files:
  created:
    - supabase/migrations/20260823000005_p46_retencao_hold_e_excecoes.sql
  modified:
    - supabase/tests/p46_purga_smoke.sql
    - supabase/tests/p43_previa_smoke.sql

key-decisions:
  - "CREATE OR REPLACE em vez de DROP+CREATE: a assinatura de 6 colunas nao mudou, e substituir em lugar preserva o proacl — o problema de ACL que o DROP do 46-02 criou nao se repete"
  - "O INSERT da linha de hold vive na MIGRATION e nao num arquivo de teste: um arquivo de teste pode nao rodar, e enquanto a linha faltar a assercao (j.1) passa por vacuidade"
  - "(f) e (g) do smoke da 43 NAO foram tocadas: as listas literais delas codificam ESCOPO deliberado (as funcoes da familia da previa) e este plano nao cria funcao nenhuma — mexer num portao que ainda morde e o oposto do conserto"
  - "(j.3) responde a revisao gravando as QUATRO colunas, porque o CHECK de resposta completa e tudo-ou-nada; o UPDATE contorna o RPC de proposito, porque o objeto sob teste e o PREDICADO"
  - "Os gatilhos de net.http_post sao desligados por criterio medido antes de (j.3): sem isso o UPDATE enfileiraria um despacho e REPROVARIA a assercao (c) — um portao correto reprovando trabalho correto"
  - "O cabecalho da migration NAO repete a instrucao de reparo de version: pela Management API ela nasce correta, e propagar a instrucao obsoleta seria escrever um erro dentro do banco"

requirements-completed: []  # ver §Requirements — PURGA-07 e PURGA-02 NAO fecham aqui

metrics:
  duration: ~70min
  completed: 2026-08-23
---

# Phase 46 Plan 03: As quatro exceções de política — Summary

⏸ **ARTEFATOS COMMITADOS · APPLY EM PROD PENDENTE.** A Task 3 é um `checkpoint:human-verify`
bloqueante e o executor **não aplica migration nem roda SQL em PROD**. Tudo abaixo é medição sobre
arquivo; o que só o orquestrador pode medir está nomeado com o **valor esperado**, no checkpoint.

As quatro exceções de política que a Phase 43 deixou explicitamente abertas estão escritas **em um
só lugar**, valendo simultaneamente para a prévia e para o delete real. Duas ganharam cláusula
(hold pontual e vaga aberta); as outras duas são satisfeitas **por ausência**, e a ausência está
nomeada dentro do banco — porque ausência silenciosa é indistinguível de esquecimento.

## Task Commits

| Task | Nome | Commit |
|------|------|--------|
| 1 | `retencao_hold` + as duas exceções no predicado, **mais o re-pin de (e) no mesmo commit** | `7932e0e` |
| 2 | As cinco asserções de PURGA-07 em `p46_purga_smoke.sql` | `b9ae519` |
| — | SUMMARY + STATE + ROADMAP (checkpoint) | `<este commit>` |

Zero `--no-verify`: o hook de type-check rodou nos dois commits e reportou **96 erros — o baseline
congelado**, inalterado.

## ⛔ A obrigação herdada do 46-01, FECHADA — e por que ela era a diferença entre prova e vácuo

A fixture do plano 46-01 (`p46_fixture_elegivel.sql` §5f) tentou inserir a linha de hold para a
candidatura **`4601c000-0000-4000-8000-000000000005`**, não conseguiu porque `public.retencao_hold`
ainda não existia, e emitiu apenas um `RAISE NOTICE`. Enquanto ela faltasse, `neg-hold` seria só
mais uma candidatura elegível e a asserção (j.1) passaria **por vacuidade**.

O `INSERT` está na **Seção A.2 da migration** — não num arquivo de teste, que pode não rodar. Ele é
correlacionado por existência da candidatura, então um teardown da fixture não faz o apply falhar; é
o smoke que reprova, com o diagnóstico certo.

E a asserção (j.1) tem, como **primeira** verificação, exatamente essa contagem: `retencao_hold`
ativa para aquela candidatura tem de ser **1**, com uma mensagem de falha que nomeia a obrigação
herdada e o modo de falha por vacuidade.

## O contrato de não-vacuidade — 6 → 4, escrito como critério mensurável

| `slug#sufixo` | Depois do 46-02 | Esperado depois do 46-03 | Por quê |
|---|---|---|---|
| `pos1#01` | ✓ | **✓** | degrau (1), etapa `aprovado`, vaga arquivada, sem hold |
| `pos2#02` | ✓ | **✓** | degrau (2), etapa `decisao_final` |
| `pos3#03` | ✓ | **✓** | degrau (3) — é a fixture de (k) |
| `cap2#04` | ✓ | **✓** | mantém 2+ elegíveis para a prova do cap (D-46-08) |
| **`neg-hold#05`** | **✓** | **✗** | ⊖ linha viva em `retencao_hold` (D-46-04) |
| **`neg-vaga#06`** | **✓** | **✗** | ⊖ vaga em `ativa` (D-46-03) |
| `neg-art20#07` | ✗ | ✗ | a exceção do Art. 20, herdada da Phase 43 |
| `neg-etapa#08` | ✗ | ✗ | `entrevista_online` fora da allowlist (D-46-19) |
| `neg-etapa#09` | ✗ | ✗ | dentro da janela — o caso de D-46-11 |

**Critério de aceite mensurável, não prosa:** depois do apply,
`SELECT count(*) FROM public.candidaturas_alem_da_janela();` tem de devolver **exatamente 4**, e
`SELECT count(*) FROM public.titulares_alem_da_janela();` também **4**. **Um número que não cai é a
exceção correspondente falhando em SILÊNCIO** — e "o número baixou" nunca foi o critério: **qual**
linha caiu é que é. Um `0` significaria que uma exceção nova está ampla demais e protege o que
deveria purgar.

A trajetória inteira ficou escrita no cabeçalho do smoke: **7** (fixture) → **6** (46-02, allowlist)
→ **4** (46-03, hold + vaga).

## O 2º re-pin de (e) — lado ARQUIVO medido, lado VIVO no checkpoint

| Lado | Valor | Octetos | Quem mediu |
|---|---|---|---|
| **ARQUIVO** | `b4fdb3a1243f9375cd15a61ef27189f1` | **1 958** | executor, **por execução** do comando de recomputação registrado no bloco de PROVENIÊNCIA — nunca digitado |
| **VIVO** (`md5(prosrc)`) | ⏸ pendente | ⏸ | orquestrador, DEPOIS do apply |

Extração conferida: o trecho começa em `\n  SELECT c.id,` e termina em
`… < now();\n` — sem contaminação de comentário, que era a armadilha encontrada e registrada no
46-02 (o `indexOf` casando uma menção do delimitador num comentário de cabeçalho). A migration
**não menciona o delimitador nomeado** em lugar nenhum antes do `CREATE OR REPLACE`, de propósito.

**Histórico preservado no bloco de PROVENIÊNCIA — é o que torna um re-pin auditável:**
`ddfa6542921d241323c0124fc1bd1f99` (775 octetos, 2026-08-01 → 2026-08-23) e
`6df3564414519abc56379d9b8924fad0` (1357 octetos, vigorou algumas horas em 2026-08-23).
**Dois re-pins na mesma fase, ambos atos conscientes, ambos medidos.**

**A rede estrutural cresceu de CINCO para SETE e não perdeu nenhuma:** entraram `retencao_hold`
presente e `status_vaga` presente. O segundo `IF` de forma continua lá, e a comparação continua
sendo `IS DISTINCT FROM v_esperado` — **nenhum afrouxamento**, que é a única direção proibida.

## Varredura de portões — pela FORMA, e o que ficou intocado

Antes de acrescentar um objeto que um smoke vigia, a varredura foi feita como manda o CLAUDE.md
§"Portões: varra pela FORMA", sobre **todos** os arquivos de `supabase/tests/`:

| Achado | Veredito | Ação |
|---|---|---|
| `p43_previa_smoke` (c) `:374` — lista literal de 2 wrappers | **ESCOPO deliberado** (a família da prévia) | nenhuma |
| `p43_previa_smoke` (a) `:258` — idem | **ESCOPO deliberado** | nenhuma |
| `p43_previa_smoke` (f) `v_checadas <> 3` / (g) `<> 4` | **ESCOPO deliberado** — este plano **não cria função nenhuma** | nenhuma |
| `p37_lacunas_rls` `v_n <> 8` (×2), `<> 14` | escopados a `config_sla_etapa` / contador de PASS | nenhuma |
| `p37_fidelidade_schema`, `p43_guard_marketing`, `p44_pedidos_dados` — `pg_policies` | **todos escopados por `tablename`**, nenhum conta policies globalmente | nenhuma |
| `p42_invent05_cron` (a) `v_n <> 3` | fotografia — mas de `cron.job`, e o 4º job nasce no **46-06** (D-46-23) | fora de escopo |

**Conclusão medida: nenhum portão vivo enxerga uma TABELA nova em `public`.** `retencao_hold` não
quebra nenhum deles, e a nova policy tampouco — nenhuma asserção conta policies fora de um
`tablename` explícito. Emendar (f)/(g) aqui teria sido mexer num portão que continua mordendo, que é
o oposto do conserto.

## As cinco asserções, e por que cada (j) tem DUAS metades

A metade óbvia — "a fixture negativa NÃO aparece" — **não prova nada sozinha**: a fixture poderia
estar fora porque a data não venceu, porque a etapa saiu da allowlist, ou porque alguém a apagou.
A segunda metade, **"passa a estar"**, é a que fecha o argumento: desfeita a condição da exceção, a
candidatura **volta** ao conjunto — e isso só é possível se ela já estava **além da janela** o tempo
todo. **A não-vacuidade não é observação no fim do log; é a segunda metade da própria asserção.**

| Letra | 1ª metade | 2ª metade ("passa a estar") | Não-vacuidade extra |
|---|---|---|---|
| **(j.1)** | `neg-hold#05` ausente com hold ativo | `liberado_em` carimbado ⇒ aparece | **hold ativo tem de existir** — o portão da obrigação herdada |
| **(j.2)** | `neg-vaga#06` ausente com vaga `ativa` | vaga `arquivada` ⇒ aparece | a vaga tem de estar em `ativa` |
| **(j.3)** | `neg-art20#07` ausente com revisão aberta | revisão respondida ⇒ aparece | tem de haver exatamente 1 revisão aberta |
| **(l)** | `neg-etapa#08` ausente | etapa marcada elegível ⇒ aparece | allowlist por **igualdade de conjunto** |

**(k)** é a única sem "passa a estar", porque é positiva: `pos3` **está** no conjunto e vem com
`ancora_origem = 'updated_at'`, no **predicado E no item de ledger**. Ela reprova nos **dois
sentidos**, e as mensagens nomeiam cada um — *MODO DE ERRO 1* (omitida em silêncio, que é o modo de
falha que PURGA-07 descreve) e *MODO DE ERRO 2* (classificada por outro degrau, que é como o ledger
passa a mentir sobre por que a linha foi escolhida). Duas **pré-condições medidas** (zero histórico
na etapa atual, `data_decisao_final` nula) existem para que uma fixture derivada produza o
diagnóstico **certo** — "o erro é da FIXTURE, não do predicado" — em vez de um diagnóstico falso.

**(l) assere por IGUALDADE DE CONJUNTO e nunca por contagem nua**, e a razão é dura: *uma contagem
de 3 passaria em verde com as três etapas erradas marcadas como elegíveis* — o estado mais perigoso
que essa asserção poderia deixar passar. O `ORDER BY` é por **texto** e não pelo enum:
`etapa_processo` tem ordem de funil (`decisao_final` vem **antes** de `aprovado`), e comparar contra
um literal alfabético ordenado pelo enum reprovaria por acidente de ordenação.

## Deviations from Plan

### [Rule 2 - Funcionalidade crítica ausente] O `UPDATE` de (j.3) despacharia HTTP e REPROVARIA a asserção (c)

**Não previsto pelo plano, e é o achado deste plano.** A metade "passa a estar" de (j.3) carimba
`revisao_respondida_em` em `public.decisao_final` — e existe um gatilho **vivo**,
`trg_notif_revisao_respondida` (`20260730000004:270-276`), que dispara exatamente nessa transição
`NULL → NOT NULL` e chama `net.http_post`.

Duas consequências, e a primeira é imediata: **a asserção (c) do mesmo envelope mede
`net.http_request_queue` antes e depois de tudo.** Um enfileiramento aqui a faria reprovar — um
portão correto reprovando trabalho correto, que é precisamente o padrão que treina quem executa a
desligá-lo. A segunda: mesmo revertido pelo rollback (o `INSERT` do `pg_net` é transacional e um
registro nunca commitado nunca fica visível ao worker), despachar é risco que não precisa ser
corrido.

**O que foi feito:** os gatilhos são desligados **dentro do envelope** e **por CRITÉRIO MEDIDO DO
CATÁLOGO** (`pg_get_functiondef` contendo `net.http_post`), nunca por lista fixa de nomes — a lição
paga por medição no plano 46-01, onde o repositório anunciava 2 gatilhos, o catálogo vivo tinha 3, e
um dos anunciados não existia mais. Religados em seguida, com asserção de **resíduo zero** julgada
em (j.3). A lista de **tabelas** varridas (`decisao_final`, `vagas`, `retencao_hold`) é escopo
deliberado — são exatamente as três que o bloco muta —, e não fotografia do catálogo.
**Commit:** `b9ae519`.

### [Rule 3 - Bloqueio] A resposta à revisão precisa gravar QUATRO colunas, não uma

O plano dizia "responder a revisão dentro do envelope". Um `UPDATE` só de `revisao_respondida_em`
**violaria** `decisao_final_revisao_resposta_completa_check` (`20260730000001:143-150`), que é
tudo-ou-nada entre `revisao_veredito`, `revisao_por_usuario` e `revisao_respondida_em` — e o
`RAISE` de constraint abortaria o envelope inteiro, não só (j.3).

**O que foi feito:** o `UPDATE` grava as quatro colunas (a quarta, `revisao_resultado`, com ≥ 50
caracteres, exigidos por `decisao_final_revisao_justificativa_min_check`), e desfaz as quatro
depois. `revisao_por_usuario` usa o **próprio titular sintético** (`4601a000-…-07`), mesma escolha
que a fixture do 46-01 fez para `por_usuario` — **nenhum id de recrutador real entra neste
arquivo**. O `UPDATE` contorna o RPC `responder_revisao_decisao` de propósito, e isso está escrito
no arquivo: o objeto sob teste aqui é o **predicado**, não o guard daquele RPC, que tem smoke
próprio em `p42_revisao_art20_smoke.sql`. **Commit:** `b9ae519`.

### [Rule 1 - Bug] Um critério de aceite do plano produziria um smoke quebrado — **pela segunda vez na mesma fase**

O plano pedia, como critério de aceite, que *"todas as cinco estejam **antes** do `RAISE … 'P46B0'`
no arquivo — nenhuma asserção depois do rollback da própria fixture"*.

**Lido ao pé da letra, isso reproduz exatamente o defeito que o executor do 46-02 já encontrou e
documentou.** `set_config(name, value, false)` é **transacional**: um incremento do contador feito
dentro da subtransação é desfeito pelo rollback do `P46B0`, e o RESUMO (z) leria **0** num run
perfeito. É a lição nº 6 dos sete portões da Phase 45, e o precedente vivo
(`p45_motor_exclusao_smoke.sql`, `RAISE P45B0` na 1061 e contadores a partir da 1081) confirma.

A lição correta é *"nenhuma asserção é **MEDIDA** depois do rollback"*, e a separação é entre
**medir** (dentro, para variáveis plpgsql, que o rollback não reverte) e **julgar** (fora, sobre
variáveis).

**O que foi feito:** adotada a forma já vigente neste arquivo. **Todas as medições** de (j.1), (j.2),
(j.3), (k) e (l) ficam **dentro** do envelope (linhas 578-754, antes do `RAISE P46B0` na 780);
**todos os julgamentos e os cinco `set_config`** ficam **depois** (946-1048). Nenhuma consulta viva
existe na região de julgamento. **Commit:** `b9ae519`.

### [Desvio de estrutura] Dois commits para três tasks, e o re-pin viajou com a Task 1

O re-pin de `p43_previa_smoke.sql` (e) é prescrito pela Task 2, mas foi commitado **junto com a
Task 1** (`7932e0e`) — a mesma disciplina que o 46-02 aplicou em `48d76f0` e que o CLAUDE.md
§"Portões" formaliza: **a emenda do portão entra no MESMO commit da migration que a obriga.** Um
commit intermediário em que a migration existe e o pin ainda aponta para o corpo antigo é um estado
em que o portão está mecanicamente vermelho por construção do próprio repositório.

### [Rule 3] O `grep` deste ambiente não entende `\m` / `\M`

O `<verify><automated>` do plano usa `grep -cE '\mNOT[[:space:]]+IN\M'`. O `grep` desta máquina é
**ugrep 7.5.0**, que rejeita esses escapes (`invalid escape`) — o comando **falha em vez de medir**,
e um portão que não roda parece verde. Verificado com `\b` (fronteira de palavra portátil):
**zero ocorrências da forma banida no arquivo inteiro**, dentro **e** fora de comentário. A forma
banida também não aparece em prosa, de propósito — a lição do 46-02, onde dois portões estáticos
reprovavam a própria documentação que os tornava revisáveis.

⚠ Nota para os planos seguintes: o `\m` / `\M` **continua correto** dentro do plpgsql (é regex do
Postgres, e a asserção (e) o usa). O problema é só no `grep` de shell.

## Known Stubs

| Stub | Arquivo | Razão | Resolvido por |
|---|---|---|---|
| `public.retencao_hold` sem caminho de ESCRITA (nem policy, nem RPC) | `20260823000005` §A.1 | Deliberado e declarado no `COMMENT ON POLICY`: quem escreve decide quem **não** é purgado, e a direção perigosa é a de **liberar** um hold. Se a tela do RH precisar registrar holds, o caminho é uma RPC **auditada** — que grava a mudança e a linha de auditoria na mesma transação e que pode RECUSAR | Nenhum plano desta fase. Fica como decisão registrada, não como pendência |
| `criado_por` / `liberado_por` sempre nulos | idem | A única linha viva é a da fixture, sem autor humano | Idem — nulo é legítimo e está escrito no `COMMENT ON COLUMN` |
| Herdados do 46-02, ainda abertos | — | `varrer_purga_retencao()` não chama o motor · `relato_dry_run` nulo · `notificacoes_expurgadas` = 0 · `janela_notificacoes_meses` sem leitor · vocabulários `despachado`/`segredo_ausente` sem escritor | **46-04**, **46-05**/**46-06**, **46-07** |

**Fechado neste plano:** o stub *"`neg-hold#05` continua elegível — `public.retencao_hold` ainda não
existe"*, herdado do 46-01 e repetido no 46-02. A tabela existe e a linha é inserida pela migration.
⏸ A confirmação por execução é do checkpoint.

## Requirements

**`requirements-completed` fica VAZIO de propósito.** O frontmatter do plano declara
`[PURGA-07, PURGA-02]`, e **nenhum dos dois fecha aqui** — marcá-los seria a promessa-sem-código que
o CONSOL-04 audita, e o apply sequer aconteceu:

- **PURGA-07** ("`COALESCE` explícito + allowlist de terminais + as exceções de política") tem agora
  as quatro exceções escritas e cinco asserções que as provam — mas **nenhuma delas rodou**. Um
  requirement fecha quando a asserção **executa verde**, não quando ela é escrita. Fecha no
  checkpoint deste plano, se as cinco vierem verdes e o `count(*)` cair para 4.
- **PURGA-02** ("o dry-run sai da MESMA expressão do delete real") continua satisfeito **por
  construção** e agora com a rede de (e) crescida — mas o `DELETE` real ainda não existe. O
  requirement só é observável quando houver um caminho destrutivo para comparar, e ele nasce no
  **46-04**.

## Verification

| Critério | Estado |
|---|---|
| `20260823000005_p46_retencao_hold_e_excecoes.sql` existe | ✅ |
| Sem transação explícita no topo (`grep -c 'BEGIN;'`) | ✅ **0** |
| Sem delimitador de cifrão anônimo | ✅ **0** |
| Nenhuma negação por pertencimento a conjunto — dentro **e** fora de comentário | ✅ **0 / 0** |
| `NOT EXISTS` presente ≥ 4× | ✅ **7** |
| Exceção de vaga usa o complemento da allowlist, **exatamente uma vez** | ✅ **1** |
| `fk_retencao_hold_candidatura` presente, sem ação referencial | ✅ **2 menções**, `ON DELETE` = **0** no arquivo inteiro |
| Exatamente **1** `CREATE POLICY` em `retencao_hold`, e é `FOR SELECT` | ✅ |
| `is_rascunho` nomeado | ✅ **3** |
| `autorizacao_retencao_curriculo` nomeado | ✅ **4** |
| Lacuna de D-46-19 escrita ("nunca é purgado automaticamente") | ✅ **1** |
| `REVOKE` NOMEIA `anon` | ✅ **1** · `GRANT EXECUTE` para o predicado = **0** |
| ⊖ Corpo do predicado sem verbo de escrita (fronteira de palavra) | ✅ **0** nos cinco verbos |
| ⊖ Corpo mantém as 7 propriedades estruturais | ✅ `data_candidatura`, `NOT EXISTS`, `elegivel_purga`, `AS origem`, `retencao_hold`, `status_vaga`, e **zero** da forma banida |
| Extração do corpo limpa (sem contaminação de comentário) | ✅ head `\n  SELECT c.id,` · tail `< now();\n` |
| As cinco letras rotuladas em coluna 0 | ✅ **5** |
| Cada (j) com as duas metades (`passa a estar`) | ✅ **11 menções** |
| (l) por igualdade de conjunto | ✅ `array_agg(etapa ORDER BY etapa)` × `ARRAY['aprovado','decisao_final','rejeitado']` |
| (k) assere `ancora_origem = 'updated_at'` e nomeia os dois modos de erro | ✅ predicado **e** item de ledger |
| ⊖ Nenhuma asserção **MEDIDA** depois do rollback | ✅ medições ≤ linha 754, `P46B0` na 780, julgamentos ≥ 946 |
| Pin de (e) mudou, 32 hex, ≠ do 46-02 | ✅ `b4fdb3a1243f9375cd15a61ef27189f1` |
| Rede estrutural de (e) ≥ 7 | ✅ **18 linhas** casando `v_tem_*` |
| ⊖ (e) não afrouxada (`IS DISTINCT FROM v_esperado` + 2º `IF` de forma) | ✅ **1 / 1** |
| (f) e (g) do smoke da 43 intocadas | ✅ `v_checadas <> 3` e `<> 4` preservados |
| RESUMO (z) 6 → 11 | ✅ |
| Cabeçalho **sem** a instrução obsoleta de reparo de `version` | ✅ o arquivo diz explicitamente que ela não existe mais e por quê |
| `npm run lint` | ✅ **96 erros — baseline congelado inalterado** |
| Zero `--no-verify` | ✅ hook rodou nos 2 commits |
| Zero arquivo apagado | ✅ `git diff --diff-filter=D` vazio |
| ⏸ Apply em PROD, md5 dos dois lados, re-pin vivo, 5 smokes, `count(*)` = 4 | ⏸ **CHECKPOINT** |

## Self-Check: PASSED

- `supabase/migrations/20260823000005_p46_retencao_hold_e_excecoes.sql` — FOUND
- `supabase/tests/p46_purga_smoke.sql` — FOUND (modificado)
- `supabase/tests/p43_previa_smoke.sql` — FOUND (modificado)
- `.planning/phases/46-purga-autom-tica-dry-run-live/46-03-SUMMARY.md` — FOUND

Commits `7932e0e` e `b9ae519` — ambos FOUND em `git log`.

## Consequências medidas para os próximos planos

- **46-04:** ⚠ o pin de `anonimizar_candidato` (`8c86e0f040219e7eade47eb587dbf5de`,
  `p45_motor_exclusao_smoke.sql:1591`) **vai mudar**, e o re-pin é obrigação de D-46-18 (obrigação 4)
  com conferência cruzada. O pin do **predicado** (`b4fdb3a1…`) **não** deve mudar naquele plano — se
  mudar, alguém editou o predicado sem plano.
- **46-04:** o bloco de auto-verificação daquele plano tem de **abortar o apply** se `authenticated`
  puder escrever em `purga_execucoes` / `purga_execucao_itens`. Vale acrescentar `retencao_hold` à
  mesma pergunta: a partir de agora, **liberar um hold** é o passo que falta entre "registro sob
  litígio" e "registro apagado irreversivelmente".
- **46-06:** `cron.job` continua com **3** jobs; a emenda de D-46-23 ao `p42_invent05_cron_smoke.sql`
  segue **pendente** e é o único "instantâneo travestido de invariante" desta fase ainda aberto.
- **46-07:** das três linhas da allowlist, **duas seguem em `origem = 'seed'`** (`aprovado` e
  `decisao_final`); confirmá-las é pré-condição do flip (D-46-22). O contador de D-46-14 está em
  **2** execuções commitadas.
- **Todos:** o `grep` desta máquina é **ugrep** e **não entende `\m` / `\M`**. Critérios de aceite
  escritos com esses escapes **falham em vez de medir** — usar `\b`. Dentro do plpgsql, `\m` / `\M`
  continuam corretos.
