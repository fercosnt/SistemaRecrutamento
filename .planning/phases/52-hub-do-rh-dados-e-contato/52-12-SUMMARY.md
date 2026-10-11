---
phase: 52-hub-do-rh-dados-e-contato
plan: 12
subsystem: ui
tags: [react, tanstack-query, vitest, caso-aberto, sjt, rh-hub, d-22, xss]

requires:
  - phase: 52-01
    provides: "refs/gsd/52/base, scripts/p52_tipografia.cjs"
  - phase: 52-11
    provides: "ScorecardAvaliacao com SjtMcDetalhe/BigFiveResultadoHub; portão INTACTO do ScorecardAvaliacao.test.tsx"
  - phase: 52-25
    provides: "aba Avaliações aberta com o ScorecardAvaliacao montado dentro de «Avaliação assíncrona»"
provides:
  - "src/features/avaliacao/components/TextoComCitacoes.tsx — TextoComCitacoes, localizarCitacoes (pura), COPY_TEXTO_COM_CITACOES"
  - "RespostaCasoAbertoConteudo: props variante ('hub' | 'decisao', padrão 'decisao') e citacoes; ramo do hub (RespostaCasoAbertoHub) por retorno antecipado depois da mesma useQuery"
  - "CasoAbertoBreakdown: variante=\"hub\", coluna de citações antiga removida, «Pontos de atenção», rótulos e selos em 14px"
affects: [52-14, 52-15]

actuals:
  tokens: 11165
  tasks: 2
  commits: 4
plan_head_before: ddb7a4e46fba8b54d32237a2aaf3c5ba2159ea86
plan_head_after: be6191cee2d536167c722afd64a672c4defc1b01

tech-stack:
  added: []
  patterns:
    - "Casamento literal com espaço normalizado por mapa índice-normalizado → índice-original; intervalos ordenados e fundidos (sobrepostos ou encostados)"
    - "Teste de cor por cadeia de classes: jsdom não computa Tailwind, então a cor efetiva é a do ancestral mais próximo que declara text-<cor>; zero text-amber até o document.body"
    - "Import de módulo ainda inexistente por import.meta.glob no teste, para o RED reprovar na asserção e não na coleta"

key-files:
  created:
    - src/features/avaliacao/components/TextoComCitacoes.tsx
    - src/features/avaliacao/components/__tests__/TextoComCitacoes.test.tsx
  modified:
    - src/features/decisao/components/RespostaCasoAbertoSjt.tsx
    - src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx
    - src/features/avaliacao/components/ScorecardAvaliacao.tsx
    - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx

key-decisions:
  - "Citação normalizada com trim + espaço colapsado; vazia ou só espaço é ignorada (nem marca, nem vai para a lista) — o «empty» das flagged assumptions"
  - "`disponivel` com texto vazio no hub mostra a frase de `indisponivel`, o mesmo desvio que a Decisão Final já faz"
  - "O ReactNode do ramo do hub entra por uma linha de import NOVA (`import type { ReactNode } from 'react'`), para que a única linha existente alterada em RespostaCasoAbertoSjt.tsx seja a assinatura; idem o `within` do ScorecardAvaliacao.test.tsx, importado numa linha nova antes do describe acrescentado"
  - "A frase de erro do hub tem `text-base` no próprio <span> (além do <p>): cada elemento com texto do ramo declara tamanho e cor próprios"
  - "JORN-57 NÃO marcado completo em REQUIREMENTS.md: é compartilhado com planos irmãos sem SUMMARY (52-14, 52-15) — mesma decisão do 52-11"

patterns-established:
  - "Variante de apresentação por prop + retorno antecipado depois da query compartilhada, deixando o ramo herdado fora do diff (a varredura tipográfica só lê linhas acrescentadas)"

requirements-completed: []

