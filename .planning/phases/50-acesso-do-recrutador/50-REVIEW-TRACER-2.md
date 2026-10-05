---
phase: 50-acesso-do-recrutador
reviewed: 2026-10-05T19:05:53Z
depth: deep
diff_base: 81bfab810306c05b1e503ca4a8929d6fb674b466
reviewed_head: 5d93e378a637afb555a1e1c2c5b9b4e431eb37df
scope: re-revisão adversarial do tracer depois da rodada de conserto do 50-REVIEW-TRACER-1 (c56f3605, e29f281a, 6209d672, 91ba85c1, 781dd3b5, d1f5324a, 5d93e378). Escopo — o diff de código inteiro do 50-01 e da rodada (`81bfab81..5d93e378 -- . ':!.planning'`, 7 arquivos) e o `50-02-PLAN.md`, lido como o programa que escreve em PROD. Lidos como contexto, fora da lista revisada — `50-REVIEW-TRACER-1.md`, `50-07-PLAN.md`, `50-10-PLAN.md`, `50-11-PLAN.md`, `p46apply.cjs`, CLAUDE.md. PROD só leitura (`set transaction read only`), ou dentro de requisições que abortam. Re-executados, todos abortando, com leitura de persistência antes e depois — `node scripts/p50_mutacoes.cjs` (CONTROLE 7/7; 11/11 mordem com os rótulos declarados; «nada persistiu»), `p50_ensaio.cjs --vistas --migracoes=…0001… <smoke>` (vistas=igual, 7/7), o Step 1 d do plano (`--vistas --migracoes=…0001… --mutacao=…desfazer_tracer.sql`, vistas=igual) e três composições do revisor para o ensaio reverso (controle verde; exposição semeada → `P50V FAIL (vistas)`; desfazer adulterado → `P50D FAIL (pos)`; nada persistiu). O enumerador foi exercitado só sobre git. Nada foi aplicado e nada foi enviado.
files_reviewed: 8
files_reviewed_list:
  - supabase/migrations/20261005000001_p50_helper_candidaturas.sql
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p50_vistas_externas.sql
  - supabase/tests/p50_desfazer_tracer.sql
  - scripts/p50_ensaio.cjs
  - scripts/p50_mutacoes.cjs
  - scripts/p50_enumera.cjs
  - .planning/phases/50-acesso-do-recrutador/50-02-PLAN.md
findings:
  critical: 0
  warning: 8
  info: 9
  total: 17
status: issues_found
---

# Phase 50: Code Review Report — re-revisão do tracer (50-01 + rodada de conserto) e do programa de apply (50-02)

**Reviewed:** 2026-10-05T19:05:53Z
**Depth:** deep
**Files Reviewed:** 8: os 7 arquivos de código e o `50-02-PLAN.md`
**Status:** issues_found, com 0 crítico

## Summary

A memória do projeto avisa que, duas vezes seguidas, uma rodada de conserto trouxe um blocker novo. Por isso li a rodada com mais
desconfiança do que o código original. **Não achei blocker novo. O objeto que vai a PROD continua certo:**
- a migration `20261005000001` não mudou desde o 50-01 (`git diff e80d9bb6..HEAD` dá 0 linha, e o único commit no arquivo é
  `358c0090`);
- o desfazer novo restaura exatamente o estado medido ao vivo. Em PROD hoje: `roles {public}`, md5 `34060c39f6f61e65613e15a093222691`,
  comentário nulo, helper ausente, ledger sem `20261005*`. Medi pela composição «migration → desfazer» que o desfazer volta ao mesmo md5.

O que mudou na rodada, e como conferi:
- **O smoke agora ESCREVE.** Tracei cada envelope, (b), (c) e (f): toda escrita está dentro do bloco interno que termina em
  `RAISE … 'P50C1'`. Erro no meio cai no `WHEN OTHERS`, que também desfaz a subtransação. `query_canceled` não é capturado e aborta a
  transação inteira. Nenhum caminho deixa o bloco interno terminar normalmente.
- **Os triggers que essas escritas disparam.** Medi os triggers de UPDATE em PROD:
  - `candidaturas`: só `update_candidaturas_updated_at` dispara para `SET is_rascunho`/`SET deleted_at`. Os que usam `net.*` são AFTER
    INSERT ou `UPDATE OF encerrada_a_pedido_em`;
  - `usuarios_rh`: `anti_lockout` e `updated_at`. O `anti_lockout` toma `pg_advisory_xact_lock`, e medi que esse lock **é liberado**
    no rollback da subtransação: 0 lock advisory depois;
  - nenhuma regra e nenhuma publicação nas duas tabelas. Das extensões de rede, só `pg_net`, que é transacional.

  Por isso nada escapa do rollback. A leitura de persistência dos runners pegaria um vazamento, porque cobre `role|ativo|deleted_at` e
  a borda.
