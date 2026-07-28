# Prompt Library — RUNBOOK

Procedimentos operacionais para deploy, canary, rollback, gold standard e troubleshooting.

**Audiência**: Tech Lead, DPO, RH lead. Use estes procedimentos em produção. Não improvise.

**Pré-requisitos**:
- Acesso `admin` role no Supabase Studio
- Acesso ao painel `/admin/prompt-versions` (frontend)
- Pelo menos 1 GitHub PR aprovado pré-merge

---

## 1. Deploy de novo prompt (PATCH/MINOR — não-breaking)

Use este procedimento para mudanças que NÃO quebram schema Zod e NÃO mudam critério avaliativo.

```
1. [DEV] Editar templates/<call_type>.md
   - Bumpar `semver` (2.0.5 → 2.0.6 PATCH ou 2.1.0 MINOR)
   - Atualizar `change_summary` (1 linha imperativo pt-BR)
   - Deixar `content_hash: tbd` (CI calcula)
   - NÃO mudar `schema_version_required`
2. [DEV] Adicionar entrada em `docs/conhecimento/prompts/CHANGELOG.md`
3. [DEV] Commit + push + PR
4. [TECH LEAD] Review PR — checar:
   - Diff do system_template + user_template
   - SemVer bump apropriado (PATCH se typo, MINOR se few-shot)
   - CHANGELOG.md atualizado
   - Counterfactual test ainda passa (`tests/bias/counterfactual.test.ts`)
5. [CI] Action `prompts-sync.yml` roda no merge:
   - Calcula content_hash SHA-256
   - INSERT prompt_versions row com `is_active=false, is_canary=false`
6. [TECH LEAD] Validar row criada:
   ```sql
   SELECT id, semver, content_hash, is_active, is_canary, deployed_at
     FROM prompt_versions
    WHERE call_type = '<call_type>'
    ORDER BY created_at DESC LIMIT 5;
   ```
7. [TECH LEAD] Promover a canary 10%:
   - Via UI: /admin/prompt-versions → row → "Promote to canary 10%"
   - Via SQL: `SELECT promote_to_canary('<call_type>', '<semver>', 10);`
8. [Aguardar 24-48h]
   - Monitorar /admin/ai-costs e /admin/ai-logs filtrando `prompt_version_id` = canary id
   - Métricas alvo: error rate <2%, latência p95 dentro RNF, custo dentro estimado
9. [TECH LEAD] Promover a active:
   - Via UI: row canary → "Promote to active"
   - Via SQL: `SELECT promote_canary_to_active('<call_type>', '<semver>');`
   - Atomically: old active → is_active=false, deprecated_at=NOW; canary → is_active=true, canary_pct=0
10. [TECH LEAD] Smoke test: rodar 1 chamada via /admin → verificar prompt_version_id em ai_call_logs == new active
```

**Tempo total**: ~2h dev + 24-48h canary + 5min promotion.

---

## 2. Deploy de breaking change (MAJOR — schema Zod muda OU critério avaliativo)

Pre-requisito ADICIONAL: gold standard validation pre-deploy passa (n=30, Pearson ≥ 0.70).

```
1. [DEV] Decidir: schema Zod muda?
   - SIM: bumpar `*_SCHEMA_VERSION` em 00-shared-zod-schemas.ts (também é MAJOR)
   - NÃO: apenas critério avaliativo muda — schema_version_required permanece
2. [DEV] Atualizar Edge Function consumer SE schema mudar:
   - Code SCHEMA_VERSION precisa bater com novo schema_version_required do prompt
   - Deploy do Edge Function ANTES do prompt promote-to-active (ordem importa)
3. [DEV] Editar template:
   - Bumpar semver MAJOR (X.0.0)
   - schema_version_required = nova versão (se aplicável)
   - change_summary descreve impacto avaliativo
4. [DEV] PR com 2 reviewers obrigatórios: Tech Lead + DPO
5. [DPO] Verificar:
   - RIPD (Avaliação de Impacto LGPD) atualizado se critério mudou substancialmente
   - Modelo Card atualizado para o call_type afetado
   - Política de retenção e finalidade revisadas
6. [TECH LEAD] Rodar gold standard pre-deploy validation (procedure §4):
   - 30 candidatos reais anonimizados
   - 2 raters humanos cego (RH lead + segundo rater)
   - Calcular Pearson, Spearman, kappa, Disparate Impact
   - Aceite: r ≥ 0.70, ρ ≥ 0.65, κ ≥ 0.60, DI ≥ 0.80
7. [SE PASSOU] Merge PR
   - CI sync cria row is_active=false
8. [TECH LEAD] Promove a canary 10% (não pular direto pra active)
9. [Aguardar 48h] Monitorar com EXTRA atenção:
   - Variância de scores vs versão anterior
   - Bias flags em raw_response
   - Reclamações de candidatos via canal LGPD
10. [TECH LEAD] Promove a active
11. [DPO] Atualiza RIPD com data do deploy + versão
```

