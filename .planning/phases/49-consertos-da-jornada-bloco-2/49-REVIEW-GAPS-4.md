---
phase: 49-consertos-da-jornada-bloco-2
reviewed: 2026-09-30T20:22:10Z
depth: deep
diff_base: 00557271
scope: re-revisão adversarial da rodada de conserto do 49-REVIEW-GAPS-3 (CR-02 pela opção «1» do operador, WR-06, IN-06, IN-07, IN-08; commits 44702539, 483e25ae, 737cdb0c, c9f19cb7, 1371a2a8, 022458f2), com reavaliação de 62b446d1..HEAD no que o conserto mudou de comportamento
carried_from: 49-REVIEW-GAPS-3 (WR-01, WR-02, WR-03, IN-01..IN-05 — carried, not in fix scope)
files_reviewed: 20
files_reviewed_list:
  - src/features/avaliacao/components/ScorecardAvaliacao.tsx
  - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
  - src/features/decisao/components/__tests__/ConsolidacaoDashboard.test.tsx
  - src/features/decisao/schemas/consolidacaoSchema.ts
  - supabase/functions/_shared/__tests__/ai-client.test.ts
  - supabase/functions/_shared/audit-logger.ts
  - supabase/functions/avaliar-redacao/__tests__/index.test.ts
  - supabase/functions/avaliar-redacao/index.ts
  - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
  - supabase/functions/consolidar-decisao-final/index.ts
  - supabase/functions/_shared/sinal-revisao.ts
  - supabase/functions/_shared/ai-client.ts
  - src/features/decisao/components/DecisaoFinalPage.tsx
  - src/features/decisao/services/decisaoService.ts
  - src/features/decisao/hooks/useConsolidacao.ts
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/avaliacao/services/avaliacaoService.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
  - .planning/phases/49-consertos-da-jornada-bloco-2/49-43-PLAN.md
findings:
  critical: 1
  warning: 4
  info: 8
  total: 13
status: issues_found
---

# Phase 49: Code Review Report — Rodada de conserto do 49-REVIEW-GAPS-3

**Reviewed:** 2026-09-30T20:22:10Z
**Depth:** deep
**Files Reviewed:** 20 (11 do diff `00557271..HEAD -- . ':!.planning'`; 8 lidos por rastreio de chamada; e o `49-43-PLAN.md`, lido porque é por ele que o conserto chega a PROD)
**Status:** issues_found

## Summary

O escopo é o diff `00557271..HEAD` sem `.planning`: 11 arquivos, 6 commits. Também reavaliei o que o conserto muda na rodada inteira (`62b446d1..HEAD`). Li o `49-REVIEW-GAPS-3.md`, o `49-REVIEW-GAPS-3-FIX.md`, o CLAUDE.md e a memória «re-revisar o conserto antes do apply». Parti da hipótese de que o conserto introduziu defeito.

**No código, o CR-02 está fechado. No caminho até PROD, não está: há 1 crítico novo (CR-03).** O defeito não está no código, e sim no plano que publica o código. O `49-43-PLAN` publica o `avaliar-redacao` com o `status` do CR-01, mas não publica o `consolidar-decisao-final` nem procura o marcador novo. Executado como está escrito, ele põe o CR-02 no ar e todos os portões ficam verdes.

Contagem do frontmatter:
- **novos:** 1 crítico, 1 warning, 3 infos;
- **herdados** do -3, «carried, not in fix scope»: 3 warnings e 5 infos.

**O que rodei (tudo local; nada em PROD, sem deploy, sem push, nenhuma fonte editada):**
- `deno test --allow-all` sobre `_shared/__tests__`, as 7 EFs de IA e `consolidar-decisao-final`: `ok | 688 passed | 0 failed`.
- `CI=true npx vitest run` (suíte inteira): `218 files, 2377 passed`.
- `npm run lint`: **89** erros tsc, igual ao teto.
- `npm run build`: `assert-chunks PASSED`. O `grep -rl 'decisao-sjt-sinal-revisao' build/assets/` dá só `build/assets/DecisaoFinalPage-BfpjJuaG.js`, que é chunk lazy (0 ocorrências em todos os `index-*.js`). O card do `ScorecardAvaliacao` continua fora do build: 0 chunks com `Caso aberto (BARS)`.
- **Mutações numa cópia no scratchpad** (o disco do repositório não foi tocado):

  | Mutação | Resultado |
  |---|---|
  | `avaliar-redacao`: `composite < 13 && !sinalizada \|\| …` | reprova o WR-06 (corte) |
  | `avaliar-redacao`: `… \|\| (hasInsufficient && !sinalizada)` | reprova o WR-06 (insufficient) |
  | `avaliar-redacao`: `… (redFlags.length > 0 && !sinalizada) …` | reprova o CR-01 (red_flag) |
  | `avaliar-redacao`: `… \|\| sinalizada` (o sinal volta ao status) | reprova 2 testes |
  | `consolidar`: `sinaisDasLinhas(sjtRows)` sem o filtro «conta» | reprova «sub-linha que NÃO conta» |
  | `consolidar`: sem o filtro de vocabulário (`ROTULO_SINAL`) | reprova «só códigos do vocabulário» |
  | `consolidar`: sem dedupe | reprova |
  | `consolidar`: chave sempre presente (`[]`) | reprova 4 testes |
  | `consolidar`: sem a guarda `!present` | reprova 5 testes (o `!` de `scoreByTipo.get` estoura em 500) |
  | `ConsolidacaoDashboard`: o aviso não é renderizado | reprova «SJT com sinal → o rótulo aparece JUNTO da etapa SJT» |

