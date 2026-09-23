---
phase: 49-consertos-da-jornada-bloco-2
plan: 13
subsystem: frontend-rh
tags: [jorn-25, jorn-28, d-27b, d-30, d-55, comparativo, proveniencia, pdf, selo, tdd, deploy]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "08"
    provides: "a resposta da EF `comparativo-candidatos` v28 (viva em PROD) com `posicoes` (`C<n>` → `candidatura_id`, montado no MESMO laço do prompt), `provedor_ia`, `modelo_ia`, `fallback_cause`, e os códigos `ENCERRADA`/`SEM_ANALISE`. Também o teto `COMPARATIVO_MAX_CANDIDATOS`, de onde a mensagem de `VALIDATION` é montada"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`_shared/ai-error-codes.ts` — `CAUSA_FALLBACK_ROTULO`, a causa legível («não coube», «demorou», «fora do schema») que o selo e o PDF imprimem. Contrato de ZERO IMPORTS, que é o que permite importá-lo do front por caminho relativo"
provides:
  - "`src/features/triagem/components/ProvenienciaIABadge.tsx` — o selo ÚNICO de proveniência do produto (`ProvenienciaIABadge`, `PROVENIENCIA_IA_COPY`, `textoProveniencia`, `ehResultadoDeContingencia`, `data-testid=\"proveniencia-ia-badge\"`), com a regra «é fallback ⇔ `provedor_ia='openai'`» num lugar só. Consumido já pelo comparativo e pelo PDF; é o que 49-15/49-16/49-22 importam"
  - "`textoProveniencia(...)` — a frase canônica, para que tela e PDF não possam discordar"
  - "`invokeComparativo` → `{ ranking, posicoes, provedor_ia, modelo_ia, fallback_cause, latencia_ms }` (só ACRÉSCIMOS) e o mapa `RECUSA_COMPARATIVO_COPY` com cópia própria para `MIXED_VAGA`/`ENCERRADA`/`SEM_ANALISE`/`VALIDATION`/`FORBIDDEN`"
  - "`resolveCandidates(ranked, posicoes, selection)` exportada e testada — rótulo pela CHAVE, com degradação para o rótulo cru"
  - "`exportComparativo(candidates, proveniencia?)` — a linha de proveniência abaixo do título do PDF"
  - "marcadores `proveniencia-ia-badge` e «modelo de contingência» VIVOS em `https://rh.beautysmile.com.br` (chunk lazy `ComparativoScreen-BoE2aJXz.js`)"
affects: [49-15, 49-16, 49-22]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 16838
  tasks: 2
  commits: 3
  plan_head_before: 0dab85f43ddafcaf88e321d8c07c804aaf7cbbd6
  # `commits: 3` MEDIDO por `git rev-list --count 0dab85f4..HEAD` no instante da escrita deste
  # SUMMARY (e75acc70, b2f94ddb, 322dfe80) — os três de PRODUÇÃO e os três já em `origin/main`.
  # Re-medir DEPOIS do commit de metadado deste plano dá 4, por construção. A fronteira é esta.
  # `tokens: 16838` = 67 352 octetos de `git diff 0dab85f4..HEAD -- src` ÷ 4.
  estimate_tokens_do_plano: 70000
  # O plano estimou 70 000 e o realizado foi 16 838 — 4,2× ABAIXO, registrado sem arredondar.
  # ⚠ É a QUARTA amostra consecutiva da fase errando na mesma direção (49-03: 10×; 49-04: 6,6×;
  # 49-05: 6,8×; 49-08: 5,9×; agora 4,2×). A razão já tem nome e continua valendo: o peso está
  # em LEITURA e MEDIÇÃO, que não aparecem no diff — aqui foram a EF de 49-08 (o formato exato
  # de `posicoes` e das recusas), o `ai-error-codes` de 129 linhas, o `ComparativoScreen` de
  # 383, o `exportComparativo` de 113, o `assert-chunks.mjs` e a varredura P3/C7. Vale notar
  # que este é o MENOR erro das cinco, e a diferença é plausível: este plano ESCREVEU mais
  # (um componente novo, três arquivos de teste novos) do que os anteriores.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "rótulo resolvido pela CHAVE que o servidor devolve, nunca pela posição na requisição: um mapa `rótulo → id` montado no mesmo laço que montou o prompt é a única forma em que os dois lados não podem divergir — e a divergência, quando acontece, troca PESSOAS sem nada na tela indicando"
    - "degradação que PARECE degradada: sem entrada no mapa, mostrar o rótulo cru (`C1`) em vez do vizinho. Um nome plausível e errado não é conferido por ninguém; um rótulo visivelmente incompleto é"
    - "`undefined` ≠ `null` como contrato de prop: `undefined` = o consumidor não fiou o dado (nenhum selo), `null` = fiou e o servidor não sabe («não registrado»). Colapsar os dois faz a tela afirmar uma medição que não houve"
    - "a regra de classificação («é fallback ⇔ provedor = openai») mora NUMA função nomeada e exportada, com a condição que a sustenta escrita no docblock («enquanto o primário do callAi for Anthropic») — é o que faz uma mudança de premissa ter UM lugar para acontecer"
    - "importar a FUNÇÃO que constrói a cópia, não a CONSTANTE de cópia: a igualdade passa a ser por construção, e não há um segundo objeto que um leitor tome por outra fonte (o `noUnusedLocals` reprova o inverso)"
    - "uma causa de erro só acompanha o aviso a que pertence: anexar `fallback_cause` a um resultado do primário descreveria uma falha que não houve"

key-files:
  created:
    - src/features/triagem/components/ProvenienciaIABadge.tsx
    - src/features/triagem/components/__tests__/ProvenienciaIABadge.test.tsx
    - src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx
    - src/features/triagem/pdf/__tests__/exportComparativo.test.ts
  modified:
    - src/features/triagem/services/triagemService.ts
    - src/features/triagem/services/__tests__/triagemService.test.ts
    - src/features/triagem/hooks/useComparativo.ts
    - src/features/triagem/components/ComparativoScreen.tsx
    - src/features/triagem/components/__tests__/ComparativoScreen.test.tsx
    - src/components/pages/ComparativoCandidatosPage.tsx
    - src/features/triagem/pdf/exportComparativo.ts

