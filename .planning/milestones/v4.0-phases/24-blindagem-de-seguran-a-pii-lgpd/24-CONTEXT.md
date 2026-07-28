# Phase 24: Blindagem de Segurança / PII / LGPD - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas, all recommended answers accepted

<domain>
## Phase Boundary

Fechar todo vazamento de PII/gabarito e IDOR — **RLS row-level nunca é segredo de coluna** (→ column REVOKE / RPC SECURITY DEFINER), toda EF privilegiada autentica-**E**-autoriza, SELECT policies são vaga-scoped, e dado sensível (gabarito cognitivo, veredito da redação, itens políticos) fica fora do alcance candidato.

Entrega (12 requirements): SEC-01 (gabarito cognitivo), SEC-02 (veredito redação), SEC-03 (n8n webhook), SEC-04 (devolutiva EF authz/IDOR), SEC-05/06 (analise/comparativo vaga-scoped + reprocessar), SEC-07 (rubric), SEC-08 (candidaturas base-table vaga-scoped), SEC-09 (auth_admin policy em migration file), SEC-10 (backup PII), SEC-11 (console.log RH), UX-08 (4 itens O6 políticos).

**Fora do escopo:** correção do funil RH/candidato (P25/26), migrations reconstruindo o banco (P27). SEC-01 é pré-requisito do seed CC0 diferido ao M5.

</domain>

<decisions>
## Implementation Decisions

### Proteção column-level de PII (SEC-01/02/07)
- **SEC-01 gabarito cognitivo (`gabarito_idx`):** column REVOKE de `authenticated` (e `anon`) + leitura só via **RPC SECURITY DEFINER** (padrão answer-key M2 — [[reference_select_star_leaks_pii]]). Um candidato autenticado que faz GET direto na tabela recebe 0 colunas de resposta. Defense-in-depth (REVOKE + RPC), não RPC-only.
- **SEC-02 veredito da redação:** o candidato NÃO lê score/cor/red_flag ético/notas do revisor da própria redação — **allowlist projection** candidate-facing (nunca `select('*')`) + column REVOKE / RLS column-level onde o candidato lê a própria row. Testar a projeção de rede, não o JSX ([[reference_select_star_leaks_pii]]).
- **SEC-07 rubric:** o service candidate-facing **dropa a coluna `rubric`** (critérios BARS) da projeção de perguntas — allowlist explícita sem `rubric`.
- **Mecanismo:** RPC SECURITY DEFINER p/ gabarito (candidato lê id+texto-only via RPC); allowlist + column REVOKE p/ veredito/rubric.

### EF authz + policies vaga-scoped + n8n (SEC-03/04/05/06/08/09)
- **SEC-04 `gerar-devolutiva-bigfive`:** two-client **authenticate-THEN-authorize** — depois de `getUser()`, checar role + **posse** (Bearer interno + role + posse), fechando o IDOR de leitura de devolutiva alheia. Padrão Phase-10 ([[reference_ef_authenticate_vs_authorize]]).
- **SEC-05/06/08 policies vaga-scoped:** trocar SELECT policies **role-only** por **vaga-scoped** — recrutador não-dono NÃO lê análise/comparativo/candidaturas de vaga alheia. Escopo horizontal por `created_by`/posse (padrão WR-03/WR-04). Aplica a `analise_candidato_vaga`, `comparativo_solicitado`, o caminho de `reprocessar`, e a base-table `candidaturas`.
- **SEC-03 n8n webhook:** mover o trigger **server-side** — a EF segura a URL (via Vault/env server-side); o **bundle público NUNCA contém a URL**. Resolver por substituição via EF, não patch no client.
- **SEC-09 `supabase_auth_admin` policy sobre `usuarios_rh`:** declarar a policy execute_sql-only atual (dependência do `custom_access_token_hook`) num **migration file** (mirror da policy viva, zero mudança de comportamento) — elimina o drift execute_sql-only ([[reference_auth_hook_rls_gap]]). NÃO re-migrar a policy se já existe; só declará-la.

