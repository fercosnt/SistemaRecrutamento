---
phase: 49-consertos-da-jornada-bloco-2
plan: 09
subsystem: edge-functions
tags: [redacao, fit-cultural, bars, jorn-07, d-24, d-26, d-28, rubrica, deno, deploy]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "`redacoes_candidato.rubrica_versao`, `.provedor_ia`, `.modelo_ia` vivas e NULÁVEIS em PROD — conferidas no catálogo ANTES do deploy (Pitfall 8). O CHECK `redacoes_candidato_provedor_ia_check`, medido aqui, é o que OBRIGA a mapear `provider='none'` para NULL"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`CallAiResult.model` (o modelo REAL) e `.fallback_cause` — a proveniência que esta EF grava. ⚠ Este deploy é o PRIMEIRO a levar o contrato novo do 49-02 a PROD para ESTA função (ver §«O que este deploy publicou»)"
provides:
  - "`supabase/functions/_shared/bars-redacao.ts` — `RUBRICA_REDACAO_VERSAO = 'bars-prd-1.1'`, `DIMENSOES_REDACAO` (4 dimensões × 5 âncoras), `montarBlocoRubricaRedacao`, `validarDimensoesRedacao`, `normalizarNomesDimensoes`, `VALORES_BEAUTY_SMILE`, `DIMENSAO_REDACAO_POR_CHAVE`. ZERO IMPORTS — a fonte única do modelo e (no 49-15) da tela"
  - "flag `dimensoes_invalidas` em `redacoes_candidato.flags` — conjunto de `dimension` que não é {D1,D2,D3,D4} sem repetição ⇒ revisão humana SEM score"
  - "`redacoes_candidato.rubrica_versao` / `.provedor_ia` / `.modelo_ia` ESCRITAS; `model_version` passa a receber o modelo REAL"
  - "EF `avaliar-redacao-cultural` version=15 em PROD, `verify_jwt=true` — e com ela o contrato `ai-client`/`audit-logger` do 49-02 no ar para esta função"
affects: [49-15, 49-18, 49-23]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 17636
  tasks: 1
  commits: 2
  plan_head_before: 0b07296879ee575464a5fce7bde23093592aef04
  # `commits: 2` MEDIDO por `git rev-list --count 0b072968..HEAD` no instante da escrita
  # deste SUMMARY (d536e242, eb23b731) — os dois de PRODUÇÃO, nenhum de metadado.
  # Re-medir DEPOIS do commit de metadado deste plano dá 3, por construção (o
  # `plan_head_before` é anterior a ele). A fronteira é esta; produção é 2.
  # `tokens: 17636` = 70 545 octetos de `git diff 0b072968..HEAD -- supabase` ÷ 4.
  estimate_tokens_do_plano: 60000
  # O plano estimou 60 000 e o realizado foi 17 636 — 3,4× ABAIXO. É a QUARTA amostra
  # do mesmo padrão nesta fase (01: 8k/?, 02: 27k/120k, 08: 15k/90k, 09: 17,6k/60k) e a
  # razão é a mesma: o peso destes planos é LEITURA (a EF de 445 linhas, o doc BARS de
  # 179, o PRD, o ai-client de 1152, o efdeploy) e MEDIÇÃO em PROD (catálogo, CHECK,
  # prompt_versions, as 2 redações, os 11 códigos, o bundle vivo) — nada disso aparece
  # no diff. `confidence: low` era honesto. ⚠ Uma calibração que só olhasse a média das
  # quatro subestimaria o custo de CONTEXTO destes planos por um fator ~4.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "rubrica como CONSTANTE versionada e sem imports, consumida pela EF e (depois) pelo front — com a versão GRAVADA na linha de resultado, porque mudar a rubrica muda o que a nota significa"
    - "bloco de prompt AUTOEXPLICATIVO: quem o transporta (`callAi`) não acrescenta rótulo nem ordenação, então todo cabeçalho que dá sentido ao texto mora dentro do builder"
    - "validação PÓS-PARSE do CONJUNTO de chaves devolvido, porque `z.enum` + `.length(n)` garante vocabulário e contagem mas NÃO distinção"
    - "o rótulo vem da CHAVE, não do que o modelo devolveu: `dimension_name` gravado é o da constante, para a chave que o modelo usou"
    - "teste que assere contra o bloco ENVIADO ao provedor (`messages.parse` capturado), não contra o que a EF calculou por dentro"
    - "mutação que não morde é medida e NOMEADA, e o portão é consertado para poder falhar — não é declarada aprovada"

key-files:
  created:
    - supabase/functions/_shared/bars-redacao.ts
    - supabase/functions/_shared/__tests__/bars-redacao.test.ts
  modified:
    - supabase/functions/_shared/essay-schemas.ts
    - supabase/functions/avaliar-redacao-cultural/index.ts
    - supabase/functions/avaliar-redacao-cultural/index.test.ts

key-decisions:
  - "A pergunta vai como `Pergunta: <texto>`, SEM o `perguntas_redacao.codigo`. Medido: os 11 códigos vivos são C1,C2,C3,**D1,D2,D3**,F1,PADRAO_BS,R1,R2,R3 — TRÊS colidem com as chaves das dimensões. Escrever «Pergunta (D1)» no mesmo bloco que define a dimensão D1 é pedir ao modelo para desambiguar duas coisas que nada distingue (C7 #8). O código não serve ao scoring."
  - "`model_version` passa a receber `result.model` e NULL quando nenhum modelo respondeu, em vez de carimbar o configurado. Um NULL diz «não se sabe»; `claude-sonnet-4-6` numa linha que o `gpt-4o-mini` produziu é uma afirmação FALSA — e era o registro que existia."
  - "A linha de dimensões inválidas grava a proveniência (`rubrica_versao`, `provedor_ia`, `modelo_ia`) mas NÃO grava `analise_ia`. A rubrica FOI enviada e o modelo respondeu, então a proveniência é conhecida; a análise, porém, não é análise sob esta rubrica, e gravá-la em `analise_ia` a faria aparecer como válida para todo leitor futuro (inclusive a consulta `where analise_ia is not null`, que foi como as 2 redações antigas foram medidas)."
  - "O motivo da recusa entra no log redigido, NÃO na lista de `flags`. A flag é vocabulário que o front lê; empilhar texto livre nela contaminaria o vocabulário para dar diagnóstico a um humano que o log já serve."
  - "O comentário de `essay-schemas.ts` NÃO cita a frase falsa verbatim. Citá-la para registro histórico a deixaria encontrável no mesmo arquivo — e o portão estático deste plano procura exatamente por ela. Descoberto por EXECUÇÃO: o portão reprovou o meu próprio texto (ver Deviations 1)."
  - "Few-shot NÃO entrou (RESEARCH §F.1) e `max_tokens` NÃO foi tocado. O bloco novo alonga o PEDIDO (8476 octetos, ~2037 tok, cacheado), não necessariamente a saída; e `max_tokens` é teto de SAÍDA. A saída real sob a rubrica nova é do 49-18."

