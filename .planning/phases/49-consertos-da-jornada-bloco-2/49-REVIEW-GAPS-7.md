---
phase: 49-consertos-da-jornada-bloco-2
reviewed: 2026-10-01T05:58:10Z
depth: deep
diff_base: 0fd55e08
reviewed_head: 31b6654bc30323ddb1e3b9c9fc9430b106679d56
scope: re-revisão FOCADA (rodada 7) da seção «Modo de publicação simplificado (operador, 2026-10-01)» do 49-43-PLAN.md, commit 31b6654b, a única mudança desde o -6 (git diff 0fd55e08..HEAD = só o 49-43-PLAN.md, +27/-1). Modelo de ameaça: a outra janela PAUSADA durante a publicação, como a seção exige. Código sem mudança desde o -6 (git diff 4d3bec4c..HEAD -- . ':!.planning' vazio, conferido)
carried_from: 49-REVIEW-GAPS-6 (WR-01, WR-02, WR-03, WR-07, WR-13, WR-14, WR-16, IN-01..IN-05, IN-09..IN-11, IN-14, IN-15, IN-16, IN-18 — carried)
files_reviewed: 1
files_reviewed_list:
  - .planning/phases/49-consertos-da-jornada-bloco-2/49-43-PLAN.md
findings:
  critical: 0
  warning: 11
  info: 17
  total: 28
status: issues_found
---

# Phase 49: Code Review Report — Re-revisão focada do modo de publicação simplificado (fecho do CR-05)

**Reviewed:** 2026-10-01T05:58:10Z
**Depth:** deep
**Files Reviewed:** 1. É o `49-43-PLAN.md`, revisado como o programa que escreve em PROD. Foram conferidos à parte o hook `~/.claude/hooks/guard-git.sh` e a transcrição da sessão do orquestrador, esta para checar a atribuição.
**Status:** issues_found, com 0 crítico

## Summary

**Escopo, conferido.**

| Conferência | Resultado |
|---|---|
| `git diff --stat 0fd55e08..HEAD` | só `49-43-PLAN.md` (+27/−1): a seção nova (`:249-273`) e o comando de push (`:376`) |
| `git diff 4d3bec4c..HEAD -- . ':!.planning'` e `17e35824..HEAD` | vazios. Nenhum código mudou desde o -5 |
| `git diff-tree` de `0fd55e08` (o -6) | só o `49-REVIEW-GAPS-6.md`. O -6 foi commitado sozinho |
| `git diff-tree` de `31b6654b` e de `4d3bec4c` | só o `49-43-PLAN.md` |
| `origin/main..HEAD` | 70 commits, todos com assunto `(49…)`. Os 7 entre `origin/main` e `62b446d1` (a base do -2) só tocam `.planning/`. Todo código que o push leva está na cadeia -2..-7 |
| `git ls-remote origin refs/heads/main` | `272458c0…` = `origin/main` local. Ninguém publicou |
| md5 dos três programas (`:219`, `:233`, `:247`), linha + `\n`, e também pela extração por cerca do WR-15 | `fd13e32f…`, `ede2ecf1…`, `968471ef…`, iguais aos do -6 |

**O que rodei.** Tudo foi feito num clone de rascunho com remoto bare falso (`main` = `272458c0`). Nada foi escrito em PROD, nada foi publicado e nenhum push real foi feito. O repositório real segue com o mesmo `git status` e sem `refs/gsd/*`.

