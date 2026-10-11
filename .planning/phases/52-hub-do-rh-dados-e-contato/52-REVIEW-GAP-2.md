---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-11T22:33:11Z
depth: deep
diff_base: c3e04a717c9338387160a7dc03d2e74e2f4133c7
reviewed_head: c1daf9b8b9430539e55d239b92bce15f9d1346ae
scope: review adversarial bloqueante nº 2 do gap de servidor do 52-26 (Task 3, de novo), antes do apply corretivo da 20261011000005. Escopo — c3e04a71..c1daf9b8 fora de .planning (o gap inteiro, como no -1) mais o 52-26-PLAN.md; FOCO na rodada de conserto 22f256a3..c1daf9b8 (0187b7af, 23161ca0, 8f625cde, 5f091c8d, 1b839a73, c1daf9b8). Lidos INTEIROS — o diff da rodada (smoke52g, p52_mutacoes.cjs, competencias-normalizacao-servidor.test.ts, entrevistaService.ts, EntrevistaScorecardInline.tsx), o smoke52g inteiro (helpers, (c), (d), (l), (m), (n)), o p52_mutacoes.cjs (contrato, trocar/extrair, G1–G9, julgarMutacao, planejarPrefixo, linha final), o diff do plano e a seção nova do SUMMARY; contexto — o bloco F13 da 0005 (linhas 327–370), getAnalises (map de normalizeCompetencia), as regras (1)–(6) do p52_portao.cjs. Re-executado pelo revisor — gen-p52-gap.cjs --conferir (GERADO = ARQUIVO 036d9d454c91042d51313c3184e73019; md5 do arquivo igual) e --auto-teste (11/11); git diff --quiet 22f256a3 c1daf9b8 -- scripts/geradores supabase/migrations scripts/p52_ensaio.cjs (inalterados); p52_ensaio.cjs --migracoes=0005 com o smoke52g (ENSAIO VERDE, 52g=14/14, 595 ms); a mutação do revisor mut_norm.sql (ENSAIO VERMELHO, P52G FAIL (n), 2 de 4 / 1 de 4); p52_mutacoes.cjs completo (17/17 mordem, controle verde, nada persistiu, aposentadas B1–B6; G8 e G9 → P52G FAIL (n)); G8 e G9 isolados via --mutacao (G8 → incompleto 1 de 3 e depois «1 chave fora»; G9 → 2 de 5 e depois 1 de 5 — cada uma morde pelo ramo que muta, primeira reprovação em (n), a–m verdes); --so=G1..G9 (MUTACOES 9/9 mordem, a linha que o verify da Task 4 procura); --pos-apply --so=G1..G9 antes do apply (ERRO DO HARNESS, 0005 fora do ledger — falha fechado); pós-apply SIMULADO (--sem-migracoes com as duas funções da 0005 como --mutacao → ENSAIO VERDE, prefixadas=[], 52g=14/14) e o vivo de hoje sem a 0005 (P52G FAIL (a)) — o verify da Task 4 distingue; uma mutação btrim do revisor no CASE do servidor (ENSAIO VERDE 14/14 — ver WR-01); vitest de src/features/entrevista + funil (14 arquivos, 158 verdes); numa cópia de c1daf9b8 por git archive no scratchpad (nada no repositório), nove mutações C1–C9 do cliente e do smoke contra o teste novo (C1 sem length, C2 competency qualquer, C3 precedência invertida, C5 fallback, C6 filtro truthy, C7 fixture do smoke, C8 avaliação completa do smoke → vermelho; C4 trim → VERDE; C9 asserção do smoke → verde, lado servidor); p52_vitest_delta.cjs (alteradas=0 · novas=0 · mordida=ok, head 3104/2); npm run lint (89 error TS, nenhum nos arquivos tocados). Medido em PROD só leitura (set transaction read only), depois de todos os ensaios — md5(prosrc) de pontuar_sjt/salvar4/salvar3 = ANTES_* do cabeçalho (66fe507f…/070e0f1b…/924dfb99…), ledger p52 = 0001..0003, net.http_request_queue = 0, nenhuma vaga [P52G SMOKE]. Nada foi aplicado, publicado ou empurrado; o único arquivo escrito no repositório é este.
files_reviewed: 14
files_reviewed_list:
  - scripts/geradores/gen-p52-gap.cjs
  - scripts/geradores/pontuar_sjt_vivo_v2.plpgsql
  - scripts/geradores/salvar_avaliacao_entrevista4_vivo.plpgsql
  - scripts/p52_ensaio.cjs
  - scripts/p52_mutacoes.cjs
  - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
  - src/features/entrevista/__tests__/competencias-padrao-servidor.test.ts
  - src/features/entrevista/__tests__/competencias-normalizacao-servidor.test.ts
  - src/features/entrevista/__tests__/entrevista-contract.test.ts
  - src/features/entrevista/components/EntrevistaScorecardInline.tsx
  - src/features/entrevista/services/entrevistaService.ts
  - supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql
  - supabase/tests/p52_gap_servidor_smoke.sql
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-26-PLAN.md
findings:
  critical: 0
  warning: 1
  info: 8
  total: 9
