# Phase 27: Integridade de Migrations & Fechamento da Rede de Testes - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Fechar o M4 endurecendo a **reprodutibilidade do banco** e a **rede de testes** sobre o código já corrigido em P22–26 — sem expansão de produto. Entrega: (1) as migrations reconstroem o banco do zero num ambiente limpo e o ledger de versões converge (DBMIG-01); (2) a semântica de `historico_candidatura.auto_rejeitado` distingue 'escrita do sistema' de 'auto-rejeição' (DBMIG-02); (3) cobertura de teste do único auto-reject sancionado (`submit-candidatura` EF + RPC de knockout) (CI-03); (4) contract tests client↔EF **reais** (o body do client parseia no schema real da EF) + `extractEfErrorCode` deduplicado (CI-06/07); (5) o gate de bundle PERF-03 wired em build **e** CI, `verify_jwt` por EF declarado em `supabase/config.toml`, e o teste de `sync-prompts` rodando no CI (CI-10/13/15).

**Invariante (todas as fases):** IA/knockout recomenda, humano decide — o sistema nunca auto-rejeita por score (RNF-07a); o **único** auto-reject sancionado é o knockout objetivo do `submit-candidatura`.

**Fora de escopo:** squash de migrations, schema declarativo, contract tests das 12 EFs, novas features de produto (→ M5).

</domain>

<decisions>
## Implementation Decisions

### DBMIG-01 — Reconstrução de migrations & convergência do ledger
- **Estratégia: Catch-up + reconcile.** Mantém os **71** migration files (o requisito diz "49" — texto de 2026-07-05, defasado antes de P25/26 adicionarem migrations); preenche o baseline vazio `supabase/migrations/20260419000000_baseline.sql` (hoje 0 linhas) com um dump real do schema pré-migrations **ou** escreve catch-up files para objetos que só existem em PROD; repara o ledger para que **filenames == version rows**. Preserva o histórico granular por-migration que o M4 documentou. (Rejeitados: squash p/ baseline único; schema declarativo — ver `<deferred>`.)
- **Verificação do rebuild-from-zero: Supabase preview branch via MCP** (`create_branch`) — ambiente limpo efêmero que roda os 71 files do zero; é o detector de "objetos só-em-PROD" e "baseline vazio" (o que só existe em PROD **falta** no branch). Não toca PROD; ciclo create→test→(iterar catch-up files)→drop. NÃO rodar o `seed.sql` quebrado (FK a `auth.users`) na verificação.
- **Reconcile do ledger no PROD: BLOCKING · non-autonomous wave** (precedente 24-08/25-07/26-07). `execute_sql` / `migration repair` semantics para inserir/reparar os version rows dos ~9+ migrations aplicados via MCP `apply_migration` (que auto-insere version rows timestamp-only, criando o drift filename↔version). Convergência é critério de aceite — não deixar como drift cosmético.

### DBMIG-02 / CI-03 — Semântica auto_rejeitado + cobertura submit-candidatura
- **Distinção semântica: reusar `ator IS NULL` como "escrita do sistema"** (já existe na coluna `ator`/`v_ator`); corrigir o trigger `avancar_etapa` (`20260607000005`) para `auto_rejeitado=true` **só** na auto-rejeição sancionada, discriminando via GUC txn-local `app.rejeicao_sancionada`. **Zero coluna nova.** Hoje o trigger faz `auto_rejeitado = (v_ator IS NULL)`, o que marca survivor-advances (escrita do sistema, NÃO rejeição) como auto-rejeitados — esse é o defeito DBMIG-02.
- **Backfill: UPDATE one-time** corrigindo as linhas históricas que hoje têm `auto_rejeitado=true` por serem escrita-do-sistema (não auto-rejeição sancionada) para `false`. Seguro: audit-only, **zero client reads** de `auto_rejeitado` em `src/`.
- **Cobertura CI-03:** Deno test da RPC `submit_candidatura_atomic` (knockout sancionado + survivor advance + dedup de respostas) **+** contract test do body client↔EF (Zod) — a EF `submit-candidatura` é o único auto-reject sancionado e hoje tem **zero** cobertura.

### CI-06/07/10/13/15 — Fechamento da rede de testes
- **CI-07 (contract real): módulo `.ts` de schema compartilhado.** Extrair cada schema de body para um módulo importável por **ambos** os lados: EF (Deno) via import-map `zod` no `supabase/functions/deno.json`; client-test (Node/Vite) via `zod` do Node. O body do client parseia no schema **real** da EF — não replica os dois lados. Segue o precedente `src/features/decisao/schemas/consolidacaoSchema.ts`.
- **CI-07 (escopo):** `submit-candidatura` (CI-03) **+** migrar os 3 contract tests existentes (redacao, entrevista, consolidacao) do idiom replica+fs-probe para o schema compartilhado. (As 12 EFs completas → deferido.)
- **CI-13:** criar `supabase/config.toml` **do zero** (não existe hoje) com as **12** funções declaradas + `verify_jwt` derivado do código — submit-candidatura **ON**; gerar-devolutiva-bigfive / analise-candidato-individual (Bearer self-auth) **OFF**; demais conforme o deploy real de cada uma.

