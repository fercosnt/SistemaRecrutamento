---
phase: 50-acesso-do-recrutador
reviewed: 2026-10-06T02:48:52Z
depth: deep
diff_base: 9271ba4325dd5f9095c10980b2e1ce349a0067ba
reviewed_head: 884a41d124f94ca778827f933006f1b69c2545ec
scope: revisão adversarial bloqueante da expansão (50-10 Task 1). Escopo — `git diff refs/gsd/50-expansao/base..HEAD -- . ':!.planning'` (34 arquivos) mais o `50-10-PLAN.md`, lido como o programa que escreve em PROD. Contexto lido, fora da lista — 50-03..50-09 SUMMARY, 50-REVIEW-TRACER-3, 50-CONTEXT, 50-RESEARCH, deferred-items, p46apply.cjs, efdeploy.cjs, scripts/p50_enumera.cjs, CLAUDE.md. PROD só leitura (`set transaction read only`) ou em requisições que abortam.
files_reviewed: 35
files_reviewed_list:
  - supabase/migrations/20261005000002_p50_policies_rh_ativo.sql
  - supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql
  - supabase/migrations/20261005000004_p50_rpcs_escrita.sql
  - supabase/functions/comparativo-candidatos/index.ts
  - supabase/functions/comparativo-candidatos/__tests__/index.test.ts
  - supabase/functions/get-curriculo-url/index.ts
  - supabase/functions/get-curriculo-url/index.test.ts
  - supabase/functions/consolidar-decisao-final/index.ts
  - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
  - supabase/functions/avaliar-transcricao-entrevista/index.ts
  - supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts
  - src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts
  - src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts
  - src/features/triagem/services/triagemService.ts
  - src/features/vagas/services/cvUploadService.ts
  - src/features/vagas/services/vagasService.ts
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p50_vistas_externas.sql
  - supabase/tests/funil34_kpis_smokes.sql
  - supabase/tests/oper31_rejeitar_candidatura_smokes.sql
  - supabase/tests/p37_fidelidade_schema_smoke.sql
  - supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql
  - supabase/tests/p44_pedidos_dados_smoke.sql
  - supabase/tests/p46_fixture_elegivel.sql
  - supabase/tests/p47_historico_smoke.sql
  - supabase/tests/p49_44_resposta_caso_aberto_smoke.sql
  - supabase/tests/sec05_08_smokes.sql
  - supabase/tests/seg32_smokes.sql
  - supabase/tests/seg33_agendamento_smokes.sql
  - scripts/p50_ensaio.cjs
  - scripts/p50_mutacoes.cjs
  - scripts/p50_varredura.cjs
  - scripts/p50_vitest_delta.cjs
  - .planning/phases/50-acesso-do-recrutador/50-10-PLAN.md
findings:
  critical: 0
  warning: 10
  info: 8
  total: 18
status: issues_found
---

# Phase 50: Code Review Report — revisão bloqueante da expansão (50-REVIEW-ACESSO-1)

**Reviewed:** 2026-10-06T02:48:52Z
**Depth:** deep
**Files Reviewed:** 35 (34 arquivos de código desde `9271ba43` + `50-10-PLAN.md`)
**Status:** issues_found, com 0 crítico

## Summary

Parti da hipótese de que havia defeito e conferi cada ponto da instrução por execução sempre que era possível. **Não achei
blocker:** nada no que vai a PROD produz comportamento incorreto, exposição a ator externo nem perda de D-08/D-23/REVISAO-05.
Os 10 warnings estão quase todos nos **portões e no programa do 50-10**: lugares em que um portão pode ficar verde pelo motivo
errado, ou em que a amarração «aplicado = revisado» tem uma brecha. Há também dois pontos de integridade nas EFs, ambos
latentes hoje porque a população afetada é 0.

### O que foi provado por execução (nada aplicado, nada enviado, ledger p50 continua `["20261005000001"]`)

