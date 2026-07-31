---
phase: 42-invent-rio-gates-fila-art-20
plan: 10
subsystem: rh-ui
tags: [lgpd, art20, revisao, rpc, zod, tanstack-query, radix-dialog, sidebar, guard]

requires:
  - phase: 42-06
    provides: "RPC responder_revisao_decisao viva em PROD com guard fail-closed em 3 camadas (papel, sujeito, decisor≠revisor)"
  - phase: 42-09
    provides: "revisaoService (RevisaoError + classificarErroRevisao + leitores), revisoesKeys, FilaRevisoesTable, useRevisoesPendentesCount"
  - phase: 42-08
    provides: "trg_notif_revisao_respondida → EF notificar-candidato v7 — o e-mail real que um sucesso deste diálogo dispara"
provides:
  - "responderRevisao — o único write-path do cliente para a resposta à revisão (REVISAO-03)"
  - "useResponderRevisao — mutação que NÃO transforma a recusa do guard em toast (REVISAO-05)"
  - "ResponderRevisaoDialog — formulário + confirmação aninhada + alerta inline de recusa + modo somente-leitura"
  - "Entrada 'Revisões' na RHSidebar nos três sítios, com o contador de pendentes"
  - "responderRevisaoSchema — mínimo 50 espelhando o btrim do servidor, teto 2000 de interface"
affects: [42-12, 47-consolidacao]

tech-stack:
  added: []
  patterns:
    - "Erro de mutação com tratamento RAMIFICADO por `code`: um `onError` de uma linha é o defeito, não o molde — a recusa terminal fica calada no hook e é renderizada como estado permanente pelo diálogo"
    - "Slot de badge tipado como `string` e alimentado por formatador: `undefined` some, string aparece — nunca a contagem crua, porque `0 && …` avalia para `0` e o React o renderiza como texto"
    - "Asserção negativa de copy proibida monta o literal em runtime (`['sobre','','por'].join('')`), senão o próprio teste faz o gate de grep reprovar"

key-files:
  created:
    - src/features/revisao/schemas/responderRevisaoSchema.ts
    - src/features/revisao/schemas/__tests__/responderRevisaoSchema.test.ts
    - src/features/revisao/hooks/useResponderRevisao.ts
    - src/features/revisao/hooks/__tests__/useResponderRevisao.test.ts
    - src/features/revisao/components/ResponderRevisaoDialog.tsx
    - src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx
    - src/components/__tests__/RHSidebarRevisoes.test.tsx
  modified:
    - src/features/revisao/services/revisaoService.ts
    - src/features/revisao/services/__tests__/revisaoService.test.ts
    - src/features/revisao/components/FilaRevisoesTable.tsx
    - src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx
    - src/components/RHSidebar.tsx

key-decisions:
  - "A recusa GUARD_DECISOR NÃO dispara toast: o hook fica calado de propósito e o diálogo renderiza um alerta inline permanente, sem nenhum botão de tentar novamente — tentar de novo nunca vai funcionar, porque a recusa é sobre QUEM é o usuário"
  - "O diálogo vive DENTRO da FilaRevisoesTable, e a prop `onResponder` foi removida — a linha já carrega todo o contexto que o diálogo precisa; passar por callback obrigaria a página a re-derivar o que a tabela tem em mãos"
  - "O slot `badge` do MenuItem foi ALARGADO para `string` (uma das duas opções do plano), não derivado no render — duas fontes de verdade sobre 'como um contador aparece' é exatamente como um `0` volta a vazar para a tela"
  - "Tint de `revertida` é âmbar informativo, nunca destrutivo — nada é apagado e reverter é o Art. 20 funcionando; vermelho leria o direito exercido como falha do sistema"

patterns-established:
  - "Um `onError` copiado verbatim do molde é um defeito quando o domínio tem uma recusa TERMINAL: o teste que morde é o que falha se o toast for disparado, não o que verifica que ele existe"
  - "Conteúdo em portal (Radix Dialog) invalida asserções contra `container.textContent` — elas viram falso verde (string vazia ⇒ todo `not.toContain` passa). Asserções de copy proibida em diálogo têm de ler `document.body`"

requirements-completed: [REVISAO-03, REVISAO-05]