patterns-established:
  - "Commit ANTES de mutar. `git checkout -- <arquivo>` restaura para o HEAD, não para o trabalho não-commitado: a primeira rodada de mutações APAGOU as alterações da EF que ela existia para testar. A prova de mordida é barata; refazer o trabalho não é."
  - "Uma mutação que não compila não é um portão ausente — é uma mutação inválida. `if (false && x)` quebra o narrowing do TS e o run aborta sem executar teste nenhum; a ausência de saída é indistinguível de «nada reprovou» se ninguém ler o erro."
  - "Checagem redundante é portão incapaz de falhar. Num array de tamanho 4 sobre vocabulário de 4, toda repetição implica uma chave faltando: o VEREDITO é redundante, só o MOTIVO não é. Pinar o motivo é o que devolve a mordida."

requirements-completed: [JORN-07, JORN-28]

# Coverage (#1602)
coverage:
  - deliverable: "A rubrica BARS do PRD v1.1 numa constante versionada sem imports — 4 dimensões, âncoras 5→1 transcritas, os 2 caps, e os 4 valores BS DENTRO da D4"
    requirement: JORN-07
    human_judgment: false
    verification:
      - kind: test
        ref: "bars-redacao.test.ts#49-09 / D-24 — as 4 dimensões, nomes e rótulos do PRD, e NENHUM valor BS é rótulo de dimensão"
        status: pass
      - kind: test
        ref: "bars-redacao.test.ts#49-09 — toda dimensão tem as 5 âncoras (1..5), não-vazias e distintas"
        status: pass
      - kind: command
        ref: "node -e <portão estático> — sem `import`, contém bars-prd-1.1 e os 4 rótulos → OK"
        status: pass
  - deliverable: "O bloco ENVIADO ao modelo contém os 4 rótulos e as âncoras 5→1, é autoexplicativo, e leva a pergunta SEM o código"
    requirement: JORN-07
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-09 / JORN-07 — `system[1].text` capturado do `messages.parse` é EXATAMENTE o bloco da constante, com os 4 rótulos e as 20 âncoras"
        status: pass
      - kind: test
        ref: "index.test.ts#49-09 / C7 #8 — `Pergunta: <texto>` presente; `Pergunta (` e o `codigo` ausentes"
        status: pass
      - kind: test
        ref: "bars-redacao.test.ts#49-09 — âncoras em ordem 5→1; bloco autoexplicativo (4 cabeçalhos `##`); builder puro"
        status: pass
      - kind: other
        ref: "mutação M1 (bloco volta a ser só a pergunta) ⇒ 3 reprovados; M7 (âncoras 1→5) ⇒ 1 reprovado"
        status: pass
  - deliverable: "T-49-09-01: conjunto de `dimension` ≠ {D1,D2,D3,D4} sem repetição ⇒ revisão humana com `dimensoes_invalidas`, SEM score, nunca gravada como concluída"
    requirement: JORN-07
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-09 / T-49-09-01 — FORA do vocabulário (D5), REPETIDA (D1,D1,D3,D4) e AUSENTE (só 3): flag `dimensoes_invalidas`, sem `score_ponderado_0_100`, sem cor, sem `analise_ia`"
        status: pass
      - kind: test
        ref: "bars-redacao.test.ts#49-09 — 7 formas de conjunto inválido recusadas com motivo; entrada malformada nunca lança"
        status: pass
      - kind: test
        ref: "bars-redacao.test.ts#49-09 — a recusa NOMEIA a causa certa (repetida ≠ ausente ≠ fora do vocabulário)"
        status: pass
      - kind: other
        ref: "mutação M2 (bloco de recusa removido) ⇒ 3 reprovados; M8 (checagem de repetição desativada) ⇒ 1 reprovado APÓS o conserto do portão"
        status: pass
  - deliverable: "D-24: o `dimension_name` gravado em `analise_ia` é o da CONSTANTE, não o que o modelo devolveu"
    requirement: JORN-07
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-09 / D-24 — os 4 nomes que o Sonnet REALMENTE devolveu em PROD entram e saem como especificidade/acao/aprendizado/alinhamento_valores; chaves e scores intactos"
        status: pass
      - kind: test
        ref: "bars-redacao.test.ts#49-09 / D-24 — `normalizarNomesDimensoes` não muta a entrada"
        status: pass
      - kind: other
        ref: "mutação M3 (normalização removida) ⇒ 1 reprovado"
        status: pass
  - deliverable: "D-26 / D-28: cada redação avaliada grava `rubrica_versao`, `provedor_ia` e `modelo_ia` REAIS, e `model_version` = o modelo que de fato respondeu"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-09 / D-26 + D-28 — rubrica_versao='bars-prd-1.1', provedor_ia='anthropic', modelo_ia=model_version=o modelo real"
        status: pass
      - kind: test
        ref: "index.test.ts#49-09 / D-28 — no FALLBACK a linha grava `gpt-4o-mini-2024-07-18` (versão DATADA), asserido como DISTINTO do `model_id` configurado; e o fallback recebe a MESMA rubrica"
        status: pass
      - kind: test
        ref: "index.test.ts#49-09 / D-28 — `provider='none'` (injeção detectada) ⇒ `provedor_ia`, `modelo_ia` e `model_version` NULL"
        status: pass
      - kind: integration
        ref: "CHECK `redacoes_candidato_provedor_ia_check` lido em PROD: NULL | 'anthropic' | 'openai' ⇒ o mapeamento de 'none' para NULL é obrigação, não gosto"
        status: pass
      - kind: other
        ref: "mutação M4 (model_version volta ao configurado) ⇒ 2 reprovados; M6 (provider cru) ⇒ 1 reprovado"
        status: pass
  - deliverable: "C6 #6: os dois upserts destruturam o erro e nunca devolvem `{ ok: true }` depois de escrita falha"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-09 / C6 #6 — upsert da redação AVALIADA com erro ⇒ 500 SERVER_ERROR"
        status: pass
      - kind: test
        ref: "index.test.ts#49-09 / C6 #6 — upsert do caminho de REVISÃO HUMANA com erro ⇒ 500 também"
        status: pass
      - kind: other
        ref: "mutação M5 (os dois `if (upsertErr) throw` desativados) ⇒ 2 reprovados"
        status: pass
  - deliverable: "RNF-07a intacto: nenhuma mudança rejeita candidato por score; toda redação segue para revisão humana"
    requirement: JORN-07
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#RNF-07a (pré-existente) + #49-09 / RNF-07a — dimensões inválidas não tocam `candidaturas` e o payload segue `{ ok: true }` neutro"
        status: pass
      - kind: test
        ref: "os 13 testes pré-existentes da EF seguem verdes sem edição de asserção"
        status: pass
  - deliverable: "A EF está VIVA em PROD com o conserto (não só no disco), e os dois canais (EF e git) estão em dia"
    human_judgment: false
    verification:
      - kind: command
        ref: "node efdeploy.cjs avaliar-redacao-cultural → «OK · version=15 · status=ACTIVE · verify_jwt=true»; lido de volta da Management API"
        status: pass
      - kind: command
        ref: "GET /functions/avaliar-redacao-cultural/body → bars-prd-1.1 ×4, bars-redacao ×13, montarBlocoRubricaRedacao ×4, validarDimensoesRedacao ×5, dimensoes_invalidas ×4, rubrica_versao ×7 (todos 0 na v14)"
        status: pass
      - kind: command
        ref: "git log --oneline origin/main..HEAD → vazio (push executado)"
        status: pass
  - deliverable: "A saída real do modelo sob a rubrica nova (~2037 tok de input a mais) contra o `max_tokens` de 2500"
    human_judgment: true
    rationale: "Nenhuma redação foi avaliada pela v15 ainda — a rubrica está no ar, mas ninguém a exercitou. `max_tokens` é teto de SAÍDA e o bloco novo alonga o PEDIDO, então a aritmética diz que não há risco direto; o que NÃO está medido é se uma rubrica rica faz o modelo escrever `reasoning` mais longo por dimensão e se aproximar dos 2500 (a maior saída medida foi 1253 tok, 50 %). A prova é do 49-18. Registrado em WINDOWS 54 como juízo, para que a aritmética não passe por medição."
  - deliverable: "A tela do RH mostra o rótulo CERTO para o que a IA mediu"
    human_judgment: true
    rationale: "NÃO fechado por este plano, e ficou mais agudo por causa dele: a EF agora mede «Especificidade da situação» na D1, e `RedacaoReviewPanel.tsx:47` / `RedacaoOverrideForm.tsx:45` rotulam a D1 como «Experiência UAU». Toda redação avaliada entre este deploy e o plano 49-15 aparece com o rótulo ERRADO — um número correto sob uma legenda falsa. É o D-25, é do 49-15 (que importa ESTA constante), e está em WINDOWS 52."

