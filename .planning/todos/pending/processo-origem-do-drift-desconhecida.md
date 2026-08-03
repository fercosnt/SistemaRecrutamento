---
id: processo-origem-do-drift-desconhecida
created: 2026-07-22
source: Phase 37 close (recomendação do verifier)
priority: medium
resolves_phase: 42
tags: [processo, drift, migrations, ledger, m8-invent]
---

# Processo — a origem do drift PROD→repo continua desconhecida

**Aberto:** 2026-07-22, no fechamento da Phase 37 (recomendação do verifier).
**Tipo:** processo, não incidente. Não bloqueia nenhuma fase.

> **Atualização 2026-07-29 (kickoff do M8) — UMA causa concreta foi identificada, e a fase 42 ataca o resto.**
>
> Este todo dizia que existe "um caminho de apply a PROD que não passa pelo repositório" sem que ninguém saiba qual. A auditoria do banco vivo feita no kickoff do M8 achou **um mecanismo real**, diferente do que se supunha: **`ADD COLUMN IF NOT EXISTS` sobre uma coluna pré-existente vira no-op e silencia a cláusula FK junto**. Foi assim que `candidatos.user_id` ficou `ON DELETE CASCADE` em PROD enquanto o repo (`20260421000001_rate_limit_duplicate_check.sql:193`) diz `ON DELETE SET NULL` — o arquivo descreve uma semântica que o banco nunca teve, e nenhum apply fora do repositório precisou acontecer para isso.
>
> Isso **não fecha** o item: não explica quem aplicou as duas migrations originais da P37, que continua sendo um apply de fora do repo. Mas mostra que "drift" não é um fenômeno único — há pelo menos duas origens distintas, e uma delas é um idioma que o próprio repositório usa.
>
> **Linkado à Phase 42** (`resolves_phase: 42`), que entrega: **INVENT-04** — varredura do idioma `ADD COLUMN IF NOT EXISTS` em todas as migrations, listando cada cláusula silenciada — e **INVENT-03** — diff dos `cron.job` vivos contra o repositório, com cada job vivo rastreável a uma migration. Detalhe da auditoria em `.planning/research/FK-AUDIT-LIVE.md`, que tem **precedência** sobre arquivos de migration em qualquer questão de `ON DELETE`.

> **Atualização 2026-07-30 (Phase 42, checkpoint da 42-07) — SEGUNDA causa concreta, e esta explica o drift de CORPO de função.**
>
> A causa achada no kickoff (`ADD COLUMN IF NOT EXISTS`) explica drift de **DDL de coluna**. Esta explica drift de **texto de objeto**, e foi medida duas vezes no mesmo dia:
>
> **O mecanismo:** `apply_migration` do MCP do Supabase recebe o SQL como **string na chamada da ferramenta**, não como arquivo. O agente que aplica precisa **retransmitir** o conteúdo. Se ele resumir, reindentar ou omitir comentários — o que é tentador em corpos longos, para caber na chamada — **PROD passa a divergir do arquivo sem erro, sem warning e sem linha no ledger**. O ledger registra "a migration X foi aplicada"; ele não registra *o que* foi aplicado.
>
> **Duas medições:**
>
> | Objeto | Divergência | Natureza |
> |--------|-------------|----------|
> | `varrer_retry_notificacoes` (P41, `20260727000001`) | arquivo 1942 chars · vivo 1677 | **bloco de comentário de 4 linhas** ausente em PROD (`-- Seleção coberta por idx_notif_retry …`). Restante byte-idêntico. O arquivo tem **um único commit** e o comentário estava nele desde o início → não foi o arquivo que mudou depois, **foi o apply que o perdeu** |
> | `responder_revisao_decisao` (P42, `20260730000002`) | arquivo 2699 chars · vivo 1798 | mesma classe, mesma sessão que escreveu este parágrafo. Comparação normalizada (linhas não-vazias, não-comentário): **md5 idêntico `5cccfd0a…`, 1644 chars nos dois** → divergência **exclusivamente de comentário**, zero comportamental |
>
> Ambas benignas. **Mas o mecanismo não distingue comentário de código.** A mesma abreviação que descarta um comentário pode descartar um `REVOKE`, um predicado de `WHERE` ou uma cláusula `USING` — e o resultado seria um objeto vivo que faz menos do que o repositório afirma, com o ledger dizendo que está tudo aplicado. É a forma exata do defeito que a 42-06 encontrou por outro caminho (`REVOKE … FROM PUBLIC` sem `FROM anon`).
>
> **Isto NÃO fecha o item** — segue sem explicar quem aplicou as duas migrations originais da P37. Mas reduz o "desconhecido" a um caminho concreto e testável, e sugere o gate: **asserção de fidelidade pós-apply**, comparando `md5(prosrc)` vivo contra o corpo extraído do arquivo, para cada função que a migration cria ou substitui. Duas de três funções da `20260730000002` passariam essa asserção hoje; a terceira não.

