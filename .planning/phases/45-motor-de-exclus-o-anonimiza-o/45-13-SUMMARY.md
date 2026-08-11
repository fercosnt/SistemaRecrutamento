---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 13
subsystem: database
tags: [supabase, postgres, plpgsql, security-definer, rls, edge-functions, deno, storage, lgpd, acl]

requires:
  - phase: 45-07
    provides: "`plano_exclusao_titular` e `anonimizar_candidato` (escritas, NÃO aplicadas)"
  - phase: 45-10
    provides: "o motor destrutivo de 4 passos na Edge Function `executar-direito-titular`"
  - phase: 45-12
    provides: "o terceiro client (claims do titular), o `GRANT` a `authenticated` e a metade (b) do guard"
  - phase: 45-REVIEW
    provides: "o veredito REPROVADO com os 6 blockers e os 21 guards conferidos como CORRETOS"
provides:
  - "metade (c) de `anonimizar_candidato` — o guard de INTENÇÃO: pedido em execução, janela do D-45-01 vencida e `storage_concluido_em` carimbado, só no caminho destrutivo (CR-01)"
  - "metade (b) em DUAS formas (opção B): leitura aceita `rh`/`administrador`/dono; caminho destrutivo aceita apenas `administrador`/dono"
  - "asserção de catálogo que aborta o apply se `authenticated` puder DE FATO escrever em `solicitacoes_dados`"
  - "predicado de idempotência por IGUALDADE com a sentinela derivada do id da linha, com cinto secundário (CR-06)"
  - "bloco `executor` no retorno do tombstone — a trilha de quem destruiu PII, sem o uid do titular"
  - "severação de `candidaturas.curriculo_url` / `curriculo_nome_original` / `created_by` / `updated_by` (CR-04)"
  - "severação de `preferencias_notificacoes.created_by` / `updated_by` — o bloqueador medido na SONDA 6 (CR-05)"
  - "`bloqueadores_deleteuser` em `plano_exclusao_titular`: enumeração do catálogo menos a lista declarada de severações (CR-05)"
  - "conferência do passo 1 pelo PÓS-ESTADO do bucket, com retomada convergente (CR-02)"
  - "reencontro do pedido pelo `auth_uid` do plano na ação `executar` (CR-03)"
  - "asserções C7 e B11 no smoke; contador FIXO de 21 → 23"
  - "`md5(prosrc)` recomputado das duas funções do motor — ESTE documento substitui o `45-12-SUMMARY.md` como referência do 45-11"
affects: [45-11, 46, portao-destrutivo, code-review-bloqueante]

actuals:
  tokens: 44900
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "guard de INTENÇÃO: uma função destrutiva verifica o ESTADO DO MOTOR, não só quem chama — ser chamável deixa de ser suficiente para ser perigosa"
    - "pressuposto de segurança vira asserção de catálogo que aborta o apply, composta com RLS e policy (o `GRANT` sozinho não é capacidade de escrita)"
    - "conferência de passo destrutivo pelo PÓS-ESTADO do mundo, nunca pelo valor de retorno de uma chamada — é o que torna a retomada convergente"
    - "enumeração do catálogo menos lista declarada de severações: FK nova aparece sozinha como bloqueador, severação nova exige uma linha em um lugar só"
    - "trilha de autor persistida no registro que sobrevive ao fecho, com o identificador do titular deliberadamente FORA"
    - "reencontro de sessão por identificador que o próprio motor persistiu, comparado com o `sub` do JWT — e a comparação refeita em código, não só no filtro da consulta"

key-files:
  created:
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-13-SUMMARY.md
  modified:
    - supabase/migrations/20260805000005_p45_plano_e_dry_run.sql
    - supabase/migrations/20260805000006_p45_anonimizar_candidato.sql
    - supabase/migrations/20260805000009_p45_claims_do_titular.sql
    - supabase/functions/executar-direito-titular/index.ts
    - supabase/functions/executar-direito-titular/helpers.ts
    - supabase/functions/executar-direito-titular/index.test.ts
    - supabase/tests/p45_motor_exclusao_smoke.sql
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/deferred-items.md

