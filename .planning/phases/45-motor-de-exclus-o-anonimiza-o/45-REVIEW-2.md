---
phase: 45-motor-de-exclus-o-anonimiza-o
reviewed: 2026-08-11T00:00:00Z
review_round: 2
supersedes: 45-REVIEW.md
depth: deep
scope: motor destrutivo da Phase 45 apos o plano 45-13 (7 migrations + Edge Function + smoke), ANTES do primeiro apply
files_reviewed: 8
files_reviewed_list:
  - supabase/migrations/20260805000005_p45_plano_e_dry_run.sql
  - supabase/migrations/20260805000006_p45_anonimizar_candidato.sql
  - supabase/migrations/20260805000009_p45_claims_do_titular.sql
  - supabase/functions/executar-direito-titular/index.ts
  - supabase/functions/executar-direito-titular/helpers.ts
  - supabase/tests/p45_motor_exclusao_smoke.sql
  - supabase/migrations/20260805000001_p45_pedido_exclusao.sql
  - supabase/migrations/20260805000002_p45_rpc_pedido_exclusao.sql
findings:
  critical: 3
  warning: 7
  info: 0
  total: 10
status: findings
gate_verdict: REPROVADO — 3 BLOCKER abertos. O portão destrutivo NÃO abre.
---

# Phase 45 — Code Review BLOQUEANTE nº 2 do motor destrutivo (pós-45-13)

**Reviewed:** 2026-08-11
**Depth:** deep (SQL ↔ Deno ↔ catálogo de origem ↔ smoke, atacando os DOIS mecanismos novos)
**Status:** `findings` — **3 BLOCKER**, 7 WARNING
**Veredito do portão:** **REPROVADO.** Blocker aberto = portão fechado. Nenhum `apply_migration` de
`20260805000005`, `000006` ou `000009` antes de BL-01 e BL-02 estarem fechados.

---

## Sumário

Quatro dos seis blockers do `45-REVIEW.md` estão **fechados de verdade** — CR-03, CR-04 e CR-06
com mecanismo e asserção que mordem, e CR-02 com uma conferência que de fato mudou de objeto. O
trabalho é de qualidade alta e as asserções novas (C7, B11, a fixture de intruso, a asserção de
catálogo composta) são honestas.

**O que reprova está nos dois mecanismos que ninguém tinha revisado ainda, e o primeiro é fatal:**

1. **BL-01 — o guard de INTENÇÃO tem uma porta NULL.** A metade (c) é escrita como
   `IF NOT p_dry_run THEN <guard> END IF`. Com `p_dry_run = NULL`, `NOT NULL` avalia NULL, o `IF`
   **não é tomado**, e o guard de intenção **não roda**. E o terminador do dry-run
   (`IF p_dry_run THEN RAISE P45DR`) também não é tomado, então **a transação COMMITA**. É
   literalmente o defeito NULL-aberto que este mesmo arquivo proíbe em três comentários
   (`:326-330`, `:378-383`) e que a asserção C2 existe para pegar — reintroduzido **dentro do guard
   escrito para fechar o CR-01**. O cenário 1 do CR-01 está inteiramente de pé; o cenário 2 fica de
   pé para `administrador`.

