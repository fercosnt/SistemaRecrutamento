# Phase 37: Camada de Dados de Notificação - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 áreas, 12 decisões, todas aceitas como recomendadas

> ⚠ **Esta fase mudou de natureza antes de começar.** A descoberta do drift PROD→repo (durante o reconcile do ledger da P36) revelou que as duas tabelas já existem em produção, com schema de boa qualidade. A P37 deixou de ser "construir a camada de dados" e passou a ser **"reconciliar o drift e fechar 3 lacunas estreitas"**. O retrato completo do schema vivo está em `.planning/todos/done/37-drift-prod-tabelas-notificacao.md` (arquivado pela 37-05 em 2026-07-22) — **leia antes de planejar**, e leia a seção `## Resolução` junto: o corpo do documento é paráfrase e erra o literal de role (`administrador`, não `admin`).

<domain>
## Phase Boundary

Fazer com que a camada de dados de notificação seja **verdadeira no repositório** e **completa o suficiente** para a EF da P38 escrever nela — partindo de um schema que já está vivo em PROD mas que o repositório desconhece.

**Dentro do escopo:**
- Reconstruir os arquivos de migration correspondentes ao que está vivo (`notificacoes_enviadas`, `config_sla_etapa`)
- Migration aditiva fechando 3 lacunas: colunas de auditoria do modo teste, `atualizado_em` que nunca atualiza, índice parcial para a varredura de retry
- Smokes que provam RLS (incluindo candidato-DENY), idempotência, CHECKs e seed
- Regenerar `database.types.ts`

**Fora do escopo:**
- EF `notificar-candidato`, templates, `.ics` → P38
- Triggers de disparo, DROP dos triggers n8n → P39
- Leitura da timeline no painel → P40
- Webhook de reconciliação, `pg_cron` de retry → P41 (mas o **índice** que ela vai usar entra aqui)

</domain>

<decisions>
## Implementation Decisions

### Estratégia de Reconciliação do Drift
- **Dois arquivos fiéis, não um baseline.** Reconstruir `supabase/migrations/20260721000001_notificacoes_enviadas.sql` e `supabase/migrations/20260721000002_config_sla_etapa.sql` a partir do DDL vivo, com os versions que **já constam no ledger**. Preserva a correspondência 1:1 arquivo↔linha do ledger. **Não re-aplicar** — já estão marcados como aplicados.
- **Lacunas em migration aditiva nova** (`20260722000002_…`), nunca editando os reconstruídos. Reescrever um arquivo que já consta no ledger é mentira histórica: o que rodou em PROD não foi aquele conteúdo.
- **Fidelidade provada por smoke de diff**, não por leitura: re-consultar `information_schema.columns` + `pg_constraint` + `pg_policies` + `pg_index` e comparar campo-a-campo contra o arquivo reconstruído. Falhar se divergir. (Foi exatamente "escrever e revisar por leitura" que deixou o drift nascer.)
- **Sem `CREATE TABLE IF NOT EXISTS`** nos arquivos reconstruídos — mascara divergência silenciosamente. Os arquivos descrevem o estado; a proteção contra re-execução é o ledger.

### As Três Lacunas
- **Auditoria do modo teste:** `destinatario_original text NOT NULL` + `modo text NOT NULL DEFAULT 'teste'` com `CHECK (modo IN ('producao','teste'))`. Default fail-safe espelhando `_shared/email-config.ts` da P36. A tabela tem **0 linhas**, então `NOT NULL` entra livre, sem backfill. Sem essas colunas, um envio de UAT em modo teste (redirecionado para `delivered+<evento>@resend.dev`) fica indistinguível de um envio real no ledger.
- **`atualizado_em` congelado:** criar `public.tocar_atualizado_em()` (pt-BR, `SET search_path = ''`) + trigger `BEFORE UPDATE` nas duas tabelas. A função existente em PROD é `public.update_updated_at_column()`, que seta `NEW.updated_at` (inglês) — **incompatível** com o `atualizado_em` das nossas tabelas; não reusar. Hoje a tabela tem 0 triggers e a coluna congela no instante do INSERT, justamente onde seria mais útil (reivindicação de idempotência, retry, reconciliação da P41).
- **Candidato-DENY permanece implícito.** A RLS já cai em default-deny para role `candidato` (só existe a policy `rh_le_notificacoes`, escopada a admin/rh). Provar por **smoke com JWT de candidato**, não adicionar policy. Racional: uma policy permissiva mal escrita **abre** acesso; a ausência de policy nunca abre. Adicionar superfície para auto-documentar troca segurança por legibilidade — não vale aqui.
- **Índice parcial de retry entra agora:** `(status, proxima_tentativa_em) WHERE status IN ('pendente','falhou')` — é a query exata que o `pg_cron` da P41 vai rodar. Criar junto com as colunas evita uma segunda migration na P41.

