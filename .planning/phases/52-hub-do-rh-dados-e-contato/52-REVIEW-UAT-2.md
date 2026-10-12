---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-12T14:50:00Z
depth: deep
diff_base: 87cfe0ea503f5b7e3c16f91ff53cff5c5f680342
reviewed_head: a0f24b760fa81d7d7da5ee92e962c09a9a6a6fa5
scope: review adversarial bloqueante nº 2 dos consertos do UAT da 52, sobre a rodada de conserto decidida pelo operador em 2026-10-12 («residual_chips_agendamento: consertar agora»; WR-01 e residual do cartão → backlog) — UM commit de código desde a rodada 1 (`a0f24b76`, 3 arquivos: `AgendamentoCandidatoCard.tsx`, `AgendamentoCandidatoCard.test.tsx`, `p52_contraste.cjs`; `git diff --stat b08e7b3b a0f24b76` lista só esses três, e `-- src` só os dois do agendamento). Hipótese de trabalho adotada (memória «re-revisar o conserto antes do apply»): a rodada introduziu defeito novo. Escopo total 87cfe0ea..a0f24b76 fora de .planning = os MESMOS 10 arquivos da rodada 1 (contado). Lidos INTEIROS — os três arquivos do conserto (componente 272 linhas, teste 423, medidor 750) e o diff b08e7b3b..a0f24b76 deles; 52-28-PLAN, 52-29-PLAN e 52-30-PLAN inteiros (Task 1 `<context>` (1)–(11), `<action>` sobre o que o conserto deve fazer ao medidor, «Comando de push»); a rodada 1 (`52-REVIEW-UAT-1.md`) inteira; 52-UAT.md § Gaps e § Decisões (verbatim); § Residual dos 52-28/52-29-SUMMARY; CLAUDE.md; as três memórias pedidas; o parser do p52_portao.cjs (:170-260); tailwind.config.js (paleta só `extend`, v3.4.18). Dos outros sete arquivos, apoiei-me na rodada 1 depois de provar que o conserto não os tocou (`git diff --stat b08e7b3b HEAD -- src/components/pages/__tests__/DashboardCandidatoPage.selos.test.tsx` e `-- src/features/avaliacao-cognitiva` vazios). Re-executado — medidor `--auto-teste` 24/24; CLI: 14 linhas (1 ALVO painel-rejeicao 5.73 OK · 1 CONTROLE 1.38 MORDE · 7 ALVO agendamento-* OK com 6.49/7.15/9.37/6.38/9.37/6.38/6.80 · 5 INFORMATIVO painel-*), final `CONTRASTE OK: 8 cenario(s) no alvo; 1 controle(s) mordem; amostras=480x286`, rc=0, nenhum `p52-contraste-*` em $TMPDIR antes nem depois; cópia e a11y por comando (labels e textos dos `<p>` iguais antes/depois: COPIA IGUAL; linhas com aria-/gating/isSafeHttpUrl/isCancelada/dimClass/rel/target iguais); paleta: `corDeClasse` dos 10 tokens novos = o CSS emitido pelo build (`build/assets/index-DqurAcGx.css`, p.ex. bg-green-800 = rgb(22 101 52)) ao octeto; `npm run build` rc=0, `assert-chunks PASSED`, os três marcadores em `build/assets/index-EkWKvKBY.js`; lint `exit=2 tsc errors=89`, nenhum nos três arquivos; `p52_tipografia` no componente: TIPOGRAFIA OK (26 linhas); suítes agendamento 5 arquivos/63 verdes, pages 11/97, avaliacao-cognitiva 10/71, revisao 11/243 (37 arquivos, 474 testes, +7 da rodada 1 = os casos novos do teste do cartão, 10 → 17 confirmados); enumeração em seco `p50_enumera.cjs --de origin/main(29f34756) --ate HEAD(a0f24b76)` com o `--caminhos`/`--assunto` do 52-30: 34 commits, 20 planning, 14 codigo (`awk $2`), 0 ALHEIO, rc=0; `p52_portao.cjs --modo revisao` sobre a rodada 1 RECUSA com `CODIGO DEPOIS DA REVISAO … (reviewed_head 8010006e): scripts/p52_contraste.cjs src/…/AgendamentoCandidatoCard.tsx src/…/AgendamentoCandidatoCard.test.tsx` (rc=1 — o portão vê o conserto); `refs/gsd/52-30/sha` ainda não existe. Mordidas com linha de base, trap e `git diff --quiet HEAD` vazio depois — teste do cartão (baselines `Tests 1 passed | 16 skipped (17)` nos três filtros `fonte real`, `cancelada . FUTURE`, `\(d\) reagendada`): M1 chip Cancelada `bg-red-800`→`/40` → `fonte real` `1 failed | 16 skipped` (`FUNDO TRANSLUCIDO: 'Cancelada' bg-red-800/40`) e o caso (a) `1 failed` (`expected 'bg-red-800/40' to be 'bg-red-800'`); M2 chip Agendada `bg-green-800`→`bg-green-200` → `1 failed` (`CONTRASTE ABAIXO: 'Agendada' text-green-100 sobre bg-green-200 = 1.10`); M3 nota cancelada `bg-red-800`→`/40` no `<p>` → caso (a) `1 failed` (`nota de cancelada: token de fundo: expected 'bg-red-800/40' to match /^bg-[a-z]+-[0-9]{2,3}$/`) e `fonte real` `1 passed` (a guarda por forma só lê descritores; a nota é vigiada pelo DOM); M4 nota reagendada sem `bg-yellow-800` → caso (d) `1 failed`; M5 descritor de reserva com chaves aninhadas (`label: ({ s: row.status }).s`) → `1 failed` (`POPULACAO: falta o descritor de reserva | POPULACAO: 8 'icon:' no fonte, 7 extraidos`); M6 `icon`→`icone` + `bg-green-800/40` no MESMO descritor → `fonte real` `1 passed` (ESCAPA à guarda; ver IN-03) mas o medidor dá `CENARIO DESCOLADO DO FONTE: agendamento-chip-agendada` rc=1 e o tsc acusa 1 erro no arquivo. Medidor — A1 fonte `bg-green-800`→`/40` sem tocar o medidor → DESCOLADO agendamento-chip-agendada rc=1; A2 nota cancelada sem `bg-red-800` → DESCOLADO agendamento-nota-cancelada rc=1; A3 `text-red-100`→`/90` → DESCOLADO rc=1; A4 ordem das classes trocada no `<p>` → OK rc=0 (a âncora aceita qualquer ordem, como o comentário diz); B1 REVERSÃO COERENTE da nota cancelada ao par antigo (fonte `text-sm text-red-200/90`; medidor `texto: 'text-red-200/90', superficie: null` e âncora sem o lookahead da superfície) → `ALVO agendamento-nota-cancelada: min=1.18 mediana=2.09 max=4.26 alvo=4.50 ABAIXO`, `CONTRASTE ABAIXO DO ALVO … min=1.18`, rc=1 (o 1,18 do residual, ao centésimo); B2 REVERSÃO COERENTE do chip agendada (fonte e medidor `text-green-300`/`bg-green-500/20`) → `ALVO agendamento-chip-agendada: min=1.33 … ABAIXO` rc=1 (o 1,33 do residual). Depois de tudo: `git status --short` = só os cinco itens das outras janelas mais este arquivo; nenhum `.rvbak`/`.p52bak`; `--auto-teste` 24/24 de novo. Nada foi commitado, publicado ou empurrado; o único arquivo escrito é este.
files_reviewed: 13
files_reviewed_list:
  - scripts/p52_contraste.cjs
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.selos.test.tsx
  - src/features/agendamento/components/AgendamentoCandidatoCard.tsx
  - src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx
  - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx
  - src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-28-PLAN.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-29-PLAN.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-30-PLAN.md
