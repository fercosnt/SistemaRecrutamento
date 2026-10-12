---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-12T07:06:48Z
depth: deep
diff_base: 87cfe0ea503f5b7e3c16f91ff53cff5c5f680342
reviewed_head: 8010006e23ede57eccc3d6daf649cb01e38c76cf
scope: review adversarial bloqueante nº 1 dos consertos do UAT da 52 (G-52-2, G-52-4, G-52-4b, G-52-6; planos 52-28 e 52-29), que decide o push do 52-30 (Vercel publica o `main`). Escopo — 87cfe0ea..8010006e fora de .planning (10 arquivos, 15 commits de código) mais 52-28-PLAN.md, 52-29-PLAN.md e 52-30-PLAN.md, lidos inteiros como o programa que publica. Lidos INTEIROS — scripts/p52_contraste.cjs (737 linhas), os seis arquivos de teste (selos, concluidas, encerrada, AgendamentoCandidatoCard, AvaliacaoRavenScreen.shell, ContextoRejeicaoTriagemRevisao); dos três componentes, o diff -U8 mais as funções envolventes (o .map do painel :367-560, getStatusInfo, a grade do Raven :225-345). Contexto fora da lista — 52-UAT.md (§ Gaps e § Decisões do operador, verbatim), 52-28-SUMMARY, 52-29-SUMMARY, 52-26-DECISAO-PUSH, 52-REVIEW-GAP-1 (formato), CLAUDE.md, glass.tsx, BackgroundImage.tsx, backgrounds.ts, PrazoEstimadoLinha.tsx, RetirarCandidaturaAcao.tsx:140-170, useIdsAvaliacoesConcluidas.ts, ContextoRejeicaoTriagemRevisao.tsx:57-60, a migration 20260721000002 (:100-108), o parser do p52_portao.cjs (:184-212), os diffs das emendas em 52-UI-SPEC/52-PATTERNS/52-CONTEXT/52-RESEARCH. Re-executado pelo revisor — `p52_contraste.cjs --auto-teste` (24/24) e o CLI (ALVO painel-rejeicao min=5.73 OK; CONTROLE min=1.38 MORDE; 12 INFORMATIVO; CONTRASTE OK; nenhum temporário p52-contraste-* restou); os seis arquivos de teste (6 arquivos, 55 verdes) e as suítes vizinhas pages + avaliacao-cognitiva + agendamento + revisao (37 arquivos, 467 verdes); provas de mordida com baseline, trap e `git diff --quiet` vazio depois — selos.test (`Tests 1 passed | 6 skipped` → com bg-blue-800/40 `1 failed | 6 skipped`, FUNDO TRANSLUCIDO; com bg-yellow-200 `1 failed`, CONTRASTE ABAIXO 1.08), concluidas.test (`1 passed | 3 skipped` → sem `|| concluidas` `1 failed | 3 skipped` na asserção da linha de prazo), ContextoRejeicao (`1 passed | 9 skipped` → com `.replace(/_/g," ")` `1 failed | 9 skipped`, MORDE), medidor (bg-[#00109E]/60 no fonte → CENARIO DESCOLADO DO FONTE rc=1; text-red-100/90 na nota → DESCOLADO rc=1; controle rebaixado a informativo → CONTRASTE ERRO nenhum cenario de controle rc=1; controle com a caixa nova → CONTROLE NAO MORDE rc=1); cálculo independente com as funções exportadas sobre o BMP real (cabeçalho 40, 480×-286, 24 bits, sem compressão: branco puro sem caixa 1.78–7.03, branco puro na caixa antiga 1.74–6.23, caixa antiga 1.38–3.37, caixa nova /70 5.73, /60 4.69; pares opacos 7.15/6.38/6.49/6.80/9.37; navy/branco 13.39; #767676/branco 4.54); `sips` com entrada inválida sai 0 sem gerar arquivo (o medidor cai no existsSync); p50_enumera.cjs em seco origin/main..HEAD com os --caminhos/--assunto do 52-30 (32 commits, 17 planning, 15 codigo, 0 ALHEIO, rc=0); os três marcadores únicos em src/ e, após `npm run build` (rc=0), os três em build/assets/index-CfRY-hJs.js; p52_tipografia nos três arquivos de tela (TIPOGRAFIA OK, 237 linhas); lint `exit=2 tsc errors=89`; os verifies de documentação dos dois planos e o do STATUS_CONFIG («so cancelada mudou»); `git diff --quiet 87cfe0ea HEAD` no componente ContextoRejeicaoTriagemRevisao.tsx (IGUAL) e `--stat` vazio em src/components/ui, BackgroundImage, src/lib, supabase e database.types.ts. Nada foi commitado, publicado ou empurrado; o único arquivo escrito é este.
files_reviewed: 13
files_reviewed_list:
  - scripts/p52_contraste.cjs
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.selos.test.tsx
  - src/features/agendamento/components/AgendamentoCandidatoCard.tsx
  - src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx
  - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx
  - src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-28-PLAN.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-29-PLAN.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-30-PLAN.md
findings:
  critical: 0
  warning: 1
  info: 7
  total: 8
status: issues_found
---

# Phase 52: Code Review Report — consertos do UAT (52-28, 52-29), rodada 1

**Reviewed:** 2026-10-12T07:06:48Z
**Depth:** deep
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Parti da hipótese de que havia defeito e procurei por ele nos quatro lugares onde ele faria estrago
antes do push: (1) no que a tela passa a mostrar — se os quatro gaps fecharam e se alguma coisa fora
das três decisões do operador mudou junto; (2) nos portões que deveriam reprovar uma regressão — a
guarda dos selos, os testes do painel e do Raven, o medidor e as suas âncoras; (3) no medidor em si —
fórmula, composição, BMP, controle; (4) no programa que publica — a forma do `--caminhos`, os
marcadores, o chunk. **Não achei nada crítico.** Os quatro `truth` do UAT estão atendidos pelo código
que li e pelos testes que rodei; o diff fora de `.planning/` é exatamente os 10 arquivos dos dois
planos; nenhuma string de produto mudou (os seis `label:` do diff são idênticos dos dois lados; os dois
parágrafos da caixa, idem); só «Cancelada» mudou no `STATUS_CONFIG`; nenhum primitivo, banco, EF ou
migration foi tocado. Cada portão que o plano diz que morde, mordeu na minha mão com baseline verde
e vermelho exato. O medidor mede o que diz medir — refiz os números com as funções exportadas sobre o
BMP real e bateram ao centésimo, inclusive o 1,74–6,23 da emenda da UI-SPEC que o executor corrigiu.
A enumeração em seco contra `origin/main` saiu 0 ALHEIO e os três marcadores estão no chunk eager.

Achei um **WARNING**, no teste novo do Raven: ele chama `contraste(corDeClasse(a), corDeClasse(b))`
direto, e `contraste` ignora o alfa — um ladrilho `bg-white/10` ou uma borda `border-[#00109E]/20`
passaria com 13,39:1. Hoje as classes são opacas e o teste está certo; o risco é a guarda não morder
na próxima mudança. É barato de fechar (o medidor já tem `contrasteDeClasses`, que recusa fundo
translúcido e compõe o alfa do texto). Ficam sete INFOs: o julgamento pedido sobre o selo de check a
360px (com os números), e observações de forma que não mudam o veredito.

### Os 11 pontos da instrução (52-30 Task 1), um a um

| # | Ponto | Veredito | Evidência |
|---|---|---|---|
| 1 | Cada `truth` dos quatro gaps atendida; nada além do decidido; nenhuma cópia; nenhum banco/EF/primitivo | OK | G-52-2: `AvaliacaoRavenScreen.tsx:321-333` (borda navy + anel + check); G-52-4: `DashboardCandidatoPage.tsx:445` (`\|\| concluidas`); G-52-4b: `:533` (`span` só com `text-base text-white/90`); G-52-6: `:473-480` (caixa `bg-[#00109E]/70`, dois `<p>` em `text-base text-white/80`) e `:131-144` (selos opacos). `git diff --name-only 87cfe0ea HEAD -- . ':!.planning'` = os 10 arquivos dos planos. Grep das linhas `label:`/texto no diff: os seis rótulos iguais antes e depois; «Agradecemos seu interesse na Beauty Smile.» e o `feedback_rejeicao` intactos. `git diff --stat` vazio em `src/components/ui`, `BackgroundImage.tsx`, `src/lib`, `supabase`, `database.types.ts`. No `STATUS_CONFIG`, o comando do plano imprimiu «so cancelada mudou nos commits do 52-28», e o diff inteiro da base confirma |
| 2 | G-52-4: `concluidas` só no ramo sem reabertura; carregando/erro mantêm a linha; teste com o texto REAL e não vácuo | OK | O ramo `rotuloReabertura(candidatura) ?` (`:436-439`) não muda; só o ternário do ramo `else` ganhou `\|\| concluidas` (precedência: `(encerrada \|\| concluidas) ? null : …`). `useIdsAvaliacoesConcluidas.ts:54-59,74` só inclui candidaturas em `avaliacao_assincrona` não encerradas, e só com as duas leituras `isSuccess` — carregando/erro ficam fora do conjunto, logo a linha fica (casos 3 e 4 do teste, `:304,:320`). O mock devolve o texto extraído de `20260721000002_config_sla_etapa.sql:104` («Avaliação liberada — conclua em até 7 dias corridos.») com guarda de população (`:146-147`). Não é vácuo: a mesma `PRAZO` é exigida PRESENTE nos casos pendente/carregando/erro (`:287,:304,:320`), e a mutação que removeu `\|\| concluidas` fez o caso concluído falhar exatamente na asserção da linha de prazo (`1 passed \| 3 skipped` → `1 failed \| 3 skipped`) |
| 3 | G-52-4b: sem moldura de botão; tipografia | OK | `:533` — `className="text-base text-white/90"`, nenhum token de `MOLDURA_DE_BOTAO` (`concluidas.test:152,:267`), sem `truncate`/`whitespace-nowrap`; o contêiner `painel-proximo-passo` (`:503`) e o eyebrow (`:504`) não mudaram; o botão real `RetirarCandidaturaAcao.tsx:163` segue com `rounded-lg border … bg-white/5` — a semelhança que o UAT apontou acabou. `p52_tipografia`: OK nos três arquivos de tela (237 linhas acrescentadas). 16 px, peso herdado 400 |
| 4 | G-52-6: caixa e texto; todo selo opaco e ≥ 4,5 por FORMA; a guarda morde (mordida com baseline) | OK | Caixa `:473` e os dois `<p>` `:474-479`; medidor `ALVO painel-rejeicao: min=5.73`. A guarda (`selos.test:49-93`) extrai todo `{…}` com `icon:` e `label:` — sete descritores (`SELO_AGUARDANDO_EQUIPE` + seis ramos do `switch`, inclusive o `default`), nenhum por lista — e exige `^bg-[a-z]+-[0-9]{2,3}$` e `contrasteDeClasses ≥ 4,5`. Mordida minha, com o mesmo filtro: sem mutação `Tests 1 passed \| 6 skipped (7)`; com `bg-blue-800` → `bg-blue-800/40` no «Aguardando Resposta» `Tests 1 failed \| 6 skipped (7)` (`FUNDO TRANSLUCIDO`); com `bg-yellow-800` → `bg-yellow-200` no «Em Análise» `1 failed` (`CONTRASTE ABAIXO … = 1.08`); arquivo restaurado, `git diff --quiet` vazio. As cinco mordidas internas (m1–m5) verdes no HEAD. Pares pela mesma função: 7,15 · 6,38 · 6,49 · 6,80 · 9,37 |
| 5 | G-52-2: `aria-pressed`/`aria-label` intactos; check `aria-hidden` só no marcado; foco distinto e visível; classes por extenso; accent fora; julgamento 360px | OK (ver IN-01) | `AvaliacaoRavenScreen.tsx:314-318` — `type`, `onClick`, `aria-pressed={ativa}`, `aria-label` sem diff. Check `:321-329` dentro de `{ativa ? … : null}`, `aria-hidden="true"`. Foco `focus-visible:outline-dashed outline-2 outline-offset-[-10px] outline-[#00109E]`: faixa de 8–10 px para dentro da borda, sobre o padding branco (borda 4 + padding 8 = 12 px) — tracejado navy sobre branco em todo ladrilho, e a seleção (borda sólida 0–4 px + anel por fora) não usa `outline`. `shell.test:339-347,:371-378` fixa isso e a ausência de interpolação em `border/ring/outline`. `35bfad` ausente de todo elemento da grade (`:322-326`); o CTA (`:275`) continua accent fora dela. A 360px as classes são as mesmas (sem variante responsiva no ladrilho). Julgamento do check e da largura em IN-01 |
| 6 | Medidor: WCAG, composição, saturação, BMP, controle, âncoras, temporário, nenhuma população literal de portão | OK (ver IN-02, IN-04, IN-07) | `luminancia`/`contraste` (`:125-138`) são a 2.x literal (limiar 0,04045, pesos 0,2126/0,7152/0,0722, +0,05); `#767676`/branco = 4,54 e branco/preto = 21,00 na minha mão. Composição (`:473-478`): por camada, saturação do que está ATRÁS do vidro e depois o vidro por cima — a ordem do `backdrop-filter`; véu preto não é vidro; hover troca `bg-white/15` por `/25` (uma camada só, como no DOM); a variante sem saturação é um superconjunto conservador. `saturar` (`:141-150`) é a matriz `saturate` do Filter Effects com corte. `lerBmp` (`:173-198`): offset de `inicio`, linha arredondada a 4, BGR→RGB, altura negativa = de cima para baixo — o BMP real do `sips` tem cabeçalho 40, 480×-286, 24 bits, compressão 0, `inicio` 54 (medi); o auto-teste cobre as duas orientações com lixo no preenchimento. Controle: `min=1.38 MORDE`; rebaixado a `informativo` → `CONTRASTE ERRO: nenhum cenario de controle` (rc=1); trocado pela caixa nova → `CONTROLE NAO MORDE … min=5.73` (rc=1). Âncoras: `/70` → `/60` no fonte → `CENARIO DESCOLADO DO FONTE: painel-rejeicao` (rc=1); `text-red-200/90` → `/100` na nota → `DESCOLADO: agendamento-nota-cancelada` (rc=1). Temporário: `mkdtempSync` + `rmSync` no `finally` (`:224-238`); zero `p52-contraste-*` em `$TMPDIR` depois de todas as execuções. Populações: o único `alvo` é o `painel-rejeicao`; as listas `CHIPS_RESIDUAIS`/`NOTAS_RESIDUAIS`/`TEXTOS_DO_CARTAO` são o ESCOPO declarado dos dois residuais (cada item ancorado no fonte), não um portão que aprova por fotografia — o que aprova (selos) lê por forma |
| 7 | Os testes importam a MESMA função do medidor | OK | `createRequire(import.meta.url)` em `selos.test:25-28` (`contrasteDeClasses`), `encerrada.test:22,:156-159`, `concluidas.test:31,:251-256`, `AgendamentoCandidatoCard.test:26,:93-96`, `shell.test:268-273` (`corDeClasse`, `contraste`). Nenhuma fórmula copiada: grep de `0.2126`/`0.04045`/`+ 0.05` fora do medidor não acha nada em `src/` |
| 8 | Emendas da 52-UI-SPEC, 52-PATTERNS, 52-CONTEXT, 52-RESEARCH batem com o código | OK (ver IN-05) | Linha «Alternativa marcada / livre»: as classes são byte a byte as do `:317-325` (base, marcada, livre, selo, foco). Linha do painel: `painel-rejeicao`, `bg-[#00109E]/70`, `text-base text-white/80`, pares `-100`/`-800` e cinza `-700`, números 5,73/1,38/7,15/6,38/6,49/6,80/9,37, chips 1,14–1,46 — todos iguais aos que medi. E10 nova; D-27 emendada; accent item 6 sem a seleção; PATTERNS «Superado»; CONTEXT D-27 com «Esconder»; RESEARCH:618 «SUPERADO … 1,38–3,37» = min/max do controle, tabela com o mesmo número de colunas. A emenda «Contraste» diz «branco puro sobre a caixa antiga vai de 1,74 a 6,23» — refiz: branco puro sobre `bg-white/5` na pilha = 1,74–6,23 exato (sem a caixa seria 1,78–7,03; o texto está correto porque nomeia a caixa). Os dois `node -e` de verificação dos planos saem «ok» |
| 9 | «Comando de push»: `--caminhos` por forma cobre todo caminho mudado; 0 ALHEIO; marcadores únicos e no chunk `index-*` | OK | `p50_enumera.cjs --de origin/main(29f34756) --ate HEAD(8010006e)` com o `--caminhos`/`--assunto` do plano, sem `--revisoes`/`--aplicado`: 32 commits, 17 `planning`, 15 `codigo`, «enumeracao ok», rc=0, 0 ALHEIO. Os 10 arquivos de código casam a forma (quatro `DashboardCandidatoPage.[a-z]+.test.tsx`, dois do Raven, dois do agendamento, o literal do `ContextoRejeicaoTriagemRevisao.test.tsx`, o medidor); o componente da revisão fica fora da forma de propósito e não mudou (`git diff --quiet 87cfe0ea HEAD` IGUAL). Marcadores: uma ocorrência de cada em `src/` fora de `__tests__` (`DashboardCandidatoPage.tsx:473,:533`; `AvaliacaoRavenScreen.tsx:323`). `npm run build` rc=0; os três em `build/assets/index-CfRY-hJs.js` (eager). `reviewed_head` = HEAD, então todo `codigo` está contido na revisão |
| 10 | Os dois residuais nos SUMMARYs com o número de CADA item; cruzado com execução fresca | OK | 52-28-SUMMARY § Residual: sete linhas (1,33 · 1,14 · 1,46 · 1,44 · 1,46 · 1,45 · 1,18) = as sete `INFORMATIVO agendamento-…` da minha execução, ao centésimo. 52-29-SUMMARY § Residuais (a) repete as sete e (b) traz as cinco do cartão (1,78 · 1,57 · 1,48 · 1,39 · 1,67) = as cinco `INFORMATIVO painel-…`, com o limiar que valeria (3:1 no título, 4,5:1 nos outros) e a declaração de AMOSTRA (prazo, «Retirar», «Sua entrevista» não medidos). As medianas também batem |
| 11 | Caso novo do `ContextoRejeicaoTriagemRevisao.test.tsx` prova o «código cru» e morde; componente não mudou | OK | `:126-152` — afirma antes que o código está fora do `MOTIVO_OPTIONS`, exige o texto EXATO no par «Motivo da rejeição», nega «Não registrado», nega todo rótulo do mapa e nega três reformatações. Mordida minha com o comando do plano: `Tests 1 passed \| 9 skipped (10)` → com `?? motivo.replace(/_/g, " ")` em `:59` `Tests 1 failed \| 9 skipped (10)`, `expected 'motivo fora do mapa X9' to be 'motivo_fora_do_mapa_X9'`; componente restaurado (`git diff --quiet HEAD` vazio) e igual ao pin (`git diff --quiet 87cfe0ea HEAD` IGUAL) |

Regressões nos três arquivos de teste que já existiam: os casos antigos de `encerrada.test` (knockout, finalizada, Raven liberado ×2, em andamento), de `concluidas.test` (os quatro, agora com asserções a mais) e de `shell.test` (12 casos de saída/shell) estão verdes; as suítes vizinhas — `pages/__tests__`, `avaliacao-cognitiva`, `agendamento`, `revisao` — 37 arquivos, 467 testes, 0 vermelhos. Nenhum teste fora dos seis revisados cita os tokens antigos (`bg-*-500/20`, `text-*-300`, `border-[#35BFAD]`, a moldura do `span`). Lint: `exit=2 tsc errors=89`, o teto da fase, nenhum nos arquivos tocados.

### Os desvios declarados pelos executores

| Desvio | Esconde buraco? |
|---|---|
| 52-28 §1 / 52-29 §2 — asserções em uma linha (TAP) | Não. `expect(x === null, msg).toBe(true)` e `join(' \| ')` → `''` testam o mesmo predicado; a mensagem fica melhor que o dump de DOM. Confirmei que cada uma falha pelo motivo certo nas mutações |
| 52-28 §2 — prefixo `CLASSE DESCONHECIDA` no `julgarSelos` | Não; fecha um buraco. Sem ele um token que não resolve viraria exceção sem diagnóstico ou «contraste baixo» falso. Entra no conjunto dos «outros prefixos» de cada mordida (`selos.test:32-38,:95-96`) |
| 52-28 §3 — medidor recusa sem controle | Não; fecha um buraco. `julgar:521` → `CONTRASTE ERRO: nenhum cenario de controle`, coberto no auto-teste (caso 22) e provado por mim no CLI |
| 52-28 §4 — «Contraste» da UI-SPEC com 1,74 em vez do 2,17 do plano | Não; o número do plano era a fotografia do diagnóstico sem hover nem saturação. Refiz com as funções do medidor: branco puro sobre a caixa antiga (`bg-white/5`) na pilha = min 1,74 · max 6,23. A emenda nomeia a caixa e explica a origem dos dois números — correta |
| 52-29 §1 — raiz do repositório por `process.cwd()` | Não esconde, mas é frágil de forma distinta do teste do Raven (ver IN-03). Falha fechado: sem o arquivo, o `beforeAll` lança e os quatro casos ficam vermelhos |
| 52-29 §3 — TS2367 e `const CODIGO: string` em commit à parte | Não. O literal fora do `MotivoRejeicaoRh` precisa ser alargado para a comparação `o.value === CODIGO` compilar; a semântica do caso não muda e a mordida foi reprovada no HEAD final (`02924e2e`), que é o que o pin leva |
| 52-29 §4 — âncoras novas provadas por mutação | Aditivo; refiz uma delas (nota cancelada) e uma do 52-28 (caixa) |

## Warnings

### WR-01: o teste de contraste do Raven compara cores SEM compor o alfa — um ladrilho ou uma borda translúcidos passariam com 13,39:1

**File:** `src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx:272-273,364-367` · `scripts/p52_contraste.cjs:125-138,157-162`

**Issue:** `contrasteEntre(a, b)` chama `medidor.contraste(corDeClasse(a), corDeClasse(b))`. `contraste`
lê só `r, g, b` (`luminancia`, `:125-131`) e descarta o `a` que `corDeClasse` devolve. O teste então
aceita qualquer `/NN` como se fosse opaco. Medi com as funções do medidor:

```
contraste(border-[#00109E], bg-white)      = 13.39
contraste(border-[#00109E], bg-white/10)   = 13.39   (alfa ignorado: igual ao opaco)
contraste(border-[#00109E]/20, bg-white)   = 13.39   (alfa ignorado)
contrasteDeClasses(border-[#00109E], bg-white/10)  lança FUNDO TRANSLUCIDO: bg-white/10
contrasteDeClasses(border-[#00109E]/20, bg-white) = 1.53   (compõe o alfa do primeiro)
```

Hoje as seis classes lidas do DOM (`bg-white`, `border-[#00109E]`, `ring-white`, `outline-[#00109E]`,
`text-white`, `bg-[#00109E]`) são opacas, e o indicador tem 13,39:1 de verdade — por isso não é
crítico, e nada errado vai ao ar neste push. O risco é o do próprio G-52-2: o estado marcado sumiu
uma vez porque ninguém media; agora há um teste que diz medir «pela função do medidor», mas que não
reprovaria a próxima regressão da classe que mais importa — `bg-white` virar `bg-white/60` para
«combinar com o vidro» deixaria o desenho preto sobre o gradiente e o teste verde. A mesma classe
de defeito que o 52-28 fechou nos selos (o `contrasteDeClasses` existe exatamente para recusar fundo
translúcido) ficou aberta no Raven.

**Proposta (duas linhas no teste; nenhum componente muda):** em `:364-367`, trocar `contrasteEntre`
por `medidor.contrasteDeClasses(primeiro, segundo)` nos quatro pares — `(borda, fundo)`,
`(borda, anel)`, `(glifo, fundoSelo)`, `(foco, fundo)` — que lança `FUNDO TRANSLUCIDO` se o segundo
tiver alfa e compõe o alfa do primeiro sobre ele (`contrasteDeClasses('border-[#00109E]','ring-white')`
= 13,39 hoje). Ou, mantendo `contraste`, afirmar antes `corDeClasse(t).a === 1` para cada um dos
seis tokens. Em qualquer das duas, uma mordida: `bg-white` → `bg-white/60` no fonte deixa o caso
vermelho.

**Disposição que recomendo: backlog** — o código publicado está certo e a conferência visual do
52-30 Task 3 cobre o estado de hoje; consertar agora custa uma rodada `-2` só por um teste. Se o
operador preferir «consertar agora», o arquivo está na forma do `--caminhos`
(`AvaliacaoRavenScreen\.[a-z]+\.test\.tsx`) e o conserto não toca componente nem medidor.

## Info

### IN-01: a 360px com 8 alternativas, o selo de check cobre ≈ 2% do desenho (um canto) e a borda grossa tira 4 px da largura útil — julgamento pedido, não defeito demonstrado

**File:** `src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx:71,238,296-297,317,325`

**Issue:** Contas a partir das classes (sem variante responsiva no ladrilho): `container … px-4` (`:71`)
e `Glass … p-4` (`:296`) deixam 360 − 32 − 32 = 296 px para a grade; `grid-cols-4 gap-3` → (296 − 36)/4
= **65 px por ladrilho**. Com `border-4 p-2`, a área do desenho é 65 − 8 − 16 = **41 px** (antes, com
`border-2`, 45 px — a estimativa «44,5 → 40,5» do plano está certa). O selo `h-7 w-7 -right-2 -top-2`
é um círculo de 28 px com centro em (59, 6) relativo ao canto superior esquerdo do botão; o desenho
ocupa x,y ∈ [12, 53]. O canto (53, 12) está a 8,5 px do centro (dentro do círculo); (45, 12) e (53, 20)
estão a 15,2 px (fora). Ou seja: o selo encobre um segmento circular no canto superior direito do
desenho, dentro de um quadrado de 8 × 8 px — cerca de 35 px² de 1 681 (≈ 2 %), e só no ladrilho que o
candidato acabou de marcar. O anel `ring-4` fica fora da caixa (box-shadow) e usa 4 dos 12 px do
`gap`; o selo avança 8 px para fora do botão, dentro dos 12 px de `gap` e dos 16 px de `p-4` — nenhum
dos dois é cortado (nenhum `overflow-hidden` no `Glass`, no `container` ou no `RavenShell`).

Não consigo demonstrar que 41 px tornem as figuras indistinguíveis nem que 2 % de um canto confunda —
isso é a conferência visual do 52-30 Task 3 (item 1, 360px, item 25 da série C), que já está no plano.
Se o operador achar o desenho pequeno, a alternativa que não muda o indicador é `p-1` no ladrilho
(devolve 2 px de cada lado) — mas aí o contorno de foco a −10 px cairia sobre o desenho, e teria de
ir a `-6px`. Registro para a decisão, sem recomendar mudança agora.

### IN-02: as âncoras dos cenários `informativo` mudam a saída do medidor — «informativo nunca muda a saída» vale para o número, não para a âncora

**File:** `scripts/p52_contraste.cjs:25,389-423,445-452,703-708`

**Issue:** O cabeçalho (`:25`) diz que o informativo «nunca muda a saída», e o juiz honra isso
(`:515-516`). Mas `conferirAncoras` roda sobre TODOS os cenários (`:703`), e um informativo descolado
dá rc=1 antes de medir — provei com a nota cancelada (`text-red-200/90` → `/100`: rc=1). Isso é
intencional e bom (o 52-30 § `<action>` da Task 1 já manda que o conserto de um residual passe o
cenário a `alvo` no MESMO commit), mas tem uma consequência prática que convém estar escrita: quem
consertar um chip ou uma nota sem tocar o medidor vê o Passo 0b do 52-30 vermelho com
`CENARIO DESCOLADO DO FONTE`, e a mensagem não diz «vire este cenário em alvo».

**Fix (na próxima vez que o medidor mudar):** no cabeçalho, uma frase «a âncora de um informativo
reprova como a de um alvo»; e, na linha `CENARIO DESCOLADO DO FONTE` de um `informativo`, acrescentar
`(informativo: se o residual foi consertado, passe o cenario a alvo)`.

### IN-03: raiz do repositório por `process.cwd()` num teste e por `__dirname` no outro

**File:** `src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx:137-138` · `src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx:267`

**Issue:** O `concluidas.test` resolve a migration a partir de `process.cwd()`; o `shell.test` resolve o
medidor a partir de `__dirname`. Os dois falham fechado (arquivo ausente → exceção → casos vermelhos,
nunca verdes vazios), mas o primeiro depende de o Vitest ser invocado da raiz. O desvio §1 do 52-29
explica a escolha (o `fileURLToPath(import.meta.url)` falha sob jsdom), mas `__dirname` funciona no
mesmo ambiente — o próprio arquivo do Raven o usa.

**Fix:** `const RAIZ = resolve(__dirname, '../../../..')`, como no `shell.test:267`.

### IN-04: `DECLARADOS = 24` no auto-teste é uma contagem contra constante — é tripwire, e o diagnóstico é verdadeiro

**File:** `scripts/p52_contraste.cjs:678-682`

**Issue:** A forma «`n !== <constante>`» é a que o CLAUDE.md manda varrer. Aqui ela não aprova nem
reprova trabalho de produto: reprova o próprio auto-teste quando um caso é acrescentado ou removido
sem atualizar o número, e a mensagem diz exatamente isso (`rodaram N casos, declarados 24`). É o
idioma dos outros auto-testes da fase (p52_portao 68/68, p52_vitest_delta 9/9). Registro para que a
varredura por forma não a confunda com uma fotografia de portão.

**Fix:** nenhum.

### IN-05: a linha da D-27 na 52-UI-SPEC mantém as classes antigas do `span` na mesma célula em que a emenda diz que ele é texto simples

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md` (tabela «Telas do candidato…», linha `DashboardCandidatoPage` (defeito a, D-27))

**Issue:** A célula começa «o «Próximo passo» mostra o `span` neutro existente (`border-white/20
bg-white/10 text-white/80`)» e termina com «_Emenda (UAT da 52, 2026-10-12):_ … TEXTO SIMPLES
(`text-base text-white/90`)». O plano mandou manter o texto antigo como registro, e o selo na mesma
célula recebeu o tratamento inverso (o par novo com «antes …» entre parênteses). Quem ler só o começo
da célula vê classes que o código não tem mais.

**Fix (documental, sem review novo):** no próximo retoque da UI-SPEC, inverter a redação como no
selo — o estado atual primeiro, «antes (até 2026-10-12): `border-white/20 bg-white/10 text-white/80`»
entre parênteses.

### IN-06: a forma `/\{[^{}]*\}/` da guarda dos selos deixa passar em silêncio um descritor com chaves aninhadas

**File:** `src/components/pages/__tests__/DashboardCandidatoPage.selos.test.tsx:49-60,87-91`

**Issue:** `descritores()` só casa objetos sem `{}` dentro. Um descritor futuro como
`{ icon: Clock, color: …, bg: …, label: t({ id: 'x' }) }` não seria extraído — e, se não for o do
«Rejeitado» nem o `COPY_PAINEL_AVALIACOES.selo`, nenhum predicado o julga e nenhuma sentinela de
`POPULACAO` acusa. Hoje os sete descritores são planos e o caso é hipotético.

**Fix (barato, no mesmo arquivo, quando ele for tocado):** uma asserção de completude por forma —
toda ocorrência de `\bicon\s*:` no fonte tem de cair dentro de um descritor extraído:
`expect((FONTE.match(/\bicon\s*:/g) ?? []).length).toBe(descritores(FONTE).length)`.

### IN-07: `sips` sai 0 quando «pula» uma entrada inválida — o medidor fica de pé pelo `existsSync`, não pelo `try/catch`

**File:** `scripts/p52_contraste.cjs:227-234`

**Issue:** Medi: `sips -s format bmp … /nonexistent.jpeg --out x.bmp` imprime «not a valid file —
skipping» e devolve **0**, sem criar o arquivo. O `catch` de `execFileSync` (`:231-233`) nunca vê esse
caso; é o `if (!fs.existsSync(saida)) throw erro('sips nao gerou o BMP')` (`:234`) que fecha a porta.
Está certo e é fail-closed, mas o comentário «`sips` ausente ou com erro → `CONTRASTE ERRO`» do plano
sugere que o `catch` basta. Vale uma linha no fonte para quem for mexer aí.

**Fix:** comentário acima de `:234`: «`sips` devolve 0 mesmo quando pula a entrada — esta checagem é
a que vale».

---

_Reviewed: 2026-10-12T07:06:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
