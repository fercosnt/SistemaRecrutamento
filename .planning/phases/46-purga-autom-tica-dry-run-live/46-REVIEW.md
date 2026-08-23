---
phase: 46-purga-autom-tica-dry-run-live
plan: 04
reviewed: 2026-08-22
depth: deep
reviewer: gsd-code-reviewer (adversarial, portão de fase destrutiva do M8, item 2)
rodadas: 2
status: findings
veredito: APROVACAO CONDICIONADA — 006/008/009 liberadas apos RD2-04 e RD2-07; 007 e p46_purga_smoke.sql NAO aplicam antes de RD2-01 e RD2-02
files_reviewed: 6
files_reviewed_list:
  - supabase/migrations/20260823000006_p46_guard_purga.sql
  - supabase/migrations/20260823000007_p46_sweep_dry_run.sql
  - supabase/migrations/20260823000008_p46_guard_plano.sql
  - supabase/migrations/20260823000009_p46_ck_modo_vigente.sql
  - supabase/tests/p46_purga_smoke.sql
  - supabase/tests/p45_motor_exclusao_smoke.sql

rodada_1:
  reviewed: 2026-08-22
  veredito: REPROVADO — NAO APLICAR
  findings:
    blocker: 2
    high: 4
    medium: 4
    low: 2
    total: 12

rodada_2:
  reviewed: 2026-08-22
  commit_revisado: 6029f94
  veredito: APROVACAO CONDICIONADA
  fechados:
    - BL-01
    - BL-02 (papeis de cliente; service_role DESLOCADO e aceitavel — ver RD2-07)
    - HI-01
    - HI-02
    - HI-04
    - ME-01
    - ME-03
    - ME-04
    - LO-01
    - LO-02
  parcialmente_fechados:
    - HI-03 (janela correta e folgada; a reconciliacao introduziu RD2-01/03/05/06)
  deferidos:
    - ME-02 (46-06, com razao registrada — aceito)
  findings:
    blocker: 0
    high: 3
    medium: 4
    low: 3
    total: 10

findings:
  critical: 0
  blocker: 0
  high: 3
  warning: 4
  info: 3
  total: 10
---

> ⚠ **Este arquivo tem DUAS rodadas.** A Rodada 1 (abaixo) é o registro de por que o portão
> existe e **não deve ser apagada**. A Rodada 2 começa em `# Rodada 2 — code review do
> conserto (commit 6029f94)`, no fim do arquivo.

# Rodada 1


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

---

# Rodada 2 — code review do conserto (commit `6029f94`)

**Veredito: os DOIS BLOCKERs estão FECHADOS, e verifiquei byte a byte — não por leitura de
cabeçalho.** Os quatro HIGH estão fechados na forma que foi pedida, mas o conserto de HI-03
**produziu três defeitos novos**, dois deles nos arquivos que se aplicam AGORA. Nenhum é
BLOCKER: nenhum destrói, nenhum abre caminho de autorização não pretendido, e nada nesta fase
consegue chegar ao caminho destrutivo (as chamadas do `007` passam o literal `true`).

**APROVAÇÃO CONDICIONADA.** As migrations `006`, `008` e `009` podem aplicar como estão.
`007` e `p46_purga_smoke.sql` **não** — RD2-01 e RD2-02 vivem neles.
⚠ E a boa notícia mecânica: **nenhum dos consertos que peço toca o corpo de
`anonimizar_candidato` nem o de `plano_exclusao_titular`.** `varrer_purga_retencao` NÃO é
pinada por md5 (conferido: os únicos pins vivos são `v_pin_plano` e `v_pin_anon`,
`p45_motor_exclusao_smoke.sql:1681-1682`). Os dois re-pins ficam de pé e **não** há segunda
rodada de re-pin.

---

## Veredito por defeito da rodada 1

| # | Veredito | Base |
|---|---|---|
| **BL-01** | **FECHADO** | ACL final simulado; portão (C1) verde |
| **BL-02** | **FECHADO** (papéis de cliente) · **DESLOCADO e aceitável** (`service_role`) | ver §BL-02 |
| **HI-01** | **FECHADO** | dependências reais lidas, não cabeçalhos |
| **HI-02** | **FECHADO**, com RD2-04 e RD2-08 pendurados | |
| **HI-03** | **PARCIALMENTE FECHADO** — janela correta, reconciliação defeituosa | RD2-01, RD2-03, RD2-05, RD2-06 |
| **HI-04** | **FECHADO**, e o portão continua mordendo nos dois sentidos | |
| ME-01/03/04, LO-01, LO-02 | FECHADOS | |
| ME-02 | DEFERIDO ao 46-06 com razão registrada — aceito | |

---

### BL-01 — FECHADO. ACL final simulado, e ele bate.

Conferido nos quatro eixos que pedi a mim mesmo:

1. **Ordem textual.** `20260823000006:948-951`: `REVOKE` na 948, `GRANT … service_role` na
   950, `GRANT … authenticated` na 951. `20260823000008:672-675`: mesma sequência. O `GRANT`
   vem **depois**. ✓
