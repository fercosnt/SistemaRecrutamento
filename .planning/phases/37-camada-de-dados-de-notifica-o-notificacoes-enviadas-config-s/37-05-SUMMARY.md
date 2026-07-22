---
phase: 37-camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s
plan: 05
subsystem: database
tags: [supabase, typescript, codegen, schema-drift, migrations, todo-archival, tech-debt]

# Dependency graph
requires:
  - phase: 37-04
    provides: "Schema aplicado e ledger reconciliado em PROD (18 colunas em notificacoes_enviadas, 6 constraints, 2 triggers, 4 versions batendo com os arquivos) — o estado que o gerador de tipos leu"
  - phase: 37-02
    provides: "Os 2 arquivos de migration reconstruídos + o gate de fidelidade, citados no bloco de resolução do item de drift"
  - phase: 37-03
    provides: "A migration aditiva 20260722000002 (destinatario_original, modo, ck_notif_modo, tocar_atualizado_em, 2 triggers) + o smoke comportamental"
provides:
  - "database.types.ts com Row/Insert/Update de notificacoes_enviadas (18 colunas, incl. destinatario_original e modo) e config_sla_etapa (5 colunas)"
  - "Enum status_notificacao tipado com os 6 labels, em Database['public']['Enums'] e em Constants"
  - "6 Relationships de FK de notificacoes_enviadas → candidatos/candidaturas e as views que as expõem"
  - "Tipo gerado de ler_resend_api_key() (débito herdado da P36, fechado de carona)"
  - ".planning/todos/done/37-drift-prod-tabelas-notificacao.md — item de drift arquivado com resolução em 4 blocos e histórico git preservado"
affects: [38, 40, 41]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regeneração de tipos com backup prévio obrigatório: o script usa redirecionamento `>`, que trunca o arquivo ANTES do comando rodar"
    - "Probe do gerador para um arquivo temporário antes de apontá-lo ao arquivo git-trackeado — separa 'CLI quebrada' de 'schema mudou' sem arriscar o repo"
    - "Classificação obrigatória hunk-a-hunk do diff de tipos gerados (esperado vs. inesperado), com surpresa virando todo em vez de ser absorvida"
    - "Arquivamento de todo em DOIS commits: rename puro (100% similaridade) primeiro, conteúdo depois — preserva `git log --follow`"
    - "Resolução de débito em 4 blocos: Resolvido / Corrigido em relação ao retrato original / Deliberadamente NÃO feito / Continua em aberto"

key-files:
  created:
    - .planning/todos/done/37-drift-prod-tabelas-notificacao.md
  modified:
    - database.types.ts

key-decisions:
  - "A regeneração NÃO foi escalada como checkpoint: o `--linked` falhou apenas por falta do estado local de link (supabase/.temp/project-ref, diretório gitignored), não por falta de auth. `supabase link --project-ref` resolveu sem prompt e sem qualquer contato de escrita com PROD — escalar teria sido reportar um bloqueio inexistente"
  - "Antes de rodar `npm run db:types` contra o arquivo git-trackeado, o gerador foi probado com saída para um arquivo temporário: o script usa `>`, que trunca ANTES de executar, então 'testar' direto no arquivo real seria destruí-lo para descobrir se o comando funciona"
  - "O hunk de `ler_resend_api_key` é herança deliberada da P36/36-04 (que decidiu NÃO regenerar os tipos), não drift novo — classificado como esperado e não gerou item em pending/"
  - "O arquivamento do todo foi partido em 2 commits porque somar as 78 linhas de resolução ao rename derruba a similaridade para ~45%, abaixo do limiar default de 50% do git — `git log --follow` quebraria em silêncio"
  - "O corpo original do item de drift foi preservado byte-a-byte, com as imprecisões da paráfrase intactas; a correção vive num bloco novo, com a CONSEQUÊNCIA de cada erro nomeada"

patterns-established:
  - "Verificação byte-a-byte da preservação do corpo original num arquivamento: `git show HEAD:<old-path>` vs `sed -n` da faixa correspondente no arquivo novo, exigindo `diff` vazio"
  - "Prova independente de reconciliação de drift: `supabase migration list --linked` (colunas Local/Remote) confirmando pela CLI o que o MCP havia afirmado"

requirements-completed: [LEDGER-01, TIMELINE-01]

# Metrics
duration: 9min
completed: 2026-07-22
---

# Phase 37 Plano 05: Propagação dos Tipos e Arquivamento do Drift Summary

