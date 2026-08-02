# Consentimento de marketing — escopo honesto do que foi construído

**Data:** 2026-08-01
**Fase:** 43 · Plano 43-05 · Requirements CONSENT-03, CONSENT-04
**Critério de sucesso relacionado:** SC#2 — *"a revogação de marketing tem de ser provada por
envio real bloqueado, não por leitura de flag"*
**Artefatos:** `supabase/migrations/20260801000003_p43_guard_marketing.sql` ·
`supabase/tests/p43_guard_marketing_smoke.sql`

> Este documento existe porque o limite de uma prova é parte da prova. Um controle cujo alcance
> não está escrito é lido, seis meses depois, como se alcançasse tudo.

---

## 1. O que existe hoje, medido

**Não existe caminho de envio de marketing neste sistema.** A afirmação não é "ninguém escreveu
ainda" — é **estrutural**, e sai do DDL:

`public.notificacoes_enviadas` — o ledger por onde todo despacho de notificação passa — exige
**`candidatura_id NOT NULL`** e **`candidato_id NOT NULL`**
(`supabase/migrations/20260721000001_notificacoes_enviadas.sql:78-80`). A infraestrutura de envio é,
portanto, **candidatura-escopada por construção**: toda notificação que o sistema sabe despachar
está presa a uma candidatura específica.

Um aviso de nova vaga **não tem candidatura a que se prender**. A pessoa ainda não se candidatou —
esse é o ponto do aviso. Não é que falte um `evento`; é que a forma da tabela não acomoda a coisa.

Os eventos que hoje chegam ao **titular** são cinco, e os cinco são **transacionais**, sob o
**Art. 7º, V** da LGPD (execução de procedimento preliminar relacionado a contrato):

| Evento | Destinatário | Classe | Base legal |
|---|---|---|---|
| `confirmacao` | candidato | transacional | Art. 7º V |
| `avanco` | candidato | transacional | Art. 7º V |
| `convite` | candidato | transacional | Art. 7º V |
| `decisao` | candidato | transacional | Art. 7º V |
| `revisao_respondida` | candidato | transacional | Art. 7º V (resposta a exercício do Art. 20) |
| `revisao_solicitada` | **RH** | interno | não é comunicação ao titular |

Nenhum é marketing. Nenhum tem opt-out, e essa é uma decisão travada no M7 que esta fase preserva
explicitamente.

---

## 2. O que o SC#2 prova, então

O guard entregue no plano 43-05 prova, **por execução e não por leitura**:

1. **Que uma tentativa de REGISTRAR um envio de classe marketing sem consentimento é RECUSADA
   pelo banco.** Não é um ramo de código que retorna cedo — é uma escrita que o Postgres se nega a
   aceitar, com `SQLSTATE P0003`. A asserção (a) do smoke faz o `INSERT` de verdade e exige a
   recusa.
2. **Que a recusa acontece no ponto de estrangulamento por onde TODO envio passa.** O guard é um
   `BEFORE INSERT` em `notificacoes_enviadas`, não um `if` numa Edge Function. Isso importa por dois
   motivos mecânicos:
   - `service_role` **bypassa RLS mas NÃO bypassa trigger**, e o claim da Edge Function roda com
     `service_role`. Uma policy de RLS não o alcançaria; o trigger alcança.
   - um `if` na Edge Function é **contornável pelo próximo emissor**, e múltiplos emissores é o
     estado *normal* deste sistema: a Phase 39 precisou de DROP-and-CREATE de triggers no mesmo
     phase porque havia 3+ triggers dormentes e um disparo por env-var em outra função.
3. **Que a recusa acontece ANTES de qualquer contato com o provedor.** O `INSERT` no ledger é o
   **CLAIM**, e o claim precede o `fetch` para `api.resend.com/emails` no fluxo da EF. A asserção
   (i) do smoke transforma isso em medição: zero linha nova em `net._http_response`. Obrigatória
   porque `NOTIFICACOES_MODO` é `producao` em PROD e é secret de **projeto**, não de ambiente.
4. **Que é fail-closed em quatro caminhos** — consentimento ausente (candidato sem linha em
   `autorizacoes`), coluna `NULL`, valor `false`, e **evento sem classe registrada**. O último é o
   que fecha a porta dos fundos: um evento novo não classificado é exatamente por onde um envio de
   marketing entraria sem ser visto.
5. **Que o guard DISCRIMINA em vez de bloquear por construção.** A asserção (f) grava
   `autorizacao_marketing_vagas = true` numa subtransação e prova que o **mesmo** `INSERT` passa a
   ser aceito. Sem ela, uma função que devolvesse `false` incondicionalmente passaria em verde e o
   consentimento continuaria sem consequência — só um "não" universal.
6. **Que os cinco eventos transacionais não regrediram.** Asserção (c): os seis eventos vivos
   continuam sendo aceitos, por inserção real.

---

## 3. O que o SC#2 NÃO prova — e por que isso é honesto

**Não prova que um e-mail de marketing deixou de sair, porque nenhum jamais saiu.**

O valor de evento `divulgacao_vagas`, acrescentado ao CHECK de `notificacoes_enviadas.evento` nesta
fase, é **vocabulário reservado com guard vivo — não é suporte a marketing**:

- **nenhum trigger o emite.** Zero emissores, por desenho.
- **a Edge Function `notificar-candidato` o rejeitaria** com `400 VALIDATION`: `EVENTOS_VALIDOS` é
  derivado de `EVENTO_MAP` (`supabase/functions/notificar-candidato/helpers.ts:58`), e
  `divulgacao_vagas` não está em `EVENTO_MAP`.
