# P37 — Drift PROD→repo: as tabelas de notificação já existem em produção

**Descoberto:** 2026-07-22, durante o reconcile do ledger da Phase 36 (Plano 36-04).
**Severidade:** BLOQUEIA o planejamento da Phase 37 se ignorado — não a execução da P36.
**Descoberto por:** orquestrador, via Supabase MCP (`project_id: isljnozzlvckrgjjbjwp`).

## O fato

O ledger de migrations de PROD contém duas linhas para as quais **não existe arquivo local** em `supabase/migrations/`:

| version | name | arquivo local? |
|---|---|---|
| `20260721000001` | `20260721000001_notificacoes_enviadas` | ❌ ausente |
| `20260721000002` | `20260721000002_config_sla_etapa` | ❌ ausente |

Confirmado independentemente por `ls supabase/migrations/` e por `git log --oneline -- <paths>` (ambos vazios). Ou seja: há objetos vivos em produção que o repositório desconhece — exatamente os deliverables planejados da Phase 37 (LEDGER-01/02/03 + TIMELINE-01).

## O schema vivo, capturado em 2026-07-22

### `notificacoes_enviadas` — RLS **on**, **1** policy, 5 constraints, 5 índices, 0 triggers

| coluna | tipo | null | default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `evento` | text | NO | — |
| `candidatura_id` | uuid | NO | — |
| `candidato_id` | uuid | NO | — |
| `template` | text | NO | — |
| `destinatario_email` | text | NO | — |
| `status` | `status_notificacao` (enum) | NO | `'pendente'` |
| `provider_message_id` | text | YES | — |
| `dedupe_key` | text | NO | — |
| `tentativas` | integer | NO | `0` |
| `proxima_tentativa_em` | timestamptz | YES | — |
| `ultimo_erro` | text | YES | — |
| `criado_em` | timestamptz | NO | `now()` |
| `atualizado_em` | timestamptz | NO | `now()` |
| `enviado_em` | timestamptz | YES | — |
| `entregue_em` | timestamptz | YES | — |

### `config_sla_etapa` — RLS **on**, **1** policy, 4 constraints, 1 índice, 0 triggers

| coluna | tipo | null | default |
|---|---|---|---|
| `etapa` | `etapa_processo` (enum) | NO | — |
| `prazo_valor` | integer | YES | — |
| `prazo_unidade` | text | YES | — |
| `rotulo_candidato` | text | NO | — |
| `atualizado_em` | timestamptz | NO | `now()` |

## Duas lacunas já visíveis contra o que o M7 planejou

1. **RLS incompleta.** `notificacoes_enviadas` tem **1** policy. O LEDGER-03 exige **duas** posturas distintas: RH vaga-scoped via join-through (espelhando `rh_gerencia_agendamento`) **e** candidato-DENY. Uma policy só provavelmente não cobre ambas — a P37 precisa inspecionar a policy existente (`pg_policies`) antes de decidir entre estender ou substituir.
2. **Falta o par de auditoria do modo teste.** Existe `destinatario_email`, mas não `destinatario_original` nem `modo`/`redirecionado`. O `_shared/email-config.ts` entregue na P36 (`resolverDestinatario`) reescreve o destinatário para `delivered+<evento>@resend.dev` em modo teste **preservando o original** — sem colunas para isso, um envio de UAT em modo teste fica indistinguível de um envio real no ledger. Recomendação levantada pelo executor do Plano 36-01 e ainda não endereçada.

## O que a Phase 37 DEVE fazer

- **Começar diffando o schema vivo**, não assumindo criação do zero. Um `CREATE TABLE` cego falha; um `CREATE TABLE IF NOT EXISTS` é pior — mascara silenciosamente um schema divergente do planejado.
- Inspecionar, no mínimo: `pg_policies` (as policies reais), `pg_constraint` (o `UNIQUE(dedupe_key)` de idempotência existe?), `pg_index`, e os valores do enum `status_notificacao` contra a state machine planejada (`pendente→enviado→entregue/falhou/bounce`).
- Verificar se `config_sla_etapa` está **seedada** com os prazos do PRD §5.1.1, ou se está vazia.
- **Reconstruir os arquivos de migration locais** que correspondem ao que está vivo, para eliminar o drift — ou aplicar migrations aditivas que fechem as lacunas, com os arquivos correspondentes commitados.

## Nota operacional

Os subagentes GSD **não recebem os tools MCP do Supabase** (limitação conhecida de agentes com `tools:` restrito no frontmatter — bug upstream anthropics/claude-code#13898). Toda inspeção e todo apply em PROD precisam ser feitos pelo orquestrador/main thread. Planeje a P37 assumindo isso: as tarefas de banco fecham como checkpoint para o orquestrador, não como trabalho autônomo do executor.