2. **As duas funções.** `anonimizar_candidato(uuid, boolean)` na `…006` e
   `plano_exclusao_titular(uuid)` na `…008`. ✓
3. **`anon` e `PUBLIC` continuam revogados.** O `REVOKE` continua **nomeando `anon`** nas
   duas — que é a metade que morde neste schema — e não há `GRANT` a `anon` em lugar nenhum
   dos dois arquivos. ✓

4. **ACL final, simulado nas 4 migrations na ordem declarada** (`CREATE OR REPLACE` preserva
   o ACL; `pg_default_acl` só se aplica em `CREATE`, nunca em `REPLACE`):

```
anonimizar_candidato(uuid, boolean)
  vivo hoje  : {postgres=X/postgres, service_role=X, authenticated=X}
               (20260805000006:836 + 20260805000009:179-180)
  após 006   : REVOKE ALL FROM PUBLIC, anon, authenticated
               → {postgres=X, service_role=X}
               GRANT service_role  (no-op)
               GRANT authenticated → {postgres=X, service_role=X, authenticated=X}
  após 008/007/009 : inalterado
  RESULTADO  : {postgres=X, service_role=X, authenticated=X}   ← IDÊNTICO ao vivo

plano_exclusao_titular(uuid)
  RESULTADO  : {postgres=X, service_role=X, authenticated=X}   ← IDÊNTICO ao vivo
```

5. **`p45_motor_exclusao_smoke.sql:1439-1441` ficaria VERDE.** `v_concede_auth` exige
   `authenticated` nas duas — presente. O laço `(i)` proíbe `anon`/`PUBLIC` — ausentes.
   `proacl` não é nulo. As três metades da (C1) passam. ✓

6. O comentário que produziu o defeito foi **reescrito, não preservado** (`…006:924-950`,
   `…008:653-669`): "ordem de repositório **não** é ordem de apply" está escrito por extenso,
   com a proveniência de cada grantee. Era essa a exigência.

---

### BL-02 — FECHADO nos três predicados. E a pergunta dura, respondida.

**Está nos três, e conferi que são exatamente três** (`grep` de `INTO v_purga_dry|INTO
v_purga_live|INTO v_por_purga` + `SELECT EXISTS` residual):

- `20260823000006:342` → `v_purga_dry`
- `20260823000006:364` → `v_purga_live`
- `20260823000008:354` → `v_por_purga`

O único outro `SELECT EXISTS` do conjunto (`…008:501`) está dentro do `format()` do laço de
contagem, depois do guard — não é predicado de autorização. **Nenhum esquecido.**

Precedência conferida: `SELECT (v_uid IS NULL) AND EXISTS (…)` — `IS NULL` nunca devolve
NULL, então o resultado é sempre `true`/`false` e a variável nunca fica indefinida. A metade
(a) (`IF v_uid IS NULL AND NOT v_ramo_purga`) permanece coerente: com sessão, ela já não era
tomada; sem sessão, ela volta a ser o fundo de poço quando o ramo não autoriza.

**A pergunta dura — `service_role` sem JWT de usuário também tem `auth.uid()` NULL.
Isto é BL-02 deslocado, ou está fechado?**

**Decisão: DESLOCADO e ACEITÁVEL — não é BLOCKER.** A justificativa não é "o estado
autorizante ainda é exigido" (esse argumento é fraco: quem tem service key **fabrica** o
estado, porque `service_role` bypassa RLS e as quatro tabelas não têm policy de escrita
nenhuma). A justificativa é outra e é dura:

> **O 4º ramo não concede a `service_role` nenhuma capacidade que ele já não tivesse.**
> `service_role` tem DML irrestrito e bypass de RLS sobre `public.candidatos`,
> `public.candidaturas` e todas as demais que o motor toca; o Storage responde à service key
> pela API; `auth.users` responde à Admin API. O guard nunca foi — e não poderia ser — uma
> defesa contra a service key. O que muda é apenas **por qual porta** o mesmo ator faz o
> mesmo estrago. Não há escalação de privilégio, logo não há "caminho de autorização não
> pretendido" no sentido do critério de BLOCKER.

**O que continua devendo:** o código descreve o conjunto autorizado como "**o cron**"
(`…006:310-312`, `…008:349-351`, e o `RAISE NOTICE` final). O conjunto real é *qualquer
chamador com `EXECUTE` e `auth.uid()` NULO* — o cron, a EF de serviço, um script, o MCP.
Dizer "o cron" onde se lê "quem não tem sessão" é a mesma classe de imprecisão que produziu
BL-01. Ver **RD2-07**.

**A asserção `(o.6)` prova a recusa? Sim — e limpa as claims. Mas ela não tem controle
positivo.**

- Carimba `rh` (`p46_purga_smoke.sql:1037-1039`) **e** `candidato` (`:1049-1051`), os dois
  **com item aberto sob `live`** (`:1028-1031` põe cerco em `live`, execução em
  `executando`/`live`, e reabre `v_o_item`), na intenção **destrutiva** (`false`). ✓
