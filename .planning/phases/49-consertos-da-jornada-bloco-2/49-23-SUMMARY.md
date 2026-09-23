---
phase: 49-consertos-da-jornada-bloco-2
plan: 23
subsystem: edge-functions
tags: [sjt, caso-aberto, rubrica, jorn-35, d-68, c6-6, deno, deploy, avaliar-redacao]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`CallAiResult.model` (o modelo REAL) e `.provider` — a proveniência que esta EF grava em `metadata.provedor_ia`/`.modelo_ia` (D-68). ⚠ Este deploy é o PRIMEIRO a levar o contrato `ai-client`/`audit-logger` do 49-02 a PROD para ESTA função (ver §«O que este deploy publicou»)"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "09"
    provides: "o MOLDE: `bars-redacao.ts` (constante versionada sem imports) + a validação pós-parse por chave + a lição «commitar antes de mutar». Nenhum arquivo em comum — as duas EFs rodaram em paralelo na mesma onda"
provides:
  - "`supabase/functions/_shared/sjt-rubrica.ts` — `DIMENSOES_SJT` (as 5 chaves vivas com rótulo, dimensão clínica, inclusion e exclusion transcritos), `REGRA_NIVEIS_SJT`, `REGRA_INSUFFICIENT_SJT`, `RED_FLAGS_SJT_CASO_ABERTO`, `montarBlocoRubricaSjt`, `chavesDaRubrica`. ZERO IMPORTS por contrato, com portão próprio"
  - "`scores_candidato.metadata.provedor_ia` / `.modelo_ia` para `tipo='sjt'` (D-68), nos TRÊS caminhos de gravação"
  - "`scores_candidato.metadata.dimensoes_desconhecidas` — os nomes que a IA devolveu e a rubrica da vaga não tem ⇒ revisão humana SEM peso"
  - "`scores_candidato.metadata.motivos_revisao` — vocabulário fechado `dimensao_desconhecida | insufficient_evidence | red_flag | abaixo_do_corte`; lista COMPLETA, ausente em `sucesso`"
  - "`scores_candidato.metadata.insufficient_evidence_da_ia` — a causa, separada do sinal combinado `has_insufficient_evidence`"
  - "`scores_candidato.metadata.rubrica_ausente` — pergunta sem rubrica: média uniforme DECLARADA em vez de indistinguível de rubrica ignorada"
  - "EF `avaliar-redacao` version=21 em PROD, `verify_jwt=true` — e com ela o contrato `ai-client`/`audit-logger` do 49-02 no ar para esta função"
affects: [49-18, 49-24]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 19896
  tasks: 1
  commits: 3
  plan_head_before: c5c749ec462f2d1f8dce8763fcc3fa8e301c71ed
  # `commits: 3` MEDIDO por `git rev-list --count c5c749ec..HEAD` no instante da escrita
  # deste SUMMARY (e75ecc8b, d2ae9683, 36cdad50) — os três de PRODUÇÃO, nenhum de
  # metadado. Re-medir DEPOIS do commit de metadado deste plano dá 4, por construção
  # (o `plan_head_before` é anterior a ele). A fronteira é esta; produção é 3.
  # `tokens: 19896` = 79 585 octetos de `git diff c5c749ec..HEAD -- supabase` ÷ 4.
  estimate_tokens_do_plano: 50000
  # O plano estimou 50 000 e o realizado foi 19 896 — 2,5× ABAIXO. QUINTA amostra do
  # mesmo padrão da fase (01, 02: 27k/120k, 08: 15k/90k, 09: 17,6k/60k, 23: 19,9k/50k),
  # e a razão é a mesma: o peso está em LEITURA (a EF, 4 documentos de conhecimento, o
  # ai-client de 1152 linhas, o PRD) e em MEDIÇÃO em PROD (a rubrica viva, a única SJT
  # avaliada, o prompt ativo, os dois bundles) — nada disso aparece no diff.
  # ⚠ Este plano foi o que mais se APROXIMOU da estimativa dos cinco, e não por acaso:
  # foi o primeiro cujo plano já dizia «mesma forma de conserto do 49-09».

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "quando duas causas levam ao MESMO roteamento mas pedem consertos OPOSTOS, elas precisam de campos separados: um booleano combinado economiza uma linha de código e custa o diagnóstico"
    - "`motivos_revisao` como LISTA COMPLETA, nunca a primeira causa por precedência — e ausente (não vazia) quando não há motivo, para que a ausência não se confunda com «não registrado»"
    - "catálogo INJETÁVEL por parâmetro default (`montarBlocoRubricaSjt(dims, catalogo = DIMENSOES_SJT)`) para exercitar por teste um ramo de renderização que a constante de produção não alcança — em vez de deixar o ramo morto ou de plantar dado falso na constante"
    - "teste que fixa `ancoras === null` com o MOTIVO no comentário: não congela o valor, obriga quem o mudar a registrar a fonte"
    - "mutação que não morde é medida e NOMEADA; quando a não-mordida revela um ramo inalcançável por construção, o conserto é dar vigilância ao que ESTÁ alcançável e não estava (o filtro de peso torto), não relaxar o portão"
    - "harness de mutação com `git diff --quiet` por mutação: ele DISPAROU ao encontrar a árvore suja e impediu uma segunda perda de trabalho"

key-files:
  created:
    - supabase/functions/_shared/sjt-rubrica.ts
    - supabase/functions/_shared/__tests__/sjt-rubrica.test.ts
  modified:
    - supabase/functions/avaliar-redacao/index.ts
    - supabase/functions/avaliar-redacao/__tests__/index.test.ts

