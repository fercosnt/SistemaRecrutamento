---
phase: 48-consertos-da-jornada-bloco-1
plan: 13
subsystem: notificacoes
status: complete
tags: [jorn-19, d-10, d-01, reabertura, prazo, pg_cron, notificar-rh, notificar-candidato, email-templates, smoke, prod]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-11 — decisao_final.reaberta_em / prazo_nova_decisao_em / alerta_prazo_enviado_em; revertida REABRE; registrar_decisao zera o ciclo na nova decisão; A5 (em_espera não é nova decisão)"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-10 — CHECK com 9 valores, notificar-rh v6 / notificar-candidato v13 / executar-direito-titular v6, caminho `node efdeploy.cjs`"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-08 — chave de dedupe por ciclo; 48-06 — portões de vocabulário iterando o CHECK vivo; 48-01 — predicado candidatura_encerrada"
provides:
  - "evento prazo_reabertura_vencido nas cinco obrigações: CHECK (10 valores), classe `interno`, vocabulário de notificar-rh (3 eventos), exclusão em varrer_retry_notificacoes, portões (PROD)"
  - "public.varrer_prazos_reabertura() — SECURITY DEFINER, search_path vazio, EXECUTE só do dono/service_role; SÓ alerta o RH (D-10)"
  - "job pg_cron prazo-reabertura-sweep '0 11 * * *' (08:00 SP) — inventariado em p42_invent05_cron_smoke e cron-inventory.md"
  - "notificar-rh v8: mapa Record<EventoRh, …> no lugar do ternário; chave {c}:prazo_reabertura_vencido:{ciclo}:{user}; corpo sem PII"
  - "e-mail revisao_respondida/revertida: «Após a revisão, sua candidatura foi reaberta e será decidida novamente até DD/MM/AAAA.» (notificar-candidato v14; notificar-rh v8 e executar-direito-titular v7 com o _shared novo)"
  - "supabase/tests/p48_prazo_reabertura_smoke.sql — 6 asserções, subtransação revertida, mordida provada por 3 mutações"
affects: [48-14, 48-15, 48-16, 48-17, 48-18]

actuals:
  tokens: 27600
  tasks: 3
  commits: 6
plan_head_before: d7cfa560c236043d9b414250f487bd5aa37f354c

tech-stack:
  added: []
  patterns:
    - "Migration gerada por script a partir do corpo de outra migration cujo md5 = vivo, mais UM fragmento contíguo; pós-portão md5(replace(prosrc, fragmento, '')) = md5 vivo anterior"
    - "Varredura só-alerta: idempotência por estado (coluna de controle gravada depois do enfileiramento; erro de enfileiramento deixa a linha para o dia seguinte) + FOR UPDATE SKIP LOCKED"
    - "Mapa Record<Evento, {label, template, assunto, corpo, dedupe}> montado uma vez antes do laço claim-before-send: um evento sem entrada não compila"
    - "Mordida de allowlist de cron provada com job intruso agendado dentro de requisição que aborta"

key-files:
  created:
    - supabase/migrations/20260921000015_p48_prazo_reabertura_alerta.sql
    - supabase/tests/p48_prazo_reabertura_smoke.sql
  modified:
    - supabase/functions/notificar-rh/helpers.ts
    - supabase/functions/notificar-rh/index.ts
    - supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts
    - supabase/tests/p42_invent05_cron_smoke.sql
    - docs/compliance/cron-inventory.md
    - supabase/functions/_shared/email-templates.ts
    - supabase/functions/_shared/__tests__/email-templates.test.ts
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts

key-decisions:
  - "Erro de enfileiramento (net.http_post lançou) NÃO marca alerta_prazo_enviado_em: a linha volta na varredura do dia seguinte; só a postagem enfileirada conta no retorno"
  - "ciclo OBRIGATÓRIO para prazo_reabertura_vencido na EF (ausente/null → 400): o único emissor sempre o manda, e sem ele a chave colidiria entre dois prazos"
  - "A data dita ao candidato é validada na forma DD/MM/AAAA também no template; fora da forma → frase sem data (nunca data inventada)"
  - "Corpo do alerta ao RH cita D-23 («quem registrou a decisão revertida não pode registrar a nova») para o RH não perder tempo tentando"
  - "p42_invent05 (a) já era allowlist por nome desde a P46 (D-46-23) — não havia fotografia a converter; o nome entrou em c_herdados (escopo deliberado) e a mordida foi provada duas vezes por execução"
  - "Fixture sintética (@invalido.local) no smoke, como no 48-08..48-11 — o operador pode estar exercitando as contas +claude (48-05)"

