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

---

## §Task 2 — sessão B, 2026-10-12

Executor: sessão B (Tasks 2–3). Início 2026-10-12T20:13Z. Nada foi aplicado em PROD: a 0006 rodou só
dentro de `node scripts/p52_ensaio.cjs` / `node scripts/p52_mutacoes.cjs` (requisições que abortam).
STATE.md e ROADMAP.md não foram tocados; nenhum `52-31-SUMMARY.md` existe.

### Precondition (medida 2026-10-12T20:13Z, só leitura) — satisfeita

- `52-31-FRONTEIRA.md` rastreado e limpo; última linha `fronteira_retomada: sessao_a_encerrada 2026-10-12T20:04Z head=38d654212d5d24e4c38c3d7d393fddaeb4853390`; `38d65421` ancestral de HEAD (`git merge-base --is-ancestor` = 0).
- `52-31-SUMMARY.md`: ausente.
- `node p46apply.cjs sql "set transaction read only; …"` → `{"no_ledger": 0, "ausente": true, "agora": "2026-10-12 17:13:35.020147-03"}`.
- `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` → vazio.

### smoke52p (d)–(j) (commit `b326a215`)

Sete blocos `DO` novos, um por cláusula, no idioma da Task 1 (envelopes `P52P1` que revertem; julgamento
fora deles por lista de rótulos; nada de título, departamento ou e-mail nas mensagens). `smoke52p.esperado`
= `10` num único literal. Cabeçalho: (a)–(j); escritas novas — (h) `UPDATE candidaturas SET is_rascunho
= true` / `SET deleted_at = now()` no alvo, (i) `UPDATE vagas SET deleted_at = now()` na vaga do alvo;
(d) confere inclusão do conjunto vivo, posse e ausência de repetição, não «nada além do vivo» (papel de
(h)); a razão escrita da (j) (premissa sem mutação: DDL em `candidaturas` = lock exclusivo em tabela
quente) e da cobertura de COMPLETUDE de (d) (sem mutação de âncora única que a faça a primeira vermelha;
cobre a população natural publicada em `52p.pop`). Recusas por SQLSTATE E mensagem: a guarda é
`42501:forbidden`, o ACL é `42501:permission denied for function ler_vagas_das_minhas_candidaturas`.
(j) exige FK `convalidated` sobre `conkey = ARRAY[<attnum de vaga_id>]` com `confrelid =
'public.vagas'::regclass` (nunca pelo nome) e `attnotnull`.

Varredura «varra pela FORMA» depois do smoke: 443 achados (441 da §Task 1 + 2 novos, ambos `IF v_rc
<> 1` sobre `ROW_COUNT` de UPDATE de UMA linha por id — escopo da linha alvo, não fotografia).

### Runner `scripts/p52_mutacoes.cjs` (commit `b326a215`) — só entradas e a linha de SMOKES

Diff: 0 linhas removidas; três hunks só de acréscimo — `@@ -89,6 +89,7 @@ const SMOKES` (a linha
`'supabase/tests/p52_painel_vaga_smoke.sql': { prefixo: 'P52P', par: '52p' }`, sem `exigePrefixadas`),
`@@ -281,6 +282,18 @@` (constantes `V06`, `S52P`, `fnVagas = () => fnNova(V06,
'ler_vagas_das_minhas_candidaturas')` e os alvos literais `P_POSSE`, `P_VIVA`, `P_GUARDA`,
`P_GUARDA_BLOCO`, `P_JUNCAO`) e `@@ -559,6 +572,109 @@ const MUTACOES` (P1–P10, `requer: [V06]`,
`smoke: S52P`, id da ameaça em comentário; P5 é o texto do GRANT, como a L6; P10 troca a linha da
junção de `public.vagas` por ela mesma seguida de `CROSS JOIN (VALUES (1), (2)) AS p10_dup(n)`).
`julgarMutacao`/`julgarControle`/`aposentar`: nenhuma linha tocada (grep no diff = 0).

### `<verify>` 1 — ensaio com a sonda de vistas (HEAD `587481ac`, 2026-10-12T20:22Z) — VERDE

```
ENSAIO VERDE: supabase/tests/p52_painel_vaga_smoke.sql · prefixadas=[20261011000006] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000004] · vistas=igual · smokes=[52p=10/10] · evidencia=painel:vagas_candidato=ok 52p.pop=cand:22,naturais:16 52p.alvo=publica · 912 ms
```

(A primeira rodada, antes dos commits, deu a mesma linha com `913 ms`.)

### `<verify>` 2 — mutações P1–P10 e a rodada completa (HEAD `587481ac`) — VERDE

