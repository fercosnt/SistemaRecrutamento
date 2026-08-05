---
phase: 45
slug: motor-de-exclus-o-anonimiza-o
status: draft
shadcn_initialized: true
preset: existing project install (shadcn/ui + Radix; tokens em src/styles/globals.css; primitivos vendorizados em src/components/ui/ desde o M1)
created: 2026-08-04
persona: candidato (mobile-first — seção 4 nova em `/candidato/privacidade` + ação nova por candidatura em `/candidato/dashboard`) + RH (leitura, sem tela nova)
---

# Phase 45 — UI Design Contract

> Contrato visual e de interação do **Motor de Exclusão & Anonimização**.
> Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

## Por que esta UI-SPEC existe, em uma frase que o ROADMAP já escreveu

> *"É a superfície onde uma ambiguidade de copy vira ação irreversível."*

Nas Phases 42–44 a copy podia mentir e o dano era **retratável por escrito**. Aqui não. O
operador decidiu, com data, **não ligar o PITR** (D-45-10): os backups do Supabase cobrem 7 dias
e **excluem o Storage inteiramente**. Um currículo apagado por engano é **irrecuperável por
qualquer meio** — não existe segunda rede. As strings deste documento são, literalmente, a última
coisa que uma pessoa lê antes de um efeito que ninguém pode desfazer.

**Consequência mecânica, e ela é mais dura que nas fases anteriores:** um executor que "melhore" a
redação de qualquer linha da §Copywriting Contract sem passar por esta spec não está editando texto
— está alterando o consentimento sob o qual um dado é destruído.

---

## Escopo desta UI-SPEC

Dos 10 requirements da fase, **4 têm superfície visual**. Esta spec **não** inventa UI para os
demais, e a ausência está declarada para não ser lida como esquecimento.

| Requirement | Superfície | Natureza |
|-------------|-----------|----------|
| **ERASE-05** | Ação **"Retirar minha candidatura"** no card de candidatura de `/candidato/dashboard` **+** a distinção dita por escrito na seção 4 de `/candidato/privacidade` | **Ação nova em tela existente** (mobile-first) |
| **ERASE-06** | Seção 4 **"Apagar meus dados"** em `/candidato/privacidade`: pedido, confirmação aninhada, painel da janela de arrependimento e **cancelamento** | **Seção nova em rota existente** (mobile-first) |
| **ERASE-07** | O **recibo em duas colunas**, em dois tempos: prévia em **tempo futuro** dentro da janela (na tela) e recibo em **tempo passado** na execução (por e-mail) | Bloco novo + superfície de e-mail |
| **D-45-06** | **E-mail de aviso ao RH** quando o pedido encerra candidaturas em andamento **+** a candidatura encerrada **legível** na superfície do RH | Superfície de e-mail + copy em tela existente |
| ERASE-01/02/03/04/08/09/10 | — | **Sem UI.** São o motor, as FKs e o snapshot de bias. Têm **consequência** de copy (a coluna "o que foi mantido" do recibo é derivada do que o motor de fato preserva), mas nenhuma tela os exibe |

**Binding upstream:** `45-CONTEXT.md` (D-45-01 a D-45-10), `.planning/REQUIREMENTS.md`
(ERASE-01..10), `.planning/ROADMAP.md` §Phase 45 (5 critérios de sucesso), `STATE.md` §"Decisões
travadas para a Phase 45", e as três UI-SPECs aprovadas — `43-UI-SPEC.md` (shell do candidato,
âncora visual, invariantes de copy), `44-UI-SPEC.md` (a seção 3 e a emenda do CTA primário) e
`42-UI-SPEC.md` (método).

**Reuse-first:** esta fase **não** introduz token novo, escala nova, shell nova, primitivo novo,
rota nova nem dependência npm nova. Ela é a quarta fase seguida a ocupar `/candidato/privacidade`
— a página que a Phase 43 declarou, no próprio docblock, "a CASA que a Phase 44 (pedir cópia dos
dados) e a **Phase 45 (pedir exclusão)** vão ocupar".

### O que esta fase deliberadamente NÃO faz

- **Nenhuma rota nova, nem de candidato nem de RH.** Logo, **zero** trabalho de alcançabilidade:
  a `RHSidebar` não engorda, a `CandidatoNavbar` não engorda, o `routes.tsx` não recebe entrada.
- **Nenhuma fila de RH para pedidos de exclusão.** `/rh/pedidos-dados` continua com o filtro
  servidor `tipo = 'acesso'` **byte-idêntico** e **sem coluna `Tipo`**. Justificativa completa na
  Invariante 9 — em resumo: um pedido de exclusão não tem ação de RH, e uma fila sem ação que
  exibe "esta pessoa some em 15 dias" é PII nova numa tela que não a usa.
- **Nenhuma tela de "conta apagada".** Depois da execução o usuário do Auth **deixou de existir**
  (D-45-09, hard delete) — não há sessão possível, não há tela possível. Ver Invariante 8 para por
  que o login também **não** ganha mensagem especial.
- **Nenhum toggle/switch de autogestão no `GuardaCurriculoBloco`.** A Phase 43 registrou por que
  ele não existe; esta fase **não** o cria. O que a fase faz com aquele bloco é uma emenda de
  **uma** string, declarada abaixo.
- **Nenhuma edição na EF `notificar-candidato`.** Ver §Correções factuais — o CONTEXT atribuiu o
  evento novo ao arquivo errado, e a correção **reduz** o risco da fase.

---

## Correções factuais ao 45-CONTEXT (medidas no código vivo em 2026-08-04)

Registradas aqui porque as duas alteram o desenho, e uma delas retira um risco nomeado.

### 1 · O evento novo **não** pertence a `notificar-candidato` — e portanto o arquivo dos 2 CRITICAL não é tocado

O D-45-08 diz que a notificação ao RH "exige um evento novo no vocabulário fechado … fechado em
dois lugares: no código da EF `notificar-candidato` **e** numa CHECK constraint no banco", e marca
a edição como alto risco por ser "o mesmo arquivo que já embarcou 2 defeitos CRÍTICOS".

**No código vivo, a notificação ao RH tem EF própria desde a Phase 42:** `supabase/functions/notificar-rh/`,
com vocabulário fechado em **um** evento (`EVENTO_LEDGER_RH = 'revisao_solicitada'`,
`notificar-rh/helpers.ts:30`) e assunto/corpo próprios (`assuntoRevisaoSolicitada`,
`corpoRevisaoSolicitada`). E `_shared/email-config.ts:40-51` proíbe **explicitamente**, por
docblock, acrescentar rótulo de RH à união `EventoNotificacao`:

> *"⚠ NÃO adicionar aqui rótulo que não seja evento de CANDIDATO. … cada valor acrescentado aqui
> obriga uma entrada em SUBJECTS, CORPOS e PREHEADERS, e um template órfão é e-mail que nunca será
> enviado."*

**Consequência de desenho, e ela é uma redução de risco:**

| O que muda | Onde | Risco |
|---|---|---|
| O evento de aviso ao RH | `notificar-rh` (+ helpers próprios, molde vivo) | baixo — EF de um evento só, com testes |
| O evento de recibo ao titular | **helpers próprios da EF de execução**, mesmo precedente do `notificar-rh` | baixo — nenhum `Record<EventoNotificacao, …>` é tocado |
| `notificacoes_enviadas_evento_check` | migration (hoje 5 valores: `confirmacao`, `avanco`, `convite`, `decisao`, `revisao_solicitada`) | **é o único lugar realmente compartilhado** |
| `notificar-candidato/index.ts` | **NÃO É EDITADO NESTA FASE** | eliminado |

O "fechado em dois lugares" do CONTEXT continua verdadeiro; o que muda é **qual** código. O risco
de negócio que o operador travou (o RH é notificado) é preservado integralmente.

### 2 · A copy viva do `GuardaCurriculoBloco` fica FALSA no dia em que esta fase embarcar

`GuardaCurriculoBloco.tsx:57` renderiza hoje, aprovada na Phase 43:

> *"Para retirar esta autorização ou pedir a eliminação do seu currículo, escreva para o nosso
> Encarregado de Dados: lgpd@beautysmile.com.br."*

