# Phase 46 · Evidência do apply das migrations `…0014` e `…0015`

**Aplicado em:** 2026-08-23, ~04:30-03
**Autorização:** operador, explicitamente, nesta sessão — opção "aplicar as duas, sem rodar o smoke".
**Via:** `p46apply.cjs migrate` (Management API, SQL lido do arquivo byte a byte; migration e
linha do ledger na MESMA requisição, logo na mesma transação).
**Portão que autorizou:** `46-REVIEW-4.md` — 0 blockers, `seguro_aplicar: SIM`, terceira rodada
de uma cadeia em que a segunda encontrou 2 blockers introduzidos pelo próprio conserto.

## O que foi aplicado

| version | name | octetos | md5 do arquivo | md5 lido de volta do ledger |
|---|---|---|---|---|
| `20260823000014` | `p46_portao_flip_veredito` | 42780 | `1937a39cef5ce3d23ced4c3d6d82ccbd` | **bate** |
| `20260823000015` | `p46_config_purga_privilegio` | 23940 | `61dbd3f20582a129702c8712eb104516` | **bate** |

Os dois md5 e as duas contagens de octetos foram conferidos **antes** do apply, em `--dry-run`,
contra os valores que a `46-REVIEW-4.md` publicou de forma independente. Bateram nos quatro.

## O efeito, medido depois — não inferido da saída do aplicador

| Verificação | Antes | Depois |
|---|---|---|
| `md5(prosrc)` de `salvar_config_purga` | `9e1a55bee81aaa7b42d45e5a5a8fee7b` | `e10786bd4e21bce3e9dd956f6a479db2` |
| `has_table_privilege('service_role','config_purga','UPDATE')` | `true` | **`false`** |
| `has_table_privilege('authenticated','config_purga','UPDATE')` | — | **`false`** |
| `prosecdef` | `t` | `t` |
| `proconfig` | `{search_path=""}` | `{search_path=""}` |
| `proowner` | `postgres` | `postgres` |
| `config_purga.modo` | `dry_run` | `dry_run` |
| `cron.job` jobid 6 `active` | `true` | `true` |
| `purga_execucoes` | 4 | 4 |
| `candidatos` | 31 | 31 |

O corpo da função **mudou** (prova de que o apply teve efeito) e nada mais mudou: nenhuma
linha de dado escrita ou destruída, nenhuma propriedade que o `CREATE OR REPLACE` pudesse
perder silenciosamente foi perdida, e o `REVOKE` landou nos dois papéis.

## A prova de que o conserto do BL-01 está vivo

Recorte antigo (`…0013`) contra o novo (`…0014`), medidos sobre o estado real de PROD:

| Recorte | crit. 2 (execuções) | crit. 3 (ensaios) |
|---|---|---|
| ANTIGO — só `modo_vigente` | 2 | **2** |
| NOVO — allowlist de `veredito` + evidência de `relato_dry_run` | 2 | **1** |

A execução `e3115161` (2026-08-22 20:03) tem `elegiveis = 6` e seis itens, **nenhum com
`relato_dry_run`** — ela é anterior à versão do sweep que captura a pré-imagem. O portão antigo
a contava como ensaio; o novo não conta. Era o BLOCKER, e ele era real, não hipotético.

## O que este apply NÃO fez, deliberadamente

- **Não rodou o smoke** (`p46_purga_smoke.sql`, passo 4). O operador optou por parar antes.
  Ele continua sendo a única prova ponta a ponta do `(d.3)` — a prova que existe hoje é contra
  fixture sintética. ⚠ Se o `(d.3)` voltar vermelho, ler primeiro a asserção nova de fixture:
  ela dispara **antes** da asserção de marcador e diz, em caixa alta, que o suspeito é a
  FIXTURE e não a RPC.
- **Não mexeu no modo.** `dry_run` continua `dry_run`. O flip para `live` é 2026-09-06 e é
  outro checkpoint, com o runbook próprio.
- **Não armou nem desarmou o cron.**

## Um fato de calendário que estava errado no registro

`cron.timezone = GMT`. O `schedule` `0 3 * * *` do job 6 é **03:00 UTC = 00:00 America/Sao_Paulo**,
e não 03:00 local. E `cron.job_run_details` tem **0 linhas para o jobid 6**: o cron **nunca
disparou**. As 4 linhas de `purga_execucoes` vieram de chamadas manuais. A primeira varredura
automática é **2026-08-24 00:00-03**.

## Pendências herdadas, todas pós-apply (nenhuma bloqueia)

1. **Provar `cron.alter_job` por execução.** O privilégio foi medido (`postgres` pode executar;
   `UPDATE cron.job` levanta `42501` e foi por isso que a alavanca do runbook mudou), mas
   desarmar/rearmar num momento controlado ainda não foi feito.
2. **HI-01 da `46-REVIEW-4`:** o invariante da `…0015` não tem guarda recorrente — nenhum smoke
   mede `has_table_privilege`/`relacl`. Um `GRANT ALL ON ALL TABLES … TO service_role` reabriria
   o buraco com todos os portões verdes.
3. **HI-02 da `46-REVIEW-4`:** a tabela de vigilância dos 14 dias não nomeia o sinal de
   evidência do critério 3 — e PROD já contém a execução que ela deixa passar.