```
CONTROLE verde (supabase/tests/p52_painel_vaga_smoke.sql): par 52p=10/10 (614 ms)
P1 morde: ler_vagas_das_minhas_candidaturas: o predicado de posse vira true (toda candidatura viva de todos) -> P52P FAIL (b) [outro_elementos_que_nao_sao_dele:42,outro_ve_candidaturas_do_dono:2,sub_sem_candidato:ok:n=44] (545 ms)
P2 morde: ler_vagas_das_minhas_candidaturas: filtro de vaga publica (status = 'ativa' AND deleted_at IS NULL) no WHERE -> P52P FAIL (a) [rascunho_alvo_sem_titulo_e_departamento_da_vaga:ok:n=0,inativa_alvo_sem_titulo_e_departamento_da_vaga:ok:n=0,arquivada_alvo_sem_titulo_e_departamento_da_vaga:ok:n=0] (496 ms)
P3 morde: ler_vagas_das_minhas_candidaturas: 'status', v.status na projecao -> P52P FAIL (c) [dono_vivo_chaves:candidatura_id|departamento|status|titulo,dono_vivo_elementos_tortos:2,outro_vivo_chaves:candidatura_id|departamento|status|titulo,outro_vivo_elementos_tortos:2,dono_vaga_inativa_chaves:candidatura_id|departamento|status|titulo,dono_vaga_inativa_elementos_tortos:2] (519 ms)
P4 morde: ler_vagas_das_minhas_candidaturas: a guarda aceita rh e administrador -> P52P FAIL (g) [administrador_sub_do_admin:ok:n=3,rh_sub_do_recrutador:ok:n=0,administrador_sub_do_dono:ok:n=2] (685 ms)
P5 morde: GRANT EXECUTE de ler_vagas_das_minhas_candidaturas a anon depois da migration -> P52P FAIL (f) [anon_com_execute:true,anon_chamada:err:42501:forbidden] (578 ms)
P6 morde: ler_vagas_das_minhas_candidaturas: sem AND c.is_rascunho = false -> P52P FAIL (h) [rascunho_diferente_do_vivo_menos_o_alvo:n=2/esperado=1] (583 ms)
P7 morde: ler_vagas_das_minhas_candidaturas: AND v.deleted_at IS NULL no WHERE -> P52P FAIL (i) [alvo_sem_titulo_e_departamento_da_vaga_apagada:ok:n=1] (540 ms)
P8 morde: ler_vagas_das_minhas_candidaturas: a guarda sem v_uid IS NULL OR -> P52P FAIL (e) [candidato_sem_sub:ok:n=0] (777 ms)
P9 morde: ler_vagas_das_minhas_candidaturas: sem a guarda de papel -> P52P FAIL (e) [sem_claims:ok:n=0,sem_papel:ok:n=2,candidato_sem_sub:ok:n=0] (552 ms)
P10 morde: ler_vagas_das_minhas_candidaturas: CROSS JOIN (VALUES (1), (2)) logo depois da juncao de vagas (cada candidatura duas vezes) -> P52P FAIL (d) [repetidas:32_linhas_em_22/22_candidatos] (579 ms)
MUTACOES: 10/10 mordem; controle verde; nada persistiu (so=P1,P2,P3,P4,P5,P6,P7,P8,P9,P10) (aposentadas: B1,B2,B3,B4,B5,B6)
```

Rodada completa (sem `--so`), na mesma execução do `<verify>`:

```
CONTROLE verde (supabase/tests/p52_leituras_rh_smoke.sql): par 52l=20/20 (622 ms)
CONTROLE verde (supabase/tests/p52_gap_servidor_smoke.sql): par 52g=14/14 (651 ms)
CONTROLE verde (supabase/tests/p52_painel_vaga_smoke.sql): par 52p=10/10 (637 ms)
MUTACOES: 27/27 mordem; controle verde; nada persistiu (aposentadas: B1,B2,B3,B4,B5,B6)
```

(L1–L8, G1–G9 e P1–P10 mordem cada uma na sua letra; B1–B6 aposentadas pela regra (7), como antes
desta task. Linha de base de cada mordida = o CONTROLE verde do mesmo smoke na mesma execução.)

### `<verify>` 3 — regressão `p52_leituras_rh_smoke.sql`, controle e tratamento — VERDE

```
leituras_rh controle rc=0: ENSAIO VERDE: supabase/tests/p52_leituras_rh_smoke.sql · prefixadas=[] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000006,20261011000004] · smokes=[52l=20/20] · evidencia
leituras_rh tratamento rc=0: ENSAIO VERDE: supabase/tests/p52_leituras_rh_smoke.sql · prefixadas=[20261011000006] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000004] · smokes=[52l=20/20] · evidencia=
```

### `<verify>` 4 — Vitest e o delta da suíte (HEAD commitado `587481ac`) — VERDE

`npx vitest run src/features/vagas src/components/pages/__tests__` → `Test Files 23 passed (23) · Tests
224 passed (224)`. Linha final do delta:

```
vitest delta: base=0d70ac7 2725/2 · head=587481a 3144/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok
```

(Os 2 pré-existentes são os de `promessasComExecutor.test.ts` já listados na §Task 1.)

### `<verify>` 5 — lint — VERDE

```
lint exit=2 tsc errors=89
```

Igual à contagem de partida da §Task 1 (`tsc errors=89`) e ≤ 90. O pre-commit imprimiu `tsc errors: 89
(frozen baseline: 96)` nos três commits desta sessão.

### `<verify>` 6 — tipografia, build e marcadores — VERDE

```
TIPOGRAFIA OK (71 linhas acrescentadas varridas)
marcadores no chunk eager do candidato
```

Os dois marcadores (`painel-vaga-titulo`, `ler_vagas_das_minhas_candidaturas`) moram no mesmo arquivo:
`build/assets/index-CFPYr-z6.js` (build local; nada publicado).

### Cliente — testes novos (commit `587481ac`) e a evidência RED (tdd)

