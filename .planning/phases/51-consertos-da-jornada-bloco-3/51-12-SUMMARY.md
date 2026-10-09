---
phase: 51-consertos-da-jornada-bloco-3
plan: 12
subsystem: ui
tags: [jorn-42, art-20, revisao, rejeicao, knockout, explicacao, react, vitest, tracer]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-08: contrato de estado_revisao_rejeicao(uuid) / solicitar_revisao_rejeicao(uuid) na migration 20261008000002 (NAO aplicada)"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-14: bloco de reabertura (frase D-01 + data-limite SP) e o idioma `reaberta`"
provides:
  - "getEstadoRevisaoRejeicao(candidaturaId) + coagirEstadoRevisaoRejeicao (coercao estrita T-51-53)"
  - "getExplicacao pergunta estado_revisao_rejeicao PRIMEIRO; null -> fluxo de antes"
  - "solicitarRevisao(candidaturaId, origem) roteando pela origem do servidor"
  - "SolicitarRevisaoCTA prop `origem` (obrigatoria); useSolicitarRevisao com a origem como variavel da mutacao"
  - "ExplicacaoCandidatoPage: pedido de revisao nas tres origens; reabertura visivel em qualquer origem"
  - "e2e EX-04 (condicional)"
  - "ref local refs/gsd/51-12/base = f500b81d"
affects: [51-16, 51-17]

actuals:
  tokens: 19400        # chars/4 sobre o diff realizado f500b81d..a9c4cd10 (77648 octetos)
  tasks: 2
  commits: 2           # MEDIDO: git rev-list --count f500b81d..HEAD antes do commit deste SUMMARY
plan_head_before: f500b81d80fdd94c83801697105b8f29b12dd083
plan_head_after: a9c4cd106e5ab47bc8b075c35b966bf084e90987

tech-stack:
  added: []
  patterns:
    - "Estado do servidor primeiro: a explicacao parte do REGISTRO do pedido, nao do status; null cai no fluxo de antes, byte a byte"
    - "Coercao estrita de jsonb por igualdade de CONJUNTO de chaves (nem a menos, nem a mais) + tipo por chave; forma desconhecida -> null"
    - "Roteador de RPC por nome nos testes (servidor({...})) em vez de mockResolvedValue unico quando o servico faz mais de uma pergunta"
    - "RED com evidencia de maquina via reporter junit do vitest (o tap-flat emite YAML multilinha nao indentado que o classificador recusa)"

key-files:
  created:
    - .planning/phases/51-consertos-da-jornada-bloco-3/deferred-items.md
  modified:
    - src/features/explicacao/services/explicacaoService.ts
    - src/features/explicacao/services/__tests__/explicacaoService.test.ts
    - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
    - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
    - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
    - src/features/explicacao/components/__tests__/SolicitarRevisaoCTA.test.tsx
    - src/features/explicacao/hooks/useExplicacao.ts
    - e2e/explicacao-flow.spec.ts

key-decisions:
  - "`elegivel === true` lido como COERCAO do booleano, nao como portao: o servidor manda `elegivel:false` justamente quando ha pedido (D-06), e exigir true apagaria o estado «ja solicitou»/resposta/reabertura (armadilha 3). A forma valida e elegivel:true+pedido:null OU elegivel:false+pedido{6 chaves}; o resto -> null"
  - "Origem como VARIAVEL da mutacao (mutate(origem)) e prop OBRIGATORIA do CTA: um default 'humana' esconderia o call site que esquecesse de passa-la, e o pedido do knockout iria para a RPC que o recusa sempre"
  - "Erro de estado_revisao_rejeicao -> DATABASE_ERROR (o plano manda): ate o apply da 0002 no portao 51-16 a RPC nao existe em PROD e a pagina cairia em «Nao foi possivel carregar» — por isso o cliente so vai ao ar depois do apply (D-55 da 49)"
  - "Um commit por task (forma do plano), nao test()+feat(): o hook tsc de nao-regressao recusou o commit RED (89 -> 100: os testes importam simbolos que ainda nao existem). Nao contornado; a evidencia RED ficou registrada pelo classificador"

patterns-established:
  - "Mordida provada no front: worktree de refs/gsd/<plano>/base + ln -s node_modules + testes do HEAD copiados"

