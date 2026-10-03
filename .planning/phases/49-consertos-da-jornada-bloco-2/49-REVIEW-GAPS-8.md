---
phase: 49-consertos-da-jornada-bloco-2
reviewed: 2026-10-03T14:28:30Z
depth: deep
diff_base: 46f2a52d434f814a66667dc4c547a18acc0778c5
reviewed_head: e2f1f50069480bb5b00e2ce7cd137193967fff7e
scope: re-revisão adversarial (rodada 8) do 49-44 (WR-07 / JORN-41), com o diff de código `46f2a52d..e2f1f500 -- . ':!.planning'` (9 arquivos), mais o `49-45-PLAN.md` lido como o programa que escreve em PROD. Contexto lido, fora da lista revisada: `49-44-PLAN.md` (`<decisions>` 1–7, escolha 4), `49-44-SUMMARY.md`, `49-REVIEW-GAPS-7.md` (formato), `_shared/ai-client.ts`, `avaliar-redacao/index.ts`, `consolidar-decisao-final/index.ts`, `SjtCasoAbertoScreen.tsx`, `useAutosaveAvaliacao.ts`, `avaliacaoService.ts`, `purgar-retencao/index.ts`, `executar-direito-titular/index.ts`, `20260923000002` (motor), `20260611000003` (policies do titular), `p46apply.cjs`, `guard-git.sh`. PROD só leitura (`set transaction read only`) pelo `p46apply.cjs sql`
files_reviewed: 10
files_reviewed_list:
  - supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql
  - supabase/tests/p49_44_resposta_caso_aberto_smoke.sql
  - scripts/p49_44_mutacoes.cjs
  - src/features/avaliacao/services/scoresRhService.ts
  - src/features/avaliacao/services/__tests__/scoresRhService.test.ts
  - src/features/decisao/components/RespostaCasoAbertoSjt.tsx
  - src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
  - src/features/decisao/components/__tests__/ConsolidacaoDashboard.test.tsx
  - .planning/phases/49-consertos-da-jornada-bloco-2/49-45-PLAN.md
findings:
  critical: 0
  warning: 6
  info: 9
  total: 15
status: issues_found
---

# Phase 49: Code Review Report — Rodada 8: o 49-44 (RH lê o caso aberto da SJT) e o 49-45 (a publicação)

**Reviewed:** 2026-10-03T14:28:30Z
**Depth:** deep
**Files Reviewed:** 10. São os 9 do diff de código e o `49-45-PLAN.md`.
**Status:** issues_found, com 0 crítico

## Summary

Parti da hipótese de que esta rodada introduziu defeito. **Nenhum defeito encontrado mandaria um vazamento ou um dado errado a PROD, nem faria o 49-45 escrever errado.** A RPC, o helper, as três políticas, a ordem apply → push e o portão de publicação fazem o que dizem.

Sobram seis WARNINGs:
- **Um de cópia/LGPD** (WR-01). O estado `removida_pelo_titular` alega uma causa que o marcador não prova: a purga de retenção grava o mesmo marcador.
- **Dois de enumeração dos resíduos**, que o cabeçalho torna imutáveis depois do apply. A rota (i) promete fechar mais do que fecha (WR-03), e uma janela da mesma classe, depois da linha de score, ficou sem nome (WR-04).
- **Um de portão.** A metade «papel nulo» da guarda fail-closed não é provada por nenhuma cláusula nem mutação (WR-02).
- **Dois de registro/processo** (WR-05, WR-06).

Os dois primeiros grupos valem ser resolvidos **antes** do apply: o literal do estado, o `COMMENT ON FUNCTION` e o cabeçalho vão para o catálogo e para o ledger de PROD.

### O que conferi e ficou de pé