- **Limpa as claims** em `:1064-1065`, antes de `(p)`. ✓ Conferi que `(p.1)`/`(p.2)`/`(p.3)`
  dependem de `auth.uid()` NULO e que o restore em `:1067-1069` recompõe o estado que `(p)`
  espera (`situacao='executando'`, `modo_vigente='dry_run'`, `v_o_item` fechado,
  `v_o_item_pos` **aberto** — que é o que `(p.3)` exige). ✓
- **Discrimina contra a regressão exata:** com o bug de volta, `v_purga_live` seria TRUE, (b)
  e (c) não seriam tomadas, o motor rodaria e pararia em `P0002` sobre o uuid sintético →
  `'P0002' <> '42501'` → vermelho. ✓
- Zero risco de destruição: o alvo é `4604f000-…-00000000000f`, que não existe em
  `candidatos`. ✓

**O que falta está em RD2-02** e é sério: nada, em lugar nenhum, prova que `v_purga_live`
consegue ser TRUE.

---

### HI-01 — FECHADO. Confirmado pelas dependências reais.

Li as cadeias, não os cabeçalhos:

- `…007:386` chama `public.anonimizar_candidato(r.candidato_id, true)`; o corpo dessa função
  chama `plano_exclusao_titular` no PASSO 0 → **`007` depende de `006` E de `008`**. ✓
- `…008` depende funcionalmente de nada em `006` (o acoplamento é o bloco de
  auto-verificação, que é uma asserção, não uma dependência de objeto) → pode vir depois de
  `006` sem problema. ✓
- `…009` só depende de `20260823000002` (a tabela). Pode vir em qualquer ponto depois dela;
  vir por último é uma escolha, não uma obrigação — e é a escolha certa, porque é a única
  que pode falhar por dado. ✓

As **quatro** seções de ordem agora dizem a mesma coisa: `…006:149-153`, `…007:120-125`,
`…008:177-182`, `…009:64`. Todas `006 → 008 → 007 → 009`. ✓

**Sobre o `009` "falhar por dado é descoberta, não bug": CONFERIDO — é VERDADE.** Varri
todos os escritores de `purga_execucoes.modo_vigente`: `20260823000004:181,248,270,276` e
`20260823000007:190,313,335,341`. Os valores possíveis são `v_modo` (fechado pelo `CHECK` de
`config_purga` em `off|dry_run|live`) e o literal `'ausente'`. O `CHECK` de `009` cobre os
quatro. **A reconciliação nova não escreve `modo_vigente`** — conferido. O único outro
escritor é o smoke, que roda dentro do envelope revertido. Logo o vocabulário é fechado por
construção, e um `23514` no apply significaria mesmo que alguém escreveu à mão. A afirmação
do executor se sustenta.

---

### HI-02 — FECHADO. Com dois resíduos.

O laço aninhado está correto (`…006:1076-1092`): `v_priv := false` é resetado antes do laço
externo, e `has_table_privilege`/`has_column_privilege` são perguntados para
`ARRAY['authenticated','anon']`. `p.roles && ARRAY['authenticated','anon','public']::name[]`
cobre a policy sem cláusula `TO` (que produz `{public}`). ✓
Resíduos: **RD2-04** (a coluna nova do guard não entrou na lista) e **RD2-08** (a mensagem
perdeu o papel).

---

### HI-03 — A janela é FOLGADA. A reconciliação é que está errada.

**A janela de 1 h é folgada, e medi em vez de opinar.** `46-06-PLAN.md:111-121` fixa o
desenho: **um `net.http_post` por titular, jamais um post para o lote**, precisamente porque
"a Edge Function tem teto de parede de **150 s** e 2 s de CPU por requisição". Uma hora é
**24× o teto de parede da plataforma**. Uma EF não consegue atravessar a janela mesmo se
quiser: ela morre em 150 s. Não é apertado; é generoso.

O risco não está na duração da EF — está no **atraso de entrega**. `46-06-PLAN.md:358`
registra que as tabelas do `pg_net` são `UNLOGGED` com **TTL de ~6 h**. Um post entregue
depois de 1 h é possível, e o que acontece nesse caso é **RD2-03**.

**A reconciliação apaga algo? NÃO.** Li os dois `UPDATE` (`…007:219-241`): só tocam
`purga_execucao_itens` (desfecho + `concluido_em` + `relato_dry_run`) e `purga_execucoes`
(`situacao='abortada'` + `concluida_em`). **Zero DELETE, zero PII, zero Storage.** Não é
caminho destrutivo novo. `'falha'` e `'abortada'` estão nos `CHECK` vivos
(`20260823000002:93-94` e `:151-152`) — o apply não quebra por domínio. ✓
O que ela tem de errado é **o que ela escreve** (RD2-01) e **quando ela roda** (RD2-05).

---

### HI-04 — FECHADO, e o portão continua mordendo.

