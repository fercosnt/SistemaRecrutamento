---
phase: 51-consertos-da-jornada-bloco-3
plan: 04
subsystem: ui
tags: [react, vitest, rh, entrevista, d-22, d-15, jorn-47, jorn-48, guarda-por-forma]

requires:
  - phase: 51-03
    provides: "nomes D-15 nas superfícies do RH (hub, banda, decisão, pesos, bloco do Raven); origin/main == HEAD nos caminhos de código"
  - phase: 51-01
    provides: "telas do candidato renomeadas; molde do push enumerado (p50_enumera.cjs)"
provides:
  - "EntrevistaScorecardInline: notas do gestor obrigatórias (SCORECARD_COPY.notasObrigatorias, marcador entrevista-notas-obrigatorias, Salvar bloqueado com notas vazias depois de trim())"
  - "Toast da liberação do Raven e rotuloTabela do export com os nomes do D-15"
  - "src/__tests__/guards/nomes-instrumentos.grep.test.ts — guarda por forma dos nomes aposentados em src/ (o 51-07 estende SCAN_ROOTS ao template de e-mail)"
  - "Sonda da regra viva do servidor por forma (RECUSA | DELEGA | FURO), com mordida provada: .red-51-04/servidor-recusa.cjs"
affects: [51-07, JORN-47, JORN-48, verify-work-51]

actuals:
  tokens: 4807
  tasks: 2
  commits: 4
plan_head_before: 26ef435b80a4ec26fa67a109b1fd02902213447e
plan_head_after: 4676feb682235157dc21f972d66f2ceab0ce015d

tech-stack:
  added: []
  patterns:
    - "Guarda de rótulo por CONTEÚDO INTEIRO (string literal ou trecho JSX igual ao nome aposentado), não por substring — vigia rótulo, deixa passar prosa"
    - "Distinção de maiúscula como fronteira entre rótulo (`Cognitivo`) e chave técnica (`'cognitivo'`)"
    - "Sonda de regra viva por sobrecarga com classe DELEGA (wrapper sem escrita que repassa o parâmetro intacto a uma sobrecarga que recusa)"
    - "RED com reporter JUnit do Vitest quando o TAP sai malformado (mensagens multilinha do jest-dom)"

key-files:
  created:
    - src/__tests__/guards/nomes-instrumentos.grep.test.ts
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-04/task1.json
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-04/task2.json
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-04/servidor-recusa.cjs
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-04/servidor-recusa-saida.txt
  modified:
    - src/features/entrevista/components/EntrevistaScorecardInline.tsx
    - src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx
    - src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts
    - src/features/privacidade/services/exportacaoService.ts
    - src/features/privacidade/services/__tests__/exportacaoService.test.ts

key-decisions:
  - "A sobrecarga viva de 3 argumentos de salvar_avaliacao_entrevista não contém a recusa literal, mas não escreve e devolve a de 4 argumentos com p_notas intacto: classificada DELEGA e aceita. A premissa do D-22 não mudou (md5(pg_get_functiondef) da de 4 argumentos = b2d88d51…, o mesmo da pesquisa). A PARADA do plano era para premissa mudada; aqui o instrumento de medida não conhecia a forma «wrapper»"
  - "O guarda (i) acrescenta «Prova de raciocínio lógico» e «Avaliação de raciocínio lógico» às formas do plano: foram rótulos reais (ProvaCognitivaScreen antes do 51-01), o mesmo nome aposentado com uma palavra a mais. Tolera falta de acento, como o forbidden-strings"
  - "TDD em dois commits por task (test RED → feat/fix GREEN), no molde do 51-03; o plano previa um commit por task"

patterns-established:
  - "Sonda viva que classifica por forma e reprova FURO, população vazia e ausência de recusa direta — e cada classe tem uma mutação que a derruba"

requirements-completed: [JORN-47, JORN-48]

