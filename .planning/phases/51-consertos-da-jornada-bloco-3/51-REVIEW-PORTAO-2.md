---
phase: 51-consertos-da-jornada-bloco-3
reviewed: 2026-10-09T19:47:55Z
depth: deep
diff_base: bb629816edb031c324b4140ad6899b00065c8b80
reviewed_head: be4eddce0d890dca4c80a45e18f593035ced868e
scope: review adversarial bloqueante nº 2 do portão da Onda B do JORN-42 (51-16, rodada de conserto do 51-REVIEW-PORTAO-1). Escopo — o diff de código inteiro `bb629816..be4eddce -- . ':!.planning'` (66 arquivos) e o `51-16-PLAN.md`, lido como o programa que escreve em PROD; foco na rodada `1c9a1276..be4eddce` (8 commits — WR-01, 03, 06, 07, 08, 09 e a migration NOVA 20261008000005). Lidos como contexto, fora da lista revisada — 51-REVIEW-PORTAO-1, 51-16-DECISAO-PENDENTE (respostas do operador), CLAUDE.md, p46apply.cjs, efdeploy.cjs (em ad2790a3 e da815714), p50_enumera.cjs, e os corpos VIVOS (só leitura) de rejeitar_candidatura, registrar_decisao e guard_rejeicao_auditada. PROD só leitura (`set transaction read only`, GET da Management API) ou em requisições que abortam. Re-executados — ensaio `--vistas` com 0002..0005 + p51_revisao_rejeicao_smoke (ENSAIO VERDE, vistas=igual, 51b=18/18); os 16 smokes do verify 3 do Task 2 com 0002..0005 prefixadas (16 verdes); `p51_mutacoes.cjs` (controle verde; 36/36 mordem; nada persistiu); `p51_portao.cjs --auto-teste` (67 casos ok); `p51_catalogo_confere.cjs --auto-teste` (11 ok), `--json` sobre o catálogo medido no ensaio (igual, 16 colunas) e `--vivo` (recusa fail-closed, tabela ainda ausente); `lerLedgerProd` real (devolve só 20261008000001, md5 bb0089882edabc1f8301b33cc1c09694 = arquivo); duas sondas do revisor no ensaio que aborta (o D-23 cruzado por `registrar_decisao`; o baseline do WR-07 com uma reabertura «real» vencida); a enumeração do push em seco (sem fetch e sem push). Medido — `rejeitar_candidatura` viva md5(prosrc) 75c0d3d0451a6f8c1e1a4425208daa4a; corpo da 0005 = vivo + bloco (2c) byte a byte (md5 d144131c651246471e56213dd1f1a8bf); comentário novo começa pelo vivo; EFs vivas notificar-candidato v18, exportar-meus-dados v7, executar-direito-titular v13, todas ACTIVE. Nada foi aplicado, publicado ou empurrado. O único commit é este arquivo.
files_reviewed: 67
files_reviewed_list:
  - docs/compliance/__tests__/exportAllowlist.test.ts
  - docs/compliance/catalogo-vivo-44.json
  - docs/compliance/export-allowlist.json
  - docs/compliance/export-scope-rules.yaml
  - docs/compliance/pii-inventory.md
  - docs/compliance/pii-inventory.yaml
  - docs/compliance/recibo-exclusao.json
  - docs/compliance/sql/05-export-allowlist-drift.sql
  - docs/compliance/sql/gen-recibo-exclusao.cjs
  - e2e/explicacao-flow.spec.ts
  - scripts/p50_desfazer.cjs
  - scripts/p51_catalogo_confere.cjs
  - scripts/p51_ensaio.cjs
  - scripts/p51_mutacoes.cjs
  - scripts/p51_portao.cjs
  - src/__tests__/guards/nomes-instrumentos.grep.test.ts
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx
  - src/features/avaliacao-cognitiva/__tests__/ravenService.status.test.ts
  - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
  - src/features/avaliacao-cognitiva/components/RavenCandidatoCard.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.conclusao.test.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/RavenCandidatoCard.test.tsx
  - src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts
  - src/features/avaliacao-cognitiva/services/ravenService.ts
  - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/avaliacao/services/avaliacaoService.ts
  - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
  - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
  - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
  - src/features/explicacao/components/__tests__/SolicitarRevisaoCTA.test.tsx
  - src/features/explicacao/hooks/useExplicacao.ts
  - src/features/explicacao/services/__tests__/explicacaoService.test.ts
  - src/features/explicacao/services/explicacaoService.ts
  - src/features/privacidade/constants/reciboExclusao.generated.ts
  - src/features/privacidade/services/exportacaoService.ts
  - src/features/revisao/components/ContextoKnockoutRevisao.tsx
  - src/features/revisao/components/FilaRevisoesTable.tsx
  - src/features/revisao/components/OrigemRevisaoBadge.tsx
  - src/features/revisao/components/ResponderRevisaoDialog.tsx
  - src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx
  - src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx
  - src/features/revisao/hooks/__tests__/useResponderRevisao.test.ts
  - src/features/revisao/services/__tests__/revisaoService.test.ts
  - src/features/revisao/services/revisaoService.ts
  - supabase/functions/_shared/__tests__/email-templates.test.ts
  - supabase/functions/_shared/email-templates.ts
  - supabase/functions/_shared/exportAllowlist.ts
  - supabase/functions/_shared/reciboExclusao.ts
  - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
  - supabase/functions/notificar-candidato/index.ts
  - supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql
  - supabase/migrations/20261008000002_p51_revisao_rejeicao.sql
  - supabase/migrations/20261008000003_p51_fila_tres_origens.sql
  - supabase/migrations/20261008000004_p51_motor_revisao_rejeicao.sql
  - supabase/migrations/20261008000005_p51_d23_rejeitar_candidatura.sql
  - supabase/tests/p44_export_drift_smoke.sql
  - supabase/tests/p45_motor_exclusao_smoke.sql
  - supabase/tests/p48_prazo_reabertura_smoke.sql
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p51_catalogo_revisao_rejeicao.sql
  - supabase/tests/p51_raven_status_smoke.sql
  - supabase/tests/p51_revisao_rejeicao_smoke.sql
  - .planning/phases/51-consertos-da-jornada-bloco-3/51-16-PLAN.md
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 51: Code Review Report — portão nº 2 da Onda B (JORN-42), rodada de conserto do 51-16

