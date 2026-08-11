---
phase: 47-transpar-ncia-consolida-o
plan: 08
subsystem: frontend
tags: [compliance, lgpd, transparencia, alcancabilidade, rodape, alvo-tatil, vitest, react]

requires:
  - phase: 47-transpar-ncia-consolida-o
    provides: "SubprocessadoresPage + a rota /subprocessadores, com os seis países medidos em 2026-08-11 (47-04)"
  - phase: 47-transpar-ncia-consolida-o
    provides: "PrivacidadePublicaPage + a rota /privacidade, derivada e datada (47-06)"
  - phase: 47-transpar-ncia-consolida-o
    provides: "COPY_TRANSPARENCIA — o molde de bloco de copy por superfície, e o portão de copy do escopo da feature (47-04)"
provides:
  - "src/features/transparencia/components/RodapePublico.tsx — o componente de alcançabilidade: dois links, piso de alvo tátil em cada um, lista de proibições no docblock"
  - "COPY_TRANSPARENCIA.rodape — os dois rótulos verbatim da UI-SPEC + o nome acessível do ponto de referência de navegação"
  - "src/features/transparencia/__tests__/rodapePublico.test.tsx — 17 casos: o contrato dos dois links, o piso estrutural por link, a lista de proibições no DOM e na fonte, a forma, o zero-estado e o docblock"
affects: [47-09-consol-04, publicacao-das-duas-rotas-publicas]

actuals:
  tokens: 4300
  tasks: 1
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Piso de alvo tátil asserido no PRÓPRIO elemento acionável e acompanhado da caixa que o torna eficaz: `min-height` numa âncora `inline` é ignorado pelo CSS, então a classe sozinha é uma asserção que passa enquanto o defeito persiste"
    - "Tratamento repetido de propósito, com o motivo escrito ao lado: uma constante compartilhada deixaria um portão de CONTAGEM de fonte vendo um piso só, e um link novo sem piso passaria despercebido"
    - "Lista de proibições nominal DENTRO do docblock do componente, com o portão varrendo o código sem os comentários — a documentação da proibição não pode ser a primeira violação dela"

key-files:
  created:
    - src/features/transparencia/components/RodapePublico.tsx
    - src/features/transparencia/__tests__/rodapePublico.test.tsx
  modified:
    - src/features/transparencia/constants/copyTransparencia.ts
    - src/features/transparencia/index.ts

key-decisions:
  - "A Task 3 (a montagem nas cinco superfícies) NÃO foi executada: ela é o ato de PUBLICAÇÃO, e o portão do Encarregado está aberto. O componente existe, é exportado e não está montado em navegação nenhuma"
  - "O portão NÃO foi auto-satisfeito nem enfraquecido para a montagem passar — nem parcialmente nas duas páginas novas, porque a proibição do plano é literal: `MUST NOT montar o rodapé antes da aprovação do Encarregado`"
  - "O nome acessível do ponto de referência de navegação entra na constante de copy e NÃO é um terceiro link: sem ele, o rodapé e a navegação de topo das páginas de conversão viram dois pontos de referência indistinguíveis para leitor de tela"
  - "O tratamento dos dois links é repetido em vez de extraído para constante — a contagem de fonte é o portão, e ela precisa encontrar uma ocorrência POR LINK"
  - "O registro de que o componente não está montado ficou no barrel da feature, não só neste SUMMARY: o SUMMARY sai de contexto, o comentário fica"

patterns-established:
  - "Componente de alcançabilidade entregue COMPLETO e deliberadamente desmontado: a engenharia atravessa o portão de publicação, a navegação não"

requirements-completed: []