findings:
  critical: 0
  warning: 0
  info: 5
  total: 5
status: approved
---

# Phase 52: Code Review Report — consertos do UAT (52-28, 52-29) + rodada de conserto do 52-30, rodada 2

**Reviewed:** 2026-10-12T14:50:00Z
**Depth:** deep
**Files Reviewed:** 13
**Status:** approved (critical 0 · warning 0 · info 5)

## Summary

Esta rodada existe porque o operador mandou consertar agora o residual dos chips e das notas do cartão de entrevista, e
o conserto é um commit de código depois do `reviewed_head` da rodada 1 — o portão o vê e recusa (`CODIGO DEPOIS DA
REVISAO`, confirmado). Entrei assumindo que a rodada de conserto introduziu um defeito novo, como aconteceu duas vezes
neste projeto, e fui procurá-lo nos quatro lugares onde ele caberia: (1) no que o candidato passa a ver — os cinco chips,
o descritor de reserva e as duas notas; (2) no que o conserto podia ter quebrado sem querer — cópia, `aria-*`, o gating
do `.ics`/≤24h, a recusa de `javascript:`/`data:`, o ramo `isCancelada`; (3) nos dois vigias novos — a guarda por forma
do teste e os sete cenários do medidor que passaram de `informativo` a `alvo`; (4) no programa que publica — o
`--caminhos`, o chunk, o portão.

