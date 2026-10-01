---
phase: 49-consertos-da-jornada-bloco-2
reviewed: 2026-10-01T04:20:55Z
depth: deep
diff_base: 26c7be44
scope: re-revisão adversarial da revisão do plano 49-43 (commit 70c2f09e — 49-43-PLAN.md + 1 linha do ROADMAP), que fecha o CR-03 do 49-REVIEW-GAPS-4; o plano é o artefato que executa as escritas em PROD (migration pela Management API, 8 deploys de EF, git push → Vercel). Código sem mudança desde o -4 (git diff 26c7be44..HEAD -- . ':!.planning' vazio, conferido)
carried_from: 49-REVIEW-GAPS-4 (WR-01, WR-02, WR-03, WR-07, IN-01..IN-05, IN-09..IN-11 — carried, not in fix scope)
files_reviewed: 15
files_reviewed_list:
  - .planning/phases/49-consertos-da-jornada-bloco-2/49-43-PLAN.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
  - efdeploy.cjs
  - p46apply.cjs
  - supabase/config.toml
  - supabase/functions/consolidar-decisao-final/index.ts
  - src/features/decisao/schemas/consolidacaoSchema.ts
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
  - src/features/decisao/hooks/useConsolidacao.ts
  - src/App.tsx
  - vercel.json
  - supabase/migrations/20260930000001_p49_38_agregacao_sem_evento_de_sinal.sql
  - src/features/admin/ai-logs/services/aiLogsService.ts
  - src/features/avaliacao/services/scoresRhService.ts
findings:
  critical: 1
  warning: 8
  info: 11
  total: 20
status: issues_found
---

# Phase 49: Code Review Report — Revisão do plano 49-43 (fecho do CR-03)

**Reviewed:** 2026-10-01T04:20:55Z
**Depth:** deep
**Files Reviewed:** 15 (o plano revisado; os scripts que ele executa; a EF, o schema e o componente que ele publica; o que decide se um front velho sobrevive)
**Status:** issues_found

## Summary

**Escopo.** `git diff 26c7be44..HEAD -- . ':!.planning'` sai vazio: o código não mudou desde o -4. O único commit, `70c2f09e`, toca o `49-43-PLAN.md` e uma linha do `ROADMAP.md`. Revisei o plano como o artefato que escreve em PROD. Parti da hipótese da memória «re-revisar o conserto antes do apply»: quatro rodadas seguidas introduziram crítico novo.

**O CR-03 está fechado, item por item.**

| Item do CR-03 | Onde está no plano |
|---|---|
| `consolidar-decisao-final` em toda enumeração, com `verify_jwt=true` | deploy (B), laço do `<verify>` `:334`, prova de bundle `:342`, tabela de escritas `:479` |
| Ordem segura | `:214-217` |
| Marcador exclusivo `decisao-sjt-sinal-revisao` com prova de mordida | `:284-300`, `:344-347` |
| Correção anexada ao STATE, sem reescrever a linha 1220 | `:379-386`, `:412` |
| Precondição reescrita | `:205`, `:242-246` |

**Achado novo: 1 crítico (CR-04).** O CR-04 não está em nenhum dos portões do CR-03, e sim no que fica entre eles:
- a publicação agora se espalha no tempo: B, depois push e espera do `READY` da Vercel, depois D e E;
- isso acontece num checkout compartilhado com outras janelas que escrevem nele;
- a única conferência de «disco = HEAD revisado» roda uma vez, no passo 0;
- as provas byte a byte comparam o bundle com o **disco**, e não com o commit revisado.

### O que rodei

Tudo local ou GET só-leitura em PROD. Nenhuma escrita, deploy ou push; nenhuma fonte editada.

