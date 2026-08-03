---
phase: 43-consentimentos-honestos-pol-tica-de-reten-o
verified: 2026-08-03T04:18:24Z
status: human_needed
score: 4/5 must-haves verified
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 2/5
  previous_verified: 2026-08-02T18:59:05Z
  gaps_closed:
    - "SC#1 — o cliente foi publicado (origin/main = 581abe1) e o cadastro foi provado ponta a ponta por registro REAL em navegador; a incompatibilidade cliente↔EF v16 que eu media como 400 VALIDATION deixou de existir, reconferida POR EXECUÇÃO nesta passagem"
    - "SC#2 — a revogação foi exercitada por AÇÃO REAL de usuário em /candidato/privacidade, e o GRANT de coluna do CR-01 segurou: exatamente uma coluna escrita, as quatro colunas de prova intactas"
    - "SC#3 — CONSENT-06 executado com confirmação POSITIVA do provedor (open_tracking=false, click_tracking=false); verifiquei no fonte do reporter que o marcador `✓` só é emitido para um `false` explícito da API, então a saída não pode ter vindo de flag ausente"
  gaps_remaining: []
  regressions: []
  downgrades:
    - truth: "SC#4 — Um administrador altera a janela de retenção sem deploy"
      from: "VERIFIED (com W-1)"
      to: "PRESENT_BEHAVIOR_UNVERIFIED"
      reason: >-
        Não é regressão — é padrão aplicado com consistência mais um fato NOVO. Na passagem
        anterior creditei "o mecanismo é o que 'sem deploy' significa" porque a tela era
        inalcançável e o mecanismo era tudo o que havia. Agora que SC#1 e SC#2 foram levados
        ao padrão VIVO — e o atingiram — manter um padrão mais fraco para SC#4 seria
        inconsistência. E esta passagem mediu algo que a anterior não tinha: `retencaoService`,
        `useSalvarJanela`, `usePreviaRetencao` e `useMatrizRetencao` não têm NENHUM teste; os
        17 casos do `EditarJanelaDialog` mockam a mutação. O elo cliente→RPC é o único da
        cadeia sem teste E sem execução viva.
behavior_unverified_items:
  - truth: "SC#4 — Um administrador altera a janela de retenção de um estado da candidatura sem deploy"
    test: "Abrir /admin/retencao como administrador real e mudar um estado de 24 para 12 meses, confirmando no diálogo aninhado"
    expected: >-
      A matriz reflete a mudança sem qualquer deploy; `log_auditoria` ganha EXATAMENTE uma
      linha, na mesma transação; nenhuma linha de candidatura é tocada; um valor acima de 24
      é recusado pelo servidor (22023) e não apenas pelo formulário.
    why_human: >-
      Transição de estado com invariante de atomicidade e uma asserção negativa (o que NÃO
      foi tocado). O `smoke 10/10` prova a transição na camada da RPC contra PROD, e os 17
      casos do diálogo provam o formulário — mas o hop entre os dois (`useSalvarJanela` →
      `retencaoService.salvarJanela` → `rpc('salvar_janela_retencao')`) não tem teste algum e
      nunca foi executado por ninguém. Só uma claim de admin real produz a autorização, e o
      efeito de auditoria só é observável no banco depois da ação humana.
human_verification:
  - test: "Abrir /admin/retencao como administrador real e mudar um estado de 24 para 12 meses"
    expected: "Matriz atualizada sem deploy · exatamente 1 linha nova em log_auditoria · zero linhas de candidatura tocadas · teto de 24 recusado pelo servidor, não só pelo formulário"
    why_human: "A tela NUNCA foi aberta por ninguém. É o único SC cuja superfície humana não tem nem execução viva nem teste no elo cliente→RPC."
  - test: "Ver a prévia de retenção no estado POPULADO"
    expected: "As linhas por estado contam CANDIDATURAS e o total conta CANDIDATOS, com o carimbo `calculada_em` do servidor"
    why_human: >-
      Impossível hoje e por meses: a janela é de 24 meses num sistema mais novo que isso, e a
      prévia devolve zero — que é a resposta CERTA. Encurtar a janela para produzir a condição
      seria fabricar a evidência. Provado só por teste, deliberadamente.
  - test: "Ver o bloco de guarda do currículo no ramo AUTORIZADO, em /candidato/privacidade"
    expected: "A linha «Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}.» aparece na tela"
    why_human: >-
      O operador abriu a página ao vivo, mas com `autorizacao_retencao_curriculo = false` — o
      ramo que satisfaz o RETEN-03 renderiza SÓ quando `autorizado === true`. O que foi visto
      ao vivo foi o ramo NÃO-autorizado. O ramo autorizado passa em teste e nunca apareceu numa
      tela real.
  - test: "Correções de artefato (não é teste de produto — é decisão do operador)"
    expected: >-
      (1) 43-07-SUMMARY §«O que este checkpoint NÃO entrega» afirma «O bundle do cliente nao foi
      publicado» — hoje FALSO; precisa de bloco de correção datado, com o corpo original
      preservado (o padrão que a própria P37 estabeleceu). (2) REQUIREMENTS.md está desatualizado
      no sentido INVERSO ao que apontei antes: CONSENT-01/02/03 seguem `[ ]`/«In Progress» e
      CONSENT-06 segue `[ ]`/«Pending», todos agora provados. (3) A publicação do cliente —
      passo 3 da ordem que os planos chamam de OBRIGATÓRIA — continua sem dono em plano, fase
      ou todo algum.
    why_human: "São decisões de registro do milestone, não comportamento de produto."
