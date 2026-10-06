---
phase: 50-acesso-do-recrutador
plan: 11
subsystem: testing
tags: [sc1, sessao-real, recrutador, gotrue, postgrest, get-curriculo-url, gerenciar-usuario-rh, push, d-10, d-11, export-05]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-10: expansão no ar em PROD (0002..0004 aplicadas, 5 EFs sem posse, pin refs/gsd/50-10/sha = 703613e8 publicado em origin/main 743c4fca)"
provides:
  - "scripts/p50_sessao_real.cjs: prova de sessão real (password grant com a chave pública → JWT, contagens por vaga via PostgREST, RPCs das filas, uma chamada a get-curriculo-url) com --auto-teste offline e recusa SEM CREDENCIAIS (exit 2)"
  - "SC1 metade sessão real: RH2 (recrutador real, sem vaga própria) 14/14 conferências OK em PROD, rodado pelo operador no terminal dele em 2026-10-06"
  - "Confirmação visual do operador como RH2 (itens 1 e 2), D-11 pulado, script sem revisão adversarial aceito"
  - "origin/main = 4ccc4dd1 (push enumerado com exceção estreita aceita pelo operador para 4ccc4dd1)"
affects: [50-verificacao, todo-42]

actuals:
  tokens: 14500
  tasks: 3
  commits: 2
plan_head_before: 33583c2fd8609c9397099fba3e16922b353ae3fa
plan_head_after: 4ccc4dd140d115705ff3ab3950ebb36c29a6fbf2

tech-stack:
  added: []
  patterns:
    - "Prova de sessão real sem o executor tocar credencial: script lê env digitada pelo operador (read -s), imprime só ids/contagens/booleans; a saída colada no chat é auditada por padrão de segredo antes de ir ao SUMMARY"
    - "Exceção de push aceita pelo operador amarrada por sha + patch-id: o diff pin..HEAD dos arquivos excetuados tem de ser byte-igual ao diff do commit excetuado, e nenhum outro commit pode tocá-los"

key-files:
  created:
    - scripts/p50_sessao_real.cjs
    - .planning/phases/50-acesso-do-recrutador/50-11-SUMMARY.md
  modified: []

key-decisions:
  - "D-11 (desativação real do RH2): operador respondeu «pular» em 2026-10-06; logs_auditoria sem desativar/reativar do RH2, coerente"
  - "Item 5: operador respondeu «aceito» — script sobe sem revisão adversarial ($REVISAO vazio)"
  - "Exceção de push: operador respondeu «aceitop a excecao» — o push leva 4ccc4dd1 (conserto da senha temporária da gerenciar-usuario-rh, já viva em PROD como v6), fora do «tudo menos o script = pin do 50-10»; aplicada só a esse sha e aos seus 2 arquivos"
  - "EXPORT-05 não marcado: decisão do verificador da fase (proibição do plano)"

patterns-established:
  - "Defeito pré-existente descoberto pela prova real (createUser 400 desde a Phase 28) vira commit próprio com RED medido, deploy pelo efdeploy e exceção explícita do operador no push — nunca entra calado no intervalo"

requirements-completed: []
requirements-addressed: [EXPORT-05]