| Conferência | Resultado |
|---|---|
| Precondição de testes (`:205`): `find … \| xargs deno test --allow-all` | `ok \| 1009 passed \| 0 failed` |
| Precondição de testes (`:205`): `CI=true npx vitest run` | 218 files, 2377 passed |
| `ALHEIO` do passo 0, literal do `:244` | vazio. Os 30 commits no recorte são exatamente os `test`/`feat` 49-36..49-42 e os 10 `fix(49-43)` citados nos `-FIX.md` |
| `node efdeploy.cjs <slug> --dry-run` nas 8 (`return` antes de qualquer rede, `efdeploy.cjs:129`) | `consolidar` = 3 arquivos (`../src/features/decisao/schemas/consolidacaoSchema.ts`, `functions/_shared/sinal-revisao.ts`, `functions/consolidar-decisao-final/index.ts`), `verify_jwt=true`; as 7 = 12/12/14/15/14/10/14, como o plano diz |
| Varredura pela FORMA: toda EF cujo fechamento contém um `_shared` mudado desde `d6cb0159` | exatamente as 8 (7 de IA + `consolidar`). O escopo está certo hoje (ver WR-09) |
| `verify_jwt`: `efdeploy.cjs:45-68` × `supabase/config.toml` × vivo | consistentes nas 8 |
| GET só-leitura das 8 EFs | `consolidar` v9 (2026-07-12, `entrypoint_path` do checkout antigo), as 7 em v33/v23/v17/v20/v31/v31/v23; os 5 marcadores com **0** ocorrências nos 8 bundles vivos. Os portões de marcador (`:340`, `:342`) mordem |
| Comparador do portão B (`:342`) sobre o bundle vivo da v9 | `FECHAMENTO DIVERGE: ["functions/consolidar-decisao-final/index.ts","src/features/decisao/schemas/consolidacaoSchema.ts"]`. Morde |
| `sourcesContent` da v9 | byte-igual a `b875352c` nos dois arquivos (md5 `16475e3f…` e `c1dcd1ba…`). O que B publica além do vivo, fora comentários, é só o CR-02 |
| Schema de request | não mudou desde a v9 (diff: comentário + o campo opcional de resposta) |
| Escritas da `consolidar` | nenhuma (`insert`/`update`/`upsert`/`rpc` = 0). A ordem B → C é segura |
| Módulos que diferem do disco nos 7 bundles vivos | exatamente a lista esperada no `:313-317` (os 4 `_shared` nas 7 + a `index.ts` das 5 editadas) |
| Prova de mordida do front, no scratchpad (sem tocar `build/` do repositório) | `git archive 00557271` + `vite build`: `instrucao_ao_modelo` em `sinal-revisao-QGNE1TfZ.js`, `decisao-sjt-sinal-revisao` **vazio**. HEAD: só `DecisaoFinalPage-C1M7Tmtd.js`, referenciado no índice como `./DecisaoFinalPage-….js`, forma que o crawler segue |
| Constante `MARCADOR_SINAL_SJT` | não exportada e só usada no JSX (`ConsolidacaoDashboard.tsx:75,127`). Sem o bloco do aviso, a string some do bundle |
| Crawler do `:346` em `https://rh.beautysmile.com.br` | `AUSENTE` para `decisao-sjt-sinal-revisao` (51 visitados); controle `proveniencia-ia-badge` `PRESENTE` em `ProvenienciaIABadge-DjVQoZcM.js` |
| Portão da Task 1 (`:189`) | hoje vermelho: o mais recente é o `-4`, com o crítico em 1. `-2`, `-3`, `-4` e o `49-REVIEW-GAPS.md` intactos |
| STATE | o `:412` não está pré-satisfeito (0 «CORREÇÃO DATADA», 0 «WR-07», 0 «1- sim, 2- decidir depois»); a linha 1220 de `26c7be44` existe byte-igual |

### Janelas que conferi e que estão seguras

| Estado | Por que é seguro |
|---|---|
| Depois de A (migration, EFs velhas) | a exclusão só tira `prompt_injection_flagged`, que nenhuma EF viva grava |
| Depois de B (`consolidar` nova, front velho) | a resposta só ganha a chave aditiva; o request é o mesmo |
| Depois de C (front novo, `consolidar` nova, EFs de IA velhas) | o front tolera a ausência (`?? []`); nenhuma mudança de `src/` desde `origin/main` altera corpo de `functions.invoke`/`rpc`; não há linha sinalizada |
| Depois de D | o `avaliar-redacao` velho não grava `instrucao_ao_modelo` |
| Front novo com `consolidar` velha | só ocorreria se B falhasse e o executor seguisse, o que o plano proíbe. Mesmo assim o front não quebra: a chave ausente vira `[]` |

