---
phase: 48-consertos-da-jornada-bloco-1
plan: 16
subsystem: notificacoes
status: complete
tags: [jorn-15, jorn-u2, d-09, email-templates, notificar-candidato, notificar-rh, executar-direito-titular, update-status-modal, prod]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-07 — montarUrlLogin / normalizarBaseApp / APP_BASE_URL_PADRAO em _shared/email-config.ts; avisos ao titular com /auth/login?redirect=/candidato/privacidade; caminho `node efdeploy.cjs`"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-08 — trg_notif_transicao com historico_id (decisão por transição, inclusive knockout); notificar-candidato com historico_inconsistente"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-10 — trg_notif_cognitivo_liberado + cognitivo_liberado no CHECK + template avaliacao_cognitiva_liberada"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-13 / 48-14 — a frase de reabertura no e-mail e na página do candidato; notificar-candidato v14 / notificar-rh v8 / executar-direito-titular v7"
provides:
  - "DadosEmail.urlLogin + blocoAcessoPainel: todo corpo de candidato termina em «Acessar meu painel» + link por extenso (JORN-U2)"
  - "cópia D-09 na confirmação: «Acompanhe o andamento pelo seu painel a qualquer momento. Avisaremos por e-mail quando houver algo para você fazer ou uma decisão sobre a sua candidatura.» (JORN-15)"
  - "notificar-candidato v16 (PROD): urlLogin = montarUrlLogin(deps.appBaseUrl); wiring lê APP_BASE_URL"
  - "notificar-rh v9 (PROD): APP_BASE_URL_PADRAO re-exportado de _shared/email-config; montarUrlFila/montarUrlListaVaga sobre normalizarBaseApp"
  - "executar-direito-titular v8 (PROD): redeploy com o _shared novo; exceção do recibo pinada em teste"
  - "UpdateStatusModal sem a opção de e-mail sem efeito e com a nota verdadeira (PROD, chunk CandidatosRHPage)"
affects: [48-17, 48-18]

actuals:
  tokens: 10592
  tasks: 3
  commits: 5
plan_head_before: 40af60e13e5af286bb3e6cae3e874e9bf96eb50c

tech-stack:
  added: []
  patterns:
    - "Link do destinatário por PARÂMETRO do corpo, nunca no layout compartilhado: o layout também monta e-mails de outros públicos (RH) e de contas já apagadas (recibo)"
    - "Bloco comum acrescentado num ponto único (renderarEmail) ao fim de todo corpo do Record fechado: evento novo não nasce sem ele"
    - "Testes iteram Object.keys(SUBJECTS) — baseline do próprio código, não lista literal"
    - "Promessa publicada por último: checagem de prontidão (catálogo + bundle vivo) antes de trocar a cópia; a EF da promessa é a última a subir"

key-files:
  created: []
  modified:
    - supabase/functions/_shared/email-templates.ts
    - supabase/functions/_shared/email-config.ts
    - supabase/functions/_shared/__tests__/email-templates.test.ts
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
    - supabase/functions/notificar-rh/helpers.ts
    - supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts
    - supabase/functions/executar-direito-titular/index.test.ts
    - src/components/modals/UpdateStatusModal.tsx
    - src/components/modals/__tests__/UpdateStatusModal.test.tsx
    - src/features/vagas/types/vagasTypes.ts
    - src/features/vagas/services/candidaturasService.ts
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "O bloco de acesso é acrescentado em renderarEmail (CORPOS[evento](d) + blocoAcessoPainel(d.urlLogin)), e não repetido em cada corpo: um só ponto garante que todo evento de candidato, inclusive um 7º futuro, leve o link; layoutBase continua intocado"
  - "A base do link entra por deps.appBaseUrl, e o wiring lê APP_BASE_URL (string vazia = ausente) — mesmo desenho do 48-07: a suíte roda sem --allow-env"
  - "Botão em DEEP_BLUE com texto branco (cores do e-mail do candidato); HTML do botão copiado de notificar-rh"
  - "A ajuda da rejeição no modal também foi corrigida (dizia que o motivo «será enviado ao candidato se a notificação estiver ativada» — a opção saiu e a frase era falsa desde o 48-09)"
  - "Ordem de deploy: notificar-rh e executar-direito-titular primeiro, notificar-candidato (que carrega a promessa) por último"

patterns-established:
  - "Exceção registrada a uma regra de «todo e-mail leva X» tem teste próprio sobre o corpo ENTREGUE pelo handler, não só sobre o helper"

requirements-completed: [JORN-15, JORN-U2]