requirements-completed: [JORN-19]

coverage:
  - id: D1
    description: "notificar-rh conhece prazo_reabertura_vencido: 3 eventos, rótulo/template/assunto/corpo/chave próprios, ciclo obrigatório, corpo sem PII, irmãos intactos"
    requirement: JORN-19
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts (54/54; RED eb3e04ea com 8 falhas por asserção)"
        status: pass
      - kind: other
        ref: "bundle vivo notificar-rh v7/v8: prazo_reabertura_vencido 7×, montarDedupeKeyRhPrazo 4×; POST sem Bearer → 401"
        status: pass
    human_judgment: false
  - id: D2
    description: "Migration 20260921000015 em PROD: CHECK 10 valores, classe interno, exclusão nova no retry (só o fragmento), varrer_prazos_reabertura DEFINER sem EXECUTE para anon/authenticated, job 0 11 * * *"
    requirement: JORN-19
    verification:
      - kind: integration
        ref: "node p46apply.cjs migrate supabase/migrations/20260921000015_p48_prazo_reabertura_alerta.sql (md5 do ledger BATE 964d046c…; pós-portão interno)"
        status: pass
      - kind: integration
        ref: "ensaio da migration inteira em envelope que aborta antes do apply (varredura=0, fila=0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A varredura alerta uma vez, só o RH, sem decidir; em_espera não impede (A5); nova decisão zera; ACL"
    requirement: JORN-19
    verification:
      - kind: integration
        ref: "supabase/tests/p48_prazo_reabertura_smoke.sql (6/6) + mutações sem-marca → FAIL (a), decide → FAIL (a), ignora em_espera → FAIL (c)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Portões de cron, retry e vocabulário verdes com o objeto novo"
    requirement: JORN-19
    verification:
      - kind: integration
        ref: "p42_invent05_cron_smoke 4/4 (antes da edição: FAIL (a.iii) [prazo-reabertura-sweep]; intruso em envelope: FAIL (a.iii) [sonda-intrusa-48-13]) · p41_recon_retry 5/5 · p43_guard_marketing 9/9 · p42_notif_revisao 4/4 · p37 verde · p48_reabertura 12/12"
        status: pass
    human_judgment: false
  - id: D5
    description: "E-mail da reabertura com a data exata em SP; sem prazo legível, sem data; cópia antiga removida de supabase/functions/; assunto/prévia sem ramificar"
    requirement: JORN-19
    verification:
      - kind: unit
        ref: "email-templates.test.ts#T-48-13a..e + notificar-candidato.test.ts#48-13 (82/82 nos dois; 365/365 nas quatro áreas); RED 564250e6 RED_EVIDENCE_OK"
        status: pass
      - kind: other
        ref: "bundle vivo notificar-candidato v14: prazo_nova_decisao_em 5×, «reaberta e ser» 3×, cópia antiga 0×"
        status: pass
    human_judgment: false
  - id: D6
    description: "Prova com conta real: revertida por RH2/RH3 → e-mail com a data na caixa; prazo vencido → alerta ao RH"
    requirement: JORN-19
    verification: []
    human_judgment: true
    rationale: "Exige commitar uma reversão real com e-mail real (NOTIFICACOES_MODO=producao) e esperar/forçar o vencimento — é o 48-18, por desenho do plano e do D-18"

duration: 16min
completed: 2026-09-21
---

# Phase 48 Plan 13: o prazo da reabertura passa a ter efeito, e o e-mail diz a data · SUMMARY

**Quando o prazo de 10 dias de uma candidatura reaberta vence sem nova decisão, uma varredura diária (`prazo-reabertura-sweep`, 08:00 em SP) alerta o RH pelo evento novo `prazo_reabertura_vencido`. O alerta sai uma vez por ciclo, e a varredura só alerta: não aprova, não rejeita e não toca na candidatura. O evento chegou a PROD registrado nos cinco lugares obrigatórios, com a EF deployada antes da migration. O candidato cuja rejeição foi revertida agora lê «Após a revisão, sua candidatura foi reaberta e será decidida novamente até DD/MM/AAAA.», com a data-limite de São Paulo gravada pelo 48-11. Se o prazo não for legível, a frase sai sem data. A cópia antiga não existe mais em `supabase/functions/`.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-21T15:12:49Z
- **Completed:** 2026-09-21T15:28:19Z
- **Tasks:** 3 (Task 1 tracer)
- **Files modified:** 11