### Atribuição ao operador

- **Correto:** o plano declara que a ordem é do planejador (`:102`, `:214`), sem nenhuma atribuição dela ao operador. «1- sim, 2- decidir depois», «1» e «B» aparecem com data.
- **A decisão (a) de 2026-09-29** (`:95`) confere com o texto do `49-36-PLAN.md:96-107`.
- **Ressalvas** em IN-12 e IN-13.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-04: «Disco = HEAD revisado» só é conferido no passo 0; a publicação se espalha no tempo num checkout compartilhado; as provas byte a byte comparam com o disco e não morderiam código alheio

**File:** `.planning/phases/49-consertos-da-jornada-bloco-2/49-43-PLAN.md`

| Linha | O que diz |
|---|---|
| `:205` e `:242-243` | o único `git status --porcelain -- supabase/functions src` |
| `:217` | D-54, «seguem sem pausa» |
| `:272` | `efdeploy.cjs` lê do disco na hora do deploy B |
| `:294` | push sem enumerar o que sobe |
| `:319-324` | D/E lêem o disco e comparam «byte a byte com o disco» |
| `:342` | o comparador do portão B usa `got[k]!==fs.readFileSync(disk[k],"utf8")` |
| `:360` | «O que está no ar é o disco» |
| `:406-407` | o segundo push, na Task 3 |

`efdeploy.cjs:97,151` (`fs.readFileSync` do working tree no instante do deploy).

**Issue:**
1. **A revisão alongou a janela.** No plano anterior, o push vinha **primeiro** e as EFs logo depois. Agora a ordem é:
   - passo 0 (a única conferência de working tree limpo);
   - A (migration e commit local do inventário);
   - B (`efdeploy` da `consolidar`, lendo o disco);
   - C (build, crawler, push e espera do `READY` da Vercel, que tem um passo «esperar e repetir»);
   - D (seis deploys, um a um, cada um com GET do bundle antes e depois);
   - E (`avaliar-redacao`, lendo o disco).

   Entre o passo 0 e o E passam dezenas de minutos de escritas «sem pausa» (`:217`). Em nenhum ponto depois do 0 o plano confere de novo o working tree nem que `HEAD` é o commit revisado.
2. **O checkout é compartilhado com escritores concorrentes, e isso está medido agora.**
   - `git worktree list` mostra um checkout só.
   - `git status` mostra trabalho de outra janela não commitado: `docs/specs/DRAFT-banco-sjt-marketing.md`, `.planning/ui-reviews/.gitignore`, `docs/vagas/`.
   - A memória «janelas paralelas» registra «várias janelas Claude em paralelo sobre o mesmo repositório». O «só uma janela escreve no repo por vez» é convenção, e o `git status` de hoje mostra que ela não está sendo cumprida.
   - Uma edição dessa outra janela em `supabase/functions/**`, em `src/features/decisao/schemas/consolidacaoSchema.ts` ou num `_shared` entre o passo 0 e B/D/E, mesmo sem commit, é lida pelo `efdeploy.cjs` e **vai para a EF em PROD**.
3. **As provas abençoam isso em vez de pegar.**
   - O comparador do portão B compara o `sourcesContent` publicado com `fs.readFileSync` do disco. A prova das 7 também (`:323`, «comparar byte a byte com o disco»).
   - O disco é a **mesma fonte** que o `efdeploy` leu, então o portão sai verde com código alheio e não revisado. Para esse caso ele não tem como falhar.
   - O SUMMARY registraria «`sourcesContent` 3/3 byte-igual ao disco» e «O que está no ar é o disco». O leitor entende «é o HEAD revisado», e isso seria falso.
   - O push de C não leva a edição não commitada. O resultado seria **EF em PROD ≠ `main`**, com prova verde dizendo o contrário.
