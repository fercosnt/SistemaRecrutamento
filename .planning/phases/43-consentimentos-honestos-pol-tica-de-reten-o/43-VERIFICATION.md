---
phase: 43-consentimentos-honestos-pol-tica-de-reten-o
verified: 2026-08-02T18:59:05Z
status: gaps_found
score: 2/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "SC#1 — Um novo candidato encontra os consentimentos opcionais DESMARCADOS, e ao marcar o sistema grava qual texto ele leu (versão + hash + timestamp)."
    status: partial
    reason: >-
      A METADE SERVIDOR está provada em PROD por escrita real (consent_text_version=v2-2026-08,
      hash idêntico ao hex pinado, consent_registrado_em preenchida, marketing gravado `false`
      quando `false` foi enviado). A METADE CANDIDATO não existe em produção: nenhum commit da
      Phase 43 foi empurrado para remote algum (`origin/backup/local-state-2026-04` está parado em
      `4bdb0fb` GO-LIVE; `main` em `8306f3e`), então o bundle que a Vercel serve é o pré-43, com
      `.default(true)` vivo. PIOR QUE ISSO: a EF v16 é BREAKING contra esse bundle. Verificado por
      execução — o payload literal que o cliente vivo envia é RECUSADO pelo `autorizacoesSchema`
      da v16 com dois issues (`autorizacao_marketing_vagas` ausente + `unrecognized_keys:
      autorizacao_comunicacao, autorizacao_analise_video`). O caminho de cadastro de candidato
      responde 400 VALIDATION em produção hoje.
    artifacts:
      - path: "src/features/cadastro/components/steps/AutorizacoesStep.tsx"
        issue: "Correto e testado (72 asserções passam), porém inalcançável — não está em nenhum branch remoto"
      - path: "supabase/functions/_shared/schemas.ts"
        issue: "`.strict()` + `autorizacao_marketing_vagas` obrigatório: recusa o payload do cliente VIVO"
    missing:
      - "Publicar o bundle do cliente (o terceiro passo da ordem obrigatória migration → EF → cliente que os próprios planos declaram) — nenhum plano da fase o faz e nenhuma fase posterior o reivindica"
      - "Enquanto isso não acontece: um caminho de reversão ou compatibilidade para o cadastro em PROD, que hoje está quebrado"
  - truth: "SC#2 — O candidato revoga o consentimento de marketing PELO PAINEL e o envio de marketing para de acontecer."
    status: partial
    reason: >-
      A metade "envio bloqueado" está VERIFICADA e é forte: o trigger `BEFORE INSERT`
      `trg_guard_marketing_consentimento` está vivo em PROD e a recusa foi provada por INSERÇÃO
      REAL (`P0003`), fail-closed nos três ramos, com os 6 eventos transacionais vivos ainda
      aceitos (smoke 9/9). A metade "pelo painel" não é alcançável: `/candidato/privacidade`
      existe em código e em teste, não em produção.
    artifacts:
      - path: "src/features/privacidade/components/PrivacidadeCandidatoPage.tsx"
        issue: "Rota, guarda e card de navegação corretos; página não publicada"
    missing:
      - "Publicação do bundle (mesma causa raiz do gap anterior)"
  - truth: "SC#3 — clicar num link de e-mail transacional não é mais rastreado (click tracking desligado no Resend, VERIFICADO NO PROVEDOR)."
    status: failed
    reason: >-
      CONSENT-06 não foi executado. O reporter `scripts/check-resend-dominio.mjs` existe e checa
      exatamente `open_tracking`/`click_tracking`, mas exige `RESEND_API_KEY`, ausente no ambiente
      local. Nenhum artefato do repositório registra um resultado. O critério da própria fase é
      confirmação POSITIVA — "não reportado pela API" não conta. Não há evidência de que o
      tracking esteja desligado, nem de que esteja ligado.
    artifacts:
      - path: "scripts/check-resend-dominio.mjs"
        issue: "Nunca executado nesta fase — sem saída registrada em lugar nenhum"
    missing:
      - "Rodar `RESEND_API_KEY=<chave> npm run check:resend-dominio` e commitar a saída datada como artefato"