requirements-completed: [JORN-42]

coverage:
  - id: D1
    description: "Knockout: a pagina mostra o texto de que nenhuma pessoa avaliou E o pedido de revisao; confirmar leva 'automatica' a mutacao, que chama solicitar_revisao_rejeicao"
    requirement: JORN-42
    verification:
      - kind: unit
        ref: "src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx#a rejeição automática (§7.18) > confirmar o pedido leva a ORIGEM `automatica` à mutação"
        status: pass
      - kind: unit
        ref: "src/features/explicacao/services/__tests__/explicacaoService.test.ts#solicitarRevisao roteia pela origem (JORN-42)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A origem vem do servidor: getExplicacao pergunta estado_revisao_rejeicao primeiro; objeto -> explicacao montada dele; null -> fluxo de antes; erro -> DATABASE_ERROR; coercao estrita recusa chave a mais/a menos/tipo errado"
    requirement: JORN-42
    verification:
      - kind: unit
        ref: "src/features/explicacao/services/__tests__/explicacaoService.test.ts#o estado do pedido de revisão da rejeição (JORN-42) + getEstadoRevisaoRejeicao: coerção estrita (T-51-53)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rejeicao pelo RH (humana_triagem) com o pedido; as tres origens com CTA, «ja solicitou», mantida com resposta; reaberta com data em qualquer origem; blocos sem-revisao e canal fora da pagina"
    requirement: JORN-42
    verification:
      - kind: unit
        ref: "src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx#o pedido e a reabertura em qualquer origem (JORN-42)"
        status: pass
    human_judgment: false
  - id: D4
    description: "O portao morde (D-56): os testes do HEAD reprovam 46/143 contra refs/gsd/51-12/base e passam 143/143 no HEAD"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "worktree de refs/gsd/51-12/base + testes do HEAD: npx vitest run src/features/explicacao -> 46 failed | 97 passed"
        status: pass
    human_judgment: false
  - id: D5
    description: "Sessao real do knockout pedindo revisao (EX-04) — so possivel depois do apply da 0002 e da publicacao no portao 51-16"
    requirement: JORN-42
    verification: []
    human_judgment: true
    rationale: "EX-04 e pulado sem E2E_REAL_LOGIN e E2E_CANDIDATURA_KNOCKOUT; a RPC nao existe em PROD ate o 51-16. A conferencia viva pertence ao portao 51-16"

duration: 11min
completed: 2026-10-09
---

# Phase 51 Plan 12: pedido de revisão na página de explicação para toda rejeição Summary

**O candidato rejeitado por qualquer caminho encontra, na página `/candidato/explicacao/:id`, quem decidiu, o pedido de revisão, o estado do pedido e, se for o caso, a reabertura com a data-limite. Os caminhos são três: a decisão final, o knockout e a rejeição pelo RH em qualquer etapa. A página descobre a origem perguntando primeiro a `estado_revisao_rejeicao` (51-08). O pedido vai para `solicitar_revisao_rejeicao` ou para `solicitar_revisao_decisao`, conforme essa origem. Nada foi aplicado nem publicado.**

## Performance

- **Duração:** ~11 min (06:17:05Z → 06:28Z)
- **Tasks:** 2 de 2
- **Arquivos:** 8 modificados e 1 criado (`deferred-items.md`)

## Accomplishments

- **Serviço.** Três peças novas:
  - `getEstadoRevisaoRejeicao`, com cast estreito no molde de `getAvaliacaoStatus`. O comentário diz que ele «sai no db:types do 51-17».
  - `coagirEstadoRevisaoRejeicao`, a coerção estrita do T-51-53.
  - `getExplicacao`, que agora pergunta primeiro pelo estado do pedido.

  `solicitarRevisao(candidaturaId, origem)` escolhe a RPC pela origem e mantém o mesmo mapa de desfechos: 42501 → `denied`, P0002 → `unavailable`, outro erro → `NETWORK_ERROR`.
- **Página.**
  - As três origens caem no ramo do `SolicitarRevisaoCTA`.
  - `reaberta` vale para qualquer origem.
  - Saíram `semRevisaoBody`, `semRevisaoBodyHumanaTriagem` e o import do canal de privacidade.
  - Cada origem continua com a sua linha de resultado (`resultLine*`), conforme D-01.