4. **O push também não enumera o que sobe** (`:294`, `:406-407`). O `ALHEIO` roda uma vez, no passo 0, e só nos caminhos do fechamento. Um commit da outra janela entre o 0 e o push vai junto:
   - em `src/` fora de `consolidacaoSchema.ts` (front publicado pela Vercel, sem revisão);
   - em `docs/`, que o pedido desta rodada diz que nunca pode ser publicado.

   O mesmo vale para um `git add <caminho> && git commit` com o índice já populado por outra janela: o «commit por pathspec» (`:262`, `:406`) não diz `git commit -- <caminho>`, que é a forma que ignora o resto do índice.

**Por que é crítico:** é o caminho para PROD de código que nenhuma das cinco rodadas de revisão leu, com portões verdes e escrituração afirmando o contrário. É o mesmo desenho do CR-03: a publicação certifica um estado que não é o revisado.
- O gatilho, escritor concorrente no mesmo checkout, está presente hoje.
- O pedido desta rodada exige explicitamente que o trabalho da outra janela nunca seja publicado. Uma EF publicada é pior do que um push, porque não passa pelo git e não aparece em `origin/main..HEAD` (CLAUDE.md, §«Esta via NÃO passa pelo git»).

**Fix (no plano; mecânico):**
```bash
# passo 0 — fixar o commit revisado
REV=$(git rev-parse HEAD)          # registrar no SUMMARY
# antes de CADA escrita (efdeploy B, cada slug de D, E, cada git push, cada commit):
test "$(git rev-parse HEAD)" = "$REV" \
  && test -z "$(git status --porcelain -- supabase/functions src)" \
  && test -z "$(git diff --cached --name-only)" \
  || { echo "DISCO/HEAD MUDOU — PARAR"; exit 1; }
# commits do 49-43: só a forma que ignora o resto do índice
git commit -m "docs(49-43): …" -- docs/compliance/cron-inventory.md
# depois de cada commit do próprio plano: REV=$(git rev-parse HEAD), e conferir que o commit
# novo só toca o pathspec dele:
git show --name-only --format= HEAD
# antes de cada push: enumerar e aceitar só o esperado
git log --format='%h %s' origin/main..HEAD   # cada linha ∈ {os 66 de hoje} ∪ {commits docs(49-43) deste plano}
```
- No comparador do `:342` e na prova das 7, comparar com `git show $REV:<caminho>`, e não com `fs.readFileSync`. O portão passa a morder disco sujo.
- Provar que ele morde: rodar o comparador com um byte acrescentado numa **cópia** do arquivo do disco, que tem de dar `DIFERE`. Rodar com `git show $REV:` sobre o mesmo disco sujo, que tem de dar verde só se o bundle for o `$REV`.
- Como D-54 dispensa pausa, a nova conferência é a parada: vermelho = PARAR. O estado em cada parada já é seguro pela análise do `:219-237`.

## Warnings

### WR-08: O portão da Task 1 não amarra a revisão mais recente ao código em HEAD, e a precondição aceita qualquer `fix(49-43)` citado num `-FIX.md`; juntos, deixam passar uma rodada de conserto sem re-revisão

**File:** `49-43-PLAN.md:189` (portão da Task 1); `:205`, `:244` (o `case "fix(49-43)"*) grep -q "$h" …-FIX.md`)

**Issue:** o cenário é exatamente o da memória («quatro em sequência»):
1. este `-5` (ou um `-N`) sai sem crítico e com warnings;
2. alguém conserta os warnings numa rodada `fix(49-43)` e escreve `49-REVIEW-GAPS-5-FIX.md`;
3. o `ALHEIO` passa, porque os hashes estão citados no `-FIX`;
4. o portão da Task 1 passa, porque o arquivo `-N` mais recente continua com o crítico em zero e ninguém exige um `-N+1` sobre o código novo;
5. a rodada de conserto vai a PROD sem re-revisão.

O must-have `:23` («cada rodada de conserto passou por re-revisão») não tem portão automático.

Dois defeitos menores de forma no mesmo portão:
- o glob `49-REVIEW-GAPS-[0-9].md` não vê o `-10`: com 10 rodadas, o portão leria o `-9`;
- `grep -qE '^  critical: 0$'` casa em qualquer linha do arquivo, não só no frontmatter.

