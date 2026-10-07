---
phase: 44-exporta-o-acesso
plan: 22
status: in-progress
plan_head_before: 8f3372fba00154dc6445a3e5293485f6a8249e9a
---

# Phase 44 Plan 22: publicação do CR-01-bis — Summary (PARCIAL: Tasks 1–3 feitos, CR-01-bis publicado; falta o Task 4, o U1 do operador)

GATES_SHA: 8f3372fba00154dc6445a3e5293485f6a8249e9a

## Antes de publicar (Task 1)

revisao 44-21: critical=0 sobre a arvore que sobe (09168e228ac413087f185e93dcd0911a4a21cba0); REQUIREMENTS.md intocado

Os dois `<automated>` do Task 1 rodaram LITERAIS. Foram extraídos do `44-22-PLAN.md` por `sed` (linhas 204 e 206, sem transcrição à mão), salvos em script e executados com `bash`, porque o shell da sessão é zsh. A única troca no texto foi `S=$(mktemp -d)` → o scratch da sessão (`/private/tmp/claude-501/…/scratchpad/p4422/{g1,g2}`), fora do repositório, para que o relatório do Vitest e a saída do smoke pudessem ser lidos aqui. É a mesma troca do 44-15 e do 44-16.

Os dois rodaram sobre o HEAD `8f3372fb` (o commit de metadados do 44-21). HEAD era o mesmo antes e depois de cada um, e os dois imprimiram a linha final com exit 0:

- Primeiro comando: das 2026-10-07T13:06:35Z às 13:07:09Z → «arvore aprovada».
- Segundo comando: das 2026-10-07T13:07:14Z às 13:07:23Z → «chunk local: …».

### 1 · Portão da revisão independente (44-21)

- `44-REVIEW-pos-CR01bis.md` está em HEAD (`git cat-file -e` 0).
- Frontmatter: `critical: 0`, `warning: 6`, `info: 4`, `total: 10`, `diff_base: dedca1fb`, `diff_head: 09168e228ac413087f185e93dcd0911a4a21cba0`.
- `git diff --quiet 09168e22 HEAD -- . ':(exclude).planning'` → 0: a árvore que sobe, fora de `.planning/`, é byte a byte a revisada. Entre `09168e22` e `8f3372fb` só entraram os três commits `docs(44-21)`, todos em `.planning/`.
- `git diff --quiet dedca1fb -- .planning/REQUIREMENTS.md` → 0.

### 2 · Árvore exata: janela, conjunto de commits, YAML/catálogo, suíte, Deno, `tsc`, allowlist, smoke

- `git fetch` feito. `HEAD..origin/main` = **0**: nenhuma janela concorrente publicou. `origin/main` = `b14559ea`.
- Conferência do conjunto: **`commits=26 fora=[]`**.
- **`yaml e catalogo sem efeito de runtime`**: o YAML de HEAD é igual ao de `origin/main` por `js-yaml`, e o catálogo de HEAD é igual ao de `origin/main` menos o bloco `colunas_fora_do_escopo`.
- Vitest, relatório JSON: 221 arquivos e **2461 testes**, com 2459 passando e **2 falhas**. As duas estão em `__tests__/promessasComExecutor.test.ts` e são as pré-existentes registradas em `deferred-items.md`:
  - «deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…»
  - «fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos»

  Fora delas, nenhuma falha. 2461 ≥ 2449 (baseline do 44-16); a diferença vem dos casos acrescentados por 44-17..44-20.
