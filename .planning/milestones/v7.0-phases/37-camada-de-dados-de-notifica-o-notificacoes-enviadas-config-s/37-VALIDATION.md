---
phase: 37
slug: camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-09
validated: 2026-08-09
source: auditoria documental retroativa (Phase 47 / Plan 47-05, CONSOL-01)
method: auditoria documental dos artefatos existentes — sem re-execução da fase
---

# Phase 37 — Validation Strategy (veredito retroativo)

> Esta fase fechou em 2026-07-22 **sem arquivo de validação**. Este documento é o veredito Nyquist
> emitido retroativamente pela Phase 47 (CONSOL-01), por **auditoria documental** dos artefatos que
> existem — `37-VERIFICATION.md`, os 5 PLANs, os 5 SUMMARYs, os arquivos de migration e os dois
> smokes SQL — cruzados com o estado vivo do repositório medido em 2026-08-09.
>
> **Nenhuma parte da Phase 37 foi re-executada.** Nenhuma migration, nenhum deploy, nenhum smoke
> contra banco.

---

## Veredito

**PARTIAL — `status: validated` + `nyquist_compliant: false`.**

Os quatro requirements da fase (LEDGER-01, LEDGER-02, LEDGER-03, TIMELINE-01) foram verificados —
e verificados **bem**, por 26 asserções comportamentais e estruturais reais, com impersonação de JWT
de verdade e comparação catálogo-contra-catálogo. O que falta não é qualidade de prova: é
**recorrência**. As 1.148 linhas de smoke que provam esta fase **não rodam em portão nenhum**.

Nenhum dos quatro requirements tem, hoje, um comando que um portão execute. A prova existe, está
versionada, e depende de um humano lembrar de rodá-la à mão via MCP `execute_sql`. Uma regressão
em qualquer um dos quatro passaria por CI verde.

---

## Test Infrastructure

Fato medido do repositório em 2026-08-09 — não copiado de outro arquivo.

