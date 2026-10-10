# Phase 51 — UI Review

**Auditado:** 2026-10-10
**Base de comparação:** padrões abstratos dos 6 pilares + o design system do projeto (Tailwind, shadcn/ui, glass UI Beauty Smile; tokens em `src/styles/globals.css`). A fase não tem UI-SPEC.md.
**Escopo:** os arquivos `.tsx` de `git diff --name-only cd92cf42..HEAD -- src` (27 componentes, sem contar testes), mais os arquivos citados pelo operador na sessão real (`select.tsx`, `FormularioCandidaturaPage.tsx`, `LoginCandidatoPage.tsx`, `CandidatoNavbar.tsx`, `MeuPerfilCandidatoPage.tsx`).
**Screenshots:** não capturados. A auditoria foi feita só no código, por instrução do operador: não usar navegador contra PROD com contas reais. O dev server local fala com o Supabase de PROD.
**Interaction captures:** off (`workflow.ui_interaction_capture` desligado). Todos os achados de interação abaixo vêm da leitura do código; nenhum estado foi observado.

---

## Notas por pilar

| Pilar | Nota | Achado principal |
|-------|------|------------------|
| 1. Copywriting | 2/4 | Quatro telas dizem «Acompanhe pelo seu painel», mas o botão abaixo leva à lista. As instruções do Raven estão escritas e nunca aparecem. |
| 2. Visuals | 2/4 | A tela do Raven, que ganhou porta de entrada nesta fase, não usa o shell glass: fundo branco e botões «fantasma». Da área do candidato não há volta ao painel. |
| 3. Color | 2/4 | O `SelectItem` compartilhado fica branco sobre branco no hover e no foco (**BLOCKER**). Texto cinza sobre glass escuro no formulário. Branco sobre `#35BFAD` dá 2,3:1. |
| 4. Typography | 2/4 | 8 tamanhos e 4 pesos no escopo. Títulos irmãos do hub misturam caixa de título e caixa de frase. |
| 5. Spacing | 3/4 | A escala Tailwind é respeitada, e `min-h-[44px]` aparece 58 vezes. Três botões novos da fase ficam fora do alvo de 44px. |
| 6. Experience Design | 2/4 | O login ignora a sessão já aberta. O Raven não tem estado de erro. O status das provas fica velho ao voltar à lista. O header da lista de avaliações pode estourar no celular. |

**Total: 13/24**

---

## As 3 correções prioritárias

1. **[BLOCKER] `SelectItem` branco sobre branco**, em `src/components/ui/select.tsx:134-136`.
   - **Impacto:** no diálogo «Rejeitar» (ação auditada, cujo texto o candidato pode baixar), o RH não lê a opção sob o cursor. Quem usa teclado não lê a opção focada e escolhe às cegas.
   - **Correção:** no primitivo, trocar `hover:text-white focus:text-white focus:bg-white/25` e o bloco `[&_*]:…:!text-white` por `focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground`. O glass escuro vai para os consumidores que já passam `SelectContent` azul.
2. **O link do e-mail força o login mesmo com sessão**, em `src/components/pages/LoginCandidatoPage.tsx:59-130`.
   - **Impacto:** o candidato logado que abre «Ver a explicação e pedir revisão» vê o formulário de novo. Com o autofill, pode entrar com outra conta, como aconteceu na sessão.
   - **Correção:** criar um `useEffect` (ou um `<Navigate>`) no topo da página. Se `isAuthenticated && role === 'candidato'`, faz `navigate(resolveRedirect(searchParams.get('redirect')), { replace: true })` antes de renderizar o formulário.
3. **Sem caminho de volta ao painel na área do candidato**, em `src/components/layouts/CandidatoNavbar.tsx:102-127` e `src/components/pages/MeuPerfilCandidatoPage.tsx:353`.
   - **Impacto:** em `/candidato/perfil`, `/vagas` e `/vagas/:id`, o candidato só sai pelo botão «voltar» do navegador.
   - **Correção:** acrescentar à `CandidatoNavbar` um `GlassButton` «Meu painel» → `/candidato/dashboard`, com rótulo `hidden sm:inline` e `aria-label`, no mesmo molde dos dois que já existem. Também dá para tornar o logo um link para o painel.

---

## Defeitos que o operador relatou, conferidos no código