## Ordem de entrega em PROD (UTC)

| Instante | O quê | Prova |
|---|---|---|
| 15:12 | Medido antes: predicado da varredura = **0 linhas** (0 reaberturas), fila vazia, `varrer_retry_notificacoes` md5 `06fd990e…`/3104 = corpo da P45 (zero drift) | só leitura |
| 15:15:12 | `notificar-rh` **v7** (antes v6, `verify_jwt=false` preservado) | marcador no bundle; POST sem Bearer → 401 |
| 15:18 | ensaio da migration inteira em envelope que aborta | todos os portões passaram; varredura=0; nada persistiu |
| 15:19:01 | migration **20260921000015** | ledger md5 `964d046c21f261ec567fe7d080742e3b` **BATE** (26875 octetos) |
| 15:27:36 | `notificar-candidato` **v14** (false) | `prazo_nova_decisao_em` 5×, cópia antiga 0×; 401 |
| 15:27:38 | `notificar-rh` **v8** (false) — `_shared/email-templates.ts` mudou depois da v7 | evento de prazo 7×; cópia nova 3×; 401 |
| 15:27:39 | `executar-direito-titular` **v7** (true) | OPTIONS → 200 |

`git log origin/main..HEAD` ficou vazio depois de cada commit que acompanhou um deploy ou apply. No log de borda dos 20 minutos seguintes só aparecem as minhas próprias sondas, sem nenhum 5xx.

## Estado instalado (lido de volta)

| Objeto | Depois |
|---|---|
| CHECK `notificacoes_enviadas_evento_check` | 10 valores (+ `prazo_reabertura_vencido`) |
| `classe_evento_notificacao` | `prazo_reabertura_vencido` → `interno` (10 linhas) |
| `varrer_retry_notificacoes()` | md5 `14d8d5cb6613332c3d05176a8b82602d`, 3500. Sem o fragmento, volta a `06fd990e…` |
| `varrer_prazos_reabertura()` | md5 `8407510d618883efcf28b4af826e509f`, `prosecdef`, ACL `{postgres, service_role}` |
| `cron.job` | 5 jobs ativos. `prazo-reabertura-sweep` (jobid 9) `0 11 * * *`, `md5(command)` `1ebd8e45…` = arquivo |

## Accomplishments

- **Só alerta (D-10).** A varredura seleciona as linhas com `reaberta_em` preenchido, prazo vencido e sem alerta, de candidatura não excluída e não encerrada (`candidatura_encerrada`). Ela posta ids-only para `notificar-rh` com o `ciclo` (epoch do prazo) e grava `alerta_prazo_enviado_em`. Não há escrita em `candidaturas` nem chamada à RPC de decisão, o que o pós-portão confere no corpo instalado e o smoke (a) confere por efeito.
- **As cinco obrigações do evento, na mesma entrega.** A exclusão nova em `varrer_retry_notificacoes` é um único fragmento contíguo, e o pós-portão prova que não mudou mais nada.
- **`notificar-rh`.** Com três eventos, o ternário virou um mapa `Record<EventoRh, …>`: um 4º evento sem entrada não compila. O laço claim-before-send não mudou. A chave é por destinatário e por ciclo. O corpo não traz nome, e-mail nem id do candidato, cita o D-23 e leva à lista da vaga.
- **E-mail da reabertura (D-01).** A frase é pinada letra por letra, com e sem data. A data é a de SP, calculada como prazo − 1 s; um teste pina que não é a data de UTC. Um prazo malformado é tratado como ausente, tanto na EF quanto no template. Com `mantida`, nada de data. Assunto e prévia seguem sem ramificar (T-42-V2c).

## Task Commits

1. **Task 1 (tracer): o alerta de ponta a ponta**
   - `eb3e04ea` test: RED (8 falhas por asserção; símbolos lidos por namespace, a suíte carrega)
   - `8eb68ca1` feat: EF com o 3º evento (54/54), deploy v7
   - `5f7c58f9` feat: migration aplicada em PROD
   - Portão do tracer (interativo, `end-of-phase`, verify só `<automated>`): re-executei o verify de ponta a ponta. Deu 54/54, o marcador aparece no bundle e o md5 do ledger é igual ao do arquivo. Segui para a expansão.