deferred:
  - truth: "`autorizacao_analise_video` continua `NOT NULL DEFAULT false` — cada linha nova ainda afirma uma resposta a uma pergunta que deixou de ser feita"
    addressed_in: "Phase 47"
    evidence: "`.planning/todos/pending/43-analise-video-default-false-fabrica-afirmacao.md` com `resolves_phase: 47`; ROADMAP Phase 47 / CONSOL-03 detém o portão destrutivo para o DROP da coluna, e BD-2 já reservava essa decisão para lá"
  - truth: "O guard de marketing é `BEFORE INSERT` e só — um `UPDATE` de `evento` numa linha pendente escaparia dele"
    addressed_in: "Phase 46"
    evidence: "`.planning/todos/pending/43-guard-marketing-so-before-insert.md`; nenhum caminho de código faz esse UPDATE hoje, e a varredura de retry que o exploraria é objeto da purga/PURGA da Phase 46"
---

# Phase 43: Consentimentos Honestos & Política de Retenção — Verification Report

**Phase Goal:** Cada checkbox que o candidato marca passa a ter consequência real, e o prazo de validade do dado existe como configuração alterável sem deploy — tudo isso **sem que nada seja apagado ainda**.
**Verified:** 2026-08-02T18:59:05Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Veredito em uma frase

O banco e o servidor desta fase estão entre os trabalhos mais bem provados do projeto — cinco migrations vivas com fidelidade md5, quatro smokes nos totais exatos, uma escrita real de consentimento com hash idêntico ao pin, e um CR-01 crítico achado, confirmado por execução e fechado. **E mesmo assim o objetivo da fase não está alcançado, porque nenhum candidato consegue marcar checkbox nenhum: a Edge Function v16 é breaking contra o bundle que a produção serve, e o cadastro responde 400.**

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Consentimentos opcionais nascem desmarcados; ao marcar, grava versão + hash + timestamp | ✗ FAILED | Servidor provado em PROD (v2-2026-08, hash = pin, marketing `false` gravado `false`). Cliente correto em código (`CadastroMultiStepForm.tsx:231-233` = `false`, `candidatoSchema` sem `.default()`) e testado (AutorizacoesStep (a) 4/4). **Mas o cliente vivo é o pré-43 e a EF v16 o recusa** — ver Behavioral Spot-Checks, linha 3 |
| 2 | Dois consentimentos distintos; revogação de marketing pelo painel para o envio, provado por envio real bloqueado | ✗ FAILED (metade) | Guard VERIFICADO: `pode_receber_marketing()` + trigger `BEFORE INSERT` vivos, recusa por INSERÇÃO REAL (`P0003`), fail-closed em 3 ramos, 6 eventos vivos preservados (smoke 9/9). Painel não publicado |
| 3 | `autorizacao_analise_video` deixou de ser promessa órfã **e** click tracking desligado no Resend, verificado no provedor | ✗ FAILED | Metade 1 substancialmente OK (chave nunca emitida — teste Deno 5/5; `.strict()` recusa — teste 4/4; coluna preservada com COMMENT), com a ressalva do `DEFAULT false` (deferida à Phase 47). **Metade 2 sem nenhuma evidência** — CONSENT-06 nunca executado |
| 4 | Admin altera a janela de retenção sem deploy; seed de 2 anos documentado como teto consentido; veredito RETEN-06 registrado ANTES da estrutura nova | ✓ VERIFIED | `config_retencao_etapa` viva, seed 8/8 em 24 meses com o enquadramento BD-1 nos `COMMENT` do banco; `salvar_janela_retencao` recusa não-admin **e o chamador sem claim** (42501) e escreve auditoria na mesma transação (smoke 10/10). `docs/compliance/reten06-veredito-retain-until.md` commitado na wave 1 (43-02), antes da migration da matriz (43-04, wave 2) — a ordem que o requirement exige. ⚠ Ver Warning W-1 |
| 5 | Prévia read-only responde "estes N seriam purgados" sem executar nada; `autorizacao_retencao_curriculo` aparece por candidato como base legal citada | ✓ VERIFIED (metade 1) / ⚠ metade 2 inalcançável | `previa_retencao()` + `previa_retencao_total()` vivas, agregadas por assinatura, com `calculada_em := now()` computado pela mesma função; `candidaturas_alem_da_janela()` (a única que enumera) com `REVOKE ALL` e sem grant de volta; `md5(prosrc)` do predicado bateu o pin de primeira (smoke 9/9). `GuardaCurriculoBloco` correto e testado, porém não publicado |

