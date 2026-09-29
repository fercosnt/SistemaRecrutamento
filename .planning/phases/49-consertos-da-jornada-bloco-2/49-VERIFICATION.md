---
phase: 49-consertos-da-jornada-bloco-2
verified: 2026-09-29T06:40:00Z
status: gaps_found
score: 10/13 must-haves verified
covered_files:
  - scripts/geradores/gen-sjt-marketing.py
  - scripts/p49_12_forma_retroativas.cjs
  - src/components/KanbanBoard.tsx
  - src/components/ScoreCard.tsx
  - src/components/modals/UpdateStatusModal.tsx
  - src/components/pages/CandidatosRHPage.tsx
  - src/components/pages/ComparativoCandidatosPage.tsx
  - src/components/pages/VagaCandidatosRHPage.tsx
  - src/features/admin/ai-logs/components/AiLogsPage.tsx
  - src/features/admin/ai-logs/services/aiLogsService.ts
  - src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx
  - src/features/decisao/components/DecisaoFinalPage.tsx
  - src/features/decisao/services/decisaoService.ts
  - src/features/entrevista/components/EntrevistaWorkspace.tsx
  - src/features/entrevista/components/GuiaEntrevistaPanel.tsx
  - src/features/entrevista/components/TranscricaoReviewPanel.tsx
  - src/features/entrevista/hooks/useEntrevistaScorecard.ts
  - src/features/entrevista/services/entrevistaService.ts
  - src/features/hub-candidato/components/AnaliseIABlock.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/hub-candidato/services/analiseCandidatoService.ts
  - src/features/privacidade/constants/reciboExclusao.generated.ts
  - src/features/triagem/components/ComparativoScreen.tsx
  - src/features/triagem/components/ProvenienciaIABadge.tsx
  - src/features/triagem/components/RedacaoOverrideForm.tsx
  - src/features/triagem/components/RedacaoReviewPanel.tsx
  - src/features/triagem/components/TriagemTable.tsx
  - src/features/triagem/hooks/useComparativo.ts
  - src/features/triagem/pdf/exportComparativo.ts
  - src/features/triagem/services/revisaoRedacaoService.ts
  - src/features/triagem/services/triagemService.ts
  - src/features/vagas/services/candidaturasService.ts
  - src/features/vagas/types/vagasTypes.ts
  - src/lib/candidatura/candidaturaEncerrada.ts
  - src/lib/candidatura/proximaEtapa.ts
  - src/lib/cognitivo/cognitivoBanda.ts
  - supabase/functions/_shared/ai-client.ts
  - supabase/functions/_shared/ai-error-codes.ts
  - supabase/functions/_shared/analise-schemas.ts
  - supabase/functions/_shared/audit-logger.ts
  - supabase/functions/_shared/bars-redacao.ts
  - supabase/functions/_shared/candidaturaEncerrada.ts
  - supabase/functions/_shared/comparativo-config.ts
  - supabase/functions/_shared/entrevista-schemas.ts
  - supabase/functions/_shared/essay-schemas.ts
  - supabase/functions/_shared/exportAllowlist.ts
  - supabase/functions/_shared/injection-detector.ts
  - supabase/functions/_shared/reciboExclusao.ts
  - supabase/functions/_shared/resultado-de-provedor.ts
  - supabase/functions/_shared/sjt-rubrica.ts
  - supabase/functions/analise-candidato-individual/index.ts
  - supabase/functions/avaliar-redacao-cultural/index.ts
  - supabase/functions/avaliar-redacao/index.ts
  - supabase/functions/avaliar-transcricao-entrevista/index.ts
  - supabase/functions/comparativo-candidatos/index.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
  - supabase/functions/notificar-candidato/index.ts
  - supabase/migrations/20260922000001_p49_llm_provider_none.sql
  - supabase/migrations/20260922000002_p49_colunas_proveniencia_e_analise.sql
  - supabase/migrations/20260922000003_p49_trava_encerrada.sql
  - supabase/migrations/20260922000004_p49_trilha_justificativa_e_vigente.sql
  - supabase/migrations/20260922000005_p49_comparativo_max_tokens.sql
  - supabase/migrations/20260922000006_p49_snapshot_so_com_mudanca.sql
  - supabase/migrations/20260922000007_p49_analise_entrevista_vigente.sql
  - supabase/migrations/20260922000008_p49_revisao_entrevista_vigente.sql
  - supabase/migrations/20260922000009_p49_retro_justificativa_grudada.sql
  - supabase/migrations/20260922000011_p49_retro_marca_analises.sql
  - supabase/migrations/20260922000012_p49_motor_logs_e_revisao.sql
  - supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql
  - supabase/migrations/20260923000001_p49_motor_respostas_sjt.sql
  - supabase/migrations/20260923000002_p49_motor_desidentifica_analises.sql
  - supabase/migrations/20260929000001_banco_sjt_marketing.sql
  - supabase/migrations/20260929000002_jorn50_reaponta_sjt_social_media.sql
