---
phase: 52-hub-do-rh-dados-e-contato
plan: 31
subsystem: database
tags: [rpc, security-definer, rls, supabase, postgres, react, vitest, smoke, mutacoes, push-por-sha, vercel, gap-closure, uat, lgpd]

requires:
  - phase: 52-30
    provides: "o pin refs/gsd/52-30/sha (70528fba) — diff_base do review e base da enumeração do push; o último código publicado antes deste plano"
  - phase: 52-26
    provides: "52-APLICACOES.json (instante de cada apply p52), p52_portao.cjs, p50_enumera.cjs e a 0005 (o último apply antes deste)"
  - phase: 52-01
    provides: "o molde da 20261011000001 (PRE/POS, ACL com REVOKE nominal de anon), p52_ensaio.cjs e p52_mutacoes.cjs"
provides:
  - "public.ler_vagas_das_minhas_candidaturas() em PROD (migration 20261011000006, aplicado_ate 2026-10-12T21:04:42Z; md5 do ledger 810bbace769390c8ab1b78324ecc388b = arquivo; prosecdef true; anon sem EXECUTE, authenticated com) — título e departamento da vaga das próprias candidaturas vivas, em qualquer status e com deleted_at, só para o papel candidato"
  - "listCandidaturas mescla titulo/departamento da RPC só nas linhas com embed vaga nulo (RPC_VAGAS_DAS_MINHAS_CANDIDATURAS, mesclarVagasDasCandidaturas, lerVagasDasMinhasCandidaturas com cast estreito); marcadores painel-vaga-titulo e painel-vaga-departamento no cartão"
  - "smoke52p (10 cláusulas (a)–(j)) e mutações P1–P10 no p52_mutacoes.cjs; o ensaio conhece a 0006 (MIGS na ordem de aplicação, par 52p)"
  - "o G-52-7 no ar em https://rh.beautysmile.com.br (chunk index-CFPYr-z6.js), push por sha 70528fba..b0945868 com o pin refs/gsd/52-31/sha = 954b3e4b"
  - "52-REVIEW-G7-1.md (critical 0 · warning 2 · info 9) e 52-31-DECISAO.md (aplicar; WR-01 backlog, WR-02 ao 52-32; R1 plano-novo 52-32, R2 aceitar, R3 backlog, R4 aceitar; janela única confirmada)"
  - "conferência no ar do operador aprovada nos itens 1–2 (d31c78bb com título e departamento; controle f59e7281 igual); itens 3–4 não testados"
affects: [52-32, 52-19, 52-20, verify-work-52, fecho-da-fase-52]

# chars/4 sobre as linhas acrescentadas do diff realizado eec21fc2..e2d83872 (222679 chars, .planning incluído; este SUMMARY fora)
actuals:
  tokens: 55670
  tasks: 6
  commits: 16
plan_head_before: eec21fc2bfea4bf3d24569e9b5394a2188fc2d0a
plan_head_after: e2d838722d7014b39e8c630395eae114138a249c

tech-stack:
  added: []
  patterns:
    - "Leitura do titular atravessando a RLS de outra tabela: RPC SECURITY DEFINER sem argumento (posse por auth.uid(), IDOR e oráculo impossíveis por construção), guarda de papel fail-closed antes da primeira busca, allowlist por jsonb_build_object explícito e POS que varre v.<coluna> por forma"
    - "Cliente: a RPC só é chamada quando o embed veio nulo, no máximo uma vez por leitura; mescla só os campos da allowlist, nunca sobrescreve embed presente; erro = fallback sem eco"
    - "Registro entre sessões em arquivo separado (52-31-FRONTEIRA.md, linha fronteira_retomada por parada) — o SUMMARY só nasce depois da última task humana e o dobra sem reescrever as saídas"

key-files:
  created:
    - supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql
    - supabase/tests/p52_painel_vaga_smoke.sql
    - src/features/vagas/services/__tests__/candidaturasService.vagaInativa.test.ts
    - src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7-1.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-31-DECISAO.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-31-FRONTEIRA.md
  modified:
    - src/features/vagas/services/candidaturasService.ts
    - src/components/pages/DashboardCandidatoPage.tsx
    - scripts/p52_ensaio.cjs
    - scripts/p52_mutacoes.cjs
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-UAT.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-APLICACOES.json

key-decisions:
  - "D-52-G7-1 (operador, verbatim: «Decidir explicitamente o caso de vaga com deleted_at (minha inclinação: o candidato continua vendo o título da própria candidatura).»; confirmada por escrito na Task 4: «D-52-G7-1: confirmo»): a RPC não filtra vagas.status nem vagas.deleted_at — título e departamento em todo status não ativo e com a vaga apagada"
  - "D-52-G7-2 (planejador): só o papel candidato passa a guarda; rh e administrador recebem 42501 (o RH lê vagas pela própria RLS e pelo SELECT_LISTA_RH, intocados)"
  - "D-52-G7-3 (planejador): uma chamada sem argumento, RETURNS jsonb [{candidatura_id, titulo, departamento}] das candidaturas vivas, ordem created_at DESC, id; posse = o predicado de candidato_le_propria_candidatura"
  - "D-52-G7-4 (planejador, medido): projeção só titulo e departamento — o cartão não lê mais nada da vaga; o embed vaga:vagas de listCandidaturas fica; RPC só com embed nulo, no máximo uma vez por leitura (até duas por carga do painel)"
  - "D-52-G7-5 (planejador, medido): database.types.ts não muda neste plano; cast estreito confinado a lerVagasDasMinhasCandidaturas(); o gerador rodou só como prova (função presente, +2/−1 linhas); quem retira o cast: o 52-32, que regenera os tipos (decisão do operador)"
  - "D-52-G7-6 (planejador, medido): vaga inexistente com candidatura viva é impossível no banco (vaga_id NOT NULL, FK ON DELETE CASCADE); o fallback «Vaga não encontrada»/«N/A» fica, provado por Vitest; a cláusula (j) vigia a premissa pelo catálogo"
  - "D-52-G7-7 (planejador): número 20261011000006; no MIGS do ensaio entra depois da 0005 e antes da 0004 (ordem de aplicação)"
  - "Operador (Task 4, 2026-10-12 17:59 -03): janela única confirmada; R1 plano-novo (52-32, antes do 52-19); R2 aceitar; R3 backlog; R4 aceitar (tipos regenerados no 52-32); WR-01 backlog; WR-02 entra no 52-32; INFO IN-01..IN-09 aceitar"
  - "Operador (Task 6, 2026-10-12 ~18:15 -03): «aprovado» — itens 1 e 2 vistos no ar; itens 3 e 4 não testados (R2 já aceito; item 3 coberto pelo Vitest (5))"

patterns-established:
  - "RPC do titular no molde do 52-31 (guarda de papel → posse por auth.uid() → allowlist por jsonb_build_object → POS por forma → smoke por papel com mordida por mutação) — é o molde que o 52-32 pede para os três leitores residuais"
  - "Plano dividido em sessões de executor com registro bruto em <plano>-FRONTEIRA.md; o SUMMARY dobra as seções byte a byte e a FRONTEIRA fica no repositório"

requirements-completed: [JORN-59]

coverage:
  - id: D1
    description: "RPC ler_vagas_das_minhas_candidaturas em PROD com posse fail-closed, allowlist titulo/departamento e ACL do molde; o cartão do painel mescla título e departamento da RPC quando o embed da vaga vem nulo; marcadores publicados no chunk index de PROD"
    requirement: JORN-59
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs --sem-migracoes supabase/tests/p52_painel_vaga_smoke.sql (contra o vivo, depois do apply) → ENSAIO VERDE · smokes=[52p=10/10]"
        status: pass
      - kind: integration
        ref: "node scripts/p52_mutacoes.cjs --pos-apply --so=P1..P10 → MUTACOES: 10/10 mordem; controle verde; nada persistiu (pos-apply)"
        status: pass
      - kind: other
        ref: "verify 1 da Task 5 (só leitura em PROD): ledger = arquivo; RPC no contrato de catálogo; anon e PUBLIC sem EXECUTE, authenticated com; ultimo apply da fase = 20261011000006 2026-10-12T21:04:42Z"
        status: pass
      - kind: unit
        ref: "npx vitest run src/features/vagas src/components/pages/__tests__ → 23 arquivos, 224 testes verdes (candidaturasService.vagaInativa.test.ts 13 casos; DashboardCandidatoPage.vagaInativa.test.tsx casos (1)–(5)); delta alteradas=0 · novas=0 · mordida=ok"
        status: pass
      - kind: other
        ref: "automated da Task 6 → PRESENTE em PROD (chunk index): painel-vaga-titulo e ler_vagas_das_minhas_candidaturas em /assets/index-CFPYr-z6.js (21:07:18Z, 21:09:41Z, 21:17:33Z)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Conferência no ar pelo operador: o cartão da d31c78bb (+cand1, Entrevista online, vaga 629a5f31 inativa) mostra «[TESTE E2E] Social Media junior 1— Produção e Captação de Conteúdo» e «Marketing», sem «Vaga não encontrada» nem «N/A»; controle f59e7281 igual, com a linha de prazo"
    requirement: JORN-59
    verification: []
    human_judgment: true
    rationale: "Defeito visível ao titular: teste verde não prova a tela publicada (memória «render em cache não é conferência visual»). Resposta do operador verbatim na § Task 6 — «aprovado», itens 1 e 2 vistos, com print do item 1"
  - id: D3
    description: "Item 3 da conferência — o diálogo «Retirar minha candidatura» da d31c78bb nomeia a vaga pelo título vindo da RPC"
    requirement: JORN-59
    verification:
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx#painel do candidato — candidatura de vaga inativa (G-52-7) > (5) o diálogo de «Retirar minha candidatura» da vaga inativa nomeia a vaga pelo título da RPC (R4 da §Task 2: vermelho sem a mescla)"
        status: pass
    human_judgment: true
    rationale: "Não testado pelo operador no ar (item opcional do how-to-verify; «3. Diálogo de retirada: não testado»). A cobertura é só o Vitest (5) com mordida medida; quem quiser o olho humano precisa abrir o diálogo e sair por «Voltar», nunca confirmar a retirada (escreve em PROD)"
  - id: D4
    description: "Item 4 da conferência — o clique no cartão da d31c78bb leva a /vagas/…, que diz «Vaga não encontrada ou não está mais ativa» (R2, fora deste plano)"
    verification: []
    human_judgment: true
    rationale: "Não testado pelo operador («4. Clique no card → /vagas/…: não testado»). Comportamento esperado e aceito por escrito (residual_detalhe_vaga: aceitar, 52-31-DECISAO.md); nenhum teste deste plano o cobre porque ele não muda"

duration: 1h 26m
completed: 2026-10-12
status: complete
---

# Phase 52 Plan 31: G-52-7 — título e departamento da vaga inativa no painel do candidato por RPC com guarda de posse — Summary

**O painel do candidato voltou a mostrar título e departamento da vaga da própria candidatura quando o RH pausa, fecha, arquiva ou apaga a vaga: a RPC `public.ler_vagas_das_minhas_candidaturas()` (SECURITY DEFINER, sem argumento, só o papel `candidato`, só `titulo` e `departamento`) está em PROD pela migration `20261011000006` (`aplicado_ate` `2026-10-12T21:04:42Z`, o último apply da fase), provada contra o vivo pelo smoke52p 10/10 e pelas mutações P1–P10. O `listCandidaturas` chama a RPC só quando o embed da vaga vem nulo. A mudança foi publicada por push por sha (`70528fba..b0945868`, pin `954b3e4b`, 22 commits, 0 ALHEIO) e está no chunk `index-CFPYr-z6.js` de PROD. O operador conferiu no ar a `d31c78bb` da +cand1, com «[TESTE E2E] Social Media junior 1— Produção e Captação de Conteúdo» / «Marketing», e aprovou. O diálogo de retirada e o clique para `/vagas/…` não foram testados por ele.**

## Performance

- **Duration:** 1h 26m de relógio de parede, em três sessões de executor (A: Task 1; B: Tasks 2–3; C: Tasks 4–5). No meio entraram o review do orquestrador e duas paradas do operador (decisão da Task 4, conferência da Task 6).
- **Started:** 2026-10-12T19:49Z (início da sessão A, FRONTEIRA §Task 1; primeiro commit `0606acdb` às 19:58:33Z)
- **Completed:** 2026-10-12T21:15Z (≈ resposta do operador à Task 6, 18:15 -03); este SUMMARY às ~21:20Z
- **Tasks:** 6 (tracer · auto tdd · auto · checkpoint:decision · auto [BLOCKING] · checkpoint:human-verify)
- **Files modified:** 13 — 8 de código, teste e arnês (migration, smoke, `p52_ensaio.cjs`, `p52_mutacoes.cjs`, serviço, página, dois testes) e 5 de planejamento (review, decisão, FRONTEIRA, emenda do UAT, registro do apply)

## Accomplishments

- **Task 1 (tracer, sessão A).** Migration `20261011000006` no molde da 0001: PRE/POS `P52-06`, guarda de papel fail-closed, posse por `auth.uid()`, allowlist por `jsonb_build_object` e ACL com REVOKE nominal de `anon`. O ensaio passou a conhecer a 0006. Smoke52p (a)–(c): `ENSAIO VERDE … smokes=[52p=3/3]`, com controle negativo vermelho sem a 0006. No cliente, RED (`a103a180`, «Vaga não encontrada» reproduzido) → GREEN (`38d65421`, mescla em `listCandidaturas` + dois `data-testid`). Nada aplicado.
- **Task 2 (sessão B).** Smoke52p completo, com 10 cláusulas (a)–(j). Mutações P1–P10 mordem cada uma na sua letra; a rodada completa morde 27/27. Regressão `52l=20/20` com e sem a 0006. Os testes novos do serviço (13 casos) e os casos (3)–(5) do painel mordem por mutação temporária (R1–R4 `RED_EVIDENCE_OK`). Delta da suíte `alteradas=0 · novas=0 · mordida=ok`, lint 89 = base, tipografia OK e os marcadores no `index-CFPYr-z6.js` local.
- **Task 3 (sessão B).** Os leitores residuais do embed foram diagnosticados com sondas só leitura (`f73682b6` em `avaliacao_assincrona` sem cards; 2/16 com currículo; 11/16 sem departamento; 16/16 com a página de detalhe negando a vaga). A emenda datada do G-52-7 entrou no `52-UAT.md` (D-52-G7-1, D-52-G7-4), com a truth e o status intactos.
- **Task 4 (sessão C + orquestrador + operador).** Review `52-REVIEW-G7-1.md`: critical 0 · warning 2 · info 9, «nada crítico e nada destrutivo». `PORTAO OK` no modo revisão. A decisão escrita do operador está em `52-31-DECISAO.md`: aplicar, janela única confirmada, D-52-G7-1 confirmada, residuais e WR com dono.
- **Task 5 (sessão C).** Pin `refs/gsd/52-31/sha` = `954b3e4b`. Re-medição verde e apply pelo portão no mesmo comando do registro (`aplicado_ate 2026-10-12T21:04:42Z`, md5 bate). Provas em PROD verdes (catálogo, ACL, smoke contra o vivo, P1–P10 `--pos-apply`). O db:types rodou só como prova. Push por sha `70528fba..b0945868`, e os marcadores ficaram PRESENTES no chunk index de PROD às 21:07:18Z, por deploy automático da Vercel.
- **Task 6 (operador).** «aprovado»: itens 1 e 2 vistos no ar; itens 3 e 4 não testados (§ Task 6).

## Task Commits

