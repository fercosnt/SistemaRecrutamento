---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-13T13:17:27Z
depth: deep
diff_base: c3e04a717c9338387160a7dc03d2e74e2f4133c7
reviewed_head: 4e0f5acde9e86d478d0ffce7093b50642aef0999
scope: review adversarial bloqueante nº 2 do bloco D — o conserto do 52-REVIEW-LIMPEZA-1 (WR-01/02/03mín/04/06 + D1/D1b), commits 115f5c27..4e0f5acd; mesmo diff_base; não-foco coberto por LIMPEZA-1
files_reviewed: 11
files_reviewed_list:
  - scripts/p52_limpeza_portao.cjs
  - supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-COMANDO-APPLY.sh
  - scripts/p52_remove_storage.cjs
  - scripts/__tests__/p52_remove_storage.test.cjs
  - scripts/p52_mutacoes.cjs
  - scripts/p52_portao.cjs
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-PLAN.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-POPULACAO.json
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-DECISAO-REVIEW-1.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-LIMPEZA-1.md
findings:
  critical: 0
  warning: 1
  info: 5
  total: 6
status: approved
---

# Phase 52 — bloco D (LIMPEZA-2): Code Review Report — o conserto

**Reviewed:** 2026-10-13T13:17:27Z
**Depth:** deep
**Files Reviewed:** 11
**Status:** approved (critical 0; um warning novo, WR-08, a tratar no despacho da Task 3, sem mudar código)

## Summary

Postura: assumir defeito, sobretudo no próprio conserto. A memória deste repositório registra que duas rodadas de conserto seguidas introduziram blocker novo. `HEAD` conferido: `4e0f5acd`. Seis commits sobre `f529c56f`, e só os arquivos que a decisão do operador autorizou: o `comparar`, a 0004 (11 linhas a mais, 1 trocada), o comando, o removedor de Storage com o teste dele e as mutações. `52-21-PLAN.md`, os smokes, `p52_backup.cjs`, `p52_export_limpeza.cjs`, `p52_portao.cjs`, `p52_ensaio.cjs` e `p46apply.cjs` não mudaram desde `f529c56f`. Para eles vale o veredito `critical: 0` do LIMPEZA-1, que adoto sem reler. Reli só o que o conserto toca ou de que depende: a seleção da revisão de maior N no `p52_portao.cjs` e as âncoras das mutações.

**O que segurou, provado por execução:**
- **`comparar`.** Aceita o par real: o `52-21-POPULACAO.json` como `agora` e como população aprovada, com uma DECISAO de rascunho no formato da Task 2, inclusive `aprovado_em`. Sai `POPULACAO DE AGORA = APROVADA … 6/2/14/16`. Recusa nos oito desvios que testei.
- **Auto-teste do portão: 44/44.** Cinco mutações minhas, em cópias com linha de base verde, ficam todas vermelhas.
- **A 0004 compara o md5 canônico certo, no lugar certo.** A constante `1b4b21a9…` é a que recalculei a partir do arquivo aprovado: 38 ids distintos, ordem de byte, vírgula.
- **O passo (0b) faz o que promete.** Simulei-o num clone de rascunho: passa com a revisão de maior N certa, inclusive `10 > 2` e `reviewed_head` abreviado, e recusa nos outros cinco casos.
- **A cadeia do comando segue íntegra.** `bash -n` passa e o verificador do plano sai `CADEIA CONDICOES-MIGRATE OK` (23 + 2).
- **Removedor de Storage.** 19/19 no auto-teste e 29/29 no `node --test`. As mutações em `sumidos`, na baseline e em `restantes` mordem.
- **Mutações.** Todas as âncoras de migration casam uma única vez. D1b troca exatamente as duas linhas pretendidas.

**O que não segurou:** o conserto do WR-06 está certo no código, mas deixou o texto do `52-21-PLAN.md` atrasado em relação a ele. A prova de que «nada fora da lista foi tocado» saiu da prova depois (`--esperar-vazio`) e foi para o código de saída da própria remoção (`REMOCAO TOCOU FORA DA LISTA`). O plano ainda descreve a prova antiga e não manda parar na mensagem nova (WR-08). O conserto não apaga nada fora da população aprovada, não contorna nenhum portão e não vaza dado pessoal, por isso o achado é warning e não crítico.