key-decisions:
  - "O selo NÃO substitui o `SugestaoIABadge`; os dois convivem no topo. Eles respondem perguntas diferentes — «isto é sugestão, a decisão é humana» (RNF-07a) e «quem gerou esta sugestão» (D-27b) — e fundi-los faria um aviso legal e um aviso técnico disputarem o mesmo espaço, com o risco de o segundo ser lido como reforço do primeiro. Há teste fixando a convivência."
  - "`undefined` e `null` nas props de proveniência do `ComparativoScreen` significam coisas DIFERENTES, de propósito. `undefined` = o consumidor não fiou (o embed read-only da `DecisaoFinalPage`, até o 49-22) ⇒ nenhum selo; `null` = fiou e a EF não gravou ⇒ «modelo não registrado» (D-30). Colapsar os dois faria a `DecisaoFinalPage` exibir hoje um selo dizendo «não registrado» sobre um dado que ela nunca pediu — inventando uma medição."
  - "O PDF importa `textoProveniencia`, e NÃO `PROVENIENCIA_IA_COPY`. A função é construída da constante, então a cópia é idêntica por CONSTRUÇÃO; importar a constante para não usá-la seria código morto que um leitor tomaria por uma segunda fonte — e o `noUnusedLocals` do projeto o reprovaria com razão. A letra do plano pedia a constante; o invariante que ela protege (uma cópia só) está satisfeito de forma mais forte."
  - "A ramificação da cópia de recusa ficou TAMBÉM no caminho do `error` (FunctionsHttpError), não só no `!data.ok`. É por ali que uma recusa 4xx de fato chega do supabase-js: deixá-la só no segundo bloco faria as quatro recusas novas caírem no genérico, e o plano teria «passado» com o defeito que vem consertar."
  - "`FORBIDDEN` recebeu mensagem GENÉRICA de propósito. A EF responde o MESMO 403 para «não existe» e «não é sua» (T-49-08-02); uma frase que os distinguisse na tela reconstruiria, no cliente, o oráculo de existência que a EF acabou de fechar."
  - "A linha de proveniência do PDF vai ABAIXO DO TÍTULO, não no rodapé, e a tabela desce para não cobri-la. Um aviso no fim é lido quando a leitura terminou e a decisão já está formada. Há asserção de POSIÇÃO (`prov.y > titulo.y`, `startY > prov.y`), não só de presença."
  - "`exportComparativo` sem o 2º parâmetro NÃO imprime «modelo não registrado». Um chamador que nunca passou o dado não fez medição nenhuma; afirmá-la por ele seria inventar. `modeloIa: null` PASSADO é o caso que imprime."
  - "Evidência de RED registrada à mão. `gsd-tools check tdd-red-evidence` não classifica um run vitest (quarto registro do mesmo limite nesta fase) e nenhuma linha de contador foi sintetizada para contorná-lo."

requirements-completed: []
# ⚠ Os 2 IDs do plano (JORN-25, JORN-28) ficaram BLOQUEADOS pelo portão de ID compartilhado
# (#2388): `requirements.ready-ids` devolveu `ready: []`. JORN-25 é declarado também por
# 49-18 e 49-22 (sem SUMMARY); JORN-28 também por 49-15, 49-16 e 49-18. Isso é o portão
# funcionando: a metade do JORN-28 que ainda falta são as OUTRAS telas (redação, guia,
# análises) usarem este mesmo selo, e a do JORN-25 é o rótulo da decisão final (49-22).

