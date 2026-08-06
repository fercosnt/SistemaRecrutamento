---
phase: 45
plan: "09"
subsystem: "LGPD-OPS · direitos do titular (ERASE-05)"
tags: [erase-05, lgpd, retirada-candidatura, notificacao-rh, vocabulario-fechado, invariante-9]
status: complete

requires:
  - "candidaturas.encerrada_a_pedido_em (20260805000001, VIVA em PROD)"
  - "registrar_pedido_exclusao (20260805000002, VIVA em PROD) — a coluna e o predicado compartilhados"
  - "EF notificar-rh (Phase 42) — o molde e o hospedeiro do 2o evento"
  - "classe_evento_notificacao + trg_guard_marketing_consentimento (20260801000003)"
provides:
  - "public.retirar_candidatura(uuid) — RPC SECURITY DEFINER (autorada, NAO aplicada)"
  - "candidatura_encerrada_a_pedido — 8o valor do vocabulario fechado de evento"
  - "trg_candidatura_encerrada_a_pedido — dispara o aviso ao RH para os DOIS caminhos"
  - "notificar-rh: 2o evento (assunto/corpo/dedupe_key proprios)"
  - "RetirarCandidaturaAcao + useRetirarCandidatura"
  - "v_triagem_panel expoe encerrada_a_pedido_em (Invariante 9)"
affects:
  - "45-10 — tem de acrescentar acao 'retirar_candidatura' ao vocabulario ACOES da EF"
  - "45-11 — aplica as DUAS migrations, com ordem obrigatoria EF -> CHECK -> trigger"

tech-stack:
  added: []
  patterns:
    - "Guard NULL-safe por IS DISTINCT FROM + REVOKE nominal de anon"
    - "Auto-verificacao por bloco DO em subtransacao revertida (metodo da SONDA 6)"
    - "Gate de fidelidade por md5(prosrc) com valor conhecido, antes de CREATE OR REPLACE"
    - "Ponte de tipos Pitfall 10 (temporaria, com condicao de remocao declarada)"

key-files:
  created:
    - supabase/migrations/20260805000007_p45_retirada_e_evento.sql
    - supabase/migrations/20260805000008_p45_v_triagem_panel_encerramento.sql
    - src/features/vagas/components/RetirarCandidaturaAcao.tsx
    - src/features/vagas/hooks/useRetirarCandidatura.ts
    - src/features/vagas/components/__tests__/RetirarCandidaturaAcao.test.tsx
  modified:
    - supabase/functions/notificar-rh/helpers.ts
    - supabase/functions/notificar-rh/index.ts
    - supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts
    - src/components/pages/DashboardCandidatoPage.tsx
    - src/features/triagem/services/triagemService.ts
    - src/features/triagem/components/TriagemTable.tsx
    - src/features/vagas/services/candidaturasService.ts
    - src/features/triagem/components/__tests__/TriagemTable.test.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx

key-decisions:
  - "O CHECK de evento vai a 8 valores, nao 6: o vivo tinha 7, e o plano media 5"
  - "O vocabulario e fechado em TRES sitios — classe_evento_notificacao e o terceiro, e e fail-closed"
  - "varrer_retry_notificacoes ganha 2a clausula de exclusao, senao o evento novo reabre o laco T-42-23"
  - "A view v_triagem_panel precisa da coluna, senao o painel de RH inteiro erra"
  - "O AlertDialog de retirada e glass-branco; a assimetria com o de exclusao E o mecanismo do ERASE-05"

requirements-completed: [ERASE-05]