**Reviewed:** 2026-10-09T19:47:55Z
**Depth:** deep
**Files Reviewed:** 67 — os 66 arquivos de código do diff e o `51-16-PLAN.md`
**Status:** issues_found, com 0 crítico

## Summary

Parti da hipótese de que a rodada de conserto tinha trazido blocker novo, como aconteceu duas vezes neste
projeto. Procurei principalmente em três lugares: na migration nova (0005), no portão que passou a ler PROD
(WR-01) e nas provas que foram afrouxadas ou redeclaradas.

**Não achei crítico.** O achado mais sério é o **WR-01** deste review: a trava D-23 que o operador mandou
estender pode ser contornada pela RPC irmã. Provei isso por execução, numa requisição que aborta. Quem teve a
rejeição revertida no registro novo rejeita de novo por `registrar_decisao`, inclusive pela tela de decisão
final quando a rejeição original foi feita naquela etapa. É warning pela mesma régua do WR-09 do review -1
(aquela ausência total também era warning). Mesmo assim, recomendo levar ao operador **antes do apply**: é a
mesma porta de mão única, a 0005 ainda não foi aplicada e o conserto ainda é barato.

### Veredito por WR do 51-REVIEW-PORTAO-1

| WR | Veredito | Evidência |
|---|---|---|
| WR-01 (ordem do D-55 só em prosa) | **resolvido** | O (8) do `p51_portao.cjs` lê o ledger por forma, isto é, toda `<14 dígitos>_p51_*.sql` da árvore do pin. A leitura é só-leitura, no mesmo comando do deploy/push, com md5 do arquivo NO pin, fail-closed. Conjunto vazio recusa. 67/67 no auto-teste. `lerLedgerProd` real devolve `{20261008000001: bb0089882edabc1f8301b33cc1c09694}`, e esse md5 é o do arquivo. Incluir a **0001 já aplicada é certo**: o md5 dela bate hoje, então ela não recusa trabalho correto. E um conserto posterior do arquivo (que o plano já classifica ALHEIO) recusaria com `LEDGER DIVERGE DO PIN`. Ficam dois resíduos, IN-03 e IN-04. |
| WR-02 (e-mail D-09 antes do push validado) | **resolvido** | O Passo 0 (iii) roda a cadeia do push em seco antes do 1º `efdeploy`. O deploy de `notificar-candidato` e o push são encadeados. O «Desfazer» passo 2 diz como voltar a v18 (`efdeploy.cjs` existe em `ad2790a3` e em `da815714` e lê `__dirname/supabase`, então o worktree sobe a fonte do sha). |
| WR-03 (`getExplicacao` lança sem a RPC) | **resolvido** | `rpcAusente` aceita só `PGRST202`/`42883`. Os 84 testes do serviço passam, inclusive `PGRST203`, `42501` e rede, que seguem `DATABASE_ERROR`. Resíduo estreito no IN-02. |
| WR-04 (desfazer sem ordem inversa) | **resolvido** | A ordem cliente → EF → banco está escrita. As versões das EFs são capturadas (Passo 1) e conferidas antes do deploy (Passo 0 (i)). Medido agora: v18/v7/v13, todas ACTIVE, iguais às do plano. Os comentários entram no `CORPOS-ANTES` (IN-12). Resíduo no IN-05. |
| WR-05 (`knockout_rate`) | **não resolvido — aceito pelo operador** | Registrado no plano («Aceito pelo operador, sem conserto»). Nenhum código mudou. |
| WR-06 (`em_espera` silencia o alerta novo) | **resolvido** | `AND d.decisao IN ('aprovado','rejeitado')` no laço 2. O POS-PORTAO da 0003 exige o marcador. A (p) ganhou `dfx` e `dfd` alertado. MC9 e MC10 mordem a (p) nos dois sentidos. A fila e o KPI não foram tocados nesta rodada (o diff da 0003 é só o laço 2, o comentário e o POS), e (l)/(m)/(o) seguem verdes. Caso de borda novo no IN-01. |
| WR-07 (`p48_prazo_reabertura` com diagnóstico falso) | **resolvido** | O baseline é a própria `varrer_prazos_reabertura()` numa subtransação que reverte. **Mordida provada por mim**, no ensaio que aborta com 0002..0005: o controle sai `ENSAIO VERDE`. Com uma reabertura «real» de `revisao_rejeicao` vencida, injetada por `--mutacao`, sai `P48P FAIL (baseline): a propria varredura alertaria AGORA 1 prazo(s) …`, com a causa certa e sem acusar a fixture. |
| WR-08 (catálogo por substring) | **resolvido** | `p51_catalogo_confere.cjs` compara por igualdade de conjunto, nas duas direções, coluna, tipo, nulidade e ordinal. Exige exatamente um acréscimo. 11/11 no auto-teste. Sobre o catálogo medido no ensaio com 0002..0005: igual, 16 colunas. `--vivo` hoje recusa («lista viva vazia»), fail-closed. |
| WR-09 (sem D-23 no caminho novo) | **parcial** | `rejeitar_candidatura` recusa o decisor revertido. A (q) prova isso e ME1/ME3 mordem. Mas `registrar_decisao` não lê `revisao_rejeicao`, e o mesmo decisor re-rejeita por ela (WR-01 deste review, provado). |

