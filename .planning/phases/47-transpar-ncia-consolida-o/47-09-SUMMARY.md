---
phase: 47-transpar-ncia-consolida-o
plan: 09
subsystem: testing
tags: [compliance, lgpd, consol-04, transp-01, portao, vitest, promessa-orfa, subprocessadores]

requires:
  - phase: 47-transpar-ncia-consolida-o
    provides: "47-01 — os quatro portoes check:* invocados no job unit do ci.yml, que sao o executor das promessas de docblock dos geradores"
  - phase: 47-transpar-ncia-consolida-o
    provides: "47-03 — o COMMENT ON TABLE corrigido (a promessa orfa canonica, aplicada em PROD em 2026-08-10) e a migration do CONSENT-05"
  - phase: 47-transpar-ncia-consolida-o
    provides: "47-04 — SUBPROCESSADORES, a lista publicada que e o lado esperado da comparacao de destinos"
  - phase: 47-transpar-ncia-consolida-o
    provides: "47-08 — o rodape, ultima copy nova da fase; rodar antes deixaria o registro vermelho por desenho no meio da fase"
  - phase: 43-consentimentos-honestos-pol-tica-de-reten-o
    provides: "copyPortoesLgpd.test.ts — o molde e os quatro idiomas dele"
provides:
  - "src/__tests__/promessasComExecutor.test.ts — o registro curado de seis promessas com as tres disposicoes + a varredura mecanica sobre comentarios de catalogo (13 casos)"
  - "src/__tests__/destinosDeRedeComFicha.test.ts — a varredura de destinos de rede confrontada com a lista publicada, com assercao relacional (9 casos)"
  - "o achado de que a lista publicada de empresas contratadas nao cobre dois destinos vivos, registrado como pendencia com fato medido e rota"
affects: [46-purga-automatica, publicacao-das-duas-rotas-publicas]

actuals:
  tokens: 15045
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Registro curado + varredura mecanica: o registro cobre promessa em copy e em documento (que nenhuma varredura reconhece sem adivinhar), e a varredura impede o registro de apodrecer pelo lado mecanicamente decidivel"
    - "Disposicao de deferimento com fase dona conferida contra o roadmap: a entrada vira vermelha SOZINHA quando a fase dona fechar sem cumprir"
    - "Prova de deteccao com entrada sintetica em arvore temporaria, nas duas direcoes: o portao detecta o fabricado E nao acusa o correto"
    - "Predicado com o texto-fonte PARAMETRIZADO (roadmap, diretorio) para que o ramo inalcancavel sobre o repositorio real fique alcancavel na prova"
    - "Pendencia registrada com FATO MEDIDO + ROTA em vez de veredito, travada nos dois sentidos: ganhou ficha reprova, perdeu objeto reprova"

key-files:
  created:
    - src/__tests__/promessasComExecutor.test.ts
    - src/__tests__/destinosDeRedeComFicha.test.ts
  modified: []

key-decisions:
  - "A varredura mecanica usa a forma QUALIFICADA pelo esquema proprio: a forma nao-qualificada devolve 60+ nomes sobre este repositorio, quase todos palavra reservada ou funcao interna do Postgres"
  - "A superficie de CRIACAO inclui `docs/sql/sql/` alem das migrations — sem ela, tres objetos que existem (`usuarios_rh`, `candidatos`, `log_auditoria`) seriam acusados de orfaos"
  - "`ultimaDefinicaoDeFuncao` le a ETIQUETA de aspas-cifrao em vez de assumir `$$` — a versao que assumia reprovou um executor que existe e esta correto"
  - "A comparacao de destinos e de MAO UNICA: destino encontrado exige ficha, mas ficha nao exige destino literal — infraestrutura e hospedagem chegam por variavel de ambiente"
  - "Os dois destinos sem ficha entram como `pendente-de-decisao` com fato medido e rota, NUNCA com veredito: classificar destino como empresa contratada e ato do Encarregado, e o portao de publicacao do 47-08 esta aberto"
  - "Arquivos de teste ficam FORA da varredura de destinos: as fixtures deste repositorio contem hosts hostis de proposito, e elas sao a prova de que aquele destino e RECUSADO"

