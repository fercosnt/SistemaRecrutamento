---
phase: 51-consertos-da-jornada-bloco-3
plan: 07
subsystem: ui
tags: [jorn-43, jorn-48, raven, painel-candidato, react-query, email-templates, edge-function, guarda, onda-b]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-06: chave raven {liberado, registrado} em get_avaliacao_status, no ar (20261008000001)"
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-04: guarda nomes-instrumentos.grep.test.ts (regra de conteúdo inteiro)"
provides:
  - "AvaliacaoStatus.raven {liberado, registrado} lido da chave do 51-06, coerçor estrito"
  - "RavenCandidatoCard no cartão de cada candidatura do painel (data-testid raven-candidato-card), só liberado, pendente e com a candidatura em andamento"
  - "useStatusRavenCandidato: a query de status com a MESMA chave do AvaliacaoContainer, recortada na chave raven"
  - "consultarLiberacao().ja_respondeu lido de raven.registrado (C-4): quem concluiu não reabre a prova"
  - "AvaliacaoRavenScreen escreve a conclusão no cache (status e liberação) no envio bem-sucedido"
  - "e-mail avaliacao_cognitiva_liberada nomeia o «Raciocínio lógico (Matrizes)» no assunto, no corpo e na prévia, e aponta o card (D-31); notificar-candidato v18 ACTIVE"
  - "guarda nomes-instrumentos varre supabase/functions; a (ii) exige o nome no e-mail"
affects: [51-16, 51-17]

actuals:
  tokens: 27900        # chars/4 sobre o diff realizado 1923e319..ad2790a3 (111477 octetos; só código, fora .planning: 67936 → 16984)
  tasks: 3
  commits: 4           # MEDIDO: git rev-list --count 1923e319..HEAD no momento da escrita
plan_head_before: 1923e319d48c793ad0e25650dc1061ab2dd6d2ab
plan_head_after: ad2790a334bc21ba89154baeaa8a81e483799033

tech-stack:
  added: []
  patterns:
    - "Componente externo decide «encerrada ⇒ null» antes de montar o interno que possui o hook (Rules of Hooks; nenhuma consulta para candidatura encerrada)"
    - "Hook do card em módulo próprio, para que os testes do painel (sem QueryClientProvider) mockem o HOOK e não o componente"
    - "Conclusão escrita no cache (setQueryData nas duas entradas + invalidate do status) logo depois do envio que a torna fato do servidor"

key-files:
  created:
    - src/features/avaliacao-cognitiva/components/RavenCandidatoCard.tsx
    - src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts
    - src/features/avaliacao-cognitiva/components/__tests__/RavenCandidatoCard.test.tsx
    - src/features/avaliacao-cognitiva/__tests__/ravenService.status.test.ts
    - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.conclusao.test.tsx
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-07/task1.json
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-07/task2.json
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-07/task2-deno.txt
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-07/mordida.txt
  modified:
    - src/features/avaliacao/services/avaliacaoService.ts
    - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
    - src/features/avaliacao/components/AvaliacaoContainer.tsx
    - src/components/pages/DashboardCandidatoPage.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx
    - src/features/avaliacao-cognitiva/services/ravenService.ts
    - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
    - supabase/functions/_shared/email-templates.ts
    - supabase/functions/_shared/__tests__/email-templates.test.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
    - src/__tests__/guards/nomes-instrumentos.grep.test.ts

key-decisions:
  - "Publicação na ordem da dependência: o front (card) foi publicado e conferido em PROD ANTES do deploy da EF, porque o e-mail novo aponta para o card. O plano listava o deploy primeiro; os dois saíram do mesmo sha fixado"
  - "notificar-rh e executar-direito-titular NÃO redeployados: as duas importam de _shared/email-templates.ts só escapeHtml e layoutBase, que não mudaram"
  - "Chave de query literal ['avaliacao','status',id] repetida (via avaliacaoStatusKey no hook novo); o AvaliacaoContainer continua com a chave inline — migrá-lo para a fábrica não é deste plano"
  - "O card usa GlassCard compacto e encapsula o stopPropagation no cartão inteiro e no botão"

