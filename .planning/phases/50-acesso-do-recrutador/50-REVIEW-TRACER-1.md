---
phase: 50-acesso-do-recrutador
reviewed: 2026-10-05T18:21:47Z
depth: deep
diff_base: 81bfab810306c05b1e503ca4a8929d6fb674b466
reviewed_head: e80d9bb665fb67ee5a96c6828981511e05468c69
scope: revisão adversarial bloqueante do tracer (D-12). Escopo: o diff de código do 50-01 (`81bfab81..e80d9bb6 -- . ':!.planning'`, 6 arquivos) e o `50-02-PLAN.md`, lido como o programa que escreve em PROD. Contexto lido, fora da lista revisada — `50-01-PLAN.md`, `50-01-SUMMARY.md`, `50-CONTEXT.md`, `50-RESEARCH.md` §A/§H/§I/Pattern 2/Pitfalls, `p46apply.cjs`, CLAUDE.md. PROD só leitura (`set transaction read only` pelo `p46apply.cjs sql`). Re-executados em modo que aborta, com baseline de persistência antes/depois — `node scripts/p50_mutacoes.cjs` (controle verde; 6/6; nada persistiu), `node scripts/p50_ensaio.cjs --vistas --migracoes=…0001… <smoke>` (vistas=igual, 7/7, 1097 ms) e duas mutações do revisor pelo compositor do ensaio (MX-a, MX-b; ver WR-01/WR-02; nada persistiu, 155 policies de `public` com fingerprint igual). Nada foi aplicado; nada foi enviado.
files_reviewed: 7
files_reviewed_list:
  - supabase/migrations/20261005000001_p50_helper_candidaturas.sql
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p50_vistas_externas.sql
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

# Phase 50: Code Review Report — Tracer (50-01) e o programa de apply (50-02)

**Reviewed:** 2026-10-05T18:21:47Z
**Depth:** deep
**Files Reviewed:** 7, sendo os 6 arquivos de código do 50-01 e o `50-02-PLAN.md`
**Status:** issues_found, com 0 crítico

## Summary

Parti da hipótese de que havia defeito no que vai a PROD. **No objeto que vai a PROD, não achei nenhum.** O helper, o ACL e a policy estão
certos, tanto lidos linha a linha quanto medidos:
- o helper é plpgsql, STABLE, SECURITY DEFINER, `search_path=''`, tudo qualificado, `coalesce(ok,false)`. `anon` é **nomeado** no
  REVOKE, e o GRANT vai só a `authenticated` e `service_role`;
- o disjunto do administrador é reescrito com o mesmo texto-fonte. O PRÉ-PORTÃO captura o desparseado, o PÓS-PORTÃO compara, e o
  smoke (e) fixa o literal;
- a policy vai para `TO authenticated`, sem posse, com `deleted_at IS NULL AND is_rascunho = false` mantidos no ramo `rh`;
- as policies do titular (`candidato_le_propria_candidatura`, `Candidato vê próprias candidaturas`) ficam intocadas.

O que medi em PROD, só leitura:
- `candidaturas` não tem FORCE RLS;
- dono `postgres`, com `rolbypassrls = true`;
- todas as funções de `public` que leem `candidaturas` são de `postgres`. Por isso, tirar `postgres`/PUBLIC da policy (`{public}` →
  `{authenticated}`) não muda nenhuma RPC DEFINER;
- `anon` não tem SELECT em `candidaturas` (`has_table_privilege = false`), então para ele nada muda.

Reproduzi o ensaio e o runner em modo que aborta. Os números do SUMMARY batem: CONTROLE 7/7, M1..M6 mordem nas letras declaradas e
nada persistiu.

**Os defeitos estão no PORTÃO e no programa do 50-02, não na migration.** São dois tipos:

1. **Cláusulas que o portão não vigia.** A expansão (13 policies, 18 funções) vai herdar esse smoke como molde. Duas mutações minhas
   passam **7/7**, medidas: tirar o conjunto do claim `rh` (WR-01) e trocar `ativo = true` por `role = 'administrador'` no helper
   (WR-02). A BORDA também segue vácua (WR-03).