| Property | Value |
|----------|-------|
| **Framework desta fase** | **smoke SQL** em `supabase/tests/` — asserções via `RAISE EXCEPTION` + gate-GUC. Não há harness Vitest nem Deno cobrindo esta fase |
| **Config file** | nenhum. Os smokes são `.sql` executados via Supabase MCP `execute_sql` ou `psql` contra Postgres descartável |
| **Comando de execução dos smokes** | não existe entrada em `package.json` nem step em `.github/workflows/ci.yml`. Execução é manual, numa **única chamada** MCP (o gate-GUC é escopado à sessão) |
| **Suíte Vitest do repositório** | `npm run test:run` — 179 arquivos / 1781 testes verdes, 7,7 s (medido). **Zero** deles cobre esta fase |
| **Corpus Deno** | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` — 424/424 verdes, 6 s (medido). **Zero** deles cobre esta fase |
| **Type-check** | `npm run lint` (`tsc --noEmit`) — baseline congelada em 97 erros. Cobre `src/**`; `database.types.ts` entra no type-check, mas nenhuma asserção verifica a *forma* das duas tabelas |
| **Estimated runtime dos smokes** | ~1 s cada, quando executados (`37-VERIFICATION.md:88`) |

---

## Sampling Rate — o que de fato roda hoje

- **Por commit / por PR (CI, bloqueante):** `npm run test:run` · `npm run lint` (teto 104, baseline 97) · corpus Deno · `npm run build` com `postbuild` (`assert-no-secrets` + `assert-chunks`) · os quatro geradores `check:*`
- **Sobre os artefatos desta fase:** **nada**. Nenhum job de `.github/workflows/ci.yml` lê
  `supabase/tests/` — verificado por leitura integral do arquivo de CI
- **Latência de feedback para esta fase:** infinita enquanto ninguém rodar os smokes à mão

---

## Per-Requirement Verification Map

| Req ID | Comportamento | Tipo de prova | Comando / evidência citada por caminho | Roda em portão? | Cobertura |
|--------|---------------|---------------|----------------------------------------|-----------------|-----------|
| LEDGER-01 | `notificacoes_enviadas` registra cada disparo (18 colunas, audit trail) | estrutural (catálogo) | `supabase/tests/p37_fidelidade_schema_smoke.sql` (495 l., 12 asserções) · DDL em `supabase/migrations/20260721000001_notificacoes_enviadas.sql` (158 l.) · `37-VERIFICATION.md:26` | ❌ não | smoke versionado **sem runner** |
| LEDGER-02 | `UNIQUE(dedupe_key)` torna o envio idempotente; `ON CONFLICT DO NOTHING RETURNING id` é o protocolo de claim | comportamental (empírico) | `supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql` asserções (a) e (b) — insere a mesma chave duas vezes e exige SQLSTATE 23505 nomeado `uq_notif_dedupe` · `37-VERIFICATION.md:27` | ❌ não | smoke versionado **sem runner** |
| LEDGER-03 | RH vaga-scoped join-through; candidato-DENY | comportamental (impersonação real) | `p37_lacunas_rls_idempotencia_smokes.sql` asserções (g)(h)(i)(j) — `request.jwt.claims` + `SET ROLE authenticated`, não consulta a `pg_policies` · comparação catálogo-contra-catálogo contra `supabase/migrations/20260716000001_agendamentos_entrevista.sql` · `37-VERIFICATION.md:28,31` | ❌ não | smoke versionado **sem runner** |
| TIMELINE-01 | `config_sla_etapa` existe, non-PII, public-read, seed 8/8 do PRD §5.1.1 | estrutural + comportamental | `supabase/migrations/20260721000002_config_sla_etapa.sql` (108 l.) · smoke asserções (k)(l) — 8 linhas cobrem os 8 labels do enum, 3 CHECKs disparam, `anon` lê as 8 · `37-VERIFICATION.md:29` | ❌ não | smoke versionado **sem runner** |
| LEDGER-01 (derivado) | `atualizado_em` avança em UPDATE (trigger `tocar_atualizado_em`) | comportamental | smoke asserções (e)(f), com fixtures deliberadamente retro-datadas para contornar `now()` ser constante na transação · `supabase/migrations/20260722000002_p37_notificacoes_lacunas.sql` (178 l.) | ❌ não | smoke versionado **sem runner** |
| LEDGER-01/02 (contrato de tipos) | `database.types.ts` conhece as 2 tabelas e o enum sem `any` | inspeção de diff | `git show --stat 7ecf891` = 146 inserções / 0 remoções · `37-VERIFICATION.md:36` | ⚠ parcial — `npm run lint` type-checa o arquivo, mas nenhuma asserção verifica a forma | inspeção pontual, não recorrente |

**Classificação:** 0 de 4 requirements cobertos por comando automatizado que rode num portão ·
4 de 4 cobertos por smoke versionado de alta qualidade **sem runner** · 0 de 4 sem prova nenhuma.

---

## Gaps Nomeados

### G-37-01 — Os dois smokes desta fase não rodam em portão nenhum

- **Comportamento sem cobertura recorrente:** idempotência por `uq_notif_dedupe`, candidato-DENY da
  RLS, fidelidade estrutural das duas tabelas, seed 8/8 do `config_sla_etapa`. Ou seja: **os quatro
  requirements da fase**.
- **Plano de origem:** `37-02-PLAN.md` / `37-03-PLAN.md` (autores dos smokes) — nenhum dos cinco
  planos criou entrada de `package.json` nem step de CI para executá-los.
- **Razão registrada:** `37-VERIFICATION.md:88` — *"SQL executed via Supabase MCP `execute_sql`
  (not invocable from this Bash-only session — I do not have MCP tool access)"*. Os smokes exigem um
  Postgres; o CI do repositório não provisiona um.
- **Comando que fecharia o gap:** um step em `.github/workflows/ci.yml` que suba um Postgres de
  serviço, aplique `supabase/migrations/` e rode
  `psql -v ON_ERROR_STOP=1 -f supabase/tests/p37_fidelidade_schema_smoke.sql -f supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql`.
  Sem provisionar banco não há como fechar este gap — é decisão de infraestrutura, não de escrita de teste.

### G-37-02 — A forma de `database.types.ts` não tem asserção de regressão

- **Comportamento sem cobertura:** que `notificacoes_enviadas` continue com as 18 colunas e
  `destinatario_original` obrigatório no `Insert`; que `config_sla_etapa` e o enum
  `status_notificacao` continuem presentes. Um `npm run db:types` sobre um PROD divergente
  sobrescreveria o arquivo sem que nada reprovasse.
- **Plano de origem:** `37-05-PLAN.md` (regeneração dos tipos).
- **Razão registrada:** nenhuma — o `37-VERIFICATION.md:36` prova a forma por leitura de diff
  pontual, o que é adequado para verificar uma vez e insuficiente para proteger de regressão.
- **Comando que fecharia o gap:** um teste Vitest de sonda de texto-fonte no molde do
  `supabase/functions/_shared/__tests__/strict-schema.test.ts` já existente (que roda sob Vitest e
  não sob Deno), asserindo os nomes de coluna em `database.types.ts`; ele entraria automaticamente
  no `npm run test:run` do CI.

### G-37-03 — A origem do drift PROD→repo continua sem item de rastreio

- **Comportamento sem cobertura:** a fase reconciliou um drift cuja **origem é desconhecida** — as
  duas tabelas já existiam em PROD antes de a fase começar, aplicadas por alguém fora do ledger.
- **Plano de origem:** o reescopo declarado em `37-CONTEXT.md` — a fase foi deliberadamente escopada
  para *reconciliar*, nunca para *descobrir quem aplicou*.
- **Razão registrada:** `37-VERIFICATION.md:113,126` — o verificador classificou como fora de escopo
  legítimo e **recomendou** abrir item em `.planning/todos/pending/`; o aviso hoje vive apenas dentro
  de `.planning/todos/done/37-drift-prod-tabelas-notificacao.md`, seção *"Continua em aberto"*, onde
  é improvável ser relido.
- **Comando que fecharia o gap:** não é um comando — é um item de processo. O equivalente
  automatizável é um step de CI rodando `supabase migration list --linked` e reprovando quando
  Local ≠ Remote, que transformaria "drift silencioso" em falha de build.

---

## Manual-Only Verifications

| Comportamento | Requirement | Por que manual | Instrução |
|---------------|-------------|----------------|-----------|
| Execução dos dois smokes contra PROD | LEDGER-01/02/03, TIMELINE-01 | Exige Supabase MCP `execute_sql`; subagentes GSD não recebem os tools MCP (bug upstream) | Numa **única** chamada por arquivo — o `set_config(..., false)` do gate-GUC é escopado à sessão e statements em chamadas separadas zeram o contador |
| Reconciliação do ledger de migrations | LEDGER-01, TIMELINE-01 | CLI com credencial de projeto | `supabase migration list --linked` — as 4 versions `20260721000001/2` e `20260722000001/2` devem aparecer Local = Remote (`37-VERIFICATION.md:38`, corroborado independentemente pelo verificador) |

---

## Achados da auditoria

1. **Nenhum artefato desta fase divergiu do repositório vivo.** Os cinco arquivos SQL citados pelo
   `37-VERIFICATION.md` existem hoje com as metragens registradas — conferido: `p37_fidelidade_schema_smoke.sql`
   495 linhas, `p37_lacunas_rls_idempotencia_smokes.sql` 653 linhas.
2. **O `37-VERIFICATION.md` é de qualidade acima da média do M7** — enfrenta explicitamente a
   pergunta "o smoke é tautológico?" e responde com evidência (`:107`). Este veredito PARCIAL não
   é crítica da verificação feita; é constatação de que ela não se repete sozinha.
3. **A Phase 40 consome esta fase** e tem cobertura Vitest própria — o `config_sla_etapa` seedado
   aqui é lido por `src/features/timeline/services/slaService.ts`, cujos 4 testes rodam no CI. Isso
   dá ao TIMELINE-01 uma cobertura **indireta e parcial** (prova que o consumidor lê a tabela com
   allowlist; não prova que o seed tem 8 linhas).

---

## Validation Sign-Off

- [x] Todo requirement da fase tem prova citada por caminho
- [ ] Todo requirement tem comando automatizado que roda num portão — **NÃO** (G-37-01)
- [x] Nenhuma prova é tautológica (auditado em `37-VERIFICATION.md:107`)
- [x] Sem watch-mode
- [ ] `nyquist_compliant: true` — **NÃO**, e a razão está nomeada acima

**Aprovação:** veredito PARCIAL emitido em 2026-08-09 por auditoria documental, sem re-execução da
fase. Fecha o CONSOL-01 para a Phase 37 com a cobertura declarada em vez de suposta.
