---
phase: 44-exporta-o-acesso
plan: 16
status: in-progress
---

# Phase 44 Plan 16: publicação do CR-01 — Summary (PARCIAL: Task 1, ajuste do operador no Task 2 e Task 1 de novo; a publicação é o Task 3)

GATES_SHA: 1031e409869d1b44054cd97c62958438dd02ffc2

> Este é o `GATES_SHA` VIGENTE: o da rodada 2, depois do ajuste do canal (seção «Rodada 2», no fim). O da rodada 1 (`32eb9371`) fica registrado abaixo como histórico, mas foi superado. A árvore dele publicaria o endereço morto.

## Antes de publicar (Task 1) — rodada 1, histórico

GATES_SHA da rodada 1 (superado pela rodada 2): 32eb9371dd54d818de79c90eb67291321ee58360

Os dois `<automated>` do Task 1 rodaram LITERAIS. Foram salvos em script e executados com `bash`, porque o shell da sessão é zsh. Rodaram sobre o HEAD `32eb9371`, que é o commit de metadados do 44-15. Os dois imprimiram a linha final e saíram com exit 0. HEAD era o mesmo antes e depois de cada um. A única troca no texto foi `S=$(mktemp -d)` → o scratch da sessão (`/private/tmp/claude-501/…/scratchpad/p4416/{g1,g2}`). Ele também fica fora do repositório, e o 44-15 fez a mesma troca.

- Primeiro comando: das 2026-10-07T00:01:33Z às 00:01:54Z → «arvore aprovada».
- Segundo comando: a partir das 2026-10-07T00:01:59Z → «chunk local: …».

### 1 · Árvore exata: janela, BD-15, conjunto de commits, suíte, Deno, `tsc`, allowlist, smoke

- `git fetch` feito. `HEAD..origin/main` = **0**, então não há janela concorrente. `origin/main` = `0fde284f`.
- `git diff --name-only origin/main..HEAD` sobre `export-allowlist.json`, `export-scope-rules.yaml`, `catalogo-vivo-44.json`, `docs/compliance/sql` e `supabase/functions` saiu **vazio** (BD-15).
- Conferência do conjunto: **`commits=16 fora=[]`**.
- Vitest, relatório JSON: 220 arquivos e **2444 testes**, com 2442 passando e **2 falhas**. As duas estão em `__tests__/promessasComExecutor.test.ts` e são as pré-existentes registradas em `deferred-items.md`:
  - «deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…»
  - «fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos»

  Fora delas, nenhuma falha. 2444 ≥ 2419, a baseline do plano. A diferença vem dos testes somados pelo 44-14 e pelo 44-15.
- `deno test --allow-all supabase/functions/exportar-meus-dados/` → `ok | 21 passed | 0 failed`.
- `tsc rodou: rc=2 error_TS=89`. O par é coerente e fica dentro do limite de 89.
- `check:export-allowlist` → `OK: docs/compliance/export-allowlist.json e supabase/functions/_shared/exportAllowlist.ts estão em sincronia com as três fontes.`
- Smoke limpo contra PROD, só leitura:
  - a primeira linha do scratch é `SET TRANSACTION READ ONLY;`;
  - `tail -n +2` é igual ao smoke versionado (`cmp`);
  - `node p46apply.cjs run`, 34477 octetos, **sem registro no ledger**.

  Populações lidas antes do booleano: `n_tabelas_vivas` 75 · `n_tabelas_com_disposicao` 75 · `n_tabelas_em_escopo` 32 · `n_colunas_vivas_em_escopo` 451 · `n_pares_com_veredito` 451. Resultado:
  ```json
  {"smoke":"p44_export_drift","pass":true,"n_tabelas_vivas":75,"n_tabelas_com_disposicao":75,"n_tabelas_em_escopo":32,"n_colunas_vivas_em_escopo":451,"n_pares_com_veredito":451,"n_drift":0}
  ```
  As populações são idênticas às do 44-12, do 44-13 e da execução E do 44-15.

### 2 · Build local: a frase nova está no chunk certo, e a antiga não está em nenhum

