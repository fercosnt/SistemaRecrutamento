---
phase: 44
slug: exporta-o-acesso
status: draft
shadcn_initialized: true
preset: existing project install (shadcn/ui + Radix; tokens em src/styles/globals.css; primitivos vendorizados em src/components/ui/ desde o M1)
created: 2026-08-03
persona: candidato (mobile-first — bloco novo em `/candidato/privacidade`) + RH (desktop-first — fila nova `/rh/pedidos-dados`)
---

# Phase 44 — UI Design Contract

> Contrato visual e de interação de **Exportação & Acesso**.
> Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

## Esta fase não inventa superfície — ela ocupa duas casas já construídas

Nenhuma das duas telas desta fase é nova no sentido estético. A do candidato é um **bloco novo
dentro de `/candidato/privacidade`**, a página que a Phase 43 criou declarando-se, no próprio
docblock, "a CASA que a Phase 44 (pedir cópia dos dados) e a Phase 45 (pedir exclusão) vão ocupar"
(`PrivacidadeCandidatoPage.tsx:6-8`). A do RH é um **clone estrutural de `/rh/revisoes`** — mesma
`RHLayout`, mesmo `GlassCard`, mesma `Table` glass, mesmo classificador de faixa.

**Portanto o risco desta UI-SPEC não é estético — é de HONESTIDADE.** Esta é uma superfície de
exfiltração de PII por desenho (assim o ROADMAP a marca), e a copy de um botão que entrega os dados
de uma pessoa é a única coisa que essa pessoa vê antes de a entrega acontecer. Uma copy que
superestima o que veio na cópia produz um titular que acredita ter recebido tudo. Uma copy que
sugere exclusão produz um titular que acredita ter sido apagado — e o motor de exclusão é a Phase
45. As duas mentiras são recuperáveis apenas por retratação escrita.

**Consequência mecânica:** as strings da §Copywriting deste documento não são sugestões de tom. Elas
são o que o sistema **afirma** ao titular sobre o próprio tratamento dos dados dele, e o que o RH lê
para decidir se um pedido consumiu ou não o prazo do Art. 19, II. Um executor que "melhore" a
redação sem passar por esta spec está alterando uma declaração de compliance.

---

## Escopo desta UI-SPEC

Dos 6 requirements da fase, **4 têm superfície visual**. Esta spec **não** inventa UI para os demais.

| Requirement | Superfície | Natureza |
|-------------|-----------|----------|
| **EXPORT-01** | Bloco **"Pedir uma cópia dos seus dados"** em `/candidato/privacidade`, abaixo de "O que guardamos e por quê" | **Bloco novo em rota existente** (mobile-first) |
| **EXPORT-03** | Sub-bloco **"Seu currículo"** — ação por candidatura, signed URL cunhada no clique | Bloco novo, mecanismo já embarcado (`CvButton`) |
| **EXPORT-05** | `/rh/pedidos-dados` — fila de supervisão com badge de acompanhamento sobre o teto de 15 dias corridos (Art. 19, II) | **Net-new** (rota nova, desktop-first) |
| **EXPORT-06** | O bloco de copy **"O que não está nesta cópia"** — a fronteira do inventário dita ao titular | Copy dentro do bloco do candidato + no arquivo legível |
| EXPORT-02 | Allowlist explícita de colunas na EF | **Sem UI** — a allowlist tem *consequência* de copy (o que a tela diz que vem na cópia tem de bater com o que a allowlist projeta), mas nenhuma tela a exibe |
| EXPORT-04 | Snapshot test das chaves | **Sem UI** — artefato de teste |

**Binding upstream:** `44-CONTEXT.md` (Áreas 1–4 **aceitas integralmente pelo operador**),
`.planning/REQUIREMENTS.md` (EXPORT-01..06), `.planning/ROADMAP.md` §Phase 44 (5 critérios de
sucesso), `43-UI-SPEC.md` (shell do candidato, invariantes de copy, escala/tipografia/cor) e
`42-UI-SPEC.md` (fila RH, faixas de SLA, método).

**Reuse-first:** esta fase **não** introduz token novo, shell novo, primitivo novo, escala nova nem
dependência npm nova. Ela reusa — e em três casos reusa a **função viva**, não uma cópia dela
(§Component Inventory).

### O que esta fase deliberadamente NÃO faz

Declarado para que a ausência não seja lida como esquecimento:

- **Nenhuma rota nova do lado do candidato**, logo **nenhum trabalho novo de alcançabilidade**. A
  entrada para `/candidato/privacidade` já existe (card em `MeuPerfilCandidatoPage`, decisão
  explícita da 43-UI-SPEC) e a `CandidatoNavbar` não engorda.
- **Nenhum botão de ação na fila do RH.** Ver Invariante 5 — inventar um seria a promessa órfã que
  este milestone existe para eliminar.
- **Nenhuma coluna `Tipo` na fila do RH.** A tabela `solicitacoes_dados` nasce com `tipo` para a
  Phase 45, mas nesta fase existe um único valor (`acesso`) e uma coluna de valor constante é ruído.
  **O que NÃO é deferido é o filtro:** a fila lê `tipo = 'acesso'` no servidor, senão as linhas de
  exclusão da P45 entram nesta tela em silêncio. Quando a P45 chegar, é ela quem decide entre
  acrescentar a coluna ou abrir uma segunda superfície — esta spec não pré-compromete.
- **Nenhuma tela de "histórico de pedidos" para o candidato.** O candidato vê o estado atual (posso
  pedir agora? quando poderei?), não um extrato. Um extrato de pedidos é dado sobre o titular que a
  própria cópia já carrega.

---

## Invariantes não-negociáveis desta fase

Precedem qualquer escolha estética. Um plano que os viole está errado mesmo que fique bonito.

1. **A cópia nunca é descrita como completa.** Proibido, em superfície de candidato: "todos os seus
   dados", "tudo o que temos sobre você", "todos os seus registros". O escopo real é o inventário do
   `pii-inventory.yaml` **menos** a telemetria interna (`ai_call_logs`, deliberadamente fora — Área 2
   do CONTEXT). O que fica de fora aparece na tela com **razão nomeada**, nunca por omissão. A frase
   honesta é "uma cópia dos dados que a Beauty Smile guarda sobre você", e ao lado dela vive o bloco
   **"O que não está nesta cópia"**.

2. **Baixar não apaga, e a tela não pode sugerir que apaga.** Nenhuma copy desta fase, em texto
   visível, `title`, `aria-label` ou nos dois arquivos entregues, pode conter os verbos de exclusão
   conjugados como consequência do export: `apagado`, `apagados`, `excluído`, `excluídos`,
   `removido dos nossos sistemas`, `eliminado`. O motor de exclusão é a Phase 45 e **não existe
   hoje**. O único lugar onde eliminação é mencionável nesta tela é a nota de canal humano já viva
   no `GuardaCurriculoBloco` (Encarregado), que **não** é editada por esta fase.

3. **O cooldown de 24 h é estado do SERVIDOR e o servidor é a autoridade.** O cliente nunca decide
   se um pedido é permitido. Consequências verificáveis: (i) a leitura do último pedido é own-row e
   o botão renderiza o estado que o servidor devolveu; (ii) se essa leitura **falhar**, o botão é
   renderizado assim mesmo e a recusa vem do servidor com copy própria — **atalhar no cliente moveria
   a barreira para o cliente, e qualquer DevTools a desliga** (precedente vivo, 42-10:
   `responderRevisao` chama a RPC mesmo quando o guard vai recusar); (iii) **um botão desabilitado
   por cooldown nunca aparece sem o motivo e a hora de liberação em texto visível ao lado**.

4. **O link do currículo é cunhado no clique, nunca antes, nunca guardado.** TTL de 60 s só é honesto
   se o intervalo entre cunhagem e uso for o tempo de um clique. Portanto: o signed URL **não** entra
   no `.json`, **não** entra no arquivo legível, **não** entra em estado de componente, **não** entra
   em cache de query e **nunca** em `console.*`. Um link de 60 s dentro de um arquivo que a pessoa
   abre amanhã é um link morto que parece mentira do export. Mecanismo já embarcado e reusado
   verbatim: `CvButton` (`features/hub-candidato/components/CvButton.tsx`).

5. **A fila do RH é de supervisão e não oferece ação nenhuma.** Não há botão "Atender", "Reenviar",
   "Gerar cópia" nem "Baixar". Dois motivos, ambos duros: (i) o atendimento é self-service e não há
   código de RH que o refaça — um botão seria promessa órfã; (ii) **dar ao RH um caminho para baixar
   a cópia de um candidato criaria uma segunda superfície de exfiltração**, exatamente a que a
   autorização own-row da EF existe para fechar. O que a linha falha oferece é **texto**: a causa e o
   próximo passo humano.

6. **A distinção atendido × não atendido nunca depende só de cor.** Herda a regra colorblind-safe
   (`ScoreCell` / T-34-04-03, reafirmada em 42 e 43): o badge de Situação carrega a palavra, e o
   realce de linha é canal **redundante**, jamais o único.