covered_digest: "v2:sha256:17d9c7a6a91dbe03a5a16842564636363efae64017774b461b5e2a2099d222fa"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "JORN-37: as 4 cópias da justificativa da decisão final no histórico (5 linhas de historico_candidatura.criterio_texto) são limpas com checkpoint (D-47)"
    reason: "D-47 recusada pelo operador em 2026-09-23 (49-12): normalizar o texto das linhas antigas editaria uma trilha de auditoria sem que a trilha registrasse a edição. A metade que impede cópia NOVA foi entregue (registrar_decisao grava a constante 'Decisão final registrada.'). BD-9 continua open no WINDOWS.md (linha 74); aceite formal AR-49-01 em 49-SECURITY.md"
    accepted_by: "operador (recusa 2026-09-23; aceite formal na cauda 2026-09-29, AR-49-01)"
    accepted_at: "2026-09-29T00:00:00Z"
gaps:
  - truth: "Portão de avanço e revisão humana olham a MESMA análise vigente de entrevista (JORN-12 / D-39): a bandeira que bloqueia o avanço é a que a tela deixa confirmar"
    status: failed
    reason: "CR-03 confirmado no código. avancar_etapa bloqueia por QUALQUER análise vigente com bloqueio_avanco e revisao_confirmada_em nulo; o painel só calcula flagFired/bloqueado e só oferece «Confirmar revisão humana» sobre vigenteMaisRecente. Como a vigência é por (candidatura, tipo), online e presencial podem ter uma vigente cada; a bandeira da mais antiga some da tela, o CTA Avançar aparece habilitado e o servidor recusa sem caminho de confirmação na UI (a saída indireta é colar outro texto no tipo antigo)."
    artifacts:
      - path: "src/features/entrevista/components/TranscricaoReviewPanel.tsx"
        issue: "linhas 489-494: flagFired/revisaoConfirmada/bloqueado derivam só de vigenteMaisRecente; confirmar em :654 usa só vigenteMaisRecente.id"
      - path: "supabase/migrations/20260922000004_p49_trilha_justificativa_e_vigente.sql"
        issue: "linhas 210-218: o portão EXISTS sobre todas as vigentes (correto por si só); é o painel que discorda"
    missing:
      - "Painel derivar pendentes = vigentes.filter(bloqueio_avanco && !revisao_confirmada_em) e oferecer uma confirmação por item; bloqueado = pendentes.length > 0"
      - "Nova migration (a aplicada é imutável pelo md5) para salvar_avaliacao_entrevista receber p_analise_id/p_tipo, em vez de gravar na vigente mais recente entre os dois tipos"
      - "Teste: duas vigentes de tipos distintos, a mais antiga com bandeira não confirmada"
  - truth: "A linha de auditoria de um fallback sobrevive (D-27c / IA-02): o resultado por fallback e o custo dele continuam registrados em ai_call_logs depois de um retry"
    status: partial
    reason: "CR-02 confirmado no código. runOpenAIFallback grava a linha do resultado com idempotency_key: a.idempotency_key (ai-client.ts:1134); tryIdempotencyReplay não faz replay de fallback (:526), então o retry com a mesma chave efetiva chama o provedor de novo e, se o Sonnet responde, logAiCall faz UPSERT onConflict idempotency_key (audit-logger.ts:239-241) por cima da linha do fallback: some provider='openai', custo e error_code fallback_*, e ai_call_log_id de uma entrevista_analises antiga passa a apontar para uma linha que descreve outra chamada. A proveniência por COLUNA nas tabelas de resultado (D-28) não é afetada, por isso o achado é parcial e não derruba «a troca aparece» nas telas."
    artifacts:
      - path: "supabase/functions/_shared/ai-client.ts"
        issue: "linha 1134 (chave na linha do resultado do fallback) e :526"
      - path: "supabase/functions/_shared/audit-logger.ts"
        issue: "linhas 239-241: upsert por idempotency_key sem preservar id/created_at"
    missing:
      - "Linha do resultado de fallback com idempotency_key nulo (evento de auditoria, não resposta cacheável)"
      - "Teste: fallback seguido de retry bem-sucedido deixa duas linhas com ids distintos"
  - truth: "O guard de injeção de prompt reconhece pt-BR sem reprovar texto honesto (JORN-41, requisito da fase, marcado Complete)"
    status: partial
    reason: "CR-01 reproduzido por mim executando os 13 regex reais de injection-detector.ts: «Hoje você é uma assistente de dentista há quanto tempo?», «Minha gestora disse: você é um modelo para a equipe.», «Você é uma nova integrante», «Atue como uma assistente de verdade», «Recebemos avaliação de nota máxima dos pacientes.» (o «de» casa d[êe]), «não ignore as orientações pós-operatórias» e «esqueça o que você leu na internet» são todos detectados (padrões #9-#13, os de 49b3ab5b/ae299ae8). A frase-alvo do UAT também é detectada, então o defeito de 27/09 foi fechado, mas a largura reprova texto de um consultório que contrata assistentes. Efeito: provider='none' + análise falhou (nunca vigente) ou redação em pendente_humano; não é silencioso (o JORN-39 registra), por isso não derruba nenhuma verdade do objetivo de rota — degrada a disponibilidade da IA."
    artifacts:
      - path: "supabase/functions/_shared/injection-detector.ts"
        issue: "padrões 3, 4, 5 (e 1, 2 com objeto negado) casam português corrente"
    missing:
      - "Ancorar 3/4 ao modelo (IA, inteligência artificial, modelo de linguagem, bot) e tirar assistente/modelo/nova como alvo"
      - "Padrão 5 sem d[êe] (preposição): exigir a forma imperativa"
      - "Acrescentar cada frase acima a BENIGN_PAYLOADS de injection-detector.test.ts antes de mexer no regex"