coverage:
  - id: D1
    description: "Scorecard de entrevista: com notas vazias (ou só espaço em branco) depois de trim() o Salvar fica desabilitado e a tela mostra «Escreva as notas do gestor para salvar a avaliação.» (entrevista-notas-obrigatorias); com texto, Salvar habilita e onSalvar recebe o texto; rótulo «Notas do gestor», required/aria-required, placeholder sem «opcional»"
    requirement: JORN-47
    verification:
      - kind: unit
        ref: "src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx#EntrevistaScorecardInline — notas do gestor obrigatórias, espelho do servidor (51-04 / JORN-47, D-22)"
        status: pass
      - kind: other
        ref: "mordida: o mesmo teste no worktree de refs/gsd/51-04/base (26ef435b) — 5 falharam | 3 passaram"
        status: pass
    human_judgment: false
  - id: D2
    description: "O cliente espelha o servidor: toda sobrecarga viva de public.salvar_avaliacao_entrevista recusa notas vazias, direto (4 args) ou por delegação sem escrita (3 args); o trim() do cliente é igual ou mais estrito que o btrim"
    requirement: JORN-47
    verification:
      - kind: integration
        ref: "node p46apply.cjs sql \"set transaction read only; select … pronargs, prosrc … proname = 'salvar_avaliacao_entrevista'\" | node .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-04/servidor-recusa.cjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Toast da liberação do Raven = «Raciocínio lógico (Matrizes) liberado para este candidato.»; rotuloTabela do export: liberação, respostas e resultados do Raven = «Raciocínio lógico (Matrizes)», respostas do textual = «prova cognitiva»"
    requirement: JORN-48
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(p5) as tabelas e colunas do G5 (44-11) aparecem com rótulo legível, nunca com o nome técnico"
        status: pass
      - kind: unit
        ref: "src/__tests__/guards/nomes-instrumentos.grep.test.ts#JORN-48 / D-15 — (ii) as superfícies que o D-15 nomeia carregam os nomes novos"
        status: pass
    human_judgment: false
  - id: D4
    description: "Guarda por forma: nenhuma string literal nem texto JSX de src/ é, inteiro, um nome aposentado (várias palavras sem distinção de maiúscula; «Cognitivo» só capitalizado); os nomes novos estão nas superfícies do D-15; sanidade das fixtures e ≥ 100 arquivos"
    requirement: JORN-48
    verification:
      - kind: unit
        ref: "src/__tests__/guards/nomes-instrumentos.grep.test.ts"
        status: pass
      - kind: other
        ref: "mordida: no worktree da base 26ef435b reprova (ii) toast/export; no worktree de cca99243 (antes do 51-03) a (i) acha os 5 rótulos aposentados que o 51-03 trocou"
        status: pass
    human_judgment: false
  - id: D5
    description: "Publicação: marcador entrevista-notas-obrigatorias em chunk lazy no build e em PROD; origin/main == HEAD"
    requirement: JORN-47
    verification:
      - kind: other
        ref: "crawler PROD: entrevista-notas-obrigatorias em /assets/EntrevistaWorkspace-BjR0b7D_.js de https://rh.beautysmile.com.br"
        status: pass
    human_judgment: false
  - id: D6
    description: "Conferência no navegador: leitura da mensagem e do Salvar bloqueado no workspace de entrevista real"
    requirement: JORN-47
    verification: []
    human_judgment: true
    rationale: "Layout e leitura da mensagem numa sessão de RH real não são assertáveis por teste unitário (D-28)"

duration: 18min
completed: 2026-10-09
status: complete
---

# Phase 51 Plan 04: notas do gestor obrigatórias no scorecard (JORN-47) e guarda por forma dos nomes dos instrumentos em `src/` (JORN-48) Summary

