---
phase: 46-purga-autom-tica-dry-run-live
plan: 04
reviewed: 2026-08-22
depth: deep
reviewer: gsd-code-reviewer (adversarial, portão de fase destrutiva do M8, item 2)
status: findings
veredito: REPROVADO — NÃO APLICAR
files_reviewed: 5
files_reviewed_list:
  - supabase/migrations/20260823000006_p46_guard_purga.sql
  - supabase/migrations/20260823000007_p46_sweep_dry_run.sql
  - supabase/migrations/20260823000008_p46_guard_plano.sql
  - supabase/tests/p46_purga_smoke.sql
  - supabase/tests/p45_motor_exclusao_smoke.sql
findings:
  blocker: 2
  high: 4
  medium: 4
  low: 2
  total: 12
---

# Phase 46 / Plano 46-04 — Code Review BLOQUEANTE

**Veredito: REPROVADO.** Duas descobertas de nível BLOCKER. A primeira **quebra em produção
o caminho de exclusão do titular da Phase 45** no instante do apply, e o argumento escrito
no cabeçalho que diz que isso não acontece está **factualmente errado**. A segunda mostra
que o 4º ramo, embora com o predicado *interno* correto, é um `OR` **não correlacionado com
o chamador** — o estado que ele exige autoriza **qualquer** chamador que tenha `EXECUTE`,
não apenas o cron.

O que **passou** na revisão, e passou bem: a forma NULL-safe dos predicados novos
(`EXISTS` correlacionado, precedência de `AND`/`OR` correta, zero negação por conjunto,
falha FECHADA em todos os lados NULL — item B do escopo, limpo); a exigência do **ALVO**
em `plano_exclusao_titular` (item D, confirmado por leitura em `:338`); o bloco que
**ABORTA** o apply e cobre `retencao_hold` (item E, `RAISE EXCEPTION` real, não `NOTICE`);
os dois re-pins de md5 **sem afrouxamento**, com a rede estrutural crescendo de 2 para 4
metades (item F, limpo); e as asserções novas com portões de **não-vacuidade explícitos**
(item H, limpo — `elegiveis >= 3`, `itens > 0`, e duas aceitações contra quatro recusas).

O argumento do executor sobre `plano_exclusao_titular` ser **UM** predicado (item C) **se
sustenta** — ver §Análise C.

---

## BLOCKERS

### BL-01 — As duas migrations REVOGAM de `authenticated` o `EXECUTE` vivo, e derrubam o direito de exclusão do titular em PROD

**Arquivos:**
- `supabase/migrations/20260823000006_p46_guard_purga.sql:886-888`
- `supabase/migrations/20260823000008_p46_guard_plano.sql:631-633`

**O código:**
```sql
REVOKE ALL ON FUNCTION public.anonimizar_candidato(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO service_role;
```
(idem para `plano_exclusao_titular(uuid)` em `…008:631-633`)

**O estado vivo que isso destrói.** `supabase/migrations/20260805000009_p45_claims_do_titular.sql`
está **aplicada desde 2026-08-05** e concede exatamente o que estas linhas removem:

```
20260805000009:174-175   REVOKE ALL ON FUNCTION public.plano_exclusao_titular(uuid) FROM PUBLIC, anon;
                         GRANT EXECUTE ON FUNCTION public.plano_exclusao_titular(uuid) TO authenticated;
20260805000009:179-180   REVOKE ALL ON FUNCTION public.anonimizar_candidato(uuid, boolean) FROM PUBLIC, anon;
                         GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO authenticated;
```

**Cenário concreto (entrada/estado → consequência):**

1. Estado hoje: `authenticated=X` em ambas as funções (grant de 2026-08-05, exercitado em
   PROD em 2026-08-22).
2. O orquestrador aplica `20260823000006` e `20260823000008` em 2026-08-23. `CREATE OR
   REPLACE` **preserva** o ACL (o próprio cabeçalho de `…006:871` diz isso); em seguida o
   `REVOKE ALL … FROM authenticated` **executa** e remove o grant. Não há re-`GRANT`.
