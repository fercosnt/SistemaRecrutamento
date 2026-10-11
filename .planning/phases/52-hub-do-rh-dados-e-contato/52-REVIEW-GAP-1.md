---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-11T22:10:00Z
depth: deep
diff_base: c3e04a717c9338387160a7dc03d2e74e2f4133c7
reviewed_head: 22f256a391f98c654c0f74984f8bc2b36162705e
scope: review adversarial bloqueante nº 1 do gap de servidor do 52-26 (Task 3), que decide o apply da 20261011000005 (troca de public.pontuar_sjt e de public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)). Escopo — c3e04a71..22f256a3 fora de .planning (11 arquivos, 8 commits de código) mais o 52-26-PLAN.md, lido como o programa que escreve em PROD. Lidos INTEIROS — gen-p52-gap.cjs, os dois corpos capturados, a migration gerada, o smoke52g; o diff de p52_ensaio.cjs e p52_mutacoes.cjs com o contexto (planejarPrefixo, principal, extrair, trocar, entradas B); o SUMMARY parcial (Tasks 1–2). Contexto fora da lista — entrevistaService.ts (normalizeCompetencia, getAnalises, mapRpcError, salvarAvaliacao), avaliacaoService.ts (pontuarSjt), EntrevistaWorkspace.tsx, p52_portao.cjs, p50_enumera.cjs, p50_desfazer_expansao.sql, funil01_pontuar_sjt_smokes.sql, p50_acesso_recrutador_smoke.sql, 52-REVIEW-BANCO-1 (WR-04, IN-01), 52-REVIEW-PORTAO-2 (formato). Re-executado pelo revisor — gen-p52-gap.cjs --conferir (GERADO = ARQUIVO 036d9d454c91042d51313c3184e73019) e --auto-teste (11/11); extração independente dos dois corpos do ARQUIVO da migration e diff contra os dois corpos capturados (só P1–P3 e S1–S2; md5 a63375bd… e d2d3bc1d… = cabeçalho; 0 GRANT/REVOKE/COMMENT/ALTER/DROP; 2 CREATE); p52_ensaio.cjs --migracoes=0005 com o smoke52g (ENSAIO VERDE, 52g=13/13, 583 ms); p52_mutacoes.cjs completo (15/15 mordem, controle verde, nada persistiu, aposentadas B1–B6); --so=B5 (ERRO DO HARNESS … aposentada); --pos-apply --so=G1 antes do apply (ERRO DO HARNESS … 0005 fora do ledger); p49_revisao_por_analise_smoke e p49_analise_vigente_smoke com a 0005 prefixada (ENSAIO VERDE x2); vitest de competencias-padrao-servidor, entrevista-contract, avaliacaoService.funil e EntrevistaScorecardInline (4 arquivos, 54 verdes); p50_enumera.cjs em seco origin/main..HEAD com os --caminhos/--assunto do plano (19 commits, 9 planning, 8 codigo, 0 ALHEIO; 8fa8193a e e9dfc369 como planning); duas sondas do revisor no ensaio que aborta (sonda1 — 11 payloads SJT forjados — e sonda2 — 9 avaliações de entrevista); uma mutação do revisor na normalização (ver WR-01) com o smoke52g, que saiu VERDE 13/13. Medido em PROD só leitura (set transaction read only) — PostgreSQL 17.6; as três funções com os md5 ANTES_*, procost 100, prorows 0, dono postgres, proconfig search_path vazio, anon EXECUTE só em pontuar_sjt; corpo da sobrecarga de 3 argumentos (delega à primária); gatilhos de candidaturas/vagas (rede só por pg_net, assíncrono e transacional; nenhuma extensão http síncrona; nenhum gatilho em entrevista_analises/scores_candidato); nomes das competências das 14 análises (todas array de objetos com competency string, nenhuma com competencia; as 2 com scores_humanos gravados têm chaves = conjunto); depois de todos os ensaios — ledger p52 = 0001..0003, md5 vivos = ANTES_*, net.http_request_queue = 0. Nada foi aplicado, publicado ou empurrado; o único arquivo escrito é este.
files_reviewed: 12
files_reviewed_list:
  - scripts/geradores/gen-p52-gap.cjs
  - scripts/geradores/pontuar_sjt_vivo_v2.plpgsql
  - scripts/geradores/salvar_avaliacao_entrevista4_vivo.plpgsql
  - scripts/p52_ensaio.cjs
  - scripts/p52_mutacoes.cjs
  - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
  - src/features/entrevista/__tests__/competencias-padrao-servidor.test.ts
  - src/features/entrevista/__tests__/entrevista-contract.test.ts
  - src/features/entrevista/components/EntrevistaScorecardInline.tsx
  - supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql
  - supabase/tests/p52_gap_servidor_smoke.sql
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-26-PLAN.md
findings:
  critical: 0
  warning: 1
  info: 7
  total: 8