**No workspace de entrevista, o «Salvar avaliação» fica bloqueado enquanto as notas do gestor estiverem vazias depois de `trim()`, e a tela diz «Escreva as notas do gestor para salvar a avaliação.». É a mesma regra que `salvar_avaliacao_entrevista` já aplicava com um 400 mudo. A sonda conferiu essa regra nas duas sobrecargas vivas. O toast da liberação do Raven e os rótulos de exportação usam agora os nomes do D-15. Um guarda novo, `nomes-instrumentos.grep.test.ts`, reprova qualquer rótulo de `src/` com um nome aposentado. A mordida foi provada na base e no código anterior ao 51-03. Tudo publicado e servido em PROD no chunk lazy `EntrevistaWorkspace-BjR0b7D_.js`.**

## Performance

- **Duration:** ~18 min (2026-10-09T03:31:40Z → 03:49Z)
- **Tasks:** 2 (4 commits: RED + GREEN em cada task)
- **Files modified:** 6 de código (1 criado, 5 editados) + 5 de evidência em `.red-51-04/`
- **tsc (D-53):** 89 ao fim de cada task (teto 90). O commit RED da Task 1 subiu para 90, porque o teste usa `SCORECARD_COPY.notasObrigatorias` antes de ela existir. O GREEN devolveu para 89.

## Accomplishments

- **JORN-47 / D-22 (`EntrevistaScorecardInline.tsx`):**
  - `SCORECARD_COPY.notasObrigatorias` e `semNotas = notas.trim().length === 0`.
  - Salvar com `disabled={saving || semAnalise || semNotas}`, e `handleSalvar` com a mesma guarda.
  - `<p data-testid="entrevista-notas-obrigatorias">` no molde da frase de `semVigente`. As duas podem coexistir.
  - Rótulo «Notas do gestor», `required` + `aria-required`, placeholder «Observações sobre a entrevista.».
  - O cabeçalho do arquivo e o do teste dizem agora que as notas são obrigatórias nos dois lados. O serviço e o servidor não mudaram.
- **JORN-48 / D-15:**

| Sítio | Antes | Depois |
|---|---|---|
| `useLiberacaoCognitivo.ts` toast | «Avaliação de raciocínio liberada para este candidato.» | «Raciocínio lógico (Matrizes) liberado para este candidato.» |
| `useLiberacaoCognitivo.ts` docblock :2 | «… da avaliação de raciocínio (Raven)» | «… do Raciocínio lógico (Matrizes) — o Raven» |
| `rotuloTabela.cognitivo_liberacao` | «Liberação da avaliação cognitiva» | «Liberação do Raciocínio lógico (Matrizes)» |
| `rotuloTabela.cognitivo_respostas` | «Suas respostas na avaliação cognitiva» | «Suas respostas na prova cognitiva» |
| `rotuloTabela.respostas_raven` | «Suas respostas na avaliação de raciocínio» | «Suas respostas no Raciocínio lógico (Matrizes)» |
| `rotuloTabela.scores_raven` | «Resultados da avaliação de raciocínio» | «Resultados do Raciocínio lógico (Matrizes)» |

As chaves (nomes de tabela, `queryKey`, `tipo`) não mudaram.

- **Guarda `nomes-instrumentos.grep.test.ts`:**
  - (i) **Duas regex de conteúdo inteiro:**
    - `NOMES_APOSENTADOS`, com flag `i` e tolerância a acento: «Avaliação cognitiva», «Avaliação de raciocínio (lógico)», «Prova de raciocínio (lógico)», «Raciocínio lógico» exato.
    - `ROTULO_COGNITIVO`, sem flag `i`: `Cognitivo` e `COGNITIVO`.
  - (ii) Os nomes novos nas 6 superfícies do D-15, em linha de código.
  - (iii) Sanidade: 10 fixtures que casam e 14 que não casam. A varredura alcança 378 arquivos (o mínimo exigido é 100).

## Consulta da regra viva do servidor (D-51, só leitura)

Consulta do plano (Passo 0), saída literal:

| fn | md5_prosrc | recusa_vazia | usa_btrim |
|---|---|---|---|
| `salvar_avaliacao_entrevista(uuid,jsonb,text)` | `924dfb99c5c4f8be77bcb990c1b8e742` | **false** | false |
| `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` | `070e0f1b523bc4879204d5c23da1a2dd` | true | true |

O `<automated>` literal do plano saiu com exit 1 e `SERVIDOR SEM A RECUSA: salvar_avaliacao_entrevista(uuid,jsonb,text)`. Fui investigar antes de tratar isso como PARADA (ver Desvio 1):

- `md5(pg_get_functiondef)` da sobrecarga de 4 argumentos = **`b2d88d5149dae6b47ebb2240052a4ea8`**, o mesmo md5 que a pesquisa registrou. A função não mudou. O md5 da pesquisa era do `functiondef`; o do plano é do `prosrc`, por isso os valores diferem.
- A recusa (`IF p_notas IS NULL OR length(btrim(p_notas)) = 0 THEN RAISE … 'notas_humanas obrigatorias' … 'check_violation'`) vem antes do `UPDATE` e do `INSERT`.
- A sobrecarga de 3 argumentos, reescrita pelo P50 (`20261005000004_p50_rpcs_escrita.sql`), não escreve nada. Ela só escolhe a única vigente e faz `RETURN public.salvar_avaliacao_entrevista(p_candidatura_id, v_analise_id, p_scores_humanos, p_notas)`. O `p_notas` chega intacto à de 4 argumentos.

Sonda corrigida (`.red-51-04/servidor-recusa.cjs`), no HEAD vivo:

```
salvar_avaliacao_entrevista(uuid,uuid,jsonb,text) : RECUSA
salvar_avaliacao_entrevista(uuid,jsonb,text) : DELEGA→salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)
servidor recusa notas vazias em 2 sobrecarga(s) (direta ou por delegação)
```

**Mordida da sonda.** Cada mutação aplicada sobre o corpo vivo, só em JSON e sem tocar em PROD, reprova pelo motivo certo (`.red-51-04/servidor-recusa-saida.txt`):
- tirar a recusa da de 4 argumentos;
- o wrapper passar `coalesce(p_notas,'-')`;
- o wrapper ganhar um `UPDATE`;
- um `UPDATE` vir antes da recusa;
- nascer uma sobrecarga nova que escreve sem recusar;
- população vazia.

A 1ª versão da sonda tinha um falso positivo: tomava a trava `SELECT … FOR UPDATE OF ea` por escrita. Isso apareceu na própria execução, antes de qualquer conclusão, e foi consertado com um lookbehind.

## Task Commits

1. **Task 1 (tracer):** RED `80552938` (test) · GREEN `a4fde306` (feat). Gate do tracer: modo interativo, `end-of-phase`, `<verify>` só automatizado. Depois do commit o verify rodou de novo: vitest `src/features/entrevista` com 10 arquivos e 128 testes verdes, sonda viva verde e tsc 89. Só então a execução seguiu.
2. **Task 2:** RED `bfcf340b` (test) · GREEN `4676feb6` (fix)

### TDD — evidência RED

- **Task 1:** `RED_EVIDENCE_OK` (`target_test_failed`) no alvo «notas vazias ⇒ Salvar desabilitado e a mensagem …». Registro em `.red-51-04/task1.json`, reporter JUnit.
  - Falha: `expect(element).toBeDisabled()` → «Received element is not disabled».
  - 5 casos vermelhos e 3 verdes. Os verdes são o caso «com texto ⇒ habilitado», por desenho, e os 2 do CR-03 que não tocam nas notas.
  - O TAP do Vitest foi recusado pelo classificador («Non-TAP data / Malformed TAP»): as mensagens multilinha do jest-dom saem sem indentação. Refiz com `--reporter=junit`, com `reportPath`, `runStartedAt` e `reportModifiedAt`, como o procedimento manda.
