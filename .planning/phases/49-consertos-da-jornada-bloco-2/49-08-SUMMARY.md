---
phase: 49-consertos-da-jornada-bloco-2
plan: 08
subsystem: edge-functions
tags: [comparativo, idor, jorn-32, jorn-25, jorn-28, d-59, d-34, d-28, max-tokens, deno, tdd, deploy]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "`comparativo_solicitado.provedor_ia` / `.modelo_ia` vivas em PROD — conferidas no catálogo ANTES do deploy (Pitfall 8). O CHECK `provedor_ia IS NULL OR provedor_ia = ANY(ARRAY['anthropic','openai'])`, medido aqui, é o que obriga a mapear `provider='none'` para NULL"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`CallAiResult.model` (modelo REAL) e `.fallback_cause` — a proveniência que esta EF grava e devolve. ⚠ Este deploy é o PRIMEIRO a levar o contrato novo do 49-02 a PROD (ver §«O que este deploy publicou»)"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "03"
    provides: "`supabase/functions/_shared/candidaturaEncerrada.ts` — a ÚNICA implementação TS do predicado canônico, importada direto (nenhuma segunda cópia foi escrita)"
provides:
  - "`supabase/functions/_shared/comparativo-config.ts` — `COMPARATIVO_MIN_CANDIDATOS = 2` e `COMPARATIVO_MAX_CANDIDATOS = 4`, ZERO IMPORTS, a fonte única do teto para a EF, o schema e (no 49-22) o front"
  - "`prompt_versions.max_tokens` do `comparative_ranking` ativo = 3600 em PROD (era 3000)"
  - "códigos de erro `ENCERRADA` e `SEM_ANALISE` (este com `candidaturas_sem_analise` no corpo) no contrato da EF"
  - "resposta da EF com `posicoes` (`C<n>` → `candidatura_id`), `provedor_ia`, `modelo_ia`, `fallback_cause` — o que o 49-13 (selo + PDF) e o 49-22 (rótulo e seleção) consomem"
  - "EF `comparativo-candidatos` version=28 em PROD, `verify_jwt=true` — e com ela o contrato `ai-client`/`audit-logger` do 49-02 no ar pela primeira vez"
affects: [49-13, 49-14, 49-16, 49-18, 49-22]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 15291
  tasks: 2
  commits: 3
  plan_head_before: 47b58cc2c59cd2897c6d3618ebe28d0a78f5240f
  # `commits: 3` MEDIDO por `git rev-list --count 47b58cc2..HEAD` no instante da escrita deste
  # SUMMARY (b3f320b3, 80245483, 963637f3) — todos de PRODUÇÃO, nenhum de metadado. Re-medir
  # DEPOIS do commit de metadado deste plano dá 4, por construção. A fronteira é esta.
  # `tokens: 15291` = 61 164 octetos de `git diff 47b58cc2..HEAD -- supabase` ÷ 4.
  estimate_tokens_do_plano: 90000
  # O plano estimou 90 000 e o realizado foi 15 291 — 5,9× ABAIXO, registrado sem arredondar.
  # A razão é a mesma dos planos 02 e 03 desta fase, e agora tem três amostras: o peso destes
  # planos está em LEITURA (a EF de 361 linhas, o teste de 309, o ai-client de 1152, o efdeploy,
  # o PATTERNS) e em MEDIÇÃO em PROD (catálogo, CHECK, prompt_versions, bundle vivo) — nada
  # disso aparece no diff. `confidence: low` era honesto. Uma calibração que só olhasse a
  # média das três subestimaria o custo de contexto destes planos pela metade.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "teto numérico como CONSTANTE única consumida por EF + schema + front, com a conta que o justifica no docblock — e o `max_tokens` do banco nomeado no mesmo lugar como irmão obrigatório"
    - "teste de teto que assere contra `MAX + 1` e contra `MAX` (borda inclusiva), nunca contra o número: um teste que codifica «11 é demais» segue verde depois de o teto cair para 4 e deixa de vigiar"
    - "recusa de IDOR por 403 genérico IDÊNTICO para «não existe» e «não é sua» — diferenciá-los é um oráculo de existência"
    - "ordem de recusa: forma do corpo (repetidos) → posse → estado → insumo. Cada causa com o seu código e a sua mensagem; nenhuma herdando a mensagem da vizinha"
    - "desempate estável na ordenação que gera rótulos posicionais, e a tabela rótulo→chave devolvida na resposta, montada do MESMO laço que monta o prompt"

key-files:
  created:
    - supabase/functions/_shared/comparativo-config.ts
    - supabase/migrations/20260922000005_p49_comparativo_max_tokens.sql
  modified:
    - supabase/functions/_shared/analise-schemas.ts
    - supabase/functions/comparativo-candidatos/index.ts
    - supabase/functions/comparativo-candidatos/__tests__/index.test.ts