- `src/features/vagas/services/__tests__/candidaturasService.vagaInativa.test.ts` (13 testes): cliente
  espião com `from` (cadeia awaitable) e `rpc`. `mesclarVagasDasCandidaturas`: copia só `titulo` e
  `departamento` (chaves = `departamento,titulo` mesmo com `status`/`salario` na entrada); aceita
  `departamento` null; não sobrescreve embed presente (mesma referência); ignora entrada malformada (8
  formas) e sem linha; devolve as MESMAS linhas para `entradas` não-array (5 formas). `listCandidaturas`:
  0 chamadas com todo embed presente; 1 chamada, pelo nome, com 2 embeds nulos entre 3 linhas, mescla só
  nelas e o embed presente fica; erro da RPC e promessa rejeitada → `success: true`, linhas como vieram,
  o texto do erro ausente de `JSON.stringify(retorno)`.
- `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx`, casos novos: (3) erro da
  RPC → títulos `Vaga não encontrada | <título público>`, departamentos `N/A | Clinica`, sem o texto do
  erro na tela; (4) todo embed presente → 0 chamadas e o título da RPC não aparece; (5) o diálogo de
  «Retirar minha candidatura» tem `COPY_RETIRAR_CANDIDATURA.titulo(<título da RPC>)` e fecha por «Voltar».
- Nenhum código de produção mudou nesta task (nenhum caso novo reprovou sobre o código da Task 1).

**RED (tdd.md) — por que por mutação.** O GREEN desta funcionalidade é o commit `38d65421` da Task 1;
sobre ele os 18 testes dos dois arquivos passam (verde esperado, não «feature desconhecida»: tdd.md
fail-fast 1 investigado). A evidência de que os testes novos MORDEM foi tomada com linha de base: o
mesmo alvo verde sem a mutação (acima) e vermelho com ela. Cada mutação foi aplicada ao
`candidaturasService.ts` só no disco, o alvo rodou com `--reporter=tap-flat`, e o arquivo voltou por
`git checkout -- src/features/vagas/services/candidaturasService.ts` com `git diff --quiet HEAD` = 0
conferido depois de cada uma. Registros em `node_modules/.cache/p52-31-red/R{1..4}.json` (dentro do
projeto, ignorado pelo git), cada um passado a `gsd-tools check tdd-red-evidence --raw`:

| # | mutação temporária | alvo (`file > suite > test`) | primeira linha da falha | classificador |
|---|---|---|---|---|
| R1 | a mescla copia a entrada inteira (`vaga: { ...e }`) | `candidaturasService.vagaInativa.test.ts > mesclarVagasDasCandidaturas (52-31 · G-52-7) > copia só titulo e departamento da entrada, mesmo quando ela traz status e salario` | `chaves do objeto mesclado: expected 'candidatura_id,departamento,salario,s…' to be 'departamento,titulo'` | `RED_EVIDENCE_OK` (`target_test_failed`; tests 13, fail 1) |
| R2 | a RPC chamada com qualquer linha (`if (linhas.length > 0)`) | `… > listCandidaturas + ler_vagas_das_minhas_candidaturas (52-31 · G-52-7) > não chama a RPC quando todo embed veio` | `chamadas à RPC com todo embed presente: expected 1 to be +0` | `RED_EVIDENCE_OK` (tests 13, fail 1) |
| R3 | o erro da RPC escapa (`throw` no lugar de `return null`, e o `catch` relança) | `… > com erro da RPC resolve com as linhas como vieram, sem lançar e sem o texto do erro` | `Erro inesperado ao listar candidaturas` (a lista lançou) | `RED_EVIDENCE_OK` (tests 13, fail 1) |
| R4 | o `candidaturasService.ts` de antes do GREEN (`git show 38d65421^:…`) | `DashboardCandidatoPage.vagaInativa.test.tsx > painel do candidato — candidatura de vaga inativa (G-52-7) > (5) o diálogo de «Retirar minha candidatura» da vaga inativa nomeia a vaga pelo título da RPC` | `o título do diálogo com o nome da vaga vindo da RPC: expected null not to be null` | `RED_EVIDENCE_OK` (tests 5, fail 1) |

Comando de cada rodada: `NO_COLOR=1 DEBUG_PRINT_LIMIT=0 npx vitest run <arquivo> -t <filtro>
--reporter=tap-flat` (exit 1 nas quatro). **Avaliação semântica:** nos quatro o alvo executou e falhou
na asserção planejada, pelo motivo pretendido — R1 a terceira chave atravessa a mescla (T-52-104 no
cliente); R2 a RPC é chamada sem embed nulo (D-52-G7-4); R3 a lista cai pelo erro da RPC (T-52-109);
R4 sem a mescla o diálogo de retirada não nomeia a vaga (diz «esta vaga»). Nenhum erro de carga,
coleta, sintaxe ou fixture; nenhum alvo pulado.

### Desvios e observações (Task 2)

1. **[Rule 3 — evidência RED legível] Asserções estruturais viraram comparação de string de uma
   linha, ANTES do commit `587481ac`.** O primeiro registro R1 saiu `invalid_record` («Non-TAP data in
   report», «Malformed TAP»): o `toEqual` de array põe `actual`/`expected` multilinha no TAP — a mesma
   classe do desvio 1 da §Task 1. Cinco `toEqual` do serviço e dois do painel viraram `toBe` sobre
   `join(',')`/`join(' | ')`/`JSON.stringify` — mesma semântica. O relatório não foi editado.
2. **Mutação errada, não teste errado (R3).** A primeira mutação de R3 (`throw` no lugar de `return null`)
   saiu `unexpected_green`: o `throw` caía no próprio `try/catch` de `lerVagasDasMinhasCandidaturas` e
   voltava `null` — a mutação não mudava o comportamento. A mutação certa também relança no `catch`;
   o teste não mudou.