| Pedido | Resultado |
|---|---|
| IDOR / vazamento de existência | Para `rh`, «inexistente» e «alheia» dão o MESMO 42501 (`:225-227`). P0002 só para administrador (`:228-230`). O predicado bate com o `rh_le_scores` vivo (lido em PROD: `qual` idêntico em `scores_candidato`, `redacoes_candidato` e `entrevista_analises`) |
| Guarda fail-open | O código está certo: `v_uid IS NULL OR coalesce(v_role,'') NOT IN (…)` (`:213`). A prova no smoke tem uma lacuna (WR-02) |
| Rascunho | (iii) antes de (iv). B devolve `sem_resposta_enviada`, sem o rascunho nem o md5 dele. M3 morde |
| Restritiva × permissiva nos 4 caminhos | INSERT (`g_ins`, M6); `ON CONFLICT DO UPDATE` (`upsert`: a WITH CHECK da `_ins` vale para a linha proposta, por isso continua 42501 sob M7, como o SUMMARY mediu); UPDATE (`upd`, M7); DELETE (`del`, M8). Controle da MESMA instrução antes da linha de score. Uma UPDATE que mova outra linha para `teste='sjt_caso_aberto'` ou para outra `candidatura_id` é barrada pela WITH CHECK da `_upd`. Sem ela, o PG usaria o USING como WITH CHECK |
| Escritores de `respostas_avaliacao` | Front: só `upsertResposta` (`avaliacaoService.ts:372-384`). EFs: nenhuma escreve. SQL: só o motor (passo 8/13). `purgar-retencao` chama o motor por service_role. `executar-direito-titular` chama o motor pelo **client do titular** (`index.ts:1015`), ou seja, `authenticated`, e não service_role como diz o checklist do 49-45 (IN-03). Os dois chegam ao motor, que é SECURITY DEFINER com dono `postgres`, e `postgres` tem `rolbypassrls = true` (medido). Nenhum é alcançado. Cascata de FK não passa por RLS |
| Helper como oráculo | EXECUTE: `authenticated` e `service_role`. `anon` não, provado pela mensagem do ACL em (a). Para não-titular devolve falso. Para o titular revela só a existência da própria linha de score, que o `get_avaliacao_status` já revela («registrado»). Nenhuma cláusula prova o «falso para não-titular» (IN-02) |
| Busca antes do clique / cache / disabled / HTML cru | O filho com `useQuery` só monta com `aberto`. `staleTime 0 / gcTime 0 / retry false`. Não há persister no app (`grep persistQueryClient` vazio). Nenhum `disabled`. Nó de texto React. Os 3 arquivos de teste passam aqui (39/39) |
| `ROTULO_SINAL` | `git diff --stat` não toca `supabase/functions/` |
| Varredura pela forma | Repeti a D-56: 326 linhas, 0 tocando os objetos. Varri o smoke novo com o padrão do CLAUDE.md: todos os achados (`:589`, `:603-612`, `:622`, `:656`, `:693`) são contagens sobre as fixtures que ele cria ou o `9` declarado. São escopo, não fotografia. As contagens globais de (z) vêm da baseline. Nenhum outro smoke vigia `pg_policies`/`prosecdef` sem escopo por tabela ou nome |
| Runner | Controle primeiro. Uma mutação por política, conferida pelo rótulo. `c_*` na lista = vácuo. `SUSPEITA DE INSTRUMENTO` com 2 seguidas. `PERSISTIU` no fim. Âncoras únicas. O regex de `falha()` pega a mensagem do erro: o `p46apply` não ecoa o corpo |
| Números de R2 | Conferem com o código: `AI_TOTAL_BUDGET_MS = 140000` (`ai-client.ts:131`); `effectiveMaxAttempts = max(1, min(3, floor(140000/110000))) = 1` (`:682-684`); fallback `min(110000, max(5000, 140000 − decorrido))` (`:1167-1169`); `timeoutMs: 110_000` (`avaliar-redacao/index.ts:380`). Cabeçalho, escolha 4, item (c) e linha do STATE dizem «~140 s, 110 s por chamada». Nenhum diverge |
| Ordem apply → push | Task 2 (apply com `HEAD = S` e arquivos limpos no MESMO comando, `:222`) → quatro `<verify>` → Task 3 (push por sha). O desfazer põe front antes de banco e tem uma lacuna (IN-09) |
| Atribuição | Só o «B» está atribuído ao operador como decisão desta rodada. O «A» do 49-45 está marcado como «aprovado para o 49-43, reaplicado pelo planejador», e confere com `49-43-PLAN.md:249-255`. O «critério do operador» citado na escolha 4 e no cabeçalho é a memória de 2026-07-30, que é dele. Há escolhas sem a marca «do planejador», mas nenhuma atribuída ao operador (IN-07) |