**Para o operador:** o `comando_md5_aprovado` a gravar na `52-21-DECISAO.md` é **`605e80b8df248f6b6b1d19d6cec83c3d`**. Medi esse valor no arquivo atual e também no `reviewed_head` deste review (`git show 4e0f5acd:…/52-21-COMANDO-APPLY.sh | md5 -q`). Os dois são iguais, e é essa igualdade que o passo (0b) vai exigir amanhã.

## Disposição dos achados do LIMPEZA-1

- **WR-01** (`comparar` recusava sempre): **resolvido**, com prova por execução sobre os arquivos reais (ponto 1).
- **WR-02** (md5 não mordido pelo auto-teste): **resolvido**. Caso novo; a mutação que tira a linha deixa a suíte vermelha (ponto 2).
- **WR-03** (migration sem amarra no instante da escrita): **resolvido no escopo mínimo decidido pelo operador**. As vagas (item 3) e o `manter` (item 2) seguem sem amarra, por decisão (IN-12).
- **WR-04** (md5 do comando sem amarra à versão revisada): **resolvido** pelo passo (0b) (ponto 4).
- **WR-05** (restauração nunca ensaiada): **deferido pelo operador ao 52-22** (`52-21-DECISAO-REVIEW-1.md` (5)). Não é re-levantado aqui.
- **WR-06** (prova pós-Storage contra constante): **resolvido no código**. O plano ficou atrasado em relação ao código (WR-08).
- **WR-07** (backlog do 52-22 incompleto): **deferido pelo operador ao 52-22** (mesma decisão, item 4 de «O que vale»). Não é re-levantado aqui.

## Os pontos, um a um

1. **WR-01 — OK.** Em `compararDocs`, o `aprovado_em` é pulado (`:546`). O arquivo aprovado passa a ser conferido pelo contrato «com `--decisao`» sobre as próprias chaves (`:559-562`). E `popul.populacao_md5` tem de ser igual a `populacao_md5_aprovado` (`:563`). Rodei a CLI real com a DECISAO de rascunho em `scratchpad/review2/`:
   - par real → sai 0;
   - id trocado com o md5 recalculado → recusa só por `populacao_md5 agora … != aprovado`;
   - contagem alterada → recusa;
   - `decisao: adiar` → recusa;
   - linha `aprovado_<k>` faltando → recusa;
   - `aprovado_extra` → recusa;
   - população aprovada sem `apagaveis` → recusa duas vezes (falta de `apagaveis` + contrato);
   - população aprovada de outra população → recusa por `populacao_md5 da populacao aprovada`.

   Sobre o pulo do `aprovado_em`: uma categoria literalmente chamada `em` só existiria se `agora.apagaveis` tivesse essa chave. Nesse caso sai `apagaveis.em sem aprovado_em`, ou seja, fail-closed, sem buraco.

   Sobre o contrato do arquivo aprovado: aplicado às próprias chaves, ele perde só a checagem de conjunto de chaves, que é tautológica. Essa checagem continua feita contra `agora` e contra as linhas `aprovado_`. Todas as outras recusas de `conferirContrato` continuam valendo: tipos, `categorias.n`, md5 dos ids de `apagaveis`, obrigatórias, e-mail no JSON.
2. **WR-02 — OK.** `--auto-teste` dá 44/44. Fiz cópias numa árvore espelhada (para o caminho do smoke resolver), e a cópia sem mutação deu 44/44 verde como linha de base. Cada mutação ficou vermelha no caso certo:
   - M1, sem a linha `agora.populacao_md5 !== ap`: vermelho em «mesma contagem, um id trocado»;
   - M2, sem a linha `popul.populacao_md5 !== ap`: vermelho;
   - M3, sem o pulo do `em`: vermelho;
   - M4, contrato `{}` de volta: vermelho;
   - M5, sem «populacao aprovada sem apagaveis»: vermelho.

   As fixtures têm a forma real: `POP = comDecisao` e uma `DEC` com `aprovado_em` e as linhas `storage_`/`export_`/`janela_`.