| Medida no clone | Resultado |
|---|---|
| `-7` de rascunho (`critical: 0`, `reviewed_head: 31b6654b…`) commitado sozinho | o `<verify>` da Task 1 (`:321`) fica verde. A conferência do intervalo (regra 2, comando do WR-19) dá `intervalo ok` |
| Regra 2, variante (a): `src/App.tsx` arrastado para dentro do commit do review | **vermelho** (a árvore difere do revisado além do review) |
| Regra 2, variante (b): commit `feat(vagas): alheio` antes do review | **vermelho** |
| Regra 2, variante (c): commit alheio revertido antes do review, com a árvore idêntica | **vermelho** (3 commits no intervalo). O `git log` pega o que o `git diff` sozinho deixaria passar |
| Passo 0a (`:408`) | `71 commits em BASE..REV` (os 70 de hoje mais o -7) |
| `gsd-49-43-push.cjs` | `PUSH ENUMERADO: 71 commits, todos de BASE..REV (71) ou proprios (0)` |
| `git push origin "$(git rev-parse refs/gsd/49-43/head)":refs/heads/main` | o remoto e o `refs/remotes/origin/main` local avançam para o sha de `head`. O `test -z "$(git log --oneline origin/main..HEAD)"` do `:378` e dos `<verify>` continua válido com push por sha |
| `guard-git.sh` contra as linhas do plano | nenhuma linha tem `push` seguido de ` -f`. Mas um comando **composto na hora** que junte o passo 0a (`cut -f1`) com qualquer palavra `push` (por exemplo `push.cjs`) é bloqueado. Medido: o hook barrou um comando meu assim (IN-23) |

**Veredito sobre o CR-05: fechado, com a pausa como pré-condição.** A conferência do intervalo da regra 2 está certa e é executável. As duas metades fazem papéis diferentes:
- `git diff --name-only <reviewed_head>..HEAD` = só o review prova que a árvore publicada é a árvore revisada mais o arquivo do review;
- `git log` = um commit só, `docs(49-43): …`, pega o que a comparação de árvore sozinha deixaria passar (variante c).

As três variantes mordem. Uma ressalva: a regra está só em prosa, num plano em que todo outro portão é comando literal (WR-19). Com a outra janela parada, nenhum caminho que medi leva conteúdo não revisado a PROD com portões verdes. O resíduo que sobra exige que a janela pausada aja (IN-23).

**WR-12: o push está fechado, a conferência pós-push não (WR-17).**
- O comando executável do push (`:376`) foi trocado para o sha de `refs/gsd/49-43/head`. Ele é coerente com o `gsd-49-43-push.cjs`, que exige HEAD = `head` e enumera `R..HEAD` = `R..head`. Se o remoto andar, o push sem `--force` é recusado: falha fechado.
- **Nenhum comando executável ainda faz push do `main` por nome.** As cinco ocorrências restantes de `git push origin main` (`:267`, `:340`, `:415`, `:504`, `:683`) são prosa. A do `:267` é a própria proibição. O `:504` e o `:683` remetem ao «comando de push acima», que é o `:376`.
- A segunda metade da regra 3 («a conferência pós-push compara o `main` remoto com `refs/gsd/49-43/head`») **não chegou ao comando**. O `:378` ainda compara com `git rev-parse HEAD` e avança o `remoto` para `HEAD`.

**«PREVALECE sobre o que divergir»: há duas divergências que o executor teria de resolver na hora.**
- O `:378` contra a regra 3 (WR-17). Fica depois da escrita em PROD, e com a janela parada HEAD = `head`, então o resultado não muda. Mesmo assim, é um comando literal que a regra manda não seguir.
- O «6 EFs de IA (passo D/E)» da regra 5 contra as 7 do resto do plano (WR-18).

Nenhuma das duas força improviso **antes** de uma escrita em PROD, nem afeta a ordem que protege do CR-02. As outras regras não contradizem o plano:
- regra 2 = passo 0a, com REV = HEAD depois da conferência;
- regra 4 coerente com `:416-417`, e fecha o IN-17;
- regra 5 coerente com o «sem pausa» de D-54.

**Atribuição ao operador: o verbatim confere, uma frase não.** Conferido contra a transcrição da sessão do orquestrador:
- A mensagem de opções é de 2026-10-01T05:10:20Z. Ela termina com «→ Responda «1», «2» ou «3». Se for a 1, me avise quando a outra janela estiver parada.»
- A resposta do operador, às 05:52:10Z, é exatamente «A». A data e o verbatim estão certos.
- A leitura «A» → (1) está corretamente atribuída ao orquestrador.