Não ficou cego. O estado de `pos1` é **medido antes** (`p46_purga_smoke.sql:986-990`, pelo
mesmo predicado CR-06 do motor) e a asserção exige a terminação **exata** que aquele estado
obriga (`:1501-1509`): linha viva → só `P45DR`; tombstone → só `RETORNO-ja_anonimizado`.
Os dois sentidos reprovam: `P45DR` sobre tombstone reprova, `ja_anonimizado` sobre linha
viva reprova (e a mensagem nomeia CR-06 nesse caso). **Não é "aceitar as duas e pronto".**
O caso `SEM-EXCECAO` — o defeito caro — continua vermelho em qualquer estado. ✓
Resíduo trivial em RD2-10.

---

## Achados NOVOS da rodada 2

### RD2-01 — HIGH — A reconciliação carimba `desfecho_postgres = 'falha'` INCONDICIONALMENTE, e falsifica o registro de um ato irreversível

**Arquivo:** `supabase/migrations/20260823000007_p46_sweep_dry_run.sql:219-233`

```sql
UPDATE public.purga_execucao_itens i
   SET desfecho_postgres = 'falha',          -- ← sem olhar o valor atual
       concluido_em      = pg_catalog.now(),
       relato_dry_run    = coalesce(i.relato_dry_run, '') || '[RECONCILIADO] …'
 WHERE i.concluido_em IS NULL
   AND EXISTS ( … e.situacao='executando' AND e.iniciada_em <= now() - interval '1 hour' );
```

**Cenário concreto.** No desenho do 46-06 a EF processa um titular e carimba os desfechos
conforme avança (`Storage → Postgres → Auth`). Suponha que ela conclua o Postgres — a PII do
titular **está anonimizada, irreversivelmente** — e morra antes de carimbar `concluido_em`
(deploy no meio, corte de 150 s no passo do Auth, `at-most-once` do `pg_net` na confirmação).
O item fica aberto com `desfecho_postgres = 'ok'`. Uma hora depois, a varredura seguinte
**sobrescreve `'ok'` por `'falha'`**.

**Consequência, e ela é dupla:**

1. `purga_execucoes`/`purga_execucao_itens` são, por `D-46-16`, **registro de cumprimento de
   obrigação legal, com retenção indefinida**. Ele passa a afirmar que a anonimização do
   titular X falhou, quando ela aconteceu e não pode ser desfeita. Com PITR desligado, não
   existe nenhuma outra fonte para desmentir o ledger. Um `'falha'` falso é pior que um
   `'pendente'` honesto — este projeto já escreveu isso: *"dizer `ok` aqui seria a mentira
   mais cara possível"* (`…007:427-428`). A mentira simétrica custa o mesmo.
2. O item fechado devolve o titular ao conjunto elegível, e o próximo `live` **re-despacha**
   quem já foi purgado. A idempotência por estado do motor absorve o Postgres, mas o ledger
   ganha um segundo item para a mesma pessoa e `processados` conta duas vezes.

Os outros dois desfechos ficam **`'pendente'` para sempre** num item marcado `concluido_em`
— um registro que se contradiz na própria linha.

**Fix:** nunca sobrescrever um desfecho já carimbado.
```sql
UPDATE public.purga_execucao_itens i
   SET desfecho_postgres = CASE WHEN i.desfecho_postgres = 'pendente'
                                THEN 'falha' ELSE i.desfecho_postgres END,
       desfecho_storage  = CASE WHEN i.desfecho_storage  = 'pendente'
                                THEN 'falha' ELSE i.desfecho_storage  END,
       desfecho_auth     = CASE WHEN i.desfecho_auth     = 'pendente'
                                THEN 'falha' ELSE i.desfecho_auth     END,
       concluido_em      = pg_catalog.now(),
       relato_dry_run    = coalesce(i.relato_dry_run, '')
         || '[RECONCILIADO] item ABERTO em execucao vencida (>1h). Os desfechos JA carimbados '
         || 'foram PRESERVADOS: eles descrevem atos irreversiveis que aconteceram, e reescreve-los '
         || 'faria o registro de cumprimento de obrigacao legal (D-46-16) mentir. Os pendentes '
         || 'viraram falha porque nao foram tentados.'
 WHERE …
```
⚠ `varrer_purga_retencao` **não é pinada por md5** — este conserto não reabre os re-pins.

---

### RD2-02 — HIGH — `(o.6)` não tem controle positivo, e `v_purga_live = TRUE` não é provado em lugar NENHUM

**Arquivos:** `supabase/tests/p46_purga_smoke.sql:1028-1058` e as seis chamadas de `(o)`
em `:895-1001`.

Inventariei as sete chamadas que exercitam o 4º ramo:

| caso | estado | intenção | esperado | o que prova |
|---|---|---|---|---|
| o.1 | `off`, item aberto | dry | 42501 | recusa |
| o.2a | `dry_run`, item aberto | **destrutiva** | 42501 | recusa |
| o.2b | `dry_run`, item aberto | dry | P0002 | **`v_purga_dry` AUTORIZA** |
| o.3 | `live`, sem item | destrutiva | 42501 | recusa |
| o.4 | item aberto, execução `concluida` | destrutiva | 42501 | recusa |
| o.5 | `dry_run`, item aberto, `pos1` | dry | P45DR | **`v_purga_dry` AUTORIZA** |
| o.6 | **`live`, item aberto**, com sessão | destrutiva | 42501 | recusa |

**Não existe uma única linha nesta tabela em que `v_purga_live` seja TRUE.** A metade
DESTRUTIVA do 4º ramo — a que o 46-06 inteiro vai depender — nunca foi provada capaz de
autorizar ninguém. Se alguém quebrasse `v_purga_live` amanhã (um `= 'live '` com espaço, uma
troca de `e.modo_vigente` por `cp.modo`, um `AND` a mais), **todo o portão continuaria
verde** e a descoberta chegaria no dia do flip `dry_run → live`, com o cron devolvendo 42501
em todo titular. É literalmente o *modo de falha nº 3 dos sete portões da Phase 45* — provar
só recusa — que este mesmo arquivo invoca em `:864-866` para justificar `(o.2b)`.

E há o efeito colateral imediato sobre `(o.6)`: ela conclui "o guard recusou **porque o
chamador tem sessão**", mas o que ela mede é só "o guard recusou". Se o estado montado em
`:1028-1031` deixar de valer — `v_o_item` não reabrir, `v_o_exec` sair de `executando`,
alguém encostar na fixture —, `(o.6)` **fica verde com o BL-02 de volta**. O par positivo é o
que converte a asserção de "recusou" em "recusou por este motivo".

**Fix — uma chamada, no mesmo estado, sem sessão, e ela é tão segura quanto `(o.2b)`:**
```sql
    -- (o.7) ⊕ CONTROLE POSITIVO DO PAR DE (o.6): estado IDENTICO, sessao NULA.
    -- Sem esta chamada, (o.6) prova apenas "recusou", e nao "recusou POR TER SESSAO";
    -- e a metade DESTRUTIVA do 4o ramo nunca e provada capaz de autorizar ninguem.
    -- Alvo sintetico: se o guard autoriza (o correto), o motor para em P0002 sem
    -- mutar coluna alguma — a mesma construcao de (o.2b).
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, false);
      v_o7_semsess := 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o7_semsess := SQLSTATE;
    END;
```
posicionada **entre** a limpeza das claims (`:1065`) e o restore (`:1067`), com julgamento
`IF v_o7_semsess IS DISTINCT FROM 'P0002' THEN RAISE …` — e mensagem dizendo que 42501 aqui
significa que a metade destrutiva recusa DENTRO das próprias condições e que o flip do 46-06
falharia em 100% dos titulares. `RESUMO (z)` sobe de 15 para 16.

---

### RD2-03 — HIGH — A janela de 1 h cria uma obrigação NOVA sobre o 46-06 que ninguém registrou: a EF tem de conferir a autorização ANTES de tocar no Storage

**Arquivos:** `20260823000006:350` e `:372` (a janela) × `46-06-PLAN.md:111-121, 358`.

A janela em si é folgada — 1 h contra um teto de parede de 150 s por invocação, um post por
titular. Não é isso que me preocupa. É a **latência de entrega**: `46-06-PLAN.md:358` registra
que as tabelas do `pg_net` são `UNLOGGED` **com TTL de ~6 h**. Um post entregue 70 minutos
depois de o item ter sido aberto é um cenário dentro do desenho, não uma hipótese exótica.

**Cenário concreto.** A varredura abre o item, enfileira o post e commita. O worker do
`pg_net` está represado; a EF só é invocada 70 min depois. A EF segue a ordem contratada e
começa pelo **Storage** — que **não tem guard nenhum**: é a Storage API respondendo à service
key, sem passar pelo Postgres. O currículo é apagado. Em seguida a EF chama
`anonimizar_candidato` e recebe **42501**, porque `e.iniciada_em > now() - 1 h` já é falso.

**Resultado: Storage apagado, Postgres intacto.** Currículo órfão e irrecuperável — sem PITR
(`D-45-10`) e com o Storage fora de todo backup —, e o registro em Postgres do titular
continua vivo. É exatamente o modo de falha **SILENCIOSO** que a SONDA 2 mediu e que a metade
(c) do guard existe para impor. Antes de HI-03 esse cenário não existia: a autorização não
expirava.

**Isso é pior que o defeito original?** Não — o defeito original era uma autorização
destrutiva *standing* e permanente, que é a categoria que `D-46-18` recusou por escrito. A
janela é a troca certa. Mas ela **desloca** o risco para um ponto que o 46-06 ainda não sabe
que tem de cobrir, e nenhum artefato registra isso hoje.