key-decisions:
  - "OPÇÃO B, decidida pelo operador em 2026-08-11: o `GRANT` a `authenticated` FICA, a função passa a verificar INTENÇÃO, e o caminho destrutivo aceita apenas `administrador` ou o próprio titular. O `rh` mantém o dry-run e perde o tombstone"
  - "A metade (a) do guard NÃO foi tocada em função nenhuma: aceitar `auth.uid() IS NULL` sob `service_role` continua sendo a saída recusada pelo operador em 2026-08-05 (guard G2)"
  - "A asserção de catálogo do guard de intenção é COMPOSTA (privilégio E (RLS desligada OU policy de UPDATE)): o `GRANT` de tabela sozinho não é capacidade de escrever, e abortar por ele reprovaria uma configuração CORRETA"
  - "Os caminhos não devolvidos pelo `remove()` são persistidos como CONTAGEM e nunca como lista: o caminho embute o `auth.uid()` que a exclusão existe para apagar"
  - "`decisao_final.por_usuario` NÃO entra na lista de severadas: numa conta híbrida ela é um bloqueador legítimo, e a saída certa é a recusa antes do passo 1 — nunca destruir a prova de avaliação humana (RNF-07a)"
  - "O reencontro do CR-03 existe SÓ para `acao='executar'`, exige `recibo_enviado_em` nulo, e a comparação `auth_uid` × `sub` é refeita em código além do filtro da consulta"
  - "ERASE-08 permanece `Pending` em REQUIREMENTS.md: este plano ESCREVE, e a sobrevivência da trilha é provada pelo smoke que roda no 45-11 — marcá-lo aqui seria a superestimação que o próprio REQUIREMENTS.md proíbe"

patterns-established:
  - "Asserção com DISCRIMINAÇÃO POR SQLSTATE em alvo sintético: a C7 chama a primitiva destrutiva sobre um uuid inexistente sob claims que o guard de papel aceita — `42501` prova que o guard de intenção existe, `P0002` prova que ele sumiu, e nenhum dos dois toca linha real"
  - "Mock de bucket como ESTADO e não como constante: `remove()` retira e o `list()` posterior serve o que sobrou — sem isso, uma re-enumeração de prova viraria leitura de fixture congelada"
  - "Guard automático que procura string banida tem de ser lido contra o próprio texto que a explica: `storage.objects` dentro de um `COMMENT` (linha não-comentário) reprovou o guard G7 e obrigou a descrever o objeto em prosa"

requirements-completed: [ERASE-02, ERASE-03, ERASE-04, ERASE-06, ERASE-07, ERASE-09, ERASE-10]

status: complete
---

# Phase 45 Plan 13: Fechamento dos 6 blockers do code review destrutivo — Summary

Os seis blockers do `45-REVIEW.md` estão fechados **no disco**, cada um com asserção que
morde: a primitiva que apaga PII recusa fora do motor, fora da janela e fora da ordem; o
passo 1 do Storage converge em vez de travar num caminho que o próprio código coloca no
lote; a execução é retomável depois do tombstone que severa o ponteiro da autorização; o
`auth.uid()` deixa de sobreviver em texto claro dentro de `candidaturas`; o 23503 vira
recusa antes da primeira mutação; e a sentinela de idempotência para de aceitar uma
coluna escrita pelo usuário como prova de que já foi apagado.

**⚠ Zero apply, zero deploy, zero contato com PROD.** As sete migrations
`20260805000003` … `20260805000009` continuam NÃO aplicadas. Quem aplica é o **45-11**, e
o portão dele reabre com um **code review novo** — nunca com a autodeclaração deste plano.

---

## ⚠⚠ AS QUATRO OBRIGAÇÕES DE HANDOFF PARA O 45-11

### 1 · Os `md5(prosrc)` recomputados — **ESTE documento substitui o `45-12-SUMMARY.md`**

O corpo das duas funções do motor mudou outra vez. A asserção **C3** do smoke compara o
md5 vivo contra um pin, e uma divergência é **parada imediata** no 45-11. Deixar a
referência velha de pé transformaria uma edição legítima em incidente.

**A partir daqui, o 45-11 confere `md5(prosrc)` contra ESTES valores — não contra os do
`45-12-SUMMARY.md`, que este plano INVALIDOU:**

| função | `md5(prosrc)` | octetos |
|---|---|---|
| `public.plano_exclusao_titular(uuid)` | `42237a680e00bb01d7d79d649eb13dbe` | 17155 |
| `public.anonimizar_candidato(uuid, boolean)` | `3bb0c38181ff91b721bc21f416ebd46b` | 31267 |

Receita — a mesma do smoke §PROVENIENCIA, corpo entre os dois delimitadores NOMEADOS de
cifrão:

```
node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
  D="$"+process.argv[2]+"$", a=f.indexOf(D), b=f.indexOf(D,a+D.length);
  console.log(require("crypto").createHash("md5")
    .update(f.slice(a+D.length,b),"utf8").digest("hex"))' \
  supabase/migrations/20260805000006_p45_anonimizar_candidato.sql \
  anonimizar_candidato
```