deferred:
  - truth: "`autorizacao_analise_video` continua `NOT NULL DEFAULT false` — cada linha nova ainda afirma resposta a uma pergunta que deixou de ser feita"
    addressed_in: "Phase 47"
    evidence: "`.planning/todos/pending/43-analise-video-default-false-fabrica-afirmacao.md`, `resolves_phase: 47`; ROADMAP Phase 47 / CONSOL-03 detém o portão destrutivo do DROP"
  - truth: "O guard de marketing é `BEFORE INSERT` e só — um `UPDATE` de `evento` numa linha pendente escaparia dele"
    addressed_in: "Phase 46"
    evidence: "`.planning/todos/pending/43-guard-marketing-so-before-insert.md`, `resolves_phase: 46`; nenhum caminho de código faz esse UPDATE hoje"
  - truth: "Os smokes com baseline congelada viram RED no primeiro cadastro real — e acusam a coisa errada"
    addressed_in: "Phase 44"
    evidence: >-
      `.planning/todos/pending/43-smokes-com-baseline-congelada-viram-red.md`, `resolves_phase: 44`.
      ⚠ A falha PREVISTA CHEGOU — ver «A falha prevista chegou» no corpo. Não conta como gap
      (está rastreada), mas os verdes 6/6 daquele smoke passaram a ser HISTÓRICOS, não correntes.
  - truth: "`updated_at` do consentimento é carimbado pelo relógio do navegador, e a tela apresenta essa data como fato"
    addressed_in: "Phase 46"
    evidence: "`.planning/todos/pending/43-updated-at-do-consentimento-vem-do-cliente.md`, `resolves_phase: 46`"
---

# Phase 43: Consentimentos Honestos & Política de Retenção — Verification Report (2ª passagem)

**Phase Goal:** Cada checkbox que o candidato marca passa a ter consequência real, e o prazo de validade do dado existe como configuração alterável sem deploy — tudo isso **sem que nada seja apagado ainda**.
**Verified:** 2026-08-03T04:18:24Z
**Status:** human_needed — 4/5, com 1 truth presente-porém-não-exercitado
**Re-verification:** Sim — depois do fechamento do bloqueador de 2026-08-03

---

## Veredito em uma frase

Os três gaps que eu abri estão **genuinamente fechados**, e dois deles pelo padrão mais forte que existe neste projeto — uma pessoa real, num navegador real, produzindo uma linha real cujos valores eu consigo amarrar a um hash pinado independentemente. **O que resta não é um resíduo do que eu apontei: é uma tela que ninguém nunca abriu**, e o elo que a liga ao mecanismo provado é o único da fase sem teste e sem execução.

---

## Sobre o critério que eu rejeitei — resposta direta

Na 1ª passagem eu rejeitei o critério "código + banco, não deploy" e escrevi que os `[x]` de **CONSENT-04**, **RETEN-02** e **RETEN-03** afirmavam superfícies que ninguém conseguia abrir.

**A objeção mudou materialmente, e eu a retiro em dois dos três casos.**

| Marca | Antes (1ª passagem) | Agora | Julgamento |
|---|---|---|---|
| **CONSENT-04** `[x]` | Prematura — o painel não existia no navegador | A revogação foi feita **ao vivo**, por ação real de usuário, na tela | **Aceito.** Este `[x]` está ganho, e ganho pelo padrão alto |
| **RETEN-03** `[x]` | Prematura — `GuardaCurriculoBloco` inalcançável | A página foi aberta e o bloco está no seu `<section>` incondicionalmente | **Aceito, com uma ressalva nomeada abaixo** |
| **RETEN-02** `[x]` | A parentética "alteração PELA TELA" sobreafirmava | A tela existe, está publicada e alcançável — mas **ninguém a abriu** | **Aceito para o requirement; a parentética da linha 181 continua sobreafirmando** |

**O que segue sem exercício, nomeado sem eufemismo:**

