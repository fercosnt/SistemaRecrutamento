---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-13T00:56:46Z
depth: deep
diff_base: 954b3e4b33a6cd290241793bf1df000083a49d81
reviewed_head: 31facac937bfc71e34ec282b7d5d21575bb84e92
scope: review adversarial bloqueante nº 1 do plano 52-32 (Task 4), que decide o apply da 20261011000007 em PROD, a regeneração de database.types.ts e o push dos quatro leitores; escopo = refs/gsd/52-31/sha..HEAD -- . ':!.planning' (15 arquivos de código, 9 commits de código das sessões A e B: f5822c88, 9079765a, 63b011bc, 1c64a704, 8dd06272, 0b4736b4, 2237d8c8, 94c96eee, 6e9fa444) + 52-32-PLAN.md; lidos INTEIROS a migration 0007 (diff estrutural contra a 0006 a partir do primeiro SET LOCAL: só nomes, GUC p52.p07.pre, projeção, COMMENT, a varredura do WR-01 e a evidência mudam), o corpo da função e o POS, as cláusulas (a) e (c) e a baseline do smoke52a (estrutura dos 10 DO, todas as escritas em envelopes P52A1), os seis testes novos (casos, mocks, asserções), os diffs -U3 dos cinco serviços e -U1/-U2 dos dois arneses, a §Task 1–3 da 52-32-FRONTEIRA.md (tsc_base=89, tsc_postgrest 89=89, pares 1 passed/1 failed, mordidas B1–B14, resposta do operador D-52-G7B-1/-2/-5 verbatim), o trigger vagas_enforce_status_soft_delete_sync (só coage ativa→arquivada), as regras (1)–(8) do p52_portao.cjs; RE-EXECUTADO (só leitura ou dentro do ensaio que aborta): `node p46apply.cjs sql "set transaction read only; … no_ledger … ausente"` → no_ledger=0 ausente=true · `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` vazio · `git diff --quiet 6e9fa444 HEAD -- . ':!.planning'` rc=0 · `node scripts/p52_mutacoes.cjs --so=A1,…,A14` → «MUTACOES: 14/14 mordem; controle verde; nada persistiu» (A1 (b), A2 (a), A3 (c), A4 (g), A5 (f), A6 (h), A7 (i), A8 (e), A9 (e), A10 (d), A11 (a), A12 (a), A13/A14 RECUSA do POS) · sete mutações PRÓPRIAS da 0007 em cópias no scratchpad via `--migracoes=<cópia>` + smoke52a: M1 guarda sem coalesce → POS «nao tem a guarda de papel ANTES da primeira busca (guarda=0…)», M2 SECURITY INVOKER → POS «fora do contrato de catalogo», M3 chave extra `'tudo', to_jsonb(v)` → PASSA o POS, morde em `P52A FAIL (c)` (chaves …|tudo), M4 posse `WHERE true` → POS «nao contem «c.candidato_id IN …»», M5 `AND v.status = 'ativa'` → POS allowlist {…,status,…}, M6 sem `'aplica_cognitivo', v.aplica_cognitivo` → POS allowlist {id,testes_aplicaveis}, M7 segundo alias `JOIN public.vagas w` + `'titulo', w.titulo` → PASSA o POS, morde em `P52A FAIL (c)` (chaves …|titulo) · WR-02 (o `<verify>` da Task 2 reconstruído): `provaVagasEstado(FP_VAGAS_ESTADO)` = padrão; `--sem-migracoes --mutacao=` com fp real → `ENSAIO VERDE … evidencia=vagas_estado:morde=ok`; degradada status → `P52W FAIL (status)`, deleted_at → `P52W FAIL (deleted_at)`, estreita → `P52W FAIL (estreita)`; impressão própria de vagas (count:md5 de id|status|deleted_at) ANTES e DEPOIS = `15:dd770c981970a01c99bc8df78e364b91`, elegíveis ao predicado = 12 (nenhuma vaga nova da outra janela até aqui) · regressões: `p52_leituras_rh_smoke` controle 52l=20/20 e tratamento (prefixadas=[0007]) 52l=20/20; `p52_painel_vaga_smoke` controle 52p=10/10 e tratamento 52p=10/10 · smoke52a completo `--vistas` → `ENSAIO VERDE prefixadas=[20261011000007] vistas=igual smokes=[52a=10/10] 52a.pop=cand:22,naturais:16 52a.alvo=publica` · `npm run lint` → 89 erros (= tsc_base) · Vitest: os seis testes novos + DashboardCandidatoPage.concluidas.test.tsx + exportacaoService.test.ts → 8 arquivos, 97 passed; redacaoEscopo.test.ts + prova-cognitiva.test.tsx (mockam sem rpc) → 2 arquivos, 16 passed · três mordidas PRÓPRIAS em cópia `git archive` sob o scratchpad com env falso (`VITE_SUPABASE_URL=http://127.0.0.1:9 VITE_SUPABASE_ANON_KEY=fake-anon-key`), mesma seleção nas duas polaridades: X1 cognitivoService `raw.vagas == null`→`=== null` com `-t 'chave vagas ausente'` → `1 passed | 3 skipped` / `1 failed | 3 skipped` («uma chamada a RPC dos testes: expected +0 to be 1»); X2 exportacaoService `if (linha.vagaTitulo !== null) return linha`→`if (false) …` com `-t 'nunca sobrescreve'` → `1 passed | 7 skipped` / `1 failed | 7 skipped` («o titulo do embed fica: expected 'Outro' to be 'Titulo do embed'»); X3 redacaoService sem o `throw NOT_FOUND` (testes = daRpc?.testes_aplicaveis) com `-t 'sem a entrada da candidatura'` → `1 passed | 5 skipped` / `1 failed | 5 skipped` («sem entrada: NOT_FOUND: expected 'resolveu' to be 'NOT_FOUND'»); árvore real `git diff --quiet HEAD -- src` rc=0 · `node scripts/p52_tipografia.cjs --base refs/gsd/52-31/sha -- <5 serviços>` → TIPOGRAFIA OK (149 linhas) · `npm run build` rc=0: `ler_testes_das_minhas_candidaturas`, `id, vaga:vagas(testes_aplicaveis)` e `ler_vagas_das_minhas_candidaturas` em build/assets/index-B9DljfU9.js; `vaga:vagas!inner(testes_aplicaveis)` AUSENTE de build/assets · `--caminhos` do «Comando de push» aplicado localmente aos 15 caminhos mudados + database.types.ts → 16/16 casam · `node scripts/p50_enumera.cjs --de origin/main(b0945868) --ate HEAD …` com os args exatos do plano → «SEM REVISAO: nenhum 52-REVIEW-G7B-<N>.md» (recusa esperada antes deste arquivo ser commitado; nada empurrado) · delta do Vitest NÃO re-rodado (custo): a linha da FRONTEIRA §Task 3 é `alteradas=0 · novas=0 · mordida=ok` · nenhum `migrate`/`run`/`db push`/`efdeploy`/`git push`/commit; nenhum arquivo do repositório editado além deste
files_reviewed: 16
files_reviewed_list:
  - supabase/migrations/20261011000007_p52_testes_das_minhas_candidaturas.sql
  - supabase/tests/p52_testes_candidato_smoke.sql
  - scripts/p52_ensaio.cjs
  - scripts/p52_mutacoes.cjs
  - src/features/avaliacao/services/avaliacaoService.ts
  - src/features/avaliacao/services/redacaoService.ts
  - src/features/avaliacao-cognitiva/services/cognitivoService.ts
  - src/features/privacidade/services/exportacaoService.ts
  - src/features/vagas/services/candidaturasService.ts
  - src/components/pages/__tests__/DashboardCandidatoPage.concluidasVagaNaoPublica.test.tsx
  - src/features/avaliacao/components/__tests__/AvaliacaoContainer.vagaNaoPublica.test.tsx
  - src/features/avaliacao/services/__tests__/avaliacaoService.vagaNaoPublica.test.ts
  - src/features/avaliacao/services/__tests__/redacaoService.vagaNaoPublica.test.ts
  - src/features/avaliacao-cognitiva/__tests__/cognitivoService.vagaNaoPublica.test.ts
  - src/features/privacidade/services/__tests__/exportacaoService.vagaNaoPublica.test.ts
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-32-PLAN.md
findings:
  critical: 0
  warning: 1
  info: 8
  total: 9