Conferido: cada delimitador aparece **exatamente duas vezes** no seu arquivo, e o corpo
extraído começa em `\nDECLARE` e termina em `\nEND;\n` — a extração não pegou prosa.

### 2 · A resposta do checkpoint (Task 1) e a variante efetivamente escrita

**Resposta do operador, 2026-08-11: `opcao-b`.** As duas metades foram implementadas:

- **o guard de INTENÇÃO** (metade (c)), exigido apenas quando `p_dry_run = false`: tem de
  existir linha em `solicitacoes_dados` para aquele candidato, com `tipo = 'exclusao'`,
  `situacao = 'executando'`, `executar_em <= now()` e `storage_concluido_em` não-nulo;
- **a restrição de papel** (o delta da B): a metade (b) ganhou DUAS formas — no caminho de
  leitura aceita `rh`, `administrador` ou o dono; no caminho destrutivo aceita apenas
  `administrador` ou o dono.

**O custo que a opção B nomeava foi pago:** as duas direções do papel `rh` são
exercitadas no bloco de auto-verificação (ACEITO sob dry-run, RECUSADO com `42501` no
caminho real), e a asserção **C2 do smoke continua verde SEM edição** — ver §"A C2, sem
uma linha editada" abaixo.

### 3 · O novo contador FIXO do `p45_motor_exclusao_smoke.sql`

**`23`** (era 21). Duas asserções novas:

- **(C7)** — o guard de INTENÇÃO em PROD: chamada REAL sob claims de `administrador`
  sobre um candidato sem pedido recusa com `42501`.
- **(B11)** — o ponteiro reverso de `candidaturas`: as duas colunas nulas, a
  re-identificação por `split_part` devolvendo zero, e a LINHA de pé.

O cabeçalho (`GATE VERDE`, a lista de asserções, o `v_esperado` do bloco `(z)`) foi
bumpado no mesmo commit. Os oito marcadores `PENDENTE-45-07` estão intactos.

### 4 · As lacunas declaradas que o portão herda

- **EXPORT-03 nunca exercitado em PROD.** O export ponta a ponta rodou em 2026-08-11
  (`solicitacoes_dados` 0 → 1, `tipo=acesso`, `situacao=atendido`, 5 s), **mas a conta não
  tinha currículo**. O caminho de leitura de Storage do qual o passo 1 destrutivo depende
  continua sem prova em produção. Lacuna DECLARADA, não item fechado.
- **`acao: 'executar'` continua sem gatilho (WR-09).** Não há UI, não há `cron.schedule` e
  não há caminho de operador. O cron é da **Phase 46** por decisão de escopo do
  `45-CONTEXT.md` — `DI-45-13-02`.
- **A janela passo 3 → passo 4 continua sem retomada.** Depois do `deleteUser` não existe
  conta, logo não existe JWT, logo não existe reencontro — `DI-45-13-02`.
- **`DI-45-12-01`** (a contradição da C1 sobre `gerar_bias_snapshot`) continua sendo
  decisão do code review do 45-11. Este plano não a tocou.

---

## ⚠ Por que isto é EDIÇÃO EM LUGAR, e a precondição foi verificada

`STATE.md` § Current Position registra que **nada da Phase 45 posterior ao 45-06 foi
aplicado**. A precondição da Task 2 foi conferida contra ele e contra o
`45-12-SUMMARY.md` («escrito, NADA aplicado/deployado»); nenhuma das três migrations
editadas (`20260805000005`, `000006`, `000009`) consta como aplicada. Empilhar migration
corretiva sobre migration que nunca rodou produziria um arquivo a reconciliar
mentalmente e um ledger com duas versions para uma mudança que nunca existiu em dois
estados.

