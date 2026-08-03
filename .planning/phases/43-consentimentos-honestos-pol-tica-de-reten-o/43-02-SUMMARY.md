---
phase: 43
plan: 02
subsystem: compliance-copy-lgpd
status: complete
tags: [lgpd, art-20, copy, retencao, veredito, portao-de-grep, bd-3, reten-06]
requires:
  - supabase/functions/_shared/audit-logger.ts (o padrão retain_until vivo, medido)
  - supabase/migrations/20260609000001_prompt_library_schema.sql (coluna + índice parcial)
  - supabase/migrations/20260730000005_p42_invent05_not_exists.sql (forma NULL-safe do cron)
  - 43-UI-SPEC.md §"Copy do Art. 20 reescrita (BD-3)" + "⚠ ESCOPO DO GREP"
provides:
  - docs/compliance/reten06-veredito-retain-until.md (veredito datado, anterior à estrutura)
  - src/__tests__/copyPortoesLgpd.test.ts (portão de copy com escopo duplo)
  - 5 pins de copy do Art. 20 (2 atualizados + 3 novos)
affects:
  - 43-04 (matriz de retenção — o veredito define a FORMA: predicado computado, não coluna)
  - 43-06 (/admin/retencao — superfície de edição da matriz)
  - 43-08 (src/features/privacidade/ entra no portão sem editar o teste)
  - 43-09 (/admin/retencao usa `automaticamente` 2× — o escopo estreito é o que permite)
  - 46 (purga: D46-1 e D46-2 registradas como pré-requisitos)
tech-stack:
  added: []
  patterns:
    - "portão de copy com ESCOPO DUPLO: repo-wide para juridiquês, allowlist para futuro-de-máquina"
    - "proibição semântica por COOCORRÊNCIA (advérbio ⨝ léxico), não por palavra solta"
    - "dobra de acento caractere-a-caractere para preservar índice 1:1 e reportar file:line correto"
    - "varredura tolerante a diretório ausente: ausência = zero ocorrência, nunca ENOENT"
    - "teste de auto-consistência: o portão prova que ele mesmo não é sua primeira violação"
    - "asserção de copy em diálogo lê document.body (portal), com prova de abertura por despacho de mutação"
key-files:
  created:
    - docs/compliance/reten06-veredito-retain-until.md
    - src/__tests__/copyPortoesLgpd.test.ts
  modified:
    - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
    - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
    - src/features/decisao/components/RegistrarDecisaoForm.tsx
    - src/router/routes.tsx
    - src/features/explicacao/components/__tests__/SolicitarRevisaoCTA.test.tsx
    - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
    - src/features/decisao/components/__tests__/RegistrarDecisaoForm.test.tsx
decisions:
  - "RETEN-06 VEREDITO: NÃO REUSAR retain_until. Razão dominante: o padrão vivo exige DEPLOY para mudar a política e o RETEN-02 exige literalmente 'alterável sem deploy' — o padrão é a negação do requirement."
  - "O NOME retain_until também não é reusado: em candidaturas ele sugeriria semântica materializada e induziria ao erro de congelamento."
  - "D-43-02-01 (deviação): o escopo 2 do portão julga `automaticamente` por COOCORRÊNCIA com léxico de exclusão, não isolado — 6 usos verdadeiros pré-existentes na allowlist reprovariam um gate literal."
  - "O portão foi mutation-tested: 3 mutantes sintéticos provaram que ele reprova as duas famílias e permanece verde sobre copy honesta."
metrics:
  duration: ~35min
  completed: 2026-08-01
  tasks: 3
  commits: 4
  tsc_antes: 97
  tsc_depois: 97
  testes_antes: 1283
  testes_depois: 1302
---

# Phase 43 Plan 02: Veredito RETEN-06 + Copy do Art. 20 + Portão de Escopo Duplo Summary

O veredito sobre `retain_until` está escrito, datado e commitado **antes** de qualquer
estrutura de retenção existir; os 3 sítios vivos do Art. 20 falam em linguagem que o
titular decodifica com a citação do artigo preservada; e as duas proibições de copy da
fase viraram portão automatizado com os **dois escopos distintos** — o que impede que ele
reprove a copy que a própria fase manda escrever.

## O que foi entregue

**Task 1 — o veredito, e a ordem é o requirement.**
`docs/compliance/reten06-veredito-retain-until.md` foi commitado (`77de907`) enquanto
`supabase/migrations/` continha apenas `20260801000001` — ou seja, **antes** da migration
da matriz de retenção (43-04). O SC#4 exige exatamente isso: escrito depois, o veredito
seria racionalização do que já tivesse sido construído.

