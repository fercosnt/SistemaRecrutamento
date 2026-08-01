---
phase: 43
plan: 01
subsystem: consentimento-lgpd
status: complete
tags: [lgpd, consentimento, hash, edge-function, migration, fail-closed, zero-destrutivo]
requires:
  - public.autorizacoes (tabela viva, 17 linhas, 3 policies)
  - supabase/functions/_shared/schemas.ts (autorizacoesSchema)
  - supabase/functions/cadastrar-candidato (única escritora de autorizacoes)
provides:
  - supabase/functions/_shared/consent-text.json (fonte ÚNICA do texto, lida pelas 2 runtimes)
  - supabase/functions/_shared/consent-text.v1-historico.json (texto pré-fase, verbatim)
  - calcularHashConsentimento / serializarEntradaHash (_shared/consent-hash.ts)
  - montarRegistroAutorizacoes (_shared/autorizacoes-registro.ts)
  - CONSENT_TEXT_VERSION (espelhada, COM teste de paridade)
  - migration 20260801000001 (NÃO APLICADA)
  - supabase/tests/p43_consent_prova_smoke.sql (NÃO EXECUTADO)
affects:
  - 43-03 (os 6 sítios de .default(true) do CLIENTE — o servidor já está fechado)
  - 43-05 (CONSENT-04, revogação own-row do marketing)
  - 43-07 (checkpoint: apply da migration + deploy ORDENADO da EF)
  - 47 (CONSOL-03: DROP de autorizacao_analise_video; página de transparência lê o v1)
tech-stack:
  added: []
  patterns:
    - "JSON compartilhado em supabase/functions/_shared/ importado pelo cliente — import cross-boundary PROVADO por execução"
    - "hash sobre entrada SEMÂNTICA (pares rótulo/descrição normalizados), nunca sobre os bytes crus do arquivo"
    - "espelho de constante COM teste de paridade (o par POLICY_VERSION ficou 4 meses sem)"
    - "montador puro extraído da EF Deno.serve para tornar o payload asserível sem rede"
key-files:
  created:
    - supabase/functions/_shared/consent-text.v1-historico.json
    - supabase/functions/_shared/consent-text.json
    - supabase/functions/_shared/consent-hash.ts
    - supabase/functions/_shared/autorizacoes-registro.ts
    - supabase/functions/_shared/__tests__/consent-hash.test.ts
    - supabase/functions/_shared/__tests__/autorizacoes-registro.test.ts
    - src/features/cadastro/__tests__/consentTextFonteUnica.test.ts
    - supabase/migrations/20260801000001_p43_consent_prova_e_marketing.sql
    - supabase/tests/p43_consent_prova_smoke.sql
  modified:
    - supabase/functions/_shared/schemas.ts
    - supabase/functions/_shared/constants.ts
    - supabase/functions/cadastrar-candidato/index.ts
    - src/features/cadastro/constants.ts
    - vite.config.ts
    - .planning/todos/pending/processo-origem-do-drift-desconhecida.md
decisions:
  - "A3 RESOLVIDA POR EXECUÇÃO: o import cross-boundary src/ → supabase/functions/ ATRAVESSA. Fonte única real, sem espelho e sem sonda byte-a-byte."
  - "autorizacoesSchema ganhou .strict() PRÓPRIO (não previsto no plano): sem ele o .strict() do schema pai só fecha o nível superior e autorizacao_analise_video seria DESCARTADA em silêncio com 200, em vez de rejeitada."
  - "autorizacao_comunicacao é escrita EXPLICITAMENTE como true no montador, em vez de deixar o DEFAULT do banco preencher: o valor afirma um fato do sistema (canal transacional ativo, Art. 7º V), e o sítio que decide o valor gravado tem de ser legível no código."
  - "Hex do texto v2 PINADO: dd8f573b73f9dd63090c90e4a2c53001ef9786a5516aa9678b21c22ec88d6653"
metrics:
  duration: ~50min
  completed: 2026-08-01
  tasks: 3
  commits: 5
  tsc_antes: 97
  tsc_depois: 97
---

# Phase 43 Plan 01: Prova de Consentimento (Tracer) Summary

