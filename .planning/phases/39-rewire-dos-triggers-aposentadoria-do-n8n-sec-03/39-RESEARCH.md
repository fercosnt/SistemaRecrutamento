# Phase 39: Rewire dos Triggers & Aposentadoria do n8n (SEC-03) — Research

**Researched:** 2026-07-26
**Domain:** Postgres triggers (PL/pgSQL) + pg_net async HTTP dispatch → Supabase Edge Function, Vault Bearer self-auth, atomic DDL swap (DROP+CREATE), notification funnel safety
**Confidence:** HIGH (in-repo precedents for every mechanism; pg_net semantics cross-verified against current Supabase docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (`avanco`):** dispara **SÓ** quando `historico_candidatura.etapa_para = 'avaliacao_assincrona'`. `triagem`/`decisao_final` são estados internos do RH → sem e-mail; entrevistas têm o e-mail de convite.
- **D-02 (`decisao`):** dispara no `historico_candidatura` com `etapa_para IN ('aprovado','rejeitado') AND auto_rejeitado = false`. **1 trigger CASE cobre aprovado E rejeitado; NENHUM satélite em `decisao_final`.** (`registrar_decisao()`/`rejeitar_candidatura` na decisão fazem `UPDATE candidaturas SET etapa_atual=...` → `avancar_etapa()` grava a linha de histórico.) `em_espera` NÃO muda etapa → sem linha → sem e-mail.
- **D-03 (`confirmacao`):** dispara em `candidaturas AFTER INSERT`, com **survivor-guard** (suprime knockout). Coexiste (ortogonal) com o já-vivo `trg_candidaturas_analise`.
- **D-04 (`convite`):** dispara em `agendamentos_entrevista AFTER INSERT`. Corpo carrega `agendamento_id` (a EF **exige** quando `evento='convite'`, index.ts:111).
- **D-05:** knockout **NÃO recebe NENHUM e-mail** (confirmação suprimida via survivor-guard **E** decisão suprimida via `auto_rejeitado=false`). Preserva RNF-07a + D-15.
- **D-06:** e-mail de decisão **ÚNICO e neutro** (aprovado E rejeitado). **Zero mudança na P38.** Veredito só no painel.
- **D-07 (contrato imutável):** corpo do `net.http_post` = vocabulário exato da EF `EventoLedger = "confirmacao" | "avanco" | "convite" | "decisao"`. Trigger envia **só ids** — a EF resolve dados por allowlist e monta o `dedupe_key`.
- **D-08:** DROP dos **4 triggers n8n vivos + suas 4 funções** (todos dormentes; secret `n8n_webhook_base` ausente). **DBMIG-02:** diff-before-drop (`pg_get_functiondef` no orquestrador) confirma graceful-skip ANTES do DROP.
- **D-09:** aposentar o disparo n8n do `submit-candidatura` — ⚠ **LIVE, não dormente** (index.ts:300-327, `fetch(...)` fire-and-forget com URL de fallback HARDCODED). **O bloco tem de ser removido e a EF re-deployada.** Desarmar a env var não desliga.
- **D-10:** DROP dos 4 + CREATE dos 3 numa **ÚNICA migration atômica**. Guard durável: `UNIQUE(dedupe_key)` (P37).
- **D-11:** hop trigger→EF por **Vault Bearer self-auth** (mirror `analise-candidato-individual`): `project_url` + `edge_invoke_key` do Vault (ambos vivos). Corpo só ids → sem PII no payload (DISPATCH-04).
- **D-12:** **NÃO editar** `avancar_etapa()`, `guard_rejeicao_auditada`, `trg_candidaturas_analise`, `notify_cost_anomaly` (este é o cost-alerter, NÃO n8n — fora de escopo, não dropar). Os novos triggers são `AFTER INSERT`, ortogonais.
- **D-13:** migration via **Supabase MCP `apply_migration` + reconcile do ledger** (não `db push`); **sem** wrapper `BEGIN;...COMMIT;`; a tarefa de banco **fecha como checkpoint do orquestrador** (subagentes não têm os tools MCP do Supabase — bug anthropics/claude-code#13898).

### Claude's Discretion

- Nomes dos 3 triggers/funções novos (convenção `trg_notif_*` / verbo pt-BR), estrutura do `CASE`, e como o survivor-guard lê o estado de knockout (via a linha de `candidaturas` recém-inserida ou um EXISTS).

### Deferred Ideas (OUT OF SCOPE)

- **E-mail de aprovação distinto (comemorativo):** deferido a P38-v2/backlog (reabriria a P38).
- Qualquer mudança na EF `notificar-candidato` (P38 fechada); reconciliação/retry/webhook Resend/pg_cron (P41); timeline do painel (P40, já feita).
- 4 todos revisados e NÃO-dobrados (25-review-deferred, 36-resend-chave-divergencia, cc0-cognitive-item-bank-sourcing, processo-origem-do-drift-desconhecida).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **DISPATCH-01** | Trigger `AFTER INSERT ON historico_candidatura` com `CASE` sobre `etapa_para` = fonte canônica única das transições (avanço + decisão), ids-only, graceful-skip | § "Pattern 1: CASE trigger em historico_candidatura" + precedente `avancar_etapa()` é o único escritor da tabela → o AFTER INSERT é o hook correto |
| **DISPATCH-02** | Satélites `AFTER INSERT ON candidaturas` (confirmação, survivor-guard) e `AFTER INSERT ON agendamentos_entrevista` (convite) para eventos que NÃO são transições de etapa | § "Pattern 2/3" + `agendamentos_entrevista.candidatura_id` confirmado (schema) → convite carrega candidatura_id + agendamento_id |
| **DISPATCH-03** | DROP dos 4 triggers n8n + 4 funções **E** remoção do disparo env-var do `submit-candidatura`, no mesmo phase | § "Atomic DROP-and-CREATE" + § "Runtime State Inventory" (a EF LIVE é o único item cross-artefato) |
| **DISPATCH-04** | Hop trigger→EF por Vault Bearer self-auth, corpo só ids (sem PII) | § "Pattern: trigger→EF hop (pg_net + Vault Bearer)" — precedente verbatim `trg_candidatura_analise()` |
</phase_requirements>

## Summary

Esta fase troca a **topologia de disparo** do funil de notificação: remove 4 triggers n8n dormentes (+ suas funções) e o disparo n8n LIVE embutido no `submit-candidatura`, e cria 3 triggers novos que auto-disparam a EF `notificar-candidato` (P38) via `pg_net` com Bearer self-auth do Vault. **Não há mecanismo novo a inventar** — cada peça já existe no repo e roda em PROD: o hop `pg_net + Vault Bearer + graceful-skip` é `trg_candidatura_analise()` (migration `20260610000002`) e `notify_cost_anomaly()` (`20260706010602`); o survivor-guard de knockout é a linha `IF NEW.status = 'rejeitado' OR NEW.opcao_knockout_id IS NOT NULL THEN RETURN NEW;` que o `trg_candidaturas_analise` já aplica no MESMO `AFTER INSERT ON candidaturas`; a idempotência é o `UNIQUE(dedupe_key)` + claim-before-send da P37/P38.

O risco não está na sintaxe — está em **quatro invariantes de segurança**: (1) **sem janela de double-send** (DDL DROP+CREATE é transacional → atômico dentro da migration; o único ponto não-atômico é a fronteira migration↔redeploy-do-`submit-candidatura`, resolvida por **ordenar o redeploy ANTES do apply**); (2) **o funil nunca bloqueia** (graceful-skip + `EXCEPTION WHEN OTHERS` fail-open — `net.http_post` é async pós-commit e erros vão para `net._http_response`, nunca sobem como exceção); (3) **at-most-once** (`net._http_response` tem retenção de 6h → um 404 silencioso é perda permanente → é por isso que o phase é GATED em P38 viva, e por isso a reconciliação é P41); (4) **zero PII no payload** (só ids).

**Primary recommendation:** Escreva UMA migration que primeiro DROPa os 4 triggers+4 funções n8n (após o diff DBMIG-02) e depois CRIA 3 funções+triggers `SECURITY DEFINER SET search_path=''`, cada uma copiando o esqueleto exato de `trg_candidatura_analise()` (Vault `project_url`+`edge_invoke_key` → graceful-skip → `PERFORM net.http_post(url := project_url || '/functions/v1/notificar-candidato', headers Bearer, body ids-only)`) envolto em `EXCEPTION WHEN OTHERS THEN RAISE WARNING ... RETURN NEW`. No execute: **(a) deploy P38 + smoke, (b) redeploy `submit-candidatura` sem o bloco n8n, (c) apply da migration via MCP + reconcile** — nessa ordem.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Detectar evento do funil (confirmação/avanço/decisão/convite) | Database (trigger AFTER INSERT) | — | O funil vive no Postgres; a fonte canônica de cada evento é uma mutação de linha, não uma chamada de app |
| Autenticar o hop trigger→EF | Database (lê Vault, monta Bearer) | API/EF (`notificar-candidato` valida Bearer==service_role) | Self-auth: nem o trigger nem a EF confiam no cliente; a EF não é endpoint público |
| Despachar HTTP para a EF | Database (`net.http_post`, async pós-commit) | — | pg_net é a fila leve; sem broker externo (decisão travada M7) |
| Resolver dados do candidato + renderizar + enviar e-mail | API/EF (P38, `notificar-candidato`) | Database (allowlist reads) | **FORA DE ESCOPO** — P38 fechada; o trigger só passa ids |
| Idempotência (1 e-mail por evento) | Database (`UNIQUE(dedupe_key)`) | API/EF (claim-before-send ON CONFLICT) | O guard durável é a constraint; o trigger NÃO deduplica |
| Aposentar o n8n (DROP triggers/funções) | Database (DDL na migration) | — | Topologia de catálogo; atômico com o CREATE |
| Aposentar o disparo n8n LIVE do submit-candidatura | API/EF (edição de código + redeploy) | External (n8n cloud, ação humana) | Único artefato NÃO coberto pela migration → risco de janela |

## Standard Stack

Fase **backend/DB pura**. **Zero dependências novas** (npm/PyPI/crates) — decisão travada no M7 ("zero dependências npm novas"). Todo o mecanismo já está vivo em PROD.

### Core (já vivo — reuse, não instalar)
| Mecanismo | Onde já vive | Papel nesta fase |
|-----------|--------------|------------------|
| `pg_net` (`net.http_post`) | Vivo desde SEC-03 (P24) | Despacho HTTP async trigger→EF |
| Supabase Vault (`vault.decrypted_secrets`) | `edge_invoke_key`, `project_url` vivos | Self-auth Bearer + URL do projeto |
| PL/pgSQL `SECURITY DEFINER SET search_path=''` | Toda função de trigger do repo | Ler o Vault + endurecer resolução de nome |
| EF `notificar-candidato` | P38 (código fechado; **deploy é o GATE**) | Sink dos 3 triggers |
| `UNIQUE(dedupe_key)` em `notificacoes_enviadas` | P37 (vivo) | Guard durável de idempotência |

### Alternatives Considered (e por que NÃO)
| Instead of | Could Use | Tradeoff / Por que rejeitado |
|------------|-----------|------------------------------|
| `pg_net` async | Supabase **Database Webhooks** (UI) | Webhooks são açúcar de UI sobre o mesmo `pg_net`; escondem a config em estado fora do git (o mesmo anti-padrão que gerou o drift da P37). Manter em migration versionada. |
| Trigger→EF direto | Broker/fila externa (pgmq/QStash/BullMQ) | Overkill p/ 4 eventos neste volume (exclusão explícita em REQUIREMENTS). |
| 1 CASE + 2 satélites | 4 triggers separados (1 por evento) | O CASE unifica avanço+decisão porque ambos nascem da MESMA fonte (`historico_candidatura AFTER INSERT`) — 1 função, 1 predicado por ramo. Menos superfície. |
| Satélite em `decisao_final` p/ aprovação | — | **Desnecessário** (D-02, PROD-verified): a aprovação move `etapa_atual='aprovado'` → `avancar_etapa()` grava a linha de histórico → o CASE já cobre. |

**Installation:** N/A — nenhum pacote instalado.

## Package Legitimacy Audit

**N/A — esta fase não instala nenhum pacote externo** (zero npm/PyPI/crates). Todo o mecanismo (`pg_net`, Vault, PL/pgSQL) já vive em PROD desde fases anteriores. slopcheck não se aplica. Não há `postinstall`, não há registry a verificar.

## Architecture Patterns

### System Architecture Diagram

```
                       ┌─────────────────────────── PROD Postgres ───────────────────────────┐
  candidato submete    │                                                                      │
   (submit-candidatura │  INSERT candidaturas ──► [trg_notif_confirmacao] AFTER INSERT        │
    EF, service_role)  │       │                     │ survivor-guard:                        │
        │              │       │                     │ NEW.status='rejeitado'                 │
        ▼              │       │                     │  OR opcao_knockout_id NOT NULL ─► SKIP  │
  [submit_candidatura  │       │                     │ else ─► net.http_post {confirmacao,ids}│
   _atomic RPC]        │       │                                        │                     │
   (knockout OR        │       └──► [trg_candidaturas_analise] (JÁ VIVO, não tocar)            │
    survivor)          │                                                 │                     │
                       │  RH avança/decide:                              │                     │
  RH (JWT)  ──────────►│  UPDATE candidaturas.etapa_atual                │                     │
        │              │       │                                         │                     │
        ▼              │       ▼ BEFORE UPDATE                           │                     │
  [avancar_etapa()]    │  [avancar_etapa()] (ÚNICO escritor, não tocar)  │                     │
   (não tocar) ────────┼──► INSERT historico_candidatura ──► [trg_notif_transicao] AFTER INSERT│
                       │                                       │ CASE NEW.etapa_para:          │
                       │                                       │  ='avaliacao_assincrona'      │
                       │                                       │      ─► {avanco}              │
                       │                                       │  IN('aprovado','rejeitado')   │
                       │                                       │   AND auto_rejeitado=false    │
                       │                                       │      ─► {decisao}             │
                       │                                       │  else ─► SKIP                 │
  RH agenda entrevista │  INSERT agendamentos_entrevista ─► [trg_notif_convite] AFTER INSERT   │
        │              │                                       │ ─► {convite, candidatura_id, │
        ▼              │                                       │       agendamento_id}         │
                       │                                       │                               │
                       │  Cada trigger: lê Vault (project_url + edge_invoke_key),              │
                       │  graceful-skip se ausente, EXCEPTION WHEN OTHERS ─► RAISE WARNING,    │
                       │  RETURN NEW (funil NUNCA bloqueia). net.http_post é ASYNC PÓS-COMMIT. │
                       └───────────────────────────────┬──────────────────────────────────────┘
                                                       │ POST /functions/v1/notificar-candidato
                                                       │ Authorization: Bearer <edge_invoke_key>
                                                       │ body: { evento, candidatura_id, [agendamento_id] }
                                                       ▼
                       ┌──────────── EF notificar-candidato (P38 — FORA DE ESCOPO) ────────────┐
                       │ valida Bearer==service_role · resolve dados por allowlist ·           │
                       │ claim ON CONFLICT(dedupe_key) DO NOTHING · render · fetch Resend ·     │
                       │ grava notificacoes_enviadas (pendente→enviado/falhou)                  │
                       └──────────────────────────────────────────────────────────────────────┘

  APOSENTADO nesta fase (DROP/remoção):
   ✗ trg_n8n_nova_candidatura / trg_n8n_status_candidatura (candidaturas)
   ✗ trg_n8n_revisao_decisao (decisao_final) · ✗ trg_n8n_novo_candidato (candidatos)
   ✗ submit-candidatura index.ts:300-327 fetch(...) → n8n cloud (LIVE, hardcoded)
```

### Pattern 1: trigger→EF hop (pg_net + Vault Bearer + graceful-skip) — o esqueleto dos 3 triggers

**What:** Função de trigger `SECURITY DEFINER SET search_path=''` que lê `project_url`+`edge_invoke_key` do Vault, faz graceful-skip se ausente, e `PERFORM net.http_post` para a EF com Bearer. **Copiar verbatim de `trg_candidatura_analise()`.**
**When to use:** Os 3 triggers desta fase. É o mesmo esqueleto; muda só o predicado do guard e o `body`.
**Example:**
```sql
-- Source: supabase/migrations/20260610000002_analise_trigger.sql:25-65 (VERIFIED: codebase)
-- (esqueleto verbatim; adicionar o EXCEPTION wrapper — ver Pitfall 2)
CREATE OR REPLACE FUNCTION public.trg_notif_<evento>()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- <predicado de guard específico do evento — ver Pattern 2/3/4>

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- graceful-skip: funil avança mesmo sem dispatch
  END IF;

  BEGIN  -- fail-open (Pitfall 2): dispatch NUNCA aborta o write do funil
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(  -- IDS-ONLY, zero PII (DISPATCH-04)
        'evento', '<evento>',
        'candidatura_id', <NEW.id | NEW.candidatura_id>
        -- , 'agendamento_id', NEW.id  (só convite)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_<evento>: dispatch falhou (%: %) — funil intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_notif_<evento>() FROM PUBLIC;
```

### Pattern 2: Confirmação — satélite em `candidaturas AFTER INSERT` com survivor-guard

**Predicado (guard de knockout):** copiar o guard EXATO do `trg_candidaturas_analise` que já roda no mesmo `AFTER INSERT ON candidaturas`:
```sql
-- Source: 20260610000002_analise_trigger.sql:37 (VERIFIED: codebase)
IF NEW.status = 'rejeitado' OR NEW.opcao_knockout_id IS NOT NULL THEN
  RETURN NEW;  -- knockout: confirmação suprimida (D-03/D-05)
END IF;
```
**Por que este é o sinal certo** [VERIFIED: submit-candidatura index.ts:289-297 + database.types.ts]: no knockout, `submit_candidatura_atomic` auto-rejeita síncrono na MESMA txn setando `status='rejeitado'` e `etapa_atual='inscricao'`; um survivor avança para `'triagem'`. `candidaturas` tem as colunas `status` (enum `status_candidatura` inclui `'rejeitado'`) e `opcao_knockout_id` (uuid|null). **Nenhum EXISTS necessário** — o estado de knockout está na própria linha NEW. Usar o mesmo predicado do analise-trigger mantém os dois `AFTER INSERT ON candidaturas` consistentes.
**Body:** `{ evento:'confirmacao', candidatura_id: NEW.id }`.

### Pattern 3: Convite — satélite em `agendamentos_entrevista AFTER INSERT`

**Predicado:** nenhum (dispara sempre). **Body:** `{ evento:'convite', candidatura_id: NEW.candidatura_id, agendamento_id: NEW.id }`.
**Confirmado** [VERIFIED: database.types.ts]: `agendamentos_entrevista` tem `candidatura_id` (NOT NULL) e `id`. A EF exige AMBOS (index.ts:107 candidatura_id, index.ts:111 agendamento_id) — o dedupe do convite é `{agendamento_id}:convite` (helpers.ts:34-38), logo cada agendamento = 1 convite (re-agendamento legítimo = novo id = nova chave = re-notifica).

### Pattern 4: Transição — CASE em `historico_candidatura AFTER INSERT` (avanço + decisão)

**Predicado (CASE sobre `NEW.etapa_para`):**
```sql
-- avanço: só o CTA da avaliação assíncrona (D-01)
IF NEW.etapa_para = 'avaliacao_assincrona' THEN
  <dispatch evento='avanco'>
-- decisão: aprovado E rejeitado, só decisões HUMANAS (D-02/D-05)
ELSIF NEW.etapa_para IN ('aprovado','rejeitado') AND NEW.auto_rejeitado = false THEN
  <dispatch evento='decisao'>
ELSE
  RETURN NEW;  -- triagem/entrevistas/decisao_final: sem e-mail
END IF;
```
**Por que `auto_rejeitado=false` é o guard certo** [VERIFIED: avancar_etapa 20260607000005:82 + rejeitar_candidatura 20260714100001]: `avancar_etapa()` grava `auto_rejeitado = (v_ator IS NULL)`, e `v_ator := auth.uid()` é **GUC-based e sobrevive ao `SECURITY DEFINER`** (verificado empiricamente 2026-06-07). Uma decisão registrada por RH (JWT presente, mesmo via RPC `SECURITY DEFINER` `rejeitar_candidatura`) → `auto_rejeitado=false` → notifica. Um write de sistema/`service_role` (sem JWT) → `auto_rejeitado=true` → suprime. O knockout **nem produz** linha de histórico com `etapa_para='rejeitado'` (ele deixa `etapa_atual='inscricao'`), então é duplamente suprimido.
**Body:** `{ evento:'avanco'|'decisao', candidatura_id: NEW.candidatura_id }`.

### Recommended migration structure (uma única migration atômica)

```
supabase/migrations/<ts>_p39_rewire_triggers_aposenta_n8n.sql
  -- (sem BEGIN/COMMIT wrapper — D-13)
  -- Bloco A: DROP (aposentadoria) — após o diff DBMIG-02 do orquestrador
  DROP TRIGGER IF EXISTS trg_n8n_nova_candidatura   ON public.candidaturas;
  DROP TRIGGER IF EXISTS trg_n8n_status_candidatura ON public.candidaturas;
  DROP TRIGGER IF EXISTS trg_n8n_revisao_decisao    ON public.decisao_final;
  DROP TRIGGER IF EXISTS trg_n8n_novo_candidato      ON public.candidatos;
  DROP FUNCTION IF EXISTS public.trg_n8n_nova_candidatura();
  DROP FUNCTION IF EXISTS public.trg_n8n_status_candidatura();
  DROP FUNCTION IF EXISTS public.trg_n8n_revisao_decisao();
  DROP FUNCTION IF EXISTS public.trg_n8n_novo_candidato();
  -- Bloco B: CREATE (nova topologia) — 3 funções + 3 triggers (Pattern 2/3/4)
  ...
```
**Ordem DROP TRIGGER → DROP FUNCTION obrigatória** [VERIFIED: Postgres dependency semantics]: um `DROP FUNCTION` falha enquanto um trigger referencia a função ("cannot drop ... because other objects depend on it"). Dropar o trigger primeiro (ou `DROP FUNCTION ... CASCADE`, evitado por clareza). Ordem Bloco A vs Bloco B é indiferente (DDL transacional, tudo commita junto) — A-antes-de-B por legibilidade. Nomes velhos (`trg_n8n_*`) e novos (`trg_notif_*`) não colidem.

### Anti-Patterns to Avoid
- **Manter os triggers n8n "temporariamente" ao lado dos novos:** superfície de double-send. DROP e CREATE no MESMO phase (D-10).
- **Editar `avancar_etapa()` / `trg_candidaturas_analise` / `guard_rejeicao_auditada`:** carregam guards ortogonais (ENTREV-03, análise IA, rejeição auditada). Os novos triggers são `AFTER INSERT`, independentes (D-12).
- **Dropar `notify_cost_anomaly`:** usa `net.http_post` MAS é o cost-alerter, não n8n. FORA de escopo (D-12).
- **`net.http_post` sem header `Authorization`:** causa nº1 de falha silenciosa do pg_net (a EF exige Bearer) [CITED: github.com/orgs/supabase/discussions/37591].
- **Deixar o dispatch levantar exceção:** abortaria o write do funil. Sempre `EXCEPTION WHEN OTHERS ... RETURN NEW`.
- **Aplicar a migration ANTES de redeployar `submit-candidatura`:** abre a janela de double-send (novo trigger de confirmação + n8n LIVE simultâneos). Redeploy PRIMEIRO.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Autenticar o hop trigger→EF | Novo esquema de token/HMAC | `project_url`+`edge_invoke_key` do Vault + Bearer (Pattern 1) | Precedente vivo (`trg_candidatura_analise`, `notify_cost_anomaly`); a EF já valida `Bearer==service_role` |
| Não notificar knockout | Nova coluna/flag/consulta | O guard `NEW.status='rejeitado' OR NEW.opcao_knockout_id IS NOT NULL` que o analise-trigger já usa | Sinal já na linha NEW; zero query extra |
| Idempotência (1 e-mail/evento) | Dedupe no trigger (checar `notificacoes_enviadas` antes) | `UNIQUE(dedupe_key)` + claim ON CONFLICT na EF (P37/P38) | O trigger é async/at-most-once; o guard durável é a constraint, não o trigger |
| URL do projeto | Hardcode do endpoint da EF | `project_url` do Vault | Hardcode é exatamente o bug D-09 que estamos aposentando |
| Retry do dispatch | Loop/retry no trigger | Nada aqui — P41 (pg_cron + webhook) | Fora de escopo; `net.http_post` é fire-and-forget by design |

**Key insight:** Todo custom aqui recria um bug já pago. O único código realmente novo é o **predicado** de cada evento (o CASE e o survivor-guard) — o resto é cópia de precedente auditado.

## Runtime State Inventory

> Fase de rewire + aposentadoria de serviço externo. Um grep do repo NÃO enxerga a EF deployada nem a instância n8n cloud.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | 4 triggers + 4 funções n8n vivos no catálogo PROD (`pg_trigger`/`pg_proc`): `trg_n8n_nova_candidatura`, `trg_n8n_status_candidatura` (candidaturas), `trg_n8n_revisao_decisao` (decisao_final), `trg_n8n_novo_candidato` (candidatos). Todos dormentes (`n8n_webhook_base` ausente → graceful-skip). `notificacoes_enviadas` já vivo (0 linhas, guard `UNIQUE(dedupe_key)`). | **DDL na migration** — DROP dos 4+4. **DBMIG-02:** diffar cada corpo vivo via `pg_get_functiondef` (orquestrador, tem MCP) ANTES do DROP para confirmar graceful-skip. Nenhuma migração de DADOS (não há string renomeada em linhas). |
| **Live service config** | (1) EF `submit-candidatura` **deployada** carrega o `fetch(...)` para `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura` (index.ts:310-330), URL de fallback HARDCODED → LIVE mesmo sem env var. (2) A(s) workflow(s) n8n nessa instância cloud vivem na UI do n8n (fora do repo). | (1) **Editar o código (remover linhas 300-330) + REDEPLOY** `submit-candidatura` — ANTES do apply da migration. (2) Desativar/apagar a(s) workflow(s) no painel n8n = **ação humana** do Fernando (fora da migration; parte da "aposentadoria" mas não bloqueia o rewire — a URL deixa de ser chamada assim que o bloco cai). |
| **OS-registered state** | **Nenhum** — verificado: esta fase não registra cron/task/launchd/systemd. O `pg_cron` de retry é P41, fora de escopo. | Nenhuma. |
| **Secrets/env vars** | Vault PROD (re-verificado 2026-07-26): `edge_invoke_key` + `project_url` **presentes** (reuso p/ o novo hop); `n8n_webhook_base` **ausente** (por isso os 4 triggers são dormentes — DROP é seguro); `resend_api_key` **ausente** (⚠ o GATE que trava o execute). EF env var `N8N_NOVA_CANDIDATURA_URL` (se setada) fica morta após D-09. Overrides opcionais `NOTIFICAR_SECRET`/`ANALISE_SECRET` default p/ service_role. | Nenhuma rotação de secret. `n8n_webhook_base` pode ser removido do Vault como faxina opcional (não bloqueia). NÃO tocar `edge_invoke_key`/`project_url`. |
| **Build artifacts / installed packages** | (1) EF `submit-candidatura` deployada = artefato stale carregando o bloco n8n até o redeploy. (2) EF `notificar-candidato` **NÃO deployada** (verificado — o GATE). (3) `database.types.ts`: a migration cria só triggers/funções (não aparecem nos tipos) → **sem regen**. | (1) Redeploy (acima). (2) Deploy + smoke da P38 = pré-condição (UAT-38-1). (3) Nenhuma regeneração de tipos. |

**Canonical question — após todo arquivo do repo estar atualizado, que estado runtime ainda tem o velho disparo?** Resposta: **a EF `submit-candidatura` deployada** (até o redeploy) e **a(s) workflow(s) n8n cloud** (até a ação humana). Ambos fora da migration → são a razão da ordem de execute e do item humano.

## Common Pitfalls

### Pitfall 1: Trigger vai ao ar antes da EF `notificar-candidato` estar viva → 404 silencioso permanente
**What goes wrong:** `net.http_post` para uma EF inexistente retorna 404, que o pg_net **armazena em `net._http_response` sem levantar exceção**. O funil avança (bom), mas o e-mail é perdido para sempre — `net._http_response` só guarda 6h, e `net.http_post` é at-most-once (sem retry até a P41). [VERIFIED: supabase.com/docs/guides/database/extensions/pg_net]
**Why it happens:** pg_net é async pós-commit; falhas não voltam ao chamador.
**How to avoid:** **É o GATE do phase.** Não aplicar a migration antes do smoke da P38 (UAT-38-1) + `resend_api_key` no Vault. Cadeia estrita 38→39.
**Warning signs:** `SELECT status_code FROM net._http_response WHERE created > now()-interval '10 min'` mostra 404/401.

### Pitfall 2: Dispatch levanta exceção e faz rollback do write do funil
**What goes wrong:** Se o `PERFORM net.http_post` (ou a leitura do Vault) levantar, o `AFTER INSERT`/`AFTER UPDATE` propaga o erro e **aborta a transação do funil** — uma candidatura não é gravada, ou um avanço de etapa falha. Viola "o funil nunca bloqueia".
**Why it happens:** Trigger roda DENTRO da txn do write.
**How to avoid:** Envolver o dispatch em `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING ...; END;` + `RETURN NEW` (fail-open). Precedente exato: `trg_n8n_novo_candidato` (20260712100004:60-74, WR-02) fez isso justamente porque é candidate-facing. Aplicar aos 3.
**Warning signs:** INSERT de candidatura/agendamento falhando em teste quando o Vault/EF está indisponível.

### Pitfall 3: Janela de double-send na fronteira migration ↔ redeploy do submit-candidatura
**What goes wrong:** Se a migration (trigger de confirmação novo) for aplicada ANTES de remover o bloco n8n do `submit-candidatura` deployado, toda inscrição dispara DOIS caminhos (novo trigger → Beauty Smile + fetch n8n LIVE → n8n cloud). Se a workflow n8n ainda enviar um e-mail, o candidato recebe duplicado.
**Why it happens:** A migration é atômica, mas o redeploy da EF é um artefato SEPARADO, não-transacional com a migration.
**How to avoid:** **Ordem de execute: (b) redeploy `submit-candidatura` sem o bloco n8n → (c) apply da migration.** A janela resultante (após b, antes de c) é de confirmação AUSENTE (nem n8n nem trigger novo) por segundos — perda at-most-once tolerável de uma confirmação, MUITO preferível a um double-send. (DROP+CREATE DENTRO da migration é atômico — sem janela interna.)
**Warning signs:** Dois registros/e-mails de confirmação para a mesma inscrição em teste.

### Pitfall 4: `DROP FUNCTION` antes de `DROP TRIGGER`
**What goes wrong:** `DROP FUNCTION public.trg_n8n_*()` falha com "cannot drop ... other objects depend on it" enquanto o trigger existir.
**How to avoid:** `DROP TRIGGER IF EXISTS ... ON <tabela>;` primeiro, depois `DROP FUNCTION IF EXISTS ...();`. Nunca `CASCADE` (mascara dependência inesperada).

### Pitfall 5: 42601 no apply de corpo PL/pgSQL `$$` (o bug conhecido do repo)
**What goes wrong:** `supabase db push --linked` num corpo `CREATE FUNCTION ... $$` adjacente a `COMMENT`/`REVOKE` no transaction pooler → `SQLSTATE 42601: cannot insert multiple commands into a prepared statement`.
**How to avoid:** **Não usar `db push`.** Aplicar via Supabase MCP `apply_migration` (bypassa 42601, grava a version) + reconcile do ledger — checkpoint do orquestrador (D-13). Sem wrapper `BEGIN;/COMMIT;` (o driver já envolve). [CITED: CLAUDE.md §Migrations + db push]

### Pitfall 6: `search_path` não-vazio esconde `vault`/`net`
**What goes wrong:** Sem `SET search_path=''` + referências qualificadas (`vault.decrypted_secrets`, `net.http_post`), a função de trigger pode não resolver o schema `vault`, ou ficar vulnerável a objeto homônimo em schema de atacante.
**How to avoid:** `SECURITY DEFINER SET search_path=''` + tudo qualificado. Idioma padrão do repo (todos os precedentes). `REVOKE ALL ... FROM PUBLIC` endurece sem quebrar o trigger (triggers disparam independente de GRANT EXECUTE).

## Code Examples

### Ler segredo do Vault dentro de um trigger (verificado)
```sql
-- Source: 20260610000002_analise_trigger.sql:42-49 (VERIFIED: codebase)
SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets WHERE name = 'project_url';
SELECT decrypted_secret INTO v_invoke_key
  FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
  RETURN NEW;  -- graceful-skip
END IF;
```

### `net.http_post` — assinatura atual + uso em trigger
```sql
-- Source: supabase.com/docs/guides/database/extensions/pg_net (VERIFIED, 2026-07-26)
-- net.http_post(url text, body jsonb default '{}', params jsonb default '{}',
--   headers jsonb default '{"Content-Type":"application/json"}',
--   timeout_milliseconds int default 2000) RETURNS bigint  (request_id)
-- Requests NÃO iniciam até a txn COMMITAR (async pós-commit). Erros vão para
-- net._http_response (status_code / error_msg), NUNCA levantam exceção. Retenção 6h.
PERFORM net.http_post(
  url := v_project_url || '/functions/v1/notificar-candidato',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_invoke_key),
  body := jsonb_build_object('evento','confirmacao','candidatura_id', NEW.id)
);
```

### Diagnóstico de falha silenciosa (para o smoke / UAT)
```sql
-- Source: github.com/orgs/supabase/discussions/37591 (CITED)
SELECT id, status_code, error_msg, timed_out, created
  FROM net._http_response
 WHERE created > now() - interval '15 minutes'
 ORDER BY created DESC;   -- status_code>=400 OR error_msg NOT NULL = falha
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| n8n webhook (URL no bundle client) | Dispatch server-side via pg_net trigger + Vault | SEC-03 / P24 (2026-07-06) | Removeu o leak do bundle; deixou 4 triggers dormentes que ESTA fase remove |
| n8n como orquestrador de notificação | EF `notificar-candidato` própria (Resend) | M7 (P36-41) | Aposenta o n8n pessoal por substituição |
| `submit-candidatura` dispara n8n (env+fallback hardcoded) | Trigger `confirmacao` survivor-guarded | **Esta fase (P39)** | Remove double-send + suprime knockout (refino de comportamento) |

**Deprecated/outdated nesta fase:**
- Os 4 triggers `trg_n8n_*` + 4 funções → DROP.
- O bloco `fetch(N8N_NOVA_CANDIDATURA_URL...)` em `submit-candidatura` → removido + redeploy.
- Secret `n8n_webhook_base` → morto (faxina opcional).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O `dedupe_key` REALMENTE implementado na P38 é `{candidatura_id}:{evento}` (helpers.ts:29-41), NÃO o `{evento}:{candidatura_id}:{etapa_destino}` documentado no COMMENT da tabela P37. Consequência: o CASE trigger disparando `avanco`/`decisao` mais de uma vez para a MESMA candidatura (ex.: regressão-então-readvance) colapsa em UM e-mail. | Pattern 4 / Idempotência | **Baixo p/ P39** (é o comportamento seguro "no-double-send"; a divergência com a intenção "re-notifica" do LEDGER-02 é escopo P38, não P39). Planner: não confiar no discriminador `etapa_destino` — ele não existe no dedupe vivo. |
| A2 | A(s) workflow(s) na instância n8n cloud (`fernandocosta.app.n8n.cloud`) atualmente enviam (ou poderiam enviar) e-mail de confirmação — por isso o bloco LIVE do `submit-candidatura` é "double-send surface real". Não foi possível inspecionar a UI do n8n. | Pitfall 3 / Runtime State | Se a workflow n8n já estiver morta/desabilitada, não há double-EMAIL (só dispatch redundante). A ordem de execute (redeploy antes do apply) é segura de qualquer forma — assunção não altera o plano. |
| A3 | `edge_invoke_key` e `project_url` no Vault são suficientes e corretos para o hop (mesmos que o analise-trigger usa). Verificado vivo 2026-07-26 (CONTEXT), mas eu (subagente) não tenho MCP para re-verificar. | Pattern 1 / D-11 | Se ausentes, graceful-skip → sem e-mail (funil intacto). O smoke detecta via `net._http_response` 401. |

## Open Questions

1. **Faxina do `n8n_webhook_base` e das workflows n8n cloud**
   - What we know: o secret está ausente (triggers dormentes) e a URL do `submit-candidatura` é hardcoded; remover o bloco de código já corta o único caminho LIVE.
   - What's unclear: se Fernando quer também apagar o secret do Vault e desativar/deletar as workflows no painel n8n (ação humana).
   - Recommendation: incluir um item HUMAN-UAT/checkpoint "desativar workflow n8n cloud + (opcional) remover `n8n_webhook_base`" — não bloqueia o rewire, mas fecha a aposentadoria de verdade.

2. **A janela migration↔redeploy é aceitável perder confirmações?**
   - What we know: redeploy-antes-do-apply cria uma janela de segundos sem nenhum dispatch de confirmação.
   - What's unclear: volume de inscrições nessa janela (provavelmente zero em janela de manutenção).
   - Recommendation: aplicar em janela de baixo tráfego; a perda é at-most-once e só de confirmação (o e-mail menos crítico). Documentar no checkpoint.

## Environment Availability

| Dependency | Required By | Available | Version/Detail | Fallback |
|------------|------------|-----------|----------------|----------|
| `pg_net` extension | Todos os 3 triggers | ✓ | Vivo desde SEC-03/P24 | — (bloqueante se ausente) |
| Vault `project_url` + `edge_invoke_key` | Hop self-auth (D-11) | ✓ | Verificado vivo 2026-07-26 | graceful-skip (funil intacto, sem e-mail) |
| EF `notificar-candidato` deployada | Sink dos triggers | ✗ | **NÃO deployada (GATE)** | — nenhum: sem ela, 404 silencioso permanente |
| Vault `resend_api_key` | P38 enviar via Resend | ✗ | **Ausente (GATE UAT-36-2)** | — nenhum: EF grava `falhou`, e-mail perdido |
| Supabase MCP `apply_migration` | Aplicar migration (D-13) | ✓ (orquestrador) | Subagentes NÃO têm (bug #13898) | — a task de banco é checkpoint do orquestrador |
| Deploy de `submit-candidatura` (redeploy) | Remover bloco n8n (D-09) | ✓ (ação de deploy) | — | — |

**Missing dependencies with no fallback (bloqueiam o EXECUTE — são o GATE):**
- EF `notificar-candidato` deployada + smoke (UAT-38-1)
- `resend_api_key` no Vault (UAT-36-2)

**Nota:** planejar (escrever a migration/SQL, diffar corpos) é seguro e read-only AGORA. Só o APPLY é gated.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **SQL smoke tests** em `supabase/tests/*.sql` (padrão P37 — asserções via `RAISE`/GUC contra um Postgres descartável) · `deno test` p/ EFs · Vitest/Playwright p/ frontend (N/A esta fase) |
| Config file | Nenhum arquivo dedicado; smokes `.sql` são rodados via `psql`/SQL Editor contra um DB descartável (mirror `p37_fidelidade_schema_smoke.sql`) |
| Quick run command | `psql <disposable> -f supabase/tests/p39_rewire_triggers_smoke.sql` (Wave 0 — criar) |
| Full suite command | `npm run test:run` (Vitest — não cobre triggers) + os `.sql` smokes manuais |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISPATCH-01 | CASE dispara `avanco` SÓ em `etapa_para='avaliacao_assincrona'`; `decisao` SÓ em `aprovado`/`rejeitado` AND `auto_rejeitado=false`; else skip | smoke (SQL) | asserção contra `net._http_response` após INSERT em `historico_candidatura` | ❌ Wave 0 |
| DISPATCH-02 | Confirmação suprimida p/ knockout (`status='rejeitado'`/`opcao_knockout_id`); enviada p/ survivor; convite carrega `agendamento_id` | smoke (SQL) | INSERT candidaturas (knockout vs survivor) + INSERT agendamento; checar body/skip | ❌ Wave 0 |
| DISPATCH-03 | 0 triggers `trg_n8n_*` + 0 funções `trg_n8n_*` no catálogo; bloco n8n ausente do `submit-candidatura` | catalog + grep | `SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_n8n_%'` = 0; `pg_proc` = 0; `grep -c 'n8n' submit-candidatura/index.ts` = 0 | ❌ Wave 0 |
| DISPATCH-04 | Body do `net.http_post` = só ids (evento/candidatura_id/agendamento_id); header Bearer presente; nenhum nome/email/cpf/telefone | grep migration + smoke | asserção sobre o `jsonb_build_object` do body; inspeção `net._http_response` request | ❌ Wave 0 |

### O que provar (invariantes de segurança desta fase)
1. **Exatamente 1 e-mail por evento, sem duplicata** — cada fonte dispara 1x por evento lógico; qualquer double-fire é colapsado pelo `UNIQUE(dedupe_key)` da EF (herdado P37/P38). Prova: dois INSERTs de histórico `etapa_para='avaliacao_assincrona'` p/ a mesma candidatura → 1 linha `avanco` em `notificacoes_enviadas`.
2. **Nenhuma superfície de double-send remanescente** — catálogo: 0 triggers/funções `trg_n8n_*`; grep: `submit-candidatura` sem `fetch(...n8n...)`.
3. **O funil avança mesmo com a EF/secret indisponível (graceful-skip + fail-open)** — com `project_url` NULL OU EF 404, o INSERT/UPDATE ainda commita. Prova: apontar p/ URL inválida (ou remover secret num DB de teste) → a linha do funil grava; `net._http_response` mostra o erro (não a txn).
4. **Zero PII no payload do trigger** — o `body` só tem `evento` + ids. Prova: grep no corpo da função + `net._http_response` request body sem nome/email/cpf/telefone.
5. **Survivor-guard** — knockout (status='rejeitado'/opcao_knockout_id) → 0 dispatch de confirmação E 0 de decisão (não gera histórico `rejeitado`; `auto_rejeitado`=true suprimiria de qualquer forma).
6. **Mapeamento evento→fonte correto** — os 4 predicados (D-01..D-04) disparam da fonte certa e SÓ dela.
7. **Decisão só HUMANA** — uma rejeição via RPC `rejeitar_candidatura` sob JWT de RH real produz `auto_rejeitado=false` → dispara `decisao`; um write service_role (sem JWT) NÃO. Prova: impersonar RH real (não service_role) no smoke.

### Sampling Rate
- **Per task commit:** `psql -f supabase/tests/p39_rewire_triggers_smoke.sql` (< 30s num DB descartável).
- **Per wave merge:** smoke completo + `npm run test:run` (não-regressão do restante).
- **Phase gate (execute):** APÓS o apply em PROD (checkpoint orquestrador) — inspeção de `net._http_response` + catálogo `pg_trigger`/`pg_proc` + 1 ciclo end-to-end via `*@resend.dev` (modo teste). Isto é UAT humano, não automatizável por subagente.

### Wave 0 Gaps
- [ ] `supabase/tests/p39_rewire_triggers_smoke.sql` — cobre DISPATCH-01..04 (predicados, survivor-guard, graceful-skip, PII-free, catálogo pós-DROP) contra Postgres descartável, mirror de `p37_fidelidade_schema_smoke.sql`.
- [ ] Fixtures: candidatura knockout (status='rejeitado' + opcao_knockout_id) vs survivor; linha de histórico p/ cada `etapa_para`; agendamento. Impersonação de RH real (GUC `request.jwt.claims`) p/ provar `auto_rejeitado=false`.
- [ ] (Execute-time, orquestrador) script de verificação `net._http_response` + catálogo pós-apply.

## Security Domain

`security_enforcement` ausente do config → **habilitado**. Fase é candidata a `/gsd:secure-phase` (rewire de triggers + self-auth; STATE.md a marca junto da P37).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **yes** | Hop trigger→EF por Bearer self-auth (`edge_invoke_key` do Vault); a EF valida `Bearer==service_role` (não é endpoint público/spoofable) — DISPATCH-04 |
| V4 Access Control | yes | `SECURITY DEFINER SET search_path=''` + `REVOKE ALL ... FROM PUBLIC`; triggers disparam via mecanismo, não via GRANT |
| V5 Input Validation | yes (na EF, herdado) | A EF valida `evento` ∈ `EVENTOS_VALIDOS` e exige `agendamento_id` p/ convite; o trigger só emite ids controlados pelo servidor |
| V6 Cryptography | yes | Segredos SÓ do Vault (`vault.decrypted_secrets`), nunca hardcoded, nunca logados — o bug que aposentamos (D-09) é exatamente uma URL hardcoded |
| V7 Error/Logging | yes | Falha de dispatch → `RAISE WARNING` (observável, não silenciosa); logs só ids (nunca PII) |
| V9 Data Protection (PII/LGPD) | **yes** | Payload IDS-ONLY — nenhum nome/email/cpf/telefone cruza o `net.http_post` (o velho payload n8n carregava PII; é o motivo do SEC-03) |

### Known Threat Patterns for {pg_net trigger → Edge Function}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| EF de envio invocável sem auth (spoof de e-mail a candidato) | Spoofing | Bearer self-auth; EF exige `Bearer==service_role` (deploy `--no-verify-jwt` + validação própria) |
| PII vazando no payload do dispatch | Information Disclosure | Body só ids; resolução de dados por allowlist DENTRO da EF (nunca `select('*')`) |
| Dispatch falha e bloqueia/reverte o funil | Denial of Service (do funil) | graceful-skip (secret NULL) + `EXCEPTION WHEN OTHERS ... RETURN NEW` (fail-open) |
| Double-send (n8n LIVE + trigger novo) | Tampering/Repudiation (candidato recebe 2x) | DROP+CREATE atômico + redeploy-antes-do-apply + `UNIQUE(dedupe_key)` |
| Segredo em log/URL hardcoded | Information Disclosure | Vault-only; `logSeguro` allowlist; o próprio D-09 remove a URL hardcoded |
| Falha silenciosa do pg_net (404/401) mascarando perda | Repudiation | GATE em EF viva; diagnóstico `net._http_response`; reconciliação P41 |

## Sources

### Primary (HIGH confidence)
- **Codebase (VERIFIED via Read/grep):**
  - `supabase/migrations/20260610000002_analise_trigger.sql` — precedente verbatim do hop (Vault Bearer + graceful-skip + survivor-guard no mesmo `AFTER INSERT ON candidaturas`)
  - `supabase/migrations/20260706010602_cost_guardrail_fix.sql` — 2º precedente do hop (`notify_cost_anomaly`, RAISE WARNING quando secret ausente)
  - `supabase/migrations/20260706110005_sec03_n8n_serverside.sql` + `20260712100004_n8n_novo_candidato.sql` — os 4 triggers/funções a DROPar (+ o EXCEPTION fail-open WR-02)
  - `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` — único escritor de `historico_candidatura`; `auto_rejeitado=(auth.uid() IS NULL)`, GUC sobrevive DEFINER
  - `supabase/migrations/20260714100001_rejeitar_candidatura_rpc.sql` — prova de que a rejeição humana move `etapa_atual` com `ator=auth.uid()` → `auto_rejeitado=false`
  - `supabase/migrations/20260721000001_notificacoes_enviadas.sql` + `20260722000002_...` — `UNIQUE(dedupe_key)`, formato do dedupe (COMMENT), colunas
  - `supabase/functions/notificar-candidato/index.ts` + `helpers.ts` — contrato do evento (EVENTOS_VALIDOS, exigência de agendamento_id, `montarDedupeKey` REAL)
  - `supabase/functions/submit-candidatura/index.ts:289-330` — o webhook n8n LIVE hardcoded (D-09) + knockout status/etapa
  - `supabase/functions/analise-candidato-individual/index.ts` — EF self-auth Bearer (mirror do hop)
  - `database.types.ts` — schema `candidaturas.status`/`opcao_knockout_id`, `status_candidatura` enum, `agendamentos_entrevista.candidatura_id`
- **Supabase Docs (VERIFIED, 2026-07-26):** [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) — assinatura `net.http_post`, async pós-commit, erros em `net._http_response`, retenção 6h

### Secondary (MEDIUM confidence)
- [github.com/orgs/supabase/discussions/37591](https://github.com/orgs/supabase/discussions/37591) — falha silenciosa do pg_net em trigger: causa nº1 = header Authorization ausente; diagnóstico via `net._http_response`
- `.planning/phases/39-.../39-CONTEXT.md` — topologia PROD-verified 2026-07-26 (tratada como ground truth por instrução do orquestrador)

### Tertiary (LOW confidence)
- Estado da instância n8n cloud (workflows ativas?) — não inspecionável (A2)

## Metadata

**Confidence breakdown:**
- Standard stack (mecanismos): **HIGH** — cada peça é um precedente vivo em PROD, lido byte-a-byte
- Architecture (3 triggers + DROP atômico): **HIGH** — esqueleto = cópia de `trg_candidatura_analise`; predicados derivados de schema + migrations verificados
- pg_net semantics (async/6h/erro-não-levanta): **HIGH** — docs oficiais atuais + precedentes concordam
- Pitfalls (double-send/ordem/gate): **HIGH** — derivados de fatos verificados; A2 (n8n cloud) é a única incerteza, e não altera o plano
- Idempotência (dedupe real vs documentado): **MEDIUM** — divergência A1 confirmada por leitura, mas fora do escopo P39

**Research date:** 2026-07-26
**Valid until:** ~2026-08-25 (30 dias — mecanismos estáveis; re-verificar o Vault/deploy no execute pois são os GATES)