- `npm run -s build` → exit 0.
- Script `P`, que deriva os trechos fixos do template `oQueNaoEsta` de HEAD → **`frase nova em index-uPy7ZGUp.js (1 trecho(s) fixo(s), 51 JS varridos)`**.
  - O template tem uma única interpolação, `${CANAL_PRIVACIDADE_EMAIL}`. Por isso tem duas partes fixas: uma de 882 caracteres e o `.` final. Só a primeira passa do mínimo de 20 caracteres.
  - O chunk é o índice eager, o mesmo lugar onde a frase antiga mora hoje no ar (`index-BgK7K5Is.js`). O publicado terá outro hash.
- No bundle, o template sai verbatim, com o travessão intacto e `${$a}` no lugar do canal: `` oQueNaoEsta:`Não entram os registros técnicos … escreva para o nosso canal de privacidade: ${$a}.` ``.
- `grep -rl 'descrevem o sistema' build/assets/` saiu **vazio**.

### 3 · O que está no ar AGORA (leitura, antes de qualquer push)

Crawl de `https://rh.beautysmile.com.br/` às 2026-10-07T00:02Z, com o índice e todo `assets/*.js` referenciado, até ponto fixo. Foram 49 JS:
- a frase antiga mora em `index-BgK7K5Is.js`;
- nenhum JS publicado contém o trecho novo «os dados que identificam outras pessoas».

A EF `exportar-meus-dados`, medida pela Management API às 00:02:27Z, está assim: `version` 6, `status` ACTIVE, `verify_jwt` true. `gh auth status` → 0.

### 4 · A frase exata que iria ao ar na rodada 1 (superada: o canal mudou na rodada 2)

Ela vem do template literal de `COPY_PEDIR_COPIA.oQueNaoEsta` em HEAD, com `CANAL_PRIVACIDADE_EMAIL` (`src/features/privacidade/constants/canalPrivacidade.ts`) no lugar da interpolação. É a mesma frase na tela (`PedirCopiaBloco`), no `.html` e no `.json`:

> Não entram os registros técnicos de funcionamento do sistema — por exemplo, o tempo e o custo de processamento das nossas ferramentas de tecnologia, os registros de acesso e o controle de envio de mensagens — nem a configuração do próprio sistema, como o texto das vagas e das perguntas, que é o mesmo para todos os candidatos. Também não entram: os dados que identificam outras pessoas, como quem da equipe agiu no seu processo; as anotações internas da equipe sobre a conservação dos seus dados além do prazo (o motivo e as datas entram); a ficha técnica que o sistema monta ao atender um pedido de exclusão dos seus dados (o andamento e as datas do pedido entram); e o texto em que a equipe justificou a decisão final sobre a sua candidatura (a decisão em si entra). Se quiser saber mais sobre algum desses itens, ou pedir algum deles, escreva para o nosso canal de privacidade: lgpd@beautysmile.com.br.

### 5 · `git log --oneline origin/main..HEAD` no `GATES_SHA` (16 commits, todos dentro do conjunto autorizado)

```
32eb9371 docs(44-15): complete CR-01 portoes plan — SUMMARY, STATE e ROADMAP a mao (…)
813b191c test(44-15): (i)/(i2) ordenam como o gerador (WR-07), fixture com prefixo comum e (i3) mordendo
a38041ae test(44-15): a (k) ve toda tupla (WR-01) e a (k4) prova que (k) e (k3) mordem em 18 rotas
f2e357a8 fix(44-15): smoke do drift falha FECHADO (WR-03) e a (k3) prende estrutura, predicado e agregador (WR-02)
5e06d967 docs(44-14): complete CR-01 frase plan — SUMMARY, STATE e ROADMAP a mao (…)
18e35dd9 docs(44-14): 44-UI-SPEC com a frase nova do CR-01 e a redacao anterior numa nota datada
f71cd75b test(44-14): o portao do CR-01 morde — cinco controles negativos permanentes (cr3)
d5402c1c feat(44-14): fronteira dita ao titular nomeia toda categoria retida (CR-01)
80fcc2a1 docs(44): STATE — CR-01 planejado (44-14..44-16), pronto para executar --gaps-only
e8c008d0 docs(44): revisao dos planos 44-14..44-16 pelo checker — (…)
56822835 docs(44): planos de fechamento do CR-01 (44-14..44-16) — (…)
85bb3c96 docs(44): reverificacao pos-G5 — gaps_found 6/7; G5 fechado em PROD, CR-01 aberto (…)
7294bc6c docs(44): preserva a reverificacao de 2026-10-06 (gaps_found, G5) antes da nova verificacao
4290f4e0 docs(44): disposicao dos achados da re-revisao do G5 (todos open)
dfc1317e docs(44): re-revisao do G5 — 1 blocker (CR-01), 7 warnings, 7 infos
f823822f docs(44): preserva o code review de 2026-08-04 antes da re-revisao do G5
```

