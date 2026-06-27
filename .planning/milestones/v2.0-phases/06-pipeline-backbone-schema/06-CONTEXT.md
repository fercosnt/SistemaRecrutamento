# Phase 6: Pipeline Backbone & Schema - Context

**Gathered:** 2026-06-07
**Status:** Ready for planning

<domain>
## Phase Boundary

O pipeline de 6 etapas existe no banco como **fonte de verdade auditável**: enum novo
(`inscricao` → `triagem` → `avaliacao_assincrona` → `entrevista_online` →
`entrevista_presencial` → `decisao_final` + terminais `aprovado`/`rejeitado`),
avanço controlado pelo trigger `avancar_etapa()`, trilha de auditoria
`historico_candidatura`, RLS em 100% das tabelas novas, e o guardrail estrutural de
zero-auto-rejeição (`decisao_final.por_usuario NOT NULL`). É a fundação de schema do M2.

**Requirements:** FUNIL-01, FUNIL-02, FUNIL-03, FUNIL-04, LGPD-02.

**Não é desta fase:** as tabelas de feature (`analise_candidato_vaga`, `scores_candidato`,
`redacoes_candidato`, `entrevistas_candidato`, `comparativo_solicitado`,
`pergunta_opcao_metadata`, `vaga.testes_aplicaveis`, etc.) — cada uma é criada pela
fase da sua feature (7-15). Nenhuma lógica de IA, nenhuma EF de avaliação, nenhuma UI.

</domain>

<decisions>
## Implementation Decisions

### Escopo de schema na fase (FUNIL-01..04, LGPD-02)
- **D-01:** **Backbone-only.** A Phase 6 cria SÓ o que os success criteria exigem:
  enum `etapa_processo` v2 (6+2), `status_candidatura` v2 (sem mudança grande, §8.1 mig 03),
  `historico_candidatura`, `bias_audit_log`, `decisao_final`, trigger `avancar_etapa()`,
  e RLS de todas essas tabelas. Tabelas de feature ficam para as fases 7-15 (cada fase
  cria a sua). Razão: menor blast-radius por fase; cada migration PL/pgSQL isolada no
  workaround 42601; evita desenhar RLS de tabela cuja feature ainda nem foi especificada.
- **D-02:** **`decisao_final` é criada COMPLETA agora** (todos os constraints do §8.2:
  `por_usuario uuid NOT NULL`, `justificativa text NOT NULL CHECK length >= 50`,
  `decisao enum (aprovado/rejeitado/em_espera)`, FKs, `RLS INSERT WITH CHECK false`).
  A feature de Decisão Final (Phase 15) só escreve a EF/UI por cima. Razão: o success
  criterion #5 exige que o guardrail `por_usuario NOT NULL` seja auditável por SQL JÁ na
  Phase 6 — o constraint estrutural tem que existir agora.

### Cutover do enum legado com dado real (FUNIL-01)
- **D-03:** **In-place `ALTER COLUMN ... USING`**, não rebuild de tabela. Sequência:
  `CREATE TYPE etapa_processo_v2` → `ALTER TABLE candidaturas ALTER COLUMN etapa_atual
  TYPE etapa_processo_v2 USING (<mapping>)` → ajustar default → `DROP TYPE` legado →
  rename v2 → `etapa_processo`. Mantém tabela, FKs, índices e RLS no lugar.
- **D-04:** **Backup defensivo em schema dedicado no próprio DB** ANTES do drop:
  `CREATE TABLE <schema_backup>.candidaturas_pre_funil AS SELECT * FROM candidaturas`
  (ex. schema `backup_m2` ou similar — naming a confirmar no plan). Fica no DB, auditável
  por SQL; retenção decidida depois. Razão: o cutover roda no SQL Editor (workaround 42601),
  então backup no DB é o caminho mais simples e verificável.
- **D-05:** **Mapeamento das linhas vivas:** `triagem→triagem`, `aprovado→aprovado`,
  `rejeitado→rejeitado`. Valores legados intermediários órfãos (`bigfive`, `disc`, `raven`,
  `cultura`, `avaliacao_final`, `entrevista_online`/`entrevista_presencial` se mapeáveis)
  — se alguma linha existir — colapsam para `triagem` com uma linha de log em
  `historico_candidatura`. Nota: FUNIL-01 declara o enum legado "nunca exercido" além de
  triagem, então o esperado é que não haja órfãos; o mapping é defensivo.

