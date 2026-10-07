---
phase: 44-exporta-o-acesso
plan: 16
status: in-progress
---

# Phase 44 Plan 16: publicação do CR-01 — Summary (PARCIAL: Task 1; o Task 2 é o checkpoint do operador e a publicação é o Task 3)

## Antes de publicar (Task 1)

GATES_SHA: 32eb9371dd54d818de79c90eb67291321ee58360

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

### 4 · A frase exata que vai ao ar

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