### Escopo e Prova
- **BLOCKING reduzido.** A P37 continua bloqueando, mas o bloqueio encolheu: as tabelas já existem, então só as **colunas novas** bloqueiam a P38 (a EF grava `destinatario_original`/`modo`). A P40 já poderia ler `config_sla_etapa` hoje.
- **Tarefas de banco são checkpoint do orquestrador, marcadas `autonomous: false` desde o planejamento.** Subagentes GSD não recebem os tools MCP do Supabase (bug upstream anthropics/claude-code#13898 — agentes com `tools:` restrito). Comprovado na P36/Plano 36-04, que bateu nesse muro no meio da execução. O plano da P37 deve assumir isso de saída em vez de redescobrir.
- **Não re-seedar `config_sla_etapa`.** Está 8/8, coerente, com rótulos pt-BR bons. Apenas um smoke que prova as 8 linhas e os CHECKs de consistência. Re-seed idempotente sobrescreveria texto que já está correto.
- **Regenerar `database.types.ts`** — diferente da P36 (onde nenhum código client tocava a RPC), aqui há tabelas e colunas que o client vai consumir: a P40 lê `config_sla_etapa` do painel do candidato.

### Claude's Discretion
- Nome exato da migration aditiva e ordem interna dos statements.
- Formato do smoke de diff (SQL puro, script Node, ou asserções no SUMMARY) desde que compare campo-a-campo e falhe em divergência.
- Se `destinatario_original` ganha índice (provavelmente não — não há query por ele previstas até a P41).

</decisions>

<code_context>
## Existing Code Insights

### O que já está vivo em PROD (fonte da verdade para a reconstrução)
Retrato completo em `.planning/todos/done/37-drift-prod-tabelas-notificacao.md`. Resumo:
- `notificacoes_enviadas` — 16 colunas, RLS on, `uq_notif_dedupe UNIQUE (dedupe_key)` (a guarda de idempotência do LEDGER-02 **já existe**), FKs `ON DELETE CASCADE` para `candidatos`/`candidaturas`, `CHECK (evento IN ('confirmacao','avanco','convite','decisao'))`, **0 linhas**, 0 triggers.
- Policy `rh_le_notificacoes` — **é** o join-through vaga-scoped do LEDGER-03: `admin OR (rh AND candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id = c.vaga_id WHERE v.created_by = auth.uid()))`. Sem policy de INSERT/UPDATE → só `service_role` escreve, correto para a EF.
- `config_sla_etapa` — PK em `etapa`, 3 CHECKs de consistência de prazo, policy `sla_public_read` (`anon`+`authenticated`, `SELECT`, `qual: true`), **seedada 8/8**.
- Enums: `status_notificacao` = `pendente, enviado, entregue, falhou, bounce, reclamado`. `etapa_processo` (pré-existente) = 8 valores.

### Reusable Assets
- `supabase/functions/_shared/email-config.ts` (P36) — `resolverDestinatario()` produz o par (destinatário reescrito, destinatário original) e `resolverModo()` produz `producao|teste`. **É o contrato que as colunas novas precisam armazenar.**
- Padrão de migration PROD do repo: Supabase MCP `apply_migration` + reconcile do ledger, sem wrapper `BEGIN`/`COMMIT` (CLAUDE.md). **Nunca** `supabase db push --linked` (SQLSTATE 42601 em corpo `$$`).
- Idioma de `SECURITY DEFINER` + `SET search_path = ''` já padrão no repo (`20260706110005_sec03_n8n_serverside.sql`, `20260610000003_reprocessar_rpc.sql`, e a `ler_resend_api_key()` da P36).

### Integration Points
- `database.types.ts` — regenerado ao final; consumido pela P40.
- A EF `notificar-candidato` (P38) escreve `destinatario_original` e `modo`.
- O `pg_cron` da P41 consulta pelo índice parcial `(status, proxima_tentativa_em)`.

</code_context>

<specifics>
## Specific Ideas

- O smoke de candidato-DENY precisa realmente assumir a identidade de um candidato (via `set local role authenticated` + `request.jwt.claims` com `app_metadata.role = 'candidato'`), não apenas afirmar que "não há policy". A conta de teste `candidato.funil@teste.com` existe em PROD.
- O smoke de idempotência deve provar o `uq_notif_dedupe` empiricamente: inserir a mesma `dedupe_key` duas vezes e exigir violação de constraint na segunda. Como a tabela está vazia, isso é seguro — limpar as linhas de teste depois.
- Ao reconstruir os arquivos, preservar os nomes reais dos objetos (`uq_notif_dedupe`, `ck_sla_prazo_consistente`, `rh_le_notificacoes`, `sla_public_read`) — se o arquivo inventar nomes diferentes, um rebuild produz um schema que não bate com PROD e o drift volta pela porta dos fundos.

</specifics>

<deferred>
## Deferred Ideas

- **Retenção de `notificacoes_enviadas`** (questão aberta herdada do kickoff do M7) — política de expurgo/arquivamento. Não há volume ainda; decidir num milestone de LGPD-OPS (já deferido para M8+).
- **Coluna `reclamado_em`** para simetria com `enviado_em`/`entregue_em` — o enum já tem o valor `reclamado`, mas o webhook que o produz só chega na P41. Deixar a P41 decidir se precisa do timestamp.
- **Tornar o candidato-DENY explícito** — reavaliar se algum dia surgir uma policy de INSERT/UPDATE na tabela (aí o default-deny deixa de ser a única barreira).
- **Corrigir a divergência `updated_at` vs `atualizado_em`** no resto do schema — há uma função `update_updated_at_column()` em inglês convivendo com colunas pt-BR noutras tabelas. Fora do escopo; anotar como débito se confirmado.

</deferred>
