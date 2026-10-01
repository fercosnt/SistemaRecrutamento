---
phase: 49-consertos-da-jornada-bloco-2
reviewed: 2026-10-01T05:07:46Z
depth: deep
diff_base: 17e35824
reviewed_head: 4d3bec4ce11844724ef586f6918b134a19cdfc8d
scope: re-revisão adversarial da revisão do plano 49-43 (commit 4d3bec4c, só o 49-43-PLAN.md), que fecha o CR-04 e os WR-08..WR-11, IN-12, IN-13 do 49-REVIEW-GAPS-5; o plano é o programa que escreve em PROD (migration pela Management API, 8 deploys de EF, git push → Vercel). Código sem mudança desde o -5 (git diff 17e35824..HEAD -- . ':!.planning' vazio, conferido)
carried_from: 49-REVIEW-GAPS-5 (WR-01, WR-02, WR-03, WR-07, IN-01..IN-05, IN-09..IN-11, IN-14 — carried, not in fix scope)
files_reviewed: 8
files_reviewed_list:
  - .planning/phases/49-consertos-da-jornada-bloco-2/49-43-PLAN.md
  - efdeploy.cjs
  - p46apply.cjs
  - .husky/pre-commit
  - supabase/functions/consolidar-decisao-final/index.ts
  - src/features/decisao/schemas/consolidacaoSchema.ts
  - src/lib/supabase/client.ts
  - .planning/config.json
findings:
  critical: 1
  warning: 9
  info: 13
  total: 23
status: issues_found
---

# Phase 49: Code Review Report — Re-revisão da revisão do plano 49-43 (fecho do CR-04)

**Reviewed:** 2026-10-01T05:07:46Z
**Depth:** deep
**Files Reviewed:** 8: o plano revisado; os dois scripts que ele executa a partir do export; o hook que roda nos commits dele; a EF e o schema que o export precisa resolver; o cliente que decide se o `vitest` roda sem `.env.local`; a config do GSD.
**Status:** issues_found

## Summary

**Escopo.** `git diff 17e35824..HEAD -- . ':!.planning'` sai vazio. O único commit desde o -5, `4d3bec4c`, toca só o `49-43-PLAN.md`. Revisei o plano como o programa que escreve em PROD. Parti da hipótese da memória «re-revisar o conserto antes do apply»: cinco rodadas seguidas introduziram crítico novo.

**O que rodei.** Tudo local, num clone de rascunho com remoto falso (bare com `main` = `272458c0`, o `origin/main` real), mais GETs só-leitura em PROD. Nenhuma escrita, deploy ou push real; nenhuma fonte editada. O repositório não ganhou ref nem arquivo: `git status` igual ao de antes, sem `refs/gsd/*`.