O problema é a frase «e disse isso ao operador na mesma mensagem». As duas mensagens seguintes do orquestrador (05:53:05Z e 05:53:17Z) dizem «Acrescentei ao plano o modo simplificado…» e «faltam duas coisas: … Você me avisar «outra janela parada»». **Nenhuma declara que «A» foi lido como a opção (1).** A citação da opção também foi achatada (bullets viraram «;») e cortada antes de «Acrescento ao plano só essa regra, rodo uma última revisão focada e publico.». Ver WR-20. O risco é pequeno, porque a confirmação escrita da regra 1 («outra janela parada») só faz sentido na opção (1) e, na prática, ratifica a leitura. Mas o registro afirma uma comunicação que não aconteceu como descrita.

## Narrative Findings (AI reviewer)

## Warnings

### WR-17: A conferência pós-push executável (`:378`) contradiz a regra 3: compara o remoto com `HEAD` e avança o `remoto` para `HEAD`, e não para `refs/gsd/49-43/head`

**File:** `.planning/phases/49-consertos-da-jornada-bloco-2/49-43-PLAN.md:378` (contra `:266-267`)

**Issue:**
- A regra 3 diz que a conferência pós-push compara o `main` remoto com `refs/gsd/49-43/head`. O único comando literal da conferência, no `:378`, faz `test "$(git ls-remote …)" = "$(git rev-parse HEAD)" && git update-ref refs/gsd/49-43/remoto HEAD "$RM"`. É a metade do fix do WR-12 do -6 que não foi aplicada.
- Com «PREVALECE», o executor tem de reescrever um comando na hora, ou rodar um que a regra manda não seguir.
- Com a outra janela parada, HEAD = `head` no momento do push, porque a GUARDA e o `push.cjs` acabaram de conferir. Por isso não há conteúdo errado nem estado inseguro, e o achado é WARNING.

**Fix:** trocar o `:378` por:
```bash
cd /Users/fernando/code/SistemaRecrutamento && RM=$(git rev-parse refs/gsd/49-43/remoto) && E=$(git rev-parse refs/gsd/49-43/head) && test "$(git ls-remote origin refs/heads/main | awk '{print $1}')" = "$E" && test "$(git rev-parse HEAD)" = "$E" && git update-ref refs/gsd/49-43/remoto "$E" "$RM" && test -z "$(git log --oneline origin/main.."$E")" && echo "remoto = head"
```

### WR-18: A regra 5 diz «as 6 EFs de IA (passo D/E)». São 7 (6 em D + `avaliar-redacao` em E), e a seção PREVALECE

**File:** `49-43-PLAN.md:270` (contra `:24`, `:531-548` «N/N iguais nas 7», `:584`)

**Issue:**
- Lida ao pé da letra sob «PREVALECE», a regra 5 reduz a prova byte a byte contra REV a 6 EFs. A omissão mais provável é justamente a `avaliar-redacao`, a EF de E, que carrega o conserto do CR-01.
- Não expõe o CR-02, porque o portão de E e a ordem não mudam. Mas a truth do `:24` («fonte publicada byte-igual a REV» nas 7) ficaria sem prova numa delas.

**Fix:** no `:270`, trocar «das 6 EFs de IA (passo D/E)» por «das 7 EFs de IA (as 6 de D e a `avaliar-redacao` de E)».

### WR-19: A conferência do intervalo (regra 2), que é o portão que fecha o CR-05, está só em prosa. Todos os outros portões do plano são comandos literais

**File:** `49-43-PLAN.md:262-265`

**Issue:**
- O executor tem de compor, no passo 0, o parse de `reviewed_head` no frontmatter, as duas comparações e o PARAR. É o modo de falha que o WR-15 do -6 tratou nos programas: uma conferência improvisada pode checar só o `git log`, só o `git diff`, ou ler `reviewed_head` do corpo.
- A variante (c) mostra que nenhuma das duas metades basta sozinha.
- Um comando composto na hora também pode cair no hook `guard-git.sh` (IN-23).

