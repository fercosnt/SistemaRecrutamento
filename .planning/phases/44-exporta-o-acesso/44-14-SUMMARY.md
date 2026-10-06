---
phase: 44-exporta-o-acesso
plan: 14
subsystem: privacidade
tags: [lgpd, export, copy, vitest, gate, cr-01]

requires:
  - phase: 44-exporta-o-acesso
    provides: "allowlist 1.4.0 (44-11) com as razões de colunas_excluidas/excluidas; EXPORT_ALLOWLIST espelho .ts; COPY_PEDIR_COPIA fonte única (44-05)"
provides:
  - "COPY_PEDIR_COPIA.oQueNaoEsta reescrita: nomeia toda categoria retida pela 1.4.0 + canal de privacidade (BD-17)"
  - "describe «a fronteira dita ao titular (CR-01)»: (cr1) famílias de razão derivadas do artefato = chaves de CLAUSULA_POR_FAMILIA; (cr2) mesma frase na tela, .html e .json; (cr3) cinco controles negativos permanentes"
  - "44-UI-SPEC com a frase nova (= código) e a redação anterior numa nota datada"
affects: [44-15, 44-16, 44-verification]

actuals:
  tokens: 4913
  tasks: 3
  commits: 3
plan_head_before: 80fcc2a1d6da755ba20a9dcadff22db16c2d08f7
plan_head_after: 18e35dd92136bc60ab70da6183a160d594719285

tech-stack:
  added: []
  patterns:
    - "Portão de copy derivado do artefato: famílias de razão calculadas na execução, comparação por igualdade de conjuntos com um mapa de escopo deliberado"
    - "Controle negativo com pré-asserção «a mutação mudou algo» antes da mordida"

key-files:
  created: []
  modified:
    - src/features/privacidade/services/exportacaoService.ts
    - src/features/privacidade/services/__tests__/exportacaoService.test.ts
    - .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md

key-decisions:
  - "A frase nova é a do <interfaces> do plano, caractere a caractere (template literal de uma linha, canal interpolado); o texto final ainda passa pelo checkpoint do operador no 44-16"
  - "(cr1) deriva as famílias do artefato pela regra de 7 passos; o mapa família→marcador é ESCOPO deliberado, conferido por igualdade de conjuntos (familiaSemClausula e clausulaOrfa)"
  - "(cr2) também confere que PedirCopiaBloco.tsx renderiza {COPY_PEDIR_COPIA.oQueNaoEsta} — a tela lê a constante, não uma cópia"
  - "Body do STATE.md: a linha histórica «Status: Ready to execute» do bloco «Posição anterior», reescrita pelo orquestrador para «Status: Executing Phase 44», foi restaurada — a conferência de corpo do <verification> reprova remoção de linha histórica"

patterns-established:
  - "Mudança na frase de fronteira passa pela 44-UI-SPEC e pelo CLAUSULA_POR_FAMILIA; um veto com família nova reprova o (cr1) até a frase mudar"

requirements-completed: [EXPORT-01, EXPORT-02]

coverage:
  - id: D1
    description: "oQueNaoEsta nomeia toda família de razão retida pela allowlist 1.4.0 e traz o canal de privacidade"
    requirement: EXPORT-02
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr1) CR-01 · toda família de razão do artefato tem cláusula na frase"
        status: pass
    human_judgment: false
  - id: D2
    description: "A mesma frase na tela, no .html (logo após o h2 da seção de fronteira) e no .json; sem nome técnico; sem a afirmação antiga"
    requirement: EXPORT-01
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr2) CR-01 · a frase é a mesma na tela, no .html e no .json"
        status: pass
      - kind: unit
        ref: "src/features/privacidade/components/__tests__/PedirCopiaBloco.test.tsx#(z7)"
        status: pass
    human_judgment: false
  - id: D3
    description: "O portão morde: cinco controles negativos permanentes e a mutação única da frase real"
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr3) CR-01 · o portão morde"
        status: pass
      - kind: other
        ref: "mutação única (Task 2, segundo <automated>): md5 2dac5207… -> 6850ea6f… -> 2dac5207…, Vitest rc=1 nomeando BD-13 (ii)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Redação da frase adequada ao titular (clareza, tom, completude percebida)"
    verification: []
    human_judgment: true
    rationale: "O texto final é aprovado pelo operador no checkpoint do 44-16 antes de qualquer publicação; nenhum teste julga a redação"
  - id: D5
    description: "44-UI-SPEC = código, com nota histórica datada contendo as duas redações anteriores verbatim"
    verification:
      - kind: other
        ref: "Task 3 <automated> (imprime «ui-spec = codigo» e «nota historica preservada»)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-10-06