Ledger do plano (`.git/gsd-plan-head-before-52-31`) = `eec21fc2` (o tracking do planejamento). `git rev-list --count eec21fc2..e2d83872` = **16**, em ordem:

1. **Task 1 (sessão A):** `0606acdb` feat(52-31): ler_vagas_das_minhas_candidaturas — o candidato le titulo e departamento da vaga das proprias candidaturas em qualquer status (G-52-7)
2. **Task 1 (sessão A):** `e7f4054d` chore(52-31): p52_ensaio conhece a 20261011000006 (MIGS na ordem de aplicacao, par 52p)
3. **Task 1 (sessão A):** `e307fd78` test(52-31): smoke52p (tracer — dono le vaga inativa, outro candidato nao, allowlist exata)
4. **Task 1 (sessão A, RED):** `a103a180` test(52-31): painel com vaga inativa mostra titulo e departamento (vermelho antes do conserto)
5. **Task 1 (sessão A, GREEN):** `38d65421` fix(52-31): painel do candidato mescla titulo e departamento da RPC quando o embed da vaga vem nulo (G-52-7)
6. **Task 1 (sessão A, fronteira):** `b92ed23a` docs(52-31): registro entre sessoes §Task 1 — tracer verde (fronteira de retomada da sessao A)
7. **Task 2 (sessão B):** `b326a215` test(52-31): smoke52p completo (10 clausulas) e mutacoes P1-P10
8. **Task 2 (sessão B):** `587481ac` test(52-31): a mescla do servico e os casos restantes do painel (erro da RPC, embed presente, dialogo de retirada)
9. **Task 3 (sessão B):** `17b50429` docs(52-31): emenda datada do G-52-7 no UAT — vaga com deleted_at mostra o titulo (D-52-G7-1); a leitura entrega so titulo e departamento (D-52-G7-4)
10. **Tasks 2–3 (sessão B, fronteira):** `133429d1` docs(52-31): registro entre sessoes §Tasks 2-3 — residuais medidos e emenda do UAT (fronteira da sessao B) — o `reviewed_head` do review
11. **Task 4 (orquestrador, review):** `e6fbeaf9` docs(52-31): review adversarial do G-52-7 — 52-REVIEW-G7-1 (critical 0, warning 2, info 9)
12. **Task 4 (sessão C, parada interna):** `68b7ad3b` docs(52-31): registro entre sessoes §Task 4 — review G7-1 no portao, perguntas ao operador
13. **Task 4 (sessão C, decisão):** `2721ef71` docs(52-31): decisao do G-52-7 — aplicar sobre 52-REVIEW-G7-1 (warnings 2: WR-01 backlog, WR-02 ao 52-32; R1 plano-novo 52-32, R2 aceitar, R3 backlog, R4 aceitar)
14. **Task 4 (sessão C, fechamento = pin):** `954b3e4b` docs(52-31): registro entre sessoes §Task 4 — decisao do operador registrada — `refs/gsd/52-31/sha`
15. **Task 5 (sessão C, registro do apply):** `b0945868` docs(52-31): instante do apply da 20261011000006 (D-41 emendada, condicao 1 — ultimo apply da fase) — o sha empurrado
16. **Task 5 (sessão C, fronteira):** `e2d83872` docs(52-31): registro entre sessoes §Task 5 — apply, provas e push (fronteira antes da conferencia) — local, não empurrado

**Task 6:** nenhum commit além deste SUMMARY. **Plan metadata:** o commit deste SUMMARY (`docs(52-31): SUMMARY — G-52-7 fechado: …`), sozinho.

## Registro das Tasks 1–5 — dobrado de `52-31-FRONTEIRA.md`

As seções abaixo são as linhas 11–907 de `52-31-FRONTEIRA.md` (HEAD `e2d83872`), copiadas byte a byte por máquina, sem reescrever nenhuma linha de saída. A FRONTEIRA continua no repositório como o registro bruto entre sessões. As linhas `fronteira_retomada` foram mantidas como estavam e só valem como histórico: o plano está concluído.

## §Task 1 (tracer) — sessão A, 2026-10-12

Executor: sessão A (só a Task 1). Início 2026-10-12T19:49Z. Nada foi aplicado em PROD: a 0006 rodou
só dentro de `node scripts/p52_ensaio.cjs` (requisição que aborta). STATE.md e ROADMAP.md não foram
tocados; nenhum `52-31-SUMMARY.md` existe.

### Precondition (medida 2026-10-12T19:49Z, só leitura) — satisfeita

- `refs/gsd/52-30/sha` = `70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8`, ancestral de `origin/main` (`git merge-base --is-ancestor` = 0; `origin/main` = o próprio `70528fba`).
- `node p46apply.cjs sql "set transaction read only; …"` → `{"no_ledger": 0, "ausente": true, "agora": "2026-10-12 16:49:57.870902-03"}` (`20261011000006` fora do ledger; `to_regprocedure('public.ler_vagas_das_minhas_candidaturas()')` nulo).
- `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` → vazio.

### Passo 0 — medição só leitura (fotografia de 2026-10-12, ~19:50Z)

**Policies de SELECT de `public.vagas`** (`polcmd in ('r','*')`):

| polname | papéis | `pg_get_expr(polqual)` |
|---|---|---|
| Público vê vagas ativas | `{anon,authenticated}` | `((status = 'ativa'::status_vaga) AND (deleted_at IS NULL))` |
| RH vê todas vagas | `{authenticated}` | `(EXISTS ( SELECT 1 FROM usuarios_rh WHERE ((usuarios_rh.user_id = ( SELECT auth.uid() AS uid)) AND (usuarios_rh.ativo = true) AND (usuarios_rh.deleted_at IS NULL))))` |

**Triggers não internos** (`pg_get_triggerdef`):

| tabela | trigger | definição resumida | função |
|---|---|---|---|
| vagas | `update_vagas_updated_at` | BEFORE UPDATE | `update_updated_at_column` (`NEW.updated_at = NOW()`) |
| vagas | `vagas_set_slug_trigger` | BEFORE INSERT | `vagas_set_slug` (slug se vazio) |
| vagas | `vagas_status_soft_delete_sync_trg` | BEFORE INSERT OR UPDATE | `vagas_enforce_status_soft_delete_sync` (`deleted_at` preenchido + `ativa` → `arquivada`) |
| candidaturas | `candidaturas_avancar_etapa_trg` | BEFORE UPDATE OF `etapa_atual` | `avancar_etapa` |
| candidaturas | `trg_candidatura_encerrada_a_pedido` | AFTER UPDATE OF `encerrada_a_pedido_em` WHEN old nulo e new não nulo | `trg_notif_candidatura_encerrada` |
| candidaturas | `trg_candidaturas_analise` | AFTER INSERT | `trg_candidatura_analise` |
| candidaturas | `trg_candidaturas_guard_rejeicao` | BEFORE UPDATE OF `status` | `guard_rejeicao_auditada` |
| candidaturas | `trg_notif_confirmacao` | AFTER INSERT | `trg_notif_confirmacao` |
| candidaturas | `update_candidaturas_updated_at` | BEFORE UPDATE | `update_updated_at_column` |

Os corpos das três funções de trigger de `vagas` foram lidos (`prosrc`): nenhuma chama rede nem
escreve em outra tabela. Nos UPDATE de `candidaturas`, para `is_rascunho`/`deleted_at` só dispara
`update_candidaturas_updated_at` (os outros são `OF <coluna>` ou de INSERT). Igual ao que o
`<context>` mediu — sem motivo de PARAR.

**Enum `status_vaga`:** `{rascunho,ativa,inativa,arquivada}`.

**Lint de partida (o comando da Task 2):** `lint exit=2 tsc errors=89`. (O pre-commit imprimiu
`tsc errors: 89 (frozen baseline: 96)` nos cinco commits de código desta task: sem regressão.)

### Passo 0 — varredura «varra pela FORMA» (CLAUDE.md §Portões), ANTES de acrescentar o objeto

Comando, verbatim:

```
grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql
```

Total: **439 achados** em 59 arquivos (antes do smoke novo). Depois do `p52_painel_vaga_smoke.sql`:
441 — os 2 novos são `IF v_rc <> 1` sobre `ROW_COUNT` do UPDATE de UMA vaga por id (escopo: a linha
alvo, não fotografia).

Achados que LISTAM ou CONTAM funções, classificados:

| achado | o que vigia | classe |
|---|---|---|
| `p43_matriz_retencao_smoke.sql:572` `proname IN ('listar_matriz_retencao', 'salvar_janela_retencao')` | as 2 funções do próprio smoke | ESCOPO deliberado |
| `p43_previa_smoke.sql:294`, `:396`, `:610`, `:667` `proname IN (…previa_retencao…, titulares/candidaturas_alem_da_janela)` | funções da prévia de retenção que o smoke vigia | ESCOPO deliberado |
| `p44_pedidos_dados_smoke.sql:388` `proname IN ('listar_pedidos_dados', 'contar_pedidos_dados_pendentes')` | as 2 funções do próprio smoke | ESCOPO deliberado |
| `p45_motor_exclusao_smoke.sql:3217` `proname IN ('registrar_pedido_exclusao', 'cancelar_pedido_exclusao', …` | funções do motor de exclusão | ESCOPO deliberado |
| `p49_prontidao_prod.sql:142` `proname IN ('salvar_avaliacao_entrevista', 'confirmar_revisao_entrevista')` e `:144` `count(DISTINCT proname) … = 2` | as 2 RPCs de revisão; a contagem é sobre a MESMA lista literal de 2, não sobre `pg_proc` de `public` | ESCOPO deliberado |
| `p50_desfazer_expansao.sql:24` (comentário), `:51` e `:1554` (impressões digitais `fn:`/`= ANY (ARRAY[…])` de policies) | os 32 objetos da expansão da 50 que o desfazer devolve | ESCOPO deliberado |

Nenhum achado conta funções de `public` contra constante, e nenhum é uma vigilância que devesse
cobrir `ler_vagas_das_minhas_candidaturas` — sem motivo de PARAR (confere com a medição do checker
de 2026-10-12). Fora dos `.sql`: a vigilância de funções do próprio ensaio (`funcoesP52()` em
`scripts/p52_ensaio.cjs`, chave `funcoes` de `capturar()`) é por FORMA — toda `CREATE FUNCTION
public.<nome>(` das migrations de `MIGS` no disco —, então a função nova entra nela por existir na
0006 (que agora está em `MIGS`).

### Passo 1 — a migration `20261011000006_p52_vagas_das_minhas_candidaturas.sql` (commit `0606acdb`)

Escrita à mão no molde da `20261011000001`, sem BEGIN/COMMIT. Cabeçalho na ordem: título e linha
Phase/Plano; POR QUE EXISTE (policy pública anterior ao ledger, o embed nulo, a preferência do
operador verbatim); O QUE CRIA (assinatura, ordem, D-52-G7-1 com a frase do operador verbatim:
«Decidir explicitamente o caso de vaga com deleted_at (minha inclinação: o candidato continua vendo
o título da própria candidatura).»); GUARDA (papel fail-closed, a leitura do hook, sem argumento,
posse verbatim de `candidato_le_propria_candidatura`, candidatura viva); O QUE NÃO FAZ; ACL; PRE-PORTAO;
POS-PORTAO; LOCK; PROVA; O NÚMERO (D-52-G7-7); SEM BEGIN/COMMIT; «APLICAR COM: node p46apply.cjs
migrate supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql — só pelo 52-31
Task 5, atrás do `p52_portao.cjs --modo apply`; NUNCA `supabase db push`».

Corpo: `SET LOCAL lock_timeout = '3s'` e `SET LOCAL statement_timeout = '5s'` como as duas primeiras
instruções; `DO $pre$` (`P52-06 PRE-PORTAO`: as três tabelas presentes, a função ausente, `p52.p06.pre
= ok` LOCAL); a função (`plpgsql`, `STABLE SECURITY DEFINER`, `SET search_path = ''`, `$function$`)
com `IF v_uid IS NULL OR coalesce(v_role, '') <> 'candidato' THEN … 42501` antes da busca e um único
`SELECT coalesce(jsonb_agg(jsonb_build_object('candidatura_id', c.id, 'titulo', v.titulo,
'departamento', v.departamento) ORDER BY c.created_at DESC, c.id), '[]'::jsonb)` sobre
`public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id`, `WHERE c.candidato_id IN (SELECT
ca.id FROM public.candidatos ca WHERE ca.user_id = v_uid) AND c.deleted_at IS NULL AND
c.is_rascunho = false` — nada sobre `v.status`/`v.deleted_at`; ACL (REVOKE PUBLIC, REVOKE `anon`
nominal, GRANT `authenticated`); COMMENT (sem função `public.<nome>(` em forma de chamada; sem termo
da guarda LGPD-04); `DO $pos$` (`P52-06 POS-PORTAO`): PRE nesta transação; catálogo (`prosecdef`,
`provolatile = 's'`, `proconfig = ARRAY['search_path=""']`, `pronargs = 0`, `jsonb`, comentário);
ACL pela expressão `aclexplode` do molde; no código sem comentários: a guarda literal antes do
primeiro `FROM public.`, nenhuma comparação de `v_role` fora do `coalesce`, o predicado de posse, o
filtro de viva e a junção presentes, exatamente UM `jsonb_build_object(`, `regexp_matches(v_cod,
'\mv\.([a-z_]+)', 'g')` ⊆ {id, titulo, departamento}, nenhum `'ativa'`; anexa
` painel:vagas_candidato=ok` a `p52.evidencia`.

### Passo 2 — `scripts/p52_ensaio.cjs` (commit `e7f4054d`) — só isto

```diff
@@ -8,5 +8,6 @@
- * 0/1/3. Mudou SÓ o que é da fase (52-01): o sentinela (`ENSAIO_P52_TERMINOU`), as cinco versões
- * fixadas `20261011000001..5_p52_*` em MIGS (a 0005 é do 52-26 — gap WR-04 + F13 — e entra na lista
- * ANTES da 0004, na ordem de APLICAÇÃO), os pares de smoke `smoke52l` (leituras do RH, bloco B),
- * `smoke52b` (banco SJT v2, bloco C), `smoke52g` (gap de servidor, 52-26) e `smoke52d` (limpeza,
- * bloco D) somados aos legados, a marca
+ * 0/1/3. Mudou SÓ o que é da fase (52-01): o sentinela (`ENSAIO_P52_TERMINOU`), as seis versões
+ * fixadas `20261011000001..6_p52_*` em MIGS (a 0005 é do 52-26 — gap WR-04 + F13 — e a 0006 é do
+ * 52-31 — G-52-7, a RPC do painel do candidato; as duas entram na lista ANTES da 0004, na ordem de
+ * APLICAÇÃO), os pares de smoke `smoke52l` (leituras do RH, bloco B), `smoke52b` (banco SJT v2,
+ * bloco C), `smoke52g` (gap de servidor, 52-26), `smoke52p` (painel do candidato, 52-31) e
+ * `smoke52d` (limpeza, bloco D) somados aos legados, a marca
@@ -23 +24,2 @@
- * competências — dono: 52-26).
+ * competências — dono: 52-26) e ao G-52-7 do 52-31 (0006: `ler_vagas_das_minhas_candidaturas`, título e
+ * departamento da vaga das próprias candidaturas — dono: 52-31).
@@ -64 +66 @@
- * das duas GUCs foi definida (k ∈ 50, 51a, 51b, 52l, 52b, 52g, 52d). Verde exige todo par reportado com
+ * das duas GUCs foi definida (k ∈ 50, 51a, 51b, 52l, 52b, 52g, 52p, 52d). Verde exige todo par reportado com
@@ -113,3 +115,4 @@ const SENTINELA = 'ENSAIO_P52_TERMINOU';
- * (bloco C, 52-17), 0005 gap de servidor (52-26: WR-04 + F13), 0004 limpeza dos dados de teste (bloco
- * D, 52-20 — DESTRUTIVA, portão próprio, D-41). A 0005 vem ANTES da 0004 porque a lista é a ordem de
- * APLICAÇÃO, não a numérica: a 0004 está fixada por nome em planos já verificados e ainda não existe;
+ * (bloco C, 52-17), 0005 gap de servidor (52-26: WR-04 + F13), 0006 título e departamento da vaga das
+ * próprias candidaturas (52-31: G-52-7, D-52-G7-7), 0004 limpeza dos dados de teste (bloco D, 52-20 —
+ * DESTRUTIVA, portão próprio, D-41). A 0005 e a 0006 vêm ANTES da 0004 porque a lista é a ordem de
+ * APLICAÇÃO, não a numérica (a 0006 é aplicada pelo 52-31, antes do bloco D — o 52-19 depende dele): a 0004 está fixada por nome em planos já verificados e ainda não existe;
@@ -125,0 +129 @@ const MIGS = [
+  'supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql',
@@ -131 +135 @@ const MIGS = [
- * 52b (banco SJT v2), 52g (gap de servidor, 52-26), 52d (limpeza). */
+ * 52b (banco SJT v2), 52g (gap de servidor, 52-26), 52p (painel do candidato, 52-31), 52d (limpeza). */
@@ -138,0 +143 @@ const PARES = [
+  ['52p', 'smoke52p'],
@@ -158,0 +164 @@ const PREFIXO =
+  "       set_config('smoke52p.pass', '', false), set_config('smoke52p.esperado', '', false),\n" +
```