2. **Conferências que não estão no mesmo comando da escrita, ou que ficam vácuas depois do apply** (WR-04..WR-07).

Nenhum dos dois faz o objeto aplicado ficar errado. Por isso nenhum é CRÍTICO. Mas WR-01 e WR-02 mordem a prova que o 50-02 apresenta
como SC1, e convém consertá-los antes da expansão.

## Warnings

### WR-01: o smoke não vigia o conjunto do claim `rh`, que é o único filtro de papel do desenho

**File:** `supabase/migrations/20261005000001_p50_helper_candidaturas.sql:202` (o que fica sem vigia) · `supabase/tests/p50_acesso_recrutador_smoke.sql:421-485` (onde falta a sonda)

**Issue:** O helper é role-agnóstico de propósito: COMMENT, AUTHZ do cabeçalho e escolha 2 do planejador. O cabeçalho delega o filtro de
papel ao conjunto `(SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh'`, porque «todo chamador já exige o claim rh». Só que nenhuma
cláusula impersona uma linha `usuarios_rh` **ativa** com claim **diferente** de `rh`. Testei pelo compositor do ensaio (aborta, nada
persistiu) a mutação MX-a, que tira esse conjunto do ramo `rh` e deixa `(deleted_at IS NULL) AND (is_rascunho = false) AND (SELECT
public.is_active_rh_user())`. Resultado: `sentinela=true smoke50=7/7`, sem nenhum `P50C FAIL`, em 547 ms.

**Failure scenario:** Basta que uma das 13 policies da expansão, que copiam este molde, perca o conjunto do claim. Todo usuário
autenticado com linha `usuarios_rh` ativa passa então a ler tudo, seja qual for o claim:
- `gerente` e `visualizador` (o `check_role` aceita os dois, e o hook emite `gerente`/`visualizador`);
- o titular híbrido, se o hook um dia preferir a linha de candidato.

Mesmo assim, o smoke e o runner ficam verdes, e o 50-02 Task 2 verify #4 imprime «6/6 mutacoes mordem».

**Fix:** acrescentar duas coisas.
- Uma sonda em (d), pareada com o positivo de (c): `sub` = a_ativo com claim `visualizador` e, numa segunda leitura, com
  `app_metadata` sem `role`, devem dar 0 linhas cada. Se a_ativo tiver linha em `candidatos`, comparar com as próprias.
- Uma mutação M7 em `p50_mutacoes.cjs`, que tem de morder na letra (d):

```js
{ id: 'M7', desc: 'ramo rh sem o conjunto do claim', letra: 'd', requer: ['20261005000001'],
  sql: trocar(polCand, "((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND ", '', 'M7') },
```

### WR-02: a negativa do token antigo é confundida — o ativo e o inativo diferem em `role` E em `ativo`

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:135-154, 343-349, 478`

**Issue:** O controle positivo e a negativa não diferem num atributo só:
- **positivo (a_ativo):** linha **administrador** ativa. Não existe recrutador ativo em PROD; o roster medido tem 3 admins ativos e 0
  recrutadores ativos;
- **negativa (a_inativo):** linha **recrutador** inativa.

Assim, (b) e (d) não distinguem «o helper lê `ativo`» de «o helper filtra `role = 'administrador'`». Testei a mutação MX-b, que troca
`AND u.ativo = true` por `AND u.role = 'administrador'` no helper (CREATE OR REPLACE, mesmo ACL). Resultado: `smoke50=7/7`, sem
nenhum `P50C FAIL`, em 540 ms.

**Failure scenario:** Dois helpers errados passam 7/7 no smoke ao vivo, no runner e no catálogo do Task 2:
- um que **ignora `ativo`**, e com isso reabre a janela de 1 h do D-02 para qualquer administrador desativado;
- um que **exclui todo recrutador**, e com isso torna o D-01 inócuo justamente para a população que ele existe para servir.

O smoke também nunca roda o caminho real, `role = 'recrutador'` + claim `rh`. O par que ele roda (linha admin + claim `rh`) é uma
combinação que o hook nunca emite.

**Fix:** duas trocas no smoke e uma mutação nova.
1. Escolher a negativa do token antigo com o **mesmo papel** do positivo: `a_inativo_mesmo_papel` = linha inativa, sem vaga e sem
   `candidatos`, com `role` igual ao de a_ativo. Em PROD existem `aaaaaaaa…` e `4a1fa998` (admin, inativos). Manter o recrutador
   inativo como segunda negativa.
2. Ter um positivo com `role = 'recrutador'` real, sem reativar `recrutador.rh@teste.com` (proibição D-10 do 50-02). Dentro de uma
   subtransação P50C1, `UPDATE public.usuarios_rh SET role = 'recrutador' WHERE user_id = a_ativo`, medir (b)/(c) e reverter.
   Antes, conferir os triggers de `usuarios_rh`.
3. Acrescentar a mutação M8 (`ativo = true` → `role = 'administrador'`), que tem de morder em (b).

### WR-03: BORDA vácua — o filtro de excluída/rascunho do ramo `rh` não é vigiado por nenhuma mutação

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:620-624` · `supabase/migrations/20261005000001_p50_helper_candidaturas.sql:202`