coverage:
  - id: D1
    description: "O RH registra a resposta à revisão por um write-path auditável único (RPC responder_revisao_decisao com os 3 params nomeados), sem nenhuma decisão de autorização no cliente"
    requirement: "REVISAO-03"
    verification:
      - kind: unit
        ref: "src/features/revisao/services/__tests__/revisaoService.test.ts#responderRevisao — os 3 params nomeados, zero from(), e a RPC é chamada MESMO quando o guard vai recusar"
        status: pass
      - kind: unit
        ref: "grep -rcE 'auth\\.uid|por_usuario\\s*===' src/features/revisao/hooks/ == 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "A recusa do guard REVISAO-05 é refletida como estado terminal: diálogo aberto, texto preservado, primário desabilitado, alerta inline verbatim, ZERO retry oferecido, ZERO copy de contorno"
    requirement: "REVISAO-05"
    verification:
      - kind: unit
        ref: "src/features/revisao/hooks/__tests__/useResponderRevisao.test.ts — falha se GUARD_DECISOR disparar toast; VALIDACAO/DESCONHECIDO seguem toastando"
        status: pass
      - kind: integration
        ref: "src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx — 7 asserções da região de recusa, incluindo ausência de botão de retry e das 5 frases de contorno montadas em runtime"
        status: pass
    human_judgment: false
  - id: D3
    description: "Os 5 estados do diálogo (vazio, parcial, carregando, erro, texto longo) e os dois recuos com rótulos distintos, nenhum com o verbo genérico de cancelamento"
    requirement: "REVISAO-03"
    verification:
      - kind: integration
        ref: "ResponderRevisaoDialog.test.tsx — contador com déficit, gate nos 50 (com btrim), maxLength 2000, pendente sem duplo envio, confirmação ramificando por veredito, ausência de 'Cancelar' em todo o fluxo"
        status: pass
    human_judgment: false
  - id: D4
    description: "Modo somente-leitura ('Ver resposta') com veredito e justificativa registrados, sem controles editáveis e sem botão primário"
    requirement: "REVISAO-03"
    verification:
      - kind: integration
        ref: "ResponderRevisaoDialog.test.tsx — sem radio, sem textbox, sem primário; justificativa com whitespace-pre-wrap"
        status: pass
    human_judgment: false
  - id: D5
    description: "A entrada 'Revisões' aparece no menu RH nos três sítios (existe, navega, se acende) e o contador nunca renderiza o algarismo zero"
    requirement: "REVISAO-03"
    verification:
      - kind: integration
        ref: "src/components/__tests__/RHSidebarRevisoes.test.tsx — os 3 sítios por comportamento + zero/carregando/erro ocultos com asserção negativa de '0' no DOM + 1..99 exato + 99+ no transbordo"
        status: pass
      - kind: unit
        ref: "grep -c revisoes-rh src/components/RHSidebar.tsx == 3 · grep -cE '\\?\\?\\s*0' == 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "O fluxo completo exercitado num navegador com sessão RH real contra PROD: abrir /rh/revisoes, responder um pedido, ver o e-mail chegar ao candidato, e ver o DECISOR ser recusado pelo servidor"
    requirement: "REVISAO-05"
    verification:
      - kind: manual_procedural
        ref: "não executado — exige dois logins RH distintos (o decisor e um revisor) e uma candidatura com pedido pendente vivo"
        status: fail
    human_judgment: true
    rationale: "A cobertura automatizada é de comportamento e estado com a mutação mockada. O caminho que ninguém pode simular é o guard REAL disparando contra um JWT real — e é justamente esse que o REVISAO-05 promete. Fica para a sessão de UAT vivo da fase, com os 3 usuários RH ativos (fernando@ e e2e.admin@ como administrador, recrutador.rh@teste.com como recrutador)."

duration: ~25 min
completed: 2026-07-31
status: complete
---

# Phase 42 / Plan 10: Responder revisão + entrada no menu — Summary

**O RH registra o resultado da revisão do Art. 20 por um write-path auditável único, e quando o servidor recusa — porque quem responde é quem decidiu — a interface diz isso e para, sem oferecer um retry que não existe.**

## Performance

- **Duração:** ~25 min
- **Tasks:** 3
- **Arquivos:** 12 (7 criados, 5 modificados)
- **Testes novos:** 79 (66 na feature `revisao`, 13 na `RHSidebar`)
- **Suíte inteira:** 142 arquivos / **1274 testes** / exit 0 · `npm run build` OK · tsc **97 → 97**

## Task Commits

| Task | Commit | O que entregou |
|------|--------|----------------|
| 1 | `4666a84` | `responderRevisaoSchema` + `revisaoService.responderRevisao` + `useResponderRevisao` |
| 2 | `cc28252` | `ResponderRevisaoDialog` + `FilaRevisoesTable` hospedando o diálogo |
| 3 | `70f398b` | Entrada "Revisões" na `RHSidebar` nos três sítios + o contador |

