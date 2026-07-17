# Phase 32: Fechar os Dois Vazamentos Vivos — CV Signed-URL EF + KPI DEFINER RPC (BLOCKING) - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Existe — e é comprovadamente seguro por smoke comportamental (JWT impersonado) — o par de read-primitives vaga-scoped que as telas do RH da Phase 34 vão consumir: a EF `get-curriculo-url` (authenticate-THEN-authorize, com a policy de leitura role-only do bucket `curriculos` **removida**) e a RPC `funil_kpis` SECURITY DEFINER (vaga-scoped internamente), com `rh_le_historico` endurecido em defesa-em-profundidade.

**Zero UI end-user** — esta fase é gatilho (BLOCKING) da Phase 34. Nenhum componente/tela nova. O único wiring de cliente é a reescrita da leitura de CV (`cvUploadService`) para invocar a EF em vez de `createSignedUrl` client-side.

**Requirements:** SEG-01, SEG-02.
**Fora de escopo:** dashboard de KPIs / fila de trabalho / CV+IA na tela (Phase 34); agendamento (33/34/35); os KPIs adicionais que dependem de AGEND-03 (time-to-hire/no-show — Phase 34).
</domain>

<decisions>
## Implementation Decisions

### EF `get-curriculo-url` + policy do bucket `curriculos` (SEG-01)
- **Input:** `candidatura_id` (a EF resolve `curriculo_url` + `vaga_id` + posse server-side). **Nunca** aceitar um `path` bruto do cliente (forjável).
- **Authorize-THEN-authenticate:** copiar o padrão two-client (D-23) da `comparativo-candidatos`: `supabaseUser` (anon + Authorization header) faz `getUser()`; `supabaseAdmin` (service_role) lê o papel de `usuarios_rh` (mapear `recrutador→rh`) e checa posse da vaga (`vagas.created_by = user.id`, admin bypassa). 403 se não for dono/admin.
- **Signed URL:** `supabaseAdmin.storage.from('curriculos').createSignedUrl(path, 60)` — TTL curto de 60s (one-shot open/download).
- **JWT mode:** deploy **JWT-ON** (`verify_jwt` default) — só chamadores autenticados chegam; a autorização acontece dentro.
- **Policy change:** remover **apenas** o branch RH role-only de `curriculos_select_own_or_rh` (`20260425000002_curriculos_bucket.sql` L64-67: `role IN ('rh','administrador')`). **Manter** o branch candidato own-folder (`(storage.foldername(name))[1] = auth.uid()::text`) e as policies de upload (`curriculos_insert_own`/`update_own`/`delete_own`). A EF (via service_role) é o único caminho RH ao CV.
- **Client rewire:** `cvUploadService.getSignedUrl()` passa a chamar `supabase.functions.invoke('get-curriculo-url', { body: { candidatura_id } })` em vez de `createSignedUrl` client-side. (Hoje `getSignedUrl` não tem consumidor de componente vivo — só testes — então o blast radius é mínimo; a Phase 34 é quem consome de fato.)

### RPC `funil_kpis` (SEG-02)
- **DEFINER + `SET search_path=''`;** scoping interno `WHERE v.created_by = (select auth.uid())` salvo `administrador` (bypassa). Param opcional `p_vaga_id uuid DEFAULT NULL` — null = todas as vagas do dono; específico = aquela vaga (ainda owner-checked). REVOKE FROM PUBLIC + GRANT EXECUTE TO authenticated.
- **Conjunto de KPIs (P32):** os 3 agregados core PII-safe — **mediana de tempo por etapa** (`percentile_cont(0.5)` sobre deltas de `criado_em` entre transições em `historico_candidatura`, via window/LEAD), **conversão etapa→etapa** (contagem bruta em P32), **volume por etapa**. Os KPIs adicionais (time-to-hire, taxa de knockout, drop-por-etapa, no-show) são Phase 34 (KPI-04; no-show depende de AGEND-03).
- **Base da conversão:** contagem bruta stage→stage em P32; o refinamento de coorte fechada por janela (decisão aberta K4 das REQUIREMENTS) é **deferido à Phase 34**.
- **Retorno:** um único `jsonb` (flexível para o dashboard da P34). **Nunca** retorna identidade de candidato (nome/email/id) — apenas agregados.

### `rh_le_historico` + harness de smoke (SEG-02)
- **`rh_le_historico`** de `historico_candidatura` (`20260607000006:73-77`, role-only) endurecido para o predicado WR-04 vaga-scoped (copiar `redacao_rh_select` de `sec05_08_vaga_scope.sql` — mesma forma de join sem `vaga_id` direto: admin OR `rh AND candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id=c.vaga_id WHERE v.created_by=auth.uid())`). Belt-and-suspenders **junto** com a RPC DEFINER (a RPC não depende dessa policy, mas a policy fecha o leak direto). Manter `candidato_le_proprio_historico` intacto. Este é o sweep que a P24/sec05_08 explicitamente deferiu e nunca varreu.
- **Smokes (JWT-impersonado, fixture descartável, ROLLBACK-free):** (a) recrutador A **não** obtém o CV de um candidato da vaga de B via a EF (403/deny); (b) recrutador A **não** vê números da vaga de B via `funil_kpis`; (c) recrutador A **não** faz SELECT em `historico_candidatura` da vaga de B (RLS deny); (d) `funil_kpis` retorna zero PII (só agregados); (e) grep-guard de bundle — nenhuma `service_role` no bundle do cliente e nenhum `createSignedUrl` client-side sobre `curriculos`.
- **Teste da EF:** deno unit test para o branch de autorização (getUser → role → posse) **+** um curl smoke ao vivo pós-deploy (JWT do recrutador A vs candidatura da vaga B → 403).

