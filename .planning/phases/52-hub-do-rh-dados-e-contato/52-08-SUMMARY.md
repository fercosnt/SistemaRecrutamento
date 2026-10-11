---
phase: 52-hub-do-rh-dados-e-contato
plan: 08
subsystem: database
tags: [postgres, rpc, security-definer, rls, lgpd, sjt, big-five, ensaio, mutation-testing]

requires:
  - phase: 52-01
    provides: "scripts/p52_ensaio.cjs (ensaio que aborta, par smoke52l, GUC p52.evidencia, capturar())"
  - phase: 51-10
    provides: "molde ler_contexto_knockout_revisao (guarda fail-closed + helper antes da busca) e revisao_rejeicao"
  - phase: 50
    provides: "public.is_active_rh_user() (helper vivo) e o idioma de smoke por papel com atores lidos na execucao"
provides:
  - "public.ler_devolutiva_bigfive_rh(uuid) — faixa do Big Five que o candidato viu, sem numero cru (em arquivo; apply no 52-15)"
  - "public.ler_sjt_mc_rh(uuid) — SJT MC sem gabarito, alternativas em ordem neutra md5 (em arquivo)"
  - "public.ler_contexto_rejeicao_triagem_revisao(uuid) — motivo/justificativa da revisao humana_triagem (em arquivo)"
  - "migration 20261011000002 — nomes por papel no cadastro de RH (D-39 emendada), escrita controlada com PRE/POS"
  - "supabase/tests/p52_leituras_rh_smoke.sql (smoke52l, 20 clausulas a-t)"
  - "scripts/p52_mutacoes.cjs (runner de mutacoes da fase; L1-L8; --pos-apply; --so)"
affects: [52-11, 52-13, 52-14, 52-15, 52-17, 52-20]

actuals:
  tokens: 34321
  tasks: 3
  commits: 4
plan_head_before: 3fa307eb745a09763234820be702a81d45043c88
plan_head_after: d97b8c3dd8646eb96b758d99b76b206df4cf853f

tech-stack:
  added: []
  patterns:
    - "Chamada impersonada por pg_temp.p52l_chamar (SET LOCAL ROLE + claims dentro de bloco com EXCEPTION, devolve {ok}|{err: SQLSTATE:SQLERRM})"
    - "Reprovacao de smoke imprime so pg_temp.p52l_resumo (situacao/erro), nunca conteudo do candidato"
    - "Ordem neutra provada por fixture em escada com ids literais e posicao exata esperada por item (deterministico)"
    - "Mutacao derivada do TEXTO da funcao na migration por troca literal; alvo ausente/ambiguo recusa antes da baseline"

key-files:
  created:
    - supabase/migrations/20261011000001_p52_leituras_rh.sql
    - supabase/migrations/20261011000002_p52_nomes_rh_por_papel.sql
    - supabase/tests/p52_leituras_rh_smoke.sql
    - scripts/p52_mutacoes.cjs
  modified: []

key-decisions:
  - "Motivo da revisao humana_triagem = candidaturas.motivo_rejeicao (historico_candidatura nao tem coluna de motivo — medido), com a ressalva A5 no COMMENT"
  - "Linha sjt/mc sem metadata.respostas (versao antiga do motor; 1 de 6 em PROD) sai situacao 'disponivel' com itens [] — nenhum estado novo no contrato do cliente"
  - "As tres RPCs filtram candidatura viva; ausente/excluida/rascunho dao o MESMO P0002 com a mesma mensagem"
  - "p52_mutacoes prefixa SO as migrations que as entradas selecionadas requerem (nao todo MIGS fora do ledger) — o bloco D (0004, destrutiva) nao entra nas mutacoes do bloco B"
  - "Fixture (o): posicoes neutras da fortemente_pontua = 3, 2, 3, 4 (conferidas offline em node e, para o item 4, em PROD so leitura)"

patterns-established:
  - "Smoke de leitura do RH: atores e populacao lidos na execucao, populacao publicada em p52.evidencia e recusada se 0"
  - "Data migration de staff: PRE com o estado medido em literal, GET DIAGNOSTICS = 1 por UPDATE, POS com literal exato + impressao digital to_jsonb das demais linhas e colunas"

