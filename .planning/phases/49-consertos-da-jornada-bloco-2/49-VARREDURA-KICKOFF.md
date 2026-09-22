# Phase 49 — Varredura pela FORMA, por classe de defeito (D-50) — ponto de partida

**Medida em:** 2026-09-22 (sessão de pesquisa, só leitura) · **PROD:** `isljnozzlvckrgjjbjwp` (PostgreSQL 17.6)
**Alimenta:** todos os planos da fase. **Não é a varredura final:** cada plano re-roda o padrão da sua
classe **antes** de consertar e registra o delta no SUMMARY (D-50).
**Formato:** o dos `48-VARREDURA-*.md` — padrão re-rodável, ocorrências, classificação
*defeito* × *escopo deliberado* com razão de uma linha, cobrindo `src/`, `supabase/functions/` e as
**definições vivas** (`pg_get_functiondef` / `pg_get_triggerdef` / catálogo).

Todas as consultas SQL rodam por:

```bash
node p46apply.cjs sql "SET TRANSACTION READ ONLY; <query>"
```

---

## C1 · Ação de RH oferecida/aceita sobre candidatura encerrada (JORN-25, 32, 33, 34)

**Predicado canônico** (`public.candidatura_encerrada(etapa, status)`, vivo):
`COALESCE(p_etapa IN ('aprovado','rejeitado'), false) OR COALESCE(p_status IN ('rejeitado','finalizado'), false)`.
Espelho TS `src/lib/candidatura/candidaturaEncerrada.ts`: `ETAPAS_TERMINAIS = {'aprovado','rejeitado'}`, `STATUS_TERMINAIS = {'rejeitado','finalizado'}`.

### Padrões

```bash
# (P1) escritores de etapa/status no cliente
grep -rn "updateCandidaturaEtapa(\|avancarEtapa(\|onAvancar(\|updateCandidaturaStatus(\|updateStatus(" src --include='*.ts' --include='*.tsx' | grep -v test
# (P2) quem usa o predicado no cliente
grep -rn "candidaturaEncerrada(" src --include='*.ts' --include='*.tsx' | grep -v test
# (P3) literais de teto do comparativo (o D-29 muda o número)
grep -rn "COMPARE_MAX\|2 a 10\|2-10\|<= 10\|> 10\|Máximo de 10\|\.max(10)" src supabase/functions --include='*.ts' --include='*.tsx' | grep -v test
```

```sql
-- (P4) escritores VIVOS de etapa_atual
select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosrc ~* 'set[^;]*etapa_atual\s*=';
-- (P5) RPCs SECURITY DEFINER de escrita por candidatura: usam o predicado?
select p.oid::regprocedure::text, p.prosrc ~ 'candidatura_encerrada' usa_pred
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef and pg_get_function_arguments(p.oid) ~ 'candidatura'
   and p.prosrc ~* '(insert into|update )\s*public\.';
```

### Ocorrências (2026-09-22)