status: issues_found
---

# Phase 52: Code Review Report — gap de servidor (52-26), rodada 1

**Reviewed:** 2026-10-11T22:10:00Z
**Depth:** deep
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Parti da hipótese de que havia defeito e procurei por ele nos três lugares onde ele faria estrago:
(1) no texto que vai a PROD; (2) nos portões que deveriam reprovar esse texto; (3) no programa
que aplica e empurra. **Não achei nada crítico.** A migration é exatamente o gerador rodando
sobre os corpos capturados. Os corpos novos são os vivos mais as cinco trocas ancoradas e nada
além delas. O PRE e o POS vigiam o que o plano manda vigiar. Nenhum payload que tentei chegou a
um 22P02 dentro de `pontuar_sjt`, e as recusas novas seguem a ordem das antigas. Nada destrutivo:
nenhuma escrita de dado, nenhuma ACL alterada, nenhuma outra função tocada (a sobrecarga de 3
argumentos fica com a mesma impressão digital, e o POS confere isso).

Achei um **WARNING**. A regra de `normalizeCompetencia` passou a viver em dois lugares (o
TypeScript e o SQL da 0005), e nenhum lado tem guarda que pegue a divergência. Provei isso com uma
mutação: mudei dois ramos da normalização do servidor e o smoke52g continuou **13/13 verde**. Hoje
os dois lados batem — conferi contra os dados de PROD —, mas o próximo que mexer em um deles quebra
o «Salvar avaliação» do RH com «Dados inválidos. Verifique os campos.», e nenhum portão acusa.

Ficam sete INFOs: resíduos anteriores ao gap, fronteiras que o P1 não cobre por construção, e
melhorias de forma.

### Os 10 pontos da instrução (Task 3), um a um