### O que conferi da rodada e está certo

- **A 0005 é o corpo vivo byte a byte mais o bloco (2c)**:
  - O `prosrc` vivo tem md5 `75c0d3d0…`, igual ao `c_md5` do PRE.
  - `replace(vivo, âncora, âncora || bloco)` reproduz exatamente o corpo do arquivo (md5 `d144131c…` = `c_md5_novo`). O arquivo sem o bloco é idêntico ao vivo.
  - A âncora ocorre uma única vez.
  - O comentário novo começa pelo comentário vivo (1103 → 1692 caracteres).
  - A ACL viva é `postgres, authenticated, service_role`; os `REVOKE`/`GRANT` da 0005 não a mudam.
  - O PRE recusa sem `revisao_rejeicao` (ordem 0002 → 0005), recusa o próprio md5 novo (não reaplica) e recusa ACL nula ou falta de comentário.
  - O POS fixa md5, propriedades, ACL, `anon`, a ordem helper < D-23 < encerrada, as outras sete funções e a contagem da tabela.
  - O ensaio com as quatro migrations prefixadas na ordem do plano passa o PRE da 0005 (as 0002..0004 não mexem em `rejeitar_candidatura`).
- **A (f) e a ME2 não afrouxaram nada.** A re-rejeição do D-06 em (f) passou de A para B. A (f) julga o direito novo (`{origem: humana_triagem, elegivel: true, pedido: null}`), que não depende do ator, e a (q) continua exigindo `a_rv` = 42501 (D-23) e `b_rv` = aceito. A ME2 (trava sem filtro do decisor) agora morde em (f), antes da (q), porque a (f) é a primeira sonda de «outro RH rejeita depois da reabertura». Ver o IN-06 sobre a população dos atores.
- **Os 16 smokes do verify 3 do Task 2**, com 0002..0005 prefixadas, saíram verdes (`51b=18/18`, `51a=7/7`, `50=13/13` e os 13 legados).
- **Runner de mutações:** `controle verde; 36/36 mutacoes mordem; nada persistiu`. As 36 definidas são as que o plano diz (MA1..6, MB1..14, MC1a..MC10, MD1..2, ME1..3).
- **Varredura pela forma** (padrão do CLAUDE.md) nas linhas acrescentadas desta rodada (smokes e migrations): 8 achados, todos escopo deliberado.
  - 0005 PRE: as 3 colunas exigidas (`<> 3`) e a lista de 7 funções que o POS exige byte-iguais.
  - 0005 POS: a âncora única (`<> 1`) e o «começa por» do comentário (`position … <> 1`).
  - p48 (baseline): `v_real IS DISTINCT FROM 0`, que é o invariante «nenhum alerta real pendente», medido na execução.
  - p51 (p): `<> 2`, o tamanho da própria fixture.
  - Uma linha de comentário que cita o padrão antigo (`v_real <> 0`).
  Nenhum dos achados é fotografia da população viva.
