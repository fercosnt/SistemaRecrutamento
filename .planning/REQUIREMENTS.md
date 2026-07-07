# Requirements: Sistema de Recrutamento Beauty Smile — M4 (v4.0)

**Defined:** 2026-07-05
**Milestone:** v4.0 — M4 · Correção & Blindagem do Funil (hardening, não expansão)
**Core Value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Fontes:** `.planning/M4-SCOPE-PROPOSAL.md` (recorte APROVADO 2026-07-05) ← `.planning/M4-SYSTEM-AUDIT.md` (56 achados) + `.planning/M4-PRODUCT-EVALUATION.md` (74 recs). Cada requirement cita seu achado de auditoria `(Axx)` para rastreabilidade.

> **Invariante preservada em todo o M4:** IA é recomendação, humano decide. O sistema **nunca** auto-rejeita por score/trait (RNF-07a). Linguagem de produto: "avaliação comportamental/cognitiva", nunca "teste psicológico" (RNF-12a).

## v1 Requirements

50 achados aprovados → **47 requirements técnicos** (após 3 pares deduplicados: A19≡A25, A2≡A33, A31≡A47) **+ 9 quick-wins de produto (UX)** = **56 requirements**.

### 🔒 SEC — Segurança / PII / LGPD (M4-A)

*RLS row-level nunca é segredo de coluna → RPC SECURITY DEFINER / column REVOKE; toda EF privilegiada autentica-**E**-autoriza.*

- [x] **SEC-01**: Gabarito do teste cognitivo (`gabarito_idx`) deixa de ser legível por qualquer usuário autenticado — column REVOKE / leitura só via RPC SECURITY DEFINER. `(A1, CRIT)`
- [x] **SEC-02**: Candidato não lê o veredito da IA da própria redação (score, cor, red_flag ético, notas do revisor) — projeção allowlist candidate-facing, nunca `select('*')`. `(A7, HIGH)`
- [x] **SEC-03**: URLs de webhook n8n não ficam hardcoded/expostas no bundle público — removidas do client (resolver por substituição via EF, não patch). `(A11, HIGH)`
- [x] **SEC-04**: `gerar-devolutiva-bigfive` EF autentica-**E**-autoriza (Bearer interno + role + posse) — fecha o IDOR de leitura de devolutiva alheia. `(A19≡A25, HIGH)`
- [x] **SEC-05**: SELECT policies de `analise_candidato_vaga` / `comparativo_solicitado` são vaga-scoped, não role-only. `(A20, HIGH)`
- [x] **SEC-06**: Scoping horizontal por vaga (padrão WR-03/WR-04) aplicado a `analise_candidato_vaga` e ao caminho de reprocessar. `(A30, MEDI)`
- [x] **SEC-07**: Serviço candidate-facing não seleciona a coluna `rubric` (critérios BARS) das perguntas. `(A40, MEDI)`
- [x] **SEC-08**: RH policies da base-table `candidaturas` são vaga-scoped — recrutador não-dono não lê todos os candidatos. `(A42, MEDI)`
- [x] **SEC-09**: A policy SELECT de `supabase_auth_admin` sobre `usuarios_rh` (dependência do `custom_access_token_hook`) fica declarada em migration file — elimina o drift execute_sql-only. `(A43, MEDI)`
- [x] **SEC-10**: Backup PII (`backup_m2.candidaturas_pre_funil`) fica coberto por RLS/erasure ou é removido — não é PII permanente fora do alcance. `(A49, LOW/LGPD)`
- [x] **SEC-11**: `console.log` operacional removido das páginas RH em PROD (não expõe movimentação de candidatos nem emails no console). `(A54, LOW)`

### 🤖 AI — Confiabilidade & Versionamento de IA (M4-B)

*Ressuscitar a stack de IA silenciosamente morta: prompt library ativa, circuit breaker real, retry de timeout, guardrails de custo, auditoria IA-02 rastreável.*