**O que foi conferido e está correto:**
- **`sinais_revisao` sai só das linhas que CONTAM.**
  - O predicado `sjtSubLinhaConta` (`consolidar-decisao-final/index.ts:198-200`) é caractere a caractere o `filter` inline antigo: `status === "sucesso" && score != null && score_max != null && score_max > 0`.
  - `normalizeSjtComposite` e `linhasQueContam` (`:391-395`) usam o mesmo predicado.
  - Nas etapas não-SJT, o `[scoreByTipo.get(...)!]` só roda com `present`, e `present` implica que a linha existe.
  - O teste compara a resposta inteira sem o campo novo, com e sem sinal (`assertEquals(semSinais(com), sem)`).
  - Nota, pesos, consolidado e recomendação não leem `sinais`.
- **Segurança.** O diff da EF não toca `getUser`, `usuarios_rh`, a posse da vaga nem a allowlist de colunas (`metadata` já era lida). O campo novo só pode conter chaves de `ROTULO_SINAL`, filtradas por `hasOwnProperty`: nenhum texto do candidato nem da IA vaza, nem um motivo arbitrário gravado no `jsonb`. O `console.log` redigido não ganhou campo.
- **Contrato.**
  - O tipo do front (`consolidacaoSchema.ts:64`, `sinais_revisao?: string[]`) casa com a EF (`index.ts:122`).
  - `decisaoService.getConsolidacao` devolve `data as ConsolidacaoResponse` sem parse zod, então a chave não é descartada no caminho.
  - A chave ausente é tratada (`row.sinais_revisao ?? []`, `ConsolidacaoDashboard.tsx:80`). Uma resposta antiga no cache do TanStack (`staleTime` 5 min, sem persistência em storage: o grep por `persistQueryClient` dá 0) renderiza sem aviso e sem quebrar.
  - Nenhuma tabela grava um instantâneo do breakdown (`decisao_final` não tem coluna de consolidado), então não há registro de auditoria que fique sem o campo.
- **Outros consumidores varridos.**

  | Consumidor | Por que não precisa do rótulo |
  |---|---|
  | `ConsolidacaoDashboard` | É a única tela que exibe a nota SJT. Só a `DecisaoFinalPage` o monta. |
  | Hub (`HubCandidatoRH.tsx:389-399`) | Mostra só uma contagem, sem nota. |
  | `ScoreCard` e listas do RH (`vagasTypes.ts`) | Não leem SJT. |
  | Comparativo (`comparativo-candidatos`) | Lê só `analise_candidato_vaga`. |
  | `gerar-guia-entrevista` | Lê `metadata.competencias`/`competency_scores`, que a SJT não grava (ela grava `dimension_scores`). |
  | Redação cultural e entrevista | Só chegam a `sucesso` por mão humana, em telas montadas que já mostram o rótulo (`RedacaoReviewPanel`, `TranscricaoReviewPanel`). |
  | Decisão Final | Não tem PDF próprio. O PDF existente é o do comparativo, que já leva o sinal desde o 49-42. |

- **WR-06.** Os dois testes mordem (tabela acima).
- **IN-06.**
  - O caminho de bloqueio ficou byte a byte igual (`audit-logger.ts:370`).
  - «o modelo é chamado em seguida» é verdadeiro nos dois caminhos de falha de provedor. O teto de custo roda ANTES da classificação (`ai-client.ts:711`: replay → teto → injeção → provedor). Com o disjuntor aberto, o fallback OpenAI é chamado (`:875-885`).
  - A segunda metade da frase não se sustenta: ver IN-09.
