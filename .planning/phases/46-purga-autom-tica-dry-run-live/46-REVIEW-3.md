---
fase: 46-purga-automatica-dry-run-live
tipo: re-revisao adversarial dos CONSERTOS do 46-REVIEW-2
escopo_diff: 13e5302..HEAD (7 commits)
revisado_em: 2026-08-23
profundidade: deep
arquivos_revisados: 6
alvo: 46-REVIEW-FIX.md (BL-01, HI-01 … HI-05)
status: issues_found
veredito: ACHADOS — 2 BLOCKERS, os DOIS introduzidos pelo proprio conserto
exige_reverter_prod: false
seguro_aplicar: NAO AINDA — o apply em si e inofensivo e reversivel, mas a
  EVIDENCIA dele (passo 4) esta quebrada e o ultimo recurso do runbook NAO
  EXECUTA. Os dois consertos sao edicoes de arquivo, nenhum toca PROD.
achados:
  blocker: 2
  high: 5
  medium: 6
  low: 4
  total: 17
consertos_que_de_fato_consertam: 5 de 6 (BL-01 parcial, HI-01 com escopo largo
  demais, HI-02 · HI-03 · HI-04 solidos, HI-05 mais fraco do que a prosa diz)
---

# Phase 46 · Re-revisao adversarial dos consertos do `46-REVIEW-2.md`

**Escopo:** `13e5302..HEAD`.
**Metodo:** leitura da fonte + introspecao **read-only** do banco vivo pela mesma via de apply
(`node p46apply.cjs sql`, exclusivamente `SELECT` de catalogo). **Nenhuma mutacao em PROD.**
Nenhuma migration aplicada, nenhuma funcao publicada, nenhum smoke executado.
**Nao reaberto:** rodadas 1–4 (`46-REVIEW.md`) nem os MEDIUM/LOW do `46-REVIEW-2.md` que o
fixer declarou fora de escopo.

---

## ⚠ PRIMEIRO, A PERGUNTA QUE VEM ANTES DE TODAS

### A execucao das 03:00 de hoje continua sem poder destruir linha real ou enfileirar `net.http_post` — e isso vale ANTES e DEPOIS de aplicar as duas migrations.

Percorri os dois arquivos statement a statement e cruzei com o estado vivo:

| Fato | Como foi medido | Resultado |
|---|---|---|
| `…0014` muta dado? | leitura integral | **Nao.** Um `DO` de catalogo (so `SELECT` em `pg_constraint`/`pg_attribute`), um `CREATE OR REPLACE FUNCTION`, um `REVOKE`/`GRANT` de EXECUTE e um `COMMENT`. Zero `INSERT`/`UPDATE`/`DELETE`/`DROP`/`ALTER TABLE`/`cron.*` |
| `…0015` muta dado? | leitura integral | **Nao.** Um `REVOKE` de privilegio de tabela, um `DO` de catalogo e um `COMMENT` |
| `config_purga.modo` muda? | `SELECT modo … FROM public.config_purga` | `dry_run`, `atualizado_em = 2026-08-23 02:06:37.866-03`. **Nenhuma das duas migrations escreve na tabela** |
| A varredura chama `salvar_config_purga`? | `cron.job` + corpo de `varrer_purga_retencao` | **Nao.** `cron.job` jobid 6 → `SELECT public.varrer_purga_retencao();`. O portao do flip nao esta no caminho noturno |
| `…0015` corta o caminho do cron? | `cron.job.username='postgres'`; `varrer_purga_retencao` `prosecdef=true` owner `postgres`; `pg_class.relowner('config_purga')=postgres` | **Nao.** O `SELECT … FOR UPDATE` de (a) exige `UPDATE` alem de `SELECT` — e o dono tem os dois por definicao, e `REVOKE` **nao alcanca o dono** |
| `…0015` corta o caminho da Edge Function? | `grep -rn config_purga supabase/functions/` | Uma unica ocorrencia, e e **comentario**. Nenhuma EF le ou escreve a tabela |
| `…0015` corta o caminho da tela de RH? | `grep -rn "config_purga\|salvar_config" src/` | **Zero** referencias de codigo. A tela do cerco ainda nao existe; `SELECT` permanece concedido a `authenticated` para quando existir |
| `net.http_post` alcancavel em `dry_run`? | `20260823000011:863` | O bloco `(g.5)` inteiro vive dentro de `IF v_modo = 'live'`. Inalcancavel por **estrutura**, e nenhuma das duas migrations toca aquele corpo |
| O corpo vivo e mesmo o da `…0013`? | `md5(prosrc)` vivo = `9e1a55bee81aaa7b42d45e5a5a8fee7b` = md5 do corpo do arquivo `…0013` | **Identico.** Nao ha hotfix em PROD que o `CREATE OR REPLACE` fosse atropelar |
| A assinatura/flags sobrevivem ao `REPLACE`? | diff mecanico dos dois corpos | Assinatura, `LANGUAGE plpgsql`, `VOLATILE`, `SECURITY DEFINER`, `SET search_path = ''` **byte a byte iguais**. `CREATE OR REPLACE` preserva dono e ACL, e as linhas de `REVOKE`/`GRANT` sao as mesmas da `…0013` |

**Diff mecanico dos corpos (`…0013` → `…0014`), comentarios removidos:** exatamente **duas**
mudancas semanticas — o `SELECT` do passo (6.b) e o ramo degradado do passo (8). Nenhuma outra
linha executavel mudou. O arquivo promete isso e cumpre.

**Conclusao:** **nada a desarmar, nada a reverter.** Aplicar `…0014` e `…0015` nao pode fazer a
varredura de hoje destruir nada. Se o operador aplicar `…0014` e parar, o estado overnight e
seguro e consistente — a unica funcao alterada nao e chamada pelo cron.

### Mas o operador NAO deve seguir o plano de apply como esta escrito.

Dois BLOCKERS, **os dois introduzidos pelo conserto**, exatamente o padrao que a Phase 45 pagou:

1. **`BL-R3-01`** — o "ultimo recurso" que o runbook ganhou no commit `b4c5aa4`
   (`UPDATE cron.job SET active = false …`) **nao executa**. Medido:
   `has_table_privilege('postgres','cron.job','UPDATE') = false`. E ele foi escrito **rebaixando**
   `cron.unschedule`, que funciona. E a alavanca das tres da manha.
2. **`BL-R3-02`** — o passo 4 do apply (o smoke, declarado como *"a evidencia de 1–3"*) **fica
   vermelho depois** do apply da `…0014`, no caso `(d.3)`, com um diagnostico **FALSO** que acusa
   a mensagem da RPC quando o defeito esta na fixture. A previsao de `27/27` do
   `46-REVIEW-FIX.md` esta errada.

Os dois se consertam com edicao de arquivo. Nenhum exige tocar PROD. **Corrigir os dois ANTES do
apply** — o primeiro porque e o freio de emergencia, o segundo porque sem ele o apply fica sem
evidencia e o operador recebe um vermelho que aponta para o lugar errado.

---

## BLOCKER

### BL-R3-01 · O "ultimo recurso" do runbook nao executa — e ele rebaixou o que executava

**Arquivo:** `.planning/phases/46-purga-autom-tica-dry-run-live/46-07-RUNBOOK-FLIP.md:325-355`
(commit `b4c5aa4`, conserto de HI-01)
**Classe:** portao/alavanca verificada pelo lado errado da porta — **a mesma classe de HI-04**,
reintroduzida pelo conserto de HI-01.

O runbook passou a oferecer, como recurso de ultima instancia quando **qualquer** RPC falhar:

```sql
UPDATE cron.job SET active = false WHERE jobname = 'purga-retencao-sweep';
```

e, logo abaixo, instrui explicitamente a **preferir isto a `cron.unschedule`**, e a desfaze-lo com
`UPDATE … SET active = true`.

**Medido no banco vivo, read-only, 2026-08-23:**

```
pg_class('cron.job').relowner              = supabase_admin
pg_class('cron.job').relacl                = {supabase_admin=arwdDxtm/supabase_admin,
                                              =r/supabase_admin,
                                              postgres=r*/supabase_admin}
has_table_privilege ('postgres','cron.job','UPDATE')          = false
has_column_privilege('postgres','cron.job','active','UPDATE') = false
information_schema.column_privileges (cron.job, UPDATE)       = 0 linhas
```

`postgres` carrega **`r*` — `SELECT` com grant option, e mais nada**. O `UPDATE` levanta
`42501 permission denied for table job` **antes** de a policy `cron_job_policy (username =
CURRENT_USER)` ser sequer consultada. E `postgres` e o papel sob o qual roda tanto o SQL Editor
quanto a Management API — medido nesta sessao pela propria via de apply:
`current_user = session_user = postgres`.

O `46-REVIEW-FIX.md:105` declara o conserto *"conferido contra PROD (a coluna existe, o jobname
confere)"*. **Foram conferidas as duas coisas que nao importavam.** Conferir que a coluna existe e
que o `WHERE` casa nao e conferir que o statement executa — e e literalmente o achado HI-04
("*um portao que parece medir o invariante e mede um vizinho dele*") cometido de novo, no conserto
do achado vizinho.

**Agravante, e e ele que faz disto BLOCKER e nao HIGH:** o texto **rebaixou a alavanca que
funciona**. O que funciona, medido:

```
has_function_privilege('postgres','cron.unschedule(text)','EXECUTE')                        = true
has_function_privilege('postgres','cron.alter_job(bigint,text,text,text,text,boolean)', …)  = true
```

As duas sao funcoes **C** de `pg_cron` 1.6.4 que trocam para o dono da extensao internamente — e e
por isso que `cron.schedule` funcionou como `postgres` na `20260823000012` (jobid 6 existe). O
runbook antigo oferecia `cron.unschedule`; o novo o move para segundo plano com a justificativa
de que `active = false` seria "reversivel por um statement". **A alternativa reversivel existe e
nao e essa.**

**Conserto:**

```sql
-- Desarma o AGENDAMENTO sem destruir a linha. Reversivel com o simetrico.
-- ⚠ NAO usar `UPDATE cron.job`: cron.job pertence a supabase_admin e o papel do
--   SQL Editor (postgres) tem SOMENTE SELECT — medido 2026-08-23,
--   has_table_privilege('postgres','cron.job','UPDATE') = false. O UPDATE
--   levanta 42501 antes de a policy ser consultada.
SELECT cron.alter_job(job_id := 6, active := false);   -- jobid medido: 6

-- Conferir — "nao levantou" nunca foi "gravou":
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'purga-retencao-sweep';

-- Reverter:
SELECT cron.alter_job(job_id := 6, active := true);
```

E manter `SELECT cron.unschedule('purga-retencao-sweep');` como a segunda opcao declarada, com a
ressalva do inventario que o runbook ja escreve.

⚠ Depois de corrigir, **prove a alavanca por execucao** num momento controlado (desarmar e rearmar,
conferindo `active` nas duas pontas). Uma alavanca de emergencia que nunca foi acionada e uma
promessa sem codigo — exatamente o que HI-05 encontrou nos 150 s.

---

### BL-R3-02 · O caso `(d.3)` do smoke QUEBRA depois do apply da `…0014`, e o diagnostico e FALSO

**Arquivos:** `supabase/tests/p46_purga_smoke.sql:3119-3168` (o caso, **nao tocado** pelo conserto)
× `supabase/migrations/20260823000014_p46_portao_flip_veredito.sql:400-415` (o criterio novo)
**Classe:** o conserto endureceu um criterio e nao reconciliou a fixture do caso vizinho.

`(d.3)` monta o caso "menos de 14 execucoes" **destruindo e reconstruindo** o recorte:

```sql
DELETE FROM public.purga_execucao_itens i
 WHERE EXISTS (SELECT 1 FROM public.purga_execucoes e
                WHERE e.id = i.execucao_id AND e.modo_vigente IN ('dry_run','live'));
DELETE FROM public.purga_execucoes WHERE modo_vigente IN ('dry_run','live');

INSERT INTO public.purga_execucoes (…)
SELECT 'dry_run', 50, CASE WHEN g = 1 THEN 3 ELSE 0 END, 0, 'dry_run', 'concluida', …
  FROM generate_series(1, 13) g;      -- ⚠ TREZE CABECALHOS, ZERO ITENS
```

O primeiro `DELETE` leva embora **o item sintetico com `relato_dry_run`** que o proprio conserto
acabou de plantar (`:3060-3070`), e a reconstrucao **nao insere item nenhum**. Confirmado no
catalogo vivo que a FK e `purga_execucao_itens_execucao_id_fkey … REFERENCES purga_execucoes(id)`
**sem `ON DELETE CASCADE`** — ou seja o `DELETE` explicito de itens e necessario e faz o que diz.

Com o criterio 3 novo — `elegiveis > 0 **AND** EXISTS (item com relato_dry_run)` — o conjunto
contado passa a ser:

| criterio | valor em `(d.3)` | passa? |
|---|---|---|
| 1 · 14 dias | `min(iniciada_em) = now() − 20 dias` | **sim** |
| 2 · 14 execucoes | `13` | **nao** → marcador `execucoes` |
| 3 · ensaio com evidencia | `0` (nenhuma execucao tem item) | **nao** → marcador `elegiveis` |
| 4/5 · matriz | allowlist com 3 etapas, `origem='admin'` | sim |

O julgamento de `:3483-3502` monta os marcadores por `concat_ws('+')` e compara por **igualdade
exata**:

```
v_marc[2]  medido:   'execucoes+elegiveis'
v_marc[2]  esperado: 'execucoes'
```

→ `RAISE EXCEPTION 'P46P FAIL (d): o DIAGNOSTICO de cada recusa nao nomeia o criterio certo e so
ele …'`, que aborta o bloco `(d)` e derruba o smoke inteiro.