3. Um titular clica em "apagar meus dados". A EF `executar-direito-titular` usa o terceiro
   client (service key **+** `Authorization` do titular) — e o PostgREST deriva o papel do
   **mesmo JWT**, então a chamada chega como **`authenticated`**.
4. Resultado: `42501 permission denied for function plano_exclusao_titular`. O motor não
   roda. **É o `DI-45-10-01` de volta**, o defeito que a `20260805000009` existe para ter
   consertado, agora reintroduzido por uma migration cujo escopo negativo declara não tocar
   em nada.

**O argumento escrito no arquivo está errado, e é ele que fez o defeito passar.**
`…006:879-885` afirma:

> "a migration `20260805000009` (plano 45-12) concede EXECUTE a `authenticated` **DEPOIS
> desta linha na ordem de aplicacao do repositorio** … Este arquivo **nao altera aquele
> grant** e nao o revoga na pratica — ele apenas reafirma a linha de base."

Ordem **do repositório** não é ordem **de apply**. Numa reconstrução do zero a afirmação
seria verdadeira; num apply incremental contra o banco vivo — que é o único apply que vai
acontecer — a `…006` roda **depois** da `…009`, e revoga. `…008:116-118` repete o mesmo erro
com outra formulação ("reemitido idêntico ao vivo"): o ACL vivo **não** é o do arquivo
`20260805000005`, porque a `…009` o emendou.

**O próprio `COMMENT` da migration se contradiz.** `…006:1233-1237` declara, dentro do banco,
que "a migration 20260805000009 concede EXECUTE a `authenticated`" — descrevendo um estado
que a linha 887 do mesmo arquivo acaba de destruir.

**O portão já sabe disso, e vai ficar vermelho.** `supabase/tests/p45_motor_exclusao_smoke.sql:1439-1441`
lista `plano_exclusao_titular` e `anonimizar_candidato` em `v_concede_auth`, e `:1512` reprova
com: *"NAO concede EXECUTE a authenticated … sem o GRANT da migration 20260805000009 … o motor
NAO RODA (DI-45-10-01)"*. A mesma assertiva avisa, em `:1514`, que revogar "para consertar um
vermelho anterior" é o conserto na direção errada (45-REVIEW-4 / CR-02).

**Fix (uma das duas):**

```sql
-- Opção A (preferida) — remover o bloco de ACL das duas migrations. `CREATE OR REPLACE`
-- não repõe grants; o ACL vivo já é o correto e não precisa ser tocado.

-- Opção B — manter o REVOKE e RECOMPOR a linha de base REAL, logo abaixo dele:
REVOKE ALL ON FUNCTION public.anonimizar_candidato(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO authenticated;  -- 20260805000009 / DI-45-10-01
```

Em qualquer das duas, o comentário `…006:879-885` e `…008:116-118` tem de ser **corrigido**,
não preservado: ele é a razão documentada pela qual o defeito não foi visto.

---

### BL-02 — O 4º ramo não é correlacionado com o CHAMADOR: enquanto houver item aberto em `live`, QUALQUER chamador com `EXECUTE` destrói aquele titular

**Arquivos:** `20260823000006:368-371` (metade a), `:421-436` (metade b), `:479-492` (metade c);
espelho em `20260823000008:359-362` e `:408-414`.

**O predicado interno está certo. O que está errado é onde ele foi ligado.** As três metades
do guard ganharam a alternativa como um `OR` puro sobre um estado **global**:

```sql
-- (b), caminho DESTRUTIVO — 20260823000006:430-435
IF v_role IS DISTINCT FROM 'administrador'
   AND v_dono IS DISTINCT FROM v_uid
   AND NOT v_purga_live THEN            -- ← basta v_purga_live ser TRUE
  RAISE EXCEPTION 'FORBIDDEN: …' USING ERRCODE = '42501';
END IF;

-- (c), guard de INTENÇÃO — 20260823000006:480
IF NOT v_purga_live AND NOT EXISTS ( … solicitacoes_dados … ) THEN
```

`v_purga_live` **não menciona o chamador em lugar nenhum**. Ele é uma propriedade do
`p_candidato_id` e do cerco. Logo: enquanto ele for `TRUE`, as metades (b) **e** (c) — as
duas únicas que restringem a destruição — ficam **desligadas para todo mundo**.

