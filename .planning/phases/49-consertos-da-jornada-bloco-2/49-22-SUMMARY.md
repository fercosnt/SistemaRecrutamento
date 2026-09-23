---
phase: 49-consertos-da-jornada-bloco-2
plan: 22
subsystem: frontend-rh
tags: [jorn-25, jorn-28, d-34, d-36, d-36b, d-59, d-27b, windows-78, comparativo, decisao-final, tdd, deploy]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "13"
    provides: "`resolveCandidates` (o molde do rótulo pela CHAVE), `ProvenienciaIABadge`, `posicoes` já no tipo de `ComparativoResult`, e a medição P3 que este plano re-rodou"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "05"
    provides: "`proximaEtapaDeTrabalho` / `ETAPAS_DE_TRABALHO` em `src/lib/candidatura/proximaEtapa.ts` — a resposta ÚNICA para «qual é a próxima etapa», e o teste do Kanban que pinava o defeito deste plano"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "03"
    provides: "`candidaturaEncerrada` — a ÚNICA implementação TS do predicado canônico, consumida aqui pela tabela de seleção, pelo gate do «Avançar» e pelo `listFinalistas`"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "08"
    provides: "`_shared/comparativo-config.ts` (`COMPARATIVO_MIN/MAX_CANDIDATOS`, contrato de ZERO IMPORTS) e a recusa `ENCERRADA` da EF"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "27"
    provides: "o código `SEM_RESULTADO_IA` (503) + `motivo`, e a WINDOWS 78 endereçada a ESTE plano"
provides:
  - "a seleção do comparativo NÃO oferece candidatura encerrada: selo neutro «Encerrada» (`data-testid=\"triagem-selo-encerrada\"`) + checkbox travado pelo predicado canônico, com retirada a pedido CONTINUANDO selecionável (D-34)"
  - "ZERO literais de teto/piso do comparativo no front — os 16 de código/cópia e as 3 linhas de comentário caíram; `COMPARE_MAX`/`COMPARE_MIN` sobrevivem como REEXPORTS da constante da EF (D-59)"
  - "`COPY_TETO_COMPARATIVO` / `COPY_PISO_COMPARATIVO` / `COPY_ENCERRADA_COMPARATIVO` exportadas de `TriagemTable` — as frases de gating num lugar só e VIGIÁVEIS por teste (o `TooltipContent` do Radix não existe no DOM fechado)"
  - "«Avançar» do comparativo por `proximaEtapaDeTrabalho(etapa_atual)` de CADA candidato; o estado da rota passou a levar `etapa_atual` e `status`"
  - "`ComparativoScreen.podeAvancar?` — prop OPCIONAL de elegibilidade do «Avançar» (sem ela, o comportamento de hoje)"
  - "`PROXIMA_ETAPA_APOS_TRIAGEM` REMOVIDA de `triagemService` (o 49-05 pediu; sem chamador, seria export morto esperando reintroduzir a terceira cópia da regra)"
  - "`listFinalistas` lê `candidaturas` (`etapa_atual='decisao_final'`, não encerrada) em vez de `decisao_final` — população quase OPOSTA (D-36b); `Finalista` = `{candidatura_id, etapa_atual, status}`"
  - "`resolveFinalistCandidates` exportada e resolvendo por `posicoes` (o defeito de repúdio do 49-13, aqui na tela que REGISTRA a decisão final)"
  - "os dois estados sem comparativo na decisão final são DISTINTOS e verdadeiros; acima do teto a tela diz o limite e aponta o comparativo da vaga (antes: tela em branco)"
  - "a `DecisaoFinalPage` passou a FIAR a proveniência → `ProvenienciaIABadge` no ranking que decide a decisão final (D-27b)"
  - "WINDOWS 78 FECHADA nas duas superfícies (corpo de erro do `AsyncState` e toast do `useComparativo`)"
  - "`src/features/decisao/components/__tests__/DecisaoFinalPage.test.tsx` — a página nunca tinha teste"
affects: [49-16, 49-18, 49-19]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 22219
  tasks: 2
  commits: 4
  plan_head_before: e83a96dddc3059dc96cedc1b5eb9b0fb87d9ef40
  # `commits: 4` MEDIDO por `git rev-list --count e83a96dd..HEAD` no instante da escrita deste
  # SUMMARY (dd0bb32a, 3e266b2f, 2ad0e06b, cb397303) — os quatro de PRODUÇÃO e os quatro já em
  # `origin/main`. Re-medir DEPOIS do commit de metadado deste plano dá 5, por construção.
  # `tokens: 22219` = 88 878 octetos de `git diff e83a96dd..HEAD -- src` ÷ 4, sem arredondar.
  estimate_tokens_do_plano: 60000
  # O plano estimou 60 000 e o realizado foi 22 219 — 2,7× ABAIXO. É a amostra com MENOR erro
  # da fase até aqui (49-03: 10×; 49-04: 6,6×; 49-05: 6,8×; 49-08: 5,9×; 49-13: 4,2×;
  # 49-27: 3,6×), e a razão é plausível e vale registrar: este plano ESCREVEU mais do que os
  # anteriores (um arquivo de teste novo de 250 linhas, 4 arquivos de teste estendidos,
  # 6 arquivos de produção). A tendência de erro está ENCOLHENDO na medida em que a razão
  # escrita/lida sobe — o que é consistente com o diagnóstico já nomeado (a escala
  # `estimateTokens` mede o ARTEFATO e o orçamento é dimensionado pelo TRABALHO de leitura).

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "quando a frase que o usuário lê vive num contêiner que o ambiente de teste NÃO monta (o `TooltipContent` do Radix fechado), a asserção sobre `document.body.textContent` PASSA com a frase errada no código — ela não está no DOM. O conserto é extrair a cópia para uma constante exportada e asserir a CONSTANTE, mais uma asserção de RENDER sobre uma superfície que existe (o contador da barra). Uma das duas sozinha não cobre"
    - "`podeAvancar` devolve `true` quando o dado que decide está AUSENTE: inferir «não pode» da ausência esconderia a ação de quem pode, e a camada que ESCREVE (`handleAvancar`) é a que se recusa a gravar um palpite. Gate opcional na apresentação, recusa obrigatória na escrita"
    - "o filtro de «encerrada» fica no CLIENTE de propósito: o predicado é uma DISJUNÇÃO sobre duas colunas, e reescrevê-lo em PostgREST criaria a segunda verdade que o 49-03 removeu. Ler algumas linhas a mais de uma lista curta é mais barato que uma allowlist que diverge em silêncio"
    - "duas frases sobre o MESMO fato em dois media (toast × corpo de erro) não são cópia duplicada: o que precisa coincidir é o fato, não a redação. A duplicação REAL (a mesma sentença em dois arquivos, como `MIXED_VAGA_COPY`) é a forma pior, e sobrevive aqui só por estar pinada verbatim por um contrato da Phase 10"
    - "um marcador de deploy que atravessa uma interpolação JSX (`até {CONSTANTE} candidaturas`) NÃO é contíguo no bundle: o crawler devolve AUSENTE e o sintoma é indistinguível de um deploy que não saiu. Marcador de publicação tem de ser um trecho LITERAL do código-fonte"

