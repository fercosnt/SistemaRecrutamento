---
phase: 44
plan: 01
subsystem: compliance
status: complete
tags: [lgpd, export, allowlist, bd-6, fecho, tooling, devdependency]

requires:
  - "docs/compliance/pii-inventory.yaml (Phase 42 / 42-04) — fonte de CLASSIFICAÇÃO"
  - "docs/compliance/sql/gen-pii-md.cjs (Phase 42) — molde do gerador e do bloco --check"
  - "44-MEASUREMENTS.md §M1/§M2 — as medições vivas que forçam o BD-6"
provides:
  - "docs/compliance/export-scope-rules.yaml — a decisão 'é dado do titular sob o Art. 18, II?'"
  - "docs/compliance/sql/gen-export-allowlist.cjs — gerador de 3 entradas com --check / --sql-values"
  - "contrato do catalogo-vivo-44.json ({meta.medido_em, colunas:[{tabela,coluna,tipo}]}) — o 44-03 produz nesse formato"
  - "js-yaml como devDependency explícita (major 3, safeLoad)"
  - "linha literal de exclude da EF exportar-meus-dados em vite.config.ts (consumida pelo 44-05)"
affects:
  - "44-03 — roda o gerador contra o catálogo vivo e emite export-allowlist.json + _shared/exportAllowlist.ts"
  - "44-05 — cria o teste Deno da EF sob a linha de exclude que nasceu aqui"
  - "Phase 45 — consome o escopo do titular exercitado como plano de exclusão (ERASE-02, ERASE-06)"

tech-stack:
  added:
    - "js-yaml ^3.15.1 (devDependency; já vivia na árvore por hoisting em 3.14.2)"
  patterns:
    - "gerador de compliance CommonJS com --check determinístico (idioma de gen-pii-md.cjs)"
    - "fecho obrigatório: sobra ⇒ process.exit(1) nomeando o objeto, nunca omissão silenciosa"
    - "teste que executa o binário por spawnSync e asserta exit code + stderr"

key-files:
  created:
    - docs/compliance/export-scope-rules.yaml
    - docs/compliance/sql/gen-export-allowlist.cjs
    - docs/compliance/__tests__/genExportAllowlist.test.ts
  modified:
    - package.json
    - package-lock.json
    - vite.config.ts

decisions:
  - "A precedência de coluna põe `ponteiros` (R2 partida) ANTES da entrada explícita do inventário — o oposto do que o plano escreveu. Seguida à letra, a ordem do plano exportaria UUID de funcionário na cópia do candidato."
  - "R4 do inventário NÃO existe como regra de coluna: é regra de TABELA. Se resolvesse coluna, 'conteúdo do produto' viraria a porta por onde uma coluna não classificada sairia calada."
  - "`meta.gerado_em` é pinado do artefato em disco durante `--check` — sem isso a checagem divergiria pelo relógio e nunca sairia 0, e um gate que nunca passa não é um gate."
  - "Tabela declarada em `escopo_titular` e ausente do catálogo é AVISO + registro em `meta.escopo_declarado_nao_vivo`, não erro: tabela ausente não vaza coluna. O caminho perigoso é o inverso, e o fecho já o cobre."
  - "O fecho ACUMULA todas as pendências antes de sair, em vez de morrer na primeira — o 44-03 recebe a lista inteira em vez de uma pendência por rodada."

metrics:
  duration: ~20min
  completed: 2026-08-03
  tasks: 3
  commits: 4
  files: 6

actuals:
  tokens: 14700
  tasks: 3
  commits: 4
---

# Phase 44 Plan 01: Insumos de decisão da allowlist — Summary

Os dois insumos que a allowlist do export consome nascem antes de qualquer linha de export: o
arquivo que declara **o escopo do titular** (a pergunta que o inventário da Phase 42 não responde) e
o gerador que o funde com o catálogo vivo e com a classificação do YAML — **falhando alto** quando
os três não fecham.

## O que foi construído

### Task 1 — Os dois portões de configuração (`d9efe9e`)

**`js-yaml` deixou de ser dependência-fantasma.** Vivia em `node_modules` na 3.14.2 apenas por
hoisting de `@testing-library/dom`; um bump daquele pacote mataria o `gen-pii-md.cjs` da Phase 42 e
o gerador desta fase **juntos** — e mataria o `--check` no mesmo golpe, que é o modo de falha em que
o guarda morre com aquilo que ele guardava.

- Registry consultado antes de pinar, como o ritual manda: `npm view js-yaml version` → **5.2.3**.
- Instalado `js-yaml@^3.14.2`, que resolveu para **3.15.1** (`devDependencies: "^3.15.1"`).
  **Major fixada em 3 de propósito:** a 4.x remove `safeLoad` e quebraria o `gen-pii-md.cjs` vivo.