key-decisions:
  - "`ancoras: null` nas CINCO dimensões, e isso é MEDIÇÃO, não esquecimento. Âncoras 1–5 existem — para as 10 dimensões CLÍNICAS do catálogo (`PESQUISA §5`). Mas a rubrica do caso declara que DUAS de suas chaves são a MESMA dimensão clínica (D10: `raciocinio_clinico_estetico` e `planejamento_decisao`) e TRÊS são PARES (D2/D6, D1/D9, D3/D5). Copiar D10 nas duas as tornaria idênticas com `inclusion` diferentes; escolher uma do par é arbítrio e fundir é composição. E o conteúdo divergiria: a âncora 5 da D10 é «Cita literatura recente; integra evidência…», que NÃO é o nível 5 de `planejamento_decisao` segundo a rubrica («Sequência correta placa/periodonto → planejamento → execução»). Uma âncora emprestada faria o modelo pontuar a dimensão errada COM APARÊNCIA DE RIGOR."
  - "`template_bars` anexado em 2 de 5, e só onde o próprio template declara reuso neste caso. B4 diz «reuso: Mariana, cases clínicos» e B1 «reuso: Mariana, Renata, WhatsApp» — casam. B2 é «Honestidade / Ética comercial (reuso: Renata, SDR work-sample, CV-*)» e B3 é «Priorização / In-basket (reuso: Assistente Financeiro)»: casá-los com `etica_minimamente_invasivo` e `planejamento_decisao` pela semelhança do NOME seria exatamente a invenção que este arquivo existe para acabar."
  - "O PESO não está na constante, de propósito. Ele vem da rubrica da VAGA em tempo de execução (um admin pode reponderar sem tocar código). Congelar 25/20/25/15/15 num arquivo de código seria a «fotografia que se apresenta como invariante» que o CLAUDE.md §«Portões» descreve — e o smoke que a vigiasse acusaria o admin de ter quebrado algo ao editar legitimamente."
  - "NÃO criei constante de versão da rubrica (o análogo de `RUBRICA_REDACAO_VERSAO` do 49-09). `scores_candidato` não tem coluna de versão de rubrica e o plano não pede nenhuma: um símbolo exportado que ninguém grava é artefato pendurado. As versões das fontes (`v1.0` nos dois docs) ficam no docblock."
  - "`provider === 'none'` vira `provedor_ia: null` e `modelo_ia: null` na metadata. Aqui NÃO há CHECK obrigando (metadata é jsonb livre) — a razão é de vocabulário: gravar a string `\"none\"` a faria passar por nome de provedor para todo leitor futuro de `metadata->>'provedor_ia'`, e `null` é a verdade (ninguém respondeu). Mesmo vocabulário que `redacoes_candidato` usa desde o 49-09, para que uma consulta que cruze as duas tabelas não precise de dois dialetos."
  - "A dimensão inventada CONTINUA gravada em `metadata.dimension_scores`. Ela não pesa e não vale nota, mas apagá-la esconderia do RH o que a IA fez — e é isso que ele precisa ver para decidir se a avaliação vale."
  - "O nome que a IA inventou NÃO vai no log de aplicação (só a contagem). O log é infraestrutura; o nome é conteúdo da avaliação e mora na `metadata`, que só o RH lê. Os `motivos_revisao` sim vão no log: são vocabulário fechado."

patterns-established:
  - "Duas causas com o mesmo roteamento e consertos opostos precisam de campos separados. `has_insufficient_evidence` fundia «a IA não achou evidência na resposta» (sobre o CANDIDATO) com «a IA inventou o nome da dimensão» (sobre a AVALIAÇÃO). Quem lesse a linha depois não tinha como saber qual conserto aplicar — e é da leitura posterior que sai o conserto."
  - "Um portão cujo literal contradiz o texto do próprio plano não se satisfaz com enchimento. O `<verify>` procurava `dimensao_desconhecida` (singular) e a chave de dados é plural porque guarda uma LISTA. A saída não foi renomear a lista nem plantar o token: foi dar ao singular o papel que o texto do plano já lhe dava — o nome da CONDIÇÃO —, e ao fazê-lo apareceu um defeito real que não estava no plano."
  - "O guard de restauração do harness de mutação vale o que custa. `git diff --quiet` por mutação DISPAROU quando a árvore tinha um teste não-commitado, abortando antes de qualquer `git checkout --`. É literalmente o modo de falha que custou uma reconstrução completa da EF no 49-09."

requirements-completed: [JORN-35, JORN-28]