**Score:** 2/5 truths verified (0 present, behavior-unverified)

### O achado que domina esta verificação

**O bundle do cliente nunca foi publicado — e isso não é uma pendência neutra, é uma regressão viva em produção.**

Medido, não inferido:

| Fato | Medição |
|---|---|
| `origin/backup/local-state-2026-04` | `4bdb0fb` — o commit GO-LIVE, anterior às Phases 42 e 43 |
| `origin/main` / `main` | `8306f3e` — idem |
| Commits locais fora de qualquer remote | **136** |
| Hospedagem do frontend | Vercel Pro (`PROJECT.md:190`) — deploya de um remote git |
| Conclusão | O bundle servido hoje **não pode** conter código da Phase 43 |

E o bundle vivo não é apenas velho, é **incompatível**. Executei o payload literal que o cliente de `main` monta contra o `autorizacoesSchema` do repositório (byte-idêntico ao da EF v16, conferido 7/7 no checkpoint):

```
ACCEPTED? false
  invalid_type       · autorizacao_marketing_vagas  · received "undefined"
  unrecognized_keys  · autorizacao_comunicacao, autorizacao_analise_video
```

Isso mapeia, dentro da EF, para `error_code: 'VALIDATION'` / HTTP 400 **antes de qualquer insert**. Todo cadastro de candidato na produção viva falha.

O 43-07-SUMMARY nomeia esse risco com honestidade exemplar (§"O que este checkpoint NÃO entrega"). O problema é que ninguém o fechou: nenhum dos 9 planos publica o cliente, e nenhuma fase 44–47 do ROADMAP reivindica esse passo. A ordem que os planos declaram **obrigatória** — migration → EF → cliente — foi executada até o passo 2 e parada ali. Parar no meio de uma sequência declarada obrigatória não é uma pausa neutra.

### Sobre o critério "código + banco, não deploy" — resposta direta

**Não o aceito nesta fase, e a razão é específica.** Num trabalho aditivo, esse critério deixaria em aberto apenas a *alcançabilidade* — chato, não perigoso. Aqui a mudança de servidor é **breaking contra o cliente vivo**, e o próprio plano previu isso ao declarar a ordem de três passos. Sob esse critério, os `[x]` de CONSENT-04, RETEN-02 e RETEN-03 em `REQUIREMENTS.md` afirmam superfícies que ninguém consegue abrir, e o `In Progress` de CONSENT-01/02/03/05 — que três executores recusaram fechar por princípio — acaba sendo a marcação mais honesta do arquivo.