## O que este plano de fato decidiu

### A recusa do guard não é um erro — é um fato

O molde deste hook (`useRegistrarDecisao`) tem um `onError` de uma linha: um `toast.error`
para qualquer erro. Copiá-lo verbatim teria produzido código que funciona e defeito que
não aparece. A recusa do REVISAO-05 é o único caso em que o operador precisa **ler,
entender e agir** (encaminhar o pedido a outra pessoa) — e um toast some em 4 segundos,
levando junto a única explicação que ele ia receber. Pior: um "não foi possível, tente
novamente" **convida** a tentar de novo, e tentar de novo nunca vai funcionar, porque a
recusa é sobre QUEM é o usuário, não sobre o estado do pedido.

Então o hook fica **calado** para `GUARD_DECISOR` — e só para ele — e o diálogo assume:
alerta inline destrutivo, permanente, com o botão primário desabilitado e **nenhum** botão
de tentar novamente. O teste que garante isso é o que **falha se o toast for disparado**.
Uma asserção de presença não teria pego nada.

A mesma disciplina vale para a copy: as cinco frases que a UI-SPEC proíbe ("solicitar
liberação", "pedir permissão", "pode liberar", "sobrepor", "exceção") são asseridas
ausentes. Não existe sobreposição por administrador e não existe fallback "se só houver um
RH" — prometer o contorno é o defeito, e é pior que o bloqueio, porque produz tentativa
repetida e desconfiança do controle.

### O botão desabilitado é cosmético, e o código diz isso em voz alta

`responderRevisao` chama a RPC **mesmo quando o guard vai recusar**, e há um teste que
prende exatamente isso. É o oposto do instinto de "não deixar o usuário fazer besteira":
se o cliente atalhasse a chamada quando acha que o usuário é o decisor, a barreira passaria
a ser o cliente — e qualquer DevTools a desliga. O `pode_responder` que a fila lê é
espelho, não regra. Gate de grep: zero `auth.uid` e zero comparação de identidade em
`src/features/revisao/hooks/`.

### Um `0` que o React renderiza como texto

O slot `badge` do `MenuItem` existe na interface da `RHSidebar` desde sempre e **nunca teve
consumidor**. O render era `item.badge && item.badge > 0 && (…)` — e em JS `0 && …`
curto-circuita para `0`, que o React renderiza **como texto**. O bug era latente
precisamente porque ninguém alimentava o slot; este plano é o primeiro consumidor e seria
a primeira vítima, em **três** estados distintos (zero pendentes, carregando, falha de
leitura).

Corrigido em duas camadas: o consumidor passa `undefined` (via `formatarBadgePendentes`,
que a 42-03 já tinha escrito com esse contrato exato), **e** o render virou ternário nos
dois sítios (expandido e recolhido). Duas camadas porque a primeira depende de todo
consumidor futuro se lembrar, e a segunda não depende de ninguém.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] `.trim()` no schema, espelhando o `btrim` do servidor**
- **Found during:** Task 2 (ao escrever o gate do contador do diálogo)
- **Issue:** O servidor mede `length(btrim(coalesce(p_justificativa,'')))`. Sem `.trim()`
  no schema, 60 espaços passavam no gate do cliente, iam à rede e voltavam como um `22023`
  opaco — erro certo, explicação nenhuma, e o operador sem pista do que fazer.
- **Fix:** `.trim()` antes de `.min()`/`.max()` em `responderRevisaoSchema`; contador e
  gate do diálogo usam `justificativa.trim().length`. O valor enviado à RPC já vai aparado.
- **Files:** `src/features/revisao/schemas/responderRevisaoSchema.ts` (+2 testes)
- **Commit:** `cc28252`

**2. [Rule 1 — Bug] `item.badge && item.badge > 0` renderiza `0` como texto**
- **Found during:** Task 3
- **Issue:** Bug latente no render do badge da `RHSidebar` (dois sítios: menu expandido e
  ponto do menu recolhido). Nunca disparou porque o slot nunca teve consumidor.
- **Fix:** ternário nos dois sítios; slot tipado como `string`.
- **Files:** `src/components/RHSidebar.tsx`
- **Commit:** `70f398b`

### Mudanças de contrato deliberadas (não são desvios — são o plano)

