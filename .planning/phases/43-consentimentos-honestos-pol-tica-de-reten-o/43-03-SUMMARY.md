---
phase: 43
plan: 03
subsystem: consentimento-lgpd
status: complete
tags: [lgpd, consentimento, cliente, defaults, copy, a11y, fonte-unica, zero-destrutivo]
requires:
  - supabase/functions/_shared/consent-text.json (fonte única, 43-01)
  - src/features/cadastro/constants.ts (CONSENT_TEXT_VERSION, 43-01)
  - src/__tests__/copyPortoesLgpd.test.ts (portão de copy, 43-02)
provides:
  - CADASTRO_DEFAULT_VALUES (exportado — as 3 autorizações nascem false)
  - AutorizacoesStep reescrito segundo a 43-UI-SPEC (4 blocos)
  - src/features/cadastro/__tests__/sitiosDeCampoCliente.test.ts (gate dos sítios de campo)
  - src/features/cadastro/components/steps/__tests__/AutorizacoesStep.test.tsx (6 casos)
  - CADASTRO_DRAFT_KEY = 'cadastro:draft:v2'
affects:
  - 43-05 (CONSENT-04: a página /candidato/privacidade que a copy desta tela promete)
  - 43-07 (checkpoint: apply da migration + deploy ORDENADO — nada em PROD antes)
  - 47 (CONSOL-03: DROP de autorizacao_analise_video; a coluna permanece até lá)
tech-stack:
  added: []
  patterns:
    - "copy renderizada LIDA de JSON compartilhado, nunca redigitada no JSX — uma fonte, dois leitores"
    - "asserção de copy por IGUALDADE de string completa (toBe), nunca toContain"
    - "asserção negativa ESTRUTURAL (querySelectorAll de seletores proibidos), não textual"
    - "defaultValues do RHF extraídos para const EXPORTADA — o teste assere sobre o objeto vivo, não sobre uma cópia"
    - "RED expresso como falha de RUNTIME, não de compilação, para conviver com um gate de pre-commit que conta erros tsc"
key-files:
  created:
    - src/features/cadastro/__tests__/sitiosDeCampoCliente.test.ts
    - src/features/cadastro/components/steps/__tests__/AutorizacoesStep.test.tsx
  modified:
    - src/features/cadastro/schemas/candidatoSchema.ts
    - src/features/cadastro/types/formTypes.ts
    - src/features/cadastro/components/CadastroMultiStepForm.tsx
    - src/features/cadastro/services/cadastroService.ts
    - src/features/cadastro/services/__tests__/cadastroService.test.ts
    - src/features/cadastro/constants.ts
    - src/features/cadastro/components/steps/AutorizacoesStep.tsx
decisions:
  - "z.literal(true) virou z.boolean().refine(=== true): com o literal, o estado inicial `false` que o CONSENT-01 exige era INEXPRIMÍVEL no tipo — a assinatura obrigava o campo a nascer marcado."
  - "CADASTRO_DEFAULT_VALUES exportado: um teste que asserisse sobre uma cópia local ficaria verde para sempre enquanto o formulário derivasse."
  - "O nome real do mapa é FIELD_TO_STEP_INDEX, não FIELD_TO_STEP — o plano supôs; o compilador tinha a lista."
  - "O RED foi escrito com asserções de runtime (namespace + índice castado) porque um RED que quebrasse na compilação elevaria a contagem tsc para 98 e tornaria o próprio commit RED impossível sem --no-verify."
metrics:
  duration: ~35min
  completed: 2026-08-01
  tasks: 3
  commits: 4
  tsc_antes: 97
  tsc_depois: 97
---

# Phase 43 Plan 03: Os Sítios do Cliente e a Tela Honesta Summary

O passo de autorizações parou de nascer marcado e parou de prometer o que o sistema não faz:
três consentimentos desmarcados, o canal transacional como informação sem controle, o bloco de
vídeo removido, e toda a copy lida da mesma fonte de que o servidor calcula o hash.