# Coverage (#1602)
coverage:
  - deliverable: "O rótulo de cada posição do ranking vem da CHAVE que a EF devolve, nunca da posição na seleção (JORN-25 / T-49-13-01)"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx#seleção em ordem DIFERENTE do ranking: C1 → o candidato que a EF ranqueou 1º, não o 1º da seleção"
        status: pass
      - kind: test
        ref: "src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx#a implementação por POSIÇÃO daria o nome do vizinho — e é isso que deixou de acontecer"
        status: pass
      - kind: test
        ref: "src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx#empate de score com seleção invertida — o caso em que o defeito antigo era invisível"
        status: pass
      - kind: command
        ref: "node -e '… ComparativoCandidatosPage sem `replace(/\\D/g` em código executável · usa `posicoes`' → OK"
        status: pass
  - deliverable: "Posição sem entrada em `posicoes` mostra o rótulo CRU, nunca o nome do vizinho (Discretion obrigatória do JORN-25)"
    human_judgment: false
    verification:
      - kind: test
        ref: "ComparativoCandidatosPage.test.tsx#rótulo sem entrada em `posicoes` mostra o próprio `candidate_id`"
        status: pass
      - kind: test
        ref: "ComparativoCandidatosPage.test.tsx#`posicoes` vazio (EF anterior ao 49-08) ⇒ TODOS os rótulos crus, nenhum nome da seleção"
        status: pass
      - kind: test
        ref: "ComparativoCandidatosPage.test.tsx#id em `posicoes` mas ausente da seleção ⇒ nome cru, e o candidaturaId REAL é preservado"
        status: pass
      - kind: test
        ref: "triagemService.test.ts#EF anterior ao 49-08 (sem os campos) ⇒ `posicoes` {} e proveniência null, sem lançar"
        status: pass
  - deliverable: "D-27b: existe UM componente `ProvenienciaIABadge` que diz «gerado pelo modelo de contingência» com o modelo real quando `provedor_ia='openai'`, e «modelo não registrado» quando `modelo_ia` é NULL — nunca silêncio"
    human_judgment: false
    verification:
      - kind: test
        ref: "ProvenienciaIABadge.test.tsx#provedor openai + modelo real + causa `anthropic_max_tokens` ⇒ diz contingência, o modelo e «não coube»"
        status: pass
      - kind: test
        ref: "ProvenienciaIABadge.test.tsx#provedor anthropic ⇒ NÃO renderiza aviso de contingência, e ainda diz qual modelo respondeu"
        status: pass
      - kind: test
        ref: "ProvenienciaIABadge.test.tsx#modelo_ia null ⇒ «modelo não registrado», e o selo APARECE (nunca silêncio)"
        status: pass
      - kind: test
        ref: "ProvenienciaIABadge.test.tsx#`ehResultadoDeContingencia` é a REGRA num lugar só: openai sim, anthropic/null não"
        status: pass
      - kind: test
        ref: "ProvenienciaIABadge.test.tsx#causa desconhecida degrada para o próprio código — nunca para silêncio nem para uma causa inventada"
        status: pass
  - deliverable: "O comparativo da vaga mostra o selo ACIMA do ranking, e ele não substitui o guardrail RNF-07a"
    human_judgment: false
    verification:
      - kind: test
        ref: "ComparativoScreen.test.tsx#fallback (provedor openai) ⇒ o selo aparece ACIMA do ranking (comparado por `compareDocumentPosition`), com o modelo real e a causa"
        status: pass
      - kind: test
        ref: "ComparativoScreen.test.tsx#o selo de proveniência NÃO substitui o SugestaoIABadge — os dois convivem no topo"
        status: pass
      - kind: test
        ref: "ComparativoScreen.test.tsx#consumidor que NÃO fia a proveniência (embed read-only até o 49-22) não ganha selo inventado"
        status: pass
  - deliverable: "D-27b no PDF: a linha de proveniência abaixo do título, com o modelo, o aviso de contingência e a causa legível — na MESMA cópia da tela"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/features/triagem/pdf/__tests__/exportComparativo.test.ts#fallback: diz contingência, o modelo REAL e a causa legível — logo abaixo do título (posição asserida: prov.y > titulo.y, mesma margem x)"
        status: pass
      - kind: test
        ref: "exportComparativo.test.ts#a cópia do PDF é EXATAMENTE a da tela — não uma segunda redação (comparada contra `textoProveniencia`)"
        status: pass
      - kind: test
        ref: "exportComparativo.test.ts#modelo NULL ⇒ «modelo não registrado» (D-30); a linha NÃO desaparece"
        status: pass
      - kind: test
        ref: "exportComparativo.test.ts#a tabela continua atributos-linha / candidatos-coluna e começa DEPOIS da linha de proveniência (`startY > prov.y`)"
        status: pass
      - kind: test
        ref: "ComparativoScreen.test.tsx#com proveniência fiada, o PDF recebe a proveniência junto"
        status: pass
  - deliverable: "`invokeComparativo` devolve os campos novos e mapeia as 4 recusas novas para cópia verdadeira, sem quebrar a `DecisaoFinalPage`"
    human_judgment: false
    verification:
      - kind: test
        ref: "triagemService.test.ts#ENCERRADA ⇒ diz que uma candidatura está encerrada (e a frase «vagas diferentes» NÃO aparece mais nesta causa)"
        status: pass
      - kind: test
        ref: "triagemService.test.ts#SEM_ANALISE ⇒ diz que falta análise e o que fazer (aguardar ou reprocessar)"
        status: pass
      - kind: test
        ref: "triagemService.test.ts#VALIDATION ⇒ a mensagem carrega o teto vindo da CONSTANTE da EF, não de um literal paralelo"
        status: pass
      - kind: test
        ref: "triagemService.test.ts#FORBIDDEN ⇒ mensagem GENÉRICA de propósito: não distingue «não existe» de «não é sua»"
        status: pass
      - kind: test
        ref: "triagemService.test.ts#a recusa que chega como FunctionsHttpError (4xx) usa a MESMA cópia, não o genérico"
        status: pass
      - kind: test
        ref: "triagemService.test.ts#200 devolve `posicoes`, `provedor_ia`, `modelo_ia` e `fallback_cause`"
        status: pass
      - kind: command
        ref: "npm run -s lint → 89 `error TS`, ZERO deles em `DecisaoFinalPage` / nos arquivos tocados; conjunto de mensagens IDÊNTICO ao de antes do plano (diff sem linha/coluna)"
        status: pass
  - deliverable: "A invariante da Phase 45 do `ComparativoScreen.test.tsx` continua verde (D-56)"
    human_judgment: false
    verification:
      - kind: test
        ref: "ComparativoScreen.test.tsx — os 7 casos pré-existentes seguem verdes, incluindo o de `:121` («Avançar abre confirm dialog e dispara onAvancar — OPER-01 inalterado») e o embed read-only"
        status: pass
      - kind: test
        ref: "suíte inteira: 212 arquivos / 2171 testes, 0 falhas (baseline do 49-05: 209 / 2129)"
        status: pass
  - deliverable: "Texto novo passa pelo guard LGPD-04/RNF-12; tsc ≤ 90; publicado e no ar (D-52)"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/__tests__/guards/forbidden-strings.grep.test.ts verde no mesmo run (D-58 / D-07)"
        status: pass
      - kind: command
        ref: "npm run build → exit 0, `assert-chunks PASSED`, 47 chunks, jsPDF FORA do índice eager; `grep -rl proveniencia-ia-badge build/assets/` → `ComparativoScreen-BoE2aJXz.js` (chunk lazy de /rh/*)"
        status: pass
      - kind: command
        ref: "git push origin main; git log --oneline origin/main..HEAD → vazio"
        status: pass
      - kind: command
        ref: "crawler em https://rh.beautysmile.com.br → PRESENTE em PROD: `proveniencia-ia-badge` (2ª tentativa) e «modelo de contingência»"
        status: pass
  - deliverable: "O RH entende, olhando o selo, que não deve confiar naquele ranking como se fosse do modelo configurado"
    human_judgment: true
    rationale: "Os testes provam que o selo aparece, com o texto e a cor certos, acima da tabela, e que o marcador está no ar. Se «Gerado pelo modelo de contingência gpt-4o-mini (motivo: não coube)» comunica a um recrutador não-técnico que ele deve reprocessar antes de decidir — ou se o nome de um modelo é ruído para ele — é juízo de UX sobre texto em pt-BR. Nenhuma pessoa abriu esta tela nesta sessão, e o caso de fallback não é reproduzível sob demanda sem forçar um estouro de `max_tokens` em PROD."
  - deliverable: "O selo continuará correto se o primário do `callAi` mudar"
    human_judgment: true
    rationale: "A regra «é fallback ⇔ provedor_ia = 'openai'» é verdadeira HOJE porque o primário é sempre Anthropic e o único destino de contingência é a OpenAI. O plano P1 (trocar o primário) está fora do M8, então nada nesta sessão a exerce. O que se garante é estrutural e verificável: a regra vive numa função nomeada e exportada, com a premissa escrita no docblock, e há teste pinando os quatro valores — se a premissa cair, há UM lugar para consertar, e o teste é o primeiro a reprovar. Que isso seja suficiente é juízo sobre manutenção futura, não um fato medido."