status: issues_found
---

# Phase 52 — 52-32 (G7B-1): Code Review Report

**Reviewed:** 2026-10-13T00:56:46Z
**Depth:** deep
**Files Reviewed:** 16
**Status:** issues_found (0 críticos · 1 warning · 8 info)

## Summary

Postura: assumi defeito e procurei onde o apply, o push ou um leitor errariam. Não achei nada que torne o apply da
`20261011000007` ou o push errado ou inseguro: a função é a 0006 com outra projeção (diff estrutural a partir do
primeiro `SET LOCAL`: só os nomes, a GUC, as duas colunas, o COMMENT, a varredura do WR-01 e a evidência mudam), a guarda e a
posse são byte a byte as da 0006, o ACL revoga PUBLIC e `anon` nominalmente, o POS recusa por execução as sete
mutações que inventei (cinco no próprio POS) e as A13/A14; o smoke52a sai 10/10 com a 0007 prefixada e `vistas=igual`,
as 14 mutações do runner mordem cada uma na sua letra, o WR-02 prova as duas polaridades sem deixar rastro em `vagas`
(impressão idêntica antes e depois), os quatro leitores chamam a RPC só com o embed nulo/ausente e uma vez, o
`--caminhos` cobre os 16 caminhos, lint = 89 = base, build com os dois marcadores no chunk eager e o `!inner` antigo
ausente. PROD: `20261011000007` fora do ledger e a função ausente (0/true).

