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

## Retrato completo do que está vivo (capturado 2026-07-22)

**Origem:** desconhecida — o Fernando confirmou que não sabe quem aplicou. Tratar como schema a ser reconstruído por engenharia reversa a partir do banco.

### Constraints reais

| tabela | nome | definição |
|---|---|---|
| `notificacoes_enviadas` | `notificacoes_enviadas_pkey` | `PRIMARY KEY (id)` |
| `notificacoes_enviadas` | **`uq_notif_dedupe`** | **`UNIQUE (dedupe_key)`** ← a guarda de idempotência do LEDGER-02 **já existe** |
| `notificacoes_enviadas` | `notificacoes_enviadas_evento_check` | `CHECK (evento IN ('confirmacao','avanco','convite','decisao'))` ← os 4 eventos do M7 |
| `notificacoes_enviadas` | `..._candidatura_id_fkey` | `FK → candidaturas(id) ON DELETE CASCADE` |
| `notificacoes_enviadas` | `..._candidato_id_fkey` | `FK → candidatos(id) ON DELETE CASCADE` |
| `config_sla_etapa` | `config_sla_etapa_pkey` | `PRIMARY KEY (etapa)` |
| `config_sla_etapa` | `ck_sla_prazo_consistente` | `CHECK ((prazo_valor IS NULL) = (prazo_unidade IS NULL))` |
| `config_sla_etapa` | `..._prazo_unidade_check` | `CHECK (prazo_unidade IS NULL OR prazo_unidade IN ('dias_uteis','dias_corridos','horas'))` |
| `config_sla_etapa` | `..._prazo_valor_check` | `CHECK (prazo_valor IS NULL OR prazo_valor > 0)` |

### RLS real

- `notificacoes_enviadas` → **`rh_le_notificacoes`** (PERMISSIVE, `{authenticated}`, `SELECT`):
  `admin` OR (`rh` AND `candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id = c.vaga_id WHERE v.created_by = auth.uid())`).
  **Isto É o padrão join-through vaga-scoped que o LEDGER-03 pede.** E o **candidato-DENY existe implicitamente**: não há policy que case para role `candidato`, então RLS cai no default-deny. Sem policy de INSERT/UPDATE, apenas `service_role` (que bypassa RLS) escreve — correto para a EF da P38.
  → *Decisão para a P37:* aceitar o default-deny implícito, ou tornar o candidato-DENY explícito para ficar auto-documentado e à prova de uma policy futura mal escrita?
- `config_sla_etapa` → `sla_public_read` (PERMISSIVE, `{anon,authenticated}`, `SELECT`, `qual: true`). Leitura pública — correto, é config não-PII, e é o que a TIMELINE-02 (P40) precisa.

### Enums

- `status_notificacao`: `pendente, enviado, entregue, falhou, bounce, reclamado` — cobre a state machine do M7 e ainda inclui `reclamado`.
- `etapa_processo` (pré-existente): `inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado`.

### Seed de `config_sla_etapa` — **completo**, 8/8 etapas

| etapa | prazo | rótulo |
|---|---|---|
| `inscricao` | 48 horas | "Inscrição recebida — retorno da triagem em até 48 horas." |
| `triagem` | 48 horas | "Em triagem — retorno em até 48 horas." |
| `avaliacao_assincrona` | 7 dias corridos | "Avaliação liberada — conclua em até 7 dias corridos." |
| `entrevista_online` | 7 dias úteis | "Entrevista online — agendamento em até 7 dias úteis." |
| `entrevista_presencial` | 7 dias úteis | "Entrevista presencial — agendamento em até 7 dias úteis." |
| `decisao_final` | 3 dias úteis | "Em decisão final — resposta em até 3 dias úteis." |
| `aprovado` | — | "Parabéns! Você foi aprovado(a). Nossa equipe entrará em contato com os próximos passos." |
| `rejeitado` | 24 horas | "Processo encerrado — retorno enviado em até 24 horas." |

## Consequência: a P37 encolhe

O schema órfão é **de boa qualidade** e cobre a maior parte de LEDGER-01, LEDGER-02, LEDGER-03 e TIMELINE-01. A Phase 37 deixa de ser "construir a camada de dados" e passa a ser **"reconciliar o drift e fechar 3 lacunas estreitas"**:

1. **Reconciliar** — escrever os arquivos de migration locais que correspondem ao que está vivo, para o repo voltar a ser fonte da verdade. Sem isso, um `db reset` ou um rebuild de ambiente perde as duas tabelas silenciosamente.
2. **Lacuna: auditoria do modo teste** — faltam colunas para `destinatario_original` e `modo`. O `_shared/email-config.ts` da P36 reescreve o destinatário para `delivered+<evento>@resend.dev` em modo teste **preservando o original**; sem onde gravar isso, um envio de UAT fica indistinguível de um envio real no ledger.
3. **Lacuna: `atualizado_em` nunca atualiza** — a coluna tem `DEFAULT now()` mas a tabela tem **0 triggers**. Todo UPDATE (reivindicação de idempotência, retry, reconciliação da P41) deixa o campo congelado no instante do INSERT, tornando-o enganoso justamente onde ele seria mais útil.

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