**E o diagnostico e FALSO**, que e o que faz disto BLOCKER e nao HIGH: a mensagem acusa a
**mensagem da RPC** de nomear criterios a mais, quando a RPC esta certa — os dois criterios
faltam de fato, e quem envelheceu foi a **fixture**. E exatamente o modo de falha que o
`CLAUDE.md` §"varra pela FORMA" cataloga como o pior dos dois ("*reprova trabalho correto, com
diagnostico FALSO*"), e que esta fase ja pagou tres vezes.

**Por que passou despercebido:** o `46-REVIEW-FIX.md:280-282` declara, honestamente, que os casos
novos foram verificados por **leitura e compilacao em `pg_temp`**, nunca por execucao. Compilacao
pega sintaxe; nao pega isto. A previsao `27/27` do relatorio de conserto e, portanto, incorreta.

**Conserto** (a fixture de `(d.3)` tem de carregar a mesma evidencia que a de `(d.6)`):

```sql
      INSERT INTO public.purga_execucoes (…)
      SELECT 'dry_run', 50, CASE WHEN g = 1 THEN 3 ELSE 0 END, 0, 'dry_run', 'concluida',
             pg_catalog.now() - make_interval(days => 21 - g),
             pg_catalog.now() - make_interval(days => 21 - g)
        FROM generate_series(1, 13) g
      RETURNING id INTO STRICT …;   -- ou capturar so a de g = 1, ver abaixo

      -- ⚠ O CRITERIO 3 PASSOU A EXIGIR EVIDENCIA (20260823000014), e este caso
      --   existe para reprovar SO pela CONTAGEM. Sem um item com relato_dry_run
      --   na execucao de elegiveis > 0, o criterio 3 falha junto e o marcador
      --   deste caso vira 'execucoes+elegiveis' — o portao reprovaria por dois
      --   motivos e o julgamento de marcador acusaria a RPC de mentir.
      INSERT INTO public.purga_execucao_itens
             (execucao_id, candidato_id, etapa, janela_meses_aplicada,
              ancora_origem, ancora_em,
              desfecho_storage, desfecho_postgres, desfecho_auth,
              relato_dry_run, concluido_em)
      SELECT e.id, c_d_cand, 'aprovado'::public.etapa_processo, 24,
             'data_candidatura', pg_catalog.now() - interval '30 months',
             'nao_aplicavel', 'nao_aplicavel', 'nao_aplicavel',
             'P46P (d.3) FIXTURE SINTETICA — evidencia de ensaio, para que este caso reprove SO pela contagem',
             pg_catalog.now() - interval '20 days'
        FROM public.purga_execucoes e
       WHERE e.modo_vigente = 'dry_run' AND e.elegiveis > 0
       ORDER BY e.iniciada_em LIMIT 1;
```

⚠ E depois do conserto, **prove por execucao que `(d.3)` ainda MORDE**: zerar temporariamente o
`elegiveis` daquela linha tem de fazer o marcador virar `execucoes+elegiveis` de novo. Um caso que
voce tornou incapaz de reprovar pela contagem e pior que o quebrado.

⚠ **Reconferir `(d.2)`, `(d.4)`, `(d.5)`, `(d.8)`, `(d.9)` e `(d.6)` com a mesma lente** — eu os
tracei um a um e **os seis estao corretos** com o criterio novo (`(d.2)` nao apaga itens; `(d.4)`
zera `elegiveis` e o marcador `elegiveis` e o esperado; `(d.8)` esvazia o conjunto e os tres
marcadores compostos batem; `(d.9)` anula so o relato e o marcador simples bate; `(d.6)` conta a
execucao de fronteira com o item plantado). **Apenas `(d.3)` reconstroi o ledger sem itens.**

---

## HIGH

### HI-R3-01 · A conferencia de md5 escrita nos DOIS arquivos novos NAO REPRODUZ o valor do ledger

**Arquivos:** `20260823000014…sql:146-148` e `20260823000015…sql:109-111`

Os dois cabecalhos mandam conferir o apply assim:

```
SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations WHERE version = '…';
-- comparar com:  printf '%s' "$(cat supabase/migrations/…_*.sql)" | md5
```

**Medido contra a `20260823000013`, que ja esta aplicada:**

```
md5 do ledger                                  = 63feeec5f3d55ea4371fa6fb5954d10a
md5 -q do arquivo (bytes crus)                 = 63feeec5f3d55ea4371fa6fb5954d10a   ✅
printf '%s' "$(cat arquivo)" | md5             = c410a6723d0f8557bc3c7b13e7ddc7b0   ❌
```

`$( … )` **remove as quebras de linha finais**; o ledger guarda os bytes crus
(`p46apply.cjs` faz `fs.readFileSync` e registra o mesmo buffer, `octet_length` 37435 para a
`…0013`). Ou seja: **o operador que seguir a instrucao escrita no cabecalho da migration vera
DIVERGENCIA num apply CORRETO.** Num projeto cuja via de apply existe *"porque duas das cinco
migrations do M8 chegaram a PROD com os comentarios descartados"* (`CLAUDE.md`), uma conferencia
de md5 que da falso-negativo e um convite a reverter o que estava certo — a mesma classe de
diagnostico falso de BL-R3-02.

O `p46apply.cjs` faz o cross-check **certo** por conta propria (`crypto.createHash('md5')` sobre o
buffer do arquivo, comparado com o ledger lido de volta). O defeito e exclusivamente da instrucao
escrita — herdada da `…0013`, que nao pode mais ser editada, e **copiada verbatim para dois
arquivos que ainda podem**.

**Conserto:** trocar a linha nos dois cabecalhos por
`md5 -q supabase/migrations/20260823000014_*.sql` (macOS) / `md5sum <arquivo>` (Linux), e
registrar que a via automatica ja o faz.

---

### HI-R3-02 · A degradacao da trilha e guardada por `v_modo_novo = 'off'`, e nao pela TRANSICAO — e a mensagem mente quando os dois coincidem

**Arquivo:** `20260823000014…sql:520-541`

O conserto de HI-01 esta **estruturalmente correto no ponto que mais importava**, e conferi isso
antes de tudo:

> O `BEGIN … EXCEPTION WHEN OTHERS` envolve **exclusivamente** o `PERFORM public.log_auditoria(…)`.
> O `UPDATE` do passo (7) e o `SELECT to_jsonb` do passo (7.5) estao **fora** do bloco. Uma falha
> da MUTACAO propaga e derruba a chamada; o handler **nao tem como engoli-la**. O kill switch nao
> pode silenciosamente nao funcionar. ✅

O defeito e outro: a guarda e **`IF v_modo_novo = 'off'`**, que e o *estado resultante*, e nao a
*transicao*. O passo (5) so recusa a nao-op **completa**, entao esta alcancavel:

```
modo_antes = 'off'  ·  p_modo = NULL (ou 'off')  ·  p_cap_titulares = 25
→ v_modo_novo = 'off'  →  cai no ramo DEGRADADO
```

Duas consequencias:

1. **Uma mudanca de `cap`/`janela` com a purga ja desligada passa a commitar sem trilha** se
   `log_auditoria` falhar. Nao e o kill switch; e uma alteracao de politica de retencao num
   registro de conformidade. A excecao a atomicidade da trilha ficou mais larga do que o achado
   pedia, e mais larga do que o `COMMENT` que a propria migration escreve no banco descreve.
2. **A mensagem do `WARNING` afirma um fato falso.** Ela diz, em maiusculas,
   *"A PURGA FOI DESLIGADA … modo % -> off"* com `v_modo_antes` — e imprimiria **`modo off -> off`**.
   Ler isso as tres da manha e concluir que houve um desligamento que nao houve.

**Conserto** (uma condicao, e ela e a mesma que o `COMMENT` ja promete):

```sql
IF v_modo_novo = 'off' AND v_modo_antes IS DISTINCT FROM 'off' THEN
```

⚠ Consertar isto **junto** com ME-R3-05 abaixo (a duplicacao do `PERFORM`), porque a forma sem
duplicacao resolve os dois de uma vez.

---

### HI-R3-03 · A frase que HI-02 provou FALSA continua escrita, verbatim, seis linhas acima da condicao que a refuta

**Arquivo:** `supabase/tests/p46_purga_smoke.sql:2715-2721`

O conserto de HI-02 corrigiu a frase no `46-06-SUMMARY.md` (com `~~riscado~~` e nota longa) e
acrescentou a quinta condicao. **Mas o comentario do proprio smoke ficou intacto:**

```
-- ⊕ A PROVA DURÁVEL DE QUE O DISPATCH RODOU, e ela não depende do `pg_net`.
--   … Logo: todos os itens abertos + zero falha + `veredito = 'despachado'` só é
--   possível se o laço de dispatch percorreu todos e nenhum enfileiramento levantou.
```

Seis linhas abaixo, o comentario novo diz o oposto, com todas as letras: *"apague o bloco `(g.5)`
inteiro da migration e as quatro continuam verdadeiras"*.

Dois comentarios adjacentes que se contradizem, num arquivo cuja doutrina declarada e que
**comentario que contradiz o codigo ao lado e a forma de defeito que a fase nomeia** (BL-01 do
46-04, RD3-01). E o SUMMARY foi corrigido; o comentario **e o que o proximo leitor abre**.

**Conserto:** reescrever `:2715-2721` para dizer o que as quatro condicoes de fato provam
(*"o laco `(g)` abriu um item por titular e o fechamento `(h)` nao os fechou — nenhuma delas
observa o `(g.5)` no caminho feliz"*), e apontar para a quinta condicao.

---

### HI-R3-04 · O orcamento de parede nao e um relogio — ele so recusa COMECAR um passo, e o cabecalho promete mais que isso

**Arquivo:** `supabase/functions/purgar-retencao/index.ts:92-119` (o cabecalho de `PRAZO_MS`) e
`:444`, `:452`, `:484`, `:526` (os quatro cheques)

O conserto e real e melhora o estado anterior: hoje existe um teto **da funcao** e ele e
**provado por execucao** nas duas direcoes (`(k)`, `(k2)`, `(k3)`, com relogio injetavel). Tracei
os tres cheques e o ramo `semUserId` e a atribuicao de passo esta correta em todos — inclusive a
**divergencia declarada** no ponto 3, que julgo **certa e melhor que o texto original de HI-05**:
naquela linha `desfechos.storage` **ja vale `'ok'`** (`:467`), e um `ErroDePasso("storage", …)`
o sobrescreveria para `'falha'`, afirmando que uma remocao bem-sucedida falhou. O `(k2)` fixa
exatamente isso. Concordo com a divergencia.

**O que nao se sustenta e o cabecalho.** Ele afirma:

> *"a função desiste SOZINHA antes dos 150 s"* … *"a garantia deixa de depender do runtime"*

Nao ha `AbortController`, `AbortSignal.timeout`, nem timeout por chamada em **nenhuma** das
operacoes: `plano_exclusao_titular`, o `select` de `candidatos`, ate 50 paginas de `list`, cada
`remove`, `anonimizar_candidato`, `auth.admin.deleteUser` e `concluir_item_purga`. O que o
orcamento garante e estritamente: *"a funcao nao COMECA um passo novo depois do prazo"*. Um unico
`remove` ou um unico `rpc` que trave 5 minutos atravessa `T_c + 150 s` com o cheque ja feito — e
**o RD2-03 reabre exatamente como escrito**, com o Storage apagado e o guard recusando o motor com
`42501`.

E o cheque 3 nao cobre o intervalo entre ele e o retorno do motor, que e o unico ponto em que a
janela de 1 h pode vencer com o Storage ja destruido.

**Conserto** (o menor que fecha a lacuna, e ele fecha):

```ts
// Orcamento POR CHAMADA, e nao so por checkpoint: um cheque antes de comecar nao
// limita a duracao do que comecou.
function comPrazo<T>(p: Promise<T>, restanteMs: number, passo: Passo, classe: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new ErroDePasso(passo, classe)), Math.max(0, restanteMs))
    ),
  ]);
}
```

…aplicado ao `rpc("anonimizar_candidato")` e a cada `remove`, com `restanteMs = prazo - agora()`.
Enquanto isso nao existir, **corrigir o cabecalho** para dizer o que o codigo faz — a prosa que
afirma mais que a medicao e o achado HI-05 original, reencenado do lado do conserto.

---

### HI-R3-05 · A familia "EXAUSTIVA" da `…0015` tem uma lista literal de verbos, e o verbo que ela omite e o que a propria migration argumenta ser a segunda porta

**Arquivo:** `20260823000015…sql:154-187` (bloco `(i.a)`) × `:123-124` (o `REVOKE`)

O bloco `(i.a)` e uma boa ideia e **funciona** — confirmei por execucao read-only que ele MORDE
hoje, devolvendo os 12 pares:

```
anon:DELETE, anon:INSERT, anon:TRUNCATE, anon:UPDATE, authenticated:DELETE, …, service_role:UPDATE
```

Mas o comentario que o apresenta afirma (`:162-164`):

> *"ela pergunta a ACL DA TABELA quem, alem do DONO, carrega qualquer verbo de escrita — **sem
> lista de papeis, sem lista de verbos conhecidos por nome**"*

O codigo, tres linhas abaixo:

```sql
AND a.privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
```

E uma lista literal de verbos, e ela **omite `TRIGGER`** — que a mesma migration revoga
(`:123`) e justifica por extenso como *"segunda porta da mesma classe: quem pode anexar trigger a
esta tabela pode fazer codigo proprio rodar dentro da transacao de quem a escreve"*. A familia
`(i.b)` tambem omite (`v_verbos := ARRAY['INSERT','UPDATE','DELETE','TRUNCATE']`).

**Resultado:** o `REVOKE` de `TRIGGER` **nao e verificado por nada**, e o `COMMENT ON TABLE` que a
migration grava dentro do banco afirma, como fato, que ele esta revogado (`:272-273`). Se um dia
`TRIGGER` voltar, as duas familias seguem verdes e o catalogo continua afirmando o contrario — a
forma "iteracao sobre lista literal" do `CLAUDE.md`, aqui dentro do bloco que se apresenta como o
antidoto dela.

Medido tambem: os tres papeis carregam `MAINTAIN` (PG17), que sobrevive ao `REVOKE` e nao e
mencionado em lugar nenhum. Nao e caminho de escrita de conteudo, mas o `COMMENT` deveria dizer o
que ficou.

**Conserto:** `AND a.privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER')` e
`v_verbos := ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER']`, e trocar a frase por
*"sem lista de papeis, e com a lista de verbos que o `REVOKE` acima executa — as duas tem de mudar
juntas"*.

---

## MEDIUM

### ME-R3-01 · Os criterios 1 e 2 ainda contam execucoes que abriram item e NAO chamaram o motor — e ha uma delas em PROD, ancorando o relogio dos 14 dias

**Arquivo:** `20260823000014…sql:400-415`

A conjuncao endureceu **so o criterio 3**. Os criterios 1 e 2 continuam recortados por
`modo_vigente` + `veredito`. Medido em PROD:

| `iniciada_em` | modo | veredito | `elegiveis` | itens | itens com `relato_dry_run` |
|---|---|---|---|---|---|
| 2026-08-22 20:03:14-03 | `dry_run` | `dry_run` | 6 | 6 | **0** |
| 2026-08-23 02:06:37-03 | `dry_run` | `dry_run` | 4 | 4 | 4 |

A primeira linha **abriu seis itens e nao chamou o motor em nenhum** — e o proprio corpo da
varredura escreve (`20260823000011:766`) que *"um item com `relato_dry_run` nulo significa que a
chamada ao motor nao aconteceu"*. Ela nao satisfaz o criterio 3 (correto, e e o conserto
funcionando), mas **ancora `min(iniciada_em)` e conta para as 14**.

Consequencias praticas:
- o relogio dos 14 dias comeca em **2026-08-22 20:03**, e nao no T0 declarado no runbook
  (2026-08-23 02:06:37-03): o portao libera ~6 h antes do que o documento diz;
- a contagem de 14 pode ser satisfeita por noites que abriram item sem ensaiar.

Nao e regressao — e o limite declarado da divergencia que o fixer escolheu, e **julgo a escolha
correta** (conjuncao e estritamente mais forte que qualquer metade, e nenhum predicado foi
enfraquecido). O que falta e o registro: o runbook e o `COMMENT` descrevem os tres criterios como
se os tres medissem ensaio, e so um mede.

**Conserto:** ou estender o `EXISTS` de evidencia aos criterios 1 e 2 (mais forte, e alinhado com
ME-01 do review anterior, que continua em aberto), ou escrever no `COMMENT` e no runbook que os
criterios 1 e 2 contam **noites de varredura em regime de ensaio** e so o 3 conta **ensaio
consumado**.

---

### ME-R3-02 · A ordem "obrigatoria" 1 → 2 → 3 → 4 nao e obrigatoria, e dizer que e esconde a restricao real

**Arquivo:** `46-REVIEW-FIX.md:229-241`

Verifiquei as dependencias uma a uma:

- `…0015` nao le nem escreve nada que `…0014` cria; as duas tocam objetos diferentes
  (`config_purga` × `salvar_config_purga`). **Independentes.**
- O deploy da EF nao depende de nenhuma das duas: o dispatch so ocorre em `live`, e o modo e
  `dry_run`. **Independente.**
- Aplicar `…0014` e parar deixa o sistema **consistente e seguro overnight** (a funcao alterada
  nao esta no caminho do cron).

A unica restricao real e **"o smoke por ultimo"** — e ela vale por dois motivos, um dos quais o
relatorio nao registra: alem de `(d.8)`/`(d.9)` ficarem vermelhos contra o corpo antigo (correto,
e bem explicado), `(q)`/`(g)`/`(m)`/`(d)` escrevem `config_purga` direto, o que so continua
funcionando porque o smoke roda como o **dono** — medido, `current_user = postgres` e
`relowner = postgres`. Se a via de execucao do smoke mudar depois da `…0015`, ele reprova com
`42501`. Isso merece estar na tabela de apply, e nao so no cabecalho da migration.

**Conserto:** trocar *"a ordem e obrigatoria"* por *"a unica ordem que importa e: as duas
migrations antes do smoke; entre si e com o deploy da EF sao independentes"*.

---

### ME-R3-03 · `46-07-SUMMARY.md` continua dizendo "sete chamadas de controle" depois de o conserto fazer nove

**Arquivo:** `.planning/phases/46-purga-autom-tica-dry-run-live/46-07-SUMMARY.md:213`

```
**`(d)` — sete chamadas de controle, e as sete rodam.**
```

O commit `f9cb62b` **editou este mesmo arquivo** (a correcao de HI-04, `:175+`) e deixou a linha
213 intacta. O smoke passou a exigir nove (`:3425-3427`) e o cabecalho do bloco `(d)` ja diz
"sete casos" de recusa. Tres numeros diferentes vivendo em tres lugares sobre a mesma coisa.

**Conserto:** *"nove chamadas de controle — sete recusas, uma aceitacao e o kill switch"*.

---

### ME-R3-04 · A unica condicao de `(m)` que mede o dispatch pode ser pulada em silencio

**Arquivo:** `supabase/tests/p46_purga_smoke.sql:2762`

```sql
IF v_fila_ok AND v_fila_m IS DISTINCT FROM v_fila_g + v_m_eleg THEN
```

Se qualquer uma das tres leituras de `net.http_request_queue` levantar, `v_fila_ok := false`, a
condicao inteira e pulada e `(m)` **reporta PASS** — com uma nota no `NOTICE`, mas sem reprovar.
Ou seja: a condicao que o conserto de HI-02 introduziu *"porque as outras quatro passariam com o
`(g.5)` apagado"* pode ela propria ficar fora do caminho, e o portao volta ao estado que HI-02
descreveu.

Medido hoje: `has_table_privilege('postgres','net.http_request_queue','SELECT') = true`, tabela
presente, `count(*) = 0`. **Nao e vacuo agora** — mas nada garante que continue.

⚠ A condicao em si e boa e **morde**: baseline capturada na propria execucao (`v_fila_g`),
igualdade exata justificada por o `net.http_post` inserir na transacao que nunca commita, e o
unico modo de falso-positivo escrito na mensagem. O defeito e so a tolerancia silenciosa.

**Conserto:** transformar a tolerancia em recusa quando o run chegou a `live` —
`IF NOT v_fila_ok THEN RAISE EXCEPTION 'P46P FAIL (m): a fila do pg_net nao pode ser lida (%), e sem ela a metade ⊕ de (m) nao tem NENHUMA condicao que meça o dispatch', v_fila_nota; END IF;`

---

### ME-R3-05 · A chamada da trilha foi DUPLICADA verbatim, e as duas copias tem de ficar iguais para sempre

**Arquivo:** `20260823000014…sql:522-537` e `:543-558`

O ramo degradado e o ramo atomico carregam **duas copias identicas** do `PERFORM
public.log_auditoria(…)`, com onze argumentos nomeados cada, inclusive o `format(...)` de seis
substituicoes. Uma edicao futura em um dos ramos — acrescentar um campo, mudar a `p_acao` — passa
a produzir **trilhas diferentes para `off` e para `live`**, num artefato de conformidade com
retencao indefinida, e nada mede a divergencia.

**Conserto** (resolve tambem HI-R3-02, com uma copia so):

```sql
BEGIN
  PERFORM public.log_auditoria( … );          -- UMA copia
EXCEPTION WHEN OTHERS THEN
  IF v_modo_novo = 'off' AND v_modo_antes IS DISTINCT FROM 'off' THEN
    RAISE WARNING 'salvar_config_purga: ⚠ A PURGA FOI DESLIGADA E A TRILHA NAO PODE SER GRAVADA (%: %) …', SQLSTATE, SQLERRM;
  ELSE
    RAISE;   -- ⚠ re-levanta o erro ORIGINAL, com SQLSTATE e mensagem intactos
  END IF;
END;
```

⚠ O `RAISE;` nu dentro do handler re-levanta a excecao original — a atomicidade de `-> live`
fica **identica** a de hoje, e a subtransacao extra e irrelevante em custo. E, ao contrario da
forma atual, a assimetria fica escrita **num lugar so**.

---

### ME-R3-06 · HI-03 mudou o que `processados` conta, e nenhuma assercao mede a nova semantica

**Arquivos:** `supabase/functions/purgar-retencao/index.ts:402`, `:404`, `:420`, `:444`

O conserto de HI-03 esta **correto e eu o endosso**: os tres `throw` anteriores ao
`enumerarObjetos` passam a `postgres`, `desfecho_storage` fica em `nao_aplicavel`, e `(j)`/`(j2)`
aferem o **objeto gravado** e nao o status HTTP — que e a unica forma de pegar isto, porque os
dois caminhos devolvem 500.

O que o conserto **cria e declara inline, mas ninguem mede**: `concluir_item_purga` incrementa
`processados` quando o desfecho de Postgres e `ok` **ou** `falha`, entao quatro caminhos novos
(`rpc_plano`, `plano_vazio`, `leitura_do_user_id`, `sem_orcamento_de_parede`) passam a contar como
**titular processado sem que o motor tenha rodado**. `processados` e a coluna que a tabela de
vigilancia do runbook manda o operador ler todas as manhas durante os 14 dias.

**Conserto:** ou uma assercao em `(j)`/`(k)` sobre `processados` (o harness ja registra a chamada
de `concluir_item_purga`, entao e barato), ou uma linha na tabela de vigilancia do runbook
dizendo que `processados > 0` com `desfecho_storage = 'nao_aplicavel'` significa "o motor nao
rodou", e nao "um titular foi purgado".

---

## LOW

| # | Arquivo:linha | Achado | Conserto |
|---|---|---|---|
| LO-R3-01 | `20260823000014…sql:194-196` | O comentario justifica `strpos` em vez de `position(… in …)` com *"este arquivo roda com `search_path` fechado"*. O `DO` **nao** declara `search_path`, e o arquivo tampouco — vale o default da sessao. A escolha de `strpos` continua **certa** (o `position` especial nao aceita qualificacao de schema); o motivo escrito nao e o motivo real | Reescrever para *"o `position(… in …)` e sintaxe especial do SQL e nao aceita qualificacao de schema, e este arquivo qualifica tudo por `pg_catalog` de proposito"* |
| LO-R3-02 | `20260823000011:377-385` × `20260823000014…sql:405-410` | A reconciliacao de (a.3) **concatena** em `relato_dry_run` (`coalesce(i.relato_dry_run,'') \|\| '[RECONCILIADO]…'`), ou seja pode **fabricar** um relato nao-nulo num item cujo motor nunca rodou. Hoje inalcancavel (todo item aberto ja carrega relato vindo de (g)), mas o criterio 3 do portao passou a **depender** disso continuar verdadeiro para sempre, e nada mede | Uma linha no `COMMENT` da coluna, ou trocar o `EXISTS` por `relato_dry_run NOT LIKE '%[RECONCILIADO]%'`… (preferivel: registrar a dependencia) |
| LO-R3-03 | `20260823000014…sql:575-578`, `:624-625` | Medido em PROD: `proacl` de `salvar_config_purga` = `{postgres=X, service_role=X, authenticated=X}`. O `REVOKE ALL … FROM PUBLIC, anon, authenticated` **nao alcanca `service_role`**, que recebeu EXECUTE do `pg_default_acl` e nunca o perdeu. Inofensivo (o guard (1) recusa um JWT sem a claim de administrador), mas o `COMMENT` — *"ACL: revogada nominalmente de PUBLIC, anon e authenticated"* — le-se como porta fechada | Acrescentar `service_role` a lista do `REVOKE`, ou nomear a excecao no `COMMENT` com a razao |
| LO-R3-04 | `p46_purga_smoke.sql:3248-3250`, `:3292-3296` | `(d.8)` e `(d.9)` acrescentam **dois** `UPDATE` sobre linhas REAIS do ledger de conformidade (`WHERE modo_vigente IN ('dry_run','live')` — hoje as linhas de PROD), levando de 3 para 5 os statements do bloco que tocam registro de retencao indefinida. Contido pelas subtransacoes e **medido** pela impressao digital, e o fixer corrigiu a prosa da cerca (1) — mas o raio cresceu de novo, no mesmo commit que documentou o crescimento anterior | Registrar o novo total no cabecalho de `(d)`, e considerar plantar uma coluna sentinela em vez de escopar por modo |

---

## Veredito por achado consertado

| Achado | O conserto consertou? | Julgamento |
|---|---|---|
| **BL-01** | **Parcialmente** | O criterio 3 passou a medir evidencia e o recorte ganhou allowlist de veredito — os dois consertos sao **corretos e verificaveis**, e a allowlist e allowlist (nunca negacao), como deve ser. A **divergencia declarada** (conjuncao em vez de substituicao) e **acertada**: e estritamente mais forte e preserva `(d.4)`. **Mas** os criterios 1 e 2 continuam contando execucoes sem ensaio (ME-R3-01), e o conserto **quebrou `(d.3)`** (BL-R3-02) |
| **HI-01** | **Sim, no ponto critico** | Conferi o escopo do `EXCEPTION` linha a linha: ele envolve **so** o `PERFORM`. Uma falha da MUTACAO **nao** pode ser engolida — o kill switch nao pode silenciosamente nao funcionar. ✅ Falhas: guarda pelo estado e nao pela transicao (HI-R3-02), duplicacao (ME-R3-05) e, **no runbook, uma alavanca de emergencia que nao executa** (BL-R3-01) |
| **HI-02** | **Sim** | A quinta condicao mede o que as quatro nao mediam, com baseline capturada na propria execucao. Apagar `(g.5)` agora deixa `(m)` **vermelho**. ✅ Falhas: tolerancia silenciosa (ME-R3-04) e a frase falsa deixada no comentario (HI-R3-03) |
| **HI-03** | **Sim** | Atribuicao ao Postgres nos tres `throw` pre-Storage, `desfecho_storage` em `nao_aplicavel`, e `(j)`/`(j2)` aferindo o **objeto gravado** — que e a unica forma de pegar isto. ✅ Falha: a semantica nova de `processados` nao e medida (ME-R3-06) |
| **HI-04** | **Sim, e e o melhor conserto do lote** | `REVOKE` nominal dos tres papeis + `PUBLIC`, verificacao **do lado certo da porta**, `REVOKE` **antes** da medicao para a migration provar o proprio efeito, e a pergunta de seguranca (quem roda o smoke) **medida** e nao presumida. Confirmei os 12 pares por execucao read-only, e confirmei que nem o cron, nem a EF, nem a tela sao cortados. ✅ Falha: a familia "exaustiva" tem lista literal de verbos e omite `TRIGGER` (HI-R3-05) |
| **HI-05** | **Parcialmente** | O teto virou **da funcao**, com relogio injetavel e tres testes que provam que morde nas duas direcoes — melhor que o estado anterior. A **divergencia declarada** no ponto 3 (`postgres` em vez de `storage`) esta **certa e o review anterior estava errado**: ali `desfechos.storage` ja vale `'ok'` e sobrescreve-lo seria a mentira simetrica. ✅ **Mas** o mecanismo e por checkpoint, nao por relogio: sem `AbortController`, uma unica chamada travada atravessa os 150 s e o RD2-03 reabre — e o cabecalho promete o contrario (HI-R3-04) |

---

## A ordem de conserto, e o que trava o que

**ANTES do apply** (nenhum toca PROD; os quatro sao edicao de arquivo):

1. **BL-R3-01** — trocar `UPDATE cron.job` por `cron.alter_job(job_id := 6, active := …)` no
   runbook, e devolver `cron.unschedule` ao lugar de alternativa declarada.
2. **BL-R3-02** — plantar o item com `relato_dry_run` na reconstrucao de `(d.3)`, e provar por
   execucao que `(d.3)` continua reprovando **so** pela contagem.
3. **HI-R3-01** — corrigir a linha de conferencia de md5 nos dois cabecalhos.
4. **HI-R3-02 + ME-R3-05** — a guarda por transicao e a copia unica do `PERFORM`, no mesmo diff
   (a `…0014` ainda nao foi aplicada; editar agora custa zero).

**DEPOIS do apply, e antes de qualquer ensaio em `live`:**

5. **HI-R3-04** — orcamento por chamada, ou cabecalho corrigido para o que o codigo faz.
6. **HI-R3-05** — `TRIGGER` nas duas familias da `…0015` (exige uma terceira migration; se for
   feito, e a hora barata de fazer junto com o item 4 se este ainda nao tiver sido aplicado).
7. **HI-R3-03**, **ME-R3-01..06**, LOW — conforme couber.

⚠ **Se o item 4 for aceito, ele e gratis agora e caro depois.** A `…0014` ainda nao esta no ledger;
depois do apply, qualquer emenda ao corpo dela exige uma terceira migration sobre a mesma funcao —
o mesmo argumento que o proprio fixer registrou sobre ME-01.

---

## O que eu NAO consegui verificar, e por que

1. **A execucao real do smoke.** `(m)` roda a varredura em `live` dentro de um envelope revertido;
   rodar o arquivo e um ato de operador, nao de revisor. BL-R3-02 foi derivado por tracado do
   estado (fixture → recorte → marcadores), com a FK e a ausencia de `ON DELETE CASCADE` medidas no
   catalogo. Confio nele, e a prova definitiva e o passo 4 do apply.
2. **O teto de parede real do Edge Runtime deste projeto.** Continua sem medicao e sem pino — a
   pergunta 5 do `46-REVIEW-2.md` segue aberta. O `PRAZO_MS` a torna menos importante, nao
   irrelevante (HI-R3-04).
3. **O comportamento de `cron.alter_job` sob `postgres`.** Verifiquei o privilegio
   (`has_function_privilege = true`) e que e funcao **C** de `pg_cron` 1.6.4 — as funcoes C da
   extensao trocam para o dono internamente, que e como `cron.schedule` funcionou na
   `20260823000012`. **Nao executei**, porque executar e mutar o agendamento de PROD. Provar a
   alavanca e o passo que fecha BL-R3-01.
4. **Se `log_auditoria` pode falhar de fato.** O ramo degradado de HI-01 e correto por construcao;
   se ele algum dia dispara e outra questao, e nenhum teste o exercita (nao ha smoke que force
   `log_auditoria` a levantar dentro de `salvar_config_purga`).

---

_Revisado: 2026-08-23_
_Revisor: gsd-code-reviewer (adversarial, re-revisao de conserto)_
_Profundidade: deep — leitura integral de 2 migrations novas, 1 Edge Function, 1 suite Deno, o bloco (d)/(m) do smoke e o runbook; diff mecanico dos dois corpos de `salvar_config_purga`; 11 consultas read-only ao banco vivo_
_PROD nao foi tocada: nenhuma migration aplicada, nenhuma funcao publicada, nenhum smoke executado, `modo = dry_run`, `cron.job` jobid 6 `active = true`_