requirements-completed: [JORN-56, JORN-57, JORN-62]

coverage:
  - id: D1
    description: "ler_devolutiva_bigfive_rh: so RH ativo le; allowlist {dim, banda, texto_interpretativo}; sem percentil nem folha numerica; banda/texto = os da devolutiva do candidato; candidatura viva"
    requirement: JORN-56
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs --vistas --migracoes=supabase/migrations/20261011000001_p52_leituras_rh.sql supabase/tests/p52_leituras_rh_smoke.sql (clausulas a-h)"
        status: pass
      - kind: other
        ref: "node scripts/p52_mutacoes.cjs (L1 -> (c), L2 -> (g), L6 -> (f))"
        status: pass
    human_judgment: false
  - id: D2
    description: "ler_sjt_mc_rh: cenario + alternativas {opcao_id, texto, escolhida}, etiqueta/peso so da escolhida, ordem neutra md5, perguntas sem filtro de status"
    requirement: JORN-57
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs ... p52_leituras_rh_smoke.sql (clausulas i-o, t)"
        status: pass
      - kind: other
        ref: "node scripts/p52_mutacoes.cjs (L3 -> (n), L4 -> (o), L8 -> (t))"
        status: pass
    human_judgment: false
  - id: D3
    description: "ler_contexto_rejeicao_triagem_revisao: motivo e justificativa da revisao humana_triagem; automatica/inexistente = mesmo P0002; helper antes da busca"
    requirement: JORN-62
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs ... p52_leituras_rh_smoke.sql (clausulas p-t)"
        status: pass
      - kind: other
        ref: "node scripts/p52_mutacoes.cjs (L5 -> (q), L7 -> (r))"
        status: pass
    human_judgment: false
  - id: D4
    description: "Nomes por papel (Recrutador (teste) / Admin (teste)) por escrita controlada com PRE/POS que mordem"
    requirement: JORN-62
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs --vistas --migracoes=...0001...,...0002... supabase/tests/p52_leituras_rh_smoke.sql (evidencia nomes:recrutador_por_papel=true,admin_por_papel=true)"
        status: pass
      - kind: other
        ref: "4 variantes em scratchpad: nome medido mudou -> PRE (nome); literal errado -> POS (admin); coluna a mais -> POS (colunas); outra linha -> POS (outros)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Runner p52_mutacoes.cjs com controle verde e todas as mutacoes mordendo na propria letra"
    verification:
      - kind: other
        ref: "node scripts/p52_mutacoes.cjs -> MUTACOES: 8/8 mordem; controle verde; nada persistiu"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 08: Leituras do RH (bloco B, banco) Summary

**Três RPCs SECURITY DEFINER de leitura do RH — Big Five por allowlist sem número cru, SJT MC sem gabarito em ordem neutra `md5(pergunta_id||opcao_id)`, contexto da revisão `humana_triagem` — e os nomes por papel do cadastro de RH, todos em arquivo e provados em PROD por ensaio que aborta (smoke52l 20/20, `vistas=igual`, 8/8 mutações mordem). Nada aplicado; o apply é do 52-15.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-10-11T03:00:16Z
- **Completed:** 2026-10-11T03:22:31Z
- **Tasks:** 3 (1 tracer + 2 auto)
- **Files modified:** 4 (todos novos)

## Medições prévias (só leitura, PROD, 2026-10-11 — só nomes de chave, contagens e staff)

**Task 1 (devolutiva):**
- `devolutivas_candidato`: colunas `id, candidatura_id, candidato_id, conteudo_jsonb, modelo_ia, prompt_version, created_at`; `UNIQUE (candidatura_id)`.
- Chaves de `conteudo_jsonb`: `cabecalho, disclaimer_emocional, disclaimer_lgpd_crp, paginas`; `cabecalho` só tem `dashboard` (array) — o `nome` do tipo TS não existe nos dados; `dashboard[]` = `{banda, dim, percentil}`; `paginas[]` = `{banda, dim, palavras, percentil, texto_interpretativo}`; os dois avisos são `string`.
- 3 devolutivas (todas com 5 dims no dashboard e 5 páginas, candidatura viva, titular com `user_id`, sem linha em `usuarios_rh`); 6 linhas `scores_candidato` `tipo='big_five'`.
- Populações dos estados: viva com big_five e sem devolutiva = 3; viva sem nenhum = 37; candidaturas excluídas/rascunho = 0 (por isso (h)/(t) fabricam a borda no envelope).

