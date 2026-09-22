---
phase: 49-consertos-da-jornada-bloco-2
plan: 03
subsystem: edge-functions
tags: [notificacoes, resend, candidatura-encerrada, predicado-canonico, deno, tdd, lgpd, jorn-25]
status: complete

# Dependency graph
requires:
  - phase: 48-consertos-da-jornada-bloco-1
    plan: "01"
    provides: "`public.candidatura_encerrada(etapa, status)` viva em PROD — a allowlist que esta implementação TS espelha (conferida por `pg_get_functiondef` em 2026-09-22, sem delta)"
  - phase: 48-consertos-da-jornada-bloco-1
    plan: "02"
    provides: "`src/lib/candidatura/candidaturaEncerrada.ts` e a sua tabela-verdade vitest — o arquivo que este plano transforma em reexport, e o teste que passa a provar o caminho do reexport"
provides:
  - "`supabase/functions/_shared/candidaturaEncerrada.ts` — a ÚNICA implementação TS do predicado canônico (`ETAPAS_TERMINAIS`, `STATUS_TERMINAIS`, `candidaturaEncerrada`), ZERO IMPORTS, consumida por Edge Functions (import direto) e pelo front (reexport)"
  - "`skipped: \"encerrada\"` na EF `notificar-candidato` para o evento `avanco` — a segunda camada do D-35, viva em PROD (version=17)"
  - "a tabela-verdade do predicado provada nos DOIS runtimes sobre a MESMA implementação (6 testes Deno + 14 vitest pelo reexport)"
affects: [49-06, 49-08]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 6002
  tasks: 2
  commits: 3
  plan_head_before: b01f1f884c4448c230ca3d8c1f9bddb58d185511
  # `commits: 3` MEDIDO por `git rev-list --count b01f1f88..HEAD` no instante da escrita deste
  # SUMMARY (edab7dfd, 6d5b8591, 0bde91ba) — todos de PRODUÇÃO. Re-medir DEPOIS do commit de
  # metadado deste plano dá 4, por construção. A fronteira é esta; produção é 3.
  # `tokens: 6002` = 24 010 octetos de `git diff b01f1f88..HEAD -- supabase src` ÷ 4.
  estimate_tokens_do_plano: 60000
  # O plano estimou 60 000 e o realizado foi 6 002 — 10× ABAIXO, registrado sem arredondar.
  # A razão é medível: o Passo 2 foi um MOVE (o corpo do predicado saiu inteiro do arquivo do
  # front, só o docblock cresceu) e a guarda da EF são 6 linhas de código. O peso do plano
  # esteve em LEITURA (o index.ts de 622 linhas, o test de 1270, o efdeploy, a função SQL viva)
  # e em MEDIÇÃO em PROD — nada disso aparece no diff. `confidence: low` era honesto.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "módulo `_shared` SEM IMPORTS como fonte única para os DOIS runtimes: o Deno importa `../_shared/x.ts` (com extensão), o front reexporta `../../../supabase/functions/_shared/x` (sem extensão, como `exportacaoService.ts:61` já fazia com o EXPORT_ALLOWLIST)"
    - "a tabela-verdade duplicada como DADO (`TABELA_VERDADE`, mesma ordem nos dois arquivos de teste) em vez de duplicada como implementação — um caso acrescentado de um lado e esquecido do outro fica visível na diferença entre os dois arquivos"
    - "guarda de efeito externo irreversível ANTES do claim de idempotência: e-mail recusado por MÉRITO não é e-mail que FALHOU, e não deve virar linha `pendente` para a varredura re-tentar"
    - "portão de forma que confunde prosa com código conserta-se na PROSA, nunca afrouxando o padrão (ver Deviations)"

key-files:
  created:
    - supabase/functions/_shared/candidaturaEncerrada.ts
    - supabase/functions/_shared/__tests__/candidaturaEncerrada.test.ts
  modified:
    - src/lib/candidatura/candidaturaEncerrada.ts
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts

key-decisions:
  - "O lado Deno NÃO ganhou cópia própria do predicado nem passou a perguntar ao banco: a implementação TS passou a ser UMA, em `_shared`, e o front a reexporta (D-21). Cópia diverge em silêncio; `rpc('candidatura_encerrada')` seria uma ida ao banco por e-mail — e por candidatura no comparativo — para reavaliar dois campos que o chamador já tem em mãos."
  - "A guarda nova é SÓ para `avanco`. `decisao` de candidatura em estado terminal é o caso NORMAL — é o e-mail que ANUNCIA o desfecho (CR-01 da P39 pina isso). Alargar a guarda para `decisao` calaria justamente a notificação a que a pessoa tem direito."
  - "A guarda fica DEPOIS do bloco 3a (knockout), não antes: cada uma nomeia o seu próprio motivo no log e no ledger, e inverter a ordem renomearia `skipped:\"knockout\"` para `\"encerrada\"` sem ninguém pedir. Há teste de regressão fixando essa ordem."
  - "Evidência de RED registrada à mão: `gsd-tools check tdd-red-evidence` NÃO consegue classificar um run Deno (ver Findings). Nenhuma linha de contador foi sintetizada para fazê-lo devolver OK."