Uma linha de consentimento agora percorre a cadeia inteira — arquivo de texto único →
import nas duas runtimes → hash SHA-256 calculado no servidor → payload do INSERT →
colunas de prova em `public.autorizacoes` — com verificação executável em cada ponta, e
nada aplicado em PROD.

## O que foi entregue

**Task 1 (tracer) — o texto vira fonte única e o hash vira função pura provada.**
`consent-text.v1-historico.json` foi capturado e **commitado primeiro** (`c98447e`),
antes de qualquer arquivo de copy nova existir — se viesse depois, o `v1` deixaria de
corresponder a texto recuperável. `consent-text.json` carrega a copy v2 aprovada da
UI-SPEC (3 consentimentos + o bloco informativo transacional, que fica **fora** do array
e **fora** do hash). `consent-hash.ts` expõe `serializarEntradaHash` (pura, síncrona) e
`calcularHashConsentimento` (SHA-256 via `crypto.subtle`), com zero dependência npm.

**Task 2 — o servidor parou de repor `true`, calcula o hash e grava fail-closed.**
Os dois sítios do SERVIDOR que DECIDEM o valor gravado foram fechados:
`_shared/schemas.ts` (os `.optional().default(true)`) e
`cadastrar-candidato/index.ts:293-297` (o `?? true`). O INSERT em `autorizacoes` deixou
de ser best-effort.

**Task 3 — a migration aditiva e o smoke que prova a ausência de escrita.**
`20260801000001`: quatro `ADD COLUMN`, todas nullable, **todas sem DEFAULT**, com bloco
`DO` auto-verificador que consulta `pg_attrdef` (o catálogo, não o texto do arquivo).
`p43_consent_prova_smoke.sql`: 6 asserções somente-leitura, duas delas negativas.

## Verificação executada

| Gate | Resultado |
|------|-----------|
| `deno test` do corpus `_shared` (16 arquivos) | **152 passed / 0 failed** |
| `consent-hash.test.ts` | 7/7 |
| `autorizacoes-registro.test.ts` | 9/9 |
| `consentTextFonteUnica.test.ts` (Vitest) | 9/9 |
| `npm run test:run` — repositório INTEIRO | **143 arquivos / 1283 testes verdes** |
| `npm run -s lint` (`tsc`) | **97** — idêntico à baseline congelada |
| `deno check cadastrar-candidato/index.ts` | limpo |
| Gate da migration (sem `BEGIN/COMMIT`, sem `IF NOT EXISTS`, sem `DEFAULT` nos `ADD COLUMN`) | `gate=0` |
| Zero `--no-verify` | confirmado — os 5 commits passaram pelo hook de tsc |

## As duas perguntas que o plano mandou responder no SUMMARY

### 1. Qual caminho do import de JSON aterrissou: **FONTE ÚNICA** (não espelho)

A suposição A3 da pesquisa foi resolvida **por execução, não por leitura**. O import
relativo cross-boundary

```ts
import corpusV2 from '../../../../supabase/functions/_shared/consent-text.json'
```

atravessa nas três ferramentas do lado cliente — Vitest resolveu (9/9 verdes), Vite
resolve JSON nativamente, e `tsc` aceitou sem mover a contagem de 97 (`resolveJsonModule:
true` em `tsconfig.json:13`; o arquivo está fora do `include`, mas `tsc` segue imports).
Do lado Deno o mesmo arquivo entra por
`import consentText from '../_shared/consent-text.json' with { type: 'json' }`.

**Consequência:** o fallback previsto — espelhar em `src/features/cadastro/` e asserir
igualdade byte-a-byte com `node:fs` — **não foi necessário e não foi escrito**. Não há
segunda cópia do texto que possa divergir. O teste
`consentTextFonteUnica.test.ts` mudou de papel: em vez de comparar dois arquivos, ele
asserta a FORMA do corpus (3 consentimentos, ids esperados, nenhum id de vídeo, o
transacional fora do array) e a PARIDADE de `CONSENT_TEXT_VERSION` entre os dois arquivos
de constantes — esta última por sonda de texto-fonte, no idioma do `strict-schema.test.ts`,
porque o `.ts` da EF não é importável sob Vitest.