# Metrics
duration: 58 min
completed: 2026-09-22
tasks: 1
files: 5
---

# Phase 49 Plano 09: A rubrica da redação passa a existir no input Summary

**O prompt mandava «use as âncoras BARS fornecidas no input» e o input levava só a pergunta —
as dimensões viviam num `user_template` que nenhum provedor jamais recebeu. O modelo inventava
os nomes das 4 dimensões, e inventou DIFERENTE nas 2 redações já avaliadas. Agora a rubrica do
PRD v1.1 vai ao modelo por uma constante versionada, o conjunto de chaves devolvido é validado
pós-parse (fora de {D1..D4} ⇒ revisão humana sem score), o `dimension_name` gravado é o da
constante, e cada linha registra qual rubrica e qual modelo a produziu. Version 15 viva em PROD.**

## Performance

- **Duration:** 58 min
- **Started:** 2026-09-23T00:14Z
- **Completed:** 2026-09-23T01:12Z
- **Tasks:** 1 / 1
- **Files:** 5 (2 criados, 3 modificados)
- **Testes:** 13 → 25 no arquivo da EF, + 15 novos na constante; suíte das EFs 630 → **657**, sempre 0 falhas

## O que estava errado — medido, não inferido

**A rubrica não existia no input.** O prompt ativo `culture_fit_essay` (2257 octetos de
`system_template`, `is_active`, sem canário) diz literalmente «Use as âncoras BARS fornecidas no
input». O `vagaRubricBlock` que a EF passava era:

```
Pergunta (PADRAO_BS): <texto>
Valor primário: multi
```

As dimensões existiam em UM lugar: o placeholder `{{BARS_RUBRIC_DIMENSIONS}}` do `user_template`
da linha de `prompt_versions`. Medido: `culture_fit_essay` é o **único** `call_type` cujo
`user_template` contém esse placeholder — e `ResolvedPrompt` não tem `user_template`, então ele
nunca é enviado a provedor nenhum. O placeholder nunca foi substituído por nada.

**A consequência, nas 2 redações avaliadas em PROD** (lidas só nas chaves e nomes, sem o texto):

| | D1 | D2 | D3 | D4 |
|---|---|---|---|---|
| redação A | Cuidado e Empatia com o Outro | Resolução Criativa e Proatividade | Aprendizado e Melhoria Contínua | Consideração de Perspectivas e Trade-offs |
| redação B | Cuidado e Empatia com o Outro | **Ownership e Protagonismo Individual** | Aprendizado e Melhoria Contínua | **Consideração de Trade-offs e Perspectivas Divergentes** |

As chaves `D1..D4` bateram — o `z.enum` do schema as força. O que cada chave **MEDIA** era escolha
do modelo, chamada a chamada, e mudou entre duas redações do mesmo sistema. A nota consolidada
0-100 e o cap `D1 ≤ 2` («situação genérica ou inventada») foram aplicados sobre dimensões que nada
garantia serem as da rubrica escrita — que é a que o RH lê na tela de revisão.