- **Fechamentos confirmados por execução.** M7..M11 mordem nas letras e nos rótulos declarados. O ensaio reverso morde uma exposição
  semeada e um desfazer adulterado. O enumerador recusa código depois do `reviewed_head` e depois do pin, recusa revisão com crítico
  (ordena N numericamente: 10 > 2) e aceita o caso em que a revisão mais recente cobre o HEAD.

**Os defeitos estão em volta do objeto.** São de quatro tipos:
1. O smoke que escreve continua sendo rodado numa requisição que **commita**, sem leitura de persistência (WR-01).
2. O «nada persiste» do ensaio depende de nenhum arquivo composto conter um terminador de transação. Medi que um `COMMIT;` no corpo
   encerra a transação da requisição (WR-02).
3. A prova D-12 «sem janela de tráfego» não é sem janela, porque a requisição roda em READ COMMITTED (medido). Além disso, a
   classificação «SEM TRAFEGO» tem modos de vermelho falso com diagnóstico de exposição (WR-03, WR-04).
4. Os planos seguintes herdam números e contagens que a rodada invalidou (WR-05, WR-06).

## Status dos achados do 50-REVIEW-TRACER-1

| Achado | Status | Evidência |
|---|---|---|
| WR-01 conjunto do claim `rh` sem vigia | **fechado** | (d) `ativo_visualizador/ativo_gerente/ativo_sem_role` na MESMA linha ativa do positivo; M7 morde em (d) com os três rótulos (medido, 1376 ms) |
| WR-02 par ativo × inativo confundido | **fechado** | `a_inativo_mp` com o mesmo papel (hoje `aaaaaaaa…`, admin inativo); caminho real `recrutador` + claim `rh` pela troca de papel no envelope; M8 morde em (b) `[rec_ativo,inativo_mesmo_papel]` |
| WR-03 BORDA vácua | **fechado** | borda semeada em (f), com controles `c_populacao`/`c_admin_*`; M9 e M10 mordem em (f) pelos rótulos exigidos |
| WR-04 `PERSISTIU` vácuo | **parcial** | `capturar()` é compartilhado e cobre todas as 155 policies, `usuarios_rh` e a borda. Ainda faltam os corpos das funções que 0002–0004 reescrevem, como o próprio cabeçalho admite (`p50_ensaio.cjs:22-23`). Carregado como WR-07 abaixo |
| WR-05 saída anormal sem leitura | **fechado** | `sair()` mede antes de toda saída posterior à baseline (`p50_mutacoes.cjs:77-89`, 299-305). O CLI do ensaio mede antes de classificar timeout (`p50_ensaio.cjs:326-336`). Resíduo: IN-03 |
| WR-06 amarrações fora do comando da escrita | **fechado no 50-02** | Step 2: binding da revisão + `p46apply.cjs` na árvore limpa. Task 3: pin × HEAD, `--revisoes`, `--aplicado`, tudo no comando do push. Exercitado sobre git. Não portado ao 50-10 (WR-06 abaixo). Resíduo: IN-01 |
| WR-07 comparação das vistas incapaz de falhar / sem saída | **fechado para verde falso; vermelho falso aberto** | `ledger_p50` recusa um «antes» refeito, e o ensaio reverso morde (medido). Seguem abertos o «sem janela» (WR-03) e o «SEM TRAFEGO» (WR-04) |
| WR-08 `anon` cego em 11 de 17 relações | **aberto** | sem mudança. A sonda ao vivo de hoje ainda grava `e:42501` para `anon` em 11 relações. Carregado como WR-08 abaixo |
| IN-01 orçamento de lock / `anon` 3 s | **aberto** | o cabeçalho do ensaio ainda cita só `authenticated`/`authenticator`. Carregado como IN-07 |
| IN-02 «nenhuma lista literal» | **fechado** | cabeçalho da sonda corrigido; a população tem resíduo de 1 (IN-04) |
| IN-03 texto antigo / CASCADE | **fechado** | `p50_desfazer_tracer.sql`: verbatim = qual vivo, PRÉ/PÓS-PORTÃO, `RESTRICT`, ordem escrita, `COMMENT … IS NULL` (o vivo é nulo). Não é migration: mora em `supabase/tests/`, fora do `MIGS` fixo, e nada no repo roda `supabase/tests/*.sql` em lote |
| IN-04 estado intermediário | **aberto** | o aviso (c) do Task 1 não mudou. Carregado como IN-08 |
| IN-05 diagnóstico de tráfego em (c)/(e) | **fechado** | mensagens de (c), (e) e (f) com a orientação |
| IN-06 `deleted_at` do helper sem população | **fechado** | `ativo_excluido`, e M11 morde |
| IN-07 «antes» do SC1 sem comando | **fechado** | Step 1 c literal; Step 1 a com `&& echo vistas-antes-ok` e a checagem de `ledger_p50` |
| IN-08 `sec05_08` vermelho até o 50-08 | **aberto** | o plano não manda registrar. Carregado como IN-09 |
| IN-09 `55P03` virando exposição | **fechado** | `WHEN lock_not_available OR query_canceled THEN RAISE` nos dois laços da sonda |