### Política de transição do `avancar_etapa()` (FUNIL-02)
- **D-06:** **Avanço pra frente é livre, inclusive pulando etapas** (RH às vezes adianta
  candidato forte direto pra entrevista). **Regressão (voltar pra etapa anterior) exige
  justificativa preenchida** — bloqueada se vazia (success criterion #2). Terminais
  (`aprovado`/`rejeitado`) são setáveis de qualquer etapa.
- **D-07:** **Justificativa + critério textual chegam ao trigger via colunas companheiras
  na própria `candidaturas`** (ex. `etapa_motivo` / `etapa_justificativa` — naming a
  confirmar no plan). O mesmo `UPDATE` seta `etapa_atual` + a coluna de justificativa; o
  trigger `BEFORE UPDATE` lê `NEW.<justificativa>`, bloqueia regressão se vazia, e copia o
  texto para `historico_candidatura`. Atômico, transacional, sem estado de sessão/GUC.

### Escrita da transição + captura do ator (FUNIL-03, FUNIL-04, LGPD-02)
- **D-08:** **Avanço de etapa = `UPDATE candidaturas` direto do client (supabase-js),
  RLS-gated.** RLS permite o UPDATE só para role `rh`/`administrador`; o trigger valida a
  transição e grava `historico`. `ator = auth.uid()` (disponível no contexto RLS). Razão:
  simples, sem EF por clique, coerente com triagem RH em massa. **`decisao_final` continua
  EF-only** (caso especial do guardrail — `WITH CHECK false`).
- **D-09:** **`historico_candidatura.ator` é NULL-able.** Ação humana → `ator = auth.uid()`.
  Ação do sistema (auto-rejeição por knockout na Phase 8; writes via EF `service_role` onde
  `auth.uid()` é null) → `ator = NULL` + `auto_rejeitado = true`. O **guardrail
  zero-auto-rejeição (LGPD-02) vive SÓ em `decisao_final.por_usuario NOT NULL`**: decisão
  final nunca é automática, mas transições de pipeline / knockouts de etapa podem ser.
  Distinção limpa entre "transição de pipeline" (audit-only, ator pode ser sistema) e
  "decisão final" (sempre humana, NOT NULL).

### Claude's Discretion
- Naming exato das colunas companheiras (`etapa_motivo`/`etapa_justificativa`), do schema
  de backup (`backup_m2.*`), e dos tipos enum v2 — planner escolhe seguindo a convenção
  pt-BR snake_case do projeto.
- Índices em `historico_candidatura` (provável `candidatura_id` + `criado_em`) e em
  `decisao_final` — planner define com base no padrão de query.
- Mecânica fina do mapping de órfãos no `USING` (CASE expression) — planner resolve com
  base no que o dado real mostrar.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design congelado (fonte de verdade do schema)
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.1 — lista das 16 migrations
  sequenciais (Phase 6 = mig 01/02/03 enum/status, 12 decisao_final, 13 historico,
  14 bias_audit, 15 trigger avancar_etapa, 16 RLS). **Workaround 42601 anotado em §8.1.**
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.2 — schemas das tabelas-chave
  (`decisao_final` com os NOT NULL/CHECK constraints; demais detalhadas nos mini-PRDs).
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.3 — template de RLS policies
  (⚠ corrigir role `'admin'` → `'administrador'`, ver code_context).
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.7 — decisões técnicas-chave
  (score estável, EF vs n8n, versionamento de prompt — contexto pras fases seguintes).

### Requirements + roadmap
- `.planning/REQUIREMENTS.md` — FUNIL-01..04 + LGPD-02 (com tags §/RF do PRD entre colchetes).
- `.planning/ROADMAP.md` Phase 6 — Goal + 5 Success Criteria (alvos de verificação).

### Convenção do projeto
- `CLAUDE.md` §Commands — **workaround obrigatório SQLSTATE 42601** para migrations PL/pgSQL
  (`CREATE FUNCTION`/`DO $$...$$`): SQL Editor manual + `supabase migration repair --status
  applied <version>` + remover wrappers `BEGIN;...COMMIT;`. Recorre no trigger `avancar_etapa()`.
- `CLAUDE.md` §Security Rules — RLS em 100% das tabelas; nunca `service_role` no client;
  sistema NUNCA rejeita automaticamente por score (RNF-07a → LGPD-02).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Custom Access Token Hook** (`supabase/migrations/20260420000002_unified_auth_role.sql`):
  injeta `role` no JWT `app_metadata`. A RLS de FUNIL-04 deve ler
  `(auth.jwt() -> 'app_metadata' ->> 'role')` — padrão já estabelecido no M1.
- **Padrão de migration M1** (`supabase/migrations/2026042*.sql`): nomenclatura
  `YYYYMMDDHHMMSS_descricao.sql`; precedente de RLS policies e RPC SECURITY DEFINER.
- **`submit_candidatura` RPC** (`20260425000003_submit_candidatura_rpc.sql`): já seta
  `status='aguardando_resposta'` + `etapa_atual='triagem'` no INSERT — é o produtor das
  candidaturas vivas que o cutover (D-03/D-05) vai migrar.

### Established Patterns
- **Role values no JWT real (M1):** o hook emite `'rh'`, `'administrador'`, `'candidato'`.
  ⚠ **O template de RLS do PRD §8.3 usa `'admin'` — mismatch. Usar `'administrador'`** nas
  policies de FUNIL-04, senão RH/admin não lê nada.
- **Coluna de auth na tabela `candidatos`:** o hook usa `WHERE user_id = ...` em
  `usuarios_rh`; o template do PRD §8.3 escreve `auth_user_id` para `candidatos`. **Verificar
  o nome real da coluna em `candidatos`** antes de escrever a RLS (researcher: confirmar
  contra o schema vivo / `database.types.ts`).
- **Two-client EF pattern (D-23 do M1):** quando a EF precisar (decisao_final, knockout),
  `supabaseUser` (anon + Authorization) para `auth.getUser()` + `supabaseAdmin` (service_role)
  para writes privilegiados. Nunca `service_role` para `auth.getUser()`.
- **Commits bloqueados pelo hook tsc** (FOUND-08, baseline ~292-296 erros): convenção M1 =
  `git -c core.hooksPath=/dev/null`. Fernando commita no terminal dele.

### Integration Points
- `candidaturas.etapa_atual` (enum `etapa_processo`) + `candidaturas.status`
  (`status_candidatura`) — alvos diretos do cutover D-03.
- `database.types.ts` é **gerado** (`npm run db:types`) — regenerar após as migrations;
  nunca editar à mão.
- Handoff do M1: candidaturas vivas em `etapa_atual='triagem'` — o ponto de entrada do M2.

</code_context>

<specifics>
## Specific Ideas

- O cutover (D-03/D-04) provavelmente roda como passo human-action no SQL Editor (padrão
  estabelecido na Phase 4 pelo workaround 42601), com `migration repair` depois.
- A distinção conceitual que o usuário quer preservar: **"transição de pipeline" ≠ "decisão
  final"**. Pipeline pode ter ator-sistema (knockout); decisão final é sempre humana e
  auditável. O schema codifica isso em dois lugares diferentes (D-09).

</specifics>

<deferred>
## Deferred Ideas

- **Tabelas de feature do M2** (`analise_candidato_vaga`, `scores_candidato`,
  `redacoes_candidato`, `entrevistas_candidato`, `comparativo_solicitado`,
  `pergunta_opcao_metadata`, `vaga.testes_aplicaveis`, `vaga.pesos_avaliacao`,
  `devolutivas_candidato`, `bigfive/cognitivo_respostas_em_progresso`) — cada uma na fase
  da sua feature (7-15), por D-01.
- **EF `avancar-etapa` dedicada** — não nesta fase; D-08 escolheu UPDATE direto RLS-gated.
  Revisitar só se uma feature futura exigir lógica de transição complexa demais pro trigger.
- **Retenção/anonimização do schema de backup** (`backup_m2.*`) — política de TTL/purga
  decidida depois; por ora o snapshot só existe.
- **MS Bookings / `agendamentos_entrevista`** — fora do M2 v1 (REQUIREMENTS.md Future).

None blocking — discussion stayed within phase scope.

</deferred>

---

*Phase: 6-pipeline-backbone-schema*
*Context gathered: 2026-06-07*