**Tempo total**: ~1 semana (gold standard pre-deploy) + 48h canary.

---

## 3. Rollback emergencial (<60s)

Use quando bias audit detecta violação 4/5 OU error rate explode OU custo dispara.

```
1. [TECH LEAD] Identificar versão alvo (a deprecated mais recente):
   ```sql
   SELECT semver, deprecated_at FROM prompt_versions
    WHERE call_type = '<call_type>'
      AND deprecated_at IS NOT NULL
      AND deprecated_at > NOW - INTERVAL '1 year'
    ORDER BY deprecated_at DESC
    LIMIT 5;
   ```
2. [TECH LEAD] Executar rollback:
   - Via UI: /admin/prompt-versions → versão alvo → "Rollback (emergency)" + confirm dialog
   - Via SQL: `SELECT rollback_to_version('<call_type>', '<semver_target>');`
3. [VERIFICAR] Em <30s, próximas chamadas usam versão alvo:
   ```sql
   SELECT semver, is_active FROM prompt_versions
    WHERE call_type = '<call_type>' AND is_active = true;
   -- Deve retornar a versão alvo
   ```
4. [VERIFICAR] ai_call_logs nova entrada usa prompt_version_id correto:
   ```sql
   SELECT prompt_version_id, COUNT(*) FROM ai_call_logs
    WHERE created_at > NOW - INTERVAL '5 minutes'
      AND call_type = '<call_type>'
    GROUP BY prompt_version_id;
   ```
5. [TECH LEAD] Notificar DPO + RH lead:
   - Subject: "Rollback emergencial prompt <call_type> de <broken_semver> para <target_semver>"
   - Body: razão técnica + métrica violada + janela impactada (timestamp from-to) + número de candidaturas afetadas
6. [DPO] Decidir se candidatos afetados precisam de re-avaliação humana ou nova chamada com versão estável
7. [TECH LEAD] Investigar root cause (não em rollback path — em paralelo)
8. [TECH LEAD] Após fix, abrir novo PR com bump (nova versão, NÃO reusar broken_semver)
```

**Tempo total**: <60s. SLA: rollback decisão → primeira chamada na versão antiga em <60s.

**ATENÇÃO**: rollback NÃO desfaz `ai_call_logs` já gravados com versão problemática. Esses logs ficam para auditoria. Para candidatos afetados, ver passo 6.

---

## 4. Gold standard validation (pre-deploy + trimestral)

### 4.1 Pre-deploy (n=30, antes de promover MAJOR a active)

```
1. [TECH LEAD] Exportar 30 candidatos reais pseudonimizados:
   ```bash
   deno run -A scripts/export-gold-standard.ts \
     --call-type=<call_type> \
     --n=30 \
     --output=gold-standard/<YYYY-MM-DD>-pre-deploy-<call_type>.csv
   ```
   Output: CSV com colunas `case_id`, `input_pseudonimizado`, `score_AI`, `score_rater_1` (vazio), `score_rater_2` (vazio), `notes_rater_1` (vazio), `notes_rater_2` (vazio)
2. [TECH LEAD] Distribuir CSV para 2 raters (RH lead + segundo rater externo):
   - Cada rater recebe **APENAS** colunas `case_id` + `input_pseudonimizado` (sem score_AI — modo cego)
   - Rater preenche `score_rater_X` (1-5 ou 0-100) + `notes_rater_X`
3. [Aguardar 1-2 semanas] Raters preenchem e devolvem
4. [TECH LEAD] Consolidar CSVs:
   ```bash
   deno run -A scripts/calculate-pearson.ts \
     --raters-csv=gold-standard/<YYYY-MM-DD>-rater1.csv,gold-standard/<YYYY-MM-DD>-rater2.csv \
     --ai-csv=gold-standard/<YYYY-MM-DD>-pre-deploy-<call_type>.csv \
     --output=gold-standard/<YYYY-MM-DD>-report.pdf
   ```
   Calcula: Pearson r (AI vs media humanos), Spearman ρ, Cohen kappa (inter-rater), Disparate Impact ratio (4/5 rule)
5. [DPO] Revisar PDF report:
   - Pearson r ≥ 0.70? Spearman ρ ≥ 0.65? Cohen κ ≥ 0.60? DI ≥ 0.80?
   - Se SIM: assinar aceite, prompt pode ir para canary→active
   - Se NÃO: PR review revisa prompt, re-roda validation
6. [TECH LEAD] Arquivar CSVs em `gold-standard/<YYYY-MM-DD>-pre-deploy-<call_type>/` (durabilidade 5 anos para auditoria)
```