Arquivos de cada commit:
- Os 8 `docs(44)` e os 4 `docs(44-1x)` tocam só `.planning/`.
- `d5402c1c`: `exportacaoService.ts` e o teste dele.
- `f71cd75b`: o teste do serviço.
- `f2e357a8`: `exportAllowlist.test.ts` e `p44_export_drift_smoke.sql`.
- `a38041ae`: `exportAllowlist.test.ts`.
- `813b191c`: `genExportAllowlist.test.ts`.

Fora de `.planning/`, o conjunto toca exatamente os cinco arquivos de código autorizados: 960 inserções e 23 remoções. O `<interfaces>` previa 5 `docs(44)` mais «o commit dos planos». Na verdade os commits de planejamento são **três**: `56822835` (planos), `e8c008d0` (revisão do checker) e `80fcc2a1` (STATE). Os três são `docs(44)` e só `.planning/`, e o script os aceita.

### 5b · O que NÃO sobe

- **Allowlist:** nenhuma mudança. Segue na 1.4.0, e o diff BD-15 saiu vazio.
- **EF:** nenhuma. Segue na v6.
- **Banco:** nenhuma escrita. O smoke foi só leitura.
- **Mudanças alheias, não commitadas e fora de `origin/main..HEAD`:** `.planning/ui-reviews/.gitignore` (M), `docs/specs/DRAFT-banco-sjt-marketing.md` (M) e `docs/vagas/` (??). Elas não vão em push nenhum.

---

## Rodada 2 — ajuste do operador no Task 2 (2026-10-06)

### A · A resposta do operador, verbatim

O operador não respondeu «publicar». Respondeu com um ajuste:

> «trocar o email para rh@beautysmile.com.br»

Na pergunta seguinte, decidiu duas coisas:

- **Escopo:** o sistema inteiro. O canal de privacidade é UM canal, e não muda só nesta frase.
- **`lgpd@beautysmile.com.br` não existe e não é lido.** Até agora, todo o sistema publicado mandava o titular para uma caixa morta. Por isso isto é correção, não preferência.

Nada nessa resposta autoriza publicar. Nenhum push foi feito.

### B · O que mudou (TDD: vermelho primeiro, depois verde)

| Commit | Tipo | Arquivos |
|---|---|---|
| `98f9efb3` | `test(44-16)` RED | `src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts` (novo), `src/features/cadastro/components/steps/__tests__/AutorizacoesStep.test.tsx`, `src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx` |
| `b1136807` | `fix(44-16)` GREEN | `src/features/privacidade/constants/canalPrivacidade.ts`, `src/features/cadastro/components/steps/AutorizacoesStep.tsx` |
| `1031e409` | `docs(44-16)` | `.planning/DECISAO-ENCARREGADO.md`, `.planning/phases/44-exporta-o-acesso/44-UI-SPEC.md`, `.planning/phases/44-exporta-o-acesso/deferred-items.md` |

O que cada arquivo de código mudou:

- **`canalPrivacidade.ts`:** passa a ter `CANAL_PRIVACIDADE_EMAIL = 'rh@beautysmile.com.br'`. É a mesma caixa do `REPLY_TO` em `supabase/functions/_shared/email-config.ts`.
  - O docblock ganha uma seção datada de 2026-10-06.
  - A frase histórica «o endereço é o mesmo» foi anotada, não apagada: ela valeu até 2026-10-06.
  - O endereço morto não está escrito por extenso no docblock. Assim a varredura `grep -rn "lgpd@"` sai vazia em `src/`.