**Cenário concreto (entrada/estado → consequência):**

1. Estado: `config_purga.modo = 'live'`; execução em `situacao='executando'` com
   `modo_vigente='live'`; item aberto (`concluido_em IS NULL`) para o candidato `X`.
   No desenho do 46-06 essa janela é exatamente o intervalo do dispatch assíncrono à EF.
2. Um usuário logado qualquer — inclusive um **`rh`**, inclusive um **candidato** — chama
   por PostgREST: `POST /rest/v1/rpc/anonimizar_candidato {"p_candidato_id":"<X>","p_dry_run":false}`.
   Ele alcança a função pelo `GRANT` a `authenticated` da `20260805000009` (o mesmo grant que
   BL-01 revoga por acidente; consertar BL-01 **reabre** este caminho).
3. Guard: (a) `v_uid` não é nulo → passa. (b) `role<>'administrador'` T, `dono<>uid` T,
   `NOT v_purga_live` **F** → **não levanta**. (c) `NOT v_purga_live` **F** → **não levanta**.
4. Consequência: as doze mutações destrutivas COMMITAM. E não é "ele seria apagado mesmo":
   a chamada roda **fora da ordem Storage → Postgres → Auth** que a metade (c) existe para
   impor. `candidatos.user_id` vira NULL, e o currículo do `X` fica **órfão no bucket para
   sempre** — sem PITR (D-45-10) e com o Storage fora de todo backup, irrecuperável **por
   qualquer meio**. É o modo de falha SILENCIOSO que a SONDA 2 mediu, e é o **CR-01, cenário
   2** (o `rh` destruindo PII) reaberto pela duração da janela.

**O cabeçalho promete uma coisa que o código não escreve.** `…006:360-363` diz, na letra:

> "sessao nula e aceitavel **SE E SOMENTE SE** existir, AGORA, item vivo de purga para ESTE
> `p_candidato_id` …"

O "se e somente se" está escrito só em prosa. No código, a alternativa também vale para
**sessão NÃO-nula** — e é precisamente aí que ela deixa de ser um mecanismo do cron e vira
uma janela de privilégio para papéis de cliente.

**Por que nenhuma asserção pega isto:** `p46_purga_smoke.sql` **nunca carimba
`request.jwt.claims`** — decisão de higiene correta e celebrada na §Lessons do SUMMARY, mas
que tem o efeito colateral de tornar **inobservável** o único caso que importa aqui. As seis
chamadas de (o) rodam todas com `auth.uid()` NULO. O caso "chamador COM sessão, sob item
aberto em live, intenção destrutiva" **não existe no smoke**.

**Fix — correlacionar a alternativa com o chamador, escrevendo o "se e somente se" que o
cabeçalho já promete:**

```sql
  -- (p.1) e (p.2): o ramo da purga só existe para um chamador SEM SESSÃO — que é o
  -- único chamador que o cron pode ser. Um chamador COM claim tem de continuar sendo
  -- julgado por (b) e por (c), como sempre foi.
  SELECT (v_uid IS NULL) AND EXISTS (
    SELECT 1
      FROM public.purga_execucao_itens i
      JOIN public.purga_execucoes e ON e.id = i.execucao_id
      CROSS JOIN public.config_purga cp
     WHERE i.candidato_id  = p_candidato_id
       AND i.concluido_em IS NULL
       AND e.situacao      = 'executando'
       AND e.modo_vigente  = 'live'
       AND cp.modo         = 'live'
  ) INTO v_purga_live;
```

A mesma emenda em `v_purga_dry` (`…006:303-313`) e em `v_por_purga` (`…008:333-343`).
Compatível com **todos** os testes existentes: o cron, a EF de service-role sem
`Authorization` de usuário e o próprio smoke têm `auth.uid()` NULO.

**Asserção nova obrigatória junto do fix** (sem ela o conserto não é observável):
em `p46_purga_smoke.sql`, um caso `(o.6)` que carimba `request.jwt.claims` com um `sub`
qualquer e papel `rh`, sob o **mesmo estado** de (o.2a) mas com o cerco em `live`, e exige
`42501`.

