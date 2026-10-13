---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-13T01:38:00Z
depth: deep
diff_base: 954b3e4b33a6cd290241793bf1df000083a49d81
reviewed_head: 913b83a8355f932f2fa2fd00c235c9720ca10965
scope: review adversarial bloqueante nº 2 do plano 52-32 (Task 6, D-52-G7B-6) — o commit dos tipos 8a516a94, código DEPOIS do pin do apply refs/gsd/52-32/sha (= eb21aa79); FOCO = refs/gsd/52-32/sha..HEAD -- . ':!.planning' = exatamente esse commit (database.types.ts +3/−1, avaliacaoService.ts −10/+1, candidaturasService.ts −10/+1; `git diff --stat refs/gsd/52-32/sha HEAD -- . ':!.planning'` = esses 3 arquivos, e `git diff --stat 31facac9 HEAD -- . ':!.planning'` = os MESMOS 3 — nada mais mudou de código desde o reviewed_head do G7B-1; a onda inteira refs/gsd/52-31/sha..HEAD foi revisada no G7B-1 e não é re-revisada aqui além de spot checks); lidos inteiros o diff do commit, `lerTestesDaMinhaCandidatura` (avaliacaoService.ts:95-150) e `lerVagasDasMinhasCandidaturas` (candidaturasService.ts:300-348) com as funções vizinhas, o cast da Phase 27 (avaliacaoService.ts:346-354), os cinco chamadores, as regras (1)–(8) do p52_portao.cjs, a D-52-G7B-6/-9, a Task 5/6/7 e o «Comando de push» do plano, 52-32-DECISAO.md e a §Task 5 da FRONTEIRA; RE-EXECUTADO: gerador no scratchpad `SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w) supabase gen types typescript --project-id isljnozzlvckrgjjbjwp < /dev/null > "$T"` (CLI 2.116.0, rc=0, 223760 octetos) e `diff "$T" database.types.ts` → BYTE-IDENTICAL (temporário apagado); `ler_testes_das_minhas_candidaturas` e `ler_vagas_das_minhas_candidaturas` 1× cada em Functions como `{ Args: never; Returns: Json }`; `PostgrestVersion: "13.0.5"` (deriva_postgrest: aceitar); casts `rpc as unknown as`: candidaturasService HEAD=0 (base 1), avaliacaoService HEAD=1 (base 1, o de get_avaliacao_status) · `npx tsc --noEmit | grep -c 'error TS'` = 89 (= tsc_base), 0 erros nos três arquivos · `npx vitest run src/features/vagas src/features/avaliacao src/features/avaliacao-cognitiva src/features/privacidade src/components/pages/__tests__` → 77 arquivos / 728 testes verdes · `node scripts/p52_vitest_delta.cjs` → `vitest delta: base=0d70ac7 2725/2 · head=913b83a 3179/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok` · `npm run build` rc=0, `ler_testes_das_minhas_candidaturas`, `ler_vagas_das_minhas_candidaturas` e `id, vaga:vagas(testes_aplicaveis)` em build/assets/index-B9DljfU9.js, `vaga:vagas!inner(testes_aplicaveis)` ausente · PROD só leitura (`node p46apply.cjs sql "set transaction read only; …"`): ledger 20261011000007 md5 2a849b97175ea254349b3eb4ed4a43b6 = `md5 -q` do arquivo, 2 funções em public, anon sem EXECUTE (0006 e 0007), authenticated com, prosecdef=true, provolatile=s, pronargs=0, jsonb; regra (8) por forma: as 6 migrations `_p52_` da árvore (0001,0002,0003,0005,0006,0007) estão no ledger com md5 idêntico, 0004 ausente da árvore e do ledger · `--caminhos` do «Comando de push» por máquina sobre `git diff --name-only refs/gsd/52-31/sha HEAD -- . ':!.planning'`: 16/16 casam · `node scripts/p50_enumera.cjs --de origin/main(b0945868) --ate HEAD` com os args exatos do plano → `REVISAO INVALIDA: --aplicado refs/gsd/52-32-tipos/sha` (o pin ainda não existe — recusa esperada); com `--revisoes` e sem `--aplicado` → `8a516a94 ALHEIO[codigo depois do reviewed_head 31facac9 de 52-REVIEW-G7B-1.md]` (exatamente o que este review desbloqueia); só com `--caminhos`/`--assunto` → 25 commits, 10 codigo, 15 planning, 0 ALHEIO, `8a516a94 codigo`, e2d83872/ea4597a5/af7a5568/0331e801 planning · `p52_portao.cjs --modo revisao` sobre o G7B-1 hoje → `PORTAO RECUSADO: CODIGO DEPOIS DA REVISAO … (reviewed_head 31facac9): database.types.ts avaliacaoService.ts candidaturasService.ts` (a recusa que a D-52-G7B-6 antecipou) · plano inalterado desde 31facac9 e limpo na árvore (regra 6) · nenhum migrate/run/db push/efdeploy/git push/commit; nenhum arquivo do repositório editado além deste; arquivos sujos de outras janelas fora do escopo
files_reviewed: 4
files_reviewed_list:
  - database.types.ts
  - src/features/avaliacao/services/avaliacaoService.ts
  - src/features/vagas/services/candidaturasService.ts
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-32-PLAN.md
findings:
  critical: 0
  warning: 0
  info: 7
  total: 7