requirements-completed: [JORN-25]

# Coverage (#1602)
coverage:
  - deliverable: "Uma implementação TS só do predicado canônico, em `_shared`, com a allowlist idêntica à da SQL viva"
    human_judgment: false
    verification:
      - kind: test
        ref: "supabase/functions/_shared/__tests__/candidaturaEncerrada.test.ts#49-03 — candidaturaEncerrada(etapa, status): a tabela-verdade inteira, sob Deno"
        status: pass
      - kind: test
        ref: "src/lib/candidatura/__tests__/candidaturaEncerrada.test.ts (14 casos, via reexport)"
        status: pass
      - kind: command
        ref: "node -e '… /^\\s*import\\s/ no _shared · reexport no front · nenhum `new Set(` de allowlist no front' → OK: uma fonte so"
        status: pass
      - kind: command
        ref: "node p46apply.cjs sql \"SET TRANSACTION READ ONLY; select pg_get_functiondef('public.candidatura_encerrada(...)'::regprocedure)\" — allowlist viva idêntica"
        status: pass
  - deliverable: "A EF `notificar-candidato` recusa `avanco` para candidatura encerrada antes do claim, sem chamar o Resend"
    human_judgment: false
    verification:
      - kind: test
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts#49-03 — avanco para KNOCKOUT (inscricao/rejeitado) → skipped:encerrada, zero fetch, zero claim"
        status: pass
      - kind: test
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts#49-03 — avanco para LEGADO (triagem/finalizado) → skipped:encerrada, zero fetch, zero claim"
        status: pass
      - kind: test
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts#49-03 — BORDA: avanco de candidatura EM ANDAMENTO continua sendo enviado"
        status: pass
      - kind: test
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts#49-03 — REGRESSÃO: confirmacao de knockout continua skipped:knockout"
        status: pass
  - deliverable: "A guarda está VIVA em produção (não só no disco)"
    human_judgment: false
    verification:
      - kind: command
        ref: "node efdeploy.cjs notificar-candidato → efdeploy: OK · version=17 · status=ACTIVE · verify_jwt=false"
        status: pass
      - kind: command
        ref: "GET /v1/projects/isljnozzlvckrgjjbjwp/functions/notificar-candidato/body | grep -a 'evento === \"avanco\" && candidaturaEncerrada' → 1"
        status: pass
      - kind: command
        ref: "git log --oneline origin/main..HEAD → vazio (os dois canais, EF e Vercel, em dia)"
        status: pass
  - deliverable: "Nenhum e-mail a candidato real foi disparado por este plano (D-54)"
    human_judgment: true
    rationale: "Provado por CONSTRUÇÃO e não por asserção: os testes injetam `fetchImpl` mockado (nenhum vai à rede) e o deploy não reprocessa ledger. Nenhum comando foi rodado contra a EF viva além do `GET .../body` (leitura do bundle). Mas «nenhum e-mail saiu» é uma afirmação sobre o mundo, não sobre o repositório — fica como juízo."

# Metrics
duration: 22 min
completed: 2026-09-22
tasks: 2
files: 5
---

# Phase 49 Plano 03: O e-mail de «avanço» para candidatura encerrada Summary

A EF `notificar-candidato` passou a recusar o evento `avanco` para candidatura encerrada — antes do
claim do ledger e sem tocar no Resend — usando o MESMO predicado que o banco e as telas, que deixou
de existir em duas cópias TS e passou a morar em `supabase/functions/_shared/candidaturaEncerrada.ts`.

## O que estava errado

Medido no kickoff da Phase 49 e re-medido aqui: o knockout preserva `etapa_atual = 'inscricao'` com
`status = 'rejeitado'` **por desenho**. Nesse estado, o RH clica «Avançar», `avancar_etapa()` aceita
(não tem trava de encerrada), o histórico é gravado e o `trg_notif_transicao` despacha o evento
`avanco`. **O e-mail que saía dizia a uma pessoa já eliminada que ela tinha avançado de etapa.**

