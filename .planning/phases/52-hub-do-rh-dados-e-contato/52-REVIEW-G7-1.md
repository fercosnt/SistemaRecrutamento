---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-12T20:41:27Z
depth: deep
diff_base: 70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8
reviewed_head: 133429d103c7e70d589b6068f33dbb76fc3f3d46
scope: review adversarial bloqueante nº 1 do gap G-52-7 (plano 52-31, Task 4), que decide o apply da 20261011000006 em PROD e o push do G-52-7 para `main` (a Vercel publica o `main`). Escopo — 70528fba..133429d1 fora de .planning (8 arquivos, 7 commits de código) mais o 52-31-PLAN.md inteiro, como o programa que escreve em PROD. Lidos INTEIROS — a migration 0006 (266 linhas: cabeçalho, PRE, a função, ACL, COMMENT, POS), o smoke52p (871 linhas: guarda, p52p_chamar/p52p_vaga_visivel/p52p_resumo, baseline, (a)–(j)), candidaturasService.vagaInativa.test.ts, DashboardCandidatoPage.vagaInativa.test.tsx, o plano (`<context>`, Tasks 1–6, o «Comando de push», o comando do apply da Task 5); as regiões mudadas com -U8 de p52_ensaio.cjs (MIGS/PARES/PREFIXO), p52_mutacoes.cjs (SMOKES, V06/S52P/fnVagas, P1–P10), candidaturasService.ts (RPC_VAGAS_DAS_MINHAS_CANDIDATURAS, mesclarVagasDasCandidaturas, lerVagasDasMinhasCandidaturas, a mescla em listCandidaturas) e DashboardCandidatoPage.tsx (os dois data-testid). Contexto — 52-31-FRONTEIRA.md §Task 1–3 inteiro, o bloco G-52-7 do 52-UAT.md com as duas emendas, 52-REVIEW-GAP-2 e 52-REVIEW-UAT-1 (o molde), a 0001 (ACL, POS) e o smoke52l (cabeçalho, p52l_chamar), 20260607000006:37-42 (candidato_le_propria_candidatura), o cabeçalho e o parser de frontmatter do p52_portao.cjs, o parser de `--revisoes` do p50_enumera.cjs, capturar()/diferencas/ponto()/FIM do p52_ensaio.cjs, trocar/extrair/fnNova/julgarMutacao/julgarControle do runner, p46apply.cjs (migrate = corpo + INSERT no ledger na MESMA requisição, md5 lido de volta), useCandidaturas.ts (:96-130, :475-480), os dois testes antigos que mockam o cliente sem `rpc`, 52-APLICACOES.json, scoresRhService.ts:195-212 (o molde do cast), os leitores residuais citados na FRONTEIRA (avaliacaoService.ts:112-148, AvaliacaoContainer.tsx:320-330/474-486, redacaoService.ts:146-166, exportacaoService.ts:1000-1086, CurriculosBloco.tsx:68-73/134-140, useIdsAvaliacoesConcluidas.ts:50-82, VagaDetalhePage.tsx:84-94, vagasService.ts:368-400), CLAUDE.md §Via de apply ATUAL/§Portões/§Security Rules. Re-executado pelo revisor (tudo só leitura ou dentro do ensaio que aborta; nada aplicado, publicado, empurrado ou commitado; nenhum arquivo do repositório editado além deste) — sonda PROD só leitura antes e depois de todo ensaio (no_ledger=0, ausente=true; impressão digital PRÓPRIA de `public.vagas` inteira `15:5adc811e483076d79234a461cfeea6ee` e de `(id,is_rascunho,deleted_at)` de `candidaturas` `44:06f8ec33c22d90ddf86ba7658fb956a0`, IGUAIS antes e depois); `p52_ensaio.cjs --vistas --migracoes=0006 smoke52p` → ENSAIO VERDE · vistas=igual · smokes=[52p=10/10] · evidencia=painel:vagas_candidato=ok 52p.pop=cand:22,naturais:16 52p.alvo=publica (1161 ms); `p52_mutacoes.cjs --so=P1..P10` → 10/10 mordem, cada uma na sua letra (P1→b, P2→a, P3→c, P4→g, P5→f, P6→h, P7→i, P8→e, P9→e, P10→d), controle 52p=10/10, nada persistiu; rodada completa → 27/27 mordem (L1–L8, G1–G9, P1–P10; B1–B6 aposentadas), controles 52l=20/20, 52g=14/14, 52p=10/10, nada persistiu; QUATRO mutações próprias via `--mutacao` (CREATE OR REPLACE depois da 0006): MA guarda sem coalesce (`v_role <> 'candidato'`) → P52P FAIL (e) [sem_papel:ok:n=2] MORDE; MB sem `ORDER BY c.created_at DESC, c.id` → ENSAIO VERDE 10/10 (a ordem não é vigiada — IN-01); MC `'status', c.status` na projeção → P52P FAIL (c) MORDE; MD `SECURITY INVOKER` → P52P FAIL (a) MORDE; QUATRO migrations MUTADAS no scratchpad passadas por `--migracoes=<arquivo>` (o PRE/POS da migration rodam sobre o texto mutado, no ensaio que aborta): mf1 `v.descricao` → P0001 P52-06 POS-PORTAO fora da allowlist {descricao,id,titulo} (o POS MORDE por forma); mf2 `v.Descricao` → o POS NÃO reprovou, reprovação só em runtime P52P FAIL (a) [42703 column v.descricao does not exist]; mf3 `'status', c.status` → POS passa, P52P FAIL (c) MORDE; mf4 `'departamento', v.Titulo` (coluna REAL, caixa mista) → o POS NÃO reprovou, P52P FAIL (a) [alvo_sem_titulo_e_departamento_da_vaga:ok:n=2] (o smoke morde pelo valor — WR-01); regressão `p52_leituras_rh_smoke.sql` controle (`--sem-migracoes`) 52l=20/20 e tratamento (`--migracoes=0006`) 52l=20/20, verdes na mesma execução; `npx vitest run src/features/vagas src/components/pages/__tests__` → 23 arquivos, 224 verdes; `p52_vitest_delta.cjs` → `base=0d70ac7 2725/2 · head=133429d 3144/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok`; guardas `src/__tests__/guards` + copyPortoesLgpd + promessasComExecutor → 171 verdes, 2 vermelhos = a baseline conhecida do promessasComExecutor (Phase 46 concluída); `npm run -s lint` → exit=2, 89 `error TS` (= base), nenhum nos arquivos tocados; `p52_tipografia.cjs --base refs/gsd/52/base -- DashboardCandidatoPage.tsx` → TIPOGRAFIA OK (71 linhas); `npm run build` rc=0 e `painel-vaga-titulo`, `painel-vaga-departamento` e `ler_vagas_das_minhas_candidaturas` todos em `build/assets/index-CFPYr-z6.js` (o mesmo chunk da FRONTEIRA §Task 2; `painel-vaga-titulo` ocorre em src só no DashboardCandidatoPage.tsx fora de testes); numa cópia de 133429d1 por `git archive` no scratchpad (nada no repositório; `git status -- src` vazio depois), cinco mutações do serviço contra os dois testes novos (controle 18/18): C1 sem a guarda «embed presente» → 2 vermelhos (não sobrescreve / UMA vez); C2 segunda chamada à RPC por leitura → 1 vermelho (UMA vez); C4 typeguard aceita `titulo` não-string → 1 vermelho (malformada); C8 `departamento ?? ''` → 2 vermelhos; C7 `!== null` (embed `undefined` não mesclado) → 18/18 VERDE (IN-06); as duas sondas só leitura da Task 3 re-rodadas como escritas → `d31c78bb` entrevista_online vaga_visivel=false, `f59e7281` true, caso natural `f73682b6` avaliacao_assincrona vaga_visivel=false; contagem agregada própria só leitura → naturais=16, em_avaliacao_assincrona=1, com_curriculo=2, cand_sem_departamento=11, vagas_sem_departamento=4, inativa=1, arquivada=15, vaga_com_deleted_at=0, rascunhos_prod=0, excluidas_prod=0 (= a tabela da FRONTEIRA §Task 3); `candidatos_user_id_key UNIQUE(user_id)` lido do catálogo; `git fetch origin main` → origin/main = 70528fba (ancestral de HEAD); `p50_enumera.cjs --de origin/main --ate HEAD` com o `--caminhos`/`--assunto` do plano, SEM `--revisoes`/`--aplicado` → 17 commits, 10 planning (de7d5f1f, 7f46b8ee, 73976117 entre eles, 0 arquivos fora de .planning), 7 codigo, 0 ALHEIO, `enumeracao ok`, rc=0; a enumeração EXATA com `--revisoes …/52-REVIEW-G7 --base refs/gsd/52-30/sha` rodada DEPOIS de gravar este arquivo — ver IN-08.
files_reviewed: 9
files_reviewed_list:
  - supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql
  - supabase/tests/p52_painel_vaga_smoke.sql
  - scripts/p52_ensaio.cjs
  - scripts/p52_mutacoes.cjs
  - src/features/vagas/services/candidaturasService.ts
  - src/features/vagas/services/__tests__/candidaturasService.vagaInativa.test.ts
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-31-PLAN.md
findings:
  critical: 0
  warning: 2
  info: 9
  total: 11