- **o precedente é exato e verificado:** `revisao_solicitada` está no CHECK do ledger desde
  `20260730000004` e **não** está em `EventoLedger`/`EVENTO_MAP`. O vocabulário do banco ser maior
  que o do código já é o estado vivo deste sistema, não uma invenção deste plano.

Ele existe por uma razão só: **para que a recusa seja PROVÁVEL por escrita real.** Sem um valor de
classe marketing no vocabulário, a única forma de "provar" o opt-out seria ler uma flag e afirmar
que ela seria respeitada — a promessa órfã de novo, na fase que existe para matá-la.

O que foi construído, então, é um **cerco antes do gado**. Quando um canal de divulgação de vagas
for construído — outro milestone, e depende de infraestrutura que hoje não existe, porque a tabela
de envio não acomoda uma notificação sem candidatura — ele **nasce dentro de um cerco que já está
de pé**, em vez de ganhar o cerco depois de já estar enviando.

A alternativa realista era pior nos dois sentidos: construir um canal de marketing inteiro fora de
escopo, ou entregar um `if (!consent) return` que nada exercita.

---

## 4. BD-5, declarado em voz alta

**Decisão do operador, 2026-08-01, travada:**

> `autorizacao_marketing_vagas` nasce **NULL** para toda a base histórica, e **NULL vale NÃO
> AUTORIZADO**.

### Consequência, sem rodeio

> **Depois desta fase, ZERO candidato já cadastrado está autorizado a receber divulgação de vagas.**
>
> **21 candidatos vivos medidos em 2026-08-01. Nenhum com consentimento de marketing.**

### Isto não é regressão — é a correção

Ninguém nunca consentiu marketing separadamente, **porque o consentimento separado não existia**. O
que existia era `autorizacao_comunicacao` com `.default(true)`: uma caixa pré-marcada que fabricava
o consentimento por inferência.

Herdar o valor — `UPDATE autorizacoes SET autorizacao_marketing_vagas = autorizacao_comunicacao` —
seria **reconstruir consentimento por inferência**, por outro caminho. É exatamente o que o
`.default(true)` fazia, e exatamente o que esta fase existe para eliminar. Um back-fill aqui seria
fabricar prova, do mesmo modo que o back-fill dos 4 candidatos sem linha em `autorizacoes` (BD-4)
seria — e pela mesma razão foi recusado.

### Reconquistar essa base exige campanha de re-opt-in

Que é **feature de outro milestone**, e que depende do canal de divulgação que ainda não existe.

### Registrado aqui para que ninguém descubra por métrica caindo

Se uma métrica de alcance de divulgação de vagas cair a zero após esta fase, **a explicação está
neste documento e no `COMMENT ON FUNCTION public.pode_receber_marketing`** — que vive dentro do
banco, não apenas em prosa de planejamento, justamente para que quem for investigar tropece nela.

---

## 5. Regra do rodapé de e-mail

O rodapé transacional vivo **permanece verbatim, sem linha de descadastro**: o transacional não tem
opt-out (Art. 7º V, decisão travada no M7), e oferecer descadastro num e-mail que não o tem é uma
promessa órfã de superfície. Nenhum rodapé pode oferecer descadastro **antes** de
`/candidato/privacidade` estar viva — um link de opt-out que não leva a lugar nenhum é pior que
nenhum link.

---

## 6. Estado de aplicação

**✅ APLICADO EM PRODUÇÃO em 2026-08-02, pelo checkpoint 43-07.**

> Esta seção dizia o contrário até o apply. A frase anterior — *"NADA FOI APLICADO EM PRODUÇÃO…
> o guard não existe em PROD"* — era verdadeira quando o plano 43-05 a escreveu e **passou a ser
> falsa no instante do apply**. Um documento de compliance que afirma o estado do sistema tem de
> ser atualizado junto com o estado, senão ele vira a fonte errada que alguém vai citar.

Estado vivo, medido:

| Objeto | Estado |
|---|---|
| `20260801000003_p43_guard_marketing.sql` | aplicada · `md5` do ledger = `b73cd76c821931259e4776c33c29e70c`, idêntico ao arquivo |
| `public.classe_evento_notificacao` | existe · 7 linhas · RLS ligada com ZERO policies |
| `notificacoes_enviadas_evento_check` | **7 valores** (os 6 vivos preservados + `divulgacao_vagas`) |
| `trg_guard_marketing_consentimento` | vivo · `BEFORE INSERT` |
| `p43_guard_marketing_smoke.sql` | executado contra PROD · **9/9 PASS** |

A recusa está provada por **inserção real** (`P0003`), não por leitura de flag: fail-closed nos três
ramos (sem linha · coluna NULL · classe desconhecida), os 6 eventos vivos seguem aceitos, e o
caminho positivo discrimina. `net._http_response` não ganhou nenhuma linha — a recusa é anterior ao
`fetch`, então nada alcançou o provedor.

### ⚠ Duas fronteiras que este documento NÃO pode deixar subentendidas

**O guard é `BEFORE INSERT`, e só.** Um `UPDATE` que trocasse `evento` numa linha já `pendente`
não passa por ele, e a varredura de retry (`varrer_retry_notificacoes`, a cada 15 min) despacharia
a linha. Hoje nenhum caminho de código faz esse `UPDATE`, mas a afirmação de que o guard "alcança
todo caminho presente e futuro" é mais forte do que o que o trigger de fato cobre. Rastreado em
`.planning/todos/pending/43-guard-marketing-so-before-insert.md`.

**O bundle do cliente não foi publicado.** As telas existem em código e em teste; nenhum plano da
Phase 43 as publica.
