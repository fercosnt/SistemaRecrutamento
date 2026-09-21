---
phase: 48-consertos-da-jornada-bloco-1
plan: 14
subsystem: explicacao-painel-candidato
status: complete
tags: [jorn-19, d-01, d-10, d-12, reabertura, prazo, explicacao, painel-candidato, allowlist, vercel]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-11: decisao_final.reaberta_em / prazo_nova_decisao_em; revertida reabre (decisao_final / em_analise, data_decisao_final = NULL); decisao continua rejeitado até a nova decisão"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-13: e-mail «Após a revisão, sua candidatura foi reaberta e será decidida novamente até DD/MM/AAAA.», com a data = prazo − 1 s em SP"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-09: explicacaoService com três origens (humana / automatica / humana_triagem)"
provides:
  - "Página de explicação: estado de reabertura com a MESMA frase e a MESMA data do e-mail; sem linha nem razão de rejeição e sem CTA de revisão"
  - "Painel do candidato: linha data-testid=\"prazo-reabertura\" «Candidatura reaberta — nova decisão até DD/MM/AAAA.» no lugar do SLA «3 dias úteis»"
  - "Select do candidato embute decisao_final ( reaberta_em, prazo_nova_decisao_em ) — só o estado"
  - "formatDataLimiteReabertura em src/lib/datetime/formatDataHoraSP.ts (mesma regra da EF notificar-candidato)"
  - "database.types.ts regenerado (colunas de reabertura do 48-11 + varrer_prazos_reabertura do 48-13)"
affects: [48-15, 48-16, 48-17, 48-18]

actuals:
  tokens: 12600
  tasks: 3
  commits: 5
plan_head_before: 0a2a4a76b2ce4adc0ae6bb6b8936880ac9cc9291

tech-stack:
  added: []
  patterns:
    - "Estado derivado de reaberta_em (e do veredito revertida), nunca de decisao — o banco mantém decisao=rejeitado até a nova decisão"
    - "Embed PostgREST de relação 1:1 tratado como objeto | array | null no leitor"
    - "Frase de D-01 concatenada (prefixo tipográfico + cláusula) igual, letra por letra, à do template de e-mail"

key-files:
  created:
    - src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx
  modified:
    - database.types.ts
    - src/lib/datetime/formatDataHoraSP.ts
    - src/features/explicacao/services/explicacaoService.ts
    - src/features/explicacao/services/__tests__/explicacaoService.test.ts
    - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
    - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
    - src/features/vagas/services/candidaturasService.ts
    - src/features/vagas/types/vagasTypes.ts
    - src/components/pages/DashboardCandidatoPage.tsx
    - supabase/functions/_shared/email-templates.ts

key-decisions:
  - "A página trata como reaberta `reaberta_em` não nulo OU veredito `revertida` (caminho humano): desde o 48-11 o revertida sempre reabre, e a frase «sua candidatura foi reaberta» ao lado de «decidimos não seguir» seria a contradição que o plano elimina. PROD tem 0 linhas revertida (medido)."
  - "Numa candidatura reaberta a página esconde também a razão templated («decidimos não seguir adiante…») e o agradecimento de despedida, não só a linha de resultado — a verdade do plano proíbe «decidimos não seguir» na página, e a razão contém a expressão."
  - "Painel: reaberta com prazo ilegível → «Candidatura reaberta — aguardando nova decisão.» (sem data, e sem voltar ao SLA de 3 dias). A linha mantém o componente PrazoEstimadoLinha, envolto num contêiner com o data-testid."
  - "formatDataLimiteReabertura mora em src/lib/datetime (formatação SP compartilhada) e é usada pela página e pelo painel — uma regra de data só."