coverage:
  - id: D1
    description: "O rodapé renderiza exatamente dois links, com os rótulos vindos da constante de copy, na ordem da especificação e apontando para as duas rotas públicas"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(1)..(5)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cada link carrega o piso de alvo tátil de 44px no próprio elemento acionável, com a caixa que torna o piso eficaz — o modo de falha mais provável da fase, invisível em teste de texto"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(6), (7)"
        status: pass
      - kind: other
        ref: "guard automático do 47-08-PLAN.md Task 2 — 2 links, 2 pisos, zero posicionamento fixo"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nenhum item da lista de proibições aparece no DOM renderizado nem no código fora de comentário: sem marca, sem canal de contato, sem rede social, sem direitos autorais, sem terceiro link"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(8)..(10)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A forma: separado por linha divisória, empilhado abaixo do ponto de quebra e lado a lado acima dele, nunca fixo nem grudado nem sobreposto"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(11)..(13)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Zero estado, zero consulta, zero render assíncrono, e o docblock registra que ele é um rodapé de alcançabilidade e lista nominalmente o que é proibido nele"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(14)..(17)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A revisão do Encarregado — o portão de PUBLICAÇÃO das duas páginas, antes de qualquer navegação de produção apontar para elas"
    requirement: TRANSP-02
    verification:
      - kind: manual_procedural
        ref: "47-08-PLAN.md Task 1 — quatro itens de revisão; 47-CONTEXT §Área 5"
        status: unknown
    human_judgment: true
    rationale: "Nenhum teste pode revisar uma declaração pública de transferência internacional. O portão decide se as duas páginas passam a ser ALCANÇÁVEIS, e cinco das seis empresas contratadas tratam os dados nos Estados Unidos enquanto todos os candidatos são brasileiros — a página declara transferência internacional em quase toda a cadeia. É decisão do Encarregado, e o executor não pode satisfazê-la."
  - id: D7
    description: "A montagem do rodapé nas três rotas de conversão e nas duas páginas novas (Task 3)"
    requirement: TRANSP-01
    verification: []
    human_judgment: true
    rationale: "NÃO EXECUTADA por desenho: a montagem é o ato de publicação e o portão D6 está aberto. Executá-la agora seria publicar antes da revisão — exatamente o que a ordem das tarefas deste plano existe para impedir."

duration: 14min
completed: 2026-08-11
status: checkpoint
---

# Phase 47 Plano 08: `RodapePublico` — o componente que torna as duas páginas encontráveis, construído e deliberadamente NÃO montado

**O rodapé de alcançabilidade existe, tem exatamente dois links, cada um com o piso de alvo tátil provado estruturalmente, e não está montado em navegação nenhuma — porque montá-lo é o ato de PUBLICAÇÃO e o portão do Encarregado continua aberto.**

## ⚠ O ESTADO EM UMA FRASE, ANTES DE QUALQUER DETALHE

**A Task 1 (revisão do Encarregado) está ABERTA e não foi satisfeita. A Task 3 (a montagem) NÃO foi
executada.** O que este plano entregou foi a Task 2 inteira: o componente, a copy, o barrel e os 17
casos de teste. As duas páginas continuam existindo em `/privacidade` e `/subprocessadores`,
visitáveis por URL direta, e **nenhuma navegação de produção leva a elas**.

Esse é o estado seguro que o próprio plano descreve: *"Se qualquer um dos quatro não estiver
aprovado, o plano PARA aqui. As páginas continuam existindo nas rotas e continuam sem navegação
apontando para elas."*

## O que o Encarregado precisa revisar — e o achado que muda o peso da revisão

O portão tem **quatro itens**, e o primeiro deles mudou de natureza desde que o plano foi escrito.

### 1 · Os seis países — **cinco das seis tratam os dados nos Estados Unidos**

Os países foram **medidos** pelo operador em 2026-08-11 (fecho da Task 3 de 47-04). O bloqueio de
**fato** acabou; o que ele revelou é material para esta revisão:

| Empresa | País declarado na página | Como foi medido |
|---|---|---|
| Supabase | Estados Unidos | painel do projeto, região `us-east-1` |
| Vercel | Estados Unidos | painel do projeto, região `iad1` (Washington, D.C.) |
| OpenAI | Estados Unidos | padrão do fornecedor — a região nunca foi configurada na conta |
| Anthropic | Estados Unidos | política pública do fornecedor |
| Resend | Estados Unidos | DPA, citação literal |
| ViaCEP | Brasil (jurisdição do serviço; hospedagem não divulgada) | documentação do fornecedor |

**Todos os candidatos são brasileiros.** Com cinco das seis tratando os dados nos Estados Unidos, a
página está declarando **transferência internacional em quase toda a cadeia**. Isso não é um detalhe
de rodapé da revisão: é o núcleo dela. O que o Encarregado decide aqui é se a página declara esse
fato da forma correta e se a base legal citada em cada entrada sustenta a transferência.

Há também um achado de método que vale registrar para a revisão: antes da medição existia um indício
à mão — o fuso horário do banco em produção é `America/Sao_Paulo` — e ele foi **recusado** como prova
de região. A medição provou que a região real é `us-east-1`. Se o indício tivesse sido aceito, a
página afirmaria que os dados de candidatos brasileiros ficam no Brasil, o que é falso, e nenhum
teste teria pego.

### 2 · A formulação do provedor de hospedagem

Para conteúdo estático servido por rede de borda global, "um país" pode não ser a resposta honesta. A
alternativa é descrever o **fato** — rede de distribuição global, com a empresa e a jurisdição
nomeadas. Isso **muda a forma do campo**, e a regra de que nenhuma entrada embarca com o campo
indefinido continua valendo nas duas formas. Decisão do Encarregado, não de quem executa.

### 3 · A qualificação do serviço público de CEP

Ele recebe o CEP digitado e o endereço de origem do navegador do candidato. Se o Encarregado decidir
que ele **não** é empresa contratada tratando dados em nome da Beauty Smile, a entrada sai da lista
**e a decisão fica registrada em comentário no arquivo** — omitir em silêncio é o proibido.

### 4 · A copy das duas páginas, com atenção a três frases

- a que descreve o que os provedores de IA recebem — ela enumera as classes que o mascarador
  comprovadamente remove e **não** afirma ausência de identificação, porque o mascaramento não
  alcança nome próprio digitado em texto livre;
- a que explica como a página de privacidade é feita — ela **não** promete regeneração automática;
- o carimbo de vigência — ele carrega a data de **medição** da matriz viva, não a data do build.

### O que acontece depois da aprovação

A Task 3 monta `<RodapePublico />` como **último filho do container existente** em cinco superfícies —
`LandingPage`, `VagasPublicasPage`, `VagaDetalhePage`, `SubprocessadoresPage` e
`PrivacidadePublicaPage` — com a regra de não-regressão literal: **zero linha removida** nas três
páginas de conversão, e no máximo o import mais a montagem em cada uma. O guard automático da Task 3
já está escrito no plano e reprova qualquer remoção.

## Performance

- **Duração:** ~14 min
- **Iniciado:** 2026-08-11T00:44Z
- **Concluído:** 2026-08-11T00:58Z
- **Tarefas:** 1 executada de 3 — a Task 1 é o portão aberto, a Task 3 é o que ele bloqueia
- **Arquivos criados/modificados:** 4
- **Dependência npm nova:** 0

## Accomplishments

- **O componente existe e é completo.** Dois links, os rótulos vindos da constante, destinos
  corretos, ordem da especificação, tratamento visual idêntico entre eles.
- **O modo de falha mais provável da fase está travado por asserção estrutural, e por duas.** O piso
  de 44px é asserido em **cada** link, no **próprio elemento acionável** — não num contêiner
  ancestral, porque um ancestral alto com uma âncora baixa dentro dele passa em qualquer asserção de
  contêiner e continua sendo impossível de acertar com o polegar. E a asserção exige também a caixa
  `flex`: `min-height` numa âncora `inline` é **ignorado pelo CSS**, então a classe sozinha seria uma
  asserção que passa enquanto o defeito persiste.