deferred: []
advisory: []
---

# Phase 49: Consertos da Jornada — Bloco 2 Verification Report

**Phase Goal:** O RH decide sobre o que é verdade: a IA que ranqueia é a que está configurada (e, quando não for, a troca aparece), a nota que a lista mostra é a que existe, a rubrica que o RH lê é a que a IA avaliou, quem já saiu do funil não aparece como candidato a avançar, e a trilha da candidatura (justificativa, análise vigente, histórico da decisão) registra o que aconteceu, sem carimbo herdado de outra transição nem versão criada por leitura.
**Verified:** 2026-09-29T06:40:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Veredito em uma linha

Os cinco eixos do objetivo estão entregues e provados (código + PROD read-only + testes), com **uma verdade do objetivo derrubada** (CR-03, análise vigente) e **dois defeitos de integridade confirmados** que não derrubam verdade do objetivo mas contradem requisitos da fase (CR-02 auditoria de fallback, CR-01 guard de injeção). O BD-9 residual (AR-49-01) é desvio aceito pelo operador, não gap.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A troca de modelo aparece: resultado grava provedor/modelo reais; tela do resultado, PDF do comparativo e log do admin mostram o fallback (JORN-28 a,b,c) | ✓ VERIFIED | `comparativo-candidatos/index.ts:491-518,560,571-572` grava `provedor_ia`/`modelo_ia` com o erro do INSERT checado; `ProvenienciaIABadge` importado por ComparativoScreen, GuiaEntrevistaPanel, TranscricaoReviewPanel, RedacaoReviewPanel, AnaliseIABlock, AiLogsPage; `exportComparativo.ts:129-137` imprime a proveniência; `49-PROVA-PROD.md` §5: par de linhas Anthropic `anthropic_api_error` (404) → `openai`/`fallback_anthropic_api_error`, selo e PDF conferidos pelo operador (relato), 21/21 + 8/8 |
| 2 | Causa separada (não coube / demorou / fora do schema) e teto do comparativo que cabe no tempo (D-29/D-59) | ✓ VERIFIED | `ai-error-codes.ts:47-87` (max_tokens, timeout, schema_invalid, refusal, overloaded, api_error, circuit_open + `fallback_`); `comparativo-config.ts:75` `COMPARATIVO_MAX_CANDIDATOS = 4`; PROD b14 `max_tokens=3600`; Deno `ai-client.test.ts` etc. 201/0 |
| 3 | A nota da lista é a que existe: ausência nunca vira 0; Big Five concluído/não fez; Cultura só nota revisada; Intel só faixa; sem CPF no navegador; hub sem percentil (JORN-13/38/40) | ✓ VERIFIED | `ScoreCard.tsx:60-100` (estados, nenhum ramo produz dígito fora de `nota`); `vagasTypes.ts:744-760` `estadoCultura` exige `tipo='redacao' && status='sucesso' && number`; `candidaturasService.ts:54,86` `CANDIDATO_ALLOWLIST='id, nome_completo, email, celular'`, embeds mortos removidos, mesma fonte na aba «Por Vaga» (:617,:731); `LiberacaoCognitivoBlock.tsx:104-115` só `cognitivoBanda`; sem `candidatos(*)` em `src/` |
| 4 | A rubrica que o RH lê é a que a IA avaliou (JORN-07) e o SJT recebe a rubrica e pesa pela chave (JORN-35) | ✓ VERIFIED | `_shared/bars-redacao.ts` (BARS PRD v1.1, `RUBRICA_REDACAO_VERSAO='bars-prd-1.1'`, zero imports); EF `avaliar-redacao-cultural/index.ts:288-299,330,413,503` injeta o bloco e grava `rubrica_versao`; `RedacaoReviewPanel.tsx:72,143-167` e `RedacaoOverrideForm.tsx:52` importam a MESMA constante e mostram `reasoning`/`cited_evidence`; Deno `bars-redacao`/`essay-schemas`/`avaliar-redacao-cultural` 56/0; `sjt-rubrica.ts` + `avaliar-redacao` verdes |
| 5 | Quem saiu do funil não é oferecido nem avança: seleção, EF, banco e e-mail (JORN-25/32/33/34) | ✓ VERIFIED | Seleção `TriagemTable.tsx:283`; Kanban `KanbanBoard.tsx:140` (predicado canônico, cobre `finalizado`); modal `UpdateStatusModal.tsx:74-89` sem `finalizado` nem reabrir; EF `comparativo-candidatos/index.ts:280-286,319-327` (IDOR: 403 único se a vaga da candidatura ≠ `body.vaga_id`), `:333` `ENCERRADA`, `:365` `SEM_ANALISE`, `posicoes` por `candidatura_id`; banco `20260922000004:157-158` trava por `candidatura_encerrada(OLD)` com exceções por GUC `reabertura`/`decisao`; `notificar-candidato/index.ts:328-333` recusa `avanco` para encerrada antes do claim; «Avançar» pelo `proximaEtapaDeTrabalho` (`ComparativoCandidatosPage.tsx:171,200`); finalistas = `etapa_atual='decisao_final'` e não encerrada (`decisaoService.ts`). PROD: `p25_knockout_nao_avanca`, `p25_sem_avanco_para_encerrada`, `p25_comparativo_sem_encerrada` true |
| 6 | Uma análise VIGENTE de entrevista por tipo, com dono, hash e vínculo; falha nunca vigente; cache não cria linha; **portão e revisão humana olham a mesma vigente** (JORN-12) | ✗ FAILED (parcial) | Metade entregue e provada: RPC `registrar_analise_entrevista` com lock por (candidatura, tipo), `avaliar-transcricao-entrevista/index.ts:249-271,400-484` checa erro, seletor de tipo no painel, PROD `p12_*` 5/5 (A/B/A, falha nunca vigente, uma vigente por tipo). **Falha:** gap CR-03 (frontmatter) — portão sobre todas as vigentes vs. painel só sobre `vigenteMaisRecente` (`TranscricaoReviewPanel.tsx:489-494,654`) |
| 7 | `etapa_justificativa` é consumida pelo histórico e limpa; o portão de regressão volta a armar (JORN-17) | ✓ VERIFIED | `20260922000004:250` `NEW.etapa_justificativa := NULL` depois do INSERT no histórico (:227-229), com pós-portão que reprova se a ordem inverter (:555-569); PROD `p17_sem_justificativa_grudada` (global, 0 linhas) |
| 8 | Ler a explicação, ou qualquer UPDATE sem mudança, não versiona a decisão; mudança real, reabertura e tombstone continuam arquivando (JORN-3b) | ✓ VERIFIED | `20260922000006:143-148` `WHEN ((to_jsonb(OLD) - 'explicacao_solicitada_em' - 'alerta_prazo_enviado_em') IS DISTINCT FROM (…NEW…))`, `stamp_explicacao_acessada` com `AND explicacao_solicitada_em IS NULL` (:180-182), pós-portões; `49-07-SUMMARY` prova por mutação M1/M2/M5 (o smoke FALHA sem o conserto); explicação recarregada 5× relatada pelo operador |
| 9 | A trilha da decisão final não carrega mais o texto (JORN-37, BD-9) | ✓ VERIFIED (código) · PASSED (override) na limpeza retroativa | `registrar_decisao` grava a constante `'Decisão final registrada.'` nos dois ramos (`20260922000004:435,447`) e o pós-portão reprova a cópia (:573-581); PROD `p37_trilha_sem_texto_da_decisao` (escopada a `criado_em > T0`). As 5 linhas antigas ficam: override AR-49-01, ver seção própria |
| 10 | O motor de exclusão apaga o que o recibo promete (JORN-36, D-48/D-60..D-63/D-69) | ✓ VERIFIED | `20260923000002` (passo `apagar_respostas_e_producoes`, 6 ocorrências no corpo) ; `npm run check:export-allowlist` e `check:recibo-exclusao` exit 0 (rodei); PROD 1ª execução real 2026-09-27 (`+claude7`): 8/8 provas (`respostas_formulario` 6→0, `respostas_raven` 60→0, `cited_evidence` 1→0, `entrevista_analises.citacoes` 5→0, 7/7 logs redigidos, scores e outros titulares intactos); o instrumento reprovou trabalho correto na 1ª rodada e foi consertado pela FORMA (`49-PROVA-PROD.md` fim) |
| 11 | Bloqueios de custo e de injeção ficam registrados na auditoria (JORN-39) | ✓ VERIFIED | `20260922000001` (`none` no enum `llm_provider`); `audit-logger.ts:239-275` devolve `{id, error}` em vez de engolir; PROD `p39_linha_none` true (passo (c) reexecutado 28/09, 304 ms) |
| 12 | A linha de auditoria do fallback e seu custo sobrevivem a um retry (D-27c/IA-02/AI-06) | ✗ FAILED (parcial) | Gap CR-02 (frontmatter), lido no código: `ai-client.ts:1134`, `:526`, `audit-logger.ts:239-241` |
| 13 | O guard de injeção reconhece pt-BR sem recusar texto honesto (JORN-41, fora da lista do objetivo mas requisito da fase marcado Complete) | ✗ FAILED (parcial) | Gap CR-01 (frontmatter), reproduzido por execução dos regex |