status: approved
---

# Phase 52 — 52-32 (G7B-2): Code Review Report — o commit dos tipos

**Reviewed:** 2026-10-13T01:38:00Z
**Depth:** deep
**Files Reviewed:** 4
**Status:** approved (0 críticos · 0 warnings · 7 info)

## Summary

Postura: assumi que `database.types.ts` tinha sido tocado à mão, que a retirada dos casts mudou comportamento, ou que
sobrou código fora do `--caminhos`. Nada disso se sustentou:

- **Os tipos são reproduzíveis.** Rodei o gerador do banco VIVO num temporário do scratchpad (CLI 2.116.0, `< /dev/null`,
  223760 octetos) e o `diff` contra o arquivo commitado saiu **vazio — byte-idêntico**. A deriva contra o versionado anterior
  é exatamente a prevista: as duas entradas de função e a linha `PostgrestVersion` (`"14.5"` → `"13.0.5"`, aceita pelo
  operador). O commit `8a516a94` toca SÓ os três arquivos do plano.
- **As duas funções mudaram só a expressão da chamada.** `supabase.rpc(RPC_…)` tipado no lugar do cast; `if (error ||
  !Array.isArray(data)) return null` / `if (error) return null` / `catch { return null }`, uma chamada, sem eco, saída
  restrita a `{ testes_aplicaveis, aplica_cognitivo }` (avaliação) e ao `data` cru que `mesclarVagasDasCandidaturas` filtra
  por `{ titulo, departamento }` — tudo intocado. O cast da Phase 27 (`get_avaliacao_status`, `avaliacaoService.ts:346-354`)
  fica. Chamadores (`redacaoService.ts:179`, `cognitivoService.ts:151`, `avaliacaoService.ts:209`,
  `exportacaoService.ts:1118`, `candidaturasService.ts:514`) sem mudança.
- **Portões:** tsc 89 = base (0 erros nos três arquivos); 77 arquivos / 728 testes verdes; delta `alteradas=0 · novas=0 ·
  mordida=ok`; build rc=0 com os três marcadores no `index-B9DljfU9.js` e o `!inner` antigo ausente.
- **PROD (só leitura):** 0007 no ledger com md5 = arquivo, função no contrato de catálogo, `anon` sem EXECUTE; as seis
  migrations `_p52_` da árvore batem com o ledger — a regra (8) do push passa.
