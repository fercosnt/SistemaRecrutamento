# 52-31 — registro entre sessões (FRONTEIRA)

> Registro BRUTO das Tasks 1–5 do 52-31, uma seção por task, commitado sozinho em cada parada
> (`<context>` § «O registro entre sessões é `52-31-FRONTEIRA.md`, nunca o SUMMARY»). NÃO é
> completion record: o `52-31-SUMMARY.md` só nasce depois da resposta do operador na Task 6 e dobra
> estas seções sem reescrever as linhas de saída. A última linha `fronteira_retomada` diz de onde a
> próxima sessão parte.

---

## §Task 1 (tracer) — sessão A, 2026-10-12

Executor: sessão A (só a Task 1). Início 2026-10-12T19:49Z. Nada foi aplicado em PROD: a 0006 rodou
só dentro de `node scripts/p52_ensaio.cjs` (requisição que aborta). STATE.md e ROADMAP.md não foram
tocados; nenhum `52-31-SUMMARY.md` existe.

### Precondition (medida 2026-10-12T19:49Z, só leitura) — satisfeita

- `refs/gsd/52-30/sha` = `70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8`, ancestral de `origin/main` (`git merge-base --is-ancestor` = 0; `origin/main` = o próprio `70528fba`).
- `node p46apply.cjs sql "set transaction read only; …"` → `{"no_ledger": 0, "ausente": true, "agora": "2026-10-12 16:49:57.870902-03"}` (`20261011000006` fora do ledger; `to_regprocedure('public.ler_vagas_das_minhas_candidaturas()')` nulo).
- `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` → vazio.

### Passo 0 — medição só leitura (fotografia de 2026-10-12, ~19:50Z)

**Policies de SELECT de `public.vagas`** (`polcmd in ('r','*')`):

| polname | papéis | `pg_get_expr(polqual)` |
|---|---|---|
| Público vê vagas ativas | `{anon,authenticated}` | `((status = 'ativa'::status_vaga) AND (deleted_at IS NULL))` |
| RH vê todas vagas | `{authenticated}` | `(EXISTS ( SELECT 1 FROM usuarios_rh WHERE ((usuarios_rh.user_id = ( SELECT auth.uid() AS uid)) AND (usuarios_rh.ativo = true) AND (usuarios_rh.deleted_at IS NULL))))` |

**Triggers não internos** (`pg_get_triggerdef`):

| tabela | trigger | definição resumida | função |
|---|---|---|---|
| vagas | `update_vagas_updated_at` | BEFORE UPDATE | `update_updated_at_column` (`NEW.updated_at = NOW()`) |
| vagas | `vagas_set_slug_trigger` | BEFORE INSERT | `vagas_set_slug` (slug se vazio) |
| vagas | `vagas_status_soft_delete_sync_trg` | BEFORE INSERT OR UPDATE | `vagas_enforce_status_soft_delete_sync` (`deleted_at` preenchido + `ativa` → `arquivada`) |
| candidaturas | `candidaturas_avancar_etapa_trg` | BEFORE UPDATE OF `etapa_atual` | `avancar_etapa` |
| candidaturas | `trg_candidatura_encerrada_a_pedido` | AFTER UPDATE OF `encerrada_a_pedido_em` WHEN old nulo e new não nulo | `trg_notif_candidatura_encerrada` |
| candidaturas | `trg_candidaturas_analise` | AFTER INSERT | `trg_candidatura_analise` |
| candidaturas | `trg_candidaturas_guard_rejeicao` | BEFORE UPDATE OF `status` | `guard_rejeicao_auditada` |
| candidaturas | `trg_notif_confirmacao` | AFTER INSERT | `trg_notif_confirmacao` |
| candidaturas | `update_candidaturas_updated_at` | BEFORE UPDATE | `update_updated_at_column` |

Os corpos das três funções de trigger de `vagas` foram lidos (`prosrc`): nenhuma chama rede nem
escreve em outra tabela. Nos UPDATE de `candidaturas`, para `is_rascunho`/`deleted_at` só dispara
`update_candidaturas_updated_at` (os outros são `OF <coluna>` ou de INSERT). Igual ao que o
`<context>` mediu — sem motivo de PARAR.

**Enum `status_vaga`:** `{rascunho,ativa,inativa,arquivada}`.