key-decisions:
  - "O predicado de encerrada NÃO ganhou cópia no comparativo: a EF importa `_shared/candidaturaEncerrada.ts` (49-03) direto. Era o ponto exato onde uma segunda implementação TS nasceria, e cópias divergem em silêncio."
  - "A checagem de ids repetidos ficou ANTES da comparação de contagens, não depois. Sem ela, um `.in()` com ids repetidos devolve menos linhas do que ids pedidos e a recusa sai como 403 «Acesso negado.» — um diagnóstico FALSO sobre um pedido que só está malformado. É a mesma família do defeito que este plano conserta (uma mensagem herdando a causa da vizinha)."
  - "`MIXED_VAGA` foi PRESERVADO, com escopo reduzido ao único caso em que a sua mensagem é verdadeira: candidatura da vaga certa cuja ANÁLISE aponta para outra. Apagá-lo transformaria um estado incoerente de dados em caminho feliz por omissão."
  - "`provider='none'` (teto de custo, injeção) vira `provedor_ia = NULL`, não a string. Medido: o CHECK `comparativo_solicitado_provedor_ia_check` só aceita NULL/'anthropic'/'openai' — forçar 'none' quebraria o INSERT em 23514, trocando um buraco de auditoria por uma falha de gravação."
  - "A migration é deliberadamente NÃO idempotente: re-rodar levanta o portão de valor esperado. Uma segunda passagem silenciosa esconderia que o estado mudou entre as duas."
  - "Acrescentei um portão de CARDINALIDADE à migration (`count(*) ativas <> 1 ⇒ RAISE`) que o analog `20260906000003` não tem. O `UPDATE … WHERE call_type AND is_active` atinge um CONJUNTO; sem esse portão, duas linhas ativas (um canário mal promovido) seriam editadas juntas em silêncio."
  - "Evidência de RED registrada à mão. `gsd-tools check tdd-red-evidence` NÃO consegue classificar um run Deno — e nenhuma linha de contador foi sintetizada para contorná-lo (ver §Findings)."

requirements-completed: [JORN-32, JORN-25, JORN-28]

# Coverage (#1602)
coverage:
  - deliverable: "O teto do comparativo numa constante única (EF + schema), com a recusa ANTES da chamada de IA e a mensagem montada dela"
    human_judgment: false
    verification:
      - kind: test
        ref: "supabase/functions/comparativo-candidatos/__tests__/index.test.ts#49-08 / D-59 — MAX + 1 ids → 400 VALIDATION, mensagem montada da constante, ZERO chamadas de IA"
        status: pass
      - kind: test
        ref: "index.test.ts#49-08 / D-59 — exatamente MAX ids é ACEITO (o teto é inclusivo)"
        status: pass
      - kind: command
        ref: "node -e '… comparativo-config.ts sem import · teto = 4 · schema usa a constante' → OK"
        status: pass
  - deliverable: "`prompt_versions.max_tokens` do `comparative_ranking` ativo = 3600 em PROD, por UPDATE com portão de valor esperado, de cardinalidade e pós-condição"
    human_judgment: false
    verification:
      - kind: command
        ref: "node p46apply.cjs migrate supabase/migrations/20260922000005_p49_comparativo_max_tokens.sql → «aplicada e escriturada — md5 do ledger BATE (6239 octetos)»"
        status: pass
      - kind: command
        ref: "SET TRANSACTION READ ONLY; select max_tokens … where call_type='comparative_ranking' and is_active and not is_canary → exatamente 1 linha, 3600"
        status: pass
      - kind: command
        ref: "md5(statements[1]) do ledger = md5 do arquivo (9f36ef67…) — «aplicado» e «escriturado» conferidos em separado"
        status: pass
  - deliverable: "JORN-32 (IDOR): toda candidatura pedida tem de ser da vaga cuja posse foi verificada, e a recusa não distingue «não existe» de «não é sua»"
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-08 / JORN-32 — uma candidatura de OUTRA vaga → 403 FORBIDDEN, zero leitura de análise, zero IA"
        status: pass
      - kind: test
        ref: "index.test.ts#49-08 / JORN-32 — id INEXISTENTE recebe o MESMO 403 genérico (sem oráculo de existência)"
        status: pass
      - kind: other
        ref: "RED medido: os dois casos reprovavam em AssertionError (400 MIXED_VAGA em vez de 403) antes do GREEN"
        status: pass
  - deliverable: "D-34: candidatura encerrada pelo predicado canônico ⇒ 400 ENCERRADA; retirada a pedido segue comparável"
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-08 / D-34 — knockout (inscricao/rejeitado) → 400 ENCERRADA, zero IA"
        status: pass
      - kind: test
        ref: "index.test.ts#49-08 / D-34 — retirada A PEDIDO (em andamento + encerrada_a_pedido_em) NÃO é encerrada e segue comparável"
        status: pass
      - kind: other
        ref: "nenhuma segunda implementação TS do predicado: a EF importa `_shared/candidaturaEncerrada.ts` (14 acertos no bundle vivo v28)"
        status: pass
  - deliverable: "D-34: análise ausente ⇒ 400 SEM_ANALISE com os ids — a mensagem falsa «pertencem a vagas diferentes» deixa de aparecer"
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-08 / D-34 — candidatura elegível SEM análise → 400 SEM_ANALISE com os ids (nunca «vagas diferentes»)"
        status: pass
      - kind: test
        ref: "index.test.ts#49-08 / defesa em profundidade — candidatura da vaga certa com ANÁLISE de outra vaga → 400 MIXED_VAGA (o único caso em que a mensagem é verdadeira)"
        status: pass
  - deliverable: "D-28: `provedor_ia`/`modelo_ia` gravados com o erro do INSERT CHECADO, e devolvidos na resposta"
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-08 / D-28 — a resposta e a linha de auditoria levam o modelo REAL (não o configurado)"
        status: pass
      - kind: test
        ref: "index.test.ts#49-08 / D-28 (C6 #4) — erro no INSERT da auditoria ⇒ 500, NUNCA { ok: true }"
        status: pass
      - kind: integration
        ref: "CHECK `comparativo_solicitado_provedor_ia_check` lido em PROD: NULL | 'anthropic' | 'openai' ⇒ `provider='none'` mapeado para NULL por obrigação, não por gosto"
        status: pass
  - deliverable: "Rótulo pela chave: ordenação com desempate estável e `posicoes` na resposta, na MESMA ordem do prompt"
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-08 — a resposta devolve `posicoes` (C<n> → candidatura_id) na MESMA ordem do prompt (assere contra o prompt ENVIADO, não só contra a ordenação interna)"
        status: pass
      - kind: test
        ref: "index.test.ts#49-08 — empate de score_match ⇒ ordem por candidatura_id (desempate estável)"
        status: pass
      - kind: test
        ref: "index.test.ts#49-08 / D-63 — o bloco de cada candidato no prompt conserva o token `(id=`"
        status: pass
  - deliverable: "A EF está VIVA em produção com o conserto (não só no disco), e os dois canais (EF e Vercel) estão em dia"
    human_judgment: false
    verification:
      - kind: command
        ref: "node efdeploy.cjs comparativo-candidatos → «efdeploy: OK · version=28 · status=ACTIVE · verify_jwt=true»"
        status: pass
      - kind: command
        ref: "GET /v1/projects/…/functions/comparativo-candidatos/body → SEM_ANALISE ×3, ENCERRADA ×3, candidaturas_sem_analise ×2, posicoes ×8, COMPARATIVO_MAX_CANDIDATOS ×8"
        status: pass
      - kind: command
        ref: "git log --oneline origin/main..HEAD → vazio (push executado)"
        status: pass
  - deliverable: "A premissa A3 (P ≈ 280–410 tok/candidato) não foi MEDIDA — o teto de 4 repousa sobre um modelo estimado de 4 saídas de junho e 1 truncamento"
    human_judgment: true
    rationale: "O plano 49-18 mede a saída real de um comparativo n=4 em PROD (`output_token_count ≤ 3600`, `latency_ms ≤ 90000`, `provider='anthropic'`). Até lá, «4 é o teto certo» é uma inferência aritmética bem fundamentada, não um fato observado. Se a saída real passar de 3140 tok, o teto volta ao operador antes de fechar a fase (D-59). Registrar isso como juízo é o que impede a aritmética de passar por medição."