**Fix:** no portão da Task 1, exigir que nenhum arquivo de código tenha mudado depois do commit que escreveu o review mais recente:
```bash
C=$(git log -1 --format=%H -- "$F"); git diff --quiet "$C" HEAD -- . ':!.planning' || { echo "CODIGO DEPOIS DO REVIEW"; exit 1; }
```
Também:
- trocar o glob por `ls … | sort -t- -k4 -n`, ou pelo maior número;
- ler `critical:` só entre os dois `---` do frontmatter (`awk '/^---$/{n++} n==1'`).

### WR-09: O escopo «8 deploys» volta a ser lista literal, sem derivação pela forma na hora da execução, que é a mesma classe do CR-03

**File:** `49-43-PLAN.md:244` (lista dos 8 diretórios); `:308-309`, `:334` (pares `slug:verify_jwt` literais), `:340` (lista das 7)

**Issue:** o CR-03 nasceu porque «as 7 EFs» era fotografia: a `consolidar` passou a importar `_shared/sinal-revisao.ts` e ficou fora. A revisão corrigiu a lista, mas manteve a forma.
- Medi hoje (varredura do fechamento de toda EF): exatamente 8 EFs embarcam um `_shared` mudado desde `d6cb0159`. A lista está certa **hoje**.
- O `ALHEIO` só olha os 8 diretórios listados. Um commit que faça uma 9ª EF importar `sinal-revisao.ts` fica fora do `ALHEIO` e fora do deploy, com tudo verde.
- Os pares `verify_jwt` do `:334` duplicam a tabela do `efdeploy.cjs`, e o próprio `<fails_when>` diz «igual à tabela». Hoje batem, mas é uma terceira cópia.

**Fix:** no passo 0, derivar o conjunto pela forma e exigir igualdade com o escopo deliberado:
```bash
for d in supabase/functions/*/; do s=$(basename $d); [ "$s" = _shared ] && continue; [ -f $d/index.ts ] || continue
  node efdeploy.cjs $s --dry-run --verify-jwt 2>/dev/null | grep -qE "functions/_shared/($(git diff --name-only d6cb0159 $REV -- supabase/functions/_shared | grep -v __tests__ | xargs -n1 basename | sed 's/\.ts$//' | paste -sd'|' -))\.ts" && echo $s
done | sort   # tem de ser exatamente os 8 do plano; diferente → PARAR
```
E no `:334`, ler o `verify_jwt` esperado de `VERIFY_JWT` em `efdeploy.cjs`, em vez dos pares literais.

### WR-10: «reversible» (`:204`) e o T-49-43-06 ignoram a ordem do desfazer. Depois de E, desfazer o front ou a `consolidar` reabre o CR-02, e depois da primeira linha sinalizada nenhum desfazer do par EF+tela é seguro

**File:** `49-43-PLAN.md:204` («Front: novo deploy do commit anterior pela Vercel»), `:446`

**Issue:** o plano analisa as janelas da IDA com cuidado (`:219-237`), mas o desfazer é descrito como simétrico e sem ordem. O push de C leva 66 commits e 13 arquivos de front, então um defeito de tela não relacionado ao sinal, descoberto depois de E, é plausível. O reflexo («Instant Rollback» na Vercel, ou redeploy da `consolidar` v9) põe o front velho, ou a `consolidar` velha, ao lado do `avaliar-redacao` novo. É o CR-02 em PROD.
- Desfazer também o `avaliar-redacao` não basta. As linhas `sucesso` com `instrucao_ao_modelo` já gravadas são permanentes e continuam ponderando: sem a tela nova e sem a `consolidar` nova, ficam sem aviso.
- O rótulo «reversible» só é verdadeiro até a primeira SJT sinalizada ser gravada.
- Para a `consolidar`, «redeployar o commit anterior pelo mesmo `efdeploy.cjs`» exige materializar os arquivos de `b875352c` **no disco**. Num checkout compartilhado, isso é uma escrita no working tree de outra janela (ver CR-04), e o plano não diz como fazer.