status: issues_found
---

# Phase 52: Code Review Report — gap G-52-7 (52-31), rodada 1

**Reviewed:** 2026-10-12T20:41:27Z
**Depth:** deep
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Parti da hipótese de que havia defeito e procurei por ele nos quatro lugares onde ele faria
estrago: no texto que vai a PROD (a 0006), no portão que diz que ele é seguro (o POS e o
smoke52p com as dez mutações), no cliente que passa a chamar a função, e nos dois comandos do
plano que escrevem fora do repositório (o apply da Task 5 e o «Comando de push»). **Não achei
nada crítico e nada destrutivo.**

- **O que vai a PROD é uma função só, e ela faz o que a truth pede e nada além.** Fora de
  comentários a migration tem `SET LOCAL` ×2, um `DO $pre$`, um `CREATE FUNCTION`, três
  instruções de ACL, um `COMMENT` e um `DO $pos$` — nenhuma policy, view, tabela, coluna, nenhuma
  escrita de linha, nenhum `BEGIN`/`COMMIT`. A função é `STABLE SECURITY DEFINER` com
  `search_path = ''`, todo nome qualificado (`auth.uid()`, `auth.jwt()`, `public.candidaturas`,
  `public.vagas`, `public.candidatos`), sem argumento, guarda fail-closed antes do primeiro
  `FROM public.`, posse pelo predicado da policy, filtro de candidatura viva, projeção de
  exatamente `{candidatura_id, titulo, departamento}` por `jsonb_build_object` explícito e nada
  sobre `v.status`/`v.deleted_at`. O ACL fecha `PUBLIC` e `anon` nominalmente e abre só a
  `authenticated`. O diff do cliente não toca o embed `vaga:vagas (...)`, nem `SELECT_LISTA_RH`,
  nem `VAGA_ALLOWLIST`; o cartão só ganhou dois `data-testid`. A emenda do UAT diz exatamente o
  que a D-52-G7-1 e a D-52-G7-4 decidem, com a truth e o `status: failed` byte a byte.
- **O portão morde onde importa.** Reproduzi o ensaio (10/10, vistas iguais), as dez mutações
  do runner (cada uma na sua letra) e a rodada completa (27/27). Inventei oito mutações minhas:
  quatro no texto da função depois da migration e quatro no texto da PRÓPRIA migration, para
  exercitar o PRE/POS. Toda mutação que muda um VALOR devolvido, um papel aceito ou uma chave do
  objeto é mordida pelo smoke — inclusive a guarda sem `coalesce` (que o POS pega por forma
  e, se o escapasse, (e) pega pelo `sem_papel`) e a função como `SECURITY INVOKER` (que (a) pega
  porque a RLS volta a esconder a vaga). Nada persistiu em nenhuma rodada: além do `PERSISTIU`
  do ensaio, medi por conta própria a impressão digital de `public.vagas` inteira e dos
  sinalizadores de `candidaturas` antes e depois — iguais.