| Conferência | Resultado |
|---|---|
| Portão da Task 1 (`:295`), no repositório real | **VERMELHO**: `COM CRITICO … 49-REVIEW-GAPS-5.md`. Com este `-6` (crítico 1) continua vermelho |
| Portão da Task 1 no clone, com um `-6` de rascunho `critical: 0` commitado | verde. Ver CR-05: também verde com código não revisado antes do `-6` ou dentro do commit dele |
| Passo 0a (`:382`) no clone | `REV=… BASE=272458c0 (69 commits em BASE..REV)`; 2ª execução recusa (`reference already exists`), como o plano diz |
| Passo 0b (`:395`) | export criado; o `--dry-run` da `consolidar` a partir dele (cwd `/`) dá os 3 arquivos, com `../src/features/decisao/schemas/consolidacaoSchema.ts` resolvido **dentro do export**. `efdeploy.cjs:41` usa `path.join(__dirname,'supabase')`, e o import é `../../../src/…` (`consolidar-decisao-final/index.ts:51`). O caminho relativo é preservado |
| Os três programas, extraídos byte a byte das linhas `:219`, `:233`, `:247` | `node --check` ok. md5 (linha + `\n`): guarda `fd13e32f…`, push `ede2ecf1…`, escopo `968471ef…` |
| GUARDA: casos medidos | verde limpo, com a sujeira real da outra janela copiada, com arquivo alheio **staged** fora de `P`, com `touch` só de stat. Vermelho com edição em `_shared`, em `consolidacaoSchema.ts`, arquivo não rastreado em diretório de EF, export adulterado, commit alheio |
| `gsd-49-43-escopo.cjs` | verde com as 8 e os `verify_jwt` da tabela. Com uma 9ª EF (`notificar-rh`) importando `sinal-revisao.ts`: `ESCOPO DIVERGE`. Morde |
| Procedimento de commit próprio, com arquivo da outra janela staged | só o `cron-inventory.md` entra; o staged alheio continua staged; `head` avança |
| `gsd-49-43-push.cjs` | `PUSH ENUMERADO: 70 commits, todos de BASE..REV (69) ou proprios (1)` |
| Push com commit alheio entre a enumeração e o `git push` | publicado; a conferência pós-push (`:352`) sai `remoto = HEAD`; ver WR-12 |
| `<verify>` do front (`:562`) | `vazio em 00557271 … passa em REV: …/build-rev/assets/DecisaoFinalPage-C1M7Tmtd.js` |
| Comparador da `consolidar` (`:560`) | sobre a v9 viva: `SEM sinais_revisao` no `<verify>`; o `node` sozinho dá `FECHAMENTO DIVERGE` (REV e `b875352c`). Sobre bundle sintético com os 3 de REV: verde contra REV, `DIFERE DE 00557271` contra a árvore anterior; com um byte a mais: `DIFERE DE <REV>`. Morde |
| `deno test` no export | `1009 passed, 0 failed` (32 s). Depois dele e do `vite build`, a GUARDA segue verde (o `deno.lock` novo fica fora dos arquivos de REV) |
| `vitest` **no export**, com variáveis públicas fictícias | `218 files, 2377 passed`: a premissa do `:195-196` é falsa (WR-14) |
| ALHEIO (`:409`) no clone | vazio |
| GET só-leitura das 8 EFs | v33/v23/v17/v20/v31/v31/v23 (as 7, `ACTIVE`, `verify_jwt` = tabela) e `consolidar` v9 (2026-07-12). Ninguém publicou desde o -5 |
| `git ls-remote origin refs/heads/main` | `272458c0…` = `origin/main` local |
| Hook do Claude `guard-git.sh` (`*push*" -f"*`) | nenhuma linha do plano tem `push` seguido de ` -f`; o `cut -f1` do `:382` não tem `push` na mesma linha, e o pós-push (`:352`) usa `awk`. Nenhum comando do plano é bloqueado |
| Husky `pre-commit` (tsc, teto 96) | 89 hoje: os commits próprios passam (IN-16) |
| Árvores do desfazer | `b875352c` e `d6cb0159` têm `supabase/functions/deno.json`, e o `zod` puro do schema resolve |

**Situação de cada item do -5:**

| Item | Situação |
|---|---|
| CR-04 | **Fechado nas quatro partes descritas.** REV fixado em ref. A migration, o smoke e as EFs saem do export de REV pelos scripts de REV. A GUARDA roda no mesmo comando de cada escrita. O comparador da `consolidar` usa `git cat-file blob` de REV. O push é enumerado e os commits vão por pathspec. Resíduos: WR-12 (TOCTOU do push), WR-13 (prova das 7 não codificada), WR-14 (`vitest` no checkout) e WR-15 (programas transcritos) |
| WR-08 | Fechado: maior N numérico, `critical` lido só no frontmatter, «código/plano depois do review». Mas o elo está ancorado no commit que **grava** o review, não no que o revisor **leu**: é o CR-05 |
| WR-09 | Fechado e medido (8 hoje; a 9ª morde) |
| WR-10 | Fechado: ordem E → D → C → B → A, contagem antes de desfazer, desfazer de EF por export do commit anterior |
| WR-11 | Fechado na redação. A mitigação não está amarrada a nenhum ponto da sequência (WR-16) |
| IN-12 | Fechado |
| IN-13 | Fechado |