3. **WR-03 — OK.** O `IF v_md5 IS DISTINCT FROM v_md5_aprovado` (`:219-221`) fica no mesmo `DO $pre$`, logo depois de `v_md5` ser calculado (`:217`), sobre `v_ids` distintos, com `ORDER BY x::text COLLATE "C"` e vírgula. É a mesma forma da evidência e a do script. O primeiro DELETE está em `:379`, noutro `DO` (`$limpa$`), e a requisição é atômica. A mensagem traz só md5. `v_md5` nunca é nulo por causa do `coalesce`.

   A constante bate com o arquivo aprovado: recalculei `1b4b21a93ff00a9d01f7d10926dd1f54` a partir dos ids de `apagaveis` (38 ids, 30 `user_id`). O cabeçalho (`:101-102`) diz a verdade. `git show 4ea47b5b --stat` dá 11 inserções e 1 remoção.

   A evidência do ensaio é plausível e está nos logs do executor (`scratchpad/ensaio_wr03.log`, 09:55 -03): `ENSAIO VERDE … smokes=[52d=5/5] … limpeza:populacao_md5=1b4b21a9…,candidatos=38,candidaturas=32,auth=30,vagas_deleted_at=8,…,historico_acoes=8`. O delta do vitest (`vitest_delta_final.log`) dá `alteradas=0 · novas=0 · mordida=ok`. Não rodei o ensaio (proibido a este review). A forma do log está em IN-11.

   Efeito colateral bom: os itens (1) e (4) do WR-03 ficam fechados por construção. Todo commit da 0004 implica que o alvo apagado tem `v_md5 = 1b4b21a9…`, e o POS (apagadas) amarra o LIMPA ao PRE.
4. **WR-04 — OK.** Passo (0b), `:77-81`, lido peça a peça:
   - `ls "$P" | sed … | sort -n | tail -1` usa ordem numérica, a mesma da regra (1) do portão (`readdirSync` + `sort((a,b)=>a-b)` em `p52_portao.cjs:159-163`);
   - lê `HEAD:` da revisão;
   - extrai o `reviewed_head:` só do frontmatter (`2,/^---$/`) e exige exatamente uma linha;
   - exige `git show "$RH:$SELF" | md5 -q` igual ao `comando_md5_aprovado` da `$DEC`;
   - `set -o pipefail` está em `:52`;
   - a mensagem é `COMANDO NAO E O REVISADO`.

   Como o (0) já exige md5 do arquivo atual = aprovado, os dois juntos dão atual = revisado = aprovado, e as duas checagens existem. Não há como o aprovado ser o md5 de outro arquivo revisado.

   Simulação. No repositório atual, só leitura, com uma DECISAO de rascunho: com `605e80b8…`, o maior N é 1 e o RH é `f529c56f` → recusa; com `99b8c90e…` → passa. Num clone de rascunho:
   - LIMPEZA-2 não commitado → recusa;
   - commitado com RH `4e0f5acd` → passa;
   - LIMPEZA-10 com RH `f529` → recusa (`10 > 2`);
   - LIMPEZA-10 com RH abreviado `4e0f5acd` → passa;
   - `reviewed_head` repetido → recusa;
   - LIMPEZA-2 apagado da árvore → recusa;
   - um `reviewed_head:` no corpo, depois do `---`, é ignorado.

   Revisão na árvore mas não em HEAD, ou em HEAD mas apagada da árvore: as duas caem em recusa, nunca numa revisão diferente da que o portão escolhe. O arquivo segue uma cadeia `&&` única. O `p46apply.cjs migrate` só aparece em (vi) (`:88`), e `p52_backup.cjs --apply` (`:86`) e `p52_export_limpeza.cjs --conferir … --vivo` (`:87`) são os dois elos imediatamente anteriores. `bash -n` passa. O `<verify>` nº 3 da Task 1 passa. O nº 4, copiado literalmente do plano, sai `CADEIA CONDICOES-MIGRATE OK … 23 mutacoes mordem, 2 formas legitimas passam`.