| # | Ponto | Veredito | Evidência |
|---|---|---|---|
| 1 | migration = gerador; corpo novo = vivo + só P1–P3/S1–S2 | OK | `--conferir` → `GERADO = ARQUIVO: 036d9d45…`. Extraí os dois `$function$…$function$` do **arquivo** (não do gerador) e comparei com `diff` aos dois `.plpgsql`: em `pontuar_sjt`, só o bloco P1 inserido antes da âncora, mais as linhas 34 e 42 trocadas para `::uuid`; em `salvar4`, só as três variáveis do DECLARE e o bloco da média. md5 dos corpos extraídos = `a63375bd…`/`d2d3bc1d…` = cabeçalho. Os `.plpgsql` têm md5 = `ANTES_*` = PROD de agora |
| 2 | PRE recusa se qualquer das 3 mudou; POS confere md5, propriedades, ACL, anon, comentário, FP da de 3 argumentos; sem GRANT/REVOKE/COMMENT | OK (ver IN-03) | PRE: md5(prosrc) das três contra as constantes, «não existe» recusado. POS: md5 novo; `concat_ws` de propriedades; ACL como conjunto ordenado de `aclexplode`; `anon=`/`authenticated=` por `has_function_privilege`; comentário; `FP_FN` inteiro da sobrecarga de 3 argumentos. 0 `GRANT/REVOKE/COMMENT/ALTER/DROP` no arquivo. O `anon` EXECUTE de `pontuar_sjt` fica: o POS compara com o PRE, e o verify 1 da Task 4 exige `anon_pontuar = true` |
| 3 | WR-04: duplicata e completude por uuid; 22023 antes de todo `::uuid` (inclusive o `opcao_id` do `marked`); IFs separados; nenhum 22P02 por payload; sem contagem nova | OK (ver IN-02) | Sonda1 no ensaio que aborta: `{uuid}` e uuid sem hífens duplicando o 1º item → `22023:resposta duplicada`; uuid com espaços, elemento `null`, elemento array, `opcao_id` null, `pergunta_id` número, `p_respostas` SQL NULL → `22023:resposta malformada`; chaves extras e `opcao_id` com chaves → aceito `11/24` (igual à (b)). O `OR` do 2º IF não depende de ordem: `->>` sobre não-objeto devolve NULL e `pg_input_is_valid` não levanta. O P1 vem DEPOIS do `forbidden` 42501, então `anon` não ganha oráculo novo. As mensagens novas não trazem número |
| 4 | F13: conjunto = o da tela; chave fora recusada; média só sobre o conjunto; ordem das recusas; a de 3 argumentos herda; `''`, null, duplicados, não-array | OK no comportamento; **WR-01** no portão | Sonda2 e o smoke: `[{}]` e `[null]` → conjunto `{''}`, salva com `{"":4}`; `competencia:""` ou numérica → cai em `competency` (= cliente); objeto/string → os 4 padrão; `"4"`, `4.5`, `1e0`, `"5.0"` aceitos (mesma aceitação do vivo); `true`, `" 4"`, `{}`, caixa diferente → `incompleto`. Ordem: o bloco S2 fica depois de `notas_humanas obrigatorias`, e as p49 saem verdes com e sem a 0005. Corpo vivo da sobrecarga de 3 argumentos lido em PROD: delega com o mesmo payload; a (l) prova a herança. Dados de PROD: em nenhuma das 14 análises o conjunto do servidor difere do conjunto da tela |
| 5 | smoke: fixture que reverte, nenhum uuid literal, rótulo E SQLSTATE | OK | 0 uuid literal. Toda recusa conferida como `'<SQLSTATE>:<rótulo>'` (igualdade ou `LIKE` com prefixo). Cada cláusula reverte por `P52G1`, e `p52g_reverteu` confere que nada ficou. O comentário do topo agora nomeia a cadeia do UPDATE e diz que o rollback é a proteção (IN-01 do BANCO-1 fechado no smoke novo). Medido: a rede dos gatilhos é só `net.http_post` (fila transacional), não há extensão `http` síncrona, e a fila ficou em 0 depois dos meus ensaios |
| 6 | G1–G7 e a aposentadoria das B | OK | Rodada completa: `15/15 mordem … (aposentadas: B1,…,B6)`, cada B impressa com a versão do ledger. `--so=B5` → `ERRO DO HARNESS … aposentada`. Rodada vazia é erro. `julgarMutacao`/`julgarControle` não mudaram. A aposentadoria depende de `exigePrefixadas` declarado à mão e conferido contra `MIGS` por `validarCarga`: é impressa, nunca em silêncio |
| 7 | `MIGS` na ordem de aplicação, par `52g` | OK | 0005 entre 0003 e 0004; `PARES` e `PREFIXO` com `smoke52g`; nada mais mudou no ensaio |
| 8 | 0005 antes da 0004 | OK | A regra (8) do `p52_portao.cjs` é por forma (`RE_MIG_P52`), sem ordem. `planejar` e `planejarPrefixo` seguem a ordem de `MIGS`. Nenhum consumidor de `p52_ensaio.MIGS` indexa por posição (os `MIGS[n]` são dos runners p50) |
| 9 | resíduo `p50_desfazer_expansao.sql` registrado no SUMMARY | Registrado (ver IN-05) | 52-26-SUMMARY §Residuais, item 1. Conferi as duas `c_fp` em `:50` e `:1553` com os dois valores citados. Não decido nada |
| 10 | comando de push e `52-APLICACOES.json` | OK (ver IN-07) | Enumeração em seco com os `--caminhos`/`--assunto` do plano: 0 ALHEIO; os 11 arquivos de código casam a allowlist; `8fa8193a`/`e9dfc369` saem `planning`. O registro tem 0001..0003 conferidos contra os SUMMARYs. O comando do apply lê o `now()` do servidor depois da resposta do `migrate`. Se o `migrate` falhar depois do commit, o verify 1 da Task 4 recusa (versão no ledger sem instante registrado), ou seja, falha fechado |

