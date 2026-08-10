---
phase: 47-transpar-ncia-consolida-o
plan: 07
subsystem: frontend
tags: [rpc, historico, consol-02, visrh-03, pii-guard, lgpd, tdd, ui-spec]

requires:
  - phase: 47-transpar-ncia-consolida-o
    provides: "public.listar_historico_candidatura(uuid) — APLICADA em PROD (20260809000001), ledger reconciliado, smoke 6/6, md5 byte-perfect. Devolve `ator_rotulo text`; o uuid do ator nunca sai da função"
  - phase: 34-hub-do-candidato
    provides: "historicoCandidaturaService + HistoricoBlock — a allowlist nomeada e o feed read-only que este plano reescreve"
  - phase: 45-motor-de-exclusao
    provides: "a severação de historico_candidatura.ator — a origem do resíduo declarado D-47-U09, aceito e não corrigido"
provides:
  - "listHistorico() lendo pela RPC — o uuid do ator não tem nenhum caminho até o cliente"
  - "HISTORICO_ALLOWLIST como contrato EXECUTÁVEL das colunas da RPC (projetarLinha)"
  - "HistoricoBlock com os quatro rótulos no tamanho de rótulo (D-47-U07)"
  - "historicoAtorRotulos.test.tsx — os quatro recortes um a um + as negativas"
affects: [47-08-uat]

actuals:
  tokens: 21500
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Allowlist EXECUTÁVEL: a constante de colunas é a fonte de `projetarLinha`, que copia só o que ela nomeia — uma coluna acrescentada num `CREATE OR REPLACE` futuro não alcança nem a tela nem o cache do TanStack Query"
    - "Mock de `supabase.from` que LEVANTA: a projeção direta da tabela vira armadilha executável, não uma convenção que a próxima pessoa desconhece"
    - "Os quatro recortes exercitados UM POR VEZ com as negativas aplicadas em todos — um teste só do caminho feliz passaria com a colisão de rótulos presente"

key-files:
  created:
    - src/features/hub-candidato/components/__tests__/historicoAtorRotulos.test.tsx
  modified:
    - src/features/hub-candidato/services/historicoCandidaturaService.ts
    - src/features/hub-candidato/services/__tests__/historicoCandidaturaService.test.ts
    - src/features/hub-candidato/components/HistoricoBlock.tsx

key-decisions:
  - "O nome literal da tabela de usuários de RH não aparece NEM EM COMENTÁRIO no serviço — o guard automático varre o módulo inteiro, e afrouxá-lo para distinguir prosa de código deixaria de pegar uma string literal em rota de consulta"
  - "`as never` pré-regen na chamada da RPC: a função está viva em PROD, mas `database.types.ts` só é regenerado por `npm run db:types` (Supabase CLI `--linked`), indisponível nesta máquina — e instalar o CLI é uma instalação de pacote, proibida pelo M8"
  - "A linha de metadado do componente foi religada ao `ator_rotulo` já no commit do tracer, não na Task 2 — o gate de tipos congelado (97) proíbe commitar uma árvore type-broken e `--no-verify` é zero"
  - "O resíduo D-47-U09 é ACEITO e escrito no docblock do tipo, não corrigido: um quinto rótulo informaria a um recrutador que aquela pessoa exerceu o direito de exclusão"

requirements-completed: [CONSOL-02]