status: issues_found
---

# Phase 52: Code Review Report — gap de servidor (52-26), rodada 2

**Reviewed:** 2026-10-11T22:33:11Z
**Depth:** deep
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Comecei supondo que a rodada de conserto tinha introduzido um defeito novo, como já aconteceu
duas vezes seguidas. Procurei em quatro lugares: no texto que vai a PROD, na cláusula nova, nas
mutações novas e nas edições do plano que escreve em PROD. **Não achei nada crítico, e nada
destrutivo.**

- **O que vai a PROD não mudou.** A 0005, o gerador, os dois corpos capturados e o `p52_ensaio.cjs`
  estão byte a byte iguais aos do -1 (`--conferir` → `036d9d45…`; `git diff --quiet` vazio). O
  front muda só em duas coisas: um `export` e a extração do filtro para uma função, com o mesmo
  comportamento.
- **O WR-01 do -1 está resolvido no que foi pedido.** A mutação do revisor (`mut_norm.sql`), que
  antes passava 13/13 verde, agora reprova em `P52G FAIL (n)`. G8 e G9 mordem em (n), cada uma pelo
  ramo que muta: isolei as duas, e a primeira reprovação é sempre (n), com a–m verdes. O teste do
  cliente fica vermelho quando qualquer ramo atual de `normalizeCompetencia` ou do filtro muda (C1,
  C2, C3, C5, C6) e quando o fixture ou a avaliação completa do smoke mudam (C7, C8).
- **O plano está consistente.** As contagens editadas (14/14, G1–G9, `--so=…G9`, `9/9`) batem com o
  que os scripts imprimem de fato, e nada mais mudou no caminho de PROD. O verify pós-apply da
  Task 4 passa num apply correto: simulei o estado pós-apply e saiu `prefixadas=[]` e
  `52g=14/14`. Ele reprova o estado de hoje: o vivo sem a 0005 sai `P52G FAIL (a)`, e o
  `--pos-apply` sai `ERRO DO HARNESS`.

Achei um **WARNING**. A guarda nova fixa os ramos que a regra tem HOJE, mas não fixa o tratamento
de espaços. O primeiro exemplo de risco que o WR-01 do -1 deu foi justamente «um `trim`». Provei
com duas mutações: um `trim()` em `normalizeCompetencia` deixa o teste do cliente 4/4 verde, e um
`btrim` no CASE do servidor deixa o smoke52g 14/14 verde. Nada errado vai a PROD neste apply. O
WARNING é sobre a guarda, e a frase do cabeçalho do teste («quem muda um lado reprova o teste do
lado que mudou») hoje promete mais do que a guarda entrega.

As sete INFOs do -1 seguem como estavam: são carregadas por referência, sem re-litígio. Há uma INFO
nova, sobre texto de plano desatualizado fora do caminho de PROD.

### Os pontos da instrução, um a um

