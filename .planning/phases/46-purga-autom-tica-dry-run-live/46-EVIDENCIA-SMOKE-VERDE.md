# Phase 46 · O smoke `p46_purga_smoke.sql` rodou em PROD e ficou VERDE — 27/27

**Rodado em:** 2026-08-23, **11:26:40-03** (ver errata abaixo)
**Autorização:** operador, explicitamente, nesta sessão.

> ### ⚠ ERRATA — o carimbo de hora original estava errado
>
> A primeira versão deste arquivo dizia **"~04:50-03"**. Está errado, e a `46-VERIFICATION.md`
> pegou o erro medindo `pg_stat_statements.stats_since` do bloco `DO $de$` na forma atual:
> **`2026-08-23 11:26:40.107-03`**, um minuto antes do commit `a4f9977` (11:27:33-03).
>
> **Causa:** reusei um `now()` que eu havia medido às 04:22-03, no começo da sessão, em vez de
> remedir na hora de escrever. Entre as duas coisas houve ~7 h — o intervalo em que a pergunta
> sobre os gaps ficou aberta esperando a decisão do operador.
>
> O apply das migrations, esse sim, foi às **04:29:09-03** (commit `7a9976d`), e o carimbo do
> `46-EVIDENCIA-APPLY-0014-0015.md` está correto.
>
> **Nada mais neste arquivo muda.** O contador 27, os md5, e as 18 grandezas do envelope foram
> medidos no run real e seguem valendo. O erro era de transcrição de relógio, não de medição —
> mas fica registrado em vez de apagado, porque um carimbo de hora errado em evidência de fase
> destrutiva é exatamente o tipo de coisa que vira "fato" por sobrevivência.
**Via:** `p46apply.cjs run` — corpo lido do arquivo byte a byte, numa **única requisição**,
pelo orquestrador. As duas condições que o cabeçalho do próprio arquivo impõe (`:27-37`).

## O gate

```
contador_final = "27"
```

**27 é o esperado FIXO** do RESUMO `(z)` (`:3691`): 6 do 46-02 + 5 do 46-03 + 5 do 46-04 +
5 do 46-05 + 4 do 46-06 + 2 do 46-07. Nenhuma asserção levantou exceção.

⚠ **O contador foi LIDO, não inferido.** O cabeçalho é explícito: *"LER O CONTADOR É OBRIGAÇÃO
DE QUEM RODA: «não levantou» nunca foi «as asserções rodaram»"*. Anexei
`SELECT current_setting('smoke46p.pass', true)` como último statement da mesma requisição —
`set_config(..., false)` é escopado à sessão, então ler noutra chamada devolveria vazio.

**O que rodou é o arquivo do repositório**, provado por md5 do prefixo:

| | md5 |
|---|---|
| `supabase/tests/p46_purga_smoke.sql` (252163 octetos) | `b9a1140fcf6f692bf502d1239e8fb10d` |
| os primeiros 252163 octetos do que foi enviado | `b9a1140fcf6f692bf502d1239e8fb10d` |

A única diferença são os 67 octetos anexados da leitura do contador.

## Por que este run importa

A `46-VERIFICATION.md` registrou que o smoke havia mudado **153 linhas executáveis** desde o
último 27/27 verde (`git diff 5351bde..HEAD`), **incluindo os dois consertos de BLOCKER** ao
bloco `(d)`. Era o maior gap da fase: requisitos cuja única evidência era um arquivo de teste
não executado. Em particular, o `(d.3)` — cujo conserto (BL-R3-02) só tinha prova contra
fixture sintética — agora tem prova de execução contra o estado real.

## O envelope devolveu tudo — medido por fora, não pela asserção de teardown do smoke

Retrato tomado **antes** e **depois**, por consulta independente:

| Fato | Antes | Depois |
|---|---|---|
| `config_purga` (linha inteira em `jsonb`) | `modo=dry_run`, `atualizado_em=2026-08-23T02:06:37.866049-03`, `cap_titulares=50`, `janela_notificacoes_meses=24` | **idêntica** |
| `purga_execucoes` | 4 | **4** |
| `purga_execucao_itens` | 10 | **10** |
| T0 (âncora `min(iniciada_em)`) | `2026-08-22 20:03:14.148963-03` | **idêntica** |
| `logs_auditoria` com `acao='alterar_config_purga'` | 1 | **1** |
| `candidatos` · `candidaturas` · `auth.users` · `notificacoes_enviadas` | 31 · 20 · 37 · 12 | **31 · 20 · 37 · 12** |
| `cron.job` jobid 6 `active` | `true` | **`true`** |
| `net.http_request_queue` | — | **0** |

A impressão digital da linha inteira de `config_purga` foi comparada por `to_jsonb`, e não por
coluna escolhida a dedo — uma coluna nova não faria esta conferência envelhecer.

O `(e)` do próprio smoke também afirma que a trilha desapareceu com o rollback, e isso é a prova
estrutural de que ela vive na mesma transação da mutação. As duas medições concordam.

## O que este run fechou, e o que continua aberto

**Fechado:**
- **PURGA-04** — `(d.3)`, `(d.7)`, `(d.8)`, `(d.9)`: o portão do flip recusa pelos critérios
  certos, inclusive o caso novo que constrói 14 execuções com `veredito='segredo_ausente'` e
  exige recusa.
- **RETEN-05** e a metade de despacho de **PURGA-01** — `(m)`, com a condição nova que de fato
  mede o dispatch.

**Continua aberto — e não se fecha por código:**
- **PURGA-01 / PURGA-03**: `cron.job_run_details` para o jobid 6 segue em **0 linhas**. O cron
  **nunca disparou**; as 4 execuções são manuais. Fecha sozinho quando a noite de
  **2026-08-24 00:00-03** passar — basta ler `job_run_details`. **0 de 14 noites decorridas.**
- Provar `cron.alter_job` por execução (desarmar/rearmar num momento controlado).
- Os dois HIGH pós-apply da `46-REVIEW-4` (guarda recorrente do invariante da `…0015`; o sinal
  de evidência do critério 3 ausente da tabela de vigilância dos 14 dias).