3. **R2 refeito sobre o arquivo de teste final** (a primeira rodada R2 foi antes do desvio 1); a linha
   da tabela é a da rodada final.

---

## §Task 3 — sessão B, 2026-10-12

### Passo 1 — diagnóstico dos leitores residuais (só leitura; NADA consertado — R1/R2 do `<context>`)

Medição em PROD — o primeiro `<verify>` da Task 3, como escrito (2026-10-12T20:24Z), exit 0:

```
sonda caso observado: [{"candidatura":"d31c78bb","etapa_atual":"entrevista_online","vaga_visivel":false},{"candidatura":"f59e7281","etapa_atual":"avaliacao_assincrona","vaga_visivel":true}]
sonda caso natural em avaliacao_assincrona: [{"candidatura":"f73682b6","etapa_atual":"avaliacao_assincrona","vaga_visivel":false}]
```

Contagem agregada só leitura, na mesma rodada (`set transaction read only`; só contagens, nenhum id,
título ou e-mail) — as 16 candidaturas vivas naturais de vaga não pública (candidatos fora de
`usuarios_rh`):

```
{"naturais":16,"em_avaliacao_assincrona":1,"com_curriculo_exportavel":2,"candidaturas_sem_departamento":11,"vagas_sem_departamento":4,"inativa":1,"arquivada":15,"vaga_com_deleted_at":0,"por_etapa":{"rejeitado":1,"entrevista_online":2,"avaliacao_assincrona":1,"triagem":5,"decisao_final":2,"aprovado":5}}
```

| leitor | embed | efeito na tela (arquivo:linha até a tela) | caso medido |
|---|---|---|---|
| `avaliacaoService.ts:118` (`getAvaliacaoContext`) | `vaga:vagas ( testes_aplicaveis, aplica_cognitivo )` sob a RLS do candidato → nulo | `:143-144` `testesAplicaveis = null`, `aplicaCognitivo = false` → `AvaliacaoContainer.tsx:482` `deriveCards` devolve `[]` → `:323-329` a página de avaliações mostra «Nenhuma avaliação pendente» / «Você não tem avaliações para concluir nesta etapa no momento.» — o candidato em `avaliacao_assincrona` não vê os cards que tem de fazer. E no PAINEL: `useIdsAvaliacoesConcluidas.ts:55-58` (elegíveis = etapa `avaliacao_assincrona`, não encerrada) e `:75-79` derivam os MESMOS cards vazios → `avaliacoesConcluidas([])` é falso → o estado «Avaliações concluídas — aguardando a equipe» nunca aparece para essa candidatura | `f73682b6` (`avaliacao_assincrona`, vaga arquivada, `vaga_visivel:false`) — 1 hoje |
| `redacaoService.ts:150` (`getRedacaoContext`) | `vaga:vagas!inner(testes_aplicaveis)` → a linha SOME | `:161-163` `NOT_FOUND` «Candidatura não encontrada» → `RedacaoEditorScreen.tsx:305-316` o estado de erro do `AsyncState` com «Tentar novamente». Alcançável só por link direto: com os cards vazios (linha acima) não há card de redação para clicar | o mesmo `f73682b6`, se a vaga dele tiver redação — ≤ 1 hoje |
| `exportacaoService.ts:1005` (`CURRICULOS_ALLOWLIST`) | `vaga:vagas ( titulo )` → nulo | `:1034-1038` `tituloDaVaga` → `null` (`:1083` `vagaTitulo: null`) → `CurriculosBloco.tsx:138` mostra `COPY_CURRICULOS.vagaSemTitulo` = «Vaga não identificada» (`:71`) no bloco de currículos de `/candidato/privacidade` (e o export do titular sai com `vagaTitulo: null`) | 2 das 16 naturais têm `curriculo_url` |
| `VagaDetalhePage.tsx` via `getVagaById` (`vagasService.ts:357-420`) | não é embed: `from('vagas').eq('id').is('deleted_at', null).single()` (`:372-376`) sob a RLS do candidato | o `onClick` do cartão (`DashboardCandidatoPage.tsx:96-98`, `handleVerVaga`) leva a `/vagas/:id`; `useVaga` (`useVagas.ts:145-160`) → `getVagaById` → PGRST116 → `VagasServiceError('Vaga não encontrada')` (`:382`; `:397` é a outra mensagem igual de `getVagaById`, para retorno vazio) → `VagaDetalhePage.tsx:88-91` «Vaga não encontrada» / «Vaga não encontrada ou não está mais ativa» com «Voltar para vagas». As mensagens de `vagasService.ts:382/397` citadas no UAT são DESSA página, fora do caminho do cartão. O `.is('deleted_at', null)` recusaria a vaga apagada mesmo com outra RLS | toda candidatura de vaga não pública: as 16 naturais (inclusive `d31c78bb`) |

### Perguntas prontas para a Task 4 (cada uma com o número que a sustenta)

- **R1 — `residual_leitores_embed`:** hoje 1 candidatura viva natural em `avaliacao_assincrona` com vaga
  não pública (`f73682b6`, vaga arquivada) vê «Nenhuma avaliação pendente» na página de avaliações, e o
  painel nunca lhe mostra «Avaliações concluídas — aguardando a equipe»; a redação dela (se houver) dá
  erro «Tentar novamente» por link direto; 2 das 16 naturais veem «Vaga não identificada» no bloco de
  currículos da privacidade. Consertar exige ler `testes_aplicaveis`/`aplica_cognitivo` por outra RPC —
  outra migration e outro apply, que move de novo o «último apply» da D-41. **Pergunta:** aceitar e
  registrar (backlog com dono), ou plano novo dentro da 52 antes do 52-19?
