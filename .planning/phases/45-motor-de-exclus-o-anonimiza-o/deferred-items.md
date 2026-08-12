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

---

## Do plano 45-12 (as claims do titular + a retirada)

### DI-45-12-01 · ⚠ A asserção C1 do smoke e a migration `20260805000003` afirmam coisas OPOSTAS sobre `gerar_bias_snapshot`

**Encontrado em:** 45-12, Task 3c (ao reescrever a C1).

**O quê, medido nos dois arquivos:**

| lado | o que afirma | onde |
|---|---|---|
| asserção **C1** do smoke | `gerar_bias_snapshot` **não pode** conceder `EXECUTE` a `authenticated` | `supabase/tests/p45_motor_exclusao_smoke.sql` (bloco `$c1$`) |
| migration **`20260805000003`** (plano 45-05) | `REVOKE ALL … FROM PUBLIC, anon, authenticated;` seguido de **`GRANT EXECUTE … TO authenticated;`** | `20260805000003_p45_bias_k5.sql:500-501` |

E a migration não é descuido: o **bloco (6)** do cabeçalho dela declara a divergência em
relação à letra do plano 45-05 com a razão medida — *"o chamador vivo é o cliente do navegador
em `src/features/admin/bias-audit/services/biasAuditService.ts:98`, que fala com o Postgres como
`authenticated`. Revogar dali não endureceria nada — apagaria a tela de auditoria de viés do
administrador."*

O comentário vivo da própria C1 mostra a origem do descompasso: ela dizia sair *"VERMELHA para
ela até o 45-05 reafirmar o REVOKE nominal"*. O 45-05 **escolheu não reafirmar**, com razão
escrita, e ninguém reconciliou as duas peças.

**Consequência se ninguém fechar:** a C1 reprova alto no 45-11 por um privilégio que é
deliberado e necessário — um vermelho que parece defeito de ACL e não é. E o desfecho perigoso
é o reflexo oposto: alguém "conserta" revogando o `authenticated` de `gerar_bias_snapshot` e
apaga a tela de auditoria de viés, que é peça probatória de não-discriminação (RNF-07a).