status: complete
---

# Phase 44 Plan 14: CR-01 · a frase Summary

**A frase que o titular lê sobre o que ficou de fora da cópia passou a nomear as nove famílias de razão que a allowlist 1.4.0 retém, e traz o canal `lgpd@beautysmile.com.br`. Um portão (cr1) deriva essas famílias do próprio artefato e foi visto vermelho com a frase antiga, verde com a nova e vermelho de novo sob mutação. A tela, o `.html`, o `.json` e a 44-UI-SPEC dizem a mesma coisa. Nada foi publicado.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-10-06T23:40:26Z
- **Completed:** 2026-10-06T23:46:08Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `COPY_PEDIR_COPIA.oQueNaoEsta` foi reescrita como template literal de uma linha. Ela tem 909 caracteres no fonte e interpola `${CANAL_PRIVACIDADE_EMAIL}`. É idêntica à FRASE NOVA do `<interfaces>`, conferida por script contra o texto do plano: «IGUAL ao plano». Ganhou um docblock que aponta o portão e parafraseia a redação anterior sem citá-la.
- Novo describe «a fronteira dita ao titular (CR-01)»:
  - `CLAUSULA_POR_FAMILIA`, o mapa de escopo deliberado;
  - `familiaDaRazao`, a regra de 7 passos, com o vocabulário derivado de `Object.values(artefato.excluidas)` e proteção contra ciclo;
  - `lacunasDaFronteira`, que devolve `semFamilia`, `familiaSemClausula`, `clausulaOrfa`, `marcadorAusente` e `semCanal`;
  - os casos (cr1), (cr2) e (cr3).
- 44-UI-SPEC:
  - a linha «O que não está na cópia» é igual ao código;
  - a linha «Seção de fronteira» aponta a fonte única e o (cr1);
  - uma nota de 2026-10-06 (CR-01; BD-15/16/17) preserva verbatim as duas redações anteriores.

## Evidência

### (cr1) VERMELHO com a frase antiga (Task 1, antes da troca)

```
× (cr1) CR-01 · toda família de razão do artefato tem cláusula na frase
AssertionError: família sem marcador na frase — a frase não nomeia esta categoria retida; reescreva-a pela 44-UI-SPEC: expected [ 'BD-10', 'BD-13 (ii)', …(7) ] to deeply equal []
+ [
+   "BD-10",
+   "BD-13 (ii)",
+   "BD-13 (iv)",
+   "BD-9",
+   "configuracao_do_produto",
+   "pii_de_terceiro",
+   "segredo",
+   "telemetria_interna",
+   "vocabulario_do_sistema",
+ ]
× (cr2) CR-01 · a frase é a mesma na tela, no .html e no .json
AssertionError: expected 'Não entram os registros internos de f…' not to contain 'descrevem o sistema'
Tests  2 failed | 50 skipped (52)
```

Os dois vermelhos caem nas asserções-alvo. `semFamilia`, `familiaSemClausula` e `clausulaOrfa` passaram, e o vermelho vem do `marcadorAusente`, que nomeia `pii_de_terceiro`, `BD-9`, `BD-10` e `BD-13 (ii)`. A primeira rodada do (cr2) caiu por outro motivo, um `TypeError: The URL must be of scheme file`, e por isso não valeu como RED. Ver o desvio 1.