- **R2 — `residual_detalhe_vaga`:** as 16 candidaturas vivas de vaga não pública (1 inativa, 15
  arquivadas) levam, ao tocar o cartão, a «Vaga não encontrada ou não está mais ativa»
  (`VagaDetalhePage.tsx:88-91`). A frase é verdadeira para a vaga, mas o cartão do painel passará a
  mostrar o título que a página nega. **Pergunta:** aceitar como está, ou plano novo (cartão sem
  navegação quando a vaga não é pública, ou uma página de detalhe do titular)?
- **R3 — `residual_departamento_nulo`:** 4 vagas sem departamento, com 11 das 16 candidaturas naturais;
  o cartão mostra «N/A», como já mostra para vaga ativa sem departamento (premissa sinalizada no
  frontmatter, `assumptions`). **Pergunta:** aceitar «N/A», ou plano novo (omitir a linha de
  departamento quando vazio — muda o cartão também para vaga ativa)?
- **R4 — `db_types`:** `database.types.ts` (223613 octetos) tem 0 ocorrências de
  `ler_vagas_das_minhas_candidaturas`; o cliente usa o cast ESTREITO confinado a
  `lerVagasDasMinhasCandidaturas()` (`candidaturasService.ts:339-355`), com o comentário de quem o retira
  (D-52-G7-5). **Pergunta:** aceitar a pendência nomeada (o primeiro plano que rodar `npm run db:types <
  /dev/null` E empurrar `database.types.ts` pela via da fase retira o cast no mesmo commit), ou plano novo?

### Passo 2 — emenda datada do G-52-7 no `52-UAT.md` (commit `17b50429`)

Dois itens novos no `missing` do G-52-7, sem reescrever os existentes: (i) logo depois do item 1, a
emenda D-52-G7-4 (o cartão lê só `vaga?.titulo` e `vaga?.departamento`; o parêntese «cidade, estado,
status» era palpite); (ii) logo depois do item 3, a emenda D-52-G7-1 com a frase do operador verbatim
(vaga com `deleted_at` e todo status não ativo MOSTRA título e departamento; só a vaga INEXISTENTE segue
com o fallback, impossível no banco — D-52-G7-6). A truth e `status: failed` ficaram byte a byte;
`updated:` do frontmatter `2026-10-12T18:05:00Z` → `2026-10-12T20:25:18Z`. Só o UAT no commit (`1 file
changed, 3 insertions(+), 1 deletion(-)` — a deleção é a linha `updated:`).

`<verify>` 2 da Task 3, como escrito (depois do commit), exit 0:

```
emenda datada do G-52-7 no UAT: ok (truth e status intactos)
```

### Desvios e observações (Task 3)

1. **Contagem agregada só leitura além das duas sondas** (acima): para dar número a R1 e R3. Mesmo
   padrão do Passo 0 da §Task 1 (`set transaction read only`), só contagens; as duas sondas do
   `<verify>` rodaram exatamente como escritas.

### Commits da sessão B (cada um com os caminhos nomeados; nenhum `-A`/`-a`/`--no-verify`)

| # | sha | assunto | caminhos |
|---|---|---|---|
| 1 | `b326a215` | `test(52-31): smoke52p completo (10 clausulas) e mutacoes P1-P10` | `supabase/tests/p52_painel_vaga_smoke.sql`, `scripts/p52_mutacoes.cjs` |
| 2 | `587481ac` | `test(52-31): a mescla do servico e os casos restantes do painel (erro da RPC, embed presente, dialogo de retirada)` | `src/features/vagas/services/__tests__/candidaturasService.vagaInativa.test.ts`, `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx` |
| 3 | `17b50429` | `docs(52-31): emenda datada do G-52-7 no UAT — vaga com deleted_at mostra o titulo (D-52-G7-1); a leitura entrega so titulo e departamento (D-52-G7-4)` | `.planning/phases/52-hub-do-rh-dados-e-contato/52-UAT.md` |