**Issue:** `n_borda = 0` em PROD: 40 candidaturas, todas vivas, medido. Com isso, a condição `n_borda > 0 AND …` nunca julga nada, e
nenhuma mutação tira `deleted_at IS NULL`/`is_rascunho = false`. O SUMMARY registra isso, e o WINDOWS também, como `unmet-truth`. Só
que a semântica é de LGPD (M8): `deleted_at` é a marca de candidatura excluída. Além disso, segundo a RESEARCH (Pattern 2, Shape B), as
10 policies filhas vão depender **deste** filtro por RLS na subconsulta. Se ele regredir, a regressão se propaga.

**Failure scenario:** Uma redefinição futura de `rh_le_candidaturas` perde o filtro, e o recrutador passa a ver candidaturas excluídas
e rascunhos. Mesmo assim, o smoke fica 7/7 e o runner fica 6/6.

**Fix:** semear a população dentro do envelope P50C1, no idioma do p44. Numa subtransação revertida: `UPDATE public.candidaturas SET
is_rascunho = true WHERE id = <uma da vaga_ativa>` e `SET deleted_at = now()` em outra. Depois medir o rh ativo (`n_ativa - 2`, e 0
sobre as semeadas) e o administrador (vê as 2), e rodar `RAISE … 'P50C1'`. Os triggers de `candidaturas` com `net.http`
(`trg_candidaturas_analise`, `trg_notif_confirmacao`, `trg_candidatura_encerrada_a_pedido`) enfileiram pelo pg_net de forma
transacional, mas convém conferir o WHEN de cada um antes. Com a população semeada, acrescentar a mutação M9 (tirar os dois filtros),
que tem de morder em (f).

### WR-04: o `PERSISTIU` do `p50_ensaio.cjs` é vácuo depois do apply e para as migrations 0002–0004

**File:** `scripts/p50_ensaio.cjs:143-152, 262-266`

**Issue:** `lerEstado()` compara duas coisas: as linhas do ledger das versões p50 e a **existência** do helper. Nenhuma das duas mede
persistência de forma útil:
- o ledger: o próprio cabeçalho (linha 18) diz que o `run` nem escreve no ledger, então um ensaio cuja transação commitasse
  deixaria o ledger igual;
- o helper: depois do 50-02 ele existe antes e depois de qualquer ensaio, então a única impressão digital restante fica constante.

**Failure scenario:** Nos planos 50-03+, um ensaio de `0002` (as policies) cujo corpo, por defeito do compositor ou do transporte,
commitasse deixaria 12 policies alargadas em PROD. Mesmo assim, o CLI imprime `ENSAIO VERDE` sem `PERSISTIU`, contrariando a promessa
do cabeçalho («qualquer diferença é `PERSISTIU`»).

**Fix:** mover o `capturar()` do `p50_mutacoes.cjs:129-137` para o `p50_ensaio.cjs`, exportá-lo e usá-lo nos dois runners. Estendê-lo
com o fingerprint de **todas** as policies de `public` (não só as que casam a forma) e com o `md5(prosrc)||proacl` das funções que as
migrations da fase tocam (descobertas lendo os `CREATE`/`ALTER` das MIGS prefixadas).