5. **WR-06 — OK no código; o plano ficou atrás (WR-08).**
   - `--aprovado` real: lista e confere os aprovados (n e `nomes_md5`) e, se diferir, sai sem remover. `--dry-run` sai antes da baseline, sem mudança de semântica. A baseline de fora dos prefixos (`listarFora`) é medida nesta execução, antes de remover. Remove só `ordem`, que são os caminhos listados sob os prefixos aprovados; `cli.remover` não é chamado em nenhum outro ponto. Depois relista os aprovados (`restantes`) e o de fora (`sumidos`/`novos`).
   - `--esperar-vazio`: julga só `restantes`; o total sai como informativo.
   - O desvio (listar também os prefixos de fora) é **aceitável**. Os nomes ficam em `Set`/array em memória; a saída só leva contagens; as mensagens de `Recusa`/`ErroRede` não interpolam nome. Os testes conferem a ausência de nome com fixtures sintéticas («fica nome real.pdf», «cv candidato real.pdf»). A única chamada de rede nova é `POST …/object/list`, de leitura.
   - Testes: `node --test` nos dois arquivos 29/29; `--auto-teste` 19/19. As mutações em cópias (linha de base 19/19) mordem: `sumidos` neutralizado, baseline vazia e `restantes` neutralizado em `--esperar-vazio`.
6. **Mutações — OK.** D1 espera `P52D PRE-PORTAO (aprovada): populacao calculada `. D1b aplica `trocar` duas vezes: a CTE `rh` e o `IF` do WR-03 (que ocorre 1 vez no arquivo). Apliquei as 8 transformações de migration sobre a 0004 atual: nenhuma âncora sumiu ou ficou ambígua. O diff de D1b tem exatamente as linhas `:172` e `:219`. D2, D3 e D4 não mudam a população medida pelo PRE: D4 mexe no `v_ids` do LIMPA, lido da GUC. Por isso continuam chegando ao portão que miram.

   Os logs do executor estão no scratchpad. `mutacoes_wr03.log` (09:56, antes de mudar D1) mostra `NAO MORDE: D1`. É a prova de que o WR-03 mudou o portão que D1 alcança e de que remover o `IF` do WR-03 faria D1 falhar. `mut_full.log` (10:07) mostra `MUTACOES: 44/44 mordem; controle verde; nada persistiu`, com `D1b morde … P52D POS-PORTAO (trava)`. As 44 são as 52 menos as 8 aposentadas pela regra de ledger. A prova de que D1b depende da cláusula `(trava)` gerou um ensaio extra que aborta (IN-10).
7. **Consistência do md5 do comando — OK.** `md5 -q` do arquivo atual = `605e80b8df248f6b6b1d19d6cec83c3d` = `git show 4e0f5acd:…/52-21-COMANDO-APPLY.sh | md5 -q` (também = em `2db6400a`, o único commit do conserto que o toca). O `cm` do `<verify>` da Task 2 vai exigir esse valor na DECISAO, e o (0b) vai exigir o mesmo valor no `reviewed_head` deste review.
8. **Privacidade — OK.** Varri as linhas adicionadas dos seis commits: nenhum `@`, nenhum JWT/`sbp_`, nenhuma chave. Os nomes de arquivo são fixtures sintéticas dos testes. Nas mensagens novas (PRE da 0004, (0b), `REMOVIDOS …`, `REMOCAO TOCOU FORA DA LISTA …`) só aparecem md5, contagens e prefixos de sha. Os logs do executor que li não têm e-mail.

## Critical

Nenhum.

## Warnings

### WR-08: o `52-21-PLAN.md` ainda descreve a prova pós-Storage antiga e não manda parar na recusa nova da remoção