coverage:
  - id: D1
    description: "Todo corpo de candidato (6 eventos × ramificações de desfecho/veredito/reagendamento) traz «Acessar meu painel» e o link por extenso quando urlLogin vem; nenhum bloco sem urlLogin; link escapado; layoutBase sem link"
    requirement: JORN-U2
    verification:
      - kind: unit
        ref: "supabase/functions/_shared/__tests__/email-templates.test.ts#T-48-16a..f"
        status: pass
      - kind: other
        ref: "node -e (layoutBase sem auth/login|urlLogin|blocoAcessoPainel) — «layoutBase sem link de login»"
        status: pass
    human_judgment: false
  - id: D2
    description: "notificar-candidato monta urlLogin de APP_BASE_URL (ausente/malformada ⇒ https://rh.beautysmile.com.br/auth/login) e o e-mail ENTREGUE o carrega, inclusive na decisão aprovado/rejeitado/knockout; deployada v16"
    requirement: JORN-U2
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts#48-16 (4 testes)"
        status: pass
      - kind: other
        ref: "bundle vivo notificar-candidato v16: «Acessar meu painel» 5×, «urlLogin: montarUrlLogin» presente; POST sem Bearer → 401"
        status: pass
    human_judgment: false
  - id: D3
    description: "Confirmação com a cópia D-09; nenhum corpo promete aviso em cada etapa; publicada só depois da prontidão conferida"
    requirement: JORN-15
    verification:
      - kind: integration
        ref: "checagem de prontidão (p46apply sql READ ONLY + bundle vivo), 2026-09-21T17:21:50Z — decisao_por_transicao/cognitivo_avisa/cognitivo_no_check = true; historico_inconsistente e cognitivo_liberado no bundle"
        status: pass
      - kind: unit
        ref: "supabase/functions/_shared/__tests__/email-templates.test.ts#T-48-16g,h"
        status: pass
      - kind: other
        ref: "bundle vivo notificar-candidato v16: promessa nova 4×, promessa antiga 0×"
        status: pass
    human_judgment: false
  - id: D4
    description: "UpdateStatusModal sem o checkbox sem efeito e sem a frase de promessa, com a nota verdadeira; payload sem notificar_candidato; comentário falso do service corrigido; publicado"
    requirement: JORN-15
    verification:
      - kind: unit
        ref: "src/components/modals/__tests__/UpdateStatusModal.test.tsx#48-16 (4 testes)"
        status: pass
      - kind: other
        ref: "crawler de PROD: «Mudar o status aqui n» PRESENTE em /assets/CandidatosRHPage-C2mVGuH3.js; «Notificar candidato por email» ausente (17:28:23Z)"
        status: pass
    human_judgment: false
  - id: D5
    description: "notificar-rh sobre _shared/email-config (sem a constante duplicada, comportamento idêntico); nenhum e-mail do RH com /auth/login; recibo pós-exclusão sem link (exceção pinada); avisos do titular com /auth/login?redirect="
    requirement: JORN-U2
    verification:
      - kind: unit
        ref: "notificar-rh.test.ts#48-16 (2) + executar-direito-titular/index.test.ts#(p48-16a..c) — 399/399 nas suítes de _shared + três EFs"
        status: pass
      - kind: other
        ref: "notificar-rh v9 / executar-direito-titular v8 deployadas; bundle rh sem «export const APP_BASE_URL_PADRAO =»"
        status: pass
    human_judgment: false
  - id: D6
    description: "Conferência humana dos e-mails na caixa (confirmação com a cópia nova e o botão clicável até o painel)"
    requirement: JORN-U2
    verification: []
    human_judgment: true
    rationale: "Renderização real em cliente de e-mail e o clique até o painel não são observáveis por teste; NOTIFICACOES_MODO='producao' proíbe mandar e-mail a pessoa real para testar cópia — a prova na caixa é do plano 48-18"

duration: 10min
completed: 2026-09-21
---

# Phase 48 Plan 16: Promessa que o sistema cumpre e link para o painel em todo e-mail Summary

**Todo e-mail ao candidato termina num botão «Acessar meu painel» com o link para `/auth/login`. O e-mail de confirmação troca «avisaremos a cada etapa» pela cópia de D-09, que só foi publicada depois de conferido no catálogo e no bundle vivo que toda decisão e toda ação pedida avisam. O modal de status do RH deixou de oferecer um aviso por e-mail que nenhum código enviava.**

## Performance

- **Duração:** ~10 min
- **Início:** 2026-09-21T17:18:54Z
- **Fim:** 2026-09-21T17:28:40Z
- **Tasks:** 3 (1 tracer + 2 auto; Tasks 1 e 2 com TDD)
- **Arquivos modificados:** 12 de código/teste + `deferred-items.md`

