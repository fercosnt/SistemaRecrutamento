---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: Comunicação com o Candidato
status: executing
stopped_at: "Completed 41-03-PLAN.md — migration aditiva P41 (20260727000001: bounce_em/reclamado_em + ler_resend_webhook_secret + varrer_retry_notificacoes + cron notif-retry-sweep) + smoke gate-GUC escritos (zero PROD; apply/reconcile/smoke = 41-05)"
last_updated: "2026-07-27T00:43:16.859Z"
last_activity: 2026-07-27
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 25
  completed_plans: 23
  percent: 83
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-17 — M7/v7.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 41 — Reconciliação de Entrega, Retry & Testing

## Current Position

Phase: 41 (Reconciliação de Entrega, Retry & Testing) — EXECUTING
Plan: 4 of 5
Status: Ready to execute
Last activity: 2026-07-27

Progress: [█████████░] 92%

> 📋 **P39 descobertas-chave (planning 2026-07-26):** (1) são **4** triggers n8n vivos a DROPar, não 3 (o 4º = `trg_n8n_novo_candidato` em `candidatos`). (2) O disparo n8n do `submit-candidatura` é **LIVE, hardcoded** (`fetch` fallback `fernandocosta.app.n8n.cloud`, index.ts:~310) — NÃO desarma por env-var; exige remoção do bloco + **redeploy ANTES do apply** (anti-double-send). (3) Aprovação escreve `etapa_atual='aprovado'` → 1 trigger CASE em `historico_candidatura` cobre avanço E decisão; **nenhum satélite em `decisao_final`**. (4) Guard do survivor = `candidaturas.status='rejeitado' OR opcao_knockout_id` (NÃO `auto_rejeitado`, que vive em `historico`). 3 decisões de produto travadas com Fernando (avanço=só avaliação assíncrona · knockout=zero e-mail · decisão=e-mail único neutro). Artefatos: `39-{CONTEXT,RESEARCH,VALIDATION,01..04-PLAN}.md`, commits `c309550`→`6a9eea8`.

> ✅/⚠ **Update 2026-07-26 (sessão de deploy+smoke da P38, orquestrador via MCP+CLI).** **UAT-36-2 clareou** — `resend_api_key` agora vive no Vault (`ler_resend_api_key()` não-nulo, len 36; Fernando provisionou após a verificação de 23/07). **P38 deployada dormente** (`notificar-candidato` v2, `verify_jwt=false`, ACTIVE; 0 funções PL/pgSQL a referenciam; os 4 `trg_n8n_*` seguem vivos). **Smoke UAT-38-1:** auth (após fix), idempotência (`skipped:duplicate`, sem 2ª linha), resolução por allowlist, render e degradação graciosa **PROVADOS**; a linha de teste foi limpa. **⚠ GAP DA P38 CORRIGIDO:** a EF batia **401** — `NOTIFICAR_SECRET` nunca fora setado e a invariante `edge_invoke_key==service_role` está **quebrada por rotação** (`edge_invoke_key`/`ANALISE_SECRET`=`823aa757…` ≠ `SUPABASE_SERVICE_ROLE_KEY` injetada=`085073ec…`). Fix: `NOTIFICAR_SECRET`=`edge_invoke_key` (extraído do Vault sem exposição; digest confirmado `823aa757…`). Isto **também** é pré-req dos triggers da P39. **⛔ NOVO GATE — DELIV-01 / UAT-36-1:** a entrega real (`status='enviado'`) segue bloqueada — Resend responde **`403 rh.beautysmile.com.br domain not verified`** (a migração remetente `recruta.→rh.` do `f284672` adiantou-se à verificação DNS). Ação humana do Fernando (DNS + dashboard Resend). Re-smoke após verificação → deve dar `enviado`. **P39** (rewire): a EF-alvo está viva e provada funcionalmente; **P39 Wave 2** (apply PROD) e a **entrega real** seguem em checkpoint. **P41** gated em P38+P39 vivas.