- **Task 2:** `RED_EVIDENCE_OK` no alvo «useLiberacaoCognitivo.ts carrega «Raciocínio lógico (Matrizes) liberado (toast)»». Registro em `.red-51-04/task2.json`.
  - 4 vermelhos: (ii) toast, (ii) export Matrizes, (ii) export «prova cognitiva», e o `<h2>` do export.
  - A (i) e a (iii) passaram já no RED, por desenho: prosa antiga não é rótulo inteiro, e a regex está certa antes de o código mudar.

### Mordida (D-56)

| Worktree | O que rodou | Resultado |
|---|---|---|
| `refs/gsd/51-04/base` = `26ef435b` | `EntrevistaScorecardInline.test.tsx` novo | **5 failed \| 3 passed** (Salvar habilitado com notas vazias) |
| `refs/gsd/51-04/base` = `26ef435b` | guarda + `exportacaoService.test.ts` novos | **4 failed \| 87 passed**: (ii) toast, (ii) export ×2, `<h2>` |
| `cca99243` (antes do 51-03, prova extra de que a (i) não é vácua) | guarda + export | **7 failed**. A (i) acha exatamente os 5 rótulos que o 51-03 trocou, listados abaixo |

Os 5 achados da (i) em `cca99243`:

```
LiberacaoCognitivoBlock.tsx:72  «Avaliação de raciocínio»
PesosSliders.tsx:42             «Cognitivo»  const CONTEXT_CHIPS = ['Big Five', 'Cognitivo']
ConsolidacaoDashboard.tsx:69    «Cognitivo»  cognitivo: 'Cognitivo',
CognitivoBandCard.tsx:106       «Raciocínio lógico»  <CardTitle …>Raciocínio lógico</CardTitle>
HubCandidatoRH.tsx:417          «Avaliação Cognitiva»  titulo="Avaliação Cognitiva"
```

Os worktrees foram criados no scratchpad e removidos (`git worktree list` mostra só o checkout principal).

### Achados do guarda no HEAD e disposição

- **(i): zero achados** em 378 arquivos. Nenhuma troca de rótulo foi revelada, então a última alternativa do `--caminhos` não foi usada.
- **Chaves técnicas em minúscula presentes e verdes:** 31 literais `'cognitivo'` / `"cognitivo"` / `` `cognitivo` `` em `src/` fora de `__tests__`, mais 1 em `supabase/functions`.
  - O plano media 27 em 2026-10-08. A diferença veio depois dessa medição, do 51-03 (`instrumentosDaVaga.ts` e afins). O guarda não depende desse número.
- **Medida da escolha de maiúscula:** se a regex de uma palavra tivesse a flag `i`, ela reprovaria **17 linhas** de código correto no HEAD.

## Publicação (D-52)

- `npm run build` ok, `assert-chunks PASSED`. `entrevista-notas-obrigatorias` em **`build/assets/EntrevistaWorkspace-BjR0b7D_.js`** (lazy, `/rh/*`). O toast está em `PerfilCandidatoRHPage-CSyhkB5l.js` e os rótulos do export no `index-CvnqveOE.js`.
- Push por sha, num comando só, com `git status --porcelain` limpo nos caminhos de código. Resultado: `d5e2e8b9..4676feb6 -> main`, sem force. Enumeração do `scripts/p50_enumera.cjs`:

```
9bd47686 planning docs(51-03): complete Prova cognitiva e Nao se aplica no hub plan — SUMMARY, evidencia RED, publicacao
26ef435b planning docs(51-03): STATE/ROADMAP — 51-03 concluido, 3/17 (...)
80552938 codigo test(51-04): RED — notas do gestor obrigatorias no scorecard de entrevista, espelho do servidor (D-22)
a4fde306 codigo feat(51-04): tracer — notas do gestor obrigatorias no cliente, espelho do servidor
bfcf340b codigo test(51-04): RED — guarda por forma dos nomes dos instrumentos (D-15) e rotulo da liberacao do Raven no export
4676feb6 codigo fix(51-04): nomes do D-15 no toast e na exportacao — Raciocinio logico (Matrizes) e prova cognitiva
enumeracao ok: 6 commit(s) em d5e2e8b9..4676feb6
```