A guarda que já existia na EF (`index.ts` bloco 3a) cobria **só** `evento === "confirmacao"`.

E o lado Deno não tinha predicado nenhum: a varredura do kickoff mediu zero espelho TS em
`supabase/functions/` — os `notificar-*` só citavam o *nome do evento* `candidatura_encerrada_a_pedido`,
que é outra coisa.

## Accomplishments

1. **O predicado passou a ter UMA implementação TS** (`_shared/candidaturaEncerrada.ts`, ZERO IMPORTS
   por contrato — o mesmo de `email-config.ts:12-17`). `src/lib/candidatura/candidaturaEncerrada.ts`
   virou reexport dos três nomes; **nenhum dos 4 chamadores do front mudou de import**.

2. **A tabela-verdade é provada nos dois runtimes sobre a MESMA implementação**: 6 testes Deno novos
   (a tabela inteira, `aprovado_proxima`, etapa terminal sem status, valor desconhecido, os conjuntos
   exportados, e retirada-a-pedido-não-é-encerrada) + os 14 do vitest, agora **através do reexport** —
   que é o caminho que o front usa de verdade.

3. **A guarda de `avanco` na EF**, irmã da do knockout, no mesmo lugar e pela mesma razão: a EF é a
   única a ver o estado **depois do COMMIT**. Devolve `{ ok: true, skipped: "encerrada" }` com zero
   chamadas ao Resend e zero upserts no ledger.

4. **Deployada e provada viva**: `version=17`, `status=ACTIVE`, `verify_jwt=false`, e o call-site exato
   (`evento === "avanco" && candidaturaEncerrada(candidatura.etapa_atual, candidatura.status)`) lido de
   volta do bundle servido pela Management API.

## Passo 1 (D-50) — delta da varredura: ZERO

Re-rodados os padrões P1/P2 da C1 do `49-VARREDURA-KICKOFF.md` e o scan do Deno:

| Padrão | Medido agora | Delta vs. kickoff |
|---|---|---|
| (P1) escritores de etapa/status no cliente | 9 ocorrências (`HubCandidatoRH:249`, `triagemService:424`, `useCandidaturas:334,428`, `candidaturasService:417`, `KanbanBoard:316`, `UpdateStatusModal:162`, `ComparativoCandidatosPage:120`) | nenhum |
| (P2) quem usa `candidaturaEncerrada(` no front | `HubCandidatoRH:155`, `DashboardCandidatoPage:33,406,450,499`, `CandidatosRHPage:266` + a definição | nenhum |
| `candidatura_encerrada\|candidaturaEncerrada` em `supabase/functions` | só o **nome do evento** `candidatura_encerrada_a_pedido` nos `notificar-*` | nenhum — **não havia espelho TS no Deno**, como o kickoff mediu |

**Conferência do corpo VIVO da SQL (D-49):** `pg_get_functiondef` lido em PROD em 2026-09-22 devolve
`COALESCE(p_etapa IN ('aprovado','rejeitado'), false) OR COALESCE(p_status IN ('rejeitado','finalizado'), false)`
— **allowlist idêntica** à da migration e à do TS. Nada a parar.

## Deploy (D-52) — a lista de arquivos, conferida À MÃO

O cabeçalho do `efdeploy.cjs` afirma que o script «RECUSA subir se [o fechamento] divergir da lista
esperada». **Essa checagem não existe no código** (`main()` só imprime a lista) — daí a conferência
manual, que é o que o D-52 manda:

| Arquivo | Antes (5) | Depois (6) |
|---|---|---|
| `functions/_shared/candidaturaEncerrada.ts` | — | **5 482 bytes (novo)** |
| `functions/_shared/email-config.ts` | 10 651 | 10 651 |
| `functions/_shared/email-templates.ts` | 23 611 | 23 611 |
| `functions/_shared/ics.ts` | 5 397 | 5 397 |
| `functions/notificar-candidato/helpers.ts` | 12 040 | 12 040 |
| `functions/notificar-candidato/index.ts` | 26 910 | 29 107 |
| `functions/deno.json` | import map | import map |

**Exatamente um arquivo MAIS, nenhum a menos.** E uma verificação que o plano pedia implicitamente: o
bundle **não** carrega `ai-client.ts` / `audit-logger.ts` / `ai-error-codes.ts` — confirmado por grep no
corpo vivo (o único acerto é uma menção em *prosa* dentro de um comentário). **Este deploy não publicou
o contrato novo do 49-02**, que segue no disco esperando o deploy das EFs que o consomem.

## Verification results