**Fix:** pôr o comando literal na regra 2. Este foi medido no clone: verde no caso limpo e vermelho nas variantes (a), (b) e (c).
```bash
cd /Users/fernando/code/SistemaRecrutamento && P=.planning/phases/49-consertos-da-jornada-bloco-2 && N=$(ls $P | sed -nE 's/^49-REVIEW-GAPS-([0-9]+)\.md$/\1/p' | sort -n | tail -1) && F=$P/49-REVIEW-GAPS-$N.md && RH=$(awk 'NR==1{if($0!="---")exit;next} /^---$/{exit} {print}' "$F" | sed -nE 's/^reviewed_head: *([0-9a-f]{40}) *$/\1/p') && test -n "$RH" && git merge-base --is-ancestor "$RH" HEAD || { echo "INTERVALO: sem reviewed_head ou fora da historia em $F"; exit 1; }; test "$(git diff --name-only "$RH" HEAD)" = "$F" || { echo "INTERVALO: arvore difere do revisado alem de $F"; exit 1; }; L=$(git log --format='%H %s' "$RH..HEAD"); test "$(printf '%s\n' "$L" | wc -l | tr -d ' ')" = 1 && test "$(git log -1 --format=%H -- "$F")" = "$(git rev-parse HEAD)" && printf '%s\n' "$L" | grep -q '^[0-9a-f]\{40\} docs(49-43): ' || { echo "INTERVALO: commits alem do review: $L"; exit 1; }; echo "intervalo ok: $RH..HEAD = so $F"
```
Rodar logo antes do passo 0a, em comando separado dele (IN-23).

### WR-20: «e disse isso ao operador na mesma mensagem» não confere com a transcrição; a citação da opção (1) foi achatada e cortada

**File:** `49-43-PLAN.md:252-256`

**Issue:**
- As mensagens do orquestrador depois do «A» (2026-10-01T05:53:05Z e 05:53:17Z) não declaram a leitura «A» → (1). Ela só aparece implícita em «Acrescentei ao plano o modo simplificado».
- O operador foi instruído a responder «1», «2» ou «3» e respondeu «A». A leitura é razoável, mas é inferência, e o plano registra como feita uma comunicação que não houve.
- «No texto mostrado» abre aspas sobre um texto reformatado, sem os bullets nem a frase final da opção. É a classe do IN-13/WR-16: registro sobre o operador mais forte que a fonte.
- A pausa da regra 1 ratifica a leitura na prática, por isso o achado é WARNING e não mais.

**Fix:**
- Reescrever como: «O orquestrador leu «A» como a opção (1). Não declarou a leitura ao operador; respondeu «Acrescentei ao plano o modo simplificado…» (05:53:05Z) e pediu o aviso «outra janela parada». A confirmação escrita da regra 1 é o que ratifica a opção (1).»
- Marcar a citação como «texto da opção (1), sem a formatação em lista e sem a frase final».
- Opcional: a regra 1 pode pedir que a confirmação nomeie a opção («outra janela parada; opção 1»).

### WR-13: A prova byte a byte das EFs de IA não tem programa (carried, narrowed)
O -6 apontou o achado e a regra 5 o aceita como registro. Ela especifica «o comparador do portão B, com o mapa de módulos do `--dry-run`».
- Adaptar o `:586` errado falha fechado: se a regex não cobrir a `index.ts` da EF, sai `FECHAMENTO DIVERGE`.
- Sobra o caso vazio: mapa vazio com regex que não casa nada dá `[]` = `[]`, verde com 0 módulos.
- Basta exigir `ks.length >= 1`, ou a contagem do `--dry-run`.

Fica junto com o WR-18.

### WR-14: O `vitest` roda no checkout, e não no export (carried, accepted)
A regra 5 aceita o achado com a outra janela parada. Os sujos de hoje (`docs/specs/…`, `docs/vagas/*.md`, `.planning/ui-reviews/.gitignore`) estão fora de `src/` e não entram na suíte. O resíduo «vitest verde descreve o checkout, não REV» segue registrado.

