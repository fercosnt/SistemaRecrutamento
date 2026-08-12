---
phase: 45-motor-de-exclus-o-anonimiza-o
reviewed: 2026-08-12T00:00:00Z
review_round: 4
supersedes: 45-REVIEW-3.md
depth: deep
scope: >-
  motor destrutivo da Phase 45 DEPOIS do apply das 7 migrations em PROD e depois dos planos
  45-15 (NW-01/NW-02), 45-16 (WR-A/WR-E) e dos 4 commits de conserto de portao. Inclui a
  camada de aplicacao (React/TanStack) e o recibo, que nenhuma das 3 rodadas anteriores cobriu.
files_reviewed: 22
files_reviewed_list:
  - supabase/functions/executar-direito-titular/index.ts
  - supabase/functions/executar-direito-titular/helpers.ts
  - supabase/functions/executar-direito-titular/index.test.ts
  - supabase/functions/_shared/reciboExclusao.ts
  - supabase/migrations/20260805000001_p45_pedido_exclusao.sql
  - supabase/migrations/20260805000003_p45_bias_k5.sql
  - supabase/migrations/20260805000005_p45_plano_e_dry_run.sql
  - supabase/migrations/20260805000006_p45_anonimizar_candidato.sql
  - supabase/migrations/20260805000007_p45_retirada_e_evento.sql
  - supabase/migrations/20260805000008_p45_v_triagem_panel_encerramento.sql
  - supabase/tests/p45_motor_exclusao_smoke.sql
  - supabase/tests/p45_bias_k5_smoke.sql
  - src/features/privacidade/services/exclusaoService.ts
  - src/features/privacidade/components/ExcluirDadosBloco.tsx
  - src/features/privacidade/components/ConfirmarExclusaoDialog.tsx
  - src/features/privacidade/components/ReciboExclusao.tsx
  - src/features/privacidade/hooks/usePedidoExclusao.ts
  - src/features/privacidade/constants/reciboExclusao.generated.ts
  - src/features/vagas/hooks/useRetirarCandidatura.ts
  - docs/compliance/recibo-exclusao.json
  - docs/compliance/sql/gen-recibo-exclusao.cjs
  - .planning/STATE.md
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
gate_verdict: >-
  REPROVADO PARA O FECHAMENTO DO SMOKE — 2 BLOCKERS, e os DOIS sao portoes que reprovam
  trabalho CORRETO. O motor nao ganhou defeito novo: BL-01/BL-02/BL-03 e CR-01..CR-06
  seguem fechados, e os fixes do 45-15/45-16 nao introduziram regressao. O que reprova e
  que o smoke `p45_motor_exclusao_smoke.sql` NAO PODE ficar verde no estado atual, por duas
  razoes independentes, e nenhuma delas e defeito de anonimizacao. O diagnostico registrado
  em STATE.md:118-124 para o (B3/email) esta ERRADO e induz ao conserto errado.
---

# Phase 45 — Code Review BLOQUEANTE nº 4 (pós-apply, pós-45-15/45-16)

**Reviewed:** 2026-08-12
**Depth:** deep (SQL ↔ Deno ↔ React ↔ artefato gerado ↔ catálogo, com varredura por FORMA)
**Status:** `issues_found` — **2 BLOCKER**, 4 WARNING, 3 INFO

---

## Sumário

**O motor está certo, e eu tentei quebrá-lo por seis frentes antes de dizer isso.** Os três
blockers do round 2 continuam fechados por mecanismo, os seis do round 1 idem, e os dois planos
novos (45-15, 45-16) não introduziram regressão — verifiquei o BL-01 por varredura de ocorrência,
o BL-02 par a par contra o `WHERE` da severação, e o BL-03 lendo a ordem dos três blocos em
`montarPlano`. As baselines estão todas verdes por execução: **vitest 1892/1892**, **Deno 87/87**,
**tsc 97** (= baseline), **5/5 `check:*`**.

**O que reprova é que o gate não pode fechar — e as duas razões são portões que reprovam trabalho
CORRETO.** Este é o padrão-assinatura desta fase, e ele acaba de produzir a **sexta** e a **sétima**
instância:

1. **CR-01 — a asserção `(B3/email)` do smoke é a ÚNICA das ~40 do bloco de julgamento que faz uma
   consulta VIVA depois de a subtransação ter sido revertida.** Ela mede `count(*)` sobre uma
   fixture que acabou de deixar de existir, e por isso reprova **incondicionalmente, em todo run**,
   independentemente de o motor estar certo. **O diagnóstico registrado no `STATE.md:118-124` está
   errado** — ele atribui a falha a `v_email_d` ter vindo NULO, e eu demonstro abaixo que
   `v_email_d` é não-nulo e correto. Consertar pelo diagnóstico registrado levaria a mexer na
   fixture, que não tem defeito nenhum.