Cada afirmação sobre o padrão vivo cita `arquivo:linha`, medido e não estimado:
coluna materializada (`20260609000001_prompt_library_schema.sql:197`), preenchida por
`computeRetainUntil` em TypeScript (`_shared/audit-logger.ts:103-106`, chamada em `:131`,
gravada em `:160`), com os dois prazos como **constantes de código** (`:30-31`), índice
parcial (`:208`) e cron consumidor (`20260609000003_prompt_library_cron.sql:70-82`,
reescrito por `20260730000005_p42_invent05_not_exists.sql:123-136`).

**VEREDITO: NÃO REUSAR**, com as três razões em ordem de peso — (a) o padrão exige
**deploy** para mudar a política, e o RETEN-02 diz literalmente *"alterável sem deploy"*;
(b) materializar **congela a política no instante da escrita**, o que faria a matriz virar
decoração e a tela mentir, e descongelar exigiria `UPDATE` em massa sobre dado de
candidato — escrita que esta fase se proibiu por desenho; (c) a propriedade útil do
congelamento **já foi entregue no 43-01** pelo CONSENT-02 (versão + hash + timestamp do
texto lido), e materializar seria uma segunda cópia da mesma verdade.

O artefato registra também o que **É** reusado (índice parcial como idioma; forma
`DELETE … AND NOT EXISTS` do cron da P42, incluindo a lição NULL-safe que o INVENT-05
corrigiu) e as duas dependências da Phase 46 (**D46-1**: não ligar a purga sobre o seed
genérico sem parecer jurídico; **D46-2**: `autorizacao_retencao_curriculo` como base legal
citada, **nunca** como encurtador de janela).

**Task 2 — os 3 sítios do Art. 20, e os 3 pins que faltavam.**
As 5 substituições da tabela da UI-SPEC (linhas 612-618) foram transcritas verbatim:

| Sítio | Depois |
|---|---|
| `SolicitarRevisaoCTA` `cta` | Pedir que uma pessoa revise esta decisão |
| `SolicitarRevisaoCTA` `dialogTitle` | Pedir revisão desta decisão? |
| `SolicitarRevisaoCTA` `dialogConfirm` | Pedir revisão |
| `ExplicacaoCandidatoPage` `revisionIntro` | Você pode pedir que uma pessoa da nossa equipe revise esta decisão. É um direito seu (LGPD, Art. 20). |
| `RegistrarDecisaoForm` (RH) | …o candidato poderá pedir que uma pessoa revise esta decisão (LGPD, Art. 20)… |

A âncora legal não se perdeu: a citação do Art. 20 vive na introdução da página do
candidato, imediatamente acima do CTA — que é o ponto inteiro de BD-3, linguagem simples
**sem** perder o artigo. Os 5 sítios declarados INALTERADOS pela UI-SPEC continuam
byte-idênticos, e `email-templates.ts` tem **diff vazio** (verificado por
`git diff --quiet`).

Os pins: 2 atualizados (`SolicitarRevisaoCTA.test.tsx`, `ExplicacaoCandidatoPage.test.tsx`)
e **3 novos** (`dialogTitle`, `dialogConfirm`, texto do RH) — a lacuna que a UI-SPEC nomeia
explicitamente e sem a qual a próxima reescrita escorregaria de novo.

**Task 3 — o portão com os dois escopos.** `src/__tests__/copyPortoesLgpd.test.ts`,
11 asserções, `node:fs` puro, zero dependência nova.

## As duas armadilhas de escopo, e como cada uma foi desarmada

### 1. A armadilha que a UI-SPEC já tinha documentado

O escopo 2 varre **apenas** a allowlist (`src/features/cadastro/`,
`src/features/privacidade/`, `src/features/explicacao/`, `email-templates.ts`), nunca o
repositório. A `/admin/retencao` do plano 43-09 usa `automaticamente` **duas vezes, por
exigência da mesma spec**, e ali a palavra é honesta — ela afirma que **nada** apaga
automaticamente. Um escopo repo-wide reprovaria a copy que a spec manda escrever.

Isso não é afirmado no comentário e deixado por conta da boa-fé: há um **caso positivo**
que mede ocorrências reais do advérbio fora da allowlist, exige que sejam `> 0`, e a suíte
segue verde — provando empiricamente que o escopo é estreito. Uma segunda asserção trava
`src/features/admin/` **fora** da allowlist, para que alargar o escopo quebre um teste em
vez de quebrar a página da 43-09.

