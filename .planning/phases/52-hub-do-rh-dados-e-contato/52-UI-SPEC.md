---
phase: 52
slug: hub-do-rh-dados-e-contato
status: approved
reviewed_at: 2026-10-10
shadcn_initialized: true
preset: existing project install (shadcn/ui + Radix; tokens em src/styles/globals.css; primitivos vendorizados em src/components/ui/ desde o M1; sem components.json)
created: 2026-10-10
persona: RH/Admin (hub `/rh/candidatos/:id`, desktop-first, sobrevive a 360px) + Candidato (telas de prova, painel, login, navbar — mobile-first)
mode: gerado por /gsd-ui-phase sem pergunta nova ao operador — todas as decisões de produto já estão no 52-CONTEXT.md (D-01..D-33); o resto é §Claude's Discretion, registrado em §Decisões tomadas nesta UI-SPEC
revision: 1 (2026-10-10) — Dimensão 4 (BLOCK) resolvida: título de seção 24px fixo, contrato = {14, 16, 24, 48}, escopo da contagem declarado com herança medida; recomendações não-bloqueantes de copy e spacing aplicadas (D-52-U22..U24)
---

# Phase 52 — UI Design Contract

> Contrato visual e de interação do **Hub do RH — Dados, Contato e Avaliações do Candidato**.
> Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Binding upstream:** `52-CONTEXT.md` (D-01..D-33, travadas), `DECISAO-2026-10-10-hub-rh-dados-e-contato.md`
(G-51-OP1 verbatim, fonte de cada dado), `ROADMAP.md` §Phase 52, `CLAUDE.md` (pt-BR; «avaliação
comportamental/cognitiva», nunca o termo clínico; RNF-07a), `51-UI-REVIEW.md` (achados R1–R4 e os WARNINGs
que esta fase fecha), 17-UI-SPEC (o contrato do hub: tokens, CTA dominante, estados vazios) e 47-UI-SPEC
(método, escala, paleta). **Reuse-first:** nenhum token novo, nenhuma escala nova, nenhuma dependência npm nova.

---

## Escopo desta UI-SPEC — o que tem superfície e o que não tem

Dos quatro blocos da D-33, **dois** têm superfície visual. A ausência dos outros está declarada para não
ser lida como esquecimento.

| Bloco (D-33) | Superfície | Natureza |
|---|---|---|
| **A — Telas sem banco** | Telas de prova do candidato (saída, «Tempo decorrido», Raven no shell), lista de avaliações (devolutiva reabrível), painel do candidato (D-27), navbar do candidato, login, «Agradecemos», `SelectItem`, entrevista do RH (BARS vazios, jargão, menu ativo), selo de proveniência (b), diálogo de revisão `humana_triagem` | **Emendas em telas existentes** |
| **B — Hub do RH** | `HubCandidatoRH.tsx`: cabeçalho de contato, 4 abas, cadastro, inscrição, Big Five, SJT MC, caso aberto | **Reestruturação de tela existente** (a maior superfície da fase) |
| **C — Banco SJT de pré-vendas** (JORN-52) | — | **Sem UI.** Migration de itens. A tela do SJT MC que o candidato vê já existe e não muda por causa do banco (o texto dos itens é aprovado pelo operador antes, fora deste contrato) |
| **D — Limpeza** | — | **Sem UI.** Comando destrutivo com portão próprio |

### O que esta fase deliberadamente NÃO faz

- **Nenhuma ordenação, filtro ou destaque por Big Five** em tela nenhuma (RNF-07a, D-02). O hub mostra; nada compara.
- **Nenhuma mudança no card da lista do RH** (`CandidatosRHPage` / Kanban): continua «Concluído / Não fez» (D-05).
- **Nenhum percentil numérico** em tela do RH (UX-07, D-02, D-04) — nem no DOM, nem no tipo que alimenta o componente.
- **Nenhum registro do clique de contato** (D-15). Nenhum toast «contato registrado».
- **Nenhum rascunho novo** no SJT MC e no Raven (D-24; rascunho é ideia adiada).
- **Nenhum `beforeunload`/bloqueio do botão voltar do navegador** nas provas — a D-24 trata o botão da tela, não o do navegador.
- **Nenhuma mudança visual na Decisão Final**: `RespostaCasoAbertoSjt` segue âmbar dentro do aviso do sinal (C-7 da 51).

---

## Invariantes não-negociáveis desta fase

Precedem qualquer escolha estética. Um plano que os viole está errado mesmo que fique bonito.

1. **Percentil nunca chega ao componente do RH.** O tipo que alimenta o Big Five do hub **não tem** o campo
   `percentil` (nem em `dashboard[]`, nem em `paginas[]`). Não basta «não renderizar»: o que não está no tipo
   não pode vazar numa edição futura. A leitura do RH devolve faixa + texto, nunca o dígito.
2. **A faixa que o RH vê é a que o candidato viu** (D-04): sai de `devolutivas_candidato.conteudo_jsonb.cabecalho.dashboard[].banda`.
   Medido: a EF `gerar-devolutiva-bigfive` **recalcula** a banda a partir do percentil (`bandOf`, `index.ts:495`),
   então `scores_candidato.metadata.dimensoes[].banda` **não é** garantidamente a mesma. Sem devolutiva, **não há
   faixa no hub** — nunca um fallback para outra fonte (ver D-52-U04).
3. **Nenhum gabarito na tela** (D-21): no SJT MC, a etiqueta/peso aparece **só na alternativa escolhida**. Nas
   respostas da inscrição, aparece só o que o candidato respondeu — **nunca** as outras opções nem qual opção é
   eliminatória (D-19).
4. **Contato de anonimizado ou fictício não existe.** Um e-mail no domínio `@invalido.local` (marcador do motor
   de exclusão, BD-9, e dos 6 fictícios das migrations `20260830000005`/`20260905000002`) **nunca** é mostrado
   nem vira `mailto:`. A tela diz «Sem contato disponível.» — **sem causa** (Invariante 9 da 45-UI-SPEC: o
   recrutador não pode inferir que o titular exerceu direito de exclusão).
5. **Texto do candidato é sempre nó de texto React.** Caso aberto com citações marcadas, respostas da inscrição
   com links, devolutiva: a montagem é por **segmentos** (`string` + `<mark>` / `<a>`), **nunca**
   `dangerouslySetInnerHTML`, nunca markdown em runtime.
6. **Link só para `http:`/`https:`** (D-20). Qualquer outro esquema (`javascript:`, `data:`, `mailto:` digitado
   pelo candidato) renderiza como texto. Todo link externo: `target="_blank" rel="noopener noreferrer"`.
7. **Botão que some explica por quê** (precedente `hub-acoes-encerrada`, `HubCandidatoRH.tsx:337-343`): o
   WhatsApp escondido por número inválido deixa uma linha dizendo isso.
8. **O rótulo diz para onde o botão vai** (convenção D-25/D-37 da 51, guardada por
   `rotulos-navegacao-candidato.grep.test.ts`): «Voltar às avaliações» → lista; «Ir ao painel» → painel.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (instalação existente — **NÃO** re-inicializada; não há `components.json` na raiz; primitivos vendorizados em `src/components/ui/`) |
| Preset | projeto já cabeado; tokens em `src/styles/globals.css`, glass em `src/components/ui/glass.tsx` |
| Component library | Radix (via shadcn/ui), imports com versão embutida resolvidos por `resolve.alias` no `vite.config.ts` |
| Icon library | lucide-react@0.487.0 |
| Font | Helvetica Neue, Helvetica, Arial, sans-serif (`--font-family`, `globals.css:75`) |

**Gate do shadcn — decisão registrada (idêntica às Phases 7–17 e 42–47):** `components.json` ausente e
`npx shadcn init` **deliberadamente não executado** — o init reescreveria os primitivos vendorizados e quebraria
o `resolve.alias` das versões embutidas (`@radix-ui/react-tabs@1.1.3` → `@radix-ui/react-tabs`). É o estado
travado do projeto, não lacuna. Nenhum `npx shadcn add` nesta fase.

**Shells (herdadas, não inventadas):**
- **RH:** `RHLayout` (`BackgroundImage background="darkBlue"` + sidebar + topbar) → seções em
  `Glass variant="dark" blur="lg" className="rounded-xl p-6"` (o `HubSection`).
- **Candidato:** `BackgroundImage background="gradient" overlayColor="bg-black" overlayOpacity={15}` →
  `container mx-auto px-4` → `GlassPanel variant="white" blur="xl"` (o `ScreenShell` do SJT MC,
  `SjtMultiplaEscolhaScreen.tsx:313-326`). **O Raven passa a usar esta shell** (51-UI-REVIEW, Pilar 2).

### Âncora visual primária (uma por tela — declarada, não inferida)

- **Hub, cabeçalho:** o **nome do candidato** (48px, inalterado). O contato é subordinado a ele.
- **Hub, aba Resumo:** o **CTA dominante «Próximo passo»** (turquesa sólido, inalterado — D-06 da 17).
- **Hub, aba Cadastro e inscrição:** nenhuma âncora de ação — é leitura. A primeira seção («Dados do cadastro») abre o fluxo.
- **Hub, aba Avaliações:** a seção «Avaliação assíncrona». O Big Five **não** é a âncora (é contextual, não-eliminatório).
- **Raven:** a **matriz** do item. O CTA «Próximo item» é a ação dominante (accent sólido).

---

## Component Inventory

Enumerated by `ls src/components/ui/*.tsx | wc -l` — 49 componentes — `src/components/ui` vendorizado (shadcn/ui sobre Radix; versões resolvidas por `cat node_modules/@radix-ui/<pkg>/package.json`: react-tabs@1.1.13, react-alert-dialog@1.1.15, react-radio-group@1.3.8, react-toggle-group@1.1.11) — 2026-10-10.

Lista **não exaustiva**: o executor pode usar qualquer primitivo de `src/components/ui/` ou componente do
projeto; conferir um fora da tabela é o caminho esperado, não exceção.

### Primitivos em escopo

| Component | Import path | Notes |
|-----------|-------------|-------|
| `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` | `@/components/ui/tabs` | As 4 abas do hub. Classes do gatilho copiadas **verbatim** de `EntrevistaWorkspace.tsx:168` (o precedente RH) |
| `AlertDialog` (+ `Action`/`Cancel`/`Content`/`Header`/`Title`/`Description`/`Footer`) | `@/components/ui/alert-dialog` | Confirmação de perda no SJT MC e no Raven (D-24). Mesmo molde do «Enviar avaliação?» (`SjtMultiplaEscolhaScreen.tsx:269-286`) |
| `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` | `@/components/ui/card` | Cards do SJT MC, caso aberto e Big Five dentro da aba Avaliações (molde de `ScorecardAvaliacao`) |
| `Badge` | `@/components/ui/badge` | Selo «Eliminatória», etiqueta da alternativa escolhida, «Contextual · não-eliminatório» |
| `Skeleton` | `@/components/ui/skeleton` | Carregando do contato e das seções novas (`bg-white/5`) |
| `Glass` / `GlassCard` / `GlassPanel` / `GlassButton` | `@/components/ui/glass` | Superfícies das duas personas |
| `AsyncState` (via `HubSection`) | `@/components/ui/AsyncState` | Carregando/erro das seções novas do hub — **sempre pelo `HubSection`**, nunca montado à parte |
| `Select` (`SelectItem`) | `@/components/ui/select` | **Conserto R1** em `select.tsx:132-136` (§Color) |
| `Slider` | `@/components/ui/slider` | **Sai** do `EntrevistaScorecardInline` (D-52-U12). Continua no projeto para os outros consumidores |

### Componentes do projeto reusados (não re-autorar)