### Claude's Discretion
- **CI-06:** deletar a cópia local invertida `extractEfErrorCode(error, data)` do `entrevistaService.ts` (`:662`, call `:637`, retorna `string|null`); importar o shared `@/lib/efErrors` (`(data, error)`, retorna `string|undefined`); corrigir a ordem dos args no call site + reconciliar `null`→`undefined`.
- **CI-10:** `scripts/assert-chunks.mjs` já existe mas está **unwired** — adicionar npm script (`assert:chunks`) + wire em build (`postbuild` ou chain) **e** num step dedicado do CI após `npm run build`.
- **CI-15:** o job `deno-test` do `ci.yml` cobre só `supabase/functions` — incluir `scripts/__tests__` (ou step separado) para rodar `scripts/__tests__/sync-prompts.test.ts` (Deno) no CI.
- Ordem de execução das waves, atomicidade dos commits, e nomes de arquivos/migrations a critério do planner/executor. Baseline tsc de CI re-medido/re-pinado se mudar (atual pinado 107, real 104).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/efErrors.ts:38` — `extractEfErrorCode(data, error)` shared helper (+ `src/lib/__tests__/efErrors.test.ts`); já consumido por decisao/triagem/bigfive/avaliacao services com a ordem canônica.
- `src/features/decisao/schemas/consolidacaoSchema.ts` — **precedente** de schema Zod compartilhado importado por EF **e** client (base p/ CI-07).
- `scripts/assert-chunks.mjs` (150 linhas) — 4 asserções PERF-03 (react-vendor presente; eager `index-*.js` < 2.788.270 bytes; sem jsPDF no index eager; chunk count > 4). Existe, **não-wired**.
- `scripts/sync-prompts.ts` + `scripts/__tests__/sync-prompts.test.ts` — teste Deno (7 casos: contentHash/validateFrontmatter/buildUpsertRow), **não roda no CI**.
- Corpus Deno das EFs (23 `*.test.ts`) sob `supabase/functions/deno.json`, type-check ON no CI.

### Established Patterns
- Migrations: timestamp-prefixed `YYYYMMDDHHMMSS_slug.sql`. PROD writes via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601; **auto-insere version row** → origem do drift filename↔version que DBMIG-01 reconcilia).
- `submit_candidatura_atomic` (última versão em `20260709000014_submit_candidatura_flag.sql:38-195`): knockout sancionado = `set_config('app.rejeicao_sancionada','on',true)` → `UPDATE … status='rejeitado'` → history INSERT `auto_rejeitado=true, ator NULL`.
- Trigger `avancar_etapa` (`20260607000005`): audit snapshot com `auto_rejeitado = (v_ator IS NULL)` — o conflate que DBMIG-02 corrige.
- `ci.yml`: jobs `unit` (tsc frozen baseline **107**, real 104; + vitest), `deno-test` (blocking, type-check on), `e2e` (playwright + build), `lighthouse` (build + lhci). `prompts-sync.yml` roda o **script** sync-prompts (não o teste) no merge-to-main.

### Integration Points
- `ci.yml` — onde CI-03/10/15 aterrissam (novos steps/jobs) e o baseline tsc é re-pinado.
- `supabase/functions/submit-candidatura/index.ts` → RPC `submit_candidatura_atomic`; schema `_shared/schemas.ts:201` `submitCandidaturaSchema`.
- `supabase/functions/deno.json` — import-map onde `zod` é mapeado p/ o schema compartilhado do CI-07.
- `supabase/config.toml` — **inexistente**; criado do zero p/ CI-13 (12 funções: analise-candidato-individual, avaliar-redacao, avaliar-redacao-cultural, avaliar-transcricao-entrevista, cadastrar-candidato, comparativo-candidatos, consolidar-decisao-final, cost-alerter, gerar-devolutiva-bigfive, gerar-guia-entrevista, submit-bigfive-final, submit-candidatura).

</code_context>

<specifics>
## Specific Ideas

- **71 migration files** (não 49 — o número no requisito/ROADMAP/STATE está defasado; atualizar a contagem ao fechar a fase).
- **Baseline vazio:** `supabase/migrations/20260419000000_baseline.sql` = 0 linhas — o "baseline vazio" que DBMIG-01 proíbe.
- **`supabase/config.toml` não existe** em lugar nenhum — CI-13 é criação from-scratch, não edição.
- **`seed.sql`** (139 linhas) self-documenta que quebra `supabase db reset` (UUIDs placeholder sem `auth.users` reais → FK). Não usar na verificação de rebuild; se um caminho local for necessário no futuro, guardar/corrigir o seed.
- **Duplicata CI-06:** `entrevistaService.ts` — `extractEfErrorCode(error, data)` em `:662` (call `:637`), retorna `string|null`; assinatura **invertida** vs o shared `(data, error)` que retorna `string|undefined`.
- **Órfãos:** `N8NWebhookPayload/Response` em `formTypes.ts` (0 consumers, sem host n8n, type-only) — candidatos ao sweep P27 se low-cost; senão → M5.

</specifics>

<deferred>
## Deferred Ideas

- **Squash de migrations** p/ baseline único e **schema declarativo** (`supabase/schemas/`) — rejeitados p/ este milestone (mantido catch-up+reconcile p/ preservar histórico e ficar em escopo de hardening).
- **Contract tests reais das 12 EFs** — escopo limitado a submit-candidatura + os 3 existentes; o restante fica p/ um milestone futuro se o valor aparecer.
- Pipeline de notificação / agendamento / relatórios-KPIs / banco de talentos / retenção LGPD → **M5** (`.planning/M5-DRAFT.md`).

</deferred>