coverage:
  - id: D1
    description: "scripts/p50_sessao_real.cjs: auto-teste offline, recusa sem credencial (exit 2), nenhuma referência à variável da chave privilegiada"
    requirement: EXPORT-05
    verification:
      - kind: unit
        ref: "<verify> da Task 1 → «script de sessao real ok (auto-teste, recusa sem credencial, sem chave privilegiada)» (commit 82b8e34b)"
        status: pass
    human_judgment: false
  - id: D2
    description: "SC1 com sessão real: RH2 (recrutador, ativo, 0 vagas próprias, JWT role=rh) vê as candidaturas de uma vaga ativa (11), inativa (1) e arquivada (7) = contagem viva; filas iguais às do administrador; get-curriculo-url 200 numa vaga que ele não criou"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "saída do operador, 2026-10-06: «sessao real: 14/14 conferencias OK»; verify read-only da Task 2: «recrutador ativo sem vaga propria existe (1); conta antiga intocada»"
        status: pass
    human_judgment: false
  - id: D3
    description: "Conferência visual no navegador como RH2: vagas ativa/inativa/arquivada com candidatos; filas iguais às do administrador"
    requirement: EXPORT-05
    verification:
      - kind: manual_procedural
        ref: "operador, 2026-10-06: item 1 «todas aparecem»; item 2 «sim». Abertura do PDF do currículo NÃO confirmada visualmente — provada pelo script (cv_curriculo 200)"
        status: pass
    human_judgment: true
    rationale: "Tela vista por humano numa sessão real; o PDF ficou sem confirmação visual explícita"
  - id: D4
    description: "Repositório = PROD: origin/main = HEAD = 4ccc4dd1 depois do push enumerado"
    verification:
      - kind: integration
        ref: "<verify> da Task 3 → «remoto = HEAD; script da sessao real publicado»"
        status: pass
    human_judgment: false

duration: ~11h (01:26 → 09:31 -03, dominado pela espera do operador e pelo conserto da gerenciar-usuario-rh)
completed: 2026-10-06
status: complete
---

# Phase 50 Plan 11: Sessão real do recrutador Summary

**Um recrutador real (RH2) que nunca criou vaga entrou em PROD com a própria sessão e passou 14/14 conferências. JWT `role=rh`; candidaturas das vagas ativa/inativa/arquivada iguais à contagem viva; filas iguais às do administrador; currículo de vaga alheia com HTTP 200. O operador confirmou as telas, e o script subiu para `main` junto com o conserto da senha temporária da `gerenciar-usuario-rh`, por exceção explícita dele.**

## Performance

- **Started:** 2026-10-06T04:26:35Z (ledger `gsd-plan-head-before-50-11`)
- **Completed:** 2026-10-06T12:33:01Z
- **Tasks:** 3/3
- **Files modified:** 1 do plano (`scripts/p50_sessao_real.cjs`); +2 no conserto fora do plano (`gerenciar-usuario-rh`, commit do orquestrador)

## Accomplishments

- **SC1 (metade sessão real)** provado: script rodado pelo operador no terminal dele, 14/14 OK.
- O verify read-only da Task 2 deu verde: existe 1 recrutador ativo sem vaga própria, e `recrutador.rh@teste.com` não foi reativada (D-10).
- O operador confirmou as telas como RH2 (itens 1 e 2) e pulou o D-11.
- Push enumerado `743c4fca..4ccc4dd1`; `git log --oneline origin/main..HEAD` ficou vazio depois dele.

## Task Commits

1. **Task 1: scripts/p50_sessao_real.cjs + auto-teste offline**: `82b8e34b` (test)
2. **Task 2: operador cria o RH2 e roda o script**: sem commit do executor (ação do operador). O conserto que destravou a criação, `4ccc4dd1` (fix), foi commitado pelo orquestrador; ver Deviations.
3. **Task 3: confirmação visual + push**: sem commit (push de `82b8e34b` + `4ccc4dd1`)

`commits: 2` é medido (`git rev-list --count 33583c2f..HEAD` antes do commit deste SUMMARY) e inclui `4ccc4dd1`.

## Task 2: saída do script (literal, colada pelo operador em 2026-10-06)

A linha de comando digitada pelo operador continha o e-mail e **não** faz parte da saída; não foi registrada.

