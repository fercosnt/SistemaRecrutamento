---
phase: 44
plan: 04
subsystem: banco
status: complete
tags: [lgpd, export, art19, apply, prod, rls, m3, pg_policies, allowlist, 42601, md5, snapshot]

requires:
  - "supabase/migrations/20260804000001_p44_config_sla_dados.sql (44-02) — aplicada aqui"
  - "supabase/migrations/20260804000002_p44_solicitacoes_dados.sql (44-02) — aplicada aqui"
  - "supabase/tests/p44_pedidos_dados_smoke.sql (44-02) — o contrato executável, 14 asserções"
  - "docs/compliance/catalogo-vivo-44.json — M2′ re-medido pelo orquestrador pós-apply (95c4952)"
  - "44-03 §'solicitacoes_dados — pendente por desenho' — a obrigação de regerar, em três registros"
provides:
  - "public.config_sla_dados VIVA em PROD (seed acesso_dados 7/12, RLS ligada, 1 policy SELECT RH-only)"
  - "public.solicitacoes_dados VIVA em PROD (0 linhas, RLS ligada, 1 policy SELECT own-row, zero escrita)"
  - "public.listar_pedidos_dados(boolean) e public.contar_pedidos_dados_pendentes() VIVAS, anon revogado"
  - "M3 — retrato bruto de pg_policies/pg_class/has_function_privilege das duas tabelas, com timestamp"
  - "export-allowlist.json regenerado: 365 exportadas + 34 excluídas = 399 (união fecha)"
  - "os DOIS blocos VALUES de 05-export-allowlist-drift.sql em sincronia (asserção (k) verde)"
  - "gen-export-allowlist.cjs --sql-values agora emite colável de verdade (indentação de 4 no contrato)"
affects:
  - "44-05 — a EF exportar-meus-dados escreve em solicitacoes_dados e projeta por EXPORT_ALLOWLIST"
  - "44-06/44-07 — o painel do candidato lê a própria linha pela policy own-row provada aqui"
  - "44-08/44-09 — a fila e o badge do RH consomem as duas RPCs; ver a nota de nulidade abaixo"
  - "Phase 45 — herda tipo já com exclusao, e herda as 7 colunas com veredito nomeado"

tech-stack:
  patterns:
    - "md5 do ledger comparado contra md5(arquivo SEM o \\n final) — o banco não guarda o newline final"
    - "fidelidade de comentário provada por obj_description, não só por hash"
    - "gerador provado contra arquivo TEMPORÁRIO antes do git-trackeado (o `>` trunca antes de executar)"
    - "veredito que se resolve sozinho é CONFERIDO, não aceito por ter fechado"

key-files:
  modified:
    - docs/compliance/export-scope-rules.yaml
    - docs/compliance/export-allowlist.json
    - supabase/functions/_shared/exportAllowlist.ts
    - docs/compliance/sql/05-export-allowlist-drift.sql
    - docs/compliance/sql/gen-export-allowlist.cjs
    - docs/compliance/__tests__/exportAllowlist.test.ts
    - docs/compliance/__tests__/genExportAllowlist.test.ts

decisions:
  - "O esperado de md5 do plano estava ERRADO (hash do arquivo inteiro); o banco guarda o texto sem o \\n final. Corrigido — como estava, reprovaria TODA migration desta fase e das futuras."
  - "As 3 colunas `text` de solicitacoes_dados (tipo/situacao/causa) receberam veredito explícito true; relaxar a R3 para aceitar `text` continua proibido."
  - "`causa` entra na cópia e é segura por CONSTRUÇÃO: vocabulário fechado por CHECK e COMMENT proibindo mensagem crua/HTTP/stack/Storage — a telemetria foi barrada no DDL uma fase antes desta decisão."
  - "A indentação de 4 espaços do --sql-values virou contrato no GERADOR, não no regex do consumidor: afrouxar a (k) para ^\\s*\\( perderia a checagem de que o paste caiu no lugar certo."
  - "`pendentes_por_desenho` REMOVIDO do YAML: mantê-lo descrevendo tabela que já existe seria documentação falsa."
  - "EXPORT-05 NÃO marcado Complete — as tabelas vivem, mas o requirement só é observável quando a fila do RH renderizar (44-08/44-09)."

metrics:
  duration: ~50min
  completed: 2026-08-04
  tasks: 3 (2 checkpoints executados pelo orquestrador + 1 auto, esta bloqueada por auth gate)
  commits: 3
  files: 7