coverage:
  - id: D1
    description: "O Histórico exibe um dos quatro rótulos resolvidos no servidor — nunca um identificador, nunca célula vazia, nunca traço, nunca a linha omitida"
    requirement: CONSOL-02
    verification:
      - kind: unit
        ref: "historicoAtorRotulos.test.tsx — os quatro recortes um por vez + a negativa aplicada nos quatro (forma de uuid, célula vazia, traço solto) + a contagem de `<li>`"
        status: pass
    human_judgment: false
  - id: D2
    description: "O serviço lê pela RPC e o uuid do ator não chega ao cliente em nenhum caminho"
    requirement: CONSOL-02
    verification:
      - kind: unit
        ref: "historicoCandidaturaService.test.ts — o mock de `from` levanta; o uuid não atravessa nem quando o servidor o devolve"
        status: pass
      - kind: other
        ref: "guard automático do plano sobre o serviço (`.rpc(` presente, projeção direta ausente, tabela de usuários de RH ausente do módulo inteiro) → OK"
        status: pass
    human_judgment: false
  - id: D3
    description: "A allowlist continua explícita, nomeia o rótulo, e não contém projeção total, e-mail nem identificador de usuário de RH"
    requirement: CONSOL-02
    verification:
      - kind: other
        ref: "guard automático do plano — `OK — allowlist: etapa_de, etapa_para, ator_rotulo, criterio_texto, criado_em`"
        status: pass
      - kind: unit
        ref: "historicoCandidaturaService.test.ts — a allowlist não casa `/\\bator\\b(?!_)/`, não contém email/usuario_id/user_id"
        status: pass
    human_judgment: false
  - id: D4
    description: "A linha de metadado subiu para o tamanho de rótulo na div inteira, e o nome renderiza íntegro"
    requirement: CONSOL-02
    verification:
      - kind: unit
        ref: "historicoAtorRotulos.test.tsx — asserção estrutural na `div.mt-1` (contém text-sm, não contém text-xs) + fixture de nome longo sem truncate/line-clamp/title"
        status: pass
      - kind: other
        ref: "guard automático do plano sobre o componente → OK, 13 casos"
        status: pass
    human_judgment: false
  - id: D5
    description: "A recusa por escopo de vaga é distinguível de uma falha de rede, sem eco de código cru"
    requirement: CONSOL-02
    verification:
      - kind: unit
        ref: "historicoCandidaturaService.test.ts — 42501 → FORBIDDEN; a mensagem não contém '42501', o nome da tabela nem 'permission denied'"
        status: pass
    human_judgment: false
  - id: D6
    description: "A tela em PROD com dado real — os quatro rótulos vistos por um recrutador"
    requirement: CONSOL-02
    verification:
      - kind: manual
        ref: "47-08 UAT no hub do candidato visto pelo RH"
        status: pending
        note: "O contrato do servidor JÁ está provado em PROD (smoke 6/6, assertion (e) exercitou os quatro rótulos). O que resta é a confirmação visual da tela."
    human_judgment: true

duration: 12min
completed: 2026-08-10
status: complete
---

# Phase 47 Plan 07: O Histórico mostra quem agiu, por nome — e o uuid do ator perde o último caminho até a tela

**O `listHistorico` passa a ler pela `listar_historico_candidatura` (viva em PROD, smoke 6/6), o campo de uuid do ator sai do tipo do cliente e dá lugar ao `ator_rotulo` resolvido no servidor, a `HISTORICO_ALLOWLIST` deixa de ser um comentário versionado e vira um guard EXECUTÁVEL, e a linha de metadado do `HistoricoBlock` sobe de 12px para 14px com os quatro rótulos provados um a um.**

## Performance

- **Duração:** ~12 min
- **Tarefas:** 2 (1 tracer + 1 auto), ambas TDD RED→GREEN
- **Arquivos criados:** 1 · **Modificados:** 3
- **Commits:** 4 (2 pares `test(...)` → `feat(...)`), **zero `--no-verify`**

## Accomplishments

- **O uuid do ator não tem mais nenhum caminho até o cliente — e isso é asserido, não afirmado.**
  O campo saiu de `HistoricoRow`, a leitura direta da tabela saiu do serviço, e o teste vai além do
  tipo: a fixture faz o servidor devolver um uuid **e** um `id` de linha, e a asserção exige que nem
  um nem outro atravessem. Um `CREATE OR REPLACE` futuro que acrescente coluna sem revisão de
  privacidade encontra `projetarLinha` no caminho.

- **A allowlist deixou de ser decorativa.** Ela continua exportada e explícita (o guard do plano
  confere), mas agora `HISTORICO_COLUNAS` deriva **dela** e `projetarLinha` copia **só** o que ela
  nomeia. Antes ela era uma string passada ao `select`; a partir daqui ela é o que executa. A razão
  de origem continua escrita no docblock e não mudou: a RLS é row-level e **não esconde coluna**.

- **A projeção direta da tabela virou armadilha executável.** O mock de `supabase.from` no teste do
  serviço **levanta** com a razão escrita. Uma convenção que vive só em docblock é uma convenção que
  a próxima pessoa desconhece; esta falha alto, com o motivo, no primeiro `npm run test:run`.