```
projeto=isljnozzlvckrgjjbjwp chave_publica=publishable
role_jwt=rh
sub=af4ebf97-793c-42bb-a090-7ff19b401d06
vaga:ativa=e897f709-d4e7-4f6c-a25b-a433d2eda525
vaga:inativa=629a5f31-aee1-4034-9071-240ae2937250
vaga:arquivada=4601d000-0000-4000-8000-000000000001
cv_candidatura=0b1c887b-079a-4ef1-bb50-f8b3e2f3624f
cv_ok=true http=200
OK role_jwt esperado=rh obtido=rh
OK rh2_papel esperado=recrutador obtido=recrutador
OK rh2_ativo esperado=true obtido=true
OK rh2_vagas_proprias esperado=0 obtido=0
OK candidaturas:ativa esperado=11 obtido=11
OK candidaturas:inativa esperado=1 obtido=1
OK candidaturas:arquivada esperado=7 obtido=7
OK pedidos_dados_todos esperado=3 obtido=3
OK pedidos_dados_pendentes esperado=0 obtido=0 (vacuo: 0=0)
OK revisoes_todas esperado=3 obtido=3
OK revisoes_pendentes esperado=2 obtido=2
OK cv_curriculo esperado=200 obtido=200
OK estabilidade esperado=igual obtido=igual
OK blindagem esperado=0 obtido=0
sessao real: 14/14 conferencias OK
```

**Auditoria da saída antes de registrar (executor):** termina em `sessao real: 14/14 conferencias OK`, contém `role_jwt=rh`, nenhuma `FALHA`, e nenhum `@`, `eyJ`, sequência ≥ 40 chars, URL, `senha`, `password` ou `token`. Só tem ids internos, contagens e booleans.

**Verify read-only da Task 2 (executor, 2026-10-06):** `recrutador ativo sem vaga propria existe (1); conta antiga intocada`. Linha do RH2 (`sub af4ebf97…`): `role=recrutador`, `ativo=true`, não excluído, `vagas_proprias=0`.

**Observação: a vaga arquivada medida não é a do plano.** O plano registrava a arquivada `9f6ccf1a…` (3 candidaturas, RESEARCH §I, 2026-10-05). O script escolhe em tempo de execução a arquivada não excluída com mais candidaturas vivas, e mediu `4601d000-0000-4000-8000-000000000001` com 7. O critério de SC1 («uma arquivada, contagem = viva, > 0») vale para ela. A vaga que o operador viu como «arquivada» no item 1 não foi identificada por id.

**`pedidos_dados_pendentes`:** 0 = 0 é vácuo (não havia pedido pendente no minuto da medição). A igualdade com o administrador se apoia em `pedidos_dados_todos` 3 = 3.

### Histórico da criação do RH2 (observado pelo orquestrador)

1. A primeira tentativa de criar o recrutador em `/rh/configuracoes` falhou com **HTTP 400** da EF `gerenciar-usuario-rh`. É um defeito **pré-existente desde a Phase 28**: a senha temporária (dois UUIDs concatenados, só hex minúsculo) violava a política de senha do GoTrue em PROD (minúscula + maiúscula + dígito).
2. O operador escolheu «1» (consertar e publicar agora). O orquestrador commitou `4ccc4dd1` `fix(gerenciar-usuario-rh): senha temporaria atende a politica do Auth`. Primeiro mediu o teste RED, depois 10/10 verdes e `deno check` ok. Publicou com `efdeploy.cjs`: **versão 6, ACTIVE, verify_jwt=true**.
3. Uma segunda conta, com caixa `@teste.com.br` indeliverável, foi criada e depois **desativada pelo operador** (auditoria: `desativar` 2026-10-06 02:28 -03).
4. O RH2 foi criado às 09:21 -03, com um alias do Gmail (caixa real). O orquestrador conferiu, só lendo, a linha `usuarios_rh` do `sub af4ebf97…`: `role=recrutador`, `ativo=true`. A antiga `recrutador.rh@teste.com` continua inativa.

## Task 3: respostas do operador (literais, 2026-10-06)

| Item | Pergunta | Resposta do operador |
|---|---|---|
| 1 | Logado como RH2: vagas ativa/inativa/arquivada com candidatos; currículo abre | «todas aparecem». **A abertura do PDF não foi confirmada visualmente**; está provada pelo script (`cv_curriculo` 200). |
| 2 | `/rh/pedidos-dados` e `/rh/revisoes` iguais ao administrador | «sim» |
| 3 | D-11: desativação real do RH2 | «pular». O orquestrador conferiu `logs_auditoria`: nenhum `desativar`/`reativar` do RH2, coerente com «pular». |
| 5 | Script sobe sem revisão adversarial | «aceito» |
| — | Exceção de push para `4ccc4dd1` | «aceitop a excecao» |

