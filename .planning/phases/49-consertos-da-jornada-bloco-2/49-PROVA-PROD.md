---
phase: 49-consertos-da-jornada-bloco-2
plan: 18
artefato: prova em PROD (D-51)
t0: 2026-09-26T18:44:16Z
---

# 49-PROVA-PROD — a Phase 49 provada no banco de produção

T0: 2026-09-26T18:44:16Z

Tudo o que a prova conta aconteceu **depois** deste instante e em conta de teste
(`candidatos.email ILIKE '%+claude%'`). A consulta é `supabase/tests/p49_prova_prod.sql`,
sempre rodada com o prefixo:

```sql
SET TRANSACTION READ ONLY; SELECT set_config('p49.t0', '2026-09-26T18:44:16Z', false);
```

O T0 foi lido **do próprio banco** (`now() AT TIME ZONE 'UTC'`), não do relógio local, e
depois dele nenhuma escrita de Claude tocou PROD neste plano — só as duas sondas de guarda
da §6, que **abortam de propósito** e por isso não gravam nada.

## Como estas consultas foram rodadas

Via `node p46apply.cjs sql` / `run` (Management API, SQL lido do ARQUIVO — CLAUDE.md
§«Via de apply ATUAL»). O token do Keychain respondeu normalmente nesta sessão, diferente
do que aconteceu no 48-18.

## 1. Prontidão — medida em 2026-09-26, antes de chamar o operador

### 1a. Banco (`p49_prontidao_prod.sql`) — 15 de 15 `true`

| # | Item | Resultado |
|---|---|---|
| b01 | enum `llm_provider` contém `none` (JORN-39) | ✓ |
| b02 | as 16 colunas novas do 49-01 existem | ✓ |
| b03 | as 16 são todas NULÁVEIS (D-55) | ✓ |
| b04 | `entrevista_analise_vigente(timestamptz,text,jsonb)` existe e é IMMUTABLE | ✓ |
| b05 | `avancar_etapa` com trava D-35 + GUC + limpeza JORN-17 + vigente | ✓ |
| b06 | `registrar_decisao` com GUC e a constante sem PII `'Decisão final registrada.'` | ✓ |
| b07 | `responder_revisao_decisao` com `app.transicao_sancionada` | ✓ |
| b08 | `guard_rejeicao_auditada` com predicado canônico + GUC (JORN-34) | ✓ |
| b09 | `trg_decisao_final_snapshot` com `WHEN` por `to_jsonb` da linha inteira | ✓ |
| b10 | `stamp_explicacao_acessada` idempotente (`… AND explicacao_solicitada_em IS NULL`) | ✓ |
| b11 | `registrar_analise_entrevista` só para `service_role` | ✓ |
| b12 | `salvar_avaliacao_entrevista` e `confirmar_revisao_entrevista` pela vigente | ✓ |
| b13 | `anonimizar_candidato` com `apagar_respostas_e_producoes` | ✓ |
| b14 | `max_tokens` do `comparative_ranking` ativo = 3600 | ✓ |
| b15 | as 13 migrations da fase no ledger | ✓ |

**⚠ `20260922000010` NÃO está na lista de b15, de propósito.** A D-47 foi **RECUSADA**
pelo operador em 2026-09-23 (49-12) e o número ficou deliberadamente vazio. Exigi-la aqui
seria afirmar, como critério de prontidão, exatamente o que ele declinou.

**Prova de que a sonda MORDE** (4 mutações em cópia de rascunho, descartada):

| Mutação | Efeito medido |
|---|---|
| uma das 16 colunas trocada por nome inexistente | `b02` e `b03` → `false` |
| token do GUC trocado por um que não está no corpo vivo | `b05` e `b06` → `false` |
| teto esperado 3600 → 3000 | `b14` → `false` |
| acrescentar a `20260922000010` (recusada) à lista | `b15` → `false` |

### 1b. Bundles das Edge Functions — 10 de 10 marcadores no ar

Lidos do `/functions/<slug>/body` da Management API (o eszip publicado, não o disco).