**Por que NÃO foi resolvido aqui:** o `45-12-PLAN.md` traz isto como **prohibition nominal**
(*"MUST NOT conceder a `authenticated` sobre `gerar_bias_snapshot` — ela não é chamada por esta
EF e a C1 continua proibindo"*) e como critério de aceitação literal. Reescrever a asserção para
o contrário seria o executor afrouxando um gate por conta própria, que é precisamente o reflexo
que esta fase proíbe por escrito. A asserção foi escrita **como especificada**, e a mensagem de
falha dela **nomeia esta contradição** e manda ler este item antes de mexer no ACL.

⚠ Nada foi afrouxado e nada foi aplicado: `20260805000009` **não concede** `EXECUTE` a
`gerar_bias_snapshot`, e nenhuma migration foi aplicada por este plano.

**Fecha em:** o **code review bloqueante do 45-11 (Task 1)**, que precede o primeiro apply
destrutivo — é o controle humano que a decisão do operador de 2026-08-06 (*"Executar; revisar no
portão"*) nomeia. As duas saídas honestas: (a) a C1 passa a EXIGIR `authenticated` também em
`gerar_bias_snapshot`, registrando que o controle dela é o guard NULL-safe do corpo (o mesmo
argumento das outras quatro); ou (b) `gerar_bias_snapshot` sai da lista da C1, porque ela não é
função do motor de exclusão e nunca foi alcançada por esta Edge Function.

---

### DI-45-12-02 · `RetirarCandidaturaAcao` ainda renderiza copy genérica para a recusa de domínio

**Encontrado em:** 45-12, Task 2 (ao fazer o hook ler o `motivo`).

**O quê, medido no arquivo:** `useRetirarCandidatura.ts` passa a resolver a recusa de domínio
para o código `NAO_RETIRAVEL` (antes ela virava `SERVER_ERROR`). Mas
`src/features/vagas/components/RetirarCandidaturaAcao.tsx:229` renderiza
`COPY_RETIRAR_CANDIDATURA.erro` — **uma única string** — em `retirar.isError`, sem ramificar por
`error.code`. A distinção nova chega ao componente e para ali.

**Consequência se ninguém fechar:** uma candidatura já decidida diz *"Não foi possível retirar
sua candidatura. Tente novamente em instantes."* — que convida a repetir uma ação contra um
estado que não muda mais. É melhor que `SERVER_ERROR` (a tradução chegou), e ainda não é a copy
certa.

**Por que NÃO foi feito aqui:** `RetirarCandidaturaAcao.tsx` **não está no `files_modified`** do
45-12, e a copy nova é decisão de UI (a 45-UI-SPEC não a especifica). O plano trata o componente
como `key_link`, não como arquivo a editar.

**Fecha em:** um plano de UI da Phase 45/46 ou o `/gsd-ui-review`, acrescentando a copy do ramo
`NAO_RETIRAVEL` ao lado da genérica.

---

### DI-45-13-01 · `logs_auditoria` continua sem receber a escrita de anonimização

**Encontrado em:** 45-13, Task 2 (ao acrescentar a trilha de executor ao tombstone).

**O quê, medido:** `anonimizar_candidato` não escreve em `public.logs_auditoria`, e o
`COMMENT` dela sempre registrou isso — mas registrava como se fosse neutro. A razão é
medida e continua válida: a tabela usa dois enums (`categoria_log_auditoria`,
`severidade_log`) cujos valores vivos **nenhum plano desta fase pôde medir** (subagentes
GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898), e
a regra da fase é que nenhuma escrita é escolhida por parecer razoável.

**Consequência se ninguém fechar:** a destruição de PII não aparece na trilha de
auditoria central do produto. Quem for auditar o sistema por `logs_auditoria` não vê as
anonimizações — vê o resto.

**Por que NÃO foi feito aqui:** um valor de enum inventado abortaria a transação de
anonimização inteira **no pedido real, depois de o currículo já ter sido apagado do
Storage** — o Pitfall 1 literal, e sem PITR e com o Storage fora de todo backup esse
estado é definitivo. Seria trocar um defeito de rastreabilidade por um irreversível.

**A trilha que existe no lugar, e ela é nova neste plano:** o retorno da função carrega
um bloco `executor` com o papel lido da claim, o booleano de «foi o próprio titular» e —
**apenas quando o executor NÃO é o titular** — o `uid` dele. A Edge Function persiste
esse bloco no `plano`, que sobrevive ao fecho do pedido. O `uid` do titular fica de fora
de propósito: ele é o identificador que a exclusão existe para apagar, e gravá-lo no
registro que prova a exclusão seria o CR-04 com outra cara.

**Fecha quando:** alguém medir os dois enums por sonda **read-only** (`SELECT
enumlabel FROM pg_enum`) e a escrita for acrescentada com valores lidos do catálogo —
nunca escolhidos.

---

### DI-45-13-02 · A janela passo 3 → passo 4 não tem retomada, e o motor não tem gatilho

**Encontrado em:** 45-13, Task 4 (ao fechar o CR-03).

**O quê, medido em duas metades:**

1. **Sem retomada depois do hard delete.** O reencontro do CR-03 resolve o pedido pelo
   `auth_uid` persistido no `plano`, comparado com o `sub` de um JWT verificado. Depois
   que o `deleteUser` completa **não existe mais conta**, logo não existe JWT, logo não
   existe reencontro. Um pedido que morra entre o passo 3 e o passo 4 fica com os três
   carimbos destrutivos e **sem recibo** — e o recibo é o único canal que ainda alcança
   a pessoa.
2. **Sem gatilho (WR-09).** `acao: 'executar'` não tem chamador em `src/`, não há
   `cron.schedule` apontando para esta Edge Function e não há caminho de operador dentro
   do produto. A Task 3 do 45-11 a invoca **manualmente**, para a evidência do portão.

**Consequência se ninguém fechar:** um pedido real fica em `agendado` indefinidamente
depois de vencidos os 15 dias, e o prazo do Art. 18 §6 passa em silêncio. Somado à
metade (1): mesmo quando alguém dispara, uma falha na última janela deixa a pessoa sem
comprovante de um apagamento que aconteceu.

**Por que NÃO foi feito aqui:** o executor agendado (`pg_cron` + `net.http_post`, ou uma
EF de varredura com `service_role`) é da **Phase 46** por decisão de escopo registrada no
`45-CONTEXT.md` § Deferred Ideas. Um plano da Phase 45 que o construísse estaria
implementando ideia diferida — e ele é justamente onde a metade (1) também se resolve,
porque um executor com `service_role` retoma sem depender de JWT nenhum.

**Fecha na Phase 46**, junto com o executor agendado.

---

## Do plano 45-14 (os 3 blockers do `45-REVIEW-2.md`)

### DI-45-14-01 · `deno test supabase/functions/` (o diretório INTEIRO) não roda — falta `npm:svix`

**Encontrado em:** 45-14, ao conferir a baseline de Deno depois do fix do BL-03.

**O quê, medido:**

```
error: Could not find a matching package for 'npm:svix@1.99.1' in the node_modules directory
    at supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts:22:25
```

O pacote é dependência da EF `resend-webhook` (verificação de assinatura de webhook do Resend) e
não está instalado no `node_modules` deste repositório, nem declarado em `deno.json`. **É
pré-existente e não tem relação com a Phase 45** — o comando de baseline desta fase é
`deno test supabase/functions/executar-direito-titular/`, que sai **78/78**.

**Consequência se ninguém fechar:** quem rodar o diretório inteiro (o comando mais óbvio) vê um
vermelho que não é sobre o código que acabou de escrever, e a reação treinada é ignorar a suíte de
Deno como um todo — inclusive os testes do motor destrutivo, que são a cobertura do passo 1.

**Por que NÃO foi feito aqui:** instalar dependência é ato de escopo próprio, e este plano é um
fix pass de três blockers com "zero dependência nova" entre as condições. Além disso, a suíte da
`resend-webhook` não é objeto de nenhuma asserção da Phase 45.

**Fecha:** junto com o próximo trabalho que tocar `resend-webhook`, ou como item de manutenção —
`deno install` / declaração em `deno.json`, conferindo antes que o pacote `svix` seja o legítimo.

### DI-45-14-02 · Os 7 WARNINGs do `45-REVIEW-2.md` continuam abertos

**Encontrado em:** o próprio review; este plano fechou apenas os 3 BLOCKERS.

WR-A (retomada do passo 1 não convergente quando o bucket ganha objeto depois do passo 0),
WR-B (a enumeração só vê FKs DIRETAS para `auth.users`; o bloqueador medido era transitivo),
WR-C (`candidatos.user_id` já NULL faz a enumeração medir vazio por vacuidade),
WR-D (`bloqueadores_deleteuser` não é reavaliado numa retomada),
WR-E (o plano persistido é consumido sem forma verificada — `TypeError` DEPOIS do `remove()`),
WR-F (`plano_exclusao_titular` virou sonda de autoria arbitrária sob o papel `rh`),
WR-G (`updated_at` idêntico em todas as candidaturas do titular — quase-identificador novo).

**Consequência se ninguém fechar:** o review afirma que os sete **não bloqueiam o apply**, mas que
**WR-A, WR-C e WR-E** produzem estados terminais **depois do passo 1** — o custo exato que esta
fase existe para não pagar — e que os três deveriam fechar **antes da execução real da Task 3 do
45-11**.

**Fecha:** decisão do orquestrador no portão do 45-11 — fechar os três antes da Task 3, ou
registrar em `45-11-EVIDENCIA-PORTAO.md` a aceitação explícita do risco, com o desfecho de cada um
escrito.

**⚠ ATUALIZAÇÃO (45-16):** **WR-A e WR-E estão FECHADOS** — ver `45-16-SUMMARY.md`, com prova por
mutação (6 dos 9 casos Deno novos falham contra o código pré-fix). **WR-C foi REDUZIDO pelo round
3** com rastreamento de alcançabilidade (`45-REVIEW-3.md:466`) e deixou de ser condição de portão.
**Continuam abertos: WR-B, WR-C, WR-D, WR-F e WR-G** — nenhum deles é condição de portão segundo o
round 3, e o **WR-F cresceu** com o fix do BL-02 (a linha no `COMMENT` que o round 2 pediu continua
não escrita).

### DI-45-16-01 · A NW-03 alargou: `causa='falha_storage'` cobre agora **10** classes nomeadas, mais `carimbo` e `excecao`

**Encontrado em:** o plano 45-16, como consequência declarada dos próprios fixes.

A NW-03 (`45-REVIEW-3.md:332`) registrou que a `causa` nomeia o **sistema** e a `classe` nomeia a
**condição**, e que a segunda vai só para o log redigido (`index.ts:1030`), nunca para a linha —
com **sete** classes distintas colapsando em `falha_storage`. O 45-16 acrescentou três
(`varredura_pos_plano`, `list_pos_varredura`, `residuo_apos_varredura`, todas da varredura do WR-A)
e mais uma quarta por outra via: com `passoCorrente`, uma exceção genérica no passo 1 passou a
chegar à linha como `falha_storage` com `classe='excecao'`, em vez de mentir com `falha_postgres`.
Contado por execução: **10** `ErroDePasso("storage", …)` distintas, mais `carimbo` e `excecao`.

**Consequência se ninguém fechar:** um pedido parado no passo 1 fica em `situacao='executando'` com
`causa='falha_storage'` e **nada na linha** que diga qual das doze condições parou o motor — e o
`acao: 'executar'` não tem gatilho agendado nem ação de operador (WR-09). O diagnóstico exige o log
da invocação, que não é consultável por quem opera o pedido.

**Por que NÃO foi feito aqui:** o escopo do 45-16 é fechar WR-A e WR-E; persistir `ultima_classe` no
`plano` toca o formato do registro que **sobrevive ao titular** e merece a mesma pergunta de PII que
todo o resto do plano recebeu (o vocabulário de `classe` é fechado e não embute caminho, mas isso
precisa ser afirmado com a lista na mão, não presumido).

**Fecha:** com o fix barato que a própria NW-03 propõe —
`plano: { ...estado.plano, ultima_classe: classe }` no `registrarCausa` — ou, no mínimo, com a linha
em `45-11-EVIDENCIA-PORTAO.md` dizendo que `falha_storage` cobre doze condições e que o diagnóstico
é o log da invocação.
