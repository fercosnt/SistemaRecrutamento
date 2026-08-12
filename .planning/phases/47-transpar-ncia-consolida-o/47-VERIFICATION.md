---
phase: 47-transpar-ncia-consolida-o
verified: 2026-08-12T05:14:33Z
status: human_needed
score: 7/8 must-haves verified
behavior_unverified: 1
overrides_applied: 0
human_verification:
  - test: "Confirmar se `public.listar_historico_candidatura` (migration `20260809000001_p47_listar_historico_candidatura.sql`) está de fato aplicada em PROD, e se `supabase/tests/p47_historico_smoke.sql` foi executado com 6/6 PASS."
    expected: "A função existe em `pg_proc` de PROD, o smoke roda com `smoke47h.pass = 6`, e abrir o Histórico do RH em qualquer candidatura real renderiza um dos quatro rótulos (Sistema / O próprio candidato / nome / Recrutador removido) — nunca um erro de banco."
    why_human: "Requer acesso à sessão SQL de PROD ou a app rodando contra PROD, que este ambiente de verificação não tem (MCP Supabase indisponível ao subagente). A alegação de aplicação em `47-07-SUMMARY.md` não tem nenhum artefato de apoio (ver seção 'Achado crítico' abaixo)."
  - test: "Revisão FORMAL do Encarregado (DPO) dos quatro itens de publicação: os seis países + base legal de cada um, a formulação do provedor de hospedagem, a qualificação do serviço público de CEP, e a copy das duas páginas públicas."
    expected: "Parecer escrito do Encarregado, aprovando ou pedindo mudança de copy."
    why_human: "Julgamento jurídico/regulatório — não verificável por código. `WINDOWS.md` itens 26 e 30 registram que essa revisão segue ABERTA; a publicação atual foi liberada apenas pelo operador (Fernando), em 2026-08-11, e o próprio `47-08-SUMMARY.md` é explícito em não afirmar que isso equivale a parecer do Encarregado."
  - test: "Classificar `api.ipify.org` (`src/services/logAccessService.ts:110`) e `www.youtube.com` (`src/components/pages/InstrucoesFormularioPage.tsx:77`) como empresas contratadas (ganham ficha em `subprocessadores.ts`, com país medido) ou como não-fornecedores (decisão registrada em `DECISOES` de `destinosDeRedeComFicha.test.ts`)."
    expected: "Os dois destinos deixam de aparecer como `pendente-de-decisao` em `src/__tests__/destinosDeRedeComFicha.test.ts`."
    why_human: "Classificar um destino de rede como operador de dados contratado é ato do Encarregado, não de execução de código — e a página pública já está no ar sem cobrir os dois."
behavior_unverified_items:
  - truth: "SC#2 — o Histórico do candidato (VISRH-03) mostra o nome do recrutador em PROD, não o UUID do `ator`."
    test: "Aplicar `20260809000001_p47_listar_historico_candidatura.sql` em PROD (se ainda não aplicada), reconciliar o ledger, rodar `supabase/tests/p47_historico_smoke.sql` numa única chamada e abrir o Histórico do RH de uma candidatura real."
    expected: "`smoke47h.pass = 6`; a tela mostra um rótulo de texto, nunca um UUID e nunca um erro de banco."
    why_human: "É estado de banco em PROD — nenhum teste local (Vitest com mocks) exercita a função viva; o repositório não corrobora a alegação de aplicação com nenhum artefato equivalente ao que existe para as migrations irmãs (`20260809000002`/`000003`)."
---

# Phase 47: Transparência & Consolidação Verification Report

**Phase Goal:** O que o sistema faz com o dado está escrito onde o candidato lê — e nenhuma promessa de compliance sobrevive neste repositório sem código que a execute.
**Verified:** 2026-08-12T05:14:33Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Achado crítico — antes de qualquer outra coisa

**A alegação de que `listar_historico_candidatura` (migration `20260809000001`) está "APLICADA em PROD" (`47-07-SUMMARY.md`) não é corroborada por nenhum artefato do repositório, e é diretamente contradita pelo próprio ledger de defeitos do projeto.**