Conferido por `require`: `MIGS` = 0001, 0002, 0003, 0005, **0006**, 0004; `PREFIXO` contém
`smoke52p.esperado`. Nenhuma outra mudança de comportamento.

### Passo 3 — `supabase/tests/p52_painel_vaga_smoke.sql` (`smoke52p`, commit `e307fd78`)

Prefixo `P52P`, envelope `P52P1`, guarda `$p52_so_ensaio$` como primeira instrução, nenhuma GUC do
PRE/POS lida. `pg_temp.p52p_chamar(p_papel, p_sub)` (`anon`, `sem_claims`, `sem_papel`,
`candidato_sem_sub`, ou papel de `app_metadata` com o sub), `pg_temp.p52p_vaga_visivel(p_sub,
p_vaga)` (RLS de um claim `candidato`; NULL = sonda falhou, nunca lido como invisível),
`pg_temp.p52p_resumo(jsonb)` (só erro, tipo ou contagem). Baseline com atores lidos na execução
(nenhum uuid no arquivo), população publicada e recusada sem dono/outro/admin/rec. Literal único
`smoke52p.esperado` = 3; cláusulas (a), (b), (c) como o Passo 3 do plano.

**Controle negativo (não pedido pelo plano; mostra que o smoke não é verde vácuo)** — o mesmo smoke
contra o vivo, sem a 0006:

```
node scripts/p52_ensaio.cjs --sem-migracoes supabase/tests/p52_painel_vaga_smoke.sql
ENSAIO VERMELHO: P52P FAIL (a): [rascunho_retorno:err:42883:function public.ler_vagas_das_minhas_candidaturas() does not exist,inativa_retorno:err:42883:function public.ler_vagas_das_minhas_candidaturas() does not exist,arquivada_retorno:err:42883:function public.ler_vagas_das_minhas_candidaturas() does not exist] — o dono nao le o titulo e o departamento da vaga inativada da propria candidatura (ou a fixture nao reproduz o gap) (590 ms)   (exit 1)
```

Sem `c_premissa_rls` nos três status: a vaga do alvo fica invisível sob a RLS do dono em
`rascunho`, `inativa` e `arquivada` — o G-52-7 reproduzido pela fixture.

### `<verify>` 1 — o ensaio (rodado como escrito, sobre o HEAD final `38d65421`, 2026-10-12T20:01Z) — VERDE

Linha `ENSAIO VERDE` inteira:

```
ENSAIO VERDE: supabase/tests/p52_painel_vaga_smoke.sql · prefixadas=[20261011000006] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000004] · smokes=[52p=3/3] · evidencia=painel:vagas_candidato=ok 52p.pop=cand:22,naturais:16 52p.alvo=publica · 737 ms
```

(A primeira rodada, antes dos commits, deu a mesma linha com `558 ms`. `naturais:16` confere com as
16 candidaturas vivas de vaga não pública medidas no planejamento.)

### Passo 4 — RED do cliente (commit `a103a180`, antes do conserto)

`src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx`: painel de ponta a
ponta (`@/features/vagas/hooks` NÃO mockado; `useCandidaturas` e `listCandidaturas` reais sobre
cliente espião com `from('candidaturas')` e `rpc(fn)`); store mockado honrando o seletor; mocks de
hook no idioma do `.reaberta.test.tsx`; `QueryClientProvider` com `retry: false`; fixture em etapa
`triagem` com `vaga: null` e `vaga_id` preenchido.

- **Teste-alvo:** `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx > painel do candidato — candidatura de vaga inativa (G-52-7) > (1) mostra o título e o departamento da vaga inativa vindos da RPC — nunca «Vaga não encontrada» nem «N/A»`
- **Comando:** `NO_COLOR=1 DEBUG_PRINT_LIMIT=0 npx vitest run src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx -t "\(1\)" --reporter=tap-flat` → exit 1
- **Primeira linha da falha:** `AssertionError: o título da vaga inativa, vindo da RPC, no cartão: expected null not to be null`
- **Classificador:** `gsd-tools check tdd-red-evidence` → `RED_EVIDENCE_OK` (`target_test_failed`; tests 2, fail 1, o (2) filtrado).
- **Avaliação semântica:** o alvo executou e falhou na asserção planejada (o título que só existe na resposta da RPC não aparece); na rodada com o DOM impresso, o cartão mostrava o fallback «Vaga não encontrada» — o G-52-7 reproduzido no cliente. Sem erro de carga, sintaxe ou fixture. O caso (2) também estava vermelho antes do conserto, pela asserção de que a RPC é consultada (`waitFor … toContain('ler_vagas_das_minhas_candidaturas')`).

### Passo 5 — GREEN mínimo (commit `38d65421`)

`candidaturasService.ts`: `RPC_VAGAS_DAS_MINHAS_CANDIDATURAS`, `VagaDaMinhaCandidatura`,
`mesclarVagasDasCandidaturas` (pura; só linhas com `vaga` nulo/ausente; entrada aceita só com
`candidatura_id`/`titulo` string e `departamento` string|null; copia SÓ `{ titulo, departamento }`;
nunca sobrescreve embed), `lerVagasDasMinhasCandidaturas()` interna com o cast estreito e o
comentário de quem o retira (D-52-G7-5), `null` em erro ou exceção de transporte, sem eco; em
`listCandidaturas`, UMA chamada só se alguma linha veio com `vaga == null`, mescla antes do
`return`; bloco «52-31 (G-52-7 · D-52-G7-1..6)» junto do comentário T-08-09. O embed `vaga:vagas
(...)`, `SELECT_LISTA_RH`, `VAGA_ALLOWLIST`, `listAllCandidaturas` e `listCandidaturasByVaga`
intactos. `DashboardCandidatoPage.tsx` muda só pelos dois `data-testid`:

```diff
@@ -397 +397 @@ export function DashboardCandidatoPage() {
-                          <h3 className="text-2xl font-semibold mb-2 drop-shadow-md">
+                          <h3 data-testid="painel-vaga-titulo" className="text-2xl font-semibold mb-2 drop-shadow-md">
@@ -404 +404 @@ export function DashboardCandidatoPage() {
-                              <span>{candidatura.vaga?.departamento?.replace('_', ' ') || 'N/A'}</span>
+                              <span data-testid="painel-vaga-departamento">{candidatura.vaga?.departamento?.replace('_', ' ') || 'N/A'}</span>
```

### `<verify>` 2 — escopo da migration e nada aplicado (rodado como escrito, depois do GREEN) — VERDE

```
escopo da migration: proibidas=0 funcoes=1
0006 fora do ledger e funcao ausente em PROD: nada aplicado
```

### `<verify>` 3 — os três arquivos de teste (rodado como escrito, HEAD `38d65421`) — VERDE

`npx vitest run …vagaInativa.test.tsx …candidaturasService.test.ts …reaberta.test.tsx` →
`Test Files 3 passed (3) · Tests 23 passed (23)`. Os dois testes antigos que mockam o cliente SEM
`rpc` seguem verdes sem toque (devolvem `data: []`: nenhuma linha com embed nulo, nenhuma chamada).

Sanidade extra (fora do `<verify>`): `npx vitest run src/components/pages/__tests__/
src/features/vagas/ src/__tests__/promessasComExecutor.test.ts src/__tests__/guards/
src/__tests__/copyPortoesLgpd.test.ts` → 379/381; os 2 vermelhos são a BASELINE conhecida de
`promessasComExecutor.test.ts` (registro de deferimento contra o ROADMAP — Phase 46 concluída — e a
migration `20260721000001`; listados como baseline no `52-01-SUMMARY.md:135-136`), nada desta task.
O delta formal da suíte é da Task 2.

### Commits da Task 1 (cada um com os caminhos nomeados; nenhum `-A`/`-a`/`--no-verify`)

| # | sha | assunto | caminho |
|---|---|---|---|
| 1 | `0606acdb` | `feat(52-31): ler_vagas_das_minhas_candidaturas — o candidato le titulo e departamento da vaga das proprias candidaturas em qualquer status (G-52-7)` | `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql` |
| 2 | `e7f4054d` | `chore(52-31): p52_ensaio conhece a 20261011000006 (MIGS na ordem de aplicacao, par 52p)` | `scripts/p52_ensaio.cjs` |
| 3 | `e307fd78` | `test(52-31): smoke52p (tracer — dono le vaga inativa, outro candidato nao, allowlist exata)` | `supabase/tests/p52_painel_vaga_smoke.sql` |
| 4 | `a103a180` | `test(52-31): painel com vaga inativa mostra titulo e departamento (vermelho antes do conserto)` | `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx` |
| 5 | `38d65421` | `fix(52-31): painel do candidato mescla titulo e departamento da RPC quando o embed da vaga vem nulo (G-52-7)` | `src/features/vagas/services/candidaturasService.ts`, `src/components/pages/DashboardCandidatoPage.tsx` |

Base da task: `eec21fc2`. Arquivos sujos de outras janelas (`.planning/ui-reviews/.gitignore`,
`docs/specs/DRAFT-banco-sjt-marketing.md`, `AGENTS.md`, `docs/vagas/`,
`.planning/phases/51-*/.gitkeep`) fora de todo commit.

### Desvios e observações

1. **[Rule 3 — evidência RED legível] Asserção de uma linha no caso (1).** O relatório TAP da Vitest
   não escapa a mensagem multilinha do Testing Library (`findByText` + dump do DOM): o classificador
   recusou com `invalid_record` («Non-TAP data in report», «Malformed TAP»), inclusive com
   `NO_COLOR=1 DEBUG_PRINT_LIMIT=0`. A primeira asserção do caso (1) virou `waitFor(() =>
   expect(screen.queryByText(TITULO), '<rótulo>').not.toBeNull(), { onTimeout: (e) => e })` — mesma
   semântica (o título que só a RPC traz tem de aparecer), mensagem de uma linha. Feito ANTES do
   commit `a103a180`; o relatório não foi editado.
2. **Observação para o review (não consertada — o Passo 2 restringe o ensaio a MIGS/PARES/PREFIXO):**
   o `capturar()` do ensaio (o `PERSISTIU`) não cobre `public.vagas`, e o smoke52p escreve
   `vagas.status` dentro dos envelopes `P52P1`. A proteção é a da requisição que aborta + a guarda
   estrutural `P52E FAIL (transacao)` depois de cada parte, as mesmas dos outros smokes p52 que
   escrevem em tabela fora de `capturar()` (ex.: `candidaturas` no smoke52l, deixada de fora de
   propósito pelo tráfego). `vagas` também tem tráfego (o RH edita); se o review quiser a chave, é
   mudança no ensaio sob review, não desta sessão.
3. Nenhuma task de expansão rodou; a Task 2 começa numa sessão NOVA, que confere esta fronteira pela
   precondition dela.

fronteira_retomada: sessao_a_encerrada 2026-10-12T20:04Z head=38d654212d5d24e4c38c3d7d393fddaeb4853390

---

## §Task 2 — sessão B, 2026-10-12

Executor: sessão B (Tasks 2–3). Início 2026-10-12T20:13Z. Nada foi aplicado em PROD: a 0006 rodou só
dentro de `node scripts/p52_ensaio.cjs` / `node scripts/p52_mutacoes.cjs` (requisições que abortam).
STATE.md e ROADMAP.md não foram tocados; nenhum `52-31-SUMMARY.md` existe.

### Precondition (medida 2026-10-12T20:13Z, só leitura) — satisfeita

- `52-31-FRONTEIRA.md` rastreado e limpo; última linha `fronteira_retomada: sessao_a_encerrada 2026-10-12T20:04Z head=38d654212d5d24e4c38c3d7d393fddaeb4853390`; `38d65421` ancestral de HEAD (`git merge-base --is-ancestor` = 0).
- `52-31-SUMMARY.md`: ausente.
- `node p46apply.cjs sql "set transaction read only; …"` → `{"no_ledger": 0, "ausente": true, "agora": "2026-10-12 17:13:35.020147-03"}`.
- `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` → vazio.

### smoke52p (d)–(j) (commit `b326a215`)

Sete blocos `DO` novos, um por cláusula, no idioma da Task 1 (envelopes `P52P1` que revertem; julgamento
fora deles por lista de rótulos; nada de título, departamento ou e-mail nas mensagens). `smoke52p.esperado`
= `10` num único literal. Cabeçalho: (a)–(j); escritas novas — (h) `UPDATE candidaturas SET is_rascunho
= true` / `SET deleted_at = now()` no alvo, (i) `UPDATE vagas SET deleted_at = now()` na vaga do alvo;
(d) confere inclusão do conjunto vivo, posse e ausência de repetição, não «nada além do vivo» (papel de
(h)); a razão escrita da (j) (premissa sem mutação: DDL em `candidaturas` = lock exclusivo em tabela
quente) e da cobertura de COMPLETUDE de (d) (sem mutação de âncora única que a faça a primeira vermelha;
cobre a população natural publicada em `52p.pop`). Recusas por SQLSTATE E mensagem: a guarda é
`42501:forbidden`, o ACL é `42501:permission denied for function ler_vagas_das_minhas_candidaturas`.
(j) exige FK `convalidated` sobre `conkey = ARRAY[<attnum de vaga_id>]` com `confrelid =
'public.vagas'::regclass` (nunca pelo nome) e `attnotnull`.

Varredura «varra pela FORMA» depois do smoke: 443 achados (441 da §Task 1 + 2 novos, ambos `IF v_rc
<> 1` sobre `ROW_COUNT` de UPDATE de UMA linha por id — escopo da linha alvo, não fotografia).

### Runner `scripts/p52_mutacoes.cjs` (commit `b326a215`) — só entradas e a linha de SMOKES