- **O cliente faz só o que a D-52-G7-4 pede.** Uma chamada por leitura, só com embed nulo, só
  dois campos atravessam, embed presente intacto, erro vira fallback sem eco; o cast é estreito
  e tem o comentário de quem o retira. Os dois testes antigos que mockam o cliente sem `rpc`
  não mudaram (não estão no diff) e seguem verdes. Provei a mordida dos testes novos com cinco
  mutações numa cópia descartável: quatro reprovam o teste certo.
- **Os dois comandos do plano estão certos.** O `--caminhos` por forma cobre os oito caminhos
  mudados desde `refs/gsd/52-30/sha` (enumeração em seco: 7 `codigo`, 10 `planning`, 0 ALHEIO,
  com `de7d5f1f`, `7f46b8ee` e `73976117` como `planning`); os dois marcadores moram no mesmo
  chunk `index-*` do build local. O apply da Task 5 grava a entrada da 0006 em
  `52-APLICACOES.json` no mesmo comando do `migrate`, com o `now()` do servidor lido DEPOIS da
  resposta e arredondado para cima; a consequência da D-41 (o 52-19 só depois de um backup
  COMPLETED posterior a esse instante) está escrita no `<context>`, na Task 5 e nas truths.

Achei **dois WARNINGs**, nenhum dos quais torna o apply ou o push errado ou inseguro; os dois são
sobre a cobertura dos portões, e é o operador que dispõe deles:

- **WR-01** — a varredura «por forma» do POS sobre `v.<coluna>` é sensível a caixa: `v.Titulo`
  passou pelo POS da migration mutada (mf4) e só o smoke (a) reprovou, pelo valor. O POS é a
  primeira das duas camadas, e a segunda mordeu; mas um portão por forma que não enxerga o idioma
  do SQL (identificadores sem aspas são dobrados para minúsculas) tem o mesmo defeito de classe
  que o CLAUDE.md §Portões descreve. Conserto de uma linha; custa um review novo.
- **WR-02** — a observação 2 da §Task 1 da FRONTEIRA: `capturar()` não tem chave para
  `public.vagas`, e o smoke52p escreve `vagas.status`/`deleted_at` dentro dos envelopes. Nada
  persistiu (medido); e um envelope `P52P1` reverte mesmo sem a atomicidade da requisição. Mas
  uma escrita que escapasse NÃO seria detectável pelo ensaio hoje.

As INFOs registram o que medi e não precisa de decisão: a ordem do array não é vigiada (MB verde);
o POS só varre `v.` (uma chave de `c.<coluna>` passa por ele e cai em (c)); a diferença textual
entre o predicado da função e o da policy; o silêncio do cliente num erro da RPC; o rascunho
(`is_rascunho`) que o `listCandidaturas` lista e a RPC exclui; a mescla do embed `undefined`
(C7 verde); o custo de (d) crescendo com a população; o resultado da enumeração exata; e a
segunda chamada por carga (`useCandidaturasCount`), que é a R9 confirmada.

### Os pontos da instrução, um a um