**Task 2 (SJT e triagem):**
- Chaves de `scores_candidato.metadata` nas linhas `sjt`: `answered, composite_0_25, dimension_scores, expected, has_atencao, has_insufficient_evidence, insufficient_evidence_da_ia, mc_min_pct, modelo_ia, motivos_revisao, provedor_ia, respostas, versao`; elementos de `respostas`: `{opcao_id, pergunta_id, peso, tag}` (string/string/string/number).
- 6 linhas `sjt/mc` (todas `pergunta_id` nulo; uma SEM `respostas` — versão antiga com `answered, expected, has_atencao, mc_min_pct, versao`); 0 respostas apontando para opção ou pergunta inexistente.
- `perguntas` (`status` só `active` hoje) e `perguntas_opcao_sjt` (`UNIQUE (pergunta_id, opcao_id)`, `peso` em −999..100): nenhum trigger nelas nem em `scores_candidato`.
- `revisao_rejeicao`: 16 colunas (`historico_rejeicao_id NOT NULL`, `origem` ∈ {`humana_triagem`,`automatica`}, `ck_revisao_rejeicao_autor`); `historico_candidatura`: `id, candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em` — **não há coluna de motivo** → fonte do motivo = `candidaturas.motivo_rejeicao` (A5).
- Pedidos: 1 `humana_triagem` (candidatura viva, `criterio_texto` 60 caracteres, motivo não nulo), 3 `automatica`; 7 registros de rejeição pelo RH sem pedido (fonte do fallback de fabricação).

**Task 3 (staff):** exatamente 1 linha por `user_id`: `66412f96-1ee9-4621-853e-a79cd7f1b235` `administrador`, ativo, «RH2»; `af4ebf97-793c-42bb-a090-7ff19b401d06` `recrutador`, ativo, «RH3» — o estado medido no 51-17 e na pesquisa, então a parada da Task 3 não disparou. Triggers de `usuarios_rh`: `trg_usuarios_rh_anti_lockout` (só age sobre admin ativo rebaixado/desativado), `update_usuarios_rh_updated_at`, `trigger_criar_preferencias_padrao` (INSERT). Nada em `src/`, `supabase/tests/`, `supabase/functions/` fixa os nomes (os achados «RH2» são apelidos em scripts/comentários e ruído binário em PNG).

## Accomplishments

- **Tracer (Task 1):** `ler_devolutiva_bigfive_rh` com guarda fail-closed, helper antes da primeira busca, candidatura viva, `dimensoes` por `jsonb_build_object` explícito a partir de `cabecalho.dashboard[].banda` e `paginas[].texto_interpretativo`; POS de catálogo. Ensaio: `smokes=[52l=8/8] · evidencia=leituras:devolutiva=ok 52l.pop=dev:3`, re-rodado no portão do tracer (verde, 812 ms). Sem a migration o mesmo smoke fica VERMELHO em (a) (`42883 … does not exist`) — não é vácuo.
- **Task 2:** `ler_sjt_mc_rh` e `ler_contexto_rejeicao_triagem_revisao`, PRE/POS estendidos (o POS recusa `tag`/`peso`/`ordem` no objeto das alternativas e qualquer leitura de coluna `.tag/.peso/.ordem`). Ensaio final:
  `ENSAIO VERDE: … prefixadas=[20261011000001] … vistas=igual · smokes=[52l=20/20] · evidencia=leituras:devolutiva=ok,sjt=ok,triagem=ok 52l.pop=dev:3,sjt:6,tri:1`.