**Achado novo, 1 crítico (CR-05).** É a mesma classe do CR-04, um elo antes. O plano agora confia em «REV = o que foi revisado», e a única prova disso é o portão da Task 1. Esse portão olha o intervalo **depois do commit que grava o review**. O intervalo entre o HEAD que o revisor leu e esse commit, e o próprio commit, ficam sem vigilância. Medi a cadeia inteira verde (portão da Task 1, ALHEIO, GUARDA, escopo, enumeração do push) com uma mudança não revisada em `ConsolidacaoDashboard.tsx`, o componente que mostra o aviso do CR-02.

### Atribuição ao operador

Inalterada e correta. Os verbatim conferem com as fontes:
- «1 ok confirmado» e «2- A», 2026-09-30: `49-36-SUMMARY.md:43,106-107,116`.
- Decisão (a), 2026-09-29: `49-36-PLAN.md:96`.
- «1», 2026-09-30: `49-REVIEW-GAPS-3-FIX.md:6,15`.
- «1- sim»: `49-REVIEW-GAPS-2-FIX.md:5,13`, trecho do «1- sim, 2- decidir depois», como o -3 já registrou.
- «B», 2026-10-01, com o texto literal da opção (b): `:163-166`, `:635-638`.

O diff `17e35824..4d3bec4c` não acrescenta palavra nova ao operador. **Exceção:** o T-49-43-14 (`:716`) e a truth do `:26` afirmam uma **ação** do operador («O operador avisa o RH», «A mitigação é o aviso do operador») que existe só como recomendação do planejador (`:281-283`). Ver WR-16.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-05: O elo «REV = o que foi revisado» começa no commit que GRAVA o review, não no HEAD que o revisor leu; código commitado nesse intervalo, ou dentro do próprio commit do review, vai a PROD com todos os portões verdes

**File:** `.planning/phases/49-consertos-da-jornada-bloco-2/49-43-PLAN.md`

| Linha | O que faz |
|---|---|
| `:295` | `CL=$(git log -1 --format=%H -- "$F")`, depois `git log "$CL..HEAD" -- . ':!.planning'` e `git log "$CL..HEAD" -- …/49-43-PLAN.md` |
| `:23` | must-have: «nenhum commit fora de `.planning/` nem no `49-43-PLAN.md` depois do commit dela» |
| `:151-154` | o mesmo critério |
| `:391-393` | o passo 0a re-roda o portão com HEAD = REV, e é ele que liga REV à revisão |
| `:409` | ALHEIO: só os caminhos de `P` |
| `:233` | `gsd-49-43-push.cjs`: aceita qualquer commit de `BASE..REV` |

**Issue:**
1. **O intervalo descoberto.**
   - Este revisor lê o HEAD `4d3bec4c`. O `-6` é commitado depois, pelo orquestrador.
   - Um commit X entre os dois fica antes de `CL`, então `CL..HEAD` não o vê. Exemplo: a outra janela, que está ativa neste checkout e em 2026-09-29 commitou e publicou `7be693c1 feat(vagas)`, com `docs/`, `scripts/` e migration.
   - O mesmo vale para o que entra **dentro** de `CL`: o portão não confere que o commit do review toca só o arquivo do review.
2. **Nada mais pega.**
   - ALHEIO (`:409`) só olha `P`. `src/` fora de `consolidacaoSchema.ts`, `docs/`, `scripts/` e outras migrations passam.
   - A GUARDA compara com REV, que já contém X.
   - O escopo só olha fechamentos de EF.
   - O `gsd-49-43-push.cjs` aceita X por estar em `BASE..REV`.
   - O portão do front só exige o marcador `decisao-sjt-sinal-revisao`, que uma edição em volta dele preserva.