Diff: 0 linhas removidas; três hunks só de acréscimo — `@@ -89,6 +89,7 @@ const SMOKES` (a linha
`'supabase/tests/p52_painel_vaga_smoke.sql': { prefixo: 'P52P', par: '52p' }`, sem `exigePrefixadas`),
`@@ -281,6 +282,18 @@` (constantes `V06`, `S52P`, `fnVagas = () => fnNova(V06,
'ler_vagas_das_minhas_candidaturas')` e os alvos literais `P_POSSE`, `P_VIVA`, `P_GUARDA`,
`P_GUARDA_BLOCO`, `P_JUNCAO`) e `@@ -559,6 +572,109 @@ const MUTACOES` (P1–P10, `requer: [V06]`,
`smoke: S52P`, id da ameaça em comentário; P5 é o texto do GRANT, como a L6; P10 troca a linha da
junção de `public.vagas` por ela mesma seguida de `CROSS JOIN (VALUES (1), (2)) AS p10_dup(n)`).
`julgarMutacao`/`julgarControle`/`aposentar`: nenhuma linha tocada (grep no diff = 0).

### `<verify>` 1 — ensaio com a sonda de vistas (HEAD `587481ac`, 2026-10-12T20:22Z) — VERDE

```
ENSAIO VERDE: supabase/tests/p52_painel_vaga_smoke.sql · prefixadas=[20261011000006] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000004] · vistas=igual · smokes=[52p=10/10] · evidencia=painel:vagas_candidato=ok 52p.pop=cand:22,naturais:16 52p.alvo=publica · 912 ms
```

(A primeira rodada, antes dos commits, deu a mesma linha com `913 ms`.)

### `<verify>` 2 — mutações P1–P10 e a rodada completa (HEAD `587481ac`) — VERDE

```
CONTROLE verde (supabase/tests/p52_painel_vaga_smoke.sql): par 52p=10/10 (614 ms)
P1 morde: ler_vagas_das_minhas_candidaturas: o predicado de posse vira true (toda candidatura viva de todos) -> P52P FAIL (b) [outro_elementos_que_nao_sao_dele:42,outro_ve_candidaturas_do_dono:2,sub_sem_candidato:ok:n=44] (545 ms)
P2 morde: ler_vagas_das_minhas_candidaturas: filtro de vaga publica (status = 'ativa' AND deleted_at IS NULL) no WHERE -> P52P FAIL (a) [rascunho_alvo_sem_titulo_e_departamento_da_vaga:ok:n=0,inativa_alvo_sem_titulo_e_departamento_da_vaga:ok:n=0,arquivada_alvo_sem_titulo_e_departamento_da_vaga:ok:n=0] (496 ms)
P3 morde: ler_vagas_das_minhas_candidaturas: 'status', v.status na projecao -> P52P FAIL (c) [dono_vivo_chaves:candidatura_id|departamento|status|titulo,dono_vivo_elementos_tortos:2,outro_vivo_chaves:candidatura_id|departamento|status|titulo,outro_vivo_elementos_tortos:2,dono_vaga_inativa_chaves:candidatura_id|departamento|status|titulo,dono_vaga_inativa_elementos_tortos:2] (519 ms)
P4 morde: ler_vagas_das_minhas_candidaturas: a guarda aceita rh e administrador -> P52P FAIL (g) [administrador_sub_do_admin:ok:n=3,rh_sub_do_recrutador:ok:n=0,administrador_sub_do_dono:ok:n=2] (685 ms)
P5 morde: GRANT EXECUTE de ler_vagas_das_minhas_candidaturas a anon depois da migration -> P52P FAIL (f) [anon_com_execute:true,anon_chamada:err:42501:forbidden] (578 ms)
P6 morde: ler_vagas_das_minhas_candidaturas: sem AND c.is_rascunho = false -> P52P FAIL (h) [rascunho_diferente_do_vivo_menos_o_alvo:n=2/esperado=1] (583 ms)
P7 morde: ler_vagas_das_minhas_candidaturas: AND v.deleted_at IS NULL no WHERE -> P52P FAIL (i) [alvo_sem_titulo_e_departamento_da_vaga_apagada:ok:n=1] (540 ms)
P8 morde: ler_vagas_das_minhas_candidaturas: a guarda sem v_uid IS NULL OR -> P52P FAIL (e) [candidato_sem_sub:ok:n=0] (777 ms)
P9 morde: ler_vagas_das_minhas_candidaturas: sem a guarda de papel -> P52P FAIL (e) [sem_claims:ok:n=0,sem_papel:ok:n=2,candidato_sem_sub:ok:n=0] (552 ms)
P10 morde: ler_vagas_das_minhas_candidaturas: CROSS JOIN (VALUES (1), (2)) logo depois da juncao de vagas (cada candidatura duas vezes) -> P52P FAIL (d) [repetidas:32_linhas_em_22/22_candidatos] (579 ms)
MUTACOES: 10/10 mordem; controle verde; nada persistiu (so=P1,P2,P3,P4,P5,P6,P7,P8,P9,P10) (aposentadas: B1,B2,B3,B4,B5,B6)
```

Rodada completa (sem `--so`), na mesma execução do `<verify>`:

```
CONTROLE verde (supabase/tests/p52_leituras_rh_smoke.sql): par 52l=20/20 (622 ms)
CONTROLE verde (supabase/tests/p52_gap_servidor_smoke.sql): par 52g=14/14 (651 ms)
CONTROLE verde (supabase/tests/p52_painel_vaga_smoke.sql): par 52p=10/10 (637 ms)
MUTACOES: 27/27 mordem; controle verde; nada persistiu (aposentadas: B1,B2,B3,B4,B5,B6)
```

(L1–L8, G1–G9 e P1–P10 mordem cada uma na sua letra; B1–B6 aposentadas pela regra (7), como antes
desta task. Linha de base de cada mordida = o CONTROLE verde do mesmo smoke na mesma execução.)

### `<verify>` 3 — regressão `p52_leituras_rh_smoke.sql`, controle e tratamento — VERDE

```
leituras_rh controle rc=0: ENSAIO VERDE: supabase/tests/p52_leituras_rh_smoke.sql · prefixadas=[] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000006,20261011000004] · smokes=[52l=20/20] · evidencia
leituras_rh tratamento rc=0: ENSAIO VERDE: supabase/tests/p52_leituras_rh_smoke.sql · prefixadas=[20261011000006] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000004] · smokes=[52l=20/20] · evidencia=
```

### `<verify>` 4 — Vitest e o delta da suíte (HEAD commitado `587481ac`) — VERDE

`npx vitest run src/features/vagas src/components/pages/__tests__` → `Test Files 23 passed (23) · Tests
224 passed (224)`. Linha final do delta:

```
vitest delta: base=0d70ac7 2725/2 · head=587481a 3144/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok
```

(Os 2 pré-existentes são os de `promessasComExecutor.test.ts` já listados na §Task 1.)

### `<verify>` 5 — lint — VERDE

```
lint exit=2 tsc errors=89
```

Igual à contagem de partida da §Task 1 (`tsc errors=89`) e ≤ 90. O pre-commit imprimiu `tsc errors: 89
(frozen baseline: 96)` nos três commits desta sessão.

### `<verify>` 6 — tipografia, build e marcadores — VERDE

```
TIPOGRAFIA OK (71 linhas acrescentadas varridas)
marcadores no chunk eager do candidato
```

Os dois marcadores (`painel-vaga-titulo`, `ler_vagas_das_minhas_candidaturas`) moram no mesmo arquivo:
`build/assets/index-CFPYr-z6.js` (build local; nada publicado).

### Cliente — testes novos (commit `587481ac`) e a evidência RED (tdd)

- `src/features/vagas/services/__tests__/candidaturasService.vagaInativa.test.ts` (13 testes): cliente
  espião com `from` (cadeia awaitable) e `rpc`. `mesclarVagasDasCandidaturas`: copia só `titulo` e
  `departamento` (chaves = `departamento,titulo` mesmo com `status`/`salario` na entrada); aceita
  `departamento` null; não sobrescreve embed presente (mesma referência); ignora entrada malformada (8
  formas) e sem linha; devolve as MESMAS linhas para `entradas` não-array (5 formas). `listCandidaturas`:
  0 chamadas com todo embed presente; 1 chamada, pelo nome, com 2 embeds nulos entre 3 linhas, mescla só
  nelas e o embed presente fica; erro da RPC e promessa rejeitada → `success: true`, linhas como vieram,
  o texto do erro ausente de `JSON.stringify(retorno)`.
- `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx`, casos novos: (3) erro da
  RPC → títulos `Vaga não encontrada | <título público>`, departamentos `N/A | Clinica`, sem o texto do
  erro na tela; (4) todo embed presente → 0 chamadas e o título da RPC não aparece; (5) o diálogo de
  «Retirar minha candidatura» tem `COPY_RETIRAR_CANDIDATURA.titulo(<título da RPC>)` e fecha por «Voltar».
- Nenhum código de produção mudou nesta task (nenhum caso novo reprovou sobre o código da Task 1).

**RED (tdd.md) — por que por mutação.** O GREEN desta funcionalidade é o commit `38d65421` da Task 1;
sobre ele os 18 testes dos dois arquivos passam (verde esperado, não «feature desconhecida»: tdd.md
fail-fast 1 investigado). A evidência de que os testes novos MORDEM foi tomada com linha de base: o
mesmo alvo verde sem a mutação (acima) e vermelho com ela. Cada mutação foi aplicada ao
`candidaturasService.ts` só no disco, o alvo rodou com `--reporter=tap-flat`, e o arquivo voltou por
`git checkout -- src/features/vagas/services/candidaturasService.ts` com `git diff --quiet HEAD` = 0
conferido depois de cada uma. Registros em `node_modules/.cache/p52-31-red/R{1..4}.json` (dentro do
projeto, ignorado pelo git), cada um passado a `gsd-tools check tdd-red-evidence --raw`:

| # | mutação temporária | alvo (`file > suite > test`) | primeira linha da falha | classificador |
|---|---|---|---|---|
| R1 | a mescla copia a entrada inteira (`vaga: { ...e }`) | `candidaturasService.vagaInativa.test.ts > mesclarVagasDasCandidaturas (52-31 · G-52-7) > copia só titulo e departamento da entrada, mesmo quando ela traz status e salario` | `chaves do objeto mesclado: expected 'candidatura_id,departamento,salario,s…' to be 'departamento,titulo'` | `RED_EVIDENCE_OK` (`target_test_failed`; tests 13, fail 1) |
| R2 | a RPC chamada com qualquer linha (`if (linhas.length > 0)`) | `… > listCandidaturas + ler_vagas_das_minhas_candidaturas (52-31 · G-52-7) > não chama a RPC quando todo embed veio` | `chamadas à RPC com todo embed presente: expected 1 to be +0` | `RED_EVIDENCE_OK` (tests 13, fail 1) |
| R3 | o erro da RPC escapa (`throw` no lugar de `return null`, e o `catch` relança) | `… > com erro da RPC resolve com as linhas como vieram, sem lançar e sem o texto do erro` | `Erro inesperado ao listar candidaturas` (a lista lançou) | `RED_EVIDENCE_OK` (tests 13, fail 1) |
| R4 | o `candidaturasService.ts` de antes do GREEN (`git show 38d65421^:…`) | `DashboardCandidatoPage.vagaInativa.test.tsx > painel do candidato — candidatura de vaga inativa (G-52-7) > (5) o diálogo de «Retirar minha candidatura» da vaga inativa nomeia a vaga pelo título da RPC` | `o título do diálogo com o nome da vaga vindo da RPC: expected null not to be null` | `RED_EVIDENCE_OK` (tests 5, fail 1) |

Comando de cada rodada: `NO_COLOR=1 DEBUG_PRINT_LIMIT=0 npx vitest run <arquivo> -t <filtro>
--reporter=tap-flat` (exit 1 nas quatro). **Avaliação semântica:** nos quatro o alvo executou e falhou
na asserção planejada, pelo motivo pretendido — R1 a terceira chave atravessa a mescla (T-52-104 no
cliente); R2 a RPC é chamada sem embed nulo (D-52-G7-4); R3 a lista cai pelo erro da RPC (T-52-109);
R4 sem a mescla o diálogo de retirada não nomeia a vaga (diz «esta vaga»). Nenhum erro de carga,
coleta, sintaxe ou fixture; nenhum alvo pulado.

### Desvios e observações (Task 2)

1. **[Rule 3 — evidência RED legível] Asserções estruturais viraram comparação de string de uma
   linha, ANTES do commit `587481ac`.** O primeiro registro R1 saiu `invalid_record` («Non-TAP data in
   report», «Malformed TAP»): o `toEqual` de array põe `actual`/`expected` multilinha no TAP — a mesma
   classe do desvio 1 da §Task 1. Cinco `toEqual` do serviço e dois do painel viraram `toBe` sobre
   `join(',')`/`join(' | ')`/`JSON.stringify` — mesma semântica. O relatório não foi editado.
2. **Mutação errada, não teste errado (R3).** A primeira mutação de R3 (`throw` no lugar de `return null`)
   saiu `unexpected_green`: o `throw` caía no próprio `try/catch` de `lerVagasDasMinhasCandidaturas` e
   voltava `null` — a mutação não mudava o comportamento. A mutação certa também relança no `catch`;
   o teste não mudou.
3. **R2 refeito sobre o arquivo de teste final** (a primeira rodada R2 foi antes do desvio 1); a linha
   da tabela é a da rodada final.

---

## §Task 3 — sessão B, 2026-10-12

### Passo 1 — diagnóstico dos leitores residuais (só leitura; NADA consertado — R1/R2 do `<context>`)

Medição em PROD — o primeiro `<verify>` da Task 3, como escrito (2026-10-12T20:24Z), exit 0:

```
sonda caso observado: [{"candidatura":"d31c78bb","etapa_atual":"entrevista_online","vaga_visivel":false},{"candidatura":"f59e7281","etapa_atual":"avaliacao_assincrona","vaga_visivel":true}]
sonda caso natural em avaliacao_assincrona: [{"candidatura":"f73682b6","etapa_atual":"avaliacao_assincrona","vaga_visivel":false}]
```

Contagem agregada só leitura, na mesma rodada (`set transaction read only`; só contagens, nenhum id,
título ou e-mail) — as 16 candidaturas vivas naturais de vaga não pública (candidatos fora de
`usuarios_rh`):

```
{"naturais":16,"em_avaliacao_assincrona":1,"com_curriculo_exportavel":2,"candidaturas_sem_departamento":11,"vagas_sem_departamento":4,"inativa":1,"arquivada":15,"vaga_com_deleted_at":0,"por_etapa":{"rejeitado":1,"entrevista_online":2,"avaliacao_assincrona":1,"triagem":5,"decisao_final":2,"aprovado":5}}
```