Evidência levantada, cruzando os quatro documentos que deveriam concordar:

| Fonte | O que diz |
|---|---|
| `47-02-SUMMARY.md` (a única SUMMARY que escreveu a migration) | A migration está "**ESCRITA, NÃO APLICADA**"; todas as 5 entradas de `coverage` (D1–D5) estão `status: pending`, com a nota explícita "PENDENTE DE EXECUÇÃO: exige o apply da migration, que é checkpoint do orquestrador". Nunca recebeu um commit de acompanhamento registrando o apply (só há **um** commit de docs para esse arquivo em todo o `git log`). |
| `.planning/WINDOWS.md` item **24** | `unrun-verify`, `status: open`, sem `resolved_at` — "smoke do CONSOL-02 escrito e NAO executado: exige o apply da migration 20260809000001". O ledger inteiro foi atualizado pela última vez em `2026-08-12T01:30:33Z` (bem depois de 47-07 e de 47-09) e este item nunca foi marcado `fixed`. |
| `.planning/STATE.md` | Contém uma tabela detalhada de apply para a Phase 45 (7 migrations, com hashes) e não contém **nenhuma** menção a `20260809000001` ter sido aplicada — nem na seção "Current Position", nem nas "Key Decisions". |
| `47-07-SUMMARY.md` (não é o plano que escreveu ou aplicaria a migration) | Afirma, sem citar comando nem output: "APLICADA em PROD (20260809000001), ledger reconciliado, smoke 6/6, md5 byte-perfect." |

Para comparação, as migrations irmãs (`20260809000002`/`20260809000003`, do plano 47-03) **têm** essa corroboração: `47-03-SUMMARY.md` recebeu um **segundo commit** (`85180a1`, "registra o apply das duas migrations e o guard corrigido antes dele") com uma tabela de md5 do ledger, um defeito de guard encontrado e corrigido **antes** do apply, e uma tabela de estado medido antes/depois (`18/18` linhas, `nullable: NO→YES`, etc.) — o tipo de evidência que uma aplicação real produz. **Não existe nada equivalente para `20260809000001`.**

Isso importa porque este projeto tem histórico documentado (citado no próprio `STATE.md`) de um SUMMARY anterior declarar sucesso sobre uma função que na verdade levantava `42804` em toda chamada — descoberto só quando alguém abriu a tela de verdade. O padrão aqui é o mesmo formato de risco: uma alegação de estado de PROD, sem evidência de execução, sobre exatamente a função que o SC#2 desta fase exige.

**Se a migration não estiver de fato aplicada**, o Histórico do RH (`HistoricoBlock.tsx`) chama `supabase.rpc('listar_historico_candidatura', …)` (código correto e testado com mocks — ver abaixo) e recebe um erro do PostgREST ("função não encontrada"), que `classificarErro` mapeia para `DATABASE_ERROR` — uma **regressão** em relação ao comportamento anterior (que ao menos mostrava o UUID). O SC#2 não seria observável em produção, apesar do código do lado do cliente estar correto.

Este item está marcado como comportamento **presente e implementado, mas não verificado em execução real** (`PRESENT_BEHAVIOR_UNVERIFIED`) — não é contado como verificado, e é o motivo do status geral ser `human_needed`.

## Correção a duas premissas do prompt de verificação

O prompt de disparo desta verificação continha dois itens como "conhecidos e abertos". Os dois foram **fechados** desde então, e a evidência está no código, não só na narrativa:

1. **"Os seis países dos subprocessadores não são mensuráveis"** — FALSO hoje. `src/features/transparencia/constants/subprocessadores.ts` tem as seis entradas com `pais` preenchido (cinco "Estados Unidos", uma "Brasil" com ressalva), nenhuma carrega mais `PAIS_POR_MEDIR`. Medido pelo operador em 2026-08-11 (47-04 Task 3, commit `eeed0e5`).
2. **"Nenhuma navegação de produção alcança `/privacidade` e `/subprocessadores`"** — FALSO hoje. `RodapePublico` está importado e montado em `LandingPage.tsx`, `VagasPublicasPage.tsx`, `VagaDetalhePage.tsx`, `SubprocessadoresPage.tsx` e `PrivacidadePublicaPage.tsx` (confirmado por `grep` direto no código-fonte, não apenas por SUMMARY). O portão de publicação foi liberado pelo **operador** (Fernando) em 2026-08-11 — a revisão formal do **Encarregado** segue aberta e é tratada abaixo como item de verificação humana, não como bloqueio de alcançabilidade.