- **Ordem neutra (o):** fixture de 4 perguntas × 4 opções em escada (`ordem 1 = fortemente_pontua`), `status` não ativo, ids literais `5208a000-…`/`5208b000-…`; posições esperadas da fortemente_pontua **3, 2, 3, 4**. A L4 (`ORDER BY o.ordem`) dá `pos=1` nos quatro.
- **Fallback de fabricação provado:** cópia em scratchpad com o pedido real desligado → `ENSAIO VERDE … 52l=20/20 … tri:1+fabricado`.
- **Mutações (`scripts/p52_mutacoes.cjs`):** `CONTROLE verde par 52l=20/20` e
  L1→(c) · L2→(g) · L3→(n) · L4→(o) · L5→(q) · L6→(f) · L7→(r) · L8→(t) — `MUTACOES: 8/8 mordem; controle verde; nada persistiu` (rodado três vezes: duas no `<verify>` da Task 2, uma na verificação final com as duas migrations no disco).
- **Task 3:** `20261011000002_p52_nomes_rh_por_papel.sql`; ensaio das duas migrations + smoke: `prefixadas=[20261011000001,20261011000002] · vistas=igual · smokes=[52l=20/20] · evidencia=leituras:devolutiva=ok,sjt=ok,triagem=ok nomes:recrutador_por_papel=true,admin_por_papel=true …`. O portão morde: nome medido mudou → `P52N PRE-PORTAO (nome)`; literal errado → `POS-PORTAO (admin)`; coluna a mais → `POS-PORTAO (colunas)`; outra linha → `POS-PORTAO (outros)`.
- **Nada aplicado:** ledger com 0 linhas `20261011%`; as três funções não existem em PROD; os nomes de PROD seguem «RH2»/«RH3» até o 52-15.

## Task Commits

1. **Task 1 (tracer): ler_devolutiva_bigfive_rh + smoke (a)–(h)** — `d8737b34` (feat)
2. **Task 2a: ler_sjt_mc_rh + ler_contexto_rejeicao_triagem_revisao + smoke (i)–(t)** — `6ace0978` (feat)
3. **Task 2b: runner de mutações p52** — `6670668f` (test)
4. **Task 3: nomes por papel no cadastro de RH** — `d97b8c3d` (feat)

## Files Created/Modified

- `supabase/migrations/20261011000001_p52_leituras_rh.sql` — as três RPCs, REVOKE nominal de PUBLIC/anon, GRANT a authenticated, COMMENTs, PRE/POS (`P52-01`)
- `supabase/migrations/20261011000002_p52_nomes_rh_por_papel.sql` — escrita controlada dos nomes por papel, PRE/POS (`P52N`)
- `supabase/tests/p52_leituras_rh_smoke.sql` — smoke52l, 20 cláusulas, só roda dentro do ensaio (marca `p52.tx`)
- `scripts/p52_mutacoes.cjs` — runner de mutações da fase (entradas L1–L8; blocos C e D acrescentam as suas)

## Contrato do cliente (o que 52-11 e 52-13 consomem por cast confinado)

Exatamente o do plano. Um detalhe medido que o 52-11 precisa saber: uma linha `sjt/mc` sem `metadata.respostas` (versão antiga do motor — 1 das 6 de PROD) devolve `{situacao: 'disponivel', itens: []}`. `escolhida_peso` é número JSON (ou `null`); `pergunta_id` vem como texto da resposta gravada.

## Decisions Made

Ver `key-decisions`. Em resumo: motivo da triagem pela candidatura (A5 escrita no COMMENT); `disponivel` com `itens: []` para a linha sem respostas; mesmo P0002 para ausente/excluída/rascunho nas três; o runner de mutações prefixa só o que as entradas requerem.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Privacidade] Reprovação do smoke não imprime conteúdo do candidato**
- **Found during:** Task 2 (primeira rodada das mutações)
- **Issue:** As mensagens de reprovação ecoavam o retorno cru (`left(jsonb::text, N)`): na L5 saiu o começo de uma justificativa, na L8 o começo de um cenário; nas cláusulas da devolutiva sairia o texto interpretativo do candidato. Viola a regra do plano «nenhum dado de candidato no terminal/evidência».
- **Fix:** `pg_temp.p52l_resumo(jsonb)` devolve só `ok:situacao=…[,itens=n][,dimensoes=n]` ou `err:SQLSTATE:msg`; as 34 ocorrências trocadas.
- **Files modified:** supabase/tests/p52_leituras_rh_smoke.sql
- **Verification:** ensaio 20/20 e mutações 8/8 de novo; as linhas de mordida agora mostram só `ok:situacao=disponivel` / `err:…`
- **Committed in:** 6ace0978

