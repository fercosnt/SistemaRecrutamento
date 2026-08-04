# 44-05 — Evidência do checkpoint: deploy e fecho da assunção A1

**Executado pelo orquestrador em:** 2026-08-04
**Origem:** `44-05-PLAN.md` §Task 3, passos 1, 2, 4 e 6 (parcial)
**Estado:** A1 **FECHADA**. Prova ao vivo pelo navegador (passos 3 e 5) **pendente** — ver §Ainda em aberto.

---

## 1 · Deploy — JWT-ON, versão 1

`exportar-meus-dados` **não existia** em produção antes deste deploy: é criação, não
substituição. Nenhuma versão anterior foi sobrescrita.

| Campo | Valor |
|---|---|
| slug | `exportar-meus-dados` |
| id | `cf0fa6ab-4568-406b-85aa-19c5becdce70` |
| **version** | **1** (primeira) |
| status | `ACTIVE` |
| **verify_jwt** | **`true`** — nunca `--no-verify-jwt` |
| ezbr_sha256 | `43a3297d34f0a548147d6748957c6d9cb7198932da93a92c9ff5750685d7a0b5` |

Arquivos enviados: `exportar-meus-dados/index.ts` (entrypoint) + `_shared/exportAllowlist.ts`.
Sem `deno.json`: a função não tem nenhum import por especificador nu — só `esm.sh` (estático)
e o relativo `../_shared/exportAllowlist.ts`. `deno check` local passou antes do envio.

---

## 2 · O discriminador — A1 fechada POSITIVAMENTE

**Correção de forma em relação à letra do plano, e ela importa.** O plano manda chamar
**sem** `Authorization` e ler `{"ok":false,"error_code":"UNAUTHORIZED",…}` como prova de que
o grafo de módulos carregou. Com **JWT-ON isso não discrimina**: sem header, quem responde é
o *gateway* da plataforma, e a requisição **nunca alcança a função** — o corpo seria do
gateway em qualquer cenário, inclusive com o import quebrado.

A sonda que discrimina manda a **publishable key** (`frontend_beauty_smile`): ela passa o
gateway, chega à função, e aí o `getUser()` falha por não haver sessão de titular — devolvendo
o 401 **do código**. As duas respostas têm corpos **diferentes**, e é essa diferença que é a prova.

| # | Requisição | HTTP | Corpo | Lê-se |
|---|---|---|---|---|
| A | `POST` sem `Authorization` | 401 | `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}` | **gateway** — confirma JWT-ON ativo |
| B | `POST` + `Bearer <publishable>` | 401 | `{"ok":false,"error_code":"UNAUTHORIZED","message":"Sessão inválida."}` | **função** — ver abaixo |
| C | `GET` + `Bearer <publishable>` | 405 | `{"ok":false,"error_code":"SERVER_ERROR","message":"Método não suportado"}` | **handler** alcançado |
| D | `OPTIONS` | 200 | `ok` | preflight CORS curto-circuita antes do guard |

**Por que B fecha A1.** `"Sessão inválida."` e `error_code:"UNAUTHORIZED"` são strings do
próprio `index.ts`. Para que elas apareçam na rede, o módulo precisou **carregar inteiro** —
e carregar inteiro inclui resolver `import { EXPORT_ALLOWLIST } from "../_shared/exportAllowlist.ts"`,
porque um import quebrado falha no **boot** e nunca alcança o corpo do `Deno.serve` (lição
literal do 41-05 / ERR_MODULE_NOT_FOUND da P10-13). O espelho `.ts` **sobreviveu ao bundler**.

C acrescenta o outro lado: o 405 sai de `handler()`, depois do `Deno.serve`, depois da
montagem dos dois clientes. Não é só "o módulo carregou" — é "o caminho até o handler executa".

A decisão de PARAR prevista no plano (500 opaca / erro de boot) **não foi acionada**.

---

## 3 · Asserção negativa — os três probes não escreveram

`solicitacoes_dados` medida logo após as sondas:

```sql
SELECT count(*) FROM public.solicitacoes_dados;  -- 0
```

**0 linhas** — idêntico à linha de base medida no 44-04. Correto por desenho: em B o 401 sai
no passo 1 (AUTHENTICATE), **antes** do INSERT do passo 4; em C o 405 sai antes de tudo. Uma
contagem diferente de 0 aqui teria sido achado, não ruído.

## 4 · Policies vivas (M3) — lidas do catálogo, não transcritas

```
config_sla_dados   | config_sla_dados_rh_read              | PERMISSIVE | {authenticated} | SELECT
                   | qual: auth.jwt() #>> '{app_metadata,role}' = ANY ('rh','administrador')
solicitacoes_dados | solicitacoes_dados_candidato_own_read | PERMISSIVE | {authenticated} | SELECT
                   | qual: candidato_id IN (SELECT id FROM candidatos WHERE user_id = auth.uid())
```

**Zero policy de escrita para o candidato** — como o `COMMENT ON POLICY` da migration declara.
Só o `service_role` da EF escreve. O RH **não** lê por policy: lê pelas duas RPCs
`SECURITY DEFINER` (`listar_pedidos_dados`, `contar_pedidos_dados_pendentes`), ambas com
`GRANT EXECUTE ... TO authenticated` — é esse o caminho que o 44-08 consome.

---

## Ainda em aberto (passos 3 e 5 — exigem navegador e login real)

O que foi provado acima é o **lado servidor**: a função existe, autentica, e o import crítico
sobreviveu. O que **não** foi provado, e não pode ser sem uma sessão de titular:

1. **Caminho feliz ponta a ponta** — clique em `/candidato/privacidade` → `.json` no aparelho,
   1 linha `tipo='acesso'`, `situacao='atendido'`, `causa` NULA, `atendido_em` preenchida.
2. **Render da seção 3** abaixo das duas vivas, com as seções 1 e 2 visualmente intactas.
3. **Estado de carregamento** e o botão desabilitado impedindo o segundo clique.
4. **Cooldown por tentativa real** (segundo clique → erro, e o banco não ganha linha).

**Deliberadamente NÃO exercido em produção:** cunhar uma sessão de titular via Auth admin para
provar o caminho feliz sem navegador **queimaria a janela de cooldown de 24 h** da conta de
teste — e o primeiro clique humano cairia em 429 em vez do caminho feliz, destruindo exatamente
a evidência que o passo 3 existe para produzir. A ordem certa é o navegador primeiro.