**Não achei defeito novo.** O diff do conserto é exatamente o que o operador decidiu, mais o descritor de reserva (que
é um chip do mesmo cartão e está declarado — IN-01), e nada mais: os seis `label:` e os dois textos das notas são
byte a byte os de antes (conferido por comando); as linhas de `aria-*`, do gating, do `isSafeHttpUrl`, do `isCancelada`
e do `dimClass` são idênticas; o diff `b08e7b3b..a0f24b76` lista só os três arquivos, nenhum em `src/components/pages`
nem no Raven (o WR-01 ficou intocado, como o operador dispôs). Cada par novo é opaco por forma e mede 6,38–9,37:1 pela
mesma `contrasteDeClasses` do medidor, com a paleta igual ao CSS que o build emite (conferi os 10 tokens ao octeto,
porque um `theme.colors` sobrescrito teria tornado o medidor cego — não é o caso: só `extend`). Os sete cenários estão
em `alvo`, com `superficie` opaca nas notas (não `null`), ancorados nas classes novas e no arquivo certo; as âncoras
mordem (A1–A3) e o ALVO em si morde quando fonte e medidor são revertidos coerentemente ao par antigo (B1: 1,18 ABAIXO;
B2: 1,33 ABAIXO — os mesmos números do residual). A guarda do teste lê o fonte REAL (as mutações no fonte mudaram o
resultado), exclui a anotação do `Record` pela forma do valor (`: string|LucideIcon`), tem a checagem de completude
por contagem de `icon:` (M5: um descritor com chaves aninhadas é acusado), e as quatro mordidas internas ficam cada
uma só com o seu prefixo. Build, lint, tipografia, as quatro suítes e a enumeração em seco (0 ALHEIO) estão verdes.

**Veredito: os quatro gaps do UAT (G-52-2, G-52-4, G-52-4b, G-52-6) mais os chips e as notas do cartão de entrevista
são publicáveis.** Ficam cinco INFOs, nenhum bloqueante: o descritor de reserva no diff (dentro da letra «os chips … do
card», declarado — IN-01); duas células da 52-UI-SPEC que ainda descrevem os chips e as notas como residual translúcido
(IN-02, planning-only); a completude da guarda ancorada só em `icon:` (IN-03, com tsc e medidor como segunda e terceira
linha — provado); a lista do medidor que omite `cancelada` agora que o «escopo do residual» deixou de existir (IN-04);
e a segunda metade do IN-02 da rodada 1, que o conserto não fez (IN-05).

### O que o conserto tinha de fazer (52-30 Task 1 `<action>`) — e fez