1. **`/admin/retencao` nunca foi aberta por pessoa alguma.** RETEN-01/02/04 apoiam-se numa tela sem nenhuma evidência viva.
2. **O elo cliente→RPC dessa tela não tem teste algum.** Medido nesta passagem: `retencaoService.ts`, `useSalvarJanela.ts`, `usePreviaRetencao.ts` e `useMatrizRetencao.ts` **não têm arquivo de teste** — o diretório `src/features/admin/retencao/` só tem `components/__tests__/`. Os 17 casos do `EditarJanelaDialog` mockam a mutação. Então entre "a pessoa clica" e "a RPC provada por smoke executa" há um trecho que nenhuma asserção e nenhuma execução tocaram.
3. **A prévia devolve ZERO e devolverá por meses** (janela de 24 meses num sistema mais novo). O estado populado é provado só por teste — e isso é **correto**: produzi-lo com dado real exigiria encurtar a janela, o que seria fabricar a condição.
4. **O ramo AUTORIZADO da guarda do currículo nunca apareceu numa tela.** A linha *"Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}."* — que **é** o RETEN-03 — renderiza só sob `autorizado === true` (`GuardaCurriculoBloco.tsx:114`). A conta de teste ao vivo tinha `autorizacao_retencao_curriculo = false`. O operador viu o ramo NÃO-autorizado. O ramo que satisfaz o requirement passa em teste e nunca foi visto.

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Consentimentos opcionais nascem desmarcados; ao marcar, grava versão + hash + timestamp | ✓ **VERIFIED** | **Cadastro REAL em navegador (aba anônima, `fernando@fotona.com.br`, 2026-08-03)**: `consent_text_version = v2-2026-08` · `consent_text_hash` idêntico ao hex pinado em `consent-hash.test.ts` · `consent_registrado_em` preenchida · `autorizacao_marketing_vagas = false` **e** `autorizacao_retencao_curriculo = false`, batendo com as duas caixas deixadas desmarcadas. Print confirmou os invariantes da UI-SPEC. Cliente publicado (`origin/main = 581abe1`) e compatibilidade **reconferida por execução** nesta passagem |
| 2 | Dois consentimentos distintos; revogação de marketing pelo painel para o envio, provado por envio real bloqueado | ✓ **VERIFIED** | Metade "envio bloqueado": trigger `BEFORE INSERT` vivo, recusa provada por **INSERÇÃO REAL** (`P0003`), fail-closed em 3 ramos, 6 eventos transacionais vivos preservados (smoke 9/9). Metade "pelo painel": **revogação REAL** em `/candidato/privacidade` — `autorizacao_marketing_vagas = false`, `updated_at` moveu, e `consent_text_hash` / `consent_text_version` / `consent_registrado_em` / `autorizacao_uso_dados` **intactos**. Caminho até a tela restituído em `581abe1` |
| 3 | `autorizacao_analise_video` deixou de ser promessa órfã **e** click tracking desligado no Resend, verificado no provedor | ✓ **VERIFIED** | Metade 1: chave nunca emitida + `.strict()` recusa (Deno **16/16**, incl. o pin do hex), coluna preservada com `COMMENT`, e o print do cadastro ao vivo sem menção alguma a vídeo. Metade 2: **CONSENT-06 executado** — `open_tracking: false`, `click_tracking: false`, domínio `rh.beautysmile.com.br` verificado em `sa-east-1`, run read-only. Ressalva `DEFAULT false` diferida à Phase 47, rastreada |
| 4 | Admin altera a janela de retenção sem deploy; seed de 2 anos documentado como teto consentido; veredito RETEN-06 registrado ANTES da estrutura nova | ⚠️ **PRESENT_BEHAVIOR_UNVERIFIED** | **2 de 3 cláusulas VERIFIED**: veredito `reten06-veredito-retain-until.md` na wave 1 (43-02), antes da migration da matriz (43-04, wave 2) — a ordem que o requirement exige; seed 8/8 @24 com o enquadramento BD-1 nos `COMMENT` do banco e no texto de ajuda do diálogo. **Cláusula 1 não exercitada**: a RPC é provada por smoke 10/10 (recusa não-admin **e** chamador sem claim, 42501; auditoria na mesma transação), a tela existe, está publicada e alcançável — mas **nunca foi aberta**, e o hop cliente→RPC não tem teste algum |
| 5 | Prévia read-only responde "estes N seriam purgados" sem executar nada; `autorizacao_retencao_curriculo` aparece por candidato como base legal citada | ✓ **VERIFIED** | Read-only provado **estruturalmente E por privilégio**: `candidaturas_alem_da_janela()` (a única que enumera) com `REVOKE ALL` e sem grant de volta — a proibição não está confiada à camada de apresentação; `md5(prosrc)` do predicado bateu o pin; `calculada_em := now()` computado pela própria função; asserção negativa estrutural (nenhum `<button>`/`<a>` descendente, nos dois estados). `GuardaCurriculoBloco` no `<section>` da página que o operador abriu, com os 3 casos em teste. ⚠ Ver as duas ressalvas de "nunca visto ao vivo" acima |

**Score:** 4/5 truths verified · **1 presente, comportamento não exercitado** · 0 falhados

---

## O que mudou desde a 1ª passagem — medido, não lido

### 1. O cliente foi publicado, e a incompatibilidade acabou

| Fato | 1ª passagem (2026-08-02) | Agora (2026-08-03) |
|---|---|---|
| `origin/main` | `8306f3e` (pré-43) | **`581abe1`** — contém a fase 43 inteira |
| `AutorizacoesStep.tsx` em remote | ausente | **presente** (`git cat-file -e origin/main:…` → ok) |
| `src/features/privacidade/**` em remote | ausente | **11 arquivos presentes** |
| `src/features/admin/retencao/**` em remote | ausente | **13 arquivos presentes** |
| Defaults do cliente publicado | `.default(true)` vivo | `autorizacao_uso_dados/marketing_vagas/retencao_curriculo: false` (`CadastroMultiStepForm.tsx:231-233`) |
| Payload do cliente × `autorizacoesSchema` da EF v16 | **RECUSADO** (2 issues) | **ACEITO** |

A última linha é a que importa, e eu a reproduzi **por execução**, não por leitura. Rodei o `autorizacoesSchema` do repositório (byte-idêntico ao da EF v16) sobre o objeto exato que o cliente publicado monta:

```
ACCEPTED? true
  parsed: {"autorizacao_uso_dados":true,"autorizacao_marketing_vagas":false,"autorizacao_retencao_curriculo":false}
```

O key link que eu marquei `✗ NOT_WIRED — QUEBRADO` está **WIRED**.

### 2. Eu estava certo sobre o cadastro quebrado, e a causa era mais funda

Foram **três** causas empilhadas, e as duas que eu não vi são piores que a que eu vi:

| # | Causa | Como foi fechada | Verificação minha |
|---|---|---|---|
| 1 | EF v16 breaking contra o bundle publicado | push do cliente (`8346833`) | `origin/main` contém o código; payload aceito por execução |
| 2 | **Vercel sem build bem-sucedido desde 2026-06-27** — preset `vite` procura `dist/`, o repo emite em `build/`; os 20 deployments visíveis em ERROR; o site servia um build de junho congelado | `vercel.json#outputDirectory` (`274de2a`) | `vercel.json` tem `"outputDirectory": "build"`; `vite.config.ts:153` tem `outDir: 'build'`; `npm run build` emite `build/index.html` + `build/assets/` (49 arquivos) — **casam** |
| 3 | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ausentes no build → app quebrava no boot, tela branca | Project Settings (operador) | Não verificável daqui — atestado do operador |
| 4 | **SPA fallback ausente** — nenhuma URL direta funcionava, nem `/cadastro` | `0adea38` | `vercel.json` traz `{"source":"/((?!assets/).*)","destination":"/index.html"}`; a exclusão casa com o `assets/` que o build emite |
| 5 | Dashboard do candidato com cópia LOCAL da navbar, **sem** o link "Área do candidato" — e `/candidato/privacidade` tem um único ponto de entrada pelo perfil | `581abe1` | Diff é **troca, não adição**; 5 casos novos, **verificados por reversão** (com o fix desfeito só o caso (a) reprova — é ele que discrimina); o mock respeita seletor, senão a navbar se auto-guardaria e o teste passaria por vacuidade |