| # | Ponto | Veredito | Evidência |
|---|---|---|---|
| (1) | A truth e NADA além: nenhuma policy/view/tabela/coluna; «Público vê vagas ativas» intocada; UMA função; embed e lado do RH intocados; o card só ganhou `data-testid` | OK | Fora de comentários a 0006 tem: `SET LOCAL` ×2, `DO $pre$`, `CREATE FUNCTION` ×1, `REVOKE` ×2, `GRANT` ×1, `COMMENT` ×1, `DO $pos$` (contei no arquivo; o `<verify>` 2 da Task 1, re-lido, dá `proibidas=0 funcoes=1`). Nenhum `CREATE POLICY`/`ALTER TABLE`/`UPDATE public.`/`INSERT` — a policy pública não é citada fora de comentário (só em texto). `git diff --stat 70528fba..HEAD -- . ':!.planning'` = exatamente os 8 arquivos do `files_modified`; o diff de `candidaturasService.ts` não toca as linhas 36-87 (`CANDIDATO_ALLOWLIST`, `VAGA_ALLOWLIST`, `EMBEDS_NOTAS_CARD`, `SELECT_LISTA_RH`) nem o `select(...)` do embed; o diff de `DashboardCandidatoPage.tsx` são duas linhas, cada uma só com o atributo `data-testid` (classes, cópia e fallbacks `|| 'Vaga não encontrada'` / `|| 'N/A'` iguais). Único consumidor de `useCandidaturas`/`useCandidaturasCount` em src é o próprio painel (grep), e ele lê `vaga?.titulo` (:398, :563) e `vaga?.departamento` (:404) só — nenhum leitor de `vaga.status`/`vaga.id` depende do objeto mesclado ter mais chaves |
| (2) | A RPC: DEFINER, STABLE, `search_path` vazio e nomes qualificados; guarda antes do primeiro `FROM public.`; sem argumento; posse = a policy; viva; DOIS campos; nada de `vagas.status`/`deleted_at`; ACL do molde com `anon` nominal; COMMENT; PRE/POS que mordem; timeouts primeiro; sem BEGIN/COMMIT | OK (WR-01 na varredura do POS) | `:120-151`: `STABLE SECURITY DEFINER`, `SET search_path = ''`, `auth.uid()`/`auth.jwt()`/`public.*` qualificados, `IF v_uid IS NULL OR coalesce(v_role, '') <> 'candidato'` em `:133` antes do `FROM public.candidaturas` em `:144`; `pronargs = 0`; `WHERE c.candidato_id IN (SELECT ca.id FROM public.candidatos ca WHERE ca.user_id = v_uid)` ≡ `candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = (select auth.uid()))` da policy (`20260607000006:39-42`; `candidatos_user_id_key UNIQUE(user_id)` lido do catálogo — IN-03 sobre o «verbatim»); `c.deleted_at IS NULL AND c.is_rascunho = false`; `jsonb_build_object` com 3 chaves e `v.titulo`/`v.departamento` só; `:153-155` REVOKE PUBLIC, REVOKE `anon`, GRANT `authenticated` (= `0001:204-206`); COMMENT `:157-171` (sem `public.<nome>(` em forma de chamada, sem termo da guarda LGPD-04 — guardas 171 verdes); `:92-93` os dois `SET LOCAL` primeiro; nenhum `BEGIN`/`COMMIT`. PRE: recusa sem as três tabelas e se a função já existir (não reaplicável). POS: catálogo, ACL por `aclexplode` (igual à 0001:438-440), guarda literal antes do primeiro `FROM public.`, `v_role` só com `coalesce`, posse/viva/junção por `strpos`, `jsonb_build_object(` = 1, `v.<coluna>` ⊆ {id,titulo,departamento}, sem `'ativa'`. **Mordida provada por execução:** mf1 (`v.descricao`) → `P52-06 POS-PORTAO … fora da allowlist {descricao,id,titulo}`; MA (sem coalesce, via `--mutacao`) → (e). **Ponto cego:** mf4 (`v.Titulo`) passa pelo POS — WR-01 |
| (3) | O smoke: atores na execução, população publicada e recusada se vazia, escrita só em envelopes que revertem (triggers medidos), uma cláusula por `DO`, rótulo e SQLSTATE, nada de título/e-mail impresso, (j) sem mutação justificada | OK | Baseline `:223-340`: dono/alvo/outro/admin/rec por consulta, nenhum uuid literal; `52p.pop=cand:22,naturais:16 52p.alvo=publica` publicado; `P52P FAIL (baseline)` se faltar dono, alvo, vaga, outro, admin ou rec (só booleanos e contagem na mensagem). Escritas: (a)/(c) `UPDATE public.vagas SET status`, (i) `SET deleted_at = now()`, (h) `UPDATE public.candidaturas SET is_rascunho`/`deleted_at` — todas dentro de `BEGIN … RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52P1' … EXCEPTION WHEN SQLSTATE 'P52P1'`, com `WHEN OTHERS` virando `erro INESPERADO` (nada julgado); triggers de `vagas` (`update_vagas_updated_at`, `vagas_status_soft_delete_sync_trg`) e de `candidaturas` (só `update_candidaturas_updated_at` para essas colunas) conferem com a tabela do Passo 0 (FRONTEIRA §Task 1) e com o `<context>`. Dez blocos `DO`, um por letra, cada um com `P52P FAIL (<letra>): [<rótulos>]`; `p52p_resumo` imprime só `err:`/`ok:n=`/`ok:tipo=`; (c) imprime só CHAVES do primeiro elemento torto; (b)/(d) só contagens. (j) pelo catálogo (`attnotnull`, FK `convalidated` com `conkey = ARRAY[attnum]` e `confrelid = 'public.vagas'`), com a razão escrita (`:86-90`: DDL em `candidaturas` = lock exclusivo em tabela quente). `smoke52p.esperado` = `'10'` num único literal (`:139`) = 10 cláusulas. `$p52_so_ensaio$` é a primeira instrução; nenhuma GUC do PRE/POS lida (roda igual com `--sem-migracoes`). Medido por mim: `vagas` inteira e os sinalizadores de `candidaturas` iguais antes/depois de cada rodada |
| (4) | P1–P10 mordem cada uma na sua letra, por troca literal do texto da migration (P10 em (d), com a razão de completude de (d) escrita); `MIGS` na ordem de aplicação, `PARES`, `PREFIXO` | OK | `--so=P1..P10` → `MUTACOES: 10/10 mordem; controle verde; nada persistiu`, letras P1→b, P2→a, P3→c, P4→g, P5→f, P6→h, P7→i, P8→e, P9→e, P10→d (rótulos iguais aos da FRONTEIRA §Task 2). Rodada completa → `27/27 mordem` (10 `P`, 8 `L`, 9 `G`; B1–B6 aposentadas pela regra 7). Cada `sql` é `trocar(fnVagas(), <alvo literal>, …)` com alvo único (o runner sai `ANCORA AUSENTE/AMBIGUA` se não for) — conferi os seis alvos (`P_POSSE`, `P_VIVA` com os 5 espaços e o `;\n`, `P_GUARDA`, `P_GUARDA_BLOCO`, `P_JUNCAO`, o `'departamento', v.departamento)`) contra o texto de `:133-147`; P5 é SQL cru de GRANT como a L6. O cabeçalho do smoke (`:91-96`) escreve a razão: P10 faz de (d) a primeira vermelha pela repetição e a COMPLETUDE de (d) não tem âncora única que a faça primeira vermelha. `MIGS` = 0001, 0002, 0003, 0005, **0006**, 0004 (ordem de aplicação, comentário com o porquê); `PARES` + `['52p','smoke52p']`; `PREFIXO` zera `smoke52p.pass`/`.esperado`; o diff do runner é só acréscimo (`julgarMutacao`/`julgarControle`/`aposentar` intactos — li as três). Nenhuma outra mudança de comportamento no ensaio (diff de 28 linhas: comentários, `MIGS`, `PARES`, `PREFIXO`) |
| (5) | O cliente: mescla só em embed nulo, só dois campos, no máximo uma chamada por leitura, erro = fallback sem eco, o cast estreito com o comentário de quem o retira, os dois testes antigos intocados e verdes, os fallbacks do cartão intactos | OK | `mesclarVagasDasCandidaturas`: `if (linha.vaga != null) return linha` (C1 muda → 2 testes vermelhos); `vaga: { titulo: e.titulo, departamento: e.departamento }` só (R1 da FRONTEIRA e C8 → vermelhos); `ehVagaDaMinhaCandidatura` fecha `candidatura_id`/`titulo` string e `departamento` string|null (C4 → vermelho); `!Array.isArray(entradas)` devolve as MESMAS linhas. `listCandidaturas`: `if (linhas.some((l) => l.vaga == null))` → UMA `await lerVagasDasMinhasCandidaturas()` (C2 segunda chamada → vermelho; R2 da FRONTEIRA → vermelho). `lerVagasDasMinhasCandidaturas`: `if (error) return null` e `catch { return null }` — nem lança nem copia `error.message` (teste «sem o texto do erro» com `JSON.stringify(r)`); cast `(supabase.rpc as unknown as (fn: string) => Promise<…>)` confinado à chamada, molde `scoresRhService.ts:202-212`, comentário «NARROW confined cast … quem o retira: o primeiro plano que rodar `npm run db:types < /dev/null` E empurrar `database.types.ts` pela via da fase». `candidaturasService.test.ts` e `DashboardCandidatoPage.reaberta.test.tsx` não estão no diff e passam (224/224). `VagaRow.departamento` é `string \| null` em `database.types.ts:4949` — o objeto mesclado cabe em `Partial<VagaRow>` sem `any` (lint 89 = base). Cartão: `:398` e `:404` só com o atributo novo |
| (6) | O diagnóstico dos residuais da Task 3 — conferir a medição, não decidir | OK (medição confere) | Re-rodei as duas sondas da Task 3 como escritas: `d31c78bb` (entrevista_online, vaga_visivel=false), `f59e7281` (true), caso natural `f73682b6` (avaliacao_assincrona, false). Contagem agregada própria, só leitura: naturais=16, em_avaliacao_assincrona=1, com_curriculo=2, cand_sem_departamento=11, vagas_sem_departamento=4, inativa=1, arquivada=15, vaga_com_deleted_at=0 — idêntica à da FRONTEIRA §Task 3. Li as linhas citadas: `avaliacaoService.ts:118` embed `vaga:vagas ( testes_aplicaveis, aplica_cognitivo )` → `:143-144` `testesAplicaveis = null` → `deriveCards` (`AvaliacaoContainer.tsx:482`: `!Array.isArray(raw) → []`) → `:323-329` «Nenhuma avaliação pendente»; `useIdsAvaliacoesConcluidas.ts:55-58` elege por etapa e `:75-79` deriva os mesmos cards; `redacaoService.ts:150` `vagas!inner(testes_aplicaveis)` → `:161-163` `NOT_FOUND`; `exportacaoService.ts:1005` `vaga:vagas ( titulo )` → `tituloDaVaga` `:1034-1038` → `vagaTitulo: null` `:1083` → `CurriculosBloco.tsx:138` `vagaSemTitulo` = «Vaga não identificada» (`:71`); `VagaDetalhePage.tsx:88-91` as duas frases; `vagasService.ts:372-376` `.is('deleted_at', null).single()` e as mensagens `:382`/`:397`. Cada arquivo:linha da tabela bate; as perguntas R1–R4 têm o número certo. Nada decidido aqui |
| (7) | O «Comando de push»: `--caminhos` por forma cobre TODO caminho mudado; `--revisoes`/`--aplicado`; os dois marcadores únicos no chunk `index-*` | OK | Os 8 caminhos do diff casam o padrão (conferi cada alternativa: `20261011000006_p52_[a-z0-9_]+\.sql`, `p52_painel_[a-z0-9_]+\.sql`, `p52_(ensaio\|mutacoes)\.cjs`, `candidaturasService(\.[A-Za-z]+)?\.test\.ts` com `vagaInativa`, `DashboardCandidatoPage\.[A-Za-z]+\.test\.tsx`); os 7 assuntos casam `^(feat\|fix\|test\|refactor\|chore\|docs)\(52-[0-9]{2}\): `. Enumeração em seco contra `origin/main` (= 70528fba depois de `git fetch`) sem `--revisoes`/`--aplicado`: 17 commits, 10 `planning` (de7d5f1f, 7f46b8ee, 73976117 com 0 arquivos fora de .planning), 7 `codigo`, 0 ALHEIO, `enumeracao ok`. O comando usa `--revisoes …/52-REVIEW-G7 --base refs/gsd/52-30/sha --aplicado refs/gsd/52-31/sha` — o parser do enumerador exige `  critical: 0` no bloco `findings:` e `reviewed_head:` hex (este arquivo os tem nessa forma). `npm run build` rc=0: `painel-vaga-titulo`, `painel-vaga-departamento` e `ler_vagas_das_minhas_candidaturas` em `build/assets/index-CFPYr-z6.js` (um arquivo só, o mesmo da FRONTEIRA); `painel-vaga-titulo` ocorre em src fora de testes só no painel — marcador único. A enumeração EXATA está em IN-08 |
| (8) | O apply da Task 5 grava a entrada da 0006 em `52-APLICACOES.json` no MESMO comando do `migrate`; a consequência da D-41 escrita | OK | Task 5 Passo 1: `p52_portao … --modo apply && node p46apply.cjs migrate <0006> > "$A" 2>&1 && node p46apply.cjs sql "set transaction read only; select extract(epoch from now())…" \| node -e "… j.aplicacoes.push({version:'20261011000006', aplicado_ate: <ceil>, fonte: …}) …"; rc=$?; cat "$A"; test "$rc" -eq 0` — a cadeia `&&` para no portão ou no `migrate` sem gravar; o `now()` é lido DEPOIS da resposta do `migrate` (o `p46apply.cjs migrate` manda o corpo + `INSERT INTO supabase_migrations.schema_migrations` na MESMA requisição, `:114`, e lê o md5 de volta, `:151`); recusa se a entrada já existir; a instrução «se o `migrate` passou e o registro falhou: NÃO reaplicar» está escrita. O verify 1 da Task 5 recusa versão p52 do ledger sem instante e exige o maior `aplicado_ate` = 0006. Hoje `52-APLICACOES.json` tem 0001, 0002, 0003, 0005 (sem 0006 — nada aplicado: `no_ledger=0`, `ausente=true`, medido antes e depois de tudo). A consequência da D-41 está no `<context>` («D-41 emendada, condição 1»), na truth, na Task 5 («o 52-19 só depois de um backup diário COMPLETED posterior a <aplicado_ate>; na prática, a manhã seguinte») e na R5 (emenda do 52-19 pelo orquestrador) |
| (9) | A emenda do UAT bate com a D-52-G7-1 e a D-52-G7-4 | OK | Bloco G-52-7 do `52-UAT.md`: a truth byte a byte, `status: failed`; item (i) depois do item 1 — «medido no planejamento — o cartão lê só `vaga?.titulo` e `vaga?.departamento` (`DashboardCandidatoPage.tsx:398,404,563`; a navegação usa `candidatura.vaga_id`); o parêntese acima (cidade, estado, status) era palpite: a leitura entrega título e departamento só, por allowlist» = D-52-G7-4 e = o que a função projeta; item (ii) depois do item 3 — a frase do operador verbatim e «vaga com `deleted_at` (e todo status não ativo) MOSTRA título e departamento, como a inativa; só a vaga INEXISTENTE segue com o fallback, e ela é impossível no banco (…) — o fallback fica provado por Vitest» = D-52-G7-1 + D-52-G7-6 = cláusulas (a)/(i) + P2/P7 + o caso (2) do painel. Os itens originais («vaga apagada (deleted_at) e vaga inexistente seguem com o fallback», «e o que mais o painel usa: cidade, estado, status») continuam presentes, não reescritos; o verify 2 da Task 3 é satisfeito pelo texto que li |
| (i) | `capturar()` não vigia `public.vagas` enquanto o smoke escreve `vagas.status`/`deleted_at` em envelopes: algo persiste? é detectável? | Nada persistiu; NÃO detectável pelo ensaio — **WR-02** | `capturar()` (p52_ensaio.cjs) tem as chaves ledger, revisao, funcoes, mutacoes, mutacoes_p52, fixtures, fixtures_p52, disp_anonimizados, usuarios_rh, opcoes_sjt — nenhuma sobre `vagas` nem `candidaturas`. Três camadas impedem a persistência: o envelope `P52P1` (subtransação revertida pelo `RAISE`, mesmo sem atomicidade da requisição), `ponto()` depois de cada parte (`p52.tx` LOCAL = `txid_current()`, senão `P52E FAIL (transacao)`) e o sentinela que aborta a requisição inteira. Medi por fora: `count:md5(to_jsonb(v))` de `public.vagas` inteira = `15:5adc811e…` antes e depois de cada ensaio e das rodadas de mutação; `(id,is_rascunho,deleted_at)` de `candidaturas` = `44:06f8ec33…` idem. Mas o `PERSISTIU` do ensaio não enxergaria uma escrita em `vagas` que escapasse — proposta em WR-02 |
| (ii) | A evidência RED da sessão B (R1–R4, mutações temporárias do serviço): os testes mordem nos comportamentos de (5)? | OK | Cópia de 133429d1 por `git archive` no scratchpad, `node_modules` por link, os dois testes novos: controle 18/18; C1 (embed presente sobrescrito) → «não sobrescreve um embed que veio» e «UMA vez … mescla só nelas» vermelhos; C2 (segunda chamada) → «UMA vez» vermelho; C4 (typeguard aceita `titulo` não-string) → «ignora entrada malformada» vermelho; C8 (`departamento ?? ''`) → «aceita departamento null» e «UMA vez» vermelhos; C7 (`!== null`) → 18/18 verde (IN-06: o ramo «ou ausente» não é exercitado). Com R1–R4 da FRONTEIRA (terceiro campo, chamada sem embed nulo, erro que escapa, diálogo sem título) isso cobre cada promessa de (5). `git status --porcelain -- src` vazio ao fim |

