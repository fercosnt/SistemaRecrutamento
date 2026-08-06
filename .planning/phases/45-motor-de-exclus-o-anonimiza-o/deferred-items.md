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

---

## Do plano 45-08 (a superfície da decisão irreversível)

### DI-45-08-01 · O "X" do `DialogContent` vendorizado: rótulo em inglês e sem alvo tátil de 44px

**Encontrado em:** 45-08, Task 1 (ao escrever a asserção dos quatro rótulos de saída).

**O quê, medido no arquivo:** `src/components/ui/dialog.tsx:72-75` — todo `DialogContent` renderiza
um `DialogPrimitive.Close` próprio, com `<span className="sr-only">Close</span>` e **sem**
`min-h-[44px]`. Ele é, portanto, um **quinto** controle de saída no diálogo de confirmação de
exclusão: o leitor de tela de um titular brasileiro ouve *"Close"* numa superfície inteiramente
pt-BR, e o alvo tátil fica abaixo do piso que esta fase exige de todo controle acionável.

**Consequência se ninguém fechar:** ruído de idioma e um alvo pequeno no diálogo mais delicado do
produto. **Não** é a ambiguidade que a Invariante 7 combate — "Close" não colide com nenhum dos
quatro rótulos autorados, e não é a palavra genérica de recuo que nesta fase significaria três
coisas. Por isso é diferido, e não corrigido às pressas aqui.

**Por que NÃO foi feito aqui:** `dialog.tsx` é primitivo **compartilhado**, vendorizado desde o M1 e
consumido por todos os diálogos do app (RH inclusive). Editá-lo a partir de um plano cujo escopo
declarado são seis arquivos de `src/features/privacidade/` mudaria silenciosamente superfícies de
outras fases — exatamente o tipo de mudança que o `files_modified` do plano existe para conter.

**Fecha em:** um plano de UI transversal (ou o `/gsd-ui-review`), tratando os dois pontos de uma vez
para todos os diálogos: rótulo `sr-only` em pt-BR e `min-h-[44px]` no botão de fechar.

---

### DI-45-08-02 · O recibo do e-mail (45-10) precisa do MESMO recorte que a prévia da tela

**Encontrado em:** 45-08, Task 3 (ao decidir de onde saem `temCurriculo` e `temDecisaoRegistrada`).

**O quê:** `ReciboExclusao` é **um** componente com **dois** tempos verbais justamente para que a
prévia (tela, futuro) e o relato (e-mail, passado) não divirjam — *"a divergência apareceria
justamente entre o que foi prometido e o que foi relatado"*. Mas o componente é parametrizado por
dois booleanos, e **eles são a via pela qual a divergência ainda pode entrar**: se a tela filtrar
por um recorte e o e-mail por outro, o titular lê promessa e relato diferentes sobre o mesmo fato,
com o mesmo componente.

**A tela mede assim** (`exclusaoService.lerRecorteDoTitular`): `temCurriculo` = existe
`candidaturas.curriculo_url` não-nulo nas candidaturas own-row; `temDecisaoRegistrada` = existe
linha em `decisao_final` para alguma dessas candidaturas (policy `candidato_le_propria_decisao`).
Falha de leitura resolve para `false` — o recibo **não afirma o que não pôde medir**.

**O que o 45-10 precisa garantir:** o recibo do e-mail deriva os dois do **plano real** do motor
(`plano_exclusao_titular`), que é a autoridade. As duas fontes medem os mesmos fatos e devem
concordar; o único descompasso possível é o transitório (a tela leu `false` por falha de rede e o
motor achou a linha). **Não** reimplementar um terceiro critério: seriam três verdades sobre a
mesma pessoa.

**Fecha em:** **45-10**, no plano que monta o corpo do e-mail de recibo.

---

## Do plano 45-10 (o motor destrutivo)

### DI-45-10-01 · ⚠ `DI-45-07-01` NÃO foi fechado pelo 45-10 — e o escopo do conserto é maior do que o registrado

**Encontrado em:** 45-10, ao ler a EF para escrever os passos destrutivos.
**Status do `DI-45-07-01`:** **CONTINUA ABERTO.** O `deferred-items.md` e o `STATE.md`
atribuíam o fechamento ao 45-10; o `45-10-PLAN.md` **não tem tarefa que o cubra** — ele foi
escrito antes de o defeito ser descoberto, e nenhuma das suas três tarefas o menciona.