O que o critério deixa por provar, listado: que a tela de revogação escreve own-row sob a policy viva; que a tela do admin salva pela RPC e vê a auditoria aparecer; que o passo de autorizações renderiza os textos com o layout aprovado num aparelho real; e que o cadastro conclui fim a fim com a EF v16.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `supabase/functions/_shared/consent-text.json` | Fonte única do texto | ✓ VERIFIED | 3 consentimentos, sem vídeo, transacional fora do hash; lido pelas duas runtimes (`AutorizacoesStep.tsx:50` importa o mesmo arquivo) |
| `supabase/functions/_shared/consent-hash.ts` | SHA-256 só no servidor | ✓ VERIFIED | 7/7 testes Deno, incluindo o pin do hex vivo |
| `supabase/functions/_shared/autorizacoes-registro.ts` | Payload sem coalescência | ✓ VERIFIED | Zero `??`; 9/9 testes Deno; chave de vídeo nunca emitida |
| `supabase/functions/_shared/schemas.ts` | `.strict()`, sem defaults | ✓ VERIFIED | Recusa `autorizacao_analise_video`; exige as duas flags opcionais |
| `supabase/migrations/20260801000001…` | 4 colunas de prova | ✓ VERIFIED | Viva, md5 `b577295…`, smoke 6/6 |
| `supabase/migrations/20260801000002…` | Matriz + 2 RPCs | ✓ VERIFIED | Viva, md5 `8cb402b…`, seed 8/8 @24, smoke 10/10 |
| `supabase/migrations/20260801000003…` | Guard de marketing | ✓ VERIFIED | Viva, md5 `b73cd76…`, smoke 9/9 |
| `supabase/migrations/20260801000004…` | Predicado + prévia | ✓ VERIFIED | Viva, md5 `ce9d8d5…`, smoke 9/9, `md5(prosrc)` do predicado bateu o pin |
| `supabase/migrations/20260802000001…` | Fix do CR-01 | ✓ VERIFIED | `REVOKE UPDATE` + `GRANT UPDATE (autorizacao_marketing_vagas, updated_at)`, com asserções que provam que a revogação do CONSENT-04 **não** morreu |
| `docs/compliance/reten06-veredito-retain-until.md` | Veredito datado antes da estrutura | ✓ VERIFIED | 153 linhas, wave 1 |
| `docs/compliance/marketing-consentimento-escopo.md` | Escopo honesto do SC#2 | ✓ VERIFIED | §6 corrigida pós-apply (WR-01 fechada); nomeia as duas fronteiras abertas |
| `src/__tests__/copyPortoesLgpd.test.ts` | Portão de copy escopo duplo | ✓ VERIFIED | 13 testes, com auto-consistência |
| `src/features/cadastro/components/steps/AutorizacoesStep.tsx` | Passo reescrito | ⚠ ORPHANED | Correto e testado; nunca publicado |
| `src/features/privacidade/**` | Superfície de revogação | ⚠ ORPHANED | Serviço com allowlist nomeada, hooks, 3 componentes, testes; nunca publicada |
| `src/features/admin/retencao/**` | Matriz editável + prévia | ⚠ ORPHANED | 4 RPCs como única superfície de dados; nunca publicada |
| `database.types.ts` | Regenerado pós-apply | ✓ VERIFIED | Contém as 4 colunas novas, `config_retencao_etapa` e as 5 funções |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `consent-text.json` | `public.autorizacoes` | `calcularHashConsentimento` → `montarRegistroAutorizacoes` → INSERT | ✓ WIRED | Cadeia completa em `cadastrar-candidato/index.ts:63-64, 347-361`; provada por escrita real em PROD |
| `consent-text.json` | `AutorizacoesStep` | `import consentText from '…/consent-text.json'` | ✓ WIRED | `AutorizacoesStep.tsx:50, 67, 78` — uma fonte, dois leitores |
| `CONSENT_TEXT_VERSION` (cliente) | idem (servidor) | teste de paridade | ✓ WIRED | Ambos `v2-2026-08` |
| `autorizacoes.autorizacao_marketing_vagas` | `notificacoes_enviadas` | `pode_receber_marketing()` → trigger `BEFORE INSERT` | ✓ WIRED | Recusa provada por inserção real |
| `config_retencao_etapa` | `previa_retencao()` | `candidaturas_alem_da_janela()` (predicado único) | ✓ WIRED | Os dois wrappers CHAMAM o predicado; asserido no smoke |
| `salvar_janela_retencao` | `log_auditoria` | `PERFORM` no mesmo corpo | ✓ WIRED | Mesma transação, asserido no smoke |
| `/candidato/privacidade` | `RoleGuard` + card em `MeuPerfilCandidatoPage` | rota + navegação | ✓ WIRED em código / ✗ inalcançável | `routes.tsx:205`, `MeuPerfilCandidatoPage.tsx:417` |
| `/admin/retencao` | `RHSidebar` (3 sítios) | item + rota + `getActivePageFromPath` | ✓ WIRED em código / ✗ inalcançável | `RHSidebar.tsx:106, 165, 183` — a linha vem ANTES do `/admin` genérico, como exigido |
| **Cliente vivo (`main`)** | **EF `cadastrar-candidato` v16** | POST `/cadastrar-candidato` | ✗ **NOT_WIRED — QUEBRADO** | Payload recusado; 400 VALIDATION antes de qualquer insert |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `PrivacidadeCandidatoPage` | `autorizacoes` | `usePrivacidade` → `.from('autorizacoes').select(AUTORIZACOES_ALLOWLIST)` | Sim (17 linhas vivas) | ✓ FLOWING (em código) |
| `GuardaCurriculoBloco` | `autorizacao_retencao_curriculo`, `temCurriculo` | `.from('candidaturas').select(CANDIDATURA_CURRICULO_ALLOWLIST)` | Sim | ✓ FLOWING (em código) |
| `MatrizRetencaoTable` | `linhas` | `rpc('listar_matriz_retencao')` | Sim — 8 linhas vivas | ✓ FLOWING |
| `PreviaRetencaoBloco` | `linhas`, `total` | `rpc('previa_retencao')` + `rpc('previa_retencao_total')` | **Zero hoje, e zero é a resposta certa** | ✓ FLOWING (estado zero explícito, com carimbo) |
| `AutorizacoesStep` | `AUTORIZACOES`, `TRANSACIONAL` | `consent-text.json` | Sim | ✓ FLOWING |

