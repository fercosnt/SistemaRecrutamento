---
phase: 49-consertos-da-jornada-bloco-2
fixed_at: 2026-09-30
review_path: .planning/phases/49-consertos-da-jornada-bloco-2/49-REVIEW-GAPS-3.md
iteration: 1
scope: "CR-02 (opção «1» do operador, 2026-09-30), WR-06, IN-06, IN-07, IN-08"
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# 49-REVIEW-GAPS-3: relatório dos consertos

**Escopo.** CR-02, WR-06, IN-06, IN-07 e IN-08. No CR-02 a decisão do operador foi, verbatim, «1» (2026-09-30): mostrar o sinal da SJT na Decisão Final. A consolidação devolve os sinais de revisão da etapa, e o dashboard mostra o rótulo pt-BR junto dela, com um teste que exige isso.

**Fora do escopo:** WR-01, WR-02, WR-03 e IN-01..IN-05 não foram tocados. Também não houve deploy, apply de migration, escrita em PROD nem push. O `49-REVIEW-GAPS-3.md` não foi editado.

**Onde a verificação rodou:** no checkout principal (`workflow.use_worktrees: false`), sem worktree. Os números abaixo se reproduzem a partir deste checkout.

## Commits

| Achado | Commit | Tipo |
|---|---|---|
| CR-02 | `44702539` | RED (testes + campo opcional no tipo do contrato) |
| CR-02 | `483e25ae` | GREEN |
| WR-06 | `737cdb0c` | testes (guardas) |
| IN-06 | `c9f19cb7` | mensagem + teste |
| IN-07 | `1371a2a8` | só comentários |
| IN-08 | `022458f2` | só comentários e título de teste |

Todos os commits rodaram com o hook de pré-commit ativo (`tsc errors: 89 (frozen baseline: 96)`). Nenhum usou `--no-verify`.

## Consertados

### CR-02: a nota de uma SJT sinalizada conta na Decisão Final, e a marca não aparecia em tela nenhuma

**Status:** fixed: requires human verification. É mudança de comportamento visível: a Decisão Final passa a mostrar o aviso.