| prova | resultado |
|---|---|
| **Corpos reescritos × corpo VIVO.** `pg_get_functiondef` das 18 funções lido de PROD (só leitura), separado do 0003/0004 por programa, `diff` linha a linha | Só mudaram: a linha de autorização; a coluna de autoria tirada do SELECT/INTO/DECLARE (vira `PERFORM 1`, com o mesmo FROM/JOIN/WHERE); `coalesce(v_role,'')` no lugar de `v_role IS NULL OR v_role NOT IN`; `v_uid IS NULL OR coalesce(…)` nas duas guardas que falhavam aberto (D-04); `IF NOT FOUND` no save_entrevista_guia_edits (BORDA); qualificação `public.` dos tipos na assinatura; e comentários. `md5(prosrc)` vivo = o medido no pré-portão nas 18. D-23 (`d.por_usuario = v_uid`/`h.por_usuario = v_uid`), `pode_responder`, `entrevista_analise_vigente`, `candidatura_encerrada(`, `FOR UPDATE OF ea`, mínimos de justificativa e transições estão byte-idênticos (o pós-portão do 0004 ainda prova a CAUDA por md5) |
| **0002 × qual vivo** | 13 `ALTER POLICY`, nenhum DROP/CREATE, nenhuma policy de titular. O disjunto do administrador é recortado e comparado antes × depois, no USING e no CHECK. `TO authenticated` nas 13 |
| **ACL** | `anon` está NOMEADO no REVOKE das 6 funções que tinham EXECUTE para ele (funil_kpis, rejeitar_candidatura, reprocessar_analise, save_entrevista_guia_edits, salvar_revisao_redacao, upsert_pergunta_opcoes_metadata). O pós-portão compara a ACL «capturada menos anon» |
| **Chamadores internos** de `reprocessar_analise`/`salvar_revisao_redacao` sem JWT (que o fail-closed derrubaria) | Nenhum. `prosrc` e `cron.job` varridos; o único hit é um comentário em `registrar_analise_entrevista` |
| **D-08** | O motor de exclusão não referencia nenhuma das 18 funções nem a view. As duas funções são DEFINER e por isso não leem as policies alteradas. A impressão digital `to_jsonb(pg_proc)` é igual no início e no fim dos PÓS-PORTÕES (`04:d08=igual:n=2`, `05:d08=igual:n=2`) |
| `node scripts/p50_ensaio.cjs --vistas supabase/tests/p50_acesso_recrutador_smoke.sql` | `ENSAIO VERDE … prefixadas=[…0002,…0003,…0004] · vistas=igual+fechou[anon.public.{decisao_final_historico,entrevista_analises,entrevista_guias,scores_candidato}] · smoke50=13/13`; `07:vacuos=-`, `07:d23=comportamental`, `07:cobertura=183/183` (storage:26, cron:2) |
| `node scripts/p50_mutacoes.cjs` | `controle verde; 23/23 mutacoes mordem; nada persistiu` (rc 0) |
| `node scripts/p50_varredura.cjs --modo=ensaio` | `varredura: 27 arquivos · ok=17 reescritos=9 pre-existentes=1 inconclusivos=0 · regressoes=0 investigar=0` (rc 0) |
| Enumeração do push (sem `--revisoes`/`--aplicado`, só leitura) | 36 commits, todo commit de código casa a allowlist e o assunto. Nenhum ALHEIO |
| Varredura de forma do CLAUDE.md sobre `supabase/tests/*.sql` | 363 linhas. Todo achado novo nos arquivos da fase é escopo deliberado: `v_rc <> 1` das sementes, negativas `<> 0`, `proname IN` do p44 com as duas RPCs que ele especifica |

**Fechamento «A» (10ca729a/6980af3d).** Conferi a regra no COMPARA e no verify do 50-10. Ela aceita só `e:<SQLSTATE>` →
`n:0:<md5('')>`, com população > 0 nas duas fotos. O estado final é exatamente vazio, então ela não pode esconder exposição.
Também não esconde regressão funcional: um ator que via as próprias linhas e passa a ver 0 sai de `n:k`, não de `e:`, e
reprova. A regra é sólida.

**`40001`→INCONCLUSIVO (efa76d97).** `classificarSaida` varre a saída INTEIRA, evidência inclusive, antes de qualquer `FAIL (`.
Um 40001 engolido por um `WHEN OTHERS` dentro do smoke (p.ex. na semente do D-23) ainda aparece no texto da evidência e é
classificado. Não há como transformar vermelho em inconclusivo, a não ser que o texto do vermelho contenha o literal.

**Smoke recusa fora do ensaio (d97dd0cd).** A marca `p50.tx` é LOCAL e comparada com `txid_current()`. Um valor velho de
sessão do pool nunca casa.