| Função | Versão ativa | Marcador | Resultado |
|---|---|---|---|
| `notificar-candidato` | v17 · `verify_jwt=false` | `candidaturaEncerrada` | ✓ |
| `comparativo-candidatos` | v29 · `verify_jwt=true` | `SEM_ANALISE` | ✓ |
| `avaliar-redacao-cultural` | v15 · `verify_jwt=true` | `bars-prd-1.1` | ✓ |
| `avaliar-redacao` | v21 · `verify_jwt=true` | `dimensao_desconhecida` | ✓ |
| `avaliar-transcricao-entrevista` | v18 · `verify_jwt=true` | `registrar_analise_entrevista` | ✓ |
| `gerar-guia-entrevista` | v21 · `verify_jwt=true` | `modelo_ia` | ✓ |
| `analise-candidato-individual` | v31 · `verify_jwt=false` | `modelo_ia` | ✓ |
| `gerar-devolutiva-bigfive` | v29 · `verify_jwt=false` | `ai-error-codes` | ✓ |
| `executar-direito-titular` | v12 · `verify_jwt=true` | `apagar_respostas_e_producoes` | ✓ |
| `exportar-meus-dados` | v5 · `verify_jwt=true` | `superada_em` | ✓ |

**Allowlist 1.3.0 embarcada:** `exportar-meus-dados` (v5) traz `1.3.0` **2×** no bundle
vivo — é a versão que o 49-17 subiu junto com a mudança do conjunto exportado.
*(`executar-direito-titular` não embarca `exportAllowlist.ts`; ele carrega o
`reciboExclusao.ts`, cujo marcador é o `apagar_respostas_e_producoes` da linha acima.)*

Três versões estão **acima** do que os SUMMARYs de 49-08/49-10/49-24 registraram
(`comparativo-candidatos` 28→29, `avaliar-transcricao-entrevista` 17→18,
`gerar-guia-entrevista` 18→21): são os redeploys dos planos posteriores da fase (49-29 e
os da onda de desidentificação). Todas as dez estão `ACTIVE`.

### 1c. Front publicado (`https://rh.beautysmile.com.br`) — 6 de 6 marcadores no ar

Grafo de import seguido inteiro: **98 chunks** a partir do `index.html` publicado.
Buscar só no índice eager daria **falso negativo** — as rotas `/rh/*` e `/admin/*` são
lazy (CLAUDE.md §«o código do front SAI POR OUTRO CANAL»).

| Marcador | Plano | Chunk |
|---|---|---|
| `scorecard-cultura-estado` | 49-04 | `CandidatosRHPage-Bvi0lov8.js` (lazy) |
| `kanban-selo-encerrada` | 49-05 | `CandidatosRHPage-Bvi0lov8.js` (lazy) |
| `triagem-selo-encerrada` | 49-22 | `VagaCandidatosRHPage-n9he5qha.js` (lazy) |
| `proveniencia-ia-badge` | 49-13 | `ProvenienciaIABadge-CDO4Vs8M.js` (lazy) |
| `ai-log-fallback` | 49-15 | `AiLogsPage-CDGuejmE.js` (lazy) |
| `transcricao-tipo-seletor` | 49-16 | `EntrevistaWorkspace-D5xgm5Ay.js` (lazy) |

O crawler, para a conferência ser repetível sem arquivo novo no repositório (rodar com
`node -e "$(…)"` ou salvar num arquivo de rascunho fora da árvore):