## Accomplishments

- **JORN-U2:** o campo `DadosEmail.urlLogin` e a função `blocoAcessoPainel` (botão mais o link por extenso, escapados). `renderarEmail` acrescenta o bloco ao fim de **todo** corpo de candidato. `layoutBase` ficou intocado, porque também monta os e-mails do RH e o recibo pós-exclusão.
- **JORN-15 / D-09:** a confirmação agora diz «Acompanhe o andamento pelo seu painel a qualquer momento. Avisaremos por e-mail quando houver algo para você fazer ou uma decisão sobre a sua candidatura.». A frase antiga saiu de todos os corpos, inclusive dos comentários.
- **Promessa publicada por último e só quando verdadeira.** A checagem de prontidão rodou em 2026-09-21T17:21:50Z, **antes** de a cópia mudar:
  - no catálogo, `decisao_por_transicao`, `cognitivo_avisa` e `cognitivo_no_check` voltaram `true`;
  - no bundle vivo, `historico_inconsistente` e `cognitivo_liberado` estão presentes;
  - o complemento no catálogo confirmou `trg_notif_transicao` com `'avanco'` e `'decisao'` (o knockout entra por `auto_rejeitado ⇒ 'decisao'`) e os 2 triggers de convite ativos.
- **Modal de status:** saíram o checkbox e a frase «O candidato receberá um email…». No lugar entrou a nota «Mudar o status aqui não envia e-mail ao candidato. Ele é avisado por e-mail quando uma decisão é registrada ou quando há algo para ele fazer, e acompanha o resto pelo painel.». O payload não carrega mais `notificar_candidato`, e o comentário «honored server-side/M5» foi corrigido.
- **`notificar-rh`** passou a usar `_shared/email-config.ts`: a constante duplicada saiu e as URLs da fila e da lista são montadas por `normalizarBaseApp`. O comportamento é idêntico, e há um teste de equivalência em 6 bases.
- **Exceção do JORN-U2 pinada:** o recibo que o motor **entrega** não tem link de login, porque a conta já foi apagada. Os avisos de pedido e de cancelamento levam `/auth/login?redirect=`.

## Deploys e publicação (registro)

| UTC | Alvo | Antes → depois | Prova |
|---|---|---|---|
| 17:21:29 | `notificar-candidato` | v14 → **v15** (`verify_jwt=false` preservado) | «Acessar meu painel» 3× no bundle; POST sem Bearer → 401 |
| 17:26:19 | `notificar-rh` | v8 → **v9** (`false`) | `normalizarBaseApp` no bundle, constante duplicada 0×; 401 |
| 17:26:21 | `executar-direito-titular` | v7 → **v8** (`true`) | OPTIONS → 200 |
| 17:26:22 | `notificar-candidato` | v15 → **v16** (`false`), **a promessa, por último** | promessa nova 4×, antiga 0×, botão 5×; 401 |
| 17:27:25 | front (`git push origin main`, `40af60e1..457ccd6e`) | — | `origin/main..HEAD` vazio |
| 17:28:23 | PROD `rh.beautysmile.com.br` | — | «Mudar o status aqui n» em `/assets/CandidatosRHPage-C2mVGuH3.js` (o mesmo hash do build local); «Notificar candidato por email» não é mais servida |

Ledger `notificacoes_enviadas`: nenhum envio nas 3 h anteriores à conferência, portanto nenhuma falha nova atribuível aos deploys.

## Task Commits

1. **Task 1 (tracer): link de login em todo e-mail ao candidato.** RED `10caa2e0` (test) → GREEN `d4a3845e` (feat) → deploy v15.
2. **Task 2: promessa D-09 e modal sem promessa falsa.** RED `f20be032` (test) → GREEN `6511ef88` (feat).
3. **Task 3: `notificar-rh` sobre a base compartilhada, exceção do recibo pinada, deploys e publicação.** `457ccd6e` (refactor).

## Files Created/Modified

- `supabase/functions/_shared/email-templates.ts`: `urlLogin`, `blocoAcessoPainel`, bloco em `renderarEmail` e a cópia D-09.
- `supabase/functions/_shared/email-config.ts`: só o docblock (a base agora é única).
- `supabase/functions/notificar-candidato/index.ts`: `NotificarDeps.appBaseUrl`, `urlLogin` no render e `APP_BASE_URL` no wiring.
- `supabase/functions/notificar-rh/helpers.ts`: re-export de `APP_BASE_URL_PADRAO`; `montarUrlFila` e `montarUrlListaVaga` sobre `normalizarBaseApp`.
- `src/components/modals/UpdateStatusModal.tsx`: sem checkbox, com a nota verdadeira, payload sem o campo e ajuda da rejeição corrigida.
- `src/features/vagas/types/vagasTypes.ts`: `notificar_candidato` removido do request.
- `src/features/vagas/services/candidaturasService.ts`: comentário falso corrigido.
- Testes: `email-templates.test.ts` (T-48-16a..h), `notificar-candidato.test.ts` (4), `notificar-rh.test.ts` (2), `executar-direito-titular/index.test.ts` (p48-16a..c) e `UpdateStatusModal.test.tsx` (4).