patterns-established:
  - "Cache escrito no envio: a tela que torna um fato verdadeiro no servidor escreve esse fato nas entradas de cache que outras telas leem (staleTime de 5 min do app)"

requirements-completed: [JORN-43, JORN-48]

coverage:
  - id: D1
    description: "AvaliacaoStatus.raven: {liberado, registrado} lidos da chave raven; ausente → false; folha não booleana → false (RNF-07a)"
    requirement: JORN-43
    verification:
      - kind: unit
        ref: "src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts#raven: lê / ausente / folha numérica"
        status: pass
    human_judgment: false
  - id: D2
    description: "RavenCandidatoCard no painel: aparece só liberado, pendente e com a candidatura em andamento; some se concluído, revogado, encerrada (sem consultar), carregando ou erro; o botão abre a prova sem propagar ao cartão-pai"
    requirement: JORN-43
    verification:
      - kind: unit
        ref: "src/features/avaliacao-cognitiva/components/__tests__/RavenCandidatoCard.test.tsx (9 casos)"
        status: pass
      - kind: integration
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx#card do Raciocínio lógico (Matrizes) + DashboardCandidatoPage.encerrada.test.tsx#com o Raven liberado e pendente"
        status: pass
    human_judgment: false
  - id: D3
    description: "C-4: consultarLiberacao().ja_respondeu vem de raven.registrado; scores_raven não é mais lido; erro vira DATABASE_ERROR. Na conclusão, a tela escreve a conclusão no cache que o painel e ela mesma leem"
    requirement: JORN-43
    verification:
      - kind: unit
        ref: "src/features/avaliacao-cognitiva/__tests__/ravenService.status.test.ts (4 casos)"
        status: pass
      - kind: unit
        ref: "src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.conclusao.test.tsx (3 casos)"
        status: pass
    human_judgment: false
  - id: D4
    description: "E-mail avaliacao_cognitiva_liberada nomeia o «Raciocínio lógico (Matrizes)» (assunto, corpo, prévia) e aponta o card; chave do evento intacta; sem nota, sem nome técnico; notificar-candidato v18 ACTIVE"
    requirement: JORN-48
    verification:
      - kind: unit
        ref: "deno test --allow-all supabase/functions/_shared/__tests__/email-templates.test.ts supabase/functions/notificar-candidato/ → 107 passed, 0 failed"
        status: pass
      - kind: other
        ref: "node efdeploy.cjs notificar-candidato → efdeploy: OK · version=18 · status=ACTIVE · verify_jwt=false; OPTIONS → 200 ok"
        status: pass
    human_judgment: false
  - id: D5
    description: "Guarda nomes-instrumentos varre supabase/functions (fora testes) sob a mesma regra; (ii) exige o nome no e-mail; reprova na base e morde rótulo plantado"
    requirement: JORN-48
    verification:
      - kind: unit
        ref: "src/__tests__/guards/nomes-instrumentos.grep.test.ts (41 casos)"
        status: pass
      - kind: other
        ref: ".red-51-07/mordida.txt (base reprova; 5/5 mutações do T-48-10 mordem; (i) casa rótulo plantado em supabase/functions)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Publicado: push enumerado por sha; origin/main..HEAD vazio; marcador raven-candidato-card em /assets/index-DcLoVKSN.js de PROD"
    requirement: JORN-43
    verification:
      - kind: other
        ref: "verify 2 da Task 3 (remoto = HEAD; crawler PRESENTE em PROD)"
        status: pass
    human_judgment: false
  - id: D7
    description: "O card visto no navegador por um candidato real liberado: posição no cartão, leitura no celular, e a ida e volta painel → prova → painel sem o convite depois de concluir"
    requirement: JORN-43
    verification: []
    human_judgment: true
    rationale: "Aparência e fluxo de sessão real (D-28: telas conferidas no navegador) — nenhum teste automatizado vê a tela renderizada em PROD com um titular de verdade"

duration: 15min
completed: 2026-10-09
---

# Phase 51 Plan 07: o card do Raciocínio lógico (Matrizes) no painel Summary

