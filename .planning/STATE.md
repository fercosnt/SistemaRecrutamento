---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: M8 Dados do Candidato & Direitos do Titular (LGPD-OPS)
current_phase: 43
current_phase_name: Consentimentos Honestos & Política de Retenção
status: executing
stopped_at: Completed 43-04-PLAN.md
last_updated: "2026-08-01T22:23:04.929Z"
last_activity: 2026-08-01
last_activity_desc: Phase 43 execution started
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 21
  completed_plans: 16
  percent: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-29 — M8/v8.0 kickoff, `## Current Milestone`)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 43 — Consentimentos Honestos & Política de Retenção

## Current Position

Phase: 43 (Consentimentos Honestos & Política de Retenção) — EXECUTING
Plan: 5 of 9
Status: Ready to execute
Last activity: 2026-08-01 — Phase 43 execution started

## Roadmap (M8 — Phases 42–47)

Ordem de execução: `42 → 43 → 44 → 45 → 46`, com **47 lateralmente paralelizável com 46**.
Cadeia **estrita** `44 → 45 → 46` (o inventário do export **é** o plano de exclusão; um cron sobre motor destrutivo não provado é como bug vira incidente).
`43 → 44` é preferencialmente sequencial: CONSENT-02 adiciona colunas a `candidatos` e EXPORT-04 é justamente o snapshot que detecta coluna nova — em paralelo o snapshot fica vermelho por desenho.

| Phase | Goal | Requirements |
|-------|------|--------------|
| 42 — Inventário, Gates & Fila Art. 20 | O RH vê e responde os pedidos de revisão que hoje gravam um timestamp que ninguém lê; e o mapa do que existe (PII coluna-a-coluna, PITR/Storage-sem-backup, diff dos crons vivos, varredura `ADD COLUMN IF NOT EXISTS`) vira fato datado **antes** de qualquer linha destrutiva. Inclui a consulta "quantos pedidos já estão pendentes em PROD hoje", entregue antes de qualquer tela | INVENT-01..05, REVISAO-01..06 (11) |
| 43 — Consentimentos Honestos & Política de Retenção | Todo checkbox ganha consequência real (desmarcado por padrão, versão+hash+timestamp do texto aceito, transacional separado de marketing com opt-out honrado, click tracking desligado) e a janela de retenção existe como config alterável sem deploy + prévia read-only. **Zero ação destrutiva por desenho** | CONSENT-01..06, RETEN-01/02/03/04/06 (11) |
| 44 — Exportação & Acesso | Candidato pede cópia dos dados pelo painel; JSON por allowlist explícita (nunca `select('*')`), CV por signed URL de TTL curto, chaves cobertas por snapshot test, prazo Art. 19 II (15 dias) visível ao RH. O inventário nasce aqui **exercitado**, e a Phase 45 o consome | EXPORT-01..06 (6) |
| 45 — Motor de Exclusão & Anonimização ⚠️ **MAIOR RISCO** | "Retirar candidatura" ≠ "apagar meus dados"; janela de arrependimento cancelável; execução `Storage → Postgres → Auth` idempotente com caminhos capturados antes da 1ª mutação; tombstone in-place via RPC DEFINER; recibo honesto em 2 colunas. **Snapshot de bias com faixa etária materializada ANTES de qualquer anonimização**; as 3 FKs `NO ACTION` nunca relaxadas; as 5 tabelas `SET NULL` tratadas | ERASE-01..10 (10) |
| 46 — Purga Automática (dry-run → live) | Cron espelhando `notif-retry-sweep`; dry-run pela MESMA query do delete real em rollback; 1ª ativação em PROD é dry-run por período documentado; flip dry-run→live como checkpoint separado (espelho do `NOTIFICACOES_MODO`); cap de blast-radius + kill switch; predicado NULL-safe por allowlist de estados terminais; ledger de execuções + retenção de `notificacoes_enviadas` | PURGA-01..07, RETEN-05 (8) |
| 47 — Transparência & Consolidação | Página pública de compartilhamento (Art. 18 VII) + "o que guardamos e por quê" derivada da matriz como **dado**; `ator` UUID → nome do recrutador (W-1); zumbi `data_deletion_log` resolvido; checklist "toda promessa de retenção/exclusão tem código que a executa"; veredito Nyquist das 6 fases do M7 | TRANSP-01/02, CONSOL-01..04 (6) |

Coverage: **52/52 requirements mapeados ✓ · 0 órfãos · 0 duplicados.**

**Fase de maior risco: 45.** Mutação de três sistemas genuinamente **não-atômica** (Storage → Postgres → Auth), **sem transação compartilhada**, sobre PII viva, com backups do Supabase de 7 dias que **excluem Storage inteiramente** — um CV apagado é irrecuperável por qualquer meio.

**Portão de fase destrutiva (exit criterion de ROADMAP, não conselho):** fases **45** e **46** integralmente, **42** só em INVENT-05 (edita predicado de `DELETE` cron vivo) e **47** só em CONSOL-03 (`DROP` de tabela com escritor vivo). Exige: `VERIFICATION.md` com veredito (nunca ausente/`draft`) · code review bloqueante **antes** do apply em PROD · asserções **negativas** (o que NÃO aconteceu) · **zero `--no-verify`** · dry-run/rollback exercitado pela mesma query do delete real. Origem: a P39 fechou sem VERIFICATION.md nem code review e 2 CRITICAL chegaram a PROD.

Candidatas a `/gsd-secure-phase`: **45** e **46** (obrigatórias) · **44** (superfície de exfiltração de PII por desenho) · **42** (autorização server-enforced REVISAO-05 + EF nova `notificar-rh`).
UI hint (frontend): **42** (fila RH), **43** (`AutorizacoesStep` + revogação no painel), **44** (pedido de cópia), **45** (fluxo de exclusão — mais forte candidata a `/gsd-ui-phase`: ambiguidade de copy vira ação irreversível), **47** (2 páginas públicas + Histórico). **46** não é frontend.