7. **O badge de acompanhamento herda a totalidade e a degeneração.** `config_sla_dados` é alterável
   sem deploy, logo linha ausente / limiar `0` / ordem invertida são estados **alcançáveis em
   produção**. O classificador é puro e **total** (nunca lança) e a faixa `degenerado` renderiza a
   contagem de dias sem badge — nunca uma tela de erro, nunca célula vazia. Esta fase **não escreve
   um classificador novo**: reusa a função viva (§Component Inventory).

8. **Nenhum valor de acompanhamento vaza para o candidato.** Faixa, cor, contagem de dias, "atrasado"
   e o próprio teto de 15 dias são **internos**. A tela do candidato nunca cita prazo de atendimento
   — porque nesta fase o atendimento é instantâneo, e citar um prazo criaria a expectativa de espera
   que o produto não tem. (Invariante 1 da 42-UI-SPEC, na sua forma desta fase.)

9. **Nomes de arquivo não carregam PII.** Os dois arquivos baixados aparecem na barra de downloads do
   navegador e na pasta compartilhada do aparelho. Proibido interpolar nome, e-mail, CPF ou
   `candidato_id` no nome do arquivo. O padrão é `beauty-smile-meus-dados-{aaaa-mm-dd}.{ext}`.

---

## Emenda registrada ao contrato da 43-UI-SPEC

A 43-UI-SPEC declara, e o código vivo repete no docblock: **"A página NÃO tem CTA primário, por
desenho"** (`PrivacidadeCandidatoPage.tsx:15-17`). Esta fase **acrescenta um CTA primário** a essa
página. A alteração é declarada aqui — não é deriva — com a justificativa e a mitigação.

**Por que não viola a Invariante 4 da 43 ("zero fricção para revogar").** Aquela regra proíbe um
controle que se interponha entre a pessoa e uma intenção **já expressa**: o switch de marketing já é
a revogação, e um "Salvar" ao lado dele seria fricção pura sobre o exercício de um direito. Aqui a
relação é inversa: **sem botão não existe forma de expressar a intenção.** O botão não é uma
confirmação sobre o pedido — ele **é** o pedido. Um direito cujo exercício depende de um controle
não pode ser exercido sem o controle.

**O que continua valendo, verbatim:** nenhum diálogo de confirmação, nenhum pedido de motivo, nenhum
"tem certeza?", nenhuma contra-oferta, nenhum atraso artificial entre o clique e a entrega.

**Mitigação da hierarquia visual, e ela é obrigatória.** A 43 declara que **a âncora visual de
`/candidato/privacidade` é a lista de autorizações**. Esta fase **preserva** essa âncora por três
restrições que o executor não pode relaxar:

1. O bloco é a **terceira** seção, abaixo das duas existentes.
2. O CTA é **glass-branco** (`bg-white/20` → `bg-white/30`), **nunca accent**, **nunca full-bleed**,
   e não recebe tratamento de destaque maior que o dos cartões vizinhos.
3. O bloco usa o **mesmo molde neutro de leitura** já vivo na página
   (`rounded-lg border border-white/15 bg-white/5 p-4`), o mesmo do `GuardaCurriculoBloco`.