- **Comentários.** Foram reescritos os docblocks de `ExplicacaoCandidato.origem`, `reaberta_em`, `REASON_KNOCKOUT`, `REASON_HUMANA_TRIAGEM`, do cabeçalho do módulo e do `COPY`/ramo da página. Todos registram que a D-20 da 48 foi revogada pelo JORN-42. O texto mostrado ao candidato em `REASON_*` não mudou.
- **E2E.** Novo cenário EX-04 para o knockout. Ele é pulado sem `E2E_REAL_LOGIN` e sem `E2E_CANDIDATURA_KNOCKOUT`.

## Task Commits

1. **Task 1 (tracer):** `4a5487c6`, feat. Pedido de revisão na explicação do knockout, com a origem lida do servidor.
2. **Task 2:** `a9c4cd10`, feat. Pedido para a rejeição pelo RH e reabertura visível em qualquer origem.

Gate de tracer: a execução é interativa, o modo é `end-of-phase` e o verify é só automático. Re-rodei: vitest 131/131 e tsc 89. Com isso a Task 2 foi liberada.

## TDD / evidência RED e mordida

**RED da Task 1.** 33 falhas, todas planejadas.

- Comando: `NO_COLOR=1 FORCE_COLOR=0 npx vitest run src/features/explicacao --reporter=junit`, depois `gsd-tools check tdd-red-evidence`.
- Alvo do serviço, «knockout elegível → explicação AUTOMÁTICA…»: **RED_EVIDENCE_OK** (`target_test_failed`). Falhou em `expected null to deeply equal { origem: 'automatica', … }`. O motivo é o certo: o serviço ainda não perguntava `estado_revisao_rejeicao`.
- Alvo da página, «confirmar o pedido leva a ORIGEM `automatica` à mutação»: **RED_EVIDENCE_OK**. O motivo também é o certo: o ramo do knockout não tinha o botão «Pedir que uma pessoa revise esta decisão».
- Na primeira corrida o alvo do serviço falhou num `maybeSingle` sem fixture (`TypeError: Cannot destructure…`). Isso não é RED válido. Corrigi a fixture com o default «sem linha» e rodei de novo antes de aceitar.

**RED da Task 2.** 8 falhas planejadas. Alvo «origem automatica com pedido REVERTIDO e reaberta → …»: **RED_EVIDENCE_OK**. A página do knockout reaberto ainda mostrava a rejeição como vigente.

**GREEN.**

| Corrida | Resultado |
|---|---|
| Task 1 | 131/131 |
| Task 2 | 143/143 |
| explicação + guardas (`src/__tests__/guards`) | 272/272 |
| `tsc` | 89 nas duas tasks, limite 90 (D-53) |

**Mordida (D-56).** Criei uma worktree de `refs/gsd/51-12/base` (`f500b81d`), copiei os três arquivos de teste do HEAD e fiz `ln -s node_modules`. Rodando `npx vitest run src/features/explicacao` lá dentro, o resultado foi **`3 failed (3) · 46 failed | 97 passed (143)`**. No HEAD dá 143/143. Entre os 46 estão todos os casos de presença do CTA nas origens `automatica` e `humana_triagem`, a escolha da RPC pela origem, a coerção, o «já solicitou», a reabertura em qualquer origem e a ausência do bloco sem-revisão. A worktree foi removida em seguida.

**TDD Gate Compliance.** O plano pede um commit `feat` por task, e não houve commit `test(51-12)` separado. Tentei o commit RED e o hook `.husky/pre-commit` (tsc de não-regressão, baseline 96) o recusou com `tsc errors: 100`. Os testes RED importam `getEstadoRevisaoRejeicao` e `REASON_KNOCKOUT`, que ainda não existiam. O hook estava certo e não foi contornado (nada de `--no-verify`). Por isso a evidência RED fica no classificador, registrada acima.

### Casos trocados (D-56), com o que cada um asseria antes