patterns-established:
  - "Portao auto-referente que nao vira sua propria violacao: literal sensivel montado por juncao, e uma assercao explicita de que o proprio arquivo esta fora do escopo varrido"
  - "Removedor de comentario que nao come URL — a guarda `[^:]` antes das duas barras, sem a qual a varredura fica verde por cegueira"

requirements-completed: [CONSOL-04]

coverage:
  - id: D1
    description: "Cada uma das seis promessas iniciais tem executor provado por leitura de arquivo, e a falha nomeia a promessa, o local e o executor esperado"
    requirement: CONSOL-04
    verification:
      - kind: unit
        ref: "src/__tests__/promessasComExecutor.test.ts — os seis casos gerados pelo laco sobre REGISTRO"
        status: pass
    human_judgment: false
  - id: D2
    description: "As tres disposicoes existem e estao exercitadas; o deferimento e conferido contra o roadmap e reprova com fase inexistente ou ja concluida"
    requirement: CONSOL-04
    verification:
      - kind: unit
        ref: "promessasComExecutor.test.ts — «fase inexistente e fase ja concluida REPROVAM» + «as tres disposicoes existem»"
        status: pass
    human_judgment: false
  - id: D3
    description: "A varredura mecanica cobre referencias de funcao em comentario de catalogo, esta verde sobre o repositorio real, e DETECTA — provado com promessa fabricada em arvore temporaria"
    requirement: CONSOL-04
    verification:
      - kind: unit
        ref: "promessasComExecutor.test.ts — «zero promessas orfas» + «a varredura DETECTA» + «NAO reprova o correto» + «mencao em comentario nao conta»"
        status: pass
    human_judgment: false
  - id: D4
    description: "Todo destino de rede declarado no codigo tem ficha publicada ou decisao registrada com razao escrita; a assercao e relacional, jamais de contagem"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/__tests__/destinosDeRedeComFicha.test.ts — «nenhum destino externo sem ficha e sem decisao» + «a lista publicada e mesmo o lado esperado» + «nenhuma razao vazia»"
        status: pass
      - kind: other
        ref: "guard automatico da Task 2 (node) — zero assercao de contagem fixa, arvore temporaria presente"
        status: pass
    human_judgment: false
  - id: D5
    description: "O relatorio nomeia caminho e destino e nunca imprime o trecho bruto que possa carregar segredo"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "destinosDeRedeComFicha.test.ts — «o relatorio nomeia caminho e destino, e NUNCA imprime o trecho bruto», com segredo fabricado colado na mesma linha"
        status: pass
    human_judgment: false
  - id: D6
    description: "A classificacao dos dois destinos sem ficha (o servico de IP e o quadro de video embutido)"
    requirement: TRANSP-01
    verification:
      - kind: other
        ref: "registrado como `pendente-de-decisao` com fato medido e rota; travado nos dois sentidos por «cada pendencia tem fato medido e rota, ainda existe no codigo, e ainda nao tem ficha»"
        status: deferred
    human_judgment: true
    rationale: "Classificar um destino como empresa contratada que trata dado de candidato e ato do Encarregado, e o portao de publicacao que o 47-08 deixou aberto e exatamente onde essa decisao pertence. O teste registra a MEDICAO e a ROTA; ele nao profere o veredito, e nao ficou verde por fingir que o achado nao existe."

duration: 15min
completed: 2026-08-11
status: complete
---

# Phase 47 Plan 09: O checklist "zumbi de compliance" em forma executável

**Nenhuma promessa de retenção ou exclusão sobrevive neste repositório sem código que a execute — e isso deixou de ser uma afirmação para virar dois testes que reprovam NOMEANDO a promessa que perdeu o executor e o fornecedor que entrou sem ficha. A fase que veio remover teatro de compliance fecha com o detector que impede o próximo.**