O item 5 é o achado mais afiado do lote: era o motivo **concreto** de a metade "revoga pelo painel" do SC#2 ser inalcançável, e eu tinha nomeado o sintoma sem achar a causa.

### 3. CONSENT-06 — não aceitei a saída de olho fechado

A saída colada no `43-07-SUMMARY.md:314-330` afirma `✓ open_tracking: false` e `✓ click_tracking: false`. Fui ao fonte do reporter conferir se esse marcador pode ser produzido por outra coisa:

```js
// scripts/check-resend-dominio.mjs:167-181
const value = detail?.[flag] ?? match?.[flag]
if (value === false)              notes.push(`✓ ${flag}: false`)
else if (value == null)           notes.push(`… ${flag}: not reported by this API version …`)
else                              failures.push(`✗ ${flag}: ${value} (expected false)`)
```

O `✓` **só** é emitido para um `false` explícito vindo da API. Flag ausente produz `…`, um marcador diferente. Portanto a saída registrada **não pode** ter vindo de "não reportado" — que é exatamente a saída que a própria fase descartou como não-passe. Os demais literais (`reporting on`, `read-only run (pass --verify …)`, `PASSED — … is verified, in …, tracking off`) batem com as linhas 114, 212 e 232 do script.

**SC#3 fechado.** Fica registrado o que o próprio SUMMARY registra: a chave foi passada inline na linha de comando e ficou no transcript em claro; rotação foi recomendada ao operador.

---

## A falha prevista chegou — e ela acusa a coisa errada

O todo `43-smokes-com-baseline-congelada-viram-red.md` (`resolves_phase: 44`) previu que os smokes ficariam RED no primeiro cadastro real. **Aconteceu.** Confirmado por leitura do SQL, que é determinístico:

`supabase/tests/p43_consent_prova_smoke.sql` conta sobre a tabela **inteira**, sem recorte de data ou de linha:

- **(f)**, linha 331: `esperado_linhas` está fixado em `'17'` (`set_config`, linha 84). Com a linha nova são **18** → `P43C FAIL (f): public.autorizacoes tem 18 linhas, esperado 17`.
- **(b)**, linhas 162-176: `count(*) FILTER (WHERE consent_text_version IS NOT NULL)` etc., sobre `FROM public.autorizacoes` sem `WHERE`. A linha nova tem as quatro colunas preenchidas → dispara no primeiro `IF`.

**E aqui está o que mais importa:** (b) roda **antes** de (f) no arquivo, então o run aborta com a mensagem de (b) — *"o apply BACK-FILLOU prova de consentimento (…) essas linhas agora AFIRMAM que o titular leu um texto que ele nunca viu"*. **Isso é falso.** Nada foi back-fillado; um candidato de verdade se cadastrou de verdade e leu o texto de verdade. O smoke perdeu a capacidade de distinguir *back-fill* de *uso legítimo*, e o que ele grita é a acusação errada.

Os dois fatos são mutuamente exclusivos: ou o SC#1 foi provado ao vivo (e o smoke está RED), ou o smoke está verde (e não houve cadastro real). **Consequência para quem ler este relatório depois: os verdes 6/6 daquele smoke são HISTÓRICOS, não correntes. Um re-run que reporte verde é sinal de problema, não de saúde.**

Não conta como gap — está rastreado com `resolves_phase: 44`. Mas é a diferença entre "previmos" e "está previsto e permanentemente vermelho a partir de agora".

---

## Os quatro itens diferidos — confirmados como genuinamente rastreados

| Item | Arquivo | `resolves_phase` | Confere? |
|---|---|---|---|
| `autorizacao_analise_video NOT NULL DEFAULT false` | `43-analise-video-default-false-fabrica-afirmacao.md` | **47** | ✓ — e a Phase 47/CONSOL-03 detém o portão destrutivo do DROP |
| Guard de marketing é `BEFORE INSERT` e só | `43-guard-marketing-so-before-insert.md` | **46** | ✓ — nenhum caminho de código faz o `UPDATE` que escaparia, hoje |
| Smokes com baseline congelada viram RED | `43-smokes-com-baseline-congelada-viram-red.md` | **44** | ✓ — **e já está vermelho**, ver seção acima |
| `updated_at` do relógio do cliente | `43-updated-at-do-consentimento-vem-do-cliente.md` | **46** | ✓ — `privacidadeService.ts:190` confirma o sítio; o prompt dizia "recorded", e o arquivo é mais forte que isso: tem fase |

Nenhum é gap. Todos têm arquivo, corpo e fase.

---

## O processo — o que sobrevive ao incidente e o que não sobrevive

A fase embarcou uma mudança que deixou o cadastro em produção respondendo `400` por ~10 horas. **Zero candidatos afetados** (zero cadastros nos 30 dias anteriores; o último real em 2026-06-26) — atestado do operador, que não consigo verificar daqui. Sorte, e a fase reconhece que foi sorte.

**O que sobrevive, e sobrevive bem:**