### 2. Hex pinado e contagem `tsc`

- **Hex do texto v2** (`consent-text.json` sob `CONSENT_TEXT_VERSION = 'v2-2026-08'`):
  `dd8f573b73f9dd63090c90e4a2c53001ef9786a5516aa9678b21c22ec88d6653`
  Pinado em `consent-hash.test.ts` como `HEX_PINADO_V2`, com as instruções de recomputação
  no cabeçalho. **É o gate da fase:** qualquer reescrita futura da copy sem bump de versão
  reprova ali, no diff, em vez de escorregar para PROD.
- **`tsc`: 97 antes, 97 depois.** Baseline congelada intacta.

## Deviations from Plan

### 1. [Rule 2 — funcionalidade crítica ausente] `autorizacoesSchema` precisou de `.strict()` próprio

- **Encontrado em:** Task 2, ao escrever o teste RED do comportamento 4.
- **Problema:** o plano exige que um corpo com `autorizacao_analise_video` seja
  *"REJEITADO pelo `.strict()`, não silenciosamente descartado"*. Mas o `.strict()` vivo
  está em `cadastroCandidatoSchema`, e **`.strict()` do Zod só fecha o nível em que é
  declarado** — não os sub-objetos. Sem intervenção, a chave dentro de `autorizacoes: {…}`
  seria **descartada em silêncio** e o cliente receberia `200` acreditando ter registrado
  uma escolha que não existe mais. O comportamento que o plano descreve seria simplesmente
  falso.
- **Correção:** `.strict()` acrescentado ao próprio `autorizacoesSchema`, com a
  consequência documentada acima do bloco.
- **Arquivo:** `supabase/functions/_shared/schemas.ts` · **Commit:** `d6e9ddb`

### 2. [Rule 3 — decisão de contrato não coberta pelo plano] `autorizacao_comunicacao` no registro

- **Encontrado em:** Task 2. A lista de comportamentos do plano especifica o que o registro
  DEVE e o que NÃO DEVE carregar, mas é silenciosa sobre `autorizacao_comunicacao` — que
  saiu do contrato de ENTRADA (virou o canal transacional) e continua sendo coluna
  `NOT NULL` com DEFAULT no banco (`database.types.ts`: `autorizacao_comunicacao?: boolean`
  no `Insert`, `boolean` no `Row`).
- **Decisão:** escrever `true` **explicitamente** no montador, com a razão no docblock, em
  vez de omitir e deixar o `DEFAULT` do banco preencher. O valor afirma um **fato do
  sistema** (o canal transacional está ativo e não tem opt-out, Art. 7º, V), não uma escolha
  do titular — e a lição inteira desta fase é que *o sítio que decide o valor gravado tem de
  ser legível no código*. Omitir teria reproduzido em miniatura o defeito que a fase corrige:
  um valor gravado por um mecanismo invisível.
- **Arquivo:** `supabase/functions/_shared/autorizacoes-registro.ts` · **Commit:** `d6e9ddb`

### 3. [Rule 3 — gate que reprovaria o comportamento correto] o `<verify>` da Task 3 vs. a própria `<action>`

- **Encontrado em:** Task 3, ao rodar o gate automatizado.
- **Problema:** a `<action>` manda explicar no cabeçalho da migration por que
  `ADD COLUMN … IF NOT EXISTS` é proibido; o `<verify>` da mesma task é
  `! grep -q 'ADD COLUMN IF NOT EXISTS' <arquivo>`, um grep de arquivo inteiro que **não
  distingue DDL de comentário**. Escrever a sequência literal — ainda que para condená-la —
  reprovava o gate. É a armadilha exata que a 43-UI-SPEC §"ESCOPO DO GREP" documentou para
  `automaticamente`, com a mesma conclusão: *"um teste que reprova o comportamento correto
  é pior que teste nenhum: ele treina quem executa a desligá-lo."*
- **Correção:** a explicação foi preservada integralmente, escrita com elipse
  (`ADD COLUMN … IF NOT EXISTS`), e o cabeçalho registra a forma **correta** do gate, que
  descarta comentários antes de grepar:
  `grep -v '^[[:space:]]*--' <arquivo> | grep -qi 'if not exists'`. As duas formas foram
  executadas: ambas limpas.