| Verify | Resultado |
|---|---|
| `deno test --allow-all supabase/functions/_shared/__tests__/candidaturaEncerrada.test.ts` | **6 passed, 0 failed** |
| `npx vitest run src/lib/candidatura` | **14 passed** (1 arquivo) |
| forma: `_shared` sem import · front reexporta · front sem allowlist própria | **OK: uma fonte so** |
| `npm run -s lint` (tsc --noEmit) | **exit 2, 90 `error TS`** — teto do plano é 90, e a contagem **não subiu** |
| `deno test --allow-all supabase/functions/notificar-candidato/` | **64 passed, 0 failed** |
| `node efdeploy.cjs notificar-candidato --dry-run` | lista `functions/_shared/candidaturaEncerrada.ts` |
| `node efdeploy.cjs notificar-candidato` | `OK · version=17 · status=ACTIVE · verify_jwt=false` |
| `GET .../functions/notificar-candidato/body \| grep -a candidaturaEncerrada` | **13** (e o call-site exato da guarda: **1**) |
| `git log --oneline origin/main..HEAD` | **vazio** |

**Regressão, além do pedido pelo plano:** a suíte vitest inteira (**205 arquivos / 2068 testes, 0 falhas**)
e a suíte Deno inteira (**619 passed, 0 failed**) — porque o reexport muda um módulo importado por 4
telas, e uma resolução quebrada não apareceria no subconjunto.

## TDD Gate Compliance

`workflow.tdd_mode` é **false**, então o gate não bloqueia. A disciplina foi seguida e os commits estão
na ordem:

| Gate | Commit | Estado |
|---|---|---|
| RED | `6d5b8591` `test(49-03): …` | ✓ os 2 testes alvo reprovam em `AssertionError` |
| GREEN | `0bde91ba` `feat(49-03): …` | ✓ 64/64 |
| REFACTOR | — | não houve: a guarda são 6 linhas reusando o predicado canônico; não há o que limpar |

**RED medido** (`--reporter=tap`, artefato guardado): **64 testes descobertos, 62 passam, 2 reprovam** —
e os 2 são exatamente os alvo, em `AssertionError: Values are not equal` (`skipped` saía `undefined`
porque o e-mail **saía**). Não foi erro de carregamento de módulo, não foi descoberta vazia: **não é
INVALID_RED (#3770)**.

⚠ Os outros 2 casos do `<behavior>` (a BORDA «em andamento» e a REGRESSÃO do `confirmacao`) **já
passavam no RED**, por construção — eles não descrevem comportamento novo, descrevem o que a guarda
**não pode** quebrar. Registrado para não parecer que 4 asserções novas ficaram verdes de graça.

## Findings

**`gsd-tools check tdd-red-evidence` não consegue classificar um run Deno — e nenhuma evidência foi
sintetizada para contornar isso.** O checker chama `parseNodeTestSummary`, que casa exatamente
`/^# tests (\d+)/m`, `/^# pass (\d+)/m` e `/^# fail (\d+)/m` — os contadores do `node:test`. Deno tem
reporter TAP (`--reporter=tap`), mas ele emite `1..64` e `not ok N - <nome>` **sem** essas linhas `#`.
Resultado: `INVALID_RED (zero_tests_discovered)` sobre um run que descobriu 64 testes.

Escrever aquelas três linhas à mão dentro do campo `output` faria o checker devolver `RED_EVIDENCE_OK`
— e **seria forjar o artefato que o checker existe para ler**, transformando uma verificação de máquina
num auto-relato fantasiado de verificação. Não foi feito. A evidência fica registrada aqui, com o run
TAP cru guardado, e o veredito honesto é: **o gate é inaplicável neste runtime**, não «aprovado».

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] O `<verify>` do plano reprovou a PRÓPRIA prosa do arquivo que ele vigia**

- **Found during:** Task 1
- **Issue:** o padrão `new Set\(\[` do `<verify>` procura uma cópia da allowlist no arquivo do front.
  O docblock que eu escrevi **avisava** «não reescrever a allowlist aqui» citando a forma proibida por
  extenso — e o portão, que lê o arquivo inteiro e não sabe distinguir prosa de código, mordeu a própria
  advertência. `Error: o front ainda tem uma copia propria da allowlist`, com o arquivo correto.
- **Fix:** reescrita a **PROSA**, nunca o padrão. A advertência descreve a forma sem a escrever, e o
  comentário agora registra *por que* está redigida assim. Um portão que confunde prosa com código
  conserta-se no texto; afrouxar o padrão (`^\s*export const .* = new Set`, por exemplo) o tornaria
  incapaz de pegar a cópia real que ele existe para pegar.