**Score:** 10/13 truths verified (1 delas por override do operador). 0 truths presentes-mas-comportamento-não-exercido: as verdades de transição/invariante (3b, 17, 25, 12, 36) têm smoke SQL com mutação e prova PROD.

### Decisão sobre o item que o pedido mandou julgar: BD-9 / AR-49-01

**Classificação: desvio de requisito aceito pelo operador; não é gap do objetivo.** Razões, do mais forte ao mais fraco:

1. O objetivo diz «sem carimbo herdado de outra transição nem versão criada por leitura». As 5 linhas antigas de `historico_candidatura.criterio_texto` **registram o que aconteceu** naquela decisão; não são carimbo herdado (JORN-17, fechado) nem versão de leitura (JORN-3b, fechado). BD-9 é uma questão de **exposição ao titular**, que o objetivo do Bloco 2 só toca por decisão do operador ao acrescentar o JORN-37.
2. O JORN-37 tem duas metades: impedir cópia **nova** (entregue e vigiada por pós-portão + `p37_…`) e limpar as 5 **antigas** (D-47, recusada). O operador recusou a segunda com razão de auditoria (editar a trilha sem a trilha registrar a edição), documentou em `49-12-SUMMARY.md`, `49-SECURITY.md` AR-49-01 e `WINDOWS.md` linha 74 (`open`).
3. O que **não** está resolvido: a exposição existe hoje em 4 candidaturas (`0b1c887b`, `6e5d8051`, `2ce20fbf`, `d31c78bb` — esta de conta real) e chega ao titular na exportação. Aceitar o risco não fecha o BD-9 (a fase diz isso corretamente). Falta duas escriturações: o texto do JORN-37 em `REQUIREMENTS.md` ainda promete a limpeza; e o fecho do M8 tem de carregar o BD-9 (o próprio WINDOWS 74 já exige isso). Registrado como override, não como PASSED sem ressalva.