⚠ **O executor deste plano NÃO tem os tools MCP do Supabase** (bug upstream
anthropics/claude-code#13898), então a verificação foi por documento de estado, não por
consulta a `supabase_migrations.schema_migrations`. **Se o 45-11 encontrar qualquer uma
das três já aplicada, a premissa mudou e o plano precisa ser refeito como migration
corretiva.**

---

## Accomplishments

### Task 1 — Checkpoint: a rota do CR-01 (DECIDIDO: `opcao-b`)

Decisão do operador de 2026-08-11, registrada no prompt de execução. A opção C (retirar o
`GRANT` e chamar por `supabaseAdmin` com a identidade por parâmetro) foi **recusada** e
está registrada no cabeçalho da `20260805000009` para que a próxima pessoa não a
redescubra como novidade: sob `service_role` não existe `auth.uid()`, então a metade (a)
teria de aceitar `NULL` — a saída recusada pelo operador em 2026-08-05 e o guard **G2**
que o review conferiu como correto.

### Task 2 — CR-01 (o guard de intenção), CR-06 (a sentinela por igualdade), WR-04/05/06

**A metade (c), em `anonimizar_candidato`.** Fica imediatamente depois da metade (b) e
ANTES da chamada a `plano_exclusao_titular`: a recusa é barata e não vaza nada sobre a
existência do candidato. A posição também importa para o diagnóstico — colocá-la antes da
(b) faria uma recusa de titularidade ser reportada como recusa de intenção.

O predicado é **NULL-safe por construção**, e o comentário ao lado registra por quê: com
`executar_em` nulo, `s.executar_em <= now()` avalia NULL, a linha não é selecionada, o
`NOT EXISTS` é TRUE e a função **recusa**. Falha FECHADA sem precisar de `IS NOT NULL` —
o oposto exato do `NOT IN`, que avalia NULL e falha ABERTO.

**⚠ E é aqui que a ordem `Storage → Postgres → Auth` passa a ser imposta pelo BANCO.** A
SONDA 2 mediu que a plataforma não a impõe e que o modo de falha de violá-la é
SILENCIOSO: nada levanta erro, o blob apenas fica órfão para sempre.

**O pressuposto virou asserção de catálogo — e a composição foi um desvio deliberado.** O
plano mandava perguntar `has_table_privilege` / `has_column_privilege` e abortar o apply
se `authenticated` tivesse `UPDATE` em `solicitacoes_dados`. Escrito assim, o guard
abortaria uma configuração **CORRETA**: aquela tabela tem RLS ligada, uma única policy de
`SELECT` own-row e **zero caminho de escrita** para o candidato (`20260804000002`), e no
Supabase o papel `authenticated` costuma receber os privilégios de tabela por default no
schema `public`. A asserção escrita é composta — aborta quando o papel **pode de fato
escrever**: privilégio E (RLS desligada OU existe policy de `UPDATE` que o alcance) — e
emite `RAISE NOTICE` quando o privilégio existe mas a RLS o barra, dizendo com todas as
letras que **a RLS daquela tabela passou a fazer parte do guard de intenção desta
função**. Um gate que reprova o comportamento correto treina quem executa a desligá-lo, e
é a mesma classe de erro do guard estrito de `search_path` que já custou um apply
abortado neste projeto.

**A metade (b) em duas formas (opção B).** Todas as comparações continuam por
`IS DISTINCT FROM`, nas duas formas. O bloco de auto-verificação ganhou o papel `rh` nas
duas direções.

**CR-06 — a sentinela por IGUALDADE.** O predicado de idempotência passou a ser
`v_email = v_sent_email AND v_user_id IS NULL AND v_nasc = DATE '1900-01-01'`. O cinto
secundário existe porque a igualdade sozinha depende de `p_candidato_id` nunca mudar: uma
linha que case o e-mail mas não os outros dois **não é um tombstone** — é uma linha meio
anonimizada, e declará-la no-op faria a EF carimbar o passo 2 e mandar o recibo sobre PII
intacta. A fixture de INTRUSO (e-mail do namespace de anonimização, `user_id` presente,
`data_nascimento` real) é anonimizada de verdade, e a asserção mede o campo `resultado`
**e** confere que a linha mudou.

⚠ O mesmo defeito existia num **segundo sítio** que o plano não nomeava:
`plano_exclusao_titular` computava `ja_anonimizado` pelo mesmo padrão de prefixo. Como é
exatamente a chave que o 45-11 lê antes do dry-run para saber qual das duas terminações
esperar (WR-05), um `true` falso ali faria o gate medir um retorno normal e registrar
evidência ambígua. Corrigido junto (Rule 1 — mesma classe de defeito, segundo sítio).

**A trilha do executor.** O retorno da execução real carrega `executor` com o papel lido
da claim, o booleano de «foi o próprio titular», e o `uid` **apenas quando o executor não
é o titular**. Ela não vai para `logs_auditoria` por razão medida (os dois enums nunca
foram medidos, e um valor inventado abortaria a anonimização depois de o currículo já ter
sido apagado — Pitfall 1 literal); a lacuna é `DI-45-13-01`, nomeada.

**WR-04 / WR-05 / WR-06.** CPF das fixtures derivado do UUID (o apply deixa de ser
não-determinístico sobre uma coluna `UNIQUE`); o par de terminações do dry-run escrito no
`COMMENT`; `RAISE WARNING` mais `severacao_por_user_id: false` quando `user_id` já era
NULL. O cabeçalho registra que **`public.candidatos` não tem trigger de `INSERT` vivo**:
o único que existiu (`trg_n8n_novo_candidato`, `20260712100004:82`) foi removido pela
`20260726000001` da P39.

### Task 3 — CR-04 (o ponteiro reverso) e CR-05 (o bloqueador medido)

**CR-04.** `candidaturas.curriculo_url` e `curriculo_nome_original` são anuladas no
tombstone, escopadas ao candidato, com `GET DIAGNOSTICS` entrando no `RAISE` do dry-run e
no jsonb de `passos`. No MESMO `UPDATE`, `created_by`/`updated_by` são severadas quando
apontam ao titular. **As LINHAS ficam** (ERASE-08) e `encerrada_a_pedido_em`,
`etapa_atual` e `deleted_at` não são tocadas — os três são guards automáticos.

**CR-05, parte 1.** `preferencias_notificacoes.created_by`/`updated_by` severadas na mesma
transação. `usuario_rh_id` não é tocada: ela não aponta para `auth.users`.

**CR-05, parte 2 — a metade que fecha o resíduo indefinidamente.**
`plano_exclusao_titular` ganhou `bloqueadores_deleteuser`, computada de `pg_constraint`
por `confdeltype IN ('a','r')`, com a existência de linha viva medida por consulta
dinâmica escopada — **`user_id` por parâmetro (`USING`), identificadores por `%I`**, numa
função `SECURITY DEFINER`. Dela é subtraída a lista `v_severadas`, declarada
nominalmente no corpo, num lugar só, com o comentário dizendo que ela é o **contrato
entre as duas funções**: quem acrescenta uma severação lá acrescenta aqui, e quem
acrescenta uma FK nova ao schema **não precisa fazer nada** — ela aparece sozinha como
bloqueador e o motor recusa.

**A nullability foi MEDIDA antes de escrever NULL.** As quatro colunas novas são
conferidas no catálogo pelo bloco de auto-verificação, e o apply aborta se alguma for
`NOT NULL` — porque um `UPDATE` que aborta depois do Storage é o Pitfall 1.

**As duas afirmações de tratamento-por-classe de 23503 saíram** do `jsonb` e do
`COMMENT`, substituídas pela descrição do mecanismo. ⚠ A frase removida **não reaparece
em lugar nenhum** — o comentário que narra a correção descreve o que ela dizia sem
reproduzi-la, porque o guard automático a procura no arquivo CRU.

**A asserção de que a enumeração é UTILIZÁVEL** foi escrita como «**pelo menos um**
titular vivo vem com a lista VAZIA», e não «este titular vem vazio». A razão é medida: a
SONDA 6 encontrou em PROD uma conta híbrida candidato+RH cuja `decisao_final.por_usuario`
é um bloqueador **legítimo** — para ela, não-vazio é a resposta CERTA, e exigir vazio de
uma linha arbitrária reprovaria a implementação correta se o sorteio caísse nela. A forma
escrita continua pegando exatamente o defeito que importa (uma enumeração sempre-vermelha
faria o motor recusar TODA execução legítima). Isso também preservou a declaração de
escopo negativo daquele arquivo: ele continua **inteiramente read-only**, sem fixture.

### Task 4 — CR-02 (o passo 1 que converge) e CR-03 (a retomada)

**CR-02 — a conferência mudou de OBJETO, não de rigor.** Ausência na resposta de
`remove()` deixou de ser falha e virou **contador**; depois do laço, o prefixo do titular
é **re-enumerado** e tem de vir vazio. Resíduo reprova com falha atribuída ao passo de
Storage e **sem** carimbo. Três propriedades registradas no comentário: a falha continua
FECHADA; a retomada passa a ser **convergente**; e a listagem logo após a remoção é
fortemente consistente (o metadado dos objetos vive em Postgres), então a re-enumeração
não é aposta em consistência eventual. Os não-devolvidos são persistidos como
**CONTAGEM, nunca como lista** — o caminho embute o `auth.uid()`.

**WR-02 é a precondição de a re-enumeração ser PROVA.** O marcador de pasta passou a
LANÇAR. A mensagem não carrega o prefixo: ele é o `auth.uid()` do titular.

**WR-03.** Os ponteiros são revalidados contra o prefixo do titular e contra travessia
antes de irem ao `remove()`, que roda com a service key e ignora RLS. O descartado vira
**achado registrado** (`fora_do_prefixo`), nunca remoção silenciosa e nunca parada.

**CR-03 — a retomada que não depende de `candidatos.user_id`.** Apenas na ação
`executar`, e apenas quando o titular não resolve por `user_id`, o pedido é reencontrado
pelo `auth_uid` que o passo 0 persistiu no `plano`, comparado com o `sub` do JWT já
verificado. ⚠ **A comparação é refeita em código, não só no filtro da consulta**: um
filtro é otimização de leitura, e a autorização de um caminho que apaga a conta de alguém
não pode depender de o PostgREST ter interpretado o operador do jeito esperado. A
situação terminal entrou na consulta de `executarExclusao` porque a `situacao` vira
`concluido` ANTES do envio do recibo.

**A validação da `acao` subiu para antes da autorização**, e a ordem é deliberada: o
reencontro existe só para `executar`, então a autorização precisa saber qual é a ação.
Efeito colateral favorável — uma ação fora do vocabulário fechado deixou de custar sequer
uma leitura privilegiada.

**CR-05 (consumo).** `montarPlano` lê `bloqueadores_deleteuser` logo depois da RPC do
plano e **antes** da enumeração do bucket; lista não-vazia para a execução com falha
atribuída de classe própria, sem nenhuma mutação e sem carimbo. Chave **ausente** não é
recusa, e o comentário diz por quê: uma versão anterior da função em PROD não devolveria
a chave, e transformar isso em falha travaria o motor inteiro — quem garante que a função
viva é a certa é o pin de `md5(prosrc)` da C3.

**WR-01.** As contagens persistidas passaram a sair do retorno de `anonimizar_candidato`
(`ROW_COUNT` real) e do conjunto efetivamente apagado; as do plano viraram o campo
`previsto`. O bloco `executor` sobrevive ao esvaziamento do plano — uma trilha apagada no
fecho não é trilha. ⚠ O `plano` passou a ser regravado nos carimbos dos passos 1 e 2, para
que a contagem real seja **durável**: sem isso, uma execução retomada perderia o número
que fica como prova.

**WR-08.** A falha ao gravar a `causa` deixa rastro no log redigido, em vez de sumir.

---

## A C2, sem uma linha editada — a verificação que a opção B exigia

A opção B alterava a metade (b), que é um dos 21 guards conferidos como CORRETOS
(G1/G3). O plano estabeleceu que a asserção **C2 do smoke tem de continuar verde SEM
edição**, e que precisar de edição seria condição de PARADA.

**Verificado nos dois níveis:**

1. **Estruturalmente** — `diff` do bloco `$c2$` contra o estado pré-plano: **byte a byte
   idêntico**. Os blocos `$c1$`, `$c3$` e `$c456$` também.
2. **Por leitura do mecanismo** — a C2 chama `anonimizar_candidato(<uuid sintético>,
   true)`, ou seja **dry-run**: nem a forma destrutiva da metade (b) nem a metade (c) são
   alcançadas. No contexto «papel candidato» o dono resolve NULL (uuid inexistente),
   `NULL IS DISTINCT FROM <uid>` é TRUE e as três comparações da forma de leitura
   recusam com `42501`; no contexto «SEM CLAIM NENHUMA» a metade (a) recusa antes de
   tudo. As dez recusas sobrevivem intactas.

O guard foi **estendido**, não afrouxado.

---

## Os 21 guards conferidos como CORRETOS — o que ficou medido

| guard | como está medido agora |
|---|---|
| G1 / G3 (`IS DISTINCT FROM`, nunca `NOT IN`) | guard automático T2 (regex de `NOT IN` de papel) + as duas direções nos blocos `DO` das duas migrations |
| G2 (metade (a) intacta) | guard automático T2 (`v_uid IS NULL` presente nas duas funções) |
| G4 (faixa etária → sentinela, provada por valor) | bloco `DO` da `000006`, intacto (`1991-03-14` → `35-44`) |
| G5 (scrub do histórico como ÚLTIMO statement do par) | guard automático T3 (ordem dos índices dos dois `UPDATE`) |
| G6 (zero toque nas 3 FKs `NO ACTION`) | guard automático T3 (`ALTER TABLE` / `DROP CONSTRAINT` / `DELETE FROM` ausentes) |
| G7 (zero SQL sobre a tabela de objetos do Storage) | guard automático T3 — **e ele mordeu**: ver Deviations |
| G8 / G9 (dry-run no MESMO corpo, `P45DR` próprio) | bloco `DO` intacto + a C7 nova, que trata `P45DR` no caminho real como FALHA |
| G10 (erro de `deleteUser` propagado, no client de serviço) | guard automático T4 + testes `(dd)`, `(dd2)` |
| G11 (releitura do banco antes do passo 3) | teste `(aa)`, intacto |
| G12 / G13 (paginação com teto; falha fechada estrutural) | testes `(n)`, `(n2)`, `(v)`, intactos |
| G14 (divisão do espaço de IDs) | `plano_exclusao_titular` preservada nas duas direções; as chaves novas seguem a mesma divisão |
| G15–G19 (dedupe, inet, sentinelas, `ai_call_logs`, k=5) | blocos `DO` e smoke intactos |
| G20 (zero `--no-verify`) | os 4 commits deste plano passaram pelo hook |
| G21 (as outras quatro RPCs não são expostas a dano) | ACL não foi tocado neste plano |

---

## Deviations from Plan

### 1. [Rule 1 — Bug] O guard automático G7 reprovava o próprio texto que explica o guard

- **Encontrado durante:** Task 3, ao rodar `GUARD T3`.
- **Issue:** o guard procura `storage.objects` no arquivo com os comentários de linha
  removidos — mas as três menções novas estavam dentro de **strings SQL** (a mensagem do
  `RAISE` da metade (c), a de uma asserção do bloco `DO`, e o `COMMENT ON FUNCTION`), que
  o filtro por `^--` não remove. É exatamente a armadilha que o plano nomeia: um guard que
  procura string banida não pode ter o texto reproduzido em cláusula explicativa.
- **Fix:** as três passaram a dizer «a tabela de objetos do Storage», que descreve o mesmo
  fato sem reproduzir o token. Zero perda de informação.
- **Arquivos:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql`
- **Commit:** `11c137f`

### 2. [Rule 1 — Bug] A asserção de catálogo do guard de intenção, escrita ao pé da letra, abortaria um apply CORRETO

- **Encontrado durante:** Task 2, ao escrever a asserção 2b.
- **Issue:** `has_table_privilege('authenticated', ...)` sozinho mede o `GRANT`, não a
  capacidade de escrever. `solicitacoes_dados` tem RLS ligada, uma policy de `SELECT`
  own-row e **zero** caminho de escrita para o candidato; e o `pg_default_acl` do schema
  `public` deste projeto concede privilégios a `authenticated` por default (medido na
  P42-06 para `EXECUTE`). Abortar pelo grant sozinho reprovaria a configuração correta.
- **Fix:** asserção composta (privilégio E (RLS desligada OU policy de `UPDATE` que
  alcance o papel)), mais um `RAISE NOTICE` que registra que a RLS daquela tabela passou a
  ser parte do guard. O pressuposto continua virando asserção — mas a asserção mede a
  propriedade certa.
- **Arquivos:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql`
- **Commit:** `5e6e2c8`

### 3. [Rule 2 — Funcionalidade crítica ausente] O Bloco B do smoke reprovaria a implementação correta

- **Encontrado durante:** Task 2, ao conferir o alcance da metade (c).
- **Issue:** o caminho feliz do Bloco B chama `anonimizar_candidato(v_cand, false)` sobre
  uma fixture **sem pedido de exclusão**. Com a metade (c) no lugar, ele passaria a
  receber `42501` — o gate de PROD reprovaria o motor corrigido. O plano previa esse
  ajuste para a fixture A da migration, mas não para o smoke.
- **Fix:** o Bloco B ganhou a fixture 14 (o pedido em `executando`, janela vencida,
  Storage carimbado), com o comentário registrando que ela é **parte do cenário** e não
  preparação de ambiente. Ela nasce dentro da subtransação revertida.
- **Arquivos:** `supabase/tests/p45_motor_exclusao_smoke.sql`
- **Commit:** `5e6e2c8`

### 4. [Rule 1 — Bug] O CR-06 tinha um segundo sítio: `ja_anonimizado` em `plano_exclusao_titular`

- **Encontrado durante:** Task 3, ao ler o `jsonb_build_object` inteiro.
- **Issue:** a chave `ja_anonimizado` era computada pelo mesmo casamento de padrão sobre
  `candidatos.email`. É a chave que o 45-11 lê **antes** do dry-run para saber qual das
  duas terminações esperar (WR-05) — um `true` falso faria o gate registrar evidência
  ambígua no exato item que ele existe para tornar inequívoco.
- **Fix:** mesmo predicado do tombstone (igualdade + cinto secundário), com o comentário
  registrando por que a chave importa para o portão.
- **Arquivos:** `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql`
- **Commit:** `11c137f`

### 5. [Rule 3 — Bloqueio] O dublê de `solicitacoes_dados` não tinha `.is()`

- **Encontrado durante:** Task 4 (GREEN), nos testes `(ah)` e `(ai)`.
- **Issue:** o reencontro do CR-03 filtra `recibo_enviado_em IS NULL` por `.is()`, e o
  mock (escrito à mão) não expunha o método — os testes falhavam por lacuna do dublê e não
  por defeito do código.
- **Fix:** `.is()` acrescentado à cadeia, com o comentário dizendo por que ele existe.
- **Arquivos:** `supabase/functions/executar-direito-titular/index.test.ts`
- **Commit:** `8a95e6f`

### 6. [Rule 4 — Registrado, NÃO decidido] ERASE-08 continua `Pending` em REQUIREMENTS.md

- **O quê:** o plano lista `ERASE-08` entre os `requirements`. O `REQUIREMENTS.md` o traz
  como `Pending`, e os outros sete como `Complete`.
- **O que foi feito:** os sete permanecem `Complete`; **ERASE-08 NÃO foi marcado**. Este
  plano ESCREVE; a sobrevivência da trilha de decisão é provada pelo smoke, que roda no
  45-11. O próprio `REQUIREMENTS.md` (`:112-118`) avisa que marcar antes da prova é a
  superestimação que o ERASE-07 proíbe. Marcá-lo aqui seria o executor declarando
  verificado o que o portão existe para verificar.
- **Fecha em:** o 45-11, com o smoke verde em PROD.

### Notas de execução, sem desvio

- A Task 1 era `checkpoint:decision` e veio **decidida** no prompt (`opcao-b`, operador,
  2026-08-11). Nenhum checkpoint foi criado.
- O RED das Tasks 2 e 3 vive nos blocos `DO` das próprias migrations e foi verificado
  **por leitura** contra o corpo de então, como o plano determina — não há suíte
  Deno/Vitest que alcance PL/pgSQL, e commitar o estado intermediário significaria
  registrar no histórico uma migration que aborta o próprio apply. A Task 4 fez TDD com
  commits separados (`26e2a26` RED → `8a95e6f` GREEN).

---

## Known Stubs

Nenhum. Nada neste plano foi deixado com valor de fachada: as três lacunas conhecidas
(`DI-45-13-01`, `DI-45-13-02` e o EXPORT-03 sem prova em PROD) estão registradas como
itens diferidos e como lacunas declaradas do portão — não como código pela metade.

---

## Verification

| medição | resultado |
|---|---|
| `deno test supabase/functions/executar-direito-titular/` (comando NU) | **76 passed / 0 failed** (era 63 no 45-12) |
| `npm run test:run` | **1892 / 1892** (baseline preservada) |
| `npm run lint` | **97** erros `tsc` (baseline congelada desde a Phase 42) |
| `npm run check:recibo-exclusao` | exit 0 |
| `GUARD T2` / `GUARD T3` / `GUARD T4` | OK, OK, OK |
| blocos `$c1$` / `$c2$` / `$c3$` / `$c456$` do smoke | byte a byte idênticos ao estado pré-plano |
| marcadores `PENDENTE-45-07` | 8, intactos |
| contador FIXO do smoke | 21 → **23**, com o cabeçalho e o bloco `(z)` bumpados juntos |
| `--no-verify` | **zero** — os 4 commits passaram pelo hook |
| dependências novas | **zero** (npm e deno) |
| apply / deploy / smoke em PROD | **zero** |

---

## Commits

| commit | o que fecha |
|---|---|
| `5e6e2c8` | CR-01 (guard de intenção + opção B), CR-06, WR-04/05/06, C7 do smoke, docblock da `000009` |
| `11c137f` | CR-04, CR-05, o segundo sítio do CR-06, B11 do smoke |
| `26e2a26` | RED da Task 4 — 11 das 13 asserções novas falhando |
| `8a95e6f` | GREEN da Task 4 — CR-02, CR-03, CR-05 (consumo), WR-01/02/03/08, itens diferidos |

---

## O que o 45-11 tem de fazer com isto

1. **RE-RODAR o code review bloqueante** sobre estes arquivos. O veredito `REPROVADO` do
   `45-REVIEW.md` só é substituído por um review novo — nunca por este documento.
2. **Conferir os `md5(prosrc)` contra a tabela do item 1 deste SUMMARY**, e não contra o
   `45-12-SUMMARY.md`.
3. **Verificar a premissa**: se `20260805000005`, `000006` ou `000009` já constar em
   `supabase_migrations.schema_migrations`, PARAR — este plano editou em lugar.
4. **Impersonar por claims antes do dry-run.** `set_config('request.jwt.claims', …)`, o
   mesmo idioma dos blocos `DO`. Uma sessão de SQL Editor sem claims tem `auth.uid()` nulo
   e recebe `42501` da metade (a) — que é o guard funcionando, e seria lido como defeito.
   ⚠ E, para o dry-run, escolher uma linha com `ja_anonimizado = false` no plano (WR-05).
5. **Contar 23 no `(z)` do smoke.**

---

## Self-Check: PASSED

Os 9 arquivos declarados existem no disco e os 4 commits existem no histórico
(`5e6e2c8`, `11c137f`, `26e2a26`, `8a95e6f`), todos passados pelo hook.