⚠ **Risco nomeado na Phase 42:** REVISAO-04 exige **uma edição cirúrgica na EF `notificar-candidato` viva** (vocabulário de evento fechado em código **e** em CHECK constraint no banco) — **o mesmo arquivo que já embarcou 2 defeitos CRÍTICOS em produção** (P39 CR-01/CR-02) e cujo W-01 (preheader não ramificado) era invisível a asserções que olham só o texto visível.

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / 40 plans — 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — 2026-06-26. · Phase 17 standalone: 5 plans — 2026-06-28. · M3 (v3.0): 4 fases / 16 plans — 2026-06-30. · M4 (v4.0): 6 fases / 43 plans — 2026-07-13. · M5 (v5.0): 3 fases / 19 plans — 2026-07-14. · M6 (v6.0): 5 fases / 20 plans — 2026-07-17. · **M7 (v7.0): 6 fases / 25 plans — 2026-07-28.**
- Ledger detalhado por plano arquivado em `milestones/v*.0-*` e nos SUMMARY de cada fase. O ledger por plano do M7 está em `milestones/v7.0-*`.

**By Phase (M8):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 42 | TBD | - | - |
| 43 | TBD | - | - |
| 44 | TBD | - | - |
| 45 | TBD | - | - |
| 46 | TBD | - | - |
| 47 | TBD | - | - |

*Updated after each plan completion.*

**Por plano (M8):** _(vazio — nenhum plano do M8 executado)_
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 42 P01 | ~35min | 3 tasks | 5 files |
| Phase 42 P07 | ~55min | 2 tasks | 6 files |
| Phase 42 P11 | ~30min | 2 tasks | 6 files |
| Phase 42 P08 | ~50min | 2 tasks | 8 files |
| Phase 42 P10 | ~25 min | 3 tasks | 12 files |
| Phase 42 P12 | ~45min | 1 task (2 checkpoints pendentes) tasks | 4 files files |
| Phase 43 P01 | 50min | 3 tasks | 15 files |
| Phase 43 P02 | ~35min | 3 tasks | 9 files |
| Phase 43 P03 | ~35min | 3 tasks | 9 files |
| Phase 43 P04 | ~10min | 3 tasks | 2 files |

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions.

**Ancorando o M8 (LGPD-OPS) — decisões de roadmap tomadas em 2026-07-29:**

- [M8/roadmap]: **6 fases (42–47), numeração continuando do M7** (que terminou na 41). 52/52 requirements mapeados, 0 órfãos, 0 duplicados. Ordem `42 → 43 → 44 → 45 → 46`, com **47 ∥ 46**.
- [M8/roadmap · desvio da pesquisa]: **CONSENT ficou íntegro na Phase 43** em vez de dividido (01/02 na 42, 03–06 na 43) como a pesquisa propôs. Razão: CONSENT-02 grava o **hash do texto** que CONSENT-03 **reescreve** — separá-los faria a versão 1 do texto embarcar já sabendo que seria superada uma fase depois, com 2 migrations e 2 edições da EF de cadastro sobre o mesmo formulário. Além disso INVENT-04 (varredura `ADD COLUMN IF NOT EXISTS`) fica **antes** da migration que adiciona colunas a `candidatos` — a tabela exata onde o drift de FK vive.
- [M8/roadmap · lacuna de cobertura da pesquisa]: **TRANSP-01/02 não aparecia em nenhuma fase** da proposta de 6 fases da pesquisa. Mapeados à **Phase 47** — TRANSP-02 tem de descrever o que o sistema **faz**, não o que promete, e pareado com CONSOL-04 (checklist "toda promessa tem código") a página pública e a auditoria se checam mutuamente.
- [M8/roadmap]: **RETEN-05** (retenção de `notificacoes_enviadas`) mapeado à **Phase 46**, não à 43. A *linha* na matriz nasce na 43, mas o requirement diz "definida **e aplicada**", e a aplicação é `DELETE` por cron — pôr um cron destrutivo na 43 quebraria a propriedade *zero-ação-destrutiva* que torna aquela fase segura de executar cedo.
- [M8/roadmap · **portão de fase destrutiva**]: adotado como **exit criterion de ROADMAP**, não conselho em prosa. Toda fase que escreva `DELETE`/`UPDATE` destrutivo, altere predicado de purga vivo, ou faça `DROP` de objeto com escritor vivo só fecha com: `VERIFICATION.md` **com veredito** (nunca ausente/`draft`) · code review bloqueante **antes** do apply em PROD · **asserções negativas** (o que NÃO aconteceu) · **zero `--no-verify`** · dry-run pela **mesma query** do delete real em rollback. Aplica-se a **45** e **46** integralmente, a **42** só em INVENT-05, a **47** só em CONSOL-03. **Origem:** a P39 fechou sem VERIFICATION.md nem code review e 2 CRITICAL chegaram a PROD — aqui a feature central é **irreversível** e o mesmo erro não é recuperável.
- [M8/roadmap]: **Phase 45 é a de maior risco** — mutação de 3 sistemas não-atômica sem transação compartilhada, sobre PII viva, com backup de 7 dias que **exclui Storage inteiramente**. `DELETE FROM storage.objects` via SQL órfã o blob permanentemente; o único caminho é a Storage Admin API a partir de EF.
- [M8/ambiente]: **subagentes GSD não recebem os tools MCP do Supabase** — toda migration, inspeção PROD e deploy de EF é checkpoint do orquestrador. **As 6 fases carregam trabalho de DB ou EF**, então isso é premissa de planejamento de wave, não descoberta de meio de fase.
- [M8/stack]: **zero npm novo, zero extensão nova.** `pg_cron` 1.6.4 · `pg_net` 0.19.5 · `pgcrypto` 1.3 · `supabase_vault` 0.3.1 vivas e versionadas. `anon` **ausente do catálogo** (não-instalável) → o primitivo de anonimização é tombstone `UPDATE` in-place via RPC `SECURITY DEFINER`.
- [M8/fonte de verdade]: **`.planning/research/FK-AUDIT-LIVE.md` tem precedência** sobre `STACK.md`/`ARCHITECTURE.md` em qualquer questão de `ON DELETE` ou estado de schema — aqueles leram arquivos de migration, aquele é `pg_constraint`.