**O painel do candidato ganhou a porta de entrada do Raven. É um card «Raciocínio lógico (Matrizes)» no cartão de cada candidatura. Ele aparece só com liberação vigente, prova por fazer e candidatura em andamento, e é alimentado pela chave `raven` do 51-06. A tela do Raven passou a saber quando a prova já foi feita (C-4). O e-mail de liberação que já existia agora nomeia o instrumento e aponta para o card (D-31), e `notificar-candidato` está na v18. O guarda de nomes passou a cobrir as Edge Functions.**

## Performance

- **Duration:** ~15 min (04:29:22Z → 04:44:32Z)
- **Tasks:** 3/3
- **Files:** 22 alterados no diff do plano (13 de código modificados, 5 de código criados, 4 de evidência em `.red-51-07/`)

## Accomplishments

- **D-13 / JORN-43.** O card mora fora do `AvaliacaoContainer` e fora do ramo `ehEntrevista`, depois do «Próximo passo». As condições de ausência têm teste: concluída, revogada ou não liberada, encerrada (sem consultar o servidor), carregando e erro.
- **C-4.** `ja_respondeu` deixou de ler `scores_raven`. O titular nunca via essa tabela: a policy compara `candidato_id` com `auth.uid()`. Agora o valor vem de `raven.registrado`. Quem concluiu vê «Você já concluiu» em vez de refazer os 60 itens e falhar no INSERT.
- **Mesma sessão.** Ao concluir, a tela escreve a conclusão no cache do status e da liberação. Sem isso, o painel mostraria o mesmo convite por até 5 min (`staleTime` do app).
- **D-31 / D-14.** O e-mail continua sendo o mesmo evento e a mesma chave, sem aviso novo. Só mudam o assunto, o corpo e a prévia.
- **JORN-48.** O guarda varre `supabase/functions`. A chave técnica `"cognitivo"` e a prosa gerada do export não casam. O e-mail velho reprova pela (ii).

## Publicação (Task 3)

| Passo | Resultado |
|---|---|
| Pin | `refs/gsd/51-07/sha` = `ad2790a334bc21ba89154baeaa8a81e483799033` = HEAD; árvore limpa em `supabase src scripts p46apply.cjs efdeploy.cjs database.types.ts` |
| Build | `npm run build` ok; `grep -rl raven-candidato-card build/assets/` → `build/assets/index-DcLoVKSN.js` (painel do candidato é eager) |
| Push | `98bd0ba3..ad2790a3` por sha, sem force (enumeração abaixo) |
| PROD (front) | crawler: `PRESENTE em PROD: raven-candidato-card ["/assets/index-DcLoVKSN.js"]`. Na 1ª tentativa imediata deu AUSENTE (Vercel ainda publicando); na repetição 2 min depois, 04:43:55Z, PRESENTE. O hash do chunk em PROD é o mesmo do build local |
| Deploy EF (04:44:01Z → 04:44:02Z) | `efdeploy: OK · version=18 · status=ACTIVE · verify_jwt=false · entrypoint=file:///tmp/user_fn_isljnozzlvckrgjjbjwp_e2922753-923b-44bf-8063-0cf4263b5eb3_18/source/functions/notificar-candidato/index.ts` (antes: v17, 2026-09-22, do 49-03) |
| Prova de boot | `OPTIONS /functions/v1/notificar-candidato` → `200 "ok"` (sem efeito colateral: responde antes da auth) |
| Final | `git ls-remote origin refs/heads/main` = HEAD; `git log origin/main..HEAD` vazio |

**Enumeração** (`scripts/p50_enumera.cjs --de 98bd0ba3 --ate ad2790a3`):

```
bda4d25e planning docs(51-06): complete chave raven em get_avaliacao_status plan — SUMMARY, apply, publicacao
1923e319 planning docs(51-06): STATE/ROADMAP — 51-06 concluido, 6/17 (…)
88d6dee1 codigo   test(51-07): RED — chave raven no AvaliacaoStatus e card do Raciocinio logico (Matrizes) no painel
e7d598d0 codigo   feat(51-07): tracer — card do Raciocinio logico (Matrizes) no painel, so liberado e pendente
66e540c2 codigo   test(51-07): RED — Raven nao reabre prova concluida (C-4), e-mail nomeia o Raciocinio logico (Matrizes) (D-31), guarda nas EFs
ad2790a3 codigo   fix(51-07): Raven nao reabre prova concluida (C-4) e e-mail de liberacao nomeia o Raciocinio logico (Matrizes) (D-31)
enumeracao ok: 6 commit(s) em 98bd0ba3..ad2790a3
   98bd0ba3..ad2790a3  ad2790a3… -> main
```