Nota factual que reduz o tamanho da emenda: a página **já renderiza um `GlassButton`** ("Voltar ao
painel" e os botões de "Tentar novamente"). O primitivo não é novo; o que é novo é um botão cuja
função é *agir*, não navegar.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (instalação existente do projeto — **NÃO** re-inicializada; não há `components.json` na raiz; 50+ primitivos vendorizados em `src/components/ui/` desde o M1) |
| Preset | projeto já cabeado; tokens em `src/styles/globals.css`, primitivos em `src/components/ui/` |
| Component library | Radix (via shadcn/ui) |
| Icon library | lucide-react |
| Font | Helvetica Neue, Helvetica, Arial, sans-serif (`--font-family`) |

**Gate do shadcn — decisão registrada (idêntica à das Phases 7–17, 42 e 43):** `components.json`
**ausente** e `npx shadcn init` **deliberadamente não executado**. Vários primitivos vendorizados
carregam imports com versão embutida (`@radix-ui/react-slot@1.1.2`) resolvidos por `resolve.alias`
no `vite.config.ts`; rodar o init reescreveria esses arquivos e quebraria o alias. Não é lacuna, é o
estado travado do projeto.

**Shell do candidato (mobile-first) — não é clonada nesta fase, é HERDADA.** O bloco entra dentro do
`GlassPanel variant="white" blur="xl"` que a `PrivacidadeCandidatoPage` já monta, dentro da
`ScreenShell` que ela já define (`BackgroundImage background="gradient"` + overlay 15% +
`container mx-auto px-4 max-w-2xl`). Esta fase **não toca a `ScreenShell`**.

**Shell do RH (desktop-first) — clonada verbatim de `RevisoesRHPage`:** `RHLayout` (`BackgroundImage
background="darkBlue"` + `RHSidebar` + `RHTopBar` + `<main className="flex-1 p-4 lg:p-6">`) com
`GlassCard variant="dark" blur="lg"` por cima. Gêmeo estrutural direto e único.

### Rota nova

| Rota | Guard | Persona | Por quê aqui |
|------|-------|---------|--------------|
| `/rh/pedidos-dados` | `RoleGuard role={['rh','administrador']}` | desktop-first | **Mesmo wrapper das rotas RH vizinhas** (`/rh/revisoes`, `/rh/relatorios`, `/rh/suporte`), seguindo o código vivo e não a redação do parágrafo de guard da 42-UI-SPEC (que se contradiz e foi corrigida em `RevisoesRHPage.tsx:19-26`). **Não** é uma aba dentro de `/rh/revisoes`: misturaria Art. 20 (revisão de decisão) com Art. 18 (acesso aos dados), que são pedidos diferentes, com prazos diferentes e config de SLA diferente (Área 4 do CONTEXT) |

**Alcançabilidade — obrigatória, não cosmética.** Os três sítios da `RHSidebar`, no idioma exato que
as Phases 42 e 43 já executaram duas vezes:

- **Sítio 1/3** — `+1 MenuItem` `pedidos-dados-rh`, rótulo **Pedidos de dados**, ícone `FileDown`
  24px (livre: os ícones vivos são `Home`, `Users`, `Briefcase`, `Scale`, `Settings`, `LogOut`,
  `Bug`, `BarChart3`, `ShieldCheck`, `CalendarClock`). Posição travada: **logo após `revisoes-rh`,
  antes de `vagas-rh`** — as duas filas de direito do titular ficam adjacentes. **Não** é role-gated:
  a supervisão é trabalho de RH, igual a Revisões.
- **Sítio 2/3** — `+1` linha em `getActivePageFromPath`, entre as linhas específicas de `/rh/*`.
  Como não existe nenhum prefixo `/rh` genérico hoje, não há a armadilha de precedência que a
  Retenção teve com `/admin`; a linha entra junto das irmãs por consistência de leitura.
- **Sítio 3/3** — `+1` entrada no mapa `routes` do `handleMenuClick`
  (`'pedidos-dados-rh': '/rh/pedidos-dados'`). **Os três sítios no mesmo commit** — cada omissão tem
  um modo de falha silencioso já documentado no arquivo vivo (item que não existe / item que não
  acende / item que não navega).

**Contador do menu:** `badge` = quantidade de pedidos **não atendidos**, formatada por
`formatarBadgePendentes` **importada verbatim** de `revisaoService`. Não reimplementar: o 42-10
registrou que passar o número direto reintroduz o `0` solto no menu, e que a renderização tem de ser
**ternário**, nunca `&&` (`'0 && …'` avalia para `0` e o React o renderiza como texto).

> **⚠ Correção factual (verificada no código vivo em 2026-08-03).** Uma versão anterior desta spec
> dizia que a função devolve `''` para 0/indefinido. **Ela devolve `undefined`.** Assinatura real:
> `formatarBadgePendentes(n: number | null | undefined): string | undefined`
> (`src/features/revisao/services/revisaoService.ts:180-188`), e o teste prende o comportamento com
> `toBeUndefined()` (`revisaoService.test.ts:213`). A **intenção** da spec estava certa — o badge
> some em vez de mostrar `0` — mas o valor citado não. **O plano importa a função e nunca compara o
> retorno com `''`**: uma comparação `=== ''` seria sempre falsa e faria o badge reaparecer como
> vazio. Este é o tipo de erro que só o código vivo desmente.

### Âncora visual primária (uma por tela — declarada, não inferida)

- **`/candidato/privacidade`:** **a âncora continua sendo a lista de autorizações** (declaração da
  43-UI-SPEC, preservada). Ver §Emenda para as três restrições que a protegem. Se algo novo precisar
  entrar nesta tela depois desta fase, entra **abaixo** da seção 3.
- **`/rh/pedidos-dados`:** **a tabela é a âncora.** O H1, o subtítulo, o banner de escopo, a nota de
  ordenação e o toggle vivem numa faixa de controles **compacta**, não ganham card próprio e **não
  podem empurrar a primeira linha da tabela para fora da dobra em 1366×768**. Está escrito aqui de
  propósito: é a restrição que uma edição futura mais provavelmente violaria sem perceber, ao
  acrescentar um card de resumo acima da tabela.

**Primitivos shadcn em escopo (todos já vendorizados):** `table`, `badge`, `switch`, `label`,
`tooltip`, `button`, `skeleton`, `separator`. **Nenhum `dialog` e nenhum `alert-dialog` nesta fase**
— não há confirmação em lugar nenhum (Emenda + Invariante 5). Sonner (`toast`) **não é usado**: o
único feedback de sucesso do candidato precisa **persistir** na tela (ele nomeia dois arquivos que a
pessoa vai procurar na pasta de downloads), e toast some.

**Componentes do projeto reusados (não re-autorar):**

| Componente | Papel nesta fase |
|-----------|------------------|
| `Glass` / `GlassPanel` / `GlassCard` / `GlassButton` (`src/components/ui/glass.tsx`) | Camada glass das duas superfícies. ⚠ O spread de props não-estilo do `GlassButton` **já foi corrigido** (42-11 / D-42-11-01) — `aria-*`, `title` e `aria-busy` chegam ao `<button>` |
| `AsyncState` (`src/components/ui/AsyncState.tsx`) | Contrato único de loading/error/empty da fila do RH, com `copy={{...}}` sobrescrita. Precedência travada: `isLoading → slow → isError → isEmpty → children` |
| `RevisoesRHPage` (`src/features/revisao/`) | **Molde estrutural do `/rh/pedidos-dados`**: `RHLayout` + `GlassCard` + faixa de controles compacta + tabela. Copiar a estrutura, não o conteúdo |
| `FilaRevisoesTable` (`src/features/revisao/`) | Molde da `Table` glass: wrapper `rounded-xl border border-white/10`, cabeçalho fixo via `TH_CLASSES` nas **células** (sticky em `<thead>` não gruda com `border-collapse`), scrollport `[&>[data-slot=table-container]]:max-h-[70vh]`, linhas `hover:bg-white/5`, aviso de corte fora da tabela |
| `RevisaoSlaBadge` (`src/features/revisao/`) | **Reusado verbatim, sem renomear** (ver §Component Inventory) |
| `classifyRevisaoSla` / `diasEmEspera` / `ROTULOS_FAIXA_SLA_REVISAO` (`src/features/revisao/constants/slaRevisao.ts`) | **Reusados por alias, zero cópia da lógica** |
| `formatarBadgePendentes` (`src/features/revisao/services/revisaoService.ts`) | Contador do item de menu |
| `CvButton` (`src/features/hub-candidato/components/CvButton.tsx`) | **Molde de mecanismo** do sub-bloco de currículo: `window.open('about:blank')` síncrono dentro do gesto → `win.opener = null` → navega a aba já aberta quando o signed URL resolve. URL nunca em estado, cache ou log |
| `baixarIcsAgendamento` (`src/features/agendamento/services/agendamentoCandidatoService.ts:205`) | **Molde de mecanismo** do download dos dois arquivos: `Blob` → `URL.createObjectURL` → `<a download>` → `click()` → `revokeObjectURL`. Zero npm, zero estado de loading |
| `PrivacidadeCandidatoPage` / `AutorizacoesLista` / `GuardaCurriculoBloco` | **Editado apenas o primeiro**, para hospedar a seção 3. Os outros dois ficam **byte-idênticos** |
| `RHSidebar` (`src/components/RHSidebar.tsx`) | +1 `MenuItem` com contador (3 sítios, idioma do 42-10 / 43-09) |

---

## Spacing Scale

Escala estabelecida (múltiplos de 4), idêntica às UI-SPECs aprovadas das Phases
11/13/14/15/34/42/43. **Nenhum valor novo.**

| Token | Value | Usage nesta fase |
|-------|-------|------------------|
| xs | 4px | Gap ícone↔rótulo do CTA e das ações de currículo (`gap-1`) |
| sm | 8px | Rótulo↔corpo dentro do bloco; gap switch↔label da faixa de controles do RH (`gap-2`, `space-y-2`) |
| md | 16px | Padding interno do bloco neutro (`p-4`); gap entre as linhas de currículo; `space-y-4` do `GlassCard` do RH |
| lg | 24px | Ritmo vertical entre as seções de `/candidato/privacidade` (`space-y-6`, já vivo); padding interno de `GlassCard` (`p-6`) |
| xl | 32px | Ritmo entre painéis maiores da página do RH (`space-y-8`) — usado só se a página crescer |
| 2xl | 48px | Padding vertical dos estados vazio/erro (`py-12` do `AsyncState`) |
| 3xl | 64px | Respiro superior/inferior da página do candidato (`py-20`, herdado da `ScreenShell`) |

**Exceções (todas múltiplos de 4, todas justificadas):**

- `min-h-[44px]` (44 = 4×11) — piso de alvo tátil em **todo** controle acionável desta fase: o CTA
  "Baixar uma cópia dos meus dados", cada ação "Abrir meu currículo", o botão "Tentar novamente" e o
  `Switch` da faixa de controles do RH. Precedente: Phases 11/13/14/15/34/42/43.
- `max-h-[70vh]` no scrollport da tabela do RH — **herdado verbatim** do `FilaRevisoesTable`, não
  re-derivado. Ver §UI Considerations E6/overflow para por que ele fica mesmo com volume baixo.
- `max-w-[220px]` na coluna de texto livre da tabela (`truncate`) — herdado verbatim do
  `FilaRevisoesTable` (`CELULA_TRUNCADA`).

**Explicitamente sem exceção nova:** o bloco do candidato **não** ganha padding próprio diferente do
`p-4` dos blocos irmãos da mesma página. Um padding maior seria a forma silenciosa de o bloco roubar
a âncora visual que a §Emenda protege.

---

## Typography

Família Helvetica Neue (`--font-family`). Exatamente **4 tamanhos, 2 pesos**. Body 1.5, heading 1.2.
Escala idêntica ao contrato aprovado das Phases 11/13/14/15/42/43 — não re-derivada.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body / prosa do bloco de export / "o que está e o que não está na cópia" / corpo dos estados vazio e erro / nome do candidato na tabela | 16px (`text-base`) | regular (400) | 1.5 |
| Label / rótulo de botão / cabeçalho de coluna / badge / data / nota de ordenação / causa da falha / linha de cooldown | 14px (`text-sm`) | semibold (600) | 1.4 |
| Título de seção ("Pedir uma cópia dos seus dados", "Pedidos registrados") | 20px (`text-xl`) | semibold (600) | 1.2 |
| H1 da página ("Pedidos de dados") | 28px (`text-3xl`, cap responsivo `md:text-4xl`) | semibold (600) | 1.2 |

**Notas:**

- A proximidade 14/16 é intencional e separada perceptualmente por **peso** (14 = label semibold,
  16 = body regular) — precedente das Phases 11/13/14/15/42/43, não uma micro-banda.
- **A prosa que descreve o escopo da cópia é leitura de carga, não legenda:** 16px / 1.5
  (`text-base leading-relaxed`), nunca truncada, nunca em `text-sm`. É o texto que impede o titular
  de acreditar que recebeu mais do que recebeu — encolhê-lo é encolher a declaração.
- **A linha de cooldown é 14px/600** (papel de label/estado), no mesmo tratamento que
  `AutorizacoesLista` já dá aos estados textuais das linhas. Ela é estado, não prosa.
- Somente dois pesos: 400 e 600. Nada de 500/700/800, apesar de existirem em `globals.css`.

### `text-xs` (12px) — o 5º tamanho, e como esta fase não o cria

`globals.css:79` resolve `--text-xs` em **12px**, sem alias para 14px. Um 5º tamanho é 5º tamanho
independentemente de onde apareça (veredito do checker da 42-UI-SPEC, rev 1, reafirmado na 43).

- **Esta fase autora zero `text-xs`.** Toda string que ela escreve — causa da falha, nota de
  ordenação, nome do arquivo baixado, hora de liberação do cooldown, aviso de corte — renderiza a
  **14px**.
- O primitivo `Badge` traz um tamanho menor por padrão; ele é **sobrescrito** por
  `text-sm font-semibold`, exatamente como o `RevisaoSlaBadge` já faz
  (`TIPOGRAFIA_BADGE`). O badge de Situação desta fase segue a mesma constante.
- O achado cross-phase `.planning/todos/pending/ui-spec-text-xs-quinto-tamanho.md` permanece aberto
  e **não** é resolvido aqui — esta fase apenas não o agrava.

---

## Color

Paleta **travada** — idêntica às Phases 11/13/14/15/34/42/43.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#00109E` brand-primary (`--primary`; `BackgroundImage background="gradient"` no candidato, `darkBlue` no RH) | Fundo de página atrás de todo glass/painel |
| Secondary (30%) | `bg-white/5`–`bg-white/20` branco translúcido (`Glass`/`GlassCard`/`GlassPanel`) | Bloco de export, linhas de currículo, cabeçalho da tabela, faixa de controles, CTA primário |
| Accent (10%) | `#35BFAD` brand-accent (`--accent`) | Ver lista reservada abaixo |
| Destructive | `#EF4444` (`--destructive`) | **Somente** erro: alerta inline de falha do pedido de cópia, falha ao abrir o currículo, estado de erro do `AsyncState`. **Nada mais** |

**Accent (`#35BFAD`) reservado para — lista explícita, e ela tem UM item:**

1. O estado **ativo** do item "Pedidos de dados" na `RHSidebar` (`bg-[#35BFAD]`) — comportamento já
   existente do componente, herdado, não novo.

Accent **não** é usado para: o CTA "Baixar uma cópia dos meus dados", as ações "Abrir meu currículo",
nenhum elemento da superfície do candidato, nenhum cabeçalho, nenhum badge, nenhum hover genérico.

**Consequência declarada, e ela é notável:** como a fila do RH **não tem coluna de ação**
(Invariante 5), esta é a **primeira tabela do projeto sem nenhum elemento accent na linha** — não há
"Responder" (42) nem "Editar janela" (43) para pintar. Um executor que sinta a linha "vazia" e
acrescente um link accent está reintroduzindo a ação que a Invariante 5 proíbe.

Os CTAs são glass-branco (`bg-white/20` → `bg-white/30`), precedente das Phases 15, 42 e 43.

### Tratamentos semânticos (data-encoding — fora do orçamento de accent)

Mesma classificação que as 42/43-UI-SPEC deram às faixas de SLA: isto é **codificação de
significado**, não decoração.

| Tratamento | Classes | Onde |
|-----------|---------|------|
| Neutro / leitura | `rounded-lg border border-white/15 bg-white/5 p-4` | Bloco "Pedir uma cópia dos seus dados"; sub-bloco "Seu currículo"; banner de escopo da fila do RH |
| Informativo | `bg-blue-500/10 border-blue-400/30` + `Info` `text-blue-400` | **Não usado nesta fase.** Registrado para que o executor não o alcance por reflexo: o bloco de export não é aviso, é ação |
| Cautela / não atendido | `bg-amber-500/15 border-amber-400/30 text-amber-300` | Badge **Não atendido** da coluna Situação |
| Realce de linha não atendida | `bg-amber-500/5 hover:bg-amber-500/10` na `TableRow` | Canal **redundante** — nunca o único (Invariante 6) |

### Faixas do badge de acompanhamento (RH-only) — herdadas verbatim da 42

Sem uma classe nova, sem um limiar novo em código. Os limiares vêm de `config_sla_dados`
(**seed no servidor, nunca constante compilada**).

| Faixa | Condição | Classes | Rótulo |
|-------|----------|---------|--------|
| verde | `dias < dias_atencao` | `bg-emerald-500/20 text-emerald-200 border-emerald-500/30` | `Em dia · {n}d` |
| âmbar | `dias_atencao ≤ dias < dias_atraso` | `bg-yellow-500/20 text-yellow-200 border-yellow-500/30` | `Atenção · {n}d` |
| vermelho | `dias ≥ dias_atraso` | `bg-red-500/20 text-red-300 border-red-500/30` | `Atrasado · {n}d` + `AlertTriangle aria-hidden` |
| **degenerada** | config ausente/ilegível | `text-sm text-white/50`, sem badge | `{n}d` |

### A regra de cor mais substantiva desta fase: âmbar e vermelho codificam EIXOS DIFERENTES

`Situação = Não atendido` e `Acompanhamento = Atrasado` são fatos independentes — um pedido pode
falhar hoje (não atendido, em dia) ou estar perto do teto sem ter falhado. Se os dois usassem
vermelho, uma linha carregaria **dois alarmes vermelhos que dizem coisas diferentes** e o operador
perderia a distinção que o SC#4 existe para dar.

Portanto, e sem exceção:

- **Situação** codifica *o que aconteceu* → âmbar (`Não atendido`) / neutro (`Atendido`).
- **Acompanhamento** codifica *quanto do prazo passou* → as três faixas herdadas, com o vermelho
  reservado ao `Atrasado`.
- **Um ícone por linha, no máximo.** O `AlertTriangle` fica com a faixa vermelha (herança da 42); o
  badge de Situação **não** ganha ícone — ele já carrega a palavra, que é o canal exigido pela
  Invariante 6.

### Badge de Situação

Neutro para o caminho feliz — um pedido atendido não é alarme (mesma lógica do `VereditoBadge` da 42):

| Situação | Classes | Rótulo |
|----------|---------|--------|
| `atendido` | `border-white/20 bg-white/5 text-white/80` | `Atendido` |
| `pendente` | `border-amber-400/30 bg-amber-500/15 text-amber-300` | `Não atendido` |
| valor desconhecido | `border-white/20 bg-white/5 text-white/80` | o valor cru, nunca célula vazia |

**Vocabulário fechado com normalização defensiva no cliente** (precedente 42-11): o CHECK do banco já
fecha o vocabulário, mas um invariante **remoto** é a coisa errada para uma decisão de
**renderização** se apoiar. Um valor novo cai no tratamento neutro com o token cru visível — nunca
fecha a superfície, nunca renderiza em branco.

---

## Copywriting Contract

Toda a copy em **pt-BR**. Regras de produto herdadas: "avaliação comportamental/cognitiva", **nunca**
"teste psicológico" (CLAUDE.md / RNF-07a); nenhum score, banda ou percentil em superfície de
candidato; **nunca** "pessoa natural" (43 / BD-3).

**Registro de linguagem desta fase (precedente direto da BD-3):** linguagem simples que o titular
decodifica, **com** a citação legal ao lado, nunca no lugar dela. "Você pode baixar uma cópia do que
guardamos sobre você. É um direito seu (LGPD, Art. 18, II)" — não "exercício do direito de acesso
previsto no Art. 18, inciso II".

### Bans desta fase e o ESCOPO de cada uma — sem isto o critério reprova a copy que a spec exige

Este projeto já produziu duas vezes o defeito de escrever um grep repo-wide que reprova a própria
spec (43, "automaticamente"). As três bans abaixo têm **escopos diferentes**:

| Strings | Escopo do grep | Esperado | Por que este escopo |
|---|---|---|---|
| `todos os seus dados` · `tudo o que temos sobre você` · `todos os seus registros` | **superfície de candidato** — `src/features/privacidade/` + o gerador do arquivo legível | **0** | Invariante 1. A cópia não é completa por decisão registrada (`ai_call_logs` fora) |
| `apagado` · `apagados` · `excluído` · `excluídos` · `eliminado` · `removido dos nossos sistemas` | **APENAS o bloco novo e os dois arquivos gerados** — nunca `src/features/privacidade/` inteiro | **0** dentro do escopo | Invariante 2. O `GuardaCurriculoBloco` **vivo** já contém "pedir a eliminação do seu currículo", copy aprovada na 43 e **não editada** por esta fase; um grep de feature inteira reprovaria copy aprovada de outra fase |
| `prazo legal` | **copy renderizada de `src/`** — não `.md`, não docblock | **0** | A 42 baniu o termo porque o Art. 20 **não** fixa prazo. Aqui o Art. 19, II **fixa** 15 dias corridos, então o termo seria *verdadeiro* para o teto e *falso* para os limiares. Esta spec resolve por **evitar o termo**: a copy diz "A LGPD dá 15 dias corridos para responder (Art. 19, II)". O ban da 42 continua satisfeito; o que o plano **não** pode fazer é estendê-lo a documentação e comentários, onde a expressão aparece descritivamente |

### Contrato mínimo do template

| Element | Copy |
|---------|------|
| Primary CTA | **Baixar uma cópia dos meus dados** *(candidato)*. `/rh/pedidos-dados` **não tem CTA primário por desenho** — é fila de supervisão sem ação (Invariante 5) |
| Empty state heading | **Nenhum pedido de dados registrado** *(fila RH, visão completa)* · **Nenhum pedido ficou sem atendimento** *(fila RH, toggle ligado)* |
| Empty state body | Quando um candidato pedir uma cópia dos próprios dados, o pedido aparece aqui. *(visão completa)* · Todos os pedidos registrados foram atendidos no mesmo momento em que foram feitos. *(toggle ligado)* |
| Error state | **Não foi possível preparar sua cópia.** Tente novamente em alguns minutos. Se continuar, escreva para o nosso Encarregado de Dados: lgpd@beautysmile.com.br *(candidato)* · **Não foi possível carregar a fila de pedidos de dados.** Verifique sua conexão e tente novamente. *(+ Tentar novamente)* *(RH)* |
| Destructive confirmation | **Não há ação destrutiva nesta fase.** A fase é **read-only por construção** sobre PII (44-CONTEXT §domain); as únicas escritas são o registro do pedido e sua config de prazo, ambas aditivas. **Nenhum `alert-dialog` e nenhum `dialog` é usado nesta fase** — e a ausência é deliberada: um "tem certeza?" antes de exercer um direito de acesso é a fricção que a Invariante 4 da 43 proíbe |

---

### `/candidato/privacidade` · Seção 3 — **Pedir uma cópia dos seus dados** (EXPORT-01/06)

Mobile-first. Terceira seção da página, **abaixo** de "O que guardamos e por quê", separada pelo
mesmo `border-t border-white/15 pt-6` que já separa as seções 1 e 2.

| Element | Copy |
|---------|------|
| Título da seção | **Pedir uma cópia dos seus dados** |
| Abertura | Você pode baixar uma cópia dos dados que a Beauty Smile guarda sobre você. É um direito seu (LGPD, Art. 18, II). |
| **Como a cópia chega** | Você recebe **dois arquivos**: um feito para você ler e outro em formato de dados, caso queira levar suas informações para outro lugar. Seu navegador pode pedir permissão para baixar mais de um arquivo — é normal, e os dois vêm do mesmo pedido. |
| **O que está na cópia** | Seu cadastro, suas candidaturas, o que você autorizou, suas entrevistas agendadas, o histórico de cada candidatura, e o resultado e a explicação das avaliações que você fez. |
| **O que não está na cópia** | Não entram os registros internos de funcionamento do sistema — por exemplo, o tempo e o custo de processamento das nossas ferramentas de tecnologia. Eles descrevem o sistema, não você. |
| **Sobre o currículo** | Seu currículo não vem dentro desses dois arquivos. Ele é baixado à parte, pelo botão abaixo, por um link gerado na hora e válido por poucos segundos — é assim que ele fica protegido. |

#### O CTA e seus cinco estados

| Estado | Copy e comportamento |
|--------|----------------------|
| Disponível | **Baixar uma cópia dos meus dados** *(glass-branco, `min-h-[44px]`)* |
| Em voo | **Preparando sua cópia…** *(botão desabilitado, `aria-busy="true"`, `Loader2` girando ao lado)* |
| Sucesso *(persistente, nunca toast)* | **Pronto. Sua cópia foi baixada em dois arquivos:** `beauty-smile-meus-dados-{aaaa-mm-dd}.html`, para leitura, e `beauty-smile-meus-dados-{aaaa-mm-dd}.json`, em formato de dados. Se não encontrar, procure na pasta de downloads do seu aparelho. |
| **Cooldown** *(botão desabilitado + motivo SEMPRE visível)* | **Você já pediu uma cópia nas últimas 24 horas.** Você pode pedir outra a partir de **{dd/mm/aaaa} às {HH:mm}**. Esse limite existe para proteger a sua conta. Se precisar de uma cópia antes disso, escreva para o nosso Encarregado de Dados: lgpd@beautysmile.com.br. |
| Erro | Alerta inline destructive abaixo do botão, `role="alert"`: **Não foi possível preparar sua cópia.** Tente novamente em alguns minutos. Se continuar, escreva para o nosso Encarregado de Dados: lgpd@beautysmile.com.br. |

**Fonte única da copy de cooldown.** A recusa **do servidor** (o candidato clicou porque a leitura de
estado falhou, e o servidor recusou por cooldown) renderiza a **mesma string** do estado de cooldown
— um segundo texto para o mesmo fato viraria duas verdades sobre o mesmo limite.

**Proibido nesta região:** diálogo de confirmação, pedido de motivo, "tem certeza?", contagem
regressiva animada, barra de progresso falsa, e qualquer atraso artificial entre o clique e o
download. Proibido também **prometer** que o limite de 24 h vai mudar — isso é roadmap, não
compromisso com o titular (regra herdada da 43, §guarda do currículo).

#### Sub-bloco **Seu currículo** (EXPORT-03)

Renderiza **somente quando existe pelo menos um currículo**. Quando não existe, o bloco **não é
renderizado** — a ausência já é dita, com copy aprovada, na seção 2 logo acima ("Você ainda não
enviou um currículo."). Dizer a mesma ausência duas vezes na mesma tela faria o titular procurar
duas coisas diferentes.

| Element | Copy |
|---------|------|
| Título | **Seu currículo** |
| Corpo | Um currículo por vaga a que você se candidatou. |
| Ação da linha | **Abrir meu currículo** *(+ o título da vaga ao lado, `truncate` + `title`)* |
| Em voo | **Abrindo…** *(botão desabilitado, `aria-busy="true"`)* |
| Erro | **Não foi possível abrir este currículo.** Tente novamente em instantes. *(inline, por linha, `aria-live="polite"`)* |
| Vaga sem título | **Vaga não identificada** *(nunca UUID, nunca célula vazia — invariante herdada da 42)* |

**Por que "Abrir" e não "Baixar" — e isso é contrato, não preferência.** O mecanismo reusado do
`CvButton` **abre uma aba** apontada para o signed URL; ele não força download. E não poderia: o
atributo `download` de um `<a>` é **ignorado em URL cross-origin**, e o Storage do Supabase é outra
origem. Um rótulo "Baixar" que abre um visualizador é copy que não descreve o comportamento — a
classe exata de defeito que esta fase existe para não cometer. O download dos **dois arquivos**, esse
sim, usa `Blob` same-origin, onde o atributo `download` funciona.

---

### Os dois arquivos entregues são superfície de UI

Eles são lidos por uma pessoa, fora do navegador, possivelmente meses depois. Portanto têm contrato
de copy. A estrutura fina do JSON e a marcação do HTML são discrição do planejador (44-CONTEXT
§Claude's Discretion); **o que está abaixo não é.**

| Item | Contrato |
|------|----------|
| Formato legível | **HTML autocontido**, hand-rolled — mesmo idioma de `_shared/email-templates.ts`. **Não PDF** (exigiria dependência npm nova, banida no M8). **Não CSV** (perderia o aninhamento e transformaria a cópia num arquivo que só um sistema lê, que é justamente o papel do `.json`) |
| Formato de dados | `.json`, o direito do Art. 18, II ("formato que permita a sua utilização") |
| Nomes | `beauty-smile-meus-dados-{aaaa-mm-dd}.html` e `.json` — **zero PII no nome** (Invariante 9) |
| Ordem de disparo | `.json` **primeiro**, `.html` depois, no **mesmo gesto de clique**. O artefato do direito legal vai primeiro; se o navegador barrar o segundo download, o que sobrevive é o que a lei exige |
| Título do HTML | **Seus dados na Beauty Smile** |
| Carimbo de data *(obrigatório, no topo)* | Cópia gerada em {dd/mm/aaaa} às {HH:mm}. |
| Seção de fronteira *(obrigatória)* | **O que não está nesta cópia** — com a mesma razão nomeada da tela: registros internos de funcionamento do sistema, que descrevem o sistema e não a pessoa. |
| Seção de fecho *(obrigatória)* | **O que esta cópia não faz** — Baixar esta cópia não altera nada nos seus dados. Ela é uma fotografia do que a Beauty Smile guardava sobre você na data acima. |
| Currículo dentro dos arquivos | **Apenas o nome do arquivo e a data de envio.** Nunca o conteúdo, nunca base64, **nunca um link** (Invariante 4). Frase fixa ao lado: "O arquivo em si é baixado pela página Seus dados e autorizações, por um link gerado na hora." |
| Saídas de IA | **Entram o resultado e a explicação; nunca o prompt nem a telemetria** (Área 2 do CONTEXT). O vocabulário é "avaliação comportamental/cognitiva", nunca "teste psicológico" |
| Proibido nos dois arquivos | Qualquer signed URL; qualquer chave, token ou identificador interno de infraestrutura; qualquer verbo de exclusão da Invariante 2 |

**O carimbo de data não é cortesia.** É o mesmo princípio que a 42-12 estabeleceu e a 43 repetiu na
prévia de retenção: um fato cuja data depende de alguém lembrar de anotá-la é promessa sem código
que a execute. Sem carimbo, não há como distinguir uma cópia de hoje de uma cópia do mês passado — e
a diferença entre as duas é exatamente o que o titular precisa saber.

---

### `/rh/pedidos-dados` — **Pedidos de dados** (EXPORT-05)

Desktop-first, `RHLayout` + `GlassCard`, gêmeo estrutural único de `RevisoesRHPage`.

| Element | Copy |
|---------|------|
| Item do menu | **Pedidos de dados** *(ícone `FileDown` 24px; contador = não atendidos)* |
| H1 | **Pedidos de dados** |
| Subtítulo | Pedidos de cópia dos próprios dados feitos por candidatos (LGPD, Art. 18, II). |
| **Banner de escopo** *(neutro, sempre visível, nunca colapsável, verbatim)* | **Esta fila é de supervisão.** O pedido de cópia é atendido pelo próprio candidato, no momento em que ele clica. O que precisa de alguém aqui é o pedido que **não** foi atendido. A LGPD dá 15 dias corridos para responder a um pedido de acesso (Art. 19, II). |
| Título da seção | **Pedidos registrados** |
| Nota de ordenação | Não atendidos primeiro, do mais antigo para o mais recente. Depois, os atendidos, do mais recente para o mais antigo. |
| Toggle | **Mostrar só os não atendidos** *(desligado por padrão)* |
| Coluna 1 | Candidato |
| Coluna 2 | Pedido feito em |
| Coluna 3 | Situação |
| Coluna 4 | Acompanhamento *(com tooltip — abaixo)* |
| Coluna 5 | O que aconteceu |
| Estado vazio — visão completa | **Nenhum pedido de dados registrado** / Quando um candidato pedir uma cópia dos próprios dados, o pedido aparece aqui. |
| Estado vazio — só não atendidos | **Nenhum pedido ficou sem atendimento** / Todos os pedidos registrados foram atendidos no mesmo momento em que foram feitos. |
| Estado de erro | **Não foi possível carregar a fila de pedidos de dados.** / Verifique sua conexão e tente novamente. *(+ Tentar novamente)* |
| Aviso de corte | Mostrando 200 pedidos. Todos os não atendidos aparecem; os atendidos mais antigos podem ter ficado de fora. |

**O toggle desta fila é o INVERSO do da fila de revisões, e a inversão é obrigatória.** Em
`/rh/revisoes` o padrão é "só pendentes", porque uma revisão **nasce pendente** e a tela abre no
trabalho. Aqui a linha **nasce `atendido`** (o export é self-service, Área 4 do CONTEXT): abrir em
"só não atendidos" mostraria uma tela vazia em praticamente todo acesso, e uma fila que quase sempre
aparece vazia deixa de ser consultada — e com ela morre a supervisão inteira. O padrão é a visão
completa; o toggle **isola** as falhas.

**A ordenação composta é o que torna o aviso de corte verdadeiro.** A afirmação "todos os não
atendidos aparecem" só é honesta porque o `ORDER BY` põe os não atendidos primeiro. **Um plano que
mude a ordenação sem mudar esta copy faz a fila mentir por omissão** — o mesmo modo de falha que o
`avisoCorte` do `FilaRevisoesTable` documenta.

#### Tooltip do cabeçalho "Acompanhamento" — a copy que NÃO pode ser copiada da 42

| Element | Copy |
|---------|------|
| Tooltip *(+ gêmeo `sr-only`, porque o tooltip do Radix só monta ao abrir)* | Dias corridos desde o pedido. A LGPD dá 15 dias corridos para responder a um pedido de acesso (Art. 19, II). Os limiares de atenção e atraso desta coluna ficam **abaixo** desse teto e são definidos pela equipe, para avisar antes do fim. Sem configuração legível, a coluna mostra apenas a contagem de dias. |

⚠ **Armadilha nomeada.** O tooltip vivo de `/rh/revisoes` diz que **"o Art. 20 da LGPD não fixa
prazo"**. Copiá-lo para cá seria uma **afirmação falsa**: o Art. 19, II fixa 15 dias corridos. As
duas filas parecem gêmeas e a copy é o único lugar onde elas divergem de forma juridicamente
relevante. Esta linha existe para que o executor não colar a errada.

#### Coluna "Acompanhamento" — o que cada situação renderiza

| Situação | Célula |
|----------|--------|
| `pendente` | `RevisaoSlaBadge` com a faixa completa (`Em dia` / `Atenção` / `Atrasado` / degenerada) |
| `atendido`, mesmo dia | **Atendido no mesmo dia** *(`text-sm text-white/50`, neutro, sem faixa colorida)* |
| `atendido`, 1 dia | **Atendido em 1 dia** |
| `atendido`, n > 1 dias | **Atendido em {n} dias** |

**Faixa colorida em item fechado é ruído** (regra herdada da 42). E **"Atendido em 0d" é
inaceitável**: com atendimento síncrono esse é o caso esmagadoramente mais comum, e um `0d` na tela
lê como bug em vez de como sucesso. Por isso o zero tem copy própria e o singular tem a sua.

#### Coluna "O que aconteceu" — vocabulário fechado, nunca o erro cru

| Situação / causa | Copy |
|------------------|------|
| `atendido` | **Cópia entregue em {dd/mm/aaaa} às {HH:mm}.** |
| `falha_geracao` | **Falha ao gerar o arquivo.** |
| `curriculo_ausente` | **Currículo não encontrado no armazenamento.** |
| `permissao` | **Falha de permissão.** |
| causa nula ou desconhecida | **Motivo não registrado.** *(nunca em branco, nunca o token cru)* |
| Segunda linha, em **toda** linha não atendida | Atender pelo Encarregado de Dados e responder ao titular. *(`text-sm text-white/60`, mesmo idioma da nota de guard do `FilaRevisoesTable`)* |

**Nunca aparecem nesta coluna:** a mensagem crua do transporte, código HTTP, stack, nome de tabela,
caminho do Storage, ou qualquer identificador interno. A tradução de causa vive no cliente, sobre um
vocabulário fechado, com fallback total — mesma disciplina do `traduzirErro` de `privacidadeService`.

#### O que a fila do RH NUNCA mostra

- **Nenhuma parte do conteúdo exportado.** A fila é sobre o *pedido*, não sobre o *dado*.
- **Nenhum caminho de download.** Invariante 5 — seria uma segunda superfície de exfiltração.
- **Nenhum e-mail, CPF ou documento do candidato.** A supervisão precisa de **nome** e **quando**;
  o resto seria PII acrescentada a uma tela que não a usa. Allowlist da tabela: nome do candidato,
  data do pedido, situação, causa, timestamps. Nada mais.
- **Nenhum UUID como identidade humana.** Candidato sem nome resolvível → **Não identificado**
  (invariante herdada da 42), nunca o travessão genérico e nunca o UUID.

---

### Formatação

- Datas: `dd/mm/aaaa` via `toLocaleDateString('pt-BR', …)` — idioma vivo em `SolicitarRevisaoCTA` e
  `FilaRevisoesTable`.
- Data + hora (carimbo dos arquivos, hora de liberação do cooldown, entrega do pedido):
  `dd/mm/aaaa` + `HH:mm` 24 h, pt-BR.
- Data no nome de arquivo: `aaaa-mm-dd` (ordenável na pasta de downloads; é o único lugar onde a
  ordem é invertida, e é de propósito).
- Contagem de dias: inteiro puro. `{n}d` dentro do badge (herdado da 42), `{n} dias` por extenso
  fora dele.
- Data inválida em qualquer célula: **travessão** `—`, nunca `Invalid Date`, nunca `NaN`
  (comportamento já vivo em `FilaRevisoesTable.formatarData`).

---

## Component Inventory (for the planner)

### Bloco novo dentro de `src/features/privacidade/` (candidato)

O bloco **não** ganha feature própria. A superfície é a página que a Phase 43 declarou a casa desta
fase; fragmentá-la em duas features faria uma única tela viver em dois diretórios.

| Componente / módulo | Papel |
|---------------------|-------|
| `PedirCopiaBloco` (`components/`) | Seção 3 inteira: prosa de escopo + CTA com os 5 estados + alerta inline de erro + linha de cooldown. Molde visual do `GuardaCurriculoBloco` (neutro, `p-4`) |
| `CurriculosBloco` (`components/`) | Lista de currículos por candidatura, cada linha com a ação de abrir. **Não renderiza quando a lista está vazia** |
| `useExportarMeusDados` (`hooks/`) | `useMutation` que chama a EF, recebe o objeto e dispara os dois downloads. **Sem `onMutate` otimista** (Invariante 5 da 43, ainda em vigor nesta página) |
| `useUltimoPedidoDados` (`hooks/`) | Leitura own-row do estado de cooldown. **`retry: false`** e erro resolvido para "estado desconhecido", nunca `isError` da seção — molde exato do `useConfigSlaRevisao` (falhar rápido e degradar para a apresentação que já existe) |
| `exportacaoService.ts` (`services/`) | Invocação da EF + leitura own-row do último pedido + os dois geradores de arquivo (`.json` e `.html`) como **funções puras**, testáveis sem DOM. O disparo do download é uma função separada, com o idioma `Blob`/anchor de `baixarIcsAgendamento` |
| `PrivacidadeCandidatoPage` (**editado**) | +1 `<section className="space-y-4 border-t border-white/15 pt-6">` abaixo da seção 2, hospedando `PedirCopiaBloco` + `CurriculosBloco`. +2 entradas em `COPY_PRIVACIDADE` (título da seção 3). **Nada mais** é editado: as seções 1 e 2 ficam byte-idênticas |

### Feature nova `src/features/pedidos-dados/` (RH)

| Componente / módulo | Papel |
|---------------------|-------|
| `PedidosDadosRHPage` (`components/`) | `RHLayout` + `GlassCard`. H1 + subtítulo + banner de escopo + faixa de controles compacta (nota de ordenação + `Switch`) + tabela. Rota `/rh/pedidos-dados`, `RoleGuard role={['rh','administrador']}` |
| `FilaPedidosDadosTable` (`components/`) | Envolvida por `AsyncState` (copy sobrescrita). 5 colunas, cabeçalho fixo, aviso de corte. **Sem coluna de ação** |
| `SituacaoPedidoBadge` (`components/`) | `Badge` com o vocabulário fechado + normalização defensiva + `TIPOGRAFIA_BADGE` |
| `useFilaPedidosDados` (`hooks/`) | TanStack Query; o toggle **participa da query key** (são duas listas, não uma filtrada — precedente 42) |
| `useConfigSlaDados` (`hooks/`) | Limiares de `config_sla_dados`; `retry: false`; `null` é resultado **válido**, não erro (molde verbatim de `useConfigSlaRevisao`) |
| `usePedidosDadosPendentesCount` (`hooks/`) | Contador do item de menu (molde de `useRevisoesPendentesCount`) |
| `pedidosDadosService.ts` (`services/`) | Leitura por allowlist explícita + tradução de causa por vocabulário fechado. Classe `PedidosDadosError` com `code`, padrão de erro do projeto |
| `constants/slaDados.ts` | **Aliases nomeados, zero cópia de lógica** — ver abaixo |

### As três reutilizações que o plano NÃO pode transformar em cópia

Esta é a parte do inventário com maior risco de o executor "resolver" duplicando.

1. **O classificador de faixa.** `constants/slaDados.ts` **importa e re-exporta** `classifyRevisaoSla`,
   `diasEmEspera` e `ROTULOS_FAIXA_SLA_REVISAO` de `@/features/revisao/constants/slaRevisao`, sob
   nomes do domínio novo (`classifySlaDados`, `LimiaresSlaDados`). **Não é uma cópia adaptada.**
   Justificativa: a decisão da Área 4 que separou `config_sla_dados` de `config_sla_revisao` é sobre
   o **dado** (dois prazos legais distintos não podem compartilhar uma linha de configuração), não
   sobre a **função** — um classificador total de três faixas é agnóstico ao prazo. Duplicá-lo criaria
   um segundo lugar onde o invariante `degenerado` pode apodrecer, e este projeto já embarcou a classe
   "guarda que era dead code" (P39/CR-02). Critério de aceitação sugerido ao plano: uma asserção de
   **identidade de referência** (`classifySlaDados === classifyRevisaoSla`), que uma futura
   cópia-e-cola reprova.
2. **O badge de faixa.** `RevisaoSlaBadge` é reusado **verbatim e sem renomear**. Renomear tocaria a
   feature 42 e seus testes por zero ganho comportamental. O que **é** obrigatório: **emendar o
   docblock** do componente, que hoje afirma "importado exclusivamente pela fila do RH [de revisões]"
   — depois desta fase há dois consumidores, e um comentário que mente sobre o componente é o defeito
   que a 43 mandou corrigir junto com a copy.
3. **O formatador do contador.** `formatarBadgePendentes` é **importado** de `revisaoService`, não
   reescrito. Ele carrega a decisão do `''` para zero, e reescrevê-lo é reintroduzir o `0` solto no
   menu.

### Edições em arquivos existentes

| Arquivo | Edição |
|---------|--------|
| `src/features/privacidade/components/PrivacidadeCandidatoPage.tsx` | +1 `<section>` (seção 3) + 1 título em `COPY_PRIVACIDADE`. Seções 1 e 2 byte-idênticas |
| `src/features/revisao/components/RevisaoSlaBadge.tsx` | **Somente o docblock** — o segundo consumidor nomeado. Zero mudança de código |
| `src/components/RHSidebar.tsx` | +1 import `FileDown` · +1 `MenuItem` `pedidos-dados-rh` com contador · +1 linha em `getActivePageFromPath` · +1 entrada no mapa `routes`. **Os 3 sítios no mesmo commit** |
| `src/router/routes.tsx` | +1 rota `/rh/pedidos-dados` com `RoleGuard role={['rh','administrador']}`, via `lazyNamed` (idioma PERF-03) |

---

## UI Considerations

Derivado do `ui-consideration-probe` com **`elements` autorados**. A nota metodológica das
42/43-UI-SPEC vale aqui integralmente e **não é opcional**: o classificador do probe usa cues em
inglês (`tables?`, `forms?`, `lists?`) e a prosa deste projeto é pt-BR, então `tabela`, `formulário`
e `botão` não casam com cue nenhum — classificar pela prosa produziria falso verde.

Cobertura: **37 aplicáveis · 37 resolvidas · 0 não resolvidas** — 34 explícitas, 3 backstop.

Elementos sondados: **E1** `PedirCopiaBloco` (static-content · interactive-control) · **E2** o CTA e
seus cinco estados (interactive-control) · **E3** `CurriculosBloco` (list-collection ·
interactive-control) · **E4** os dois arquivos entregues (static-content) · **E5** faixa de
controles de `/rh/pedidos-dados` (static-content · interactive-control) · **E6**
`FilaPedidosDadosTable` (list-collection · static-content) · **E7** `SituacaoPedidoBadge`
(static-content) · **E8** `RevisaoSlaBadge` reusado (static-content) · **E9** item "Pedidos de
dados" da `RHSidebar` (nav).

> **Reprodutibilidade da contagem (verificado contra o motor em 2026-08-03).** `E6` é
> `list-collection` **e** `static-content`: a tabela é uma coleção, mas suas células carregam texto
> livre (nome do candidato, título da vaga). `list-collection` sozinho **não** gera a categoria
> `long-text`, e sem ela a linha `E6 · long-text` — que é onde `CELULA_TRUNCADA` é travada — não
> reapareceria numa re-execução do probe. Com a união declarada acima o motor devolve **37
> aplicáveis**, idêntico à tabela. Sem o `static-content`, devolveria 36 e a linha sumiria em
> silêncio.

> **Nota de método, herdada da 43 (E8):** onde o risco real de um elemento é **semântico** e não
> dimensional, ele é registrado na categoria de forma mais próxima (`long-text` para
> `static-content`, `error` para `interactive-control`) com a resolução dizendo o risco de verdade.
> Forçar o risco a caber na pergunta literal da categoria produziria uma linha verde que não protege
> nada.

| # | Elemento | Category | Status | Resolution / Reason |
|---|----------|----------|--------|---------------------|
| E1 | `PedirCopiaBloco` | loading | ✅ covered | Enquanto `useUltimoPedidoDados` está em voo, o bloco renderiza o mesmo `Glass` pulsante de 1 linha que a seção 2 já usa (`h-16 animate-pulse`), preservando a altura. O CTA não aparece meio-renderizado |
| E1 | `PedirCopiaBloco` | error | ✅ covered | Falha na leitura de estado **não** derruba o bloco: o CTA renderiza mesmo assim e o servidor vira a autoridade (Invariante 3). Escopo de seção, nunca de página — precedente vivo do tratamento isolado de `guarda.isError` |
| E1 | `PedirCopiaBloco` | overflow | ✅ covered | Bloco de texto de altura livre dentro de `max-w-2xl`; sem contêiner de altura fixa, sem scroll interno |
| E1 | `PedirCopiaBloco` | long-text | 🧪 backstop | O risco real não é comprimento — é a copy **superestimar** o escopo ou sugerir exclusão. **Backstop:** asserção negativa sobre as strings dos dois bans da §Copywriting, **com o escopo de grep declarado na tabela** (o bloco novo e os geradores, nunca a feature inteira — o `GuardaCurriculoBloco` aprovado na 43 contém "eliminação" legitimamente), **mais** um teste de estado visual a 320px provando que a prosa de escopo não é truncada. Truncar o "o que não está na cópia" é apagar a fronteira que o EXPORT-06 declara |
| E2 | CTA e seus 5 estados | loading | ✅ covered | Em voo: **Preparando sua cópia…**, botão desabilitado, `aria-busy="true"`, `Loader2` ao lado. Duplo clique impossível; sem barra de progresso falsa |
| E2 | CTA e seus 5 estados | error | 🧪 backstop | O risco é o **botão desabilitado sem motivo**, o modo de falha mais provável do cooldown. **Backstop:** asserção **estrutural** — nenhum `<button>` `disabled` do bloco existe sem um nó irmão de motivo visível; e a copy de cooldown vem de **uma** constante, compartilhada entre o estado local e a recusa do servidor. Uma asserção que olhasse só o texto visível não pegaria um `disabled` acrescentado depois (precedente: 3 falsos verdes encontrados no 42-10) |
| E2 | CTA e seus 5 estados | long-text | ✅ covered | Rótulos fixos, sem interpolação; o mais longo ("Baixar uma cópia dos meus dados") é glass com quebra livre e `min-h-[44px]`, então cresce em altura a 320px em vez de estourar. As duas datas interpoladas (cooldown) têm largura conhecida |
| E3 | `CurriculosBloco` | empty | ✅ covered | Zero currículos → o bloco **não renderiza**. A ausência já é dita, com copy aprovada na 43, na seção 2 logo acima. Dois textos para a mesma ausência mandariam o titular procurar duas coisas |
| E3 | `CurriculosBloco` | loading | ✅ covered | Mesmo `Glass` pulsante das seções irmãs; a ação por linha tem seu próprio "Abrindo…" independente das demais |
| E3 | `CurriculosBloco` | error | ✅ covered | Erro **por linha**, inline, `aria-live="polite"` — uma vaga que falha não derruba as outras. Copy própria, nunca o erro cru (Pitfall 7: o signed URL nunca chega a `console.*`) |
| E3 | `CurriculosBloco` | populated | ✅ covered | Uma linha por candidatura com currículo: título da vaga (`truncate` + `title`) + ação `min-h-[44px]`. Volume real hoje: 21 candidatos vivos, poucas candidaturas cada |
| E3 | `CurriculosBloco` | partial | ✅ covered | Candidatura com currículo e **sem título de vaga resolvível** → **Vaga não identificada**, nunca UUID e nunca linha omitida. Omitir esconderia do titular um arquivo que a empresa de fato guarda |
| E3 | `CurriculosBloco` | overflow | ✅ covered | Linhas empilhadas de altura livre em coluna `max-w-2xl`; sem altura fixa, sem scroll interno. Uma pessoa com muitas candidaturas rola a página, que é o gesto natural do mobile |
| E3 | `CurriculosBloco` | zero-one-many | ✅ covered | Zero → bloco ausente (acima). Um → linha única, sem tratamento especial. Muitos → mesma lista. O corpo "Um currículo por vaga a que você se candidatou" é **neutro quanto ao número**, então não há singular/plural a errar |
| E3 | `CurriculosBloco` | long-text | ✅ covered | Título de vaga é o único texto livre: `truncate` + `title` com o valor íntegro (par obrigatório, idioma vivo do projeto) |
| E4 | Os dois arquivos entregues | overflow | ✅ covered | O HTML é um documento de fluxo, sem contêiner de altura fixa: ele rola no navegador e pagina na impressão. O `.json` é lido por máquina, sem layout |
| E4 | Os dois arquivos entregues | long-text | ✅ covered | Campos de texto livre do titular (respostas, observações) entram **íntegros**, nunca truncados: truncar a cópia dos dados de alguém é entregar uma cópia falsa. A ausência de valor renderiza travessão, nunca `null` cru |
| E5 | Faixa de controles do RH | loading | ✅ covered | Banner, nota e `Switch` são estáticos e renderizam junto com a página; a fila abaixo tem seu próprio skeleton via `AsyncState` |
| E5 | Faixa de controles do RH | error | ✅ covered | Sem fonte de dado própria → sem caminho de falha. O erro pertence à tabela e é tratado lá |
| E5 | Faixa de controles do RH | overflow | ✅ covered | `flex flex-wrap items-center justify-between gap-2` — a nota e o toggle quebram para duas linhas em viewport estreito, idioma verbatim de `RevisoesRHPage` |
| E5 | Faixa de controles do RH | long-text | ✅ covered | Strings fixas. O banner é a mais longa (~50 palavras) e é um parágrafo de altura livre, jamais colapsável — a 43 travou o precedente de banner sempre visível |
| E6 | `FilaPedidosDadosTable` | empty | ✅ covered | **Dois vazios distintos** conforme o toggle (copy própria em §Copywriting), nunca o vazio genérico do `AsyncState`: "nenhum pedido registrado" e "nenhum ficou sem atendimento" são fatos diferentes, e o segundo é uma **boa notícia** que precisa ser lida como tal |
| E6 | `FilaPedidosDadosTable` | loading | ✅ covered | Skeleton do `AsyncState`. A config de SLA **nunca** participa do carregamento da tabela: `null` já é apresentação completa (faixa degenerada), então nem `isLoading` nem `isError` dela entram aqui — molde verbatim do `FilaRevisoesTable` |
| E6 | `FilaPedidosDadosTable` | error | ✅ covered | Copy própria + retry via `AsyncState`; nunca ecoa mensagem crua de transporte |
| E6 | `FilaPedidosDadosTable` | populated | ✅ covered | Não atendidos primeiro (mais antigo → mais recente), depois atendidos (mais recente → mais antigo); 5 colunas; realce âmbar redundante nas linhas não atendidas |
| E6 | `FilaPedidosDadosTable` | partial | 🧪 backstop | O SC#4 inteiro vive aqui: **uma linha não atendida tem de ser distinguível de uma atendida**. **Backstop:** teste que assere a distinção por canal **textual** (a palavra "Não atendido" presente na linha) e **não** por classe de cor — uma asserção baseada em `bg-amber-500/5` passaria numa UI que quebrou a regra colorblind-safe, que é exatamente o falso verde que a Invariante 6 existe para impedir. O mesmo teste cobre o parcial de dado: causa nula → **Motivo não registrado**, candidato sem nome → **Não identificado** |
| E6 | `FilaPedidosDadosTable` | overflow | ✅ covered | Sem paginação: o volume vivo é de dezenas (21 candidatos, cooldown de 24 h) e o corte real é do servidor (200), anunciado fora da tabela quando atingido. `max-h-[70vh]` + cabeçalho fixo nas **células** herdados verbatim — **mantidos mesmo com volume baixo**, porque o custo é zero e a alternativa é descobrir a falta deles no dia em que a fila crescer. `overflow-x-auto` do wrapper para largura estreita |
| E6 | `FilaPedidosDadosTable` | zero-one-many | ✅ covered | Zero → os dois vazios acima. Um → linha única sem tratamento especial. Muitos → cap de 200 com aviso honesto. A copy de dias tem as três formas (**mesmo dia** / **1 dia** / **{n} dias**), porque `0d` e `1 dias` seriam ambos lidos como defeito |
| E6 | `FilaPedidosDadosTable` | long-text | ✅ covered | Nome do candidato e título de vaga usam `CELULA_TRUNCADA` (`max-w-[220px] truncate`) + `title`. As causas vêm de vocabulário fechado, com comprimento conhecido |
| E7 | `SituacaoPedidoBadge` | overflow | ✅ covered | Duas palavras no máximo ("Não atendido"); badge de largura natural, sem contêiner fixo |
| E7 | `SituacaoPedidoBadge` | long-text | ✅ covered | Vocabulário fechado e normalizado no cliente; valor desconhecido cai no tratamento neutro exibindo o token cru — nunca célula vazia, nunca superfície fechada (precedente 42-11) |
| E8 | `RevisaoSlaBadge` reusado | overflow | ✅ covered | Rótulo + contagem num único elemento inline; a faixa degenerada é ainda mais curta. Sem contêiner de altura fixa |
| E8 | `RevisaoSlaBadge` reusado | long-text | ✅ covered | Rótulos fixos de uma palavra + `{n}d`. **A faixa degenerada é a resolução do caso extremo:** config ausente/ilegível de `config_sla_dados` — estado alcançável em produção porque a tabela é alterável sem deploy — renderiza a contagem sem badge, nunca uma tela de erro (Invariante 7) |
| E9 | Item "Pedidos de dados" da sidebar | loading | ✅ covered | O item renderiza junto com o menu; o contador chega depois e é **ausente** enquanto indefinido (`formatarBadgePendentes` devolve `undefined` — ver a correção factual em §Rota nova), nunca um `0` provisório. Precedente direto: 42-10 |
| E9 | Item "Pedidos de dados" da sidebar | error | ✅ covered | Falha da contagem → sem badge, item plenamente funcional. Um contador errado no menu é pior que contador nenhum: manda o operador procurar trabalho que não existe |
| E9 | Item "Pedidos de dados" da sidebar | overflow | ✅ covered | Rótulo de duas palavras; no menu recolhido vira só ícone com `title`, comportamento vivo do componente |
| E9 | Item "Pedidos de dados" da sidebar | long-text | ✅ covered | "Pedidos de dados" — 16 caracteres, mais curto que "Configurações" + badge, combinação que o menu já acomoda hoje em "Revisões" |

<!-- Status vocabulary (locked by probe-core projectTruths):
     ✅ covered   → a plain truth string lifted into must_haves.truths
     🧪 backstop  → a flat scalar { statement, verification: backstop }; at verify time, no explicit
                    evidence → insufficient_spec → human_needed (never a silent pass, #1154)
     ⚠ unresolved → an explicit planner assumption (surfaced, never silently dropped)
     Rows are REPLACED (not appended) on a probe re-run — idempotent. -->

### Acessibilidade (piso, não varredura completa)

- Todo controle acionável com `min-h-[44px]`; ícones decorativos com `aria-hidden="true"`.
- O CTA em voo carrega `aria-busy="true"`; o `GlassButton` **repassa** props não-estilo desde o
  fix do 42-11, então `aria-busy`, `aria-describedby` e `title` chegam ao `<button>`.
- **O motivo do cooldown é texto visível, não `title`.** Um motivo que só existe em hover é
  inalcançável em toque e em leitor de tela — e este é o único estado em que a pessoa é impedida de
  exercer um direito. O botão desabilitado referencia o motivo por `aria-describedby`.
- Erro do pedido de cópia em texto visível **e** `role="alert"`; erro por linha de currículo com
  `aria-live="polite"` (idioma vivo do `CvButton`).
- Tooltip do cabeçalho "Acompanhamento" com **gêmeo `sr-only`** carregando a mesma string —
  o tooltip do Radix só monta o conteúdo ao abrir (precedente 42, obrigatório).
- Tabela com `TableHeader`/`TableHead` semânticos. **Não há coluna de ações**, logo não há cabeçalho
  `sr-only` de ações — a tabela desta fase tem 5 cabeçalhos visíveis e nenhum oculto.
- `Switch` com `Label` associado por `htmlFor`; o estado é dito também em texto (regra
  colorblind-safe), não só pela posição do controle.
- A distinção atendido × não atendido alcança leitor de tela pela **palavra no badge**, nunca pela
  classe de cor da linha (Invariante 6).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | table, badge, switch, label, tooltip, button, skeleton, separator | not required — todos já vendorizados em `src/components/ui/` desde o M1/Phase 7; nenhum `add`/`init` executado nesta fase |
| third-party | **nenhuma declarada** | not applicable |

Nenhuma registry de terceiros declarada → **nenhum** gate `shadcn view`/diff necessário e nenhum
bloco de terceiro entra no contrato.

**Zero dependência npm nova** (invariante do M8 herdada do M7): `lucide-react`,
`@tanstack/react-query` e `date-fns` já são dependências do projeto. Os dois geradores de arquivo são
**hand-rolled** — `JSON.stringify` para o `.json` e string-building para o `.html`, no mesmo idioma
que `_shared/email-templates.ts` e `gerarIcsAgendamento` já estabeleceram. **Explicitamente
rejeitados:** qualquer biblioteca de PDF, qualquer biblioteca de ZIP (que seria o caminho "óbvio"
para entregar os dois arquivos num só, e que é dependência nova), qualquer biblioteca de tabela.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