| Arquivo | Caso | Antes | Agora |
|---|---|---|---|
| `ExplicacaoCandidatoPage.test.tsx` (§7.18) | «NÃO oferece pedido de revisão — nem o CTA, nem a frase do direito» | ausência do botão `/revis(ã\|a)o/` e da frase do direito no knockout | «OFERECE o pedido…»: botão e frase presentes, ao lado do texto do knockout |
| idem | «mas não silencia o assunto: diz por que não há revisão e dá o canal humano» | presença de «não há uma revisão a pedir por aqui» e do link do canal | «não diz mais que não há revisão…»: os dois ausentes |
| idem (JORN-22) | «NÃO oferece pedido de revisão — nem o CTA, nem a frase do direito» (humana_triagem) | ausência do CTA, da frase e do bloco | «OFERECE o pedido…, e confirmar leva `humana_triagem` à mutação» |
| idem (JORN-22) | «dá o bloco sem-revisão próprio e o canal vindo da constante importada» | presença do eyebrow, do corpo e do link do canal | «não desvia mais para o bloco sem-revisão nem para o canal»: os três ausentes |
| `explicacaoService.test.ts` (§7.18) | «havendo decisão HUMANA rejeitada, … a RPC nem é consultada» | `rpcMock` nunca chamado | a única RPC chamada é `estado_revisao_rejeicao` (a do fallback, não) |
| idem (§7.18) | «aprovado/em_espera não caem no fallback» | `rpcMock` nunca chamado | idem |
| idem (JORN-22) | «a RPC booleana antiga saiu do serviço — uma única pergunta» | `toHaveBeenCalledTimes(1)` | `['estado_revisao_rejeicao', 'explicacao_rejeicao_origem']`, sem a booleana |
| idem (JORN-22) | «havendo linha em `decisao_final`… a RPC tri-estado nem é consultada» | `rpcMock` nunca chamado | `explicacao_rejeicao_origem` não chamada |

Os testes do fallback que usavam `rpcMock.mockResolvedValue({ data … })` passaram a usar o roteador por nome (`origemResponde`). A semântica é a mesma; o que muda é que a pergunta nova não recebe por acidente a resposta da outra. Os 4 testes de `solicitarRevisao(VALID_CAND)` passaram a chamar `solicitarRevisao(VALID_CAND, 'humana')`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] O hook `useSolicitarRevisao` precisou carregar a origem**
- **Found during:** Task 1.
- **Issue:** o CTA chama a mutação do hook, e o hook chamava `solicitarRevisao(id)` sem origem. `useExplicacao.ts` não está em `files_modified`.
- **Fix:** a mutação passou a ser `useMutation<void, Error, OrigemRejeicao>`, com `mutationFn: (origem) => solicitarRevisao(id, origem)`. O tipo `OrigemRejeicao` é re-exportado. O carimbo de visita continua só em `humana`.
- **Files modified:** `src/features/explicacao/hooks/useExplicacao.ts`.
- **Commit:** `4a5487c6`.

**2. [Rule 3 - Blocking] `SolicitarRevisaoCTA.test.tsx` precisou da prop nova**
- **Found during:** Task 1.
- **Issue:** a prop `origem` é obrigatória de propósito (ver key-decisions). Os 10 renders do teste do CTA deixariam de compilar e a contagem do tsc subiria.
- **Fix:** acrescentei `origem="humana"` em cada render. Também acrescentei um `it.each` provando que as três origens chegam à mutação como vieram. Esse caso morde: está entre os 46 da base.
- **Files modified:** `src/features/explicacao/components/__tests__/SolicitarRevisaoCTA.test.tsx`.
- **Commit:** `4a5487c6`.

**3. [Rule 1 - Bug no texto do plano] O rótulo do CTA no EX-04**
- **Found during:** Task 2.
- **Issue:** o plano manda o EX-04 procurar o botão «Solicitar revisão por pessoa natural». Esse rótulo foi reescrito pela 43-UI-SPEC (BD-3) para «Pedir que uma pessoa revise esta decisão». O bigrama «pessoa … natural» é juridiquês proibido pelo `src/__tests__/copyPortoesLgpd.test.ts` (Invariante 8). Seguido à letra, o EX-04 falharia contra o CTA vivo.
- **Fix:** o EX-04 usa o rótulo vivo, `/Pedir que uma pessoa revise esta decisão/i`.
- **Files modified:** `e2e/explicacao-flow.spec.ts`.
- **Commit:** `a9c4cd10`.