**Os tipos do projeto passaram a conhecer a camada de dados de notificação num diff 100% aditivo (146 inserções, 0 deleções, zero surpresa), e o item de drift saiu de `pending/` com um registro que separa o que foi resolvido do que continua sem resposta — a origem do apply original.**

## Performance

- **Duração:** 9 min
- **Iniciado:** 2026-07-22T17:57:00Z
- **Concluído:** 2026-07-22T18:06:00Z
- **Tasks:** 2/2
- **Arquivos modificados:** 2 (1 criado por move, 1 regenerado)
- **Commits:** 3 (`7ecf891`, `61527d9`, `f35c3e6`)

## Task 1 — `database.types.ts` regenerado (commit `7ecf891`)

### O bloqueio que quase virou checkpoint (e por que não virou)

`npm run db:types` falhou de saída:

```
Cannot find project ref. Have you run supabase link?
```

O plano prevê exatamente isso e manda escalar em vez de hand-editar o arquivo gerado. Mas o erro literal aponta para **estado local de link ausente** (`supabase/.temp/project-ref` — diretório gitignored, `.gitignore:88`), não para credencial ausente. A distinção foi feita empiricamente, com o gerador apontado a um arquivo temporário:

| Probe | Resultado |
|---|---|
| `gen types --linked` → arquivo temp | ❌ `Cannot find project ref` |
| `gen types --project-id isljnozzlvckrgjjbjwp` → arquivo temp | ✅ exit 0, 5.585 linhas, com as duas tabelas |
| `supabase link --project-ref isljnozzlvckrgjjbjwp < /dev/null` | ✅ exit 0, sem prompt |

O segundo probe é a prova decisiva: a CLI **estava autenticada** — o caminho via Management API funcionou de primeira. Escalar teria reportado um bloqueio que não existia e custado um ciclo de orquestrador. Com o link restaurado, `npm run db:types` (o comando documentado, sem variação) rodou limpo.

**Nada foi aplicado, escrito ou alterado em PROD.** `link` e `gen types` são leitura de catálogo.

### O diff, hunk a hunk

```
 database.types.ts | 146 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 146 insertions(+)
```

`git diff --numstat` = **146 / 0**. Zero deleções: nenhuma tabela, coluna, função ou enum pré-existente mudou de forma. Seis hunks, **todos classificados como esperados**:

| # | Hunk | Classificação | Por quê |
|---|---|---|---|
| 1 | Tabela `config_sla_etapa` — Row/Insert/Update, 5 colunas, `etapa` tipada como `Database["public"]["Enums"]["etapa_processo"]` | ✅ esperado | Deliverable TIMELINE-01 desta fase; é o que a P40 lê |
| 2 | Tabela `notificacoes_enviadas` — 18 colunas, incl. **`destinatario_original: string`** (obrigatório no `Insert` — sem default no banco) e **`modo?: string`** (opcional no `Insert` — tem default `'teste'`) | ✅ esperado | Deliverable LEDGER-01 + as colunas da aditiva da 37-03 |
| 3 | 6 `Relationships` de FK de `notificacoes_enviadas` | ✅ esperado | As 2 FKs reais (`candidato_id`, `candidatura_id`) expandidas pelo gerador para cada relação que as expõe: `candidatos`, `v_candidatos_ativos`, `v_triagem_panel`, `candidaturas`, `v_fila_trabalho` |
| 4 | `ler_resend_api_key: { Args: never; Returns: string }` | ✅ esperado (**herdado da P36**) | O 36-04 decidiu deliberadamente **não** regenerar os tipos ("nenhum client chama a RPC"), decisão registrada no STATE. É débito conhecido fechando de carona, **não** drift novo |
| 5 | Enum `status_notificacao` com os 6 labels em `Enums` | ✅ esperado | `pendente, enviado, entregue, falhou, bounce, reclamado` |
| 6 | `status_notificacao` no objeto `Constants` | ✅ esperado | Espelho runtime do enum, padrão do gerador |

**ZERO hunks inesperados** ⇒ nenhum novo item criado em `.planning/todos/pending/`. A mitigação de **T-37-05-05** (segundo drift PROD→repo absorvido em silêncio) foi exercitada e saiu limpa: as 0 deleções são a evidência mais forte disso — um drift em outra tabela apareceria como remoção ou mudança de forma, não como adição pura.

O tipo de `destinatario_original` merece nota: ele aparece como **obrigatório** no `Insert`, enquanto `modo` aparece opcional. Isso é o fail-safe da 37-03 chegando até o compilador — a EF da P38 **não compila** se esquecer de gravar o destinatário original.