- **A lista de proibições é executável, não uma nota.** Marca, canal de contato, rede social,
  direitos autorais, boletim e qualquer terceiro link são asseridos ausentes **no DOM renderizado** e
  **no código fora de comentário**. "Completar" o rodapé passa a ser um teste vermelho em vez de uma
  discussão de gosto.
- **A proibição está escrita onde a próxima pessoa lê antes de editar** — no docblock do componente,
  nominalmente. E o portão varre o código **sem** os comentários, porque um grep sobre o arquivo
  inteiro reprovaria a documentação da própria proibição: o defeito de portão auto-invalidante que
  este projeto já pagou duas vezes (Phases 43 e 44).
- **O rodapé não é fixo, grudado nem sobreposto**, asserido nas classes e na fonte. Um rodapé grudado
  comeria dobra numa tela de 320px — numa superfície mobile-first isso é conteúdo perdido.
- **O portão de publicação foi respeitado sem ser enfraquecido.** Nem auto-satisfeito, nem contornado
  por uma montagem parcial "que não publica nada".

## Task Commits

Cada tarefa foi commitada atomicamente, com o hook de pre-commit rodando — **zero `--no-verify`**.

1. **Task 1 (checkpoint: revisão do Encarregado)** — **NÃO SATISFEITA. Sem commit, por desenho.**
2. **Task 2 (TDD): o `RodapePublico`, a copy, o barrel e os 17 casos**
   - `3a86db6` (test) — RED: 14 de 17 casos falhando
   - `2c68c49` (feat) — GREEN: 17/17 no arquivo, 112/112 na feature, 1861/1861 na suíte
3. **Task 3 (a montagem nas cinco superfícies)** — **NÃO EXECUTADA.** É o ato de publicação, e o
   portão da Task 1 está aberto.

## Files Created/Modified

- `src/features/transparencia/components/RodapePublico.tsx` — o componente. O docblock registra em
  três blocos o que ele **é** (alcançabilidade), o que ele **não é** (institucional, com a lista
  nominal de proibições) e as duas propriedades que um teste de texto não vê.
- `src/features/transparencia/__tests__/rodapePublico.test.tsx` — **17 casos, zero snapshot.** Um
  snapshot passaria num rodapé que perdeu o piso de alvo tátil sem mudar de texto.
- `src/features/transparencia/constants/copyTransparencia.ts` — **+1 bloco** com os dois rótulos
  verbatim da UI-SPEC e o nome acessível do ponto de referência. O docblock do bloco declara que ele
  **não cresce**.
- `src/features/transparencia/index.ts` — exporta o componente **e registra que ele ainda não está
  montado em navegação nenhuma**, com o motivo. O SUMMARY sai de contexto; o comentário fica.

## Decisions Made

- **O nome acessível do ponto de referência de navegação entra na copy, e não é um terceiro link.**
  Sem ele, o rodapé e a navegação de topo das páginas de conversão viram dois pontos de referência
  indistinguíveis para quem usa leitor de tela — o oposto do que um componente de alcançabilidade
  existe para fazer. A proibição da UI-SPEC é sobre itens visíveis e links; o nome de um ponto de
  referência não é nenhum dos dois.
- **O tratamento dos dois links é repetido de propósito.** Ver o desvio 1.
- **Nada foi montado, nem parcialmente.** Ver o desvio 2.

## Deviations from Plan

### 1. [Rule 2 - Missing Critical] O piso de alvo tátil exige a CAIXA, não só a classe

- **Encontrado durante:** Task 2, ao escrever a asserção que o plano chama de "a que carrega o peso".
- **Problema:** `min-height` numa âncora `inline` — o padrão de um `<a>` — é **ignorado pelo CSS**.
  Uma asserção que só verifica a presença de `min-h-[44px]` na classe passaria num link de 20px de
  altura, que é exatamente o defeito que ela existe para pegar. A asserção seria uma cerimônia.