coverage:
  - deliverable: "retirar_candidatura(uuid) — encerra UMA candidatura sem passar por caminho de rejeicao"
    verification:
      - kind: static-guard
        ref: "guards de forma da migration (8 valores, etapa_atual nunca atribuida, REVOKE nominal)"
        status: pass
    human_judgment: true
    rationale: "Os blocos DO que provam o caminho feliz (etapa_atual intacta, zero linha de trilha, deleted_at NULL) so executam no APPLY, que e do 45-11. Ate la a prova e de FORMA, nao de execucao."
  - deliverable: "8o valor do vocabulario fechado + classe interno + trigger do aviso"
    verification:
      - kind: static-guard
        ref: "CHECK com 8 valores e os 7 vivos preservados; classe_evento_notificacao semeada"
        status: pass
    human_judgment: true
    rationale: "A nao-regressao real (23514 no claim, P0003 do guard fail-closed) so e medida contra o banco vivo no apply."
  - deliverable: "notificar-rh avisa o RH sem nome, sem motivo e sem assunto injetavel"
    verification:
      - kind: test
        ref: "supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts (38 casos)"
        status: pass
    human_judgment: false
  - deliverable: "Retirar minha candidatura no card, com a armadilha de mis-tap fechada"
    verification:
      - kind: test
        ref: "src/features/vagas/components/__tests__/RetirarCandidaturaAcao.test.tsx#(a1)(a2)"
        status: pass
    human_judgment: false
  - deliverable: "A candidatura encerrada e legivel na superficie de RH (Invariante 9)"
    verification:
      - kind: test
        ref: "src/features/triagem/components/__tests__/TriagemTable.test.tsx#Phase 45"
        status: pass
    human_judgment: true
    rationale: "O teste monta rows a mao. A leitura REAL depende da view ganhar a coluna no apply do 45-11 — e foi exatamente esse gap que o tsc pegou e que nenhum teste de unidade pegaria."
  - deliverable: "O caminho ponta a ponta candidato -> EF -> RPC"
    human_judgment: true
    rationale: "NAO FUNCIONA HOJE, por dois motivos conhecidos e alheios a este plano: a EF nao conhece a acao 'retirar_candidatura' (ACOES={pedir,cancelar}) e nao repassa as claims do titular (DI-45-07-01). Ambos sao do 45-10."

metrics:
  duration: "28 min"
  completed: "2026-08-06"
  tasks: 3
  commits: 7
  files: 14

actuals:
  tokens: 34109
  tasks: 3
  commits: 7
---

# Phase 45 Plano 09: Retirada de candidatura + aviso ao RH — Summary

Retirar uma candidatura ganhou caminho proprio no banco (coluna aditiva, zero contato com
qualquer caminho de rejeicao), o RH passou a ser avisado por um 8o evento do vocabulario
fechado sem que o e-mail carregue quem saiu nem por que, e a candidatura encerrada ficou
legivel no funil — com tres defeitos do plano corrigidos antes que virassem incidente.

## Accomplishments

- **`public.retirar_candidatura(uuid)`** — `SECURITY DEFINER`, guard NULL-safe por
  `IS DISTINCT FROM`, `REVOKE` nominal de `anon`. Escreve a **mesma coluna e o mesmo
  predicado** de `registrar_pedido_exclusao`, mudando so o escopo (`id` vs `candidato_id`).
  Um so estado no banco para os dois caminhos — e e por isso que um so evento os cobre.
- **O 8o valor do vocabulario fechado** (`candidatura_encerrada_a_pedido`), com os 7 vivos
  preservados e um bloco `DO` que aborta o apply se algum sumir.
- **`trg_candidatura_encerrada_a_pedido`** — `AFTER UPDATE OF encerrada_a_pedido_em`, com
  guard de transicao em `WHEN` (gate primario) **e** no corpo (sobrevivente). Cobre a
  retirada avulsa e o encerramento em lote porque o guard e sobre a COLUNA, nao sobre quem
  a escreveu.
- **`notificar-rh` de 1 para 2 eventos** — assunto com CR/LF neutralizado, corpo sem
  identificador do candidato **e sem o motivo especifico**, `dedupe_key` por destinatario.
  O claim-before-send ficou com a **logica inalterada** (provado por diff).
- **`RetirarCandidaturaAcao`** — encapsula o `stopPropagation` nos dois pontos, confirma em
  **glass-branco** (nunca destructive), e o card retirado **permanece** na lista com o
  estado por escrito.
- **Invariante 9 fechada** — `encerrada_a_pedido_em` atravessa a view, o service e a
  `TriagemTable` como **palavra**, com tratamento neutro e nenhuma acao oferecida.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] O plano derrubaria dois eventos VIVOS em producao (D-45-09-01)**
- **Found during:** Task 1
- **Issue:** o plano manda recriar o CHECK com "os cinco valores vivos mais o novo" (6). O
  CHECK vivo tem **sete**: `20260730000004` acrescentou `revisao_respondida` e
  `20260801000003:333` acrescentou `divulgacao_vagas`. A `45-UI-SPEC:101` carrega a mesma
  desatualizacao.