O único WARNING é um ponto cego de FORMA do POS que eu provei por execução (duas mutações minhas passam pelo POS e só
morrem na cláusula (c) do smoke) — real, mas com o backstop a funcionar e com a mesma classe de limite que a 0006 já
carrega no ar; a proposta é backlog para o molde, não conserto na 0007 (mexer agora move âncoras e custa um review -2
sem ganho de segurança). Os INFO não pedem decisão.

## Os pontos da instrução, um a um (Task 4 `<context>`)

1. **R1 e NADA além.** Nenhuma policy, view, tabela ou coluna no diff (`git diff --stat refs/gsd/52-31/sha HEAD -- . ':!.planning'`: 15 arquivos, 1 migration que só tem `CREATE FUNCTION`/REVOKE/GRANT/COMMENT + os dois `DO`). «Público vê vagas ativas» intocada. UMA função. RH intocado (`SELECT_LISTA_RH`, `VAGA_ALLOWLIST`, `listAllCandidaturas`, `listCandidaturasByVaga`, `entrevistaService` não aparecem no diff). Embeds iguais salvo `vagas!inner(testes_aplicaveis)` → `vagas(testes_aplicaveis)` em `redacaoService.ts:160`. ✔
2. **A RPC.** `STABLE SECURITY DEFINER`, `SET search_path = ''`, nomes qualificados (`auth.uid()`, `auth.jwt()`, `public.candidaturas`, `public.vagas`, `public.candidatos`), guarda em `:133` antes do primeiro `FROM public.` (`:145`), sem argumento, posse/viva/junção idênticas à 0006 (as três âncoras `P_POSSE`/`P_VIVA`/`P_JUNCAO` do runner valem — A1/A2/A6/A7/A10 mordem), DOIS campos por `jsonb_build_object` explícito, nada sobre `vagas.status`/`deleted_at` (M5 recusada pelo POS; A2/A7 mordem no smoke), ACL com REVOKE de `anon` nominal (A5 morde em (f)), COMMENT presente (contrato de catálogo exige `obj_description`), PRE recusa se a função existir, POS com a varredura `regexp_matches(lower(v_cod), '\mv\.("?)([a-z_]+)\1', 'g')`/`m[2]` e `IS DISTINCT FROM ARRAY['aplica_cognitivo','id','testes_aplicaveis']` (A13 `v.Titulo` e A14 `v."titulo"` recusadas; M6 coluna faltante recusada). `MIGS`: a 0007 depois da 0006 e antes da 0004. Timeouts primeiro, sem BEGIN/COMMIT, «APLICAR COM» no cabeçalho. ✔ (ver WR-01 para o limite da forma)
3. **O smoke.** Atores lidos na execução (baseline por regras, nenhum uuid no arquivo); população recusada por `P52A FAIL (baseline)` se faltar ator ou com < 2 status não ativos no enum; (a) itera `enum_range(NULL::status_vaga)` ≠ `ativa` por PERTENCIMENTO com sentinela `p52a_sentinela` e opt-in alternado `(v_n % 2 = 0)` lidos como postgres DENTRO do envelope (A11/A12 mordem); todas as escritas (`:377`, `:496`, `:766/:768`, `:818`) dentro de blocos encerrados por `ERRCODE = 'P52A1'`; uma cláusula por `DO`, rótulo + SQLSTATE; a mensagem da baseline imprime booleanos e contagens, nunca título/e-mail/uuid; (c) exige `jsonb_object_keys` ordenadas IGUAIS ao trio e os tipos. ✔
4. **A1–A14.** 14/14 mordem na letra declarada (saída na `scope:`); `PARES` com `['52a','smoke52a']`, `PREFIXO` zera `smoke52a.pass/esperado`; `SMOKES` do runner com `P52A`/`52a`. ✔
5. **WR-02.** `FP_VAGAS_ESTADO` = o texto do revisor (a FRONTEIRA conferiu por `grep -nxF`; a forma `count:md5(id|status|deleted_at order by id)` é a de `52-REVIEW-G7-1.md:165`); `provaVagasEstado(fp)` pura, construída do parâmetro (o `<verify>` prova que a degradação muda o texto); vaga por predicado `status <> 'ativa' AND deleted_at IS NULL ORDER BY id`; três envelopes `P52W1`, um por coluna, premissa de coluna única julgada FORA do envelope; `(inesperado)`/`(premissa)` fora; nenhuma escrita fora. Re-executei as duas polaridades (verde real; `(status)`, `(deleted_at)`, `(estreita)` pelos rótulos exatos) com impressão própria idêntica antes/depois. ✔ (ver IN-01 sobre a vaga real)
6. **O cliente.** Quatro leitores; cada um chama `lerTestesDaMinhaCandidatura`/`lerVagasDasMinhasCandidaturas` SÓ com `== null` sobre o OBJETO do embed (nulo ou ausente — B7/B9 e minha X1 provam), uma vez (B8/B12/B13/B14), copia só o seu campo (`lerTestes…` devolve só `{testes_aplicaveis, aplica_cognitivo}` — B1; a redação usa só `testes_aplicaveis`, a prova só `aplica_cognitivo`, os currículos só `titulo` por `mesclarTitulosDasVagas`), desfecho de hoje no erro (sem lançar, sem eco — `catch { return null }`; redação `NOT_FOUND` sem cair no `is_padrao` — minha X3), casts confinados com o comentário «quem o retira é a Task 5 do 52-32» (`avaliacaoService.ts:137-145`); nenhum ciclo de import (grep vazio nas duas direções). D-52-G7B-5 sustenta-se: sem o quarto leitor, o card cognitivo da vaga não pública levaria a «indisponível». Testes antigos que mockam sem `rpc` verdes (16 + os dois do painel/exportação). Registros de vermelho e mordida da FRONTEIRA no contrato (pares `1 failed`/`1 passed` com asserção; B1–B14 na cópia descartável com `git diff --quiet`); re-executei três mordidas próprias. ✔
7. **«Comando de push».** O `--caminhos` por forma casa os 15 caminhos mudados + `database.types.ts` (16/16, conferido por máquina); `--revisoes …/52-REVIEW-G7B`, `--base refs/gsd/52-31/sha`, `--aplicado refs/gsd/52-32-tipos/sha`; enumeração em seco contra `origin/main` (b0945868) recusa com «SEM REVISAO» até este arquivo ser commitado — nada empurrado; marcadores no `index-B9DljfU9.js` e o embed antigo ausente. ✔
8. **Apply da Task 5 e a sequência.** O comando faz `p52_portao --modo apply && p46apply.cjs migrate <0007> > "$A" && p46apply.cjs sql "set transaction read only; select extract(epoch from now())" | node -e '…push {version:"20261011000007", aplicado_ate, fonte} em 52-APLICACOES.json…'; rc=$?; cat "$A"; test "$rc" -eq 0` — o `now()` do servidor entra no MESMO comando, com recusa se a versão já estiver no registro (ver IN-02 sobre o modo de falha). Sequência apply → tipos (temporário, `< /dev/null`, > 100000 octetos, as duas funções) → review G7B-M → pin `refs/gsd/52-32-tipos/sha` → push: escrita e sem código fora de review (regra (5) com o pin de publicação; `deriva_postgrest: parar` sobe o conjunto deste review com os casts). D-41 segunda emenda escrita (D-52-G7B-9: a 0007 vira o último apply; restauração = backup 06:31:59Z + 0006 e 0007 do git; nada aqui depende de backup). ✔