- **Correção:** o caso (6) exige, além do piso, que a classe do link traga `flex`, `inline-flex` ou
  `grid` — a caixa que faz o `min-height` valer. Mesma forma já usada nos links de 47-04 e 47-06.
- **Commit:** `3a86db6` / `2c68c49`

### 2. [Rule 2 - Missing Critical] O tratamento foi REPETIDO nos dois links, não extraído

- **Encontrado durante:** Task 2, no primeiro GREEN — o caso (7) ficou vermelho.
- **Problema:** a primeira versão extraiu a classe para uma constante compartilhada. O componente
  ficou mais limpo e o **portão de contagem de fonte** passou a ver **um** piso em vez de dois. Um
  portão que conta ocorrências para provar "uma por link" perde a capacidade de acusar o link novo
  que nasce sem piso.
- **Correção:** o tratamento é repetido nos dois links, com o motivo escrito em comentário ao lado —
  para que a próxima pessoa que quiser "limpar" a duplicação leia primeiro por que ela existe. O
  caso (6), que mede o DOM link a link, continua sendo a prova forte; o caso (7) é a rede da fonte.
- **Commit:** `2c68c49`

### 3. Desvio de escopo — a Task 3 não foi executada, e a Task 1 não foi satisfeita

Não é um auto-fix: é o cumprimento literal da ordem das tarefas do plano, que **é** o portão de
publicação. A proibição do plano não é condicional — *"MUST NOT montar o rodapé antes da aprovação do
Encarregado"*.

Uma montagem **parcial** (só nas duas páginas novas, que já são inalcançáveis, e portanto "sem
publicar nada") foi considerada e **recusada**: a proibição é literal, o guard da Task 3 exige as
cinco superfícies, e satisfazer um portão pela metade para que ele "passe" é o modo de falha contra o
qual este plano inteiro foi escrito.

### 4. Desvio de forma — o RED é de COMPORTAMENTO, não de compilação

Precedente idêntico ao registrado em 47-04 e 47-06. O `.husky/pre-commit` é portão de **contagem** de
erros de `tsc`, congelada em 97; um RED clássico (módulo inexistente) elevaria a contagem e só seria
commitável com o bypass que o portão do M8 proíbe. O commit RED traz o componente como esqueleto
declarativo — a assinatura existe para o tipo fechar e não faz nada do que promete — e o bloco de
copy, sem o qual o teste não tipa. O RED continua real: **14 de 17 casos falhando**.

---

**Total de desvios:** 2 auto-fixes (funcionalidade crítica ausente), 1 desvio de escopo (o portão) e
1 desvio de forma.
**Impacto no plano:** nenhum scope creep e nenhum afrouxamento. Os dois auto-fixes **endurecem** as
asserções que o plano chama de mais frágeis da fase.

## Issues Encountered

- **Nada foi aplicado nem deployado.** Zero migration escrita, zero migration aplicada, zero MCP
  chamado por este executor. O plano é write-only por desenho.
- Nenhum `check:*` novo foi criado, então não há portão órfão a cabear no CI — `portoesInvocados`
  continua verde com os mesmos 7 casos.

## Verificação final

| Gate | Resultado |
|---|---|
| `npm run test:run` | **1861 passed / 184 files** (baseline da fase 1844 → **+17**) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada — sem regressão) |
| `<verify>` da Task 2 (suíte da feature + guard de arquivo) | **OK — 112/112 na feature; 2 links, 2 alvos táteis, zero posicionamento fixo** |
| `<verify>` da Task 3 | **não executado** — a Task 3 está atrás do portão |
| Os cinco `check:*` (`resend-dominio`, `export-allowlist`, `recibo-exclusao`, `matriz-retencao`, `pii-inventory-md`) | **exit 0 nos cinco** |
| `portoesInvocados.test.ts` | **verde — 7/7** |
| Dependência npm nova | **0** |
| `--no-verify` | **0 usos** — o hook rodou e passou nos commits |
| Migration escrita ou aplicada | **0**. Nada deployado |
| Rodapé montado em navegação de produção | **0 superfícies** — por desenho |

