# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06) — `milestones/v1.0-ROADMAP.md`
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26) — `milestones/v2.0-ROADMAP.md`
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone (shipped 2026-06-28)
- ✅ **v3.0 — M3 Refinamento RH & Hardening** — Phases 18–21 (shipped 2026-06-30) — `milestones/v3.0-ROADMAP.md`
- ✅ **v4.0 — M4 Correção & Blindagem do Funil** — Phases 22–27 (shipped 2026-07-13) — `milestones/v4.0-ROADMAP.md`
- ✅ **v5.0 — M5 Gestão de Usuários & Perfil RH** — Phases 28–30 (shipped 2026-07-14) — `milestones/v5.0-ROADMAP.md`
- ✅ **v6.0 — M6 Operação do Funil RH** — Phases 31–35 (shipped 2026-07-17) — `milestones/v6.0-ROADMAP.md`
- 🚧 **v7.0 — M7 Comunicação com o Candidato (COMM)** — Phases 36–41 (em andamento)

## Overview

O M7 não constrói uma nova capacidade de funil — faz o candidato **saber** que o funil (já operado pela mão do RH desde o M6) está andando. É uma **integração aditiva**, não greenfield: gatilhos de DB → `pg_net` → uma EF nova `notificar-candidato` (self-auth) → Resend — um clone quase-verbatim do padrão SEC-03/`analise-candidato-individual` já shipado e provado, com **zero dependências npm novas**. Isto **aposenta o n8n pessoal e resolve SEC-03 por substituição** (não patch): os 3 triggers dormentes do SEC-03 (`net.http_post` + Vault, hoje graceful-skip) são **removidos** no mesmo phase que cria os novos.

As quatro dimensões de pesquisa convergiram independentemente numa mesma forma de **6 fases dependency-ordered**, e três invariantes estruturais mandam na ordem: **(1) security-first** — a RLS candidato-DENY do ledger (LEDGER-03) e o self-auth do hop trigger→EF (DISPATCH-04) aterrissam antes de qualquer superfície candidato-facing; **(2) anti-double-send** — o DROP dos triggers n8n antigos e o CREATE dos novos acontecem no **mesmo** phase (P39, o de maior risco), respaldados por um `UNIQUE(dedupe_key)` durável; **(3) fire-and-forget reconciliado por último** — `net.http_post` é at-most-once (funil avança mesmo se o e-mail cair), então a state machine `pendente→enviado→entregue/falhou/bounce` + webhook + `pg_cron` fecham o loop na P41.

O milestone entrega em: identidade de remetente & entregabilidade (P36 — gate humano/DNS, paralelizável); a camada de dados do ledger + `config_sla_etapa` (P37 — migrations primeiro); a EF `notificar-candidato` com os 4 templates + port do `.ics` (P38 — deployável dormente, smoke via `net.http_post` manual); o rewire dos triggers + aposentadoria do n8n (P39 — cadeia estrita 37→38→39); a timeline de prazo no painel (P40 — paralelizável, lê só `config_sla_etapa`); e a reconciliação/retry/testing que fecha o fire-and-forget (P41 — por último).

**Invariantes preservadas em toda fase (gates, não requisitos):**