- `deno test --allow-all supabase/functions/exportar-meus-dados/` → `ok | 21 passed | 0 failed`.
- **`tsc rodou: rc=2 error_TS=89`**. O par é coerente e fica dentro do limite de 89.
- `check:export-allowlist` → `OK: docs/compliance/export-allowlist.json e supabase/functions/_shared/exportAllowlist.ts estão em sincronia com as três fontes.`
- Smoke limpo contra PROD, só leitura:
  - a primeira linha do scratch é `SET TRANSACTION READ ONLY;`;
  - `tail -n +2` é igual ao smoke versionado (`cmp`);
  - `node p46apply.cjs run`, 34477 octetos, **sem registro no ledger**.

  Populações lidas antes do booleano: `n_tabelas_vivas` 75 · `n_tabelas_com_disposicao` 75 · `n_tabelas_em_escopo` 32 · `n_colunas_vivas_em_escopo` 451 · `n_pares_com_veredito` 451. Resultado:
  ```json
  {"smoke":"p44_export_drift","pass":true,"n_tabelas_vivas":75,"n_tabelas_com_disposicao":75,"n_tabelas_em_escopo":32,"n_colunas_vivas_em_escopo":451,"n_pares_com_veredito":451,"n_drift":0}
  ```
  As populações são idênticas às do 44-16.

### 3 · Build local: as duas frases no chunk certo, nenhum trecho antigo

- `npm run -s build` → exit 0.
- Script `P` (trechos fixos ≥ 20 caracteres dos templates `oQueNaoEsta` e `naoEstaVersaoDivergente` de HEAD, derivados do serviço na execução):
  **`chunk local: oQueNaoEsta em index-7NrDustL.js · naoEstaVersaoDivergente em index-7NrDustL.js · 51 JS varridos; trechos antigos ausentes; canal presente`**
- O chunk é o índice eager, o mesmo lugar onde a frase do CR-01 mora hoje no ar. O publicado pode ter outro hash.
- Os trechos antigos (a oração da igualdade entre candidatos, o segundo ramo do convite, o trecho antigo do CR-01 e o endereço morto do canal), montados em runtime pelo script, não estão em nenhum `.js`/`.html` de `build/assets/`. O canal `rh@beautysmile.com.br` está nos JS.

### 4 · O que está no ar AGORA (leitura, antes de qualquer push)

Crawl de `https://rh.beautysmile.com.br/` às 2026-10-07T13:07:46Z (com `?cb=` e `Cache-Control: no-cache`), índice e todo `assets/*.js` referenciado até ponto fixo: **49 JS**.

- O `index.html` referencia `assets/index-DTxaEkc3.js` (o publicado pelo 44-16).
- O script `P` sobre o publicado **reprova hoje**: `FRASE AUSENTE de 49 JS: oQueNaoEsta` (exit 1). A checagem pós-publicação morde antes do push.
- A oração da igualdade entre candidatos está em `index-DTxaEkc3.js`, isto é, a frase do CR-01-bis segue no ar.
- EF `exportar-meus-dados` pela Management API: `version` 6, `status` ACTIVE, `verify_jwt` true. `gh auth status` → 0.

### 5 · As DUAS frases exatas que vão ao ar

Extraídas dos templates literais de `src/features/privacidade/services/exportacaoService.ts` em HEAD, com `CANAL_PRIVACIDADE_EMAIL` (`rh@beautysmile.com.br`, de `canalPrivacidade.ts`) no lugar da única interpolação de cada uma.

**(a) `COPY_PEDIR_COPIA.oQueNaoEsta`** — o que o titular lê na tela (`PedirCopiaBloco`), no `.html` e no `.json` (chave `o_que_nao_esta_nesta_copia`) quando a versão da lista da EF é igual à do site (hoje as duas são 1.4.0):

> Não entram os registros técnicos de funcionamento do sistema — por exemplo, o tempo e o custo de processamento das nossas ferramentas de tecnologia, os registros de acesso e o controle de envio de mensagens — nem a configuração do próprio sistema, como o texto das vagas e das perguntas. Também não entram: o roteiro que a equipe monta para conduzir a sua entrevista; os dados que identificam outras pessoas, como quem da equipe agiu no seu processo; as anotações internas da equipe sobre a conservação dos seus dados além do prazo (o motivo e as datas entram); a ficha técnica que o sistema monta ao atender um pedido de exclusão dos seus dados (o andamento e as datas do pedido entram); e o texto em que a equipe justificou a decisão final sobre a sua candidatura (a decisão em si entra). Se quiser saber mais sobre algum desses itens, escreva para o nosso canal de privacidade: rh@beautysmile.com.br.