| # | Ponto | Veredito | Evidência |
|---|---|---|---|
| (a) | A cláusula (n) fixa `{A, B, C, ''}`? Rótulo, SQLSTATE, cardinalidade; fixture que reverte; nenhum uuid literal; não interfere nas anteriores | OK | **A 2ª chamada sozinha já fixa o conjunto.** Gravar com as chaves exatamente `{A,B,C,''}` exige S ⊆ chaves (senão sai `incompleto`) e chaves ⊆ S (senão sai `fora`); logo S = `{A,B,C,''}`. Além disso, a 1ª chamada exige `23514:scores_humanos incompleto: 1 de 4 competencia(s)%`, ou seja, SQLSTATE, rótulo e \|S\| = 4. Depois vêm `status 'concluida'`, a linha `entrevista` 4.00 e o retorno 4.00. Subtransação revertida por `P52G1`, `p52g_reverteu('n')`, 0 uuid literal. Não toca em `candidaturas` (sem `p52g_fixture_sjt`), então a cadeia de e-mail nem é disparada. Só faz INSERT em `entrevista_analises`, que não tem gatilho (medido no -1). É a última cláusula, então não interfere em nenhuma anterior. O `cardinality(v_res) <> 1` é vácuo (`v_res` sempre tem 1 elemento), mesmo idioma de (l)/(m); a cardinalidade de verdade é o «de 4» do rótulo |
| (b) | G8 e G9 mordem só pelo ramo mutado; controles verdes; nada persistiu | OK | Rodada completa: `17/17 mordem; controle verde; nada persistiu (aposentadas: B1…B6)`. Isoladas via `--mutacao`: **G8** → 1ª chamada `incompleto: 1 de 3` (o '' do 1º elemento agora vale, e A some), 2ª `1 chave(s) fora` (A). **G9** → `2 de 5` / `1 de 5` (o 9 virou nome). Um erro de sintaxe derrubaria o `CREATE` antes do smoke, sem `P52G FAIL`, e o `julgarMutacao` contaria como «nao morde». O alvo de cada `trocar` ocorre uma vez só (o runner monta o `sql` antes da baseline) |
| (c) | O teste do cliente reprova se qualquer lado mudar; não re-deriva o esperado do código | OK no que cobre; **WR-01** no que não cobre | `ESPERADO = ['', 'A', 'B', 'C']` é literal, e o mapeamento por elemento também (`['A','B','C','','']`). O teste lê o smoke e exige o MESMO fixture e a MESMA avaliação completa, uma vez cada. Cópia por `git archive` no scratchpad: C1/C2/C3/C5/C6 (cliente) e C7/C8 (smoke) → vermelho; **C4 (`trim`) → verde**; C9 (só a asserção «1 de 4» do smoke) → verde, o que é aceitável: o conjunto continua fixado pela 2ª chamada, e G8/G9 seguem mordendo |
| (d) | `competenciasDoScorecard` idêntica ao `useMemo` antigo | OK | Mesmo corpo, linha a linha (`filter(c && typeof c.competencia === 'string')`, `map({key,label})`, fallback `DEFAULT_COMPETENCIAS.map`). O `useMemo` mantém `[competenciasIA]` como dependência e devolve a mesma identidade por render. Ordem, chaves de render e `semNotaFaltante`/`handleSalvar` não mudaram. tsc: nenhum erro novo (89) |
| (e) | Plano: contagens, verify da Task 4, nada mais no caminho de PROD | OK (ver IN-08) | O diff do plano troca só contagens: linhas 38/40/51, os verify das Tasks 2 e 4, critérios, Passo 0b, UAT e verification. `smokes=\[52g=14/14\]` = saída real; `^G1 morde`…`^G9 morde` = saída real; `--so=G1..G9` → `MUTACOES: 9/9 mordem; …` (medido) casa com `^MUTACOES: 9/9 mordem`. Passo 1 (apply e registro), push e verify do ledger/md5/ACL: inalterados. Portão (6) do `p52_portao.cjs`: o plano não pode mudar depois de `c1daf9b8` |
| (f) | `mut_norm.sql` agora reprova o smoke | OK | `ENSAIO VERMELHO: P52G FAIL (n): … [23514:… 2 de 4 …] e com as 4 chaves [23514:… 1 de 4 …]` |
| (g) | Achados do -1 | WR-01 resolvido no escopo pedido, com o resíduo do novo WR-01; IN-01…IN-07 sem mudança (abaixo, por referência) | O corpo da 0005 e `normalizeCompetencia` não mudaram (só o `export`), então nenhuma INFO do -1 foi tocada |