### Julgamento dos três críticos do code review

| Achado | Confirmado por mim | Derruba verdade do objetivo? | Nota |
|---|---|---|---|
| CR-03 | Sim (leitura do portão e do painel) | **Sim — verdade 6** («análise vigente»). É a discordância entre leitores que a Correção 12 e a D-39 mandavam eliminar | Estreito (precisa de duas vigentes de tipos distintos, a mais antiga com bandeira não confirmada), mas o estado é sem saída pela UI |
| CR-02 | Sim (leitura de `ai-client.ts`/`audit-logger.ts`) | **Parcial** — não a verdade 1 (a proveniência por coluna e o selo seguem corretos), sim a integridade do log (verdade 12): custo do fallback e a evidência `provider='openai'` são reescritos por retry bem-sucedido; ponteiro D-38 de análise antiga passa a descrever outra chamada | A tentativa Anthropic que falhou (chave nula) permanece, então o rastro não some por completo |
| CR-01 | Sim (executei os regex; 7 de 7 frases do review casam, e a frase-alvo do UAT também) | **Não** as verdades do objetivo; sim o JORN-41. Os commits `49b3ab5b`/`ae299ae8` são `fix(49)…`, JORN-41 está no REQUIREMENTS como Phase 49, mas **não pertencem a nenhum dos 29 planos** (nasceram do UAT de 27–28/09) | Não é silencioso (JORN-39 registra `provider='none'`; transcrição vira `falhou`, redação vira `pendente_humano`), mas reprova português corrente de um consultório que contrata assistentes |