**Ordem do 50-10.** pin → antes → ensaio de ida → apply ×3 → depois → EFs → push. As conferências estão no mesmo comando de
cada escrita. As migrations vêm ANTES das EFs: no estado intermediário as EFs velhas ainda exigem posse, que é a direção
segura. Está correto.

## Warnings

### WR-01: a varredura ao redor do apply pode dar verde pelo motivo errado — vermelho→vermelho num arquivo reescrito vira `pre-existente`, o exit da rodada «depois» é ignorado e as rodadas não carregam carimbo de ledger

**File:** `scripts/p50_varredura.cjs:224-229`, `:306-312`; `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:179`
**Issue:** Três brechas na mesma prova.
1. `veredito()` classifica VERMELHO/VERMELHO com a mesma primeira cláusula como `pre-existente`, e `pre-existente` não reprova.
   Os 9 arquivos reescritos (sec05_08, seg32, seg33, p37_lacunas, oper31, funil34, p47, p44, p49_44) são VERMELHOS antes do
   apply **por construção**: dependem da expansão. Se algum continuar vermelho depois, na mesma cláusula, a linha final sai
   `regressoes=0 investigar=0` e o verify do 50-10 passa. A regra «`pre-existente` tem de bater com a lista do 50-09» está só
   na prosa do Step 3, sem automação.
2. O verify roda `--modo=rodada --rotulo=depois … ;` e depois `--comparar`, separados por `;` e não por `&&`. Uma rodada
   «depois» que sai com `PERSISTIU` (exit 1, antes do `writeFileSync`) deixa no lugar o JSON de uma tentativa anterior. O
   `--comparar` lê esse JSON velho e fica verde. E a linha `PERSISTIU`, que é a mais grave, só aparece num log que ninguém lê.
3. O JSON da rodada não tem carimbo de ledger. A sonda de vistas ganhou `ledger_p50` justamente por isso (WR-07 do TRACER-1).
   Um «antes» refeito depois do apply compara depois × depois e fica verde por construção.

**Failure scenario:** O 0003 está aplicado, mas um efeito esperado não aparece, p.ex. o p44 (k) segue `P44 FAIL (k)`. A
comparação devolve `pre-existente`, o verify imprime a linha verde e o SUMMARY registra «sem regressão».
**Fix:**
```js
// veredito(): vermelho/vermelho num arquivo alterado desde a base é falha, não pré-existente
if (a.estado === 'VERMELHO' && b.estado === 'VERMELHO')
  return alteradoDesdeBase(f) ? 'INVESTIGAR' : (a.clausula === b.clausula ? 'pre-existente' : 'INVESTIGAR');
// rodada: gravar E.lerEstado().ledger em saida.ledger; --comparar exige antes sem e depois com 20261005000002..4
```
No verify: `node scripts/p50_varredura.cjs --modo=rodada --rotulo=depois > … 2>&1 && node scripts/p50_varredura.cjs --comparar …`.

### WR-02: as cadeias do apply e do deploy leem a revisão da árvore de trabalho sem exigir que ela esteja commitada nem que cubra a base (IN-03 do TRACER-3, re-levantado com cenário)

**File:** `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:165`, `:202`
**Issue:** O Step 2 e o deploy escolhem `50-REVIEW-ACESSO-<maior N>.md` por `ls`. A checagem de árvore limpa cobre só
`supabase src scripts p46apply.cjs efdeploy.cjs`; `.planning` fica de fora. A exigência de «commitado uma única vez» e a de
`diff_base` ⊑ base estão só no verify do Task 1, que roda uma vez, no resume. Um `50-REVIEW-ACESSO-2.md` não commitado (de uma
rodada de conserto em andamento, ou de outra janela — memória «Publicação com janela concorrente») com `critical: 0` e
`reviewed_head` = pin satisfaz trivialmente «código do pin = código revisado».
**Failure scenario:** Um conserto de código é commitado depois do verify do Task 1, a revisão nova está sendo escrita e ainda
não foi commitada, e o executor retoma o Step 0. Ele fixa o pin no HEAD novo, e o apply aceita a revisão não commitada como
amarração.
**Fix:** Nas duas cadeias, logo depois de `F=…`:
`test "$(git rev-list --count HEAD -- "$F")" = 1 && git diff --quiet HEAD -- "$F" && test -z "$(git status --porcelain -- "$P")" || { echo "REVISAO NAO COMMITADA OU PLANNING SUJO: $F"; exit 1; }`,
mais a checagem de `diff_base` ancestral de `refs/gsd/50-expansao/base` copiada do Task 1.