**E o `model_version` mentia.** As duas linhas gravaram `claude-sonnet-4-6`, que é o modelo
CONFIGURADO (`resolved.model_id`), não o que respondeu. Numa chamada que caísse no fallback, a
linha diria Sonnet para uma saída do `gpt-4o-mini`.

## Passo 1 (D-50) — a varredura C7 re-rodada: delta de DOIS achados

Padrões do `49-VARREDURA-KICKOFF.md` §C7, re-executados:

| # do kickoff | Onde está hoje | Delta | Quem conserta |
|---|---|---|---|
| 1 | `avaliar-redacao-cultural/index.ts:254` (era `:244-254`) | linha andou | **ESTE plano** |
| 2 | `avaliar-redacao/index.ts:256` | idem | 49-23 |
| 3 | `comparativo-candidatos/index.ts:**409**` (era `:260`) | **linha andou 149** — o 49-08 inseriu código acima | escopo deliberado |
| 4 | `gerar-devolutiva-bigfive/index.ts:791` | idem | escopo deliberado (IA desligada) |
| 5 | `avaliar-transcricao-entrevista/index.ts:237` | idem | escopo deliberado (o precedente certo) |
| — | **`gerar-guia-entrevista/index.ts:267`** (`vagaRubricBlock: barsRubricBlock`) | **NÃO consta da tabela C7 do kickoff** | 49-10/49-11 |
| 6 | `RedacaoReviewPanel.tsx:47`, `RedacaoOverrideForm.tsx:45` | idem | 49-15 (D-25) |
| 7 | `ComparativoCandidatosPage.tsx:71`, `DecisaoFinalPage.tsx:72` | idem | 49-22 |
| 8 | `perguntaBlock` com `Pergunta (${codigo})` | presente | **ESTE plano** |

**Dois deltas registrados:**

1. **Um sexto sítio de `vagaRubricBlock` que a tabela C7 não lista:** `gerar-guia-entrevista:267`.
   O grep do kickoff devolve **9** linhas com `vagaRubricBlock:`, e a tabela classifica 5 EFs. Não
   muda nada aqui (é do 49-10/49-11), mas é o tipo de subcontagem que faz um plano posterior
   declarar uma varredura fechada com um sítio fora dela.

2. **Os códigos de `perguntas_redacao` são 11, não 9.** O kickoff registra
   `codigo ∈ {C1..C3, D1..D3, F1, PADRAO_BS, R1}`; medido em PROD:
   `C1,C2,C3,D1,D2,D3,F1,PADRAO_BS,R1,**R2,R3**`. A conclusão não muda — e é a que importa: **três
   códigos (D1, D2, D3) colidem com as chaves das dimensões.**

**SQL do C7, re-executado:** `culture_fit_essay` é o único `call_type` com
`{{BARS_RUBRIC_DIMENSIONS}}` no `user_template` (7 outros: false). **Delta zero.**

## Accomplishments

1. **A rubrica existe, é versionada e tem uma fonte só.** `_shared/bars-redacao.ts` (**zero
   imports por contrato**, molde de `email-config.ts:12-17`) transcreve de
   `bars-redacao-4-dimensoes.md` **v1.1** as 4 dimensões do PRD — D1 Especificidade da situação ·
   D2 Ação demonstrada · D3 Aprendizado/Reflexão · D4 Alinhamento com os valores Beauty Smile — com
   as **20 âncoras** (5→1 por dimensão) verbatim, incluindo os exemplos entre aspas, que são o que
   torna a âncora comportamental em vez de abstrata. `RUBRICA_REDACAO_VERSAO = 'bars-prd-1.1'`.

   **Os 4 valores Beauty Smile estão DENTRO da D4** (`VALORES_BEAUTY_SMILE`), e o bloco diz isso ao
   modelo em voz alta: «os 4 valores são o OBJETO da dimensão D4 — eles não são as dimensões».

2. **O bloco é autoexplicativo, porque ninguém o rotula depois.** `callAi` passa o texto LITERAL
   como 2º bloco de system (Anthropic, `cache_control: ephemeral`) ou concatenado com `\n\n` ao
   `system_template` (fallback OpenAI) — sem acrescentar cabeçalho nem ordenação. Lido no código que
   monta a chamada antes de escrever a instrução; por isso os 4 cabeçalhos `##` moram no builder.

3. **A pergunta perdeu o código, de propósito.** Três dos 11 códigos vivos são `D1`, `D2` e `D3`.
   «Pergunta (D1)» no mesmo bloco que define a dimensão D1 é ambiguidade construída.

4. **O conjunto de dimensões devolvido é VALIDADO pós-parse.** `z.enum(['D1'..'D4'])` + `.length(4)`
   garante vocabulário e contagem, **não distinção**: `[D1,D1,D3,D4]` passa pelos dois. E
   `compute-score.ts` faz `dims.find(d => d.dimension === 'D1')` e divide a soma por `validDims` —
   com D1 repetido e D2 ausente, a nota sai de uma média sobre a dimensão errada e o cap `D1 ≤ 2`
   incide sobre outra coisa, **com aparência de número legítimo**. Inválido ⇒ revisão humana com a
   flag `dimensoes_invalidas`, sem score, sem cor, sem `analise_ia`.

5. **O rótulo vem da chave.** `dimension_name` gravado é o `nome` da constante para a chave que o
   modelo usou. O teste alimenta os nomes que o Sonnet **realmente** devolveu em PROD e assere que
   saem canônicos — chaves e scores intactos.

6. **A linha diz quem a produziu.** `rubrica_versao`, `provedor_ia` e `modelo_ia` REAIS (do
   `CallAiResult` do 49-02), e `model_version` deixa de ser o configurado. `provider='none'` (teto
   de custo, injeção) vira **NULL**, por obrigação do CHECK medido em PROD — e NULL é a verdade:
   nenhum modelo respondeu. A proveniência é gravada **também** nos caminhos sem score, porque a
   rubrica FOI enviada.

