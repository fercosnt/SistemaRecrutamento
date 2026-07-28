---
proposal: M4 scope cut from full-system audit
source: .planning/M4-SYSTEM-AUDIT.md (56 confirmados)
date: 2026-07-05
status: APROVADO — M4-full (50 itens) — Fernando 2026-07-05; + overlay de produto integrado 2026-07-05; aguardando /gsd-new-milestone
product_eval: .planning/M4-PRODUCT-EVALUATION.md (74 recs) — deltas casados por categoria abaixo
m5_draft: .planning/M5-DRAFT.md (Operação & Comunicação)
theme: Correção & Blindagem do Funil (hardening, não expansão)
in_scope: 50 achados / ~5 categorias-fase
deferred: 6 (2 → M5 feature, 4 → backlog)
---

# Proposta de recorte M4 — a partir da auditoria full-system

**Filosofia:** M4 continua a trajetória de *hardening* do v3.0 — corrigir o que está quebrado/inseguro, **não** adicionar features. Feature-work (gestão de usuários RH real, página de perfil real) sai para M5. 3 pares deduplicados → planejar ~47 requirements efetivos.

| Fase-categoria | Itens | Esforço (pt) | Meta |
|---|---|---|---|
| **M4-A · 🔒 Segurança / PII / LGPD** | 12 | ~20 | Fechar todo vazamento de PII/gabarito e IDOR: RLS row-level nunca é segredo de coluna → RPC SECURITY DEFINER / column REVOKE; toda EF privilegiada autentica-E-autoriza. |
| **M4-B · 🤖 Confiabilidade & Versionamento de IA** | 7 | ~9 | Ressuscitar a stack de IA silenciosamente morta: prompt library nos 7 call_types, circuit breaker real, retry de timeout, guardrails de custo — e auditoria IA-02 rastreável. |
| **M4-C · 🔀 Correção do Funil (drift M1→M2)** | 12 | ~32 | Fazer o funil funcionar como projetado ponta-a-ponta: eliminar enums M1 mortos, colunas fantasma, contratos quebrados e scoring manipulável; RNF-07a com trilha. |
| **M4-D · 🗄️ Integridade de Migrations/DB** | 2 | ~11 | Migrations reconstroem o banco do zero e o ledger de versões converge (destrava pgTAP e reprodutibilidade). |
| **M4-E · 🧪 Rede de Testes & Higiene de CI** | 17 | ~28 | A camada que originou TODOS os defeitos live (EFs Deno, lógica DB, contratos) roda em CI e não pode regredir verde. |
| **TOTAL M4** | **50** | **~100** | |

> Tamanho: ~2x o v3.0 (12 reqs/4 fases), mas ~60% são fixes esforço-S agrupáveis em varreduras. Estimativa grosseira: **5–6 fases**.

## M4-A · 🔒 Segurança / PII / LGPD
*Fechar todo vazamento de PII/gabarito e IDOR: RLS row-level nunca é segredo de coluna → RPC SECURITY DEFINER / column REVOKE; toda EF privilegiada autentica-E-autoriza.*