- [x] **AI-01**: Os 7 call_types de IA rodam com o prompt real da library (não o stub de 1 linha do `SCHEMA_VERSIONS` órfão) + alarme 0.0.0 no ai-logs + catch restrito. `(A3, HIGH · inclui QW6)`
- [x] **AI-02**: Circuit breaker é código vivo — instância compartilhada entre chamadas e `THRESHOLD ≤ MAX_ATTEMPTS` (não uma instância nova por chamada com threshold inalcançável). `(A4, HIGH)`
- [x] **AI-03**: `isRetryable` casa o erro de timeout do SDK (`'Request timed out.'`) — timeout passa a ser retriável. `(A5, HIGH)`
- [x] **AI-04**: `avaliar-transcricao-entrevista` recebe override de `timeoutMs` adequado ao seu perfil (Sonnet/4000 tokens). `(A6, HIGH)`
- [x] **AI-05**: Replay de idempotência é regenerável — RH consegue reprocessar após falha cacheada (não devolve a falha para sempre). `(A23, MEDI)`
- [x] **AI-06**: Guardrails de custo com escopo/janela/canal corretos e não-silenciosos (não detect-only com 1 dia de atraso). `(A24, MEDI · complementa F2)`
- [x] **AI-07**: `MAX_ATTEMPTS` / `AI_CALL_TIMEOUT_MS` via `Number(env)` com guarda de NaN — env malformado não quebra a stack. `(A48, LOW)`

### 🔀 FUNIL — Correção do Funil (drift M1→M2) (M4-C)

*Fazer o funil funcionar como projetado ponta-a-ponta: eliminar enums M1 mortos, colunas fantasma, contratos quebrados e scoring manipulável; RNF-07a com trilha.*

- [ ] **FUNIL-01**: `pontuar_sjt` não é manipulável — deduplicação de respostas + denominador correto (não só sobre perguntas respondidas). `(A8, HIGH)`
- [ ] **FUNIL-02**: RH não consegue rejeitar candidato via UPDATE direto de `candidaturas.status` sem auditoria/justificativa — trilha obrigatória (RNF-07a). `(A9, HIGH)`
- [ ] **FUNIL-03**: RH Kanban e UpdateStatusModal operam sobre o enum de etapas que existe no DB (não o enum M1 removido). `(A12, HIGH · inclui QW-affordances)`
- [ ] **FUNIL-04**: Editar Vaga hidrata apenas colunas existentes **e** persiste os campos de configuração (não hidrata 8 colunas fantasma nem descarta a config no save). `(A13, HIGH · casa com B1)`
- [ ] **FUNIL-05**: Contrato cargoTemplates↔container honrado — ids de teste (`work_sample_sjt`, `redacao_cultural`, …) casam entre template e runtime. `(A15, HIGH)`
- [ ] **FUNIL-06**: Ação legada 'Aprovado para Próxima Etapa' não grava etapa M1 inexistente — removida/redirecionada ao enum atual. `(A16, HIGH)`
- [ ] **FUNIL-07**: Banco SJT é filtrado por cargo **e** por `itens_ids` da vaga — candidato não responde pergunta de outro cargo. `(A17, HIGH · casa com C4-filtro)`
- [ ] **FUNIL-08**: Prova cognitiva é alcançável pela navegação — `funilNavMap` ↔ `AvaliacaoContainer` consistentes + roteamento/label/filtro por `aplica_cognitivo`. `(A18, HIGH · inclui QW2)`
- [ ] **FUNIL-09**: `registrar_decisao` não destrói a decisão anterior — `por_usuario`/justificativa preservados no histórico. `(A26, MEDI)`
- [ ] **FUNIL-10**: Reinscrição após soft-delete funciona — índice unique com filtro `deleted_at` em PROD. `(A27, MEDI · prereq de D5)`
- [ ] **FUNIL-11**: `upsert_pergunta_opcoes_metadata` tem guard de status da vaga — editar opções de vaga ATIVA é bloqueado/controlado. `(A29, MEDI)`
- [ ] **FUNIL-12**: Cards da avaliação refletem conclusão — status derivado de campo que existe no payload (não de um campo fantasma). `(A41, MEDI)`

### 🗄️ DBMIG — Integridade de Migrations/DB (M4-D)