- Depois do push, `git ls-remote origin refs/heads/main` == HEAD (`4676feb6`) e `origin/main..HEAD` ficou **vazio**.
- O crawler deu AUSENTE às 03:45:57Z (Vercel ainda publicando). Às 03:47:58Z deu `PRESENTE em PROD, chunk lazy: entrevista-notas-obrigatorias ["/assets/EntrevistaWorkspace-BjR0b7D_.js"]`, o mesmo hash do build local.
- **Nenhuma escrita em PROD** (banco, EF ou migration). As únicas consultas foram de leitura (`set transaction read only`) sobre `pg_proc`.

## Files Created/Modified

- `src/features/entrevista/components/EntrevistaScorecardInline.tsx`: regra D-22, mensagem, rótulo e cabeçalho.
- `src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx`: caso `:77` invertido, 5 casos novos, cabeçalho.
- `src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts`: toast e docblock.
- `src/features/privacidade/services/exportacaoService.ts`: 4 rótulos e o comentário de qual instrumento é cada tabela.
- `src/features/privacidade/services/__tests__/exportacaoService.test.ts`: o `<h2>` novo, e o antigo proibido.
- `src/__tests__/guards/nomes-instrumentos.grep.test.ts`: guarda novo.
- `.planning/phases/51-consertos-da-jornada-bloco-3/.red-51-04/`: evidência RED (task1/task2), a sonda corrigida e o log com as mutações.

## Decisions Made

Ver `key-decisions`. A que mais pesa é a classe DELEGA da sonda do servidor (Desvio 1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - portão] A sonda do servidor do plano não conhecia a forma «wrapper que delega»**
- **Found during:** Task 1, Passo 0
- **Issue:** a sonda literal (`position('notas_humanas obrigatorias' in prosrc) > 0` por sobrecarga) devolve `false` para `salvar_avaliacao_entrevista(uuid,jsonb,text)`. Lido ao pé da letra, o plano manda PARAR («a premissa do D-22 mudou»). Medido, a premissa não mudou:
  - a sobrecarga que recusa tem o mesmo `md5(pg_get_functiondef)` da pesquisa;
  - a outra não escreve e repassa `p_notas` intacto.

  A pesquisa só inventariou a sobrecarga de 4 argumentos; a de 3 já existia desde o P50. Parar teria reportado como mudança de premissa um defeito do instrumento de medida (memória «o sintoma pode ser do próprio teste»).
- **Fix:** `.red-51-04/servidor-recusa.cjs` classifica cada sobrecarga em RECUSA, DELEGA ou FURO, e reprova FURO, população vazia e ausência de recusa direta. Provei por mutação que continua mordendo (6 mutações, todas vermelhas pelo motivo certo).
- **O `<automated>` literal do plano segue vermelho no HEAD.** O verificador deve usar a sonda corrigida, ou aceitar a disposição acima. Não reescrevi o plano.
- **Files modified:** nenhum de código. A evidência está em `.red-51-04/`.
- **Committed in:** commit de docs deste plano.

**2. [Escopo - guarda] Duas formas aposentadas a mais na (i)**
- «Prova de raciocínio lógico» e «Avaliação de raciocínio lógico», mais a tolerância a falta de acento. O plano listava «Prova de raciocínio» e «Avaliação de raciocínio» exatos. Pela regra de conteúdo inteiro, o heading real antigo do `ProvaCognitivaScreen` («Prova de raciocínio lógico») passaria. A troca é mais estrita e tem fixture. No HEAD, zero achados com ou sem ela.