- **`AutorizacoesStep.tsx`** (o passo 4 do cadastro): tinha `mailto:` e o texto do link digitados à mão. Agora os dois vêm da constante, importada de `@/features/privacidade/constants/canalPrivacidade`. É a mesma direção de camada que `PrivacidadePublicaPage` e `ExplicacaoCandidatoPage` já usam: um módulo de constante puro, sem React.
- **`canalPrivacidade.test.ts`:**
  - (cp1) prende o VALOR literal `rh@beautysmile.com.br`. É o único teste que escreve o endereço à mão, de propósito. Uma volta para uma caixa morta reprova aqui, mesmo com todos os testes «usa a constante» verdes.
  - (cp2) exige que o valor seja igual ao `REPLY_TO`. O `REPLY_TO` é lido como texto, porque importar o módulo traria `Deno.env` para o `tsc` do front.
  - (cp3) exige o endereço morto, montado em runtime, ausente de todo arquivo de `src/`. O caso também confere que a varredura alcança `AutorizacoesStep.tsx` e o próprio módulo.
  - (cp4) exige a fonte única: nenhum arquivo de produção fora do módulo escreve o endereço. Antes de reprovar, o detector é provado contra o próprio módulo.
- **`AutorizacoesStep.test.tsx`:** ganhou o caso (g). O link de correção e portabilidade tem nome e `href` vindos de `CANAL_PRIVACIDADE_EMAIL`.
- **`ExplicacaoCandidatoPage.test.tsx`:** o caso «dá o canal humano» assere pela constante, que é a intenção dele. O literal fica preso uma vez só, no (cp1).

Evidências:

- **Vermelho (RED) em `98f9efb3`:** os quatro casos cp1..cp4 reprovaram.
  - (cp1) e (cp2) com `expected 'lgpd@beautysmile.com.br' to be 'rh@beautysmile.com.br'`.
  - (cp3) acusou `["src/features/cadastro/components/steps/AutorizacoesStep.tsx", "src/features/privacidade/constants/canalPrivacidade.ts"]`.
  - (cp4) acusou `AutorizacoesStep.tsx` além do módulo.
- **Verde (GREEN) em `b1136807`:** as features `privacidade`, `cadastro`, `explicacao` e `transparencia` deram 35 arquivos e 583/583.
- **O portão MORDE.** A mutação pôs o endereço certo (`rh@…`) de volta, digitado à mão, no texto do link de `AutorizacoesStep.tsx`. O (cp4) reprovou nomeando o arquivo. A restauração conferiu por md5: `48074cf9…` → `085ffbf8…` → `48074cf9…`. O (cp4) pega o endereço digitado mesmo quando ele está certo. Era assim que o defeito sobrevivia à constante.

### C · Varredura pela FORMA

- `grep -rn "lgpd@" src supabase docs --exclude-dir=node_modules` → **zero ocorrências**.
- `supabase/` não tinha o endereço antes desta rodada: nenhuma EF, migration ou SQL. Nada parou por BD-15, e nenhuma EF foi tocada.
- Fora de `.planning/`, as únicas ocorrências do repositório eram as 3 de `src/` já consertadas.
- Em `.planning/`, o endereço continua em documentos HISTÓRICOS, deixados como estão por instrução: UI-SPEC e RESEARCH de outras fases, os SUMMARY/PLAN do 44-14, a rodada 1 deste SUMMARY, `GUIA-VALIDACAO-FINAL`, `JORNADA-GUIADA`, `RETOMAR-AQUI`, `45-CONTA-DESCARTAVEL` e os documentos da Phase 48.
- Na `44-UI-SPEC` e na `DECISAO-ENCARREGADO`, o endereço continua só dentro das notas datadas que preservam a redação anterior.
- **Mesma forma, fora do escopo:** `src/components/ErrorBoundary.tsx:202` tem `mailto:suporte@beautysmile.com.br` digitado à mão, no «Contate o suporte» da tela de erro global. Ninguém mediu se essa caixa existe. Está registrado em `deferred-items.md` como pergunta ao operador e não foi consertado. Não é o canal de privacidade, e o operador decidiu só sobre ele.