### Artifacts / Wiring / Data-flow (amostra dos load-bearing)

| Artefato | Status | Detalhes |
|---|---|---|
| `_shared/bars-redacao.ts` → EF + 2 telas | ✓ WIRED | uma constante, 3 consumidores; versão gravada na linha |
| `_shared/comparativo-config.ts` → EF | ✓ WIRED | teto único |
| `_shared/candidaturaEncerrada.ts` / `src/lib/candidatura/candidaturaEncerrada.ts` → EF comparativo, notificar, Kanban, Triagem, Decisão | ✓ WIRED | predicado canônico, sem cópia |
| `registrar_analise_entrevista` (service_role) ← EF transcrição | ✓ WIRED | erro checado; dados fluem (PROD `p12_analise_com_dono`) |
| `ProvenienciaIABadge` ← 6 telas + PDF | ✓ WIRED | dado vem das colunas de proveniência, não do modelo configurado |
| Painel de revisão de entrevista ↔ portão `avancar_etapa` | ⚠ PARTIAL | discordam com duas vigentes (CR-03) |

### Behavioral Spot-Checks (executados por mim, sem tocar PROD)

| Comportamento | Comando | Resultado | Status |
|---|---|---|---|
| Suíte front inteira | `CI=true npx vitest run` | 217 arquivos / 2321 testes, exit 0 | ✓ PASS |
| Portão tsc (D-53) | `npm run lint` \| contagem `error TS` | 89 ≤ 90 | ✓ PASS |
| EFs tocadas | `deno test` ai-client, injection-detector, comparativo, transcrição, notificar-candidato, avaliar-redacao | 201 passed / 0 failed | ✓ PASS |
| Redação/BARS | `deno test` bars-redacao, essay-schemas, avaliar-redacao-cultural | 56 / 0 | ✓ PASS |
| Compliance | `check:export-allowlist`, `check:recibo-exclusao` | exit 0, exit 0 | ✓ PASS |
| Guard de injeção em texto honesto | regex reais × 10 frases | 7 falsos positivos (CR-01); as 2 frases já consertadas em `ae299ae8` não casam | ✗ FAIL (gap) |
| Git (D-52) | `git log origin/main..HEAD` | 5 commits, **todos `docs(49)`** (Nyquist, security, UI, review); nenhum código pendente | ✓ PASS |

