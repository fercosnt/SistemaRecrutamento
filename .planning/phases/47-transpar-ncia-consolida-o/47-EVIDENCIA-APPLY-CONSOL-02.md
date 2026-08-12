---
fase: 47-transpar-ncia-consolida-o
requisito: CONSOL-02
criterio: SC#2
migration: 20260809000001_p47_listar_historico_candidatura.sql
medido_em: 2026-08-12
medido_por: orquestrador (MCP Supabase, somente leitura)
metodo: SELECT sobre pg_proc + supabase_migrations.schema_migrations
escritas_em_prod: 0
---

# CONSOL-02 — o apply da `listar_historico_candidatura` está corroborado

## Por que este arquivo existe

A `47-VERIFICATION.md` (2026-08-12) levantou como **achado crítico** que a alegação do
`47-07-SUMMARY.md` — *«APLICADA em PROD… smoke 6/6»* — não tinha **nenhum artefato de apoio no
repositório**, e era contradita por três fontes:

- o `47-02-SUMMARY.md` (o plano que ESCREVEU a migration) diz, repetidamente, «ESCRITA, NÃO
  APLICADA», com toda entrada de cobertura em `pending`;
- o `WINDOWS.md` item 24 (`unrun-verify`) segue `open`;
- o `STATE.md` documenta em detalhe os applies da Phase 45 e **não menciona** a `20260809000001`.

O contraste que tornou o achado plausível é real e vale registrar: as migrations irmãs do
`47-03` (`20260809000002`/`000003`) **têm** essa corroboração — receberam commit de follow-up com
md5 de ledger e estado medido antes/depois. A `20260809000001` não recebeu.

**O achado era de ESCRITURAÇÃO, não de banco.** A medição abaixo resolve a contradição: a
migration **está aplicada**, e o corpo vivo é **byte-a-byte idêntico** ao do repositório.

## O que foi medido

Duas consultas, ambas `SELECT`. **Zero escrita em PROD.**

### 1. A função existe no catálogo vivo

```sql
select p.oid::regprocedure::text, p.prosecdef, p.provolatile, p.proconfig, p.proacl::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'listar_historico_candidatura';
```