| Componente / módulo | Papel nesta fase |
|---|---|
| `HubSection` (`features/hub-candidato/components/`) | Wrapper de toda seção nova do hub (título **24px fixo** — a fase troca `text-xl md:text-2xl` por `text-2xl` em `HubSection.tsx:93`, §Typography; carregando/erro/vazio) |
| `HistoricoBlock`, `AnaliseIABlock`, `CvButton`, `AgendamentoBlock`, `LiberacaoCognitivoBlock` | Mudam **de lugar** (para dentro das abas), não de conteúdo |
| `DIM_LABEL`, `DIM_ORDER`, `BANDA_LABEL`, `BANDA_ORDER`, `BandaSegments`, `analogia` (hoje locais em `DevolutivaBigFiveView.tsx`) | **Extraídos para um módulo compartilhado** e importados pela devolutiva do candidato **e** pelo hub. Uma cópia divergiria na primeira edição — e a promessa da D-04 é «o mesmo desenho» |
| `COPY_BIG_FIVE_ESTADO.nao_fez` («Big Five — Não fez») | Continua sendo o título do card quando não há linha `big_five` |
| `ROTULO_BLOCO` + `groupByBloco` (hoje locais em `FormularioCandidaturaPage.tsx:66-115`) | **Extraídos** e usados pelo hub para agrupar as respostas da inscrição **exatamente** como o formulário agrupou as perguntas |
| `MOTIVO_OPTIONS` (`RejeitarCandidaturaDialog.tsx:56-63`) | **Exportado** e usado pelo diálogo de revisão para rotular o motivo. Um segundo mapa chamaria o mesmo motivo por dois nomes |
| `COPY_AVALIACOES_RESPONDIDAS.contagem` | A frase «N avaliações respondidas», **uma vez só** no hub (defeito c) |
| `RespostaCasoAbertoConteudo` | Ganha uma variante de apresentação para o hub (D-22); a Decisão Final segue com a âmbar |
| `textoProveniencia` / `PROVENIENCIA_IA_COPY` | Conserto (b) — muda **aqui**, e por isso muda na tela e no PDF juntos |
| `SugestaoIABadge` | Continua só nos blocos que são sugestão de decisão (caso aberto, competências da entrevista). **Não** entra no Big Five (D-52-U06) |

### Componentes novos (nomes sugeridos — o planejador pode renomear, não fundir)

| Componente | Onde | Papel |
|---|---|---|
| `ContatoCandidatoHeader` | `features/hub-candidato/components/` | E-mail + «Enviar e-mail», celular + «Chamar no WhatsApp», estados de carregando/erro/sem contato |
| `DadosCadastroBloco` | idem | A ficha do cadastro (D-08/D-09) |
| `RespostasInscricaoBloco` | idem | Respostas na ordem do formulário, selo «Eliminatória» (D-19/D-20) |
| `BigFiveResultadoHub` | `features/avaliacao/components/` | Substitui `BigFiveEstado` **no hub**: faixas + aviso fixo + «Ver devolutiva» (D-04/D-06/D-07) |
| `SjtMcDetalhe` | idem | Substitui a lista «Item N · tag · peso» do `McBreakdown`: pergunta, todas as alternativas, a escolhida destacada (D-21) |
| `TextoComCitacoes` | idem | O texto do caso aberto com as citações marcadas por segmentos (D-22, Invariante 5) |
| `SairDaProvaButton` | `features/avaliacao/components/` | O botão de saída durante a prova, com e sem confirmação (D-24). **Um** componente para as 6 telas |
| Helpers puros: `normalizarCelularWhatsApp`, `montarLinkWhatsApp`, `montarMailto`, `formatarCpf`, `formatarCep`, `formatarCelular`, `idadeEm` | `features/hub-candidato/lib/` | Testáveis sem DOM; a regra do WhatsApp mora num lugar só |

---

## Spacing Scale

Escala estabelecida (múltiplos de 4), idêntica às UI-SPECs 17 e 42–47. **Nenhum valor novo.**

| Token | Value | Usage nesta fase |
|-------|-------|------------------|
| xs | 4px | Rótulo↔valor dentro de um campo da ficha (`space-y-1`); margem do `<mark>` do caso aberto (`px-1`) |
| sm | 8px | Ícone↔texto nos botões novos (`gap-2`; os botões existentes do hub com `gap-1.5` não são tocados); gap entre gatilhos das abas (`gap-2`); entre alternativas do SJT MC (`space-y-2`); entre os 5 botões de nota da entrevista (`gap-2`) |
| md | 16px | Gap do grid da ficha do cadastro (`gap-4`); padding das fichas/cards internos (`p-4`); gap da linha de contato (`gap-4`) |
| lg | 24px | Padding das seções do hub (`p-6`, herdado do `HubSection`); ritmo vertical entre seções dentro de uma aba (`space-y-6`, herdado do hub) |
| xl | 32px | Não usado nesta fase — o cabeçalho e a lista de abas seguem o `space-y-6` (24px) do hub |
| 2xl | 48px | Não usado |
| 3xl | 64px | Não usado (as shells do candidato já trazem `py-20`, herdado) |

**Exceções (todas múltiplos de 4, todas com precedente):**
- `min-h-[44px]` em **todo** controle acionável novo: gatilhos das abas, «Enviar e-mail», «Chamar no WhatsApp»,
  «Ver devolutiva»/«Ocultar devolutiva», «Recarregar contato», «Recarregar devolutiva», «Recarregar situações»,
  o botão de saída das provas, «Ver devolutiva» do candidato, os 5 botões de nota da entrevista
  (`min-h-[44px] min-w-[44px]`), «Meu painel». Um link de texto corrido dentro de uma resposta **não** é controle
  isolado e fica isento (é texto que contém link). **Isto é altura mínima de alvo de toque, não token de
  espaçamento:** 44px é o piso de alvo tátil (WCAG 2.5.5 / Apple HIG, o mesmo `min-h-11` do «Voltar aos
  candidatos», `HubCandidatoRH.tsx:237`); não vale como gap, padding nem margem em lugar nenhum.
- `p-3` (12px = 4×3) nos ladrilhos das alternativas do SJT MC — precedente direto: as linhas do `HistoricoBlock`
  (`rounded-lg border border-white/10 bg-white/5 p-3`), no mesmo hub. Alternativas são itens de lista dentro de um
  card que já tem `p-6`; `p-4` dobraria o respiro de seis situações empilhadas. **Exceção de um elemento só,
  não token novo:** `p-3` não entra na escala e não pode ser usado em ficha, card, seção ou qualquer outro
  elemento desta fase — esses seguem `p-4`/`p-6` da tabela acima.
- `max-w-2xl` / `max-w-4xl` nas shells do candidato — herdados verbatim (SJT MC `max-w-2xl`; Raven mantém `max-w-4xl` por causa da grade de 8 alternativas).

---

## Typography

Família Helvetica Neue. **Quatro tamanhos — 14, 16, 24 e 48px — e dois pesos — 400 e 600.** Nenhum outro
tamanho entra no escopo do contrato (definido logo abaixo), nem como variante responsiva (`sm:`/`md:`/`lg:` de
tamanho de fonte não existe neste contrato). Body 1.5, heading 1.2.

São **os mesmos quatro da 17-UI-SPEC** (`.planning/milestones/v2.0-phases/17-navegacao-arquitetura-informacao/17-UI-SPEC.md:66-73`:
«Do not introduce font sizes outside {14, 16, 24, 48}»). O código vivo do hub tinha escorregado para
`text-xl md:text-2xl` nos títulos de seção — dois tamanhos onde a 17 declarou um. Esta fase devolve o título ao
valor único da 17 (D-52-U22).

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label — rótulo de campo da ficha, pergunta da inscrição, gatilho de aba, texto de botão, selo/badge (inclusive os ex-`text-xs` dos cards da avaliação assíncrona — tabela abaixo), linha de aviso do Big Five, «Tempo decorrido», legendas e notas auxiliares | 14px (`text-sm`) | semibold (600) nos rótulos, botões e selos; regular (400) em legenda/nota auxiliar | 1.4 |
| Body — valor de campo, resposta da inscrição, texto do caso aberto, cenário e alternativas do SJT, texto da devolutiva, e-mail/celular no cabeçalho, títulos de card (`CardTitle` em `text-base font-semibold`), `h3` de sub-bloco («Endereço», blocos da inscrição, «Situação {n}»), cabeçalho dos estados vazios autorados nesta fase | 16px (`text-base`) | regular (400); títulos de card, `h3` e nome da dimensão em 600 | 1.5 |
| Heading — título de seção do hub: `HubSection` **e** os `h2` irmãos escritos à mão | **24px (`text-2xl`) — um tamanho só, em toda largura** | semibold (600) | 1.2 |
| Display — nome do candidato no cabeçalho do hub | 48px (`text-5xl`) — **inalterado** (17-UI-SPEC, Display) | semibold (600) | 1.0 |

### Heading: um tamanho, não dois

Hoje o título de seção é `text-xl md:text-2xl` (20px abaixo de 768px, 24px a partir dele) em **quatro** lugares,
e o h1 do estado «Candidatura não encontrada» é `text-xl`. A fase troca os cinco por `text-2xl`:

| Arquivo:linha (medido 2026-10-10) | Hoje | Passa a |
|---|---|---|
| `src/features/hub-candidato/components/HubSection.tsx:93` | `text-xl … md:text-2xl` | `text-2xl` |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx:382` («Linha do funil») | `text-xl … md:text-2xl` | `text-2xl` |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx:421` («Currículo») | `text-xl … md:text-2xl` | `text-2xl` |
| `src/features/agendamento/components/AgendamentoBlock.tsx:99` (título da seção de agendamento; único consumidor: o hub) | `text-xl … md:text-2xl` | `text-2xl` |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx:225` (h1 «Candidatura não encontrada», mesma rota) | `text-xl` | `text-2xl` |

Por que 24 e não 20: (1) é o valor declarado pela 17-UI-SPEC; (2) é o que a persona do hub (desktop-first) já vê
hoje — **no desktop nenhum título muda**; (3) coincide com o número da nota do `AnaliseIABlock`
(`AnaliseIABlock.tsx:66`, `text-2xl`), que deixa de ser um tamanho à parte. Custo, aceito: abaixo de 768px os
títulos sobem 4px; a 360px «Raciocínio lógico (Matrizes)» quebra em duas linhas — quebra, nunca `truncate`.
Como `HubSection` é a casca de **toda** seção do hub (inclusive `HistoricoBlock` e `AnaliseIABlock`), uma classe
corrige todas.

### Escopo da contagem — o que é contrato e o que é herança medida

**Dentro do contrato (contado nos 4 tamanhos):**
1. Todo elemento que esta fase **escreve** (componentes novos da §Component Inventory, emendas do Bloco A).
2. Todo elemento que esta fase **reestiliza**, inteiro — não só a linha que motivou o restyle.
3. Os **cards da seção «Avaliação assíncrona»**, que esta fase reestrutura (D-18, D-21, D-22, D-52-U03). O único
   consumidor de `ScorecardAvaliacao` hoje é `AvaliacoesRespondidasBloco.tsx:74`, que **sai do hub** (D-52-U03) —
   portanto mudar a tipografia desses cards não muda tela nenhuma fora do hub.
4. Os títulos de seção da tabela acima.

**Os `text-xs` dos cards da avaliação assíncrona entram no contrato e são contados como Label (14px):**

| `ScorecardAvaliacao.tsx` linha | Elemento | Hoje | Passa a |
|---|---|---|---|
| 73 | `RevisaoHumanaMarker` «Requer revisão humana» | `text-xs font-semibold` | `text-sm font-semibold` (ícone `CircleDashed` sobe de `h-3 w-3` para `h-4 w-4`, proporcional) |
| 137 | etiqueta crua do `McBreakdown` | `text-xs` | **sai** — o `McBreakdown` é substituído por `SjtMcDetalhe`, cuja etiqueta é o selo neutro `text-sm font-semibold` (§Color) |
| 181, 215 | `SugestaoIABadge` dentro do card do caso aberto | `text-xs` (do componente) | `className="text-sm"` **nas duas chamadas** — `cn` usa `tailwind-merge` (`src/components/ui/utils.ts`), então o `text-sm` substitui o `text-xs` sem tocar o componente compartilhado |
| 188 | sinal de revisão (`data-testid="sjt-sinal-revisao"`) | `text-xs` | `text-sm` |
| 221 | `dim.level` | `text-xs` | `text-sm font-semibold` |
| 240, 251, 260 | rótulos «Citações» / «Texto do candidato» / «Red flags» | `text-xs uppercase tracking-wide text-white/50` | `text-sm font-semibold text-white/70`, sem caixa-alta («Red flags» vira «Pontos de atenção», D-52-U19) |
| 296 | selo «Contextual · não-eliminatório» do `BigFiveEstado` | `text-xs font-semibold` | `text-sm font-semibold` — e no hub o card passa a ser `BigFiveResultadoHub`, com o selo neutro de 14px |

E, na variante do hub de `RespostaCasoAbertoConteudo` (`src/features/decisao/components/RespostaCasoAbertoSjt.tsx`),
os seis `text-xs` (linhas 58, 66, 82, 83, 96, 110) viram: texto do candidato e frases de estado
(`carregando`/`erro`/`removida`/`indisponivel`/`sem_resposta_enviada`) em **16px**; rótulo e botão de recarregar em
**14px/600**. A variante da Decisão Final continua como está (âmbar, 12px — C-7 da 51; fora do hub).

**Fora do contrato — herança medida, não tocada por esta fase** (o hub as renderiza porque o componente apenas
**muda de aba**; a fase não edita o markup deles):

| Origem (arquivo:linha) | Tamanho renderizado | Por que fica fora |
|---|---|---|
| `src/components/ui/AsyncState.tsx:108,180` — cabeçalho dos estados vazio/erro (`text-base md:text-lg`); idem `HubSection.tsx:117` («Não se aplica a esta vaga») | 16px, **18px** a partir de 768px | Primitivo compartilhado por **16** arquivos de tela fora desta fase (`grep -rln "<AsyncState" src --include='*.tsx'`); o tamanho é contrato da 18-UI-SPEC. Mudá-lo aqui mudaria 16 telas que a fase não verifica |
| `src/features/triagem/components/SugestaoIABadge.tsx:34` nas chamadas de `AnaliseIABlock.tsx:113,130` (aba Resumo) | 12px | Componente-guardrail RNF-07a com **16** chamadas em **11** arquivos (10-UI-SPEC §C). As duas chamadas do `AnaliseIABlock` não são reestilizadas — o bloco só muda de lugar |
| `src/features/triagem/components/ProvenienciaIABadge.tsx:156` (aba Resumo) | 12px | A fase muda **só a frase** (`textoProveniencia`, defeito b), não a classe do selo |
| `src/features/agendamento/components/AgendamentoBlock.tsx:520,525,533,541` (rótulos `dt` em caixa-alta) | 12px | Bloco só muda de aba; a única linha tocada é o título (`:99`, acima) |
| `src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx:109,115,123,131` e `:124` (`text-lg font-bold`) | 12px; **18px/700** | Seção «Prova cognitiva» — **inalterada**, só muda de aba (§Aba «Avaliações») |
| `src/features/hub-candidato/components/HistoricoBlock.tsx` | — | Já está em 14/16 (D-47-U07, guardado por `historicoAtorRotulos.test.tsx:140`) |

Esta tabela é **declaração de escopo, não licença**: nenhuma classe dela pode ser copiada para elemento escrito ou
reestilizado nesta fase. A deriva que ela registra (12 e 18px no hub, e o 700 do `LiberacaoCognitivoBlock`) é a do
achado aberto `.planning/todos/pending/ui-spec-text-xs-quinto-tamanho.md`, que fica com ela — não é resolvida por
uma fase que não reestiliza esses blocos.

**Varredura do executor (portão do Bloco A e do Bloco B)** — sobre as **linhas acrescentadas** pela fase, não
sobre arquivos inteiros (vários arquivos tocados carregam herança fora do escopo — `AgendamentoBlock` `:520+`,
`FormularioCandidaturaPage` `:615/:660`, a variante da Decisão Final em `RespostaCasoAbertoSjt`):

```bash
git diff <commit-base-da-fase>..HEAD -U0 -- src/ ':!src/**/__tests__/**' | grep -E '^\+[^+]' \
  | grep -nE '(^|[^-[:alnum:]])((sm|md|lg):)?text-(xs|lg|xl|[346789]xl|\[[0-9]+px\])([^-[:alnum:]]|$)|md:text-2xl|font-(medium|bold)([^-[:alnum:]]|$)'
```

tem de sair **vazio**. O padrão foi provado contra amostras em 2026-10-10: acusa `text-xs`, `text-[13px]`,
`text-xl md:text-2xl`, `text-3xl`, `font-medium`, `text-lg font-bold`; não acusa `text-2xl font-semibold`,
`text-5xl font-semibold` (o Display, que reaparece no diff quando o cabeçalho é reindentado), `text-base`,
`text-white/70`. Seções movidas para dentro das abas reaparecem no diff como linhas acrescentadas — é desejado:
o que estiver no `HubCandidatoRH` tem de caber nos quatro tamanhos.

**Cobertura medida (2026-10-10):** o mesmo padrão, rodado hoje sobre os arquivos inteiros de `HubCandidatoRH.tsx`,
`ScorecardAvaliacao.tsx` e `AvaliacaoRavenScreen.tsx`, acusa **17 linhas** — e as 17 são exatamente as mapeadas
acima (HubCandidatoRH `:225/:382/:421`; Scorecard `:73/:137/:188/:213/:221/:240/:251/:260/:296`; Raven
`:170/:186/:213/:216/:229`). Nenhuma linha desses três arquivos fica sem destino declarado. **Prova de que morde, no portão:** acrescentar temporariamente uma linha com `text-xs` num
arquivo da fase e ver a varredura acusá-la, depois remover (regra «portão é código» do CLAUDE.md).

**Notas:**
- **O texto do caso aberto sobe de 12px para 16px** (D-52-U09). «Mais legível» (ROADMAP, D-22) começa pelo tamanho.
- **Pesos:** só 400 e 600. Nada de `font-medium` (500) nem `font-bold` (700) em elemento escrito ou reestilizado;
  o `font-medium` da dimensão em `CasoAbertoBreakdown` (`dim.dimension`) passa a `font-semibold` junto com o restyle.
- **Telas do candidato — mesma regra de escopo.** Elemento novo (botão de saída, «Ver devolutiva», diálogo de
  perda, «Meu painel», «Verificando sua sessão…») usa 14/600 (botões) e 16/400 (texto). Elemento cuja `className`
  a fase **edita** entra inteiro no contrato:
  - **Raven** (`AvaliacaoRavenScreen.tsx`, reestilizado para a shell): os três `h1` — `:170` `text-2xl font-bold`,
    `:186` `text-xl font-bold`, `:216` `text-lg font-bold` — passam todos a `text-2xl font-semibold` (24/600); o
    eyebrow `:213` (`text-xs uppercase tracking-wide`) passa a `text-sm font-semibold text-white/70`, sem caixa-alta;
    `COPY.semVolta` (`:229`, `text-xs`) passa a `text-sm text-white/70`; `COPY.subtitulo` (novo no cabeçalho) 16/400.
  - **«Inscrição recebida» / «Agradecemos»** (`FormularioCandidaturaPage.tsx:538`): o `h1` `text-3xl` (30px) passa a
    `text-2xl` (24px) junto da troca de cor — é o tamanho dos outros dois `h1` da mesma página (`:508`, `:600`).
    Os dois parágrafos já são `text-base`. Texto inalterado (D-15 da 48).
  - O resto de cada tela do candidato (o que a fase não edita) é herança e não é varrido — inclusive o `span`
    neutro do «Próximo passo» do painel (`DashboardCandidatoPage.tsx:480`, `text-sm font-medium`), que o estado
    novo da D-27 **reusa sem editar**, e o eyebrow `:455` (`text-xs`).
- **Números tabulares** (`tabular-nums`) em «Tempo decorrido» e no cronômetro do Raven (já existe no Raven).

---

## Color

Paleta **travada** — idêntica às Phases 17 e 42–47.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#00109E` brand-primary — `BackgroundImage background="darkBlue"` (RH) / `gradient` com overlay 15% (candidato) | Fundo atrás de todo glass |
| Secondary (30%) | Glass: `bg-black/30` (`Glass variant="dark"`, seções do hub) · `bg-white/5`–`bg-white/15` (fichas internas, cards, `GlassPanel variant="white"` do candidato) | Seções, cards, fichas, abas inativas, botões neutros |
| Accent (10%) | `#35BFAD` brand-accent (`--accent`) | **Lista fechada abaixo** |
| Destructive | `#EF4444` (`--destructive`) | «Rejeitar» (existente) e «Sair» da confirmação de perda (novo) — e nada mais |

**Accent (`#35BFAD`) reservado para — lista fechada:**
1. **CTA dominante «Próximo passo»** do hub (turquesa sólido) — existente, inalterado.
2. **Chip da etapa atual** no cabeçalho e **etapa atual na «Linha do funil»** — existentes, inalterados.
3. **«Avançar»** (contorno turquesa 40% + texto turquesa) e **«Abrir workspace de redação»** — existentes, mudam só de aba.
4. **Eyebrow «Próximo passo»** (`text-[#35BFAD]`) — existente.
5. **CTA «Próximo item» / «Concluir avaliação» do Raven** — **novo**: hoje é `GlassButton` sem preenchimento sobre
   fundo branco (51-UI-REVIEW, Pilar 2). Passa a `bg-[#35BFAD] text-white` sólido. É a ação repetida 60 vezes.
6. **Alternativa marcada no Raven** (`border-[#35BFAD] ring-2 ring-[#35BFAD]/40`) e **barra de progresso** — existentes.
7. **Trecho citado pela IA dentro do texto do caso aberto** — **novo**: `<mark className="rounded-sm bg-[#35BFAD]/30 px-1 text-white">`.
   O turquesa já é o sinal de IA do hub (`Sparkles text-[#35BFAD]` no `AnaliseIABlock:63`); o 30% mantém o
   contraste do texto branco.
8. **Realce de hover/foco do `SelectItem`** — **novo** (conserto R1): `bg-[#35BFAD]/20`, **sem** forçar cor de texto.
9. **Status «Concluído» na lista de avaliações do candidato** (`text-[#35BFAD]`) — existente.

**Explicitamente NÃO accent:** gatilho de aba ativa (branco, precedente `EntrevistaWorkspace`); «Enviar e-mail» e
«Chamar no WhatsApp» (neutros — o CTA dominante da tela continua sendo um só); «Ver devolutiva»; selo
«Eliminatória»; alternativa escolhida no SJT MC; faixas do Big Five; os botões de nota da entrevista
(selecionado = branco). Pintar a alternativa escolhida ou uma faixa de turquesa leria como «certo»/«bom» — o
oposto de RNF-07a.

**Destructive (`#EF4444`) reservado para:** o gatilho «Rejeitar» (existente, `border-red-500/40 bg-red-500/10
text-red-300`) e a ação **«Sair»** do diálogo de perda (`bg-[#EF4444] text-white hover:bg-[#EF4444]/90`). Nada
mais: nem o selo «Eliminatória», nem «Atenção» no SJT, nem «Não informado», nem número inválido de WhatsApp.