### Tabela de famílias derivada do artefato 1.4.0 (só para conferência, NÃO é asserção)

| Família | Itens |
|---|---|
| `telemetria_interna` | 37 |
| `pii_de_terceiro` | 31 |
| `configuracao_do_produto` | 23 |
| `segredo` | 2 |
| `BD-9` | 2 (`decisao_final.justificativa`, `decisao_final_historico.justificativa`) |
| `vocabulario_do_sistema` | 1 |
| `BD-10` | 1 (`retencao_hold.detalhe`) |
| `BD-13 (ii)` | 1 (`solicitacoes_dados.plano`) |
| `BD-13 (iv)` | 1 (`solicitacoes_dados.recibo_enviado_em`) |

São 99 itens com família (56 colunas + 43 tabelas) e 0 sem família. O resultado é idêntico ao que o planejador mediu.

### (cr3) VERMELHO da expectativa invertida (Task 2, passo 1)

Na versão de propósito invertida, o controle 2 esperava `marcadorAusente` igual a `[]`:

```
× (cr3) CR-01 · o portão morde: …
AssertionError: expected [ 'BD-13 (ii)' ] to deeply equal []
+ [
+   "BD-13 (ii)",
+ ]
Tests  1 failed | 2 passed | 50 skipped (53)
```

Na versão final, os cinco controles exigem a lacuna exata: `['BD-99']`, `['BD-13 (ii)']`, `['candidatos.sonda_sem_familia']`, `['BD-9']` e `semCanal === true`. Antes de cada mordida, o teste confirma que a mutação mudou alguma coisa.

### Mutação única da frase real (Task 2, segundo `<automated>`)

```
CR-01 mordeu nomeando BD-13 (ii); md5 2dac5207458e7905fa41b7c757d6cdf0 -> 6850ea6fa7910f371fa8a122e758dc22 -> 2dac5207458e7905fa41b7c757d6cdf0
× (cr1) … AssertionError: família sem marcador na frase — …: expected [ 'BD-13 (ii)' ] to deeply equal []
× (cr3) … AssertionError: controle do motor: a mutação não mudou a frase: expected 'Não entram os registros técnicos de f…' not to be …
Tests  2 failed | 1 passed | 50 skipped (53)
```

O md5 ficou igual antes e depois e diferente na versão mutada. `git status --porcelain` do serviço saiu vazio depois da restauração. O (cr3) também caiu na mutação, e pelo motivo certo: sem a cláusula na frase real, a pré-asserção «a mutação mudou algo» do controle 2 percebe que o controle ficaria testando o vazio.

### Task 3

```
ui-spec = codigo
nota historica preservada
```

### Suíte e type-check

- `npx vitest run src/features/privacidade`: **10 arquivos, 158 testes passaram.** Antes do plano eram 155, e o plano somou (cr1), (cr2) e (cr3). Entre eles (n), (t), (p5) e (z7), todos verdes e sem alteração.
- `npm run -s lint`: rc=2 com 89 linhas `error TS`. O par é coerente e não passa da baseline de 89. Nenhuma linha vem de `src/features/privacidade`.
- `git diff --quiet 85bb3c96 HEAD -- docs/compliance/export-allowlist.json docs/compliance/export-scope-rules.yaml docs/compliance/catalogo-vivo-44.json docs/compliance/sql supabase/functions` saiu com rc=0, então a allowlist ficou intocada (BD-15).
- `grep -cF '${CANAL_PRIVACIDADE_EMAIL}' exportacaoService.ts` = 3. `CLAUSULA_POR_FAMILIA` aparece 3 vezes no teste e `familiaDaRazao` também 3.

## Task Commits

1. **Task 1: TRACER — artefato → família → cláusula → frase → tela, .html e .json**: `d5402c1c` (feat)
2. **Task 2: o portão MORDE — (cr3) + mutação única**: `f71cd75b` (test)
3. **Task 3: 44-UI-SPEC com a frase nova + nota datada**: `18e35dd9` (docs)