**Medido em PROD (só leitura, 2026-10-03):**
- `respostas_avaliacao` com as 2 policies do titular; RPC ausente; ledger 0;
- `perguntas` com `formato='caso_aberto'` = **4**; candidaturas com mais de uma linha `sjt/caso_aberto` = 0; linhas `sjt/caso_aberto` = 1;
- `config_purga.modo = 'dry_run'`;
- `postgres.rolbypassrls = true`; `anonimizar_candidato` com `prosecdef`, dono `postgres`, `search_path=""`;
- o administrador que o smoke escolhe ≠ o dono da vaga que ele escolhe; os 3 `usuarios_rh` ativos são administradores.

## Warnings

### WR-01: `removida_pelo_titular` e «O texto foi removido a pedido do titular dos dados.» alegam uma causa que o marcador não prova. A purga de retenção grava o mesmo marcador

**File:** `supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql:44-45, 242, 250-251, 267`; `src/features/decisao/components/RespostaCasoAbertoSjt.tsx:12-13, 31`; `src/features/avaliacao/services/scoresRhService.ts:166-168`; smoke `:73`, `:575`, `:622`

**Issue:** O cabeçalho diz que só `removida_pelo_titular` «nomeia causa (o marcador `redigido` que o motor de exclusão grava prova a causa)». O `COMMENT ON FUNCTION` e o docblock do componente repetem isso. É a escolha 5 do planejador: «estados sem causa inventada». Mas o motor tem **dois** ramos e grava o MESMO `{"redigido":"anonimizacao_p49"}` nos dois:
- (I) o direito do titular, via `executar-direito-titular`;
- (II) a **purga de retenção**, via `purgar-retencao/index.ts:520`.

O ramo II está em `20260923000002_p49_motor_desidentifica_analises.sql:470-472` (`v_ramo_purga`) e na mensagem do guard (`:622`, «(II) MOTOR DA PURGA DE RETENCAO»). O motor mantém a linha `scores_candidato` e o `motivo da revisao` na metadata (`:1482`, «a linha fica, e o resto da metadata … continua lá»). Por isso a Decisão Final continua mostrando o aviso da SJT para uma candidatura purgada.

Cenário: a purga vai a `live`, alcança um titular cujo caso aberto tinha o sinal, e o RH dono da vaga clica. A tela diz que **o candidato pediu para apagar os dados**. Ninguém pediu. É uma afirmação falsa, sobre o exercício de um direito LGPD, feita ao potencial empregador. Medido: `config_purga.modo = 'dry_run'`, e hoje não há linha com sinal. Por isso não é crítico. Mas o literal do estado vira contrato em PROD com o apply, e o cabeçalho fica imutável.

**Fix:** antes do apply, trocar o estado por um neutro que o marcador prova, e manter o contrato de quatro estados:
```sql
-- (iv)
IF jsonb_typeof(v_resp) = 'object' AND v_resp ? 'redigido' THEN
  RETURN jsonb_build_object('situacao', 'removida', 'texto', NULL);
END IF;
```
```ts
removida: 'O texto foi removido em cumprimento à política de dados pessoais.',
```
Os mesmos ajustes vão no cabeçalho («o marcador prova a remoção pelo motor, não quem a pediu»), no COMMENT, em `SITUACOES_RESPOSTA_CASO_ABERTO`, nos testes e nas mensagens de (e)/(h) do smoke. A alternativa é distinguir os ramos lendo `solicitacoes_dados` (exclusão concluída) contra `purga_execucao_itens`. Isso é mais código, e é decisão do planejador ou do operador.

### WR-02: a metade «papel nulo» da guarda fail-closed não é provada. Nenhuma sonda tem `sub` válido e `app_metadata.role` ausente, e nenhuma mutação tira o `coalesce`

**File:** `supabase/tests/p49_44_resposta_caso_aberto_smoke.sql:320-354`; `scripts/p49_44_mutacoes.cjs:79-84`; e a alegação em `49-44-PLAN.md:30` («A guarda é fail-closed (`coalesce(v_role, '')` e `auth.uid()` nulo recusado). Provado no smoke»)

**Issue:** As três sondas de (d) são:
- `rh` com `sub` aleatório;
- **sem claims**, em que `auth.uid()` também é nulo e a guarda recusa pelo `v_uid IS NULL`;
- `candidato`, em que `'candidato' NOT IN (…)` dá verdadeiro.