2. **CR-02 — a asserção `(C1)` vai reprovar um ACL que está CERTO.** É o `DI-45-12-01`, que os
   próprios planos rotearam *"ao code review bloqueante do 45-11 (Task 1)"* — ou seja, a este
   documento. Rendo a decisão abaixo. É uma **segunda** barreira independente: mesmo com o CR-01
   fechado, o smoke não alcança 24/24.

Uma observação sobre a forma do relatório anterior: o `45-REVIEW-3.md` declarou, com honestidade,
que *"as asserções SQL novas nunca foram executadas, e eu também não as executei"*. O apply de
2026-08-12 executou-as pela primeira vez, e produziu exatamente o que aquele limite previa — dois
defeitos de verificação que só existem em execução (`to_regproc`, aridade de `RAISE`), já
consertados. **Os dois blockers deste relatório são da mesma família e ainda estão de pé.**

### O que eu varri por FORMA e encontrei LIMPO

A lição operacional da fase (`MEMORY.md` → *"portão é código: varrer pela forma, não pelo sintoma"*)
foi aplicada literalmente. Cada varredura abaixo foi **executada**, não lida:

| classe de defeito | varredura | resultado |
|---|---|---|
| `to_regproc('fn(tipos)')` devolve NULL SEMPRE | `grep -rn "to_regproc("` em `supabase/` + `docs/` | **0 ocorrências.** As 7 são `to_regprocedure`. Os 4 `to_regclass` recebem nome de TABELA, que é o uso correto. |
| `RAISE` com N `%` e < N argumentos | parser próprio de aridade sobre **315 `RAISE`** nas 9 migrations + 2 smokes | **0 divergências.** Ferramenta validada por mutação: rodada contra `6879f1b~1` ela **acha** o bug do BLOCO G (`placeholders=3 args=2`). |
| asserção que passa por VACUIDADE | leitura das 3 medições da `(vii)` + base zero + precondição de catálogo | fechadas pelo 45-15; a `(c)` prova o recorte `t.candidato_id` e vem antes da `(b)` pela razão escrita |
| pin/contador fora de sincronia | `smoke45m.pass`: 25 ocorrências = 1 init (`:273`) + **24** incrementos vs `v_esperado := 24` (`:1994`) | **bate** |
| artefato gerado fora de sincronia | os 5 `npm run check:*` | **5/5 verdes** |
| consulta VIVA depois do rollback | parser sobre os **5** blocos de subtransação do smoke | **1 ocorrência — o CR-01 abaixo.** Nenhuma outra. |

---

## BLOCKERS

### CR-01 · `(B3/email)` mede um `count(*)` VIVO depois de a fixture ter sido revertida — reprova em todo run, e o diagnóstico registrado está errado

**Arquivos:**
`supabase/tests/p45_motor_exclusao_smoke.sql:1116` (a asserção)
`supabase/tests/p45_motor_exclusao_smoke.sql:1032-1035` (o rollback e o handler)
`supabase/tests/p45_motor_exclusao_smoke.sql:1042` (o comentário que declara o contrato do bloco)
`.planning/STATE.md:118-124` (o diagnóstico a corrigir)

**Issue.**

O bloco `B` tem um contrato explícito, escrito no próprio arquivo em `:1042`:

```
-- JULGAMENTO — fora da subtransacao. Ordem deliberada (ver cabecalho do bloco).
```

Tudo entre `:711` e `:1032` roda dentro de uma subtransação que termina em
`RAISE EXCEPTION 'rollback_smoke45m_bloco_b' USING ERRCODE = 'P45B0'` (`:1032`), capturada em
`:1034`. **A fixture inteira é revertida ali.** As ~40 asserções do julgamento (`:1042` em diante)
sobrevivem porque leem **apenas variáveis capturadas dentro da subtransação** — variáveis PL/pgSQL
não são revertidas por um rollback de subtransação, e é exatamente essa propriedade que o desenho
usa.

**A linha 1116 é a única exceção, e ela é uma consulta viva:**

```sql
IF (SELECT count(*) FROM public.candidatos c WHERE c.email = v_email_d) <> 1 THEN
```

Quando ela executa, a linha `v_cand` **já não existe** — foi revertida 84 linhas antes. `count(*)`
devolve **0**, `0 <> 1` é verdadeiro, e a asserção reprova. **Isto acontece em 100% dos runs,
qualquer que seja o comportamento do motor.**