Nota sobre a prévia: ela devolve zero e devolverá por meses (janela de 24 meses num sistema mais novo que isso). O componente trata zero como **resposta** e não como vazio (`isEmpty` do `AsyncState` deliberadamente não usado), e carimba a data mesmo no zero. O estado populado é provado só por teste — aceitável, porque o estado populado é impossível de produzir com dado real hoje sem encurtar a janela, o que seria fabricar a condição.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Suíte inteira do repositório | `npm run test:run` | **154 arquivos · 1417 testes · 0 falhas** | ✓ PASS |
| Baseline `tsc` congelada em 97 | `npm run lint` | **97 erros** — idêntico à baseline | ✓ PASS |
| Cadeia de hash + payload (corpus Deno, fora do Vitest) | `deno test … consent-hash.test.ts autorizacoes-registro.test.ts` | **16 passed / 0 failed** — inclui o pin do hex vivo, `false` sobrevive ao parse, `.strict()` recusa vídeo | ✓ PASS |
| **Payload do cliente VIVO contra o schema da EF v16** | `deno run` do `autorizacoesSchema` sobre o objeto que `main` monta | **RECUSADO** — `autorizacao_marketing_vagas` ausente + 2 chaves não reconhecidas | ✗ **FAIL — regressão de produção** |
| CONSENT-06 — tracking do Resend | `RESEND_API_KEY=… npm run check:resend-dominio` | não executável: chave ausente no ambiente | ? SKIP → gap |

### Probe Execution

Não há probes `scripts/*/tests/probe-*.sh` neste repositório. O equivalente da fase são os quatro smokes SQL, que exigem MCP do Supabase — indisponível para subagentes (restrição de ambiente registrada no ROADMAP). Seus resultados (6/6, 10/10, 9/9, 9/9) foram tomados do estado de PROD medido e independentemente confirmado, e são corroborados aqui por evidência que **não** depende do MCP: `database.types.ts` contém as 4 colunas, `config_retencao_etapa` e as 5 funções — e esse arquivo é gerado a partir do banco vivo, não escrito à mão.

### Requirements Coverage

Todos os 11 IDs do ROADMAP aparecem no frontmatter de algum plano. **Zero requirements órfãos.** `RETEN-05` está corretamente fora (mapeado à Phase 46).