- A fase **nomeou o risco antes de ele acontecer**, com precisão cirúrgica: `43-07-SUMMARY §"O que este checkpoint NÃO entrega"` escreveu que a EF v16 é breaking, que publicar o cliente é passo **ordenado e não opcional**, e por quê. Isso não é narrativa retroativa — está no commit `4aca449`, anterior ao incidente.
- Os gates seguraram durante a correção: `tsc` **97** (baseline congelada, conferido), Vitest **1422/1422** em **155 arquivos** (conferido), build verde com os gates de chunk e de segredo. Nenhum `--no-verify` aparece nas mensagens dos commits da fase.
- O fix do dashboard veio **verificado por reversão** — o padrão mais forte de prova de teste, e o único que descarta teste que passa por vacuidade.
- O commit `0adea38` **corrige por escrito um erro do commit anterior** ("Erro meu no commit anterior (274de2a): escrevi que não mexeria em rewrites…"). Autocorreção datada no registro durável, não em conversa.

**O que NÃO sobrevive — e o que devia ser corrigido em vez de narrado:**

1. 🔴 **A publicação do cliente continua sem dono.** O passo 3 da ordem que os planos chamam de **obrigatória** (`migration → EF → cliente`) não pertence a plano nenhum, a fase nenhuma do ROADMAP, e a todo nenhum — verificado por varredura em `.planning/`. As Phases **44** (pedido de cópia), **45** (fluxo de exclusão) e **47** (2 páginas públicas) todas embarcam superfície de frontend. **A mesma lacuna vai recorrer.** O incidente foi fechado por ação ad-hoc do operador mais um registro em `STATE.md`; o defeito de processo que o produziu não foi corrigido em lugar durável.
2. 🔴 **Nenhum gate observa o artefato deployado.** O Vercel ficou cinco semanas sem build bem-sucedido e nada acusou. O repo tem `postbuild` (`assert-no-secrets`, `assert-chunks`) — que roda **local**, sobre um build que ninguém serve. Também não rastreado.
3. ⚠️ **`43-07-SUMMARY.md:366` afirma «O bundle do cliente nao foi publicado».** Hoje é **falso**. Nenhum bloco de correção foi acrescentado. Isto importa porque o projeto **já tem o padrão certo estabelecido**: a P37/37-05 arquivou um item de débito em quatro blocos com o corpo original preservado byte-a-byte, precisamente para que a imprecisão vire registro forense em vez de sumir. O padrão existe e não foi aplicado aqui.
4. ⚠️ **`REQUIREMENTS.md` está desatualizado — agora no sentido INVERSO ao que eu apontei.** Meu achado anterior era sobre `[x]` prematuro; hoje o problema é `[ ]` atrasado:

| Requirement | Marca atual | Estado real |
|---|---|---|
| CONSENT-01 | `[ ]` / "In Progress" | **Provado ao vivo, ponta a ponta** |
| CONSENT-02 | `[ ]` / "In Progress" | **Provado ao vivo** (versão + hash + timestamp na linha real) |
| CONSENT-03 | `[ ]` / "In Progress" | **Provado** — dois consentimentos distintos, guard vivo, transacional como linha informativa confirmado em tela |
| CONSENT-05 | `[ ]` / "In Progress" | Parcial de verdade — a coleta parou, a coluna `DEFAULT false` não. O `[ ]` é **defensável** |
| CONSENT-06 | `[ ]` / "Pending" | **Fechado** com confirmação positiva do provedor |
| RETEN-02 (linha 181) | "alteração PELA TELA, auditada, em 43-09" | A tela **nunca foi aberta**. A parentética continua sobreafirmando |