---

## HIGH

### HI-01 — A ordem de apply declarada está errada: `007` depende de `008`, não só de `006`

**Arquivos:** `20260823000008:176-179` (declara `006 → 007 → 008`),
`20260823000006:149-157` (declara `001..5 → 006 → 007`, **não menciona `008`**),
`20260823000007:114` (declara `006 → 007`, **não menciona `008`**).

**Confirmado por leitura.** `20260823000007:306` chama `public.anonimizar_candidato(r.candidato_id, true)`.
`20260823000006:499` (PASSO 0, dentro do corpo do motor, **depois** do guard) executa
`v_plano := public.plano_exclusao_titular(p_candidato_id);`. Sem `20260823000008` aplicada,
o guard **antigo** daquela função (`20260805000005:201-253`, metade (a): `v_uid IS NULL →
42501`) recusa o cron.

**Cenário:** aplicar na ordem declarada `006 → 007 → 008` produz uma janela em que **todo
titular** vira `desfecho_postgres='falha'` com `relato_dry_run` nulo — exatamente o desfecho
que o próprio cabeçalho de `…007:22-26` descreve como consequência de aplicar `007` cedo
demais, mas atribuindo-o à migration errada. A asserção (b) reprova
(`p46_purga_smoke.sql:1150`) com uma mensagem que aponta a hipótese nº 1 para `…006` —
diagnóstico falso, o modo de falha que esta fase inteira cataloga.

**Fix:** ordem correta **`006 → 008 → 007`**. Corrigir as três seções `(4) ORDEM DE
ENTREGA` para dizerem a mesma coisa — hoje as três dizem coisas diferentes e a única que é
explícita está errada.

### HI-02 — O bloco que aborta o apply pergunta só por `authenticated`, e ignora `anon` e policies sem `TO`

**Arquivo:** `20260823000006:994`, `:1004`, `:1020`.

```sql
IF has_table_privilege('authenticated', 'public.' || r_alvo.tabela, v_verbo) THEN
…
IF has_column_privilege('authenticated', 'public.' || r_alvo.tabela, v_col, 'UPDATE') THEN
…
AND ('authenticated' = ANY (p.roles) OR 'public' = ANY (p.roles))
```

O `REVOKE` das próprias funções deste plano **nomeia `anon`** — porque a lição medida deste
projeto (`20260801000002`, P42-06, e o comentário em `…006:874-877`) é que o `pg_default_acl`
deste schema concede a `anon` como grant **direto**. O bloco de catálogo, que é o mecanismo
que transforma o pressuposto em asserção, **não aplica a mesma lição**.

**Cenário:** alguém cria amanhã `CREATE POLICY … ON public.purga_execucao_itens FOR INSERT
TO anon USING (true)`. Nem o `has_table_privilege('authenticated', …)` nem
`'authenticated' = ANY (p.roles)` casam. O apply **não aborta**, o `NOTICE` continua sendo
emitido, e o ramo que "quem cria um item aberto ESCOLHE quem será destruído" acabou de ficar
aberto a `anon` — sem que nenhum portão fale.

**Fix:**
```sql
FOREACH v_papel IN ARRAY ARRAY['authenticated','anon'] LOOP
  FOREACH v_verbo IN ARRAY r_alvo.verbos LOOP
    IF has_table_privilege(v_papel, 'public.' || r_alvo.tabela, v_verbo) THEN v_priv := true; END IF;
  END LOOP;
  …
END LOOP;
…
AND (p.roles && ARRAY['authenticated','anon','public']::name[])
```

### HI-03 — Nada limita no TEMPO o estado que autoriza a destruição: uma EF que morre deixa a porta aberta para sempre

**Arquivo:** `20260823000006:324-334` (e o espelho em `…008:333-343`).

O predicado exige `i.concluido_em IS NULL` **e** `e.situacao='executando'` — e nada mais.
Não há limite superior de idade (`e.iniciada_em`, `i.criado_em`).