## O que foi entregue

**Task 1 — os sítios de campo do cliente.** Nenhum `.default()` sobrevive em `autorizacoesSchema`:
omitir um opcional agora REPROVA na validação em vez de ser completado em silêncio com um
consentimento que ninguém deu. As três chaves nascem `false` — inclusive a obrigatória, que segue
sendo o gate de submit (D-15) mas passou a exigir INTERAÇÃO. `autorizacao_comunicacao` saiu do
contrato de entrada (canal transacional, Art. 7º V, gravado pelo servidor) e
`autorizacao_analise_video` saiu inteiro do cliente (BD-2). A coluna permanece no banco: esta
fase é zero-destrutiva por desenho.

**Task 2 — `AutorizacoesStep` reescrito.** Quatro blocos onde havia cinco. Rótulos e descrições
são LIDOS de `consent-text.json` — o array `AUTORIZACOES` deixou de carregar literais e passou a
mapear as entradas do arquivo, carregando apenas o que é decisão de renderização (ícone,
obrigatoriedade). O canal transacional virou linha informativa fora do `fieldset`, sem controle
algum. O `fieldset` passou a envolver só as duas escolhas, com `legend` sr-only que as nomeia.

**Task 3 — a suíte de seis casos.** Defaults por estado do controle, identidade tela↔arquivo por
string completa, ausência do vídeo por asserção negativa com identificador montado em runtime,
não-controle do transacional por asserção estrutural, as duas versões nomeadas, e o backstop de
truncamento a 320px.

## Verificação executada

| Gate | Resultado |
|------|-----------|
| `AutorizacoesStep.test.tsx` | **19/19** |
| `sitiosDeCampoCliente.test.ts` | **14/14** |
| `npx vitest run src/features/cadastro` | 12 arquivos / 177 testes |
| `npm run test:run` — repositório INTEIRO | **146 arquivos / 1335 testes verdes** |
| `npm run -s lint` (`tsc`) | **97** — idêntico à baseline congelada |
| Portão de copy do 43-02 (`copyPortoesLgpd.test.ts`) | **11/11 verde com a copy nova** |
| `grep -rn "autorizacao_analise_video" src/` | zero fora de comentário explicativo e de asserção negativa |
| Zero `--no-verify` | confirmado — os 4 commits passaram pelo hook de `tsc` |

## A lista REAL de sítios (o plano contava 6; o compilador exigiu 8)

O plano avisou que a lista dele era HIPÓTESE. Foi. A sequência de erros de `tsc` entre uma edição
e a seguinte é a evidência de que cada sítio é gate real:

| # | Sítio | Previsto no plano? |
|---|-------|--------------------|
| 1 | `schemas/candidatoSchema.ts` — `autorizacoesSchema` | sim |
| 2 | `types/formTypes.ts` — bloco `autorizacoes` | sim |
| 3 | `components/CadastroMultiStepForm.tsx` — `defaultValues` | sim |
| 4 | `services/cadastroService.ts` — **`FIELD_TO_STEP_INDEX`** | sim, com o **nome errado** (`FIELD_TO_STEP`) |
| 5 | `services/cadastroService.ts` — `FIELD_TO_STEP_PATH` | sim |
| 6 | `services/__tests__/cadastroService.test.ts` — fixture | sim |
| 7 | `constants.ts` — `CADASTRO_DRAFT_KEY` | sim |
| 8 | **`components/steps/AutorizacoesStep.tsx`** | **não como sítio da Task 1** — ver deviação 2 |

**Contagem `tsc`: 97 antes, 97 depois.** No meio do caminho subiu a 100 e a 98; cada número foi um
sítio que o compilador nomeou.

## Deviations from Plan

### 1. [Rule 3 — o tipo tornava o comportamento exigido INEXPRIMÍVEL] `z.literal(true)` → `z.boolean().refine()`