> **Atualização 2026-07-30 (Phase 42, apply do checkpoint da 42-07) — TERCEIRA causa, e o ledger afinal registra O QUE foi aplicado.**
>
> Duas descobertas ao aplicar `20260730000003` por `apply_migration`, ambas medidas, não inferidas.
>
> **(1) `apply_migration` CARIMBA A PRÓPRIA VERSÃO — o nome do arquivo nunca chega ao ledger.**
> Passei `name: "20260730000003_p42_trg_revisao_solicitada"`. O ledger gravou
> `version = '20260730102244'` (timestamp do instante do apply) e só o `name` preservou o
> prefixo. **Consequência:** `supabase db push` leria `20260730000003_….sql` como
> **não aplicada** e tentaria reaplicá-la; e `ls supabase/migrations/` versus
> `schema_migrations` — a checagem de drift "barata" sugerida no fim deste arquivo —
> acusaria falso positivo para toda migration aplicada por MCP. Corrigido à mão nesta
> sessão (`UPDATE … SET version='20260730000003'`), que é o que
> `supabase migration repair` teria feito. **Todo apply por MCP precisa desse reparo, e
> ele não é opcional.**
>
> **(2) O ledger REGISTRA o SQL aplicado — a afirmação contrária na atualização acima está errada.**
> `supabase_migrations.schema_migrations` tem uma coluna `statements text[]`, e para
> migrations aplicadas por MCP ela contém o SQL literal recebido. Isso torna o drift
> **exatamente mensurável no ato**, sem depender de `pg_get_functiondef` nem de
> normalização:
>
> ```sql
> SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations WHERE version = '<v>';
> -- comparar com:  printf '%s' "$(cat supabase/migrations/<v>_*.sql)" | md5
> ```
>
> **Medição das três migrations do M8 aplicadas até agora:**
>
> | Migration | md5 aplicado vs arquivo | chars aplicados / arquivo | Veredito |
> |-----------|-------------------------|---------------------------|----------|
> | `20260730000001` (42-06) | ✗ divergente | 12 816 / 27 440 | comentários descartados |
> | `20260730000002` (42-06) | ✗ divergente | 7 972 / 15 075 | comentários descartados |
> | `20260730000003` (42-07) | ✓ **idêntico** `2cfce511…` | 21 860 / 21 861 (só o `\n` final) | **retransmissão fiel** |
>
> As duas divergentes batem com "arquivo menos as linhas de comentário" (14 635 e 8 849
> chars pelo mesmo stripper) dentro da margem do stripper — ou seja, **a perda é de
> comentário, o SQL executável está inteiro**, confirmado independentemente pelas
> asserções de objeto vivo desta sessão. Cada arquivo tem **um único commit**, então não
> foi o arquivo que cresceu depois.
>
> **O gate agora é trivial e mais forte que o proposto acima** (`md5(prosrc)` por função,
> que só cobre funções): comparar `md5(statements[1])` contra o md5 do arquivo logo após
> cada apply. Custo: uma query. Prova: fidelidade byte-a-byte da migration inteira —
> `REVOKE`s, predicados de `WHERE`, cláusulas `USING` e tudo mais, não só corpos `$$`.