**Cenário — é exatamente a pergunta "o que acontece se a EF morrer entre marcar o item e
mutar":** no desenho do 46-06 o item é aberto pelo Postgres e fechado **assincronamente**
pela EF `purgar-retencao`. Se a EF morre (deploy, timeout, `at-most-once` do `pg_net`), o
item permanece aberto e a execução permanece `executando` **indefinidamente**. Consequências
acumuladas:

- `v_purga_live` fica `TRUE` para aquele `candidato_id` **para sempre** — uma autorização
  destrutiva *standing*, que é exatamente a categoria que D-46-18 recusou ao rejeitar a
  Saída A. Somada a BL-02, é uma porta permanente para qualquer `authenticated`.
- O claim anti-sobreposição de `…007:208-213` **exclui** aquele titular de todas as
  varreduras seguintes: ele nunca mais é purgado, e ninguém é avisado.

A rede (C3/iii) do smoke (`p45_motor_exclusao_smoke.sql:1746-1748`) argumenta que
`concluido_em IS NULL` impede que "um vestígio autorize para sempre". Impede o vestígio
*fechado*; não impede o item *nunca fechado*, que é o caso real.

**Fix:** limitar a janela dentro do predicado, nas duas metades e nas duas funções:
```sql
       AND e.situacao      = 'executando'
       AND e.iniciada_em   > pg_catalog.now() - interval '1 hour'   -- a autorização EXPIRA
```
e, no 46-06, uma varredura de reconciliação que feche execuções `executando` mais velhas que
a janela com `situacao='abortada'`. **Deve ser fechado antes do 46-06**, não depois.

### HI-04 — A asserção (o.5) reprova trabalho CORRETO com diagnóstico falso, na segunda terminação que a migration irmã trata como contrato

**Arquivo:** `supabase/tests/p46_purga_smoke.sql:949-954` e `:1388-1390`.

```sql
BEGIN
  PERFORM public.anonimizar_candidato(v_pos1, true);
  v_o_pos_st := 'SEM-EXCECAO';
EXCEPTION WHEN OTHERS THEN
  v_o_pos_st := SQLSTATE;
END;
…
IF v_o_pos_st IS DISTINCT FROM 'P45DR' THEN
  RAISE EXCEPTION 'P46P FAIL (o.5): … [SEM-EXCECAO] significa que o terminador do motor
    sumiu e a transacao teria COMMITADO o corpo destrutivo';
```

`20260823000007:313-324` — escrito pelo **mesmo plano, no mesmo dia** — documenta que o
dry-run tem **DUAS** terminações contratadas (WR-05): `P45DR` numa linha viva, e **retorno
normal** com `resultado='ja_anonimizado'` numa linha que já é tombstone; e implementa a
discriminação com `SELECT … INTO` justamente para não "transformar trabalho correto em
defeito, todo dia". O smoke usa `PERFORM` e trata o retorno normal como o pior defeito
possível.

**Cenário:** depois do primeiro `live`, `pos1` continua com linha em `candidatos` (ERASE-08),
continua além da janela e continua numa etapa da allowlist — e volta a ser selecionado. Nesse
dia (o.5) fica **vermelha** dizendo *"o terminador do motor sumiu e a transacao teria
COMMITADO o corpo destrutivo"*. É falso, e é o padrão nomeado em `CLAUDE.md §Portões: varra
pela FORMA` — "reprova trabalho correto, com diagnóstico FALSO".

**Fix:** espelhar a discriminação do `…007`:
```sql
DECLARE v_o_pos_ret jsonb;
…
BEGIN
  SELECT public.anonimizar_candidato(v_pos1, true) INTO v_o_pos_ret;
  v_o_pos_st := CASE WHEN (v_o_pos_ret ->> 'resultado') = 'ja_anonimizado'
                     THEN 'P45DR-WR05' ELSE 'SEM-EXCECAO' END;
EXCEPTION WHEN OTHERS THEN
  v_o_pos_st := SQLSTATE;