Nenhuma exercita `v_uid` não nulo com `v_role` nulo. M2 tira a guarda INTEIRA e morde pela sonda sem claims. Agora a regressão exata que o pedido nomeia: `coalesce(v_role, '') NOT IN` → `v_role NOT IN`. Com papel nulo e `sub` presente, o `IF` recebe `false OR NULL` = NULL e não dispara. Depois, `v_role = 'rh'` é NULL e não dispara. `v_achou` é verdadeiro, e a função devolve o texto. Qualquer JWT autenticado sem `role` (o hook de token não o pôs) leria o caso aberto de qualquer candidatura. As 9 cláusulas e as 8 mutações seguiriam verdes. O código de hoje está certo: o defeito é de portão, que deixaria a regressão passar.

**Fix:** uma sonda e uma mutação.
```sql
-- (d) papel ausente com sub VÁLIDO (o dono): tem de ser 42501
PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono::text, 'role', 'authenticated',
          'app_metadata', json_build_object())::text, true);
BEGIN
  v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
  d_sem_papel := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
EXCEPTION WHEN OTHERS THEN d_sem_papel := SQLSTATE || ':' || SQLERRM;
END;
-- julgamento: d_sem_papel NOT LIKE '42501:%' → FAIL (d)
```
```js
{ id: 'M9', desc: 'guarda sem coalesce (papel nulo passa)', letra: 'd',
  sql: trocar(fnLer, "coalesce(v_role, '') NOT IN", 'v_role NOT IN', 'M9') },
```
Corrigir também a frase «Provado no smoke» do `49-44-PLAN.md:30` e do SUMMARY até a sonda existir.

### WR-03: a rota (i) promete fechar «a parte de R2 que ocorre na mesma aba». Não fecha: o caso do «cliente que desistiu da resposta da EF» acontece na mesma aba, depois que o envio volta com erro

**File:** `supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql:99-100, 104-106` (imutável depois do apply); `49-44-PLAN.md:162-163, 168-169`; `49-45-PLAN.md:170-171` (item (c))

**Issue:** R2 inclui, nas palavras do próprio cabeçalho, «um cliente que desistiu da resposta da EF enquanto a EF terminava». Na mesma aba, o fluxo é este:
1. `avaliarRedacao` falha do lado do cliente, por rede, aba em segundo plano ou fetch abortado, enquanto a EF segue até o `insert`.
2. `handleSubmit` cai no `catch` (`SjtCasoAbertoScreen.tsx:150-152`), o toast diz «Tente novamente», e o `finally` põe `submitting=false`.
3. O campo nunca foi travado (`:235-241`), e o candidato edita.
4. O `onBlur` ou o debounce gravam o texto novo ANTES de a EF inserir a linha de score.
5. A linha nasce, analisada sobre o texto antigo, e congela o novo.

A rota (i), «travar o campo durante o envio», libera o campo quando o envio volta com erro. Por isso NÃO fecha esse caso na mesma aba. O item (c) mostra ao operador uma alegação de fechamento que diverge do código, exatamente o que o pedido classifica como achado.

**Fix:** antes do apply, reescrever a rota (i) no cabeçalho, na escolha 4 e no item (c):
> (i) … fecha R1 e a edição na mesma aba **enquanto o envio está pendente**; não fecha a edição feita depois que o cliente desiste da resposta da EF (essa só a (ii) fecha).

Ou então estender a rota (i), mantendo o campo travado depois de um erro de envio até a confirmação de que não existe linha de score. Isso exige uma leitura de estado e é decisão do operador.

### WR-04: a janela da mesma classe DEPOIS da linha de score ficou sem nome. Uma segunda chamada à `avaliar-redacao`, com outra `pergunta_id` de caso aberto, cria uma segunda nota sobre outro texto, e o RH lê o texto congelado

**File:** `supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql:80-111`; `supabase/functions/avaliar-redacao/index.ts:322-336, 404-500`; `supabase/functions/consolidar-decisao-final/index.ts:184-192, 371-394`

**Issue:** O cabeçalho enquadra R1–R3 como «antes disso» (antes da linha nascer) e afirma «depois que a nota nasce, o candidato não o reescreve nem o apaga». É verdade sobre o TEXTO. Mas «a nota» não é única, por três motivos:
- a EF aceita qualquer `pergunta_id` com `formato='caso_aberto'`, sem amarrá-la à vaga (`:322-336`);
- a EF não recusa quando já existe linha `sjt/caso_aberto` da candidatura;
- a chave única é `(candidatura_id, tipo, subtipo, pergunta_id)`.