**Fix (pré-condição do 46-06, não deste apply):** a EF `purgar-retencao` tem de **sondar a
autorização antes do primeiro passo irreversível**. A sonda já existe e é barata:
`plano_exclusao_titular(id)` carrega **a mesma janela de 1 h e a mesma correlação com
`auth.uid()` NULO**. Se ela devolver 42501, a EF aborta com
`desfecho_storage = 'nao_aplicavel'` e não toca em nada — e a reconciliação (já com RD2-01
corrigido) devolve o titular à varredura seguinte, que é o comportamento certo. Registrar
como obrigação de aceite em `46-06-PLAN.md` **agora**, enquanto a razão está fresca.

---

### RD2-04 — MEDIUM — HI-03 acrescentou uma leitura nova DENTRO do ramo do guard e não a declarou no bloco que aborta o apply — violando a obrigação escrita naquele mesmo bloco

**Arquivo:** `20260823000006:1055-1074`.

O bloco diz de si mesmo, em `:1051-1054`:

> "uma leitura nova dentro do ramo do guard, sim — e **acrescenta-la aqui e obrigacao de quem
> a escrever**."

O conserto de HI-03 acrescentou `e.iniciada_em` ao predicado do guard. A lista de colunas de
`purga_execucoes` continua `ARRAY['situacao','modo_vigente']`. **`iniciada_em` ficou de fora.**

**Por que a lista de colunas existe e por que isto importa:** `has_table_privilege` não
enxerga `GRANT`s por coluna — é literalmente o que o comentário em `…006:1084-1087` explica.
Um `GRANT UPDATE (iniciada_em) ON public.purga_execucoes TO authenticated` passaria pelas
três perguntas do bloco sem casar em nenhuma, o apply não abortaria, e quem tivesse esse
grant poderia **renovar a janela de autorização indefinidamente** — desfazendo HI-03 sem que
nenhum portão falasse. É a mesma forma do buraco que HI-02 fechou, reaberta pelo conserto de
HI-03 no mesmo commit.

**Fix:**
```sql
        ('purga_execucoes',
         ARRAY['INSERT','UPDATE'],
         ARRAY['situacao','modo_vigente','iniciada_em'],
         'quem carimba situacao = executando e modo_vigente = live AUTORIZA o caminho destrutivo desta funcao; e quem escreve iniciada_em RENOVA a janela de 1h de HI-03, que e o que impede a autorizacao de virar standing'),
```
⚠ Isto **não** muda o corpo da função (o bloco de auto-verificação é um `DO` separado, fora
do `$anonimizar_candidato$`) — conferido: `md5(prosrc)` não se altera, os re-pins ficam.

---

### RD2-05 — MEDIUM — A reconciliação roda ANTES do kill switch: `off` deixou de significar "a varredura só escreve o heartbeat"

**Arquivo:** `20260823000007:197-251` (reconciliação) × `:334-339` (o ramo `off`).

A reconciliação foi colocada em `(a.2)`, antes do cap e antes do kill switch. Com
`config_purga.modo = 'off'` — que é o estado de PROD hoje — a varredura passa a executar dois
`UPDATE` no ledger antes de gravar a linha de heartbeat e retornar.

**Cenário:** um operador aciona o kill switch **exatamente para congelar o estado** de uma
execução `live` que travou e investigá-la. A varredura seguinte, apesar do `off`, aborta a
execução, fecha os itens e devolve os titulares ao conjunto — apagando o cenário que ele
queria olhar. A ordem do arquivo é declaradamente deliberada em outro ponto (`:307-311`
explica por que o cap vem antes do kill switch); esta inserção não ganhou a mesma
justificativa e contradiz o espírito do ramo `off`, que o próprio arquivo descreve como "uma
execução real que não apaga nada".

E a asserção `(f)` — o portão do kill switch — **não mede isto**: ela conta itens
*daquela* execução (`p46_purga_smoke.sql:1194-1195`) e as cinco contagens de domínio. Escritas
de reconciliação em itens de execuções *anteriores* passam invisíveis. O portão continua
afirmando mais do que mede.

**Fix:** mover a reconciliação para **depois** do ramo `off` (logo antes de `(b)`), ou
guardá-la com `IF v_modo <> 'off' THEN … END IF;`. Se a decisão for mantê-la sob `off`,
então ela precisa de um comentário com o mesmo peso do de `:307-311` explicando por quê, e
`(f)` precisa medir que nada além do heartbeat mudou.

---

### RD2-06 — MEDIUM — `interval '1 hour'` é um literal repetido em 5 lugares, em 3 arquivos, sem nenhum portão sobre a igualdade deles

**Arquivos:** `…006:350`, `…006:372`, `…008:363`, `…007:232`, `…007:241`.

O próprio código reconhece o problema e escolhe conviver com ele (`…007:210-214`):

> "Uma constante em dois lugares é como as duas se separam; até haver um só lugar para
> escrevê-la, o par tem de ser alterado junto, **e esta frase existe para que a próxima
> pessoa saiba disso**."

Uma frase num comentário não é um mecanismo — é a mesma aposta que produziu BL-01, onde o
argumento escrito estava errado e ninguém conferiu. E a consequência da divergência está
escrita na própria frase: um intervalo em que o item **ainda autoriza a destruição** e a
varredura **já o considera órfão**.