**3. [Processo - TDD] Dois commits por task**
- O plano previa um commit por task: `feat(…)` na Task 1 e `test(…)` com os 4 arquivos na Task 2. Fiz RED e GREEN separados, no molde do 51-03, para o portão TDD ver `test(51-04)` antes de `feat(51-04)`. Os assuntos casam com o `--assunto` do push.

**4. [Escopo] Docblock do `useLiberacaoCognitivo.ts`**
- A linha 2 do docblock passou de «avaliação de raciocínio (Raven)» para «Raciocínio lógico (Matrizes) — o Raven», junto do toast, igual ao que o 51-03 fez no `LiberacaoCognitivoBlock`.

---

**Total deviations:** 1 auto-fix de portão (Rule 1) + 3 de escopo/processo.
**Impact on plan:** nenhuma mudança de banco, rota, chave técnica ou serviço. O desvio 1 muda só o instrumento de prova, e o `<automated>` literal do plano fica registrado como vermelho, com o motivo.

## Issues Encountered

- O classificador de RED recusou o TAP do Vitest por causa das mensagens multilinha do jest-dom. Resolvido com o reporter JUnit, sem mexer nos testes.
- Na 1ª tentativa o crawler pegou a Vercel ainda publicando. Na 2ª, o marcador estava no ar.
- No zsh, `$CMD` não sofre word-splitting, e o primeiro comando de RED saiu com 127 sem rodar nada. Refeito em bash. Nenhum efeito no repositório.

## Known Stubs

Nenhum.

## Deferred / fora do escopo (registrado, não consertado)

- Prosa antiga ainda fora do escopo da (i), por desenho: a frase «avaliação comportamental/cognitiva» (D-58) e as razões geradas do export. Não são rótulos de instrumento.
- O e-mail de liberação do Raven (`supabase/functions/_shared/email-templates.ts`: «liberou uma avaliação cognitiva», …) é do **51-07**. Ele estende `SCAN_ROOTS` deste guarda.
- A frase do 51-03 sobre a «Prova cognitiva» dizer «Não se aplica a esta vaga» em PROD segue para a UAT da fase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 51-05: `origin/main` == HEAD (`4676feb6`) nos caminhos de código. Só os commits de docs deste plano ficam à frente.
- **JORN-48** é declarado também pelo 51-07, e o **JORN-47** pelo 51-17. Pelo gate de ID compartilhado (`requirements.ready-ids` → 0/2), os dois ficam abertos no REQUIREMENTS até esses planos fecharem.
- A conferência no navegador (D-28) fica para a UAT da fase (coverage D6).

## Self-Check: PASSED

- FOUND: `src/__tests__/guards/nomes-instrumentos.grep.test.ts`, `.red-51-04/task1.json`, `.red-51-04/task2.json`, `.red-51-04/servidor-recusa.cjs`, `.red-51-04/servidor-recusa-saida.txt`.
- FOUND em HEAD **e** em `origin/main`: `80552938`, `a4fde306`, `bfcf340b`, `4676feb6`.
- `git rev-list --count 26ef435b..4676feb6` = 4.
- Verificação do plano no HEAD:
  - vitest de `src/__tests__/guards src/features/privacidade src/features/avaliacao-cognitiva src/features/entrevista`: 37 arquivos, 445 testes verdes;
  - tsc 89;
  - sonda viva corrigida verde (a literal do plano vermelha, ver Desvio 1);
  - marcador em chunk lazy no build e em PROD;
  - `origin/main..HEAD` vazio antes do commit deste SUMMARY.
- Acceptance criteria: `notasObrigatorias` = 2, testid = 1, «obrigatórias» = 4, toast = 1, «Raciocínio lógico (Matrizes)» no export = 3, fixture `'Cognitivo'` = 3, `'cognitivo'` = 5.

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-09*