coverage:
  - id: D1
    description: "Página de explicação de candidatura reaberta: frase de D-01 com a data do e-mail; sem data se prazo ilegível; sem rejeição vigente nem CTA; mantida/humana/humana_triagem/automatica inalterados"
    requirement: JORN-19
    verification:
      - kind: unit
        ref: "src/features/explicacao (98/98); RED f04d60a2 com 11 falhas por asserção"
        status: pass
      - kind: other
        ref: "grep: «a decisão anterior foi revista» 0× na página; as duas formas da frase de D-01 presentes"
        status: pass
    human_judgment: false
  - id: D2
    description: "Painel: linha prazo-reabertura no lugar do SLA; bordas sem reabertura e encerrada; select com embed de 2 colunas"
    requirement: JORN-19
    verification:
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx (9/9); RED d560908e com 4 falhas por asserção; src/components/pages + src/features/vagas 147/147"
        status: pass
      - kind: integration
        ref: "PostgREST de PROD resolve o embed (coluna inexistente → 42703 em decisao_final_1); candidato simulado sob RLS lê a própria decisao_final (1/1), só leitura"
        status: pass
    human_judgment: false
  - id: D3
    description: "Publicado: suíte inteira verde, build com o marcador, origin/main..HEAD vazio, marcador servido em PROD"
    requirement: JORN-19
    verification:
      - kind: other
        ref: "npm run test:run 2052/2052; build/assets/index-BJdbNpwI.js contém prazo-reabertura e «decidida novamente»; PRESENTE em PROD: prazo-reabertura (mesmo hash de chunk)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Conferência visual com conta real reaberta (página + painel + e-mail lado a lado)"
    requirement: JORN-19
    verification: []
    human_judgment: true
    rationale: "Exige uma reversão real em PROD — é o 48-18 (D-18). PROD tem 0 reaberturas hoje."

duration: 12min
completed: 2026-09-21
---

# Phase 48 Plan 14: o que o candidato vê numa candidatura reaberta · SUMMARY

**A página de explicação e o painel de uma candidatura reaberta passam a dizer o mesmo que o e-mail do 48-13. A página diz «Após a revisão, sua candidatura foi reaberta e será decidida novamente até DD/MM/AAAA.», sem a rejeição revertida e sem CTA de revisão. O painel troca «resposta em até 3 dias úteis» por «Candidatura reaberta — nova decisão até DD/MM/AAAA.». A data é a mesma nas três superfícies: prazo − 1 s, em SP. Está no ar.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-21T16:03Z
- **Completed:** 2026-09-21T16:15Z
- **Tasks:** 3 (Task 1 tracer, Tasks 1–2 em TDD)
- **Files modified:** 11

## Accomplishments

- **Tipos:** `database.types.ts` foi regenerado com `< /dev/null` (215447 octetos). O diff inteiro é o que as migrations 000011 e 000015 explicam: as colunas de reabertura/alerta em `decisao_final` e `decisao_final_historico`, os retornos das RPCs de decisão e `varrer_prazos_reabertura`.
- **Serviço:** a allowlist passou de 6 para 8 colunas, com `reaberta_em` e `prazo_nova_decisao_em`. `alerta_prazo_enviado_em` ficou de fora, com asserção negativa. Os ramos `automatica`/`humana_triagem` devolvem os dois campos nulos.
- **Página:** `COPY_REVISAO.veredito.revertida(data)` monta a frase do e-mail com ou sem data. Numa candidatura reaberta somem a linha de resultado, a razão, o agradecimento e o bloco de revisão/CTA. O bloco «Resultado da revisão» (frase de D-01, «Respondida em …», justificativa) passa a ser a informação principal. A regra 3 (honestidade) do docblock foi atualizada: a frase de D-01 é a única promessa do sistema, e tem código que a executa (48-11 reabre, 48-13 alerta).
- **Painel:** o select do candidato embute `decisao_final ( reaberta_em, prazo_nova_decisao_em )`. O ramo `rotuloReabertura` vem antes do SLA e aplica-se só a candidatura não encerrada com `reaberta_em`. `hasDecisaoFinal` ficou intocado (D-12).

## Task Commits

1. **Task 1 (tracer): página de explicação**: `f04d60a2` (test, RED), `e3e5f861` (feat, GREEN)
2. **Task 2: prazo no painel**: `d560908e` (test, RED), `425b6c14` (feat, GREEN)
3. **Task 3: publicar**: `98877d47` (fix: desbloqueio da suíte, ver Deviations), push `0a2a4a76..98877d47`

## Portão tracer

A verificação da Task 1 rodou de novo antes da expansão: 98/98, frase antiga 0×, frase de D-01 presente e tsc = 90. Passou; seguiu para a Task 2.

## Publicação (D-16)

| O quê | Prova |
|---|---|
| suíte inteira | `npm run test:run`: 205 arquivos, 2052/2052 |
| build | `build/assets/index-BJdbNpwI.js` contém `prazo-reabertura` e `decidida novamente` (chunk eager) |
| embed em PROD antes do push | PostgREST com a chave pública: `decisao_final(nao_existe)` → 400 42703 `decisao_final_1.nao_existe`, ou seja, a relação resolve. Candidato simulado (`SET LOCAL ROLE authenticated`, conta não-`+claude`, transação READ ONLY) → lê a própria candidatura e a própria `decisao_final` (1/1) |
| git | `git log --oneline origin/main..HEAD` vazio depois do push |
| PROD | `PRESENTE em PROD: prazo-reabertura` em `/assets/index-BJdbNpwI.js`, o mesmo hash do build local, na primeira sondagem (~30 s) |

