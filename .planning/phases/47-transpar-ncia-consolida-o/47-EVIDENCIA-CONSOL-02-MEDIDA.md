# Phase 47 · CONSOL-02 medido em PROD — o apply era real, faltava o artefato

**Medido em:** 2026-08-23, ~11:50-03 (relógio do banco, remedido — não reusado)
**Fecha:** o item `behavior_unverified` do `47-VERIFICATION.md` (SC#2 / VISRH-03 / W-1) e o
primeiro item de `human_verification`.

## O que o verificador não pôde medir, e por quê

O `47-VERIFICATION.md` (2026-08-12) registrou, corretamente, que a alegação de apply do
`47-07-SUMMARY.md` **não tinha nenhum artefato de apoio** — e recusou-se a aceitá-la. O motivo
está escrito no próprio `why_human`: o subagente verificador não recebe os tools MCP do Supabase
(bug upstream `anthropics/claude-code#13898`), então ele não tinha como olhar o banco.

**A alegação era VERDADEIRA.** O defeito era de escrituração, não de banco.

## A medição

| Fato | Valor |
|---|---|
| `to_regprocedure('public.listar_historico_candidatura(uuid)')` | **existe** |
| `prosecdef` | `true` |
| `proconfig` | `{search_path=""}` |
| `20260809000001` no ledger | **sim**, junto das duas irmãs `000002` e `000003` |

E o conteúdo escriturado bate com o disco nas três:

| version | `md5 -q` do arquivo | `md5(statements[1] \|\| E'\n')` do ledger | octetos (arquivo / ledger) |
|---|---|---|---|
| `20260809000001` | `a0afa7f1866a61179caa72ffecd251c5` | **igual** | 23955 / 23954 |
| `20260809000002` | `fa25249cf8793f81da462e4d5c03ddea` | **igual** | 20837 / 20836 |
| `20260809000003` | `36d6b38de19289993c48c8b49faf3315` | **igual** | 13664 / 13663 |

A diferença de 1 octeto é o `\n` final, que a **via de apply antiga** descartava — a mesma
assinatura que a verificação da Phase 46 identificou nas migrations `0001–0005`. Não é
divergência de conteúdo.

## O smoke `p47_historico_smoke.sql` — VERDE 6/6, na segunda tentativa

```
contador_final = "6"
```

6 é o esperado fixo do RESUMO `(z)`. Contador **lido**, não inferido da ausência de exceção:
`SELECT current_setting('smoke47h.pass', true)` anexado como último statement da mesma
requisição. O prefixo enviado tem md5 idêntico ao arquivo do repositório.

**Invariante de leitura conferida por fora**, além da asserção `(f)` do próprio smoke:

| | antes | depois |
|---|---|---|
| `candidaturas` · `candidatos` · `historico_candidatura` | 20 · 31 · 13 | **20 · 31 · 13** |
| `auth.users` · `logs_auditoria` · `vagas` | 37 · 6 · 12 | **37 · 6 · 12** |

## ⚠ A primeira tentativa REPROVOU — e o defeito era do portão, não da função

```
P47H FAIL (fixture): a candidatura a111296a-4a56-4eda-a6b8-3c5312048e3a nao resolve
o user_id do titular — o rotulo 2 (O proprio candidato) nao poderia ser exercitado
```

Medido antes de teorizar, como o STATE.md manda:

1. O seletor do **caminho feliz** devolvia vazio — correto, `casos_felizes_validos = 0`.
2. O **fallback** então escolhia `ORDER BY cv.created_at DESC LIMIT 1` **sem filtro nenhum**.
3. O statement seguinte exige `ca.user_id IS NOT NULL` — propriedade que o fallback não pediu.

**O fallback não filtrava pela propriedade que o seu próprio consumidor exige**, e o diagnóstico
que ele imprimia culpava o DADO. A função `listar_historico_candidatura` está correta.

**Por que só apareceu agora.** Exatamente **1 de 31** candidatos tem `user_id` nulo, e ele é
dono das **duas candidaturas mais novas** (2026-08-22 01:32 e 01:34). É o resíduo da execução
real do motor de exclusão da **Phase 45**, que rodou em PROD em 2026-08-22 sobre a conta
descartável. O `candidatos_user_id_fkey` foi trocado de `CASCADE` para `SET NULL`
**deliberadamente**, para o candidato sobreviver à remoção da conta. Este smoke foi escrito
antes desse estado poder existir.

### Consertado pela FORMA, e o portão continua mordendo

Duas instâncias, as duas neste arquivo:

- **`:184` (fallback)** — ganhou `JOIN candidatos` + `WHERE ca.user_id IS NOT NULL`.
- **`:162` (caminho feliz)** — mesma cegueira latente: `h.ator IS DISTINCT FROM ca.user_id`
  devolve **TRUE** quando `ca.user_id` é nulo, então uma candidatura impossível poderia ser
  eleita "caminho feliz" só para ser recusada 20 linhas abaixo. Ganhou o mesmo predicado,
  **antes** do `IS DISTINCT FROM`.

Varredura por forma (`IS DISTINCT FROM` entre duas colunas anuláveis em WHERE de seletor) sobre
`supabase/tests/` e `supabase/migrations/`: **nenhuma outra instância**. Os demais hits são o
idioma correto — comparação contra literal dentro de `IF`. Os de `:211`/`:225` comparam contra
`v_titular`, que a guarda de `:202` já garante não-nulo.

**Prova de que o portão ainda morde**, por execução read-only:

| Caso | Resultado |
|---|---|
| positivo — seletor consertado escolhe | `a802bc05-…` (utilizável) |
| **mordida** — simulando banco sem nenhum titular com conta | **NULL → a fixture LEVANTA** |
| regressão — seletor antigo, sem filtro | `a111296a-…`, o caso que reprovava |

## O que continua aberto na Phase 47 — e não se fecha por código

Os outros dois itens de `human_verification` são **julgamento jurídico/regulatório**, não
execução:

1. **Parecer formal do Encarregado (DPO)** sobre os quatro itens de publicação (os seis países
   e a base legal de cada, a formulação do provedor de hospedagem, a qualificação do serviço
   público de CEP, e a copy das duas páginas públicas). `WINDOWS.md` 26 e 30 registram que segue
   aberta; a publicação atual foi liberada só pelo operador em 2026-08-11, e o
   `47-08-SUMMARY.md` é explícito em não confundir uma coisa com a outra.
2. **Classificar `api.ipify.org` e `www.youtube.com`** como empresas contratadas (com ficha em
   `subprocessadores.ts` e país medido) ou como não-fornecedores (decisão registrada em
   `DECISOES` de `destinosDeRedeComFicha.test.ts`). Hoje os dois aparecem como
   `pendente-de-decisao`, e a página pública já está no ar sem cobri-los.