**(b) `COPY_ARQUIVO.naoEstaVersaoDivergente`** — a frase NEUTRA que só os dois arquivos carregam no lugar da (a) quando a versão da lista da resposta da EF difere da do site (vazia ou ausente inclusive; WR-03, BD-22). Com EF e front na 1.4.0, ninguém a vê hoje:

> Esta cópia foi gerada durante uma atualização do sistema, e por isso não conseguimos descrever aqui, com segurança, o que ficou de fora dela. Para saber o que não está nesta cópia, escreva para o nosso canal de privacidade: rh@beautysmile.com.br.

### 6 · `git log --oneline origin/main..HEAD` no `GATES_SHA` (26 commits, todos dentro do conjunto autorizado)

```
8f3372fb docs(44-21): complete revisao adversarial independente pos-CR-01-bis plan
8501d8c3 docs(44-21): sondas do revisor nos sete portoes novos (todas mordem) e confronto com os SUMMARY — WR-06, total 0/6/4
eacf659e docs(44-21): revisao adversarial independente do diff dedca1fb..09168e22 — quatro eixos, 0 critical, 5 warning, 4 info
09168e22 docs(44-20): complete os arquivos nao prometem o que nao carregam plan
6b51335d test(44-20): parenteses «… entra(m)» da frase presos as colunas exportadas (WR-02)
183dc181 feat(44-20): fronteira dos arquivos falha fechada em versao divergente (WR-03, BD-22)
514b35ce docs(44-19): complete portoes do smoke e do canal plan
64139d5c test(44-19): canal vigiado onde pode voltar e por fronteira (WR-06); docblock sem a forma do endereco morto (IN-02)
2bfdeb0c test(44-19): bloco DO $gate$ preso a BLOCO_GATE_CANONICO (WR-05); M21-M24 vistas verdes antes e mordendo depois
085e3b44 test(44-19): (k) prende o corpo das CTEs de VALUES a saida real do gerador (WR-04); M19/M20 vistas verdes antes e mordendo depois
ca1fea47 docs(44-18): complete CR-01-bis a classe inteira e vista plan
fde8b4eb test(44-18): (cr5b) o portao de classe morde em sete direcoes — cada controle reprova com o nome da tabela
09f9d60d test(44-18): portao de classe ve a classe inteira — colunas_fora_do_escopo medido (so leitura), naoMedidas fail-closed, razao por tabela no YAML (BD-18)
e42dbcd3 docs(44-17): complete CR-01-bis frase + nucleo do portao (cr5) plan
c1c42fa0 test(44-17): (cr3) controles 2 e 4 escolhidos pelos dados derivados (IN-01); portao por tabela visto mordendo a frase real
6562031e feat(44-17): CR-01-bis — frase nomeia o roteiro da entrevista e o convite so oferece saber mais; portao (cr5) por tabela
dee65a6c docs(44): STATE — inicio da execucao do gap closure (44-17..44-22)
3ed321b6 docs(44): STATE — gap closure planejada (44-17..44-22, checker PASSED iteracao 3), proximo /gsd-execute-phase 44 --gaps-only
c7ea7b21 docs(44): revisao 2 dos planos do CR-01-bis pelo checker — (…)
21174271 docs(44): revisao dos planos do CR-01-bis pelo checker — (…)
de086abe docs(44): planos de fechamento do CR-01-bis (44-17..44-20) — (…)
dedca1fb docs(44): STATE — gaps_found pos-publicacao (CR-01-bis), proximo /gsd-plan-phase 44 --gaps
a06b6e06 docs(44): verificacao pos-publicacao do CR-01 — gaps_found 6/7 (…)
92536519 docs(44): preserva a reverificacao pos-G5 (gaps_found, CR-01) antes da verificacao pos-publicacao
6837b86c docs(44): revisao pos-CR-01 — 1 blocker (…), 6 warnings, 2 infos; disposicao todos open
a9b45bb8 docs(44): preserva a re-revisao do G5 e sua disposicao (CR-01 fixed) antes da revisao pos-CR-01
```