## Push (Task 3), com a exceção estreita

**Guarda do plano rodada como escrita:** recusou **apenas** por causa de `4ccc4dd1`.

```
CODIGO MUDOU DEPOIS DO APPLY DO 50-10: supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts supabase/functions/gerenciar-usuario-rh/index.ts
```

Diff completo fora de `.planning/` entre o pin `703613e8` e HEAD: `A scripts/p50_sessao_real.cjs`, `M …/gerenciar-usuario-rh/__tests__/index.test.ts` e `M …/gerenciar-usuario-rh/index.ts`. Nada mais. `4ccc4dd1` toca só esses dois arquivos da EF (32+, 1−).

**Conferência da v6 publicada contra o commit (só leitura):**
- `node efdeploy.cjs gerenciar-usuario-rh --dry-run` mostrou o conjunto `functions/_shared/usuario-rh-schemas.ts` (5366 bytes) + `functions/gerenciar-usuario-rh/index.ts` (24392 bytes), com `verify_jwt=true`. `_shared/usuario-rh-schemas.ts` não mudou desde o pin. O arquivo de teste não é publicado.
- Management API (GET, só leitura): `version=6`, `status=ACTIVE`, `verify_jwt=true`, `updated_at=2026-10-06T05:22:57Z`, 11 s depois do commit `4ccc4dd1` (02:22:46 -03).
- Bundle vivo (ESZIP2.3, GET `/functions/gerenciar-usuario-rh/body`): contém `function gerarSenhaTemporaria(): string {`, `const tempPassword = gerarSenhaTemporaria();` e a linha `return base + pick(…)`. Contém **0** ocorrências da linha removida `crypto.randomUUID() + crypto.randomUUID()`.
- O bundle guarda o código transpilado, não o arquivo byte a byte: 282 das 299 linhas com ≥ 25 caracteres do `index.ts` aparecem literalmente. As 17 que não aparecem são literais reformatados pelo transpile e nenhuma pertence ao diff de `4ccc4dd1`. A conferência é **por presença das linhas do diff**, não por md5 do arquivo.

**Comando de push** (um único script; `--dry` primeiro, depois real). Ele mantém todas as amarrações do plano e acrescenta só a exceção:
1. `git diff --quiet PIN HEAD` fora de `.planning/`, excluindo o script **e só** os 2 arquivos da EF.
2. Amarração da exceção:
   - `4ccc4dd1` é ancestral de HEAD;
   - toca exatamente os 2 arquivos;
   - o `patch-id` do diff pin..HEAD desses arquivos é igual ao `patch-id` do próprio `4ccc4dd1`;
   - `git rev-list PIN..HEAD -- <EF>` é exatamente `4ccc4dd1`.
3. Conferências remotas do plano sem mudança: fetch, `ls-remote` = `origin/main`, pin ancestral do remoto, remoto ancestral de HEAD.
4. `p50_enumera.cjs` com a allowlist do plano mais os 2 caminhos da EF e o assunto `fix(gerenciar-usuario-rh)`. Depois, todo commit `codigo` que toque `supabase/` ou use esse assunto tem de ser **exatamente** `4ccc4dd1`.
5. `git push origin "$S":refs/heads/main`, sem force.

**Prova de que o portão ainda morde (`--dry`):**
- trocando a exceção por `82b8e34b` → `EXCECAO TOCA OUTROS ARQUIVOS: scripts/p50_sessao_real.cjs`, rc=1;
- sem excluir os arquivos da EF do diff → `CODIGO MUDOU DEPOIS DO APPLY DO 50-10: …`, rc=1.