| Exigência do `<action>` | Veredito | Evidência |
|---|---|---|
| Código só nos caminhos da forma do `--caminhos`, assunto `fix(52-30): …` | OK | 3 arquivos, todos casam a forma (`agendamento/components/(AgendamentoCandidatoCard\.tsx|__tests__/AgendamentoCandidatoCard\.test\.tsx)$`, `scripts/p52_contraste\.cjs$`); assunto casa `^(fix)\(52-30\): ` |
| Todo cenário ancorado numa classe que o conserto muda muda no MESMO commit | OK | Os sete `agendamento-*` mudaram em `a0f24b76` (`p52_contraste.cjs:291-301,397-427`); não há cenário descolado (CLI rc=0) |
| O item consertado passa de `informativo` a `alvo` (4,5:1), superfície e texto novos, âncoras nas classes novas — «não um cenário a menos» | OK | `tipo: 'alvo'`, `alvo: 4.5` nos sete (`:399-400,:412-413`); `superficie: c.bg` / `n.superficie` (`:402,:415` — notas com `bg-*-800`, não `null`); 14 linhas no CLI = 1 + 1 + 7 + 5 (contei pelos exports: `CENARIOS.length === 14`) |
| Âncoras seguem mordendo com `CENARIO DESCOLADO DO FONTE` | OK | A1, A2, A3 (rc=1, id certo, arquivo certo); A4 prova que a ordem das classes não descola (como o comentário `:420-421` promete) |
| `node scripts/p52_contraste.cjs` saída 0, `CONTRASTE OK`, cada item convertido com `ALVO <id>: … OK` | OK | `CONTRASTE OK: 8 cenario(s) no alvo; 1 controle(s) mordem; amostras=480x286`; os sete `ALVO agendamento-… OK` |
| Testes dos componentes tocados verdes | OK | agendamento 5 arquivos / 63 testes; o arquivo do cartão 17/17 |

### Os 11 pontos da instrução (52-30 Task 1), um a um — o que mudou desde a rodada 1