> **Atualização 2026-08-01 (Phase 43, plano 43-01) — QUARTA INSTÂNCIA: as 3 policies de `public.autorizacoes`.**
>
> Não é uma causa nova; é uma **ocorrência nova da classe original** — DDL que vive em PROD e em nenhum arquivo de migration. Medida em `pg_policies` em 2026-08-01, ao levantar o terreno da Phase 43:
>
> | policy | cmd | escopo |
> |---|---|---|
> | `Candidatos podem ler suas autorizacoes` | SELECT | own-row via `candidatos.user_id = auth.uid()` |
> | `RH pode ler todas as autorizacoes` | SELECT | RH ativo |
> | `Candidatos podem atualizar suas autorizacoes` | **UPDATE** | own-row, com `qual` **e** `with_check` |
>
> `docs/RLS_POLICIES.md:158-162` afirmava a policy de UPDATE sem que o DDL estivesse em `supabase/migrations/` — a documentação estava certa e o repositório, incompleto. `grep -rl "autorizacoes" supabase/migrations/` devolve **um único arquivo** (`20260421000001`), que cria a tabela e não cria policy nenhuma.
>
> **O que isso custa:** um `supabase db reset` derrubaria as três em silêncio. A de UPDATE é a base do CONSENT-04 (revogação own-row do marketing, plano 43-05) — sem ela, a revogação simplesmente não escreve; com ela reconstruída **sem** o `with_check`, o candidato passaria a poder reapontar a própria linha de autorizações para outro `candidato_id`.
>
> **REGISTRO, NÃO CORREÇÃO.** A Phase 43 deliberadamente **não** reaplica esse DDL. A lição do 42-07 é que *o arquivo não é o objeto vivo*: reconstruir uma policy de memória substitui um `pg_get_expr` real por um palpite, e o palpite mais provável aqui — `USING` sem `WITH CHECK` — é justamente o que abre a escrita. Reconciliar exige medir `pg_get_expr(polqual)` e `pg_get_expr(polwithcheck)` vivos primeiro, transcrevê-los, e só então escrever o arquivo. É trabalho com medição própria, não brinde de uma migration aditiva.
>
> A migration `20260801000001_p43_consent_prova_e_marketing.sql` declara escopo negativo explícito sobre policies, e a asserção **(e)** de `supabase/tests/p43_consent_prova_smoke.sql` é NEGATIVA: exige exatamente 3 policies, RLS ligada, e exatamente 1 policy de UPDATE com `qual` E `with_check` não vazios. Ela verifica a declaração em vez de acreditar nela.
>
> **Sugestão de fechamento (ainda não urgente):** uma varredura única comparando `pg_policies` vivo contra `grep -c "CREATE POLICY" supabase/migrations/*.sql`, tabela a tabela. Se `autorizacoes` é a 4ª, a pergunta que importa deixou de ser "quantas mais?" e passou a ser "quais outras?" — e essa é respondível numa query.

## O fato

A Phase 37 **reconciliou** o drift: as tabelas `notificacoes_enviadas` e `config_sla_etapa` agora têm arquivos de migration no repo, provados fiéis contra o catálogo vivo por smoke executável. Mas ela **não descobriu, e não tinha como descobrir, quem as aplicou**.

O que se sabe:

- Os arquivos **nunca existiram** em nenhuma branch ou stash — confirmado por `git log --all --diff-filter=A` e `git stash list`, ambos vazios.
- Os COMMENTs de tabela dizem literalmente *"Phase 37 / LEDGER-01/02/03"* e *"Phase 37 / TIMELINE-01"*, citam o PRD §5.1.1 e nomeiam P38/P40 como consumidores. Foi trabalho deliberado desta fase, feito por uma sessão anterior.
- O Fernando, perguntado diretamente em 2026-07-22, respondeu que não sabe quem aplicou.

## Por que isso importa

Existe um caminho de apply a PROD que não passa pelo repositório. Enquanto ele existir:

1. **Um `supabase db reset` ou rebuild de ambiente pode perder objetos silenciosamente** — foi exatamente o risco que a P37 fechou para estas duas tabelas, mas o mecanismo que o criou continua disponível.
2. **A fase seguinte pode planejar contra um schema que não é o real.** A P37 só não construiu tabelas duplicadas porque o reconcile do ledger da P36 tropeçou no drift por acaso.
3. **As fases 39 e 41 também mexem em banco** (triggers, `pg_cron`, webhook). Se houver drift lá também, o padrão se repete — e a P39 é a de maior risco do milestone, com DROP de triggers vivos.

## Mitigação já em vigor

O `37-01-PLAN.md` estabeleceu o padrão certo, e ele deve virar regra para as fases 39 e 41: **dump literal do catálogo vivo como Wave 1, antes de qualquer arquivo ser escrito.** Na P37 isso pegou dois erros na paráfrase (`administrador` vs `admin`, e um índice tido como inexistente que já estava lá) que teriam produzido arquivos divergentes.

## Ações sugeridas (nenhuma urgente)

- Antes da P39: rodar o mesmo dump contra os triggers vivos de `historico_candidatura`, `candidaturas` e `agendamentos_entrevista` — o STATE já alerta que há triggers n8n além dos 3 do SEC-03.
- Investigar se há histórico no SQL Editor do Supabase que identifique a sessão de origem.
- Considerar uma checagem de drift recorrente (comparar `schema_migrations` contra `ls supabase/migrations/`) — barata, e teria pego isto em segundos.