## Warnings

### WR-01: o smoke ESCREVE, e o 50-02 o roda ao vivo numa requisição que COMMITA, sem leitura de persistência e sem teto de lock

**File:** `.planning/phases/50-acesso-do-recrutador/50-02-PLAN.md:188` (verify #2) · `supabase/tests/p50_acesso_recrutador_smoke.sql:46-47, 150-152`

**Issue:** O verify #2 roda `node p46apply.cjs run supabase/tests/p50_acesso_recrutador_smoke.sql`. Esse `run` commita: o sentinela do
ensaio não está no arquivo. O que torna esse caminho seguro **hoje** são três envelopes P50C1 escritos à mão, (b), (c) e (f), e
conferi um a um. Mas:
- **a promessa do cabeçalho não vale aqui.** Ele diz (linhas 46-47) que «os runners conferem depois, por leitura só-leitura» que
  `usuarios_rh` e a borda ficaram iguais. O verify #2 não é runner e não confere nada;
- **não há teto de lock.** O `run` não leva `SET LOCAL lock_timeout`, e o smoke também não. Os `UPDATE` de (b)/(c)/(f) trancam uma
  linha real de administrador (`66412f96…`) e duas candidaturas reais, e esperam sem teto se houver lock concorrente;
- **o envelope é disciplina, não estrutura.** O 50-07 vai acrescentar cláusulas que escrevem (SC4: «filas semeadas»). Uma escrita
  fora do bloco interno, ou um bloco que termine normalmente, **commita em PROD**: rascunho/exclusão numa candidatura real, ou um
  administrador rebaixado. O verify segue verde, porque o smoke julga antes do commit.

**Failure scenario:** Uma cláusula nova do smoke v2 faz `UPDATE candidaturas SET deleted_at = now()` fora do envelope, ou num bloco sem
`RAISE P50C1`. O 50-10 (ou o 50-02 re-executado) roda o smoke por `p46apply.cjs run`, e a candidatura de um titular real fica marcada
como excluída. Nenhum portão lê isso: o `(z)` conta linhas, não estados.

**Fix:** depois do apply, rodar o smoke pelo ensaio. Ele aborta, tem teto de lock e mede persistência. No modo padrão pós-apply não
prefixa nada, porque a 0001 já está no ledger e 0002–0004 não existem no disco:
```sh
node scripts/p50_ensaio.cjs supabase/tests/p50_acesso_recrutador_smoke.sql > "$T/p50_02_smoke.log" 2>&1; rc=$?; tail -1 "$T/p50_02_smoke.log"; test "$rc" = 0 && grep -q '^ENSAIO VERDE: .* · aplicadas=\[20261005000001\] · .* · smoke50=7/7 · ' "$T/p50_02_smoke.log" && echo "smoke ao vivo: 7/7 (abortado, nada persistiu)"
```
Trocar também o «COMO RODAR · depois do apply» do cabeçalho do smoke (linha 150) para esse comando, e dizer que `p46apply.cjs run`
deste arquivo é proibido.

### WR-02: o «nada persiste» do ensaio depende de nenhum arquivo composto conter `COMMIT`/`END;` no nível de topo — e `--mutacao=` aceita qualquer arquivo

**File:** `scripts/p50_ensaio.cjs:76-96` (PREFIXO/FIM), `:227-237` (`compor`), `:285, 301-304` (`--mutacao=`, novo nesta rodada)

**Issue:** Medi pela Management API, sem escrita: `select set_config('p50.revisor_tx', …, true); SET LOCAL statement_timeout =
'1234ms'; COMMIT; select current_setting('p50.revisor_tx', true), current_setting('statement_timeout')` devolve `''` e `2min`. Ou
seja, um `COMMIT;` no meio do corpo **encerra a transação da requisição**:
- tudo o que veio antes fica gravado;
- o resto roda em autocommit, sem o `lock_timeout` e o `statement_timeout` do prefixo;
- o `RAISE` do sentinela aborta só a si mesmo.

O mesmo vale para `END;`, `ROLLBACK; …` e `COMMIT AND CHAIN`. O `compor` concatena arquivos sem verificar isso. A rodada criou duas
superfícies novas para o problema:
- `--mutacao=<arquivo qualquer>` no CLI;
- `p50_desfazer_tracer.sql`, que o próprio cabeçalho diz ser também a «base de uma migration CORRETIVA». O idioma histórico desse tipo
  de arquivo neste repositório é `BEGIN; … COMMIT;` (CLAUDE.md §Migrations).

Hoje nenhum arquivo composto tem terminador no nível de topo: conferi, e todos os `END;` estão dentro de corpos `$…$`. O defeito é
latente.

**Failure scenario:** Alguém prepara a corretiva a partir do desfazer, envolve em `BEGIN; … COMMIT;` e, antes de aplicar, a ensaia por
`p50_ensaio.cjs --vistas --sem-migracoes --mutacao=<corretiva>`. O ensaio, que deveria abortar, **desfaz o tracer em PROD**: policy de
volta a `{public}` com posse, e helper derrubado. O `capturar()` imprime `PERSISTIU` depois do fato. Num ensaio de 0003/0004, o
`capturar()` nem vê as funções (WR-07).

**Fix:** guarda estrutural no próprio corpo, que não depende de parsear SQL. O PREFIXO marca a transação com uma GUC **local**, e o
FIM exige que ela ainda exista:
```js
// PREFIXO, primeira linha:
"SELECT set_config('p50.tx', txid_current()::text, true);\n" +
// FIM, antes do RAISE do sentinela:
"  IF coalesce(current_setting('p50.tx', true), '') = '' OR current_setting('p50.tx', true) <> txid_current()::text THEN\n" +
"    RAISE EXCEPTION 'P50E FAIL (transacao): o corpo commitou no meio — algo PERSISTIU antes deste ponto';\n" +
"  END IF;\n"
```
Também recusar em `compor`, depois de tirar comentários e corpos `$tag$…$tag$`, qualquer
`^\s*(BEGIN|START\s+TRANSACTION|COMMIT|END|ROLLBACK|ABORT|SAVEPOINT|RELEASE)\b`.

### WR-03: o ensaio reverso é apresentado como prova «SEM janela de tráfego», mas a requisição roda em READ COMMITTED

**File:** `supabase/tests/p50_desfazer_tracer.sql:8-10` · `supabase/tests/p50_vistas_externas.sql:46-48` · `50-02-PLAN.md:23, 191, 193` · `scripts/p50_ensaio.cjs:76-83`

**Issue:** Medi `current_setting('transaction_isolation') = 'read committed'` na via do `p46apply.cjs`. Cada instrução, inclusive cada
`EXECUTE` dentro do `DO` da sonda, toma um snapshot novo. A sonda «antes», o desfazer e a sonda «depois» estão na mesma transação,
mas **veem os commits concorrentes que caem entre elas**.

O `ALTER POLICY` do desfazer tranca as escritas em `candidaturas` só a partir dele. Até ali, e o tempo todo em `vagas`,
`usuarios_rh`, `historico_candidatura` e nas views, o tráfego entra na comparação. A janela é de cerca de 1–2 s (medi de 1,6 s a
5,4 s de parede por requisição). O plano trata o vermelho desse ensaio como **exposição** («exposure, STOP», linha 193), e o único
remédio que dá é o desfazer com checkpoint.

**Failure scenario:** O RH ativa ou desativa uma vaga, ou um titular cria uma candidatura, durante o ensaio reverso do verify #4. Sai
`P50V FAIL (vistas): anon.public.vagas,sem_claims.public.vagas,…`, um diagnóstico falso de exposição sobre a policy que todas as telas
de RH leem. É o mesmo defeito de classe que a memória «portões reprovaram trabalho correto; diagnóstico falso» registra.

**Fix:** pôr `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;` como **primeira** linha do `PREFIXO`. Medi que a via aceita:
`current_setting('transaction_isolation') = 'repeatable read'`. Aí o «sem janela» passa a ser verdade, para o ensaio reverso e para o
`--vistas`. Re-provar CONTROLE 7/7 e 11/11 depois da troca. Em RR, um `UPDATE` do envelope numa linha que mudou depois do snapshot dá
40001 e cai como «erro INESPERADO», que é falha alta e correta. O `(z)` passa a medir só resíduo próprio, que é o que ele diz medir.
Até lá, o `fails_when` do verify #4 deve mandar repetir uma vez antes de ler um `P50V FAIL` como exposição.

### WR-04: «VISTA EXTERNA MUDOU SEM TRAFEGO» acusa exposição sem conferir que os atores são os mesmos, nem que a vista depende só da relação

**File:** `50-02-PLAN.md:190-191` (verify #3) · `supabase/tests/p50_vistas_externas.sql:43-45, 86-104`

**Issue:** A regra classifica uma mudança na vista de um ator como `ex` (mudança de ACESSO, STOP) sempre que o `pop_fp` daquela
relação não mudou. Ela assume duas coisas que não confere:
1. **Mesmos atores nas duas capturas.** A sonda escolhe os atores na execução: o candidato mais antigo com candidatura viva (hoje a
   fixture `4601a000-…`) e o recrutador inativo mais antigo. Grava os `ids`, mas o verify #3 nunca compara `a.ids` com `d.ids`. Entre
   o Step 1 e o verify #3 passam minutos ou horas. Uma exclusão LGPD (o M8 inteiro é sobre isso), um teardown da fixture p46 ou uma
   reativação troca o ator.
2. **A vista de R depende só das linhas de R.** É falso para policies com subconsulta. O candidato vê `historico_candidatura` (1 linha
   hoje) e `v_triagem_panel` (1) pela ligação com `candidaturas`/`candidatos`. Se a candidatura dele mudar, a vista dele em
   `historico_candidatura` muda sem que o `pop_fp` de `historico_candidatura` mude.

Os dois modos de falha levam a `VISTA EXTERNA MUDOU SEM TRAFEGO`, que o `fails_when` chama de «possible exposure, STOP». O plano não dá
ao ensaio reverso o poder de limpar esse veredito: só limpa o `AMBIGUO`. Há ainda um defeito menor: um log «antes» sem `pop_fp` derruba
o script com TypeError em `Object.keys(a.pop_fp)`, sem mensagem.

**Failure scenario:** O titular `4601a000-…`, que é fixture, é removido entre as capturas, e o «depois» escolhe outro candidato. A
vista do candidato em `vagas` (2) segue igual, mas em `historico_candidatura` muda sem mudança de `pop_fp` naquela tabela. O resultado
é STOP com diagnóstico de exposição contra um apply correto.

**Fix:** no verify #3, três trocas.
- Antes de tudo, `if (JSON.stringify(a.ids) !== JSON.stringify(d.ids))`, tratado como `ATOR MUDOU — comparação sem objeto; decide o
  ensaio reverso`, sem vermelho próprio.
- Classificar como `ex` só quando o `pop_fp` de **todas** as relações ficou igual (impressão digital global). Com qualquer tráfego, a
  diferença é `AMBIGUO`.
- Validar `a.pop_fp`/`d.pop_fp` como objetos, com mensagem.

No `fails_when`, escrever que todo vermelho do verify #3 vai primeiro ao ensaio reverso, já sob RR (WR-03), e só depois a um
checkpoint.

### WR-05: o 50-07 numera M7..M18 e exige `18/18` — colide com os M7..M11 desta rodada e reprova trabalho correto

**File:** `.planning/phases/50-acesso-do-recrutador/50-07-PLAN.md:28, 34-35, 172, 180-192, 195-200, 229, 241`

**Issue:** São três defeitos de plano:
- **Numeração em colisão.** O 50-07 define M7..M18 com outro significado (M7 = `rh_le_scores` de volta à posse; M10 =
  `liberar_cognitivo`…), mas o runner já tem M7..M11, os do WR-01/02/03/IN-06;
- **contagem fixa errada.** O verify exige `^controle verde; 18/18 mutacoes mordem; nada persistiu$`. Com 11 mutações existentes e 12
  planejadas, a contagem correta é 23;
- **artefato que não casa.** O `contains: "M18"` e «a tabela do cabeçalho lista M1..M18» também deixam de casar.

**Failure scenario:** Duas saídas possíveis, e ambas são ruins:
- o executor do 50-07 acrescenta as 12 mutações e o portão fica vermelho para sempre com 23/23 (contagem contra constante: a forma da
  primeira linha da tabela do CLAUDE.md §Portões);
- para «fechar» 18/18, ele renumera ou apaga M7..M11. Com isso, o WR-01 (conjunto do claim), o WR-02 (mesmo papel / recrutador real)
  e o WR-03 (borda) voltam a ficar sem vigia, justamente na expansão que copia o molde para 13 policies.

**Fix:** reescrever o 50-07 Task 3 com três mudanças:
- continuar a numeração em **M12..M23**;
- trocar o literal pelo idioma que o 50-02 já usa: `N = require('./scripts/p50_mutacoes.cjs').MUTACOES.length`, sem `PULADA`, `m[1] =
  m[2] = N`;
- declarar `rotulos` para cada mutação nova.

O `contains` passa a `"M23"`, ou melhor, a uma checagem de que os ids de `MUTACOES` são `M1..M<N>` sem buraco.

### WR-06: o 50-10 não herdou nenhuma das amarrações do WR-06 e também fixa `18/18`

**File:** `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:154` (Step 2), `:170-171, 234` (`18/18`), `:191` (push)

**Issue:** O 50-10 é o plano que aplica 0002–0004 (13 policies e 18 funções) e faz o deploy de 5 EFs. Ele tem quatro buracos:
- **Apply sem amarração.** Cada `p46apply.cjs migrate` confere HEAD = pin e a árvore `supabase src scripts` limpa. **Não** confere que
  o código do pin é o do `reviewed_head` do `50-REVIEW-ACESSO-N` (item 1 do WR-06), e deixa `p46apply.cjs`/`efdeploy.cjs` fora da
  árvore limpa (item 2), embora a precondição liste os dois;
- **EF deploy fora do pin.** O `efdeploy.cjs`, que lê do disco, nem passa pelo comando com pin;
- **Push sem as checagens.** O push faz `git diff --quiet refs/gsd/50-10/sha "$S2" -- supabase src scripts`, sem `p46apply.cjs`, e
  roda o enumerador sem `--revisoes`/`--aplicado`. A allowlist ainda aceita `supabase/tests/[A-Za-z0-9_]+\.sql`, qualquer teste;
- **Contagem fixa.** O verify #5 e a `<verification>` fixam `18/18` (o mesmo defeito do WR-05).

**Failure scenario:** É o cenário do WR-06 do TRACER-1, agora no apply que mais alarga acesso na fase. Um `fix(50-0N)` commitado
entre a revisão e o apply, ou entre o apply e o push, vai a PROD ou ao `main` sem revisão. Um `efdeploy.cjs` sujo publica uma EF que
não é a do pin.

**Fix:** portar ao 50-10 a cadeia do Step 2 do 50-02, com `50-REVIEW-ACESSO` no lugar de `50-REVIEW-TRACER`:
- binding do `reviewed_head`;
- `p46apply.cjs efdeploy.cjs` na árvore limpa, em cada apply **e** em cada `efdeploy`;
- no push, `-- . ':!.planning'`, e `--revisoes .planning/phases/50-acesso-do-recrutador/50-REVIEW-ACESSO --aplicado
  refs/gsd/50-10/sha`;
- trocar `18/18` pelo `MUTACOES.length` (WR-05).

### WR-07 (carregado do WR-04 do TRACER-1): `capturar()` ainda não lê os corpos das funções que 0002–0004 vão reescrever

**File:** `scripts/p50_ensaio.cjs:22-23, 179-189`

**Issue:** O próprio cabeçalho diz «Ainda fora: o corpo das funções que as migrations 0002–0004 vão tocar — WR-04 … aberto». Os
ensaios do 50-03..50-07 vão prefixar 0003/0004, que fazem `CREATE OR REPLACE` de 18 RPCs, e mutações que reescrevem RPCs vivas (M10,
M11, M14, M17 do 50-07). Um ensaio que commitasse deixaria essas funções trocadas em PROD com `ENSAIO VERDE`. Combinado com o WR-02,
esse é o caminho que o `capturar()` não vê.

**Failure scenario:** Um ensaio de 0004 commita no meio, por um `COMMIT` num arquivo (WR-02) ou por defeito do transporte. Uma RPC de
escrita fica sem a guarda de posse, e o operador vê `ENSAIO VERDE` sem `PERSISTIU`.

**Fix:** como no TRACER-1, acrescentar `funcoes`: `md5(prosrc)||proacl||prosecdef||proconfig` de toda função de `public` (por forma,
não por lista). Isso tem de entrar **antes** do primeiro ensaio de 0002–0004.

### WR-08 (carregado do WR-08 do TRACER-1): para `anon`, a sonda segue gravando `e:42501` como fotografia

**File:** `supabase/tests/p50_vistas_externas.sql:168-183`

**Issue:** Sem mudança desde o TRACER-1. A sonda ao vivo de hoje (só leitura) grava, para `anon`, `e:42501` em 11 das 17 relações:
`candidaturas`, `decisao_final`, `v_fila_trabalho`, `v_triagem_panel`, `entrevista_guias`, `scores_candidato`, `v_analises_presas`,
`entrevista_analises`, `historico_candidatura`, `notificacoes_enviadas` e `decisao_final_historico`. «Igual» entre duas recusas não
prova nada sobre a policy. Para o tracer não há exposição, pelos motivos do TRACER-1. Na expansão (9 policies `{public}`) é o ponto
cego.

**Failure scenario:** O mesmo do TRACER-1. Na expansão, uma policy alargada que fique `{public}` numa tabela em que `anon` tem SELECT
abre para `anon` assim que a policy de titular deixar de errar, e a sonda segue `vistas=igual`.

**Fix:** o mesmo do TRACER-1. Por relação, gravar o fingerprint das policies aplicáveis a `anon` (`roles` ∋ `anon`/`public`) e
`has_table_privilege('anon', rel, 'SELECT')`, e marcar `e:42501` como `cego` na saída. Isso tem de entrar antes do 50-07.

## Info

### IN-01: o Step 2 e o enumerador leem a revisão da ÁRVORE de trabalho, não do commit fixado

**File:** `50-02-PLAN.md:179` · `scripts/p50_enumera.cjs:76-104`

**Issue:** O `critical: 0` e o `reviewed_head` saem do arquivo no disco: `ls $P`, `awk … "$F"`, `fs.readFileSync`. A conferência
«revisão commitada uma única vez» existe só no verify do Task 1, que é outro comando. Um `50-REVIEW-TRACER-3.md` não commitado, por
exemplo de outra janela no meio da escrita, ou uma edição local de frontmatter, decide o apply. A igualdade de código pin =
`reviewed_head` continua valendo, por isso o risco é baixo.

**Fix:** no Step 2, ler com `git show "$S:$F"` e recusar se `git status --porcelain -- "$F"` não for vazio. No enumerador, ler com
`git show <ate>:<prefixo>-<N>.md`.

### IN-02: `capturar()` ficou largo o bastante para acusar `PERSISTIU` por tráfego legítimo

**File:** `scripts/p50_ensaio.cjs:179-189`

**Issue:** A leitura agora cobre toda policy de `public`, `role|ativo|deleted_at` de **toda** linha de `usuarios_rh` e **toda**
candidatura de borda. Três coisas legítimas no meio de uma execução saem como `PERSISTIU`, um diagnóstico que diz que o ensaio vazou:
- um administrador desativar alguém;
- um titular excluir os dados (borda nova);
- DDL de outra janela.

**Fix:** restringir as duas leituras novas às linhas que o smoke toca. O smoke pode publicar `a_ativo` e os dois ids semeados na
evidência do sentinela. Ou, na diferença, imprimir `DIFERENCA (PERSISTIU ou trafego): …` e reler uma vez.

### IN-03: no CLI do ensaio, um `capturar()` que falha depois do envio derruba o processo sem «PERSISTENCIA NAO MEDIDA»

**File:** `scripts/p50_ensaio.cjs:326`

**Issue:** No `p50_mutacoes.cjs`, a falha da leitura vira `PERSISTENCIA NAO MEDIDA` (`:82-84`). No CLI do ensaio, `capturar()` depois
de `rodar()` não tem `try`. Uma falha de rede sai com stack trace, e o operador não sabe que a persistência ficou sem medida
justamente depois de um corpo enviado.

**Fix:** `try { depois = capturar() } catch (e) { console.error('PERSISTENCIA NAO MEDIDA: ' + e.message); process.exit(1) }`.

### IN-04: a população da varredura registrada no cabeçalho (345) já está defasada — a frase que a registra casa o padrão

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:127-129`

**Issue:** Medi 346 linhas. A 346ª é a linha 128 do próprio cabeçalho («e 5 `v_rc <> 1`»), porque a prosa que conta a população casa
o padrão. É fotografia num comentário, sem efeito em portão.

**Fix:** registrar a população como «medida em <data>», sem tratá-la como invariante, ou escrever a prosa sem o literal (`v_rc` ≠ 1).

### IN-05: o cabeçalho do smoke omite o advisory lock do `anti_lockout`, e o smoke passou a depender de linhas-semente

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:38-40, 205-215`

**Issue:** São duas lacunas:
- **O lock não está documentado.** O `tg_usuarios_rh_anti_lockout` toma `pg_advisory_xact_lock(hashtext('usuarios_rh_admin_guard'))`
  ao rebaixar um administrador ativo, que é o caso de (b)/(c) hoje. Medi que o lock é liberado no rollback da subtransação, e o
  cabeçalho não registra isso;
- **A negativa depende de linha-semente.** O `a_inativo_mp` de hoje é `aaaaaaaa…`, uma linha com cara de semente (par de
  `bbbbbbbb…`). Se alguém limpar as linhas-semente ou reativar `4a1fa998`, o baseline falha alto. O diagnóstico é correto, mas
  reprova o trabalho até haver outro inativo de mesmo papel.

**Fix:** registrar o advisory lock e a medição no cabeçalho, e registrar no SUMMARY do 50-02 de quais linhas o smoke depende.

### IN-06: o push do 50-11 roda o enumerador sem `--revisoes`/`--aplicado`

**File:** `.planning/phases/50-acesso-do-recrutador/50-11-PLAN.md:165`

**Issue:** O 50-11 empurra só `scripts/p50_sessao_real.cjs`, que não escreve em PROD. Por isso o binding de apply não se aplica. Mas o
código sobe sem conferência de revisão.

**Fix:** registrar a decisão no plano, «sem revisão adversarial: script de leitura», ou passar `--revisoes` com a revisão que cobrir o
script.

### IN-07 (carregado do IN-01 do TRACER-1): orçamento de lock por instrução e `anon` com `statement_timeout = 3s` fora do cabeçalho

**File:** `supabase/migrations/20261005000001_p50_helper_candidaturas.sql:33-44` · `scripts/p50_ensaio.cjs:29-34`

**Issue:** O mesmo do TRACER-1, sem mudança. O cabeçalho do ensaio ainda fala só de `authenticated`/`authenticator`.

**Fix:** o mesmo do TRACER-1.

### IN-08 (carregado do IN-04 do TRACER-1): o aviso (c) do Task 1 não diz que as filhas e o avanço de etapa seguem por posse até a expansão

**File:** `50-02-PLAN.md:138`

**Issue:** O mesmo do TRACER-1, sem mudança.

**Fix:** o mesmo do TRACER-1.

### IN-09 (carregado do IN-08 do TRACER-1): `sec05_08_smokes.sql` fica vermelho contra o apply correto até o 50-08

**File:** `50-02-PLAN.md` (ausente) · `supabase/tests/sec05_08_smokes.sql:189, 196`

**Issue:** O mesmo do TRACER-1. O cabeçalho do smoke p50 registra o fato (linhas 134-138), mas o 50-02 não manda pôr isso no SUMMARY.

**Fix:** o mesmo do TRACER-1.

## Verificado e correto (não são achados)

- **Migration intacta.** `20261005000001` não mudou desde o 50-01 (diff vazio desde `e80d9bb6`). O md5 do arquivo hoje é
  `e7383d5d736a75f2b9fe7d862ea4308a`.
- **Desfazer = PROD de hoje, medido só leitura.** PROD tem `roles {public}`, md5 `34060c39f6f61e65613e15a093222691`, PERMISSIVE,
  SELECT e comentário nulo. O texto do desfazer, re-alimentado depois da migration, volta a esse md5 (ensaio do Step 1 d verde). O
  desfazer adulterado em `'rh'` vira `P50D FAIL (pos)` com md5 `2b6cf830…`. A ordem é ALTER POLICY → `DROP … RESTRICT`, sem
  `CASCADE`, e o desfazer cobre todo statement de topo da migration.
- **O ensaio reverso morde.** Compus «migration + exposição (`OR (SELECT auth.uid()) IS NULL`) → sonda → desfazer → sonda» e saiu
  `P50V FAIL (vistas): sem_claims.public.candidaturas,sem_claims.public.v_fila_trabalho,sem_claims.public.v_triagem_panel`. O controle
  sem exposição foi verde, e nada persistiu.
- **Escritas do smoke.** As três estão em envelopes que só terminam por exceção. Os triggers disparados ficam na transação. O advisory
  lock do `anti_lockout` é liberado no rollback da subtransação (medido: 0). A baseline falha alto antes de o `anti_lockout` recusar.
  Não há regra, publicação, `http` nem `dblink`.
- **Enumerador.** A revisão que cobre o HEAD dá `enumeracao ok` (`merge-base --is-ancestor` aceita o próprio commit). Código depois do
  `reviewed_head` ou do pin vira `ALHEIO`. Revisão com crítico é recusada, e o N é ordenado numericamente. Os 17 commits de
  `origin/main..HEAD` hoje se classificam como planning, ou como código da allowlist com assunto `(50-01)`.
- **Contagem do 50-02.** O verify #5 usa `MUTACOES.length` (11) e recusa `PULADA`: não há contagem contra constante.

---

_Reviewed: 2026-10-05T19:05:53Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