coverage:
  - id: D1
    description: "localizarCitacoes: espaço normalizado, caixa e acento exatos, primeira ocorrência, sobrepostas e encostadas fundidas, vazia ignorada, quebra de linha como espaço"
    requirement: JORN-57
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/TextoComCitacoes.test.tsx#localizarCitacoes — casamento literal (52-12 / D-22)"
        status: pass
    human_judgment: false
  - id: D2
    description: "TextoComCitacoes: <mark> por segmentos, legenda antes do texto, caixa neutra em 16px, lista lateral só com citação não localizada, texto nulo → todas na lista, HTML literal, zero dangerouslySetInnerHTML"
    requirement: JORN-57
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/TextoComCitacoes.test.tsx#TextoComCitacoes — segmentos, legenda e lista lateral (52-12 / D-22)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Variante do hub de RespostaCasoAbertoConteudo: ficha neutra, sem rótulo próprio, cinco estados sem texto (e disponivel vazio) com as citações na lista, cadeia de classes sem âmbar, «Tentar de novo» 14/600; Decisão Final segue âmbar e 12px"
    requirement: JORN-57
    verification:
      - kind: unit
        ref: "src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx#RespostaCasoAbertoConteudo variante=\"hub\" — texto legível com as citações marcadas (52-12 / D-22)"
        status: pass
      - kind: unit
        ref: "src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx#RespostaCasoAbertoConteudo — a Decisão Final continua âmbar (52-12 / E7 iv)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Card do caso aberto pelo card inteiro: citações na lista sem texto, marca com await quando o texto chega, um só «Texto do candidato», cadeia sem âmbar, «Pontos de atenção», rótulos/selos/sinal/nível em 14px, dimensão em 600; D-20 e blocos imutáveis byte a byte"
    requirement: JORN-57
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx#ScorecardAvaliacao — caso aberto no hub: citações no texto, cor neutra, 14px (52-12 / D-22)"
        status: pass
      - kind: other
        ref: "portões D-20 e INTACTO do plano (node -e … refs/gsd/52/base)"
        status: pass
      - kind: other
        ref: "node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- TextoComCitacoes.tsx ScorecardAvaliacao.tsx RespostaCasoAbertoSjt.tsx"
        status: pass
    human_judgment: false
  - id: D5
    description: "Legibilidade real do texto do caso aberto no hub (ritmo, contraste do <mark> a 30%, grade 2fr/1fr no desktop e empilhada no celular)"
    requirement: JORN-57
    verification: []
    human_judgment: true
    rationale: "Contraste e leitura corrida dependem do render real no navegador; jsdom não computa Tailwind. Fica para o UAT da fase, depois do 52-15"

duration: 8min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 12: Caso aberto legível no hub, com as citações marcadas no texto — Summary

**No hub do RH, o texto do caso aberto passa a aparecer corrido, em 16px e numa ficha neutra (sai a caixa âmbar de 12px). Cada citação da IA encontrada literalmente no texto fica marcada com `<mark>` turquesa a 30%. As que não aparecem no texto, ou todas, enquanto o texto não chega, ficam numa lista ao lado e nunca somem. O card também perde o «Red flags» e entra nos 14px do contrato. A Decisão Final continua âmbar e em 12px.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-11T06:00:30Z
- **Completed:** 2026-10-11T06:08:12Z
- **Tasks:** 2 (Task 1 tracer, Task 2)
- **Files modified:** 6 (2 criados, 4 editados)

## Accomplishments

- **`TextoComCitacoes.tsx`.**
  - `localizarCitacoes` é pura. Colapsa o espaço em branco com um mapa de volta ao índice original e não mexe em caixa nem acento. Usa a primeira ocorrência e funde intervalos que se sobrepõem ou se encostam.
  - O componente monta segmentos `string` + `<mark>`. A legenda «Trechos marcados: citados pela análise da IA.» vem antes do texto.
  - A caixa usa `rounded-lg border border-white/15 bg-white/5 p-4 text-base leading-relaxed text-white/90 whitespace-pre-line break-words`.
  - A grade `md:grid-cols-[2fr_1fr]` só aparece quando há citação não localizada.
  - Com `texto` nulo, todas as citações vão para a lista e o nó `semTexto` ocupa o lugar do texto.
- **`RespostaCasoAbertoSjt.tsx`.**
  - Ganha `variante?: 'hub' | 'decisao'` (padrão `'decisao'`) e `citacoes?: string[]`.
  - Logo depois da mesma `useQuery`, `if (variante === 'hub')` devolve `RespostaCasoAbertoHub` (`data-testid="caso-aberto-hub"`). Esse ramo sempre desenha o `TextoComCitacoes`, com as frases de `COPY_RESPOSTA_CASO_ABERTO` em `text-base text-white/80` e «Tentar de novo» em `text-sm font-semibold text-white`.
  - Não desenha rótulo próprio.
  - Contra a base, a assinatura (`:47`) é a única linha existente alterada.
- **`ScorecardAvaliacao.tsx` (`CasoAbertoBreakdown`).**
  - Passa `variante="hub"` e as citações como texto: não-string vira `JSON.stringify`, e a lista fica vazia quando a pontuação falhou.
  - Saem a coluna «Citações» e a grade `md:grid-cols-2`. O wrapper do rótulo fica só `space-y-1`, sem âmbar.
  - «Red flags» vira «Pontos de atenção».
  - Os rótulos ficam em `text-sm font-semibold text-white/70`, sem caixa-alta.
  - As duas `SugestaoIABadge` recebem `className="text-sm"`. O sinal de revisão vai para `text-sm` e `dim.level` para `text-sm font-semibold`. `dim.dimension` passa a `font-semibold`.