## Performance

- **Duração:** ~15 min
- **Iniciado:** 2026-08-11T03:59Z
- **Concluído:** 2026-08-11T04:15Z
- **Tarefas:** 2 (ambas TDD, RED→GREEN)
- **Arquivos criados:** 2

## Accomplishments

- **O CONSOL-04 virou observável.** O registro tem as seis promessas iniciais, cada uma com
  promessa, local, executor esperado, disposição e uma prova que lê o disco. Cada linha é um caso
  de teste, e a falha reporta os quatro campos — um portão que diz apenas "uma promessa falhou"
  transfere para quem executa o trabalho que ele existe para fazer.
- **As três disposições estão exercitadas, e o deferimento tem prazo.** A promessa de retenção do
  ledger de notificações é a única cujo executor legitimamente ainda não existe; ela nomeia a fase
  dona, e a prova confere no roadmap que essa fase **existe e ainda não fechou**. No dia em que a
  fase da purga fechar sem cumprir, esta entrada fica vermelha **sozinha** — que é a diferença
  entre um deferimento e uma promessa órfã com etiqueta melhor.
- **A varredura mecânica está verde sobre o repositório real e PROVA que detecta.** Ela encontra
  toda função do esquema próprio nomeada em forma de chamada dentro de comentário de catálogo e
  exige criador ou registro. Três casos sintéticos em árvore temporária provam as três
  propriedades que importam: ela acha o fabricado, ela **não** acusa o correto, e **menção em
  comentário não conta como criação**.
- **A lista pública de empresas contratadas deixou de poder ficar incompleta em silêncio.** Todo
  destino de rede declarado no código tem ficha publicada ou decisão registrada com razão escrita.
  A asserção é **relacional**: nenhuma contagem de empresas aparece em nenhuma asserção.
- **E o teste produziu um achado na primeira execução** — dois destinos vivos que a lista publicada
  não cobre. Ver a seção seguinte, que é a parte substantiva deste plano.

## ⚠ O ACHADO: dois destinos vivos fora da lista publicada

A varredura sobre o repositório real encontrou **quinze destinos**. Quatro casam com fichas
publicadas (o provedor de IA primário, o de reserva, o serviço de CEP e o de e-mail). Nove são
legitimamente não-fornecedores e estão registrados com razão escrita. **Dois não são nenhum dos
dois:**

| destino | onde | o fato medido |
|---|---|---|
| `api.ipify.org` | `src/services/logAccessService.ts:110` | o navegador de quem usa o sistema requisita este endereço para descobrir o próprio IP, que o sistema então grava no registro de acesso. O terceiro recebe o endereço de origem da pessoa. Caminho vivo: `useSessionTimeout` chama `logAccessEvent`. |
| `www.youtube.com` | `src/components/pages/InstrucoesFormularioPage.tsx:77` | a página de instruções embute um quadro de vídeo de terceiro. O navegador de quem abre a página requisita o conteúdo direto do terceiro, que recebe o endereço de origem e a página de referência. |

**Os dois são estruturalmente idênticos ao serviço público de consulta de endereço** — que a lista
publicada DECIDIU incluir, com o critério escrito na própria fonte dela: *a chamada é disparada
pela página desta empresa, com dado que a pessoa digitou aqui, e o endereço de origem do navegador
dela vai junto; é tratamento causado por este sistema, ainda que o pacote não passe pelos
servidores da empresa.*

Aplicar esse critério e concluir "logo, faltam duas fichas" é a conclusão provável. **E ainda assim
este plano não a registrou como decisão.** Três razões, e nenhuma é timidez:

1. **Classificar um destino como empresa contratada que trata dado de candidato é ato do
   Encarregado**, e o portão de publicação desta fase está **ABERTO** — o 47-08 entregou o rodapé
   e deliberadamente **não o montou** por essa mesma razão. Escrever aqui um veredito que ninguém
   proferiu fabricaria exatamente a classe de afirmação que esta fase inteira existe para eliminar:
   conformidade declarada sem quem a tenha decidido.
