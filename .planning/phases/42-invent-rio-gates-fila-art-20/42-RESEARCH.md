# Phase 42: Inventário, Gates & Fila Art. 20 — Research

**Researched:** 2026-07-29
**Domain:** LGPD Art. 20 review round-trip (trigger → EF → RPC → queue UI) + dated compliance inventory over a live Supabase ATS
**Confidence:** HIGH on codebase facts (every claim grepped, file:line cited) · HIGH on Supabase backup/Storage semantics (official docs, fetched) · MEDIUM on live-PROD state (this agent has **no** Supabase MCP — all live facts are specified as orchestrator checkpoints, not asserted)

> **Scope note.** Milestone-level research (`SUMMARY.md`, `FK-AUDIT-LIVE.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `STACK.md`) is authoritative and is **not** re-derived here. This document answers the phase-level *how*: exact edit sites, exact predicates, exact proof mechanisms, and the three corrections the milestone research got wrong.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Fila de Revisão RH (REVISAO-02)**
- **Rota nova `/rh/revisoes`**, superfície RH net-new desktop-first, com entrada no menu RH e contador de pendentes. Não é seção do `DashboardRHPage` nem aba do `CandidatosRHPage`.
- **O limiar do badge de SLA vive em tabela de configuração**, reusando o padrão já provado `config_sla_etapa` (P37) — alterável sem deploy. BD-4 (o número) segue em aberto: entra como **seed**, nunca como constante compilada.
- **Badge de 3 faixas (verde / âmbar / vermelho)** com rótulo em dias de espera. O SLA é **interno e nunca exibido ao candidato**, e a copy interna nunca usa "prazo legal".
- **Ordenação mais antigo primeiro; só pendentes por padrão**, com toggle "incluir respondidos".
- **Cada linha mostra:** candidato · vaga · decisão original · quem decidiu · dias em espera · badge.

**Write-path da resposta + guard reviewer ≠ decider (REVISAO-03/05)**
- **RPC `SECURITY DEFINER` único `responder_revisao_decisao`** — convenção viva do projeto e o único caminho em que o guard é server-enforced.
- **Colunas novas:** `revisao_por_usuario uuid REFERENCES auth.users(id)` e `revisao_respondida_em timestamptz`. A migration **não usa `ADD COLUMN IF NOT EXISTS`**.
- **Resultado estruturado:** veredito (`mantida` / `revertida`) em coluna própria + justificativa ≥50 caracteres em `revisao_resultado`.
- **Guard absoluto:** `auth.uid()` ≠ `decisao_final.por_usuario`, sem exceção. Nenhuma sobreposição por admin, nenhum fallback "se só houver 1 RH ativo".
- **Prova do bloqueio:** tentativa real com JWT impersonado de dois usuários RH distintos, output registrado no VERIFICATION.md. Não pode ser aviso de UI nem teste com mock.

**Notificações — RH (REVISAO-01) e candidato (REVISAO-04)**
- **EF nova `notificar-rh`**, irmã e separada de `notificar-candidato`.
- **Destinatários:** todos os `usuarios_rh` ativos com role `rh`/`administrador`, resolvidos por query no momento do envio.
- **Disparo:** trigger na transição `revisao_solicitada_em` NULL→NOT NULL + `pg_net`, espelhando o padrão já vivo (P39 rewire / P41 retry).
- **5º evento do pipeline COMM: `revisao_respondida`.** Adicionado nos **dois** lugares que fecham o vocabulário — a union `EVENTOS_VALIDOS` e o CHECK constraint vivo — na mesma migration/deploy. Exigida asserção de que os 4 eventos existentes continuam ramificando corretamente, **incluindo o preheader**.
- **O e-mail ao RH entra no mesmo ledger `notificacoes_enviadas`**, com dedupe key própria e o mesmo respeito a `NOTIFICACOES_MODO`.

**Artefatos de inventário (INVENT-01..05, REVISAO-06)**
- **Os artefatos vivem em `docs/compliance/` (pasta nova) no repositório.**
- **Inventário PII em formato duplo:** YAML/JSON machine-readable como fonte de verdade + tabela Markdown gerada dele.
- **Semente obrigatória: `.planning/research/FK-AUDIT-LIVE.md`** — o grafo de FK vivo, nunca arquivos de migration.
- **REVISAO-06 é entregue antes de qualquer tela:** SQL versionado em `docs/compliance/` + o resultado datado colado no artefato.
- **INVENT-02 (PITR):** verificado via API/MCP do Supabase e registrado como fato datado, com a frase explícita de que **Storage não é coberto por nenhum caminho de backup**.
- **INVENT-05:** `NOT IN` → `NOT EXISTS` no `ai-logs-retention-cleanup`, sob o portão de fase destrutiva — contagem antes/depois pela **mesma query**, dry-run, review bloqueante, zero `--no-verify`. Blast radius hoje é 0 linhas: registrar como fato datado **antes** do apply.

**Ordem normativa:** REVISAO-06 entregue **antes de qualquer tela**. A fase não reproduz o defeito que documenta (sem `ADD COLUMN IF NOT EXISTS`). Portão destrutivo aplica-se **só** ao INVENT-05; o resto é read-only.

### Claude's Discretion
- Nomes exatos de arquivos, componentes e migrations; layout fino da fila; estrutura interna dos artefatos YAML/Markdown; divisão em planos.
- Escolha entre enum Postgres e CHECK constraint para o veredito da revisão.
- Estratégia de teste além das provas exigidas nominalmente (JWT impersonado, não-regressão dos 4 eventos, contagem antes/depois do INVENT-05).

### Deferred Ideas (OUT OF SCOPE)
- **BD-4** (o número do SLA da fila Art. 20) — decisão de produto. A fase entrega a estrutura com um seed.
- **BD-3** (manter ou reescrever "revisão por pessoa natural") — Phase 43.
- **CONSENT-01/02** — mantidos íntegros na Phase 43.
- **Nome do recrutador em vez do UUID do `ator`** (W-1 / CONSOL-02) — Phase 47. Se a fila precisar exibir "quem decidiu" por nome, resolver localmente.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Descrição | Research Support |
|----|-----------|------------------|
| **INVENT-01** | Inventário de PII coluna-a-coluna (apagar / anonimizar / preservar), semeado do FK vivo | §Runtime State Inventory · §Code Examples E7 (query de catálogo) · §Pitfall 6 (a semente tem 3 erros de citação — corrigidos) |
| **INVENT-02** | Status PITR/backup como fato datado + Storage sem backup | §Environment Availability · §Code Examples E8 (Management API) · citação verbatim da doc oficial |
| **INVENT-03** | Diff `cron.job` vivo × repositório, cada job rastreável a uma migration | §Runtime State Inventory (3/3 já rastreados aqui) · §Code Examples E6 |
| **INVENT-04** | Varredura `ADD COLUMN IF NOT EXISTS`, identificando cláusulas FK silenciadas | §Runtime State Inventory (varredura **completa** já executada: 16 ocorrências / 8 arquivos) · §Pitfall 6 |
| **INVENT-05** | Bug `NOT IN` do `ai-logs-retention-cleanup` corrigido | §Code Examples E5 · §Pitfall 7 · §Known Conflict Resolution |
| **REVISAO-01** | RH notificado no pedido (trigger `revisao_solicitada_em` NULL→NOT NULL → EF `notificar-rh`) | §Pattern 2 (trigger+pg_net) · §Code Examples E1 (o ancestral droppado) · §Pattern 5 (resolução de destinatário) |
| **REVISAO-02** | Fila RH ordenada por antiguidade com badge de SLA interno | §Pattern 4 (leitura via RPC DEFINER — obrigatório, não opcional) · §Pitfall 2 · §Pitfall 3 |
| **REVISAO-03** | Resultado registrado por write-path auditável único | §Pattern 3 (RPC DEFINER) · §Code Examples E3 |
| **REVISAO-04** | Candidato notificado (5º evento COMM) | §Pattern 1 (**os 9 sítios de registro**, 4 compile-enforced / 5 não) · §Code Examples E2 · §Validation Architecture (a prova W-01) |
| **REVISAO-05** | Guard reviewer ≠ decider server-enforced | §Code Examples E4 (o harness de impersonação **já existe**) · §Validation Architecture |
| **REVISAO-06** | Consulta do passivo pendente em PROD, **antes** de qualquer tela | §Code Examples E9 |
</phase_requirements>

---

## Summary

Esta fase é duas fases costuradas. A **fila Art. 20** é integração aditiva sobre trilhos já provados em produção: o trigger→`pg_net`→EF do M7 (P39/P41), o RPC `SECURITY DEFINER` que é a convenção de todo write privilegiado do projeto, e o ledger `notificacoes_enviadas`. O **inventário** é trabalho de catálogo — read-only, exceto pela correção de um predicado de `DELETE` que hoje roda diariamente e apaga zero linhas em silêncio.

O risco não está distribuído por igual. Três coisas concentram quase todo ele. **(1)** A edição no `notificar-candidato` não tem 2 sítios de registro, como o CONTEXT presume — tem **nove**, dos quais quatro são forçados pelo compilador (`Record<EventoNotificacao, …>`) e cinco não são: `EVENTOS_VALIDOS` (um `ReadonlySet<string>` — aceita qualquer string), `montarDedupeKey` (if/else em runtime), o CHECK constraint vivo, o `DadosEmail` novo campo, e o corpo do template. Os cinco não-forçados são exatamente onde os defeitos CR-01/CR-02/W-01 nasceram. **(2)** A leitura da fila **não pode** ser uma query PostgREST do cliente: `usuarios_rh` é admin-only desde a SEG-02, então um `recrutador` lê apenas a própria linha e "quem decidiu" resolveria para `Não identificado` em 100% das linhas — a invariante #4 da UI-SPEC quebra por RLS, não por bug de UI. **(3)** A semente mandatória do INVENT-01 contém uma citação errada: a linha que o `FK-AUDIT-LIVE.md` aponta como causa do drift de `candidatos.user_id` altera `autorizacoes`, não `candidatos`, e o `ON DELETE CASCADE` que PROD tem está **declarado no repositório** — em `docs/sql/sql/02-tabela-candidatos.sql:14`, fora de `supabase/migrations/`. Não há drift naquela FK; há uma fonte de schema inteira que não passa pelo ledger de migrations. Isso é um achado maior, não menor.

O conflito "zero `--no-verify`" **já tem solução implementada no próprio repositório**: o `ci.yml` roda um gate de não-regressão com baseline congelada de 104 desde a Phase 5, re-pinado a cada medição (290→133→107→104). O `.husky/pre-commit` simplesmente nunca foi alinhado ao CI. Convertê-lo é copiar 6 linhas do CI para o hook. A contagem real medida hoje é **97**.

**Recomendação primária:** três planos — (P1) inventário read-only + REVISAO-06 + hook de não-regressão; (P2) camada de banco (migration de colunas + RPC + trigger) provada por impersonação; (P3) EFs + UI. INVENT-05 fica sozinho no fim de P1, atrás do portão destrutivo, com o hook já convertido.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Guard reviewer ≠ decider (REVISAO-05) | **Database (RPC `SECURITY DEFINER`)** | UI (cosmético) | `auth.uid()` só é confiável dentro do Postgres. `decisao_final` não tem policy de UPDATE → default-deny; o DEFINER é o único write path possível, e o guard tem de viver dentro dele |
| Leitura da fila com nome do decisor (REVISAO-02) | **Database (RPC `SECURITY DEFINER`)** | API/PostgREST — **inviável** | `usuarios_rh` é admin-only (`usuarios_rh_admin_select`, SEG-02). Um `recrutador` não lê a linha de outro RH. Join client-side é estruturalmente impossível |
| Contador de pendentes na sidebar | Database (mesmo RPC, ou RPC escalar) | Frontend (TanStack Query) | Escalar; não precisa de nomes → poderia ser PostgREST, mas o escopo por vaga (abaixo) força o mesmo DEFINER |
| Escopo de autorização da fila (`rh` vs `administrador`) | **Database (dentro do DEFINER)** | — | `rh_le_candidaturas` é vaga-scoped; `rh_le_decisao_final` **não é**. Um DEFINER bypassa as duas → o escopo tem de ser re-implementado explicitamente |
| Notificação ao RH (REVISAO-01) | **Database trigger + `pg_net`** | Edge Function `notificar-rh` | Padrão vivo P39/P41. O `AFTER UPDATE OF revisao_solicitada_em` já existiu (`trg_n8n_revisao_decisao`) e foi droppado pela P39 |
| Resolução de destinatários RH | **Edge Function (service_role)** | — | A query no `usuarios_rh` roster precisa bypassar RLS; o trigger envia ids-only, sem PII |
| Renderização + envio do e-mail | **Edge Function** | — | Chave do Vault, `NOTIFICACOES_MODO`, ledger, dedupe — tudo já mora na EF |
| Vocabulário de evento (5º evento) | **Database CHECK + TypeScript union** (dois lados, mesma entrega) | — | Fechado nos dois; um sem o outro = 500 em runtime ou linha rejeitada pelo CHECK |
| Limiar do SLA | **Database (tabela de config, RLS RH-only)** | Frontend (classificador puro e total) | Alterável sem deploy; a classificação é apresentação |
| Badge / faixas / copy | **Frontend** | — | Pura apresentação sobre dados vindos do servidor |
| Inventário PII / PITR / cron diff | **Artefato versionado (`docs/compliance/`)** | Orquestrador (coleta ao vivo) | Fato datado consumido pelas Phases 44/45 muito depois desta pasta de fase virar arquivo morto |

---

## Standard Stack

### Core — tudo já vivo, **zero adição**

| Tecnologia | Versão viva | Papel nesta fase | Por que é o padrão aqui |
|-----------|-------------|------------------|-------------------------|
| `pg_net` | 0.19.5 | Hop trigger → EF `notificar-rh` | Caminho provado ponta-a-ponta em PROD (P39/P41, UAT ao vivo 2026-07-28) `[VERIFIED: FK-AUDIT-LIVE pg_available_extensions]` |
| `supabase_vault` | 0.3.1 | `project_url` + `edge_invoke_key` para o Bearer do trigger | Invariante P41: nunca service-role no trigger `[VERIFIED: repo]` |
| Supabase Edge Functions (Deno) | — | `notificar-rh` (nova) + edição de `notificar-candidato` | Único lugar com service_role fora do banco |
| `@supabase/supabase-js@2` (esm.sh) | 2.x | Client da EF | Já importado por todas as EFs `[VERIFIED: index.ts:28]` |
| Resend via `fetch` plano | — | Envio | Zero SDK, decisão travada no M7 |
| `pg_cron` | 1.6.4 | Apenas leitura do catálogo (INVENT-03) + edição do predicado (INVENT-05) | — |
| TanStack Query v5 | — | `useFilaRevisoes` / `useRevisoesPendentesCount` / `useResponderRevisao` | Convenção do projeto |
| `date-fns` (`differenceInCalendarDays`) | — | Dias em espera | Idioma vivo de `diasNaEtapa` `[VERIFIED: slaThresholds.ts:59]` |
| shadcn/ui vendorizado | — | `table`/`badge`/`dialog`/`alert-dialog`/`radio-group`/`textarea`/`switch`/`tooltip` | Todos já em `src/components/ui/` |
| Vitest (config em `vite.config.ts`) | — | Testes de front | `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`, setup `./tests/setup.ts` `[VERIFIED: vite.config.ts:9-13]` |
| `deno test` | v2.x | Testes das EFs (CI bloqueante) | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` `[VERIFIED: ci.yml]` |

### Alternatives Considered

| Em vez de | Poderia usar | Tradeoff |
|-----------|--------------|----------|
| RPC `SECURITY DEFINER` para ler a fila | View + PostgREST | **Descartado.** `usuarios_rh` admin-only quebra o join do nome; e uma view `security_invoker=false` reintroduz o mesmo problema de escopo sem a legibilidade do guard |
| CHECK constraint no veredito | `CREATE TYPE ... AS ENUM` | Ambos vivem no projeto (`decisao_final_resultado` é enum; `notificacoes_enviadas.evento` é CHECK). **Recomendado: CHECK** — vocabulário fechado em 2 valores, auditável em `pg_constraint` ao lado do CHECK de ≥50 que a mesma migration adiciona, e não cria objeto de tipo novo numa fase cuja tese é inventariar o que existe. `ALTER TYPE … ADD VALUE` também tem restrições transacionais que a P37 já pagou |
| Estender `notificar-candidato` para o e-mail ao RH | EF `notificar-rh` separada | **Travado no CONTEXT.** Confirmado tecnicamente: a EF viva resolve destinatário por `candidatos.email` hard-wired (`index.ts` §3) e a `resolverDestinatario` do `_shared/email-config.ts` sanitiza `+label` por evento — nada disso serve para uma lista de N recipientes RH |
| Nova tabela de config de SLA | Reusar `config_sla_etapa` | **Não reusar a tabela.** A PK é `etapa public.etapa_processo` — não há valor de enum para "revisão Art. 20". Reusar o **padrão**, não a tabela. Ver §Pitfall 3 para a RLS |

**Installation:** nenhuma. `npm install` não é executado nesta fase.

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | **Nenhum pacote novo nesta fase** |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

A fase é explicitamente **zero-dependência-nova** (invariante do M8 herdada do M7, reafirmada na §Registry Safety da 42-UI-SPEC). Todo consumo (`date-fns`, `lucide-react`, `@tanstack/react-query`, `react-hook-form`, `zod`, `sonner`, primitivos shadcn) já é dependência do `package.json`. Nenhum `npm install`, nenhum `npx shadcn add`, nenhuma extensão Postgres nova. **Se um plano propuser um pacote, isso por si só é um desvio do CONTEXT e deve ser escalado.**

---

## Architecture Patterns

### System Architecture Diagram

```
── PEDIDO (já existe em PROD, hoje termina em nada) ─────────────────────────────
 Candidato  ──▶ SolicitarRevisaoCTA ──▶ rpc solicitar_revisao_decisao (DEFINER)
                                             │ UPDATE decisao_final
                                             │   SET revisao_solicitada_em = now()
                                             ▼
                              ╔══ NOVO (REVISAO-01) ════════════════════════════╗
                              ║ trg_notif_revisao_solicitada                     ║
                              ║  AFTER UPDATE OF revisao_solicitada_em           ║
                              ║  guard: OLD IS NULL AND NEW IS NOT NULL          ║
                              ║  Vault(project_url, edge_invoke_key) → graceful  ║
                              ║  net.http_post ids-only ──┐                      ║
                              ╚═══════════════════════════│══════════════════════╝
                                                          ▼
                              ╔══ EF notificar-rh (NOVA, service_role) ══════════╗
                              ║ resolve destinatários:                           ║
                              ║   usuarios_rh WHERE ativo AND deleted_at IS NULL ║
                              ║              AND role IN (administrador,         ║
                              ║                           recrutador)            ║
                              ║ NOTIFICACOES_MODO → sink em teste                ║
                              ║ claim-before-send no MESMO ledger                ║
                              ║ dedupe_key própria ──▶ Resend                    ║
                              ╚═══════════════════════════════════════════════════╝

── FILA + RESPOSTA (REVISAO-02/03/05) ───────────────────────────────────────────
 RH ──▶ /rh/revisoes ──▶ rpc listar_revisoes_decisao(p_incluir_respondidos)
                            │ DEFINER · re-implementa o escopo:
                            │   administrador → todas
                            │   rh            → só vagas.created_by = auth.uid()
                            │ projeta allowlist + usuarios_rh.nome_completo
                            ▼
                    FilaRevisoesTable ──▶ ResponderRevisaoDialog
                                              │
                                              ▼
                        rpc responder_revisao_decisao(id, veredito, justificativa)
                          ├─ GUARD: auth.uid() = por_usuario  ──▶ RAISE 42501 ✗
                          ├─ GUARD: length(justificativa) >= 50 ──▶ RAISE 22023 ✗
                          ├─ GUARD: já respondida            ──▶ RAISE 22023 ✗
                          └─ UPDATE decisao_final SET
                               revisao_veredito, revisao_resultado,
                               revisao_por_usuario = auth.uid(),
                               revisao_respondida_em = now()
                                              │
                                              ▼
                      ╔══ NOVO trg_notif_revisao_respondida ════════════════╗
                      ║  AFTER UPDATE OF revisao_respondida_em             ║
                      ║  net.http_post { evento: 'revisao_respondida' } ───╫──▶
                      ╚═════════════════════════════════════════════════════╝    │
                                                                                 ▼
                      ╔══ EF notificar-candidato (EDIÇÃO CIRÚRGICA) ═════════════╗
                      ║  EVENTOS_VALIDOS + EventoLedger + EVENTO_MAP             ║
                      ║  + EventoNotificacao + SUBJECTS + CORPOS + PREHEADERS    ║
                      ║  + montarDedupeKey + DadosEmail   (9 sítios)             ║
                      ║  CHECK notificacoes_enviadas_evento_check (10º, no BD)   ║
                      ╚══════════════════════════════════════════════════════════╝
                                              │
                                              ▼
                              ExplicacaoCandidatoPage (bloco de resultado)

── INVENTÁRIO (read-only, exceto ⚠) ─────────────────────────────────────────────
 pg_constraint / information_schema.columns ──▶ docs/compliance/pii-inventory.yaml
                                                       └─▶ pii-inventory.md (gerado)
 Management API /database/backups          ──▶ docs/compliance/backup-posture.md
 cron.job × repo grep                      ──▶ docs/compliance/cron-inventory.md
 grep ADD COLUMN IF NOT EXISTS             ──▶ docs/compliance/ddl-idiom-sweep.md
 SELECT … decisao_final (passivo)          ──▶ docs/compliance/art20-backlog.sql + .md
 ⚠ cron.schedule('ai-logs-retention-cleanup', …) NOT IN → NOT EXISTS  [DESTRUTIVO]
```

### Recommended Project Structure

```
docs/compliance/                      # PASTA NOVA — consumida pelas Phases 44/45
├── README.md                         # índice + data de coleta + como reproduzir
├── pii-inventory.yaml                # FONTE DE VERDADE machine-readable (INVENT-01)
├── pii-inventory.md                  # gerado do YAML — nunca editado à mão
├── backup-posture.md                 # INVENT-02 (fato datado + Storage sem backup)
├── cron-inventory.md                 # INVENT-03 (live × repo, origem por job)
├── ddl-idiom-sweep.md                # INVENT-04
├── art20-backlog.md                  # REVISAO-06 (resultado datado)
└── sql/
    ├── 01-pii-catalog.sql            # a query que gera o inventário
    ├── 02-cron-live.sql              # SELECT jobid,jobname,schedule,command FROM cron.job
    └── 03-art20-backlog.sql          # a consulta do passivo (REVISAO-06)

supabase/migrations/
└── 2026073…_p42_revisao_art20.sql    # colunas + CHECKs + RPCs + trigger + config SLA
supabase/migrations/
└── 2026073…_p42_evento_revisao.sql   # CHECK do vocabulário (pode ir junto — ver Pattern 1)
supabase/functions/notificar-rh/
├── index.ts · helpers.ts · __tests__/
supabase/tests/
└── p42_revisao_art20_smoke.sql       # gate-GUC + impersonação de 2 RHs

src/features/revisao/                 # feature nova (inventário na 42-UI-SPEC)
├── components/ hooks/ services/ schemas/ constants/
```

---

### Pattern 1 — O 5º evento: **nove** sítios de registro, quatro forçados pelo compilador

> **Esta é a parte mais perigosa da fase.** O CONTEXT nomeia dois sítios (`EVENTOS_VALIDOS` + CHECK). Existem nove no código + um no banco. O tipo `Record<EventoNotificacao, …>` transforma quatro deles em erros de compilação — os outros **falham em runtime, em produção, em silêncio**.

| # | Sítio | Arquivo:linha | Forçado pelo compilador? | O que quebra se esquecer |
|---|-------|---------------|--------------------------|--------------------------|
| 1 | `EVENTOS_VALIDOS` (`ReadonlySet<string>`) | `notificar-candidato/index.ts:65-70` | ❌ **NÃO** — `Set<string>` aceita qualquer string | `400 VALIDATION` — o e-mail nunca sai, e o `net.http_post` é at-most-once: **falha invisível** |
| 2 | `type EventoLedger` (union) | `notificar-candidato/helpers.ts:11` | ⚠ é a *fonte* das exigências 3 | — |
| 3 | `EVENTO_MAP: Record<EventoLedger, EventoNotificacao>` | `helpers.ts:14-19` | ✅ **SIM** | compile error |
| 4 | `montarDedupeKey` (if/else) | `helpers.ts:29-41` | ❌ **NÃO** | cai no `default` `${candidaturaId}:${e}` — que **é** a chave certa aqui; verificar, não presumir |
| 5 | `type EventoNotificacao` (union) | `_shared/email-config.ts:42-47` | ⚠ é a *fonte* das exigências 6/7/8 | — |
| 6 | `SUBJECTS: Record<EventoNotificacao, …>` | `_shared/email-templates.ts:161` | ✅ **SIM** | compile error |
| 7 | `CORPOS: Record<EventoNotificacao, …>` | `_shared/email-templates.ts:171` | ✅ **SIM** | compile error |
| 8 | `PREHEADERS: Record<EventoNotificacao, …>` | `_shared/email-templates.ts:188` | ✅ **SIM** | compile error |
| 9 | `interface DadosEmail` (+ campo do veredito) | `_shared/email-templates.ts:~64` | ❌ **NÃO** (campo opcional) | corpo genérico sem o veredito — **o W-01 de novo** |
| 10 | CHECK `notificacoes_enviadas_evento_check` | banco vivo; espelho em `20260721000001:77` | ❌ **NÃO** | `23514` no claim → `registrarFalha` → `status='falhou'` + retry queimando o cap 5 |

**O padrão de defesa que o repositório já usa e deve ser reusado:** `resolverDestinatario` (`email-config.ts:93`) faz `evento.replace(/[^a-z_]/g,'')` para produzir o `+label` do sink de teste. `revisao_respondida` passa nesse filtro sem alteração — verificado. Nada a mudar ali.

**O `deno check` do CI é o que torna 3/4/6/7/8 detectáveis antes do deploy:** o job `deno-test` roda com type-check **ON** e é **bloqueante** (`ci.yml`). Ou seja, os quatro sítios `Record<>` são gate real, não teoria.

**Anti-padrão a evitar:** adicionar o evento ao CHECK numa migration e ao código noutro commit. O CONTEXT exige "na mesma migration/deploy" — e a razão mecânica é o `net.http_post` at-most-once: um trigger que dispara contra uma EF que ainda rejeita o evento perde a notificação **sem erro em lugar nenhum**.

**Ordem de deploy obrigatória** (espelha a P39: `submit-candidatura` redeployada *antes* do apply): **EF primeiro (aceita o 5º evento), CHECK depois, trigger por último.** Uma EF que aceita um evento que ninguém envia é inerte; um trigger que envia um evento que ninguém aceita é perda silenciosa.

---

### Pattern 2 — Trigger + `pg_net` → Edge Function (o caminho vivo)

**What:** função `SECURITY DEFINER` `SET search_path = ''`, guard de transição, leitura do Vault com graceful-skip, `net.http_post` dentro de `BEGIN … EXCEPTION WHEN OTHERS THEN RAISE WARNING` (fail-open — o funil nunca quebra por falha de dispatch).

**When:** REVISAO-01 (`revisao_solicitada_em` NULL→NOT NULL) e REVISAO-04 (`revisao_respondida_em` NULL→NOT NULL).

**Precedente exato:** `20260726000001_p39_rewire_triggers_aposenta_n8n.sql:60-118` (`trg_notif_transicao`). O corpo é copiável quase verbatim — só mudam a tabela, o guard e a URL da EF.

**Precedente ainda mais direto — o ancestral droppado:** `trg_n8n_revisao_decisao` existiu em `20260706110005_sec03_n8n_serverside.sql:163-211`, com **exatamente** o guard `IF NOT (OLD.revisao_solicitada_em IS NULL AND NEW.revisao_solicitada_em IS NOT NULL) THEN RETURN NEW; END IF;` e o mesmo `AFTER UPDATE OF revisao_solicitada_em ON public.decisao_final`. Foi DROPado pela P39 (`20260726000001:47,53`). **REVISAO-01 não é trigger nova — é a re-criação de um trigger que existiu, apontada para `notificar-rh` em vez do n8n.** Isso reduz risco e deve ser dito no plano.

---

### Pattern 3 — RPC `SECURITY DEFINER` como write-path único e auditável

**What:** `SET search_path = ''`, guards em ordem (posse → alcançabilidade → estado), `RAISE EXCEPTION … USING errcode` com SQLSTATEs distintos por classe de recusa, `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE … TO authenticated`, `COMMENT` descrevendo o contrato.

**When:** `responder_revisao_decisao` (REVISAO-03/05) e `listar_revisoes_decisao` (REVISAO-02).

**Precedentes:** `solicitar_revisao_decisao` (`20260625100001:174-231`) é o mais próximo em forma; `rejeitar_candidatura` (`20260714100001:78`) e `salvar_revisao_redacao` (`20260623100004:44`) são os análogos de guardrail de justificativa.

**SQLSTATEs que o projeto já usa e que o `RevisaoError.code` da UI-SPEC deve mapear:**

| SQLSTATE | Significado no projeto | `RevisaoError.code` |
|----------|------------------------|---------------------|
| `42501` (`insufficient_privilege`) | guard de autorização — usado por `solicitar_revisao_decisao:194`, `pontuar_cognitivo`, `pontuar_sjt` | `GUARD_DECISOR` |
| `22023` (`invalid_parameter_value`) | validação de payload — usado por `pontuar_sjt` (dedup, bateria incompleta) | `VALIDACAO` |
| `no_data_found` | alcançabilidade — `solicitar_revisao_decisao:204` | `VALIDACAO` |

⚠ **`42501` é usado para dois casos distintos** (não é decisor × não é RH/não tem escopo na vaga). A UI-SPEC exige que a recusa do guard tenha copy própria e **sem retry oferecido**. Recomendação: discriminar pela **mensagem** (`SQLERRM LIKE '%decisor%'`), no mesmo idioma que os smokes do projeto já usam para distinguir `22023 duplicada` de `22023 bateria incompleta` (`funil01_pontuar_sjt_smokes.sql:149,171`). Um SQLSTATE customizado (`P0001`+`MESSAGE`) também serve; o que **não** serve é a UI adivinhar.

---

### Pattern 4 — Leitura da fila: por que **tem** de ser RPC, e não `.select()`

Três policies vivas se combinam de um jeito que torna a query cliente impossível:

| Tabela | Policy viva | `administrador` | `rh` (recrutador) |
|--------|-------------|-----------------|-------------------|
| `usuarios_rh` | `usuarios_rh_admin_select` (`20260713000001:109-113`) via `is_active_rh_admin()` | roster inteiro | **só a própria linha** |
| `candidaturas` | `rh_le_candidaturas` (`20260709000002:39-46`) | tudo | **só `vagas.created_by = auth.uid()`**, `deleted_at IS NULL`, `is_rascunho = false` |
| `decisao_final` | `rh_le_decisao_final` (`20260607000003:57-60`) | tudo | **tudo** — sem escopo por vaga |

Consequências concretas de ignorar isso:

1. **Invariante #4 da UI-SPEC morre por RLS.** "Quem decidiu" → `usuarios_rh.nome_completo` é ilegível para um recrutador → 100% das linhas viram `Não identificado`. Não é bug de UI; é o RLS funcionando.
2. **Linhas-fantasma.** Um recrutador lê **todas** as `decisao_final` mas só **algumas** `candidaturas`. Um `.select('…, candidaturas(…)')` devolveria linhas com candidatura `null` — e a mera existência/timestamp da revisão de uma vaga alheia já é vazamento lateral.
3. **A assimetria é pré-existente e não é desta fase corrigir.** O plano deve **re-implementar o escopo dentro do DEFINER** (o DEFINER bypassa RLS — o escopo tem de ser explícito) e registrar a assimetria como achado, não "consertar" `rh_le_decisao_final` de passagem.

**Recomendação:** um único `listar_revisoes_decisao(p_incluir_respondidos boolean DEFAULT false)` `SECURITY DEFINER STABLE`, `RETURNS TABLE(...)` com colunas nomeadas (nunca `RETURNS SETOF decisao_final` — isso é `select('*')` por outro nome, a classe de vulnerabilidade nº 1 do projeto), `LIMIT 200` server-side, `ORDER BY revisao_solicitada_em ASC`, escopo `administrador → tudo` / `rh → join em vagas.created_by`. Um segundo RPC escalar (ou a mesma função com um `count`) alimenta o contador da sidebar.

---

### Pattern 5 — Resolução de destinatários RH: **duas taxonomias de role**

Este é um erro de plano à espera de acontecer. O CONTEXT diz "usuarios_rh ativos com role `rh`/`administrador`". Mas:

| Camada | Valores possíveis | Fonte |
|--------|-------------------|-------|
| **Coluna `usuarios_rh.role`** | `administrador` · `gerente` · `recrutador` · `visualizador` | CHECK `usuarios_rh_role_check` (`docs/sql/sql/03-tabela-usuarios-rh.sql:52-53`) |
| **JWT `app_metadata.role`** | `administrador` · `rh` · `candidato` | `custom_access_token_hook` (`20260420000002:53`) mapeia `recrutador → rh` |

**`usuarios_rh.role` nunca vale `'rh'`.** Uma query `WHERE role IN ('rh','administrador')` retorna **apenas os administradores** e descarta silenciosamente todo recrutador — e o quadro atual é 4 admins + 1 recrutador (STATE.md). O predicado correto, espelhando o filtro do próprio hook:

```sql
SELECT user_id, nome_completo, email
  FROM public.usuarios_rh
 WHERE ativo = true
   AND deleted_at IS NULL
   AND role IN ('administrador', 'recrutador');
```

`ativo = true AND deleted_at IS NULL` é o filtro **literal** do hook (`20260420000002:45-48`) e de `is_active_rh_admin()` (`20260713000001:69-73`) e de `20260629190949:99-111`. Copiar esse par é convenção do repo, não escolha.

⚠ **Nota adjacente:** `gerente` e `visualizador` caem no `ELSE rh_role_db` do hook e emitem `app_metadata.role = 'gerente'` / `'visualizador'`, que **não casam com policy nenhuma**. Se existirem linhas com esses roles em PROD, essas pessoas têm sessão válida e zero acesso. Fora do escopo — registrar como achado do inventário.

---

### Pattern 6 — Migration com corpo `$$`: o workaround do CLAUDE.md

Toda migration desta fase carrega PL/pgSQL `$$` adjacente a `COMMENT`/`REVOKE`/`GRANT` → **vai bater `42601`** no pooler. Caminho estabelecido e obrigatório: **Supabase MCP `apply_migration`** pelo orquestrador, seguido de **reconcile do ledger** (`schema_migrations.version` → prefixo do arquivo) — exatamente P37-04 / P39-04 / P41-05. Sem wrapper `BEGIN;/COMMIT;`. `db push` permanece proibido (STATE.md: sem CLI linkado).

### Anti-Patterns to Avoid

- **`RETURNS SETOF decisao_final`** num RPC de leitura — é `select('*')` disfarçado e arrasta `justificativa` (texto ≥50 do recrutador, potencialmente com PII digitada — BD-9 em aberto) para a fila.
- **Adicionar coluna com `ADD COLUMN IF NOT EXISTS`** nesta fase — proibido pelo CONTEXT e autocontraditório com INVENT-04.
- **Copiar a RLS de `config_sla_etapa` verbatim** — ver Pitfall 3.
- **Relaxar `rh_le_decisao_final` para vaga-scoped "de passagem"** — mudança de superfície de autorização fora de escopo; registrar, não fazer.
- **Deploy do trigger antes da EF** — perda silenciosa (`net.http_post` at-most-once).
- **`badge={0}`** no `RHSidebar` — ver Pitfall 5.
- **Rotular a rota com `ProtectedAdminRoute`** — não é o gate vizinho; ver Pitfall 4.

---

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|---------------|------|---------|
| Autenticar como dois usuários RH distintos para provar o guard | Harness novo de auth, GoTrue programático, contas descartáveis | `SET ROLE authenticated` + `set_config('request.jwt.claims', …)` — `supabase/tests/funil01_pontuar_sjt_smokes.sql:134-141` | Harness vivo, provado em PROD, precedente citado na STATE.md ("impersonacao REAL … nunca por consulta a pg_policies") |
| Gate de tsc no pre-commit | Lógica nova de baseline | As 6 linhas do step "Type-check (frozen tsc baseline 104)" do `ci.yml` | Já implementado e mantido desde a Phase 5, re-pinado 290→133→107→104 |
| Idempotência do e-mail ao RH | Tabela nova, lock, flag | `notificacoes_enviadas` + `UNIQUE(dedupe_key)` + claim-before-send | Travado no CONTEXT; a alternativa cria o único caminho de envio sem trilha |
| Backoff/retry do e-mail ao RH | Retry próprio na EF | `computeProximaTentativa` + `varrer_retry_notificacoes` (`*/15`) | Já vivo; a EF nova só precisa gravar `falhou` + `proxima_tentativa_em` no mesmo formato |
| Sandbox de e-mail em teste | Endereço fixo | `resolverModo` + `resolverDestinatario` + `exigirSinkTeste` (`_shared/email-config.ts`) | Fail-safe DELIV-03 provado; a EF nova **tem** de importar isso, não reimplementar |
| Escape de HTML no template | `replace` ad-hoc | `escapeHtml` (`email-templates.ts:55`) | — |
| Estados de loading/erro/vazio da fila | Composição própria | `AsyncState` com `copy={{…}}` | Precedência travada `isLoading → slow → isError → isEmpty → children` |
| Contagem de dias corridos | Aritmética de `Date` | `differenceInCalendarDays` + clamp em 0 (idioma de `diasNaEtapa`) | Fuso/DST |
| Predicado anti-NULL do cron | `AND x IS NOT NULL` costurado ao `NOT IN` | `NOT EXISTS (… AND l.id = ANY(d.ai_call_log_ids))` | `NOT EXISTS` é imune a NULL por construção; a variante remendada continua frágil a uma mudança futura |

**Key insight:** praticamente tudo que esta fase "precisa construir" já existe em outra forma neste repositório. O trabalho real é **de ligação e de prova**, não de invenção — e cada peça hand-rolled aqui é uma peça sem os 6 milestones de endurecimento que a versão viva já levou.

---

## Runtime State Inventory

> Fase de inventário — esta seção **é** deliverable parcial. Tudo abaixo foi apurado no repositório; o que exige o banco vivo está marcado ⏳ e é checkpoint do orquestrador (este agente **não** tem os tools MCP do Supabase).

| Categoria | Itens encontrados | Ação requerida |
|-----------|-------------------|----------------|
| **Stored data** | `decisao_final` com `revisao_solicitada_em` preenchido e `revisao_resultado IS NULL` = o **passivo Art. 20 vivo** (REVISAO-06). ⏳ contagem a medir | Consulta datada em `docs/compliance/`, **antes de qualquer tela** |
| | `ai_call_logs` = **0 linhas** e `candidate_ai_decisions` = **0 linhas** em 2026-07-29 (FK-AUDIT-LIVE). ⏳ **re-medir** — é o blast radius do INVENT-05 | Fato datado registrado **antes** do apply |
| | `notificacoes_enviadas` — ledger que o e-mail ao RH passa a alimentar. ⏳ contagem | Nenhuma migração de dado |
| **Live service config** | **3 `cron.job` ativos**, todos com origem rastreável no repositório (INVENT-03 **fechado pelo lado do repo**): `ai-cost-aggregation` `30 1 * * *` → `20260609000003:36`; `ai-logs-retention-cleanup` `0 2 * * *` → `20260609000003:70`; `notif-retry-sweep` `*/15 * * * *` → `20260727000001:223` | ⏳ Diffar o `command` **vivo** contra o arquivo, byte a byte. Qualquer 4º job = achado bloqueante |
| | **4 `cron.schedule` COMENTADOS** em `docs/sql/`: `limpar-sessoes` (`01-setup-inicial.sql:82`, `06-tabela-sessoes.sql:148`) e `limpar-logs` (`01-setup-inicial.sql:103`, `07-tabela-logs.sql:149`) — compliance theater (Pitfall 15 da pesquisa) | Registrar no `cron-inventory.md`; **não** ativar |
| | Resend: domínio `rh.beautysmile.com.br` verificado; webhook registrado; `NOTIFICACOES_MODO='teste'` ativo | Confirmar antes de esperar e-mail em caixa real |
| | Vault: `resend_api_key`, `resend_webhook_secret`, `project_url`, `edge_invoke_key` provisionados; `n8n_webhook_base` **removido** | Nenhuma. O trigger novo usa `project_url` + `edge_invoke_key` |
| | ⏳ n8n cloud (`fernandocosta.app.n8n.cloud`) — workflow `revisao-decisao` pode continuar publicada, órfã | Fora de escopo (todo `m7-cleanup-n8n-cloud`), mas relevante: o trigger que a chamava está morto |
| **OS-registered state** | Nenhum. Sem Task Scheduler, sem pm2, sem launchd, sem systemd — verificado por ausência de qualquer referência no repositório | Nenhuma |
| **Secrets / env vars** | Nenhum segredo novo. `notificar-rh` usa o mesmo `edge_invoke_key`/`resend_api_key` (via `ler_resend_api_key()`) e o mesmo `NOTIFICACOES_MODO` | ⚠ `NOTIFICACOES_MODO` é env **por Edge Function** — a EF nova **precisa** recebê-la explicitamente; ausência ⇒ `teste` (fail-safe, correto) |
| **Build artifacts** | `database.types.ts` fica stale ao adicionar colunas/RPCs. Precedente P36/36-04: **não** regenerar se nenhum client tipado consome — mas aqui `useFilaRevisoes`/`useResponderRevisao` **consomem**, então regenerar (`npm run db:types`) é obrigatório | ⚠ `db:types` usa `>` que **trunca antes de executar**. Precedente P37-05: **provar contra arquivo temporário** antes de apontar ao arquivo git-trackeado |

### INVENT-04 — varredura `ADD COLUMN IF NOT EXISTS` (**executada, completa**)

**16 ocorrências em 8 arquivos.** Nenhuma outra fonte (`docs/sql/` não usa o idioma).

| Classe | Ocorrências | Risco | Detalhe |
|--------|-------------|-------|---------|
| **A — cláusula FK na mesma sentença** | **1**: `20260421000001:193` — `autorizacoes.user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL` | ⚠ Aparente, **não** materializado | PROD tem `autorizacoes.user_id → auth.users` = **`SET NULL`** (FK-AUDIT-LIVE §"Onde PII sobrevive"), ou seja **igual ao declarado**. A cláusula NÃO foi silenciada |
| **B — `NOT NULL DEFAULT` (silenciável)** | **6**: `20260421000001:190` · `20260607010002:36,37` · `20260624000001:52` · `20260706110008:49` · `20260608000001:64` | Médio | Se a coluna já existia sem o default, o valor default e o `NOT NULL` nunca foram aplicados → linhas legadas com NULL numa coluna que o tipo diz ser não-nula |
| **C — coluna nullable simples** | **9** | Baixo | Sem cláusula a silenciar |

**Escopo ⏳ da verificação viva:** para as 7 linhas das classes A+B, comparar `information_schema.columns` (`is_nullable`, `column_default`) e `pg_constraint` contra o declarado. Sete verificações, não sessenta.

### 🔴 Correção obrigatória à semente do INVENT-01 (`FK-AUDIT-LIVE.md`)

O `FK-AUDIT-LIVE.md` é a semente mandatória do INVENT-01 e **contém três erros encadeados** na sua tabela "Drift repo → PROD confirmado". Sem esta correção o INVENT-04 sai com a manchete errada.

| Afirmação do FK-AUDIT-LIVE | Achado verificado | Evidência |
|---|---|---|
| "`candidatos.user_id` — Repositório diz `ON DELETE SET NULL` (`20260421000001:193`)" | **`20260421000001:193` altera `public.autorizacoes`, não `public.candidatos`** | `20260421000001:189` — `ALTER TABLE public.autorizacoes` |
| "A migration usou `ADD COLUMN IF NOT EXISTS` … a FK nunca foi alterada" | **Não há nenhum `ADD COLUMN … user_id` sobre `candidatos` em lugar nenhum** do repositório | `grep -rn "ALTER TABLE public.candidatos" supabase/migrations docs/sql` → 3 hits, nenhum toca `user_id` |
| "O repo descreve uma semântica que o banco nunca teve" | **O repositório declara exatamente o que PROD tem.** `docs/sql/sql/02-tabela-candidatos.sql:14`: `user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE` | ibid. |

**O que isso muda, e por que é achado maior, não menor:**

1. **Não existe drift de FK em `candidatos.user_id`.** Repo e PROD concordam: `CASCADE`. A consequência operacional que o FK-AUDIT-LIVE deriva (o `deleteUser` cascateia e bate 23503) **permanece verdadeira** — ela vem do `pg_constraint`, não da citação. Só a *causa* estava errada.
2. **A causa real é estrutural e pior:** o DDL base de `candidatos`, `usuarios_rh`, `vagas`, `candidaturas` e ~40 tabelas legadas vive em **`docs/sql/sql/*.sql`** — 49 scripts que **nunca passaram pelo ledger `schema_migrations`**, usam `CREATE TABLE IF NOT EXISTS` e não têm reconciliação. Qualquer inventário que leia só `supabase/migrations/` está lendo **um fragmento do schema**. Isso conecta-se diretamente ao débito aberto `processo-origem-do-drift-desconhecida`.
3. **INVENT-04 continua valendo** — o idioma realmente silencia cláusulas (comportamento documentado do Postgres: se a coluna existe, o subcomando inteiro é pulado, constraints incluídas). Só que o que a varredura encontra são **6 riscos de classe B**, não uma FK silenciada.
4. **A recomendação "grep all migrations for the idiom" deve virar "grep `supabase/migrations/` **e** `docs/sql/`, e inventariar `docs/sql/` como fonte de schema não-versionada".**

**Nada foi encontrado nas demais categorias:** OS-registered state — **nenhum**, verificado por ausência total de referências a agendadores de SO no repositório.

---

## Common Pitfalls

### Pitfall 1 — O 5º evento registrado em menos de nove lugares
**O que dá errado:** `EVENTOS_VALIDOS` é `ReadonlySet<string>`, não `ReadonlySet<EventoLedger>` — passa no compilador com o evento faltando. O resultado é `400 VALIDATION` numa chamada `net.http_post` que é **at-most-once**: ninguém recebe erro, ninguém vê log, o candidato nunca é notificado.
**Por que acontece:** o CONTEXT nomeia dois sítios; o compilador cobre quatro; sobram cinco.
**Como evitar:** a tabela do §Pattern 1 vira checklist de tarefa. Complemento barato e definitivo — um teste Deno que assere `EVENTOS_VALIDOS` ⟷ chaves de `EVENTO_MAP` (ver §Validation Architecture, T-42-V3).
**Sinais de alerta:** um plano que fala em "2 lugares"; um `EVENTOS_VALIDOS` sem teste de paridade.

### Pitfall 2 — A fila lida por PostgREST devolve `Não identificado` em toda linha
**O que dá errado:** `usuarios_rh` é admin-only (SEG-02). Um recrutador vê só a própria linha. Nomes somem, e linhas-fantasma aparecem porque `decisao_final` não é vaga-scoped enquanto `candidaturas` é.
**Por que acontece:** a UI-SPEC descreve `revisaoService.ts` fazendo "leituras por allowlist explícita", o que sugere `.select()`.
**Como evitar:** RPC `SECURITY DEFINER` (§Pattern 4), com o escopo `administrador`/`rh` re-implementado **dentro** dela.
**Sinais de alerta:** qualquer `.from('usuarios_rh')` no `src/features/revisao/`.

### Pitfall 3 — Copiar a RLS de `config_sla_etapa` põe o limiar ao alcance de `anon`
**O que dá errado:** `config_sla_etapa` tem **uma** policy: `CREATE POLICY sla_public_read … FOR SELECT TO anon, authenticated USING (true)` (`20260721000002:74-76`). Copiada, a tabela de limiar do Art. 20 fica legível sem autenticação — e a invariante #1 da UI-SPEC ("o SLA é interno") cai por baixo da UI, onde nenhuma revisão de front pegaria.
**Por que acontece:** a P37 construiu aquela tabela para o painel do candidato; a leitura pública era **o requisito**, não descuido. O próprio arquivo avisa: *"⚠ INVARIANTE PARA ALTERAÇÕES FUTURAS: esta tabela é config estática non-PII. Adicionar aqui qualquer coluna com dado de pessoa vazaria por `anon`."*
**Como evitar:** reusar o **padrão** (tabela de config + seed + `ON CONFLICT DO NOTHING` + sem policy de escrita), **nunca a policy**. A policy correta:
```sql
CREATE POLICY config_revisao_rh_read ON public.config_sla_revisao
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
```
(o idioma de `rh_le_decisao_final`. Se o limiar já vier resolvido dentro do `listar_revisoes_decisao`, a policy pode até ser omitida — default-deny —, o que é ainda mais forte: a ausência de policy nunca abre acesso, decisão travada no 37-CONTEXT.)
**Correção adjacente ao CONTEXT:** o CONTEXT descreve `config_sla_etapa` como tendo *"trigger de updated_at"*. **Não tem.** A coluna `atualizado_em timestamptz NOT NULL DEFAULT now()` existe, mas nenhum trigger a mantém (`20260721000002:56-62` — a tabela inteira tem 5 colunas e zero triggers). Se `atualizado_em` precisar refletir edições, o trigger é trabalho novo — não herdado.
**Sinais de alerta:** `TO anon` em qualquer migration desta fase.

### Pitfall 4 — Gate de rota errado
**O que dá errado:** a UI-SPEC diz que `/rh/revisoes` deve usar `ProtectedAdminRoute`, "mesmo gate de `/rh/relatorios`". `/rh/relatorios` usa `<RoleGuard role={['rh','administrador']}>` (`src/router/routes.tsx:423-430`). Aplicar um gate admin-only excluiria todo recrutador da fila — a persona que a UI-SPEC declara como primária.
**Como evitar:** `<RoleGuard role={['rh','administrador']}>`, idêntico às rotas RH vizinhas. O gate real é o escopo dentro do RPC.

### Pitfall 5 — `badge={0}` renderiza um "0" literal na sidebar
**O que dá errado:** `RHSidebar.tsx:241` renderiza `{item.badge && item.badge > 0 && (<Badge>…)}`. Com `badge={0}`, a expressão avalia para `0` — e React **renderiza** `0` como texto. A UI-SPEC exige "Zero pendentes → badge oculto por completo. Nunca renderiza `0`".
**Como evitar:** o consumidor passa `undefined`, nunca `0`: `badge={count && count > 0 ? count : undefined}`. Mesmo tratamento para o estado de loading e de erro (ambos ⇒ `undefined`).
**Sinais de alerta:** `badge={data?.count ?? 0}`.

### Pitfall 6 — Derivar o inventário PII do repositório
**O que dá errado:** `supabase/migrations/` **não contém** o DDL base de ~40 tabelas legadas (vivem em `docs/sql/sql/`, fora do ledger). Um inventário derivado das migrations perde `candidatos`, `usuarios_rh`, `vagas`, `candidaturas` — as tabelas com mais PII do sistema.
**Como evitar:** o inventário sai de `information_schema.columns` + `pg_constraint` **vivos** (§Code Examples E7), com o FK-AUDIT-LIVE como semente de *classificação*, não de *enumeração* — e com a correção de citação acima aplicada.

### Pitfall 7 — Corrigir o `NOT IN` e não medir o antes
**O que dá errado:** o efeito da correção é fazer um `DELETE` que hoje apaga zero passar a apagar de verdade. Com `ai_call_logs` em 0 linhas o blast radius é nulo — mas essa contagem é de **2026-07-29** e a P23 corrigiu a causa do logging quebrado. Se o logging voltou a funcionar entre a pesquisa e o apply, o primeiro run pós-fix apaga o acumulado histórico de uma vez.
**Como evitar:** contagem **imediatamente antes** do apply, pela mesma query, e um dry-run `SELECT count(*)` com o predicado **novo** para saber quantas linhas o fix passa a alcançar. Se > 0, isso vira decisão do operador, não passo automático.
**Sinais de alerta:** o plano cita a contagem "0" de 29/07 como se fosse corrente.

### Pitfall 8 — Justificativa do recrutador vazando na fila
**O que dá errado:** `decisao_final.justificativa` é o texto ≥50 caracteres escrito à mão pelo recrutador. **BD-9 está explicitamente em aberto** (SUMMARY: "redigir ou preservar a justificativa … pode conter PII digitada à mão"). Um `RETURNS SETOF decisao_final` a levaria para a tela.
**Como evitar:** o RPC projeta colunas nomeadas. `justificativa` **fora** da fila (a UI-SPEC lista 7 colunas e nenhuma é a justificativa original).

### Pitfall 9 — Trigger duplo no `revisao_respondida_em`
**O que dá errado:** se `responder_revisao_decisao` fizer o `UPDATE` e o trigger `AFTER UPDATE OF revisao_respondida_em` disparar, mas o RPC também tentar despachar diretamente, o candidato recebe dois e-mails — ou nenhum, se ambos colidirem no `dedupe_key` de formas diferentes.
**Como evitar:** **um** despachante. Recomendação: o trigger (espelha P39, mantém o RPC puro e o despacho fora da transação de escrita). O RPC nunca chama `net.http_post`.

### Pitfall 10 — `db:types` truncando o arquivo
**O que dá errado:** `npm run db:types` usa `>`, que **trunca antes** de o comando rodar. "Rodar pra ver se funciona" destrói o arquivo.
**Como evitar:** precedente P37-05 — gerar para arquivo temporário, diffar, só então apontar ao arquivo trackeado. Esperar **zero deleções**; deleções = drift lateral.

---

## Code Examples

### E1 — Trigger de notificação ao RH (REVISAO-01), sobre o esqueleto vivo

```sql
-- Fonte do guard de transição: 20260706110005_sec03_n8n_serverside.sql:174-176 (o
-- trg_n8n_revisao_decisao, DROPado pela P39). Fonte do dispatch: 20260726000001:82-104.
CREATE OR REPLACE FUNCTION public.trg_notif_revisao_solicitada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Só a transição NULL -> NOT NULL (idempotente com o RPC own-row, que nunca sobrescreve).
  IF NOT (OLD.revisao_solicitada_em IS NULL AND NEW.revisao_solicitada_em IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- graceful-skip: segredo ausente nunca quebra o pedido do candidato
  END IF;

  BEGIN
    PERFORM net.http_post(
      url     := v_project_url || '/functions/v1/notificar-rh',
      headers := jsonb_build_object('Content-Type','application/json',
                                    'Authorization','Bearer ' || v_invoke_key),
      body    := jsonb_build_object('evento','revisao_solicitada',
                                    'candidatura_id', NEW.candidatura_id)  -- ids-only, zero PII
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_revisao_solicitada: dispatch falhou (%: %) — pedido intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_notif_revisao_solicitada() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_notif_revisao_solicitada ON public.decisao_final;
CREATE TRIGGER trg_notif_revisao_solicitada
  AFTER UPDATE OF revisao_solicitada_em ON public.decisao_final
  FOR EACH ROW EXECUTE FUNCTION public.trg_notif_revisao_solicitada();
```

### E2 — Os sítios do 5º evento (diff exato)

```ts
// supabase/functions/notificar-candidato/index.ts:65  — ❌ NÃO forçado pelo compilador
const EVENTOS_VALIDOS: ReadonlySet<string> = new Set([
  "confirmacao", "avanco", "convite", "decisao",
  "revisao_respondida",                                   // ← 1
]);

// supabase/functions/notificar-candidato/helpers.ts:11
export type EventoLedger =
  | "confirmacao" | "avanco" | "convite" | "decisao"
  | "revisao_respondida";                                 // ← 2 (força o 3)

// helpers.ts:14 — ✅ Record<EventoLedger,…> → compile error se faltar
const EVENTO_MAP: Record<EventoLedger, EventoNotificacao> = {
  confirmacao: "candidatura_recebida", avanco: "avaliacao_liberada",
  convite: "convite_entrevista", decisao: "decisao_final",
  revisao_respondida: "revisao_respondida",               // ← 3
};

// helpers.ts:29 montarDedupeKey — ❌ if/else. O default `${candidaturaId}:${e}` JÁ é a
// chave correta: decisao_final.candidatura_id é UNIQUE (20260607000003:39) ⇒ no máximo
// uma revisão por candidatura. VERIFICAR, não presumir — e cobrir por teste (T-42-V4).

// supabase/functions/_shared/email-config.ts:42
export type EventoNotificacao =
  | 'candidatura_recebida' | 'avaliacao_liberada' | 'convite_entrevista' | 'decisao_final'
  | 'revisao_respondida';                                 // ← 5 (força 6/7/8)

// supabase/functions/_shared/email-templates.ts:161 / :171 / :188 — ✅ os três Record<>
export const SUBJECTS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  /* … */ revisao_respondida: (d) => `Resposta à sua solicitação de revisão — ${d.tituloVaga}`, // ← 6
};
const CORPOS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  /* … */ revisao_respondida: corpoRevisaoRespondida,                                          // ← 7
};
const PREHEADERS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  /* … */ revisao_respondida: (d) => d.vereditoRevisao === 'revertida'                          // ← 8
    ? "Sua solicitação de revisão foi respondida."
    : "Sua solicitação de revisão foi respondida.",
  // ↑ W-01: se o preheader NÃO ramificar, dizer isso explicitamente no comentário e cobrir
  //   por teste. O defeito W-01 foi um preheader que ficou literal quando subject e corpo
  //   ramificaram. Ramificar ou não é escolha — deixar sem decisão é o defeito.
};

// email-templates.ts — DadosEmail ganha o campo do veredito                        // ← 9
export interface DadosEmail { /* … */ vereditoRevisao?: 'mantida' | 'revertida'; }
```

```sql
-- ← 10 · o CHECK vivo. Nome load-bearing (20260721000001:72-77).
ALTER TABLE public.notificacoes_enviadas
  DROP CONSTRAINT notificacoes_enviadas_evento_check;
ALTER TABLE public.notificacoes_enviadas
  ADD CONSTRAINT notificacoes_enviadas_evento_check
  CHECK (evento IN ('confirmacao','avanco','convite','decisao','revisao_respondida'));
```
> ⚠ O arquivo `20260721000001` é uma **reconstrução por engenharia reversa, marcada `⛔ NÃO APLICAR`** (o ledger já contém a version). A migration nova **altera** a constraint viva; o arquivo antigo é atualizado só como espelho documental, com nota.

### E3 — `responder_revisao_decisao` (REVISAO-03/05): ordem dos guards

```sql
CREATE OR REPLACE FUNCTION public.responder_revisao_decisao(
  p_candidatura_id uuid,
  p_veredito       text,          -- 'mantida' | 'revertida'
  p_justificativa  text
) RETURNS public.decisao_final
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_row public.decisao_final; v_uid uuid := auth.uid();
BEGIN
  -- (1) É RH/admin? (o DEFINER bypassa RLS — a autorização tem de ser explícita aqui)
  IF (select auth.jwt() #>> '{app_metadata,role}') NOT IN ('rh','administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT * INTO v_row FROM public.decisao_final WHERE candidatura_id = p_candidatura_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'decisao inexistente' USING errcode = 'no_data_found';
  END IF;

  -- (2) Alcançabilidade: só há o que responder se houver pedido.
  IF v_row.revisao_solicitada_em IS NULL THEN
    RAISE EXCEPTION 'sem pedido de revisao para esta decisao' USING errcode = '22023';
  END IF;

  -- (3) GUARD REVISAO-05 — ABSOLUTO. Sem exceção de admin, sem fallback de "só 1 RH".
  --     Mensagem discriminável ('decisor') porque 42501 também cobre "não é RH".
  IF v_uid = v_row.por_usuario THEN
    RAISE EXCEPTION 'quem registrou a decisao nao pode responder a revisao dela (decisor)'
      USING errcode = '42501';
  END IF;

  -- (4) Idempotência: uma resposta, uma vez.
  IF v_row.revisao_respondida_em IS NOT NULL THEN
    RAISE EXCEPTION 'revisao ja respondida' USING errcode = '22023';
  END IF;

  -- (5) Guardrail de substância, espelhando decisao_final.justificativa (>= 50).
  IF p_veredito NOT IN ('mantida','revertida') THEN
    RAISE EXCEPTION 'veredito invalido' USING errcode = '22023';
  END IF;
  IF length(btrim(coalesce(p_justificativa,''))) < 50 THEN
    RAISE EXCEPTION 'justificativa precisa de ao menos 50 caracteres' USING errcode = '22023';
  END IF;

  UPDATE public.decisao_final
     SET revisao_veredito       = p_veredito,
         revisao_resultado      = p_justificativa,
         revisao_por_usuario    = v_uid,
         revisao_respondida_em  = now()
   WHERE candidatura_id = p_candidatura_id
   RETURNING * INTO v_row;

  RETURN v_row;   -- readback (idioma de solicitar_revisao_decisao)
END;
$$;

REVOKE ALL ON FUNCTION public.responder_revisao_decisao(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_revisao_decisao(uuid,text,text) TO authenticated;
```
> A ordem importa: **(3) antes de (4)** faz o decisor receber a recusa do guard mesmo numa revisão já respondida — a mensagem honesta. E o CHECK de coluna (`revisao_veredito IN ('mantida','revertida')`) fica **também** na tabela: guard no RPC protege o caminho da aplicação; CHECK protege contra qualquer `service_role`.

### E4 — Prova do guard com dois RHs impersonados (REVISAO-05)

Idioma verbatim de `supabase/tests/funil01_pontuar_sjt_smokes.sql:134-141`. **Uma única chamada `execute_sql`** — `set_config(..., false)` é escopado à sessão (lição da P41-05).

```sql
-- supabase/tests/p42_revisao_art20_smoke.sql (trecho)
-- Fixture: decisao_final com por_usuario = :decisor e revisao_solicitada_em preenchida.
-- :decisor e :outro_rh = dois auth.users REAIS e DISTINTOS de usuarios_rh ativos.

-- (a) O DECISOR tenta responder → tem de ser RECUSADO com 42501 '…(decisor)'
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke42.decisor'), 'role','authenticated',
    'app_metadata', jsonb_build_object('role','administrador'))::text, false);
  BEGIN
    PERFORM public.responder_revisao_decisao(
      current_setting('smoke42.cand')::uuid, 'mantida', repeat('x', 60));
    RAISE EXCEPTION 'P42 FAIL (a): o DECISOR conseguiu responder a propria revisao';
  EXCEPTION WHEN sqlstate '42501' THEN
    IF SQLERRM LIKE '%decisor%' THEN
      RAISE NOTICE 'PASS (a): decisor barrado pelo servidor (42501)';
    ELSE RAISE EXCEPTION 'P42 FAIL (a): 42501 porem mensagem inesperada: %', SQLERRM; END IF;
  END;
END $$;

-- (b) OUTRO RH responde → tem de SUCEDER, e gravar revisao_por_usuario = :outro_rh
SET ROLE authenticated;
DO $$
DECLARE v public.decisao_final;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke42.outro'), 'role','authenticated',
    'app_metadata', jsonb_build_object('role','administrador'))::text, false);
  v := public.responder_revisao_decisao(
         current_setting('smoke42.cand')::uuid, 'mantida', repeat('y', 60));
  IF v.revisao_por_usuario::text IS DISTINCT FROM current_setting('smoke42.outro') THEN
    RAISE EXCEPTION 'P42 FAIL (b): revisao_por_usuario nao gravou o revisor';
  END IF;
  IF v.revisao_respondida_em IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (b): revisao_respondida_em nao gravada';
  END IF;
  RAISE NOTICE 'PASS (b): outro RH respondeu; autoria e timestamp gravados';
END $$;

-- (c) Asserção NEGATIVA: nenhuma outra linha de decisao_final foi tocada.
-- (d) Gate-GUC: contador acumulado; falha alto se != esperado (idioma p37/p41).
RESET ROLE;
```

**O que esta prova cobre e o que não cobre — dizer isto no VERIFICATION.md.**
Cobre: `auth.uid()` real dentro do RPC, o guard, o SQLSTATE, a autoria gravada, e a recusa por **tentativa real**. Não cobre: a verificação de assinatura JWT do GoTrue/PostgREST (a claim é injetada na sessão, não assinada). Como o guard lê `auth.uid()` — e `auth.uid()` **é** `request.jwt.claims->>'sub'` — o que precisa ser provado está integralmente provado. É o mesmo critério que a STATE.md registra para o candidato-DENY do LEDGER-03.
**Ambiente:** rodar contra PROD é seguro (fixture criada e removida, precedente P41-05 T3) **desde que** a fixture use as contas de teste registradas (`e2e.admin@beautysmile.com.br`, recrutador `fba9bc0f-…`) e a linha seja limpa ao fim. Alternativa mais fria: Postgres 17 descartável com as migrations aplicadas (precedente P37-02).

### E5 — INVENT-05: medir, corrigir, medir

```sql
-- (1) FATO DATADO — ANTES de qualquer apply. Blast radius pelo predicado ATUAL e pelo NOVO.
SELECT
  (SELECT count(*) FROM public.ai_call_logs)                                AS total_logs,
  (SELECT count(*) FROM public.candidate_ai_decisions)                      AS total_decisions,
  (SELECT count(*) FROM public.candidate_ai_decisions
    WHERE ai_call_log_ids @> ARRAY[NULL]::uuid[])                           AS decisions_com_null_no_array,
  -- alcance do predicado VIVO (NOT IN) — deve ser 0 se o bug estiver ativo
  (SELECT count(*) FROM public.ai_call_logs l
    WHERE l.retain_until < now()
      AND l.id NOT IN (SELECT unnest(ai_call_log_ids) FROM public.candidate_ai_decisions
                        WHERE status IN ('candidate_review_requested','human_reviewing'))) AS alcance_atual,
  -- alcance do predicado CORRIGIDO (NOT EXISTS) — o delta é o blast radius real do fix
  (SELECT count(*) FROM public.ai_call_logs l
    WHERE l.retain_until < now()
      AND NOT EXISTS (SELECT 1 FROM public.candidate_ai_decisions d
                       WHERE d.status IN ('candidate_review_requested','human_reviewing')
                         AND l.id = ANY(d.ai_call_log_ids)))                AS alcance_corrigido;

-- (2) O FIX. Mesmo jobname ⇒ cron.schedule substitui em lugar. Guard de unschedule
--     é o idioma do 20260727000001:220-221.
SELECT cron.unschedule('ai-logs-retention-cleanup')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-logs-retention-cleanup');

SELECT cron.schedule('ai-logs-retention-cleanup', '0 2 * * *', $CRON$
  DELETE FROM public.ai_call_logs l
   WHERE l.retain_until < now()
     AND NOT EXISTS (
       SELECT 1 FROM public.candidate_ai_decisions d
        WHERE d.status IN ('candidate_review_requested','human_reviewing')
          AND l.id = ANY(d.ai_call_log_ids));
$CRON$);

-- (3) DEPOIS: re-rodar (1) — mesma query — e colar antes/depois no VERIFICATION.md.
```

**A mecânica exata do bug, para o plano não errar a explicação.** `candidate_ai_decisions.ai_call_log_ids` é `uuid[] NOT NULL` (`20260609000001:235`) — o **array** não pode ser NULL, mas seus **elementos** podem (`'{NULL}'::uuid[]` é um array não-nulo perfeitamente válido). `unnest()` desse array produz uma linha NULL. Em SQL, `x NOT IN (…, NULL)` é `NULL` — nunca `TRUE` — para **toda** linha `x`, logo o `DELETE` apaga **zero**, em silêncio, todos os dias, às 02:00. `NOT EXISTS` com `= ANY(…)` é imune: um elemento NULL torna aquela comparação NULL, a subquery não retorna linha, `NOT EXISTS` é `TRUE`, e a linha é corretamente apagada. `retain_until` é `NOT NULL` (`20260609000001:197`), então a outra metade do predicado já é NULL-safe.
**Estado do bug:** latente. `candidate_ai_decisions` com 0 linhas ⇒ `unnest` sobre conjunto vazio ⇒ `NOT IN ()` é `TRUE`. Nenhum array com NULL existe ainda. Ele arma no instante em que a primeira linha for gravada com um NULL no array.

### E6 — INVENT-03: `cron.job` vivo × repositório

```sql
SELECT jobid, jobname, schedule, active, nodename, database, username, command
  FROM cron.job ORDER BY jobname;
```
Esperado (do repositório): **exatamente 3**, todos `active=true`.

| jobname | schedule esperado | origem no repositório |
|---|---|---|
| `ai-cost-aggregation` | `30 1 * * *` | `20260609000003_prompt_library_cron.sql:36` |
| `ai-logs-retention-cleanup` | `0 2 * * *` | `20260609000003_prompt_library_cron.sql:70` |
| `notif-retry-sweep` | `*/15 * * * *` | `20260727000001_p41_recon_retry.sql:223` |

Diffar o `command` **byte a byte** contra o `$$…$$` do arquivo. Qualquer 4º job, ou qualquer divergência de corpo, é **achado bloqueante** (Pitfall 16 da pesquisa: um caminho de escrita fora do repositório apontado para a purga). Complementar com `SELECT status, count(*) FROM cron.job_run_details GROUP BY 1` — buracos no histórico do `ai-logs-retention-cleanup` são o sinal de Pitfall 12.

### E7 — INVENT-01: catálogo vivo (não migrations)

```sql
-- Coluna a coluna, com nulabilidade, default e as duas semânticas de FK que importam.
SELECT c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default,
       fk.referenced_table, fk.on_delete
  FROM information_schema.columns c
  LEFT JOIN (
    SELECT con.conrelid::regclass::text AS tbl, a.attname AS col,
           con.confrelid::regclass::text AS referenced_table,
           CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
                WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL'
                WHEN 'd' THEN 'SET DEFAULT' END AS on_delete
      FROM pg_constraint con
      JOIN unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
     WHERE con.contype = 'f'
  ) fk ON fk.tbl = 'public.' || c.table_name AND fk.col = c.column_name
 WHERE c.table_schema = 'public'
 ORDER BY c.table_name, c.ordinal_position;
```
A classificação por coluna (`apagar` / `anonimizar` / `preservar`) é **julgamento humano registrado no YAML**, não derivada. Semente das regras: PITFALLS §Pitfall 3 (as 3 categorias) e §Pitfall 8 (texto livre e artefatos de IA ⇒ hard-delete, não anonimização). **Detecção por nome de coluna não pega nada** das 5 tabelas `SET NULL` — elas entram por FK, não por nome.

### E8 — INVENT-02: status de PITR

O **Supabase MCP não expõe backups**. O caminho autoritativo é a Management API, com Personal Access Token:

```bash
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://api.supabase.com/v1/projects/isljnozzlvckrgjjbjwp/database/backups
```
Resposta: `{ region, walg_enabled, pitr_enabled, backups:[{ is_physical_backup, status, inserted_at }], physical_backup_data:{ earliest_physical_backup_date_unix, latest_physical_backup_date_unix } }` `[CITED: supabase.com/docs/reference/api/lists-all-backups]`.

- `pitr_enabled` → o booleano.
- `physical_backup_data.earliest_physical_backup_date_unix` → a **janela real utilizável**, que é o que a Phase 45 precisa (não o tier contratado).
- Alternativa sem PAT: screenshot do dashboard em `Database → Backups → Point in Time` (checkpoint humano).

**A frase obrigatória do artefato, verbatim da doc oficial:**
> *"Database backups do not include objects you store via the Storage API, as the database only includes metadata about these objects."* — e *"Restoring an old backup does not restore objects you deleted after that backup."* `[CITED: supabase.com/docs/guides/platform/backups]`

Isto é verdade **independentemente** de `pitr_enabled`. PITR é um add-on pago em Pro/Team/Enterprise, com janelas de 7 / 14 / 28 dias `[CITED: idem]`.

### E9 — REVISAO-06: o passivo Art. 20 vivo (**primeiro deliverable da fase**)

```sql
-- docs/compliance/sql/03-art20-backlog.sql — read-only, seguro em PROD.
SELECT
  count(*) FILTER (WHERE d.revisao_solicitada_em IS NOT NULL
                     AND d.revisao_resultado IS NULL)                    AS pendentes,
  count(*) FILTER (WHERE d.revisao_solicitada_em IS NOT NULL)            AS solicitadas_total,
  min(d.revisao_solicitada_em) FILTER (WHERE d.revisao_resultado IS NULL) AS mais_antigo_pendente,
  max(EXTRACT(day FROM now() - d.revisao_solicitada_em))
      FILTER (WHERE d.revisao_resultado IS NULL)                        AS maior_espera_dias
  FROM public.decisao_final d;

-- Detalhamento (para dimensionar o LIMIT 200 e o cap da fila):
SELECT d.candidatura_id, d.decisao, d.por_usuario, d.revisao_solicitada_em,
       (now()::date - d.revisao_solicitada_em::date) AS dias_em_espera
  FROM public.decisao_final d
 WHERE d.revisao_solicitada_em IS NOT NULL AND d.revisao_resultado IS NULL
 ORDER BY d.revisao_solicitada_em ASC;
```
> ⚠ **Nota de precisão:** enquanto `revisao_veredito` não existir, "pendente" é `revisao_resultado IS NULL`. Depois da migration, o predicado canônico passa a ser `revisao_respondida_em IS NULL` — e a fila **deve** usar esse. Registrar a mudança de predicado no artefato, senão a contagem "antes" e a contagem "depois" medem coisas diferentes.

---

## Known Conflict Resolution — "zero `--no-verify`" × baseline de 97 erros `tsc`

**Recomendação: (a), converter o hook em gate de não-regressão.** Não é escolha de gosto — é alinhamento com um mecanismo que **já existe e já é mantido neste repositório**.

**Fato decisivo, não registrado no CONTEXT nem no M7-HANDOFF:** o `.github/workflows/ci.yml` **já implementa exatamente a opção (a)**, desde a Phase 5, com a baseline re-medida e re-pinada a cada fase que a moveu (290 → 133 → 107 → **104**):

```yaml
- name: Type-check (frozen tsc baseline 104 — CI red only on growth)
  run: |
    COUNT=$(npm run -s lint 2>&1 | grep -c "error TS" || true)
    echo "tsc errors: $COUNT (frozen baseline: 104)"
    if [ "$COUNT" -gt 104 ]; then
      echo "::error::tsc error count ($COUNT) exceeds frozen baseline (104) — new type errors introduced"
      npm run -s lint 2>&1 | grep "error TS" | head -50
      exit 1
    fi
```

O `.husky/pre-commit` roda `npm run lint` cru — checagem binária de exit code. **Não é que o projeto não tenha um gate de não-regressão; é que o hook nunca foi alinhado ao CI que tem um.** Converter é copiar essas 6 linhas.

**Contagem medida nesta sessão:** `npm run -s lint 2>&1 | grep -c "error TS"` → **97** `[VERIFIED: executado 2026-07-29]`. Confere com o M7-HANDOFF:86. O teto do CI (104) está 7 acima do real — folga herdada, deliberada, documentada no próprio `ci.yml`.

| Opção | Custo | Resolve o portão? | Efeito colateral |
|-------|-------|-------------------|------------------|
| **(a) hook = gate de não-regressão** | ~6 linhas + 1 commit | **Sim, de verdade** — `git commit` sem `--no-verify` passa a funcionar | Fim do bypass reflexivo que a STATE.md nomeia como treino ruim. Vale para 45/46, onde o portão importa muito mais |
| (b) zerar os 97 erros | 33 arquivos, repo-wide, `Record<>` estruturalmente stale (o `ci.yml` documenta que consertos de 1 linha só desmascaram a próxima chave) | Sim | **Fora de escopo por larga margem**; contamina a fase read-only com um refactor de tipos |
| (c) reinterpretar o portão | 0 | **Não** — o portão diz "zero `--no-verify`", e (c) o reescreve em vez de satisfazê-lo | Precedente ruim: o primeiro portão do milestone é enfraquecido pelo primeiro caso que o testa |

**Detalhe de implementação que decide o valor de (a):** o hook deve pinar a baseline em **97** (o valor real medido), não em 104. Pinar em 104 preserva 7 erros de folga em que um erro novo se esconde. O CI pode ficar em 104 (ele é o piso mais frouxo, para PRs de terceiros); o hook local, mais estrito, é onde o autor da mudança está.

**Cautela:** a conversão do hook é um commit `chore(infra)` — **e ele próprio precisará de `--no-verify`**, pois o hook antigo ainda está ativo no momento do commit. Registrar isso no corpo do commit, com a contagem 97→97, e ordenar o hook **antes** do commit do INVENT-05, para que o INVENT-05 possa de fato ser commitado sem `--no-verify` e satisfazer o portão literalmente.

---

## State of the Art

| Abordagem antiga | Abordagem atual | Quando mudou | Impacto nesta fase |
|---|---|---|---|
| Trigger → webhook n8n externo | Trigger → `pg_net` → Edge Function | P39 (2026-07-26) | REVISAO-01 recria o `trg_n8n_revisao_decisao` no idioma novo |
| Notificação disparada pelo client (`explicacaoService` fetch) | Disparo server-side por trigger | SEC-03 / P24 | O serviço client **não** carrega mais fetch — não reintroduzir |
| Roster `usuarios_rh` legível por qualquer authenticated | Admin-only + own-row | SEG-02 / P28 (`20260713000001`) | Força o RPC DEFINER para a fila |
| `rh_le_candidaturas` role-only | Vaga-scoped para `rh` | SEC-05/08 / P24 (`20260709000002`) | Força a decisão explícita de escopo da fila |
| Preheader literal de e-mail | Preheader ramificado (`Record<…, (d)=>string>`) | W-01 / P39 gap-closure (2026-07-28) | O 5º evento herda a assinatura de função — decidir se ramifica |
| `tsc --noEmit` binário no CI | Gate de não-regressão com baseline congelada | Phase 5, re-pinado até 104 | Modelo pronto para o hook |
| `supabase db push` | Supabase MCP `apply_migration` + reconcile | P37/P39/P41 | Toda migration desta fase é checkpoint do orquestrador |

**Depreciado / não usar:**
- `n8n_webhook_base` — segredo removido do Vault; triggers droppados.
- `db push --linked` para migrations com `$$` — `42601` garantido.
- `delete_candidate_data()` — nunca existiu; só comentários prometendo-a.
- `docs/sql/sql/*.sql` como fonte de verdade operacional — é o schema legado Figma Make, fora do ledger. Serve de **evidência histórica** (e é onde `candidatos.user_id` está declarado), não de instrução.

---

## Assumptions Log

| # | Afirmação | Seção | Risco se errada |
|---|-----------|-------|-----------------|
| A1 | O CHECK vivo `notificacoes_enviadas_evento_check` casa byte a byte com `20260721000001:77` | Pattern 1 / E2 | O `DROP CONSTRAINT` falha ou a redefinição perde uma cláusula. **Mitigação obrigatória:** ler `pg_get_constraintdef` **antes** de escrever a migration |
| A2 | A ordem `EF → CHECK → trigger` é a segura | Pattern 1 | Derivada do at-most-once do `net.http_post` + do precedente P39; não testada nesta combinação específica |
| A3 | `revisao_respondida` como nome do 5º evento cabe nas colunas `evento`/`template` (`text`, sem limite) | E2 | Nenhum — ambas são `text` |
| A4 | `${candidatura_id}:revisao_respondida` é dedupe key suficiente | E2 | Se o produto permitir uma 2ª solicitação após reversão, a chave bloqueia o 2º e-mail **em silêncio** (classe do CR-02). `decisao_final.candidatura_id` é UNIQUE, o que **sugere** 1:1 — mas o comportamento após `revertida` não está decidido em lugar nenhum. **Levar ao plano como pergunta, não como suposição** |
| A5 | Rodar o smoke de impersonação contra PROD é aceitável com fixture criada/removida | E4 | Precedente P41-05 T3 e P37-03, mas escreve numa tabela de auditoria (`decisao_final`) — mais sensível que o ledger. Alternativa: PG 17 descartável |
| A6 | O orquestrador tem os tools MCP do Supabase e um `SUPABASE_ACCESS_TOKEN` para a Management API | E8 / Environment | Sem o PAT, INVENT-02 vira screenshot do dashboard (checkpoint humano). Não bloqueia a fase |
| A7 | Não há linhas `usuarios_rh` com role `gerente`/`visualizador` ativas | Pattern 5 | Se houver, essas pessoas ficariam fora da lista de destinatários **e** já estão sem acesso hoje. ⏳ verificar; achado do inventário, não bug desta fase |
| A8 | Nenhum 4º `cron.job` existe em PROD | E6 / Inventory | Se existir, é achado bloqueante do INVENT-03 e pode alterar o escopo do plano |
| A9 | `differenceInCalendarDays` sobre `revisao_solicitada_em` (UTC) reflete "dias em espera" como o RH conta | UI | Fronteira de dia desloca até 3h vs. `America/Sao_Paulo` (PITFALLS §2). Irrelevante para um limiar de dias; registrar |

**Nada nesta pesquisa é apresentado como fato verificado ao vivo em PROD.** Este agente não tem os tools MCP do Supabase (confirmado: nenhum `mcp__supabase__*` disponível). Toda afirmação sobre o banco vivo vem do `FK-AUDIT-LIVE.md` (coletado por outra sessão, 2026-07-29) ou está marcada ⏳ como checkpoint.

---

## Open Questions

1. **Uma segunda solicitação de revisão é possível após um veredito `revertida`?**
   - Sabemos: `decisao_final.candidatura_id` é UNIQUE (1 decisão por candidatura); `solicitar_revisao_decisao` é idempotente e nunca sobrescreve `revisao_solicitada_em`.
   - Não sabemos: se o produto permite reabrir. Se permitir, a dedupe key `{candidatura_id}:revisao_respondida` bloqueia o 2º e-mail **silenciosamente**.
   - Recomendação: **fechar explicitamente em v1** — o RPC recusa segunda resposta (guard 4 do E3) e a UI mostra "já respondida". Registrar como decisão, não como omissão.

2. **A fila do recrutador é vaga-scoped ou global?**
   - Sabemos: `rh_le_candidaturas` é vaga-scoped; `rh_le_decisao_final` não é. As duas discordam hoje, em PROD.
   - Recomendação: **espelhar `rh_le_candidaturas`** (admin vê tudo; recrutador vê as próprias vagas) — é o padrão de autorização mais recente e mais restritivo. Registrar a assimetria de `rh_le_decisao_final` como achado do inventário. ⚠ Consequência operacional: com 1 recrutador e 4 admins, e o guard REVISAO-05, se o recrutador for o decisor a fila dele fica com a linha visível e o botão barrado — exatamente o estado que a UI-SPEC desenhou. Coerente.

3. **O preheader do `revisao_respondida` ramifica por veredito?**
   - A lição W-01 é que **não decidir** é o defeito. Argumento contra ramificar: o assunto já diz "resposta à sua solicitação"; ramificar o preheader por `mantida`/`revertida` antecipa o desfecho na caixa de entrada, o que a superfície do candidato trata com cuidado.
   - Recomendação: **não ramificar**, e escrever isso como comentário no `PREHEADERS` + um teste que fixa a string para os dois vereditos. Decisão registrada ≠ omissão.

4. **`revisao_veredito` como CHECK ou ENUM?** (discricionário) — recomendação CHECK, ver §Alternatives Considered.

5. **BD-9 (redigir ou preservar a `justificativa` do recrutador)** — não bloqueia; a fila não a exibe. Só registrar na classificação do INVENT-01.

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|---|---|---|---|---|
| Node 20 + npm | build/test/lint | ✓ | — | — |
| `npm run lint` (tsc) | gate de não-regressão | ✓ (**97 erros**, medido) | — | — |
| Vitest (`vite.config.ts`) | testes de front | ✓ | — | — |
| Deno v2.x | testes das EFs (CI bloqueante) | ✓ no CI | v2.x | Local: pode não estar instalado → CI é a autoridade |
| Playwright | e2e | ✓ | — | Fora de escopo desta fase |
| **Supabase MCP** (`apply_migration`, `execute_sql`, `deploy_edge_function`) | migrations, inspeção viva, deploy das EFs | ⚠ **NÃO disponível a subagentes** (bug upstream anthropics/claude-code#13898) | — | **Checkpoint do orquestrador** — premissa de planejamento de wave, não descoberta de meio de fase |
| **Supabase CLI** | `db push`, `gen types` | ✗ não instalado / projeto não linkado (STATE.md) | — | MCP para migrations; `db:types` exige `supabase link` (P37-05 resolveu sem prompt) |
| **Management API + PAT** (`SUPABASE_ACCESS_TOKEN`) | INVENT-02 (`pitr_enabled`) | ⏳ desconhecido | — | Screenshot do dashboard (`Database → Backups → PITR`) — checkpoint humano |
| Dashboard do Resend | Confirmar `NOTIFICACOES_MODO` / entrega | ⏳ humano | — | O `modo` gravado no ledger é a prova por dado |

**Dependências ausentes sem fallback:** nenhuma.
**Dependências ausentes com fallback:** Supabase MCP em subagente (→ orquestrador); CLI (→ MCP); PAT da Management API (→ dashboard).

---

## Validation Architecture

### Test Framework

| Propriedade | Valor |
|---|---|
| Framework (front) | Vitest (config embutida em `vite.config.ts`), `happy-dom`, setup `./tests/setup.ts` |
| Framework (EF) | `deno test` v2.x, config `supabase/functions/deno.json` |
| Framework (BD) | SQL smoke com **gate-GUC** (`p37_fidelidade_schema_smoke.sql`, `p41_recon_retry_smoke.sql`), executado por `execute_sql` do MCP |
| Comando rápido | `npm run test:run` · `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/_shared supabase/functions/notificar-candidato supabase/functions/notificar-rh` |
| Suite completa | `npm run test:run` + `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` + `npm run -s lint` (contagem ≤ 97) |
| Padrão de arquivo (front) | `**/__tests__/**/*.{test,spec}.{ts,tsx}` — **obrigatório**, senão o Vitest não coleta |

### Phase Requirements → Test Map

| Req | Comportamento | Tipo | Comando automatizado | Existe? |
|---|---|---|---|---|
| REVISAO-04 | **T-42-V1 — não-regressão W-01:** para cada um dos 4 eventos vivos, `renderarEmail` produz o `subject` **e** o `preheader` exatos de hoje (strings fixadas), incluindo os 3 desfechos de `decisao_final` | unit (Deno) | `deno test … _shared/__tests__/email-templates.test.ts` | ❌ Wave 0 — **estende** o arquivo vivo (W-01 já tem 3 testes ali, `:109-137`) |
| REVISAO-04 | **T-42-V2** — o 5º evento renderiza subject + preheader + corpo não-vazios e **não** contém token de scoring (o grep-guard D-15 estendido) | unit (Deno) | idem | ❌ Wave 0 |
| REVISAO-04 | **T-42-V3 — paridade de vocabulário:** `EVENTOS_VALIDOS` ≡ chaves de `EVENTO_MAP` ≡ chaves de `SUBJECTS`/`CORPOS`/`PREHEADERS`, nos dois sentidos. **É o teste que fecha os 4 sítios não-forçados pelo compilador** | unit (Deno) | `deno test … notificar-candidato/__tests__/` | ❌ Wave 0 — **não existe hoje** |
| REVISAO-04 | **T-42-V4** — `montarDedupeKey('revisao_respondida', id)` = `${id}:revisao_respondida` e não colide com os 4 existentes | unit (Deno) | idem | ❌ Wave 0 |
| REVISAO-04 | **T-42-V5** — o CHECK vivo aceita os **5** eventos e rejeita um 6º inventado | smoke SQL | `p42_revisao_art20_smoke.sql` (a) | ❌ Wave 0 |
| **REVISAO-05** | **T-42-V6 — a prova nominada:** decisor impersonado ⇒ `42501 …(decisor)`; outro RH impersonado ⇒ sucesso + `revisao_por_usuario` gravado | smoke SQL (impersonação real) | `p42_revisao_art20_smoke.sql` (E4) | ❌ Wave 0 — **harness existe** (`funil01_pontuar_sjt_smokes.sql:134-141`) |
| REVISAO-05 | **T-42-V7 — asserção negativa:** após a tentativa barrada, `decisao_final` inalterada (`revisao_respondida_em IS NULL`, `revisao_por_usuario IS NULL`) e **zero** linha nova em `notificacoes_enviadas` | smoke SQL | idem | ❌ Wave 0 |
| REVISAO-03 | **T-42-V8** — justificativa com 49 caracteres ⇒ `22023`; 50 ⇒ aceita (fronteira exata) | smoke SQL | idem | ❌ Wave 0 |
| REVISAO-03 | **T-42-V9** — segunda resposta à mesma revisão ⇒ `22023 'ja respondida'` (idempotência) | smoke SQL | idem | ❌ Wave 0 |
| REVISAO-02 | **T-42-V10** — `classifyRevisaoSla` puro e **total**: config ausente / limiar nulo / ordem invertida / data futura ⇒ apresentação degenerada, nunca lança, clamp em 0 | unit (Vitest) | `npm run test:run` | ❌ Wave 0 — molde em `slaThresholds.test.ts` |
| REVISAO-02 | **T-42-V11** — o RPC de leitura projeta **exatamente** as colunas da allowlist e **nunca** `justificativa` (snapshot das chaves) | unit (Vitest) sobre o serviço + smoke SQL sobre o `RETURNS TABLE` | ambos | ❌ Wave 0 |
| REVISAO-02 | **T-42-V12** — contador da sidebar: `0` ⇒ `undefined` (nunca renderiza "0"), erro ⇒ `undefined`, `>99` ⇒ `99+` | unit (Vitest) | `npm run test:run` | ❌ Wave 0 (Pitfall 5) |
| REVISAO-01 | **T-42-V13** — trigger existe, é `AFTER UPDATE OF revisao_solicitada_em`, e a função tem `SECURITY DEFINER` + `search_path=''` (catálogo) | smoke SQL | idem | ❌ Wave 0 |
| REVISAO-01 | **T-42-V14** — `notificar-rh` resolve destinatários com `role IN ('administrador','recrutador')` **e não** `'rh'`; respeita `NOTIFICACOES_MODO`; grava no ledger | unit (Deno, deps injetadas) | `deno test … notificar-rh/__tests__/` | ❌ Wave 0 |
| INVENT-05 | **T-42-V15** — antes/depois pela **mesma query** (E5), + alcance do predicado novo | manual-only, evidenciado | `execute_sql` do MCP, output colado no VERIFICATION.md | ❌ Wave 0 — **justificativa:** requer PROD; não automatizável em CI |
| INVENT-05 | **T-42-V16 — asserção negativa:** após o apply, `cron.job` continua com **exatamente 3** jobs e o `command` do job corrigido casa byte a byte com a migration | smoke SQL | idem | ❌ Wave 0 |
| INVENT-01..04 | **T-42-V17** — cada artefato de `docs/compliance/` carrega data de coleta, a query que o reproduz, e a nota "Storage sem backup" verbatim | manual-only (revisão) | — | ❌ Wave 0 — **justificativa:** artefato de prosa/dado, não comportamento |
| Gate | **T-42-V18** — a contagem `tsc` não sobe: `npm run -s lint 2>&1 \| grep -c "error TS"` ≤ 97 | gate | pre-commit convertido + CI | ✅ existe no CI (baseline 104) · ❌ hook |

### Sampling Rate
- **Por commit de task:** `npm run -s lint` (contagem) + `npm run test:run` + `deno test` do subdiretório tocado.
- **Por merge de wave:** suite completa (Vitest + corpus Deno inteiro + `p42_revisao_art20_smoke.sql` via MCP).
- **Portão de fase:** suite completa verde + smoke SQL 100% dos gates + INVENT-05 com antes/depois colado, **antes** de `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `supabase/functions/notificar-candidato/__tests__/vocabulario-eventos.test.ts` — T-42-V3, V4 (**o mais valioso da fase**: fecha os 4 sítios sem cobertura de compilador)
- [ ] `supabase/functions/_shared/__tests__/email-templates.test.ts` — **estender** com T-42-V1, V2 (não criar arquivo novo)
- [ ] `supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts` — T-42-V14 (deps injetáveis, mirror `notificar-candidato` P41-01)
- [ ] `supabase/tests/p42_revisao_art20_smoke.sql` — T-42-V5..V9, V13, V16 (gate-GUC, **uma única chamada `execute_sql`**)
- [ ] `src/features/revisao/constants/__tests__/slaRevisao.test.ts` — T-42-V10
- [ ] `src/features/revisao/services/__tests__/revisaoService.test.ts` — T-42-V11, V12
- [ ] `.husky/pre-commit` convertido em gate de não-regressão (baseline **97**) — T-42-V18

Instalação de framework: **nenhuma** — Vitest, Deno e o idioma de smoke SQL já existem.

---

## Security Domain

### Applicable ASVS Categories

| Categoria ASVS | Aplica | Controle padrão neste projeto |
|---|---|---|
| V2 Authentication | não (direto) | Nenhuma superfície nova de auth; o Bearer do trigger é `edge_invoke_key` do Vault, nunca service-role (invariante P41) |
| V3 Session Management | não | — |
| **V4 Access Control** | **sim — é o coração da fase** | (1) guard reviewer ≠ decider **dentro** do RPC DEFINER; (2) `RoleGuard` na rota (cosmético); (3) escopo `rh`/`administrador` re-implementado dentro do DEFINER porque ele bypassa RLS; (4) RLS RH-only na tabela de config de SLA — **nunca** `TO anon` |
| **V5 Input Validation** | **sim** | Zod no cliente (`responderRevisaoSchema`) espelhando os CHECKs do servidor; `escapeHtml` em tudo que entra no template; validação do `evento` contra `EVENTOS_VALIDOS` **e** contra o CHECK |
| V6 Cryptography | não | Nenhum segredo novo; nada de hash. Vault já provisionado |
| **V7 Error Handling / Logging** | **sim** | `logSeguro` (allowlist de chaves) na EF nova; `RAISE WARNING` no trigger nunca interpola PII; a mensagem de recusa do guard nomeia o motivo, nunca o e-mail/UUID do decisor |
| **V8 Data Protection** | **sim** | Allowlist de colunas em toda leitura; `justificativa` do recrutador **fora** da fila (BD-9 aberto); `revisao_por_usuario` **nunca** chega ao cliente do candidato (invariante da UI-SPEC); UUID nunca renderizado como identidade |
| V13 API/Web Service | sim | EF nova com self-auth Bearer do Vault + `--no-verify-jwt`; `401` sem Bearer é asserção obrigatória (precedente P39) |

### Known Threat Patterns

| Padrão | STRIDE | Mitigação padrão |
|---|---|---|
| Auto-revisão (decisor responde a própria decisão) | **Elevation of Privilege** | Guard no RPC DEFINER, provado por impersonação real (T-42-V6). UI é cosmética — dito explicitamente na UI-SPEC |
| Limiar de SLA legível por `anon` | **Information Disclosure** | RLS RH-only na tabela de config; **nunca** copiar `sla_public_read` |
| `select('*')` na fila arrastando `justificativa`/`motivo_rejeicao` | **Information Disclosure** | `RETURNS TABLE(...)` com colunas nomeadas; snapshot das chaves (T-42-V11). Classe de vulnerabilidade nº 1 recorrente do projeto |
| Linhas-fantasma / vazamento lateral entre recrutadores | **Information Disclosure** | Escopo por vaga dentro do DEFINER, espelhando `rh_le_candidaturas` |
| Notificação perdida por evento não registrado | **Denial of Service (silencioso)** | Teste de paridade de vocabulário (T-42-V3) + ordem de deploy EF→CHECK→trigger |
| Segredo em log | Information Disclosure | `logSeguro`; `RAISE WARNING` sem PII; segredos só do Vault |
| Escrita direta em `decisao_final` pelo cliente | **Tampering** | Zero policy de UPDATE ⇒ default-deny; `INSERT WITH CHECK (false)`; RPC DEFINER é o único caminho |
| `DELETE` de retenção que apaga demais após o fix | **Destruction of data** | Contagem antes/depois pela mesma query + dry-run do predicado novo + portão destrutivo |

**Candidata a `/gsd-secure-phase`:** sim (STATE.md já a nomeia — autorização server-enforced REVISAO-05 + EF nova).

---

## Project Constraints (from CLAUDE.md)

| Diretiva | Consequência para o plano |
|---|---|
| **NUNCA `supabaseAdmin`/service_role no client** | O RPC DEFINER e a EF são os únicos caminhos privilegiados |
| **RLS habilitada em 100% das tabelas com dado de usuário** | A tabela de config de SLA nasce com RLS habilitada e policy RH-only |
| **Operações privilegiadas em Edge Functions** | `notificar-rh` sob `supabase/functions/` |
| **Duplicate check via RPC DEFINER, nunca SELECT anon** | Idioma reafirmado |
| **Idioma:** domínio pt-BR, código técnico en | Colunas `revisao_veredito`/`revisao_por_usuario`/`revisao_respondida_em`; enums/CHECK em pt-BR (`mantida`/`revertida`) |
| **Componentes PascalCase, export nomeado (nunca default)** | Todos os componentes de `src/features/revisao/` |
| **Hooks `useCamelCase.ts` · services `camelCaseService.ts` com classe de erro própria** | `RevisaoError` com `code` |
| **Features em `src/features/<dominio>/`** com `components/ hooks/ services/ schemas/` | `src/features/revisao/` |
| **`@/` para imports absolutos** | — |
| **Query keys hierárquicas** | `revisoesKeys.list({incluirRespondidos})` / `revisoesKeys.pendentesCount()` |
| **`database.types.ts` NUNCA editado à mão** | `npm run db:types` após a migration — com a cautela do `>` truncante (Pitfall 10) |
| **Migrations com `$$` → SQL Editor / MCP + `migration repair`** | Toda migration desta fase é checkpoint do orquestrador; sem wrapper `BEGIN;/COMMIT;` |
| **Linguagem de produto: "avaliação comportamental/cognitiva", nunca "teste psicológico"** | Copy da fila e do e-mail |
| **Sistema NUNCA rejeita automaticamente por score (RNF-07a)** | O veredito `revertida` **não** reabre o funil — a UI-SPEC já veta prometer próximos passos |
| **DevNavigationMenu gateado por `import.meta.env.DEV`** | Se a rota nova entrar em `DEV_ROUTES` (`routes.tsx:501+`), mantém o gate |

---

## Sources

### Primary (HIGH confidence)
- Codebase, grepado e citado com `arquivo:linha` — `supabase/functions/notificar-candidato/{index,helpers}.ts`, `supabase/functions/_shared/{email-config,email-templates}.ts`, `supabase/migrations/{20260607000003,20260609000001,20260609000003,20260625100001,20260706110005,20260713000001,20260721000001,20260721000002,20260726000001,20260727000001,20260420000002,20260421000001,20260709000002}.sql`, `docs/sql/sql/{02-tabela-candidatos,03-tabela-usuarios-rh}.sql`, `supabase/tests/funil01_pontuar_sjt_smokes.sql`, `.github/workflows/ci.yml`, `.husky/pre-commit`, `vite.config.ts`, `src/router/routes.tsx`, `src/components/RHSidebar.tsx`, `src/features/funil/constants/slaThresholds.ts`
- `npm run -s lint 2>&1 | grep -c "error TS"` → **97**, executado nesta sessão (2026-07-29)
- Varredura `grep -rn "ADD COLUMN IF NOT EXISTS"` → 16 ocorrências / 8 arquivos, executada nesta sessão
- `.planning/research/FK-AUDIT-LIVE.md` — `pg_constraint` vivo, 2026-07-29 (**com as 3 correções de citação registradas acima**)
- `.planning/research/{SUMMARY,PITFALLS}.md`, `.planning/{REQUIREMENTS,STATE,M7-HANDOFF}.md`, `42-CONTEXT.md`, `42-UI-SPEC.md`

### Secondary (MEDIUM confidence)
- `supabase.com/docs/guides/platform/backups` — fetch direto; citações verbatim sobre Storage e PITR
- `supabase.com/docs/reference/api/lists-all-backups` — forma da resposta de `GET /v1/projects/{ref}/database/backups` (`pitr_enabled`, `walg_enabled`, `physical_backup_data`), via busca; **não** fetchada em fonte primária

### Tertiary (LOW confidence)
- Toda afirmação sobre o **estado vivo de PROD** neste documento é herdada do FK-AUDIT-LIVE (coletado por outra sessão) ou marcada ⏳. Este agente não tem os tools MCP do Supabase; nenhuma query foi executada contra PROD nesta sessão.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — zero adições; todas as versões confirmadas ao vivo pelo FK-AUDIT-LIVE
- Sítios de edição da EF (Pattern 1): **HIGH** — cada um lido e citado; a distinção compile-enforced × runtime é verificável por leitura de tipo
- Constraints de RLS/autorização (Pattern 4/5): **HIGH** — policies e o hook lidos na fonte
- Correção ao FK-AUDIT-LIVE: **HIGH** — três greps independentes convergentes
- Resolução do conflito `--no-verify`: **HIGH** — o mecanismo alternativo já existe no repositório; a contagem foi medida
- Estado vivo de PROD (cron, contagens, CHECK, PITR): **LOW-MEDIUM** — não verificável nesta sessão; todos os pontos convertidos em checkpoints com a query exata
- Semântica de backup/Storage do Supabase: **MEDIUM-HIGH** — doc oficial fetchada, citações verbatim

**Research date:** 2026-07-29
**Valid until:** 2026-08-12 (14 dias) — o repositório é estável, mas os fatos ⏳ do banco vivo (contagens do INVENT-05, catálogo do `cron.job`, definição do CHECK) têm validade de **horas**, não dias, e devem ser re-medidos no momento do plano.