- **Arquivo:** `supabase/migrations/20260801000001_…sql` · **Commit:** `8020f37`

### 4. [Fora de escopo — registrado, não corrigido] `deno test supabase/functions/_shared/` não roda limpo

`strict-schema.test.ts` é sonda **Vitest** e está no `"exclude"` de
`supabase/functions/deno.json`, mas esse exclude **não é honrado quando `deno test` recebe
um caminho de diretório** — o arquivo entra no type-check e falha com `TS7053`.
**Confirmado PRÉ-EXISTENTE** por `git stash` + re-execução no estado anterior. Não tocado
(fronteira de escopo); registrado em
`.planning/phases/43-…/deferred-items.md` com o comando que roda limpo e a sugestão de
fechamento (mover a sonda para `src/`).

### 5. [Rule 1 — afirmação incorreta] CONSENT-01/02/03/05 revertidos de "Complete" para "In Progress"

- **Encontrado em:** passo de atualização de estado. O fluxo GSD marca automaticamente como
  completos os requirements do frontmatter do plano, e `requirements.mark-complete` marcou
  os quatro `[x]` em `.planning/REQUIREMENTS.md`.
- **Problema:** a afirmação é **falsa**. Este plano fechou o lado SERVIDOR; faltam os 6 sítios
  de `.default(true)` do CLIENTE (plano 43-03), o **apply** da migration e o **deploy** da EF
  (checkpoint 43-07). Enquanto a migration não for aplicada, a EF grava em colunas que não
  existem. Deixar `[x]` seria registrar em `.planning/` exatamente a classe de coisa que esta
  fase existe para eliminar: um consentimento declarado sem código que o execute.
- **Correção:** os quatro voltaram a `[ ]`, a tabela de rastreabilidade passou a
  `In Progress (servidor em 43-01; cliente em 43-03; apply/deploy em 43-07)`, e um bloco de
  nota nomeia o que já existe e o que falta. Os requirements devem ser fechados pelo
  verificador da fase, depois do 43-07.
- **Arquivo:** `.planning/REQUIREMENTS.md`

## Gate do tracer

Sendo Task 1 do tipo `tracer`, o `<verify>` foi re-executado ponta a ponta **antes** de
qualquer task de expansão: 7/7 Deno, 9/9 Vitest, 1283/1283 no repositório, `tsc` 97. A
fundação estava verde, então as Tasks 2 e 3 puderam ser empilhadas sobre ela.

## ⚠ NADA APLICADO, NADA DEPLOYADO — e a ordem importa