`--caminhos` usado: a allowlist do plano mais `__tests__/DashboardCandidatoPage\.(encerrada|funnel|reaberta)\.test\.tsx` e `supabase/functions/notificar-candidato/__tests__/notificar-candidato\.test\.ts` (ver Desvios 1 e 4).

**Antes do deploy (regra 2 do orquestrador):**
- **O que mais iria no bundle.** O fechamento tem 6 arquivos. O único que mudou desde a v17 (49-03, 2026-09-22) é `_shared/email-templates.ts`, por este plano. Os outros têm o último commit em ou antes do 49-03. A v17 viva foi conferida pela Management API (`version=17`, `updated_at=2026-09-22T21:57:34Z`).
- **Contrato.** O evento, a chave `avaliacao_cognitiva_liberada` e o payload do trigger não mudam. Só o texto muda.
- **Retry de envio antigo.** `notificacoes_enviadas` com `evento='cognitivo_liberado'` tem 3 linhas, todas `entregue`. Nenhuma está `falhou`, então o `notif-retry-sweep` não vai renderizar o texto novo para um aviso antigo.
- **`notificar-rh` e `executar-direito-titular`: não redeployadas.** Elas só importam `escapeHtml` e `layoutBase` do arquivo, e as duas funções não mudaram.

## Task Commits

1. **Task 1 (tracer), RED:** `88d6dee1` (test). Classificador: `RED_EVIDENCE_OK` / `target_test_failed`, no alvo «raven: lê {liberado, registrado} da chave raven (51-06)». Junit em `.red-51-07/task1.json`: 3 falharam e 8 passaram nesse arquivo. O `RavenCandidatoCard.test.tsx`, rodado junto, falhou por **carga**, porque o módulo ainda não existia. Isso não foi usado como evidência RED.
2. **Task 1 (tracer), GREEN:** `e7d598d0` (feat). Tracer feedback gate: modo interativo, `end-of-phase`, verify só automatizado. Rodei o verify de novo depois do commit (33 arquivos e 231 testes verdes; tsc 89) e segui para a Task 2.
3. **Task 2, RED:** `66e540c2` (test). Classificador: `RED_EVIDENCE_OK` / `target_test_failed`, no alvo «raven.registrado = true → ja_respondeu: true». Junit em `.red-51-07/task2.json`: 48 testes, 6 falhas, todas de asserção do comportamento ausente. Deno em `.red-51-07/task2-deno.txt`: T-48-10a/b FAILED, 41 passaram.
4. **Task 2, GREEN:** `ad2790a3` (fix).
5. **Task 3:** sem commit de código. Publicação e deploy a partir de `ad2790a3`.

## Verificação (fim do plano)

| Comando | Resultado |
|---|---|
| `npx vitest run src/features/avaliacao src/features/avaliacao-cognitiva src/components/pages` | 35 arquivos, 238 testes, tudo verde |
| `npx vitest run src/features/avaliacao-cognitiva src/__tests__/guards` | 19 arquivos, 173 testes, tudo verde |
| `deno test --allow-all supabase/functions/_shared/__tests__/email-templates.test.ts supabase/functions/notificar-candidato/` | `ok | 107 passed | 0 failed` |
| `npm run -s lint` | exit 2, **89** `error TS` (≤ 90, D-53; base 89) |
| AC Task 1 | `avaliacao-raciocinio` em `.tsx` fora de testes: 3 (rota, chamada do card, docblock do card) ≥ 2 · `RavenCandidatoCard` no painel: 2 · `raven` no serviço: 7 |
| AC Task 2 | `from('scores_raven')` em `ravenService.ts`: 0 (o docblock explica sem repetir a chamada) · «Raciocínio lógico (Matrizes)» no template: 5 ≥ 3 · `avaliacao_cognitiva_liberada`: 4 ≥ 2 |

## Varredura D-56 / a mordida (`.red-51-07/mordida.txt`)