- **A recusa por escopo de vaga ficou distinguível de uma falha de rede.** `42501` — levantado por
  **dois** guards distintos do corpo da RPC (papel NULL-safe e escopo de vaga copiado de
  `rh_le_historico`) — mapeia para `FORBIDDEN` com copy pt-BR. E o teste assere o **negativo**: a
  mensagem não carrega o código, nem o nome da tabela, nem `permission denied`. Um `42501` de
  Postgres é um mapa da RLS oferecido de graça.

- **Os quatro rótulos estão provados um por vez, não em bloco.** Um teste só do caminho feliz
  passaria com a colisão da Correção factual 3 presente. Os quatro recortes rodam isolados, e as
  negativas (forma de uuid, célula vazia, traço solto, linha omitida) rodam nos **quatro**. Mais a
  asserção de que "Não identificado" — que já significa falha de resolução nas Phases 42/43/44 — não
  aparece em lugar nenhum.

- **A subida de tipografia é asserida ESTRUTURALMENTE**, na `div`, porque é invisível num teste de
  texto — e é exatamente o que a D-47-U07 compra. O nome se separa da data por **peso e opacidade**;
  nenhum dos quatro rótulos recebe cor, ícone ou selo, e o teste varre `svg` e classes de alerta nos
  quatro.

- **Três afirmações falsas saíram do repositório.** O docblock do serviço dizia *"candidate DB-denied
  via `rh_le_historico`"* — verdade sobre a montagem da tela, **falsa sobre o banco**: a policy
  `candidato_le_proprio_historico` continua viva, e quem barra o candidato é o guard de papel dentro
  da função. As outras duas (o caminho de leitura e o significado de ator nulo) foram corrigidas
  junto. Manter uma declaração sem executor é o gênero exato de defeito que esta fase existe para
  remover.

## Task Commits

Cada tarefa em par TDD, com o hook de pre-commit rodando e passando — **zero `--no-verify`**.

1. **Task 1 (tracer): o serviço lê pela RPC**
   - `90bc70c` — `test(47-07)`: RED, 11 asserções falhando / 1 passando
   - `90ef30d` — `feat(47-07)`: GREEN, serviço rewired + a religação mínima do componente
2. **Task 2: a linha de metadado**
   - `d38dfda` — `test(47-07)`: RED, 2 falhando / 11 passando (as duas de tipografia)
   - `6f1fe9d` — `feat(47-07)`: GREEN, 13/13

## Decisions Made

- **O nome literal da tabela de usuários de RH não aparece no serviço nem em comentário.** O guard
  automático do plano varre o módulo inteiro por aquele token. O reflexo fácil seria afrouxar o gate
  para distinguir prosa de código — e um gate assim deixaria de pegar uma **string literal em rota de
  consulta**, que é precisamente o que ele existe para pegar. O docblock passou a dizer "a tabela de
  usuários de RH", a mesma forma que o próprio plano usa em todas as suas proibições, e ganhou uma
  linha explicando por que o literal não está ali — para que ninguém o "reponha por clareza".

- **`as never` na chamada da RPC, com a janela declarada.** A função está **aplicada e provada em
  PROD**, mas `database.types.ts` é gerado por `npm run db:types`, que exige o Supabase CLI `--linked`
  — não instalado aqui, e instalá-lo é uma instalação de pacote, proibida pelo M8 e excluída do
  auto-fix. As alternativas eram piores: editar `database.types.ts` à mão é proibido pelo CLAUDE.md,
  e um cast do próprio `supabase.rpc` esconderia a chamada do guard `/\.rpc\(/`. O idioma pré-regen é
  o vivo do repositório (`triagemService.ts:486`), e o comentário nomeia o que o remove.

- **O cliente não reordena e não re-limita.** `.order()` e `.limit()` saíram: a RPC já faz
  `ORDER BY criado_em DESC LIMIT 100`. Duplicar a ordenação criaria dois lugares para ela divergir, e
  o de cá venceria em silêncio. O teste assere a ordem **de chegada** preservada, com fixture fora de
  ordem cronológica — se o cliente reordenasse, ele reprovaria.