Este plano produziu **arquivos**. Subagentes GSD não recebem os tools MCP do Supabase
(anthropics/claude-code#13898) e `supabase db push` é proibido neste projeto.

**Pendente do checkpoint 43-07, nesta ordem exata:**

1. **`apply_migration` de `20260801000001`** — sem wrapper `BEGIN;/COMMIT;`.
2. **Reparo obrigatório do ledger:**
   `UPDATE supabase_migrations.schema_migrations SET version='20260801000001' WHERE name LIKE '%p43_consent_prova%'`
   — o `apply_migration` carimba um timestamp próprio.
3. **Prova de fidelidade:** `md5(statements[1])` contra o md5 do arquivo. **Não é opcional
   aqui:** duas das cinco migrations do M8 chegaram a PROD com comentários descartados, e
   nesta migration os `COMMENT ON COLUMN` são onde BD-2 e BD-5 estão declarados em voz alta.
4. **Transcrever `>>> antes:`** (contagem de linhas + policies) no cabeçalho da migration e
   preencher `smoke43c.esperado_linhas` — sem isso a asserção (f) do smoke não prova nada.
5. **Rodar o smoke** numa **única** chamada `execute_sql`. Gate verde = **6 PASS**.
6. **Só então** deployar a EF `cadastrar-candidato`.

**Por que o passo 6 é o último, e é breaking:** a EF exige as colunas para gravar, e
`autorizacoesSchema` agora é `.strict()` sem `autorizacao_analise_video` nem
`autorizacao_comunicacao` — um bundle de browser desatualizado recebe `400 VALIDATION`.
Isso é o comportamento correto (D-04 / LGPD-01) e obriga a sequência
**migration → EF → cliente (43-03)**. Uma EF deployada antes das colunas faria, por ser
fail-closed, cada cadastro real da janela ser DESFEITO.

## ⚠ BD-5 — dito aqui em voz alta, não enterrado

`autorizacao_marketing_vagas` nasce **NULL para toda a base histórica**, e NULL é tratado
como **NÃO AUTORIZADO**.

> **Depois desta fase, ZERO candidato já cadastrado está autorizado a receber divulgação de
> vagas.**

**Isso não é regressão — é a correção.** Ninguém nunca consentiu marketing separadamente,
porque o consentimento separado não existia; o `.default(true)` fabricava esse
consentimento por inferência. Herdar de `autorizacao_comunicacao` seria reconstruir a mesma
inferência por outro caminho. Reconquistar a base exige campanha de re-opt-in, que é feature
de outro milestone. **Se uma métrica de alcance de divulgação cair a zero após esta fase, a
explicação está no `COMMENT ON COLUMN` e neste parágrafo.**

## ⚠ BD-4 — os 4 sem linha continuam sem linha

Medição do operador (2026-08-01): **21 candidatos vivos, 4 sem nenhuma linha em
`autorizacoes` (19%)**. A gravação passou a ser fail-closed para frente, mas **os 4 não
foram back-fillados e não devem ser**. Consentimento retroativo é fabricar prova — o oposto
exato do que esta fase entrega. A ausência deles é ela própria o registro honesto. A
asserção (b) do smoke prova por contagem que nada foi preenchido.

## Drift — 4ª instância registrada

As 3 policies de `public.autorizacoes` vivem em PROD e em **nenhum arquivo de migration**
(medido em `pg_policies`, 2026-08-01). Um `db reset` as perderia em silêncio, e a de UPDATE
é a base do CONSENT-04. Registrado em
`.planning/todos/pending/processo-origem-do-drift-desconhecida.md` como **registro, não
correção** — reconstruir uma policy de memória troca um `pg_get_expr` real por um palpite, e
o palpite mais provável (`USING` sem `WITH CHECK`) é justamente o que abre a escrita. A
asserção (e) do smoke verifica a declaração de escopo negativo em vez de acreditar nela.

## Known Stubs

Nenhum. Todo código escrito neste plano tem consumidor ou teste executável. Os dois
artefatos SQL são deliberadamente não-aplicados — não são stubs, são entrada do checkpoint
43-07, e o SUMMARY declara isso em duas seções.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As mitigações previstas foram
implementadas: T-43-01 (hash só no servidor + `.strict()` — reforçado pelo `.strict()` do
sub-schema, deviação 1), T-43-02 (`ADD COLUMN` sem DEFAULT + asserções (a) e (b) do smoke),
T-43-03 (BD-4 fail-closed com compensação), T-43-04 (protocolo de `md5(statements[1])` +
reparo do ledger no cabeçalho da migration), T-43-05 (nenhum `console.*` novo interpola
e-mail, nome, IP ou hash — as tags carregam apenas `userId`/`candidatoId`), T-43-SC (zero
dependência npm nova).

## Commits

| # | Hash | Tipo | Conteúdo |
|---|------|------|----------|
| 1 | `c98447e` | docs | captura verbatim do v1 histórico — **antes** de qualquer copy nova |
| 2 | `e29aa6f` | feat | Task 1 — fonte única + hash puro + pin + paridade de constantes |
| 3 | `a814e8f` | test | Task 2 RED — os dois sítios do servidor |
| 4 | `d6e9ddb` | feat | Task 2 GREEN — schema sem default, montador puro, EF fail-closed |
| 5 | `8020f37` | feat | Task 3 — migration aditiva + smoke de 6 asserções + drift #4 |

## Self-Check: PASSED

Todos os 9 arquivos criados existem em disco; todos os 5 hashes de commit existem em
`git log`. Verificado após a escrita deste arquivo.