O gate do tracer rodou em modo interativo `end-of-phase`, com `<verify>` só automatizado. O verify foi re-executado, passou, e a expansão seguiu sem checkpoint.

## Files Created/Modified

- `src/features/privacidade/services/exportacaoService.ts`: troca a frase `oQueNaoEsta` e acrescenta o docblock da fronteira.
- `src/features/privacidade/services/__tests__/exportacaoService.test.ts`: importa `CANAL_PRIVACIDADE_EMAIL`, acrescenta `CLAUSULA_POR_FAMILIA`, `familiaDaRazao`, `lacunasDaFronteira` e os casos (cr1)–(cr3).
- `.planning/phases/44-exporta-o-acesso/44-UI-SPEC.md`: troca as duas linhas de contrato e acrescenta a nota histórica datada.

## Decisions Made

- O (cr2) também confere a tela pelo fonte do `PedirCopiaBloco.tsx` (`{COPY_PEDIR_COPIA.oQueNaoEsta}`). Os testes do componente, com `getByText` e (z7), cobrem a renderização.
- A sanidade do (cr1) exige pelo menos uma família, `familias.length > 0`, porque uma população vazia deixaria as quatro listas vazias pelo motivo errado. Não é contagem contra constante.
- O docblock novo evita as nove strings do (t). Usa «retido» e «retirados», e não as formas banidas do verbo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Leitura do `PedirCopiaBloco.tsx` no (cr2) com caminho literal**
- **Found during:** Task 1 (primeira rodada RED)
- **Issue:** `new URL('<literal>', import.meta.url)` é reescrito pelo Vite para `http:`, e `fileURLToPath` recusa com «The URL must be of scheme file». O (cr2) caía por esse erro, e não pela asserção. Isso era INVALID_RED.
- **Fix:** passar o caminho por variável, o idioma documentado no (af) do mesmo arquivo. Depois disso o RED caiu na asserção-alvo («descrevem o sistema»).
- **Files modified:** `src/features/privacidade/services/__tests__/exportacaoService.test.ts`
- **Verification:** a rodada RED seguinte falhou nas asserções-alvo, e com a frase nova o caso ficou verde.
- **Committed in:** `d5402c1c`

**2. [Escrituração] Linha histórica do STATE.md restaurada**
- **Found during:** escrituração final
- **Issue:** a edição do orquestrador (status → executing) também reescreveu a linha `Status: Ready to execute` do bloco histórico «Posição anterior — Phase 44». A conferência de corpo do `<verification>` reprova isso.
- **Fix:** a linha voltou ao texto original. O `status: executing` do frontmatter ficou. A conferência de corpo, rodada sobre a árvore, não imprime nada.
- **Files modified:** `.planning/STATE.md` (commit de metadados)

**Total deviations:** 2 (1 bug do próprio teste, 1 de escrituração). **Impact:** nenhum no escopo. A allowlist e os portões existentes não mudaram.

## TDD Gate Compliance

Este é um plano `type: execute`, e não `type: tdd`. O próprio plano manda commitar o Task 1 como `feat(44-14)`, com a frase e o portão juntos, e registrar o RED aqui, no SUMMARY. Por isso não existe um commit `test(...)` antes do `feat`. O RED foi observado e registrado acima: (cr1) e (cr2) com a frase antiga, e (cr3) com a expectativa invertida.

## Issues Encountered

Nenhum além dos desvios.

## User Setup Required

Nenhum. Nada foi publicado: não houve push, nem escrita em PROD, nem redeploy de EF. A publicação é do 44-16, com checkpoint do operador.

## Next Phase Readiness

- O 44-15 (portões WR-01/02/03/07) roda em seguida, sobre arquivos disjuntos.
- O 44-16 publica só o front. O operador aprova o texto da frase no checkpoint. O marcador novo a conferir no chunk publicado é, por exemplo, «os dados que identificam outras pessoas».

---
*Phase: 44-exporta-o-acesso*
*Completed: 2026-10-06*

## Self-Check: PASSED