### Gates

| Gate | Resultado |
|---|---|
| `test -s database.types.ts` + os 8 greps do plano | ✅ `notificacoes_enviadas` (7×), `config_sla_etapa`, `destinatario_original` (3×), `modo` (3×), `dedupe_key` (3×), `proxima_tentativa_em` (3×), `status_notificacao` (5×), `rotulo_candidato` (3×) |
| `npm run lint` | ✅ **97 → 97** erros `tsc` (baseline PRÉ-EXISTENTE; teto CI 104). **0** citam `database.types.ts` ou arquivos desta fase |
| `npm run build` | ✅ verde — `assert-chunks` PERF-03 PASSED, eager index 902,94 kB < baseline 2.722,92 kB, 41 chunks |
| `npm run test:run` | ✅ **126 arquivos / 1018 testes**, todos verdes |
| `supabase migration list --linked` | ✅ **Local e Remote alinhados** nas 4 versions (`20260721000001/2`, `20260722000001/2`) — zero pendência |

A contagem de lint merecia atenção especial: `database.types.ts` **é** coberto pelo `tsconfig`, então uma mudança legítima era possível. Ficou em 97 — nenhum consumidor existente foi quebrado pelos tipos novos, e nenhum erro pré-existente foi mascarado.

O `migration list --linked` é um bônus não pedido pelo plano: ele confirma **pela CLI, independentemente do MCP**, o que o 37-04 afirmou. O drift está reconciliado nos dois caminhos de ferramenta.

## Task 2 — Item de drift arquivado (commits `61527d9` + `f35c3e6`)

### Por que dois commits

O plano pede um commit. Foram dois, deliberadamente — e a razão é um critério de aceitação do próprio plano: *"`git log --follow` mostra o commit de criação original"*.

Medido antes de commitar: com o rename **e** as 78 linhas de resolução no mesmo commit, a similaridade cai para **~45%**, abaixo do limiar default de **50%** da detecção de rename do git. Verificado por bissecção:

| `--find-renames` | rename detectado? |
|---|---|
| `-M50%` (default) | ❌ **não** |
| `-M45%` | ✅ sim |
| `-M40%` / `-M30%` | ✅ sim |

O `git log --follow` usa o limiar default. Num único commit, a cadeia de histórico quebraria **em silêncio** — o arquivo pareceria ter nascido no arquivamento, e o registro forense de *quando o drift foi descoberto* se perderia exatamente no documento cujo propósito é preservá-lo.

Solução: `61527d9` é um **rename puro** (`rename … (100%)`, 0 inserções, 0 deleções) e `f35c3e6` é **adição pura** (78 inserções, 0 deleções). Confirmado após o commit:

```
61527d9 docs(37-05): arquivar o item de drift — git mv pending/ -> done/ (rename puro)
f16cb6d docs(37): retrato completo do schema vivo das tabelas de notificacao
2b19935 docs(36): verification passed (26/26) + registrar drift PROD para a P37
```

`2b19935` é o commit de criação original. A cadeia está intacta.

### Preservação do corpo original — verificada, não assumida

O critério "corpo preservado byte-a-byte" foi checado por execução, não por leitura:

```
git show HEAD:.planning/todos/pending/37-drift-prod-tabelas-notificacao.md  →  117 linhas
sed -n '17,133p' .planning/todos/done/37-drift-prod-tabelas-notificacao.md  →  117 linhas
diff  →  vazio
```

`git diff --numstat` do segundo commit: **78 / 0**. Nenhuma linha do documento original foi tocada — inclusive as erradas.

### A seção de resolução

Frontmatter novo no topo (`status: done`, `resolved_at: 2026-07-22`, `resolves_phase: 37`) + um aviso curto de que o corpo abaixo é histórico e contém imprecisões conhecidas, remetendo à seção de resolução. Depois, `## Resolução (Phase 37, 2026-07-22)` com os quatro blocos:

**Resolvido.** Tabela dos 4 arquivos de migration × version do ledger × origem × "aplicado nesta fase?", deixando explícito que os dois reconstruídos **não** foram re-aplicados. As 3 lacunas nomeadas com os objetos reais: `destinatario_original` (NOT NULL sem default, e o porquê), `modo` (default `'teste'` fail-safe), `ck_notif_modo`, `public.tocar_atualizado_em()` (sem `SECURITY DEFINER`, com o racional), `trg_notificacoes_atualizado_em`, `trg_config_sla_atualizado_em`, e **`idx_notif_retry` como não-criado** — a lacuna 3 era um erro do retrato original, não uma lacuna. Os dois arquivos de smoke citados por caminho, com os PASS que importam: 12/12 de fidelidade **antes** do DDL, `23505` do `uq_notif_dedupe`, `check_violation` do `ck_notif_modo`, candidato-DENY por impersonação real, e o par RH não-dono (0 linhas) / RH dono (≥1) — sem o segundo, o primeiro passaria vacuamente.

**Corrigido em relação ao retrato original.** Cinco divergências paráfrase vs. catálogo, cada uma com a **consequência** do erro, não só o erro. A principal: o literal de role é `administrador`, não `admin` — uma policy ou smoke escrito a partir do documento original usaria um literal que nunca casa. Este bloco é o que impede que uma leitura futura reintroduza os erros da paráfrase.

**Deliberadamente NÃO feito.** O candidato-DENY continua **implícito**, com o racional travado: policy PERMISSIVE mal escrita **abre** acesso; ausência de policy **nunca** abre — reavaliar só se surgir policy de `INSERT`/`UPDATE`. `config_sla_etapa` não re-seedada (8/8 coerente; o seed do arquivo usa `ON CONFLICT DO NOTHING`, jamais upsert). Nenhum arquivo já presente no ledger editado. Nenhum `CREATE TABLE IF NOT EXISTS`.

**Continua em aberto.** Em primeiro lugar e em destaque: **a ORIGEM do apply original permanece desconhecida**. O drift foi reconciliado; a causa não. Um caminho de apply fora do repositório continua existindo, e a mesma falha pode se repetir — se o padrão reaparecer, tratar como sinal de processo, não incidente isolado. Depois: retenção/purga → LGPD-OPS (M8+); `reclamado_em` → P41; divergência `updated_at` vs `atualizado_em` no resto do schema, confirmada como débito real durante esta fase (foi o motivo de criar `tocar_atualizado_em()`) e não endereçada; chave PROD do Resend ainda não provisionada no Vault (UAT-36-2).

Isso é a mitigação de **T-37-05-04**: arquivar como plenamente resolvido apagaria a pergunta que mais importa.

## Deviations from Plan

### 1. [Rule 3 — Bloqueio] `--linked` sem estado de link: resolvido em vez de escalado

- **Encontrado em:** Task 1
- **Erro literal:** `Cannot find project ref. Have you run supabase link?`
- **Análise:** o plano manda escalar em caso de falha, mas a falha era de **estado local** (`supabase/.temp/project-ref` ausente — diretório gitignored, portanto nunca versionado e perdido em qualquer checkout limpo), não de credencial. Provado por `gen types --project-id isljnozzlvckrgjjbjwp`, que rodou com exit 0 contra o mesmo projeto: a CLI estava autenticada.
- **Correção:** `supabase link --project-ref isljnozzlvckrgjjbjwp < /dev/null` (exit 0, sem prompt, sem senha), seguido do `npm run db:types` documentado, sem variação de comando. Nenhum contato de escrita com PROD; nenhuma edição manual do arquivo gerado.
- **Por que isso não é burlar o gate:** o gate existe para impedir hand-edit de tipos gerados quando o gerador não está disponível. O gerador **estava** disponível. Escalar teria reportado um bloqueio inexistente.
- **Commit:** `7ecf891`

### 2. [Rule 2 — Correção crítica] Probe do gerador para arquivo temporário antes de tocar o arquivo real

- **Encontrado em:** Task 1, antes de qualquer execução
- **Problema:** o plano manda backup + `npm run db:types`. O backup protege contra perda, mas ainda deixa o repositório num estado quebrado entre a falha e a restauração — e o script usa `>`, que **trunca antes de o comando rodar**. "Rodar para ver se funciona" é literalmente destruir o arquivo para descobrir.
- **Correção:** backup feito (mitigação T-37-05-01 cumprida) **e** o gerador probado com saída redirecionada para o scratchpad. `database.types.ts` só foi tocado depois de o probe provar exit 0 com as duas tabelas presentes. Confirmado no meio do caminho: `git diff --stat database.types.ts` vazio após as duas falhas de probe — o arquivo nunca ficou truncado, nem por um instante.
- **Commit:** `7ecf891`

### 3. [Rule 1 — Bug latente] Arquivamento em 1 commit quebraria `git log --follow` em silêncio