### WR-03: o deploy exige `HEAD = pin`, enquanto o push aceita commits de planning entre os dois — um commit de STATE/SUMMARY depois do Task 2 trava as EFs com as migrations já no ar, e o plano não escreve a saída

**File:** `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:154`, `:202`, `:206-208`
**Issue:** A cadeia de deploy faz `test "$(git rev-parse HEAD)" = "$S"`. O Step 0 proíbe refixar o pin. O texto do Task 3 só
prevê commits de planning DEPOIS do deploy. Já o fluxo do GSD costuma commitar o estado entre as tarefas, e o próprio push
admite «planning commits between the pin and HEAD». O resultado é uma recusa (direção segura), mas sem caminho de saída
escrito: o banco já foi alargado, as EFs seguem exigindo posse, e o executor teria de improvisar um `reset` ou refixar o pin.
**Failure scenario:** O executor commita a evidência do Task 2 (STATE/SUMMARY parcial). O deploy das 5 EFs sai `HEAD != PIN`.
O estado meio-publicado fica parado até uma decisão sem roteiro.
**Fix:** Trocar `HEAD = pin` por igualdade de CÓDIGO, como já faz o push:
`git diff --quiet "$S" HEAD -- . ':!.planning' || { echo "CODIGO MUDOU DEPOIS DO PIN"; exit 1; }`, e manter
`git diff --quiet "$RH" "$S" …`. Ou proibir explicitamente qualquer commit entre o Task 2 e o fim do deploy.

### WR-04: não há artefato de desfazer para 0002..0004, e o «Undo» aponta para fontes erradas ou voláteis

**File:** `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:104-107`, `:146`
**Issue:** O plano manda restaurar os corpos a partir do «`statements[1]` das migrations que **criaram**» as funções. O texto
certo é o da ÚLTIMA migration que redefiniu cada uma: registrar_decisao, rejeitar_candidatura e as das filas foram
redefinidas várias vezes (P48-11, 49-10, 49-30…), e a de criação é um corpo antigo. A outra fonte citada, os «dumps do
50-04/50-05», existe só em `$TMPDIR` (`p50_04_defs.json`, `p50_05_defs.json`): fora do repositório, sujeita à limpeza do macOS
em `/var/folders`. O texto antigo dos 13 quals NÃO está no repositório (o 0002 guarda só o md5). O desfazer também precisaria
de 13 COMMENT ON POLICY, 18 COMMENT ON FUNCTION, 8 `TO public` e do `reloptions` da view, e o plano não diz isso. Para
objetos que toda tela do RH lê, isso é arqueologia sob pressão.
**Failure scenario:** O verify pós-apply fica vermelho (p.ex. `ADMIN PERDEU`), e o operador decide desfazer. A migration
corretiva é montada a partir do `statements[1]` de criação e reintroduz um corpo pré-P48-11 (guarda `NOT IN` fail-open),
apagando consertos posteriores.
**Fix:** No Step 1, ainda só leitura, capturar `pg_get_functiondef` + `proacl` + `obj_description` das 18 funções,
`qual/with_check/roles/cmd` + comentário das 13 policies e `reloptions` da view num arquivo commitado (p.ex.
`.planning/phases/50-…/50-10-ANTES.json`). Desse arquivo, gerar por programa um `p50_desfazer_expansao.sql` e ensaiá-lo
uma vez com `p50_ensaio.cjs --vistas --migracoes=… --mutacao=<desfazer>` antes do apply.

### WR-05: depois da fase, a ÚNICA autorização das 5 EFs é `.eq("ativo", true).is("deleted_at", null)`, e nenhum teste reprova se esses filtros sumirem