| # | Relato (51-17-SESSAO-REAL) | Confirmado? | Onde |
|---|---|---|---|
| R1 | No «Motivo da rejeição», o item sob o mouse fica branco sobre branco | **Sim. O defeito é do componente compartilhado.** | `src/components/ui/select.tsx:132-136`. Por causa do `twMerge` (`ui/utils.ts`), o `focus:bg-white/25` e o `focus:text-white` posteriores **sobrescrevem** o `focus:bg-accent` e o `focus:text-accent-foreground` da linha 132. O painel é `bg-popover` (linha 86), e `--popover` é `0 0% 100%`, ou seja branco (`globals.css:57`). Resultado: um véu branco de 25% sobre fundo branco, com texto branco. O Radix move o foco para o item no hover, então hover e teclado sofrem igual. |
| R1a | Quais Selects herdam | **Herdam todos os `<SelectContent>` sem fundo escuro próprio:** | RH/admin: `triagem/components/RejeitarCandidaturaDialog.tsx:147` (o relatado), `triagem/components/RetrocederCandidaturaDialog.tsx:159` (mesmo Kanban), `agendamento/components/AgendamentoBlock.tsx:278` (hub), `admin/components/NovoUsuarioDialog.tsx:231`, `admin/components/EditarPapelDialog.tsx:172`, `admin/ai-logs/components/AiLogsPage.tsx:232,253`, `admin/ai-costs/components/AiCostsPage.tsx:140`. Candidato: `cadastro/components/steps/EnderecoStep.tsx:376`, `DadosProfissionaisStep.tsx:80,113`. **Não herdam** (passam `bg-[#00109E]/95` ou `bg-accent/95`): `CandidatosRHPage`, `VagaCandidatosRHPage`, `CriarEditarVagaPage`, `SuporteRHPage`, `UpdateStatusModal`, `GuiaEntrevistaPanel`, `PerguntaWithTagsForm`, `RichTextEditor`, `VagasPublicasPage`. O `DadosPessoaisStep.tsx:273` usa `bg-white/15` num portal: a legibilidade depende do que estiver atrás. |
| R2 | «Agradecemos seu interesse na Beauty Smile.» com o estilo errado | **Sim, e o problema é maior que a linha.** | `src/components/pages/FormularioCandidaturaPage.tsx:537-548`. O `GlassCard variant="white"` é `bg-white/15` (`ui/glass.tsx:43`) sobre o gradiente com overlay preto, então o cartão é **escuro**. Mesmo assim, o h1 usa `text-gray-900` (538), o corpo `text-gray-700` (542) e a linha relatada `text-gray-500` (546). As três ficam escuras sobre escuro, e o `gray-500` é a pior. A mesma frase em `DashboardCandidatoPage.tsx:428-430` usa `text-sm text-white/60`, outro tratamento. A correção é passar o bloco inteiro para `text-white` / `text-white/80` / `text-white/70`, como os outros cartões glass do candidato (por exemplo, `ProvaCognitivaScreen.tsx:285`). |
| R3 | O link do e-mail vai a `/auth/login?redirect=…`, e o login não pula o formulário quando já há sessão | **Sim.** | O link é montado em `supabase/functions/_shared/email-config.ts:77-90` (`montarUrlLogin`). A rota não tem guarda (`src/router/routes.tsx:178-180`). A página não lê `useAuthStore` nem tem `useEffect` (`LoginCandidatoPage.tsx:59-90`). O `redirect` só é consumido dentro do `onSubmit` (`:129-130`). |
| R4 | Na «área board» não há botão para voltar ao dashboard | **Sim, na leitura mais provável: «área do candidato».** | O único link da `CandidatoNavbar` é «Área do candidato» → `/candidato/perfil` (`CandidatoNavbar.tsx:104-115`). Nenhum link leva ao painel, e o logo não é link (`:79`). O `MeuPerfilCandidatoPage.tsx:353` renderiza `showAreaLink={false}`, e o arquivo **não tem nenhuma** referência a `/candidato/dashboard`. Lá o candidato fica sem saída. As alternativas foram descartadas: o Kanban do RH (`VagaCandidatosRHPage.tsx:186-190`) tem «Voltar para Vagas» e sidebar, e as telas de avaliação ganharam «Ir ao painel» nesta fase. **A interpretação precisa da confirmação do operador.** |

---

## Achados detalhados

### Pilar 1: Copywriting (2/4)