As checagens de forma novas em `(C3/iii-HI03)` e `(C3/iv-HI03)`
(`p45_motor_exclusao_smoke.sql:1806, 1836`) usam a regex `…now\(\) - interval` — que casa com
`interval '1 hour'`, `interval '10 minutes'` e `interval '30 days'` sem distinção. Elas
vigiam a **existência** da janela, nunca o **valor**.

**Fix (barato, sem objeto novo):** extrair o literal por regex nos três corpos e exigir
igualdade.
```sql
  -- as TRES janelas TEM de ser o mesmo intervalo, e o portao mede o VALOR
  v_jan_anon  := substring(v_src_anon  from 'now\(\) - interval ''([^'']+)''');
  v_jan_plano := substring(v_src_plano from 'now\(\) - interval ''([^'']+)''');
  v_jan_sweep := substring(pg_get_functiondef('public.varrer_purga_retencao()'::regprocedure)
                           from 'now\(\) - interval ''([^'']+)''');
  IF v_jan_anon IS DISTINCT FROM v_jan_plano
     OR v_jan_anon IS DISTINCT FROM v_jan_sweep THEN
    RAISE EXCEPTION 'P45M FAIL (C3/janela): as janelas DIVERGIRAM (guard=%, plano=%, varredura=%). Existe agora um intervalo em que o item AINDA autoriza a destruicao e a varredura JA o considera orfao, ou o contrario', v_jan_anon, v_jan_plano, v_jan_sweep;
  END IF;
```

---

### RD2-07 — MEDIUM — O código chama de "o cron" um conjunto que na verdade é "todo chamador sem sessão", e a diferença é a service key

**Arquivos:** `20260823000006:310-312`, `20260823000008:349-351`, `…006:1128` (o `RAISE
NOTICE` final), e os `COMMENT ON FUNCTION` das duas.

O comentário afirma: *"**O ramo existe para autorizar O CRON, e o cron se caracteriza por não
ter sessão**"*. A segunda metade é verdadeira; a primeira descreve a intenção, não o
conjunto. O conjunto autorizado, depois do conserto, é literalmente:

> `{ chamadores com EXECUTE } ∩ { auth.uid() IS NULL }` = `service_role` (o cron, a EF, um
> script, o MCP). `authenticated` sempre traz `sub`; `anon` está revogado.

Julguei em §BL-02 que isso **não é escalação** e não bloqueia. Mas o `ME-03` desta mesma
rodada 1 foi aceito exatamente com o argumento de que "dizer 'asserção, não confiança' sobre
a superfície que não carrega o risco seria a pior forma de falso conforto" — e o `RAISE
NOTICE` foi corrigido para declarar a via do `service_role`. **O comentário do guard não
recebeu o mesmo tratamento.** Quem ler `…006:310-312` daqui a seis meses vai entender que
apenas o cron passa, e essa é a premissa falsa a partir da qual o próximo BL-01 é escrito.

**Fix:** acrescentar, nas duas funções e nos dois `COMMENT`:
```
-- ⚠ ESCOPO HONESTO DO RAMO: `v_uid IS NULL` nao seleciona "o cron" — seleciona TODO
--   chamador sem sessao de usuario, o que na pratica e `service_role` (o cron, a EF
--   `purgar-retencao`, um script, o MCP). Isso NAO e escalacao: `service_role` bypassa RLS e
--   ja tem DML irrestrito sobre todas as tabelas que este motor toca, alem de poder FABRICAR
--   o item que autoriza. O ramo nao lhe da capacidade nenhuma que ele nao tivesse — muda so a
--   porta. O que ele NAO faz, e por isso a metade (a) continua de pe, e autorizar um papel de
--   CLIENTE sem sessao.
```

---

### RD2-08 — LOW — A mensagem de HI-02 deixou de dizer QUAL papel dispara o aborto

**Arquivo:** `20260823000006:1108-1109`.

`v_priv` é um único booleano acumulado sobre `ARRAY['authenticated','anon']`, então a exceção
diz *"um papel de CLIENTE (authenticated ou anon) PODE ESCREVER"* sem dizer qual. Num apply
abortado às três da manhã, isso é uma busca em dois lugares em vez de um — e a rodada 1
reprovou HI-04 justamente por diagnóstico impreciso.
**Fix:** acumular `v_papel_ofensor text` junto com `v_priv` e interpolá-lo no `%`.

---

### RD2-09 — LOW — Comentário órfão em `p46_purga_smoke.sql:1003-1004`, e ele descreve o que não acontece mais

O comentário *"Fecha os dois itens de (o) para nao deixar vestigio…"* ficou imediatamente
acima do cabeçalho de `(o.6)`, a 66 linhas do único fechamento que existe (`:1069`) — que
fecha **um** item, não dois: `v_o_item_pos` permanece aberto **de propósito**, porque `(p.3)`
depende dele. O comentário afirma duas coisas falsas (que fecha ali, e que fecha os dois) num
arquivo cujo valor declarado está na prosa.
**Fix:** apagar o comentário órfão e mover a nota correta para `:1069`, dizendo que
`v_o_item_pos` fica aberto porque `(p.3)` o exige.

---

### RD2-10 — LOW — A não-vacuidade das claims em `(o.6)` só cobre a perna do `rh`

`p46_purga_smoke.sql:1041` mede `auth.uid() IS NOT NULL` depois do primeiro `set_config`, e
nada é remedido depois do segundo (`:1049-1052`). Se a segunda troca de claims falhasse, a
perna do `candidato` rodaria com `auth.uid()` NULO — repetindo `(o.2a)` e passando por verde.
Mesmo idioma, uma linha:
```sql
    SELECT count(*) INTO v_o6_uid2 FROM (SELECT auth.uid() AS u) s WHERE s.u IS NOT NULL;