## Task Commits

1. **Task 1 (tracer): texto do caso aberto com as citações marcadas**
   - `44a7767c` test(52-12): RED
   - `d27edcbc` feat(52-12): caso aberto legível no hub com citações marcadas no texto (D-22)
   - Portão do tracer: modo interativo, `end-of-phase`, só `<automated>`. Rodei de novo `npx vitest run src/features/avaliacao src/features/decisao` e deu 345/345. Tracer verificado de ponta a ponta, segui para a Task 2.
2. **Task 2: card do caso aberto no contrato tipográfico**
   - `69fcb301` test(52-12): RED
   - `be6191ce` feat(52-12): card do caso aberto no contrato tipográfico; «Pontos de atenção» (D-52-U19, D-52-U23)

## Files Created/Modified

- `src/features/avaliacao/components/TextoComCitacoes.tsx`: texto com as citações marcadas por segmentos e a lista lateral (novo).
- `src/features/avaliacao/components/__tests__/TextoComCitacoes.test.tsx`: casamento literal e render (novo).
- `src/features/decisao/components/RespostaCasoAbertoSjt.tsx`: variante do hub como código novo; as linhas da Decisão Final ficaram intocadas.
- `src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx`: dois `describe`s acrescentados (âmbar da Decisão Final fixado; variante do hub nos seis estados). Os imports mudaram para trazer `within` e `RespostaCasoAbertoConteudo`.
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx`: restyle do `CasoAbertoBreakdown`.
- `src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx`: só acréscimo, com um `import { within }` novo e um `describe` no fim. Nenhuma linha existente mudou (`git diff` sem nenhuma linha `-`).

## Verification (resultados literais)

| Portão | Resultado |
|---|---|
| `npx vitest run src/features/avaliacao src/features/decisao` (Task 1) | 42 arquivos, 345/345 |
| `npx vitest run src/features/avaliacao src/features/decisao src/features/hub-candidato src/__tests__/guards` (Task 2) | 76 arquivos, 768/768 |
| Portão D-20 | `D-20 intacto: mostra as citações E o texto do candidato` · `D-20 intacto: sem resposta enviada: o lugar do texto diz isso` (exit 0) |
| Portão `INTACTO` do 52-11 (comando idêntico) | `INTACTO: harness+fixtures+UX-07 (1 it)` · `INTACTO: D-20 (3 it)` · `INTACTO: 49-41 (5 it)` (exit 0) |
| `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- TextoComCitacoes.tsx ScorecardAvaliacao.tsx RespostaCasoAbertoSjt.tsx` | `TIPOGRAFIA OK (326 linhas acrescentadas varridas)` |
| Lint | `lint exit=2 tsc errors=89` (portão ≤ 90: passa; baseline 89) |
| Suíte inteira | 3085/3087. Os 2 vermelhos são os de baseline em `promessasComExecutor.test.ts` |
| `grep -c dangerouslySetInnerHTML TextoComCitacoes.tsx` | 0 |
| `git diff refs/gsd/52/base -- RespostaCasoAbertoSjt.tsx \| grep '^-'` | só a assinatura de `RespostaCasoAbertoConteudo` |

O caso D-20 `:144` (`getByText('trecho recortado pela IA')`, síncrono) passa sem nenhuma edição. Enquanto a leitura carrega, a citação já está na lista lateral.

## TDD Gate Compliance

- **RED da Task 1 (`44a7767c`).** JUnit com 39 casos e 26 falhas, 0 erros, exit 1. Os três alvos deram `RED_EVIDENCE_OK (target_test_failed)`:
  - `localizarCitacoes … > sobrepostas viram um intervalo só`. Falhou com `expected undefined to deeply equal Any<Function>`: o módulo ainda não existe. O teste carrega o módulo por `import.meta.glob`, então a reprovação veio na asserção, sem erro de coleta.
  - Hub `disponivel: ficha neutra em 16px…`. Falhou com `Unable to find … ouviria a paciente, which matches selector 'mark'`: a variante era ignorada e a caixa âmbar aparecia.
  - Hub `removida: …`. Falhou com `expected [ 'text-xs' ] to include 'text-base'`.
  - O teste novo que fixa o âmbar da Decisão Final passou já no RED. Ele fixa comportamento existente e não é alvo de RED.
- **GREEN da Task 1 (`d27edcbc`).** 345/345.
- **RED da Task 2 (`69fcb301`).** JUnit com 21 casos e 2 falhas, exit 1. Os dois alvos deram `RED_EVIDENCE_OK (target_test_failed)`:
  - `«Pontos de atenção» no lugar de «Red flags»…` falhou com `expected <p …> to be null`, porque «Red flags» ainda estava na tela.
  - `selos e sinais do card em 14px…` falhou com `Sugestão da IA — decisão é sempre humana: expected [ Array(28) ] to include 'text-sm'`.
  - Os casos dos estados sem texto e da cadeia de classes já passavam desde o GREEN da Task 1. Eles provam o comportamento entregue lá, e a mordida deles está registrada abaixo.
- **GREEN da Task 2 (`be6191ce`).** 768/768.
- **REFACTOR:** nenhum.
- Os registros de evidência ficaram no scratchpad da sessão (`p5212/t1-*.json`, `t2-*.json`) e não foram commitados.

## Mordidas (provadas à mão, sem commit)

Os arquivos foram copiados para o scratchpad antes de cada mutação. A restauração foi feita por `cp` e conferida com `cmp`, sem `git checkout` e sem `git stash`.

1. **Âmbar de volta no wrapper do rótulo do texto** (`space-y-1` → `space-y-1 text-amber-100`). O `ScorecardAvaliacao.test.tsx` reprova 6 casos: os cinco estados sem texto e o caso marcado, todos pela asserção de âmbar na cadeia. `RESTAURADO1`.
2. **Ramo do hub descarta as citações sem texto** (`citacoes={texto ? citacoes : []}`). Reprovam 12 casos: os cinco do card inteiro, os seis do `RespostaCasoAbertoSjt.test.tsx` e o D-20 «mostra as citações E o texto do candidato» (o `:144` síncrono). `RESTAURADO2`.

## Decisions Made

Ver `key-decisions` no frontmatter. Em resumo:
- A citação vazia é ignorada.
- `disponivel` com texto vazio mostra a frase de `indisponivel`.
- Os imports novos entram em linhas novas, para não alterar linhas existentes.
- O `<span>` da frase de erro declara tamanho e cor próprios.
- JORN-57 não foi marcado completo, porque planos irmãos sem SUMMARY também o declaram.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Frase de erro do hub sem tamanho próprio**
- **Found during:** Task 1 (GREEN)
- **Issue:** o `findByText(COPY.erro)` acha o `<span>`, que herdava o `text-base` do `<p>` e não declarava tamanho. O teste de estados (escrito no RED) exige `text-base` no elemento da frase.
- **Fix:** o `<span>` passou a `text-base text-white/80`. Quem mudou foi a implementação, o teste ficou como estava.
- **Files modified:** `src/features/decisao/components/RespostaCasoAbertoSjt.tsx`
- **Verification:** 345/345
- **Committed in:** `d27edcbc`

---

**Total deviations:** 1 auto-fixed (Rule 1).
**Impact on plan:** nenhum aumento de escopo.

## Issues Encountered

- No primeiro RED, o `TextoComCitacoes.test.tsx` usava `import * as` de um arquivo que ainda não existia. O Vite reprovou na resolução do import (erro de carga, que não vale como RED). Troquei por `import.meta.glob(..., { eager: true })` antes do commit do RED e rodei de novo; a reprovação passou a vir das asserções.
- Durante o RED da Task 1, o tsc foi a 90: o tipo `typeof import('../TextoComCitacoes')` apontava para um arquivo ausente. Voltou a 89 no GREEN. O hook aceitou as duas contagens (≤ 96).

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova. T-52-34 (XSS) está mitigado e testado: a montagem é por segmentos, o teste usa `<b>x</b>` literal e o arquivo tem zero `dangerouslySetInnerHTML`/`innerHTML`. T-52-35 (casamento aproximado) também: o casamento é literal, só o espaço é normalizado, e há testes de caixa e de acento.

## User Setup Required

Nenhum.

## Next Phase Readiness

- O 52-14, revisor da fase, deve conferir que o `CasoAbertoBreakdown` só monta no hub (único consumidor do `ScorecardAvaliacao`), que o `RespostaCasoAbertoSjt` da Decisão Final ficou fora do diff e que o `RespostaCasoAbertoSjt.test.tsx` mudou só por acréscimo (dois `describe`s), além dos imports.
- Nada publicado e sem push. A leitura do texto usa a RPC `ler_resposta_caso_aberto_sjt`, que já está em PROD desde a 51. O que este plano entrega só aparece na tela depois da publicação do 52-15.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- FOUND: src/features/avaliacao/components/TextoComCitacoes.tsx
- FOUND: src/features/avaliacao/components/__tests__/TextoComCitacoes.test.tsx
- FOUND commits: 44a7767c, d27edcbc, 69fcb301, be6191ce (ancestrais de HEAD)