# Metrics
duration: 17 min
completed: 2026-09-23
tasks: 2
files: 11
---

# Phase 49 Plano 13: O comparativo diz de quem é cada posição, e qual modelo ranqueou Summary

**O rótulo `C<n>` do comparativo deixou de ser resolvido pela POSIÇÃO na seleção e passou a ser
resolvido pela CHAVE que a Edge Function devolve — o que importa exatamente no caso em que ninguém
olharia, o empate de score. No mesmo passo nasceu o selo de proveniência que as outras telas vão
usar, e o PDF que circula fora da empresa passou a dizer qual modelo gerou o ranking. Os dois
marcadores estão no ar.**

## O que estava errado

**O rótulo pela posição (JORN-25).** `resolveCandidates` lia o número do rótulo anonimizado e
indexava a seleção: `C2` → `selection[1]`. Isso só está certo se a EF anonimizar na MESMA ordem em
que o painel entregou a seleção — e ela não faz isso: ordena por `score_match` com desempate por
`candidatura_id` (49-08). **Num empate de score, o mesmo pedido podia trocar `C1` e `C2` entre
execuções**, e o RH leria os pontos fortes, os gaps e a justificativa de uma pessoa **sob o nome de
outra**, sem nada na tela indicando a troca. Não é um defeito de layout: é de repúdio — a decisão
registrada seria sobre a pessoa errada, e o registro pareceria consistente.

**O fallback calado (JORN-28).** Em 2026-09-20 um comparativo de 6 candidatos estourou o
`max_tokens` do Sonnet, o parse falhou, e o ranking que o RH leu **saiu do `gpt-4o-mini`** —
registrado como sucesso, sem marca nenhuma na interface. O plano 49-08 passou a gravar e devolver a
proveniência; até este plano, ela chegava ao cliente e **era descartada**.

**As duas recusas novas sem cópia no front.** O `triagemService` conhecia `MIXED_VAGA` e o genérico.
Os códigos `ENCERRADA` e `SEM_ANALISE`, que o 49-08 criou justamente porque a frase «vagas
diferentes» era FALSA naqueles casos, caíam no genérico — melhor que a mentira anterior, pior que o
alvo. O próprio SUMMARY do 49-08 registrou isso como pendência deste plano.

## Passo 1 (D-50) — as varreduras P3 e C7 #7 re-rodadas: mais lugares que o registrado

### C7 #7 — `replace(/\D/g` no front: 10 ocorrências, 2 são o defeito

| Onde | O que faz | Classe |
|---|---|---|
| `ComparativoCandidatosPage.tsx:71` | resolvia `C<n>` por POSIÇÃO | **defeito** → consertado por ESTE plano |
| `DecisaoFinalPage.tsx:72` | idem, na decisão final | **defeito** → 49-22 |
| `candidatoSchema.ts:46,213` · `cpfValidator.ts:22` · `DadosPessoaisStep.tsx:205` · `EnderecoStep.tsx:109,138` · `viaCepService.ts:50` · `duplicateCheckService.ts:117` | máscara de CPF / CEP / telefone | escopo deliberado — é exatamente para isso que a expressão serve |

Oito das dez são legítimas, e é por isso que o padrão sozinho não é um veredito: ele precisa da
pergunta «este número é uma máscara de formato ou uma inferência sobre identidade?».

### P3 — literais de teto: **13 linhas, não 12**

| Lugar | Medido agora | Kickoff / 49-08 | Quem conserta |
|---|---|---|---|
| `ComparativoCandidatosPage.tsx:103`, **`:153`**, `:172` | **TRÊS linhas** | 49-08 registrou **duas** (`:103`, `:172`) | 49-22 |
| `DecisaoFinalPage.tsx:123`, **`:181`**, `:201` | **TRÊS linhas** | 49-08 registrou **duas** (`:123`, `:201`) | 49-22 |
| `TriagemTable.tsx:50,52,214,215,267,391,423,425` | oito | oito (+ `:6`, `:204` de comentário) | 49-22 |
| `PROXIMA_ETAPA_APOS_TRIAGEM` em `ComparativoCandidatosPage.tsx:120` | presente | presente (49-05) | 49-22 |

⚠ **Delta contra o 49-08: DOIS lugares a mais, e os dois pelo mesmo motivo.** O 49-08 contou as
linhas com o par completo (`>= 2 && <= 10`) e não contou as que carregam **só o piso**
(`ids.length < 2`, `finalistIds.length < 2`), que decidem a mensagem de «selecione ao menos 2». São
literais de teto do mesmo jeito: quando o 49-22 trocar `COMPARE_MIN`/`COMPARE_MAX` pela constante e
esquecer essas duas, a tela dirá «ao menos 2» num lugar e lerá a constante no outro, e a incoerência
só aparece se o mínimo mudar. É **a mesma família de subcontagem** que o 49-08 apontou no kickoff —
o que faz deste o segundo registro seguido de que a varredura P3 vinha medindo menos do que existe.
**Registrado para o 49-22: são 13 linhas, não 12, e não 8.**

Nenhum dos dois grupos foi tocado aqui (Scope Boundary — são do 49-22). A única constante de teto que
este plano consome é a da **mensagem** de `VALIDATION`, que o plano designa explicitamente.

## Accomplishments