| leitor | embed | efeito na tela (arquivo:linha até a tela) | caso medido |
|---|---|---|---|
| `avaliacaoService.ts:118` (`getAvaliacaoContext`) | `vaga:vagas ( testes_aplicaveis, aplica_cognitivo )` sob a RLS do candidato → nulo | `:143-144` `testesAplicaveis = null`, `aplicaCognitivo = false` → `AvaliacaoContainer.tsx:482` `deriveCards` devolve `[]` → `:323-329` a página de avaliações mostra «Nenhuma avaliação pendente» / «Você não tem avaliações para concluir nesta etapa no momento.» — o candidato em `avaliacao_assincrona` não vê os cards que tem de fazer. E no PAINEL: `useIdsAvaliacoesConcluidas.ts:55-58` (elegíveis = etapa `avaliacao_assincrona`, não encerrada) e `:75-79` derivam os MESMOS cards vazios → `avaliacoesConcluidas([])` é falso → o estado «Avaliações concluídas — aguardando a equipe» nunca aparece para essa candidatura | `f73682b6` (`avaliacao_assincrona`, vaga arquivada, `vaga_visivel:false`) — 1 hoje |
| `redacaoService.ts:150` (`getRedacaoContext`) | `vaga:vagas!inner(testes_aplicaveis)` → a linha SOME | `:161-163` `NOT_FOUND` «Candidatura não encontrada» → `RedacaoEditorScreen.tsx:305-316` o estado de erro do `AsyncState` com «Tentar novamente». Alcançável só por link direto: com os cards vazios (linha acima) não há card de redação para clicar | o mesmo `f73682b6`, se a vaga dele tiver redação — ≤ 1 hoje |
| `exportacaoService.ts:1005` (`CURRICULOS_ALLOWLIST`) | `vaga:vagas ( titulo )` → nulo | `:1034-1038` `tituloDaVaga` → `null` (`:1083` `vagaTitulo: null`) → `CurriculosBloco.tsx:138` mostra `COPY_CURRICULOS.vagaSemTitulo` = «Vaga não identificada» (`:71`) no bloco de currículos de `/candidato/privacidade` (e o export do titular sai com `vagaTitulo: null`) | 2 das 16 naturais têm `curriculo_url` |
| `VagaDetalhePage.tsx` via `getVagaById` (`vagasService.ts:357-420`) | não é embed: `from('vagas').eq('id').is('deleted_at', null).single()` (`:372-376`) sob a RLS do candidato | o `onClick` do cartão (`DashboardCandidatoPage.tsx:96-98`, `handleVerVaga`) leva a `/vagas/:id`; `useVaga` (`useVagas.ts:145-160`) → `getVagaById` → PGRST116 → `VagasServiceError('Vaga não encontrada')` (`:382`; `:397` é a outra mensagem igual de `getVagaById`, para retorno vazio) → `VagaDetalhePage.tsx:88-91` «Vaga não encontrada» / «Vaga não encontrada ou não está mais ativa» com «Voltar para vagas». As mensagens de `vagasService.ts:382/397` citadas no UAT são DESSA página, fora do caminho do cartão. O `.is('deleted_at', null)` recusaria a vaga apagada mesmo com outra RLS | toda candidatura de vaga não pública: as 16 naturais (inclusive `d31c78bb`) |

### Perguntas prontas para a Task 4 (cada uma com o número que a sustenta)

- **R1 — `residual_leitores_embed`:** hoje 1 candidatura viva natural em `avaliacao_assincrona` com vaga
  não pública (`f73682b6`, vaga arquivada) vê «Nenhuma avaliação pendente» na página de avaliações, e o
  painel nunca lhe mostra «Avaliações concluídas — aguardando a equipe»; a redação dela (se houver) dá
  erro «Tentar novamente» por link direto; 2 das 16 naturais veem «Vaga não identificada» no bloco de
  currículos da privacidade. Consertar exige ler `testes_aplicaveis`/`aplica_cognitivo` por outra RPC —
  outra migration e outro apply, que move de novo o «último apply» da D-41. **Pergunta:** aceitar e
  registrar (backlog com dono), ou plano novo dentro da 52 antes do 52-19?
- **R2 — `residual_detalhe_vaga`:** as 16 candidaturas vivas de vaga não pública (1 inativa, 15
  arquivadas) levam, ao tocar o cartão, a «Vaga não encontrada ou não está mais ativa»
  (`VagaDetalhePage.tsx:88-91`). A frase é verdadeira para a vaga, mas o cartão do painel passará a
  mostrar o título que a página nega. **Pergunta:** aceitar como está, ou plano novo (cartão sem
  navegação quando a vaga não é pública, ou uma página de detalhe do titular)?
- **R3 — `residual_departamento_nulo`:** 4 vagas sem departamento, com 11 das 16 candidaturas naturais;
  o cartão mostra «N/A», como já mostra para vaga ativa sem departamento (premissa sinalizada no
  frontmatter, `assumptions`). **Pergunta:** aceitar «N/A», ou plano novo (omitir a linha de
  departamento quando vazio — muda o cartão também para vaga ativa)?
- **R4 — `db_types`:** `database.types.ts` (223613 octetos) tem 0 ocorrências de
  `ler_vagas_das_minhas_candidaturas`; o cliente usa o cast ESTREITO confinado a
  `lerVagasDasMinhasCandidaturas()` (`candidaturasService.ts:339-355`), com o comentário de quem o retira
  (D-52-G7-5). **Pergunta:** aceitar a pendência nomeada (o primeiro plano que rodar `npm run db:types <
  /dev/null` E empurrar `database.types.ts` pela via da fase retira o cast no mesmo commit), ou plano novo?

### Passo 2 — emenda datada do G-52-7 no `52-UAT.md` (commit `17b50429`)

Dois itens novos no `missing` do G-52-7, sem reescrever os existentes: (i) logo depois do item 1, a
emenda D-52-G7-4 (o cartão lê só `vaga?.titulo` e `vaga?.departamento`; o parêntese «cidade, estado,
status» era palpite); (ii) logo depois do item 3, a emenda D-52-G7-1 com a frase do operador verbatim
(vaga com `deleted_at` e todo status não ativo MOSTRA título e departamento; só a vaga INEXISTENTE segue
com o fallback, impossível no banco — D-52-G7-6). A truth e `status: failed` ficaram byte a byte;
`updated:` do frontmatter `2026-10-12T18:05:00Z` → `2026-10-12T20:25:18Z`. Só o UAT no commit (`1 file
changed, 3 insertions(+), 1 deletion(-)` — a deleção é a linha `updated:`).

`<verify>` 2 da Task 3, como escrito (depois do commit), exit 0:

```
emenda datada do G-52-7 no UAT: ok (truth e status intactos)
```

### Desvios e observações (Task 3)

1. **Contagem agregada só leitura além das duas sondas** (acima): para dar número a R1 e R3. Mesmo
   padrão do Passo 0 da §Task 1 (`set transaction read only`), só contagens; as duas sondas do
   `<verify>` rodaram exatamente como escritas.

### Commits da sessão B (cada um com os caminhos nomeados; nenhum `-A`/`-a`/`--no-verify`)

| # | sha | assunto | caminhos |
|---|---|---|---|
| 1 | `b326a215` | `test(52-31): smoke52p completo (10 clausulas) e mutacoes P1-P10` | `supabase/tests/p52_painel_vaga_smoke.sql`, `scripts/p52_mutacoes.cjs` |
| 2 | `587481ac` | `test(52-31): a mescla do servico e os casos restantes do painel (erro da RPC, embed presente, dialogo de retirada)` | `src/features/vagas/services/__tests__/candidaturasService.vagaInativa.test.ts`, `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx` |
| 3 | `17b50429` | `docs(52-31): emenda datada do G-52-7 no UAT — vaga com deleted_at mostra o titulo (D-52-G7-1); a leitura entrega so titulo e departamento (D-52-G7-4)` | `.planning/phases/52-hub-do-rh-dados-e-contato/52-UAT.md` |