END;
…
IF v_o_pos_st NOT IN ('P45DR','P45DR-WR05') THEN  -- as DUAS terminações contratadas
```

---

## MEDIUM

### ME-01 — `purga_execucoes.modo_vigente` não tem CHECK, e o guard destrutivo lê essa coluna

`supabase/migrations/20260823000002_p46_ledger.sql:138` — `modo_vigente text NOT NULL`, sem
domínio. `20260823000006:332` decide destruição sobre `e.modo_vigente = 'live'`.
`20260823000007:168` grava `'ausente'`, que não é um modo. Não há escalação (a igualdade com
`'live'` é literal e o par com `config_purga.modo` é cumulativo), mas uma coluna que autoriza
destruição irreversível e aceita qualquer texto é uma superfície sem contrato.
**Fix:** `ALTER TABLE public.purga_execucoes ADD CONSTRAINT ck_purga_execucoes_modo
CHECK (modo_vigente IN ('off','dry_run','live','ausente'));`

### ME-02 — Reentrância: duas execuções no mesmo dia reprocessam o mesmo conjunto

`20260823000007:156-159` (`FOR UPDATE` em `config_purga`) **serializa** varreduras
concorrentes — correto, e o `at-most-once` do `pg_net` é fail-safe. Mas a serialização não é
exclusão mútua no tempo: a segunda execução espera a primeira commitar e então roda; como a
primeira **fechou todos os seus itens**, o `NOT EXISTS` de `:208-213` não a protege e o
mesmo conjunto é reselecionado. Inócuo em `dry_run`; em `live` significa dispatch duplicado
do mesmo titular. Nada neste plano estabelece "uma execução por dia".
**Fix (para o 46-06):** guardar o laço por `NOT EXISTS (SELECT 1 FROM purga_execucoes e
WHERE e.iniciada_em::date = now()::date AND e.veredito IN ('dry_run','despachado'))`, ou um
advisory lock nomeado.

### ME-03 — O bloco de auto-verificação assere sobre o papel que NÃO pode escrever, e cala sobre os que podem

`20260823000006:970-1035`. As quatro tabelas têm RLS ligada com **uma** policy de `SELECT` e
**zero** de escrita — logo os únicos papéis que hoje conseguem escrever `liberado_em` em
`retencao_hold`, ou fabricar um item em `purga_execucao_itens`, são `service_role` (que
bypassa RLS) e `postgres`. O bloco não menciona nenhum dos dois. A ameaça nomeada pelo
próprio arquivo em `:908-914` ("liberar um hold é o passo que falta entre registro sob
litígio e registro apagado irreversivelmente") **é real e continua aberta pela via do
service key**, sem RPC auditada e sem trilha — o que a `Known Stubs` do SUMMARY registra,
corretamente, como stub deliberado. O que falta é o `COMMENT`/`NOTICE` dizer isso: hoje ele
declara "asserção, não confiança" sobre uma superfície que não é a que carrega o risco.
**Fix:** acrescentar ao `RAISE NOTICE` final a declaração explícita de que `service_role`
escreve nas quatro por desenho, e que a RPC auditada de `retencao_hold` é pré-condição do
flip `dry_run → live`.

### ME-04 — (C3/iii) não vigia a regressão que D-46-24 nomeia

`supabase/tests/p45_motor_exclusao_smoke.sql:1740` —
`v_tem_live := (v_src_anon ~ 'modo_vigente[[:space:]]*=[[:space:]]*''live''')`.

Verificado: a regex **não** casa dentro das mensagens de recusa (lá o texto é `modo_vigente =
live`, sem aspas, e um literal em string apareceria com aspas dobradas). Ela é não-vacuosa.
Mas ela mede apenas que a string existe **em algum lugar** do corpo. A regressão concreta que
D-46-24 mandou tornar impossível — a metade destrutiva de (b) passar a ler `v_purga_dry` em
vez de `v_purga_live` (`…006:432`) — deixaria (C3/iii) **verde**. Só (o.2a) pega, e só se o
smoke for executado.
**Fix:** acrescentar duas checagens de forma que sobrevivem a um re-pin:
```sql
v_tem_sep  := (v_src_anon ~ 'v_purga_live[[:space:]]*;')          -- as duas variáveis existem
           AND (v_src_anon ~ 'AND[[:space:]]+NOT[[:space:]]+v_purga_live')  -- e (b)/(c) leem a certa
           AND (v_src_anon ~ 'AND[[:space:]]+NOT[[:space:]]+v_purga_dry');