**Lacuna dos testes verdes:** `injection-detector.test.ts` passa porque seu conjunto benigno não contém nenhuma das frases do CR-01 (os controles são da classe «ausência do gatilho» ou dos três casos de `ae299ae8`). Verde não prova a largura.

### Probe Execution

Não há `probe-*.sh` declarado pela fase. Os smokes SQL (`p49_trilha_smoke`, `p49_snapshot_smoke`, `p49_analise_vigente_smoke`, `p45_motor_exclusao_smoke`) e `p49_prova_prod.sql` só rodam em PROD; **não os reexecutei** (proibido). Evidência aceita: `49-PROVA-PROD.md` (21/21 asserções + 8/8 discriminadores de população, T0 2026-09-26T18:44:16Z, fechada 2026-09-29), com mutações que provam que as asserções mordem. Ressalva: `p3b_leitura_sem_snapshot` e `p37_…` são negativas (`NOT EXISTS`) sem discriminador de população próprio; a mordência de 3b vem das mutações M1/M2/M5 do `49-07-SUMMARY`, não da prova de PROD.

### Requirements Coverage

Todos os IDs do pedido aparecem em pelo menos um PLAN (`requirements:` do frontmatter dos 29 planos). Nenhum órfão dentro do pedido.

| Requisito | Planos | Status | Evidência |
|---|---|---|---|
| JORN-28 | 01,02,08,09,10,11,13,15,16,17,18,22,23,24,25,26,27 | ✓ SATISFIED (com CR-02 parcial) | verdades 1, 2, 12 |
| JORN-13 | 04,18 | ✓ SATISFIED | verdade 3 |
| JORN-07 | 01,09,15,17,18 | ✓ SATISFIED | verdade 4 |
| JORN-25 | 03,05,06,08,13,18,22 | ✓ SATISFIED (WR-06/08 avisos) | verdade 5 |
| JORN-12 | 01,06,10,12,16,17,18 | ✗ PARCIAL | verdade 6, CR-03 |
| JORN-17 | 06,12,18 | ✓ SATISFIED | verdade 7 |
| JORN-3b | 07,28,18 | ✓ SATISFIED | verdade 8 |
| JORN-32 | 08,18 | ✓ SATISFIED | `comparativo-candidatos/index.ts:319-327` |
| JORN-33 | 05,18 | ✓ SATISFIED | `KanbanBoard.tsx:140` |
| JORN-34 | 05,06,18 | ✓ SATISFIED | `UpdateStatusModal.tsx:74-89`, `guard_rejeicao_auditada` (b08) |
| JORN-35 | 18,23 | ✓ SATISFIED (WR-03/04 avisos) | `sjt-rubrica.ts`, `avaliar-redacao` |
| JORN-36 | 14,19,20,21,29 | ✓ SATISFIED | verdade 10 |
| JORN-37 | 06,12,18 | ⚠ PARCIAL, aceito (override) | verdade 9 |
| JORN-38 | 04,18 | ✓ SATISFIED | verdade 3 |
| JORN-39 | 01,02,11,18,25,26,27 | ✓ SATISFIED | verdade 11 |
| JORN-40 | 04,18 | ✓ SATISFIED | verdade 3 |
| JORN-41 (extra) | nenhum (nasceu do UAT) | ⚠ PARCIAL | verdade 13, CR-01 |