Arquivos sujos de outras janelas (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`,
`AGENTS.md`, `docs/vagas/`, `.planning/phases/51-*/.gitkeep`) fora de todo commit. Nenhuma task 4+ rodou:
nenhum `/gsd-code-review`, `52-REVIEW-G7-*.md`, `52-31-DECISAO.md` nem `52-APLICACOES.json` foi escrito. A
próxima é a Task 4 (review adversarial bloqueante, depois a decisão escrita do operador), numa sessão nova.

fronteira_retomada: sessao_b_encerrada 2026-10-12T20:26Z head=17b5042908d37999fe2618819827a74b9fb2fe07

---

## §Task 4 — sessão C, 2026-10-12 (parada interna: as perguntas ao operador)

> Parada INTERNA da Task 4 (regra 2 do `<context>`): esta seção é commitada sozinha e SEM linha
> `fronteira_retomada` — só as três paradas que encerram sessão a carregam; a última `fronteira_retomada`
> do arquivo segue sendo a `sessao_b_encerrada` acima. O executor NÃO revisa e NÃO decide warning,
> residual, D-52-G7-1 nem janela única: nenhum `52-31-DECISAO.md` foi escrito, nenhum pin
> (`refs/gsd/52-31/sha` inexistente, medido), nenhum apply, nenhum push; `52-APLICACOES.json` intocado
> (versões 0001, 0002, 0003, 0005 — sem 0006).

### Sinal de retomada recebido

Orquestrador: «review commitado» — `.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7-1.md`, commit
`e6fbeaf9` (`docs(52-31): review adversarial do G-52-7 — 52-REVIEW-G7-1 (critical 0, warning 2, info 9)`).
HEAD no despacho = `e6fbeaf9`; diretório da fase limpo no git (`git diff --quiet HEAD` = 0).

### `<verify>` 1 da Task 4 — portão no modo revisão (rodado como escrito, HEAD `e6fbeaf9`, 2026-10-12T20:48Z) — VERDE

```
$ node scripts/p52_portao.cjs --revisao .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7 --base refs/gsd/52-30/sha --plano .planning/phases/52-hub-do-rh-dados-e-contato/52-31-PLAN.md --modo revisao
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7-1.md reviewed_head=133429d103c7e70d589b6068f33dbb76fc3f3d46 pin=- modo=revisao
EXIT=0
```

`refs/gsd/52-30/sha` = `70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8`. Mesma saída que a rodada do orquestrador.

### O review de maior N — `52-REVIEW-G7-1.md` (o único `52-REVIEW-G7-*`)

- Frontmatter: `reviewed: 2026-10-12T20:41:27Z` · `depth: deep` · `diff_base: 70528fba…` (= `refs/gsd/52-30/sha`) ·
  `reviewed_head: 133429d1…` · `files_reviewed: 9` · `status: issues_found` ·
  **`findings: critical 0 · warning 2 · info 9 · total 11`**.
- Summary, verbatim: «**Não achei nada crítico e nada destrutivo.**» — nenhuma escrita de dado, nenhuma ACL
  mudada além da da própria função, nenhuma outra função ou policy tocada. O item (h) da Task 4 não se aplica.
- O revisor reproduziu (só leitura ou dentro do ensaio que aborta): ensaio `52p=10/10 · vistas=igual`; P1–P10
  10/10, cada uma na sua letra; rodada completa 27/27; regressão `52l=20/20` em controle e tratamento; Vitest 224
  verdes e delta `alteradas=0 · novas=0 · mordida=ok`; lint 89 = base; `TIPOGRAFIA OK`; build com
  `painel-vaga-titulo` e `ler_vagas_das_minhas_candidaturas` em `index-CFPYr-z6.js`; enumeração em seco 17
  commits (10 `planning`, 7 `codigo`, 0 ALHEIO). Ponto (6): as sondas e a contagem agregada da §Task 3, re-rodadas,
  são IGUAIS — «a medição confere».

### Warnings — com a proposta do revisor (disposição: DO OPERADOR, pendente)

- **WR-01 — a varredura «por forma» do POS sobre `v.<coluna>` é sensível a caixa.**
  `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql:250-256`: `regexp_matches(v_cod,
  '\mv\.([a-z_]+)', 'g')` não enxerga `v.Titulo` / `v.TITULO` / `v."titulo"`. Provado: `mf1` (`v.descricao`) →
  `P52-06 POS-PORTAO` morde; `mf4` (`'departamento', v.Titulo`) → POS passa, só o smoke (a) reprova pelo valor. Hoje
  nada errado vai a PROD (o texto revisado é todo minúsculo; (a)/(c)/(d) mordem pelo valor).
  *Proposta de conserto:* `FROM regexp_matches(lower(v_cod), '\mv\.("?)([a-z_]+)\1', 'g') AS m;` usando `m[2]` (ou
  flag `gi` + `lower(m[1])`, que não pega `v."titulo"`). Toca a migration → «consertar agora» = `fix(52-31)` → o
  `<verify>` inteiro da Task 2 + o segundo `<automated>` da Task 1 sobre o sha do conserto → review `-2` → Task 4 de
  novo. *Recomendação do revisor (informação, não resposta):* **backlog** — «o apply de hoje não fica mais seguro
  com o conserto e cada rodada de conserto já trouxe blocker novo duas vezes».
- **WR-02 — `capturar()` do ensaio não tem chave para `public.vagas`.** `scripts/p52_ensaio.cjs` (`capturar()`);
  `supabase/tests/p52_painel_vaga_smoke.sql:367,482,800` (os três `UPDATE public.vagas`). Nada persistiu (impressão
  digital de `vagas` inteira `15:5adc811e…` igual antes/depois de cada rodada, medida pelo revisor) e há três camadas
  (envelope `P52P1`, `ponto()`, sentinela); a fraqueza é só de DETECÇÃO: um `UPDATE` fora de envelope numa cláusula
  futura sairia verde no `PERSISTIU`. *Proposta de conserto:* uma chave estreita `vagas_estado` em `capturar()`
  (contagem + md5 de `id`, `status`, `deleted_at` de `public.vagas`, ordenado por `id`). Toca o `p52_ensaio.cjs`
  (dentro do `--caminhos`) → «consertar agora» = `fix(52-31)` → `<verify>` da Task 2 → review `-2` → Task 4 de novo.
  *Recomendação do revisor (informação, não resposta):* **backlog, antes do 52-20** (o bloco D edita o
  `p52_ensaio.cjs` de qualquer jeito, e a chave serve ao portão da D-32, que lê `vagas.status` da `629a5f31`).

### Infos — default proposto «aceitar» (o revisor marca todas «nenhuma decisão»), salvo resposta contrária

| IN | título (resumo) |
|---|---|
| IN-01 | a ORDEM do array (`created_at DESC, id`) não é vigiada — sem `ORDER BY` passa 10/10 (nenhum consumidor depende dela) |
| IN-02 | a allowlist do POS varre só `v.<coluna>`; uma chave a mais vinda de `c.<coluna>` passa o POS e cai em (c) |
| IN-03 | o predicado de posse é «verbatim» no sentido semântico, não textual (`v_uid` e alias `ca`; mesmo conjunto) |
| IN-04 | um erro da RPC é engolido em silêncio — na tela, indistinguível do fallback legítimo (sem `console.*`) |
| IN-05 | rascunho (`is_rascunho = true`) é listado pelo `listCandidaturas` e excluído pela RPC — `rascunhos_prod=0` |
| IN-06 | o ramo «embed `undefined`» da mescla não é exercitado — `!==` em vez de `!=` passa 18/18 |
| IN-07 | a cláusula (d) chama a RPC uma vez por candidato (22 hoje, ~0,6 s) sob `statement_timeout` de 5 s — cresce com a população |
| IN-08 | a enumeração EXATA do «Comando de push» recusa até o review estar commitado — o fluxo esperado |
| IN-09 | duas chamadas à RPC por carga do painel quando há vaga não pública — a R9 do plano, confirmada no código |

### Perguntas ao operador (a)–(h), cada uma com o número da §Task 3 que a sustenta

- **(a) Janela única:** «nenhuma outra janela publica — migration, EF ou push — até o fim deste plano?» Resposta
  escrita (exigida em todo caminho; sem ela, nada de apply nem push na Task 5).
- **(b) D-52-G7-1:** «vaga com `deleted_at` (e todo status não ativo) mostra título e departamento da própria
  candidatura — confirma?» Hoje: 16 candidaturas vivas naturais de vaga não pública (1 `inativa`, 15 `arquivada`),
  `vaga_com_deleted_at=0` — a parte do `deleted_at` vale para o futuro. Provado por (a)/(i) e P2/P7. **Veto = PARAR e
  voltar ao planejador** (smoke e RPC encarnam a decisão).
- **(c) R1 `residual_leitores_embed`** — os leitores do embed `vaga:vagas` sob a RLS do candidato quebram assim
  (tabela da §Task 3): `avaliacaoService.ts:118` → `testesAplicaveis = null` → `deriveCards` = `[]` → a página de
  avaliações diz «Nenhuma avaliação pendente» e o painel nunca mostra «Avaliações concluídas — aguardando a equipe»;
  `redacaoService.ts:150` (`!inner`) → «Candidatura não encontrada» por link direto; `exportacaoService.ts:1005` →
  «Vaga não identificada» no bloco de currículos de `/candidato/privacidade` e `vagaTitulo: null` no export. Caso
  medido: **`f73682b6`** (`avaliacao_assincrona`, vaga arquivada, `vaga_visivel:false`) — 1 hoje; **2 das 16** naturais
  têm currículo exportável. Consertar exige outra RPC e outro apply (move de novo o «último apply» da D-41); consertar
  DENTRO do 52-31 não é caminho. Opções: «plano novo (52-32, antes do 52-19)», «backlog» ou «aceitar».
- **(d) R2 `residual_detalhe_vaga`** — o clique no cartão abre `/vagas/:id`, que diz «Vaga não encontrada ou não
  está mais ativa» (`VagaDetalhePage.tsx:88-91`, via `getVagaById`, `vagasService.ts:372-376/382/397`), enquanto o
  cartão passa a mostrar o título. Alcance: **as 16** candidaturas vivas naturais de vaga não pública (inclusive
  `d31c78bb`). Opções: «plano novo», «backlog» ou «aceitar».
- **(e) R3 `residual_departamento_nulo`** — departamento nulo na própria vaga segue «N/A», como já é para vaga
  ativa: **4 vagas** arquivadas sem departamento, com **11 das 16** candidaturas naturais. Opções: «backlog» ou
  «aceitar».
- **(f) R4 `db_types`** — `database.types.ts` (223613 octetos) tem **0** ocorrências de
  `ler_vagas_das_minhas_candidaturas`; o cliente usa o cast estreito confinado a `lerVagasDasMinhasCandidaturas()`
  (`candidaturasService.ts:339-355`) com o comentário de quem o retira (D-52-G7-5; o gerador roda só como prova;
  motivo: portão do push e o `--caminhos` do 52-22). Opções: «aceitar» ou «plano novo».
- **(g) WR-01 e WR-02** (acima), cada um: «consertar agora» (código muda → `<verify>` inteiro da Task 2 verde no
  commit do conserto → review NOVO `-2` → Task 4 de novo), «backlog» ou «aceitar». Recomendação do revisor, como
  informação: WR-01 backlog; WR-02 backlog antes do 52-20.
- **(h) Achado destrutivo:** nenhum (critical 0; Summary do review: «nada crítico e nada destrutivo») — não se aplica.
- **INFO:** IN-01..IN-09 com default «aceitar»; o operador pode mandar qualquer uma ao backlog.

### Observação — opções da §Task 3 × contrato da Task 4

As «perguntas prontas» da §Task 3 ofereciam, em R2, «aceitar ou plano novo» e, em R3, «aceitar ou plano novo». As
perguntas acima seguem o `<context>` da Task 4 e o regex do segundo `<verify>` dela, que aceitam R2 ∈ {plano-novo,
backlog, aceitar} e R3 ∈ {backlog, aceitar}. Um «plano novo» para R3 não cabe no contrato — se o operador o
quiser, a resposta precisa ser traduzida por ele (p.ex. «backlog» com o texto do plano no `## Backlog`), não por
este executor.

### Sinal de retomada esperado do operador

«janela única: confirmo» + «D-52-G7-1: confirmo» + a disposição de R1 (`plano-novo|backlog|aceitar`), R2
(`plano-novo|backlog|aceitar`), R3 (`backlog|aceitar`), R4 (`aceitar|plano-novo`) + a disposição de WR-01 e WR-02
(`consertar|backlog|aceitar`) e qualquer INFO que vá ao backlog; ou «vetar: <motivo>». Com a resposta, a próxima
continuação escreve `52-31-DECISAO.md` (verbatim), commita só ela, roda o segundo `<verify>` da Task 4 e completa
esta §Task 4 — ainda antes do pin da Task 5.

### Resposta do operador (recebida 2026-10-12 17:59 -03 = 2026-10-12T20:59Z, verbatim)

```
janela única: confirmo + D-52-G7-1: confirmo + R1: plano-novo (52-32, antes do 52-19: avaliacaoService.ts:118, redacaoService.ts:150 e exportacaoService.ts:1005, mesmo molde do 52-31 — leitura com guarda de posse e allowlist só dos campos que cada leitor usa; regenerar database.types.ts no mesmo plano) + R2: aceitar (a mensagem da página pública é verdadeira; o card do painel é o que importa) + R3: backlog + R4: aceitar (tipos regenerados no 52-32) + WR-01: backlog + WR-02: entra no 52-32 (o capturar() precisa fotografar vagas antes do ensaio da limpeza no 52-20) + INFO: aceitar todos.
```

Nenhum «consertar agora»: nenhum código mudou, nenhuma rodada de conserto, nenhum review `-2` — o review de maior N
segue o `52-REVIEW-G7-1.md` e o re-portão da Task 2 não se aplica (critério 3 da Task 4).

### Decisão escrita — `52-31-DECISAO.md` (commit `2721ef71`, só esse arquivo)

`docs(52-31): decisao do G-52-7 — aplicar sobre 52-REVIEW-G7-1 (warnings 2: WR-01 backlog, WR-02 ao 52-32; R1 plano-novo 52-32, R2 aceitar, R3 backlog, R4 aceitar)`
— `1 file changed, 105 insertions(+)`; pre-commit `tsc errors: 89 (frozen baseline: 96)`.

Chaves: `decisao: aplicar` · `revisao: 52-REVIEW-G7-1.md` · `warnings: 2` · `autorizacao: 52-UAT.md` (contexto; não
exigida com warnings > 0) · `disposicao_WR-01: backlog` · `disposicao_WR-02: backlog — entra no 52-32 (…)` ·
`d52_g7_1: confirmada` · `residual_leitores_embed: plano-novo` · `residual_detalhe_vaga: aceitar` ·
`residual_departamento_nulo: backlog` · `db_types: aceitar` · `janela_unica: confirmada` ·
`decidido_em: 2026-10-12 17:59 -03`; seções `## Resposta do operador` (verbatim), `## Backlog` (R3, WR-01) e
`## Plano novo (52-32, antes do 52-19)` (R1, WR-02, regeneração do `database.types.ts`).

Mapeamento de vocabulário (instrução do orquestrador no despacho, não leitura do executor): «WR-02: entra no 52-32» →
`disposicao_WR-02: backlog` com o texto do operador depois do travessão (o contrato aceita só
`consertar|backlog|aceitar`; o item vai ao plano novo seguinte, não a este).

### `<verify>` 2 da Task 4 — contrato da decisão (rodado como escrito, HEAD `2721ef71`, 2026-10-12T21:03Z) — VERDE

```
decisao do G-52-7: aplicar sobre 52-REVIEW-G7-1.md (warnings=2)
EXIT=0
```

### Disposição de cada WARNING/INFO do `52-REVIEW-G7-1.md`

| achado | disposição | dono |
|---|---|---|
| WR-01 — varredura do POS sobre `v.<coluna>` sensível a caixa | **backlog** | Pending Todos (orquestrador copia do `## Backlog` da DECISAO) |
| WR-02 — `capturar()` sem chave para `public.vagas` | **backlog → plano novo 52-32** («o capturar() precisa fotografar vagas antes do ensaio da limpeza no 52-20») | próximo `/gsd-plan-phase 52 --gaps` |
| IN-01..IN-09 | **aceitar** («INFO: aceitar todos») | — |

Residuais: R1 **plano-novo** (52-32, antes do 52-19, com a especificação do operador); R2 **aceitar**; R3 **backlog**;
R4 **aceitar** (os tipos são regenerados no 52-32, que retira o cast estreito).

### Qual caminho valeu para o conteúdo

`warning` = 2 no review de maior N → o conteúdo vale pela **resposta escrita do operador aos dois WR** (nenhum
«consertar agora»: os dois ficam fora deste plano), e não só pela autorização do UAT; a promoção do gap e a preferência
de desenho (verbatim na DECISAO) ficam como contexto. Janela única confirmada por escrito; D-52-G7-1 confirmada;
nenhum achado destrutivo (item (h) não se aplica). Task 4 encerrada — a próxima é a Task 5 (pin, Passo 0b, apply),
e este commit da FRONTEIRA vem ANTES do pin.