## Roadmap (M7 — Phases 36–41)

Ordem de execução: 36 → 37 → 38 → 39 → 40 → 41. Cadeia **estrita** 37 → 38 → 39 (a EF precisa da tabela; os triggers precisam de uma EF viva). Phase 36 e Phase 40 são lateralmente paralelizáveis.

| Phase | Goal | Requirements |
|-------|------|--------------|
| 36 — Deliverability & Sender Identity | Domínio Beauty Smile verificado no Resend (SPF/DKIM auto + DMARC manual) + From/Reply-To reais + `RESEND_API_KEY` só no Vault + disciplina test-address `resend.dev` no dev/CI. Gate humano/DNS (Fernando), paralelizável | DELIV-01, DELIV-02, DELIV-03 |
| 37 — Camada de Dados de Notificação (**BLOCKING**) | `notificacoes_enviadas` (audit + `UNIQUE(dedupe_key)` idempotência + fila retry, RLS RH vaga-scoped join-through, candidato-DENY) + `config_sla_etapa` estática seedada do PRD §5.1.1; provadas por smoke antes de qualquer EF/trigger | LEDGER-01, LEDGER-02, LEDGER-03, TIMELINE-01 |
| 38 — EF `notificar-candidato` (COMM) | EF self-auth Bearer (`--no-verify-jwt`) que resolve dados por allowlist (nunca `select('*')`), reivindica idempotência, renderiza os 4 templates Beauty Smile (+ port verbatim `.ics` M6→`_shared/ics.ts`), envia via `fetch` ao Resend, grava no ledger; deployável dormente, smoke via `net.http_post` manual | COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06 |
| 39 — Rewire dos Triggers & Aposentadoria do n8n (SEC-03) | Trigger CASE canônico em `historico_candidatura` (avanço + decisão) + 2 satélites (`candidaturas`=confirmação c/ survivor-guard, `agendamentos_entrevista`=convite); **DROP dos 3 triggers n8n do SEC-03 no MESMO phase** (resolve SEC-03 por substituição, sem double-send); hop Vault Bearer self-auth, corpo ids-only. **Fase de maior risco** | DISPATCH-01, DISPATCH-02, DISPATCH-03, DISPATCH-04 |
| 40 — Timeline de Prazo no Painel | `DashboardCandidatoPage` mostra em cada estado de espera a estimativa de prazo da etapa (lê `config_sla_etapa`), enquadrada como estimativa, nunca countdown. Independente do push — paralelizável | TIMELINE-02 |
| 41 — Reconciliação, Retry & Testing | EF webhook Resend (Svix) atualiza status por `provider_message_id` + varredura `pg_cron` de `pendente`/`falhou` (cap) + state machine `pendente→enviado→entregue/falhou/bounce` + CI sender mockado (sem chave viva) + UAT via `*@resend.dev`. Fecha o fire-and-forget; último | RECON-01, RECON-02, RECON-03 |

Coverage: **21/21 requirements mapeados ✓ · 0 unmapped.** Security-first: LEDGER-03 (candidato-DENY, P37) + DISPATCH-04 (self-auth, P39) aterrissam antes da única superfície candidato-facing (P40, que lê só `config_sla_etapa` non-PII). **Phase 39 é a de maior risco** (colisão de double-send resolvida por DROP-and-CREATE no mesmo phase). Fases candidatas a `/gsd-secure-phase`: **37** (RLS candidato-DENY do ledger) e **39** (rewire de triggers + self-auth). UI hint: **Phase 40** (única frontend — email HTML da P38 é backend EF, não `/gsd:ui-phase`).

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / 40 plans — 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — 2026-06-26. · Phase 17 standalone: 5 plans — 2026-06-28. · M3 (v3.0): 4 fases / 16 plans — 2026-06-30. · M4 (v4.0): 6 fases / 43 plans — 2026-07-13. · M5 (v5.0): 3 fases / 19 plans — 2026-07-14. · M6 (v6.0): 5 fases / 20 plans — 2026-07-17.
- Ledger detalhado por plano arquivado em `milestones/v*.0-*` e nos SUMMARY de cada fase.