- **O resíduo D-47-U09 foi escrito no lugar onde alguém vai lê-lo.** Não numa nota de plano, mas no
  docblock do campo `ator_rotulo`, ao lado dos quatro significados. Quem for consertar "o bug de a
  inscrição dizer Sistema" encontra ali a razão de não ser um bug.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] A religação do componente teve de entrar no commit do tracer**

- **Encontrado durante:** Task 1, ao commitar o GREEN
- **Problema:** o plano confina a Task 1 a dois arquivos ("Nenhum arquivo fora dos dois deste task foi
  tocado"). Mas remover o campo de uuid de `HistoricoRow` deixa `HistoricoBlock.tsx:68`
  (`row.ator ?? 'Sistema'`) referenciando um campo inexistente → **98 erros `tsc`**. O hook de
  pre-commit é um gate de **não-regressão** congelado em 97 e reprova; e `--no-verify` é zero por
  invariante do M8 e do próprio plano (`<verification>`: "contagem `tsc` ≤ 97; zero `--no-verify`").
  As duas regras não podiam ambas valer com a árvore type-broken.
- **Correção:** a Task 1 aplicou a **troca mínima de valor** (`{row.ator ?? 'Sistema'}` →
  `{row.ator_rotulo}`), e só ela. A tipografia, o peso, a opacidade, os comentários e todo o backstop
  de teste ficaram integralmente na Task 2. Também é o que um `type="tracer"` pede: a fatia fina que
  chega **até a tela**.
- **Arquivos:** `src/features/hub-candidato/components/HistoricoBlock.tsx` (uma expressão)
- **Verificação:** `tsc` de volta a 97; suíte 1828 (baseline 1823); guard da Task 1 → OK.
- **Commit:** `90ef30d`

**2. [Rule 1 - Bug] O docblock do `HistoricoBlock` afirmava a regra que a fase acabara de remover**

- **Encontrado durante:** Task 2
- **Problema:** o docblock dizia *"author (`ator`, or 'Sistema' when null)"* — a derivação client-side
  que este plano existe para eliminar. Deixá-lo convidaria a reintroduzir o fallback como "conserto".
- **Correção:** reescrito para registrar que a autoria chega resolvida do servidor em quatro rótulos,
  que o componente não decide rótulo nenhum, e que os três estados ficaram inalterados. É documentação
  — nenhuma linha de renderização a mais foi tocada.
- **Arquivos:** `src/features/hub-candidato/components/HistoricoBlock.tsx`
- **Commit:** `6f1fe9d`

### Desvios de forma (documentados, não auto-fixes)

**3. O RED da Task 1 acessa o campo novo por alias de tipo, não diretamente.** `rows[0].ator_rotulo`
sobre `HistoricoRow` é erro de tipo **enquanto o RED é o RED** — e o hook reprovaria o commit do RED,
tornando o gate TDD impossível de satisfazer honestamente. O teste declara `LinhaEsperada` (o contrato
que ele prova) e acessa via `asLinhas()`: type-safe nos dois estados, e **RED em runtime** antes do
GREEN, que é onde o sinal tem de estar. A prova em tempo de **compilação** não foi perdida — ela mudou
de arquivo: as fixtures de `historicoAtorRotulos.test.tsx` são `HistoricoRow` literais, então só
typecheckam se o tipo carrega `ator_rotulo` e não exige mais o uuid.

**4. `projetarLinha` não estava no plano.** O plano pede a allowlist "explícita e exportada"; a
projeção executável é endurecimento, clonado do precedente vivo de `retencaoService`. Sem ela a
allowlist seria uma string que ninguém lê depois do `select` ter sumido — decorativa no exato momento
em que a fase a promove a contrato.

**5. O portão de tracer foi satisfeito pelo `<verify>` automatizado, não por checkpoint humano.**
Mesma razão registrada em 47-02, desta vez com um segundo motivo: o plano declara `autonomous: true` e
não tem nenhuma tarefa `checkpoint:*`, e no instante do tracer a linha de metadado ainda estava a
12px — parar ali pediria a um humano que verificasse visualmente um estado que a Task 2 seguinte
descarta por desenho. O `<verify>` do tracer foi re-executado end-to-end (41 testes do hub, guard OK,
suíte completa 1828, `tsc` 97) antes de a Task 2 começar.

**6. Duas asserções a mais que o plano pedia:** que "Não identificado" não apareça (a palavra já
significa falha de resolução em três fases anteriores) e que o estado vazio continue rendendo a copy
da 34-UI-SPEC. Ambas são backstop do "byte-idêntico" que o plano exige; nenhuma relaxa contrato.

---

**Total de desvios:** 2 auto-fixes + 4 desvios de forma documentados.
**Impacto no plano:** nenhum scope creep. Um arquivo a mais tocado na Task 1, por uma linha, forçado
pelo gate de tipos.

## Issues Encountered

- **Nada foi aplicado, executado nem deployado.** Zero migration, zero MCP, zero `execute_sql`, zero
  contato com PROD. Este plano edita TypeScript/TSX. Zero dependências npm novas.
- **`database.types.ts` não conhece a RPC** porque não foi regenerado desde o apply. Registrado em
  `.planning/WINDOWS.md` como pendência (ver Known Stubs) — é a única dívida que este plano deixa.

## Verificação final

| Gate | Resultado |
|---|---|
| `npm run test:run` | **1841 passed / 183 files** (baseline 1823 — +18, zero regressão) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada 97 — sem regressão) |
| Guard automático da Task 1 (RPC, sem projeção direta, sem tabela de RH, allowlist) | **OK** |
| Guard automático da Task 2 (13 casos, sem truncate, sem largura fixa, text-sm, sem fallback, sem alerta, `aria-hidden`) | **OK** |
| `check:export-allowlist` / `check:recibo-exclusao` / `check:matriz-retencao` / `check:pii-inventory-md` | **exit 0** nos quatro |
| `portoesInvocados.test.ts` | **7 passed** |
| Dependências npm novas | **0** |
| `--no-verify` | **0 usos** — o hook rodou e passou nos 4 commits |
| Migrations aplicadas / deploys | **0** |