**Lint de partida (o comando da Task 2):** `lint exit=2 tsc errors=89`. (O pre-commit imprimiu
`tsc errors: 89 (frozen baseline: 96)` nos cinco commits de código desta task: sem regressão.)

### Passo 0 — varredura «varra pela FORMA» (CLAUDE.md §Portões), ANTES de acrescentar o objeto

Comando, verbatim:

```
grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql
```

Total: **439 achados** em 59 arquivos (antes do smoke novo). Depois do `p52_painel_vaga_smoke.sql`:
441 — os 2 novos são `IF v_rc <> 1` sobre `ROW_COUNT` do UPDATE de UMA vaga por id (escopo: a linha
alvo, não fotografia).

Achados que LISTAM ou CONTAM funções, classificados:

| achado | o que vigia | classe |
|---|---|---|
| `p43_matriz_retencao_smoke.sql:572` `proname IN ('listar_matriz_retencao', 'salvar_janela_retencao')` | as 2 funções do próprio smoke | ESCOPO deliberado |
| `p43_previa_smoke.sql:294`, `:396`, `:610`, `:667` `proname IN (…previa_retencao…, titulares/candidaturas_alem_da_janela)` | funções da prévia de retenção que o smoke vigia | ESCOPO deliberado |
| `p44_pedidos_dados_smoke.sql:388` `proname IN ('listar_pedidos_dados', 'contar_pedidos_dados_pendentes')` | as 2 funções do próprio smoke | ESCOPO deliberado |
| `p45_motor_exclusao_smoke.sql:3217` `proname IN ('registrar_pedido_exclusao', 'cancelar_pedido_exclusao', …` | funções do motor de exclusão | ESCOPO deliberado |
| `p49_prontidao_prod.sql:142` `proname IN ('salvar_avaliacao_entrevista', 'confirmar_revisao_entrevista')` e `:144` `count(DISTINCT proname) … = 2` | as 2 RPCs de revisão; a contagem é sobre a MESMA lista literal de 2, não sobre `pg_proc` de `public` | ESCOPO deliberado |
| `p50_desfazer_expansao.sql:24` (comentário), `:51` e `:1554` (impressões digitais `fn:`/`= ANY (ARRAY[…])` de policies) | os 32 objetos da expansão da 50 que o desfazer devolve | ESCOPO deliberado |

Nenhum achado conta funções de `public` contra constante, e nenhum é uma vigilância que devesse
cobrir `ler_vagas_das_minhas_candidaturas` — sem motivo de PARAR (confere com a medição do checker
de 2026-10-12). Fora dos `.sql`: a vigilância de funções do próprio ensaio (`funcoesP52()` em
`scripts/p52_ensaio.cjs`, chave `funcoes` de `capturar()`) é por FORMA — toda `CREATE FUNCTION
public.<nome>(` das migrations de `MIGS` no disco —, então a função nova entra nela por existir na
0006 (que agora está em `MIGS`).

### Passo 1 — a migration `20261011000006_p52_vagas_das_minhas_candidaturas.sql` (commit `0606acdb`)

Escrita à mão no molde da `20261011000001`, sem BEGIN/COMMIT. Cabeçalho na ordem: título e linha
Phase/Plano; POR QUE EXISTE (policy pública anterior ao ledger, o embed nulo, a preferência do
operador verbatim); O QUE CRIA (assinatura, ordem, D-52-G7-1 com a frase do operador verbatim:
«Decidir explicitamente o caso de vaga com deleted_at (minha inclinação: o candidato continua vendo
o título da própria candidatura).»); GUARDA (papel fail-closed, a leitura do hook, sem argumento,
posse verbatim de `candidato_le_propria_candidatura`, candidatura viva); O QUE NÃO FAZ; ACL; PRE-PORTAO;
POS-PORTAO; LOCK; PROVA; O NÚMERO (D-52-G7-7); SEM BEGIN/COMMIT; «APLICAR COM: node p46apply.cjs
migrate supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql — só pelo 52-31
Task 5, atrás do `p52_portao.cjs --modo apply`; NUNCA `supabase db push`».