*Migrations reconstroem o banco do zero e o ledger de versões converge (destrava pgTAP e reprodutibilidade).*

- [ ] **DBMIG-01**: As 49 migrations reconstroem o banco do zero e o ledger de versões converge — sem baseline vazio nem objetos só-em-PROD. `(A10, HIGH/L — âncora/risco)`
- [ ] **DBMIG-02**: Semântica de `historico_candidatura.auto_rejeitado` corrigida — distingue 'escrita do sistema' de 'auto-rejeição'. `(A28, MEDI)`

### 🧪 CI — Rede de Testes & Higiene de CI (M4-E)

*A camada que originou TODOS os defeitos live (EFs Deno, lógica DB, contratos) roda em CI e não pode regredir verde.*

- [x] **CI-01**: Corpus Deno das EFs (~126 testes) roda em algum job de CI. `(A2≡A33, CRIT — destrava todo o resto)`
- [x] **CI-02**: `deno test` padrão passa em código verde — cast stale + asserts corrigidos (a suíte para de apodrecer). `(A21, HIGH — destrava A2)`
- [ ] **CI-03**: `submit-candidatura` (EF + RPC de knockout, único auto-reject sancionado) tem cobertura de teste. `(A22, HIGH/L)`
- [x] **CI-04**: Baseline do gate tsc no CI apertado ao real (medido 133 — abaixo de 257, não 290 frouxo) — novo type error é pego. `(A35, MEDI · absorve FOUND-08)`
- [x] **CI-05**: Imports versionados (`lucide-react@0.487.0` etc.) com paths no tsconfig — 65 TS2307 resolvidos, typecheck destravado. `(A38, MEDI)`
- [ ] **CI-06**: `extractEfErrorCode` deduplicado no helper compartilhado `@/lib/efErrors` (remove a cópia com assinatura invertida no entrevistaService). `(A39, MEDI · tech-debt v3.0)`
- [ ] **CI-07**: Contract tests client↔EF são reais — o corpo do client parseia no Zod schema da EF (não replicam ambos os lados dentro do teste). `(A44, MEDI)`
- [x] **CI-08**: Credenciais de conta de teste (emails reais + senhas) fora do repo — sem fallback hardcoded nos specs E2E. `(A31≡A47, MEDI)`
- [x] **CI-09**: As 8 deps de produção com versão wildcard `"*"` ficam pinadas — teto de versão contra supply-chain. `(A32, MEDI)`
- [ ] **CI-10**: Gate de bundle PERF-03 (`assert-chunks.mjs`) wired em build **e** CI — regressão de bundle é pega. `(A34, MEDI)`
- [x] **CI-11**: Vulns críticas/altas no dev-tooling resolvidas (vitest/@vitest/ui RCE, happy-dom code-exec). `(A36, MEDI)`
- [x] **CI-12**: Deps instaladas e nunca importadas removidas (`motion`, `@supabase/auth-helpers-react`). `(A50, LOW)`
- [ ] **CI-13**: Config `verify_jwt` por Edge Function declarada no repo (`supabase/config.toml`). `(A51, LOW)`
- [x] **CI-14**: `npm run lint` (tsc) cobre `e2e/`, `scripts/` e `playwright.config` (Deno sync-prompts excluídos). `(A52, LOW)`
- [ ] **CI-15**: Teste de `sync-prompts` (pipeline que escreve em PROD com service_role) roda no CI. `(A56, LOW)`

### 🎯 UX — Overlay de Produto (quick-wins de honestidade & alcançabilidade)

*O lado de experiência que a avaliação de 6 personas surfou — quick-wins de varredura imediata (Onda 1). Feitos no mesmo file-touch dos achados técnicos quando possível.*