Riscos do `<threat_model>` tocados por execução: T-52-113 (A1, A6, A10, M4), T-52-114 (A3, M3, M7 via (c)), T-52-115 (A5), T-52-116 (A4, A8, A9, M1), T-52-117 (A11, A12), T-52-118 (A13, A14, M5, M6); o cliente (X1–X3 + B1–B14 da FRONTEIRA).

## Warnings

### WR-01: A varredura de colunas do POS da 0007 não enxerga a linha inteira (`to_jsonb(v)`) nem um segundo alias de `public.vagas` — duas mutações passam pelo POS e só morrem na cláusula (c) do smoke

**File:** `supabase/migrations/20261011000007_p52_testes_das_minhas_candidaturas.sql:253-256` (a varredura `\mv\.("?)([a-z_]+)\1` + a igualdade) e `:237-249` (a âncora da junção e a contagem de `jsonb_build_object(`)
**Issue:** O POS exige o conjunto `{aplica_cognitivo, id, testes_aplicaveis}` IGUAL, uma única `jsonb_build_object(` e a presença literal de `JOIN public.vagas v ON v.id = c.vaga_id`. Provei por execução (`--migracoes=` com cópias mutadas) que duas sobre-projeções satisfazem as três condições e PASSAM o POS: (M3) `'aplica_cognitivo', v.aplica_cognitivo, 'tudo', to_jsonb(v)` — a linha inteira de `vagas` (salário, descrição, requisitos) sai dentro do objeto sem nenhuma referência `v.<coluna>` nova; (M7) `JOIN public.vagas w ON w.id = c.vaga_id` + `'titulo', w.titulo` — o alias `w` fica fora do padrão `\mv\.`. Nas duas, quem reprovou foi `P52A FAIL (c)` (chaves `…|tudo` e `…|titulo`), ou seja, o smoke no ensaio — não o portão da migration. Hoje o texto da 0007 está correto e pinado; o buraco é da FORMA do portão (CLAUDE.md «varra pela FORMA»): um POS que vigia «v.<coluna>» não vigia «a linha v». A 0006 em PROD tem o mesmo limite (e mais o do WR-01 anterior).
**Fix:** Proposta = **backlog** para o molde das próximas funções p52 (NÃO reescrever a 0007 agora: moveria as âncoras `A_PROJ_FIM`/`P_JUNCAO`, exigiria rodar tudo de novo e um review -2, sem ganho — a cláusula (c) cobre no ensaio que precede todo pin de apply). Texto a somar ao POS do próximo molde, depois da contagem de `jsonb_build_object(`:
```sql
  -- A linha inteira de vagas e um segundo alias também são sobre-projeção.
  IF lower(v_cod) ~ '\m(to_jsonb|to_json|row_to_json|jsonb_strip_nulls)\s*\(\s*v\s*\)' OR lower(v_cod) ~ '\mv\.\*' THEN
    RAISE EXCEPTION 'P52-0N POS-PORTAO: % projeta a linha inteira de vagas', c_sig;
  END IF;
  IF (length(v_cod) - length(replace(v_cod, 'public.vagas', ''))) / length('public.vagas') <> 1 THEN
    RAISE EXCEPTION 'P52-0N POS-PORTAO: % cita public.vagas mais de uma vez (segundo alias)', c_sig;
  END IF;
```
E uma mutação de RECUSA (`A15`-equivalente) que o prove por execução no runner. Se o operador preferir «consertar agora» na 0007, o custo é o descrito; a segurança em PROD não muda num caso nem no outro.