**Onde:** `52-21-PLAN.md:262` (`fails_when` do 2º `<verify>` da Task 3: «or a bucket total ≠ captured − approved (… or touched something outside the list)»); `:266` (done: «o total do bucket = capturado − aprovados»); `:256` (Passo 3: só `STORAGE NAO E O APROVADO`/`STORAGE DIFERE DO APROVADO` levam a PARAR); `scripts/p52_remove_storage.cjs:357-364`.

**O que:** depois do WR-06, o `--esperar-vazio` não compara mais o total do bucket. Quem prova «não tocou fora da lista» passou a ser a própria remoção, pelo código de saída e pela mensagem `REMOCAO TOCOU FORA DA LISTA: … sumidos=<n>`. O plano, protegido pela regra (6) e por isso intocado, continua dizendo três coisas que já não valem:
- (a) que o `<verify>` pós-Storage pega «tocou fora». Hoje ele fica verde mesmo se a remoção tiver saído 1 por `sumidos`.
- (b) que o critério de pronto é «total = capturado − aprovados». É exatamente a constante que o WR-06 tirou: um upload real de currículo numa vaga ativa faz o executor ver divergência num conserto correto.
- (c) não nomeia `REMOCAO TOCOU FORA DA LISTA` nem `REMOCAO INCOMPLETA` como PARAR.

Memórias «executor passa por cima de parada do plano» e «instrução de conserto pode estar uma rodada atrasada».

**Por que não é crítico:** o removedor só apaga caminhos listados sob os prefixos aprovados, então tocar fora da lista não é estruturalmente possível por este código. A baseline é defesa em profundidade e continua saindo 1 na própria execução. A capacidade de detecção aumentou: comparar caminho a caminho dentro da mesma execução, em vez de contagem contra a captura.

**Conserto proposto:** sem mudar o plano, porque mudá-lo exigiria um LIMPEZA-3 pela regra (6). O despacho da Task 3 pelo orquestrador deve exigir, como evidência do Passo 3, a linha `REMOVIDOS: n=24 nomes_md5=<storage_md5_aprovado>; restantes=0 … sumidos=0 novos=<k>`. Também deve tratar qualquer saída diferente de 0 no Passo 3, em particular `REMOCAO TOCOU FORA DA LISTA` e `REMOCAO INCOMPLETA`, como PARAR e levar ao operador. E deve ler o `:266` assim: «registrar `total_bucket` como informativo; a diferença para capturado − aprovados é explicada por `novos=`, não é falha». Registrar no SUMMARY que o `fails_when` `:262` está superado pelo WR-06. A alternativa é corrigir o plano e fazer um LIMPEZA-3 curto antes do pin.

## Info

### IN-10: a prova de dependência do D1b fez um ensaio extra que aborta, a partir de um script de rascunho
**Onde:** `scratchpad/d1b_sem_trava.cjs`. **O que:** para provar que D1b depende da cláusula `(trava)`, o executor rodou uma cópia de rascunho sem ela. Disparou `NAO MORDE … POS-PORTAO (auth)` em vez do `(trava)`. É o mesmo tipo de requisição do runner, num envelope que aborta, e nada persistiu. Mas foi uma escrita contra PROD fora do runner versionado. **Conserto:** registrar no SUMMARY do 52-21: arquivo, hora e a garantia de rollback (a mesma do runner).

### IN-11: a evidência do ensaio e das mutações do conserto mora só no scratchpad da sessão
**Onde:** `scratchpad/ensaio_wr03.log` (09:55 -03), `mut_full.log` (10:07), `vitest_delta_final.log` (10:04). O `$TMPDIR/p52_21_ensaio.log` é anterior ao conserto (09:16). **O que:** os três rodaram sobre a árvore de trabalho minutos antes dos commits `4ea47b5b` (09:56:50) e `4e0f5acd` (10:08:35). O conteúdo é plausivelmente o mesmo, porque um único commit toca cada arquivo, mas não há registro disso. O scratchpad é efêmero (memória «apply sem artefato é indistinguível de não-aplicado»). **Conserto:** citar as linhas `ENSAIO VERDE …`, `MUTACOES: 44/44 …` e o delta do vitest no SUMMARY, com o md5 da 0004 e do `p52_mutacoes.cjs` no momento da execução.