## Warnings

### WR-01: a varredura «por forma» do POS sobre `v.<coluna>` é sensível a caixa — `v.Titulo` passa pelo POS e só o smoke reprova, pelo valor

**File:** `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql:250-256`
**Issue:** O POS-PORTAO promete («toda referência `v.<coluna>` (varredura por FORMA) dentro de
{id, titulo, departamento}») e implementa com `regexp_matches(v_cod, '\mv\.([a-z_]+)', 'g')` —
sem `lower()` e sem a flag `i`. Em SQL, um identificador sem aspas é dobrado para minúsculas:
`v.Titulo`, `v.TITULO` e `v."titulo"` são a mesma coluna para o planner e NÃO são vistos pela
expressão (`[a-z_]+` não casa em `T`; `\."` não casa de jeito nenhum). Provei por execução, com
a migration mutada passada ao ensaio por `--migracoes=<arquivo>` (PRE e POS rodam sobre o texto
mutado): `mf1` (`'departamento', v.descricao`) → `P0001: P52-06 POS-PORTAO: … le coluna de vagas
fora da allowlist {id, titulo, departamento}: {descricao,id,titulo}` (o POS morde por forma);
`mf4` (`'departamento', v.Titulo`, coluna REAL) → o POS **passou**, e a reprovação veio só
depois, no smoke: `P52P FAIL (a): [rascunho_alvo_sem_titulo_e_departamento_da_vaga:ok:n=2, …]`.
Hoje nada errado vai a PROD: o texto revisado usa só minúsculas, e o smoke52p (a)/(c)/(d) morde
toda mutação que muda um valor ou uma chave devolvida — é por isso que isto não é crítico. Mas o
POS é um portão sobre o texto que vai ao ledger, e um portão por forma que não enxerga o idioma do
arquivo que vigia é a classe de defeito que o CLAUDE.md §Portões nomeia (o mesmo vale para
`v."coluna"`). O mesmo idioma `\mv\.([a-z_]+)` deve ser conferido antes de ser copiado para a
próxima migration de leitura.
**Fix:** uma linha, no `DO $pos$`:
```sql
    FROM regexp_matches(lower(v_cod), '\mv\.("?)([a-z_]+)\1', 'g') AS m;   -- e usar m[2]
```
ou, mantendo a forma atual, `regexp_matches(v_cod, '\mv\.([a-z_]+)', 'gi')` com
`lower(m[1])` no `array_agg` (não pega `v."titulo"`; a primeira forma pega as duas). Como toca o
texto da migration, «consertar agora» = commit `fix(52-31)` → o `<verify>` da Task 2 inteiro mais
o segundo `<automated>` da Task 1 sobre o sha do conserto → review `-2` (a regra 6 do portão). As
opções «backlog» (levar ao molde e à próxima migration p52 de leitura) e «aceitar» (o smoke é a
camada que morde pelo valor; a mutação exige editar o texto que o review lê inteiro) são
igualmente defensáveis; a minha proposta é **backlog**, porque o apply de hoje não fica mais
seguro com o conserto e cada rodada de conserto já trouxe blocker novo duas vezes (memória).