### Claude's Discretion
- Nome exato/assinatura da RPC (`funil_kpis(p_vaga_id uuid DEFAULT NULL) RETURNS jsonb`), forma interna dos agregados jsonb, e naming do deno test ficam a critério no plano, seguindo `registrar_decisao`/`comparativo-candidatos`.
- Se a mediana de tempo-por-etapa precisar de um CTE com `LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em)` para computar deltas por transição — decisão de implementação no plano.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **EF two-client (D-23)** — `supabase/functions/comparativo-candidatos/index.ts`: Deno.serve, OPTIONS short-circuit, env `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY`, `supabaseUser` (anon+Authorization) `getUser()`, `supabaseAdmin` (service_role) lê papel de `usuarios_rh` (map `recrutador→rh`) + posse de vaga (`vagas.created_by`). CORS + `jsonResponse`/`errorResponse` inlined (sem `_shared/cors.ts`). `createClient` de `esm.sh/@supabase/supabase-js@2`. `.join("npm:")` bug FIXED (static `npm:`). Análogo direto da `get-curriculo-url`.
- **Bucket policies** — `supabase/migrations/20260425000002_curriculos_bucket.sql`: `curriculos_select_own_or_rh` (L55-68, branch RH L64-67 a remover); uploads own-folder L71-102 (manter).
- **`cvUploadService.getSignedUrl()`** — `src/features/vagas/services/cvUploadService.ts:193-195` (`createSignedUrl`). Path em `candidaturas.curriculo_url`. Sem consumidor de componente vivo (só testes).
- **WR-04 analog** — `redacao_rh_select` em `supabase/migrations/20260706110004_sec05_08_vaga_scope.sql:94-104` (join sem vaga_id direto); mesma forma em `20260625100002_decisao_final_rh_vaga_scope.sql:53-66`. `sec05_08` L126-131 deferiu `rh_le_historico` — este é o sweep.
- **KPI inputs** — `historico_candidatura` (`database.types.ts:1856-1886`): `etapa_de`/`etapa_para`/`criado_em`/`ator`/`auto_rejeitado`/`candidatura_id`. `candidaturas`: `etapa_atual`/`status`/`vaga_id`/`created_at`. Dead `RelatoriosRHPage.tsx` (`useFunilConversao` L603-660; refs colunas inexistentes — não reusar, substituir).
- **Smoke idiom** — `supabase/tests/sec02_smokes.sql`, `funil12_status_rpc_smoke.sql` (set_config request.jwt.claims + SET ROLE authenticated, fixture descartável, ROLLBACK-free cleanup).
- **Vault secrets** — `project_url`/`edge_invoke_key` para DB→EF pg_net (`cost_guardrail_fix.sql`, `reprocessar_rpc.sql`) — NÃO necessários p/ client→EF `functions.invoke` (usa JWT do usuário; EF lê `Deno.env`).

### Established Patterns
- EF deploy via `supabase functions deploy <name>` (JWT-ON default). Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601). Client→EF via `supabase.functions.invoke`.
- `usuarios_rh` é a fonte de papel dentro da EF (NÃO `getUser().app_metadata`) — [[reference_ef_authenticate_vs_authorize]].
- ⚠️ MCP `apply_migration` grava version-row com timestamp próprio ≠ filename → reconciliar `supabase_migrations.schema_migrations` (precedente P31/P11).

### Integration Points
- Nova EF `supabase/functions/get-curriculo-url/index.ts` + deploy JWT-ON.
- 2 migrations: (1) drop do branch RH da policy `curriculos_select_own_or_rh`; (2) RPC `funil_kpis` DEFINER + hardening `rh_le_historico` WR-04.
- Rewire `cvUploadService.getSignedUrl()` → `functions.invoke('get-curriculo-url')`.
- Regen `database.types.ts` (RAIZ) após a RPC.
- Novo `supabase/tests/seg32_smokes.sql` + deno test da EF.
</code_context>

<specifics>
## Specific Ideas

- O CV hoje é um leak **vivo** role-only: qualquer RH lê qualquer CV (a policy `curriculos_select_own_or_rh` branch RH não é vaga-scoped). A EF fecha isso tornando-se o único caminho privilegiado; a policy role-only é **removida**, não complementada.
- `rh_le_historico` role-only foi explicitamente deferido em `sec05_08_vaga_scope.sql` (P24) "para Phase 25" e nunca varrido — é o segundo leak vivo. Endurecer é belt-and-suspenders com a RPC (a RPC DEFINER não lê via essa policy, mas leituras diretas de `historico_candidatura` pelo cliente RH ainda passam por ela).
- Smoke comportamental (JWT impersonado) é o gate obrigatório — acima de `pg_policies`/greps estruturais (precedente P24: smokes pegaram REVOKE no-op + OR-defeat que checagens estruturais passaram).
</specifics>

<deferred>
## Deferred Ideas

- **Dashboard de KPIs / fila de trabalho / CV+IA+feed na tela** — Phase 34 (VISRH/KPI), consome os primitivos seguros desta fase.
- **KPIs adicionais** (time-to-hire, knockout rate, drop-per-stage, no-show) — Phase 34 (KPI-04); no-show depende de AGEND-03.
- **Refinamento de coorte fechada da conversão (K4)** — Phase 34.
- **Remoção do `RelatoriosRHPage` legado** — cleanup opcional (substituído pelo dashboard P34).
</deferred>