Com 4 perguntas de caso aberto em PROD (medido), um cliente modificado (o ator de R3), ainda em `avaliacao_assincrona`, pode chamar a EF de novo **depois do congelamento** com o texto T2 e outra `pergunta_id`. Nasce uma segunda linha `sucesso` (ou com sinal). `normalizeSjtComposite` e `sinaisDasLinhas` contam as duas. O aviso pode vir da linha de T2, enquanto o RH lê T1, congelado. Nenhuma rota fecha isso:
- (i) é da tela;
- (ii) sobrescreveria o texto com T2, e T2 passaria a divergir da PRIMEIRA linha;
- (iii) não cobre o que não foi nomeado.

Hoje há 0 candidaturas com mais de uma linha (medido), então é residual latente, não incidente.

**Fix:** nomear antes do apply, no cabeçalho e no item (c), por exemplo:
> R3 vale também depois da linha de score: a EF aceita nova chamada com outra pergunta de caso aberto e grava uma segunda nota sobre outro texto; nenhuma das rotas (i)–(iii) fecha.

O conserto de código fica fora do 49-44 e é do operador: na `avaliar-redacao`, antes do `callAi`, recusar quando já existe linha `sjt/caso_aberto` da candidatura, e exigir que a pergunta pertença à SJT da vaga.

### WR-05: o `49-44-SUMMARY.md` declara `requirements-completed: [JORN-41]`. Isso contradiz o 49-45, o precedente dos 49-40..43 e o próprio SUMMARY

**File:** `.planning/phases/49-consertos-da-jornada-bloco-2/49-44-SUMMARY.md:57`

**Issue:** O 49-45 proíbe marcar o JORN-41 («MUST NOT marcar JORN-41 Complete»), e o `<verify>` 2 da Task 3 exige `- [ ] **JORN-41**`. Os SUMMARYs 49-40, 49-41, 49-42 e 49-43 deixam `requirements-completed: []`, e com a razão escrita. O próprio 49-44-SUMMARY diz, nas pendências (`:229`), que «a marcação de completo fica com quem fechar por último». Um passo do GSD que leia o frontmatter dos SUMMARYs (fechamento de fase, verificação, `requirements mark-complete`) pode marcar o JORN-41 antes de a migration e o front existirem em PROD. Nesse caso o `<verify>` da Task 3 reprova DEPOIS do push.

**Fix:** `requirements-completed: []`, com a mesma nota dos 49-40..43 («JORN-41 não é marcado neste plano; resta o 49-45, e quem marca é o verificador»).

### WR-06: no plano que escreve em PROD, a enumeração dos commits e o push estão só em prosa, a mesma classe do WR-19 do -7. Um comando composto na hora pode cair no `guard-git.sh`

**File:** `.planning/phases/49-consertos-da-jornada-bloco-2/49-45-PLAN.md:203-208` (Task 2, Passo 0: «conferir num comando só»), `:276-281` (Task 3, Passo 1: «a enumeração e o push num comando só»), `:313-314`

**Issue:** O apply tem comando literal, com a conferência dentro (`:222`). O push do código não tem: o executor compõe na hora a enumeração (`git log --format='%H %s' <remoto>..S` + `git diff-tree` por commit + regra de assunto) e o push. Dois riscos medidos no -7 se repetem:
- a regra vira interpretação, e o `-7` chamou isso de WR-19;
- o hook `guard-git.sh` bloqueia qualquer comando com `push` seguido de `" -f"` (`*push*" -f"*`). Um `cut -f1`, idioma natural para extrair o sha, faz o «num comando só» ser barrado (IN-23 do -7).

A regra de assunto também é fraca: um commit `docs(49-45): …` que toque `src/` passa por ela, porque o assunto basta. Com a outra janela pausada, nada não revisado chega a PROD. Por isso é WARNING e não crítico.

**Fix:** pôr no plano um comando literal (ou um `gsd-49-45-push.cjs`, como no 49-43) que:
- leia `S=$(git rev-parse refs/gsd/49-45/sha)` e o remoto por `git ls-remote`;
- para cada `h` de `git rev-list "$R..$S"`, exija os arquivos de `git diff-tree --no-commit-id --name-only -r "$h"` todos sob `.planning/`, OU assunto `^(feat|test|fix|refactor)\(49-44\): ` (sem `docs(...)` como passe para código);
- só então rode `git push origin "$S":refs/heads/main`.