## Info

### IN-01: `provaVagasEstado` escreve numa vaga REAL dentro de envelopes que revertem — risco medido e aceitável, inclusive se a outra janela criar uma vaga inativa hoje

**File:** `scripts/p52_ensaio.cjs:411-415` (predicado `status <> 'ativa' AND deleted_at IS NULL ORDER BY id LIMIT 1`) e `:422-466` (os três envelopes `P52W1`)
**Issue:** Três camadas (subtransação `P52W1` que reverte, requisição do ensaio que aborta pelo sentinela, Management API numa única transação) + `(iv)` impressão de volta = base. Medi: impressão de `vagas` idêntica antes e depois da minha execução (`15:dd770c98…`, 12 elegíveis). Se a janela de cadastro criar hoje uma vaga `inativa`/`rascunho` com uuid menor, ela pode ser a escolhida: o trigger `vagas_enforce_status_soft_delete_sync` só coage `ativa`→`arquivada`, logo os três passos continuam mudando UMA coluna (o status-alvo é o primeiro valor do enum ≠ `ativa` e ≠ atual), a prova passa igual e nada persiste; o efeito residual é um lock de linha nessa vaga por < 1 s. A única vaga que NÃO pode ser escolhida é uma `ativa` — e o predicado a exclui (por isso o predicado existe).
**Fix:** Nenhuma ação. (Se um dia o predicado não achar vaga, a recusa é alta: `P52W FAIL (baseline)`.)