**Arquivos:**
- `supabase/functions/consolidar-decisao-final/index.ts`
- `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts`
- `src/features/decisao/schemas/consolidacaoSchema.ts`
- `src/features/decisao/components/ConsolidacaoDashboard.tsx`
- `src/features/decisao/components/__tests__/ConsolidacaoDashboard.test.tsx`
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx` (comentário)
- `supabase/functions/avaliar-redacao/index.ts` e `__tests__/index.test.ts` (comentários: não é mais «o card» que mostra o aviso)

**EF (`consolidar-decisao-final`):**
- Cada etapa ponderada ganha o campo aditivo `sinais_revisao?: string[]`. Ele traz os códigos do vocabulário do sinal (as chaves de `ROTULO_SINAL`, de `_shared/sinal-revisao.ts`) presentes em `metadata.motivos_revisao` das linhas que CONTAM na etapa, sem repetição.
- Uma etapa N/A não tem linha que conte, então não recebe sinal. Um caso aberto `pendente_humano` também não empresta o seu sinal à etapa.
- Sem sinal, a chave fica ausente, nunca `[]`.
- Hoje só a SJT pode ter o campo: só o `avaliar-redacao` escreve `motivos_revisao`. O cálculo é o mesmo para as três etapas ponderadas.
- O predicado «a sub-linha de SJT conta» saiu do `filter` inline de `normalizeSjtComposite` para `sjtSubLinhaConta`, com a condição idêntica. A nota e o sinal usam o mesmo predicado.
- Não mudaram a nota, os pesos, o consolidado, a recomendação nem a lógica de N/A. O teste compara a resposta inteira, sem o campo novo, com e sem o sinal.

**Front (`ConsolidacaoDashboard`):**
- A linha da etapa que traz `sinais_revisao` mostra, dentro do próprio `<li>`, o rótulo de `rotuloDoSinal` (fonte única, com o import relativo do 49-41/49-42).
- O tom é âmbar, igual ao aviso do comparativo, e não a cor de reprovação. Nenhuma ação fica desabilitada.

**`ScorecardAvaliacao`:** mantido. Ganhou um comentário dizendo que não está montado, que um teste verde dele não prova nada sobre a tela, e que o sinal visível da SJT mora na Decisão Final.

**Anexos datados, sem reescrever o texto anterior:** `49-41-SUMMARY.md` e `49-REVIEW-GAPS-2-FIX.md` receberam uma correção no fim.

**Prova:**
- **RED** (`44702539`), antes do conserto:
  - Deno `consolidar-decisao-final`: 2 falhas (a etapa SJT sem `sinais_revisao`; a filtragem e deduplicação), 17 passam;
  - vitest `ConsolidacaoDashboard`: 1 falha (sem `decisao-sjt-sinal-revisao`), 3 passam.
- **GREEN** (`483e25ae`): Deno 19/19 e vitest `decisao` 48/48.
- **Testes novos na EF:**
  - o caso aberto sinalizado que conta devolve `["instrucao_ao_modelo"]` na SJT, e nenhuma outra etapa recebe o sinal;
  - sem sinal, a chave fica ausente;
  - a etapa SJT dá 68,57 com e sem o sinal, e o consolidado e a recomendação são idênticos;
  - o sinal de uma sub-linha `pendente_humano` não é atribuído (a etapa fica 40, só o MC);
  - um motivo fora do vocabulário não sai, e o mesmo sinal em duas sub-linhas sai uma vez só.
- **Testes novos no componente:**
  - o rótulo aparece dentro da linha «Work sample (SJT)», com «68.57 / 100», uma única vez, sem classe `red`/`destructive`/`rose` e sem elemento desabilitado;
  - sem sinal, nenhum aviso.
- **Mutação «sem `sinais_revisao`»:** é o estado RED. Os dois lados reprovam.

### Marcador novo para o portão do 49-43

| | |
|---|---|
| Marcador ASCII único | `decisao-sjt-sinal-revisao` (valor do `data-testid` do aviso; a constante `MARCADOR_SINAL_SJT` em `ConsolidacaoDashboard.tsx`) |
| Chunk lazy onde está (build deste checkout) | `build/assets/DecisaoFinalPage-BfpjJuaG.js` (rota lazy da Decisão Final, `routes.tsx:90`) |
| Comando | `grep -rl 'decisao-sjt-sinal-revisao' build/assets/ \| grep -v '/index-'` → `build/assets/DecisaoFinalPage-BfpjJuaG.js` (1 arquivo, e só ele) |
| Marcador antigo, para comparação | `instrucao_ao_modelo` → só `build/assets/sinal-revisao-2K646GbY.js`, o chunk compartilhado. Ele passa com ou sem esta tela e por isso não serve de prova do CR-02. |

O hash do nome do chunk muda a cada build. O portão deve procurar pelo marcador, não pelo nome do arquivo. O `ScorecardAvaliacao` usa `sjt-sinal-revisao`, que é substring do marcador novo, mas o inverso não vale: o grep pelo marcador novo não casa o antigo.

### WR-06: faltavam os guardas de sinal + insufficient_evidence e sinal + composto < 13

**Status:** fixed.
**Arquivo:** `supabase/functions/avaliar-redacao/__tests__/index.test.ts`.

**Testes novos** (gêmeos do teste de red_flag):
- `SCORING_FIXTURE_LOW` mais a frase: `pendente_humano`, com `["abaixo_do_corte","instrucao_ao_modelo"]`;
- as dimensões do PASS com a última em `insufficient_evidence` (composto ≥ 13, sem red flag, sem dimensão desconhecida) mais a frase: `pendente_humano`, com `["insufficient_evidence","instrucao_ao_modelo"]`.

**Prova de que as mutações do -3 são pegas.** Cada mutação foi aplicada no disco e revertida com `git checkout --`:

| Mutação em `avaliar-redacao/index.ts` | Suíte anterior (HEAD antes do WR-06) | Suíte com o WR-06 |
|---|---|---|
| `composite < 13 && !sinalizada \|\| …` | 29/29 verde (sobrevivia) | reprova «WR-06 — … composto < 13» |
| `… \|\| (hasInsufficient && !sinalizada)` | 29/29 verde (sobrevivia) | reprova «WR-06 — … insufficient_evidence» |

O código da EF não mudou.

### IN-06: o alerta afirmava no passado uma chamada ao modelo que ainda não tinha acontecido

**Status:** fixed.
**Arquivos:** `supabase/functions/_shared/audit-logger.ts` e `supabase/functions/_shared/__tests__/ai-client.test.ts`.

A mensagem do `flag` agora é:

> «o sinal de revisão ACONTECEU (a análise não foi recusada: o modelo é chamado em seguida e a análise segue, marcada) e NÃO ficou registrado em ai_call_logs.»

A mensagem do caminho de bloqueio ficou byte a byte igual: o teste WR-05 compara a string inteira e continua verde. O teste agora exige «modelo é chamado em seguida e a análise segue» e recusa «foi chamado» e «análise seguiu». Ele falhou com a mensagem antiga (RED visto) e passou depois (`ai-client.test.ts` 56/56).

A mensagem evita a palavra «bloqueio», porque o teste WR-05 a proíbe no caminho `flag`. Por isso não usa o «sem bloqueio» sugerido pelo revisor.

O rótulo do admin `ai-error-codes.ts:121` («a análise seguiu, marcada para revisão humana») não foi mexido. Ele descreve a linha-evento vista depois do fato, e não estava no IN-06.

### IN-07: o docblock do `consolidar-decisao-final` prometia uma garantia que o código não dá

**Status:** fixed.
**Arquivo:** `supabase/functions/consolidar-decisao-final/index.ts` (só comentários; o diff não tem linha de código).

**O que o docblock diz agora:**
- `normalizeSjtComposite` soma toda sub-linha `sucesso`, inclusive a do caso aberto, cuja nota vem da IA;
- não há caminho de confirmação humana do caso aberto;
- desde o CR-01 do -2, isso inclui a linha sinalizada.

Fica registrada como **DECISÃO ABERTA, para o operador**, a pergunta: a nota da IA no caso aberto deve ponderar sem confirmação humana? No ramo da entrevista, o comentário deixou de dizer «NUNCA pondera um score de IA não confirmado» e passou a dizer que a EF confia no `status` gravado pelo escritor.

### IN-08: título de teste e comentários desatualizados

**Status:** fixed.

- O `describe` do `ScorecardAvaliacao.test.tsx` passou a «o motivo do sinal, com qualquer status».
- A linha de 125 colunas em `avaliar-redacao/index.ts` e a linha de 151 octetos no teste foram requebradas.

Só comentários e título de teste.

## Verificação final (checkout principal)

| Portão | Resultado |
|---|---|
| Deno: `_shared/__tests__/` + as 7 EFs de IA + `consolidar-decisao-final` | `ok \| 688 passed \| 0 failed` (681 antes, +5 do CR-02, +2 do WR-06) |
| Vitest: suíte inteira (`CI=true npx vitest run`) | 218 arquivos, 2377 testes, todos verdes |
| `npm run lint` (tsc) | 89 erros, igual ao teto, sem aumento |
| `npm run build` | OK (`assert-chunks PASSED`) |
| Marcador no chunk lazy | `decisao-sjt-sinal-revisao` → `build/assets/DecisaoFinalPage-BfpjJuaG.js` |

## ⚠ NOTA para o 49-43: `consolidar-decisao-final` agora também precisa de redeploy

A EF `consolidar-decisao-final` **não** está entre as 7 EFs de IA do 49-43, porque não embarca `ai-client.ts`. Mesmo assim, o CR-02 só vale em PROD com as duas publicações:
- **EF:** redeploy de `consolidar-decisao-final`, com JWT-ON e **sem** `--no-verify-jwt` (docblock da EF). Sem ele, a resposta publicada não traz `sinais_revisao` e a tela não mostra nada.
- **Front:** publicado pela Vercel, pelo push do `main`.

**Ordem:**
- Não publicar `avaliar-redacao` com o `status` do CR-01 antes de `consolidar-decisao-final` e do front estarem no ar. Senão, a nota sinalizada pondera sem aviso, que é justamente o CR-02.
- A ordem já registrada continua valendo: nenhuma EF sobe antes da migration `20260930000001`.

**Prova do bundle publicado de `consolidar-decisao-final`:** o marcador `sinais_revisao` aparece 0 vezes na versão anterior (`00557271`) e 3 vezes no disco. Procurar `sinais_revisao` e `sinaisDasLinhas` no `/functions/consolidar-decisao-final/body`.

**Portão do front no 49-43:** trocar ou acrescentar o marcador `decisao-sjt-sinal-revisao`, procurado em chunk lazy (fora do `index-*`). O marcador `instrucao_ao_modelo` sozinho fica verde com ou sem esta tela.

**Estado git:** os 6 commits deste conserto são locais. `git log origin/main..HEAD` NÃO está vazio, e o push é trabalho do 49-43.

## Não consertado / fora do escopo

- WR-01, WR-02, WR-03 e IN-01..IN-05: fora do escopo aprovado.
- Montar ou apagar o `ScorecardAvaliacao`: fora do escopo. Recebeu só o comentário.
- A decisão aberta do IN-07 (a nota da IA do caso aberto deve ponderar sem confirmação humana?) é do operador.

---

_Fixed: 2026-09-30_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