**File:** `supabase/functions/comparativo-candidatos/__tests__/index.test.ts:154-157`; `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts:83-86`; `supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts:212-215`; `supabase/functions/get-curriculo-url/index.test.ts:56-62`; `supabase/functions/gerar-guia-entrevista/` (sem teste de handler)
**Issue:** Os mocks de `usuarios_rh` devolvem `eq: () => chain, is: () => chain` e ignoram os argumentos. «Sem linha ativa ⇒
403» só é testado com o mock devolvendo `null`. Antes da fase, a posse era uma segunda barreira para o rh: um recrutador
desativado só passaria na vaga dele. Agora, apagar `.eq("ativo", true)` de qualquer das 5 EFs deixa o token de qualquer
recrutador desativado ler CV, scores e análises de TODAS as candidaturas por até 1 h, e as suítes Deno, o Vitest delta e a
sonda `ef-sem-posse-de-vaga` (que só procura posse) continuam verdes. O `gerar-guia-entrevista` nem tem teste de handler.
**Fix:** Fazer o mock registrar os filtros e assertar
`filtros.usuarios_rh ⊇ [['eq','ativo',true],['is','deleted_at',null],['eq','user_id',user.id]]` em cada EF. Ou devolver uma
linha inativa quando o filtro `ativo` não foi aplicado, e exigir 403. Estender a sonda por forma: todo `from("usuarios_rh")`
sob `supabase/functions/` exige `.eq("ativo", true)` e `.is("deleted_at", null)` no mesmo encadeamento.

### WR-06: as EFs não aplicam a regra «só filhos de candidatura VIVA» que a Forma B mantém — o recrutador alcança rascunho e excluída pelas EFs, e não pelo banco

**File:** `supabase/functions/get-curriculo-url/index.ts:165-169` (filtra `deleted_at`, não `is_rascunho`); `supabase/functions/consolidar-decisao-final/index.ts:348-357`; `supabase/functions/gerar-guia-entrevista/index.ts:254-258`; `supabase/functions/avaliar-transcricao-entrevista/index.ts:232-235`; `supabase/functions/comparativo-candidatos/index.ts:302-304`
**Issue:** A escolha do planejador (Shape B, vetável no Task 1 (a)) é que o rh veja só filhas de candidatura viva
(`deleted_at IS NULL AND is_rascunho = false`). As EFs leem com service_role e:
- o get-curriculo-url entrega o CV de um RASCUNHO, de alguém que nunca se candidatou;
- o consolidar devolve o breakdown de scores de candidatura excluída/rascunho;
- o avaliar-transcricao roda IA e GRAVA (`registrar_analise_entrevista`) análise ligada a candidatura excluída;
- o gerar-guia lê scores de candidatura morta.

Antes da fase isso valia só para o autor da vaga (e para o admin); agora vale para todo rh ativo. Medido hoje: 0
candidaturas mortas/rascunho, então nada vaza hoje (memória «População vazia mente»).
**Failure scenario:** Um candidato sobe CV no wizard e abandona o rascunho, ou a candidatura é excluída a pedido. Qualquer
recrutador ativo obtém a URL assinada do CV ou os scores pelo id, embora a RLS do banco esconda a candidatura dele.
**Fix:** Nas leituras de `candidaturas` dessas EFs, `.is("deleted_at", null).eq("is_rascunho", false)`, com o mesmo 403/404
genérico. No consolidar, ler a candidatura com esse filtro antes de `analise_candidato_vaga`/`scores_candidato`. Isso muda
o comportamento das EFs: precisa de decisão do operador (ou registrar como divergência aceita, junto do Shape B no (a)).

### WR-07: item aberto do `deferred-items.md` — `consolidar-decisao-final` nunca confere que `candidatura_id` pertence a `vaga_id` (classificação: WARNING)

**File:** `supabase/functions/consolidar-decisao-final/index.ts:327-357`
**Issue:** Os pesos vêm de `body.vaga_id` e os scores de `body.candidatura_id`, sem cross-check (o gerar-guia tem um, nas
linhas 252-260). Classifico como WARNING, não BLOCKER:
- a saída é só leitura, advisory (RNF-07a) e nada é gravado;
- o front sempre manda o par da página (`decisaoService.ts:108`);
- depois do D-01 o rh ativo já lê pela RLS os scores de candidaturas VIVAS.

Mas a nota do deferred («deixou de vazar dado») só é verdadeira para candidaturas vivas. Somado ao WR-06, um pedido forjado
lê scores de candidatura excluída/rascunho, e o consolidado sai com os pesos da vaga errada.
**Fix:** Ler `candidaturas.select("vaga_id").eq("id", body.candidatura_id).is("deleted_at", null).eq("is_rascunho", false)` e
devolver o mesmo 403 genérico se faltar ou se `vaga_id !== body.vaga_id`, como no gerar-guia. A decisão é do operador antes
do 50-10. Se ficar fora, registrar a aceitação junto do (a).