3. **Medido no clone.** Duas variantes, as duas verdes:
   - (a) `src/features/decisao/components/ConsolidacaoDashboard.tsx` editado e staged, e o `-6` commitado sem pathspec.
     - Portão da Task 1: `re-revisao sem critico, cobrindo HEAD`.
     - ALHEIO: vazio.
     - Passo 0a: `69 commits em BASE..REV`.
     - GUARDA: `ok`.
     - Escopo: `= os 8 declarados`.
     - Enumeração: `PUSH ENUMERADO: 69 commits, todos de BASE..REV`, com a linha `docs(49-43): re-revisão -6` levando a edição.
   - (b) Um commit separado `feat(vagas): alheio` (`src/App.tsx` + `docs/specs/DRAFT-banco-sjt-marketing.md`) antes do `-6`: portão da Task 1 verde e ALHEIO vazio.

   O push do passo C publicaria pela Vercel front não revisado e `docs/` da outra janela.

**Por que é crítico:** conteúdo que nenhuma rodada leu chega a PROD (front pela Vercel) com todos os portões verdes, e o SUMMARY registraria «REV = o HEAD revisado». O gatilho, escritor concorrente que commita, está presente e medido. E o intervalo descoberto é exatamente o próximo passo: commitar este `-6`. O conserto sugerido pelo WR-08 do -5 (`C=$(git log -1 … -- "$F")`) já tinha o mesmo ponto cego. O plano o implementou fielmente.

**Fix (no plano; mecânico).** Este `-6` passa a registrar no frontmatter o HEAD lido, `reviewed_head: 4d3bec4c…`. Os próximos `-N` fazem o mesmo. No portão da Task 1:
```bash
RH=$(printf '%s\n' "$FM" | sed -nE 's/^reviewed_head: *([0-9a-f]{40}) *$/\1/p')
test -n "$RH" && git merge-base --is-ancestor "$RH" "$CL" || { echo "SEM reviewed_head, OU FORA DA HISTORIA: $F"; exit 1; }
# o commit do review toca SÓ o review
test "$(git diff-tree --no-commit-id --name-only -r "$CL")" = "$F" || { echo "COMMIT DO REVIEW LEVA OUTROS ARQUIVOS: $CL"; exit 1; }
# nada de código nem do plano entre o que o revisor leu e HEAD (CL incluído)
test -z "$(git log --format=%h "$RH..HEAD" -- . ':!.planning')" || { echo "CODIGO DEPOIS DO HEAD REVISADO"; exit 1; }
test -z "$(git log --format=%h "$RH..HEAD" -- $P/49-43-PLAN.md)" || { echo "PLANO DEPOIS DO HEAD REVISADO"; exit 1; }
```
Provar que morde com as duas variantes acima, num clone. Ao orquestrador: commitar o `-6` com `git commit -m … -- <caminho do -6>`.

## Warnings

### WR-12: O push manda o ref `main`, e não o sha enumerado; a conferência pós-push compara o remoto com HEAD, e não com `refs/gsd/49-43/head`. Um commit alheio na janela entre a enumeração e o push sobe, e a conferência o abençoa

**File:** `49-43-PLAN.md:350` (`… gsd-49-43-push.cjs && git push origin main`), `:352` (`test "$(git ls-remote …)" = "$(git rev-parse HEAD)" && git update-ref refs/gsd/49-43/remoto HEAD "$RM"`)

**Issue:**
- O `gsd-49-43-push.cjs` confere HEAD; o `git push origin main` lê `refs/heads/main` depois, com o `ls-remote` de rede no meio.
- Medido no clone, com um commit alheio entre a enumeração e o push: ele subiu, o `:352` imprimiu `remoto = HEAD` e o `remoto` avançou por cima dele.
- No passo C, a GUARDA seguinte (antes de D) para, mas o front já saiu. No push da Task 3, nenhum portão vem depois.
- A janela é de segundos, por isso WARNING e não crítico.