| # | Ponto | Veredito | Evidência (o que esta rodada acrescenta à rodada 1) |
|---|---|---|---|
| 1 | Cada `truth` dos quatro gaps atendida; nada além do decidido; nenhuma cópia; nenhum banco/EF/primitivo | OK (ver IN-01) | Os quatro gaps: inalterados desde a rodada 1 (`git diff --stat b08e7b3b HEAD -- src` = só os dois arquivos do agendamento). O decidido em 2026-10-12: cinco chips (`AgendamentoCandidatoCard.tsx:70-75`), duas notas (`:239,:244`) — e o descritor de reserva (`:155-161`), um chip do mesmo cartão, declarado no commit e vigiado pela sentinela do teste (IN-01). Cópia: `label:` ×6 e os dois textos dos `<p>` iguais antes/depois (comando: COPIA IGUAL). Nenhum arquivo fora dos três; 10 arquivos no escopo total, como na rodada 1 |
| 2 | G-52-4 | OK | Não tocado pelo conserto (rodada 1 vale) |
| 3 | G-52-4b | OK | Não tocado pelo conserto (rodada 1 vale) |
| 4 | G-52-6: caixa e texto; todo selo opaco e ≥ 4,5 por FORMA; a guarda morde | OK | Painel: não tocado. Cartão de entrevista (a extensão decidida): os seis descritores + reserva opacos por forma (`^bg-[a-z]+-[0-9]{2,3}$`, `test:43`) e ≥ 4,5 pela mesma função (`:60,:344`); pares 6,49 · 7,15 · 9,37 · 6,38 · 6,80 · 9,37 (reserva = cinza 9,37). Guarda morde: M1 (translúcido), M2 (opaco de baixo contraste 1,10), M5 (população/completude), e as quatro mordidas internas m1–m4 verdes no HEAD; as notas são vigiadas pelo DOM nos casos (a) e (d) — M3 e M4 vermelhos exatamente lá. Cancelada visível com `data_hora` futura (caso (a), `:111-140`) e, por leitura, com passada: `isCancelada` (`:163`) não depende da data e a nota (`:243-248`) só depende dele — linhas sem diff |
| 5 | G-52-2 | OK | Não tocado pelo conserto (`git diff --stat b08e7b3b HEAD -- src/features/avaliacao-cognitiva` vazio); WR-01 segue como está (backlog, decisão do operador) |
| 6 | Medidor: WCAG, composição, saturação, BMP, controle, âncoras, temporário, nenhuma população literal de portão | OK (ver IN-04, IN-05) | Funções puras sem diff (`git diff b08e7b3b HEAD -- scripts/p52_contraste.cjs` só toca comentários do cabeçalho e as listas/cenários :291-301, :397-427). API exportada igual (`corDeClasse, compor, luminancia, contraste, saturar, contrasteDeClasses, lerBmp, conferirAncoras, medirCenario, julgar, CENARIOS, PILHA_CARTAO_PAINEL`) — os três testes que a importam seguem verdes. `--auto-teste` 24/24 e `DECLARADOS = 24` honesto (nenhum caso acrescentado). Controle MORDE (1,38). Temporário: zero `p52-contraste-*` antes e depois de ~12 execuções. A frase nova do cabeçalho (`:25-27`) é comentário — sem efeito. Populações: `CHIPS_AGENDAMENTO` é agora uma lista de 5 dos 6 status — a razão de ser «escopo do residual» acabou com o conserto (IN-04) |
| 7 | Os testes importam a MESMA função do medidor | OK | `test:36-39` — `createRequire(import.meta.url)` + `contrasteDeClasses`; nenhuma fórmula copiada (`0.2126`/`0.04045`/`+ 0.05` ausentes do teste) |
| 8 | Emendas da 52-UI-SPEC, 52-PATTERNS, 52-CONTEXT, 52-RESEARCH batem com o código | OK (ver IN-02) | O conserto não emendou documentação; as linhas 52-UI-SPEC:585 e :822 ainda dizem que os cinco chips e as duas notas são «herança fora da decisão — residual», com as classes translúcidas antigas. Documental; não afeta o que vai ao ar |
| 9 | «Comando de push»: `--caminhos` cobre todo caminho mudado; 0 ALHEIO; marcadores no chunk `index-*` | OK | Enumeração em seco contra `origin/main` (29f34756): 34 commits — 20 `planning`, 14 `codigo` por `awk $2` —, 0 ALHEIO, rc=0 (a expectativa «33 = 17 + 16» da instrução não bate na repartição; o que importa — todo `codigo` dentro da forma, nenhum ALHEIO, o conserto `a0f24b76` enumerado como `codigo` — bate). Build rc=0, `assert-chunks PASSED`, os três marcadores em `build/assets/index-EkWKvKBY.js` (eager). `reviewed_head` = HEAD |
| 10 | Os dois residuais nos SUMMARYs com o número de cada item | OK | Os SUMMARYs do 52-28/52-29 são registro histórico e continuam corretos para a data deles. Os sete números do residual dos chips/notas são reproduzidos ao centésimo pelas reversões B1 (1,18) e B2 (1,33). O terceiro `<verify>` do 52-28 (sete `INFORMATIVO agendamento-…` por nome) hoje acha 0 — por desenho: o 52-30 `<action>` já diz que ele «descrevia o residual de antes desta decisão» |
| 11 | Caso do `ContextoRejeicaoTriagemRevisao.test.tsx` | OK | Não tocado pelo conserto; suíte revisao 11/243 verde |

### Status dos achados da rodada 1 que o conserto podia ter mudado