- **Encontrado em:** Task 1, ao pôr `autorizacao_uso_dados: false` nos `defaultValues`.
- **Problema:** `CandidatoFormData` é `z.infer<typeof candidatoFormSchema>`, e `z.literal(true)`
  infere o tipo literal `true`. O `defaultValues` do RHF só aceitava `true` para esse campo — ou
  seja, **o próprio tipo obrigava o consentimento obrigatório a nascer marcado**. O plano manda
  ele nascer `false` (é o que torna a marcação inequívoca, LGPD Art. 5º XII), e isso era
  literalmente impossível de escrever sem cast. Um cast teria escondido a contradição em vez de
  resolvê-la.
- **Correção:** `z.boolean().refine((v) => v === true, { message: … })`. O gate de submit é
  **idêntico** — a mesma mensagem, a mesma reprovação em `false` — mas o tipo passa a ser
  `boolean`. A assinatura parou de fabricar o consentimento que a fase existe para deixar de
  fabricar.
- **Arquivo:** `src/features/cadastro/schemas/candidatoSchema.ts` · **Commit:** `ddfe1a0`

### 2. [Rule 3 — gate repo-wide, não por arquivo] `AutorizacoesStep` entrou no commit da Task 1

- **Encontrado em:** Task 1, ao rodar o type-check antes do commit.
- **Problema:** o hook de pre-commit é um contador de `tsc` sobre o repositório INTEIRO. Enquanto
  `AutorizacoesStep` referenciasse as duas chaves aposentadas, a contagem ficava em 99 e o commit
  da Task 1 era impossível sem `--no-verify` — proibido nesta fase.
- **Correção:** a Task 1 aplicou o **alinhamento mínimo de chaves** no componente (renomear a
  entrada de comunicação para marketing, remover a entrada de vídeo), sem tocar copy nem estrutura.
  A reescrita completa segundo a UI-SPEC ficou integralmente na Task 2, como o plano manda.
- **Arquivo:** `src/features/cadastro/components/steps/AutorizacoesStep.tsx` · **Commit:** `ddfe1a0`

### 3. [Rule 1 — nome incorreto no plano] `FIELD_TO_STEP` não existe; o mapa é `FIELD_TO_STEP_INDEX`

- **Encontrado em:** Task 1, no primeiro RED — o import falhou com `TS2305: has no exported member`.
- **Correção:** o teste passou a ler `FIELD_TO_STEP_INDEX`, com a razão registrada inline. É
  exatamente a lição do 42-08 que o plano citou, acontecendo de novo no mesmo plano que a citou.

### 4. [Rule 2 — sem isto o teste seria verde sobre forma morta] `CADASTRO_DEFAULT_VALUES` exportado

- **Encontrado em:** Task 1, ao escrever o caso (a).
- **Problema:** os `defaultValues` viviam inline no `useForm`, inacessíveis a um teste. Asserir
  sobre uma cópia local dos defaults produziria um teste **verde para sempre** enquanto o
  formulário derivasse — o modo de falha exato que esta fase existe para fechar.
- **Correção:** objeto extraído para `export const CADASTRO_DEFAULT_VALUES`, consumido pelo
  `useForm` e pelos dois testes. A asserção passou a ser sobre o objeto que o RHF de fato lê.
- **Arquivo:** `src/features/cadastro/components/CadastroMultiStepForm.tsx` · **Commit:** `ddfe1a0`

### 5. [Rule 3 — o gate reprovaria o próprio ciclo TDD] RED expresso em runtime, não em compilação

- **Problema:** o ciclo TDD manda commitar um teste que FALHA. Mas o hook conta erros de `tsc`
  (baseline 97) e `--no-verify` é proibido: um RED que referenciasse um export ainda inexistente
  elevaria a contagem para 98 e **o commit RED seria impossível de fazer honestamente**. As duas
  regras da casa colidiam.