tsc: 90 em todos os commits de código (D-15 ≤ 90). O RED da Task 1 subiu a contagem para 96 de propósito (campos ainda inexistentes no tipo), e o GREEN a trouxe de volta.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] O portão LGPD-04 reprovava a suíte por causa de um comentário do 48-10**
- **Found during:** Task 3 (`npm run test:run`)
- **Issue:** `forbidden-strings.grep.test.ts` varre `supabase/functions/` inclusive comentários. O `e580a144` (48-10) escreveu o termo proibido literalmente em `_shared/email-templates.ts:273`, justamente ao proibi-lo. A suíte ficava vermelha e a publicação desta fase, bloqueada.
- **Fix:** só o comentário mudou («nunca o termo clínico que ela proíbe»). Nenhum byte de lógica, então não houve redeploy: os bundles vivos das EFs diferem só nesse comentário.
- **Files modified:** `supabase/functions/_shared/email-templates.ts`
- **Commit:** `98877d47`

**2. [Rule 2 - Correção] A página esconde também a razão da rejeição e o agradecimento, não só a linha de resultado**
- **Found during:** Task 1
- **Issue:** a razão templated contém «decidimos não seguir adiante». Esconder só a `resultLine` deixaria a página violando a verdade do plano («NÃO diz decidimos não seguir»).
- **Fix:** o ramo reaberto omite linha, razão e agradecimento. O cabeçalho não muda.
- **Commit:** `e3e5f861`

**3. [Rule 2 - Correção] O veredito `revertida` também conta como reaberto, e não só `reaberta_em`**
- **Issue:** uma linha `revertida` sem `reaberta_em` mostraria «sua candidatura foi reaberta» ao lado de «decidimos não seguir». Desde o 48-11, `revertida` sempre reabre (e PROD tem 0 linhas `revertida`, medido).
- **Fix:** `reaberta = origem==='humana' && (reaberta_em || veredito==='revertida')`.
- **Commit:** `e3e5f861`

**4. [Arquivo fora da lista] `src/lib/datetime/formatDataHoraSP.ts` ganhou `formatDataLimiteReabertura`**
- A lista `files_modified` não cita esse arquivo, mas é a formatação SP compartilhada que o `read_first` aponta. Página e painel usam a mesma função, que é a regra da EF `notificar-candidato` (prazo − 1 s).
- **Commit:** `e3e5f861`

**5. [Testes pinados] Asserções antigas atualizadas**
- `explicacaoService.test.ts`: a lista exata da allowlist agora tem 8 colunas (escopo deliberado, não fotografia). A contagem duplicada `toHaveLength(6)` virou 8, com comentário apontando a lista exata como o lugar onde uma coluna nova tem de entrar.
- `ExplicacaoCandidatoPage.test.tsx`: o teste de honestidade proibia `/reabert/` porque «a RPC não reabre o funil», e isso deixou de ser verdade no 48-11. Ele agora proíbe qualquer promessa FORA da frase de D-01 (e `/aprovad/`).

## Observações para os próximos planos

- **48-16:** a página tem as duas formas da frase, e o template de e-mail (`COPY_REVISAO_REVERTIDA` + `.replace(/\.$/, " até ${d}.")`) produz as mesmas duas. O cruzamento automático fica para lá, como planejado.
- **48-17:** a regeneração final de `database.types.ts` não deve mudar nada além do que vier depois do 48-15.
- **48-18:** a conferência visual com uma reversão real (D4) é o único item humano deste plano.
- **Achado fora de escopo (não corrigido):** com a chave pública (anon), `GET /rest/v1/candidaturas?select=id&limit=1` devolveu **200 com um id**. As policies de `decisao_final` são `{PUBLIC}`, mas `candidaturas` parece expor linhas ao anon. Isso é anterior a este plano e não foi investigado. Fica registrado em `deferred-items.md` para triagem.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>`. O embed foi pinado por teste (T-48-14-01): só as 2 colunas, e nada que case `justificativa|revisao_|por_usuario|alerta_prazo|*`.

## Known Stubs

Nenhum.

## Self-Check: PASSED

- Arquivos criados/modificados existem, e os 5 commits aparecem em `git log` (`f04d60a2`, `e3e5f861`, `d560908e`, `425b6c14`, `98877d47`).
- Marcador em PROD: PRESENTE.
