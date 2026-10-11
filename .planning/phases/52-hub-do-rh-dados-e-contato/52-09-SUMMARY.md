---
phase: 52-hub-do-rh-dados-e-contato
plan: 09
subsystem: api
tags: [edge-function, deno, supabase, lgpd, log-redigido, tanstack-query, hub-rh]

requires:
  - phase: 52-01
    provides: "harness da fase (portão, delta do vitest, teto do tsc)"
  - phase: 50
    provides: "autorização por linha VIVA de usuarios_rh nas EFs (D-01/D-02) e a sonda ef-sem-posse-de-vaga"
  - phase: 32
    provides: "get-curriculo-url — o esqueleto clonado (two-client, log só com ids)"
provides:
  - "EF supabase/functions/ler-cadastro-candidato-rh (handler, Deps) — contato, cadastro (19 campos), disponibilidade e inscrição, com linha de log só com ids e papel (código; deploy no 52-15)"
  - "cadastroCandidatoRhService.lerCadastroCandidatoRh + CadastroCandidatoRhServiceError + tipos CadastroCandidatoRh/ContatoCandidatoRh/DadosCadastroRh/DisponibilidadeRh/RespostaInscricaoRh/ValorRespostaInscricaoRh + CAMPOS_CADASTRO_RH"
  - "useCadastroCandidatoRh + cadastroRhKeys (['hub-candidato','cadastro', id]) — a query única do cabeçalho (52-23) e da aba Cadastro (52-10/52-24)"
  - "efdeploy.cjs: 'ler-cadastro-candidato-rh': true no grupo «invocadas pelo navegador»"
affects: [52-10, 52-14, 52-15, 52-23, 52-24, 52-SECURITY]

actuals:
  tokens: 18029
  tasks: 2
  commits: 2
plan_head_before: bd2050e7f09c6dc8cddb17c262b83af27d89ed3d
plan_head_after: 5a6ce5d954befe5fd0aea8e35635154c7fd7ab7d

tech-stack:
  added: []
  patterns:
    - "semContato(email): uma função decide «registro fictício/anonimizado» — trim + lower + endsWith('@invalido.local')"
    - "ehTombstone: o predicado do motor da 51-23 (e-mail canônico + user_id nulo + 1900-01-01), verbatim"
    - "mock Deno que APLICA filtros, ordem, limite E a projeção do select — coluna esquecida chega ausente"
    - "serviço valida o contrato e devolve uma CÓPIA só com os campos do contrato (campo a mais não atravessa)"

key-files:
  created:
    - supabase/functions/ler-cadastro-candidato-rh/index.ts
    - supabase/functions/ler-cadastro-candidato-rh/index.test.ts
    - src/features/hub-candidato/services/cadastroCandidatoRhService.ts
    - src/features/hub-candidato/services/__tests__/cadastroCandidatoRhService.test.ts
    - src/features/hub-candidato/hooks/useCadastroCandidatoRh.ts
  modified:
    - efdeploy.cjs

key-decisions:
  - "Cache do hook = padrão do hub (staleTime/gcTime 5 min, retry 2), não o «sem cache» das leituras sensíveis sob demanda: cabeçalho e aba Cadastro dividem UMA chamada; a linha de log registra a ABERTURA do hub (no máximo uma a cada 5 min por candidatura), não cada render"
  - "disponibilidade: candidato_id NÃO é único (medido: só índice não-único) — a EF devolve a linha mais recente (updated_at DESC, limit 1)"
  - "Tombstone também sai com disponibilidade: null (além de cadastro/contato nulos) — uma linha remanescente seria dado de titular removido"
  - "Removida = pergunta com deleted_at E resposta não vazia desta candidatura; resposta só com campos vazios conta como sem resposta"
  - "Resposta devolve TODOS os campos preenchidos ({ opcoes, texto } juntos no multiple_choice com «outros»), não só o primeiro do coalesce da migration 20261008000003"
  - "pergunta_opcao_metadata é lida projetando só pergunta_id com tag = 'knockout' — opcao_id/opcao_texto nunca são lidos"

patterns-established:
  - "Log de EF com dado pessoal: sucesso com chaves fixas { candidatura_id, rh_user_id, role }; erro com { candidatura_id, codigo } de código fixo da etapa; nunca a message do PostgREST nem da exceção"

requirements-completed: [JORN-53, JORN-54]