# Metrics
duration: 19 min
completed: 2026-09-22
tasks: 2
files: 5
---

# Phase 49 Plano 08: A Edge Function do comparativo Summary

**O comparativo passou a recusar candidato de vaga alheia (403 genérico, antes de ler PII nenhuma),
a recusar candidatura encerrada e a nomear quem está sem análise — cada causa com a sua mensagem
verdadeira —, a pedir só os 4 candidatos que cabem nos 3600 tokens que o timeout permite, e a gravar
e devolver o modelo que DE FATO respondeu, com o erro do INSERT de auditoria checado. Version 28
viva em PROD.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-09-22T23:48:03Z
- **Completed:** 2026-09-23T00:06:44Z
- **Tasks:** 2 / 2
- **Files:** 5 (2 criados, 3 modificados)
- **Testes:** 7 → 18 no arquivo da EF; suíte das EFs 619 → 630, sempre 0 falhas

## O que estava errado

**O IDOR.** O que a EF chamava de cross-check IDOR (`index.ts:210-220`) conferia que as ANÁLISES
eram da mesma vaga **entre si** (`vagas.size === 1`). Isso nunca amarrou nada a `body.vaga_id` — a
vaga cuja posse acabara de ser verificada. Bastava a um RH pedir dois candidatos da **mesma** vaga
alheia: os dois eram da mesma vaga, o portão passava, e a EF lê com `service_role` (RLS não protege
esse caminho). `score_match`, `gaps` e `resumo_cv` de candidatos de outra vaga saíam na resposta.

**A mensagem falsa.** Três causas distintas caíam num único `MIXED_VAGA` cuja mensagem é «Os
candidatos pertencem a vagas diferentes (ou alguma análise ainda não existe)». Em duas delas a
mensagem é **falsa**: um knockout sem análise e um candidato ainda não analisado são da **mesma**
vaga. O RH lia «vagas diferentes» e ia caçar um erro que não existia.

**O teto que nunca foi medido.** O número 10 vivia em nove lugares e foi escrito antes de o Sonnet
ser o provedor efetivo. Em 2026-09-20 um comparativo de **6 candidatos** passou de `max_tokens=3000`
— JSON cortado na posição 9290 —, o parse falhou, e o ranking que o RH viu **saiu do `gpt-4o-mini`
registrado como sucesso**, sem nenhuma proveniência gravada (`provedor_ia`/`modelo_ia` não eram
escritos, e o erro do INSERT de auditoria não era checado: uma auditoria que falhasse devolvia
`{ ok: true }`).

## Accomplishments

1. **O teto virou uma constante com a conta dentro** (`_shared/comparativo-config.ts`, ZERO IMPORTS
   por contrato — o mesmo de `email-config.ts:12-17`). `COMPARATIVO_MAX_CANDIDATOS = 4` porque
   80 s × 45 tok/s = 3600 tok, e n=4 no modelo conservador dá 3140 tok (87 %) enquanto n=5 dá 3550
   (99 %, sem folga). O docblock diz explicitamente que **mudar o teto é mudar duas coisas** — a
   constante e o `max_tokens` —, e por quê cada omissão produz um defeito diferente (truncamento de
   um lado, timeout do outro, e o timeout é pior).