- **Correção:** o RED acessa os módulos por namespace + índice castado (`exportDe<T>(mod, nome)`),
  que **compila hoje e falha hoje em runtime**. O ciclo RED→GREEN sobreviveu ao gate em vez de
  negociar com ele. Registrado no cabeçalho do arquivo de teste para que ninguém "simplifique" o
  helper depois sem entender por que ele existe.
- **Arquivo:** `src/features/cadastro/__tests__/sitiosDeCampoCliente.test.ts` · **Commit:** `2e90905`

## Nenhum teste foi enfraquecido

Nenhum pin de string existente reprovou com esta mudança. O portão de copy do 43-02 passou verde
**na primeira execução** contra a copy nova — ele bane futuro-de-máquina sobre eliminação, não o
advérbio `automaticamente`, e a copy da UI-SPEC respeita essa fronteira por construção. O
`consentTextFonteUnica.test.ts` do 43-01 também seguiu verde: ele assere a FORMA do corpus, que
não mudou.

## Escopo honesto do backstop (f)

`happy-dom` **não calcula layout**. O caso (f) prova o que é provável sem layout: que nenhuma
classe de truncamento (`truncate`, `line-clamp-*`, `text-ellipsis`, `overflow-hidden`,
`whitespace-nowrap`) está aplicada à descrição nem a nenhum ancestral dentro do cartão, e que o
texto COMPLETO está no DOM. **A verificação de quebra visual real a 320px fica para o UAT do
43-07.** Truncar aqui truncaria a entrada do hash: a pessoa consentiria com um texto e o servidor
hashearia outro.

## ⚠ A janela de deploy continua aberta, e é ela que importa

Este plano fechou os sítios do CLIENTE. O 43-01 fechou os do SERVIDOR. **Nada foi a PROD.**

O par que não pode existir em produção é *tela desmarcada + banco gravando `true`* — o pior
resultado possível, porque PARECE corrigido. Ele não pode existir porque a ordem do 43-07 é
**migration → Edge Function → cliente**, e nada é deployado antes daquele checkpoint. Um bundle de
browser desatualizado depois do deploy da EF recebe `400 VALIDATION`, o que é o comportamento
correto (D-04) e não uma regressão.

## Known Stubs

Nenhum. A única promessa de superfície ainda não construída é a página **Seus dados e
autorizações**, citada pelo banner e pelo rodapé — ela é o CONSENT-04, entrega do **plano 43-05**,
dentro desta mesma fase. A copy foi aprovada na UI-SPEC sabendo disso, e a alternativa
(seguir prometendo "nosso portal", que não existe em plano nenhum) é o defeito que a Invariante 1
existe para fechar.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As quatro mitigações previstas foram
implementadas: **T-43-11** (caso (b), igualdade de string completa contra a fonte do hash),
**T-43-12** (caso (a) sobre estado do controle + zero `.default()` nos sítios do cliente),
**T-43-13** (caso (d), asserção negativa estrutural — um `<input disabled>` acrescentado ali depois
reprova), **T-43-14** (`CADASTRO_DRAFT_KEY` bumpada para `v2`). **T-43-SC**: zero pacote novo.

## Commits

| # | Hash | Tipo | Conteúdo |
|---|------|------|----------|
| 1 | `2e90905` | test | Task 1 RED — os sítios de campo do cliente (13 falhas) |
| 2 | `ddfe1a0` | feat | Task 1 GREEN — schema sem default, 3 chaves em `false`, mapas, fixture, draft key |
| 3 | `2e950bf` | test | Task 3 RED — os 6 casos do passo (12 falhas), servindo de gate da Task 2 |
| 4 | `bb1ff51` | feat | Task 2 — `AutorizacoesStep` reescrito segundo a UI-SPEC (19/19 na primeira execução) |

## Self-Check: PASSED

Os 2 arquivos criados existem em disco; os 4 hashes de commit existem em `git log`.
Verificado após a escrita deste arquivo.