2. **BL-02 — a lista `v_severadas` do CR-05 SUBTRAI da enumeração quatro colunas que o tombstone
   severa em escopo MENOR do que a subtração alega.** `bloqueadores_deleteuser` pode voltar `[]`
   com um bloqueador real de pé; a EF prossegue, o passo 1 destrói o currículo, e o `deleteUser` do
   passo 3 falha com 23503 de forma repetível. O contrato que o próprio corpo declara ("quem
   acrescenta uma FK nova não precisa fazer nada — ela aparece sozinha") é justamente o que essa
   subtração desativa em silêncio.

3. **BL-03 — o WR-03 (revalidação de prefixo) desarmou o guard G13.** A filtragem de prefixo
   acontece **antes** do `doBanco > 0 && doList === 0`, então um titular cujos ponteiros estejam
   todos fora do prefixo passa a ter `doBanco = 0`, o motor não para, o passo 1 carimba com zero
   objetos e o recibo afirma que o currículo foi apagado. O guard de falha fechada estrutural que o
   review anterior conferiu como CORRETO deixou de morder exatamente no caso que ele existia para
   pegar.

Um comentário sobre a forma do relatório do 45-13: ele afirma "os seis blockers estão fechados no
disco". Isso é verdade para quatro. Dois foram fechados **na forma** e reabertos **no mecanismo**,
e a asserção nova de cada um não os alcança — a C7 chama com `false` explícito e nunca com NULL; a
asserção de `bloqueadores_deleteuser` mede "pelo menos um titular vem vazio", que é satisfeita por
uma enumeração com falso-negativo.

---

## BLOCKERS

### BL-01 · `p_dry_run := NULL` pula o guard de INTENÇÃO **e** o rollback do dry-run — o CR-01 está reaberto por inteiro

**Arquivos:**
`supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:350-363` (metade (b), duas formas)
`supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:393-406` (metade (c), o guard novo)
`supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:724-729` (o terminador do dry-run)
`supabase/migrations/20260805000009_p45_claims_do_titular.sql:180` (o `GRANT` a `authenticated`)

**Issue.** O parâmetro é `p_dry_run boolean DEFAULT true` e o corpo o consulta em **três** pontos,
todos por avaliação booleana direta:

```sql
-- :350   IF p_dry_run THEN <papel de LEITURA> ELSE <papel DESTRUTIVO> END IF;
-- :393   IF NOT p_dry_run THEN <GUARD DE INTENCAO> END IF;
-- :724   IF p_dry_run THEN RAISE ... USING ERRCODE = 'P45DR'; END IF;
```

Com `p_dry_run = NULL` (que é um valor perfeitamente construível — PostgREST converte um `null`
JSON em SQL NULL para o argumento nomeado, e no SQL Editor basta `SELECT
public.anonimizar_candidato('<id>'::uuid, NULL)`), o PL/pgSQL avalia:

| ponto | expressão | valor | efeito |
|---|---|---|---|
| `:350` | `p_dry_run` | NULL → não tomado | cai no **ELSE**, o ramo destrutivo do papel |
| `:393` | `NOT p_dry_run` | NULL → não tomado | **o guard de intenção NÃO EXECUTA** |
| `:724` | `p_dry_run` | NULL → não tomado | **não levanta `P45DR`; a transação COMMITA** |

Ou seja: a chamada recebe a metade (b) *mais estrita* e o guard (c) *inexistente*, e persiste.

**Cenário concreto 1 (o titular, idêntico ao cenário 1 do CR-01 original).** Titular `T` logado em
`/candidato/privacidade`, com o client anon que a aplicação já usa:

```js
await supabase.rpc('anonimizar_candidato', { p_candidato_id: <o id dele>, p_dry_run: null })
```

- metade (a): `auth.uid()` presente → passa.
- metade (b), ramo ELSE: `v_role IS DISTINCT FROM 'administrador'` é TRUE, mas
  `v_dono IS DISTINCT FROM v_uid` é **FALSE** (ele é o dono) → o `AND` é FALSE → **não recusa**.
- metade (c): pulada.
- corpo executa; `:724` não dispara; `RETURN ... 'resultado','anonimizado'`.

Desfecho: PII destruída **sem pedido nenhum em `solicitacoes_dados`**, fora dos 15 dias do
ERASE-06, sem `storage_concluido_em`, sem recibo, sem trilha. E é **pior que antes do 45-13**,
porque agora não existe sequer o pedido que o CR-03 usa para reencontrar a sessão: `candidatos.user_id`
virou NULL, `.eq("user_id", user.id)` deixa de casar, e o reencontro do `index.ts:504-534` exige
`plano->>auth_uid` — que não existe. **O currículo fica órfão no bucket para sempre** (sem PITR,
Storage fora do backup) e o titular passa a receber 403 em toda tela de privacidade, sem caminho
de operador.

**Cenário concreto 2 (o `administrador`).** A metade (b) do ramo ELSE aceita `administrador`
**incondicionalmente**. Com `p_dry_run := null`, um administrador destrói a PII de **qualquer**
candidato, sem pedido, sem janela e sem recibo — a opção B tirou o ator `rh` do cenário 2, mas o
guard de intenção, que era o que restringiria o `administrador`, não roda.

**Por que a C7 não pega.** A asserção nova (`p45_motor_exclusao_smoke.sql:1586-1644`) chama
`public.anonimizar_candidato(v_fake, false)` — `false` **literal**. O bloco `DO` da migration
(`:1374-1425`) faz o mesmo nos três casos (vi.a/vi.b/vi.c). Nenhum caso exercita NULL, e nenhuma
das duas suítes tem um caso que o exercite.

**Fix.** Duas linhas, e as duas são necessárias (fechar só uma deixa a outra metade do defeito):

```sql
  -- Logo depois da metade (a), ANTES de qualquer leitura:
  -- ⚠ p_dry_run NULL nao e "modo seguro": com NULL, `IF p_dry_run` nao e tomado (o ramo
  --   destrutivo do papel), `IF NOT p_dry_run` TAMBEM nao e tomado (a metade (c) nao roda),
  --   e `IF p_dry_run THEN RAISE P45DR` nao e tomado (a transacao COMMITA). E o mesmo
  --   NULL-aberto que este arquivo proibe em NOT IN, no parametro em vez de na coluna.
  IF p_dry_run IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: p_dry_run NULO nao e vocabulario desta funcao — o modo seguro e o DEFAULT true, e apagar exige dizer false EXPLICITAMENTE'
      USING ERRCODE = '42501';
  END IF;
```

e, como cinto (para o caso de alguém remover a recusa acima), tornar os dois ramos NULL-seguros por
construção: `IF coalesce(p_dry_run, true) THEN` em `:350` e `:724`, e
`IF NOT coalesce(p_dry_run, true) THEN` em `:393`.

⚠ E acrescentar **um quarto caso à C7 e ao bloco `DO`**: chamada com `p_dry_run := NULL` sob claims
de `administrador` sobre um candidato **sem pedido** tem de recusar com `42501` — nunca retornar
`anonimizado`, nunca retornar `P45DR`. Sem esse caso, o fix é indistinguível de ausente na próxima
leitura. O contador FIXO do smoke sobe de 23 para 24, com o cabeçalho e o bloco `(z)` no mesmo commit.

---

### BL-02 · `v_severadas` subtrai quatro colunas que o tombstone severa em escopo MENOR — `bloqueadores_deleteuser` pode voltar VAZIA com um bloqueador de pé

**Arquivos:**
`supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:155-166` (a lista)
`supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:244-275` (a enumeração e a subtração)
`supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:521-526` (`candidatos.*`, escopado a `c.id`)
`supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:558-565` (`candidaturas.*`, escopado a `c.candidato_id`)
`supabase/functions/executar-direito-titular/index.ts:1076-1079` (o consumo, que é a recusa)

**Issue.** A enumeração pergunta ao catálogo, por `(tabela, coluna)`, se existe **qualquer** linha
viva apontando ao `user_id` do titular:

```sql
EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I t WHERE t.%I = $1)', ...) USING v_user_id;
```

— sem escopo de candidato, o que está **certo**, porque a pergunta é sobre o `deleteUser`. Mas a
lista subtraída antes do laço (`<> ALL (v_severadas)`) contém quatro pares cuja severação no
tombstone é **escopada à linha do titular**:

| par em `v_severadas` | o que o tombstone de fato faz |
|---|---|
| `public.candidatos.created_by` | `UPDATE public.candidatos ... WHERE c.id = p_candidato_id` (`000006:526`) |
| `public.candidatos.updated_by` | idem |
| `public.candidaturas.created_by` | `UPDATE public.candidaturas ... WHERE c.candidato_id = p_candidato_id` (`000006:565`) |
| `public.candidaturas.updated_by` | idem |

As quatro são FKs **`NO ACTION` para `auth.users`** — `45-SONDAS-PROD.md:210-213` (achados D6 e D7)
as lista nominalmente. Uma linha de **outro** candidato cujo `created_by`/`updated_by` seja este
`user_id` **não é severada** e **não é enumerada**.

**Cenário concreto.** Conta híbrida candidato+RH — a mesma que a SONDA 6 mediu viva em PROD e que é
a razão de existir do CR-05. A persona RH escreveu `updated_by` na linha de `public.candidatos` de
outra pessoa (ou `candidaturas.updated_by` numa candidatura de outra pessoa). A persona candidato
pede exclusão:

1. passo 0 → `plano_exclusao_titular` → `candidatos.updated_by` está em `v_severadas`, é
   **subtraída**, não entra no laço → `bloqueadores_deleteuser = []`;
2. `index.ts:1077` vê `[]` e **não recusa**;
3. passo 1 destrói os currículos, irreversivelmente;
4. passo 2 escreve o tombstone, severando `updated_by` **só na linha dele**;
5. passo 3 → `deleteUser` → **23503** (`candidatos_updated_by_fkey`) → `causa='falha_auth'`, 500;
6. retomada (que agora existe, CR-03) → passos 1 e 2 pulados por carimbo → passo 3 → **23503 de
   novo, para sempre**.

Estado terminal: currículo destruído, `auth.users` com o e-mail real do titular **vivo
permanentemente**, recibo nunca enviado. É exatamente o desfecho que o CR-05 nomeou, com a recusa
barata que o 45-13 escreveu para evitá-lo **desativada pela própria lista que ele introduziu**.

⚠ Reachability honesta: a SONDA 6 §6a mediu **0 linhas** nessas quatro colunas hoje. Isto é um
defeito de **contrato**, não um incidente em curso. Mas o contrato declarado no próprio corpo —
*"quem acrescenta uma FK NOVA ao schema não precisa fazer nada, ela aparece sozinha como
bloqueador"* (`000005:141-145`) — é o que a subtração desativa, e a asserção escrita ("pelo menos um
titular vivo vem com a lista VAZIA", `000005:548-550`) é satisfeita por uma enumeração com
falso-negativo. O gate não pode distinguir "vazia porque não há bloqueador" de "vazia porque foi
subtraída".

**Fix.** A lista tem de conter **apenas** os pares que o tombstone severa em escopo de `user_id`
inteiro, e os quatro escopados por linha têm de ser enumerados com o **mesmo escopo** da severação:

```sql
  -- ⚠ SO entram aqui os pares que o tombstone severa para TODO o user_id, sem escopo de
  -- candidato. Os quatro de autoria (candidatos/candidaturas .created_by/.updated_by) sao
  -- severados APENAS nas linhas DESTE candidato — subtrai-los inteiros faz a enumeracao
  -- devolver [] com um bloqueador de pe, e o 23503 volta a acontecer DEPOIS do passo 1.
  v_severadas text[] := ARRAY[
    'public.candidatos.user_id',
    'public.historico_candidatura.ator',
    'public.logs_acesso.user_id',
    'public.autorizacoes.user_id',
    'public.preferencias_notificacoes.created_by',
    'public.preferencias_notificacoes.updated_by'
  ];
  -- e, para os quatro de autoria, o probe passa a excluir as linhas que o tombstone alcanca:
  --   candidatos:   ... WHERE t.<col> = $1 AND t.id <> $2
  --   candidaturas: ... WHERE t.<col> = $1 AND t.candidato_id <> $2
```

**Alternativa equivalente e mais simples** (menos SQL dinâmico): tornar a severação tão larga quanto
a subtração — `UPDATE public.candidatos SET created_by = NULL WHERE created_by = v_user_id` (sem o
`WHERE c.id = p_candidato_id`), idem para `candidaturas`. Isso torna `v_severadas` verdadeira como
escrita. ⚠ Se essa saída for a escolhida, ela tem consequência declarável: linhas de OUTRAS pessoas
perdem o registro de autoria — o que é aceitável para `created_by`/`updated_by` (não são prova de
avaliação humana, ao contrário de `decisao_final.por_usuario`), mas precisa estar escrito no
`COMMENT` para não ser redescoberto como surpresa.

E a asserção de `000005` precisa de um caso novo que **prove a subtração**: uma fixture com
`candidatos.updated_by = <uid do titular>` numa linha de OUTRO candidato tem de fazer
`bloqueadores_deleteuser` vir **não-vazia**. Hoje nenhuma asserção mede isso.

---

### BL-03 · O WR-03 desarmou o guard G13 — ponteiros todos fora do prefixo passam por "não há currículo", e o recibo mente

**Arquivo:** `supabase/functions/executar-direito-titular/index.ts:1106-1119`

**Issue.** A ordem das duas peças é o defeito:

```ts
const doBanco       = ponteiros.filter((v) => v.startsWith(prefixo) && !v.includes(".."));  // :1107
const foraDoPrefixo = ponteiros.filter((v) => !doBanco.includes(v));                        // :1108
// ...
if (doBanco.length > 0 && doList.length === 0) throw new ErroDePasso("storage", "estrutura_vazia"); // :1117
```

Antes do 45-13, `doBanco` era a lista **crua** de `candidaturas.curriculo_url`, e o guard G13 dizia:
*"ponteiros vivos com enumeração vazia é a enumeração quebrada — pare antes de qualquer mutação"*.
Agora a filtragem acontece **antes** do guard, então o caso mais suspeito de todos —
**ponteiros vivos que não casam o prefixo do titular** — produz `doBanco = 0` e o guard **não
dispara**.

**Cenário concreto.** Titular com 3 candidaturas cujos `curriculo_url` foram gravados por um caminho
legado/importado com outro esquema de prefixo (exatamente a hipótese que o comentário de WR-03
levanta para justificar a filtragem). A enumeração do bucket devolve `[]` porque o prefixo
`{authUid}/` está errado para essa conta.

- `doBanco = []`, `foraDoPrefixo = [3 caminhos]`, `doList = []` → **G13 não dispara**;
- `caminhos = []` → o laço do passo 1 não roda;
- a re-enumeração devolve `[]` → `restantes.length === 0` → **carimba `storage_concluido_em`**;
- passos 2, 3, 4 correm; o recibo é enviado com `tem_curriculo: false`
  (`index.ts:1141`, `caminhos.length > 0`);
- **os três CVs continuam no bucket**, agora sem nenhuma linha que os aponte (`curriculo_url` foi
  anulado pelo CR-04) e sem conta do Auth cujo prefixo os enumere.

O titular recebeu uma declaração de conformidade sobre arquivos que continuam existindo, e nenhum
caminho futuro consegue encontrá-los. O `achados_resumo.fora_do_prefixo = 3` fica registrado — mas
como **achado**, não como parada, exatamente como o comentário de `:1103-1105` declara
intencionalmente.

**Fix.** O guard tem de rodar sobre os ponteiros **antes** da filtragem, e ganhar o caso novo:

```ts
  // ⚠ G13 mede os PONTEIROS CRUS, nao os filtrados: filtrar antes desarma exatamente o caso
  // mais suspeito (ponteiro vivo que nao casa o prefixo + enumeracao vazia = a convencao de
  // caminho mudou, ou o prefixo esta errado para esta conta).
  if (ponteiros.length > 0 && doList.length === 0) {
    throw new ErroDePasso("storage", "estrutura_vazia");
  }
  // E: descartar TODOS os ponteiros nao pode ser silencioso.
  if (ponteiros.length > 0 && doBanco.length === 0) {
    throw new ErroDePasso("storage", "todos_os_ponteiros_fora_do_prefixo");
  }
```

O teste `(v)` do `index.test.ts` (que o SUMMARY lista como cobertura de G13) precisa de um caso
irmão: ponteiros vivos **fora do prefixo** com `list()` vazio → o motor PARA, sem carimbo.

---

## WARNINGS

### WR-A · A retomada do passo 1 NÃO é convergente quando o bucket ganha um objeto depois do passo 0

**Arquivo:** `supabase/functions/executar-direito-titular/index.ts:809-882`

O `plano.caminhos` é congelado no passo 0 e **nunca recomputado** numa retomada
(`if (!plano || !Array.isArray(plano.caminhos))` em `:810`). A conferência final, porém, é sobre o
**pós-estado** do prefixo inteiro (`:859-863`). Qualquer objeto que apareça sob `{authUid}/` depois
do passo 0 nunca entra em `caminhos`, nunca é removido, e faz `restantes.length > 0` — que **lança
sem carimbar**, em toda tentativa, para sempre. É a forma exata do CR-02 com gatilho mais estreito:
os CVs originais já foram destruídos, a PII segue intacta, e o passo 1 não passa mais.

Gatilho realista: o titular sobe um CV novo entre uma tentativa que falhou (rede, timeout de Deno)
e a retomada — nada nesta fase impede novas candidaturas durante os 15 dias.

**Fix.** Na retomada, unir o pós-estado ao plano antes de reprovar:

```ts
const restantes = await enumerarObjetosTitular(supabaseAdmin, `${authUid}/`)...;
if (restantes.length > 0) {
  // ⚠ Objeto novo sob o prefixo NAO e residuo de uma remocao que falhou: e um objeto que o
  // passo 0 nao viu. Reprovar aqui trava o passo 1 PARA SEMPRE depois de os CVs originais
  // ja terem sido destruidos — que e o CR-02 com outro gatilho.
  const { error } = await supabaseAdmin.storage.from(BUCKET_CURRICULOS).remove(restantes);
  if (error) throw new ErroDePasso("storage", "remove_residuo");
  const aindaRestam = await enumerarObjetosTitular(supabaseAdmin, `${authUid}/`)...;
  if (aindaRestam.length > 0) throw new ErroDePasso("storage", "residuo_apos_remove");
  plano.caminhos = [...new Set([...(plano.caminhos ?? []), ...restantes])].sort();
}
```

---

### WR-B · A enumeração de bloqueadores só vê FKs **DIRETAS** para `auth.users` — e o bloqueador MEDIDO era transitivo

**Arquivos:** `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:252-260`;
`45-SONDAS-PROD.md:36` (achado D11), `:383`

O predicado é `c.confrelid = 'auth.users'::regclass`. O bloqueador **real** que a SONDA 6 mediu para
o titular puro era `historico_candidatura.candidatura_id`, alcançado **transitivamente**
(`auth.users --CASCADE--> candidatos --CASCADE--> candidaturas --NO ACTION--> historico`). Essa
cadeia específica está cortada hoje pela S1 (`000004` transforma `candidatos.user_id` em SET NULL),
então o caso medido está fechado — mas a enumeração **não consegue vê-lo**, e o `COMMENT` que vai
para o catálogo vivo afirma que ela lista "os bloqueadores do deleteUser". Uma FK CASCADE nova de
`auth.users` para uma tabela com filha `NO ACTION` reproduz o 23503 com a lista vazia.

**Fix.** Ou (a) escrever o fecho transitivo (percorrer as CASCADE a partir de `auth.users` e coletar
as `NO ACTION`/`RESTRICT` alcançadas), ou (b) — mais barato e honesto — restringir a afirmação do
`COMMENT` e do `motivo` ao que a chave de fato mede: *"as FKs DIRETAS para auth.users que bloqueiam.
Bloqueadores TRANSITIVOS por cadeia de CASCADE não são enumerados; a S1 cortou a única cadeia
medida (SONDA 6 §6b) e uma cadeia nova reintroduz o defeito"*. O padrão P39/CR-02 é exatamente
afirmar mais do que o mecanismo entrega.

Na mesma consulta: `array_length(c.conkey, 1) = 1` (`:257`) descarta FKs compostas em silêncio —
uma FK composta `NO ACTION` para `auth.users` bloquearia o delete e não apareceria. Registrar a
limitação em comentário, no mínimo.

---

### WR-C · Quando `candidatos.user_id` já é NULL, a enumeração de bloqueadores mede **nada** e devolve `[]` — enquanto o `deleteUser` continua sendo chamado com o `authUid` do JWT

**Arquivos:** `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:244`;
`supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:465-467` (o WR-06);
`supabase/functions/executar-direito-titular/index.ts:970`

A enumeração inteira está dentro de `IF v_user_id IS NOT NULL THEN` — ela chaveia em
`candidatos.user_id`. A EF, porém, apaga `ctx.authUid`, que vem do **JWT**. No estado que o próprio
WR-06 documenta como alcançável (`user_id` já NULL sem que a linha seja tombstone, criado pela FK
SET NULL da `000004`), os dois divergem: `bloqueadores_deleteuser` volta `[]` **por vacuidade**, o
tombstone pula TODAS as severações guardadas por `v_user_id` — inclusive
`preferencias_notificacoes.created_by`, que é o bloqueador medido do CR-05 — e o `deleteUser` bate
no 23503 depois do passo 1. As três peças do CR-05 se anulam nesse estado.

**Fix.** Aceitar o uid por parâmetro quando ele diverge, ou (mais simples) fazer a EF recusar antes
do passo 1 quando `plano.user_id_presente === false` — a chave já existe (`000005:281`):

```ts
// ⚠ user_id NULO com sessao viva e o estado do WR-06: a enumeracao de bloqueadores mede
// VAZIO por vacuidade e o tombstone pula todas as severacoes por user_id. Recusar aqui
// custa zero; seguir custa o curriculo.
if ((planoBanco as Record<string, unknown>)?.user_id_presente === false) {
  throw new ErroDePasso("postgres", "user_id_ausente");
}
```

---

### WR-D · `bloqueadores_deleteuser` não é reavaliado numa retomada

**Arquivo:** `supabase/functions/executar-direito-titular/index.ts:809-813`, `:1076-1079`

A recusa por bloqueadores vive dentro de `montarPlano`, que só roda quando o `plano` ainda não
existe. Numa execução retomada (o caminho que o CR-03 acabou de criar), o passo 0 é pulado e a
lista **não é reconsultada** — um bloqueador que apareça entre o passo 0 e o passo 3 (a conta
híbrida cria uma vaga, por exemplo) chega direto ao `deleteUser`. Barato de fechar: reler
`plano_exclusao_titular` (é `STABLE`) imediatamente antes do passo 3, junto com a releitura do
`postgres_concluido_em` que já acontece em `:952-958`.

---

### WR-E · O plano persistido é consumido sem forma verificada — um `plano` sem `contagens`/`achados_resumo` estoura DEPOIS do `remove()`

**Arquivo:** `supabase/functions/executar-direito-titular/index.ts:869-870`

A única condição para reusar o plano persistido é `Array.isArray(plano.caminhos)` (`:810`). As
linhas `plano.achados_resumo.nao_devolvidos = …` e `plano.contagens.storage_remove = …` rodam
**depois** do laço de remoção. Um plano gravado por outra versão (rollback de deploy, edição
manual) sem uma dessas duas chaves lança `TypeError`, que **não é `ErroDePasso`** — o `catch` de
`:1027` atribui a falha a `"postgres"` por default, gravando `causa='falha_postgres'` para uma
execução que parou **no Storage, depois de apagar os arquivos**. A `causa` é, pelo próprio docblock,
"a única pergunta que importa às 3 da manhã", e nesse caminho ela mente. E a retomada repete o mesmo
`TypeError` indefinidamente.

**Fix.** Normalizar na leitura, junto com a checagem de `caminhos`:

```ts
plano.contagens      ??= {};
plano.achados_resumo ??= { blob_orfao: 0, ponteiro_morto: 0 };
```

---

### WR-F · `plano_exclusao_titular` deixou de ser só um contador: sob o `GRANT` a `authenticated` e o papel `rh`, ela virou um sonda de autoria arbitrária

**Arquivos:** `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:214-219` (o guard aceita `rh`),
`:244-275` (o laço dinâmico), `20260805000009:175`

A metade (b) desta função continua aceitando `rh` — decisão registrada e defensável para um plano de
contagens. Mas o 45-13 acrescentou ao corpo um laço que executa `SELECT EXISTS` contra **toda tabela
do catálogo com FK `NO ACTION` para `auth.users`**, sob `SECURITY DEFINER` (logo, ignorando RLS), com
o `user_id` do candidato escolhido pelo chamador. Um `rh` passa a poder mapear, para qualquer
titular, em quais tabelas do sistema aquele `auth.users.id` aparece como autor — incluindo tabelas de
RH (`usuarios_rh`, `vagas`, `sessoes_ativas`, `vagas_associadas_recrutadores`, listadas em
`45-SONDAS-PROD.md:218-219`). Isso não estava no escopo que justificou o `GRANT`, e a assimetria com
`anonimizar_candidato` (que perdeu o `rh` no caminho destrutivo) sugere que a extensão de leitura
passou sem a mesma pergunta.

O SQL dinâmico em si está **correto** — `%I` nos identificadores, valor por `USING`, e o `EXECUTE` de
um `SELECT` não viola `STABLE`. O achado é de superfície, não de injeção.

**Fix.** Restringir `bloqueadores_deleteuser` ao chamador que precisa dela (o motor), devolvendo
apenas a **contagem** para `rh` e a lista nominal para `administrador`/dono; ou registrar a decisão
no `COMMENT`, com uma linha dizendo por que a exposição é aceitável.

---

### WR-G · O `UPDATE` novo em `candidaturas` carimba `updated_at` idêntico em todas as linhas do titular — um quase-identificador que a asserção B9 não mede

**Arquivos:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:558-565`;
`docs/sql/sql/13-tabela-candidaturas.sql:146` (`update_candidaturas_updated_at`, BEFORE UPDATE, **sem**
escopo de coluna)

O tombstone passou a tocar `candidaturas` (correto, CR-04), o que dispara o trigger genérico de
`updated_at`. Todas as candidaturas do titular ficam com **exatamente o mesmo** `updated_at`,
diferente do de qualquer outra linha da tabela, e igual ao instante da anonimização. Isso é um
carimbo de agrupamento que liga entre si as candidaturas de um tombstone e as data o momento da
exclusão — a asserção B9 (`smoke:983-989`) mede faixa + UF + vaga + timestamp da candidatura e
**não** olha `updated_at`.

Não é re-identificação sozinha (não aponta a pessoa), mas é um vetor de ligação novo criado por esta
fase. Registrar no `COMMENT` como resíduo declarado, ou preservar `updated_at` explicitamente no
`SET` (`updated_at = c.updated_at`) se o trigger permitir — e acrescentar a coluna à B9.

Verificado e **correto** no mesmo ponto: os três triggers de `UPDATE` sobre `candidaturas` que
disparam efeito externo são escopados por coluna (`OF status`, `OF etapa_atual`,
`OF encerrada_a_pedido_em`), então nenhum deles é acionado por este `UPDATE`.

---

## Veredito por blocker original

| # | veredito | evidência conferida |
|---|---|---|
| **CR-01** | **NÃO FECHADO** | A metade (c) existe e está correta para `p_dry_run = false` (`000006:393-406`, exercitada em três direções no `DO` `:1374-1425` e na C7 do smoke `:1586-1644`). A restrição de papel da opção B existe e morde (`:350-363`, exercitada nas duas direções em `:1330-1363`). O pressuposto virou asserção de catálogo composta e ela mede a propriedade certa — conferi contra o schema vivo: `solicitacoes_dados` tem RLS ligada (`20260804000002:179`) com **uma única** policy `FOR SELECT TO authenticated` (`:183-185`), zero policy de escrita; a `20260805000001` acrescenta duas colunas e recria os dois CHECK e **não cria policy nenhuma**; `registrar_pedido_exclusao` grava `situacao='agendado'` e `cancelar_pedido_exclusao` grava `'cancelado'` (`20260805000002:200`, `:284-286`), nenhuma das duas alcança `'executando'` nem `storage_concluido_em`. **O raciocínio do executor sobre a RLS está CERTO.** O que reprova é outra coisa: **BL-01** — `p_dry_run := NULL` pula a metade (c) inteira e commita. O cenário 1 do CR-01 está integralmente de pé, e o cenário 2 de pé para `administrador`. |
| **CR-02** | **fechado, com ressalva** | A conferência mudou de objeto de verdade (`index.ts:828-843` conta em vez de reprovar; `:859-863` mede o pós-estado). O `ponteiro_morto` deixou de travar o passo, e a retomada converge no caso que o CR-02 descreveu. WR-02 (marcador de pasta lança, `helpers.ts:172-177`) é de fato a precondição de a re-enumeração ser prova, e está escrito. A ressalva é **WR-A**: a convergência não é incondicional, e o `plano.caminhos` congelado abre um gatilho novo para o mesmo estado terminal. |
| **CR-03** | **fechado** | O reencontro existe (`index.ts:504-534`), só para `acao='executar'`, filtrado por `plano->>auth_uid` e com a comparação **refeita em código** (`:528`) — não apenas no filtro do PostgREST. A validação da `acao` subiu para antes da leitura privilegiada (`:452-454`), o que é uma melhoria real. A situação terminal entrou nas duas consultas (`:513`, `:729`) com razão escrita. A janela passo 3 → passo 4 continua sem retomada e está **declarada** como `DI-45-13-02`, não escondida. |
| **CR-04** | **fechado** | `curriculo_url` e `curriculo_nome_original` anuladas no tombstone (`000006:558-565`), escopadas ao candidato, com as LINHAS preservadas. A nullability das quatro colunas novas é **medida no catálogo antes do apply** (`:958-976`) — que é a resposta certa ao Pitfall 1. Asserção nova em dois lugares, e as duas medem a consulta de re-identificação por `split_part` devolvendo zero: `000006:1204-1219` e `smoke:1001-1004`, `:1223-1239`. Fixture com valores reais em ambos, com guard anti-vacuidade. |
| **CR-05** | **PARCIALMENTE FECHADO** | Parte 1 fechada: `preferencias_notificacoes.created_by/updated_by` severadas na mesma transação (`000006:690-696`), sem escopo de candidato — correta. Parte 2 escrita e consumida: a enumeração existe (`000005:244-275`) e a EF recusa **antes** da primeira mutação (`index.ts:1076-1079`), com "chave ausente não é recusa" justificado. As duas afirmações de "trata 23503 como CLASSE" saíram do `jsonb` e do `COMMENT`, e conferi que a frase **não reaparece** em lugar nenhum. **O que não fecha: BL-02** — a subtração de `v_severadas` produz falso-negativo para quatro pares, e o desfecho do falso-negativo é o desfecho do CR-05 original. Some-se **WR-B** (só FKs diretas) e **WR-C** (vacuidade quando `user_id` já é NULL). |
| **CR-06** | **fechado** | Igualdade + cinto secundário nos **dois** sítios: `000006:447-449` e `000005:193-195`. Fixture de INTRUSO real (`000006:1092-1109`, `:1247-1257`), que mede o campo `resultado` **e** confere que a linha mudou. Varredura do repositório: não existe um terceiro sítio — as únicas outras ocorrências de `ja_anonimizado` são o consumo na EF (`index.ts:909`, por igualdade de string) e a asserção B4 do smoke (`:1150`, regex sobre o texto do retorno, que é leitura de resultado e não predicado de tombstone). |

---

## Os 21 guards — sobreviveram?

| # | veredito | onde conferi |
|---|---|---|
| G1 | **sobreviveu na forma, violado na doutrina** | Zero `NOT IN` em guard de papel nas duas funções; as comparações continuam por `IS DISTINCT FROM` nas duas formas da metade (b) (`000006:351-353`, `:358-359`; `000005:214-216`). Mas a metade (c) NOVA (`:393`) é NULL-aberta pelo mesmo mecanismo — ver **BL-01**. O `NOT IN` de `20260805000007:230,464` (WR-07) continua **não corrigido**; segue fechado no dado atual (`etapa_atual` é `NOT NULL`), então não é defeito ativo. |
| G2 | **sobreviveu** | `IF v_uid IS NULL … 42501` intacto nas duas: `000005:174-177`, `000006:310-313`. Nada aceita `auth.uid()` NULL sob `service_role`. |
| G3 | **sobreviveu** | Titular não alcança dado alheio: `000006:1313-1328` (dry-run) e `:1352-1363` (destrutivo, papel `rh`). O ramo destrutivo ficou **mais** estrito. |
| G4 | **sobreviveu** | Faixa etária em `:478-489`, sentinela de `data_nascimento` em `:493-526` — a ordem está preservada e provada por valor em `:1146-1148` (`1991-03-14` → `35-44`). |
| G5 | **sobreviveu** | `decisao_final` em `:573-578`, `decisao_final_historico` em `:586-591`. Nenhum statement posterior toca o par — conferi todos os `UPDATE` até `:711`. O `UPDATE` novo em `candidaturas` (`:558`) fica **antes** dos dois, o que é a ordem certa. |
| G6 | **sobreviveu** | Varredura de `ALTER TABLE`/`DROP CONSTRAINT`/`DELETE FROM` nas sete migrations: zero ocorrência sobre `historico_candidatura`, `decisao_final` ou `decisao_final_historico`. Nenhuma linha é removida de tabela alguma. |
| G7 | **sobreviveu** | Zero SQL sobre a tabela de objetos do Storage em migration ou EF. As seis ocorrências do token são todas prosa ou string explicativa — e o desvio nº 1 do 45-13 (reescrever três delas) foi a correção certa para não reproduzir o token no arquivo cru. |
| G8 | **sobreviveu, com o furo do BL-01** | O dry-run continua terminando o MESMO corpo (`:724-729`), depois de todos os statements, e `anonimizar_candidato` continua **chamando** `plano_exclusao_titular` (`:413`). Não há segundo corpo. Mas com `p_dry_run = NULL` o terminador não dispara e o corpo persiste — ver **BL-01**. |
| G9 | **sobreviveu** | `P45DR` no caminho real é distinguido e vira `ErroDePasso("postgres","dry_run_no_caminho_real")` (`index.ts:899-903`), e a C7 o trata como FALHA (`smoke:1633-1635`). |
| G10 | **sobreviveu e melhorou** | `index.ts:968-975`: a rejeição vira `ErroDePasso("auth","delete_user")` e agora há também `try/catch` para a exceção síncrona. Hard delete explícito (`deleteUser(authUid, false)`). |
| G11 | **sobreviveu** | `index.ts:952-958` relê `postgres_concluido_em` do banco antes do passo 3. |
| G12 | **sobreviveu** | `helpers.ts:164-183`: paginação com teto (`MAX_PAGINAS`), erro de listagem lança, e o marcador de pasta agora **lança** em vez de ser descartado (WR-02). |
| G13 | **NÃO sobreviveu** | `index.ts:1117` — a filtragem de prefixo do WR-03 passou a rodar **antes** do guard, e o caso "ponteiros vivos fora do prefixo + enumeração vazia" deixou de parar o motor. Ver **BL-03**. |
| G14 | **sobreviveu** | A divisão do espaço de IDs está preservada e as chaves novas a seguem: `preferencias_notificacoes` por `v_user_id` (`000005:341-344`, `000006:690-694`), `candidaturas` por `p_candidato_id` (`000006:565`), `devolutivas_candidato` por `v_user_id` (`000005:297`). |
| G15 | **sobreviveu** | `dedupe_key` re-namespaceada com o PK da linha (`000006:709-710`). |
| G16 | **sobreviveu** | `network(set_masklen(...))` nos dois `inet` (`:639-640`, `:661-662`), provado por valor em `:1185-1191`. |
| G17 | **sobreviveu** | Sentinelas contra as sete CHECKs vivas, cada uma exercitada em `:1150-1178`. |
| G18 | **sobreviveu** | `ai_call_logs` com literal `jsonb` (`:604-608`); nenhum dos `UPDATE` do ERASE-09 pode abortar por `NOT NULL`. As quatro colunas novas ganharam medição de nullability própria (`:958-976`). |
| G19 | **sobreviveu** | `20260805000003` não foi tocada pelo 45-13 (`git diff --stat` das cinco commits confirma). |
| G20 | **sobreviveu** | Os cinco commits (`5e6e2c8`, `11c137f`, `26e2a26`, `8a95e6f`, `d322f88`) estão no histórico e nenhum aparece com bypass. |
| G21 | **sobreviveu, com ressalva** | O ACL não foi tocado; as outras quatro RPCs continuam não-destrutivas e escopadas. A ressalva é **WR-F**: `plano_exclusao_titular` ganhou capacidade de leitura nova sob o mesmo `GRANT`. |

**A C2 continua válida, e a validade foi verificada pela CONSEQUÊNCIA, não pelo diff.** Ela chama
`anonimizar_candidato(<uuid sintético>, true)` — dry-run. No contexto «papel candidato», o dono
resolve NULL (uuid inexistente), as três comparações da **forma de leitura** da metade (b) são TRUE
e a função recusa com `42501`; no contexto «SEM CLAIM NENHUMA», a metade (a) recusa antes. As dez
recusas continuam medindo o que declaram. ⚠ O que a C2 **não** cobre, e nunca cobriu: o ramo
destrutivo, e o valor NULL do `p_dry_run` — que é onde está o BL-01.

---

## Condição de reabertura do portão

1. **BL-01** — `p_dry_run` NULO recusado explicitamente **e** os três ramos tornados NULL-seguros
   por `coalesce`, com um quarto caso na C7 e no bloco `DO` (`NULL` sob `administrador`, sem pedido,
   tem de dar `42501`). Contador FIXO do smoke: 23 → 24, com cabeçalho e bloco `(z)` no mesmo commit.
2. **BL-02** — `v_severadas` reduzida aos pares severados em escopo de `user_id` inteiro **ou** as
   quatro severações de autoria alargadas para o `user_id` inteiro; com asserção nova em `000005`
   que prove que uma linha de OUTRO candidato com `updated_by = <uid do titular>` faz
   `bloqueadores_deleteuser` vir **não-vazia**.
3. **BL-03** — o guard de falha fechada estrutural medido sobre os ponteiros **crus**, mais a recusa
   quando todos os ponteiros caem fora do prefixo; com o teste irmão de `(v)` no `index.test.ts`.

Os sete WARNINGs não bloqueiam o apply. **WR-A, WR-C e WR-E** deveriam ser fechados antes da
execução real da Task 3 do 45-11: os três produzem estados terminais depois do passo 1, que é
exatamente o custo que esta fase existe para não pagar.

⚠ Nota de handoff, sem achado: os `md5(prosrc)` da tabela do `45-13-SUMMARY.md` foram
**recomputados por execução** contra os arquivos no disco e conferem —
`plano_exclusao_titular = 42237a680e00bb01d7d79d649eb13dbe` (17155 octetos) e
`anonimizar_candidato = 3bb0c38181ff91b721bc21f416ebd46b` (31267 octetos), com cada delimitador
aparecendo exatamente duas vezes e o corpo extraído começando em `\nDECLARE` e terminando em
`);\nEND;\n`. ⚠ **Se BL-01, BL-02 ou BL-03 forem corrigidos, os dois valores mudam** e a tabela do
`45-13-SUMMARY.md` fica inválida — o commit do fix tem de recomputá-los, ou a C3 do 45-11 vira uma
parada imediata por uma edição legítima.

---

_Reviewed: 2026-08-11_
_Reviewer: Claude (gsd-code-reviewer), depth=deep, round 2_
_Escopo: motor destrutivo da Phase 45 após o plano 45-13. Phase 47 fora de escopo._