key-files:
  created:
    - src/features/decisao/components/__tests__/DecisaoFinalPage.test.tsx
  modified:
    - src/features/triagem/components/TriagemTable.tsx
    - src/features/triagem/components/__tests__/TriagemTable.test.tsx
    - src/components/pages/VagaCandidatosRHPage.tsx
    - src/components/pages/ComparativoCandidatosPage.tsx
    - src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx
    - src/features/triagem/components/ComparativoScreen.tsx
    - src/features/triagem/components/__tests__/ComparativoScreen.test.tsx
    - src/features/triagem/services/triagemService.ts
    - src/features/triagem/services/__tests__/triagemService.test.ts
    - src/features/decisao/services/decisaoService.ts
    - src/features/decisao/services/__tests__/decisaoService.test.ts
    - src/features/decisao/components/DecisaoFinalPage.tsx

key-decisions:
  - "O selo «Encerrada» NÃO substitui o selo «Encerrada a pedido do candidato» da Phase 45 — os dois convivem na mesma célula de etapa, e podem aparecer juntos (uma candidatura retirada que depois foi finalizada). Cada um responde uma pergunta diferente: «o funil acabou?» e «o titular pediu para sair?». Fundi-los faria a tela tratar um direito do titular como um desfecho do funil, que é exactamente o que o D-34 proíbe."
  - "`podeAvancar` devolve `true` quando `etapa_atual` está AUSENTE do estado da rota (bundle anterior, back/forward do navegador). Retornar `false` seria inferir «não pode» da ausência — esconderia a ação de quem pode avançar, e é a mesma família de defeito que o 49-04 removeu da célula DISC (ausência virando o MELHOR valor). A segurança está na camada que ESCREVE: `handleAvancar` sem próxima etapa mostra um erro e NÃO grava. Há teste dos dois lados."
  - "`COMPARE_MAX`/`COMPARE_MIN` continuam EXPORTADAS de `TriagemTable`, agora como reexports da constante da EF. Nenhum outro arquivo as importa hoje (medido), mas removê-las seria uma quebra de superfície pública sem ganho: o invariante do D-59 é «não há um segundo NÚMERO», e um alias sem valor próprio não é um segundo número."
  - "As frases de gating foram extraídas para constantes exportadas (`COPY_TETO_COMPARATIVO`, `COPY_PISO_COMPARATIVO`, `COPY_ENCERRADA_COMPARATIVO`). A razão não é estética: cada uma aparecia em DUAS linhas do JSX, e a do teto vive num `TooltipContent` que o Radix não monta fechado — sem a constante, nenhum teste consegue vigiar o número que o RH lê (ver Findings 2)."
  - "O filtro de encerrada do `listFinalistas` roda no CLIENTE, não em PostgREST. `candidaturaEncerrada` é uma disjunção sobre `etapa_atual` E `status`; escrevê-la como `.or(...)` criaria uma segunda verdade que diverge em silêncio da função SQL canônica no dia em que uma das listas mudar (o defeito que o 49-03 existe para ter removido). O custo é ler algumas linhas a mais de uma lista curta por construção."
  - "`resolveFinalistCandidates` degrada `nome` para o próprio `candidate_id` (`C1`), e não para vazio. `listFinalistas` é allowlist SEM PII — esta tela não recebe nomes, de propósito — mas uma coluna sem rótulo nenhum é pior que uma com `C1`: ninguém confere o que não consegue nomear. É a mesma «degradação que PARECE degradada» do 49-13."
  - "Os dois estados sem comparativo na decisão final ganharam frases DIFERENTES, e a de cima diz QUANTAS candidaturas há. A frase única anterior («Nenhum finalista para comparar ainda») era vaga no primeiro caso e simplesmente AUSENTE no segundo: acima do teto o `useEffect` não invocava e a aba ficava em branco, que é cortar em silêncio."
  - "A cópia de `SEM_RESULTADO_IA` NÃO nomeia a causa (`cost_cap_exceeded` × `prompt_injection_detected`), nem na tela nem no toast. A EF devolve o `motivo`, mas dizer «injeção detectada» ao recrutador confirmaria a um atacante que a defesa disparou — e o recrutador não pode agir sobre nenhuma das duas. Há asserção NEGATIVA disso."
  - "Evidência de RED registrada à mão nos dois casos. `gsd-tools check tdd-red-evidence` não classifica um run vitest (QUINTO registro do mesmo limite nesta fase) e nenhuma linha de contador foi sintetizada para contorná-lo."
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador; `git.allow_default_branch_commits: true`). Não registrado como desvio."

requirements-completed: []
# ⚠ MEDIDO, não presumido — `requirements.ready-ids JORN-25 JORN-28` devolveu
# `ready: [JORN-28]`, e nada foi marcado por este plano:
#   · JORN-28 já está `[x]` em REQUIREMENTS.md (marcado pelo 49-27). Este plano acrescenta o
#     D-27b da decisão final, que é o último consumidor previsto do selo — mas marcar de novo
#     não é marcar.
#   · JORN-25 continua `[ ]` e o portão de ID compartilhado (#2388) é a razão: ele é declarado
#     também pelo **49-18**, que ainda não tem SUMMARY. Isso é o portão funcionando — o JORN-25
#     inclui a prova n=4 do teto, que é daquele plano. Medido: dos 7 planos que o declaram,
#     6 têm SUMMARY (03, 05, 06, 08, 13, 22) e só o 49-18 falta.