### Tratamentos semânticos (data-encoding — fora do orçamento de accent)

| Tratamento | Classes | Onde |
|---|---|---|
| Ficha neutra de leitura | `rounded-lg border border-white/15 bg-white/5 p-4` | Grupos da ficha do cadastro; cada pergunta da inscrição; caixa do texto do caso aberto (substitui a âmbar) |
| Rótulo de campo | `text-sm font-semibold text-white/70` | «E-mail», «CPF», texto da pergunta da inscrição, «Texto do candidato» |
| Valor de campo | `text-base text-white/90 leading-relaxed` (+ `whitespace-pre-line` em texto livre; `break-words` sempre; `break-all` em URL e e-mail) | Valores, respostas, texto do caso aberto |
| Valor ausente | `text-base text-white/60` — palavra, nunca traço | «Não informado», «Sem resposta» |
| Selo neutro | `Badge` `border-white/20 bg-white/5 text-sm font-semibold text-white/80` | «Eliminatória», etiqueta da escolhida, «Contextual · não-eliminatório» |
| Alternativa escolhida (SJT MC) | `rounded-lg border border-white/40 bg-white/15 p-3` + `Check` (`aria-hidden`) + palavra «Escolhida» | Só a escolhida |
| Alternativa não escolhida | `rounded-lg border border-white/10 bg-transparent p-3 text-white/80` | As demais |
| Aba ativa / inativa | ativa `border-white/30 bg-white/20 text-white`; inativa `border-white/15 bg-white/5 text-white/70 hover:bg-white/10` | Gatilhos (verbatim `EntrevistaWorkspace.tsx:168`) |
| Nota selecionada / livre (entrevista) | selecionada `border-white/40 bg-white/25 text-white`; livre `border-white/20 bg-white/5 text-white/80 hover:bg-white/15` | Os 5 botões por competência (molde do seletor de análise, `EntrevistaScorecardInline.tsx:173-177`) |
| Faixa do Big Five | `BandaSegments` verbatim (`bg-white/80` ativo, `bg-white/15` demais) | Hub e devolutiva — **o mesmo componente** |