**O que foi MEDIDO aqui** (`executar-direito-titular/index.ts`, pós-45-10):

| fato | medição |
|---|---|
| `supabaseAdmin` construído sem repassar `Authorization` | `index.ts:958` — só `auth: { autoRefreshToken:false, persistSession:false }` |
| o repasse existe apenas no client anon | `index.ts:954-955` — `global.headers.Authorization` |
| RPCs afetadas | **quatro**, todas com `supabaseAdmin`: `registrar_pedido_exclusao` (`:318`), `cancelar_pedido_exclusao` (`:378`), `plano_exclusao_titular` (`:695`), `anonimizar_candidato` (`:560`) |

O 45-10 **acrescentou duas** chamadas à lista (`plano_exclusao_titular` e
`anonimizar_candidato`), o que aumenta a superfície do defeito sem mudar sua natureza.
Consequência prática, hoje: `auth.uid()` é NULL, as cinco RPCs da fase recusam com `42501`,
e o passo 0 do motor falha em `rpc_plano` — com `causa='falha_postgres'` e **zero mutação**,
que é o desfecho seguro, mas é um motor que não roda.

**Por que NÃO foi consertado aqui, e a razão é de escopo declarado:** (a) está fora das três
tarefas do plano; (b) o conserto correto exige **uma migration nova** — o PostgREST deriva o
*role* do MESMO JWT, então um client com `SERVICE_KEY` + `Authorization` do titular chega como
`authenticated`, e as cinco funções precisam de `GRANT EXECUTE ... TO authenticated` (o
precedente da P44 é exatamente esse: guard no corpo como controle, `authenticated` no ACL); (c)
migration nova está fora do `files_modified` do 45-10, e o portão desta fase é auditável
justamente porque cada plano fica dentro dele.

**Fecha em:** um plano novo (45-12 ou equivalente), com **três** entregas indivisíveis — o
terceiro client na EF, a migration de `GRANT`, e o redeploy. ⚠ **O `45-11` não pode abrir o
portão destrutivo sem isso:** o G1 exige exercitar o fluxo ponta a ponta, e ele não roda hoje.

---

### DI-45-10-02 · A retirada do 45-09 está morta na chegada: a EF não conhece `retirar_candidatura`

**Encontrado em:** 45-10, ao acrescentar `'executar'` ao vocabulário fechado de `ACOES`.

**O quê, medido nos dois arquivos:** `src/features/vagas/hooks/useRetirarCandidatura.ts:46`
define `ACAO_RETIRAR = 'retirar_candidatura'` e `:77-79` invoca **esta** Edge Function com
`{ acao: ACAO_RETIRAR, candidatura_id }`. O `ACOES` da EF é
`new Set(["pedir", "cancelar", "executar"])` (`index.ts:170`) — `retirar_candidatura` **não
está lá**. O caminho medido: a EF responde **400 `VALIDATION`** ("Ação não reconhecida"), e o
`traduzirErro` do hook cai no `default` e mostra ao titular **`SERVER_ERROR`**.

**Consequência se ninguém fechar:** o botão **Retirar minha candidatura** do 45-09 nunca
funciona, e falha com a copy errada — um erro de servidor genérico onde não há erro de
servidor nenhum.

**⚠ O conserto tem uma aresta que o achado não pode esconder:** `retirar_candidatura` precisa
de um `candidatura_id`, e o **DESVIO 1** desta EF é explícito — *"nenhum identificador vindo do
corpo é lido em lugar nenhum desta função"*, porque aceitar identificador do cliente é a
superfície **T-32-03** (deixar forjar de quem é o pedido é deixar forjar de quem são os dados).
As duas saídas honestas: resolver a candidatura no servidor a partir de um critério que não
seja um id do cliente, ou aceitar o id **e validá-lo contra a titularidade** antes de qualquer
toque privilegiado — nunca confiá-lo. Não é conserto mecânico; é decisão de desenho.

**Por que NÃO foi feito aqui:** fora das três tarefas do plano, e a decisão de desenho acima
precisa de revisão — num arquivo cuja outra ação apaga PII irreversivelmente.

**Fecha em:** o mesmo plano novo do `DI-45-10-01` (as duas mexem no mesmo arquivo e no mesmo
redeploy) ou um plano de correção do 45-09.