### Os desvios declarados pelo executor

| Desvio | Esconde buraco? |
|---|---|
| 1. CASE no lugar do AND no predicado 1–5 | Não. A aceitação é a mesma do vivo. O `avg(kv.v::numeric)` está no SELECT, então só roda sobre linhas que passaram o WHERE. Sonda: `"x"` → `incompleto`; `true` → `incompleto`. Sobra o 22003 de IN-01, que vem do vivo e não é 22P02 |
| 2. As cláusulas de entrevista não movem a candidatura | Não. A `salvar_avaliacao_entrevista` não lê etapa. O JOIN com `vagas` usa a vaga real da candidatura, e não há gatilho em `entrevista_analises` nem em `scores_candidato`. São menos gatilhos disparados dentro do envelope |
| 3. RED e GREEN em commits separados | Não. O delta julga base contra HEAD. O commit RED, sozinho, deixa um teste vermelho na história, o que é esperado em TDD |
| 4. Asserção sobre a string unida | Não. O `toEqual` estrutural vem logo depois, e a guarda morde por nome e por ordem |
| 5. Cabeçalho em ASCII | Não. Nenhum portão em `scripts/`, `src/` ou `supabase/tests` casa o texto acentuado |
| 6. (a)/(h) recusam ids só com dígitos | Não. A recusa é fechada: vira `P52G FAIL`, nunca um verde vazio |

## Warnings

### WR-01: a regra de `normalizeCompetencia` passou a ser espelhada no SQL sem guarda em nenhum dos lados — com dois ramos divergentes, o smoke52g segue 13/13

**File:** `scripts/geradores/gen-p52-gap.cjs:147-154` (o CASE da normalização, gerado em `supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql:337-344`) · `src/features/entrevista/services/entrevistaService.ts:487-498` (`normalizeCompetencia`, sem export e sem teste) · `supabase/tests/p52_gap_servidor_smoke.sql:443,485,733,775,821,865` (o fixture das cláusulas de entrevista)

**Issue:** Antes do F13, o servidor não dependia de como o cliente nomeia as competências. Agora a
0005 recusa (23514) toda avaliação cujas chaves não sejam exatamente o conjunto que a tela
renderiza. Esse conjunto sai de três trechos de cliente:

- o `normalizeCompetencia` do service;
- o filtro `typeof c.competencia === 'string'` do scorecard;
- o fallback `DEFAULT_COMPETENCIAS`.

Só o terceiro tem guarda (`competencias-padrao-servidor.test.ts`). Os dois primeiros foram copiados
para o SQL sem nada que compare as duas versões.

- **No cliente,** nenhum teste fixa o comportamento de `normalizeCompetencia`: procurei `competencia`
  e `competency` nos `__tests__` de entrevista, e não há caso para `competencia` vazia ou não string.
- **No servidor,** o fixture do smoke só exercita `competency` string e `competencia` não vazia
  vencendo `competency`.

**Prova (mutação do revisor, ensaio que aborta).** Mudei o CASE do servidor em dois ramos:

- `competencia` string vazia passa a valer;
- `competency` deixa de exigir string (`e ? 'competency'`).

Rodei o smoke52g com essa mutação:

```
$ node scripts/p52_ensaio.cjs --migracoes=…0005… --mutacao=<scratchpad>/rev/mut_norm.sql supabase/tests/p52_gap_servidor_smoke.sql
ENSAIO VERDE: … smokes=[52g=13/13] …
```