**2. [Rule 2 - Cobertura] Cláusula (t) e as bordas rascunho/excluída em (h)**
- **Found during:** Task 1/2
- **Issue:** A must-have exige o MESMO código para ausente/excluída/rascunho nas três RPCs, mas a lista de cláusulas do plano só prova o inexistente.
- **Fix:** (h) compara rascunho e excluída com o inexistente na devolutiva; (t) faz o mesmo no SJT (rascunho) e na triagem (candidatura excluída). Total 20 cláusulas (a–t) em vez de 19.
- **Committed in:** d8737b34, 6ace0978

**3. [Rule 2 - Cobertura] Mutações L7 e L8 a mais (o plano permite «ou mais»)**
- **Issue:** sem elas, a guarda do helper na triagem e o filtro de candidatura viva não tinham mutação que os reprovasse.
- **Fix:** L7 (triagem sem helper → (r)) e L8 (SJT sem filtro de viva → (t)).
- **Committed in:** 6670668f

---

**Total deviations:** 3 auto-fixed (todas Rule 2, aditivas, só em smoke/runner).
**Impact on plan:** nenhuma mudança de contrato nem de escopo; o portão ficou mais estrito.

## Issues Encountered

- Um `IF x IS DISTINCT FROM CASE … THEN … END THEN` no smoke deu 42601: o scanner do PL/pgSQL corta a condição no primeiro `THEN`. Resolvido com parênteses antes do commit.
- Em (a), a comparação foi feita sobre a PROJEÇÃO `{dim, banda, texto_interpretativo}` do retorno (não sobre o objeto inteiro) para que a L2 (`percentil` a mais) reprove pela cláusula dela, (g), e não por (a).

## Threat Model

T-52-14 (desativado com JWT válido): helper antes da busca nas três; smoke (c)/(k)/(r) e (h) inexistente; mutações L1/L7. T-52-15 (anon): REVOKE nominal, POS de ACL, smoke (f)/(m)/(s), L6. T-52-16 (percentil): allowlist, POS sem a palavra, smoke (g) (`strict $.**.percentil` e nenhuma folha numérica), L2. T-52-17 (gabarito): etiqueta só da escolhida, `ORDER BY md5`, POS do objeto das alternativas, smoke (n)/(o), L3/L4. T-52-18 (oráculo de existência): helper antes, mesmo P0002 para ausente/excluída/rascunho/automatica, smoke (h)/(q)/(t), L8. T-52-19 (nomes): PRE com o estado medido, GET DIAGNOSTICS, POS com literais e impressões digitais — 4 variantes que mordem. T-52-SC: nenhuma instalação.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Pronto para o review bloqueante do bloco B (52-14) e o apply (52-15) com `node p46apply.cjs migrate` das duas migrations, nessa ordem. Depois do apply: `node scripts/p52_ensaio.cjs --sem-migracoes supabase/tests/p52_leituras_rh_smoke.sql` e `node scripts/p52_mutacoes.cjs --pos-apply`.
- REQUIREMENTS.md não foi tocado (regra do operador: tracking à mão só em STATE/ROADMAP; JORN-56/57/62 são compartilhados com 52-11/52-13).

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- FOUND: supabase/migrations/20261011000001_p52_leituras_rh.sql, supabase/migrations/20261011000002_p52_nomes_rh_por_papel.sql, supabase/tests/p52_leituras_rh_smoke.sql, scripts/p52_mutacoes.cjs
- FOUND commits (ancestrais de HEAD): d8737b34, 6ace0978, 6670668f, d97b8c3d
- commits medidos: `git rev-list --count 3fa307eb..HEAD` = 4