Corpo: `SET LOCAL lock_timeout = '3s'` e `SET LOCAL statement_timeout = '5s'` como as duas primeiras
instruções; `DO $pre$` (`P52-06 PRE-PORTAO`: as três tabelas presentes, a função ausente, `p52.p06.pre
= ok` LOCAL); a função (`plpgsql`, `STABLE SECURITY DEFINER`, `SET search_path = ''`, `$function$`)
com `IF v_uid IS NULL OR coalesce(v_role, '') <> 'candidato' THEN … 42501` antes da busca e um único
`SELECT coalesce(jsonb_agg(jsonb_build_object('candidatura_id', c.id, 'titulo', v.titulo,
'departamento', v.departamento) ORDER BY c.created_at DESC, c.id), '[]'::jsonb)` sobre
`public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id`, `WHERE c.candidato_id IN (SELECT
ca.id FROM public.candidatos ca WHERE ca.user_id = v_uid) AND c.deleted_at IS NULL AND
c.is_rascunho = false` — nada sobre `v.status`/`v.deleted_at`; ACL (REVOKE PUBLIC, REVOKE `anon`
nominal, GRANT `authenticated`); COMMENT (sem função `public.<nome>(` em forma de chamada; sem termo
da guarda LGPD-04); `DO $pos$` (`P52-06 POS-PORTAO`): PRE nesta transação; catálogo (`prosecdef`,
`provolatile = 's'`, `proconfig = ARRAY['search_path=""']`, `pronargs = 0`, `jsonb`, comentário);
ACL pela expressão `aclexplode` do molde; no código sem comentários: a guarda literal antes do
primeiro `FROM public.`, nenhuma comparação de `v_role` fora do `coalesce`, o predicado de posse, o
filtro de viva e a junção presentes, exatamente UM `jsonb_build_object(`, `regexp_matches(v_cod,
'\mv\.([a-z_]+)', 'g')` ⊆ {id, titulo, departamento}, nenhum `'ativa'`; anexa
` painel:vagas_candidato=ok` a `p52.evidencia`.

### Passo 2 — `scripts/p52_ensaio.cjs` (commit `e7f4054d`) — só isto

```diff
@@ -8,5 +8,6 @@
- * 0/1/3. Mudou SÓ o que é da fase (52-01): o sentinela (`ENSAIO_P52_TERMINOU`), as cinco versões
- * fixadas `20261011000001..5_p52_*` em MIGS (a 0005 é do 52-26 — gap WR-04 + F13 — e entra na lista
- * ANTES da 0004, na ordem de APLICAÇÃO), os pares de smoke `smoke52l` (leituras do RH, bloco B),
- * `smoke52b` (banco SJT v2, bloco C), `smoke52g` (gap de servidor, 52-26) e `smoke52d` (limpeza,
- * bloco D) somados aos legados, a marca
+ * 0/1/3. Mudou SÓ o que é da fase (52-01): o sentinela (`ENSAIO_P52_TERMINOU`), as seis versões
+ * fixadas `20261011000001..6_p52_*` em MIGS (a 0005 é do 52-26 — gap WR-04 + F13 — e a 0006 é do
+ * 52-31 — G-52-7, a RPC do painel do candidato; as duas entram na lista ANTES da 0004, na ordem de
+ * APLICAÇÃO), os pares de smoke `smoke52l` (leituras do RH, bloco B), `smoke52b` (banco SJT v2,
+ * bloco C), `smoke52g` (gap de servidor, 52-26), `smoke52p` (painel do candidato, 52-31) e
+ * `smoke52d` (limpeza, bloco D) somados aos legados, a marca
@@ -23 +24,2 @@
- * competências — dono: 52-26).
+ * competências — dono: 52-26) e ao G-52-7 do 52-31 (0006: `ler_vagas_das_minhas_candidaturas`, título e
+ * departamento da vaga das próprias candidaturas — dono: 52-31).
@@ -64 +66 @@
- * das duas GUCs foi definida (k ∈ 50, 51a, 51b, 52l, 52b, 52g, 52d). Verde exige todo par reportado com
+ * das duas GUCs foi definida (k ∈ 50, 51a, 51b, 52l, 52b, 52g, 52p, 52d). Verde exige todo par reportado com
@@ -113,3 +115,4 @@ const SENTINELA = 'ENSAIO_P52_TERMINOU';
- * (bloco C, 52-17), 0005 gap de servidor (52-26: WR-04 + F13), 0004 limpeza dos dados de teste (bloco
- * D, 52-20 — DESTRUTIVA, portão próprio, D-41). A 0005 vem ANTES da 0004 porque a lista é a ordem de
- * APLICAÇÃO, não a numérica: a 0004 está fixada por nome em planos já verificados e ainda não existe;
+ * (bloco C, 52-17), 0005 gap de servidor (52-26: WR-04 + F13), 0006 título e departamento da vaga das
+ * próprias candidaturas (52-31: G-52-7, D-52-G7-7), 0004 limpeza dos dados de teste (bloco D, 52-20 —
+ * DESTRUTIVA, portão próprio, D-41). A 0005 e a 0006 vêm ANTES da 0004 porque a lista é a ordem de
+ * APLICAÇÃO, não a numérica (a 0006 é aplicada pelo 52-31, antes do bloco D — o 52-19 depende dele): a 0004 está fixada por nome em planos já verificados e ainda não existe;
@@ -125,0 +129 @@ const MIGS = [
+  'supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql',
@@ -131 +135 @@ const MIGS = [
- * 52b (banco SJT v2), 52g (gap de servidor, 52-26), 52d (limpeza). */
+ * 52b (banco SJT v2), 52g (gap de servidor, 52-26), 52p (painel do candidato, 52-31), 52d (limpeza). */
@@ -138,0 +143 @@ const PARES = [
+  ['52p', 'smoke52p'],
@@ -158,0 +164 @@ const PREFIXO =
+  "       set_config('smoke52p.pass', '', false), set_config('smoke52p.esperado', '', false),\n" +
```

