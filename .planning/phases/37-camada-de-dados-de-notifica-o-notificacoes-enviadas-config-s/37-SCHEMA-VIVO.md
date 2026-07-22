# Phase 37 — Dump literal do catálogo Postgres vivo

**Capturado:** 2026-07-22, pelo orquestrador via Supabase MCP `execute_sql`
**Projeto:** `isljnozzlvckrgjjbjwp` (Sistema de Recrutamento)
**Propósito:** fonte da verdade para a reconstrução dos arquivos de migration (Plano 37-02) e para a migration aditiva (Plano 37-03). Transcrição verbatim — sem reformatar, sem normalizar, sem traduzir.

---

## ⚠ Descoberta que reescopa a fase (de novo)

Os COMMENTs de tabela provam que **este schema foi produzido como trabalho da própria Phase 37**, por uma sessão anterior cujos arquivos de migration nunca chegaram ao repositório:

- `notificacoes_enviadas` → *"Phase 37 / LEDGER-01/02/03: audit trail of every notification dispatch. RH vaga-scoped via rh_le_notificacoes join-through; candidato-DENY. Writes ONLY via P38 EF service_role. UNIQUE(dedupe_key) durable idempotency. Retention INDEFINITE in v1 (LGPD-OPS purge deferred to M8)."*
- `config_sla_etapa` → *"Phase 37 / TIMELINE-01: static non-PII SLA config per funnel etapa. Public-read; write only via migration. Seeded from PRD §5.1.1, consumed by P40 candidate timeline (ESTIMATE, never countdown). 'referencias' omitted (no live enum value); 'aprovado' NULL prazo (terminal-positive)."*

Não é schema de origem duvidosa: é uma implementação completa, deliberada e auto-documentada da P37, alinhada ao PRD e ao ROADMAP do M7.

---

## (C) ÍNDICES — definição canônica

```
config_sla_etapa | config_sla_etapa_pkey    | CREATE UNIQUE INDEX config_sla_etapa_pkey ON public.config_sla_etapa USING btree (etapa)
notificacoes_enviadas | notificacoes_enviadas_pkey | CREATE UNIQUE INDEX notificacoes_enviadas_pkey ON public.notificacoes_enviadas USING btree (id)
notificacoes_enviadas | uq_notif_dedupe         | CREATE UNIQUE INDEX uq_notif_dedupe ON public.notificacoes_enviadas USING btree (dedupe_key)
notificacoes_enviadas | idx_notif_candidatura   | CREATE INDEX idx_notif_candidatura ON public.notificacoes_enviadas USING btree (candidatura_id)
notificacoes_enviadas | idx_notif_provider_msg  | CREATE INDEX idx_notif_provider_msg ON public.notificacoes_enviadas USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL)
notificacoes_enviadas | idx_notif_retry         | CREATE INDEX idx_notif_retry ON public.notificacoes_enviadas USING btree (proxima_tentativa_em) WHERE (status = ANY (ARRAY['pendente'::status_notificacao, 'falhou'::status_notificacao]))
```

**Contagens:** `config_sla_etapa` = 1 índice · `notificacoes_enviadas` = **5** índices.

> 🔴 **O índice parcial de retry JÁ EXISTE** (`idx_notif_retry`). A lacuna nº 3 do `37-CONTEXT.md` **não existe** — o Plano 37-03 deve remover a criação do índice. A forma viva (`btree (proxima_tentativa_em) WHERE status IN (...)`) é funcionalmente equivalente — e provavelmente melhor — que a planejada `(status, proxima_tentativa_em) WHERE ...`, porque o predicado parcial já fixa `status` e o índice fica mais estreito.
>
> Bônus: `idx_notif_provider_msg` (parcial em `provider_message_id`) é exatamente o índice que a reconciliação por webhook da P41 vai precisar. Também já existe.

## (E) RLS + triggers não-internos

```
config_sla_etapa      | relrowsecurity=true | relforcerowsecurity=false | triggers_nao_internos=0
notificacoes_enviadas | relrowsecurity=true | relforcerowsecurity=false | triggers_nao_internos=0
```