### D · Escrituração

- **`44-UI-SPEC.md`:** o endereço mudou para `rh@` em quatro células:
  - «O que não está na cópia»;
  - «Error state»;
  - «Cooldown»;
  - «Erro».

  As três últimas ainda diziam «Encarregado de Dados», que o código deixou em 2026-08-13 (`f8e76e2`). Elas passam a dizer «canal de privacidade», como o código. A redação anterior das três ficou verbatim numa nota datada de 2026-10-06, abaixo da tabela de estados do CTA.
- **`DECISAO-ENCARREGADO.md`:** nota de 2026-10-06 acrescentada no fim. O texto anterior está intacto.
- **Os verifies do 44-14 rodaram de novo sobre a árvore nova:**
  - Task 1: `vitest src/features/privacidade` com 11 arquivos e 162/162; `tsc rodou: rc=2 error_TS=89`; «frase nova no servico (909 caracteres, canal interpolado); a antiga saiu».
  - Task 2, mutação da frase real: «CR-01 mordeu nomeando BD-13 (ii); md5 2dac5207… -> 6850ea6f… -> 2dac5207…».
  - Task 3: «ui-spec = codigo» e «nota historica preservada».

### E · Desvio do plano: o conjunto autorizado foi emendado

**[Desvio por decisão do operador]** A regra do plano (must_have 4 e o script dos Tasks 1 e 3) autoriza subir só `.planning/` ou os cinco arquivos de código dos planos 44-14/44-15. A resposta do operador («trocar o email para rh@beautysmile.com.br», no sistema inteiro) exige código fora desses cinco. Por isso o conjunto foi **emendado de forma explícita**, sem alargamento silencioso. O assunto continua igual: `^(docs|feat|fix|test|chore|refactor)\((phase-)?44(-1[4-6])?\)`.

**Conjunto autorizado VIGENTE:** `.planning/**` mais estes dez arquivos.

- Os cinco originais:
  - `src/features/privacidade/services/exportacaoService.ts`
  - `src/features/privacidade/services/__tests__/exportacaoService.test.ts`
  - `docs/compliance/__tests__/exportAllowlist.test.ts`
  - `docs/compliance/__tests__/genExportAllowlist.test.ts`
  - `supabase/tests/p44_export_drift_smoke.sql`
- Os cinco do ajuste:
  - `src/features/privacidade/constants/canalPrivacidade.ts`
  - `src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts`
  - `src/features/cadastro/components/steps/AutorizacoesStep.tsx`
  - `src/features/cadastro/components/steps/__tests__/AutorizacoesStep.test.tsx`
  - `src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx`

A regex de arquivos emendada é a regex original OU esta:
```
^(src\/features\/privacidade\/constants\/(canalPrivacidade\.ts|__tests__\/canalPrivacidade\.test\.ts)|src\/features\/cadastro\/components\/steps\/(AutorizacoesStep\.tsx|__tests__\/AutorizacoesStep\.test\.tsx)|src\/features\/explicacao\/components\/__tests__\/ExplicacaoCandidatoPage\.test\.tsx)$
```

**A emenda é necessária e específica.** Aplicado sobre `origin/main..HEAD`, o script ORIGINAL imprime `[original] commits=20 fora=["fix(44-16): canal de privacidade passa a rh@ …","test(44-16): canal de privacidade preso a caixa real (rh@) …"]` e «COMMIT FORA DO CONJUNTO AUTORIZADO». Ele reprova exatamente os dois commits de código do ajuste e mais nada. O script emendado imprime `[emendado] commits=20 fora=[]`.

**Para o Task 3 (continuação):** os DOIS scripts de conjunto do Task 3 têm de usar a regex emendada:

- o do item 1, sobre `origin/main..HEAD`;
- o do verify, sobre `0fde284f..origin/main`.

