---
artifact: Execute-Order Runbook (Fernando, copy-paste sequence)
phase: 06-pipeline-backbone-schema
project_ref: isljnozzlvckrgjjbjwp
created: 2026-06-07
source: derived from 06-HANDOFF.md + 06-SQL-SMOKE-RUNBOOK.md (dependency-ordered)
---

# Phase 6 — Roteiro de aplicação (ordem de dependência)

> **Como usar:** rode tudo no **Supabase SQL Editor** do projeto `isljnozzlvckrgjjbjwp`, um
> bloco por vez, na ordem abaixo. Onde diz "abrir arquivo X", abra o `.sql`, copie TODO o
> conteúdo e cole. Onde o SQL está inline aqui, cole direto. **Capture só contagens/distribuições
> — nunca cole dados de candidato (PII).** Vá anotando os resultados nos blocos do
> `06-SQL-SMOKE-RUNBOOK.md`.
>
> ⚠️ **Ordem ≠ ordem dos nomes dos arquivos:** o cutover (`...02`) roda ANTES do histórico
> (`...01`). Não use `supabase db push` para aplicar — eu rodo o `repair`+`push` no fim.
>
> 🐞 **Correção já aplicada** no `...02` (backup.etapa_atual → text) — sem ela o `DROP TYPE`
> falharia. Você vai colar a versão já corrigida do arquivo.

---

## STEP 0 — Pré-voo (read-only, não muda nada)

**0a. Dependências do enum antigo (GATE de segurança).** Lista toda coluna que usa
`etapa_processo`. **Esperado: só `candidaturas.etapa_atual`.** Se aparecer qualquer outra tabela
(ex.: kanban legado), **PARE e me avise** — o `DROP TYPE` do cutover falharia nela.

```sql
SELECT c.relname AS tabela, a.attname AS coluna
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_type t ON t.oid = a.atttypid
WHERE t.typname = 'etapa_processo'
  AND a.attnum > 0 AND NOT a.attisdropped
  AND c.relkind = 'r'
ORDER BY 1,2;
```

**0b. Discovery §A** (distribuição + total ANTES de qualquer DDL — base do smoke FUNIL-01):

```sql
-- A1. contagem + distribuição (diz se há órfãos)
SELECT etapa_atual, count(*) FROM public.candidaturas GROUP BY etapa_atual ORDER BY count(*) DESC;

-- A2. default atual (o cutover precisa dropar antes de trocar o tipo)
SELECT column_default FROM information_schema.columns
 WHERE table_schema='public' AND table_name='candidaturas' AND column_name='etapa_atual';

-- A3. confirmar que as 3 tabelas novas ainda não existem (espera 0 linhas)
SELECT tablename FROM pg_tables
 WHERE schemaname='public'
   AND tablename IN ('historico_candidatura','decisao_final','bias_audit_log');
```

➡️ **Anote `discovery_total_rows` (soma do A1).** E veja se o A1 mostra algum valor órfão
(`bigfive / disc / raven / cultura / avaliacao_final` ou qualquer coisa fora de
`triagem / aprovado / rejeitado / entrevista_online / entrevista_presencial`). Isso decide o STEP 3.

---

## STEP 1 — Cutover do enum  → abrir `supabase/migrations/20260607000002_etapa_processo_v2_cutover.sql`

Cole o arquivo inteiro (já corrigido) e rode. Cria o `backup_m2`, troca o enum em produção,
renomeia v2 → `etapa_processo`, adiciona `etapa_justificativa`.

---

## STEP 2 — Histórico  → abrir `supabase/migrations/20260607000001_historico_candidatura.sql`

Cole e rode (agora `etapa_processo` já é v2). Cria a tabela de auditoria append-only.

---

## STEP 3 — Auditoria de órfãos (SÓ se o STEP 0b mostrou valores órfãos)

Se **não** houve órfãos, pule. Se houve, rode (registra 1 linha de auditoria por órfão colapsado):

```sql
INSERT INTO public.historico_candidatura
  (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
SELECT id, NULL, 'triagem', 'colapso de valor legado órfão (D-05)', NULL, true, now()
  FROM backup_m2.candidaturas_pre_funil
 WHERE etapa_atual IN ('bigfive','disc','raven','cultura','avaliacao_final');
```

---

## STEP 4 — Smoke §B (FUNIL-01: zero perda de dados)

```sql
SELECT etapa_atual, count(*) FROM public.candidaturas GROUP BY etapa_atual ORDER BY count(*) DESC;
```

✅ **A soma DEVE ser igual ao `discovery_total_rows` do STEP 0b.** Anote no §B do runbook.
Se não bater, PARE e me avise.

---

## STEP 5 — Decisão final + bias audit
→ abrir `supabase/migrations/20260607000003_decisao_final.sql` → colar + rodar
→ abrir `supabase/migrations/20260607000004_bias_audit_log.sql` → colar + rodar

---

## STEP 6 — Trigger de transição  → abrir `supabase/migrations/20260607000005_avancar_etapa_trigger.sql`

Cole e rode. Cria `avancar_etapa()` + bind do trigger em `candidaturas`.

---

## STEP 7 — Smokes §C + §D (FUNIL-02 regressão / FUNIL-03 auditoria)

Escolha **uma candidatura real que esteja em `triagem`** e copie o id:

```sql
SELECT id FROM public.candidaturas WHERE etapa_atual='triagem' LIMIT 1;
```

Troque `<id>` abaixo e rode na ordem:

```sql
-- (a) avançar → DEVE funcionar
UPDATE public.candidaturas SET etapa_atual='entrevista_online' WHERE id='<id>';

-- (b) regredir SEM justificativa → DEVE dar erro "Regressão de etapa exige justificativa preenchida"
UPDATE public.candidaturas SET etapa_atual='inscricao' WHERE id='<id>';

-- (c) regredir COM justificativa → DEVE funcionar
UPDATE public.candidaturas SET etapa_atual='inscricao', etapa_justificativa='motivo do retorno...'
 WHERE id='<id>';

-- (d) terminal de qualquer etapa → DEVE funcionar
UPDATE public.candidaturas SET etapa_atual='rejeitado', etapa_justificativa='decisão...' WHERE id='<id>';
```

§D — conferir a trilha de auditoria (contagens, sem PII):

```sql
SELECT etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em
  FROM public.historico_candidatura
 WHERE candidatura_id='<id>' ORDER BY criado_em DESC LIMIT 50;
```

✅ Cada transição (a/c/d) gerou 1 linha; `ator` preenchido (você é RH) e `auto_rejeitado=false`.
Anote §C/§D.

**Restaurar a candidatura de teste** (volta pra `triagem` — é regressão, então leva justificativa):

```sql
UPDATE public.candidaturas SET etapa_atual='triagem', etapa_justificativa='restauração pós-smoke (D-06)'
 WHERE id='<id>';
-- (opcional) limpar as linhas de teste do histórico desta candidatura:
-- DELETE FROM public.historico_candidatura WHERE candidatura_id='<id>';
```

---

## STEP 8 — RLS  → abrir `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql`

Cole e rode. Completa o controle de acesso do backbone.

---

## STEP 9 — Smokes §E + §F (FUNIL-04 RLS / LGPD-02 guardrail)

```sql
-- §E estrutural: RLS ligado nas 4 tabelas (todas TRUE)
SELECT tablename, rowsecurity FROM pg_tables
 WHERE schemaname='public'
   AND tablename IN ('candidaturas','historico_candidatura','decisao_final','bias_audit_log');

-- §E inventário de policies (sem resíduo 'admin' ou auth_user_id)
SELECT tablename, policyname, cmd FROM pg_policies
 WHERE schemaname='public'
   AND tablename IN ('candidaturas','historico_candidatura','decisao_final','bias_audit_log')
 ORDER BY tablename, cmd;

-- §F LGPD-02: nenhuma decisão sem ator humano → DEVE ser 0
SELECT count(*) AS auto_decisoes FROM public.decisao_final WHERE por_usuario IS NULL;
```

✅ rowsecurity = true nas 4 · inventário sem `admin`/`auth_user_id` · `auto_decisoes = 0`.
(O teste de "client INSERT em decisao_final rejeitado" é coberto pela policy `WITH CHECK (false)`.)
Anote §E/§F.

---

## DEPOIS dos applies — me avise

Quando os smokes estiverem verdes, me diz **"smokes ok"** e eu rodo aqui:

```
supabase migration repair --status applied 20260607000001 20260607000002 20260607000003 20260607000004 20260607000005 20260607000006
supabase db push --linked        # deve dizer "Remote database is up to date"
npm run db:types                 # regenera database.types.ts (enum 8 valores + etapa_justificativa)
npm run test:run                 # só o carryover LoadingProgress é aceitável
```

## Commits (seu terminal — o hook bloqueia o agente)

```bash
git add .planning/phases/06-pipeline-backbone-schema/06-SQL-SMOKE-RUNBOOK.md \
        .planning/phases/06-pipeline-backbone-schema/06-EXECUTE-ORDER.md
git commit -m "docs(06-01): SQL-smoke runbook + execute-order — discovery + 5 audit harness"

git add supabase/migrations/20260607000001_historico_candidatura.sql \
        supabase/migrations/20260607000002_etapa_processo_v2_cutover.sql src/types/database.types.ts
git commit -m "feat(06-02): historico_candidatura + etapa_processo v2 cutover (FUNIL-01/03)"

git add supabase/migrations/20260607000003_decisao_final.sql \
        supabase/migrations/20260607000004_bias_audit_log.sql
git commit -m "feat(06-03): decisao_final LGPD-02 guardrail + bias_audit_log schema"

git add supabase/migrations/20260607000005_avancar_etapa_trigger.sql src/types/database.types.ts
git commit -m "feat(06-04): avancar_etapa() trigger — regression block + audit (FUNIL-02/03)"

git add supabase/migrations/20260607000006_rls_policies_m2_backbone.sql src/types/database.types.ts
git commit -m "feat(06-05): M2 backbone RLS bundle — candidato isolation + RH UPDATE (FUNIL-04)"
```

> ⚠️ Mencione ao GSD que o `...02` recebeu um fix (backup.etapa_atual → text) antes do apply —
> o `database.types.ts` pode ser commitado uma vez só no último grupo se preferir (é o mesmo arquivo).

## Fechamento

Flipar no `06-SQL-SMOKE-RUNBOOK.md`: `nyquist_compliant: true`, `wave_0_complete: true`.
Depois responder **"applied"** pro GSD rodar a verificação e fechar a Phase 6.