**Saída do push real:**
```
3435743e… planning docs(50-10): complete expansao em PROD — apply 0002..0004, prova ao vivo, 5 EFs, push
33583c2f… planning docs(50-10): estado e roadmap — 10/11 planos da Phase 50
82b8e34b… codigo test(50-11): prova de sessao real do recrutador (sem segredo impresso)
4ccc4dd1… codigo fix(gerenciar-usuario-rh): senha temporaria atende a politica do Auth (minuscula+maiuscula+digito)
enumeracao ok: 4 commit(s) em 743c4fca..4ccc4dd1
guarda ok: R=743c4fca… S=4ccc4dd1… (excecao estreita: 4ccc4dd1…)
   743c4fca..4ccc4dd1  4ccc4dd1… -> main
```

**Verify da Task 3:** `remoto = HEAD; script da sessao real publicado`.

## Files Created/Modified

- `scripts/p50_sessao_real.cjs`: prova de sessão real. Usa só a chave pública e o token do próprio RH2, imprime só ids/contagens/booleans, tem `--auto-teste` e recusa `SEM CREDENCIAIS` com exit 2.
- Fora do plano (commit do orquestrador `4ccc4dd1`): `supabase/functions/gerenciar-usuario-rh/index.ts` (`gerarSenhaTemporaria`) e `__tests__/index.test.ts` (teste que reprova a senha antiga).

## Decisions Made

Ver `key-decisions` no frontmatter. Todas as escolhas da Task 3 são do operador, com data de 2026-10-06; nenhuma foi inferida.

## Deviations from Plan

### Defeito pré-existente consertado fora do plano

**1. [Rule 1 - Bug, decidido pelo operador] `gerenciar-usuario-rh` não conseguia criar nenhum usuário em PROD**
- **Found during:** Task 2 (criação do RH2 pelo operador)
- **Issue:** a senha temporária `crypto.randomUUID() + crypto.randomUUID()` violava a política do GoTrue (minúscula + maiúscula + dígito). Todo `criar` devolvia 400. O defeito existe desde a Phase 28.
- **Fix:** `gerarSenhaTemporaria()`: 32 bytes aleatórios em base64 alfanumérico, mais um caractere aleatório de cada classe exigida. Teste novo (RED medido antes), 10/10 verdes, publicado como v6.
- **Files modified:** `supabase/functions/gerenciar-usuario-rh/index.ts`, `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts`
- **Commit:** `4ccc4dd1` (orquestrador, com a escolha «1» do operador)

### Exceção na amarração do push

**2. O push levou código fora do «tudo menos o script = pin do 50-10»**
- O plano manda recusar o push se qualquer código fora de `.planning/` além do script diferir do pin `703613e8`. `4ccc4dd1` difere, e isso foi aceito explicitamente pelo operador («aceitop a excecao»).
- A exceção foi aplicada **só** a esse sha e aos seus 2 arquivos, amarrada por `patch-id`; a prova de mordida está acima. Qualquer outra diferença teria parado o push.
- `4ccc4dd1` **não passou por revisão adversarial** da fase: as revisões `50-REVIEW-ACESSO-*` são anteriores a ele. O que existe é o teste RED/GREEN do orquestrador e a v6 viva conferida acima.

## Issues Encountered

- O PDF do currículo não foi confirmado visualmente pelo operador. A prova é só do script (`cv_ok=true http=200` numa candidatura de vaga que o RH2 não criou).
- D-11 (desativação real) não foi exercitado, por escolha do operador.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth-path-change | supabase/functions/gerenciar-usuario-rh/index.ts | Mudou o gerador da senha descartável do `createUser` (fora do threat model do 50-11). A senha nunca é logada nem devolvida; o usuário define a própria pelo link de recuperação. Não houve revisão adversarial. |

## User Setup Required

None. O RH2 já existe, ativo, com caixa real.

## Next Phase Readiness

- Fase 50: 11/11 planos com SUMMARY. Falta a verificação da fase, que decide o EXPORT-05 (o `REQUIREMENTS.md` não foi tocado).
- Os commits de metadados (este SUMMARY, STATE, ROADMAP) são `.planning/`-only e caem depois do push do código.

## Self-Check: PASSED

- FOUND: `scripts/p50_sessao_real.cjs`
- FOUND: `82b8e34b`, `4ccc4dd1` (ambos em `origin/main`)
- Task 2 verify verde; Task 3 verify verde