### 4.2 Trimestral (n=50, monitoramento de drift)

```
1. [Cron mensal — 1º dia útil do mês] Job dispara script:
   ```bash
   deno run -A scripts/export-gold-standard.ts \
     --call-type=all \
     --n=50 \
     --random-from-last=90d \
     --output=gold-standard/<YYYY-MM-DD>-trimestral.csv
   ```
2. [TECH LEAD] Distribuir + raters preenchem (1-2 semanas)
3. [TECH LEAD] Calculate Pearson:
   ```bash
   deno run -A scripts/calculate-pearson.ts \
     --raters-csv=... \
     --ai-csv=... \
     --output=gold-standard/<YYYY-MM-DD>-trimestral-report.pdf
   ```
4. [DPO] Revisar drift:
   - Pearson r caiu de 0.80 (último trimestre) para 0.60 (atual)? Investigar:
     - Modelo Anthropic update? Ver /admin/ai-logs.model_snapshot
     - Distribuição de candidatos mudou? Comparar features extraídas
     - Prompt drifted? Diff vs versão de 3 meses atrás
   - DI caiu para <0.80 em alguma dimensão protegida? PARAR — investigar imediatamente
5. [DPO] Email DPO + Tech Lead com decisão:
   - Manter (drift dentro do esperado)
   - Investigar (Pearson <0.65)
   - Re-treinar prompt (Pearson <0.60 ou DI <0.80)
6. [TECH LEAD] Arquivar
```

### 4.3 Por novo MAJOR (re-rodar §4.1)

Antes de promover qualquer prompt v1.0.0 ou bump MAJOR a `is_active=true`. Mesmo procedimento que §4.1 com 30 NOVOS casos (não reusar pre-deploy anterior).

---

## 5. Canary deploy — quando promover ou abortar

**Sinais de "promover a active"** (após 24-48h em canary 10%):
- ✅ Error rate <2% (ai_call_logs.success=false / total < 0.02)
- ✅ Latência p95 dentro RNF (RNF-PL-02 a 04)
- ✅ Custo dentro do estimated_cost_per_call_usd (±20%)
- ✅ Bias flags consistentes vs versão anterior (sem aumento súbito de `has_demographic_proxy=true`)
- ✅ Cache hit rate ≥30%
- ✅ Inter-rater agreement em 5-10 amostras quick-check >0.55

**Sinais de "abortar canary e rollback"**:
- ❌ Error rate >5%
- ❌ Latência p95 >2× RNF
- ❌ Custo >2× estimado
- ❌ Bias flag spike (>20% logs com flag=true vs baseline 5%)
- ❌ Reclamação Art. 20 dentro da janela canary (DPO recebe email candidato → investigar)

**Aborto**:
```sql
-- Desativa canary mantendo old version active
UPDATE prompt_versions SET is_canary = false, canary_pct = 0
 WHERE call_type = '<call_type>' AND is_canary = true;
```

---

## 6. Cost anomaly investigation

**Trigger**: email do `cost-alerter` Edge Function: "Vaga X custou R$ 250 em IA neste mês".

```
1. [DPO] Abrir /admin/ai-costs filtrando vaga_id
2. [DPO] Verificar se anomaly é genuína:
   - Vaga >500 candidaturas? Provavelmente spam (ver alert separado)
   - Vaga normal mas chamadas duplicadas? Bug em Edge Function (idempotency_key faltando)
   - Cache hit rate baixo? Vaga cold com poucos candidatos por minuto
3. [SE GENUÍNA + CONTROLÁVEL]:
   - Ajustar canary_pct para 0 se versão canary é mais cara
   - Pause new candidaturas para essa vaga (config-vaga UI)
   - Investigar prompt — talvez `max_tokens` muito alto
4. [SE GENUÍNA + INESPERADA]:
   - Tech Lead investiga ai_client.ts retries (loop infinito? circuit breaker quebrado?)
   - Verificar circuit breaker: se está OPEN com falha permanente Anthropic, todas calls vão pro GPT (que pode ser mais caro em alguns scenarios)
5. [DPO] Documentar incident em data_deletion_log com tipo 'cost_anomaly_investigation'
```

---

## 7. PII leak investigation

**Trigger**: quarterly audit manual de 100 logs random detecta CPF/email não-mascarado em `ai_call_logs.user_prompt_template`.