Conferido por `require`: `MIGS` = 0001, 0002, 0003, 0005, **0006**, 0004; `PREFIXO` contém
`smoke52p.esperado`. Nenhuma outra mudança de comportamento.

### Passo 3 — `supabase/tests/p52_painel_vaga_smoke.sql` (`smoke52p`, commit `e307fd78`)

Prefixo `P52P`, envelope `P52P1`, guarda `$p52_so_ensaio$` como primeira instrução, nenhuma GUC do
PRE/POS lida. `pg_temp.p52p_chamar(p_papel, p_sub)` (`anon`, `sem_claims`, `sem_papel`,
`candidato_sem_sub`, ou papel de `app_metadata` com o sub), `pg_temp.p52p_vaga_visivel(p_sub,
p_vaga)` (RLS de um claim `candidato`; NULL = sonda falhou, nunca lido como invisível),
`pg_temp.p52p_resumo(jsonb)` (só erro, tipo ou contagem). Baseline com atores lidos na execução
(nenhum uuid no arquivo), população publicada e recusada sem dono/outro/admin/rec. Literal único
`smoke52p.esperado` = 3; cláusulas (a), (b), (c) como o Passo 3 do plano.

**Controle negativo (não pedido pelo plano; mostra que o smoke não é verde vácuo)** — o mesmo smoke
contra o vivo, sem a 0006:

```
node scripts/p52_ensaio.cjs --sem-migracoes supabase/tests/p52_painel_vaga_smoke.sql
ENSAIO VERMELHO: P52P FAIL (a): [rascunho_retorno:err:42883:function public.ler_vagas_das_minhas_candidaturas() does not exist,inativa_retorno:err:42883:function public.ler_vagas_das_minhas_candidaturas() does not exist,arquivada_retorno:err:42883:function public.ler_vagas_das_minhas_candidaturas() does not exist] — o dono nao le o titulo e o departamento da vaga inativada da propria candidatura (ou a fixture nao reproduz o gap) (590 ms)   (exit 1)
```

Sem `c_premissa_rls` nos três status: a vaga do alvo fica invisível sob a RLS do dono em
`rascunho`, `inativa` e `arquivada` — o G-52-7 reproduzido pela fixture.

### `<verify>` 1 — o ensaio (rodado como escrito, sobre o HEAD final `38d65421`, 2026-10-12T20:01Z) — VERDE

Linha `ENSAIO VERDE` inteira:

```
ENSAIO VERDE: supabase/tests/p52_painel_vaga_smoke.sql · prefixadas=[20261011000006] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000004] · smokes=[52p=3/3] · evidencia=painel:vagas_candidato=ok 52p.pop=cand:22,naturais:16 52p.alvo=publica · 737 ms
```

