# 48-EVIDENCIA-JORN06 — a causa do 401 da devolutiva do Big Five, medida

**Data:** 2026-09-21
**Plano:** 48-05 · Task 2 (parte depois do sinal) · D-13 (medir a causa ANTES do conserto)
**Quem leu:** o orquestrador, pelo MCP do Supabase (`query_logs`, `function_logs` e
`function_edge_logs`, janela 2026-09-21T19:58Z–20:06Z). O executor da continuação não pôde ler —
o Keychain do macOS estava bloqueado na sessão retomada, e o `p46apply`/`logs.cjs` dependem dele.
O MCP autentica por outro canal e só lê.

## A submissão de prova

| Campo | Valor |
|---|---|
| Operador | submeteu às **17:01 (-03) = 20:01 UTC** |
| Conta | `+claude1` — conta de teste (medido: `candidatos.email ilike '%+claude%'` = true) |
| Candidatura | `2ce20fbf-df1a-4850-b7ee-1c2a0fb88a13` (`avaliacao_assincrona` / `aguardando_resposta`) |
| Score | `6d1136de-1df7-4fa2-b8f7-b59b2bab115d`, `tipo = 'big_five'` (medido) |
| Devolutivas da candidatura depois do envio | **0** (medido) |

A leitura que o operador relatou no sinal de retomada bate campo a campo com a leitura abaixo.

## As quatro linhas (mesma requisição `01a0c58f-7b0b-7393-bb8e-e6cb7706a454`, exceto a (d))

**(a) `diag-auth`** — `function_logs`, `gerar-devolutiva-bigfive` **v23**, 2026-09-21T20:01:51.481Z, `level: info`:

```
[gerar-devolutiva-bigfive] diag-auth {
  auth_presente: false,
  esquema: "ausente",
  recebido_formato: "vazio",
  recebido_len: 0,
  esperado_env: "SUPABASE_SERVICE_ROLE_KEY",
  esperado_formato: "sb_secret",
  esperado_len: 41,
  apikey_formato: "sb_secret"
}
```

**(b) a guarda** — `function_logs`, mesma execução, 2026-09-21T20:01:51.481Z, `level: warning`:

```
[gerar-devolutiva-bigfive] Rejected request: invalid/absent Bearer
```

**(c) o edge log** — `function_edge_logs`, 2026-09-21T20:01:51.487Z:

```
POST | 401 | /functions/v1/gerar-devolutiva-bigfive   (version 23)
user_agent: Deno/2.1.4 (SupabaseEdgeRuntime/1.76.0)
x_client_info: supabase-js/2.116.0; runtime=deno
apikey: formato sb_secret (prefixo e hash omitidos de propósito)
request.sb.jwt.*: AUSENTE — nenhum campo de JWT/Authorization no request
```

**(d) o chamador** — `function_logs`, `submit-bigfive-final` **v12**, requisição
`01a0c58f-733a-7d10-abe3-3c3b8dcdfed3`, 2026-09-21T20:01:51.496Z:

```
[submit-bigfive-final] ok {
  candidatura_id: "2ce20fbf-df1a-4850-b7ee-1c2a0fb88a13",
  score_id: "6d1136de-1df7-4fa2-b8f7-b59b2bab115d",
  respostas_count: 116,
  status: "sucesso",
  devolutiva_id: null,
  devolutiva_erro: "FunctionsHttpError",
  devolutiva_status: 401
}
```

O edge log do próprio submit (20:01:51.503Z) é `POST | 200`, como `authenticated` — o candidato
recebe `ok: true` e a falha só existe no log.

## Leitura

- O 401 vem da **guarda no código** (linha (b), escrita pela própria função, 6 ms antes do edge
  401), e não do gateway: `gerar-devolutiva-bigfive` está com `verify_jwt = false`, e a execução
  chegou ao código (houve boot e log).
- O `Authorization` chegou **ausente** (`auth_presente: false`, `recebido_len: 0`, e o edge log sem
  nenhum campo de JWT). O `apikey` chegou, no formato `sb_secret` — é a chave do ambiente das EFs,
  que o supabase-js põe no `apikey` e, por `omitApiKeyAsBearer`, **não** repete como Bearer quando
  não há sessão.