- [ ] **UX-01**: Copy honesta em todas as telas de espera do candidato ("acompanhe no painel", não "avisaremos por e-mail" — 5+ telas). `(QW1)`
- [x] **UX-02**: Landing sem linguagem "testes psicométricos"/"análise de perfil" + CTA "Já sou candidato" (RNF-12a). `(QW3)`
- [ ] **UX-03**: Navegação do hub usa `candidatura.id` (não `candidato.id`) + estado 404 no hub. `(QW4)`
- [x] **UX-04**: Botões de login habilitados corretamente — remover `!isValid` do disabled (candidato, RH, esqueci/redefinir); elimina a gambiarra `blur()` dos E2E. `(QW5)` — Phase 22 / Plan 22-03 (candidato+RH dropados; esqueci/redefinir já limpos, regression-guard grep)
- [x] **UX-05**: `?redirect` propagado login→cadastro→pós-login + limpeza de `localStorage` órfão. `(QW10)` — Phase 22 / Plan 22-03 (shared resolveRedirect guard; orphan candidatura_vaga_id limpo no login)
- [ ] **UX-06**: Varredura de affordances mortas — menus, badges 12/5, botões no-op, tiles "-", incl. ocultar os no-op de avançar/rejeitar da DecisaoFinalPage + cache do comparativo por finalistas. `(QW11 + parte de QW9)`
- [x] **UX-07**: Devolutiva e telas RH sem percentil numérico — descritores qualitativos (honestidade psicométrica). `(QW12)`
- [x] **UX-08**: Remoção dos 4 itens políticos O6 do Big Five (dado sensível — mesma natureza LGPD). `(QW7)`
- [x] **UX-09**: Peso de `triagem` fora das chaves ponderadas da consolidação (ou cap ≤15) + exigir ≥2 etapas para exibir número consolidado. `(QW8)`

## Future Requirements

Reconhecidas, fora do roadmap do M4. Movê-las para v1 exige atualização de roadmap.

### → M5 (Operação & Comunicação — feature-work; draft em `.planning/M5-DRAFT.md`)

- **M5/OPER — Gestão de usuários RH real** — a tela `/rh/configuracoes` (hoje 100% mock hardcoded: desativar usuário/reset). No M4 é **gateada/ocultada** (ver UX-06 / D2). `(A14, HIGH/L)`
- **M5/OPER — Página de perfil RH real** — `MeuPerfilPage` salvar dados/senha/foto são stubs `console.log`. No M4 é **gateada/ocultada**. `(A37, MEDI)`
- **M5/COMM** — Pipeline de notificação transacional ao candidato (EF `notificar-candidato`) — aposenta o n8n pessoal (resolve SEC-03 por substituição).
- **M5/OPER** — Avançar/rejeitar etapa individual em todo o funil · agendamento de entrevista · CV+análise visível ao RH · dashboard como fila real + relatórios/KPIs sobre `historico_candidatura`.
- **M5/TALENT** — Banco de talentos + re-candidatura (depende de FUNIL-10).
- **M5/LGPD-OPS** — Retenção/exclusão de dados · fila de revisão por pessoa natural (Art. 20).
- **M5/PSICO** — Banco SJT ≥6-8 itens/cargo + SME + opções balanceadas · normas reais (Johnson/IPIP) · BARS fixas · seed CC0 do cognitivo (`CC0-01`, após blindagem do gabarito SEC-01) · auditoria de viés por etapa.

### → Backlog (stretch / baixo valor)

- **pgTAP completo** de toda a lógica DB-side (RLS/RPCs/triggers/pontuar_sjt/publish_vaga). `(A45, MEDI/L)` — *o §6 da proposta sugere promover uma fatia (tabelas de veredito/gabarito) se sobrar fôlego; fora do compromisso v1.*
- **E2E real do funil RH** (triagem→avaliação→entrevista→decisão) — o e2e atual é casca mocked. `(A46, MEDI/L)`
- **Sessão RH expirada** em `/rh/*` volta ao login RH (não ao de candidato). `(A53, LOW)` — parcialmente absorvido por UX-04.
- **Devolutiva Big Five com caminho de recuperação** (fan-out best-effort não abandona após 10s). `(A55, LOW/M)`

## Out of Scope

Exclusões explícitas para prevenir scope creep.