### WR-08: em (i), o controle positivo de `save_entrevista_guia_edits` exercita o ramo do ADMINISTRADOR — o caminho real do recrutador nessa RPC nunca roda

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:368-374`, `:1442`, `:1472`
**Issue:** O `a_ativo` é «linha ativa sem vaga, recrutador primeiro». PROD não tem recrutador ativo, e medi que as 3 linhas
ativas são `role = administrador`. Por isso `a_ativo` é um administrador. As outras 17 RPCs leem o papel do claim forjado
`rh`, então o ramo rh roda. `save_entrevista_guia_edits` lê o papel de `usuarios_rh` (ENTREV-08), não do claim: para
`a_ativo`, `v_role = 'administrador'`, e a linha `IF v_role = 'rh' AND NOT public.is_active_rh_user()` nunca é alcançada pelo
positivo. O negativo `velho` também não a alcança, porque a busca de papel já filtra `ativo`. (b)/(c) trocam o papel para
`recrutador` só dentro dos próprios envelopes.
**Failure scenario:** Uma regressão futura bloqueia o recrutador nessa RPC (p.ex. `IF v_role = 'rh' THEN RAISE 42501`, sem
posse, então (j) não acusa). O smoke sai 13/13 e o runner 23/23. O RH2 do 50-11 não consegue salvar o guia.
**Fix:** Dentro do envelope de (i), `UPDATE public.usuarios_rh SET role = 'recrutador' WHERE user_id = v_ativo` (com a mesma
guarda anti-lockout da baseline) antes das sondas, ou rodar a sonda `ativo` dessa RPC com a troca de papel. E acrescentar uma
mutação que bloqueia o rh em `save_entrevista_guia_edits` e tem de morder em (i).

### WR-09: a prova comportamental do D-23 pode cair para `estrutural` em silêncio, e o 50-10 aceita; nenhuma mutação morde o D-23

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:1991-2005`, `:2047-2051`; `scripts/p50_mutacoes.cjs` (M19 cobre só REVISAO-05); `50-10-PLAN.md:175`
**Issue:** Uma falha NÃO transitória na semente (CHECK, trigger ou mudança de coluna em `decisao_final`) põe
`v_d23 := 'estrutural'`. A cláusula (l) passa então só com o literal `d.por_usuario = v_uid`. O verify do smoke ao vivo exige
`smoke50=13/13` e só REGISTRA o `evidencia=`. Nada reprova `07:d23=estrutural`. A prova do D-23 neste apply está segura,
porque o pós-portão do 0004 compara a CAUDA de `registrar_decisao` por md5. O portão RECORRENTE, porém, é fraco: um corpo
futuro que mantenha o literal e neutralize o predicado (`IF false AND EXISTS (… d.por_usuario = v_uid …)`) passa (l) e o runner.
**Fix:** No verify do smoke do 50-10, `grep -q '07:d23=comportamental>e:42501' "$T/p50_10_smoke.log"` (estrutural = PARADA para
o operador, como já diz o Task 1 (a)). No runner, M24: `registrar_decisao` com o bloco D-23 trocado por `IF false AND …`, que
tem de reprovar em `(l) [d23]`.

### WR-10: `capturar()` segue cega aos corpos das funções que TODO ensaio prefixa (WR-07 do TRACER-3, com alcance maior)

**File:** `scripts/p50_ensaio.cjs:23-24`, `:301-312`
**Issue:** Sem mudança desde o TRACER-3. Desde o 50-07, cada ensaio, cada mutação e cada linha B da varredura prefixa
0003/0004, que fazem CREATE OR REPLACE de 18 funções. A checagem de persistência compara o helper, as policies de `public`,
`usuarios_rh`, a borda e o ledger, mas não os corpos/ACL dessas 18 nem os do D-08. As guardas `p50.tx` tornam o commit no meio
improvável, mas o detector que deveria acusar o rastro não olha para o objeto mais alterado.
**Fix:** Acrescentar a `capturar()`
`json_object_agg(p.oid::regprocedure::text, md5(p.prosrc)||p.proacl::text)` sobre as funções de `public` que as migrations da
fase nomeiam (lidas por forma, como `nomesDaFase()` da varredura), mais `anonimizar_candidato`/`plano_exclusao_titular`.

## Info

### IN-01: o helper ignora o papel — o resíduo «recrutador rebaixado a visualizador, ainda ativo, com token `rh` por até 1 h» agora vale para as 11 RPCs de escrita