- **WARNING: a frase e o botão divergem em 4 telas.** O 51-01 trocou os botões para «Voltar às avaliações», que leva à lista, mas manteve a frase «Acompanhe o andamento pelo seu painel» logo acima. O candidato lê «painel» e é levado à lista.
  - `ProvaCognitivaScreen.tsx:88` (`postSubmit`) com o botão em `:287-289`
  - `RedacaoEditorScreen.tsx:320` com o botão em `:322-324`
  - `DevolutivaBigFiveView.tsx:174` com o botão em `:176-178`
  - A frase do `AvaliacaoContainer.tsx:274` está certa, porque o botão abaixo vai ao painel.
  - Correção: trocar a frase por «Acompanhe o andamento pela lista de avaliações ou pelo seu painel», ou pôr os dois botões.
- **WARNING: o Raven começa sem instruções.** `AvaliacaoRavenScreen.tsx:41` define `subtitulo` («São 60 itens em ordem crescente de dificuldade. Escolha a peça que completa cada figura.»), e nenhuma linha o renderiza (grep: uma só ocorrência, a definição). O candidato cai direto no item 1 de 60. A tela só ficou alcançável nesta fase, pelo `RavenCandidatoCard`.
- **WARNING: o hub repete a contagem.** «N avaliações respondidas» aparece no corpo do `HubSection` «Avaliação Assíncrona» (`HubCandidatoRH.tsx:441-443`) e de novo no painel logo abaixo (`AvaliacoesRespondidasBloco.tsx:98-100`). São dois painéis glass seguidos com a mesma frase. Em `sem_dados`, a seção diz «Sem dados nesta etapa» e o bloco diz «Nenhuma avaliação respondida ainda.»
- **WARNING: a frase do card cognitivo não faz sentido.** «Sinaliza a prova cognitiva — não decide a etapa.» (`CognitivoBandCard.tsx:124`) saiu de uma troca mecânica de termo. Sugestão: «Banda da prova cognitiva — sinal para a entrevista, não decide a etapa.»
- **WARNING: um campo obrigatório sem marcador.** O rótulo «Notas do gestor» perdeu o «(opcional)» e não ganhou «(obrigatório)» (`EntrevistaScorecardInline.tsx:211`). O padrão do projeto, no mesmo fluxo de RH, é `(obrigatório)` em `font-normal text-muted-foreground` (`RejeitarCandidaturaDialog.tsx:133-134`). O aviso `entrevista-notas-obrigatorias` (`:229-233`) não está ligado ao textarea por `aria-describedby`.
- **INFO:** o rótulo «Red flags», em inglês, segue numa UI pt-BR (`ScorecardAvaliacao.tsx`, bloco `redFlags`). «Big Five — Não fez» é seco para uma tela de RH, mas é aceitável.
- **INFO, deliberado:** o candidato vê dois rótulos para o mesmo destino, «Ir ao painel» (avaliações, Raven) e «Voltar ao painel» (explicação, privacidade). O docblock do guard `rotulos-navegacao-candidato.grep.test.ts` registra isso como escolha. Mesmo assim, vale unificar no fecho do M8.
- **Pontos fortes:** o par de nomes «Prova cognitiva» / «Raciocínio lógico (Matrizes)» (D-15) foi aplicado de forma coerente em 9 arquivos. O vocabulário do selo de origem é fechado (`OrigemRevisaoBadge.tsx:33-37`). A cópia do contexto de knockout tem estados de carregando, erro, removida e indisponível (`ContextoKnockoutRevisao.tsx:29-40`).

### Pilar 2: Visuals (2/4)