### 2. A armadilha uma camada mais funda, que ninguém tinha medido

**Medido antes de escrever o portão:** a allowlist já contém **6 usos verdadeiros** de
`automaticamente`, nenhum sobre exclusão — `LoadingProgress.tsx:9` (barra de progresso),
`useViaCEP.ts:37`, `useFormToast.ts:24,122`, `useDuplicateCheck.ts:54` e, o mais
importante, `useFormToast.ts:185`, que é **copy renderizada ao candidato**:
*"CEP encontrado! Endereço preenchido automaticamente"*.

Um portão que banisse a palavra solta dentro da allowlist reprovaria **na primeira
execução**, contra código pré-existente, correto e honesto. Seria a mesma armadilha que a
UI-SPEC documentou um nível acima — e o mesmo desfecho previsto: *um teste que reprova o
comportamento correto treina quem executa a desligá-lo*.

**Resolução (deviação D-43-02-01, detalhada abaixo):** o alvo real da proibição é
**futuro-de-máquina sobre exclusão**, não o advérbio. O portão implementa isso:

- as formas de exclusão futura (verbo "ser" no futuro + verbo de exclusão; substantivo de
  exclusão + adjetivo de automatismo) são **incondicionais** na allowlist — e cobrem
  **flexão de número**, que a lista literal da spec deixaria passar (o plural não é a mesma
  string que o singular e mentiria igual);
- `automaticamente` só é violação quando **coocorre** com léxico de exclusão
  (`exclu|apag|delet|elimin|descart`) numa janela de 140 caracteres — janela sobre o texto
  e não sobre a linha, porque o Prettier quebra copy longa em várias linhas e uma regra
  por-linha perderia justamente a frase mais provável.

Medição de confirmação: coocorrências reais na allowlist hoje = **zero**. O portão nasce
verde por o código estar correto, não por ser frouxo.

## O portão tem dentes — provado, não assumido

Um gate verde que não sabe falhar não vale nada. Três mutantes sintéticos foram injetados
e revertidos:

| Mutante | Esperado | Medido |
|---|---|---|
| juridiquês do Art. 20 reintroduzido em `src/` | reprova (escopo 1) | **1 falha** ✓ |
| "dados serão excluídos automaticamente" na allowlist | reprova (escopo 2) | **2 falhas** ✓ |
| "Endereço preenchido automaticamente" na allowlist | **passa** (é honesto) | **11/11 verde** ✓ |

O terceiro é o que importa mais: ele prova que a estreiteza é real e não acidental.

Além disso, o teste de **auto-consistência** — que proíbe os literais banidos dentro do
próprio arquivo de teste — **reprovou na primeira execução**, acusando meus próprios
docblocks que citavam as expressões para explicá-las. É exatamente o defeito que a deviação
3 do 43-01 documentou. As explicações foram preservadas integralmente, escritas por
descrição em vez de transcrição.

## Verificação executada

| Gate | Resultado |
|------|-----------|
| `npx vitest run src/features/explicacao src/features/decisao` | **88/88** (era 77 + 11 novos) |
| `npx vitest run src/__tests__/copyPortoesLgpd.test.ts` | **11/11** |
| `npm run test:run` — repositório INTEIRO | **144 arquivos / 1302 testes verdes** |
| `npm run -s lint` (`tsc`) | **97** — idêntico à baseline congelada |
| `grep -rn "pessoa natural" src/` | **0** |
| `git diff --quiet -- supabase/functions/_shared/email-templates.ts` | sai **0** — intocado |
| Veredito commitado antes da migration de retenção | ✓ (`77de907`, só `20260801000001` existia) |
| Zero `--no-verify` | confirmado — os 4 commits passaram pelo hook de `tsc` |

## Deviations from Plan

### 1. [Rule 3 — gate que reprovaria o comportamento correto] D-43-02-01: `automaticamente` julgado por coocorrência, não isolado

- **Encontrado em:** Task 3, na medição que precedeu a escrita do portão.
- **Problema:** o plano e a UI-SPEC especificam *"zero ocorrências de `automaticamente`
  dentro da allowlist"*. Medido: já existem **6**, todas verdadeiras e nenhuma sobre
  exclusão, uma delas copy renderizada ao candidato sobre preenchimento de CEP. O gate
  literal reprovaria na primeira execução contra código correto.