- **Confirmado pelo operador no catalogo vivo, e e pior do que eu descrevi:**
  `revisao_respondida` **tem linhas reais** em PROD, entao o `ADD CONSTRAINT` nao falharia
  em silencio — falharia com **23514 no meio do apply do portao destrutivo**.
- **Fix:** CHECK com 8 valores + bloco `DO` que aborta se qualquer um dos 7 vivos sumir.
- **Commit:** `3aa1edb`

**2. [Rule 2 - Missing critical] O vocabulario e fechado em TRES sitios, nao dois (D-45-09-02)**
- **Found during:** Task 1
- **Issue:** `trg_guard_marketing_consentimento` e `BEFORE INSERT` em
  `notificacoes_enviadas` e **fail-closed para classe desconhecida**. Um evento no CHECK sem
  linha em `classe_evento_notificacao` e recusado com `P0003` em **toda** reivindicacao.
  Sem isso, o aviso ao RH seria um **no-op silencioso**, e a assercao (e) do
  `p43_guard_marketing_smoke.sql` reprovaria nos dois sentidos.
- **Fix:** seed com `classe = 'interno'` (precedente exato: `revisao_solicitada`) + bloco
  `DO` que confere os dois sentidos.
- **Commit:** `3aa1edb`

**3. [Rule 2 - Missing critical] O evento novo reabriria o laco T-42-23 (D-45-09-03)**
- **Found during:** Task 1
- **Issue:** `varrer_retry_notificacoes` (viva, roda a cada 15 min) exclui eventos de RH por
  `NOT LIKE 'revisao\_solicitada%'` — prefixo que **nao casa** o evento novo. Uma falha de
  envio ficaria em `falhou`/`tentativas=1`, re-postada por URL fixa contra a EF errada,
  recusada com 400 antes do branch de retry, **selecionada para sempre**, consumindo o
  `LIMIT 20` dos retries legitimos de candidato.
- **Fix:** segunda clausula de exclusao + **gate de md5** que aborta o apply se o corpo vivo
  divergir. O operador mediu `md5(prosrc)=f6147ceb…`/`length=2763`; conferi que o corpo entre
  os cifroes de `20260730000003` hasheia exatamente isso — **zero drift**, entao a base da
  transcricao esta *provada*, nao presumida.
- **Commits:** `3aa1edb`, `cd1c347`

**4. [Rule 3 - Blocker] `triagemService` le uma VIEW que nao tinha a coluna (D-45-09-04)**
- **Found during:** Task 3
- **Issue:** o plano manda acrescentar `encerrada_a_pedido_em` a allowlist do `select`, mas
  aquele service **nao le `candidaturas`** — le `v_triagem_panel`, que nao expunha a coluna.
  O PostgREST derrubaria a consulta **inteira**: o painel de triagem pararia de carregar. Um
  modo de falha **pior** que o silencio que a Invariante 9 proibe.
- **⚠ Nenhum teste de unidade pegaria** — eles montam `rows` a mao. Quem pegou foi o `tsc`.
- **Fix:** migration `20260805000008` (coluna ao FIM, exigencia do `CREATE OR REPLACE VIEW`),
  em arquivo separado porque a legibilidade no RH nao depende do deploy de EF nenhum.
- **Commit:** `7d40502`

**5. [Rule 3 - Blocker] A allowlist do candidato e fail-closed (D-45-09-05)**
- **Found during:** Task 3
- **Issue:** sem a coluna na allowlist de `candidaturasService`, o card nao saberia que a
  candidatura foi retirada — continuaria oferecendo retirar o que ja foi retirado, e o
  estado por escrito nunca renderizaria. O `<behavior>` do proprio plano exige os dois.
- **Commit:** `7d40502`

**6. [Rule 1 - Bug] A montagem quebrou 4 casos vivos do teste de funil**
- **Found during:** Task 3
- **Issue:** `RetirarCandidaturaAcao` introduziu `useQueryClient` no card, e
  `DashboardCandidatoPage.funnel.test.tsx` renderiza sem `QueryClientProvider` por decisao
  declarada. `No QueryClient set`.
- **Fix:** mock do **hook**, no idioma que o proprio arquivo estabeleceu no TIMELINE-02 —
  nunca do componente, que faria o teste parar de notar se a montagem quebrasse.
- **Commit:** `ff72e39`