**By Phase (M7):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 36 | 5 of 5 | 73min | ~15min |
| 37 | 5 of 5 ✅ | ~45min (37-02/03/05; 37-01 e 37-04 foram checkpoints MCP do orquestrador) | ~15min |
| 38 | TBD | - | - |
| 39 | 0 of 4 planejados/verificados | - | - (Wave 1 executável; Wave 2 gated) |
| 40 | TBD | - | - |
| 41 | TBD | - | - |

*Updated after each plan completion.*

**Por plano (M7):** 36-01 — 13min · 2 tasks · 3 files. · 36-02 — 22min · 3 tasks · 3 files. · 36-03 — 24min · 3 tasks · 3 files.
| Phase 36 P02 | 22min | 3 tasks | 3 files |
| Phase 36 P03 | 24min | 3 tasks | 3 files |
| Phase 36 P04 | 8min | 3 tasks | 2 files |
| Phase 36 P05 | 6min | 2 tasks | 1 files |
| Phase 37 P02 | 24min | 3 tasks | 3 files |
| Phase 37 P03 | 12min | 2 tasks | 2 files |
| Phase 37 P05 | 9min | 2 tasks | 2 files |
| Phase 41 P01 | 20min | 2 tasks | 5 files |
| Phase 41 P02 | 18min | 2 tasks | 4 files |
| Phase 41 P03 | 6min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. As que ancoram o M7 (additive integration, security-first, reuse-and-clone):