| # | Onde | O quê | Classe |
|---|---|---|---|
| 1 | `avancar_etapa()` (vivo; `20260712110001`) L11-47 | nenhuma trava de encerrada; `inscricao/rejeitado → avaliacao_assincrona` é avanço aceito | **defeito** (JORN-25/D-35) |
| 2 | `trg_notif_transicao()` L14-15 | `etapa_para='avaliacao_assincrona'` ⇒ evento `avanco`, sem olhar o estado | escopo deliberado (o CASE é da transição); a defesa fica no trigger 1 + EF 3 |
| 3 | `notificar-candidato/index.ts:288-298` | guarda de knockout só para `evento === "confirmacao"` | **defeito** (D-35) |
| 4 | `ComparativoCandidatosPage.tsx:118-120` | `handleAvancar` grava `PROXIMA_ETAPA_APOS_TRIAGEM` (`avaliacao_assincrona`) sem ler estado | **defeito** (D-36) |
| 5 | `TriagemTable.tsx:241-275` | seleção do comparativo não olha encerrada | **defeito** (D-34) |
| 6 | `comparativo-candidatos/index.ts:198-220` | recusa knockout sem análise com a mensagem «vagas diferentes» | **defeito** (D-34, mensagem falsa) |
| 7 | `comparativo-candidatos/index.ts:182-220` | posse checada em `body.vaga_id`; as análises só precisam ser da MESMA vaga entre si | **defeito** (JORN-32, IDOR) |
| 8 | `decisaoService.ts:210-237` `listFinalistas` | população = «tem linha em `decisao_final`» (7 linhas, 4 encerradas) | **defeito** (D-36b) |
| 9 | `KanbanBoard.tsx:97-116` `getTerminalBadge` | ignora `status='finalizado'`; o `!terminalBadge` libera arraste (L192) **e** o menu com «Avançar»/«Retroceder» (L298-316) | **defeito** (JORN-33) — 3 linhas em PROD: `triagem/finalizado`, `entrevista_online/finalizado`, `decisao_final/finalizado` |
| 10 | `UpdateStatusModal.tsx:59-65` `VALID_TRANSITIONS.rejeitado = ['em_analise']` → `updateCandidaturaStatus` (status só; etapa igual ⇒ `avancar_etapa` sai cedo na L11) | reabre encerrada sem histórico | **defeito** (JORN-34) |
| 11 | `UpdateStatusModal.tsx:62` `aprovado_proxima → finalizado` | ENCERRA por status, sem histórico | **defeito provável, fora do texto do JORN-34** — levar ao operador (é a mesma forma no sentido inverso; é a origem plausível das 3 linhas do #9) |
| 12 | `HubCandidatoRH.tsx:139,246` | «Avançar» gateado por `!encerrada` | escopo deliberado — já usa o predicado (48-02) |
| 13 | `rejeitar_candidatura`, `retirar_candidatura` | usam o predicado | escopo deliberado |
| 14 | `liberar_cognitivo` L36 | `v_status IN ('rejeitado','finalizado')` — só status | equivalente em dado (toda etapa terminal tem status terminal em PROD); trocar pelo predicado quando alguém tocar a função |
| 15 | `registrar_decisao` | sem predicado; move de encerrada para terminal (ex.: `triagem/finalizado → aprovado`) | escopo deliberado **se** a exceção do D-35 for «decisão» (é o que o D-35 diz) — sancionar por GUC, não por destino |
| 16 | `reprocessar_analise` | sem guarda de encerrada | escopo deliberado desde a 48-04: a EF `analise-candidato-individual` v29 pula knockout (`skipped:"knockout"`) |
| 17 | Teto do comparativo: `comparativo-candidatos/index.ts:169,172`; `ComparativeRankingSchema.ranked_candidates.max(10)` (`analise-schemas.ts:156`); `TriagemTable.tsx:214 COMPARE_MAX`, `:267`, `:425` («Máximo de 10…»); `ComparativoCandidatosPage.tsx:102`; `DecisaoFinalPage.tsx:123,201`; `__tests__/index.test.ts:212` | o número vive em 8 lugares | **defeito de forma** para o D-29: uma constante só, EF e cliente |

---

## C2 · Carimbo herdado (JORN-17)

### Padrões

```sql
-- colunas que um trigger consome e ninguém limpa
select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosrc ~ 'etapa_justificativa';
-- GUCs de sanção (set_config is_local=true = até o FIM da transação, não do statement)
select p.oid::regprocedure::text, (regexp_matches(p.prosrc, 'set_config\(''([a-z_.]+)''', 'g'))[1]
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~ 'set_config\(''app\.';
```

| # | Onde | O quê | Classe |
|---|---|---|---|
| 1 | `avancar_etapa()` L18 (portão) e L43 (cópia) | lê `NEW.etapa_justificativa` e nunca a limpa | **defeito** (JORN-17) |
| 2 | 9 linhas em PROD com `etapa_justificativa` não nula; as 9 batem `md5` com o `criterio_texto` mais recente | resíduo | **defeito** (D-46, checkpoint) |
| 3 | `app.rejeicao_sancionada` em `registrar_decisao` e `submit_candidatura_atomic` (`set_config(..., true)`) | vale até o fim da TRANSAÇÃO. Em produção cada RPC é uma transação; num smoke rodado por `p46apply run` (arquivo inteiro = 1 transação) a sanção vaza para todo UPDATE seguinte | escopo deliberado em PROD; **pitfall** para qualquer GUC nova (D-35): resetar logo depois do UPDATE |
| 4 | `triagemService.ts:446-458` manda `etapa_justificativa` sempre | já protege a UI | escopo deliberado |

---

## C3 · Auditoria que dispara sem mudança (JORN-3b)

```sql
-- triggers AFTER UPDATE que escrevem/disparam, com WHEN e uso de OLD
select t.tgname, t.tgrelid::regclass, p.proname, t.tgqual is not null has_when, p.prosrc ~ 'OLD\.' uses_old
  from pg_trigger t join pg_proc p on p.oid=t.tgfoid
 where not t.tgisinternal and (t.tgtype & 16)=16 and (t.tgtype & 2)=0 and p.prosrc ~* 'insert into|http_post';
```

| # | Trigger | has_when | uses_old | Classe |
|---|---|---|---|---|
| 1 | `trg_decisao_final_snapshot` → `snapshot_decisao_final()` | não | sim (copia OLD, sem comparar) | **defeito** (D-44) — 5 de 11 snapshots sem mudança + 1 só de carimbo de leitura (`2ce20fbf`, 00:22:13) |
| 2 | `trg_notif_revisao_solicitada` / `_respondida` (`UPDATE OF col`) | não | sim (compara OLD/NEW no corpo) | escopo deliberado |
| 3 | `trg_notif_cognitivo_liberado` | não | sim | escopo deliberado |
| 4 | `trg_candidatura_encerrada_a_pedido` | sim | sim | escopo deliberado |
| 5 | `trg_notif_convite_reagendamento` | sim | — | escopo deliberado |
| 6 | `trg_ai_cost_daily_anomaly` → `notify_cost_anomaly` | não | não | escopo deliberado (1 upsert/dia/linha pelo cron de agregação); anotar |
| 7 | `stamp_explicacao_acessada` L21-24 | UPDATE sem `WHERE … IS NULL` (o `COALESCE` mantém o valor mas o UPDATE acontece) | **defeito** (gatilho do #1) |

---

## C4 · Promessa sem código (JORN-36, e o recibo inteiro)

```bash
# origens do recibo × tabelas que o motor toca
grep -n "q('" docs/compliance/sql/gen-recibo-exclusao.cjs
```
```sql
select pg_get_functiondef('public.anonimizar_candidato(uuid,boolean)'::regprocedure);   -- 731 linhas
select pg_get_functiondef('public.plano_exclusao_titular'::regproc);
```

| # | Item do recibo | O que afirma | O que o motor faz (vivo) | Classe |
|---|---|---|---|---|
| 1 | `respostas_e_producoes` (`gen-recibo-exclusao.cjs:293-317`) | respostas, textos, transcrições e devolutiva «foram apagados»; 14 origens | toca **nenhuma** das 14 tabelas | **defeito** (JORN-36) |
| 2 | idem, `devolutivas_candidato.conteudo_jsonb` | apagada | a linha é apagada **por cascata**: FK `devolutivas_candidato_candidato_id_fkey → auth.users ON DELETE CASCADE` no passo 3 (`auth_delete_user`) | **verdade hoje** (por FK, não pelo motor) |
| 3 | `dados_enviados_a_analise_automatica` (`:344-356`) | «o conteúdo enviado para as análises automáticas … foram apagados» | apaga `raw_response`/`parsed_reasoning` das linhas **com** `candidato_id`; **não** toca `user_prompt_template` (o conteúdo enviado), que o `recibo-exclusao.json:500` mapeia como `conteudo_do_produto` | **defeito** (mesma classe do #1, não listado no D-48) |
| 4 | idem, linhas `comparative_ranking` | idem | `candidato_id` é NULL por desenho (`comparativo-candidatos/index.ts:263`) → o `WHERE l.candidato_id = p_candidato_id` nunca as alcança; o input carrega `resumo_cv` e o `candidatura_id` de até 10 titulares | **defeito** (não listado no D-48) |
| 5 | citações literais fora das colunas listadas | — | `redacoes_candidato.analise_ia.dimension_scores[].cited_evidence` e `scores_candidato.metadata.dimension_scores[].cited_evidence` (SJT) guardam trechos literais do que o titular escreveu; o recibo as põe em `avaliacoes_e_analises` («ficam guardadas») | **defeito** (o recibo diz que o texto foi apagado e o trecho fica) |
| 6 | `tabelas_sem_pii_titular` (`recibo-exclusao.json:614+`) | `analise_candidato_vaga` e `entrevista_guias` «sem PII do titular» | medido: 13/24 análises e 2/5 guias contêm o primeiro nome do titular | **defeito de inventário** (pré-existente; levar ao operador) |
| 7 | `anotacoes_da_equipe` inclui `decisao_final.revisao_resultado` («fica sem ligação») | — | o texto do revisor fica **literal** (a `justificativa` vira sentinela, esta não) | **defeito** (Portão item 3) |

---

## C5 · Resultado sem modelo real (JORN-28, D-28)

```bash
grep -rn 'model_version\|modelo_ia\|provider:' supabase/functions --include='*.ts' | grep -v test | grep -v _shared/ai-client
```

| # | Tabela | Hoje | Classe |
|---|---|---|---|
| 1 | `analise_candidato_vaga` | sem coluna de modelo | **defeito** (D-28) |
| 2 | `comparativo_solicitado` | sem coluna; o EF só loga `result.provider` no console (`index.ts:297-302`) | **defeito** (D-28) |
| 3 | `entrevista_guias` | só `prompt_version` | **defeito** (D-28) |
| 4 | `entrevista_analises` | só `prompt_version` | **defeito** (D-28) |
| 5 | `redacoes_candidato.model_version` | grava `resolved.model_id` (**configurado**) em `avaliar-redacao-cultural/index.ts:304,364` | **defeito** (D-28) |
| 6 | `scores_candidato` tipo `sjt` (EF `avaliar-redacao`) | nenhuma proveniência | **defeito, fora da lista do D-28** — levar ao operador (a `metadata` jsonb comporta sem coluna nova) |
| 7 | `devolutivas_candidato.modelo_ia` | literal `"claude-sonnet-4-6"` com IA ligada; hoje IA desligada grava `null` (verdade) | escopo deliberado enquanto desligada (deferred 48-19) |
| 8 | `ResolvedPrompt.fallback_model_id` | todas as EFs passam `"gpt-4o-mini"`; `runOpenAIFallback` ignora e usa `OPENAI_FALLBACK_MODEL` (`ai-client.ts:61,743`) | **defeito de contrato** (P1 fora; só registrar) |

---

## C6 · Código genérico escondendo causa (JORN-28, JORN-39, JORN-12)

```bash
# escrita da EF sem destruturar o erro
grep -rnE "^\s*await supabaseAdmin\.from\([^)]*\)\.(insert|upsert|update)\(" supabase/functions --include='*.ts' | grep -v __tests__ | grep -v '\.test\.'
```

| # | Onde | Classe |
|---|---|---|
| 1 | `ai-client.ts:734-736` — todo primário falho vira `anthropic_retries_exhausted` (timeout ×8, truncamento ×4, Zod `too_big` ×5 nos 17 fallbacks) | **defeito** (JORN-28) |
| 2 | `audit-logger.ts:179-185` — erro do INSERT só vira `console.error` | **defeito** (JORN-39) |
| 3 | `ai-client.ts:545,583` `provider: "none"` contra `llm_provider = {anthropic,openai,google}` → 22P02 engolido por #2 | **defeito** (JORN-39); 0 linhas `none` em PROD = nenhum teto de custo ou injeção jamais registrado |
| 4 | `comparativo-candidatos/index.ts:288` INSERT sem erro | **defeito** (a auditoria RF-09 pode sumir) |
| 5 | `avaliar-transcricao-entrevista/index.ts:266,299,309` INSERT/UPSERT sem erro → `{ok:true}` | **defeito** (JORN-12, obrigatório) |
| 6 | `analise-candidato-individual/index.ts:301,602`; `avaliar-redacao-cultural/index.ts:291,346`; `avaliar-redacao/index.ts:281,297,322` | mesma forma; **defeito** — cada dono de EF decide se entra no plano (as de `analise-candidato-individual` e `avaliar-redacao*` são tocadas pela fase) |
| 7 | `comparativo-candidatos` `MIXED_VAGA` para «análise ainda não existe» | **defeito** (D-34, mensagem falsa) |
| 8 | `CallAiResult.cache_hit` = replay **ou** prompt-cache (`cachedTokens > 0`, `ai-client.ts:685`) | **defeito de contrato** — o D-40 não pode usar esta flag |

---

## C7 · Prompt que cita definição não enviada / rótulo por posição (JORN-07, JORN-35, C{n})

```bash
grep -rn "vagaRubricBlock:" supabase/functions --include='*.ts' | grep -v test
grep -rn "DIM_LABEL\|DIMENSOES = \[\|replace(/\\\\D/g" src --include='*.tsx' --include='*.ts' | grep -v test
```
```sql
select call_type, position('{{BARS_RUBRIC_DIMENSIONS}}' in coalesce(user_template,''))>0 from prompt_versions;
```

| # | Onde | Classe |
|---|---|---|
| 1 | `avaliar-redacao-cultural/index.ts:244-254` — bloco = só a pergunta; prompt diz «Use as âncoras BARS fornecidas no input»; o `user_template` (único com `{{BARS_RUBRIC_DIMENSIONS}}`) nunca é enviado (`ResolvedPrompt` não tem `user_template`, `ai-client.ts:119-153`; parse em `:629-638`) | **defeito** (JORN-07) |
| 2 | `avaliar-redacao/index.ts:256` `vagaRubricBlock: \`Vaga: ${vaga_id}\``; pesos por nome devolvido `:131` `rubricWeights?.[d.dimension] ?? 1` | **defeito** (JORN-35) — a única SJT avaliada devolveu 5 nomes inventados, 0 casam `perguntas.rubric` |
| 3 | `comparativo-candidatos/index.ts:260` `Vaga: ${vaga_id}` | escopo deliberado (o comparativo não tem rubrica; o bloco é contexto) — mas é UUID cru no prompt: anotar |
| 4 | `gerar-devolutiva-bigfive/index.ts:791` `Dimensão ${dim_label}` | escopo deliberado (IA desligada) |
| 5 | `avaliar-transcricao-entrevista` (`_local/bars-rubric.ts`) | escopo deliberado — o precedente certo; ⚠ lê **todos** os guias da candidatura (`index.ts:198-203`), não o do tipo: com D-41 passa a ser defeito |
| 6 | `RedacaoReviewPanel.tsx:47-52`, `RedacaoOverrideForm.tsx:45-50` — rótulos «4 valores» por posição | **defeito** (D-25) |
| 7 | `ComparativoCandidatosPage.tsx:66-80`, `DecisaoFinalPage.tsx:66-78` — `C{n}` → `selection[n-1]` | **defeito** (Discretion obrigatória do 25) |
| 8 | `perguntaBlock` `Pergunta (${codigo})` com `codigo ∈ {C1..C3, D1..D3, F1, PADRAO_BS, R1}` | **defeito** (colisão D1–D3 com as dimensões D1–D4 no mesmo bloco) |

---

## C8 · Fonte morta vira 0 (JORN-13, JORN-40)

```bash
grep -rnE "return 0\b|\?\? 0\b|\|\| 0\b" src/features/vagas/types/vagasTypes.ts src/components src/features/triagem src/features/hub-candidato src/features/decisao --include='*.ts' --include='*.tsx' | grep -v test
```
```sql
select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosrc ~* 'coalesce\s*\(\s*[a-z_.]*(score|percentil|nota)[a-z_]*\s*,\s*0\s*\)';
```

| # | Onde | Classe |
|---|---|---|
| 1 | `vagasTypes.ts:696` `calculateBigFiveAverage` → `0` (e `scores_bigfive` tem 0 linhas) | **defeito** (D-31) |
| 2 | `vagasTypes.ts:722-724` `getCultureScore` → `0` (`analise_ia_cultura` 0 de 38) | **defeito** (D-32) |
| 3 | `CandidatosRHPage.tsx:352-355` lê `scores_bigfive`/`scores_disc`/`analise_ia_cultura` | **defeito** (JORN-13) |
| 4 | `ScoreCard.tsx:84-138` — `getScoreColor(bigFive)` colore Big Five | **defeito** (UX-07/D-31) |
| 5 | `LiberacaoCognitivoBlock.tsx:94-109` — «Percentil N» **e** «Acertos X de 60» | **defeito** (JORN-40); o «Acertos» é a mesma forma (número cru) — levar ao operador junto |
| 6 | `revisaoRedacaoService.ts:107-108`, `RedacaoSidebar.tsx:61` — `classificacao_cor ?? 'verde'` na ordenação | forma inversa (ausência vira a MELHOR cor na fila de revisão); **defeito menor**, fora dos IDs — registrar |
| 7 | `calcular_score_geral(uuid)` — `COALESCE(score_x, 0) * peso` | código morto (nenhum chamador vivo em `src/`, EFs ou funções) — escopo: registrar |
| 8 | `CandidatosRHPage.tsx:900` `funilEtapas[...] \|\| 0` | escopo deliberado (contagem: ausência = 0 é verdade) |

---

## C9 · «Não coube» × «demorou»: `max_tokens` × saída real (D-50 obrigatória do JORN-28)

```sql
select pv.call_type, pv.max_tokens, count(l.*) filter (where l.provider='anthropic') n_sonnet,
       max(l.output_token_count) filter (where l.provider='anthropic') max_out,
       max(l.latency_ms) filter (where l.provider='anthropic') max_lat,
       round(min(l.output_token_count*1000.0/nullif(l.latency_ms,0)) filter (where l.provider='anthropic' and l.output_token_count>1000),1) pior_tps
  from prompt_versions pv left join ai_call_logs l on l.call_type=pv.call_type and l.model_id like 'claude%'
 where pv.is_active group by 1,2 order by 1;
```

Teto de saída imposto pelo **tempo** (110 s × 45 tok/s, pior throughput medido em saída longa) ≈ **4 950 tokens**.

| call_type | `max_tokens` | chamadas Sonnet | maior saída | % do teto | maior latência | `max_tokens` a 45 tok/s | Classe |
|---|---|---|---|---|---|---|---|
| `cv_job_match` | 4096 | 25 | 3256 | 79 % | 53,7 s | 91 s | risco moderado de truncamento (21 % de folga) |
| `comparative_ranking` | 3000 | 0 (1 truncada em 20/09) | > 3000 | — | 70 s (total c/ fallback) | 67 s | **defeito** (D-29) |
| `interview_guide` | 8000 | 1 | 4436 | 55 % | **98,4 s = 89 % do timeout** | 178 s | **risco alto de «demorou»**: acima de ~4 950 tok o timeout vem antes do `max_tokens` |
| `transcript_analysis` | 6000 | 3 | 3098 | 52 % | 60,4 s | 133 s | mesmo teto por tempo; hoje com folga |
| `culture_fit_essay` | 2500 | 2 | 1253 | 50 % | 26,7 s | 56 s | folga; D-24 pode alongar a saída — medir na prova |
| `work_sample_sjt` | 3000 | **0 (nunca logada)** | — | — | — | 67 s | **não medido**: a única SJT avaliada é de 2026-06-26, quando o log quebrava |
| `bigfive_devolutiva` | 1200 | 5 | 316 | 26 % | 9,8 s | 27 s | folga (IA desligada) |

---

## Portões (CLAUDE.md §«Portões») — contagem e o que esta fase toca

```bash
grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql | wc -l   # 282
grep -rnE 'text\[\] *:= *ARRAY\[' supabase/tests/*.sql | wc -l                                                                                # 36 (ponto cego do padrão)
grep -rnE '(<>|!=|IS DISTINCT FROM) *\(CASE' supabase/tests/*.sql | wc -l                                                                     # 3  (ponto cego do padrão)
```

Smokes que asserem comportamento que esta fase muda (verificados um a um):

| Smoke / teste | Linha(s) | Por que muda | Quem conserta |
|---|---|---|---|
| `p48_rejeicao_triagem_smoke.sql` | 239 (vira vácuo), 245 (reprova) | JORN-17 limpa `etapa_justificativa`; ler de `historico_candidatura.criterio_texto` | plano da trilha |
| `p48_reabertura_smoke.sql` | **224-227** (fixture: UPDATE cru `rejeitado/rejeitado → decisao_final/em_analise`) | a trava do D-35 recusa a fixture — **não estava na lista do D-56** | plano da trilha (fixture com a GUC sancionada) |
| `p48_reabertura_smoke.sql` | (a)(g)(h) | dependem de snapshot no ciclo (D-44 tem de preservar) | plano do snapshot |
| `p48_prova_prod.sql` | 89-96, 201-209 | idem | plano do snapshot (só re-rodar) |
| `oper31_rejeitar_candidatura_smokes.sql` | 162-183 (c) | mesma função; a regressão de candidatura não encerrada continua bloqueada | plano da trilha (re-rodar em envelope) |
| `p45_motor_exclusao_smoke.sql` | fixture de `ai_call_logs` 952-958; asserções do passo | D-48 amplia o motor; smoke ampliado por coluna | plano do motor |
| 8 smokes com o idioma «INSERT `status='rejeitado'` + UPDATE `status='em_analise'`» (`p42_revisao_art20:508`, `p45_motor:880,2284`, `p48_candidatura_encerrada:264`, `p48_dedupe:187,320`, `p48_cognitivo_notifica:137`, `p48_reabertura:188,482`, `p48_rejeicao_triagem:161`, `p48_prazo_reabertura:183`) | — | uma guarda de banco para o JORN-34 que recuse «sair de `rejeitado`» quebra todas | ver RESEARCH §JORN-34 |
| `supabase/functions/_shared/__tests__/ai-client.test.ts` | 289-298, 306-338, 437-453, 460-479, 482-510, 646 | asserem `error_code`/`success` do fallback e o replay de sucesso de fallback | plano do ai-client |
| `comparativo-candidatos/__tests__/index.test.ts` | 191-259 (MIXED_VAGA, 2-10) | IDOR, mensagem verdadeira, teto D-29 | plano do comparativo |
| `RedacaoOverrideForm.test.tsx` | 35-38 | trava os rótulos «4 valores» | plano da redação |
| `ScoreCard.test.tsx`, `ComparativoScreen.test.tsx:121`, `TriagemTable.test.tsx` (~188) | — | invariante da Phase 45 (retirada segue visível/selecionável) + selo de encerrada | planos de front |
| `KanbanBoard.test.tsx`, `UpdateStatusModal.test.tsx`, `candidaturasService.test.ts` | — | JORN-33, 34, 38 | planos de front |
| `structured-output-compat.test.ts` | registro por forma | todo schema novo passado ao `callAi` | quem mudar schema |