- **O portão continua sem burla nos modos que existiam.** O (8) roda depois de (1)–(7). `apply`/`revisao` nunca leem o ledger, e o auto-teste prova isso com um dublê que lança. O ledger ilegível recusa, inclusive sem `p46apply.cjs` (caso CLI 66).
- **A enumeração do push em seco** (`ls-remote = origin/main = ad2790a3`, `merge-base` ok) hoje classifica os commits da rodada como ALHEIO, porque estão depois do `reviewed_head` do review -1. É o comportamento esperado, e este review muda isso.

## Warnings

### WR-01: o D-23 estendido pode ser contornado por `registrar_decisao` — o decisor revertido no registro novo re-rejeita pela RPC irmã, inclusive pela tela de decisão final

**File:** `supabase/migrations/20261008000005_p51_d23_rejeitar_candidatura.sql:184-190` · `registrar_decisao` viva (bloco «(2b) D-23») · `src/features/decisao/components/DecisaoFinalPage.tsx:276-285`

**Issue:** O operador decidiu que «o decisor revertido (quem fez a rejeição que a revisão reverteu) não
re-rejeita a mesma candidatura. Outro RH pode». A 0005 aplica isso só em `rejeitar_candidatura`. O D-23 de
`registrar_decisao` (vivo) procura a reversão só em `decisao_final`/`decisao_final_historico`, nunca em
`revisao_rejeicao`. Além disso, `registrar_decisao` não confere etapa nem encerramento.