### WR-02: `capturar()` do ensaio não tem chave para `public.vagas` — uma escrita do smoke52p que escapasse do envelope não seria detectável pelo `PERSISTIU`

**File:** `scripts/p52_ensaio.cjs` (função `capturar()`, chaves `ledger … opcoes_sjt`); `supabase/tests/p52_painel_vaga_smoke.sql:367,482,800` (os `UPDATE public.vagas`)
**Issue:** É a observação 2 da §Task 1 da FRONTEIRA, deixada para o review. O smoke52p é o
primeiro smoke p52 que escreve em `vagas` (três `UPDATE` — `status` em (a) e (c), `deleted_at`
em (i)), e `capturar()` não fotografa `vagas` (nem `candidaturas`, que o smoke52l já escrevia e
foi deixada de fora de propósito pelo tráfego — comentário do próprio `capturar()`). Medi que
nada persistiu nesta rodada (impressão digital própria de `vagas` inteira igual antes e depois de
cada ensaio e de cada rodada de mutação; ver `scope`), e as três camadas de proteção são reais:
o envelope `P52P1` reverte a subtransação com ou sem atomicidade da requisição; `ponto()` acusa
uma transação que terminou no meio; o sentinela aborta tudo. A fraqueza é só de DETECÇÃO: se um
dia um `UPDATE public.vagas` ficar fora de um envelope (erro de autoria numa cláusula nova) E a
requisição não abortar como medido, o ensaio sairia verde com a vaga do alvo em `arquivada` ou
com `deleted_at` em PROD — e `vagas.status` é exatamente a coluna que o portão do bloco D (D-32,
a vaga `629a5f31`) vai ler.
**Fix:** uma chave nova em `capturar()`, no idioma de `usuarios_rh`/`opcoes_sjt`, mas estreita
para não envelhecer com o tráfego do RH (`updated_at`, texto):
```js
const FP_VAGAS_ESTADO =
  "(select count(*)::text || ':' || md5(coalesce(string_agg(v.id::text || '|' || v.status::text || '|' || coalesce(v.deleted_at::text, ''), E'\\n' order by v.id), '')) from public.vagas v)";
// … em capturar():  `${FP_VAGAS_ESTADO} as vagas_estado`
```
Só `id`, `status` e `deleted_at` entram — as três colunas que o smoke escreve; uma edição de
título ou de salário pelo RH entre as duas capturas não acusa `PERSISTIU`; uma mudança de status
pelo RH DURANTE um ensaio acusaria (rara; e em REPEATABLE READ o próprio ensaio já sairia 40001).
Toca `scripts/p52_ensaio.cjs` (dentro do `--caminhos`): «consertar agora» = `fix(52-31)` →
`<verify>` da Task 2 → review `-2`. Alternativas: «backlog» (acrescentar na rodada do bloco D,
que é quem lê `vagas.status`) ou «aceitar» (as três camadas + a medição desta rodada). A minha
proposta é **backlog, antes do 52-20** (o `p52_ensaio.cjs` é editado pelo bloco D de qualquer
jeito, e a chave serve ao portão da D-32).