`WINDOWS.md` ainda lista os itens correspondentes a essas duas coisas (25 fechado corretamente; **28** ainda `open`, mas contradito pelo código — a montagem do rodapé está, de fato, feita). Isso é evidência de que o ledger deste projeto tem entradas defasadas nos dois sentidos (algumas otimistas demais como no achado crítico acima, outras pessimistas demais como o item 28) — nenhuma fonte única deve ser aceita sem checar o código.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC#1a — Qualquer visitante lê, numa página pública, com quem os dados são compartilhados (Art. 18, VII) | ✓ VERIFIED | `src/features/transparencia/constants/subprocessadores.ts` — 6 entradas com 5 campos cada, país medido e citado com proveniência; `validarSubprocessadores`/`validarEntradaSubprocessador` lançam em campo vazio/sentinela/marcador de indefinição (testado com fixture sintética em `subprocessadores.test.ts`, 30 casos passando). Rota `/subprocessadores` registrada em `src/router/routes.tsx:157` sem guard de sessão. |
| 2 | SC#1b — "o que é guardado, por quanto tempo e por quê", derivado da matriz de retenção como **dado** | ✓ VERIFIED | `docs/compliance/matriz-retencao.yaml` (fonte autorada e datada) → `gen-matriz-retencao.cjs --check` (`npm run -s check:matriz-retencao` → exit 0, executado nesta verificação) → `src/features/transparencia/constants/matrizRetencao.generated.ts` (8 fichas reais, com `finalidade`/`base_legal` não-vazios) → `PrivacidadePublicaPage.tsx`/`MatrizRetencaoPublica.tsx` consomem o artefato, nunca redigem janela. Rota `/privacidade` registrada. |
| 3 | SC#1c — As duas páginas são ALCANÇÁVEIS por navegação de produção, não só por URL direta | ✓ VERIFIED | `RodapePublico` importado e renderizado em `LandingPage.tsx:103`, `VagasPublicasPage.tsx:535`, `VagaDetalhePage.tsx:493`, `SubprocessadoresPage.tsx:96`, `PrivacidadePublicaPage.tsx:175` — confirmado por leitura direta do código-fonte (não apenas SUMMARY). |
| 4 | SC#2 — O Histórico do candidato (VISRH-03) mostra o **nome do recrutador**, não o UUID do `ator` | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Código do cliente está correto e testado: `historicoCandidaturaService.ts` lê só via `.rpc('listar_historico_candidatura', …)`, `HISTORICO_ALLOWLIST` não contém `ator`/e-mail/id de RH, `HistoricoBlock.tsx:91` renderiza `row.ator_rotulo`. Mas a existência da função **em PROD** e a execução do smoke `p47_historico_smoke.sql` não têm evidência corroborada — ver "Achado crítico" acima. Rota para human_verification; não conta no score. |
| 5 | SC#3a — Toda promessa de retenção/exclusão tem código vivo que a executa, provado por checklist VERSIONADO (não vacuoso) | ✓ VERIFIED | `src/__tests__/promessasComExecutor.test.ts` (13 casos) + `src/__tests__/destinosDeRedeComFicha.test.ts` (9 casos) — ambos executados nesta verificação (`npx vitest run …` → 22/22 passed). Poder de detecção provado com fixture sintética nas duas direções: acusa promessa fabricada nomeando-a, não acusa executor correto, menção em comentário não conta como criação (casos dedicados a cada uma dessas três propriedades, lidos no arquivo). |
| 6 | SC#3b — O zumbi `data_deletion_log` foi resolvido (adotado com escritas reais) | ✓ VERIFIED | `supabase/migrations/20260809000002_p47_adotar_data_deletion_log.sql` — `COMMENT ON TABLE` corrigido (nomeia `anonimizar_candidato` como motor real), `rollback_to_version` passa a chamar `public.log_auditoria(...)` no mesmo corpo (linha 218). `47-03-SUMMARY.md` traz apêndice "Apply em PROD" com md5 do ledger (`dc8c973d…`) e estado medido antes/depois — evidência mais forte que uma alegação em prosa. |
| 7 | CONSENT-05 — coluna de consentimento de análise de vídeo deixa de fabricar resposta | ✓ VERIFIED | `supabase/migrations/20260809000003_p47_consent05_analise_video.sql` remove `DEFAULT`/obrigatoriedade, zero back-fill. Mesmo apêndice "Apply em PROD" de `47-03-SUMMARY.md` documenta `column_default: false → null`, `18/18` linhas preservadas. |
| 8 | SC#4 — As 6 fases do M7 sem veredito Nyquist têm `VALIDATION.md` com veredito real | ✓ VERIFIED | Os 6 arquivos existem em `.planning/milestones/v7.0-phases/{36,37,38,39,40,41}-*/​*-VALIDATION.md`, todos com `status: validated` (nenhum em `draft`), `nyquist_compliant: false`, `validated: 2026-08-09`, cada um com gaps nomeados — confirmado por leitura direta dos frontmatters. |