(A primeira rodada, antes dos commits, deu a mesma linha com `558 ms`. `naturais:16` confere com as
16 candidaturas vivas de vaga não pública medidas no planejamento.)

### Passo 4 — RED do cliente (commit `a103a180`, antes do conserto)

`src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx`: painel de ponta a
ponta (`@/features/vagas/hooks` NÃO mockado; `useCandidaturas` e `listCandidaturas` reais sobre
cliente espião com `from('candidaturas')` e `rpc(fn)`); store mockado honrando o seletor; mocks de
hook no idioma do `.reaberta.test.tsx`; `QueryClientProvider` com `retry: false`; fixture em etapa
`triagem` com `vaga: null` e `vaga_id` preenchido.

- **Teste-alvo:** `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx > painel do candidato — candidatura de vaga inativa (G-52-7) > (1) mostra o título e o departamento da vaga inativa vindos da RPC — nunca «Vaga não encontrada» nem «N/A»`
- **Comando:** `NO_COLOR=1 DEBUG_PRINT_LIMIT=0 npx vitest run src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx -t "\(1\)" --reporter=tap-flat` → exit 1
- **Primeira linha da falha:** `AssertionError: o título da vaga inativa, vindo da RPC, no cartão: expected null not to be null`
- **Classificador:** `gsd-tools check tdd-red-evidence` → `RED_EVIDENCE_OK` (`target_test_failed`; tests 2, fail 1, o (2) filtrado).
- **Avaliação semântica:** o alvo executou e falhou na asserção planejada (o título que só existe na resposta da RPC não aparece); na rodada com o DOM impresso, o cartão mostrava o fallback «Vaga não encontrada» — o G-52-7 reproduzido no cliente. Sem erro de carga, sintaxe ou fixture. O caso (2) também estava vermelho antes do conserto, pela asserção de que a RPC é consultada (`waitFor … toContain('ler_vagas_das_minhas_candidaturas')`).

### Passo 5 — GREEN mínimo (commit `38d65421`)

`candidaturasService.ts`: `RPC_VAGAS_DAS_MINHAS_CANDIDATURAS`, `VagaDaMinhaCandidatura`,
`mesclarVagasDasCandidaturas` (pura; só linhas com `vaga` nulo/ausente; entrada aceita só com
`candidatura_id`/`titulo` string e `departamento` string|null; copia SÓ `{ titulo, departamento }`;
nunca sobrescreve embed), `lerVagasDasMinhasCandidaturas()` interna com o cast estreito e o
comentário de quem o retira (D-52-G7-5), `null` em erro ou exceção de transporte, sem eco; em
`listCandidaturas`, UMA chamada só se alguma linha veio com `vaga == null`, mescla antes do
`return`; bloco «52-31 (G-52-7 · D-52-G7-1..6)» junto do comentário T-08-09. O embed `vaga:vagas
(...)`, `SELECT_LISTA_RH`, `VAGA_ALLOWLIST`, `listAllCandidaturas` e `listCandidaturasByVaga`
intactos. `DashboardCandidatoPage.tsx` muda só pelos dois `data-testid`:

```diff
@@ -397 +397 @@ export function DashboardCandidatoPage() {
-                          <h3 className="text-2xl font-semibold mb-2 drop-shadow-md">
+                          <h3 data-testid="painel-vaga-titulo" className="text-2xl font-semibold mb-2 drop-shadow-md">
@@ -404 +404 @@ export function DashboardCandidatoPage() {
-                              <span>{candidatura.vaga?.departamento?.replace('_', ' ') || 'N/A'}</span>
+                              <span data-testid="painel-vaga-departamento">{candidatura.vaga?.departamento?.replace('_', ' ') || 'N/A'}</span>
```

### `<verify>` 2 — escopo da migration e nada aplicado (rodado como escrito, depois do GREEN) — VERDE

```
escopo da migration: proibidas=0 funcoes=1
0006 fora do ledger e funcao ausente em PROD: nada aplicado
```

### `<verify>` 3 — os três arquivos de teste (rodado como escrito, HEAD `38d65421`) — VERDE