7. **Escrita falha deixou de ser sucesso.** Os dois upserts destruturam `{ error }` e relançam
   (→ 500). Antes, uma gravação que falhasse devolvia `{ ok: true }`: a redação desaparecia e o
   candidato lia «enviado com sucesso» (C6 #6, `:291` e `:346`).

8. **O comentário falso saiu do cabeçalho do contrato.** `essay-schemas.ts:19-21` afirmava que as 4
   chaves eram os 4 valores — a versão **mais autoritativa** do erro no repositório, no arquivo que
   define o schema de saída. O schema não mudou (sem bump de `SCHEMA_VERSIONS`); o comentário de
   `:43`, que já listava os nomes canônicos, ficou.

## Prova de mordida (D-56) — 8 mutações, e as DUAS que não morderam

A metade que importa do D-56 não é «rodei a varredura», é **«provei que o portão morde»**.

| # | Mutação | Reprovados | Quais |
|---|---|---|---|
| M1 | `vagaRubricBlock` volta a ser só a pergunta (o defeito original) | **3** | bloco enviado; pergunta sem código; fallback recebe a rubrica |
| M2 | bloco de recusa pós-parse REMOVIDO | **3** | os três casos de conjunto inválido (D5, repetida, ausente) |
| M3 | normalização do `dimension_name` removida | **1** | D-24 — nome da constante |
| M4 | `model_version` volta ao modelo CONFIGURADO | **2** | fallback; `provider='none'` |
| M5 | erro dos DOIS upserts deixa de ser checado | **2** | os dois C6 #6 |
| M6 | `provider` gravado cru (o `'none'` que o CHECK recusa) | **1** | `provider='none'` ⇒ NULL |
| M7 | âncoras do bloco em ordem 1→5 | **1** | âncoras 5→1 |
| M8 | `validarDimensoesRedacao` deixa de recusar REPETIDA | **0 → 1** | ver abaixo |

### M8 não mordeu, e o motivo é instrutivo

Desativando `if (vistas.includes(chave))`, `[D1,D1,D3,D4]` **ainda** é recusado. Medido, não
inferido:

```
COM a mutação:  {"ok":false,"motivo":"dimension ausente: D2"}
SEM a mutação:  {"ok":false,"motivo":"dimension repetida: D1"}
```

Num array de tamanho 4 sobre um vocabulário de 4, **toda repetição implica uma chave faltando** — a
checagem de completude já fecha o veredito. O `ok:false` é redundante por construção; o que **não**
é redundante é o `motivo`, e nenhum teste o pinava. O veredito nunca esteve em risco (defesa em
profundidade); o **diagnóstico** estava: quem lesse «faltou a D2» iria procurar uma dimensão
ausente quando o defeito é uma duplicada — a mesma família do «diagnóstico falso» que o CLAUDE.md
§«Portões» documenta.

**Conserto:** o teste passou a pinar as três causas (`eb23b731`), e a mutação agora reprova. Um
portão que não pode falhar não vigia nada; declará-lo aprovado seria pior que consertá-lo.

### M2 não mordeu na primeira tentativa — e a ausência de saída não era «nada reprovou»

A primeira forma de M2 (`if (false && !validacaoDims.ok)`) **não compilou**: quebra o narrowing do
TS e `parsedRaw` volta a ser possivelmente `null` (TS18047). O run abortou em type-check, sem
executar teste nenhum — e a saída do harness ficou **vazia**, que é visualmente indistinguível de
«a mutação passou incólume». Só ler o erro distinguiu. Refeita removendo o bloco inteiro, M2
reprova 3.

### Varredura de FORMA nos smokes (contexto, não escopo)

Este plano não acrescenta objeto SQL nem smoke; a varredura de forma do CLAUDE.md não tem alvo novo.
Os testes Deno **são** o portão deste plano, e é por isso que as 8 mutações acima existem.

## O que este deploy publicou — leia antes de concluir qualquer coisa sobre proveniência

A v14 (viva até agora) estava **inteiramente** no contrato antigo. Medido no corpo dos dois bundles:

| Marcador | v14 (antes) | v15 (agora) |
|---|---|---|
| `bars-prd-1.1` | **0** | 4 |
| `bars-redacao` | **0** | 13 |
| `montarBlocoRubricaRedacao` | **0** | 4 |
| `validarDimensoesRedacao` | **0** | 5 |
| `dimensoes_invalidas` | **0** | 4 |
| `rubrica_versao` | **0** | 7 |
| `provedor_ia` / `modelo_ia` | **0** / **0** | 5 / 7 |
| `Especificidade da situação` | **0** | 4 |
| `ai-error-codes` (49-02) | **0** | 4 |
| `fallback_cause` (49-02) | **0** | 7 |
| `FALHA_PARSE` (49-02) | **0** | 7 |
| `emitAuditLossAlert` (49-02) | **0** | 8 |
| `inputHashDe` (49-02) | **0** | 5 |
| `anthropic_max_tokens` (49-02) | **0** | 4 |

**Sim: este deploy levou o contrato do 49-02 a PROD para esta função, pela primeira vez.** É a
segunda EF da fase a fazê-lo (o comparativo, v28, foi a primeira). Isso importa porque o sintoma de
uma EF deixada no contrato velho — proveniência NULL na tabela de resultado — é **indistinguível**
de uma coluna que ninguém preencheu. A partir da v15, um NULL em `redacoes_candidato.provedor_ia`
significa o que deve significar: nenhum provedor foi chamado.

**As outras consumidoras do 49-02 seguem no contrato antigo** (`avaliar-redacao`,
`avaliar-transcricao-entrevista`, `gerar-guia-entrevista`, `analise-candidato-individual`,
`consolidar-decisao-final`) — cada uma é deployada pelo plano que a toca (D-55 / Pitfall 8). Não
deployei nenhuma.

## Deploy (D-52) — o fechamento, conferido À MÃO contra a versão viva

O cabeçalho do `efdeploy.cjs` afirma que o script «RECUSA subir se o fechamento divergir da lista
esperada». **Essa checagem não existe no código** — mesmo achado dos planos 49-03 e 49-08 —, daí a
conferência manual que o D-52 manda:

| Arquivo | v14 (viva) | v15 (nova) |
|---|---|---|
| `functions/_shared/ai-client.ts` | ✓ | 55 065 |
| `functions/_shared/ai-cost.ts` | ✓ | 2 059 |
| `functions/_shared/ai-error-codes.ts` | — | **6 867 (novo no bundle)** |
| `functions/_shared/audit-logger.ts` | ✓ | 18 412 |
| `functions/_shared/bars-redacao.ts` | — | **21 184 (novo no bundle)** |
| `functions/_shared/circuit-breaker.ts` | ✓ | 4 946 |
| `functions/_shared/essay-schemas.ts` | ✓ | 5 234 |
| `functions/_shared/injection-detector.ts` | ✓ | 2 060 |
| `functions/_shared/pii-masker.ts` | ✓ | 3 372 |
| `functions/_shared/prompt-loader.ts` | ✓ | 7 948 |
| `functions/_shared/redacao-schemas.ts` | ✓ | 2 426 |
| `functions/avaliar-redacao-cultural/_local/compute-score.ts` | ✓ | 3 533 |
| `functions/avaliar-redacao-cultural/index.ts` | ✓ | 28 390 |
| `functions/deno.json` (import map) | ✓ | ✓ |

**Exatamente dois arquivos MAIS, nenhum a menos.** ⚠ `deno.json` **não aparece na lista do
`--dry-run`** (o script o anexa depois, `efdeploy.cjs:136`), mas vai no payload e `import_map` está
`true` na v14 e na v15 — conferido nas duas, porque um import map faltando não falha no deploy,
falha na primeira invocação.

## Verification results

| Verify | Resultado |
|---|---|
| `deno test` da EF + constante + `essay-schemas` + `structured-output-compat` | **58 passed, 0 failed** |
| portão estático (sem import; 4 rótulos + `bars-prd-1.1`; comentário falso fora; `model_version` não é o configurado; EF com o bloco e `rubrica_versao`) | **OK** |
| `efdeploy --dry-run` \| `grep functions/_shared/bars-redacao.ts` | **presente** (13 arquivos + import map) |
| `node efdeploy.cjs avaliar-redacao-cultural` | **OK · version=15 · status=ACTIVE · verify_jwt=true** |
| Management API relida | `version: 15`, `status: ACTIVE`, `verify_jwt: true` |
| `GET .../functions/avaliar-redacao-cultural/body \| grep -ac bars-prd-1.1` | **4** (era 0) |
| `git log --oneline origin/main..HEAD` | **vazio** (push executado: `0b072968..eb23b731`) |
| **Regressão além do pedido:** suíte Deno inteira das EFs | **657 passed, 0 failed** (baseline 630 do 49-08) |
| `npm run -s lint` (tsc --noEmit) | **89 erros** — teto D-53 é 90, e o **conjunto de MENSAGENS é idêntico** ao de antes (`diff` sobre as 89 linhas ordenadas, sem posição) |

A regressão da suíte inteira importa porque `essay-schemas.ts` é `_shared` e o `ai-client` novo
entrou no fechamento: um efeito colateral não apareceria no subconjunto do plano.

## Medições vivas (D-49 / D-51) — o plano não foi ajustado para caber

| O que o plano assume | Medido em PROD (2026-09-22/23, só leitura) | Bate? |
|---|---|---|
| Precondição: `rubrica_versao`, `provedor_ia`, `modelo_ia` existem | as 3 existem, `is_nullable=YES`, `text` | sim |
| `culture_fit_essay` é o único com `{{BARS_RUBRIC_DIMENSIONS}}` | 1 de 8 `call_type` | sim |
| o prompt ativo manda usar as âncoras «do input» | `position(...)>0` = true; 1 linha ativa, sem canário | sim |
| 2 redações avaliadas, com nomes de dimensão INVENTADOS e INSTÁVEIS | 2 linhas; chaves D1–D4 corretas; **2 conjuntos de nomes diferentes**, nenhum da rubrica | sim |
| as 2 antigas sem proveniência | `provedor_ia`/`modelo_ia`/`rubrica_versao` NULL nas duas; `model_version` = o configurado nas duas | sim |
| `perguntas_redacao.codigo` inclui D1–D3 | **11** códigos, três colidem (o kickoff dizia 9) | sim, com delta |
| `provedor_ia` aceita só NULL/anthropic/openai | CHECK lido: exatamente isso | sim |
| `max_tokens` do `culture_fit_essay` = 2500 | 2500, temperature 0 | sim |
| baseline de testes das EFs | 630 antes, **657** depois | sim |
| `tsc` em 89, teto D-53 = 90 | **89**, conjunto de mensagens idêntico | sim |

Extra, medido porque a decisão dependia dele: **o bloco da rubrica tem 8476 octetos (~2037 tok) em
57 linhas**, e entra no `requestFingerprint` de `callAi` (`ai-client.ts:464-491`, que inclui
`vagaRubricBlock` no canônico). Consequência: a chave efetiva de idempotência **muda com a
rubrica**, então nenhuma avaliação feita sob a rubrica fantasma é replayada sob esta. Não foi
preciso mexer na `idempotency_key` da EF — o campo já estava na impressão digital.

## Deviations from Plan

### Registradas

**1. [Rule 1 - Bug] O portão estático reprovou o MEU comentário de conserto**

- **Found during:** Passo 3, primeira execução do `<verify>` #2
- **Issue:** para registro histórico, escrevi no cabeçalho de `essay-schemas.ts` a frase falsa
  entre aspas («as 4 dimensões D1-D4 mapeiam os 4 valores Beauty Smile»). O portão do plano procura
  `/D1-D4 mapeiam os 4 valores/` no disco — e o encontrou, no meu próprio texto.
- **Fix:** o comentário passou a DESCREVER a afirmação retirada sem reproduzi-la, com uma nota
  dizendo por que não a cita. O portão está certo e o meu texto estava errado: citar a frase a
  deixaria encontrável no mesmo arquivo, e quem grepasse pelo erro continuaria achando-o ali.
- **Files modified:** `supabase/functions/_shared/essay-schemas.ts`
- **Verification:** `<verify>` #2 → OK.
- **Commit:** `d536e242`

**2. [Processo] A primeira rodada de mutações APAGOU o trabalho que ela existia para testar**

- **Found during:** prova de mordida (D-56), antes do primeiro commit
- **Issue:** montei o harness de mutação com `git checkout -- <arquivo>` como restauração, sobre uma
  árvore em que **as alterações da EF ainda não estavam commitadas**. `git checkout --` restaura para
  o **HEAD**, não para o trabalho em disco: a restauração da M1 reverteu `index.ts` para a versão
  pré-49-09, e as mutações M2–M6 então falharam ao aplicar («NAO ACHOU») porque os símbolos novos não
  existiam mais. A M7, sobre o arquivo **não rastreado** `bars-redacao.ts`, teve a restauração falhar
  com «did not match any file(s) known to git» e ficou **aplicada em disco**.
- **Fix:** M7 revertida à mão; todas as edições da EF re-aplicadas por script com asserção de
  presença para cada trecho (6 + 5 substituições, todas confirmadas); suíte re-executada (57/0),
  portão estático OK, `tsc` 89 com conjunto idêntico. Só então o trabalho foi **commitado**, e as 8
  mutações rodaram de novo — agora com `git checkout --` restaurando o estado bom, e com uma
  asserção `git diff --quiet` **por mutação** provando a restauração antes de seguir.
- **Files modified:** nenhum ao final (o estado re-aplicado é equivalente ao perdido, provado pelos
  mesmos testes e portões)
- **Verification:** `git status --short` vazio depois de cada mutação; 58/0 e 657/0 no fim.
- **Commit:** `d536e242` (o trabalho re-aplicado)
- **Lição, registrada em `patterns-established`:** **commitar antes de mutar.** A prova de mordida é
  barata; refazer o trabalho não é. E um harness cuja restauração pode falhar em silêncio
  (arquivo não rastreado) precisa verificar a restauração, não presumi-la.

**3. [Rule 2 - Funcionalidade crítica ausente] Teste do `motivo` acrescentado para o portão poder falhar**

- **Found during:** prova de mordida, mutação M8
- **Issue:** a checagem de repetição de `validarDimensoesRedacao` é **redundante quanto ao veredito**
  (ver §M8) — desativá-la não reprovava teste nenhum. Um portão incapaz de falhar.
- **Fix:** três asserções novas pinando o `motivo` de cada causa (repetida / contagem / vocabulário).
  Não afrouxei nada e não removi a checagem redundante: ela dá o diagnóstico CERTO, e é o diagnóstico
  que estava sem vigilância.
- **Files modified:** `supabase/functions/_shared/__tests__/bars-redacao.test.ts`
- **Verification:** com a mutação, 1 reprovado; sem ela, 15/0.
- **Commit:** `eb23b731`

**4. [Rule 3 - Blocker instrumental] Três `<verify>` não são re-rodáveis como escritos**

- **Found during:** fechamento
- **Issue:** (a) o `<verify>` #3 embute uma **escrita** (`node efdeploy.cjs` sem `--dry-run`);
  re-rodá-lo criaria uma **version 16** idêntica à 15, poluindo o histórico de deploy para não
  provar nada novo. (b) A cópia de rascunho fora da árvore (o padrão do 49-02/49-08 para mutações)
  **não roda** para esta EF: sem `node_modules`/resolução de `zod` no diretório de rascunho, os 25
  testes da EF falham todos — por ambiente, não por código. (c) `resend-webhook.test.ts` continua
  abortando ao resolver `npm:svix@1.99.1`.
- **Fix:** (a) re-verificado pelo **resultado**, que é a afirmação mais forte: `version=15` /
  `ACTIVE` / `verify_jwt=true` **relidos da Management API** + os marcadores lidos do bundle vivo +
  `origin/main..HEAD` vazio. (b) as mutações rodaram **na árvore**, com commit antes e verificação
  de restauração a cada uma (ver Deviation 2). (c) excluído das rodadas de suíte, como nos planos
  anteriores; **não** «consertado» (Scope Boundary).
- **Files modified:** nenhum
- **Verification:** tabela de Verification results.
- **Registrado em:** `.planning/WINDOWS.md` (entrada **53**, `unrun-verify`)

---

**Total deviations:** 4 (1 × Rule 1, 1 × Rule 2, 1 × Rule 3, 1 de processo).
**Impact:** nenhum no comportamento entregue. A 2 é a mais séria e é de **processo**: não mudou o
artefato, mas custou uma reconstrução completa da EF e poderia ter passado como «o conserto não
funcionou» se eu não tivesse medido o `git status` logo depois.

## Deferred (registrado, não consertado)

| Item | Por quê fica fora | Onde ficou registrado |
|---|---|---|
| A tela do RH rotula D1–D4 como os 4 valores (`RedacaoReviewPanel.tsx:47`, `RedacaoOverrideForm.tsx:45`) — e este deploy tornou a divergência **aguda**: o número é da especificidade da situação e a legenda diz «Experiência UAU» | é o D-25, do plano 49-15, que importa ESTA constante (D-55: o front é de quem o toca) | **WINDOWS 52** |
| A saída real do modelo sob a rubrica nova, contra o `max_tokens` de 2500 | nenhuma redação foi avaliada pela v15 ainda; `max_tokens` é teto de SAÍDA e o bloco alonga o PEDIDO. Mexer no parâmetro sem medir é consertar o errado | **WINDOWS 54** + item de juízo no `coverage` |
| O `<verify>` #3 embute uma escrita e não é re-rodável | segunda ocorrência da fase (a primeira é a WINDOWS 51, do 49-08) | **WINDOWS 53** |
| Few-shot inline (`exemplos-respostas-bars.md`) | RESEARCH §F.1 o deixa fora desta fase, explicitamente; é reversível | §Premissas do plano |
| As 2 redações antigas seguem com `rubrica_versao` NULL e `model_version` = o configurado | sem escrita retroativa (D-26/D-30): a rubrica que as avaliou não é recuperável, e NULL é a verdade | `bars-redacao.ts` (docblock §D-26) |
| `gerar-guia-entrevista:267` — sexto sítio de `vagaRubricBlock` fora da tabela C7 | é do 49-10/49-11 | §Passo 1 acima |
| `perguntas_redacao` tem 11 códigos, não 9 (R2/R3 a mais) | não muda nenhuma decisão; registrado para quem reusar a lista | §Passo 1 acima |

## Known Stubs

**Nenhum.** Varridos os 5 arquivos por `TODO|FIXME|placeholder|coming soon|not available|não
disponível`: o único acerto é a palavra «placeholder» dentro do meu próprio docblock de
`bars-redacao.ts:13`, onde ela é o **substantivo** que descreve o defeito
(`{{BARS_RUBRIC_DIMENSIONS}}` nunca substituído), não um marcador de trabalho pendente.

Nenhum valor vazio codificado, nenhum componente sem fonte de dados, nenhum caminho não fiado. Os
`null` que a EF grava aparecem **só onde `null` é a verdade**: `provedor_ia`/`modelo_ia`/
`model_version` quando nenhum modelo respondeu (bloqueio por custo ou injeção) — e há teste
fixando exatamente isso.

⚠ **Uma coisa que NÃO é stub mas parece:** a linha de `dimensoes_invalidas` não grava `analise_ia`.
É decisão medida (ver `key-decisions`), não fiação faltando — gravá-la a faria aparecer como análise
válida para todo leitor futuro, inclusive a consulta `where analise_ia is not null` que foi como as
2 redações antigas foram medidas neste plano.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano: nenhum endpoint novo,
nenhum caminho de auth novo, nenhuma mudança de esquema. As 5 mitigações declaradas ficaram
provadas:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-09-01 (conjunto de dimensões inválido gravado como concluída) | mitigate | validação pós-parte por chave, com 3 testes na EF + 8 formas na constante; mutações M2 e M8 |
| T-49-09-02 (redação sem registro de qual rubrica/modelo a avaliou) | mitigate | `rubrica_versao` + `provedor_ia`/`modelo_ia` reais nos 3 caminhos de gravação; mutações M4 e M6; marcadores lidos do bundle vivo |
| T-49-09-03 (escrita falha devolvendo `ok: true`) | mitigate | erro destruturado nos 2 upserts, com teste para cada; mutação M5 |
| T-49-09-04 (rótulo da tela divergindo da rubrica enviada) | mitigate **parcialmente** | a constante única existe e a EF a consome; **a TELA só a importa no 49-15** — até lá a divergência é real e está em WINDOWS 52 (ver o item de juízo no `coverage`) |
| T-49-09-SC (supply chain) | mitigate | **zero instalação de pacote**, nenhum import novo de rede. `bars-redacao.ts` tem zero imports por contrato, com portão próprio |

O texto da redação segue UNTRUSTED e passando por `callAi` (máscara PII + detecção de injeção), sem
alteração — e agora há teste que exercita o caminho de injeção ponta a ponta na EF.

## Issues Encountered

- **`tsc` em 89 contra teto 90 (D-53): margem de UM para os 15 planos restantes.** Este plano não
  acrescentou nenhum erro (os arquivos tocados são Deno/EF, fora do `include` do `tsconfig.json`) e
  o **conjunto de mensagens é idêntico** ao de antes — conferido por `diff`, não só pela contagem.
  ⚠ O `bars-redacao.ts` entra no `tsconfig` quando o **49-15** o importar do `src/`: é o primeiro
  plano em que este arquivo pode custar erro de tipo.
- **A divergência de rótulo entre EF e tela ficou PIOR antes de ficar melhor.** Antes, o rótulo
  errado acompanhava uma dimensão cujo significado também era inventado — dois erros que não se
  contradiziam visivelmente. Agora a D1 mede especificidade da situação e a tela a chama de
  «Experiência UAU»: um número correto sob uma legenda falsa. É melhor que antes (o número passou a
  significar algo) e é **pior de ler** até o 49-15. Registrado, não silenciado.
- **`gsd-tools check tdd-red-evidence` não se aplica:** Task 1 é `type="tracer"`, que por definição
  não tem fase RED própria. As 8 mutações são a prova de mordida equivalente, e nenhum artefato foi
  sintetizado para agradar um checker.
- **`work_sample_sjt` e o SJT (`avaliar-redacao`) seguem sem rubrica no input** — mesma forma de
  defeito, plano 49-23.

## Next

Plano 49-10. O que este plano deixa pronto:

- **49-15** (tela do RH): importa `_shared/bars-redacao.ts` por caminho relativo —
  `DIMENSOES_REDACAO` para os rótulos, `RUBRICA_REDACAO_VERSAO` para o selo. ⚠ São **dois** arquivos
  (`RedacaoReviewPanel.tsx:47` e `RedacaoOverrideForm.tsx:45`), e o contrato de zero imports tem
  portão próprio. É o plano que fecha a WINDOWS 52.
- **49-18** (prova em PROD): mede a saída real de uma redação avaliada pela v15 contra o
  `max_tokens` de 2500, e é o que fecha a WINDOWS 54. O enum/colunas do 49-01 e agora
  `rubrica_versao`/`dimensoes_invalidas` são o que ele tem a vigiar — **nenhum smoke olha para
  `redacoes_candidato.rubrica_versao` hoje**.
- **49-23** (SJT): a MESMA forma de conserto (rubrica no input, rótulo pela chave). O molde é
  `bars-redacao.ts` + a checagem pós-parse; o defeito lá é pior (a única SJT avaliada devolveu 5
  nomes inventados, 0 casando `perguntas.rubric`, e os PESOS saem por nome devolvido).

## Self-Check: PASSED

- `supabase/functions/_shared/bars-redacao.ts` — FOUND
- `supabase/functions/_shared/__tests__/bars-redacao.test.ts` — FOUND
- `supabase/functions/_shared/essay-schemas.ts` · `avaliar-redacao-cultural/index.ts` ·
  `avaliar-redacao-cultural/index.test.ts` — FOUND
- commits `d536e242`, `eb23b731` — os dois FOUND em `git log --all`, e os dois já em `origin/main`
- `commits: 2` **MEDIDO** por `git rev-list --count 0b072968..HEAD`, não narrado;
  `plan_head_before` registrado
- nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio); nenhum arquivo
  untracked; `git status --short` limpo
- `<acceptance_criteria>` re-executados: verdes — constante sem imports com as 4 dimensões v1.1,
  âncoras transcritas e `bars-prd-1.1`; comentário falso fora de `essay-schemas.ts` e schema
  inalterado; os testes do `<behavior>` passando e `structured-output-compat` verde; EF deployada
  com `verify_jwt=true` e `bars-prd-1.1` no bundle vivo; `origin/main..HEAD` vazio
- `<verification>` de plano re-executada: 58/0 no conjunto do plano, **657/0** na suíte inteira das
  EFs, portão estático OK, `version=15 ACTIVE verify_jwt=true` relido de PROD, fechamento conferido
  arquivo a arquivo contra a v14, marcadores lidos do bundle vivo, push confirmado
- 8 mutações executadas; as 2 que não morderam foram **medidas e nomeadas**, e uma delas virou
  conserto de portão (`eb23b731`) — nenhuma declarada aprovada
- varredura C7 re-rodada: **2 deltas** registrados (um sexto sítio de `vagaRubricBlock`; 11 códigos
  de pergunta em vez de 9)

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-22*