**Conserto do `SelectItem` (R1, `select.tsx:132-136`):** remover as classes que forçam `text-white` em hover/foco
(`hover:text-white`, `focus:text-white`, `[&_*]:hover:!text-white`, `[&_*]:focus:!text-white`) e o
`hover:bg-white/25`/`focus:bg-white/25`; o realce passa a `hover:bg-[#35BFAD]/20 focus:bg-[#35BFAD]/20` e o texto
**herda** a cor do painel. Resultado nos dois fundos que existem no projeto: painel branco padrão
(`--popover` #fff) → texto escuro sobre turquesa claro; painel `bg-[#00109E]/95` dos consumidores que passam
fundo próprio → texto branco sobre azul com véu turquesa. Prova obrigatória nos dois: `RejeitarCandidaturaDialog`
(fundo padrão, o relatado) e `CandidatosRHPage` (fundo azul).

**Contraste:** todo texto de conteúdo novo em `text-white/80` ou mais opaco sobre o glass escuro. `text-white/70`
só para rótulos de campo (redundantes com a estrutura `<dt>`); `text-white/60` só para «Não informado»/«Sem
resposta» (a palavra é o dado). Nada em `/50` autorado nesta fase.

---

## Hub do RH — contrato de layout (Bloco B)

### Estrutura

```
RHLayout
└── div.space-y-6
    ├── [Cabeçalho — FORA das abas (D-12)]
    │     h1 nome (48px)  ·  chip da etapa (accent)
    │     p «Vaga: {título}» (16px, text-white/80)                       ← D-52-U10
    │     ContatoCandidatoHeader (linha flex-wrap gap-4)
    ├── Tabs (defaultValue = aba da URL ?? 'resumo')                     ← D-52-U02
    │     TabsList  [Resumo] [Cadastro e inscrição] [Avaliações] [Histórico]
    │     TabsContent resumo     → Próximo passo · Linha do funil · Currículo · Análise da IA ·
    │                              Agendamento de entrevista · Decisão Final
    │     TabsContent cadastro   → Dados do cadastro · Respostas da inscrição
    │     TabsContent avaliacoes → Avaliação assíncrona (SJT MC · Caso aberto · Big Five) ·
    │                              Prova cognitiva · Raciocínio lógico (Matrizes) ·
    │                              Redação (+ «Abrir workspace de redação») · Entrevista
    │     TabsContent historico  → HistoricoBlock (inalterado)
```

- `TabsList`: `flex h-auto w-full flex-wrap gap-2 bg-transparent p-0` (o `h-9` do primitivo transbordaria na
  quebra de linha — defeito 31, `DevolutivaBigFiveView.tsx:240-246`). Cada `TabsContent`: `space-y-6 pt-2`.
- **Aba na URL:** parâmetro `?aba=resumo|cadastro|avaliacoes|historico`, gravado com `setSearchParams(..., { replace: true })`
  — trocar de aba **não** cria entrada no histórico (o «voltar» do navegador sai do hub, como hoje), mas abrir um
  workspace e voltar devolve a pessoa à aba em que estava. Valor desconhecido → `resumo`.
- **Montagem preguiçosa:** o Radix desmonta o conteúdo inativo; as leituras novas de cada aba só disparam quando
  a aba abre. O contato do cabeçalho carrega com o hub (está fora das abas).
- **Ações de decisão não mudam de lugar** (D-17): Avançar / Retroceder / Rejeitar / CTA dominante ficam no
  «Próximo passo», primeira seção da aba Resumo, que é a aba que abre.

### Cabeçalho de contato (D-12..D-16)

| Linha | Conteúdo | Botão |
|---|---|---|
| E-mail | `Mail` (`aria-hidden`) + endereço (16px, `text-white/90 break-all`) | **«Enviar e-mail»** — `<a href="mailto:…">`, mesma aba |
| Celular | `Phone` (`aria-hidden`) + número formatado `(11) 98765-4321` | **«Chamar no WhatsApp»** — `<a href="https://wa.me/…">`, `target="_blank" rel="noopener noreferrer"`, ícone `MessageCircle` |

- Botões: `inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10` (o molde neutro do «Retroceder»/«Abrir currículo»). São `<a>`, não `<button>`: o destino é um link.
- **`mailto:`** = `mailto:{email}?subject={encodeURIComponent(assunto)}`, corpo vazio (D-14).
- **WhatsApp** = `https://wa.me/{numero}?text={encodeURIComponent(mensagem)}` (D-13). A mensagem chega pronta e a pessoa edita no próprio WhatsApp antes de enviar.
- **Normalização** (`normalizarCelularWhatsApp`, função pura): `d = celular.replace(/\D/g, '')`; se `d` começa com `55` e tem 12–13 dígitos → `d`; senão, se tem 10–11 dígitos e o DDD (2 primeiros) não começa com `0` → `'55' + d`; qualquer outro caso → **inválido**.
- **Inválido:** o número aparece como texto (cru, como gravado) e, no lugar do botão, a linha
  `text-sm text-white/70` «Número fora do formato do WhatsApp — confira o cadastro.» (Invariante 7).
- **Sem contato** (e-mail ausente ou `@invalido.local`, celular ausente): a linha toda vira «Sem contato disponível.» — sem causa (Invariante 4).
- Os botões aparecem **em qualquer etapa e status**, inclusive rejeitado (D-16). O clique não é registrado (D-15).
- **{vaga}** = título da vaga da candidatura. Hoje `useEntrevistaContexto` não traz o título — a leitura do
  contato (ou o contexto) passa a trazê-lo. Sem título: as frases caem para as versões sem «para {vaga}» (§Copy).
- **{primeiro nome}** = primeiro token de `nome_completo`, como gravado.

### Aba «Cadastro e inscrição»

**Seção `HubSection titulo="Dados do cadastro"`** — `<dl className="grid gap-4 sm:grid-cols-2">`, cada par
`<div className="space-y-1"><dt>rótulo</dt><dd>valor</dd></div>`. Ordem e rótulos:

| # | Rótulo (`dt`) | Valor (`dd`) |
|---|---|---|
| 1 | Nome completo | `nome_completo` |
| 2 | E-mail | `email` (`break-all`) — mesma regra do `@invalido.local` |
| 3 | Celular | formatado |
| 4 | CPF | `000.000.000-00` |
| 5 | Data de nascimento | `12/03/1994 (32 anos)` (D-09) — idade calculada na data de hoje, fuso `America/Sao_Paulo`; «(1 ano)» no singular |
| 6 | Gênero | mapa: `masculino`→Masculino · `feminino`→Feminino · `outro`→Outro · `prefiro_nao_informar`→Prefiro não informar; valor desconhecido → o próprio valor |
| 7 | Como conheceu a vaga | mapa: instagram→Instagram · facebook→Facebook · linkedin→LinkedIn · indicacao→Indicação · google→Google · catho→Catho · vagas_com→Vagas.com · solides→Solides · outro→Outro |
| 8 | Detalhes de como conheceu | `como_conheceu_detalhes` — só renderiza a linha se houver valor |
| 9 | LinkedIn | `linkedin_url` (link, Invariante 6) ou, sem URL, `linkedin` como texto |
| 10 | Instagram | `instagram_url` (link) ou, sem URL, `instagram` como texto |

Depois, sub-bloco **«Endereço»** (`h3` 16px/600, `sm:col-span-2`) com CEP (`00000-000`), Logradouro, Número,
Complemento, Bairro, Cidade, UF — no mesmo `<dl>` em grade.

- Campo vazio → «Não informado». **Esperado em massa:** `cpf` e `genero` saíram do cadastro na Phase 8 (`candidatoSchema.ts:166`), então a maioria das fichas mostra «Não informado» nesses dois — e isso é verdade, não defeito.
Depois de «Endereço», sub-bloco **«Disponibilidade»** (`h3` 16px/600, `sm:col-span-2`, mesmo `<dl>` em grade) —
**incluído por decisão do operador em 2026-10-10** (D-52-U18), lido da tabela `disponibilidade` pelo mesmo
caminho de servidor com log da D-10/D-11 (a leitura é alargada a essa tabela; nada de leitura direta do cliente):

| # | Rótulo (`dt`) | Valor (`dd`) |
|---|---|---|
| 1 | Turno preferido | mapa: `manha`→Manhã · `tarde`→Tarde · `noite`→Noite · `integral`→Integral; valor desconhecido → o próprio valor |
| 2 | Modelo de trabalho | mapa: `presencial`→Presencial · `remoto`→Remoto · `hibrido`→Híbrido; valor desconhecido → o próprio valor |
| 3 | Início | `disponibilidade_imediata = true` → «Imediato»; senão `data_disponibilidade` como `dd/MM/yyyy`; ambos ausentes → «Não informado» |

Sem linha em `disponibilidade` → os três pares mostram «Não informado» (o sub-bloco não some; a ausência é um fato a mostrar).

**Seção `HubSection titulo="Respostas da inscrição"`** — as perguntas agrupadas por `bloco` com `groupByBloco`
(a mesma função do formulário), cada grupo com `h3` = `ROTULO_BLOCO[bloco]` (16px/600); dentro, `<ol>` na
`ordem` do formulário. Cada item é uma ficha neutra:

```
[texto da pergunta — 14px/600 text-white/70]   [Eliminatória]  ← só na pergunta eliminatória
[resposta — 16px/400 text-white/90, whitespace-pre-line]
```

- **Eliminatória** = pergunta que o servidor marca como eliminatória. Selo neutro; a resposta aparece como as
  outras — **sem** «passou/não passou», sem distância do corte, sem a opção que elimina (D-19, Invariante 3).
- Resposta por tipo: `texto_curto`/`texto_longo` → texto; `single_choice`/`multiple_choice` → o(s) texto(s)
  da(s) opção(ões) escolhida(s), múltiplas como `<ul>` com marcadores; `numerico` → `toLocaleString('pt-BR')`.
- **Links** (D-20): URLs `http(s)://…` dentro de qualquer resposta de texto viram `<a>` por segmento (pontuação
  final `.,;:)` fica fora do link), `underline underline-offset-2 break-all text-white`, com `ExternalLink`
  (`h-4 w-4`, `aria-hidden`, `ml-1`) e `aria-label="{url} (abre em nova aba)"`. Sem prévia.
- Pergunta sem resposta → «Sem resposta». Pergunta removida do formulário depois da inscrição, mas respondida →
  aparece na sua posição com a nota `text-sm text-white/60` «Pergunta removida do formulário depois da inscrição.»

### Aba «Avaliações»

**Seção «Avaliação assíncrona»** (`HubSection`, título com «a» minúsculo como «Prova cognitiva»): a frase
`COPY_AVALIACOES_RESPONDIDAS.contagem(n)` **uma vez**, e logo abaixo, **abertos** (D-18), os cards na ordem
SJT MC → Caso aberto → Big Five. O `AvaliacoesRespondidasBloco` («Ver respostas»/«Ocultar respostas») **sai do
hub** — com tudo aberto, ele só repetiria a contagem (defeito c). **Regra de estado:** havendo linha `sjt`/`big_five`,
a seção é `com_dados` **em qualquer posição da etapa** — o dado vence a etapa, como o 51-03/D-16 já faz o dado
vencer a configuração (D-52-U03). `nao_se_aplica` continua como hoje.

**Card SJT MC (`SjtMcDetalhe`, D-21):**
```
Múltipla escolha                                   [Requer revisão humana]?
Pontuação: x / max
«Alternativas na ordem do banco — o candidato as viu embaralhadas.»   (14px text-white/70)
Situação 1  (16px/600)
  cenário (16px, pre-line)
  ○ alternativa A                       (não escolhida)
  ● alternativa B  ✓ Escolhida  [Pontua] peso 2      (escolhida)
  ○ alternativa C
Situação 2 …
```
- Ordem das alternativas = `pergunta_opcao_metadata.ordem` (o candidato viu embaralhado — `SjtMultiplaEscolhaScreen.tsx:84`; a legenda diz isso).
- Etiqueta da escolhida em pt-BR: `fortemente_pontua`→«Pontua forte» · `pontua`→«Pontua» · `neutro`→«Neutro» · `atencao`→«Atenção» · `knockout`→«Eliminatória»; desconhecida → o código. Seguida de «peso {n}» (14px `text-white/70`). Hoje o código cru (`fortemente_pontua`) aparece na tela.
- `falhou` → «Pontuação indisponível» (existente) **e** as situações continuam aparecendo se a leitura delas vier: a pontuação falhou, a resposta existe.

**Card Caso aberto (D-22):** dimensões + composto como hoje (com `SugestaoIABadge`). O texto:
- Rótulo «Texto do candidato» (14/600 `text-white/70`) e, havendo ao menos uma citação localizada, a legenda
  `text-sm text-white/70` «Trechos marcados: citados pela análise da IA.»
- Caixa neutra `rounded-lg border border-white/15 bg-white/5 p-4`, texto 16px/1.5 `text-white/90 whitespace-pre-line`
  — sai o `bg-black/30 text-amber-100 text-xs`. Parágrafos preservados.
- **Citação localizada** = ocorrência literal no texto (comparação exata; o planejador pode normalizar espaço em
  branco, **nunca** caixa nem acento). Marca a **primeira** ocorrência; citações sobrepostas viram um trecho só.
- **Citações não localizadas** ficam ao lado, como hoje: com pelo menos uma, o grid vira `md:grid-cols-[2fr_1fr]`
  (texto à esquerda, lista à direita, empilhado no celular) sob o rótulo «Citações não localizadas no texto»;
  sem nenhuma, o texto ocupa a largura toda.
- «Red flags» → **«Pontos de atenção»** (D-52-U19).
- Situações `removida`/`indisponivel`/`sem_resposta_enviada`/erro: as frases de `COPY_RESPOSTA_CASO_ABERTO`, verbatim, 16px.

**Card Big Five (`BigFiveResultadoHub`, D-04..D-07):**
```
Big Five                                   [Contextual · não-eliminatório]
Perfil comportamental autodeclarado: descreve, não classifica. Não é critério de aprovação nem de rejeição.
Abertura à Experiência              Moderadamente alto
▬ ▬ ▬ ■ ▬
Conscienciosidade                   Médio
… (5 dimensões, ordem O C E A N, «Sensibilidade Emocional» para N)
[Ver devolutiva]
  (aberto) Texto que o candidato recebeu
           disclaimer_emocional
           {Dim}: {Banda}  (16px/600)
           analogia (14px text-white/70)
           texto_interpretativo (16px pre-line)
           … 5 dimensões empilhadas (sem abas internas)
           disclaimer_lgpd_crp (14px text-white/70)
```
- A linha de aviso (D-07) é **fixa**, sempre visível, logo abaixo do título, `text-sm font-semibold text-white/80` — não fica dentro do recolhível.
- Faixas: `BandaSegments` + `BANDA_LABEL` **importados** do módulo compartilhado; fonte = dashboard da devolutiva (Invariante 2).
- «Ver devolutiva» / «Ocultar devolutiva»: `<button aria-expanded aria-controls>` neutro (molde do «Ver respostas» da 51, sem o accent). O texto aberto fica numa ficha neutra; nada de `Tabs` aninhadas (D-18).
- **Sem `SugestaoIABadge`** no card (D-52-U06).
- Sem linha `big_five` → título «Big Five — Não fez» (existente) e nada mais.
- Com linha `big_five` e **sem devolutiva** → «Big Five respondido. A devolutiva não está disponível, por isso as faixas não são mostradas.» Sem faixas, sem botão.

**Demais seções da aba** (Prova cognitiva, Raciocínio lógico (Matrizes), Redação + botão do workspace,
Entrevista): **inalteradas**, só mudam de lugar.

### Aba «Resumo» e «Histórico»
Conteúdo **inalterado**, só redistribuído. A única mudança de texto na Resumo é a proveniência (defeito b, §Copy).

---

## Telas do candidato e do RH fora do hub — contrato (Bloco A)

| Tela | O que muda | Contrato visual |
|---|---|---|
| **Todas as telas de prova** — `SjtMultiplaEscolhaScreen`, `SjtCasoAbertoScreen`, `RedacaoEditorScreen`, `BigFiveQuestionnaireScreen`, `ProvaCognitivaScreen`, `AvaliacaoRavenScreen` (D-24) | Botão de saída **durante** a prova | `SairDaProvaButton` na **primeira linha** do painel da prova, acima do título, alinhado à esquerda: `GlassButton variant="white"` com `ArrowLeft` (`aria-hidden`), `min-h-[44px] text-white`. Rótulo: «Voltar às avaliações» (5 telas do container) / «Ir ao painel» (Raven — D-52-U14) |
| SJT MC e Raven | Confirmação de perda | Com **≥1 resposta marcada**: abre `AlertDialog` (§Copy); sem nenhuma, sai direto (D-52-U15). «Continuar» é o `AlertDialogCancel` e recebe o foco inicial; «Sair» é a ação destrutiva |
| Redação, Caso aberto, Big Five, Prova cognitiva | Saída direta | Sem diálogo — o rascunho já está salvo (`useAutosaveAvaliacao`) |
| `SjtMultiplaEscolhaScreen` (D-26) | «Tempo sugerido» → «Tempo decorrido» | Mesmo lugar, mesmo `Clock`, `tabular-nums` |
| `AvaliacaoContainer` (pendência f) | Devolutiva reabrível | Card «Avaliação comportamental» **concluído** ganha `GlassButton variant="white"` «Ver devolutiva» (`w-full mt-4 min-h-[44px]`, mesmo lugar do «Começar avaliação» dos pendentes) → `/candidato/avaliacao/:id/bigfive/devolutiva`. No estado «Tudo concluído», se a vaga tem Big Five concluído, o mesmo botão aparece **acima** do «Ir ao painel» |
| `AvaliacaoRavenScreen` (Raven no shell) | Shell da marca + instruções | Envolver na shell do candidato (`BackgroundImage gradient` + overlay 15%, `container max-w-4xl`); textos `slate-*` → escala branca (`text-white`, `/80`, `/70`); `COPY.subtitulo` renderizado no cabeçalho (16px `text-white/80`) e `COPY.semVolta` logo abaixo (14px `text-white/70`) — **visíveis em todo item**. Matriz e alternativas sobre **ladrilho branco sólido** (`bg-white rounded-lg p-2`) — são desenhos em preto sobre branco. Grade com classes literais `nOpcoes > 6 ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-3 sm:grid-cols-6'` (o template atual não é gerado pelo JIT). CTA accent sólido (§Color 5). Trilho da barra `bg-white/20` |
| `DashboardCandidatoPage` (defeito a, D-27) | Avaliações concluídas | Na candidatura em `avaliacao_assincrona` com todas as avaliações concluídas: o «Próximo passo» mostra o `span` neutro existente (`border-white/20 bg-white/10 text-white/80`) com «Avaliações concluídas — aguardando a equipe», **sem** botão; o selo de status mostra «Aguardando a equipe» com o tratamento neutro (`text-gray-300 bg-gray-500/20`). Status do banco intocado. Carregando ou erro da leitura → o CTA de hoje (D-52-U16) |
| `CandidatoNavbar` (51-17) | Volta ao painel | `GlassButton` «Meu painel» com `LayoutDashboard`, rótulo `hidden sm:inline` + `aria-label="Meu painel"`, à esquerda do «Área do candidato»; **não** renderiza quando a rota atual já é `/candidato/dashboard` |
| `LoginCandidatoPage` (51-17) | Sessão aberta | Sessão de candidato já hidratada → `navigate(destino, { replace: true })` sem mostrar o formulário; `destino` = `redirect` se começar com `/candidato/`, senão `/candidato/dashboard`. Enquanto o `authStore` hidrata: `Loader2` centralizado + «Verificando sua sessão…» (16px `text-white/80`) no lugar do formulário. Sessão de RH/admin ou sem sessão → formulário como hoje |
| `FormularioCandidaturaPage:537-548` (51-17) | «Agradecemos» | O bloco inteiro do cartão de knockout: h1 `text-white`, corpo `text-white/80`, «Agradecemos…» `text-white/70` (sai `text-gray-900/700/500`). Texto **inalterado** (D-15 da 48, travado) |
| `select.tsx` (51-17, R1) | Branco sobre branco | §Color |
| `EntrevistaScorecardInline` (D-25) | BARS vazios e obrigatórios | Por competência: rótulo (14/600) + `role="radiogroup"` com 5 `button role="radio"` «1»…«5» (`min-h-[44px] min-w-[44px]`, `gap-2`, tratamento §Color), **nenhum marcado** ao abrir, `aria-label="{competência}"`. Sai o `Slider`, sai a leitura «x / 5» e sai o pré-preenchimento pela nota da IA (D-52-U12). Subtítulo com jargão substituído (§Copy). «Salvar avaliação» desabilitado até todas as competências terem nota **e** as notas escritas existirem; cada aviso faltante aparece (`text-sm text-white/75`, ligado por `aria-describedby` ao botão) |
| `RHSidebar` (pendência) | «Dashboard» ativo na entrevista | `getActivePageFromPath`: `pathname.startsWith('/rh/candidato/')` → `'candidatos-rh'`, antes do fallback. Efeito: nos workspaces `/rh/candidato/:id/{redacao,entrevista,decisao}` o item «Candidatos» acende |
| `ProvenienciaIABadge` (defeito b, D-23) | Frase com «modelo» duplicado | §Copy — muda em `textoProveniencia`, portanto na tela **e** no PDF |
| `ResponderRevisaoDialog` (51-17, `humana_triagem`) | Motivo e justificativa | Só quando `origem = 'humana_triagem'`: dois pares a mais no bloco de contexto, `sm:col-span-2`: «Motivo da rejeição» (rótulo de `MOTIVO_OPTIONS`) e «Justificativa registrada» (`text-base whitespace-pre-wrap text-white/90`, **nunca truncada**). Ausente → «Não registrado». No knockout (`automatica`) nada muda — lá o `ContextoKnockoutRevisao` já mostra o que encerrou |

---

## Copywriting Contract

Toda a copy em **pt-BR**. Regras herdadas e vinculantes: «avaliação comportamental/cognitiva», **nunca** o termo
clínico (CLAUDE.md); nenhuma frase implica rejeição, ordenação ou corte por score (RNF-07a); nenhum percentil;
`N` = «Sensibilidade Emocional». Toda frase nova mora numa constante exportada (`COPY_*`), nunca literal no JSX —
é o que torna as asserções de copy testáveis (molde PATTERNS §N da 51).

| Element | Copy |
|---------|------|
| Primary CTA (cabeçalho do hub) | **«Enviar e-mail»** · **«Chamar no WhatsApp»** |
| Abas (D-17, travado) | «Resumo» · «Cadastro e inscrição» · «Avaliações» · «Histórico» |
| Linha da vaga no cabeçalho | «Vaga: {título}» (sem título: a linha não renderiza) |
| Assunto do e-mail (D-14) | «Beauty Smile — sua candidatura para {vaga}» · sem vaga: «Beauty Smile — sua candidatura» |
| Mensagem do WhatsApp (D-13) | «Olá, {primeiro nome}! Aqui é da Beauty Smile, sobre a sua candidatura para {vaga}.» · sem vaga: «Olá, {primeiro nome}! Aqui é da Beauty Smile, sobre a sua candidatura.» |
| WhatsApp inválido | «Número fora do formato do WhatsApp — confira o cadastro.» |
| Empty state — contato | «Sem contato disponível.» |
| Error state — contato | «Não foi possível carregar o contato.» + botão **«Recarregar contato»** (refaz só a leitura do contato) |
| Empty state heading — cadastro | «Não há dados de cadastro disponíveis para esta candidatura.» |
| Valor ausente (cadastro) | «Não informado» |
| Empty state — inscrição | heading «Nenhuma resposta de formulário registrada para esta candidatura.» · body «Se a vaga tiver perguntas, elas aparecem aqui na ordem do formulário.» (não alega causa — memória «allowlist restritiva torna causas indistinguíveis») |
| Resposta ausente | «Sem resposta» |
| Pergunta removida | «Pergunta removida do formulário depois da inscrição.» |
| Selo eliminatória (D-19) | «Eliminatória» |
| Error state — seções novas do hub | o do `HubSection`, verbatim: «Não foi possível carregar esta seção.» / «Tente recarregar a página.» |
| Contagem (defeito c) | `COPY_AVALIACOES_RESPONDIDAS.contagem(n)` — «1 avaliação respondida» / «{n} avaliações respondidas» — **uma ocorrência no DOM do hub** |
| SJT MC — legenda | «Alternativas na ordem do banco — o candidato as viu embaralhadas.» |
| SJT MC — título do item | «Situação {n}» |
| SJT MC — marca | «Escolhida» |
| SJT MC — alternativa sumida | «A alternativa escolhida não está mais no banco de itens.» |
| Caso aberto — rótulos | «Texto do candidato» · «Trechos marcados: citados pela análise da IA.» · «Citações não localizadas no texto» · «Pontos de atenção» |
| Big Five — aviso fixo (D-07) | **«Perfil comportamental autodeclarado: descreve, não classifica. Não é critério de aprovação nem de rejeição.»** |
| Big Five — recolhível (D-06) | «Ver devolutiva» / «Ocultar devolutiva» · cabeçalho do conteúdo: «Texto que o candidato recebeu» |
| Big Five — sem devolutiva | «Big Five respondido. A devolutiva não está disponível, por isso as faixas não são mostradas.» |
| Big Five — devolutiva com erro | «Não foi possível carregar a devolutiva.» + botão **«Recarregar devolutiva»** |
| SJT MC — situações com erro | «Não foi possível carregar as situações.» + botão **«Recarregar situações»** |
| Caso aberto — erro da leitura do texto | `COPY_RESPOSTA_CASO_ABERTO.erro` + `.tentarDeNovo`, **verbatim** — constante existente, compartilhada com a Decisão Final; não é renomeada por esta fase |
| Big Five — não fez | «Big Five — Não fez» (existente) |
| Proveniência, `modelo_ia` nulo (D-23) | **«Modelo não registrado»**; com a data da análise ≤ 22/09/2026: **«Modelo não registrado (análise anterior a 22/09/2026)»**; contingência sem modelo: «Gerado pelo modelo de contingência (modelo não registrado)». **Nunca** «Gerado pelo modelo modelo não registrado» |
| Saída da prova (D-24) | «Voltar às avaliações» (5 telas) · «Ir ao painel» (Raven) |
| **Destructive confirmation — sair da prova sem rascunho** (SJT MC, Raven) | Título **«Sair da avaliação?»** · corpo **«Se sair agora, as respostas desta prova não serão salvas.»** · cancelar **«Continuar»** · confirmar **«Sair»** (destrutivo). Os dois rótulos e o corpo são **verbatim da D-24** («com **Sair** e **Continuar**», 52-CONTEXT) — travados; não trocar por «Sair da avaliação»/«Continuar a avaliação». O objeto da ação fica dito pelo título do diálogo, que nomeia a avaliação |
| Cronômetro do SJT MC (D-26) | «Tempo decorrido: {mm:ss} (sem limite de tempo)» |
| Devolutiva do candidato (pendência f) | «Ver devolutiva» |
| Painel do candidato (D-27) | «Avaliações concluídas — aguardando a equipe» · selo «Aguardando a equipe» |
| Navbar do candidato | «Meu painel» |
| Login com sessão | «Verificando sua sessão…» |
| Entrevista — subtítulo (D-25) | sai «BARS sliders 1–5 — notas_humanas. A decisão é sempre humana.»; entra **«Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.»** |
| Entrevista — aviso de nota faltante | «Escolha uma nota para todas as competências para salvar a avaliação.» |
| Entrevista — rótulo das notas | «Notas do gestor (obrigatório)» (sufixo em `font-normal text-white/70`, padrão de `RejeitarCandidaturaDialog:133-134`) |
| Revisão `humana_triagem` | «Motivo da rejeição» · «Justificativa registrada» · ausente: «Não registrado» |

### Bans desta fase e o escopo de cada um

| Ban | Escopo da varredura | Por quê |
|---|---|---|
| `percentil` / dígito de percentil renderizado | componentes do Big Five no hub (`BigFiveResultadoHub` e o que ele importa) | UX-07 / D-02. O tipo sem o campo é a trava principal (Invariante 1); a varredura é a segunda |
| «Gerado pelo modelo modelo» | `src/` inteiro | defeito (b) |
| «BARS sliders», «notas_humanas» como texto visível | `src/features/entrevista/` (fora de comentário) | D-25 |
| «Tempo sugerido» | `src/features/avaliacao/` | D-26 |
| «passou», «reprovou», «atingiu o corte» perto do selo «Eliminatória» | `RespostasInscricaoBloco` | D-19 |
| `text-xs`, `text-lg`, `text-xl`, `text-3xl`+, `md:text-2xl` (qualquer tamanho fora de 14/16/24/48 ou variante responsiva de tamanho) e `font-medium`/`font-bold` | arquivos criados ou reestilizados pela fase (comando em §Typography); **não** `src/` inteiro | Dimensão 4 — quatro tamanhos, dois pesos. A herança medida da §Typography fica fora da varredura de propósito |
| O termo clínico | todas as frases novas | CLAUDE.md. A exceção do rodapé negado da devolutiva (`_NEG`, operador 2026-09-22) vale também no hub: o `disclaimer_lgpd_crp` é renderizado **como veio** da devolutiva |

**Guardas de rótulo:** `rotulos-navegacao-candidato.grep.test.ts` continua valendo e **tem de seguir mordendo**
depois desta fase — o botão de saída novo está dentro das raízes vigiadas (`src/features/avaliacao`,
`src/features/avaliacao-cognitiva`). «Meu painel» mora em `src/components/layouts/`, fora delas, e não colide com
o padrão `voltar (ao|para o) painel`.

---

## UI Considerations

Derivado do `ui-consideration-probe` com **`elements` autorados** (a prosa é pt-BR; os cues do classificador
são em inglês — classificar pela prosa daria falso verde, mesma nota metodológica das 42–47).

Applicable state considerations resolved: **54 aplicáveis · 54 resolvidas · 0 não resolvidas** — 42 explícitas (✅), 12 backstop (🧪). Re-execução do motor pós-verificação (2026-10-10, mesmos `elements` autorados + `text_en`): 51 linhas do motor, todas presentes nesta tabela; nenhuma linha da tabela fora do motor além das 3 autoradas. Tipos confirmados pelo operador.

Elementos: **E1** cabeçalho de contato (`interactive-control`) · **E2** abas do hub (`nav`) · **E3** dados do
cadastro (`list-collection` · `static-content`) · **E4** respostas da inscrição (`list-collection` ·
`static-content`) · **E5** Big Five no hub (`list-collection` · `interactive-control`) · **E6** SJT MC no hub
(`list-collection`) · **E7** texto do caso aberto (`static-content`) · **E8** saída da prova com confirmação
(`interactive-control`) · **E9** notas BARS da entrevista (`form`) · **E10** painel do candidato com avaliações
concluídas (`interactive-control`).

> Contagem: E1 = 3 · E2 = 4 · E3 = 8 · E4 = 8 · E5 = 8 · E6 = 7 · E7 = 2 · E8 = 3 · E9 = 5 · E10 = 3 → 51,
> **mais 3 linhas autoradas** fora do motor (E3 · `scope`, E5 · `privacy`, E1 · `privacy`) porque o risco real
> delas não cabe em categoria de forma → **54**. Raven, navbar, login, «Agradecemos», `SelectItem`, sidebar,
> proveniência e diálogo de revisão são emendas de classe/texto sem estado novo; as provas deles estão nas linhas
> de backstop abaixo (E2/E8) e na §Acessibilidade.

| # | Elemento | Category | Status | Resolution / Reason |
|---|---|---|---|---|
| E1 | Contato | loading | ✅ covered | `Skeleton h-10 w-full max-w-md bg-white/5` no lugar da linha de contato enquanto a leitura de dados pessoais está em voo; nome e etapa continuam com o skeleton existente |
| E1 | Contato | error | ✅ covered | «Não foi possível carregar o contato.» + «Recarregar contato» (refetch). O resto do hub funciona — a falha do contato não derruba as abas |
| E1 | Contato | long-text | ✅ covered | E-mail `break-all`; a linha é `flex flex-wrap gap-4` — a 360px cada par (valor + botão) quebra para a linha de baixo, nunca rola na horizontal, nunca trunca |
| E1 | Contato | privacy | 🧪 backstop | Os dois riscos: `@invalido.local` vazando como contato (anonimizado/fictício) e WhatsApp com número inválido virando link quebrado. **Backstop:** testes puros de `normalizarCelularWhatsApp` (10, 11, 12, 13 dígitos; DDD `0x`; vazio; com máscara) e teste de render provando que `@invalido.local` produz «Sem contato disponível.» **sem** `href` `mailto:` no DOM |
| E2 | Abas | loading | ✅ covered | As abas renderizam imediatamente (são estáticas); cada `TabsContent` delega carregando às suas `HubSection` |
| E2 | Abas | error | ✅ covered | Erro é por seção (`HubSection`), nunca da aba inteira. `?aba=` inválido → `resumo`, sem erro |
| E2 | Abas | overflow | ✅ covered | `TabsList flex-wrap h-auto gap-2` — a 360px as 4 abas quebram em 2 linhas sem cobrir o conteúdo (defeito 31 já pago na devolutiva) |
| E2 | Abas | long-text | 🧪 backstop | O risco real é **navegação**: aba perdida ao voltar de um workspace e item de menu errado aceso. **Backstop:** (i) teste do hub com `?aba=avaliacoes` montando a aba certa e trocando de aba com `replace` (sem nova entrada de histórico); (ii) teste de `getActivePageFromPath('/rh/candidato/x/entrevista') === 'candidatos-rh'` **e** de que `/rh/candidatos` continua `candidatos-rh` |
| E3 | Cadastro | empty | ✅ covered | Sem linha de candidato legível → «Não há dados de cadastro disponíveis para esta candidatura.» (sem causa) |
| E3 | Cadastro | loading | ✅ covered | Skeleton do `HubSection` |
| E3 | Cadastro | error | ✅ covered | Copy de erro do `HubSection` |
| E3 | Cadastro | populated | ✅ covered | `<dl>` em `sm:grid-cols-2`, 10 pares + «Endereço» com 7, na ordem da tabela §Aba Cadastro |
| E3 | Cadastro | partial | 🧪 backstop | O caso dominante em PROD: `cpf`/`genero` nulos desde a Phase 8. **Backstop:** fixture com campos nulos renderiza «Não informado» em cada um, **nenhum** `—`, `null`, `undefined` ou célula vazia; e «Detalhes de como conheceu» some quando nulo |
| E3 | Cadastro | overflow | ✅ covered | Grade de altura livre; abaixo de `sm:` uma coluna; `break-words` em todo valor |
| E3 | Cadastro | zero-one-many | ✅ covered | A ficha é de uma pessoa — número fixo de campos; não há singular/plural |
| E3 | Cadastro | long-text | ✅ covered | Logradouro, complemento e detalhes inteiros, `break-words`, sem `truncate`/`line-clamp` |
| E3 | Cadastro | scope | ✅ covered | **Disponibilidade entra** (operador, 2026-10-10, D-52-U18): 3º sub-bloco «Disponibilidade» com Turno preferido, Modelo de trabalho e Início (§Aba Cadastro). A leitura da tabela `disponibilidade` vai pelo **mesmo** caminho de servidor com log da D-10/D-11 — o planejador alarga esse caminho desde o início, não por leitura direta do cliente; ausência de linha → «Não informado» nos três pares |
| E4 | Inscrição | empty | ✅ covered | Copy de vazio da §Copy, sem alegar causa |
| E4 | Inscrição | loading | ✅ covered | Skeleton do `HubSection` |
| E4 | Inscrição | error | ✅ covered | Copy de erro do `HubSection` |
| E4 | Inscrição | populated | ✅ covered | Grupos por `bloco` com `ROTULO_BLOCO`, `<ol>` na `ordem`, uma ficha neutra por pergunta |
| E4 | Inscrição | partial | 🧪 backstop | Pergunta sem resposta, pergunta removida com resposta, opção de múltipla escolha cujo texto não resolve. **Backstop:** fixture com os três casos renderizando «Sem resposta», a nota de pergunta removida e o código cru da opção (nunca célula vazia) |
| E4 | Inscrição | overflow | ✅ covered | Fichas de altura livre, empilhadas; URL `break-all` |
| E4 | Inscrição | zero-one-many | ✅ covered | Cabeçalho neutro ao número («Respostas da inscrição»); grupos sem pergunta não renderizam título |
| E4 | Inscrição | long-text | 🧪 backstop | O risco real é **gabarito e injeção**, não comprimento. **Backstop:** (i) a pergunta eliminatória renderiza o selo e a resposta, e o DOM **não** contém as opções não escolhidas nem a palavra de corte (D-19, Invariante 3); (ii) resposta com `javascript:alert(1)` e com `<script>` renderiza como texto, sem `href` e sem elemento novo; resposta com `https://x.com/a.` vira link sem o ponto final |
| E5 | Big Five | empty | ✅ covered | Sem linha `big_five` → «Big Five — Não fez» |
| E5 | Big Five | loading | ✅ covered | Skeleton `h-40 bg-white/5` no lugar das faixas enquanto a devolutiva carrega |
| E5 | Big Five | error | ✅ covered | «Não foi possível carregar a devolutiva.» + «Recarregar devolutiva»; o aviso fixo continua visível |
| E5 | Big Five | populated | ✅ covered | Aviso fixo + 5 linhas (rótulo, faixa, `BandaSegments`) na ordem O C E A N + «Ver devolutiva» |
| E5 | Big Five | partial | 🧪 backstop | Linha `big_five` sem devolutiva, e devolutiva com menos de 5 dimensões. **Backstop:** o primeiro mostra a frase de indisponível **sem nenhuma faixa** (nunca faixa de `metadata.dimensoes` — Invariante 2); o segundo mostra só as dimensões presentes, na ordem, sem placeholder |
| E5 | Big Five | overflow | ✅ covered | Texto aberto em altura livre dentro da seção; sem scroll interno, sem `max-h` |
| E5 | Big Five | zero-one-many | ✅ covered | Número fixo (≤5) de dimensões; nenhuma frase do tipo «as cinco dimensões» |
| E5 | Big Five | long-text | ✅ covered | `texto_interpretativo` integral, `whitespace-pre-line`, nunca truncado |
| E5 | Big Five | privacy | 🧪 backstop | UX-07. **Backstop:** (i) o tipo de entrada de `BigFiveResultadoHub` não tem `percentil` (checagem de tipo + teste que monta o componente com um objeto contendo `percentil: 87` e prova que `87` não aparece no DOM); (ii) os testes que travavam «sem resultado no hub» (D-32/51) são **substituídos**, não apagados: passam a travar «faixa sim, percentil não»; (iii) o card da **lista** do RH continua «Concluído / Não fez» (D-05) — teste existente segue verde |
| E6 | SJT MC | empty | ✅ covered | Sem linha `sjt`/`mc` → o card não renderiza (a seção já diz a contagem) |
| E6 | SJT MC | loading | ✅ covered | Skeleton `h-24 bg-white/5` por situação enquanto pergunta/alternativas carregam |
| E6 | SJT MC | error | ✅ covered | «Não foi possível carregar as situações.» + «Recarregar situações»; a pontuação (já carregada) continua visível |
| E6 | SJT MC | populated | ✅ covered | Situação → cenário → todas as alternativas na ordem do banco, a escolhida com borda, `Check`, «Escolhida» e a etiqueta pt-BR + peso |
| E6 | SJT MC | partial | 🧪 backstop | O caso perigoso é o **gabarito**: etiqueta aparecendo em alternativa não escolhida. **Backstop:** fixture de 4 alternativas com tags distintas renderiza **exatamente uma** etiqueta (a da escolhida); alternativa escolhida ausente do banco → frase de «não está mais no banco» |
| E6 | SJT MC | overflow | ✅ covered | Alternativas em altura livre, `break-words`; 6 situações empilhadas sem scroll interno |
| E6 | SJT MC | zero-one-many | ✅ covered | «Situação {n}» por item; nenhuma frase de total fixo (o banco de pré-vendas passa de 1 para 6 itens nesta fase — JORN-52) |
| E7 | Caso aberto | overflow | ✅ covered | Caixa de altura livre; o grid lateral só existe com citação não localizada; empilhado abaixo de `md:` |
| E7 | Caso aberto | long-text | 🧪 backstop | Marcação por segmentos e legibilidade. **Backstop:** (i) texto com citação localizada renderiza `<mark>` com o trecho e **zero** `dangerouslySetInnerHTML` no componente; (ii) citação não localizada aparece na lista lateral; (iii) citações sobrepostas viram um `<mark>`; (iv) o texto é `text-base` (não `text-xs`) e não tem `text-amber` no hub, e a Decisão Final continua âmbar |
| E8 | Saída da prova | loading | ✅ covered | O botão existe desde o primeiro render da prova; não depende de leitura |
| E8 | Saída da prova | error | ✅ covered | Sair é navegação local — não há falha de rede. Nas telas com rascunho, um rascunho pendente de gravação segue o fluxo do `useAutosaveAvaliacao` (sem novo estado) |
| E8 | Saída da prova | long-text | 🧪 backstop | O risco real é **rótulo × destino** e **perda silenciosa**. **Backstop:** (i) `rotulos-navegacao-candidato.grep.test.ts` verde e provado mordendo (mutação: trocar o rótulo do Raven para «Voltar ao painel» reprova); (ii) SJT MC com 1 resposta → clique abre o diálogo, «Continuar» mantém a resposta, «Sair» navega; com 0 respostas → navega sem diálogo; (iii) Raven idem com destino `/candidato/dashboard`; (iv) as 4 telas com rascunho saem sem diálogo |
| E9 | Notas BARS | empty | ✅ covered | Ao abrir, nenhuma nota marcada em nenhuma competência (`aria-checked="false"` nos 5 de cada); «Salvar avaliação» desabilitado com os dois avisos visíveis |
| E9 | Notas BARS | loading | ✅ covered | `saving` desabilita o `fieldset` (existente) |
| E9 | Notas BARS | error | ✅ covered | `SCORECARD_TOAST.error` (existente) |
| E9 | Notas BARS | partial | 🧪 backstop | O ponto da D-25. **Backstop:** com 3 de 4 competências notadas e notas escritas, «Salvar» segue desabilitado e o aviso de nota faltante visível; com 4 de 4 e notas vazias, desabilitado pelo aviso de notas; com tudo, habilitado. E **nenhum** valor inicial vem de `competenciasIA[].score` (fixture com `score: 4` abre sem nada marcado) |
| E9 | Notas BARS | long-text | ✅ covered | Nome de competência longo quebra acima dos botões (`space-y-2`); os 5 botões nunca encolhem abaixo de 44px (quebram com `flex-wrap`) |
| E10 | Painel do candidato | loading | ✅ covered | Enquanto o status das avaliações carrega, o «Próximo passo» mostra o CTA de hoje (sem skeleton, sem piscar para vazio) — D-52-U16 |
| E10 | Painel do candidato | error | ✅ covered | Falha na leitura do status → CTA de hoje; a lista de avaliações já diz «Tudo concluído» a quem clicar |
| E10 | Painel do candidato | long-text | 🧪 backstop | O risco real é **mudar o banco** ou **esconder ação devida**. **Backstop:** (i) nenhuma escrita em `candidaturas` no caminho (D-27); (ii) com uma avaliação pendente o CTA «Continuar para …» continua; (iii) com todas concluídas aparece a frase e **não** há `<button>` no «Próximo passo»; (iv) a frase quebra linha a 360px sem truncar |

<!-- Status vocabulary (locked by probe-core projectTruths):
     ✅ covered   → a plain truth string lifted into must_haves.truths
     🧪 backstop  → a flat scalar { statement, verification: backstop }; at verify time, no explicit
                    evidence → insufficient_spec → human_needed (never a silent pass, #1154)
     ⚠ unresolved → an explicit planner assumption (surfaced, never silently dropped)
     Rows are REPLACED (not appended) on a probe re-run — idempotent. -->

### Acessibilidade (piso, não varredura completa)

- **Abas:** Radix Tabs já dá `role="tablist"/"tab"/"tabpanel"`, setas do teclado e `aria-selected`. Não substituir por botões soltos.
- **Recolhível da devolutiva:** `aria-expanded` + `aria-controls` no botão (molde 51-02).
- **Botões de nota da entrevista:** `role="radiogroup"` com `aria-label` da competência; cada botão `role="radio"`, `aria-checked`, rótulo acessível «{n} de 5». Setas não são exigidas (o seletor de análise vizinho também não tem); Tab percorre os botões.
- **Alternativa escolhida no SJT MC:** a palavra «Escolhida» carrega a informação — nunca só borda ou ícone.
- **Selo «Eliminatória» e faixas do Big Five:** palavra, nunca só cor.
- **`<mark>` do caso aberto:** a legenda «Trechos marcados…» antecede o texto; o trecho continua legível sem a cor.
- **Ficha do cadastro e respostas:** `<dl>/<dt>/<dd>` e `<ol>` semânticos; `h3` reais para «Endereço» e para os blocos.
- **Links externos:** `aria-label` com «(abre em nova aba)»; ícones `aria-hidden="true"`.
- **Diálogo de perda:** foco inicial em «Continuar» (padrão do `AlertDialog`); `Esc` = Continuar.
- **Alvos táteis:** 44px em todo controle novo (§Spacing).
- **Raven no shell:** a matriz em ladrilho branco mantém o contraste do desenho; o `alt` existente da matriz não muda.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | **nenhum bloco novo** — só primitivos já vendorizados (`tabs`, `alert-dialog`, `card`, `badge`, `skeleton`, `select`) | not required — nenhum `add`/`init` executado |
| third-party | **nenhuma declarada** | not applicable |

**Zero dependência npm nova.** Explicitamente recusados: biblioteca de máscara (CPF/CEP/celular são helpers de
5 linhas), biblioteca de highlight de texto (a marcação é por segmentos, Invariante 5), biblioteca de linkify
(regex com lista de esquemas, Invariante 6), pacote de ícones de marca para WhatsApp (`MessageCircle` do lucide).

---

## Decisões tomadas nesta UI-SPEC (dentro da §Claude's Discretion ou forçadas por fato medido)

As 33 decisões do `52-CONTEXT.md` estão travadas e foram honradas. Abaixo, o que esta UI-SPEC escolheu, cada
uma com a alternativa recusada, para que o operador possa reverter uma sem reabrir o resto.

| # | Decisão | Alternativa recusada | Por quê |
|---|---|---|---|
| **D-52-U01** | **Distribuição das seções:** Resumo = Próximo passo, Linha do funil, Currículo, Análise da IA, Agendamento, Decisão Final; Avaliações = assíncrona, prova cognitiva, Raven, redação, entrevista | Agendamento e Decisão Final na aba Avaliações | A D-17 diz o que o Resumo tem «hoje no topo», mas não diz para onde vão Agendamento e Decisão Final. São **operação** (marcar, decidir), não resposta do candidato; ficam perto das ações de decisão. Entrevista (nota registrada) é avaliação |
| **D-52-U02** | **Aba na URL** (`?aba=`, `replace`) | Estado só em memória | Voltar de um workspace para o hub cairia sempre no Resumo. `replace` evita que trocar de aba encha o histórico |
| **D-52-U03** | **Avaliação assíncrona: o dado vence a etapa**; detalhe aberto dentro da seção; `AvaliacoesRespondidasBloco` sai do hub | Manter o bloco irmão com «Ver respostas» | A D-18 manda tudo aberto; com tudo aberto, o bloco irmão só repetiria a contagem — é o defeito (c). O motivo de o bloco ser irmão (51-02: caminho em qualquer etapa) é preservado pela regra de estado |
| **D-52-U04** | **Faixa só da devolutiva; sem devolutiva, sem faixa** | Fallback para `scores_candidato.metadata.dimensoes[].banda` | Medido: a EF recalcula a banda (`bandOf`), então as duas fontes podem divergir. A D-04 promete «o que o candidato viu» — uma faixa de outra fonte quebraria a promessa em silêncio |
| **D-52-U05** | Texto do aviso: «Perfil comportamental autodeclarado: descreve, não classifica. Não é critério de aprovação nem de rejeição.» | «Perfil de personalidade: …» (o exemplo da D-07) | «Perfil comportamental» é o termo que o candidato leu na devolutiva («Seu perfil comportamental»); «autodeclarado» diz a verdade sobre o instrumento; «nem de rejeição» fecha a leitura de RNF-07a pelos dois lados |
| **D-52-U06** | **Sem `SugestaoIABadge` no Big Five** | Pôr o selo porque o texto da devolutiva passa por IA | O selo diz «sugestão da IA — decisão é sempre humana»: ao lado do Big Five, ele enquadraria o perfil como **insumo de decisão** — o contrário da D-07. O texto é rotulado pelo que é: «Texto que o candidato recebeu» |
| **D-52-U07** | Etiquetas do SJT em pt-BR + alternativas na ordem do banco, com legenda | Código cru (`fortemente_pontua`) e ordem qualquer | O código cru é jargão na tela (51-UI-REVIEW); a legenda evita que o RH tome a ordem mostrada pela que o candidato viu |
| **D-52-U08** | Citação marcada com accent a 30% + legenda; não localizadas ao lado | Marcar em âmbar ou sem cor | Âmbar é a caixa que a D-22 tira. Turquesa já é o sinal de IA do hub; 30% preserva contraste |
| **D-52-U09** | Texto do caso aberto a **16px** no hub | Manter 12px | «Mais legível» (D-22) — 12px em texto de leitura corrida não é |
| **D-52-U10** | Linha «Vaga: {título}» no cabeçalho | Só o nome e a etapa | O título é lido de qualquer forma para as mensagens de contato (D-13/D-14); o RH que chega pelo link precisa saber de qual vaga é a candidatura |
| **D-52-U11** | `@invalido.local` = sem contato, frase neutra | Mostrar o e-mail substituto | Mostrar `anonimizado+<id>@…` diria ao recrutador que houve exclusão (Invariante 9 da 45) e ofereceria um `mailto:` para lugar nenhum |
| **D-52-U12** | **Notas da entrevista: 5 botões em `radiogroup`, sem slider** | `Slider` do Radix com `value={[]}` | O Slider do Radix não tem estado vazio: sem valor não há polegar, e o clique na trilha procura o polegar mais próximo de uma lista vazia (`getClosestValueIndex` → `-1`). «Começar vazio» (D-25) exige um controle que tenha «nenhum». O seletor de análise do mesmo arquivo já é um `radiogroup` de botões — o molde está ao lado. A nota da IA **não** aparece junto do controle: aparecer é ancorar, que é o viés que a D-25 remove |
| **D-52-U13** | Subtítulo com jargão **substituído** por instrução simples | Só apagar | Sem instrução, «1 a 5» fica sem escala dita; a frase nova não tem jargão e mantém «A decisão é sempre humana» |
| **D-52-U14** | No Raven, o botão de saída diz **«Ir ao painel»** | «Voltar às avaliações», como a D-24 nomeia | O Raven vive fora do container e o caminho dele é o painel (D-37 da 51, `AvaliacaoRavenScreen.tsx:51`). A guarda de rótulos exige que o rótulo diga o destino — «Voltar às avaliações» indo ao painel recriaria o defeito C-11 |
| **D-52-U15** | Confirmação de perda **só com ≥1 resposta marcada** | Sempre confirmar | Sem resposta não há perda; um diálogo dizendo «as respostas não serão salvas» seria falso |
| **D-52-U16** | Painel: selo também muda («Aguardando a equipe»); carregando/erro mantêm o CTA de hoje | Mudar só o rodapé; ou skeleton no lugar do CTA | «Aguardando Resposta» ao lado de «aguardando a equipe» se contradiz (lê-se «esperando o candidato»). Na falha, o CTA de hoje leva à lista, que já diz «Tudo concluído» — falha segura, sem esconder ação devida |
| **D-52-U17** | Proveniência: frase inteira «Modelo não registrado», parêntese de data **só** com data ≤ 22/09/2026 | O parêntese fixo da D-23 em toda linha nula | Medido (D-23): as 22 nulas são todas anteriores a 22/09. Mas uma nula **futura** (regressão) leria «anterior a 22/09» — uma mentira plausível. Sem data, a frase diz só o que se sabe |
| **D-52-U18** | **Disponibilidade entra** no hub como 3º sub-bloco de «Dados do cadastro» — **decidido pelo operador em 2026-10-10** na rodada pós-verificação desta UI-SPEC (antes proposta como ⚠ para o portão do bloco B) | Deixar para o portão do bloco B; ou fora | O verbatim da G-51-OP1 diz «todos os dados preenchidos no cadastro». A leitura alargada vai pelo caminho de servidor com log da D-10/D-11, nunca direto do cliente |
| **D-52-U19** | «Red flags» → «Pontos de atenção» | Manter | Inglês em UI pt-BR (51-UI-REVIEW, INFO); o card é reestilizado por esta fase |
| **D-52-U20** | «Tempo decorrido: … (sem limite de tempo)» | «(sem limite rígido)» | «Rígido» sugere que existe um limite flexível |
| **D-52-U21** | `SelectItem`: realce turquesa 20% herdando a cor do texto | Forçar texto escuro | Metade dos consumidores passa fundo azul próprio (`bg-[#00109E]/95`); só a herança acerta os dois fundos |
| **D-52-U22** | **Título de seção do hub: 24px fixo** (`text-2xl` nos 5 lugares da §Typography) — tamanhos do contrato = {14, 16, 24, 48} | 20px fixo (`text-xl`) | 24 é o valor da 17-UI-SPEC e o que o desktop já mostra (nenhuma mudança visual na persona principal); 24 coincide com a nota do `AnaliseIABlock`; 20 manteria a nota de 24px como um 5º tamanho na aba Resumo |
| **D-52-U23** | **Os `text-xs` dos cards da avaliação assíncrona sobem a 14px** (inclusive as duas chamadas de `SugestaoIABadge` dentro do card, por `className`); o que a fase só muda de aba fica como herança medida, listada com arquivo:linha | Deixar os badges de `ScorecardAvaliacao` em 12px; ou subir também `SugestaoIABadge`/`AsyncState` no componente | A fase reestrutura esses cards e é o único lugar onde eles renderizam (`AvaliacoesRespondidasBloco.tsx:74` sai do hub) — 12px ali seria tamanho autorado. Mudar o primitivo compartilhado mudaria 11–16 arquivos de tela fora da fase |
| **D-52-U24** | Botões de recarregar nomeiam o objeto: «Recarregar contato» / «Recarregar devolutiva» / «Recarregar situações» | «Tentar de novo» genérico | Três erros independentes podem aparecer na mesma tela; o rótulo diz qual leitura refaz. A constante existente do caso aberto (`COPY_RESPOSTA_CASO_ABERTO.tentarDeNovo`) fica — é compartilhada com a Decisão Final |

**Decisões revistas pelo operador (2026-10-10):** **D-52-U12** (botões 1–5 começando vazios no lugar do slider) e
**D-52-U14** («Ir ao painel» no Raven) **aceitas** — registradas no `52-CONTEXT.md` como emendas que substituem a
D-25 e a D-24 nesses dois pontos; **D-52-U18** (Disponibilidade) decidida — entra.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS (FLAG — «Sair»/«Continuar» verbatim da D-24; D-52-U14 diverge da D-24 com justificativa)
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS (FLAG — herança medida fora do contrato, todo `ui-spec-text-xs-quinto-tamanho`)
- [x] Dimension 5 Spacing: PASS (FLAG — exceção `p-3` nos ladrilhos do SJT MC)
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS

**Approval:** approved 2026-10-10 (gsd-ui-checker, revisão 1; rev. 0 BLOCK na Dimensão 4 resolvido)