### IN-02: O instante do apply é lido numa SEGUNDA requisição depois do `migrate` — a falha é alta, mas o re-run é recusado pelo PRE

**File:** `52-32-PLAN.md` Task 5, Passo 1 (o comando do apply)
**Issue:** `migrate` e `sql "… now()"` são duas requisições no mesmo comando; se a segunda falhar (rede), a 0007 está no ledger, `52-APLICACOES.json` não foi escrito, `rc≠0` e `cat "$A"` mostram o apply; repetir o comando é recusado pelo PRE («JA existe») e pelo portão. O caminho de recuperação é escrever o registro à mão com o instante lido por `node p46apply.cjs sql` só-leitura — o molde do 52-31 tem o mesmo desenho e foi aceito.
**Fix:** Nenhuma decisão agora; se acontecer, registrar à mão na FRONTEIRA §Task 5 com o `now()` lido em seguida (não inventar o instante).

### IN-03: `p50_enumera` em seco recusa com «SEM REVISAO» — esperado; o `--caminhos` casa 16/16 por máquina

**File:** `52-32-PLAN.md` «Comando de push»
**Issue:** Antes deste arquivo ser commitado o enumerador não tem revisão para ler; a cobertura da forma eu conferi por `RegExp.test` sobre `git diff --name-only` + `database.types.ts`: 16/16. Nenhum `ALHEIO` previsto.
**Fix:** Nenhuma; re-rodar o seco depois do commit deste review (a Task 7 já o faz).

### IN-04: Custo R2 aceito — `lerTestesDaMinhaCandidatura` lê a lista inteira do candidato e escolhe por `candidatura_id`

**File:** `src/features/avaliacao/services/avaliacaoService.ts:147-150`
**Issue:** Uma RPC por leitura com embed nulo; no painel, uma por candidatura elegível (D-52-G7B-4, R2 do plano). Leitura STABLE, só do próprio candidato.
**Fix:** Nenhuma. (Se o volume crescer, memoizar por sessão no TanStack Query é o caminho — fora deste plano.)

### IN-05: Varredura «pela FORMA» do CLAUDE.md sobre o smoke52a — quatro `<> 1` deliberados e um literal `'inativa'` em (c)

**File:** `supabase/tests/p52_testes_candidato_smoke.sql:383, 498, 771, 820` e `:496`
**Issue:** Os quatro achados são `ROW_COUNT <> 1` de UPDATE por id (escopo deliberado, não fotografia). Em (c) a vaga do alvo é posta em `'inativa'` por literal: se o enum perder esse valor o smoke falha ALTO (cast inválido), nunca verde vácuo; (a) itera o enum na execução.
**Fix:** Nenhuma.

### IN-06: Dois casts estreitos em `avaliacaoService.ts` — o terceiro `<verify>` da Task 5 compara com a contagem do pin (B1/B2), compatível com o R7

**File:** `src/features/avaliacao/services/avaliacaoService.ts:137-145` (novo) e `:354-362` (Phase 27, fica)
**Issue:** O verify conta `rpc as unknown as` nos dois serviços em `refs/gsd/52-31/sha` e no commit dos tipos; o da Phase 27 (`get_avaliacao_status`) não é deste plano e permanece — a comparação é relativa, não «zero». O comentário do cast novo nomeia a Task 5 como quem o retira.
**Fix:** Nenhuma; só não «aproveitar» para tirar o cast da Phase 27 no commit dos tipos (escopo).

### IN-07: FRONTEIRA `sessao_b_encerrada head=6e9fa444`; HEAD `31facac9` difere só em `.planning/`

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-32-FRONTEIRA.md:1198`
**Issue:** `git diff --quiet 6e9fa444 HEAD -- . ':!.planning'` rc=0 — nenhum código depois do fim da sessão B; o `reviewed_head` deste review é o HEAD atual e cobre tudo.
**Fix:** Nenhuma.

### IN-08: Testes antigos que mockam o cliente sem `rpc` seguem verdes e intocados

**File:** `src/features/avaliacao-cognitiva/__tests__/prova-cognitiva.test.tsx`, `src/features/avaliacao/services/__tests__/redacaoEscopo.test.ts`, `src/features/privacidade/services/__tests__/exportacaoService.test.ts`, `src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx`
**Issue:** Nenhum deles aparece no diff; rodados: 16 + (dentro dos 97) verdes — a exceção do `rpc` ausente é capturada e o desfecho é o de hoje, como a D-52-G7B-4 mediu.
**Fix:** Nenhuma.

---

_Reviewed: 2026-10-13T00:56:46Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