Com a regex original, eles reprovam um push autorizado. O BD-15 não muda: o diff de allowlist, YAML, catálogo, `docs/compliance/sql` e `supabase/functions` continua tendo de sair vazio, e saiu (0 caminhos em `0fde284f..HEAD`).

### F · Task 1 de novo, sobre a árvore exata da rodada 2

Os dois comandos rodaram com `bash`, a partir do scratch `/private/tmp/claude-501/…/scratchpad/p4416aj/{g1,g2}`, sobre o HEAD `1031e409`. Esse HEAD era o mesmo antes e depois de cada comando.

**Primeiro comando, emendado só na regex de arquivos** (das 2026-10-07T01:04:20Z às 01:04:43Z) → «arvore aprovada».

- `git fetch`: `HEAD..origin/main` = **0**, `origin/main` = `0fde284f`, `origin/main..HEAD` = 20.
- Diff BD-15 (allowlist, YAML, catálogo, SQL, `supabase/functions`): **vazio**.
- Conjunto: `[emendado] commits=20 fora=[]`.
- Vitest, relatório JSON: **2449 testes** e **2 falhas**, as duas pré-existentes de `__tests__/promessasComExecutor.test.ts`:
  - «deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…»
  - «fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos»

  Os 2449 são os 2444 da rodada 1 mais os 4 casos (cp1..cp4) e o (g).
- `deno test supabase/functions/exportar-meus-dados/` → `ok | 21 passed | 0 failed`.
- `tsc rodou: rc=2 error_TS=89`.
- `check:export-allowlist` → OK (sincronia com as três fontes).
- Smoke limpo contra PROD, só leitura:
  - a primeira linha do scratch é `SET TRANSACTION READ ONLY;`;
  - o resto é igual ao smoke versionado (`cmp`);
  - `p46apply.cjs run`, 34477 octetos, **sem registro no ledger**.

  Populações lidas antes do booleano: `n_tabelas_vivas` 75 · `n_tabelas_com_disposicao` 75 · `n_tabelas_em_escopo` 32 · `n_colunas_vivas_em_escopo` 451 · `n_pares_com_veredito` 451. Resultado: `"pass": true`, `"n_drift": 0`.

**Segundo comando** (a partir das 2026-10-07T01:04:51Z). É o build local, estendido com o canal:

- `npm run -s build` → exit 0.
- Script `P` → **`frase nova em index-DTxaEkc3.js (1 trecho(s) fixo(s), 51 JS varridos)`**.
- `descrevem o sistema` não aparece em nenhum arquivo de `build/assets/`.
- **Extensão desta rodada:**
  - o valor de `CANAL_PRIVACIDADE_EMAIL`, lido da fonte, é `rh@beautysmile.com.br`;
  - `rh@beautysmile.com.br` está em `build/assets/index-DTxaEkc3.js`, o índice eager, onde a constante é inlinada uma vez;
  - **`lgpd@beautysmile.com.br` não aparece em nenhum arquivo de `build/`**.

**O que está no ar AGORA.** Leitura às 2026-10-07T01:05:08Z, crawl do índice e dos `assets/*.js` até ponto fixo, 49 JS:

- `lgpd@beautysmile.com.br` está em `index-BgK7K5Is.js`;
- `rh@beautysmile.com.br` não está em nenhum JS;
- a frase antiga está em `index-BgK7K5Is.js`.

Ou seja, a checagem nova do pós-publicação **morde hoje**. A EF `exportar-meus-dados` foi medida às 01:05:15Z: `version` 6, ACTIVE, `verify_jwt` true.

### G · Extensão da checagem pós-publicação do Task 3 (a continuação TEM de fazer)

Além do que o verify do Task 3 já exige (trechos fixos de `oQueNaoEsta` num JS publicado e `descrevem o sistema` fora de todos):

- `lgpd@beautysmile.com.br` **ausente de TODO JS publicado** (`test -z "$(grep -l 'lgpd@beautysmile.com.br' "$W"/*.js)"`) e do `index.html`;
- `rh@beautysmile.com.br` **presente em algum JS publicado**.