1. **`resolveCandidates` resolve por chave.** Recebe `posicoes`, monta um `Map` por
   `candidatura_id` e faz lookup por id. A ordem da seleção deixou de importar. A função foi
   **exportada** para teste direto — é pura, e o caso que importa (seleção em ordem diferente do
   ranking) é caro de montar pela página inteira. Há um teste que afirma o negativo explicitamente
   (`expect(out[0].nome).not.toBe('Ana')`), porque «o nome certo apareceu» é compatível com uma
   coincidência de ordem e «o nome do vizinho NÃO apareceu» não é.

2. **A degradação parece degradada.** Sem entrada em `posicoes` — o que acontece se a EF publicada
   for anterior ao 49-08 — a tela mostra `C1` como `C1`. Quatro testes fixam isso, incluindo o caso
   em que o id existe no mapa mas não na seleção: aí o **nome** é cru e o **`candidaturaId` real é
   preservado**, porque perder o id transformaria «não sei o nome» em «não sei quem mover».

3. **O selo de proveniência nasceu como fonte única.** `ProvenienciaIABadge` traz a cópia canônica,
   a variante `compact`/`full`, o `data-testid`, e — o ponto — a regra «é fallback ⇔
   `provedor_ia = 'openai'`» numa função nomeada e exportada
   (`ehResultadoDeContingencia`), com a premissa que a sustenta escrita no docblock: *enquanto o
   primário do `callAi` for Anthropic*. Se a P1 trocar o primário, há **um** lugar para consertar, e
   o teste que pina os quatro valores é o primeiro a reprovar.

4. **«Não sei» é dito (D-30).** `modelo_ia` NULL imprime «modelo não registrado» e o selo **aparece**.
   Ausência de selo é indistinguível de proveniência confirmada — e as linhas anteriores à Phase 49
   não têm o modelo gravado.

5. **`undefined` e `null` deixaram de ser a mesma coisa.** Nas props do `ComparativoScreen`,
   `undefined` = o consumidor não fiou a proveniência (o embed read-only da `DecisaoFinalPage`, até o
   49-22) ⇒ nenhum selo; `null` = fiou e a EF não gravou ⇒ «não registrado». Colapsar os dois faria
   a decisão final exibir **hoje** um selo sobre um dado que ela nunca pediu.

6. **Cada recusa ganhou a sua frase** — e a ramificação ficou **também** no caminho do
   `FunctionsHttpError`, por onde uma recusa 4xx de fato chega do supabase-js. Deixá-la só no bloco
   `!data.ok` faria as quatro recusas novas caírem no genérico, e o plano teria «passado» com o
   defeito que vem consertar. Há teste para esse caminho.

7. **`FORBIDDEN` é genérica de propósito.** A EF responde o MESMO 403 para «não existe» e «não é
   sua» (T-49-08-02); uma frase que os distinguisse na tela **reconstruiria no cliente** o oráculo de
   existência que a EF acabou de fechar.

8. **O teto da mensagem de `VALIDATION` vem da constante da EF**, importada por caminho relativo. A
   frase que o RH lê é montada do MESMO número que produziu a recusa — um literal paralelo diria «4»
   enquanto o servidor recusasse em outro valor, e a tela mentiria com aparência de precisão.

9. **O PDF leva a proveniência, na posição em que ela é lida.** Abaixo do título, na mesma margem,
   com a tabela descendo para não cobri-la. As asserções são de **posição** (`prov.y > titulo.y`,
   `startY > prov.y`), não só de presença: um aviso no rodapé é lido quando a decisão já está
   formada. Este arquivo circula fora do sistema — e-mail, pasta compartilhada, anexo de ata — e quem
   o recebe não tem nenhuma tela onde conferir.

10. **A cópia do PDF é a da tela por CONSTRUÇÃO.** Importa-se `textoProveniencia`, não a constante:
    a função é construída dela, então não há um segundo objeto que um leitor tome por outra fonte.

11. **O corte PERF-03 sobreviveu.** Importar o módulo do selo dentro do módulo do PDF não trouxe o
    jsPDF para o índice eager: o Rollup deixou o selo no chunk do `ComparativoScreen` (que a rota
    `/rh/*` já carregou antes de existir um botão para clicar) e o PDF o referencia.
    `assert-chunks PASSED`, `autoTable` só em `exportComparativo-Bu4gjWWI.js`.

## Verification results

| Verify | Resultado |
|---|---|
| `npx vitest run src/features/triagem src/components/pages` (T1) | **141 passed** (18 arquivos) |
| os 4 arquivos tocados na T1, verboso | **52 passed**, invariante `:121` inclusa |
| portão estático (`ComparativoCandidatosPage` sem `replace(/\D/g` executável · usa `posicoes`) | **OK** |
| `npm run -s lint` após T1 | **exit 2, 89 `error TS`** — teto do plano é 90 |
| `npx vitest run src/features/triagem src/__tests__/guards` (T2) | **170 passed** (19 arquivos) |
| `npx vitest run src/features/triagem src/components/pages src/__tests__/guards` (plano) | **228 passed** (27 arquivos) |
| `npm run -s lint` após T2 | **exit 2, 89 `error TS`** |
| conjunto de mensagens `tsc` T1 × T2, sem linha/coluna | **IDÊNTICO** (`diff` vazio) |
| erros `tsc` nos arquivos tocados **e em `DecisaoFinalPage`** | **ZERO** — os 89 estão todos em arquivos que este plano não abriu |
| suíte vitest inteira (regressão além do pedido) | **212 arquivos / 2171 testes, 0 falhas** |
| `npm run build` | **exit 0**, `assert-chunks PASSED`, 47 chunks, eager 1043,60 kB |
| `grep -rl "proveniencia-ia-badge" build/assets/` | `ComparativoScreen-BoE2aJXz.js` (chunk **lazy** de `/rh/*`) |
| `grep -rl "modelo de contingência" build/assets/` | idem |
| `grep -rl "autoTable" build/assets/` | `exportComparativo-Bu4gjWWI.js` (jsPDF segue isolado) |
| `git push origin main` | `0dab85f4..322dfe80  main -> main` |
| `git log --oneline origin/main..HEAD` | **vazio** |
| crawler em PROD (`proveniencia-ia-badge`) | **PRESENTE** (2ª tentativa — a 1ª saiu AUSENTE; a Vercel leva ~30 s) |
| crawler em PROD («modelo de contingência») | **PRESENTE** |