2. **O `files_modified` deste plano são os dois arquivos de teste.** Acrescentar ficha exige editar
   `subprocessadores.ts` **e** medir o país na conta do provedor — o campo cujo tipo diz "fato
   MEDIDO, nunca presumido", e cuja regra a própria 47-04 provou valer quando um indício plausível
   apontou para o país errado.
3. **Deixar o teste vermelho não é uma opção honesta aqui.** Ele reprovaria sobre um achado que
   depende de decisão humana, no fim de uma fase que precisa fechar — e um portão que nasce
   vermelho por algo que quem executa não pode resolver é o portão que alguém desliga.

Então a entrada registra o **FATO MEDIDO** e a **ROTA**, e é **travada nos dois sentidos** para não
virar a etiqueta melhor de uma omissão:

- uma pendência que **ganhou ficha** reprova — ela tem de sair do registro;
- uma pendência cujo destino **sumiu do código** reprova — ela perdeu o objeto;
- uma pendência **sem fato medido ou sem rota** reprova;
- e um destino novo **não entra sozinho**: entrar exige editar uma constante versionada com todos
  os campos, que é o mesmo custo de acrescentar uma ficha.

**O que isto NÃO afirma:** que os dois destinos estão em conformidade. Afirma que eles foram
medidos, nomeados e roteados — em vez de omitidos em silêncio, que é o defeito que o TRANSP-01
existe para impedir.

## Task Commits

Cada tarefa foi commitada atomicamente, com o hook de pre-commit rodando — **zero `--no-verify`**.

1. **Task 1 (tracer, TDD): o registro curado + a varredura mecânica**
   - `03852ca` (test) — RED: 10/13 falhando, o contrato escrito antes da maquinaria
   - `7ebd490` (feat) — GREEN: 13/13, as quatro medições do disco implementadas
2. **Task 2 (TDD): a lista pública confrontada com os destinos de rede**
   - `532822b` (test) — RED: 8/9 falhando, o contrato do backstop antes da varredura
   - `e2718cd` (feat) — GREEN: 9/9, a varredura e o achado das duas pendências

## Files Created

- **`src/__tests__/promessasComExecutor.test.ts`** (13 casos). Docblock registrando por que é um
  teste e não um documento, as duas metades, e a lição do molde. `REGISTRO` com as seis promessas;
  três disposições (`executor-vivo`, `superada`, `deferida`); `varrerPromessasOrfas` sobre corpos de
  `COMMENT ON`; quatro medições do disco; três provas de detecção; auto-consistência.
- **`src/__tests__/destinosDeRedeComFicha.test.ts`** (9 casos). Varredura de `src/` e das funções
  de borda, fora de comentário e fora de arquivo de teste; normalização para host ou nome de
  pacote; `DECISOES` versionadas com razão escrita em duas disposições; travas da pendência;
  quatro provas de detecção, incluindo a de que o relatório nunca imprime o trecho bruto.

## O que cada entrada do registro mede

| # | promessa | disposição | o que a prova lê |
|---|---|---|---|
| 1 | o comentário de catálogo que prometia uma função de exclusão de titular deferida à Phase 15 — **a promessa órfã canônica** | **superada** | a migration de 47-03 existe **e** não reintroduz o nome **e** a função continua ausente **e** o artefato histórico ainda carrega a promessa (senão a entrada perdeu o objeto) |
| 2 | «a alteração fica registrada na trilha de auditoria» (diálogo de janela de retenção) | executor-vivo | a copy ainda existe **e** a **última** definição da função que salva a janela audita na trilha canônica |
| 3 | «esta ação é registrada na trilha de auditoria» (diálogo de reativação de prompt) | executor-vivo | idem, sobre a RPC de reativação — a auditoria acrescentada em 47-03 |
| 4 | cada gerador afirma, no cabeçalho que emite, que a conferência reprova qualquer divergência | executor-vivo | para cada gerador que afirma: existe script `check:` que o executa **e** ele é **invocado no fluxo de integração contínua**, com os comentários do workflow removidos antes da busca |
| 5 | o comentário da coluna de análise de vídeo endereçava a decisão a esta fase | executor-vivo | o comentário da P43 ainda endereça a decisão **e** a migration de 47-03 remove valor padrão **e** obrigatoriedade |
| 6 | o ledger de notificações declara retenção indefinida, com a purga deferida a este milestone | **deferida** | a declaração ainda está no comentário **e** a fase dona existe no roadmap **e** não está concluída |