- Verificado APÓS o install, não presumido: `typeof yaml.safeLoad === 'function'` e
  `node docs/compliance/sql/gen-pii-md.cjs --check` continua saindo **0**.
- Diff do lockfile mínimo: um pacote, deduplicado, **zero dependência transitiva nova**.

**A linha de `exclude` da EF nova, ANTES do teste que a exige.** Entrada literal
`supabase/functions/exportar-meus-dados/**/*.test.ts` no `exclude` do bloco `test:`, com comentário
no idioma das 15+ vizinhas — nunca glob de diretório.

A ordem é o oposto da intuição, e o comentário inline registra por quê: uma entrada de `exclude`
apontando para caminho inexistente é **no-op inofensivo**; uma entrada que chega DEPOIS do teste é
`npm run test:run` vermelho no intervalo entre dois commits. A restrição da `44-VALIDATION.md` ("a
linha entra no MESMO commit que o teste") protege a árvore vermelha — e a única ordem que a satisfaz
é esta.

### Task 2 — `export-scope-rules.yaml` (`0985663`)

O `pii-inventory.yaml` responde **o que a exclusão faz com esta coluna**; a Phase 44 precisa de
outra resposta: **isto é dado do titular sob o Art. 18, II?** Três famílias provam que os eixos não
coincidem, e as três estão citadas no cabeçalho do arquivo.

Sete blocos obrigatórios + um auxiliar:

| Bloco | Conteúdo |
|---|---|
| `meta` | requirement, versão semântica, `consumidores` citando a **Phase 45**, cobertura declarada |
| `escopo_titular` | **30 tabelas** com `chave_titular` + `ligacao` (`direta` \| `via:candidaturas`) + `razao` |
| `fora_do_escopo` | **21 tabelas**, razão do vocabulário fechado de 5 valores |
| `fora_do_escopo_por_regra` | **7 regras** cobrindo **17 tabelas** (`config_*`, `perguntas*`, `questoes_*`, `*_itens`, `biblioteca_*`, `classe_*`) |
| `colunas_nunca` | veto absoluto: `smtp_senha_encrypted`, `webhook_secret`, `secret`, `session_token`, `hash_cpf_email` |
| `ponteiros` *(auxiliar)* | a regra R2 do inventário **partida em duas** |
| `decisoes_por_coluna` | as 4 colunas do BD-6 + `opcao_knockout_id` + `curriculo_url` |
| `regra_de_fecho` | o contrato em prosa que a Task 3 implementa |

**Conferência de escrita, feita e registrada no arquivo:** 30 + 21 + 17 fecham contra o snapshot de
**67 tabelas base** do `database.types.ts` — o mesmo total do catálogo vivo medido em 2026-08-03.
Zero tabela sem disposição, zero nome da R2 do inventário fora do bloco `ponteiros`, e toda
`chave_titular` declarada existe como coluna real. A prova de verdade continua sendo o fecho
executado contra o catálogo **vivo** no 44-03; isto é conferência, não prova, e o arquivo diz isso.

As **quatro colunas que o BD-6 mediu com zero ocorrências no inventário** entram com `export: true` e
razão citando o ROADMAP §Phase 44 *Depends on* — são a dependência declarada desta fase sobre a
Phase 43, e é literalmente por elas que o bloco existe.

### Task 3 — `gen-export-allowlist.cjs` (`dcac73a` RED → `87b5561` GREEN)

**RED separado e genuíno:** os 9 testes foram commitados com o gerador ainda inexistente e falhando
9/9 por `ENOENT`. Possível porque `docs/` está fora do `include` do `tsconfig.json`, então o teste
não move a contagem `tsc` e o hook de não-regressão passa sem `--no-verify`.

Três entradas nomeadas em constantes no topo: `catalogo-vivo-44.json` (**existência**),
`pii-inventory.yaml` (**classificação**), `export-scope-rules.yaml` (**escopo do titular**).

**Precedência de coluna implementada:**

```
1. colunas_nunca        (veto absoluto)
2. decisoes_por_coluna  (decisão explícita, com razão)
3. ponteiros            (R2 partida: titular sai, terceiro não)
4. entrada explícita de coluna no pii-inventory.yaml
5. R1  (id, *_id, created_at, updated_at, deleted_at, *_em)
6. R3  (tipo booleano, numérico, enum ou temporal)
7. R5  (analise_ia*, raw_response, conteudo_jsonb, metadata, dados_antes, dados_depois)
8. sobra ⇒ ERRO DE FECHAMENTO
```

**Cinco fechos, não um.** Além do fecho de tabela e do de coluna, o gerador reprova: `chave_titular`
que não existe viva, razão de exclusão fora do vocabulário fechado (ou regra sem `razao`), e — o
mais interessante — **fecho sobre a própria regra R2**: todo nome de ponteiro citado no `padrao` da
R2 do inventário tem de aparecer em `ponteiros`. É o que impede a regra do inventário de crescer sem
que o escopo tome conhecimento.

**Dois artefatos, uma fonte.** `export-allowlist.json` e o espelho
`supabase/functions/_shared/exportAllowlist.ts` (`export const EXPORT_ALLOWLIST = … as const`, com
docblock declarando-se gerado). O espelho existe porque import estático de JSON saindo do diretório
da EF é a assunção A1 da pesquisa e **pode não sobreviver ao bundler**; um módulo TypeScript comum
não depende de resolução de JSON. `--check` cobre **os dois** — olhar só um deixaria o outro
apodrecer.

**`--sql-values`** imprime apenas os pares `('tabela','coluna')` ordenados, última linha sem vírgula:
colável no `VALUES` do smoke SQL do 44-03 sem edição manual.

## Verificação

| Critério | Resultado |
|---|---|
| `npx vitest run docs/compliance/__tests__/genExportAllowlist.test.ts` | **9/9 verdes**, cobrindo (a)–(i) |
| `npm run test:run` | **156 arquivos / 1431 testes verdes** |
| `npm run lint` (`tsc --noEmit`) | **97** — baseline congelada 97, zero regressão |
| `.husky/pre-commit` | rodou e passou nos **4 commits**. **Zero `--no-verify`** |
| `grep -c safeLoad` no gerador | **3** |
| `grep -cE "yaml\.load\("` no gerador | **0** |
| `grep -cE "\b(pg\|postgres\|DATABASE_URL\|SUPABASE_SERVICE)"` no gerador | **0** — não fala com o banco |
| `node docs/compliance/sql/gen-export-allowlist.cjs` (sem catálogo) | **exit 1** citando o caminho e o plano 44-03 — e essa é a saída correta neste ponto da fase |
| `node docs/compliance/sql/gen-pii-md.cjs --check` | **exit 0** — a promoção de `js-yaml` não quebrou o gerador da Phase 42 |
| `grep -c` da entrada literal de exclude | **1**; glob de diretório: **0** |
| `js-yaml` em `devDependencies`, major 3 | ✓ `^3.15.1`, `safeLoad` presente |

### Prova de que o fecho MORDE — dry-run contra a configuração REAL

Rodado num diretório descartável (não commitado) com o `export-scope-rules.yaml` e o
`pii-inventory.yaml` **reais** e um catálogo sintético de **880 colunas / 67 tabelas** derivado do
`database.types.ts`:

- **Fecho de TABELA: zero pendências.** As 67 tabelas caem nos três baldes, como a conferência de
  escrita previu.
- **Fecho de COLUNA: 62 pendências**, cada uma nomeando `tabela.coluna` e o tipo.

⚠ **Honestidade sobre esse 62:** o proxy degrada tipos (`timestamptz` e enums viram `text`), então
ele **superestima**. Cerca de **20** das 62 são colunas temporais (`data_*`, `*_at`) que o catálogo
vivo resolve por R3 sem intervenção. As restantes são majoritariamente `text`/`ARRAY`/`jsonb` de
conteúdo (`resumo_cv`, `pontos_fortes`, `competencias`, `flags`) e colunas de estado
(`status`, `tipo`, `etapa_atual`) — e para essas o erro de fechamento é o comportamento **correto**,
não ruído: são exatamente as colunas de conteúdo livre que poderiam sair caladas na cópia.

**O número real é medido no 44-03**, contra o catálogo vivo com os tipos verdadeiros, e é lá que os
vereditos restantes entram em `decisoes_por_coluna`. Este dry-run existe para que aquele plano não
descubra a carga de surpresa.

## Desvios do plano

### 1. [Regra 2 — funcionalidade crítica ausente] Precedência de coluna reordenada

- **Encontrado em:** Task 2 (projeto do arquivo) / Task 3 (implementação)
- **Problema:** o plano escreveu a precedência como
  `colunas_nunca → decisoes_por_coluna → entrada explícita no inventário → R1–R5`. Seguida à letra,
  ela **exportaria `entrevistas_online.agendado_por` e `avaliacoes_rh.avaliador_id`**: o
  `pii-inventory.yaml` tem entrada EXPLÍCITA para essas colunas (`preservar`, nota *"Funcionário"*),
  e entrada explícita venceria a regra R2. O resultado seria vazar UUID de funcionário na cópia do
  candidato — a mesma `pii_de_terceiro` que o próprio escopo exclui no nível da tabela.
- **Correção:** bloco `ponteiros` (a R2 partida em `do_titular` / `de_terceiro`) roda **antes** da
  entrada explícita do inventário e **depois** de `decisoes_por_coluna`. Fica um veto estrutural que
  sobrevive a alguém adicionar uma tabela nova, e ainda assim sobrescrevível caso a caso com razão
  nomeada.
- **Justificado inline** no bloco 5 e no `regra_de_fecho` do `export-scope-rules.yaml`, e no
  comentário do passo 3 do gerador. Testado por (a) (`avaliador_id` ausente da cópia).
- **Commits:** `0985663`, `87b5561`

### 2. [Regra 3 — bloqueio] `--check` divergiria pelo relógio

- **Problema:** o plano manda `meta.gerado_em` no artefato. Com carimbo fresco a cada execução, o
  `--check` divergiria **sempre** — um gate que nunca passa é um gate que só ensina a ignorá-lo (o
  mesmo defeito que o `.husky/pre-commit` desta casa já pagou para aprender).
- **Correção:** em modo `--check` o `gerado_em` é **pinado do artefato em disco** antes da
  comparação. Tudo o mais precisa bater. `meta.medido_em` permanece copiado do catálogo e é o carimbo
  que importa para proveniência (T-44-13). Documentado no código.
- **Commit:** `87b5561`

### 3. [Regra 3 — bloqueio] Tabela declarada em escopo e ainda não viva

- **Problema:** `solicitacoes_dados` está em `escopo_titular` mas nasce no 44-02. Tratada como erro
  de fechamento, ela reprovaria a geração por um motivo que não é risco.
- **Correção:** declarada-mas-não-viva gera **AVISO no stderr** + registro em
  `meta.escopo_declarado_nao_vivo` do artefato. Tabela ausente não vaza coluna nenhuma; o caminho
  perigoso é o inverso (tabela viva sem disposição), e esse continua sendo erro fatal.
- **Commit:** `87b5561`

### 4. [decisão de teste] `spawnSync` em vez de `execFileSync`

O plano pediu `execFileSync`. Ele **lança** em saída não-zero, e **seis dos nove casos existem para
asserir saída não-zero** — usá-lo produziria seis `try/catch` cerimoniais em torno de
`err.status`/`err.stderr`. `spawnSync` é o irmão não-lançante do mesmo módulo, mesma chamada de
processo. Justificado no docblock do teste.

## Contratos definidos aqui que outros planos consomem

**`docs/compliance/catalogo-vivo-44.json`** — formato que o **44-03** tem de produzir:

```json
{
  "meta": { "medido_em": "<ISO-8601 da medição>", "projeto": "…", "query_reprodutora": "…" },
  "colunas": [ { "tabela": "candidatos", "coluna": "id", "tipo": "uuid" } ]
}
```

⚠ **`tipo` é obrigatório** — é o `data_type` do `information_schema.columns`, e é o que a regra R3
consome. Sem ele, toda coluna de estado de processo vira erro de fechamento.
⚠ **`meta.medido_em` é obrigatório** — o gerador o COPIA para o artefato e nunca o fabrica.

## Threat Flags

Nenhuma superfície de segurança nova além da já registrada no `<threat_model>` do plano. As
mitigações declaradas foram implementadas e testadas:

| Threat | Mitigação | Teste |
|---|---|---|
| T-44-07 | `colunas_nunca` precede toda outra resolução | (e) — veto atravessa tabela em escopo E vence entrada explícita do inventário |
| T-44-08 | coluna viva sem veredito ⇒ exit 1 nomeando a coluna | (b) — reproduz a medição literal do BD-6 |
| T-44-13 | `meta.medido_em` copiado do catálogo; catálogo ausente ⇒ exit 1 | (a) e (h) |
| T-44-SC | pacote `[OK]` na pesquisa, `npm view` executado (5.2.3), major fixada em 3, zero pacote novo | lockfile: 1 pacote, 0 transitiva nova |
| T-44-14 | `--check` cobre os DOIS artefatos; docblock declara o `.ts` como gerado | (g) — `.ts` alterado E apagado |

## Known Stubs

Nenhum. Zero `TODO`/`FIXME`/placeholder nos arquivos criados (as três ocorrências de `todo`/`Todo`
em `grep` são a palavra portuguesa "todo/toda", em prosa de comentário). Zero `t.skip`/`test.todo`.
Zero `<verify>` não executado.

**O que continua em aberto por desenho, não por omissão:** `export-allowlist.json` e
`_shared/exportAllowlist.ts` **não existem** ao fim deste plano, e o gerador sai 1 — porque o
catálogo vivo é medido no **44-03**. O `<verification>` do plano nomeia essa saída 1 como a saída
**correta** neste ponto da fase.

## Self-Check: PASSED

- Arquivos criados/modificados: 6/6 **FOUND**
- Commits: `d9efe9e`, `0985663`, `dcac73a`, `87b5561` — 4/4 **FOUND**
- Suíte completa verde, `tsc` na baseline, hook rodado em todos os commits