O bloco de nota em `REQUIREMENTS.md:58-66`, onde três executores recusaram marcar `[x]` prematuro, é o mesmo rigor que agora precisa ser aplicado na direção oposta.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `supabase/functions/_shared/consent-text.json` | Fonte única do texto | ✓ VERIFIED | `versao: v2-2026-08` em `origin/main`; lido pelas duas runtimes |
| `supabase/functions/_shared/consent-hash.ts` | SHA-256 só no servidor | ✓ VERIFIED | Deno 16/16 com o pin do hex — **e o hash da linha real ao vivo bateu com esse pin** |
| `supabase/functions/_shared/autorizacoes-registro.ts` | Payload sem coalescência | ✓ VERIFIED | Zero `??`; chave de vídeo nunca emitida (teste 5) |
| `supabase/functions/_shared/schemas.ts` | `.strict()`, sem defaults | ✓ VERIFIED | **Aceita o payload do cliente publicado** (execução nesta passagem); recusa `autorizacao_analise_video` |
| `supabase/migrations/20260801000001…04` | 4 migrations da fase | ✓ VERIFIED | Vivas, md5 4/4, smokes 6/6 · 10/10 · 9/9 · 9/9 |
| `supabase/migrations/20260802000001…` | Fix do CR-01 | ✓ VERIFIED | `REVOKE UPDATE … FROM anon, authenticated` (linha 83) + `GRANT UPDATE (autorizacao_marketing_vagas, updated_at)` (linha 91). **Segurou numa ação REAL de usuário** — exatamente 1 coluna escrita |
| `vercel.json` | Output + SPA fallback | ✓ VERIFIED | `outputDirectory: "build"` casa com `vite.config.ts:153`; rewrite exclui `assets/`, que é o que o build emite |
| `src/features/cadastro/components/steps/AutorizacoesStep.tsx` | Passo reescrito | ✓ VERIFIED | Publicado; invariantes confirmados **em tela** por print |
| `src/features/privacidade/**` | Superfície de revogação | ✓ VERIFIED | Publicada e **exercitada ao vivo**; 11 arquivos em `origin/main`; 20 casos verdes. ⚠ ramo autorizado da guarda nunca visto ao vivo |
| `src/features/admin/retencao/**` | Matriz editável + prévia | ⚠️ **PUBLICADO, NUNCA EXERCITADO** | 13 arquivos em `origin/main`, 53 casos verdes de componente — **mas `services/` e `hooks/` sem nenhum teste**, e a tela nunca aberta |
| `src/components/pages/DashboardCandidatoPage.tsx` | Barra compartilhada | ✓ VERIFIED | `<CandidatoNavbar />` no lugar da cópia local; 5 casos, verificados por reversão |
| `docs/compliance/reten06-veredito-retain-until.md` | Veredito datado antes da estrutura | ✓ VERIFIED | Wave 1 (43-02), antes da migration da matriz (43-04, wave 2) |
| `docs/compliance/marketing-consentimento-escopo.md` | Escopo honesto do SC#2 | ✓ VERIFIED | §6 corrigida pós-apply (WR-01 fechada) |
| `scripts/check-resend-dominio.mjs` | Reporter do CONSENT-06 | ✓ VERIFIED | **Executado**, com confirmação positiva; a lógica do `✓` conferida no fonte |
| `database.types.ts` | Regenerado pós-apply | ✓ VERIFIED | 4 colunas novas + `config_retencao_etapa` + 5 funções |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| **Cliente publicado (`origin/main`)** | **EF `cadastrar-candidato` v16** | POST `/cadastrar-candidato` | ✓ **WIRED** *(era `✗ QUEBRADO`)* | Payload **ACEITO** — reconferido por execução nesta passagem. Confirmado end-to-end por cadastro real |
| `consent-text.json` | `public.autorizacoes` | `calcularHashConsentimento` → `montarRegistroAutorizacoes` → INSERT | ✓ WIRED | Hash da linha real ao vivo == pin do teste |
| `consent-text.json` | `AutorizacoesStep` | import direto | ✓ WIRED | Uma fonte, dois leitores |
| `autorizacoes.autorizacao_marketing_vagas` | `notificacoes_enviadas` | `pode_receber_marketing()` → trigger `BEFORE INSERT` | ✓ WIRED | Recusa provada por inserção real (`P0003`) |
| `PrivacidadeCandidatoPage` | `public.autorizacoes` | `revogarMarketing` → PostgREST `.update().eq(id).eq(candidato_id)` | ✓ **WIRED — exercitado ao vivo** | 1 coluna escrita, 4 colunas de prova intactas |
| `DashboardCandidatoPage` | `/candidato/perfil` → card → `/candidato/privacidade` | `<CandidatoNavbar />` | ✓ **WIRED** *(era o beco sem saída)* | Caso (a) discrimina por reversão |
| `config_retencao_etapa` | `previa_retencao()` | `candidaturas_alem_da_janela()` | ✓ WIRED | Os dois wrappers CHAMAM o predicado; asserido no smoke |
| `salvar_janela_retencao` | `log_auditoria` | `PERFORM` no mesmo corpo | ✓ WIRED | Mesma transação, asserido no smoke 10/10 |
| `EditarJanelaDialog` | `rpc('salvar_janela_retencao')` | `useSalvarJanela` → `retencaoService.salvarJanela` | ⚠️ **WIRED EM CÓDIGO, SEM TESTE E SEM EXECUÇÃO** | `EditarJanelaDialog.tsx:72,132,155` → `useSalvarJanela.ts:41` → `retencaoService.ts:288-291`. **Zero testes** em `services/` e `hooks/`; o teste do diálogo mocka a mutação. Nunca executado por ninguém |
| `/admin/retencao` | `RHSidebar` (3 sítios) | item + rota + `getActivePageFromPath` | ✓ WIRED em código | `RHSidebar.tsx:106, 165, 183` — a linha vem ANTES do `/admin` genérico. Nunca navegado |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `AutorizacoesStep` | `AUTORIZACOES`, `TRANSACIONAL` | `consent-text.json` | Sim — **confirmado em tela ao vivo** | ✓ FLOWING |
| `PrivacidadeCandidatoPage` | `autorizacoes` | `usePrivacidade` → `.select(AUTORIZACOES_ALLOWLIST)` | Sim — **confirmado ao vivo** | ✓ FLOWING |
| `GuardaCurriculoBloco` | `autorizado`, `temCurriculo`, `autorizadoEm` | `.select(CANDIDATURA_CURRICULO_ALLOWLIST)` | Sim, mas só o ramo **NÃO-autorizado** foi visto | ⚠️ FLOWING — ramo autorizado só em teste |
| `MatrizRetencaoTable` | `linhas` | `rpc('listar_matriz_retencao')` | Sim — 8 linhas vivas | ✓ FLOWING (nunca renderizado ao vivo) |
| `PreviaRetencaoBloco` | `linhas`, `total` | `rpc('previa_retencao')` + `previa_retencao_total` | **Zero hoje, e zero é a resposta certa** | ✓ FLOWING (estado zero explícito, com carimbo) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| **Payload do cliente PUBLICADO × schema da EF v16** | `deno run` do `autorizacoesSchema` sobre o objeto de `origin/main` | **`ACCEPTED? true`** | ✓ **PASS** *(era FAIL)* |
| Suíte inteira do repositório | `npm run test:run` | **155 arquivos · 1422 testes · 0 falhas** | ✓ PASS |
| Baseline `tsc` congelada em 97 | `npm run lint` | **97** — idêntico | ✓ PASS |
| Build + gates de segredo/chunk | `npm run build` | verde · 45 chunks · `assert-chunks PASSED` | ✓ PASS |
| Corpus Deno do consentimento | `deno test consent-hash + autorizacoes-registro` | **16 passed / 0 failed** (incl. o pin do hex) | ✓ PASS |
| Superfícies da fase (privacidade + retenção) | `npx vitest run src/features/privacidade src/features/admin/retencao` | **7 arquivos · 73 testes · 0 falhas** | ✓ PASS |
| `outputDirectory` × `outDir` × artefato emitido | `vercel.json` vs `vite.config.ts:153` vs `ls build/` | `build` == `build` == `build/{index.html,assets/}` | ✓ PASS |
| `p43_consent_prova_smoke.sql` (b) e (f) | leitura determinística do SQL + linha real existente | **RED previsto — (b) aborta com acusação FALSA de back-fill** | ✗ **RED (rastreado → Phase 44)** |
| `/admin/retencao` ao vivo | — | nunca aberta | ? **SKIP → human_needed** |