2. **O `max_tokens` do `comparative_ranking` ativo está em 3600 em PROD**, por `UPDATE` na própria
   linha (o guard `prevent_published_prompt_edit` não protege `max_tokens` — Correção 6), com portão
   de valor esperado, **portão de cardinalidade que o analog não tem** e pós-condição.

3. **A posse é conferida candidatura por candidatura**, contra `body.vaga_id`, **antes de qualquer
   leitura de análise** — com teste que assere zero leituras de `analise_candidato_vaga` e zero
   chamadas de IA na recusa. Uma recusa que já leu tudo deixa o dado no processo e nos logs.

4. **«Não existe» e «não é sua» recebem a MESMA resposta**, byte a byte (`403` / `FORBIDDEN` /
   «Acesso negado.»). Diferenciá-las transformaria a mensagem de erro num oráculo: por tentativa, um
   RH enumeraria ids de candidatura do sistema inteiro (T-49-08-02).

5. **Cada causa ganhou o seu código e a sua mensagem**: `ENCERRADA` («Candidatura encerrada não entra
   no comparativo.»), `SEM_ANALISE` («Ainda não há análise para N candidato(s) selecionado(s).») com
   `candidaturas_sem_analise` no corpo para a tela **nomear quem falta**. `MIXED_VAGA` sobreviveu com
   escopo reduzido ao único caso em que a sua frase é verdadeira.

6. **O predicado de encerrada é o canônico, importado, não copiado.** Este era o ponto exato onde uma
   segunda implementação TS nasceria — e o critério já errou uma vez por olhar só a etapa (o knockout
   preserva `etapa_atual='inscricao'`). `encerrada_a_pedido_em` fica **fora** do critério de propósito,
   com teste que trava essa decisão: retirada a pedido segue comparável (Invariante 9 da 45-UI-SPEC).

7. **A proveniência é gravada, devolvida, e o erro da gravação é checado.** `modelo_ia` é
   `result.model` (o modelo REAL do 49-02), não `resolved.model_id` (o configurado) — e o teste
   exerce essa diferença com uma versão datada distinta do alias. `provider='none'` vira `NULL` por
   obrigação do CHECK medido em PROD. Um erro no INSERT agora é 500, **nunca** `{ ok: true }`.

8. **O rótulo `C<n>` ficou amarrado à pessoa.** Ordenação com desempate estável por `candidatura_id`
   (antes, dois empates ficavam na ordem que o Postgres devolvesse — o mesmo pedido podia trocar
   `C1`/`C2` entre execuções) e `posicoes` montado do **mesmo laço** que monta o prompt. O teste não
   confere só a ordenação interna: ele assere que cada `posicoes[C<n>]` aparece no **prompt enviado**
   como `Candidato C<n> (id=…)` — são duas coisas que podem divergir, e é a divergência que trocaria
   as pessoas.

## Passo 1 (D-50) — a varredura P3 re-rodada: 8 lugares medidos como 9

| Lugar | Medido agora | Quem conserta |
|---|---|---|
| `comparativo-candidatos/index.ts:169,172` (+ docblock `:8`, comentário `:168`) | presente | **ESTE plano** |
| `analise-schemas.ts:156` (`.max(10)`) | presente | **ESTE plano** |
| `__tests__/index.test.ts:212` (+ `:229` `length: 11`, `:6`) | presente | **ESTE plano** |
| `TriagemTable.tsx:50` (`COMPARE_MAX`), `:52` (`COMPARE_MIN`), `:214`, `:215`, `:267`, `:391`, `:423`, `:425`, `:6`, `:204` | presente | 49-22 |
| `ComparativoCandidatosPage.tsx:103` **e `:172`** | **DUAS ocorrências** | 49-22 |
| `DecisaoFinalPage.tsx:123,201` | presente | 49-22 |

⚠ **Delta contra o kickoff: um lugar A MAIS.** A varredura C1 #17 registrou
`ComparativoCandidatosPage.tsx:102` — **uma** ocorrência. Medido agora: são **duas** (`:103` e
`:172`, a segunda num handler de refetch), e a linha andou de 102 para 103. Não muda nada neste
plano (as duas são do 49-22), mas é o tipo de subcontagem que faz um plano posterior consertar
metade de um lugar e declarar o teto unificado. Registrado para o 49-22.

**Medição em PROD (só leitura):** `comparative_ranking` tem **exatamente uma** linha
(`b562fbd6-5d6a-492c-bf5a-b6081fc61a71`, semver 1.0.0, `claude-sonnet-4-6`), `is_active=true`,
`is_canary=false`, `max_tokens=3000` — o valor que o portão da migration esperava.

## Varredura de portões (D-56 / CLAUDE.md §«Portões»)

Três smokes citam `prompt_versions`, `max_tokens` ou `comparativo_solicitado`. **Nenhum pina o
`max_tokens` vivo contra uma constante** — ou seja, nenhum reprovaria o conserto correto:

| Smoke | O que ele faz com esses nomes | Este plano o reprova? |
|---|---|---|
| `p45_motor_exclusao_smoke.sql:938-942` | **INSERE** uma linha sintética de `prompt_versions` (com `max_tokens`) como fixture, se não houver nenhuma viva | não — é fixture própria, não vigilância do valor vivo |
| `p47_consol03_consent05_smoke.sql:218,303-316` | assere que a **CONTAGEM** de `prompt_versions` é idêntica antes e depois, comparando com baseline **capturada na própria execução** | não — e é a forma CORRETA (a que o CLAUDE.md recomenda). Este plano faz `UPDATE`, não muda contagem |
| `sec05_08_smokes.sql:91-137` | conta linhas de `comparativo_solicitado` por vaga para provar o escopo de RLS | não — mede visibilidade, não colunas |

**Conferido também o que NÃO existe:** nenhum smoke assere `max_tokens = 3000` para
`comparative_ranking`, nem a lista de colunas de `comparativo_solicitado`. Se houvesse, o primeiro
acusaria «o `max_tokens` de PROD ficou com valor de teste» sobre um conserto legítimo — exatamente o
modo de falha que a Phase 46 documentou.

Para registro, a varredura de FORMA do CLAUDE.md dá **288** linhas hoje (eram 244 em 2026-09-06). O
crescimento é dos smokes do 49-06; nenhum alvo novo deste plano.

## O que este deploy publicou — leia antes de concluir qualquer coisa sobre proveniência

O prompt de execução pediu esta medição explicitamente, e a resposta é **sim**: este deploy levou o
contrato novo do 49-02 a PROD, pela primeira vez, para esta função.

| Marcador do 49-02 | v27 (viva antes) | v28 (viva agora) |
|---|---|---|
| `ai-error-codes` | **0** | 4 |
| `fallback_cause` | **0** | 8 |
| `FALHA_PARSE` | **0** | 7 |
| `emitAuditLossAlert` | **0** | 8 |
| `inputHashDe` | **0** | 5 |
| `anthropic_max_tokens` | **0** | 5 |

A v27 estava **inteiramente** no contrato antigo (o arquivo `ai-error-codes.ts` nem constava do
bundle). Isso importa porque o sintoma de uma EF deixada no contrato velho — proveniência NULL na
tabela de resultado — é **indistinguível** de uma coluna que ninguém preencheu. Para esta função, a
partir da v28, um NULL em `provedor_ia` significa o que deve significar: nenhum provedor foi chamado.

**As outras consumidoras do 49-02 seguem no contrato antigo** (`avaliar-redacao`,
`avaliar-redacao-cultural`, `avaliar-transcricao-entrevista`, `gerar-guia-entrevista`,
`analise-candidato-individual`, `consolidar-decisao-final`) — cada uma é deployada pelo plano que a
toca (D-55 / Pitfall 8). Não deployei nenhuma.

## Deploy (D-52) — a lista de arquivos, conferida À MÃO

O cabeçalho do `efdeploy.cjs` afirma que o script «RECUSA subir se o fechamento divergir da lista
esperada». **Essa checagem não existe no código** (`main()` só imprime a lista) — mesmo achado do
49-03, daí a conferência manual que o D-52 manda:

| Arquivo | v27 (viva) | v28 (nova) |
|---|---|---|
| `functions/_shared/ai-client.ts` | ✓ | 55 065 |
| `functions/_shared/ai-cost.ts` | ✓ | 2 059 |
| `functions/_shared/ai-error-codes.ts` | — | **6 867 (novo no bundle)** |
| `functions/_shared/analise-schemas.ts` | ✓ | 9 294 |
| `functions/_shared/audit-logger.ts` | ✓ | 18 412 |
| `functions/_shared/candidaturaEncerrada.ts` | — | **5 482 (novo no bundle)** |
| `functions/_shared/circuit-breaker.ts` | ✓ | 4 946 |
| `functions/_shared/comparativo-config.ts` | — | **4 976 (novo no bundle)** |
| `functions/_shared/injection-detector.ts` | ✓ | 2 060 |
| `functions/_shared/pii-masker.ts` | ✓ | 3 372 |
| `functions/_shared/prompt-loader.ts` | ✓ | 7 948 |
| `functions/comparativo-candidatos/index.ts` | ✓ | 26 954 |
| `functions/deno.json` | ✓ | import map |

**Exatamente três arquivos MAIS, nenhum a menos** — os nove TS da versão viva estão todos lá. Os 5
que o `<verify>` do plano exige (`comparativo-config`, `candidaturaEncerrada`, `ai-error-codes`,
`ai-client`, `audit-logger`) estão presentes: `fechamento ok`.

## Verification results

| Verify | Resultado |
|---|---|
| portão estático (migration sem `BEGIN`, tokens, `interview_guide` ausente; `comparativo-config` sem import, teto 4; schema usa a constante) | **OK** |
| `node p46apply.cjs migrate …20260922000005…` | **aplicada e escriturada — md5 do ledger BATE (6239 octetos)** |
| `select max_tokens … comparative_ranking … is_active and not is_canary` | **1 linha, 3600** |
| md5 do ledger × md5 do arquivo | `9f36ef6738ca8a265782d563f7af879b` = `9f36ef6738ca8a265782d563f7af879b` |
| `deno test --allow-all supabase/functions/comparativo-candidatos/` | **18 passed, 0 failed** |
| idem + `_shared/__tests__/structured-output-compat.test.ts` | **20 passed, 0 failed** |
| `node efdeploy.cjs comparativo-candidatos --dry-run` \| checagem dos 5 `_shared` | **fechamento ok** (12 arquivos) |
| `node efdeploy.cjs comparativo-candidatos` | **OK · version=28 · status=ACTIVE · verify_jwt=true** |
| `GET .../functions/comparativo-candidatos/body \| grep -ac SEM_ANALISE` | **3** (e `ENCERRADA` 3, `candidaturas_sem_analise` 2, `posicoes` 8) |
| `git log --oneline origin/main..HEAD` | **vazio** |
| `npm run -s lint` (tsc --noEmit) | **89 erros** — teto D-53 é 90, e o **conjunto de mensagens é IDÊNTICO** ao de antes do plano (`diff` sobre as 89 linhas ordenadas, sem posição) |