**ALERTA**: incident report obrigatório para DPO em <24h.

```
1. [TECH LEAD] Identificar regex que falhou:
   - Olhar 5 exemplos do leak
   - PII PT-BR não-padrão? (ex: CPF formatado XXXXX-XX-XX em vez de XXX.XXX.XXX-XX)
   - Endereço abreviado? (ex: "R. das Flores" em vez de "Rua das Flores")
2. [TECH LEAD] Atualizar pii-masker.ts com regex novo
3. [TECH LEAD] Bumpar PATCH de pii-masker (não é prompt, mas tem changelog próprio)
4. [TECH LEAD] Re-mask logs afetados:
   ```sql
   UPDATE ai_call_logs
      SET user_prompt_template = mask_pii(user_prompt_template)
    WHERE id IN (<lista_dos_leaks>)
       OR (created_at > <data_inicial> AND user_prompt_template ~ '<regex_que_falhou>');
   ```
5. [DPO] Avaliar se incident precisa notificação ANPD:
   - Se PII vazou apenas para Anthropic (provider) que tem DPA = baixo risco
   - Se PII vazou para terceiros = notificação imediata
6. [DPO] Documentar em data_deletion_log + incident_report (tabela separada se necessário)
```

---

## 8. Schema mismatch ao deploy

**Trigger**: Edge Function startup log: `[Schema mismatch] DB requires 1.1.0, code has 1.0.0`.

**Causa**: prompt v3.0.0 (com schema_version_required=1.1.0) foi promovido a `is_active` ANTES de Edge Function consumer ser deployada com novo schema.

```
1. [TECH LEAD] Verificar:
   ```sql
   SELECT semver, schema_version_required FROM prompt_versions
    WHERE call_type = '<call_type>' AND is_active = true;
   ```
2. [TECH LEAD] Verificar Edge Function deploy:
   ```bash
   supabase functions list --linked
   # Verificar versão deployada do call_type Edge Function
   ```
3. [Se Edge Function antiga]: rollback prompt para versão compatível:
   ```sql
   SELECT rollback_to_version('<call_type>', '<semver_compativel_com_schema_atual>');
   ```
4. [Em paralelo]: deploy Edge Function nova com schema atualizado
5. [Após Edge Function deploy]: re-promover prompt v3.0.0:
   ```sql
   SELECT promote_canary_to_active('<call_type>', '3.0.0');
   ```
6. [TECH LEAD] Documentar lesson learned: deploy Edge Function ANTES de prompt nas próximas vezes
```

---

## 9. Quick reference — comandos SQL essenciais

```sql
-- Listar versões ativas
SELECT call_type, semver, is_canary, canary_pct, deployed_at
  FROM prompt_versions
 WHERE is_active = true OR is_canary = true
 ORDER BY call_type, is_canary DESC;

-- Listar versões deprecated <1y (candidatos a rollback)
SELECT call_type, semver, deprecated_at
  FROM prompt_versions
 WHERE deprecated_at IS NOT NULL
   AND deprecated_at > NOW - INTERVAL '1 year'
 ORDER BY call_type, deprecated_at DESC;

-- Estatísticas últimas 24h por call_type
SELECT call_type, COUNT(*) AS calls,
       SUM(success::int) AS success,
       AVG(latency_ms)::int AS lat_avg_ms,
       SUM(cost_usd)::numeric(10,4) AS cost_usd
  FROM ai_call_logs
 WHERE created_at > NOW - INTERVAL '24 hours'
 GROUP BY call_type;

-- Cache hit rate última semana
SELECT call_type, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE (raw_response->'usage'->>'cache_read_input_tokens')::int > 0) AS hits,
       ROUND(100.0 * COUNT(*) FILTER (WHERE (raw_response->'usage'->>'cache_read_input_tokens')::int > 0) / COUNT(*), 1) AS hit_pct
  FROM ai_call_logs
 WHERE created_at > NOW - INTERVAL '7 days' AND success = true
 GROUP BY call_type;

-- Logs de um candidato específico (para Art. 20)
SELECT call_type, prompt_version_id, parsed_score, parsed_reasoning, created_at
  FROM ai_call_logs
 WHERE candidato_id = '<UUID>' AND vaga_id = '<UUID>'
 ORDER BY created_at;
```

---

## 10. Contatos

- **Tech Lead** (owner runbook): tech-lead@beauty-smile.com.br
- **DPO** Beauty Smile: dpo@beauty-smile.com.br *(pendente confirmar — ver Q-10.8 do PRD)*
- **RH lead** (gold standard rater): [pendente nominalizar]
- **Canal LGPD candidatos**: [pendente provisionar]