## Warnings

### WR-01: a guarda cliente × servidor não fixa o tratamento de espaços — um `trim` de um lado só (o exemplo do WR-01 do -1) passa verde nas duas metades

**File:** `src/features/entrevista/__tests__/competencias-normalizacao-servidor.test.ts:37-42` (fixture e conjunto) · `supabase/tests/p52_gap_servidor_smoke.sql:962-963` (o mesmo fixture na (n)) · `src/features/entrevista/services/entrevistaService.ts:498` · `supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql:340`

**Issue:** O WR-01 do -1 descreveu o risco assim: «Um ajuste em `normalizeCompetencia` (um `trim`,
a precedência invertida, um novo formato da EF) ou no CASE do gerador faz o servidor recusar toda
avaliação de uma análise afetada». A rodada cobre a precedência e os ramos de tipo e de vazio. Mas
nenhum elemento do fixture tem espaço, então o tratamento de espaços fica livre dos dois lados:

```
cliente  C4: c.competencia.length > 0  →  c.competencia.trim().length > 0   ⇒  Tests 4 passed (4)
servidor:    length(e->>'competencia') > 0  →  length(btrim(e->>'competencia')) > 0
             ⇒  ENSAIO VERDE … smokes=[52g=14/14]
```

O cenário real é este:

1. Alguém faz uma limpeza «inofensiva» nos nomes que a IA devolveu e acrescenta um `trim` no
   service (ou um `btrim` no gerador).
2. Uma análise traz `"Comunicação "` (espaço no fim, coisa comum em saída de LLM).
3. A tela pede a nota com a chave `"Comunicação"`, e o servidor exige `"Comunicação "`. O
   resultado é `23514 incompleto`, mais `fora`, e o RH vê só «Dados inválidos. Verifique os
   campos.».

É a mesma classe de defeito que o WR-01 do -1 apontava, e nenhum portão acusa. O cabeçalho do teste
novo e o comentário do service afirmam «quem muda um lado reprova o teste do lado que mudou».
Hoje isso só vale para os ramos que o fixture exercita.

Não é crítico. Os dois lados são idênticos hoje (o corpo da 0005 e `normalizeCompetencia` não
mudaram), e nada errado vai a PROD neste apply.

**Fix (o corpo da 0005 não muda; mexe no smoke, no runner, no teste e no plano → review `-3`):**
1. Um elemento a mais no fixture, nos dois arquivos, com espaço que tem de ser PRESERVADO, por
   exemplo `{"competencia":" D "}`. O conjunto vira `{A, B, C, ' D ', ''}`: a 1ª chamada passa a
   «1 de 5», e a avaliação completa ganha `" D ":4`. O teste do cliente acompanha o fixture, o
   `COMPLETA_JSON` e o `ESPERADO`.
2. Uma mutação G10: `length(e->>'competencia') > 0` → `length(btrim(e->>'competencia')) > 0`, que
   tem de morder em (n). O plano passa para G1–G10 / `10/10` (o mesmo cuidado com as contagens da
   rodada 1).

**Alternativa sem código** (aceitável, porque não há efeito em PROD): registrar como residual no
`52-SECURITY.md`, com dono nomeado: «a guarda de normalização fixa os ramos de tipo, vazio e
precedência; mudança que distingue por espaço, caixa ou Unicode exige mudar os dois lados e
estender o fixture». Nesse caso, corrigir a frase do cabeçalho do teste fica para a próxima vez que
o arquivo mudar. Não mexer no plano nem no código só por isso: o portão (6) recusa plano alterado
depois do `reviewed_head`.

## Info

### IN-01: (= IN-01 do 52-REVIEW-GAP-1) 22003 sem rótulo com nota-string gigante — sem mudança