# Coverage (#1602)
coverage:
  - deliverable: "A rubrica do caso aberto numa constante sem imports: as 5 chaves VIVAS com rótulo, dimensão clínica, inclusion e exclusion TRANSCRITOS da rubrica do próprio caso"
    requirement: JORN-35
    human_judgment: false
    verification:
      - kind: test
        ref: "sjt-rubrica.test.ts#49-23/contrato — zero imports (com guarda anti-vácuo de tamanho do fonte)"
        status: pass
      - kind: test
        ref: "sjt-rubrica.test.ts#49-23/JORN-35 — as 5 chaves vivas, com rótulo/inclusion/exclusion/dimensão clínica, e EXATAMENTE elas (nenhuma inventada, nenhuma faltando)"
        status: pass
      - kind: test
        ref: "sjt-rubrica.test.ts#49-23 — `template_bars` só nos 2 que declaram reuso neste caso; `ancoras === null` nas 5 com o motivo pinado; nenhum rótulo duplicado"
        status: pass
      - kind: command
        ref: "portão estático — sem `import`, contém as 5 chaves → OK"
        status: pass
      - kind: integration
        ref: "`perguntas.rubric` lido em PROD: 1 pergunta `caso_aberto`, as 5 chaves, pesos 25/20/25/15/15 — idêntico ao seed"
        status: pass
  - deliverable: "O bloco ENVIADO ao provedor é a rubrica (não `Vaga: <uuid>`), é autoexplicativo e manda devolver a CHAVE"
    requirement: JORN-35
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-23/JORN-35 — `system[1].text` capturado do `messages.parse`: as 5 chaves com os pesos, o rótulo pt-BR, o inclusion transcrito, a regra de nomeação, e `Vaga: ` AUSENTE"
        status: pass
      - kind: test
        ref: "sjt-rubrica.test.ts#49-23 — bloco autoexplicativo (8 cabeçalhos `##`), regra 5→1 dentro do bloco, red flags, RNF-07a; builder PURO e que não lança para 10 formas de entrada torta"
        status: pass
      - kind: other
        ref: "mutação M1 (bloco volta a `Vaga: <uuid>`) ⇒ 2 reprovados; M9 (proibição do enunciado removida) ⇒ 2 reprovados"
        status: pass
  - deliverable: "T-49-23-01: `dimension` fora das chaves da rubrica ⇒ revisão humana com o nome na flag, SEM peso — nunca peso 1 em silêncio"
    requirement: JORN-35
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-23/JORN-35 — os 5 nomes que a IA REALMENTE devolveu em PROD: `pendente_humano`, `dimensoes_desconhecidas` com os 5 nomes, `score` 0, e asserção explícita de que NÃO é 7 (o valor do peso-1-silencioso)"
        status: pass
      - kind: test
        ref: "index.test.ts#49-23/JORN-35 — 1 inventada entre 4 válidas: composto 20 pelas 4 (a inventada não pesa), `pendente_humano` MESMO com nota alta, e nada apagado de `dimension_scores`"
        status: pass
      - kind: test
        ref: "index.test.ts#49-23 — dimensão com `peso` não numérico sai do vocabulário E do bloco; devolvida pelo modelo, conta como desconhecida"
        status: pass
      - kind: other
        ref: "mutação M2 (validação removida) ⇒ 2; M11 (sai da soma mas NÃO vai para revisão) ⇒ 2; M12 (flag deixa de nomear) ⇒ 2"
        status: pass
  - deliverable: "D-68: `metadata.provedor_ia` / `.modelo_ia` REAIS nos três caminhos de gravação"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-23/D-68 — modelo gravado é a versão DATADA que respondeu, asserido como DISTINTO do `model_id` configurado"
        status: pass
      - kind: test
        ref: "index.test.ts#49-23/D-68 — injeção detectada (`provider='none'`) ⇒ `provedor_ia` e `modelo_ia` NULL, com `error_code` preservado"
        status: pass
      - kind: other
        ref: "mutação M4 (proveniência removida) ⇒ 1; M5 (provider cru) ⇒ 1"
        status: pass
  - deliverable: "POR QUE a linha foi para revisão humana deixa de ser indistinguível (as 4 causas pedem consertos opostos)"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-23 — as 4 causas uma a uma, cada uma com `motivos_revisao` EXATO (dimensão inventada com nota alta · insufficient da IA com chaves corretas · red flag com nota alta · só a nota)"
        status: pass
      - kind: test
        ref: "index.test.ts#49-23 — 3 causas simultâneas aparecem AS TRÊS, na ordem; `sucesso` NÃO tem a chave (nada de lista vazia ambígua)"
        status: pass
      - kind: other
        ref: "mutação M13 (campo removido) ⇒ 2; M14 (só o 1º motivo) ⇒ 1; M15 (volta a fundir as causas) ⇒ 2; M16 (lista vazia em sucesso) ⇒ 1"
        status: pass
  - deliverable: "C6 #6: as TRÊS escritas destruturam o erro e nunca devolvem `{ ok: true }` depois de gravação falha"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#49-23/C6 #6 — os três caminhos (score, revisão humana, `ia_sem_resultado`) com INSERT recusado ⇒ 500 SERVER_ERROR"
        status: pass
      - kind: other
        ref: "mutação M6 (os três `throw` desativados) ⇒ 3 reprovados, um por caminho"
        status: pass
  - deliverable: "RNF-07a intacto: o limiar não muda, `candidaturas` não é tocada, payload neutro"
    requirement: JORN-35
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#RNF-07a (pré-existente) + #49-23/RNF-07a — dimensão inventada não toca `candidaturas` e o payload segue `{ ok: true }`"
        status: pass
      - kind: test
        ref: "os 10 testes pré-existentes da EF seguem verdes SEM nenhuma asserção editada"
        status: pass
  - deliverable: "A EF está VIVA em PROD com o conserto (não só no disco), e os dois canais (EF e git) estão em dia"
    human_judgment: false
    verification:
      - kind: command
        ref: "node efdeploy.cjs avaliar-redacao → «OK · version=21 · status=ACTIVE · verify_jwt=true»; version/status/verify_jwt/import_map RELIDOS da Management API"
        status: pass
      - kind: command
        ref: "GET /functions/avaliar-redacao/body → `dimensao_desconhecida` ×3, `dimensoes_desconhecidas` ×5, `motivos_revisao` ×3, `sjt-rubrica` ×7, `montarBlocoRubricaSjt` ×6, `RUBRICA DA VAGA` ×2, `provedor_ia` ×4, `modelo_ia` ×6 — todos 0 na v19"
        status: pass
      - kind: command
        ref: "git log --oneline origin/main..HEAD → vazio (push `c5c749ec..36cdad50` executado)"
        status: pass
  - deliverable: "A saída real do modelo sob a rubrica nova (~1281 tok de input a mais) contra o `max_tokens` de 3000"
    human_judgment: true
    rationale: "Pior que o caso da redação: o `work_sample_sjt` NUNCA teve chamada Sonnet logada (C9: 0 linhas em `ai_call_logs`), então não existe saída medida para comparar — nem sequer uma baseline. A aritmética diz que não há risco direto (`max_tokens` é teto de SAÍDA; o bloco alonga o PEDIDO), mas o efeito de uma rubrica rica sobre o tamanho do `reasoning` por dimensão não está medido nesta EF. Registrado em WINDOWS 57 como juízo, para que a aritmética não passe por medição. A prova é do 49-18."
  - deliverable: "O RH VÊ por que a SJT foi para revisão humana"
    human_judgment: true
    rationale: "NÃO fechado por este plano, e ficou mais agudo por causa dele: a EF agora grava `motivos_revisao` e `dimensoes_desconhecidas`, e `CasoAbertoMetadata` (`scoresRhService.ts:62-66`) declara SOMENTE `dimension_scores` e `composite_0_25`. Uma SJT que foi para revisão porque a IA inventou o nome da dimensão aparece ao RH como qualquer outra `pendente_humano`. É o irmão SJT do D-25/WINDOWS 52, e está em WINDOWS 56."

# Metrics
duration: 74 min
completed: 2026-09-22
tasks: 1
files: 4
---

# Phase 49 Plano 23: A rubrica do SJT passa a existir no input Summary

**O prompt do caso aberto mandava pontuar «por dimensão BARS específica do cenário» e o input
levava `Vaga: <uuid>`. A rubrica da pergunta ficava só no banco, do lado do cálculo — e o
peso-padrão 1 para chave desconhecida transformava a ponderação 25/20/25/15/15 em média UNIFORME
em silêncio. Agora a rubrica vai ao modelo por uma constante sem imports, o peso sai da CHAVE,
nome inventado vai para a mesa do RH em vez de para a nota, cada linha diz qual modelo a produziu
e POR QUE foi para revisão humana. Version 21 viva em PROD.**

## Performance

- **Duration:** 74 min
- **Started:** 2026-09-23T01:20Z
- **Completed:** 2026-09-23T02:34Z
- **Tasks:** 1 / 1
- **Files:** 4 (2 criados, 2 modificados)
- **Testes:** 10 → 25 no arquivo da EF, + 15 novos na constante; suíte das EFs 657 → **687**, sempre 0 falhas

## O que estava errado — medido, não inferido

**A rubrica não existia no input.** O prompt ativo `work_sample_sjt` (2745 octetos de
`system_template`, `is_active`, sem canário, `max_tokens` 3000, `temperature` 0) manda produzir
«Score 1-5 por dimensão BARS **específica do cenário**». As dimensões existiam em UM lugar: o
placeholder `{{BARS_RUBRIC_WITH_CRITERIA}}` do `user_template` (1008 octetos) — e `ResolvedPrompt`
não tem `user_template`, então ele nunca é enviado a provedor nenhum. O que a EF passava como
`vagaRubricBlock` eram **42 octetos**:

```
Vaga: <uuid>
```

**A consequência, na única SJT de caso aberto avaliada em PROD** (`scores_candidato` id
`8acf3c98`, score 7/25, `pendente_humano`, lida só nas chaves e scores):

| # | `dimension` que o modelo devolveu | score |
|---|---|---|
| 1 | Avaliação diagnóstica estética, funcional e periodontal | 1 |
| 2 | Conduta na consulta de hoje | 1 |
| 3 | Plano de tratamento de curto e médio prazo | 1 |
| 4 | Comunicação com a paciente sobre expectativa, prazo e orçamento | 2 |
| 5 | Riscos, consentimento e acompanhamento | 2 |

São **os cinco itens do enunciado** («Descreva: (1) … (5) …»), não as dimensões da rubrica.
**ZERO casam** as 5 chaves de `perguntas.rubric.dimensoes`. E `dimension` é `z.string()` livre no
`WorkSampleScoringSchema`, então nada reprovava.