| Feature | Reason |
|---------|--------|
| Qualquer feature nova (net-new) | M4 é hardening/correção; feature-work é M5 (`.planning/M5-DRAFT.md`) |
| Reescrita das EFs de IA / troca de framework | A stack existe e funciona; M4 conserta os defeitos, não reconstrói |
| MS Bookings auto-scheduling | Feature-work de agendamento → M5/OPER |
| Norma local do cognitivo / carta de devolução por IA | Substância psicométrica → M5/PSICO |
| pgTAP e E2E-real completos | A45/A46 — stretch de backlog, não compromisso v1 |
| Gestão de usuários RH / perfil RH *reais* | A14/A37 — no M4 apenas gateados/ocultados; implementação → M5 |

## Traceability

Fases continuam a partir da Phase 22. 6 fases (22–27) mapeadas 1:1 a todos os 56 requirements. Cada requirement mapeia a exatamente uma fase (sem órfãos, sem duplicatas).

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 24 | Complete |
| SEC-02 | Phase 24 | Complete |
| SEC-03 | Phase 24 | Complete |
| SEC-04 | Phase 24 | Complete |
| SEC-05 | Phase 24 | Complete |
| SEC-06 | Phase 24 | Complete |
| SEC-07 | Phase 24 | Complete |
| SEC-08 | Phase 24 | Complete |
| SEC-09 | Phase 24 | Complete |
| SEC-10 | Phase 24 | Complete |
| SEC-11 | Phase 24 | Complete |
| AI-01 | Phase 23 | Complete |
| AI-02 | Phase 23 | Complete |
| AI-03 | Phase 23 | Complete |
| AI-04 | Phase 23 | Complete |
| AI-05 | Phase 23 | Complete |
| AI-06 | Phase 23 | Complete |
| AI-07 | Phase 23 | Complete |
| FUNIL-01 | Phase 26 | Pending |
| FUNIL-02 | Phase 25 | Pending |
| FUNIL-03 | Phase 25 | Pending |
| FUNIL-04 | Phase 25 | Pending |
| FUNIL-05 | Phase 25 | Pending |
| FUNIL-06 | Phase 25 | Pending |
| FUNIL-07 | Phase 26 | Pending |
| FUNIL-08 | Phase 26 | Pending |
| FUNIL-09 | Phase 25 | Pending |
| FUNIL-10 | Phase 26 | Pending |
| FUNIL-11 | Phase 25 | Pending |
| FUNIL-12 | Phase 26 | Pending |
| DBMIG-01 | Phase 27 | Pending |
| DBMIG-02 | Phase 27 | Pending |
| CI-01 | Phase 22 | Complete |
| CI-02 | Phase 22 | Complete |
| CI-03 | Phase 27 | Pending |
| CI-04 | Phase 22 | Complete |
| CI-05 | Phase 22 | Complete |
| CI-06 | Phase 27 | Pending |
| CI-07 | Phase 27 | Pending |
| CI-08 | Phase 22 | Complete |
| CI-09 | Phase 22 | Complete |
| CI-10 | Phase 27 | Pending |
| CI-11 | Phase 22 | Complete |
| CI-12 | Phase 22 | Complete |
| CI-13 | Phase 27 | Pending |
| CI-14 | Phase 22 | Complete |
| CI-15 | Phase 27 | Pending |
| UX-01 | Phase 26 | Pending |
| UX-02 | Phase 22 | Complete |
| UX-03 | Phase 25 | Pending |
| UX-04 | Phase 22 | Done (22-03) |
| UX-05 | Phase 22 | Done (22-03) |
| UX-06 | Phase 25 | Pending |
| UX-07 | Phase 23 | Complete |
| UX-08 | Phase 24 | Complete |
| UX-09 | Phase 23 | Complete |

**Coverage:**
- v1 requirements: **56 total** (SEC 11 · AI 7 · FUNIL 12 · DBMIG 2 · CI 15 · UX 9)
- Mapped to phases: **56** (Phase 22: 12 · Phase 23: 9 · Phase 24: 12 · Phase 25: 9 · Phase 26: 6 · Phase 27: 8)
- Unmapped: **0** ✓

---
*Requirements defined: 2026-07-05*
*Last updated: 2026-07-05 — traceability preenchida pelo gsd-roadmapper; 56/56 mapeados a 6 fases (22–27), 0 órfãos. Ver `.planning/ROADMAP.md`.*