- **Encontrado em:** Task 2, verificação pré-commit do critério de aceitação
- **Problema:** rename + 78 linhas de resolução no mesmo commit → similaridade ~45%, abaixo do limiar default de 50%. `git log --follow` retornaria só o commit de arquivamento, apagando a cadeia até `2b19935` (o commit que registrou a descoberta do drift). Falha silenciosa: nada erra, o histórico apenas some.
- **Correção:** dois commits — rename puro 100% (`61527d9`), conteúdo depois (`f35c3e6`). Verificado após o commit: `git log --follow` mostra `61527d9 → f16cb6d → 2b19935`.
- **Commits:** `61527d9`, `f35c3e6`

## Verificação do plano

- ✅ `database.types.ts` não-vazio (5.613 linhas) com as 2 tabelas, as colunas novas e o enum `status_notificacao` com os 6 labels
- ✅ Diff 146/0, 6 hunks, **todos classificados como esperados**; nenhum item novo em `pending/`
- ✅ `database.types.ts` NÃO editado manualmente — o diff é integralmente saída do gerador
- ✅ `npm run lint` = **97** (baseline; teto CI 104), **0** citando arquivos desta fase
- ✅ `npm run build` verde · `npm run test:run` verde (126 arquivos / 1018 testes)
- ✅ Item de drift em `done/`, ausente de `pending/`, com os 4 blocos, frontmatter completo e histórico preservado por rename 100%
- ✅ Commits com `--no-verify` e os números `97 → 97` no corpo dos três
- ✅ Zero dependências npm novas

## Success Criteria

1. **A P40 lê `config_sla_etapa` e a P38 grava `destinatario_original`/`modo` com tipos gerados** — ✅ nenhuma das duas começa com `any`. Mais: `destinatario_original` é **obrigatório** no `Insert` tipado, então a EF da P38 não compila se esquecer dele.
2. **Item de drift arquivado de forma honesta** — ✅ os 4 blocos separam resolvido, corrigido, deliberadamente omitido e ainda em aberto; a origem desconhecida está nomeada em primeiro lugar no último bloco.
3. **Drift adicional registrado em vez de absorvido** — ✅ não houve nenhum (0 deleções no diff). O único hunk fora do escopo direto (`ler_resend_api_key`) é débito conhecido e documentado da P36, não surpresa.

## Known Stubs

Nenhum. `database.types.ts` é gerado integralmente e o item arquivado é auto-suficiente.

## Threat Flags

Nenhuma. Este plano não cria endpoint, caminho de auth, acesso a arquivo ou fronteira de confiança nova. `database.types.ts` expõe a forma das tabelas (nomes e tipos de coluna), nunca dados nem credenciais — disposição `accept` de **T-37-05-03**, padrão do repo desde o M1.

## Sinais para as fases seguintes

- **P38:** o tipo `Insert` de `notificacoes_enviadas` exige `destinatario_original` e torna `modo` opcional (default `'teste'`). Gravar `destinatario_original` a partir do par retornado por `resolverDestinatario()` de `_shared/email-config.ts`. O `dedupe_key` e o protocolo de reivindicação (`ON CONFLICT (dedupe_key) DO NOTHING RETURNING id` **antes** do envio) estão nos COMMENTs de coluna do próprio banco — não reinventar.
- **P40:** `config_sla_etapa` está tipada com `etapa: Database["public"]["Enums"]["etapa_processo"]` e `prazo_valor`/`prazo_unidade` nuláveis como par tudo-ou-nada (`ck_sla_prazo_consistente`). A linha `aprovado` tem prazo `NULL` — a UI precisa desse caso.
- **P41:** os 6 labels de `status_notificacao` estão em `Constants.public.Enums.status_notificacao` para uso runtime, além do tipo. `reclamado_em` continua deferido — a decisão é sua.
- **Operacional:** `supabase/.temp/` é gitignored, então `supabase link --project-ref isljnozzlvckrgjjbjwp` é o primeiro passo de qualquer sessão que vá rodar `npm run db:types` ou `supabase migration list --linked` num checkout limpo.

## Self-Check: PASSED

Arquivos: `database.types.ts` ✅ (5.613 linhas) · `.planning/todos/done/37-drift-prod-tabelas-notificacao.md` ✅ · `.planning/todos/pending/37-drift-prod-tabelas-notificacao.md` ✅ ausente
Commits: `7ecf891` ✅ · `61527d9` ✅ · `f35c3e6` ✅