```
com julgamento próprio.

---

## Perguntas do escopo que exigiam resposta direta

| pergunta | resposta |
|---|---|
| `GRANT` depois do `REVOKE`? | **Sim**, nas duas (`…006:948-951`, `…008:672-675`) |
| Cobre as duas funções? | **Sim** |
| `anon` e `PUBLIC` continuam revogados? | **Sim**, e o `REVOKE` continua **nomeando** `anon` |
| ACL final simulado / `p45:1439-1441` verde? | `{postgres, service_role, authenticated}` nas duas — **VERDE** |
| `(v_uid IS NULL)` nos três predicados? | **Sim**, e são exatamente três |
| `service_role` é BL-02 deslocado? | **Deslocado e aceitável** — sem escalação; documentação devendo (RD2-07) |
| `(o.6)` prova a recusa? | Sim, e discrimina a regressão exata — **mas sem par positivo** (RD2-02) |
| `(o.6)` limpa as claims? | **Sim**, `:1064-1065`, antes de `(p)`, e conferi que `(p)` depende disso |
| 1 h é folgado ou apertado? | **Folgado — 24× o teto de 150 s da EF**, com um post por titular |
| A reconciliação apaga algo? | **Não.** Só `UPDATE` no ledger. Mas escreve errado (RD2-01) e cedo demais (RD2-05) |
| Ordem de apply confirmada por dependência real? | **Sim** — `006 → 008 → 007 → 009`, quatro cabeçalhos concordando |
| HI-04 ficou cego? | **Não.** Exige a terminação exata que o estado medido obriga, nos dois sentidos |
| Só `EXECUTE`, e só a quem deve? | **Sim** — `GRANT EXECUTE`, a `service_role` e `authenticated` |
| Precedência `AND`/`OR` alterada? | **Não.** `IS NULL` nunca devolve NULL; falha FECHADA preservada |
| As asserções novas passariam com conjunto elegível VAZIO? | `(o.6)` **passaria** — não depende da fixture. É metade do RD2-02 |
| `009` "falha por dado = descoberta"? | **VERDADE, conferida** — vocabulário fechado por construção |
| Re-pins conferem? | **Sim, calculados**: `anon` = `4765cc68…` (46 245 octetos), `plano` = `12621ce8…` (26 908 octetos). Batem byte a byte |

---

## Condições de liberação da rodada 2

**Podem aplicar como estão:** `20260823000006`, `20260823000008`, `20260823000009` — depois
de RD2-04 e RD2-07, que **não** mudam `md5(prosrc)` de nenhuma das duas funções pinadas
(RD2-04 vive no bloco `DO` de auto-verificação, fora do delimitador; RD2-07 é comentário
`--` fora do corpo… ⚠ **confirmar isto**: se a nota de RD2-07 for escrita DENTRO do corpo da
função, o `md5` muda e os re-pins têm de ser refeitos. Escrever no `COMMENT ON FUNCTION` e
no bloco acima do `CREATE`, nunca dentro do `$…$`).

**Não podem aplicar antes do conserto:**
1. **RD2-01** — `20260823000007`. Não reabre pin nenhum.
2. **RD2-02** — `p46_purga_smoke.sql`, `(o.7)` + `RESUMO (z)` 15 → 16. Não reabre pin nenhum.

**Antes do 46-06, e registrado no `46-06-PLAN.md` agora:**
3. **RD2-03** — a EF sonda a autorização antes do Storage.
4. **RD2-05**, **RD2-06** — reconciliação depois do kill switch; portão sobre o valor da janela.

RD2-08, RD2-09, RD2-10 podem viajar junto de qualquer um dos acima.

**Não peço terceira rodada de review completa.** Os consertos acima são localizados, nenhum
toca guard de autorização, e nenhum re-emite ACL. Um diff-check dirigido aos seis pontos
basta.

---

_Reviewed: 2026-08-22 (rodada 2)_
_Reviewer: Claude (gsd-code-reviewer) — modo adversarial_
_Depth: deep (diff de `6029f94` + leitura integral de `20260823000009` + simulação de ACL + cálculo dos dois md5 + inventário das sete chamadas do 4º ramo)_