- **IN-07 e IN-08.** Só comentários e título de teste. Conferido pelo `git show` de `1371a2a8` e `022458f2`, filtrando linhas de comentário: só sobra o `describe` renomeado. A «DECISÃO ABERTA» do IN-07 está escrita como aberta («não tomada aqui», `consolidar-decisao-final/index.ts:175-177`), e não como se o operador tivesse decidido.
- **Anexos às SUMMARYs/FIX.** Só acrescentam seções datadas no fim, sem reescrever o texto anterior.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-03: O plano que publica o conserto põe o CR-02 no ar com todos os portões verdes, e o STATE diz que a EF que falta «não tem nada a sincronizar»

**File:**
- `.planning/phases/49-consertos-da-jornada-bloco-2/49-43-PLAN.md:23,34,169,190,196,293`: a lista literal das «7 EFs», que inclui `avaliar-redacao` e não inclui `consolidar-decisao-final`;
- `49-43-PLAN.md:26,219,235`: o portão do front procura `instrucao_ao_modelo`;
- `.planning/STATE.md:1220`: «consolidar-decisao-final … não tem nenhum import de _shared/ … O conjunto fecha em SETE … não há nada a sincronizar»;
- `supabase/functions/consolidar-decisao-final/index.ts:53`: o import novo de `../_shared/sinal-revisao.ts`, que torna falsa a frase do STATE.

**Issue:** o CR-02 só fecha em PROD com três publicações: `consolidar-decisao-final` (EF), o front (Vercel) e `avaliar-redacao`, com esta última por último. O `49-REVIEW-GAPS-3-FIX.md:156-168` diz isso numa «NOTA para o 49-43». O plano que o 49-43 executa não foi tocado desde `32446031`, que é anterior a esta rodada:
1. **Deploy.** A Task 2 publica as 7 EFs, `avaliar-redacao` incluída. `consolidar-decisao-final` não está na lista, nem no laço de `verify_jwt` (`:190`), nem na prova de bundle (`:196`), nem na tabela de escritas (`:293`).
2. **Ordem.** A Task 2 exige `git log origin/main..HEAD` vazio (`:190`), então o front sobe antes das EFs. Com o front novo e a `consolidar` antiga, a resposta vem sem `sinais_revisao` e a tela não mostra nada. Quando o `avaliar-redacao` novo entra, uma SJT sinalizada vira `sucesso`, pondera e fica sem aviso. É o CR-02, em PROD.
3. **Portão que não morde.** O `:235` procura `instrucao_ao_modelo` num chunk lazy. A string mora em `sinal-revisao-*.js`, o chunk compartilhado, e fica verde com ou sem o aviso da Decisão Final. O próprio FIX (`:88`, `:168`) registra isso. É o modo «iteração sobre lista literal — não reprova nada» da tabela do CLAUDE.md, e aqui ele se repete em duas listas (EFs e marcadores).
4. **O registro puxa na direção errada.** Quem executar o 49-43 lê no `STATE.md:1220` que a `consolidar` «nunca embarcou o contrato — não há nada a sincronizar». Desde `483e25ae` isso é falso: ela importa `_shared/sinal-revisao.ts`, e a versão publicada não tem `sinais_revisao` (FIX `:166`: 0 no `00557271`).
5. **Precondição já vencida.** A precondição do plano (`:137`) exige que `git log --since=2026-09-30T02:14:09Z` nos caminhos do fechamento liste «só commits dos planos 49-36..49-42». Hoje ela lista 8 commits `fix(49-43)`, das rodadas -2 e -3, em `_shared/` e `avaliar-redacao/`. O defeito começou na rodada -2. Esta rodada o agrava e acrescenta a EF que falta.

**Por que é crítico:** o critério desta revisão é a Decisão Final exibir uma nota sinalizada que pondera sem o rótulo. É exatamente o estado que o 49-43, executado como está escrito, deixa em PROD. Ele deixaria também uma prova verde de que está tudo publicado.

A janela é pior do que um atraso de tela. As linhas `sucesso` gravadas pelo `avaliar-redacao` novo são permanentes. O rótulo aparece retroativamente quando a `consolidar` subir, porque é calculado na leitura. Mas uma decisão registrada pelo `registrar_decisao` dentro da janela já foi tomada sem ele. A memória «deploy cuja próxima etapa não tem plano» descreve esta forma.