**Herdadas do M7 (additive integration, security-first, reuse-and-clone) — seguem válidas:**

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
- [Phase 41]: P41-04: branch retry na EF notificar-candidato gateado por retry_id — pula o claim-before-send, re-tenta a linha EXISTENTE por id, incrementa tentativas (row+1) com backoff (null no cap 5); caminho normal preservado byte-a-byte
- [Phase 41]: P41-04: guard de elegibilidade do retry (ausente|status terminal|tentativas>=5 -> 200 nao_elegivel) roda LOGO apos o parse, antes da resolucao de dados/envio (T-41-14 cap 5); exigirSinkTeste preservado no retry (fora do if !retry_id)
- [Phase 41]: P41-04: header Idempotency-Key = retry_id ?? dedupe_key no fetch do Resend (cinto secundario 24h LEDGER-02/T-41-15) nunca logado; RECON-01/03 seguem Pending ate 41-05 (deploy+apply cron)
- [Phase 41 · 41-05]: o gate de supply-chain do `npm:svix` foi provado por INTEGRIDADE, não por leitura de página — o sha512 do `deno.lock` foi comparado 1:1 com `registry.npmjs.org` nos 4 pacotes do fecho transitivo. "Sem postinstall" checado na árvore INTEIRA (svix → standardwebhooks → @stablelib/base64, fast-sha256), não só no pacote de topo
- [Phase 41 · 41-05]: `ERR_MODULE_NOT_FOUND` (Pitfall 2) é descartável SEM o secret provisionado — se a EF devolve uma string do PRÓPRIO código (`misconfigured`), o grafo de módulos carregou; um import npm quebrado falha no BOOT e nunca alcança o corpo do `Deno.serve`. O cold start de 2173ms nos logs é a assinatura da resolução npm bem-sucedida
- [Phase 41 · 41-05]: o smoke gate-GUC precisa rodar numa ÚNICA chamada `execute_sql` — `set_config(..., false)` é escopado à sessão, e statements espalhados por chamadas separadas do MCP zerariam o contador e reprovariam em (z) por run parcial
- [Phase 39 · gap closure]: o redeploy foi a PRÉ-CONDIÇÃO de tudo o mais, não um passo paralelo — aplicar o 41-05 (ou fechar DELIV-01) antes dele converteria CR-01/CR-02 de latentes em dano real a candidatos. A contenção pelo `403 domain not verified` era acidente de configuração, nunca um controle
- [Phase 41 · UAT ao vivo]: o pipeline foi provado PONTA-A-PONTA com um envio REAL (2026-07-28) — dispatch via net.http_post (Bearer do Vault, dentro do SQL) → EF → Resend → webhook Svix real → ledger `entregue` em 5s. Prova simultânea de 3 coisas que estavam abertas: DELIV-01 FUNCIONA (o 403 acabou, `status='enviado'` + provider_message_id real), NOTIFICACOES_MODO='teste' está ativo (confirmado pelo `modo` GRAVADO no ledger, não por leitura de config), e RECON-02 pelo caminho real (a prova anterior usava assinatura sintética)
- [Phase 41 · UAT ao vivo]: usar a candidatura de funil E2E (`candidato.funil@teste.com`) tornou o teste seguro POR CONSTRUÇÃO — em modo teste o destino vira `delivered+<evento>@resend.dev` e o candidato real nunca é contatado, enquanto `destinatario_original` preserva a trilha de auditoria. A linha foi removida ao fim porque o `dedupe_key` bloquearia uma confirmação futura legítima daquela candidatura
- [Phase 41 · 41-05 T3]: a assinatura Svix foi computada DENTRO do Postgres (`extensions.hmac` sobre `{svix-id}.{svix-timestamp}.{payload}`, chave = `decode(substring(secret from 7),'base64')`) — o `whsec_` nunca saiu do banco e nunca entrou no contexto do agente nem em linha de comando. Só a assinatura viajou, e ela vale exclusivamente para aquele payload/timestamp/msg-id. Padrão reutilizável p/ qualquer prova futura de webhook assinado
- [Phase 41 · 41-05 T3]: o `GET → 405` é o discriminador que separa "passou do gate do Vault" de "falhou antes dele" — com o secret ausente TODO método dava 500 (a leitura do Vault acontece no `Deno.serve`, antes do `handler`, onde vive o check de método). 405 prova que a execução alcançou o handler; 400 prova que alcançou o verify do Svix
- [Phase 41 · 41-05 T3]: colunas novas de migration devem ser provadas por ESCRITA REAL do consumidor, não só por catálogo — `bounce_em` foi validada pelo webhook gravando nela, o que também prova que a reconciliação é cirúrgica (cada evento toca só a sua coluna, sem apagar `entregue_em`)
- [Phase 39 · gap closure]: a ordem guard × claim é a parte que importa do fix de CR-02 — o survivor-guard na linha 192 roda ANTES do claim (linha 250), então um knockout não deixa linha `pendente` para a varredura `*/15` da P41 re-tentar. Guard depois do claim teria fechado o e-mail e aberto um retry órfão
- [Phase 42 / 42-07]: Adicionar evento ao ledger `notificacoes_enviadas` exige estender o CHECK `notificacoes_enviadas_evento_check` na MESMA entrega — o plano 42-07 omitiu isso e a EF do RH falharia com 23514 em todo claim, entregando um no-op silencioso. Ler a forma VIVA da tabela, nunca a lista de sítios que o plano enumera
- [Phase 42 / 42-07]: `dedupe_key` por DESTINATÁRIO quando um evento tem N recipientes: chave só por candidatura faria o 1º RH consumir o claim e 4 de 5 pessoas receberem skipped:duplicate em silêncio
- [Phase 42 / 42-07]: Evento sem sweep de retry grava `proxima_tentativa_em` NULO — agendar tentativa que nada consumirá é afirmação falsa no ledger (mesma classe do truque `tentativas = 5` que o plano rejeitou). A fila /rh/revisoes é a superfície durável
- [Phase 42 / 42-07]: Allowlist de log é POR Edge Function, nunca importada da EF vizinha: `dedupe_key` é logável em notificar-candidato e PROIBIDA em notificar-rh porque ali embute o candidatura_id completo e o user_id
- [Phase 42 / 42-11]: a superfície do candidato NUNCA usa os 3 RPCs RH-only do Art. 20 (revogados de anon na 20260730000002) — a leitura é own-row por PostgREST sob a policy candidato_le_propria_decisao, e a única escrita do candidato é solicitar_revisao_decisao. Confundir os dois lados produziria 42501 em toda a tela
- [Phase 42 / 42-11]: veredito da revisão é narrowed para união literal com normalização defensiva no cliente — o CHECK do banco já fecha o vocabulário, mas um invariante REMOTO é a coisa errada para uma decisão de RENDERIZAÇÃO se apoiar: valor novo fecha a superfície em vez de ecoar token cru ao candidato
- [Phase 42 / 42-11]: critério de aceitação com grep negativo sobre literal (revisao_por_usuario, text-xs) é satisfeito montando o literal em runtime no teste (['text','xs'].join('-')) — a asserção fica real e o literal proibido não passa a existir na feature, nem dentro do teste que o proíbe
- [Phase 42 / 42-11]: RED commit separado é IMPOSSÍVEL para superfície de API nova neste repo — referenciar símbolo/prop inexistente eleva a contagem tsc acima da baseline congelada de 97 e o hook reprova. O RED foi commitado onde tipa (asserções de valor) e verificado empiricamente onde não tipa; contorcer com 'as unknown as' trocaria força de asserção por cerimônia
- [Phase 42]: 42-08: a prévia de caixa de entrada do 5º evento NÃO ramifica por veredito — decisão escrita no PREHEADERS e pinada por igualdade literal (T-42-V2c); ramificar entregaria o desfecho do Art. 20 na lista de e-mails
- [Phase 42]: 42-08: a EF notificar-candidato passou a LER decisao_final.revisao_veredito (guardado por evento) — sem isso a ramificação do corpo seria código morto: teste provando o que nenhum e-mail alcança
- [Phase 42]: 42-08: um Record<União,…> é sítio de vocabulário forçado pelo compilador mesmo vivendo no corpus de TESTE — o plano contava 4 sítios, o compilador apontou 5
- [Phase 42]: 42-10: a recusa GUARD_DECISOR NAO vira toast — o hook fica calado e o dialogo renderiza alerta inline permanente sem retry; tentar de novo nunca funciona porque a recusa e sobre QUEM e o usuario
- [Phase 42]: 42-10: responderRevisao chama a RPC MESMO quando o guard vai recusar (teste prende isso) — atalhar no cliente moveria a barreira para o cliente, e qualquer DevTools a desliga
- [Phase 42]: 42-10: slot badge do MenuItem ALARGADO para string em vez de derivar o rotulo no render — duas fontes de verdade sobre 'como um contador aparece' e como um 0 volta a vazar; o render virou ternario porque '0 && …' avalia para 0 e o React o renderiza como texto
- [Phase 42]: 42-10: asserção de copy em dialogo tem de ler document.body — conteudo em portal deixa container.textContent vazio, e toda asserção negativa passa sem olhar nada (3 falsos verdes encontrados)
- [Phase ?]: [Phase 42 / 42-12]: a consulta `@> ARRAY[NULL]::uuid[]` do §E5 da pesquisa devolveria false SEMPRE (contenção compara por igualdade; igualdade contra nulo nunca é verdadeira) — a coluna que diz se o defeito está latente ou armado reportaria 0 em silêncio, o MESMO modo de falha que o INVENT-05 corrige. Usado array_position(...,NULL) IS NOT NULL, que 02-cron-live.sql:65 já usava: a pesquisa contradizia um artefato versionado da própria fase, e ganhou o artefato
- [Phase ?]: [Phase 42 / 42-12]: fidelidade de corpo de cron asserida por md5, não por string literal — o critério proibia verbo de escrita dentro do smoke, e transcrever o corpo esperado o traria de volta. O md5 satisfaz os dois e é MAIS forte que a forma proibida (pega espaço a mais/quebra de linha a menos). Resumo derivado por EXECUÇÃO sobre o arquivo, com bloco de proveniência + comando de recomputação no cabeçalho, idioma da baseline do .husky/pre-commit
- [Phase ?]: [Phase 42 / 42-12]: consulta de raio de impacto carimba a PRÓPRIA data (coletado_em_utc, 6ª coluna) — o portão exige fato datado, e data que depende de alguém lembrar de anotá-la é promessa sem código que a execute; sem carimbo no output não há como distinguir uma medição de hoje de uma colada de 2026-07-29 (Pitfall 7)
- [Phase ?]: [Phase 42 / 42-12]: o bloco do corpo ANTERIOR no cron-inventory.md ficou marcado como não-editável e a seção 'Depois da correção' foi escrita ANTES do apply com células ⏳ ('campo do checkpoint, não resultado'). Sobrescrever o 'antes' destrói a única evidência que torna o 'depois' interpretável (T-42-42); preencher com números plausíveis seria fabricar evidência
- [Phase ?]: A3 resolvida por execucao: o import cross-boundary src/ -> supabase/functions/*.json ATRAVESSA (Vite, Vitest, tsc). Texto de consentimento tem fonte UNICA, sem espelho.
- [Phase ?]: autorizacoesSchema ganhou .strict() proprio: o .strict() do schema pai so fecha o nivel superior; sem ele autorizacao_analise_video seria DESCARTADA em silencio com 200 em vez de rejeitada com 400.
- [Phase ?]: BD-5 em vigor: autorizacao_marketing_vagas nasce NULL para toda a base historica e NULL = NAO autorizado. Zero candidato ja cadastrado recebe divulgacao de vagas apos esta fase.
- [Phase 43 / 43-02]: RETEN-06 VEREDITO: NÃO reusar retain_until — o padrão exige DEPLOY para mudar a política e o RETEN-02 exige 'alterável sem deploy'; a estrutura substituta é predicado COMPUTADO (matriz ⨝ data-âncora), planos 43-04/43-06
- [Phase 43 / 43-02]: D-43-02-01: o portão de copy julga 'automaticamente' por COOCORRÊNCIA com léxico de exclusão, não isolado — 6 usos verdadeiros pré-existentes na allowlist (CEP, progresso) reprovariam um gate literal
- [Phase ?]: 43-03: z.literal(true) virou z.boolean().refine(=== true) — com o literal, o estado inicial false que o CONSENT-01 exige era INEXPRIMÍVEL no tipo do formulário
- [Phase ?]: 43-03: CADASTRO_DEFAULT_VALUES exportado — asserir sobre uma cópia local dos defaults seria verde sobre forma morta
- [Phase ?]: [Phase 43 / 43-04] Matriz de retenção chaveada por etapa_processo (8) e não status_candidatura (5): etapa_atual é NOT NULL, então nenhuma candidatura cai em buraco silencioso na Phase 46
- [Phase ?]: [Phase 43 / 43-04] Escrita da matriz é RPC SECURITY DEFINER auditada, não policy de UPDATE — policy não dá trilha atômica nem guard server-side sobre o teto de 24 meses
- [Phase ?]: [Phase 43 / 43-04] Guard NULL-safe (IS DISTINCT FROM) nas DUAS RPCs, e anon revogado nominalmente — o idioma NOT IN + REVOKE FROM PUBLIC falha aberto (defeito medido na 42-06)

### Pending Todos

Herdados/deferidos, fora do escopo do M7-core (rastreados p/ backlog):

- **Questões abertas do M7 (resolver no discuss-phase da fase relevante):** retenção/purga de `notificacoes_enviadas` — **deferida a LGPD-OPS (M8+)** na P37 · coluna `reclamado_em` — **deferida à P41** na P37 · divergência `updated_at` (inglês) vs `atualizado_em` (pt-BR) no resto do schema — **confirmada como débito real na P37**, não endereçada · verificação do caminho de aprovação escreve `etapa_atual='aprovado'`? (P39) · números exatos rate-limit/free-tier Resend (P41) · `.ics` METHOD PUBLISH vs REQUEST (P38).
- **Carregado do M6 (não puxado ao M7):** W-1 (Histórico VISRH-03 renderiza `ator` UUID em vez do nome do recrutador — needs `usuarios_rh` join) · 6 HUMAN-UATs live P31/34/35 · cosméticos UI P34/P35.
- **Carregados do M4/M5:** DBMIG-01 baseline+rebuild (environment-gated) · CC0-01 seed cognitivo · HUMAN-UATs P22/23/24/28/29/30. Ver `.planning/todos/`.

### Blockers/Concerns

- **🎉 P39 FECHADA 2026-07-28 — CR-01 e CR-02 PROVADOS AO VIVO EM PROD.** CR-02: a EF respondeu `{"ok":true,"skipped":"knockout"}` com **zero** linhas no ledger (a guarda existe de fato E roda antes do claim). CR-01: a cadeia canônica inteira disparou de uma aprovação real e o **conteúdo entregue foi inspecionado** — assunto *"Boa notícia sobre sua candidatura"* + `COPY_APROVACAO`, sem traço da recusa. **+1 achado NOVO no UAT (W-01):** o `PREHEADERS` não ramificava por desfecho, então o aprovado via prévia *"Atualização sobre a sua candidatura."* na caixa de entrada — corrigido (EF **v5**), com 3 testes de regressão provados por stash, e re-verificado ao vivo. Só apareceu porque o corpo INTEIRO foi inspecionado: o preheader é `<span display:>`, invisível às asserções que olham o texto visível.
- **📌 Nota operacional (achado incidental do UAT):** reenviar o MESMO evento para a MESMA candidatura em 24h é barrado em **duas camadas independentes** — `UNIQUE(dedupe_key)` no nosso ledger E a idempotência do Resend. Provado ao vivo: um re-teste com a mesma `Idempotency-Key` e corpo alterado recebeu `409 ... request body was modified`. O cinto do LEDGER-02/T-41-15, antes só coberto por teste unitário, está provado em PROD.
- **✅ RESOLVIDO 2026-07-28 — P39 CR-01 / CR-02 DEPLOYADOS.** Era o bloqueio mais importante do milestone. A EF `notificar-candidato` está viva em **v3** com o fix `f3b7304`: aprovado recebe `COPY_APROVACAO` (nunca mais a rejeição) e knockout é barrado pelo survivor-guard **na EF, antes do claim** (logo não deixa linha `pendente` para a varredura re-tentar). Auditado na fonte deployada + 401 sem Bearer + ledger intacto (0 linhas). **Consequência prática: fechar DELIV-01 já não é perigoso** — a contenção acidental do `403` deixou de ser necessária.
- **✅ RESOLVIDO 2026-07-28 — ACESSO DE ESCRITA A PROD RESTABELECIDO.** O operador removeu `&read_only=true` da URL do MCP. Verificado empiricamente antes de qualquer escrita: `current_user=postgres`, `session_user=postgres`, `transaction_read_only=off`. `apply_migration`, `execute_sql` de escrita e `deploy_edge_function` **todos funcionais** nesta sessão. Segue **sem** Supabase CLI instalado e sem `supabase/.temp/` (projeto não linkado) — então o caminho de escrita continua sendo **exclusivamente o MCP pelo main thread**, e `db push` permanece proibido (42601 nos corpos `$$`).
- **✅ RESOLVIDO 2026-07-28 — 41-05 Task 3 CONCLUÍDA e o loop de reconciliação PROVADO AO VIVO.** O Fernando registrou o endpoint no dashboard do Resend e provisionou o `whsec_…` no Vault (`resend_webhook_secret` presente; prefixo `whsec_`, len 38 — formato legítimo, não placeholder). **RECON-02 provado end-to-end contra a EF deployada:** webhook **assinado de verdade** aceito (200) e reconciliação observada no banco — `enviado → entregue` (+`entregue_em`), depois `→ bounce` (+`bounce_em`), por `provider_message_id`; sem assinatura → **400**, forjado → **400**, replay com timestamp trocado → **400**, `GET` → **405** (prova que passou do gate do Vault). A assinatura foi calculada **dentro do Postgres** (`extensions.hmac`), então **o segredo nunca saiu do banco**. Linha de teste criada e **removida** — ledger de volta a **0 linhas**, zero e-mail enviado.
- **⚠ P39 fechou sem VERIFICATION.md e sem code review — falha de processo, não de código.** Os 2 CRITICAL só apareceram porque esta sessão rodou o review retroativamente. A P39 foi aplicada em PROD (Wave 2, `39-04`) com o gate de verificação nunca executado. Vale tratar como sinal de processo: fase de maior risco do milestone foi a que pulou o gate.

- **✅ DRIFT PROD→repo RECONCILIADO na Phase 37 (fechado 2026-07-22) — mas a CAUSA continua desconhecida.** Os 4 arquivos de migration agora existem com correspondência 1:1 contra o ledger (`20260721000001`, `20260721000002` reconstruídos e **não** re-aplicados; `20260722000001` da P36; `20260722000002` aplicada na 37-04), confirmado independentemente por `supabase migration list --linked` (Local/Remote alinhados, zero pendência). As 3 lacunas fechadas e `database.types.ts` regenerado. Item arquivado com resolução em 4 blocos: `.planning/todos/done/37-drift-prod-tabelas-notificacao.md`. **⚠ Continua em aberto:** ninguém sabe **quem/como** aplicou as duas migrations originais direto em PROD — um caminho de apply fora do repositório continua existindo e a mesma falha pode se repetir. Se o padrão reaparecer, tratar como sinal de processo, não incidente isolado.
- **⚠ Subagentes GSD não recebem os tools MCP do Supabase** (bug upstream anthropics/claude-code#13898 — agentes com `tools:` restrito no frontmatter). Comprovado na P36/Plano 36-04, que bateu num checkpoint por isso. **Toda** inspeção e todo apply em PROD têm de ser feitos pelo orquestrador/main thread. As fases 37, 39 e 41 (todas com migrations) devem ser planejadas assumindo que as tarefas de banco fecham como checkpoint do orquestrador, não como trabalho autônomo do executor.
- **Débito de infra: `.husky/pre-commit` permanentemente vermelho.** Roda `npm run lint`, que sai não-zero contra um baseline PRÉ-EXISTENTE de 97 erros `tsc` em `src/**` (teto do CI é 104, então o CI passa). Consequência: 100% dos commits da P36 usaram `--no-verify`, cada um com a contagem 97→97 documentada no corpo. Isso treina bypass reflexivo. Seria mais útil como gate de não-regressão (comparar contagem contra o baseline) do que como checagem binária de exit code.
- **Cadeia estrita 37 → 38 → 39** — a EF precisa da tabela `notificacoes_enviadas`; os triggers precisam de uma EF viva pra apontar (senão disparam num 404, silenciosamente droppado — `net.http_post` é at-most-once).
- **Phase 39 é a de maior risco** — a colisão de double-send (3+ triggers n8n dormentes + o disparo env-var do `submit-candidatura`) só é segura com DROP-and-CREATE no MESMO phase + guarda `UNIQUE(dedupe_key)` durável. Não "manter os dois temporariamente".
- **✅ DELIV-01 FECHADO em 2026-07-28.** O Fernando confirmou no dashboard: `rh.beautysmile.com.br` está **Verified** no Resend. SPF/DKIM/MX publicados (conferidos por `dig`) + DMARC coberto por herança do domínio organizacional. **A entrega real está habilitada — e é SEGURA, porque o fix da P39 (EF v3) já estava vivo antes disto.** A ordem obrigatória foi respeitada do início ao fim: redeploy do fix → 41-05 → só então verificar o domínio. ⚠ **Consequência operacional:** o pipeline agora consegue enviar e-mail de verdade; quem decide se o destinatário é real ou o sink `@resend.dev` é a env `NOTIFICACOES_MODO` da EF (ausente/qualquer coisa ≠ `producao` ⇒ `teste`, fail-safe). Confirmar essa env antes de esperar e-mail em caixa real. Registro histórico abaixo:
- **🔄 DELIV-01 — registro histórico (2026-07-28, antes da confirmação): o DNS JÁ SUBIU.** `dig` ao vivo mostra os 3 registros Resend publicados em `rh.beautysmile.com.br`: `send.rh…` TXT `v=spf1 include:amazonses.com ~all` (SPF), `send.rh…` MX `10 feedback-smtp.sa-east-1.amazonses.com`, e `resend._domainkey.rh…` TXT com a chave pública DKIM. **Re-conferido ao vivo em 2026-07-28** (`dig`): SPF, DKIM e MX seguem publicados em `send.rh` / `resend._domainkey.rh` ✓. **Falta apenas:** **confirmação autoritativa do flag `verified` do lado do Resend** (rodar `RESEND_API_KEY=… npm run check:resend-dominio`).

> ✅ **CORREÇÃO 2026-07-28 — o "TXT `_dmarc` ausente" NÃO é uma lacuna real.** `_dmarc.rh.beautysmile.com.br` está de fato vazio, **mas o domínio organizacional tem política publicada**: `_dmarc.beautysmile.com.br` = `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@beautysmile.com.br`. Pela RFC 7489 §6.6.3, um subdomínio sem registro próprio **herda a política do domínio organizacional** — e o registro raiz não traz tag `sp=`, então `rh.` herda `p=quarantine`. Ou seja: **DMARC já cobre o subdomínio remetente**; publicar um `_dmarc.rh` só seria necessário para dar ao subdomínio uma política DIFERENTE da raiz. Como SPF e DKIM estão corretos e alinhados (o DKIM assina com `d=rh.beautysmile.com.br`), o correio autenticado passa. **Não há ação de DNS pendente para o DELIV-01.** Rodar `RESEND_API_KEY=… npm run check:resend-dominio` para fechar. ✅ **O veto foi LEVANTADO em 2026-07-28** — o fix da P39 está deployado (EF v3), então verificar o domínio já **não** transforma CR-01/CR-02 em dano real. DELIV-01 está liberado para fechar. Registro histórico abaixo:

- **DELIV-01 (registro histórico até 2026-07-26) — o subdomínio remetente `rh.beautysmile.com.br` NÃO estava verificado no Resend** → todo envio bate `403 domain not verified` e grava `status='falhou'`. Re-verificado por smoke fresco no início da P39-04 (contradisse o registro de "verificado" — por isso o gate re-verifica ao vivo, não confia no registro). **O operador optou explicitamente por aplicar a P39 mesmo assim** (rewire vivo, sends=`falhou`), aceitando que a recuperação virá pela varredura `pg_cron` da P41. Ação humana/DNS do Fernando: adicionar+verificar `rh.beautysmile.com.br` em https://resend.com/domains (SPF/DKIM auto + DMARC). **O funil AGORA dispara em tráfego real, mas só registra `falhou` até isto fechar** — quanto antes verificar, menos linhas acumuladas p/ o retry. Re-rodar o smoke da P38 após verificação deve dar `enviado`.
- **✅ RESOLVIDO 2026-07-28 — P41 / 41-05 Tasks 1 e 2 APLICADAS EM PROD.** Migration `20260727000001` aplicada via MCP `apply_migration` + **ledger reconciliado** (`20260728000659` → `20260727000001_p41_recon_retry`, em sequência após a P39, zero drift novo); smoke `p41_recon_retry_smoke.sql` **VERDE 5/5** (gate-GUC, 100% estrutural, zero INSERT); EF `resend-webhook` deployada **v1** (`verify_jwt=false`), com **`npm:svix` resolvido** (Pitfall 2 descartado — a EF executa e devolve a string do próprio código; um `ERR_MODULE_NOT_FOUND` falharia no boot). Cron `notif-retry-sweep` **ativo** `*/15 * * * *`. `varrer_retry_notificacoes()` executada ao vivo **sem exceção** e como **no-op real** (ledger 0 linhas; `net._http_response` inalterado, max id 61). Gate de supply-chain **T-41-SC limpo**: `svix@1.99.1` MIT, repo oficial, **sem `postinstall`** em toda a árvore, integridade do `deno.lock` **batendo 1:1** com o registry nos 4 pacotes (`svix` → `standardwebhooks` → `@stablelib/base64`, `fast-sha256`), `deno check` exit 0.
- **⏳ Cleanup do n8n cloud (DISPATCH-03) — pendente, ação humana.** A P39 aposentou o n8n do BANCO (0 `trg_n8n_*`) e do CÓDIGO deployado (submit-candidatura sem fetch). Falta fechar a superfície EXTERNA: desativar/apagar a(s) workflow(s) em `fernandocosta.app.n8n.cloud` (painel do Fernando). O secret `n8n_webhook_base` já não existe no Vault (nada a remover).
- **⚠ Drift pré-existente re-surfaced na P39-04 (NÃO-P39).** `db push --linked` reporta 7 versions órfãs (`20260713024106`…`20260714023002`) — migrations de 07-13/07-14 aplicadas via `apply_migration` (timestamp) e nunca reconciliadas ao prefixo do arquivo (2 sem arquivo local: `usr_rh_review_fixes_wr01_wr03`, `perfil_rh_rpc_hardening`). É o débito de drift já documentado (causa desconhecida), 2 semanas antes da P39. A version da P39 (`20260726000001`) está corretamente reconciliada → **zero drift novo**. NÃO reparado (fora de escopo; `--status reverted` do CLI marcaria migrations aplicadas como revertidas — errado). Rastrear p/ backlog de infra.
- **D-15 / RNF-07a / RNF-12a** — o template de rejeição (COMM-05) é fixo e neutro (grep-guard contra tokens de scoring), disparado só por decisão registrada por humano.
- **Contas de teste PROD:** `e2e.admin@beautysmile.com.br` (admin) + `recrutador` `fba9bc0f-4053-4eff-bc71-9cc8d1cddbe7` + `candidato.funil@teste.com`.
- 42-07 CHECKPOINT PENDENTE (bloqueante): apply de 20260730000003 + deploy da EF notificar-rh + smoke do round-trip. Ordem obrigatória: EF ANTES do trigger (net.http_post é at-most-once). Ler NOTIFICACOES_MODO na função nova antes do smoke — em PROD é 'producao' e o smoke mandaria e-mail real aos 5 RH. REVISAO-01 NÃO está entregue até isso passar
- 42-08 tem de renumerar sua migration para 20260730000004 (o 42-07 tomou o 20260730000003) E reescrever as asserções (a)/(b) do seu smoke: o CHECK vivo passa a ter 5 valores com o 42-07 e 6 com o 42-08
- 42-08 CHECKPOINT PENDENTE: deploy da EF notificar-candidato + apply de 20260730000004 (CHECK 6 valores + trg_notif_revisao_respondida) + smoke 4/4 + round-trip. ⚠ NOTIFICACOES_MODO é 'producao' e é secret de PROJETO: o smoke envia e-mail REAL — ver a tabela de opções A/B/C no 42-08-SUMMARY
- 42-12 CHECKPOINT PENDENTE (bloqueante, portão de fase destrutiva): INVENT-05 NÃO entregue. Ordem obrigatória — (1) medir ANTES por docs/compliance/sql/04-invent05-blast-radius.sql; (2) dry-run = delta alcance_corrigido−alcance_atual (se >0, volta ao checkpoint de decisão); (3) code review BLOQUEANTE antes do apply; (4) registrar corpo vivo + md5 dos 3 jobs; (5) apply_migration p42_invent05_not_exists + reparar ledger p/ 20260730000005 + assertir md5(statements[1]); (6) medir DEPOIS pela MESMA consulta (total_logs NÃO pode mudar — se mudar é incidente); (7) smoke 4/4 numa ÚNICA chamada + md5 dos vizinhos idênticos ao passo 4; (8) VERIFICATION.md com veredito; (9) preencher ⏳ do cron-inventory.md; (10) commit com hook, zero --no-verify

## Deferred Verification

| Phase | State | Resume |
|-------|-------|--------|
| 42 | verification_deferred_human | `/gsd-verify-work 42` |

**Decisão do operador em 2026-08-01:** diferir e seguir para a Phase 43. A Phase 42 verificou
**4/5 must-haves** (`42-VERIFICATION.md`, `status: human_needed`) e o **portão de fase
destrutiva passou 5/5**. A implementação está verificada — fila do RH, round-trip do Art. 20 nos
dois sentidos e inventário, todos provados em produção. O que ficou aberto NÃO é implementação:

1. **Guard REVISAO-05 contra JWT de navegador** (D6 do 42-10). Provado no servidor por smoke SQL
   com impersonação real; falta a confirmação contra um JWT emitido pelo `custom_access_token_hook`
   num browser, o que exige dois logins RH distintos.

2. **Caminho do recrutador ponta a ponta.** Resolução de roster provada ao vivo (a EF devolve os 3,
   com `role=recrutador`); a entrega não pode ser provada enquanto o endereço daquela conta for
   indeliverável — ver `42-recrutador-email-indeliveravel`.

3. **PITR** (metade do INVENT-02 / SC#4). Bloqueio de credencial **e** decisão de gasto; o próprio
   ROADMAP já o difere para a Phase 45.

## Deferred Items

### Reconhecidos no fecho do v7.0 (2026-07-28) — `override_closeout`

O gate pré-fecho (`audit-open`) listou 7 itens. Todos foram **reconhecidos e diferidos** por
decisão do operador ("deixe as duas coisas como pendência, finalize o milestone"). Nenhum é
blocker; todos estão rastreados em arquivo.

| Categoria | Item | Estado | Nota |
|-----------|------|--------|------|
| UAT | Phase 36 — UAT-36-1 (caixa de entrada) | `partial` | Infra fechada (domínio Verified, SPF/DKIM/MX, DMARC herdado, entrega provada). Aberto: só teste de **inbox real** em Gmail/Outlook + cabeçalhos PASS + Reply-To + tracking desligado. Não observável por API |
| UAT | Phase 36 — UAT-36-3 (`NOTIFICACOES_MODO=producao`) | `pending` | A variável agora existe como `teste` (explícito, não por ausência) — o modo de falha silencioso está fechado. Falta o **flip**, que é decisão de negócio |
| UAT | Phase 38 — UAT-38-1 | ✅ `passed` | **Fechado hoje** — entrega real provada (`enviado` → `entregue`); listado só por completude |
| todo | `m7-ativar-modo-producao` (**high**) | pending | A única chave entre o pipeline provado e o candidato real |
| todo | `m7-cleanup-n8n-cloud` (medium) | pending | Superfície externa segue ativa/acionável; banco e código já limpos |
| todo | `36-resend-chave-divergencia` (medium) | pending | `cost-alerter` mantém a chave Resend em env secret da EF, fora do Vault (blast-radius separado, decisão deliberada) |
| todo | `25-review-deferred` (medium) | pending | Herdado do M5 |
| todo | `cc0-cognitive-item-bank-sourcing` (medium) | pending | Herdado do M4 |
| todo | `processo-origem-do-drift-desconhecida` | pending | Causa do drift PROD→repo nunca identificada; um caminho de apply fora do repo pode existir |

**Cobertura Nyquist (lacuna, não falha):** 4 fases com `VALIDATION.md` em `status: draft`
(36, 38, 39, 41) e 2 sem arquivo (37, 40). São TODOs de cobertura — rodar
`/gsd-validate-phase <N>` promove o arquivo e dá o veredito real.

### Carregados de milestones anteriores:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature (→ M8+) | WhatsApp/SMS · opt-out/central de preferências · nurture/digest · TALENT (banco de talentos) · LGPD-OPS (retenção/Art. 20 queue) · PSICO · relatórios completos + export CSV/PDF | Deferred → M8+ | M7 kickoff |
| Feature (M7 v2) | RNF-SLA-06 nota estruturada do RH na rejeição (guardrail de frases) · nudge a cada N dias · deep-link CTAs no e-mail · re-envio manual pelo RH · timeline computada do histórico · nudge de bounce no painel | Deferred → M7-v2/backlog | M7 kickoff |
| Tech-debt (resolvido no M7) | SEC-03 Vault secret `n8n_webhook_base` → **resolvido por substituição na Phase 39** (aposenta o n8n) | In M7 scope (P39) | M4/M5 close |
| Tech-debt | DBMIG-01 baseline+rebuild (environment-gated — Docker/CLI-auth) · CC0-01 seed cognitivo | Deferred → backlog | M4/M5 close |
| UX gap (M6) | W-1: Histórico VISRH-03 renders `ator` UUID instead of recruiter name (needs usuarios_rh join) | Deferred → backlog (highest-value M6 follow-up) | M6 close |
| Live UAT (carregado) | HUMAN-UATs P22/23/24/28/29/30/31/34/35 — browser + real-login + real-calendar/SMTP checks | Deferred → live UAT session | M4–M6 close |

## Session Continuity

Last session: 2026-08-01T22:22:43.504Z
Stopped at: Completed 43-04-PLAN.md
Resume file: None

## Operator Next Steps

1. **Revisar o ROADMAP** (`.planning/ROADMAP.md`) — em especial o desvio deliberado em relação à proposta da pesquisa: CONSENT ficou íntegro na Phase 43 em vez de dividido entre 42 e 43, e **TRANSP-01/02 (que a proposta de 6 fases da pesquisa deixou sem fase) foi mapeado à Phase 47**.
2. `/gsd-plan-phase 42` para começar. A Phase 42 é read-only exceto por INVENT-05.
3. **Decisões de negócio que a pesquisa escalou e que ainda não têm resposta** — nenhuma bloqueia a Phase 42, mas todas precisam estar respondidas antes da fase indicada:
   - **BD-1 (Phase 43):** o número dentro de [0, 2 anos] por estado da candidatura. O teto de 2 anos já é contratual (copy do cadastro); a decisão remanescente é o número, e ela precisa de advogado trabalhista, não de mais pesquisa.
   - **BD-2/BD-3 (Phase 43):** honrar ou remover `autorizacao_comunicacao`; manter ou reescrever o rótulo "revisão por pessoa natural".
   - **BD-9 + PITR (Phase 45, ambas antes de qualquer código destrutivo):** redigir ou preservar a justificativa ≥50 caracteres do recrutador em `decisao_final`; e **status do PITR como fato datado** — ligar é decisão de gasto, e Storage não tem backup **independente** do PITR.
   - **Janela de arrependimento (Phase 45):** número de dias.