A entrada **nº 4 é a que fecha o laço da fase**: um gerador que se declara autoridade em docblock
só tem executor se algum portão o invoca. É o defeito que o TRANSP-02 ia repetir e que o 47-01
consertou; agora ele tem detector.

## Decisions Made

- **A varredura mecânica usa a forma QUALIFICADA pelo esquema próprio.** Medido antes de escrever:
  a forma não-qualificada devolve **mais de sessenta** nomes sobre este repositório — `select`,
  `insert`, `now`, `coalesce`, `pg_get_functiondef`, métodos de cliente — e um portão que precisa
  de lista de exceções desse tamanho reprova o inocente na primeira função interna nova. A forma
  qualificada devolve **sete**, todas do projeto.
- **A superfície de CRIAÇÃO inclui `docs/sql/sql/`, não só as migrations.** Sem ela,
  `usuarios_rh`, `candidatos` e `log_auditoria` — objetos que existem, criados no esquema-base
  anterior à adoção de migrations — seriam acusados de órfãos. É o mesmo precedente que o 47-03
  usou para verificar a assinatura da função de auditoria.
- **A comparação de destinos é de MÃO ÚNICA.** Destino encontrado ⟹ ficha ou decisão; nunca o
  inverso. Exigir o inverso reprovaria as duas fichas mais verdadeiras da lista: o provedor de
  infraestrutura e o de hospedagem chegam por variável de ambiente e por configuração de
  plataforma, e nunca aparecem como literal.
- **Arquivo de teste fica FORA da varredura de destinos.** As fixtures deste repositório contêm
  hosts hostis de propósito (o guard de redirecionamento aberto, o guard de vazamento no pacote).
  Elas são o oposto de um destino: são a prova de que aquele destino é **recusado**.
- **O pino de versão sai do nome do pacote.** `openai@6.42.0` e `openai` são o mesmo fornecedor;
  manter o pino faria a decisão registrada apodrecer a cada atualização de versão.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ultimaDefinicaoDeFuncao` assumia `$$` e reprovou um executor CORRETO**

- **Encontrado durante:** Task 1 (GREEN — a entrada nº 3 ficou vermelha)
- **Problema:** a extração do corpo procurava `$$` literal. A RPC de reativação de prompt usa uma
  etiqueta de aspas-cifrão **nomeada** (`$fn_rollback$`). O executor existia, estava correto e
  auditando na trilha canônica desde 47-03 — e o portão o declarou **ausente**. É o falso positivo
  exato que treina quem executa a desligar o portão, produzido **dentro do arquivo que existe para
  não produzi-lo**.
- **Correção:** a etiqueta de abertura passa a ser **lida** (`/\$[A-Za-z_]\w*\$|\$\$/`) e o
  fechamento procura a mesma etiqueta.
- **Verificação:** 13/13 verdes; a entrada nº 3 passa medindo o corpo certo.
- **Commit:** `7ebd490`

**2. [Rule 1 - Bug] O removedor de comentário comia a URL — quinze destinos viraram zero**

- **Encontrado durante:** Task 2 (sonda, antes de escrever o arquivo)
- **Problema:** um removedor ingênuo de comentário de linha (`/\/\/.*$/`) casa com as **duas barras
  de `https://`** e apaga o resto da linha. A primeira sonda devolveu **zero** URLs sobre um
  repositório que fala com quatro fornecedores. O verde resultante afirmaria o oposto do fato — a
  pior falha possível para este arquivo, porque ela é indistinguível de "está tudo coberto".