- **RNF-07a** — o disparo de decisão (COMM-05) é gatilhado por uma decisão **registrada por humano**, nunca por limiar de score; o sistema nunca auto-decide.
- **D-15** — o template de rejeição é **fixo e neutro**; nunca interpola `motivo_rejeicao`/score/percentil/trait (grep-guard contra tokens de scoring).
- **RNF-12a** — linguagem sempre "avaliação comportamental/cognitiva" (nunca "teste psicológico").
- **PII allowlist** — a EF resolve dados do candidato por allowlist explícita, nunca `select('*')`; a RLS de `notificacoes_enviadas` é candidato-DENY (o log de PII nunca é legível candidate-side).
- **Trilha canônica única** — uma fonte de disparo por evento; nenhuma superfície de envio dupla ativa (o n8n é removido, não coexiste).
- **Migrations PROD via Supabase MCP** `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL; reconcilia o ledger); **baseline tsc permanece flat** (~97, `core.hooksPath=/dev/null`).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

M7 continua a numeração a partir da **Phase 36** (M6 terminou na Phase 35).

- [ ] **Phase 36: Deliverability & Sender Identity** - domínio de envio Beauty Smile verificado no Resend (SPF/DKIM auto + DMARC manual), From/Reply-To reais, `RESEND_API_KEY` só no Vault, disciplina de test-address `resend.dev` no dev/CI
- [ ] **Phase 37: Camada de Dados de Notificação (`notificacoes_enviadas` + `config_sla_etapa`)** - tabela ledger (audit + idempotência `UNIQUE(dedupe_key)` + fila de retry, RLS RH vaga-scoped join-through, candidato-DENY) + tabela estática de SLA seedada do PRD, provadas por smoke antes de qualquer EF/trigger
- [ ] **Phase 38: EF `notificar-candidato` (COMM)** - EF self-auth que resolve dados por allowlist, renderiza os 4 templates Beauty Smile (+ port verbatim do `.ics` do M6), envia via `fetch` ao Resend e grava no ledger; deployável dormente, smoke via `net.http_post` manual
- [ ] **Phase 39: Rewire dos Triggers & Aposentadoria do n8n (SEC-03)** - trigger CASE canônico em `historico_candidatura` (avanço + decisão) + 2 satélites (confirmação + convite); DROP dos 3 triggers n8n do SEC-03 no MESMO phase (resolve SEC-03 por substituição, sem double-send)
- [ ] **Phase 40: Timeline de Prazo no Painel do Candidato** - `DashboardCandidatoPage` mostra em cada estado de espera a estimativa de prazo da etapa (lê `config_sla_etapa`), enquadrada como estimativa, nunca countdown — o *pull* que complementa o *push* do e-mail
- [ ] **Phase 41: Reconciliação de Entrega, Retry & Testing** - EF de webhook do Resend (Svix) atualiza status por `provider_message_id` + varredura `pg_cron` de `pendente`/`falhou` + testes CI com sender mockado (sem chave viva) + UAT via `delivered@`/`bounced@`/`complained@resend.dev`

## Phase Details

### 🚧 v7.0 — M7 Comunicação com o Candidato (COMM) (em andamento)

**Milestone Goal:** O funil já *anda* pela mão do RH (M6); o M7 faz o candidato **saber** que ele anda — pipeline de notificação transacional por e-mail (Resend) disparado nas transições do funil, aposentando o n8n pessoal (resolve SEC-03 por substituição), + timeline de estimativa de prazo no painel do candidato pra reduzir ansiedade na espera. Feature-work (net-new comunicação), **não** hardening. Deriva do grupo **COMM** do `.planning/M5-DRAFT.md`.

### Phase 36: Deliverability & Sender Identity

**Goal**: A identidade de remetente da Beauty Smile é real e confiável — um subdomínio de envio dedicado verificado no Resend (SPF/DKIM auto + DMARC publicado manualmente), um From/Reply-To real, e a `RESEND_API_KEY` vivendo **apenas** no Vault — pra que, quando o pipeline for ao ar, o e-mail caia na caixa de entrada (não no spam) e nenhum segredo de provedor toque o bundle. Engenharia procede em paralelo via os endereços de teste `resend.dev`.
**Depends on**: Phase 35 (M6 shipped) — nada dentro do M7; é um gate humano/DNS, lateralmente paralelizável com as Phases 37–38 (só precisa aterrissar antes do 1º envio a candidato real na P41).
**Requirements**: DELIV-01, DELIV-02, DELIV-03
**Success Criteria** (what must be TRUE):

  1. Um subdomínio de envio Beauty Smile está verificado no Resend com SPF+DKIM (auto) e um registro DMARC publicado manualmente, e o From/Reply-To real está definido — um envio de teste desse domínio cai na caixa de entrada, não no spam (DELIV-01).
  2. A `RESEND_API_KEY` existe **apenas** no Supabase Vault (nunca em env `VITE_`, nunca no bundle); um grep-guard de bundle prova que nenhuma chave/URL do Resend aparece no build público (DELIV-02).
  3. Dev/CI enviam exclusivamente aos endereços de teste do Resend (`delivered@`/`bounced@`/`complained@resend.dev`) com o sender mockado nos unit tests — CI não requer chave viva e nunca spama um candidato real (DELIV-03).

**Plans**: 5 plans em 2 waves

Plans:
**Wave 1**

- [x] 36-01-PLAN.md — contrato `_shared/email-config.ts` (From/Reply-To congelados, modo fail-safe `teste`, redirecionamento `@resend.dev`) + suite Deno + `test.exclude` no Vitest [wave 1]
- [x] 36-02-PLAN.md — `scripts/assert-no-secrets.mjs` (guard de bundle), meta-teste do guard, encadeamento no `postbuild` + step no job `e2e` [wave 1]
- [x] 36-03-PLAN.md — runbook `docs/runbooks/resend-dominio-envio.md`, `scripts/check-resend-dominio.mjs` (opt-in) e `36-HUMAN-UAT.md` com o checklist de 9 itens [wave 1]
- [x] 36-04-PLAN.md — migration da RPC `public.ler_resend_api_key()` (SECURITY DEFINER, service_role-only) aplicada via MCP + débito da divergência de chaves [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 36-05-PLAN.md — provisionamento de `resend_api_key` no Vault (checkpoint humano; sem placeholder) + smokes de leitura [wave 2]

*Nota (discuss-phase):* DELIV-01 é ação humana/DNS do Fernando — deve aterrissar antes do 1º envio ao vivo (UAT da P41); codificação/teste procede em paralelo via `resend.dev`.

### Phase 37: Camada de Dados de Notificação (`notificacoes_enviadas` + `config_sla_etapa`)

**Goal**: As tabelas que todo o pipeline lê e escreve existem e estão blindadas **antes** de qualquer EF ou trigger tocá-las: `notificacoes_enviadas` (audit trail + guarda de idempotência + fila de retry, RLS RH vaga-scoped join-through espelhando `rh_gerencia_agendamento`, candidato-DENY) e a tabela estática `config_sla_etapa` seedada dos prazos do PRD §5.1.1. Aplicadas pelo caminho estabelecido MCP `apply_migration` + reconcile do ledger.
**Depends on**: Phase 35 (M6 shipped) — primeira fase de encanamento; **BLOCKING** para as Phases 38, 39 e 40.
**Requirements**: LEDGER-01, LEDGER-02, LEDGER-03, TIMELINE-01
**Success Criteria** (what must be TRUE):

  1. A tabela `notificacoes_enviadas` registra cada disparo (evento, candidatura, candidato, template, `status`, `provider_message_id`, erro, timestamps) — existe um audit trail persistido em PROD (LEDGER-01).
  2. Um `UNIQUE(dedupe_key)` durável — com a chave incluindo `etapa_destino`/`agendamento_id` — torna o envio idempotente: um retrocede-then-readvance ou reagendamento **legítimo** re-notifica, enquanto um retry do mesmo evento não consegue inserir linha duplicada (LEDGER-02).
  3. Um candidato JWT-impersonado lendo `notificacoes_enviadas` obtém **zero linhas** (candidato-DENY, sem policy de candidato), e um recrutador não-dono não lê linhas de outra vaga — provado por smoke comportamental, espelhando o join-through de `rh_gerencia_agendamento` (LEDGER-03).
  4. `config_sla_etapa` existe (non-PII, public-read) seedada com o prazo esperado por etapa a partir do PRD §5.1.1 (TIMELINE-01).

**Plans**: 5 plans

Plans:
- [ ] 37-01-PLAN.md — Dump do catálogo Postgres vivo das duas tabelas (checkpoint MCP; fonte da verdade da reconstrução)
- [ ] 37-02-PLAN.md — Reconstruir os 2 arquivos de migration fiéis + smoke de fidelidade campo-a-campo
- [ ] 37-03-PLAN.md — Migration aditiva das 3 lacunas + smoke comportamental (RLS, idempotência, CHECKs, trigger)
- [ ] 37-04-PLAN.md — Apply em PROD + reconcile do ledger + os 3 runs de smoke (checkpoint MCP)
- [ ] 37-05-PLAN.md — Regenerar `database.types.ts` + arquivar o item de drift

*⚠ Nota (planejamento, 2026-07-22):* **o escopo desta fase mudou antes de começar.** Um drift PROD→repo descoberto durante a P36 revelou que as duas tabelas **já existem em produção** (versions `20260721000001` e `20260721000002` no ledger), sem nenhum arquivo de migration local. A P37 deixou de ser "construir a camada de dados" e passou a ser **"reconciliar o drift e fechar 3 lacunas estreitas"** (colunas de auditoria do modo teste, trigger de `atualizado_em`, índice parcial de retry). Os 4 Success Criteria acima permanecem válidos como definição de pronto — mudou o caminho, não o destino. Detalhes: `.planning/todos/pending/37-drift-prod-tabelas-notificacao.md` e `37-CONTEXT.md`.

*Nota (discuss-phase):* a janela de retenção/purga de `notificacoes_enviadas` (minimização LGPD) foi **deferida** para um milestone de LGPD-OPS (M8+) — não há volume de dados para decidir hoje (37-CONTEXT § Deferred Ideas).

### Phase 38: EF `notificar-candidato` (COMM)

**Goal**: Uma única EF self-authenticating que, dado um payload ids-only, resolve os dados do candidato por allowlist explícita (nunca `select('*')`), reivindica idempotência contra o ledger, renderiza o template Beauty Smile correto para cada um dos 4 eventos (com um port server-side verbatim do `.ics` do M6 para o convite), envia via `fetch` plano ao Resend e grava o resultado de volta — **deployável dormente** e smoke-testável via `net.http_post` manual **antes** de qualquer trigger existir.
**Depends on**: Phase 37 (precisa da `notificacoes_enviadas` para reivindicar/logar). Cadeia estrita 37 → 38 → 39.
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06
**Success Criteria** (what must be TRUE):

  1. A EF `notificar-candidato` existe — self-auth Bearer via Vault (`--no-verify-jwt`), resolve os dados do candidato por **allowlist explícita de colunas** (nunca `select('*')`), envia via `fetch` à API do Resend e grava o resultado no ledger (COMM-01).
  2. Invocada por evento, a EF produz o e-mail correto: **confirmação** de candidatura recebida — suprimida pelo survivor-guard quando a candidatura nasce auto-rejeitada por knockout (COMM-02); **avanço** p/ avaliação assíncrona (COMM-03); **convite de entrevista** com data/hora em `America/Sao_Paulo`, link/local e anexo `.ics` (RFC-5545) de `_shared/ics.ts` portado verbatim do M6 (COMM-04); **decisão ≤24h** com template **fixo e neutro** que nunca interpola `motivo_rejeicao`/score/percentil/trait — D-15, disparada só por decisão registrada por humano, nunca por limiar de score — RNF-07a (COMM-05).
  3. Os 4 templates HTML são hand-rolled com identidade Beauty Smile (inline CSS, **não** react-email); a cópia de rejeição é revisada e congelada, e um grep-guard prova que nenhum token de scoring/critério vaza no template de rejeição (COMM-06).
  4. Um `net.http_post` manual à EF (dormente, sem trigger ainda) envia o e-mail correto a um endereço de teste `resend.dev` e grava uma linha `enviado` no ledger — a EF é provada ponta-a-ponta **antes** do rewire dos triggers (COMM-01).

**Plans**: TBD (planejado em `/gsd-plan-phase 38`)

*Nota (discuss-phase):* o `METHOD` do `.ics` (PUBLISH vs REQUEST) é questão aberta desta fase. A cópia de rejeição (COMM-05) precisa de uma string neutra revisada e **congelada** antes do fecho.

### Phase 39: Rewire dos Triggers & Aposentadoria do n8n (SEC-03)

**Goal**: Os eventos reais do funil passam a auto-disparar a EF a partir de uma fonte canônica única por evento — um trigger baseado em `CASE` sobre `historico_candidatura` (avanço + decisão) mais dois triggers satélites em `candidaturas` (confirmação) e `agendamentos_entrevista` (convite) — enquanto os 3 triggers dormentes do SEC-03 e o disparo por env-var do `submit-candidatura` são **DROPPED no MESMO phase**, aposentando o n8n e resolvendo **SEC-03 por substituição**, sem superfície de double-send. Fase de **maior risco** do milestone.
**Depends on**: Phase 38 (os triggers precisam de um alvo EF vivo), Phase 37 (a guarda `dedupe_key`).
**Requirements**: DISPATCH-01, DISPATCH-02, DISPATCH-03, DISPATCH-04
**Success Criteria** (what must be TRUE):

  1. Um trigger `AFTER INSERT ON historico_candidatura` é a **fonte canônica única** dos eventos de transição — um `CASE` sobre `etapa_para` dispara avanço (COMM-03) e decisão (COMM-05, unificando aprovado/rejeitado/knockout via `etapa_atual`) com corpo ids-only, zero-PII, graceful-skip (DISPATCH-01).
  2. Triggers satélites em `candidaturas` INSERT (confirmação, com o survivor-guard de knockout) e `agendamentos_entrevista` INSERT (convite) cobrem os dois eventos que **não** são transições de etapa — uma candidatura real, um avanço, um convite e uma decisão disparam **exatamente um** e-mail cada, sem duplicatas (DISPATCH-02).
  3. Os 3 triggers n8n do SEC-03 são **DROPPED** e o disparo por env-var do `submit-candidatura` é aposentado **na mesma migration** que cria os novos triggers — um grep/diff-live prova que nenhuma superfície de disparo dupla permanece e o n8n está totalmente aposentado (SEC-03 resolvido por substituição) (DISPATCH-03).
  4. O hop trigger→EF autentica por um segredo Bearer self-auth do Vault (mirror do `analise-candidato-individual`), e o corpo do `net.http_post` carrega só ids — a EF não é um endpoint de envio público/spoofable e nenhuma PII trafega no payload do trigger (DISPATCH-04).

**Plans**: TBD (planejado em `/gsd-plan-phase 39`)

*Nota (discuss-phase):* antes de finalizar o predicado do `CASE`, **confirmar que o caminho de aprovação escreve `etapa_atual='aprovado'`** (questão aberta) — se só escreve `decisao_final`, um trigger satélite em `decisao_final` é necessário para aprovações. Diff dos corpos de função vivos **antes** de qualquer `CREATE OR REPLACE` (disciplina DBMIG-02; sem wrapper `BEGIN;...COMMIT;`).

### Phase 40: Timeline de Prazo no Painel do Candidato

**Goal**: Cada estado de espera do painel do candidato mostra o prazo esperado da etapa a partir de `config_sla_etapa` ("triagem — resposta em até X dias úteis"), enquadrado explicitamente como **estimativa** (nunca countdown rígido) — o *pull* que complementa o *push* do e-mail, arquiteturalmente independente do pipeline (lê só a tabela de config estática).
**Depends on**: Phase 37 (seed de `config_sla_etapa`) — **lateralmente paralelizável** com as Phases 38–39 (zero acoplamento ao push de e-mail).
**Requirements**: TIMELINE-02
**Success Criteria** (what must be TRUE):

  1. Em cada estado de espera do `DashboardCandidatoPage`, o candidato vê a estimativa de prazo da etapa atual, sourced de `config_sla_etapa` (TIMELINE-02).
  2. A estimativa é enquadrada **explicitamente** como estimativa ("resposta em até X dias úteis"), nunca como countdown rígido ou data prometida, e lê a **mesma** etapa derivada de `historico_candidatura` que o push do e-mail keya — sem contradição entre painel e e-mail (TIMELINE-02).

**Plans**: TBD (planejado em `/gsd-plan-phase 40`)
**UI hint**: yes

### Phase 41: Reconciliação de Entrega, Retry & Testing

**Goal**: O loop fire-and-forget é fechado e o pipeline fica seguro para tráfego real — uma EF de webhook do Resend (assinatura Svix verificada) reconcilia o status de entrega por `provider_message_id`, uma varredura `pg_cron` re-tenta linhas `pendente`/`falhou` sob cap de tentativas, e o CI trava um sender mockado + guard de destinatário non-prod para que nenhum teste jamais spame um candidato real. Última fase; deve aterrissar **antes** de qualquer volume de candidato real.
**Depends on**: Phase 38 e Phase 39 (precisa de um caminho de envio funcionando pra reconciliar/testar), Phase 36 (domínio verificado para o UAT ao vivo).
**Requirements**: RECON-01, RECON-02, RECON-03
**Success Criteria** (what must be TRUE):

  1. `notificacoes_enviadas` implementa a state machine `pendente → enviado → entregue/falhou/bounce` — o status reflete o resultado real do envio, e o funil avança independentemente (o e-mail nunca carrega estado de funil sozinho) (RECON-01).
  2. Uma EF de webhook do Resend com assinatura Svix verificada atualiza o status por `provider_message_id` nos eventos `email.delivered`/`email.bounced`/`email.complained` — rastreamento durável de entrega/bounce (RECON-02).
  3. Uma varredura `pg_cron` re-dispara as linhas `pendente`/`falhou` sob cap de `tentativas` como rede de segurança para a janela de ~6h do `net._http_response` (o `net.http_post` é fire-and-forget/at-most-once) (RECON-03).
  4. Testes CI rodam contra um sender do Resend mockado (sem chave viva) com um guard de destinatário non-prod, e um UAT ao vivo usando os endereços `delivered@`/`bounced@`/`complained@resend.dev` exercita a reconciliação completa de entrega/bounce/complaint (RECON-02, RECON-03).

**Plans**: TBD (planejado em `/gsd-plan-phase 41`)

*Nota (discuss-phase):* verificar os números exatos de rate-limit/free-tier do Resend no dashboard vivo antes de assumir a cadência da varredura de retry (questão aberta).

<details>
<summary>✅ v1.0 — M1 MVP Candidato (Phases 1–5) — SHIPPED 2026-06-06</summary>

Full detail archived in `milestones/v1.0-ROADMAP.md`. Requirements: `milestones/v1.0-REQUIREMENTS.md`. Audit: `milestones/v1.0-MILESTONE-AUDIT.md` (PASSED, 38/38 reqs).

</details>

<details>
<summary>✅ v2.0 — M2 Funil RH + Avaliação por IA (Phases 6–16) — SHIPPED 2026-06-26</summary>

Full detail archived in `milestones/v2.0-ROADMAP.md`. Requirements: `milestones/v2.0-REQUIREMENTS.md`. Audit: `v2.0-MILESTONE-AUDIT.md` (PASSED, 42/42 reqs; o único BLOCKER AVAL-03 foi corrigido + redeployado + PROD-smoked pós-audit). Pipeline backbone de 6 etapas + IA-assisted evaluation; `historico_candidatura` + o trigger `avancar_etapa()` (único escritor da trilha) nascem aqui, na Phase 6 — a fundação que o M7 reusa (o trigger CASE de DISPATCH-01 lê `historico_candidatura`).

</details>

<details>
<summary>✅ Phase 17 — Navegação & Arquitetura de Informação (standalone mini-fase) — SHIPPED 2026-06-28</summary>

Cabeou na navegação real de produção o funil construído no M2, antes só alcançável por URL direta / DevNavigationMenu DEV-only. 5/5 plans / 4 waves. Standalone — sem lifecycle de milestone.

</details>

<details>
<summary>✅ v3.0 — M3 Refinamento RH & Hardening (Phases 18–21) — SHIPPED 2026-06-30</summary>

Full detail archived in `milestones/v3.0-ROADMAP.md`. Requirements: `milestones/v3.0-REQUIREMENTS.md`. Audit: `milestones/v3.0-MILESTONE-AUDIT.md` (12/12 reqs, status tech_debt). Hardening (não expansão) do funil de IA do M2: resiliência das EFs, code-splitting, RH edita o guia de entrevista, e fechamento de HUMAN-UATs live. A Phase 21 achou+corrigiu 3 defeitos live em PROD.

</details>

<details>
<summary>✅ v4.0 — M4 Correção & Blindagem do Funil (Phases 22–27) — SHIPPED 2026-07-13</summary>

Full detail archived in `milestones/v4.0-ROADMAP.md`. Requirements: `milestones/v4.0-REQUIREMENTS.md`. Audit: `milestones/v4.0-MILESTONE-AUDIT.md` (status tech_debt — 55/56 reqs Complete + DBMIG-01 sanctioned partial). Hardening/correção ponta-a-ponta em 6 fases (43 plans). **A P24/SEC-03 (`20260706110005_sec03_n8n_serverside.sql`) deixou 3 triggers `AFTER` com `net.http_post` + Vault secret `n8n_webhook_base` dormentes (graceful-skip) — a meia-ponte que o M7/Phase 39 completa/substitui, aposentando o n8n.** Invariante: IA recomenda, humano decide (RNF-07a).

</details>

<details>
<summary>✅ v5.0 — M5 Gestão de Usuários & Perfil RH (Phases 28–30) — SHIPPED 2026-07-14</summary>

Full detail archived in `milestones/v5.0-ROADMAP.md`. Requirements: `milestones/v5.0-REQUIREMENTS.md`. Audit: `milestones/v5.0-MILESTONE-AUDIT.md` (status tech_debt — 13/13 reqs Complete, 0 gaps). Feature-work enxuto com segurança como eixo: A14 console de gestão de usuários RH (EF authenticate-THEN-authorize admin-only) + A37 meu-perfil self-service (RPC SEG-03-por-construção). O padrão EF authenticate-THEN-authorize + smokes comportamentais que o M7 reusa foi provado aqui e no M4.

</details>

<details>
<summary>✅ v6.0 — M6 Operação do Funil RH (Phases 31–35) — SHIPPED 2026-07-17</summary>

Full detail archived in `milestones/v6.0-ROADMAP.md`. Requirements: `milestones/v6.0-REQUIREMENTS.md`. Audit: `v6.0-MILESTONE-AUDIT.md` (status tech_debt — 19/19 reqs Complete; integração cross-fase 9/9 seams WIRED, 4/4 E2E flows). *Reuse-and-tighten* security-first: construiu a **esteira** que faz o funil andar pela mão do RH — avançar/rejeitar/retroceder auditável (P31), fechamento dos 2 leaks horizontais vivos (P32, BLOCKING), `agendamentos_entrevista` + RLS bidirecional (P33), superfícies RH CV/IA/agendamento/Fila/KPIs (P34), e o card do agendamento no painel do candidato + `.ics` client-side (P35). **O `.ics` hand-rolled (RFC-5545) de `agendamentoCandidatoService.gerarIcsAgendamento` que o M7/Phase 38 porta verbatim para `_shared/ics.ts` nasce aqui.** Invariante: painel é o canal único (sem e-mail) — que o M7 agora complementa com o *push* transacional.

</details>

## Progress

**Execution Order:**
Phases execute in numeric order: 36 → 37 → 38 → 39 → 40 → 41

*(Cadeia estrita 37 → 38 → 39; a Phase 36 e a Phase 40 são lateralmente paralelizáveis mas recebem seu próprio número em sequência.)*

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 5/5 | Complete | 2026-06-28 |
| 18–21 (M3) | v3.0 | 16/16 | Complete | 2026-06-30 |
| 22–27 (M4) | v4.0 | 43/43 | Complete | 2026-07-13 |
| 28–30 (M5) | v5.0 | 19/19 | Complete | 2026-07-14 |
| 31–35 (M6) | v6.0 | 20/20 | Complete | 2026-07-17 |
| 36. Deliverability & Sender Identity | v7.0 | 5/5 | Complete   | 2026-07-22 |
| 37. Camada de Dados de Notificação | v7.0 | 0/TBD | Not started | - |
| 38. EF `notificar-candidato` (COMM) | v7.0 | 0/TBD | Not started | - |
| 39. Rewire dos Triggers & Aposentadoria do n8n | v7.0 | 0/TBD | Not started | - |
| 40. Timeline de Prazo no Painel | v7.0 | 0/TBD | Not started | - |
| 41. Reconciliação, Retry & Testing | v7.0 | 0/TBD | Not started | - |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — 11 phases (6–16), 42/42 requirements, audit PASSED.*
*v3.0 milestone shipped 2026-06-30 — 4 phases (18–21), 12/12 requirements, audit tech_debt.*
*v4.0 milestone shipped 2026-07-13 — 6 phases (22–27), 55/56 requirements Complete + DBMIG-01 sanctioned partial, audit tech_debt.*
*v5.0 milestone shipped 2026-07-14 — 3 phases (28–30), 13/13 requirements, audit tech_debt.*
*v6.0 milestone shipped 2026-07-17 — 5 phases (31–35), 19/19 requirements, audit tech_debt.*
*v7.0 milestone opened 2026-07-17 — additive integration, security-first, dependency-ordered. 6 phases (36–41), 21/21 requirements mapeados (0 unmapped). Numeração continua da Phase 36.*