**Fix:**
```bash
E=$(git rev-parse refs/gsd/49-43/head) && … && git push origin "$E:refs/heads/main"
# pós-push: comparar com o esperado, não com HEAD
test "$(git ls-remote origin refs/heads/main | awk '{print $1}')" = "$(git rev-parse refs/gsd/49-43/head)" && git update-ref refs/gsd/49-43/remoto "$(git rev-parse refs/gsd/49-43/head)" "$RM"
```

### WR-13: A prova byte a byte das 7 EFs contra REV, a lista «antes» e a prova de mordida da `consolidar` sobre o bundle guardado não têm programa; o `<verify>` das 7 só conta marcadores

**File:** `49-43-PLAN.md:505-522` (prosa), `:558` (só marcadores), `:579` (critério «N/N»), `:459-464` (o «bundle ANTERIOR guardado» exige adaptar o comando do `:560`)

**Issue:**
- O CR-04 pediu que as provas comparassem com REV, e para a `consolidar` isso virou código (`:560`, medido mordendo). Para as 7, a comparação contra `git cat-file blob` e a lista dos módulos que diferem antes do deploy ficam em prosa.
- O executor teria de escrever um comparador **entre deploys em PROD**. Um comparador improvisado pode repetir o defeito do CR-04 (ler o disco), ou casar zero módulos e afirmar «N/N» vazio.
- Nenhum `<verify>` reprova esse caso.
- Os comandos de deploy de B/D/E também são só prosa («o GUARDA e `node "$X/efdeploy.cjs" <slug>` no mesmo comando»), sem a linha literal que o A tem.

**Fix:** um 4º programa `gsd-49-43-bundle.cjs <slug> <arquivo.bin> [ref]`, generalização do `:560`:
- os módulos esperados vêm do `--dry-run` do `efdeploy.cjs` do export;
- exige `|fechamento do bundle| = |dry-run|`;
- compara cada `sourcesContent` com `git cat-file blob <ref>:supabase/<caminho>` (`../src/` → `src/`);
- `--diff` imprime a lista dos módulos que diferem, para a leitura «antes».

Acrescentar ao `<verify>` o laço das 7 com ele, e escrever as linhas literais de B/D/E no formato do passo A.

### WR-14: O `vitest` roda no checkout compartilhado, fora da GUARDA (que só cobre `P`); um arquivo sujo da outra janela pode mascarar falha, e o «vitest verde» do SUMMARY descreveria uma árvore que não é REV. A premissa de que ele não roda no export é falsa

**File:** `49-43-PLAN.md:195-196`, `:316`, `:402-404`; `src/lib/supabase/client.ts:19-25`

**Issue:**
- O `:403` só trata vermelho causado por arquivo alheio. Uma edição alheia não commitada em `src/**` ou num teste, fora de `P`, que faça passar o que em REV falha, sai verde.
- O plano justifica rodar no checkout com «sem o `.env.local`, 49 arquivos caem». Medi no export de REV, sem `.env*`: `CI=true VITE_SUPABASE_URL=http://127.0.0.1:9 VITE_SUPABASE_ANON_KEY=dummy npx vitest run` dá **218 files, 2377 passed**.
- O cliente só exige que as duas variáveis existam. Os valores são públicos por desenho, e não segredo.

**Fix:** no passo 0d, rodar no export, com o comando acima (sem copiar `.env*`), e registrar a saída. Remover o `:195-196` e o «no checkout» do `:316`/`:402`.

### WR-15: Os três programas que SÃO a fronteira do CR-04 são transcritos pelo modelo («byte a byte, com a ferramenta Write»); o md5 é registrado e nunca comparado com nada

**File:** `49-43-PLAN.md:183-184`, `:397-399`, `:571`

**Issue:**
- É o modo de falha que o CLAUDE.md descreve para migrations: transcrição pelo modelo. Aqui ele recai sobre a GUARDA, a enumeração e o escopo, três linhas minificadas de 1,6 a 2,3 KB.
- Um caractere trocado que mantenha a sintaxe pode afrouxar um portão: tirar um item de `P`, inverter um `!==`, encurtar a regex do `OK`. Nada detectaria, porque o md5 vai ao SUMMARY sem valor esperado.