Sem `-f` em token nenhum (`awk '{print $1}'` no lugar de `cut -f1`).

## Info

### IN-01: uma janela anterior à linha de score, sem nome. Um flush antigo e bem-sucedido ainda em voo grava depois do flush do envio

**File:** `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts:88-105, 123-129`; cabeçalho da migration `:80-103`

**Issue:** `flush` não serializa as gravações: `flushNow` não espera um `upsert` já em voo. O cenário:
1. O debounce dispara com o texto X.
2. Enquanto essa requisição ainda não chegou ao banco, o candidato edita (Y) e envia.
3. `flushNow` grava Y, e a EF recebe Y.
4. Se X chegar ao banco depois de Y, fica gravado X («último a commitar vence» no `ON CONFLICT DO UPDATE»), e nenhum flush falhou.

Não é R1 (nada falhou), não é R2 (nada foi editado depois do envio) e não é R3 (o cliente não foi modificado). A rota (i) não fecha («flush bem-sucedido» ≠ «último commit»); a (ii) fecha. É raro: com HTTP/2 numa conexão só, a ordem de chegada se preserva. Exige transporte com fluxos independentes (HTTP/3) ou conexões separadas. Registro para a enumeração ficar completa no cabeçalho imutável.

**Fix:** nomear como R4 no cabeçalho e no item (c). Conserto de código, se o operador quiser: `flushNow` aguarda a promessa em voo antes de gravar.

### IN-02: «o helper não é oráculo» não é vigiado

**File:** smoke `:286-299`; runner `:92-97`

**Issue:** (a) só prova o ACL do `anon`. Nenhuma cláusula chama `caso_aberto_sjt_enviado` como `authenticated` NÃO titular sobre uma candidatura enviada e exige `false`. E nenhuma mutação tira `AND ca.user_id = v_uid`. Sem essa condição as políticas continuariam funcionando, e o helper passaria a revelar a qualquer autenticado se uma candidatura (pelo uuid) já tem nota. Impacto baixo (T-49-44-07, low).

**Fix:** em (a) ou (g), com claims do titular de F, `PERFORM`/`SELECT public.caso_aberto_sjt_enviado(v_cids[c_a])` tem de dar `false` (A está enviada). Mais uma mutação M10 sem a condição de titular, esperando a letra dessa sonda.

### IN-03: a metade comportamental de (h) não discrimina, e o cabeçalho e o checklist do 49-45 descrevem o mecanismo errado

**File:** smoke `:71-75, 479-490`; migration `:71-74`; `49-45-PLAN.md:137`

**Issue:** O UPDATE de (h) roda como `postgres`, que tem `rolbypassrls = true` (medido). Passaria com QUALQUER política, até `TO public`. Quem prova algo em (h) é a metade de catálogo (`prosecdef`, dono, FORCE). O cabeçalho diz que o motor não é alcançado porque as políticas são «`TO authenticated`», mas o `executar-direito-titular` chama o motor **pelo client do titular** (`index.ts:1015`), e quem chama é `authenticated`. O que mantém o motor fora é ele ser SECURITY DEFINER com dono `postgres` (dono da tabela, com BYPASSRLS). O checklist do 49-45 também chama essa EF de «(service_role)». O fato está seguro; a explicação está errada.

**Fix:** corrigir a frase do cabeçalho antes do apply («o motor é chamado por `authenticated` e pelo service_role, mas executa como `postgres`, dono da tabela, com BYPASSRLS»). Em (h), declarar que a parte comportamental é controle de população e não prova da exclusão.

### IN-04: (c) não exige que o administrador escolhido seja diferente do dono da vaga

**File:** smoke `:151-158`

**Issue:** Hoje são pessoas diferentes (medido: `admin_e_dono = false`), mas o smoke não assere isso. Se coincidirem, (c) passa mesmo que o ramo do administrador passe a exigir posse. É uma fotografia que pode envelhecer.

**Fix:** `AND u.user_id IS DISTINCT FROM v_dono` na escolha do administrador, com `P49C FAIL (baseline)` se não houver nenhum.

### IN-05: o servidor e o cliente discordam sobre «texto vazio»

**File:** migration `:253-256` (`btrim`, que só apara espaço); `scoresRhService.ts:233` (`trim()`, que apara `\n`, `\t` e NBSP)

**Issue:** Um texto gravado só com quebras de linha, tab ou NBSP (alcançável pela janela de R2: tela reaberta, Enter, blur) sai do servidor como `disponivel`. O cliente lança `DATABASE_ERROR`, e o RH vê «Não foi possível carregar a resposta.» com um «Tentar de novo» que nunca resolve. Deveria ver `indisponivel`.

**Fix:** no servidor, `(v_resp ->> 'texto') ~ '[^[:space:]]'` (ou `btrim(x, E' \t\r\n ')`), com o mesmo predicado nos dois lados.

### IN-06: a composição da tela sugere que o texto mostrado é o analisado, e o RH não vê caracteres invisíveis

**File:** `ConsolidacaoDashboard.tsx:135-147`; `RespostaCasoAbertoSjt.tsx:29, 80-83`

**Issue:** O texto aparece logo abaixo do rótulo «Possível instrução dirigida à IA **no texto analisado** — revise o texto…», com o título «Resposta do candidato ao caso aberto». Nenhuma frase isolada afirma fidelidade, e o teste de cópia (`/analisad|avaliad/`) só olha as frases do componente. A justaposição, porém, diz ao RH que aquele é o texto analisado. O item (c) avisa o operador de que é «sem aviso ao RH», então é escolha informada. Além disso:
- caracteres de formato invisíveis (zero-width, tags Unicode, bidi), que o modelo lê e o navegador não mostra, ficam invisíveis para quem «revisa o texto»;
- `whitespace-pre-line` colapsa espaços.

**Fix:** título «Último texto salvo pelo candidato no caso aberto» (não alega fidelidade e é exato). Se o operador quiser, marcar quando o texto contém `\p{Cf}`.

### IN-07: escolhas do planejador sem a marca «do planejador» no cabeçalho imutável e nos docblocks

**File:** migration `:42-45` (ESTADOS, escolha 5), `:113-121` (os dois SET LOCAL e os tetos 3 s / 5 s), `:123-133` (ERRO/AUTHZ); `RespostaCasoAbertoSjt.tsx:6-10` (escolha 6)

**Issue:** As seções vizinhas marcam a autoria («escolhas do PLANEJADOR», «escolha 4 do planejador», «Resíduo aceito pelo planejador»); estas não. Nenhuma delas é atribuída ao operador, então não há atribuição falsa. Só falta a marca que o pedido exige.

**Fix:** acrescentar «(escolha N do planejador, vetável no 49-45 (a))» a cada uma, antes do apply.

### IN-08: o smoke ao vivo roda sem a conferência «HEAD = S», e um (z) por tráfego para a publicação sem caminho de repetição

**File:** `49-45-PLAN.md:251`; smoke `:171`, `:668-682`

**Issue:** Só o apply confere, no mesmo comando, que o arquivo é o do sha fixado. O `<verify>` 2 lê o smoke da árvore de trabalho. E a baseline global de (z) inclui `net.http_request_queue`, que o worker do `pg_net` esvazia em paralelo, em READ COMMITTED. Um item pendente consumido durante a requisição reprova (z) com «rodar de novo». O plano diz «Vermelho em qualquer um: PARAR antes do push», sem distinguir esse caso. O estado fica seguro; só a publicação para.

**Fix:** prefixar o `<verify>` 2 com `test "$(git rev-parse HEAD)" = "$(git rev-parse refs/gsd/49-45/sha)" && git diff --quiet "$S" -- supabase/tests/p49_44_resposta_caso_aberto_smoke.sql &&`, e permitir UMA repetição quando a única reprovação for (z) com resíduo zero das fixtures.

### IN-09: o desfazer pelo front deixa `origin/main = S`, e o próximo push republica o front novo

**File:** `49-45-PLAN.md:109-114, 310-315`

**Issue:** «Promover a produção anterior na Vercel» não muda o `main`. O push do STATE (Task 3, Passo 4) ou qualquer push posterior, mesmo só de `.planning/`, gera nova produção a partir do `main`, e o front com o botão volta sem ninguém pedir. Se o banco já tiver sido desfeito, o botão passa a falhar (com erro honesto, sem quebrar).

**Fix:** no «Desfazer», acrescentar um `git revert` dos commits de front, empurrado por sha, ou registrar que nenhum push ao `main` pode acontecer até o banco e o front estarem consistentes.

---

_Reviewed: 2026-10-03T14:28:30Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