### WR-05: o runner de mutações pula a checagem «nada persistiu» justamente nas saídas anormais

**File:** `scripts/p50_mutacoes.cjs:147, 164-167, 195` (saídas) · `:204-207` (a checagem que elas pulam)

**Issue:** `rodarOuSair` (timeout, exit 3), `CONTROLE VERMELHO` e `SUSPEITA DE INSTRUMENTO` chamam `process.exit` antes de
`capturar()`. No 50-02 Task 2 (verify #4), o runner roda `CREATE OR REPLACE` do helper, `GRANT … TO anon` e `ALTER POLICY` contra os
objetos **vivos**. A garantia de que nada disso persiste vem só do sentinela.

**Failure scenario:** Uma execução termina em `LOCK TIMEOUT`, ou em `SUSPEITA DE INSTRUMENTO` porque o harness quebrou. Exatamente
nesse caso, o operador fica sem a evidência de que o helper e a policy ao vivo seguem iguais à baseline. A instrução do plano é «não
concluir nada», mas não há leitura que diga se algo ficou.

**Fix:** centralizar a saída numa função que sempre captura e compara antes de sair:
```js
function sair(msg, codigo = 1) {
  try { const d = capturar(); if (JSON.stringify(antes) !== JSON.stringify(d)) console.error(`PERSISTIU: ${JSON.stringify({ antes, depois: d })}`); else console.error('leitura so-leitura igual a baseline'); } catch (e) { console.error(`PERSISTENCIA NAO MEDIDA: ${e.message}`); }
  console.error(msg); process.exit(codigo);
}
```
O `antes` precisa ser capturado antes da primeira chamada que pode sair. As chamadas de `sair` feitas na carga do módulo, nas âncoras
(linhas 59-70), acontecem antes da baseline e podem continuar sem a captura.

### WR-06: o comando de apply e o de push não amarram o código que vai a PROD ao código revisado/aplicado

**File:** `.planning/phases/50-acesso-do-recrutador/50-02-PLAN.md:148, 156, 160, 190`

**Issue:** Faltam três amarrações:
1. **Pin × revisão.** O Step 0 fixa `refs/gsd/50-02/sha` = o HEAD de **agora**. O comando de apply (linha 160) confere HEAD = pin e a
   árvore limpa contra o pin, mas **não** confere que o pin tem o código do `reviewed_head`. Essa conferência está só no verify do
   Task 1, que é outro comando, rodado antes. Um commit de código entre os dois passa a ir a PROD sem revisão. A única barreira é a
   confirmação (b), que é texto.
2. **O aplicador fora da checagem.** A pré-condição (linha 148) lista `p46apply.cjs efdeploy.cjs`, mas o comando só checa `supabase
   src scripts`. O aplicador, o arquivo que escreve, fica fora da checagem de árvore limpa.
3. **Push × apply.** No Task 3 (linha 190), «o código enviado é o aplicado» (`git diff --quiet refs/gsd/50-02/sha HEAD -- supabase src
   scripts`) é um comando separado do push. O enumerador aceita um `fix(50-01): …` que mude a migration depois do apply, porque o
   caminho está na allowlist e o assunto casa. O verify (linha 193) só exige que o pin esteja contido em `origin/main`.

**Failure scenario:** Um `fix(50-01)` na migration ou no smoke, commitado depois do apply (rodada de conserto, outra janela), sobe
para `main`. O repositório deixa de ser igual a PROD, e o próximo `md5(statements[1])` diverge do arquivo.

**Fix:** pôr as conferências no MESMO comando da escrita.
```sh
# Step 2, antes de `node p46apply.cjs migrate`:
RH=$(awk 'NR==1{next} /^---$/{exit} {print}' .planning/phases/50-acesso-do-recrutador/50-REVIEW-TRACER-$N.md | sed -nE 's/^reviewed_head: *([0-9a-f]{7,40}) *$/\1/p') && test -n "$RH" && git diff --quiet "$RH" "$S" -- . ':!.planning' && git diff --quiet "$S" -- p46apply.cjs && test -z "$(git status --porcelain -- p46apply.cjs)" && …
# Task 3, antes de `node scripts/p50_enumera.cjs`:
git diff --quiet "$(git rev-parse refs/gsd/50-02/sha)" "$S" -- supabase src scripts p46apply.cjs && …
```

### WR-07: a comparação ao vivo das vistas tem uma saída que a torna incapaz de falhar, e não tem saída para tráfego legítimo

**File:** `.planning/phases/50-acesso-do-recrutador/50-02-PLAN.md:158, 169-170`

**Issue:** A captura «antes» (Step 1) e a «depois» (verify #3) são de transações diferentes, com o apply entre elas. O `fails_when`
manda, se a relação que mudou for uma em que o candidato escreveu, «re-run both captures once». Depois do apply, porém, refazer a
captura «antes» produz uma captura **pós-apply**: comparar depois com depois dá igual por construção. É o «portão que você tornou
incapaz de falhar» (CLAUDE.md §Portões). Na direção oposta, há tráfego legítimo que não é do candidato: `anon`, `sem_claims` e
`rh_inativo` veem as vagas **ativas** (2 hoje), e o RH ativar ou desativar uma vaga no intervalo vira `VISTA EXTERNA MUDOU:
anon.public.vagas`. Para isso o plano não prescreve caminho, só PARAR e o desfazer com checkpoint.

**Failure scenario:** Um vermelho legítimo é «resolvido» pela re-captura e passa vácuo. Ou um vermelho por tráfego leva a um desfazer
desnecessário de uma policy que todas as telas de RH leem.

**Fix:** tirar a re-captura do «antes». Se houver diferença, imprimir as relações e julgar pela população (a relação mudou como
postgres também?), sem refazer nada. Para a prova D-12 ao vivo, usar um «ensaio reverso» que aborta. Na mesma requisição: sonda → o
**desfazer** (ALTER POLICY de volta para a qual/papéis antigos + REVOKE) → sonda → compara → sentinela. Isso dá antes × depois na
mesma transação, contra o estado vivo, sem janela de tráfego.

### WR-08: as negativas de `anon` passam pelo ACL da tabela ou por erro de OUTRA policy — a sonda é cega para `anon` em 11 de 17 relações

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:458-462, 481` · `supabase/tests/p50_vistas_externas.sql:150-158`

**Issue:** O motivo do 42501 varia por relação:
- **`candidaturas`:** `anon` recebe 42501 porque não tem SELECT na tabela (medido: `has_table_privilege('anon','public.candidaturas',
  'SELECT') = false`). A policy não entra nisso;
- **`decisao_final`, `entrevista_guias`, `historico_candidatura`, `scores_candidato`:** `anon` **tem** SELECT (medido), e o 42501 vem
  da subconsulta a `candidatos` de uma policy de titular (RESEARCH §I);
- **as views `v_fila_trabalho`/`v_triagem_panel`:** `anon` também tem SELECT nelas.

A sonda grava `e:42501` antes e depois e acha igual. Para `anon`, então, a «prova de que nada abriu» é uma negativa sem positivo, e
mascarada por erro alheio. A mordida ad hoc `USING (true)` do próprio 50-01 confirma: ela reprovou candidato, rh_inativo e sem_claims,
e **não** `anon` (SUMMARY, «Vistas (Task 2)»). Para o tracer não há exposição, porque `anon` não lê `candidaturas` de jeito nenhum e o
(f) fixa `{authenticated}`.

**Failure scenario:** Na expansão (9 policies `{public}` em tabelas onde `anon` tem SELECT), basta que a policy de titular deixe de
errar, por exemplo pelo conserto do `42-anon-execute-definer-sistemico`. Uma policy alargada que tenha ficado `{public}` abre para
`anon`, e a sonda segue `vistas=igual`.

**Fix:** acrescentar à sonda, por forma, a lista de policies **aplicáveis a `anon`** (`roles` contendo `anon` ou `public`) de cada
relação do conjunto, com o fingerprint `md5(qual|with_check)||roles`, comparada antes × depois. Acrescentar também `has_table_privilege
('anon', rel, 'SELECT')` por relação. Gravar `e:42501` como «cego» na saída, e não como «igual».

## Info

### IN-01: o orçamento de lock é por INSTRUÇÃO; o tempo total de posse não tem teto, e `anon` tem `statement_timeout = 3s` (não medido no cabeçalho)

**File:** `supabase/migrations/20261005000001_p50_helper_candidaturas.sql:33, 36-44` · `scripts/p50_ensaio.cjs:26-31`

**Issue:** Dois pontos:
- **Teto por instrução, não por posse.** `statement_timeout` limita cada instrução (PG ≥ 13). O ensaio `--vistas` tem cerca de 15
  instruções depois do `ALTER POLICY`, então a posse do `AccessExclusiveLock` pode chegar, no pior caso, a N × 5 s. A frase «abaixo dos
  8 s» vale por instrução, não para o tempo em que a fila de `candidaturas` fica parada. Os 514–1097 ms medidos estão longe disso.
- **O papel `anon` ficou fora da medição.** Medi `pg_roles.rolconfig`: `anon` = `statement_timeout=3s` (e `authenticator` também tem
  `lock_timeout=8s`), e o cabeçalho registra só `authenticated`/`authenticator`. Há 16 RPCs executáveis por `anon` que leem
  `candidaturas` (ex.: `submit_candidatura_atomic`, `get_avaliacao_status`). Uma chamada anônima que espere 3 s atrás do lock cai com
  57014.

**Fix:** registrar `anon=3s` no cabeçalho e considerar `lock_timeout = '2s'`. Imprimir no ensaio o tempo entre o `ALTER POLICY` e o
fim, e não só o tempo total da requisição.

### IN-02: a sonda diz «nenhuma lista literal de objetos», mas tem uma; a população da varredura já é 340

**File:** `supabase/tests/p50_vistas_externas.sql:15, 119` · `supabase/tests/p50_acesso_recrutador_smoke.sql:85`

**Issue:** `c.relname IN ('usuarios_rh', 'vagas')` casa o padrão do CLAUDE.md. É ESCOPO, mas o cabeçalho afirma o contrário. Rodei a
varredura hoje: **340** linhas. As 4 a mais que as 336 do cabeçalho do smoke são dos próprios arquivos p50: smoke:77, 87 e 91, que são
comentários, e vistas:119.

**Fix:** trocar o cabeçalho para «(3) lista literal deliberada — escopo» e atualizar a população.

### IN-03: o desfazer não guarda o texto antigo da qual, e não proíbe CASCADE

**File:** `.planning/phases/50-acesso-do-recrutador/50-02-PLAN.md:103-107`

**Issue:** São dois buracos:
- **O texto antigo some.** Depois do apply, o catálogo só tem a policy nova. O plano guarda apenas o md5 antigo (`34060c39…`), e o
  texto-fonte está espalhado entre a RESEARCH (Shape A + filtros) e as migrations antigas (`20260706110004`, `20260709000002`).
- **A ordem é certa, mas não está escrita como regra.** O plano lista ALTER POLICY antes de DROP FUNCTION, mas não diz que essa
  ordem é obrigatória. Um `DROP FUNCTION … CASCADE` derrubaria `rh_le_candidaturas`, e RH e administrador perderiam toda a leitura.

**Fix:** no Step 1, gravar no SUMMARY o `qual` antigo verbatim, lido ao vivo. Escrever o desfazer com PÓS-PORTÃO
`md5 = 34060c39f6f61e65613e15a093222691 AND roles = '{public}'` e `DROP FUNCTION … RESTRICT` explícito. Registrar também que, depois
do 0002, o desfazer do tracer sozinho deixa de existir, porque outras policies passam a depender do helper.

### IN-04: estado intermediário em PROD entre o 50-02 e a expansão

**File:** `.planning/phases/50-acesso-do-recrutador/50-02-PLAN.md:128`

**Issue:** Depois do tracer, um recrutador ativo vê as candidaturas, mas as filhas continuam com posse:
- `scores_candidato`, `decisao_final`, `historico_candidatura` e as demais Shape B;
- `rh_avanca_etapa`, a policy de UPDATE.

O resultado são telas parciais e um avanço de etapa que vira no-op silencioso: o PostgREST devolve 200 com 0 linhas. Hoje não há
recrutador ativo, então isso é latente.

**Fix:** acrescentar uma linha ao aviso (c): «até a expansão, scores/decisões/histórico e o avanço de etapa seguem por posse».

### IN-05: (c) e (e) comparam contagens de instruções diferentes, mas o diagnóstico acusa a policy

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:406-410, 534-537`

**Issue:** Em READ COMMITTED, uma candidatura que entre entre o baseline e (c) dá `P50C FAIL (c): rh ativo … viu …`. O (z) tem o
diagnóstico certo («tráfego concorrente: rodar de novo»), mas (c) e (e) não têm.

**Fix:** acrescentar a mesma orientação às mensagens de (c) e (e).

### IN-06: a cláusula `deleted_at IS NULL` do helper também não tem população

**File:** `supabase/migrations/20261005000001_p50_helper_candidaturas.sql:181`

**Issue:** O roster medido tem 7 linhas e nenhuma com `deleted_at` preenchido. Uma mutação que tire `u.deleted_at IS NULL` passa.

**Fix:** no mesmo envelope do WR-02, `UPDATE usuarios_rh SET deleted_at = now() WHERE user_id = a_ativo` numa subtransação revertida,
e então (b) tem de dar false.

### IN-07: o «antes» do SC1 no Step 1 não tem comando, e o log das vistas «antes» não confere o código de saída

**File:** `.planning/phases/50-acesso-do-recrutador/50-02-PLAN.md:158`

**Issue:** A contagem «esperada 0 hoje» do rh ativo sem vaga está só em prosa. O `run` da sonda redireciona para log sem `|| exit`.

**Fix:** dar o comando literal (impersonação em `set transaction read only`) e encadear `&& echo vistas-antes-ok`.

### IN-08: `sec05_08_smokes.sql` fica vermelho contra trabalho correto do apply até o 50-08

**File:** `.planning/phases/50-acesso-do-recrutador/50-02-PLAN.md` (ausente) · `supabase/tests/sec05_08_smokes.sql:189,196`

**Issue:** A premissa «rh não-dono lê 0» é invertida pelo D-01. Quem rodar esse smoke entre o 50-02 e o 50-08 recebe um diagnóstico
falso.

**Fix:** registrar no SUMMARY do 50-02 que, até o 50-08, o vermelho do `sec05_08` é esperado.

### IN-09: na sonda, um `55P03` vira «exposição»

**File:** `supabase/tests/p50_vistas_externas.sql:156-158` · `scripts/p50_ensaio.cjs:201-202`

**Issue:** O `WHEN OTHERS` grava `e:55P03` como se fosse uma leitura. A `P50V FAIL (vistas)` resultante não traz o SQLSTATE, então o
`rodar` classifica como VERMELHO, e não como LOCK TIMEOUT. É um falso diagnóstico de exposição.

**Fix:** `WHEN lock_not_available THEN RAISE;` antes do `WHEN OTHERS`.

## Verificado e correto (não são achados)

- Pela RESEARCH §I e pelo `check_role`, o hook emite `rh` só para `recrutador` ativo. `gerente`/`visualizador` não entram em ramo
  nenhum, enquanto o conjunto do claim existir (ver WR-01).
- `candidato_id` é NOT NULL, com 0 nulos. A negativa `NOT (candidato_id = ANY …)` de (d) não esconde linha.
- O ensaio aborta de fato: `FIM` sempre levanta, e o texto `ENSAIO_P50_TERMINOU smoke50=` não aparece literal no corpo, porque é
  montado por `%`. Então um eco do SQL num erro não forja o sentinela.
- O baseline de persistência do runner é capturado na execução: ledger com md5, helper com `md5(prosrc)`/ACL e policies por forma.
- O enumerador classifica por arquivos, recusa merge e intervalo vazio, e o push vai por sha, sem force.
- A ordem do 50-02 está certa: pin → antes → apply (PRÉ/PÓS-PORTÃO na mesma transação, ledger na mesma requisição, md5 lido de
  volta) → depois → push (enumeração antes, `git push origin <sha>:refs/heads/main`). Os buracos estão nas conferências: WR-06 e WR-07.

---

_Reviewed: 2026-10-05T18:21:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