# Coverage (#1602)
coverage:
  - deliverable: "D-34: candidatura encerrada pelo predicado canônico aparece com selo e não entra na seleção; retirada a pedido CONTINUA selecionável"
    human_judgment: false
    verification:
      - kind: test
        ref: "TriagemTable.test.tsx#knockout (inscricao/rejeitado) ganha o selo «Encerrada» e o checkbox travado — cor NEUTRA asserida (sem red/green/amber/yellow)"
        status: pass
      - kind: test
        ref: "TriagemTable.test.tsx#status `finalizado` em etapa de trabalho também é encerrada (o 3º estado terminal, o que o 49-05 encontrou no Kanban)"
        status: pass
      - kind: test
        ref: "TriagemTable.test.tsx#clicar no checkbox de uma encerrada NÃO chama onToggleSelect"
        status: pass
      - kind: test
        ref: "TriagemTable.test.tsx#retirada a pedido CONTINUA selecionável e SEM selo — e o clique CHAMA o onToggleSelect com o id (não basta a ausência de selo: «não regrediu» aqui significa «continua operável»)"
        status: pass
      - kind: test
        ref: "TriagemTable.test.tsx — os 6 casos da Phase 45 (`~188`) seguem verdes no mesmo arquivo, incluindo o tratamento neutro e «a política de dados do titular não é informação de funil»"
        status: pass
      - kind: command
        ref: "`grep -rl triagem-selo-encerrada build/assets/` → `VagaCandidatosRHPage-Blt8tKDD.js` (chunk lazy de /rh/*), e lido de volta de PROD no `VagaCandidatosRHPage-D0rYsg33.js`"
        status: pass
  - deliverable: "D-59: nenhum literal de teto/piso do comparativo sobra no front; as mensagens são montadas da constante da EF"
    human_judgment: false
    verification:
      - kind: test
        ref: "TriagemTable.test.tsx#o contador da barra mostra o teto da constante, nunca o antigo 10 (asserção de RENDER)"
        status: pass
      - kind: test
        ref: "TriagemTable.test.tsx#as frases de teto e de piso são MONTADAS das constantes — `COPY_TETO_COMPARATIVO` contém o número da constante e NÃO contém `10`"
        status: pass
      - kind: test
        ref: "TriagemTable.test.tsx#checkboxes ficam desabilitados ao alcançar o teto da constante (a contagem de desabilitados é `rows.length - MAX`, não um número escrito à mão)"
        status: pass
      - kind: test
        ref: "ComparativoCandidatosPage.test.tsx#o estado de seleção inválida usa o MÍNIMO da constante · #acima do teto da constante a EF não é invocada"
        status: pass
      - kind: command
        ref: "portão estático do plano (`Máximo de 10|2 a 10|<= 10|> 10` ausentes do código executável dos 2 arquivos · `COMPARATIVO_MAX_CANDIDATOS` presente) → OK"
        status: pass
      - kind: command
        ref: "varredura P3 re-rodada DEPOIS do conserto nos 4 arquivos: ZERO literais restantes (os únicos acertos são prosa de comentário e os 2 reexports sem valor próprio)"
        status: pass
  - deliverable: "D-36: o «Avançar» leva cada candidato à SUA próxima etapa de trabalho real, e desaparece para quem não tem"
    human_judgment: false
    verification:
      - kind: test
        ref: "ComparativoCandidatosPage.test.tsx#candidato em `triagem` ⇒ `updateCandidaturaEtapa(id,'avaliacao_assincrona')`"
        status: pass
      - kind: test
        ref: "ComparativoCandidatosPage.test.tsx#candidato em `entrevista_online` ⇒ `'entrevista_presencial'`, com a asserção NEGATIVA de que `'avaliacao_assincrona'` (o que a implementação antiga daria) NÃO foi chamado"
        status: pass
      - kind: test
        ref: "ComparativoCandidatosPage.test.tsx#candidato em `decisao_final` NÃO recebe o botão · #candidatura ENCERRADA não recebe o botão (2ª camada)"
        status: pass
      - kind: test
        ref: "ComparativoCandidatosPage.test.tsx#sem `etapa_atual` no estado da rota o botão CONTINUA e o handler diz a verdade em vez de gravar (zero chamadas ao escritor de etapa)"
        status: pass
      - kind: test
        ref: "ComparativoScreen.test.tsx#sem a prop `podeAvancar` o botão aparece para todos · #falso para um candidato oculta SÓ o «Avançar» dele, «Rejeitar» continua nos dois · #falso para todos, a comparação segue visível"
        status: pass
      - kind: test
        ref: "ComparativoScreen.test.tsx#«Avançar abre confirm dialog e dispara onAvancar (OPER-01 — inalterado)» e os outros 6 casos pré-existentes seguem verdes (D-56)"
        status: pass
      - kind: command
        ref: "`grep -rn PROXIMA_ETAPA_APOS_TRIAGEM src supabase` → ZERO ocorrências de código (só a menção histórica no docblock de `proximaEtapa.ts`)"
        status: pass
  - deliverable: "D-36b: a decisão final compara quem está em `decisao_final` e não é encerrado, e diz a verdade quando não há o que comparar"
    human_judgment: false
    verification:
      - kind: test
        ref: "decisaoService.test.ts#lê `candidaturas` — NÃO `decisao_final` (asserção positiva E negativa sobre o `from`)"
        status: pass
      - kind: test
        ref: "decisaoService.test.ts#filtra pela vaga E por `etapa_atual='decisao_final'` (os pares `.eq` capturados)"
        status: pass
      - kind: test
        ref: "decisaoService.test.ts#a fixture do `<behavior>`: `decisao_final/em_analise` + `decisao_final/finalizado` + `rejeitado/rejeitado` ⇒ só a primeira"
        status: pass
      - kind: test
        ref: "decisaoService.test.ts#`aprovado_proxima` NÃO é encerrada — continua finalista (o caso que uma allowlist apressada quebraria)"
        status: pass
      - kind: test
        ref: "decisaoService.test.ts#projeção ALLOWLIST `id, etapa_atual, status` — sem `*`, sem `cpf`/`nome`/`score` (asserção reescrita DE PROPÓSITO; a antiga era da tabela antiga)"
        status: pass
      - kind: test
        ref: "DecisaoFinalPage.test.tsx#com 1 finalista (o estado de PROD hoje — Correção 23) a tela diz «ao menos 2 candidaturas em decisão final» e a EF NÃO é invocada"
        status: pass
      - kind: test
        ref: "DecisaoFinalPage.test.tsx#acima do teto a tela DIZ o limite, aponta «comparativo da vaga» e não invoca a EF — não corta em silêncio"
        status: pass
      - kind: test
        ref: "DecisaoFinalPage.test.tsx#dentro do intervalo a EF é invocada com os ids dos finalistas"
        status: pass
  - deliverable: "JORN-25 / JORN-28 na decisão final: rótulo pela chave `posicoes` e o selo de proveniência no ranking"
    human_judgment: false
    verification:
      - kind: test
        ref: "DecisaoFinalPage.test.tsx#ranking em ordem DIFERENTE da lista de finalistas (empate de score): cada coluna carrega o id que a EF mapeou; o rótulo degrada para o `candidate_id` cru"
        status: pass
      - kind: test
        ref: "DecisaoFinalPage.test.tsx#o selo de proveniência aparece no ranking, com «modelo de contingência» e `gpt-4o-mini` — a página passou a FIAR a proveniência (D-27b)"
        status: pass
      - kind: test
        ref: "DecisaoFinalPage.test.tsx#a aba Comparativo segue READ-ONLY: nenhum «Avançar»/«Rejeitar» (UX-06 — o gate `showActions` do 49-13 intacto)"
        status: pass
      - kind: command
        ref: "`grep -rl 'candidaturas em decisão final' build/assets/` → `DecisaoFinalPage-*.js`, lido de volta de PROD"
        status: pass
  - deliverable: "WINDOWS 78: `SEM_RESULTADO_IA` deixa de virar «Verifique a conexão», que é FALSO para um corte de gasto"
    human_judgment: false
    verification:
      - kind: test
        ref: "ComparativoScreen.test.tsx#a cópia de SEM_RESULTADO_IA substitui o genérico e NÃO fala de conexão"
        status: pass
      - kind: test
        ref: "ComparativoScreen.test.tsx#um código DESCONHECIDO continua caindo no genérico (a degradação projetada) · #MIXED_VAGA continua com a SUA cópia (o ramo novo não a atropelou)"
        status: pass
      - kind: test
        ref: "triagemService.test.ts#SEM_RESULTADO_IA no toast diz que nenhum modelo foi consultado e que NÃO é conexão, nos DOIS motivos — e a causa exata NÃO vaza (`rejects.not.toThrow(/injec|injeç/i)`)"
        status: pass
      - kind: command
        ref: "marcadores lidos de volta de PROD: «Nenhum modelo de IA chegou a ser consultado» no `ComparativoScreen-ZPSuNWY1.js` (lazy) e «Nenhum modelo de IA foi consultado» no `index-C55SemLW.js` (eager, onde `RECUSA_COMPARATIVO_COPY` JÁ estava)"
        status: pass
      - kind: command
        ref: "`gsd-tools windows status` → 78 com `status=fixed` e razão escrita (1 635 caracteres)"
        status: pass
  - deliverable: "Texto novo passa pelo guard LGPD-04/RNF-12; `tsc` ≤ 90; publicado e no ar (D-52)"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/__tests__/guards (8 arquivos / 78 testes) verde, `forbidden-strings.grep.test.ts` incluso (D-58 / D-07)"
        status: pass
      - kind: command
        ref: "`npm run -s lint` → exit 2, 89 `error TS` (teto do plano 90) nas TRÊS medições (T1, T2, T3), com o conjunto de mensagens IDÊNTICO ao de antes do plano (`diff` vazio após remover linha/coluna)"
        status: pass
      - kind: command
        ref: "suíte vitest inteira: 217 arquivos / 2320 testes, 0 falhas (baseline do 49-13: 212 / 2171)"
        status: pass
      - kind: command
        ref: "`npm run build` exit 0, `assert-chunks PASSED`, 50 chunks, jsPDF fora do índice eager (`autoTable` só em `exportComparativo-*.js`)"
        status: pass
      - kind: command
        ref: "`git push origin main` (e83a96dd..2ad0e06b, 2ad0e06b..cb397303); `git log --oneline origin/main..HEAD` VAZIO"
        status: pass
      - kind: command
        ref: "crawler em https://rh.beautysmile.com.br: 5 marcadores PRESENTES, cada um medido em chamada SEPARADA (ver Findings 4)"
        status: pass
  - deliverable: "O RH entende, na tela, por que não pode selecionar uma candidatura e por que um «Avançar» não está ali"
    human_judgment: true
    rationale: "Os testes provam que o selo aparece com a palavra «Encerrada», que o checkbox fica travado com um tooltip próprio, e que o botão desaparece exatamente para quem não tem próxima etapa. O que nenhuma asserção decide é se um recrutador, vendo um checkbox cinza e um selo neutro, entende que aquela pessoa saiu do processo — ou se ele tenta clicar, não entende, e procura outro atalho (que é o comportamento que o 49-05 documentou no `UpdateStatusModal`). ⚠ E há um risco de UX que os testes NÃO cobrem e que só uma pessoa vendo a tela pode julgar: o «Avançar» ausente é uma ausência SILENCIOSA — não há frase dizendo «este candidato não avança por aqui». Foi escolhido assim (UX-06: sem botão no-op), mas «o botão sumiu» e «este candidato não pode avançar» não são a mesma mensagem. Nenhuma pessoa abriu estas telas nesta sessão."
  - deliverable: "O teto de 4 é o certo para o comparativo da decisão final"
    human_judgment: true
    rationale: "O teto vem da conta do 49-08 (throughput Sonnet medido × 110 s de timeout), que foi feita para o comparativo da VAGA. A decisão final usa a MESMA Edge Function e o mesmo prompt, então o limite é o mesmo por construção — e é isso que o plano pede. O que NÃO foi medido é se «até 4 finalistas» é suficiente na operação real da Beauty Smile: se uma vaga chega rotineiramente a 5+ candidaturas em `decisao_final`, a tela passa a mandar o RH ao comparativo da vaga como CAMINHO NORMAL, não como exceção. PROD hoje tem 1 (Correção 23), então o caso não é observável; a prova n=4 é do plano 49-18."