**Sobre a 1ª tentativa do crawler.** Ela saiu `AUSENTE` e isso **não** é um defeito: o push tinha
acabado de sair e a Vercel ainda não havia publicado. A distinção importa porque o sintoma de um
build ainda não publicado é **idêntico** ao de um marcador que nunca entrou no bundle — e a
conclusão errada («o conserto não funcionou») levaria a mexer num commit correto. O
`grep -rl` no `build/assets/` local, feito ANTES do push, é o que separa as duas leituras: o
marcador já estava no artefato; faltava o canal.

## TDD Gate Compliance

`workflow.tdd_mode` é **false**, então o gate não bloqueia. A Task 1 é `type="tracer"` (um commit de
produção, como o tipo prescreve) e a Task 2 é `tdd="true"`:

| Tarefa | Gate | Commit | Estado |
|---|---|---|---|
| Task 1 (tracer) | — | `e75acc70` `feat(49-13): …` | ✓ 141/141 nas pastas, 52/52 nos arquivos tocados, `tsc` 89 |
| Task 2 | RED | `b2f94ddb` `test(49-13): …` | ✓ 8 descobertos, 2 passam, **6 reprovam** |
| Task 2 | GREEN | `322dfe80` `feat(49-13): …` | ✓ 8/8 no arquivo, 170/170 nas pastas, 2171/2171 na suíte |
| Task 2 | REFACTOR | — | não houve: o conserto são um parâmetro opcional, um `doc.text` e três constantes de posição. Inventar um commit de limpeza seria teatro de processo |

**RED medido** (`--reporter=verbose`, artefato em `/tmp/red-4913-t2.txt`): **8 descobertos, 2 passam,
6 reprovam**, e os 6 são exatamente os alvo:

| Alvo | Motivo da reprovação |
|---|---|
| fallback diz contingência, modelo e causa | `AssertionError: expected undefined to be defined` (a 2ª linha de texto não existia) |
| a cópia do PDF = a da tela | idem |
| modelo configurado sem aviso de contingência | idem |
| modelo NULL ⇒ «não registrado» | idem |
| contingência + modelo NULL diz as duas coisas | `TypeError: Cannot read properties of undefined (reading 'texto')` |
| a tabela começa DEPOIS da linha de proveniência | `TypeError: … (reading 'y')` |