## Known Stubs

Nenhum stub de código. **Uma dívida de regeneração, declarada e roteada:**

| Item | Arquivo | Por quê |
|---|---|---|
| `as never` pré-regen na chamada da RPC | `historicoCandidaturaService.ts` (`listHistorico`) | `listar_historico_candidatura` está viva em PROD mas ausente de `database.types.ts`. `npm run db:types` exige o Supabase CLI `--linked`, não instalado — e instalá-lo é uma instalação de pacote, proibida pelo M8. O comentário no código nomeia exatamente o que remove o cast. **Não afeta o comportamento em runtime**: a chamada, os parâmetros e o mapeamento de erro estão cobertos por teste. |

## Threat Flags

Nenhuma superfície nova além da que o `<threat_model>` do plano registrou. As cinco mitigações
(`T-47-07-01` a `T-47-07-05`) estão implementadas e cobertas por asserção executável.
`T-47-07-06` (D-47-U09) permanece `accept`, agora escrito no docblock do campo `ator_rotulo` — no
código, onde quem for "consertá-lo" vai ler.

## User Setup Required

Nenhuma. Nenhum serviço externo, nenhuma variável de ambiente, nenhuma dependência npm.

## Next Phase Readiness

- **47-08 (UAT) está desbloqueado.** O contrato do servidor já está provado em PROD (smoke 6/6, com a
  assertion (e) exercitando os quatro rótulos); o que resta é a confirmação visual no hub do candidato
  visto pelo RH. O recorte que mais merece o olho humano é o **majoritário**: "Sistema" nas transições
  automáticas.
- **Quando alguém rodar `npm run db:types`**, remover os dois `as never` de `listHistorico` e conferir
  que a contagem `tsc` continua ≤ 97.
- **Resíduo a NÃO consertar durante o UAT:** a linha de inscrição de um titular excluído lê "Sistema".
  É a D-47-U09, e a razão está no docblock de `ator_rotulo`.

## Self-Check: PASSED

Os 4 artefatos declarados existem em disco e os 4 commits de tarefa existem em `git log`. Verificado
por execução, não por leitura.

---
*Phase: 47-transpar-ncia-consolida-o*
*Completed: 2026-08-10*