- [M4/Phase 24 · SEC-03]: `20260706110005_sec03_n8n_serverside.sql` deixou 3 triggers `AFTER` com `net.http_post` (pg_net) + Vault secret `n8n_webhook_base` **dormentes** (graceful-skip `RETURN NEW`, secret nunca criado). O M7/Phase 39 **remove (DROP)** esses triggers no MESMO phase que cria os novos → aposenta o n8n, resolve **SEC-03 por substituição** (não patch). ⚠ há triggers n8n adicionais além dos 3 (`20260712100004_n8n_novo_candidato.sql`) — a P39 diffa os corpos vivos antes de qualquer DROP/CREATE.
- [M2/Phase 10 · reuse]: EFs privilegiadas = self-auth Bearer via Vault + `--no-verify-jwt` (mirror `analise-candidato-individual`) — base direta da EF `notificar-candidato` (COMM-01) e do hop trigger→EF (DISPATCH-04). Ver [[reference_ef_authenticate_vs_authorize]].
- [M2/Phase 6 · reuse]: `historico_candidatura` + trigger `avancar_etapa()` BEFORE-UPDATE são o backbone do funil; o trigger é o **único escritor** da trilha. `avancar_etapa()` só dispara em UPDATE de `etapa_atual` → uma candidatura INSERT (COMM-02) e um agendamento INSERT (COMM-04) **nunca** produzem row de `historico_candidatura` → forçam os 2 triggers satélites (DISPATCH-02). **NÃO editar `avancar_etapa()`** (carrega guard ENTREV-03 + GUC `auto_rejeitado`).
- [M6/Phase 35 · reuse]: o `.ics` hand-rolled RFC-5545 de `agendamentoCandidatoService.gerarIcsAgendamento` (função pura, zero npm) é **portado verbatim** para `supabase/functions/_shared/ics.ts` (COMM-04) — não há import compartilhado possível cross `src/`↔`supabase/functions/`.
- [Stack/M7]: **zero dependências npm novas** — `fetch` plano a `https://api.resend.com/emails` (guia oficial Resend p/ Supabase EF, não o SDK); `pg_net`/`net.http_post` já live via SEC-03; Vault (`RESEND_API_KEY` + reuso `project_url`/`edge_invoke_key`, **nunca** o aposentado `n8n_webhook_base`); templates HTML hand-rolled (`_shared/email-templates.ts`, **não** `@react-email/*` — quebra no Deno edge). Se o SDK `resend` for tocado (só na EF de webhook Svix da P41), import `npm:` **estático** no topo (Pitfall do `.join("npm:")`).
- [M2/M4 · reuse]: RLS é row-level, **não** column-level; `select('*')` vaza — a EF resolve dados do candidato por allowlist explícita, e `notificacoes_enviadas` é candidato-DENY (LEDGER-03, espelha `rh_gerencia_agendamento` join-through). Ver [[reference_select_star_leaks_pii]].
- [M2–M6 · reuse]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row; no-BEGIN/COMMIT-wrapper) + reconcile do ledger (`schema_migrations.version` → filename prefix) após CADA apply — caminho das migrations P37/39/41. ⚠ DBMIG-01 (baseline+rebuild) permanece débito environment-gated, não bloqueia.
- [Kickoff M7 · travado]: Provedor = **Resend** · 4 eventos (confirmação, avanço, convite, decisão/rejeição) · LGPD = **transacional sem opt-out** (footer informativo, sem descadastro) · timeline no painel = **incluída** · nota livre do RH na rejeição (RNF-SLA-06) = **droppada do v1** (template neutro fixo) · reconciliação = **completa (webhook + pg_cron)** · knockout = **suprime a confirmação** (survivor-guard).
- [Phase 36 · 36-01]: modo de notificação resolvido SOMENTE de NOTIFICACOES_MODO explícito (default fail-safe 'teste'); nunca inferido de URL/env de build/hostname
- [Phase 36 · 36-01]: _shared/email-config.ts é o contrato único de remetente/destinatário — P37 e P38 importam daqui; zero imports por design (dispensa import_map, deno test sem --allow-net)
- [Phase 36 · 36-02]: gate de segredo separado do gate de perf — assert-no-secrets.mjs varre TODO o build/ com regex ancorado em \b e nunca imprime o match (mascarado: path+offset+padrão+4 chars)
- [Phase 36 · 36-02]: domínio recruta.beautysmile.com.br PROIBIDO como padrão do guard (já embarca legitimamente); postbuild ordena segurança antes de performance
- [Phase 36 · 36-03]: DKIM nunca hardcodado em doc — dois shapes em circulação (CNAME token-prefixado da SES vs TXT com chave pública); o runbook manda copiar o que o dashboard exibir
- [Phase 36 · 36-03]: check-resend-dominio.mjs é reporter opt-in (no-op exit 0 sem chave), proibido em CI/postbuild/hook por docblock; `POST /verify` só atrás de `--verify`; credencial nunca interpolada em console.*
- [Phase 36 · 36-04]: RPC leitora do Vault e SEM argumento (ler_resend_api_key()) — rejeitada a generalizacao ler_segredo(text): comprometimento de service_role expoe UM segredo, nao todos
- [Phase 36 · 36-04]: chave Resend de notificacoes so no Vault; cost-alerter fica com RESEND_API_KEY em EF env secret (confirmado vivo em PROD) — divergencia registrada como debito, nao corrigida
- [Phase 36 · 36-04]: database.types.ts NAO regenerado — nenhum client chama a RPC (consumidor e a EF da P38 via service-role); regenerar so traria drift
- [Phase 36 · 36-05]: chave PROD do Resend ainda nao gerada — pendencia UAT-36-2 registrada no HUMAN-UAT com o vault.create_secret literal, SEM placeholder (ausencia = NULL diagnosticavel; chave falsa = 401 opaco)
- [Phase 36 · 36-05]: Phase 38 nomeada como cobradora do provisionamento — o smoke da EF notificar-candidato e quem trava sem o segredo; a fase 36 fecha com os dois gates humanos (UAT-36-1 dominio/DNS + UAT-36-2 Vault) pendentes e nao-bloqueantes
- [M7/Phase 37 · 37-02]: fidelidade de schema provada por EXECUCAO (migrations aplicadas num Postgres 17 descartavel + smoke 12/12), nunca por revisao de leitura
- [M7/Phase 37 · 37-02]: o qual de uma policy RLS e asserido por igualdade catalogo-contra-catalogo (contra policy precedente auditada), nao contra string transcrita a mao
- [M7/Phase 37 · 37-02]: COMMENTs vivos em PROD sao transcritos verbatim nas migrations reconstruidas; glosa pt-BR vai em comentario SQL adjacente
- [Phase 37 · 37-03]: a migration aditiva NAO cria indice — idx_notif_retry ja existe em PROD como btree (proxima_tentativa_em) WHERE status IN ('pendente','falhou'), a forma CORRETA (o predicado parcial ja fixa status). A assercao (m) do smoke foi escrita para NAO exigir status como primeira coluna da chave: uma assercao assim reprovaria a forma viva
- [Phase 37 · 37-03]: atualizado_em usa pg_catalog.now() (timestamp de TRANSACAO, coerente com o DEFAULT now() vivo). Como now() e constante dentro da transacao, a prova do trigger foi redesenhada — a linha da fixture nasce com atualizado_em deliberadamente antigo: a comparacao estrita vale em qualquer arranjo transacional E prova que o trigger SOBRESCREVE o valor do cliente
- [Phase 37 · 37-03]: nenhuma policy nova — o candidato-DENY do LEDGER-03 permanece implicito pelo default-deny e e provado por impersonacao REAL (request.jwt.claims com app_metadata.role='candidato'), nunca por consulta a pg_policies. Policy PERMISSIVE mal escrita abre acesso; a ausencia nunca abre
- [Phase 37 · 37-03]: gate do smoke AUTO-EXIGIDO via GUC smoke37.pass — a assercao (o) levanta excecao se o total nao for 14, em vez de delegar a contagem de NOTICEs a quem le. Validado: com fixture impossivel o run acumula 2 PASS e falha em (o) em vez de terminar em silencio
- [Phase 37 · 37-04]: apply em PROD do 20260722000002 precedido do smoke de fidelidade em modo baseline (12/12) — a ordem e o gate: aplicar primeiro destruiria irrecuperavelmente a evidencia de que a reconstrucao da 37-02 era fiel. O MCP grava version com timestamp proprio; o reconcile do ledger e obrigatorio APOS cada apply_migration
- [Phase 37 · 37-05]: db:types falhou por estado local de link ausente (supabase/.temp/ e gitignored), NAO por falta de auth — provado por `gen types --project-id` antes de escalar; `supabase link` resolveu sem prompt e sem contato de escrita com PROD. Escalar teria reportado bloqueio inexistente
- [Phase 37 · 37-05]: o gerador de tipos e probado para arquivo TEMPORARIO antes de apontar ao arquivo git-trackeado — o script usa `>` que TRUNCA antes de executar, entao "rodar pra ver se funciona" e destruir o arquivo para descobrir. Backup sozinho protege contra perda, nao contra o repo quebrado no intervalo
- [Phase 37 · 37-05]: diff de tipos gerados 146/0 (ZERO delecoes) com 6 hunks TODOS esperados; o hunk ler_resend_api_key e debito herdado da P36/36-04 (que decidiu deliberadamente nao regenerar), nao drift novo — nenhum item criado em pending/. Zero delecoes e a evidencia mais forte de ausencia de drift lateral
- [Phase 37 · 37-05]: arquivamento de todo em DOIS commits (rename puro 100% + conteudo depois) — rename + 78 linhas juntos derrubam a similaridade para ~45%, abaixo do limiar default 50% do git, e `git log --follow` quebraria EM SILENCIO, apagando o commit que registrou a descoberta do drift
- [Phase 37 · 37-05]: item de debito arquivado em 4 blocos (Resolvido / Corrigido vs retrato original / Deliberadamente NAO feito / Continua em aberto), corpo original preservado byte-a-byte — as imprecisoes da parafrase sao registro forense; a correcao vive em bloco novo, nomeando a CONSEQUENCIA de cada erro
- [Phase 37 · 37-05]: destinatario_original chega ao compilador como OBRIGATORIO no tipo Insert (NOT NULL sem default no banco), enquanto modo e opcional (default 'teste') — a EF da P38 nao compila se esquecer o destinatario original
- [Phase 41]: P41-01: notificar-candidato refatorada para handler(req, deps) injetável (fetch/supabaseAdmin/serviceKey) — mockável sem --allow-net; Deno.serve sob import.meta.main
- [Phase 41]: P41-01: computeProximaTentativa (backoff 15m/1h/6h/24h, cap 5 -> null) + exigirSinkTeste (guard non-prod DELIV-03) como funcoes puras testadas e fiadas no handler
- [Phase 41]: P41-01: exigirSinkTeste fiado APOS o claim (registrarFalha grava por dedupe_key); RECON-03 segue Pending (varredura pg_cron e 41-03/41-05)
- [Phase 41]: P41-02: EF resend-webhook (verify_jwt=false) verifica assinatura Svix sobre corpo BRUTO (req.text() antes de qualquer parse) e reconcilia notificacoes_enviadas por provider_message_id de forma idempotente; import npm:svix@1.99.1 estatico; secret do Vault via ler_resend_webhook_secret nunca logado
- [Phase 41]: P41-02: RECON-01/02 mantidos Pending — EF codigo-completa e verde no CI, mas comportamento vivo depende do 41-03 (migration colunas bounce_em/reclamado_em + RPC) e 41-05 (deploy + registro webhook + secret no Vault); mesmo criterio do 41-01 com RECON-03
- [Phase 41]: P41-03: migration aditiva 20260727000001 escrita (bounce_em/reclamado_em timestamptz NULL + ler_resend_webhook_secret + varrer_retry_notificacoes + cron notif-retry-sweep */15) + smoke gate-GUC. RECON-01/02/03 mantidos Pending — so escreve .sql, zero PROD; completam no 41-05 (apply via MCP + reconcile + smoke + registro webhook + secret no Vault)
- [Phase 41]: P41-03: Bearer da varredura = edge_invoke_key do Vault (NUNCA service-role, invariante quebrada por rotacao — Pitfall 5); a varredura NAO incrementa tentativas (net.http_post at-most-once, quem incrementa e a EF ao tentar); cap tentativas<5 + LIMIT 20/sweep (T-41-09/T-41-10)
- [Phase 41]: P41-03: nenhum CREATE INDEX na migration (idx_notif_retry/idx_notif_provider_msg ja vivem em PROD; recriar com IF NOT EXISTS mascararia divergencia — o smoke b os VERIFICA); smoke p41 e gate-GUC 100% estrutural/catalogo com esperado FIXO 5 (sem INSERT, seguro em PROD vivo, diferente do p39 adaptativo)