**Provado por execução** (sonda do revisor no `p51_ensaio.cjs` com 0002..0005 prefixadas, requisição
abortada, nada persistiu): A rejeita por `rejeitar_candidatura` → o titular pede → B reverte. A candidatura
fica em `triagem/em_analise` e o pedido em `revertida`, com `rejeitado_por = A`. Então:
- `rejeitar_candidatura` por A → `42501: quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)`;
- `registrar_decisao(rejeitado)` por A → **ACEITO**, `rejeitado/rejeitado`.

Isso não é só um caminho de API. Quando a rejeição original foi feita na etapa `decisao_final` (a fixture
`dfd`/`dfx` da (p) mostra que esse é um caso real), a reabertura volta para `decisao_final`. Ali a
`DecisaoFinalPage` oferece o `RegistrarDecisaoForm`, e o mesmo A registra «rejeitado» pela tela.

A matriz do D-23 fica assim, e é só metade do que o operador pediu:

| Reversão \ RPC da re-rejeição | `registrar_decisao` | `rejeitar_candidatura` |
|---|---|---|
| ciclo `decisao_final` | bloqueado (P48) | **aberto** (achado (a), WR-03) |
| registro novo `revisao_rejeicao` | **aberto (novo, P51)** | bloqueado (0005) |

A (q) e o runner ficam verdes, porque nenhuma sonda chama `registrar_decisao` pelo decisor revertido do
registro novo.

**Severidade:** warning, pela mesma régua do WR-09 do review -1. O titular ainda ganha um direito novo
(D-06), porque a nova rejeição abre o ciclo de `decisao_final`. Não bloqueia `critical: 0`, mas deixa a
decisão escrita do operador sem implementação completa. Levar ao operador antes do apply.

**Fix:** a guarda espelho vai no bloco (2b) de `registrar_decisao`. Para `p_decisao = 'rejeitado'` (o
operador disse «não re-rejeita»; o D-23 da 48 trava qualquer decisão, então a escolha do escopo é dele),
acrescentar:

```sql
OR (p_decisao = 'rejeitado' AND EXISTS (
      SELECT 1 FROM public.revisao_rejeicao rr
       WHERE rr.candidatura_id = p_candidatura_id
         AND rr.veredito = 'revertida'
         AND rr.rejeitado_por = v_uid))
```

- Fazer isso numa migration própria com PRE/POS. O POS da 0005 (`df7`) exige hoje `registrar_decisao`
  byte-igual, então, se a mudança for dobrada na 0005, o `df7` tem de sair da lista.
- Acrescentar à (q) a sonda «A por `registrar_decisao`» (esperado 42501 D-23) e uma mutação que a desligue.

### WR-02: a recusa D-23 de `rejeitar_candidatura` chega ao RH como «Tente novamente» (achado (b) do executor)

**File:** `src/features/triagem/hooks/useRejeitarCandidatura.ts` (`onError`) · `src/features/triagem/services/triagemService.ts:601-621`

**Issue:** `rejeitarCandidatura` embrulha qualquer erro em `DATABASE_ERROR`, e o hook mostra
`'Não foi possível rejeitar o candidato. Tente novamente.'`. A recusa da 0005 é permanente, um 42501 com a
marca `(D-23)`. O RH tenta de novo indefinidamente e não fica sabendo que outra pessoa precisa decidir.