coverage:
  - id: D1
    description: "EF ler-cadastro-candidato-rh autoriza pela linha viva de usuarios_rh (401/403/400/404 único) e escreve a linha de log só com ids e papel"
    requirement: JORN-54
    verification:
      - kind: unit
        ref: "supabase/functions/ler-cadastro-candidato-rh/index.test.ts (deno test — 40/40)"
        status: pass
      - kind: unit
        ref: "src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts (varre a EF nova)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Todo registro @invalido.local (tombstone e fictícios com celular, inclusive em maiúsculas/espaço) sai com contato null; tombstone com cadastro null; cadastro.email null nos fictícios; controle com contato real preservado"
    requirement: JORN-53
    verification:
      - kind: unit
        ref: "supabase/functions/ler-cadastro-candidato-rh/index.test.ts#fictício @invalido.local COM celular gravado / MAIÚSCULAS / espaço / tombstone / CONTROLE"
        status: pass
    human_judgment: false
  - id: D3
    description: "Contrato completo (cadastro 19 campos, disponibilidade, inscrição em ordem com removida/eliminatória sem a opção), sem chaves internas no JSON, validado pelo serviço"
    requirement: JORN-54
    verification:
      - kind: unit
        ref: "supabase/functions/ler-cadastro-candidato-rh/index.test.ts (Task 2 cases)"
        status: pass
      - kind: unit
        ref: "src/features/hub-candidato/services/__tests__/cadastroCandidatoRhService.test.ts (vitest — 60/60 com a guarda e os vizinhos)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Hook useCadastroCandidatoRh/cadastroRhKeys com 5 min/retry 2 — consumido pelo 52-23 e 52-10; comportamento em tela e da EF publicada só observável depois do deploy do 52-15"
    verification:
      - kind: other
        ref: "npm run lint (tsc 89 <= 90)"
        status: pass
    human_judgment: true
    rationale: "A EF não foi publicada (deploy no 52-15, depois do review 52-14); o hook não tem consumidor de tela neste plano — o efeito ponta a ponta só se observa no hub com 52-10/52-23/52-15"

duration: 9min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 09: EF ler-cadastro-candidato-rh, serviço e hook Summary

**Edge Function `ler-cadastro-candidato-rh` (clone do `get-curriculo-url`) que entrega ao hub do RH contato, cadastro de 19 campos, disponibilidade e respostas da inscrição numa chamada só, registrando quem abriu (`{ candidatura_id, rh_user_id, role }`) sem registrar valor — e que devolve `contato: null` para todo registro `@invalido.local`, mesmo com celular gravado.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-10-11T03:25:02Z
- **Completed:** 2026-10-11T03:34:00Z
- **Tasks:** 2 (1 tracer + 1 auto)
- **Files modified:** 6 (5 criados, 1 editado)

## Accomplishments

- EF com a autorização da Phase 50 (linha VIVA de `usuarios_rh`, recrutador→rh, administrador→administrador), 400 para uuid inválido, o MESMO 404 para candidatura ausente/excluída/rascunho, e log redigido de sucesso e de erro.
- Regra D-40 num lugar só (`semContato`): tombstone e fictícios saem sem contato; tombstone sai também sem cadastro e sem disponibilidade; fictícios saem com `cadastro.email: null` e o celular como dado (a aba o mostra como texto).
- Inscrição em `ordem` ASC com perguntas removidas só quando respondidas (`removida: true`) e `eliminatoria: boolean` lido de `pergunta_opcao_metadata` projetando só `pergunta_id` — a opção que elimina nunca é lida.
- Serviço com validação do contrato inteiro (mensagem fixa, `details` sem o `data`) e cópia só dos campos do contrato; hook com chave hierárquica compartilhada.
- `efdeploy.cjs` com o slug em `VERIFY_JWT` = `true`. **Nada publicado** (deploy no 52-15).

## Task Commits

1. **Task 1 (tracer): contato pela EF com log — do `functions.invoke` ao hook** — `c0f998c3` (feat)
2. **Task 2: cadastro, disponibilidade e inscrição; slug no efdeploy** — `5a6ce5d9` (feat)

Tracer gate (interativo, `end-of-phase`, `<verify>` só `<automated>`): verify re-executado verde (deno 22/22, vitest 44/44) antes da expansão.

## Verificação (comandos do plano, literais)

| Comando | Resultado |
|---|---|
| `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/ler-cadastro-candidato-rh` | exit 0 — `ok \| 40 passed \| 0 failed` |
| `npx vitest run src/features/hub-candidato/services src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts && grep -q "'ler-cadastro-candidato-rh': true" efdeploy.cjs` | exit 0 — 4 arquivos, 60 testes passaram |
| lint (teto global ≤ 90) | `lint exit=2 tsc errors=89` → passa (o hook de pre-commit também reporta 89, baseline congelada 96) |
| `grep select('*')` na EF | nenhuma ocorrência (nem em comentário) |

**Prova de que os testes mordem** (mutação no `index.ts`, uma por vez, restaurado depois — 40/40 de volta): remover `.eq("ativo", true)`, o `toLowerCase`, o `trim`, o `semContato` do contato, `is_rascunho`, `ehTombstone` do cadastro, `.eq("tag","knockout")`, o filtro de removida, `.eq("candidatura_id", …)`, o `semContato` do `cadastro.email`, `.eq("vaga_id", …)`, a ordenação da disponibilidade, e pôr `email` no log — **todas** ficaram vermelhas. Sobrevive (esperado): tirar só o `sort` em JS da inscrição, porque a consulta também ordena por `ordem` (defesa dupla; qualquer uma das duas basta).