| Requirement | Source Plan | Status | Evidence |
|---|---|---|---|
| CONSENT-01 | 43-01, 43-03, 43-07 | ⚠ PARCIAL | Servidor provado por escrita real (`false` → `false`); cliente `false` em 6 sítios e testado. Inalcançável em PROD. `[ ]` em REQUIREMENTS.md — correto |
| CONSENT-02 | 43-01, 43-03, 43-07 | ⚠ PARCIAL | Versão + hash + timestamp gravados e conferidos em PROD; texto renderizado byte-a-byte do mesmo arquivo (3 testes). Inalcançável |
| CONSENT-03 | 43-01, 43-05, 43-07 | ✓ SATISFIED | Coluna nova viva; `autorizacao_comunicacao` fixada em `true` como fato do sistema (Art. 7º V) e fora do contrato de entrada; guard vivo |
| CONSENT-04 | 43-05, 43-07, 43-08 | ✗ BLOCKED | A metade do envio está provada por recusa real. A metade "pelo painel" não é alcançável. **O `[x]` em REQUIREMENTS.md é prematuro** |
| CONSENT-05 | 43-01, 43-03, 43-07 | ⚠ PARCIAL | Coleta parou no código (provado). Mas a coluna é `NOT NULL DEFAULT false`: o banco continua respondendo pelo código que se absteve. Diferido à Phase 47 |
| CONSENT-06 | 43-07 | ✗ BLOCKED | Nunca executado. Sem confirmação positiva. `[ ] Pending` — correto |
| RETEN-01 | 43-04, 43-07, 43-09 | ✓ SATISFIED | Tabela + RPCs vivas, smoke 10/10 |
| RETEN-02 | 43-04, 43-07, 43-09 | ✓ SATISFIED (com ressalva) | Seed 8/8 @24 com o enquadramento BD-1 no `COMMENT` do banco; teto server-enforced em dois lugares; auditoria atômica. **A parentética "alteração PELA TELA" em REQUIREMENTS.md sobreafirma** |
| RETEN-03 | 43-08 | ✗ BLOCKED | `GuardaCurriculoBloco` lê a flag e cita a base legal — inalcançável. **`[x]` prematuro** |
| RETEN-04 | 43-06, 43-07, 43-09 | ✓ SATISFIED | Prévia agregada viva, enumerador revogado, carimbo no servidor, gate de md5 do predicado |
| RETEN-06 | 43-02 | ✓ SATISFIED | Veredito datado, na wave anterior à da estrutura nova |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | `TBD` / `FIXME` / `XXX` em arquivos da fase | — | **Nenhum.** As três ocorrências de `XXX` são máscaras de CPF/CEP em arquivos não tocados pela fase |
| `REQUIREMENTS.md` | 55, 74, 182 | `[x]` afirmando superfícies inalcançáveis (CONSENT-04, RETEN-02 "pela tela", RETEN-03) | ⚠️ Warning | É a mesma classe de defeito que a fase existe para eliminar, um diretório acima — e o bloco de nota em `:58-66` prova que a equipe sabe distinguir |
| `privacidadeService.ts` | 190 | `updated_at` carimbado pelo relógio do cliente | ℹ️ Info | WR-07, registrado como todo com a ordem correta dos dois passos. A tela apresenta essa data como fato |

O code review (`43-REVIEW.md`: 1 Critical, 11 Warnings, 4 Info) foi conferido item a item contra o código atual. CR-01 fechado por migration viva. WR-01, WR-06 e WR-10 fechados no código (verificados: §6 do doc de compliance reescrita; `.eq('candidato_id', …)` presente; `ESPERA_HIDRATACAO_MS` com desfecho limitado). WR-04, WR-07 e o achado do `DEFAULT false` registrados como todos com `resolves_phase`. Nenhum warning ficou sem fixação nem sem registro.

### Warnings

**W-1 — SC#4 passa pela substância, não pela tela.** "Um administrador altera a janela sem deploy" está provado no servidor: a RPC aceita a claim de admin, recusa recrutador **e recusa o chamador sem claim nenhuma** com 42501 (a asserção que fecha o defeito sistemático da 42-06). Mas hoje só um admin com acesso SQL exercita isso; a tela existe e não abre. Contei o SC como VERIFIED porque o mecanismo — que é o que "sem deploy" significa — está vivo e provado, e registro aqui que a superfície humana está no mesmo gap de publicação dos demais.

**W-2 — Os 4 candidatos sem linha de consentimento continuam sem linha.** Correto e deliberado (BD-4: back-fill seria fabricar prova). Registrado para que ninguém "corrija" depois por engano.