2. **Task 2: portões do cron e do retry, smoke do prazo:** `473f9dd8` test
3. **Task 3 (TDD): a cópia da reabertura com a data**
   - `564250e6` test: RED (9 falhas por asserção; `RED_EVIDENCE_OK`)
   - `a0467e53` feat: GREEN (82/82), com a limpeza dos casts do RED; três deploys

## Verificação

| Portão | Resultado |
|---|---|
| `deno test notificar-rh/` | 54/54 |
| `deno test` notificar-candidato + `_shared` (sem o vitest) + notificar-rh + executar-direito-titular | **365/365**; `deno check` das três importadoras ok |
| Verify estático da migration (plano) | OK |
| `p48_prazo_reabertura_smoke.sql` | **6/6**. Mutações em envelope: sem marca → FAIL (a); escrevendo na candidatura → FAIL (a); ignorando `em_espera` → FAIL (c). Depois delas, função viva intacta (`8407510d…`) |
| `p42_invent05_cron_smoke.sql` | Antes da edição, **FAIL (a.iii) `[prazo-reabertura-sweep]`**. Depois, 4/4. Com um job intruso em envelope, FAIL (a.iii) `[sonda-intrusa-48-13]`, sem persistir |
| `p41_recon_retry_smoke` | 5/5 (substrings e ausência do papel privilegiado preservadas) |
| `p43_guard_marketing` · `p42_notif_revisao` · `p37_fidelidade_schema` | 9/9 · 4/4 · verde (gate interno (k)) |
| `p48_reabertura_smoke` (regressão 48-11) | 12/12 |
| Varredura de portões (D-17) | 273 linhas no padrão (36 + 3 nos pontos cegos). As linhas que tocam os objetos deste plano são escopo deliberado: `p41` (e) `v_n <> 1` é a cardinalidade de um job nomeado, e `p42_invent05` (a.ii)/(c)/(d) `<> 1` idem. A única lista, `c_herdados`, é o escopo declarado do INVENT-03. Não havia fotografia a converter |
| `grep "a decisão anterior foi revista" supabase/functions/` | 0 |
| `tsc` (hook) | 90 (teto D-15: 90) |
| Resíduo em PROD | 0 titulares `p48psmoke-%`; fila `pg_net` 0; `decisao_final` 6, arquivo 7, histórico 50, candidaturas 33 (iguais às de antes) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Desvio da letra, no idioma do 48-08..48-11] O smoke usa fixture sintética, e não candidatura real de conta de teste**
- **Found during:** Task 2
- **Issue:** o plano pede para montar a reabertura «numa candidatura real de conta de teste». O orquestrador informou que o operador pode estar exercitando as contas `+claude` (48-05), e um UPDATE nelas, mesmo revertido, disputa lock com o fluxo vivo.
- **Fix:** titulares `@invalido.local` e atores reais, ativos, lidos na execução. O corpo que a RPC e a varredura processam é o mesmo. O smoke também exige que o predicado REAL devolva 0 linhas no início; sem isso, o «devolve 1» não discriminaria a fixture.
- **Committed in:** `473f9dd8`

**2. [Nota do orquestrador × estado vivo] O `p42_invent05` (a) não tinha fotografia a converter**
- **Issue:** a nota 5 do orquestrador (e o exemplo do CLAUDE.md) descreve (a) como `count(*) <> 3`. Essa conversão já foi feita na P46 (D-46-23), e hoje (a) é uma allowlist por nome. O próprio cabeçalho a declara escopo deliberado e manda acrescentar o nome do job novo no mesmo commit.
- **Fix:** o nome entrou em `c_herdados`, que é o que o plano pede, e não virou constante nova. «Prove que ainda morde» foi cumprido duas vezes por execução: o arquivo sem edição reprovou nomeando o job, e um intruso agendado em envelope reprovou pelo nome.

**3. [Rule 1 — bug do próprio teste, duas vezes] Contagens do smoke mediam o acumulado da fixture, não o delta da varredura**
- **Found during:** Task 2, nos primeiros runs
- **Issue:** (a) contou as 6 postagens ao candidato que a MONTAGEM da fixture enfileira (`decisao` e `revisao_respondida`), e (d) contou o `revisao_solicitada` ao RH. A varredura não tinha postado nada disso.
- **Fix:** (a) mede o delta antes/depois da chamada; (d) filtra pelo evento `prazo_reabertura_vencido`. Depois, as três mutações provaram que as asserções mordem pelo motivo certo.