## Info

### IN-01: a ORDEM do array (`created_at DESC, id`) não é vigiada por nenhuma cláusula — remover o `ORDER BY` passa 10/10

**File:** `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql:142`; `supabase/tests/p52_painel_vaga_smoke.sql`
**Issue:** Mutação própria MB (`--mutacao`: a função sem ` ORDER BY c.created_at DESC, c.id`) →
`ENSAIO VERDE … smokes=[52p=10/10]`. (a), (b), (d), (i) julgam por pertencimento e (h) compara
o retorno com `v_vivo` menos o alvo — os dois colhidos da mesma função, então uma ordem diferente
é consistente dos dois lados. O contrato do cabeçalho e do COMMENT nomeia a ordem, mas nenhum
consumidor depende dela: `mesclarVagasDasCandidaturas` indexa por `candidatura_id` num `Map`.
**Fix:** nenhuma decisão. Se a ordem passar a importar (uma tela que leia a RPC direto), uma
cláusula (k) comparando com `ORDER BY created_at DESC, id` lido como postgres, e uma mutação P11.

### IN-02: a allowlist do POS varre só `v.<coluna>` — uma chave a mais vinda de `c.<coluna>` passa pelo POS e é o smoke (c) que a reprova

**File:** `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql:243-256`
**Issue:** mf3 (`'status', c.status` como quarta chave, no texto da migration) → o POS passa
(`jsonb_build_object(` = 1; nenhuma `v.` nova) e o smoke reprova em (c)
(`dono_vivo_chaves:candidatura_id|departamento|status|titulo`). O POS vigia a tabela que a
função ATRAVESSA por ser DEFINER (`vagas`); as colunas de `candidaturas` o candidato já lê pela
própria RLS own-row (a RLS é por linha, não por coluna — comentário T-08-09), então não é
superfície nova. A allowlist exata de chaves é a cláusula (c), com P3 e mf3 provando a mordida.
**Fix:** nenhuma. Se um dia se quiser o POS também por chaves, contar os literais entre
`jsonb_build_object(` e `)` — mas a prova por execução já existe.

### IN-03: o predicado de posse é «verbatim» no sentido semântico, não textual

**File:** `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql:42-43,146`
**Issue:** O cabeçalho diz «POSSE = o predicado da policy `candidato_le_propria_candidatura` …
verbatim: `candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = auth.uid())`». A
policy (`20260607000006:40-41`) escreve `user_id = (select auth.uid())`; a função escreve
`ca.user_id = v_uid` com `v_uid := auth.uid()` lido uma vez antes da guarda, e o alias `ca`. É o
mesmo conjunto (`candidatos_user_id_key UNIQUE(user_id)`, lido do catálogo), e é exatamente a
forma que o plano prescreve (Task 1 Passo 1) e que o POS ancora por `strpos`. Só o adjetivo
«verbatim» promete mais do que o texto entrega.
**Fix:** nenhuma; no SUMMARY, «equivalente ao predicado da policy» descreve melhor.

### IN-04: um erro da RPC é engolido em silêncio — na tela, a falha da função é indistinguível do fallback legítimo