- **Correção:** a guarda `(^|[^:])` antes das duas barras.
- **Verificação:** caso «URL em comentário e em arquivo de teste NÃO conta — e o removedor não come
  a URL», que assere as duas metades: o citado sai, o **vivo fica**. Sem a segunda metade a
  asserção passaria com o removedor cego.
- **Commit:** `e2718cd`

**3. [Rule 2 - Missing Critical] A disposição `pendente-de-decisao` e suas quatro travas**

- **Encontrado durante:** Task 2 (a varredura produziu o achado das duas pendências)
- **Problema:** o plano previa **duas** saídas por destino — ficha ou decisão registrada — e
  descrevia a lista de decisões como nascendo com destinos que "legitimamente **não** são empresas
  contratadas". Os dois achados não são isso: pelo critério já registrado no repositório eles
  provavelmente **são**. Registrá-los como "não é fornecedor" seria escrever um veredito que
  ninguém proferiu; deixá-los fora reprovaria a suíte sobre uma decisão humana pendente.
- **Correção:** terceira disposição que registra **fato medido + rota**, com quatro travas que a
  impedem de virar etiqueta de omissão (ganhou ficha reprova; perdeu objeto reprova; sem fato
  medido reprova; sem rota reprova).
- **Verificação:** caso «cada pendência tem fato medido e rota, ainda existe no código, e ainda não
  tem ficha».
- **Commit:** `e2718cd`

### Desvios de forma (documentados, não auto-fixes)

**4. O RED de cada tarefa é o CONTRATO sem a maquinaria, não uma implementação sabidamente
errada.** Os dois artefatos deste plano **são** testes, então o par RED/GREEN não pode ser
"teste vermelho → código que o satisfaz". A forma honesta é a de biblioteca: o RED carrega o
registro, as asserções e as provas de detecção, com as medições do disco declaradas e lançando
"não implementado" (10/13 e 8/9 vermelhos, medidos e commitados); o GREEN implementa as medições.
Fabricar um vermelho escrevendo uma implementação sabidamente má seria encenação, não TDD.

**5. Duas funções auxiliares nasceram no GREEN e não no RED** (`linhaDoIndice` e
`semComentarios`). O hook de pre-commit reprovou o RED por elevar a contagem de tipos para 98 —
elas só têm consumidor depois da implementação. **O hook mordeu e foi obedecido, não contornado:**
as funções foram movidas para o commit que as usa. Zero `--no-verify`.

**6. A varredura mecânica não casa com a grafia histórica exata da promessa canônica.** O
comentário de 2026-06-09 nomeia a função **entre parênteses**, sem forma de chamada — a forma
mecanicamente decidível não a alcança. O plano previa isso ao dizer "a promessa órfã canônica
**generalizada**": a Metade 2 detecta a **classe** do defeito, e a canônica é coberta nominalmente
pela **entrada nº 1** da Metade 1, com prova quádrupla. É precisamente por isso que o plano exige
as duas metades e diz que nenhuma sozinha resolve.

---

**Total de desvios:** 3 auto-fixes (2 bugs, 1 funcionalidade crítica ausente) + 3 desvios de forma
documentados.
**Impacto no plano:** nenhum scope creep. Os dois bugs eram falsos negativos/positivos **dentro do
detector**, achados pelas próprias provas de detecção que o plano exigia; o terceiro auto-fix é o
que impediu este plano de fabricar uma decisão do Encarregado.

## Issues Encountered

- **Nada foi aplicado nem deployado.** Zero migration escrita, zero migration aplicada, zero
  `supabase db push`, zero MCP chamado. Apenas os dois arquivos de teste declarados em
  `files_modified`.