`npx vitest run …vagaInativa.test.tsx …candidaturasService.test.ts …reaberta.test.tsx` →
`Test Files 3 passed (3) · Tests 23 passed (23)`. Os dois testes antigos que mockam o cliente SEM
`rpc` seguem verdes sem toque (devolvem `data: []`: nenhuma linha com embed nulo, nenhuma chamada).

Sanidade extra (fora do `<verify>`): `npx vitest run src/components/pages/__tests__/
src/features/vagas/ src/__tests__/promessasComExecutor.test.ts src/__tests__/guards/
src/__tests__/copyPortoesLgpd.test.ts` → 379/381; os 2 vermelhos são a BASELINE conhecida de
`promessasComExecutor.test.ts` (registro de deferimento contra o ROADMAP — Phase 46 concluída — e a
migration `20260721000001`; listados como baseline no `52-01-SUMMARY.md:135-136`), nada desta task.
O delta formal da suíte é da Task 2.

### Commits da Task 1 (cada um com os caminhos nomeados; nenhum `-A`/`-a`/`--no-verify`)

| # | sha | assunto | caminho |
|---|---|---|---|
| 1 | `0606acdb` | `feat(52-31): ler_vagas_das_minhas_candidaturas — o candidato le titulo e departamento da vaga das proprias candidaturas em qualquer status (G-52-7)` | `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql` |
| 2 | `e7f4054d` | `chore(52-31): p52_ensaio conhece a 20261011000006 (MIGS na ordem de aplicacao, par 52p)` | `scripts/p52_ensaio.cjs` |
| 3 | `e307fd78` | `test(52-31): smoke52p (tracer — dono le vaga inativa, outro candidato nao, allowlist exata)` | `supabase/tests/p52_painel_vaga_smoke.sql` |
| 4 | `a103a180` | `test(52-31): painel com vaga inativa mostra titulo e departamento (vermelho antes do conserto)` | `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx` |
| 5 | `38d65421` | `fix(52-31): painel do candidato mescla titulo e departamento da RPC quando o embed da vaga vem nulo (G-52-7)` | `src/features/vagas/services/candidaturasService.ts`, `src/components/pages/DashboardCandidatoPage.tsx` |

Base da task: `eec21fc2`. Arquivos sujos de outras janelas (`.planning/ui-reviews/.gitignore`,
`docs/specs/DRAFT-banco-sjt-marketing.md`, `AGENTS.md`, `docs/vagas/`,
`.planning/phases/51-*/.gitkeep`) fora de todo commit.

### Desvios e observações

1. **[Rule 3 — evidência RED legível] Asserção de uma linha no caso (1).** O relatório TAP da Vitest
   não escapa a mensagem multilinha do Testing Library (`findByText` + dump do DOM): o classificador
   recusou com `invalid_record` («Non-TAP data in report», «Malformed TAP»), inclusive com
   `NO_COLOR=1 DEBUG_PRINT_LIMIT=0`. A primeira asserção do caso (1) virou `waitFor(() =>
   expect(screen.queryByText(TITULO), '<rótulo>').not.toBeNull(), { onTimeout: (e) => e })` — mesma
   semântica (o título que só a RPC traz tem de aparecer), mensagem de uma linha. Feito ANTES do
   commit `a103a180`; o relatório não foi editado.
2. **Observação para o review (não consertada — o Passo 2 restringe o ensaio a MIGS/PARES/PREFIXO):**
   o `capturar()` do ensaio (o `PERSISTIU`) não cobre `public.vagas`, e o smoke52p escreve
   `vagas.status` dentro dos envelopes `P52P1`. A proteção é a da requisição que aborta + a guarda
   estrutural `P52E FAIL (transacao)` depois de cada parte, as mesmas dos outros smokes p52 que
   escrevem em tabela fora de `capturar()` (ex.: `candidaturas` no smoke52l, deixada de fora de
   propósito pelo tráfego). `vagas` também tem tráfego (o RH edita); se o review quiser a chave, é
   mudança no ensaio sob review, não desta sessão.
3. Nenhuma task de expansão rodou; a Task 2 começa numa sessão NOVA, que confere esta fronteira pela
   precondition dela.

fronteira_retomada: sessao_a_encerrada 2026-10-12T20:04Z head=38d654212d5d24e4c38c3d7d393fddaeb4853390