```js
const BASE = 'https://rh.beautysmile.com.br';
const MARCADORES = ['scorecard-cultura-estado','kanban-selo-encerrada','triagem-selo-encerrada',
                    'proveniencia-ia-badge','ai-log-fallback','transcricao-tipo-seletor'];
(async () => {
  const html = await (await fetch(BASE + '/index.html?p49=' + Date.now())).text();
  const fila = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
  const vistos = new Set(), achados = {};
  while (fila.length) {
    const p = fila.shift(); if (vistos.has(p)) continue; vistos.add(p);
    let txt; try { txt = await (await fetch(BASE + p)).text(); } catch { continue; }
    for (const m of MARCADORES) if (txt.includes(m) && !achados[m]) achados[m] = p;
    for (const mm of txt.matchAll(/["'`](\.?\/?assets\/[A-Za-z0-9._-]+\.js)["'`]/g))
      { const np = mm[1].replace(/^\.?\//, '/'); if (!vistos.has(np)) fila.push(np); }
    for (const mm of txt.matchAll(/["'`](\.\/[A-Za-z0-9._-]+\.js)["'`]/g))
      { const np = '/assets/' + mm[1].slice(2); if (!vistos.has(np)) fila.push(np); }
  }
  const faltam = MARCADORES.filter(m => !achados[m]);
  console.log('chunks varridos: ' + vistos.size);
  for (const m of MARCADORES) console.log((achados[m] ? 'OK   ' : 'FALTA ') + m + ' ' + (achados[m] ?? ''));
  if (faltam.length) { console.error('FRONT SEM MARCADOR: ' + faltam.join(', ')); process.exit(1); }
})();
```

⚠ As duas expressões de import são necessárias: o Vite emite `/assets/x.js` no índice e
`./x.js` dentro dos chunks. Seguir só a primeira para em 1 nível e dá **falso negativo**
nos marcadores das rotas lazy — que são **todos os seis**.

### 1d. Git

`git fetch` + `git log --oneline origin/main..HEAD` → **vazio** antes do commit desta
Task 1. Nenhum código da fase parado no disco. Os únicos commits que entram depois são os
deste plano, e tocam só os cinco arquivos do `files_modified`.

## 2. Linha de base da prova (`p49_prova_prod.sql`, T0 = 2026-09-26T18:44:16Z)

Rodada imediatamente depois de fixar o T0. A última chamada de IA em PROD antes disto foi
de **2026-09-22 18:49 -03:00**, e o último comparativo de **2026-09-20** — nada da jornada
aconteceu ainda, e é por isso que todas as positivas nascem `false`.

| Prova | Baseline | Observação |
|---|---|---|
| `p28_resultados_com_modelo` | false | depende de (a)+(b)+(c) — exige ≥1 linha de teste nas **5** tabelas |
| `p28_modelo_real_bate_log` | false | depende de (c) |
| `p28_teto_comparativo_3600` | **true** | `max_tokens=3600` e `model_id` ≠ o do fallback forçado. **Não pode regredir** — é ela que denuncia um `model_id` não restaurado (Task 3) |
| `p28_comparativo_4_anthropic` | false | depende de (b) |
| `p28_saida_4_ate_3140` | false | depende de (b). **`false` aqui é PONTO DE DECISÃO do D-59**, não erro a contornar |
| `p28_fallback_duas_linhas` | false | **Task 3** |
| `p28_comparativo_fallback_com_provedor` | false | **Task 3** |
| `p39_linha_none` | false | depende de (c) — o texto com padrão de injeção |
| `p39_agregacao_sem_falha` | **true** | estrutural + negativa — ver abaixo |
| `p07_redacao_nova_com_rubrica` | false | depende de (a) com redação cultural |
| `p25_knockout_nao_avanca` | **true** | negativa; vigia **4** candidaturas de knockout de teste |
| `p25_sem_avanco_para_encerrada` | **true** | negativa (global); não pode regredir |
| `p25_comparativo_sem_encerrada` | **true** | negativa (global); não pode regredir |
| `p12_uma_vigente_por_tipo` | **true** | negativa (global); a D-43 já a levou a `true` |
| `p12_sem_hash_duplicado` | false | **depende de (c)** — ver a nota abaixo, ela mudou de forma |
| `p12_aba_a_b_a` | false | depende de (c) |
| `p12_falha_nunca_vigente` | **true** | negativa (global); não pode regredir |
| `p12_analise_com_dono` | false | depende de (c) |
| `p17_sem_justificativa_grudada` | **true** | negativa (global); a D-46 já a levou a `true` (era 9) |
| `p3b_leitura_sem_snapshot` | **true** | negativa; não pode regredir depois das 5 recargas de (e) |
| `p37_trilha_sem_texto_da_decisao` | **true** | negativa, **escopada a `> T0`** — ver abaixo |

### ⚠ Duas provas foram consertadas no baseline, e a razão importa

**`p12_sem_hash_duplicado` era GLOBAL e saía `false` com o conserto inteiro no ar.** A
causa, medida: a candidatura `bf26ee3c-…` tem **três** análises de 2026-09-20 — anteriores
ao 49-10 — com o **mesmo `texto_hash`** (que a D-43 preencheu retroativamente) e `tipo`
NULL (irrecuperável, sob a D-30). A versão global media o **estado legado** e reprovaria
para sempre, com o diagnóstico falso «o reaproveitamento do D-40 não funciona» — a classe
exata do `CLAUDE.md` §«Portões: varra pela FORMA». A versão que ficou é **mais forte** que
um recorte por data: exige que nenhuma análise nascida depois de T0 duplique
`(candidatura, tipo, texto_hash)` de **nenhuma** outra, inclusive as legadas. E, por
carregar um `EXISTS` sobre o conjunto pós-T0, ela **não pode passar por vacuidade** — é
por isso que aparece como `false` no baseline, e não como negativa já verdadeira.

**`p37_trilha_sem_texto_da_decisao` é escopada a `criado_em > T0`, de propósito.** A D-47
foi **RECUSADA** em 2026-09-23 e as **5** linhas anteriores de `historico_candidatura`
seguem com o texto da justificativa da decisão final. Uma versão global reprovaria para
sempre, e a leitura óbvia do vermelho («a escrita quebrou») levaria alguém a aplicar a
migration que o operador declinou. O que esta prova afirma é o que o conserto de **código**
do 49-06 garante: nenhuma cópia **nova** nasce.

### `p39_agregacao_sem_falha` — por que ela é estrutural, e não «espere o cron»

O job `ai-cost-aggregation` roda `30 1 * * *`. Exigir uma execução **depois** de T0
obrigaria o operador a esperar o dia seguinte para fechar a fase. A pergunta real é se a
linha `provider='none'` quebra a agregação — e isso é **estrutura**, não tempo: o
`INSERT ... GROUP BY provider` do job grava em `ai_cost_daily.provider`, que é o **mesmo
enum** `llm_provider` que ganhou o valor `none`. Medido: `udt_name = 'llm_provider'`, job
`active`, e nenhuma execução não-sucedida depois de T0. A negativa do cron continua lá
como rede.

### Prova de que as NEGATIVAS mordem — 8 mutações, cópia de rascunho descartada

Um portão negativo que não pode falhar é pior que um quebrado. Cada uma abaixo foi rodada
em cópia fora da árvore, contra o PROD real, e o alvo caiu:

| Mutação | Alvo que caiu |
|---|---|
| T0 recuado 60 d no `historico` do p25 | `p25_knockout_nao_avanca` |
| T0 recuado 60 d **e** condição alargada para `etapa_no_envio IS NOT NULL` | `p25_sem_avanco_para_encerrada` |
| T0 recuado 60 d no CTE `comp_todos` | `p25_comparativo_sem_encerrada` |
| `HAVING count(*) > 1` → `>= 1` | `p12_uma_vigente_por_tipo` |
| `status_analise = 'falhou'` → `'pendente_humano'` | `p12_falha_nunca_vigente` |
| `etapa_justificativa IS NOT NULL` → `IS NULL` | `p17_sem_justificativa_grudada` |
| T0 recuado 60 d **e** comparação de linha afrouxada (11 chaves removidas) | `p3b_leitura_sem_snapshot` |
| T0 recuado 60 d na trilha | `p37_trilha_sem_texto_da_decisao` |

*(Duas primeiras tentativas — recuar só o T0 no p25 do `avanco` e no snapshot — **não**
mordiam, e isso não era defeito do portão: o dado histórico é genuinamente limpo nos dois
casos. Registrado porque «a mutação não mordeu» e «o portão não morde» são coisas
diferentes.)*

### Conferências de forma feitas antes do baseline, contra o catálogo vivo

- as **21** provas leem colunas que existem; a coluna de instante de cada tabela foi
  conferida uma por uma e **não é a mesma**: `redacoes_candidato` usa `ia_processada_em`
  (o instante em que a IA avaliou, não o da submissão), as outras quatro tabelas de
  resultado usam `created_at`, `historico_candidatura`/`notificacoes_enviadas` usam
  `criado_em`, `decisao_final_historico` usa `arquivado_em`;
- **`scores_candidato` NÃO entra nas «5 tabelas de resultado»**: a proveniência da SJT vive
  dentro de `scores_candidato.metadata` (49-23, D-68). As cinco com par de colunas são
  `analise_candidato_vaga`, `comparativo_solicitado`, `entrevista_analises`,
  `entrevista_guias` e `redacoes_candidato`. Procurar coluna em `scores_candidato` acharia
  ausência onde há decisão;
- `comparativo_solicitado` **não tem** `candidatura_id` nem `ai_call_log_id`: o vínculo com
  as candidaturas é o array `candidatura_ids` (`&&`), e o vínculo com o log é
  `vaga_id` + janela de tempo — a forma mais estreita disponível;
- `entrevista_analise_vigente` vive é
  `superada_em IS NULL AND status_analise IS DISTINCT FROM 'falhou' AND competencias IS NOT NULL`;
- `candidatura_encerrada` vive é
  `etapa IN ('aprovado','rejeitado') OR status IN ('rejeitado','finalizado')`;
- no caminho `provider='none'` o `ai-client` devolve **`model: null` e `log_id: null`**
  (medido no fonte, `ai-client.ts:713-725`). Por isso `p39_linha_none` é uma conjunção de
  dois fatos **independentes** (a linha de log existe; a análise `falhou` existe e não é
  vigente) e **não** um join — um join reprovaria o desenho. E por isso as análises
  `falhou` estão fora da exigência de `modelo_ia`/`provedor_ia`/`ai_call_log_id` em
  `p12_analise_com_dono`: nenhum modelo respondeu, e inventar proveniência é o que a D-30
  proíbe;
- o mapeamento de `decisao_final` → `decisao_final_historico` é `em → decidido_em`, com
  `id`/`arquivado_em` próprios do arquivo. O `p3b` compara por `to_jsonb` da **linha
  inteira** menos esse mapeamento e menos as duas colunas que o `WHEN` do trigger ignora —
  coluna nova entra na comparação por construção, sem lista literal que envelhece.

## 3. Estado de PROD em T0 — o que a sessão 1 precisa criar

| Conta | Candidaturas | Estado |
|---|---|---|
| `+claude1` | Social Media `aprovado/finalizado` · Consultor `aprovado/finalizado` | encerradas |
| `+claude2` | duas por **knockout** | encerradas |
| `+claude3` | Social Media `rejeitado` · Consultor **knockout** | encerradas |
| `+claude4` | Consultor `rejeitado` · Social Media **knockout** | encerradas |
| `+claude5` | Consultor `rejeitado` · **Social Media `avaliacao_assincrona`** | 1 aberta |
| `+claude6` | **Social Media `avaliacao_assincrona`** | 1 aberta |

**⚠ Só 2 candidaturas de teste estão abertas hoje, e o comparativo do D-59 precisa de 4.**
O passo (a) cria a **conta descartável** (a 3ª) e ainda falta **uma 4ª** — inscrever outra
conta `+claude` na vaga Social Media pelo fluxo real, ou avançar uma que não tenha sido
encerrada. As **4 candidaturas de knockout** ficam como sujeito das provas do JORN-25.

**Vagas de teste** (IDs fixados da `JORNADA-GUIADA.md`, lidos só para conferência):

| Vaga | ID | Opção que elimina |
|---|---|---|
| Social Media | `e897f709-d4e7-4f6c-a25b-a433d2eda525` | `0f59f62b-d86b-416d-89cd-be7865e2965c` |
| Consultor | `fdbe1a4a-0c15-4659-a589-e9d8f2f9ff98` | `1d8f94e0-0301-490b-b0df-b3955a22f80c` |

O texto da opção de knockout é «Tenho disponibilidade apenas para trabalho remoto» nas duas.

**Baseline do `comparative_ranking` ativo** — é ele que a guarda dos dois scripts do
fallback forçado exige, e é o valor que a Task 3 tem de ver restaurado:

| Campo | Valor em T0 |
|---|---|
| `model_id` | `claude-sonnet-4-6` |
| `max_tokens` | `3600` |
| identificador do fallback forçado | `claude-inexistente-p49-fallback-forcado` |

## 4. Sessão 1 — a jornada com as contas de teste

*(a preencher quando o operador avisar «sessão 1 feita»)*

### A conta descartável (sujeito do plano 49-19)

| Campo | Valor |
|---|---|
| `DESCARTAVEL_EMAIL:` | *(a preencher — alias `+claude` da caixa do operador)* |
| `DESCARTAVEL_CANDIDATO_ID:` | *(a preencher — `candidatos.id`)* |
| `DESCARTAVEL_CANDIDATURA_ID:` | *(a preencher)* |
| Tabelas alcançadas pelo passo novo do motor | *(a preencher)* |

⚠ A **senha** não é registrada aqui. Esta conta é o sujeito da primeira execução real do
motor (49-19) e não deve ser usada para mais nada depois.

### Conferências humanas

| Passo | Resultado | Observação do operador |
|---|---|---|
| (a) conta descartável + inscrição + o que a vaga pedir | ⬜ | |
| (b) comparativo de 4: 5ª bloqueada, encerrada com selo e não selecionável, nomes por posição, PDF | ⬜ | |
| (c) transcrição online: A, B, A (texto repetido), depois o texto com injeção | ⬜ | |
| (d) revisar e confirmar a análise vigente | ⬜ | |
| (e) página da explicação recarregada 5× | ⬜ | |
| (f) Kanban com selo, modal sem reabrir, lista sem 0 por ausência, hub sem percentil | ⬜ | |

### Resultado da prova (todas menos as duas do fallback)

*(a preencher — 19 colunas; `p28_fallback_duas_linhas` e
`p28_comparativo_fallback_com_provedor` são da Task 3)*

## 5. Sessão 2 — o fallback forçado (D-27)

*(a preencher quando o operador avisar «fallback visto»)*

| Campo | Valor |
|---|---|
| Aprovação da janela | ⬜ *(quem, quando)* |
| `model_id` **antes** | ⬜ |
| `model_id` **depois** (tem de ser igual ao antes) | ⬜ |
| Selo «gerado pelo modelo de contingência» na tela | ⬜ |
| Linha de proveniência no PDF | ⬜ |
| «Fallback» com a causa no log do admin, e a tentativa anterior como «Falha» | ⬜ |

### Resultado da prova inteira (21 colunas)

*(a preencher)*

## 6. O que NÃO foi rodado

- **`p47_teardown_dados_de_teste.sql`** — não rodado (regra 2 da `JORNADA-GUIADA.md`).
- **`salvar_config_purga(... p_confirmo_live := true)`** — não rodado (regra 3).
- **`p49_fallback_forcado_liga.sql`** — **não rodado.** Ele abre a janela em PRODUÇÃO e só
  roda na Task 3, com aprovação explícita do operador.
- Nenhum reset de conta de teste, nenhum e-mail a candidato real fora do fluxo normal.

### As duas sondas de guarda que RODARAM — e por que não escrevem

Para provar que a guarda de valor esperado dos dois scripts morde, duas requisições foram
enviadas. **Ambas abortam antes de qualquer `UPDATE`**, e uma requisição da Management API
é UMA transação — o `RAISE EXCEPTION` desfaz tudo:

| Sonda | Mensagem | Efeito |
|---|---|---|
| `p49_fallback_forcado_desliga.sql` rodado com a janela **fechada** | `P49 FB DESLIGA ABORTADO: o model_id ativo e "claude-sonnet-4-6", e nao o identificador forcado …` | nada gravado |
| cópia de `_liga` com `c_esperado` trocado por um valor inexistente | `P49 FB LIGA ABORTADO: o model_id ativo … e o esperado … Nada foi gravado.` | nada gravado |

`model_id`/`max_tokens` medidos **antes** e **depois** das duas sondas:
`claude-sonnet-4-6` / `3600` nos dois momentos — **idênticos**. O `_liga` real (sem
mutação) **não** foi enviado.