**Prova de que a varredura é completa** (por parser, sobre os 5 blocos de subtransação do arquivo —
`:1032`, `:1466`, `:1622`, `:1743`, `:1909`):

```
rollback@1032 → 1 LIVE QUERY após o rollback:  L1116
rollback@1466 → 0        rollback@1622 → 0
rollback@1743 → 0        rollback@1909 → 0
```

Uma única violação isolada do próprio padrão do arquivo, e ela é precisamente a asserção que falha
em PROD.

**Por que o diagnóstico registrado está ERRADO.** O `STATE.md:118-124` afirma:

> *"o `SELECT … INTO v_email_d` (linha ~934) não achou linha para `v_cand`. É **estado de fixture**,
> não de anonimização."*

Isso exigiria `v_email_d IS NULL`. Ele não é, e a cadeia é fechada:

1. **`v_cand` não pode ser NULO.** A fixture (`:735-744`) é um `INSERT INTO public.candidatos … 
   RETURNING id INTO v_cand` **sem `ON CONFLICT`** — ou ela insere e devolve o id, ou ela levanta e
   o bloco inteiro aborta antes de chegar ao julgamento.
2. **Nada apaga a linha de `candidatos`.** `20260805000006` contém **zero** statements `DELETE` — as
   únicas 2 ocorrências do token são prosa (`:149` e `:505`, ambas a expressão *"ON DELETE SET
   NULL"*). O tombstone anonimiza; ele nunca remove linha, que é o próprio ERASE-08.
3. **Logo o `SELECT` de `:934` acha a linha**, e `v_email_d` recebe a sentinela
   `'anonimizado+' || p_candidato_id || '@invalido.local'` (`20260805000006:468`) — não-nula, única
   por linha e no formato do `check_email_format`. **É por isso que `:1113` passa**: se `v_email_d`
   fosse NULL, `NULL !~* '…'` avaliaria NULL, o `IF` não seria tomado, e `:1113` também passaria —
   as duas hipóteses são indistinguíveis olhando só para `:1113`.
4. **O discriminador é o `(B0)`.** Ele roda ANTES (`:1045`) e mede `count(*) … WHERE candidato_id =
   v_cand` capturado em `:852-854`. Se a fixture não existisse, **o `(B0)` reprovaria primeiro**. Ele
   passou. A fixture existiu.

**A prova positiva de que o padrão correto é o outro:** a auto-verificação da própria
`20260805000006` faz **a mesma checagem, do jeito certo**, dentro da sua subtransação:

```sql
-- 20260805000006_p45_anonimizar_candidato.sql:1235-1238
SELECT count(*) INTO v_uniq FROM public.candidatos c WHERE c.email = v_email_d;
IF v_uniq <> 1 THEN
  RAISE EXCEPTION 'P45-TOMBSTONE: a sentinela de e-mail nao e unica por linha (% ocorrencias)…', v_uniq;
END IF;
```

A migration mede e **só então** julga. O smoke julga medindo. **E a migration aplicou com sucesso em
PROD** — ou seja, a propriedade que a `(B3/email)` tenta afirmar **já foi provada verdadeira, em
produção, pelo bloco que a mediu no lugar certo.**

**Fix.** Mover a MEDIÇÃO para dentro da subtransação e deixar no julgamento apenas a comparação —
que é o padrão que as outras ~40 asserções do bloco já seguem. Isto **não afrouxa nada**: a asserção
passa a medir a mesma propriedade num ponto em que ela é observável, o que é estritamente mais forte
que medir onde ela é inobservável.

```sql
-- (1) no DECLARE do bloco B, junto das outras variáveis "DEPOIS" (~:650):
  v_email_uniq  int;

-- (2) DENTRO da subtransação, imediatamente após o SELECT … INTO v_email_d de :934-936:
    -- ⚠ A UNICIDADE E MEDIDA AQUI, DENTRO DA SUBTRANSACAO, E NAO NO JULGAMENTO.
    --   O julgamento roda DEPOIS do rollback de :1032 — a fixture ja nao existe la, e uma
    --   consulta viva contra ela devolve 0 e reprova o motor CORRETO em todo run. Todas as
    --   outras assercoes deste bloco leem so variaveis capturadas; esta era a unica excecao.
    --   Mesmo padrao de 20260805000006:1235, que mede e so entao julga.
    SELECT count(*) INTO v_email_uniq FROM public.candidatos c WHERE c.email = v_email_d;

-- (3) no julgamento, :1116 passa a ser comparacao pura:
  IF v_email_uniq <> 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B3/email): a sentinela de e-mail nao e unica por linha (% ocorrencias, medidas DENTRO da subtransacao). A coluna e NOT NULL + UNIQUE + CHECK de formato (D5): uma sentinela FIXA colide na SEGUNDA exclusao e aborta a transacao inteira de quem pediu depois', v_email_uniq;
  END IF;
```

⚠ **O contador FIXO do smoke NÃO muda** (segue 24): isto reescreve uma asserção existente, não
acrescenta uma. E o `md5(prosrc)` das duas funções **não muda**: o smoke não é `prosrc` de nada.

⚠ **E isto NÃO é "alterar o smoke para caber no que foi aplicado"**, que o cabeçalho do arquivo
proíbe e o `STATE.md:122-124` reforça. A proibição é contra **enfraquecer o predicado**. Aqui o
predicado é idêntico — `count(*) = 1` — e só o **ponto de medição** muda, de um em que a resposta é
estruturalmente 0 para um em que ela é a resposta real. Afrouxar seria trocar `<> 1` por `> 1`, ou
por `IS NOT NULL`; nada disso está sendo proposto.

---

### CR-02 · `(C1)` vai reprovar o ACL de `gerar_bias_snapshot`, que está CORRETO — a decisão que o `DI-45-12-01` roteou para este review

**Arquivos:**
`supabase/tests/p45_motor_exclusao_smoke.sql:1387` (a asserção que dispara)
`supabase/tests/p45_motor_exclusao_smoke.sql:1294-1310` (a contradição, declarada por quem a escreveu)
`supabase/migrations/20260805000003_p45_bias_k5.sql:500-501` (o `GRANT` deliberado, **aplicado em PROD**)
`src/features/admin/.../biasAuditService.ts:98` (o chamador vivo)

**Issue.** As duas afirmações estão no disco e **as duas estão aplicadas**:

```sql
-- 20260805000003:500-501  (aplicada em PROD)
REVOKE ALL ON FUNCTION public.gerar_bias_snapshot(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_bias_snapshot(text) TO authenticated;
```

```sql
-- p45_motor_exclusao_smoke.sql:1386-1388
IF NOT v_exige_auth AND v_auth THEN
  RAISE EXCEPTION 'P45M FAIL (C1): public.%() concede EXECUTE a authenticated e NAO e alcancada
    pela Edge Function desta fase…';
END IF;
```

`gerar_bias_snapshot` não está na lista de `v_exige_auth` (`:1327` diz por quê: a EF não a chama),
então `v_exige_auth = false`; o `GRANT` existe, então `v_auth = true`; a condição é verdadeira e a
asserção **dispara**. O `(C1)` é o segundo bloco de julgamento do arquivo, então ele reprova assim
que o `(B3)` for consertado — **duas barreiras independentes entre o smoke e o verde**.

Quem escreveu a asserção **sabia** e registrou (`:1298-1310`), roteando explicitamente:

> *"Isto e decisao de desenho, nao conserto mecanico, e esta endereçada ao code review bloqueante do
> 45-11 (Task 1), que precede o primeiro apply destrutivo."*

**Decisão deste review: o ACL está CERTO; a premissa da asserção está errada. Consertar a asserção,
NUNCA revogar o privilégio.**

Razão, e ela é a mesma que sustenta o `ERASE-08`: `gerar_bias_snapshot` é lida pela tela de auditoria
de viés do administrador, que fala com o Postgres como `authenticated`. Revogar o `GRANT` **não
endurece nada** — apaga a tela. E essa tela é peça **probatória de não-discriminação** (RNF-07a), do
mesmo tipo que `decisao_final`/`historico_candidatura`, cuja preservação é o requisito que esta fase
protege com três FKs `NO ACTION`. Destruir a evidência de não-discriminação para satisfazer uma
asserção de ACL seria o espelho exato do movimento proibido *"relaxar a FK para CASCADE diante de um
23503"*: tratar o sintoma reportado pelo gate destruindo a coisa que o gate existe para proteger.

E a asserção não perde poder: o que ela **precisa** garantir sobre esta função é que ela não conceda
a `anon`/`PUBLIC` — e essa metade (`:1372`) continua de pé e continua mordendo.

**Fix.** Tornar a expectativa por-função explícita e DATADA, no lugar de derivá-la de "é chamada pela
EF?":

```sql
  -- ⚠ `gerar_bias_snapshot` CONCEDE a `authenticated` POR DESENHO, e isto foi decidido pelo
  --   code review bloqueante nº 4 (45-REVIEW-4.md / CR-02), fechando o DI-45-12-01.
  --   O chamador vivo e a tela de auditoria de vies do ADMINISTRADOR (biasAuditService.ts:98),
  --   que fala com o Postgres como `authenticated` — revogar nao endurece nada, apaga uma peca
  --   PROBATORIA de nao-discriminacao (RNF-07a). O controle dela e o guard do corpo, nao o ACL.
  --   O que continua PROIBIDO e inalterado: `anon` e PUBLIC (a metade de :1372).
  v_exige_auth := r.proname IN ('registrar_pedido_exclusao', 'cancelar_pedido_exclusao',
                                'retirar_candidatura', 'plano_exclusao_titular',
                                'anonimizar_candidato', 'gerar_bias_snapshot');
```

⚠ E atualizar, **no mesmo commit**, o comentário de `:1294-1296` (que ainda afirma o contrário) e a
mensagem de PASS de `:1397` (*"e gerar_bias_snapshot nao concede"*), senão o arquivo passa a
carregar a contradição em prosa depois de tê-la resolvido em código — que é o padrão P39/CR-02 que
esta fase inteira combate.

---

## WARNINGS

### WR-A · O recibo da TELA e o recibo do E-MAIL discordam sobre uma linha de retenção OBRIGATÓRIA — e um teste pina a divergência

**Arquivos:**
`src/features/privacidade/components/ReciboExclusao.tsx:113` (a tela: `obrigatorio` VENCE)
`supabase/functions/executar-direito-titular/helpers.ts:359-361` (o e-mail: `obrigatorio` IGNORADO)
`docs/compliance/recibo-exclusao.json` (o dado que torna a divergência alcançável)
`supabase/functions/executar-direito-titular/index.test.ts:1659-1697` (o teste `(mm)`, que pina o lado divergente)

O `ReciboExclusao.tsx` declara, no docblock, a regra e a razão:

> *"Coluna «mantém»: as três linhas `obrigatorio: true` aparecem em TODOS os recortes, mesmo quando a
> aplicabilidade não bate. Omitir uma retenção faria a exclusão parecer MAIOR do que é — a
> superestimação que o SC#5 proíbe."*

e a implementa (`:113`): `item.obrigatorio === true || aplicavel(...)`.

O helper que monta o **recibo enviado por e-mail** — o documento de conformidade que sai **depois**
do apagamento irreversível — não implementa essa regra (`:359-361`): ele filtra só por
`aplicavel(...)`. **O campo `obrigatorio` está disponível** no artefato Deno
(`_shared/reciboExclusao.ts:65,84,100`); ele simplesmente não é lido.

**Alcançável com o dado vivo, e eu executei os dois filtros lado a lado:**

```
recorte: temCurriculo=true, temDecisaoRegistrada=false
TELA  (tempo=futuro),  coluna MANTEM: 8 itens
EMAIL (tempo=passado), coluna MANTEM: 7 itens
SO NA TELA, ausente do recibo enviado: [ 'justificativa_do_recrutador' ]
```

`justificativa_do_recrutador` é o único item com `obrigatorio: true` **e**
`aplicavel_quando: 'tem_decisao_registrada'`. O recorte que dispara — titular sem decisão registrada
— é o **caso majoritário** (quem se candidatou e ainda não foi decidido).

O `ReciboExclusao.tsx` afirma no docblock que isso é impossível: *"Um componente, dois tempos — NUNCA
DOIS COMPONENTES. Dois componentes divergiriam na primeira edição, e a divergência apareceria
justamente entre o que foi prometido e o que foi relatado — o pior lugar possível para uma
divergência."* **Mas o e-mail JÁ É um segundo componente**, em outra linguagem e outro runtime, e ele
**já divergiu**. A invariante é afirmada e não é imposta por mecanismo nenhum.

⚠ **E o teste `(mm)` pina o lado divergente.** Ele assere `!semDecisao.includes(i.rotulo)` para
**todos** os itens `tem_decisao_registrada`, sem distinguir `obrigatorio: true`. Ou seja: quem
corrigir o helper **quebra o teste**, e o sinal mais provável é que a correção seja revertida.

**Fix.** Alinhar o helper à regra declarada e ajustar o teste para medir a assimetria em vez de a
achatar:

```ts
// helpers.ts:359 — ⚠ `obrigatorio` VENCE na coluna «mantem», identico a ReciboExclusao.tsx:113.
//   Omitir uma retencao OBRIGATORIA faz a exclusao parecer MAIOR do que foi — a superestimacao
//   que o SC#5 proibe — e este e o recibo que sai DEPOIS do irreversivel.
const mantem = RECIBO_EXCLUSAO.colunas_mantem
  .filter((i) => i.obrigatorio === true || aplicavel(i.aplicavel_quando, recorte))
  .map((i) => itemHtml(i.rotulo, i.texto_passado, i.base_legal))
  .join("\n");
```

e, no `(mm)`, trocar `for (const i of daDecisao)` por dois laços — os `obrigatorio !== true` têm de
SUMIR, os `obrigatorio === true` têm de PERMANECER. Vale acrescentar um caso irmão que compare
diretamente as duas implementações sobre os 4 recortes possíveis: é a única forma de a invariante
"um conteúdo, dois tempos" deixar de ser prosa.

---

### WR-B · `aplicavel()` falha em direções OPOSTAS na tela e no e-mail

**Arquivos:** `src/features/privacidade/components/ReciboExclusao.tsx:89-92`;
`supabase/functions/executar-direito-titular/helpers.ts:274-279`

Diante de um `aplicavel_quando` que o gerador venha a introduzir e que o consumidor não conheça:

| | comportamento | razão escrita no próprio arquivo |
|---|---|---|
| tela (`:92`) | `return true` → **inclui** | *"Falhar mostrando é o lado seguro numa coluna que descreve retenção"* |
| e-mail (`:278`) | `return false` → **omite** | *"FAIL-CLOSED por vocabulário… Uma linha a mais é uma promessa de apagamento que ninguém executou"* |

As duas justificativas são defensáveis **isoladamente** e mutuamente contraditórias. Não é alcançável
hoje (o vocabulário é fechado em `sempre` / `tem_curriculo` / `tem_decisao_registrada`, e o
`check:recibo-exclusao` guarda isso), então é WARNING e não BLOCKER. Mas é a mesma raiz do WR-A: duas
implementações do mesmo contrato, sem mecanismo que as force a concordar. O `gen-recibo-exclusao.cjs`
é o lugar certo para o backstop — ele já reprova passo sem linha e linha sem passo; reprovar
`aplicavel_quando` fora do vocabulário fecharia os dois de uma vez.

---

### WR-C · `arquivos_apagados` da resposta muda de valor entre a execução fresca e a retomada do MESMO estado

**Arquivo:** `supabase/functions/executar-direito-titular/index.ts:956`, `:965`, `:967`, `:1109`

```ts
:956  plano.contagens.storage_remove = apagadosDeVerdade + varridos;  // inclui varridos
:965  arquivosApagados = apagadosDeVerdade;                            // fresco  — EXCLUI varridos
:967  arquivosApagados = Number(plano.contagens?.storage_remove ?? 0); // retomado — INCLUI varridos
:1109 arquivos_apagados: arquivosApagados
```

Uma execução que varre `k` objetos posteriores responde `N`; uma invocação seguinte sobre o mesmo
pedido já concluído responde `N + k`. O `45-16-SUMMARY.md` registra como decisão que *"os varridos
SOMAM… Omiti-los faria o recibo declarar menos arquivos do que o passo destruiu — a prova
subestimando o próprio ato"* — e `:965` faz exatamente o que a decisão proíbe, no campo que o
chamador lê.

⚠ Alcance limitado, e digo com todas as letras: **o recibo por e-mail não é afetado** —
`corpoReciboExclusao()` recebe só `dataConclusao` + 2 booleanos, sem contagem nenhuma. E o `plano`
persistido (a prova durável) está **correto**. O defeito é só no campo da resposta HTTP.

**Fix.** Uma linha: `arquivosApagados = apagadosDeVerdade + varridos;` em `:965` — que também torna
os dois ramos a mesma quantidade, e portanto a resposta idempotente.

---

### WR-D · `causa='falha_storage'` cobre **10** classes distintas, e a `classe` só vai para o log redigido

**Arquivo:** `supabase/functions/executar-direito-titular/index.ts` (10 sítios); `deferred-items.md:419` (`DI-45-16-01`)

Confirmado por execução — `grep -oE 'ErroDePasso\("storage", ?"[a-z_]+"' | sort -u` devolve **10**:
`estrutura_vazia`, `leitura_ponteiros`, `list`, `list_pos_remove`, `list_pos_varredura`, `remove`,
`residuo_apos_remove`, `residuo_apos_varredura`, `todos_os_ponteiros_fora_do_prefixo`,
`varredura_pos_plano` — mais `carimbo` e `excecao`, que herdam o passo. Todas colapsam numa `causa`
única, e a `classe` nunca chega à linha.

Já está registrado como `DI-45-16-01` e **não é achado novo**; registro-o aqui só para confirmar que
o número subiu de 7 para 10 e que o fix barato que o `NW-03` propôs (persistir `ultima_classe` no
`plano`) continua por escrever. Com `acao: 'executar'` ainda sem gatilho (WR-09), um pedido parado
segue exigindo o log da invocação para ser diagnosticado.

---

## INFO

### IN-01 · `IF v_tem THEN` continua sem `coalesce` no único ponto que decide se um bloqueador entra na lista

**Arquivo:** `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:327-332`

O `NW-05` do round 3 continua aberto e continua **inalcançável** — `SELECT EXISTS(...)` nunca devolve
NULL, e reconfirmei que a consulta é montada exclusivamente como `EXISTS` (`:319-320`). Registro pela
mesma razão do round 3: é a única decisão do caminho destrutivo cuja segurança depende de uma
propriedade do `EXISTS` que não está escrita, num arquivo que dedica três comentários a proibir
exatamente isso. `IF coalesce(v_tem, true) THEN` custa um caractere e uma linha de razão.

### IN-02 · `NOT IN` sobre `etapa_atual` (WR-07) — fechado pelo dado, não pelo código

**Arquivo:** `supabase/migrations/20260805000007_p45_retirada_e_evento.sql:230`, `:464`

Reconfirmado: `etapa_atual etapa_processo NOT NULL DEFAULT 'triagem'`
(`docs/sql/sql/13-tabela-candidaturas.sql:21`), então o `NOT IN` não pode avaliar NULL. Inalterado
desde o round 2. O próprio arquivo proíbe a forma em prosa (`:188-189`, `:818`) e a usa duas vezes.

### IN-03 · `foraDoPrefixo` conta duplicatas mais de uma vez

**Arquivo:** `supabase/functions/executar-direito-titular/index.ts:1295`

`ponteiros.filter((v) => !doBanco.includes(v))` — dois `curriculo_url` idênticos e fora do prefixo
produzem `achados_resumo.fora_do_prefixo = 2` para **um** objeto distinto. `doBanco` é deduplicado a
jusante por `unirEDeduplicarCaminhos`, mas o contador não. Afeta só um número de achado; nenhuma
decisão depende dele.

---

## Os fixes dos rounds anteriores — reconferidos, e nenhum introduziu defeito

O round 2 provou que um conserto pode abrir um blocker. Reconferi os cinco mecanismos:

| # | veredito | como conferi AGORA |
|---|---|---|
| **BL-01** (`p_dry_run` NULO) | **FECHADO** | Varredura de ocorrência em `20260805000006`: `p_dry_run` aparece em posição **executável** em exatamente **2** lugares — a assinatura (`:275`) e `v_dry_run boolean := coalesce(p_dry_run, true)` (`:311`). Todas as outras são comentário ou corpo de string de `RAISE`. As 4 leituras executáveis são de `v_dry_run` (`:390`, `:436`, `:498`, `:772`). O parâmetro cru **não é consultado em ponto executável nenhum**. |
| **BL-02** (escopo do probe) | **FECHADO** | `:304-308`: `t.id IS DISTINCT FROM $2` para `candidatos`, `t.candidato_id IS DISTINCT FROM $2` para `candidaturas`, `ELSE ''` (sem recorte = enumerar de mais = falha fechada) para o resto. Bate o `WHERE` da severação par a par. `%I` nos identificadores, valor por `USING`, `%s` recebendo só um de três literais fixos. |
| **BL-03** (G13) | **FECHADO** | `:1280-1282` mede `ponteiros` **crus** ANTES da filtragem de `:1294`; a recusa de descarte integral vem depois (`:1302`). Ordem correta. Provado por execução: **87/87** na suíte Deno, incluindo `(v)`, `(v2)`, `(v3)`. |
| **NW-01 / NW-02** (45-15) | **FECHADOS** | A `(vii)` tem 3 medições + precondição de catálogo dos 4 pares por `string_agg`, na mesma forma de consulta do laço de enumeração (`unnest(conkey) WITH ORDINALITY`). A `(c)` vem antes da `(b)`, com a razão escrita. |
| **WR-A / WR-E** (45-16) | **FECHADOS** | `normalizarPlanoPersistido()` (`:1175-1207`) roda nos DOIS ramos e **antes** de qualquer mutação (`:839`, contra `caminhos` lido em `:845`); ela re-valida prefixo + `..`. A conferência separa resíduo planejado (`:916`, falha fechada) de objeto posterior (`:920-944`, varredura de UMA passada). Provado por mutação no 45-16 e reconfirmado por 87/87 aqui. |

**Ordem `Storage → Postgres → Auth`:** intacta. O passo 2 é guardado por `!estado.postgres_concluido_em`
e o passo 3 **relê a linha do banco** (`:1040-1046`) em vez de confiar no espelho em memória, exigindo
`postgres_concluido_em`. Não encontrei caminho em que `deleteUser` ou o tombstone alcancem o mundo
antes de os ponteiros de Storage terem sido capturados e removidos.

**Trilha de decisão:** zero `CASCADE` novo. Varredura de `ALTER TABLE` / `DROP CONSTRAINT` /
`DELETE FROM` sobre `historico_candidatura`, `decisao_final` e `decisao_final_historico` nas 9
migrations: **zero ocorrências**. A `(A1)` do smoke continua exigindo `confdeltype = 'a'` nas três, com
a mensagem certa (*"RELAXAR PARA CASCADE E O REFLEXO ERRADO diante do 23503"*). **A proibição foi
respeitada.**

---

## Baselines — medidas por execução, não transcritas

| gate | esperado | medido agora |
|---|---|---|
| `npm run test:run` | 1892 | **1892 passed** (187 arquivos) |
| `deno test` (EF do titular) | 87 | **87 passed / 0 failed** |
| `npm run lint` (`tsc --noEmit`) | ≤ 97 | **97** |
| `check:recibo-exclusao` · `check:export-allowlist` · `check:matriz-retencao` · `check:pii-inventory-md` · `check:resend-dominio` | verdes | **5/5 verdes** |
| aridade de `%` em 315 `RAISE` | 0 divergências | **0** |
| `to_regproc(` em todo o repo | 0 | **0** |
| contador FIXO do smoke | 24 | **24** (1 init + 24 incrementos) |

---

## Condição de reabertura do portão

1. **CR-01** — a medição de unicidade do e-mail movida para **dentro** da subtransação do bloco `B`,
   com a comparação permanecendo no julgamento. Contador FIXO inalterado (24); `md5(prosrc)`
   inalterados. **E o `STATE.md:118-124` corrigido no mesmo commit** — o diagnóstico registrado
   aponta para a fixture, que não tem defeito, e é o que a próxima pessoa vai ler primeiro.
2. **CR-02** — `gerar_bias_snapshot` acrescentada à lista de `v_exige_auth`, com a razão e a data da
   decisão escritas; `:1294-1296` e a mensagem de PASS de `:1397` atualizados no mesmo commit.
   **Nenhum `REVOKE`.**

Os 4 WARNINGs **não bloqueiam o smoke**. **WR-A deveria ser fechado antes do primeiro pedido real**:
ele é o único que produz um documento de conformidade — enviado depois do irreversível — divergente
da prévia que a pessoa leu para consentir, e ele tem um teste que hoje pina o lado errado.

---

## O limite declarado desta revisão

- **Não executei SQL contra o banco.** Não há Postgres local (`psql`/`docker` ausentes) e não usei
  MCP. As afirmações sobre `(B3/email)` e `(C1)` são derivadas do **código**, do **dado gerado** e
  do estado de apply registrado no `STATE.md` — e são falsificáveis: rodar o smoke depois do fix do
  CR-01 tem de fazê-lo avançar até o `(C1)`, e não parar de novo no `(B3)`. Se parar, minha análise
  está errada e o diagnóstico do `STATE.md` merece uma segunda olhada.
- **A varredura de aridade de `RAISE` é minha, e eu a validei por mutação** contra `6879f1b~1` —
  ela acha o defeito conhecido. Não a validei contra outras formas de defeito de `RAISE`
  (`USING` malformado, `%` dentro de literal escapado); o que ela afirma é só aridade.
- **A divergência do recibo (WR-A) foi medida executando os dois filtros** sobre
  `docs/compliance/recibo-exclusao.json`, não lendo-os. O número (8 vs 7) é medição.
- **A execução REAL do motor continua não exercitada**, e `EXPORT-03` segue não provado em produção
  — o caminho de leitura do Storage de que o passo 1 depende continua garantido só pelo dublê.
  Inalterado, e não é achado desta fase.

---

_Reviewed: 2026-08-12_
_Reviewer: Claude (gsd-code-reviewer), depth=deep, round 4_
_Escopo: motor destrutivo da Phase 45 após o apply e após os planos 45-15/45-16. Phase 47 fora de escopo._
