---
phase: 37-camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s
plan: 01
status: complete
completed: 2026-07-22
requirements: [LEDGER-01, LEDGER-02, LEDGER-03, TIMELINE-01]
executed_by: orquestrador (checkpoint — subagentes não têm os tools MCP do Supabase)
key_files:
  created:
    - .planning/phases/37-camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s/37-SCHEMA-VIVO.md
  modified: []
---

# Plano 37-01 — Dump literal do catálogo vivo (checkpoint do orquestrador)

Wave 1 da fase. Executado pelo main thread via Supabase MCP `execute_sql` no projeto `isljnozzlvckrgjjbjwp`, porque agentes GSD com `tools:` restrito não recebem os tools MCP (bug upstream anthropics/claude-code#13898). Nenhum executor foi despachado.

## Por que este plano existe

O `37-drift-prod-tabelas-notificacao.md` é **paráfrase**, não catálogo — eu o escrevi narrando o que tinha visto. Reconstruir arquivos de migration a partir de paráfrase reintroduziria o drift na primeira linha. O planner exigiu um dump literal antes de qualquer arquivo ser escrito, e estava certo: **a paráfrase continha erros**.

## O que o dump corrigiu

| Item | O que a paráfrase dizia | O que o catálogo diz |
|---|---|---|
| Literal de role na policy | `admin` | **`administrador`** — confirmado por 28 ocorrências de `= 'administrador'` nas migrations locais |
| Índice parcial de retry | lacuna a ser criada pela 37-03 | **já existe** como `idx_notif_retry`, na forma `btree (proxima_tentativa_em) WHERE status IN ('pendente','falhou')` |
| Índice de reconciliação | atribuído por mim à P41 | **já existe** como `idx_notif_provider_msg` (parcial em `provider_message_id`) |

O primeiro erro teria produzido uma policy reconstruída que não bate com PROD. O segundo teria feito a 37-03 tentar criar um índice existente — erro de nome duplicado, ou, com `IF NOT EXISTS`, um no-op silencioso mascarando divergência de definição.

## Descoberta que mudou o enquadramento da fase

Os COMMENTs de tabela provam que o schema órfão **foi produzido como trabalho da própria Phase 37**, por uma sessão anterior cujos arquivos nunca chegaram ao repositório:

- `notificacoes_enviadas` → *"Phase 37 / LEDGER-01/02/03: audit trail of every notification dispatch…"*
- `config_sla_etapa` → *"Phase 37 / TIMELINE-01: static non-PII SLA config per funnel etapa. Seeded from PRD §5.1.1, consumed by P40…"*

Não é schema de origem duvidosa a ser tratado com desconfiança: é uma implementação deliberada, completa e auto-documentada, alinhada ao PRD e ao ROADMAP. Isso mudou a postura da fase de "engenharia reversa defensiva" para "reconciliação de autoria".

Os COMMENTs de **coluna** foram além e entregaram dois contratos de implementação que a **Phase 38 herda prontos**: o formato da `dedupe_key` (`{evento}:{candidatura_id}:{discriminador}`) e o protocolo de reivindicação (`INSERT ... ON CONFLICT (dedupe_key) DO NOTHING RETURNING id` **antes** do envio).

## Gate de parada — não disparado

As duas premissas travadas do CONTEXT foram verificadas e seguem válidas:

- `20260721000001` e `20260721000002` **estão** no ledger → os arquivos reconstruídos não devem ser re-aplicados.
- `notificacoes_enviadas` tem **0 linhas** → `ADD COLUMN ... NOT NULL` sem default é seguro para `destinatario_original`.

Além disso: `public.tocar_atualizado_em()` não existe (sem colisão de nome) e há **0 triggers não-internos** nas duas tabelas (`CREATE TRIGGER` sem `IF EXISTS` é seguro).

## Artefato

`37-SCHEMA-VIVO.md` — transcrição verbatim de índices, RLS/triggers, colisão de função, COMMENTs de coluna, contagens de dados e estado do ledger, mais a seção "Consequências para 37-02 e 37-03" que virou o insumo direto dos dois planos da Wave 2 (e o motivo da revisão do 37-03).

## Nota de processo

Este plano é do tipo `checkpoint:human-verify` e foi executado sem despachar subagente, então nenhum SUMMARY foi gerado no momento. O executor da 37-05 detectou a ausência (ROADMAP marcando 4/5) e **deliberadamente não fabricou um summary retroativo** — escalou para o orquestrador. Este arquivo fecha o registro. O padrão vale para as fases 39 e 41, que também terão planos de checkpoint: quem executa o checkpoint escreve o SUMMARY.