Arquivos sujos de outras janelas (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`,
`AGENTS.md`, `docs/vagas/`, `.planning/phases/51-*/.gitkeep`) fora de todo commit. Nenhuma task 4+ rodou:
nenhum `/gsd-code-review`, `52-REVIEW-G7-*.md`, `52-31-DECISAO.md` nem `52-APLICACOES.json` foi escrito. A
próxima é a Task 4 (review adversarial bloqueante, depois a decisão escrita do operador), numa sessão nova.

fronteira_retomada: sessao_b_encerrada 2026-10-12T20:26Z head=17b5042908d37999fe2618819827a74b9fb2fe07

---

## §Task 4 — sessão C, 2026-10-12 (parada interna: as perguntas ao operador)

> Parada INTERNA da Task 4 (regra 2 do `<context>`): esta seção é commitada sozinha e SEM linha
> `fronteira_retomada` — só as três paradas que encerram sessão a carregam; a última `fronteira_retomada`
> do arquivo segue sendo a `sessao_b_encerrada` acima. O executor NÃO revisa e NÃO decide warning,
> residual, D-52-G7-1 nem janela única: nenhum `52-31-DECISAO.md` foi escrito, nenhum pin
> (`refs/gsd/52-31/sha` inexistente, medido), nenhum apply, nenhum push; `52-APLICACOES.json` intocado
> (versões 0001, 0002, 0003, 0005 — sem 0006).

### Sinal de retomada recebido

Orquestrador: «review commitado» — `.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7-1.md`, commit
`e6fbeaf9` (`docs(52-31): review adversarial do G-52-7 — 52-REVIEW-G7-1 (critical 0, warning 2, info 9)`).
HEAD no despacho = `e6fbeaf9`; diretório da fase limpo no git (`git diff --quiet HEAD` = 0).

### `<verify>` 1 da Task 4 — portão no modo revisão (rodado como escrito, HEAD `e6fbeaf9`, 2026-10-12T20:48Z) — VERDE

```
$ node scripts/p52_portao.cjs --revisao .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7 --base refs/gsd/52-30/sha --plano .planning/phases/52-hub-do-rh-dados-e-contato/52-31-PLAN.md --modo revisao
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7-1.md reviewed_head=133429d103c7e70d589b6068f33dbb76fc3f3d46 pin=- modo=revisao
EXIT=0
```

`refs/gsd/52-30/sha` = `70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8`. Mesma saída que a rodada do orquestrador.

### O review de maior N — `52-REVIEW-G7-1.md` (o único `52-REVIEW-G7-*`)

- Frontmatter: `reviewed: 2026-10-12T20:41:27Z` · `depth: deep` · `diff_base: 70528fba…` (= `refs/gsd/52-30/sha`) ·
  `reviewed_head: 133429d1…` · `files_reviewed: 9` · `status: issues_found` ·
  **`findings: critical 0 · warning 2 · info 9 · total 11`**.
- Summary, verbatim: «**Não achei nada crítico e nada destrutivo.**» — nenhuma escrita de dado, nenhuma ACL
  mudada além da da própria função, nenhuma outra função ou policy tocada. O item (h) da Task 4 não se aplica.
- O revisor reproduziu (só leitura ou dentro do ensaio que aborta): ensaio `52p=10/10 · vistas=igual`; P1–P10
  10/10, cada uma na sua letra; rodada completa 27/27; regressão `52l=20/20` em controle e tratamento; Vitest 224
  verdes e delta `alteradas=0 · novas=0 · mordida=ok`; lint 89 = base; `TIPOGRAFIA OK`; build com
  `painel-vaga-titulo` e `ler_vagas_das_minhas_candidaturas` em `index-CFPYr-z6.js`; enumeração em seco 17
  commits (10 `planning`, 7 `codigo`, 0 ALHEIO). Ponto (6): as sondas e a contagem agregada da §Task 3, re-rodadas,
  são IGUAIS — «a medição confere».

### Warnings — com a proposta do revisor (disposição: DO OPERADOR, pendente)

- **WR-01 — a varredura «por forma» do POS sobre `v.<coluna>` é sensível a caixa.**
  `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql:250-256`: `regexp_matches(v_cod,
  '\mv\.([a-z_]+)', 'g')` não enxerga `v.Titulo` / `v.TITULO` / `v."titulo"`. Provado: `mf1` (`v.descricao`) →
  `P52-06 POS-PORTAO` morde; `mf4` (`'departamento', v.Titulo`) → POS passa, só o smoke (a) reprova pelo valor. Hoje
  nada errado vai a PROD (o texto revisado é todo minúsculo; (a)/(c)/(d) mordem pelo valor).
  *Proposta de conserto:* `FROM regexp_matches(lower(v_cod), '\mv\.("?)([a-z_]+)\1', 'g') AS m;` usando `m[2]` (ou
  flag `gi` + `lower(m[1])`, que não pega `v."titulo"`). Toca a migration → «consertar agora» = `fix(52-31)` → o
  `<verify>` inteiro da Task 2 + o segundo `<automated>` da Task 1 sobre o sha do conserto → review `-2` → Task 4 de
  novo. *Recomendação do revisor (informação, não resposta):* **backlog** — «o apply de hoje não fica mais seguro
  com o conserto e cada rodada de conserto já trouxe blocker novo duas vezes».
- **WR-02 — `capturar()` do ensaio não tem chave para `public.vagas`.** `scripts/p52_ensaio.cjs` (`capturar()`);
  `supabase/tests/p52_painel_vaga_smoke.sql:367,482,800` (os três `UPDATE public.vagas`). Nada persistiu (impressão
  digital de `vagas` inteira `15:5adc811e…` igual antes/depois de cada rodada, medida pelo revisor) e há três camadas
  (envelope `P52P1`, `ponto()`, sentinela); a fraqueza é só de DETECÇÃO: um `UPDATE` fora de envelope numa cláusula
  futura sairia verde no `PERSISTIU`. *Proposta de conserto:* uma chave estreita `vagas_estado` em `capturar()`
  (contagem + md5 de `id`, `status`, `deleted_at` de `public.vagas`, ordenado por `id`). Toca o `p52_ensaio.cjs`
  (dentro do `--caminhos`) → «consertar agora» = `fix(52-31)` → `<verify>` da Task 2 → review `-2` → Task 4 de novo.
  *Recomendação do revisor (informação, não resposta):* **backlog, antes do 52-20** (o bloco D edita o
  `p52_ensaio.cjs` de qualquer jeito, e a chave serve ao portão da D-32, que lê `vagas.status` da `629a5f31`).

### Infos — default proposto «aceitar» (o revisor marca todas «nenhuma decisão»), salvo resposta contrária

| IN | título (resumo) |
|---|---|
| IN-01 | a ORDEM do array (`created_at DESC, id`) não é vigiada — sem `ORDER BY` passa 10/10 (nenhum consumidor depende dela) |
| IN-02 | a allowlist do POS varre só `v.<coluna>`; uma chave a mais vinda de `c.<coluna>` passa o POS e cai em (c) |
| IN-03 | o predicado de posse é «verbatim» no sentido semântico, não textual (`v_uid` e alias `ca`; mesmo conjunto) |
| IN-04 | um erro da RPC é engolido em silêncio — na tela, indistinguível do fallback legítimo (sem `console.*`) |
| IN-05 | rascunho (`is_rascunho = true`) é listado pelo `listCandidaturas` e excluído pela RPC — `rascunhos_prod=0` |
| IN-06 | o ramo «embed `undefined`» da mescla não é exercitado — `!==` em vez de `!=` passa 18/18 |
| IN-07 | a cláusula (d) chama a RPC uma vez por candidato (22 hoje, ~0,6 s) sob `statement_timeout` de 5 s — cresce com a população |
| IN-08 | a enumeração EXATA do «Comando de push» recusa até o review estar commitado — o fluxo esperado |
| IN-09 | duas chamadas à RPC por carga do painel quando há vaga não pública — a R9 do plano, confirmada no código |

### Perguntas ao operador (a)–(h), cada uma com o número da §Task 3 que a sustenta

- **(a) Janela única:** «nenhuma outra janela publica — migration, EF ou push — até o fim deste plano?» Resposta
  escrita (exigida em todo caminho; sem ela, nada de apply nem push na Task 5).
- **(b) D-52-G7-1:** «vaga com `deleted_at` (e todo status não ativo) mostra título e departamento da própria
  candidatura — confirma?» Hoje: 16 candidaturas vivas naturais de vaga não pública (1 `inativa`, 15 `arquivada`),
  `vaga_com_deleted_at=0` — a parte do `deleted_at` vale para o futuro. Provado por (a)/(i) e P2/P7. **Veto = PARAR e
  voltar ao planejador** (smoke e RPC encarnam a decisão).
- **(c) R1 `residual_leitores_embed`** — os leitores do embed `vaga:vagas` sob a RLS do candidato quebram assim
  (tabela da §Task 3): `avaliacaoService.ts:118` → `testesAplicaveis = null` → `deriveCards` = `[]` → a página de
  avaliações diz «Nenhuma avaliação pendente» e o painel nunca mostra «Avaliações concluídas — aguardando a equipe»;
  `redacaoService.ts:150` (`!inner`) → «Candidatura não encontrada» por link direto; `exportacaoService.ts:1005` →
  «Vaga não identificada» no bloco de currículos de `/candidato/privacidade` e `vagaTitulo: null` no export. Caso
  medido: **`f73682b6`** (`avaliacao_assincrona`, vaga arquivada, `vaga_visivel:false`) — 1 hoje; **2 das 16** naturais
  têm currículo exportável. Consertar exige outra RPC e outro apply (move de novo o «último apply» da D-41); consertar
  DENTRO do 52-31 não é caminho. Opções: «plano novo (52-32, antes do 52-19)», «backlog» ou «aceitar».
- **(d) R2 `residual_detalhe_vaga`** — o clique no cartão abre `/vagas/:id`, que diz «Vaga não encontrada ou não
  está mais ativa» (`VagaDetalhePage.tsx:88-91`, via `getVagaById`, `vagasService.ts:372-376/382/397`), enquanto o
  cartão passa a mostrar o título. Alcance: **as 16** candidaturas vivas naturais de vaga não pública (inclusive
  `d31c78bb`). Opções: «plano novo», «backlog» ou «aceitar».
- **(e) R3 `residual_departamento_nulo`** — departamento nulo na própria vaga segue «N/A», como já é para vaga
  ativa: **4 vagas** arquivadas sem departamento, com **11 das 16** candidaturas naturais. Opções: «backlog» ou
  «aceitar».
- **(f) R4 `db_types`** — `database.types.ts` (223613 octetos) tem **0** ocorrências de
  `ler_vagas_das_minhas_candidaturas`; o cliente usa o cast estreito confinado a `lerVagasDasMinhasCandidaturas()`
  (`candidaturasService.ts:339-355`) com o comentário de quem o retira (D-52-G7-5; o gerador roda só como prova;
  motivo: portão do push e o `--caminhos` do 52-22). Opções: «aceitar» ou «plano novo».
- **(g) WR-01 e WR-02** (acima), cada um: «consertar agora» (código muda → `<verify>` inteiro da Task 2 verde no
  commit do conserto → review NOVO `-2` → Task 4 de novo), «backlog» ou «aceitar». Recomendação do revisor, como
  informação: WR-01 backlog; WR-02 backlog antes do 52-20.
- **(h) Achado destrutivo:** nenhum (critical 0; Summary do review: «nada crítico e nada destrutivo») — não se aplica.
- **INFO:** IN-01..IN-09 com default «aceitar»; o operador pode mandar qualquer uma ao backlog.

### Observação — opções da §Task 3 × contrato da Task 4

As «perguntas prontas» da §Task 3 ofereciam, em R2, «aceitar ou plano novo» e, em R3, «aceitar ou plano novo». As
perguntas acima seguem o `<context>` da Task 4 e o regex do segundo `<verify>` dela, que aceitam R2 ∈ {plano-novo,
backlog, aceitar} e R3 ∈ {backlog, aceitar}. Um «plano novo» para R3 não cabe no contrato — se o operador o
quiser, a resposta precisa ser traduzida por ele (p.ex. «backlog» com o texto do plano no `## Backlog`), não por
este executor.

### Sinal de retomada esperado do operador

«janela única: confirmo» + «D-52-G7-1: confirmo» + a disposição de R1 (`plano-novo|backlog|aceitar`), R2
(`plano-novo|backlog|aceitar`), R3 (`backlog|aceitar`), R4 (`aceitar|plano-novo`) + a disposição de WR-01 e WR-02
(`consertar|backlog|aceitar`) e qualquer INFO que vá ao backlog; ou «vetar: <motivo>». Com a resposta, a próxima
continuação escreve `52-31-DECISAO.md` (verbatim), commita só ela, roda o segundo `<verify>` da Task 4 e completa
esta §Task 4 — ainda antes do pin da Task 5.

### Resposta do operador (recebida 2026-10-12 17:59 -03 = 2026-10-12T20:59Z, verbatim)

```
janela única: confirmo + D-52-G7-1: confirmo + R1: plano-novo (52-32, antes do 52-19: avaliacaoService.ts:118, redacaoService.ts:150 e exportacaoService.ts:1005, mesmo molde do 52-31 — leitura com guarda de posse e allowlist só dos campos que cada leitor usa; regenerar database.types.ts no mesmo plano) + R2: aceitar (a mensagem da página pública é verdadeira; o card do painel é o que importa) + R3: backlog + R4: aceitar (tipos regenerados no 52-32) + WR-01: backlog + WR-02: entra no 52-32 (o capturar() precisa fotografar vagas antes do ensaio da limpeza no 52-20) + INFO: aceitar todos.
```

Nenhum «consertar agora»: nenhum código mudou, nenhuma rodada de conserto, nenhum review `-2` — o review de maior N
segue o `52-REVIEW-G7-1.md` e o re-portão da Task 2 não se aplica (critério 3 da Task 4).

### Decisão escrita — `52-31-DECISAO.md` (commit `2721ef71`, só esse arquivo)

`docs(52-31): decisao do G-52-7 — aplicar sobre 52-REVIEW-G7-1 (warnings 2: WR-01 backlog, WR-02 ao 52-32; R1 plano-novo 52-32, R2 aceitar, R3 backlog, R4 aceitar)`
— `1 file changed, 105 insertions(+)`; pre-commit `tsc errors: 89 (frozen baseline: 96)`.

Chaves: `decisao: aplicar` · `revisao: 52-REVIEW-G7-1.md` · `warnings: 2` · `autorizacao: 52-UAT.md` (contexto; não
exigida com warnings > 0) · `disposicao_WR-01: backlog` · `disposicao_WR-02: backlog — entra no 52-32 (…)` ·
`d52_g7_1: confirmada` · `residual_leitores_embed: plano-novo` · `residual_detalhe_vaga: aceitar` ·
`residual_departamento_nulo: backlog` · `db_types: aceitar` · `janela_unica: confirmada` ·
`decidido_em: 2026-10-12 17:59 -03`; seções `## Resposta do operador` (verbatim), `## Backlog` (R3, WR-01) e
`## Plano novo (52-32, antes do 52-19)` (R1, WR-02, regeneração do `database.types.ts`).

Mapeamento de vocabulário (instrução do orquestrador no despacho, não leitura do executor): «WR-02: entra no 52-32» →
`disposicao_WR-02: backlog` com o texto do operador depois do travessão (o contrato aceita só
`consertar|backlog|aceitar`; o item vai ao plano novo seguinte, não a este).

### `<verify>` 2 da Task 4 — contrato da decisão (rodado como escrito, HEAD `2721ef71`, 2026-10-12T21:03Z) — VERDE

```
decisao do G-52-7: aplicar sobre 52-REVIEW-G7-1.md (warnings=2)
EXIT=0
```

### Disposição de cada WARNING/INFO do `52-REVIEW-G7-1.md`

| achado | disposição | dono |
|---|---|---|
| WR-01 — varredura do POS sobre `v.<coluna>` sensível a caixa | **backlog** | Pending Todos (orquestrador copia do `## Backlog` da DECISAO) |
| WR-02 — `capturar()` sem chave para `public.vagas` | **backlog → plano novo 52-32** («o capturar() precisa fotografar vagas antes do ensaio da limpeza no 52-20») | próximo `/gsd-plan-phase 52 --gaps` |
| IN-01..IN-09 | **aceitar** («INFO: aceitar todos») | — |

Residuais: R1 **plano-novo** (52-32, antes do 52-19, com a especificação do operador); R2 **aceitar**; R3 **backlog**;
R4 **aceitar** (os tipos são regenerados no 52-32, que retira o cast estreito).

### Qual caminho valeu para o conteúdo

`warning` = 2 no review de maior N → o conteúdo vale pela **resposta escrita do operador aos dois WR** (nenhum
«consertar agora»: os dois ficam fora deste plano), e não só pela autorização do UAT; a promoção do gap e a preferência
de desenho (verbatim na DECISAO) ficam como contexto. Janela única confirmada por escrito; D-52-G7-1 confirmada;
nenhum achado destrutivo (item (h) não se aplica). Task 4 encerrada — a próxima é a Task 5 (pin, Passo 0b, apply),
e este commit da FRONTEIRA vem ANTES do pin.

---

## §Task 5 — sessão C, 2026-10-12 ([BLOCKING] apply, provas em PROD, db:types só como prova, push)

### Precondition (medida 2026-10-12T21:03:56Z, HEAD `954b3e4b`) — satisfeita

- `<verify>` 1 da Task 4 de novo, como escrito: `PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7-1.md reviewed_head=133429d103c7e70d589b6068f33dbb76fc3f3d46 pin=- modo=revisao` (exit 0).
- `<verify>` 2 da Task 4 de novo: `decisao do G-52-7: aplicar sobre 52-REVIEW-G7-1.md (warnings=2)` (exit 0) — `janela_unica: confirmada`, `d52_g7_1: confirmada`, resposta verbatim.
- Ledger só leitura: `{"no_ledger": 0, "ausente": true}` (`20261011000006` fora do ledger; função ausente).
- `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` vazio; nenhum `52-31-SUMMARY.md`; `refs/gsd/52-31/sha` inexistente antes do Passo 0.

### Passo 0 — pin (2026-10-12T21:04:05Z)

`git rev-parse --verify -q refs/gsd/52-31/sha || git update-ref refs/gsd/52-31/sha HEAD ""` → rc=0;
**`refs/gsd/52-31/sha` = `954b3e4b33a6cd290241793bf1df000083a49d81`** = HEAD = o commit da FRONTEIRA §Task 4 (commitada
ANTES do pin, regra do plano). Entre o pin e o apply: nenhum commit (esta seção ficou só no disco até depois do
registro do apply).

### Passo 0b — re-medição imediatamente antes (HEAD = pin `954b3e4b`) — VERDE

Ensaio exato (`node scripts/p52_ensaio.cjs --migracoes=supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql supabase/tests/p52_painel_vaga_smoke.sql`), 2026-10-12T21:04:18Z, exit 0:

```
ensaio: prefixadas=[20261011000006] aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] ausentes=[20261011000004] arquivos=supabase/tests/p52_painel_vaga_smoke.sql
ENSAIO VERDE: supabase/tests/p52_painel_vaga_smoke.sql · prefixadas=[20261011000006] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000004] · smokes=[52p=10/10] · evidencia=painel:vagas_candidato=ok 52p.pop=cand:22,naturais:16 52p.alvo=publica · 877 ms
```

(A primeira rodada, às 21:04:09Z, imprimiu a mesma linha `ENSAIO VERDE … 52p=10/10 … 1175 ms`, mas o exit não foi
capturado — `PIPESTATUS` não existe no zsh do terminal; repetida com o exit capturado, acima. Ensaio que aborta: nada
persiste.)

Último `<automated>` da Task 2 (tipografia, build, marcadores), 2026-10-12T21:04:25Z → 21:04:31Z, exit 0:

```
TIPOGRAFIA OK (71 linhas acrescentadas varridas)
marcadores no chunk eager do candidato
```

`grep -rl` → `painel-vaga-titulo` e `ler_vagas_das_minhas_candidaturas` ambos em `build/assets/index-CFPYr-z6.js` (o
mesmo chunk da §Task 2 e do revisor). Árvore vigiada limpa depois do build.

### Passo 1 — apply e o instante, num comando só (o comando do plano, byte a byte; 2026-10-12T21:04:37Z → 21:04:41Z) — VERDE

```
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7-1.md reviewed_head=133429d103c7e70d589b6068f33dbb76fc3f3d46 pin=954b3e4b33a6cd290241793bf1df000083a49d81 modo=apply
registro: 20261011000006 aplicado_ate 2026-10-12T21:04:42Z

── 20261011000006_p52_vagas_das_minhas_candidaturas.sql
   version : 20261011000006
   name    : p52_vagas_das_minhas_candidaturas
   octetos : 17020
   md5     : 810bbace769390c8ab1b78324ecc388b
   ✅ aplicada e escriturada — md5 do ledger BATE (17020 octetos)
APPLY EXIT=0
```

(`aplicado_ate` = `now()` do servidor arredondado para cima, lido só leitura depois da resposta do `migrate`; o relógio
local marcava 21:04:41Z no fim do comando — o servidor está à frente por fração de segundo, e o teto nunca põe o
instante antes do COMMIT.) Nenhuma recusa do portão nem do PRE/POS; nenhum `55P03`/`57014`; registro gravado pela
máquina no mesmo comando (nenhuma entrada à mão).

Registro commitado sozinho: **`b0945868`** `docs(52-31): instante do apply da 20261011000006 (D-41 emendada, condicao 1 — ultimo apply da fase)` — só `52-APLICACOES.json` (+5 linhas: a entrada da 0006).
`git rev-list refs/gsd/52-31/sha..b0945868` = só `b0945868` → nenhum commit entre o pin e o apply.

### Passo 2 — provas em PROD

`<verify>` 1 da Task 5 (só leitura), 2026-10-12T21:04:57Z, exit 0:

```
G-52-7 em PROD: ledger = arquivo; RPC no contrato de catalogo; anon e PUBLIC sem EXECUTE, authenticated com; registro cobre 5 versoes p52; ultimo apply da fase = 20261011000006 2026-10-12T21:04:42Z
```

`<verify>` 2 da Task 5 (smoke52p CONTRA O VIVO e P1–P10 em `--pos-apply`), 2026-10-12T21:05:01Z → 21:05:21Z, exit 0:

```
ENSAIO VERDE: supabase/tests/p52_painel_vaga_smoke.sql · prefixadas=[] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006] · ausentes=[20261011000004] · smokes=[52p=10/10] · evidencia=52p.pop=cand:22,naturais:16 52p.alvo=publica · 811 ms
P1 morde: … -> P52P FAIL (b) [outro_elementos_que_nao_sao_dele:42,outro_ve_candidaturas_do_dono:2,sub_sem_candidato:ok:n=44] (987 ms)
P2 morde: … filtro de vaga publica (status = 'ativa' AND deleted_at IS NULL) no WHERE -> P52P FAIL (a) […] 
P3 morde: … 'status', v.status na projecao -> P52P FAIL (c) [dono_vivo_chaves:candidatura_id|departamento|status|titulo,…]
P4 morde: … a guarda aceita rh e administrador -> P52P FAIL (g) [administrador_sub_do_admin:ok:n=3,rh_sub_do_recrutador:ok:n=0,administrador_sub_do_dono:ok:n=2] (1456 ms)
P5 morde: GRANT EXECUTE … a anon depois da migration -> P52P FAIL (f) [anon_com_execute:true,anon_chamada:err:42501:forbidden] (1392 ms)
P6 morde: … sem AND c.is_rascunho = false -> P52P FAIL (h) [rascunho_diferente_do_vivo_menos_o_alvo:n=2/esperado=1] (706 ms)
P7 morde: … AND v.deleted_at IS NULL no WHERE -> P52P FAIL (i) [alvo_sem_titulo_e_departamento_da_vaga_apagada:ok:n=1] (1191 ms)
P8 morde: … a guarda sem v_uid IS NULL OR -> P52P FAIL (e) [candidato_sem_sub:ok:n=0] (804 ms)
P9 morde: … sem a guarda de papel -> P52P FAIL (e) [sem_claims:ok:n=0,sem_papel:ok:n=2,candidato_sem_sub:ok:n=0] (1533 ms)
P10 morde: … CROSS JOIN (VALUES (1), (2)) logo depois da juncao de vagas (cada candidatura duas vezes) -> P52P FAIL (d) [repetidas:32_linhas_em_22/22_candidatos] (1661 ms)
leitura so-leitura igual a baseline: ledger=["20261011000001","20261011000002","20261011000003","20261011000005","20261011000006"] funcoes=8 mutacoes_p52=0 fixtures_p52={"users":0,"candidatos":0}
MUTACOES: 10/10 mordem; controle verde; nada persistiu (so=P1,P2,P3,P4,P5,P6,P7,P8,P9,P10) (pos-apply) (aposentadas: B1,B2,B3,B4,B5,B6)
```

(As linhas `Pn morde` acima foram encurtadas com `…` só no nome repetido da função e em listas longas de rótulos; as
linhas `ENSAIO VERDE`, `leitura so-leitura` e `MUTACOES:` estão inteiras. Cada P morde na sua letra, como no ensaio da
§Task 2: P1→b, P2→a, P3→c, P4→g, P5→f, P6→h, P7→i, P8→e, P9→e, P10→d.)

### Passo 3 — prova do db:types (só leitura; nada commitado), 2026-10-12T21:05:30Z → 21:05:33Z — VERDE

`supabase` CLI já instalado (`/opt/homebrew/bin/supabase`), **versão 2.116.0** (nenhuma instalação; o aviso de versão
nova v2.120.0 foi ignorado). `<verify>` 3 como escrito, `< /dev/null` incluso, temporário por `mktemp` e removido:

```
db:types (so prova): rc=0 octetos=223687 linhas+=2 linhas-=1 funcao=presente
database.types.ts versionado intacto (D-52-G7-5)
```

Temporário 223687 octetos contra o versionado 223613 (+74); diff = +2/−1 linhas, compatível só com a entrada da função
nova (nenhuma deriva alheia acusada pelo número de linhas). `git status --porcelain -- database.types.ts` vazio; o
cast estreito sai no 52-32 (R4/DECISAO), que regenera os tipos.

### Passo 4 — o «Comando de push» do `<context>`, byte a byte (2026-10-12T21:05:41Z → 21:05:49Z) — VERDE

**`R` = `70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8`** (origin/main antes) · **`S` = `b0945868c9f37f2003b1c8bd01019e0691754569`** (HEAD).

```
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7-1.md reviewed_head=133429d103c7e70d589b6068f33dbb76fc3f3d46 pin=954b3e4b33a6cd290241793bf1df000083a49d81 modo=push ledger=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006]
de7d5f1f8dcf0d124e0e83f937fb61f051a7d09e planning docs(52-30): SUMMARY — publicacao dos consertos do UAT da 52 (push por sha 70528fba, deploy git-source apos incidente da Vercel, conferencia visual aprovada, gap novo da vaga inativa)
7f46b8ee0d65ee62d65852c3f003c5425927d2f9 planning docs(phase-52): tracking a mao apos a onda 3 do gap closure — 52-30 concluido e publicado (25/30); backlog e gap novo nos Pending Todos
73976117f950d8aef7653a78b33d9494ec1f6148 planning docs(phase-52): UAT reconciliado a mao — G-52-2, G-52-4, G-52-4b e G-52-6 resolved com a evidencia da Task 3 do 52-30; G-52-7 (vaga inativa no painel) registrado como gap da fase
db97d12edd68b5325170804c0e8de373a38702f2 planning docs(52-31): plano do gap G-52-7 — titulo e departamento da vaga inativa no painel do candidato por RPC com guarda de posse e allowlist (onda 14)
67f8fff9544a7d3b3a2a1a70867d42b5b0a7554f planning docs(52-31): revisão 1 do plano — fronteira de retomada depois do tracer, P10 morde (d), re-portão antes do review novo, ordem 52-31 → 52-19 no grafo
3bb37097c79c8aae881dba8a3b68a502dc74d0cb planning docs(52-31): revisão 2 — fronteira da sessão A fora do SUMMARY e parada mecânica na tracer
eec21fc2bfea4bf3d24569e9b5394a2188fc2d0a planning docs(phase-52): tracking a mao — 52-31 (G-52-7) planejado e verificado em 3 rodadas (0 blockers, 0 warnings, 2 INFO); ROADMAP 25/31; proximo /gsd-execute-phase 52 --gaps-only
0606acdbf78be1fa37e53e4b70403d9959eafb38 codigo feat(52-31): ler_vagas_das_minhas_candidaturas — o candidato le titulo e departamento da vaga das proprias candidaturas em qualquer status (G-52-7)
e7f4054d159195ef0d53ce6ef28fd2f9a8597ee9 codigo chore(52-31): p52_ensaio conhece a 20261011000006 (MIGS na ordem de aplicacao, par 52p)
e307fd7893c815854e6998f07722150c1da56825 codigo test(52-31): smoke52p (tracer — dono le vaga inativa, outro candidato nao, allowlist exata)
a103a180f82cdfdf5a3d2d4e31ad4f5725fc2a3e codigo test(52-31): painel com vaga inativa mostra titulo e departamento (vermelho antes do conserto)
38d654212d5d24e4c38c3d7d393fddaeb4853390 codigo fix(52-31): painel do candidato mescla titulo e departamento da RPC quando o embed da vaga vem nulo (G-52-7)
b92ed23a98e0d3fffb309ff0271939f4a4a50e1a planning docs(52-31): registro entre sessoes §Task 1 — tracer verde (fronteira de retomada da sessao A)
b326a2157ef5a18384ee2631200046530ff0055a codigo test(52-31): smoke52p completo (10 clausulas) e mutacoes P1-P10
587481acc153e1a7f1ea78e2509bf8a8363b3566 codigo test(52-31): a mescla do servico e os casos restantes do painel (erro da RPC, embed presente, dialogo de retirada)
17b5042908d37999fe2618819827a74b9fb2fe07 planning docs(52-31): emenda datada do G-52-7 no UAT — vaga com deleted_at mostra o titulo (D-52-G7-1); a leitura entrega so titulo e departamento (D-52-G7-4)
133429d103c7e70d589b6068f33dbb76fc3f3d46 planning docs(52-31): registro entre sessoes §Tasks 2-3 — residuais medidos e emenda do UAT (fronteira da sessao B)
e6fbeaf9d43e55750d3dc3bb6b9a05da070c962c planning docs(52-31): review adversarial do G-52-7 — 52-REVIEW-G7-1 (critical 0, warning 2, info 9)
68b7ad3bbde8bf861d8e0387a6c80dd5727c4548 planning docs(52-31): registro entre sessoes §Task 4 — review G7-1 no portao, perguntas ao operador
2721ef7164dde183b67a4eb91bec6abbabf7de51 planning docs(52-31): decisao do G-52-7 — aplicar sobre 52-REVIEW-G7-1 (warnings 2: WR-01 backlog, WR-02 ao 52-32; R1 plano-novo 52-32, R2 aceitar, R3 backlog, R4 aceitar)
954b3e4b33a6cd290241793bf1df000083a49d81 planning docs(52-31): registro entre sessoes §Task 4 — decisao do operador registrada
b0945868c9f37f2003b1c8bd01019e0691754569 planning docs(52-31): instante do apply da 20261011000006 (D-41 emendada, condicao 1 — ultimo apply da fase)
enumeracao ok: 22 commit(s) em 70528fba..b0945868 · codigo coberto por 52-REVIEW-G7-1.md (reviewed_head 133429d1) · codigo contido no apply 954b3e4b
```

`git push` (stderr): `To github.com:fercosnt/SistemaRecrutamento.git` / `70528fba..b0945868  b0945868c9f37f2003b1c8bd01019e0691754569 -> main`; exit 0.

22 commits: **15 `planning`** (`de7d5f1f`, `7f46b8ee`, `73976117` entre eles) e **7 `codigo`** (todos ancestrais do
`reviewed_head` `133429d1` e do pin `954b3e4b`), **0 ALHEIO**. Nenhum `PORTAO RECUSADO`, `COMMIT ALHEIO: PARAR` nem
`REVISAO NAO COBRE A BASE`; `merge-base --is-ancestor R S` verdadeiro. O comando não foi reescrito, o `--caminhos`
não foi alargado e o pin não se moveu.

### Passo 5 — `<verify>` 4 logo depois do push (sem commit no meio), 2026-10-12T21:05:52Z → 21:05:55Z — VERDE

```
origin/main = HEAD; pin 52-31 e os tres commits de .planning no remoto; nada local
```

### Passo 6 — `<verify>` 5, repetido sem mudança até aparecer — VERDE

```
[1] 2026-10-12T21:06:02Z rc=1 :: AUSENTE no chunk index de PROD: painel-vaga-titulo, ler_vagas_das_minhas_candidaturas (visitados=53; achados={"painel-vaga-titulo":[],"ler_vagas_das_minhas_candidaturas":[]})
[2] 2026-10-12T21:07:18Z rc=0 :: PRESENTE em PROD (chunk index): {"painel-vaga-titulo":["/assets/index-CFPYr-z6.js"],"ler_vagas_das_minhas_candidaturas":["/assets/index-CFPYr-z6.js"]}
```

**Chunk em PROD = `assets/index-CFPYr-z6.js`** às 2026-10-12T21:07:18Z (~1,5 min depois do push de 21:05:49Z), o mesmo
hash do build local da Passo 0b e do build do revisor: o que está no ar é byte a byte o que foi medido e revisado. O
deploy automático da Vercel construiu sozinho desta vez (o incidente do 52-30 não se repetiu); nenhum deploy à mão,
nenhum `efdeploy.cjs`, nada do disco local.

### D-41 emendada, condição 1 — consequência deste apply

O `aplicado_ate` da 0006 é **`2026-10-12T21:04:42Z`**, o maior do `52-APLICACOES.json` (o `<verify>` 1 confere).
**O 52-19 só depois de um backup diário COMPLETED posterior a `2026-10-12T21:04:42Z`; na prática, a manhã seguinte**
(depois do backup das ~06:28 UTC de 2026-10-13), nunca nesta tarde. Por decisão do operador (`52-31-DECISAO.md`), o
plano novo **52-32 vem antes do 52-19**; se ele aplicar migration, o «último apply da fase» passa a ser o dele e a
espera do 52-19 se recalcula pelo `aplicado_ate` do 52-32 (o `p52_backup.cjs` lê o maior por forma).

### Origin/main depois desta parada

`origin/main` = `b0945868` = HEAD até este ponto. O commit desta FRONTEIRA (e, depois da Task 6, o do
`52-31-SUMMARY.md`) **reabrem `git log origin/main..HEAD` só com `.planning/`** — esperado e declarado: sobem no
próximo push com plano (o do 52-32 ou o do bloco D), como `de7d5f1f`/`7f46b8ee`/`73976117` subiram neste.

### Desvios e observações (Task 5)

1. **Passo 0b rodado duas vezes** (o exit da primeira não foi capturado por causa do `PIPESTATUS` no zsh); as duas
   imprimiram `ENSAIO VERDE … smokes=[52p=10/10]`. Ensaio que aborta — nada persistiu (confirmado de novo pela
   linha `leitura so-leitura igual a baseline` do Passo 2).
2. Os comandos do plano (apply, os cinco `<verify>`, o «Comando de push») foram extraídos das linhas do
   `52-31-PLAN.md` por máquina para scripts no scratchpad e rodados com `bash`, sem edição — cópia byte a byte (o
   plano não tem entidades HTML a decodificar).
3. Nada além dos comandos do plano tocou PROD: nenhum `p46apply.cjs run`, `supabase db push`, `efdeploy.cjs` nem
   deploy manual da Vercel. Nenhum `52-31-SUMMARY.md`; STATE/ROADMAP intocados.

fronteira_retomada: sessao_c_parada 2026-10-12T21:08Z head=b0945868c9f37f2003b1c8bd01019e0691754569

---

## § Task 6 — conferência no ar do operador (2026-10-12)

### `<automated>` da Task 6 — marcadores no chunk index de PROD — VERDE

Orquestrador, antes de pedir a conferência (2026-10-12T21:09:41Z), exit 0:

```
PRESENTE em PROD (chunk index): {"painel-vaga-titulo":["/assets/index-CFPYr-z6.js"],"ler_vagas_das_minhas_candidaturas":["/assets/index-CFPYr-z6.js"]}
```

Re-rodado por este executor como escrito no plano, depois da resposta e antes deste SUMMARY (2026-10-12T21:17:33Z), exit 0:

```
PRESENTE em PROD (chunk index), pronto para a conferencia: {"painel-vaga-titulo":["/assets/index-CFPYr-z6.js"],"ler_vagas_das_minhas_candidaturas":["/assets/index-CFPYr-z6.js"]}
```

**Chunk servido = `assets/index-CFPYr-z6.js`**: o mesmo hash do build local (Passo 0b da Task 5), do build do revisor e do primeiro `PRESENTE` das 21:07:18Z. O que o operador viu é o código revisado.

PROD só leitura, medido pelo orquestrador às 21:09:41Z: md5 do ledger `810bbace769390c8ab1b78324ecc388b` = arquivo; `anon` sem EXECUTE, `authenticated` com; `prosecdef` true; `aplicado_ate` da 0006 = `2026-10-12T21:04:42Z`; `origin/main..HEAD` = só `e2d83872`.

### Resposta do operador (recebida 2026-10-12 ~18:15 -03 ≈ 2026-10-12T21:15Z, verbatim)

```
aprovado.
1. +cand1, card da d31c78bb (Entrevista online): título «[TESTE E2E] Social Media junior 1— Produção e Captação de Conteúdo» e departamento «Marketing», sem «Vaga não encontrada» nem «N/A» (print).
2. Controle: o card da f59e7281 (Social Media ativa) segue igual, com a linha de prazo (provas pendentes).
3. Diálogo de retirada: não testado.
4. Clique no card → /vagas/…: não testado.
```

### Leitura da resposta (o que ela cobre e o que não cobre)

- **Item 1 (G-52-7, caso observado): aprovado, com print.** O cartão da `d31c78bb` (vaga `629a5f31`, inativa) mostra o título e o departamento vindos da RPC. É a truth do G-52-7 vista no ar.
- **Item 2 (controle): aprovado.** O cartão da `f59e7281` (vaga ativa, embed presente, a RPC não é consultada para ela) segue igual, com a linha de prazo. A premissa `assumptions` do frontmatter do plano (E10 não muda) foi vista no ar.
- **Item 3 (diálogo de retirada): NÃO TESTADO pelo operador.** O item era opcional no `<how-to-verify>`. A única cobertura é o Vitest `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx > painel do candidato — candidatura de vaga inativa (G-52-7) > (5) o diálogo de «Retirar minha candidatura» da vaga inativa nomeia a vaga pelo título da RPC`, verde no HEAD, e a mordida dele foi medida (R4 da §Task 2: com o `candidaturasService.ts` de antes do GREEN, `o título do diálogo com o nome da vaga vindo da RPC: expected null not to be null`). Coverage D3, `human_judgment: true`.
- **Item 4 (clique → `/vagas/…`): NÃO TESTADO pelo operador.** É o residual R2, aceito por escrito (`residual_detalhe_vaga: aceitar — a mensagem da página pública é verdadeira; o card do painel é o que importa.`, `52-31-DECISAO.md`). Este plano não muda esse comportamento. Coverage D4, `human_judgment: true`.
- **Registro literal:** a resposta não menciona a largura de 360px nem a recarga sem cache, que o `<how-to-verify>` pedia em cada tela. «aprovado» está registrado como veio, sem acréscimo. Se o `/gsd-verify-work 52` quiser essas duas condições explícitas, a pergunta é ao operador.

## Files Created/Modified

- `supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql` (novo, aplicado em PROD): a RPC, com PRE/POS `P52-06`, ACL e COMMENT
- `supabase/tests/p52_painel_vaga_smoke.sql` (novo): smoke52p, cláusulas (a)–(j), prefixo `P52P`, par `52p`
- `scripts/p52_ensaio.cjs`: `MIGS` + 0006 (entre a 0005 e a 0004), `PARES` + `52p`, reset no `PREFIXO`
- `scripts/p52_mutacoes.cjs`: `SMOKES` + smoke52p; `V06`, `S52P`, `fnVagas`; P1–P10
- `src/features/vagas/services/candidaturasService.ts`: `RPC_VAGAS_DAS_MINHAS_CANDIDATURAS`, `VagaDaMinhaCandidatura`, `mesclarVagasDasCandidaturas`, `lerVagasDasMinhasCandidaturas` (cast estreito) e a mescla em `listCandidaturas`
- `src/components/pages/DashboardCandidatoPage.tsx`: só os `data-testid` `painel-vaga-titulo` e `painel-vaga-departamento`
- `src/features/vagas/services/__tests__/candidaturasService.vagaInativa.test.ts` (novo, 13 casos)
- `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx` (novo, casos (1)–(5))
- `.planning/phases/52-hub-do-rh-dados-e-contato/52-UAT.md`: duas emendas datadas no `missing` do G-52-7
- `.planning/phases/52-hub-do-rh-dados-e-contato/52-APLICACOES.json`: entrada `20261011000006`
- `.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7-1.md` (orquestrador), `52-31-DECISAO.md`, `52-31-FRONTEIRA.md`

## Decisions Made

As decisões D-52-G7-1..7 estão no frontmatter (`key-decisions`), com a voz do operador verbatim na D-52-G7-1. Disposição de cada achado do `52-REVIEW-G7-1.md` e de cada residual, segundo `52-31-DECISAO.md` (resposta do operador de 2026-10-12 17:59 -03, verbatim lá e na §Task 4 acima):

| item | disposição | dono |
|---|---|---|
| D-52-G7-1 | `confirmada` («D-52-G7-1: confirmo») | — (encarnada na RPC e no smoke (a)/(i), P2/P7) |
| janela única | `confirmada` | — |
| WR-01 (POS sensível a caixa) | backlog | Pending Todos (orquestrador, do `## Backlog` da DECISAO) |
| WR-02 (`capturar()` sem `vagas`) | backlog — entra no 52-32 | plano novo 52-32 |
| IN-01..IN-09 | aceitar («INFO: aceitar todos») | — |

## Residuais R1–R9 — evidência, disposição e dono

| R | o quê | evidência | disposição | dono |
|---|---|---|---|---|
| R1 | leitores do embed `vaga:vagas` sob a RLS do candidato: `avaliacaoService.ts:118`, `redacaoService.ts:150` (`!inner`), `exportacaoService.ts:1005` | §Task 3: `f73682b6` (`avaliacao_assincrona`, vaga arquivada, `vaga_visivel:false`) sem cards e sem «Avaliações concluídas — aguardando a equipe»; redação por link direto → «Candidatura não encontrada»; 2 das 16 naturais com «Vaga não identificada» | `plano-novo` — 52-32, antes do 52-19, «mesmo molde do 52-31 — leitura com guarda de posse e allowlist só dos campos que cada leitor usa; regenerar database.types.ts no mesmo plano» | próximo `/gsd-plan-phase 52 --gaps` |
| R2 | o clique no cartão → `/vagas/:id` diz «Vaga não encontrada ou não está mais ativa» (`VagaDetalhePage.tsx:88-91`) | §Task 3: as 16 candidaturas vivas naturais de vaga não pública | `aceitar` — «a mensagem da página pública é verdadeira; o card do painel é o que importa» | — |
| R3 | departamento nulo na própria vaga → «N/A» | 4 vagas arquivadas sem departamento, 11 das 16 naturais | `backlog` | Pending Todos |
| R4 | `database.types.ts` sem a RPC; cast estreito em `lerVagasDasMinhasCandidaturas()` | 0 ocorrências no versionado (223613 octetos); a prova do gerador deu `funcao=presente`, +2/−1 linhas (CLI 2.116.0) | `aceitar` — «tipos regenerados no 52-32» | 52-32 retira o cast no commit dos tipos |
| R5 | texto do `52-19-PLAN.md` que nomeia a 0005 como último apply | três âncoras citadas em Next Phase Readiness | emenda datada | orquestrador, antes do 52-19 |
| R6 | `52-UAT.md` com `status: diagnosed`; a precondition do 52-19 exige `status: complete` | frontmatter do UAT lido agora: `status: diagnosed`; G-52-7 `status: failed` | reconciliar com a § Task 6 | orquestrador / `/gsd-verify-work 52` |
| R7 | população do smoke52p (≥ 2 candidatos com candidatura viva) pode cair com a limpeza do bloco D | hoje `52p.pop=cand:22,naturais:16`; a recusa é ALTA (`P52P FAIL (baseline)`), nunca verde vácuo | registrar | quem rodar o smoke52p no 52-20/52-22 |
| R8 | o embed traz `id, cidade, estado, status` da vaga que o cartão não lê | D-52-G7-4 (medido) | higiene de projeção, fora do G-52-7 | — (sem plano) |
| R9 | até duas chamadas à RPC por carga do painel quando há vaga não pública | D-52-G7-4; IN-09 do review, confirmada no código | aceitar (IN-09) | — |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Asserção de uma linha no caso (1) do painel (sessão A)**
- **Found during:** Task 1 (Passo 4, RED do cliente)
- **Issue:** o relatório TAP da Vitest não escapa a mensagem multilinha do Testing Library, e o `gsd-tools check tdd-red-evidence` recusou o registro com `invalid_record` («Non-TAP data in report», «Malformed TAP»).
- **Fix:** a primeira asserção do caso (1) virou `waitFor(() => expect(screen.queryByText(TITULO), '<rótulo>').not.toBeNull(), { onTimeout: (e) => e })`, com a mesma semântica e mensagem de uma linha. Feito antes do commit; o relatório não foi editado.
- **Files modified:** `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx`
- **Verification:** `RED_EVIDENCE_OK` (`target_test_failed`) sobre o RED; verde depois do GREEN
- **Committed in:** `a103a180`

**2. [Rule 3 - Blocking] RED da Task 2 por mutação temporária, com uma mutação errada corrigida (sessão B)**
- **Found during:** Task 2 (testes do cliente, `tdd="true"`)
- **Issue:** o GREEN desta funcionalidade já era o `38d65421` da Task 1, então os 18 testes nasceram verdes. Para provar que os testes novos MORDEM, a sessão B usou mutações temporárias do `candidaturasService.ts`, aplicadas só no disco e desfeitas por arquivo, com `git diff --quiet HEAD` conferido depois de cada uma. Três ajustes aconteceram no caminho: (a) os `toEqual` estruturais produziam TAP multilinha (`invalid_record`, a mesma classe do item 1) e viraram `toBe` sobre `join`/`JSON.stringify` antes do commit; (b) a primeira mutação de R3 (`throw` no lugar de `return null`) saiu `unexpected_green`, porque o `throw` era capturado pelo próprio `try/catch`. A mutação certa também relança no `catch`, e o teste não mudou; (c) o R2 foi refeito sobre o arquivo de teste final.
- **Fix:** registros R1–R4 em `node_modules/.cache/p52-31-red/`, todos `RED_EVIDENCE_OK`
- **Files modified:** `src/features/vagas/services/__tests__/candidaturasService.vagaInativa.test.ts`, `src/components/pages/__tests__/DashboardCandidatoPage.vagaInativa.test.tsx` (código de produção: nenhum commit)
- **Verification:** tabela R1–R4 da §Task 2; delta `mordida=ok`
- **Committed in:** `587481ac`

**3. [Rule 2 - Evidência] Contagem agregada só leitura além das duas sondas da Task 3 (sessão B)**
- **Found during:** Task 3 (Passo 1)
- **Issue:** as duas sondas do `<verify>` não davam número para R1 e R3.
- **Fix:** uma contagem com `set transaction read only`, só contagens, sem id, título ou e-mail. As sondas do `<verify>` rodaram exatamente como escritas.
- **Files modified:** nenhum (saída na §Task 3)
- **Verification:** o revisor re-rodou a contagem e chegou ao mesmo resultado («a medição confere»)
- **Committed in:** `133429d1` (o registro)

**4. [Mapeamento de vocabulário] «WR-02: entra no 52-32» → `disposicao_WR-02: backlog — …` (sessão C)**
- **Found during:** Task 4 (escrita da DECISAO)
- **Issue:** o contrato da decisão aceita só `consertar|backlog|aceitar`, e o operador respondeu «entra no 52-32».
- **Fix:** por instrução do orquestrador no despacho (não por leitura do executor), a disposição ficou `backlog` com o texto do operador depois do travessão. O item vai ao plano novo seguinte, não a este.
- **Files modified:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-31-DECISAO.md`
- **Verification:** `<verify>` 2 da Task 4 → `decisao do G-52-7: aplicar sobre 52-REVIEW-G7-1.md (warnings=2)`
- **Committed in:** `2721ef71`

**Observação (não é desvio):** na Task 5, o Passo 0b rodou duas vezes porque o exit da primeira rodada não foi capturado (`PIPESTATUS` não existe no zsh). As duas rodadas deram `ENSAIO VERDE … 52p=10/10`, e nada persistiu.

---

**Total deviations:** 4 (2 Rule 3 de legibilidade da evidência RED, 1 de evidência adicional só leitura, 1 mapeamento de vocabulário por instrução do orquestrador)
**Impact on plan:** nenhum mudou código de produção nem o que foi a PROD. Nenhuma rodada de conserto, nenhum review `-2`, e o pin não se moveu.

## Issues Encountered

- **WR-02: o ensaio não fotografa `public.vagas`.** A sessão A já tinha observado isso (desvio/observação 2 da §Task 1) e o revisor confirmou: o `capturar()` do `scripts/p52_ensaio.cjs` não tem chave para `vagas`, e o smoke52p escreve `vagas.status`/`deleted_at` dentro dos envelopes `P52P1`. Hoje nada persistiu: a impressão digital de `vagas` deu `15:5adc811e…` antes e depois, e há três camadas de proteção (envelope, `ponto()`, sentinela). A fraqueza é de DETECÇÃO: um `UPDATE` fora de envelope numa cláusula futura sairia verde no `PERSISTIU`. **Vai ao 52-32** (chave estreita `vagas_estado`), antes do ensaio da limpeza no 52-20.
- A Vercel construiu o push sozinha em ~1,5 min. O incidente do 52-30 não se repetiu, e não houve deploy à mão.

## Known Stubs

Nenhum. O cast estreito de `lerVagasDasMinhasCandidaturas()` é pendência de tipos com dono (R4 → 52-32), não um stub: os dados vêm da RPC real.

## Threat Flags

Nenhum além do `<threat_model>` do plano. A superfície nova (uma RPC SECURITY DEFINER exposta a `authenticated`) é a T-52-102..107, mitigada e provada pelo smoke52p e por P1–P10 contra o vivo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**A ORDEM** (aceitação da Task 6 do plano, com o 52-32 inserido pela decisão do operador):

1. **Reconciliar o G-52-7 no `52-UAT.md` com esta evidência** (orquestrador, como os quatro do 52-30): o G-52-7 hoje está `status: failed`, e a § Task 6 acima é a evidência. Junto, **o `status` do UAT que o 52-19 confere**: o frontmatter diz `status: diagnosed`, e a precondition do 52-19 exige `status: complete` (R6).
2. **Emendar as linhas do `52-19-PLAN.md` que nomeiam a 0005 como último apply** (R5, emenda datada pelo orquestrador; este plano não edita tasks de outro plano). Âncoras pelo texto citado, porque os números de linha podem andar:
   - `:24` (truth): «(na prática: antes da manhã seguinte ao apply da `20261011000005`)»
   - `:120` (precondition): «Na prática: a manhã seguinte ao apply da `20261011000005` (52-26), depois do backup das ~06:28 UTC.»
   - `:148` (acceptance): «`BACKUP CONFERIDO (D-41): ultimo backup fisico COMPLETED <B> > ultimo apply da fase <L> (20261011000005); walg_enabled=true`»

   O `p52_backup.cjs` lê o maior `aplicado_ate` por forma, então o comportamento já é o certo; só o texto esperado passa a dizer 0006 (ou a versão do 52-32, se ele aplicar migration).
3. **Plano novo 52-32, ANTES do 52-19** (decisão do operador, `52-31-DECISAO.md` § Plano novo):
   - **R1**: os três leitores do embed (`avaliacaoService.ts:118`, `redacaoService.ts:150`, `exportacaoService.ts:1005`), com a especificação do operador verbatim: «mesmo molde do 52-31 — leitura com guarda de posse e allowlist só dos campos que cada leitor usa; regenerar database.types.ts no mesmo plano»;
   - **WR-02**: o `capturar()` passa a fotografar `vagas` («o capturar() precisa fotografar vagas antes do ensaio da limpeza no 52-20»);
   - **regenerar `database.types.ts` e retirar o cast estreito** de `lerVagasDasMinhasCandidaturas()` no mesmo commit (R4, por decisão do operador).
4. **Backlog** (orquestrador copia do `## Backlog` da DECISAO aos Pending Todos): **R3** (departamento nulo → «N/A») e **WR-01** (POS case-insensitive: `regexp_matches(lower(v_cod), '\mv\.("?)([a-z_]+)\1', 'g')` com `m[2]`, para a próxima migration que copiar o molde).
5. **Depois, o 52-19**, só com um backup diário COMPLETED posterior a **`2026-10-12T21:04:42Z`** (o `aplicado_ate` da 0006, hoje o maior do `52-APLICACOES.json`). Na prática é a manhã seguinte, depois do backup das ~06:28 UTC de 2026-10-13, nunca nesta tarde (D-41 emendada, condição 1). Se o 52-32 aplicar migration, o «último apply da fase» passa a ser o dele e a espera se recalcula pelo `aplicado_ate` do 52-32.

A ORDEM 52-31 → 52-19 já está no grafo (`depends_on` do 52-19 tem o `52-31`; bloco D nas ondas 15–18). A posição do 52-32 antes do 52-19 ainda NÃO está no grafo: o planejamento do 52-32 precisa pôr essa aresta.

**Remoto:** este commit do SUMMARY reabre `git log origin/main..HEAD` só com `.planning/` (junto com `e2d83872`, a FRONTEIRA §Task 5). Isso é esperado e declarado no `<success_criteria>` do plano. Os dois sobem no próximo push com plano (o do 52-32 ou o do bloco D), como `de7d5f1f`/`7f46b8ee`/`73976117` subiram neste. O front em PROD não depende deles.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-12*

## Self-Check: PASSED

- Arquivos: a migration, o smoke, os dois testes novos, `52-31-DECISAO.md` e `52-REVIEW-G7-1.md` FOUND.
- Commits: os 16 do ledger (`0606acdb` … `e2d83872`) ancestrais de HEAD — FOUND.
- Dobra: as linhas 11–907 de `52-31-FRONTEIRA.md` presentes byte a byte (72871 octetos), sem sentinela restante.
- Resposta do operador da Task 6 presente verbatim; frontmatter lido por `js-yaml` (`status: complete`, `requirements-completed: [JORN-59]`, coverage D1 auto-pass, D2–D4 `human_judgment: true` com `rationale`).
- `<automated>` da Task 6 re-rodado às 2026-10-12T21:17:33Z: PRESENTE em `/assets/index-CFPYr-z6.js`.