**File:** `supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql:352,370`

**Issue:** Carregada por referência. O corpo da 0005 não mudou, então o achado continua como está.

**Fix:** O do -1 (backlog).

### IN-02: (= IN-02 do 52-REVIEW-GAP-1) `p_candidatura_id` malformado vira 22P02 na coerção do PostgREST — sem mudança

**File:** `src/features/avaliacao/services/avaliacaoService.ts:455-459`

**Issue:** Carregada por referência; fora do diff da rodada.

**Fix:** O do -1 (backlog).

### IN-03: (= IN-03 do 52-REVIEW-GAP-1) o POS não compara `procost`/`prorows` — sem mudança

**File:** `scripts/geradores/gen-p52-gap.cjs:244-256`

**Issue:** Carregada por referência. O gerador está inalterado (`--conferir` = `036d9d45…`), e
continua medido `procost = 100` e `prorows = 0`.

**Fix:** O do -1, na próxima vez que o gerador mudar.

### IN-04: (= IN-04 do 52-REVIEW-GAP-1) a guarda do espelho lê a 0005 para sempre — sem mudança

**File:** `src/features/entrevista/__tests__/competencias-padrao-servidor.test.ts:26`

**Issue:** Carregada por referência. O teste novo tem o mesmo tipo de amarra a um caminho fixo,
`p52_gap_servidor_smoke.sql`, mas lá isso é proposital: o teste exige o fixture DENTRO do smoke.

**Fix:** O do -1.

### IN-05: (= IN-05 do 52-REVIEW-GAP-1) resíduo do `p50_desfazer_expansao.sql` ainda fora das «Threat Flags» do SUMMARY

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-26-SUMMARY.md:322-324`

**Issue:** Carregada por referência. A seção nova do SUMMARY não tocou nas «Threat Flags», que
continuam dizendo «Nenhum».

**Fix:** O do -1 (no SUMMARY final).

### IN-06: (= IN-06 do 52-REVIEW-GAP-1) elemento JSON `null` em `competencias`: o cliente quebra e o servidor conta `''` — sem mudança

**File:** `src/features/entrevista/services/entrevistaService.ts:494-504`

**Issue:** Carregada por referência. `normalizeCompetencia` só ganhou o `export`. O cabeçalho do
teste novo apresenta a regra como espelho completo, mas este caso segue divergente (fora do fixture
por decisão do -1).

**Fix:** O do -1 (backlog). Se o WR-01 desta rodada for consertado, dá para incluir `null` no
fixture na mesma passada, depois de corrigir o cliente.

### IN-07: (= IN-07 do 52-REVIEW-GAP-1) `52-APLICACOES.json` mistura duas fontes de relógio — sem mudança

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-26-PLAN.md:374`

**Issue:** Carregada por referência. O Passo 1 da Task 4 não mudou nesta rodada.

**Fix:** Nenhum agora.

### IN-08: texto do plano fora do caminho de PROD ainda diz (a)–(m) / G1–G7, e três desses pontos não estão na lista de «histórico» do SUMMARY

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-26-PLAN.md:255,265,449`

**Issue:** Nenhum `<automated>` lê estes trechos, então nada reprova nem passa por causa deles.

- Linha 255: o `fails_when` da Task 2 lista «a clause (e)–(m) red».
- Linha 265: o critério de aceite da Task 2 pede «`G1 morde` … `G7 morde`».
- Linha 449: a tabela de artefatos diz «(a)–(m)».

A seção «Desvio» do SUMMARY diz que «nada mais fixava 13 nem G1–G7» e lista como histórico só o
`<name>`, o «Runner», as linhas 99, 296 e 451. As linhas 255, 265 e 449 não aparecem em nenhuma das
duas listas.

**Fix:** Não editar o plano agora: o portão (6) recusa plano alterado depois do `reviewed_head`.
Registrar no SUMMARY final que essas três linhas ficaram como texto histórico, ou atualizá-las numa
rodada que já vá ter review novo.

---

_Reviewed: 2026-10-11T22:33:11Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