- **Correção:** o escopo 2 pune **futuro-de-máquina sobre exclusão** — as formas
  explicitamente de exclusão são incondicionais (e agora cobrem flexão de número, um
  **fortalecimento** sobre a lista literal da spec); `automaticamente` só conta como
  violação em coocorrência com léxico de exclusão. A semântica é ela própria testada, com
  caso honesto e caso mentiroso.
- **Por que isto NÃO é afrouxar o portão:** a propriedade que a fase protege é *não
  prometer exclusão que não acontece*. A palavra sozinha, num toast sobre CEP, não promete
  nada. O par advérbio ⨝ exclusão é que carrega a mentira — e ele continua reprovando, como
  o mutante 2 mediu. A regra é **mais estrita** que a spec sobre flexão e **mais precisa**
  sobre assunto.
- **Arquivo:** `src/__tests__/copyPortoesLgpd.test.ts` · **Commit:** `88aff88`

### 2. [Rule 1 — o gate reprovando a si mesmo] docblocks que citavam a expressão banida

- **Encontrado em:** Task 3, primeira execução do portão (10/11).
- **Problema:** meus próprios comentários explicativos transcreviam as expressões
  condenadas, e o escopo 1 varre **comentário** também. O arquivo seria a primeira violação
  do portão que instala.
- **Correção:** as formas passaram a ser **descritas**, não transcritas; a explicação foi
  preservada integralmente. Precedente direto: deviação 3 do 43-01.
- **Commit:** `88aff88`

### 3. [Registro, não correção] a mesma armadilha apareceu nos testes da Task 2

Os docblocks que escrevi nos pins de `SolicitarRevisaoCTA.test.tsx` e
`RegistrarDecisaoForm.test.tsx` também citavam o juridiquês para explicá-lo, e apareceram
no `grep -rn "pessoa natural" src/` depois da Task 2. Reescritos com elipse antes do commit
da Task 2 (`c22fd91`), o que é por que o grep da tabela de verificação sai zero. Registrado
aqui porque a recorrência em duas tasks independentes sugere que a armadilha é estrutural,
não um descuido pontual: **qualquer proibição grep-ável de copy vai colidir com a prosa que
a explica**, e a saída é sempre descrever em vez de transcrever.

## Nota de método — o teste de diálogo não é vácuo

As asserções sobre título e botão de confirmação leem `document.body` via `within`, porque
o conteúdo do `AlertDialog` do Radix monta em **portal** e `container.textContent` ficaria
vazio — a asserção passaria sem ter olhado nada (3 falsos verdes medidos no 42-10). Para
provar que o diálogo **realmente abre** — e que os pins não estão passando por acidente —
há uma asserção adicional de que confirmar **despacha a mutação**. Se o clique não abrisse
o diálogo, esse teste falharia.

## Known Stubs

Nenhum. Todo código deste plano tem consumidor ou teste executável. O veredito é documento
de decisão, não código; os 3 sítios de copy estão em produção de código e pinados; o portão
roda na suíte padrão.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. Mitigações previstas,
implementadas: **T-43-07** (veredito datado, commitado em wave 1 antes de qualquer migration
de retenção — a ordem imposta pela estrutura de waves, verificada em `git log`);
**T-43-08** (5 pins, 3 deles novos, + portão de escopo duplo); **T-43-09** (`email-templates.ts`
byte-idêntico, verificado por `git diff --quiet`); **T-43-10** (caso positivo explícito +
asserção travando `src/features/admin/` fora da allowlist — e a deviação D-43-02-01 fechou
uma segunda instância da mesma ameaça que o plano não tinha previsto); **T-43-SC** (zero
pacote novo, `node:fs` apenas).

## Commits

| # | Hash | Tipo | Conteúdo |
|---|------|------|----------|
| 1 | `77de907` | docs | Task 1 — veredito RETEN-06, datado e anterior à estrutura nova |
| 2 | `c22fd91` | test | Task 2 RED — 2 pins atualizados + 3 novos |
| 3 | `60203cb` | feat | Task 2 GREEN — os 3 sítios do Art. 20 + docblocks + rota |
| 4 | `88aff88` | test | Task 3 — portão de copy com os dois escopos |

## Self-Check: PASSED

Os 2 arquivos criados existem em disco; os 7 modificados existem e estão commitados; os 4
hashes existem em `git log`; a árvore de trabalho está limpa. Verificado após a escrita
deste arquivo.