**Fix:** acrescentar ao `<reversibility>` e ao T-49-43-06:
- a ordem do desfazer é **E → D → C → B → A**;
- depois de existir qualquer linha de `scores_candidato` com `metadata.motivos_revisao ? 'instrucao_ao_modelo'` (contagem por leitura em PROD), o front e a `consolidar` NÃO se desfazem para versões sem o aviso. Conserto só para frente;
- o redeploy da `consolidar` anterior sai de um `git worktree add <tmp> b875352c`, com `node efdeploy.cjs` rodado lá, nunca de um checkout no repositório compartilhado.

### WR-11: «Em nenhum instante uma SJT sinalizada pondera na Decisão Final sem o aviso» (`:26`, `:360`, `:470`) é falso para abas do RH abertas antes do push

**File:** `49-43-PLAN.md:26,360,470`; `src/App.tsx:40-43` (`staleTime` 5 min, `refetchOnWindowFocus: false`); `vercel.json` (sem configuração de versão); nenhum `vite:preloadError`/`location.reload` de versão em `src/`

**Issue:** é uma SPA sem detecção de versão.
- Uma aba do RH carregada antes de C, que já abriu a Decisão Final (o chunk `DecisaoFinalPage-*.js` antigo fica em memória), continua com o `ConsolidacaoDashboard` velho até um reload manual.
- Depois de E, essa aba chama a `consolidar` nova, recebe `sinais_revisao` e ignora a chave: mostra a nota sinalizada que pondera, **sem o aviso**. Uma decisão registrada ali fica tomada sem o rótulo, que é o critério do CR-02.
- Abas que ainda não tinham carregado o chunk recebem 404 no hash antigo, porque o rewrite de `vercel.json` exclui `/assets/`, e falham em vez de mostrar dado errado.

O resíduo é estreito: precisa de aba antiga + SJT sinalizada + decisão. Mas a afirmação absoluta do plano é falsa, e o SUMMARY a repetiria como prova.

**Fix:** trocar «em nenhum instante» por «em nenhum instante para quem carregou o front depois de C». Registrar o resíduo e uma mitigação:
- entre C e E, um aviso ao RH para recarregar, ou uma pausa (D-54 permite, porque o estado depois de C/D é seguro);
- ou conferir se a Skew Protection da Vercel está ativa no projeto (GET só-leitura).

Uma detecção de versão no front é plano novo, não deste.

### WR-07: O rótulo manda «revise o texto», e o RH não tem onde ler o texto da SJT caso aberto — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-4.md`. Operador, 2026-10-01: «B» (plano novo; publicar com o aviso atual). Segue aberto como defeito, com a disposição do operador.

### WR-01: O resíduo R1/R2 é maior do que o descrito ao operador — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (WR-01).

### WR-02: Ataques que nenhuma família pega (`none`) — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (WR-02).

### WR-03: Frases honestas de consultório ainda bloqueadas, nunca levadas ao operador — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (WR-03).

## Info

### IN-12: O «B» é gravado como paráfrase rotulada «na formulação da opção apresentada», e a paráfrase perde o custo que o operador aceitou

**File:** `49-43-PLAN.md:142-144` (contexto), `:392-396` (texto que vai ao `STATE.md`), `:412` (o verify procura só `WR-07`)

**Issue:** o texto literal da opção mostrada ao operador foi:

> «(b) Dar ao RH acesso ao texto da resposta. É maior e mexe em permissão de dados (RLS). Viraria um plano novo, e publico com o aviso atual.»

O plano grava: «dar ao RH acesso ao texto da resposta do caso aberto da SJT num plano NOVO, e publicar agora com o rótulo atual», com o rótulo «na formulação da opção apresentada a ele». Diferenças:
- sai «É maior e mexe em permissão de dados (RLS)», que é o custo que o operador aceitou ao escolher;
- «aviso» vira «rótulo»;
- entra «do caso aberto da SJT», contexto correto do WR-07 mas não dito na opção.

Não cria decisão nova, mas apresenta paráfrase como formulação. Além disso, o verify do STATE não confere o «B».

**Fix:** gravar a opção literal entre aspas, seguida da glosa do planejador marcada como tal. No `:412`, acrescentar `grep -qF '«B»'`.

### IN-13: «As únicas respostas do operador que este plano carrega são as três» e «Nada além disto é atribuível ao operador» contradizem o próprio plano