- **Push:** o `--caminhos` por forma cobre `database.types.ts` e os 15 caminhos de código (16/16); a enumeração em seco
  classifica o commit dos tipos como `codigo` e os quatro commits de `.planning/` nomeados no plano como `planning`,
  0 `ALHEIO`; hoje ela recusa porque `refs/gsd/52-32-tipos/sha` não existe e porque o G7B-1 não contém o commit dos tipos —
  as duas recusas que este review e o pin de publicação da Task 7 resolvem.

Nenhum achado pede decisão do operador (regra da Task 6: «o operador só se o review deixar warning ou achar algo
destrutivo»). Os INFO registram o que medi e dois detalhes de forma.

## Os pontos da instrução, um a um (Task 6 `<context>` e a missão)

1. **`database.types.ts` = o gerado do banco vivo.** Byte-idêntico ao temporário regenerado; > 100000 octetos; as duas
   funções em `Functions` 1× cada; `PostgrestVersion: "13.0.5"` aceito (`deriva_postgrest: aceitar`). ✔ (ver IN-01 sobre
   a forma `Args: never`)
2. **Os casts.** Saíram os dois que o plano nomeia (D-52-G7-5 em `candidaturasService.ts:339-347`; o da 0007 em
   `avaliacaoService.ts:133-150`); as chamadas estão tipadas sem `as unknown as`; comportamento inalterado; o da Phase 27
   fica; nada mais nos dois serviços mudou (`git show --stat`: −10/+1 em cada; os hunks são só a chamada e o comentário do
   cast). ✔
3. **Compile e testes.** tsc 89 = 89; Vitest 77/728 verdes; delta ok; build com marcadores. ✔
4. **Comando de push.** `--caminhos` 16/16; enumeração em seco: `codigo`/`planning` como o plano espera, 0 `ALHEIO`;
   recusas atuais esperadas (pin inexistente; review anterior sem o commit). Desenho do pin de publicação contra
   (4)/(5)/(8): ver IN-04. ✔
5. **PROD só leitura.** md5 `2a849b97175ea254349b3eb4ed4a43b6` no ledger = arquivo; função presente; `anon` sem EXECUTE. ✔

## Info

### IN-01: O gerador emite `Args: never`, não `Record<PropertyKey, never>` — é a forma do CLI 2.116.0 e a chamada sem argumento compila

**File:** `database.types.ts:5970-5971`
**Issue:** As duas entradas saem como `{ Args: never; Returns: Json }`. A missão esperava `Args: Record<PropertyKey, never>`;
o arquivo tem 22 entradas com `Args: never` e nenhuma com `Record<PropertyKey, never>` — é o idioma deste gerador, e o
terceiro `<verify>` da Task 5 já o aceita explicitamente (`^[-+] +(Args: never|Returns: Json|\})$`). `supabase.rpc(RPC_…)`
sem segundo argumento compila sob esse tipo (tsc 89 = base, 0 erros nos três arquivos).
**Fix:** Nenhuma. (Não editar à mão para «melhorar» a forma — CLAUDE.md.)

### IN-02: `PostgrestVersion: "13.0.5"` vai como gerado — deriva aceita, efeito nulo no tsc

**File:** `database.types.ts:13`
**Issue:** O valor é o do banco vivo (`supabase/.temp/rest-version` = `v13.0.5`); medido 89 erros antes e depois; o
operador dispôs `deriva_postgrest: aceitar` (52-32-DECISAO.md:30).
**Fix:** Nenhuma.

### IN-03: A retirada dos casts não muda o que atravessa o fio — só o tipo estático de `data`

**File:** `src/features/avaliacao/services/avaliacaoService.ts:137` e `src/features/vagas/services/candidaturasService.ts:341`
**Issue:** Antes, `data: unknown` pelo cast; agora `data: Json` pelo tipo gerado. `Array.isArray(data)`, `data.find((e:
unknown) => …)` e o `return data` (tipo de retorno `Promise<unknown>`) são os mesmos; `supabase-js` devolve `error` em
falha de transporte (não lança), e o `catch` segue como rede para qualquer exceção. Os testes que mockam `supabase.rpc`
(seis novos + os antigos sem `rpc`) seguem verdes: 77 arquivos / 728 testes.
**Fix:** Nenhuma.