## Known Stubs

**Nenhum stub.** O componente é completo: não há campo por preencher, nenhuma seção espera por dado e
nenhum caminho renderiza espaço reservado.

Há **um bloqueio declarado**, que é coisa diferente de um stub:

| Item | Onde | Estado |
|---|---|---|
| Revisão do Encarregado (portão de PUBLICAÇÃO) | 47-08-PLAN.md Task 1 · 47-CONTEXT §Área 5 | **ABERTO** — quatro itens, nenhum satisfeito por este executor |
| Montagem do rodapé nas cinco superfícies | 47-08-PLAN.md Task 3 | **NÃO EXECUTADA** — bloqueada pelo item acima |

## Threat Flags

Nenhuma superfície de segurança nova. O componente não lê dado em runtime, não tem estado, não faz
consulta e não expõe identificador interno nenhum. Os mitigadores do `<threat_model>` do plano ficam
assim:

| Ameaça | Estado |
|---|---|
| T-47-08-01 (páginas publicadas sem revisão) | **mitigado pelo não-fazer** — o portão está aberto e nada foi publicado |
| T-47-08-02 (páginas existentes e inalcançáveis) | **pendente por desenho** — o remédio existe e aguarda o portão |
| T-47-08-03 (alvo tátil abaixo do piso) | **mitigado** — asserção por link no DOM, com a caixa, mais a contagem na fonte |
| T-47-08-04 (refatoração das páginas de conversão) | **não aplicável ainda** — nenhuma das três foi tocada; o guard está escrito no plano |
| T-47-08-05 (rodapé institucional) | **mitigado** — proibições no docblock, asseridas no DOM e na fonte |
| T-47-08-06 (rodapé grudado comendo dobra) | **mitigado** — asserido nas classes e na fonte |
| T-47-08-SC (instalação npm) | **mitigado** — zero dependência nova |

## User Setup Required

**Sim, e é o portão desta entrega.** A revisão do Encarregado precisa acontecer antes de qualquer
navegação de produção apontar para as duas páginas. Os quatro itens estão em
§"O que o Encarregado precisa revisar", acima.

Para revisar, subir a aplicação (`npm run dev`, porta 3003) e abrir as duas rotas **em aba anônima**,
para confirmar que nenhuma sessão é exigida:

- `http://localhost:3003/privacidade`
- `http://localhost:3003/subprocessadores`

## Next Phase Readiness

- **A Task 3 está pronta para correr no instante em que o portão fechar.** Ela é mecânica: o
  componente existe e é exportado, o guard automático está escrito no plano, e a regra de
  não-regressão é executável (zero linha removida nas três páginas de conversão).
- **47-09 (CONSOL-04)** não depende deste plano e não foi afetado.
- **Manutenção:** um terceiro link acrescentado ao rodapé fica **vermelho** no caso (1); um link novo
  sem o piso de alvo tátil fica vermelho nos casos (6) e (7); qualquer item da lista institucional
  fica vermelho nos casos (8) a (10).

## Self-Check: PASSED

Os 2 arquivos declarados como criados e os 2 modificados existem em disco; os 2 commits de tarefa
existem em `git log`. A suíte, o `tsc`, os cinco `check:*`, o `portoesInvocados` e o guard automático
da Task 2 foram **executados**, não lidos. Confirmado por execução que `RodapePublico` **não** aparece
em `LandingPage.tsx`, `VagasPublicasPage.tsx`, `VagaDetalhePage.tsx`, `SubprocessadoresPage.tsx`,
`PrivacidadePublicaPage.tsx` nem em `routes.tsx`.

---
*Phase: 47-transpar-ncia-consolida-o*
*Parado no portão de publicação: 2026-08-11*