- **Base** (worktree de `refs/gsd/51-07/base` = `1923e319`, com os arquivos novos copiados). vitest `exit=1`: a (ii) do guarda reprova, e 3 casos do `ravenService.status` reprovam. deno `exit=1`: T-48-10a/b FAILED. Removi o worktree depois.
- **T-48-10 reescrito**, sobre uma cópia de scratch, com controle verde. Cada mutação reprova:
  - M1, «Raven» no corpo: reprova na c.
  - M2, «Matrizes» fora do nome do D-15: reprova na c.
  - M3, o assunto volta ao nome velho: reprova na a e na b.
  - M4, o corpo sem o nome: reprova na a.
  - M5, «nota» no corpo: reprova na a e na c.
- **Guarda (i) em `supabase/functions`.** Plantei um arquivo não rastreado com `"Avaliação cognitiva"` e `"Cognitivo"`, e os dois CASARAM. A chave `["big_five", "cognitivo"]` não casou. Removi o arquivo, e o `git status` ficou sem resto.
- O gate T-48-10c **mudou de direção, não sumiu**. Antes, ele proibia nomear o instrumento. Agora, o nome do produto é obrigatório no assunto, na prévia e no corpo, o nome técnico continua proibido, e «Matrizes» só vale dentro do nome do D-15. A troca está escrita no comentário do bloco T-48-10.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Hook em módulo próprio e mock nos testes do painel**
- **Found during:** Task 1 (GREEN)
- **Issue:** montar o card no painel quebrou 11 testes de `DashboardCandidatoPage.{encerrada,funnel,reaberta}.test.tsx` com «No QueryClient set». Esses arquivos rodam sem `QueryClientProvider` por desenho.
- **Fix:** o card possui `useStatusRavenCandidato` (`src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts`, novo), no molde `AgendamentoCandidatoCard` × `useMeuAgendamento`. Os três testes mockam o **hook** e não o componente, no idioma do `useRetirarCandidatura`. Também acrescentei provas de montagem: no `funnel`, liberado e pendente mostra o card e o botão abre a prova, não a vaga; concluído não mostra. No `encerrada`, o hook diz sempre «liberado e pendente», e mesmo assim rejeitado/finalizado não mostram o card nem chamam o hook, enquanto «em andamento» mostra.
- **Files modified:** hook novo + os 3 testes do painel (fora da lista do plano; `--caminhos` do push estendido para eles)
- **Committed in:** `e7d598d0`

**2. [Rule 3 - Blocking] `AvaliacaoContainer.deriveCardState`: o índice exclui `raven`**
- **Found during:** Task 1 (GREEN)
- **Issue:** com `raven` no `AvaliacaoStatus`, o índice `status?.[cardId as keyof AvaliacaoStatus]` passou a tipar como `AvaliacaoStatusCard | AvaliacaoStatusRaven`, e `.iniciado` não compilava (TS2339).
- **Fix:** `Exclude<keyof AvaliacaoStatus, 'raven'>`, com comentário. Nenhum comportamento mudou.
- **Committed in:** `e7d598d0`

**3. [Rule 1 - Bug] A conclusão não chegava ao cache: o convite sobrevivia à prova**
- **Found during:** Task 2, ao ler `AvaliacaoRavenScreen` contra a verdade «some quando concluído»
- **Issue:** o painel lê o status pelo cache (`staleTime` de 5 min). Depois de concluir e clicar «Ir ao painel», o card mostrava o mesmo «Fazer a avaliação», porque o dado de antes da prova ainda estava fresco. Se o candidato clicasse, a tela reabria a prova pela `['raven','liberacao',id]` em cache. O C-4 só resolve isso numa leitura nova.
- **Fix:** no envio bem-sucedido, `setQueryData` nas duas entradas (`raven.registrado = true` e `ja_respondeu = true`) e `invalidateQueries` do status. O envio com erro não toca o cache.
- **Files modified:** `AvaliacaoRavenScreen.tsx`, mais o teste novo `AvaliacaoRavenScreen.conclusao.test.tsx` (3 casos; os 2 positivos foram RED na base de código, o de erro é não-regressão)
- **Committed in:** `66e540c2` (RED), `ad2790a3` (GREEN)