- **Files modified:** `src/lib/candidatura/candidaturaEncerrada.ts`
- **Verification:** o `<verify>` voltou a dizer `OK: uma fonte so`, **e continua mordendo** — foi ele
  quem pegou a primeira redação, o que é a prova de mordida desta rodada.
- **Commit:** `edab7dfd`

**2. [Rule 3 - Blocker] A minha invocação do `deno test` desligou o `exclude` do `deno.json`**

- **Found during:** verificação de regressão (fora do pedido do plano)
- **Issue:** rodei a suíte Deno inteira com `--ignore=supabase/functions/resend-webhook` (para excluir a
  falha pré-existente do `npm:svix`) e apareceram 3 erros `TS2307`/`TS7006`/`TS7053` em
  `_shared/__tests__/strict-schema.test.ts` — um teste **vitest** que mora na árvore Deno e importa
  `vitest`. Por um instante pareceu regressão do arquivo novo que eu pus em `_shared/__tests__/`.
- **Fix:** nenhuma no repositório — `supabase/functions/deno.json` **já** tem
  `"exclude": ["_shared/__tests__/strict-schema.test.ts"]`; passar `--ignore` na linha de comando
  substitui esse `exclude` em vez de somar a ele. Re-rodado com as duas exclusões: **619 passed,
  0 failed**.
- **Verification:** `git log` do `strict-schema.test.ts` aponta para `1ea5bc3e` (Phase 08) — pré-existente
  por 40 fases, e invisível no CI justamente por causa do `exclude`.
- **Commit:** nenhum (não houve mudança de arquivo).

**Total deviations:** 2 auto-corrigidas (1 × Rule 1, 1 × Rule 3). **Impact:** nenhum no comportamento
entregue. As duas são da mesma família e vale nomeá-la: **em ambas, o que reprovou foi o INSTRUMENTO,
não o trabalho** — o portão leu um comentário como código, e a minha flag desligou um `exclude` de
config. O reflexo errado nos dois casos seria mexer no código medido.

### Fora de escopo, registrado e NÃO tocado

`resend-webhook.test.ts` continua abortando ao resolver `npm:svix@1.99.1` (ausente do `node_modules`).
Pré-existente e sem relação com este plano — excluído das rodadas, como o prompt instruiu. Não
«consertado» (Scope Boundary).

## Observação para o 49-06 (a trava do banco)

A guarda nova roda no caminho NORMAL, antes do claim — então um `avanco` para candidatura encerrada
**nunca cria linha no ledger**, e por isso nenhum laço de retry pode nascer dela. Uma linha *anterior*
a este deploy, já `pendente`, seria re-lida pela varredura da P41 e re-recusada aqui **sem** avançar
`tentativas` nem `proxima_tentativa_em`: o desfecho é barato (zero Resend, zero custo) e é o desfecho
CORRETO (não enviar), mas é uma re-checagem que não converge sozinha. Não alarguei o escopo para tratá-la
— o `<behavior>` do plano não a cobre, e a trava do `avancar_etapa` do 49-06 remove a origem. Fica
nomeado aqui para quem for mexer no branch de retry.

## Known Stubs

Nenhum. Varridos os 5 arquivos por `TODO|FIXME|placeholder|coming soon|not available`: o único acerto é
a frase pt-BR pré-existente «Sem isto, **TODO** aprovado recebia a COPY_REJEICAO» (`index.ts:530`), onde
«TODO» é o quantificador português, não um marcador.

## Threat Flags

Nenhuma superfície nova. O plano **remove** superfície: T-49-03-01 (e-mail de «avanço» a quem já foi
eliminado — *Information Disclosure*, sinal falso ao titular) fica mitigado com teste de 0 chamadas ao
Resend; T-49-03-02 (segunda cópia TS divergindo da SQL) fica mitigado por construção — não há segunda
cópia; T-49-03-03 (deploy com `_shared` a menos) mitigado pelo `--dry-run` conferido à mão e registrado
acima. Zero instalação de pacote (T-49-03-SC).

## Next

Plano 49-04. Este plano entrega a SEGUNDA camada do D-35; a **primeira** (a trava no `avancar_etapa`,
que impede o avanço de chegar ao histórico) é o **49-06** — e o 49-08 é o primeiro consumidor Deno do
predicado além desta EF.

## Self-Check: PASSED

- `supabase/functions/_shared/candidaturaEncerrada.ts` · `…/_shared/__tests__/candidaturaEncerrada.test.ts` · o próprio SUMMARY: presentes no disco.
- `edab7dfd` · `6d5b8591` · `0bde91ba`: presentes no `git log`, e todos já em `origin/main`.