Varredura ampla: `npx vitest run src/__tests__` — 163 passaram, 2 falharam em `promessasComExecutor.test.ts`; as duas são **pré-existentes**, listadas na baseline congelada do `52-01-SUMMARY.md:135-136`, e não tocam arquivos deste plano.

## Files Created/Modified

- `supabase/functions/ler-cadastro-candidato-rh/index.ts` — a EF (handler, Deps, `semContato`, `ehTombstone`, `CAMPOS_CADASTRO`)
- `supabase/functions/ler-cadastro-candidato-rh/index.test.ts` — 40 casos Deno; mock que aplica filtros, ordem, limite e a projeção do select; espião de console
- `src/features/hub-candidato/services/cadastroCandidatoRhService.ts` — `lerCadastroCandidatoRh`, classe de erro, tipos, validação do contrato
- `src/features/hub-candidato/services/__tests__/cadastroCandidatoRhService.test.ts` — contrato válido, `null`s aceitos, 18 formas inválidas, mapeamento de erro do invoke
- `src/features/hub-candidato/hooks/useCadastroCandidatoRh.ts` — `useCadastroCandidatoRh`, `cadastroRhKeys`
- `efdeploy.cjs` — slug no grupo «invocadas pelo navegador»

## Medições (só leitura, PROD, sem valor)

`set transaction read only` pela Management API (`p46apply.cjs sql`): `information_schema.columns` de `candidatos`, `disponibilidade`, `perguntas_formulario`, `respostas_formulario`, `pergunta_opcao_metadata` (os 19 campos do contrato existem; `resposta_opcoes` é `jsonb`; `respostas_formulario.candidatura_id` é a junção, `UNIQUE (candidatura_id, pergunta_id)`); `pg_constraint`/`pg_index` de `disponibilidade` (só `idx_disponibilidade_candidato_id` **não-único**). Nenhuma linha de dado lida.

## Decisions Made

Ver `key-decisions` no frontmatter. A principal, pedida pelo PATTERNS §On-demand sensitive read: **cache de 5 min**, porque cabeçalho e aba dividem uma chamada; a linha de log passa a registrar a abertura do hub, não cada render.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `disponibilidade` não é única por candidato**
- **Found during:** Task 2 (medição de `pg_index`)
- **Issue:** o plano supõe uma linha por candidato; o índice de `candidato_id` não é único — um `maybeSingle()` daria 500 para quem tem duas linhas.
- **Fix:** lista ordenada por `updated_at DESC` com `limit(1)`; teste com duas linhas exige a mais recente.
- **Files modified:** `supabase/functions/ler-cadastro-candidato-rh/index.ts`, `index.test.ts`
- **Committed in:** `5a6ce5d9`

**2. [Rule 2 - Missing Critical] tombstone também sem disponibilidade**
- **Found during:** Task 2
- **Issue:** o plano fixa `cadastro`/`contato` nulos para o tombstone, mas deixaria uma linha remanescente de `disponibilidade` sair (a 51-23 apagou as conhecidas; uma nova seria dado de titular removido — Invariante 9 da 45).
- **Fix:** tombstone → `disponibilidade: null` sem consultar a tabela; teste do tombstone asserta.
- **Committed in:** `5a6ce5d9`

**3. [Rule 2] comentários sem o literal `select('*')`**
- **Issue:** o critério de aceite é «a EF não contém `select('*')`»; os comentários clonados do `get-curriculo-url` continham o literal.
- **Fix:** reescritos («projeção com curinga»); o grep agora sai vazio.
- **Committed in:** `5a6ce5d9`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 critical). **Impact:** nenhuma mudança de contrato; as três estreitam o que sai ou evitam um 500.

## Issues Encountered

None.

## Residual F4 (para o `52-SECURITY.md`) — declarado, não fechado

A RLS já abre `candidatos`, `respostas_formulario`, `disponibilidade` e `perguntas_formulario` ao RH ativo, e duas telas de lista (`CandidatosRHPage.tsx:398-407`, `KanbanBoard.tsx:302-311`) já mostram e-mail/celular. A linha de log desta EF registra o acesso **pelo hub**; leitura direta por REST continua possível sem log (T-52-26, disposição `accept`). Fechar policies mudaria as listas — fora do escopo e da reversibilidade da fase.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`: a EF é o endpoint previsto (T-52-20..T-52-23 mitigados e testados; T-52-SC: nenhuma instalação — `esm.sh/@supabase/supabase-js@2` como no `get-curriculo-url`).

## Known Stubs

None — o hook não tem consumidor de tela neste plano por desenho (52-10/52-23).

## User Setup Required

None.

## Next Phase Readiness

- 52-10, 52-23 e 52-24 podem consumir `useCadastroCandidatoRh` / `CadastroCandidatoRh`.
- O deploy (`node efdeploy.cjs`, `verify_jwt = true`) é do 52-15, depois do review bloqueante 52-14. Lembrete do CLAUDE.md: o front sai pela Vercel; depois do deploy, `git log --oneline origin/main..HEAD` tem de sair vazio.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- 5/5 arquivos criados presentes; commits `c0f998c3` e `5a6ce5d9` ancestrais de HEAD.