- A guarda compara o Bearer com `SUPABASE_SERVICE_ROLE_KEY` (formato `sb_secret`, 41 caracteres).
  Ausente ≠ esperado → 401.
- Divergência de letra com o RESEARCH §G: a pesquisa citava supabase-js **2.110.9** no bundle; o
  runtime registrou **2.116.0**. O comportamento medido é o mesmo — a hipótese é sobre o
  comportamento, não sobre a versão.

## Veredito do portão

**H1 CONFIRMADA — Task 3 autorizada.** A linha da guarda está presente, e
`auth_presente: false`, `apikey_formato: sb_secret`, `esperado_formato: sb_secret`.

## Observação fora de escopo (registrada, não consertada)

`candidaturas.data_bigfive_enviado` está **nulo** na candidatura da prova — e nos **3 de 3**
scores `big_five` que existem em PROD (medido). O `submit-bigfive-final` não carimba essa coluna.
É anterior à fase e não é o JORN-06; vai para `deferred-items.md`.

## Backlog

Medido pelo orquestrador em 2026-09-21, só leitura (MCP `execute_sql` com `SET TRANSACTION READ ONLY` — o
Keychain bloqueado impediu o `p46apply`), pela query do plano: candidaturas com score `big_five` e sem
linha em `devolutivas_candidato`, com a classe da conta.

BACKLOG: 2
DEVOLUTIVAS_ANTES: 1
PAR: bf26ee3c-0ae3-4e92-a99b-6e05efc2a662 b4f604db-302e-4d45-8e77-90a829381895
PAR: 2ce20fbf-df1a-4850-b7ee-1c2a0fb88a13 6d1136de-1df7-4fa2-b8f7-b59b2bab115d
CONTAS: todas de teste

`bf26ee3c…` é a candidatura `+claude4` rejeitada na triagem (a mesma do retroativo (B) do 48-12);
`2ce20fbf…` é a submissão de prova desta task (`+claude1`). Nenhum candidato real no backlog.
A geração é da Task 4, pelo operador, no painel — e só depois do deploy do conserto.

## Deploy do conserto

**Quando:** 2026-09-21, 22:35:55Z (`gerar-devolutiva-bigfive`) e 22:35:56Z (`submit-bigfive-final`).
**Quem:** o operador, no próprio Terminal, com `node efdeploy.cjs <slug>` — o Keychain continuou
inacessível ao processo do Claude (`errSecInteractionNotAllowed`, exit 36, dentro e fora do sandbox),
então o token não passou por processo nenhum do Claude. A transcrição pelo MCP foi recusada de
propósito (é a via que o `efdeploy.cjs` existe para evitar).

Conferido depois pelo orquestrador, só leitura (MCP `list_edge_functions` + `get_edge_function`):

| EF | Antes | Depois | `verify_jwt` | Conferência do bundle vivo |
|---|---|---|---|---|
| `gerar-devolutiva-bigfive` | v23 | **v24** | `false` (inalterado) | 9 de 9 arquivos **byte a byte iguais** ao disco; `diag-auth`: 0 ocorrências; `classificarFormatoCredencial`: 0; guarda SEC-04 presente |
| `submit-bigfive-final` | v12 | **v13** | `true` (inalterado) | `serviceKey` nas deps, `serviceKey: SERVICE_KEY` no wiring do `Deno.serve`, e `headers: { Authorization: "Bearer " + serviceKey }` no `functions.invoke` |

O log de diagnóstico, que registrava formato e comprimento da credencial em toda requisição, saiu
do ar com a v24. A prova de que o conserto funciona continua sendo a submissão NOVA pelo navegador
no 48-18 (sessão 1, passo f).

## Retroativo

RETROATIVO: RECUSADO

Decisão do operador em 2026-09-21, depois do deploy do conserto. O backlog são as 2 candidaturas
de conta de teste listadas em §Backlog; elas ficam registradas e sem devolutiva. Nenhuma chamada
foi feita a `gerar-devolutiva-bigfive` por esta task, e a credencial de serviço não saiu do
servidor. A prova do JORN-06 segue sendo a submissão nova pelo navegador no 48-18 (sessão 1, passo f).