**W-3 — A revogação depende de uma policy que não existe em arquivo nenhum.** `Candidatos podem atualizar suas autorizacoes` vive em PROD e em nenhuma migration (4ª instância do drift, com todo aberto). O serviço já se defende com `.eq('candidato_id', …)`, e o CR-01 fix estreitou o privilégio de coluna — mas um `db reset` ainda perderia a policy em silêncio.

### Human Verification Required

Estes só ficam verificáveis depois que o bundle for publicado. Não são substitutos do gap — são o que sobra depois de fechá-lo.

#### 1. Cadastro fim a fim contra a EF v16
**Test:** Publicar o bundle e completar um cadastro real no site vivo.
**Expected:** Conclui com 200; a linha em `autorizacoes` traz `consent_text_version=v2-2026-08`, o hash pinado, `consent_registrado_em` preenchida, e `autorizacao_marketing_vagas` igual ao que a pessoa deixou marcado.
**Why human:** Exige o navegador real contra o servidor real; nenhum grep vê o bundle servido.

#### 2. Revogação de marketing pelo painel
**Test:** Abrir `/candidato/privacidade` como candidato e desligar a divulgação de vagas.
**Expected:** Sem diálogo, sem pedido de motivo, sem contra-oferta; o switch fica desabilitado em voo e reflete o estado devolvido pelo servidor; a linha muda para `false`.
**Why human:** Transição de estado sobre uma escrita own-row real sob a policy viva.

#### 3. Alteração da janela pela tela do admin
**Test:** Abrir `/admin/retencao` como administrador e mudar um estado de 24 para 12 meses.
**Expected:** Confirmação aninhada nomeia antes e depois; a matriz reflete a mudança; `log_auditoria` ganha exatamente uma linha; nenhuma linha de candidato é tocada.
**Why human:** Só um admin real produz a claim; o efeito de auditoria é observável no banco após a ação humana.

#### 4. CONSENT-06 — tracking do Resend
**Test:** `RESEND_API_KEY=<chave> npm run check:resend-dominio`.
**Expected:** `open_tracking=false` **e** `click_tracking=false`, confirmados positivamente e commitados como artefato datado.
**Why human:** A chave só existe no Vault/dashboard; é setting de provedor, não de código.

### Gaps Summary

A fase entregou um trabalho de servidor e de banco excepcionalmente bem provado. Cinco migrations vivas com fidelidade byte-a-byte, quatro smokes nos totais exatos com asserções negativas reais, um consentimento gravado com hash idêntico ao pin por escrita de verdade, um guard que recusa marketing por inserção real e não por leitura de flag, e um defeito crítico de privilégio de coluna achado por review, confirmado por ataque executado e fechado por migration. O `NULL = não autorizado` do BD-5 e a ausência preservada dos 4 candidatos sem linha são exatamente o tipo de rigor que o objetivo pedia.

O objetivo, ainda assim, não está alcançado — e por um motivo só, que se ramifica em três dos cinco critérios. **O terceiro passo da ordem que os próprios planos chamaram de obrigatória nunca foi dado.** As migrations foram, a Edge Function foi, o cliente não. E como a EF v16 é breaking contra o cliente vivo, o resultado não é "as telas novas ainda não apareceram": é que o funil de cadastro de candidato responde 400 em produção agora. Confirmei isso por execução, não por leitura — o payload que o cliente vivo monta é recusado pelo schema que a EF vivi executa.

O segundo gap é menor em superfície e igualmente inegociável no critério: **CONSENT-06 não tem nenhuma evidência.** Não há confirmação positiva de que o tracking do Resend esteja desligado, e a fase estabeleceu — corretamente — que "não reportado pela API" não conta. O SC#3 tem uma metade vazia.

Uma observação final, dita com o mesmo padrão que a fase aplicou a si mesma: `REQUIREMENTS.md` traz `[x]` em CONSENT-04, RETEN-02 ("pela tela") e RETEN-03, três afirmações sobre superfícies que ninguém consegue abrir. O bloco de nota em `:58-66`, onde três executores recusaram marcar `[x]` prematuro, mostra que a equipe sabe fazer essa distinção. Vale aplicá-la aos três que escaparam.

---

_Verified: 2026-08-02T18:59:05Z_
_Verifier: Claude (gsd-verifier)_