| Rodada 1 | Status nesta rodada |
|---|---|
| WR-01 (teste do Raven ignora o alfa) | **Inalterado** — disposição do operador: backlog. O conserto não tocou o Raven (diff vazio em `src/features/avaliacao-cognitiva`) |
| IN-01 (check a 360px) | Inalterado (Task 3 do 52-30) |
| IN-02 (âncora de informativo reprova) | **Parcialmente resolvido**: a frase do cabeçalho entrou (`p52_contraste.cjs:25-27`, comentário). A dica na linha `CENARIO DESCOLADO DO FONTE` de um informativo NÃO entrou (IN-05 aqui) |
| IN-03 (`process.cwd()` no concluidas.test) | Inalterado (arquivo não tocado) |
| IN-04 (`DECLARADOS = 24`) | Inalterado e ainda verdadeiro (nenhum caso de auto-teste acrescentado) |
| IN-05 (célula da D-27 na UI-SPEC) | Inalterado; e o mesmo padrão aparece agora em :585/:822 (IN-02 aqui) |
| IN-06 (forma `/\{[^{}]*\}/` sem completude, selos.test) | **Inalterado no `selos.test`** (não tocado); **a proposta foi implementada no teste NOVO** do cartão (`test:354-358`: contagem de `icon:` = candidatos extraídos; M5 prova que morde). Fica a assimetria: o selos.test segue sem a checagem |
| IN-07 (`sips` sai 0 ao pular) | Inalterado (comentário não acrescentado) |

## Info

### IN-01: o descritor de reserva (status fora do mapa) também mudou — dentro da letra da decisão («os chips … do card de entrevista»), declarado, e inalcançável pelo tipo de hoje

**File:** `src/features/agendamento/components/AgendamentoCandidatoCard.tsx:155-161`

**Issue:** A decisão do operador nomeia «os chips e as notas do card de entrevista»; a instrução desta rodada resume como
«cinco chips do `STATUS_CONFIG` + duas notas». O conserto mudou também o objeto de reserva do `??` (`text-gray-300`/
`bg-gray-500/20` → `text-gray-100`/`bg-gray-700`), que renderiza como chip quando `row.status` não está no mapa. É um
chip do mesmo cartão com o mesmo defeito, o commit o declara («o descritor de reserva idem»), o teste o exige
(`POPULACAO: falta o descritor de reserva`, `test:353`) e, com `StatusAgendamento` de seis valores e `STATUS_CONFIG`
sendo um `Record` exaustivo, o ramo não é alcançável hoje — nenhum estado visível muda além do decidido. Registro para
que a decisão fique completa por nome, não como escopo além do decidido.

**Fix:** nenhum no código. Na `52-30-DECISAO.md`/SUMMARY, dizer que `residual_chips_agendamento: consertado` cobre os
cinco chips, o descritor de reserva e as duas notas.