| # | Sev | Esf | Achado | Local |
|---|---|---|---|---|
| A1 | CRIT | S | Answer key do teste cognitivo (gabarito_idx) legível por qualquer usuário autenticado via  | `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql` |
| A7 | HIGH | M | Candidato lê o veredito da IA da própria redação (score, cor, red_flag ético, notas do rev | `supabase/migrations/20260623100003_redacoes_candidato.sql` |
| A11 | HIGH | M | URLs de webhook n8n sem autenticação hardcoded no código e expostas no bundle público | `src/features/vagas/services/candidaturasService.ts` |
| A19 | HIGH | S | gerar-devolutiva-bigfive Edge Function performs NO authentication or authorization — IDOR  | `supabase/functions/gerar-devolutiva-bigfive/index.ts` |
| A20 | HIGH | M | analise_candidato_vaga / comparativo_solicitado RH SELECT policies are role-only, not vaga | `supabase/migrations/20260610000001_analise_tables.sql` |
| A25 | MEDI | S | gerar-devolutiva-bigfive: Deno.serve sem validação de caller (nem Bearer interno, nem role ⟨dup A19⟩ | `supabase/functions/gerar-devolutiva-bigfive/index.ts` |
| A30 | MEDI | S | Scoping horizontal por vaga (WR-03/WR-04) não foi aplicado a analise_candidato_vaga nem re | `supabase/migrations/20260610000001_analise_tables.sql` |
| A40 | MEDI | S | Serviço candidate-facing seleciona a coluna rubric (critérios de pontuação BARS) das pergu | `src/features/avaliacao/services/avaliacaoService.ts` |
| A42 | MEDI | M | candidaturas base-table RH policies are role-only — non-owner recruiter reads all candidat | `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql` |
| A43 | MEDI | S | custom_access_token_hook depends on an RLS SELECT policy for supabase_auth_admin on usuari | `supabase/migrations/20260420000002_unified_auth_role.sql` |
| A49 | LOW | S | Backup PII permanente e fora do alcance de RLS/erasure: backup_m2.candidaturas_pre_funil n ⟨LGPD⟩ | `supabase/migrations/20260607000002_etapa_processo_v2_cutover.sql` |
| A54 | LOW | S | console.log operacional em páginas RH de PROD expõe movimentação de candidatos e emails no | `src/components/KanbanBoard.tsx` |

## M4-B · 🤖 Confiabilidade & Versionamento de IA
*Ressuscitar a stack de IA silenciosamente morta: prompt library nos 7 call_types, circuit breaker real, retry de timeout, guardrails de custo — e auditoria IA-02 rastreável.*

| # | Sev | Esf | Achado | Local |
|---|---|---|---|---|
| A3 | HIGH | S | SCHEMA_VERSIONS órfão: 5 dos 7 call_types de IA rodam em PROD com prompt stub de 1 linha ( | `supabase/functions/_shared/prompt-loader.ts` |
| A4 | HIGH | S | Circuit breaker (IA-04) é código morto: instância nova por chamada e THRESHOLD=5 > MAX_ATT | `supabase/functions/_shared/ai-client.ts` |
| A5 | HIGH | S | isRetryable nunca casa o erro de timeout do SDK ('Request timed out.') — retry em timeout  | `supabase/functions/_shared/ai-client.ts` |
| A6 | HIGH | S | avaliar-transcricao-entrevista sem override timeoutMs: mesmo perfil (Sonnet, 4000 tokens,  | `supabase/functions/avaliar-transcricao-entrevista/index.ts` |
| A23 | MEDI | S | Replay de idempotência devolve falhas cacheadas para sempre — RH nunca consegue regenerar  | `supabase/functions/_shared/ai-client.ts` |
| A24 | MEDI | M | Guardrails de custo são detect-only, com 1 dia de atraso, escopo errado e canais silencios | `supabase/migrations/20260609000002_prompt_library_rpcs.sql` |
| A48 | LOW | S | MAX_ATTEMPTS / AI_CALL_TIMEOUT_MS via Number(env) sem guarda de NaN — um env var malformad | `supabase/functions/_shared/ai-client.ts` |

## M4-C · 🔀 Correção do Funil (drift M1→M2)
*Fazer o funil funcionar como projetado ponta-a-ponta: eliminar enums M1 mortos, colunas fantasma, contratos quebrados e scoring manipulável; RNF-07a com trilha.*

| # | Sev | Esf | Achado | Local |
|---|---|---|---|---|
| A8 | HIGH | M | pontuar_sjt é manipulável: sem deduplicação de respostas, denominador só sobre perguntas r | `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql` |
| A9 | HIGH | M | RH pode rejeitar candidato via UPDATE direto de candidaturas.status sem auditoria, justifi ⟨RNF-07a⟩ | `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql` |
| A12 | HIGH | M | RH Kanban e UpdateStatusModal operam sobre enum de etapas M1 que não existe mais no DB — a | `src/components/KanbanBoard.tsx` |
| A13 | HIGH | M | Editar Vaga hidrata o formulário de 8 colunas inexistentes e NUNCA persiste os campos de c | `src/components/pages/CriarEditarVagaPage.tsx` |
| A15 | HIGH | M | Contrato quebrado: ids de teste dos cargoTemplates ('work_sample_sjt','redacao_cultural',' | `src/features/config-vaga/templates/cargoTemplates.ts` |
| A16 | HIGH | S | Ação legada 'Aprovado para Próxima Etapa' (CandidatosRHPage/Kanban) grava etapa M1 inexist | `src/features/vagas/services/candidaturasService.ts` |
| A17 | HIGH | M | Banco SJT não é filtrado por cargo nem por itens_ids da vaga — candidato responde pergunta | `src/features/avaliacao/services/avaliacaoService.ts` |
| A18 | HIGH | M | Prova cognitiva inalcançável pela navegação: funilNavMap afirma fan-out que o AvaliacaoCon | `src/lib/navegacao/funilNavMap.ts` |
| A26 | MEDI | M | registrar_decisao (UPSERT) destrói a decisão anterior: por_usuario/justificativa sobrescri | `supabase/migrations/20260625100001_decisao_final_phase15.sql` |
| A27 | MEDI | S | Reinscrição após soft-delete não funciona: índice unique sem filtro deleted_at em PROD con | `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql` |
| A29 | MEDI | M | upsert_pergunta_opcoes_metadata não tem guard de status da vaga: editar opções de vaga ATI | `supabase/migrations/20260607010003_upsert_pergunta_opcoes_metadata_rpc.sql` |
| A41 | MEDI | M | Cards da avaliação nunca refletem conclusão (status lido de um campo que não existe no jso | `src/features/avaliacao/components/AvaliacaoContainer.tsx` |

## M4-D · 🗄️ Integridade de Migrations/DB
*Migrations reconstroem o banco do zero e o ledger de versões converge (destrava pgTAP e reprodutibilidade).*

| # | Sev | Esf | Achado | Local |
|---|---|---|---|---|
| A10 | HIGH | L | Baseline vazio + objetos só-em-PROD: as 49 migrations não reconstroem o banco e o ledger d ⟨âncora/risco⟩ | `supabase/migrations/20260419000000_baseline.sql` |
| A28 | MEDI | M | historico_candidatura.auto_rejeitado significa 'escrita do sistema', não 'auto-rejeição' — | `supabase/migrations/20260624000004_avancar_etapa_flag_guard.sql` |

## M4-E · 🧪 Rede de Testes & Higiene de CI
*A camada que originou TODOS os defeitos live (EFs Deno, lógica DB, contratos) roda em CI e não pode regredir verde.*

| # | Sev | Esf | Achado | Local |
|---|---|---|---|---|
| A2 | CRIT | S | Corpus inteiro de testes Deno das EFs (~126 testes) não roda em nenhum CI — inclusive as r | `.github/workflows/ci.yml` |
| A21 | HIGH | M | A suíte Deno já está apodrecendo: `deno test` padrão falha em código verde (cast stale + a ⟨destrava A2⟩ | `supabase/functions/_shared/__tests__/ai-client.test.ts` |
| A22 | HIGH | L | submit-candidatura (EF + RPC de knockout — o único auto-reject sancionado do sistema) tem  | `supabase/functions/submit-candidatura/index.ts` |
| A31 | MEDI | S | Credenciais de conta de teste commitadas como fallback nos specs E2E ⟨dup A47⟩ | `e2e/vagas-browse.spec.ts` |
| A32 | MEDI | S | 8 dependências de produção com versão wildcard "*" (supply-chain sem teto de versão) | `package.json` |
| A33 | MEDI | S | Testes Deno das Edge Functions nunca rodam no CI (zero cobertura automatizada do código de ⟨dup A2⟩ | `vite.config.ts` |
| A34 | MEDI | S | Gate de bundle PERF-03 (assert-chunks.mjs) existe mas não está wired em build nem CI — reg | `scripts/assert-chunks.mjs` |
| A35 | MEDI | S | Baseline do gate tsc no CI está 33 erros frouxo (290 vs 257 reais) — novos type errors ent | `.github/workflows/ci.yml` |
| A36 | MEDI | S | Vulns críticas/altas no dev-tooling: vitest/@vitest/ui (RCE via UI server), happy-dom (cod | `package.json` |
| A38 | MEDI | S | 65 erros TS2307 por imports versionados ('lucide-react@0.487.0') sem paths no tsconfig — d ⟨destrava typecheck⟩ | `tsconfig.json` |
| A39 | MEDI | S | extractEfErrorCode duplicado em entrevistaService com assinatura INVERTIDA e prioridade pr ⟨tech-debt v3.0⟩ | `src/features/entrevista/services/entrevistaService.ts` |
| A44 | MEDI | M | Contract tests client↔EF replicam AMBOS os lados dentro do próprio teste — o corpo do clie | `src/features/avaliacao/__tests__/bigfive-contract.test.ts` |
| A47 | MEDI | S | Credenciais fallback hardcoded em 8 arquivos e2e commitados — incluindo e-mails reais e a  | `e2e/vagas-browse.spec.ts` |
| A50 | LOW | S | Dependências de produção instaladas e nunca importadas: motion e @supabase/auth-helpers-re | `package.json` |
| A51 | LOW | S | Config verify_jwt por Edge Function não está declarada no repo (sem supabase/config.toml)  | `supabase/` |
| A52 | LOW | S | npm run lint (tsc) não cobre e2e/, scripts/ nem playwright.config — TS desses diretórios n | `tsconfig.json` |
| A56 | LOW | S | sync-prompts (pipeline que escreve em PROD com service_role) tem teste que nunca roda: exc | `vite.config.ts` |

## ⏭️ Diferidos

**→ M5 (feature-work, não hardening):**
- A14 [HIGH/L] Gestão de usuários RH em /rh/configuracoes é 100% mock hardcoded — desativar usuário/reset — *mitigação sugerida: gatear/ocultar a tela até implementar de verdade*
- A37 [MEDI/S] MeuPerfilPage (RH): salvar dados, alterar senha e alterar foto são stubs console.log que s — *mitigação sugerida: gatear/ocultar a tela até implementar de verdade*

**→ Backlog (stretch / baixo valor):**
- A45 [MEDI/L] Toda a lógica DB-side (RLS, RPCs SECURITY DEFINER, triggers, pontuar_sjt, publish_vaga) nã ⟨pgTAP stretch⟩
- A46 [MEDI/L] O e2e do CI é uma casca mocked: todo o funil RH (triagem→avaliação→entrevista→decisão) e t ⟨e2e real stretch⟩
- A53 [LOW/S] Sessão RH expirada em rota /rh/* é devolvida ao login de CANDIDATO e o LoginRHPage descart ⟨UX low⟩
- A55 [LOW/M] Devolutiva Big Five sem caminho de recuperação: fan-out best-effort abandona após 10s e o  ⟨recovery low⟩


---

# 🔗 Overlay de Produto — casamento com a avaliação de 6 personas

> Da avaliação de produto (`.planning/M4-PRODUCT-EVALUATION.md`, 74 recs). Estas NÃO são novos requisitos técnicos — são o **lado de experiência** dos achados já escopados (fazer no mesmo file-touch evita retrabalho) + os **quick-wins** de varredura imediata. O net-new (feature-work) vai pro `.planning/M5-DRAFT.md`.

## 5. Sequenciamento

### Quick wins (alta severidade × esforço S — dá para varrer em 1-2 semanas)

| # | Item | Eixo | Lentes | Arquivo âncora |
|---|------|------|--------|----------------|
| 1 | Copy "avisaremos por e-mail" → "acompanhe no painel" (5+ telas) | A1-fase1 | candidato, ux, pm | `AvaliacaoContainer.tsx:168` etc. |
| 2 | Rotear `cognitivo` no `handleOpenTeste` + label + filtro por `aplica_cognitivo` | A4 | candidato, psicometra | `AvaliacaoContainer.tsx:315` |
| 3 | Landing: remover "testes psicométricos"/"análise de perfil", CTA "Já sou candidato" | E2 | candidato | `LandingPage.tsx:35-92` |
| 4 | Navegação hub: `candidato.id` → `candidatura.id` + estado 404 no hub | B4a | recrutador, ux | `DashboardRHPage.tsx:340,367`, `CandidatosRHPage.tsx:253` |
| 5 | Login: remover `!isValid` do disabled (candidato, RH, esqueci/redefinir) | E1 | ux | `LoginCandidatoPage.tsx:399` |
| 6 | Fix `SCHEMA_VERSIONS` + catch restrito + alarme 0.0.0 no ai-logs | C1 | psicometra, estrategico | `_shared/prompt-loader.ts:33` (=M4-B A3) |
| 7 | Remover 4 itens políticos O6 do Big Five | C2 | psicometra | `20260612000001_bigfive_itens.sql` |
| 8 | Tirar `triagem` das chaves ponderadas da consolidação (ou cap ≤15) + exigir ≥2 etapas para exibir número | C5 | psicometra | `consolidar-decisao-final/index.ts:99` |
| 9 | DecisaoFinalPage: ligar/ocultar onAvancar-onRejeitar no-op + cachear comparativo por finalistas | B9 | recrutador, ux | `DecisaoFinalPage.tsx:122-207` |
| 10 | Propagar `?redirect` login→cadastro→pós-login + apagar localStorage órfão | A7 | candidato | `LoginCandidatoPage.tsx:492` |
| 11 | Varredura de affordances mortas (menus, badges 12/5, botão no-op, tiles "-") | E5 | ux, recrutador | `RHSidebar.tsx:74`, `CandidatosRHPage.tsx:442` |
| 12 | Remover percentil numérico da devolutiva/telas RH (descritores qualitativos) | C3-curto | psicometra | `08-bigfive-devolutiva.md`, `bigfive-scoring.ts` |

### Apostas estratégicas (esforço L, alto valor)

1. **Pipeline de comunicação transacional (A1-fase2)** — a dor original do PRD; destrava SLAs 03/05/06, agendamento (B7), retenção LGPD (D3) e banco de talentos (D5), e aposenta o n8n pessoal. É a fundação de metade do plano — priorizar como primeira aposta.
2. **Caminho de escrita completo de vagas (B1)** — sem ele o produto não opera sem SQL; casa 1:1 com A13/A29 do M4-C, fazer na mesma fase.
3. **SJT: banco ≥6-8 itens/cargo + Camada 1 SME + opções balanceadas (C4)** — condição para o peso 25-35% ser honesto; enquanto não sai, rebaixar o peso (config, esforço S).
4. **Relatórios M2 sobre `historico_candidatura` + KPIs oficiais (D1+F1)** — o argumento de existência do build perante o sponsor; os dados já estão gravados.
5. **Banco de talentos + re-candidatura (D5)** — maior ROI ausente; naturalmente M5, depois do pipeline de comunicação e do fix M12.
6. **LGPD retenção/exclusão (D3)** — passivo que cresce com cada candidatura; agendar antes de qualquer campanha de volume.

**Ordem sugerida de ondas de produto** (entrelaçadas com o M4 técnico):
Onda 1 = Quick wins + C1 (honestidade e alcançabilidade). Onda 2 = funil operável pelo RH (B1, B2, B3, B4, B6, B8 — junto do M4-C). Onda 3 = jornada resiliente do candidato (A2, A3, A5, A6, B5, B7 + A1-fase2). Onda 4 = método e medição (C3-C8, D1, F1, F2). Onda 5 (M5) = D3, D4, D5, D6, F3.

---

## 6. Relação com a auditoria técnica e o M4

O M4-full (50 itens, ~100pt, 5 categorias) já está aprovado. Este plano **não compete** com ele — grande parte das recomendações ou é o *lado de produto* de um achado já escopado (fazer juntos na mesma fase evita retrabalho), ou é o que o M4 deliberadamente não cobre (feature-work). Mapa de casamento:

| Categoria M4 | Recomendações de produto que casam na mesma fase | Observação |
|---|---|---|
| **M4-A (Segurança/PII/LGPD)** | O achado estratégico "o que o candidato lê via API" (A7/A40/A19) é a prioridade *jurídica* deste plano — executar antes de campanha de volume. Somar: C2 (itens políticos = dado sensível, mesma natureza LGPD), e promover o pgTAP A45 do backlog para as tabelas de veredito/gabarito. | A substituição do n8n pessoal (A11) deve ser feita *pela* EF de notificação (A1-fase2), não como patch — resolver por substituição. |
| **M4-B (Confiabilidade IA)** | C1 é literalmente A3+catch — acrescentar o alarme 0.0.0 no admin/ai-logs (novo). E3/B9 (expectativa de espera, cache do comparativo) e F2 (teto pré-chamada + custo-por-contratação sobre A24) são os complementos de produto da mesma varredura. A5 (desacoplar submit) usa o mesmo músculo de EF/timeout. | M4-B primeiro movimento do M4, como o estratégico recomendou — devolve a qualidade paga. |
| **M4-C (drift M1→M2)** | A maior sobreposição: B1↔A13, B8↔A12/A16, A3↔A41/A15, A4↔A18, C4-filtro↔A17, B3↔A9, D5-prereq↔A27, B1-wizard↔A29. **Recomendação de escopo: ao planejar as fases M4-C, incluir os deltas de produto deste plano no mesmo touch dos arquivos** — ex.: quando abrir CriarEditarVagaPage para A13, implementar o INSERT completo (B1), não só o fix de hidratação; quando remover o Kanban (A12), já reconstruir /rh/candidatos cross-vaga (B8); quando corrigir A41, derivar conclusão por candidatura (A3). | B2 (avançar etapa individual), B4 (hub id + enriquecimento), B6 (dashboard fila) e D1 (relatórios) **não estão** no M4-C e são o complemento indispensável — sem eles o funil fica correto porém inoperável. Propor como requirements adicionais da(s) fase(s) M4-C ou fase irmã "Operação do Funil". |
| **M4-D (Migrations/DB)** | F3 é o mesmo item visto pela lente de continuidade — somar runbook + limpeza de dados TESTE ao critério de aceite. | Destrava staging e pgTAP. |
| **M4-E (Testes/CI)** | E1 (login onBlur) elimina a gambiarra de blur() dos E2E; o teste de rota hub-id (B4) e o contrato template↔container (A3/A15) entram na rede de testes; A31/A47 (credenciais) casam com a criação de contas de teste do runbook. | — |
| **Diferidos do M4 (A14/A37 → M5)** | D2 executa a mitigação sugerida pelo próprio audit (gatear telas mock) JÁ, e a implementação real fica em M5 — consistente. | A53/A55 do backlog são absorvidos por E1-adjacente e A6 (devolutiva). |

**O que este plano adiciona que nenhum achado técnico cobre** (candidatos a um M5 de "Operação & Comunicação" ou a fases extra no próprio M4): pipeline de notificações (A1), agendamento de entrevista (B7), fila de revisão LGPD (B3b), CV/análise visível ao RH (B5), relatórios M2 + KPIs (D1/F1), pós-aprovação (D4), banco de talentos (D5), retenção/exclusão LGPD (D3), e toda a agenda psicométrica substantiva (C3, C4, C6, C7, C8 — normas, calibração SME, BARS fixas, bias por etapa). A recomendação de sequência global: **M4-B → M4-A → M4-C+Onda 2 de produto → Onda 3 (comunicação) → M4-D/E em paralelo → M5 (método, medição e completude)** — com os 12 quick wins rodando como varredura imediata, antes ou junto da primeira fase.