- **WARNING: a tela do Raven fica fora do shell da marca.** `AvaliacaoRavenScreen.tsx:204` renderiza um `div` solto, sem `BackgroundImage`, sem `ScreenShell` e sem navbar. O fundo é o `body` (`bg-background` = branco, `globals.css:53`), e os `Glass variant="white"` (`bg-white/15`) somem nele. As outras telas do candidato usam gradiente com overlay. Esta é a única porta nova do candidato na fase.
- **WARNING: o CTA principal do Raven não tem preenchimento.** «Próximo item» / «Concluir avaliação» (`:288-291`) e «Ir ao painel» (`:173,188`) são `GlassButton` sem `className` de cor: `bg-white/15` sobre branco, só com borda e sombra. Não há ponto focal claro para a ação mais repetida da tela (60 vezes).
- **WARNING: a grade de alternativas não cresce no desktop.** As classes `sm:${…}` são montadas por template (`AvaliacaoRavenScreen.tsx:241-243`). `sm:grid-cols-8` e `sm:grid-cols-6` não aparecem literais em nenhum arquivo de `src/`, então o JIT do Tailwind não as gera, e a grade fica em 3 ou 4 colunas no desktop. Correção: usar literais completos, como `nOpcoes > 6 ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-3 sm:grid-cols-6'`.
- **WARNING: blocos irmãos do hub com hierarquias diferentes.** «Prova cognitiva» é um `HubSection` com `h2 text-xl md:text-2xl` (`HubSection.tsx:93`). Logo abaixo, «Raciocínio lógico (Matrizes)» é um eyebrow `text-sm uppercase text-[#35BFAD]` (`LiberacaoCognitivoBlock.tsx:73-75`). São dois instrumentos do mesmo nível com pesos visuais opostos, o que contraria a D-15 («distinguir os dois na mesma tela»).
- **WARNING:** o defeito R4 (área do candidato sem volta ao painel), descrito acima.
- **INFO:** o `RavenCandidatoCard` é um `GlassCard` dentro do `GlassCard` clicável da candidatura (`DashboardCandidatoPage.tsx:497-501`). O `stopPropagation` está certo, mas o card aninhado herda o hover de elevação do pai, e a área clicável fica ambígua.

### Pilar 3: Color (2/4)