Os dois lados, hoje, são idênticos. As sondas e as 14 análises de PROD confirmam isso: todas usam
`competency` string, e o conjunto do servidor bate com o da tela em todas. Por isso o achado não é
crítico: nada errado vai a PROD neste apply.

O risco está na próxima mudança. Um ajuste em `normalizeCompetencia` (um `trim`, a precedência
invertida, um novo formato da EF) ou no CASE do gerador faz o servidor recusar toda avaliação de
uma análise afetada. O RH vê só «Dados inválidos. Verifique os campos.» (`mapRpcError` 23514, sem
eco), não tem campo para corrigir, e nenhum portão acusa. É a mesma classe de defeito que o F13
fecha — uma regra vivendo em dois lugares —, reaberta um nível abaixo.

**Fix (código muda → review `-2`):**
1. No smoke52g, uma cláusula a mais (ou mais elementos no fixture da (c)/(d)) com os ramos que
   faltam. Exemplo de conjunto esperado `{A, B, C, ''}`:
   ```sql
   '[{"competencia":"","competency":"A"},{"competencia":7,"competency":"B"},{"competencia":"C","competency":"X"},{"competency":9},{}]'::jsonb
   -- incompleto sem a chave '' ; grava com {"A":4,"B":4,"C":4,"":4}
   ```
2. Uma mutação G8 que troca `AND length(e->>'competencia') > 0` por nada, e outra (ou a mesma
   entrada) que troca `WHEN jsonb_typeof(e->'competency') = 'string'` por `WHEN e ? 'competency'`.
   As duas têm de morder a cláusula nova.
3. No cliente, exportar `normalizeCompetencia`, ou testar via `getAnalises` com o supabase mockado,
   e fixar, num teste novo ao lado de `competencias-padrao-servidor.test.ts`, o MESMO fixture → o
   MESMO conjunto `{A, B, C, ''}`, passando pelo filtro do scorecard. O conjunto esperado fica
   escrito nos dois arquivos, e quem mudar um lado reprova o teste do lado que mudou.

Alternativa sem código, se o operador preferir: registrar como residual no `52-SECURITY.md`, com
dono nomeado, a frase «mudar `normalizeCompetencia` ou o CASE da 0005 exige mudar os dois e
regenerar».

## Info

### IN-01: `salvar_avaliacao_entrevista` ainda levanta 22003 sem rótulo com uma nota-string gigante — herdado do vivo, só RH

**File:** `supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql:352,370`

**Issue:** A sonda2 mandou `{"A":"111…1"}` com 140000 dígitos, de um RH autenticado. O resultado foi
`22003:value overflows numeric format`, não o `23514 incompleto`. O regex aceita o texto e o
`::numeric` estoura antes do `BETWEEN`. O corpo vivo tinha o mesmo caminho (regex, AND, cast), e o
cliente mapeia 22003 para o fallback, sem eco. Também como no vivo, decimais e números em string
(`4.5`, `"4"`, `"5.0"`) são aceitos e entram na média; o cliente manda só inteiros.

**Fix (backlog, opcional):** limitar o regex a `^[1-5](\.[0-9]{1,4})?$` ou `^[1-5]$`, o que fecha
o 22003 e os decimais de uma vez, se o operador quiser que o servidor exija nota inteira.

### IN-02: um `p_candidatura_id` malformado ainda vira 22P02 na coerção do PostgREST — fora do alcance do P1

**File:** `src/features/avaliacao/services/avaliacaoService.ts:455-459` (ramo que interpola `error.message`)

**Issue:** O 22P02 de um `p_candidatura_id` que não é uuid nasce na coerção do argumento, antes de
qualquer linha da função. O ramo final de `pontuarSjt` então mostra «Não foi possível registrar suas
respostas: invalid input syntax for type uuid: "<o que o próprio usuário mandou>"». É eco da entrada
do próprio usuário, sem dado do servidor, e vem de antes do gap. O critério «nenhum 22P02 por
payload» vale para `p_respostas`, onde está provado; este caso fica de fora por construção.