**O dano não era o nome errado, era o peso.** Nenhum nome casava ⇒ toda dimensão caía no peso
padrão 1 ⇒ a ponderação 25/20/25/15/15 virava média uniforme. Aritmética dos dois caminhos sobre
a MESMA resposta:

| | cálculo | composto |
|---|---|---|
| uniforme (o que aconteceu) | (1+1+1+2+2)/5 = 1,40 | **7,00** |
| pela rubrica (o que devia) | (25·1+20·1+25·1+15·2+15·2)/100 = 1,30 | **6,50** |

Um número plausível, medindo outra coisa. O teste novo **pina o 7,00** com asserção explícita: se
ele voltar, o peso silencioso voltou.

## Passo 1 (D-50) — as varreduras C7 e C6 re-rodadas: delta em AMBAS

### C7 — `vagaRubricBlock:` (9 linhas, 6 sítios de chamada)

| # do kickoff | Onde está hoje | Delta |
|---|---|---|
| 1 | `avaliar-redacao-cultural/index.ts:**299**` — e agora é `vagaRubricBlock: rubricaBlock` | **CONSERTADO pelo 49-09**; a linha andou de `:244-254` para `:299` e a FORMA mudou |
| 2 | `avaliar-redacao/index.ts:256` | **ESTE plano** |
| 3 | `comparativo-candidatos/index.ts:409` | escopo deliberado (era `:260` no kickoff; o 49-08 inseriu código acima) |
| 4 | `gerar-devolutiva-bigfive/index.ts:791` | escopo deliberado (IA desligada) |
| 5 | `avaliar-transcricao-entrevista/index.ts:237` | escopo deliberado (o precedente certo) |
| — | `gerar-guia-entrevista/index.ts:267` | **segue fora da tabela C7 do kickoff** — o 49-09 já registrou este delta; confirmado ainda aberto, é do 49-10/49-11 |

### C6 #6 — escrita de EF sem erro destruturado: **11 → 8, e agora → 5**

```
supabase/functions/avaliar-transcricao-entrevista/index.ts:266,299,309
supabase/functions/analise-candidato-individual/index.ts:301,602
supabase/functions/avaliar-redacao/index.ts:281,297,322      ← ESTE plano
```

**Delta de TRÊS contra o que o 49-02 mediu** (11 linhas): `comparativo-candidatos:288` saiu
(49-08) e `avaliar-redacao-cultural:291,346` saíram (49-09). As 3 deste plano fecham agora;
sobram **5**, todas de EFs que outros planos tocam. O grep é a mesma forma do kickoff, sem
ajuste — o que mudou é o repositório, não a régua.

### Varredura de FORMA nos smokes (CLAUDE.md §«Portões»)

Este plano não toca nenhum arquivo `.sql` (`git diff --name-only` confirma) e não acrescenta
objeto SQL nem smoke — a varredura de forma não tem alvo novo. Os testes Deno **são** o portão
deste plano, e é por isso que as 16 mutações abaixo existem.

## Accomplishments

1. **A rubrica existe no input, e tem uma fonte só.** `_shared/sjt-rubrica.ts` (**zero imports
   por contrato**, molde de `email-config.ts:12-17` e de `bars-redacao.ts`) transcreve as 5 chaves
   vivas com rótulo pt-BR, dimensão clínica de referência, e os `inclusion`/`exclusion`
   **verbatim** da tabela «Rubric BARS» de `banco-sjt-dentista.md:83-89` — a rubrica do próprio
   caso, que é o que o RH lê. O mapeamento chave → dimensão clínica (D10, D10, D2/D6, D1/D9,
   D3/D5) **não é inferência**: está escrito na coluna «Dimensão» daquela tabela.

   O bloco resultante tem **5 330 octetos (~1 281 tok, 59 linhas)** — contra os 42 do anterior.

2. **O bloco é autoexplicativo, porque ninguém o rotula depois.** `callAi` entrega o texto
   LITERAL como 2º bloco de system (Anthropic, `cache_control: ephemeral`, `ai-client.ts:827`) ou
   concatenado com `\n\n` ao `system_template` (fallback OpenAI, `:1043`) — sem cabeçalho, sem
   ordenação. Lido no código que monta a chamada **antes** de escrever a instrução; por isso os
   8 cabeçalhos `##` moram no builder, junto da regra de níveis 5→1 e das red flags.

3. **A regra de nomeação proíbe o defeito MEDIDO, não um defeito genérico.** O bloco diz: devolva
   a CHAVE exata entre crases; não devolva o rótulo; **não use um trecho do enunciado — os itens
   numerados que o cenário pede descrever NÃO são as dimensões**. Essa última frase existe porque
   foi exatamente o que o modelo fez nas cinco.

4. **O peso sai da CHAVE, e o que não é chave não pesa.** Uma `dimension` fora do vocabulário da
   rubrica não entra na soma, é acumulada em `metadata.dimensoes_desconhecidas` **com o nome que a
   IA devolveu**, e manda o caso para `pendente_humano`. Há teste provando que **nota 20/25 não
   absolve** uma dimensão inventada.

5. **A cadeia funciona também quando a rubrica está torta.** Uma dimensão cujo `peso` não é número
   (rubrica editada à mão no admin) é descartada do vocabulário — então não é enviada ao modelo
   como se fosse pontuável, e se ele a devolver conta como desconhecida. Descoberto pela prova de
   mordida (ver §M3).

6. **A linha diz quem a produziu.** `metadata.provedor_ia` e `.modelo_ia` REAIS (do `CallAiResult`
   do 49-02), nos **três** caminhos de gravação — porque a rubrica FOI enviada e a proveniência é
   conhecida mesmo sem score. `provider='none'` (teto de custo, injeção) vira **NULL**: ninguém
   respondeu, e `null` é a verdade.

7. **A linha diz POR QUE foi para revisão humana.** `metadata.motivos_revisao` com vocabulário
   fechado — `dimensao_desconhecida` · `insufficient_evidence` · `red_flag` · `abaixo_do_corte` —,
   lista **completa** (nunca a primeira por precedência), **ausente** em `sucesso`. E
   `insufficient_evidence_da_ia` separa a causa do sinal combinado. Não estava no plano; ver
   §«O portão apontou para um defeito real».