```

---

## LOW

### LO-01 — Referência cruzada errada em `20260823000007:415`

O comentário do fechamento diz *"torna essa assinatura legivel quando o **46-04** chegar"*;
o cabeçalho do mesmo arquivo (`:108-109`) diz corretamente **46-06**. Num arquivo cujo valor
está na prosa, uma seta apontando para o plano que já terminou manda a próxima pessoa para o
lugar errado.

### LO-02 — Escrituração do SUMMARY desatualizada dentro do próprio documento

`46-04-SUMMARY.md:572` afirma "(C3) rede de **2 → 3** metades" enquanto `:591` e o smoke
dizem **4**; `:574` diz "RESUMO (z) 11 → **13**" enquanto `:593` e `p46_purga_smoke.sql:1432`
dizem **14**. Linhas superadas pelo fechamento de B-02 e não revisadas. Não afeta código.

---

## Análise C — o argumento do "UM predicado só" em `plano_exclusao_titular` **se sustenta**

A tarefa era julgar o argumento, não a aderência à instrução. Julgado por leitura:

1. **A premissa está correta.** `20260823000008:209-214`: a função é `STABLE`, tem **uma**
   assinatura, não recebe parâmetro de intenção, e o corpo inteiro (`:366-617`) é `SELECT` e
   `EXECUTE` de `SELECT`. Não existe um segundo caminho a restringir.
2. **A consequência lógica está correta.** O predicado de `live` é subconjunto **estrito** do
   de `dry_run OR live`; dois `EXISTS` unidos por `OR` dariam um ramo que nunca pode ser a
   razão de a função autorizar. Isso é dead code dentro de um guard — o P39/CR-02 literal, e
   o precedente que o próprio plano cita para outra coisa.
3. **A restrição por modo continua tendo efeito onde importa.** Autorizar a *leitura* do
   plano em `dry_run` não autoriza destruição: quem decide destruir é
   `20260823000006:479-492`, e este arquivo não o toca.
4. **A obrigação que de fato protegia foi cumprida.** O que fecha a superfície aqui não é o
   modo, é o **ALVO** — `i.candidato_id = p_candidato_id`, presente em `…008:338`, vigiado
   estruturalmente por (C3/iv) (`p45_motor_exclusao_smoke.sql:1765`) e medido em execução por
   (p.2) (`p46_purga_smoke.sql:1404-1406`). Verifiquei que (p.2) é **discriminante** e não
   vacuosa: no instante em que ela roda existem itens abertos para *outros* candidatos, então
   um ramo sem a condição de alvo autorizaria e a asserção viraria vermelha.

**Veredito sobre C: o desvio é defensável e está bem argumentado.** A ressalva de BL-02
(o ramo não é correlacionado ao chamador) aplica-se aqui também, mas por outra razão e com
outra severidade — aqui o que vaza são **contagens**, não destruição, e a asserção (p)
verifica em execução a premissa de zero PII no retorno.

---

## Condições de liberação

Nesta ordem, e nenhuma delas é opcional:

1. **BL-01 corrigido** nos dois arquivos, com o comentário errado reescrito.
2. **BL-02 corrigido** nas três funções, **mais** a asserção `(o.6)` que o torna observável.
3. **HI-01**: as três seções de ordem alinhadas em `006 → 008 → 007`.
4. **HI-02, HI-03, HI-04** corrigidos.
5. Re-pins de md5 **refeitos** — BL-01, BL-02 e HI-03 mudam os corpos das duas funções, logo
   `35d1df5d…` e `3f6007b8…` deixam de valer no instante do conserto.
6. Novo code review bloqueante sobre o diff do conserto, porque ele volta a editar uma função
   destrutiva viva.

---

_Reviewed: 2026-08-22_
_Reviewer: Claude (gsd-code-reviewer) — modo adversarial_
_Depth: deep (cross-file: cadeia de chamadas, ACL histórico, contratos de smoke)_
