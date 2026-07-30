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