actuals:
  tokens: 5857
  tasks: 3
  commits: 3
---

# Phase 44 Plan 04: As duas tabelas viram objeto vivo, e o catálogo é lido antes de qualquer afirmação — Summary

As duas migrations do 44-02 chegaram a PROD na ordem certa, o ledger foi reconciliado, a fidelidade
provada por md5 **e** por leitura de `obj_description`, o smoke devolveu **14/14** numa única
chamada, e o M3 — a única das cinco medições da pesquisa que não podia existir antes do apply —
está colado aqui em bruto. A allowlist foi regerada e a união voltou a fechar, agora em **399**.

**Nenhuma linha de candidato foi lida, escrita ou apagada.** As únicas escritas foram as duas
tabelas novas e um seed de uma linha.

## Divisão de trabalho

Subagentes GSD não recebem os tools MCP do Supabase (anthropics/claude-code#13898). Todo passo vivo
foi do **orquestrador**; a verificação de repositório, os vereditos e a regeração foram do executor.
Isso é premissa de planejamento desde o kickoff do M8, não descoberta de meio de fase.

---

## Task 1 — Apply, ledger, fidelidade e smoke

### O que foi medido ANTES (a evidência que o apply destrói)

| | Valor |
|---|---|
| `to_regclass` das duas tabelas | **NULL, NULL** ✓ |
| candidatos / candidaturas / vagas / crons | **22 / 9 / 9 / 3** |
| topo do ledger | `20260803000001` ✓ (o prefixo do 44-02 não colidiu) |

### Os dois applies

`config_sla_dados` primeiro — a ordem é o controle. Ela não tem dependência e não tem corpo
delimitado por cifrões, então seu apply é o teste **barato** do procedimento 42601 antes da tabela
que registra o marco de um prazo legal.

**Nenhum 42601 em nenhuma das duas** — nem na `…0002`, que tem os dois corpos `$$` cercados de
`REVOKE`/`GRANT`/`COMMENT`, exatamente a combinação que o pooler recusa. Ledger reparado após cada
apply (`apply_migration` carimba o timestamp do instante, não o prefixo do arquivo).

### ⚠ O esperado de md5 do plano estava errado — e teria gritado para sempre

| Migration | esperado pelo plano | **esperado correto** | banco |
|---|---|---|---|
| `…0001` | `2950aab2…` ✗ | **`dc51bd9d…`** | `dc51bd9d…` ✓ |
| `…0002` | `8f184384…` ✗ | **`b2f9a9f8…`** | `b2f9a9f8…` ✓ |

Duas causas somadas, e as duas foram diagnosticadas pelo orquestrador:

1. **O banco guarda o texto SEM o `\n` final.** `md5(conteúdo.rstrip('\n'))` reproduz o valor do
   ledger nos dois casos, byte a byte. Confirmado localmente.
2. `length()` no Postgres conta **caracteres**; `wc -c` conta **bytes**. Estes arquivos são cheios
   de `é`, `ã`, `⚠` — 12588 chars contra 12817 bytes, 21444 contra 21720.

**O que importa não é o hash errado, é o que ele teria feito.** Como estava, o critério reprovaria
**toda migration desta fase e de todas as futuras**. Um esperado que nunca bate ensina a ignorar a
comparação — e aí a vez em que um `COMMENT` realmente sumir passa como mais um falso vermelho.

É a **terceira ocorrência da mesma classe nesta fase**: o smoke do 44-03 gritava 34 vezes por
desenho, o grep do 44-02 reprovava a prosa que o próprio plano mandava escrever, e agora este.

**Fidelidade provada onde o hash não alcança:** `obj_description` da tabela diz `TETO LEGAL`, o
COMMENT de `dias_atraso` carrega o teto de 15 dias **e** a razão do CHECK deliberadamente ausente, e
os 3 COMMENTs de coluna existem. O md5 prova que *algo* chegou íntegro; ler o conteúdo prova que a
**coisa certa** chegou.

### Smoke: 14/14

Executado numa **única** chamada `execute_sql` — `set_config(..., false)` é escopado à sessão, e
statements espalhados zerariam o contador e reprovariam um run correto em `(z)`.

### Asserções negativas — o que NÃO aconteceu

| | antes | depois |
|---|---|---|
| candidatos | 22 | **22** ✓ |
| candidaturas | 9 | **9** ✓ |
| vagas | 9 | **9** ✓ |
| `cron.job` | 3 | **3** ✓ |
| `solicitacoes_dados` | — | **0** ✓ (nenhuma fixture sobreviveu) |
| `config_sla_dados` | — | **1** ✓ (só o seed, 7/12) |

Policies de `autorizacoes`/`candidatos`/`candidaturas`: **3 / 5 / 7**, inalteradas.

### ⚠ Passo 5 NÃO executado — limitação registrada, não contornada

`supabase db push --linked` **não rodou**: o CLI não está no PATH desta máquina. A substância do
passo foi verificada por SQL direto — o topo do ledger é
`20260804000002, 20260804000001, 20260803000001`, as duas linhas reparadas para os prefixos dos
arquivos, na ordem certa.

Não está escrito aqui que o comando respondeu "Remote database is up to date", porque ninguém o
rodou. Fica como **item de UAT humano**.

---

## Task 2 — M3: o retrato do catálogo vivo

**Coletado em 2026-08-04, pós-apply, antes de qualquer afirmação de RLS.** É este bloco que os
planos 44-05, 44-08 e 44-09 citam. Nenhum deles pode declarar uma afirmação de RLS satisfeita sem
apontar para aqui.

### `pg_policies` — exatamente 1 por tabela, ambas SELECT, ambas `{authenticated}`, `with_check` NULL

```
config_sla_dados_rh_read
  cmd=SELECT  roles={authenticated}
  qual=((SELECT (auth.jwt() #>> '{app_metadata,role}')) = ANY (ARRAY['rh','administrador']))

solicitacoes_dados_candidato_own_read
  cmd=SELECT  roles={authenticated}
  qual=(candidato_id IN (SELECT candidatos.id FROM candidatos
                          WHERE (candidatos.user_id = (SELECT auth.uid()))))
```

**Zero policy de INSERT/UPDATE/DELETE em `solicitacoes_dados`** — o candidato não tem caminho de
escrita, que é a propriedade que impede furar o cooldown ou inserir linha já `atendido` sem entrega.

### ⚠ Nota para 44-05/44-08/44-09: `IN` → `= ANY (ARRAY[…])` NÃO é drift

A migration escreveu `IN ('rh','administrador')` e o catálogo devolve
`= ANY (ARRAY['rh','administrador'])`. É a **normalização do próprio Postgres**. Um plano posterior
que compare o `qual` vivo contra o texto do arquivo vai ver uma diferença que não existe.

### `pg_class` — RLS de fato ligada

`relrowsecurity = **true**` nas duas · `relforcerowsecurity = false` nas duas. Uma tabela com policy
e sem RLS ligada é uma tabela aberta com documentação bonita.

### Privilégio das RPCs — a asserção negativa do defeito sistêmico da 42-06

`listar_pedidos_dados` e `contar_pedidos_dados_pendentes`, as duas:
`anon = **false**` · `authenticated = true` · `provolatile = 's'` (STABLE) · `prosecdef = true`.

O `pg_default_acl` de `public` concede EXECUTE a `anon` em todo `CREATE FUNCTION` como grant direto
e nomeado; ler o `REVOKE` do arquivo não responde a pergunta — só o catálogo responde.

### Comparação catálogo-contra-catálogo

O `qual` da policy own-row nova é **byte-idêntico** ao de `candidato_le_propria_candidatura`, já
auditada. O espelho do predicado está provado contra o objeto vivo, nunca contra string transcrita —
o idioma que a 37-02 estabeleceu porque transcrição introduz divergência de espaçamento que reprova
uma policy correta ou, pior, aprova uma errada.

---

## M2′ + regeração — a obrigação que o 44-03 deixou escrita

O gerador lê `catalogo-vivo-44.json`, e o catálogo não continha as tabelas novas. Regerar contra ele
produziria exatamente o silêncio que os três registros de `pendentes_por_desenho` existiam para
impedir. O orquestrador re-mediu (`95c4952`), gravando **condicionalmente** — o script só escreveu
depois de o delta bater.

**Delta conferido por mim, coluna a coluna, contra o catálogo anterior:**
`+config_sla_dados`, `+solicitacoes_dados`, `+7 colunas`, **zero sumidas nos dois eixos, zero
alteração de tipo/nulidade/ordem em coluna preexistente**.

### O fecho: 3 pendências, não 7

Quatro colunas se resolveram sozinhas — e as quatro foram **conferidas**, não aceitas por terem
fechado:

| Coluna | Fonte | Confere? |
|---|---|---|
| `id`, `solicitado_em`, `atendido_em` | R1 | ✓ apontam para o pedido do próprio titular |
| `candidato_id` | R2:do_titular | ✓ aponta para o titular |

Resolver-se sozinha não é o mesmo que estar certa: o 44-03 pagou por essa distinção com **quatro
achados que tinham veredito e o veredito estava errado**.

As três que sobraram sobraram pela **mesma razão** — são `text` no DDL, e por isso escaparam da R3:

- **`tipo`** → `true`. Critério (ii): é enum em tudo menos no tipo declarado (`CHECK` fecha em
  `acesso`/`exclusao`). E diz **qual direito a pessoa exerceu** — sonegá-lo omitiria da cópia o
  próprio exercício do direito que a produziu.
- **`situacao`** → `true`. Critério (ii). Sem ela o titular recebe datas sem saber se o que pediu
  foi entregue.
- **`causa`** → `true`. Critério (iii), "se o RH enxerga sobre a pessoa, entra, inclusive o
  desconfortável". É a resposta à única pergunta que um titular tem quando o pedido falha. **E é
  segura por construção, não por sorte:** vocabulário fechado por CHECK, e o COMMENT proíbe
  nominalmente guardar mensagem crua do transporte, código HTTP, stack ou caminho de Storage — a
  telemetria foi barrada no DDL uma fase antes desta decisão.

**Relaxar a R3 para aceitar `text` continua proibido**: seria a porta por onde texto livre não
classificado sairia calado. O preço é o bloco de vereditos, e é o preço certo.

### A união voltou a fechar

```
358 + 34 = 392   (29 tabelas, catálogo de 2026-08-03T19:38:03Z)
365 + 34 = 399   (30 tabelas, catálogo de 2026-08-04T01:34:27Z)
```

Toda coluna viva das tabelas em escopo tem **exatamente um** veredito. O conjunto de **excluídas não
se moveu** — segue 34, e por isso o snapshot `(j)` corretamente **não** falhou.

`config_sla_dados` foi absorvida pela regra FE1 (`config_*`) **sem intervenção nenhuma** — por isso
as colunas com veredito sobem 7 e não 12. É a regra funcionando como desenhada.

`meta.escopo_declarado_nao_vivo` agora é `[]`, e `pendentes_por_desenho` foi **removido** do YAML:
mantê-lo descrevendo uma tabela que já existe seria a documentação falsa que o arquivo existe para
não produzir. A asserção **(i)** segue estável, agora satisfeita pelo **outro lado** da disjunção.

### Os snapshots foram lidos, não carimbados

`vitest -u` moveu **8 linhas, todas adições, ZERO deleções**: 1 nome de tabela em `(a)` e as 7
chaves achatadas em `(b)`. Pequeno o bastante para ser uma leitura de verdade, e zero deleções é a
evidência mais forte de ausência de drift lateral.

---

## Desvios do plano

### 1. [Regra 1 — bug] O esperado de md5 reprovaria toda migration, para sempre

Descrito acima. Diagnosticado pelo orquestrador, reproduzido e confirmado por mim localmente.
Correção: o esperado é `md5` do conteúdo **sem o `\n` final**. Sem commit de código — o defeito
estava no critério do plano, e a correção vive neste SUMMARY.

### 2. [Regra 2] O `--sql-values` dizia "colável" e não era (`02a999d`)

**Duas asserções da mesma fase contradiziam uma à outra sobre os mesmos bytes:**

- `exportAllowlist.test.ts` **(k)** extrai os pares com `/^ {4}\(…\)/`, com o `{4}` literal.
- `genExportAllowlist.test.ts` **(i)** pinava a saída do gerador **sem** recuo.

Colar a saída direto no `VALUES` fazia a (k) ler **zero** pares e acusar *"o VALUES envelheceu"* —
mensagem que aponta para a causa errada e custa uma investigação inteira antes de alguém desconfiar
de espaço em branco. O `Colar SQL:` do docblock era falso: a saída exigia uma edição manual que
nenhum lugar documentava.

**Corrigido no gerador, não no regex do consumidor.** Afrouxar a (k) para `^\s*\(` faria a asserção
aceitar um bloco desalinhado e perderia a única checagem barata de que o paste caiu no lugar certo
do arquivo. A intenção já estava escrita no próprio teste (i) — *"o que torna a saída colável sem
edição manual"*; o regex é que discordava dela.

Também: `.trim()` → `.replace(/\n$/,'')` na (i). O `trim` comia a indentação da **primeira** linha e
a isentava do contrato — linha 1 passava com qualquer recuo.

### 3. [Regra 2] M2′ não estava na letra do plano

O plano manda regerar, mas a regeração não fecha sem um catálogo que contenha as tabelas novas.
Levantado antes do apply, aceito pelo orquestrador, executado por ele.

### 4. Meu erro no delta esperado do M2′, pego antes de rodar

Eu escrevi `colunas_public 1013 → 1024`. O certo é **1025** (5 + 7 = 12). Com 1024 no esperado, uma
medição **correta** apareceria como divergência de 1 — e o desfecho provável seria racionalizar em
vez de recontar. Corrigido antes da execução.

### 5. A emenda da regex no reprodutor do catálogo

Troquei `NOT LIKE 'config\_%'` por `!~ '^(config_|…)'`. O `\_` depende de
`standard_conforming_strings` e ainda atravessa uma camada de JSON até o `execute_sql`; se o
backslash for comido, `_` vira curinga e o filtro exclui tabelas **em silêncio**. Provei o par de
regex contra as 67 tabelas do catálogo commitado: particiona exatamente em 50/17, zero divergência.

---

## Task 3 — `database.types.ts` BLOQUEADO por auth gate

**Não regenerado. Não editado à mão** (proibido pelo CLAUDE.md C4). O arquivo está **intacto**, 188349
bytes, `git status` limpo.

Diagnóstico antes de escalar (lição da 37-05, onde o bloqueio reportado era inexistente):

| Verificação | Resultado |
|---|---|
| CLI existe? | **sim** — 2.111.0, no cache do npx |
| `SUPABASE_ACCESS_TOKEN` | **ausente** |
| credencial de `supabase login` (`~/.supabase`) | **ausente** (só `telemetry.json` e `traces`) |
| `supabase/.temp/` (estado de link) | **ausente** |
| `gen types --project-id` (não exige link) | **exit 1** |
| `gen types --linked` | **exit 1** |

Erro literal, provado por execução e não inferido:

```
LegacyPlatformAuthRequiredError
Access token not provided. Supply an access token by running `supabase login`
or setting the SUPABASE_ACCESS_TOKEN environment variable.
```

### ⚠ Achado: o `>` do `db:types` é pior do que a 37-05 documentou

A 37-05 registrou que o script usa `>` , que **trunca antes de executar**. Medido aqui: **o CLI
escreve o erro em STDOUT, não em stderr.** Portanto `npm run db:types` não apenas esvaziaria
`database.types.ts` — gravaria **dentro dele** os 217 bytes do blob JSON de erro, e sairia com
código 1.

Foi exatamente isso que provar o gerador contra um arquivo **temporário** evitou. Backup sozinho
protege contra perda; não protege contra o repositório quebrado no intervalo.

**Para desbloquear:** `supabase login` (interativo) ou `SUPABASE_ACCESS_TOKEN` no ambiente. Depois:
gerar para temporário → conferir que contém `solicitacoes_dados` → só então `npm run db:types` →
`git diff --numstat` exigindo **0 deleções**.

**Nota obrigatória para o 44-08, que vale mesmo com os tipos bloqueados:** o gerador declara toda
coluna de `RETURNS TABLE` como **não-nula**, porque a assinatura SQL não carrega nulidade. Quando
`database.types.ts` for regenerado, `listar_pedidos_dados` aparecerá com `candidato_nome: string`.
**Isso é falso** — o `LEFT JOIN` devolve NULL quando o nome não é resolvível. O 44-08 escreve
`FilaPedidoDadosRow` **à mão**, com nulidade honesta, como a P42 já fez. Não adote o tipo gerado.

Este bloqueio **não impediu** nada mais: a regeração da allowlist não depende do arquivo de tipos.

---

## Verificação

| Critério | Resultado |
|---|---|
| `to_regclass` das duas tabelas | deixou de ser NULL ✓ |
| md5 banco × arquivo (sem `\n` final) | **batem os dois** ✓ |
| COMMENTs preservados (`obj_description`) | ✓ `TETO LEGAL` + razão do CHECK ausente presentes |
| `schema_migrations` com os dois prefixos | ✓ `20260804000002, 20260804000001, 20260803000001` |
| Smoke, chamada única | **14/14 PASS** ✓ |
| candidatos / candidaturas / vagas / crons | **idênticos** antes e depois ✓ |
| `solicitacoes_dados` = 0 · `config_sla_dados` = 1 | ✓ |
| M3 — 1 policy SELECT por tabela, RLS ligada, `anon` false | ✓ |
| `gen-export-allowlist.cjs` | exit 0 · `--check` exit 0 ✓ |
| União `365 + 34 = 399` = colunas com veredito | ✓ |
| `exportAllowlist.test.ts` | **11/11** ✓ |
| Prova de mordida da (k) | 1 espaço removido ⇒ **364 ≠ 365**, falha nomeando o bloco ✓ |
| `npm run test:run` | **157 arquivos / 1442 testes verdes** ✓ |
| `npm run lint` (`tsc --noEmit`) | **97** — baseline congelada, zero regressão ✓ |
| `.husky/pre-commit` | rodou e passou nos 2 commits do executor. **Zero `--no-verify`** ✓ |
| `supabase db push --linked` | ⚠ **NÃO executado** — CLI ausente do PATH |
| `database.types.ts` | ⚠ **BLOQUEADO** — auth gate; arquivo intacto e não editado |

---

## Requirements — nada marcado Complete

| Req | Marcado | Por quê |
|---|---|---|
| **EXPORT-05** | ❌ **não marcado** | *"prazo Art. 19 II (15 dias) visível ao RH"*. As tabelas e as duas RPCs estão **vivas**, e isso é real — mas **nada renderiza**. O requirement fala de algo **visível ao RH**, e a fila nasce em 44-08/44-09. O 44-02 já havia dito exatamente isto sobre este requirement. |

O 44-01 teve de **reverter** uma marcação falsa nesta fase, o 44-02 e o 44-03 **recusaram-se** a
fazer uma. Marcar EXPORT-05 agora — com objeto vivo e zero superfície — seria a quarta tentativa da
mesma mentira, e a mais tentadora, porque desta vez existe alguma coisa em produção para apontar.

---

## Known Stubs

Nenhum stub de código. Zero `TODO`/`FIXME`/placeholder, zero `t.skip`/`test.todo`.

**Aberto por bloqueio, nomeado:**

1. `database.types.ts` **não regenerado** — auth gate do Supabase CLI (acima).
2. `supabase db push --linked` **não executado** — CLI ausente do PATH; substância verificada por
   SQL direto.

Nenhum dos dois bloqueia 44-05..44-09 pelo caminho da allowlist. O item 1 bloqueia qualquer plano
que precise dos tipos gerados das duas tabelas novas — e o 44-08, que é o consumidor natural, **já
escreve o tipo da linha à mão de propósito**.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano. As seis mitigações declaradas foram
medidas contra o **catálogo vivo**, não contra arquivo:

| Threat | Mitigação | Prova |
|---|---|---|
| T-44-16 | privilégio residual de `anon` nas RPCs | `has_function_privilege` = **false** nas duas |
| T-44-21 | afirmação de RLS baseada no arquivo | M3 colado bruto acima, com timestamp, citável nominalmente |
| T-44-22 | migration truncada no transporte | md5 batendo + `obj_description` lido |
| T-44-17 | policy de escrita inesperada | `pg_policies`: **zero** INSERT/UPDATE/DELETE |
| T-44-10 | `config_sla_dados` legível por `public` | `roles = {authenticated}`, nunca `{public}` |
| T-44-23 | `database.types.ts` editado à mão | **não foi tocado** — bloqueio registrado em vez de contornado |

## Commits

| Hash | O quê |
|---|---|
| `95c4952` | M2′ — catálogo vivo re-medido pós-apply (orquestrador), delta exato |
| `02a999d` | `--sql-values` dizia "colável" e não era — 4 espaços entram no gerador |
| `169c3c5` | `solicitacoes_dados` entra na cópia — allowlist regerada, união fecha em 399 |

## Self-Check: PASSED

- Arquivos modificados: **7/7 FOUND**
- Commits: `95c4952`, `02a999d`, `169c3c5` — **3/3 FOUND** no histórico
- `gen-export-allowlist.cjs` exit 0 · `--check` exit 0 · 11/11 · 1442 testes verdes · tsc 97
- `database.types.ts` intacto (188349 bytes, não modificado, não staged)
- Zero `--no-verify`; árvore limpa após o commit final