8. **Escrita falha deixou de ser sucesso.** Os **três** inserts destruturam `{ error }` e relançam
   (→ 500). Antes, uma gravação recusada devolvia `{ ok: true }`: o score desaparecia e o candidato
   lia «enviado com sucesso» — indistinguível de nunca ter enviado (C6 #6, `:281`, `:297`, `:322`).

9. **`rubrica_ausente` torna legível o que era indistinguível.** Pergunta sem rubrica segue com
   média uniforme (comportamento de hoje, não mexi), mas agora **escrito** na metadata — em vez de
   idêntico a uma rubrica que não pegou.

## O portão apontou para um defeito real que não estava no plano

O `<verify>` #3 exige `grep -c "dimensao_desconhecida"` > 0 no bundle vivo. Depois do primeiro
deploy (v20) medi: **0**. O que eu havia gravado era `dimensoes_desconhecidas` — plural, porque é
uma LISTA de nomes. E o plano usa **as duas formas**: singular em `must_haves.truths` e
`artifacts.contains`, plural no `<action>` e na tabela de artefatos.

Havia três saídas. Renomear a lista para o singular (errado: ela guarda uma lista). Declarar o
literal do portão equivocado e passar por resultado (a saída fácil). Ou perguntar o que o singular
NOMEIA — e o texto do plano já respondia: a **condição**.

Ao escrevê-lo apareceu um defeito que o plano não previu: **uma linha `pendente_humano` não dizia
por quê**. As quatro causas eram indistinguíveis e pedem consertos **opostos**:

| motivo | sobre o quê | conserto |
|---|---|---|
| `dimensao_desconhecida` | a AVALIAÇÃO (a IA inventou o nome) | rubrica/prompt — a nota não é confiável |
| `insufficient_evidence` | a RESPOSTA do candidato | ler a resposta; talvez pedir mais |
| `red_flag` | conteúdo ético/clínico | juízo humano sobre o conteúdo |
| `abaixo_do_corte` | só a nota | juízo humano sobre a banda |

Quem inferisse da ausência de flag chegaria a uma explicação **plausível e falsa** — a família
«inferir da ausência» que o `MEMORY` registra. Custou um commit e um redeploy (v21) e é a parte
mais útil deste plano que não estava escrita nele.

## Prova de mordida (D-56) — 16 mutações, e a UMA que não mordeu

| # | Mutação | Reprovados |
|---|---|---|
| M1 | `vagaRubricBlock` volta a `Vaga: <uuid>` (o defeito original) | **2** |
| M2 | validação da chave REMOVIDA de `mapDimensionsToComposite` | **2** |
| M3 | peso de chave desconhecida volta a 1 (mantendo a flag) | **0** — ver abaixo |
| M4 | proveniência removida da metadata (D-68) | **1** |
| M5 | `provider` gravado cru (o `'none'`) | **1** |
| M6 | os TRÊS `throw` de escrita falha desativados | **3** |
| M7 | flag `rubrica_ausente` removida | **1** |
| M8 | âncoras renderizadas em ordem 1→5 | **1** |
| M9 | proibição de usar trecho do enunciado removida do bloco | **2** |
| M10 | chave desconhecida recebe os critérios da 1ª dimensão do catálogo | **1** |
| M11 | desconhecida sai da soma mas NÃO vai para revisão humana | **2** |
| M12 | a flag deixa de NOMEAR a dimensão devolvida | **2** |
| M13 | `motivos_revisao` removido | **2** |
| M14 | `motivos_revisao` devolve só o 1º motivo (precedência) | **1** |
| M15 | `insufficientDaIa` volta a ser o sinal combinado | **2** |
| M16 | `motivos_revisao` gravado sempre (lista vazia em `sucesso`) | **1** |

### M3 não mordeu, e o motivo é de construção

Trocando o fallback de peso de 0 para 1, **nada reprova** (37/0). Medido, não inferido: com a
validação por chave em pé, uma chave desconhecida faz `continue` **antes** da linha do peso; e uma
chave conhecida **sempre** tem peso, porque `chavesValidas` e `rubricWeights` saem da MESMA lista.
O ramo é **inalcançável por construção** — defesa em profundidade, redundante quanto ao veredito,
como o M8 do 49-09.

Não removi a redundância (é ela que faz o retorno do defeito ser inofensivo em vez de silencioso)
e **não declarei o portão aprovado**. O que fiz foi perguntar o que ESTAVA alcançável e sem
vigilância — e era o filtro de `rubricDimensoesFrom`: uma dimensão com `peso` não numérico. Isso
virou teste (`d2ae9683`), e M11/M12 passaram a cobrir separadamente o **roteamento** e a
**nomeação**, que é o que M3 parecia cobrir e não cobria.

### O guard do harness disparou — e foi bom

Ao re-rodar M3, o `git diff --quiet` por mutação **abortou o harness** porque havia um teste não
commitado na árvore. É exatamente o modo de falha que, no 49-09, apagou a EF inteira com
`git checkout --`. Commitei primeiro, re-rodei, e a restauração foi verificada em todas as 16.

## O que este deploy publicou — leia antes de concluir qualquer coisa sobre proveniência

A v19 (viva desde 2026-09-06) estava **inteiramente** no contrato antigo. Medido no corpo dos dois
bundles:

| Marcador | v19 (antes) | v21 (agora) |
|---|---|---|
| `dimensao_desconhecida` | **0** | 3 |
| `dimensoes_desconhecidas` | **0** | 5 |
| `motivos_revisao` | **0** | 3 |
| `insufficient_evidence_da_ia` | **0** | 2 |
| `sjt-rubrica` | **0** | 7 |
| `montarBlocoRubricaSjt` | **0** | 6 |
| `RUBRICA DA VAGA` | **0** | 2 |
| `raciocinio_clinico_estetico` | **0** | 4 |
| `rubrica_ausente` | **0** | 4 |
| `provedor_ia` / `modelo_ia` | **0** / **0** | 4 / 6 |
| `ai-error-codes` (49-02) | **0** | 4 |
| `fallback_cause` (49-02) | **0** | 6 |
| `FALHA_PARSE` (49-02) | **0** | 7 |
| `emitAuditLossAlert` (49-02) | **0** | 8 |
| `inputHashDe` (49-02) | **0** | 5 |
| `anthropic_max_tokens` (49-02) | **0** | 4 |

**Sim: este deploy levou o contrato do 49-02 a PROD para esta função, pela primeira vez.** É a
terceira EF da fase a fazê-lo (comparativo v28, redação-cultural v15). Importa porque o sintoma de
uma EF deixada no contrato velho — proveniência NULL na tabela de resultado — é **indistinguível**
de uma coluna que ninguém preencheu. A partir da v21, um `provedor_ia` NULL na metadata de um score
`tipo='sjt'` significa o que deve significar: nenhum provedor foi chamado.

**As outras consumidoras do 49-02 seguem no contrato antigo** (`avaliar-transcricao-entrevista`,
`gerar-guia-entrevista`, `analise-candidato-individual`, `consolidar-decisao-final`) — cada uma é
deployada pelo plano que a toca (D-55 / Pitfall 8). Não deployei nenhuma.

## Deploy (D-52) — o fechamento, conferido À MÃO contra a versão viva

O cabeçalho do `efdeploy.cjs` afirma que o script «RECUSA subir se o fechamento divergir da lista
esperada». **Essa checagem não existe no código** — mesmo achado dos planos 49-03, 49-08 e 49-09 —,
daí a conferência manual que o D-52 manda. A v19 viva referencia 9 `_shared` (medido por
`grep -c "_shared/<nome>.ts"` no corpo do bundle); o fechamento novo tem 10:

| Arquivo | v19 (viva) | v21 (nova) |
|---|---|---|
| `functions/_shared/ai-client.ts` | ✓ | 55 065 |
| `functions/_shared/ai-cost.ts` | ✓ | 2 059 |
| `functions/_shared/ai-error-codes.ts` | **—** | **6 867 (novo no bundle)** |
| `functions/_shared/audit-logger.ts` | ✓ | 18 412 |
| `functions/_shared/avaliacao-schemas.ts` | ✓ | 7 926 |
| `functions/_shared/circuit-breaker.ts` | ✓ | 4 946 |
| `functions/_shared/injection-detector.ts` | ✓ | 2 060 |
| `functions/_shared/pii-masker.ts` | ✓ | 3 372 |
| `functions/_shared/prompt-loader.ts` | ✓ | 7 948 |
| `functions/_shared/sjt-rubrica.ts` | **—** | **19 754 (novo no bundle)** |
| `functions/avaliar-redacao/index.ts` | ✓ | 27 559 |
| `functions/deno.json` (import map) | ✓ | ✓ |

**Exatamente dois arquivos MAIS, nenhum a menos** — o mesmo padrão do 49-09. ⚠ `deno.json` **não
aparece na lista do `--dry-run`** (o script o anexa depois, `efdeploy.cjs:136`), mas vai no payload
e `import_map` está `true` na v19 e na v21 — conferido nas duas, porque um import map faltando não
falha no deploy, falha na primeira invocação.

## Verification results

| Verify | Resultado |
|---|---|
| `deno test` da EF + da constante (`<verify>` #1) | **40 passed, 0 failed** |
| portão estático (`<verify>` #2: sem import; 5 chaves; peso 1 silencioso ausente; EF com o bloco e `modelo_ia`) | **OK** |
| `efdeploy --dry-run` \| `grep functions/_shared/sjt-rubrica.ts` | **presente** (11 arquivos + import map) |
| `node efdeploy.cjs avaliar-redacao` | **OK · version=21 · status=ACTIVE · verify_jwt=true** |
| Management API relida | `version: 21`, `status: ACTIVE`, `verify_jwt: true`, `import_map: true` |
| `GET .../functions/avaliar-redacao/body \| grep -ac dimensao_desconhecida` | **3** (era 0) |
| `git log --oneline origin/main..HEAD` | **vazio** (push `c5c749ec..36cdad50`) |
| **Regressão além do pedido:** suíte Deno inteira das EFs | **687 passed, 0 failed** (baseline 657 do 49-09) |
| `npm run -s lint` (tsc --noEmit) | **89 erros** — teto D-53 é 90, e o **conjunto de MENSAGENS é idêntico** ao baseline (`diff` sobre as 89 linhas ordenadas, sem posição) |

A regressão da suíte inteira importa porque `sjt-rubrica.ts` é `_shared` e o `ai-client` novo entrou
no fechamento desta EF: um efeito colateral não apareceria no subconjunto do plano.

## Medições vivas (D-49 / D-51) — o plano não foi ajustado para caber

| O que o plano assume | Medido em PROD (2026-09-22/23, só leitura) | Bate? |
|---|---|---|
| Precondição: `ai-client.ts` devolve `model` no `CallAiResult` | `model: string \| null` em `:315`, com o docblock do D-28 | sim |
| `perguntas.rubric.dimensoes` tem as 5 chaves, pesos 25/20/25/15/15 | **1** pergunta `caso_aberto`, as 5 chaves, os 5 pesos — idêntico ao seed `:181-195` | sim |
| a única SJT avaliada devolveu 5 nomes, 0 casando | 5 nomes = **os 5 itens do enunciado**, 0 casam; scores 1,1,1,2,2; composto 7,00 | sim |
| `work_sample_sjt` com `max_tokens` 3000 (C9) | 3000, `temperature` 0, `is_active`, sem canário, `schema_version_required` 1.0.0 | sim |
| `work_sample_sjt` nunca logou chamada Sonnet | **0** linhas — sem baseline de saída para comparar | sim |
| o prompt manda pontuar «dimensão BARS específica do cenário» | `system_template` de 2745 octetos, literal | sim |
| o `user_template` tem o placeholder da rubrica e não é enviado | `{{BARS_RUBRIC_WITH_CRITERIA}}` presente; `ResolvedPrompt` não tem `user_template` | sim, **com delta** |
| C6 = 11 escritas sem erro destruturado | **8** (o 49-08 fechou 1, o 49-09 fechou 2); as 3 desta EF presentes | sim, com delta |
| C7 = `avaliar-redacao:256` com `Vaga: <uuid>` | presente, linha exata | sim |
| baseline de testes das EFs | 657 antes, **687** depois | sim |
| `tsc` em 89, teto D-53 = 90 | **89**, conjunto de mensagens idêntico | sim |
| EF viva antes deste plano | **version 19**, ACTIVE, `verify_jwt` true, 2026-09-06, TODOS os marcadores do 49-02 em 0 | sim |

**Delta a registrar:** o placeholder do `user_template` do `work_sample_sjt` é
`{{BARS_RUBRIC_WITH_CRITERIA}}`, **não** `{{BARS_RUBRIC_DIMENSIONS}}` (que é o do
`culture_fit_essay`, medido pelo 49-09). O SQL do C7 do kickoff procura só o segundo — rodado
contra o `work_sample_sjt` ele devolve `false`/`0` e diria que **não há** placeholder de rubrica
aqui, quando há, com outro nome. O padrão do kickoff tem um ponto cego do tipo que o CLAUDE.md
§«Portões» descreve: lista literal que não vê o idioma do arquivo que vigia. A conclusão não
mudou (nenhum `user_template` é enviado), mas quem reusar aquele SQL para inventariar EFs sem
rubrica vai subcontar.

Extra, medido porque a decisão dependia dele: **o bloco entra no `requestFingerprint` de `callAi`**
(`ai-client.ts:486`, que inclui `vagaRubricBlock` no canônico). Consequência: a chave efetiva de
idempotência **muda com a rubrica**, então nenhuma avaliação feita sob o bloco fantasma é replayada
sob este. Não foi preciso mexer na chave da EF — igual ao 49-09, o campo já estava na impressão
digital. **Verificado para ESTE tipo de chamada, não presumido do plano irmão.**

## Deviations from Plan

### Registradas

**1. [Rule 1 - Bug] O portão estático reprovou o MEU comentário de conserto**

- **Found during:** Passo 3, primeira execução do `<verify>` #2
- **Issue:** para registro histórico, citei no docblock a expressão defeituosa entre crases (o
  `?? 1` sobre a busca do peso pelo nome). O portão do plano procura exatamente essa forma no
  disco — e a encontrou, em **três** lugares do meu próprio texto (`sjt-rubrica.ts:25`,
  `avaliar-redacao/index.ts:31` e `:134`).
- **Fix:** os três passaram a DESCREVER a expressão sem reproduzi-la, com nota dizendo por que não
  a citam. O portão está certo e o meu texto estava errado: citá-la a deixaria greppável no mesmo
  arquivo, e quem procurasse pelo defeito continuaria achando-o ali. **É a repetição literal da
  Deviation 1 do 49-09** (`essay-schemas.ts`) — e eu havia lido aquele SUMMARY antes de começar,
  o que sugere que a lição precisa estar no PATTERNS da fase, não só num SUMMARY.
- **Files modified:** `supabase/functions/_shared/sjt-rubrica.ts`, `supabase/functions/avaliar-redacao/index.ts`
- **Verification:** `<verify>` #2 → OK.
- **Commit:** `e75ecc8b`

**2. [Rule 2 - Funcionalidade crítica ausente] `motivos_revisao`: as 4 causas eram indistinguíveis**

- **Found during:** conferência do marcador no bundle da v20 (`dimensao_desconhecida` = 0)
- **Issue:** o plano usa `dimensao_desconhecida` (singular) em `must_haves` e `dimensoes_desconhecidas`
  (plural) no `<action>`. Ao decidir o que o singular NOMEIA — a condição — apareceu que uma linha
  `pendente_humano` não registrava POR QUE, e as quatro causas pedem consertos opostos (tabela em
  §«O portão apontou…»).
- **Fix:** `metadata.motivos_revisao` (lista completa, vocabulário fechado, ausente em `sucesso`) +
  `insufficient_evidence_da_ia` separado do sinal combinado. O limiar **não** mudou (RNF-07a).
  Alternativas descartadas: renomear a lista para o singular (plural é o nome certo para uma lista)
  e passar o portão por resultado (esconderia o defeito que ele apontou).
- **Files modified:** `supabase/functions/avaliar-redacao/index.ts` + testes
- **Verification:** 3 testes novos; mutações M13–M16 reprovando; `dimensao_desconhecida` = 3 no
  bundle vivo.
- **Commit:** `36cdad50` · **Custo:** um redeploy (v20 → v21)

**3. [Rule 2 - Funcionalidade crítica ausente] Teste do filtro de peso torto, para dar mordida ao que estava alcançável**

- **Found during:** prova de mordida, mutação M3
- **Issue:** M3 não reprovou nada. O ramo mutado é inalcançável por construção (ver §M3) — um
  portão que não pode falhar.
- **Fix:** não relaxei nem removi a redundância; acrescentei vigilância ao que ESTAVA alcançável e
  não tinha — o filtro de `rubricDimensoesFrom` (dimensão com `peso` não numérico sai do vocabulário
  E do bloco). E M11/M12 passaram a cobrir separadamente o roteamento e a nomeação.
- **Files modified:** `supabase/functions/avaliar-redacao/__tests__/index.test.ts`
- **Verification:** 37/0 com o teste novo; M11 e M12 reprovam 2 cada.
- **Commit:** `d2ae9683`

**4. [Rule 3 - Blocker instrumental] O `<verify>` #3 embute DUAS escritas e não é re-rodável**

- **Found during:** fechamento
- **Issue:** (a) o `<verify>` #3 encadeia `node efdeploy.cjs` **sem** `--dry-run` — re-rodá-lo
  criaria uma version 22 idêntica à 21, poluindo o histórico de deploy para não provar nada novo.
  (b) `resend-webhook.test.ts` continua abortando ao resolver `npm:svix@1.99.1` (pré-existente,
  fora de escopo, já em WINDOWS).
- **Fix:** (a) re-verificado pelo **resultado**, que é a afirmação mais forte: `version=21` /
  `ACTIVE` / `verify_jwt=true` / `import_map=true` **relidos da Management API**, os marcadores
  lidos do bundle vivo, `--dry-run` (re-rodável) confirmando `sjt-rubrica.ts` no fechamento, e
  `origin/main..HEAD` vazio. (b) excluído das rodadas de suíte, como nos planos anteriores; **não**
  «consertado» (Scope Boundary).
- **Files modified:** nenhum
- **Registrado em:** `.planning/WINDOWS.md` (entrada **55**, `unrun-verify`) — **terceira** ocorrência
  da fase (51 do 49-08, 53 do 49-09)

---

**Total deviations:** 4 (1 × Rule 1, 2 × Rule 2, 1 × Rule 3).
**Impact:** nenhum negativo no comportamento entregue. A **2** ampliou o escopo (um campo de
metadata e um redeploy) e é a mais valiosa: veio de levar o portão a sério em vez de declará-lo
equivocado. A **1** é a repetição literal de uma deviation do plano irmão — o custo de não ter
promovido aquela lição a padrão da fase.

## Deferred (registrado, não consertado)

| Item | Por quê fica fora | Onde ficou registrado |
|---|---|---|
| Nenhuma tela lê `motivos_revisao` / `dimensoes_desconhecidas` (`CasoAbertoMetadata` em `scoresRhService.ts:62-66` declara só `dimension_scores` e `composite_0_25`) — uma SJT que foi para revisão porque a IA inventou o nome aparece ao RH como qualquer outra | o front é de quem o toca (D-55); é o irmão SJT do D-25 | **WINDOWS 56** |
| A saída real do modelo sob a rubrica nova (~1281 tok a mais no pedido) contra `max_tokens` 3000 — **sem baseline**: o `work_sample_sjt` nunca logou chamada | `max_tokens` é teto de SAÍDA e o bloco alonga o PEDIDO; mexer sem medir é consertar o parâmetro errado. A prova é do 49-18 | **WINDOWS 57** + item de juízo no `coverage` |
| A única SJT avaliada segue com 7,00 (média uniforme), sem proveniência e sem motivo | sem escrita retroativa (D-30/D-26): a rubrica que a avaliou não existia, então não há nota correta a recalcular | **WINDOWS 58** |
| O `<verify>` #3 embute escritas | terceira ocorrência da fase | **WINDOWS 55** |
| `gerar-guia-entrevista:267` — sexto sítio de `vagaRubricBlock` fora da tabela C7 | é do 49-10/49-11; confirmado ainda aberto | §Passo 1 acima |
| O SQL do C7 do kickoff procura só `{{BARS_RUBRIC_DIMENSIONS}}` e o do SJT é `{{BARS_RUBRIC_WITH_CRITERIA}}` | não muda nenhuma decisão deste plano; registrado para quem reusar o padrão | §Medições vivas acima |
| Âncoras 1–5 por dimensão da rubrica | **não existem em fonte nenhuma** — inventá-las é o que o plano proíbe. Há teste fixando `ancoras === null` que reprova de propósito se alguém as acrescentar sem registrar a fonte | docblock §`ancoras` + teste |

## Known Stubs

**Nenhum.** Varridos os 4 arquivos por `TODO|FIXME|placeholder|coming soon|not available|não
disponível`: os acertos são (a) as palavras portuguesas «todo/todos» dentro de frases («todos
inclusion atendidos», «todo leitor futuro», «Todo cabeçalho»), e (b) «placeholder» no meu próprio
docblock de `sjt-rubrica.ts:10`, onde ela é o **substantivo** que descreve o defeito
(`{{BARS_RUBRIC_WITH_CRITERIA}}` nunca substituído) — não um marcador de trabalho pendente. Mesma
forma de falso positivo registrada no 49-09.

Nenhum valor vazio codificado, nenhum componente sem fonte de dados, nenhum caminho não fiado.

⚠ **Duas coisas que NÃO são stub mas parecem:**

1. **`ancoras: null` nas cinco dimensões.** É medição registrada com prova e com teste, não campo
   esquecido — ver `key-decisions` e o §`ancoras` do docblock. O campo existe no tipo porque a
   própria fonte prevê que as âncoras cheguem (`bars-rubrics-por-dimensao.md:43`), e o caminho de
   renderização **é exercitado por teste** com catálogo injetado, para não ser ramo morto.
2. **O `?? 0` no peso** (o ramo do M3). Inalcançável por construção hoje, mantido como segunda
   linha de defesa — medido e nomeado, não escondido.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano: nenhum endpoint novo,
nenhum caminho de auth novo, nenhuma mudança de esquema, nenhuma coluna nova. As 4 mitigações
declaradas ficaram provadas:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-23-01 (dimensão inventada virando nota com peso 1) | mitigate | validação por chave, com 4 testes na EF (os 5 nomes reais de PROD, 1-entre-4, peso torto, motivo) + 15 na constante; mutações M1, M2, M9, M10, M11, M12 |
| T-49-23-02 (SJT sem registro de qual modelo a avaliou) | mitigate | `provedor_ia`/`modelo_ia` reais nos 3 caminhos; `'none'` → NULL; mutações M4 e M5; marcadores lidos do bundle vivo |
| T-49-23-03 (escrita falha devolvendo `ok: true`) | mitigate | erro destruturado nos 3 inserts, um teste para cada; mutação M6 reprova 3 |
| T-49-23-SC (supply chain) | mitigate | **zero instalação de pacote**, nenhum import novo de rede. `sjt-rubrica.ts` tem zero imports por contrato, com portão próprio e guarda anti-vácuo |

O texto da resposta do candidato segue UNTRUSTED e passando por `callAi` (máscara PII + detecção
de injeção), sem alteração — e agora há teste que exercita o caminho de injeção ponta a ponta na EF,
provando que ele grava proveniência NULL em vez de inventá-la.

## Issues Encountered

- **`tsc` em 89 contra teto 90 (D-53): margem de UM.** Este plano não acrescentou nenhum erro (os
  arquivos tocados são Deno/EF, fora do `include` do `tsconfig.json`) e o **conjunto de mensagens é
  idêntico** — conferido por `diff` sobre as linhas ordenadas, não só pela contagem. O hook imprimiu
  `tsc errors: 89 (frozen baseline: 96)` nos três commits. ⚠ `sjt-rubrica.ts` entrará no `tsconfig`
  se algum plano de front o importar do `src/` (como o 49-15 fará com `bars-redacao.ts`).
- **A repetição da Deviation 1 do 49-09 é o achado de processo mais importante daqui.** Li aquele
  SUMMARY antes de começar, e cometi o mesmo erro (citar a expressão defeituosa para registro
  histórico), em três lugares. Uma lição que vive só num SUMMARY de plano irmão não sobrevive ao
  plano seguinte.
- **`gsd-tools check tdd-red-evidence` não se aplica:** Task 1 é `type="tracer"`, que por definição
  não tem fase RED própria; e o checker lê contadores do `node:test`, não a saída do `deno test`.
  As 16 mutações são a prova de mordida equivalente, e nenhum artefato foi sintetizado para agradar
  um checker.
- **`work_sample_sjt` continua sem nenhuma chamada Sonnet logada.** A taxonomia do 49-02 e o bloco
  novo estão no ar, mas ninguém os exercitou — a primeira SJT avaliada pela v21 é a primeira
  observação real dos dois.

## Next

Plano 49-24. O que este plano deixa pronto:

- **49-18** (prova em PROD): tem `motivos_revisao`, `dimensoes_desconhecidas`, `rubrica_ausente` e
  a proveniência em `scores_candidato.metadata` para vigiar, e é quem fecha a **WINDOWS 57** (a
  saída real contra `max_tokens` 3000 — sem baseline, porque o `work_sample_sjt` nunca logou).
  ⚠ **nenhum smoke olha para `scores_candidato.metadata` hoje.**
- **Um plano de front** (não existe hoje; WINDOWS 56): `CasoAbertoMetadata` precisa de
  `motivos_revisao` + `dimensoes_desconhecidas`, e `ScorecardAvaliacao.tsx` de mostrá-los. Sem
  isso, o motivo da revisão está gravado e ninguém o lê — o que é melhor que não estar gravado, e
  ainda não é o conserto.
- **49-24**: se tocar uma EF que consome `_shared`, lembrar que o deploy é de quem a toca (D-55) e
  que o contrato do 49-02 **só está no ar nas três EFs já deployadas** (comparativo v28,
  redação-cultural v15, `avaliar-redacao` v21).

## Self-Check: PASSED

- `supabase/functions/_shared/sjt-rubrica.ts` — FOUND
- `supabase/functions/_shared/__tests__/sjt-rubrica.test.ts` — FOUND
- `supabase/functions/avaliar-redacao/index.ts` · `__tests__/index.test.ts` — FOUND
- commits `e75ecc8b`, `d2ae9683`, `36cdad50` — os três FOUND em `git log --all`, e os três já em
  `origin/main`
- `commits: 3` **MEDIDO** por `git rev-list --count c5c749ec..HEAD`, não narrado; `plan_head_before`
  registrado; `tokens` = octetos de diff ÷ 4, sem arredondar para agradar a estimativa
- nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio); nenhum arquivo
  untracked; `git status --short` limpo
- `<acceptance_criteria>` re-executados: verdes — constante sem imports com as 5 chaves vivas e a
  fonte de cada campo no docblock (as 5 sem âncora **registradas aqui**, com prova de por que não
  há); nome inventado vai para revisão e não pesa (teste); pesos aplicados pela chave (teste);
  `metadata` com `provedor_ia`/`modelo_ia`; escritas com erro checado; EF deployada com
  `verify_jwt=true`; marcador `dimensao_desconhecida`=3 no bundle vivo; `origin/main..HEAD` vazio
- `<verification>` de plano re-executada: 40/0 no conjunto do plano, **687/0** na suíte inteira das
  EFs, portão estático OK, `version=21 ACTIVE verify_jwt=true import_map=true` relidos de PROD,
  fechamento conferido arquivo a arquivo contra a v19, marcadores lidos do bundle vivo, push
  confirmado
- 16 mutações executadas com restauração VERIFICADA em cada uma; a única que não mordeu foi
  **medida e nomeada**, e virou um teste novo para o que estava alcançável — nenhuma declarada
  aprovada
- varreduras C7 e C6 re-rodadas: **delta em ambas** (C7: o sítio 1 consertado pelo 49-09 e a linha
  andou; C6: 11 → 8 → 5), mais um delta novo registrado no SQL do C7 do kickoff (o placeholder do
  SJT tem outro nome)

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-22*