### Probe Execution

Não há probes `scripts/*/tests/probe-*.sh` neste repositório. Os equivalentes da fase são os quatro smokes SQL, que exigem MCP do Supabase — indisponível a subagentes (restrição registrada no ROADMAP). Seus resultados (6/6, 10/10, 9/9, 9/9) foram tomados do estado medido no checkpoint 43-07 e corroborados por evidência que **não** depende do MCP: `database.types.ts` contém as 4 colunas, `config_retencao_etapa` e as 5 funções, e esse arquivo é gerado do banco vivo. **Ver a ressalva acima: o smoke (b)/(f) do consentimento passou a ser RED e seus verdes são históricos.**

### Requirements Coverage

Todos os 11 IDs do ROADMAP aparecem no frontmatter de algum plano. **Zero requirements órfãos.** `RETEN-05` está corretamente fora (Phase 46).

| Requirement | Status | Evidence |
|---|---|---|
| CONSENT-01 | ✓ **SATISFIED** | Provado ao vivo: as duas caixas deixadas desmarcadas gravaram `false` |
| CONSENT-02 | ✓ **SATISFIED** | Versão + hash + timestamp na linha real; hash == pin do teste |
| CONSENT-03 | ✓ **SATISFIED** | Dois consentimentos distintos; transacional como linha informativa com base legal nomeada (confirmado em print); guard vivo |
| CONSENT-04 | ✓ **SATISFIED** | **Revogação real pelo painel**, com o GRANT do CR-01 segurando |
| CONSENT-05 | ⚠️ PARCIAL | Coleta parou (provado). Coluna `NOT NULL DEFAULT false` — diferido à Phase 47, rastreado |
| CONSENT-06 | ✓ **SATISFIED** | Confirmação POSITIVA do provedor, com o marcador `✓` conferido no fonte |
| RETEN-01 | ✓ SATISFIED (mecanismo) | Tabela + RPCs vivas, smoke 10/10. Tela publicada, nunca aberta |
| RETEN-02 | ✓ SATISFIED (com ressalva) | Seed 8/8 @24 com o enquadramento BD-1 no `COMMENT` do banco e no diálogo. **A parentética "PELA TELA" na linha 181 continua sem exercício** |
| RETEN-03 | ✓ SATISFIED (com ressalva) | Bloco na página que foi aberta ao vivo; os 3 casos em teste. **O ramo autorizado — que é o requirement — nunca apareceu em tela** |
| RETEN-04 | ✓ SATISFIED | Prévia agregada viva, enumerador revogado, carimbo no servidor, gate de md5, asserção negativa estrutural |
| RETEN-06 | ✓ SATISFIED | Veredito datado, na wave anterior à da estrutura nova |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | `TBD` / `FIXME` / `XXX` nos arquivos da fase | — | **Nenhum.** Varredura em `src/features/privacidade`, `src/features/admin/retencao`, `AutorizacoesStep.tsx`, `supabase/functions/_shared/`, `vercel.json`: zero ocorrências |
| `43-07-SUMMARY.md` | 366 | Afirmação hoje FALSA ("o bundle não foi publicado"), sem bloco de correção | ⚠️ Warning | O projeto já estabeleceu o padrão certo (P37/37-05) e não o aplicou aqui |
| `REQUIREMENTS.md` | 52-55, 68, 181 | 4 requirements `[ ]` que estão provados + 1 parentética que sobreafirma | ⚠️ Warning | Registro do milestone desalinhado do estado real, nos DOIS sentidos |
| `src/features/admin/retencao/{services,hooks}` | — | Zero cobertura de teste na camada que fala com a RPC | ⚠️ Warning | É o elo do SC#4 sem teste **e** sem execução |
| `privacidadeService.ts` | 190 | `updated_at` do relógio do cliente | ℹ️ Info | WR-07, rastreado com `resolves_phase: 46` |
| `AutorizacoesStep.tsx` | 172 | `<strong>Seus dados e autorizações</strong>.` — ponto final em nó de texto separado | ℹ️ Info | **Cosmético, confirmado por leitura.** O `<strong>` é um bloco inline longo e o `.` é nó irmão, então quebra sozinho na linha de baixo. Não afeta função. Também presente na linha 261 |

---

## Warnings

**W-1 — `/admin/retencao` é a única superfície da fase sem nenhuma evidência viva, e o elo que a liga ao mecanismo provado é o único sem teste.** Não é dúvida sobre o mecanismo: a RPC recusa não-admin **e** o chamador sem claim (42501) e escreve auditoria na mesma transação, provado por smoke 10/10 contra PROD. É sobre o trecho entre a pessoa e o mecanismo.

**W-2 — A prévia devolve ZERO e devolverá por meses, e isso é correto.** O componente trata zero como **resposta** e não como vazio (`isEmpty` do `AsyncState` deliberadamente não usado) e carimba a data mesmo no zero. O estado populado é impossível de produzir com dado real sem encurtar a janela — o que seria fabricar a condição. Provado só por teste, **deliberadamente**.

**W-3 — Os 4 candidatos sem linha de consentimento continuam sem linha.** Correto e deliberado (BD-4: back-fill seria fabricar prova). Registrado para que ninguém "corrija" depois por engano.

**W-4 — A revogação depende de uma policy que não existe em arquivo nenhum.** `Candidatos podem atualizar suas autorizacoes` vive em PROD e em nenhuma migration (4ª instância do drift, com todo aberto). O serviço se defende com `.eq('candidato_id', …)` e o CR-01 estreitou o privilégio de coluna — mas um `db reset` ainda perderia a policy em silêncio. **A revogação ao vivo funcionou porque essa policy está lá.**