Fora de `.planning/`, o conjunto toca exatamente os sete arquivos autorizados (`git diff --stat origin/main HEAD -- . ':(exclude).planning'`: 7 arquivos, 4750 inserções, 60 remoções; o bloco medido do catálogo é 3794 delas):

- `src/features/privacidade/services/exportacaoService.ts` (61) e o teste dele (606);
- `src/features/privacidade/constants/canalPrivacidade.ts` (8) e o teste dele (119);
- `docs/compliance/export-scope-rules.yaml` (9, só comentário);
- `docs/compliance/catalogo-vivo-44.json` (3794, só o bloco `colunas_fora_do_escopo`, que o gerador não lê);
- `docs/compliance/__tests__/exportAllowlist.test.ts` (213).

Este SUMMARY parcial entra como o 27º commit (`docs(44-22)`, só `.planning/`).

### 7 · O que NÃO sobe

- **Allowlist:** nenhuma mudança. Segue na 1.4.0 (`export-allowlist.json` e o espelho da EF intocados).
- **EF:** nenhuma. `exportar-meus-dados` segue na v6.
- **Banco:** nenhuma escrita. O smoke foi só leitura.
- **`supabase/`, `docs/compliance/sql/`, `pii-inventory.yaml`:** intocados (o script de conjunto os reprovaria).
- **Mudanças alheias, não commitadas e fora de `origin/main..HEAD`:** `.planning/ui-reviews/.gitignore` (M), `docs/specs/DRAFT-banco-sjt-marketing.md` (M) e `docs/vagas/` (??). Elas não vão em push nenhum.

## Aprovação (Task 2)

Resposta do operador ao checkpoint:decision, verbatim (repassada pelo orquestrador):

> publicar

O operador **não deu disposição** para nenhum achado. Por isso valem os padrões do plano:

- os 10 achados do `44-REVIEW-pos-CR01bis.md` (WR-01..WR-06, IN-01..IN-04) ficam `open`;
- as 9 linhas do `44-REVIEW-DISPOSITION.md` recebem a disposição padrão do Task 3, item 3.

Nenhuma outra decisão do operador foi inferida.

## Publicação (Task 3)

**Resultado:** publicado. O push `b14559ea..dddf7ac9` foi aceito às 2026-10-07T20:51:34Z, na 6ª tentativa. Os detalhes estão na subseção «Retomada» abaixo. As subseções seguintes, até «O que NÃO foi feito, de propósito», são o registro histórico do bloqueio. Ficam como foram escritas às 15:11Z.

### Bloqueio no push (histórico, 15:09–15:11Z): o GitHub recusou a atualização de `main` com «Internal Server Error»

Às 15:11Z, nada tinha subido. `origin/main` segue em `b14559ea`, e o front publicado segue com `index-DTxaEkc3.js`, ou seja, com a frase do CR-01-bis. As disposições, o STATE e o ROADMAP **não** foram escriturados, porque o Task 3 os escritura depois do push e do verify do publicado.

#### Precondições do Task 3, todas verdes antes de cada tentativa

- **(a)** A resposta do operador foi «publicar».
- **(b)** `GATES_SHA..HEAD` (`8f3372fb..441d8867`) não toca nada fora de `.planning/`.
- **(c)** Depois de `git fetch`, `HEAD..origin/main` = 0.
- **(d)** `gh auth status` deu 0, e o token do Keychain está presente.
- **(e)** `git diff --quiet dedca1fb -- .planning/REQUIREMENTS.md` deu 0.