**File:** `49-43-PLAN.md:103-104`, `:137`, `:196`

**Issue:** o mesmo plano atribui ao operador a decisão (a) de 2026-09-29 (`:95`, e a célula do JORN-41 no `:399-404`, «decisão do operador (a)»). Também existem «1 ok confirmado» e «2- A» (2026-09-30, `49-36-SUMMARY.md:106-107`), que são palavras do operador.
- Um executor que aplique ao pé da letra «Nenhuma outra frase do SUMMARY atribui ao operador aceitação ou decisão» (`:196`) entra em conflito com a célula que a Task 3 exige.
- Um leitor futuro poderia concluir que «1 ok confirmado» e «2- A» não são do operador.

**Fix:** «As respostas do operador DADAS DEPOIS do 49-36 são três (…). As anteriores, a decisão (a) de 2026-09-29 e «1 ok confirmado» / «2- A» de 2026-09-30, estão no 49-36-PLAN e no 49-36-SUMMARY e continuam valendo. Nada além destas é atribuível ao operador.»

### IN-14: O portão B prova o bundle da `consolidar`, não que ela sobe; e o redeploy troca a supabase-js fora do alcance do comparador

**File:** `49-43-PLAN.md:278-282`; `supabase/functions/consolidar-decisao-final/index.ts:45` (`https://esm.sh/@supabase/supabase-js@2`, sem versão fixa)

**Issue:**
- O primeiro deploy pelo `efdeploy.cjs` com um módulo `../src/…` é a parte nova e não medida da via. Um erro de resolução no bundler devolve HTTP de erro e o plano PARA, o que é seguro.
- Um erro de boot depois de HTTP 200 deixaria `ACTIVE` + bundle correto + Decisão Final fora do ar, com o portão B verde.
- O `@2` sem versão fixa faz o redeploy embarcar a supabase-js 2.x corrente, não a de 2026-07-12. O comparador só olha `functions/…` e `src/features/…`, então isso não aparece.
- A `consolidar` é só-leitura (0 `insert`/`update`/`upsert`/`rpc`), mas invocá-la exige JWT de RH.

**Fix:** depois de B e da primeira abertura real da Decisão Final, ler os logs da EF (GET só-leitura na Management API ou no painel) procurando `BOOT_ERROR`/`worker boot error`, e registrar a saída no SUMMARY. Registrar também a versão da supabase-js resolvida no bundle novo.

### IN-09: A mensagem do IN-06 ainda promete «a análise segue, marcada», falso quando os dois provedores falham — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-4.md` (IN-09).

### IN-10: Cabeçalhos «(operador, 2026-09-30, «1»):» encabeçam detalhes do planejador — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-4.md` (IN-10). Conferido de novo: o diff `b875352c..HEAD` do `consolidacaoSchema.ts` mantém «(operador, 2026-09-30, «1»)» sobre «AUSENTE quando não há sinal (nunca `[]`)».

### IN-11: O número consolidado e a recomendação não indicam etapa sinalizada — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-4.md` (IN-11).

### IN-01: Tolerâncias de acento que nenhum teste prende — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-01).

### IN-02: Docblock e forma do código divergem em três pontos menores — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-02).

### IN-03: Script do corpus sem a flag `u`, e comentário de erro otimista — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-03).

### IN-04: `rotuloDoSinal` indexa objeto literal sem `hasOwn` — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-04).

### IN-05: O sinal chega ao titular pela exportação LGPD com o código cru — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-05).

---

**Para o 49-43, além do CR-04:**
- **CR-03:** fechado.
- **Ordem:** com a ordem migration → `consolidar` → front → 6 → `avaliar-redacao` e o portão E relido na hora, a ida está segura em cada parada, ressalvados o WR-11 (abas antigas) e o CR-04 (disco que muda no meio).
- **Portões novos:** os do front e da `consolidar` mordem, medido nesta rodada sobre a v9 viva, o build de `00557271` e o front servido.
- **Re-revisão:** o conserto do CR-04 é só no plano, mas vale a memória: re-revisar a revisão do plano num `-6` antes de retomar.

_Reviewed: 2026-10-01T04:20:55Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