**W-5 — Nenhum artefato de planejamento é dono da publicação do cliente, e nenhum gate observa o artefato deployado.** As duas causas mais fundas do incidente. Ver §"O processo". As Phases 44, 45 e 47 embarcam frontend.

---

## Gaps Summary

**Não há gaps.** Os três que eu abri estão fechados, e os dois principais pelo padrão mais alto disponível: uma pessoa real, num navegador real, produzindo uma linha real cujos valores amarram a um hash pinado de forma independente. O terceiro fechou com confirmação positiva do provedor, e conferi no fonte do reporter que aquele marcador não pode ser produzido por ausência de dado.

O que resta é de outra natureza. **`/admin/retencao` nunca foi aberta**, e o elo entre a tela e a RPC provada não tem teste nenhum. Levei SC#1 e SC#2 ao padrão vivo e eles o atingiram; aplicar padrão mais frouxo ao SC#4 seria inconsistência, então ele fica ⚠️ presente-porém-não-exercitado até que um administrador de verdade mude uma janela de verdade. Dois outros pontos ficam nomeados sem entrar no placar: a prévia populada é impossível de produzir com dado real hoje, e o ramo autorizado da guarda do currículo nunca apareceu numa tela porque a conta de teste deixou justamente aquela caixa desmarcada.

Uma última observação, no mesmo padrão que a fase aplicou a si mesma. A fase **previu o incidente por escrito antes de ele acontecer** — isso é raro e vale registrar. Mas fechou o incidente com ação ad-hoc mais narrativa em `STATE.md`, e o defeito de processo continua exatamente onde estava: publicar o cliente não pertence a plano nenhum, e nada olha o artefato que a produção serve. Cinco semanas de deploy quebrado passaram invisíveis. A fase existe para acabar com promessa que nenhum código executa — a ordem `migration → EF → cliente` é, hoje, uma promessa dessas, um diretório acima.

---

# ── HISTÓRICO ──────────────────────────────────────────────────────────

## 1ª passagem — 2026-08-02T18:59:05Z · `gaps_found` · **2/5**

Preservado porque o registro de a fase ter embarcado quebrada e sido consertada vale mais que um arquivo de aparência limpa.

**Veredito de então, verbatim:**

> O banco e o servidor desta fase estão entre os trabalhos mais bem provados do projeto — cinco migrations vivas com fidelidade md5, quatro smokes nos totais exatos, uma escrita real de consentimento com hash idêntico ao pin, e um CR-01 crítico achado, confirmado por execução e fechado. **E mesmo assim o objetivo da fase não está alcançado, porque nenhum candidato consegue marcar checkbox nenhum: a Edge Function v16 é breaking contra o bundle que a produção serve, e o cadastro responde 400.**

**Placar de então:** SC#1 ✗ FAILED · SC#2 ✗ FAILED (metade) · SC#3 ✗ FAILED · SC#4 ✓ VERIFIED · SC#5 ✓ VERIFIED.

**Os três gaps e o que aconteceu com cada um:**

| # | Gap | Desfecho |
|---|---|---|
| 1 | **SC#1** — cliente nunca publicado; `origin/*` parado em `4bdb0fb`/`8306f3e`; **136 commits fora de remote algum**; EF v16 recusa o payload do cliente vivo (`ACCEPTED? false`, 2 issues) → 400 VALIDATION em produção | **FECHADO.** `origin/main = 581abe1`. Payload **aceito**, reconferido por execução. Cadastro real ponta a ponta |
| 2 | **SC#2** — `/candidato/privacidade` existia em código e em teste, não em produção | **FECHADO.** Revogação real na tela, com o GRANT do CR-01 segurando |
| 3 | **SC#3** — CONSENT-06 nunca executado; nenhum artefato do repositório registrava resultado | **FECHADO.** Confirmação positiva do provedor, colada verbatim no `43-07-SUMMARY` |

**O que a 1ª passagem acertou:** que o cadastro estava quebrado em produção, e por execução, não por leitura. Que parar no passo 2 de uma sequência declarada obrigatória não é pausa neutra. Que "não reportado pela API" não conta como confirmação de tracking desligado.

**O que a 1ª passagem não viu:** que havia **três** causas empilhadas, não uma. Que o Vercel não buildava desde **2026-06-27** — cinco semanas servindo um build congelado, com todos os 20 deployments visíveis em ERROR, por uma divergência `dist/` × `build/`. Que as env vars de build estavam ausentes. Que o SPA fallback nunca existiu (**nenhuma** URL direta funcionava, nem `/cadastro`). E que o dashboard do candidato renderizava uma cópia local da barra persona **sem** o link "Área do candidato" — a causa concreta, e não apenas o sintoma, de a revogação ser inalcançável.

**O que mudou no julgamento entre as passagens:**

| Item | 1ª passagem | 2ª passagem | Por quê |
|---|---|---|---|
| `[x]` de **CONSENT-04** | "prematuro" | **aceito** | A revogação foi exercitada ao vivo |
| `[x]` de **RETEN-03** | "prematuro" | **aceito, com ressalva** | A página foi aberta; o ramo autorizado, não |
| `[x]` de **RETEN-02** | "a parentética sobreafirma" | **mantido: continua sobreafirmando** | A tela segue sem ser aberta |
| **SC#4** | ✓ VERIFIED (com W-1) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Padrão consistente com SC#1/SC#2 **+ fato novo**: o elo cliente→RPC não tem teste algum |
| Achado sobre `REQUIREMENTS.md` | `[x]` prematuro em 3 itens | `[ ]` atrasado em 4 itens | O arquivo ficou desatualizado no sentido inverso |

---

_Verified: 2026-08-03T04:18:24Z_
_Verifier: Claude (gsd-verifier) — 2ª passagem, re-verificação após fechamento de gaps_