A conferência do conjunto (item 1) foi extraída LITERAL da linha 204 do plano, por script, sem transcrição. Rodou antes de cada tentativa e deu sempre `commits=27 fora=[]` e `REQUIREMENTS.md intocado`. O HEAD era `441d8867` em todas as tentativas, e fora de `.planning/` o diff contra `origin/main` tinha exatamente os sete arquivos autorizados.

#### Tentativas de push (todas recusadas no servidor, na atualização da ref)

| # | Início (UTC) | Transporte | Resultado | Request ID |
|---|---|---|---|---|
| 1 | 2026-10-07T15:09:47Z | SSH `git push origin main` | `! [remote rejected] main -> main (Internal Server Error)` | `1B1C:2F4234:1A152:5EDB1:6AC660BB` |
| 2 | 2026-10-07T15:10:04Z | SSH, idem | idem | `1B2D:204662:1A1E6:5F00B:6AC660CC` |
| 3 | 2026-10-07T15:10:27Z | SSH, `--verbose` | idem | `1B4E:3C9AAE:1A032:5F05F:6AC660E3` |
| 4 | 2026-10-07T15:10:56Z | HTTPS (`gh auth git-credential` só naquele comando, sem mudar config) | idem | `1B6E:370923:248DE5:2C78B1:6AC66101` |

Depois de cada tentativa: `git fetch` e `git ls-remote` mostram `origin/main` = `b14559ea`. Nada foi aceito pela metade.

#### Diagnóstico feito (todo só leitura)

- `githubstatus.com` → «All Systems Operational», nenhum incidente aberto.
- `ssh -T git@github.com` → autenticado como `fercosnt`. `permissions.push` = true.
- Repositório: não está arquivado nem desabilitado.
  - Rulesets: `[]`.
  - Branch protection em `main`: inexistente (404).
  - Webhooks: 0.
  - Secret scanning e push protection: desabilitados.
- A carga é pequena:
  - 27 commits;
  - o maior corpo de commit tem 1983 octetos;
  - o maior blob é o `STATE.md`, com cerca de 233 KB.

A falha não depende do transporte e não vem de nenhuma regra configurada no repositório. Fica do lado do GitHub.

#### O que NÃO foi feito, de propósito

Não houve push parcial de um prefixo do conjunto, nem push para outra branch, nem rebase, nem mudança de remote ou de config. O operador aprovou UM conjunto de 27 commits num push. Publicar um prefixo, ou abrir uma branch remota (a Vercel geraria um preview), muda a forma da publicação, e isso não foi aprovado. Com 4 tentativas, o limite de tentativas de conserto do Task 3 foi atingido: o task foi devolvido ao orquestrador como checkpoint.

**Ao retomar:** o conjunto passa a ter **28** commits, porque este registro entra como `docs(44-22)`, só em `.planning/`, dentro do conjunto autorizado. Nesse momento, repetir as precondições (a)–(e) e a conferência do item 1 antes de empurrar. A hora UTC do push que der certo é o `T0` do U1.

### Retomada: a 5ª recusa, a sonda de tag e o push que passou

#### O que aconteceu entre o bloqueio e a retomada (relatado pelo orquestrador)

| # | Hora (UTC) | Quem | O quê | Resultado |
|---|---|---|---|---|
| 5 | 2026-10-07T15:12:28Z | orquestrador | `git push origin main` (o mesmo conjunto) | `! [remote rejected] main -> main (Internal Server Error)`, Request ID `1A05:3C33FE:1A06B:5FC89:6AC6615A`. Nada aceito |
| — | 2026-10-07T20:47Z | orquestrador, com autorização do operador | **sonda de diagnóstico**: push de uma tag descartável apontando para `b14559ea`, que não traz objeto novo | **aceita**. A tag foi apagada em seguida, e a ausência no remoto foi conferida. Conclusão: o repositório aceita escrita, e o 500 de mais de 5 h antes pode ter sido transitório do lado do GitHub |
| — | logo depois | operador | resposta verbatim a «posso tentar o push?»: **«sim»** | autoriza UMA nova tentativa do push aprovado de `main` (os 27 commits aprovados + o `dddf7ac9`, só `.planning/`) |