**Fix (backlog):** em `pontuarSjt`, mapear `22P02` para a mesma mensagem neutra do 22023.

### IN-03: o POS das duas funções trocadas não compara `procost`/`prorows`

**File:** `scripts/geradores/gen-p52-gap.cjs:244-256` (`LE_FUNCAO`)

**Issue:** `CREATE OR REPLACE` sem `COST`/`ROWS` volta esses dois campos ao padrão, e o
`concat_ws` de propriedades não os inclui (a sobrecarga de 3 argumentos é vigiada pelo `FP_FN`
inteiro, mas as duas trocadas não). Medido em PROD: `procost = 100` e `prorows = 0` nas três
funções, que são os padrões do CREATE. Hoje não faz diferença.

**Fix (próxima vez que o gerador mudar):** acrescentar `p.procost, p.prorows` ao `concat_ws`.

### IN-04: a guarda do espelho lê a 0005 para sempre

**File:** `src/features/entrevista/__tests__/competencias-padrao-servidor.test.ts:26`

**Issue:** O caminho da migration está fixo. Quando uma migration futura substituir
`salvar_avaliacao_entrevista` (com outra lista, ou sem lista), a guarda continua verde contra um
texto que não está mais no ar. O comentário do arquivo pede uma «migration nova se a 0005 já estiver
aplicada», mas o teste não a seguiria.

**Fix:** procurar a linha marcadora na migration de MAIOR versão que a contenha (por forma), ou
ler o `prosrc` vivo num portão de PROD.

### IN-05: resíduo do `p50_desfazer_expansao.sql` — registro conferido; o repasse ao `52-SECURITY.md` ainda não tem executor

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-26-SUMMARY.md:269` · `supabase/tests/p50_desfazer_expansao.sql:50,1553`

**Issue:** O registro existe e está certo. As duas `c_fp` fixam
`fn:public.salvar_avaliacao_entrevista(uuid,jsonb,text) = ce064141…` e
`(uuid,uuid,jsonb,text) = 83aa5e19…`, e a frase do `<context>` está lá. Nenhuma outra constante das
duas funções existe fora das migrations e do gerador (varredura por forma em `scripts`, `src` e
`supabase/tests`). Porém o `52-SECURITY.md` ainda não existe, e a seção «Threat Flags» do mesmo
SUMMARY diz «Nenhum». Quem montar o SECURITY a partir das threat flags perde o resíduo. Não decido
nada (já está decidido no `<context>`).

**Fix:** no SUMMARY final (sessão B), citar os dois resíduos também em «Threat Flags», ou
nomear quem os transcreve.

### IN-06: assimetria com elemento JSON `null` em `competencias` — cliente quebra, servidor conta `''`

**File:** `src/features/entrevista/services/entrevistaService.ts:487-490`

**Issue:** `normalizeCompetencia(null)` lança `TypeError` (`null.competencia`), e a aba do RH cai
inteira. O servidor conta esse elemento como `''` (sonda2: `[null]` → salva com `{"":4}`). Isso vem
de antes do gap e já foi declarado pelo executor. Medido: 0 elementos não-objeto nas 14 análises de
PROD.

**Fix (backlog, junto com o WR-01 se for consertado):** `c && typeof c === 'object'` antes do
spread, levando `null` a `''` como o servidor.

### IN-07: `52-APLICACOES.json` mistura duas fontes de relógio

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-APLICACOES.json` (0001..0003) · `52-26-PLAN.md:374` (0005)

**Issue:** Os horários de 0001..0003 são o fim do comando no relógio da máquina do executor. O da
0005 será o `now()` do servidor. O contrato promete «igual ou posterior ao COMMIT», o que depende da
máquina não estar atrasada em relação ao servidor. Contra um backup diário, segundos de diferença
não pesam.

**Fix:** nenhum agora. Se um dia a janela apertar, registrar no campo `fonte` qual relógio deu cada
horário.

---

_Reviewed: 2026-10-11T22:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