- **BLOCKER:** o R1 / R1a, descrito acima (`select.tsx:134-136`). Pela forma, o defeito é do primitivo, e 9 Selects de RH/admin/candidato herdam. Pelo uso de agora, o pior caso é o diálogo de rejeição.
- **WARNING:** o R2, descrito acima. O bloco «Inscrição recebida» inteiro tem texto escuro sobre glass escuro (`FormularioCandidaturaPage.tsx:538,542,546`).
- **WARNING: o contraste dos CTAs teal fica abaixo do AA.** Branco sobre `#35BFAD` mede ≈ 2,3:1 (calculado: L(#35BFAD) ≈ 0,41). Isso reprova o AA tanto para texto normal (4,5:1) quanto para texto grande (3:1). Aparece nos CTAs novos da fase:
  - «Fazer a avaliação» (`RavenCandidatoCard.tsx:93`, 14px semibold)
  - «Ver respostas» (`AvaliacoesRespondidasBloco.tsx:108`, 16px semibold)

  O padrão vem do projeto inteiro, mas a fase o repetiu em superfícies novas. Sugestão: texto `#00109E` (primary) sobre teal, ou teal mais escuro no fundo.
- **WARNING: hex fixo onde existe token.** Há 47 ocorrências de `#35BFAD` em 12 dos 27 arquivos do escopo, e `--accent` já é `172 57% 48%` = `#35BFAD` (`globals.css:65`). Os componentes novos (`RavenCandidatoCard.tsx:79,93`, `AvaliacoesRespondidasBloco.tsx:108`) deviam usar `bg-accent` / `text-accent`.
- **WARNING: o foco fica invisível no fundo escuro.** Nenhum dos 27 arquivos tem `focus-visible:`. O anel global é `outline-ring/50` (`globals.css:159`), e `--ring` = `#00109E` (`:72`): contorno azul-marinho a 50% sobre os fundos `darkBlue` e gradiente. Os botões nativos novos (`AvaliacaoContainer.tsx:229-238`, `RavenCandidatoCard.tsx:87-97`, `AvaliacoesRespondidasBloco.tsx:102-111`, `ContextoKnockoutRevisao.tsx:82-88`) e o `GlassButton` (`ui/glass.tsx:186-221`) dependem dele.
- **INFO:** a coluna «Texto do candidato» usa `text-amber-100` (`ScorecardAvaliacao.tsx`, bloco D-20). No diálogo de revisão, âmbar é o tom de «revertida» (urgência). Tingir o texto do candidato com ele sugere alerta.
- **INFO:** o `OrigemRevisaoBadge` aplica glass neutro idêntico às três origens (`:27`). A escolha é correta e bem justificada.

### Pilar 4: Typography (2/4)

- **Distribuição no escopo:** tamanhos `text-xs`(39), `sm`(131), `base`(40), `lg`(7), `xl`(37), `2xl`(12), `3xl`(7), `4xl`(9), além de `text-5xl` (`HubCandidatoRH.tsx:257`) e `text-[11px]` (`BigFiveQuestionnaireScreen.tsx:241`). São 10 tamanhos. Pesos: `semibold`(139), `bold`(5), `medium`(7), `normal`(5), quatro no total. O padrão abstrato pede até 4 tamanhos e 2 pesos. O excesso vem em boa parte de telas antigas, mas a fase acrescentou `font-bold` no Raven (`AvaliacaoRavenScreen.tsx:170,186,216`) enquanto o resto do candidato usa `font-semibold`.
- **WARNING: títulos irmãos do hub com caixas diferentes.** «Avaliação Assíncrona» e «Decisão Final» usam caixa de título (`HubCandidatoRH.tsx:436,542`). «Prova cognitiva», «Redação» e «Entrevista» usam caixa de frase (`:465,494,524`). A fase renomeou uma das seções e deixou as vizinhas como estavam.
- **WARNING: rótulos pequenos com contraste baixo.** Os eyebrows `text-xs uppercase text-white/50` (12px a 50% de branco) aparecem em `ScorecardAvaliacao.tsx` (Citações, Texto do candidato, Red flags), em `LiberacaoCognitivoBlock.tsx:109`, e o `ContextoKnockoutRevisao.tsx:45` usa 14px a 50% de branco. No azul `#00109E/95`, isso fica perto do limite de 4,5:1, em rótulos que o RH precisa ler para decidir.
- **INFO:** o h1 do Raven muda de tamanho conforme o estado: `text-2xl` na conclusão (`:170`), `text-xl` no bloqueio (`:186`), `text-lg` na prova (`:216`).

### Pilar 5: Spacing (3/4)

- A escala Tailwind é respeitada: os mais usados são `gap-2`(54), `px-4`(32), `mb-4`(27), `space-y-2/4`(26/25), `p-6`(23) e `p-12`(25). Os valores arbitrários se justificam: `min-h-[44px]` ×58, `max-w-[52ch]`/`[62ch]` para medida de leitura, `max-h-[85vh]` no diálogo.
- **WARNING: botões novos fora do alvo de 44px**, a regra que o próprio escopo aplica 58 vezes:
  - «Ir ao painel» no header da lista de avaliações: `px-4 py-2`, cerca de 36px (`AvaliacaoContainer.tsx:233`)
  - «Fazer a avaliação»: `px-4 py-2`, cerca de 36px (`RavenCandidatoCard.tsx:93`)
  - os `GlassButton` do Raven sem `min-h-[44px]` (`AvaliacaoRavenScreen.tsx:173,188,288`)

  Fica pior por ser a persona mobile-first.
- **INFO:** o shell do Raven usa `p-4 sm:p-6` e `max-w-4xl` (`:204`), e o das outras provas usa `py-20` e `max-w-2xl`. O ritmo vertical muda ao passar de uma prova para outra.
- **INFO:** o `mt-4` do `RavenCandidatoCard` (`:74`) não combina com o espaçamento dos irmãos no cartão da candidatura, que usam `mt-3` (`DashboardCandidatoPage.tsx:425`).

### Pilar 6: Experience Design (2/4)

- **WARNING (alto):** o R3, descrito acima. O login não respeita a sessão aberta.
- **WARNING (alto):** o R4, descrito acima. O candidato fica sem volta ao painel.
- **WARNING: o Raven não tem estados de erro.**
  - Se `consultarLiberacao` falha, `liberado` vira `false` e a tela afirma «Esta avaliação ainda não foi liberada para você» (`AvaliacaoRavenScreen.tsx:73,180-192`). Isso contradiz o card do painel e o e-mail que acabaram de dizer que foi liberada.
  - Se `listarQuestoesRaven` falha ou volta vazia, o candidato fica num skeleton infinito (`:194-200`, `questoesQuery.isLoading || !questao`).

  Nenhum dos dois casos lê `isError`, e não há «Tentar novamente».
- **WARNING: regressão do 51-01, o status das provas fica velho na lista.** Antes, a Prova cognitiva concluída levava ao painel. Agora leva à lista (`ProvaCognitivaScreen.tsx:287-289`), e o handler (`:176-183`) não invalida `['avaliacao','status',id]`. O mesmo vale para o `SjtCasoAbertoScreen.tsx:161-162`, sem invalidação, e para a devolutiva do Big Five → lista. Com o `staleTime` global de 5 min (`App.tsx:40`), a lista pode mostrar a prova recém-enviada como pendente. O `SjtMultiplaEscolhaScreen.tsx:168` e o Raven (`AvaliacaoRavenScreen.tsx:139-146`) fazem isso certo, e servem de molde.
- **WARNING: o header pode estourar no celular.** O 51-01 pôs um segundo botão com rótulo visível («Ir ao painel» + «Sair») num header `flex justify-between` sem `flex-wrap`, sem `truncate` no e-mail e sem `hidden sm:inline` nos rótulos (`AvaliacaoContainer.tsx:213-247`). Em 375px, com e-mail longo, a linha estoura. A `CandidatoNavbar` já resolve isso com `hidden sm:inline` (`CandidatoNavbar.tsx:113,124`). O botão «Sair» também não tem `type="button"` (`:239`).
- **WARNING: sair do Raven no meio apaga as respostas sem aviso.** As 60 respostas só são enviadas no fim (`:126-146`), sem `beforeunload` nem aviso. Fechar a aba ou voltar no navegador perde o progresso, e a tela não diz isso. O texto `semVolta` fala de itens, não da sessão.
- **Pontos fortes:**
  - confirmação aninhada antes de efeito irreversível no `ResponderRevisaoDialog`
  - `pode_responder` / autor bloqueado com tooltip
  - o `ContextoKnockoutRevisao` tem carregando, erro com retry e 44px, removida e indisponível
  - o `HubSection` mantém a precedência de carregando/erro sobre «Não se aplica» (`HubSection.tsx:339-361`)
  - o Salvar da entrevista fica desabilitado com motivo explícito
  - o `RavenCandidatoCard` se esconde de propósito em carregando e erro, com justificativa no docblock
  - o Raven grava a conclusão no cache (`:139-146`)

---

## Registry Safety

`components.json` não auditado: a fase não tem UI-SPEC com tabela de registries de terceiros. Os componentes shadcn do escopo (`select`, `dialog`, `alert-dialog`, `badge`) são locais e não foram reinstalados na fase. Auditoria de registry não aplicável.

---

## Arquivos auditados

**Do diff da fase (componentes):**
`src/components/ScoreCard.tsx`, `src/components/pages/DashboardCandidatoPage.tsx`, `src/features/avaliacao-cognitiva/components/{AvaliacaoRavenScreen,LiberacaoCognitivoBlock,ProvaCognitivaScreen,RavenCandidatoCard}.tsx`, `src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts`, `src/features/avaliacao/components/{AvaliacaoContainer,BigFiveQuestionnaireScreen,DevolutivaBigFiveView,RedacaoEditorScreen,ScorecardAvaliacao,SjtCasoAbertoScreen,SjtMultiplaEscolhaScreen}.tsx`, `src/features/config-vaga/components/PesosSliders.tsx`, `src/features/decisao/components/{ConsolidacaoDashboard,RespostaCasoAbertoSjt}.tsx`, `src/features/entrevista/components/{CognitivoBandCard,EntrevistaScorecardInline}.tsx`, `src/features/explicacao/components/{ExplicacaoCandidatoPage,SolicitarRevisaoCTA}.tsx`, `src/features/hub-candidato/components/{AvaliacoesRespondidasBloco,HubCandidatoRH,HubSection}.tsx`, `src/features/privacidade/constants/reciboExclusao.generated.ts`, `src/features/revisao/components/{ContextoKnockoutRevisao,FilaRevisoesTable,OrigemRevisaoBadge,ResponderRevisaoDialog}.tsx`, `src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts`.

**Fora do diff, citados pelo operador ou necessários para confirmar:**
`src/components/ui/select.tsx`, `src/components/ui/utils.ts`, `src/components/ui/glass.tsx`, `src/components/ui/alert-dialog.tsx`, `src/styles/globals.css`, `src/features/triagem/components/RejeitarCandidaturaDialog.tsx`, os consumidores de `<SelectContent>` listados em R1a, `src/components/pages/FormularioCandidaturaPage.tsx`, `src/components/pages/LoginCandidatoPage.tsx`, `src/components/layouts/CandidatoNavbar.tsx`, `src/components/pages/MeuPerfilCandidatoPage.tsx`, `src/components/pages/VagaCandidatosRHPage.tsx`, `src/components/RHLayout.tsx`, `src/router/routes.tsx`, `src/App.tsx`, `supabase/functions/_shared/email-config.ts`.