O mesmo defeito já foi consertado do lado de `registrar_decisao` no 48-15
(`decisaoService.ts:173-198`: a marca `D-23` vira bloco próprio, com cópia pt-BR). A 0005 cria a mesma
recusa num caminho cujo cliente não foi atualizado.

**Severidade:** warning. Não bloqueia o apply: o servidor é a autoridade, nada é gravado e o titular não é
afetado. A população hoje é zero (a tabela nasce vazia).

**Fix:** em `rejeitarCandidatura`, separar `error.code === '42501' && error.message.includes('D-23')` num
código próprio (por exemplo `D23`). No hook, mostrar a mesma frase do 48-15 («quem teve a decisão revertida
não registra a nova decisão — peça a outra pessoa da equipe»), sem «Tente novamente». Isso pode ir no push
deste plano (exige um review novo) ou no 51-17.

### WR-03: brecha cruzada pré-existente — reversão no ciclo `decisao_final` seguida de `rejeitar_candidatura` pelo mesmo decisor (achado (a) do executor)

**File:** `supabase/migrations/20261008000005_p51_d23_rejeitar_candidatura.sql:38-42, 184-190`

**Issue:** A rejeita por `registrar_decisao` → B reverte no ciclo `decisao_final` → A re-rejeita por
`rejeitar_candidatura`. A 0005 só lê `revisao_rejeicao` e não recusa. O cabeçalho da 0005 registra isso, e
a fixture `rev` da (j) usa esse caminho. Conferi no corpo vivo: isso existe desde a P48
(`rejeitar_candidatura` nunca leu `decisao_final`). O operador escopou a extensão a partir de
`revisao_rejeicao`.

**Severidade:** warning, pré-existente, fora do escopo decidido. Não bloqueia o apply: a P51 não piora esse
caminho. Junto com o WR-01, deixa o D-23 coberto em 2 das 4 combinações.

**Fix:** levar ao operador junto com o WR-01. A forma simétrica é acrescentar ao (2c) de
`rejeitar_candidatura` o mesmo `EXISTS` do D-23 da 48 (`decisao_final`/`decisao_final_historico` com
`revisao_veredito = 'revertida' AND decisao = 'rejeitado' AND por_usuario = auth.uid()`), com sonda na (q).

## Info

### IN-01: depois do WR-06, um `em_espera` que sobrescreve a nova decisão reacende o alerta de um ciclo já superado

**File:** `supabase/migrations/20261008000003_p51_fila_tres_origens.sql:928-931`

**Issue:** Leitura de código; o upsert de `registrar_decisao` grava `decisao = EXCLUDED.decisao, em = now()`
na linha única. O caminho é este:
1. Rejeição pelo RH na etapa `decisao_final` → revertida no registro novo (T1).
2. B registra `rejeitado` (T2).
3. O titular pede, e A reverte o ciclo de `decisao_final` (T3).
4. C registra `em_espera` (T4). O `rejeitado` de T2 vai para o `decisao_final_historico`, e a linha viva
   passa a dizer `em_espera`.

O `NOT EXISTS` do laço 2 olha só a linha viva, então volta a ser verdadeiro. O RH recebe
`prazo_reabertura_vencido` com o `ciclo` do prazo de T1, de um ciclo já superado. O laço 1 alerta
separadamente o ciclo vivo. Antes do WR-06, qualquer upsert calava esse alerta.

**Fix:** no `NOT EXISTS`, considerar também `decisao_final_historico` com `decisao IN ('aprovado','rejeitado')`
e `em > rr.reaberta_em`. Ou registrar o caso ao lado do IN-08 do review -1.

### IN-02: `rpcAusente` aceita `42883` vindo de DENTRO do corpo da RPC

**File:** `src/features/explicacao/services/explicacaoService.ts:413-416, 469-474`