| Propriedade | Valor vivo | Exigido por | Confere |
|---|---|---|---|
| assinatura | `listar_historico_candidatura(uuid)` | `20260809000001:153` | ✅ |
| `prosecdef` | `true` (SECURITY DEFINER) | asserção `(d)` da auto-verificação | ✅ |
| `provolatile` | `s` (STABLE) | `COMMENT` da migration (`:366`) | ✅ |
| `proconfig` | `{search_path=""}` | `search_path = ''` | ✅ |
| `proacl` | `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | `GRANT … TO authenticated` (`:271`) | ✅ |

⚠ Sobre a `proacl`: `anon` **não** aparece. A asserção `(e)` da auto-verificação existe justamente
para o caso `proacl` NULA — ACL default concede `EXECUTE` a `anon` e a função seria chamável sem
autenticação. Não é o caso: há ACL explícita e `anon` está fora.

⚠ Sobre a `proconfig`: o catálogo grava **`search_path=""`** (aspas duplas, string vazia), não
`search_path=`. É exatamente o portão nº 1 da lista de «cinco portões que reprovariam trabalho
correto» do `STATE.md` — registrado aqui porque a próxima conferência desta função vai reencontrá-lo.

### 2. O ledger tem a version

```sql
select version, name from supabase_migrations.schema_migrations
where version >= '20260809000000' order by version;
```

| version | name |
|---|---|
| `20260809000001` | `p47_listar_historico_candidatura` |
| `20260809000002` | `p47_adotar_data_deletion_log` |
| `20260809000003` | `p47_consent05_analise_video` |

As três da Phase 47 presentes, em sequência, sem buraco.

### 3. O corpo vivo é idêntico ao do repositório

`md5(prosrc)` do catálogo vivo contra o corpo extraído do arquivo entre os delimitadores
`$fn_historico$` (linhas 165 e 259), delimitadores **excluídos** — que é como `prosrc` armazena:

```
repo  md5(prosrc) : 770e20574cd086d05db796939f8e9298
live  md5(prosrc) : 770e20574cd086d05db796939f8e9298   ✅ IDÊNTICO
```

⚠ **Uma armadilha de medição, registrada para não custar tempo de novo.** As contagens de tamanho
**divergem** e isso NÃO é drift:

```
repo : 5129   (octetos — Buffer.byteLength, UTF-8)
live : 5010   (caracteres — length(prosrc) do Postgres)
```

`length()` sobre `text` conta **caracteres**, não octetos. A diferença de 119 são os caracteres
multibyte do corpo (acentuação em português nos comentários e nas mensagens de `RAISE`). O `md5`,
que corre sobre os **mesmos bytes** nos dois lados, bate exatamente — e é ele que decide.

É a mesma classe da nota do NW-06 no `45-14-SUMMARY.md` (`$c2$` = 2676 octetos COM delimitadores,
2668 pela receita que os exclui): **toda conferência de corpo tem de dizer qual é a unidade e se
os delimitadores entram.**

## O que este arquivo NÃO afirma

1. **O smoke `p47_historico_smoke.sql` continua NÃO EXECUTADO.** O `WINDOWS.md` item 24 segue
   `open` **corretamente** — apply e execução do smoke são coisas distintas, e só o apply está
   provado aqui. O smoke faz `INSERT` em `historico_candidatura` (linhas 273, 430, 498) sob
   rollback intencional; rodá-lo é escrita em PROD, fora do escopo desta sessão, e toca a trilha
   de decisão que a RNF-07a protege. **É checkpoint do operador.**

2. **A tela não foi aberta.** Que a função existe e responde não prova que o Histórico do RH
   renderiza um dos quatro rótulos (Sistema / O próprio candidato / nome / Recrutador removido).
   Isso exige navegador com login de RH numa candidatura real.

O item `behavior_unverified` da `47-VERIFICATION.md` fica, portanto, **reduzido — não fechado**: a
metade de banco está provada; a metade de tela e a execução do smoke seguem abertas.

## Correções de registro que esta medição obriga

| Onde | O que diz | O que é verdade |
|---|---|---|
| `STATE.md` §Blockers | «47-04 … não são medíveis deste ambiente; `/subprocessadores` lança ao renderizar» | **Stale.** `WINDOWS.md` item 25 está `fixed` desde 2026-08-11 (commit `eeed0e5`), os seis países foram medidos |
| `STATE.md` §Blockers | «nenhuma navegação de produção leva a elas» | **Stale.** `RodapePublico` está montado nas CINCO superfícies: `LandingPage.tsx:103`, `VagasPublicasPage.tsx:535`, `VagaDetalhePage.tsx:493`, `SubprocessadoresPage.tsx:96`, `PrivacidadePublicaPage.tsx:175` |
| `WINDOWS.md` item 28 | «47-08 Task 3 (montagem do RodapePublico) não executada» | **Stale.** Executada — ver as cinco linhas acima |
| `47-02-SUMMARY.md` | «ESCRITA, NÃO APLICADA» | Correto **quando escrito**; superado pelo apply que o `47-07` relata e que esta medição confirma |

## Lição

O achado crítico da verificação foi **procedimentalmente correto e factualmente errado**, e as duas
coisas ao mesmo tempo importam. O verificador aplicou a regra certa — *não aceite a narrativa do
SUMMARY, exija artefato* — e a regra o levou a suspeitar de um apply que de fato aconteceu, porque
**o apply não deixou rastro onde os irmãos deixaram**.

O custo de um follow-up commit com ledger e md5 é de minutos. O custo de não escrevê-lo foi uma
rodada inteira de verificação suspeitando de uma regressão de produção inexistente — e, se
ninguém tivesse medido, seria um item `human_needed` carregado adiante por fases.

**Um apply sem artefato é indistinguível de um apply que não aconteceu.**