**Fix:** extrair mecanicamente do plano **em REV**, que é o que a Task 1 liga ao revisado, e conferir contra md5 fixado no plano:
```bash
REV=$(git rev-parse --verify -q refs/gsd/49-43/rev) && T="${TMPDIR:-/tmp}" && git show "${REV}:.planning/phases/49-consertos-da-jornada-bloco-2/49-43-PLAN.md" > "$T/gsd-49-43-plan.md" \
 && for k in 1:guarda 2:push 3:escopo; do awk -v n=${k%%:*} '/^```js$/{c++;f=(c==n);next} /^```$/{f=0} f' "$T/gsd-49-43-plan.md" > "$T/gsd-49-43-${k#*:}.cjs"; done \
 && md5 -q "$T"/gsd-49-43-{guarda,push,escopo}.cjs   # tem de dar os três valores fixados no plano
```
Os md5 atuais (linha + `\n`): `fd13e32f38d4e49e581e7fead9bf42d2`, `ede2ecf159495a0e2edb8a3905ae5566`, `968471efcd141f847191457c70bdf96f`. Mudam a cada revisão dos programas.

### WR-16: A mitigação do WR-11 não está amarrada à sequência, e o plano a afirma como ação do operador

**File:** `49-43-PLAN.md:26` («A mitigação é o aviso do operador ao RH»), `:716` (T-49-43-14: «O operador avisa o RH para recarregar»), `:283` (recomendação: avisar «depois que o front for publicado»), `:330`/`:335` (D-54: C → D → E «sem pausa»)

**Issue:**
- O aviso só mitiga se acontecer entre o push de C e o deploy de E. O plano manda seguir sem pausa e não dá ao operador nenhum ponto para avisar antes de E.
- A truth e o T-49-43-14 escrevem como fato uma ação que o operador não assumiu. O próprio `:592` diz que ela é recomendação. É a classe do IN-13: atribuição ao operador.
- O resíduo continua estreito (aba antiga + SJT sinalizada + decisão), mas a «mitigação» declarada não existe na execução.

**Fix:** escolher uma das duas.
- Uma pausa curta depois do portão C, que D-54 permite e o -5 propôs: «operador: avisou o RH para recarregar? (s/n)». A resposta é registrada verbatim.
- Ou mover a recomendação para ANTES do passo 0, com hora: «recarreguem depois das HH:MM».

Nos dois casos, reescrever o `:26` e o `:716` como «recomendado ao operador», sem afirmar que ele faz.

### WR-07: O rótulo manda «revise o texto», e o RH não tem onde ler o texto da SJT caso aberto — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-4.md`. Operador, 2026-10-01: «B». Segue aberto como defeito, com a disposição do operador.

### WR-01: O resíduo R1/R2 é maior do que o descrito ao operador — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md`.

### WR-02: Ataques que nenhuma família pega (`none`) — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md`.

### WR-03: Frases honestas de consultório ainda bloqueadas, nunca levadas ao operador — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md`.

## Info

### IN-15: O export reaproveitado pelo marcador `.exportado` não se recria quando o SO apaga arquivos dele; a GUARDA manda «recriar pelo comando de export», que vira no-op

**File:** `49-43-PLAN.md:395` (`test -f "$X/.exportado" || { … }`), `:219` (mensagem `recriar pelo comando de export`)

**Issue:**
- O `$TMPDIR` do macOS (`/var/folders/…/T/`) é limpo pelo sistema, arquivo a arquivo, quando um arquivo fica dias sem acesso.
- Numa retomada depois de um PARAR longo, o export pode perder arquivos e manter o `.exportado`. A GUARDA fica vermelha, o comando indicado não recria nada e o executor improvisa um `rm -rf`.
- É seguro, porque falha fechado.

**Fix:** a mensagem da GUARDA deve dizer `rm -rf "$X" "$X.tar"` e depois o comando de export. Ou o export confere a contagem de arquivos contra `git ls-tree -r REV | wc -l` antes de reaproveitar.