Hoje as duas checagens reprovam o site publicado (ver a seção F). Depois do push, as duas têm de passar, e a evidência vai para a seção «Publicação».

### H · A frase exata que vai ao ar (rodada 2)

A frase vem do template de `COPY_PEDIR_COPIA.oQueNaoEsta` em HEAD, com `CANAL_PRIVACIDADE_EMAIL` = `rh@beautysmile.com.br` no lugar da interpolação. A única diferença para a rodada 1 é o endereço.

> Não entram os registros técnicos de funcionamento do sistema — por exemplo, o tempo e o custo de processamento das nossas ferramentas de tecnologia, os registros de acesso e o controle de envio de mensagens — nem a configuração do próprio sistema, como o texto das vagas e das perguntas, que é o mesmo para todos os candidatos. Também não entram: os dados que identificam outras pessoas, como quem da equipe agiu no seu processo; as anotações internas da equipe sobre a conservação dos seus dados além do prazo (o motivo e as datas entram); a ficha técnica que o sistema monta ao atender um pedido de exclusão dos seus dados (o andamento e as datas do pedido entram); e o texto em que a equipe justificou a decisão final sobre a sua candidatura (a decisão em si entra). Se quiser saber mais sobre algum desses itens, ou pedir algum deles, escreva para o nosso canal de privacidade: rh@beautysmile.com.br.

### I · Superfícies onde o endereço muda para quem usa o sistema

Todas leem `CANAL_PRIVACIDADE_EMAIL`. O passo do cadastro passou a ler nesta rodada.

| Superfície | Arquivo | O que a pessoa vê |
|---|---|---|
| Página pública `/privacidade`, bloco «direitos» | `transparencia/components/PrivacidadePublicaPage.tsx` (+ `copyTransparencia.ts` `canalHumano`) | o endereço em destaque depois da frase do canal humano |
| Cadastro, passo 4 «Autorizações» | `cadastro/components/steps/AutorizacoesStep.tsx` | «Para correção e portabilidade, escreva para o nosso canal de privacidade: **rh@…**», com link `mailto:` |
| `/candidato/privacidade`, conta sem registro de autorizações | `privacidade/components/AutorizacoesLista.tsx` (`COPY_SEM_REGISTRO.canal`) | «Para registrar suas escolhas, escreva para o nosso canal de privacidade: rh@….» |
| `/candidato/privacidade`, guarda do currículo | `privacidade/components/GuardaCurriculoBloco.tsx` (`notaRevogacao`) | «… Para retirar só esta autorização, escreva para o nosso canal de privacidade: rh@….» |
| `/candidato/privacidade`, pedir cópia: erro e limite de 24 h | `privacidade/services/exportacaoService.ts` (`erroCorpo`, `COPY_COOLDOWN.corpo`) | o fim das duas mensagens |
| `/candidato/privacidade`, pedir cópia: «O que não está na cópia» (tela, `.html` e `.json`) | `exportacaoService.ts` (`oQueNaoEsta`) | a frase da seção H |
| `/candidato/privacidade`, apagar meus dados: erro de registro e de cancelamento | `privacidade/services/exclusaoService.ts` (`erroCorpo`, `cancelarErroCorpo`, `cancelarErroCorpoSemData`) | o fim das três mensagens |
| Explicação da decisão automática, sem revisão a pedir | `explicacao/components/ExplicacaoCandidatoPage.tsx` | link `mailto:` com o endereço |

**Não muda:** e-mails das EFs. O `REPLY_TO` já era `rh@`, e os corpos não citam endereço (D-07).

### J · O que NÃO sobe

- **Allowlist:** nenhuma mudança, segue na 1.4.0.
- **EFs:** nenhuma, `exportar-meus-dados` segue na v6.
- **Banco:** nenhuma escrita.
- **Mudanças alheias:** `.planning/ui-reviews/.gitignore` (M), `docs/specs/DRAFT-banco-sjt-marketing.md` (M) e `docs/vagas/` (??).
- **`ErrorBoundary`:** o `mailto:suporte@` continua como está (`deferred-items.md`).