**Escrituração divergente (aviso):** `REQUIREMENTS.md` ainda mostra **[ ] / Pending** para JORN-13, 07, 25, 32, 33, 34, 37, 38, 40 e `ROADMAP.md` mantém a Phase 49 desmarcada com «24 plans» (são 29), embora o `49-18-SUMMARY` declare `requirements-completed` para os 15. O código entrega 8 desses 9; o 37 depende do override acima. JORN-42..49 (defeitos do UAT de 27–29/09) estão registrados como **Pending** sob a Phase 49 e fora do objetivo; precisam de decisão de roteamento (plano de fechamento vs. bloco seguinte).

### Anti-Patterns Found

| Arquivo | Padrão | Severidade | Impacto |
|---|---|---|---|
| 73 arquivos de implementação da fase | `TBD`/`FIXME`/`XXX` | — | Nenhum ocorrência |
| `injection-detector.ts` | regex largo | 🛑 (gap 13) | CR-01 |
| `ai-client.ts:1134` | chave de idempotência em linha de evento | 🛑 (gap 12) | CR-02 |
| `TranscricaoReviewPanel.tsx:489-494` | leitor discorda do portão | 🛑 (gap 6) | CR-03 |
| `ComparativoScreen.tsx:184-189` + `AsyncState.tsx` | mensagens específicas `ENCERRADA`/`SEM_ANALISE` nunca renderizadas (`AsyncState` só mostra cópia estática por `errorCode`); o RH vê «Verifique a conexão» para recusa determinística (WR-08, confirmado) | ⚠ | JORN-25 exige mensagem verdadeira **na EF** (cumprido); a tela repete a classe de diagnóstico falso |
| `20260922000004` `registrar_decisao` | `set_config('app.transicao_sancionada','decisao')` sem checar etapa/status de origem (WR-06, confirmado) | ⚠ | consistente com o texto de D-35 («decisão» é transição sancionada), mas permite `aprovado` sobre knockout e inverter decisão sem passar por Art. 20 |
| `avaliar-redacao/index.ts` | WR-03/04/05 (SJT: pesos com chave ausente/duplicada; rubrica clínica enviada aos itens de marketing; retry após linha `falhou` dá 500) | ⚠ | JORN-35 cumprido no eixo «pelo nome devolvido»; os três são bordas |
| `ai-client.ts:526` | replay só reconhece prefixo `fallback_` (WR-01) | ⚠ | 17 linhas legadas seguem replayáveis |

Os 22 achados do `49-REVIEW.md` estão todos `open` em `49-REVIEW-DISPOSITION.md` (nenhum triado). Os que não citei acima (WR-02, 07, 09..13, IN-01..06) não derrubam verdade do objetivo.

### Gaps Summary

O objetivo da fase está entregue em cinco dos seis eixos, com prova de PROD e testes que mordem. O sexto, **a análise vigente da entrevista**, tem uma verdade derrubada: quando o RH analisa online e presencial, o servidor bloqueia o avanço por uma bandeira que a tela deixou de mostrar e não oferece confirmar (CR-03). Os outros dois defeitos confirmados (CR-02 log de fallback reescrito no retry; CR-01 guard de injeção que reprova português corrente) são regressões introduzidas pela própria fase, mas não contradizem uma frase do objetivo. Recomendação: um plano de fechamento (`/gsd-plan-phase 49 --gaps`) com as três correções, cada uma com o teste que falha primeiro, mais a escrituração de REQUIREMENTS/ROADMAP e o texto do JORN-37. As correções de banco (CR-03, migration nova para `salvar_avaliacao_entrevista`) e de EF (CR-01/02) seguem a via `p46apply`/`efdeploy` com portão de escrita aditiva.

Itens conhecidos e aceitos que **não** contei como gap: tsc 89 vs teto 90; WINDOWS 85 (`v_analises_presas`, pré-existente); BD-9 aberto (AR-49-01); hashes residuais D-70.

---

_Verified: 2026-09-29T06:40:00Z_
_Verifier: Claude (gsd-verifier)_