### IN-16: Os commits próprios passam pelo hook Husky `pre-commit` (tsc sobre o checkout compartilhado, teto 96), que o plano não menciona

**File:** `49-43-PLAN.md:341-347`; `.husky/pre-commit`

**Issue:**
- Hoje a contagem é 89, então os commits passam.
- Sujeira `src/` da outra janela pode passar de 96 e bloquear o commit do inventário ou o da Task 3. É seguro (o ref não avança), mas o plano não diz o que fazer.
- O reflexo `--no-verify` é proibido pela norma do projeto.

**Fix:** uma linha no procedimento: hook vermelho = PARAR e reportar, nunca `--no-verify`.

### IN-17: Não há procedimento de retomada quando a GUARDA para por um commit legítimo da outra janela

**File:** `49-43-PLAN.md:390-391`

**Issue:**
- «Retomar com HEAD diferente do `head` é decisão do orquestrador/operador», mas o plano não diz que decisão é essa: avançar o `head`, ou rebasear/excluir o commit alheio antes do push. Enquanto isso, PROD fica no estado parcial, que é seguro.
- Com a outra janela ativa, é a parada mais provável.

**Fix:** registrar as opções e quem decide: avançar o `head` só depois de um `-N+1` sobre o commit alheio, ou só se ele não tocar nada fora de `.planning/`.

### IN-18: O «Desfazer» do front pela Vercel não avisa que o Instant Rollback desliga a promoção automática dos deploys seguintes

**File:** `49-43-PLAN.md:547`

**Issue:**
- Depois de um rollback de produção na Vercel, os pushes seguintes não vão ao ar sozinhos até alguém desfazer o rollback ou promover um deploy.
- O push da Task 3, e os de qualquer janela, passariam a não publicar. É uma armadilha operacional, e não CR-02.

**Fix:** uma linha no «Desfazer»: depois do rollback, registrar que a produção ficou fixada e quem a destrava.

### IN-14: O portão B prova o bundle da `consolidar`, não que ela sobe — carried, not in fix scope
Inalterado desde o `-5`. Disposição do plano: «registrado, fora do escopo». O portão de E (`:501-503`) também só lê o bundle: uma `consolidar` em `BOOT_ERROR` com `ACTIVE` passaria.

### IN-09: A mensagem do IN-06 ainda promete «a análise segue, marcada», falso quando os dois provedores falham — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-4.md`.

### IN-10: Cabeçalhos «(operador, 2026-09-30, «1»):» encabeçam detalhes do planejador — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-4.md`.

### IN-11: O número consolidado e a recomendação não indicam etapa sinalizada — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-4.md`.

### IN-01: Tolerâncias de acento que nenhum teste prende — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md`.

### IN-02: Docblock e forma do código divergem em três pontos menores — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md`.

### IN-03: Script do corpus sem a flag `u`, e comentário de erro otimista — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md`.

### IN-04: `rotuloDoSinal` indexa objeto literal sem `hasOwn` — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md`.

### IN-05: O sinal chega ao titular pela exportação LGPD com o código cru — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md`.

---

**Para o 49-43:**
- **CR-04:** fechado.
- **Ordem e janelas do -5:** seguras e inalteradas.
- **Portões medidos mordendo:** GUARDA, escopo, front e comparador da `consolidar`.
- **Antes de retomar:** consertar o CR-05 no plano e re-revisar num `-7`. O CR-05 é o elo que liga o resto ao revisado.
- **Junto, de preferência:** WR-12 a WR-15, porque todos são do mesmo aparato.
- **Ao orquestrador:** este `-6` deve ser commitado sozinho, por pathspec (`git commit -m … -- .planning/phases/49-consertos-da-jornada-bloco-2/49-REVIEW-GAPS-6.md`). Com o portão atual, um commit que leve outros arquivos não seria pego.

_Reviewed: 2026-10-01T05:07:46Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