### IN-02: duas células da 52-UI-SPEC ainda descrevem os cinco chips e as duas notas como «residual» translúcido

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md:585,822`

**Issue:** A linha `DashboardCandidatoPage (G-52-6, emenda 2026-10-12)` (:585) termina com «Os outros cinco chips do
agendamento … e as duas notas coloridas do mesmo cartão (reagendada `text-yellow-200/90`, cancelada `text-red-200/90`)
são **herança fora da decisão** — residual …», e o item G-52-6 do bloco de emendas (:822) repete «seguem translúcidos».
Depois de `a0f24b76` o código tem `text-*-100`/`bg-*-800` e as notas têm superfície. Mesma classe do IN-05 da rodada 1:
o contrato diz uma coisa e o código outra.

**Fix (planning-only, sem review novo — `.planning/` fica fora do portão de código):** nas duas células, uma emenda
datada: «_Emenda (52-30, decisão do operador 2026-10-12 «consertar agora»): os cinco chips, o descritor de reserva e as
duas notas passaram ao mesmo par opaco (`text-<cor>-100` sobre `bg-<cor>-800`, cinza `-700`; notas com superfície
`rounded-lg bg-*-800 px-3 py-2`), 6,38–9,37:1; os sete cenários do medidor são `alvo`. O texto acima é o registro de
2026-10-12 antes da decisão._»

### IN-03: a completude da guarda está ancorada só em `icon:` — um descritor cuja chave `icon` seja renomeada escapa à guarda por forma (o tsc e o medidor pegam)

**File:** `src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx:309-320,354-358`

**Issue:** `candidatos()` exige `icon:` E `label:` no `{…}`; a checagem de completude compara o número de `icon:` do fonte
com o número de candidatos. Se um descritor perder a chave `icon` (renomeada para `icone`, por exemplo), ele sai dos
dois lados da conta ao mesmo tempo e a guarda não o julga. Provei (M6): `agendada: { icone: …, bg: 'bg-green-800/40' }`
→ `fonte real` `Tests 1 passed | 16 skipped` — o fundo translúcido passou pela guarda. Não é buraco aberto: o mesmo
fonte dá 1 `error TS` no arquivo (`icone` não existe no tipo do `Record`, e `statusInfo.icon` deixa de existir no
`??`) e o medidor dá `CENARIO DESCOLADO DO FONTE: agendamento-chip-agendada` rc=1 — duas linhas de defesa que o 52-30
Passo 0b e o lint ≤ 89 executam antes do push. É a mesma classe do IN-06 da rodada 1, um grau mais fechada (a chave
`label` renomeada JÁ é pega: cai do lado dos candidatos e não do lado dos `icon:`; chaves aninhadas idem — M5).

**Fix (barato, no mesmo arquivo, quando ele for tocado):** anular a simetria contando uma segunda chave:
`const rotulos = (texto.match(/\blabel\s*:/g) ?? []).length; if (rotulos !== extraidos) falhas.push(\`POPULACAO: ${rotulos} 'label:' no fonte, ${extraidos} extraidos\`)` —
um descritor que perca `icon` continua contado em `label:` e acusa. (Ou ancorar a extração em `label:` só, e contar
`icon:`, `color:`, `bg:` e `label:` contra o mesmo número.)

### IN-04: `CHIPS_AGENDAMENTO` é agora uma lista literal de 5 dos 6 status — o «escopo do residual» que a justificava deixou de existir

**File:** `scripts/p52_contraste.cjs:291-297`

**Issue:** Na rodada 1 a lista era o ESCOPO declarado do residual (o que a decisão «Entra junto» deixou de fora), e por
isso não a tratei como fotografia. Com o conserto, os seis chips são opacos e os sete cenários são `alvo`; a lista
continua a omitir `cancelada` sem uma razão de hoje. Em termos práticos é pouco: para um par opaco o número não depende
do pixel (min = mediana = max), e quem vigia os descritores do componente — todos, por forma — é o teste. Mas a
pergunta do CLAUDE.md («escopo deliberado ou fotografia que vai envelhecer?») passou a ter a segunda resposta, e um
sétimo status entraria no `STATUS_CONFIG` (o `Record` o exige) sem cenário no medidor.

**Fix:** acrescentar a linha `{ chave: 'cancelada', color: 'text-red-100', bg: 'bg-red-800' }` (vira 8 `alvo` + 1
controle; `CONTRASTE OK: 9 cenario(s) no alvo`) com um comentário «os seis do `STATUS_CONFIG`», ou derivar a lista do
fonte pela mesma forma do teste. Como o medidor está no `--caminhos` e o portão recusa código depois do `reviewed_head`,
isso é código → review novo; **recomendo backlog**, junto com o WR-01.

### IN-05: a segunda metade do IN-02 da rodada 1 não entrou — a linha `CENARIO DESCOLADO DO FONTE` de um `informativo` segue sem dizer «passe o cenário a alvo»

**File:** `scripts/p52_contraste.cjs:25-27,462`

**Issue:** O conserto acrescentou ao cabeçalho a frase «a ÂNCORA dele reprova como a de um alvo: consertado o residual,
o cenário passa a `alvo` no MESMO commit» (resolve a primeira metade, comentário-only). A mensagem de `conferirAncoras`
(`:462`) continua a mesma para `alvo` e `informativo`; quem consertar um dos cinco `painel-*` restantes sem tocar o
medidor vê rc=1 com um texto que não aponta a saída. O 52-30 `<action>` já escreve a regra, então é conveniência.

**Fix (na próxima vez que o medidor mudar):** em `:462`, `${c.tipo === 'informativo' ? ' (informativo: se o residual foi consertado, passe o cenario a alvo no mesmo commit)' : ''}`
no fim da linha.

---

_Reviewed: 2026-10-12T14:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