**4. [Rule 3 - Blocking] O teste de integração da EF pinava o assunto antigo**
- **Found during:** Task 2, no verify do deno (`supabase/functions/notificar-candidato/` faz parte dele)
- **Issue:** «48-10 — cognitivo_liberado com ciclo válido» exigia `/avaliação cognitiva/` no assunto.
- **Fix:** passou a exigir «Raciocínio lógico (Matrizes)» e a proibir o nome velho no assunto.
- **Files modified:** `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` (fora da lista; `--caminhos` estendido)
- **Committed in:** `ad2790a3`

**5. [Ordem] Front antes da EF**
- **Issue:** o plano mandava fazer o deploy primeiro e publicar depois. Mas o e-mail novo diz «Ele está no seu painel, no cartão desta candidatura». Nessa ordem, durante os minutos da publicação da Vercel, um e-mail prometeria um card que ainda não existia.
- **Fix:** push → crawler PRESENTE (04:43:55Z) → deploy (04:44:01Z), os dois a partir do mesmo `refs/gsd/51-07/sha`, com a checagem HEAD = pin e a árvore limpa repetidas no comando do deploy.

**6. [Nota] Fixture da (iii)**
- «Idem, avaliação cognitiva.» já existia como NÃO-casa desde o 51-04. Acrescentei as linhas reais de `supabase/functions` como fixtures: as duas razões do `exportAllowlist.ts`, `CONTEXT_KEYS` e `"cognitivo_itens"`. Também entraram dois rótulos em aspas duplas, no idioma Deno, como CASA.

---

**Total deviations:** 4 auto-fixed (3 Rule 3, 1 Rule 1), 1 de ordem e 1 nota. **Impacto:** nenhuma expectativa ficou mais frouxa. O desvio 3 fecha uma falha real da verdade «some quando concluído», que os testes do plano não pegavam.

## Issues Encountered

- O zsh desta sessão não expande `--include=*.tsx` sem aspas. O AC1 da Task 1 deu 0 assim, e por isso rodei de novo sob `bash -c`, que deu 3. Foi problema de shell, não de código.
- `deno test supabase/functions/_shared/` (mais amplo que o verify) tem uma falha **anterior a este plano** e sem relação com ele: `strict-schema.test.ts` → `ReferenceError: __dirname is not defined`. É um arquivo de sonda do Vitest, que o `deno.json` exclui do runner Deno desde o 22-01. Não está no verify do plano e não foi tocado.

## Known Stubs

Nenhum. O `return null` do card em carregamento e erro é decisão do planejador («um card quebrado no painel é pior que a ausência»), não stub.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`:
- T-51-24: o coerçor só aceita booleanos, e o teste com folha numérica dá `false`.
- T-51-25: as três condições têm teste, e a encerrada nem consulta.
- T-51-26: o e-mail traz só o nome do produto e a vaga, e o grep-guard está verde e morde.
- T-51-27: HEAD = pin e árvore limpa nos comandos do push e do deploy, `--dry-run`, enumeração e push por sha.
- T-51-SC: nenhuma instalação.

## Next Phase Readiness

- O JORN-43 e o JORN-48 seguem **abertos** no REQUIREMENTS. `requirements.ready-ids` deu 0/2, porque o 51-17 também os declara (gate de ID compartilhado).
- Para o 51-17 ou a UAT (D-28): conferir no navegador, com um candidato liberado de teste, o card no cartão e a volta painel → prova → painel sem o convite (D7, `human_judgment`). Um e-mail real de liberação só sai numa liberação nova, porque os 3 do ledger são anteriores.
- O 51-16 (revisão retroativa) pode partir de `refs/gsd/51-07/base` = `1923e319`.

## Self-Check: PASSED

- Arquivos: os 9 de `key-files.created` existem no disco.
- Commits: `88d6dee1`, `e7d598d0`, `66e540c2` e `ad2790a3` são ancestrais de HEAD e estão em `origin/main`.
- PROD: `notificar-candidato` v18 ACTIVE, e o OPTIONS responde 200. O marcador está no `index-DcLoVKSN.js` servido por `rh.beautysmile.com.br`. `origin/main..HEAD` está vazio.