**Regressão, além do pedido pelo plano:** a suíte Deno inteira das EFs — **630 passed, 0 failed**
(baseline do 49-03: 619) — porque `analise-schemas.ts` é importado por outras EFs e um `.max()`
quebrado não apareceria no subconjunto. E conferido que **nenhum arquivo de `src`, `e2e` ou `scripts`
importa `analise-schemas`, `ComparativeRankingSchema` ou `comparativo-config`** (grep vazio): baixar
o teto do schema não tem consumidor no front ainda — ele chega no 49-22.

## TDD Gate Compliance

`workflow.tdd_mode` é **false**, então o gate não bloqueia. A Task 2 seguiu a disciplina e os
commits estão na ordem:

| Gate | Commit | Estado |
|---|---|---|
| RED | `80245483` `test(49-08): …` | ✓ 13 passed / **5 failed**, todas `AssertionError` |
| GREEN | `963637f3` `feat(49-08): …` | ✓ 18/18 |
| REFACTOR | — | não houve: o bloco novo são ~25 linhas reusando o predicado canônico e a allowlist do idioma vizinho. Inventar um commit de limpeza seria teatro de processo |

**RED medido**, com o artefato TAP guardado: **18 testes descobertos, 13 passam, 5 reprovam** — e os
5 são exatamente os alvo, cada um em `AssertionError: Values are not equal`. Não foi erro de
carregamento de módulo, não foi descoberta vazia: **não é INVALID_RED (#3770)**. Os nomes:

- `49-08 / JORN-32 — uma candidatura de OUTRA vaga → 403 …` (saía 400 `MIXED_VAGA`)
- `49-08 / JORN-32 — id INEXISTENTE recebe o MESMO 403 …`
- `49-08 / D-34 — knockout (inscricao/rejeitado) → 400 ENCERRADA …` (saía **200**: o comparativo rodava)
- `49-08 / D-34 — candidatura elegível SEM análise → 400 SEM_ANALISE …`
- `49-08 — ids repetidos → 400 VALIDATION` (saía 400 `MIXED_VAGA`)

⚠ **Dois dos casos do `<behavior>` já passavam no RED, por construção** — a retirada a pedido e o
`MIXED_VAGA` de defesa em profundidade. Eles não descrevem comportamento novo: descrevem o que o
conserto **não pode** quebrar. Registrado para não parecer que seis asserções ficaram verdes de graça.

A Task 1 é `type="tracer"` e foi executada como produção (commit `b3f320b3`), sem fase RED própria —
é o que o tipo prescreve.

## Findings

**`gsd-tools check tdd-red-evidence` não classifica um run Deno, e nenhuma evidência foi sintetizada
para contornar isso.** Executado contra o registro real deste RED, ele devolveu
`INVALID_RED / invalid_record` com `tests: 0, pass: 0, fail: 0` — **sobre um run cujo TAP diz
`1..18` e traz 5 linhas `not ok`**. O checker casa `/^# tests (\d+)/m`, `/^# pass …/`, `/^# fail …/`,
que são os contadores do `node:test`; o reporter TAP do Deno não os emite. Ele também ignorou os
campos `exit_code` e `failing_test` do registro (nomes diferentes dos que espera).

Escrever aquelas três linhas `#` à mão dentro do campo `output` faria o checker devolver
`RED_EVIDENCE_OK` — e **seria forjar o artefato que o checker existe para ler**, transformando uma
verificação de máquina num auto-relato fantasiado de verificação. Não foi feito. Este é o **segundo**
plano da fase a medir o mesmo limite (o 49-03 é o primeiro): o veredito honesto é que **o gate é
inaplicável neste runtime**, não «aprovado».

**`p46apply.cjs migrate` recusa reaplicar — e isso mudou como o portão do tracer foi re-verificado.**
O `<verify>` #1 da Task 1 termina em `node p46apply.cjs migrate <arquivo>`; re-rodá-lo literalmente
sai não-zero com «version 20260922000005 JÁ está no ledger. Recusando reaplicar». Isso é o script
protegendo o estado, não o trabalho falhando. A re-verificação do portão do tracer trocou aquele
passo pela afirmação **mais forte** que ele produz: o md5 do `statements[1]` lido de volta do ledger
contra o md5 do arquivo em disco (batem), somado à leitura do `max_tokens` vivo. «Aplicado» e
«escriturado» são afirmações diferentes, e é a segunda que costuma ser o defeito.

## Deviations from Plan

### Auto-fixed / acrescentado

**1. [Rule 2 - Funcionalidade crítica ausente] Portão de CARDINALIDADE na migration**

- **Found during:** Task 1, Passo 3
- **Issue:** o analog `20260906000003` (e a forma que o plano manda copiar) confere o **valor**
  esperado e a pós-condição, mas não a **quantidade de linhas atingidas**. O `UPDATE … WHERE
  call_type = 'comparative_ranking' AND is_active` atinge um CONJUNTO: com duas linhas ativas (um
  canário mal promovido, por exemplo) as duas seriam editadas, e tanto a guarda (`SELECT … INTO`,
  que pega uma linha arbitrária) quanto a pós-condição (`NOT EXISTS`, que basta uma) passariam.
- **Fix:** `count(*) IS DISTINCT FROM 1 ⇒ RAISE EXCEPTION`, antes de tudo.
- **Files modified:** `supabase/migrations/20260922000005_p49_comparativo_max_tokens.sql`
- **Verification:** medido antes do apply que há exatamente 1 linha ativa; o apply passou.
- **Commit:** `b3f320b3`

**2. [Processo] A checagem de ids repetidos ficou antes do que o plano sugeria**

- **Found during:** Task 2
- **Issue:** o plano lista «ids repetidos ⇒ VALIDATION» depois de «ler `candidaturas`». Nessa ordem,
  a comparação `cands.length !== ids.length` dispara **primeiro** para um corpo com repetidos — e a
  recusa sai como **403 «Acesso negado.»**, um diagnóstico falso sobre um pedido apenas malformado.
- **Fix:** a checagem é a primeira instrução do bloco novo, antes da leitura. Continua **depois** da
  posse da vaga, deliberadamente: um RH que não é dono da vaga recebe 403 e não fica sabendo se o
  corpo dele estava bem formado.
- **Files modified:** `supabase/functions/comparativo-candidatos/index.ts`
- **Verification:** teste `49-08 — ids repetidos → 400 VALIDATION`, que reprovava no RED com
  `MIXED_VAGA`.
- **Commit:** `963637f3`

**3. [Processo] Uma asserção a MAIS mudada de propósito, além de `:191-259`**

- **Found during:** Task 2
- **Issue:** o D-56 autoriza mudar `:191-259`. O teste do caminho feliz
  (`TRIAGEM-03 — happy path …`, fora daquele intervalo) não mudou, mas o **mock compartilhado** que
  ele usa mudou em três pontos: `model` na resposta do Anthropic, a tabela `candidaturas` e o
  registro de tabelas lidas. Os defaults foram escolhidos para que **nenhum teste anterior precisasse
  de edição** (as candidaturas são derivadas das análises: mesma vaga, etapa de trabalho, em
  andamento) — e de fato nenhum precisou.
- **Fix:** registrado aqui em vez de silenciado. Mudança de infraestrutura de teste, não de asserção.
- **Files modified:** `supabase/functions/comparativo-candidatos/__tests__/index.test.ts`
- **Verification:** os 7 testes pré-existentes seguem verdes; 630/0 na suíte inteira.
- **Commit:** `80245483`

**4. [Rule 3 - Blocker instrumental] O `<verify>` #1 da Task 1 e o #3 da Task 2 não re-rodam como escritos**

- **Found during:** portão do tracer (Task 1) e fechamento (Task 2)
- **Issue:** os dois embutem uma **ação de escrita** no comando de verificação — `p46apply.cjs
  migrate` num, `efdeploy.cjs` (sem `--dry-run`) no outro. Re-rodar o primeiro sai não-zero por
  desenho do script; re-rodar o segundo criaria uma **version 29** idêntica à 28, poluindo o
  histórico de deploy para não provar nada novo.
- **Fix:** cada um foi re-verificado pelo seu **resultado**, que é a afirmação mais forte: md5 do
  ledger × md5 do arquivo + `max_tokens` vivo (no lugar do re-apply); a saída `efdeploy: OK ·
  version=28 · verify_jwt=true` já capturada + os marcadores lidos do bundle vivo + `origin/main..HEAD`
  vazio (no lugar do re-deploy). Nenhum arquivo tocado.
- **Files modified:** nenhum
- **Verification:** todas as três asserções do `<verify>` #3 estão satisfeitas e registradas na
  tabela de Verification results.
- **Commit:** nenhum (não houve mudança de arquivo)

---

**Total deviations:** 4 (1 × Rule 2, 1 × Rule 3, 2 de processo). **Impact:** nenhum no
comportamento entregue. Vale nomear a família da 4: **um comando de verificação que executa uma
escrita não é idempotente e, por isso, não é re-rodável** — e um portão que não se pode re-rodar é
um portão que só morde uma vez. Nos dois casos o conserto foi verificar o resultado, nunca repetir a
escrita.

### Fora de escopo, registrado e NÃO tocado

- `resend-webhook.test.ts` continua abortando ao resolver `npm:svix@1.99.1` (ausente do
  `node_modules`). Pré-existente, sem relação com este plano, já em `WINDOWS.md` — excluído das
  rodadas de suíte, como o prompt instruiu. Não «consertado» (Scope Boundary).
- O bloco de contexto `Vaga: <uuid>` do prompt (varredura C7 #3) segue como está: o comparativo não
  tem rubrica, e o plano marca isso como escopo deliberado.
- O front (`TriagemTable`, `ComparativoCandidatosPage`, `DecisaoFinalPage`) e o mapeamento de
  `MIXED_VAGA` em `triagemService.invokeComparativo` **não foram tocados** — são do 49-13/49-22
  (D-55). Os campos novos da resposta são aditivos: o bundle publicado ignora o que não conhece.

## Known Stubs

**Nenhum.** Varridos os 5 arquivos por `TODO|FIXME|placeholder|coming soon|not available`: o único
acerto é a palavra portuguesa «TODO usuário RH» num comentário pré-existente
(`index.ts:190`), onde «TODO» é o quantificador, não um marcador. Nenhum valor vazio codificado,
nenhum componente sem fonte de dados, nenhum caminho não fiado: `posicoes`, `provedor_ia`,
`modelo_ia` e `fallback_cause` têm valor real em todos os caminhos, e `null` aparece só onde `null`
é a verdade (`fallback_cause` sem fallback; `provedor_ia` quando nenhum provedor foi chamado).

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. Nenhum endpoint novo, nenhum
caminho de auth novo, nenhuma mudança de esquema em fronteira de confiança. O plano **remove**
superfície:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-08-01 (IDOR: análises de outra vaga) | mitigate | posse por candidatura contra `body.vaga_id`, com teste de **zero** leituras de `analise_candidato_vaga` e zero IA na recusa |
| T-49-08-02 (oráculo de existência) | mitigate | inexistente e alheia recebem o MESMO 403/«Acesso negado.», com teste para cada |
| T-49-08-03 (ranking sem proveniência / auditoria perdida) | mitigate | `provedor_ia`/`modelo_ia` com erro CHECADO (teste de 23502 ⇒ 500) e o modelo REAL asserido contra o configurado |
| T-49-08-04 (saída acima do tempo) | mitigate **parcialmente** | teto 4 + `max_tokens` 3600 aplicados; a **prova n=4** é do 49-18 (ver o item de juízo no `coverage`) |
| T-49-08-05 (rótulo C{n} trocado por posição) | mitigate | desempate estável + `posicoes` asserido contra o prompt ENVIADO |
| T-49-08-SC (supply chain) | mitigate | **zero instalação de pacote**; nenhum import novo de rede. `comparativo-config.ts` tem zero imports por contrato, com portão próprio |

## Issues Encountered

- **`tsc` em 89 contra teto 90 (D-53): margem de UM para os 16 planos restantes.** Este plano não
  acrescentou nenhum erro (os arquivos tocados são Deno/EF, fora do `include` do `tsconfig.json`) e o
  **conjunto de mensagens é idêntico** ao de antes — conferido por `diff`, não só pela contagem.
  O aviso do 49-01/49-02 segue válido e mais apertado.
- **O teto de 4 repousa em aritmética, não em medição.** Está registrado como juízo no `coverage` e é
  o 49-18 que fecha. Se a saída real de n=4 passar de 3140 tok, o teto volta ao operador.
- **`MIXED_VAGA` ficou sem consumidor correto no front até o 49-13.** O `triagemService` mapeia
  `MIXED_VAGA` para «pertencem a vagas diferentes»; os códigos novos (`ENCERRADA`, `SEM_ANALISE`)
  cairão no fallback genérico até aquele plano. É pior que o alvo e **melhor que antes**: hoje a
  mensagem específica era FALSA nos casos comuns; a genérica ao menos não mente.

## Next

Plano 49-09. O que este plano deixa pronto para quem vem depois:

- **49-13** (selo de proveniência + PDF): `provedor_ia`, `modelo_ia`, `fallback_cause` e `posicoes`
  na resposta; e o mapeamento de `ENCERRADA`/`SEM_ANALISE` em `triagemService.invokeComparativo`.
- **49-14** (motor de exclusão, D-63): o formato `Candidato C<n> (id=<candidatura_id>)` está fixado
  por teste — é por esse token que a redação acha as linhas `comparative_ranking` do titular.
- **49-18** (prova em PROD): mede n=4 e fecha a premissa A3.
- **49-22** (front): importa `COMPARATIVO_MAX/MIN_CANDIDATOS` por caminho relativo. ⚠ São **nove**
  lugares, não oito — `ComparativoCandidatosPage.tsx` tem duas ocorrências (`:103` e `:172`).

## Self-Check: PASSED

- `supabase/functions/_shared/comparativo-config.ts` — FOUND
- `supabase/migrations/20260922000005_p49_comparativo_max_tokens.sql` — FOUND
- `supabase/functions/_shared/analise-schemas.ts` · `comparativo-candidatos/index.ts` ·
  `comparativo-candidatos/__tests__/index.test.ts` — FOUND
- commits `b3f320b3`, `80245483`, `963637f3` — os três FOUND em `git log --all`, e os três já em
  `origin/main`
- `commits: 3` **MEDIDO** por `git rev-list --count 47b58cc2..HEAD`, não narrado; `plan_head_before`
  registrado
- nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio); nenhum arquivo untracked
- `<acceptance_criteria>` das 2 tasks re-executados: verdes (constante sem import com teto 4; schema
  e EF usando-a; `max_tokens` 3600 em PROD; os 6 casos do `<behavior>` com teste; os testes
  `:191-259` mudados com comentário de proveniência; o dry-run com os 5 `_shared`; EF viva com
  `verify_jwt=true` e `SEM_ANALISE` no bundle; `origin/main..HEAD` vazio)
- `<verification>` de plano re-executada: `max_tokens` 3600; 20/0 na EF + `structured-output-compat`;
  version=28 ACTIVE verify_jwt=true; fechamento conferido arquivo a arquivo contra a v27; marcadores
  lidos do bundle vivo; push confirmado