**Fix (no 49-43, antes de qualquer deploy; é PARADA do plano, não do código):**
- acrescentar `consolidar-decisao-final` (JWT-ON, `verify_jwt=true`, sem `--no-verify-jwt`) à Task 2: deploy, laço de `verify_jwt`, prova de bundle com `sinaisDasLinhas` (0 → ≥ 1) e tabela de escritas;
- ordenar dentro da Task 2 assim: migration `20260930000001` → `consolidar-decisao-final` → as outras 6 → `avaliar-redacao` **por último**, com a prova do bundle da `consolidar` como portão antes do `avaliar-redacao`;
- trocar o marcador do front (`:26`, `:219`, `:235`) por `decisao-sjt-sinal-revisao`, exigido num chunk que não seja `index-*`. Provar que o portão morde: com o bloco do aviso removido numa cópia, o grep tem de dar vazio;
- anexar ao `STATE.md` uma correção datada da linha 1220, sem reescrevê-la: «desde 49-43 / CR-02 a EF importa `_shared/sinal-revisao.ts` e precisa de redeploy»;
- reescrever a precondição `:137` para aceitar os commits `fix(49-43)` das rodadas de conserto, ou restringir o `--since` ao intervalo 49-36..49-42.

## Warnings

### WR-07: O rótulo manda «revise o texto», e o RH não tem onde ler o texto da SJT caso aberto

**File:**
- `supabase/functions/_shared/sinal-revisao.ts:67-68` (a cópia do rótulo);
- `src/features/decisao/components/ConsolidacaoDashboard.tsx:121-137` (onde ele aparece agora);
- `supabase/functions/avaliar-redacao/index.ts:489-514` (o `insert` não guarda `body.texto`);
- `src/features/avaliacao/services/avaliacaoService.ts:349,378` (o texto só existe em `respostas_avaliacao`);
- `supabase/migrations/20260611000003_respostas_avaliacao.sql:46-61` (só há policies de candidato: `cand_le_*`, `cand_escreve_*`).

**Issue:** o aviso que o CR-02 pôs na Decisão Final diz «Possível instrução dirigida à IA no texto analisado — revise o texto antes de considerar este resultado». Não há onde o RH faça isso:
- o `avaliar-redacao` não persiste o texto;
- o autosave grava em `respostas_avaliacao`, que nenhuma policy deixa o RH ler;
- o `ScorecardAvaliacao` não está montado, e mesmo montado mostraria só as `citacoes`, que são escolhidas pelo modelo, o mesmo modelo a quem a instrução foi dirigida.

Nas outras superfícies do sinal o texto está ao lado do rótulo: redação (`RedacaoReviewPanel`), transcrição (`TranscricaoReviewPanel`), triagem. Na SJT, a decisão (a) («saem marcados para revisão humana») fica cumprida como **marca**, mas não como **revisão**. O RH vê a marca, procura o texto, não encontra, e decide com a nota que a marca pede para não considerar.

Não é regressão desta rodada, porque antes não havia marca visível nenhuma. Mas é o conserto que torna a lacuna visível e acionável, e ele fica completo só pela metade.
**Fix:** a escolha é de produto e vai ao operador, junto com a decisão aberta do IN-07. Opções:
- (i) expor ao RH o texto da resposta do caso aberto, por RPC SECURITY DEFINER com guarda de posse da vaga, ou por coluna em `scores_candidato` lida pelo `scoresRhService`, e mostrá-lo na Decisão Final junto do aviso;
- (ii) um rótulo próprio da SJT que não prometa uma ação impossível (por exemplo, «…considere este resultado com cautela: o texto não está disponível nesta tela»).

Não escolher sem o operador. A copy do rótulo é fonte única de sete telas.

### WR-01: O resíduo R1/R2 é maior do que o descrito ao operador — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (WR-01). Com o CR-02 fechado no código, uma frase R1/R2 na SJT agora pondera **com** aviso na Decisão Final, depois do deploy correto (ver CR-03).

### WR-02: Ataques que nenhuma família pega (`none`) — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (WR-02). Um `none` na SJT pondera sem aviso nenhum, e isso não mudou.

### WR-03: Frases honestas de consultório ainda bloqueadas, nunca levadas ao operador — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (WR-03).

## Info

### IN-09: A mensagem do IN-06 conserta o passado, mas ainda promete «a análise segue, marcada», e isso é falso quando os dois provedores falham