## Decisions Made

Ver `key-decisions` no frontmatter. Nenhuma decisão do operador (D-01..D-10, D-20..D-23) foi reaberta. `em_espera` e o avanço entre etapas de trabalho continuam sem e-mail, e a cópia nova não os promete.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ajuda da rejeição no modal prometia enviar o motivo ao candidato**
- **Found during:** Task 2
- **Issue:** `UpdateStatusModal.tsx` dizia «este motivo será enviado ao candidato se a notificação estiver ativada». A frase era falsa (o e-mail de decisão usa a cópia neutra congelada), já estava registrada no deferred do 48-09 e passaria a citar uma opção que esta task remove.
- **Fix:** a ajuda agora diz «este motivo fica no registro interno e não é enviado ao candidato, que recebe por e-mail uma mensagem neutra». Há teste pinando a frase, e o item do deferred foi marcado `resolved`.
- **Files modified:** `src/components/modals/UpdateStatusModal.tsx`, `deferred-items.md`
- **Committed in:** `6511ef88`

**2. [Rule 3 - Blocking] O tipo do payload mora em `vagasTypes.ts`, fora da lista `files` do plano**
- **Found during:** Task 2
- **Issue:** o plano manda remover `notificar_candidato` do «tipo do payload em `candidaturasService.ts`», mas o tipo `UpdateCandidaturaStatusRequest` está em `src/features/vagas/types/vagasTypes.ts`.
- **Fix:** o campo foi removido lá, depois de conferido que nada mais o usa (`grep` em `src/` e `supabase/functions/`).
- **Committed in:** `6511ef88`

**3. [Rule 3 - Blocking] O verify literal `deno test --allow-all supabase/functions/_shared/` herda uma falha pré-existente**
- **Found during:** Tasks 1, 2 e 3
- **Issue:** `supabase/functions/_shared/__tests__/strict-schema.test.ts` é um arquivo **vitest** dentro do diretório Deno e reprova no type-check (TS7053, linha 88). É um item aberto desde o 48-07 em `deferred-items.md`, sem relação com este plano.
- **Fix:** nenhum no arquivo (fora do escopo). As mesmas suítes rodaram sem esse único arquivo: 121/121, depois 178/178, depois **399/399** (`_shared` + `notificar-candidato` + `notificar-rh` + `executar-direito-titular`), com type-check.

**Total:** 3 desvios (1 bug, 2 bloqueios de verificação ou arquivo). **Impacto:** nenhum desvio de escopo; o 1º fecha um item do deferred sobre o mesmo modal.

## Issues Encountered

Nenhum.

## TDD Gate Compliance

- Task 1: RED `10caa2e0`, com 6 falhas por asserção (nenhuma de compilação: os dados com `urlLogin` passam por variável tipada), antes do GREEN `d4a3845e`.
- Task 2: RED `f20be032`, com 2 falhas no Deno e 4 no vitest, todas por asserção, antes do GREEN `6511ef88`.
- Task 3 é `type="auto"` sem TDD. Os testes novos nasceram verdes contra o código anterior de propósito: são a rede de equivalência do refactor.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>`. O link novo é de saída em e-mail e está coberto por T-48-16-01 e T-48-16-02: parâmetro só nos corpos de candidato, só `https:`, default em caso de erro e `escapeHtml`.

## User Setup Required

Nenhum. `APP_BASE_URL` não está configurada nas EFs, então vale o default `https://rh.beautysmile.com.br`, que é o host de produção.

## Next Phase Readiness

- A conferência humana na caixa (confirmação com a cópia nova e o botão até o painel) é do **48-18**.
- 48-17 (compliance da fase) não herda coluna nova deste plano.

---
*Phase: 48-consertos-da-jornada-bloco-1*
*Completed: 2026-09-21*

## Self-Check: PASSED

Arquivos-chave presentes; os 5 commits (10caa2e0, d4a3845e, f20be032, 6511ef88, 457ccd6e) existem e estão em origin/main; EFs v16/v9/v8 ativas; marcador do modal servido em PROD.