#### Precondições e conjunto, repetidos antes do push (2026-10-07T20:51:24Z, HEAD `dddf7ac958a97b737af659222e215fa198d9b6b8`)

- **(a)** A resposta ao Task 2 foi «publicar», e a autorização desta tentativa foi «sim».
- **(b)** Com `G` = `8f3372fb`, `git diff --name-only G..HEAD` fora de `.planning/` → vazio.
- **(c)** `git fetch`, depois `HEAD..origin/main` = **0** (`origin/main` = `b14559ea`).
- **(d)** `gh auth status` → 0; o token do Keychain está presente → 0.
- **(e)** `git diff --quiet dedca1fb -- .planning/REQUIREMENTS.md` → 0.
- Conferência do conjunto, re-extraída LITERAL da linha 204 do plano (byte a byte igual à extração anterior, conferido por `diff`): **`commits=28 fora=[]`**, `REQUIREMENTS.md intocado`.
- Fora de `.planning/`, `git diff --name-only origin/main HEAD` → exatamente os sete arquivos autorizados.

#### 6ª tentativa: aceita

| # | Início (UTC) | Fim (UTC) | Transporte | Resultado |
|---|---|---|---|---|
| 6 | 2026-10-07T20:51:31Z | **2026-10-07T20:51:34Z** | SSH `git push origin main`, a forma aprovada, sem variação | `b14559ea..dddf7ac9  main -> main` (rc 0) |

- **Sha empurrado:** `dddf7ac958a97b737af659222e215fa198d9b6b8`. Depois do push, `git fetch` e `git ls-remote` mostram `origin/main` = `dddf7ac9`.
- **`T0` do U1 = `2026-10-07T20:51:34Z`**, o instante em que o push foi confirmado.

#### Deploy da Vercel

`gh api repos/fercosnt/SistemaRecrutamento/commits/dddf7ac9…/statuses`:

- `pending` «Vercel is deploying your app» às 20:51:38Z;
- **`success` «Deployment has completed» às 20:52:08Z**, cerca de 30 s depois (deployment `4B7CULNUtSgjo6LQzjfzYp4zYTsg`).

#### Verify do Task 3 sobre o publicado (primeira passada, 20:52:26Z–20:52:40Z)

O `<automated>` da linha 308 do plano foi extraído LITERAL por script. A única troca foi `D=$(mktemp -d)` → o scratch da sessão (`…/scratchpad/p4422/p1`), e ele rodou com `bash`. Na ordem em que o comando checa:

- `git log --oneline origin/main..HEAD` → vazio.
- REQUIREMENTS.md intocado.
- **`commits publicados=28 fora=[]`**: todo commit de `b14559ea..origin/main` está dentro do conjunto autorizado.
- EF `exportar-meus-dados` pela Management API: **`version` 6, `status` ACTIVE, `verify_jwt` true**. Nenhum redeploy.
- Crawl de `https://rh.beautysmile.com.br/?cb=…` com `Cache-Control: no-cache`, índice e todo `assets/*.js` referenciado até ponto fixo: `index.html` + **49 JS**. O `index.html` agora referencia **`assets/index-7NrDustL.js`**, o mesmo hash do build local do Task 1. Antes do push era `index-DTxaEkc3.js`.
- Script `P` sobre o publicado, chunks lazy inclusive:
  **`oQueNaoEsta em index-7NrDustL.js · naoEstaVersaoDivergente em index-7NrDustL.js · 49 JS varridos; trechos antigos ausentes; canal presente`**

  A oração da igualdade entre candidatos, o segundo ramo do convite, o trecho antigo do CR-01 e o endereço morto do canal não estão em nenhum JS publicado nem no `index.html`.