Depois desta fase, a mesma página passa a oferecer a eliminação **duas seções abaixo**, em
autoatendimento. Mandar a pessoa escrever um e-mail para fazer o que o botão logo abaixo faz não é
só redundante — é a página se contradizendo dentro de um scroll. **A emenda é obrigatória e está
na §Copywriting.** O canal humano **permanece** (Art. 8º §5 e o caso "não consigo entrar na
conta"); o que muda é a ordem: autoatendimento primeiro, canal humano como saída.

---

## Invariantes não-negociáveis desta fase

Precedem qualquer escolha estética. Um plano que os viole está errado mesmo que fique bonito.

**1 · "Retirar candidatura" e "apagar meus dados" moram em TELAS DIFERENTES, e a separação física
é o mecanismo — não a copy.** Duas ações irmãs, lado a lado, com rótulos parecidos, num cartão
glass em 320px, é a fábrica de mis-tap que o ROADMAP nomeou. Portanto:

- **Retirar candidatura** vive **no card da candidatura**, em `/candidato/dashboard` — escopo de
  **uma vaga**, ao lado do objeto sobre o qual age.
- **Apagar meus dados** vive na **seção 4 de `/candidato/privacidade`** — escopo de **conta
  inteira**, numa página cujo assunto declarado são os dados.
- As duas **nunca** aparecem na mesma dobra da mesma tela.

**2 · A navegação flui só da ação irreversível para a mais branda, nunca ao contrário.** A seção 4
**aponta** para o painel ("se você só quer sair de um processo, é outra coisa e fica lá"). O
diálogo de retirada **nomeia** a página de dados **sem link e sem botão** — ele diz o que a
retirada *não* faz, e ponto. Um link ali transformaria "quero sair desta vaga" em um caminho de
**dois cliques** até um efeito irreversível, que é a escalada exata que esta fase existe para não
construir.

**3 · Cancelar a exclusão NÃO reabre as candidaturas — e a tela tem de dizer isso ANTES do
primeiro clique, não depois.** O D-45-06 travou: pedir exclusão **encerra na hora** as
candidaturas em andamento, e a janela de 15 dias corre a partir daí. Logo a janela é cancelável
quanto à **exclusão dos dados** e **não** quanto ao **encerramento dos processos**. Uma frase
como "você pode cancelar a qualquer momento", sozinha, promete um desfazer que não existe.
**Proibida em qualquer variação sem o qualificador**, nos três sítios onde o cancelamento é
mencionado (bloco, diálogo de confirmação, painel da janela).

**4 · O recibo nunca afirma mais do que o motor fez — e por isso as duas colunas são DERIVADAS,
nunca digitadas.** SC#5 é explícito ("sem superestimar o que foi feito"), e o precedente é o
EXPORT-04 desta mesma cadeia: o inventário é **gerado, nunca digitado**. Mesma disciplina aqui — a
fonte é `supabase/functions/_shared/exportAllowlist.ts` + `docs/compliance/export-scope-rules.yaml`,
que o 45-CONTEXT nomeia como "o inventário **é** o plano de exclusão". **Uma linha do recibo só
pode dizer "apagado" se existir caminho de código que a apague**, e o plano tem de exibir o
mapeamento linha→caminho. Corolário duro: **proibida a palavra "todos"** ("todos os seus dados",
"tudo o que temos sobre você") na superfície de exclusão — é literalmente falso, porque a
justificativa do recrutador sobrevive anonimizada (D-45-02/03) e a trilha de decisão sobrevive
inteira (ERASE-08).

**5 · A tela nunca declara conclusão antes de os TRÊS sistemas confirmarem.** A mutação é
`Storage → Postgres → Auth`, **não-atômica e sem transação compartilhada** — o estado "Storage
apagado, Postgres ainda não" é alcançável em produção, não hipotético. Enquanto o pedido não está
integralmente concluído, a copy diz **em andamento**, nunca "concluído", "apagado", "pronto" ou
qualquer sinônimo de desfecho. E o estado de execução parcial **não** oferece botão de "tentar de
novo" ao titular: a retomabilidade é do motor (ERASE-04), e um retry na mão do titular seria
convidá-lo a re-disparar uma mutação destrutiva não-atômica.

**6 · O botão que apaga é glass-branco como os irmãos; o vermelho vive DENTRO da confirmação.**
Um CTA vermelho numa página glass-sobre-azul (i) rouba a âncora visual que as Phases 43 e 44
protegem há duas fases, (ii) colide com o vermelho que **já é o canal de erro desta mesma página**
— e "erro" e "ação destrutiva" indistinguíveis num scroll é exatamente o tipo de ambiguidade
proibida aqui —, e (iii) **atrai o clique**, que é o oposto do que se quer de uma ação
irreversível. O peso destrutivo é carregado onde a decisão realmente acontece: no `AlertDialog`.

**7 · Confirmação aninhada, SEM digitação-refém — e a justificativa é jurídica, não ergonômica.**
Nada de "digite APAGAR para confirmar". Exigir transcrição de uma palavra para exercer um direito
do Art. 18 é fricção sobre um direito, numa superfície mobile-first, para um público que a Phase
43 já obrigou a escrever em linguagem simples (BD-3). **A rede de segurança desta fase é a janela
de 15 dias cancelável**, que protege sem obstruir — é reversível na direção que importa. O molde é
o `EditarJanelaDialog` vivo (`src/features/admin/retencao/`): diálogo + `AlertDialog` aninhado,
com as duas regras de rótulo dele herdadas verbatim (recuo largo × recuo curto com palavras
diferentes; **nunca** "Cancelar" nos dois — aqui a colisão seria pior, porque "Cancelar" é também
o nome da ação de **cancelar a exclusão**).

**8 · Depois da execução não existe tela, e o login não ganha mensagem especial.** Hard delete
(D-45-09) — a linha do Auth some. Uma mensagem de login do tipo "esta conta foi apagada" seria
(i) impossível de produzir sem guardar um registro chaveado por e-mail, ou seja, **PII sobrevivendo
à exclusão**, e (ii) um oráculo de enumeração de contas. O login responde exatamente o que responde
hoje. E como o índice único vivo é parcial em `is_sso_user = false` e **não** em
`deleted_at IS NULL` (D-45-09, medido), o e-mail volta a ficar livre: a pessoa **pode se cadastrar
de novo**, e é isso — e só isso — que a copy do recibo promete.

**9 · O RH não ganha fila, e a candidatura encerrada não pode sumir em silêncio.** Não há fila
porque não há ação: o motor executa sozinho e nenhum recrutador pode acelerar, adiar ou atender um
pedido de exclusão — uma fila sem ação seria a promessa órfã que este milestone existe para
eliminar (Invariante 5 da 44), agravada por exibir a recrutadores uma lista de pessoas com data de
desaparecimento. **Mas o silêncio também é proibido:** uma candidatura que hoje soma na etapa e
amanhã não está lá é um recrutador agendando entrevista com quem saiu. O aviso é o e-mail
(D-45-06) **e** o estado nomeado na superfície do funil. As duas coisas juntas; nenhuma sozinha.

**10 · Nenhum e-mail desta fase carrega nome de candidato.** Herança direta e não-negociável da
decisão de privacidade T-42-24 (`notificar-rh/helpers.ts:80-95`): em modo `teste` o corpo
**inteiro** viaja para `resend.dev`, domínio de terceiro sem contrato de tratamento. O aviso ao RH
nomeia a **vaga** e leva para a lista de candidatos daquela vaga. O recibo ao titular é a única
exceção parcial e por natureza — ele **vai para** o titular —, e mesmo ele não interpola nome, CPF
nem `candidato_id` no corpo.

**11 · Distinção nunca só por cor.** Regra colorblind-safe herdada (ScoreCell / T-34-04-03,
reafirmada em 42, 43 e 44): todo estado desta fase carrega **a palavra**; cor e ícone são canais
redundantes, jamais o único.

**12 · Nenhum valor interno vaza para o titular.** Nada de `solicitacao_id`, nome de bucket,
caminho de Storage, nome de tabela, SQLSTATE, código HTTP ou contagem de linhas afetadas. O
titular vê **datas e consequências**; o motor vê identificadores.

---

## Emendas registradas aos contratos das Phases 43 e 44

Duas, ambas declaradas para não serem lidas como deriva.

### Emenda A — `/candidato/privacidade` cresce para **quatro** seções

A 44-UI-SPEC deixou a regra pronta: *"Se algo novo precisar entrar nesta tela depois desta fase,
entra **abaixo** da seção 3."* Esta fase a executa. **As três restrições que protegem a âncora
visual continuam valendo verbatim** e o executor não pode relaxá-las:

1. O bloco é a **quarta** seção, abaixo das três existentes, separado pelo mesmo
   `border-t border-white/15 pt-6`.
2. O CTA é **glass-branco** (`bg-white/20` → `bg-white/30`), **nunca accent**, **nunca
   destructive**, **nunca full-bleed** (Invariante 6).
3. O molde do container é o mesmo dos blocos irmãos, verbatim:
   `rounded-lg border border-white/15 bg-white/5 p-4`. **Sem padding maior, sem borda mais forte,
   sem sombra própria** — seriam as formas silenciosas de roubar a âncora.

A âncora visual de `/candidato/privacidade` **continua sendo a lista de autorizações** (seção 1),
declaração da 43-UI-SPEC, preservada agora pela terceira fase seguida.

### Emenda B — uma string aprovada na Phase 43 é reescrita

`COPY_GUARDA_CURRICULO.notaRevogacao` é editada (motivo na §Correções factuais 2). É a **única**
string de outra fase que este contrato altera; `AutorizacoesLista`, `PedirCopiaBloco` e
`CurriculosBloco` ficam **byte-idênticos**.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (instalação existente do projeto — **NÃO** re-inicializada; não há `components.json` na raiz; 50+ primitivos vendorizados em `src/components/ui/` desde o M1) |
| Preset | projeto já cabeado; tokens em `src/styles/globals.css`, primitivos em `src/components/ui/` |
| Component library | Radix (via shadcn/ui) |
| Icon library | lucide-react |
| Font | Helvetica Neue, Helvetica, Arial, sans-serif (`--font-family`) |

**Gate do shadcn — decisão registrada (idêntica às Phases 7–17, 42, 43 e 44):** `components.json`
**ausente** e `npx shadcn init` **deliberadamente não executado**. Vários primitivos vendorizados
carregam imports com versão embutida (`@radix-ui/react-slot@1.1.2`) resolvidos por `resolve.alias`
no `vite.config.ts`; rodar o init reescreveria esses arquivos e quebraria o alias. Não é lacuna, é
o estado travado do projeto.

**Shell — herdada, não clonada.** A seção 4 entra dentro do `GlassPanel variant="white" blur="xl"`
que a `PrivacidadeCandidatoPage` já monta, dentro da `ScreenShell` que ela já define. A ação de
retirada entra dentro do `GlassCard variant="white" blur="md"` que o `DashboardCandidatoPage` já
renderiza por candidatura. **Nenhuma das duas shells é tocada.**

**Rotas novas:** **nenhuma.**

### Âncora visual primária (uma por tela — declarada, não inferida)

- **`/candidato/privacidade`:** a **lista de autorizações** (seção 1). Ver Emenda A.
- **`/candidato/dashboard`:** o **card da candidatura e seu CTA de funil** ("Acompanhar
  candidatura" / o step-CTA vivo). A retirada é **subordinada** — ver a regra de peso na
  §Copywriting.

**Primitivos shadcn em escopo (todos já vendorizados):** `dialog`, `alert-dialog`, `button`,
`skeleton`, `separator`. **Nenhum `table`** — o recibo de duas colunas **não** é uma `<table>`
(ver E4 · overflow). **Nenhum `sonner`/toast**: todo desfecho desta fase é persistente por
definição — um aviso de 4 segundos sobre uma exclusão irreversível é a forma errada de dizer
qualquer coisa aqui.

**Componentes do projeto reusados (não re-autorar):**

| Componente | Papel nesta fase |
|-----------|------------------|
| `Glass` / `GlassPanel` / `GlassCard` / `GlassButton` (`src/components/ui/glass.tsx`) | Camada glass das duas superfícies. O spread de props não-estilo já foi corrigido (42-11 / D-42-11-01): `aria-*`, `title` e `aria-busy` chegam ao `<button>` |
| `EditarJanelaDialog` (`src/features/admin/retencao/`) | **Molde estrutural** da confirmação aninhada: `Dialog` + `AlertDialog` no `AlertDialogTrigger asChild`, recuo largo × recuo curto com rótulos distintos, foco delegado ao Radix. Copiar a **estrutura**, nunca a copy |
| `AsyncState` (`src/components/ui/AsyncState.tsx`) | **NÃO é usado nesta fase.** Precedência declarada para o executor não o alcançar por reflexo: as duas superfícies são blocos dentro de páginas que já têm o próprio idioma de skeleton/erro **de seção** (`Glass … h-16 animate-pulse`), e o `AsyncState` envolve em `Glass variant="dark"` — tratamento de card RH, estranho ao glass-branco do candidato |
| `PedirCopiaBloco` (`src/features/privacidade/`) | **Molde de composição** da seção 4: prosa → CTA → motivo irmão do `disabled` → estado persistente. **Não editado** |
| `CvButton` / `baixarIcsAgendamento` | **Não usados.** Registrados porque não há download nesta fase (ver §Copywriting, "o recibo não é um arquivo") |
| `notificar-rh/helpers.ts` | **Molde** dos dois e-mails: `layoutBase` + `escapeHtml` de `_shared/email-templates.ts`, assunto com CR/LF neutralizado, corpo sem nome de pessoa, `dedupe_key` por destinatário |

---

## Spacing Scale

Escala estabelecida (múltiplos de 4), idêntica às UI-SPECs aprovadas das Phases
11/13/14/15/34/42/43/44. **Nenhum valor novo.**

| Token | Value | Usage nesta fase |
|-------|-------|------------------|
| xs | 4px | Gap ícone↔rótulo dentro dos botões (`gap-1`) |
| sm | 8px | Rótulo↔corpo dentro dos blocos; linhas do recibo (`space-y-2`) |
| md | 16px | Padding interno do bloco neutro e da caixa de consequência (`p-4`); gap entre as duas colunas do recibo (`gap-4`) |
| lg | 24px | Ritmo vertical entre as seções de `/candidato/privacidade` (`space-y-6`, já vivo); padding do `DialogContent` |
| xl | 32px | Não usado nesta fase — registrado para completude da escala |
| 2xl | 48px | Não usado nesta fase |
| 3xl | 64px | Respiro superior/inferior da página (`py-20`, herdado da `ScreenShell`) |

**Exceções (todas múltiplos de 4, todas com precedente):**

- `min-h-[44px]` (44 = 4×11) — piso de alvo tátil em **todo** controle acionável desta fase: o CTA
  "Apagar meus dados", "Cancelar a exclusão", "Retirar minha candidatura", e os quatro botões dos
  dois diálogos. Precedente: Phases 11/13/14/15/34/42/43/44.
- `sm:max-w-lg` no `DialogContent` — herdado verbatim do `EditarJanelaDialog`.

**Explicitamente sem exceção nova.** Em particular, a seção 4 **não** ganha padding próprio
diferente do `p-4` dos blocos irmãos (Emenda A, restrição 3), e a ação de retirada **não** ganha
margem que a descole do resto do card a ponto de virar um segundo CTA.

---

## Typography

Família Helvetica Neue (`--font-family`). Exatamente **4 tamanhos, 2 pesos**. Body 1.5, heading
1.2. Escala idêntica ao contrato aprovado das Phases 11/13/14/15/42/43/44 — não re-derivada.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body / prosa da seção 4 / corpo dos diálogos / células do recibo / corpo dos e-mails | 16px (`text-base`) | regular (400) | 1.5 |
| Label / rótulo de botão / cabeçalho de coluna do recibo / linha de estado da janela / motivo do `disabled` / citação do artigo | 14px (`text-sm`) | semibold (600) | 1.4 |
| Título de seção ("Apagar meus dados") e título de diálogo | 20px (`text-xl`) | semibold (600) | 1.2 |
| H1 da página ("Seus dados e autorizações") | 28px (`text-3xl`, cap responsivo `md:text-4xl`) | semibold (600) | 1.2 |

**Notas:**

- A proximidade 14/16 é intencional e separada perceptualmente por **peso** — precedente das
  Phases 11/13/14/15/42/43/44, não uma micro-banda.
- **A prosa que descreve a consequência é leitura de carga, não legenda:** 16px / 1.5
  (`text-base leading-relaxed`), nunca truncada, nunca em `text-sm`, **nunca dentro de um
  `<details>`/accordion**. Encolher ou dobrar o texto que descreve um efeito irreversível é
  encolher o consentimento.
- **O rótulo da ação de retirada é 14px/600**, não 16px, e isso é hierarquia deliberada: ele é
  subordinado ao CTA de funil do card (§Âncora visual).
- Somente dois pesos: 400 e 600. Nada de 500/700/800, apesar de existirem em `globals.css`.

### `text-xs` (12px) — o 5º tamanho, e como esta fase não o cria

`globals.css:79` resolve `--text-xs` em **12px**, sem alias para 14px. Um 5º tamanho é 5º tamanho
independentemente de onde apareça (veredito do checker da 42-UI-SPEC, reafirmado em 43 e 44).

- **Esta fase autora zero `text-xs`.** Toda string que ela escreve — inclusive a citação do artigo
  na coluna "o que fica", inclusive o motivo de um botão desabilitado — renderiza a **14px**.
- Nos dois e-mails, o rodapé de fallback de link herda o `font-size:14px` que
  `corpoRevisaoSolicitada` já usa. **Não copiar nada abaixo de 14px.**
- O achado cross-phase `.planning/todos/pending/ui-spec-text-xs-quinto-tamanho.md` permanece aberto
  e **não** é resolvido aqui — esta fase apenas não o agrava.

---

## Color

Paleta **travada** — idêntica às Phases 11/13/14/15/34/42/43/44.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#00109E` brand-primary (`--primary`; `BackgroundImage background="gradient"`) | Fundo de página atrás de todo glass |
| Secondary (30%) | `bg-white/5`–`bg-white/20` branco translúcido (`Glass`/`GlassCard`/`GlassPanel`) | Bloco da seção 4, caixa do recibo, painel da janela, os dois `DialogContent`, **e todos os CTAs** |
| Accent (10%) | `#35BFAD` brand-accent (`--accent`) | **ZERO usos nesta fase** — ver abaixo |
| Destructive | `#EF4444` (`--destructive`) | Lista reservada explícita abaixo |

**Accent (`#35BFAD`) reservado para — a lista tem ZERO itens.**

Esta fase não cria item de menu, não cria rota, não cria estado ativo de navegação e não pinta
nenhum CTA. **Nenhum elemento desta fase usa accent.** A declaração é explícita porque a ausência
é o risco: um executor que sinta a seção 4 "apagada" ao lado das irmãs e pinte o CTA de accent
estará dando destaque de marca ao único botão da aplicação que destrói dados — o inverso exato da
Invariante 6.

**Destructive (`#EF4444`) reservado para — lista explícita, e ela tem TRÊS itens:**

1. **A borda e o fundo da caixa de consequência** dentro do `AlertDialog` de exclusão
   (`border-destructive/40 bg-destructive/10`) — o mesmo tratamento que `PedirCopiaBloco` já usa
   para o alerta inline, aqui aplicado ao texto que descreve o efeito irreversível.
2. **O botão de confirmação** dentro daquele mesmo `AlertDialog` (`AlertDialogAction`) — e **só**
   ele: o gatilho que abre o diálogo é glass-branco (Invariante 6).
3. **Os alertas inline de erro** das duas ações (falha ao registrar o pedido, falha ao cancelar,
   falha ao retirar a candidatura), `role="alert"`, idioma verbatim de `PedirCopiaBloco`.

Destructive **não** é usado para: o CTA "Apagar meus dados", o botão "Cancelar a exclusão"
(cancelar é a ação **construtiva** deste fluxo), a ação "Retirar minha candidatura", o
`AlertDialogAction` do diálogo de **retirada** (ver abaixo), o painel da janela agendada, ou
qualquer parte do recibo.

**O diálogo de retirada NÃO usa destructive, e a assimetria é o ponto.** Se os dois diálogos
fossem vermelhos, o vermelho deixaria de significar "isto não tem volta" e passaria a significar
"isto é um diálogo" — e a distinção que ERASE-05 exige morreria no único lugar onde ela é lida sob
pressão. Retirar uma candidatura encerra um processo e **preserva os dados**; ele confirma em
glass-branco.

### Tratamentos semânticos (data-encoding — fora do orçamento de accent)

| Tratamento | Classes | Onde |
|-----------|---------|------|
| Neutro / leitura | `rounded-lg border border-white/15 bg-white/5 p-4` | Bloco da seção 4; caixa do recibo em duas colunas; painel da janela agendada |
| Consequência irreversível | `rounded-lg border border-destructive/40 bg-destructive/10 p-4` | **Só** dentro do `AlertDialog` de exclusão |
| Erro | `rounded-lg border border-destructive/40 bg-destructive/10 p-3` + `role="alert"` | Falhas das três ações |
| Coluna "o que fica" do recibo | `border-white/15 bg-white/5` (**idêntica** à coluna "o que sai") | Ver a regra abaixo |

**As duas colunas do recibo têm tratamento visual IDÊNTICO, e isso é contrato.** Pintar "o que
sai" de vermelho e "o que fica" de verde transformaria um relato factual em um julgamento — como
se preservar a prova de não-discriminação exigida pelo Art. 7º, VI fosse uma concessão ou uma
falha. A distinção entre as colunas é feita por **cabeçalho e conteúdo**, canais que sobrevivem ao
daltonismo, ao leitor de tela e à impressão em preto e branco (Invariante 11).

---

## Copywriting Contract

Toda a copy em **pt-BR**. Regras de produto herdadas: "avaliação comportamental/cognitiva",
**nunca** "teste psicológico" (CLAUDE.md / RNF-07a); nenhuma copy pode implicar rejeição
automática por score (RNF-07a); nenhum score, banda ou percentil em superfície de candidato;
**nunca** "pessoa natural" (43 / BD-3).

**Registro de linguagem:** linguagem simples que o titular decodifica, **com** a citação legal ao
lado, nunca no lugar dela (precedente BD-3).

### Bans desta fase e o ESCOPO de cada uma — sem isto o critério reprova a copy que a spec exige

Este projeto já produziu **duas vezes** o defeito de escrever um grep repo-wide que reprova a
própria spec (43, "automaticamente"; 44, os verbos de exclusão). Cada ban abaixo traz o seu escopo.

| Strings | Escopo do grep | Esperado | Por que este escopo |
|---|---|---|---|
| `todos os seus dados` · `tudo o que temos sobre você` · `todos os seus registros` · `apagamos tudo` | **superfície de exclusão** (`ExcluirDadosBloco`, os dois diálogos, o recibo, os dois e-mails) | **0** | Invariante 4. É factualmente falso: a justificativa sobrevive anonimizada (D-45-02/03) e a trilha de decisão sobrevive inteira (ERASE-08) |
| `desativar conta` · `pausar conta` · `conta suspensa` · `conta inativa` · `desativada` | **superfície de exclusão** | **0** | Vocabulário de soft delete numa fase de **hard delete** (D-45-09). Prometeria um estado recuperável que não existirá |
| `você pode cancelar a qualquer momento` **sem** o qualificador de candidaturas | **superfície de exclusão** — asserção de **coocorrência**, não de ausência | **0 ocorrências sem qualificador** | Invariante 3. O grep de ausência simples é insuficiente aqui: a frase é legítima *acompanhada*. O teste procura a menção a cancelamento e exige, no mesmo bloco, a frase sobre as candidaturas não voltarem |
| `apagado` · `apagados` · `excluído` · `eliminado` | ⚠ **NÃO ESTENDER a esta fase.** O ban da 44 tem escopo declarado — *"APENAS o bloco novo e os dois arquivos gerados"* de export, nunca `src/features/privacidade/` inteiro | n/a | Esta fase **existe** para conjugar esses verbos. Um plano que amplie o grep da 44 para a feature inteira reprova a copy que este contrato exige. O ban da 44 continua valendo **no escopo dela** |
| `teste psicológico` | repo-wide em copy renderizada de `src/` e `supabase/functions/` | **0** | CLAUDE.md, herdado |

### Contrato mínimo do template

| Element | Copy |
|---------|------|
| Primary CTA | **Apagar meus dados** *(seção 4 de `/candidato/privacidade`)*. A ação secundária de outra tela é **Retirar minha candidatura** *(card do dashboard)* |
| Empty state heading | **Você ainda não se candidatou a nenhuma vaga.** *(único vazio da fase: a seção 4 quando não há dado nenhum a apagar — ver E1 · empty na tabela de considerações)* |
| Empty state body | Quando você se candidatar, esta opção aparece aqui. |
| Error state | **Não foi possível registrar seu pedido.** Nada foi apagado. Tente novamente em alguns minutos — se continuar, escreva para o nosso Encarregado de Dados: lgpd@beautysmile.com.br. |
| Destructive confirmation | **Apagar meus dados**: título **"Apagar seus dados da Beauty Smile?"**, corpo com a caixa de consequência, confirmação **"Sim, apagar meus dados"**, recuo **"Voltar"**. Texto completo abaixo |

---

### `/candidato/privacidade` · Seção 4 — **Apagar meus dados** (ERASE-05/06/07)

Mobile-first. Quarta seção, **abaixo** de "Pedir uma cópia dos seus dados", separada pelo mesmo
`border-t border-white/15 pt-6`.

#### Estado A — sem pedido em aberto (o estado normal)

| Element | Copy |
|---------|------|
| Título da seção | **Apagar meus dados** |
| Abertura | Você pode pedir que a Beauty Smile apague seus dados. É um direito seu (LGPD, Art. 18, VI). |
| **O que acontece quando você pede** | Suas candidaturas em andamento são **encerradas na hora**, e a exclusão dos seus dados acontece **{n} dias depois**. Nesse intervalo você pode cancelar a exclusão por esta mesma página. |
| **⚠ O que o cancelamento NÃO desfaz** *(Invariante 3 — parágrafo próprio, nunca embutido na frase acima)* | Cancelar interrompe a exclusão dos seus dados. **Suas candidaturas encerradas não voltam** — se quiser participar de novo, você se candidata de novo. |
| **Se você só quer sair de um processo** *(Invariante 2 — este é o sentido permitido do ponteiro)* | Se a sua intenção é sair de **uma vaga** e continuar com a gente, você não precisa apagar nada: no **Painel**, cada candidatura tem a opção **Retirar minha candidatura**. |
| **O que sai e o que fica** | Antes de confirmar, veja o que é apagado e o que a Beauty Smile é obrigada a manter: *(seguido do recibo em tempo futuro — §Recibo)* |
| CTA | **Apagar meus dados** *(glass-branco, `min-h-[44px]`, abre o diálogo)* |

**O `{n}` nunca é um literal em componente.** Ele vem do servidor, da **mesma linha de
configuração que o predicado de execução do motor lê** — é isso que torna auditável a decisão
D-45-01 ("uma fonte a auditar em vez de duas a divergir"). Se essa leitura falhar, o bloco
renderiza a **data alvo** sem a contagem de dias, nunca um número inventado, nunca `NaN`, nunca
uma seção que some.

> ⚠ **Nota de precisão para o planner, e ela contradiz uma leitura fácil do D-45-01.** O "15" que
> `/rh/pedidos-dados` exibe hoje é **literal em copy** e descreve um **teto legal** (Art. 19, II —
> prazo de *resposta a pedido de acesso*). O `slaDados.ts` vivo argumenta, por docblock, que aquele
> teto **não deve** virar constante compilada, porque a ANPD pode dispor prazo diferenciado
> (Art. 19 §4º). A janela desta fase é outro fato — **arrependimento**, não resposta — que o
> operador escolheu numerar igual. **O que "uma fonte" significa operacionalmente aqui:** a janela
> tem **uma** fonte (a config que a copy e o predicado leem juntos). Esta fase **não** edita a
> string de 15 dias da fila do RH: são fatos distintos que hoje coincidem, e fundi-los criaria uma
> ligação falsa entre um prazo legal e uma política interna.

#### O CTA e seus estados

| Estado | Copy e comportamento |
|--------|----------------------|
| Disponível | **Apagar meus dados** *(glass-branco, `min-h-[44px]`)* |
| Em voo | **Registrando seu pedido…** *(desabilitado, `aria-busy="true"`, `Loader2` ao lado, motivo irmão visível)* |
| Erro | Alerta inline destructive, `role="alert"`: **Não foi possível registrar seu pedido. Nada foi apagado.** Tente novamente em alguns minutos — se continuar, escreva para o nosso Encarregado de Dados: lgpd@beautysmile.com.br. |
| Sem dado a apagar | Ver §Empty no contrato mínimo. O CTA **não é renderizado** — um botão que apaga nada é um botão que mente |

**"Nada foi apagado" é obrigatório na copy de erro** e não é tranquilização: numa mutação
não-atômica sobre PII viva, o titular que vê "não foi possível" precisa saber **em que lado da
linha** o sistema parou. A frase só é permitida no erro de **registro do pedido** — que acontece
antes de qualquer mutação. Ela é **proibida** em qualquer erro posterior ao início da execução,
onde seria uma afirmação que ninguém pode garantir (Invariante 5).

**Proibido nesta região:** contagem regressiva animada, barra de progresso, digitação-refém
(Invariante 7), contra-oferta ("tem certeza? você perderá acesso a X vagas!"), qualquer atraso
artificial, e qualquer sugestão de que apagar os dados melhora ou piora chances futuras.

#### O `AlertDialog` de confirmação (Invariante 7)

Molde estrutural do `EditarJanelaDialog`. Quatro rótulos, todos distintos, nenhum genérico.

| Element | Copy |
|---------|------|
| Título | **Apagar seus dados da Beauty Smile?** |
| Corpo, parágrafo 1 | Suas candidaturas em andamento são encerradas agora. Seus dados são apagados em **{data}** — até lá você pode cancelar por esta página. |
| **Caixa de consequência** *(tratamento destructive, item 1 da lista reservada)* | **Isto não tem volta.** Depois de **{data}**, seu currículo e seu cadastro **não podem ser recuperados** — nem por você, nem pela Beauty Smile, nem pelo nosso suporte. Não existe cópia de reserva do seu currículo. |
| Corpo, parágrafo 2 *(o que o cancelamento não desfaz — repetido aqui de propósito)* | Cancelar depois interrompe a exclusão, mas **as candidaturas encerradas não voltam**. |
| Corpo, parágrafo 3 *(ponteiro honesto para o direito vizinho)* | Se quiser guardar uma cópia dos seus dados antes, feche esta janela e use **Pedir uma cópia dos seus dados**, na seção acima. |
| Confirmar | **Sim, apagar meus dados** *(destructive, item 2 da lista reservada, `min-h-[44px]`)* |
| Recuar | **Voltar** *(recuo curto — devolve à página, idioma verbatim do `EditarJanelaDialog`)* |

**"Não existe cópia de reserva do seu currículo" é a tradução honesta do D-45-10 e não é
negociável.** O operador aceitou e datou o risco de não ligar o PITR; a pessoa cujo arquivo será
destruído tem o direito de saber que a rede não existe **antes** de decidir, e não depois. A frase
é dita em linguagem de pessoa — sem "PITR", sem "backup", sem "Storage".

**O parágrafo 3 é obrigatório e é a razão de ele estar num diálogo em vez de num tooltip.** O
único momento em que o titular ainda pode salvar os próprios dados é **antes** de confirmar, e é
neste instante que ele está pensando no assunto. Oferecer o export **depois** seria oferecer o
resgate ao lado do naufrágio. **E o ponteiro é textual, sem botão e sem link** (Invariante 2 na
direção segura: ele manda **fechar** o diálogo, não navegar dentro dele).

#### Estado B — pedido agendado, dentro da janela (ERASE-06)

Substitui o CTA. O bloco **não** deixa de existir e **não** vira uma linha de status discreta: é o
estado mais importante que esta página pode carregar.

| Element | Copy |
|---------|------|
| Título do painel | **Exclusão agendada** |
| Linha de estado | Seus dados serão apagados em **{data}**. |
| Corpo | Suas candidaturas em andamento já foram encerradas. Até **{data}**, você pode cancelar a exclusão e seus dados continuam com a gente. |
| Nota do que não volta | **Cancelar não reabre as candidaturas encerradas** — se quiser participar de novo, você se candidata de novo. |
| Ação | **Cancelar a exclusão** *(glass-branco, `min-h-[44px]`, **nunca** destructive — cancelar é a ação construtiva deste fluxo)* |
| Em voo | **Cancelando…** *(desabilitado, `aria-busy`, motivo irmão visível)* |
| Sucesso do cancelamento *(persistente, nunca toast)* | **Exclusão cancelada.** Seus dados continuam com a Beauty Smile. Suas candidaturas encerradas não foram reabertas. |
| Erro do cancelamento | **Não foi possível cancelar agora.** Seu pedido **continua agendado para {data}** — tente de novo, e se não conseguir até lá, escreva para o nosso Encarregado de Dados: lgpd@beautysmile.com.br. |
| Recibo | O mesmo recibo em **tempo futuro**, visível sem clique |

**A copy de erro do cancelamento é o inverso exata da copy de erro do pedido, e a assimetria é
deliberada:** falhar ao *pedir* deixa a pessoa segura ("nada foi apagado"); falhar ao *cancelar*
deixa a pessoa em risco, e a tela tem de dizer isso de frente, com a data e com uma saída humana.
Uma mensagem genérica de "tente novamente" aqui seria a tela escondendo da pessoa que o relógio
continua correndo.

#### Estado C — execução em andamento (Invariante 5)

Alcançável em produção: a mutação `Storage → Postgres → Auth` não é atômica.

| Element | Copy |
|---------|------|
| Título | **Exclusão em andamento** |
| Corpo | Estamos apagando seus dados. Isso pode levar alguns minutos e **você não precisa fazer nada**. |
| Ação | **Nenhuma.** Sem "cancelar" (a janela acabou), sem "tentar novamente" (Invariante 5), sem barra de progresso |

**Proibido neste estado:** "concluído", "pronto", "seus dados foram apagados", qualquer porcentagem,
qualquer detalhe de qual sistema já respondeu (Invariante 12).

---

### O recibo em duas colunas (ERASE-07) — dois tempos, um conteúdo

O SC#5 pede "um recibo honesto em duas colunas — o que foi apagado / o que foi mantido,
anonimizado, sob qual artigo — sem superestimar o que foi feito". Este contrato o entrega **duas
vezes**, com o **mesmo** conteúdo e **tempos verbais diferentes**:

| Momento | Onde | Tempo | Por quê |
|---|---|---|---|
| **Antes** — no bloco e no diálogo, durante toda a janela | `/candidato/privacidade`, seção 4 | **futuro** ("o que **vai** sair" / "o que **fica**") | Uma janela de arrependimento só vale se a pessoa souber do que se arrepender. Sem a prévia, os {n} dias são espera, não escolha |
| **Depois** — na execução | **e-mail ao titular** | **passado** ("o que **saiu**" / "o que **ficou**") | Depois do hard delete não existe conta, não existe sessão e **não existe tela**. O e-mail é o único canal em que o recibo alcança a pessoa |

**Regras do recibo — as cinco que o executor não pode relaxar:**

1. **Derivado, nunca digitado** (Invariante 4). Fonte: `exportAllowlist.ts` +
   `export-scope-rules.yaml`. Cada linha da coluna "sai" tem de mapear para um caminho de código
   do motor; cada linha da coluna "fica" tem de citar a base legal.
2. **Cabeçalhos fixos:** **O que é apagado** / **O que a Beauty Smile mantém — e por quê**
   (futuro: **O que vai ser apagado** / **O que a Beauty Smile mantém — e por quê**).
3. **A coluna "mantém" cita o artigo, em 14px/600, ao lado do item** — nunca numa nota de rodapé,
   nunca em tooltip. Uma justificativa legal escondida atrás de hover é uma justificativa que a
   maioria nunca lê.
4. **Três linhas são OBRIGATÓRIAS na coluna "mantém"**, porque as três vêm de decisões travadas
   e omiti-las seria a superestimação que o SC#5 proíbe:
   - **A justificativa escrita pelo recrutador sobre a decisão** — *"Fica guardada **sem ligação
     com você**. Ela é a prova de que a decisão não foi discriminatória (LGPD, Art. 7º, VI)."*
     (D-45-02/03)
   - **O histórico das etapas do processo** — *"Fica guardado como registro do processo, **sem
     ligação com você** (LGPD, Art. 7º, VI)."* (ERASE-08)
   - **Números agregados usados no relatório de não-discriminação** — *"Entram só em contagens,
     junto com outras pessoas. Ninguém consegue chegar a você a partir deles."* (ERASE-01 + D-45-04,
     k=5)
5. **Não é um arquivo.** O recibo **não** é baixável, **não** vira `.pdf` nem `.json` e **não**
   reusa o mecanismo de download da Phase 44. Quem quer o próprio dado usa **Pedir uma cópia dos
   seus dados** — que existe, é o direito do Art. 18, II, e o diálogo de confirmação aponta para
   ele. Um segundo caminho de download aqui seria uma segunda superfície de exfiltração pelo preço
   de zero função nova.

**Vocabulário travado da coluna "mantém":** a expressão é **"sem ligação com você"**. Proibidos
nesta superfície: "anonimizado", "pseudonimizado", "tombstone", "desvinculado", "hash". São termos
de engenharia e de jurista; nenhum deles é decodificável pela pessoa cujo dado está sendo tratado,
e o registro de linguagem simples é regra desde a BD-3.

**Layout — e "duas colunas" é uma relação semântica, não uma `<table>`.** Em `sm:` e acima, duas
colunas (`sm:grid-cols-2 gap-4`). Abaixo de `sm:`, **dois grupos empilhados com os mesmos dois
cabeçalhos**, na ordem "sai" → "mantém". Nunca scroll horizontal, nunca truncamento, nunca uma
`<table>` de 320px. A leitura em coluna única **preserva o pareamento** porque cada grupo carrega
o próprio cabeçalho — e é por isso que o cabeçalho é obrigatório nos dois breakpoints.

---

### `/candidato/dashboard` · **Retirar minha candidatura** (ERASE-05)

Ação nova **dentro do card de candidatura já existente**, ao lado do CTA de funil.

| Element | Copy |
|---------|------|
| Ação | **Retirar minha candidatura** *(`text-sm font-semibold`, peso subordinado — nunca um `GlassButton variant="white"` do mesmo peso do CTA de funil)* |
| Em voo | **Retirando…** *(desabilitado, `aria-busy`, motivo irmão visível)* |
| Estado após | **Você retirou sua candidatura em {dd/mm/aaaa}.** *(o card permanece na lista, com a ação removida — ver a regra abaixo)* |
| Erro | Alerta inline destructive por card, `role="alert"`: **Não foi possível retirar sua candidatura.** Tente novamente em instantes. |

**Só é renderizada em candidatura em andamento.** Candidatura já decidida (aprovada, rejeitada,
finalizada) ou já retirada **não** mostra a ação — oferecer saída de um processo encerrado é
oferecer uma ação que não faz nada.

**⚠ O card inteiro é clicável** (`GlassCard … onClick={() => handleVerVaga(...)}`,
`DashboardCandidatoPage.tsx:288`). A ação e o diálogo **têm de parar a propagação**, e o
`AlertDialogContent` **não** pode ser montado dentro do fluxo de clique do card sem isso: sem
`stopPropagation`, um toque abre a confirmação **e** navega para a vaga por baixo dela. É um
defeito de mis-tap numa superfície mobile, e ele é invisível em teste de unidade que dispara o
handler diretamente.

**O card retirado NÃO some da lista.** Sumir seria (i) o titular perdendo o registro de uma ação
que ele mesmo tomou e (ii) a tela concordando com a leitura errada de que retirar apaga. Ele fica,
com o estado dito por escrito.

#### O `AlertDialog` de retirada — onde a distinção do ERASE-05 é entregue

| Element | Copy |
|---------|------|
| Título | **Retirar sua candidatura para {título da vaga}?** |
| Corpo, parágrafo 1 | Você sai deste processo seletivo agora. A equipe de recrutamento é avisada. |
| Corpo, parágrafo 2 *(a distinção — Invariante 2, forma negativa, sem link)* | **Seus dados continuam com a Beauty Smile.** Isto não é o mesmo que apagar seus dados — apagar é outra coisa, e fica na página **Seus dados e autorizações**. |
| Corpo, parágrafo 3 | Se quiser participar desta vaga de novo, será preciso se candidatar novamente. |
| Confirmar | **Sim, retirar minha candidatura** *(glass-branco — **nunca** destructive, ver §Color)* |
| Recuar | **Voltar** |

**Vaga sem título resolvível** → **"esta vaga"** no título do diálogo; nunca UUID, nunca "Vaga não
encontrada" dentro de uma pergunta (invariante herdada da 42/44).

---

### Emenda B — `GuardaCurriculoBloco.notaRevogacao` reescrita

| | Copy |
|---|---|
| **Hoje (Phase 43, fica falsa)** | Para retirar esta autorização ou pedir a eliminação do seu currículo, escreva para o nosso Encarregado de Dados: lgpd@beautysmile.com.br. |
| **Depois desta fase** | Para apagar seu currículo junto com o resto dos seus dados, use **Apagar meus dados**, no fim desta página. Para retirar só esta autorização, escreva para o nosso Encarregado de Dados: lgpd@beautysmile.com.br. |

Duas propriedades preservadas de propósito: o canal humano **continua nomeado** (Art. 8º §5, e é a
única saída de quem não consegue entrar na conta), e a frase **não promete** que a revogação
isolada da autorização virará autoatendimento — isso é roadmap, e prometer roadmap ao titular é
proibido desde a Phase 43.

---

### Os dois e-mails são superfície de UI

Precedente direto: a 44-UI-SPEC tratou os arquivos exportados como superfície ("eles são lidos por
uma pessoa, fora do navegador"). Aqui a razão é mais forte: **o e-mail de recibo é a única coisa
desta fase que a pessoa consegue ler depois que a conta dela deixa de existir.**

#### E-mail 1 — recibo ao titular (na execução)

| Item | Contrato |
|------|----------|
| Assunto | **[Beauty Smile] Seus dados foram apagados** |
| Preheader | Seu pedido de exclusão foi concluído. |
| Abertura | Olá, |
| Corpo | Seu pedido para apagar seus dados na Beauty Smile foi **concluído em {dd/mm/aaaa}**. Sua conta de acesso não existe mais. |
| **As duas colunas** | O mesmo recibo, em **tempo passado**. Em e-mail, **duas colunas empilhadas** (cliente de e-mail é hostil a grid; a regra de pareamento por cabeçalho já cobre isso) |
| Fecho | Se quiser se candidatar a uma vaga no futuro, é só fazer um cadastro novo. |
| **Nunca contém** | Nome, CPF, telefone, `candidato_id`, `solicitacao_id`, nome de vaga, link autenticado, anexo, ou qualquer verbo de recuperação ("caso queira reverter…") |
| Envio | Uma vez, idempotente por `dedupe_key` — o `UNIQUE(dedupe_key)` de `notificacoes_enviadas` já protege contra double-send |

> ⚠ **Consequência declarada para o planner, e ela é do motor, não da UI.** Escolher e-mail como
> canal do recibo faz o endereço do titular ser gravado em `notificacoes_enviadas.destinatario_original`
> — a coluna que a Phase 37 criou justamente para **preservar** a trilha de auditoria. Isso é PII
> do titular **sobrevivendo à própria exclusão**, e um recibo que prova a exclusão enquanto retém
> o dado excluído é uma contradição de compliance. **O tratamento dessa linha (e das demais linhas
> de ledger daquele titular) é decisão obrigatória do plano** — não é resolvível por copy, e este
> contrato não a resolve. Ela é registrada aqui porque foi a escolha de canal deste documento que
> a criou.

#### E-mail 2 — aviso ao RH (D-45-06)

Molde verbatim de `corpoRevisaoSolicitada` (`notificar-rh/helpers.ts`).

| Item | Contrato |
|------|----------|
| Assunto | **[Beauty Smile] Candidatura encerrada a pedido do candidato — {título da vaga}** *(CR/LF neutralizados, idioma de `assuntoRevisaoSolicitada`)* |
| Preheader | Uma candidatura foi encerrada a pedido do candidato. |
| Corpo | Olá, equipe de RH,<br><br>Uma candidatura da vaga **{título}** foi **encerrada a pedido do próprio candidato**, no exercício de um direito previsto na LGPD.<br><br>O processo não continua para essa pessoa. Não há nada a responder e nada a atender — este aviso existe para que ninguém agende ou avalie uma candidatura encerrada.<br><br>*(botão)* **Abrir a lista de candidatos da vaga** |
| **Nunca contém** | **Nome, e-mail ou qualquer identificador do candidato** (Invariante 10 — em modo `teste` o corpo inteiro viaja para `resend.dev`). Nem o motivo específico ("pediu exclusão dos dados"), pelo mesmo motivo: **por que** uma pessoa exerceu um direito é dado sobre ela, e não cabe num corpo que sai do domínio |
| `dedupe_key` | **Por destinatário** (`{candidatura_id}:{evento}:{user_id}`) — o precedente do 42-07 registra que uma chave só por candidatura faria o primeiro RH consumir o claim e todos os demais receberem `skipped:duplicate` em silêncio |

**"Encerrada a pedido do candidato" cobre os dois caminhos** — retirada avulsa e encerramento
disparado pelo pedido de exclusão. **Um só evento, um só template, uma só edição do CHECK.** Dois
eventos para dois caminhos que produzem o mesmo efeito no funil seriam duas entradas de vocabulário
fechado, dois templates e duas oportunidades de o preheader não ramificar — que é literalmente o
defeito W-01 que a Phase 42 encontrou.

---

### A candidatura encerrada na superfície do RH (Invariante 9)

**Sem tela nova.** O contrato é de **legibilidade**, e ele tem uma armadilha medida:

⚠ **As leituras de RH filtram `.is('deleted_at', null)`** (`triagemService.ts:133`,
`candidaturasService.ts:312/562/691`, `avaliacaoService.ts:121`, `agendamentoService.ts:134`). Se o
encerramento for implementado como soft delete por `deleted_at`, a candidatura **desaparece de
todas essas superfícies em silêncio** — e o e-mail do aviso levaria o recrutador a uma lista onde
não há nada para ver. É a contradição que a Invariante 9 proíbe.

| Regra | Conteúdo |
|-------|----------|
| Estado renderizado | **Encerrada a pedido do candidato** — palavra visível, canal textual (Invariante 11) |
| Tratamento | Neutro (`border-white/20 bg-white/5 text-white/80`). **Não** é alarme: ninguém errou, e âmbar/vermelho nesta linha competiria com os eixos de SLA que as Phases 42 e 44 já codificam |
| Ação oferecida | **Nenhuma.** Nem reabrir, nem contatar, nem reverter |
| Enquanto a janela corre | **A tela do RH não exibe a data da exclusão, nem contagem regressiva, nem que existe um pedido de exclusão.** O recrutador precisa saber que o processo acabou; a política de dados do titular não é informação de funil |
| Depois da execução | A linha de decisão sobrevive **sem ligação com o titular** (ERASE-08 + D-45-02/03). Onde o nome era exibido → **Candidato removido a pedido**; **nunca** UUID, **nunca** célula vazia, **nunca** "Não identificado" (que na 42/44 significa *falha de resolução* — um significado diferente que não pode ser reusado aqui) |

---

### Formatação

- Datas: `dd/mm/aaaa` via `toLocaleDateString('pt-BR', …)` — idioma vivo do projeto.
- **A data alvo da exclusão aparece por extenso, sempre acompanhada** — nunca só "em {n} dias". Uma
  contagem relativa é ambígua para quem volta à página três dias depois; a data é um fato estável.
- Contagem de dias: inteiro puro, `{n} dias`. **Nunca `{n}d`** nesta fase (o `{n}d` é o idioma de
  badge interno do RH; aqui o leitor é o titular).
- Data inválida ou ausente em qualquer sítio: **a frase que a conteria é omitida**, nunca `—`,
  nunca `Invalid Date`, nunca `NaN`. Um travessão no lugar da data de uma exclusão irreversível é
  pior que a frase ausente.

---

## Component Inventory (for the planner)

### Dentro de `src/features/privacidade/` (candidato) — a mesma feature, quarta fase seguida

| Componente / módulo | Papel |
|---------------------|-------|
| `ExcluirDadosBloco` (`components/`) | Seção 4 inteira: os três estados (A/B/C), o CTA, o painel da janela, os alertas inline. Molde de composição do `PedirCopiaBloco`, molde visual do `GuardaCurriculoBloco` |
| `ConfirmarExclusaoDialog` (`components/`) | `Dialog`+`AlertDialog` no molde do `EditarJanelaDialog`. Carrega a caixa de consequência e os quatro rótulos distintos |
| `ReciboExclusao` (`components/`) | As duas colunas, **parametrizado por tempo verbal** (`futuro` \| `passado`) e alimentado por dados derivados. **Um componente, dois tempos** — dois componentes divergiriam na primeira edição, e a divergência apareceria justamente entre o que foi prometido e o que foi relatado |
| `useExclusaoDados` (`hooks/`) | Leitura own-row do pedido de exclusão em aberto. `retry: false`; erro resolve para "estado desconhecido" e **não** derruba a seção — molde exato de `useUltimoPedidoDados` |
| `usePedirExclusao` / `useCancelarExclusao` (`hooks/`) | `useMutation`. **Sem `onMutate` otimista** (Invariante 5 da 43, ainda em vigor nesta página) — UI otimista sobre uma escrita destrutiva é a categoria errada de mentira |
| `exclusaoService.ts` (`services/`) | Invocação + leitura own-row + tradução de erro por vocabulário fechado com fallback total (molde de `traduzirErro` de `privacidadeService`). Classe `ExclusaoError` com `code` |
| `PrivacidadeCandidatoPage` (**editado**) | +1 `<section className="space-y-4 border-t border-white/15 pt-6">` abaixo da seção 3. +1 entrada em `COPY_PRIVACIDADE` (`secao4`). Seções 1–3 **byte-idênticas** |
| `GuardaCurriculoBloco` (**editado**) | **Somente `notaRevogacao`** (Emenda B). Zero mudança estrutural |

### Dentro de `src/features/vagas/` ou co-localizado com o card (candidato)

| Componente / módulo | Papel |
|---------------------|-------|
| `RetirarCandidaturaAcao` (`components/`) | A ação + o `AlertDialog` de retirada + o alerta inline por card. **Encapsula o `stopPropagation`** — expor essa responsabilidade ao `DashboardCandidatoPage` a deixaria fácil de esquecer numa edição futura |
| `useRetirarCandidatura` (`hooks/`) | `useMutation`; invalida a lista de candidaturas. Sem otimismo |
| `DashboardCandidatoPage` (**editado**) | Monta `RetirarCandidaturaAcao` no card, condicionada a candidatura em andamento. Nenhuma outra parte do arquivo é tocada |

### Edge Functions e templates (superfície de copy)

| Arquivo | Papel |
|---------|-------|
| `supabase/functions/notificar-rh/helpers.ts` (**editado**) | +1 assunto, +1 corpo, +1 par de constantes de evento/label/template. **Vocabulário fechado passa de 1 para 2 eventos** |
| helpers próprios da EF de execução | Assunto/corpo/preheader do recibo ao titular. **Não** entra em `EventoNotificacao` (§Correções factuais 1) |
| `supabase/functions/notificar-candidato/**` | ⛔ **NÃO EDITADO NESTA FASE** |
| `_shared/email-templates.ts` | Usado só por `layoutBase` e `escapeHtml`. **Os três `Record<EventoNotificacao, …>` não são tocados** |

### As reutilizações que o plano NÃO pode transformar em cópia

1. **`escapeHtml` e `layoutBase`** vêm de `_shared/email-templates.ts`. `escapeHtml` é o escape
   canônico do projeto; reimplementá-lo num helper novo é criar um segundo escape para auditar.
2. **A neutralização de CR/LF no assunto** é a mesma de `assuntoRevisaoSolicitada` — injeção de
   header de e-mail é a razão de ela existir, e o título de vaga continua sendo texto digitado por
   humano no CRUD de vagas.
3. **O molde de diálogo aninhado** é o `EditarJanelaDialog`. Copiar a **estrutura** (incluindo a
   condição de montagem do `AlertDialogContent`, cujo bug WR-09 já foi encontrado e corrigido lá) e
   **nunca** a copy.

---

## UI Considerations

Derivado do `ui-consideration-probe` com **`elements` autorados**. A nota metodológica das
42/43/44-UI-SPECs vale aqui integralmente e **não é opcional**: o classificador do probe usa cues
em inglês (`tables?`, `forms?`, `lists?`) e a prosa deste projeto é pt-BR, então `tabela`,
`formulário` e `botão` não casam com cue nenhum — classificar pela prosa produziria falso verde.

Cobertura: **36 aplicáveis · 36 resolvidas · 0 não resolvidas** — **24 explícitas (✅), 12 backstop (🧪)**.

> ⚠ **Corrigido em 2026-08-05.** Esta linha dizia *"28 explícitas, 8 backstop"* e contradizia a
> própria tabela abaixo, que traz 24 ✅ e 12 🧪. O total (36) sempre esteve certo; a divisão, não.
> O planner da fase detectou a divergência e **levantou pelos marcadores POR LINHA**, não pelo
> resumo — os 12 🧪 viraram truths de escalar plano `{ statement, verification: backstop }`.
> Foi a escolha correta: errar para o lado de mais backstops **falha fechado** (um backstop que o
> verificador não confirmar com evidência explícita abstém-se → `human_needed`), enquanto confiar
> no resumo teria convertido 4 backstops em truths simples e os teria feito passar em silêncio.

Elementos sondados: **E1** `ExcluirDadosBloco` (static-content · interactive-control) · **E2** o
CTA "Apagar meus dados" e seus estados (interactive-control) · **E3** `ConfirmarExclusaoDialog`
(static-content · interactive-control) · **E4** `ReciboExclusao` (list-collection ·
static-content) · **E5** painel da janela agendada + "Cancelar a exclusão" (static-content ·
interactive-control) · **E6** `RetirarCandidaturaAcao` (interactive-control) · **E7** o
`AlertDialog` de retirada (static-content · interactive-control) · **E8** e-mail de recibo ao
titular (static-content) · **E9** e-mail de aviso ao RH (static-content) · **E10** a candidatura
encerrada na superfície do RH (static-content).

> **Reprodutibilidade da contagem.** `E4` é `list-collection` **e** `static-content`: as duas
> colunas são coleções derivadas, e cada célula carrega texto livre (o item e a citação do artigo).
> `list-collection` sozinho **não** gera a categoria `long-text`, e sem ela a linha `E4 · long-text`
> — onde a proibição de truncar a justificativa legal é travada — não reapareceria numa
> re-execução. Com a união declarada o motor devolve **36**; sem o `static-content` devolveria 35 e
> a linha sumiria em silêncio.

> **Nota de método, herdada da 43/44:** onde o risco real de um elemento é **semântico** e não
> dimensional, ele é registrado na categoria de forma mais próxima (`long-text` para
> `static-content`, `error` para `interactive-control`) com a resolução dizendo o risco de verdade.

| # | Elemento | Category | Status | Resolution / Reason |
|---|----------|----------|--------|---------------------|
| E1 | `ExcluirDadosBloco` | loading | ✅ covered | Enquanto `useExclusaoDados` está em voo, o bloco renderiza o mesmo `Glass` pulsante de 1 linha das seções irmãs (`h-16 animate-pulse`), preservando a altura. **O CTA nunca aparece meio-renderizado** — um botão que pisca entre "Apagar meus dados" e "Exclusão agendada" convida ao clique errado sobre o objeto errado |
| E1 | `ExcluirDadosBloco` | error | ✅ covered | Falha na leitura de estado **não** derruba o bloco nem a página: escopo de seção, molde vivo do tratamento de `guarda.isError`. Ela **desabilita o CTA com motivo visível** — este é o único bloco da página onde renderizar o botão "por via das dúvidas" (a regra da Invariante 3 da 44) seria errado, porque um pedido duplicado aqui não é um download a mais |
| E1 | `ExcluirDadosBloco` | overflow | ✅ covered | Bloco de texto de altura livre dentro de `max-w-2xl`; sem contêiner de altura fixa, sem scroll interno, **sem accordion** (§Typography) |
| E1 | `ExcluirDadosBloco` | long-text | 🧪 backstop | O risco real não é comprimento — é a copy **superestimar** o efeito ou omitir o qualificador do cancelamento. **Backstop:** (i) asserção negativa das strings da §Bans **no escopo declarado**; (ii) asserção de **coocorrência** para o cancelamento (Invariante 3), que um grep de ausência não pega; (iii) teste de estado visual a 320px provando que a prosa de consequência não é truncada nem colapsada |
| E2 | CTA "Apagar meus dados" | loading | ✅ covered | Em voo: **Registrando seu pedido…**, desabilitado, `aria-busy="true"`, `Loader2` ao lado. Duplo clique impossível; sem barra de progresso |
| E2 | CTA "Apagar meus dados" | error | 🧪 backstop | O risco é o **botão desabilitado sem motivo** — modo de falha já medido 3× neste projeto (42-10). **Backstop:** asserção **estrutural** — nenhum `<button>` `disabled` do bloco existe sem nó irmão de motivo visível, no molde exato do teste (z3) do `PedirCopiaBloco`. Uma asserção que olhasse só o texto visível não pegaria um `disabled` acrescentado depois |
| E2 | CTA "Apagar meus dados" | long-text | ✅ covered | Rótulo fixo, sem interpolação; glass com quebra livre e `min-h-[44px]`, cresce em altura a 320px em vez de estourar |
| E3 | `ConfirmarExclusaoDialog` | loading | ✅ covered | O diálogo **não** faz leitura própria: recebe a data já resolvida do bloco. Sem estado de carregamento possível dentro dele — decisão deliberada, porque um diálogo destrutivo que carrega dados enquanto está aberto pode mudar a frase debaixo do dedo de quem já leu |
| E3 | `ConfirmarExclusaoDialog` | error | 🧪 backstop | O risco é **rótulo ambíguo**: quatro controles de saída em dois níveis, e "Cancelar" significaria três coisas nesta fase (fechar o diálogo / voltar um passo / cancelar a exclusão agendada). **Backstop:** asserção de que os quatro rótulos são distintos entre si **e** de que a string `Cancelar` sozinha não aparece como rótulo de controle em nenhum dos dois diálogos |
| E3 | `ConfirmarExclusaoDialog` | overflow | ✅ covered | `sm:max-w-lg` herdado; conteúdo de altura livre. A 320px com fonte ampliada o `DialogContent` do Radix rola internamente — e o **botão de confirmar fica no fim do fluxo**, nunca fixo acima do texto de consequência: confirmar sem poder ter rolado até a consequência é o pior arranjo possível aqui |
| E3 | `ConfirmarExclusaoDialog` | long-text | 🧪 backstop | O risco é a **caixa de consequência ser encurtada** por uma edição futura "de tom". **Backstop:** asserção sobre a presença literal da frase "não podem ser recuperados" **e** de "Não existe cópia de reserva do seu currículo" no corpo renderizado — as duas frases são a tradução do D-45-10 e a única coisa que a pessoa lê sobre a ausência de rede |
| E4 | `ReciboExclusao` | empty | ✅ covered | Coluna vazia é **impossível por construção**: as três linhas obrigatórias da coluna "mantém" (Regra 4) e o cadastro na coluna "sai" existem em qualquer titular. Se a derivação devolver vazio, isso é **falha de derivação, não estado vazio** → o bloco não renderiza e o CTA é desabilitado com motivo. **Um recibo vazio ao lado de um botão que apaga seria a pior tela desta fase** |
| E4 | `ReciboExclusao` | loading | ✅ covered | Herda o pulsante do E1 — o recibo nunca aparece antes do estado que o contextualiza (futuro × passado) |
| E4 | `ReciboExclusao` | error | 🧪 backstop | O risco é **afirmar mais do que o motor faz** (Invariante 4 / SC#5). **Backstop:** teste que confronta as linhas da coluna "sai" com o inventário derivado, falhando quando existir linha sem caminho de código correspondente. Uma asserção de snapshot do texto **não** serve: ela passaria numa lista honesta hoje e continuaria passando depois de o motor deixar de apagar algo |
| E4 | `ReciboExclusao` | populated | ✅ covered | Duas colunas em `sm:grid-cols-2 gap-4`; as três linhas obrigatórias sempre presentes; cada linha da coluna "mantém" com a citação do artigo a 14px/600 ao lado, **nunca** em nota de rodapé nem tooltip |
| E4 | `ReciboExclusao` | partial | 🧪 backstop | O caso perigoso é o titular **sem currículo** (a linha "seu currículo" não se aplica) e o titular **sem decisão registrada** (nada a manter anonimizado). **Backstop:** teste dos dois recortes provando que a linha inaplicável é **omitida**, nunca renderizada vazia e **nunca** renderizada mesmo assim — prometer apagar um arquivo que não existe é superestimar na direção oposta, e é igualmente proibido pelo SC#5 |
| E4 | `ReciboExclusao` | overflow | ✅ covered | Abaixo de `sm:`, dois grupos **empilhados** com os mesmos cabeçalhos; nunca `<table>`, nunca scroll horizontal, nunca truncamento |
| E4 | `ReciboExclusao` | zero-one-many | ✅ covered | Uma linha, várias linhas e linha ausente têm o mesmo tratamento (lista de itens rotulados). O cabeçalho é **neutro quanto ao número**, então não há singular/plural a errar |
| E4 | `ReciboExclusao` | long-text | ✅ covered | Item e citação legal renderizam **íntegros**: sem `truncate`, sem `line-clamp`, sem `title` como substituto. Truncar a base legal de uma retenção é apagar a justificativa que a torna legítima |
| E5 | Painel da janela + "Cancelar a exclusão" | loading | ✅ covered | O cancelamento em voo: **Cancelando…**, desabilitado, `aria-busy`, motivo irmão. A data-alvo **permanece visível durante o voo** — some-la faria parecer que o cancelamento já valeu |
| E5 | Painel da janela + "Cancelar a exclusão" | error | ✅ covered | Copy própria e específica (§Estado B): diz que o pedido **continua agendado para {data}** e nomeia o canal humano. Nunca a mensagem crua de transporte, nunca "tente novamente" genérico |
| E5 | Painel da janela + "Cancelar a exclusão" | overflow | ✅ covered | Altura livre em `max-w-2xl`; o recibo abaixo empilha em 320px |
| E5 | Painel da janela + "Cancelar a exclusão" | long-text | 🧪 backstop | O risco é a **nota do que não volta** desaparecer numa edição de concisão. **Backstop:** asserção de coocorrência — em qualquer render do estado B, a menção a cancelar e a frase sobre as candidaturas não reabrirem aparecem juntas |
| E6 | `RetirarCandidaturaAcao` | loading | ✅ covered | **Retirando…**, desabilitado, `aria-busy`, motivo irmão. O estado é **por card**: retirar em uma candidatura não bloqueia as demais |
| E6 | `RetirarCandidaturaAcao` | error | 🧪 backstop | O risco medido não é a falha da rede — é o **`stopPropagation` ausente**, que faz o toque abrir o diálogo **e** navegar para a vaga por baixo (`GlassCard onClick`, `DashboardCandidatoPage.tsx:288`). **Backstop:** teste que dispara o evento **no elemento**, com bubbling real, e assere que o handler de navegação do card **não** foi chamado. Um teste que invoque o handler direto passaria com o defeito presente |
| E6 | `RetirarCandidaturaAcao` | long-text | ✅ covered | Rótulo fixo de três palavras a 14px/600; quebra livre dentro do card, `min-h-[44px]` |
| E7 | `AlertDialog` de retirada | loading | ✅ covered | Sem leitura própria — recebe título de vaga e id já resolvidos |
| E7 | `AlertDialog` de retirada | error | 🧪 backstop | O risco é a **distinção do ERASE-05 se perder** numa edição de copy. **Backstop:** asserção da presença literal de "Seus dados continuam com a Beauty Smile" **e** da **ausência de qualquer `<a>`/`<button>` de navegação para `/candidato/privacidade`** dentro do diálogo (Invariante 2). A segunda metade é a que um teste de texto sozinho não pega |
| E7 | `AlertDialog` de retirada | overflow | ✅ covered | `sm:max-w-lg`; três parágrafos curtos, altura livre |
| E7 | `AlertDialog` de retirada | long-text | ✅ covered | Único texto interpolado é o título da vaga; sem título resolvível → **"esta vaga"**, nunca UUID, nunca "Vaga não encontrada" dentro de uma pergunta |
| E8 | E-mail de recibo ao titular | overflow | ✅ covered | Documento de fluxo; **colunas empilhadas** em e-mail por contrato (cliente de e-mail é hostil a grid). Sem largura fixa, sem tabela de layout aninhada |
| E8 | E-mail de recibo ao titular | long-text | 🧪 backstop | O risco é **PII vazar para dentro do corpo** — e este e-mail é o único da fase cujo destinatário legítimo é o titular, o que torna tentador interpolar o nome "para ficar pessoal". **Backstop:** asserção negativa sobre nome, CPF, telefone, `candidato_id` e `solicitacao_id` no HTML montado, com fixture que traz todos esses valores disponíveis na entrada |
| E9 | E-mail de aviso ao RH | overflow | ✅ covered | Molde verbatim de `corpoRevisaoSolicitada`: parágrafos curtos, botão, fallback de URL em 14px |
| E9 | E-mail de aviso ao RH | long-text | 🧪 backstop | Dois riscos num só corpo: **nome de candidato** (Invariante 10 — em `teste` o corpo viaja para `resend.dev`) e **CR/LF no título da vaga** (injeção de header). **Backstop:** os dois testes que a Phase 42 já escreveu para `assuntoRevisaoSolicitada`, replicados sobre o assunto novo, **mais** a asserção negativa de nome no corpo |
| E10 | Candidatura encerrada na superfície do RH | overflow | ✅ covered | O estado é uma palavra curta numa célula/linha já existente; sem contêiner novo, sem coluna nova |
| E10 | Candidatura encerrada na superfície do RH | long-text | 🧪 backstop | O risco é o **desaparecimento silencioso**: `.is('deleted_at', null)` vive em 5 serviços de RH medidos, e um encerramento por soft delete apaga a linha de todas as telas sem uma palavra. **Backstop:** teste que, com a candidatura encerrada, exige a **palavra** "Encerrada a pedido do candidato" numa superfície de RH — e não apenas que a lista "não quebrou". Uma asserção de contagem passaria com a linha sumida |

<!-- Status vocabulary (locked by probe-core projectTruths):
     ✅ covered   → a plain truth string lifted into must_haves.truths
     🧪 backstop  → a flat scalar { statement, verification: backstop }; at verify time, no explicit
                    evidence → insufficient_spec → human_needed (never a silent pass, #1154)
     ⚠ unresolved → an explicit planner assumption (surfaced, never silently dropped)
     Rows are REPLACED (not appended) on a probe re-run — idempotent. -->

### Acessibilidade (piso, não varredura completa)

- Todo controle acionável com `min-h-[44px]`; ícones decorativos com `aria-hidden="true"`.
- **Todo botão desabilitado desta fase carrega um irmão com o motivo em texto visível**, ligado por
  `aria-describedby`. Motivo em `title` é inalcançável em toque e em leitor de tela — e aqui o
  estado desabilitado é o que impede alguém de exercer ou de **interromper** o exercício de um
  direito.
- Os dois `AlertDialog` delegam o foco ao Radix (entra no primeiro controle, volta ao gatilho ao
  fechar). **Não sobrescrever** — idioma travado do `EditarJanelaDialog`.
- **O botão de confirmar nunca é o primeiro elemento focável** do diálogo destrutivo: o foco entra
  no recuo ("Voltar"), de modo que um `Enter` reflexo não confirme uma exclusão.
- A caixa de consequência é ligada ao diálogo por `aria-describedby` — ela **é** a descrição, e
  não um enfeite ao lado dela.
- Erros das três ações em texto visível **e** `role="alert"`; o resultado do cancelamento em
  `aria-live="polite"`.
- A distinção entre os dois fluxos alcança leitor de tela pela **palavra** ("apagar meus dados" ×
  "retirar minha candidatura"), nunca por cor, nunca por posição (Invariante 11).
- O recibo em duas colunas: cada grupo com cabeçalho **real** (`<h3>`/`<dt>`), não um `<div>` em
  negrito — em coluna única o cabeçalho é a única coisa que preserva o pareamento.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | dialog, alert-dialog, button, skeleton, separator | not required — todos já vendorizados em `src/components/ui/` desde o M1/Phase 7; nenhum `add`/`init` executado nesta fase |
| third-party | **nenhuma declarada** | not applicable |

Nenhuma registry de terceiros declarada → **nenhum** gate `shadcn view`/diff necessário e nenhum
bloco de terceiro entra no contrato.

**Zero dependência npm nova** (invariante do M8 herdada do M7): `lucide-react` e
`@tanstack/react-query` já são dependências do projeto. Os dois e-mails são **hand-rolled** sobre
`layoutBase`/`escapeHtml`, no mesmo idioma que `notificar-rh/helpers.ts` já estabeleceu.
**Explicitamente rejeitados:** qualquer biblioteca de PDF (o recibo não é arquivo — §Recibo, regra
5), qualquer biblioteca de tabela (o recibo não é `<table>`), qualquer biblioteca de toast (nenhum
desfecho desta fase pode desaparecer sozinho).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