### WR-16: O plano afirma como ação do operador o aviso ao RH (carried)
A regra 5 resolve a parte da sequência: aviso no SUMMARY e no retorno, sem pausa. A parte da atribuição segue aberta: `:26` («A mitigação é o aviso do operador ao RH») e `:742` (T-49-43-14, «O operador avisa o RH para recarregar») ainda afirmam uma ação que o operador não assumiu.

### WR-07: O rótulo manda «revise o texto», e o RH não tem onde ler o texto da SJT caso aberto (carried)
Inalterado. Disposição do operador: «B», 2026-10-01.

### WR-01: O resíduo R1/R2 é maior do que o descrito ao operador (carried)
Inalterado desde o -2.

### WR-02: Ataques que nenhuma família pega (`none`) (carried)
Inalterado desde o -2.

### WR-03: Frases honestas de consultório ainda bloqueadas, nunca levadas ao operador (carried)
Inalterado desde o -2.

## Info

### IN-19: `git commit -m … -- <arquivo novo>` falha para arquivo não rastreado. O commit do `-7` precisa de `git add` só daquele caminho antes, e de assunto `docs(49-43): `

**File:** `49-43-PLAN.md:264` (regra 2 exige commit único `docs(49-43): ...`); recomendação do `-6`, `:312`

**Issue:** medido no clone, `git commit -m "docs(49-43): …" -- <-7>` dá `pathspec … did not match any file(s) known to git`. Se alguém contornar isso com `git add` mais um `git commit` sem pathspec, o commit leva o que houver staged. A regra 2 pega e PARA, então o caso é seguro, mas trava a publicação.

**Fix (ao orquestrador):**
```bash
git add -- .planning/phases/49-consertos-da-jornada-bloco-2/49-REVIEW-GAPS-7.md && git commit -m "docs(49-43): re-revisão focada do modo simplificado (49-REVIEW-GAPS-7)" -- .planning/phases/49-consertos-da-jornada-bloco-2/49-REVIEW-GAPS-7.md
```
Nenhum outro commit (STATE, ROADMAP) entre o `31b6654b` e o passo 0.

### IN-20: A pausa vale para a «Task 2». O push da Task 3 também publica o front

**File:** `49-43-PLAN.md:260` (contra o texto da opção, «durante a publicação», e o `:308`)

**Issue:** o push da Task 3 está protegido sem a pausa (GUARDA, enumeração e push por sha), então isto não é defeito de segurança. Mas a regra não diz quando a pausa pode acabar.

**Fix:** «a pausa vale até o push da Task 3 e a conferência pós-push dele».

### IN-21: Prosa e contagens superadas pela seção

**File:** `49-43-PLAN.md:340`, `:415`, `:504`, `:683` (`git push origin main`); `:229` («68 = 67 + 1»), `:409` («67 commits»); `:322` («It stays RED until a `-6` exists»); `:151-154`, `:306` (pendente o `-6`)

**Issue:** nenhuma é executável, e a seção prevalece. Ainda assim, quem lê o `:504` vê «e `git push origin main`, num comando só».

**Fix:** ajustar quando o plano for tocado de novo. Isso exige um `-8`, então só junto com outro conserto.

### IN-22: A comparação de md5 da regra 5 depende do `\n` final, e a gravação ainda é por transcrição com o Write

**File:** `49-43-PLAN.md:272`, `:423-425`

**Issue:** os md5 do -6 são da linha mais `\n`. Gravar sem a quebra final dá md5 diferente e PARA, o que é seguro mas ruidoso.

**Fix:** extrair do plano em REV em vez de transcrever. A receita do WR-15 do -6 (`awk` por cerca de `js`) produz os três md5 esperados (medido).

### IN-23: (fora do modelo de ameaça, exige a janela pausada agir) A conferência do intervalo e o passo 0a são comandos separados; e um comando composto que junte `cut -f1` com `push` é barrado pelo hook

**File:** `49-43-PLAN.md:262-265`, `:408`; `~/.claude/hooks/guard-git.sh` (`*push*" -f"*`)