**File:** `supabase/functions/_shared/audit-logger.ts:368-369`; `supabase/functions/avaliar-redacao/index.ts:403-414`
**Issue:** «o modelo é chamado em seguida» é verdadeiro nos dois caminhos. Mas se a Anthropic e o fallback falharem, ou se o disjuntor estiver aberto e o fallback falhar, o `avaliar-redacao` grava `falhou` com `metadata: { error_code, ...prov }`, **sem** `motivos_revisao`. A análise não «segue, marcada»: termina sem resultado, e o sinal some da linha, ficando só no `ai_call_logs`, justamente a gravação cuja falha dispara este alerta.

É a mesma classe do IN-06, num caso ainda mais raro (perda de auditoria somada a duas falhas de provedor). O teste (`ai-client.test.ts`) prende a frase falsa: ele EXIGE «a análise segue».
**Fix:** «o sinal de revisão ACONTECEU (a análise não foi recusada e segue para o modelo) e NÃO ficou registrado…». Ajustar a regex do teste. Registrar à parte que o `falhou` de uma entrada sinalizada perde o sinal da linha. Isso vem de antes desta rodada (49-39).

### IN-10: Cabeçalhos «(operador, 2026-09-30, «1»):» encabeçam detalhes de implementação que foram do planejador

**File:** `src/features/decisao/schemas/consolidacaoSchema.ts:58-63`; `supabase/functions/consolidar-decisao-final/index.ts:202-207`
**Issue:** a opção «1» cobre isto: consolidação devolve os sinais das linhas que contam, e o dashboard mostra o rótulo. Os docblocks põem sob o mesmo cabeçalho do operador:
- «só os do vocabulário do sinal (`ROTULO_SINAL`), sem duplicar, na ordem em que aparecem»;
- «AUSENTE quando não há sinal (nunca `[]`)».

São escolhas do planejador (a última é lição do 49-26, e o `BreakdownRow` da própria EF, `:117-121`, a atribui corretamente). É a mesma classe do WR-04 do -2, em grau menor: não há aspas em palavras que ele não disse. Os demais pontos conferem: os verbatim citados continuam sendo só «1 ok confirmado», «2- A», «1- sim, 2- decidir depois» e «1», e nenhum comentário novo põe entre aspas palavras que o operador não disse.
**Fix:** separar em duas frases: «Decisão do operador («1», 2026-09-30): a Decisão Final mostra o sinal da SJT.» e «Forma (planejador): …».

### IN-11: O número consolidado e a recomendação, o que o RH lê primeiro, não indicam que uma etapa ponderada está sinalizada

**File:** `src/features/decisao/components/ConsolidacaoDashboard.tsx:193-199,231-240`
**Issue:** o aviso fica só dentro da linha «Work sample (SJT)» do breakdown. O «Score consolidado» e a «Recomendação» incluem a nota sinalizada e não levam marca nenhuma. Pela sonda do -3, com MC 4/10 e um caso aberto 25/25 obedecido, a etapa vai de 40,0 para 82,9. A opção «1» não disse onde o rótulo fica, e o contrato exige que a `recommendation` não mude. Uma nota visual abaixo do número (sem mexer na resposta da EF) caberia no «1» sem mudar comportamento.
**Fix:** se o operador quiser, uma linha âmbar sob o «Score consolidado»: «Inclui etapa com sinal de revisão — ver o breakdown», derivada no front de `breakdown.some(r => r.status === 'present' && r.sinais_revisao?.length)`.

### IN-01: Tolerâncias de acento que nenhum teste prende — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-01).

### IN-02: Docblock e forma do código divergem em três pontos menores — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-02).

### IN-03: Script do corpus sem a flag `u`, e comentário de erro otimista — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-03).

### IN-04: `rotuloDoSinal` indexa objeto literal sem `hasOwn` — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-04). A EF nova filtra por `hasOwnProperty` antes de devolver (`consolidar-decisao-final/index.ts:213`), então a Decisão Final não alcança o caso. O `rotuloDoSinal` em si segue igual.

### IN-05: O sinal chega ao titular pela exportação LGPD com o código cru — carried, not in fix scope
Inalterado desde o `49-REVIEW-GAPS-2.md` (IN-05).

---

**Para o 49-43, além do CR-03:**
- Não publicar `avaliar-redacao` antes de `consolidar-decisao-final` e do front (a nota do FIX está correta).
- O `consolidar-decisao-final` é JWT-ON. Um redeploy com `--no-verify-jwt` por engano abriria a EF, embora ela ainda exija `getUser` e posse.
- A ordem inversa (EF nova com front antigo) é segura: o front antigo ignora a chave.
- Nada em código torna inseguro um deploy parcial que não inclua o `avaliar-redacao` novo.

_Reviewed: 2026-09-30T20:22:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