# Metrics
duration: 42 min
completed: 2026-09-23
tasks: 2
files: 13
---

# Phase 49 Plano 22: Só entra no comparativo quem ainda está no funil — e a decisão final compara quem de fato aguarda decisão Summary

**A tela de comparativo parou de oferecer candidatura encerrada, parou de gravar uma etapa fixa
para todo mundo, e parou de carregar um teto que a Edge Function já não usava. E a aba
«Comparativo» da decisão final — que comparava candidaturas JÁ DECIDIDAS enquanto o texto ao
lado dizia «em decisão final» — passou a comparar quem realmente espera a decisão. Cinco
marcadores lidos de volta de produção.**

## O que estava errado

**O «Avançar» que estava errado SEMPRE (D-36).** `handleAvancar` gravava
`PROXIMA_ETAPA_APOS_TRIAGEM` (`avaliacao_assincrona`) para qualquer candidato, qualquer que fosse
a etapa dele. Não é uma divergência que aparece em certos casos: um candidato em
`entrevista_presencial` era jogado **três etapas atrás**, e o painel exibia o retrocesso como se
fosse um avanço. O 49-05 mediu isso na varredura C1 (#4) e deixou um teste no Kanban pinando
exatamente o caso, para que este plano tivesse contra o que comparar.

**Os «finalistas» que eram o oposto de finalistas (D-36b).** `listFinalistas` lia
`decisao_final` — a tabela de quem **já tem decisão registrada**. Quem tem linha lá foi decidido
e, em regra, está encerrado. As duas populações são quase disjuntas, e o efeito era duplo: a aba
comparava candidaturas terminadas, e o texto ao lado afirmava «outros candidatos em decisão
final», que era **falso com aparência de escopo deliberado**. Pior: acima do teto o `useEffect`
simplesmente não invocava a EF e a aba ficava **em branco**, sem dizer por quê.

**O rótulo pela posição, outra vez — na tela que REGISTRA a decisão final.**
`resolveFinalistCandidates` fazia `parseInt(candidate_id.replace(/\D/g,''))-1` e indexava a lista
de ids. É o mesmo defeito de repúdio que o 49-13 removeu da tela do comparativo da vaga, e aqui
ele é pior pelo que a tela decide: num empate de score a EF troca as posições, e a decisão final
registrada seria sobre a pessoa errada com o registro parecendo consistente.

**O teto de 10 que a EF não usa mais (D-59).** O front oferecia seleção de até 10 candidatos; a
EF recusa acima de 4 desde o 49-08 — e o motivo daquele número é a conta de `max_tokens` que
existe porque em 20/09 um comparativo de 6 truncou e o ranking do modelo de contingência foi
entregue como sucesso.

**A candidatura encerrada oferecida na seleção (D-34).** A tabela não conhecia o predicado
canônico. A EF recusa (`ENCERRADA`) e o banco trava o avanço (49-06), mas a tela **oferecia** — e
uma tela que oferece o que o servidor recusa treina o operador a desconfiar do sistema.

## Passo 1 (D-50) — a varredura P3 re-rodada: são **16** linhas de código/cópia, não 13

Medido com `git show e83a96dd:<arquivo>` (a árvore ANTES deste plano), não inferido:

| Arquivo | Linhas de código/cópia | Comentários obsoletos |
|---|---|---|
| `TriagemTable.tsx` | **9** — `:50, 52, 214, 215, 267, 391, 423, 424, 425` | `:6`, `:204` |
| `ComparativoCandidatosPage.tsx` | **4** — `:122, 172, 175, 197` | — |
| `DecisaoFinalPage.tsx` | **3** — `:123, 181, 201` | — |
| `VagaCandidatosRHPage.tsx` | — | `:7` |
| **Total** | **16** | **3** |

⚠ **Delta contra o 49-13: são 16, não 13 — e o próprio «13» dele tem dois problemas.**

1. **Erro de soma.** O 49-13 lista 3 + 3 + 8 = **14** e escreve «13». Nenhuma das duas contas é
   a medida certa, mas vale nomear que o número publicado não fecha com a própria tabela que o
   sustenta.
2. **Subcontagem real: as duas linhas de CÓPIA do piso.** `TriagemTable.tsx:424` e
   `ComparativoCandidatosPage.tsx:175` carregam a frase «Selecione ao menos **2** candidatos para
   comparar.» — o literal do piso **no texto que o RH lê**. O 49-13 contou as linhas de
   *condição* (`< 2`) e não as de *frase*. É exatamente a mesma família de subcontagem que ele
   apontou no 49-08, um nível abaixo: **as linhas mais importantes da lista são as que o usuário
   vê, e foram as que ficaram de fora.**

Isso é o **terceiro registro consecutivo** de que a varredura P3 vinha medindo menos do que
existe (kickoff → 49-08 → 49-13 → aqui). A lição de forma: uma varredura por literal numérico
precisa varrer **cópia** com o mesmo rigor que **condição**, porque um número certo na condição
com um número errado na frase é pior que os dois errados — a tela mente com aparência de
precisão.

**Depois do conserto: zero.** Re-rodada nos quatro arquivos, a P3 devolve só prosa de comentário
histórico e os dois reexports (`COMPARE_MAX = COMPARATIVO_MAX_CANDIDATOS`), que não são um
segundo número.

## Accomplishments

1. **A seleção reconhece o predicado canônico.** `candidaturaEncerrada(row.etapa_atual,
   row.status)` decide selo + trava. O selo é **neutro** (`bg-white/15 text-white/80`), como o
   `kanban-selo-encerrada` do 49-05 e pela mesma razão: «Encerrada» não afirma se acabou bem ou
   mal. Entra na célula de etapa **já existente** — sem coluna nova.

2. **Retirada a pedido continua operável**, e o teste prova as **três** coisas: sem selo,
   checkbox habilitado, e o clique **chamando** o `onToggleSelect`. Uma asserção só de ausência
   de selo não diria «continua operável».

3. **O teto virou uma pergunta com uma resposta.** Piso e teto vêm de
   `_shared/comparativo-config.ts` por caminho relativo (contrato de zero imports). As 16 linhas
   caíram; as três frases de gating viraram constantes exportadas.

4. **O «Avançar» pergunta a etapa de CADA um.** `proximaEtapaDeTrabalho(item.etapa_atual)`, com
   o `etapa_atual`/`status` viajando no estado da rota. O teste de `entrevista_online` assere o
   **negativo** (`not.toHaveBeenCalledWith(id, 'avaliacao_assincrona')`), porque «a etapa certa
   foi gravada» é compatível com uma coincidência e «a etapa errada NÃO foi gravada» não é.

5. **Duas camadas, e a de escrita é a que recusa.** `podeAvancar` esconde o botão de quem não
   tem próxima etapa ou está encerrado; `handleAvancar` **se recusa a gravar** um palpite mesmo
   se o botão aparecer. E quando o dado que decide está ausente, o botão **fica** — inferir «não
   pode» da ausência esconderia a ação de quem pode.

6. **`PROXIMA_ETAPA_APOS_TRIAGEM` removida**, com o porquê escrito no lugar dela. O 49-05 pediu
   isso explicitamente: sem chamador, ela seria um export morto esperando um chamador novo que a
   reintroduziria como terceira cópia da regra.

7. **`listFinalistas` responde a pergunta que a tela faz.** `candidaturas` com
   `etapa_atual='decisao_final'`, filtrado pelo predicado canônico no cliente (ver
   key-decisions), projeção allowlist `id, etapa_atual, status`.

8. **Os dois estados vazios da decisão final passaram a ser diferentes e verdadeiros.** Abaixo do
   mínimo, a tela diz **quantas** há (hoje 1, em PROD). Acima do teto, diz o limite **e aponta o
   caminho** — um limite sem saída nomeada é um beco.

9. **O ranking que decide a decisão final passou a dizer qual modelo o produziu.** A
   `DecisaoFinalPage` agora **fia** a proveniência; até aqui ela omitia os três campos (o
   `undefined` que o 49-13 desenhou para significar «não fiado»). O 49-13 previu esta virada e
   deixou o contrato pronto.

10. **WINDOWS 78 fechada nas DUAS superfícies.** A tela dizia «Verifique a conexão e tente
    novamente» para um corte de gasto — falso, e pior que vago: manda mexer na rede, que está
    boa. O toast dizia a verdade sem o motivo. As duas ganharam frase própria, e **nenhuma
    nomeia a causa exata**: dizer «injeção detectada» ao recrutador confirmaria a um atacante que
    a defesa disparou.

## Verification results

| Verify | Resultado |
|---|---|
| `npx vitest run src/features/triagem src/components/pages src/lib` (T1) | **294 passed** (28 arquivos) |
| portão estático da T1 (literais de teto · constante · `proximaEtapaDeTrabalho` · selo) | **OK** |
| `npm run -s lint` após T1 | **exit 2, 89 `error TS`** — teto do plano 90 |
| `npx vitest run src/features/decisao src/features/triagem src/components/pages src/__tests__/guards` (T2) | **342 passed** (33 arquivos) |
| portão estático da T2 (constante · `posicoes` · `candidaturaEncerrada`) | **OK** |
| `npm run -s lint` após T2 e após o conserto da WINDOWS 78 | **exit 2, 89** nas duas |
| conjunto de mensagens `tsc` × baseline, sem linha/coluna | **IDÊNTICO** (`diff` vazio) nas 3 medições |
| erros `tsc` nos arquivos tocados | os 2 de `VagaCandidatosRHPage` são **PRÉ-EXISTENTES** (só mudaram de linha: 13→14, 192→201); zero novos |
| suíte vitest inteira | **217 arquivos / 2320 testes, 0 falhas** (baseline 49-13: 212 / 2171) |
| `src/__tests__/guards` (LGPD-04 / RNF-12 / D-07 / D-58) | **78 passed** (8 arquivos) |
| `npm run build` | **exit 0**, `assert-chunks PASSED`, 50 chunks, eager 1 069,9 kB |
| `grep -rl triagem-selo-encerrada build/assets/` | `VagaCandidatosRHPage-*.js` (chunk **lazy** de /rh/*) |
| `grep -rl autoTable build/assets/` | `exportComparativo-*.js` — jsPDF segue isolado (PERF-03) |
| `git push origin main` | `e83a96dd..2ad0e06b` e `2ad0e06b..cb397303` |
| `git log --oneline origin/main..HEAD` | **vazio** |
| crawler PROD — `triagem-selo-encerrada` | **PRESENTE** → `/assets/VagaCandidatosRHPage-D0rYsg33.js` |
| crawler PROD — «candidaturas em decisão final» | **PRESENTE** → `/assets/DecisaoFinalPage-DyUPQwD1.js` |
| crawler PROD — «Nenhum modelo de IA chegou a ser consultado» | **PRESENTE** → `/assets/ComparativoScreen-ZPSuNWY1.js` |
| crawler PROD — «Nenhum modelo de IA foi consultado» (toast) | **PRESENTE** → `/assets/index-C55SemLW.js` |
| crawler PROD — «O comparativo aceita até» | **PRESENTE** → `/assets/ComparativoCandidatosPage-vZjYFxhH.js` |
| `gsd-tools windows status` | 78 = `fixed`, com razão escrita |

## TDD Gate Compliance

`workflow.tdd_mode` é **false** (medido), então o gate não bloqueia. A Task 1 é `type="tracer"`
(um commit de produção, como o tipo prescreve) e a Task 2 é `tdd="true"`:

| Tarefa | Gate | Commit | Estado |
|---|---|---|---|
| Task 1 (tracer) | — | `dd0bb32a` `feat(49-22): …` | ✓ 294/294 nas pastas, portão estático OK, `tsc` 89 |
| Task 2 | RED | `3e266b2f` `test(49-22): …` | ✓ 11 reprovam em `src/features/decisao`, por asserção |
| Task 2 | GREEN | `2ad0e06b` `feat(49-22): …` | ✓ 342/342 nas 4 pastas, 2320/2320 na suíte |
| Task 2 | REFACTOR | — | não houve: o conserto é uma query, um lookup por chave e três ramos de JSX. Inventar um commit de limpeza seria teatro de processo |
| WINDOWS 78 (2ª superfície) | — | `cb397303` `fix(49-22): …` | ✓ 343/343, `tsc` 89 |

**RED da Task 1 medido** (`--reporter=verbose`): **55 descobertos, 43 passam, 12 reprovam**, e os
12 são os alvo — `TestingLibraryElementError` no `data-testid` do selo, `expected [] to have a
length of 2` na contagem de desabilitados, `not to match /Verifique a conexão/`,
`not.toHaveBeenCalledWith(…, 'avaliacao_assincrona')` e o `waitFor` do toast que nunca vinha
porque o handler gravava em silêncio. Nenhuma falha de carregamento de módulo, nenhuma descoberta
vazia: **não é INVALID_RED (#3770)**.

**RED da Task 2 medido**: **11 reprovados** em `src/features/decisao`, todos por asserção
(`expected 'candidatura_id, decisao, candidaturas…' to contain 'etapa_atual'`, `expected vi.fn()
to be called with ['candidaturas']`, textos ausentes, `[data-testid="proveniencia-ia-badge"]`
ausente). O arquivo novo **carregou** e 1 dos seus 6 casos passou — o oposto de um
`fixture_or_load_failure`.

⚠ **Os casos que já passavam no RED passavam por construção** e não descrevem comportamento
novo: na Task 2, «dentro do intervalo a EF é invocada» e «erro do PostgREST → DATABASE_ERROR»;
na Task 1, «retirada a pedido continua selecionável», «candidatura em andamento não ganha selo»,
«sem `podeAvancar` o botão aparece para todos», «código desconhecido cai no genérico» e
«MIXED_VAGA continua com a sua cópia». Eles descrevem o que o conserto **não pode quebrar**.
Registrado para não parecer que as asserções ficaram verdes de graça — a mesma nota que os planos
03, 04, 05, 08, 13 e 27 desta fase precisaram fazer, pela mesma razão.

## Tracer feedback gate (Task 1)

`gate` ausente no `<task>` → `blocking` (o padrão), **não** `blocking-human`. Medido:
`AUTO_CHAIN=false`, `AUTO_CFG=false`, `HUMAN_VERIFY_MODE=end-of-phase`, e o `<verify>` do tracer
tem **só** `<automated>`. Pelo ramo correspondente: re-rodar o `<verify>` ponta a ponta — passou
(294/294 + portão estático + `tsc` 89) → `⚡ Tracer verified end-to-end — expanding`, sem
checkpoint. Registrado porque a decisão de **não** parar aqui é tão reportável quanto a de parar.

## Findings

**1. A varredura P3 deixava de fora justamente as linhas que o usuário lê.** Ver Passo 1. As duas
linhas a mais são as frases «ao menos 2 candidatos» — literal de piso em **cópia**, não em
condição. Terceiro registro consecutivo de subcontagem da mesma varredura, e o mais instrutivo
dos três: o padrão sabia procurar o número na aritmética e não na frase, e é a frase que produz a
mentira visível.

**2. Uma asserção sobre a cópia do tooltip PASSA com a frase errada no código.** O primeiro teste
que escrevi para o teto lia `document.body.textContent` procurando «ao menos 2 candidatos», e
reprovou no RED — mas **reprovaria também no GREEN**: o `TooltipContent` do Radix não é montado
enquanto o tooltip está fechado, então aquele texto **nunca** está no DOM, com qualquer
implementação. Um teste assim é pior que nenhum: ele dá a impressão de vigiar uma frase que ele
não consegue nem ver. O conserto tem duas pernas, e uma só não serve: (a) extrair a cópia para
uma constante exportada e asserir a **constante** (prova de que o número é montado, não escrito);
(b) asserir o **render** de uma superfície que existe de verdade — o contador `1 de 4
selecionados` da barra sticky. Sem (a) o número da frase fica sem vigilância; sem (b) nada prova
que a constante chega à tela.

**3. `gsd-tools check tdd-red-evidence` continua inaplicável a este repositório — QUINTO
registro.** O checker casa `/^# tests (\d+)/m`, `/^# pass …/`, `/^# fail …/`, os contadores do
`node:test`. O TAP do vitest não os emite. Escrever aquelas três linhas à mão faria o checker
devolver `RED_EVIDENCE_OK` e **seria forjar o artefato que ele existe para ler**. Não foi feito.
Registros anteriores: 49-03 (Deno), 49-04, 49-05 (vitest), 49-08 (Deno), 49-13 (vitest). O
veredito honesto é **inaplicável neste runtime**, não «aprovado».

**4. Meu próprio crawler de PROD engolia o primeiro resultado — e isso quase virou um diagnóstico
falso.** A versão multi-marcador imprimia as linhas de todos os marcadores **menos o primeiro**,
e ainda assim saía com `exit=0`. Numa das execuções o primeiro marcador era o do toast, que
naquele instante estava **genuinamente ausente** (a Vercel ainda servia o índice anterior,
`index-BN5DCvIr.js`) — e o instrumento reportou sucesso. Se eu tivesse confiado nele, teria
declarado publicado o que não estava. Foi a leitura do **hash do índice servido** que separou as
duas coisas. Duas lições: (a) verificar **um marcador por chamada**, porque o custo é baixo e o
modo de falha do instrumento é silencioso; (b) o sinal confiável de «o deploy saiu» não é o
marcador, é o **hash do bundle** — comparar o `index-*.js` servido com o do build local responde
«saiu ou não saiu» sem depender de escolher bem a agulha. É o §L do PATTERNS aplicado à
construção do instrumento, não à leitura do resultado.

**5. Um marcador que atravessa uma interpolação JSX não é greppável no bundle.** «até 4
candidaturas» saiu **AUSENTE** no crawler, e não porque não tinha subido: o código é
`até {COMPARATIVO_MAX_CANDIDATOS} candidaturas`, que o JSX compila em elementos separados — a
string contígua não existe no artefato. O sintoma é **idêntico** ao de um deploy que não saiu. O
prefixo literal «O comparativo aceita até» está presente, no chunk esperado. **Marcador de
publicação tem de ser um trecho LITERAL do fonte**, nunca uma frase que o compilador corta — e
escolher mal produz um alarme cujo diagnóstico natural («o conserto não subiu») está errado.

**6. O teste da página precisou substituir as `Tabs` do Radix, pela mesma razão que o 49-05
precisou substituir o `DropdownMenu`.** No happy-dom o `TabsTrigger` não troca o painel com
`fireEvent.click`. O mock é uma implementação controlada de ~20 linhas com contexto React, que
renderiza **só o painel ativo** — o comportamento do componente real, e o que permite asserir
«a EF não foi invocada» de forma significativa. Registrado porque o caminho intuitivo (clicar no
primitivo real) falha de um jeito que só aparece ao rodar, e é a **segunda** família de primitivo
Radix desta fase com o mesmo problema.

**7. O comando `windows fixed` foi disparado numa sonda de descoberta de assinatura, e marcou a
janela.** Ao investigar os argumentos do subcomando (`windows fixed 78` devolveu «Expected 1
positional argument»), a sonda seguinte — `windows fixed 78 xyz` — **executou** e gravou
`status=fixed` com resolução **vazia**. Como o comando recusa re-fixar uma janela já `fixed`, a
razão teve de ser escrita à mão no `WINDOWS.md`, que é exactamente o remédio que o commit
`e83a96dd` aplicou às janelas 60 e 63 («fixed e vazias»). A nota registra isso dentro dela
própria. **Lição de forma: descobrir a assinatura de um comando de ESCRITA tentando executá-lo é
uma escrita.** O caminho certo era ler o código do subcomando.

## Deviations from Plan

### Acrescentado além da letra do plano

**1. [Rule 2 - Funcionalidade crítica ausente] WINDOWS 78 fechada nas DUAS superfícies**

- **Found during:** Task 1, ao editar o `ComparativoScreen` (arquivo do plano)
- **Issue:** a janela 78, registrada PELO 49-27 e endereçada a este plano, nomeia dois lugares: o
  corpo de erro do `<AsyncState>` (que dizia «Verifique a conexão e tente novamente» — **falso**
  para um corte de gasto) e o toast do `useComparativo` (verdadeiro, sem o motivo). O plano não
  menciona nenhum dos dois.
- **Fix:** ramo `SEM_RESULTADO_IA` no `errorCopyOverride` do `ComparativoScreen` (commit do
  tracer) e entrada `SEM_RESULTADO_IA` em `RECUSA_COMPARATIVO_COPY` (commit `cb397303`).
- **Files modified:** `ComparativoScreen.tsx`, `triagemService.ts` (+ os 2 testes)
- **Verification:** 4 testes, incluindo o de que um código **desconhecido** continua caindo no
  genérico e o de que a causa exata **não vaza**; 2 marcadores lidos de volta de PROD.
- **Commits:** `dd0bb32a`, `cb397303`

**2. [Rule 2] As frases de gating extraídas para constantes exportadas**

- **Found during:** Task 1, ao escrever o teste da cópia do teto
- **Issue:** ver Finding 2 — a frase vive num contêiner que o teste não monta, então nenhuma
  asserção a alcança. E cada frase aparecia em **duas** linhas do JSX.
- **Fix:** `COPY_TETO_COMPARATIVO`, `COPY_PISO_COMPARATIVO`, `COPY_ENCERRADA_COMPARATIVO`
  exportadas de `TriagemTable`.
- **Verification:** o teste assere a constante E o render do contador da barra.
- **Commit:** `dd0bb32a`

**3. [Rule 3 - Blocker] `resolveFinalistCandidates` exportada**

- **Found during:** Task 2
- **Issue:** ela era interna ao módulo; o plano pede a mesma regra do 49-13, e lá a função foi
  **exportada** justamente porque é pura e o caso que importa (ordem divergente) é caro de montar
  pela página. Mantê-la interna aqui impediria o paralelo.
- **Fix:** `export function resolveFinalistCandidates(ranked, posicoes)` — assinatura trocada de
  `(ranked, finalistIds)` para `(ranked, posicoes)`, que é a mudança de fundo.
- **Commit:** `2ad0e06b`

**4. [Rule 3] Três comentários obsoletos de «2-10» corrigidos**

- **Found during:** Passo 1
- **Issue:** `TriagemTable.tsx:6,204` e `VagaCandidatosRHPage.tsx:7` documentavam «multi-select
  gateado 2-10». Não são código, mas são o que a próxima pessoa lê primeiro — e o CLAUDE.md
  deste repositório abre com o registro de que documentação desatualizada custa **mais** que
  ausente, porque vem com autoridade.
- **Commit:** `dd0bb32a`

### Asserções mudadas DE PROPÓSITO (com comentário no lugar)

- **`decisaoService.test.ts`** — «listFinalistas projects ONLY candidatura_id + decisao» virou
  «ONLY id + etapa_atual + status». A asserção antiga pinava a **tabela errada**; o invariante que
  ela protege (allowlist, nunca o curinga, nunca PII) continua e ficou **mais forte** (`nome`
  entrou na lista de proibidos).
- **`TriagemTable.test.tsx`** — o `describe` «compare-bar gating (2-10)» e as suas 3 asserções
  passaram a ler as constantes. Um literal ali reintroduziria a segunda verdade que o D-59
  removeu: o teste afirmaria um teto que a EF não usa e **continuaria verde** depois da próxima
  mudança do número.

---

**Total deviations:** 4 acrescentadas (3 × Rule 2/3 de funcionalidade, 1 × documentação) + 2
grupos de asserção mudados de propósito. **Impact:** nenhum no comportamento pedido; a WINDOWS 78
fechada é entrega ADICIONAL. A família da 1 vale nomear: **uma janela endereçada ao seu plano, num
arquivo que o seu plano já abre, é escopo — não vizinhança.**

### Fora de escopo, registrado e NÃO tocado

- **C8 #6 — `classificacao_cor ?? 'verde'` nos TRÊS sítios** (`revisaoRedacaoService.ts:107-108`,
  `RedacaoSidebar.tsx:61`, `RedacaoReviewPanel.tsx:181`): ausência virando a MELHOR cor. Não é
  deste plano e nenhum dos três arquivos está em `files_modified`. **Continua aberto.**
- **WINDOWS 71 / 72** — mapas de rótulo do Big Five fora da tabela de varredura, e o guard
  `forbidden-strings` não vigiando o termo clínico do N. **Continuam abertos**, e o 72 é o mais
  incômodo dos dois: é um portão que não morde.
- **WINDOWS 76 / 77 / 79** — as três do 49-20/49-28, matéria do operador (49-21) e do 49-19.
- **`resend-webhook.test.ts`** (`npm:svix@1.99.1`) e **`_shared/__tests__/strict-schema.test.ts:88`**
  — pré-existentes, fora do alcance do vitest por desenho (`vite.config.ts` exclui
  `supabase/functions/**`). Nomeados, não «consertados» (Scope Boundary).
- **Os 89 erros de `tsc`** — nenhum deles em arquivo que este plano abriu. Os 2 de
  `VagaCandidatosRHPage` eram já do baseline e só mudaram de linha.
- **`FUNNEL_ORDER` e `TIMELINE`** — o 49-05 registrou por que NÃO devem ser fundidas com
  `ETAPAS_DE_TRABALHO`. Não tocadas.

## Known Stubs

**Nenhum.** Os 13 arquivos foram varridos por
`TODO|FIXME|placeholder|coming soon|not available|não disponível`. Todos os acertos são os falsos
positivos já registrados pelos planos 05, 08 e 13: (a) o quantificador português **«todo/todos»**
(«para todos», «TODOS os rótulos», «todo mundo»); (b) `placeholder` como **atributo HTML** de
`Input`/`SelectValue`; (c) `'Nome não disponível'` em `TriagemTable:330`, **pré-existente** e
legítimo — é o rótulo de uma linha sem `candidato` vinculado, não um valor vazio codificado.
Nenhum componente novo sem fonte de dados: `etapa_atual`, `status`, `posicoes` e os três campos de
proveniência têm valor real em todos os caminhos, e `null` aparece só onde `null` é a verdade.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. Nenhum endpoint, nenhum
caminho de auth, nenhuma mudança de esquema, **zero instalação de pacote**. O plano **remove**
superfície:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-22-01 («Avançar» de encerrada pelo comparativo) | mitigate | seleção travada pelo predicado (4 testes) + botão gateado por `podeAvancar` (1 teste) + `handleAvancar` recusando gravar (1 teste). A EF recusa (`ENCERRADA`, 49-08) e o banco trava (49-06) — três camadas, e as duas de fora não são desta tela |
| T-49-22-02 («Avançar» gravando etapa fixa) | mitigate | `proximaEtapaDeTrabalho(etapa_atual)` por candidato, com teste por etapa e **asserção negativa** de que a etapa fixa antiga não é gravada |
| T-49-22-03 (decisão final comparando encerrados / cortando em silêncio) | mitigate | `listFinalistas` pelo predicado (5 testes) + os dois estados distintos com a EF não invocada (2 testes) |
| T-49-22-SC (supply chain) | mitigate | **zero instalação**; os 4 imports novos são relativos para `_shared` (contrato de zero imports) ou para `@/lib/candidatura` |

**Acrescentado além do registro:** a cópia de `SEM_RESULTADO_IA` **não** distingue «corte de
gasto» de «injeção detectada». Uma frase que os distinguisse confirmaria a um atacante que a
defesa de injeção disparou — o mesmo raciocínio que fez o `FORBIDDEN` do 49-13 ser genérico de
propósito. Há asserção negativa (`rejects.not.toThrow(/injec|injeç/i)`).

## Issues Encountered

- **`tsc` em 89 contra teto 90: a margem de UM sobreviveu, nas TRÊS medições**, com o conjunto de
  mensagens **idêntico** ao de antes do plano. O aviso dos planos anteriores segue válido para os
  que faltam: 13 arquivos tocados e nenhum erro novo foi sorte administrada, não folga.
- **O RED da Task 2 não tocou o baseline congelado de 96**, porque a mudança de assinatura
  (`resolveFinalistCandidates`) ficou no GREEN, não no RED — o teste da página não chama a função
  diretamente. O aviso do 49-13 (contar os pontos de chamada antes de commitar um RED) foi lido e
  aplicado por construção.
- **Nenhuma pessoa abriu estas telas nesta sessão.** O selo, a trava, o botão ausente e as duas
  frases novas são provados por teste e pelos marcadores em PROD. O que não foi exercido é o
  **juízo de UX** — em especial o «Avançar» que desaparece **sem uma frase** dizendo por quê
  (registrado no `coverage` como juízo humano).
- **O caso de `SEM_RESULTADO_IA` não foi exercido em PROD.** Forçá-lo exigiria estourar o teto de
  gasto de propósito. A cópia é provada por teste e os dois marcadores estão no ar.

## Next

Plano 49-17 / 49-18 / 49-19 / 49-21 (os quatro que restam da fase). O que este plano deixa pronto
para quem vem depois:

- **49-16** (selo nas outras telas): `SEM_RESULTADO_IA` já tem cópia nas duas superfícies do
  comparativo. Se a janela do selo tocar outra tela que invoca a EF, o padrão a copiar é o
  `errorCopyOverride` do `ComparativoScreen` — **não** uma terceira redação.
- **49-18** (prova n=4 do teto): o front agora **respeita** o teto de 4 em três telas. Se a prova
  derrubar o número, há **um** lugar para mudá-lo (`_shared/comparativo-config.ts`) e o `tsc` +
  os testes acompanham — mas ⚠ **mudar o teto é mudar DUAS coisas**: a constante e o `max_tokens`
  da linha ativa de `comparative_ranking`, como o docblock daquele arquivo avisa.
- **49-19** (portões): o `windows fixed` de uma janela já `fixed` é recusado, e a nota fica vazia
  (Finding 7). Se o 49-19 varrer portões por forma, este é um: um comando de escrita cuja
  descoberta de assinatura **é** uma escrita.
- **Para qualquer plano que publique e confira marcador:** compare o **hash do índice servido**
  com o do build local antes de concluir «ausente» (Finding 4), e escolha marcadores que sejam
  trechos **literais** do fonte (Finding 5).

## Self-Check: PASSED

- Presente no disco: `src/features/decisao/components/__tests__/DecisaoFinalPage.test.tsx` —
  **FOUND**. Os 12 modificados — **FOUND** (13 arquivos em `git diff --name-only`).
- Presentes no `git log` e **os quatro já em `origin/main`**: `dd0bb32a`, `3e266b2f`, `2ad0e06b`,
  `cb397303`.
- `commits: 4` **MEDIDO** por `git rev-list --count e83a96dd..HEAD`, não narrado;
  `plan_head_before` registrado. `tokens: 22219` medido dos 88 878 octetos do diff em `src`.
- Nenhuma deleção de arquivo nos quatro commits (`git diff --diff-filter=D` vazio); nenhum
  arquivo untracked ao fim de cada commit.
- `<acceptance_criteria>` das 2 tasks re-executados: verdes. `<verification>` de plano
  re-executada: **343 passed** nas 4 pastas, `tsc` 89 ≤ 90, marcadores no build e **lidos de
  volta de PROD um por chamada**, `origin/main..HEAD` vazio.
- `PROXIMA_ETAPA_APOS_TRIAGEM`: **removida** — `grep -rn` em `src` e `supabase` devolve **5**
  ocorrências e **todas as 5 são prosa de comentário** (a nota de remoção em `triagemService:474`,
  o docblock do `handleAvancar`, o docblock histórico de `proximaEtapa.ts:13` do 49-05, e duas
  linhas de comentário no teste). **Zero ocorrências de código**: nenhum `export`, nenhum
  `import`, nenhuma referência avaliada.
- P3 re-rodada depois do conserto: **zero literais** nos quatro arquivos.