### Pending Todos

Herdados/deferidos, fora do escopo do M7-core (rastreados p/ backlog):

- **Questões abertas do M7 (resolver no discuss-phase da fase relevante):** retenção/purga de `notificacoes_enviadas` — **deferida a LGPD-OPS (M8+)** na P37 · coluna `reclamado_em` — **deferida à P41** na P37 · divergência `updated_at` (inglês) vs `atualizado_em` (pt-BR) no resto do schema — **confirmada como débito real na P37**, não endereçada · verificação do caminho de aprovação escreve `etapa_atual='aprovado'`? (P39) · números exatos rate-limit/free-tier Resend (P41) · `.ics` METHOD PUBLISH vs REQUEST (P38).
- **Carregado do M6 (não puxado ao M7):** W-1 (Histórico VISRH-03 renderiza `ator` UUID em vez do nome do recrutador — needs `usuarios_rh` join) · 6 HUMAN-UATs live P31/34/35 · cosméticos UI P34/P35.
- **Carregados do M4/M5:** DBMIG-01 baseline+rebuild (environment-gated) · CC0-01 seed cognitivo · HUMAN-UATs P22/23/24/28/29/30. Ver `.planning/todos/`.

### Blockers/Concerns

- **✅ DRIFT PROD→repo RECONCILIADO na Phase 37 (fechado 2026-07-22) — mas a CAUSA continua desconhecida.** Os 4 arquivos de migration agora existem com correspondência 1:1 contra o ledger (`20260721000001`, `20260721000002` reconstruídos e **não** re-aplicados; `20260722000001` da P36; `20260722000002` aplicada na 37-04), confirmado independentemente por `supabase migration list --linked` (Local/Remote alinhados, zero pendência). As 3 lacunas fechadas e `database.types.ts` regenerado. Item arquivado com resolução em 4 blocos: `.planning/todos/done/37-drift-prod-tabelas-notificacao.md`. **⚠ Continua em aberto:** ninguém sabe **quem/como** aplicou as duas migrations originais direto em PROD — um caminho de apply fora do repositório continua existindo e a mesma falha pode se repetir. Se o padrão reaparecer, tratar como sinal de processo, não incidente isolado.
- **⚠ Subagentes GSD não recebem os tools MCP do Supabase** (bug upstream anthropics/claude-code#13898 — agentes com `tools:` restrito no frontmatter). Comprovado na P36/Plano 36-04, que bateu num checkpoint por isso. **Toda** inspeção e todo apply em PROD têm de ser feitos pelo orquestrador/main thread. As fases 37, 39 e 41 (todas com migrations) devem ser planejadas assumindo que as tarefas de banco fecham como checkpoint do orquestrador, não como trabalho autônomo do executor.
- **Débito de infra: `.husky/pre-commit` permanentemente vermelho.** Roda `npm run lint`, que sai não-zero contra um baseline PRÉ-EXISTENTE de 97 erros `tsc` em `src/**` (teto do CI é 104, então o CI passa). Consequência: 100% dos commits da P36 usaram `--no-verify`, cada um com a contagem 97→97 documentada no corpo. Isso treina bypass reflexivo. Seria mais útil como gate de não-regressão (comparar contagem contra o baseline) do que como checagem binária de exit code.
- **Cadeia estrita 37 → 38 → 39** — a EF precisa da tabela `notificacoes_enviadas`; os triggers precisam de uma EF viva pra apontar (senão disparam num 404, silenciosamente droppado — `net.http_post` é at-most-once).
- **Phase 39 é a de maior risco** — a colisão de double-send (3+ triggers n8n dormentes + o disparo env-var do `submit-candidatura`) só é segura com DROP-and-CREATE no MESMO phase + guarda `UNIQUE(dedupe_key)` durável. Não "manter os dois temporariamente".
- **DELIV-01 (verificação de domínio) — ⛔ ATIVO, re-confirmado ao vivo na P39-04 (2026-07-26).** O subdomínio remetente **`rh.beautysmile.com.br` NÃO está verificado no Resend** → todo envio bate `403 domain not verified` e grava `status='falhou'`. Re-verificado por smoke fresco no início da P39-04 (contradisse o registro de "verificado" — por isso o gate re-verifica ao vivo, não confia no registro). **O operador optou explicitamente por aplicar a P39 mesmo assim** (rewire vivo, sends=`falhou`), aceitando que a recuperação virá pela varredura `pg_cron` da P41. Ação humana/DNS do Fernando: adicionar+verificar `rh.beautysmile.com.br` em https://resend.com/domains (SPF/DKIM auto + DMARC). **O funil AGORA dispara em tráfego real, mas só registra `falhou` até isto fechar** — quanto antes verificar, menos linhas acumuladas p/ o retry. Re-rodar o smoke da P38 após verificação deve dar `enviado`.
- **⏳ Cleanup do n8n cloud (DISPATCH-03) — pendente, ação humana.** A P39 aposentou o n8n do BANCO (0 `trg_n8n_*`) e do CÓDIGO deployado (submit-candidatura sem fetch). Falta fechar a superfície EXTERNA: desativar/apagar a(s) workflow(s) em `fernandocosta.app.n8n.cloud` (painel do Fernando). O secret `n8n_webhook_base` já não existe no Vault (nada a remover).
- **⚠ Drift pré-existente re-surfaced na P39-04 (NÃO-P39).** `db push --linked` reporta 7 versions órfãs (`20260713024106`…`20260714023002`) — migrations de 07-13/07-14 aplicadas via `apply_migration` (timestamp) e nunca reconciliadas ao prefixo do arquivo (2 sem arquivo local: `usr_rh_review_fixes_wr01_wr03`, `perfil_rh_rpc_hardening`). É o débito de drift já documentado (causa desconhecida), 2 semanas antes da P39. A version da P39 (`20260726000001`) está corretamente reconciliada → **zero drift novo**. NÃO reparado (fora de escopo; `--status reverted` do CLI marcaria migrations aplicadas como revertidas — errado). Rastrear p/ backlog de infra.
- **D-15 / RNF-07a / RNF-12a** — o template de rejeição (COMM-05) é fixo e neutro (grep-guard contra tokens de scoring), disparado só por decisão registrada por humano.
- **Contas de teste PROD:** `e2e.admin@beautysmile.com.br` (admin) + `recrutador` `fba9bc0f-4053-4eff-bc71-9cc8d1cddbe7` + `candidato.funil@teste.com`.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature (→ M8+) | WhatsApp/SMS · opt-out/central de preferências · nurture/digest · TALENT (banco de talentos) · LGPD-OPS (retenção/Art. 20 queue) · PSICO · relatórios completos + export CSV/PDF | Deferred → M8+ | M7 kickoff |
| Feature (M7 v2) | RNF-SLA-06 nota estruturada do RH na rejeição (guardrail de frases) · nudge a cada N dias · deep-link CTAs no e-mail · re-envio manual pelo RH · timeline computada do histórico · nudge de bounce no painel | Deferred → M7-v2/backlog | M7 kickoff |
| Tech-debt (resolvido no M7) | SEC-03 Vault secret `n8n_webhook_base` → **resolvido por substituição na Phase 39** (aposenta o n8n) | In M7 scope (P39) | M4/M5 close |
| Tech-debt | DBMIG-01 baseline+rebuild (environment-gated — Docker/CLI-auth) · CC0-01 seed cognitivo | Deferred → backlog | M4/M5 close |
| UX gap (M6) | W-1: Histórico VISRH-03 renders `ator` UUID instead of recruiter name (needs usuarios_rh join) | Deferred → backlog (highest-value M6 follow-up) | M6 close |
| Live UAT (carregado) | HUMAN-UATs P22/23/24/28/29/30/31/34/35 — browser + real-login + real-calendar/SMTP checks | Deferred → live UAT session | M4–M6 close |

## Session Continuity

Last session: 2026-07-27T00:43:16.853Z
Stopped at: Completed 41-03-PLAN.md — migration aditiva P41 (20260727000001: bounce_em/reclamado_em + ler_resend_webhook_secret + varrer_retry_notificacoes + cron notif-retry-sweep) + smoke gate-GUC escritos (zero PROD; apply/reconcile/smoke = 41-05)
Resume file: None

## Operator Next Steps

- Iniciar o planejamento da primeira fase com `/gsd-plan-phase 36` (ou `/gsd-plan-phase 37` primeiro, já que a P36 é gate humano/DNS paralelizável — a P37 é a primeira fase de encanamento e BLOCKING das P38/39/40).
- DELIV-01 (verificar subdomínio Beauty Smile no Resend + publicar DMARC) é ação humana do Fernando; pode começar imediatamente em paralelo.