**7. [Rule 1 - Bug] Dois guards do proprio plano reprovavam codigo correto**
- **`UPDATE[^;]*SET[^;]*etapa_atual`** confunde *ler* `etapa_atual` no `WHERE` (que o plano
  **manda** fazer) com *escrever* nela. **Provado:** a regex reprova a migration irma
  `20260805000002`, **ja viva em PROD**. A propriedade real — zero atribuicoes — mede 0 nos
  dois arquivos. Terceira ocorrencia da classe "grep que reprova a propria spec".
- **`/destructive/`** no teste de cor casaria os fallbacks `aria-invalid:*destructive` da
  base de `buttonVariants()`, que **todo** botao do app herda desde o M1. Afinado para
  `bg-destructive`/`border-destructive`, com prova de contraste contra
  `ConfirmarExclusaoDialog:256`, que os tem de verdade.

**Total: 7 desvios auto-corrigidos** (3 aprovados pelo operador antes das Tasks 2-3; 4
descobertos e corrigidos em execucao). **Impacto:** dois deles — D-45-09-01 e D-45-09-04 —
teriam produzido incidente em producao (abort do apply do portao destrutivo; painel de RH
fora do ar).

## Known Stubs

| Item | Arquivo | Razao / quem fecha |
|---|---|---|
| A EF nao conhece a acao | `useRetirarCandidatura.ts` | `ACOES={pedir,cancelar}` (`executar-direito-titular/index.ts:137`). O caminho do candidato **nao funciona** ate o **45-10** acrescentar a acao **e** repassar as claims (DI-45-07-01). Construido contra o contrato, sem afrouxar guard nenhum. |
| Ponte de tipos temporaria | `triagemService.ts` | `v_triagem_panel` em `database.types.ts` so conhece a coluna apos o apply do **45-11** + `npm run db:types`. Condicao de remocao declarada no docblock. |
| Migrations autoradas, nao aplicadas | as duas | Por desenho: quem aplica e o **45-11**. |

Registrados em `.planning/WINDOWS.md` (ids 17, 18, 19).

## Threat Flags

Nenhuma superficie de seguranca nova fora do `<threat_model>` do plano.

## Issues Encountered

**Ordem obrigatoria para o 45-11, e ela e o controle:**

1. **Deploy da EF `notificar-rh`** com o evento novo — **ANTES** de tudo.
2. `20260805000007` (CHECK + classe + trigger + varredura).
3. `20260805000008` (view) — sem dependencia de ordem.
4. `npm run db:types` e remover a ponte de tipos.

`net.http_post` e **at-most-once**: um trigger apontando para uma EF que nao conhece o
evento perde o aviso num 404 **sem erro em lugar nenhum**.

⚠ O **G1 continua aberto** (`45-SONDAS-PROD.md`): o portao destrutivo do 45-11 nao pode
abrir enquanto o export nao for exercitado ponta a ponta em producao.

⚠ `NOTIFICACOES_MODO` e secret de projeto e o ultimo valor registrado e `producao`. O bloco
`DO` de auto-verificacao e seguro **por construcao** em duas camadas independentes: roda
antes de o trigger existir, e so faz `UPDATE` (um `INSERT` dispararia `trg_notif_confirmacao`,
que manda e-mail ao candidato).

## Verification

| Criterio | Resultado |
|---|---|
| `deno test notificar-rh` | **38 passed, 0 failed** — testes vivos da P42 intactos |
| `npx vitest run src/features/vagas src/features/triagem` | **132 passed** |
| Suite completa | **1688 passed, 1 failed** — exatamente `copyPortoesLgpd.test.ts` (CONSOL-04), a esperada |
| `npm run lint` | **97** (baseline congelada) |
| `npm run build` | verde, incluindo `assert-chunks` |
| `git status --porcelain supabase/functions/notificar-candidato/` | vazio |
| Commits com `--no-verify` | **zero** |

Conferido que os 6 pontos que reprovam o CONSOL-04 vem de `reciboExclusao.generated.ts` e
`exclusaoService.ts` (45-02/45-08) — **nenhum deste plano**.

## Self-Check: PASSED

Todos os arquivos de `key-files.created` existem em disco; os 7 commits existem em
`git log`; os guards de forma e a suite foram re-executados apos o ultimo commit.

## Next

Pronto para **45-10** (que precisa acrescentar `retirar_candidatura` ao vocabulario `ACOES`
da EF e fechar o DI-45-07-01) e **45-11** (apply, na ordem obrigatoria acima).