### Backup PII, logs, itens O6 (SEC-10/11, UX-08)
- **SEC-10 backup PII:** **DROP** `backup_m2.candidaturas_pre_funil` (backup M2 superseded — os dados vivos estão em `candidaturas`; não é PII permanente fora do alcance). Migration de drop via MCP.
- **SEC-11 console.log RH:** remover `console.log` operacional das páginas RH (não expõe movimentação de candidatos nem emails no console de PROD) + grep guard (padrão FX-14).
- **UX-08 itens O6 políticos (decisão psicométrica-aware):** **desativar/excluir os 4 itens O6 políticos da administração** (fora do alcance candidato — dado sensível, mesma natureza LGPD) **E ajustar o scorer** (`bigfive-scoring.ts`) para dropar/renormalizar a faceta O6 de modo que o instrumento NÃO quebre (o scorer lança se ≠120 itens). O **replacement autoral** (4 itens O6 não-políticos sobre "abertura a valores") fica com o **psicólogo do Fernando em M5** — o M4 só remove a exposição sensível sem quebrar o cálculo. Ver [[project_m4_audit_scope]] (nota psicométrica O6).

### Claude's Discretion
- Nome/assinatura exata das RPCs SECURITY DEFINER novas + colunas do allowlist.
- Forma exata do scorer O6-adjust (dropar a faceta do domínio O vs renormalizar O sobre 5 facetas) — o researcher/psicometria-skill informa; preservar a norma Johnson já wired.
- Onde a URL n8n vive server-side (Vault secret vs env da EF).
- Quais páginas RH têm console.log (grep no plan).

</decisions>

<code_context>
## Existing Code Insights

### Established patterns to REUSE (from M2 — documented in memory)
- **RLS é row-level, não column-level** — `select('*')` vaza gabarito/veredito → answer-keys candidato-DENY + leitura via RPC SECURITY DEFINER ([[reference_select_star_leaks_pii]]).
- **EFs privilegiadas: two-client + autorizar DEPOIS de autenticar** ([[reference_ef_authenticate_vs_authorize]]) — pego como CRITICAL na Phase 10 (analise/comparativo).
- **Auth hook RLS gap** — `custom_access_token_hook` é SECURITY INVOKER; a policy `auth_admin_le_usuarios_rh` + grant existem em PROD mas são execute_sql-only (drift) ([[reference_auth_hook_rls_gap]]).
- **Migrations PROD via Supabase MCP** `apply_migration`/`execute_sql` (bypassa 42601; grava version row) — precedente P6-15/P23.
- Commits via `git -c core.hooksPath=/dev/null` (husky tsc gate, baseline 133).

### Integration points
- `20260706010544_bigfive_devolutiva_seed.sql` / `20260612000001_bigfive_itens.sql` — item bank (UX-08).
- `supabase/functions/_shared/bigfive-scoring.ts` — scorer (UX-08 adjust; norma Johnson wired).
- `supabase/functions/gerar-devolutiva-bigfive/index.ts` — SEC-04 authz (already redeployed in P23; will redeploy again).
- `analise_candidato_vaga`, `comparativo_solicitado`, `candidaturas` policies — SEC-05/06/08.
- Cognitivo gabarito table + perguntas `rubric` — SEC-01/07.
- Redação veredito service (candidate-facing) — SEC-02.
- Client bundle grep for n8n URL — SEC-03; RH pages grep for console.log — SEC-11.

</code_context>

<specifics>
## Specific Ideas
- SEC-01 é pré-requisito explícito do seed CC0 (M5) — blindar o gabarito ANTES de semear itens reais.
- A rede de testes (P22 Deno CI) + as EFs vivas (P23) já aterrissaram → cada mudança de authz/policy é regress-guarded.
- Segurança precisa de SQL smokes simulando candidato/recrutador-não-dono (set_config request.jwt.claims) provando 0-colunas / 42501, como nos SECURITY gates M2.

</specifics>

<deferred>
## Deferred Ideas
- Replacement autoral dos 4 itens O6 (não-políticos) → M5/psicólogo. UX-08 no M4 só remove exposição + ajusta scorer.
- Seed CC0 cognitivo real → M5 (SEC-01 só blinda o gabarito).
- A14/A37 (gestão usuários RH + perfil RH) → M5.