**4. [Rule 2 - Interpretação] `elegivel === true` na coerção**
- **Found during:** Task 1.
- **Issue:** lido como portão, ele recusaria o objeto que o servidor manda quando já há pedido. Esse objeto vem com `elegivel: false`, e o 51-08 o devolve assim mesmo depois da reabertura. Recusá-lo apagaria a resposta e a reabertura que a armadilha 3 exige mostrar.
- **Fix:** `elegivel` tem de ser booleano, e a combinação tem de ser `true`+`pedido:null` ou `false`+pedido com as 6 chaves. Qualquer outra forma vira `null`. Está registrado em key-decisions.
- **Commit:** `4a5487c6`.

---

**Total:** 4 desvios (2 bloqueantes, 1 bug no texto do plano, 1 interpretação). **Impacto:** nenhum alargou o escopo. Os dois arquivos fora da lista são a costura mínima entre o CTA e o serviço.

## Nada publicado (regra 7 do orquestrador)

- Nenhum `git push`, nenhum `p46apply.cjs migrate`, nenhum deploy de EF. `git log origin/main..HEAD` tem 22 commits locais, como esperado antes do portão 51-16.
- A única ação em PROD foi uma leitura (`node p46apply.cjs sql`, SELECT). Ela devolveu `cabeca = 20261008000001`, `v02 = 0`, `to_regclass('public.revisao_rejeicao') = null` e 0 RPCs `estado/solicitar_revisao_rejeicao`. **A versão máxima do ledger continua `20261008000001`.**
- **Ordem obrigatória do 51-16:** apply da `0002` → deploy de `notificar-candidato` (51-11) → publicação deste cliente. Publicado antes, `getExplicacao` lançaria `DATABASE_ERROR` em toda visita, porque a RPC `estado_revisao_rejeicao` ainda não existiria em PROD.

## Issues Encountered

- O reporter `tap-flat` do vitest escreve as mensagens multilinha (diffs e dumps do DOM) sem indentação YAML. O classificador recusou esse formato (`invalid_record: Malformed TAP`). Troquei pelo reporter `junit`, que ele aceitou.
- `src/__tests__/promessasComExecutor.test.ts` reprova 2 de 13 casos, com a mesma saída na base e no HEAD. A causa é anterior a este plano e não tem relação com a explicação. Está em `deferred-items.md`.
- O EX-02 e o EX-03 do E2E têm o mesmo rótulo antigo de antes da 43-UI-SPEC (BD-3). São pulados por padrão e ficam fora do escopo. Também estão em `deferred-items.md`.
- **Caso de borda pendente do 51-16:** uma rejeição pelo RH sem `ator` registrado. Para ela, `estado_revisao_rejeicao` devolve NULL (ASSUMPTION do 51-08). A página cai no fluxo de antes com a origem `humana_triagem` e mostra o CTA. O servidor recusa o pedido com P0002, e o candidato vê «Não há decisão rejeitada para revisar nesta página.» (WR-05, sem convite a tentar de novo). A população viva medida pelo 51-08 é `sem_ator = 0`.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>`. As duas RPCs chamadas são as do 51-08 (T-51-52/53/54). A coerção estrita é a mitigação do T-51-53 e está testada nos 12 formatos recusados.

## Next Phase Readiness

- O cliente está pronto para o portão 51-16 e só deve ir ao ar depois do apply da `0002` e do deploy de `notificar-candidato`.
- O 51-17 (db:types) deve remover os dois casts estreitos marcados com «sai no db:types do 51-17». São eles: `estado_revisao_rejeicao` em `getEstadoRevisaoRejeicao` e `solicitar_revisao_rejeicao` em `solicitarRevisao`.
- O JORN-42 tem ID compartilhado entre vários planos da fase e só fecha quando o último plano que o declara terminar.

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-09*

## Self-Check: PASSED

- Arquivos: 51-12-SUMMARY.md, deferred-items.md, explicacaoService.ts e explicacao-flow.spec.ts presentes.
- Commits: 4a5487c6 e a9c4cd10 são ancestrais do HEAD.
- Plan-level verification re-rodada: vitest explicacao+guards 272/272; tsc 89 (<= 90); casos novos reprovam na base (46/143); nada publicado (ledger 20261008000001).