**Issue:**
- Entre a conferência e o `update-ref` do `rev`, só um escritor concorrente mudaria HEAD, e a regra 1 o exclui.
- Separado disso: juntar o passo 0a com qualquer coisa que contenha `push` (até `push.cjs`) casa o padrão do hook, porque o `cut -f1` traz ` -f`. Medido.

**Fix:** manter o 0a e a conferência do intervalo em comandos separados. A conferência do WR-19 não contém `push`.

### IN-17: Retomada depois de uma parada por commit alheio — fechado
A regra 4 decide: PARAR, não rebasear nem fazer merge, e voltar ao orquestrador.

### IN-15: Export reaproveitado pelo `.exportado` não se recria se o SO apagar arquivos (carried)
Inalterado desde o -6.

### IN-16: Os commits próprios passam pelo Husky `pre-commit`; o plano não diz «vermelho = PARAR, nunca `--no-verify`» (carried)
Inalterado desde o -6.

### IN-18: O «Desfazer» do front não avisa que o Instant Rollback da Vercel fixa a produção (carried)
Inalterado desde o -6.

### IN-14: O portão B prova o bundle da `consolidar`, não que ela sobe (carried)
Inalterado desde o -5.

### IN-09: A mensagem do IN-06 promete «a análise segue, marcada», falso quando os dois provedores falham (carried)
Inalterado desde o -4.

### IN-10: Cabeçalhos «(operador, 2026-09-30, «1»):» encabeçam detalhes do planejador (carried)
Inalterado desde o -4.

### IN-11: O número consolidado e a recomendação não indicam etapa sinalizada (carried)
Inalterado desde o -4.

### IN-01: Tolerâncias de acento que nenhum teste prende (carried)
Inalterado desde o -2.

### IN-02: Docblock e forma do código divergem em três pontos menores (carried)
Inalterado desde o -2.

### IN-03: Script do corpus sem a flag `u`, e comentário de erro otimista (carried)
Inalterado desde o -2.

### IN-04: `rotuloDoSinal` indexa objeto literal sem `hasOwn` (carried)
Inalterado desde o -2.

### IN-05: O sinal chega ao titular pela exportação LGPD com o código cru (carried)
Inalterado desde o -2.

---

**Situação dos itens do -6:**

| Item | Situação |
|---|---|
| CR-05 | **Fechado** pela pausa (regra 1) e pela conferência do intervalo (regra 2), medida mordendo nas três variantes. Condições: o `-7` commitado sozinho (IN-19) e a conferência rodada como está no WR-19 |
| WR-12 | Push fechado (`:376`, por sha). Conferência pós-push aberta: WR-17 |
| WR-13 | Aceito pela regra 5. Estreitado; resta o caso vazio. Ver também o WR-18 |
| WR-14 | Aceito pela regra 5, com a janela parada |
| WR-15 | **Fechado.** Os md5 são comparados aos do -6, que conferem hoje (IN-22 é ruído) |
| WR-16 | A sequência foi aceita. A atribuição segue aberta (`:26`, `:742`) |
| IN-17 | Fechado pela regra 4 |

**Para o 49-43:**
- **Sem crítico.** Com a outra janela pausada, nenhum caminho medido publica conteúdo não revisado, expõe o CR-02 ou escreve em PROD de forma destrutiva sem o operador.
- O WR-17, o WR-18 e o WR-19 são mudanças de uma linha no plano, mas qualquer mudança no plano depois deste `-7` exige um `-8`: o `<verify>` da Task 1 reprova com «PLANO REVISADO DEPOIS DO REVIEW».
- Duas saídas, à escolha do orquestrador:
  - publicar com este `-7`. O executor segue a regra 3 no pós-push (o comando do WR-17), prova as 7 EFs (WR-18) e roda o comando do WR-19 como a conferência da regra 2, e o SUMMARY registra que esses três comandos vieram deste review;
  - consertar no plano e rodar um `-8` só sobre essas três linhas.
- **Ao orquestrador:** commitar este `-7` sozinho, como no IN-19, com assunto `docs(49-43): `. Nenhum outro commit antes do passo 0.

_Reviewed: 2026-10-01T05:58:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