**4. [Rule 3 — verify herdaria falha pré-existente] `deno test … supabase/functions/_shared/` reprova pelo `strict-schema.test.ts` (vitest)**
- Pré-existente e já registrado (48-07 e 48-10 em `deferred-items.md`). Rodei os mesmos diretórios sem esse único arquivo: 365/365.

**5. [Anotação] O `migrate` do `<verify>` não é re-executável**
- No tracer gate, conferi `md5(statements[1])` do ledger = md5 do arquivo em vez de reaplicar. Antes do apply, o ensaio rodou a migration inteira num envelope que aborta.

---

**Total deviations:** 1 Rule 1 (teste), 1 Rule 3 (herdado), 1 desvio de fixture com precedente, 1 divergência nota × estado vivo, 1 anotação.
**Impact:** nenhum muda o que o plano prova. O nº 3 foi pego pelo próprio smoke antes de qualquer commit.

## TDD Gate Compliance

- **Task 1 (tracer, não-TDD, feito em TDD):** RED `eb3e04ea` → GREEN `8eb68ca1`.
- **Task 3 (`tdd="true"`):** RED `564250e6`. O alvo é «T-48-13a — revertida COM prazo…», que falhou por asserção; TAP 82 testes, 9 falhas; `check tdd-red-evidence` → `RED_EVIDENCE_OK`. GREEN `a0467e53` (82/82). O REFACTOR (remoção dos casts `as never` do RED) foi no mesmo commit do GREEN.

## Issues Encountered

- O primeiro envelope de ensaio falhou na compilação (`%%` literal no RAISE vindo do `printf`). Nada foi aplicado; confirmei o estado por leitura e refiz.

## Threat Flags

Nenhuma superfície fora do `<threat_model>`. T-48-13-01 (ACL, smoke (e) + pós-portão), T-48-13-02 (exclusão no retry, `p41` verde), T-48-13-03 (sem escrita em `candidaturas`: verify, pós-portão e smoke (a)), T-48-13-04 (coluna de controle + chave por ciclo e destinatário), T-48-13-05 (corpo sem PII, teste), T-48-13-06 (data de SP com teste; ausente ⇒ sem data), T-48-13-SC (nada instalado).

## Known Stubs

Nenhum.

## Next Phase Readiness

- **48-14 (página do candidato):** `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx:110` ainda diz a cópia antiga, e o teste dela a pina. A frase do e-mail, pinada aqui, é «Após a revisão, sua candidatura foi reaberta e será decidida novamente até DD/MM/AAAA.» (sem data: «… novamente.»). O 48-16 cruza os dois arquivos.
- **48-15 (RH):** o alerta aponta para a lista da vaga. Um badge de «prazo vencido» na fila seria a superfície durável. O e-mail é at-most-once: se o roster estiver vazio no dia, o alerta fica marcado sem ninguém ter recebido.
- **48-17:** a classe nova (`interno`) e o 5º cron já estão inventariados. O veredito de export das colunas do ciclo segue com o 48-17 (item do 48-11).
- **48-18 (prova com conta real):**
  - `SELECT reaberta_em, prazo_nova_decisao_em, alerta_prazo_enviado_em FROM decisao_final WHERE candidatura_id = …`;
  - o e-mail `revisao_respondida` com «até DD/MM/AAAA» igual a `(prazo em SP) − 1 dia`;
  - para o alerta, forçar o vencimento só com autorização do operador (é UPDATE retroativo) ou esperar o prazo. Depois, `SELECT dedupe_key FROM notificacoes_enviadas WHERE evento='prazo_reabertura_vencido'` → uma linha por RH, com o ciclo.
- Efeito colateral conhecido (Defeito 3b, fora de escopo): o UPDATE de `alerta_prazo_enviado_em` gera um snapshot em `decisao_final_historico`.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260921000015_p48_prazo_reabertura_alerta.sql
- FOUND: supabase/tests/p48_prazo_reabertura_smoke.sql
- FOUND commits: eb3e04ea, 8eb68ca1, 5f7c58f9, 473f9dd8, 564250e6, a0467e53
- FOUND ledger: 20260921000015 (964d046c…)

---
*Phase: 48-consertos-da-jornada-bloco-1*
*Completed: 2026-09-21*