**File:** `public.is_active_rh_user()` (0001, vivo), usado em `20261005000002/3/4`
**Issue:** O operador aceitou esse resíduo no 50-02 para leituras. A expansão o estende a decidir, rejeitar, liberar o
cognitivo e reprocessar em qualquer candidatura. As EFs NÃO têm o resíduo, porque leem `role = 'recrutador'` ao vivo. A lista
do Task 1 (a) do 50-10 não o reapresenta.
**Fix:** Reapresentar no (a) como vetável, ou fazer o helper exigir `u.role IN ('recrutador','administrador')`.

### IN-02: a sonda `ef-sem-posse-de-vaga` só conhece um idioma de posse

**File:** `src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts:55-56`
**Issue:** A sonda não casa `.eq("created_by", user.id)`, `.match({ created_by: user.id })` nem aliases
(`const uid = user.id; … created_by !== uid`). Hoje nenhuma EF usa `created_by` como autorização (conferido por grep), então
não há ofensor. A sonda não é oca (o C morde), mas é estreita.
**Fix:** Acusar `created_by` em qualquer `.eq/.match/.filter` sobre `vagas`, e qualquer `created_by` comparado com
identificador vindo de `user.id`.

### IN-03: a varredura por forma (j) não lê definições de view nem guardas rh fora de `v_role = 'rh'`/`= 'rh'::text`; 9 policies só-de-papel dão ao token velho 1 h de leitura

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:1641-1670`
**Issue:** Faltam `pg_views.definition` e funções que testam o papel por outro nome. Hoje nenhuma view casa
`auth.uid`/`auth.jwt` com `created_by` (medido). Medi também 9 policies `= ANY (ARRAY['rh','administrador'])` sem o helper
(`devolutivas_candidato.rh_le_devolutivas`, `bigfive_itens`, `perguntas`, `pergunta_opcao_metadata`, …). O token de um
recrutador desativado as lê por até 1 h. É pré-existente e fora do alargamento, mas o D-02 «fecha a janela de 1 h» só vale
para os ramos alargados.
**Fix:** Registrar no todo 42 / fila do M8. Estender (j) a `pg_views`.

### IN-04: as 40 mordidas dos legados (22 no 50-08, 18 no 50-09) dependem de runners fora do repositório

**File:** `$SCRATCH/p50_08_mordidas.cjs`, `$SCRATCH/p50_09_mordidas*.cjs` (sessão `359e97f8…/scratchpad`)
**Issue:** Li o runner do 50-08: a lógica é sólida, morde na letra e repete o exit 3 uma vez. Como evidência pontual de
«não vácuo» na data, é aceitável. Como portão, não: não é reproduzível depois da sessão, não foi revisado em git, e o 50-10 não
o roda de novo ao vivo. A varredura só detecta verde→vermelho, nunca «ficou vácuo».
**Fix:** Commitar os runners em `scripts/p50_mordidas_legados.cjs`, ou aceitar explicitamente no SUMMARY do 50-10 que a
não-vacuidade dos legados foi provada uma vez, antes do apply.

### IN-05: as filas (D-03) e as tabelas de Forma A mostram ao rh linhas de candidatura morta que a Forma B esconde

**File:** `20261005000003_p50_rpcs_leitura_filas.sql:299-360`; `20261005000002_p50_policies_rh_ativo.sql:261-273`
**Issue:** `listar_revisoes_decisao` passa a devolver ao rh revisões de candidatura excluída/rascunho (é o conjunto do
admin, D-03), mas `rh_le_decisao_final` (Forma B) esconde a mesma decisão: o item da fila abre uma página vazia.
`rh_le_analise`/`rh_le_comparativo` (Forma A) mostram análises de candidatura morta. É a semântica efetiva de antes, só que
para todas as vagas. A população é 0 hoje.
**Fix:** Nenhum agora. Registrar como incoerência conhecida junto do Shape B no Task 1 (a).

### IN-06: o pós-portão das 3 migrations grava `p50.evidencia` em nível de SESSÃO na conexão do pool de PROD

**File:** `20261005000002…:541-545`, `20261005000003…:876-881`, `20261005000004…:1351-1356` (`set_config(…, false)`)
**Issue:** No apply real a transação commita, e a GUC fica na sessão do pool. O PREFIXO do ensaio a zera, então não
contamina veredito. É só estado residual numa conexão de PROD.
**Fix:** Nenhum para este apply. Em migrations futuras, preferir `true` (LOCAL) e carregar a evidência pelo sentinela.

### IN-07: `v_uid` morto em duas filas; `reprocessar_analise`/`salvar_revisao_redacao` ainda leem a candidatura ANTES da guarda de papel

**File:** `20261005000003…:214`, `:272`; `20261005000004…:624-641`
**Issue:**
- Em `listar_pedidos_dados` e `contar_pedidos_dados_pendentes` o `v_uid` é declarado e não é usado. O fail-closed com sub
  nulo depende do helper, o que é correto.
- Nas duas funções do D-04, um autenticado sem papel (candidato) ainda distingue id existente (42501) de inexistente (P0002).
  O anon perdeu EXECUTE. É pré-existente, e a fase preservou a ordem de propósito (pós-portão (h)).

**Fix:** Retirar o `v_uid` morto numa fase futura. Mover a guarda para antes da busca, como a P48-11 fez em `registrar_decisao`.

### IN-08: o delta do Vitest mascara um teste pré-existente que passe a falhar por outro motivo; as suítes Deno das EFs não rodam de novo no 50-10

**File:** `scripts/p50_vitest_delta.cjs:178-181`; `50-10-PLAN.md:200-204`
**Issue:** O id de falha é por nome. Os 2 pré-existentes do `promessasComExecutor` ficariam «pre-existentes» mesmo falhando
por causa nova. O `deno test` das 5 EFs rodou no 50-06/50-09, mas não está na cadeia do deploy. O código delas não mudou
desde então, então o risco é baixo.
**Fix:** Imprimir e comparar também a primeira linha da mensagem de falha. Opcionalmente, rodar `deno test` das 5 EFs no pin
antes do primeiro `efdeploy`.

## Itens carregados do 50-REVIEW-TRACER-3 (estado; não recontados acima)

| id TRACER-3 | estado | onde |
|---|---|---|
| WR-01 40001 contado como mordida | **fechado** (efa76d97) — conferido: classificação antes de `FAIL (`, repetição única, exit 3 | `p50_ensaio.cjs:487-493` |
| WR-02 diagnósticos «tráfego concorrente» | **fechado** (c12fc169) — (z) aponta para escrita fora do envelope | smoke `:2095` |
| WR-03 smoke que escreve pela via que commita | **fechado** (d97dd0cd, 07d1a970) — recusa em `p50.tx`, 50-10 roda só pelo ensaio | smoke cabeçalho; `50-10-PLAN.md:175` |
| WR-04 «MUDOU SEM TRAFEGO» sem conferir atores | **aberto, aceito** — copiado no verify de vistas; decidido pelo ensaio de ida (Step 1 d) | `50-10-PLAN.md:177` |
| WR-05 numeração M7..M18 | **fechado** (fb5bb8ea) — `MUTACOES.length` = 23 | runner |
| WR-06 amarrações do 50-10 | **fechado** (7846375d), com as brechas novas WR-02/WR-03 acima | `50-10-PLAN.md:165, 202, 208` |
| WR-07 `capturar()` sem corpos | **aberto** → WR-10 acima | `p50_ensaio.cjs:23` |
| WR-08 anon `e:42501` como fotografia | **parcialmente resolvido** pelo fechamento «A» | COMPARA |
| IN-01 `BEGIN ATOMIC END;` vazio | **aberto** (código inalterado; nenhum arquivo do repo tem a forma) | `p50_ensaio.cjs:424-437` |
| IN-03 revisão lida da árvore | **aberto** → WR-02 acima | — |
| IN-08 50-11 sem `--revisoes` | **fechado** (7846375d) | `50-11-PLAN.md` |
| IN-11 sec05_08 vermelho até o 50-08 | **fechado** — `esperado-reescrito` na varredura | — |

## Disposição sugerida antes do apply

Nenhum crítico. O portão de `critical: 0` do Task 1 fica satisfeito por este arquivo. Recomendo que o operador decida antes
do Task 2:
- **WR-01, WR-02 e WR-03:** mexem só no plano e no script, e endurecem as conferências do próprio apply;
- **WR-04:** captura de «antes» commitada e desfazer ensaiado;
- **WR-06 e WR-07:** mudam EFs e por isso exigem nova rodada de revisão (`50-REVIEW-ACESSO-2`).

Os outros podem ficar registrados no SUMMARY, com o autor da disposição.

---

_Reviewed: 2026-10-06T02:48:52Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