**File:** `src/features/vagas/services/candidaturasService.ts` (`lerVagasDasMinhasCandidaturas`, `if (error) return null` / `catch { return null }`)
**Issue:** É o que a D-52-G7-4 e a T-52-109 pedem (a lista nunca cai, nada ecoa ao candidato),
e os testes provam. O custo é diagnóstico: se o hook deixar de dar `candidato` no token, se o
ACL mudar ou se a função sumir, o painel mostra «Vaga não encontrada» exatamente como mostraria
sem a RPC — o «sintoma idêntico» do CLAUDE.md, agora dentro do cliente. Nenhum `console.*` nem
telemetria.
**Fix:** sem decisão. Opcional, num plano futuro: `if (import.meta.env.DEV) console.warn('[G-52-7] ler_vagas_das_minhas_candidaturas', error.code)` — o código, nunca a mensagem.

### IN-05: candidatura RASCUNHO (`is_rascunho = true`) é listada pelo `listCandidaturas` e excluída pela RPC — um rascunho numa vaga não pública fica no fallback

**File:** `src/features/vagas/services/candidaturasService.ts` (o `select` de `listCandidaturas` filtra só `deleted_at`); `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql:147`
**Issue:** A RPC devolve só candidaturas vivas (`is_rascunho = false`, D-52-G7-3 — e (h)/P6
vigiam isso). O `listCandidaturas` não filtra `is_rascunho`, então um rascunho cuja vaga saiu do
ar entraria na lista com `vaga: null` e sem entrada na RPC → «Vaga não encontrada». PROD hoje:
`rascunhos_prod=0` (medido, só leitura), e o fluxo de cadastro não parece deixar rascunho na
tabela. Edge sem caso real.
**Fix:** nenhuma agora. Se rascunhos passarem a existir, decidir se o painel os mostra (e então a
RPC deveria incluí-los) ou os esconde (e então o `select` deveria filtrá-los) — nunca metade.

### IN-06: o ramo «embed ausente (`undefined`)» da mescla não é exercitado — `!==` em vez de `!=` passa 18/18

**File:** `src/features/vagas/services/candidaturasService.ts` (`mesclarVagasDasCandidaturas`, `if (linha.vaga != null) return linha`); `src/features/vagas/services/__tests__/candidaturasService.vagaInativa.test.ts`
**Issue:** O comentário da função promete «linhas cujo embed `vaga` veio nulo (ou ausente)», e o
`listCandidaturas` gateia com `l.vaga == null` — coerentes entre si. Mutação C7 (`!== null`) →
verde: todo fixture usa `vaga: null`. O PostgREST devolve `null` (nunca omite a chave) para um
embed sem linha, então o ramo é teórico.
**Fix:** nenhuma decisão. Um caso `linha('c1', undefined)` no teste da mescla fecharia a
promessa do comentário, se um dia se quiser.

### IN-07: a cláusula (d) chama a RPC uma vez por candidato dentro de UM `DO` (22 hoje) sob o `statement_timeout` de 5 s — cresce com a população

**File:** `supabase/tests/p52_painel_vaga_smoke.sql:560-603`
**Issue:** (d) é a cobertura de completude sobre a população natural, por desenho (cabeçalho
`:91-96`). Hoje: 22 candidatos, ~0,6 s a rodada inteira. A R7 do plano registra a queda da
população (depois do bloco D) como risco; a subida não está registrada. O teto é o do ensaio
(5 s por instrução), e um estouro sai `STATEMENT TIMEOUT` com código 3 — inconclusivo, não
falso-verde.
**Fix:** nenhuma agora. Se (d) chegar perto do teto (≈ 150–200 candidatos com candidatura viva),
amostrar por forma (os N de mais candidaturas) com o N publicado em `52p.pop`.

### IN-08: a enumeração EXATA do «Comando de push» recusa até este review estar commitado — comportamento esperado da regra WR-02 do enumerador

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-31-PLAN.md` («Comando de push»); `scripts/p50_enumera.cjs`
**Issue:** Rodei, em seco e sem push, `node scripts/p50_enumera.cjs --de $(git rev-parse origin/main) --ate HEAD --caminhos '<o do plano>' --assunto '<o do plano>'` sem `--revisoes`/`--aplicado`: `enumeracao ok: 17 commit(s)` (10 `planning`, 7 `codigo`, 0 ALHEIO). Com `--revisoes …/52-REVIEW-G7 --base refs/gsd/52-30/sha` (o `--aplicado refs/gsd/52-31/sha` ainda não existe — o pin nasce na Task 5), rodada DEPOIS de gravar este arquivo no disco, a saída está registrada abaixo, no fim deste relatório. O que ela diz é o esperado pelo desenho: o enumerador exige a revisão commitada UMA vez e idêntica a HEAD; depois do commit deste arquivo pelo orquestrador, o `p52_portao.cjs --modo revisao` (verify 1 da Task 4) é o próximo portão.
**Fix:** nenhuma — é o fluxo.

### IN-09: duas chamadas à RPC por carga do painel quando há vaga não pública — a R9 do plano, confirmada no código

**File:** `src/features/vagas/hooks/useCandidaturas.ts:475-480`; `src/components/pages/DashboardCandidatoPage.tsx:77-82`
**Issue:** O painel faz duas leituras (`useCandidaturas` com `limit 50` e `useCandidaturasCount`
com `limit 100`, chaves de query diferentes), cada uma passando por `listCandidaturas` → até duas
chamadas a `ler_vagas_das_minhas_candidaturas` por carga, zero quando toda vaga é pública. É a
D-52-G7-4 como escrita e a R9 do `<context>`. O teste (1) do painel só exige `toContain`, de
propósito. Custo: uma função STABLE de leitura própria, duas vezes.
**Fix:** nenhuma decisão aqui (R9 é do orquestrador/SUMMARY).

---

### Saída da enumeração exata (IN-08), rodada depois de gravar este arquivo

Registrada pelo revisor no texto de retorno ao orquestrador, não aqui — este arquivo é lido por
máquina pelo portão e não deve mudar depois de commitado (regra 1: «revisão assinada não se
reescreve»). O resultado esperado e observado é a recusa `REVISAO NAO COMMITADA OU REESCRITA`
(0 commits com este arquivo em HEAD), que o commit do orquestrador resolve.

---

_Reviewed: 2026-10-12T20:41:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