- **`FilaRevisoesTable.onResponder` removida.** Existia só para que a ação não fosse uma
  afordância falsa enquanto o diálogo não existia (a 42-09 nomeia isso no próprio JSDoc).
  O diálogo existe agora e vive dentro da tabela. Dois testes da 42-09 foram reescritos —
  aqueles que assertavam "sem `onResponder` o botão fica desabilitado".
- **Cabeçalho do modo somente-leitura autorado.** A UI-SPEC descreve só o fluxo de escrita.
  Título e descrição do modo "Ver resposta" foram derivados dela (mesmo registro, tempo
  passado) e marcados como tal no arquivo.

## Issues Encontradas

**Asserções de copy em falso verde — 3 delas.** Durante o RED do diálogo, três asserções
contra `container.textContent` passaram trivialmente: o conteúdo do Radix `Dialog` vive num
**portal**, fora do `container` do RTL, então `container.textContent` é a **string vazia** —
e todo `not.toContain(...)` passa sem olhar nada. Trocadas por `document.body`, e só então
elas passaram a asserir alguma coisa. Vale como sinal: as asserções que mais importam neste
arquivo são negativas ("esta copy NÃO existe"), e uma asserção negativa contra um alvo vazio
é indistinguível de uma que funciona. As três só apareceram porque as **positivas** do mesmo
`container` falharam — se o arquivo tivesse apenas negativas, o falso verde teria passado
inteiro.

**Gate de grep que reprovaria por causa do próprio teste.** O critério
`grep -rciE 'solicitar liberação|…|sobrepor' src/features/revisao/ == 0` varre a feature
inteira, testes inclusive. Escrever as frases proibidas como literal no teste que as proíbe
faria o gate reprovar. Resolvido montando cada literal em runtime
(`['sobre','','por'].join('')`) — mesmo idioma que a 42-11 adotou para `revisao_por_usuario`.

**Commit RED separado continua impossível neste repo.** Referenciar símbolo/prop inexistente
eleva a contagem `tsc` acima da baseline congelada de 97 e o `.husky/pre-commit` reprova. O
RED foi verificado **empiricamente** antes de cada GREEN (Task 1: 8 falhas em 3 arquivos;
Task 2: 4 falhas; Task 3: 12 falhas) e o resultado está registrado no corpo de cada commit.
Mesmo achado da 42-11 — agora reincidente, o que o torna uma propriedade do repositório, não
um acidente do plano.

## Verificação

| Gate | Resultado |
|------|-----------|
| `npm run test:run` | 142 arquivos / **1274 testes** / exit 0 |
| `npm run build` | OK (44 chunks, eager 906 kB < baseline) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada) |
| `sh .husky/pre-commit` | exit **0** — zero `--no-verify` nos 3 commits |
| `grep -c "revisoes-rh" RHSidebar.tsx` | **3** |
| `grep -c "'/rh/revisoes'" RHSidebar.tsx` | **2** |
| `grep -cE '\?\?\s*0' RHSidebar.tsx` | **0** |
| copy de contorno em `src/features/revisao/` | **0** |
| `auth.uid` / comparação de decisor em `hooks/` | **0** |
| `text-xs` em `src/features/revisao/` | **0** |
| `maxLength={2000}` no diálogo | **1** |
| `min-h-[44px]` no diálogo | **6** (≥3 exigido) |

## O que fica aberto

- **UAT vivo (D6).** O guard REAL disparando contra um JWT real é o único caminho que a
  suíte não alcança — e é justamente o que o REVISAO-05 promete. Exige **dois** logins RH
  distintos (o decisor de uma decisão e um revisor diferente) e uma candidatura com pedido
  pendente. Os 3 usuários RH ativos em PROD: `fernando@beautysmile.com.br` e
  `e2e.admin@beautysmile.com.br` (administrador) e `recrutador.rh@teste.com` (recrutador).
- **Efeito externo irreversível no caminho feliz.** Um sucesso dispara
  `trg_notif_revisao_respondida` → EF `notificar-candidato` v7 → **e-mail real** ao
  candidato. Não há desfazer, e nada nesta camada finge que há. Quem for exercitar o fluxo
  vivo escolhe a candidatura com isso em mente.

---
*Phase: 42-invent-rio-gates-fila-art-20*
*Completed: 2026-07-31*

## Self-Check: PASSED

- Arquivos criados verificados em disco: 7/7 presentes.
- Commits verificados em `git log`: `4666a84`, `cc28252`, `70f398b` — todos presentes, nenhum com deleção de arquivo rastreado.
- Todos os `<acceptance_criteria>` das 3 tasks re-executados após o último commit: verdes (tabela acima).
- `<verification>` do plano re-executada integralmente: verde.