**Score:** 7/8 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/compliance/matriz-retencao.yaml` + `gen-matriz-retencao.cjs` + `.json`/`.generated.ts` | matriz derivada com portão | ✓ VERIFIED | `check:matriz-retencao` exit 0; conteúdo real (8 etapas, `base_legal`/`finalidade` não-vazios) |
| `src/features/transparencia/constants/subprocessadores.ts` | 6 entradas, país obrigatório | ✓ VERIFIED | Lido integralmente; nenhuma sentinela remanescente |
| `src/features/transparencia/components/{SubprocessadoresPage,PrivacidadePublicaPage,MatrizRetencaoPublica,RetencaoIndeterminadaLista,SubprocessadorFicha,RodapePublico}.tsx` | páginas + rodapé | ✓ VERIFIED | Todos existem, importados e usados (grep de import + uso) |
| `supabase/migrations/20260809000001_p47_listar_historico_candidatura.sql` | RPC de leitura do histórico | ✓ VERIFIED (arquivo) / ⚠️ apply em PROD não corroborado | Conteúdo confere com a descrição (junção `usuarios_rh.user_id = ator`, `::text`, `DO` de auto-verificação) |
| `supabase/migrations/20260809000002_p47_adotar_data_deletion_log.sql` | adoção + dual-write | ✓ VERIFIED | `COMMENT`/`PERFORM log_auditoria` confirmados por grep no arquivo |
| `supabase/migrations/20260809000003_p47_consent05_analise_video.sql` | CONSENT-05 | ✓ VERIFIED | Existe, referenciado no smoke |
| `src/__tests__/promessasComExecutor.test.ts` / `destinosDeRedeComFicha.test.ts` | checklist CONSOL-04 | ✓ VERIFIED | Executados: 22/22 passing |
| 6× `VALIDATION.md` do M7 | veredito Nyquist real | ✓ VERIFIED | Frontmatters lidos, `status: validated` nos 6 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `matrizRetencao.generated.ts` | `PrivacidadePublicaPage`/`MatrizRetencaoPublica` | import + render | ✓ WIRED | Confirmado por leitura do artefato e por `check:matriz-retencao` |
| `subprocessadores.ts` (`SUBPROCESSADORES`) | `SubprocessadoresPage` | import + render | ✓ WIRED | Confirmado |
| `RodapePublico` | 5 superfícies públicas | import + JSX | ✓ WIRED | Confirmado por grep direto — `LandingPage`, `VagasPublicasPage`, `VagaDetalhePage`, `SubprocessadoresPage`, `PrivacidadePublicaPage`, e **nenhuma outra** (não aparece em `ManifestoPage` nem em rota interna) |
| `listar_historico_candidatura` (RPC) | `historicoCandidaturaService.listHistorico` | `.rpc(...)` | ✓ WIRED (código) / ⚠️ função no servidor não confirmada em PROD | Ver "Achado crítico" |
| `HISTORICO_ALLOWLIST`/`projetarLinha` | `HistoricoBlock.tsx` (`row.ator_rotulo`) | prop drilling | ✓ WIRED | `grep` confirma `row.ator_rotulo` renderizado, nenhuma referência residual a `row.ator` |
| `promessasComExecutor.test.ts` (entrada nº1) | `20260809000002` COMMENT corrigido | leitura de disco | ✓ WIRED | Teste passou nesta execução |
| `destinosDeRedeComFicha.test.ts` | `subprocessadores.ts` (`SUBPROCESSADORES`) | comparação relacional | ✓ WIRED | Teste passou; achado dos 2 destinos pendentes preservado (não é regressão, é decisão adiada e documentada) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Suíte completa da fase (regressão) | `npm run test:run` | 1892 passed / 187 files | ✓ PASS |
| Baseline de tipos congelada | `npm run -s lint \| grep -c "error TS"` | 97 | ✓ PASS |
| Gerador da matriz de retenção | `npm run -s check:matriz-retencao` | exit 0 | ✓ PASS |
| PII inventory sincronizado | `npm run -s check:pii-inventory-md` | exit 0 | ✓ PASS |
| Recibo de exclusão sincronizado | `npm run -s check:recibo-exclusao` | exit 0 | ✓ PASS |
| Export allowlist sincronizado | `npm run -s check:export-allowlist` | exit 0 | ✓ PASS |
| Detector anti-portão-órfão | `npx vitest run docs/compliance/__tests__/portoesInvocados.test.ts` | 7/7 passed | ✓ PASS |
| Gerador da matriz — portões de mutação | `npx vitest run docs/compliance/__tests__/genMatrizRetencao.test.ts` | 22/22 passed | ✓ PASS |
| Checklist de promessas com executor | `npx vitest run src/__tests__/promessasComExecutor.test.ts` | 13/13 passed | ✓ PASS |
| Destinos de rede × ficha pública | `npx vitest run src/__tests__/destinosDeRedeComFicha.test.ts` | 9/9 passed | ✓ PASS |
| `ci.yml` invoca os 4 `check:*` no job `unit` | `grep` em `.github/workflows/ci.yml` | `check:export-allowlist`, `check:recibo-exclusao`, `check:matriz-retencao`, `check:pii-inventory-md` presentes | ✓ PASS |
| Aplicação em PROD de `listar_historico_candidatura` | — | não executável deste ambiente (sem MCP Supabase) | ? SKIP → human_verification |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|-------------|--------|----------|
| TRANSP-01 | 47-04, 47-08, 47-09 | Página `/subprocessadores`, alcançável | ✓ SATISFIED | Ver truths 1, 3 |
| TRANSP-02 | 47-01, 47-06, 47-08 | Página `/privacidade`, derivada da matriz | ✓ SATISFIED | Ver truths 2, 3 |
| CONSOL-01 | 47-05 | 6 VALIDATION.md com veredito real | ✓ SATISFIED | Ver truth 8 |
| CONSOL-02 | 47-02, 47-07 | Nome do recrutador no Histórico | ⚠️ PARTIAL — código correto, PROD não confirmado | Ver truth 4 / Achado crítico |
| CONSOL-03 | 47-03 | `data_deletion_log` resolvido | ✓ SATISFIED | Ver truth 6 |
| CONSOL-04 | 47-09 | Checklist versionado | ✓ SATISFIED | Ver truth 5 |
| CONSENT-05 | 47-03 | Coluna de vídeo não fabrica resposta | ✓ SATISFIED | Ver truth 7 |

Todas as sete requirement IDs declaradas nas frontmatters dos 9 planos (`TRANSP-01, TRANSP-02, CONSOL-01..04, CONSENT-05`) batem exatamente com as sete listadas no cabeçalho desta verificação e com `REQUIREMENTS.md` (linhas 132-140, 197, 228-233, 256). **Nenhuma requirement órfã.**

### Anti-Patterns Found

Nenhum. Varredura por `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|not yet implemented|coming soon` nos arquivos-chave da fase (componentes, serviço do histórico, as três migrations, os dois novos arquivos de teste de portão) não encontrou ocorrência nenhuma fora de comentário documentado e intencional (ex.: `PAIS_POR_MEDIR` é sentinela declarada, não placeholder esquecido).

### Human Verification Required

#### 1. [CRÍTICO] Confirmar aplicação em PROD de `listar_historico_candidatura`

**Test:** Verificar em PROD (via MCP Supabase ou SQL Editor) se `public.listar_historico_candidatura` existe em `pg_proc`, rodar `supabase/tests/p47_historico_smoke.sql` numa única chamada, e abrir o Histórico do RH de uma candidatura real.
**Expected:** A função existe; o smoke termina com `smoke47h.pass = 6`; a tela mostra um dos quatro rótulos, nunca um erro.
**Why human:** Estado de PROD que este ambiente de verificação não consegue consultar; a alegação existente no repositório (`47-07-SUMMARY.md`) não tem artefato de apoio equivalente ao que existe para as migrations irmãs do mesmo plano-mãe (47-03). Ver "Achado crítico" para o raciocínio completo.

#### 2. Revisão formal do Encarregado (DPO)

**Test:** Obter parecer escrito do Encarregado sobre os quatro itens: os seis países + base legal (cinco são EUA), a formulação do provedor de hospedagem, a qualificação do serviço de CEP, e a copy das duas páginas públicas.
**Expected:** Aprovação registrada ou lista de mudanças de copy.
**Why human:** Julgamento jurídico/regulatório. `WINDOWS.md` itens 26 e 30 confirmam que isso segue aberto; a publicação atual foi decisão do operador, não do Encarregado, e o próprio `47-08-SUMMARY.md` recusa deliberadamente equiparar as duas coisas.

#### 3. Classificar os dois destinos de rede pendentes

**Test:** Decidir se `api.ipify.org` e `www.youtube.com` são operadores contratados (ganham ficha em `subprocessadores.ts`, com país medido na conta/documentação do provedor) ou não (decisão registrada em `destinosDeRedeComFicha.test.ts`).
**Expected:** Nenhum dos dois permanece em `pendente-de-decisao`.
**Why human:** Classificação de fluxo de dados como tratamento por terceiro é decisão de compliance, não de execução de código — e a página pública já está no ar sem cobrir os dois.

### Gaps Summary

Não há gaps de artefato ausente, stub ou código não-testado — todo o código desta fase existe, está ligado corretamente e passa nos 1892 testes da suíte, nos quatro `check:*` gerados e nos dois novos testes de portão (executados nesta verificação, não apenas lidos). O item que impede um veredito `passed` é de **estado de produção não confirmado**: a alegação de que a RPC do Histórico (`listar_historico_candidatura`) está viva em PROD é contradita pelo próprio ledger de defeitos do projeto (`WINDOWS.md` item 24, ainda `open`) e não tem nenhum artefato de apoio equivalente ao que as migrations irmãs receberam. Isso é routed para verificação humana em vez de reprovado diretamente porque a ausência de prova não é, por si só, prova de ausência — mas dado o histórico documentado deste projeto de SUMMARYs que declararam sucesso sobre uma função que na prática levantava erro em toda chamada, a recomendação é tratar esta alegação como **não confirmada** até que alguém rode o smoke contra PROD.

Dois outros itens seguem abertos por desenho da própria fase (não são regressões nem descobertas desta verificação): a revisão formal do Encarregado, e a classificação dos dois destinos de rede sem ficha. Ambos foram deliberadamente registrados como pendências pelo próprio 47-08/47-09, e a fase documenta corretamente que estão fora do alcance de um executor de código — corretamente roteados para decisão humana, e não escondidos.

---

*Verified: 2026-08-12T05:14:33Z*
*Verifier: Claude (gsd-verifier)*