**Issue:** `42883` (`undefined_function`) também é o erro de uma função ou operador ausente chamado DENTRO de
`estado_revisao_rejeicao`, por exemplo depois de uma migration futura que renomeie um helper. Nesse caso o
cliente cai no fluxo antigo. Para knockout ou rejeição pelo RH, esse fluxo diz que não há revisão a pedir e
esconde um pedido existente, justamente o que o docblock quer evitar. A probabilidade é baixa.

**Fix:** exigir também que `message` cite `estado_revisao_rejeicao`. Ou aceitar `42883` só quando o
`message` casar `function public.estado_revisao_rejeicao(`.

### IN-03: a forma do (8) é mais estreita que o nome que o `p46apply` aceita

**File:** `scripts/p51_portao.cjs` (`RE_MIG_P51`, `conferirLedger`)

**Issue:** `RE_MIG_P51` exige `[a-z0-9_]+`. O `p46apply` aplica qualquer `<14 dígitos>_<nome>.sql`. Uma
migration futura `…_p51_D23-fix.sql` seria aplicada e escriturada, mas ficaria **fora** da vigilância do
deploy/push, sem aviso. É o mesmo modo de falha «iteração que não vê o objeto novo» do CLAUDE.md, em escala
pequena.

**Fix:** recusar no (8) todo `supabase/migrations/*_p51_*` da árvore do pin que não case `RE_MIG_P51`.

### IN-04: «EF antes do push» continua só em prosa

**File:** `51-16-PLAN.md:60, 255-257`

**Issue:** O WR-01 do review -1 sugeria também exigir, no `--modo push`, os três `efdeploy: OK … ACTIVE`. O
conserto cobriu o ledger (a metade com dano: exportação e página quebradas). A ordem EF → cliente segue
como `verification: judgment`. Se ela for invertida, o dano é leve e temporário: e-mail antigo com a página
nova, e a cópia do titular sem a tabela nova até o deploy.

**Fix:** no `--modo push`, ler por GET (só leitura) a `version` das três EFs e exigir que seja maior que a
capturada no `CORPOS-ANTES`.

### IN-05: o passo 1 do «Desfazer» (cliente) não diz qual árvore restaurar nem como enumerar o `revert(51-16)`

**File:** `51-16-PLAN.md:108-110`

**Issue:** O passo 1 fala em «um commit `revert(51-16): …` dos arquivos de cliente publicados … com enumeração
própria», mas não diz o alvo. O alvo correto é `src/` (e `e2e/`) igual ao `origin/main` de antes do push.
Além disso, `revert(51-16)` não casa o `--assunto` do enumerador do plano, então a enumeração «própria»
teria de ser improvisada. O passo é exequível à mão, com checkpoint, mas não é mecânico.

**Fix:** escrever o comando: `git checkout <R-antes> -- src e2e`, o commit e o
`p50_enumera --assunto '^revert\(51-16\): '`, com push por sha.

### IN-06: a sonda «outro RH rejeita» depende de qual papel a população viva dá a B

**File:** `supabase/tests/p51_revisao_rejeicao_smoke.sql` (baseline de atores; (f) `f_rerej`; (q) `b_rv`)

**Issue:** Em PROD hoje, `papeis=a:rh/b:administrador`. As duas sondas de «outro RH aceito» (`f_rerej` e
`b_rv`) correm com B **administrador**. Uma mutação que travasse todo usuário de papel `rh` com pedido
revertido na candidatura (sem o filtro do decisor, mas com `AND v_role = 'rh'`) não morderia nada. Um
colega `rh` legítimo ficaria recusado em PROD com o portão verde. É o caso «população que mente» da memória
do projeto.

**Fix:** na (q), escolher B com papel `rh` (ou acrescentar um C `rh` ativo distinto de A; ausência de ator REPROVA, nunca pula), e acrescentar uma mutação «trava sem filtro do decisor, só `rh`».

---

_Reviewed: 2026-10-09T19:47:55Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