- Em seguida, o script da disposição imprimiu `linhas=9 fora=["CR-01:nao-fixed",…,"IN-02:nao-fixed"]` e **`DISPOSICAO FORA DO DECIDIDO`** (exit 1). Era o esperado nesse instante: as 9 linhas ainda estavam `open`. O portão da escrituração foi visto mordendo antes de ela existir.

#### Escrituração (Task 3, itens 3–6)

- **`44-REVIEW-DISPOSITION.md`** (Edits de escopo mínimo): as 9 linhas passam a `fixed` com sha.
  - CR-01 → `6562031e` (44-17 Task 1) · publicado em `index-7NrDustL.js` (push `dddf7ac9`)
  - WR-01 → `6562031e` (44-17 Task 1, BD-19)
  - WR-02 → `6b51335d` (44-20 Task 2)
  - WR-03 → `183dc181` (44-20 Task 1)
  - WR-04 → `085e3b44` (44-19 Task 1)
  - WR-05 → `2bfdeb0c` (44-19 Task 2)
  - WR-06 → `64139d5c` (44-19 Task 3; `templates_email` medido: 0)
  - IN-01 → `c1c42fa0` (44-17 Task 2)
  - IN-02 → `64139d5c` (44-19 Task 3)

  Os shas são os dos SUMMARY de 44-17, 44-19 e 44-20, e cada um existe no repositório. Também entraram a linha «Atualizada em 2026-10-07 pelo 44-22» e, abaixo da tabela, uma nota de referência cruzada do WR-03 para os WR-01/WR-06 da revisão do 44-21. A nota NÃO muda o valor da célula.
- **`44-REVIEW-DISPOSITION-pos-CR01bis.md`** (NOVO): 10 linhas, uma por cabeçalho `### (WR|IN)-NN:` do `44-REVIEW-pos-CR01bis.md`, na ordem do arquivo (WR-01..WR-06, IN-01..IN-04). Todas estão **`open`**, porque o operador não deu disposição. As linhas foram geradas por script a partir dos cabeçalhos, sem transcrição. A única alteração é `|` → `/` dentro da célula do WR-04 («entra/entram»), declarada no próprio arquivo.
- **`STATE.md`**, à mão:
  - mudaram `stopped_at`, `last_updated`, `last_activity_desc`, `Last session:` e `Stopped at:`;
  - entrou uma linha de decisão `[Phase 44]: 44-22`;
  - `progress` não mudou (144/147), porque o 44-22 só fica completo depois do U1;
  - a conferência de corpo (forma «antes de commitar») não imprimiu nada.
- **`ROADMAP.md`:** sem mudança neste commit. As caixas de 44-17..44-21 já estavam `[x]`. A do 44-22 e o `21/22` da linha de progresso da Phase 44 só viram depois do U1 (ver «Desvios»). A caixa `- [ ] **Phase 44` está intocada.

#### Desvios deste task

- **[Escopo — escrituração] A caixa do 44-22 e o 22/22 não foram marcados no Task 3.** O item 6 pede as caixas 44-17..44-22 «se ainda não estiverem». O 44-22 só termina com o U1 (Task 4), e o `STATE.md` segue com 144/147. Marcar a caixa agora deixaria o ROADMAP afirmando um plano completo que ainda depende do operador. O commit pós-U1 vira a caixa do 44-22 e o `21/22` → `22/22`, junto com o `progress` do STATE. A guarda «ROADMAP: só caixas desta rodada» aceita os dois estados.

#### Pendente neste task (vai no segundo push, só `.planning/`)

- Commit de escrituração `docs(44-22)`: as duas disposições, este SUMMARY e o STATE.
- Repetir a conferência do item 1, fazer o segundo push e rodar o verify da linha 308 até a linha final. O resultado desse verify vai para o SUMMARY no commit pós-U1, que é o terceiro push, também só `.planning/` e coberto pela resposta «publicar».