Nenhuma falha de carregamento de módulo, nenhuma descoberta vazia: **não é INVALID_RED (#3770)**.

⚠ **Os 2 casos que já passavam no RED passavam por construção** — os de retrocompatibilidade («sem
proveniência não imprime linha inventada», «o download continua com o mesmo nome»). Eles não
descrevem comportamento novo: descrevem o que o conserto **não pode** quebrar. Registrado para não
parecer que 8 asserções ficaram verdes de graça — a mesma nota que os planos 03, 04, 05 e 08 desta
fase precisaram fazer, pela mesma razão.

## Tracer feedback gate (Task 1)

`gate` ausente no `<task>` → `blocking` (o padrão), **não** `blocking-human`. Medido:
`AUTO_CHAIN=false`, `AUTO_CFG=false`, `HUMAN_VERIFY_MODE=end-of-phase`, e o `<verify>` do tracer tem
**só** `<automated>`. Pelo ramo correspondente: re-rodar o `<verify>` ponta a ponta — passou
(**141/141**) → `⚡ Tracer verified end-to-end — expanding`, sem checkpoint. Registrado porque a
decisão de **não** parar aqui é tão reportável quanto a de parar.

## Findings

**1. O RED honesto consumiu a margem INTEIRA do hook, e por um fio.** Os 5 pontos de chamada com 2
argumentos contra uma assinatura de 1 produziram **7** erros `TS2554`, levando o `tsc` de 89 para
**exatamente 96** — que é o baseline congelado do pre-commit. O commit de RED passou com **margem
zero**: uma sexta chamada no arquivo de teste e ele teria sido bloqueado, e o precedente da fase
(um helper de scaffold documentado, removido no GREEN) teria sido necessário. O GREEN devolveu os
sete. Vale registrar porque o aviso do prompt de execução — «o baseline congelado pode bloquear um
RED honesto» — se materializou no limite exato, sem folga, e o próximo plano que escrever um RED
contra uma assinatura que muda deve contar as chamadas ANTES de commitar.

**2. O `noUnusedLocals` do projeto reprovaria a letra do plano — e apontou para a forma melhor.** O
plano manda o PDF usar «a MESMA cópia de `PROVENIENCIA_IA_COPY`». Importar a constante e não usá-la
(porque `textoProveniencia`, construída dela, é o que o PDF precisa) seria **um erro de compilação
novo** — o 90º, exatamente no lugar que o `known_blocker` do prompt previu («este plano toca ~10
arquivos incluindo um caminho de PDF, então é um lugar provável para acrescentar um»). A saída não
foi afrouxar o portão: foi importar a **função**, que torna a igualdade de cópia uma propriedade de
construção em vez de uma coincidência entre dois objetos. O invariante do plano está satisfeito de
forma mais forte, e há teste comparando o texto do PDF contra `textoProveniencia`.

**3. `gsd-tools check tdd-red-evidence` continua inaplicável a este repositório — quarto registro.**
O checker casa `/^# tests (\d+)/m`, `/^# pass …/`, `/^# fail …/`, que são os contadores do
`node:test`. O TAP do vitest não os emite e aninha as suítes sob um `not ok` de nível de arquivo, o
que cai no ramo `fixture_or_load_failure`. Escrever aquelas três linhas `#` à mão faria o checker
devolver `RED_EVIDENCE_OK` e **seria forjar o artefato que ele existe para ler**. Não foi feito. Os
registros anteriores: 49-03 (Deno), 49-04 e 49-05 (vitest), 49-08 (Deno). O veredito honesto é
**inaplicável neste runtime**, não «aprovado».

**4. A invariante que o plano localiza em `ComparativoScreen.test.tsx:121` não é a que ele descreve.**
O `must_have` diz «`:121` (retirada segue visível)». A linha 121 é, de fato, o
`it('Avançar abre confirm dialog e dispara onAvancar (OPER-01 — inalterado)')`; **não há nenhuma
asserção sobre retirada a pedido neste arquivo** (`grep -n "retirada"` vazio) — ela vive no
`TriagemTable.test.tsx` e no Kanban (49-05). O que este plano protegeu foi o conteúdo real de
`:121` e os outros 6 casos pré-existentes do arquivo, todos verdes. Registrado porque uma referência
de invariante que aponta para o teste errado é pior que nenhuma: quem confiar nela vai achar que
verificou a retirada a pedido sem nunca tê-la exercido.

## Deviations from Plan

### Auto-fixed / acrescentado

**1. [Rule 3 - Blocker] A ramificação da cópia de recusa também no caminho do `error` de transporte**

- **Found during:** Task 1, Passo 2
- **Issue:** o plano descreve o mapeamento das recusas como se elas chegassem em `!data.ok`. Numa
  recusa 4xx real o supabase-js devolve `error` (`FunctionsHttpError`) e `data` nulo — o `if (error)`
  dispara PRIMEIRO. Implementado só no segundo bloco, `ENCERRADA`, `SEM_ANALISE`, `VALIDATION` e
  `FORBIDDEN` cairiam todas no genérico, e os testes que mockam `{data:{ok:false,…}}` passariam:
  o plano teria «passado» com o defeito que vem consertar.
- **Fix:** o mesmo `RECUSA_COMPARATIVO_COPY` é consultado nos **dois** ramos, com comentário
  explicando a ordem.
- **Files modified:** `src/features/triagem/services/triagemService.ts`
- **Verification:** teste `a recusa que chega como FunctionsHttpError (4xx) usa a MESMA cópia, não o
  genérico`, com o `error.context.json()` que o `extractEfErrorCode` de fato lê.
- **Commit:** `e75acc70`

**2. [Rule 2 - Funcionalidade crítica ausente] `undefined` ≠ `null` nas props de proveniência**

- **Found during:** Task 1, Passo 4
- **Issue:** o plano manda o `ComparativoScreen` mostrar o selo e diz que `modelo_ia` NULL ⇒ «não
  registrado», «nunca silêncio». Aplicado literalmente, a `DecisaoFinalPage` — que embute o mesmo
  componente e **não** fia a proveniência até o 49-22 — passaria a exibir HOJE um selo afirmando
  «modelo não registrado» sobre um dado que ela nunca pediu. Isso não é dizer «não sei»: é inventar
  uma medição.
- **Fix:** `undefined` nos dois campos = não fiado ⇒ nenhum selo; qualquer valor (incluindo `null`)
  = fiado ⇒ selo. A distinção está no docblock da prop e em dois testes.
- **Files modified:** `src/features/triagem/components/ComparativoScreen.tsx`
- **Verification:** `consumidor que NÃO fia a proveniência … não ganha selo inventado` e
  `modelo NULL fiado ⇒ «modelo não registrado»`.
- **Commit:** `e75acc70`

**3. [Rule 3 - Blocker] O tipo do hook `useComparativo` precisou acompanhar**

- **Found during:** Task 1, Passo 2
- **Issue:** `ComparativoResult` declarava só `{ ranking, latencia_ms }`; sem estendê-lo,
  `data.posicoes` e `data.provedor_ia` na página não compilariam. O plano prevê isso («atualizar o
  tipo do hook se necessário»), mas o arquivo não consta de `files_modified`.
- **Fix:** `ComparativoResult extends ProvenienciaIA` + `posicoes`, e o `mutationFn` repassa os
  campos. Nenhuma mudança de comportamento do hook.
- **Files modified:** `src/features/triagem/hooks/useComparativo.ts`
- **Verification:** `tsc` 89 com zero erros no arquivo; a `DecisaoFinalPage`, que consome o mesmo
  hook, compila sem edição.
- **Commit:** `e75acc70`

### Desvio deliberado da LETRA do plano, registrado

**O PDF importa `textoProveniencia`, não `PROVENIENCIA_IA_COPY`.** Ver Finding 2: a constante
importada e não usada seria um erro de compilação novo (o 90º, com o teto em 90) e código morto que
um leitor tomaria por uma segunda fonte de cópia. Importar a função torna a igualdade uma
propriedade de construção. O invariante que o plano protege — uma cópia só, a mesma na tela e no PDF
— está satisfeito e **testado** (`a cópia do PDF é EXATAMENTE a da tela`).

**Uma asserção mudada de propósito, dentro do intervalo autorizado.** `"Exportar PDF" chama o
exportComparativo mockado` (`ComparativoScreen.test.tsx`, ~`:216`, dentro de `:191-259` que o D-56
autoriza) passou a asserir o **2º argumento** (`undefined` para este consumidor). Acrescentado um
caso novo para o comparativo COM proveniência fiada, para que a mudança não apenas relaxe a
asserção existente.

---

**Total deviations:** 3 auto-corrigidas (2 × Rule 3, 1 × Rule 2) + 1 desvio deliberado de letra +
1 asserção mudada de propósito. **Impact:** nenhum no comportamento entregue. A família da 1 vale
nomear: **um mapeamento de erro colocado no ramo errado do `{ data, error }` produz um plano que
passa nos próprios testes e não conserta nada** — os mocks de `data` nunca exercitam o ramo por onde
a recusa real chega.

### Fora de escopo, registrado e NÃO tocado

- **`DecisaoFinalPage.tsx:72`** — a mesma resolução por posição, na decisão final. É do **49-22**, e
  agora tem `resolveCandidates` como molde e `posicoes` já no tipo do hook. Não tocado.
- **`ComparativoCandidatosPage.tsx:120`** (`PROXIMA_ETAPA_APOS_TRIAGEM` fixo, que joga um candidato
  em `entrevista_presencial` três etapas atrás) — 49-22, com o teste do 49-05 já pinando o caso.
- **As 13 linhas de literal de teto** (ver Passo 1) e o `PROXIMA_ETAPA_APOS_TRIAGEM` — 49-22.
- **As outras telas que vão usar o selo** (redação, guia, análise da triagem, análise de entrevista,
  log do admin) — 49-15 / 49-16. Nenhuma foi tocada; o componente foi desenhado para elas
  (variante `compact`, helpers exportados) mas não fiado nelas.
- **`resend-webhook.test.ts`** continua abortando ao resolver `npm:svix@1.99.1`. Pré-existente, sem
  relação com este plano, já em `WINDOWS.md`, e fora do alcance do vitest por desenho (o
  `vite.config.ts` exclui `supabase/functions/**`). Não «consertado» (Scope Boundary).

## Known Stubs

**Nenhum.** Os 4 arquivos criados e os 7 modificados foram varridos por
`TODO|FIXME|placeholder|coming soon|not available|não disponível`. Os três acertos são a
subcadeia portuguesa `todo` dentro de **«método»** (`triagemService.ts:134,136`, pré-existentes) e
**«todos»** (`:361`, na cópia nova de `SEM_ANALISE`) — o mesmo falso positivo que os planos 05 e 08
registraram, pela mesma razão. Nenhum valor vazio codificado, nenhum componente sem fonte de dados,
nenhum caminho não fiado: `posicoes`, `provedor_ia`, `modelo_ia` e `fallback_cause` têm valor real em
todos os caminhos, e `null` aparece só onde `null` é a verdade.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. Nenhum endpoint, nenhum
caminho de auth, nenhuma mudança de esquema. O plano **remove** superfície:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-13-01 (nome trocado na posição do ranking) | mitigate | rótulo por `posicoes` → id, com 3 testes de ordem divergente (um deles asserindo o NEGATIVO: o nome do vizinho não aparece) e 4 de degradação |
| T-49-13-02 (PDF de fallback circulando como decisão do modelo configurado) | mitigate | linha de proveniência com `jspdf` mockado, asserida por conteúdo E por posição; e o repasse desde o `ComparativoScreen` |
| T-49-13-SC (supply chain) | mitigate | **zero instalação de pacote**; nenhuma dependência nova. Os dois imports novos são relativos, para `_shared`, cujos módulos têm contrato de zero imports |

**Acrescentado além do registro:** a cópia de `FORBIDDEN` é genérica de propósito, para não
reconstruir no cliente o oráculo de existência (T-49-08-02) que a EF fechou. Uma mensagem que
distinguisse «não existe» de «não é sua» deixaria um RH enumerar ids de candidatura por tentativa.

## Issues Encountered

- **`tsc` em 89 contra teto 90 (D-53): a margem de UM sobreviveu, mas por decisão consciente.** Ver
  Finding 2 — a letra do plano produzia o 90º erro. O conjunto de mensagens é **idêntico** ao de
  antes do plano, diferenciado sem linha/coluna, e **zero** dos 89 está em arquivo que este plano
  abriu. O aviso dos planos anteriores segue válido para os planos restantes.
- **O baseline congelado do hook (96) foi tocado exatamente, no RED.** Finding 1. Não bloqueou, com
  margem zero.
- **A referência de invariante do plano aponta para o teste errado.** Finding 4. O arquivo está
  verde; o que não existe é a asserção que o plano nomeia.
- **O caso de fallback não foi exercido em PROD.** O selo é provado por teste e o marcador está no
  ar, mas nenhum ranking real de contingência foi produzido nesta sessão — forçá-lo exigiria estourar
  o `max_tokens` de propósito em produção. Registrado como juízo no `coverage`.

## Next

Plano 49-14. O que este plano deixa pronto para quem vem depois:

- **49-15 / 49-16** (selo nas outras telas e no log do admin): importar
  `ProvenienciaIABadge` / `textoProveniencia` de `@/features/triagem/components/ProvenienciaIABadge`.
  A variante `compact` existe para uso inline em cabeçalho de coluna. **Não escrever um segundo
  componente**: a regra de fallback vive naquele arquivo por decisão registrada.
- **49-22** (decisão final, seleção, «Avançar»): `resolveCandidates` é o molde do
  `resolveFinalistCandidates`, e `posicoes` já está no tipo do hook — a `DecisaoFinalPage` só precisa
  passá-lo. ⚠ E **são 13 linhas de literal de teto, não 12 nem 8** (ver Passo 1): as duas a mais são
  as que carregam só o piso (`< 2`).
- **Para qualquer plano que escreva um RED contra assinatura que muda:** conte os pontos de chamada
  antes de commitar. Sete `TS2554` levam o `tsc` de 89 ao baseline de 96 exato (Finding 1).

## Self-Check: PASSED

- Presentes no disco: `src/features/triagem/components/ProvenienciaIABadge.tsx`,
  `.../__tests__/ProvenienciaIABadge.test.tsx`,
  `src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx`,
  `src/features/triagem/pdf/__tests__/exportComparativo.test.ts` — os 4 FOUND.
- Presentes no `git log` e **os três já em `origin/main`**: `e75acc70`, `b2f94ddb`, `322dfe80`.
- `commits: 3` **MEDIDO** por `git rev-list --count 0dab85f4..HEAD`, não narrado;
  `plan_head_before` registrado. `tokens: 16838` medido dos octetos do diff em `src`.
- Nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio nos três commits);
  nenhum arquivo untracked ao fim de cada commit.
- `<acceptance_criteria>` das 2 tasks re-executados: verdes (selo com teste e presente em fallback;
  `resolveCandidates` por `posicoes` com seleção em ordem diferente; os campos novos e as 4 recusas
  com teste; PDF com a proveniência na mesma cópia; `vitest` das pastas tocadas + guards verde;
  `tsc` 89 ≤ 90; marcador no build e no ar; `origin/main..HEAD` vazio).
- `<verification>` de plano re-executada: **228 passed** em
  `src/features/triagem src/components/pages src/__tests__/guards`; `tsc` 89 com conjunto idêntico;
  os dois marcadores lidos de volta de `https://rh.beautysmile.com.br`.
