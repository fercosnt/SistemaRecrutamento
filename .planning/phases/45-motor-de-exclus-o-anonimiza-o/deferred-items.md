# Phase 45 — itens diferidos (fora do escopo do plano que os encontrou)

> Append-only. Cada item nomeia o plano que o encontrou e o plano/fase que o fecha.

---

## Do plano 45-05 (ERASE-01 · bias k=5)

### DI-45-05-01 · A tela de auditoria de viés ainda lê o payload v1

**Encontrado em:** 45-05, Task 2.
**O quê:** `gerar_bias_snapshot` passa a emitir, no `dados jsonb`, células suprimidas **sem**
`applicants`/`selected`/`selection_rate`/`razao_4_5`/`flag`, e **sem** `n_total` quando existe
supressão primária. O consumidor vivo — `src/features/admin/bias-audit/` (`biasMath.ts`,
`biasAuditService.ts`, `BiasAuditPage.tsx`) — tipa `dados` como `AdverseImpactResult` e assume
todos esses campos presentes.

**Consequência se ninguém fechar:** depois do apply (45-11), a tela do administrador renderiza
`undefined` nas células suprimidas — e o modo de falha é o pior possível numa peça probatória:
**parece um zero**. Uma faixa escondida por k-anonimato exibida como "0 candidatos" afirma
exatamente o oposto do que a supressão quer dizer.

**Por que não foi feito aqui:** o 45-05 é SQL-only por desenho — sua própria `<verification>` diz
*"`npm run lint` inalterado (o plano não toca TypeScript)"*. Tocar `src/` aqui sairia do escopo
declarado e colidiria com os planos de UI da fase, que rodam em waves posteriores.

**Fecha em:** um plano de UI da Phase 45 (ou um 45-1x novo). O contrato de saída está escrito no
`COMMENT ON FUNCTION` da `20260805000003`, bloco (5), e as chaves novas estão enumeradas lá.
**Registrado também no `.planning/WINDOWS.md`** como `deviation`.

---

### DI-45-05-02 · `45-VALIDATION.md` roteia ERASE-01 para o smoke errado

**Encontrado em:** 45-05, Task 3.
**O quê:** as duas linhas de ERASE-01 do Per-Task Verification Map (`45-VALIDATION.md:60-61`)
apontam o comando automatizado para `supabase/tests/p45_motor_exclusao_smoke.sql`. O artefato que
o plano 45-05 mandou escrever — e que de fato contém as asserções de SC#5, k=5 e supressão
complementar — é `supabase/tests/p45_bias_k5_smoke.sql`.

**Consequência se ninguém fechar:** a verificação de fase roda o smoke apontado pelo mapa, não
encontra `K1`–`K9`, e marca ERASE-01 como coberto por um arquivo que não o cobre — ou o marca
como pendente tendo a prova pronta ao lado.

**Por que não foi feito aqui:** `45-VALIDATION.md` é artefato de fase, e
`p45_motor_exclusao_smoke.sql` estava sendo editado **concorrentemente** pelo plano 45-04 na mesma
árvore de trabalho. Editar qualquer um dos dois daqui seria escrever por cima de outro executor.

**Fecha em:** o verificador da fase (`/gsd-verify-work 45`) ou o 45-11, atualizando as duas linhas
do mapa para citar **os dois** arquivos.

---

## Do plano 45-07 (a metade Postgres do motor)

### DI-45-07-01 · ⚠ A EF `executar-direito-titular` chama as RPCs com `service_role` SEM claims — e o guard delas recusa com 42501

**Encontrado em:** 45-07, Task 3 (ao decidir a forma do guard das duas funções novas).

**O quê, medido no arquivo:** `supabase/functions/executar-direito-titular/index.ts:377-379` constrói
`supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, …)` **sem repassar o header
`Authorization` do titular** (o repasse existe só no `supabaseUser`, `:373-375`). As duas chamadas
de RPC — `registrar_pedido_exclusao` (`:218`) e `cancelar_pedido_exclusao` (`:270`) — usam
`supabaseAdmin`. O JWT que chega ao PostgREST é então a própria service-role key, que **não tem
claim `sub`**; logo `auth.uid()` devolve **NULL**.

E as duas RPCs, **já aplicadas em PROD hoje** (45-06), abrem com:

```sql
IF v_uid IS NULL THEN
  RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao …' USING ERRCODE = '42501';
```

**Consequência se ninguém fechar:** o titular clica "quero excluir meus dados", a EF responde erro,
e **nenhum pedido de exclusão jamais é registrado**. Não é um defeito do 45-07: é do par
EF+RPC autorado no 45-03 e deployado no 45-06.

**Por que ninguém viu ainda:** o **G1 está ABERTO** — o fluxo nunca foi exercitado ponta a ponta em
produção (`45-SONDAS-PROD.md` §"Pré-condições do portão destrutivo"), e `solicitacoes_dados` segue
em **0 linhas**. É exatamente a classe de defeito que a cláusula *"exercitado em produção"* existe
para pegar, e a prova de que ela não é formalidade.

**Por que NÃO foi consertado aqui:** (a) está fora dos três arquivos deste plano; (b) o conserto é
numa **Edge Function já deployada**, e re-deploy exige o MCP/CLI do Supabase, que subagentes GSD não
recebem; (c) escolher entre as duas saídas é decisão de desenho, não conserto mecânico.

**As duas saídas, e a recomendação:**
1. **(recomendada)** a EF passa a repassar as claims do titular às RPCs — cria um terceiro client
   com `SERVICE_KEY` **e** `global.headers.Authorization = authHeader`, ou usa
   `set_config('request.jwt.claims', …)` por RPC. Mantém o contrato que a asserção **C2** do smoke
   exige das **cinco** funções da fase (recusar chamador sem claim), que é o controle que sobrevive
   a um futuro chamador que não seja esta EF.
2. **(recusada por este plano)** afrouxar o guard para aceitar `auth.uid() IS NULL` quando o papel
   do banco for `service_role`. Isso reintroduz precisamente o defeito que a C2 fecha e deixa uma
   função que apaga PII irreversivelmente sem controle no corpo.

⚠ **As duas funções novas do 45-07 (`plano_exclusao_titular`, `anonimizar_candidato`) herdam o
mesmo contrato de propósito** — a C2 as inclui. Portanto o 45-10 tem de resolver isto **antes** de
o motor destrutivo ter qualquer chance de rodar.

**Fecha em:** **45-10** (é obrigação declarada daquele plano), e o **45-11** não deve abrir o portão
destrutivo sem que o G1 exercite o caminho e prove que a chamada chega à RPC.