- **`RodapePublico` continua desmontado.** A Task 3 do 47-08 é o ato de publicação e o portão do
  Encarregado segue aberto; este plano não montou nada.
- **Zero dependência npm nova.** Os dois testes usam apenas o executor de testes e as bibliotecas
  de sistema de arquivos, sistema operacional e caminho já presentes.

## Verificação final

| Gate | Resultado |
|---|---|
| `npm run test:run` | **1883 passed / 186 files** (baseline 1861 + 22 novos — 13 + 9) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada 97 — sem regressão) |
| `npx vitest run src/__tests__/promessasComExecutor.test.ts` | **13/13** |
| `npx vitest run src/__tests__/destinosDeRedeComFicha.test.ts` | **9/9** |
| Guard automático da Task 1 (node) | **OK — 8 casos** |
| Guard automático da Task 2 (node) | **OK — 10 casos** |
| `npm run -s check:export-allowlist` | exit 0 |
| `npm run -s check:recibo-exclusao` | exit 0 |
| `npm run -s check:matriz-retencao` | exit 0 |
| `npm run -s check:pii-inventory-md` | exit 0 |
| `npm run -s check:resend-dominio` | exit 0 |
| `docs/compliance/__tests__/portoesInvocados.test.ts` | **7/7** |
| `--no-verify` | **0 usos** — o hook rodou e passou nos 4 commits |
| Migrations escritas / aplicadas | **0 / 0** |

## Known Stubs

Nenhum stub de código. **Uma pendência declarada, e ela é de decisão humana, não de
implementação:** a classificação de `api.ipify.org` e `www.youtube.com` como empresas contratadas
ou não. Registrada em `DECISOES` com fato medido e rota, travada nos dois sentidos, e roteada ao
portão de publicação do Encarregado que o 47-08 deixou aberto. Ver a seção "⚠ O ACHADO".

## Threat Flags

Nenhuma superfície de segurança nova — os dois artefatos são testes que leem arquivos do
repositório e escrevem apenas em árvore temporária. Duas ameaças do registro deste plano ficam
**provadas por caso**, não por intenção:

- **T-47-09-06** (teste imprimindo trecho bruto que contenha segredo): provado com um segredo
  fabricado colado na mesma linha do destino, exigindo que o relatório **não** o contenha.
- **T-47-09-07** (portão passando por vacuidade): provado nos dois arquivos com entrada sintética
  em árvore temporária, nas duas direções.

Os dois destinos do achado são superfície **pré-existente**, medida e registrada por este plano —
não introduzida por ele.

## User Setup Required

Nenhuma. Nenhum serviço externo, nenhuma variável de ambiente, nenhuma dependência npm.

## Next Phase Readiness

- **Phase 46 (purga automática) herda um relógio.** A entrada nº 6 do registro defere a promessa de
  retenção do ledger de notificações **àquela fase**, e a prova lê o roadmap. Se a Phase 46 fechar
  sem cumprir, esta suíte fica vermelha **sozinha**, nomeando a promessa — sem que ninguém precise
  lembrar.
- **O portão de publicação do Encarregado ganhou dois itens nomeados** para a mesma sessão em que
  ele revisa as citações de base legal e aprova a montagem do rodapé: a classificação dos dois
  destinos do achado.
- **Manutenção:** um fornecedor novo no código sem ficha e sem decisão reprova a suíte nomeando o
  destino e o arquivo, com as duas saídas impressas. Uma função nomeada em comentário de catálogo
  sem criador reprova nomeando a função e o arquivo.

## Self-Check: PASSED

Os 2 arquivos declarados existem em disco (`promessasComExecutor.test.ts`,
`destinosDeRedeComFicha.test.ts`) e os 4 commits existem em `git log` (`03852ca`, `7ebd490`,
`532822b`, `e2718cd`). Verificado por execução, não por leitura.

---
*Phase: 47-transpar-ncia-consolida-o*
*Completed: 2026-08-11*