**0 triggers em ambas** → a lacuna do `atualizado_em` é real, e o `CREATE TRIGGER` sem `IF EXISTS` do Plano 37-03 é seguro.

## (I) Colisão de nome da função de trigger

```
update_updated_at_column | args="" | prosecdef=false | proconfig=["search_path=public"]
```

`public.tocar_atualizado_em()` **não existe** → sem colisão, o Plano 37-03 pode criá-la.
`update_updated_at_column()` existe mas seta `NEW.updated_at` (inglês) e usa `search_path=public` (não `''`) → **não reusar**, conforme já travado no CONTEXT.

## (G) COMMENTs de coluna — contratos que a P38 precisa herdar

```
notificacoes_enviadas.status:
  State machine pendente -> enviado -> (entregue | falhou | bounce | reclamado); falhou may
  return to pendente on retry. Governed by the P38 EF / P41 webhook, NOT a rigid constraint.

notificacoes_enviadas.dedupe_key:
  Durable idempotency guard; format '{evento}:{candidatura_id}:{discriminador}' where
  discriminador = etapa_destino for avanco/decisao, agendamento_id for convite, literal
  'confirmacao' for confirmation. EF claims via INSERT ... ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id BEFORE sending.
```

> Estes dois comentários são **contrato de implementação para a Phase 38**: o formato da `dedupe_key` e o protocolo de reivindicação (`ON CONFLICT DO NOTHING RETURNING id` **antes** do envio) já estão especificados. A P38 deve segui-los, não reinventá-los.

## Demais seções

Colunas (A), constraints (B), policies (D), enums (F) e seed (J) foram capturados e estão transcritos em `.planning/todos/pending/37-drift-prod-tabelas-notificacao.md` § "Retrato completo do que está vivo", com uma correção conhecida registrada abaixo.

**(J) Contagens de dados:** `notificacoes_enviadas` = **0 linhas** · `config_sla_etapa` = **8 linhas** (seed completo).
**(K) Ledger:** `20260721000001`, `20260721000002` e `20260722000001` presentes; `20260722000002` ausente (esperado — é a aditiva ainda não criada).

---

## ⚠ Divergência vs. o todo do drift

| Item | O que o todo dizia | O que o catálogo diz |
|---|---|---|
| Literal de role na policy | `admin` | **`administrador`** (paráfrase minha estava errada; 28 ocorrências de `= 'administrador'` nas migrations locais confirmam a convenção) |
| Índice de retry | listado como lacuna a criar | **já existe** como `idx_notif_retry` |
| Nº de índices em `notificacoes_enviadas` | 5 (correto) | 5 — mas dois deles (`idx_notif_retry`, `idx_notif_provider_msg`) já cobrem necessidades que eu atribuí às fases 37 e 41 |

---

## Consequências para 37-02 e 37-03

1. **Literal de role a usar nos smokes:** `administrador` (nunca `admin`).
2. **`public.tocar_atualizado_em()` não existe** → sem colisão de nome.
3. **0 triggers não-internos hoje** → `CREATE TRIGGER` sem `IF EXISTS` é seguro nas duas tabelas.
4. **`notificacoes_enviadas` tem 0 linhas** → `ADD COLUMN ... NOT NULL` sem default é seguro para `destinatario_original`.
5. **🔴 O Plano 37-03 deve REMOVER a criação do índice parcial de retry** — já existe. Tentar criá-lo produziria erro de nome duplicado ou, com `IF NOT EXISTS`, um no-op silencioso que mascararia a divergência de definição.
6. **A migration aditiva encolhe para duas coisas:** as colunas de auditoria do modo teste (`destinatario_original`, `modo` + CHECK) e a função/triggers de `atualizado_em`.
7. **A P38 herda dois contratos já escritos** nos COMMENTs de coluna: o formato da `dedupe_key` e o protocolo de reivindicação por `ON CONFLICT ... RETURNING`.

**GATE DE PARADA — não disparado.** As duas premissas travadas seguem válidas: os versions `20260721000001`/`20260721000002` **estão** no ledger (não re-aplicar) e `notificacoes_enviadas` tem **0 linhas** (NOT NULL sem backfill).