### IN-04: Desenho do pin de publicação `refs/gsd/52-32-tipos/sha` contra as regras (4)/(5)/(8) — passa, com uma condição de disciplina

**File:** `scripts/p52_portao.cjs:41-72` (regras) e `52-32-PLAN.md` Task 7 Passo 0
**Issue:** Com este review commitado (`reviewed_head` = 913b83a8, que contém 8a516a94) e o pin criado em HEAD logo depois:
regra (5) — `reviewed_head` ancestral do pin e `git diff --quiet <reviewed_head> <pin> -- . ':!.planning'` vazio, pois o
commit do review é só `.planning/`; regra (4) push — pin ancestral de HEAD e só `.planning/` depois; regra (8) — as seis
migrations `_p52_` da árvore do pin estão no ledger com md5 igual (medido). `p50_enumera`: `--revisoes` lê este arquivo
(maior N = 2) e o commit dos tipos está contido no `reviewed_head`; `--aplicado` = pin contém o commit; `--base`:
`diff_base` = `refs/gsd/52-31/sha`. A condição: NENHUM commit de código entre este review e o pin, e nenhum commit entre o
pin e o push (o plano já o manda; a FRONTEIRA §Task 7 fica no disco até depois do push).
**Fix:** Nenhuma; só a disciplina já escrita na Task 7.

### IN-05: Enumeração em seco — as duas recusas de hoje são as esperadas; o rótulo de uma delas é enganoso

**File:** `52-32-PLAN.md` «Comando de push»; `scripts/p50_enumera.cjs`
**Issue:** Com os args exatos do plano contra `origin/main` (b0945868): `REVISAO INVALIDA: --aplicado
refs/gsd/52-32-tipos/sha` — a causa é o ref inexistente (nasce na Task 7 Passo 0), mas a mensagem fala em «revisão»;
sem `--aplicado`: `8a516a94 ALHEIO[codigo depois do reviewed_head 31facac9 de 52-REVIEW-G7B-1.md]` — o G7B-1 não contém
o commit dos tipos, exatamente o que este review resolve. Só com `--caminhos`/`--assunto`: 25 commits, 10 `codigo`,
15 `planning`, 0 `ALHEIO`. `p50_enumera.cjs` está fora do escopo deste plano; o rótulo não muda nenhuma decisão.
**Fix:** Nenhuma agora; se um dia se mexer no enumerador, nomear o `--aplicado` que não resolve com um rótulo próprio.

### IN-06: Build — os três marcadores no chunk eager e o embed antigo ausente

**File:** `build/assets/index-B9DljfU9.js`
**Issue:** `ler_testes_das_minhas_candidaturas`, `ler_vagas_das_minhas_candidaturas` e `id, vaga:vagas(testes_aplicaveis)`
no mesmo chunk `index-*` (as rotas do candidato são eager; a conferência no ar da Task 7 procura ali);
`vaga:vagas!inner(testes_aplicaveis)` ausente de `build/assets/`.
**Fix:** Nenhuma.

### IN-07: A FRONTEIRA §Task 5 confere com o que re-medi; HEAD difere do `head=` dela só em `.planning/`

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-32-FRONTEIRA.md:1486-1563`
**Issue:** CLI 2.116.0, 223760 octetos, `deriva=0`, `casts candidaturasService=0 (base 1) avaliacaoService=1 (base 1)`,
`tsc errors=89 (base 89)`, delta ok, «suite, lint e build verdes com os tipos novos» — todos reproduzidos aqui.
`fronteira_retomada: sessao_c_parada … head=8a516a94`; o HEAD deste review (913b83a8) é o commit da própria FRONTEIRA.
**Fix:** Nenhuma.

---

_Reviewed: 2026-10-13T01:38:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