### IN-12: o WR-03 mínimo deixa as vagas e o `manter` sem amarra — por decisão; e a constante amarra o apply à população de hoje
**Onde:** migration `:145`, `:291-295`. **O que:** o PRE não compara `v_vmd5` com `22cc6263…`, nem honra `manter`: é o escopo «mínimo» que o operador escolheu. O `manter` é inerte hoje, e vaga recebe UPDATE reversível. A consequência da constante é intencional: qualquer mudança nos 38 antes do apply recusa no PRE, sem mudar nada. Exemplos: um tombstone novo, uma conta nova que case um padrão (`%@teste.com` digitado por candidato real), uma conta que saia. Seguir aí exige nova medição, nova decisão, nova migration e um LIMPEZA-3. **Conserto:** nenhum. O operador sabe que o «PRE-PORTAO (aprovada)» amanhã significa «a população mudou desde 2026-10-13».

### IN-13: o `--aprovado` agora depende de listar o bucket inteiro
**Onde:** `scripts/p52_remove_storage.cjs:212-226`, `:344`, `:349`. **O que:** uma pasta fora dos prefixos com subpasta faz `listarPrefixo` recusar com `SUBPASTA NO PREFIXO`, um diagnóstico que fala de «prefixo» quando o problema está fora dos aprovados:
- antes da remoção: fail-closed, nada removido;
- depois da remoção (2ª listagem): a remoção já aconteceu, sai 1 e a prova «fora» se perde.

O mesmo vale para erro de rede na 2ª listagem. E uma exclusão legítima fora da lista no meio da execução (um candidato real apaga o próprio currículo nos segundos da remoção) acusaria `TOCOU FORA`. Medido no LIMPEZA-1: 28 objetos, dois níveis, então o risco é baixo. **Conserto:** no 52-22 ou depois, uma mensagem específica para subpasta fora dos aprovados. Na Task 3, um `TOCOU FORA` deve ser conferido contra o export e o bucket antes de qualquer conclusão.

### IN-14: semânticas de borda que ficaram como estavam
**O que:**
- (a) O (0b) deixa o `git show` imprimir `fatal: path … does not exist` no stderr antes da mensagem certa quando a revisão de maior N não está commitada. É só ruído.
- (b) `compararDocs` usa a última linha quando `aprovado_<k>` se repete e a primeira quando `decisao:`/`populacao_md5_aprovado:` se repetem. É a mesma semântica do `<verify>` da Task 2, então há coerência.
- (c) O (0b) aceita `reviewed_head` abreviado (7–40 hex). O portão tem a regra dele, e as duas checagens estão ligadas por `&&`.

**Conserto:** nenhum agora.

## Veredito

**critical: 0 — `approved`.** O conserto resolve WR-01, WR-02, WR-03 (mínimo), WR-04 e WR-06 sem introduzir blocker. Nada aqui apaga fora da população aprovada: o PRE agora recusa, antes de qualquer DELETE, um alvo diferente de `1b4b21a9…`. Nenhum portão foi enfraquecido: o (0b) acrescenta uma amarra, e a cadeia `&&` segue com backup e export imediatamente antes do `migrate`. Nada vaza dado pessoal, e a volta segue pelo export `0ea5ffb9…` ou pelo backup diário. Com as entradas reais, o comando passa do elo (ii). WR-05 e WR-07 seguem deferidos ao 52-22 por decisão do operador.

Antes do Task 3, o orquestrador trata o WR-08 no despacho. A ordem segue a de `52-21-DECISAO-REVIEW-1.md`:
1. commit deste review;
2. `52-21-DECISAO.md` com `comando_md5_aprovado: 605e80b8df248f6b6b1d19d6cec83c3d`;
3. pin `refs/gsd/52-21/sha`;
4. Task 3 em 2026-10-14, na janela depois do backup diário.

---

_Reviewed: 2026-10-13T13:17:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
